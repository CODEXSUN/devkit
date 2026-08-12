#!/bin/sh
set -eu

if [ "$(id -u)" = "0" ]; then
  for directory in "$DEVKIT_CODEX_HOME" "$DEVKIT_AGENT_WORKTREE_ROOT" "$DEVKIT_AGENT_ALLOWED_ROOTS"; do
    mkdir -p "$directory"
    marker="$directory/.devkit-node-owned"
    if [ ! -f "$marker" ]; then
      chown -R node:node "$directory"
      touch "$marker"
      chown node:node "$marker"
    fi
  done
  exec gosu node "$@"
fi

for directory in "$DEVKIT_CODEX_HOME" "$DEVKIT_AGENT_WORKTREE_ROOT" "$DEVKIT_AGENT_ALLOWED_ROOTS"; do
  test -d "$directory" && test -w "$directory" || {
    echo "DevKit runtime directory is unavailable or not writable: $directory" >&2
    exit 77
  }
done
exec "$@"
