#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
. "$CONTAINER_DIR/common.sh"
LOCAL_SOURCE=false
ASSUME_YES=false
for arg in "$@"; do case "$arg" in --yes) ASSUME_YES=true;; --local-source|--skip-git) LOCAL_SOURCE=true;; -h|--help) echo "Usage: bash update.sh [--yes] [--local-source]"; exit 0;; *) exit 64;; esac; done
if [ "$LOCAL_SOURCE" = false ]; then
  if [ "$ASSUME_YES" = true ]; then a=Y; else read -r -p "Check and fast-forward DevKit, Framework, and UI? [Y/n] " a; fi
  case "${a:-Y}" in y|Y|yes|YES|Yes) for repo in "$ROOT_DIR" "$ROOT_DIR/../framework" "$ROOT_DIR/../ui"; do [ -z "$(git -C "$repo" status --porcelain)" ] || { echo "Dirty repository blocks update: $repo" >&2; exit 65; }; git -C "$repo" pull --ff-only; done;; esac
fi
prepare_env
require_shared
database_exists || { echo "DevKit database is missing. Run bash setup.sh." >&2; exit 69; }
npm run check
npm run dependencies:check
compose --profile tools config --quiet
compose --profile tools build
if [ "$ASSUME_YES" = true ]; then migrate=Y; else read -r -p "Run idempotent DevKit migrations and seeds? [Y/n] " migrate; fi
case "${migrate:-Y}" in y|Y|yes|YES|Yes) compose --profile tools run --rm devkit-migrate;; esac
compose up -d devkit-api devkit-web --force-recreate --wait --wait-timeout 240
bash "$CONTAINER_DIR/smoke-test.sh"
echo "DevKit update completed."
