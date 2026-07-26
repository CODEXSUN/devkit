#!/usr/bin/env sh
set -eu
CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)}
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=${DEVKIT_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}
INFRA_ENV=${CODEXSUN_INFRA_ENV:-$PROJECT_ROOT/../codexsun/.container/deploy.env}
env_value() { key="$1"; default=${2:-}; value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true); printf '%s' "${value:-$default}"; }
infra_value() { grep -E "^${1}=" "$INFRA_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true; }
set_env() {
  key="$1"; value="$2"; tmp="$DEPLOY_ENV.tmp"
  KEY="$key" VALUE="$value" awk 'BEGIN{f=0} index($0,ENVIRON["KEY"]"=")==1{print ENVIRON["KEY"]"="ENVIRON["VALUE"];f=1;next}{print}END{if(!f)print ENVIRON["KEY"]"="ENVIRON["VALUE"]}' "$DEPLOY_ENV" > "$tmp"
  mv "$tmp" "$DEPLOY_ENV"
}
secret() { if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32; else node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; fi; }
prepare_env() {
  [ -f "$DEPLOY_ENV" ] || cp "$CONTAINER_DIR/deploy.env.example" "$DEPLOY_ENV"
  [ -f "$INFRA_ENV" ] || { echo "CXApp deployment env is missing: $INFRA_ENV" >&2; exit 69; }
  version=$(grep -m1 '"version"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
  set_env DEVKIT_VERSION "$version"
  for pair in "DB_USER:DB_USER" "DB_PASSWORD:DB_PASSWORD" "DB_HOST:MARIADB_CONTAINER_NAME" "MARIADB_CONTAINER_NAME:MARIADB_CONTAINER_NAME" "REDIS_CONTAINER_NAME:REDIS_CONTAINER_NAME" "MEDIA_CONTAINER_NAME:MEDIA_CONTAINER_NAME" "CODEXSUN_BACKEND_NETWORK:CODEXSUN_DOCKER_NETWORK" "CODEXSUN_EDGE_NETWORK:CODEXSUN_EDGE_NETWORK"; do
    target=${pair%%:*}; source=${pair#*:}; set_env "$target" "$(infra_value "$source")"
  done
  for key in DEVKIT_COOKIE_SECRET JWT_SECRET; do
    case "$(env_value "$key")" in ""|change_this*) set_env "$key" "$(secret)" ;; esac
  done
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}
require_shared() {
  docker info >/dev/null 2>&1 || { echo "Docker Engine is not reachable." >&2; exit 69; }
  for network in "$(env_value CODEXSUN_BACKEND_NETWORK cxapp-network)" "$(env_value CODEXSUN_EDGE_NETWORK cxapp-edge)"; do docker network inspect "$network" >/dev/null 2>&1 || { echo "Missing shared network: $network" >&2; exit 69; }; done
  for name in "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" "$(env_value REDIS_CONTAINER_NAME cxapp-redis)" "$(env_value MEDIA_CONTAINER_NAME cxapp-media)"; do
    [ "$(docker inspect "$name" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)" = "healthy" ] || { echo "Shared service is not healthy: $name" >&2; exit 69; }
  done
}
database_exists() {
  database=$(env_value DEVKIT_DB_NAME devkit_db)
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" mariadb --batch --skip-column-names -u "$(env_value DB_USER cxapp_app)" -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${database}';" | grep -qx 1
}
ensure_database() {
  database=$(env_value DEVKIT_DB_NAME devkit_db)
  case "$database" in ""|*[!A-Za-z0-9_]*) echo "Unsafe DEVKIT_DB_NAME." >&2; exit 78 ;; esac
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" mariadb -u "$(env_value DB_USER cxapp_app)" -e "CREATE DATABASE IF NOT EXISTS \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null
}
drop_database() {
  database=$(env_value DEVKIT_DB_NAME devkit_db)
  case "$database" in cxsun_master_db|codexsun_db) echo "Protected CXApp database." >&2; exit 78 ;; ""|*[!A-Za-z0-9_]*) exit 78 ;; esac
  docker exec -e MYSQL_PWD="$(env_value DB_PASSWORD)" "$(env_value MARIADB_CONTAINER_NAME cxapp-mariadb)" mariadb -u "$(env_value DB_USER cxapp_app)" -e "DROP DATABASE \`$database\`;" >/dev/null
}
compose() { docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/docker-compose.yml" "$@"; }
