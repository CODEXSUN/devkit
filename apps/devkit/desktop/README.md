# CodeLogix

This workspace owns the standalone React, Tauri, and Rust desktop IDE.

## Ownership

- React owns the IDE shell and all desktop presentation modules.
- Rust owns files, Git, terminal processes, Docker, SQLite, and DevKit synchronization.
- The desktop app calls DevKit through the configured public API contract.
- The app does not import Platform or DevKit private source paths.

## Commands

Run `npm.cmd run desktop:check` to verify the React application.

Run `npm.cmd run desktop:dev` after Rust and the Tauri Windows prerequisites are installed.

Run `npm.cmd run desktop:build` to create the signed desktop bundle after signing is configured.

## Implemented foundation

- workspace-scoped file browsing with lazy directory expansion;
- an agent-first workspace with Agent first and the file browser second;
- an instant local-first shell that restores the workspace before background Git, file indexing,
  and agent startup finish;
- one shared, background-warmed Codex runtime and a Monaco editor loaded only when Explorer opens;
- a bundled Codex App Server sidecar over JSON-RPC with streamed turns and reusable threads;
- workspace-scoped agent tasks and messages persisted in desktop SQLite;
- recent-task switching with saved transcripts and Codex thread resume;
- read-only and workspace-write agent modes with command and file approval cards;
- streamed agent messages, command activity, changed-file evidence, diffs, and interruption;
- Monaco multi-tab editing, dirty-state protection, and Ctrl+S saves;
- bounded recursive workspace text search;
- ripgrep-first workspace search with a bounded built-in fallback;
- Zod validation for Codex events before they enter desktop state;
- a small Zustand store for shared shell and panel state;
- Git status, diff, stage, unstage, commit, and guarded worktree management;
- native PowerShell terminal sessions backed by the Windows pseudoconsole;
- Node.js, Python, Docker, Git, and WSL capability detection;
- project Python metadata, interpreter, virtual environment, and NVIDIA tool detection;
- guarded workspace-local `.venv` creation without automatic package downloads;
- repository and project skill discovery;
- reviewed project learning with repository evidence, approval, rejection, and stale-fact detection;
- approved project facts added to agent context without changing the visible user request;
- local SQLite tasks and outbound DevKit synchronization contracts;
- detected external-editor, File Explorer, and Windows Terminal launching;
- compact and relaxed workspace density;
- Windows system, light, and dark themes with a saved local preference;
- a Ctrl+K command palette for workspace views, files, terminal, and appearance;
- a local environment summary with branch context;
- one desktop process with repeat-launch focus behavior;
- no external console window in release builds;
- signed update checks and background downloads;
- user-approved passive MSI installation and app restart;
- one MSI installer and Windows-managed uninstaller lineage;
- Vitest coverage for the desktop protocol boundary.

See `assist/documentation/desktop-release.md` for signing, release, update, and uninstall steps.
The release command collects deployable files under `dist/deploy/desktop/<version>/windows-x64`.

The coding agent bundles the matching native Codex engine and uses the local Codex authentication
profile. `CODELOGIX_CODEX_BIN` can override the engine during development. Language servers,
debugger adapters, non-OpenAI model-provider authentication, and Python dependency profiles remain
later milestones.
