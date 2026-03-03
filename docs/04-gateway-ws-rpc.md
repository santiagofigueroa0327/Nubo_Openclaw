# 04 — Gateway real: WebSocket + RPC (Contrato definitivo)

Este documento es la **fuente de verdad** del “contrato” del Gateway en esta instalación.
La conclusión clave es:

- El Gateway sirve una **SPA** por HTTP (OpenClaw Control UI).
- El control/estado real ocurre por **WebSocket RPC** (no REST).

Esto explica por qué rutas como `/health` o `/status` pueden devolver HTML: el router SPA captura esas rutas.

---

## 1) Qué corre en el Gateway (dos capas)

### 1.1 Capa HTTP (SPA)
En `http://127.0.0.1:<PORT>/` se sirve HTML con:
- `<openclaw-app></openclaw-app>`
- assets `./assets/index-*.js` y `./assets/index-*.css`

Esto es “OpenClaw Control UI” (panel de control).

### 1.2 Capa WebSocket (RPC)
La UI se conecta a un WebSocket del mismo host/puerto para ejecutar RPC y recibir eventos.

---

## 2) URL del WebSocket (cómo la UI la calcula)

La UI deriva el WS URL así:
- Si la página está en HTTPS → `wss://`
- Si está en HTTP → `ws://`
- Host: `location.host`
- Base path: detectado por `__OPENCLAW_CONTROL_UI_BASE_PATH__` o por el path actual.

Ejemplo:
- Abriendo `http://127.0.0.1:18789/`
- WS: `ws://127.0.0.1:18789`

**Consecuencia operativa:**
- El gateway es un “todo en uno”: SPA + WS.
- Si el puerto responde HTML, no significa que “no haya API”; significa que la API es WS.

---

## 3) Autenticación

### 3.1 Authorization Bearer (modo token/password)
La UI construye el header:
- `Authorization: Bearer <token>`

La fuente del token en orden:
1) `hello.auth.deviceToken` (token emitido por el gateway tras handshake)
2) `settings.token` (token guardado en la UI)
3) `password` (si se usa auth por password; la UI lo transforma en Bearer también)

### 3.2 Tokenized URLs (para conectar rápido)
La UI acepta parámetros:
- `?token=...` o `#token=...`
- `?password=...` o `#password=...`
- `?session=...` o `#session=...`
- `?gatewayUrl=...` o `#gatewayUrl=...`

Uso típico:
- Copiar un link ya “tokenizado” para abrir el panel sin reescribir settings manualmente.

### 3.3 Device Identity + Pairing (modo operador)
La UI soporta un modo más seguro:
- genera identidad de dispositivo (public/private key) en localStorage
- firma el handshake con nonce (`connect.challenge`)
- soporta pairing (approve/reject) desde el gateway host

Errores típicos (codes observados):
- `PAIRING_REQUIRED`
- `DEVICE_IDENTITY_REQUIRED`
- `AUTH_TOKEN_MISSING`
- `AUTH_TOKEN_MISMATCH`, etc.

**Interpretación:**
- el sistema permite control de acceso más fuerte que “solo token”.

---

## 4) Versión del protocolo

Durante handshake, la UI usa:
- `minProtocol = 3`
- `maxProtocol = 3`

Esto implica que, al menos en esta versión, el control UI espera protocolo 3.

---

## 5) Formato del protocolo (mensajes)

### 5.1 Request
```json
{
  "type": "req",
  "id": "<uuid>",
  "method": "<rpc.method>",
  "params": { }
}
5.2 Response (success)
{
  "type": "res",
  "id": "<uuid>",
  "ok": true,
  "payload": { }
}
5.3 Response (error)
{
  "type": "res",
  "id": "<uuid>",
  "ok": false,
  "error": {
    "code": "UNAVAILABLE",
    "message": "request failed",
    "details": { }
  }
}
5.4 Event (server push)
{
  "type": "event",
  "event": "<eventName>",
  "payload": { },
  "seq": 123
}

Notas:

La UI monitorea seq y puede advertir “event gap detected”.

6) Handshake (connect + connect.challenge)

La UI intenta conectar y puede recibir un evento:

connect.challenge con nonce

Luego envía connect con un payload que incluye:

minProtocol, maxProtocol

metadata del cliente (id/version/platform/mode/instanceId)

role + scopes (ej. operador/admin en UI)

device identity (si está disponible)

auth (token/password)

Si el connect falla, el WS puede cerrarse con “connect failed”.

7) Métodos RPC (catálogo práctico)

Lista basada en lo observado en el bundle. Puede haber más métodos en el backend.
Estos son los relevantes para operación y debugging.

7.1 Core

status — estado general del gateway

health — health snapshot

last-heartbeat

connect

7.2 Modelos

models.list

7.3 Agentes / Identidad

agents.list

agent.identity.get

7.4 Tools / Catálogo / Skills

tools.catalog (incluye plugins)

skills.status

skills.update (enable/disable + apiKey injection)

skills.install

7.5 Sesiones

sessions.list

sessions.patch

sessions.delete

sessions.usage

sessions.usage.timeseries

sessions.usage.logs

7.6 Chat (intervención directa desde panel)

chat.history

chat.send

chat.abort

7.7 Logs

logs.tail

7.8 Presencia / instancias

system-presence

node.list

7.9 Cron jobs

cron.status

cron.list

cron.add

cron.update

cron.remove

cron.run

cron.runs

7.10 Pairing / Device tokens

device.pair.list

device.pair.approve

device.pair.reject

device.token.rotate

device.token.revoke

7.11 Exec approvals (seguridad)

exec.approvals.get

exec.approvals.set

exec.approvals.node.get

exec.approvals.node.set

7.12 Channels (estado / logout)

channels.status

channels.logout

8) Eventos (server push) observados

agent

chat

presence

cron

device.pair.requested

device.pair.resolved

exec.approval.requested

exec.approval.resolved

update.available

connect.challenge

9) Sobre HTTP /api/* (nota)

El bundle referencia rutas tipo:

/api/channels/nostr/<accountId>/profile (GET/PUT)

/api/channels/nostr/<accountId>/profile/import (POST)

Pero:

GET /api puede devolver HTML (SPA), mientras que rutas específicas pueden existir.

Para control general, el contrato estable es WS RPC.

10) Pruebas rápidas (operación)
10.1 Verificar que el gateway sirve la UI (HTTP)
curl -s -D- http://127.0.0.1:18789/ | head -n 20
10.2 Verificar que NO es REST (ejemplo)
curl -s -D- http://127.0.0.1:18789/health | head -n 20

Si devuelve HTML, es consistente con SPA.

10.3 Verificar WebSocket (manual)

Para pruebas WS, lo ideal es usar websocat o un cliente WS.
Si no está instalado:

instalar websocat o usar un script Node/Python.
(Se documenta en troubleshooting si se requiere.)

11) Implicaciones de diseño (para CloudCode)

Si Mission Control necesita datos, lo más robusto es:

conectarse por WS RPC y consumir status/health/sessions/cron/logs.

Evitar suposiciones “REST first”.

Centralizar auth (token/pairing) y mantener bind=loopback + proxy seguro.
