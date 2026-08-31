export type CoworkerProject = {
  active?: boolean;
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

export type CoworkerRepository = {
  id: string;
  name: string;
  provider: "github" | "private-git";
  status: "active" | "inactive";
};

export type CoworkerProjectRecord = {
  assignee?: string;
  description: string;
  id: string;
  key?: string;
  kind: string;
  lane: string;
  moduleKey?: string;
  priority?: string;
  referenceId: string;
  referenceType?: string;
  status: string;
  title: string;
  type?: string;
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
