#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const platformRoot = resolve(root, "../codexsun");
const platformApiUrl = (
  process.env.PLATFORM_API_URL || "http://127.0.0.1:7010"
).replace(/\/$/u, "");
const devkitApiUrl = (
  process.env.DEVKIT_API_URL ||
  `http://127.0.0.1:${process.env.DEVKIT_API_PORT || "7030"}`
).replace(/\/$/u, "");
const devkitWebUrl = (
  process.env.DEVKIT_WEB_ORIGIN ||
  `http://127.0.0.1:${process.env.DEVKIT_WEB_PORT || "7040"}`
).replace(/\/$/u, "");
const services = {
  "platform-auth": {
    args: ["tools/preflight.mjs", "platform-api"],
    color: "\x1b[35m",
    cwd: platformRoot,
    label: "auth",
  },
  "devkit-api": {
    args: ["tools/preflight.mjs", "devkit-api"],
    color: "\x1b[36m",
    cwd: root,
    label: "api",
  },
  "devkit-web": {
    args: ["tools/preflight.mjs", "devkit-web"],
    color: "\x1b[32m",
    cwd: root,
    label: "web",
  },
};
const reset = "\x1b[0m";
const children = new Set();
let stopping = false;

process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") {
    stopChildren();
    process.exit(0);
  }
  throw error;
});

console.log("\nCODEXSUN Devkit runtime");
await startStack();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopChildren();
    process.exit(0);
  });
}

function startService(serviceName) {
  const service = services[serviceName];
  const child = spawn(process.execPath, service.args, {
    cwd: service.cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  child.stdout.on("data", (chunk) => writeServiceLines(service, chunk));
  child.stderr.on("data", (chunk) => writeServiceLines(service, chunk));
  child.on("exit", (code) => {
    children.delete(child);
    if (stopping) return;

    const exitCode = code ?? 1;
    console.error(
      `${service.color}[${service.label}]${reset} exited with code ${exitCode}`,
    );
    stopChildren(child);
    process.exit(exitCode || 1);
  });

  return child;
}

async function startStack() {
  if (await isHealthyUrl(`${platformApiUrl}/health`)) {
    console.log(`  ok Platform auth is available at ${platformApiUrl}`);
  } else {
    console.log(`  - ${services["platform-auth"].label}`);
    startService("platform-auth");
    await waitForHealthyUrl(
      `${platformApiUrl}/health`,
      "Platform auth API",
      90_000,
    );
  }

  console.log(`  - ${services["devkit-api"].label}`);
  startService("devkit-api");
  await waitForHealthyUrl(`${devkitApiUrl}/health`, "Devkit API", 90_000);

  console.log(`  - ${services["devkit-web"].label}`);
  startService("devkit-web");
  await waitForHealthyUrl(`${devkitWebUrl}/`, "Devkit Web", 30_000);
  console.log("  ok Devkit API and Web are ready\n");
  monitorStackHealth();
}

async function waitForHealthyUrl(url, label, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x ${label} did not become healthy: ${lastStatus}`);
  stopChildren();
  process.exit(1);
}

function monitorStackHealth() {
  const targets = [
    {
      failures: 0,
      label: "Platform auth API",
      url: `${platformApiUrl}/health`,
    },
    { failures: 0, label: "Devkit API", url: `${devkitApiUrl}/health` },
    { failures: 0, label: "Devkit Web", url: `${devkitWebUrl}/` },
  ];
  let checking = false;

  setInterval(async () => {
    if (checking || stopping) return;
    checking = true;

    try {
      for (const target of targets) {
        try {
          const response = await fetch(target.url, {
            signal: AbortSignal.timeout(2_000),
          });
          target.failures = response.ok ? 0 : target.failures + 1;
        } catch {
          target.failures += 1;
        }

        if (target.failures >= 3) {
          console.error(
            `  x ${target.label} became unavailable; stopping Devkit runtime`,
          );
          stopChildren();
          process.exit(1);
        }
      }
    } finally {
      checking = false;
    }
  }, 2_000);
}

async function isHealthyUrl(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

function writeServiceLines(service, chunk) {
  for (const rawLine of String(chunk).split(/\r?\n/u)) {
    const line = rawLine.replace(/\u001b\[[0-9;]*m/gu, "").trim();
    if (line)
      process.stdout.write(
        `${service.color}[${service.label}]${reset} ${line}\n`,
      );
  }
}

function stopChildren(skipChild) {
  stopping = true;
  for (const child of children) {
    if (child === skipChild || child.killed || !child.pid) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      child.kill("SIGTERM");
    }
  }
}
