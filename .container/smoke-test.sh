#!/usr/bin/env bash
set -euo pipefail
CONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$CONTAINER_DIR/common.sh"
prepare_env
curl --fail --silent "http://$(env_value DEVKIT_BIND_ADDRESS 127.0.0.1):$(env_value DEVKIT_API_HOST_PORT 17030)/health" >/dev/null
curl --fail --silent "http://$(env_value DEVKIT_BIND_ADDRESS 127.0.0.1):$(env_value DEVKIT_WEB_HOST_PORT 17040)/health" >/dev/null
database_exists
echo "DevKit container smoke test passed."
