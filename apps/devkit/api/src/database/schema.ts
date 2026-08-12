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
  devkit_planning_board_links: PlanningBoardLinksTable;
  devkit_planning_comments: PlanningCommentsTable;
  devkit_planning_reactions: PlanningReactionsTable;
  devkit_orchestration_chat_messages: OrchestrationChatMessagesTable;
  devkit_orchestration_chat_threads: OrchestrationChatThreadsTable;
  devkit_agent_runs: AgentRunsTable;
  devkit_agent_run_steps: AgentRunStepsTable;
  devkit_agent_events: AgentEventsTable;
  devkit_agent_approvals: AgentApprovalsTable;
  devkit_agent_artifacts: AgentArtifactsTable;
  devkit_agent_tool_calls: AgentToolCallsTable;
  devkit_agent_verifications: AgentVerificationsTable;
  devkit_agent_tasks: AgentTasksTable;
  devkit_agent_task_dependencies: AgentTaskDependenciesTable;
  devkit_agent_parent_reviews: AgentParentReviewsTable;
  devkit_project_manager_activity: ProjectManagerActivityTable;
  devkit_project_manager_attachments: ProjectManagerAttachmentsTable;
  devkit_project_manager_items: ProjectManagerItemsTable;
  devkit_project_manager_registry_groups: ProjectManagerRegistryGroupsTable;
  devkit_project_manager_registry_modules: ProjectManagerRegistryModulesTable;
  devkit_project_manager_registry_platforms: ProjectManagerRegistryPlatformsTable;
  devkit_repository_connections: RepositoryConnectionsTable;
  devkit_task_manager_activity: TaskManagerActivityTable;
  devkit_task_manager_lookups: TaskManagerLookupsTable;
  devkit_task_manager_todos: TaskManagerTodosTable;
  devkit_telegram_connections: TelegramConnectionsTable;
  devkit_telegram_messages: TelegramMessagesTable;
  devkit_honey_threads: HoneyThreadsTable;
  devkit_honey_messages: HoneyMessagesTable;
  devkit_honey_memory: HoneyMemoryTable;
  devkit_sync_conflicts: DevkitSyncConflictsTable;
  devkit_sync_connections: DevkitSyncConnectionsTable;
  devkit_sync_runs: DevkitSyncRunsTable;
  devkit_sync_snapshots: DevkitSyncSnapshotsTable;
  devkit_sync_tokens: DevkitSyncTokensTable;
};

export type HoneyThreadsTable = {
  actor_id: string;
  codex_thread_id: string | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type HoneyMessagesTable = {
  actor_id: string;
  body: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  uuid: string;
};

export type HoneyMemoryTable = {
  actor_id: string;
  content: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  source_thread_uuid: string | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type RepositoryConnectionsTable = {
  base_url: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  provider: string;
  repository_slug: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTasksTable = {
  actor_id: string;
  agent_profile: string;
  child_run_uuid: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  objective: string;
  parent_run_uuid: string;
  result_summary: string | null;
  scope_json: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  task_key: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTaskDependenciesTable = {
  created_at: TimestampColumn;
  depends_on_task_uuid: string;
  id: Generated<number>;
  task_uuid: string;
};

export type AgentParentReviewsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string;
  id: Generated<number>;
  note: string;
  parent_run_uuid: string;
  uuid: string;
};

export type AgentRunsTable = {
  access_mode: string;
  actor_id: string;
  agent_profile: string;
  assist_mode: string;
  budget_json: string;
  chat_thread_uuid: string;
  codex_thread_id: string | null;
  codex_turn_id: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  error_message: string | null;
  id: Generated<number>;
  model: string;
  objective: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  result_summary: string | null;
  started_at: TimestampColumn | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
  base_revision: string | null;
  branch_name: string | null;
  commit_hash: string | null;
  committed_at: TimestampColumn | null;
  review_status: string;
  source_root: string | null;
  verification_completed_at: TimestampColumn | null;
  verification_fingerprint: string | null;
  verification_status: string;
  workspace_cleaned_at: TimestampColumn | null;
  workspace_mode: string;
  workspace_path: string | null;
  workspace_status: string;
};

export type AgentVerificationsTable = {
  args_json: string;
  attempt_no: number;
  command_id: string;
  command_name: string;
  completed_at: TimestampColumn;
  created_at: TimestampColumn;
  duration_ms: number;
  exit_code: number | null;
  id: Generated<number>;
  label: string;
  required_gate: number;
  run_uuid: string;
  status: string;
  stderr_text: string;
  stdout_text: string;
  uuid: string;
};

export type AgentRunStepsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  label: string;
  output_json: string;
  run_uuid: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  uuid: string;
};

export type AgentEventsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  event_type: string;
  id: Generated<number>;
  payload_json: string;
  run_uuid: string;
  uuid: string;
};

export type AgentApprovalsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string | null;
  decided_at: TimestampColumn | null;
  id: Generated<number>;
  reason: string;
  request_id: number;
  run_uuid: string;
  status: string;
  thread_id: string;
  uuid: string;
};

export type AgentArtifactsTable = {
  artifact_type: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  label: string;
  metadata_json: string;
  path: string;
  run_uuid: string;
  uuid: string;
};

export type AgentToolCallsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  input_json: string;
  output_json: string;
  risk_level: string;
  run_uuid: string;
  started_at: TimestampColumn;
  status: string;
  tool_name: string;
  uuid: string;
};

export type OrchestrationChatThreadsTable = {
  access_mode: string;
  actor_id: string;
  codex_thread_id: string | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  model: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type OrchestrationChatMessagesTable = {
  actor_id: string;
  attachments_json: string;
  body: string;
  created_at: TimestampColumn;
  duration_ms: number | null;
  feedback: string | null;
  files_json: string;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramConnectionsTable = {
  auth_mode: string;
  chat_id: string | null;
  connected_at: TimestampColumn | null;
  created_at: TimestampColumn;
  display_name: string;
  encrypted_session: string | null;
  id: Generated<number>;
  link_token_hash: string;
  status: string;
  telegram_username: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramMessagesTable = {
  body: string;
  chat_id: string;
  created_at: TimestampColumn;
  direction: string;
  id: Generated<number>;
  telegram_message_id: string | null;
  uuid: string;
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

export type PlanningBoardLinksTable = SyncColumns & {
  board_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type PlanningCommentsTable = SyncColumns & {
  board_uuid: string;
  body: string;
  created_at: TimestampColumn;
  created_by: string;
  element_id: string | null;
  id: Generated<number>;
  mentions_json: string;
  resolved_at: TimestampColumn | null;
  resolved_by: string | null;
  status: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type PlanningReactionsTable = SyncColumns & {
  comment_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  reaction: string;
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
  package_id: ColumnType<string, string | undefined, string | undefined>;
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
  logo_text: string;
  color_key: string;
  repository_name: string;
  repository_url: string;
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
