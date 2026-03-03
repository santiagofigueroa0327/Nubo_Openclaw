# 02 — Config principal: `~/.openclaw/openclaw.json` (Guía mixta: lectura + operación)

Este documento explica **cómo leer** y **cómo operar** la configuración principal de OpenClaw (`openclaw.json`) en el VPS.

> Este repo NO incluye el archivo real. Solo documenta estructura y prácticas seguras.
> Cualquier token/key/password debe permanecer fuera del repositorio.

---

## 1) Dónde vive y qué controla

### 1.1 Ubicación (runtime)
- Archivo real: `~/.openclaw/openclaw.json`
- Controla:
  - modelos y fallbacks,
  - políticas de agentes y subagentes,
  - herramientas permitidas,
  - canales (Telegram/Slack),
  - bindings (ruteo canal → agente),
  - gateway (puerto, auth),
  - políticas de sesiones (reset/ttl),
  - plugins/skills habilitados,
  - modo de ejecución y seguridad (exec approvals, allowlists).

### 1.2 “Fuente de verdad” vs ejemplos
- **Fuente de verdad**: `~/.openclaw/openclaw.json` en el servidor.
- **Ejemplos**: `examples/openclaw.example.json` (siempre REDACTED).

---

## 2) Reglas de oro antes de editar

### 2.1 No romper el sistema por un cambio pequeño
Antes de tocar config:
1) Haz backup local:
   ```bash
   cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.$(date +%Y%m%d-%H%M%S)
   ```

Evita editar si no puedes reiniciar/validar servicios.

Cambios de “canales” o “gateway” requieren reinicio del gateway.

### 2.2 Nunca subir secretos

> Para la guía completa de seguridad y rotación de credenciales, ver [08-security.md](./08-security.md).

No se suben:
- `openclaw.json`
- `auth-profiles.json`
- tokens de Telegram/Slack
- gateway token
- API keys

Usa `.gitignore` (ya está en este repo).

## 3) Anatomía del archivo (secciones principales)

Nombres exactos pueden variar por versión, pero el patrón general se mantiene.

### 3.1 meta / wizard

- `lastTouchedVersion`, `lastTouchedAt`
- `wizard.lastRunAt`, `wizard.lastRunCommand`, `wizard.lastRunMode`

Uso real: diagnóstico (“cuándo fue la última vez que tocaste config con el wizard”).

### 3.2 auth

Define perfiles de autenticación (providers) y orden de preferencia.

Estructura típica:
- profiles:
  - `google:default` (api_key)
  - `anthropic:default` (api_key)
  - `anthropic:manual` (token) — puede quedar como placeholder si se canceló un wizard
- order:
  - `anthropic: [“anthropic:default”, ...]`

Buenas prácticas:
- Mantén un único perfil “default” por provider si quieres estabilidad.
- Si hay “manual” que no se usa, déjalo pero no dependas de él.

### 3.3 agents

Define defaults globales y lista de agentes.

#### 3.3.1 agents.defaults

Campos clave:
- `model.primary`: modelo principal (ej. `anthropic/claude-sonnet-4-6`)
- `models`: catálogo de modelos permitidos / override params
- `workspace`: workspace global (ej. `/home/moltbot/.openclaw/workspace`)
- `bootstrapMaxChars`, `bootstrapTotalMaxChars`: control de contexto inicial
- `contextPruning`: pruning por TTL / cache-ttl
- `compaction`: modo de compacción
- `heartbeat`: estrategia de heartbeat
- `maxConcurrent`: límite de concurrencia

#### 3.3.2 agents.defaults.subagents

- `maxConcurrent`
- `maxSpawnDepth`
- `model` (ej. `anthropic/claude-opus-4-6`)

Interpretación operativa:
- `maxSpawnDepth=1` te mantiene el sistema controlable.
- Aumentarlo sin observabilidad puede disparar costos y complejidad.

#### 3.3.3 agents.list

Ejemplo típico:
- `main`: define tools allow/deny y sandbox
- `zenith`: workspace propio + agentDir

Clave: en este VPS los agentDir contienen solo `auth-profiles.json`; la lógica principal viene de runtime + config.

### 3.4 tools

Controla disponibilidad y seguridad de herramientas.

Campos relevantes (observado):
- `web.search.enabled`: false (reduce exposición)
- `web.fetch.enabled`: true (fetch controlado)
- `exec.ask`: “always” (aprobación manual)
- `elevated.enabled`: true
- `elevated.allowFrom.telegram`: allowlist de IDs permitidos para acciones elevadas

Recomendación:
- `exec.ask=always` es el “seguro de vida”.
- `elevated.allowFrom` debe ser estricto.

### 3.5 bindings

La sección más importante para ruteo por canal.

Ejemplo conceptual:

`{ agentId: "zenith", match: { channel: "telegram", accountId: "zenith" } }`

Esto define que:
- mensajes del bot Zenith en Telegram → agente zenith.

Checklist cuando cambias bindings:
- verificar accountId exacto,
- confirmar que el agente existe,
- reiniciar gateway,
- probar con un mensaje desde el canal.

### 3.6 channels

Define canales, tokens, policies y streaming.

#### Telegram (conceptos)

- `dmPolicy`: pairing
- `groupPolicy`: allowlist
- `dmHistoryLimit`
- `streaming`
- `accounts`: default y zenith (tokens NO en repo)

#### Slack (conceptos)

- `mode`: socket
- `groupPolicy`: allowlist
- `streaming`: partial
- `nativeStreaming`: true

Seguridad:
- tokens de Slack/Telegram son críticos → nunca en repo.

### 3.7 gateway

> Para el contrato completo del gateway (WS RPC, autenticación, métodos), ver [04-gateway-ws-rpc.md](./04-gateway-ws-rpc.md).

Define cómo se expone el gateway.

Campos clave:
- `port`: 18789
- `mode`: local
- `bind`: loopback
- `auth`: token (REDACTED)
- `nodes.denyCommands`: lista de comandos prohibidos

Interpretación:
- `bind=loopback` evita exposición pública directa.
- Para acceso remoto seguro, preferir:
  - reverse proxy controlado,
  - Tailscale Serve,
  - o un túnel autenticado.

### 3.8 session

Políticas de reset y scope.

Ejemplo:
- `direct`: idle 240m
- `group`: idle 120m
- `thread`: daily atHour 4

Por qué importa:
- controla costo y acumulación de contexto.
- evita degradación por conversaciones infinitas.

### 3.9 skills y plugins

Define integraciones habilitadas:
- google-drive, gmail (enabled true/false)
- etc.

Regla:
- si un skill requiere client secrets, no se suben al repo.
- en `/examples` solo placeholders.

## 4) Cómo editar de forma segura (operación)

### 4.1 Edición con validación mínima

Después de editar `openclaw.json`:

1. Validar JSON:

   ```bash
   python3 -m json.tool ~/.openclaw/openclaw.json >/dev/null && echo OK || echo BAD_JSON
   ```

2. Reiniciar gateway:

   ```bash
   systemctl --user restart openclaw-gateway.service
   ```

3. Ver logs:

   ```bash
   journalctl --user -u openclaw-gateway.service -e | tail -n 80
   ```

### 4.2 Cambios que normalmente requieren restart

- `gateway.*`
- `channels.*`
- `bindings`
- `tools.exec` / approvals
- `agents.defaults` (model/subagents)

### 4.3 Cambios “seguros” (menor riesgo)

- ajustes de TTL/limits (con cuidado)
- settings UI (cuando existe panel config seguro)
- cambios de textos descriptivos

## 5) Plantillas y ejemplos en este repo

- `examples/openclaw.example.json`
- `examples/auth-profiles.example.json`

Objetivo:
- que CloudCode/Claude vea “forma y contrato” sin secretos.

## 6) Checklist para CloudCode (antes de tocar producción)

- Confirmar versión actual de OpenClaw: `openclaw --version`
- Confirmar servicios systemd:
  - `openclaw-gateway.service`
  - `mission-control.service`
- Confirmar puertos y bind:
  - gateway en loopback
  - mission control en 3010
- Confirmar que el control real es WS RPC (no REST):
  - ver `docs/04-gateway-ws-rpc.md`
- Confirmar `.gitignore` bloquea secretos.
