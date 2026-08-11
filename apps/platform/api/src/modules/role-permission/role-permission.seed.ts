import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedRolePermissionModule(database: Kysely<PlatformDatabase>) {
  await sql`DELETE rp FROM role_permissions rp
    INNER JOIN roles r ON r.id=rp.role_id
    WHERE r.\`key\` IN ('super-admin','super_admin','superadmin')`.execute(database);
  await sql`DELETE FROM roles
    WHERE \`key\` IN ('super-admin','super_admin','superadmin')
      AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role_id=roles.id)
      AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id=roles.id)`.execute(database);

  const admin = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", "admin")
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!admin) return;
  const permissions = await database.selectFrom("permissions").select("id").execute();
  for (const permission of permissions) {
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
      VALUES (${stable(`role-permission:${admin.id}:${permission.id}`)},${admin.id},${permission.id},'active',TRUE)
      ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
  }

  const devkitDefaults: Record<string, string[]> = {
    auditor: [
      "devkit.project-manager.view",
      "devkit.task-manager.view",
      "devkit.planning.view",
      "devkit.registry.view",
      "devkit.github-dashboard.view",
      "devkit.orchestration.view",
      "devkit.sync.view"
    ],
    manager: devkitPermissions(),
    staff: devkitPermissions().filter((key) => key !== "devkit.sync.manage"),
    user: [
      "devkit.project-manager.view",
      "devkit.task-manager.view",
      "devkit.task-manager.manage",
      "devkit.planning.view",
      "devkit.planning.manage",
      "devkit.registry.view",
      "devkit.orchestration.view",
      "devkit.github-dashboard.view"
    ]
  };
  for (const [roleKey, permissionKeys] of Object.entries(devkitDefaults)) {
    const role = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", roleKey)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!role) continue;
    const rolePermissions = await database
      .selectFrom("permissions")
      .select("id")
      .where("key", "in", permissionKeys)
      .execute();
    for (const permission of rolePermissions) {
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
        VALUES (${stable(`role-permission:${role.id}:${permission.id}`)},${role.id},${permission.id},'active',TRUE)
        ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
    }
  }
}

function devkitPermissions() {
  return [
    ...["project-manager", "task-manager", "planning", "registry", "orchestration", "sync"].flatMap(
      (module) => ["view", "manage"].map((action) => `devkit.${module}.${action}`)
    ),
    "devkit.github-dashboard.view"
  ];
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
