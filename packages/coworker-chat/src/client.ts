import type {
  CoworkerChat,
  CoworkerChatDetail,
  CoworkerEvent,
  CoworkerProject,
  CoworkerProjectRecord,
  CoworkerRepository
} from "./types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export type CoworkerStreamInput = {
  access?: "ask-approval" | "plan" | "read-only";
  conversationId: string | null;
  message: string;
  project: CoworkerProject;
  threadId: string | null;
};
export type AgentAccessMode = NonNullable<CoworkerStreamInput["access"]>;

export interface CoworkerBackend {
  archiveChat?(uuid: string): Promise<{ archived: boolean; uuid: string }>;
  archivedChats?(): Promise<CoworkerChat[]>;
  chat(uuid: string): Promise<CoworkerChatDetail>;
  chats(): Promise<CoworkerChat[]>;
  login(email: string, password: string): Promise<{ accessToken: string }>;
  projects(): Promise<CoworkerProject[]>;
  forceDeleteArchivedChats?(): Promise<{ deleted: number }>;
  forceDeleteChat?(uuid: string): Promise<{ deleted: boolean; uuid: string }>;
  restoreChat?(uuid: string): Promise<{ restored: boolean; uuid: string }>;
  selectProject?(project: CoworkerProject): Promise<void>;
  setChatPinned?(uuid: string, pinned: boolean): Promise<{ pinned: boolean; uuid: string }>;
  stream(
    input: CoworkerStreamInput,
    onEvent: (event: CoworkerEvent) => void,
    signal?: AbortSignal
  ): Promise<void>;
}

export class CoworkerClient implements CoworkerBackend {
  constructor(
    private readonly baseUrl: string,
    private readonly token: () => string | null,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)
  ) {}

  async login(email: string, password: string) {
    return this.request<{ accessToken: string }>(
      "/auth/login",
      {
        body: JSON.stringify({ email, password }),
        method: "POST"
      },
      false
    );
  }

  async projects() {
    const records = await this.request<Array<CoworkerProject & { active: boolean }>>(
      "/api/devkit/admin/project-manager/project"
    );
    return records.filter((project) => project.active);
  }

  projectRecords(kind: string) {
    return this.request<CoworkerProjectRecord[]>(
      `/api/devkit/admin/project-manager/${encodeURIComponent(kind)}`
    );
  }

  createProjectRecord(kind: string, input: Partial<CoworkerProjectRecord> & { key: string; title: string }) {
    return this.request<CoworkerProjectRecord>(
      `/api/devkit/admin/project-manager/${encodeURIComponent(kind)}`,
      { body: JSON.stringify(input), method: "POST" }
    );
  }

  updateProjectRecord(kind: string, id: string, input: Partial<CoworkerProjectRecord>) {
    return this.request<CoworkerProjectRecord>(
      `/api/devkit/admin/project-manager/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,
      { body: JSON.stringify(input), method: "PUT" }
    );
  }

  repositories() {
    return this.request<CoworkerRepository[]>("/api/devkit/project-manager/repositories");
  }

  createProject(input: {
    colorKey?: string;
    description?: string;
    key?: string;
    logoText?: string;
    referenceId?: string;
    repositoryName?: string;
    title: string;
  }) {
    const key =
      input.key?.trim() ||
      input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "");
    return this.request<CoworkerProject>("/api/devkit/admin/project-manager/project", {
      body: JSON.stringify({
        description: input.description || "Project workspace",
        key,
        colorKey: input.colorKey || "slate",
        logoText: input.logoText?.trim().toUpperCase() || "",
        moduleKey: "project-manager",
        referenceId: input.referenceId || "",
        referenceType: input.referenceId ? "repository" : "",
        repositoryName: input.repositoryName || "",
        status: "planning",
        title: input.title,
        type: "project"
      }),
      method: "POST"
    });
  }

  selectLocalFolder() {
    return this.request<{ path: string }>("/api/devkit/project-manager/select-local-folder", {
      body: JSON.stringify({}),
      method: "POST"
    });
  }

  chats() {
    return this.request<CoworkerChat[]>("/api/devkit/orchestration/agent-ide/chats");
  }

  archiveChat(uuid: string) {
    return this.request<{ archived: boolean; uuid: string }>(
      `/api/devkit/orchestration/agent-ide/chats/${uuid}`,
      { method: "DELETE" }
    );
  }

  archivedChats() {
    return this.request<CoworkerChat[]>("/api/devkit/orchestration/agent-ide/chats/archived");
  }

  restoreChat(uuid: string) {
    return this.request<{ restored: boolean; uuid: string }>(
      `/api/devkit/orchestration/agent-ide/chats/${uuid}/restore`,
      { body: JSON.stringify({}), method: "PUT" }
    );
  }

  forceDeleteChat(uuid: string) {
    return this.request<{ deleted: boolean; uuid: string }>(
      `/api/devkit/orchestration/agent-ide/chats/${uuid}/force`,
      { method: "DELETE" }
    );
  }

  forceDeleteArchivedChats() {
    return this.request<{ deleted: number }>("/api/devkit/orchestration/agent-ide/chats/archived", {
      method: "DELETE"
    });
  }

  setChatPinned(uuid: string, pinned: boolean) {
    return this.request<{ pinned: boolean; uuid: string }>(
      `/api/devkit/orchestration/agent-ide/chats/${uuid}/pin`,
      { body: JSON.stringify({ pinned }), method: "PUT" }
    );
  }

  chat(uuid: string) {
    return this.request<CoworkerChatDetail>(`/api/devkit/orchestration/agent-ide/chats/${uuid}`);
  }

  async stream(
    input: CoworkerStreamInput,
    onEvent: (event: CoworkerEvent) => void,
    signal?: AbortSignal
  ) {
    const response = await this.fetcher(
      `${this.baseUrl}/api/devkit/orchestration/agent-ide/codex/chat/stream`,
      {
        body: JSON.stringify({
          access: input.access ?? "read-only",
          attachments: [],
          connectionId: "primary",
          conversationId: input.conversationId,
          message: input.message,
          model: "gpt-5.6-terra",
          project: {
            description: input.project.description,
            id: input.project.id,
            key: input.project.key,
            moduleKey: input.project.moduleKey,
            referenceId: input.project.referenceId,
            referenceType: input.project.referenceType,
            title: input.project.title
          },
          threadId: input.threadId,
          workItem: null
        }),
        headers: this.headers(),
        method: "POST",
        ...(signal ? { signal } : {})
      }
    );
    if (!response.ok || !response.body) throw new Error(await responseError(response));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as CoworkerEvent);
    }
  }

  resolveApproval(input: {
    decision: "accept" | "acceptForSession" | "decline";
    requestId: number;
    threadId: string;
  }) {
    return this.request<{ resolved: boolean }>(
      "/api/devkit/orchestration/agent-ide/codex/approval",
      { body: JSON.stringify(input), method: "POST" }
    );
  }

  setMessageFeedback(uuid: string, feedback: "down" | "up" | null) {
    return this.request<{ feedback: "down" | "up" | null; uuid: string }>(
      `/api/devkit/orchestration/agent-ide/chat-messages/${uuid}/feedback`,
      { body: JSON.stringify({ feedback }), method: "PUT" }
    );
  }

  private async request<T>(path: string, options: RequestInit = {}, authorize = true) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(authorize ? this.headers() : {})
      }
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.success) {
      throw new Error(
        envelope.success ? `Request failed (${response.status}).` : envelope.error.message
      );
    }
    return envelope.data;
  }

  private headers() {
    const token = this.token();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }
}

async function responseError(response: Response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || `Request failed (${response.status}).`;
  } catch {
    return body.trim() || `Request failed (${response.status}).`;
  }
}
