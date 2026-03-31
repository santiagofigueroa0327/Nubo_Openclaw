# 18 — Skills System (Estado actual: Marzo 2026)

> Skills son capacidades adicionales que los agentes pueden usar. Flux es el especialista en skills.

---

## ¿Qué son las Skills?

Skills son módulos de capacidad instalados en `~/.openclaw/workspace/skills/{slug}/`. Cada skill tiene un `SKILL.md` que describe su comportamiento, trigger y contrato mínimo.

OpenClaw inyecta skills relevantes en el contexto del agente cuando están activas.

---

## Skills instalados (29 total)

### Skills de APIs externas

| Slug | Descripción |
|------|-------------|
| `api-gateway` | Proxy de 100+ APIs (Google Workspace, Microsoft 365, GitHub, Notion, Slack, Airtable, HubSpot) vía Maton |
| `gmail` | Gmail API: list/get/send messages, labels, threads, drafts |
| `google-calendar` | Google Calendar: list/add/update/delete events |
| `google-docs` | Google Docs: get/create documents, batch updates |
| `google-drive` | Google Drive: list, search, create, manage files/folders |
| `google-workspace-mcp` | Google Workspace vía MCP |
| `slack` | Slack API: mensajes, canales, búsqueda |
| `n8n` | Integración con N8N para workflows automatizados |

### Skills de automatización

| Slug | Descripción |
|------|-------------|
| `auto-updater` | Cron job diario para auto-actualizar OpenClaw y skills |
| `cron-builder` | Guía para crear cron jobs siguiendo Templates A/B/C |
| `event-watcher` | Lightweight event watcher con Redis Streams + webhook JSONL |
| `proactive-agent` | Comportamiento proactivo para detectar y actuar sin ser solicitado |

### Skills de observabilidad y diagnóstico

| Slug | Descripción |
|------|-------------|
| `config-guardian` | Valida integridad de `openclaw.json` antes de restart |
| `delivery-monitor` | Monitorea cola `~/.openclaw/delivery-queue/` |
| `session-diagnostics` | Diagnóstico de sesiones bloqueadas |
| `system-health` | Health check del sistema: gateway, agentes, auth, errores |

### Skills de desarrollo de skills

| Slug | Descripción |
|------|-------------|
| `skill-builder` | Framework para construir nuevas skills |
| `skill-intake` | Guía el intake y clasificación de solicitudes de skills |
| `changelog-writer` | Documenta cambios del sistema en `workspace/CHANGELOG.md` |

### Skills de contenido y análisis

| Slug | Descripción |
|------|-------------|
| `broken-link-checker` | Verifica URLs externas (http/https) para disponibilidad (200-399) |
| `prompt-quality` | Evalúa y mejora prompts para agentes |
| `notebooklm` | Integración con Google NotebookLM |
| `self-improve` | Proceso de auto-mejora del sistema |

### Skills de UI/UX

| Slug | Descripción |
|------|-------------|
| `gsap-core` | GSAP core animations |
| `agent-browser` | Browser automation con refs interactivos (@e1, @e2) |

### Skills de metodología

| Slug | Descripción |
|------|-------------|
| `task-router` | Routing inteligente de tareas a agentes |
| `maton-patterns` | Patrones para usar Maton API gateway |

---

## Estructura de una Skill

```
~/.openclaw/workspace/skills/{slug}/
└── SKILL.md    # Definición completa de la skill
```

**Estructura de SKILL.md (contrato mínimo):**
```markdown
---
name: nombre-de-la-skill
slug: slug-del-directorio
type: instruction-only | reference-heavy | scripted | integration
status: active | draft | disabled | deprecated
trigger: [cuándo se activa]
owner: flux | zenith | nubo
---

# Nombre de la Skill

## Objetivo
[qué hace]

## Trigger
[cuándo se activa]

## Comportamiento
[cómo opera]

## Restricciones
[qué NO debe hacer]

## Definición de done
[cuándo está completada]
```

---

## Tipos de Skills

| Tipo | Descripción |
|------|-------------|
| `instruction-only` | Solo instrucciones en texto, sin scripts ni APIs |
| `reference-heavy` | Documentación extensa que el agente consulta |
| `scripted` | Ejecuta scripts bash/python para su función |
| `integration` | Conecta con API externa (requiere auth, secrets en env vars) |

---

## Ciclo de vida

```
draft → active → disabled → deprecated
```

- **draft:** En construcción, no disponible para agentes
- **active:** Operativa, inyectada en contexto cuando aplica
- **disabled:** Temporalmente inactiva
- **deprecated:** Reemplazada, no usar

---

## Flujo de creación de Skills (Flux)

1. Recibir solicitud (de Nubo o directamente)
2. Evaluar suficiencia: ¿tiene objetivo, comportamiento, trigger, owner?
   - Si falta info → pedir SOLO lo faltante, NO inventar
3. Clasificar tipo
4. Construir `SKILL.md` con contrato mínimo
5. Instalar en `~/.openclaw/workspace/skills/{slug}/`
6. Validar: `validate-skill.sh {slug}`
7. Verificar: `openclaw skills list | grep {slug}`
8. Reportar resultado

**Reglas:**
- No instalar skills con secrets en SKILL.md (usar env vars)
- No marcar skill como eligible si sus requirements no están resueltos
- Antes de restart del gateway → ejecutar config-guardian

---

## Skills en Mission Control

El dashboard de Mission Control tiene una página `/skills` que:
- Lista todas las skills instaladas con estado
- Permite ver el contenido de cada SKILL.md
- API: `GET /api/skills` → shells out a `openclaw skills list --json`

---

## Responsabilidades por agente

| Agente | Responsabilidad en Skills |
|--------|--------------------------|
| **Flux** | Operación diaria: crear, instalar, actualizar, desactivar |
| **Zenith** | Cambios estructurales: framework/sistema, gateway, integración compleja |
| **Nubo** | Detecta solicitudes y delega a Flux |

---

## Metodología Skills

Documentada en `~/.openclaw/workspace/skills-methodology/`:

- `README.md` — Visión general y flujo
- `INTAKE.md` — Intake de solicitudes y suficiencia
- `MINIMUM_CONTRACT.md` — Contrato mínimo para toda Skill
- `CLASSIFICATION.md` — 4 tipos de skills
- `GOVERNANCE.md` — Ciclo de vida completo
- `VALIDATION.md` — Checklist de validación
- `scripts/validate-skill.sh` — Script automatizado de validación
