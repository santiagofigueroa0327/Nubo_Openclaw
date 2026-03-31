# 21 — Roadmap de Mejoras y Reestructuración Arquitectónica

> Basado en los problemas conocidos y la arquitectura actual (2026-03-31). Priorizado por impacto/esfuerzo.

---

## Prioridad CRÍTICA (P0)

### M1 — Auto-retry para Gemini Flash silent failures

**Problema:** Gemini Flash falla silenciosamente en ~10-20% de las tareas. El job queda bloqueado hasta que el watchdog lo detecta (hasta 1h).

**Solución propuesta:**
```
job-watchdog.sh detecta stale >5min → marca job como STALE
→ Nubo recibe señal de STALE → re-despacha el mismo job al mismo agente (retry 1)
→ Si retry 1 también falla → intenta con agente alternativo o reporta
→ Max 2 retries automáticos
```

**Complejidad:** Media
**Impacto:** Alto — elimina la mayoría de intervenciones manuales

---

### M2 — Desactivar cron job DEPRECATED `c73ebd13`

**Problema:** El job Gemini Meeting Notes Check corre cada 15 min y fue reemplazado por N8N webhook.

**Solución:**
```bash
openclaw cron disable c73ebd13-d558-43d9-bf8d-158cfd7e12ae
```

**Complejidad:** Trivial
**Impacto:** Medio — reduce costos y ruido en logs

---

### M3 — Alert automático de costos de API

**Problema:** Los costos pueden escalar de $10 a $24/día en 72h sin alerta.

**Solución propuesta:**
- Cron diario que lee `rl_monitor.sh` y calcula estimación de costo del día
- Si proyección >$15/día → Telegram alert inmediato
- Si costo real >$20/día → alerta crítica + throttle automático de sesiones no críticas

**Complejidad:** Media
**Impacto:** Alto — prevención económica

---

## Prioridad ALTA (P1)

### M4 — Métricas de desempeño por agente

**Problema:** No hay datos históricos de: tasa de éxito por agente, tiempo promedio, costo por tipo de tarea.

**Solución propuesta:**
```
AgentOS escribe en SQLite:
- agent_id, mission_id, job_id
- start_time, end_time, duration_seconds
- result (DONE/FAILED/HANDOFF/TIMEOUT)
- model_used, tokens_estimated
- handoff_count, retry_count
```

Dashboard Mission Control agrega:
- Tabla de success rate por agente (última semana)
- Gráfica de costo estimado por día
- Alertas de agentes con >30% fallos

**Complejidad:** Media-Alta
**Impacto:** Alto — visibilidad real del sistema

---

### M5 — Retry automático en HANDOFF chains

**Problema:** Si el segundo agente en un HANDOFF falla, Nubo no tiene lógica de retry automático para el agente destino.

**Solución propuesta:**
- Cuando Step 4 detecta `FAILED` en un job de HANDOFF → auto-retry al mismo agente (max 1)
- Si retry falla → escalar a Nubo para decisión
- Timeout específico para retry (reducido al 50% del original)

**Complejidad:** Media
**Impacto:** Medio-Alto

---

### M6 — Tests de integración automáticos post-deploy

**Problema:** `test-harness.sh --all` y `delegation-tests.sh` son manuales. No hay ejecución automática.

**Solución propuesta:**
- Cron semanal (domingos 9PM, después del Weekly Health Check) que corre `delegation-tests.sh --all`
- Reporta resultados a Telegram: `X/10 tests PASS`
- Si <8/10 → alerta crítica

**Complejidad:** Baja-Media
**Impacto:** Alto — prevención de regresiones

---

### M7 — Backup externo de SOUL.md y openclaw.json

**Problema:** Los backups de archivos críticos son solo locales. Si el disco falla o se corrompe → pérdida total.

**Solución propuesta:**
- Cron diario: comprime y sube a Google Drive (vía Maton API) los archivos críticos
  - SOUL.md (todos los agentes)
  - openclaw.json
  - jobs.json
  - agentos.sqlite (dump)
- Retención: 30 días
- Verificación: weekly restore test automático

**Complejidad:** Media
**Impacto:** Alto — business continuity

---

## Prioridad MEDIA (P2)

### M8 — Context window sizing por agente

**Problema:** Los límites de contexto (`bootstrapTotalMaxChars=42k`) fueron ajustados reactivamente. No están calibrados por tipo de agente.

**Solución propuesta:**
- Atlas (research): puede necesitar más contexto (hasta 60k) para jobs grandes
- Spark/Sentinel/Aegis: pueden funcionar con menos (20k)
- Nubo: calibrar según historial de sesiones exitosas

**Complejidad:** Media
**Impacto:** Medio — balance costo/calidad

---

### M9 — Fallback provider para Maton API

**Problema:** Si Maton API cae, Chronos/Flux/Hermes pierden acceso a Google Workspace completamente.

**Solución propuesta:**
- Implementar llamadas directas a Google API como fallback (OAuth flow)
- O documentar proceso manual de emergencia para Santiago

**Complejidad:** Alta
**Impacto:** Medio (Maton raramente cae)

---

### M10 — Documentación de API de Mission Control

**Problema:** Las rutas de MC no están documentadas. El código es la única fuente.

**Solución propuesta:**
- OpenAPI spec para todas las rutas de `/api/*`
- README actualizado con ejemplos de uso
- Swagger UI embebido en MC (solo en desarrollo)

**Complejidad:** Baja-Media
**Impacto:** Medio — facilita contribuciones y debugging

---

### M11 — Limpiar workspace-zenith de archivos obsoletos

**Problema:** `workspace-zenith/` tiene archivos no usados que aumentan el `bootstrapTotalMaxChars`.

**Archivos a eliminar/mover:**
- `architecture_proposal.md`
- `simulated_nubo_task.py`
- `n8n_workflow.json`
- `telegram_status_service.py`
- `cron_metadata.json` (si obsoleto)

**Complejidad:** Trivial
**Impacto:** Bajo-Medio (reduce tokens de contexto)

---

### M12 — Rotación automática de credenciales

**Problema:** No hay proceso documentado ni automatizado para rotar API keys.

**Solución propuesta:**
- Checklist semestral de rotación
- Cron que verifica expiración de tokens OAuth
- Alertas 30 días antes de expiración conocida

**Complejidad:** Media
**Impacto:** Medio (seguridad)

---

## Prioridad BAJA (P3) — Mejoras arquitectónicas mayores

### M13 — Agente de fallback para Nubo

**Problema:** Si Nubo (Gemini 3.1 Pro Preview) falla, todo el sistema se detiene.

**Solución propuesta:**
- Definir un agente "nubo-backup" con Claude Sonnet como modelo
- En condición de fallo de Nubo detectada por heartbeat → activar nubo-backup automáticamente
- Alcance limitado: solo responder con diagnóstico + solicitar intervención de Santiago

**Complejidad:** Alta
**Impacto:** Alto (resiliencia del sistema)

---

### M14 — Event-driven architecture para Meeting Notes

**Problema:** El polling cada 15 min fue reemplazado por N8N webhook pero la integración no está completamente documentada.

**Solución propuesta:**
- Documentar el flujo completo de N8N → OpenClaw
- Verificar que el cron job está efectivamente desactivado (M2)
- Agregar monitoring del webhook

**Complejidad:** Baja-Media
**Impacto:** Medio

---

### M15 — Agente de memoria compartida

**Problema:** Cada agente tiene su propio MEMORY.md pero no hay memoria compartida entre agentes. Si Atlas descubre algo sobre un cliente, Hermes no lo sabe.

**Solución propuesta:**
- Archivo `~/.openclaw/workspace/SHARED_MEMORY.md` con conocimiento cross-agent
- Protocolo: agente escribe a SHARED_MEMORY → soul-guard.sh valida
- Nubo consolida aprendizajes semanal (Self-Improve cron ya existe)

**Complejidad:** Media-Alta
**Impacto:** Alto a largo plazo

---

### M16 — Multi-tenant: nuevo "departamento" de agentes

**Problema:** El sistema está diseñado para un solo usuario (Santiago). No hay soporte para múltiples usuarios o equipos.

**Solución propuesta:**
- Duplicar la configuración completa de agentes para otro usuario
- Aislamiento de workspaces y auth profiles
- Canal Telegram separado
- Potencialmente: otro VPS o namespace del OS

**Complejidad:** Muy Alta
**Impacto:** Muy Alto (escalabilidad del negocio)

---

## Resumen de prioridades

| ID | Mejora | Prioridad | Complejidad | Impacto |
|----|--------|-----------|-------------|---------|
| M1 | Auto-retry Gemini Flash failures | P0 | Media | Alto |
| M2 | Desactivar cron DEPRECATED | P0 | Trivial | Medio |
| M3 | Alert automático de costos | P0 | Media | Alto |
| M4 | Métricas por agente | P1 | Media-Alta | Alto |
| M5 | Retry en HANDOFF chains | P1 | Media | Medio-Alto |
| M6 | Tests automáticos post-deploy | P1 | Baja-Media | Alto |
| M7 | Backup externo archivos críticos | P1 | Media | Alto |
| M8 | Context sizing por agente | P2 | Media | Medio |
| M9 | Fallback Maton API | P2 | Alta | Medio |
| M10 | API MC documentada | P2 | Baja-Media | Medio |
| M11 | Limpiar workspace-zenith | P2 | Trivial | Bajo-Medio |
| M12 | Rotación de credenciales | P2 | Media | Medio |
| M13 | Agente fallback para Nubo | P3 | Alta | Alto |
| M14 | Event-driven Meeting Notes | P3 | Baja-Media | Medio |
| M15 | Memoria compartida entre agentes | P3 | Media-Alta | Alto |
| M16 | Multi-tenant / nuevo departamento | P3 | Muy Alta | Muy Alto |
