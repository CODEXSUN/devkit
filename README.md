# CODEXSUN Devkit

Standalone developer workspace extracted from CODEXSUN Platform. Devkit owns the existing Project Manager, Task Manager, Platform Registry, Work Automation, and the module-owned SQL tables stored in `devkit_db`. Product-wide engineering guidance remains owned by the sibling `codexsun/assist` knowledge base; Devkit retains only its immutable changelog locally.

Devkit is an executable composition root. It consumes backend infrastructure from the sibling `@codexsun/framework` repository and presentation primitives from the sibling `@codexsun/ui` repository through their declared package exports.

## Development

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

- Web: `http://127.0.0.1:7040`
- API: `http://127.0.0.1:7030`

The root launcher performs API/Web preflight, verifies the sibling Framework and UI links, reuses an active Platform API or starts the sibling Platform API for authentication, starts the Devkit API before the Web app, waits for every health endpoint, labels service logs, monitors runtime health, and stops the owned stack when a service exits.

## Database

Devkit uses a separate MySQL/MariaDB database named `devkit_db` by default. It does not write Devkit business records into the Platform master database. Local development can inherit `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` from the sibling Platform environment; deployment environments must provide them explicitly.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

The API also runs the idempotent migrations and seed/import lifecycle at startup. On the first empty database only, the existing Project Manager and Task Manager JSON records are imported into module-owned tables. After import, SQL is the runtime source of truth; the JSON files are retained only as repeatable bootstrap input.

## Authentication

- `/sa/login` uses the Platform Super Admin credentials and opens the protected `/sa` desk.
- `/admin/login` uses the Platform Software Admin credentials and opens the protected `/admin` desk.
- Platform remains the login and token owner. Devkit exposes a fixed same-origin auth bridge and validates Platform-signed JWTs through `@codexsun/framework`.
- All Project Manager, Task Manager, Platform Registry, and Work Automation API routes require a valid Platform `super_admin` or `staff` token. Root, health, and the three fixed auth bridge routes are the only public API endpoints.
- Local development inherits `JWT_SECRET` from the sibling Platform environment when Devkit does not define it. Production must provide the same Platform JWT secret explicitly.

## Verification

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run dependencies:check
npm.cmd run test:runtime
```

The runtime smoke test creates an isolated temporary Devkit database, verifies migrations and JSON import, exercises audited Project Manager and Task Manager SQL writes, verifies the Platform login bridge and global API protection, and removes the temporary database afterward.

The Framework and UI dependencies are local sibling links during development. Devkit binds to localhost by default. Authentication and shared database persistence are implemented; threaded discussions and richer bug workflows remain future Devkit work.

## Ownership

- `api/src/modules/project-manager`: planning, issues, activities, reviews, releases, timelines, todos, and registry data
- `api/src/modules/task-manager`: task lists and lookups
- `web/src/modules`: Project Manager, Task Manager, Platform Registry, and Work Automation UI
- `tools`: runtime preflight, coordinated development startup, release tooling, and smoke verification
- `assist/documentation/CHANGELOG.md`: immutable Devkit release history
