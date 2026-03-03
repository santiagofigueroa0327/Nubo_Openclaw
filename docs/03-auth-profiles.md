# 03 — Auth Profiles (`auth-profiles.json`) por agente

Este documento explica cómo funcionan los **perfiles de autenticación** de OpenClaw, dónde viven en disco, cómo se usan en runtime y qué prácticas seguir para no filtrar secretos.

> **Regla:** este repo NO debe contener API keys/tokens reales.  
> Todo lo sensible se mantiene como `REDACTED` y se proveen plantillas en `/examples`.

---

## 1) ¿Qué es `auth-profiles.json`?

`auth-profiles.json` es el archivo donde OpenClaw guarda:
- credenciales por proveedor (Google, Anthropic, etc.),
- modo de auth (api_key / token),
- orden de preferencia por proveedor,
- métricas mínimas de uso (timestamps, errorCount).

En este VPS, existen al menos:
- `~/.openclaw/agents/main/agent/auth-profiles.json`
- `~/.openclaw/agents/zenith/agent/auth-profiles.json`

Hallazgo observado:
- **main** y **zenith** tienen el mismo contenido (mismos perfiles, mismo order).

---

## 2) Ubicación y relación con `openclaw.json`

- `openclaw.json` define *qué perfiles existen* (referencias conceptuales, provider y modo).
- `auth-profiles.json` contiene *la materialización* (keys/tokens) y el orden real.

En un setup típico:
- `openclaw.json` define: `"google:default": { provider:"google", mode:"api_key" }`
- `auth-profiles.json` guarda: `"google:default": { type:"api_key", key:"REDACTED" }`

---

## 3) Estructura del archivo

Estructura típica:

```json
{
  "version": 1,
  "profiles": {
    "google:default": {
      "type": "api_key",
      "provider": "google",
      "key": "REDACTED"
    },
    "anthropic:default": {
      "type": "api_key",
      "provider": "anthropic",
      "key": "REDACTED"
    },
    "anthropic:manual": {
      "type": "token",
      "provider": "anthropic",
      "token": "REDACTED"
    }
  },
  "order": {
    "anthropic": ["anthropic:default"]
  },
  "usageStats": {
    "google:default": { "lastUsed": 0, "errorCount": 0 },
    "anthropic:default": { "lastUsed": 0, "errorCount": 0 }
  }
}
```

### Campos clave

- `version`: versión del formato (normalmente 1)
- `profiles`: mapa de perfiles
- `order`: preferencia por proveedor (muy importante si hay varios perfiles por el mismo proveedor)
- `usageStats`: telemetría ligera local (para debugging)

## 4) Proveedores y modos (lo que significa en práctica)

### 4.1 type: api_key

Normalmente se usa para proveedores como:
- Google (Gemini)
- Anthropic (Claude)

Se guarda como `key`.

### 4.2 type: token

Se usa para tokens de sesión / tokens especiales.

Se guarda como `token`.

En algunos casos puede quedar como placeholder si se canceló un wizard.

Recomendación: mantener un solo método consistente por proveedor salvo que tengas una razón fuerte.

## 5) Orden de preferencia (order)

El bloque `order` evita ambigüedades cuando hay múltiples perfiles:

```json
“order”: {
  “anthropic”: [“anthropic:default”, “anthropic:manual”]
}
```

Interpretación:
- primero intenta `anthropic:default`,
- si falla, intenta `anthropic:manual`.

Buenas prácticas:
- si tienes un perfil “principal” estable, déjalo primero.
- si tienes un perfil “backup”, déjalo después.
- evita 5 perfiles por proveedor si no necesitas complejidad.

## 6) Seguridad y repositorio (lo más importante)

### 6.1 Nunca commitear este archivo real

No se sube al repo:
- `~/.openclaw/agents/*/agent/auth-profiles.json`

En este repo solo:
- documentación,
- plantillas `.example` con REDACTED.

### 6.2 Qué hacer si ya se expuso una key/token

Si una key/token apareció en logs/chat/pantallazo:
- rotar la credencial en el proveedor,
- actualizar el runtime,
- reiniciar servicios si aplica,
- verificar que la credencial anterior está invalidada.

### 6.3 .gitignore recomendado

Asegúrate de tener reglas tipo:
- `**/auth-profiles.json`
- `.openclaw/`
- `.env`
- `*.sqlite`

## 7) Operación: actualizar credenciales sin romper todo

### 7.1 Actualización segura (manual)

1. Editar el `auth-profiles.json` correspondiente (main/zenith):
   - con cuidado de no romper JSON

2. Validar JSON:

   ```bash
   python3 -m json.tool ~/.openclaw/agents/main/agent/auth-profiles.json >/dev/null && echo OK || echo BAD_JSON
   ```

3. Reiniciar gateway si el runtime no recarga en caliente:

   ```bash
   systemctl --user restart openclaw-gateway.service
   ```

4. Confirmar actividad en logs:

   ```bash
   journalctl --user -u openclaw-gateway.service -e | tail -n 80
   ```

Nota: algunos runtimes cachean credenciales; un restart suele ser lo más seguro.

## 8) Plantilla para el repo

Ver:
- `examples/auth-profiles.example.json`

Ese archivo debe contener solo placeholders.

## 9) Checklist rápido

- No hay secrets en el repo (search: `AIza`, `sk-`, `xoxb-`, `xapp-`, `botToken`)
- `.gitignore` bloquea `auth-profiles.json`
- `order` es consistente por proveedor
- JSON válido (`python json.tool`)
- Servicios reiniciados si aplica
