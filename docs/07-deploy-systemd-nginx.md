## 07 — Deploy: systemd + nginx (VPS `srv1364133`)

> Objetivo: que OpenClaw Gateway y Mission Control corran **sin depender de la terminal**, reinicien solos, y estén expuestos de forma controlada (nginx).

---

# 1) Componentes de deploy

## 1.1 Servicios (systemd --user)
- **OpenClaw Gateway**
  - Unit: `~/.config/systemd/user/openclaw-gateway.service`
  - Runtime: Node ejecutando `openclaw ... gateway`
  - Puerto: `18789` (loopback)
  - Auth: token (REDACTED) por env var

- **Mission Control (Next.js)**
  - Unit: `~/.config/systemd/user/mission-control.service`
  - WorkingDir: `~/nubo-dashboard/mission-control-review`
  - Puerto: `3010`

## 1.2 Reverse proxy (nginx)
- Site: `/etc/nginx/sites-enabled/mission-control`
- Escucha (observado): `listen 301;`
- Proxy a: `http://127.0.0.1:3010`

---

# 2) OpenClaw Gateway service (systemd)

## 2.1 Archivo real
Ruta:
- `~/.config/systemd/user/openclaw-gateway.service`

Contenido observado (resumen, sin secretos):
- `ExecStart=/usr/bin/node .../openclaw/dist/index.js gateway`
- `Restart=always`
- `RestartSec=5`
- env vars:
  - `OPENCLAW_GATEWAY_PORT=18789`
  - `OPENCLAW_GATEWAY_TOKEN=REDACTED`
  - `OPENCLAW_SYSTEMD_UNIT=openclaw-gateway.service`
  - markers internos (`OPENCLAW_SERVICE_*`)

## 2.2 Comandos operativos
Estado:
```bash
systemctl --user status openclaw-gateway.service

Reiniciar:

systemctl --user restart openclaw-gateway.service

Logs:

journalctl --user -u openclaw-gateway.service -e | tail -n 200

Probar HTTP local:

curl -I http://127.0.0.1:18789/

Nota: /health y /status pueden devolver HTML (SPA). El control real es WS RPC.

3) Mission Control service (systemd)
3.1 Archivo real

Ruta:

~/.config/systemd/user/mission-control.service

Resumen observado:

Type=simple

WorkingDirectory=%h/nubo-dashboard/mission-control-review

Environment=NODE_ENV=production

Environment=PORT=3010

ExecStart=/usr/bin/env bash -lc 'npm run start -- --port 3010'

Restart=always

RestartSec=2

3.2 Override (recomendado para tuning)

Ruta observada:

~/.config/systemd/user/mission-control.service.d/override.conf

Variables típicas (conceptual):

OPENCLAW_BIN=/home/moltbot/.npm-global/bin/openclaw

GATEWAY_READONLY=true

GATEWAY_POLL_SECONDS=30

GATEWAY_ACTIVE_MINUTES=120

GATEWAY_TASKS_LIMIT=80

GATEWAY_OPENCLAW_TIMEOUT_MS=5000

3.3 Comandos operativos

Estado:

systemctl --user status mission-control.service

Reiniciar:

systemctl --user restart mission-control.service

Logs:

journalctl --user -u mission-control.service -e | tail -n 200

Probar HTTP local:

curl -I http://127.0.0.1:3010
4) nginx: reverse proxy para Mission Control
4.1 Archivo real

Ruta:

/etc/nginx/sites-enabled/mission-control

Contenido observado (resumen):

server {
  listen 301;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
4.2 Validación y reload

Validar config:

sudo nginx -t

Reload:

sudo systemctl reload nginx

Probar proxy:

curl -I http://127.0.0.1:301
5) “systemctl --user” y persistencia sin terminal

Si alguna vez ves errores tipo:

Failed to connect to bus: No medium found

Soluciones típicas:

Asegurar que estás en sesión con systemd user activo (login normal).

Habilitar linger para que servicios user sigan sin sesión interactiva:

sudo loginctl enable-linger moltbot

Luego:

systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway.service
systemctl --user enable --now mission-control.service
6) Checklist de deploy (antes de darlo por listo)

 openclaw-gateway.service activo y habilitado

 mission-control.service activo y habilitado

 Gateway en loopback (127.0.0.1:18789)

 Mission Control en loopback (127.0.0.1:3010)

 nginx proxy funcionando (puerto 301 → 3010)

 .gitignore bloquea *.sqlite, .openclaw/, auth-profiles.json, .env

 Tokens/keys no están en el repo (buscar patrones: AIza, sk-, xoxb-, xapp-, botToken)
