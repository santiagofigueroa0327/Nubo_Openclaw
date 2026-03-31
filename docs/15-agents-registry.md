# 15 — Agent Registry (Estado actual: Marzo 2026)

> Última actualización: 2026-03-31 (P5 — AgentOS v2). Este documento describe los 6 agentes activos del sistema. Spark, Sentinel y Aegis fueron consolidados como skills en P5.

---

## Visión general

El sistema tiene **6 agentes** organizados en dos niveles (AgentOS v2, 2026-03-31):

| Nivel | Agentes | Propósito |
|-------|---------|-----------|
| Orquestador | **Nubo (main)** | Único agente que habla con Santiago via Telegram. Delega TODO. |
| Workers | atlas, zenith, chronos, flux, hermes | Ejecutan tareas especializadas. Responden `ANNOUNCE_SKIP` (invisible para Santiago). |

> **P5 — Consolidación:** Spark → skill `creative-thinking` (Atlas), Sentinel → skill `qc-check` (Nubo), Aegis → skill `assembly` (Nubo). Ver `docs/SKILL_LIFECYCLE.md`.

---

## 1. Nubo (main) — ☁️ Orquestador

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-3.1-pro-preview` (sin fallbacks) |
| Temperature | 0.5 |
| Workspace | `~/.openclaw/workspace` |
| AgentDir | `~/.openclaw/agents/main/agent` |
| Herramientas | exec, process, read, write, sessions_* |
| Subagentes permitidos | atlas, zenith, chronos, flux, hermes |
| Sandbox | off |

**Rol:** Tech EA de Santiago (CTO, Viva Landscape & Design). Único punto de contacto por Telegram. Orquesta, delega y entrega resultados.

**Lo que hace:**
- Recibe mensajes de Santiago via Telegram
- Evalúa si la tarea requiere delegación o respuesta directa
- Ejecuta el protocolo AgentOS de 5 pasos para cada delegación
- Consolida resultados y los envía a Santiago

**Lo que NO hace:**
- No crea archivos, scripts ni código (eso es Zenith)
- No investiga ni hace búsquedas web profundas (eso es Atlas)
- No ejecuta comandos fuera de la lista permitida
- No trabaja entre 00:00–07:00 COT (quiet hours)

**Routing de delegación:**

| Si la tarea pide... | Agente |
|---|---|
| Investigación, datos, búsquedas web | ATLAS |
| Código, HTML, debug, scripts, arquitectura | ZENITH |
| Reuniones, notas, calendario | CHRONOS |
| Brainstorm, ideas, naming, estrategia | ATLAS (skill: creative-thinking) |
| Cron, automation, email, Gmail, skills | FLUX |
| ClickUp, tareas, planning semanal | HERMES |
| Validación QA (solo high-risk) | NUBO (skill: qc-check) |
| Ensamblaje final (multi-agente complejo) | NUBO (skill: assembly) |

**Comandos exec permitidos (lista completa):**
```
dispatch-job, agentosctl, telegram-notify, job-watchdog.sh,
mission-finisher.sh, reaper, soul-guard.sh, soul-backup.sh,
output-validator.sh, log-failure.sh, python3 scripts/*.py (solo monitoreo)
cat, echo, sleep, ls, wc, date (diagnóstico)
```

**PROHIBIDO:** `pm2`, `npm`, `pip`, `curl`, `wget`, `node`, `python3` (excepto scripts listados)

---

## 2. Atlas — 🔍 Research & Data

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-atlas` |
| Herramientas | exec, read, write, web_search, web_fetch |
| Sessions | DENEGADAS (no puede spawnar subagentes) |

**Cuándo:** Investigación, análisis de datos, búsquedas web, verificación de URLs, Daily AI News.

**Output contract:**
- `result.md` con 3 hallazgos + 3 acciones + URLs verificadas
- Heartbeat obligatorio cada 2-3 tool calls
- Máximo 3 web_fetch por job (contexto saturado)
- Nunca inventar datos — reportar "no data" si todo falla

**Anti-patrones:**
- NUNCA web_fetch en `*.google.com` (siempre 401 — usar Maton API)
- Máx 3 web_fetch por job
- Si lleva >8 min → escribir result.md parcial y terminar

---

## 3. Zenith — ⚡ Heavy Engineering

| Campo | Valor |
|-------|-------|
| Modelo | `anthropic/claude-opus-4-6` |
| Fallbacks | `google/gemini-2.5-pro`, `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-zenith` |
| Herramientas | exec, read, write, edit, process, web_search, web_fetch |
| Sessions | DENEGADAS |

**Cuándo:** Código >50 LOC, debug, arquitectura, HTML, scripts bash/python, security reviews, cambios estructurales.

**Estándares de calidad (PR-Quality):**
- Cambios pequeños y claros con puntos de rollback
- Validación de inputs y manejo de errores
- Logs útiles sin secretos
- Tests cuando aplique
- `set -euo pipefail` en bash, typing en Python

**Autonomía:**
- Alta para bug fixes y scripts nuevos
- Confirmar primero para: systemd, openclaw.json, producción

**⚠️ Nota crítica (Incidente 2026-03-24):**
Zenith sobrescribió `SOUL.md` de Nubo reduciéndolo de 302 a 30 líneas. Nubo perdió todas las reglas de delegación y ejecutó tareas directamente. Ahora tiene regla explícita: NUNCA sobrescribir `/workspace/SOUL.md`.

**Reglas Opus (costo):**
- Ejecutar directo, sin deliberar
- Primera decisión de diseño = decisión final
- Scope estricto — exactamente lo que pide la spec
- Heartbeat primero, ejecuta, entrega

---

## 4. Chronos — ⏰ Calendar & Meetings

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-chronos` |
| Herramientas | exec, read, write, web_search, web_fetch |
| Sessions | DENEGADAS |

**Cuándo:** Agenda diaria, pre-meeting briefs, post-meeting summaries, action items.

**Triggers:**
- Cron 07:00 COT (daily brief)
- Cron 12:00 COT (midday update)
- Event-driven: 30 min antes / 10 min después de reunión

**Integración:**
- Calendar: Maton API → `https://gateway.maton.ai/google-calendar/...`
- Gmail: Maton API → `https://gateway.maton.ai/google-mail/...`
- Handoff a Hermes: action items de reuniones → `workspace-chronos/handoffs/`

**Regla crítica:** NUNCA reportar eventos de calendario sin una llamada exitosa (HTTP 200) a Maton Calendar API. Si la API falla → reportar error, no inventar.

---

## ~~5. Spark~~ → Skill `creative-thinking` (Atlas) — P5 2026-03-31

Spark fue consolidado como skill. Toda su lógica está disponible en:
`~/.openclaw/workspace-atlas/skills/creative-thinking/SKILL.md`

Dispatch: `dispatch-job atlas "... usar skill creative-thinking"`

---

## 6. Flux — ⚡ Cron & Automation Specialist

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-flux` |
| Herramientas | exec, read, write, web_search, web_fetch |
| Sessions | DENEGADAS |

**Especialidades:**
1. **Cron jobs** — Metodología completa en `workspace/cron-methodology/`
2. **Skills** — Operación diaria en `workspace/skills-methodology/`
3. **Gmail** — via Maton API (GMAIL_TEMPLATES.md)
4. **Automatizaciones** — drafts primero, nunca ejecutar sin `SEND_APPROVED: true`

**Defaults para cron jobs:**
- Timezone: `America/Bogota`
- sessionTarget: `isolated`
- delivery.channel: `telegram` (NUNCA `"last"` en isolated)
- delivery.to: `1211573593`
- model: `google/gemini-2.5-flash`

**Draft-first rule:** Todo draft primero. Ejecutar solo con aprobación explícita de Santiago.

---

## 7. Hermes — 📬 Task Management

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-hermes` |
| Herramientas | exec, read, write, web_search, web_fetch |
| Sessions | DENEGADAS |

**Cuándo:** ClickUp, planificación semanal, reportes, conversión de action items.

**Triggers regulares:**
- Daily 07:00: top 5 prioridades del día
- Lunes 09:00: weekly planning (5 días)
- Sábado 19:00: weekly report

**Integración:** Recibe handoffs de Chronos (action items) → crea propuestas de tareas ClickUp.

**Regla:** No crear tareas automáticamente sin confirmación de Santiago.

---

## ~~8. Sentinel~~ → Skill `qc-check` (Nubo) — P5 2026-03-31

Sentinel fue consolidado como skill. Criterios QA, ponderaciones y validation.json preservados en:
`~/.openclaw/workspace/skills/qc-check/SKILL.md`

---

## ~~9. Aegis~~ → Skill `assembly` (Nubo) — P5 2026-03-31

Aegis fue consolidado como skill. Templates Telegram y flujo de ensamblaje preservados en:
`~/.openclaw/workspace/skills/assembly/SKILL.md`

---

## Regla universal: Grounding Contract

Todos los agentes tienen este contrato:
1. **NUNCA inventar datos.** Tool call falla → reportar el fallo exacto.
2. **Citar fuentes.** Cada claim fáctico requiere tool call result, URL o referencia de archivo.
3. **Declarar incertidumbre.** Si los datos son parciales → decirlo explícitamente.
4. **Preferir "Sin datos" sobre datos inventados.** `FAILED: No data obtained` es correcto. Datos inventados es FAIL.
5. **Si TODOS los tools fallan** → escribir en result.md: `FAILED: No data obtained. Failed tools: [lista]. Errors: [detalles].`

---

## Google URL Block (todos los agentes)

```
NUNCA usar web_fetch en *.google.com
(docs.google.com, calendar.google.com, drive.google.com, mail.google.com)
Siempre retornan 401.
Usar Maton API: https://gateway.maton.ai/{service}/...
Auth: Authorization: Bearer $MATON_API_KEY
```
