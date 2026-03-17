# Zenith Memory — Change Log
> Append-only. Most recent entry first.

---

## 2026-03-17 (pass 2) — Cloud Code: system audit, memory corrections, untracked file discovery
**Request**: Reinforce Zenith configuration, extend memory with real system findings.
**Agent**: Cloud Code (configuring Zenith)

### What was discovered
1. **Untracked source files in build** (UNTRACKED-001):
   - `src/lib/stagnation.ts` — untracked but ACTIVE (runs every 60s, confirmed via journalctl)
   - `src/lib/gateway-sync.ts` — untracked, disabled
   - `src/lib/instrumentation.ts` — untracked, dead file under lib/
   - `src/components/task-drawer.tsx` — untracked, 541 lines, NOT wired (MC v2 orphan)
   - `src/components/connection-indicator.tsx` — untracked, NOT wired
   - `MC_V2_REPORT.md` — untracked, describes drawer approach that was implemented but not connected

2. **Task navigation model confirmed**: `router.push` to `/tasks/<taskId>` full page. Drawer is NOT active.

3. **Sidebar nav confirmed**: Tasks / Agents / Logs (Phase 0). Missions route exists but not in nav.

4. **Stagnation checker confirmed running**: every 60s, `archived=14 stuck=2 noActivity=90`

### Memory files updated
| File | What changed |
|------|-------------|
| `01-system-map.md` | Added untracked file table; updated component annotations |
| `03-mission-control.md` | Full rewrite: correct layout structure, navigation model, untracked file section, component table with git/active status |
| `04-task-patterns.md` | Added pre-edit checklist, SSH validation table, expanded failure modes |
| `05-known-issues.md` | Added UNTRACKED-001, MC-V2-ORPHANED, MISSIONS-NAV-001; updated status on resolved issues |
| `06-change-log.md` | This entry |
| `00-index.md` | Will be updated in this pass |

### No code changes
This pass was documentation and memory only. No source files were modified.

### Validation
- All 3 services confirmed active
- `/api/health` → 200, healthy, taskCount 325, notificationCount 3
- `git status` run to confirm tracked vs untracked file state
- journalctl confirmed stagnation is running

### Open items for Zenith to track
- UNTRACKED-001: stagnation.ts should be committed before any `git clean` operation
- MC-V2-ORPHANED: drawer must be deliberately wired or removed
- AUTH-001: no auth on any API route
- MOBILE-002: board mode still scrolls horizontally

---

## 2026-03-17 — Cloud Code configuration pass + Mobile responsive (benchmark task)
**Request**: Configure Zenith with persistent markdown memory and fix Mission Control mobile responsiveness.
**Agent**: Cloud Code (configuring Zenith)

### Zenith memory created
| File | Purpose |
|------|---------|
| docs/zenith-memory/00-index.md | Index + quick orientation |
| docs/zenith-memory/01-system-map.md | Full system map (apps, services, paths, scripts) |
| docs/zenith-memory/02-services-and-routes.md | All routes, deep-link patterns, API inventory |
| docs/zenith-memory/03-mission-control.md | MC architecture, mobile state, component inventory |
| docs/zenith-memory/04-task-patterns.md | Status block rules, build/deploy workflow, failure modes |
| docs/zenith-memory/05-known-issues.md | Bugs and technical debt with severity |
| docs/zenith-memory/06-change-log.md | This file |

### Mobile responsive changes
**Root cause**: Sidebar `fixed w-56` with no mobile hide; `<main>` hardcoded `ml-56`; no hamburger.

**Files changed**:
| File | Change |
|------|--------|
| `src/app/layout.tsx` | Delegate layout to LayoutShell; add `Viewport` export for proper meta |
| `src/components/layout-shell.tsx` | NEW — client component holding `mobileNavOpen` state; wires Sidebar + Topbar |
| `src/components/sidebar.tsx` | Desktop: `hidden md:flex`; Mobile: AnimatePresence drawer with backdrop |
| `src/components/topbar.tsx` | Hamburger button (`md:hidden`); search `hidden md:block`; `onMenuClick` prop |
| `src/components/ui/icons.tsx` | Added `MenuIcon` and `XIcon` |
| `src/components/task-detail/summary-header.tsx` | Title: `truncate` → `break-words line-clamp-3 md:line-clamp-2` |

**Behavioral changes**:
- On viewports `< 768px (md)`: sidebar hidden; hamburger in topbar opens slide-in drawer with backdrop
- On `≥ 768px`: original fixed sidebar behavior preserved; hamburger not rendered
- `<main>` now uses `md:ml-56` — zero offset on mobile
- Page padding: `p-4 md:p-6` (tighter on mobile)
- Viewport meta properly set via Next.js `Viewport` export (no more build warning)
- Task title on detail page: wraps on mobile instead of truncating

**Validated**:
- `npm run build` — clean, zero TypeScript errors, zero warnings
- `systemctl --user restart mission-control.service` — `active`
- `GET /api/health` → 200, `status: healthy`, `taskCount: 325`
- `GET /tasks` → 200
- `GET /tasks/agentos-m-20260317-964` → 200 (direct task deep-link confirmed)
- `md:ml-56`, `mobileNavOpen`, `MenuIcon` confirmed in compiled `.next/` bundles

**Not validated** (requires browser with mobile emulation):
- Visual rendering at 375px (iPhone SE), 390px (iPhone 14), 414px (Android)
- Drawer slide animation smoothness
- Board mode swipe behavior on touch device

**Open items**:
- Board mode: 5 kanban columns still require horizontal scroll on mobile — acceptable but suboptimal
- MC has no auth — pre-existing technical debt, not in scope of this change

---

## 2026-03-17 — Task delivery pipeline redesign
**Request**: Redesign task delivery: single writer, robust notifications, MESSAGE_ID capture, MC link.
**Agent**: Zenith (implemented), Cloud Code (context)
**Commit**: `17fff8b2eb92d5a51e12dcd85b93003e8ff7d94e`
**Branch**: `fix/nubo-task-delivery-redesign-2026-03-17`

**Root causes fixed**:
1. Dual-write SQLite (gateway-sync disabled, agentos-sync sole writer)
2. MESSAGE_ID capture failure (grep replaced with while/read loop)
3. Fragile DONE detection (case-insensitive + whitespace strip)
4. Missing notification state (new notification_state table + filesystem JSON)
5. Hardcoded secrets (moved to nubo.env via EnvironmentFile)

**Files changed** (repo):
- `src/instrumentation.ts` — gateway-sync disabled
- `src/lib/db.ts` — notification_state table + migrations
- `src/lib/types.ts` — AgentOS types (NotificationStateRow, AgentOSJob)
- `src/app/api/health/route.ts` — NEW
- `src/app/api/tasks/[id]/notification/route.ts` — NEW
- `src/app/api/tasks/[id]/jobs/route.ts` — NEW
- `docs/task-delivery-redesign-2026-03-17.md` — design doc

**Files changed** (server-only):
- `~/.openclaw/agentos/bin/telegram-notify`
- `~/.openclaw/agentos/bin/job-watchdog.sh`
- `~/.openclaw/agentos/bin/agentos-sync.js`
- `~/.openclaw/workspace/SOUL.md`
- `~/.openclaw/nubo.env`
- `~/.config/systemd/user/openclaw-gateway.service`

**E2E validated**: mission `m-20260317-964` — MESSAGE_ID=1304, 3 edits, deliveredFinal=1, 03:35:40 UTC
