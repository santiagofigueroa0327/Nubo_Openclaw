# Zenith Memory — Mission Control Architecture
> Last updated: 2026-03-17 by Cloud Code

## Stack
- **Framework**: Next.js 16.1.6 (App Router, React Server Components)
- **Styling**: Tailwind CSS v4 (via `@import "tailwindcss"` + `@theme` in globals.css)
- **Database**: better-sqlite3 (WAL mode, busy_timeout 10000ms)
- **Animation**: Framer Motion
- **Runtime**: Node.js 22.22.0

## Layout structure
```
RootLayout (layout.tsx)
  <Sidebar />              ← fixed w-56, z-30 — PROBLEM: no mobile hide
  <main className="ml-56"> ← PROBLEM: always offset 224px
    <Topbar />             ← sticky h-14
    <div className="p-6">
      {children}           ← page content
    </div>
  </main>
```

## Mobile responsive state (as of 2026-03-17)
### What works on mobile
- Task table: columns hidden with `hidden md:table-cell` / `hidden sm:table-cell`
- Task detail: `grid grid-cols-1 lg:grid-cols-2` (stacks on mobile)
- Summary header: `grid grid-cols-2 md:grid-cols-4` (partial)
- Task board cards: `flex-wrap gap-1`

### What breaks on mobile (ROOT CAUSES)
1. **Sidebar always visible + content offset**
   - `sidebar.tsx`: `fixed left-0 top-0 h-screen w-56` — no `hidden sm:hidden`
   - `layout.tsx`: `<main className="ml-56">` — content always pushed 224px right
   - On mobile (320-640px), sidebar consumes 70%+ of viewport width
   - **Fix**: hide sidebar below `md` breakpoint, add hamburger drawer, remove `ml-56` on small screens

2. **Board mode horizontal overflow**
   - `task-board.tsx`: 5 columns each `min-w-[220px]` = ~1100px min-width
   - Has `overflow-x-auto` container but swipe is suboptimal
   - **Fix**: on mobile, board defaults to list or renders single-column scroll

3. **Topbar search input fixed width**
   - `topbar.tsx`: `w-52` input — doesn't collapse on mobile
   - Overlaps with page title on narrow screens
   - **Fix**: hide search on mobile or collapse to icon

4. **SummaryHeader title truncation**
   - `summary-header.tsx`: `h2` with `truncate` — long task titles invisible on mobile
   - **Fix**: allow `break-words` or `line-clamp-3` on small screens

## Component inventory with mobile notes
| Component | Mobile issue | Severity |
|-----------|-------------|---------|
| layout.tsx | `ml-56` always applied | 🔴 Critical |
| sidebar.tsx | Always visible, no drawer | 🔴 Critical |
| topbar.tsx | `w-52` search not collapsing | 🟡 Medium |
| task-board.tsx | Horizontal scroll 5 cols | 🟡 Medium |
| task-table.tsx | Partially handled already | 🟢 Low |
| task-detail-client.tsx | Grid already responsive | 🟢 Low |
| summary-header.tsx | Title truncation on mobile | 🟡 Medium |

## Deep-link conventions
- Task detail URL: `/tasks/<taskId>` (server-rendered, always valid)
- Zenith status link format: `http://187.77.19.111:301/tasks/<taskId>`
- taskId in DB = `agentos-<missionId>` for AgentOS tasks
- Example: mission `m-20260317-964` → taskId `agentos-m-20260317-964` → link `/tasks/agentos-m-20260317-964`

## Notification state (new as of 2026-03-17)
- Table: `notification_state` in dashboard.sqlite
- Fields: taskId, messageId, lastStatus, deliveredFinal, deliveredAt, retryCount, mcLink, chatId, channel
- Written by: agentos-sync.js (reads notification_state.json from filesystem)
- API: `GET /api/tasks/:id/notification`

## Known undocumented behaviors
- Root page `/` has no explicit redirect — Next.js App Router falls through to first matching segment
- `task-drawer.tsx` exists as a component but does not appear to be used in current task flow (tasks navigate to `/tasks/[id]` full page instead)
- `src/lib/instrumentation.ts` (under lib/) is different from `src/instrumentation.ts` (root level). The root one runs on Next.js startup; the lib one appears to be leftover/dead code — verify before using.
