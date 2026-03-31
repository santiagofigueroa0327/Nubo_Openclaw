# 15 — Agent Registry (Estado actual: Marzo 2026)

> Última actualización: 2026-03-31. Este documento describe los 9 agentes del sistema, sus modelos, herramientas, workspaces y protocolos operativos.

---

## Visión general

El sistema tiene **9 agentes** organizados en dos niveles:

| Nivel | Agentes | Propósito |
|-------|---------|-----------|
| Orquestador | **Nubo (main)** | Único agente que habla con Santiago via Telegram. Delega TODO. |
| Workers | atlas, zenith, chronos, spark, flux, hermes, sentinel, aegis | Ejecutan tareas especializadas. Responden `ANNOUNCE_SKIP` (invisible para Santiago). |

---

## 1. Nubo (main) — ☁️ Orquestador

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-3.1-pro-preview` (sin fallbacks) |
| Temperature | 0.5 |
| Workspace | `~/.openclaw/workspace` |
| AgentDir | `~/.openclaw/agents/main/agent` |
| Herramientas | exec, process, read, write, sessions_* |
| Subagentes permitidos | atlas, zenith, chronos, spark, flux, hermes, sentinel, aegis |
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
| Brainstorm, ideas, naming, estrategia | SPARK |
| Cron, automation, email, Gmail, skills | FLUX |
| ClickUp, tareas, planning semanal | HERMES |
| Validación QA (solo high-risk) | SENTINEL |
| Ensamblaje final (multi-agente complejo) | AEGIS |

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

## 5. Spark — ✨ Brainstorm & Strategy

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Fallbacks | `openai/gpt-4o`, `google/gemini-2.5-pro` |
| Workspace | `~/.openclaw/workspace-spark` |
| Herramientas | read, write, web_search, web_fetch (NO exec) |
| Sessions | DENEGADAS |

**Cuándo:** Ideas, naming, estrategia, SCAMPER, Six Hats, métricas de impacto.

**Output:** Ideas rankeadas por factibilidad × impacto, plan de implementación top 3.

**Autonomía:** Alta para brainstorming. NUNCA ejecuta cambios (solo propuestas).

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

## 8. Sentinel — 🛡️ QA Validator

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-sentinel` |
| Herramientas | **read, write SOLO** (no exec, no web) |
| Sessions | DENEGADAS |

**Cuándo usar:** Solo para high-risk: producción, emails masivos, cambios de infra. NO para research ni brainstorm.

**Criterios de validación (0-100 cada uno):**
- Completitud (completeness)
- Precisión (accuracy)
- Formato (format)
- Seguridad (security) — si FAIL → veredicto automático FAIL
- Concisión (conciseness)

**PASS si:** weighted_score ≥ 70 AND security != FAIL

**Hallucination Detection:** Si result.md tiene claims fácticos sin evidencia en `evidence/` → accuracy_score = 0 → FAIL.

**Repair loop:** Max 2 reintentos. En intento 3 → escalar a Nubo.

**Output:** `validation.json` + `result.md` propio.

---

## 9. Aegis — 🏛️ Final Assembler

| Campo | Valor |
|-------|-------|
| Modelo | `google/gemini-2.5-flash` |
| Workspace | `~/.openclaw/workspace-aegis` |
| Herramientas | **read, write SOLO** |
| Sessions | DENEGADAS |

**Cuándo usar:** Solo en misiones multi-agente complejas que necesitan pulido final. No en tareas simples.

**Proceso:** Lee todos los result.md → verifica validation.json (PASS) → ensambla narrative → genera `final_answer_telegram.md`.

**Spanish Gate:** TODO output para Telegram DEBE estar en español.

**Output format (`final_answer_telegram.md`):**
```
[emoji] *Título de la misión*

[Resumen 1-2 líneas]

*Resultado:*
[bullet points]

*Next steps:*
- [acción concreta]

*Participaron:* Agent1, Agent2
_Preparado por Aegis_ 🏛️
```

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
