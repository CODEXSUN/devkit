import { createHash } from "node:crypto";

export class MessengerDomainError extends Error {}

export class DirectConversation {
  readonly id: string;
  readonly participants: readonly [string, string];

  private constructor(left: string, right: string) {
    this.participants = [left, right];
    this.id = createHash("sha256").update(`direct:${left}:${right}`).digest("hex").slice(0, 32);
  }

  static between(actorId: string, peerActorId: string) {
    const participants = [requiredActorId(actorId), requiredActorId(peerActorId)].sort();
    if (participants[0] === participants[1]) {
      throw new MessengerDomainError("A direct conversation requires two different users.");
    }
    return new DirectConversation(participants[0]!, participants[1]!);
  }

  recipientFor(actorId: string) {
    const actor = requiredActorId(actorId);
    const recipient = this.participants.find((participant) => participant !== actor);
    if (!recipient || !this.participants.includes(actor)) {
      throw new MessengerDomainError("The user is not a conversation participant.");
    }
    return recipient;
  }
}

export class MessengerMessageBody {
  private constructor(readonly value: string) {}

  static create(value: string) {
    const body = value.trim();
    if (!body) throw new MessengerDomainError("A message cannot be empty.");
    if (body.length > 8_000) {
      throw new MessengerDomainError("A message cannot contain more than 8,000 characters.");
    }
    return new MessengerMessageBody(body);
  }
}

function requiredActorId(value: string) {
  const actorId = value.trim();
  if (!actorId || actorId.length > 160) {
    throw new MessengerDomainError("A valid user ID is required.");
  }
  return actorId;
}
