# 14 — Comunicación entre Agentes

Documentación detallada de cómo los agentes de AgentOS se comunican, pasan datos y coordinan trabajo.

---

## 1) Modelo de Comunicación

AgentOS usa un modelo **hub-and-spoke**: Nubo es el hub central, los workers son spokes. Los workers **nunca hablan entre sí directamente** — toda coordinación pasa por Nubo + archivos compartidos.

```text
              ☁️ Nubo
             /  |  \
            /   |   \
          🔎   ⚡    ✨
         Atlas Zenith Spark
```

**Canales de comunicación:**

| Canal | Dirección | Mecanismo |
|-------|-----------|-----------|
| Nubo → Worker | Unidireccional | `task.md` + `context.md` (via dispatch-job) |
| Worker → Nubo | Unidireccional | `result.md` última línea (DONE/FAILED/HANDOFF) |
| Worker → Worker | Indirecto | `resource.json` (blackboard compartido, Nubo copia entre jobs) |
| Sistema → Nubo | Eventos | `notification_state.json`, `heartbeat`, watchdog |

---

## 2) Blackboard Pattern (resource.json)

El blackboard es el mecanismo principal para pasar datos estructurados entre agentes.

### Ciclo de vida

```text
dispatch-job
    │
    ├── Crea resource.json vacío (init)
    │
    ▼
Worker A (ej. Atlas)
    │
    ├── add-node "finding-1" "research" '{"data":"..."}'
    ├── add-node "finding-2" "research" '{"data":"..."}'
    ├── add-edge "finding-1" "finding-2" "supports"
    ├── add-output "atlas" '{"summary":"..."}'
    ├── set-handoff "zenith" "Crear reporte HTML con los findings"
    │
    └── result.md: "HANDOFF: ZENITH"
         │
         ▼
job-watchdog.sh
    │
    ├── Detecta HANDOFF
    ├── Lee get-handoff de resource.json
    │   → {next_agent: "zenith", task: "Crear reporte HTML..."}
    │
    └── Nubo dispatcha Zenith
         │
         ▼
dispatch-job (Zenith)
    │
    ├── Copia resource.json del job anterior
    │
    ▼
Worker B (Zenith)
    │
    ├── Lee resource.json → nodos + outputs de Atlas
    ├── Genera HTML basado en findings
    ├── add-output "zenith" '{"file":"/path/to/report.html"}'
    │
    └── result.md: "DONE"
```

### Estructura del grafo

```json
{
  "version": "2.0",
  "mission_id": "m-20260327-042",
  "nodes": [
    {
      "id": "finding-ai-trends",
      "type": "research",
      "data": {
        "title": "AI Agent Trends 2026",
        "sources": ["https://...", "https://..."],
        "key_points": ["Multi-agent systems growing", "Cost optimization critical"]
      },
      "created_at": "2026-03-27T18:00:00Z"
    }
  ],
  "edges": [
    {
      "from": "finding-ai-trends",
      "to": "finding-cost-data",
      "relation": "supports",
      "created_at": "2026-03-27T18:00:05Z"
    }
  ],
  "agent_outputs": {
    "atlas": {
      "data": {"findings_count": 3, "confidence": "high", "lang": "es"},
      "updated_at": "2026-03-27T18:01:00Z"
    }
  },
  "handoff_instructions": {
    "next_agent": "zenith",
    "task": "Create HTML report with Atlas findings",
    "set_at": "2026-03-27T18:01:05Z"
  }
}
```

---

## 3) Señales vía result.md

La última línea de `result.md` es el canal de señalización:

### DONE
```markdown
# Resultado de la investigación
... contenido ...
DONE
```
**Efecto:** Watchdog marca como completado, envía resultado por Telegram, registra en job history.

### FAILED
```markdown
No se pudo acceder al API de ClickUp.
FAILED: Error 401 — token expirado
```
**Efecto:** Nubo puede reintentar (max 2). Si falla 3 veces → reportar fallo a Santiago.

### HANDOFF
```markdown
Investigación completada. Datos en resource.json.
Ver nodos: finding-1, finding-2, finding-3.
HANDOFF: ZENITH
```
**Efecto:** Watchdog lee handoff_instructions de resource.json → Nubo dispatcha siguiente agente con los datos.

---

## 4) Memoria como Contexto

Cada worker recibe su memoria persistente como parte de `context.md`:

```markdown
## Agent Memory (your persistent memory from previous jobs)
# MEMORY: Atlas — Research & Data
# Last updated: 2026-03-27

## Trabajos previos
- 2026-03-27: [OK] Investigación MiroFish swarm intelligence
- 2026-03-26: [OK] Análisis competitivo SaaS landscaping

## Patrones aprendidos
- Maton API para Google services
- Santiago prefiere datos con fuentes citadas
```

Esto permite que Atlas recuerde investigaciones anteriores sin volver a buscar la misma información.

---

## 5) Status via Telegram

El watchdog mantiene un único mensaje de status en Telegram que se edita en tiempo real:

```text
🔄 Delegada
Proceso: Tarea enviada al agente especializado.
Agente activo: 🔎 Atlas · MC
```
↓ (actualización automática)
```text
⚙️ Investigando
Proceso: Completando: Tendencias AI 2026
Agente activo: 🔎 Atlas · MC
```
↓ (al completar)
```text
🟢 Completado
Proceso: Tarea finalizada con éxito.
Agente activo: 🔎 Atlas · MC
```
+ Mensaje separado con el resultado completo.

---

## 6) Multi-Spawn: Coordinación Paralela

Cuando Nubo usa multi-spawn, cada worker escribe en su propio `resource.json`. El estado global se trackea así:

```text
multi-spawn.sh
    │
    ├── dispatch atlas "Investigar X"   → job_dir_1/resource.json
    ├── dispatch spark "Ideas para Y"    → job_dir_2/resource.json
    ├── dispatch hermes "Tareas ClickUp" → job_dir_3/resource.json
    │
    └── Poll loop:
        ├── atlas    [DONE]     01:23
        ├── spark    [RUNNING]  00:45
        └── hermes   [DONE]     00:30
```

Al completar todos, Nubo (o Aegis) puede consultar los outputs de cada worker vía `resource-graph.py query`.
