import { desktopNodeBroker } from "./desktop-node.broker.js";
import { orchestrationChatRepository } from "./orchestration-chat.repository.js";
import type { CodexChatEvent } from "./codex-chat.service.js";
import type { CodexChatInput } from "./orchestration.schemas.js";

export class DesktopNodeChatService {
  async *stream(input: CodexChatInput, actorId: string): AsyncGenerator<CodexChatEvent> {
    const conversation = input.conversationId
      ? await orchestrationChatRepository.find(input.conversationId, actorId)
      : await orchestrationChatRepository.create(
          {
            access: input.access,
            connectionId: input.connectionId,
            message: input.message,
            model: input.model,
            projectKey: input.project.key,
            projectTitle: input.project.title,
            projectUuid: input.project.id,
            workItem: input.workItem
          },
          actorId
        );
    await orchestrationChatRepository.addMessage(
      {
        actions: [],
        attachments: [],
        body: input.message,
        durationMs: null,
        files: [],
        role: "user",
        threadUuid: conversation.uuid
      },
      actorId
    );
    const startedAt = Date.now();
    let assistantText = "";
    for await (const event of desktopNodeBroker.stream(actorId, {
      ...input,
      conversationId: conversation.uuid
    })) {
      if (event.type === "chat.started") {
        await orchestrationChatRepository.updateRuntime(conversation.uuid, actorId, {
          access: input.access,
          codexThreadId: event.threadId,
          connectionId: input.connectionId,
          model: input.model
        });
        yield { ...event, conversationId: conversation.uuid };
        continue;
      }
      if (event.type === "chat.delta") assistantText += event.delta;
      if (event.type === "chat.completed" || event.type === "chat.failed") {
        const body = event.type === "chat.failed" ? event.message : assistantText || "No response returned.";
        const messageId = await orchestrationChatRepository.addMessage(
          {
            actions: [],
            attachments: [],
            body,
            durationMs: Date.now() - startedAt,
            files: [],
            role: "assistant",
            threadUuid: conversation.uuid
          },
          actorId
        );
        yield event.type === "chat.completed" ? { ...event, messageId } : event;
        return;
      }
      yield event;
    }
  }
}
