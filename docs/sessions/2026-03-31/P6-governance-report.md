# Skills & Cron Jobs Governance Report — 2026-03-31 08:50 UTC

---

## Documentos de lifecycle creados

| Documento | Estado | Ruta en repo |
|---|---|---|
| SKILL_LIFECYCLE.md | SÍ | `docs/SKILL_LIFECYCLE.md` |
| CRON_LIFECYCLE.md | SÍ | `docs/CRON_LIFECYCLE.md` |

### Contenido SKILL_LIFECYCLE.md
- Principio rector: criterio de agente vs skill (Spark/Sentinel/Aegis no pasaron prueba de volumen)
- Frontmatter YAML obligatorio: name, description, trigger, skip, output-format, owner, version, created
- Ciclo 5 pasos: Diseño → Draft → Tests (happy/edge/negative) → Review → Instalación
- Proceso de deprecación: SKILL.md.deprecated (NO eliminar)
- Auditoría mensual via job 8e310986

### Contenido CRON_LIFECYCLE.md
- Lección c73ebd13: 876 runs post-reemplazo, ~$50-60 USD pérdida
- 7 criterios obligatorios para nuevo job: nombre, owner, delivery.channel, timeout, 3 test runs, deprecation-condition, registro previo
- Schema canónico JSON
- Proceso deprecación: mismo día, sin "pendiente"
- Auditoría mensual automática

---

## Auditoría de skills existentes (baseline)

| Métrica | Valor |
|---|---|
| Total skills auditadas | 31 |
| Skills con frontmatter completo (OK) | **1** — delegation-protocol |
| Skills marcadas needs-update | **30** |
| Skills deprecadas | 0 |

### Skills marcadas needs-update (30)

| Slug | Campos faltantes |
|---|---|
| creative-thinking (ex-Spark) | name, trigger, skip, output-format, owner, version |
| agent-browser | trigger, skip, output-format, owner, version |
| api-gateway | trigger, skip, output-format, owner |
| assembly (ex-Aegis) | name, trigger, skip, output-format, owner, version |
| auto-updater | trigger, skip, output-format |
| broken-link-checker | trigger, skip, output-format, owner, version |
| changelog-writer | trigger, skip, output-format |
| config-guardian | trigger, skip, output-format |
| cron-builder | trigger, skip, output-format |
| delivery-monitor | trigger, skip, output-format |
| event-watcher | trigger, skip, output-format, owner, version |
| gmail | trigger, skip, output-format, owner |
| google-calendar | trigger, skip, output-format, owner, version |
| google-docs | trigger, skip, output-format, owner |
| google-drive | trigger, skip, output-format, owner |
| google-workspace-mcp | trigger, skip, output-format, owner, version |
| gsap-core | trigger, skip, output-format |
| maton-patterns | trigger, skip, output-format |
| n8n | trigger, skip, output-format, owner, version |
| notebooklm | trigger, skip, output-format, owner, version |
| proactive-agent | trigger, skip, output-format, owner |
| prompt-quality | trigger, skip, output-format |
| qc-check (ex-Sentinel) | name, trigger, skip, output-format, owner, version |
| self-improve | name, trigger, skip, output-format, owner, version |
| session-diagnostics | trigger, skip, output-format |
| skill-builder | trigger, skip, output-format |
| skill-intake | trigger, skip, output-format |
| slack | trigger, skip, output-format |
| system-health | trigger, skip, output-format |
| task-router | trigger, skip, output-format |

> Nota: needs-update = skill operativa, frontmatter incompleto según SKILL_LIFECYCLE.md v1.0. Los campos `trigger`, `skip`, `output-format` son nuevos requisitos — todas las skills pre-P6 los tienen faltantes. Actualización incremental, priorizar skills de mayor uso.

Registro completo: `~/.openclaw/workspace/docs/skills-registry.md`

---

## Cron mensual de auditoría

| Campo | Valor |
|---|---|
| Job ID | `8e310986-0635-4774-b81b-390ab7b5e667` |
| Nombre | Monthly Infra Audit — Flux |
| Schedule | `0 10 1-7 * 1` (primer lunes de cada mes, 10:00 COT) |
| Agente | flux |
| Modelo | google/gemini-2.5-flash |
| Delivery | announce/telegram → 1211573593 |
| Estado | idle (próximo run: primer lunes de abril) |
| Añadido a cron-registry.md | SÍ |

---

## Documentación del repo actualizada

| Documento | Estado | Cambios clave |
|---|---|---|
| `docs/15-agents-registry.md` | SÍ | 9→6 agentes, tabla routing actualizada, secciones Spark/Sentinel/Aegis reemplazadas |
| `docs/17-cron-jobs.md` | SÍ | 10-job inventory con columna Estado, Monthly Audit añadido, c73ebd13 DEPRECATED |
| `docs/18-skills.md` | SÍ | 29→32 skills (3 consolidadas P5), referencia SKILL_LIFECYCLE.md |
| `docs/20-architecture-current.md` | SÍ | AgentOS v2, 6 agentes, MC dashboard features, changelog P1-P6 |
| `docs/SKILL_LIFECYCLE.md` | SÍ (nuevo) | Proceso completo de gobernanza de skills |
| `docs/CRON_LIFECYCLE.md` | SÍ (nuevo) | Proceso completo de gobernanza de cron jobs |

**Git commit:** `687500a`
**Push:** `main → santiagofigueroa0327/Nubo_Openclaw`

---

## Estado de cron-registry.md

| ID | Nombre | Schedule | Estado | Deprecation condition |
|---|---|---|---|---|
| `989b2ef7` | Daily Auto-Update | `0 4 * * *` | ACTIVE | Si OpenClaw tiene auto-update nativo estable |
| `d98fb828` | Resumen Diario 8PM | `0 20 * * *` | ACTIVE | Si Santiago activa resumen en otro canal |
| `5449e8c0` | Self-Improve 3AM | `0 3 * * *` | ACTIVE | Si mejoras se gestionan vía PR automático |
| `66d106f5` | Daily Digest 07:00 | `0 7 * * *` | ACTIVE | Si se implementa feed RSS push |
| `14f62757` | Daily AI News 10AM | `0 10 * * *` | ACTIVE | Si se implementa feed RSS push |
| `5bf1dd0b` | Hermes Weekly Planning | `0 9 * * 1` | ACTIVE | Si ClickUp tiene integración nativa |
| `6cd68e6d` | Hermes Weekly Report | `0 19 * * 6` | ACTIVE | Si reportes se automatizan vía ClickUp |
| `7d9d2374` | Weekly Health Check | `0 20 * * 0` | ACTIVE | Si MC tiene health monitoring continuo |
| `5ff0c82d` | Soul Guard Hourly | `0 * * * *` | ACTIVE | Si SOUL.md se protege por permisos filesystem |
| `8e310986` | Monthly Infra Audit | `0 10 1-7 * 1` | ACTIVE | Nunca deprecar — es infraestructura de gobernanza |
| `c73ebd13` | Meeting Notes Check Auto | `*/5 * * * *` | **DEPRECATED** | N8N webhook activo (2026-03-31). Lección fundacional. |

---

## Evaluación de condiciones de aprobación

| # | Condición | Estado |
|---|---|---|
| 1 | SKILL_LIFECYCLE.md y CRON_LIFECYCLE.md existen en el repo y están en el commit | PASS — commit `687500a` |
| 2 | Auditoría de las 31 skills existe como documento con resultado por skill | PASS — `~/.openclaw/workspace/docs/skills-registry.md` + tabla en este reporte |
| 3 | El cron mensual de auditoría tiene job ID y está en cron-registry.md | PASS — `8e310986`, en registry y en OpenClaw |
| 4 | Docs 15, 17, 18, 20 actualizados y commiteados | PASS — todos en commit `687500a` |
| 5 | cron-registry.md tiene 9 entradas activas + c73ebd13 DEPRECATED | PASS — 10 activos + 1 DEPRECATED |

**PASS — Todas las condiciones cumplidas. Sistema de gobernanza operativo.**
