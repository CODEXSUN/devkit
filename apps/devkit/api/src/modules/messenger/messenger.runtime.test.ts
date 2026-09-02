import assert from "node:assert/strict";
import test from "node:test";
import {
  publishMessengerEvent,
  publishMessengerUnreadEvent,
  subscribeMessengerEvents,
  subscribeMessengerUnreadEvents
} from "./messenger.runtime.js";
import type { MessengerEvent, MessengerUnreadEvent } from "./messenger.types.js";

const messageEvent: MessengerEvent = {
  actorIds: ["user-a", "user-b"],
  message: {
    actorId: "user-a",
    body: "Hello",
    client: "web",
    conversationId: "c".repeat(32),
    createdAt: "2026-09-02T08:00:00.000Z",
    deliveredAt: null,
    recipientActorId: "user-b",
    readAt: null,
    uuid: "m".repeat(32)
  }
};

test("message event subscription stops after unsubscribe", () => {
  const received: MessengerEvent[] = [];
  const unsubscribe = subscribeMessengerEvents((event) => received.push(event));
  publishMessengerEvent(messageEvent);
  unsubscribe();
  publishMessengerEvent(messageEvent);
  assert.deepEqual(received, [messageEvent]);
});

test("unread event subscription delivers actor-scoped state", () => {
  const received: MessengerUnreadEvent[] = [];
  const event: MessengerUnreadEvent = {
    actorId: "user-b",
    conversation: {
      archivedAt: null,
      id: "c".repeat(32),
      kind: "direct",
      lastMessage: "Hello",
      lastMessageActorId: "user-a",
      lastMessageClient: "web",
      lastMessageDeliveredAt: null,
      lastMessageReadAt: null,
      mutedAt: null,
      peerActorId: "user-a",
      title: "",
      unreadCount: 1,
      updatedAt: "2026-09-02T08:00:00.000Z"
    },
    totalUnread: 1
  };
  const unsubscribe = subscribeMessengerUnreadEvents((value) => received.push(value));
  publishMessengerUnreadEvent(event);
  unsubscribe();
  assert.deepEqual(received, [event]);
});
