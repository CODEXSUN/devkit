import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const updater = read(".container/update.sh");
const setup = read(".container/setup.sh");
const compose = read(".container/docker-compose.yml");
const deployExample = read(".container/deploy.env.example");
const rootUpdater = read("update.sh");
const compatibilityUpdater = read("updat.sh");
const watcher = read(".container/update-watcher/devkit-update-watcher.sh");
const watcherInstaller = read(".container/update-watcher/install.sh");
const watcherService = read(".container/update-watcher/devkit-update-watcher.service");
const watcherTimer = read(".container/update-watcher/devkit-update-watcher.timer");

requireTokens(".container/update.sh", updater, [
  "umask 077",
  "flock -n 9",
  "--allow-dirty",
  "DEVKIT_MIGRATION_COMPATIBLE_VERSION",
  "sha256sum --check",
  "write_deployment_metadata",
  "require_free_space",
  "rollback_application"
]);
requireTokens(".container/setup.sh", setup, [
  "DEVKIT_COMPOSE_PROJECT",
  "DEVKIT_MIGRATION_COMPATIBLE_VERSION",
  "Standalone DevKit deployment plan"
]);
requireTokens(".container/docker-compose.yml", compose, [
  "name: ${DEVKIT_COMPOSE_PROJECT:-devkit}",
  "DEVKIT_ENV_FILE_PATH: /workspace/devkit/.env",
  "networks: [devkit]"
]);
requireTokens(".container/deploy.env.example", deployExample, [
  "DEVKIT_VERSION=",
  "DEVKIT_MIGRATION_COMPATIBLE_VERSION=",
  "DEVKIT_UPDATE_MIN_BACKUP_FREE_MB=",
  "DEVKIT_UPDATE_MIN_DOCKER_FREE_MB="
]);
requireTokens("update.sh", rootUpdater, ['exec bash "$ROOT_DIR/.container/update.sh" "$@"']);
requireTokens("updat.sh", compatibilityUpdater, ['exec bash "$ROOT_DIR/update.sh" "$@"']);
requireTokens(".container/update-watcher/devkit-update-watcher.sh", watcher, [
  "flock -n 9",
  "merge-base --is-ancestor",
  "worktree add --detach",
  "docker build --target verify",
  "merge --ff-only",
  "bash \"$REPO_DIR/update.sh\" --check",
  "bash \"$REPO_DIR/update.sh\" --yes",
  '"$STATE_DIR/config-backups/deploy.env.pre-${target_commit:0:12}"',
  "com.docker.compose.oneoff=True",
  "last-successful-commit"
]);
requireTokens(".container/update-watcher/install.sh", watcherInstaller, [
  "/usr/local/sbin/devkit-update-watcher",
  "systemctl enable --now devkit-update-watcher.timer"
]);
requireTokens(".container/update-watcher/devkit-update-watcher.service", watcherService, [
  "Type=oneshot",
  "Requires=docker.service",
  "TimeoutStartSec=1h"
]);
requireTokens(".container/update-watcher/devkit-update-watcher.timer", watcherTimer, [
  "OnUnitActiveSec=5min",
  "Persistent=true"
]);

console.info("DevKit deployment scripts verified.");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function requireTokens(file, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}
