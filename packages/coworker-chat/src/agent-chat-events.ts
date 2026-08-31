import type { CoworkerEvent } from "./types";

export type AgentAction = Extract<CoworkerEvent, { type: "chat.action" }>["action"];
export type AgentApproval = Extract<CoworkerEvent, { type: "chat.approval" }>;

export type AgentMessage = {
  actions: AgentAction[];
  approval: AgentApproval | null;
  durationMs: number | null;
  feedback: "down" | "up" | null;
  files: string[];
  id: string;
  role: "assistant" | "user";
  status: "cancelled" | "completed" | "failed" | "running";
  text: string;
};

export function createAgentTurn(text: string, assistantId = crypto.randomUUID()) {
  return {
    assistantId,
    messages: [
      createMessage("user", text, crypto.randomUUID(), "completed"),
      createMessage("assistant", "", assistantId, "running")
    ]
  };
}

export function reduceAgentEvent(
  messages: AgentMessage[],
  assistantId: string,
  event: CoworkerEvent,
  elapsedMs: number
) {
  return updateAssistant(messages, assistantId, (message) => {
    if (event.type === "chat.delta") return { ...message, text: message.text + event.delta };
    if (event.type === "chat.action") {
      return { ...message, actions: upsertAction(message.actions, event.action) };
    }
    if (event.type === "chat.approval") return { ...message, approval: event };
    if (event.type === "chat.files") return { ...message, files: event.files };
    if (event.type === "chat.completed") {
      return {
        ...message,
        durationMs: elapsedMs,
        id: event.messageId || message.id,
        status: "completed" as const
      };
    }
    if (event.type === "chat.failed") {
      return {
        ...message,
        durationMs: elapsedMs,
        status: "failed" as const,
        text: message.text || event.message
      };
    }
    return message;
  });
}

export function cancelAgentTurn(messages: AgentMessage[], assistantId: string, elapsedMs: number) {
  return updateAssistant(messages, assistantId, (message) => ({
    ...message,
    durationMs: elapsedMs,
    status: "cancelled",
    text: message.text || "Stopped by you."
  }));
}

export function messageFromHistory(message: {
  actions: AgentAction[];
  body: string;
  durationMs: number | null;
  feedback: "down" | "up" | null;
  files: string[];
  role: "assistant" | "user";
  uuid: string;
}) {
  return {
    ...createMessage(message.role, message.body, message.uuid, "completed"),
    actions: message.actions,
    durationMs: message.durationMs,
    feedback: message.feedback,
    files: message.files,
    status: message.body === "Stopped by you." ? ("cancelled" as const) : ("completed" as const)
  };
}

function createMessage(
  role: AgentMessage["role"],
  text: string,
  id: string,
  status: AgentMessage["status"]
): AgentMessage {
  return { actions: [], approval: null, durationMs: null, feedback: null, files: [], id, role, status, text };
}

function updateAssistant(
  messages: AgentMessage[],
  id: string,
  update: (message: AgentMessage) => AgentMessage
) {
  return messages.map((message) => (message.id === id ? update(message) : message));
}

function upsertAction(actions: AgentAction[], action: AgentAction) {
  return [...actions.filter((entry) => entry.id !== action.id), action];
}
