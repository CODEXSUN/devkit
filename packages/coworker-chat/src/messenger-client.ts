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
  attachments?: MessengerAttachment[];
  reactions?: MessengerReaction[];
};

export type MessengerAttachment = { id: string; mimeType: string; name: string; size: number; url: string };
export type MessengerReaction = { actorId: string; emoji: string; id: string };

export type MessengerConversation = {
  archivedAt: string | null;
  id: string;
  kind: "device" | "direct";
  lastMessageActorId: string | null;
  lastMessageClient: MessengerClientKind | null;
  lastMessageDeliveredAt: string | null;
  lastMessage: string;
  lastMessageReadAt: string | null;
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
export type MessengerUnreadEvent = {
  actorId: string;
  conversation: MessengerConversation;
  totalUnread: number;
};
export type MessengerPresenceEvent = { actorId: string; online: boolean };

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

  async attach(conversationId: string, messageId: string, file: File) {
    const response = await this.fetcher(`${this.baseUrl}/api/devkit/messenger/conversations/${conversationId}/messages/${messageId}/attachments`, {
      body: file,
      headers: { Authorization: `Bearer ${this.token()}`, "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name), "X-File-Type": file.type || "text/plain" },
      method: "POST"
    });
    const envelope = (await response.json()) as Envelope<MessengerAttachment>;
    if (!response.ok || !envelope.success) throw new Error(envelope.success ? `Upload failed (${response.status}).` : envelope.error.message);
    return envelope.data;
  }

  react(conversationId: string, messageId: string, emoji: string) {
    return this.request<MessengerReaction[]>(`/api/devkit/messenger/conversations/${conversationId}/messages/${messageId}/reactions`, { body: JSON.stringify({ emoji }), method: "POST" });
  }

  attachmentUrl(attachment: MessengerAttachment) {
    return `${this.baseUrl}${attachment.url}`;
  }

  async attachmentBlob(attachment: MessengerAttachment) {
    const response = await this.fetcher(this.attachmentUrl(attachment), { headers: { Authorization: `Bearer ${this.token()}` } });
    if (!response.ok) throw new Error("Attachment could not be loaded.");
    return response.blob();
  }

  read(conversationId: string) {
    return this.request<{ changed: boolean; conversationId: string; messageIds: string[]; read: boolean }>(`/api/devkit/messenger/conversations/${conversationId}/read`, { method: "POST" });
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

export function isMessengerMessageOwn(
  message: MessengerMessage,
  clientKind: MessengerClientKind,
  profileId: string,
  peerActorId: string
) {
  return peerActorId ? message.actorId === profileId : message.client === clientKind;
}

export function reconcileMessengerMessages(
  current: MessengerMessage[],
  latest: MessengerMessage[]
) {
  const messages = new Map(current.map((message) => [message.uuid, message]));
  latest.forEach((message) => messages.set(message.uuid, message));
  return [...messages.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt) || left.uuid.localeCompare(right.uuid)
  );
}
