# Changelog

Current version: 1.0.33
Release tag: v-1.0.33
Changelog label: v 1.0.33

### [Session] 2026-08-11 - CODEXSUN application workspace layout

#### Database Changes

- Database update: No.
- Kept the existing Platform and DevKit migration order and database ownership.

#### App Codebase Changes

- Moved Platform API and web workspaces to `apps/platform`.
- Moved DevKit API and web workspaces to `apps/devkit`.
- Moved the Tauri desktop workspace to `apps/devkit/desktop`.
- Changed the root workspace pattern to `apps/*/*`.
- Kept Framework and UI in `packages`.
- Updated scripts, checks, tests, source paths, seed paths, and documentation.
- Removed the obsolete root `src` application tree.

#### Verification

- Passed repository-boundary, dependency-layout, module-boundary, and database-lifecycle checks.
- Passed all workspace TypeScript and lint checks.
- Passed the Framework test and package-contract suites.
- Passed the full production build for API, web, and desktop workspaces.
- Applied the MariaDB migration from `apps/platform/api`.
- Passed two composed API runtime smoke cycles.
- The aggregate check remains blocked by the unrelated deleted root `updat.sh` file.

### [Session] 2026-08-11 - Parent run task decomposition

#### Database Changes

- Database update: Yes.
- Added durable Agent tasks, task dependencies, and parent review records.
- Linked each scoped task to its parent run and optional child run.

#### App Codebase Changes

- Added validated acyclic task decomposition for parent Agent runs.
- Added dependency-ready task scheduling and explicit task states.
- Added agent profiles and normalized file scopes for each child task.
- Rejected parallel task starts when declared file scopes overlap.
- Created a durable child run and isolated worktree for each started writable task.
- Added parent review approval after all child tasks complete.
- Added a Task Graph panel with task state, scope, dispatch, completion, rework, and approval controls.
- Kept automatic sub-agent prompt execution as planned work.

#### Verification

- Passed the full repository check.
- Passed the full production build.
- Added isolated parallel child worktree coverage.
- Applied the additive migration to `devkit_db`.
- Verified task creation and dependency release through the live Project Agent API and UI.
- Verified the Task Graph panel at a 1920 by 1080 viewport with no browser console errors.

## Unreleased - Trades conversion

- Renamed the standalone application and deployment surface to Trades.
- Retained Platform local users, roles, permissions, and assignments.
- Composed Deposit, Payment, Bank Account, and Commission from migration through UI.
- Removed the copied external sales and identity integration features.

### [Session] 2026-08-11 10:35 am - Project Agent quality gates

#### Database Changes

- Database update: Yes.
- Added verification, review, commit, and completion fields to Agent runs.
- Added durable Agent verification attempts with command, result, output, and duration evidence.

#### App Codebase Changes

- Added a shell-free registered verification command runner.
- Added a built-in Git whitespace and conflict check.
- Added environment-based command registration for project quality gates.
- Added repeatable verification attempts and a return-for-rework review state.
- Required all registered gates to pass before local commit approval.
- Added a worktree fingerprint that rejects changes made after a passed verification attempt.
- Added a two-step local commit approval in Run Control.
- Kept Agent commits local and disabled automatic remote pushes.
- Added quality-gate results, status, rework, and commit evidence to Run Control.

#### Verification

- Added executor tests for registered commands, missing executables, local commits, and branch retention.
- Added runtime smoke coverage for the verification command catalog.
- Added live Codex coverage for the read-only verification boundary.

### [Session] 2026-08-11 9:50 am - Isolated Project Agent executor

#### Database Changes

- Database update: Yes.
- Added workspace mode, status, source root, path, branch, revision, and cleanup fields to Agent runs.
- Added safe in-place column upgrades for an existing Agent run table.

#### App Codebase Changes

- Added one isolated Git branch and worktree for each writable Project Agent run.
- Kept Plan and read-only runs on the source checkout.
- Added repository allowlist and managed worktree root settings.
- Added runtime, tool-call, changed-file, and sub-agent budget enforcement.
- Added Codex turn interruption when a run exceeds a budget.
- Added workspace, branch, revision, and cleanup evidence to Run Control.
- Refused cleanup for active, unregistered, or dirty worktrees.
- Kept the run branch after clean worktree removal.

#### Verification

- Passed the full repository build.
- Passed the additive MariaDB migration and two API restart cycles.
- Passed the isolated worktree test with dirty cleanup refusal and branch retention.
- Passed a real Codex stream with durable history, workspace evidence, feedback, and actor isolation.
- Verified the Project Agent and Run Control layout at a 1920 by 1080 viewport.

### [Session] 2026-08-11 9:13 am - Durable Project Agent prototype

#### Database Changes

- Database update: Yes.
- Added Agent run, step, event, approval, artifact, and tool-call tables.
- Added actor and project indexes for Agent run history.
- Added foreign keys from runtime evidence to its owning Agent run.

#### App Codebase Changes

- Created one durable Agent run for each Codex turn.
- Added an explicit Agent run state machine.
- Added a provider-neutral tool catalog with access and risk metadata.
- Recorded Codex activity, approvals, changed files, completion, and failure evidence.
- Added actor-scoped Agent run list and detail APIs.
- Added the Project Agent Run Control lane with pipeline, budgets, approvals, activity, and files.
- Added a scale roadmap for worktrees, verification, delegation, models, nodes, and delivery.

#### Verification

- Added live end-to-end assertions for durable runs and actor isolation.
- Added runtime smoke assertions for the tool catalog.

### [Session] 2026-08-11 12:40 am - Skill Library references

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added the Skill Library workspace for repository-owned prompting and review knowledge.
- Added physical skill folders under `assist/skills/library`.
- Made `SKILL.md` an internal generated manifest and removed it from the file editor.
- Linked each user-managed reference file from the generated skill manifest.
- Added clear conflict errors for duplicate reference file names.
- Removed the floating Compact and Comfortable display control.
- Replaced manual reference file names with a local drive file picker.
- Copied selected Markdown content into the skill `references` folder without changing the source file.
- Limited imported reference files to 1 MB and kept duplicate uploads from overwriting existing files.
- Added the skill root to Agent IDE context so the agent can locate linked references.

#### Verification

- Passed DevKit API and web type checks, lint checks, and builds.
- Passed the module boundary check.
- Verified imported content, hidden manifest links, exports, and duplicate rejection with an isolated repository test.

## v-1.0.33

### [v 1.0.33] 2026-08-13 12:20 am - Production watcher configuration backup safety

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.33.

## v-1.0.32

### [v 1.0.32] 2026-08-12 8:45 pm - version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.32.

## v-1.0.31

### [v 1.0.31] 2026-08-12 8:37 pm - Local-first sync and production update watcher

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.31.

## v-1.0.30

### [v 1.0.30] 2026-08-12 12:37 pm - MariaDB deployment backup compatibility

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.30.
- Prevented `mariadb-dump` from loading unsupported client defaults during deployment backups.

#### Verification

- Passed the deployment script check and version check.
- Confirmed the failed `1.0.29` update did not replace the running containers.

## v-1.0.29

### [v 1.0.29] 2026-08-12 12:25 pm - Hostinger SSH connection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.29.
- Added a module-owned Hostinger SSH key generator and connection tester.
- Kept each private key in DevKit storage and sent only its public key to Hostinger.
- Added Hostinger VPS address discovery, attachment status, fingerprints, and connection evidence.
- Added the Hostinger SSH connection panel with key generation and live test controls.
- Used the installed Hostinger MCP package directly to avoid a slow command launcher.
- Restored the `updat.sh` compatibility alias required by the deployment check.

#### Verification

- Passed the DevKit API and web type checks and lint checks.
- Passed the module boundary check and Git diff validation.
- Created and attached the Ed25519 public key to VPS `914719`.
- Connected to `srv914719` as `root` and verified `/home/devkit` exists.

## v-1.0.28

### [v 1.0.28] 2026-08-12 11:49 am - Honey assistant, Telegram connection, and deployment runtime

#### Database Changes

- Database update: Yes.
- Published the Honey persistence and Telegram MTProto migrations described in the v 1.0.27 preparation record below.

#### App Codebase Changes

- Bumped repository version to 1.0.28.
- Published the complete Honey, Telegram, Hostinger, Project Agent, dashboard, navigation, branding, and container runtime change set.
- Kept the detailed codebase and verification record in the adjacent v 1.0.27 preparation entry.

## v-1.0.27

### [v 1.0.27] 2026-08-12 11:47 am - Honey assistant, Telegram connection, and deployment runtime

#### Database Changes

- Database update: Yes.
- Added actor-owned Honey conversation, message, and reviewed-memory tables.
- Added encrypted Telegram MTProto session fields and an authentication mode field.
- Kept the Honey and Telegram migrations additive and repeatable.

#### App Codebase Changes

- Bumped repository version to 1.0.27.
- Added the Honey assistant API, chat workspace, conversation history, reviewed memory, business knowledge, and provider-neutral Codex gateway.
- Added context-aware Honey action cards for projects, tasks, Project Agent, error help, and deployment review.
- Added Honey voice input with automatic submission after speech ends.
- Added the Honey mascot with smooth roaming, drag placement, stay mode, voice status, conversation reactions, and visibility controls.
- Added Honey links to the application menus and the Project Agent header.
- Added browser-based Telegram account connection with QR, phone, code, password, and encrypted session flows.
- Added Telegram task controls, chat, notifications, connection guidance, and environment settings.
- Added Hostinger MCP status, reload, metrics, Docker inventory, and detail workspaces.
- Added App Desk, dashboard, work overview, My Work, and compact work navigation surfaces.
- Updated the Project Agent panels, project context, run controls, and workspace layout.
- Updated CodeLogicX application branding, global search, app menus, user menus, side panels, and responsive layout behavior.
- Added persistent Codex state, repository, and worktree volumes to the container runtime.
- Added Git and unprivileged Agent runtime checks to setup and update scripts.
- Updated deployment documentation, environment templates, package contracts, and module-boundary checks.

#### Verification

- Passed the Honey action resolver regression.
- Passed both Honey mascot and voice browser tests.
- Passed focused DevKit API, DevKit web, UI, and Platform checks during implementation.
- Passed the module-boundary and version consistency checks.
- Passed the full repository typecheck, lint, Framework test, and production build.
- The aggregate check remains blocked because the deployment check still requires the removed root `updat.sh` file.

## v-1.0.26

### [v 1.0.26] 2026-08-12 11:29 am - Project Agent workspace navigation

#### Database Changes

- Database update: No.
- Kept the existing Project Agent chat, run, and project persistence contracts.

#### App Codebase Changes

- Bumped the repository and all workspace packages to 1.0.26.
- Added slim scrollbars to the Chat History and Run Control panels.
- Added accessible show and hide controls to both side panels.
- Moved the Run Control toggle to the left and improved its header spacing.
- Changed the left panel to show chat history without duplicate project details.
- Kept the selected project when a user opens an older chat history record.
- Moved project details into a compact dropdown in the Project Agent header.
- Changed the Project Agent heading to the selected project title.
- Matched the project information dropdown position and width to the Chat History panel.
- Added project status, access, model, description, module, reference, and conversation details.
- Removed stored HTML tags from project descriptions before display.
- Added an Agents side-menu group with Project Agent, Agent Connector, and Skills links.
- Renamed the existing Codex Runtime user interface to Agent Connector.

#### Verification

- Passed the DevKit web TypeScript and lint checks.
- Passed the Platform web TypeScript and lint checks.
- Passed the Git whitespace check for the changed Project Agent files.
- Verified project selection, chat history switching, panel controls, and the project information dropdown in a live browser.
- Verified a live read-only Project Agent reply for project `PRJ-0001`.
- Verified that the project information dropdown and Chat History panel both use a 288 px width.
- Verified that the browser console reported no errors during the interaction checks.

## v-1.0.25

### [v 1.0.25] 2026-08-11 5:04 pm - Repository connection catalog and workspace mapping

#### Database Changes

- Database update: Yes.
- Added the `devkit_repository_connections` table.
- Added repository display names, provider types, private base URLs, repository paths, and availability states.
- Applied the `devkit.project-manager.sql.v7` migration to `devkit_db`.

#### App Codebase Changes

- Bumped the repository and all workspace packages to 1.0.25.
- Added a Repository Connections settings page for GitHub and private Git repositories.
- Added support for multiple named repository connections.
- Kept Git base URLs in the settings page and removed them from the developer workspace flow.
- Changed project workspace setup to use local folders or approved repository names.
- Added a native Windows folder picker for local repositories and clone destinations.
- Added repository configuration and developer-safe repository list API routes.
- Added repository mapping, Git status, branch, changed-file, and package-version information.
- Kept repository cloning under Project Agent approval.

#### Verification

- Passed all workspace TypeScript and lint checks.
- Passed the full production build for the API, web, and desktop workspaces.
- Passed the database lifecycle check.
- Passed two composed API runtime smoke cycles.
- Passed the repository text encoding and Git diff checks.

## v-1.0.24

### [v 1.0.24] 2026-08-11 3:00 pm - Remove legacy business modules

#### Database Changes

- Database update: No.
- Kept existing database tables and records unchanged.

#### App Codebase Changes

- Removed the Deposit, Payment, Commission, Bank Account, and Trades Overview module surfaces.
- Kept only identity modules in the Platform API and web module roots.
- Renamed the host database, login, JWT, health, release, and SSH contracts to DevKit or Platform names.
- Removed unused compatibility clients, request context code, form code, and obsolete queue test code.
- Removed the Project Manager and Task Manager JSON seed databases and their boot-time import code.
- Made both modules start with empty MariaDB tables and use their APIs for all new records.
- Updated module boundaries, database lifecycle checks, package documentation, and project inventory.
- Bumped the repository and all workspace packages to 1.0.24.

#### Verification

- Passed the module-boundary and database-lifecycle checks.
- Passed all workspace TypeScript checks.
- Passed the Framework tests and package-contract checks.
- Passed the production build.
- Passed two composed API runtime smoke cycles.
- Confirmed that active source and tooling contain no removed module references.
- Confirmed that no Project Manager or Task Manager JSON database references remain.

## v-1.0.23

### [v 1.0.23] 2026-08-11 10:16 am - Project Agent execution and quality gates

#### Database Changes

- Database update: Yes.
- Added durable Agent runs, steps, events, approvals, artifacts, tool calls, and verification attempts.
- Added workspace, branch, revision, cleanup, verification, review, fingerprint, and commit state to Agent runs.
- Kept the migration additive for existing MariaDB installations.

#### App Codebase Changes

- Bumped repository version to 1.0.23.
- Added project-aware Codex chat with actor-isolated history, feedback, attachments, access modes, and streamed activity.
- Added an isolated Git branch and worktree for each writable Agent run.
- Kept Plan and read-only runs on the source checkout.
- Added repository allowlists, managed worktree storage, cleanup guards, and retained review branches.
- Added runtime, tool-call, changed-file, and sub-agent budgets with Codex turn interruption.
- Added shell-free registered quality gates with repeatable attempts and durable command evidence.
- Added return-for-rework state and a worktree fingerprint that blocks stale commit approval.
- Added a two-step human approval before local commits and kept all remote pushes manual.
- Added Run Control views for pipeline, workspace, approvals, activity, files, verification, review, and commit evidence.
- Added the Skill Library with hidden generated manifests, linked reference files, and local drive imports.
- Matched the CXApp `github:now` review flow with changelog subjects, optional version bump, Windows dialogs, and final Git confirmation.

#### Verification

- Passed the full repository build and repository check suite.
- Passed the additive MariaDB migration and two API restart cycles.
- Passed executor tests for isolation, budgets, registered commands, fingerprints, local commits, cleanup, and branch retention.
- Passed a real Codex stream with durable history, feedback, workspace evidence, and actor isolation.
- Verified Project Agent and Run Control at a 1920 by 1080 browser viewport.
- Passed the CXApp-pattern `github:now` dry run without Git mutation.

## v-1.0.22

### [v 1.0.22] 2026-08-01 1:54 pm - Version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.22.

## v-1.0.21

### [v 1.0.21] 2026-07-31 7:00 pm - Version update

#### Database Changes

- Database update: Yes.
- Consolidated generated `LEG-*` bank-account chains into their canonical accounts,
  preserving Deposit, Payment, ledger, and transfer links.

#### App Codebase Changes

- Bumped repository version to 1.0.21.
- Prevented linked Deposit and Payment bank labels from being re-imported as new
  legacy accounts during repeatable seeds, and normalized existing account links.

## v-1.0.20

### [v 1.0.20] 2026-07-31 6:04 pm - Version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.20.
- Made Verify and Settle reversible, icon-only controls in the final list columns
  across Deposits, Payments, and Commissions, with immediate toggling and no confirmation popup.

## v-1.0.19

### [v 1.0.19] 2026-07-31 1:59 pm - Transaction identity and dependency refresh

#### Database Changes

- Database update: Yes.
- Made Deposit, Payment, and generated Commission names and references optional.
- Moved Deposit and Payment uniqueness from reference values to normalized TG codes,
  with migration guards for blank or duplicate persisted codes.
- Added in-place verification and settlement lifecycle columns for existing Deposit,
  Payment, and Commission records; existing rows default to not verified and not settled.

#### App Codebase Changes

- Bumped the repository and all Trades-owned workspace packages to 1.0.19.
- Updated Deposit, Payment, and Commission API and web behavior to handle optional
  names and references while retaining TG-code fallbacks in lists, messages, and ledger entries.
- Made Trades Overview the landing workspace for every authenticated user while
  preserving administrator access to Platform identity settings.
- Refreshed the Node, Fastify, React, UI, editor, and TypeScript tooling dependencies.
- Adapted the shared workspace editors to the TipTap 3 extension and content-update APIs.

## v-1.0.18

### [v 1.0.18] 2026-07-31 5:42 am - deploment rework

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.18.

## v-1.0.17

### [v 1.0.17] 2026-07-30 11:22 pm - Trades conversion and CRUD stabilization

#### Database Changes

- Database update: Yes.
- Added and seeded the complete Trades permissions used by Bank Account, Deposit,
  Payment, ledger, reconciliation, and Commission lifecycle operations.
- Assigned the Trades business permissions to the local Platform roles.
- Verified the ordered Platform identity and Trades module migrations against
  `trades_db`.

#### App Codebase Changes

- Bumped repository version to 1.0.17.
- Corrected the Trades web client base URL to route requests through
  `/api/platform`.
- Removed the Frappe-dependent authentication path in favor of local Platform
  authentication and development auto-login.
- Stabilized the Vite React Refresh preamble used by the development loader.
- Verified create, list, read, update, activate, deactivate, settlement, statement,
  and force-delete behavior for Bank Accounts, Deposits, Payments, ledger entries,
  and Commissions.
- Confirmed that the CRUD verification removed its temporary records and restored
  the edited Commission variant.
