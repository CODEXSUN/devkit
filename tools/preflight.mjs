#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

const root = resolve(import.meta.dirname, "..");
const app = process.argv[2];
const apps = {
  "devkit-api": {
    cwd: "api",
    displayName: "api",
    envKey: "DEVKIT_API_PORT",
    fallbackPort: 7030,
    args: [nodePackageBin("tsx", "dist/cli.mjs"), "watch", "src/server.ts"],
  },
  "devkit-web": {
    cwd: "web",
    displayName: "web",
    envKey: "DEVKIT_WEB_PORT",
    fallbackPort: 7040,
    args: [nodePackageBin("vite", "bin/vite.js"), "--strictPort"],
  },
};

if (!app || !apps[app]) {
  console.error(
    `Usage: node tools/preflight.mjs <${Object.keys(apps).join("|")}>`,
  );
  process.exit(1);
}

const config = apps[app];
const fileEnv = loadDotEnv(resolve(root, ".env"));
const platformFileEnv = loadDotEnv(resolve(root, "../codexsun/.env"));
const platformFallbackEnv = Object.fromEntries(
  ["DB_HOST", "DB_PASSWORD", "DB_PORT", "DB_USER"]
    .filter((key) => platformFileEnv[key] !== undefined)
    .map((key) => [key, platformFileEnv[key]]),
);
const runtimeEnv = {
  ...platformFallbackEnv,
  ...fileEnv,
  ...process.env,
};
const port = parsePort(runtimeEnv[config.envKey] || config.fallbackPort);
const host = "127.0.0.1";

ensureSiblingPackage("@codexsun/framework", "../framework");
ensureSiblingPackage("@codexsun/ui", "../ui");

if (app === "devkit-api") {
  ensureLinkedPackageBuild("@codexsun/framework", "../framework");
  if (!runtimeEnv.DB_HOST || !runtimeEnv.DB_USER) {
    console.error("  x Missing DevKit database connection settings.");
    process.exit(1);
  }
}

if (app === "devkit-web") {
  await waitForApi(runtimeEnv.DEVKIT_API_URL || "http://127.0.0.1:7030");
}

await ensurePortAvailable(port, host);

const child = spawn(
  process.execPath,
  [
    ...config.args,
    ...(app === "devkit-web" ? ["--host", host, "--port", String(port)] : []),
  ],
  {
    cwd: resolve(root, config.cwd),
    env: { ...runtimeEnv, [config.envKey]: String(port) },
    stdio: "inherit",
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => stopChild(child, signal));
}

function loadDotEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  );
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/u, "").trim();
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    console.error(`  x Invalid ${config.envKey}: ${value}`);
    process.exit(1);
  }
  return port;
}

function ensureSiblingPackage(packageName, relativePath) {
  const packageRoot = resolve(root, relativePath);
  const manifestPath = resolve(packageRoot, "package.json");
  const linkedPath = resolve(root, "node_modules", ...packageName.split("/"));
  if (!existsSync(manifestPath) || !existsSync(linkedPath)) {
    console.error(`  x Missing ${packageName}. Run npm install from ${root}.`);
    process.exit(1);
  }
}

function ensureLinkedPackageBuild(packageName, relativePath) {
  const packageRoot = resolve(root, relativePath);
  const sourcePath = join(packageRoot, "src");
  const distPath = join(packageRoot, "dist");
  const sourceTime = newestMtime([
    sourcePath,
    join(packageRoot, "package.json"),
    join(packageRoot, "tsconfig.json"),
  ]);
  const distTime = newestMtime([distPath]);

  if (distTime >= sourceTime && distTime > 0) {
    console.log(`  ok ${packageName} build is current`);
    return;
  }

  const reason = distTime === 0 ? "dist missing" : "source changed";
  console.log(`  build ${packageName} (${reason})`);
  runNpm(["run", "build", "--prefix", packageRoot]);
  console.log(`  ok ${packageName} build is current`);
}

function newestMtime(paths) {
  let newest = 0;
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const stat = statSync(path);
    newest = Math.max(newest, stat.mtimeMs);
    if (!stat.isDirectory()) continue;

    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".turbo" ||
        entry.name === "dist"
      ) {
        continue;
      }
      newest = Math.max(newest, newestMtime([join(path, entry.name)]));
    }
  }
  return newest;
}

function runNpm(args) {
  if (process.env.npm_execpath) {
    execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root,
      stdio: "inherit",
    });
    return;
  }

  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", ["npm", ...args].join(" ")],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    return;
  }

  execFileSync("npm", args, { cwd: root, stdio: "inherit" });
}

async function waitForApi(apiUrl) {
  const healthUrl = `${String(apiUrl).replace(/\/$/u, "")}/health`;
  const startedAt = Date.now();
  let lastStatus = "not reachable";
  console.log(`\n  - Waiting for Devkit API at ${healthUrl}`);

  while (Date.now() - startedAt < 90_000) {
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(2_000),
      });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) {
        console.log("  ok Devkit API is ready");
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x Devkit API did not become healthy: ${lastStatus}`);
  process.exit(1);
}

async function ensurePortAvailable(port, host) {
  console.log(`\n  > ${config.displayName} preflight`);
  if (await canListen(port, host)) {
    console.log(`  ok ${host}:${port} is ready\n`);
    return;
  }

  console.error(`  x ${host}:${port} is already in use.`);
  console.error(`  x Stop the existing process or change ${config.envKey}.\n`);
  process.exit(1);
}

function canListen(port, host) {
  return new Promise((resolveListen) => {
    const server = createServer();
    server.once("error", () => resolveListen(false));
    server.once("listening", () =>
      server.close((error) => resolveListen(!error)),
    );
    server.listen(port, host);
  });
}

function stopChild(child, signal) {
  if (child.killed || !child.pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      return;
    } catch {
      // Fall through to the portable signal path.
    }
  }
  child.kill(signal);
}

function nodePackageBin(packageName, binPath) {
  return resolve(root, "node_modules", packageName, binPath);
}
