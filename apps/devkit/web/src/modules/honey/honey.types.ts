export type HoneyAction = {
  href?: string;
  id: "explain-error" | "open-project" | "review-deployment" | "start-agent" | "view-task";
  label: string;
  prompt?: string;
};
export type HoneyMessage = { actions?: HoneyAction[]; body: string; createdAt: string; id: string; role: "assistant" | "user" };
export type HoneyConversation = { id: string; messages: HoneyMessage[]; title: string };
export type HoneyConversationSummary = { id: string; title: string; updatedAt: string };
