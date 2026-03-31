# 13 — MiroFish Patterns en AgentOS

Implementación de 4 patrones de inteligencia colectiva (Swarm Intelligence) inspirados en MiroFish, adaptados a la arquitectura multi-agente de AgentOS.

---

## Qué es MiroFish

MiroFish es un motor de inteligencia colectiva que construye un "mundo digital paralelo" donde miles de agentes con personalidades independientes interactúan libremente. Sus patrones clave:

- **GraphRAG:** Grafo de conocimiento compartido entre todos los agentes
- **Agentes con Persona:** Memoria individual a largo plazo + personalidad codificada
- **Simulación Paralela:** N agentes corriendo simultáneamente con sincronización
- **Deep Interaction:** Historial persistente consultable después de cada simulación

---

## Mapeo MiroFish → AgentOS

| MiroFish | AgentOS (implementado) |
|----------|------------------------|
| GraphRAG (grafo compartido) | `resource.json` — JSON graph con nodos, edges, metadata |
| Agentes con Persona + Memoria | `MEMORY_{agent}.md` — memoria persistente por agente |
| Parallel Simulation | `multi-spawn.sh` — protocolo formal para N workers paralelos |
| Deep Interaction (historial) | `job-history.sh` — SQLite con historial de todos los jobs |
| Seed Extraction | Atlas (existente) — ahora con output reutilizable via resource.json |
| ReportAgent | Aegis (existente) — ahora con acceso a historial completo |

---

## Patrón 1: Blackboard Estructurado (resource.json)

**Problema:** `resource.md` era texto libre, no parseable, se perdía contexto entre handoffs.

**Solución:** `resource.json` — un grafo JSON con nodos tipados, edges con relaciones, y outputs por agente.

### Flujo de datos en un handoff

```text
┌──────────┐    resource.json    ┌──────────┐
│  Atlas   │ ─── add-node ────▶ │  Graph   │
│ (invest.)│ ─── add-output ──▶ │  Store   │
│          │ ─── set-handoff ─▶ │          │
└──────────┘                    └────┬─────┘
                                     │ get-handoff
                                     ▼
                                ┌──────────┐
                                │  Zenith  │
                                │ (código) │ ← lee nodos + outputs de Atlas
                                └──────────┘
```

### Ejemplo: Atlas investiga → Zenith implementa

```bash
# Atlas escribe sus hallazgos
resource-graph.py add-node $JOB_DIR "trend-ai" "finding" \
  '{"title":"AI agents 2026","sources":["url1","url2"],"summary":"..."}'
resource-graph.py add-node $JOB_DIR "trend-web" "finding" \
  '{"title":"WebAssembly adoption","sources":["url3"],"summary":"..."}'
resource-graph.py add-edge $JOB_DIR "trend-ai" "trend-web" "related_to"
resource-graph.py add-output $JOB_DIR "atlas" '{"findings_count":2,"confidence":"high"}'
resource-graph.py set-handoff $JOB_DIR "zenith" "Create HTML report from findings"

# result.md última línea:
# HANDOFF: ZENITH
```

### Compatibilidad

Si `resource.json` no existe, el sistema sigue usando `resource.md` como antes. El cambio es 100% aditivo.

---

## Patrón 2: Memoria Persistente por Agente

**Problema:** Los workers olvidaban todo entre jobs. Atlas investigaba lo mismo dos veces.

**Solución:** `MEMORY_{agent}.md` — archivo de memoria que se inyecta en `context.md` y se actualiza al terminar.

### Archivos de memoria

```
~/.openclaw/workspace/
├── MEMORY_atlas.md     ← investigación
├── MEMORY_zenith.md    ← código/arquitectura
├── MEMORY_flux.md      ← cron/automatizaciones
├── MEMORY_hermes.md    ← tareas/ClickUp
└── MEMORY_spark.md     ← brainstorm/ideas
```

### Estructura

```markdown
# MEMORY: Atlas — Research & Data
# Last updated: 2026-03-27
# Version: 1.0

## Proyectos conocidos
- Viva Landscape: empresa de paisajismo, Santiago es CTO
- MiroFish: motor de swarm intelligence que estamos adaptando

## Trabajos previos
- 2026-03-27: [OK] Investigación sobre tendencias AI en landscaping
- 2026-03-26: [OK] Análisis competitivo de 5 empresas SaaS

## Patrones aprendidos
- Santiago prefiere datos con fuentes citadas
- Maton API para Google services (nunca web_fetch directo)
```

### Flujo automático

```text
dispatch-job         → Lee MEMORY_{agent}.md → Inyecta en context.md
                       + Agrega instrucción de update en acceptance.md

Worker ejecuta       → Lee su memoria al inicio del job
                       + Actualiza "Trabajos previos" al terminar

job-watchdog (DONE)  → Llama memory-updater.sh async
                       → Extrae resumen de result.md
                       → Append a MEMORY_{agent}.md
                       → Auto-trim a 150 líneas
```

---

## Patrón 3: Multi-Spawn (Workers Paralelos)

**Problema:** Las misiones se ejecutaban secuencialmente. Una investigación + implementación tomaba el doble.

**Solución:** `multi-spawn.sh` — protocolo formal para lanzar N workers en paralelo con sincronización via `resource.json`.

### Cuándo usar multi-spawn vs secuencial

| Escenario | Patrón |
|-----------|--------|
| Investigar + crear código (depende del resultado) | Secuencial (HANDOFF) |
| Investigar mercado + investigar competencia + brainstorm nombres | **Multi-Spawn** |
| Crear HTML + configurar cron (independientes) | **Multi-Spawn** |
| Validar output (Sentinel) → entregar | Secuencial |

### Ejemplo de uso

```bash
# Nubo decide multi-spawn:
multi-spawn.sh --mission m-20260327-042 \
  --workers "atlas:Investigar tendencias AI 2026,spark:Generar 10 nombres para producto,hermes:Crear tareas en ClickUp" \
  --timeout 300
```

### Diagrama

```text
                    ☁️ Nubo
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
         🔎 Atlas   ✨ Spark   📋 Hermes
         (invest.)  (naming)   (ClickUp)
            │          │          │
            └──────────┼──────────┘
                       ▼
              resource.json (sync)
                       │
                       ▼
              📊 Status Report
```

---

## Patrón 4: Job History Store

**Problema:** Una vez terminado un job, el contexto se perdía. Santiago no podía preguntar "¿qué investigó Atlas la semana pasada?"

**Solución:** `job_history.db` — base SQLite con historial completo de todos los jobs, consultable por texto, agente o tags.

### Campos almacenados

| Campo | Descripción |
|-------|-------------|
| `job_id` | Identificador único del job |
| `mission_id` | Misión a la que pertenece |
| `agent` | Agente que ejecutó |
| `task_summary` | Resumen del objetivo (de task.md) |
| `result_summary` | Resumen del resultado (de result.md) |
| `result_status` | DONE, FAILED, HANDOFF |
| `tags` | Auto-extraídos del task summary |
| `duration_seconds` | Tiempo de ejecución |
| `completed_at` | Timestamp de finalización |

### Integración automática

El `job-watchdog.sh` llama automáticamente a `job-history.sh record` cuando un job termina con `DONE`. No requiere acción manual.

### Ejemplo de consulta

```bash
# ¿Qué ha hecho Atlas últimamente?
$ job-history.sh search --agent atlas
job_id          mission_id      agent  result_status  task                    dur_s  completed_at
j-atlas-017     m-20260327-042  atlas  DONE           Investigar MiroFish     87     2026-03-27 17:58:00

# Estadísticas generales
$ job-history.sh stats
=== Job History Stats ===
Total jobs: 42
By agent:
atlas   15   14   1   45.0
zenith  12   11   1   123.0
flux     8    8   0   34.0
```

---

## Diagrama Completo del Flujo

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENTOS + MIROFISH PATTERNS                         │
└─────────────────────────────────────────────────────────────────────────┘

  Santiago ──(Telegram)──▶ ☁️ Nubo (Claude Sonnet)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              dispatch-job           dispatch-job (×N si multi-spawn)
                    │                     │
          ┌─────── │ ───────────────── │ ───────┐
          │        ▼                   ▼        │
          │   MEMORY_{agent}.md   MEMORY_{agent}.md
          │   (inyectada en       (inyectada en │
          │    context.md)         context.md)  │
          │        │                   │        │
          │        ▼                   ▼        │
          │   🔎 Atlas             ⚡ Zenith     │
          │   (Gemini Flash)       (Gemini Flash)│
          │        │                   │        │
          │        ├── resource.json ──┤        │   ← Blackboard estructurado
          │        │   (nodos, edges,  │        │
          │        │    outputs, handoff)│       │
          │        │                   │        │
          │        ▼                   ▼        │
          │   result.md            result.md    │
          │   (DONE/HANDOFF)       (DONE)       │
          │        │                   │        │
          └────────┼───────────────────┼────────┘
                   │                   │
                   ▼                   ▼
            job-watchdog.sh      job-watchdog.sh
                   │                   │
          ┌────────┼───────────────────┼────────┐
          │        ▼                   ▼        │
          │   memory-updater.sh  memory-updater.sh  ← Memoria actualizada
          │   job-history.sh     job-history.sh     ← Historial registrado
          │        │                   │        │
          └────────┼───────────────────┼────────┘
                   │                   │
                   ▼                   ▼
              Telegram            Mission Control
              (resultado)         (logs + dashboard)
```

---

## Tests

```bash
# Suite completa de integración (32 tests)
~/.openclaw/agentos/bin/test-mirofish-integration.sh

# Fase por fase:
# Fase 1: Memoria — archivos existen, updater funciona, dispatch inyecta
# Fase 2: Graph  — resource.json CRUD, handoff estructurado, export
# Fase 3: Spawn  — multi-spawn dry-run, spawn-status, SOUL.md
# Fase 4: History — DB init, record, search, stats, watchdog hooks
```
