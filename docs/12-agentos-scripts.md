# 12 — AgentOS: Scripts y Herramientas

Referencia de todos los scripts en `~/.openclaw/agentos/bin/` que componen la infraestructura de orquestación.

---

## Scripts Principales (flujo de misión)

### `dispatch-job`
**Rol:** Crear una misión completa con todos los archivos necesarios.

```bash
# Modo AI (Nubo usa esto):
dispatch-job --no-wait <agent> "<mensaje>" [--skip-validation] [--skip-assembly]
# Output: MISSION_ID=xxx JOB_ID=xxx JOB_DIR=/path LOG_ID=n SPAWN_MSG=...

# Modo humano (polling):
dispatch-job <agent> "<mensaje>"
```

**Qué hace:**
1. Genera IDs únicos (misión + job)
2. Crea directorio con `task.md`, `context.md`, `acceptance.md`
3. Inicializa `resource.json` (blackboard estructurado)
4. Inyecta memoria del agente (`MEMORY_{agent}.md`) en `context.md`
5. Registra misión en SQLite vía `agentosctl`
6. Retorna variables estructuradas para Nubo

---

### `job-watchdog.sh`
**Rol:** Monitoreo en tiempo real de un job con actualizaciones de Telegram.

```bash
job-watchdog.sh --job-dir <path> --message-id <id> --agent <name> \
  --mission <mid> [--plan-file <path>] [--timeout <secs>]
```

**Layout de Telegram (3 líneas):**
```
(emoji) [Estado]
Proceso: [descripción dinámica]
Agente activo: (emoji) [nombre] · MC
```

**Estados:** 🟡Recibida → 🔄Delegada → ⚙️Ejecutando → 🟢Completado / 🔴Fallo / 🟠Bloqueado

**Al completar (DONE):**
- Envía resultado como mensaje separado en Telegram
- Actualiza Mission Control vía API (finalOutput)
- Registra en job history (`job-history.sh record`)
- Actualiza memoria del agente (`memory-updater.sh`)

**Al detectar HANDOFF:**
- Lee `handoff_instructions` de `resource.json` (preferido)
- Fallback: parsea nombre del agente de `result.md`

---

### `telegram-notify`
**Rol:** Enviar/editar mensajes de Telegram con formato HTML.

```bash
telegram-notify send "<html_text>"           # → MESSAGE_ID=12345
telegram-notify edit <msg_id> "<html_text>"  # → edita mensaje existente
```

---

### `mission-finisher.sh`
**Rol:** Safety net — busca misiones con `result.md` listo pero no entregado.

```bash
mission-finisher.sh    # Cron: cada 5 minutos
```

---

### `reaper`
**Rol:** Limpieza de misiones bloqueadas/abandonadas.

```bash
reaper    # Cron: diario a las 3AM COT
```

---

## Scripts MiroFish (nuevos)

### `resource-graph.py`
**Rol:** Blackboard estructurado JSON para comunicación inter-agente.

```bash
# Crear blackboard
resource-graph.py init <job_dir> <mission_id>

# Agregar datos
resource-graph.py add-node <job_dir> <id> <type> '<json>'
resource-graph.py add-edge <job_dir> <from> <to> <relation>
resource-graph.py add-output <job_dir> <agent> '<json>'

# Consultar
resource-graph.py get-node <job_dir> <id>
resource-graph.py query <job_dir> <type>          # o 'agent_output'

# Handoffs estructurados
resource-graph.py set-handoff <job_dir> <agent> "<task>"
resource-graph.py get-handoff <job_dir>

# Resumen legible
resource-graph.py export-summary <job_dir>
```

**Estructura de `resource.json`:**
```json
{
  "version": "2.0",
  "mission_id": "m-20260327-042",
  "created_at": "2026-03-27T17:56:57Z",
  "nodes": [
    {"id": "finding-1", "type": "concept", "data": {"key": "value"}, "created_at": "..."}
  ],
  "edges": [
    {"from": "finding-1", "to": "finding-2", "relation": "supports", "created_at": "..."}
  ],
  "agent_outputs": {
    "atlas": {"data": {"findings": ["..."]}, "updated_at": "..."}
  },
  "handoff_instructions": {
    "next_agent": "zenith",
    "task": "Create HTML from findings",
    "set_at": "..."
  },
  "metadata": {}
}
```

---

### `memory-updater.sh`
**Rol:** Actualizar la memoria persistente de un agente después de completar un job.

```bash
memory-updater.sh --agent <name> --job-dir <path> [--task-summary "<text>"]
memory-updater.sh --dry-run --agent atlas --job-dir /path --task-summary "Test"
```

**Qué hace:**
1. Lee `result.md` → extrae resumen y estado
2. Append entrada a `MEMORY_{agent}.md` bajo "Trabajos previos"
3. Auto-trim si el archivo supera 150 líneas

---

### `job-history.sh`
**Rol:** Historial persistente de jobs en SQLite para consulta posterior.

```bash
job-history.sh init                              # Crear DB
job-history.sh record --job-dir <path>           # Registrar job completado
job-history.sh search --query "MiroFish"         # Buscar por texto
job-history.sh search --agent atlas              # Filtrar por agente
job-history.sh search --tags research            # Filtrar por tags
job-history.sh recent 10                         # Últimos N jobs
job-history.sh stats                             # Estadísticas
job-history.sh --dry-run record --job-dir /path  # Preview sin escribir
```

**Schema de `job_history.db`:**
```sql
job_history (
  job_id, mission_id, agent, task_summary, result_summary,
  result_status, tags, tokens_used, duration_seconds,
  created_at, completed_at
)
-- Indices: agent, mission_id, tags, result_status
```

---

### `multi-spawn.sh`
**Rol:** Lanzar N workers en paralelo para una misión.

```bash
multi-spawn.sh --mission <ID> --workers "atlas:investigar X,zenith:crear HTML" [--timeout 300]
multi-spawn.sh --dry-run --mission <ID> --workers "atlas:task1,spark:task2"
```

**Qué hace:**
1. Dispatch cada worker con `dispatch-job --no-wait`
2. Registra cada worker como nodo en `resource.json`
3. Monitorea todos en paralelo (polling result.md)
4. Retorna 0 si todos OK, 1 si alguno falló/timeout

---

### `spawn-status.sh`
**Rol:** Vista en tiempo real del estado de workers de una misión.

```bash
spawn-status.sh --mission <ID>
```

**Output:**
```
AGENT          STATUS       DURATION
─────          ──────       ────────
atlas          [DONE]       01:23
zenith         [RUNNING]    00:45
spark          [PENDING]
```

---

## Scripts de Soporte

| Script | Propósito |
|--------|-----------|
| `agentosctl` | CLI para SQLite: crear/actualizar misiones, jobs, logs, eventos |
| `soul-guard.sh` | Verificar integridad de SOUL.md (no truncado, secciones requeridas) |
| `soul-backup.sh` | Backup de SOUL.md antes de cambios |
| `output-validator.sh` | Validar output de un job antes de marcar como éxito |
| `log-failure.sh` | Registrar fallos con contexto para debugging |
| `delegation-tests.sh` | Suite de 10 tests de delegación (verificar que Nubo delega correctamente) |
| `test-harness.sh` | Tests simulados del pipeline completo |
| `test-mirofish-integration.sh` | 32 tests de integración para MiroFish patterns |
| `handoff-detector.sh` | Detectar señales HANDOFF en result.md |
| `handoff-executor.sh` | Ejecutar un handoff entre agentes |
