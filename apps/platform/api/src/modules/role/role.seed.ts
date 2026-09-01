import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

const roles = [
  {
    description: "Protected developer administration with unrestricted platform and DevKit access.",
    key: "super-admin",
    label: "Super Administrator",
    protected: true
  },
  {
    description: "Protected user, role, permission, and access administration.",
    key: "admin",
    label: "Administrator",
    protected: true
  },
  {
    description: "DevKit management access.",
    key: "manager",
    label: "Manager",
    protected: true
  },
  {
    description: "DevKit staff access.",
    key: "staff",
    label: "Staff",
    protected: true
  },
  {
    description: "Standard DevKit access.",
    key: "user",
    label: "User",
    protected: false
  },
  {
    description: "Read-only access.",
    key: "auditor",
    label: "Auditor",
    protected: false
  }
] as const;

export async function seedRoleModule(database: Kysely<PlatformDatabase>) {
  for (const role of roles) {
    await database
      .insertInto("roles")
      .values({
        description: role.description,
        is_protected: role.protected,
        key: role.key,
        label: role.label,
        status: "active",
        uuid: stable(`role:${role.key}`)
      })
      .onDuplicateKeyUpdate({
        description: role.description,
        is_protected: role.protected,
        label: role.label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
