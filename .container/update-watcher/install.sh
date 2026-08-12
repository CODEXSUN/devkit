#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${DEVKIT_WATCHER_REPO_DIR:-/home/devkit}"
SOURCE_DIR="$REPO_DIR/.container/update-watcher"
[[ "$(id -u)" == 0 ]] || { echo "Run this installer as root." >&2; exit 77; }
command -v systemctl >/dev/null 2>&1 || { echo "systemd is required." >&2; exit 69; }
[[ -f "$SOURCE_DIR/devkit-update-watcher.sh" ]] || { echo "Watcher source is missing: $SOURCE_DIR" >&2; exit 78; }

install -o root -g root -m 0750 "$SOURCE_DIR/devkit-update-watcher.sh" /usr/local/sbin/devkit-update-watcher
install -o root -g root -m 0644 "$SOURCE_DIR/devkit-update-watcher.service" /etc/systemd/system/devkit-update-watcher.service
install -o root -g root -m 0644 "$SOURCE_DIR/devkit-update-watcher.timer" /etc/systemd/system/devkit-update-watcher.timer
install -d -o root -g root -m 0750 /var/lib/devkit-update-watcher
systemctl daemon-reload
systemctl enable --now devkit-update-watcher.timer
systemctl status devkit-update-watcher.timer --no-pager

echo "Installed DevKit update watcher. Inspect it with:"
echo "  systemctl start devkit-update-watcher.service"
echo "  journalctl -u devkit-update-watcher.service -n 100 --no-pager"
