# Optimization Plan: Nubo/OpenClaw + Mission Control

_Based on: [audit-repo.md](./audit-repo.md), [audit-server.md](./audit-server.md)_
_Generated: 2026-03-03_

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

### P0 — Critical (do first, blocks security or basic operation)

| # | Problem | Impact | Solution | Files Affected | Risk | Validation |
|---|---------|--------|----------|---------------|------|-----------|
| P0-1 | Seed endpoint deletes all production data with no guard | Total data loss from any HTTP client | Add `if (process.env.NODE_ENV === 'production') return 403` at top of handler | `src/app/api/seed/route.ts` | Very Low | `curl -X POST /api/seed` returns 403 in production |
| P0-2 | `.gitignore` missing `.openclaw/` and `auth-profiles.json` | Secrets could be committed accidentally | Add `.openclaw/` and `**/auth-profiles.json` to `.gitignore` | `.gitignore` | Very Low | `git check-ignore .openclaw/test` returns match |
| P0-3 | `GATEWAY_READONLY=false` as default everywhere | Write operations enabled in new deployments | Change to `true` in `.env.example` and `mission-control.service` | `.env.example`, `mission-control.service` | Very Low | Check file contents |
| P0-4 | Service file in repo doesn't match server (would fail to deploy) | Deploy from repo would break Mission Control | Update `mission-control.service` to match actual server config | `mission-control.service` | Low | `diff` with server file shows no differences |
| P0-5 | Next.js listening on 0.0.0.0:3010 (internet-accessible) | Dashboard accessible bypassing nginx | Add `-H 127.0.0.1` to ExecStart or document firewall rule | `mission-control.service` | Low | `ss -tlnp | grep 3010` shows 127.0.0.1 only |
| P0-6 | Root README.md is generic Next.js boilerplate | No project context for new contributors | Replace with project-specific README | `README.md` | Very Low | Visual check |

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

### PR 1: Docs Formatting + Index
- **Branch:** `sprint0/docs-formatting-index`
- **Status:** ✅ Ready (committed locally)
- **Scope:** Fix markdown across 10 docs + create `docs/README.md`

### PR 2: Repo Hygiene + Security Quick Wins
- **Branch:** `sprint0/repo-hygiene`
- **Scope:**
  - Gate seed endpoint (P0-1)
  - Fix `.gitignore` (P0-2)
  - Set `GATEWAY_READONLY=true` default (P0-3)
  - Update `mission-control.service` to match server (P0-4)
  - Bind Next.js to loopback (P0-5)
  - Replace root README (P0-6)
  - Update `.env.example` with all vars (P1-6)

### PR 3: Mission Control Quick Wins
- **Branch:** `sprint0/mc-quick-wins`
- **Scope:**
  - Add health check endpoint (P1-2)
  - Persist rate limiter in SQLite (P1-4)

### PR 4: Auth Middleware + Validation
- **Branch:** `sprint0/auth-validation`
- **Scope:**
  - Bearer token middleware (P1-1)
  - Zod request validation (P1-5)

### PR 5: CI Pipeline
- **Branch:** `sprint0/ci-pipeline`
- **Scope:**
  - GitHub Actions workflow (P1-7)
  - Add test infrastructure (P2-1 foundation)

### PR 6: New Department/Agent Template
- **Branch:** `sprint0/department-template`
- **Scope:**
  - Document step-by-step guide for adding a new department
  - Template configs in `/examples`
  - Based on blueprint in `docs/01-architecture.md` section 9

---

## 5. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Open P0 security findings | 6 | 0 |
| API routes with auth | 0/9 | 9/9 |
| Test coverage | 0% | >60% (unit + integration) |
| CI pipeline | None | Lint + typecheck + build on every PR |
| Secret scan in `.gitignore` | Partial | Complete (all known patterns) |
| Dashboard accessible without nginx | Yes (port 3010 open) | No (loopback only) |
| Service file matches server | No | Yes |
