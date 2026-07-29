import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type DevkitDatabase = {
  schema_migrations: DevkitMigrationsTable;
  devkit_users: DevkitUsersTable;
  devkit_planning_boards: PlanningBoardsTable;
  devkit_project_manager_activity: ProjectManagerActivityTable;
  devkit_project_manager_attachments: ProjectManagerAttachmentsTable;
  devkit_project_manager_items: ProjectManagerItemsTable;
  devkit_project_manager_registry_groups: ProjectManagerRegistryGroupsTable;
  devkit_project_manager_registry_modules: ProjectManagerRegistryModulesTable;
  devkit_project_manager_registry_platforms: ProjectManagerRegistryPlatformsTable;
  devkit_task_manager_activity: TaskManagerActivityTable;
  devkit_task_manager_lookups: TaskManagerLookupsTable;
  devkit_task_manager_todos: TaskManagerTodosTable;
  devkit_sync_conflicts: DevkitSyncConflictsTable;
  devkit_sync_connections: DevkitSyncConnectionsTable;
  devkit_sync_runs: DevkitSyncRunsTable;
  devkit_sync_snapshots: DevkitSyncSnapshotsTable;
  devkit_sync_tokens: DevkitSyncTokensTable;
};

export type PlanningBoardsTable = SyncColumns & {
  created_at: TimestampColumn;
  created_by: string;
  description: string;
  id: Generated<number>;
  project_uuid: string | null;
  scene_json: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type SyncColumns = {
  sync_direction: ColumnType<string, string | undefined, string | undefined>;
  sync_status: ColumnType<string, string | undefined, string | undefined>;
  sync_updated_at: TimestampColumn;
  sync_version: ColumnType<number, number | undefined, number | undefined>;
};

export type DevkitUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  last_login_at: TimestampColumn | null;
  name: string;
  password_hash: string;
  role: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type DevkitMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  package_id: string;
};

export type ProjectManagerItemsTable = SyncColumns & {
  active: number;
  assignee: string;
  created_at: TimestampColumn;
  description: string;
  due_date: string;
  id: Generated<number>;
  item_key: string;
  item_type: string;
  kind: string;
  lane: string;
  module_key: string;
  priority: string;
  reference_id: string;
  reference_type: string;
  sort_order: number;
  start_date: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryPlatformsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  platform_key: string;
  name: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryGroupsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  group_key: string;
  id: Generated<number>;
  name: string;
  parent_group_uuid: string | null;
  platform_uuid: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryModulesTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  documentation_json: string;
  group_uuid: string;
  id: Generated<number>;
  module_key: string;
  module_type: string;
  name: string;
  parent_module_uuid: string | null;
  planning_notes_json: string;
  route_path: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type ProjectManagerAttachmentsTable = SyncColumns & {
  checksum: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  mime_type: string;
  original_name: string;
  record_kind: string;
  record_uuid: string;
  size_bytes: number;
  storage_key: string;
  uuid: string;
};

export type TaskManagerTodosTable = SyncColumns & {
  category: string;
  created_at: TimestampColumn;
  description: string;
  due_date: string;
  group_name: string;
  id: Generated<number>;
  position: number;
  priority: string;
  scope_key: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TaskManagerLookupsTable = SyncColumns & {
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  name: string;
  scope_key: string;
  uuid: string;
  value: string;
};

export type TaskManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_uuid: string;
  uuid: string;
};

export type DevkitSyncTokensTable = {
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  label: string;
  last_used_at: TimestampColumn | null;
  status: string;
  token_hash: string;
  uuid: string;
};

export type DevkitSyncConnectionsTable = {
  created_at: TimestampColumn;
  encrypted_token: string;
  id: Generated<number>;
  instance_id: string;
  last_error: string | null;
  last_published_at: TimestampColumn | null;
  last_pulled_at: TimestampColumn | null;
  remote_revision: number;
  server_id: string;
  server_url: string;
  status: string;
  updated_at: TimestampColumn;
};

export type DevkitSyncSnapshotsTable = {
  checksum: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  payload_json: string;
  published_by: string;
  revision: number;
  server_id: string;
};

export type DevkitSyncRunsTable = {
  completed_at: TimestampColumn | null;
  direction: string;
  error_message: string | null;
  id: Generated<number>;
  local_revision: number;
  record_count: number;
  remote_revision: number;
  started_at: TimestampColumn;
  status: string;
  uuid: string;
};

export type DevkitSyncConflictsTable = {
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  local_version: number;
  record_uuid: string;
  remote_version: number;
  resolved_at: TimestampColumn | null;
  status: string;
  table_name: string;
  uuid: string;
};
