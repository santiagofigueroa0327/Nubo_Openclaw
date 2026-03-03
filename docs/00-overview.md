cat > docs/00-overview.md <<'EOF'
# 00 — Overview (Nubo OpenClaw)

Este repositorio documenta y organiza el ecosistema **Nubo + OpenClaw** tal como está implementado en el VPS `srv1364133` (usuario `moltbot`), y establece un blueprint replicable para futuros “departamentos” de agentes (ej. Marketing) con la misma lógica de orquestación.

> **Regla #1:** este repo NO debe contener tokens/keys reales. Todo secreto va **REDACTED** y se proveen ejemplos en `/examples`.

---

## 1) Objetivo del repositorio

### 1.1 Qué queremos lograr
1) **Documentación reproducible** desde el día 1:
   - arquitectura real,
   - contrato real del gateway,
   - deployment (systemd + nginx),
   - seguridad,
   - troubleshooting.
2) Tener un repositorio que pueda entregarse a otra IA (CloudCode/Claude) para:
   - mejorar el UI (Mission Control),
   - mejorar el deploy,
   - mejorar el flujo de agentes,
   - y extender el sistema a otros “departamentos” sin reinventar la rueda.

### 1.2 Qué NO queremos
- Un “mega documento” único difícil de mantener.
- Configs con secretos commiteados.
- Suponer que el gateway funciona como un REST API típico: **aquí el control principal es WebSocket RPC**.

---

## 2) Qué es OpenClaw en este proyecto

OpenClaw es el runtime que habilita:
- sesiones (stateful),
- ejecución de chat,
- administración de agentes y herramientas,
- cron jobs,
- logs y eventos,
- pairing / device identity,
- approvals para `exec` (zona sensible).

En este VPS, OpenClaw se usa como el “sistema operativo” de Nubo.

---

## 3) Componentes (visión general)

### 3.1 Nubo (la “cara”)
“Nubo” es el concepto de asistente principal: tono, UX, y rol dentro del sistema.
En esta instalación, **Nubo no está versionado como prompt local** dentro de `~/.openclaw/agents/.../agent`.  
La personalización principal viene de:
- `openclaw.json` (políticas y bindings),
- el runtime OpenClaw,
- el canal (Telegram Zenith),
- y el dashboard.

### 3.2 Zenith (entrypoint/orquestador operativo)
Existe un agente `zenith` con:
- workspace propio,
- agentDir (en disco),
- binding en Telegram: **Telegram accountId `zenith` → agentId `zenith`**.

Resultado:
- El bot “Zenith” en Telegram es una puerta directa a la lógica del sistema.
- Zenith opera dentro de los límites definidos por la configuración global (tools, sesiones, subagentes, etc.).

### 3.3 Gateway (OpenClaw)
El gateway está configurado para:
- correr en `bind=loopback` (localhost),
- usar auth por token (REDACTED),
- y exponer control por **WebSocket RPC**.

Importante:
- HTTP sirve una SPA (“OpenClaw Control”).
- rutas como `/health`, `/status`, `/api` pueden devolver **HTML** por ser SPA.
- el estado real se obtiene por WS RPC (`health`, `status`, `agents.list`, etc.).

### 3.4 OpenClaw Control UI (SPA embebida)
En el puerto del gateway se sirve una UI web embebida:
- `<openclaw-app></openclaw-app>`
- assets `./assets/index-*.js` y `./assets/index-*.css`

Esta UI es la que define claramente el contrato:
- WebSocket URL,
- Bearer auth,
- minProtocol/maxProtocol=3,
- métodos RPC y eventos.

### 3.5 Mission Control (Next.js)
Mission Control es un dashboard separado:
- Next.js `16.1.6`
- corre en `3010` (interno)
- nginx lo expone (en esta config) por el puerto `301`
- usa SQLite local:
  - `/home/moltbot/nubo-dashboard/mission-control-review/data/dashboard.sqlite`

Además se configuró con env vars para:
- read-only,
- polling más lento (30s),
- límites para reducir carga.

---

## 4) Qué está “realmente” en disco (hallazgos clave)

### 4.1 Config principal
- `~/.openclaw/openclaw.json` (NO se sube al repo)

Contiene:
- defaults (model, subagentes, pruning, etc.),
- canales y tokens,
- gateway config,
- bindings,
- políticas de tools y sesiones.

### 4.2 Agent dirs
Se verificó:
- `~/.openclaw/agents/main/agent/` contiene solo `auth-profiles.json`
- `~/.openclaw/agents/zenith/agent/` contiene solo `auth-profiles.json`

No existen prompts/router specs en esos directorios (en este server).

### 4.3 Auth profiles
`auth-profiles.json` define:
- google:default (api_key)
- anthropic:default (api_key)
- anthropic:manual (token placeholder)

Ambos agentes (main y zenith) comparten el mismo auth profile.

---

## 5) Contrato real del Gateway (WS RPC)

La pieza más importante del repo para que CloudCode/Claude no se pierda es:
- `docs/04-gateway-ws-rpc.md`

Porque explica:
- por qué `/health` devuelve HTML,
- cómo se conecta realmente (WebSocket),
- cómo autentica (Bearer),
- qué métodos RPC existen,
- qué eventos push existen,
- y qué protocolo usa (3).

---

## 6) Deploy real (systemd + nginx)

- `openclaw-gateway.service` corre OpenClaw gateway como servicio user systemd:
  - evita que muera al cerrar terminal,
  - define env vars (puerto y token).
- `mission-control.service` corre Next.js en producción (3010).
- nginx reverse proxy expone Mission Control externamente (puerto 301 en la config actual).

Todo esto vive en:
- `docs/07-deploy-systemd-nginx.md`

---

## 7) Seguridad (muy importante)

### 7.1 No subir secretos
Este repo debe incluir:
- docs redactados,
- ejemplos `.example`,
- `.gitignore` que bloquee `.openclaw/`, sqlite, `.env`, etc.

### 7.2 Rotación recomendada
Como parte del proceso de documentación se expusieron tokens/keys en texto durante investigación.
Se recomienda rotar:
- Anthropic key
- Google key
- Telegram bot tokens
- Slack tokens
- Gateway token

Ver:
- `docs/08-security.md`

---

## 8) Cómo leer este repo (orden sugerido)

1) `docs/00-overview.md` (este)
2) `docs/01-architecture.md`
3) `docs/04-gateway-ws-rpc.md`  ← contrato real
4) `docs/07-deploy-systemd-nginx.md`
5) `docs/06-mission-control.md`
6) `docs/08-security.md`
7) `docs/09-troubleshooting.md`

---

## 9) Estado actual (snapshot)
- OpenClaw version observada: `2026.3.2`
- Gateway: `127.0.0.1:18789` (loopback)
- Mission Control: `127.0.0.1:3010`
- nginx: `listen 301` → proxy a 3010

> Los valores exactos de tokens/keys NO se incluyen en el repo.

EOF
