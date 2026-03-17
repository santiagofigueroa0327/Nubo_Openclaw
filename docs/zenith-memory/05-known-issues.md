# Zenith Memory — Known Issues
> Last updated: 2026-03-17 pass 2 by Cloud Code

## 🔴 Critical

### [SQLITE-001] Dual-write contention — RESOLVED
- **Where**: `src/lib/gateway-sync.ts` vs `~/.openclaw/agentos/bin/agentos-sync.js`
- **Status**: Resolved 2026-03-17. gateway-sync import disabled in `src/instrumentation.ts`. agentos-sync is sole writer. 0 `database is locked` errors since 03:32 UTC restart.
- **Rollback**: Re-enable gateway-sync import in `src/instrumentation.ts`.

### [UNTRACKED-001] Untracked source files compiled into production build
- **Where**: Multiple files in `src/lib/` and `src/components/`
- **Problem**: `stagnation.ts`, `gateway-sync.ts`, `lib/instrumentation.ts`, `task-drawer.tsx`, `connection-indicator.tsx` exist on the server filesystem but are NOT in git. They get compiled by `npm run build` and affect the running application. `git status` will not show them as modified.
- **Risk**:
  - A `git checkout` or `git clean -fd` could delete untracked files including the ACTIVE `stagnation.ts`
  - Changes to untracked files leave no audit trail
  - Zenith may incorrectly report "no changes" after editing an untracked file
  - Collaborators cloning the repo get a different build than the server
- **Status**: Open — pre-existing, not introduced by 2026-03-17 pass
- **Mitigation for Zenith**: Always run `git status --short` before editing any `src/` file. Check if it's tracked. If editing an untracked file, note this explicitly in the change log.
- **Suggested fix**: Commit untracked files that are active (`stagnation.ts` at minimum); delete or archive truly dead ones (`lib/instrumentation.ts`, possibly `connection-indicator.tsx`); decide whether to commit or delete `task-drawer.tsx`

---

## 🟡 Medium

### [MOBILE-001] Sidebar breaks layout on mobile — RESOLVED
- **Where**: `src/components/sidebar.tsx`, `src/app/layout.tsx`, `src/components/layout-shell.tsx`
- **Status**: Resolved 2026-03-17 mobile pass. Desktop sidebar `hidden md:flex`. Mobile drawer via AnimatePresence. `md:ml-56` on main. Hamburger in Topbar.
- **Do not reintroduce**: `ml-56` without `md:` prefix; sidebar without `hidden md:` guard.

### [MOBILE-002] Board mode requires horizontal scroll on mobile
- **Where**: `src/components/task-board.tsx`
- **Problem**: 5 kanban columns each `min-w-[220px]` = ~1100px min. `overflow-x-auto` container exists. Swipe UX is suboptimal on touch.
- **Status**: Open — partially mitigated by sidebar fix (more viewport available on mobile). Not fully resolved.
- **Impact**: Medium. Users on very narrow phones may struggle with board view. List view works well.

### [AUTH-001] All API routes unauthenticated
- **Where**: All `src/app/api/*/route.ts`
- **Problem**: No auth on any endpoint. `/api/tasks/:id/notification` exposes chatId+messageId. PATCH `/api/agents` can modify openclaw.json.
- **Context**: MC is loopback-only (127.0.0.1:3010). nginx port 301 has no auth layer.
- **Status**: Open — pre-existing technical debt.
- **Risk**: Anyone with network access to the VPS can read all tasks, modify agent config, and read Telegram credentials via notification endpoint.

### [SCRIPTS-001] AgentOS scripts not versioned in repo
- **Where**: `~/.openclaw/agentos/bin/`
- **Problem**: `telegram-notify`, `job-watchdog.sh`, `agentos-sync.js`, `dispatch-job` live only on server filesystem.
- **Status**: Open — pre-existing.
- **Risk**: Changes lost if server reinstalled. No review history.
- **Suggested fix**: Copy into repo under `server-scripts/agentos-bin/` or add as a tracked symlink area.

### [MC-V2-ORPHANED] MC v2 drawer implementation exists but is not wired
- **Where**: `src/components/task-drawer.tsx` (541 lines, untracked)
- **Problem**: A complete slide-in drawer was built (MC_V2_REPORT.md, 2026-03-05) with 4 tabs (Summary/Timeline/Logs/Artifacts), Archive+Retry actions, and live SSE log streaming. It was never connected to `tasks-page-client.tsx` or `task-board.tsx`. Current task navigation uses `router.push` to `/tasks/[id]` full page instead.
- **Status**: Open — orphaned implementation.
- **Risk**: If Zenith is asked to "wire the task drawer" and blindly imports it, the drawer may conflict with the committed `tasks-page-client.tsx` (which still uses full-page nav). Full integration requires replacing `router.push` in `task-board.tsx` and `task-table.tsx` with `onSelect(id)` callbacks and managing drawer state in `tasks-page-client.tsx`.
- **Suggested path**: Decide deliberately: either commit to full-page nav (keep current) or wire the drawer (significant change to tasks-page-client + task-board + task-table + possibly remove `/tasks/[id]` page).

---

## 🟢 Low / Informational

### [TOPBAR-001] Search input — RESOLVED
- **Status**: Resolved 2026-03-17. Search is `hidden md:block`.

### [DEAD-CODE-001] `src/lib/instrumentation.ts` — dead file under lib/
- **Where**: `src/lib/instrumentation.ts` (untracked, different from root `src/instrumentation.ts`)
- **Problem**: Appears to be an older version of the startup hook. It is NOT loaded by Next.js (Next.js looks for `instrumentation.ts` at the project root, not under `src/lib/`).
- **Status**: Open — low risk but contributes to confusion.
- **Zenith rule**: The active startup hook is ALWAYS `src/instrumentation.ts` (root level, tracked). Never edit the one under `lib/`.

### [DEEPLINK-001] `?id=` query param is NOT a task detail deep-link
- **Where**: External links, Telegram notifications
- **Problem**: `http://187.77.19.111:301/tasks?id=<taskId>` opens board/list view, NOT task detail.
- **Status**: Open — routing gap. For true detail view: use `/tasks/<taskId>`.
- **Rule for Zenith**: Status block `Link:` must use `/tasks/<taskId>` path, not `?id=`.

### [NOTIFICATION-001] notification_state table starts empty on fresh DB
- After DB migration runs (new table), agentos-sync must complete one cycle before rows exist.
- Normal behavior. `/api/health` returns `notificationCount: 0` initially.
- **Status**: Informational.

### [MISSIONS-NAV-001] /missions route exists but not in sidebar
- `src/app/missions/page.tsx` and `[id]/page.tsx` exist and are compiled.
- The sidebar only shows: Tasks / Agents / Logs.
- Direct navigation to `/missions` works.
- **Status**: Open — minor omission. Add to NAV_ITEMS in sidebar.tsx if needed.
