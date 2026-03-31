# 22 — Configuración de Referencia (openclaw.json)

> Este documento describe la estructura completa de `~/.openclaw/openclaw.json` con todos los campos y sus valores actuales. Los secretos están REDACTED.

---

## Estructura raíz

```json
{
  "meta": { ... },
  "wizard": { ... },
  "auth": { ... },
  "agents": { ... },
  "tools": { ... },
  "bindings": [],
  "messages": { ... },
  "commands": { ... },
  "session": { ... },
  "hooks": { ... },
  "channels": { ... },
  "gateway": { ... },
  "skills": { ... },
  "plugins": { ... },
  "env": { ... }
}
```

---

## `meta`

```json
{
  "lastTouchedVersion": "2026.3.2",
  "lastTouchedAt": "2026-03-04T08:21:11.158Z"
}
```

---

## `auth.profiles` y `auth.order`

```json
{
  "profiles": {
    "google:default": { "provider": "google", "mode": "api_key" },
    "anthropic:manual": { "provider": "anthropic", "mode": "token" },
    "anthropic:default": { "provider": "anthropic", "mode": "api_key" }
  },
  "order": {
    "anthropic": ["anthropic:default", "anthropic:manual"],
    "google": ["google:default"],
    "openai": ["openai:default"]
  }
}
```

---

## `agents.defaults`

```json
{
  "model": {
    "primary": "google/gemini-2.5-flash",
    "fallbacks": ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4-6"]
  },
  "models": {
    "google/gemini-3.1-pro-preview": { "params": { "temperature": 0.5 } },
    "google/gemini-2.5-flash": {},
    "google/gemini-3-pro-preview": {},
    "google/gemini-3.1-pro-preview-customtools": {},
    "google-antigravity/gemini-3-pro-high": {},
    "google-antigravity/gemini-3-flash": {},
    "google-antigravity/claude-opus-4-6-thinking": {},
    "google/gemini-2.5-pro": {},
    "google/gemini-2.0-flash": {},
    "google-antigravity/gpt-oss-120b-medium": {},
    "google-antigravity/gemini-3-pro-low": {},
    "anthropic/claude-opus-4-6": { "params": { "cacheRetention": "short" } },
    "anthropic/claude-sonnet-4-6": { "params": { "cacheRetention": "short" } },
    "anthropic/claude-sonnet-4-5": { "params": { "cacheRetention": "short" } },
    "anthropic/claude-haiku-4-5": { "params": { "cacheRetention": "short" } },
    "openai/gpt-4o-mini": {},
    "openai/gpt-4o": {}
  },
  "workspace": "/home/moltbot/.openclaw/workspace",
  "bootstrapMaxChars": 12000,
  "bootstrapTotalMaxChars": 42000,
  "contextPruning": {
    "mode": "cache-ttl",
    "ttl": "15m",
    "keepLastAssistants": 1
  },
  "compaction": {
    "mode": "safeguard",
    "model": "google/gemini-2.5-flash"
  },
  "heartbeat": {
    "every": "0m",
    "model": "google/gemini-2.5-flash",
    "directPolicy": "block"
  },
  "maxConcurrent": 1,
  "subagents": {
    "maxConcurrent": 2,
    "maxSpawnDepth": 1,
    "model": "google/gemini-2.5-flash",
    "runTimeoutSeconds": 2400
  }
}
```

---

## `agents.list` — Configuración por agente

### main (Nubo)

```json
{
  "id": "main",
  "model": {
    "primary": "google/gemini-3.1-pro-preview",
    "fallbacks": []
  },
  "sandbox": { "mode": "off" },
  "tools": {
    "allow": ["exec", "process", "read", "write", "session_status",
              "sessions_history", "sessions_list", "sessions_send", "sessions_spawn"],
    "deny": []
  },
  "subagents": {
    "allowAgents": ["atlas", "zenith", "chronos", "spark", "flux", "hermes", "sentinel", "aegis"]
  }
}
```

### zenith

```json
{
  "id": "zenith",
  "model": {
    "primary": "anthropic/claude-opus-4-6",
    "fallbacks": ["google/gemini-2.5-pro", "google/gemini-2.5-flash"]
  },
  "workspace": "/home/moltbot/.openclaw/workspace-zenith",
  "sandbox": { "mode": "off" },
  "tools": {
    "allow": ["exec", "read", "write", "edit", "process", "web_search", "web_fetch"],
    "deny": ["sessions_send", "sessions_spawn", "sessions_list", "sessions_history"]
  }
}
```

### atlas, chronos, flux, hermes (patrón común)

```json
{
  "id": "atlas",
  "model": { "primary": "google/gemini-2.5-flash", "fallbacks": [] },
  "workspace": "/home/moltbot/.openclaw/workspace-atlas",
  "sandbox": { "mode": "off" },
  "tools": {
    "allow": ["exec", "read", "write", "web_search", "web_fetch"],
    "deny": ["sessions_send", "sessions_spawn", "sessions_list", "sessions_history"]
  }
}
```

*Nota: chronos, flux, hermes siguen el mismo patrón. flux tiene workspace `/workspace-flux`, hermes tiene `/workspace-hermes`.*

### spark

```json
{
  "id": "spark",
  "model": {
    "primary": "google/gemini-2.5-flash",
    "fallbacks": ["openai/gpt-4o", "google/gemini-2.5-pro"]
  },
  "sandbox": { "mode": "off" },
  "tools": {
    "allow": ["read", "write", "web_search", "web_fetch"],
    "deny": ["sessions_send", "sessions_spawn", "sessions_list", "sessions_history"]
    // ⚠️ Spark NO tiene exec — solo read/write + web
  }
}
```

### sentinel y aegis (patrón mínimo)

```json
{
  "id": "sentinel",
  "model": { "primary": "google/gemini-2.5-flash", "fallbacks": [] },
  "sandbox": { "mode": "off" },
  "tools": {
    "allow": ["read", "write"],
    "deny": ["sessions_send", "sessions_spawn", "sessions_list", "sessions_history"]
    // ⚠️ Solo read/write — sin exec, sin web
  }
}
```

---

## `tools`

```json
{
  "profile": "full",
  "web": {
    "search": { "enabled": true, "apiKey": "[REDACTED]" },
    "fetch": { "enabled": true }
  },
  "exec": { "ask": "always" },
  "sessions": { "visibility": "all" },
  "agentToAgent": { "enabled": true },
  "media": {
    "audio": {
      "enabled": true,
      "models": [{ "provider": "google", "model": "gemini-2.5-flash" }]
    }
  }
}
```

**⚠️ `exec.ask: "always"`** — OpenClaw pide aprobación para cada llamada `exec`. En producción, las sesiones de worker tienen esta configuración pero el gateway las ejecuta automáticamente en contexto de cron/spawn.

---

## `session`

```json
{
  "dmScope": "main",
  "resetByType": {
    "direct": { "mode": "idle", "idleMinutes": 90 },
    "group": { "mode": "idle", "idleMinutes": 120 },
    "thread": { "mode": "daily", "atHour": 4 }
  }
}
```

- DMs se resetean después de 90 minutos de inactividad
- Grupos se resetean después de 120 minutos
- Threads se resetean diariamente a las 4AM (hora del gateway, no COT)

---

## `channels.telegram`

```json
{
  "enabled": true,
  "dmPolicy": "pairing",
  "groupPolicy": "allowlist",
  "dmHistoryLimit": 4,
  "streaming": "off",
  "retry": {
    "attempts": 2,
    "minDelayMs": 2000,
    "maxDelayMs": 65000,
    "jitter": 0.4
  },
  "accounts": {
    "default": {
      "dmPolicy": "pairing",
      "botToken": "[REDACTED]",
      "groupPolicy": "allowlist",
      "streaming": "off",
      "groupAllowFrom": ["1211573593"]
    },
    "zenith": {
      "name": "Zenith",
      "enabled": true,
      "dmPolicy": "pairing",
      "botToken": "[REDACTED]",
      "groupPolicy": "allowlist",
      "streaming": "off"
    }
  },
  "groupAllowFrom": ["1211573593"]
}
```

**Nota sobre retry:** `maxDelayMs: 65000` (65s) fue configurado para respetar el header `Retry-After: 60` de Anthropic API. `jitter: 0.4` distribuye los retries.

---

## `channels.slack`

```json
{
  "mode": "socket",
  "webhookPath": "/slack/events",
  "enabled": true,
  "botToken": "[REDACTED]",
  "appToken": "[REDACTED]",
  "userTokenReadOnly": true,
  "groupPolicy": "allowlist",
  "dmHistoryLimit": 12,
  "streaming": "partial",
  "nativeStreaming": true
}
```

---

## `gateway`

```json
{
  "port": 18789,
  "mode": "local",
  "bind": "loopback",
  "auth": {
    "mode": "token",
    "token": "[REDACTED]"
  },
  "tailscale": { "mode": "off", "resetOnExit": false },
  "nodes": {
    "denyCommands": ["camera.snap", "camera.clip", "screen.record",
                     "calendar.add", "contacts.add", "reminders.add"]
  }
}
```

---

## `skills.entries` (configuración de skills con auth)

```json
{
  "nano-banana-pro": { "apiKey": "[REDACTED]" },
  "gmail": {
    "enabled": false,
    "config": {
      "clientId": "[REDACTED]",
      "clientSecret": "[REDACTED]"
    }
  },
  "google-calendar": {
    "enabled": false,
    "config": {
      "clientId": "[REDACTED]",
      "clientSecret": "[REDACTED]"
    }
  },
  "google-drive": {
    "enabled": false,
    "config": {
      "clientId": "[REDACTED]",
      "clientSecret": "[REDACTED]"
    }
  }
}
```

**⚠️ Nota:** Gmail, Google Calendar y Google Drive están `enabled: false` como skills directas porque se acceden vía Maton API Gateway, no vía OAuth directo.

---

## `env`

```json
{
  "MATON_API_KEY": "[REDACTED]"
}
```

Esta clave está disponible como variable de entorno para todos los agentes.

---

## Guía de modificación segura

### Antes de modificar

```bash
# Validar config actual
openclaw doctor

# Hacer backup
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak-$(date +%Y%m%d-%H%M%S)
```

### Después de modificar

```bash
# Validar nueva config
openclaw doctor

# Si válido, reiniciar
systemctl --user restart openclaw-gateway.service

# Verificar que levantó
systemctl --user status openclaw-gateway.service
```

### Campos de alto riesgo (NO modificar sin prueba)

| Campo | Por qué es riesgoso |
|-------|---------------------|
| `agents.defaults.bootstrapTotalMaxChars` | Cambios pueden aumentar costos dramáticamente |
| `agents.defaults.contextPruning` | Puede romper continuidad de contexto |
| `channels.telegram.accounts.default.botToken` | Rompe comunicación con Santiago |
| `gateway.auth.token` | Invalida todos los clientes autenticados |
| `agents.list[x].tools.allow` | Puede dar permisos no deseados a agentes |
| `agents.list[x].model.primary` | Cambio de modelo afecta comportamiento y costos |
