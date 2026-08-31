import assert from "node:assert/strict";
import test from "node:test";
import { cancelAgentTurn, createAgentTurn, messageFromHistory, reduceAgentEvent } from "../src/agent-chat-events";

test("agent events build a durable action timeline and streamed response", () => {
  const turn = createAgentTurn("Review this idea", "assistant-1");
  const withAction = reduceAgentEvent(turn.messages, turn.assistantId, {
    action: { id: "search-1", label: "Search the workspace", status: "running", type: "search" },
    type: "chat.action"
  }, 100);
  const withText = reduceAgentEvent(withAction, turn.assistantId, { delta: "One useful direction", type: "chat.delta" }, 180);
  const complete = reduceAgentEvent(withText, turn.assistantId, { messageId: "message-1", status: "completed", type: "chat.completed" }, 460);

  assert.equal(complete[1]?.actions[0]?.label, "Search the workspace");
  assert.equal(complete[1]?.text, "One useful direction");
  assert.equal(complete[1]?.status, "completed");
  assert.equal(complete[1]?.durationMs, 460);
});

test("agent approval stays attached to the active assistant message", () => {
  const turn = createAgentTurn("Implement this", "assistant-2");
  const messages = reduceAgentEvent(turn.messages, turn.assistantId, {
    reason: "Writing files requires approval.", requestId: 7, threadId: "thread-1", type: "chat.approval"
  }, 200);
  assert.equal(messages[1]?.approval?.requestId, 7);
});

test("cancel marks the active response without deleting partial output", () => {
  const turn = createAgentTurn("Stop safely", "assistant-3");
  const partial = reduceAgentEvent(turn.messages, turn.assistantId, { delta: "Partial result", type: "chat.delta" }, 80);
  const cancelled = cancelAgentTurn(partial, turn.assistantId, 120);
  assert.equal(cancelled[1]?.text, "Partial result");
  assert.equal(cancelled[1]?.status, "cancelled");
});

test("history restores actions, files, duration, and feedback", () => {
  const message = messageFromHistory({
    actions: [{ id: "file-1", label: "Apply workspace file changes", status: "completed", type: "file" }],
    body: "Implemented the change.", durationMs: 4200, feedback: "up",
    files: ["src/agent.ts"], role: "assistant", uuid: "message-1"
  });
  assert.equal(message.actions.length, 1);
  assert.deepEqual(message.files, ["src/agent.ts"]);
  assert.equal(message.durationMs, 4200);
  assert.equal(message.feedback, "up");
});
