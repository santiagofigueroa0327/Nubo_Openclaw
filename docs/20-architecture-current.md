# 20 — Arquitectura Actual (Estado: Marzo 2026)

> Este documento describe la arquitectura completa del sistema Nubo/OpenClaw tal como está desplegado al 2026-03-31. Supersede el documento `01-architecture.md` para el estado actual.

---

## Stack tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Runtime de agentes | OpenClaw | 2026.3.2 |
| Nubo (orchestrator) | Google Gemini 3.1 Pro Preview | — |
| Workers (8 agentes) | Google Gemini 2.5 Flash | — |
| Zenith (engineering) | Anthropic Claude Opus 4.6 | — |
| Mission Control | Next.js | 16 (App Router) |
| DB AgentOS | SQLite | WAL mode |
| DB Mission Control | SQLite | WAL mode |
| Servicio del sistema | systemd (user service) | — |
| Proxy reverso | nginx | — |
| Canal principal | Telegram Bot API | — |
| Canal secundario | Slack | Socket mode |
| APIs Google | Maton API Gateway | — |
| OS | Ubuntu | 22.04+ |
| Node | v18+ | — |

---

## Diagrama de componentes

```
╔══════════════════════════════════════════════════════════════════╗
║                        INTERNET                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║    Santiago                                                       ║
║    (Telegram)  ◄───────────────────────────────────────────────► ║
║                                                                   ║
╚════════════════════════════╤═════════════════════════════════════╝
                             │ HTTPS (Telegram Bot API)
                             ▼
╔════════════════════════════════════════════════════════════════════╗
║                      VPS srv1364133                               ║
║                    (Ubuntu, moltbot user)                          ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │              nginx (reverse proxy)                          │  ║
║  │  :80/:443 → localhost:3010 (Mission Control)                │  ║
║  │  :301     → localhost:3010 (MC, public IP)                  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │    OpenClaw Gateway (systemd user service)                  │  ║
║  │    openclaw-gateway.service                                 │  ║
║  │    Node.js — bind=loopback — port: 18789                    │  ║
║  │    KillMode=control-group, Restart=on-failure               │  ║
║  │                                                             │  ║
║  │    Agentes:                                                 │  ║
║  │    ┌──────────┐  ┌────────┐  ┌───────────┐  ┌──────────┐  │  ║
║  │    │  NUBO    │  │ ZENITH │  │   ATLAS   │  │ CHRONOS  │  │  ║
║  │    │ (main)   │  │ (opus) │  │  (flash)  │  │ (flash)  │  │  ║
║  │    │ gemini   │  │        │  │           │  │          │  │  ║
║  │    │ 3.1pro   │  │        │  │           │  │          │  │  ║
║  │    └──────────┘  └────────┘  └───────────┘  └──────────┘  │  ║
║  │    ┌──────────┐  ┌────────┐  ┌───────────┐  ┌──────────┐  │  ║
║  │    │  SPARK   │  │  FLUX  │  │  HERMES   │  │ SENTINEL │  │  ║
║  │    │ (flash)  │  │(flash) │  │  (flash)  │  │  (flash) │  │  ║
║  │    └──────────┘  └────────┘  └───────────┘  └──────────┘  │  ║
║  │    ┌──────────┐                                            │  ║
║  │    │  AEGIS   │                                            │  ║
║  │    │ (flash)  │                                            │  ║
║  │    └──────────┘                                            │  ║
║  │                                                             │  ║
║  │    Ports internos: 18791, 18792 (loopback only)             │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │    AgentOS Layer (~/.openclaw/agentos/)                      │  ║
║  │                                                             │  ║
║  │    missions/          ← Blackboard filesystem               │  ║
║  │    agentos.sqlite     ← Metadatos de jobs y misiones        │  ║
║  │    bin/               ← CLI tools (dispatch-job, watchdog)  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │    Mission Control (~/.openclaw/agentos/)                    │  ║
║  │    Next.js 16 — port 3010                                   │  ║
║  │    SQLite (WAL) — observabilidad                            │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
╚════════════════════════════════════════════════════════════════════╝
                    │                    │
                    │ API calls          │ API calls
                    ▼                    ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Google AI       │  │   Anthropic AI    │
         │  Gemini 3.1 Pro  │  │   Claude Opus 4.6 │
         │  Gemini 2.5 Flash│  │   Claude Sonnet   │
         └──────────────────┘  └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Maton API GW    │
         │  Google Calendar │
         │  Gmail           │
         │  Google Drive    │
         │  Google Docs     │
         └──────────────────┘
```

---

## Capas del sistema

### Capa 1: Canal (Telegram/Slack)

**Telegram (principal):**
- Bot token configurado en `openclaw.json` → `channels.telegram.accounts.default`
- `dmPolicy: "pairing"` — solo usuarios pareados
- `groupPolicy: "allowlist"` — solo grupos permitidos
- `groupAllowFrom: ["1211573593"]` — solo Santiago
- `dmHistoryLimit: 4` — contexto limitado para reducir tokens
- `streaming: "off"` — sin streaming (reduce costos)
- Quiet hours: 00:00–07:00 COT (Nubo no notifica)

**Slack (secundario):**
- Socket mode (no webhooks)
- `dmHistoryLimit: 12` — más historial que Telegram
- `streaming: "partial"` + `nativeStreaming: true`

### Capa 2: Gateway OpenClaw

- Binario Node.js propietario (closed-source)
- Servicio systemd: `openclaw-gateway.service` (user service)
- Bind: loopback only (localhost:18789)
- Auth: Bearer token
- Gestiona: sesiones, agentes, cron jobs, herramientas, delivery

**Configuración crítica en openclaw.json:**
```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback"
  },
  "agents.defaults": {
    "model.primary": "google/gemini-2.5-flash",
    "bootstrapMaxChars": 12000,
    "bootstrapTotalMaxChars": 42000,
    "contextPruning": { "mode": "cache-ttl", "ttl": "15m", "keepLastAssistants": 1 },
    "subagents": { "maxConcurrent": 2, "maxSpawnDepth": 1, "runTimeoutSeconds": 2400 }
  }
}
```

### Capa 3: AgentOS (Orquestación)

- Capa document-first sobre OpenClaw
- Blackboard filesystem: `~/.openclaw/agentos/missions/`
- SQLite para metadatos y queries
- Scripts bash para workflow automation

### Capa 4: Agentes

9 agentes con workspaces aislados. Cada workspace contiene:
- `SOUL.md` — cerebro/protocolo operativo
- `IDENTITY.md` — identidad y rol
- `MEMORY.md` — aprendizajes acumulados
- `TOOLS.md` — herramientas disponibles
- `USER.md` — info del usuario (Santiago)
- `AGENTS.md` — registry de otros agentes
- `WORKSPACE.md` — configuración del workspace

### Capa 5: Mission Control (Observabilidad)

- Next.js 16 + SQLite
- SSE streaming para logs en tiempo real
- Deep links a misiones individuales
- Página de Skills
- Polling del gateway cada 30s

---

## Flujo de datos

### Mensaje entrante (Telegram → Nubo)

```
1. Usuario (Santiago) escribe en Telegram
2. Telegram Bot API → OpenClaw Gateway (webhook/polling)
3. Gateway crea sesión para agente "main" (Nubo)
4. Nubo recibe mensaje con contexto limitado (dmHistoryLimit=4)
5. Nubo evalúa: ¿responder directo o delegar?
   a. Directo: texto Telegram ← menos de 30s de trabajo
   b. Delegar: ejecuta protocolo AgentOS 5 pasos
```

### Delegación (Nubo → Worker)

```
1. Nubo ejecuta dispatch-job → crea blackboard (task.md, context.md, acceptance.md)
2. Nubo envía status Telegram + inicia watchdog background
3. Nubo llama sessions_spawn → OpenClaw activa sesión del worker
4. Worker: heartbeat → lee task.md → trabaja → escribe result.md → ANNOUNCE_SKIP
5. Watchdog monitorea heartbeat + actualiza Telegram cada cambio
6. Nubo verifica result.md → entrega resultado
```

### Cron job execution

```
1. OpenClaw scheduler detecta cron trigger (expr + tz)
2. Crea sesión aislada (sessionTarget: isolated) para el agente configurado
3. Inyecta payload.message como primer mensaje
4. Agente ejecuta + entrega resultado via delivery.channel
5. Sesión termina
```

---

## Servicios del OS

### openclaw-gateway.service (systemd user)

```ini
[Service]
EnvironmentFile=%h/.openclaw/nubo.env
ExecStart=node .../openclaw/dist/index.js gateway run --port 18789 --force
Restart=on-failure
RestartSec=10
KillMode=control-group
```

### System crontab

```cron
# Safety nets del pipeline AgentOS
*/5 * * * * /home/moltbot/.openclaw/agentos/bin/mission-finisher.sh
0 3 * * * /home/moltbot/.openclaw/agentos/bin/reaper
```

---

## Modelos de AI (marzo 2026)

| Agente | Modelo primario | Fallbacks | Por qué |
|--------|----------------|-----------|---------|
| Nubo | `google/gemini-3.1-pro-preview` | ninguno | Modelo más capaz, orquestador principal |
| Zenith | `anthropic/claude-opus-4-6` | gemini-2.5-pro, gemini-2.5-flash | Tareas de ingeniería complejas |
| Atlas | `google/gemini-2.5-flash` | ninguno | Research, bajo costo, alto volumen |
| Chronos | `google/gemini-2.5-flash` | ninguno | Calendar/email, rutinario |
| Spark | `google/gemini-2.5-flash` | gpt-4o, gemini-2.5-pro | Brainstorm con opciones de creatividad |
| Flux | `google/gemini-2.5-flash` | ninguno | Cron/automation, operativo |
| Hermes | `google/gemini-2.5-flash` | ninguno | ClickUp, planificación |
| Sentinel | `google/gemini-2.5-flash` | ninguno | Validación, solo read/write |
| Aegis | `google/gemini-2.5-flash` | ninguno | Ensamblaje final, solo read/write |
| Compaction | `google/gemini-2.5-flash` | — | Comprime contexto de todos los agentes |
| Cron jobs | `google/gemini-2.5-flash` | — | Jobs automáticos, bajo costo |

---

## Proveedores de Auth

| Proveedor | Perfil | Modo |
|-----------|--------|------|
| Google | `google:default` | API key |
| Anthropic | `anthropic:default` | API key |
| Anthropic | `anthropic:manual` | Token |
| Maton | — | API key (env var) |

**Audio:** Solo Google Gemini 2.5 Flash. OpenAI quota agotada. Whisper local descartado (lento, malo en español).

---

## Monitoreo del sistema

```bash
# Estado del servicio
systemctl --user status openclaw-gateway.service

# Monitor de rate limits (terminal interactivo)
~/.openclaw/workspace/scripts/rl_monitor.sh --watch

# Estado de misiones AgentOS
~/.openclaw/agentos/bin/agentosctl mission list

# Validar config antes de restart
openclaw doctor

# Health check completo del sistema
# (Cron automatizado domingos 8PM COT via job 7d9d2374)
```

---

## Archivos de configuración críticos

| Archivo | Propósito | ¿Quién puede modificar? |
|---------|-----------|------------------------|
| `~/.openclaw/openclaw.json` | Config principal del gateway | Solo con confirmación de Santiago |
| `~/.openclaw/workspace/SOUL.md` | Cerebro de Nubo | Solo Nubo (con soul-guard.sh) |
| `~/.openclaw/agents/main/agent/auth-profiles.json` | Auth profiles de Nubo | OpenClaw automático |
| `~/.openclaw/cron/jobs.json` | Definición de cron jobs | Flux (via openclaw CLI) |
| `~/.config/systemd/user/openclaw-gateway.service` | Servicio systemd | Con confirmación de Santiago |
| `~/.openclaw/nubo.env` | Variables de entorno sensibles | Con confirmación de Santiago |

---

## Variables de entorno (nubo.env)

```bash
# Telegrama
NUBO_BOT_TOKEN=[REDACTED]
NUBO_CHAT_ID=[REDACTED]

# Mission Control
MC_PUBLIC_URL=http://187.77.19.111:301

# (Otras variables de API keys cargadas por openclaw.json)
```

---

## Límites de contexto (contexto de agentes)

| Parámetro | Valor | Propósito |
|-----------|-------|-----------|
| `bootstrapMaxChars` | 12,000 chars | Máximo por archivo de workspace |
| `bootstrapTotalMaxChars` | 42,000 chars | Total de todos los archivos de workspace |
| `contextPruning.ttl` | 15 minutos | TTL del cache de contexto |
| `contextPruning.keepLastAssistants` | 1 | Cuántos mensajes de asistente mantener |
| `dmHistoryLimit` | 4 (Telegram) | Historial de DMs |
| `maxConcurrent` | 1 (main agent) | Concurrencia del agente principal |
| `subagents.maxConcurrent` | 2 | Concurrencia de subagentes |
| `subagents.maxSpawnDepth` | 1 | Profundidad máxima de spawning |
| `subagents.runTimeoutSeconds` | 2400 | Timeout de sessions_spawn |
