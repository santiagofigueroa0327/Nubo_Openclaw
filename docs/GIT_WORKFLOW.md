# Git Workflow — Nubo/OpenClaw

> Regla de oro: **todo cambio significativo al sistema va a GitHub el mismo día**.

---

## Estructura del repositorio

```
main (branch principal)
├── docs/              → Documentación de arquitectura, protocolos, sesiones
├── src/               → Código fuente de Mission Control (Next.js)
├── package.json       → Dependencias MC
└── README.md

fix/nubo-task-delivery-redesign-2026-03-17  → Branch de desarrollo activo MC
sprint0/...                                  → Branches de auditoría/docs iniciales
```

## Dónde vive el código

| Componente | Archivo/Directorio | Branch GitHub |
|---|---|---|
| Mission Control (fuente) | `src/` | `main` (sincronizado desde `mission-control-review`) |
| Documentación arquitectura | `docs/` | `main` |
| Config OpenClaw | `~/.openclaw/openclaw.json` | **NO versionar** (contiene secrets) |
| SOUL.md / workspace files | `~/.openclaw/workspace/` | **NO versionar** (paths absolutos, datos de runtime) |
| AgentOS scripts | `~/.openclaw/agentos/bin/` | **NO versionar** (binario cerrado) |

---

## Cuándo hacer commit

### Siempre hacer commit cuando:

1. **Se modifica `src/`** (cualquier cambio al Mission Control)
   ```bash
   cd ~/Nubo_Openclaw-main
   # actualizar src/ desde producción si es necesario:
   rsync -av --delete ~/nubo-dashboard/mission-control-review/src/ src/
   git add src/ && git commit -m "feat(MC): descripción del cambio"
   git push origin main
   ```

2. **Se documenta una sesión de trabajo** (P-series, fixes, auditorías)
   ```bash
   # En Nubo_Openclaw-main/docs/sessions/YYYY-MM-DD/
   git add docs/ && git commit -m "docs: descripción de la sesión"
   git push origin main
   ```

3. **Se cambia la arquitectura** (agentes, modelos, protocolos)
   - Actualizar `docs/20-architecture-current.md`
   - Commit con `docs: update architecture — descripción`

4. **Se agrega una funcionalidad relevante al MC**
   - Branch: `feat/nombre-funcionalidad-YYYY-MM-DD`
   - PR a `main` cuando esté listo

---

## Convención de commits

```
feat(MC): nueva funcionalidad en Mission Control
feat(agents): cambio en agentes/modelos
fix(MC): bugfix en Mission Control
fix(agents): fix en agentes/protocolo
docs: documentación, sesiones, arquitectura
chore: package.json, configs menores
```

---

## Qué NO versionar

- `~/.openclaw/openclaw.json` — tiene API keys
- `~/.openclaw/agents/*/auth-profiles.json` — credenciales
- `~/.openclaw/workspace/*.md` — archivos de runtime (SOUL.md tiene paths absolutos)
- `~/nubo-dashboard/mission-control-review/data/` — base de datos SQLite
- `node_modules/`, `.next/`, `*.sqlite`

El `.gitignore` ya cubre la mayoría. Verificar antes de `git add .`.

---

## Sincronizar Mission Control a GitHub

Cuando se hacen cambios en la app que corre en producción
(`~/nubo-dashboard/mission-control-review`), sincronizar al repo principal:

```bash
cd ~/Nubo_Openclaw-main

# 1. Copiar src/ actualizado
rsync -av --delete ~/nubo-dashboard/mission-control-review/src/ src/

# 2. Actualizar package.json si cambió
cp ~/nubo-dashboard/mission-control-review/package.json .
cp ~/nubo-dashboard/mission-control-review/package-lock.json .

# 3. Commit y push
git add src/ package.json package-lock.json
git commit -m "feat(MC): [descripción del cambio]"
git push origin main
```

---

## Branch del MC de desarrollo

El desarrollo activo del MC ocurre en:
- **Local**: `~/nubo-dashboard/mission-control-review` (branch `fix/nubo-task-delivery-redesign-2026-03-17`)
- **Remote**: `origin/fix/nubo-task-delivery-redesign-2026-03-17`

Para push directo desde ese repo:
```bash
cd ~/nubo-dashboard/mission-control-review
git add -p   # revisar qué agregar
git commit -m "feat/fix: descripción"
git push origin fix/nubo-task-delivery-redesign-2026-03-17
```

---

## Checklist de sesión de trabajo

Al terminar cualquier sesión que haya modificado el sistema:

- [ ] ¿Se modificó `src/`? → `rsync` + commit + push a `main`
- [ ] ¿Se documentó la sesión? → crear `docs/sessions/YYYY-MM-DD/` + commit + push
- [ ] ¿Se cambió la arquitectura? → actualizar `docs/20-architecture-current.md`
- [ ] ¿Hay branches locales sin push? → `git log --branches --not --remotes`
- [ ] ¿Los cambios en `mission-control-review` están pusheados? → verificar branch fix

---

*Última actualización: 2026-04-03*
