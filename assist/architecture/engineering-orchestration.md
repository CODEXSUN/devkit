# Engineering Orchestration

The longer-term local-first, hybrid, multi-node platform design is recorded in
`future-platform-blueprint.md`. That blueprint is planned work; the current-state boundaries in
this document remain authoritative until individual phases are approved and implemented.

## Naming Contract

CodeLogicX is the external product and brand label. `devkit` is the internal technical name and is
not renamed. The stable technical contract includes workspace packages, `/app/devkit/*` browser
routes, `/api/devkit/*` API routes, `devkit.*` permissions, `DEVKIT_*` environment keys, database
objects, module keys, storage paths, and deployment resource names.

## Current Product Boundary

The current application is a standalone, single-client modular monolith backed by one MariaDB
database. Platform owns authentication, identity, executable servers, database connection, and
composition. DevKit modules own all engineering product behavior.

The first orchestration slice is deliberately operationally honest:

- the Engineering Command Center combines live project, task, review, repository, and check
  signals already owned by DevKit;
- the orchestration API publishes schema-validated lifecycle stages, Assist modes, initial agent
  profiles, permission ceilings, and human-approval boundaries;
- agent profiles are definitions, not executable autonomous agents;
- preview, deployment, model routing, budgets, and isolated execution remain visibly planned until
  their runtimes and evidence exist.

No new persistence is required for this read-only catalog. Runtime records must receive an owning
module, additive migration, repository, authorization rules, and repeatable seed only when a later
phase makes them executable.

## Target Architecture

Project is the primary engineering context. The lifecycle is Plan, Develop, Source, Test, Review,
Preview, Deploy, and Observe. Future orchestration should add these capabilities in bounded phases:

1. workflow and run records with explicit state transitions, audit events, budgets, and approvals;
2. a provider-neutral model gateway where agents request capabilities rather than selecting vendor
   SDKs directly;
3. schema-validated tool contracts with permission checks and isolated branch or worktree execution;
4. preview, deployment, rollback, monitoring, and outcome feedback;
5. Organization, Workspace, Project, Environment, and granular membership boundaries only through
   an explicit tenancy design and migration.

Multi-user isolation is a target architecture, not a current claim. It must not be simulated with a
selector or a second application shell. Adding it requires an architecture decision that covers
identity, row ownership, authorization, migration of existing records, storage isolation, audit,
background jobs, and deployment compatibility.

## Control Rules

- Humans approve production, infrastructure, DNS, secrets, destructive data, and protected-branch
  operations.
- Every executable run must record project context, actor, agent profile, Assist mode, permission
  ceiling, tool calls, model route, cost or resource budget, results, and approvals.
- Parallel work must use bounded isolated checkouts and merge only after conflict and quality gates.
- Local and remote models are interchangeable policy choices; privacy rules constrain fallback.
- The existing guarded updater remains the deployment path. Application image rollback does not
  reverse database migrations or seeds.
