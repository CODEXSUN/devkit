import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { AppError } from "@codexsun/framework/errors";
import { resolveCodexCommand, resolveDevkitCodexHome } from "./codex-app-server.client.js";
import { codexConnectorPool } from "./codex-connector.pool.js";

const execute = promisify(execFile);

export class CodexRuntimeService {
  async update() {
    const before = await version();
    const runtime = join(resolveDevkitCodexHome("primary"), "runtime");
    await mkdir(runtime, { recursive: true });
    await codexConnectorPool.stopAll();
    try {
      await execute(npmExecutable(), ["install", "--prefix", runtime, "--no-audit", "--no-fund", "--save=false", "@openai/codex@latest"], { timeout: 180_000, windowsHide: true });
    } catch (error) {
      throw new AppError({ code: "CODEX_UPDATE_FAILED", message: error instanceof Error ? error.message : "Codex update failed.", statusCode: 502 });
    }
    const current = await version();
    return { before, current, updated: before !== current };
  }
}

async function version() {
  const command = resolveCodexCommand(["--version"]);
  const result = await execute(command.executable, command.args, { timeout: 15_000, windowsHide: true });
  return result.stdout.trim();
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export const codexRuntimeService = new CodexRuntimeService();
