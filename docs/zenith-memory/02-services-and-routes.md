# Zenith Memory — Services and Routes
> Last updated: 2026-03-17 by Cloud Code

## Network topology
```
Internet → nginx (port 301) → 127.0.0.1:3010 (Next.js mission-control)
                             → 127.0.0.1:18789 (OpenClaw Gateway WebSocket)
                             → 127.0.0.1:18791, 18792 (loopback only)
```

## Mission Control — page routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | page.tsx | redirect → /tasks |
| `/tasks` | tasks/page.tsx + tasks-page-client.tsx | Task list/board with filters |
| `/tasks/[id]` | tasks/[id]/page.tsx + task-detail-client.tsx | **Direct task deep-link** |
| `/agents` | agents/page.tsx | Agent list |
| `/agents/[id]` | agents/[id]/page.tsx | Agent detail |
| `/missions` | missions/page.tsx | Mission list |
| `/missions/[id]` | missions/[id]/page.tsx | Mission detail |
| `/logs` | logs/page.tsx | Log viewer |

### Direct task deep-link pattern
```
http://187.77.19.111:301/tasks/<taskId>
```
Examples:
- `http://187.77.19.111:301/tasks/agentos-m-20260317-964`
- `http://187.77.19.111:301/tasks/agentos-m-20260317-974`

**⚠ Note**: Task IDs from AgentOS are prefixed `agentos-` in dashboard.sqlite. The raw mission ID `m-20260317-964` becomes taskId `agentos-m-20260317-964`. Always use the DB taskId for deep links, not the raw mission ID.

There is also a query-param alias used by some external links:
```
http://187.77.19.111:301/tasks?id=<taskId>
```
This opens the board/list view filtered — it is NOT a task detail view. For a true detail deep-link use `/tasks/<taskId>`.

## Mission Control — API routes
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | Health check (db status, task count, uptime) |
| GET | `/api/tasks` | List tasks (paginated, filterable) |
| GET | `/api/tasks/stream` | SSE stream of task updates |
| GET | `/api/tasks/:id` | Single task |
| PATCH | `/api/tasks/:id` | Update task (status, etc.) |
| GET | `/api/tasks/:id/events` | Task event log |
| GET | `/api/tasks/:id/logs` | Task logs |
| GET | `/api/tasks/:id/logs/stream` | SSE log stream |
| GET | `/api/tasks/:id/jobs` | AgentOS jobs for task |
| GET | `/api/tasks/:id/notification` | Telegram notification state |
| POST | `/api/tasks/:id/archive` | Archive task |
| GET | `/api/tasks/:id/artifacts` | Task artifacts |
| POST | `/api/tasks/:id/retry` | Retry task |
| GET | `/api/agents` | List agents |
| GET | `/api/agents/:id` | Agent detail |
| GET | `/api/missions` | List missions |
| GET | `/api/missions/:id` | Mission detail |
| GET | `/api/sync/status` | agentos-sync daemon health |

**Auth status**: All routes are unauthenticated. MC is loopback-only (127.0.0.1:3010). nginx has no auth layer on port 301. This is pre-existing technical debt.

## OpenClaw Gateway WebSocket
- URL: `ws://127.0.0.1:18789`
- Protocol: JSON-RPC over WebSocket
- Auth: token from `~/.openclaw/openclaw.json`
- Session management via `openclaw sessions *` commands
