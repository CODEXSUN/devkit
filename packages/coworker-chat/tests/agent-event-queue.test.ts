import assert from "node:assert/strict";
import test from "node:test";
import { AgentEventQueue } from "../src/agent-event-queue";

test("event queue preserves event order across a burst", async () => {
  const consumed: number[] = [];
  const queue = new AgentEventQueue<number>((value) => consumed.push(value));
  queue.push(1);
  queue.push(2);
  queue.push(3);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(consumed, [1, 2, 3]);
});
