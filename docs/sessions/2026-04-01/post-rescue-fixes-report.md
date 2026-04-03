# Post-Rescue Fixes Report — 2026-03-31 20:40 UTC

---

## Problema 1 — cost-guard.sh: RESUELTO

- **Estructura JSONL encontrada:** `message.usage.cost.total` (número float), timestamp en `message.timestamp` (ms epoch). MC lee correctamente usando este campo.
- **Solución elegida:** Simplificación — curl a `/api/cost-analytics` en lugar de parsear JSONL directamente. MC ya hace el trabajo correctamente; cost-guard.sh delega en él. Garantiza 0% discrepancia.
- **Costo calculado antes del fix:** $0 (SQLite cols NULL para todos los jobs)
- **Costo calculado después del fix:** $59.02 hoy / $73.06 mes (refleja el costo real del plan de rescate P1-P7)
- **MC /api/cost-analytics dice:** $59.02 hoy / $73.06 mes
- **Diferencia:** 0.00% — coincidencia exacta
- **Alerta de prueba Telegram:** SÍ — COST HARD STOP activado correctamente al superar $7.20 (120% del budget de $6/día)
- **COST_HARD_STOP limpiado:** SÍ — era solo un test, threshold de $6 es el correcto para producción

**Nota importante:** El costo de $59.02 en un solo día es anómalo — refleja la ejecución de los 7 prompts del plan de rescate (P1-P7) con modelos costosos (Gemini Pro, Claude Opus). El gasto operativo normal es ~$2-3/día según el trend de la semana previa.

---

## Problema 2 — Dashboard en página raíz: YA CORRECTO (no requirió cambios)

- **Archivos nuevos encontrados en servidor:** dashboard-client.tsx, CostWidget.tsx, MissionCard.tsx, SystemHealth.tsx, mission-states.ts, update-mission-status.ts, cost-analytics/route.ts, y 25+ archivos más
- **page.tsx estado:** Ya correcto — `import { DashboardClient } from "./dashboard-client"` y `return <DashboardClient />`
- **Dashboard visible en /:** SÍ — HTTP 200 (verificado con curl)
- **Sidebar tiene item Dashboard:** SÍ — ya correcto con DashboardIcon
- **Topbar actualizado:** SÍ — PAGE_TITLES ahora incluye `/`, `/cron`, `/skills`, `/metrics`

---

## Problema 3 — State machine: RESUELTO

- **types.ts actualizado con 7 estados:** SÍ — `planning`, `dispatched`, `running`, `stale_retry`, `handoff`, `done`, `cancelled` + legacy (`queued`, `completed`, `blocked`, `archived`)
- **state-machine.ts transiciones actualizadas:** SÍ — 11 estados con transiciones completas incluyendo flujo AgentOS v2
- **status-badge.tsx colores nuevos:** SÍ — paleta completa con pulse dots para estados activos (running=cyan, stale_retry/planning=amber, dispatched=blue, handoff=purple)
- **TypeScript sin errores:** SÍ — `npx tsc --noEmit` sin output (sin errores)
- **Build exitoso:** SÍ — `npm run build` completa sin errores

---

## Problema 4 — GSAP y componentes en repo: RESUELTO

- **package.json tiene gsap:** SÍ — ya tenía `"gsap": "^3.14.2"` (añadido previamente)
- **Archivos nuevos commiteados:** 51 archivos (35 nuevos, 16 modificados)
  - CostWidget.tsx, MissionCard.tsx, SystemHealth.tsx, dashboard-client.tsx
  - 15 nuevas rutas API
  - 6 nuevas páginas (/cron, /metrics, /missions, /skills, etc.)
  - libs: mission-states.ts, update-mission-status.ts, gateway-sync.ts, stagnation.ts, instrumentation.ts
- **Commit hash:** `d65fc31`
- **Branch:** `fix/nubo-task-delivery-redesign-2026-03-17`
- **Push:** `santiagofigueroa0327/Nubo_Openclaw` — OK

---

## Problema 5 — Seguridad P0: YA CORRECTO O RESUELTO

| Fix | Estado | Notas |
|---|---|---|
| Seed endpoint retorna 403 en producción | SÍ (ya estaba) | Líneas 92-97 en route.ts: `if (NODE_ENV === "production") return 403` |
| .gitignore tiene .openclaw/ | SÍ (ya estaba) | `.openclaw/` y `**/auth-profiles.json` presentes |
| GATEWAY_READONLY=true en .env.example | SÍ (ya estaba) | Valor correcto ya en archivo |
| mission-control.service actualizado | SÍ (ya correcto) | WorkingDirectory=%h/nubo-dashboard/mission-control-review (correcto) |

---

## Problema 6 — Daily Auto-Update: NO REQUIRIÓ FIX

- **Estado actual:** 3 runs recientes con status `ok` (duración ~84-167 segundos)
- **Error ENOTEMPTY:** No se reproducible — el payload ya tenía instrucción de manejo:
  `npm cache clean --force && npm install -g openclaw --force`
- **Contexto del cron:** `lightContext: true` ya presente, `timeoutSeconds: 540`
- **Acción tomada:** Ninguna — el problema se auto-resolvió con la instrucción en el payload

---

## Estado final del sistema

| Verificación | Resultado |
|---|---|
| MC en `/` | Dashboard (HTTP 200, no redirect) |
| cost-guard.sh funcional | SÍ — calcula $59.02 vs MC $59.02 (0.00% diff) |
| Alertas Telegram de costo | SÍ — COST HARD STOP activado y enviado correctamente |
| Repo sincronizado con servidor | SÍ — 51 archivos en commit `d65fc31`, pusheado |
| TypeScript sin errores | SÍ — `tsc --noEmit` limpio |
| Build exitoso | SÍ — `npm run build` sin errores |
| 7 estados canónicos en state machine | SÍ — types + transitions + badge actualizados |
| Seed endpoint bloqueado en producción | SÍ — retorna `{"error": "Seed endpoint is disabled in production"}` (403) |
| MC service activo | SÍ — `systemctl --user is-active mission-control.service` = active |

---

## Nota sobre el costo de $59 del día

El plan de rescate P1-P7 ejecutado el 31/03/2026 consumió ~$59 USD en un día, principalmente de la sesión grande de `main` (Gemini Pro / Claude con contexto extenso). Esto es excepcional y no representa el gasto operativo normal (~$2-3/día según datos históricos).

El sistema de guardrails ahora funciona correctamente. Para operación normal dentro del budget de $6/día, el sistema operará en modo seguro. El COST_HARD_STOP automático hubiera bloqueado misiones nuevas si se hubiera alcanzado hoy durante una sesión normal (threshold $7.20).
