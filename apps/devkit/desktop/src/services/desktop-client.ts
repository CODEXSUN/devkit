import { invoke } from "@tauri-apps/api/core";
import type {
  AgentAccess,
  AgentMessage,
  AgentRuntimeStatus,
  AgentTask,
  FileEntry,
  ExternalEditor,
  GitChange,
  GitWorktree,
  LocalTask,
  SyncResult,
  SystemStatus,
  SearchMatch,
  ProjectSkill,
  ProjectLearning,
  ProjectLearningSettings,
  ProjectLearningSummary,
  PythonEnvironment,
  TerminalResult,
  Workspace
} from "../contracts/desktop";

export class DesktopClient {
  private agentRuntime: Promise<AgentRuntimeStatus> | undefined;

  async startAgentRuntime() {
    this.agentRuntime ??= invoke<AgentRuntimeStatus>("start_agent_runtime").catch((reason) => {
      this.agentRuntime = undefined;
      throw reason;
    });
    return this.agentRuntime;
  }

  async startAgentThread() {
    return invoke<number>("start_agent_thread");
  }

  async resumeAgentThread(threadId: string) {
    return invoke<number>("resume_agent_thread", { threadId });
  }

  async listAgentTasks() {
    return invoke<AgentTask[]>("list_agent_tasks");
  }

  async saveAgentTask(threadId: string, title: string, access: AgentAccess) {
    return invoke<AgentTask>("save_agent_task", { access, threadId, title });
  }

  async listAgentMessages(taskId: number) {
    return invoke<AgentMessage[]>("list_agent_messages", { taskId });
  }

  async saveAgentMessage(
    taskId: number,
    id: string,
    role: AgentMessage["role"],
    content: string
  ) {
    return invoke<AgentMessage>("save_agent_message", { content, id, role, taskId });
  }

  async deleteAgentMessage(taskId: number, id: string) {
    return invoke<boolean>("delete_agent_message", { id, taskId });
  }

  async sendAgentTurn(threadId: string, prompt: string, access: AgentAccess) {
    return invoke<number>("send_agent_turn", { access, prompt, threadId });
  }

  async interruptAgentTurn(threadId: string, turnId: string) {
    return invoke<number>("interrupt_agent_turn", { threadId, turnId });
  }

  async answerAgentApproval(requestId: number, decision: string) {
    return invoke<void>("answer_agent_approval", { decision, requestId });
  }

  async openWorkspace(path?: string) {
    return invoke<Workspace>("open_workspace", { path: path ?? null });
  }

  async listFiles(path = ".") {
    return invoke<FileEntry[]>("list_files", { path });
  }

  async readFile(path: string) {
    return invoke<string>("read_text_file", { path });
  }

  async writeFile(path: string, content: string) {
    return invoke<void>("write_text_file", { content, path });
  }

  async gitStatus() {
    return invoke<GitChange[]>("git_status");
  }

  async gitChangeFingerprint() {
    return invoke<string>("git_change_fingerprint");
  }

  async gitDiff(path?: string) {
    return invoke<string>("git_diff", { path: path ?? null });
  }

  async gitStage(paths: string[], expectedFingerprint: string) {
    return invoke<void>("git_stage", { expectedFingerprint, paths });
  }

  async gitUnstage(paths: string[]) {
    return invoke<void>("git_unstage", { paths });
  }

  async gitCommit(message: string, expectedFingerprint: string) {
    return invoke<string>("git_commit", { expectedFingerprint, message });
  }

  async gitWorktrees() {
    return invoke<GitWorktree[]>("git_worktrees");
  }

  async gitCreateWorktree(name: string) {
    return invoke<GitWorktree>("git_create_worktree", { name });
  }

  async gitRemoveWorktree(path: string) {
    return invoke<void>("git_remove_worktree", { path });
  }

  async searchWorkspace(query: string) {
    return invoke<SearchMatch[]>("search_workspace", { query });
  }

  async listProjectSkills() {
    return invoke<ProjectSkill[]>("list_project_skills");
  }

  async projectLearningSummary() {
    return invoke<ProjectLearningSummary>("project_learning_summary");
  }

  async scanProjectLearning() {
    return invoke<ProjectLearningSummary>("scan_project_learning");
  }

  async saveProjectLearningSettings(enabled: boolean, autoScan: boolean) {
    return invoke<ProjectLearningSettings>("save_project_learning_settings", {
      autoScan,
      enabled
    });
  }

  async reviewProjectLearning(id: number, status: "approved" | "rejected") {
    return invoke<ProjectLearning>("review_project_learning", { id, status });
  }

  async projectLearningContext() {
    return invoke<string>("project_learning_context");
  }

  async startTerminal() {
    return invoke<string>("start_terminal");
  }

  async writeTerminal(sessionId: string, data: string) {
    return invoke<void>("write_terminal", { data, sessionId });
  }

  async closeTerminal(sessionId: string) {
    return invoke<void>("close_terminal", { sessionId });
  }

  async listExternalEditors() {
    return invoke<ExternalEditor[]>("list_external_editors");
  }

  async openInExternalEditor(editorId: string, path?: string) {
    return invoke<void>("open_in_external_editor", { editorId, path: path ?? null });
  }

  async run(command: string, args: string[] = []) {
    return invoke<TerminalResult>("run_workspace_command", { args, command });
  }

  async systemStatus() {
    return invoke<SystemStatus>("system_status");
  }

  async pythonEnvironmentStatus() {
    return invoke<PythonEnvironment>("python_environment_status");
  }

  async createPythonEnvironment() {
    return invoke<PythonEnvironment>("create_python_environment");
  }

  async listTasks() {
    return invoke<LocalTask[]>("list_local_tasks");
  }

  async saveTask(title: string) {
    return invoke<LocalTask>("save_local_task", { title });
  }

  async sync(apiUrl: string, accessToken: string) {
    return invoke<SyncResult>("sync_devkit", { accessToken, apiUrl });
  }
}

export const desktopClient = new DesktopClient();
