# 11 — AgentOS: Sistema de Orquestación Multi-Agente

Documentación del sistema AgentOS v1 — la capa de orquestación que permite a Nubo delegar trabajo a agentes especializados con comunicación estructurada, memoria persistente y seguimiento en tiempo real.

---

## 1) Visión General

AgentOS es el protocolo de orquestación que transforma a Nubo de un chatbot simple en un **director de operaciones multi-agente**. Cuando Santiago envía un mensaje por Telegram, Nubo analiza la intención y decide si responder directamente (preguntas simples, saludos) o delegar a uno o más agentes especializados.

```text
Santiago (Telegram)
       │
       ▼
   ☁️ Nubo (Orquestador — Claude Sonnet)
       │
       ├── Analiza intención
       ├── Crea misión (dispatch-job)
       ├── Envía status por Telegram
       ├── Delega a worker (sessions_spawn)
       ├── Monitorea (job-watchdog)
       └── Entrega resultado
```

**Principio cardinal:** Nubo NUNCA ejecuta trabajo especializado. Su rol es exclusivamente orquestar, monitorear y entregar.

---

## 2) Red de Agentes

| Agente | Modelo | Rol | Cuándo se usa |
|--------|--------|-----|---------------|
| **Nubo** (main) | Claude Sonnet 4.6 | Orquestador, único punto de contacto Telegram | Siempre — dirige todo |
| **Atlas** | Gemini 2.5 Flash | Investigación y datos | Web search, análisis, síntesis |
| **Zenith** | Gemini 2.5 Flash | Ingeniería pesada | Código, debug, HTML, scripts, arquitectura |
| **Chronos** | Gemini 2.5 Flash | Calendario | Meetings, agenda, notas de reunión |
| **Spark** | Gemini 2.5 Flash | Brainstorm | Ideas, naming, estrategia |
| **Flux** | Gemini 2.5 Flash | Automatizaciones | Cron jobs, email, Drive, Slack, skills |
| **Hermes** | Gemini 2.5 Flash | Gestión de tareas | ClickUp, planes, planning |
| **Sentinel** | Gemini 2.5 Flash | QA Validator | Revisión de outputs (solo high-risk) |
| **Aegis** | Gemini 2.5 Flash | Ensamblador final | Consolida outputs multi-agente |

> **Nota:** Nubo usa Claude Sonnet (Anthropic) por su capacidad de orquestación. Los workers usan Gemini Flash (Google) por costo y velocidad.

---

## 3) Flujo de una Misión (Steps 0-5)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE UNA MISIÓN                          │
└─────────────────────────────────────────────────────────────────┘

Step 0: PLAN          Nubo analiza → genera plan de 3-6 pasos
                      → telegram_plan.md
       │
Step 1: DISPATCH      dispatch-job --no-wait <agent> "<mensaje>"
                      → Crea misión en SQLite + archivos en disco
                      → task.md, context.md, acceptance.md, resource.json
       │
Step 2: STATUS        telegram-notify → mensaje de status 3 líneas
                      job-watchdog.sh en background → monitoreo real-time
       │
Step 3: SPAWN         sessions_spawn tool → lanza al worker
                      Worker lee task.md → ejecuta → escribe result.md
       │
Step 4: VERIFY        Nubo lee notification_state.json
                      Si no entregado → watchdog fallback con timeout
       │
Step 5: DELIVER       Watchdog edita Telegram con resultado
                      DB actualizada → DONE
```

---

## 4) Estructura de Archivos por Misión

```
~/.openclaw/agentos/missions/
└── m-20260327-042/              ← misión
    └── jobs/
        └── j-atlas-017/         ← job individual
            ├── task.md           ← instrucciones para el worker
            ├── context.md        ← contexto: APIs, perfil usuario, memoria del agente
            ├── acceptance.md     ← criterios de aceptación
            ├── resource.json     ← blackboard estructurado (JSON graph)
            ├── result.md         ← output del worker (última línea: DONE/FAILED/HANDOFF)
            ├── evidence/         ← archivos de soporte
            ├── heartbeat         ← timestamp de actividad del worker
            ├── telegram_plan.md  ← plan de pasos para Telegram
            ├── telegram_message_id ← ID del mensaje de status
            ├── watchdog.pid      ← PID del proceso watchdog
            ├── watchdog.log      ← logs del watchdog
            └── notification_state.json ← estado de notificación
```

---

## 5) Señales entre Agentes

Los workers comunican su resultado mediante la **última línea** de `result.md`:

| Señal | Significado | Acción de Nubo |
|-------|-------------|----------------|
| `DONE` | Tarea completada exitosamente | Entregar resultado por Telegram |
| `FAILED: <razón>` | Error en la ejecución | Reintentar max 2 veces, luego reportar fallo |
| `HANDOFF: <AGENTE>` | Parte completada, pasar al siguiente | Dispatch siguiente agente con resource.json |

---

## 6) Rutas Clave del Sistema

```
Config principal:      ~/.openclaw/openclaw.json
Servicio systemd:      ~/.config/systemd/user/openclaw-gateway.service
AgentOS raíz:          ~/.openclaw/agentos/
AgentOS DB:            ~/.openclaw/agentos/agentos.sqlite
AgentOS CLI:           ~/.openclaw/agentos/bin/agentosctl
Job History DB:        ~/.openclaw/agentos/job_history.db
Misiones:              ~/.openclaw/agentos/missions/
Workspace (Nubo):      ~/.openclaw/workspace/
SOUL.md (protocolo):   ~/.openclaw/workspace/SOUL.md
Cron jobs:             ~/.openclaw/cron/jobs.json
Nubo credentials:      ~/.openclaw/nubo.env
```

---

## 7) Comandos Disponibles

```bash
# Status de misiones
agentosctl mission list

# Limpiar misiones bloqueadas
reaper

# Entregar resultados pendientes
mission-finisher.sh

# Ver historial de jobs
job-history.sh recent 10
job-history.sh search --agent atlas --query "MiroFish"
job-history.sh stats

# Multi-spawn (workers paralelos)
multi-spawn.sh --mission M --workers "atlas:task1,zenith:task2"
spawn-status.sh --mission M

# Tests
test-mirofish-integration.sh    # 32 tests de integración
test-harness.sh --all            # suite de tests existente
delegation-tests.sh --all        # tests de delegación
```
