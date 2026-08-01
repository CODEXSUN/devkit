import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { AppError } from "@codexsun/framework/errors";
import type {
  GithubDashboard,
  GithubProjectDetails,
  GithubProjectState,
} from "./github-dashboard.types.js";

const ignoredDirectories = new Set([".git", ".orbit", "dist", "node_modules"]);

export class GithubDashboardService {
  dashboard(): GithubDashboard {
    const workspaceRoot = configuredWorkspaceRoot();
    return {
      generatedAt: new Date().toISOString(),
      projects: discoverRepositories(workspaceRoot)
        .map((path) => readProject(path))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  project(projectName: string): GithubProjectDetails {
    const projectPath = discoverRepositories(configuredWorkspaceRoot()).find(
      (path) => repositoryName(path) === projectName,
    );
    if (!projectPath)
      throw AppError.notFound("GitHub dashboard project was not found.");
    const state = readProject(projectPath);
    const packageDetails = readPackageDetails(projectPath);
    const changedFileNames =
      optionalGit(projectPath, ["status", "--porcelain"])
        ?.split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => line.slice(3).trim()) ?? [];
    return {
      ...state,
      changedFileNames,
      changelogVersion: readChangelogVersion(projectPath),
      packageDescription: packageDetails.description,
      packageName: packageDetails.name,
      packageVersion: packageDetails.version,
      remoteRevision: state.upstream
        ? optionalGit(projectPath, ["rev-parse", "--short", state.upstream])
        : null,
    };
  }
}

function configuredWorkspaceRoot(): string {
  const value = process.env.DEVKIT_WORKSPACE_ROOT?.trim();
  if (!value)
    throw new Error(
      "DEVKIT_WORKSPACE_ROOT is required for the GitHub dashboard.",
    );
  return resolve(process.cwd(), value);
}

function discoverRepositories(workspaceRoot: string): string[] {
  const repositories: string[] = [];
  for (const entry of readdirSync(workspaceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) continue;
    const path = resolve(workspaceRoot, entry.name);
    try {
      if (readdirSync(path).includes(".git")) repositories.push(path);
    } catch {
      // One inaccessible project must not hide the remaining workspace.
    }
  }
  return repositories;
}

function readProject(path: string): GithubProjectState {
  const name = repositoryName(path);
  try {
    const branch = git(path, ["branch", "--show-current"]);
    const upstream = optionalGit(path, [
      "rev-parse",
      "--abbrev-ref",
      "@{upstream}",
    ]);
    const divergence = upstream
      ? optionalGit(path, [
          "rev-list",
          "--left-right",
          "--count",
          `HEAD...${upstream}`,
        ])
      : null;
    const [ahead, behind] = divergence
      ? divergence.split(/\s+/u).map((value) => Number(value))
      : [null, null];
    const remote = optionalGit(path, ["remote", "get-url", "origin"]);
    const remoteDetails = githubRemote(remote);
    const changedFiles = git(path, ["status", "--porcelain"])
      .split(/\r?\n/u)
      .filter(Boolean).length;
    const lastCommit = git(path, ["log", "-1", "--format=%cI%x00%s"]).split(
      "\u0000",
    );
    return {
      ahead: ahead ?? null,
      behind: behind ?? null,
      branch,
      changedFiles,
      error: null,
      githubUrl: remoteDetails.url,
      lastCommitAt: lastCommit[0] || null,
      lastCommitSubject: lastCommit[1] || null,
      name,
      repositorySlug: remoteDetails.slug,
      revision: git(path, ["rev-parse", "--short", "HEAD"]),
      status:
        (ahead ?? 0) > 0 && (behind ?? 0) > 0
          ? "attention"
          : changedFiles > 0
            ? "changed"
            : "healthy",
      upstream,
    };
  } catch {
    return {
      ahead: null,
      behind: null,
      branch: "",
      changedFiles: 0,
      error: "Git metadata is unavailable.",
      githubUrl: null,
      lastCommitAt: null,
      lastCommitSubject: null,
      name,
      repositorySlug: null,
      revision: null,
      status: "unavailable",
      upstream: null,
    };
  }
}

function repositoryName(path: string): string {
  return path.split(/[\\/]/u).at(-1) ?? path;
}

function readPackageDetails(path: string): {
  description: string | null;
  name: string | null;
  version: string | null;
} {
  const packagePath = resolve(path, "package.json");
  if (!existsSync(packagePath))
    return { description: null, name: null, version: null };
  try {
    const value = JSON.parse(readFileSync(packagePath, "utf8")) as Record<
      string,
      unknown
    >;
    return {
      description:
        typeof value.description === "string" ? value.description : null,
      name: typeof value.name === "string" ? value.name : null,
      version: typeof value.version === "string" ? value.version : null,
    };
  } catch {
    return { description: null, name: null, version: null };
  }
}

function readChangelogVersion(path: string): string | null {
  for (const changelogPath of [
    resolve(path, "assist", "documentation", "CHANGELOG.md"),
    resolve(path, "CHANGELOG.md"),
  ]) {
    if (!existsSync(changelogPath)) continue;
    const source = readFileSync(changelogPath, "utf8");
    const current = /Current version:\s*([^\r\n]+)/iu.exec(source)?.[1]?.trim();
    if (current) return current;
    const heading = /^##\s+v-?([^\s]+)/imu.exec(source)?.[1]?.trim();
    if (heading) return heading;
  }
  return null;
}

function git(path: string, args: string[]): string {
  if (!isAbsolute(path))
    throw new Error("GitHub dashboard repository path must be absolute.");
  return execFileSync("git", ["-C", path, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
    windowsHide: true,
  }).trimEnd();
}

function optionalGit(path: string, args: string[]): string | null {
  try {
    return git(path, args) || null;
  } catch {
    return null;
  }
}

function githubRemote(value: string | null): {
  slug: string | null;
  url: string | null;
} {
  if (!value) return { slug: null, url: null };
  const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/iu.exec(value);
  if (!match) return { slug: null, url: null };
  const slug = `${match[1]}/${match[2]}`;
  return { slug, url: `https://github.com/${slug}` };
}
