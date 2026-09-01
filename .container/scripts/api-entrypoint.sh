#!/bin/sh
set -eu

command -v git >/dev/null 2>&1 || {
  echo "Git is not installed in the DevKit API image." >&2
  exit 78
}
test -f /workspace/devkit/node_modules/@openai/codex/bin/codex.js || {
  echo "The bundled Codex CLI is not installed in the DevKit API image." >&2
  exit 78
}

repository="${DEVKIT_AGENT_DEFAULT_REPOSITORY:-}"
if [ -n "$repository" ] && [ ! -d "$repository/.git" ]; then
  echo "The DevKit repository mount is missing Git metadata: $repository" >&2
  exit 78
fi

if [ "$(id -u)" = "0" ]; then
  for directory in "$DEVKIT_CODEX_HOME" "$DEVKIT_AGENT_WORKTREE_ROOT" "$DEVKIT_AGENT_ALLOWED_ROOTS"; do
    mkdir -p "$directory"
    marker="$directory/.devkit-node-owned"
    if [ ! -f "$marker" ]; then
      if [ "$directory" = "$DEVKIT_AGENT_ALLOWED_ROOTS" ]; then
        chown node:node "$directory"
      else
        chown -R node:node "$directory"
      fi
      touch "$marker"
      chown node:node "$marker"
    fi
  done
  if [ -n "$repository" ]; then
    git config --global --add safe.directory "$repository"
    gosu node git config --global --add safe.directory "$repository"
  fi
  exec gosu node "$@"
fi

for directory in "$DEVKIT_CODEX_HOME" "$DEVKIT_AGENT_WORKTREE_ROOT" "$DEVKIT_AGENT_ALLOWED_ROOTS"; do
  test -d "$directory" && test -w "$directory" || {
    echo "DevKit runtime directory is unavailable or not writable: $directory" >&2
    exit 77
  }
done
exec "$@"
