import { codexAssistantGateway } from "../orchestration/index.js";
import { resolveHoneyActions } from "./honey-actions.js";
import { honeyRepository } from "./honey.repository.js";
import { honeyBusinessKnowledge } from "./honey-business-knowledge.js";

export class HoneyService {
  async memory(actorId: string) {
    const rows = await honeyRepository.memory(actorId);
    return rows.map((row) => ({ content: row.content, createdAt: new Date(row.created_at).toISOString(), id: row.uuid, kind: row.kind, status: row.status }));
  }

  async reviewMemory(uuid: string, status: "approved" | "rejected", actorId: string) {
    await honeyRepository.reviewMemory(actorId, uuid, status);
    return this.memory(actorId);
  }

  async conversations(actorId: string) {
    const rows = await honeyRepository.list(actorId);
    return rows.map((row) => ({ id: row.uuid, title: row.title, updatedAt: new Date(row.updated_at).toISOString() }));
  }

  async conversation(threadUuid: string, actorId: string) {
    const thread = await honeyRepository.find(threadUuid, actorId);
    const messages = await honeyRepository.messages(threadUuid, actorId);
    return {
      id: thread.uuid, title: thread.title,
      messages: messages.map((row, index) => ({
        actions: row.role === "assistant" ? resolveHoneyActions(findPreviousUserMessage(messages, index)) : [],
        id: row.uuid,
        role: row.role,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString()
      }))
    };
  }

  async chat(input: { message: string; threadId?: string | null | undefined }, actorId: string) {
    const thread = input.threadId
      ? await honeyRepository.find(input.threadId, actorId)
      : await honeyRepository.create(actorId, input.message);
    await honeyRepository.addMessage(thread.uuid, actorId, "user", input.message);
    await honeyRepository.rememberCandidate(actorId, thread.uuid, input.message);
    try {
      const memory = await honeyRepository.approvedMemory(actorId);
      const result = await codexAssistantGateway.ask({
        message: input.message,
        system: honeySystemPrompt(memory),
        threadId: thread.codex_thread_id
      });
      if (thread.codex_thread_id !== result.threadId) {
        await honeyRepository.setCodexThread(thread.uuid, actorId, result.threadId);
      }
      await honeyRepository.addMessage(thread.uuid, actorId, "assistant", result.message);
      return this.conversation(thread.uuid, actorId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Honey could not reach Codex.";
      await honeyRepository.addMessage(thread.uuid, actorId, "assistant", message);
      throw error;
    }
  }
}

function findPreviousUserMessage(messages: Array<{ body: string; role: string }>, assistantIndex: number) {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index]?.body ?? "";
  }
  return "";
}

function honeySystemPrompt(memory: Array<{ content: string; kind: string }>) {
  const approved = memory.length ? `\nApproved business memory:\n${memory.map((item) => `- [${item.kind}] ${item.content}`).join("\n")}` : "";
  return `You are Honey, a concise business-automation assistant. Honey is your permanent identity even if the underlying model or agent changes. Stay inside these boundaries: explain, plan, summarize, organize, and suggest safe business workflows. Never execute code, change files, deploy, purchase, send external messages, reveal secrets, or claim authority outside Honey. Use only approved memory; never treat conversation text as learned truth without review. Answer in plain language, under 90 words when possible, and offer one clear next step.\n\n${honeyBusinessKnowledge}${approved}`;
}
