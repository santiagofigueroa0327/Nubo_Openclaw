# Zenith Memory — System Map
> Last updated: 2026-03-17 pass 2 by Cloud Code

## OpenClaw ecosystem components
| Component | Role | Location |
|-----------|------|----------|
| OpenClaw Gateway | Multi-agent message bus (Node.js binary) | `~/.openclaw/` |
| AgentOS | Custom orchestration layer | `~/.openclaw/agentos/` |
| Mission Control | Next.js dashboard for Gateway+AgentOS | `~/nubo-dashboard/mission-control-review/` |
| Nubo | Telegram-facing orchestrator agent | openclaw agent `main` |
| Zenith | Implementation agent | openclaw agent `zenith` |
| Atlas, Chronos, Spark, Flux, Hermes, Sentinel, Aegis | Worker agents | openclaw agents |

## ⚠ Git vs Filesystem discrepancy — READ BEFORE EDITING
Some `src/` files exist on disk but are NOT committed to git.
**`git status` will not show them as modified.** They ARE compiled by `npm run build`.

| File | On disk | In git | Compiled into build | Actually used |
|------|---------|--------|--------------------|----|
| `src/lib/stagnation.ts` | ✅ | ❌ | ✅ | ✅ (stagnation checks every 60s) |
| `src/lib/gateway-sync.ts` | ✅ | ❌ | ✅ (compiled but import disabled) | ❌ |
| `src/lib/instrumentation.ts` | ✅ | ❌ | ❌ (dead, different from root) | ❌ |
| `src/components/task-drawer.tsx` | ✅ | ❌ | ✅ (compiled but not imported) | ❌ |
| `src/components/connection-indicator.tsx` | ✅ | ❌ | ✅ (compiled but not imported) | ❌ |

**Rule**: Before editing anything in `src/`, run `git status --short` and check if the file is tracked or untracked. An untracked modified file will not show in diffs — this can cause confusion about what changed.

## Mission Control — key paths
```
~/nubo-dashboard/mission-control-review/
  src/
    app/
      layout.tsx                        ← root layout — delegates to LayoutShell
      globals.css                       ← Tailwind @theme variables
      page.tsx                          ← root → redirects to /tasks
      tasks/
        page.tsx                        ← server component, fetches tasks from DB
        tasks-page-client.tsx           ← client: board/list view, filters, SSE
        [id]/
          page.tsx                      ← server component, fetches task by ID
          task-detail-client.tsx        ← client: summary + Timeline + Logs + Output
          loading.tsx
      agents/
        page.tsx / agents-page-client.tsx / [id]/page.tsx
      missions/
        page.tsx / [id]/page.tsx        ← exists but NOT in sidebar nav
      logs/
        page.tsx
      api/
        health/route.ts                 ← GET /api/health
        tasks/
          route.ts                      ← GET /api/tasks
          stream/route.ts               ← GET /api/tasks/stream (SSE)
          [id]/route.ts                 ← GET|PATCH /api/tasks/:id
          [id]/events/route.ts
          [id]/logs/route.ts
          [id]/logs/stream/route.ts     ← SSE log stream per-task
          [id]/jobs/route.ts
          [id]/notification/route.ts
          [id]/archive/route.ts
          [id]/retry/route.ts
          [id]/artifacts/route.ts
        agents/route.ts / [id]/route.ts
        missions/route.ts / [id]/route.ts
        sync/status/route.ts
    components/
      layout-shell.tsx                  ← NEW: client, holds mobileNavOpen state
      sidebar.tsx                       ← desktop: hidden md:flex; mobile: AnimatePresence drawer
      topbar.tsx                        ← hamburger md:hidden; search hidden md:block
      task-table.tsx                    ← list view, responsive hidden cols
      task-board.tsx                    ← kanban board, 5 cols, router.push navigation
      task-drawer.tsx                   ← ⚠ UNTRACKED, 541 lines, NOT wired to any page
      task-detail/
        summary-header.tsx              ← break-words title, grid-cols-2 md:grid-cols-4
        timeline.tsx
        logs-panel.tsx
        output-panel.tsx
      agent-card.tsx
      status-badge.tsx
      connection-indicator.tsx          ← ⚠ UNTRACKED, NOT imported anywhere
      log-viewer.tsx
      ui/icons.tsx                      ← includes MenuIcon, XIcon (added 2026-03-17)
    lib/
      db.ts                             ← better-sqlite3, DB_PATH=./data/dashboard.sqlite
      types.ts                          ← TypeScript interfaces for all DB rows
      gateway-sync.ts                   ← ⚠ UNTRACKED, import DISABLED in instrumentation.ts
      stagnation.ts                     ← ⚠ UNTRACKED, but ACTIVE: runs every 60s
      instrumentation.ts                ← ⚠ UNTRACKED under lib/ (dead file — NOT the startup hook)
      state-machine.ts
      rate-limit.ts
      logger.ts
      utils.ts
    instrumentation.ts                  ← ROOT LEVEL (tracked), Next.js startup hook
                                           Starts: stagnation checker only
                                           gateway-sync: disabled
  data/
    dashboard.sqlite                    ← live DB (sole writer: agentos-sync.service)
  docs/
    *.md                                ← architecture docs
    zenith-memory/                      ← THIS DIRECTORY
  MC_V2_REPORT.md                       ← ⚠ UNTRACKED, describes MC v2 (drawer approach, not yet wired)
  .next/                                ← build output
  package.json

## Databases
| DB | Path | Writer | Reader |
|----|------|--------|--------|
| dashboard.sqlite | `~/nubo-dashboard/mission-control-review/data/dashboard.sqlite` | agentos-sync.service (sole) | Mission Control (read-only from Next.js) |
| agentos.sqlite | `~/.openclaw/agentos/agentos.sqlite` | OpenClaw/AgentOS | agentos-sync.service |

## SystemD user services
| Service | Unit file | Status (as of 2026-03-17) |
|---------|-----------|--------|
| mission-control.service | `~/.config/systemd/user/mission-control.service` | active (running) |
| agentos-sync.service | `~/.config/systemd/user/agentos-sync.service` | active (running) |
| openclaw-gateway.service | `~/.config/systemd/user/openclaw-gateway.service` | active (running) |
| openclaw-sessions-cleanup.service | `~/.config/systemd/user/openclaw-sessions-cleanup.service` | active |

## Secrets / env
- `~/.openclaw/nubo.env` — mode 600 — contains NUBO_BOT_TOKEN, NUBO_CHAT_ID, MC_PUBLIC_URL
- openclaw-gateway.service has `EnvironmentFile=%h/.openclaw/nubo.env`

## Key scripts (server-only, NOT versioned in repo)
- `~/.openclaw/agentos/bin/telegram-notify` — send/edit Telegram messages
- `~/.openclaw/agentos/bin/job-watchdog.sh` — polls result.md, edits Telegram message
- `~/.openclaw/agentos/bin/agentos-sync.js` — daemon, sole DB writer
- `~/.openclaw/agentos/bin/dispatch-job` — spawn agent job
- `~/.openclaw/workspace/SOUL.md` — Nubo's operating instructions
