#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createConnection } from "mysql2/promise";

const root = resolve(import.meta.dirname, "..");
const jwtSecret = "devkit-runtime-smoke-secret-at-least-32-characters";
const runtimeDatabaseName = `devkit_test_${process.pid}_${Date.now()}`;
const runtimeStoragePath = mkdtempSync(
  join(tmpdir(), "codexsun-devkit-attachments-"),
);
const databaseEnv = resolveDatabaseEnv();
const apiPort = await findAvailablePort();
const webPort = await findAvailablePort();
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
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
    DEVKIT_API_PORT: String(apiPort),
    DEVKIT_API_URL: apiUrl,
    DEVKIT_DB_NAME: runtimeDatabaseName,
    DEVKIT_STORAGE_PATH: runtimeStoragePath,
    DEVKIT_WEB_ORIGIN: webUrl,
    DEVKIT_WEB_PORT: String(webPort),
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
  await waitForUrl(`${apiUrl}/health`, "Devkit API", 90_000);
  await waitForUrl(`${webUrl}/dev/login`, "Devkit Web", 30_000);

  const health = await getJson(`${apiUrl}/health`);
  const unauthorized = await fetch(`${apiUrl}/admin/project-manager/result`);
  const devToken = await login("dev", "sa@codexsun.test");
  const removedAdminLogin = await fetch(`${apiUrl}/auth/platform/login`, {
    body: JSON.stringify({
      desk: "admin",
      email: "admin@codexsun.test",
      password: "test-password",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const projects = await getJson(
    `${apiUrl}/admin/project-manager/result`,
    devToken,
  );
  const tasks = await getJson(`${apiUrl}/task-manager/todos`, devToken);
  const devSession = await getJson(`${apiUrl}/auth/platform/session`, devToken);
  const pages = await Promise.all([
    fetch(`${webUrl}/dev/login`),
    fetch(`${webUrl}/dev`),
    fetch(`${webUrl}/dev/roadmap`),
    fetch(`${webUrl}/dev/projects`),
  ]);

  assertObject(health, "health response");
  if (unauthorized.status !== 401) {
    throw new Error(
      `Protected Devkit API returned ${unauthorized.status} without a token.`,
    );
  }
  if (removedAdminLogin.status !== 400) {
    throw new Error(
      `Removed admin desk login returned ${removedAdminLogin.status} instead of 400.`,
    );
  }
  assertEnvelope(projects, "project manager response");
  assertEnvelope(tasks, "task manager response");
  assertEnvelope(devSession, "developer session response");
  const createdTodo = await sendJsonRequest(
    `${apiUrl}/task-manager/todos`,
    "POST",
    { title: "Runtime database persistence" },
    devToken,
  );
  assertEnvelope(createdTodo, "created todo response");
  const createdIssue = await sendJsonRequest(
    `${apiUrl}/admin/project-manager/issue`,
    "POST",
    {
      key: `runtime.database.${Date.now()}`,
      title: "Runtime database persistence",
    },
    devToken,
  );
  assertEnvelope(createdIssue, "created project response");
  const attachment = await sendBinaryRequest(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments`,
    Buffer.from("Runtime attachment persistence", "utf8"),
    "runtime-evidence.txt",
    "text/plain",
    devToken,
  );
  assertEnvelope(attachment, "created attachment response");
  if ("storageKey" in attachment.data) {
    throw new Error("Attachment responses exposed a private storage key.");
  }
  const attachments = await getJson(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments`,
    devToken,
  );
  assertEnvelope(attachments, "attachment list response");
  if (
    !Array.isArray(attachments.data) ||
    attachments.data.length !== 1 ||
    attachments.data[0].originalName !== "runtime-evidence.txt" ||
    "storageKey" in attachments.data[0]
  ) {
    throw new Error("Runtime attachment metadata was not persisted.");
  }
  const attachmentDownload = await fetch(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments/${attachment.data.id}/download`,
    { headers: { Authorization: `Bearer ${devToken}` } },
  );
  if (
    !attachmentDownload.ok ||
    (await attachmentDownload.text()) !== "Runtime attachment persistence"
  ) {
    throw new Error("Runtime attachment content could not be downloaded.");
  }
  const rejectedType = await sendBinaryResponse(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments`,
    Buffer.from("<svg></svg>", "utf8"),
    "unsafe.svg",
    "image/svg+xml",
    devToken,
  );
  if (rejectedType.status !== 400) {
    throw new Error(
      `Unsupported attachment type returned ${rejectedType.status} instead of 400.`,
    );
  }
  const rejectedSize = await sendBinaryResponse(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments`,
    Buffer.alloc(2 * 1024 * 1024 + 1),
    "too-large.txt",
    "text/plain",
    devToken,
  );
  if (rejectedSize.status !== 400) {
    throw new Error(
      `Oversized attachment returned ${rejectedSize.status} instead of 400.`,
    );
  }
  await assertDatabaseWrites();
  await sendJsonRequest(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}/attachments/${attachment.data.id}`,
    "DELETE",
    undefined,
    devToken,
  );
  await sendJsonRequest(
    `${apiUrl}/task-manager/todos/${createdTodo.data.id}`,
    "DELETE",
    undefined,
    devToken,
  );
  await sendJsonRequest(
    `${apiUrl}/admin/project-manager/issue/${createdIssue.data.id}`,
    "DELETE",
    undefined,
    devToken,
  );
  if (pages.some((response) => !response.ok)) {
    throw new Error(
      `Devkit Web auth routes failed: ${pages.map((page) => page.status).join(", ")}`,
    );
  }

  console.log(
    "\nRuntime smoke passed: devkit_db migrations/imports, SQL writes/audits, single developer-desk auth, API guards, and Web routes.",
  );
} catch (error) {
  console.error("\nRuntime smoke failed.");
  if (output.trim()) console.error(output.trim());
  throw error;
} finally {
  stopProcessTree(child);
  await closeServer(platformServer);
  await dropRuntimeDatabase();
  if (
    runtimeStoragePath.startsWith(
      join(tmpdir(), "codexsun-devkit-attachments-"),
    )
  ) {
    rmSync(runtimeStoragePath, { force: true, recursive: true });
  }
}

async function login(desk, email) {
  const response = await fetch(`${apiUrl}/auth/platform/login`, {
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

async function findAvailablePort() {
  const server = createServer();
  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Could not allocate an isolated runtime smoke port.");
  }
  const { port } = address;
  await closeServer(server);
  return port;
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

async function sendBinaryRequest(url, body, fileName, mimeType, token) {
  const response = await sendBinaryResponse(
    url,
    body,
    fileName,
    mimeType,
    token,
  );
  const value = await response.json();
  if (!response.ok) {
    throw new Error(`POST ${url} returned HTTP ${response.status}.`);
  }
  return value;
}

function sendBinaryResponse(url, body, fileName, mimeType, token) {
  return fetch(url, {
    body,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(fileName),
      "X-File-Type": mimeType,
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });
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
    throw new Error(
      `Refusing to drop unexpected database ${runtimeDatabaseName}.`,
    );
  }
  const connection = await createConnection({
    host: databaseEnv.DB_HOST,
    password: databaseEnv.DB_PASSWORD,
    port: Number(databaseEnv.DB_PORT),
    user: databaseEnv.DB_USER,
  });
  try {
    await connection.query(
      `DROP DATABASE IF EXISTS \`${runtimeDatabaseName}\``,
    );
  } finally {
    await connection.end();
  }
}
