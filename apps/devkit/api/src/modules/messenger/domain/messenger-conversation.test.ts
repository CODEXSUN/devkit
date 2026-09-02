import assert from "node:assert/strict";
import test from "node:test";
import {
  DirectConversation,
  MessengerDomainError,
  MessengerMessageBody
} from "./messenger-conversation.js";

test("direct conversation identity is stable for both users", () => {
  const first = DirectConversation.between("user-b", "user-a");
  const second = DirectConversation.between("user-a", "user-b");
  assert.equal(first.id, second.id);
  assert.deepEqual(first.participants, ["user-a", "user-b"]);
});

test("direct conversation resolves the other user as recipient", () => {
  const conversation = DirectConversation.between("user-a", "user-b");
  assert.equal(conversation.recipientFor("user-a"), "user-b");
  assert.equal(conversation.recipientFor("user-b"), "user-a");
});

test("direct conversation rejects self messaging", () => {
  assert.throws(
    () => DirectConversation.between("user-a", "user-a"),
    MessengerDomainError
  );
});

test("message body trims content and enforces the domain limit", () => {
  assert.equal(MessengerMessageBody.create("  Hello  ").value, "Hello");
  assert.throws(() => MessengerMessageBody.create("   "), MessengerDomainError);
  assert.throws(() => MessengerMessageBody.create("x".repeat(8_001)), MessengerDomainError);
});
