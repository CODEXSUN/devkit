#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = packageJson.version;
const targetRoot = join(root, "apps", "devkit", "desktop", "src-tauri", "target", "release");
const bundleRoot = join(targetRoot, "bundle", "msi");
const deployBase = join(root, "dist", "deploy", "desktop");
const deployRoot = join(deployBase, version, "windows-x64");
const installerName = `CodeLogix_${version}_x64_en-US.msi`;

await publishDesktopRelease();

async function publishDesktopRelease() {
  clearDeployRoot();
  const files = [
    copyArtifact(join(targetRoot, "devkit-desktop.exe"), join("app", "CodeLogix.exe"), "app"),
    copyArtifact(join(targetRoot, "codex.exe"), join("app", "codex.exe"), "agent-runtime"),
    copyArtifact(join(bundleRoot, installerName), join("installer", installerName), "installer"),
    copyArtifact(
      join(bundleRoot, `${installerName}.sig`),
      join("installer", `${installerName}.sig`),
      "updater-signature"
    )
  ];
  writeUpdaterManifest(installerName);
  files.push(describeArtifact(join("updater", "latest.json"), "updater-manifest"));
  const described = await Promise.all(files);
  writeChecksums(described);
  writeReleaseManifest(described);
  console.log(`Published desktop release outputs to ${deployRoot}`);
}

function clearDeployRoot() {
  const expectedPrefix = `${resolve(deployBase)}${sep}`;
  if (!resolve(deployRoot).startsWith(expectedPrefix)) {
    throw new Error(`Refusing to clear an unexpected release path: ${deployRoot}`);
  }
  rmSync(deployRoot, { force: true, recursive: true });
  mkdirSync(deployRoot, { recursive: true });
}

function copyArtifact(source, destination, role) {
  if (!existsSync(source)) {
    throw new Error(`Required desktop release output is missing: ${source}`);
  }
  const output = join(deployRoot, destination);
  mkdirSync(resolve(output, ".."), { recursive: true });
  copyFileSync(source, output);
  return describeArtifact(destination, role);
}

function writeUpdaterManifest(installerName) {
  const signature = readFileSync(join(bundleRoot, `${installerName}.sig`), "utf8").trim();
  const tag = `desktop-v${version}`;
  const url = `https://github.com/CODEXSUN/devkit/releases/download/${tag}/${installerName}`;
  const manifest = {
    version,
    notes: `CodeLogix ${version}`,
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": { signature, url }
    }
  };
  const output = join(deployRoot, "updater", "latest.json");
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function describeArtifact(path, role) {
  const fullPath = join(deployRoot, path);
  return {
    path: path.replaceAll("\\", "/"),
    role,
    bytes: statSync(fullPath).size,
    sha256: await sha256(fullPath)
  };
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function writeChecksums(files) {
  const content = files.map((file) => `${file.sha256}  ${file.path}`).join("\n");
  writeFileSync(join(deployRoot, "checksums.sha256"), `${content}\n`);
}

function writeReleaseManifest(files) {
  const manifest = {
    product: "CodeLogix",
    version,
    platform: "windows",
    architecture: "x86_64",
    generatedAt: new Date().toISOString(),
    root: relative(root, deployRoot).replaceAll("\\", "/"),
    files
  };
  writeFileSync(join(deployRoot, "release.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}
