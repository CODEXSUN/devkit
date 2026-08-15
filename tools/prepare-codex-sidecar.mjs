import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.env.TAURI_ENV_TARGET_TRIPLE ?? detectTargetTriple();
const packageName = packageForTarget(target);
const executableName = process.platform === "win32" ? "codex.exe" : "codex";
const source = resolve(
  repositoryRoot,
  "node_modules",
  "@openai",
  packageName,
  "vendor",
  target,
  "bin",
  executableName,
);
const destination = resolve(
  repositoryRoot,
  "apps/devkit/desktop/src-tauri/binaries",
  `codex-${target}${process.platform === "win32" ? ".exe" : ""}`,
);

if (!existsSync(source)) {
  throw new Error(
    `Codex sidecar is unavailable for ${target}. Run npm install from the repository root.`,
  );
}

mkdirSync(dirname(destination), { recursive: true });
if (!existsSync(destination) || statSync(destination).size !== statSync(source).size) {
  copyFileSync(source, destination);
}

console.log(`Prepared Codex ${target} sidecar.`);

function detectTargetTriple() {
  const targets = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-arm64": "aarch64-unknown-linux-musl",
    "linux-x64": "x86_64-unknown-linux-musl",
    "win32-arm64": "aarch64-pc-windows-msvc",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  const targetTriple = targets[`${process.platform}-${process.arch}`];
  if (!targetTriple) {
    throw new Error(`Unsupported CodeLogix target: ${process.platform}-${process.arch}`);
  }
  return targetTriple;
}

function packageForTarget(targetTriple) {
  const packages = {
    "aarch64-apple-darwin": "codex-darwin-arm64",
    "aarch64-pc-windows-msvc": "codex-win32-arm64",
    "aarch64-unknown-linux-musl": "codex-linux-arm64",
    "x86_64-apple-darwin": "codex-darwin-x64",
    "x86_64-pc-windows-msvc": "codex-win32-x64",
    "x86_64-unknown-linux-musl": "codex-linux-x64",
  };
  const packageName = packages[targetTriple];
  if (!packageName) {
    throw new Error(`Unsupported Codex target triple: ${targetTriple}`);
  }
  return packageName;
}
