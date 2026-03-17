# Zenith Memory — Mission Control Architecture
> Last updated: 2026-03-17 pass 2 by Cloud Code

## Stack
- **Framework**: Next.js 16.1.6 (App Router, React Server Components)
- **Styling**: Tailwind CSS v4 (via `@import "tailwindcss"` + `@theme` in globals.css)
- **Database**: better-sqlite3 (WAL mode, busy_timeout 10000ms)
- **Animation**: Framer Motion
- **Runtime**: Node.js 22.22.0

## Layout structure (CURRENT — after mobile pass 2026-03-17)
```
RootLayout (layout.tsx)
  <LayoutShell>              ← NEW client component, holds mobileNavOpen state
    <Sidebar mobileOpen onMobileClose />
      Desktop: hidden md:flex, fixed w-56 left nav
      Mobile:  AnimatePresence drawer + backdrop (z-50)
    <main className="md:ml-56 min-h-screen">
      <Topbar onMenuClick />  ← hamburger md:hidden, search hidden md:block
      <div className="p-4 md:p-6">
        {children}
      </div>
    </main>
  </LayoutShell>
```

**Do NOT edit layout.tsx expecting to change sidebar behavior directly** — sidebar state now lives in `layout-shell.tsx`.

## Task navigation model (CURRENT)
Clicking a task card uses **full-page navigation** to `/tasks/<taskId>`.
- `task-board.tsx` → `router.push(\`/tasks/${task.id}\`)`
- `task-table.tsx` → `router.push(\`/tasks/${task.id}\`)`
- `/tasks/[id]/page.tsx` → server-renders task detail
- `/tasks/[id]/task-detail-client.tsx` → client shell (tabs: Timeline, Logs, Output)

**⚠ IMPORTANT**: A 541-line `task-drawer.tsx` exists on disk (slide-in drawer with 4 tabs) but is NOT wired into any page. The MC_V2_REPORT.md (2026-03-05) describes a planned drawer approach. It was implemented but never connected to the page flow. Do NOT assume drawer navigation is active — verify before any drawer-related work.

## Mobile responsive state (CURRENT — fixed 2026-03-17)
### What was fixed
| Issue | Fix applied |
|-------|------------|
| `ml-56` always applied | `md:ml-56` in LayoutShell |
| Sidebar always visible | `hidden md:flex` desktop, drawer on mobile |
| No hamburger control | `MenuIcon` in Topbar, wired through LayoutShell state |
| Search crowding mobile header | `hidden md:block` on search |
| Title truncation on detail | `break-words line-clamp-3 md:line-clamp-2` in SummaryHeader |
| Viewport meta warning | `Viewport` export in layout.tsx |

### What remains (known gaps)
- Board mode: 5 kanban columns still require horizontal scroll (~1100px min-width) on mobile
- No browser/visual validation performed — SSH-only environment
- task-drawer.tsx mobile behavior unknown (not wired)

## ⚠ CRITICAL: Untracked source files compiled into build
These files exist in `src/` on the server filesystem but are NOT committed to git.
They ARE compiled when `npm run build` runs. They affect the running app.

| File | Status | Actually running? |
|------|--------|------------------|
| `src/lib/stagnation.ts` | Untracked | **YES** — imported by `src/instrumentation.ts` with try/catch. Runs every 60s. Confirmed in journalctl. |
| `src/lib/gateway-sync.ts` | Untracked | **NO** — import disabled in `src/instrumentation.ts` |
| `src/lib/instrumentation.ts` | Untracked | **NO** — dead file, different from root `src/instrumentation.ts` |
| `src/components/task-drawer.tsx` | Untracked | **NO** — not imported anywhere |
| `src/components/connection-indicator.tsx` | Untracked | **NO** — not imported anywhere |

**Before editing any of these files, confirm current import state.** `git status` will NOT show them as modified.

### Stagnation checker (active background job)
- Source: `src/lib/stagnation.ts` (untracked, ~102 lines)
- Invoked by: `src/instrumentation.ts` (root, tracked, committed in 17fff8b)
- Behavior:
  - Auto-archives `completed` tasks older than 10 min (`ARCHIVE_AFTER_MS`)
  - Moves `queued` tasks stuck 30min+ → `blocked` with stuckReason
  - Moves `running` tasks with no log activity 10min+ → `blocked`
  - Runs every 60s, fires on startup
- Log evidence: `"Stagnation check: archived=14 stuck=2 noActivity=90"` every 60s
- **DO NOT DELETE stagnation.ts** — removing it will break the instrumentation.ts import (try/catch will silently catch the error, but archival/stuck detection will stop)

## Component inventory
| Component | Location | Git tracked? | Active in app? |
|-----------|----------|-------------|---------------|
| layout-shell.tsx | `src/components/` | ✅ | ✅ mobile nav state |
| sidebar.tsx | `src/components/` | ✅ | ✅ desktop + mobile drawer |
| topbar.tsx | `src/components/` | ✅ | ✅ |
| task-board.tsx | `src/components/` | ✅ | ✅ kanban view |
| task-table.tsx | `src/components/` | ✅ | ✅ list view |
| task-drawer.tsx | `src/components/` | ❌ untracked | ❌ NOT wired |
| connection-indicator.tsx | `src/components/` | ❌ untracked | ❌ NOT wired |
| task-detail/summary-header.tsx | `src/components/task-detail/` | ✅ | ✅ |
| task-detail/timeline.tsx | `src/components/task-detail/` | ✅ | ✅ |
| task-detail/logs-panel.tsx | `src/components/task-detail/` | ✅ | ✅ |
| task-detail/output-panel.tsx | `src/components/task-detail/` | ✅ | ✅ |
| agent-card.tsx | `src/components/` | ✅ | ✅ |
| status-badge.tsx | `src/components/` | ✅ | ✅ |
| ui/icons.tsx | `src/components/ui/` | ✅ | ✅ |

## Deep-link conventions
- Task detail URL: `/tasks/<taskId>` — full server-rendered page
- Zenith status link format: `http://187.77.19.111:301/tasks/<taskId>`
- taskId in DB = `agentos-<missionId>` for AgentOS tasks
- Example: mission `m-20260317-964` → taskId `agentos-m-20260317-964` → link `http://187.77.19.111:301/tasks/agentos-m-20260317-964`
- **`?id=` query param is NOT a detail deep-link** — it opens the board/list page filtered. See DEEPLINK-001.

## Notification state (2026-03-17)
- Table: `notification_state` in dashboard.sqlite
- Fields: taskId, messageId, lastStatus, deliveredFinal, deliveredAt, retryCount, mcLink, chatId, channel
- Written by: agentos-sync.js (reads notification_state.json from filesystem)
- API: `GET /api/tasks/:id/notification`

## Sidebar navigation (CURRENT)
```
Tasks   → /tasks
Agents  → /agents
Logs    → /logs
Footer: "Phase 0 · Local DB"
```
The MC_V2_REPORT described a 4-item nav (Tasks/Agents/Missions/Logs, footer "AgentOS v1 · MC v2") — this was NOT applied to the committed sidebar. Missions route exists at `/missions` but is not in the sidebar nav.
