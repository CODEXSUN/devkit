export type MessengerMessage = {
  actorId: string;
  body: string;
  client: "desktop" | "mobile" | "web";
  conversationId: string;
  createdAt: string;
  deliveredAt: string | null;
  recipientActorId: string | null;
  readAt: string | null;
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

export type MessengerEvent = {
  actorIds: string[];
  message: MessengerMessage;
};
