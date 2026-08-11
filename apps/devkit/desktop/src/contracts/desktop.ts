export type Workspace = {
  name: string;
  path: string;
  branch: string;
};

export type FileEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
};

export type GitChange = {
  path: string;
  status: string;
};

export type SystemStatus = {
  docker: boolean;
  git: boolean;
  platform: string;
  rustVersion: string;
};

export type LocalTask = {
  id: number;
  title: string;
  status: "todo" | "active" | "done";
};

export type TerminalResult = {
  code: number | null;
  stderr: string;
  stdout: string;
};

export type SyncResult = {
  accepted: number;
  cursor: string | null;
};
