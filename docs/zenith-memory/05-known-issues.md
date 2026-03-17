# Zenith Memory — Known Issues
> Last updated: 2026-03-17 by Cloud Code

## 🔴 Critical

### [MOBILE-001] Sidebar breaks layout on mobile
- **Where**: `src/components/sidebar.tsx`, `src/app/layout.tsx`
- **Problem**: Sidebar is `fixed left-0 w-56` with no mobile hide. `<main>` has hardcoded `ml-56`. On viewports <640px, sidebar eats most of the screen.
- **Status**: Fixed in 2026-03-17 mobile pass (see change log)
- **Fix applied**: Sidebar hidden on `<md`, hamburger button in Topbar, drawer overlay, `ml-0 md:ml-56` on main

### [SQLITE-001] Dual-write contention (RESOLVED)
- **Where**: `src/lib/gateway-sync.ts` vs `~/.openclaw/agentos/bin/agentos-sync.js`
- **Problem**: Both wrote to dashboard.sqlite causing `database is locked` errors
- **Status**: Resolved 2026-03-17. gateway-sync disabled in instrumentation.ts. agentos-sync is sole writer.
- **Rollback**: Re-enable gateway-sync in src/instrumentation.ts

## 🟡 Medium

### [AUTH-001] All API routes unauthenticated
- **Where**: All `src/app/api/*/route.ts`
- **Problem**: No auth on any endpoint. `/api/tasks/:id/notification` exposes chatId and messageId.
- **Context**: MC is loopback-only (127.0.0.1:3010). nginx port 301 has no auth.
- **Status**: Pre-existing technical debt. Not introduced by redesign.
- **Risk**: Anyone with network access to the server can read/modify all tasks.

### [MOBILE-002] Board mode difficult on mobile
- **Where**: `src/components/task-board.tsx`
- **Problem**: 5 kanban columns each 220px+ = ~1100px minimum. `overflow-x-auto` exists but swipe UX is poor.
- **Status**: Partially mitigated by sidebar fix. Board defaults to list on very small screens.

### [TOPBAR-001] Search input fixed width on mobile
- **Where**: `src/components/topbar.tsx`
- **Problem**: `w-52` input and hamburger button can crowd header on narrow viewports
- **Status**: Fixed in 2026-03-17 mobile pass — search hidden on mobile (`hidden md:flex`)

### [SCRIPTS-001] AgentOS scripts not versioned
- **Where**: `~/.openclaw/agentos/bin/`
- **Problem**: telegram-notify, job-watchdog.sh, agentos-sync.js, dispatch-job live only on server. Not in git repo.
- **Risk**: Changes lost if server reinstalled. No review history.
- **Suggested fix**: Add `~/.openclaw/agentos/bin/` as a submodule or copy into repo `/server-scripts/`

## 🟢 Low / Informational

### [DEAD-CODE-001] src/lib/instrumentation.ts vs src/instrumentation.ts
- Two instrumentation files exist. `src/lib/instrumentation.ts` appears to be leftover dead code.
- `src/instrumentation.ts` (root level) is the one Next.js actually loads on startup.
- Do not edit the lib/ version expecting it to affect startup behavior.

### [TASKID-001] task-drawer.tsx component unused
- `src/components/task-drawer.tsx` exists but is not rendered anywhere in current page flow.
- Tasks navigate to `/tasks/[id]` full page rather than opening a drawer.
- May be intended for a future quick-view pattern.

### [DEEPLINK-001] ?id= query param is NOT a task detail deep-link
- `http://187.77.19.111:301/tasks?id=<taskId>` opens the board/list page, NOT the task detail view.
- For Zenith status links use `/tasks/<taskId>` (full path), not `?id=`.

### [NOTIFICATION-001] notification_state table starts empty on fresh DB
- After a DB migration run (new table added), agentos-sync must complete a cycle before `notification_state` rows exist.
- This is normal; `/api/health` returns `notificationCount: 0` initially.
