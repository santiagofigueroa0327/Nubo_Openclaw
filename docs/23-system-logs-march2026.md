# 23 — Logs y Métricas del Sistema — Marzo 2026

> Período: 2026-03-01 al 2026-03-31 · Generado: 2026-03-31 · Fuente: cron/runs/*.jsonl, agentos/missions/, agentos/*.log

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Total misiones AgentOS | **402** |
| Total jobs ejecutados | **414** (aprox.) |
| Cron runs registrados | **37 archivos JSONL** |
| Soul Guard runs | **153/153 PASS (100%)** |
| Misiones semana pico (W13) | **151** |
| Crecimiento 19→31 marzo | 193 → 413 (+220 misiones) |
| Delivery queue pendiente hoy | **0** (limpia) |
| Stuck handoffs hoy | **0** |

---

## 1. Actividad de Misiones AgentOS

### Misiones por semana

| Semana | Período aprox. | Misiones |
|--------|----------------|---------|
| W10 | 02–08 Mar | 143 |
| W11 | 09–15 Mar | 24 |
| W12 | 16–22 Mar | 71 |
| W13 | 23–29 Mar | 151 |
| W14 | 30–31 Mar | 13 |
| **Total** | | **402** |

**Observación:** La W10 y W13 son semanas de alto volumen. W11 tiene baja actividad probablemente por ajustes post-rate-limit y estabilización del sistema (AgentOS v1 desplegado el 04-Mar).

### Misiones por tipo

| Tipo | Cantidad | % |
|------|---------|---|
| Creación de contenido (scripts, HTML, docs) | 118 | 29% |
| Otros | 102 | 25% |
| Reuniones y calendario | 68 | 17% |
| Research y búsquedas | 63 | 16% |
| Gestión de tareas (ClickUp) | 23 | 6% |
| Sintéticas/testing | 15 | 4% |
| Planificación | 13 | 3% |

### Jobs por agente (total acumulado)

| Agente | Jobs ejecutados | % del total |
|--------|----------------|-------------|
| **Atlas** | 103 | 24.9% |
| **Zenith** | 89 | 21.5% |
| **Flux** | 72 | 17.4% |
| **Chronos** | 55 | 13.3% |
| **Hermes** | 47 | 11.4% |
| **Spark** | 15 | 3.6% |
| **Nubo** (directo) | 10 | 2.4% |
| **Sentinel** | 9 | 2.2% |
| **Aegis** | 6 | 1.4% |
| Otros/legacy | 8 | 1.9% |

**Atlas** lidera por ser el agente de research usado en Daily AI News diariamente. **Zenith** segundo por todas las tareas de ingeniería y creación de archivos.

### Muestra de misiones recientes (últimas 20)

| Fecha | Mission ID | Descripción |
|-------|-----------|-------------|
| 2026-03-30 | m-20260330-140 | Buscar reuniones del día 30/03 en calendario y correo |
| 2026-03-30 | m-20260330-080 | Análisis exhaustivo de reunión de estrategia 28/03 |
| 2026-03-30 | m-20260330-549/708 | Documento de estrategia desde Google Docs → Zenith |
| 2026-03-30 | m-20260330-294/266 | Handoff con datos de reunión ya extraídos → Zenith |
| 2026-03-30 | m-20260330-572 | Buscar reunión de estrategia del sábado 28/03 |
| 2026-03-30 | m-20260330-764 | Debug: agentes no escriben result.md antes de ANNOUNCE_SKIP |
| 2026-03-30 | m-20260330-795 | Plan semanal de Santiago con prioridades por día |
| 2026-03-30 | m-20260330-824 | Revisar repositorio GSAP skills en GitHub |
| 2026-03-29 | m-20260329-954/614/635 | Búsqueda de notas de junta vía Maton API (Gmail) |
| 2026-03-29 | m-20260329-540/988 | Tests de handoff: simulación datos de reunión → Zenith |
| 2026-03-29 | m-20260329-162 | Handoff con datos ya extraídos → generación de formato |

---

## 2. Cron Jobs — Historial de Ejecuciones

### Soul Guard — Hourly Integrity Check (`5ff0c82d`)

**153 ejecuciones · 153 OK (100% success rate)**

Este es el cron job más confiable del sistema. Corre cada hora y verifica que `SOUL.md` de Nubo no esté corrupto. Cero fallos en el mes de marzo, lo que confirma que las protecciones post-incidente (2026-03-24) funcionan correctamente.

---

### Daily Auto-Update (`989b2ef7`) — 4:00 AM COT todos los días

**31 ejecuciones · 26 OK (83.9% success rate) · 5 errores**

| Fecha | Estado | Duración | Tokens | Error |
|-------|--------|----------|--------|-------|
| 2026-02-28 | ✅ ok | 185.7s | 33,675 | — |
| 2026-03-01 | ❌ error | 15.3s | 30,048 | Channel required: telegram/slack (delivery ambigua) |
| 2026-03-02 | ❌ error | 49.0s | 36,112 | Channel required (mismo error) |
| 2026-03-03 | ✅ ok | 202.4s | 13,857 | — |
| 2026-03-04 | ✅ ok | 791.4s | 33,025 | — |
| 2026-03-05 | ✅ ok | 34.2s | 30,333 | — |
| 2026-03-06 | ✅ ok | 114.1s | 39,210 | — |
| 2026-03-07 | ❌ error | 58.2s | 44,533 | Unknown error |
| 2026-03-08–14 | ✅ ok | var. | 30k–40k | — |
| 2026-03-14 | ❌ error | 114.4s | 40,529 | Unknown error |
| 2026-03-15–19 | ✅ ok | var. | 22k–39k | — |
| 2026-03-20 | ❌ error | 1232.1s | 0 | **TIMEOUT** (20+ min) |
| 2026-03-21–30 | ✅ ok | var. | 17k–42k | — |

**Observación:** El timeout de 2026-03-20 (1,232s = 20.5 min) es el fallo más grave del mes. Los errores de "channel required" del 01-02 Mar fueron fijados con la metodología de cron jobs (delivery.channel explícito). Los tokens varían entre 13k y 44k por ejecución.

---

### Daily Digest (`66d106f5`) — 7:00 AM COT

**26 ejecuciones · 19 OK (73.1% success rate) · 7 errores**

| Período | Estado | Tokens típicos | Duración típica |
|---------|--------|----------------|-----------------|
| Semana 1-2 Mar | Mixto (5 errores) | 11k–32k | 15–68s |
| Semana 3-4 Mar | Mayormente ok | 14k–37k | 56–84s |
| Semana 4+ Mar | ok consistente | 15k–28k | 56–85s |

**Errores observados:**
- `An unknown error occurred` (5 veces) — probablemente rate limits o timeouts de Gemini
- `Unsupported channel: telegram` (1 vez, 2026-03-03) — mismo bug de delivery channel
- Fallo de entrega Telegram (1 vez, mar temprano) — bot token temporal issue

**Tendencia:** Mejoró significativamente después de semana 2. La semana final (23-30 Mar) no tuvo errores.

---

### Daily AI News (`14f62757`) — 10:00 AM COT

**9 ejecuciones · 9 OK (100% success rate)**

| Fecha | Estado | Tokens |
|-------|--------|--------|
| 2026-03-22 | ✅ ok | var. |
| 2026-03-23 | ✅ ok | var. |
| 2026-03-24 | ✅ ok | var. |
| 2026-03-25 | ✅ ok | var. |
| 2026-03-26 | ✅ ok | var. |
| 2026-03-27 | ✅ ok | var. |
| 2026-03-28 | ✅ ok | var. |
| 2026-03-29 | ✅ ok | var. |
| 2026-03-30 | ✅ ok | var. |

Este job fue creado durante el mes de marzo (probablemente semana 3). 100% success rate desde que fue creado.

---

### Resumen Diario 8PM (`d98fb828`)

**30 ejecuciones · 29 OK (96.7% success rate) · 1 error**

Uno de los jobs más estables. El único fallo fue puntual.

---

### Weekly Planning Hermes (`5bf1dd0b`) — Lunes 9AM

**6 ejecuciones · 6 OK (100% success rate)**

Job estable. El fix de delivery channel (2026-03-23) fue aplicado y funcionó correctamente desde entonces.

---

### Weekly Report Hermes (`6cd68e6d`) — Sábados 7PM

**4 ejecuciones · 4 OK (100% success rate)**

---

### Self-Improve (`5449e8c0`) — 3:00 AM COT

**8 ejecuciones · 8 OK (100% success rate)**

---

### Gemini Meeting Notes (`c73ebd13`) ⚠️ DEPRECATED

**876 ejecuciones (!) · 872 OK · 4 errores**

Este job corría cada **15 minutos** y generó el mayor volumen de runs del sistema. Está marcado como DEPRECATED (reemplazado por N8N webhook) pero continuó ejecutándose hasta el 27/03. Sus 876 ejecuciones representan la mayoría del "ruido" de logs del mes. El archivo tiene **451 KB** de logs.

---

### Legacy jobs (jobs anteriores, ya inactivos)

| Job ID | Período activo | Runs | OK/Fail | Descripción |
|--------|---------------|------|---------|-------------|
| `ce21f424` | 02-22 Mar | 31 | 20/11 | Job legacy (pre-metodología, 35% fallo) |
| `3d7a68d7` | 10-21 Mar | 36 | 27/9 | Job con 25% fallo rate |
| `ae746734` | 17-21 Mar | 17 | 15/2 | Job con 12% fallo rate |

**Observación:** Los jobs legacy tenían tasas de error significativas (12-35%). Fueron reemplazados/desactivados durante la migración a la metodología de cron jobs.

---

## 3. Estado del Mission Finisher (Safety Net)

El `mission-finisher.sh` corre cada 5 minutos via system crontab. Datos del 31/03:

```
Ciclo típico:
  START
  ↓ Phase 1: Deliver pending missions → 0-1 entregadas (sistema limpio)
  ↓ Phase 2: Check orphan dispatched missions → 0 encontradas
  ↓ Phase 3: Check stuck handoff jobs → 0 stuck handoffs
  ↓ Phase 4: Check orphaned pending (dead watchdog) → 0 encontradas
  COMPLETE
  (Duración total: ~12-15 segundos por ciclo)
```

**Estado actual:** Sistema completamente limpio. Sin misiones huérfanas, sin handoffs stuck, sin watchdogs muertos. El finisher lleva corriendo en ciclos limpios desde las 05:35 del 31/03.

---

## 4. Uso de tokens por cron job

Datos promediados de las ejecuciones exitosas de marzo:

| Job | Tokens promedio por ejecución | Rango |
|-----|-------------------------------|-------|
| Daily Auto-Update | ~32,000 | 13k–44k |
| Daily Digest (7AM) | ~22,000 | 11k–37k |
| Resumen Diario 8PM | ~45,000 | 30k–80k |
| Daily AI News | ~18,000 | 14k–22k |
| Weekly Planning | ~5,000 | 4k–8k |
| Weekly Report | ~3,500 | 2k–5k |
| Self-Improve | ~4,500 | 3k–6k |
| Soul Guard | ~2,000 | 1k–3k |
| Meeting Notes (**DEPRECATED**) | ~12,000 | 10k–20k |

**Nota sobre tokens:** Los valores en `usage.input_tokens` son tokens brutos, que incluyen contexto del sistema. Los `total_tokens` en los logs parecen representar tokens únicos facturables (los valores son menores). La relación input:output es aproximadamente 100:1 (sesiones principalmente de lectura/análisis).

---

## 5. Memoria de agentes (MEMORY.md — resumen)

### Atlas — Research

- Fuentes monitoreadas: arxiv.org, papers.cool, HuggingFace, GitHub trending, HN, Anthropic/Google/OpenAI blogs, X.com (Karpathy, LeCun)
- Criterio: AI agents, LLMs, MLOps, infraestructura
- Ignorar: crypto/Web3 sin relevancia técnica
- Historial marzo: Daily AI News diario desde ~semana 3; pipeline tests del 27-28 Mar PASS

### Zenith — Engineering

- Stack conocido: OpenClaw Node.js binary, systemd, agentos.sqlite
- Alerts registradas: Meeting Report cron con 3 errores consecutivos (investigar)
- Evento 29/03: Creó script bash para monitorear tamaño de SOUL.md (alerta >11,500 chars)

### Flux — Automatizaciones

- Automatizaciones existentes: Calendar Sweeper, Daily Meeting Report, Daily Auto-Update
- Fricciones identificadas de Santiago: inbox Gmail sin filtrar, Slack con mensajes sin priorizar
- Draft-first rule siempre aplicada
- Herramientas: Gmail, Drive, Docs, Slack, ClickUp via Maton

### Hermes — Task Management

- Listas ClickUp: solo lista personal de Santiago
- Equipo Viva Landscape: David, Lucio, Rafael, Simón, Iván
- Integración con Chronos: lee `workspace-chronos/handoffs/` para action items

### Chronos — Calendar

- Timezone: America/Bogota (UTC-5, COT)
- Participantes frecuentes: David, Lucio, Rafael, Simón, Iván (Viva Landscape)
- Estructura: `briefs/` (pre-reunión), `summaries/` (post-reunión), `handoffs/` (para Hermes)

### Spark — Brainstorm

- Proyectos activos: OpenClaw, AgentOS v1, korFlow (detalles por confirmar)
- Frameworks preferidos: SCAMPER, Six Hats, 5 Whys, Jobs to Be Done
- Preferencias de Santiago: ideas concretas y accionables, velocidad de implementación

### Sentinel — QA

- Criterios de validación configurados con pesos: Completitud 25%, Precisión 25%, Seguridad 25%, Formato 15%, Concisión 10%
- Repair loop máximo: 2 reintentos antes de escalar a Nubo
- Historial: registrado en `validation.json` por misión

### Aegis — Assembler

- Templates conocidos: reporte técnico, resumen de reunión, weekly report
- Límite Telegram: 2,400 caracteres por mensaje final
- Output: `final_answer_telegram.md` → Nubo lo lee y envía

---

## 6. Errores recurrentes identificados

### Error: "Channel is required when multiple channels are configured"

**Frecuencia:** 2-3 veces (inicio de marzo)
**Jobs afectados:** Daily Auto-Update, otros jobs legacy
**Causa:** Slack fue agregado al sistema sin especificar `delivery.channel` explícitamente en los cron jobs. OpenClaw no sabe si entregar por Telegram o Slack.
**Fix:** Aplicado en metodología de cron jobs — `delivery.channel: "telegram"` obligatorio.
**Estado:** Resuelto.

### Error: "cron: job execution timed out"

**Frecuencia:** 2 veces (03-04 Mar, 20 Mar)
**Jobs afectados:** Legacy (ce21f424), Daily Auto-Update
**Causa probable:** Sesión de Gemini tomó demasiado tiempo. Timeout de cron en 120s (antes del fix).
**Fix:** Timeout aumentado a 300s para la mayoría de cron jobs.
**Estado:** Parcialmente resuelto (timeout de 20 Mar en daily auto-update fue anómalo).

### Error: "An unknown error occurred"

**Frecuencia:** ~12 veces en el mes (múltiples jobs)
**Causa:** Error genérico de OpenClaw/Gemini — puede ser rate limit 429, error de red, o fallo silencioso de Gemini Flash.
**Sin fix definitivo:** No hay logging suficiente para distinguir la causa exacta.
**Estado:** Sin resolver — ver issue P1 en doc 19.

### Error: "⚠️ ✉️ Message failed"

**Frecuencia:** 3 veces (02-Mar, job legacy)
**Causa:** Fallo de entrega vía Telegram (bot API timeout o error).
**Fix:** No requirió acción — las siguientes ejecuciones funcionaron.
**Estado:** Esporádico, no crítico.

---

## 7. Eventos clave del mes (timeline)

| Fecha | Evento |
|-------|--------|
| 2026-03-01 | ❌ Daily Auto-Update falla por delivery channel ambigua (primer día con Slack activo) |
| 2026-03-02 | ❌ Mismo error de channel. Daily Digest también falla por "Unsupported channel" |
| 2026-03-04 | ✅ **AgentOS v1 desplegado**. Rate limit Anthropic detectado a las ~14:36 UTC |
| 2026-03-05 | ✅ Jobs se estabilizan post-deployment |
| 2026-03-07 | ❌ Daily Auto-Update falla (unknown error) |
| 2026-03-09 | ✅ Daily Auto-Update tiene run más largo del mes: 102s |
| 2026-03-11 | ❌ Daily Auto-Update falla |
| 2026-03-14 | ❌ Daily Auto-Update falla |
| 2026-03-17 | ❌ Daily Auto-Update falla |
| 2026-03-19 | ✅ Rediseño de job-watchdog.sh + mission-finisher.sh + MC logs SSE |
| 2026-03-19 | ✅ System crontab agregado (mission-finisher + reaper) |
| 2026-03-20 | ❌ **Daily Auto-Update TIMEOUT** (1,232s = 20+ min). Fallo más grave del mes |
| 2026-03-21 | ✅ Sistema se recupera, jobs corren normal |
| 2026-03-22 | ✅ Daily AI News creado, primera ejecución exitosa |
| 2026-03-22 | ✅ Audio transcription migrado a Google Gemini 2.5 Flash |
| 2026-03-23 | ✅ Fix de Weekly Planning delivery channel (announce/telegram/1211573593) |
| 2026-03-24 | 🚨 **Incidente SOUL.md** — Zenith sobrescribió a 30 líneas, Nubo perdió reglas |
| 2026-03-25 | 🚨 **Incidente SOUL.md tamaño** — 19,510 chars > 12,000 limit → truncación |
| 2026-03-25 | ✅ SOUL.md comprimido a <11,500 chars + soul-guard.sh actualizado |
| 2026-03-26 | ✅ **Optimización de costos** — Gemini Flash en cron, workspace limpiado |
| 2026-03-27 | ⚠️ Gemini Meeting Notes cron: último run (luego deprecado/detenido) |
| 2026-03-28 | ✅ **Worker stabilization** — STALE_THRESHOLD 120s→300s, heartbeat a top-level |
| 2026-03-28 | ✅ Nubo migrado a google/gemini-3.1-pro-preview |
| 2026-03-29 | ✅ soul-size-monitor.sh creado (alerta si SOUL.md >11,500 chars) |
| 2026-03-30 | ✅ Múltiples misiones de reunión de estrategia (28/03) procesadas |
| 2026-03-31 | ✅ Sistema estable — 413 misiones sincronizadas, 0 errores en sync |

---

## 8. Estado de salud del sistema al 31/03/2026

| Componente | Estado | Observación |
|-----------|--------|-------------|
| Gateway OpenClaw | 🟢 OK | Corriendo, sin restarts recientes |
| Soul Guard (cron hourly) | 🟢 OK | 153/153 PASS, SOUL.md íntegro |
| Mission Finisher (cada 5min) | 🟢 OK | 0 pendientes, 0 stuck handoffs |
| Delivery Queue | 🟢 OK | Vacía, 0 failed |
| agentos.sqlite sync | 🟢 OK | 413/413 misiones, 0 errores |
| Daily Auto-Update (4AM) | 🟡 WARN | 16.1% fallo rate en el mes |
| Daily Digest (7AM) | 🟡 WARN | 26.9% fallo rate en el mes |
| Meeting Notes cron | 🔴 DEPRECATED | 876 runs innecesarios — desactivar |
| Gemini Flash silent failures | 🟡 WARN | Sin fix automático |
| OpenAI quota | 🔴 AGOTADA | Solo para audio, se usa Gemini |

---

## 9. Archivos de logs disponibles en el sistema

```
~/.openclaw/cron/runs/          # 37 archivos JSONL (37 job IDs)
  Tamaño mayor: c73ebd13 (451KB, 876 runs — DEPRECATED)
  Activos relevantes: 5ff0c82d (78KB), d98fb828 (61KB), 66d106f5 (38KB)

~/.openclaw/agentos/
  sync.log        # 198,374 líneas — sync del blackboard cada ~5s
  finisher.log    # 34,230 líneas — safety net cada 5min
  archiver.log    # 842 líneas — archivado de misiones antiguas
  agentos.sqlite  # 524KB + WAL 2.3MB — BD principal

~/.openclaw/agentos/missions/   # 402 directorios (m-YYYYMMDD-NNN)
  Cada uno contiene: meta.json, jobs/{j-agente-NNN}/result.md etc.

~/.openclaw/workspace/scripts/
  update-watchdog.log           # Minor warnings, sin fallos fatales
```

---

## 10. Volumen de datos generados (estimado)

| Fuente | Tamaño estimado | Entradas |
|--------|----------------|---------|
| cron/runs/*.jsonl (total) | ~750 KB | ~1,380 run entries |
| agentos/sync.log | ~8 MB | 198,374 líneas |
| agentos/finisher.log | ~2 MB | 34,230 líneas |
| missions/ (todos los archivos) | ~15–25 MB | 402 directorios |
| agentos.sqlite + WAL | ~2.8 MB | — |
| **Total logs del sistema** | **~30–40 MB** | — |
