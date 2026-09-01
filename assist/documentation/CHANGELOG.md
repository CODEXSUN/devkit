# Changelog

Current version: 1.0.98
Release tag: v-1.0.98
Changelog label: v 1.0.98

## v-1.0.98

### [v 1.0.98] 2026-09-01 10:24 pm - Messenger contacts and role boundaries

#### Database Changes

- Database update: Yes.
- Added migration marker `identity.user.developer-role-v6`.
- Migrated non-protected users whose primary role was `user` to `developer`.
- Seeded the protected `developer` role and its default permitted DevKit feature assignments.
- Reconciled non-protected user-role assignments so only the user's primary role remains active.
- Expanded Administrator access to business features and ordinary identity management while withholding destructive identity permissions.
- Kept the protected Super Administrator account, role, and unrestricted permissions unchanged; recovery uses the retained database backup because application rollback does not reverse role data changes.

#### App Codebase Changes

- Bumped repository version to 1.0.98.
- Corrected Messenger contact and profile requests behind the production `/api/platform` proxy.
- Preserved independently loaded contacts, profile, and conversations when one startup request fails.
- Hid the protected Super Administrator account and role from Administrator API results and chat contacts.
- Defined Super Administrator, Administrator, and Developer responsibilities in the protected role seeds.
- Added a visible `New idea` action that opens a recoverable global idea draft.
- Allowed manual global ideas while retaining Agent-only creation for project-scoped ideas.

#### Verification

- Passed the focused Messenger client test with 9 tests.
- Passed typecheck and lint for Coworker Chat, Platform API, and DevKit API.
- Passed Platform web typecheck and lint.
- Passed the complete production build for framework, UI, DevKit API/web, Platform API/web, and desktop.
- Passed the release scope inventory, repository version check, whitespace validation, and GitHub helper dry run.
- Production database migration, seed, build, Socket.IO handshake, browser contact list, and Ideas workflow are pending guarded deployment.

## v-1.0.97

### [v 1.0.97] 2026-09-01 5:56 pm - Developer IDs and session reliability

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.97.
- Added optional developer technical-ID overlays to DevKit web and desktop.
- Replaced long technical-ID labels with compact numbered markers that copy the full ID.
- Shifted overlapping technical-ID markers into the next clear position.
- Loaded the desktop developer-ID setting from the repository root environment file.
- Routed the web Messenger workspace through the Platform API proxy instead of the SPA fallback.
- Added a clear error when the Settings API returns a non-JSON response.

#### Verification

- Passed focused typecheck and lint checks for UI, Coworker Chat, and Platform web.
- Passed the desktop check with typecheck, lint, 42 tests, and a production build.
- Passed the release scope inventory, repository version check, and whitespace validation.
- Built and signed the Windows MSI and setup EXE for version 1.0.97.
- Passed the desktop release artifact, signature, checksum, and updater manifest check.
- Confirmed the GitHub release helper dry run before publication.

## v-1.0.96

### [v 1.0.96] 2026-09-01 3:21 pm - Cloud agent execution and desktop links

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.96.
- Added a cloud execution boundary for project-aware agent chats.
- Cloud now requires a connected desktop execution node before it opens a project repository.
- Cloud no longer returns a raw Git repository error when no desktop node is connected.
- Desktop now opens connection and Codex authentication URLs through the native Tauri opener.
- Added copy-link actions for manual cloud connection and device verification.
- Added `release:next` for the existing version, changelog, commit, and push workflow.

#### Verification

- Passed `npm.cmd run typecheck --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run lint --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run typecheck --workspace @codexsun/coworker-chat`.
- Passed `npm.cmd run lint --workspace @codexsun/coworker-chat`.
- Passed `npm.cmd run typecheck --workspace @devkit/desktop`.
- Passed `npm.cmd run lint --workspace @devkit/desktop`.
- Passed `cargo check --locked --package devkit-desktop`.
- Confirmed the local desktop development surface responds on port 1420.
- Confirmed `https://devkit.codexsun.com/connect` and `/health` responded before deployment.
- Passed `npm.cmd run check:versions` and `git diff --check`.
- VPS deployment requires an accepted SSH identity for `69.62.81.166`; the guarded deployment command reports a clear block when that identity is unavailable.

## v-1.0.95

### [v 1.0.95] 2026-09-01 2:41 pm - Agent database access policy

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.95.
- Added the `devkit-database-access` agent skill for local and managed VPS database work.
- The skill discovers connection details from runtime configuration without exposing credentials.
- The skill requires read-only inspection first and explicit approval for each persistent change.
- The skill blocks destructive, broad, or ambiguous database operations.
- Cloud runtimes now reject all Skill Library writes and keep skills read-only.
- Anonymous agent access now directs requesters to sign in or contact an administrator.
- A cloud Skill Library override now requires a Super Administrator role, an emergency reason, and a verified one-way emergency-key hash.
- The Connection Service page now opens the cloud device-code page through a secure link activation.
- Added `release:manual`, which reuses the repository release checks, GitHub commit flow, and guarded VPS updater.

#### Verification

- Passed `npm.cmd run typecheck --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run lint --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run typecheck --workspace @devkit/platform-api`.
- Passed `npm.cmd run lint --workspace @devkit/platform-api`.
- Passed `npm.cmd run check:database-lifecycle`.
- Passed `npm.cmd run check:versions`.
- Passed `npm.cmd run db:seed` against the local DevKit database.
- Passed `node --check tools/manual-release-deploy.mjs`.
- Passed `npm.cmd run release:manual` in check-only mode, including its release-scope and GitHub dry-run gates.
- Passed `npx.cmd prettier --check tools/manual-release-deploy.mjs package.json assist/documentation/CHANGELOG.md`.
- VPS deployment is performed only by `release:manual -- --deploy --yes` after the local release checks pass.

## v-1.0.94

### [v 1.0.94] 2026-09-01 2:28 pm - One-time device pairing and cloud sync

#### Database Changes

- Database update: Yes.
- Updated the repeatable `devkit.sync.sql.v1` migration.
- Added `devkit_sync_tokens.token_kind` and `devkit_sync_tokens.expires_at` without changing existing token rows.
- Pairing codes use `token_kind = pairing`, expire after ten minutes, and change to `consumed` after one successful exchange.
- Device secrets use `token_kind = device`. Existing device tokens remain active and continue to work.
- No seed or data transformation runs. The additive migration is safe to run again.

#### App Codebase Changes

- Bumped repository version to 1.0.94.
- Added a cloud pairing endpoint that exchanges a signed-in web code once for a separate device secret.
- Stored only the encrypted device secret on the local installation. The one-time code cannot authorize later sync requests.
- Updated web, desktop, mobile, and cloud connection text to distinguish one-time codes from connected devices.
- Added a green paired-device card for the bound connection state.

#### Verification

- Passed DevKit API typecheck and lint.
- Passed DevKit Web typecheck and lint.
- Passed shared coworker-chat typecheck and lint.
- Passed Platform Web typecheck and lint.
- Passed Platform Web production build with the existing large-chunk warning.
- Passed desktop typecheck, lint, and 42 tests.
- Passed an isolated desktop production build. The standard desktop build output was locked by the active Tauri development session.
- Passed `npm.cmd run check:module-boundaries`, `npm.cmd run check:database-lifecycle`, and `git diff --check`.
- Confirmed the currently deployed cloud rejects an unsigned status request with `401`.
- Confirmed the currently deployed cloud does not yet include the new pairing endpoint. It returned `404` before this release.
- Pending the guarded VPS Docker update and signed-in browser-to-device pairing check.

## v-1.0.93

### [v 1.0.93] 2026-09-01 1:58 pm - Ideas workflow and device authentication

#### Database Changes

- Database update: Yes.
- Added migration marker `identity.user.super-admin-v5`.
- Normalized legacy `super_admin` and `superadmin` user roles to `super-admin`.
- Seeded the protected Super Administrator role with all active permissions.
- Limited the Administrator role to protected `identity.*` permissions and deactivated its other protected assignments.

#### App Codebase Changes

- Bumped repository version to 1.0.93.
- Added a protected Super Administrator role for the deployed device-authentication and administration flow.
- Kept protected Super Administrator permissions and assignments out of editable role forms.
- Updated initial administrator setup values and labels for the protected account.
- Narrowed the public cloud-sync route match so anonymous callers cannot create desktop connection codes through an admin route.
- Limited Ideas to Agent-posted `discussion` records with `type: idea` and prevented duplicate Agent shares for one project.
- Kept schema, architecture, notes, modules, tasks, reviews, and changelog records out of the Ideas list.
- Refined Ideas status, tags, list spacing, manual save behavior, local whiteboard recovery, and discard actions.
- Added `devkit-agent-posting` guidance and the `devkit-commit-deploy-watch` release skill.
- Classified DevKit API, workspace, Platform identity, and container files in the release-scope report.

#### Verification

- Passed DevKit API typecheck and lint.
- Passed shared coworker-chat typecheck and lint.
- Passed Platform API typecheck and lint.
- Passed the Platform Web production build with the existing large-chunk warning.
- Passed `npm.cmd run desktop:check`, including desktop typecheck, lint, 42 tests, and production build.
- Passed deployment, module-boundary, and database-lifecycle checks.
- Passed `npm.cmd run check:versions`, `npm.cmd run release:scope`, `npm.cmd run github:now -- --dry-run`, and `git diff --check`.
- Confirmed the pre-release public cloud token endpoint returned `200` without a session. The release contains the authorization fix.
- Pending guarded VPS deployment and post-deployment public web and desktop pairing checks.

## v-1.0.92

### [v 1.0.92] 2026-09-01 1:19 pm - Cloud device connection flow

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.92.
- Added the signed-in cloud `/connect` page, which creates a one-time pairing code and QR representation without placing credentials in the URL.
- Made desktop and mobile pairing use fixed runtime identities, a selectable cloud origin, and a browser handoff to retrieve a connection code.
- Persisted the approved cloud origin with the encrypted sync connection and reused it for verify, publish, pull, and project-transfer requests.
- Expanded the App workspace shell to use the unified Messenger navigation for its primary product pages and to retain selected chat, project, and project-tab routes.
- Improved agent device-code sign-in with copy, open-verification, automatic three-second status refresh, and clearer connected-state feedback.

#### Verification

- Passed `npm.cmd --workspace @codexsun/devkit-api run typecheck`.
- Passed `npm.cmd --workspace @codexsun/devkit-api run lint`.
- Passed `npm.cmd --workspace @codexsun/coworker-chat run typecheck`.
- Passed `npm.cmd --workspace @codexsun/coworker-chat run lint`.
- Passed `npm.cmd --workspace @devkit/platform-web run build` (with the existing large-chunk warning).
- Passed `npm.cmd --workspace @devkit/mobile run typecheck`.
- Passed `npm.cmd --workspace @devkit/mobile run lint -- --quiet`.
- Pending guarded VPS deployment and authenticated browser pairing verification.

## v-1.0.91

### [v 1.0.91] 2026-09-01 1:07 pm - Identity API path rewrite

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.91.
- Rewrote the public same-origin identity path before proxying so it reaches the Platform API identity routes.
- Made the cloud web runtime identify as `web-devkit` and issue connection credentials from the signed-in `/connect` page.
- Made desktop and mobile identify as `desktop-devkit` and `mobile-devkit` without a device-name field.
- Added a QR representation beside the 16-character connection code.
- Kept the connection credential out of the `/connect` URL.
- Limited cloud page device labels to the known desktop and mobile runtime identities.
- Removed manual credential creation from the cloud Connect Service panel.

#### Verification

- Passed `npm.cmd run check:deployment`.
- Passed `npm.cmd run check:module-boundaries`.
- Passed `npm.cmd run check:versions`.
- Passed `npm.cmd run release:scope`.
- Passed `git diff --check`.
- Passed the shared coworker-chat typecheck and lint.
- Passed the Platform Web production build.
- Passed the mobile typecheck and focused connection-page lint.
- Pending deployed verification of QR and code linking on the cloud runtime.

## v-1.0.90

### [v 1.0.90] 2026-09-01 12:57 pm - Chat identity proxy route

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.90.
- Proxied same-origin identity routes to the Platform API so shared Messenger contacts and profile calls no longer fall through to the SPA document.
- Added a separate `/connect` cloud page that creates a connection code for the requested device after sign-in.
- Added `https://devkit.codexsun.com` as the default connection domain for desktop, web, and mobile.
- Added a cloud domain override to the desktop, web, and mobile Connect Service pages.
- Opened `<cloud-domain>/connect?device=<name>` from each local Connect Service page.
- Stored the normalized cloud origin with the encrypted connection token.
- Used the stored cloud origin for verify, publish, pull, and project connection requests.
- Preserved the existing bind request contract by using the default domain when `cloudUrl` is absent.
- Returned users to the `/connect` page after a required cloud sign-in.

#### Verification

- Passed DevKit API typecheck, lint, and build.
- Passed shared coworker-chat typecheck and lint.
- Passed Platform Web production build.
- Passed mobile and desktop typechecks plus focused mobile lint.
- Passed three sync row-validation tests.
- Passed `git diff --check`.
- Pending deployment verification of authenticated identity, Messenger, and whiteboard requests.
- Pending deployed verification of the cloud `/connect` flow.

## v-1.0.89

### [v 1.0.89] 2026-09-01 12:45 pm - Chat same-origin API routes

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.89.
- Made the shared chat shell use the same-origin API root instead of treating the platform proxy prefix as an origin.
- Restored correct Messenger Socket.IO, contacts, profile, and whiteboard route composition in the browser shell.

#### Verification

- Pending focused platform-web verification and production browser checks after deployment.

## v-1.0.88

### [v 1.0.88] 2026-09-01 12:29 pm - Live Messenger WebSocket proxy

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.88.
- Forwarded WebSocket upgrade headers through the DevKit API proxy so Messenger sockets can connect through the public web origin.

#### Verification

- Pending local quality checks and a production WebSocket handshake after the corrected proxy image is deployed.

## v-1.0.87

### [v 1.0.87] 2026-09-01 12:13 pm - Docs module release gate

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.87.
- Registered the existing DevKit API Docs module in the repository-boundary quality gate.
- Allows production verification and deployment to recognize the module already composed by DevKit.

#### Verification

- Passed `npm.cmd run check`, including deployment, boundary, database lifecycle, typecheck, lint, and framework tests.
- Passed `npm.cmd run release:scope`, `npm.cmd run check:versions`, and `git diff --check`.
- Passed `npm.cmd run github:now -- --dry-run` with commit subject `#87 - Docs module release gate`.
- GitHub release publication was not requested.
- VPS deployment and live checks are pending after the corrected commit is pushed.

## v-1.0.86

### [v 1.0.86] 2026-09-01 11:44 am - Project planning workspaces

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.86.
- Added project Modules with list, create, edit, status, hierarchy, route, and planning fields.
- Restricted project records and attachments to associated users, with administrator access across projects.
- Added an Identity-backed multi-user selector to the project editor.
- Added a visual Architect planner with draggable blocks, properties, and saved connectors.
- Added project White Board files with Excalidraw, file lists, multiple boards, and saved scenes.
- Added a visual Schema planner with table columns, relation properties, cardinality, and review states.
- Added contextual Add actions for each supported Project tab.
- Added compact Project Overview counts from Modules through Changelog.
- Made every Project tab and editor full width with responsive layouts.
- Kept one separator and one consistent gap between Project tabs and their workspaces.
- Added authenticated Super Admin routes for identity, application features, and updates.

#### Verification

- Passed `npm.cmd run check:versions` after completing this entry.
- Passed Coworker Chat typecheck, lint, and build checks.
- Passed the Platform Web production build with existing large-chunk warnings.
- Passed two focused Project Manager access tests.
- Passed two focused planning scene tests.
- Confirmed the live Vite server returns the Project Overview and White Board modules with HTTP 200.
- Passed `git diff --check` for the changed workspace.
- `npm.cmd run release:scope` found 76 changed paths, including 60 unclassified paths from the shared worktree.
- The mixed unclassified scope blocks a commit, tag, release, or deployment.
- Passed `npm.cmd run github:now -- --dry-run` with commit subject `#86 - Project planning workspaces`.
- Did not run an authenticated browser or live database check for the final Project workspace state.
- Did not publish a GitHub release or update the VPS.

## v-1.0.85

### [v 1.0.85] 2026-08-30 8:34 am - Messenger and Agent Chat workspace navigation

#### Database Changes

- Database update: Yes.
- Added migration `devkit.orchestration-chat.sql.v5`.
- Added migration `devkit.task-manager.sql.v4`.
- Added migration `devkit.messenger.sql.v5`.
- Added migration `devkit.messenger.sql.v6`.
- Added `devkit_messenger_attachments` for private message file metadata and storage references.
- Added `devkit_messenger_reactions` for actor-owned emoji reactions.
- Added `devkit_messenger_conversations` with conversation type, title, creator, and update timestamps.
- Added `devkit_messenger_participants` with participant, read, mute, archive, and join timestamps.
- Added `devkit_messenger_activity` with actor, conversation, action, structured details, and creation timestamps.
- Added nullable `devkit_messenger_messages.conversation_uuid` for compatibility with existing messages.
- Added nullable `devkit_messenger_messages.delivered_at` and `read_at` receipt timestamps.
- Added conversation and participant indexes for message history, actor lookup, unread counts, and recent conversation ordering.
- Added activity indexes for conversation history and actor audit review.
- Existing device and direct messages attach to deterministic conversations when an actor opens that conversation.
- The Messenger migration preserves message bodies, clients, actors, recipients, and timestamps.
- Added nullable column `devkit_orchestration_chat_threads.pinned_at` after `status`.
- Added `devkit_task_manager_todos.visibility` with a required `private` default.
- Updated new table creation to include `pinned_at` for clean database setup.
- The migration preserves existing chat threads and does not backfill pinned state.
- The Todo migration preserves existing rows and assigns `private` visibility through the column default.
- Confirmed `devkit.task-manager.sql.v4` in the `devkit_db.schema_migrations` journal.
- Confirmed the live `visibility` column is `VARCHAR(16) NOT NULL DEFAULT 'private'`.
- Confirmed all 14 existing Todo rows have `private` visibility after migration.

#### App Codebase Changes

- Bumped repository version to 1.0.85.
- Added pinned and archived Agent Chat navigation for the shared web and desktop workspace.
- Added project cards and project-based Agent Chat history groups to the shared workspace.
- Added mobile project browsing, repository connection, chat search, pinning, and archiving.
- Added private and public Todo visibility controls for web, desktop, and mobile.
- Added actor-owned device conversations and two-person direct conversations to Messenger.
- Added participant authorization before Messenger reads, writes, and read-state changes.
- Added a host-provided active-user check that rejects unknown or inactive direct-message recipients.
- Added participant mute and archive preference endpoints for conversation-list controls.
- Stored conversation creation, message send, unread-to-read, mute, and archive actions in the Messenger activity journal.
- Avoided repeated read activity writes when a conversation has no unread messages.
- Added searchable desktop and web conversation lists with last-message previews, unread badges, mute controls, and archive controls.
- Added the searchable mobile conversation switcher with direct chats and unread badges.
- Added sent, delivered, and read receipt labels for outgoing messages on web, desktop, and mobile.
- Added a compact conversation activity viewer backed by the stored Messenger activity journal.
- Added durable conversation summaries with the last message, unread count, mute state, archive state, peer, and update time.
- Added an authenticated active-user contact lookup without identity administration access.
- Added a compact plus action beside Messenger contact search that opens a searchable user picker and creates or opens a private conversation.
- Widened the shared Messenger and Agent drawers and added a 2px inner inset so search actions remain visible across desktop, web, and mobile layouts.
- Removed the duplicate Messenger conversation banner and moved its conversation, connection, and activity controls into the main header.
- Reduced the Messenger header to its title and connection dot, and moved conversation selection and activity into the right properties drawer.
- Removed the Agent Chat workspace subtitle and replaced the full project name with the shared folder dropdown from Todos.
- Applied the compact title, project folder dropdown, and status dot header to Todos and Projects, with Todo project filtering.
- Changed Messenger messages to left-aligned received bubbles and right-aligned sent bubbles.
- Added sent, received, and blue read receipt ticks.
- Added hover emoji reactions with stored reaction chips.
- Added image, PDF, and text attachments with previews, downloads, and a 2 MB file limit.
- Added a conversation chevron menu for details, mute, archive, and transcript export actions.
- Broadcast attachment and reaction updates to every conversation participant through the existing realtime channel.
- Aligned My Devices messages by the active client: desktop on desktop, mobile on mobile, and web on web appear on the right.
- Kept direct user-chat alignment actor-based so the signed-in sender remains on the right.
- Aligned receipt ticks with the message timestamp baseline and added date plus relative-time labels.
- Added a hover-only message chevron with reactions, message info, reply, copy, and forward-to-composer actions.
- Closed message and conversation popups when the user clicks outside them or presses Escape.
- Preserved the Messenger viewport during refreshes and incoming messages while the user reads older history.
- Added a New messages control instead of forcing the viewport to the bottom.
- Added drag-and-drop attachments with an unobtrusive full-thread drop target and local image previews before sending.
- Added in-app image lightbox previews, quoted reply blocks, date separators, and one-click hover forwarding.
- Replaced the text history control with a compact bottom-scroll button that remains available while viewing older messages.
- Reduced Messenger scrollbars to a minimal 3px treatment on supported browsers.
- Enabled HTML file drops in the Windows desktop webview so Explorer files reach Messenger.
- Stabilized attachment object URLs and unchanged message refreshes to prevent chat-image and history flicker.
- Kept background read, activity, and conversation refresh failures from replacing an otherwise healthy message thread with a permanent error banner.
- Added immediate Messenger catch-up after socket reconnect, browser focus, visibility restoration, and network recovery.
- Guarded rapid conversation switches so late responses cannot replace the currently selected chat.
- Added immediate local confirmation for sent messages while the durable server refresh completes.
- Broadcast read-receipt updates to conversation participants instead of waiting for the next polling cycle.
- Preserved polling as a realtime fallback while deduplicating unchanged message snapshots.
- Kept conversations unread while Messenger is hidden, unfocused, or another workspace is active.
- Refreshed unread conversation badges for realtime events even when a different chat is selected.
- Ordered conversation shortcuts by unread state and latest activity.
- Added a compact total-unread badge to the Messenger navigation icon.
- Added an explicit Settings action for browser and desktop message-notification permission.
- Showed background message notifications only for unmuted conversations after permission is granted.
- Changed the Messenger side-rail unread indicator to the compact orange notification treatment.
- Connected the total unread count to a generated Windows taskbar overlay icon without external assets.
- Requested Windows taskbar attention when unread messages increase while the desktop window is unfocused.
- Cleared side-rail and taskbar notification counts immediately after messages are read or Messenger closes.
- Added the authenticated `messenger.unread` WebSocket event with actor-scoped conversation counts.
- Published unread-state events after message delivery, read transitions, conversation creation, and mute or archive changes.
- Removed the per-message HTTP conversation refresh from the notification path.
- Synchronized side-menu and Windows taskbar badges directly from WebSocket unread events, while retaining HTTP catch-up after reconnect.
- Suppressed successful Socket.IO transport handshakes and polling frames from general request logs while preserving all 4xx and 5xx socket failures.
- Removed all Socket.IO transport frames, including stale polling responses, from the general HTTP request log.
- Kept one actor-wide Messenger socket alive across chat selection, contact loading, and workspace navigation instead of reconnecting on UI state changes.
- Reduced `messenger.unread` payloads from full conversation lists to one changed-conversation delta plus the total unread count.
- Extended healthy socket fallback polling from 30 to 60 seconds while retaining five-second disconnected recovery.
- Corrected Messenger history loading to return the latest 300 messages in stable ascending order instead of the oldest 300.
- Limited attachment and reaction detail queries to the messages in the current response or realtime update.
- Removed newly written attachment files when their database metadata insert fails.
- Made shared Messenger recovery listeners safe for native mobile runtimes without browser globals.
- Preserved the mobile history position while reading older messages and aligned device-chat bubbles by the active client.
- Kept Messenger available to every authenticated local user without incorrectly requiring Project Manager permissions.
- Prevented failed or late attachment previews from creating unhandled errors or leaking object URLs.
- Added authenticated Messenger presence snapshots and online/offline events with multi-session connection counting.
- Added initials avatars and compact online dots to desktop, web, contact-picker, header, and mobile conversation surfaces.
- Added last-message sent, delivered, and blue read ticks to the conversation list.
- Kept persisted unread counts visible as compact per-conversation badges and prioritized unread chats.
- Made message ordering deterministic by creation time ascending and message ID ascending for timestamp ties.
- Kept attachment downloads private through conversation participant checks and stored file bytes under `DEVKIT_STORAGE_PATH`.
- Added `@`, `/`, and `#` composer suggestions, symbol help, mention highlighting, tag filtering, and keyboard selection.
- Added a compact Todo composer with icon controls and color-coded priority choices.
- Changed the Category and Project controls to compact icon triggers with animated, labeled menus.
- Added Todo title autofocus and visible focus states for every Todo control.
- Changed Todo due dates to `dd-MM-yyyy` and added relative labels such as `7d ago` and `in 7d`.
- Added compact color badges for Open, In Progress, Blocked, Completed, and fallback statuses.
- Changed inline Todo editing to match the new-Todo icon pattern with a wider title field.
- Changed inline status and visibility selects to animated icon dropdowns.
- Changed the inline due date to a compact calendar trigger that opens the native date picker.
- Fixed inline dropdown stacking so lower Todo row actions cannot appear through an open menu.
- Spread Todo visibility, edit, and delete actions into aligned lanes with 25px gaps.
- Replaced layout-shifting Todo drag gaps with stable before and after insertion guides.
- Added pointer-based drop placement and revision-safe optimistic reorder persistence.
- Added focused Todo reorder tests for upward, downward, before, after, and invalid moves.
- Expanded the Todo workspace content width from 960px to 1320px with responsive page gutters.
- Added a shared workspace header title, global search with Ctrl+K focus, and the opened project name.
- Upgraded global search to a compact Ctrl+K command palette with a translucent backdrop, searchable projects and conversations, recent history, workspace commands, keyboard navigation, and scrollable results.
- Removed the Ctrl+K shortcut badge border and reduced its size and contrast in the header search launcher.
- Decoupled left workspace navigation from the right drawer so only the right-side toggle changes its open state.
- Wired Project Ideas to a full-page title and rich-text editor with persisted saves and a collapsible properties drawer.
- Added arrow, Home, End, Escape, selection, and focus-return behavior to Todo option menus.
- Split the Todo form, option menu, and delete dialog into focused components.
- Added project reference validation, duplicate reorder rejection, and Todo sync visibility validation.
- Added focused Task Manager service, live migration, sync validation, and dropdown navigation tests.
- Added `assist/documentation/TODO-MESSENGER-REVIEW.md` with the table, migration, code, and improvement review.
- Changed DevKit API module startup to load each module through one ordered composition list.
- Changed API development startup to load the DevKit API workspace from source.
- Recorded review gaps for Messenger history pagination, Messenger permissions, Agent Chat connector reuse, stream cancellation, restored action evidence, and focused test coverage.
- Added project Module records with list, create, edit, status, hierarchy, route, and planning fields.
- Added one contextual Add action for Notes, Modules, Tasks, Architect, White Board, Schema, and Changelog.
- Made project Notes public inside their associated project and removed note visibility controls.
- Restricted project records and attachments to associated users, with administrator and super administrator access.
- Replaced the project association text field with an Identity-backed multi-user autocomplete selector.
- Added authenticated `/sa` routes for the Super Admin portal, identity controls, application features, and updates.
- Added a visual Architect planner with draggable blocks, edge handles, connectors, properties, and saved project records.
- Added project White Board files with an Excalidraw editor, multiple boards, file lists, and automatic scene saves.
- Added a visual Schema planner with table cards, column properties, relation labels, cardinality, and review status.
- Kept project tabs visible while the Architect and Schema editors are open.
- Added compact Project Overview statistics for Modules, Tasks, Reviews, Architectures, Whiteboards, Schemas, and Changelog entries.

#### Verification

- Passed `npm.cmd run typecheck --workspace @codexsun/coworker-chat`.
- Passed `npm.cmd run lint --workspace @codexsun/coworker-chat`.
- Passed repeated Coworker Chat typecheck, lint, and build checks after the Project workspace changes.
- Passed the Platform Web production build with the embedded Excalidraw project editor.
- Passed the two focused planning scene tests.
- Passed the two focused Project Manager access tests.
- Passed `git diff --check` for the changed Project workspace files.
- Did not run an authenticated browser or live database check for the final Project workspace state.
- Passed desktop, web, and mobile typechecks after adding the Messenger contact picker.
- Passed DevKit API typecheck and lint after adding Messenger attachments and reactions.
- Passed Coworker Chat typecheck and lint after the full Messenger interaction update.
- Passed Platform API, Platform Web, desktop, and mobile typechecks.
- Built the DevKit API and applied `devkit.messenger.sql.v6` to `devkit_db`.
- Confirmed `devkit.messenger.sql.v6` in the migration journal.
- Passed 11 focused Messenger tests, including stable message-ID ordering, device alignment, relative-time formatting, and date separators.
- Passed Coworker Chat and DevKit API typecheck and lint after the realtime recovery changes.
- Built the DevKit API after adding realtime read-receipt publication.
- Passed DevKit web, desktop, and mobile typechecks after the reconnect and stale-response guards.
- Passed Coworker Chat typecheck and lint plus web, desktop, and mobile typechecks after unread notification badges.
- Passed desktop lint after adding the Windows taskbar overlay integration.
- Desktop production build reached bundle generation, then the existing bundle-budget gate rejected `assets/use-messenger-B4lZ6I3U.js` at 879 kB against the 500 kB limit.
- Passed DevKit API build, typecheck, and lint plus Platform API typecheck and lint after adding `messenger.unread` WebSocket delivery.
- Passed Coworker Chat typecheck and lint, 11 focused Messenger tests, and desktop, web, and mobile typechecks after direct unread synchronization.
- A final Coworker Chat rerun found a concurrent missing `MessengerConversationList` symbol and three unused Messenger icon imports.
- Passed `npm.cmd run typecheck --workspace @codexsun/devkit-api`.
- A final API typecheck rerun found four concurrent Messenger route signature errors in `messenger.routes.ts`.
- Passed `npm.cmd run typecheck --workspace @devkit/mobile`.
- Passed `npm.cmd run check:module-boundaries`.
- Passed `npm.cmd run check:database-lifecycle`.
- Passed `npm.cmd run lint --workspace @codexsun/devkit-api`.
- Passed `npm.cmd run typecheck --workspace @devkit/platform-api`.
- Passed `npx.cmd tsx --test packages/coworker-chat/tests/composer-symbols.test.ts packages/coworker-chat/tests/messenger-client.test.ts` with 8 tests.
- Passed the authenticated local browser check for `@`, `/`, and `#` suggestion menus and the symbol help panel.
- Ran `npm.cmd run release:scope`. The latest inventory found 54 changed paths, including 52 unclassified paths from concurrent repository work.
- Ran `npm.cmd run release:scope` after the receipt slice. It found 58 changed paths, including 55 unclassified paths from concurrent repository work.
- Built `@codexsun/devkit-api`, ran `npm.cmd run db:migrate`, and confirmed `devkit.messenger.sql.v4` in `devkit_db.schema_migrations`.
- Rebuilt `@codexsun/devkit-api`, ran `npm.cmd run db:migrate`, and confirmed `devkit.messenger.sql.v5` in `devkit_db.schema_migrations`.
- Confirmed the live `devkit_messenger_activity`, `devkit_messenger_conversations`, and `devkit_messenger_participants` tables.
- Confirmed nullable live `devkit_messenger_messages.conversation_uuid` and `recipient_actor_id` columns.
- Passed `npm.cmd run build --workspace @devkit/platform-web`.
- Passed `npm.cmd run build --workspace @devkit/mobile`.
- Passed `npm.cmd run check:versions` for version 1.0.85.
- Passed `git diff --check`.
- Passed Framework, Coworker Chat, DevKit API, and Platform API typecheck and lint after the WebSocket logging and lifecycle optimization.
- Passed DevKit web, Platform web, desktop, and mobile typechecks after the WebSocket lifecycle optimization.
- Passed all 10 Framework tests and 11 focused Messenger tests.
- Passed DevKit API build, typecheck, and lint after the full Messenger refinement review.
- Passed Coworker Chat, Platform API, DevKit web, Platform web, desktop, and mobile typechecks; passed Coworker Chat and Platform API lint.
- Passed 11 focused Messenger tests and `git diff --check` after the full Messenger refinement review.
- `npm.cmd run check:module-boundaries` remains blocked by the existing unregistered `apps/devkit/api/src/modules/docs` module outside the Messenger scope.
- Passed desktop lint and focused lint for `apps/devkit/mobile/src/MessengerMobile.tsx`.
- Full mobile lint remains blocked because its workspace lint script includes the generated `apps/devkit/mobile/dist` Expo bundle.
- Passed DevKit API build, typecheck, and lint plus Platform API typecheck and lint after Messenger presence and conversation metadata updates.
- Passed Coworker Chat typecheck and lint, web, desktop, and mobile typechecks, focused mobile Messenger lint, and 11 focused Messenger tests.
- Passed the Platform web production build with existing large-chunk warnings.
- Passed Framework typecheck, lint, all 10 Framework tests, and `git diff --check` after removing Socket.IO frames from HTTP logs.
- Ran `npm.cmd run db:migrations:list`. It confirmed `devkit.task-manager.sql.v4` in `devkit_db`.
- Queried `information_schema.columns` for the live Todo table and checked visibility row counts.
- Passed 10 focused Todo service, live migration, sync-row, and dropdown-navigation tests with Vitest.
- Passed 7 focused Todo date, status-tone, and dropdown-navigation tests with Vitest.
- Ran `npm.cmd run release:scope`. The final inventory found 35 changed paths, including 17 unclassified paths.
- Ran the `npm.cmd run github:now` review. It reported commit subject `#85 - Messenger and Agent Chat workspace navigation` and 34 uncommitted paths before one concurrent untracked path appeared.
- Database-backed API runtime, authenticated browser, mobile emulator, live Codex connector, and multi-client Messenger checks did not run.
- GitHub release publication, Git commit, Git push, deployment, and VPS update did not run.

## v-1.0.84

### [v 1.0.84] 2026-08-23 11:13 am - Compass Runner release evidence and live console

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.84.
- Updated the standalone Compass Runner to persist release sessions and local history, expose true preflight, version, commit, and publish stages, and show a final report only after verified publication evidence.
- Streamed the repository release publisher output through the worker so the desktop console receives live release and workflow progress.
- Added per-stage event idempotency, safe recovery of legacy saved sessions, explicit stop-monitoring semantics, report copying, workflow and release links, and a slim independently scrolling console.

#### Verification

- Passed `npm.cmd run typecheck --workspace @devkit/desktop`, `npm.cmd run test --workspace @devkit/desktop -- compass-runner` (3 tests), `npm.cmd run lint --workspace @devkit/desktop`, and `npm.cmd run build --workspace @devkit/desktop`.
- Passed `npm.cmd run github:release:test` (6 tests), `npm.cmd run check:versions`, `npm.cmd run release:scope`, and `git diff --check`.
- Live desktop verification completed a read-only Compass preflight. The stage became completed and the console rendered one record for each of the four worker events.

## v-1.0.83

### [v 1.0.83] 2026-08-23 10:33 am - Compass Runner live release flow

#### Database Changes

- Database update: No.
- No persisted schema, seed, or data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.83.
- Updated Compass Runner so each live release stage records pending, awaiting approval, running, completed, or failed status and cannot display final success before release publication has been verified.
- Made the version stage idempotent after a Tauri development restart, preventing a duplicate version bump when a previously approved update already exists.
- Preserved release-stage state in the local desktop session so a configuration-triggered desktop restart can recover safely into the next protected approval.
- Added desktop development start guards that reuse the active Vite and DevKit process together, but relaunch Tauri when Vite remains available after the desktop process exits.

#### Verification

- Passed `npm.cmd run typecheck --workspace @devkit/desktop`.
- Passed `npm.cmd run test --workspace @devkit/desktop -- compass-runner` (3 tests).
- Passed `npm.cmd run lint --workspace @devkit/desktop`, `npm.cmd run release:scope`, `npm.cmd run check:versions`, and `git diff --check`.
- Live desktop preflight and validation completed. The live version-stage recovery verified the existing approved update without creating a second version.
- Commit, push, GitHub workflow, public release assets, and packaged release verification are pending the following protected stages.

## v-1.0.81

### [v 1.0.81] 2026-08-23 9:53 am - Compass Runner live release flow

#### Database Changes

- Database update: No.
- No migration, seed, or persisted data changed.

#### App Codebase Changes

- Bumped repository version to 1.0.81.
- Added the standalone Compass Runner release worker, its Tauri command bridge, and the desktop workspace entry point.
- Added explicit, approval-gated stages for version and changelog updates, Git synchronisation, commit and push, and release publication.
- Added observed worker-event streaming, release-scope classification, and focused Compass Runner tests.
- Corrected porcelain-status parsing and added bounded retries with captured stderr for staging failures.
- Removed the unrelated sales and CRM sample scenarios from the standalone runner tests.

#### Verification

- Passed `npm.cmd run test --workspace @devkit/desktop -- compass-runner` (3 tests).
- Passed `npm.cmd run typecheck --workspace @devkit/desktop`.
- Passed `cargo check --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions`, `npm.cmd run release:scope`, and `git diff --check`.
- Live desktop preflight and the approved version update were observed. In `tauri dev`, changing `tauri.conf.json` restarts the development desktop; the remaining protected stages are resumed after that restart.

## v-1.0.79

### [v 1.0.79] 2026-08-23 9:39 am - Compass release update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.79.

#### Verification

- Not yet run. Add the exact commands and live checks before commit.

## v-1.0.78

### [v 1.0.78] 2026-08-23 9:39 am - Compass release update

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.78.

#### Verification

- Not yet run. Add the exact commands and live checks before commit.

## v-1.0.77

### [v 1.0.77] 2026-08-22 3:08 pm - Factual project job release results

#### Database Changes

- Database update: No.
- The factual release result is derived from existing local job events and read-only workspace metadata. It does not change SQLite schema or data.

#### App Codebase Changes

- Bumped repository version to 1.0.77.
- Added a deterministic release-review result for the `Log` project task: current version, newest changelog heading, changed-path count, migration-path count, and the actions that did not occur.
- Labels local model output as an unverified advisory, so it cannot be mistaken for completed validation or a written release note.
- Reduced the local planning output budget to 160 tokens because the final release result is generated from observed evidence instead of model prose.
- Removed the temporary repository-rules and writable-code demo tasks and their demo-only execution code before release.
- Kept the production OpenCode planner, observed event watcher, model discovery, approval boundary, and project-job evidence flow.
- Removed the remaining desktop ESLint warnings from the Gemini settings controls.

#### Verification

- Passed `npm.cmd run check`. It covered encoding, deployment, repository boundaries, artifacts, modules, databases, workspace typechecks and lints, and framework tests.
- Passed `npm.cmd run check --workspace @devkit/desktop`: TypeScript, ESLint with no warnings, 30 desktop tests, and the production build passed.
- Passed `cargo fmt --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` and `cargo test --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` with 25 tests.
- Passed `npm.cmd audit --audit-level=moderate` with zero reported vulnerabilities.
- Passed `npm.cmd run release:scope`; all 142 changed paths were classified with no unexplained area.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Passed `npm.cmd run github:release:test` and the `desktop-v1.0.77` GitHub release dry run. No tag or GitHub release was created.
- Verified a live local Ollama request to `qwen2.5-coder:7b`. It returned text but invented release claims, which this change now treats as unverified advisory output.

## v-1.0.76

### [v 1.0.76] 2026-08-22 3:01 pm - Project job review handoff and factual local plans

#### Database Changes

- Database update: No.
- The review handoff uses the existing project-job event evidence and does not change its SQLite schema or persisted data contract.

#### App Codebase Changes

- Bumped repository version to 1.0.76.
- Marked completed local plans as review-required instead of presenting a non-functional approval state.
- Added a review-in-Agent-chat action that retrieves the saved planning output and inserts it into the coding-agent composer as a draft.
- Tightened local release-log prompting: it distinguishes observed facts from pending work, uses semantic versions correctly, prohibits invented verification claims, and limits the response length.
- Reduced local planner output from 512 to 320 generated tokens to improve response time and readability.

#### Verification

- Passed `npm.cmd run check --workspace @devkit/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo fmt --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` and `cargo check --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live desktop review-handoff interaction after this change.

## v-1.0.75

### [v 1.0.75] 2026-08-22 2:50 pm - Project job log controls and local model patience

#### Database Changes

- Database update: No.
- Copying and clearing project-job log evidence does not change the database schema or data contract.

#### App Codebase Changes

- Bumped repository version to 1.0.75.
- Added a copy control for the full text of a project-job log in both the inline task row and the dedicated log page.
- Replaced browser `confirm()` prompts with an accessible DevKit Shadcn-styled clear-log dialog that supports backdrop dismissal and Escape.
- Increased the local Ollama planning request timeout from 90 to 180 seconds and reduced progress events from every 4 seconds to every 12 seconds. Stop remains available while the request is running.

#### Verification

- Passed `npm.cmd run check --workspace @devkit/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo fmt --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` and `cargo check --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live desktop interaction or local-model request after this change.

## v-1.0.74

### [v 1.0.74] 2026-08-22 2:45 pm - Shared agent tools and release-log evidence

#### Database Changes

- Database update: No.
- The release-log planning task reads local workspace evidence only. It does not change SQLite, MariaDB, or saved job records.

#### App Codebase Changes

- Bumped repository version to 1.0.74.
- Defined the shared desktop agent tool vocabulary: inspect, search, plan, write, refactor, verify, and review.
- Recorded the approval and evidence boundary for Codex, online, and local connectors. A model reply is not treated as proof that an action happened.
- Made every repeatable project-job recipe declare the same implementation tool set and require approval before it can write, refactor, change a version, or perform external work.
- Updated the local `Log` planning prompt with observed repository version, newest changelog heading, changed-path count, migration-path count, and a bounded path preview.
- Added the `devkit-agent-tools` skill and the shared desktop agent-tool policy for future connector and job implementations.

#### Verification

- Passed `npm.cmd run check --workspace @devkit/desktop`: TypeScript, 30 desktop tests, and the production build passed. ESLint reported two existing `no-explicit-any` warnings in `settings-panel.tsx` and no errors.
- Passed `cargo check --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` and `cargo fmt --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml`.
- Passed `npm.cmd run check:versions` and `git diff --check` after finalizing this record.
- Did not run a live local-model request or a desktop UI interaction for this release record.

## v-1.0.73

### [v 1.0.73] 2026-08-22 12:19 pm - Local project-task runner reliability

#### Database Changes

- Database update: Yes.
- Updated local desktop SQLite through additive migrations `0005` to `0011`.
- Added `default_work_group_path` to `desktop_local_profile` with identity and startup fields retained.
- Added `desktop_saved_repository_urls` with `work_group_path`, `url`, `kind`, `relationship`, `created_at`, and `updated_at`.
- Added `archived`, `review_requested`, `execution_path`, and `worktree_branch` to `desktop_agent_tasks`.
- Added `desktop_project_jobs` with workspace, recipe, title, model target, model, status, and timestamps.
- Added `desktop_project_job_events` with job, level, message, and timestamp evidence.
- Added `desktop_project_job_runtime` with a job key, running status, and start timestamp for restart recovery.
- Did not modify an existing user SQLite data file during this release preparation.

#### App Codebase Changes

- Bumped repository version to 1.0.73.
- Added project overview task rows, per-job logs, local Ollama model refresh, cancellation, active-state polling, and bounded local-run retries.
- Added local identity, work-group discovery, saved repository URLs, repository types, clone-and-connect, project cards, project overview, and project-only chat history.
- Added isolated task worktree metadata, parallel chat tabs, task archive and review controls, model selection, action evidence, and a more accurate runtime state surface.
- Reordered desktop startup around an early Agent view, lazy workspace loading, quiet sidecar startup, and desktop performance helpers.
- Regenerated DevKit desktop icon assets and aligned Tauri, package, lockfile, workspace, and internal dependency versions.
- Added the local Ollama and Qdrant Docker environment, setup scripts, and operator documentation.
- Added observed local-job stages for model availability, prompt dispatch, elapsed response waiting, response receipt, retry, completion, failure, and cancellation. The local runner remains plan-only and does not claim file, GitHub, or VPS changes.
- Expanded the four reusable project-job skills with explicit checkpoints, stop conditions, and evidence required for release hand-off.
- Added release-note validation and a release-scope inventory command so a future agent reviews every changed area before it writes a concise changelog.

#### Verification

- Passed `npm.cmd run check`, including repository boundaries, typechecks, lint, tests, dependency checks, and package builds.
- Passed `npm.cmd run check:versions`, `npm.cmd run desktop:release:build`, `npm.cmd run desktop:release:check`, and `git diff --check`.
- Passed `npm.cmd run github:release:test` and `npm.cmd run github:release -- --dry-run --timeout-minutes 120`.
- Passed `npm.cmd run check --workspace @devkit/desktop` and `cargo check --manifest-path apps/devkit/desktop/src-tauri/Cargo.toml` after the local-job progress update.
- Verified that the local Ollama service lists the installed `qwen2.5-coder:7b` and `nomic-embed-text:latest` models.
- Full local generation, GitHub mutation, release publishing, and VPS deployment remain pending their dedicated gates.

## v-1.0.72

### [v 1.0.72] 2026-08-22 12:40 am - Chat deletion confirmation

#### Database Changes

- Database update: Yes.
- The existing additive local SQLite chat-action migration continues to preserve archived and review states before a chat is permanently deleted.

#### App Codebase Changes

- Bumped repository version to 1.0.72.
- Added a DevKit Shadcn-themed warning dialog before a chat and its local messages are permanently deleted.
- Kept the dialog open if deletion fails and surfaced the failure in the agent workspace.

## v-1.0.71

### [v 1.0.71] 2026-08-21 9:54 am - Desktop startup and local workspace setup

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.71.

## v-1.0.70

### [v 1.0.70] 2026-08-21 8:49 am - version update

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.70.

## v-1.0.69

### [v 1.0.69] 2026-08-21 8:48 am - DevKit canonical logo and installer identity

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.69.
- Made the supplied platform SVG the canonical DevKit logo asset.
- Added light, dark, and favicon variants that derive from the canonical mark.
- Regenerated the desktop native icon set for Windows, macOS, Android, and iOS.
- Rebuilt the signed DevKit MSI with the new application icon.
- Updated the GitHub desktop-release workflow to publish DevKit installer assets.

#### Verification

- Passed the DevKit desktop typecheck, lint, 29-test suite, and production build.
- Passed the platform web production build.
- Verified the signed MSI package metadata and DevKit executable payload.
- Passed `npm.cmd run check:versions` and `git diff --check`.

## v-1.0.68

### [v 1.0.68] 2026-08-21 7:37 am - Persistent cloud sync connection

#### Database Changes

- Database update: Yes.
- Added `last_verified_at` to the persisted cloud sync connection.

#### App Codebase Changes

- Bumped repository version to 1.0.68.
- Added persistent cloud token records with created, last-used, active, and revoked states.
- Added cloud token listing and revocation endpoints.
- Verified a cloud token before the local installation saves its encrypted binding.
- Added explicit connection verification, disconnect, and reconnect controls.
- Kept local project data when a user disconnects the cloud binding.
- Added saved installation, verification, transfer, revision, and error status to the sync page.
- Separated the cloud token manager from the local connection controls.

#### Verification

- Passed DevKit API and web typechecks, lint checks, and builds.
- Applied the additive migration to the local `devkit_db` database.
- Passed the database lifecycle and module boundary checks.
- Passed `git diff --check`.
- The full repository check remains blocked by the existing `apps/codeit/desktop/node_modules` directory.

## v-1.0.67

### [v 1.0.67] 2026-08-20 - CodeIt chat workspace polish

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped the repository version to 1.0.67.
- Added the CodeIt footer status bar with version, workspace, runtime, context, and sandbox status.
- Moved workspace breadcrumbs into the top bar and aligned them with the chat workspace.
- Simplified the top bar and moved the active model badge to the right side.
- Kept agent activity visible while a response runs.
- Showed message copy actions only on hover or keyboard focus.
- Added muted separators below the top bar and agent message metadata.

#### Verification

- Passed `npm run check --workspace @codeit/desktop` after each CodeIt UI update.
- Passed `git diff --check`.

### [Session] 2026-08-17 - Multi-provider Agent settings and terminal flicker fix

#### Database Changes

- Database update: Yes.
- Added desktop SQLite migration `0004_settings.sql` for agent configuration.
- Extended `desktop_settings` table with provider-specific keys (enabled, is_default, api_key, base_url, model).

#### App Codebase Changes

- **Settings Panel - Agent & Model tab redesign:**
  - Visual provider selector with icons for Codex, OpenRouter, OpenCode, Claude, Ollama.
  - Per-provider configuration cards with enable/disable toggle, API key input, base URL (Ollama), model dropdown.
  - Default provider selection with exactly-one validation.
  - Model lists per provider: Codex (GPT-4o family), OpenRouter (100+ models), OpenCode, Claude (3.5 Sonnet, Opus, Haiku), Ollama (llama3.1, codellama, qwen2.5-coder, deepseek-coder).
  - Provider credentials stored locally in desktop SQLite, never sent to servers.
- **Terminal flicker fix:**
  - Terminal now handles its own loading state inline in the tab bar.
  - Removed outer Suspense fallback that caused flash between loading → empty → connected.
  - xterm host pre-renders immediately; shell selector and clear button disabled until pty connects.
- **Updated types:**
  - `AgentConfig` now includes `defaultProvider` and `providers` map with `ProviderConfig`.
  - TypeScript types updated for exact optional properties.

#### Verification

- Passed desktop TypeScript check, ESLint check, Vitest tests, and production build.
- Passed Rust compilation checks.
- Verified provider cards render correctly in light/dark themes.
- Verified terminal shows inline spinner during pty connection without layout shift.
- Verified validation: default provider must be enabled, exactly one default, API keys required for cloud providers.

### [Session] 2026-08-16 - Persistent Project Agent action history

#### Database Changes

- Database update: Yes.
- Added the repeatable `devkit.orchestration-chat.sql.v4` migration.
- Added `actions_json` to Project Agent chat messages with an empty-list default.

#### App Codebase Changes

- Added a provider-neutral action record for commands, tools, searches, file changes, delegates, and context compaction.
- Streamed action status changes from the Codex App Server to the active Project Agent response.
- Stored the completed action timeline with each assistant message.
- Added a compact Work completed timeline with command totals and expandable earlier actions.
- Kept action history visible after a page reload and conversation reopen.
- Displayed native Codex automatic context compaction as a completed action.
- Kept OpenAI Codex responsible for automatic context compaction and preserved the active thread.
- Updated the orchestration architecture and project inventory records.

#### Verification

- Passed the DevKit API and web TypeScript checks.
- Passed focused ESLint checks for the changed API and web files.
- Passed three action-normalization and context-compaction tests.
- Passed the database lifecycle and module-boundary checks.
- Built the Platform web production bundle.
- Applied the v4 migration to the configured local MariaDB database.
- Ran `git status --short` through the live Project Agent in read-only mode.
- Confirmed the completed command remained visible after a page reload and history reopen.
- Did not force a large-context compaction during the live check.

### [Session] 2026-08-15 - CodeLogix internal coding beta

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Combined the completed CodeLogix Agent, editor, Git review, and workspace safety changes.
- Kept Agent tasks connected while developers inspect files and other workspace views.
- Added bounded file context with a 1,000-line limit for each attached file.
- Added exact change fingerprints before stage and commit actions.
- Added stalled-turn recovery and safe prompt submission rollback.
- Hid untracked generated workspace roots from Explorer, search, and source control.
- Synchronized all repository and desktop version owners through the release tool.
- Kept the release scope at internal coding beta. A signed installer remains a separate release step.

#### Verification

- Passed the full repository policy, typecheck, lint, and framework test suite.
- Passed the DevKit API, Platform API, DevKit web, and CodeLogix production builds.
- Passed 14 desktop Vitest tests and 11 native Rust tests.
- Passed the repository version, formatting, and diff checks.
- Verified persistent Agent and editor state in the native CodeLogix app.
- Did not build or publish a signed installer in this release step.

### [Session] 2026-08-15 - Safe Agent prompt handoff

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Prepared project learning and attached files before creating a durable user message.
- Blocked duplicate sends while CodeLogix prepares or submits a prompt.
- Added visible Preparing context and Sending states to the Agent composer.
- Restored the prompt when context preparation or Codex submission fails.
- Removed an unaccepted user message from local history after a failed Codex submission.
- Reported a separate error when local history cleanup fails.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Passed all 11 native Rust tests, including the local message rollback assertion.
- Passed native Rust compilation for version 1.0.56.
- Passed the repository version and diff checks.
- Did not send a live model request.

### [Session] 2026-08-15 - Persistent desktop Agent session

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Kept the Agent session mounted while developers use Explorer and other workspace views.
- Preserved live Agent events, task state, and the connection across view changes.
- Started Monaco only after the developer first leaves the Agent view.
- Kept Monaco mounted after its first start to preserve open files and unsaved edits.
- Opened command-palette file results in Explorer.
- Reset the editor model when the selected workspace changes.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Verified Agent to Explorer to Agent switching in the native CodeLogix app.
- Confirmed the task transcript and Codex connection remained active after each switch.
- Confirmed the second Explorer switch reused the loaded editor without a loading state.
- Passed the native Rust compilation and repository version checks.
- Did not send a model request or change the sample workspace.

### [Session] 2026-08-15 - One-thousand-line file context limit

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Replaced the per-file character limit with a strict 1,000-line limit.
- Kept the three-file limit and the 24,000-character total prompt limit.
- Added a test that removes all content after line 1,000.

#### Verification

- Passed the desktop TypeScript, ESLint, test, and production build checks.
- Passed the native Rust compilation check.
- Passed the repository version consistency and diff checks.

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

## v-1.0.65

### [v 1.0.65] 2026-08-17 9:39 am - CodeLogix lazy startup

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.65.
- Rendered the CodeLogix chat shell before the app restores a recent workspace.
- Started Codex only after the first prompt or saved-task selection.
- Loaded chat history after the first paint and opened SQLite only when stored data is requested.
- Loaded Explorer, Git, Docker, terminal, updater, and system resources only when their views need them.
- Loaded Monaco only after the developer selects a file.
- Hid background Git and system command windows on Windows.
- Made dark mode the default for new installs and applied a neutral developer color palette.
- Split the desktop side panel into a separate lazy bundle.
- Added detailed GitHub Actions progress to the desktop release command.
- Ignored local Tauri state and performance profile files.

#### Verification

- Passed the desktop TypeScript check, ESLint check, 29 Vitest tests, and production build.
- Passed Rust formatting and compilation checks.
- Verified the native chat-first startup, deferred history, lazy Explorer, and on-demand Monaco behavior.
- Confirmed the idle desktop process did not start a Codex child process.
- Measured a 399 ms development-shell LCP with zero layout shift.

## v-1.0.64

### [v 1.0.64] 2026-08-16 12:52 am - Multi-provider Agent connector and response review

#### Database Changes

- Database update: Yes.

#### App Codebase Changes

- Bumped repository version to 1.0.64.
- Added official SDK dependencies for OpenAI, Anthropic, OpenRouter, and OpenCode.
- Added DeepSeek through its OpenAI-compatible API contract.
- Kept native Codex and OpenAI as the default coding runtime and model provider.
- Added actor-scoped provider connections with encrypted API keys in MariaDB.
- Added provider configure, test, update, and disconnect API routes.
- Added collapsed provider cards to Agent Connector with model, capability, runtime, and status details.
- Added OpenCode CLI support for the provider-neutral coding bridge.
- Added response duration text and an edited-files review card to Project Agent replies.
- Kept provider credentials on the API server and out of browser responses and prompts.

#### Verification

- Passed DevKit API and web typechecks and lint checks.
- Passed DevKit API and Platform web production builds.
- Passed the module boundary and database lifecycle checks.
- Passed two API runtime smoke cycles.
- Applied the additive model-provider connection migration in local MariaDB.
- Verified Agent Connector controls and console output in the live browser.
- Verified the OpenCode CLI and SDK against a local server.
- Confirmed the SDK listed 185 providers and one connected provider.
- Recorded two moderate and one high dependency audit finding without applying an automatic fix.

## v-1.0.63

### [v 1.0.63] 2026-08-15 11:24 pm - Automated GitHub desktop release

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.63.
- Added `github:release` with dry-run, operator approval, and noninteractive reviewed modes.
- Required a clean, pushed `main` branch before a release tag can be created.
- Ran version, dependency, and desktop checks before pushing `desktop-v<version>`.
- Added resumable workflow monitoring and public release asset verification.
- Used slower public API polling when no GitHub token is available.
- Published the GitHub release only after the signed desktop workflow completes every build, test, output check, and asset upload.
- Added `github:release:test` for the tag and required release asset contracts.
- Fixed the Windows Node 26 command boundary so the release tool can run npm checks.
- Updated the version tool so the root lockfile keeps internal workspace dependency versions synchronized.
- Added a version check that rejects stale internal workspace dependencies in the root lockfile.
- Documented the automated release, timeout, and operator approval flow.

#### Verification

- Passed the GitHub release contract tests and JavaScript syntax check.
- Passed the release dry run without creating a tag or GitHub release.
- Verified that an uncommitted worktree stops before tag creation.
- Passed the full repository check and the CodeLogix desktop check.

## v-1.0.62

### [v 1.0.62] 2026-08-15 11:16 pm - Agent conversation and Markdown experience

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.62.
- Expanded the Agent transcript and composer to 80 percent of the available conversation workspace.
- Aligned developer prompts on the right and kept Agent responses on the left.
- Added a compact execution rail that keeps active work open, collapses completed work, and limits long activity lists with an explicit Show earlier actions control.
- Added safe GitHub-flavored Markdown for Agent headings, lists, task lists, tables, links, quotes, inline code, and fenced code blocks.
- Kept raw model-supplied HTML disabled and lazy-loaded Markdown rendering to protect startup performance.
- Added responsive and dark-theme presentation for messages, activity rails, and Markdown content.

#### Verification

- Passed desktop TypeScript, ESLint, 20 Vitest tests, and the version 1.0.62 production webview build.
- Passed all 11 native Rust tests for version 1.0.62.
- Confirmed the native single-instance guard focused the installed app instead of opening a competing development process.

## v-1.0.61

### [v 1.0.61] 2026-08-15 11:07 pm - Footer version update control

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.61.
- Added the installed CodeLogix version to the left side of the workspace footer.
- Made the version a keyboard-accessible update control that opens the signed update center and checks for a newer release.
- Preserved downloaded updates when the version control is clicked so approval remains available without another download.
- Added a restrained update-ready indicator with light and dark theme states.

#### Verification

- Passed desktop TypeScript, ESLint, 16 Vitest tests, and the production webview build.
- Passed repository version synchronization and diff checks.

## v-1.0.60

### [v 1.0.60] 2026-08-15 10:35 pm - Windows first-install and live update flow

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.60.
- Added a first-install setup EXE that embeds and starts the owned MSI.
- Kept MSI as the only Windows Installer product and updater package.
- Fixed the WiX upgrade code so future product-name changes cannot create duplicate installations.
- Added CODEXSUN publisher and product homepage metadata to the Windows installer.
- Published the setup EXE beside the MSI, updater signature, and direct-download manifest.
- Documented first installation, managed MSI deployment, repair, update, and uninstall ownership.

#### Verification

- Database update: not required.
- Passed version synchronization, type checks, lint, 14 Vitest tests, and the desktop production build.
- Passed all 11 native Rust tests and the signed MSI build.
- Passed the release-output check for the MSI identity, setup metadata, updater, and release manifest.
- Confirmed the setup EXE contains the MSI and excludes debug-symbol files.
- Passed repository encoding, deployment, boundary, dependency, database lifecycle, type, lint, and framework test gates.
- Live first-install and update verification continues after the signed GitHub draft passes its gates.

## v-1.0.59

### [v 1.0.59] 2026-08-15 10:13 pm - Direct-download desktop updates

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.59.
- Published the root-generated updater manifest with a direct versioned GitHub installer URL.
- Kept the signed MSI and signature creation in the official Tauri release action.
- Added an explicit release-manifest upload step after root deployment outputs are collected.

#### Verification

- Verified the published 1.0.58 updater endpoint returned HTTP 200 and exposed the signed installer metadata.
- Confirmed the Tauri-generated GitHub API asset URL required a binary request header that the current client does not send.
- Kept the public 1.0.58 release as an immutable audit record and moved the compatibility repair to 1.0.59.
- Passed version synchronization, desktop type checks, lint, 14 Vitest tests, the production build, and all 11 native Rust tests.

## v-1.0.58

### [v 1.0.58] 2026-08-15 9:50 pm - Reliable signed desktop release

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.58.
- Prepared the bundled Codex sidecar before native desktop tests in the Windows release workflow.
- Kept release tags immutable by issuing this fix as a new desktop version after the failed 1.0.57 CI run.

#### Verification

- Confirmed the 1.0.57 GitHub release run failed only because the native build could not find the prepared Windows Codex sidecar.
- Verified repository-owned package, Tauri, and Rust versions are synchronized at 1.0.58.
- Passed desktop type checks, lint, 14 Vitest tests, the production build, and all 11 native Rust tests.
- Built the 1.0.58 MSI and its 420-byte Tauri updater signature in the root deployment output.

## v-1.0.57

### [v 1.0.57] 2026-08-15 9:25 pm - CodeLogix internal coding beta

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.57.
- Combined the completed CodeLogix Agent, editor, Git review, and workspace safety changes.
- Added bounded file context, persistent Agent sessions, and safe prompt rollback.
- Added exact change fingerprints before stage and commit actions.
- Added stalled-turn recovery and generated-workspace filtering.
- Synchronized all repository and desktop version owners through the release tool.
- Kept the release scope at internal coding beta. A signed installer remains a separate release step.

#### Verification

- Passed the full repository policy, typecheck, lint, and framework test suite.
- Passed the DevKit API, Platform API, DevKit web, and CodeLogix production builds.
- Passed 14 desktop Vitest tests and 11 native Rust tests.
- Passed the repository version, formatting, and diff checks.
- Did not build or publish a signed installer in this release step.

## v-1.0.56

### [v 1.0.56] 2026-08-15 9:22 pm - Safe Agent prompt handoff

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.56.
- Prepared project learning and attached files before creating a durable user message.
- Blocked duplicate sends while CodeLogix prepares or submits a prompt.
- Added visible Preparing context and Sending states to the Agent composer.
- Restored the prompt when context preparation or Codex submission fails.
- Removed an unaccepted user message from local history after a failed Codex submission.
- Reported a separate error when local history cleanup fails.

#### Verification

- Passed the desktop TypeScript, ESLint, and 14 Vitest tests.
- Passed all 11 native Rust tests, including the local message rollback assertion.
- Passed the production build and native Rust compilation for version 1.0.56.
- Passed the repository version and diff checks.
- Did not send a live model request.

## v-1.0.55

### [v 1.0.55] 2026-08-15 9:15 pm - Persistent desktop Agent session

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.55.
- Kept the Agent session mounted while developers use Explorer and other workspace views.
- Preserved live Agent events, task state, and the connection across view changes.
- Started Monaco only after the developer first leaves the Agent view.
- Kept Monaco mounted after its first start to preserve open files and unsaved edits.
- Opened command-palette file results in Explorer.
- Reset the editor model when the selected workspace changes.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and production build.
- Verified persistent Agent and editor state in the native CodeLogix app.
- Passed the native Rust compilation and repository version checks.
- Did not send a model request or change the sample workspace.

## v-1.0.54

### [v 1.0.54] 2026-08-15 9:11 pm - One-thousand-line file context limit

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.54.
- Replaced the per-file character limit with a strict 1,000-line limit.
- Kept the three-file limit and the 24,000-character total prompt limit.
- Added a test that removes all content after line 1,000.

#### Verification

- Passed the desktop TypeScript, ESLint, 14 Vitest tests, and the production build.
- Passed the native Rust compilation check.
- Passed the repository version consistency and diff checks.

## v-1.0.53

### [v 1.0.53] 2026-08-15 9:05 pm - Bounded IDE file context

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.53.
- Added explicit active-file attachments to the CodeLogix agent composer.
- Kept attached context while developers move between Explorer and Agent views.
- Limited each task to three attached saved files, 12,000 characters per file, and 24,000
  characters in total.
- Re-read attached files when a prompt is sent so the agent receives the current saved content.
- Marked truncated context and separated it from both approved project learning and the original
  user request.
- Told the agent to treat attached file content as untrusted reference data.
- Kept the original user message unchanged in durable task history.
- Added accessible context chips with individual removal and automatic clearing for a new task or
  workspace.

#### Verification

- Passed desktop TypeScript, ESLint, 14 Vitest tests, and the production build.
- Passed Rust formatting, 11 Rust tests, and Rust compilation checks.
- Passed the repository version and diff checks for version 1.0.53.
- Verified the native CodeLogix app with the live sample workspace.
- Selected `README.md` in Explorer, attached it in Agent, confirmed the chip persisted after moving
  between views, and removed it successfully.
- Did not send the attached sample to a model, stage files, or create a commit.

## v-1.0.52

### [v 1.0.52] 2026-08-15 8:48 pm - Desktop live workflow hardening

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.52.
- Synchronized the npm workspace, Tauri configuration, Rust manifest, and Rust lockfile versions.
- Extended the release tool to check and update every desktop version owner.
- Added one shared policy that hides generated workspace roots from Explorer, fallback search, and
  untracked Source Control results.
- Kept tracked generated files visible so existing repository content cannot be hidden accidentally.
- Added a content fingerprint and explicit review approval before staging or committing changes.
- Invalidated change approval when the reviewed workspace content changes.
- Added a one-minute stalled-turn warning and a bounded three-minute automatic interruption.
- Renamed the environment file count to `Root entries` so the UI describes the loaded data correctly.
- Added focused tests for generated-path policy, review matching, and stalled-turn recovery.

#### Verification

- Passed the desktop TypeScript, ESLint, Vitest, and production build checks.
- Passed Rust formatting, 11 Rust tests, and Rust compilation checks.
- Passed the repository version check for version 1.0.52.
- Verified the native CodeLogix app against the live sample workspace.
- Confirmed the live Source Control panel hides untracked `dist`, shows the three authored changes,
  disables staging before review, and unlocks staging after approving the exact content.
- Did not stage or commit the sample project changes.

## v-1.0.51

### [v 1.0.51] 2026-08-15 8:13 pm - Named delegate restart recovery

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Bumped repository version to 1.0.51.
- Added one-time recovery for running named delegates after an API process restart.
- Started recovery only inside an authenticated request database and actor context.
- Reused each task's existing child run, worktree, scope, profile, model, and access ceiling.
- Started a new Codex thread and turn for each recovered delegate.
- Closed stale pending approval records before the replacement turn started.
- Added `run.recovered` child events and `run.task.recovered` parent events.
- Made executor startup failures finish the durable task instead of leaving it stuck in `running`.
- Extended the isolated named Agent E2E test to restart the API after parallel task dispatch.

#### Verification

- Passed the DevKit API TypeScript and ESLint checks.
- Built the DevKit API and Platform API packages.
- Passed the live named Agent E2E against MariaDB and the real Codex App Server.
- Replaced the API process while Forge and Canvas were running.
- Verified both delegates resumed in their existing worktrees and changed only assigned files.
- Verified both child runs and the parent run stored recovery events.
- Verified Atlas completed the dependency-final review after recovery.
- Verified the final human parent approval completed the recovered graph.

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
