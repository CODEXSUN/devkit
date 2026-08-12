---
name: devkit-production-update
description: Safely release and operate DevKit at /home/devkit on its Ubuntu Docker VPS. Use when preparing a DevKit version, checking SSH production state, running the guarded Docker updater, installing or diagnosing the systemd update watcher, verifying migrations and health, cleaning DevKit-only one-off resources, or recording deployment evidence.
---

# DevKit Production Update

Run repository release checks locally, deploy only a reviewed fast-forward
commit, and retain evidence for every production action. Read
`references/runbook.md` before changing the VPS.

## Workflow

1. Read repository governance and inspect the complete Git status. Treat all
   existing changes as user-owned until their release scope is confirmed.
2. Run focused checks, the full repository check, and the GitHub helper dry run.
3. Update the immutable changelog and repository version. Confirm package version
   contracts before staging.
4. Commit and push only after explicit authorization.
5. Connect to the pinned VPS host key. Inspect `/home/devkit`, Docker, disk space,
   current containers, and deployment configuration without printing secrets.
6. Require a clean `main` checkout and a fast-forward remote update. Never reset,
   stash, or overwrite unexpected production changes.
7. Use the watcher or `bash update.sh --check` followed by `bash update.sh --yes`.
   The updater owns verification images, database backup, migrations, seeds,
   application replacement, health checks, metadata, and compatible rollback.
8. Verify Git commit, application version, Compose health, HTTP health, migration
   list, backup checksum, deployment metadata, and systemd timer.
9. Record exact commands and outcomes. Distinguish local static checks from live
   SSH, Docker, MariaDB, provider, and public HTTP evidence.

## Watcher safety rules

- The timer may fetch and deploy only `origin/main` into `/home/devkit`.
- Verify a candidate in a detached temporary Git worktree before fast-forwarding.
- Preserve `.env`, deployment secrets, MariaDB containers, volumes, networks, and
  all unrelated Docker resources.
- Cleanup is limited to stopped Compose one-off containers from the configured
  DevKit project and unused images in the configured DevKit image namespace.
- Never run global Docker prune commands.
- On failure, stop, retain logs and backups, and diagnose before retrying.
