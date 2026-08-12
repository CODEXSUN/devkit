import { apiGet, apiPost } from "../../shared/api/devkit-api";
import type { HoneyConversation, HoneyConversationSummary } from "./honey.types";

export const listHoneyConversations = () => apiGet<HoneyConversationSummary[]>("/honey/conversations");
export const getHoneyConversation = (id: string) => apiGet<HoneyConversation>(`/honey/conversations/${id}`);
export const sendHoneyMessage = (message: string, threadId: string | null) =>
  apiPost<HoneyConversation>("/honey/chat", { message, threadId });

export const honeyChatClient = {
  href: "/app/devkit/honey",
  load: async (threadId: string | null) => {
    if (threadId) return getHoneyConversation(threadId);
    const latest = (await listHoneyConversations())[0];
    return latest ? getHoneyConversation(latest.id) : null;
  },
  send: sendHoneyMessage
};
