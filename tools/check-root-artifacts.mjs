#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workspaceRoots = ["api", "web"].map((directory) => join(root, directory));
const forbiddenDirectories = new Set(["dist", "dist-types", "node_modules"]);
const nestedArtifacts = [];

function findNestedArtifacts(directory) {
  if (!existsSync(directory)) return;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const fullPath = join(directory, entry.name);
    if (forbiddenDirectories.has(entry.name)) {
      nestedArtifacts.push(relative(root, fullPath));
      continue;
    }

    findNestedArtifacts(fullPath);
  }
}

for (const workspaceRoot of workspaceRoots) findNestedArtifacts(workspaceRoot);

if (nestedArtifacts.length > 0) {
  console.error("Workspace-local dependency or build directories are not allowed:");
  for (const directory of nestedArtifacts) console.error(`- ${directory}`);
  process.exit(1);
}

console.log("Workspace layout verified: dependencies and build output stay at the repository root");
