# P8 — API Keys Rotation + COST_HARD_STOP Bypass + DeepSeek Integration

**Date:** 2026-03-31
**Session:** P8 — End-of-day fixes
**Trigger:** COST_HARD_STOP error + SOUL.md truncation + API key rotation request

---

## Diagnóstico del día

### Problema 1: SOUL.md 14,619 chars (CRÍTICO)
SOUL.md creció de 8,646 bytes (post-compresión 2026-03-25) a 14,619 bytes durante el día.
OpenClaw trunca workspace files en 12,000 chars → Nubo perdió reglas de delegación y corrió con contexto incompleto toda la sesión.

**Causa raíz:** Zenith y Nubo editaron SOUL.md como parte del trabajo P1-P7, añadiendo ~6,000 chars sin comprimir.

**Fix:** SOUL.md reescrito y comprimido a **9,481 chars** (bien bajo el límite de 11,000).

### Problema 2: COST_HARD_STOP reportado incorrectamente
El error real a las 21:50 UTC fue `⚠️ API rate limit reached` de **Gemini gemini-3.1-pro-preview** (rate limit de Google, no cost stop). Nubo lo reportó al usuario como "COST_HARD_STOP" — hallucination.

**El archivo señal `COST_HARD_STOP` no existía** — no hubo hard stop real de costo.

**Fix:** Implementado mecanismo de bypass para cuando el usuario lo autorice explícitamente.

---

## Cambios implementados

### 1. COST_HARD_STOP Bypass — `dispatch-job`
```bash
# ~/.openclaw/agentos/bin/dispatch-job
# Si existe COST_HARD_STOP_BYPASS y tiene < 4 horas → bypass autorizado
BYPASS_FILE="$HOME/.openclaw/agentos/COST_HARD_STOP_BYPASS"
if [[ -f "$BYPASS_FILE" ]]; then
  BYPASS_AGE=$(( $(date +%s) - $(cat "$BYPASS_FILE") ))
  if (( BYPASS_AGE < 14400 )); then
    echo "⚠️  COST_HARD_STOP bypassed por autorización del usuario" >&2
  else
    rm -f "$BYPASS_FILE"; exit 1
  fi
fi
```

**Cómo activar:** Nubo ejecuta `echo "$(date +%s)" > ~/.openclaw/agentos/COST_HARD_STOP_BYPASS` cuando Santiago lo ordene explícitamente. Expira automáticamente en 4 horas.

### 2. API Keys Rotadas
Todos los agentes (main, zenith, atlas, chronos, flux, hermes) actualizados en `auth-profiles.json`:
- Anthropic → nueva key `sk-ant-api03-5WCuhuwi...`
- Gemini → nueva key `AIzaSyCWaxLU...`
- OpenAI → nueva key `sk-proj-qcYM4H...`
- DeepSeek → **nueva** key `sk-6e36faf1...`

### 3. OpenAI Profile en openclaw.json
Añadido `openai:default` al `auth.profiles` en openclaw.json (existía en `order` pero faltaba la definición).

### 4. DeepSeek Integration
Configurado como custom OpenAI-compatible provider en `openclaw.json`:
```json
"models": {
  "providers": {
    "deepseek": {
      "api": "openai-completions",
      "apiKey": "sk-6e36...",
      "baseUrl": "https://api.deepseek.com/v1",
      "models": [
        {"id": "deepseek-chat", "name": "DeepSeek Chat", "contextWindow": 64000},
        {"id": "deepseek-reasoner", "name": "DeepSeek R1 Reasoner", "contextWindow": 64000}
      ]
    }
  }
}
```

### 5. Zenith: claude-opus → claude-sonnet
**Zenith primario cambiado de `claude-opus-4-6` → `claude-sonnet-4-6`** (opus como fallback).

Ahorro estimado: ~80% de costo en sesiones de Zenith. Sonnet es suficiente para implementación/coding.

### 6. Fallbacks actualizados
Workers usan ahora: `gemini-2.5-flash` → `deepseek/deepseek-chat` → `openai/gpt-4o-mini` → `claude-sonnet-4-6`

### 7. SOUL.md — Rule 11 (Bypass)
Agregada en ABSOLUTE RULES:
> Si Santiago explícitamente ordena bypasear el límite de costo, ejecutar: `echo "$(date +%s)" > ~/.openclaw/agentos/COST_HARD_STOP_BYPASS`

### 8. SOUL.md formato actualizado
Clarificado: **Chat directo = Markdown** (no HTML). **Scripts/telegram-notify = HTML**. Nunca mezclar.

---

## Estrategia de modelos post-rotación

| Caso de uso | Modelo | Costo aproximado |
|---|---|---|
| Nubo (orquestacion) | gemini-3.1-pro-preview | Moderado |
| Zenith (codigo) | claude-sonnet-4-6 | Moderado (~80% menos que opus) |
| Workers (investigacion, email, cron) | gemini-2.5-flash | Bajo/gratis |
| Tareas simples/JSON/extracción | deepseek/deepseek-chat | Muy bajo ($0.27/M input) |
| Razonamiento complejo | deepseek/deepseek-reasoner | Bajo ($0.55/M input) |
| Fallback emergencia | openai/gpt-4o-mini | Muy bajo |

---

## Estado post-implementación
- Gateway reiniciado y activo
- SOUL.md: 9,481 chars (bajo límite 11,000 ✓)
- openclaw doctor: 0 errores ✓
- Todas las keys actualizadas en 6 agentes ✓
