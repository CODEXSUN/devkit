export type MessengerMessage = {
  attachments?: Array<{ id: string; mimeType: string; name: string; size: number; url: string }>;
  actorId: string;
  body: string;
  client: "desktop" | "mobile" | "web";
  conversationId: string;
  createdAt: string;
  deliveredAt: string | null;
  recipientActorId: string | null;
  readAt: string | null;
  reactions?: Array<{ actorId: string; emoji: string; id: string }>;
  uuid: string;
};

export type MessengerConversation = {
  archivedAt: string | null;
  id: string;
  kind: "device" | "direct";
  lastMessageActorId: string | null;
  lastMessageClient: "desktop" | "mobile" | "web" | null;
  lastMessageDeliveredAt: string | null;
  lastMessage: string;
  lastMessageReadAt: string | null;
  mutedAt: string | null;
  peerActorId: string | null;
  title: string;
  unreadCount: number;
  updatedAt: string;
};

export type MessengerPresenceEvent = {
  actorId: string;
  online: boolean;
};

export type MessengerEvent = {
  actorIds: string[];
  message: MessengerMessage;
};

export type MessengerUnreadEvent = {
  actorId: string;
  conversation: MessengerConversation;
  totalUnread: number;
};
