import assert from "node:assert/strict";
import test from "node:test";
import {
  MessengerClient,
  isMessengerMessageOwn,
  mergeMessengerMessage,
  type MessengerMessage,
  reconcileMessengerMessages
} from "../src/messenger-client";
import { isMessengerConversationMessage } from "../src/use-messenger";

const first: MessengerMessage = {
  body: "First",
  client: "web",
  createdAt: "2026-08-30T08:00:00.000Z",
  uuid: "first"
};
const second: MessengerMessage = {
  body: "Second",
  client: "mobile",
  createdAt: "2026-08-30T08:01:00.000Z",
  uuid: "second"
};

test("reconcileMessengerMessages orders messages and replaces duplicates", () => {
  const updated = { ...first, body: "Updated" };
  assert.deepEqual(reconcileMessengerMessages([second, first], [updated]), [updated, second]);
});

test("reconcileMessengerMessages uses message id for stable ascending ties", () => {
  const createdAt = "2026-09-01T10:00:00.000Z";
  const laterId = { ...first, createdAt, uuid: "message-b" };
  const earlierId = { ...second, createdAt, uuid: "message-a" };
  assert.deepEqual(reconcileMessengerMessages([laterId], [earlierId]), [earlierId, laterId]);
});

test("mergeMessengerMessage appends one new message", () => {
  assert.deepEqual(mergeMessengerMessage([first], second), [first, second]);
});

test("device chats align only the active client on the right", () => {
  assert.equal(isMessengerMessageOwn({ ...first, actorId: "me" }, "web", "me", ""), true);
  assert.equal(isMessengerMessageOwn({ ...first, actorId: "me" }, "desktop", "me", ""), false);
  assert.equal(isMessengerMessageOwn({ ...second, actorId: "me" }, "mobile", "me", ""), true);
});

test("direct chats align the signed-in actor on the right", () => {
  assert.equal(isMessengerMessageOwn({ ...first, actorId: "me" }, "desktop", "me", "other"), true);
  assert.equal(isMessengerMessageOwn({ ...first, actorId: "other" }, "desktop", "me", "other"), false);
});

test("private device chat accepts only the signed-in actor without a recipient", () => {
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "me" }, "me", ""), true);
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "other" }, "me", ""), false);
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "me", recipientActorId: "other" }, "me", ""), false);
});

test("direct chat accepts only messages exchanged with the selected user", () => {
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "me", recipientActorId: "other" }, "me", "other"), true);
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "other", recipientActorId: "me" }, "me", "other"), true);
  assert.equal(isMessengerConversationMessage({ ...first, actorId: "third", recipientActorId: "me" }, "me", "other"), false);
});

test("MessengerClient uses durable conversation routes", async () => {
  const requests: Array<{ body?: string; method?: string; url: string }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ ...(typeof init?.body === "string" ? { body: init.body } : {}), ...(init?.method ? { method: init.method } : {}), url: String(input) });
    return new Response(JSON.stringify({ data: { id: "a".repeat(32) }, success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;
  const client = new MessengerClient("http://localhost:9050", () => "token", fetcher);
  const conversation = await client.conversation("peer-user");
  await client.read(conversation.id);
  await client.preferences(conversation.id, { muted: true });
  await client.activity(conversation.id);
  assert.deepEqual(requests.map((request) => request.url), [
    "http://localhost:9050/api/devkit/messenger/conversations",
    `http://localhost:9050/api/devkit/messenger/conversations/${conversation.id}/read`,
    `http://localhost:9050/api/devkit/messenger/conversations/${conversation.id}/preferences`,
    `http://localhost:9050/api/devkit/messenger/conversations/${conversation.id}/activity`
  ]);
  assert.equal(requests[0]?.body, JSON.stringify({ peerActorId: "peer-user" }));
  assert.equal(requests[2]?.body, JSON.stringify({ muted: true }));
});

test("MessengerClient uses identity routes relative to the configured API prefix", async () => {
  const requests: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return new Response(JSON.stringify({ data: [], success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;
  const client = new MessengerClient("https://devkit.example/api/platform", () => "token", fetcher);
  await client.contacts();
  await client.profile();
  assert.deepEqual(requests, [
    "https://devkit.example/api/platform/identity/contacts",
    "https://devkit.example/api/platform/identity/profile"
  ]);
});
