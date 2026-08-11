import { apiGet, apiPost, apiPut } from "../../shared/api/devkit-api";
import type {
  AgentIdeChatEvent,
  AgentIdeAccess,
  AgentIdeAttachment,
  AgentIdeCodexStatus,
  AgentIdeChatHistory,
  AgentIdeChatHistoryDetail,
  AgentIdeModel,
  AgentIdePlanResult,
  AgentIdeSettings
} from "./agent-ide.types";
import type { AgentRunDetail, AgentRunSummary } from "./agent-ide.types";

export const getAgentIdeSettings = () =>
  apiGet<AgentIdeSettings>("/orchestration/agent-ide/settings");

export const testAgentIdeConnection = () =>
  apiPost<AgentIdeSettings & { responseId: string }>("/orchestration/agent-ide/settings/test");

export const createAgentIdePlan = (input: {
  brief: string;
  projectId: string;
  projectTitle: string;
}) => apiPost<AgentIdePlanResult>("/orchestration/agent-ide/plan", input);

export const getAgentIdeCodexStatus = () =>
  apiGet<AgentIdeCodexStatus>("/orchestration/codex/status");

export const listAgentIdeChats = () =>
  apiGet<AgentIdeChatHistory[]>("/orchestration/agent-ide/chats");

export const getAgentIdeChat = (uuid: string) =>
  apiGet<AgentIdeChatHistoryDetail>(`/orchestration/agent-ide/chats/${uuid}`);

export const listAgentRuns = (projectUuid: string) =>
  apiGet<AgentRunSummary[]>(`/orchestration/agent-ide/runs?projectUuid=${encodeURIComponent(projectUuid)}`);

export const getAgentRun = (uuid: string) =>
  apiGet<AgentRunDetail>(`/orchestration/agent-ide/runs/${uuid}`);

export const cleanupAgentRunWorkspace = (uuid: string) =>
  apiPost<{ branchName: string; cleaned: boolean; path: string }>(
    `/orchestration/agent-ide/runs/${uuid}/workspace/cleanup`
  );

export const verifyAgentRun = (uuid: string) =>
  apiPost<{ attempt: number; passed: boolean }>(
    `/orchestration/agent-ide/runs/${uuid}/verification`
  );

export const requestAgentRunRework = (uuid: string, note: string) =>
  apiPost<{ note: string; reviewStatus: string }>(
    `/orchestration/agent-ide/runs/${uuid}/rework`,
    { note }
  );

export const commitAgentRun = (uuid: string, message: string) =>
  apiPost<{ branchName: string; commitHash: string; pushed: false }>(
    `/orchestration/agent-ide/runs/${uuid}/commit`,
    { approved: true, message }
  );

export const setAgentIdeMessageFeedback = (
  uuid: string,
  feedback: "down" | "up" | null
) => apiPut<{ feedback: "down" | "up" | null; messageUuid: string }>(
  `/orchestration/agent-ide/chat-messages/${uuid}/feedback`,
  { feedback }
);

export const resolveAgentIdeApproval = (input: {
  decision: "accept" | "acceptForSession" | "decline";
  requestId: number;
  threadId: string;
}) => apiPost<{ resolved: boolean }>("/orchestration/agent-ide/codex/approval", input);

export async function streamAgentIdeChat(
  input: {
    access: AgentIdeAccess;
    attachments: AgentIdeAttachment[];
    conversationId: string | null;
    message: string;
    model: AgentIdeModel;
    threadId: string | null;
    project: {
      id: string;
      key: string;
      title: string;
      description: string;
      moduleKey: string;
      referenceId: string;
      referenceType: string;
    };
  },
  onEvent: (event: AgentIdeChatEvent) => void
) {
  const baseUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
  const token = window.localStorage.getItem("devkit_session");
  const response = await fetch(`${baseUrl}/api/devkit/orchestration/agent-ide/codex/chat/stream`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || `Codex chat failed (${response.status}).`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as AgentIdeChatEvent);
    }
  }
}
