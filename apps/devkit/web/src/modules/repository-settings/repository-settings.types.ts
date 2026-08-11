export type RepositoryConnection = {
  baseUrl: string;
  id: string;
  name: string;
  provider: "github" | "private-git";
  repositorySlug: string;
  status: "active" | "inactive";
};

export type DeveloperRepository = Pick<RepositoryConnection, "id" | "name" | "provider" | "status">;

export type RepositoryConnectionInput = Omit<RepositoryConnection, "id">;
