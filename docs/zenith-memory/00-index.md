# Zenith Memory — Index
> Last updated: 2026-03-17 pass 2 by Cloud Code

## Files in this directory
| File | Purpose |
|------|---------|
| 00-index.md | This file — overview and high-priority topics |
| 01-system-map.md | All apps, services, directories, entrypoints, **untracked file map** |
| 02-services-and-routes.md | Ports, routes, deep-link patterns, API inventory |
| 03-mission-control.md | MC architecture, UI areas, mobile state, task navigation, **untracked component status** |
| 04-task-patterns.md | Operating protocol, status rules, **pre-edit checklist**, Nubo↔Zenith conventions |
| 05-known-issues.md | Bugs, technical debt, gaps — severity tagged |
| 06-change-log.md | Append-only log of every meaningful change |

## ⚠ CRITICAL: Read before touching any src/ file
```bash
git status --short   # run this before editing any file in src/
```
Several `src/` files exist on the server but are **NOT in git**. They ARE compiled into the running build.

Key active untracked file: **`src/lib/stagnation.ts` — DO NOT DELETE.**

Full list: see `01-system-map.md` untracked table → `05-known-issues.md` UNTRACKED-001.

## High-priority open topics (as of 2026-03-17 pass 2)
| Issue | Severity | Summary |
|-------|----------|---------|
| UNTRACKED-001 | 🔴 | 5 untracked src/ files compiled into build; stagnation.ts is active and critical |
| AUTH-001 | 🟡 | All API routes unauthenticated; MC loopback-only via nginx |
| MOBILE-002 | 🟡 | Board mode (5 kanban cols) still requires horizontal scroll on mobile |
| MC-V2-ORPHANED | 🟡 | task-drawer.tsx (541 lines) exists but is NOT wired to any page |
| SCRIPTS-001 | 🟡 | AgentOS bin/ scripts not versioned in repo |
| MISSIONS-NAV-001 | 🟢 | /missions route works but is absent from sidebar nav |

## Quick orientation
- Repo root: `/home/moltbot/nubo-dashboard/mission-control-review/`
- Production: `http://187.77.19.111:301` (nginx → 127.0.0.1:3010)
- **Task deep-link**: `http://187.77.19.111:301/tasks/<taskId>`
- Service: `systemctl --user status mission-control.service`
- Build: `cd /home/moltbot/nubo-dashboard/mission-control-review && npm run build`
- Restart: `systemctl --user restart mission-control.service`
- Health: `curl -s http://127.0.0.1:3010/api/health | python3 -m json.tool`
- DB path: `~/nubo-dashboard/mission-control-review/data/dashboard.sqlite`
- Active branch: `fix/nubo-task-delivery-redesign-2026-03-17`
- Last commit: `3a2c00f` — mobile responsive + Zenith memory (pass 1)

## Mandatory Zenith status block — FIRST output of every task, no exceptions
```
Estado: <recibido|en progreso|ejecutando|en revision|entregado|completado>
Actualizacion: <accion actual>
Link: <http://187.77.19.111:301/tasks/<taskId> o "descubriendo link directo de la tarea">
Agente: Zenith
```
Rules enforced here:
- ALL tasks require this first — audio, voice, follow-ups, brief requests, no exceptions
- `Link` = `/tasks/<taskId>` path — NOT the dashboard root `/tasks`; NOT `?id=` param
- Update `Estado` + `Actualizacion` at each major phase transition
- If taskId unknown: write the placeholder, find the ID, then update the block
