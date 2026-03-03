# Server Audit: VPS `srv1364133`

_Generated: 2026-03-03 | Updated: 2026-03-03 22:43 UTC (post-P0 hardening, live verification)_

## 1. System Overview

| Property | Value |
|----------|-------|
| Hostname | `srv1364133` |
| OS | Ubuntu, Linux 6.8.0-94-generic x86_64 |
| Node.js | v22.22.0 |
| RAM | 3.8 GiB total, 2.4 GiB used, 856 MiB free |
| Swap | None configured |
| Disk | 48 GB total, 27 GB used (56%), 21 GB available on `/dev/sda1` |
| User | `moltbot` (UID 1001) |

---

## 2. Service Status

### 2.1 openclaw-gateway.service

| Property | Value |
|----------|-------|
| Status | **active (running)** since 05:53 UTC (16+ hours uptime) |
| Enabled | Yes |
| Version | v2026.2.26 (updated to 2026.3.2 during the day) |
| PID | 2799978 |
| Memory | 449.2 MiB (peak: 1.8 GiB) |
| CPU | 5 min 59s total |
| Tasks | 11 |

**Log patterns observed:**
- `[tools] tools.profile (coding) allowlist contains unknown entries (apply_patch, cron)` — repeated every cron cycle. Indicates the tools allowlist references plugins that are not installed.
- `[tools] exec failed: /bin/bash: line 1: cron: command not found` — the agent tried to run system `cron` command instead of OpenClaw's `openclaw cron add`. Repeated 3x at 12:03.
- `[tools] exec failed: /bin/bash: line 2: python: command not found` — system has `python3` but not `python` symlink.
- Skills update: `gmail` updated to 1.0.6. `google-calendar` and `google-workspace-mcp` skipped (flagged by VirusTotal). `google-drive` and `google-docs` skipped (local changes).
- `No reply from agent` at 18:00 — agent did not respond to a cron-triggered task.
- Multiple `exec.approval.waitDecision 119986ms` — exec approval requests timing out after ~2 minutes (expected behavior with `ask=always`).

### 2.2 mission-control.service

| Property | Value |
|----------|-------|
| Status | **active (running)** since 07:06 UTC (14+ hours uptime) |
| Enabled | Yes |
| Drop-in | `override.conf` present |
| PID | 2824972 |
| Memory | 115.8 MiB (peak: 563 MiB) |
| CPU | 50.8s total |
| Tasks | 24 |

**Log patterns observed:**
- **Restart storm at 04:05 UTC:** Service restarted 25+ times in rapid succession with `Error: Could not find a production build in the '.next' directory`. This indicates a build artifact was missing or deleted. Eventually recovered after a stop/start cycle.
- `Failed to kill control group ... ignoring: Invalid argument` — appears on multiple stop operations. This is a known systemd cgroup issue, non-critical but noisy.
- Seed endpoint called at 04:38 (`Database seeded` in logs) — confirms seed is accessible in production.
- SQLite initialized at `/home/moltbot/nubo-dashboard/mission-control-review/data/dashboard.sqlite`

### 2.3 nginx

Ports 80 and 443 are listening (likely nginx or another web server). Port 301 is listening on `0.0.0.0`.

---

## 3. Port Mapping

| Port | Process | Bind Address | Accessible From Internet? |
|------|---------|-------------|--------------------------|
| 18789 | openclaw-gateway | 127.0.0.1 + ::1 | **No** (loopback only) |
| 3010 | next-server | `127.0.0.1` | **No** (✅ FIXED — loopback only since 22:43 UTC) |
| 301 | nginx | 0.0.0.0 | Yes (intentional proxy) |
| 80 | (web server) | 0.0.0.0 + [::] | Yes |
| 443 | (web server) | 0.0.0.0 + [::] | Yes |

**~~Critical finding~~ RESOLVED:** Next.js is now bound to `127.0.0.1` only (confirmed via `ss -tlnp` at 22:43 UTC). The P0-5 fix added `-H 127.0.0.1` to the ExecStart command. Port 3010 is no longer accessible from the internet.

---

## 4. Configuration State

### 4.1 openclaw.json

- **Location:** `~/.openclaw/openclaw.json` (7114 bytes, last modified 05:53 UTC)
- **Permissions:** `-rw-------` (owner-only read/write)

**Top-level keys (no values shown):**
```
meta, wizard, auth, agents, tools, bindings,
messages, commands, session, hooks, channels,
gateway, skills, plugins
```

Matches the documented structure in `docs/02-config-openclaw-json.md`.

### 4.2 Agent Directories

```
~/.openclaw/agents/
├── main/    (created Feb 27)
└── zenith/  (created Mar 2)
```

Both agents have `auth-profiles.json` in their agent subdirectories (as documented).

### 4.3 Workspaces

**Main workspace** (`~/.openclaw/workspace/`):
- Contains: AGENTS.md, CHANGELOG.md, HEARTBEAT.md, IDENTITY.md, MEMORY.md, README.md, SESSION-STATE.md, SOUL.md, TOOLS.md, ERROR_REPORT.md
- Has `.git/` directory (version controlled)
- Has `.env` file (172 bytes) — **potential secret exposure if not gitignored within the workspace**
- Has `.clawhub/` and `.openclaw/` subdirectories

**Zenith workspace** (`~/.openclaw/workspace-zenith/`):
- Contains: AGENTS.md, BOOTSTRAP.md, HEARTBEAT.md, IDENTITY.md, MEMORY.md, SOUL.md, TOOLS.md, USER.md
- Has `.git/` directory
- Has `.openclaw/` subdirectory

---

## 5. Log Analysis

### 5.1 Gateway — Error Summary

| Error Pattern | Count | Severity | Action |
|--------------|-------|----------|--------|
| `allowlist contains unknown entries (apply_patch, cron)` | ~6/day | Low | Remove `apply_patch` and `cron` from tools allowlist in openclaw.json |
| `exec failed: cron: command not found` | 3 | Medium | Agent should use `openclaw cron add` instead of system `cron` |
| `exec failed: python: command not found` | 1 | Low | Create symlink: `ln -s /usr/bin/python3 /usr/local/bin/python` or update scripts |
| `No reply from agent` | 1 | Medium | Cron task at 18:00 got no response — investigate agent availability |
| VirusTotal flagged skills | 2 skills | Medium | Review google-calendar and google-workspace-mcp before updating |

### 5.2 Mission Control — Error Summary

| Error Pattern | Count | Severity | Action |
|--------------|-------|----------|--------|
| `.next build not found` restart storm | 25+ restarts | High | Root cause: `.next` directory was deleted/missing. Build artifacts must be preserved. |
| `Failed to kill control group` | ~8 | Low | Known systemd cgroup v2 issue. Non-critical. |
| Seed endpoint called in production | 1 | High | Gate behind `NODE_ENV` check |

### 5.3 Error Frequency

- Gateway: stable after 05:53. Low error volume (~10 warnings/day).
- Mission Control: restart storm at 04:05 (25 restarts in ~30s), then stable after 04:05:39. Multiple restart/rebuild cycles between 04:45 and 07:06.

---

## 6. Drift Analysis (Repo vs Docs vs Server)

### 6.1 Three-Location Comparison (post-P0 hardening)

| Location A | Location B | Status |
|-----------|-----------|--------|
| Repo (`~/Nubo_Openclaw-main/mission-control.service`) | Deploy (`~/nubo-dashboard/mission-control-review/mission-control.service`) | ✅ **IDENTICAL** |
| Deploy (`~/nubo-dashboard/mission-control-review/mission-control.service`) | Installed (`~/.config/systemd/user/mission-control.service`) | ✅ **IDENTICAL** |
| Installed base unit | `override.conf` | ⚠️ **OVERRIDE IS STALE** |

### 6.2 Override Drift (remaining issue)

The file `~/.config/systemd/user/mission-control.service.d/override.conf` contains:

```ini
[Service]
Environment=PATH=/usr/local/sbin:/usr/local/bin:...:/home/moltbot/.npm-global/bin  # UNIQUE
Environment=OPENCLAW_BIN=/home/moltbot/.npm-global/bin/openclaw  # DUPLICATE
Environment=GATEWAY_POLL_SECONDS=5    # SET TWICE — dead code
Environment=GATEWAY_READONLY=true     # DUPLICATE
Environment=GATEWAY_POLL_SECONDS=30   # overrides the =5 above
Environment=GATEWAY_ACTIVE_MINUTES=120   # DUPLICATE
Environment=GATEWAY_TASKS_LIMIT=80       # DUPLICATE
Environment=GATEWAY_OPENCLAW_TIMEOUT_MS=5000  # DUPLICATE
```

**Issues:**
1. `GATEWAY_POLL_SECONDS` set twice (`5` then `30`). Systemd uses last value — `5` is dead code.
2. All values except `PATH` are now redundant with the updated base unit file.
3. `PATH` is **only** in the override — if removed, `npm` won't be found.

**Fix:** Add `Environment=PATH=...` to the base unit file in repo, then delete `override.conf` on server.

### 6.3 Previous Drift (resolved)

| Item | Old Repo | Server Reality | Status |
|------|----------|----------------|--------|
| WorkingDirectory | `%h/Mission control` | `%h/nubo-dashboard/mission-control-review` | ✅ FIXED |
| ExecStart | `node node_modules/.bin/next` | `bash -lc 'npm run start -- -H 127.0.0.1'` | ✅ FIXED |
| Restart | `on-failure` | `always` | ✅ FIXED |
| GATEWAY_READONLY | `false` | `true` | ✅ FIXED |
| OPENCLAW_BIN | Missing | Present | ✅ FIXED |
| Tuning vars | Missing | Present | ✅ FIXED |
| Next.js bind | `0.0.0.0` | `127.0.0.1` | ✅ FIXED |
| nginx config | Port 301, no SSL | Port 301, no SSL | Match |
| Deploy `.env` file | — | Not present (env via systemd) | ✅ Correct |

**Summary:** All previous drift between repo and server has been resolved. The only remaining issue is the stale `override.conf` which should be cleaned up after adding `PATH` to the base unit.

---

## 7. Risks and Recommendations

### 7.1 Critical (all resolved)

| # | Risk | Impact | Status |
|---|------|--------|--------|
| C1 | ~~Next.js on 0.0.0.0:3010~~ | ~~Dashboard accessible from internet~~ | ✅ FIXED — bound to 127.0.0.1 (confirmed live) |
| C2 | ~~Repo service file is wrong~~ | ~~Deploy from repo would fail~~ | ✅ FIXED — service file synced |
| C3 | No firewall rule for 3010 | Low risk now (loopback) | Still recommended as defense-in-depth |

### 7.2 Important

| # | Risk | Impact | Recommendation |
|---|------|--------|---------------|
| I1 | No swap configured | OOM kill risk (RAM 63% used) | Add 2-4 GB swap file |
| I2 | Gateway memory peak 1.8 GiB | Could OOM with 3.8 GiB total | Monitor, consider limits in service file |
| I3 | MC restart storms | 25+ restarts when build missing | Add `ExecStartPre` to check `.next` exists |
| I4 | Unknown tools in allowlist | Noisy logs, potential config issues | Clean up `apply_patch` and `cron` entries |
| I5 | `.env` file in main workspace | Could contain secrets | Verify and gitignore |

### 7.3 Operational

| # | Item | Recommendation |
|---|------|---------------|
| O1 | `python` not found | Create symlink or update agent to use `python3` |
| O2 | VirusTotal flagged skills | Review `google-calendar` and `google-workspace-mcp` manually |
| O3 | Disk at 56% | Not urgent but monitor growth (27 GB used of 48 GB) |
| O4 | `Failed to kill control group` | Known systemd issue, low priority |
