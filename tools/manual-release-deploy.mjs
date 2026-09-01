#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const options = parseOptions(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

if (options.generateGithubKey) {
  run("npm.cmd", ["run", "github:ssh-key", "--", "--comment", options.keyComment], { cwd: root });
  process.exit(0);
}

runReleaseChecks();

if (options.push) {
  requireConfirmation(options);
  run("npm.cmd", ["run", "github:now", "--", "--yes", "--no-bump"], { cwd: root });
}

if (options.deploy) {
  requireConfirmation(options);
  if (!options.host) fail("--deploy requires --host <user@server>.");
  deployToVps(options);
}

console.log("Manual release workflow completed.");

function runReleaseChecks() {
  run("npm.cmd", ["run", "release:scope"], { cwd: root });
  run("npm.cmd", ["run", "check:versions"], { cwd: root });
  run("git", ["diff", "--check"], { cwd: root });
  run("npm.cmd", ["run", "github:now", "--", "--dry-run", "--no-bump"], { cwd: root });
}

function deployToVps({ host, identityFile, remoteDirectory, version }) {
  const sshArguments = [];
  if (identityFile) sshArguments.push("-i", identityFile);
  sshArguments.push(host, "bash", "-s", "--", remoteDirectory, version);

  const script = String.raw`set -euo pipefail
remote_dir="$1"
release_version="$2"
cd "$remote_dir"

if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to update a dirty production checkout." >&2
  exit 78
fi

git fetch origin main
git merge --ff-only origin/main

deploy_env=".container/deploy.env"
for key in DEVKIT_VERSION DEVKIT_IMAGE_TAG DEVKIT_MIGRATION_COMPATIBLE_VERSION; do
  if grep -q "^\${key}=" "$deploy_env"; then
    sed -i "s/^\${key}=.*/\${key}=\${release_version}/" "$deploy_env"
  else
    printf '%s=%s\n' "$key" "$release_version" >> "$deploy_env"
  fi
done

bash .container/update.sh --yes
docker compose --env-file .env --env-file .container/deploy.env -f .container/docker-compose.yml ps
curl --fail --silent --show-error http://127.0.0.1:9050/health
curl --fail --silent --show-error http://127.0.0.1:9060/health
`;

  run("ssh", sshArguments, { cwd: root, input: script });
}

function requireConfirmation({ yes }) {
  if (!yes) fail("Pass --yes after reviewing the release checks before pushing or deploying.");
}

function parseOptions(argumentsList) {
  const parsed = {
    deploy: false,
    generateGithubKey: false,
    help: false,
    host: "",
    identityFile: "",
    keyComment: "devkit-server",
    push: false,
    remoteDirectory: "/home/devkit",
    version: "",
    yes: false
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") parsed.help = true;
    else if (argument === "--deploy") parsed.deploy = true;
    else if (argument === "--generate-github-key") parsed.generateGithubKey = true;
    else if (argument === "--push") parsed.push = true;
    else if (argument === "--yes") parsed.yes = true;
    else if (
      ["--host", "--identity", "--key-comment", "--remote-dir", "--version"].includes(argument)
    ) {
      const value = argumentsList[index + 1];
      if (!value) fail(`${argument} requires a value.`);
      const keys = {
        "--host": "host",
        "--identity": "identityFile",
        "--key-comment": "keyComment",
        "--remote-dir": "remoteDirectory",
        "--version": "version"
      };
      parsed[keys[argument]] = value;
      index += 1;
    } else fail(`Unknown option: ${argument}`);
  }

  if (!parsed.generateGithubKey && !parsed.version) {
    parsed.version = run("node", ["-p", "require('./package.json').version"], {
      cwd: root,
      capture: true
    });
  }
  if (!/^\d+\.\d+\.\d+$/u.test(parsed.version)) fail("--version must use major.minor.patch.");
  return parsed;
}

function run(command, argumentsList, { capture = false, cwd, input } = {}) {
  const useWindowsCommandShell = process.platform === "win32" && command.endsWith(".cmd");
  const result = spawnSync(
    useWindowsCommandShell ? "cmd.exe" : command,
    useWindowsCommandShell ? ["/d", "/s", "/c", command, ...argumentsList] : argumentsList,
    {
      cwd,
      encoding: "utf8",
      input,
      stdio: capture
        ? ["ignore", "pipe", "inherit"]
        : [input ? "pipe" : "inherit", "inherit", "inherit"]
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout?.trim() ?? "";
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Run the reviewed DevKit release flow without duplicating its safeguards.

Usage:
  npm.cmd run release:manual
  npm.cmd run release:manual -- --push --yes
  npm.cmd run release:manual -- --deploy --yes --host user@server --identity C:\\path\\to\\key
  npm.cmd run release:manual -- --push --deploy --yes --host user@server
  npm.cmd run release:manual -- --generate-github-key --key-comment "devkit-server"

The default command performs only release-scope, version, whitespace, and GitHub dry-run checks.
--push reuses github:now with the current changelog entry and does not bump the version.
--deploy fast-forwards /home/devkit, synchronizes the three approved release-version settings in
.container/deploy.env, and calls the guarded .container/update.sh updater. It never resets a dirty
production checkout, deletes Docker data, or creates or replaces runtime secrets.`);
}
