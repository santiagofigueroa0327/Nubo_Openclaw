# Zenith Memory — Index
> Last updated: 2026-03-17 by Cloud Code (configuration pass)

## Files in this directory
| File | Purpose |
|------|---------|
| 00-index.md | This file — overview and high-priority topics |
| 01-system-map.md | All apps, services, directories, entrypoints |
| 02-services-and-routes.md | Ports, routes, deep-link patterns, API inventory |
| 03-mission-control.md | MC architecture, UI areas, responsive state, task routing |
| 04-task-patterns.md | Recurring workflows, status conventions, Nubo↔Zenith protocol |
| 05-known-issues.md | Bugs, technical debt, gaps |
| 06-change-log.md | Append-only log of every meaningful change |

## High-priority open topics (as of 2026-03-17)
1. **Mobile responsive** — sidebar has no mobile drawer; `ml-56` always applied; board mode overflows on small screens. Fixed in 2026-03-17 pass (see 06-change-log.md).
2. **MC auth** — all API routes unprotected. MC is loopback-only behind nginx on port 301. Pre-existing debt, not introduced by redesign.
3. **AgentOS scripts not versioned** — telegram-notify, job-watchdog, agentos-sync live only on server filesystem.
4. **Task deep-link pattern confirmed** — `/tasks/[id]` is a real dynamic route. Use `http://187.77.19.111:301/tasks/<taskId>` for direct links.

## Quick orientation
- Repo root: `/home/moltbot/nubo-dashboard/mission-control-review/`
- Production app: `http://187.77.19.111:301` (nginx → 127.0.0.1:3010)
- Service: `systemctl --user status mission-control.service`
- Build: `cd /home/moltbot/nubo-dashboard/mission-control-review && npm run build`
- Restart: `systemctl --user restart mission-control.service`
