# Repository Audit: Nubo/OpenClaw + Mission Control

_Generated: 2026-03-03 | Updated: 2026-03-03 (post-P0 hardening)_

## 1. Repository Structure

### 1.1 File Tree Overview

The repository is a **Next.js 16.1.6** application ("Mission Control") with comprehensive documentation.

```
.
├── docs/              # 12 markdown files (system documentation + audit docs)
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── api/       # 6 API route handlers
│   │   ├── tasks/     # Task list + detail pages
│   │   ├── agents/    # Agent registry page
│   │   ├── logs/      # Global logs viewer
│   │   ├── layout.tsx # Root layout (Sidebar + Topbar)
│   │   ├── page.tsx   # Home (redirects to /tasks)
│   │   ├── error.tsx  # Error boundary
│   │   └── not-found.tsx
│   ├── components/    # 10 React components
│   │   ├── ui/        # Icon components
│   │   ├── task-detail/ # Task detail subcomponents
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── ...
│   └── lib/           # 6 utility modules
│       ├── db.ts      # SQLite schema + connection
│       ├── types.ts   # TypeScript interfaces
│       ├── state-machine.ts
│       ├── logger.ts
│       ├── rate-limit.ts
│       └── utils.ts
├── public/            # Static SVG assets (Next.js defaults)
├── mission-control.service    # systemd unit file
├── nginx-mission-control.conf # nginx reverse proxy config
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md          # Generic Next.js boilerplate (not project-specific)
```

### 1.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Animations | Framer Motion | ^12.34.4 |
| Database | better-sqlite3 (WAL mode) | ^12.6.2 |
| Linting | ESLint + next config | ^9 |

### 1.3 Dependencies Analysis

**Production (5 packages):**
- `next@16.1.6` — framework
- `react@19.2.3`, `react-dom@19.2.3` — UI
- `better-sqlite3@^12.6.2` — SQLite (native binding, requires rebuild per platform)
- `framer-motion@^12.34.4` — animations (~100KB, used for minimal sidebar/card effects)

**Dev (8 packages):** TypeScript, Tailwind, PostCSS, ESLint, type definitions.

**`npm audit` result:** 0 vulnerabilities found.

**Risks:**
- `better-sqlite3` uses native C++ bindings — requires `node-gyp` rebuild if Node version or OS changes.
- `framer-motion` adds significant bundle weight for relatively minimal animation usage.
- No lock on exact versions (uses `^` ranges) — could get unexpected updates.

---

## 2. Code Quality

### 2.1 TODO/FIXME Scan

```
rg -n "TODO|FIXME|HACK|XXX" src/ → 0 results
```

No deferred work or known issues flagged in code.

### 2.2 Linting Status

- ESLint configured with `next/core-web-vitals` and `next/typescript` rulesets.
- No custom rules defined beyond Next.js defaults.

### 2.3 Type Safety

- `strict: true` in `tsconfig.json`
- Path aliases: `@/*` → `./src/*`
- All API routes and components use TypeScript
- Types defined in `src/lib/types.ts`

### 2.4 Test Coverage

**No tests exist.** There are:
- No test files in the repository
- No test runner configured (`jest`, `vitest`, etc.)
- No `test` script in `package.json`

---

## 3. Security Audit

### 3.1 Secrets Scan

```
rg -n "sk-|AIza|xoxb-|xapp-|botToken|appToken|OPENCLAW_GATEWAY_TOKEN" src/ → 0 results
rg -n "password.*=|secret.*=" --type ts src/ → 0 results
```

**No real secrets found in source code.** The seed data uses placeholder model names (`claude-sonnet-4-20250514`).

### 3.2 .gitignore Coverage

Current `.gitignore` covers:
- ✅ `/node_modules`
- ✅ `/.next/`, `/out/`
- ✅ `.env*` (except `.env.example`)
- ✅ `/data/`
- ✅ `*.sqlite`, `*.sqlite-wal`, `*.sqlite-shm`
- ✅ `.vercel`
- ✅ `.openclaw/` — FIXED in P0-2
- ✅ `**/auth-profiles.json` — FIXED in P0-2
- ✅ `*.pem` — SSL certificates/keys

### 3.3 API Endpoint Security

| Endpoint | Method | Auth | Validation | Risk |
|----------|--------|------|------------|------|
| `/api/tasks` | GET | None | Query params only | Low |
| `/api/tasks` | POST | None | Basic field check | **Medium** |
| `/api/tasks/[id]` | GET | None | UUID param | Low |
| `/api/tasks/[id]` | PATCH | None | State machine check | **Medium** |
| `/api/tasks/[id]/events` | GET | None | Query + SSE | Low |
| `/api/tasks/[id]/logs` | GET | None | Query params | Low |
| `/api/agents` | GET | None | None | Low |
| `/api/agents` | POST | None | Basic field check | **Medium** |
| `/api/seed` | POST | **NODE_ENV gate** | **None** | ~~CRITICAL~~ **Low** (FIXED P0-1) |

**~~Critical~~ Fixed:** `POST /api/seed` now returns 403 in production (`src/app/api/seed/route.ts:92-97`). In development mode it still deletes all data — this is intentional for seeding test fixtures.

### 3.4 Configuration Security

- ~~`GATEWAY_READONLY=false` in both `.env.example` and `mission-control.service`~~ — FIXED P0-3: now `true` by default
- Rate limiter is in-memory only (`src/lib/rate-limit.ts`) — resets on server restart, provides no persistent protection
- No CORS configuration (relies on Next.js defaults)
- No CSP headers configured
- Error messages in API responses leak internal details (`message: String(err)`) — could expose stack traces, file paths, or SQL errors to clients

---

## 4. Architecture Analysis

### 4.1 Database Schema (`src/lib/db.ts`)

4 tables with proper indexes:

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `tasks` | Task metadata | id, title, status, primaryAgent, model, timestamps |
| `events` | Task lifecycle events | taskId (FK), type, ts, summary |
| `task_logs` | Execution logs | taskId (FK), level, ts, message |
| `agents_registry` | Agent catalog | agentId, role, capabilities, enabled |

**Indexes:** `events(taskId)`, `events(ts)`, `task_logs(taskId)`, `task_logs(ts)`, `tasks(status)`, `tasks(receivedAt)`

**Pragmas:** WAL mode, foreign keys ON, busy_timeout 5000ms

### 4.2 API Routes

- 6 route files with 9 handlers total
- Server-side rendering for initial page loads
- SSE streaming for task events (`/api/tasks/[id]/events?stream=true`)
- Transactional inserts (task + initial event in same transaction)

### 4.3 State Machine (`src/lib/state-machine.ts`)

```
queued → running, blocked
running → completed, blocked, failed
blocked → running
completed → (terminal)
failed → (terminal)
```

Enforced in `PATCH /api/tasks/[id]` — invalid transitions return 409.

### 4.4 SSE Streaming

- `/api/tasks/[id]/events?stream=true`
- 3-second polling interval (server polls SQLite, not real push)
- 5-minute connection timeout
- No backpressure handling

### 4.5 Rate Limiting (`src/lib/rate-limit.ts`)

- In-memory `Map<string, { count, resetTime }>`
- 30 requests/minute per IP
- 1-minute sliding window
- Cleanup every 5 minutes
- **Resets completely on server restart**

---

## 5. Infrastructure

### 5.1 systemd Service File (`mission-control.service`)

**~~Issues found~~ FIXED in P0-4/P0-5:**
- ~~`WorkingDirectory=%h/Mission control`~~ → now `%h/nubo-dashboard/mission-control-review`
- ~~`GATEWAY_READONLY=false`~~ → now `true`
- ~~`Restart=on-failure`~~ → now `always`, `RestartSec=2`
- Added `-H 127.0.0.1` for loopback binding (P0-5)
- Added all gateway tuning env vars (OPENCLAW_BIN, POLL_SECONDS, etc.)

**Remaining issue:** An `override.conf` exists on the server that is now redundant with the updated base unit file. It should be removed after adding `PATH=` to the base unit (see audit-server.md).

### 5.2 nginx Configuration (`nginx-mission-control.conf`)

- Listens on port **301** (non-standard; not 80/443)
- No SSL/TLS configuration
- Proper WebSocket upgrade headers
- SSE support (buffering off, 300s read timeout)

### 5.3 Environment Variables (`.env.example`)

**FIXED in P0-3 + P1-6.** Now contains all variables:

```
PORT=3010
DB_PATH=./data/dashboard.sqlite
NODE_ENV=development
GATEWAY_READONLY=true
OPENCLAW_BIN=/home/moltbot/.npm-global/bin/openclaw
GATEWAY_POLL_SECONDS=30
GATEWAY_ACTIVE_MINUTES=120
GATEWAY_TASKS_LIMIT=80
GATEWAY_OPENCLAW_TIMEOUT_MS=5000
```

---

## 6. Findings Summary

### 6.1 Quick Wins

| # | Finding | File | Line | Fix |
|---|---------|------|------|-----|
| Q1 | ~~Seed endpoint has no auth/env guard~~ | `src/app/api/seed/route.ts` | 92 | ✅ DONE — returns 403 in production |
| Q2 | ~~`.gitignore` missing `.openclaw/`~~ | `.gitignore` | 43-45 | ✅ DONE |
| Q3 | ~~`GATEWAY_READONLY=false` default~~ | `.env.example` | 6 | ✅ DONE — now `true` |
| Q4 | ~~Root README is boilerplate~~ | `README.md` | — | ✅ DONE — project-specific README |
| Q5 | Add health check endpoint | — | — | Create `GET /api/health` returning uptime/status |

### 6.2 Medium Changes

| # | Finding | Impact | Fix |
|---|---------|--------|-----|
| M1 | No authentication on any API route | Any client can create/modify tasks and agents | Add Bearer token middleware |
| M2 | ~~Service file doesn't match server reality~~ | ~~Deploying from repo would break~~ | ✅ DONE (P0-4/P0-5) |
| M3 | Rate limiter resets on restart | Burst protection lost after restart | Persist in SQLite |
| M4 | ~~`.env.example` missing gateway tuning vars~~ | ~~New deploys miss critical config~~ | ✅ DONE (P1-6) |
| M5 | No input validation (zod/schema) | Malformed data can enter DB | Add validation to POST/PATCH routes |

### 6.3 Large Changes

| # | Finding | Impact | Fix |
|---|---------|--------|-----|
| L1 | No test suite | No regression safety | Add Jest/Vitest + unit/integration tests |
| L2 | No CI/CD pipeline | Manual quality checks only | Add GitHub Actions (lint, type, build, test) |
| L3 | No dashboard authentication | Anyone with network access can view/modify | Add NextAuth or equivalent |
| L4 | No WS RPC integration with gateway | Dashboard uses isolated SQLite, not live data | Implement WebSocket client to gateway |
| L5 | No Docker setup | Environment-dependent deploys | Add Dockerfile + docker-compose |

---

## 7. Risk Register

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|-----------|--------|------------|
| ~~Seed endpoint wipes production data~~ | ~~Critical~~ | ~~Medium~~ | ~~Total data loss~~ | ✅ FIXED — NODE_ENV gate (P0-1) |
| No API auth allows unauthorized writes | High | High | Data integrity | Add auth middleware (M1) |
| ~~Next.js on 0.0.0.0 bypasses nginx~~ | ~~High~~ | ~~Already happening~~ | ~~Direct access~~ | ✅ FIXED — loopback binding (P0-5) |
| ~~Service file drift causes deploy failure~~ | ~~Medium~~ | ~~High on redeploy~~ | ~~Service won't start~~ | ✅ FIXED (P0-4) |
| In-memory rate limiter ineffective after restart | Medium | Medium | Burst attacks | Persist in SQLite (M3) |
| No tests = silent regressions | Medium | High | Bugs in production | Add test suite (L1) |
| framer-motion adds ~100KB to bundle | Low | N/A | Page load speed | Evaluate if needed or replace with CSS |
