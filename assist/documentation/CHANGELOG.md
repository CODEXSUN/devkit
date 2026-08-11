# Changelog

Current version: 1.0.23
Release tag: v-1.0.23
Changelog label: v 1.0.23

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
