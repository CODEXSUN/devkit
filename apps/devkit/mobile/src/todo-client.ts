export type MobileTodo = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
};

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export class TodoClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  list() {
    return this.request<MobileTodo[]>("/api/devkit/task-manager/todos");
  }

  create(title: string) {
    return this.request<MobileTodo>("/api/devkit/task-manager/todos", {
      body: JSON.stringify({ title }),
      method: "POST"
    });
  }

  status(id: string, status: string) {
    return this.request<MobileTodo>(`/api/devkit/task-manager/todos/${id}/status`, {
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
    const response = await fetch(`${this.baseUrl}${path}`, {
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
