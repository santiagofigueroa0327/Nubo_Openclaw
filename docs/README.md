# Nubo/OpenClaw — Documentation Index

This directory contains the complete documentation for the Nubo/OpenClaw ecosystem as deployed on VPS `srv1364133` (user `moltbot`).

> **Rule #1:** This repo must NOT contain real tokens/keys. All secrets are marked `REDACTED`.

---

## Reading Order (Recommended)

| # | Document | Topic |
|---|----------|-------|
| 00 | [Overview](./00-overview.md) | Project goals, components, and mental model |
| 01 | [Architecture](./01-architecture.md) | System components, agents, workspaces, sessions, tools |
| 02 | [Config: openclaw.json](./02-config-openclaw-json.md) | Main configuration file structure and editing practices |
| 03 | [Auth Profiles](./03-auth-profiles.md) | Credential profiles per agent (`auth-profiles.json`) |
| 04 | [Gateway WS RPC](./04-gateway-ws-rpc.md) | WebSocket RPC contract — **source of truth for the gateway** |
| 05 | [Channels: Telegram & Slack](./05-channels-telegram-slack.md) | Channel configuration, policies, and operation |
| 06 | [Mission Control](./06-mission-control.md) | Next.js dashboard: architecture, runtime, and operation |
| 07 | [Deploy: systemd + nginx](./07-deploy-systemd-nginx.md) | Service units, reverse proxy, persistence |
| 08 | [Security](./08-security.md) | Tokens, permissions, attack surface, best practices |
| 09 | [Troubleshooting](./09-troubleshooting.md) | Common errors and fixes |
| 10 | [Roadmap](./10-roadmap.md) | Planned improvements and expansion phases |
| 11 | [AgentOS Overview](./11-agentos-overview.md) | Multi-agent orchestration: agents, missions, flows |
| 12 | [AgentOS Scripts](./12-agentos-scripts.md) | Reference for all AgentOS scripts and tools |
| 13 | [MiroFish Patterns](./13-mirofish-patterns.md) | Swarm intelligence: memory, graph, multi-spawn, history |
| 14 | [Agent Communication](./14-agent-communication.md) | Blackboard, signals, handoffs, status updates |

---

## Quick Start

- **New to the project?** Start with [00-overview.md](./00-overview.md).
- **Understanding the multi-agent system?** Start with [11-agentos-overview.md](./11-agentos-overview.md), then [13-mirofish-patterns.md](./13-mirofish-patterns.md).
- **Need the gateway contract?** Go to [04-gateway-ws-rpc.md](./04-gateway-ws-rpc.md).
- **Deploying or debugging?** See [07-deploy-systemd-nginx.md](./07-deploy-systemd-nginx.md) and [09-troubleshooting.md](./09-troubleshooting.md).
- **Security checklist?** See [08-security.md](./08-security.md).
- **Adding a new department/agent?** See the blueprint in [01-architecture.md](./01-architecture.md#9-blueprint-para-replicar-a-marketing-department) and the roadmap in [10-roadmap.md](./10-roadmap.md).
- **How agents communicate?** See [14-agent-communication.md](./14-agent-communication.md).

---

## Documentos del estado actual (AgentOS v1 — Marzo 2026)

> ⚠️ Los documentos 00–14 reflejan el estado del sistema a principios de marzo 2026.
> Los documentos 15–22 describen el estado **actual** (2026-03-31) con AgentOS v1 completo.

| # | Documento | Tema |
|---|-----------|------|
| 15 | [Agent Registry](./15-agents-registry.md) | Los 9 agentes: modelos, herramientas, protocolos y SOUL.md |
| 16 | [AgentOS Protocol v1](./16-agentos-protocol.md) | Flujo completo de 5 pasos, heartbeat, handoff, watchdog |
| 17 | [Cron Jobs](./17-cron-jobs.md) | Inventario completo de los 10 cron jobs activos |
| 18 | [Skills System](./18-skills.md) | 29 skills instalados, estructura, ciclo de vida |
| 19 | [Problemas y Riesgos](./19-known-issues-risks.md) | Issues activos, incidentes pasados, riesgos, deuda técnica |
| 20 | [Arquitectura Actual](./20-architecture-current.md) | Stack completo, diagrama, flujo de datos, límites de contexto |
| 21 | [Roadmap de Mejoras](./21-improvement-roadmap.md) | 16 mejoras priorizadas P0→P3 |
| 22 | [Config Reference](./22-config-reference.md) | openclaw.json completo (secretos REDACTED) |
| 23 | [Logs y Métricas — Marzo 2026](./23-system-logs-march2026.md) | 402 misiones, cron runs, errores, timeline de eventos del mes |

---

## Quick Start (actualizado)

- **¿Nuevo en el proyecto?** Start with [20-architecture-current.md](./20-architecture-current.md).
- **¿Cómo funciona la orquestación?** Lee [16-agentos-protocol.md](./16-agentos-protocol.md).
- **¿Qué hace cada agente?** Lee [15-agents-registry.md](./15-agents-registry.md).
- **¿Problemas conocidos?** Lee [19-known-issues-risks.md](./19-known-issues-risks.md).
- **¿Cómo mejorar el sistema?** Lee [21-improvement-roadmap.md](./21-improvement-roadmap.md).
- **¿Modificar configuración?** Lee [22-config-reference.md](./22-config-reference.md).

---

## Audit & Operations Docs

| Document | Purpose |
|----------|---------|
| [audit-repo.md](./audit-repo.md) | Repository scan: structure, dependencies, security, findings |
| [audit-server.md](./audit-server.md) | VPS state: services, ports, logs, drift analysis |
| [optimization-plan.md](./optimization-plan.md) | Prioritized backlog (P0/P1/P2) and PR roadmap |
