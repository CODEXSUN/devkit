import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const output = resolve(repositoryRoot, "dist");

const relativeOutput = relative(repositoryRoot, output);

if (relativeOutput.startsWith("..") || resolve(repositoryRoot, relativeOutput) !== output) {
  throw new Error(`Refusing to clean unexpected output path: ${output}`);
}

await rm(output, { force: true, recursive: true });
