# SKILL_LIFECYCLE.md — Proceso de Gobernanza de Skills
Versión: 1.0 · Owner: sistema · Fecha: 2026-03-31

---

## Principio rector

Una skill instalada es diferente a una skill lista para producción. Este documento define el proceso obligatorio que debe completarse antes de que cualquier skill pueda activarse en el sistema.

---

## Cuándo una capacidad debe ser skill y no agente

La prueba es sencilla: si una capacidad no tiene volumen de trabajo diario suficiente para justificar un workspace independiente, sesión propia y overhead de contexto propio — es una skill, no un agente. Los datos de uso real son el criterio definitivo. Spark (15 jobs/mes), Sentinel (9 jobs/mes) y Aegis (6 jobs/mes) no pasaron esta prueba en marzo 2026 y fueron convertidos a skills (ver P5-consolidation-report.md).

---

## Frontmatter obligatorio (SKILL.md)

Todo SKILL.md debe tener este bloque YAML al inicio del archivo:

```yaml
---
name: nombre-en-kebab-case
description: Una frase que explica qué hace y qué problema resuelve
trigger: Criterios específicos de cuándo activarse
skip: Criterios específicos de cuándo NO activarse
output-format: Descripción del output esperado
owner: agente-responsable
version: "1.0"
created: YYYY-MM-DD
---
```

Skills sin este frontmatter completo se marcan como `needs-update` en `skills-registry.md`.

---

## Ciclo de vida de una skill

### Paso 1 — Diseño (antes de escribir código)

Responder estas preguntas antes de crear el archivo:
- ¿Qué problema específico resuelve esta skill que no resuelve ya otra?
- ¿Cuál es el trigger exacto que la debe activar?
- ¿Cuándo explícitamente NO debe activarse?
- ¿Qué debe producir exactamente como output?
- ¿En qué workspace vive y por qué ese agente?

Si no se pueden responder todas, el diseño no está listo.

### Paso 2 — Draft del SKILL.md

Crear el archivo con el frontmatter obligatorio (ver arriba) más el contenido operativo: flujo, anti-loops, grounding contract, y cualquier referencia a templates o metodologías externas.

### Paso 3 — Tests mínimos requeridos

Antes de instalar en producción, ejecutar y documentar tres casos de prueba:

**Test 1 — Happy path:** La situación más común para la que se diseñó la skill. El output debe ser correcto y en el formato esperado.

**Test 2 — Edge case:** Una situación límite o inusual donde la skill podría confundirse. El output debe manejar el caso sin fallar.

**Test 3 — Caso negativo:** Una situación donde la skill NO debe activarse (por la skip condition). Verificar que el agente NO usa la skill en este caso.

Cada test debe documentarse con: input real usado, output producido, y decisión PASS/FAIL.

### Paso 4 — Review de calidad

Revisar los tres tests y responder:
- ¿El output del happy path es genuinamente útil para el usuario?
- ¿El edge case fue manejado sin comportamiento inesperado?
- ¿El caso negativo fue correctamente ignorado?

Si todos son PASS, continuar. Si alguno es FAIL, volver al Paso 2.

### Paso 5 — Instalación y registro

1. Instalar en el workspace del agente owner (`~/.openclaw/workspace{-agent}/skills/{slug}/SKILL.md`)
2. Añadir entrada en `~/.openclaw/workspace/docs/skills-registry.md` con: nombre, agente, versión, owner, estado (`active`), fecha de instalación

---

## Proceso de deprecación

Cuando una skill es reemplazada o ya no es necesaria:

1. Actualizar su estado en `skills-registry.md` a `deprecated`
2. Añadir la fecha de deprecación y la razón
3. Renombrar el archivo a `SKILL.md.deprecated` — NO eliminarlo (preservar historial)
4. Ejecutar los tests originales para verificar que el agente ya no la usa

---

## Auditoría mensual

El primer lunes de cada mes, el agente Flux ejecuta una revisión de todas las skills activas y reporta en Telegram:
- Cuántas están en uso activo (llamadas en el último mes)
- Cuántas están instaladas pero sin uso
- Si hay alguna que necesita actualización de frontmatter (`needs-update`)

Job ID: `monthly-infra-audit` (ver `docs/cron-registry.md`)

---

## Estado del inventario actual (baseline 2026-03-31)

| Métrica | Valor |
|---|---|
| Total skills | 31 |
| Skills con frontmatter completo | 1 (delegation-protocol) |
| Skills marcadas needs-update | 30 |

Las 30 skills con `needs-update` están operativas — el frontmatter es un requisito de gobernanza, no de funcionamiento. La actualización de frontmatter se realizará incrementalmente, priorizando las skills de mayor uso.

Ver auditoría completa en `~/.openclaw/workspace/docs/skills-registry.md`.
