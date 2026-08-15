import { describe, expect, it } from "vitest";
import { parseAgentProtocolMessage, runItemFrom, threadIdFrom } from "./agent-protocol";

describe("agent protocol boundary", () => {
  it("accepts a valid Codex event and reads its thread", () => {
    const message = parseAgentProtocolMessage({
      id: 7,
      result: { thread: { id: "thread-7" } }
    });

    expect(message).toBeDefined();
    expect(threadIdFrom(message!)).toBe("thread-7");
  });

  it("rejects malformed event payloads", () => {
    expect(parseAgentProtocolMessage("agent.started")).toBeUndefined();
    expect(parseAgentProtocolMessage({ id: "wrong" })).toBeUndefined();
  });

  it("normalizes tool activity for the event stream", () => {
    const message = parseAgentProtocolMessage({
      method: "item/completed",
      params: {
        item: { id: "tool-1", status: "completed", tool: "read_file", type: "mcpToolCall" }
      }
    });

    expect(runItemFrom(message!)).toEqual({
      id: "tool-1",
      label: "read_file",
      status: "completed",
      type: "mcpToolCall"
    });
  });
});
