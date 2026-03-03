# 06 — Mission Control (Next.js) — arquitectura, runtime y operación

Mission Control es el dashboard (Next.js) que se corre como servicio en el VPS para observar y operar el ecosistema.
Este repo ya contiene el código base y aquí documentamos **cómo está desplegado** y cómo se relaciona con OpenClaw.

---

## 1) Qué es Mission Control

- Aplicación **Next.js** (observado: `16.1.6`)
- Corre en modo producción (`next start`)
- Puerto interno: `3010`
- Se expone por nginx (config actual: `listen 301` → `127.0.0.1:3010`)
- Guarda estado/caching en SQLite:
  - `/home/moltbot/nubo-dashboard/mission-control-review/data/dashboard.sqlite`

---

## 2) Servicios y rutas en el VPS

### 2.1 systemd (user service)
Servicio real:
- `~/.config/systemd/user/mission-control.service`

Se ejecuta con:
- `WorkingDirectory=%h/nubo-dashboard/mission-control-review`
- `ExecStart=... npm run start ...`

Override real (observado):
- `~/.config/systemd/user/mission-control.service.d/override.conf`

### 2.2 nginx reverse proxy
Archivo real:
- `/etc/nginx/sites-enabled/mission-control`

Proxy:
- `proxy_pass http://127.0.0.1:3010;`
- headers para Upgrade / websockets

---

## 3) Variables de entorno relevantes (tuning)

En override se definieron variables para:
- limitar carga,
- aumentar cache hit rate,
- correr read-only,
- establecer polling más lento.

Ejemplos observados (conceptual):
- `OPENCLAW_BIN=/home/moltbot/.npm-global/bin/openclaw`
- `GATEWAY_READONLY=true`
- `GATEWAY_POLL_SECONDS=30`
- `GATEWAY_ACTIVE_MINUTES=120`
- `GATEWAY_TASKS_LIMIT=80`
- `GATEWAY_OPENCLAW_TIMEOUT_MS=5000`

Interpretación:
- Mission Control se usa como dashboard “de lectura” y observabilidad.
- Polling cada 30s para no saturar gateway/CPU.
- Límites para reducir trabajo por request y recortar histórico.

---

## 4) SQLite (persistencia local)

Logs observados indican:
- Inicializa SQLite en:
  - `/home/moltbot/nubo-dashboard/mission-control-review/data/dashboard.sqlite`

Implicaciones:
- No subir `*.sqlite` al repo.
- Si cambias ruta o permisos, Mission Control puede fallar.
- SQLite ayuda a:
  - caching,
  - snapshots,
  - performance del dashboard.

---

## 5) Relación Mission Control ↔ OpenClaw Gateway

Hay dos enfoques comunes (depende de implementación):
1) **WS RPC directo**:
   - Mission Control se conecta al gateway por WebSocket y consume `status/health/sessions/cron/logs`.
2) **Polling/CLI**:
   - Mission Control ejecuta `openclaw ...` (por `OPENCLAW_BIN`) y parsea salidas / snapshots.

En este entorno se configuró `OPENCLAW_BIN`, así que es probable que exista integración por CLI o fallback.

> El contrato “estable” del sistema es WS RPC. Ver `docs/04-gateway-ws-rpc.md`.

---

## 6) Operación (comandos útiles)

### 6.1 Status / restart
```bash
systemctl --user status mission-control.service
systemctl --user restart mission-control.service
6.2 Logs
journalctl --user -u mission-control.service -e | tail -n 200
6.3 Probar el puerto local
curl -I http://127.0.0.1:3010
6.4 Probar el proxy nginx (si aplica)
curl -I http://127.0.0.1:301
7) Buenas prácticas (para CloudCode)

Mantener Mission Control read-only por defecto en producción.

Evitar que Mission Control guarde secretos:

si necesita token de gateway, debe venir de env seguro, no en repo.

Si se va a pasar a WS directo:

implementar reconexión con backoff,

manejar event gaps,

soportar token/pairing de forma segura.

Mantener la carga baja:

polling moderado,

límites de tasks/historial,

caching SQLite.

8) Checklist antes de deploy

 mission-control.service está habilitado y activo

 nginx proxy apunta a 127.0.0.1:3010

 permisos de data/ correctos (sqlite)

 .gitignore bloquea data/ y *.sqlite

 variables env documentadas (sin secretos)
