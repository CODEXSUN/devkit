import type {
  CoworkerBackend,
  CoworkerChatDetail,
  CoworkerEvent,
  CoworkerProject,
  CoworkerStreamInput
} from "@codexsun/coworker-chat";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type {
  AgentMessage,
  AgentProtocolMessage,
  AgentRuntimeStatus,
  AgentTask,
  DesktopSetup,
  DesktopWorkspace,
  Workspace
} from "../contracts/desktop";

export class NativeCoworkerBackend implements CoworkerBackend {
  private project: CoworkerProject | undefined;

  async login() {
    return { accessToken: "local-codex" };
  }

  async projects() {
    const setup = await nativeClient.getDesktopSetup();
    const workspaces = setup.workspaces.map(toProject);
    const selected =
      workspaces.find((item) => item.referenceId === setup.defaultWorkspacePath) ?? workspaces[0];
    if (selected) await this.selectProject(selected);
    return workspaces;
  }

  async selectProject(project: CoworkerProject) {
    await nativeClient.openWorkspace(project.referenceId);
    this.project = project;
  }

  async chats() {
    const project = this.requireProject();
    return (await nativeClient.listAgentTasks()).map((task) => toChat(task, project.id));
  }

  async chat(uuid: string): Promise<CoworkerChatDetail> {
    const project = this.requireProject();
    const task = await nativeClient.getAgentTask(taskIdFrom(uuid));
    const messages = await nativeClient.listAgentMessages(task.id);
    return {
      ...toChat(task, project.id),
      messages: messages.map((message) => ({
        body: message.content,
        role: message.role === "agent" ? "assistant" : "user",
        uuid: message.id
      }))
    };
  }

  async stream(input: CoworkerStreamInput, onEvent: (event: CoworkerEvent) => void) {
    await this.selectProject(input.project);
    await nativeClient.startAgentRuntime();
    const events = new NativeTurnEvents(onEvent);
    await events.listen();
    try {
      const threadId = input.threadId ?? (await events.createThread());
      const task = input.conversationId
        ? await nativeClient.getAgentTask(taskIdFrom(input.conversationId))
        : await nativeClient.saveAgentTask(threadId, titleFrom(input.message));
      if (input.conversationId) await nativeClient.resumeAgentThread(task.id, threadId);
      await nativeClient.saveAgentMessage(task.id, crypto.randomUUID(), "user", input.message);
      events.begin(task, threadId);
      await nativeClient.setAgentTaskStatus(task.id, "running");
      await nativeClient.sendAgentTurn(task.id, threadId, input.message);
      await events.completed;
    } finally {
      events.dispose();
    }
  }

  private requireProject() {
    if (!this.project) throw new Error("Link a local project folder before starting Codex.");
    return this.project;
  }
}

class NativeTurnEvents {
  private assistantText = "";
  private task: AgentTask | undefined;
  private threadId = "";
  private resolveCompleted: (() => void) | undefined;
  private rejectCompleted: ((error: Error) => void) | undefined;
  private resolveThread: ((threadId: string) => void) | undefined;
  private rejectThread: ((error: Error) => void) | undefined;
  private unlisten: UnlistenFn[] = [];
  readonly completed = new Promise<void>((resolve, reject) => {
    this.resolveCompleted = resolve;
    this.rejectCompleted = reject;
  });

  constructor(private readonly emit: (event: CoworkerEvent) => void) {}

  async listen() {
    this.unlisten = await Promise.all([
      listen<unknown>("agent-event", (event) => this.handle(event.payload)),
      listen<unknown>("agent-error", (event) => {
        const message = agentErrorFrom(event.payload);
        if (message && this.task) this.fail(message);
      })
    ]);
  }

  async createThread() {
    const thread = new Promise<string>((resolve, reject) => {
      this.resolveThread = resolve;
      this.rejectThread = reject;
    });
    await nativeClient.startAgentThread();
    return withTimeout(thread, 10_000, "The local Codex runtime did not create a thread.");
  }

  begin(task: AgentTask, threadId: string) {
    this.task = task;
    this.threadId = threadId;
    this.emit({ conversationId: chatId(task.id), threadId, type: "chat.started" });
  }

  dispose() {
    for (const remove of this.unlisten) remove();
    this.unlisten = [];
  }

  private handle(value: unknown) {
    const message = parseAgentProtocolMessage(value);
    if (!message) return;
    const nextThreadId = threadIdFrom(message);
    if (nextThreadId && this.resolveThread) {
      this.resolveThread(nextThreadId);
      this.resolveThread = undefined;
      this.rejectThread = undefined;
    }
    if (!this.task || !belongsToThread(message, this.threadId)) return;
    const error = agentErrorFrom(message);
    if (error) {
      this.fail(error);
      return;
    }
    if (message.method === "item/agentMessage/delta") {
      const delta = extractTextAt(message, "params", "delta");
      if (delta) {
        this.assistantText += delta;
        this.emit({ delta, type: "chat.delta" });
      }
    }
    const action = actionFrom(message);
    if (action) this.emit({ action, type: "chat.action" });
    if (message.method === "turn/diff/updated") {
      const diff = textAt(message, "params", "diff");
      if (diff) this.emit({ files: editedFiles(diff), type: "chat.files" });
    }
    if (message.method === "turn/completed") void this.complete(message);
  }

  private async complete(message: AgentProtocolMessage) {
    const task = this.task;
    if (!task) return;
    const fallback =
      extractTextAt(message, "params", "turn", "output") ||
      extractTextAt(message, "params", "output");
    const text = this.assistantText || fallback || "Codex completed without a text response.";
    const messageId = crypto.randomUUID();
    await nativeClient.saveAgentMessage(task.id, messageId, "agent", text);
    await nativeClient.setAgentTaskStatus(task.id, "completed");
    this.emit({ messageId, status: "completed", type: "chat.completed" });
    this.resolveCompleted?.();
    this.resolveCompleted = undefined;
    this.rejectCompleted = undefined;
  }

  private fail(message: string) {
    if (!this.task) {
      this.rejectThread?.(new Error(message));
      return;
    }
    void nativeClient.setAgentTaskStatus(this.task.id, "failed").catch(() => undefined);
    this.emit({ message: cleanError(message), type: "chat.failed" });
    this.rejectCompleted?.(new Error(cleanError(message)));
    this.resolveCompleted = undefined;
    this.rejectCompleted = undefined;
  }
}

function actionFrom(message: AgentProtocolMessage) {
  if (message.method !== "item/started" && message.method !== "item/completed") return undefined;
  const item = recordAt(message, "params", "item");
  const type = typeof item?.type === "string" ? item.type : "";
  if (!item || !["commandExecution", "fileChange", "mcpToolCall", "webSearch"].includes(type)) {
    return undefined;
  }
  const fallback =
    type === "fileChange"
      ? "Apply workspace file changes"
      : type === "webSearch"
        ? "Search the web"
        : "Use connected tool";
  const label =
    typeof item.command === "string"
      ? item.command
      : typeof item.tool === "string"
        ? item.tool
        : fallback;
  return {
    id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
    label: label.replace(/\s+/gu, " ").trim().slice(0, 320),
    status: message.method === "item/completed" ? ("completed" as const) : ("running" as const),
    type:
      type === "commandExecution"
        ? ("command" as const)
        : type === "fileChange"
          ? ("file" as const)
          : type === "webSearch"
            ? ("search" as const)
            : ("tool" as const)
  };
}

function editedFiles(diff: string) {
  const paths = [
    ...[...diff.matchAll(/^\+\+\+\s+b\/(.+)$/gmu)].map((match) => match[1]),
    ...[...diff.matchAll(/^---\s+a\/(.+)$/gmu)].map((match) => match[1])
  ];
  return [
    ...new Set(paths.filter((path): path is string => Boolean(path && path !== "/dev/null")))
  ].sort();
}

function recordAt(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return isRecord(current) ? current : undefined;
}

const nativeClient = {
  getDesktopSetup: () => invoke<DesktopSetup>("get_desktop_setup"),
  getAgentTask: (taskId: number) => invoke<AgentTask>("get_agent_task", { taskId }),
  listAgentMessages: (taskId: number) => invoke<AgentMessage[]>("list_agent_messages", { taskId }),
  listAgentTasks: () => invoke<AgentTask[]>("list_agent_tasks"),
  openWorkspace: (path: string) => invoke<Workspace>("open_workspace", { path }),
  resumeAgentThread: (taskId: number, threadId: string) =>
    invoke<number>("resume_agent_thread", { taskId, threadId }),
  saveAgentMessage: (taskId: number, id: string, role: "agent" | "user", content: string) =>
    invoke<AgentMessage>("save_agent_message", { content, id, role, taskId }),
  saveAgentTask: (threadId: string, title: string) =>
    invoke<AgentTask>("save_agent_task", {
      access: "readOnly",
      localTaskId: null,
      surface: "chat",
      threadId,
      title
    }),
  sendAgentTurn: (taskId: number, threadId: string, prompt: string) =>
    invoke<number>("send_agent_turn", { access: "readOnly", prompt, taskId, threadId }),
  setAgentTaskStatus: (taskId: number, status: AgentTask["runStatus"]) =>
    invoke<AgentTask>("set_agent_task_status", { status, taskId }),
  startAgentRuntime: () => invoke<AgentRuntimeStatus>("start_agent_runtime"),
  startAgentThread: () => invoke<number>("start_agent_thread")
};

function parseAgentProtocolMessage(value: unknown): AgentProtocolMessage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const message: AgentProtocolMessage = {};
  if (typeof record.id === "number") message.id = record.id;
  if (typeof record.method === "string") message.method = record.method;
  if (isRecord(record.params)) message.params = record.params;
  if (isRecord(record.result)) message.result = record.result;
  if (isRecord(record.error) && typeof record.error.message === "string") {
    message.error = { message: record.error.message };
  }
  return message;
}

function agentErrorFrom(value: unknown) {
  const message = parseAgentProtocolMessage(value);
  if (!message) return undefined;
  return (
    message.error?.message ??
    textAt(message, "params", "error", "message") ??
    textAt(message, "params", "turn", "error", "message")
  );
}

function threadIdFrom(message: AgentProtocolMessage) {
  return (
    textAt(message, "result", "thread", "id") ??
    textAt(message, "params", "thread", "id") ??
    textAt(message, "params", "threadId")
  );
}

function extractTextAt(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return extractText(current);
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).join("");
  if (!isRecord(value)) return "";
  for (const key of ["text", "delta", "content", "message", "output", "result"]) {
    const text = extractText(value[key]);
    if (text) return text;
  }
  return "";
}

function textAt(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return typeof current === "string" ? current : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toProject(workspace: DesktopWorkspace): CoworkerProject {
  return {
    description: workspace.tagline ?? "Local DevKit workspace",
    id: `local:${workspace.path}`,
    key: workspace.path,
    moduleKey: "local",
    referenceId: workspace.path,
    referenceType: "folder",
    title: workspace.projectName || workspace.name
  };
}

function toChat(task: AgentTask, projectUuid: string) {
  return {
    codexThreadId: task.threadId,
    projectUuid,
    title: task.title,
    updatedAt: task.updatedAt,
    uuid: chatId(task.id)
  };
}

function chatId(taskId: number) {
  return `local:${taskId}`;
}

function taskIdFrom(chatUuid: string) {
  const taskId = Number(chatUuid.replace(/^local:/u, ""));
  if (!Number.isInteger(taskId) || taskId < 1) throw new Error("The local chat is unavailable.");
  return taskId;
}

function titleFrom(message: string) {
  return message.trim().replace(/\s+/gu, " ").slice(0, 80) || "New chat";
}

function belongsToThread(message: AgentProtocolMessage, threadId: string) {
  const eventThread =
    textAt(message, "params", "threadId") ?? textAt(message, "params", "thread", "id");
  return !eventThread || eventThread === threadId;
}

function cleanError(message: string) {
  try {
    const parsed = JSON.parse(message) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || "Local Codex could not complete the request.";
  } catch {
    return message.trim() || "Local Codex could not complete the request.";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}
