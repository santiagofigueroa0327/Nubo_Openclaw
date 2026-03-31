# Baseline Audit Report — 2026-03-31 08:02 UTC

## Estado general: ADVERTENCIAS

---

## Cron Jobs

- **c73ebd13 (zombie):** DESACTIVADO — No aparece en `openclaw cron list`. Sin acción requerida en este paso.
- **Total crons activos confirmados:** 9

| ID (prefijo) | Nombre | Schedule | Modelo | Estado |
|---|---|---|---|---|
| `5449e8c0` | Self-Improve 3AM COT | `0 3 * * *` | gemini-2.5-flash | running (disparado hace <1m al momento de auditoría) |
| `5ff0c82d` | Soul Guard — Hourly | `0 * * * *` | gemini-2.5-flash | ok ⚠️ NO DOCUMENTADO EN MEMORIA |
| `989b2ef7` | Daily Auto-Update 4AM | `0 4 * * *` | gemini-2.5-flash | ok (ver tokens) |
| `66d106f5` | Daily Digest 7AM | `0 7 * * *` | gemini-2.5-flash | ok |
| `14f62757` | Daily AI News 10AM | `0 10 * * *` | gemini-2.5-flash | ok |
| `d98fb828` | Resumen Diario 8PM COT | `0 20 * * *` | gemini-2.5-flash | ok |
| `6cd68e6d` | Hermes Weekly Report Sab 19h | `0 19 * * 6` | gemini-2.5-flash | ok |
| `7d9d2374` | Weekly Health Check Dom 20h | `0 20 * * 0` | gemini-2.5-flash | ok ⚠️ NO DOCUMENTADO EN MEMORIA |
| `5bf1dd0b` | Hermes Weekly Planning Lun 9h | `0 9 * * 1` | gemini-2.5-flash | ok |

**⚠️ Discrepancia:** `5ff0c82d` (Soul Guard Hourly) y `7d9d2374` (Weekly Health Check) son cron jobs activos no documentados en el inventario de MEMORY.md.

---

## Agentes

- **Total agentes activos:** 9 / 9 — COMPLETO
- Todos los workspaces accesibles y presentes en `~/.openclaw/`

| Agente | Workspace | Modelo | Bindings Telegram |
|---|---|---|---|
| `main` (Nubo) | `~/.openclaw/workspace` | google/gemini-3.1-pro-preview | Telegram default + zenith binding, Slack default |
| `zenith` | `~/.openclaw/workspace-zenith` | anthropic/claude-opus-4-6 | ninguno |
| `atlas` | `~/.openclaw/workspace-atlas` | google/gemini-2.5-flash | ninguno |
| `chronos` | `~/.openclaw/workspace-chronos` | google/gemini-2.5-flash | ninguno |
| `spark` | `~/.openclaw/workspace-spark` | google/gemini-2.5-flash | ninguno |
| `flux` | `~/.openclaw/workspace-flux` | google/gemini-2.5-flash | ninguno |
| `hermes` | `~/.openclaw/workspace-hermes` | google/gemini-2.5-flash | ninguno |
| `sentinel` | `~/.openclaw/workspace-sentinel` | google/gemini-2.5-flash | ninguno |
| `aegis` | `~/.openclaw/workspace-aegis` | google/gemini-2.5-flash | ninguno |

---

## SOUL.md de Nubo

- **Tamaño actual:** 11,349 caracteres  ⚠️ ADVERTENCIA: solo 151 chars de margen hasta el límite de 11,500
- **Regla de delegación presente:** SÍ — `## 🔴 SYSTEM INSTRUCTION` al inicio + `## ⛔ REGLA CARDINAL` con checkpoint obligatorio, tabla de agent registry, y ejemplos concretos
- **Soul-guard activo:** SÍ — existe en `~/.openclaw/agentos/bin/soul-guard.sh`
  - ⚠️ Nota: la memoria indica `workspace/scripts/soul-guard.sh` — la ubicación real es `agentos/bin/soul-guard.sh`

---

## agentos.sqlite

### Misiones por estado

| Status | Count |
|---|---|
| archived | 412 |
| dispatched | 2 |

### Misiones stuck (>30min en dispatched): **1 CRÍTICA**

| Mission ID | Creada (UTC) | Antigüedad | Mensaje |
|---|---|---|---|
| `m-20260329-988` | 2026-03-29 02:43 | ~29 horas | TEST DE HANDOFF: Simula que encontraste notas de una reunion... |
| `m-20260331-000` | 2026-03-31 07:53 | ~9 min (reciente) | Ejecuta el ciclo de auto-mejora completo... (Self-Improve cron activo) |

**⚠️ NOTA TÉCNICA:** La query del prompt usaba `strftime('%s','now')` para comparar contra `created_at`, pero este campo está almacenado en **milisegundos** (no segundos). La comparación devolvió 0 resultados erróneamente. La misión `m-20260329-988` tiene **29 horas de antigüedad** y es definitivamente stuck.

---

## Mission Control

- **Servicio systemd:** ACTIVO — `active (running)` desde 2026-03-27 19:46:55 UTC (3 días uptime)
- **WorkingDirectory:** `/home/moltbot/nubo-dashboard/mission-control-review`
- **Puerto respondiendo:** SÍ — `127.0.0.1:3010` (next-server v16.1.6)
  - ⚠️ Nota: la memoria indica port 3010, pero la query original buscaba 3000/8080 — ajustar queries futuras a port 3010
- **.next/ compilado:** SÍ — `/home/moltbot/nubo-dashboard/mission-control-review/.next/`
- **Puerto 3000:** Docker proxy (`docker-proxy` root, since Mar 28) — unrelated to MC, contenedor `172.18.0.5:3000`
- **MC Stagnation check:** Log reciente muestra `stuck=0 noActivity=1` (normal, sin misiones activas visibles para MC)

---

## Cron tokens recientes

### Daily Auto-Update (989b2ef7) — último run: 2026-03-30 04:00 UTC
- **Input tokens:** 208,178 (ALTO — ~3x el run anterior)
- **Output tokens:** 2,011
- **Total session tokens:** 35,800
- **Estado:** ok (entregado) ⚠️ con error `ENOTEMPTY: directory not empty` al intentar actualizar openclaw via npm — error recurrente (también ocurrió el run anterior del 2026-03-29)
- **Modelo:** gemini-2.5-flash / google

### Resumen Diario 8PM (d98fb828) — último run: 2026-03-31 01:00 UTC
- **Input tokens:** 59,623
- **Output tokens:** 1,989
- **Total session tokens:** 17,237
- **Estado:** ok (entregado)
- **Modelo:** gemini-2.5-flash / google

---

## update-watchdog.log

```
[openclaw-update-watchdog] Could not get service start time, skipping.
[openclaw-update-watchdog] Could not get service start time, skipping.
(repetido en todos los entries recientes)
```
**⚠️ ADVERTENCIA:** El update-watchdog falla consistentemente al obtener el service start time. Esto puede ser benigno (el watchdog de actualización busca el servicio de openclaw para comparar timestamps) pero debe investigarse.

---

## cost-guard.sh

- **Estado:** NO EXISTE — a crear en Prompt 2 (confirma estado pre-intervención correcto)
- Ruta esperada: `~/.openclaw/workspace/scripts/cost-guard.sh`

---

## Discrepancias con el repositorio / estado esperado

1. **Misión stuck `m-20260329-988`** — 29h en estado `dispatched`, TEST DE HANDOFF nunca completado. Debe limpiarse con `/reap` o archivarse antes de continuar.

2. **SOUL.md a 11,349/11,500 chars** — margen crítico de solo 151 chars. Cualquier edición pequeña puede superar el límite. Considerar comprimir antes o durante Prompt 2.

3. **2 cron jobs no documentados en inventario de memoria:**
   - `5ff0c82d` Soul Guard Hourly — existe y corre cada hora
   - `7d9d2374` Weekly Health Check Sunday 8PM — existe

4. **Ubicación de soul-guard.sh incorrecta en memoria** — documentado como `workspace/scripts/soul-guard.sh`, real: `agentos/bin/soul-guard.sh`

5. **Daily Auto-Update con error npm recurrente** — `ENOTEMPTY: directory not empty` al actualizar openclaw. No bloquea la entrega pero openclaw nunca se actualiza via este cron.

6. **Input tokens Daily Auto-Update subiendo** — 71K → 208K tokens en 2 runs consecutivos. Patrón de costo preocupante, debe monitorearse con cost-guard.

7. **Port 3000:** Docker proxy activo (root) — no es MC, pero consumo de recursos a confirmar si es intencional.

---

## Acción tomada en este paso

- **c73ebd13:** No estaba activo, no fue necesario desactivarlo.
- **Ninguna modificación al sistema** — auditoría de solo lectura ejecutada.

---

## Evaluación de condiciones de aprobación para Prompt 2

| # | Condición | Estado |
|---|---|---|
| 1 | Reporte P1-baseline-report.md existe y completo | ✅ |
| 2 | c73ebd13 NO aparece como activo | ✅ |
| 3 | 9 agentes presentes con workspaces accesibles | ✅ |
| 4 | SOUL.md < 11,500 caracteres (actual: 11,349) | ✅ |
| 5 | agentos.sqlite con 0 misiones stuck | ❌ — 1 misión stuck: `m-20260329-988` (29h) |

**⛔ CONDICIÓN 5 FALLA — Consultar antes de continuar al Prompt 2.**

**Acción recomendada:** Ejecutar `/reap` o `agentosctl mission update m-20260329-988 --status archived` para limpiar la misión stuck antes de proceder.
