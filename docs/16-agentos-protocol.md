# 16 — AgentOS v1 — Protocolo Completo (Estado actual: Marzo 2026)

> AgentOS v1 fue desplegado el 2026-03-04. Este documento describe el flujo completo de orquestación document-first.

---

## ¿Qué es AgentOS?

AgentOS es la capa de orquestación document-first construida sobre OpenClaw. Permite a Nubo delegar tareas a agentes especializados de manera asíncrona, con visibilidad en tiempo real via Telegram y Mission Control.

**Principio central:** El sistema usa el **filesystem como blackboard**. Los agentes se comunican escribiendo/leyendo archivos, no por mensajes directos entre ellos.

---

## Arquitectura del Blackboard

### Estructura de directorios

```
~/.openclaw/agentos/
├── missions/
│   ├── dispatched/            # Jobs en espera de ser procesados
│   ├── <MISSION_ID>/         # Una misión = una tarea de Santiago
│   │   ├── jobs/
│   │   │   └── <JOB_ID>/     # Un job = un agente trabajando
│   │   │       ├── task.md              # Qué hacer (escrito por Nubo)
│   │   │       ├── context.md           # Contexto de la misión
│   │   │       ├── acceptance.md        # Criterios de éxito
│   │   │       ├── result.md            # Output del agente (DONE/FAILED/HANDOFF)
│   │   │       ├── evidence/            # Archivos de soporte
│   │   │       │   └── handoff-data.md  # Datos para el siguiente agente
│   │   │       ├── validation.json      # Veredicto de Sentinel (si aplica)
│   │   │       ├── final_answer_telegram.md  # Respuesta final (si Aegis)
│   │   │       ├── telegram_message_id  # ID del mensaje Telegram en curso
│   │   │       ├── telegram_plan.md     # Plan de trabajo (Step 0)
│   │   │       ├── notification_state.json  # Estado de entrega
│   │   │       ├── heartbeat            # Unix timestamp — señal viva del agente
│   │   │       ├── watchdog.pid         # PID del proceso job-watchdog.sh
│   │   │       ├── progress.txt         # Log de progreso visible en MC
│   │   │       └── session_done         # Flag: sesión completó
│   │   └── status.json        # Estado de la misión
├── agentos.sqlite             # Base de datos de misiones/jobs/eventos
└── bin/                       # Herramientas CLI
    ├── agentosctl              # CLI de observabilidad
    ├── dispatch-job            # Crea misiones
    ├── job-watchdog.sh         # Monitor real-time Telegram
    ├── mission-finisher.sh     # Entrega pendientes
    ├── reaper                  # Limpia misiones stuck
    ├── soul-guard.sh           # Valida integridad SOUL.md
    ├── output-validator.sh     # Valida output antes de marcar éxito
    └── log-failure.sh          # Registra fallos
```

### Señales válidas (última línea de result.md)

| Señal | Significado |
|-------|------------|
| `DONE` | Agente completó exitosamente |
| `HANDOFF: <agente>` | Agente pasó el trabajo al siguiente (ver Handoff Protocol) |
| `FAILED: <razón>` | Agente falló con descripción del error |

---

## Protocolo de 5 Pasos (Nubo)

### Step 0 — Planificar

Antes de cualquier acción, Nubo escribe un plan:

```bash
# Escribir plan a telegram_plan.md
cat > "$JOB_DIR/telegram_plan.md" << 'EOF'
STEP:0:activo:Planificando delegación
STEP:1:pendiente:Crear misión AgentOS
STEP:2:pendiente:Notificar Telegram + Watchdog
STEP:3:pendiente:Ejecutar sessions_spawn
STEP:4:pendiente:Verificar result.md
STEP:5:pendiente:Entregar resultado
EOF
```

---

### Step 1 — Crear Misión (dispatch-job)

```bash
OUTPUT=$(/home/moltbot/.openclaw/agentos/bin/dispatch-job --no-wait AGENTE "DESCRIPCION")
MISSION_ID=$(echo "$OUTPUT" | grep "MISSION_ID:" | cut -d: -f2 | tr -d ' ')
JOB_ID=$(echo "$OUTPUT"    | grep "JOB_ID:"    | cut -d: -f2 | tr -d ' ')
JOB_DIR=$(echo "$OUTPUT"   | grep "JOB_DIR:"   | cut -d: -f2 | tr -d ' ')
SPAWN_MSG=$(echo "$OUTPUT" | grep -A100 "SPAWN_MSG:" | tail -n +2)

# Actualizar estado de misión
/home/moltbot/.openclaw/agentos/bin/agentosctl mission update $MISSION_ID --status dispatched
```

**Para ZENITH:** El mensaje debe ser una spec ejecutable con:
- Path exacto del archivo a crear/modificar
- Formato esperado (HTML, bash, JSON, etc.)
- Datos inline (no depender de búsqueda externa)
- Acceptance criteria explícitos

---

### Step 2 — Status Telegram + Watchdog

```bash
# Enviar mensaje de status 3 líneas
MSG_ID=$(telegram-notify send "🔄 Delegada
Proceso: [descripción breve]
Agente activo: [emoji] [nombre] · [link MC]")

echo "$MSG_ID" > "$JOB_DIR/telegram_message_id"

# Iniciar watchdog en background (ANTES de sessions_spawn)
nohup /home/moltbot/.openclaw/agentos/bin/job-watchdog.sh \
  --job-dir "$JOB_DIR" \
  --message-id "$MSG_ID" \
  --agent "[nombre]" \
  > "$JOB_DIR/watchdog.log" 2>&1 &
echo $! > "$JOB_DIR/watchdog.pid"
```

---

### Step 3 — sessions_spawn (herramienta, NO bash)

Se llama como herramienta nativa de OpenClaw (NO via exec):

```
sessions_spawn({
  agentId: "atlas",           // agente destino
  task: "<SPAWN_MSG>",        // bloque del dispatch-job
  runTimeoutSeconds: 2400     // 40 minutos
})
```

Cuando `sessions_spawn` devuelve `ANNOUNCE_SKIP` (o "accepted"):
```bash
echo "ANNOUNCE_SKIP received" > "$JOB_DIR/session_done"
```

**⚠️ REGLA ABSOLUTA:** Después de `sessions_spawn` retorna → CERO TEXTO. No escribir nada al chat. Ir directo a Step 4.

---

### Step 4 — Verificar result.md (OBLIGATORIO)

**NUNCA confiar solo en ANNOUNCE_SKIP.** Siempre verificar:

```bash
tail -3 "$JOB_DIR/result.md" 2>/dev/null
```

**Caso A — termina en `DONE`:**
→ Éxito. Editar Telegram: `🟢 Completado`. Respuesta de Nubo: `.`

**Caso B — termina en `HANDOFF: <agente>`:**
→ Worker completó su parte. Ejecutar Step 4H (Handoff Automático).

**Caso C — NO existe o vacío:**
→ Worker FALLÓ. Editar Telegram: `🔴 Fallo`. Reportar error. NO enviar `.`

---

### Step 4H — Handoff Automático

```bash
# 1. Leer datos del job anterior
DATA=$(cat "$JOB_DIR/evidence/handoff-data.md" 2>/dev/null || cat "$JOB_DIR/result.md")

# 2. Crear nuevo dispatch-job con datos inline
/home/moltbot/.openclaw/agentos/bin/dispatch-job --no-wait <AGENTE_DESTINO> \
  "Con base en los siguientes datos ya extraídos: $DATA.
   Construye [lo que pidió Santiago].
   Los datos ya están verificados, NO los busques de nuevo."

# 3. Seguir Steps 2-3-4 con el nuevo job
# Máximo 3 handoffs por misión
```

---

### Step 5 — Respuesta Final

| Condición | Acción de Nubo |
|-----------|----------------|
| result.md existe + termina en DONE | Enviar `.` (punto) |
| HANDOFF → esperando siguiente agente | NO enviar nada hasta que último agente escriba DONE |
| result.md NO existe | Reportar fallo. NUNCA enviar `.` |
| Respuesta directa (saludo, pregunta simple) | Texto normal. NUNCA `.` |

---

## Heartbeat System

**Propósito:** Evitar que jobs queden "stuck" sin detectarse.

**Cómo funciona:**
- Cada agente worker debe escribir `echo $(date +%s) > $JOB_DIR/heartbeat` cada 2-3 tool calls
- `job-watchdog.sh` monitorea el archivo `heartbeat`
- Si no hay actualización en `STALE_THRESHOLD=300s` → watchdog considera el job bloqueado
- Si bloqueado por `STALE_BLOCK_SECS=3600s` → watchdog marca el job como FAILED

**Timeouts:**
- `runTimeoutSeconds: 2400` (40 min — tiempo máximo de ejecución)
- `STALE_THRESHOLD: 300s` (5 min sin heartbeat → "stale")
- `STALE_BLOCK_SECS: 3600s` (1h sin heartbeat → FAILED)

**Regla del primer heartbeat:** TODO agente worker DEBE hacer heartbeat como su PRIMER tool call, antes de leer task.md.

---

## job-watchdog.sh

**Propósito:** Actualiza el mensaje de Telegram en tiempo real con el estado del job.

**Layout Telegram (3 líneas):**
```
(emoji) [Estado]
Proceso: [descripción dinámica por fase]
Agente activo: (emoji) [nombre] · [link MC]
```

**Estados válidos:**

| Emoji | Estado | Cuándo |
|-------|--------|--------|
| 🟡 | Tarea recibida | Inicio |
| 🧠 | Analizando | Nubo evaluando |
| 📋 | Planeación | Generando plan |
| 🔄 | Delegada | sessions_spawn enviado |
| ⚙️ | Ejecutando | Agente trabajando |
| 🔎 | Investigando | Atlas/research activo |
| ⏳ | Esperando | Waiting external |
| 🟠 | Bloqueado | Agent stuck/error |
| 🔴 | Fallo | Failed after retries |
| 🟢 | Completado | Entregado |

**Emojis por agente:**

| Agente | Emoji |
|--------|-------|
| nubo | 🤖 |
| atlas | 🔎 |
| zenith | ⚡ |
| chronos | 📅 |
| spark | ✨ |
| flux | 🔀 |
| hermes | 📋 |
| sentinel | 🛡️ |
| aegis | 🏛️ |

**Post MC Logs:** Watchdog postea logs a Mission Control cada 30s via `curl localhost:3010/api/tasks/{taskId}/logs`.

**Anti-duplicate:** Solo edita el mensaje Telegram si el contenido visible cambió.

---

## mission-finisher.sh

**Propósito:** Safety net para misiones que completaron pero nunca notificaron a Telegram/SQLite.

**Ejecución:** Cron cada 5 minutos (system crontab).

**4 fases:**

1. **Misiones completadas pendientes:** `result.md` tiene DONE, pero `notification_state.json` dice `deliveredFinal=0` → ejecuta watchdog con `--timeout 30` para entregar
2. **Misiones huérfanas dispatched:** >2h sin `result.md` → marcar failed
3. **Jobs HANDOFF stuck:** `lastStatus=="handoff"` pero sin follow-up job → escribe `.handoff_recovery_request.md` + alerta Telegram
4. **Pending jobs con watchdog muerto:** watchdog.pid existe pero proceso está dead, resultado >30min → marcar failed

**TTLs:**
- `ORPHAN_TTL=7200` (2h para huérfanos)
- `HANDOFF_TTL=3600` (1h para handoff recovery)
- `ORPHAN_PENDING_TTL=1800` (30min para watchdog dead)

---

## Multi-Spawn (Workers en Paralelo)

Para misiones que requieren múltiples agentes en paralelo:

```bash
multi-spawn.sh --mission $MISSION_ID --workers "atlas:task1,zenith:task2"
spawn-status.sh --mission $MISSION_ID   # monitorear progreso
```

---

## Comandos de Observabilidad

```bash
# Estado de misiones
agentosctl mission list

# Actualizar estado de misión
agentosctl mission update <MISSION_ID> --status dispatched

# Limpiar misiones stuck
reaper

# Entregar resultados pendientes manualmente
mission-finisher.sh

# Tests de pipeline completo
test-harness.sh --all
```

**Slash commands (desde Telegram):**
- `/status` → `agentosctl mission list`
- `/reap` → `reaper`
- `/finish` → `mission-finisher.sh`
- `/test-suite` → `test-harness.sh --all`

---

## Mission Control (MC)

Mission Control es el dashboard web para observabilidad de AgentOS.

- **URL interna:** `http://localhost:3010`
- **URL pública:** `http://187.77.19.111:301` (variable `MC_PUBLIC_URL`)
- **Deep links:** `/tasks/agentos-MISSION_ID`
- **SSE logs:** `/api/tasks/{taskId}/logs/stream` (streaming en tiempo real)
- **Stack:** Next.js 16, SQLite (WAL), Tailwind CSS 4

Los agentes postean logs a MC durante su ejecución para visibilidad en tiempo real.

---

## Flujo completo (diagrama)

```
Santiago (Telegram)
      │ mensaje
      ▼
   NUBO (main)
      │ evalúa: delegación o respuesta directa?
      │
      ├─ Respuesta directa → texto Telegram
      │
      └─ Delegación:
            Step 0: Plan → telegram_plan.md
            Step 1: dispatch-job → MISSION_ID, JOB_ID, JOB_DIR, SPAWN_MSG
            Step 2: Telegram status (🔄) + watchdog background
            Step 3: sessions_spawn(agentId, SPAWN_MSG)
                         │
                         ▼
                   [AGENTE WORKER]
                    - PRIMER tool call: heartbeat
                    - Lee JOB_DIR/task.md
                    - Trabaja (heartbeat cada 2-3 calls)
                    - Escribe JOB_DIR/result.md
                    - Última línea: DONE / HANDOFF:<agent> / FAILED:<razón>
                    - Responde chat: ANNOUNCE_SKIP
                         │
                   ANNOUNCE_SKIP recibido
                         │
            Step 4: Verificar result.md
                    ├─ DONE → 🟢 Telegram + "." → fin
                    ├─ HANDOFF → Step 4H → nuevo job → Steps 2-3-4
                    └─ FAILED → 🔴 Telegram + diagnóstico

                   [JOB-WATCHDOG (background)]
                    - Monitorea heartbeat
                    - Actualiza Telegram cada cambio de estado
                    - Post logs a MC cada 30s
                    - Si stale >5min → 🟠 Bloqueado
                    - Si stale >1h → FAILED
```

---

## Protección de SOUL.md

SOUL.md es el archivo más crítico del sistema. Contiene las reglas operativas de Nubo.

**Protecciones:**
- `soul-guard.sh --post-check` después de cualquier cambio
- Cron horario: `Soul Guard — Hourly Integrity Check`
- Mínimo 200 líneas (si menos → CORRUPTO → auto-restore)
- Máximo 11,500 chars (OpenClaw trunca a 12,000 al inyectar)
- Secciones requeridas verificadas por soul-guard.sh

**Incidente 2026-03-24:** Zenith sobrescribió SOUL.md de Nubo (302→30 líneas). Nubo perdió reglas de delegación y ejecutó tareas directamente todo el día. Protecciones implementadas post-incidente.

**Incidente 2026-03-25:** SOUL.md creció a 19,510 chars (>12,000 limit). OpenClaw truncaba el archivo al inyectarlo. Nubo perdía Agent Registry y reglas. Fix: comprimido a <11,500 chars con referencias a PROTOCOLS.md y AGENT_REGISTRY.md.
