# Zenith Memory — Task Patterns
> Last updated: 2026-03-17 pass 2 by Cloud Code

## Mandatory first output for every task
Zenith must ALWAYS emit this block as the absolute first response, before analysis, before code:

```
Estado: <recibido|en progreso|ejecutando|en revision|entregado|completado>
Actualizacion: <short action description>
Link: <http://187.77.19.111:301/tasks/<taskId> or "descubriendo link directo de la tarea">
Agente: Zenith
```

Rules:
- No exceptions. Audio-originated, voice-transcribed, or brief follow-ups — ALL require this block first.
- `Link` must be the direct `/tasks/<taskId>` URL when the task has a known ID.
- Do NOT use the dashboard root (`http://187.77.19.111:301/tasks`) as a substitute for a direct task link.
- If taskId is not yet known, write `descubriendo link directo de la tarea` and update the block as soon as the ID is found.
- Update `Estado` and `Actualizacion` at each major phase transition.

## Known taskId patterns
| Source | taskId format | Example |
|--------|--------------|---------|
| AgentOS mission | `agentos-<missionId>` | `agentos-m-20260317-964` |
| Cron job | `cron-<name>-<ts>` | `cron-daily-report-1773700000` |
| Direct telegram | `tg-<chatId>-<ts>` | check tasks table for actual format |

## Standard task workflow for Zenith
1. Emit status block immediately
2. Read local docs + this zenith-memory directory
3. Inspect relevant source files (do not assume structure)
4. Plan: what to inspect, what to change, what to validate
5. Execute minimal coherent changes
6. Validate with the strongest available check
7. Update zenith-memory/06-change-log.md
8. Final summary with files touched, validation performed, open items

## Build and deploy workflow
```bash
# Build Mission Control
cd /home/moltbot/nubo-dashboard/mission-control-review
npm run build

# Restart service (picks up new .next/ build)
systemctl --user restart mission-control.service

# Check status
systemctl --user status mission-control.service --no-pager -l | head -20

# Check logs for errors
journalctl --user -u mission-control.service -n 30 --no-pager
```

## Common validation commands
```bash
# Health check
curl -s http://127.0.0.1:3010/api/health | python3 -m json.tool

# Task list
curl -s http://127.0.0.1:3010/api/tasks | python3 -m json.tool | head -30

# Task detail
curl -s http://127.0.0.1:3010/tasks/agentos-m-20260317-964 | head -20

# Sync status
curl -s http://127.0.0.1:3010/api/sync/status | python3 -m json.tool

# agentos-sync alive
systemctl --user is-active agentos-sync.service
```

## Nubo ↔ Zenith collaboration protocol
- Nubo coordinates and dispatches via openclaw sessions_spawn
- Zenith receives task via JOB_DIR/task.md (absolute path required)
- Zenith writes result to JOB_DIR/result.md with DONE on the last line
- Zenith responds to the chat session with exactly: ANNOUNCE_SKIP
- Nubo's SOUL.md orchestrates job-watchdog.sh which monitors result.md

## Audio/voice-originated requests
- These arrive as text transcriptions in the chat
- Zenith must still emit status block first — no exceptions
- Do not wait for full analysis before emitting the status block
- Treat missing initial status as a workflow failure

## Pre-edit checklist for Mission Control source files
Before editing ANYTHING in `src/`:
```bash
# 1. Check if the file is tracked
git status --short src/path/to/file.tsx

# 2. If untracked — confirm it's the right file and note it in the change log
# 3. Never assume a file is committed just because it exists
# 4. git diff will NOT show untracked changes — use git status + file inspection
```

Active untracked files that affect the running app:
- `src/lib/stagnation.ts` — DO NOT DELETE
- `src/lib/gateway-sync.ts` — disabled, keep as-is unless reactivating
- `src/components/task-drawer.tsx` — orphaned v2 code, not wired
- `src/components/connection-indicator.tsx` — orphaned v2 code, not wired

## Validation: what SSH can vs cannot confirm
Zenith must be explicit about this distinction:

| Validation type | SSH available? | How to check |
|----------------|---------------|-------------|
| TypeScript build | ✅ | `npm run build` |
| HTTP route 200 | ✅ | `curl -s http://127.0.0.1:3010/path` |
| API JSON response | ✅ | `curl -s .../api/health \| python3 -m json.tool` |
| Service health | ✅ | `systemctl --user is-active <service>` |
| Compiled classes in bundle | ✅ | `grep -r "class-name" .next/ --include="*.js" -l` |
| Visual mobile rendering | ❌ | No browser via SSH — state limitation explicitly |
| Drawer animation smoothness | ❌ | No browser via SSH |
| Touch interaction | ❌ | No browser via SSH |

**Rule**: If a validation cannot be done via SSH, Zenith must say so explicitly. Never claim visual/browser validation was performed if only SSH checks were run.

## Typical failure modes to avoid
| Failure | Correct behavior |
|---------|----------------|
| Starting work silently | Always emit status block first |
| Using dashboard root as task link | Find and use `/tasks/<taskId>` |
| Using `?id=` as a deep-link | Use `/tasks/<taskId>` path — see DEEPLINK-001 |
| Assuming file structure | Read actual files before editing |
| Claiming completion without validation | Always validate with real check |
| Editing wrong file path | Verify path exists before editing |
| Breaking build with TypeScript errors | `npm run build` before marking done |
| Claiming visual validation via SSH | State the limitation explicitly |
| Editing untracked file without noting it | Always note in change log |
| Deleting stagnation.ts | It is active — do NOT delete |
| Assuming task-drawer.tsx is wired | It is not — verify imports before assuming |
