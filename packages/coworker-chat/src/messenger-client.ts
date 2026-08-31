export type MessengerClientKind = "desktop" | "mobile" | "web";

export type MessengerMessage = {
  actorId?: string;
  body: string;
  client: MessengerClientKind;
  conversationId?: string;
  createdAt: string;
  deliveredAt?: string | null;
  recipientActorId?: string | null;
  readAt?: string | null;
  uuid: string;
};

export type MessengerConversation = {
  archivedAt: string | null;
  id: string;
  kind: "device" | "direct";
  lastMessage: string;
  mutedAt: string | null;
  peerActorId: string | null;
  title: string;
  unreadCount: number;
  updatedAt: string;
};

export type MessengerActivity = {
  action: string;
  actorId: string;
  conversationId: string;
  createdAt: string;
  details: unknown;
  id: string;
};

export type MessengerContact = {
  email: string;
  name: string;
  uuid: string;
};

export type MessengerProfile = Pick<MessengerContact, "email" | "name" | "uuid">;

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export class MessengerClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: () => string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  conversations() {
    return this.request<MessengerConversation[]>("/api/devkit/messenger/conversations");
  }

  conversation(peerActorId?: string) {
    return this.request<MessengerConversation>("/api/devkit/messenger/conversations", {
      body: JSON.stringify(peerActorId ? { peerActorId } : {}),
      method: "POST"
    });
  }

  list(conversationId: string) {
    return this.request<MessengerMessage[]>(`/api/devkit/messenger/conversations/${conversationId}/messages`);
  }

  send(conversationId: string, body: string, client: MessengerClientKind) {
    return this.request<MessengerMessage>(`/api/devkit/messenger/conversations/${conversationId}/messages`, {
      body: JSON.stringify({ body, client }),
      method: "POST"
    });
  }

  read(conversationId: string) {
    return this.request<{ conversationId: string; read: boolean }>(`/api/devkit/messenger/conversations/${conversationId}/read`, { method: "POST" });
  }

  preferences(conversationId: string, input: { archived?: boolean; muted?: boolean }) {
    return this.request<{ archived?: boolean; conversationId: string; muted?: boolean }>(`/api/devkit/messenger/conversations/${conversationId}/preferences`, {
      body: JSON.stringify(input),
      method: "POST"
    });
  }

  activity(conversationId: string) {
    return this.request<MessengerActivity[]>(`/api/devkit/messenger/conversations/${conversationId}/activity`);
  }

  contacts() {
    return this.request<MessengerContact[]>("/api/identity/contacts");
  }

  profile() {
    return this.request<MessengerProfile>("/api/identity/profile");
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token()}`,
        "Content-Type": "application/json"
      }
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.success) {
      throw new Error(
        envelope.success ? `Request failed (${response.status}).` : envelope.error.message
      );
    }
    return envelope.data;
  }
}

export function mergeMessengerMessage(messages: MessengerMessage[], message: MessengerMessage) {
  return reconcileMessengerMessages(messages, [message]);
}

export function reconcileMessengerMessages(
  current: MessengerMessage[],
  latest: MessengerMessage[]
) {
  const messages = new Map(current.map((message) => [message.uuid, message]));
  latest.forEach((message) => messages.set(message.uuid, message));
  return [...messages.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}
