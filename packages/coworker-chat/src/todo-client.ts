export type SharedTodo = {
  category: string;
  createdAt: string;
  description: string;
  dueDate: string;
  groupName: string;
  id: string;
  position: number;
  priority: string;
  projectId: string;
  status: string;
  title: string;
  updatedAt: string;
  visibility: "private" | "public";
};

export type SharedTodoInput = Pick<SharedTodo, "title"> &
  Partial<
    Pick<SharedTodo, "category" | "description" | "dueDate" | "groupName" | "priority" | "projectId" | "status" | "visibility">
  >;

export type SharedTodoLookup = {
  id: string;
  kind: "category" | "group" | "priority" | "status";
  name: string;
  value: string;
};

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export class TodoClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  list() {
    return this.request<SharedTodo[]>("/api/devkit/task-manager/todos");
  }

  create(input: SharedTodoInput | string) {
    return this.request<SharedTodo>("/api/devkit/task-manager/todos", {
      body: JSON.stringify(typeof input === "string" ? { title: input } : input),
      method: "POST"
    });
  }

  createBatch(items: SharedTodoInput[]) {
    return this.request<SharedTodo[]>("/api/devkit/task-manager/todos/batch", {
      body: JSON.stringify({ items }),
      method: "POST"
    });
  }

  update(id: string, input: Partial<SharedTodoInput>) {
    return this.request<SharedTodo>(`/api/devkit/task-manager/todos/${id}`, {
      body: JSON.stringify(input),
      method: "PUT"
    });
  }

  lookups() {
    return this.request<SharedTodoLookup[]>("/api/devkit/task-manager/lookups");
  }

  reorder(orderedIds: string[]) {
    return this.request<SharedTodo[]>("/api/devkit/task-manager/todos/reorder", {
      body: JSON.stringify({ orderedIds }),
      method: "POST"
    });
  }

  status(id: string, status: string) {
    return this.request<SharedTodo>(`/api/devkit/task-manager/todos/${id}/status`, {
      body: JSON.stringify({ status }),
      method: "POST"
    });
  }

  delete(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/api/devkit/task-manager/todos/${id}`, {
      method: "DELETE"
    });
  }

  private async request<T>(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/u, "")}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {})
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
}
