import assert from "node:assert/strict";
import test from "node:test";
import type { DevkitActor } from "../../request-context.js";
import { MessengerService } from "./messenger.service.js";

const directRow = {
  archived_at: null,
  kind: "direct" as const,
  last_message: null,
  last_message_actor_id: null,
  last_message_client: null,
  last_message_delivered_at: null,
  last_message_read_at: null,
  muted_at: null,
  peer_actor_id: "user-b",
  title: "",
  unread_count: 0,
  updated_at: new Date("2026-09-02T08:00:00.000Z"),
  uuid: "c".repeat(32)
};

test("contacts return every active messageable user except the actor", async () => {
  const service = new MessengerService(repository());
  const contacts = await service.contacts(actor({
    messageableActors: async () => [
      { email: "a@example.com", name: "User A", uuid: "user-a" },
      { email: "b@example.com", name: "User B", uuid: "user-b" }
    ]
  }));
  assert.deepEqual(contacts, [{ email: "b@example.com", name: "User B", uuid: "user-b" }]);
});

test("opening a conversation rejects an inactive recipient", async () => {
  const service = new MessengerService(repository());
  await assert.rejects(
    service.openDirectConversation(actor({ canMessageActor: async () => false }), "user-b"),
    /not an active user/iu
  );
});

test("opening a conversation returns the actor-scoped direct conversation", async () => {
  const service = new MessengerService(repository());
  assert.equal(
    await service.openDirectConversation(
      actor({ canMessageActor: async () => true }),
      "user-b"
    ),
    directRow
  );
});

function actor(overrides: Partial<DevkitActor>): DevkitActor {
  return { id: "user-a", permissions: [], roles: ["developer"], ...overrides };
}

function repository() {
  return {
    conversation: async () => directRow.uuid,
    conversations: async () => [directRow],
    create: async () => ({
      actor_id: "user-a",
      body: "Hello",
      client: "web",
      conversation_uuid: directRow.uuid,
      created_at: new Date(),
      delivered_at: null,
      id: 1,
      read_at: null,
      recipient_actor_id: "user-b",
      uuid: "m".repeat(32)
    })
  };
}
