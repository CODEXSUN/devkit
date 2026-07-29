import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { Kysely } from "kysely";
import { getDevkitDatabase } from "../../database/devkit-database.js";
import type { DevkitDatabase } from "../../database/schema.js";
import { ProjectManagerAttachmentStorage } from "../project-manager/project-manager.storage.js";
import type { DevkitSyncSnapshot } from "./sync.types.js";

export const synchronizedTables = [
  "devkit_planning_boards",
  "devkit_project_manager_registry_platforms",
  "devkit_project_manager_registry_groups",
  "devkit_project_manager_registry_modules",
  "devkit_project_manager_items",
  "devkit_project_manager_activity",
  "devkit_project_manager_attachments",
  "devkit_task_manager_todos",
  "devkit_task_manager_lookups",
  "devkit_task_manager_activity",
] as const;

type DynamicDatabase = Record<string, Record<string, unknown>>;

export class DevkitSyncRepository {
  constructor(
    private readonly database: Kysely<DevkitDatabase> = getDevkitDatabase(),
    private readonly attachmentStorage = new ProjectManagerAttachmentStorage(),
  ) {}

  async exportSnapshot(instanceId: string): Promise<DevkitSyncSnapshot> {
    const dynamic = this.database as unknown as Kysely<DynamicDatabase>;
    const entries = await Promise.all(
      synchronizedTables.map(async (table) => {
        const rows = await dynamic.selectFrom(table).selectAll().execute();
        return [
          table,
          rows.map(({ id: _id, ...row }) => serializable(row)),
        ] as const;
      }),
    );
    const attachmentData: Record<string, string> = {};
    const attachmentRows =
      (Object.fromEntries(entries)["devkit_project_manager_attachments"] as
        Record<string, unknown>[] | undefined) ?? [];
    for (const row of attachmentRows) {
      if (row.sync_status === "deleted") continue;
      const storageKey = String(row.storage_key);
      attachmentData[storageKey] = (
        await this.attachmentStorage.read(storageKey)
      ).toString("base64");
    }
    return {
      attachmentData,
      instanceId,
      protocolVersion: 1,
      publishedAt: new Date().toISOString(),
      tables: Object.fromEntries(entries),
    };
  }

  async importSnapshot(snapshot: DevkitSyncSnapshot) {
    let records = 0;
    await this.database.transaction().execute(async (transaction) => {
      const target = transaction as unknown as Kysely<DynamicDatabase>;
      for (const table of synchronizedTables) {
        for (const input of snapshot.tables[table] ?? []) {
          const row = {
            ...input,
            sync_direction: "inbound",
            sync_status:
              input.sync_status === "deleted" ? "deleted" : "synchronized",
            sync_updated_at: new Date(),
          };
          const updates = Object.fromEntries(
            Object.entries(row).filter(([column]) => column !== "uuid"),
          );
          await target
            .insertInto(table)
            .values(row)
            .onDuplicateKeyUpdate(updates)
            .executeTakeFirst();
          records += 1;
        }
      }
    });
    await this.importAttachments(snapshot);
    return records;
  }

  private async importAttachments(snapshot: DevkitSyncSnapshot) {
    const rows = snapshot.tables.devkit_project_manager_attachments ?? [];
    for (const row of rows) {
      const storageKey = String(row.storage_key);
      if (row.sync_status === "deleted") {
        await this.attachmentStorage.remove(storageKey);
        continue;
      }
      const encoded = snapshot.attachmentData[storageKey];
      if (!encoded) {
        throw AppError.validation(
          `Attachment payload is missing for ${storageKey}.`,
        );
      }
      const data = Buffer.from(encoded, "base64");
      const checksum = createHash("sha256").update(data).digest("hex");
      if (checksum !== row.checksum) {
        throw AppError.validation(
          `Attachment checksum validation failed for ${storageKey}.`,
        );
      }
      await this.attachmentStorage.remove(storageKey);
      await this.attachmentStorage.write(storageKey, data);
    }
  }

  async markPublished() {
    const dynamic = this.database as unknown as Kysely<DynamicDatabase>;
    for (const table of synchronizedTables) {
      await dynamic
        .updateTable(table)
        .set({
          sync_direction: "outbound",
          sync_status: "synchronized",
          sync_updated_at: new Date(),
        })
        .where("sync_status", "!=", "deleted")
        .execute();
    }
  }

  async pendingCount() {
    let count = 0;
    const dynamic = this.database as unknown as Kysely<DynamicDatabase>;
    for (const table of synchronizedTables) {
      const row = await dynamic
        .selectFrom(table)
        .select(({ fn }) => fn.count<number>("uuid").as("count"))
        .where("sync_status", "in", ["deleted", "pending"])
        .executeTakeFirst();
      count += Number(row?.count ?? 0);
    }
    return count;
  }

  async createToken(input: { actor: string; hash: string; label: string }) {
    const uuid = newUuid();
    await this.database
      .insertInto("devkit_sync_tokens")
      .values({
        created_by: input.actor,
        label: input.label,
        last_used_at: null,
        status: "active",
        token_hash: input.hash,
        uuid,
      })
      .executeTakeFirstOrThrow();
    return uuid;
  }

  async findActiveToken(hash: string) {
    return this.database
      .selectFrom("devkit_sync_tokens")
      .selectAll()
      .where("token_hash", "=", hash)
      .where("status", "=", "active")
      .executeTakeFirst();
  }

  async touchToken(uuid: string) {
    await this.database
      .updateTable("devkit_sync_tokens")
      .set({ last_used_at: new Date() })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
  }

  connection() {
    return this.database
      .selectFrom("devkit_sync_connections")
      .selectAll()
      .where("server_id", "=", "codexsun-cloud")
      .executeTakeFirst();
  }

  async saveConnection(input: { encryptedToken: string; instanceId: string }) {
    await this.database
      .insertInto("devkit_sync_connections")
      .values({
        encrypted_token: input.encryptedToken,
        instance_id: input.instanceId,
        last_error: null,
        last_published_at: null,
        last_pulled_at: null,
        remote_revision: 0,
        server_id: "codexsun-cloud",
        server_url: "https://devkit.codexsun.com",
        status: "bound",
      })
      .onDuplicateKeyUpdate({
        encrypted_token: input.encryptedToken,
        instance_id: input.instanceId,
        last_error: null,
        status: "bound",
      })
      .executeTakeFirst();
  }

  async updateConnection(input: {
    error?: string | null;
    pulledAt?: Date;
    publishedAt?: Date;
    revision?: number;
    status?: string;
  }) {
    await this.database
      .updateTable("devkit_sync_connections")
      .set({
        ...(input.error !== undefined ? { last_error: input.error } : {}),
        ...(input.pulledAt ? { last_pulled_at: input.pulledAt } : {}),
        ...(input.publishedAt ? { last_published_at: input.publishedAt } : {}),
        ...(input.revision !== undefined
          ? { remote_revision: input.revision }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      })
      .where("server_id", "=", "codexsun-cloud")
      .executeTakeFirst();
  }

  latestSnapshot() {
    return this.database
      .selectFrom("devkit_sync_snapshots")
      .selectAll()
      .where("server_id", "=", "codexsun-cloud")
      .orderBy("revision", "desc")
      .executeTakeFirst();
  }

  async saveSnapshot(input: {
    checksum: string;
    payload: string;
    publisher: string;
    revision: number;
  }) {
    await this.database
      .insertInto("devkit_sync_snapshots")
      .values({
        checksum: input.checksum,
        payload_json: input.payload,
        published_by: input.publisher,
        revision: input.revision,
        server_id: "codexsun-cloud",
      })
      .executeTakeFirstOrThrow();
  }

  async conflictCount() {
    const row = await this.database
      .selectFrom("devkit_sync_conflicts")
      .select(({ fn }) => fn.count<number>("id").as("count"))
      .where("status", "=", "open")
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async startRun(direction: "pull" | "push", revision: number) {
    const uuid = newUuid();
    await this.database
      .insertInto("devkit_sync_runs")
      .values({
        direction,
        error_message: null,
        local_revision: revision,
        record_count: 0,
        remote_revision: revision,
        status: "running",
        uuid,
      })
      .executeTakeFirstOrThrow();
    return uuid;
  }

  async finishRun(
    uuid: string,
    input: {
      error?: string;
      records?: number;
      remoteRevision?: number;
      status: "completed" | "conflict" | "failed";
    },
  ) {
    await this.database
      .updateTable("devkit_sync_runs")
      .set({
        completed_at: new Date(),
        error_message: input.error ?? null,
        record_count: input.records ?? 0,
        ...(input.remoteRevision === undefined
          ? {}
          : { remote_revision: input.remoteRevision }),
        status: input.status,
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
  }

  async recordConflict(input: {
    instanceId: string;
    localRevision: number;
    message: string;
    remoteRevision: number;
  }) {
    await this.database
      .insertInto("devkit_sync_conflicts")
      .values({
        details_json: JSON.stringify({ message: input.message }),
        local_version: input.localRevision,
        record_uuid: input.instanceId,
        remote_version: input.remoteRevision,
        status: "open",
        table_name: "devkit_sync_snapshot",
        uuid: newUuid(),
      })
      .executeTakeFirstOrThrow();
  }
}

function serializable(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function newUuid() {
  return randomBytes(4).toString("hex");
}
