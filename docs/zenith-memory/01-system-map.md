# Zenith Memory — System Map
> Last updated: 2026-03-17 by Cloud Code

## OpenClaw ecosystem components
| Component | Role | Location |
|-----------|------|----------|
| OpenClaw Gateway | Multi-agent message bus (Node.js binary) | `~/.openclaw/` |
| AgentOS | Custom orchestration layer | `~/.openclaw/agentos/` |
| Mission Control | Next.js dashboard for Gateway+AgentOS | `~/nubo-dashboard/mission-control-review/` |
| Nubo | Telegram-facing orchestrator agent | openclaw agent `main` |
| Zenith | Implementation agent | openclaw agent `zenith` |
| Atlas, Chronos, Spark, Flux, Hermes, Sentinel, Aegis | Worker agents | openclaw agents |

## Mission Control — key paths
```
~/nubo-dashboard/mission-control-review/
  src/
    app/
      layout.tsx                        ← root layout (Sidebar + Topbar + main)
      globals.css                       ← Tailwind @theme variables
      page.tsx                          ← root → redirects to /tasks
      tasks/
        page.tsx                        ← server component, fetches tasks from DB
        tasks-page-client.tsx           ← client: board/list view, filters, SSE
        [id]/
          page.tsx                      ← server component, fetches task by ID
          task-detail-client.tsx        ← client: breadcrumb + summary + grid
          loading.tsx
      agents/
        page.tsx / [id]/page.tsx
      missions/
        page.tsx / [id]/page.tsx
      logs/
        page.tsx
      api/
        health/route.ts                 ← GET /api/health (NEW 2026-03-17)
        tasks/
          route.ts                      ← GET /api/tasks
          stream/route.ts               ← GET /api/tasks/stream (SSE)
          [id]/route.ts                 ← GET|PATCH /api/tasks/:id
          [id]/events/route.ts
          [id]/logs/route.ts
          [id]/logs/stream/route.ts     ← SSE log stream
          [id]/jobs/route.ts            ← NEW 2026-03-17
          [id]/notification/route.ts    ← NEW 2026-03-17
          [id]/archive/route.ts
          [id]/artifacts/route.ts
          [id]/retry/route.ts
        agents/route.ts / [id]/route.ts
        missions/route.ts / [id]/route.ts
        sync/status/route.ts
    components/
      sidebar.tsx                       ← fixed w-56 left nav (MOBILE: needs drawer)
      topbar.tsx                        ← sticky h-14 header
      task-table.tsx                    ← table view with responsive hidden cols
      task-board.tsx                    ← kanban board (horizontal scroll, 5 cols)
      task-drawer.tsx                   ← slide-in detail drawer (unused in current flow)
      task-detail/
        summary-header.tsx              ← grid-cols-2 md:grid-cols-4 (partially responsive)
        timeline.tsx
        logs-panel.tsx
        output-panel.tsx
      agent-card.tsx
      status-badge.tsx
      connection-indicator.tsx
      log-viewer.tsx
      topbar.tsx
      ui/icons.tsx
    lib/
      db.ts                             ← better-sqlite3, DB_PATH=./data/dashboard.sqlite
      types.ts                          ← TypeScript interfaces for all DB rows
      gateway-sync.ts                   ← DISABLED (dual-write fix 2026-03-17)
      stagnation.ts                     ← stagnation checker (started in instrumentation.ts)
      state-machine.ts
      rate-limit.ts
      logger.ts
      utils.ts
    instrumentation.ts                  ← Next.js startup hook (stagnation only, gateway-sync OFF)
  data/
    dashboard.sqlite                    ← live DB (sole writer: agentos-sync.service)
  docs/
    *.md                                ← architecture docs
    zenith-memory/                      ← THIS DIRECTORY
  .next/                                ← build output
  package.json

## Databases
| DB | Path | Writer | Reader |
|----|------|--------|--------|
| dashboard.sqlite | `~/nubo-dashboard/mission-control-review/data/dashboard.sqlite` | agentos-sync.service (sole) | Mission Control (read-only from Next.js) |
| agentos.sqlite | `~/.openclaw/agentos/agentos.sqlite` | OpenClaw/AgentOS | agentos-sync.service |

## SystemD user services
| Service | Unit file | Status |
|---------|-----------|--------|
| mission-control.service | `~/.config/systemd/user/mission-control.service` | active (running) |
| agentos-sync.service | `~/.config/systemd/user/agentos-sync.service` | active (running) |
| openclaw-gateway.service | `~/.config/systemd/user/openclaw-gateway.service` | active (running) |
| openclaw-sessions-cleanup.service | `~/.config/systemd/user/openclaw-sessions-cleanup.service` | active |

## Secrets / env
- `~/.openclaw/nubo.env` — mode 600 — contains NUBO_BOT_TOKEN, NUBO_CHAT_ID, MC_PUBLIC_URL
- openclaw-gateway.service has `EnvironmentFile=%h/.openclaw/nubo.env`

## Key scripts (server-only, NOT versioned)
- `~/.openclaw/agentos/bin/telegram-notify` — send/edit Telegram messages
- `~/.openclaw/agentos/bin/job-watchdog.sh` — polls result.md, edits Telegram message
- `~/.openclaw/agentos/bin/agentos-sync.js` — daemon, sole DB writer
- `~/.openclaw/agentos/bin/dispatch-job` — spawn agent job
- `~/.openclaw/workspace/SOUL.md` — Nubo's operating instructions
