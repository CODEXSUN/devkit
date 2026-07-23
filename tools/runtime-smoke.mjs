#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createConnection } from "mysql2/promise";

const root = resolve(import.meta.dirname, "..");
const jwtSecret = "devkit-runtime-smoke-secret-at-least-32-characters";
const runtimeDatabaseName = `devkit_test_${process.pid}_${Date.now()}`;
const databaseEnv = resolveDatabaseEnv();
const platformServer = createFakePlatformAuthServer();
await listen(platformServer);
const platformAddress = platformServer.address();
if (!platformAddress || typeof platformAddress === "string") {
  throw new Error("Fake Platform auth server did not expose a TCP port.");
}

const child = spawn(process.execPath, ["tools/dev-stack.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    ...databaseEnv,
    DEVKIT_DB_NAME: runtimeDatabaseName,
    JWT_SECRET: jwtSecret,
    PLATFORM_API_URL: `http://127.0.0.1:${platformAddress.port}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += String(chunk);
  process.stdout.write(chunk);
});
child.stderr.on("data", (chunk) => {
  output += String(chunk);
  process.stderr.write(chunk);
});

try {
  await waitForUrl("http://127.0.0.1:7030/health", "Devkit API", 90_000);
  await waitForUrl("http://127.0.0.1:7040/sa/login", "Devkit Web", 30_000);

  const health = await getJson("http://127.0.0.1:7030/health");
  const unauthorized = await fetch(
    "http://127.0.0.1:7030/admin/project-manager/result",
  );
  const saToken = await login("sa", "sa@codexsun.test");
  const adminToken = await login("admin", "admin@codexsun.test");
  const projects = await getJson(
    "http://127.0.0.1:7030/admin/project-manager/result",
    saToken,
  );
  const tasks = await getJson(
    "http://127.0.0.1:7030/task-manager/todos",
    adminToken,
  );
  const saSession = await getJson(
    "http://127.0.0.1:7030/auth/platform/session",
    saToken,
  );
  const adminSession = await getJson(
    "http://127.0.0.1:7030/auth/platform/session",
    adminToken,
  );
  const pages = await Promise.all([
    fetch("http://127.0.0.1:7040/sa/login"),
    fetch("http://127.0.0.1:7040/admin/login"),
    fetch("http://127.0.0.1:7040/sa"),
    fetch("http://127.0.0.1:7040/admin"),
  ]);

  assertObject(health, "health response");
  if (unauthorized.status !== 401) {
    throw new Error(
      `Protected Devkit API returned ${unauthorized.status} without a token.`,
    );
  }
  assertEnvelope(projects, "project manager response");
  assertEnvelope(tasks, "task manager response");
  assertEnvelope(saSession, "super admin session response");
  assertEnvelope(adminSession, "staff admin session response");
  const createdTodo = await sendJsonRequest(
    "http://127.0.0.1:7030/task-manager/todos",
    "POST",
    { title: "Runtime database persistence" },
    adminToken,
  );
  assertEnvelope(createdTodo, "created todo response");
  const createdIssue = await sendJsonRequest(
    "http://127.0.0.1:7030/admin/project-manager/issue",
    "POST",
    {
      key: `runtime.database.${Date.now()}`,
      title: "Runtime database persistence",
    },
    saToken,
  );
  assertEnvelope(createdIssue, "created project response");
  await assertDatabaseWrites();
  await sendJsonRequest(
    `http://127.0.0.1:7030/task-manager/todos/${createdTodo.data.id}`,
    "DELETE",
    undefined,
    adminToken,
  );
  await sendJsonRequest(
    `http://127.0.0.1:7030/admin/project-manager/issue/${createdIssue.data.id}`,
    "DELETE",
    undefined,
    saToken,
  );
  if (pages.some((response) => !response.ok)) {
    throw new Error(
      `Devkit Web auth routes failed: ${pages.map((page) => page.status).join(", ")}`,
    );
  }

  console.log(
    "\nRuntime smoke passed: devkit_db migrations/imports, SQL writes/audits, Platform auth, API guards, and Web routes.",
  );
} catch (error) {
  console.error("\nRuntime smoke failed.");
  if (output.trim()) console.error(output.trim());
  throw error;
} finally {
  stopProcessTree(child);
  await closeServer(platformServer);
  await dropRuntimeDatabase();
}

async function login(desk, email) {
  const response = await fetch("http://127.0.0.1:7030/auth/platform/login", {
    body: JSON.stringify({ desk, email, password: "test-password" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const envelope = await response.json();
  assertEnvelope(envelope, `${desk} login response`);
  if (typeof envelope.data.accessToken !== "string") {
    throw new Error(`${desk} login response did not contain an access token.`);
  }
  return envelope.data.accessToken;
}

async function waitForUrl(url, label, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`${label} launcher exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${label} did not become ready: ${lastStatus}`);
}

async function getJson(url, token) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.json();
}

async function sendJsonRequest(url, method, body, token) {
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
    signal: AbortSignal.timeout(5_000),
  });
  const value = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${url} returned HTTP ${response.status}.`);
  }
  return value;
}

async function assertDatabaseWrites() {
  const connection = await createConnection({
    database: runtimeDatabaseName,
    host: databaseEnv.DB_HOST,
    password: databaseEnv.DB_PASSWORD,
    port: Number(databaseEnv.DB_PORT),
    user: databaseEnv.DB_USER,
  });
  try {
    const [rows] = await connection.query(
      "SELECT (SELECT COUNT(*) FROM task_manager_activity) AS task_activity, (SELECT COUNT(*) FROM project_manager_activity) AS project_activity",
    );
    const result = Array.isArray(rows) ? rows[0] : null;
    if (
      !result ||
      Number(result.task_activity) < 1 ||
      Number(result.project_activity) < 1
    ) {
      throw new Error("DevKit database writes were not audited.");
    }
  } finally {
    await connection.end();
  }
}

function createFakePlatformAuthServer() {
  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { data: { status: "ok" }, success: true });
      return;
    }

    if (request.method === "POST" && request.url === "/auth/login") {
      const body = JSON.parse(await readBody(request));
      const userType =
        body.desk === "sa"
          ? "super_admin"
          : body.desk === "admin"
            ? "staff"
            : null;
      const expectedEmail =
        body.desk === "sa" ? "sa@codexsun.test" : "admin@codexsun.test";
      if (
        !userType ||
        body.email !== expectedEmail ||
        body.password !== "test-password"
      ) {
        sendJson(response, 401, {
          error: {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
          success: false,
        });
        return;
      }

      sendJson(response, 200, {
        data: {
          accessToken: signToken({ email: body.email, userType }),
          email: body.email,
          name: userType === "super_admin" ? "Super Admin" : "Staff Admin",
          userType,
        },
        success: true,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/auth/logout") {
      sendJson(response, 200, { data: { loggedOut: true }, success: true });
      return;
    }

    sendJson(response, 404, {
      error: { code: "NOT_FOUND", message: "Not found." },
      success: false,
    });
  });
}

function signToken({ email, userType }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      aud: "codexsun-platform",
      email,
      exp: now + 3600,
      iat: now,
      iss: "codexsun-platform-api",
      jti: randomUUID(),
      name: userType === "super_admin" ? "Super Admin" : "Staff Admin",
      sessionIssuedAt: new Date(now * 1000).toISOString(),
      userId: email,
      userType,
    }),
  );
  const signature = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

function listen(server) {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an object.`);
  }
}

function assertEnvelope(value, label) {
  assertObject(value, label);
  if (value.success !== true || !("data" in value)) {
    throw new Error(`${label} is not a successful API envelope.`);
  }
}

function stopProcessTree(processToStop) {
  if (processToStop.killed || !processToStop.pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync(
        "taskkill",
        ["/PID", String(processToStop.pid), "/T", "/F"],
        {
          stdio: "ignore",
        },
      );
      return;
    } catch {
      // Fall through to the portable signal path.
    }
  }
  processToStop.kill("SIGTERM");
}

function resolveDatabaseEnv() {
  const devkitEnv = loadDotEnv(resolve(root, ".env"));
  const platformEnv = loadDotEnv(resolve(root, "../codexsun/.env"));
  const merged = { ...platformEnv, ...devkitEnv, ...process.env };
  return {
    DB_HOST: merged.DB_HOST || "127.0.0.1",
    DB_PASSWORD: merged.DB_PASSWORD || "",
    DB_PORT: merged.DB_PORT || "3306",
    DB_USER: merged.DB_USER || "root",
  };
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

async function dropRuntimeDatabase() {
  if (!/^devkit_test_\d+_\d+$/u.test(runtimeDatabaseName)) {
    throw new Error(`Refusing to drop unexpected database ${runtimeDatabaseName}.`);
  }
  const connection = await createConnection({
    host: databaseEnv.DB_HOST,
    password: databaseEnv.DB_PASSWORD,
    port: Number(databaseEnv.DB_PORT),
    user: databaseEnv.DB_USER,
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${runtimeDatabaseName}\``);
  } finally {
    await connection.end();
  }
}
