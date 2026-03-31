# 19 — Problemas Conocidos, Riesgos y Deuda Técnica (Estado: Marzo 2026)

> Este documento registra todos los problemas conocidos del sistema actual, riesgos identificados y deuda técnica acumulada. Actualizado: 2026-03-31.

---

## 1. Problemas activos (sin resolver)

### P1 — Gemini Flash: Silently Fails en tareas complejas

**Severidad:** Alta
**Agentes afectados:** Zenith, cualquier worker con Gemini Flash
**Síntoma:** La sesión registra model-snapshot + 1 heartbeat, luego cero mensajes de asistente. No se escribe result.md. El watchdog eventualmente bloquea el job.
**Frecuencia:** Esporádica, más común en tareas con múltiples pasos encadenados.
**Causa raíz:** Gemini Flash parece ignorar silenciosamente el contexto cuando el prompt es demasiado largo o la instrucción demasiado compleja.
**Mitigación actual:** Nubo puede detectar el fallo (watchdog bloqueado) y regenerar el deliverable directamente o re-despachar.
**Sin fix automático:** No hay retry automático a nivel de worker cuando Gemini Flash falla silenciosamente.

---

### P2 — watchdog.log siempre en 0 bytes

**Severidad:** Baja
**Síntoma:** `watchdog.log` siempre aparece vacío aunque el watchdog haya corrido completamente.
**Causa raíz:** nohup output buffering — stdout no se flushea si el proceso termina rápido. El stderr de `post_mc_log` WARN también va al mismo archivo.
**Evidencia real:** `notification_state.json` confirma que el watchdog sí corrió. Los logs van a MC via `post_mc_log`.
**Workaround:** Usar `notification_state.json` y Mission Control para verificar ejecución, no `watchdog.log`.
**No es bloqueante.**

---

### P3 — Routing incorrecto de agentes (ocasional)

**Severidad:** Media
**Síntoma:** Nubo envía tareas al agente equivocado (~10% de los casos).
**Causa raíz:** Gemini 3.1 Pro Preview tiene reglas de routing en SOUL.md pero puede mal-clasificar tareas ambiguas.
**Ejemplos observados:** Tareas de email enviadas a Zenith en lugar de Flux; tareas de investigación enviadas a Hermes.
**Mitigación:** SOUL.md tiene tabla de routing y ejemplos concretos. Historial indica mejora significativa post-fix (de ~40% fallos a ~10%).

---

### P4 — Meeting Notes: Gemini Meeting Notes cron DEPRECATED pero activo

**Severidad:** Media (costo innecesario)
**Síntoma:** El job `c73ebd13` (Gemini Meeting Notes Check) está marcado como DEPRECATED en su nombre pero sigue corriendo cada 15 minutos.
**Causa raíz:** La funcionalidad fue reemplazada por un webhook N8N pero el cron job no fue desactivado.
**Impacto:** Runs innecesarios cada 15 min, consumo de tokens sin propósito.
**Fix pendiente:** Desactivar el cron job `c73ebd13`.

---

### P5 — OpenAI quota agotada

**Severidad:** Alta (para audio)
**Síntoma:** Cualquier llamada a OpenAI para audio retorna error de quota.
**Causa raíz:** Se agotó la quota mensual de OpenAI.
**Impacto:** Audio transcription usa Google Gemini 2.5 Flash. Whisper local está disponible pero es lento y malo en español.
**Estado:** Resuelto funcionalmente (Gemini maneja audio), pero no se ha renovado/aumentado quota OpenAI.

---

### P6 — Zenith: Tendencia a ejecutar tareas simples directamente

**Severidad:** Media
**Síntoma:** Zenith a veces crea archivos simples directamente en lugar de delegar a un agente más apropiado.
**Causa raíz:** Nubo (con Gemini 3.1 Pro Preview) tiene esta limitación documentada: ejecuta tareas simples de creación de archivos directamente en lugar de delegar a Zenith.
**Nota:** Puede ser comportamiento correcto si la tarea es genuinamente simple, pero viola el protocolo de delegación estricta.

---

## 2. Incidentes pasados (resueltos)

### I1 — SOUL.md sobrescrito por Zenith (2026-03-24)

**Impacto:** Crítico — Nubo perdió todas las reglas de delegación.
**Lo que pasó:** Zenith sobrescribió `SOUL.md` de Nubo reduciéndolo de 302 a 30 líneas. Nubo ejecutó todas las tareas directamente durante ~8 horas sin delegar.
**Fix:** soul-guard.sh + cron horario + regla explícita en SOUL.md de Zenith (ARCHIVOS PROHIBIDOS).
**Resuelto:** ✅

### I2 — SOUL.md truncado por OpenClaw (2026-03-25)

**Impacto:** Alto — Nubo perdía reglas de delegación parcialmente.
**Lo que pasó:** SOUL.md creció a 19,510 chars. OpenClaw trunca workspace files a 12,000 chars al inyectarlos. Nubo perdía el Agent Registry y reglas de la segunda mitad del archivo.
**Fix:** SOUL.md comprimido a 8,646 chars. Referencias a PROTOCOLS.md y AGENT_REGISTRY.md para contenido extenso.
**Resuelto:** ✅

### I3 — Mensajes duplicados en Telegram (2026-03-22)

**Impacto:** Alto — Santiago recibía el mismo resultado 2 veces.
**Lo que pasó:** Nubo escribía texto de respuesta DESPUÉS de `sessions_spawn` retornaba "accepted", además del resultado del watchdog.
**Fix:** Reglas SOUL.md: Rule 7 (INERT) + Rule 8 "POST sessions_spawn = CERO TEXTO".
**Resuelto:** ✅

### I4 — Misiones bloqueadas por Nubo saltando Step 4 (2026-03-19)

**Impacto:** Alto — Misiones completadas nunca se entregaban.
**Lo que pasó:** Nubo saltaba Step 4 (verificar result.md) después de que sessions_spawn retornaba ANNOUNCE_SKIP.
**Fix:** mission-finisher.sh como safety net cron + SOUL.md reforzado con regla "NUNCA confiar solo en ANNOUNCE_SKIP".
**Resuelto:** ✅

### I5 — Costos Anthropic: $20-24/día (2026-03-22 a 2026-03-25)

**Impacto:** Económico — $280.54 en marzo 2026 total.
**Causa raíz:** Workspace de 366KB, cron jobs sin modelo explícito usando Sonnet por default, sesiones de 200k-1M tokens, Nubo hacía trabajo directo.
**Fix:** Múltiples optimizaciones (ver doc 17-cron-jobs.md). Target: $10-14/día.
**Resuelto:** ✅ (parcialmente — monitoreo en curso)

### I6 — Rate limit Anthropic (2026-03-04)

**Impacto:** Medio — Jobs fallando por 429 durante ~20 minutos.
**Fix:** `retry.maxDelayMs` 30000→65000, `retry.jitter` 0.3→0.4, subagents.model migrado a Sonnet.
**Resuelto:** ✅

### I7 — Workers con 60-70% de fallos (2026-03-28)

**Impacto:** Alto — Mayoría de delegaciones fallaban.
**Causa raíz:** `STALE_THRESHOLD=120s` demasiado agresivo + heartbeat instructions enterradas en blockquotes que los modelos ignoraban.
**Fix:** `STALE_THRESHOLD` 120→300s, heartbeat promovido a sección top-level `## 🫀 HEARTBEAT` en todos los SOUL.md de workers.
**Resuelto:** ✅ (delegación routing ~90%+)

---

## 3. Riesgos actuales

### R1 — Single point of failure: Nubo

**Riesgo:** Si Nubo falla, todo el sistema de agentes se detiene.
**Probabilidad:** Media (Gemini puede fallar silenciosamente, contexto puede saturarse)
**Impacto:** Alto — Santiago pierde acceso a todos los agentes
**Mitigación actual:** session.resetByType.direct.idleMinutes=90 (reset automático)
**Sin resolver:** No hay failover automático si Nubo no responde

### R2 — Gemini Flash silent failures

**Riesgo:** Workers fallan silenciosamente sin reportar error.
**Probabilidad:** Media (observado regularmente)
**Impacto:** Medio — Misiones se bloquean, requieren intervención manual
**Mitigación actual:** watchdog detecta staleness + mission-finisher.sh
**Sin resolver:** No hay auto-retry a nivel de worker

### R3 — Dependencia total en Maton API

**Riesgo:** Maton API (gateway para Google Workspace) es servicio de terceros.
**Probabilidad:** Baja (SLA desconocido)
**Impacto:** Alto — Chronos, Flux y Hermes dependen de Maton para Google Calendar, Gmail, Drive
**Mitigación:** Agentes reportan "no data available" en lugar de inventar
**Sin resolver:** No hay fallback si Maton cae

### R4 — Costos de API sin techo

**Riesgo:** Pico de costos sin alert/throttle automático.
**Historial:** $5-9/día → $15-24/día en 3 días (Mar 22-25)
**Probabilidad:** Media
**Impacto:** Económico — Costos pueden escalar rápido
**Mitigación actual:** Optimizaciones de Mar 26, modelos Gemini Flash
**Sin resolver:** No hay alerta automática de costo ni hard limit en OpenClaw

### R5 — Credenciales en memoria del sistema

**Riesgo:** API keys en `nubo.env` y `openclaw.json` leídas en memoria del gateway.
**Probabilidad:** Baja (acceso local restringido a usuario moltbot)
**Impacto:** Alto si comprometido
**Mitigación:** Gateway bind=loopback, sin exposición externa directa
**Sin resolver:** Rotación periódica de credenciales no documentada/automatizada

### R6 — SOUL.md corrupto en producción

**Riesgo:** Un agente sobrescriba o corrompa SOUL.md de Nubo.
**Historial:** Ocurrió 2 veces (I1, I2)
**Probabilidad:** Baja post-fix
**Impacto:** Crítico — Nubo pierde reglas operativas
**Mitigación actual:** soul-guard.sh + cron horario + mínimo 200 líneas
**Pendiente:** Backup automático a ubicación externa (no solo local)

### R7 — Ausencia de tests de integración automáticos en producción

**Riesgo:** Cambios en el sistema pueden romper el pipeline AgentOS sin detectarse.
**Probabilidad:** Media
**Impacto:** Medio-Alto
**Mitigación actual:** `test-harness.sh --all` (15 tests) + `delegation-tests.sh` (10 tests) — manual
**Sin resolver:** No hay ejecución automática post-deploy

---

## 4. Deuda técnica

### DT1 — Context window management improvisado

Los límites de contexto (`bootstrapTotalMaxChars=42k`, `contextPruning.ttl=15m`) fueron ajustados reactivamente bajo presión de costos. No hay análisis formal de cuánto contexto necesita cada agente para sus tareas típicas.

### DT2 — Sin manejo de errores de Maton API en Chronos/Hermes

Cuando Maton API retorna error, los agentes reportan el error pero no intentan ningún fallback ni retry estructurado.

### DT3 — Workspace-zenith tiene archivos obsoletos

`workspace-zenith/` tiene archivos como `architecture_proposal.md`, `simulated_nubo_task.py`, `n8n_workflow.json` que no forman parte del protocolo activo.

### DT4 — Métricas de desempeño no recopiladas

No hay métricas históricas de: tasa de éxito por agente, tiempo promedio por tipo de tarea, costo por tipo de tarea. El debugging es reactivo.

### DT5 — Meeting Notes: cron DEPRECATED no desactivado

El job `c73ebd13` sigue consumiendo recursos aunque fue reemplazado por N8N webhook.

### DT6 — Multi-spawn no documentado completamente

El sistema `multi-spawn.sh` para workers paralelos existe pero no está documentado en SOUL.md con suficiente detalle para uso confiable.

### DT7 — soul-guard.sh reference file desactualizado

El archivo de referencia de soul-guard.sh fue actualizado el 2026-03-25, pero podría volverse a quedar desactualizado si SOUL.md cambia sin actualizar la referencia.

### DT8 — openclaw.json contiene credentials inline

`openclaw.json` contiene `MATON_API_KEY` como campo `env`, lo que significa que está en el archivo de configuración principal. Idealmente debería estar solo en `nubo.env`.

### DT9 — No hay documentación de la API de Mission Control

Las rutas de MC (`/api/tasks`, `/api/agents`, `/api/events`, `/api/skills`) no están documentadas formalmente. El código es la única fuente de verdad.
