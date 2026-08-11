import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const apiModules = resolve(root, "src/platform/api/src/modules");
const webModules = resolve(root, "src/platform/web/src/modules");
const devkitApiModules = resolve(root, "src/devkit/api/src/modules");
const devkitWebModules = resolve(root, "src/devkit/web/src/modules");
const allowed = new Set([
  "bank-account",
  "commission",
  "deposit",
  "payment",
  "permission",
  "role",
  "role-permission",
  "trades-overview",
  "user",
  "user-role"
]);
const failures = [];
const devkitApiOwned = new Set([
  "github-dashboard",
  "orchestration",
  "planning",
  "project-manager",
  "skills",
  "sync",
  "telegram-support",
  "task-manager"
]);
const devkitWebOwned = new Set([
  "agent-ide",
  "design-system",
  "github-dashboard",
  "launch-desk",
  "orchestration",
  "planning",
  "platform-registry",
  "project-manager",
  "skill-library",
  "sync",
  "telegram-support",
  "task-manager",
  "today",
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

for (const name of [...allowed].filter((name) => name !== "trades-overview")) {
  if (!existsSync(join(apiModules, name, "index.ts")))
    failures.push(`API ${name}: missing index.ts`);
  if (!existsSync(join(webModules, name, "index.ts")))
    failures.push(`Web ${name}: missing index.ts`);
}
if (!existsSync(join(webModules, "trades-overview", "index.ts"))) {
  failures.push("Web trades-overview: missing index.ts");
}

for (const file of sourceFiles(resolve(root, "src/platform"))) {
  const source = readFileSync(file, "utf8");
  if (/@codexsun\/core|modules\/(?:app-registry|subscription|plan|entitlement)/u.test(source)) {
    failures.push(`${relative(root, file)}: imports a removed product/platform boundary`);
  }
}

for (const file of sourceFiles(resolve(root, "src/devkit"))) {
  const source = readFileSync(file, "utf8");
  if (/src\/platform|\.\.\/\.\.\/platform/u.test(source.replaceAll("\\", "/"))) {
    failures.push(`${relative(root, file)}: DevKit imports its Platform host`);
  }
}

const apiComposition = readFileSync(resolve(root, "src/platform/api/src/app.ts"), "utf8");
for (const legacyModule of [
  "bankAccountModule",
  "commissionModule",
  "depositModule",
  "paymentModule"
]) {
  if (apiComposition.includes(legacyModule)) {
    failures.push(`src/platform/api/src/app.ts: composes legacy ${legacyModule}`);
  }
}
if (!apiComposition.includes("registerDevkitApiForHost")) {
  failures.push("src/platform/api/src/app.ts: DevKit API host registration is missing");
}

const webComposition = readFileSync(
  resolve(root, "src/platform/web/src/desks/app/AppDesk.tsx"),
  "utf8"
);
if (!webComposition.includes("devkitWebBundle")) {
  failures.push("src/platform/web/src/desks/app/AppDesk.tsx: DevKit web bundle is missing");
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
