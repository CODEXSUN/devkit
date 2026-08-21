import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { AppError } from "@codexsun/framework/errors";
import type { CodexMcpServerList } from "./codex-app-server.client.js";
import { codexAppServer } from "./codex-connector.pool.js";
import {
  HOSTINGER_MCP_SERVER_NAME,
  hostingerApiToken,
  hostingerMcpCommand,
  hostingerMcpPackage,
  resolveDevkitCodexHome
} from "./hostinger-mcp.config.js";

const START_MARKER = "# BEGIN CODELOGICX HOSTINGER VPS MCP";
const END_MARKER = "# END CODELOGICX HOSTINGER VPS MCP";

export type HostingerMcpStatus = {
  configured: boolean;
  connected: boolean;
  error: string | null;
  packageName: string;
  serverName: string;
  tokenConfigured: boolean;
  toolCount: number | null;
};

export class HostingerMcpService {
  async status(): Promise<HostingerMcpStatus> {
    const configured = this.hasManagedConfiguration();
    const tokenConfigured = Boolean(hostingerApiToken());
    if (!configured) return this.response({ configured, tokenConfigured });

    try {
      const server = findHostingerServer(await codexAppServer.listMcpServers());
      return this.response({
        configured,
        tokenConfigured,
        connected: isConnected(server),
        error: serverError(server),
        toolCount: serverToolCount(server)
      });
    } catch (error) {
      return this.response({
        configured,
        tokenConfigured,
        error: error instanceof Error ? error.message : "Hostinger MCP status is unavailable."
      });
    }
  }

  async configure(): Promise<HostingerMcpStatus> {
    if (!hostingerApiToken()) {
      throw AppError.validation(
        "Set HOSTINGER_API_TOKEN in the server .env before connecting Hostinger."
      );
    }
    this.writeManagedConfiguration();
    await codexAppServer.reloadMcpServers();
    return this.status();
  }

  async saveToken(token: string): Promise<HostingerMcpStatus> {
    writeEnvironmentValue(environmentPath(), "HOSTINGER_API_TOKEN", token);
    process.env.HOSTINGER_API_TOKEN = token;
    return this.configure();
  }

  private response(input: Partial<HostingerMcpStatus>): HostingerMcpStatus {
    return {
      configured: input.configured ?? false,
      connected: input.connected ?? false,
      error: input.error ?? null,
      packageName: hostingerMcpPackage(),
      serverName: HOSTINGER_MCP_SERVER_NAME,
      tokenConfigured: input.tokenConfigured ?? false,
      toolCount: input.toolCount ?? null
    };
  }

  private hasManagedConfiguration() {
    const path = configPath();
    return existsSync(path) && readFileSync(path, "utf8").includes(START_MARKER);
  }

  private writeManagedConfiguration() {
    const path = configPath();
    mkdirSync(resolveDevkitCodexHome(), { recursive: true });
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    const withoutManagedBlock = removeManagedBlock(current).trimEnd();
    const next = [withoutManagedBlock, managedConfiguration()].filter(Boolean).join("\n\n");
    writeFileSync(path, `${next}\n`, { encoding: "utf8", mode: 0o600 });
  }
}

function managedConfiguration() {
  return [
    START_MARKER,
    `[mcp_servers.${HOSTINGER_MCP_SERVER_NAME}]`,
    `command = ${tomlString(hostingerMcpCommand())}`,
    `args = ["--yes", "--package=${escapeToml(hostingerMcpPackage())}", "hostinger-vps-mcp"]`,
    'env_vars = ["HOSTINGER_API_TOKEN"]',
    'default_tools_approval_mode = "writes"',
    "startup_timeout_sec = 60",
    "tool_timeout_sec = 120",
    "enabled = true",
    END_MARKER
  ].join("\n");
}

function removeManagedBlock(value: string) {
  const start = value.indexOf(START_MARKER);
  if (start < 0) return value;
  const end = value.indexOf(END_MARKER, start);
  if (end < 0) return value.slice(0, start);
  return `${value.slice(0, start)}${value.slice(end + END_MARKER.length)}`;
}

function findHostingerServer(result: CodexMcpServerList): unknown {
  const entries = result.data ?? result.items ?? [];
  return entries.find((entry) => serverName(entry) === HOSTINGER_MCP_SERVER_NAME);
}

function serverName(value: unknown) {
  if (!isRecord(value)) return null;
  return typeof value.name === "string"
    ? value.name
    : typeof value.serverName === "string"
      ? value.serverName
      : null;
}

function isConnected(value: unknown) {
  if (!isRecord(value)) return false;
  const status = typeof value.status === "string" ? value.status.toLowerCase() : "";
  return (
    status === "connected" ||
    status === "ready" ||
    status === "initialized" ||
    Array.isArray(value.tools)
  );
}

function serverError(value: unknown) {
  if (!isRecord(value)) return null;
  if (typeof value.error === "string") return value.error;
  return typeof value.failureReason === "string" ? value.failureReason : null;
}

function serverToolCount(value: unknown) {
  if (!isRecord(value)) return null;
  return Array.isArray(value.tools) ? value.tools.length : null;
}

function configPath() {
  return `${resolveDevkitCodexHome()}/config.toml`;
}

function environmentPath() {
  const configured = process.env.DEVKIT_ENV_FILE_PATH?.trim();
  if (configured) return resolve(configured);

  let directory = resolve(process.cwd());
  const root = parse(directory).root;
  while (true) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) return candidate;
    if (directory === root) {
      throw AppError.validation("The server .env file is unavailable or not writable.");
    }
    directory = dirname(directory);
  }
}

function writeEnvironmentValue(path: string, key: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "mu");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : [current.trimEnd(), line].filter(Boolean).join("\n");
  writeFileSync(path, `${next}\n`, { encoding: "utf8", mode: 0o600 });
}

function tomlString(value: string) {
  return `"${escapeToml(value)}"`;
}

function escapeToml(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const hostingerMcpService = new HostingerMcpService();
