# Task Delivery Pipeline Redesign — 2026-03-17

## Root Cause Analysis

### 1. MESSAGE_ID Capture Failure
**Cause:** `grep -oP 'MESSAGE_ID=\K\d+' || true` in SOUL.md silently returned empty on
non-matching output. Nubo proceeded without a MESSAGE_ID, making all subsequent edits fail.
**Fix:** Replaced with robust `while/read` loop in SOUL.md + python3 extraction in `telegram-notify`.

### 2. Fragile DONE Detection
**Cause:** Watchdog used exact `== "DONE"` match. Workers sometimes wrote `done`, `Done`,
or `DONE ` (trailing whitespace), causing the watchdog to timeout on completed jobs.
**Fix:** Watchdog now strips whitespace and compares case-insensitively.

### 3. Dual-Write SQLite Locks
**Cause:** `gateway-sync.ts` (inside Next.js, 10s interval) and `agentos-sync.js` (daemon, 5s interval)
both wrote to `dashboard.sqlite`, causing `SQLITE_BUSY` errors.
**Fix:** Disabled gateway-sync in `instrumentation.ts`. `agentos-sync.js` is now the sole writer.

### 4. Missing Notification State
**Cause:** No persistent tracking of Telegram message lifecycle. If a step failed or the process
restarted, the MESSAGE_ID was lost and the task went silent.
**Fix:** New `notification_state` table in SQLite + `notification_state.json` per job in filesystem.

### 5. Silent Watchdog on Empty MESSAGE_ID
**Cause:** Watchdog returned early with `exit 0` when MESSAGE_ID was empty.
**Fix:** `ensure_message_id()` sends a new Telegram message and persists the ID.

### 6. Hardcoded Secrets
**Cause:** Bot token and chat ID were hardcoded in `telegram-notify`.
**Fix:** Moved to `~/.openclaw/nubo.env` (mode 600), loaded via systemd `EnvironmentFile`.

## Architecture Decision

**Choice: Option A — SQLite as Primary Store (Single Writer)**

- `agentos-sync.js` is the sole writer to `dashboard.sqlite`
- Reads filesystem (missions/jobs) and AgentOS SQLite, writes to dashboard SQLite
- Mission Control (Next.js) is read-only against dashboard.sqlite
- Eliminates all `SQLITE_BUSY` contention

## Files Modified

### Mission Control (repo)
| File | Change |
|------|--------|
| `src/lib/types.ts` | Added AgentOS fields to TaskRow, new NotificationStateRow, AgentOSJob types |
| `src/lib/db.ts` | Added notification_state table, migration columns |
| `src/instrumentation.ts` | Disabled gateway-sync, fixed stagnation import |
| `src/app/api/health/route.ts` | NEW — health endpoint |
| `src/app/api/tasks/[id]/notification/route.ts` | NEW — notification state API |
| `src/app/api/tasks/[id]/jobs/route.ts` | Fixed column alias (id → jobId) |

### AgentOS (live system)
| File | Change |
|------|--------|
| `~/.openclaw/agentos/bin/telegram-notify` | Rewritten: env vars, python3 extraction, fallbacks |
| `~/.openclaw/agentos/bin/job-watchdog.sh` | Rewritten: case-insensitive DONE, ensure_message_id, MC link, notification persistence |
| `~/.openclaw/agentos/bin/agentos-sync.js` | Rewritten: sole writer, transactions, notification sync |
| `~/.openclaw/agentos/bin/test-delivery-redesign.sh` | NEW — 11-test automated suite |
| `~/.openclaw/workspace/SOUL.md` | Updated MESSAGE_ID capture, MC link, verification step |
| `~/.openclaw/nubo.env` | NEW — secrets file (mode 600) |
| `~/.config/systemd/user/openclaw-gateway.service` | Added EnvironmentFile |
| `~/.config/systemd/user/openclaw-sessions-cleanup.service` | Fixed PATH/ExecStart |

## Test Results

### Offline Tests (12/12 passed)
- telegram-notify rejects missing env vars
- notification_state.json persistence
- DONE detection (6 variants: DONE, done, Done, trailing/leading whitespace)
- FAILED detection with reason extraction
- Missing result.md → timeout behavior
- agentos-sync.js single run (174/174 missions synced)
- /api/health endpoint returns valid JSON

### Live Tests (4/4 passed)
- telegram-notify send returns MESSAGE_ID
- telegram-notify edit modifies same message
- Idempotent edit (same content → not_modified)
- Watchdog creates new message when MESSAGE_ID is empty

### E2E Validation
- **Mission:** m-20260317-964, Agent: zenith
- **Task:** "Verificar GET /api/health en Mission Control"
- **Result:** Agent found existing endpoint, reported functionality
- **Telegram:** Single message (ID 1304), edited in place with progress updates, final COMPLETADO delivery
- **MC Link:** Present in notification_state (`http://187.77.19.111:301/tasks?id=agentos-m-20260317-964`)
- **Notification state:** `deliveredFinal: 1`, `lastStatus: completed`

## Rollback Plan

### Mission Control
```bash
git checkout main -- src/lib/types.ts src/lib/db.ts src/instrumentation.ts
git checkout main -- src/app/api/health src/app/api/tasks/[id]/notification
cd ~/nubo-dashboard/mission-control-review && npm run build
systemctl --user restart mission-control.service
```

### AgentOS scripts
Backups created by the redesign process. To revert:
```bash
# Restore pre-redesign telegram-notify, job-watchdog.sh, agentos-sync.js from git history
# Remove nubo.env reference from systemd service:
# Edit ~/.config/systemd/user/openclaw-gateway.service — remove EnvironmentFile line
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway.service
```

## Marketing Patterns Adopted
1. **Secrets via environment variables** — no hardcoded tokens
2. **Single-writer DB architecture** — eliminates lock contention
3. **Health endpoint** — standard operational monitoring
4. **Notification state persistence** — reliable delivery tracking
