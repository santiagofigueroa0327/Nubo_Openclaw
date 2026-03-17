# Current Task Delivery Flow — End to End

**Date**: 2026-03-17
**Status**: Documented from live runtime inspection

---

## Overview

The Nubo system processes user requests through a multi-layered pipeline:
Telegram → OpenClaw Gateway → Main Agent (Nubo) → AgentOS Dispatch → Worker Agent → Result → Telegram Delivery

This document traces the **actual current flow** as observed on the running system.

---

## Flow Diagram

```
┌─────────────┐
│  User sends  │
│  message in  │
│  Telegram    │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  OpenClaw Gateway    │  Port 18789 (loopback)
│  WS RPC + Telegram   │  Receives via Telegram bot polling
│  plugin              │
└──────┬───────────────┘
       │  dmScope: "main" → routes to main agent
       ▼
┌──────────────────────┐
│  Main Agent (Nubo)   │  Session: agent:main:telegram:direct:<chat_id>
│  Model: gemini-2.5   │
│  Tools: exec, read,  │
│  write, sessions_*   │
└──────┬───────────────┘
       │  Nubo decides to delegate (per SOUL.md)
       │
       ▼
┌──────────────────────────────────────────────────┐
│  AgentOS Dispatch                                │
│  (exec: dispatch-job --no-wait <agent> "msg")    │
│                                                  │
│  1. Creates mission dir: missions/<MID>/         │
│  2. Creates job dir: missions/<MID>/jobs/<JID>/  │
│  3. Writes: task.md, context.md, acceptance.md   │
│  4. Registers in agentos.sqlite via agentosctl   │
│  5. Returns: MISSION_ID, JOB_ID, JOB_DIR        │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Nubo sends Telegram "EN EJECUCIÓN" message      │
│  (exec: telegram-notify send "⏳ ...")           │
│                                                  │
│  ⚠️ BUG: MESSAGE_ID not captured from stdout     │
│  → telegram_message_id file stays EMPTY          │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Nubo spawns worker session                      │
│  (sessions_spawn → target agent)                 │
│  Passes: task.md path, job dir, instructions     │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Worker Agent (e.g., zenith, atlas, chronos)     │
│  Model: gemini-2.5-flash                         │
│                                                  │
│  1. Reads task.md for instructions               │
│  2. Reads context.md for supporting data         │
│  3. Reads acceptance.md for completion criteria   │
│  4. Executes task (web search, file ops, etc.)   │
│  5. Writes evidence/ files if applicable         │
│  6. Writes result.md (summary + details)         │
│  7. Last line of result.md MUST be: DONE         │
│  8. Responds with: ANNOUNCE_SKIP                 │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  job-watchdog.sh (monitoring loop)               │
│                                                  │
│  Polls result.md for "DONE" on last line         │
│  If found:                                       │
│    1. Reads first 3-5 lines as summary           │
│    2. Updates mission status in SQLite            │
│    3. Calls telegram-notify send/edit             │
│                                                  │
│  ⚠️ BUG: Strict string matching on "DONE"        │
│  → Whitespace, encoding, or "DONE:" fails        │
│                                                  │
│  ⚠️ BUG: Cannot edit message (no MESSAGE_ID)     │
│  → Falls back to sending NEW message             │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Telegram Delivery                               │
│  telegram-notify send "✅ <result summary>"      │
│                                                  │
│  Uses hardcoded BOT_TOKEN and CHAT_ID            │
│  Sends to chat_id: [REDACTED]                     │
│  HTML parse mode, with plain-text fallback       │
└──────────────────────────────────────────────────┘
```

---

## Parallel Data Path: Mission Control

```
┌─────────────────────────┐     ┌─────────────────────────────┐
│  agentos.sqlite         │     │  OpenClaw Gateway           │
│  (AgentOS missions DB)  │     │  (session state)            │
└──────┬──────────────────┘     └──────────┬──────────────────┘
       │                                    │
       │  agentos-sync.js                   │  gateway-sync.ts
       │  (every 5s)                        │  (CLI poll every 10s)
       │                                    │
       ▼                                    ▼
┌──────────────────────────────────────────────────┐
│          dashboard.sqlite                        │
│          (Mission Control DB)                    │
│                                                  │
│  ⚠️ CRITICAL: Two writers competing             │
│  → "SqliteError: database is locked" flooding    │
│  → Data inconsistency risk                       │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Mission Control UI (Next.js on port 3010)       │
│  - Task list with filters                        │
│  - Task details with timeline                    │
│  - SSE stream (polls SQLite every 2s)            │
│  - Agent registry                                │
│  - Stagnation detection (60s sweep)              │
│  nginx → port 301 (external access)              │
└──────────────────────────────────────────────────┘
```

---

## Mission Filesystem Structure

```
~/.openclaw/agentos/missions/
├── m-20260316-916/                    # Mission directory
│   ├── meta.json                      # {mission_id, status, origin_channel, user_message, created_at}
│   └── jobs/
│       └── j-zenith-514/             # Job directory
│           ├── task.md                # Full task instructions for worker
│           ├── context.md             # Supporting context data
│           ├── acceptance.md          # Completion criteria
│           ├── result.md              # Worker output (last line = DONE)
│           ├── telegram_message_id    # Message ID for edits (⚠️ EMPTY)
│           ├── telegram_plan.md       # Step-by-step progress tracking
│           └── evidence/              # Supporting files from worker
```

---

## Cron Delivery Flow

Cron jobs follow a slightly different path:

1. OpenClaw cron scheduler triggers at configured time
2. Creates isolated session for main agent
3. Main agent executes the cron payload (e.g., runs Python script)
4. Delivery mode determines output:
   - `announce` + `telegram`: Gateway sends result to Telegram directly
   - `silent`: No delivery (background task)
   - `announce` + `last`: Delivers to the most recent active channel

---

## Key Breakpoints / Fragile Couplings

| # | Breakpoint | Impact | Current Status |
|---|-----------|--------|----------------|
| 1 | MESSAGE_ID capture from telegram-notify | No message editing possible | **BROKEN** |
| 2 | result.md DONE detection | Jobs not detected as complete | **FRAGILE** |
| 3 | SQLite concurrent writes | Database locked errors | **ACTIVELY FAILING** |
| 4 | Slack stale-socket | Brief Slack connectivity gaps | **RECURRING** |
| 5 | API rate limits | Cron jobs and requests fail silently | **RECURRING** |
| 6 | sessions-cleanup timer | Dead sessions not cleaned | **FAILED SERVICE** |
| 7 | Hardcoded secrets | Security risk | **PRESENT** |

---

## What Lives OUTSIDE the Repo

The following critical components exist ONLY on the server, not in the Git repo:

| Component | Location | In Repo? |
|-----------|----------|----------|
| openclaw.json | `~/.openclaw/openclaw.json` | NO |
| Auth profiles | `~/.openclaw/agents/*/agent/auth-profiles.json` | NO |
| AgentOS scripts | `~/.openclaw/agentos/bin/*` | NO |
| AgentOS missions | `~/.openclaw/agentos/missions/` | NO |
| AgentOS SQLite | `~/.openclaw/agentos/agentos.sqlite` | NO |
| Cron jobs config | `~/.openclaw/cron/jobs.json` | NO |
| systemd services | `~/.config/systemd/user/*.service` | PARTIAL (MC service in repo) |
| nginx config | `/etc/nginx/sites-enabled/mission-control` | NO |
| Agent workspaces | `~/.openclaw/workspace-*/` | NO |
| dashboard.sqlite | `~/nubo-dashboard/mission-control-review/data/` | NO (gitignored) |
| Delivery queue | `~/.openclaw/delivery-queue/` | NO |
