# CODEXSUN DevKit

`@codexsun/devkit` is the CXApp-pluggable owner package for CODEXSUN developer planning and
collaboration.

It owns Project Manager, Task Manager, Platform Registry, Work Automation, the read-only GitHub
Dashboard, their applicable migrations and seeds, fixed API routes, and web workspace contributions.
It does not own authentication, client resolution, plans, subscriptions, entitlements, runtime
registries, queues, API/web servers, or public application shells; CXApp supplies those runtime
capabilities.

## Public contracts

- `@codexsun/devkit` and `@codexsun/devkit/stack` export the immutable optional stack descriptor.
- `@codexsun/devkit/host` exports the typed CXApp host-registration adapter.
- `@codexsun/devkit/api` exports `registerDevkitApiForHost`, `devkitDatabaseLifecycle`, module
  definitions, migrations, seeds, and owned API types.
- `@codexsun/devkit/database` exports the ordered owner migration and repeatable-seed lifecycle.
- `@codexsun/devkit/web` and `@codexsun/devkit/web/cxapp` export `devkitWebBundle` and the owned
  workspace contributions.

The host resolves the trusted actor and fixed client database, then passes both to
`registerDevkitApiForHost`. DevKit never selects a database or authenticates a request.
CXApp may include these public contributions in a stack catalog or omit the package completely;
DevKit has no import of CXApp internals and CXApp does not need DevKit as a foundation dependency.

## Development

Run commands from this repository root:

```powershell
npm.cmd run check
npm.cmd run build
```

DevKit is a package, not a standalone server. Runtime and browser verification belongs to the
CXApp stack that composes it.
