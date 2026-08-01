# Project Inventory

## Executable Platform

- `src/platform/api`: Fastify server, local authentication, identity modules, MariaDB connection,
  and DevKit API composition.
- `src/platform/web`: React application shell, login, identity administration, and DevKit web
  bundle composition.

## DevKit Owner Workspaces

- `src/devkit/api`: Project Manager, Task Manager, Planning, GitHub Dashboard, Sync, database
  lifecycle, JSON seeds, and public host contracts.
- `src/devkit/web`: Today, Projects, Tasks, Platform Registry, Whiteboards, GitHub Dashboard,
  Design System, and Sync workspaces.

## Shared Dependencies

- `packages/framework`: backend infrastructure and public module contracts.
- `packages/ui`: React components, layouts, and workspace primitives.

Legacy Trades business sources remain under `src/platform/*/src/modules` but are not registered by
either composition root. Only repository-root `node_modules` and `dist` directories are permitted.
