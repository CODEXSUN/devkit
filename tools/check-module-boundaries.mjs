import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const apiModules = resolve(root, "apps/platform/api/src/modules");
const webModules = resolve(root, "apps/platform/web/src/modules");
const devkitApiModules = resolve(root, "apps/devkit/api/src/modules");
const devkitWebModules = resolve(root, "apps/devkit/web/src/modules");
const allowed = new Set(["permission", "role", "role-permission", "user", "user-role"]);
const failures = [];
const devkitApiOwned = new Set([
  "github-dashboard",
  "honey",
  "orchestration",
  "planning",
  "project-manager",
  "skills",
  "sync",
  "telegram-support",
  "task-manager"
]);
const devkitWebOwned = new Set([
  "app-desk",
  "agent-ide",
  "dashboard",
  "design-system",
  "github-dashboard",
  "launch-desk",
  "hostinger-mcp",
  "honey",
  "orchestration",
  "planning",
  "platform-registry",
  "project-manager",
  "repository-settings",
  "skill-library",
  "sync",
  "telegram-support",
  "task-manager",
  "today",
  "work-hub",
  "work-automation"
]);

for (const moduleRoot of [apiModules, webModules]) {
  for (const entry of readdirSync(moduleRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowed.has(entry.name)) {
      failures.push(`unexpected module directory: ${relative(root, join(moduleRoot, entry.name))}`);
    }
  }
}

for (const [moduleRoot, expected] of [
  [devkitApiModules, devkitApiOwned],
  [devkitWebModules, devkitWebOwned]
]) {
  const actual = new Set(
    readdirSync(moduleRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  );
  for (const name of expected) {
    if (!actual.has(name))
      failures.push(`DevKit module is missing: ${relative(root, join(moduleRoot, name))}`);
  }
  for (const name of actual) {
    if (!expected.has(name))
      failures.push(`unexpected DevKit module: ${relative(root, join(moduleRoot, name))}`);
  }
}

for (const name of allowed) {
  if (!existsSync(join(apiModules, name, "index.ts")))
    failures.push(`API ${name}: missing index.ts`);
  if (!existsSync(join(webModules, name, "index.ts")))
    failures.push(`Web ${name}: missing index.ts`);
}

for (const file of sourceFiles(resolve(root, "apps/platform"))) {
  const source = readFileSync(file, "utf8");
  if (/@codexsun\/core|modules\/(?:app-registry|subscription|plan|entitlement)/u.test(source)) {
    failures.push(`${relative(root, file)}: imports a removed product/platform boundary`);
  }
}

for (const file of sourceFiles(resolve(root, "apps/devkit"))) {
  const source = readFileSync(file, "utf8");
  if (/apps\/platform|\.\.\/\.\.\/platform/u.test(source.replaceAll("\\", "/"))) {
    failures.push(`${relative(root, file)}: DevKit imports its Platform host`);
  }
}

const apiComposition = readFileSync(resolve(root, "apps/platform/api/src/app.ts"), "utf8");
if (!apiComposition.includes("registerDevkitApiForHost")) {
  failures.push("apps/platform/api/src/app.ts: DevKit API host registration is missing");
}

const webComposition = readFileSync(
  resolve(root, "apps/platform/web/src/desks/app/AppDesk.tsx"),
  "utf8"
);
if (!webComposition.includes("devkitWebBundle")) {
  failures.push("apps/platform/web/src/desks/app/AppDesk.tsx: DevKit web bundle is missing");
}

if (failures.length) {
  console.error(`Module boundary check failed:\n${failures.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}
console.info(
  "Module boundary check passed: Platform owns identity and composes DevKit public contracts."
);

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}
