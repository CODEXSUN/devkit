# Changelog

Current version: 1.0.22
Release tag: v-1.0.22
Changelog label: v 1.0.22

## Unreleased - Trades conversion

- Renamed the standalone application and deployment surface to Trades.
- Retained Platform local users, roles, permissions, and assignments.
- Composed Deposit, Payment, Bank Account, and Commission from migration through UI.
- Removed the copied external sales and identity integration features.

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
