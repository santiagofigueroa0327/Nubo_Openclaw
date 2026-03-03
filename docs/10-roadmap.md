# 10 — Roadmap (mejoras planificadas y próximos pasos)

Este documento define la ruta de evolución de Nubo/OpenClaw: desde estabilización y documentación hasta expansión por "departamentos" (Marketing) y mejoras auto-iterativas (Zenith/Claude trabajando sobre el repo).

## 1) Estado actual (baseline)

- Gateway OpenClaw en loopback (127.0.0.1:18789) con auth por token.
- Control UI (SPA + WS RPC) disponible en el mismo puerto.
- Mission Control (Next.js) corriendo como servicio en 3010 con nginx proxy (puerto 301).
- Agentes configurados:
  - main
  - zenith (workspace separado + binding Telegram)
- Subagentes:
  - depth=1, concurrencia baja (controlable).
- Sesiones con políticas de reset (idle/daily).
- Exec con approvals (ask=always).

## 2) Objetivos principales (visión)

### 2.1 Operación sólida y segura

- Cero secretos en el repo
- Políticas fuertes para exec/pairing/allowlists
- Observabilidad y debugging confiables

### 2.2 Replicabilidad por "departamentos"

- Plantillas: crear un nuevo bot + agente + binding + workspace en minutos
- Librería de herramientas por departamento (permitidas y prohibidas)

### 2.3 Iteración asistida por IA

- CloudCode/Claude usando este repo para:
  - proponer PRs,
  - mejorar UI y UX,
  - refactors seguros,
  - automatizar tareas repetitivas.

## 3) Roadmap por fases

### Fase 0 — Higiene y hardening (inmediato)

- Revisar .gitignore y confirmar que bloquea: `.openclaw/`, `auth-profiles.json`, `*.sqlite`, `.env`
- Buscar patrones de tokens antes de cada push:

```bash
git grep -nE "AIza|sk-|xoxb-|xapp-|botToken|OPENCLAW_GATEWAY_TOKEN|Bearer "
```

- Rotar cualquier credencial expuesta durante el setup.
- Documentar "cómo rotar credenciales" como checklist (ya en docs/08-security.md).

### Fase 1 — Contrato estable del Gateway (core)

- Formalizar docs/04-gateway-ws-rpc.md como contrato base para integraciones.
- Agregar ejemplos de cliente WS (Node/Python) en /examples.
- Añadir "métodos mínimos" para observabilidad:
  - status/health/sessions.list/logs.tail/cron.list

### Fase 2 — Mission Control (mejoras de UX + eficiencia)

- Confirmar si Mission Control consume CLI o WS.
- Si usa CLI: añadir caché + backoff + consolidación de llamadas.
- Si pasa a WS: implementar reconexión con backoff + manejo de gaps.
- UI: vistas enfocadas a operación:
  - estado general
  - sesiones activas
  - costos/usage
  - cron jobs
  - approvals pendientes

### Fase 3 — "Departamento Marketing" (MVP)

- Crear agente marketing con workspace propio.
- Crear bot Telegram marketing y binding a agente marketing.
- Tools allowlist por marketing (sin exec al inicio).
- Subagentes especializados (opcionales):
  - SEO research
  - campañas (ads)
  - copywriting
  - creatividades (image/video prompts)
  - analytics/resúmenes
- Entregable:
  - guía "crear departamento" paso a paso + plantillas en /examples.

### Fase 4 — Auto-iteración controlada (Zenith/Claude)

- Definir flujo de PRs:
  - CloudCode propone cambios
  - Revisión humana (Santiago)
  - Merge
  - Deploy con checklist
- Crear "suites" de pruebas:
  - smoke tests del gateway
  - health checks del UI
  - tests básicos del Mission Control build
- Cron jobs de mantenimiento:
  - limpieza de sesiones viejas
  - snapshots de uso/costo
  - auditoría de tokens en repo (local)

### Fase 5 — Expansión multi-canal y multi-nodo

- Integración robusta de Slack si se usa internamente.
- Multi-node (si se agregan hosts/clients):
  - políticas por nodo
  - denyCommands por nodo
  - approvals por nodo
- Exposición segura remota:
  - Tailscale Serve o proxy autenticado
  - permitir acceso a Control UI sin exponer gateway públicamente

## 4) Backlog (ideas rápidas)

- Panel de "Secrets hygiene" (alerta si detecta patterns en commits).
- Exportador de configs sanitizadas (genera examples/*.example.json).
- Herramienta "Repo Doctor":
  - valida .gitignore
  - valida que no existan sqlite/keys
  - valida que docs existan y estén enlazados en README

## 5) Definición de "Done" para cada release

Para declarar una iteración como "lista":

- docs actualizadas
- no hay secretos en git
- smoke tests pasan
- servicios systemd funcionando
- rollback plan documentado (mínimo: backup + restart)
