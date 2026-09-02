import { AppError } from "@codexsun/framework/errors";
import type { DevkitActor } from "../../request-context.js";
import { MessengerDomainError } from "./domain/messenger-conversation.js";
import { MessengerRepository } from "./messenger.repository.js";

export class MessengerService {
  constructor(private readonly repository: MessengerRepositoryPort = new MessengerRepository()) {}

  async contacts(actor: DevkitActor) {
    if (!actor.messageableActors) return [];
    const contacts = await actor.messageableActors();
    return contacts.filter((contact) => contact.uuid !== actor.id);
  }

  async openDirectConversation(actor: DevkitActor, peerActorId: string) {
    if (!actor.canMessageActor || !(await actor.canMessageActor(peerActorId))) {
      throw AppError.notFound("Messenger recipient is not an active user.");
    }
    try {
      const conversationId = await this.repository.conversation(
        actor.id,
        actor.id,
        peerActorId
      );
      const conversation = (await this.repository.conversations(actor.id)).find(
        (item) => item.uuid === conversationId
      );
      if (!conversation) throw AppError.notFound("Messenger conversation was not found.");
      return conversation;
    } catch (error) {
      throw mapDomainError(error);
    }
  }

  async send(
    actor: DevkitActor,
    conversationId: string,
    body: string,
    client: "desktop" | "mobile" | "web"
  ) {
    try {
      return await this.repository.create(actor.id, actor.id, conversationId, body, client);
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

type MessengerRepositoryPort = Pick<
  MessengerRepository,
  "conversation" | "conversations" | "create"
>;

function mapDomainError(error: unknown) {
  return error instanceof MessengerDomainError ? AppError.validation(error.message) : error;
}
