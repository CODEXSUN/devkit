import type { CoworkerProject } from "@codexsun/coworker-chat";

export type MobileProject = CoworkerProject & {
  active: boolean;
  repositoryName: string;
  repositoryUrl: string;
  status: string;
  updatedAt: string;
};

export type MobileRepository = {
  id: string;
  name: string;
  provider: "github" | "private-git";
  status: "active" | "inactive";
};

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export class ProjectClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  async overview() {
    const [projects, repositories] = await Promise.all([
      this.request<MobileProject[]>("/api/devkit/admin/project-manager/project"),
      this.request<MobileRepository[]>("/api/devkit/project-manager/repositories")
    ]);
    return { projects, repositories };
  }

  connect(repository: MobileRepository) {
    return this.request<MobileProject>("/api/devkit/admin/project-manager/project", {
      body: JSON.stringify({
        description: `${providerLabel(repository.provider)} repository`,
        key: repository.name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
        moduleKey: "project-manager",
        repositoryName: repository.name,
        status: "active",
        title: repository.name,
        type: "project"
      }),
      method: "POST"
    });
  }

  create(title: string, repositoryUrl: string) {
    return this.request<MobileProject>("/api/devkit/admin/project-manager/project", {
      body: JSON.stringify({
        description: "Project workspace",
        key: title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
        moduleKey: "project-manager",
        repositoryName: repositoryNameFromUrl(repositoryUrl),
        repositoryUrl: repositoryUrl.trim(),
        status: "planning",
        title,
        type: "project"
      }),
      method: "POST"
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

export function providerLabel(provider: MobileRepository["provider"]) {
  return provider === "github" ? "GitHub" : "Private Git";
}

function repositoryNameFromUrl(value: string) {
  return value.trim().replace(/[\\/]+$/u, "").split(/[\\/:]/u).filter(Boolean).at(-1)?.replace(/\.git$/iu, "") ?? "";
}
