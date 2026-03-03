08 — Seguridad (tokens, permisos, superficie de ataque y buenas prácticas)

Este documento define las reglas de seguridad para operar Nubo/OpenClaw y para mantener este repositorio limpio (sin secretos).
Es crítico porque el sistema integra canales (Telegram/Slack), ejecución de comandos (exec), gateway auth y credenciales de modelos.

Regla #1: este repo NO contiene keys/tokens reales.
Regla #2: cualquier secreto expuesto debe rotarse.

1) Activos críticos (lo que hay que proteger)
1.1 Credenciales de modelos

Google API keys (patrón típico: AIza...)

Anthropic keys (patrón típico: sk-ant-...)

Cualquier otro provider key/token

Riesgos:

consumo/costos no autorizados,

acceso indirecto a herramientas conectadas,

abuso de prompts/automatizaciones.

1.2 Credenciales de canales

Telegram bot tokens (formato típico: <digits>:<letters...>)

Slack bot tokens (patrón: xoxb-...)

Slack app tokens (patrón: xapp-...)

Riesgos:

toma de control del bot,

envío de mensajes maliciosos,

exfiltración de datos por canales.

1.3 Gateway auth token / password

Token del gateway (modo auth token)

Password del gateway (si se usa)

Riesgos:

acceso total al panel/WS RPC,

control del sistema (cron, sessions, logs, approvals),

abuso de herramientas.

1.4 Superficie “exec”

exec permite ejecutar comandos; aunque sea con approvals, es un vector importante.

Riesgos:

ejecución remota no deseada,

acceso a archivos y secretos locales,

persistencia maliciosa.

2) Principios de seguridad del despliegue actual
2.1 Gateway en loopback

bind=loopback minimiza exposición pública directa.

Ideal: exponerlo solo via proxy seguro (VPN/Tailscale) o acceso local.

2.2 exec.ask=always

Mantener exec.ask = "always" como “seguro” base.

Nunca habilitar exec silencioso sin un modelo de seguridad adicional.

2.3 Pairing / allowlists

DM policy “pairing” (en Telegram) evita acceso libre.

Group policy “allowlist” reduce spam/abuso.

tools.elevated.allowFrom.telegram limita quién puede usar acciones elevadas.

3) Reglas de repo (no filtrar secretos)
3.1 Archivos que NO se suben

Nunca commitear:

~/.openclaw/openclaw.json

~/.openclaw/agents/*/agent/auth-profiles.json

.env reales

bases SQLite (*.sqlite)

tokens de bots / gateway token

dumps de logs con secretos

Este repo solo debe tener:

documentación redactada,

*.example con REDACTED,

configs de ejemplo sin llaves.

3.2 Búsquedas rápidas antes de push (manual)

Antes de hacer commit/push, buscar patrones típicos:

git grep -nE "AIza|sk-|xoxb-|xapp-|botToken|appToken|OPENCLAW_GATEWAY_TOKEN|Bearer " || true
3.3 .gitignore recomendado (mínimo)

Asegúrate de ignorar:

**/auth-profiles.json

.openclaw/

*.sqlite

.env

data/

4) Rotación de credenciales (cuando algo se expone)

Si una key/token apareció en chat, logs o archivos:

4.1 Rotar en el proveedor

Google: rotar/revocar API key y generar una nueva.

Anthropic: rotar/revocar key.

Telegram: regenerar token (BotFather) o crear bot nuevo si aplica.

Slack: rotar tokens (reinstall app / regenerate).

4.2 Actualizar runtime (sin subir al repo)

Actualizar auth-profiles.json (main/zenith) para modelos.

Actualizar openclaw.json para gateway/canales.

Reiniciar servicios:

systemctl --user restart openclaw-gateway.service

systemctl --user restart mission-control.service (si depende de env)

4.3 Verificar

Revisa logs de gateway para errores de auth.

Prueba que el bot de Telegram responde (y que pairing/allowlist siguen).

Valida que Mission Control carga.

5) Controles operativos recomendados
5.1 Minimizar exposición externa

Mantener gateway en loopback.

Si necesitas acceso remoto:

usar túnel autenticado,

o VPN/Tailscale,

o proxy con allowlist de IP.

5.2 Roles/privilegios por “departamento”

Para replicar a Marketing u otros:

bots separados por departamento,

workspaces separados,

herramientas permitidas por departamento,

exec deshabilitado en departamentos que no lo requieran.

5.3 Cron jobs

Cron puede ejecutar tareas recurrentes.
Buenas prácticas:

sesiones aisladas para tareas automáticas,

límites de tiempo (timeoutSeconds),

entrega controlada (announce/webhook/none),

evitar cron con permisos elevados.

6) Checklist de seguridad (antes de “listo”)

 Gateway en loopback

 exec.ask=always

 Pairing/allowlists activas (Telegram/Slack)

 tools.elevated.allowFrom.telegram configurado

 .gitignore cubre secretos y sqlite

 git grep sin patrones de tokens

 Si hubo exposición: credenciales rotadas

Nota final

Si el objetivo futuro es “auto-mejora” (Zenith/Claude mejorando sistema):

separar repositorio (código+docs) de secretos (vault/secret manager),

definir un pipeline de cambios (PRs + revisión humana),

y mantener políticas estrictas sobre exec y pairing.
