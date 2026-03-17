# Current Runtime Reality — Audited on Host

**Date**: 2026-03-17
**Host**: srv1364133
**Auditor**: Claude Code (automated)
**Scope**: Full system audit of Nubo/OpenClaw live runtime

---

## A) OpenClaw / Runtime

### Version & Binary

| Property | Value |
|----------|-------|
| Gateway version | v2026.2.26 (systemd description) |
| Config lastTouchedVersion | 2026.3.2 |
| Wizard lastRunVersion | 2026.2.26 |
| Binary location | `/home/moltbot/.npm-global/lib/node_modules/openclaw/dist/index.js` |
| Process name | `openclaw-gateway` (compiled Node.js binary) |
| Node.js | v22.22.0 |
| PID | 3065012 |
| Uptime | Since 2026-03-09 21:51:48 UTC (>1 week) |
| Memory | 546.5M (peak 1.1G) |
| CPU time | 1h 9min 45s |

### Gateway Configuration

| Property | Value |
|----------|-------|
| Port | 18789 (main) |
| Additional ports | 18791, 18792 (all loopback) |
| Bind | `loopback` only |
| Auth mode | `token` |
| Mode | `local` |
| Control protocol | **WebSocket RPC** (not REST) |

### Network Listeners (loopback only)

| Port | Process | Purpose |
|------|---------|---------|
| 18789 | openclaw-gateway | Main gateway (WS RPC + SPA) |
| 18791 | openclaw-gateway | Internal (possibly inter-agent) |
| 18792 | openclaw-gateway | Internal |
| 3010 | next-server | Mission Control (Next.js) |
| 301 | nginx | External proxy → MC |
| 3000 | unknown | Unknown service |
| 3001 | unknown | Unknown service |
| 5433 | unknown | Postgres-like (non-standard port) |
| 80/443 | nginx | HTTP/HTTPS |

### Primary Model Configuration

| Property | Value |
|----------|-------|
| Primary model | `google/gemini-2.5-flash` |
| Fallbacks | `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4-6` |
| Subagent model | `google/gemini-2.5-flash` |
| Max concurrent (main) | 1 |
| Max concurrent (subagents) | 2 |
| Max spawn depth | 1 |

### Available Models

- google/gemini-2.5-flash, 2.5-pro, 2.0-flash, 3-pro-preview, 3.1-pro-preview
- google-antigravity/gemini-3-pro-high, gemini-3-flash, claude-opus-4-6-thinking, gpt-oss-120b-medium
- anthropic/claude-opus-4-6, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5
- openai/gpt-4o-mini, gpt-4o

### Context & Pruning

| Property | Value |
|----------|-------|
| Context pruning mode | `cache-ttl` |
| TTL | 30 minutes |
| Keep last assistants | 2 |
| Compaction mode | `safeguard` |
| Bootstrap max chars | 12,000 |
| Bootstrap total max | 60,000 |

### Agents (9 total)

| Agent | Model | Workspace | Session Tools | Special |
|-------|-------|-----------|---------------|---------|
| **main** (Nubo) | default (gemini-2.5-flash) | `~/.openclaw/workspace` | YES (spawn, send, list, history) | Orchestrator |
| zenith | gemini-2.5-flash | `workspace-zenith` | NO (denied) | Has web tools |
| atlas | gemini-2.5-flash | `workspace-atlas` | NO | Has web + exec |
| chronos | gemini-2.5-flash | `workspace-chronos` | NO | Has web + exec |
| spark | gemini-2.5-flash | `workspace-spark` | NO | NO exec |
| flux | gemini-2.5-flash | `workspace-flux` | NO | Has web + exec |
| hermes | gemini-2.5-flash | `workspace-hermes` | NO | Has web + exec |
| sentinel | gemini-2.5-flash | `workspace-sentinel` | NO | READ + WRITE only |
| aegis | gemini-2.5-flash | `workspace-aegis` | NO | READ + WRITE only |

**Critical observation**: Only "main" (Nubo) can use session tools. Workers are blind to the session system. Workers deny `sessions_send`, `sessions_spawn`, `sessions_list`, `sessions_history`.

### Bindings

```json
"bindings": []
```

**EMPTY ARRAY.** No static channel→agent bindings are configured. This means routing is entirely dynamic, handled by session policies and the `dmScope: "main"` setting (all DMs go to main agent).

### Session Policies

| Scope | Reset Mode | Timeout |
|-------|-----------|---------|
| DM | idle | 240 minutes |
| Group | idle | 120 minutes |
| Thread | daily | 4:00 AM |
| DM scope | `main` (all DMs → main agent) |

### Channels

#### Telegram
- **Status**: Enabled
- **Accounts**: 2 — `default` (Nubo) and `zenith`
- **DM policy**: `pairing`
- **Group policy**: `allowlist`
- **Streaming**: OFF
- **Retry**: 2 attempts, 2s–65s delay, jitter 0.4

#### Slack
- **Status**: Enabled (socket mode)
- **Streaming**: partial (native streaming on)
- **DM history limit**: 12
- **Group policy**: allowlist
- **Health issue**: Slack socket-mode health-monitor restarts every ~35 minutes due to `stale-socket`

### Auth Profiles

| Provider | Mode | Status |
|----------|------|--------|
| anthropic:default | api_key | Active (last used 2026-03-14) |
| google:default | api_key | Active (last used 2026-03-07) |
| openai:default | api_key | Active (last used 2026-03-03) |

### Skills & Plugins

| Skill/Plugin | Enabled |
|-------------|---------|
| telegram plugin | YES |
| google-gemini-cli-auth | NO (disabled) |
| gmail skill | NO (disabled, has OAuth config) |
| google-calendar skill | NO (disabled, has OAuth config) |
| google-drive skill | NO (disabled, has OAuth config) |

### Hooks

| Hook | Enabled |
|------|---------|
| session-memory | NO (disabled) |

### Heartbeat

| Property | Value |
|----------|-------|
| Interval | 0m (disabled) |
| Model | gemini-2.5-flash |
| Direct policy | block |

### Cron Jobs (17 total, 9 shown as enabled)

| Job | Schedule (COT) | Delivery | Status |
|-----|---------------|----------|--------|
| Daily Auto-Update | 04:00 daily | announce → telegram | OK |
| Resumen Diario 8PM COT | 20:00 daily | announce → telegram (chat [REDACTED]) | OK |
| Calendar Sweeper (Meet) | 07:00, 13:00 Mon-Sat | announce → last | OK |
| Daily Meeting Report | 23:30 daily | announce → telegram | OK |
| Daily Digest 07:00 COT | 07:00 daily | silent | OK |
| Chronos Midday Refresh | 12:00 daily | silent | OK |
| Atlas Weekly AI Report | 08:00 Mondays | silent | OK |
| Hermes Weekly Planning | 09:00 Mondays | silent | OK |
| Hermes Weekly Report | 19:00 Saturdays | silent | OK |

### Runtime Issues (Observed in Logs)

1. **Frequent rate limit errors**: `FailoverError: API rate limit reached` — multiple occurrences on all recent dates
2. **Slack stale-socket**: Health monitor restarts every ~35 minutes, causing brief connectivity gaps
3. **Slack pong timeouts**: Multiple `pong wasn't received` warnings, occasional ping timeouts (30s)
4. **Telegram fetch fallback**: Periodic `autoSelectFamily=false + dnsResultOrder=ipv4first` messages
5. **ANNOUNCE_SKIP pattern**: Workers respond with ANNOUNCE_SKIP (correct behavior per AgentOS design)

---

## B) Telegram / Canal Operativo

### Accounts Configured

| Account | Bot | DM Policy |
|---------|-----|-----------|
| default | Nubo bot | pairing |
| zenith | Zenith bot | pairing |

### Binding Real

- `bindings: []` — NO static binding
- DM scope: `main` — all Telegram DMs route to main agent
- Zenith has its own bot token but is NOT bound to any channel statically
- Zenith operates as an internal worker only (per AgentOS v1 design)

### Flow: Telegram → Agent

1. User sends message to Nubo bot in Telegram
2. Gateway routes to `main` agent (via `dmScope: main`)
3. Main agent receives message, decides to delegate
4. Main uses `sessions_spawn` to delegate to worker agent
5. Worker executes task, writes `result.md` in mission dir
6. `job-watchdog.sh` monitors for `DONE` keyword in result.md
7. If found → `telegram-notify send` delivers result to Telegram
8. Message ID should be captured for future edits

### telegram-notify Script (`~/.openclaw/agentos/bin/telegram-notify`)

- **Functions**: `send`, `edit`
- **Send**: Posts to Telegram, returns `MESSAGE_ID=<id>`
- **Edit**: Updates existing message by ID
- **Fallback**: If HTML parse fails, retries plain text
- **Max length**: 4096 chars (Telegram limit)
- **SECURITY ISSUE**: BOT_TOKEN hardcoded in script (line 18)

### Known Telegram Delivery Issues

1. **telegram_message_id is EMPTY**: The latest mission (m-20260316-916) has an empty `telegram_message_id` file. This confirms the MESSAGE_ID capture bug documented in the mission's own result.md.
2. **Root cause**: Nubo's SOUL.md doesn't properly capture stdout from `telegram-notify send`. The variable `$MESSAGE_ID` stays empty.
3. **Impact**: Without MESSAGE_ID, `job-watchdog.sh` cannot edit progress messages. No real-time "EN EJECUCIÓN" → "COMPLETADO" updates in Telegram.
4. **result.md DONE detection**: The watchdog does strict string matching on last line. Whitespace or encoding variations cause false negatives.

### Files Involved in Telegram Flow

| File | Purpose |
|------|---------|
| `~/.openclaw/agentos/bin/telegram-notify` | Send/edit Telegram messages |
| `~/.openclaw/agentos/bin/dispatch-job` | Create mission files, register in SQLite |
| `~/.openclaw/agentos/bin/job-watchdog.sh` | Monitor result.md for DONE, trigger delivery |
| `~/.openclaw/agentos/bin/agentosctl` | SQLite operations (mission/job CRUD) |
| `missions/<MID>/jobs/<JID>/telegram_message_id` | Stores message ID for edits |
| `missions/<MID>/jobs/<JID>/telegram_plan.md` | Step tracking for progress messages |
| `missions/<MID>/jobs/<JID>/result.md` | Final output (last line = DONE) |
| Agent SOUL.md | Nubo's orchestration instructions |

---

## C) Mission Control

### Deployment

| Property | Value |
|----------|-------|
| Directory | `~/nubo-dashboard/mission-control-review` |
| Framework | Next.js v16.1.6 |
| Port | 3010 (loopback) |
| External | nginx → port 301 |
| Database | `data/dashboard.sqlite` (WAL mode) |
| Service | `mission-control.service` + override.conf |
| Uptime | Since 2026-03-05 03:35:11 UTC |

### How MC Gets Data

MC uses **TWO independent data sync mechanisms** (this is a problem):

#### 1. Gateway Sync (built into MC)
- File: `src/lib/gateway-sync.ts`
- Method: Polls `openclaw sessions --all-agents --json` CLI every 10s
- Creates/updates tasks in SQLite based on session state
- Triggered at server startup via `src/instrumentation.ts`

#### 2. AgentOS Sync (external daemon)
- File: `~/.openclaw/agentos/bin/agentos-sync.js`
- Service: `agentos-sync.service`
- Method: Reads `agentos.sqlite`, writes to `dashboard.sqlite` every 5s
- Syncs 174 missions, adds AgentOS-specific columns (agentosId, workflowStep, validationScore, etc.)

**CONFLICT**: Both writers compete for the same SQLite file. Result: `SqliteError: database is locked` errors flooding logs continuously. This is a critical stability issue.

### SQLite Schema (dashboard.sqlite)

**Tables**:
- `tasks` — Main task tracking (id, title, status, sourceChannel, primaryAgent, model, finalOutput, errorSummary, agentosId, workflowStep, validationScore, etc.)
- `events` — Timeline events per task
- `task_logs` — Per-task log entries
- `agents_registry` — Agent metadata
- `session_task_map` — Maps OpenClaw session keys to task IDs
- `agentos_jobs` — Per-job tracking from AgentOS

**Task statuses**: queued, running, completed, blocked, failed

### Environment Variables (from systemd)

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| DB_PATH | ./data/dashboard.sqlite |
| GATEWAY_READONLY | true |
| OPENCLAW_BIN | ~/.npm-global/bin/openclaw |
| GATEWAY_POLL_SECONDS | 30 (override) |
| GATEWAY_ACTIVE_MINUTES | 120 |
| GATEWAY_TASKS_LIMIT | 80 |
| GATEWAY_OPENCLAW_TIMEOUT_MS | 5000 |

### Stagnation Detection (`src/lib/stagnation.ts`)

- Auto-archive completed tasks after 10 minutes
- Stuck in queue > 30 minutes → blocked
- Running with no activity > 10 minutes → blocked
- Runs every 60 seconds

### SSE Stream (`/api/tasks/stream`)

- Polls SQLite every 2 seconds for updated tasks
- Sends SSE events to connected clients
- Auto-closes after 10 minutes
- Provides real-time UI updates

### Git Status

| Property | Value |
|----------|-------|
| Branch | main |
| Remote | origin → github.com/santiagofigueroa0327/Nubo_Openclaw |
| Status | 3 commits ahead of origin |
| Uncommitted | 13 modified files, 15 untracked files |

### Mission Control API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tasks` | GET | List tasks (filter, paginate) |
| `/api/tasks` | POST | Create task manually |
| `/api/tasks/stream` | GET | SSE real-time updates |
| `/api/tasks/[id]/events` | GET | Task timeline |
| `/api/tasks/[id]/archive` | POST | Archive task |
| `/api/tasks/[id]/artifacts` | GET | Task artifacts |
| `/api/tasks/[id]/jobs` | GET | AgentOS jobs for task |
| `/api/tasks/[id]/logs/stream` | GET | Task log stream |
| `/api/tasks/[id]/retry` | POST | Retry task |
| `/api/missions` | GET | AgentOS missions |
| `/api/sync` | POST | Trigger sync |
| `/api/agents` | GET | Agent registry |

---

## D) Services del Host

### systemd User Services

| Service | Status | Since |
|---------|--------|-------|
| openclaw-gateway.service | **active (running)** | 2026-03-09 |
| mission-control.service | **active (running)** | 2026-03-05 |
| agentos-sync.service | **active (running)** | 2026-03-05 |
| openclaw-sessions-cleanup.service | **FAILED** | 2026-03-16 |

### openclaw-sessions-cleanup Failure

```
bash: line 1: openclaw: command not found
```

The timer runs at 09:00 UTC daily. The ExecStart uses `bash -lc 'openclaw sessions cleanup'` but `openclaw` is not in the login shell PATH. Should use full path: `/home/moltbot/.npm-global/bin/openclaw`.

### nginx Configuration

| File | Listen | Target |
|------|--------|--------|
| `/etc/nginx/sites-enabled/mission-control` | port 301 | proxy → 127.0.0.1:3010 |

Note: Port 301 is unusual. No HTTPS configured for MC. Supports WebSocket upgrade headers.

### Mission Control systemd Override

The override.conf in `~/.config/systemd/user/mission-control.service.d/` sets:
- Full PATH including npm-global
- OPENCLAW_BIN path
- GATEWAY_READONLY=true
- GATEWAY_POLL_SECONDS=30 (overrides base service's 5)
- Various cache/limit tuning

### AgentOS Configuration

| Property | Value |
|----------|-------|
| Version | 1.1.0 |
| DB | `~/.openclaw/agentos/agentos.sqlite` |
| Job timeout | 300,000 ms (5 min) |
| Max retries | 2 |
| Validation threshold | 70 |
| Reaper | Enabled (planning 2h, queued 1h, running 30m, archive 24h) |

### AgentOS Binaries (`~/.openclaw/agentos/bin/`)

| Script | Purpose |
|--------|---------|
| agentosctl | SQLite CRUD for missions, jobs, events, logs |
| agentos-sync.js | Daemon: agentos.sqlite → dashboard.sqlite |
| dispatch-job | Create mission files + SQLite entries |
| telegram-notify | Send/edit Telegram messages |
| job-watchdog.sh | Monitor result.md, trigger delivery |
| maton-preflight | Pre-check Maton API availability |
| reaper | Clean up stale missions |
| test-harness.sh | E2E testing |
| test-e2e.sh | E2E testing |
| rollback_agents_powerup.sh | Rollback script |

### Working Paths

| Path | Purpose |
|------|---------|
| `~/.openclaw/openclaw.json` | Main runtime config |
| `~/.openclaw/cron/jobs.json` | Cron job definitions |
| `~/.openclaw/agentos/` | AgentOS root (missions, DB, scripts) |
| `~/.openclaw/agentos/missions/` | 179 mission directories |
| `~/.openclaw/workspace/` | Main agent workspace |
| `~/.openclaw/workspace-{agent}/` | Per-agent workspaces (8 workers) |
| `~/nubo-dashboard/mission-control-review/` | Mission Control app |
| `~/nubo-dashboard/mission-control-review/data/dashboard.sqlite` | MC database |

---

## Security Findings

| Finding | Severity | Location |
|---------|----------|----------|
| BOT_TOKEN hardcoded in script | HIGH | `~/.openclaw/agentos/bin/telegram-notify` line 18 |
| MATON_API_KEY in systemd service | MEDIUM | `openclaw-gateway.service` Environment directive |
| GATEWAY_TOKEN in systemd service | MEDIUM | `openclaw-gateway.service` Environment directive |
| Google OAuth client secrets in openclaw.json | MEDIUM | skills.entries.gmail/calendar/drive |
| API keys in openclaw.json env section | MEDIUM | env.MATON_API_KEY |
| No secrets management system | HIGH | All secrets are plaintext in config files |
| Marketing system uses `${VAR}` substitution | — | Nubo does NOT use this pattern |

**Recommendation**: Migrate all secrets to environment variables or a `.env` file (mode 600, gitignored). Use `${VAR_NAME}` substitution in openclaw.json where supported.
