# Nubo/OpenClaw — Sistema Multi-Agente

> **Última actualización:** 2026-03-31 · **Versión:** AgentOS v1 · **Estado:** Producción activa

Este repositorio documenta el ecosistema **Nubo + OpenClaw** desplegado en VPS `srv1364133` (usuario `moltbot`). Nubo es el asistente personal de IA de Santiago (CTO, Viva Landscape & Design), implementado como un sistema multi-agente con 9 agentes especializados.

> **Regla #1:** Este repo NO contiene tokens/keys reales. Todos los secretos están marcados como `REDACTED`.

---

## ¿Qué es esto?

**OpenClaw** es un runtime de agentes IA (binario Node.js closed-source). **Nubo** es el sistema construido sobre él.

El sistema permite a Santiago interactuar por Telegram con un orquestador IA (Nubo) que delega tareas a 8 agentes especializados: investigación, ingeniería, calendario, brainstorm, automatización, planificación, validación y ensamblaje.

```
Santiago (Telegram) ──► Nubo (orchestrator, Gemini 3.1 Pro) ──► 8 workers especializados
                                    │
                                    └──► Mission Control (dashboard web)
```

---

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Runtime | OpenClaw 2026.3.2 |
| Orquestador (Nubo) | Google Gemini 3.1 Pro Preview |
| 7 Workers | Google Gemini 2.5 Flash |
| Zenith (engineering) | Anthropic Claude Opus 4.6 |
| Dashboard | Next.js 16 + SQLite |
| Protocolo de orquestación | AgentOS v1 (document-first, blackboard filesystem) |
| Canal principal | Telegram Bot API |
| Canal secundario | Slack (socket mode) |
| OS | Ubuntu (systemd user service) |

---

## Agentes del sistema

| Agente | Emoji | Modelo | Especialidad |
|--------|-------|--------|--------------|
| **Nubo** | ☁️ | Gemini 3.1 Pro | Orquestador. Único que habla con Santiago. |
| **Atlas** | 🔍 | Gemini 2.5 Flash | Research, datos, búsquedas web |
| **Zenith** | ⚡ | Claude Opus 4.6 | Código, scripts, debug, arquitectura |
| **Chronos** | ⏰ | Gemini 2.5 Flash | Calendario, reuniones, notas |
| **Spark** | ✨ | Gemini 2.5 Flash | Brainstorm, ideas, estrategia |
| **Flux** | 🔀 | Gemini 2.5 Flash | Cron jobs, automatizaciones, Gmail, skills |
| **Hermes** | 📬 | Gemini 2.5 Flash | ClickUp, planificación, reportes |
| **Sentinel** | 🛡️ | Gemini 2.5 Flash | Validación QA (solo high-risk) |
| **Aegis** | 🏛️ | Gemini 2.5 Flash | Ensamblaje final (multi-agente complejo) |

---

## Protocolo de orquestación (AgentOS v1)

Cada tarea sigue 5 pasos:

```
1. Planificar  → telegram_plan.md
2. Crear misión → dispatch-job → MISSION_ID/JOB_DIR (blackboard)
3. Status + Watchdog → Telegram 3 líneas + job-watchdog.sh background
4. Ejecutar → sessions_spawn(agentId, task, 2400s)
   [Worker: heartbeat → lee task.md → trabaja → escribe result.md → ANNOUNCE_SKIP]
5. Verificar → tail result.md → DONE/HANDOFF/FAILED → entrega
```

El **blackboard filesystem** (`~/.openclaw/agentos/missions/`) es el medio de comunicación entre agentes. Los agentes NO se comunican directamente entre sí.

---

## Estructura del repositorio

```
Nubo_Openclaw/
├── README.md                    # Este archivo
├── docs/
│   ├── README.md                # Índice completo de documentación
│   ├── 00-overview.md           # Visión general del proyecto
│   ├── 01-architecture.md       # Arquitectura (estado inicial, Mar 2026)
│   ├── 02-config-openclaw-json.md
│   ├── 03-auth-profiles.md
│   ├── 04-gateway-ws-rpc.md     # Contrato WebSocket RPC del gateway
│   ├── 05-channels-telegram-slack.md
│   ├── 06-mission-control.md
│   ├── 07-deploy-systemd-nginx.md
│   ├── 08-security.md
│   ├── 09-troubleshooting.md
│   ├── 10-roadmap.md
│   ├── 11-agentos-overview.md
│   ├── 12-agentos-scripts.md
│   ├── 13-mirofish-patterns.md
│   ├── 14-agent-communication.md
│   │
│   │   ── Estado actual (AgentOS v1 — 2026-03-31) ──
│   ├── 15-agents-registry.md    ★ Los 9 agentes, modelos, SOUL.md completo
│   ├── 16-agentos-protocol.md   ★ Flujo completo, heartbeat, handoff, watchdog
│   ├── 17-cron-jobs.md          ★ 10 cron jobs activos, metodología
│   ├── 18-skills.md             ★ 29 skills, estructura, ciclo de vida
│   ├── 19-known-issues-risks.md ★ Issues activos, incidentes, riesgos, deuda
│   ├── 20-architecture-current.md ★ Arquitectura completa actual
│   ├── 21-improvement-roadmap.md  ★ 16 mejoras priorizadas P0→P3
│   └── 22-config-reference.md    ★ openclaw.json completo (secretos REDACTED)
│
├── src/                         # Mission Control (Next.js 16)
│   ├── app/
│   │   ├── api/                 # REST + SSE endpoints
│   │   ├── tasks/               # Tasks page
│   │   └── page.tsx             # Dashboard home
│   ├── components/
│   ├── lib/                     # db, logger, rate-limit, state machine
│   └── types/
├── mission-control.service      # systemd user service unit
├── nginx-mission-control.conf   # nginx reverse proxy config
└── .env.example                 # Variables de entorno requeridas
```

---

## Cron Jobs activos

| Schedule | Nombre | Agente |
|----------|--------|--------|
| Cada hora | Soul Guard Integrity Check | main |
| 3:00 AM COT | Self-Improve | main |
| 4:00 AM COT | Daily Auto-Update | main |
| 7:00 AM COT | Daily Digest | main |
| 10:00 AM COT | Daily AI News | atlas |
| 8:00 PM COT | Resumen Diario | main |
| Lunes 9:00 AM COT | Weekly Planning | hermes |
| Sábado 7:00 PM COT | Weekly Report | hermes |
| Domingo 8:00 PM COT | Weekly Health Check | main |
| Cada 15 min ⚠️ | Meeting Notes (**DEPRECATED**) | main |

---

## Problemas conocidos y riesgos

Ver [docs/19-known-issues-risks.md](./docs/19-known-issues-risks.md) para el inventario completo. Los más críticos:

1. **Gemini Flash silent failures** — ~10-20% de workers fallan silenciosamente sin error
2. **Sin auto-retry** — no hay retry automático a nivel de worker
3. **Cron DEPRECATED activo** — Meeting Notes cron debería estar desactivado
4. **Sin alerta de costos** — picos de $20+/día sin notificación automática
5. **Backup solo local** — archivos críticos (SOUL.md, openclaw.json) sin backup externo

---

## Quick start para nuevos desarrolladores/IA

```bash
# Estado del sistema
systemctl --user status openclaw-gateway.service

# Monitor en tiempo real
~/.openclaw/workspace/scripts/rl_monitor.sh --watch

# Misiones en curso
~/.openclaw/agentos/bin/agentosctl mission list

# Validar config antes de cambios
openclaw doctor

# Verificar integridad SOUL.md de Nubo
~/.openclaw/agentos/bin/soul-guard.sh --post-check
```

---

## Lectura recomendada (por rol)

**Para entender el sistema en general:**
→ [docs/20-architecture-current.md](./docs/20-architecture-current.md)

**Para entender la orquestación multi-agente:**
→ [docs/16-agentos-protocol.md](./docs/16-agentos-protocol.md)

**Para entender cada agente individualmente:**
→ [docs/15-agents-registry.md](./docs/15-agents-registry.md)

**Para hacer cambios de configuración:**
→ [docs/22-config-reference.md](./docs/22-config-reference.md)

**Para diagnóstico de problemas:**
→ [docs/19-known-issues-risks.md](./docs/19-known-issues-risks.md)

**Para planear mejoras:**
→ [docs/21-improvement-roadmap.md](./docs/21-improvement-roadmap.md)

---

## Mission Control

El dashboard web de observabilidad:

```bash
# URL interna
http://localhost:3010

# URL pública
http://187.77.19.111:301

# Deep link a misión
http://187.77.19.111:301/tasks/agentos-MISSION_ID
```

Variables de entorno requeridas (ver `.env.example`):

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default: 3010) |
| `DB_PATH` | Path a SQLite (default: `./data/dashboard.sqlite`) |
| `OPENCLAW_BIN` | Path al binario OpenClaw CLI |
| `GATEWAY_POLL_SECONDS` | Intervalo de polling (default: 30) |

---

*Sistema desplegado en VPS — usuario moltbot — Ubuntu — Marzo 2026*
