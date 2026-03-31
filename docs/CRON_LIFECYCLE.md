# CRON_LIFECYCLE.md — Proceso de Gobernanza de Cron Jobs
Versión: 1.0 · Owner: sistema · Fecha: 2026-03-31

---

## Lección del zombie c73ebd13

En marzo 2026, el job `c73ebd13` (Gemini Meeting Notes) corrió 876 veces después de ser reemplazado por un webhook externo. Generó 451KB de logs y ~$50-60 USD de gasto innecesario. El origen fue la ausencia de tres procesos: owner definido, criterio de deprecación al crear el job, y auditoría periódica. Este documento establece esos tres procesos como obligatorios.

---

## Criterios obligatorios para crear un cron job en producción

Todo nuevo cron job debe cumplir estos criterios antes de activarse:

**Nombre descriptivo:** El nombre debe describir la función en cinco palabras o menos. Nombres genéricos como "cron-1" o "auto-job" no son aceptables.

**Owner declarado:** Un agente o sistema específico es responsable de este job. Sin owner, el job no puede activarse.

**`delivery.channel` explícito:** Siempre declarar el canal de entrega (`telegram` o `slack`). La ausencia de este campo causó los errores del 1-2 de marzo (jobs en isolated sessions sin delivery → resultado nunca llegó a Santiago).

**Timeout configurado:** Siempre configurar un `timeoutSeconds`. El job del 20 de marzo corrió 1,232 segundos porque no había límite.

**Tres runs de test documentados:** Antes de activar en producción, ejecutar el job tres veces manualmente en horario no crítico y documentar el output, duración y tokens de cada run.

**Criterio de deprecación definido al crear:** Al crear el job, documentar explícitamente qué condición lo haría obsoleto. Ejemplo: "Este job se depreca cuando el webhook de N8N para reuniones esté activo y validado." Esta línea va en el campo `deprecation-condition` del registry.

**Registro en `cron-registry.md` antes de activar:** La entrada debe existir en el registry antes del primer run en producción.

---

## Schema canónico para jobs.json

```json
{
  "name": "Nombre descriptivo — 5 palabras o menos",
  "enabled": true,
  "schedule": {
    "kind": "cron",
    "expr": "0 7 * * *",
    "tz": "America/Bogota"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "model": "google/gemini-2.5-flash",
    "message": "...",
    "timeoutSeconds": 300,
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "1211573593"
  }
}
```

---

## Proceso de deprecación

El día que se decide deprecar un job, ejecutar estos pasos en orden **el mismo día**:

1. Ejecutar `openclaw cron disable [id]` — inmediatamente, no "después"
2. Actualizar `cron-registry.md` con estado `DEPRECATED`, fecha y razón
3. Verificar que el mecanismo sustituto (si existe) está funcionando correctamente
4. Archivar los logs del job en `~/.openclaw/cron/archive/[id]/` para referencia futura

**No existe un estado "pendiente de desactivación".** Si se decide deprecar, se desactiva el mismo día.

---

## Auditoría mensual automática

El primer lunes de cada mes a las 10:00 COT, el agente Flux ejecuta la auditoría de cron jobs y reporta en Telegram:

- Lista de jobs activos con su success rate del mes anterior
- Jobs con success rate < 80% que necesitan revisión
- Jobs sin run en los últimos 7 días (posible zombie)
- Jobs marcados DEPRECATED que aún aparezcan en `openclaw cron list` (error crítico)
- Comparación entre `cron-registry.md` y `openclaw cron list` — reportar discrepancias

Job ID: ver `docs/cron-registry.md` entrada `monthly-infra-audit`.

---

## Estado del inventario actual (baseline 2026-03-31)

| ID (8 chars) | Nombre | Estado | Notas |
|---|---|---|---|
| `989b2ef7` | Daily Auto-Update | ACTIVE | — |
| `d98fb828` | Resumen Diario 8PM | ACTIVE | Optimizado P2 |
| `66d106f5` | Daily Digest 07:00 | ACTIVE | — |
| `5bf1dd0b` | Hermes Weekly Planning | ACTIVE | Fix entrega 2026-03-23 |
| `6cd68e6d` | Hermes Weekly Report | ACTIVE | — |
| `14f62757` | Daily AI News 10AM | ACTIVE | — |
| `5449e8c0` | Self-Improve 3AM | ACTIVE | — |
| `7d9d2374` | Weekly Health Check | ACTIVE | — |
| `5ff0c82d` | Soul Guard Hourly | ACTIVE | Post-incidente 2026-03-25 |
| `c73ebd13` | Meeting Notes Check | **DEPRECATED** | 876 runs post-reemplazo. Lección fundacional. |

Ver inventario completo con deprecation-conditions en `~/.openclaw/workspace/docs/cron-registry.md`.
