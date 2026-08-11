# CodeLogicX Desktop

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
