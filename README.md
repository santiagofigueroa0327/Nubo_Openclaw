# Mission Control — Nubo/OpenClaw Dashboard

Mission Control is the observability dashboard for the [Nubo/OpenClaw](https://github.com/santiagofigueroa0327/Nubo_Openclaw) ecosystem. It provides a web UI for monitoring agents, tasks, events, and logs managed by the OpenClaw Gateway.

## Stack

- **Runtime:** Next.js 16 (App Router, React 19)
- **Database:** SQLite (better-sqlite3, WAL mode)
- **Styling:** Tailwind CSS 4
- **Data:** Polling via OpenClaw CLI / gateway integration

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Build for production
npm run build

# Start (development)
npm run dev

# Start (production)
npm run start
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # REST + SSE endpoints (tasks, events, agents, logs, seed)
│   ├── tasks/        # Tasks page (client component)
│   └── page.tsx      # Dashboard home
├── components/       # Shared UI components
├── lib/              # Core logic (db, logger, rate-limit, state machine)
└── types/            # TypeScript type definitions
docs/                 # System documentation (architecture, config, deploy, security)
data/                 # SQLite database (gitignored)
mission-control.service  # systemd user service unit
```

## Deployment

Mission Control runs as a systemd user service behind an nginx reverse proxy.

```bash
# Install service
cp mission-control.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now mission-control
```

For full deployment details see [docs/07-deploy-systemd-nginx.md](docs/07-deploy-systemd-nginx.md).

## Documentation

See [docs/README.md](docs/README.md) for the complete documentation index covering architecture, configuration, gateway RPC contract, channels, security, and troubleshooting.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3010` | Next.js server port |
| `DB_PATH` | `./data/dashboard.sqlite` | SQLite database path |
| `NODE_ENV` | `development` | Environment (`production` disables seed endpoint) |
| `GATEWAY_READONLY` | `true` | Read-only mode for gateway operations |
| `OPENCLAW_BIN` | — | Path to OpenClaw CLI binary |
| `GATEWAY_POLL_SECONDS` | `30` | Polling interval for gateway data |
| `GATEWAY_ACTIVE_MINUTES` | `120` | Active session window |
| `GATEWAY_TASKS_LIMIT` | `80` | Max tasks per request |
| `GATEWAY_OPENCLAW_TIMEOUT_MS` | `5000` | CLI command timeout |

## Security

- **Seed endpoint** (`POST /api/seed`) is disabled when `NODE_ENV=production`
- **GATEWAY_READONLY=true** prevents write operations by default
- **Loopback binding** (`-H 127.0.0.1`) ensures the app is only accessible via nginx
- See [docs/08-security.md](docs/08-security.md) for the full security guide
