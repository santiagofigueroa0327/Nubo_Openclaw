# Zenith Memory — Task Patterns
> Last updated: 2026-03-17 by Cloud Code

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

## Typical failure modes to avoid
| Failure | Correct behavior |
|---------|----------------|
| Starting work silently | Always emit status block first |
| Using dashboard root as task link | Find and use `/tasks/<taskId>` |
| Assuming file structure | Read actual files before editing |
| Claiming completion without validation | Always validate with real check |
| Editing wrong file path | Verify path exists before editing |
| Breaking build with TypeScript errors | `npm run build` before marking done |
