export type GithubProjectState = {
  ahead: number | null;
  behind: number | null;
  branch: string;
  changedFiles: number;
  error: string | null;
  githubUrl: string | null;
  lastCommitAt: string | null;
  lastCommitSubject: string | null;
  name: string;
  repositorySlug: string | null;
  revision: string | null;
  status: "attention" | "changed" | "healthy" | "unavailable";
  upstream: string | null;
};

export type GithubDashboard = {
  generatedAt: string;
  projects: GithubProjectState[];
};

export type GithubProjectDetails = GithubProjectState & {
  changedFileNames: string[];
  changelogVersion: string | null;
  packageDescription: string | null;
  packageName: string | null;
  packageVersion: string | null;
  remoteRevision: string | null;
};
