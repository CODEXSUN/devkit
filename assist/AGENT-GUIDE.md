# DevKit Agent Guide

## Required Reading

1. `assist/README.md`
2. `assist/governance/rules.md`
3. `assist/architecture/module-boundaries.md`
4. `assist/architecture/data-strategy.md`
5. `assist/architecture/engineering-orchestration.md`
6. `assist/architecture/future-platform-blueprint.md`
7. `assist/documentation/project-inventory.md`

## Runtime Contract

- DevKit is standalone, local-authenticated, and single-client.
- CodeLogicX is the external label. `devkit` is the stable technical name for packages, routes,
  permissions, environment keys, database objects, and source ownership.
- Platform owns users, roles, permissions, assignments, the API/web servers, and the database
  connection.
- DevKit modules own their complete backend and frontend leaves, migrations, seeds, attachments,
  planning records, registry records, and synchronization records.
- Platform composes DevKit only through the public `@codexsun/devkit-api` and
  `@codexsun/devkit-web` workspace contracts.
- Framework and UI are consumed only through their public package exports.

## Change Rules

- Preserve unrelated worktree changes.
- Keep product behavior inside its DevKit module leaf.
- Use fixed route contracts and explicit Zod schemas.
- Keep orchestration provider-neutral; agent definitions must not import model-provider SDKs.
- Read runtime configuration only from `.env`.
- Migrations safely upgrade existing databases and record keys in `schema_migrations`.
- Seeds are repeatable; protected administrator creation is controlled by `INITIAL_ADMIN_*`.
- Run check, build, and the database-backed runtime smoke before completion when available.
