import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@codexsun/framework/errors";
import { MessengerMessageCursor } from "./messenger-message-cursor.js";

test("message cursor round trips stable message ordering fields", () => {
  const value = { createdAt: "2026-09-02T08:30:00.000Z", uuid: "message-a" };
  assert.deepEqual(MessengerMessageCursor.decode(MessengerMessageCursor.encode(value)), value);
});

test("message cursor rejects malformed input as validation error", () => {
  assert.throws(
    () => MessengerMessageCursor.decode("not-a-cursor"),
    (error) => error instanceof AppError && error.statusCode === 400
  );
});
