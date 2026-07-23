import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type DevkitDatabase = {
  devkit_migrations: DevkitMigrationsTable;
  project_manager_activity: ProjectManagerActivityTable;
  project_manager_items: ProjectManagerItemsTable;
  project_manager_registry_groups: ProjectManagerRegistryGroupsTable;
  project_manager_registry_modules: ProjectManagerRegistryModulesTable;
  project_manager_registry_platforms: ProjectManagerRegistryPlatformsTable;
  task_manager_activity: TaskManagerActivityTable;
  task_manager_lookups: TaskManagerLookupsTable;
  task_manager_todos: TaskManagerTodosTable;
};

export type DevkitMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
};

export type ProjectManagerItemsTable = {
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
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryPlatformsTable = {
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

export type ProjectManagerRegistryGroupsTable = {
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

export type ProjectManagerRegistryModulesTable = {
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

export type ProjectManagerActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type TaskManagerTodosTable = {
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

export type TaskManagerLookupsTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  name: string;
  scope_key: string;
  uuid: string;
  value: string;
};

export type TaskManagerActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_uuid: string;
  uuid: string;
};
