# Runtime vs Documentation Gap Analysis

**Date**: 2026-03-17
**Method**: Compared live runtime state against existing repo documentation and MEMORY.md

---

## Summary

The existing documentation captures the broad architecture correctly but misses critical operational details, active bugs, and the actual data flow. The biggest gap is between what the docs describe as the delivery mechanism and what actually happens at runtime.

---

## Gap-by-Gap Analysis

### 1. OpenClaw Version

| Source | Says | Reality |
|--------|------|---------|
| MEMORY.md | Implies gateway binary at `~/.openclaw/dist/index.js` | Binary is at `~/.npm-global/lib/node_modules/openclaw/dist/index.js` |
| Systemd service | v2026.2.26 | Config was last touched by v2026.3.2 |

**Impact**: Minor. Path difference means some scripts/docs reference wrong location.

---

### 2. Subagent Model

| Source | Says | Reality |
|--------|------|---------|
| MEMORY.md | `subagents.model: claude-sonnet-4-6` | Actually `google/gemini-2.5-flash` |
| MEMORY.md | Primary was changed from `claude-opus-4-6` to `claude-sonnet-4-6` | Primary is `google/gemini-2.5-flash` with fallbacks to `openai/gpt-4o-mini` and `anthropic/claude-sonnet-4-6` |

**Impact**: High. The model configuration has been substantially changed since the MEMORY.md was written. All agents now default to Gemini Flash, not Anthropic models.

---

### 3. Bindings

| Source | Says | Reality |
|--------|------|---------|
| MEMORY.md | "Zenith Telegram binding removed (solo worker interno)" | `bindings: []` — ALL bindings removed, not just Zenith's |
| Implicit assumption | Some binding routes Telegram → agents | NO bindings at all. Routing is via `dmScope: main` |

**Impact**: Medium. The routing mechanism is entirely different from what static bindings would imply.

---

### 4. AgentOS v1 Design vs Reality

| MEMORY.md States | Runtime Reality |
|-----------------|-----------------|
| "Workers respond ANNOUNCE_SKIP" | ✅ Confirmed in logs |
| "Blackboard: missions/<MID>/jobs/<JID>" | ✅ Confirmed (179 missions) |
| "Validation: Sentinel → PASS/FAIL → repair loop (max 2 retries)" | ⚠️ Sentinel exists but validation flow is unclear from logs |
| "Assembly: Aegis → final_answer_telegram.md" | ⚠️ Not observed in recent missions. telegram-notify handles delivery directly |
| "Zenith Telegram binding removed" | ✅ But Zenith still has its own bot token configured |

**Impact**: High. The assembly step (Aegis) and validation loop (Sentinel) are configured but may not be actively used in the current flow. Recent missions show direct dispatch→worker→result→delivery without these intermediate steps.

---

### 5. Rate Limit Configuration

| MEMORY.md States | Runtime Reality |
|-----------------|-----------------|
| `retry.maxDelayMs: 65000` | Cannot verify directly (not in top-level config), but Telegram retry maxDelay is 65000 |
| `retry.jitter: 0.4` | Confirmed in Telegram channel config |
| Rate limit events | Still occurring frequently as of 2026-03-17 |

**Impact**: Medium. Rate limits remain a problem despite tuning.

---

### 6. Mission Control Data Path

| Existing Docs | Runtime Reality |
|--------------|-----------------|
| MC_V2_REPORT.md exists | MC has evolved beyond what the report describes |
| Implied: single data source | TWO independent sync processes write to the same SQLite |
| Not documented | `agentos-sync.service` runs as separate daemon |
| Not documented | `gateway-sync.ts` runs inside Next.js process |
| Not documented | SQLite `database is locked` errors occur every few minutes |

**Impact**: Critical. The dual-write problem is causing persistent database lock errors and is not documented anywhere.

---

### 7. Service Health

| Expected | Reality |
|----------|---------|
| All services healthy | `openclaw-sessions-cleanup.service` is FAILED |
| | Reason: `openclaw: command not found` (PATH issue) |
| | Dead sessions accumulate without cleanup |

**Impact**: Medium. Session accumulation can affect memory and performance over time.

---

### 8. Telegram Delivery

| Documented Design | Runtime Reality |
|-------------------|-----------------|
| telegram-notify sends + captures MESSAGE_ID | MESSAGE_ID capture is BROKEN (empty file) |
| job-watchdog monitors and edits messages | Cannot edit (no ID). Sends new message instead |
| Progress updates: EN EJECUCIÓN → COMPLETADO | Only initial send works; no progressive updates |

**Impact**: Critical. This is the core user-facing bug. The system cannot provide real-time progress updates in Telegram.

---

### 9. Secrets Management

| Expected | Reality |
|----------|---------|
| Secrets should be external | BOT_TOKEN hardcoded in telegram-notify script |
| Environment variables | MATON_API_KEY and GATEWAY_TOKEN in systemd service file plaintext |
| | Google OAuth secrets in openclaw.json |
| Marketing system uses `${VAR}` substitution | Nubo has raw values everywhere |

**Impact**: High (security). Any file leak exposes all credentials.

---

### 10. Port / Access Configuration

| Expected | Reality |
|----------|---------|
| Standard ports | MC accessible on port 301 (unusual) |
| HTTPS for external access | No HTTPS configured for Mission Control |
| | Only nginx proxy, no auth on MC |

---

## Files That Should Exist in Repo But Don't

| File | Purpose | Currently Lives |
|------|---------|-----------------|
| systemd/openclaw-gateway.service | Gateway service definition | Only in `~/.config/systemd/user/` |
| systemd/agentos-sync.service | Sync daemon definition | Only in `~/.config/systemd/user/` |
| systemd/mission-control.service.d/override.conf | MC overrides | Only in `~/.config/systemd/user/` |
| nginx/mission-control.conf | nginx proxy config | In repo but also in `/etc/nginx/` |
| config/cron-jobs-schema.md | Cron job documentation | Nowhere |
| config/agentos-config-schema.md | AgentOS config docs | Nowhere |
| scripts/ (sanitized copies) | AgentOS operational scripts | Only in `~/.openclaw/agentos/bin/` |

---

## Documentation That Exists But Is Outdated

| Document | Issue |
|----------|-------|
| README.md | Doesn't reflect current AgentOS layer |
| MC_V2_REPORT.md | Pre-dates agentos-sync and dual-write issue |
| MEMORY.md (Claude auto-memory) | Model config is stale, missing dual-sync info |
