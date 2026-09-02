# Chat Messenger - Security, Architecture & Feature Analysis

*Generated from codebase review of `packages/coworker-chat`, `apps/devkit/api/src/modules/messenger`, `apps/platform/api/src/app.ts`*

---

## 🔴 BREACHES (Security & Architecture Violations)

### 1. JWT Decoded Client-Side Without Verification
**Location:** `packages/coworker-chat/src/MessengerChat.tsx:1048-1064`
**Function:** `profileFromSessionToken()`
**Issue:** Uses `atob()` to decode JWT payload, trusts client-side claims (email, name, sub) without signature verification. Malicious user can craft token with arbitrary claims.
**Fix:** Fetch profile from `/identity/profile` endpoint (already exists in `MessengerClient.profile()`).

### 2. Socket.io Auth Only on Connect
**Location:** `apps/platform/api/src/app.ts:161-168`
**Issue:** Token verified once on socket handshake. No re-authentication on token expiry/refresh. Stale tokens persist until disconnect.
**Fix:** Implement periodic re-auth or token validation middleware on sensitive events.

### 3. Token in Socket.io Query String
**Location:** `packages/coworker-chat/src/use-messenger.ts:136-137`
**Code:** `auth: { token: \`Bearer ${token}\` }`
**Issue:** Token appears in WebSocket upgrade URL, browser devtools, proxy logs, server access logs.
**Fix:** Use `socket.handshake.auth.token` only (already done) but ensure it's not logged. Consider short-lived socket tokens.

### 4. Presence Broadcast to All Actors
**Location:** `apps/platform/api/src/app.ts:173-174`
**Code:** `io.emit("messenger.presence", { actorId, online: true })`
**Issue:** Online status broadcast to ALL connected sockets, not just contacts/conversation participants. Privacy leak.
**Fix:** Track conversation participants, emit presence only to relevant actors.

### 5. No Rate Limiting on Messenger Endpoints
**Location:** `apps/devkit/api/src/modules/messenger/messenger.routes.ts`
**Endpoints:** `POST /messages`, `POST /conversations`, `POST /attachments`, `POST /reactions`
**Issue:** Unbounded requests allow spam, attachment DoS, conversation enumeration.
**Fix:** Add rate limiter (e.g., `@fastify/rate-limit`) per actor per endpoint.

### 6. Attachment Upload No Virus Scanning
**Location:** `apps/devkit/api/src/modules/messenger/messenger.routes.ts:47-64`
**Issue:** Files written to storage directly, served with `Content-Disposition: inline`. Malicious files (HTML, SVG, PDF) execute in browser context.
**Fix:** Virus scan (ClamAV), enforce `Content-Disposition: attachment`, sanitize filenames, serve from separate domain.

### 7. Attachment URL Predictable
**Location:** `apps/devkit/api/src/modules/messenger/messenger.routes.ts:149-151`
**Pattern:** `/api/devkit/messenger/conversations/{conversationId}/messages/{messageId}/attachments/{attachmentId}`
**Issue:** No signed URLs or access tokens. Anyone with URL (leaked via referrer, logs) can download.
**Fix:** Signed URLs with short expiry, or token-verified download endpoint.

### 8. No Conversation Encryption
**Location:** `apps/devkit/api/src/modules/messenger/messenger.migration.ts`
**Issue:** Messages stored plaintext in MariaDB (`devkit_messenger_messages.body TEXT`). DB admin, backups, logs expose all messages.
**Fix:** Application-level encryption (per-conversation keys) or transparent DB encryption.

### 9. CORS Includes Dev Origins in Prod Function
**Location:** `apps/platform/api/src/app.ts:220-244`
**Function:** `platformWebOrigins()`
**Issue:** Adds `localhost`, `127.0.0.1`, `tauri.localhost` unconditionally. If `NODE_ENV=production` but env vars misconfigured, dev origins allowed.
**Fix:** Only add dev origins when `NODE_ENV !== "production"` AND explicit flag.

### 10. No Audit Logging for Destructive Actions
**Location:** `apps/devkit/api/src/modules/messenger/messenger.repository.ts`
**Methods:** `archiveChat`, `forceDeleteChat`, `restoreChat`, `forceDeleteArchivedChats`
**Issue:** No audit trail for compliance/forensics. Admin can't track who deleted what.
**Fix:** Write to audit log table on destructive operations.

---

## 🚫 BLOCKERS (Preventing Scaling/Progress)

### 1. Socket.io Single-Server Only
**Location:** `apps/platform/api/src/app.ts:160`
**Code:** `const actorConnections = new Map<string, number>()`
**Impact:** In-memory Map won't work with multiple API instances (Kubernetes, Cloudflare Workers, multiple VMs). Presence, message delivery, unread counts break.
**Fix:** Redis adapter (`@socket.io/redis-adapter`) with pub/sub for cross-instance events.

### 2. No Redis Adapter for Socket.io
**Location:** `apps/platform/api/src/app.ts:155-193`
**Impact:** Cannot scale WebSocket connections horizontally. Each instance has isolated connection state.
**Fix:** Configure `socket.io` with Redis adapter, share `adapter` across instances.

### 3. Conversation Creation Race Condition
**Location:** `apps/devkit/api/src/modules/messenger/messenger.repository.ts:186-197`
**Method:** `ensureDirectConversation()`
**Issue:** Uses `INSERT IGNORE` for conversation + participants. Concurrent requests from both users can create duplicate conversations or leave participants in inconsistent state.
**Fix:** Use database transaction with `SELECT ... FOR UPDATE` or application-level lock (Redis).

### 4. No Pagination for Messages
**Location:** `apps/devkit/api/src/modules/messenger/messenger.repository.ts:53-62`
**Method:** `list()` - hardcoded `limit(300)`
**Impact:** Loads only last 300 messages. No infinite scroll, no "load older" UX. Users can't access full history.
**Fix:** Cursor-based pagination (`beforeMessageId`, `limit`), return `hasMore` flag.

### 5. Attachment Storage Local-Only
**Location:** `apps/devkit/api/src/modules/messenger/messenger.storage.ts`
**Class:** `MessengerAttachmentStorage`
**Issue:** Writes to local filesystem (`resolve(this.root, \`messenger-attachments/...\`)`). Not compatible with S3, R2, GCS. Blocks cloud/deployment flexibility.
**Fix:** Abstract storage interface, implement S3/R2/local drivers, configure via env.

### 6. No Database Migration Versioning
**Location:** `apps/devkit/api/src/modules/messenger/messenger.migration.ts`
**Issue:** Raw SQL migration function, no version tracking, no rollback, no dependency ordering. Runs on every boot via `migrateMessengerModule()`.
**Fix:** Use proper migration tool (Kysely migration API, golang-migrate, or custom versioned runner).

### 7. Hardcoded Emoji List
**Locations:**
- `packages/coworker-chat/src/messenger-client.ts:17` (type definition)
- `packages/coworker-chat/src/MessengerDeviceWorkspace.tsx:250` (UI)
- `packages/coworker-chat/src/MessengerConversationMenu.tsx` (menu)
- `apps/devkit/api/src/modules/messenger/messenger.routes.ts:21` (validation)
**Issue:** 6 emojis (👍 ❤️ 😂 😮 😢 🙏) defined in 4+ places. Adding emoji requires code changes in multiple packages.
**Fix:** Centralize in shared config, load from DB/config, allow custom emoji packs.

---

## ⚠️ FRICTIONS (Awkward/Difficult to Use)

### 1. Massive God Component
**Location:** `packages/coworker-chat/src/MessengerChat.tsx` (~850 lines)
**Responsibilities:** Routing, URL sync, state management, keyboard shortcuts, search palette, drawer, side panel, error handling, agent/chat/devices/projects/todos/ideas/docs/settings workspaces, avatar rendering, conversation menu, activity bar.
**Pain:** Hard to test, modify, review. Single file touches 15+ workspaces.

### 2. Complex Ref-Based State Avoidance
**Location:** `packages/coworker-chat/src/use-messenger.ts:52-66`
**Refs:** `conversationsRef`, `contactsRef`, `conversationIdRef`, `profileIdRef`, `activeRef`, `refreshing`, `conversationLoad`, `socketConnected`, `refreshRef`
**Reason:** Avoid stale closures in socket event handlers and timers.
**Pain:** Cognitive overhead, easy to miss a ref update, debugging difficult.

### 3. Dual Token Handling
**Locations:**
- `MessengerChat.tsx:1048` - `profileFromSessionToken(token)` client-side decode
- `use-messenger.ts:136` - `auth: { token: \`Bearer ${token}\` }` sent to socket
**Pain:** Inconsistent auth model. Server validates on REST but socket gets raw token. Token refresh requires coordinated update.

### 4. Manual Socket Lifecycle
**Location:** `packages/coworker-chat/src/use-messenger.ts:118-247`
**Complexity:** Single `useEffect` manages: connection, reconnection timers, focus/online/offline/visibility listeners, periodic refresh (60s/5s), presence events, message events, unread events, cleanup.
**Pain:** Bug-prone, hard to test, timing issues (race between disconnect and refresh timer).

### 5. URL Routing Mixed with React State
**Location:** `packages/coworker-chat/src/MessengerChat.tsx:994-1046`
**Functions:** `readWorkspaceRoute()`, `updateWorkspaceRoute()`, `workspaceSpaceFromPath()`
**Issue:** Direct `window.history.replaceState()` manipulation alongside React `useState`. Browser back/forward handled via `popstate` listeners.
**Pain:** Sync issues between URL and React state, hard to debug navigation bugs.

### 6. No Virtualization for Message List
**Location:** `packages/coworker-chat/src/MessengerDeviceWorkspace.tsx:154-190`
**Code:** `visibleMessages.map((message, index) => ...)` renders ALL messages.
**Impact:** O(n) render. Conversations with 1000+ messages cause jank, memory bloat.
**Fix:** React-window or @tanstack/react-virtual for list virtualization.

### 7. Composer Symbols Tightly Coupled
**Location:** `packages/coworker-chat/src/composer-symbols.tsx`
**Hook:** `useComposerSymbols({ inputRef, onChange, tags, value })`
**Issue:** Requires specific textarea ref, onChange signature, only works with `#tag` and `@mention` patterns hardcoded.
**Pain:** Not reusable in other textareas (agent chat, todo, ideas).

### 8. Error Handling Inconsistent
**Patterns observed:**
- Local state: `setError(messageFrom(reason))`
- Thrown: `throw AppError.notFound(...)`
- Silent: `.catch(() => undefined)` / `.catch(() => [])`
- Toast: Not used (no toast in messenger)
**Pain:** Debugging difficulty, inconsistent UX, some errors lost.

### 9. Relative Imports Without Path Aliases
**Examples:**
- `../../request-context.js` in `messenger.routes.ts:5`
- `../../../framework` in `client.ts:1`
- `../../database/devkit-database.js` in `messenger.repository.ts:4`
**Pain:** Refactoring moves break imports, hard to read, IDE auto-import less effective.

---

## 🕳️ GAPS (Missing Features)

### Core Messaging
- [ ] Message editing (with edit history)
- [ ] Message deletion (soft delete with tombstone)
- [ ] Message threads/replies UI (visual grouping)
- [ ] Typing indicators (socket event: `messenger.typing`)
- [ ] Read receipts "seen by" list (per-message)
- [ ] Message pinning/starring (per-conversation)
- [ ] Quote/reply with visual reference (partial: `/reply` in composer)

### Search & Discovery
- [ ] Full-text search across all conversations (Meilisearch/Typesense/DB FTS)
- [ ] Message search within conversation (filter by date, author, content)
- [ ] Conversation search by participant name/email
- [ ] Search suggestions/autocomplete

### Rich Content
- [ ] Markdown rendering (currently plain text with `#tag` `@mention`)
- [ ] Emoji picker (beyond 6 hardcoded)
- [ ] Voice messages (audio recording + playback)
- [ ] Video messages / screen recording
- [ ] Message quoting UI (visual blockquote with link to original)
- [ ] @mentions autocomplete (contact picker)

### Groups & Organization
- [ ] Group conversations (currently only `device` + `direct`)
- [ ] Conversation folders/labels (work, personal, project)
- [ ] Message forwarding with reference to original conversation
- [ ] Conversation favorites/pinned list

### Notifications
- [ ] Push notifications (Service Worker + Web Push / FCM / APNs)
- [ ] Email fallback for offline users
- [ ] Notification preferences per conversation (mute, custom sound)
- [ ] Batch/digest notifications

### Data & Export
- [ ] Conversation export (JSON, PDF, TXT - full history)
- [ ] Message retention policy (auto-archive/delete after N days)
- [ ] Backup/restore (per-user or admin)
- [ ] GDPR/CCPA data export/delete

### Admin & Moderation
- [ ] Message reporting (user flags inappropriate content)
- [ ] Spam detection (rate + content analysis)
- [ ] Admin message deletion (with audit)
- [ ] Admin conversation management (list, archive, delete)
- [ ] Audit logs for all admin actions

### Accessibility
- [ ] Screen reader optimizations (ARIA live regions for new messages)
- [ ] Keyboard navigation completeness (all actions reachable)
- [ ] High contrast mode support
- [ ] Focus management on route change
- [ ] Reduced motion support

### Mobile/Offline
- [ ] Offline message queue (IndexedDB + background sync)
- [ ] Background sync when app reopens
- [ ] Push to mobile clients (Capacitor/Tauri plugins)
- [ ] Progressive Web App (PWA) manifest + service worker

---

## 🎯 PRIORITY FIX ROADMAP

### Immediate (Week 1-2)
| Priority | Task | Effort |
|----------|------|--------|
| P0 | Move JWT verification server-side (remove `profileFromSessionToken`) | S |
| P0 | Add Redis adapter for socket.io (`@socket.io/redis-adapter`) | M |
| P0 | Implement rate limiting on all messenger endpoints | S |
| P0 | Fix attachment `Content-Disposition: attachment` + filename sanitization | S |

### Short-term (Month 1)
| Priority | Task | Effort |
|----------|------|--------|
| P1 | Add cursor-based pagination for messages (`beforeMessageId`, `limit`) | M |
| P1 | Virtualize message list (@tanstack/react-virtual) | M |
| P1 | Extract `MessengerChat.tsx` into feature components (per workspace) | L |
| P1 | Abstract attachment storage (S3/R2/local drivers) | M |
| P1 | Centralize emoji config (shared package + DB) | S |

### Medium-term (Quarter 1)
| Priority | Task | Effort |
|----------|------|--------|
| P2 | Group conversations (schema + API + UI) | L |
| P2 | Message editing/deletion with tombstones | M |
| P2 | Full-text search (Meilisearch integration) | L |
| P2 | Typing indicators + read receipts "seen by" | M |
| P2 | Signed attachment URLs with expiry | M |

### Long-term (Quarter 2+)
| Priority | Task | Effort |
|----------|------|--------|
| P3 | E2E encryption (per-conversation keys, Signal protocol) | XL |
| P3 | Push notifications (Web Push + mobile) | L |
| P3 | Offline queue + background sync | L |
| P3 | Message reactions extensible (custom emoji packs) | M |
| P3 | Admin moderation dashboard | L |

---

## 📁 FILES REVIEWED

### Client (packages/coworker-chat/src/)
- `MessengerChat.tsx` - Main orchestrator (~850 lines)
- `use-messenger.ts` - Socket + REST hook
- `messenger-client.ts` - REST client + types
- `MessengerDeviceWorkspace.tsx` - Device/direct chat UI
- `MessengerWorkspace.tsx` - Workspace components
- `composer-symbols.tsx` - Tag/mention autocomplete
- `socket-path.ts` - Socket.io path helper
- `client.ts` - Agent/project API client
- `types.ts` - Shared types
- `agent-chat-events.ts`, `agent-event-queue.ts`, `agent-structured-plan.ts` - Agent chat
- `*.test.ts` - Unit tests

### Server - DevKit API (apps/devkit/api/src/modules/messenger/)
- `messenger.routes.ts` - Fastify routes
- `messenger.repository.ts` - Kysely DB operations
- `messenger.runtime.ts` - Event pub/sub (in-memory)
- `messenger.storage.ts` - Attachment filesystem storage
- `messenger.types.ts` - TypeScript types
- `messenger.module.ts` - Module registration
- `messenger.migration.ts` - SQL migration

### Server - Platform API (apps/platform/api/src/)
- `app.ts` - Socket.io servers (messenger, desktop-node, notifications)

---

## 🔗 RELATED DOCS

- `assist/architecture/engineering-orchestration.md` - Module boundaries
- `assist/governance/rules.md` - Engineering rules
- `assist/documentation/project-inventory.md` - Project inventory
- `README.md` - DevKit overview
