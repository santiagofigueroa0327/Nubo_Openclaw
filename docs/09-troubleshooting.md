09 — Troubleshooting (errores comunes y cómo resolverlos)

Este documento reúne los problemas que ya aparecieron en esta instalación y los fixes recomendados.

1) GitHub: git clone devuelve 500 (Internal Server Error)
Síntoma

git clone https://github.com/... → error 500

pero curl -I al repo devuelve 200

Causa probable

fallo temporal de GitHub / “git smart HTTP”

proxy intermedio / red

rate limiting o glitch transitorio

Solución (workaround confiable)

Descargar zip:

curl -L -o repo.zip https://github.com/<USER>/<REPO>/archive/refs/heads/main.zip

Descomprimir (si falta unzip):

sudo apt update
sudo apt install -y unzip
unzip -q repo.zip
Nota

El zip NO trae .git. Si quieres push/commit debes inicializar git:

cd <REPO>-main
git init
git checkout -b main
git remote add origin https://github.com/<USER>/<REPO>.git
2) Git: fatal: not a git repository
Síntoma

git status → “not a git repository”

Causa

repo descargado por zip (sin .git)

Fix

Inicializar git como arriba (sección 1).

3) Linux: unzip: command not found
Fix
sudo apt update
sudo apt install -y unzip
4) OpenClaw: /health o /status devuelven HTML
Síntoma

curl http://127.0.0.1:18789/health devuelve HTML (OpenClaw Control UI)

Causa

el gateway sirve una SPA por HTTP (no REST)

control real: WebSocket RPC

Fix / comprensión correcta

Usar OpenClaw Control UI o WS RPC (ver docs/04-gateway-ws-rpc.md)

No asumir endpoints REST “tipo API”.

5) systemd user: Failed to connect to bus: No medium found
Síntoma

al correr systemctl --user ... aparece el error

Causa típica

sesión no tiene systemd user bus activo (contexto no-login / entorno restringido)

Fix recomendado

Habilitar linger para el usuario:

sudo loginctl enable-linger moltbot

Luego:

systemctl --user daemon-reload
systemctl --user restart openclaw-gateway.service
systemctl --user restart mission-control.service
6) Mission Control reinicia mucho / consumo alto
Síntomas

muchos restarts en journalctl

memoria alta

CPU sube

Causas típicas

polling demasiado frecuente

timeouts demasiado bajos causando errores y loops

demasiadas tareas/sesiones listadas por request

Ajustes recomendados (env tuning)

En override de mission-control.service:

aumentar GATEWAY_POLL_SECONDS (ej. 30s)

ajustar GATEWAY_ACTIVE_MINUTES (ej. 120)

limitar GATEWAY_TASKS_LIMIT (ej. 80)

subir GATEWAY_OPENCLAW_TIMEOUT_MS si hay timeouts

Reiniciar:

systemctl --user daemon-reload
systemctl --user restart mission-control.service
7) “No responde el bot” (Telegram)
Checklist

Gateway está arriba:

systemctl --user status openclaw-gateway.service

Revisar logs del gateway:

journalctl --user -u openclaw-gateway.service -e | tail -n 200

Verificar policies:

DM policy pairing (¿requiere aprobación?)

group policy allowlist (¿grupo permitido?)

Verificar binding:

telegram accountId -> agentId correcto en openclaw.json

8) Pairing requerido / no autorizado (Control UI)
Síntomas

UI muestra “pairing required” o auth falla

Acciones

confirmar token correcto (sin espacios)

usar URL tokenizada

aprobar pairing desde el host (si aplica)

revisar eventos device.pair en panel “Nodes/Devices”

9) Exec approvals: comandos bloqueados
Síntomas

UI muestra request de approval

o comando se rechaza

Causa

exec.ask=always

denylist de nodes.denyCommands

approvals file no incluye ese comando/path

Fix (seguro)

aprobar explícitamente solo lo necesario

mantener denylist para cámara/screen/calendar/etc.

documentar cambios en approvals antes de relajarlos

10) Checklist de diagnóstico rápido (1 minuto)
# Gateway
systemctl --user status openclaw-gateway.service
curl -I http://127.0.0.1:18789/ | head -n 5

# Mission Control
systemctl --user status mission-control.service
curl -I http://127.0.0.1:3010 | head -n 5

# Logs recientes
journalctl --user -u openclaw-gateway.service -e | tail -n 50
journalctl --user -u mission-control.service -e | tail -n 50
