---
name: devkit-commit-deploy-watch
description: Commit, push, deploy, and verify an authorized DevKit release with the guarded production watcher. Use after the release scope, changelog, and version are ready.
---

# DevKit Commit Deploy Watch

Use this skill only when the user explicitly authorizes Git and production mutations.

## Release boundary

1. Read `assist/documentation/release-notes-standard.md` and the newest entry in `assist/documentation/CHANGELOG.md`.
2. Run `npm.cmd run release:scope` and inspect every group. Keep existing changes out of the release unless the user included them.
3. Run `npm.cmd run version:bump -- --title "<title>"` only for a new patch version. Complete the generated changelog entry before committing.
4. Run focused checks, `npm.cmd run check:versions`, `git diff --check`, and `npm.cmd run github:now -- --dry-run`.
5. Derive the commit subject from the changelog as `#<patch> - <title>`. Stage only the reviewed paths, commit, fetch, rebase only when safe, and push `main`.

## Production watcher

Use the production checkout at `/home/devkit`. Do not print deployment secrets.

1. Check the host key, the clean `main` checkout, disk capacity, Docker state, and the current watcher status.
2. Run `/usr/local/sbin/devkit-update-watcher --check` before an update.
3. Start exactly one watcher run with `systemctl start devkit-update-watcher.service`.
4. Follow `journalctl -u devkit-update-watcher.service` until a terminal success or failure. Do not start a second run.
5. On success, verify the deployed commit and version, Compose status, API health, web health, migration list, backup metadata, and timer state.
6. On failure, stop. Retain the journal and metadata. Diagnose before any retry.

## Device authentication verification

After the public web deployment is healthy, verify the signed-in `/connect` page issues a one-time code without putting the credential in the URL. On desktop, verify the selected cloud origin, pairing code handoff, status refresh, and saved encrypted connection all use the same origin.

Record each completed command and live result in the current changelog entry. State every unavailable or unverified path directly.
