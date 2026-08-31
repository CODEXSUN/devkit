# Todo and Messenger Review Log

Date: 2026-08-30

Scope: Todo visibility, Todo compact controls, Task Manager persistence, and migration evidence.

## Outcome

The Todo visibility migration is additive, repeatable, and present in the live migration journal.
The live table matches the TypeScript schema for the reviewed fields.
Existing Todo rows remain intact and use private visibility.

The review found no release blocker in the reviewed migration.
Focused tests now cover the reviewed service, migration, sync, and dropdown behavior.
Authenticated UI checks remain incomplete.

## Completed Improvements

| Improvement         | Result                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Focused tests       | Added service, live migration, sync-row, and dropdown-navigation tests |
| Sync validation     | Rejects unsupported visibility and defaults old snapshots to private   |
| Reorder validation  | Rejects duplicate Todo IDs before repository updates                   |
| Component split     | Moved the form, option dropdown, and delete dialog into focused files  |
| Keyboard navigation | Supports arrows, Home, End, Escape, selection, and focus return        |
| Project validation  | Rejects project IDs that Project Manager cannot find                   |
| Input focus         | Focuses the title when Todo opens and shows focus on all Todo controls |
| Due date metadata   | Shows `dd-MM-yyyy` with past, today, or future relative text           |
| Status badges       | Shows compact semantic colors for common Todo statuses                 |
| Inline editing      | Uses a wide title lane and six compact icon controls                   |
| Inline date         | Uses a calendar icon while retaining the native date picker            |
| Todo reordering     | Uses tested before or after placement without changing row spacing     |

## Drag and Drop Review

| Area                  | Final design                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| Placement             | The pointer position above or below the row midpoint selects insertion side      |
| Visual feedback       | An absolute guide renders above or below the target without moving any rows      |
| Browser compatibility | The drag payload includes the Todo ID for browsers that require transferred data |
| Optimistic update     | The list moves immediately and rolls back only when the current save fails       |
| Response ordering     | A revision token prevents an older response from replacing a newer move          |
| Persistence           | The client sends the complete ordered ID list and the API writes one transaction |
| Test coverage         | Covers upward, downward, before, after, invalid, and self moves                  |

## Database Table Review

| Table                          | Owner              | Reviewed behavior                                                   | Result |
| ------------------------------ | ------------------ | ------------------------------------------------------------------- | ------ |
| `devkit_task_manager_todos`    | Task Manager       | Stores visibility, project, status, priority, order, and timestamps | Pass   |
| `devkit_task_manager_lookups`  | Task Manager       | Stores category, group, priority, and status choices                | Pass   |
| `devkit_task_manager_activity` | Task Manager       | Stores Todo and lookup audit events                                 | Pass   |
| `schema_migrations`            | Platform lifecycle | Records the module migration key and application time               | Pass   |

## Live Column Review

| Column         | Live type     | Null | Default           | Review                                  |
| -------------- | ------------- | ---- | ----------------- | --------------------------------------- |
| `uuid`         | `CHAR(8)`     | No   | None              | Matches the repository ID contract      |
| `scope_key`    | `VARCHAR(80)` | No   | None              | Matches the current single-client scope |
| `project_uuid` | `CHAR(36)`    | No   | Empty string      | Supports Todos without a project        |
| `status`       | `VARCHAR(24)` | No   | `open`            | Matches the service default             |
| `priority`     | `VARCHAR(24)` | No   | `medium`          | Matches the service default             |
| `visibility`   | `VARCHAR(16)` | No   | `private`         | Matches the API and service contract    |
| `position`     | `INT`         | No   | `0`               | Supports persisted ordering             |
| `created_at`   | `DATETIME`    | No   | Current timestamp | Matches the repository mapping          |
| `updated_at`   | `DATETIME`    | No   | Current timestamp | Uses the table update rule              |

The live table contained 14 Todo rows during review. All 14 rows had `private` visibility.

## Migration Review

| Check                      | Evidence                                                | Result                      |
| -------------------------- | ------------------------------------------------------- | --------------------------- |
| Migration key changed      | `devkit.task-manager.sql.v4`                            | Pass                        |
| Existing database upgrade  | Uses `ADD COLUMN IF NOT EXISTS`                         | Pass                        |
| Clean database setup       | The create statement includes `visibility`              | Pass                        |
| Existing data preservation | The migration does not delete or rewrite Todo rows      | Pass                        |
| Backfill behavior          | MariaDB applies the required `private` default          | Pass                        |
| Null handling              | The column is `NOT NULL`                                | Pass                        |
| Type mapping               | The database schema and repository include `visibility` | Pass                        |
| API validation             | Zod accepts only `private` or `public`                  | Pass                        |
| Migration journal          | The live journal contains the v4 key                    | Pass                        |
| Repeatability              | The migration and column operation are idempotent       | Pass                        |
| Rollback                   | No down migration exists                                | Accepted project convention |

## Code Review

| Area                   | Current state                                                              | Improvement                                                        |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Visibility meaning     | Public and private are labels inside one authenticated single-client scope | Document this clearly before any external sharing feature          |
| Input validation       | Visibility and project references are validated                            | Add bounded category, status, and priority schemas                 |
| Database validation    | The API restricts visibility values                                        | Add a database constraint if direct imports need strict protection |
| Sync import            | Todo visibility validates before insertion                                 | Extend owned validation to every synchronized table                |
| Automated tests        | Service, live migration, sync, and dropdown tests exist                    | Add authenticated route and clean-install tests                    |
| UI component size      | The form, dropdown, and dialog are separate                                | Extract the Todo row if its behavior grows further                 |
| Dropdown keyboard flow | Full list navigation and focus return work                                 | Add an authenticated browser accessibility check                   |
| Visibility filtering   | The browser filters the complete Todo list                                 | Add an API filter only when list size or access rules require it   |
| Reordering             | Duplicate IDs are rejected and unknown IDs are ignored                     | Add a filtered-list reorder browser test                           |
| Project links          | Non-empty IDs must match a Project Manager project                         | Add a database relation only with an approved deletion policy      |

## Recommended Order

1. Add authenticated Task Manager route tests.
2. Add a clean-database migration test in an isolated database.
3. Validate every synchronized table with an owned schema.
4. Add a browser accessibility test for Todo focus and dropdown behavior.
5. Add a filtered-list reorder browser test.

## Verification

- Passed `npm.cmd run check:database-lifecycle`.
- Passed `npm.cmd run typecheck --workspace @codexsun/devkit-api`.
- A final API typecheck rerun found four unrelated Messenger route signature errors.
- Passed `npm.cmd run lint --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run db:migrations:list` against `devkit_db`.
- Queried the live Todo table metadata and visibility row counts.
- The earlier focused Coworker Chat typecheck, lint, and Platform Web build passed.
- A final Coworker Chat rerun found concurrent Messenger symbol and unused-import errors.
- Passed 10 focused service, live migration, sync-row, and dropdown-navigation tests.
- An authenticated browser check did not run.
- A database-backed API behavior test did not run.
- A mobile emulator check did not run.
