# 17 — Cron Jobs (Inventario Actual: Marzo 2026)

> Última actualización: 2026-03-31. Todos los jobs usan TZ=America/Bogota.

---

## Inventario completo

| ID (primeros 8) | Nombre | Schedule | Modelo | Tipo |
|-----------------|--------|----------|--------|------|
| `989b2ef7` | Daily Auto-Update | `0 4 * * *` (4AM COT) | gemini-2.5-flash | silent |
| `d98fb828` | Resumen Diario 8PM COT | `0 20 * * *` (8PM COT) | gemini-2.5-flash | announce/telegram |
| `66d106f5` | Daily Digest 07:00 COT | `0 7 * * *` (7AM COT) | gemini-2.5-flash | announce/telegram |
| `5bf1dd0b` | Hermes Weekly Planning | `0 9 * * 1` (Lunes 9AM COT) | gemini-2.5-flash | announce/telegram |
| `6cd68e6d` | Hermes Weekly Report | `0 19 * * 6` (Sábado 7PM COT) | gemini-2.5-flash | silent |
| `14f62757` | Daily AI News | `0 10 * * *` (10AM COT) | gemini-2.5-flash | announce/telegram |
| `5449e8c0` | Self-Improve | `0 3 * * *` (3AM COT) | gemini-2.5-flash | silent |
| `c73ebd13` | Gemini Meeting Notes Check | `*/15 * * * *` (cada 15 min) | gemini-2.5-flash | silent (DEPRECATED) |
| `7d9d2374` | Weekly Health Check | `0 20 * * 0` (Domingo 8PM COT) | gemini-2.5-flash | — |
| `5ff0c82d` | Soul Guard Integrity Check | `0 * * * *` (cada hora) | gemini-2.5-flash | — |

---

## Descripción de cada job

### Daily Auto-Update (`989b2ef7`)
- **Schedule:** Todos los días 4:00 AM COT
- **Propósito:** Auto-actualizar OpenClaw y skills. Reporta cambios vía Telegram.
- **Modelo:** `google/gemini-2.5-flash`
- **Tipo:** silent (no anuncia en Telegram si no hay cambios)

### Resumen Diario 8PM (`d98fb828`)
- **Schedule:** Todos los días 8:00 PM COT
- **Propósito:** Resumen del día de Santiago: logros, pendientes, mañana.
- **Modelo:** `google/gemini-2.5-flash`
- **Tipo:** announce/telegram (siempre notifica)
- **Delivery:** Chat Santiago (1211573593)

### Daily Digest 07:00 AM (`66d106f5`)
- **Schedule:** Todos los días 7:00 AM COT
- **Propósito:** Digest matutino: agenda del día (Chronos), prioridades (Hermes), noticias AI.
- **Modelo:** `google/gemini-2.5-flash`
- **Tipo:** announce/telegram
- **Delivery:** Chat Santiago (1211573593)

### Hermes Weekly Planning — Lunes 09:00 (`5bf1dd0b`)
- **Schedule:** Lunes 9:00 AM COT
- **Propósito:** Planificación semanal con tareas ClickUp. Plan de 5 días.
- **Modelo:** `google/gemini-2.5-flash`
- **Agente:** Hermes (vía payload directo ClickUp, NO AgentOS)
- **Assignees:** `[81461893]` (Santiago en ClickUp)
- **Tipo:** announce/telegram
- **Fix aplicado (2026-03-23):** Cambiado de `"last"` a `announce/telegram/1211573593` (isolated session requiere delivery explícita)

### Hermes Weekly Report — Sábado 19:00 (`6cd68e6d`)
- **Schedule:** Sábados 7:00 PM COT
- **Propósito:** Reporte semanal: completado, en progreso, deuda, aprendizajes.
- **Modelo:** `google/gemini-2.5-flash`
- **Tipo:** silent (entrega vía mecanismo propio de Hermes)

### Daily AI News — 10:00 AM (`14f62757`)
- **Schedule:** Todos los días 10:00 AM COT
- **Propósito:** Noticias de AI: papers, GitHub trending, Anthropic/Google/OpenAI blogs.
- **Modelo:** `google/gemini-2.5-flash`
- **Agente:** Atlas
- **Tipo:** announce/telegram
- **Delivery:** Chat Santiago (1211573593)
- **Fix (2026-03-26):** Agregado `"model": "google/gemini-2.5-flash"` explícito para reducir costos (antes usaba Sonnet por default)

### Self-Improve — 3:00 AM (`5449e8c0`)
- **Schedule:** Todos los días 3:00 AM COT
- **Propósito:** Nubo analiza su propio desempeño y propone mejoras al sistema.
- **Modelo:** `google/gemini-2.5-flash`
- **Tipo:** silent

### Gemini Meeting Notes Check (`c73ebd13`) ⚠️ DEPRECATED
- **Schedule:** Cada 15 minutos
- **Estado:** DEPRECATED — ahora usa N8N webhook
- **Motivo deprecación:** El polling cada 15 min era costoso e ineficiente. Reemplazado por evento push via N8N.
- **Propósito original:** Verificar si Google Meet generó notas automáticas y procesarlas.

### Weekly Health Check — Domingo 8PM (`7d9d2374`)
- **Schedule:** Domingos 8:00 PM COT
- **Propósito:** Health check semanal del sistema: gateway, agentes, auth profiles, tasa de errores.
- **Modelo:** `google/gemini-2.5-flash`

### Soul Guard — Hourly Integrity Check (`5ff0c82d`)
- **Schedule:** Cada hora (con staggerMs: 300000 = 5 min de dispersión)
- **Propósito:** Verificar integridad de `SOUL.md` de Nubo. Si tiene <200 líneas → restaurar desde backup.
- **Modelo:** `google/gemini-2.5-flash`
- **Fix (2026-03-25):** Agregado post-incidente de truncación de SOUL.md

---

## Metodología de Cron Jobs

Toda operación sobre cron jobs sigue la metodología en `~/.openclaw/workspace/cron-methodology/`:

### Template A — Ficha humana
Diseño legible: nombre, propósito, schedule, agente, output esperado, restricciones.

### Template B — Spec canónica JSON
Estructura exacta para OpenClaw:
```json
{
  "name": "Nombre del job",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Bogota" },
  "sessionTarget": "isolated",
  "agentId": "main",
  "model": "google/gemini-2.5-flash",
  "timeoutSeconds": 300,
  "lightContext": true,
  "delivery": {
    "channel": "telegram",
    "to": "1211573593",
    "announce": true
  },
  "payload": {
    "message": "..."
  }
}
```

### Template C — Instrucción operativa del payload.message
Estructura del mensaje para el agente:
1. **Objetivo** — qué hacer
2. **Contexto** — por qué / datos disponibles
3. **Fuentes** — de dónde obtener datos
4. **Instrucciones** — pasos concretos
5. **Restricciones** — qué NO hacer
6. **Salida esperada** — formato del output
7. **Criterio de no-op** — cuándo no hacer nada
8. **Criterio de error** — qué reportar si falla
9. **Definición de done** — cuándo el job está completo

### Reglas de calidad
- Timezone siempre explícita (`America/Bogota`)
- `sessionTarget: isolated` para jobs automáticos
- `delivery.channel: "telegram"` (NUNCA `"last"` en isolated sessions)
- Todo job debe ser **idempotente**
- Jobs de observación/reporte NO deben ejecutar cambios

---

## System Crontab (cron jobs del OS, NO de OpenClaw)

```cron
# Mission Finisher — cada 5 minutos
*/5 * * * * /home/moltbot/.openclaw/agentos/bin/mission-finisher.sh >> /tmp/mission-finisher.log 2>&1

# Reaper — cada día a las 3 AM
0 3 * * * /home/moltbot/.openclaw/agentos/bin/reaper >> /tmp/reaper.log 2>&1
```

Estos corren a nivel del sistema operativo (no de OpenClaw) y son safety nets del pipeline AgentOS.

---

## Costos y Optimizaciones

**Cambios realizados (2026-03-26) para reducir costos de $20-24/día a ~$10-14/día:**

1. `bootstrapTotalMaxChars`: 60k → 42k (menos tokens en contexto inicial)
2. `subagents.runTimeoutSeconds`: 2400 → 1800 (reducir tiempo facturado)
3. Daily Auto-Update + Resumen Diario cron: migrados a `google/gemini-2.5-flash` (antes usaban Sonnet)
4. Workspace limpiado: 366KB → 42KB (README.md tenía 52KB de ruido)
5. Firewall de delegación: Nubo delega en lugar de ejecutar directamente

**Raíz del problema original:**
- Workspace con 366KB de archivos (README.md con 52KB)
- Cron jobs sin modelo especificado → usaban Sonnet por default
- Sesiones de 200k-1M tokens por contexto mal manejado
- Nubo hacía trabajo directo en lugar de delegar
