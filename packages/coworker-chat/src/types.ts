export type CoworkerProject = {
  active?: boolean;
  assignee?: string;
  colorKey?: string;
  description: string;
  id: string;
  key: string;
  logoText?: string;
  moduleKey: string;
  referenceId: string;
  referenceType: string;
  repositoryName?: string;
  repositoryUrl?: string;
  status?: string;
  title: string;
  updatedAt?: string;
};

export type CoworkerProjectConnector = (name?: string) => Promise<CoworkerProject | null>;

export type CoworkerIdentityContact = {
  email: string;
  name: string;
  uuid: string;
};

export type CoworkerRepository = {
  id: string;
  name: string;
  provider: "github" | "private-git";
  status: "active" | "inactive";
};

export type CoworkerProjectRecord = {
  assignee?: string;
  colorKey?: string;
  description: string;
  id: string;
  key?: string;
  kind: string;
  lane: string;
  logoText?: string;
  moduleKey?: string;
  priority?: string;
  referenceId: string;
  referenceType?: string;
  status: string;
  title: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CoworkerRegistryModule = {
  active: boolean;
  children: CoworkerRegistryModule[];
  createdAt: string;
  description: string;
  documentation: Record<string, Array<{ id: string; key: string; value: string }>>;
  groupId: string;
  id: string;
  key: string;
  moduleType: "area" | "module" | "page";
  name: string;
  parentModuleId: string;
  planningNotes: Array<{ body: string; id: string; title: string }>;
  routePath: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type CoworkerRegistryGroup = {
  id: string;
  modules: CoworkerRegistryModule[];
  name: string;
  subGroups: CoworkerRegistryGroup[];
};

export type CoworkerRegistryResult = {
  platforms: Array<{ groups: CoworkerRegistryGroup[]; id: string; name: string }>;
};

export type CoworkerProjectAttachment = {
  checksum: string;
  createdAt: string;
  createdBy: string;
  id: string;
  mimeType: string;
  originalName: string;
  recordId: string;
  recordKind: string;
  sizeBytes: number;
};

export type CoworkerPlanningScene = {
  appState?: Record<string, unknown>;
  elements: readonly unknown[];
  files?: Record<string, unknown>;
};

export type CoworkerPlanningBoard = {
  description: string;
  projectUuid: string | null;
  scene: CoworkerPlanningScene;
  status: string;
  title: string;
  updatedAt: string;
  uuid: string;
};

export type CoworkerMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type CoworkerChat = {
  codexThreadId: string | null;
  pinnedAt: string | null;
  projectUuid: string;
  title: string;
  updatedAt: string;
  uuid: string;
};

export type CoworkerChatDetail = CoworkerChat & {
  messages: Array<{
    actions: Extract<CoworkerEvent, { type: "chat.action" }>["action"][];
    body: string;
    durationMs: number | null;
    feedback: "down" | "up" | null;
    files: string[];
    role: "assistant" | "user";
    uuid: string;
  }>;
};

export type CoworkerEvent =
  | {
      type: "chat.started";
      conversationId: string;
      runId?: string;
      threadId: string;
      turnId?: string;
    }
  | { type: "chat.delta"; delta: string }
  | { type: "chat.completed"; messageId: string; status: string }
  | { type: "chat.failed"; message: string }
  | {
      type: "chat.action";
      action: {
        id: string;
        label: string;
        status: "completed" | "failed" | "running";
        type: "command" | "compaction" | "file" | "search" | "subagent" | "tool";
      };
    }
  | { type: "chat.files"; files: string[] }
  | { type: "chat.approval"; reason: string; requestId: number; threadId: string };
