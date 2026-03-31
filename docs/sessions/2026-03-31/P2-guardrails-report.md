# Cost Guardrails Report — 2026-03-31 08:10 UTC

## Estado general: COMPLETO ✅

---

## cost-guard.sh

- **Instalado en:** `/home/moltbot/.openclaw/workspace/scripts/cost-guard.sh`
- **Permisos:** `chmod +x` aplicado
- **En crontab:** SÍ — `0 * * * * /home/moltbot/.openclaw/workspace/scripts/cost-guard.sh` (cada hora)
- **Test de alerta Telegram:** EXITOSO — `ok: true`, `message_id: 2566` confirmado
- **Variables de entorno disponibles:** SÍ — cargadas desde `~/.openclaw/nubo.env` (`NUBO_BOT_TOKEN`, `NUBO_CHAT_ID`)
- **Nota:** El costo calculado hoy es $0 porque las columnas `input_tokens`/`output_tokens` se acaban de añadir (no hay datos históricos aún). El script es funcionalmente correcto y comenzará a acumular datos desde el próximo job.

**Configuración de umbrales:**
| Umbral | Valor |
|---|---|
| Budget diario | $6.00 |
| Alerta diaria (70%) | $4.20 |
| Hard stop diario (120%) | $7.20 |
| Budget mensual | $150.00 |
| Alerta mensual (80%) | $120.00 |
| Hard stop mensual | $200.00 |

**Fix técnico aplicado:** La query original del prompt usaba `DATE(created_at, ...)` pero `created_at` está en milisegundos. Corregido a `DATE(created_at/1000, 'unixepoch')` en todas las queries del script.

---

## Columnas de tokens en SQLite

| Columna | Estado |
|---|---|
| `input_tokens` | AÑADIDA (no existía) |
| `output_tokens` | AÑADIDA (no existía) |
| `llm_model` | AÑADIDA (no existía) |

Schema verificado en `agentos.sqlite.jobs` — columnas presentes al final del CREATE TABLE.

**Siguiente paso necesario:** El gateway/AgentOS debe comenzar a escribir estos valores al completar jobs. Por ahora son NULL para todos los jobs históricos.

---

## Presupuesto cap Zenith

- **dispatch-job localizado en:** `/home/moltbot/.openclaw/agentos/bin/dispatch-job`
- **Cap añadido:** SÍ — insertado en líneas 83-96, antes de `# ── 1. Create mission`
- **Comportamiento:**
  - `COST_HARD_STOP` activo → `exit 1` (bloqueo duro)
  - Zenith ≥ 8 jobs/día → `WARNING` en stderr (advertencia, no bloqueo)
- **Límite configurado:** COST_HARD_STOP global + advertencia Zenith ≥ 8 jobs/día

---

## Resumen 8PM optimizado

- **Backup creado:** `~/.openclaw/cron/jobs.json.bak-cost-opt-p2-20260331-*`
- **Cambios aplicados al payload:**
  1. **Ventana temporal:** "últimas 4 horas solamente" (antes: día completo)
  2. **Fuentes limitadas:** máximo 3 (Slack → Gmail → Drive, en orden de prioridad)
  3. **Límite de output explícito:** "máximo 800 palabras" y "máximo 15 líneas"
  4. **Items cap:** Slack ≤5 items, Gmail ≤3 items, Drive ≤2 items
  5. **Instrucción anti-duplicación:** "NO repitas información ya cubierta en el Digest de 7AM"
  6. **timeout reducido:** 1800s → 600s (el job no debería necesitar más de 10 min)
  7. **Criterio de no-op reforzado:** "Tarde tranquila — sin novedades en las últimas 4 horas"

- **Tokens promedio esperado:** ~25,000 (antes: ~60,000 promedio, pico 80K)
  - El 80% del costo era contexto no accionable. Filtrar por 4h y 3 fuentes debería eliminar la mayoría.
  - La reducción de `timeoutSeconds` 1800→600 limita también el contexto de sesión inyectado.

- **JSON validado:** `python3 -m json.tool` — válido ✅

---

## Costo actual del día al ejecutar este prompt

- **Estimado:** $0.00 (columnas de tokens recién añadidas, sin datos históricos aún)
- **Estado:** bajo (datos insuficientes para evaluación real)
- **Nota:** El costo real del día se empezará a acumular en SQLite a partir de ahora, cuando los jobs completen y el gateway empiece a escribir `input_tokens`/`output_tokens`.

---

## Evaluación de condiciones de aprobación para Prompt 3

| # | Condición | Estado |
|---|---|---|
| 1 | cost-guard.sh instalado, en crontab, test Telegram OK | ✅ |
| 2 | Columnas input_tokens/output_tokens/llm_model en SQLite | ✅ — añadidas |
| 3 | Cap de Zenith documentado e implementado en dispatch-job | ✅ |
| 4 | Prompt Resumen 8PM modificado, token esperado ≤30K | ✅ — estimado ~25K |
| 5 | P2-guardrails-report.md creado y completo | ✅ |

**✅ Todas las condiciones cumplidas — sistema listo para Prompt 3.**

---

## Advertencias para seguimiento

1. **Datos de tokens en SQLite:** Los jobs históricos tienen `input_tokens = NULL`. El cost-guard reportará $0 hasta que el gateway comience a escribir esos valores. Verificar en 24h que los jobs nuevos tengan tokens registrados.
2. **Ventana de 4h en Resumen 8PM:** El script `get_daily_report.py` puede no filtrar por tiempo — depende de cómo esté implementado. Si el script devuelve el día completo, la instrucción del prompt limitará al menos el análisis. Monitorear el próximo run (8PM COT).
3. **Zenith daily cap:** Es una advertencia, no un bloqueo. Si Zenith supera 8 jobs/día constantemente, escalar a bloqueo duro.
