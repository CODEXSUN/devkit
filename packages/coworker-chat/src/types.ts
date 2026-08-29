export type CoworkerProject = {
  description: string;
  id: string;
  key: string;
  moduleKey: string;
  referenceId: string;
  referenceType: string;
  title: string;
};

export type CoworkerProjectConnector = (name?: string) => Promise<CoworkerProject | null>;

export type CoworkerMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type CoworkerChat = {
  codexThreadId: string | null;
  projectUuid: string;
  title: string;
  updatedAt: string;
  uuid: string;
};

export type CoworkerChatDetail = CoworkerChat & {
  messages: Array<{ body: string; role: "assistant" | "user"; uuid: string }>;
};

export type CoworkerEvent =
  | { type: "chat.started"; conversationId: string; threadId: string }
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
