# Optimization Plan: Nubo/OpenClaw + Mission Control

_Based on: [audit-repo.md](./audit-repo.md), [audit-server.md](./audit-server.md)_
_Generated: 2026-03-03 | Updated: 2026-03-03 (P0 complete, P1 next)_

---

## 1. End-to-End Mental Model

### 1.1 How a User Action Travels Through the System

```
User (Telegram / Slack / Web UI)
  │
  ▼
Channel Integration (bot token, policies, allowlists)
  │
  ▼
OpenClaw Gateway (:18789, loopback)
  ├── HTTP: serves OpenClaw Control SPA
  └── WebSocket RPC (protocol v3): source of truth
        │
        ├── Auth: Bearer token / device pairing
        ├── Routing: bindings (channel + accountId → agentId)
        │
        ▼
Agent Runtime (main / zenith / future departments)
  ├── Workspace (persistent files, memory, soul)
  ├── Tools (allow/deny list, exec approvals)
  ├── Subagents (depth=1, model=opus)
  └── Session (idle reset, daily reset, context pruning)
        │
        ▼
Response → Channel → User
        │
        ▼ (parallel / future)
Mission Control Dashboard (:3010 → nginx :301)
  ├── Next.js App Router (server + client components)
  ├── API Routes (REST, SSE streaming)
  ├── SQLite (WAL mode, task/event/log snapshots)
  └── UI: Tasks, Agents, Logs, Timeline
```

### 1.2 Observability Flow (current)

```
Gateway logs → journalctl
Mission Control → SQLite → API → Dashboard UI
(No direct WS RPC connection from MC to Gateway yet)
```

### 1.3 Observability Flow (target)

```
Gateway → WS RPC events → Mission Control → SQLite cache → Dashboard UI
                                          → Structured logs → journalctl
```

---

## 2. Priority Backlog

### P0 — Critical ✅ ALL COMPLETE

| # | Problem | Status | Commit |
|---|---------|--------|--------|
| P0-1 | Seed endpoint has no production guard | ✅ DONE | `a9e8241` — returns 403 when `NODE_ENV=production` |
| P0-2 | `.gitignore` missing `.openclaw/` and `auth-profiles.json` | ✅ DONE | `a9e8241` — added both entries |
| P0-3 | `GATEWAY_READONLY=false` as default | ✅ DONE | `a9e8241` — now `true` in `.env.example` + service |
| P0-4 | Service file doesn't match server | ✅ DONE | `a9e8241` — WorkingDirectory, ExecStart, Restart, env vars |
| P0-5 | Next.js on 0.0.0.0:3010 (internet-accessible) | ✅ DONE | `a9e8241` — `-H 127.0.0.1` in ExecStart (confirmed live) |
| P0-6 | Root README.md is boilerplate | ✅ DONE | `a9e8241` — project-specific README with env vars table |

### P0+ — New Findings (from updated server audit)

| # | Problem | Impact | Solution | Files Affected | Risk | Validation |
|---|---------|--------|----------|---------------|------|-----------|
| P0+-1 | `override.conf` is stale and redundant with base unit | Confusing drift, `GATEWAY_POLL_SECONDS` set twice (5 then 30) | Add `Environment=PATH=...` to base `mission-control.service`, then delete override on server | `mission-control.service` + server cleanup | Low | `systemctl --user cat mission-control.service` shows no override |
| P0+-2 | Error messages leak internal details to API clients | Stack traces, file paths, SQL errors exposed | Return generic messages in production, log full details server-side only | All `route.ts` catch blocks | Low | Error responses only contain generic message + requestId |
| P0+-3 | `parseAgent()` duplicated in 2 files | Maintenance risk if logic diverges | Extract to `src/lib/utils.ts` or new `src/lib/parsers.ts` | `src/app/api/agents/route.ts`, `src/app/agents/page.tsx` | Very Low | Import from shared module |

### P1 — Important (do soon, improves security and reliability)

| # | Problem | Impact | Solution | Files Affected | Risk | Validation |
|---|---------|--------|----------|---------------|------|-----------|
| P1-1 | No authentication on any API route | Unauthorized data access/modification | Add Bearer token middleware checking `DASHBOARD_TOKEN` env var | New `src/lib/auth.ts`, all `route.ts` files | Medium | Requests without token return 401 |
| P1-2 | No health check endpoint | No automated monitoring possible | Add `GET /api/health` returning status, uptime, db connectivity | New `src/app/api/health/route.ts` | Very Low | `curl /api/health` returns JSON |
| P1-3 | No SSL/TLS on nginx | Traffic in cleartext | Add Let's Encrypt certificate + HTTPS redirect | `nginx-mission-control.conf` (server config) | Medium | `curl -I https://...` returns 200 |
| P1-4 | Rate limiter resets on server restart | No persistent burst protection | Store rate limit state in SQLite table | `src/lib/rate-limit.ts`, `src/lib/db.ts` | Low | Rate limits survive restart |
| P1-5 | No input validation on POST/PATCH bodies | Malformed data enters database | Add zod schemas for request validation | New `src/lib/validation.ts`, route files | Low | Invalid POST returns 400 with error details |
| P1-6 | `.env.example` missing gateway tuning variables | New deployments miss critical config | Add all tuning vars with documented defaults | `.env.example` | Very Low | Compare with server env vars |
| P1-7 | No CI/CD pipeline | Manual quality checks only | Add GitHub Actions: lint, typecheck, build | New `.github/workflows/ci.yml`, `package.json` (add lint script) | Low | PRs show green/red checks |
| P1-8 | Gateway tools allowlist has unknown entries | Noisy warnings in logs every cron cycle | Remove `apply_patch` and `cron` from tools.profile allowlist | `~/.openclaw/openclaw.json` (server-only, not repo) | Low | No more warnings in gateway logs |

### P2 — Nice to Have (improves DX/UX, can wait)

| # | Problem | Impact | Solution | Files Affected |
|---|---------|--------|----------|---------------|
| P2-1 | No test suite | No regression safety | Add Vitest + tests for state machine, utils, API routes | New test files, `package.json`, new `vitest.config.ts` |
| P2-2 | No Docker setup | Environment-dependent deploys | Add `Dockerfile` + `docker-compose.yml` | New files |
| P2-3 | No WS RPC connection to Gateway | Dashboard uses isolated SQLite only | Implement WS client for live data | New `src/lib/ws-client.ts` |
| P2-4 | No dashboard authentication | Anyone with access can view/modify | Add NextAuth or similar | Multiple new files |
| P2-5 | Tasks page doesn't auto-refresh | Users must manually reload | Add polling interval or SSE subscription | `src/app/tasks/tasks-page-client.tsx` |
| P2-6 | No pagination in UI | All data loaded at once | Add page controls to tasks and logs | `src/components/task-table.tsx`, `src/components/log-viewer.tsx` |
| P2-7 | `framer-motion` adds ~100KB for minimal use | Slower page loads | Evaluate replacing with CSS transitions | `package.json`, component files |
| P2-8 | No swap configured on VPS | OOM risk at 63% RAM usage | Add 2-4 GB swap file | Server admin task |
| P2-9 | No pre-commit hook for secret scanning | Accidental secret commits possible | Add husky + git-secrets or gitleaks | `package.json`, new `.husky/` |

---

## 3. How Changes Would Reflect in Mission Control UI

| Change | UI Impact |
|--------|----------|
| P0-1 (gate seed) | Seed button/endpoint won't work in prod — prevents accidental data wipe |
| P1-1 (auth middleware) | Login required to access dashboard — adds security layer |
| P1-2 (health endpoint) | Potential new "System Status" panel showing gateway/DB health |
| P1-4 (persistent rate limit) | No visible change, but protection survives restarts |
| P2-3 (WS RPC integration) | **Major**: live data from gateway, real-time task/session updates |
| P2-5 (auto-refresh) | Tasks page updates automatically without manual reload |
| P2-6 (pagination) | Page controls at bottom of task list and log viewer |

---

## 4. Proposed PR Sequence

### PR #5: Sprint 0 — Docs + P0 Security Hardening (MERGED)
- **Branch:** `sprint0/docs-formatting-index` → merged to `main`
- **Status:** ✅ Merged as PR #5
- **Scope:**
  - Fix markdown across 10 docs + create `docs/README.md`
  - Gate seed endpoint (P0-1)
  - Fix `.gitignore` (P0-2)
  - Set `GATEWAY_READONLY=true` default (P0-3)
  - Update `mission-control.service` to match server (P0-4/P0-5)
  - Replace root README (P0-6)
  - Update `.env.example` with all vars (P1-6)
  - Create `docs/audit-repo.md`, `docs/audit-server.md`, `docs/optimization-plan.md`

### PR Next-1: Mission Control Quick Wins
- **Branch:** `sprint0/mc-quick-wins`
- **Scope:**
  - Add health check endpoint (P1-2)
  - Persist rate limiter in SQLite (P1-4)

### PR Next-2: Auth Middleware + Validation
- **Branch:** `sprint0/auth-validation`
- **Scope:**
  - Bearer token middleware (P1-1)
  - Zod request validation (P1-5)

### PR Next-3: CI Pipeline
- **Branch:** `sprint0/ci-pipeline`
- **Scope:**
  - GitHub Actions workflow (P1-7)
  - Add test infrastructure (P2-1 foundation)

### PR Next-4: New Department/Agent Template
- **Branch:** `sprint0/department-template`
- **Scope:**
  - Document step-by-step guide for adding a new department
  - Template configs in `/examples`
  - Based on blueprint in `docs/01-architecture.md` section 9

---

## 5. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Open P0 security findings | ~~6~~ 0 | 0 ✅ |
| API routes with auth | 0/9 | 9/9 |
| Test coverage | 0% | >60% (unit + integration) |
| CI pipeline | None | Lint + typecheck + build on every PR |
| Secret scan in `.gitignore` | ~~Partial~~ Complete ✅ | Complete (all known patterns) |
| Dashboard accessible without nginx | ~~Yes~~ No ✅ | No (loopback only) |
| Service file matches server | ~~No~~ Yes ✅ | Yes |
