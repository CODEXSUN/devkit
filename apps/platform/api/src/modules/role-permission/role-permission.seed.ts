import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedRolePermissionModule(database: Kysely<PlatformDatabase>) {
  await retireLegacyAdministratorPermissions(database);
  await assignProtectedPermissions(database, "super-admin", () => true);
  await assignProtectedPermissions(database, "admin", (key) => key.startsWith("identity."));

  const devkitDefaults: Record<string, string[]> = {
    auditor: [
      "devkit.project-manager.view",
      "devkit.task-manager.view",
      "devkit.planning.view",
      "devkit.registry.view",
      "devkit.github-dashboard.view",
      "devkit.orchestration.view",
      "devkit.sync.view",
      "devkit.notification.view"
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
      "devkit.github-dashboard.view",
      "devkit.notification.view"
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

async function assignProtectedPermissions(
  database: Kysely<PlatformDatabase>,
  roleKey: string,
  includes: (permissionKey: string) => boolean
) {
  const role = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", roleKey)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!role) return;

  const permissions = await database
    .selectFrom("permissions")
    .select(["id", "key"])
    .where("status", "=", "active")
    .execute();
  for (const permission of permissions.filter((entry) => includes(entry.key))) {
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
      VALUES (${stable(`role-permission:${role.id}:${permission.id}`)},${role.id},${permission.id},'active',TRUE)
      ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
  }
}

async function retireLegacyAdministratorPermissions(database: Kysely<PlatformDatabase>) {
  await sql`UPDATE role_permissions rp
    INNER JOIN roles r ON r.id=rp.role_id
    INNER JOIN permissions p ON p.id=rp.permission_id
    SET rp.status='inactive'
    WHERE r.\`key\`='admin'
      AND p.\`key\` NOT LIKE 'identity.%'
      AND rp.is_protected=TRUE`.execute(database);
}

function devkitPermissions() {
  return [
    ...[
      "project-manager",
      "task-manager",
      "planning",
      "registry",
      "orchestration",
      "sync",
      "notification"
    ].flatMap((module) => ["view", "manage"].map((action) => `devkit.${module}.${action}`)),
    "devkit.github-dashboard.view"
  ];
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
