# Project Inventory

## Executable Platform

- `src/platform/api`: Fastify server, local authentication, identity modules, MariaDB connection,
  and DevKit API composition.
- `src/platform/web`: React application shell, login, identity administration, and DevKit web
  bundle composition.

## DevKit Owner Workspaces

- `src/devkit/api`: Project Manager, Task Manager, Planning, GitHub Dashboard, Orchestration,
  Skills, Sync, database lifecycle, JSON seeds, and public host contracts.
- `src/devkit/web`: Today, Projects, Tasks, Platform Registry, Whiteboards, GitHub Dashboard,
  Engineering Command Center, Project Agent, Skill Library, Design System, and Sync workspaces.
- `assist/skills/library`: Repository-owned physical skill folders used for Agent prompting and
  review workflows. DevKit generates the hidden `SKILL.md` manifest and links each user-managed
  reference file from it so agents can load the relevant knowledge progressively.
- Orchestration owns MariaDB-backed Project Agent chat threads, messages, edited-file evidence,
  elapsed time, and feedback. Every chat-history query is partitioned by the authenticated local
  actor ID; this is scoped record isolation, not a claim of platform-wide multi-tenant isolation.
- Orchestration also owns durable Agent runs, steps, events, approvals, artifacts, and observed tool
  calls. The Project Agent Run Control lane shows this evidence for the selected project.
- Orchestration owns the local Git worktree executor. Writable runs use isolated branches under the
  managed worktree root. Cleanup rejects dirty worktrees and keeps each branch for review.
- Orchestration owns registered verification commands, verification attempts, rework state, and
  approved local commits. It does not push Agent branches.

## Shared Dependencies

- `packages/framework`: backend infrastructure and public module contracts.
- `packages/ui`: React components, layouts, and workspace primitives.

Legacy Trades business sources remain under `src/platform/*/src/modules` but are not registered by
either composition root. Only repository-root `node_modules` and `dist` directories are permitted.
