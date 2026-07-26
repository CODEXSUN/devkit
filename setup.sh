#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
. "$CONTAINER_DIR/common.sh"
ASSUME_YES=false
LOCAL_SOURCE=false
for arg in "$@"; do case "$arg" in --yes) ASSUME_YES=true;; --local-source|--skip-git) LOCAL_SOURCE=true;; -h|--help) echo "Usage: bash setup.sh [--yes] [--local-source]"; exit 0;; *) exit 64;; esac; done
confirm(){ [ "$ASSUME_YES" = true ] && return 0; read -r -p "$1 [Y/n] " a; case "${a:-Y}" in y|Y|yes|YES|Yes) return 0;; *) return 1;; esac; }
if [ "$LOCAL_SOURCE" = false ] && confirm "Check and fast-forward DevKit, Framework, and UI?"; then
  for repo in "$ROOT_DIR" "$ROOT_DIR/../framework" "$ROOT_DIR/../ui"; do [ -z "$(git -C "$repo" status --porcelain)" ] || { echo "Dirty repository blocks setup: $repo" >&2; exit 65; }; git -C "$repo" pull --ff-only; done
fi
prepare_env
require_shared
npm run check
npm run dependencies:check
compose --profile tools config --quiet
compose --profile tools build
if database_exists && ! confirm "Use the existing DevKit database $(env_value DEVKIT_DB_NAME devkit_db)?"; then
  [ "$ASSUME_YES" = false ] || { echo "--yes never drops a database." >&2; exit 78; }
  database=$(env_value DEVKIT_DB_NAME devkit_db)
  read -r -p "Type DROP $database to permanently delete only this database: " phrase
  [ "$phrase" = "DROP $database" ] || exit 78
  drop_database
fi
ensure_database
compose --profile tools run --rm devkit-migrate
compose up -d devkit-api devkit-web --wait --wait-timeout 240
bash "$CONTAINER_DIR/smoke-test.sh"
echo "DevKit setup completed. Cloudflare origin: http://devkit-web:80"
