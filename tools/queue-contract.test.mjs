import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryQueueAdapterV2,
  SwitchableQueueAdapter
} from "@codexsun/framework/queue";

test("DevKit accepts the durable queue V2 backend contract", async () => {
  const database = new InMemoryQueueAdapterV2("database");
  const redis = new InMemoryQueueAdapterV2("bullmq-redis");
  const queue = new SwitchableQueueAdapter({
    adapters: [database, redis],
    initialBackend: "database"
  });
  const job = {
    idempotencyKey: "devkit:task:42",
    jobName: "task.process",
    jobVersion: 1,
    payload: { taskId: 42 }
  };

  const first = await queue.current().enqueueJob("tasks", job);
  const duplicate = await queue.current().enqueueJob("tasks", job);
  assert.equal(first.backend, "database");
  assert.equal(first.deduplicated, false);
  assert.equal(duplicate.deduplicated, true);

  await queue.switchTo("bullmq-redis");
  const redisReceipt = await queue.current().enqueueJob("tasks", {
    ...job,
    idempotencyKey: "devkit:task:43",
    payload: { taskId: 43 }
  });
  assert.equal(redisReceipt.backend, "bullmq-redis");
  await queue.close();
});
