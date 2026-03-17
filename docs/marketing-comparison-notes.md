# Marketing System Comparison Notes

**Date**: 2026-03-17
**Compared**: Nubo/OpenClaw (this system) vs [viva-openclaw-marketing-system](https://github.com/techviva/viva-openclaw-marketing-system)
**Marketing repo**: Public, accessible, documentation-only (no runtime code)

---

## Overview

The Viva Marketing System is a well-documented multi-agent marketing operations platform running OpenClaw v2026.3.2 with 11 agents organized in 4 layers. It manages paid media (Meta + Google Ads), SEO, content production, analytics, and infrastructure for a landscaping business.

**Key insight**: The marketing repo is **documentation-only** — it contains no runtime code, just comprehensive docs, diagrams, runbooks, examples, and templates. This is its strength: clean separation between documentation and runtime.

---

## Architectural Comparison

### Agent Architecture

| Aspect | Nubo | Marketing (Viva) |
|--------|------|-------------------|
| Agent count | 9 | 11 |
| Layers | Flat (main + workers) | 4 explicit layers (Direction, Intelligence, Production, Control) |
| Orchestrator | main (Nubo) | Nexo |
| QA agent | sentinel (read+write) | Prisma (read-only, **cannot modify**) |
| Infrastructure | aegis (read+write) | Bedrock (full access, Claude Opus 4.6) |
| Primary model | gemini-2.5-flash (all agents) | Mixed: GPT-5.2 (orchestrator), Gemini Pro (intel), Flash (production) |
| Worker delegation | sessions_spawn | sessions_spawn (same) |
| Sync queries | Not used | sessions_send (blocking) |

**Key difference**: Marketing has a clear **layer hierarchy** with different models per layer (expensive for strategy, cheap for production). Nubo uses the same model for everything.

### Orchestration Pattern

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Delegation method | AgentOS dispatch-job (custom) | Native OpenClaw sessions_spawn |
| Task tracking | Custom SQLite + filesystem | Filesystem markdown (YAML frontmatter) |
| State management | AgentOS + gateway-sync + agentos-sync | Filesystem directories (tasks/backlog, active, done) |
| Custom middleware | AgentOS layer (dispatch-job, watchdog, sync, agentosctl) | None — uses OpenClaw natively |
| Complexity | HIGH (3 sync layers) | LOW (filesystem + gateway only) |

**Key difference**: Nubo has a heavy custom AgentOS layer with SQLite, daemons, and scripts. Marketing relies on OpenClaw's native capabilities + filesystem. Marketing is simpler and likely more stable.

### Task System

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Task ID format | UUID / m-YYYYMMDD-NNN | TASK-YYYY-MM-DD-NNN |
| Task states | 5 (queued, running, completed, blocked, failed) | 10 (queued, triaged, delegated, in_progress, awaiting_input, awaiting_qa, awaiting_human_approval, blocked, done, archived) |
| Priority levels | None defined | P1-P4 with SLAs |
| Task storage | SQLite tables | Markdown files with YAML frontmatter |
| Hygiene sweep | Auto-archive 10min, stuck detection 30min | Auto-archive, stale detection (48h queue, 24h in-progress) |
| Location tracking | SQLite status column | Directory-based (tasks/backlog/, tasks/active/, etc.) |

**Key difference**: Marketing has a richer state machine with explicit QA and human-approval gates. Nubo's 5 states don't capture intermediate review steps.

### Delivery / Notification

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Primary channel | Telegram | Slack |
| Delivery mechanism | Custom telegram-notify script | Native Slack integration + file delivery |
| Progress updates | telegram_plan.md + message editing (BROKEN) | Not specifically documented |
| Result format | result.md (last line = DONE) | Reports written to shared filesystem |
| Handoff pattern | Filesystem (task.md → result.md) | Explicit handoff files (handoff-template.md) |

**Key difference**: Marketing uses Slack natively (OpenClaw's built-in Slack integration). Nubo wraps Telegram delivery in custom scripts, creating fragile couplings.

### Secrets Management

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Secret storage | Hardcoded in scripts + config files | `.env` file (mode 600, gitignored) |
| Config file approach | Raw values in openclaw.json | `${VAR_NAME}` substitution |
| Documentation | None | Full env var reference doc |
| Check script | None | `scripts/check-env.sh` |

**Key difference**: Marketing has proper secrets management. Nubo has none. This is a clear area where Nubo should adopt Marketing's pattern.

### Dashboard / Mission Control

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Technology | Next.js 16 + SQLite | Express.js + WebSocket + chokidar |
| Data source | Dual-sync (CLI polling + daemon) | Direct filesystem watching |
| Real-time | SSE (2s poll) | WebSocket (true real-time) |
| Port | 3010 (nginx proxy on 301) | 8787 (direct access) |
| Stability | SQLite locked errors | Presumably stable (no DB lock risk) |

**Key difference**: Marketing uses filesystem watching (chokidar) for real-time updates. No database, no lock contention. Nubo's dual-sync-to-SQLite approach is the root cause of its stability issues.

### Documentation Quality

| Aspect | Nubo | Marketing |
|--------|------|-----------|
| Architecture doc | Partial, outdated | Comprehensive with diagrams |
| Agent docs | None in repo | Full index with roles, models, criticality |
| Task system | None | Complete lifecycle, states, SLAs |
| Delegation flow | None | Step-by-step with examples |
| Security doc | None | Full model with checklists |
| Onboarding guide | None | Complete reading order + access guide |
| Runbooks | None | 6 runbooks (add agent, config change, troubleshoot, etc.) |
| Contribution guide | None | Risk-categorized change guide |
| Glossary | None | Full term definitions |
| Environment vars | None | Complete reference table |

**Key difference**: Night and day. Marketing is production-grade documentation. Nubo has almost nothing in the repo.

---

## Patterns Worth Adopting

### 1. Native OpenClaw — Drop AgentOS Middle Layer

Marketing delegates via `sessions_spawn` directly. No custom dispatch scripts, no extra SQLite, no daemon sync. If OpenClaw's native session tracking is sufficient, the AgentOS layer adds unnecessary complexity and the primary source of bugs (dual-write SQLite locks).

**Recommendation**: Evaluate whether OpenClaw's built-in session management can replace AgentOS. If missions/validation are needed, they should be a thin layer, not a parallel state system.

### 2. Filesystem-Based Task Tracking

Marketing uses markdown files in directories as the source of truth. chokidar watches for changes. No database concurrency issues. Simple, debuggable, versionable.

**Recommendation**: Consider using filesystem as primary state store (like Marketing) with SQLite as a read-only materialized view, synced by a single writer.

### 3. Layered Agent Model with Differentiated Models

Marketing assigns expensive models (GPT-5.2) to strategic work and cheap models (Flash) to production tasks. Nubo uses Flash for everything.

**Recommendation**: Use a more capable model for Nubo (orchestrator) at minimum. The orchestrator needs better reasoning for delegation decisions.

### 4. QA Agent as Read-Only

Marketing's Prisma has NO write access. It validates but cannot modify. This ensures QA independence.

**Recommendation**: Make Sentinel truly read-only. Currently it has write access, which undermines its role as validator.

### 5. Human Approval Gates

Marketing has explicit approval flows for high-risk actions (budget changes, publishing, config changes).

**Recommendation**: Implement approval gates in Nubo for sensitive operations.

### 6. Secrets via ${VAR_NAME} Substitution

Marketing keeps openclaw.json clean with variable references. All actual values in `.env`.

**Recommendation**: Adopt this immediately. It's a security improvement with no downside.

### 7. Handoff Templates

Marketing uses structured handoff files for inter-agent work transfer with defined fields.

**Recommendation**: Formalize the task.md → result.md handoff with a consistent template.

### 8. Runbooks for Operations

Marketing has runbooks for common operations (add agent, config change, troubleshoot, emergency shutdown).

**Recommendation**: Create runbooks for Nubo's most common operational tasks.

---

## Patterns NOT to Adopt

### 1. Express.js Dashboard

Marketing uses Express.js + vanilla JS. Nubo already has Next.js 16 which is more capable. Keep Next.js but fix the data layer.

### 2. Marketing-Specific Integrations

Meta Ads, Google Ads, etc. are domain-specific to Marketing. Not applicable to Nubo's personal assistant use case.

### 3. 10-State Task Lifecycle

Nubo's 5 states are sufficient for a personal assistant. The marketing system's 10 states serve a team workflow that Nubo doesn't need.

---

## Bottom Line

The marketing system is architecturally **simpler and more robust** because it uses OpenClaw natively without a heavy middleware layer. Its documentation is exemplary. Nubo should:

1. **Simplify the data layer** — eliminate dual-write, consider filesystem-first approach
2. **Adopt secrets management** — `.env` + `${VAR}` substitution
3. **Document everything** — follow Marketing's documentation structure
4. **Evaluate AgentOS necessity** — can native OpenClaw sessions replace it?
5. **Fix the delivery pipeline** — the MESSAGE_ID bug and DONE detection are the immediate user-facing problems
