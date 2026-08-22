export type Workspace = {
  name: string;
  path: string;
  branch: string;
};

export type WorkspaceKind = "application" | "plugin" | "document" | "other";
export type WorkspaceRelationship = "project" | "addOn" | "standalone";
export type DesktopProfile = {
  displayName: string;
  email?: string | null;
  rememberIdentity: boolean;
  confirmOnStartup: boolean;
  defaultWorkGroupPath?: string | null;
  lastWorkspacePath?: string | null;
};
export type DesktopWorkspace = {
  path: string;
  name: string;
  kind: WorkspaceKind;
  relationship: WorkspaceRelationship;
  projectName?: string | null;
  pinned: boolean;
  lastOpenedAt: string;
};
export type DesktopSetup = { profile?: DesktopProfile | null; workspaces: DesktopWorkspace[] };
export type WorkGroup = { name: string; path: string };
export type SavedRepositoryUrl = {
  id: number;
  workGroupPath: string;
  url: string;
  kind: WorkspaceKind;
  relationship: WorkspaceRelationship;
  updatedAt: string;
};
export type RepositoryCandidate = {
  path: string;
  name: string;
  connected: boolean;
  kind: WorkspaceKind;
  relationship: WorkspaceRelationship;
  projectName?: string | null;
};
export type WorkGroupScan = {
  group: WorkGroup;
  repositories: RepositoryCandidate[];
  savedRepositoryUrls: SavedRepositoryUrl[];
};

export type FileEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
};

export type GitChange = {
  originalPath?: string;
  path: string;
  status: string;
};

export type GitFileDiff = {
  binary: boolean;
  modified: string;
  original: string;
};

export type ExternalEditor = {
  id: string;
  label: string;
};

export type SystemStatus = {
  docker: boolean;
  git: boolean;
  node: boolean;
  platform: string;
  python: boolean;
  ripgrep: boolean;
  rustVersion: string;
  wsl: boolean;
};

export type SearchMatch = { path: string; line: number; preview: string };
export type GitWorktree = { path: string; branch: string; head: string };
export type ProjectSkill = { id: string; path: string; source: string };
export type ProjectLearningSettings = { enabled: boolean; autoScan: boolean };
export type ProjectLearning = {
  id: number;
  category: string;
  title: string;
  content: string;
  evidencePath: string | null;
  source: "detected" | "user" | "agent";
  status: "candidate" | "approved" | "rejected" | "stale";
  confidence: number;
  isCurrent: boolean;
  updatedAt: string;
};
export type ProjectLearningSummary = {
  settings: ProjectLearningSettings;
  items: ProjectLearning[];
  approvedCount: number;
  candidateCount: number;
  staleCount: number;
};
export type TerminalOutput = { sessionId: string; data: string };
export type TerminalShell = "gitBash" | "powershell";
export type PythonEnvironment = {
  available: boolean;
  configured: boolean;
  gpuTools: boolean;
  interpreter: string | null;
  projectFiles: string[];
  version: string | null;
  virtualEnvironment: string | null;
};

export type TerminalResult = {
  code: number | null;
  stderr: string;
  stdout: string;
};

export type LocalTask = {
  execution: string;
  id: number;
  title: string;
  status: "todo" | "active" | "done";
};

export type SyncResult = {
  accepted: number;
  cursor: string | null;
};

export type AgentAccess = "readOnly" | "workspaceWrite";
export type AgentTask = {
  archived: boolean;
  executionPath?: string | null;
  id: number;
  reviewRequested: boolean;
  runStatus: "ready" | "running" | "completed" | "failed" | "stopped";
  threadId: string;
  title: string;
  access: AgentAccess;
  updatedAt: string;
  worktreeBranch?: string | null;
};
export type AgentMessage = {
  id: string;
  taskId: number;
  role: "agent" | "user";
  content: string;
  createdAt: string;
};
export type AgentRuntimeStatus = {
  connected: boolean;
  executable: string;
};

export type AgentProtocolMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

export type AgentProvider = "codex" | "openrouter" | "opencode" | "claude" | "ollama" | "gemini";
export type AgentReasoningEffort = "low" | "medium" | "high";

export type ProviderConfig = {
  enabled: boolean;
  isDefault: boolean;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  model?: string | undefined;
  reasoningEffort?: AgentReasoningEffort | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  systemPrompt?: string | undefined;
};

export type AgentConfig = {
  codexPath?: string;
  defaultAccess: "readOnly" | "workspaceWrite";
  autoStart: boolean;
  approvalPolicy: "on-request" | "never" | "always";
  sandboxType: "workspace-write" | "read-only" | "danger-full-access";
  networkAccess: boolean;
  maxTurns: number;
  idleTimeout: number;
  useKeychainEncryption?: boolean;
  defaultProvider: AgentProvider;
  providers: Record<AgentProvider, ProviderConfig>;
};
