# CodeLogicX

CodeLogicX is the external product label for this developer and engineering orchestration
workspace. Its internal technical name remains `devkit`: package IDs, routes, environment keys,
permissions, database objects, and module ownership continue to use that stable name.

The current application is standalone and single-client. It uses local authentication and one
MariaDB database configured by `DB_NAME`.

The Platform layer owns the executable API/web shell, users, roles, permissions, assignments, and
database connection. The `src/devkit` workspaces own Project Manager, Task Manager, Platform
Registry, Planning whiteboards, the GitHub dashboard, engineering orchestration, synchronization,
migrations, seeds, routes, and React workspaces.

## Development

Copy `.env.example` to `.env`, configure MariaDB, JWT, the initial administrator, and the DevKit
storage/workspace paths, then run from this repository root:

```sh
npm install
npm run dev
```

Default endpoints are API `http://127.0.0.1:7050` and Web `http://127.0.0.1:7060`.
The browser enters at `/app/devkit/orchestration`; DevKit API routes use `/api/devkit/*`.

Database commands:

```sh
npm run db:migrate
npm run db:seed
npm run db:migrations:list
```

## Docker deployment

Create a standalone DevKit installation with:

```sh
bash setup.sh
```

After updating the repository source, validate and apply an in-place deployment update with:

```sh
bash update.sh --check
bash update.sh
```

`bash updat.sh` is retained as a compatibility alias for operators using the earlier deployment
command spelling.

The updater preserves `.env`, `.container/deploy.env`, MariaDB data, credentials, ports, and named
volumes. It refuses concurrent or dirty-source updates by default, locks source and image versions,
requires explicit migration-compatibility approval, verifies free space, creates a SHA-256 checked
database backup and deployment metadata, replaces only the API and Web containers, and restores
their previous images if health verification fails. Use `--allow-dirty` only when intentionally
deploying and recording an uncommitted checkout.

## Verification

```sh
npm run check
npm run build
npm run test:e2e:runtime
```

Read `assist/AGENT-GUIDE.md` before changing architecture or module ownership. The product and
technical naming boundary is defined in `assist/architecture/engineering-orchestration.md`.
