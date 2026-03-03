# 05 — Canales: Telegram y Slack (config, policies y operación)

Este documento describe cómo están configurados los canales en OpenClaw, cómo se enrutan a agentes (bindings), y cómo operarlos de forma segura.

> **Regla:** no subir tokens/keys al repo. Todo va `REDACTED` y ejemplos en `/examples`.

---

## 1) Conceptos clave

### 1.1 Canal vs Cuenta
- **Channel**: el tipo de integración (telegram, slack, etc.)
- **Account**: una identidad dentro del canal (ej. bot “default” y bot “zenith” en Telegram)

OpenClaw puede manejar múltiples cuentas por canal, cada una con su token.

### 1.2 Binding (ruteo)
Un binding conecta una “entrada” (channel + accountId) con un agente.

Ejemplo conceptual:
- `telegram + accountId=zenith → agentId=zenith`

Esto permite tener:
- múltiples bots por departamento
- cada bot con su agente dedicado y workspace propio

---

## 2) Telegram

### 2.1 Configuración típica (campos)
En `openclaw.json` (conceptual):
- `channels.telegram.enabled = true`
- `channels.telegram.dmPolicy = pairing`
- `channels.telegram.groupPolicy = allowlist`
- `channels.telegram.dmHistoryLimit = 12`
- `channels.telegram.streaming = off`
- `channels.telegram.accounts`:
  - `default` (token REDACTED)
  - `zenith` (token REDACTED)

> El token se considera secreto. No va al repo.

### 2.2 Policies
#### DM policy: pairing
- El bot no opera libremente en DM hasta que haya pairing/approval.
- Reduce riesgo si se expone el bot en público.

#### Group policy: allowlist
- Solo grupos permitidos pueden interactuar.
- Reduce spam y abuso.

### 2.3 Elevated allowlist (operaciones sensibles)
Cuando `tools.elevated.enabled = true`:
- se define allowlist de user IDs permitidos para operaciones elevadas.

Ejemplo conceptual:
- `tools.elevated.allowFrom.telegram = ["<YOUR_USER_ID>"]`

Esto es especialmente importante si se permite `exec` (aunque sea con approvals).

### 2.4 Operación: pruebas rápidas
- confirmar que gateway está arriba:
  - `systemctl --user status openclaw-gateway.service`
- enviar un DM al bot y verificar pairing/estado desde la UI de OpenClaw Control
- verificar logs:
  - `journalctl --user -u openclaw-gateway.service -e | tail -n 120`

---

## 3) Slack

### 3.1 Configuración típica (campos)
En `openclaw.json` (conceptual):
- `channels.slack.enabled = true`
- `channels.slack.mode = socket`
- `channels.slack.botToken = REDACTED`
- `channels.slack.appToken = REDACTED`
- `channels.slack.userTokenReadOnly = true` (si aplica)
- `channels.slack.groupPolicy = allowlist`
- `channels.slack.dmHistoryLimit = 12`
- `channels.slack.streaming = partial`
- `channels.slack.nativeStreaming = true`

Tokens Slack:
- `xoxb-...` bot token
- `xapp-...` app token
**Nunca** van al repo.

### 3.2 Socket mode
- Slack socket mode mantiene una conexión viva.
- Si el gateway se reinicia, el bot reconecta.

### 3.3 Streaming
- `streaming: partial` + `nativeStreaming: true`
- útil para UI/experiencia conversacional
- requiere buena observabilidad para no saturar logs.

---

## 4) Patrón para crear un “departamento” nuevo (ej. Marketing)

### 4.1 Telegram: bot nuevo
1) Crear bot en BotFather y obtener token (NO repo).
2) Agregar en `channels.telegram.accounts.marketing.botToken = REDACTED`.
3) Crear agente `marketing` en `agents.list` con workspace propio.
4) Crear binding:
   - `channel=telegram, accountId=marketing → agentId=marketing`

### 4.2 Slack: app/bot nuevo (si se usa)
1) Crear Slack app (socket mode).
2) Obtener tokens (NO repo).
3) Configurar allowlist de channels y permisos mínimos.
4) Crear binding similar si OpenClaw lo usa por account/workspace.

### 4.3 Recomendación de seguridad por departamento
- Marketing normalmente NO necesita `exec`.
- Priorizar tools “safe” (web fetch controlado, docs, generación de contenido).
- Mantener allowlists estrictas.

---

## 5) Checklist de seguridad (antes de commit/push)
- [ ] no hay tokens en docs (buscar: `xoxb-`, `xapp-`, `botToken`, `AIza`, `sk-`)
- [ ] `.gitignore` bloquea `.openclaw/` y `auth-profiles.json`
- [ ] allowlists configuradas (groupPolicy, elevated allowFrom)
- [ ] pairing habilitado para DMs (si aplica)

---
