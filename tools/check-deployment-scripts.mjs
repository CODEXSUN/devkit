import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const updater = read(".container/update.sh");
const setup = read(".container/setup.sh");
const compose = read(".container/docker-compose.yml");
const deployExample = read(".container/deploy.env.example");
const rootUpdater = read("update.sh");
const compatibilityUpdater = read("updat.sh");

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

for (const [file, source] of [
  [".container/update.sh", updater],
  [".container/setup.sh", setup],
  [".container/docker-compose.yml", compose],
  [".container/deploy.env.example", deployExample]
]) {
  if (/\b(?:TRADES|Trades)\b/u.test(source)) {
    throw new Error(`${file}: stale Trades deployment identifier`);
  }
}

console.info("DevKit deployment scripts verified.");

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function requireTokens(file, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file}: missing ${token}`);
  }
}
