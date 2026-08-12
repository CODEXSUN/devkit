import { join } from "node:path";

export const HOSTINGER_MCP_SERVER_NAME = "hostinger-vps";

export function hostingerMcpCommand() {
  return (
    process.env.HOSTINGER_MCP_COMMAND?.trim() || (process.platform === "win32" ? "npx.cmd" : "npx")
  );
}

export function hostingerMcpPackage() {
  return process.env.HOSTINGER_MCP_PACKAGE?.trim() || "hostinger-api-mcp@1.33.1";
}

export function hostingerApiToken() {
  return process.env.HOSTINGER_API_TOKEN?.trim() || "";
}

export function resolveDevkitCodexHome() {
  const configured = process.env.DEVKIT_CODEX_HOME?.trim();
  if (configured) return configured;
  const applicationData = process.env.LOCALAPPDATA?.trim() || process.cwd();
  return join(applicationData, "CodeLogicX", "DevKit", "codex");
}
