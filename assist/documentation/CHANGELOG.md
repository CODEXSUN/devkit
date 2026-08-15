# Changelog

Current version: 1.0.51
Release tag: v-1.0.51
Changelog label: v 1.0.51

### [Session] 2026-08-14 - Navigation drawer and local editor runtime

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Removed the floating view-options toggle and spacing selector.
- Added a top-left application menu with an extensible side drawer.
- Added workspace, command, terminal, update, and Settings actions to the drawer.
- Moved the System, Light, and Dark theme selector into Settings.
- Bundled Monaco and its language workers with the application instead of loading them remotely.
- Preloaded Monaco while the workspace picker is open to reduce the first-file delay.
- Fixed the editor grid so Monaco always receives the available workbench height.
- Added explicit file-read and editor-start states.
- Prevented duplicate and stale file loads during rapid tab changes.
- Added smooth editor scrolling and caret movement.

#### Verification

- Passed the desktop TypeScript, ESLint, and production build checks.
- Confirmed the production build includes local Monaco editor and language workers.
- Passed Rust formatting, tests, and compilation checks.
- Verified file opening, drawer actions, and theme changes in the native application.
- Built the signed CodeLogix 1.0.43 Windows MSI and updater signature.

### [Session] 2026-08-14 - CodeLogix package identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Changed the package display name from CodeLogicX Desktop to CodeLogix.
- Changed the native window, landing screen, workspace, update center, and release labels to CodeLogix.
- Replaced the remaining visible Desktop labels with Local runtime and Updates.
- Kept the application identifier and updater signing keys unchanged for upgrade compatibility.
- Removed the gray border from the generated application logo.
- Regenerated the Windows, macOS, Android, iOS, and Store icon assets.

#### Verification

- Visually verified the borderless 512-pixel and 32-pixel icons.
- Passed the desktop TypeScript, ESLint, production build, Rust formatting, tests, and compilation checks.
- Built the signed CodeLogix 1.0.42 Windows MSI and updater signature.
- Verified the native release window uses the CodeLogix title and borderless logo.

### [Session] 2026-08-14 - CodeLogicX desktop application icon

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Replaced the default Tauri desktop icon with the blue four-panel mark used by the desktop landing screen.
- Added a desktop-owned SVG source with a high-contrast rounded tile.
- Generated Windows ICO and Store tiles, macOS ICNS, PNG, Android, and iOS icon assets from one source.
- Kept the web logo unchanged.

#### Verification

- Visually verified the generated 512-pixel and 32-pixel desktop icons.
- Built the signed version 1.0.41 Windows MSI and updater signature.
- Passed the desktop TypeScript, ESLint, production build, Rust formatting, test, and compilation checks.

### [Session] 2026-08-14 - Signed desktop updater and MSI lifecycle

#### Database Changes

- Database update: No.
- Preserved the desktop SQLite database during MSI updates and uninstall.

#### App Codebase Changes

- Added signed desktop update checks against the public GitHub release feed.
- Added background update downloads with progress status.
- Added an update center that waits for user approval before installation.
- Added passive MSI installation and app restart after a successful update.
- Standardized Windows distribution on one MSI installer lineage.
- Added minimum updater and process permissions to the main desktop window.
- Added a draft GitHub release workflow with MSI signatures and `latest.json`.
- Stored the updater private key outside the repository with a Windows-encrypted password.
- Added a local signed-release build command.
- Documented installer ownership, uninstall, recovery, signing, and release steps.

#### Verification

- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, tests, and compilation checks.
- Verified the update center in a clean live browser session.
- Verified the browser fallback keeps installation disabled and logs no errors.
- Built the version 1.0.40 MSI and updater signature.
- Verified the embedded public key matches the updater signature key identifier.
- Confirmed the public update feed remains unavailable until the first draft release is published.

### [Session] 2026-08-14 - Single desktop instance and embedded terminal

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Changed the Windows release executable to the GUI subsystem.
- Removed the extra console or Windows Terminal window during desktop startup.
- Added a single-instance guard for the desktop application.
- Focused and restored the existing window when the application starts again.
- Kept PowerShell inside the IDE terminal after a workspace opens.
- Kept the embedded terminal hidden on the workspace selection screen.

#### Verification

- Passed Rust formatting and compilation checks.
- Built the version 1.0.39 release executable.
- Verified two launches keep only one DevKit desktop process.
- Verified no Windows Terminal process starts with the release executable.
- Built the version 1.0.39 MSI and NSIS installers.

### [Session] 2026-08-14 - System theme and command workflow

#### Database Changes

- Database update: No.
- Saved the theme preference in local desktop storage.

#### App Codebase Changes

- Added Windows system, light, and dark theme options.
- Updated Monaco and terminal colors when the theme changes.
- Added a Ctrl+K command palette.
- Added commands for workspace selection, navigation, files, terminal, and themes.
- Added a local environment and branch summary to the title bar.
- Kept the editor and terminal engines outside the startup bundle.

#### Verification

- Verified system theme resolution in the live desktop web surface.
- Verified Ctrl+K command-palette opening and command rendering.
- Verified a theme command changes the active theme and closes the palette.
- Verified no browser console errors or horizontal overflow.
- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, tests, and compilation checks.
- Passed the repository text encoding and version checks.
- Built the version 1.0.38 MSI and NSIS installers.

### [Session] 2026-08-14 - Local Python and ML environment

#### Database Changes

- Database update: No.
- Kept Python environment state in the workspace and local runtime.

#### App Codebase Changes

- Detected Python project files and the available interpreter.
- Detected a workspace-local `.venv` and its Python version.
- Detected NVIDIA command-line tools without starting a GPU workload.
- Added guarded `.venv` creation inside the open workspace.
- Kept package and ML dependency installation explicit.
- Added Python environment status and creation controls to the runtime panel.
- Added guarded Git worktree creation and clean-worktree removal.

#### Verification

- Added native path and worktree-name policy tests.
- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting, test, and compilation checks.
- Passed the repository text encoding and version checks.
- Built the version 1.0.37 MSI and NSIS installers.

### [Session] 2026-08-14 - Local DevKit IDE MVP

#### Database Changes

- Database update: No.
- Kept desktop tasks and sync records in the existing local SQLite database.

#### App Codebase Changes

- Added a lazy workspace file tree and a multi-tab Monaco editor.
- Added dirty-file protection and Ctrl+S saves.
- Added bounded workspace text search.
- Added a native PowerShell terminal with Windows pseudoconsole support.
- Added Git status, diff, stage, unstage, commit, and worktree inventory.
- Added guarded worktree creation and clean-worktree removal.
- Added local task, runtime, Python, and project skill panels.
- Added external editor, File Explorer, and Windows Terminal launch actions.
- Added a desktop content security policy.
- Split the editor and terminal engines from the startup bundle.
- Aligned the desktop and repository versions at 1.0.36.

#### Verification

- Passed the desktop TypeScript check, ESLint check, and production build.
- Passed Rust formatting and compilation checks.
- Passed the repository text encoding and version checks.
- Verified the startup layout at 1280 by 720 with no browser console errors.
- Built and started the Windows release executable.
- Built the MSI and NSIS installers.

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

## v-1.0.51

### [v 1.0.51] 2026-08-15 8:13 pm - Named delegate restart recovery

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.51.

## v-1.0.50

### [v 1.0.50] 2026-08-15 7:37 pm - Named supervisor and delegate execution

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.50.
- Added actor-owned named Agent personas with supervisor and delegate roles.
- Added an explicit starter team that users can create and rename from Project Agent.
- Persisted supervisor selection on parent runs and delegate assignment on graph tasks.
- Changed task start into real Codex delegate execution inside the task-owned worktree.
- Added profile-based permission ceilings for planning, review, and security delegates.
- Enforced task file scopes after execution and failed delegates that changed unrelated paths.
- Added durable child activity, file, approval, result, and failure evidence.
- Added dependency evidence and child-worktree locations to the final supervisor review task.
- Added inline delegate approval controls while keeping human parent approval as the final gate.
- Fixed auto-approve sessions so Codex file and command approval requests are accepted only for
  that explicit access mode.
- Made the assigned child task authoritative instead of inheriting one-turn parent chat commands.
- Failed write-oriented delegates that report completion without producing a scoped file change.
- Persisted inspected worktree files as durable artifacts even when a streaming diff event is missed.
- Restored the selected Project Agent project after a browser reload.
- Added a repeatable named Agent team E2E test with an isolated temporary Git repository.

#### Verification

- Passed DevKit API and web TypeScript checks.
- Passed DevKit API and web ESLint checks.
- Passed database lifecycle and module boundary checks.
- Applied `devkit.agent-personas.sql.v1` to the live local MariaDB database.
- Verified the named team and assignment controls in the live Project Agent browser workspace.
- Created Atlas, Scout, Forge, Canvas, and Sentinel through the user action and persisted a
  supervised four-task graph.
- Called Scout from the graph and verified its durable child run advanced through planning,
  running, and completed before unlocking the dependent Forge and Canvas tasks.
- Passed the isolated named Agent team E2E against the built API, live MariaDB, and real Codex App
  Server: Forge and Canvas ran in parallel worktrees, changed only their assigned files, persisted
  artifacts, unlocked Atlas, completed the read-only supervisor review, and accepted final human
  approval.
- Verified an incompatible supervisor-to-coding-task assignment returns a conflict without changing
  the valid delegate.
- Created the supervised four-task graph from the live browser UI and confirmed the selected project,
  Atlas team, graph, and run control survive a full reload with no browser console errors.
- Did not run write-capable delegates against the dirty development checkout; all write E2E work used
  the temporary Git fixture.

## v-1.0.49

### [v 1.0.49] 2026-08-15 6:53 pm - Root deploy output collection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.49.
- Added one root desktop deployment folder under `dist/deploy/desktop/<version>/windows-x64`.
- Collected the runnable CodeLogix executable and the complete Codex runtime under the `app` folder.
- Bundled the Codex code-mode host, Windows sandbox setup, sandbox command runner, and ripgrep beside `codex.exe`.
- Added the bundled runtime directory to the Codex process path so tool and sandbox helpers resolve in development and installed builds.
- Made `CODELOGIX_WORKSPACE` take precedence over the remembered workspace for deterministic development and automated live tests.
- Removed the unsupported `excludeTurns` field when resuming persisted Codex App Server threads.
- Collected the MSI and updater signature under the `installer` folder.
- Generated a local Tauri `latest.json` updater manifest under the `updater` folder.
- Generated SHA-256 checksums and a machine-readable release manifest for every deployable file.
- Added a standalone publish command for an existing native release build.
- Made the signed release command check the root-only dependency and build-output boundary first.
- Added the root deploy folder to the GitHub Actions artifact output.
- Kept compiler caches under Tauri `target` while exposing deployable files only from root `dist`.
- Removed workspace-local `node_modules` folders and restored the repository root-only layout.

#### Verification

- Passed the repository root dependency and build-output boundary check.
- Published and inspected the complete desktop release folder from an existing build.
- Verified the release manifest, updater manifest, file sizes, and SHA-256 checksums.
- Ran CodeLogix against an isolated Git repository with a known failing test.
- Verified the live agent read `AGENTS.md`, reproduced the failure, edited only `src/cart.js`, passed the test, refreshed Git status, displayed the diff, persisted the task, and resumed it after restart.
- Reproduced missing Codex tool and sandbox helpers in the live application, bundled the required executables, and repeated the coding task through the Windows workspace-write sandbox without fallback approvals.
- Rebuilt the 1.0.49 MSI and Tauri updater signature after the runtime repair; the MSI SHA-256 is `3504bd00d797d89ca6d7134d112afb926959b86d8510618b7763ba53712c6794`.
- Verified every release-manifest byte count and SHA-256 digest. The MSI has a valid Tauri updater signature but is not yet Authenticode-signed by a Windows publisher certificate.

## v-1.0.48

### [v 1.0.48] 2026-08-15 6:42 pm - Reviewed project learning loop

#### Database Changes

- MariaDB update: No.
- Added desktop SQLite migration `0003_project_learning.sql`.
- Added workspace learning settings and reviewed project facts with evidence and status.

#### App Codebase Changes

- Bumped repository version to 1.0.48.
- Added a Project learning activity beside the Agent and Explorer activities.
- Detected facts from repository instructions, manifests, project paths, and skill roots.
- Required approval before a detected fact can enter the coding-agent context.
- Added rejection, approval reversal, automatic evidence rechecks, and stale-fact status.
- Returned changed approved facts to review before the agent can use them again.
- Kept the original user message in task history while sending approved facts in a separate context block.
- Added settings to disable context use or automatic rechecks for each workspace.
- Kept project learning local to the desktop SQLite database.
- Prevented the learning loop from editing project files, skills, instructions, or CodeLogix code.

#### Verification

- Passed desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed 5 frontend tests across 2 test files.
- Passed 8 native tests, including approval, context, evidence detection, and stale-fact behavior.
- Verified the Project learning activity, detected evidence, settings, counts, and review controls in the native application.
- Built the CodeLogix 1.0.48 Windows MSI and its 420-byte Tauri updater signature.
- Recorded MSI SHA-256 `7FDF0831AFE4D5DB5C65B99257DA45D66EFBC94C4E94D5413C8CD03992492CC2`.
- Confirmed that the updater is signed while the MSI itself remains without an Authenticode certificate.

## v-1.0.47

### [v 1.0.47] 2026-08-15 6:26 pm - Agent IDE toolchain foundation

#### Database Changes

- Database update: No.
- MariaDB schema update: No.
- Desktop SQLite schema update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.47.
- Audited the proposed agent IDE toolset against the existing DevKit owners and runtime boundaries.
- Added direct Zustand state management for desktop shell navigation, drawers, terminal visibility, command palette, and update center state.
- Added Zod validation at the Codex event boundary so malformed native payloads do not enter the React agent session.
- Added Vitest coverage for valid messages, malformed events, thread extraction, and tool activity normalization.
- Changed repository text search to prefer ripgrep JSON output with bounded results and a native recursive fallback when ripgrep is unavailable.
- Added ripgrep capability reporting to the local runtime panel.
- Documented the current, next, and deferred owners for MCP, LSP, Tree-sitter, vector search, LangGraph, model adapters, Docker, GitHub, jobs, realtime events, and observability.
- Kept BullMQ and Redis in the API delivery layer instead of adding them to the local desktop process.
- Deferred unused LangChain, LangGraph, language server, Tree-sitter, vector database, OpenTelemetry, and extra provider SDK dependencies until their owning services and acceptance tests are implemented.

#### Verification

- Installed the desktop dependencies with zero reported npm vulnerabilities.
- Passed desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed 3 desktop protocol tests.
- Passed Rust formatting, compilation, and 5 native library tests.
- Detected ripgrep 15.1.0 in the local runtime.
- Passed repository version consistency and whitespace checks.
- Built the CodeLogix 1.0.47 Windows MSI and its 420-byte Tauri updater signature.
- Recorded MSI SHA-256 `84BAAEA8A6DA5A857CACAA91902B9D88B71856D31773DC2306F98C5121251BF7`.
- Confirmed that the updater is signed while the MSI itself remains without an Authenticode certificate.

## v-1.0.46

### [v 1.0.46] 2026-08-15 6:14 pm - Durable CodeLogix agent tasks

#### Database Changes

- MariaDB update: No.
- Added the additive desktop SQLite migration `0002_agent_history.sql` for workspace-scoped
  agent tasks and message transcripts.

#### App Codebase Changes

- Bumped repository version to 1.0.46.
- Added native task and message persistence commands owned by the desktop runtime.
- Persisted task titles, Codex thread identifiers, access modes, timestamps, and full user/agent
  messages in the local desktop database.
- Added Recent tasks with an accessible empty state, active state, relative time, and guarded task
  switching while an agent is running.
- Reconnected saved tasks through the Codex App Server `thread/resume` contract.
- Restored the most recent workspace task and transcript when CodeLogix opens.
- Kept agent protocol parsing, session orchestration, and presentation in focused owner files.

#### Verification

- Passed desktop TypeScript and ESLint checks.
- Passed 4 Rust tests, including workspace-scoped task and message persistence.
- Verified the native CodeLogix window renders Recent tasks and keeps Codex connected.
- Verified the implementation against the generated schema from the bundled Codex App Server.
- Did not send an external Codex test prompt during UI verification.
- Built the CodeLogix 1.0.46 Windows MSI and updater signature without installing it.

## v-1.0.45

### [v 1.0.45] 2026-08-15 5:59 pm - Fast local-first CodeLogix startup

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.45.
- Replaced the sequential desktop startup waterfall with an immediate local-first workspace shell.
- Warmed one shared Codex runtime in the background and reused its startup promise across callers.
- Restored the recent workspace before Git status and file indexing finish.
- Loaded Git changes and workspace files concurrently with stale-result protection.
- Deferred Monaco and its language workers until the user opens Explorer.
- Added compact, non-blocking readiness states for agent startup, source control, file indexing, and
  workspace opening.
- Extracted desktop session orchestration and side-panel composition from the main shell.

#### Verification

- Passed the desktop TypeScript and ESLint checks after the startup refactor.
- Passed the desktop production build, Rust formatting, 3 Rust tests, and Rust compilation.
- Passed repository version consistency and whitespace validation.
- Verified the native CodeLogix window restores the DevKit workspace and connects to Codex.
- Verified Explorer remains the second activity and triggers the deferred editor load.
- Verified `package.json` opens and renders in the embedded Monaco editor.
- Built the CodeLogix 1.0.45 Windows MSI and updater signature without installing it.

## v-1.0.44

### [v 1.0.44] 2026-08-14 10:35 am - Agent-first CodeLogix workspace

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.44.
- Made Agent the first and default desktop activity and moved Explorer to the second position.
- Added a Codex-style task history rail, focused conversation surface, and environment inspector.
- Added a native Codex App Server process bridge using the stable JSON-RPC thread and turn flow.
- Bundled the platform Codex engine as a Tauri sidecar so the installed app does not depend on a
  separately executable Windows Store binary.
- Added streamed Agent replies, command and file activity, unified diff evidence, and run status.
- Added workspace-write and read-only modes with network access disabled by default.
- Added command and file approval cards with allow-once, allow-for-task, and decline decisions.
- Added turn interruption, new-task creation, starter prompts, Git context, and direct file opening.
- Kept the integrated terminal, editor, Git worktrees, search, tasks, skills, Docker, and updater.
- Reopen the most recent valid workspace automatically and support `CODELOGIX_WORKSPACE` for a
  deterministic local launch.

#### Verification

- Passed desktop TypeScript and ESLint checks.
- Passed the desktop Vite production build with locally bundled Monaco workers.
- Passed Rust compilation for the Tauri App Server bridge.
- Passed three Rust library tests for Git worktree names and workspace-local Python environments.
- Launched the native CodeLogix window and verified workspace loading, the agent-first layout, and
  Explorer in the second activity position.
- Verified a live Codex App Server turn returned `This workspace is DevKit.` without changing files.
- Built the `CodeLogix_1.0.44_x64_en-US.msi` installer and its Tauri updater signature with the
  bundled Codex engine.

## v-1.0.43

### [v 1.0.43] 2026-08-14 10:10 am - CodeLogix navigation drawer and local editor

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.43.
- Replaced the floating view toggle with the application drawer and repaired local file editing.

## v-1.0.42

### [v 1.0.42] 2026-08-14 9:53 am - CodeLogix package identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.42.
- Changed the package display name to CodeLogix and removed the application logo border.

## v-1.0.41

### [v 1.0.41] 2026-08-14 9:43 am - CodeLogicX desktop application icon

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.41.
- Replaced all generated Tauri platform icons with the blue CodeLogicX Desktop application mark.

## v-1.0.40

### [v 1.0.40] 2026-08-14 8:54 am - Signed desktop updater and MSI lifecycle

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.40.

## v-1.0.39

### [v 1.0.39] 2026-08-14 8:36 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.39.

## v-1.0.38

### [v 1.0.38] 2026-08-14 8:30 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.38.

## v-1.0.37

### [v 1.0.37] 2026-08-14 8:17 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.37.

## v-1.0.36

### [v 1.0.36] 2026-08-14 8:07 am - Version update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.36.

## v-1.0.35

### [v 1.0.35] 2026-08-13 8:09 am - Secure dependencies and automatic watcher execution

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.35.

## v-1.0.34

### [v 1.0.34] 2026-08-13 2:01 am - Honey voice chat and history controls

#### Database Changes

- Database update: No.
- Used the existing Honey thread status field to retain archived conversations.

#### App Codebase Changes

- Bumped repository version to 1.0.34.
- Sent completed mascot voice transcripts to the persisted Honey chat service.
- Added listening, thinking, success, and error reactions for mascot voice requests.
- Opened the three-message quick chat after Honey answers a mascot voice request.
- Hid the welcome balloon while quick chat is open.
- Limited the welcome balloon to one display per browser tab session.
- Kept Honey above the Documentation navigation and anchored it near the top of the menu.
- Added an accessible archive action on hover and keyboard focus for each chat history row.
- Removed archived conversations from active history without deleting their messages.

#### Verification

- Passed the DevKit API and web TypeScript checks.
- Passed the DevKit API and web lint checks.
- Passed the UI TypeScript and lint checks.
- Passed the Honey mascot Playwright test for voice chat and hover behavior.
- Passed the repository version consistency check.

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
