# CODEXSUN Devkit

Standalone developer workspace extracted from CODEXSUN Platform. Devkit owns the existing Project Manager, Task Manager, Platform Registry, Work Automation, and the module-owned SQL tables stored in `devkit_db`. Product-wide engineering guidance remains owned by the sibling `codexsun/assist` knowledge base; Devkit retains only its immutable changelog locally.

Devkit owns its fixed-client stack manifest and business modules. It consumes the sibling
`@codexsun/cxapp` runtime, backend infrastructure from `@codexsun/framework`, and presentation
primitives from `@codexsun/ui` through declared package exports. The repositories remain
independent.

## Container deployment

Run `bash setup.sh` for installation and `bash update.sh` for later releases.
DevKit reuses CXApp shared infrastructure and owns only `devkit_db`, its
application volume, API, and Web containers. Cloudflare routes
`devkit.codexsun.com` to `http://devkit-web:80`.

## Development

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

- Web: `http://127.0.0.1:7040`
- API: `http://127.0.0.1:7030`

The root launcher performs API/Web preflight, verifies the sibling CXApp, Framework, and UI links,
starts the Devkit API before the Web app, waits for every health endpoint, labels service logs,
monitors runtime health, and stops the owned stack when a service exits. CXApp boots Devkit with
the `single-client` scope and fixed `devkit_db` provider; Devkit does not start or depend on the
multi-tenant Platform runtime.

## Database

Devkit uses a separate MySQL/MariaDB database named `devkit_db` by default. It does not write Devkit business records into the Platform master database. Local development can inherit `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` from the sibling Platform environment; deployment environments must provide them explicitly.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

The API also runs the idempotent migrations and seed/import lifecycle at startup. On the first empty database only, the existing Project Manager and Task Manager JSON records are imported into module-owned tables. After import, SQL is the runtime source of truth; the JSON files are retained only as repeatable bootstrap input.

## Authentication

- `/dev/login` uses the configured local Devkit developer account and opens the single protected `/dev` developer desk.
- Devkit owns `devkit_users` in `devkit_db`, seeds the configured developer administrator on first boot, hashes its password with scrypt, and issues Devkit-only JWT sessions.
- All Project Manager, Task Manager, Platform Registry, and Work Automation API routes require a valid Devkit `developer` token. Root, health, and `/auth/login`, `/auth/session`, and `/auth/logout` are the only public API endpoints.
- Configure `DEVKIT_ADMIN_EMAIL`, `DEVKIT_ADMIN_NAME`, `DEVKIT_ADMIN_PASSWORD`, and `DEVKIT_JWT_SECRET`. The configured bootstrap developer is synchronized on each boot, so changing its name or password in `.env` and restarting updates that account without touching any other future users.
- Devkit is single-client: no tenant registry, tenant selector, tenant ID/header, tenant database pool, plan activation, or entitlement lookup is part of its runtime.
- `api/src/stack.ts` adapts Devkit-owned authentication, database lifecycle, and public modules to
  the shared CXApp runtime. It does not move Devkit users or project behavior into CXApp.

Generate or rotate the Devkit-only JWT signing secret with:

```powershell
npm.cmd run env:jwt-secret
```

The command writes a new 64-character hexadecimal `DEVKIT_JWT_SECRET` to the repository-local `.env`. Restart the Devkit API after rotation; existing browser sessions will be invalidated.

## Verification

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run dependencies:check
npm.cmd run test:runtime
```

The runtime smoke test creates an isolated temporary Devkit database, verifies the local developer user migration/seed and JSON import, exercises audited Project Manager and Task Manager SQL writes, verifies local login and global API protection, and removes the temporary database afterward.

The CXApp, Framework, and UI dependencies are local sibling links during development. Devkit binds
to localhost by default. Authentication and shared database persistence are implemented; threaded
discussions and richer bug workflows remain future Devkit work.

## Ownership

- `api/src/modules/project-manager`: planning, issues, activities, reviews, releases, timelines, todos, and registry data
- `api/src/modules/task-manager`: task lists and lookups
- `web/src/modules`: Project Manager, Task Manager, Platform Registry, and Work Automation UI
- `tools`: runtime preflight, coordinated development startup, release tooling, and smoke verification
- `assist/documentation/CHANGELOG.md`: immutable Devkit release history
