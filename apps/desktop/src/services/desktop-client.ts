import { invoke } from "@tauri-apps/api/core";
import type {
  FileEntry,
  GitChange,
  LocalTask,
  SyncResult,
  SystemStatus,
  TerminalResult,
  Workspace
} from "../contracts/desktop";

export class DesktopClient {
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

  async run(command: string, args: string[] = []) {
    return invoke<TerminalResult>("run_workspace_command", { args, command });
  }

  async systemStatus() {
    return invoke<SystemStatus>("system_status");
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
