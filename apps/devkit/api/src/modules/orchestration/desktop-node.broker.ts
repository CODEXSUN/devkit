import { z } from "zod";
import type { CodexChatEvent } from "./codex-chat.service.js";
import type { CodexChatInput } from "./orchestration.schemas.js";

const nodeEventSchema = z.object({
  event: z.unknown(),
  requestId: z.string().min(1)
});

type NodeSocket = {
  emit(event: string, payload: unknown): void;
  on(event: string, listener: (payload: unknown) => void): void;
  on(event: "disconnect", listener: () => void): void;
};

type PendingTurn = {
  push(event: CodexChatEvent): void;
  fail(error: Error): void;
};

export class DesktopNodeBroker {
  private readonly nodes = new Map<string, NodeSocket>();
  private readonly turns = new Map<string, PendingTurn>();

  attach(actorId: string, socket: NodeSocket) {
    this.nodes.set(actorId, socket);
    socket.on("node.event", (payload) => this.receive(payload));
    socket.on("disconnect", () => {
      if (this.nodes.get(actorId) === socket) this.nodes.delete(actorId);
    });
  }

  connected(actorId: string) {
    return this.nodes.has(actorId);
  }

  stream(actorId: string, input: CodexChatInput) {
    const socket = this.nodes.get(actorId);
    if (!socket) throw new Error("No authenticated desktop execution node is connected.");
    const requestId = crypto.randomUUID();
    const queue = new NodeEventQueue(() => this.turns.delete(requestId));
    this.turns.set(requestId, queue);
    socket.emit("node.turn", { input, requestId });
    return queue;
  }

  private receive(payload: unknown) {
    const parsed = nodeEventSchema.safeParse(payload);
    if (!parsed.success) return;
    const turn = this.turns.get(parsed.data.requestId);
    if (!turn) return;
    const event = parsed.data.event as CodexChatEvent;
    turn.push(event);
  }
}

class NodeEventQueue implements PendingTurn, AsyncIterable<CodexChatEvent> {
  private readonly events: CodexChatEvent[] = [];
  private waiter: ((event: CodexChatEvent) => void) | undefined;
  private error: Error | undefined;

  constructor(private readonly dispose: () => void) {}

  push(event: CodexChatEvent) {
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = undefined;
      resolve(event);
    } else this.events.push(event);
    if (event.type === "chat.completed" || event.type === "chat.failed") this.dispose();
  }

  fail(error: Error) {
    this.error = error;
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.error) throw this.error;
      const event = this.events.shift() ?? (await new Promise<CodexChatEvent>((resolve) => (this.waiter = resolve)));
      yield event;
      if (event.type === "chat.completed" || event.type === "chat.failed") return;
    }
  }
}

export const desktopNodeBroker = new DesktopNodeBroker();
