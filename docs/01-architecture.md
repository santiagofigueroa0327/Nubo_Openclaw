# 01 — Arquitectura (Nubo OpenClaw)

Este documento define la arquitectura real del sistema Nubo/OpenClaw en el VPS y el modelo mental correcto para extenderlo a otros ecosistemas (ej. Marketing).

---

## 1) Diagrama de componentes (alto nivel)

```text
             ┌───────────────────────────────┐
             │          Usuarios              │
             │  (Telegram / Slack / Web UI)   │
             └───────────────┬───────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │          OpenClaw Gateway               │
        │  - HTTP: OpenClaw Control SPA           │
        │  - WS: RPC (status/health/sessions/...) │
        │  - Auth: Bearer token / pairing         │
        └───────────────┬────────────────────────┘
                        │ (routing / policies / sessions)
                        ▼
           ┌─────────────────────────────┐
           │         Agent Scope          │
           │   main / zenith (bindings)   │
           └───────────────┬─────────────┘
                           │
                           ▼
      ┌─────────────────────────────────────────────┐
      │              Runtime de Agentes             │
      │  - tools allow/deny                          │
      │  - exec approvals (ask=always)               │
      │  - subagents (depth=1, model opus)           │
      │  - session policies (idle/daily reset)       │
      └─────────────────────────────────────────────┘

      ┌─────────────────────────────────────────────┐
      │                Mission Control              │
      │  - Next.js (3010) + nginx (301)             │
      │  - SQLite: dashboard.sqlite                 │
      │  - modo read-only + polling tuning          │
      └─────────────────────────────────────────────┘

## 2) Roles: Nubo vs Zenith (en este VPS)

### 2.1 Nubo (identidad/UX)

En este entorno, Nubo se define más como:

- identidad (nombre/rol/tono),
- objetivo (asistente “cabeza” del ecosistema),
- políticas (lo que puede y no puede hacer),
- que como un prompt local versionado en disco.

Nota importante: en ~/.openclaw/agents/*/agent solo existe auth-profiles.json.
No hay archivos de “router/system prompt” en disco (en este VPS).

### 2.2 Zenith (entrada/orquestador por bindings)

Zenith existe como agente y también como cuenta en Telegram.

Binding (concepto):

- channel: telegram
- accountId: zenith
- agentId: zenith

Implicación:

Todo mensaje entrante desde la cuenta Zenith en Telegram entra directamente al agente zenith.

Zenith tiene su propio workspace: /home/moltbot/.openclaw/workspace-zenith.

## 3) Workspaces y estado

### 3.1 Workspace global

agents.defaults.workspace = /home/moltbot/.openclaw/workspace

Se usa para archivos/artefactos/estado del agente principal.

### 3.2 Workspace de Zenith

/home/moltbot/.openclaw/workspace-zenith

Esto permite:

- aislamiento de artifacts y cache,
- “identidad operacional” separada,
- experimentación sin contaminar el main.

### 3.3 Estado persistente del dashboard (Mission Control)

Mission Control usa SQLite:

/home/moltbot/nubo-dashboard/mission-control-review/data/dashboard.sqlite

Se asume que persiste:

- snapshots/cache de dashboard,
- metadata para UI.

## 4) Sesiones (Session Model)

### 4.1 Qué es una sesión

Una sesión representa un “hilo de contexto” (stateful) mantenido por el gateway/runtime.

La Control UI soporta:

- listar sesiones (sessions.list)
- ajustar defaults (sessions.patch)
- eliminar sesiones (sessions.delete)
- analizar uso/costos (sessions.usage, timeseries, logs)

### 4.2 Política de reset (observada en config)

Se usan resets por tipo:

- direct: idle 240m
- group: idle 120m
- thread: daily a las 04:00

Esto es crítico para:

- control de costos,
- higiene de contexto,
- evitar acumulación infinita.

## 5) Tools y permisos (control operativo)

### 5.1 allow/deny

Los agentes tienen tools permitidas (allowlist) configuradas.
Además existe exec.ask=always, lo cual obliga aprobaciones para comandos.

### 5.2 Exec approvals (zona sensible)

El gateway expone:

- exec.approvals.get/set
- exec.approvals.node.get/set

Esto permite controlar qué comandos/paths se aprueban y con qué reglas.
Debe tratarse como superficie crítica de seguridad.

### 5.3 Elevated allowlist (Telegram)

Existe un mecanismo de “elevated” permitiendo acciones elevadas solo desde allowlist de IDs en Telegram.
Esto protege operaciones sensibles si el bot está expuesto a chats.

## 6) Subagentes y delegación

### 6.1 Política actual

- maxSpawnDepth = 1
- maxConcurrent = 1
- model = anthropic/claude-opus-4-6

Interpretación:

- el runtime puede delegar a subagentes, pero solo a un nivel.
- se reduce la complejidad y el riesgo.

### 6.2 Dónde vive la lógica de delegación en este VPS

Como no hay router/prompt en agentDir, la “delegación” está gobernada por:

- el motor de OpenClaw (runtime),
- y la política global de subagents en openclaw.json.

## 7) Gateway: HTTP vs WS (importante para arquitectura)

### 7.1 HTTP

El gateway sirve una SPA (“OpenClaw Control”).
Rutas tipo /health, /status, /api pueden devolver el HTML base.

### 7.2 WebSocket RPC (fuente de verdad)

El control real (status/health/sessions/chat/cron/logs/agents) opera por:

WebSocket + RPC (type=req/res/event)

Esto define:

- cómo se monitorea el sistema,
- cómo se automatiza (cron),
- cómo se inspecciona uso,
- y cómo se hace debugging.

Ver contrato completo:

[04-gateway-ws-rpc.md](./04-gateway-ws-rpc.md)

## 8) Mission Control vs OpenClaw Control UI

### 8.1 OpenClaw Control UI

- vive en el puerto del gateway
- es “control panel” del propio OpenClaw
- se conecta por WS RPC
- soporta pairing/device identity, approvals, cron, logs, etc.

### 8.2 Mission Control

- dashboard separado (Next.js)
- optimizado para observabilidad y UX propia
- tuning: read-only, polling, timeouts
- persiste SQLite

En un futuro:

- Mission Control puede adoptar WS RPC directamente para datos live,
- o seguir usando polling/CLI dependiendo de tu preferencia.

## 9) Blueprint para replicar a “Marketing Department”

> Para detalles sobre canales y bindings, ver [05-channels-telegram-slack.md](./05-channels-telegram-slack.md).

### 9.1 Patrón recomendado (replicable)

- Crear agente: marketing
  - workspace dedicado
- Crear canal/identidad:
  - Telegram bot propio (ej. “MarketingZenith”)
- Crear binding:
  - channel telegram + accountId marketing → agent marketing
- Definir tools/policies:
  - allowlist específica (ej. sin exec o con exec muy restringido)
- Subagentes especializados (opcional):
  - SEO
  - Ads/Campaigns
  - Copywriting
  - Creative (images/video)
  - Analytics/Reporting

### 9.2 Beneficio

- Aislamiento: workspaces y sesiones separadas por departamento.
- Observabilidad: usage/cost por agente y por canal.
- Gobernanza: approvals/allowlists por ámbito.

## 10) Decisiones clave (resumen)

- Este sistema NO se diseña alrededor de REST; se diseña alrededor de WS RPC.
- “Agente = configuración + políticas + bindings + workspace”.
- Para escalar a más áreas: replicar bindings y workspaces y controlar tools.
