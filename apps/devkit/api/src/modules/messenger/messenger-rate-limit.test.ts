import assert from "node:assert/strict";
import test from "node:test";
import { MessengerRateLimiter } from "./messenger-rate-limit.js";

test("message rate limit blocks requests after the actor limit", () => {
  const limiter = new MessengerRateLimiter(() => 1_000);
  for (let index = 0; index < 60; index += 1) limiter.consume("user-a", "message");
  assert.throws(() => limiter.consume("user-a", "message"), /Too many Messenger requests/iu);
});

test("rate limits are isolated by actor and action", () => {
  const limiter = new MessengerRateLimiter(() => 1_000);
  for (let index = 0; index < 60; index += 1) limiter.consume("user-a", "message");
  assert.doesNotThrow(() => limiter.consume("user-b", "message"));
  assert.doesNotThrow(() => limiter.consume("user-a", "reaction"));
});

test("rate limit resets after its time window", () => {
  let now = 1_000;
  const limiter = new MessengerRateLimiter(() => now, 500);
  for (let index = 0; index < 60; index += 1) limiter.consume("user-a", "message");
  now = 1_501;
  assert.doesNotThrow(() => limiter.consume("user-a", "message"));
});
