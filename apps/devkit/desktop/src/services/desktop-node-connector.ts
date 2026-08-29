import type { CoworkerEvent, CoworkerStreamInput } from "@codexsun/coworker-chat";
import { io, type Socket } from "socket.io-client";
import { z } from "zod";
import { NativeCoworkerBackend } from "./native-coworker-backend";

const turnSchema = z.object({
  input: z.object({
    conversationId: z.string().nullable(), message: z.string().min(1),
    project: z.object({ description: z.string(), id: z.string(), key: z.string(), moduleKey: z.string(), referenceId: z.string(), referenceType: z.string(), title: z.string() }),
    threadId: z.string().nullable()
  }),
  requestId: z.string().min(1)
});

export class DesktopNodeConnector {
  private socket: Socket | undefined;
  private readonly localChats = new Map<string, string>();
  private readonly backend = new NativeCoworkerBackend();

  constructor(private readonly onState: (state: DesktopNodeState) => void = () => undefined) {}

  connect(apiUrl: string, token: string) {
    this.disconnect();
    this.socket = io(apiUrl, { auth: { token: `Bearer ${token}` }, path: "/api/devkit/orchestration/node/socket.io", transports: ["websocket"] });
    this.onState({ status: "connecting" });
    this.socket.on("connect", () => this.onState({ status: "connected" }));
    this.socket.on("connect_error", (error) => this.onState({ detail: error.message, status: "error" }));
    this.socket.on("disconnect", () => this.onState({ status: "disconnected" }));
    this.socket.on("node.turn", (payload: unknown) => void this.execute(payload));
  }

  disconnect() { this.socket?.disconnect(); this.socket = undefined; this.onState({ status: "disconnected" }); }

  private async execute(payload: unknown) {
    const parsed = turnSchema.safeParse(payload);
    if (!parsed.success || !this.socket) return;
    const { input, requestId } = parsed.data;
    this.onState({ detail: input.message, status: "working" });
    const centralId = input.conversationId;
    const localId = centralId ? (this.localChats.get(centralId) ?? null) : null;
    try {
      await this.backend.stream({ ...input, conversationId: localId } as CoworkerStreamInput, (event) => {
        if (event.type === "chat.started" && centralId) this.localChats.set(centralId, event.conversationId);
        this.emit(requestId, event);
        if (event.type === "chat.completed") this.onState({ status: "connected" });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Desktop Codex execution failed.";
      this.emit(requestId, { message, type: "chat.failed" });
      this.onState({ detail: message, status: "error" });
    }
  }

  private emit(requestId: string, event: CoworkerEvent) { this.socket?.emit("node.event", { event, requestId }); }
}

export type DesktopNodeState = {
  detail?: string;
  status: "connected" | "connecting" | "disconnected" | "error" | "working";
};
