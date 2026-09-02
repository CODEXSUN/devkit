import assert from "node:assert/strict";
import test from "node:test";
import { messengerSocketExpiryDelay } from "./messenger-socket-session.js";

test("socket expiry delay uses the verified token expiry", () => {
  assert.equal(messengerSocketExpiryDelay(20_000, 5_000), 15_000);
});

test("expired socket sessions disconnect immediately", () => {
  assert.equal(messengerSocketExpiryDelay(5_000, 20_000), 1);
});
