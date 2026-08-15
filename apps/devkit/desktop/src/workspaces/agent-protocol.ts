import type { AgentProtocolMessage } from "../contracts/desktop";
import type { RunItem } from "./agent-workspace-parts";
import { z } from "zod";

const messageRecord = z.record(z.string(), z.unknown());
const agentProtocolMessageSchema = z
  .object({
    id: z.number().optional(),
    method: z.string().optional(),
    params: messageRecord.optional(),
    result: messageRecord.optional(),
    error: z.object({ message: z.string().optional() }).passthrough().optional()
  })
  .passthrough();

export function parseAgentProtocolMessage(value: unknown): AgentProtocolMessage | undefined {
  const parsed = agentProtocolMessageSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const message: AgentProtocolMessage = {};
  if (parsed.data.id !== undefined) message.id = parsed.data.id;
  if (parsed.data.method !== undefined) message.method = parsed.data.method;
  if (parsed.data.params !== undefined) message.params = parsed.data.params;
  if (parsed.data.result !== undefined) message.result = parsed.data.result;
  if (parsed.data.error?.message !== undefined) {
    message.error = { message: parsed.data.error.message };
  }
  return message;
}

export function threadIdFrom(message: AgentProtocolMessage) {
  return textAt(message, "result", "thread", "id") ?? textAt(message, "params", "thread", "id");
}

export function textAt(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    current =
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
  }
  return typeof current === "string" ? current : undefined;
}

export function runItemFrom(message: AgentProtocolMessage): RunItem | undefined {
  const item = valueAt(message, "params", "item");
  if (!item) return undefined;
  const id = stringValue(item.id) ?? crypto.randomUUID();
  const type = stringValue(item.type) ?? "activity";
  if (!["commandExecution", "fileChange", "mcpToolCall", "webSearch"].includes(type)) {
    return undefined;
  }
  const label = stringValue(item.command) ?? stringValue(item.tool) ?? labelFor(type);
  const status =
    stringValue(item.status) ?? (message.method === "item/completed" ? "completed" : "running");
  return { id, label, status, type };
}

function valueAt(value: unknown, ...path: string[]): Record<string, unknown> | undefined {
  let current: unknown = value;
  for (const key of path) {
    current =
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
  }
  return typeof current === "object" && current !== null
    ? (current as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function labelFor(type: string) {
  return (
    {
      fileChange: "Editing workspace files",
      mcpToolCall: "Using connected tool",
      webSearch: "Searching the web"
    } as Record<string, string>
  )[type] ?? "Agent activity";
}
