# P9 — Model Router: Smart Task-Based Model Selection

**Date:** 2026-03-31
**Session:** P9 — Model routing system implementation

---

## Overview

Implemented a model router that analyzes task complexity and recommends the optimal model per agent, reducing costs while maintaining quality.

## Architecture

```
User request → Nubo → dispatch-job → model-router.sh (classifies)
  → $JOB_DIR/model_override.txt → Nubo reads → sessions_spawn(model: "...")
  → Agent runs with optimal model
```

## Components

### 1. `model-router.sh` (`~/.openclaw/agentos/bin/`)
- **Rule-based scoring** (0-100) based on: keywords, message length, multi-step indicators, code patterns
- **LLM-assisted classification** (optional, via DeepSeek Chat ~$0.001/call) for ambiguous cases
- **Safety bias**: when rules and LLM disagree, uses the HIGHER tier (quality > cost savings)
- **Agent minimum tiers**: Zenith enforces T3+ (sonnet minimum), workers allow T1
- **Word-boundary matching**: prevents false positives ("dame" in "profundamente")

### 2. `model-router-config.json` (`~/.openclaw/agentos/`)
- Tier definitions (T1-T4)
- Agent-model mappings per tier
- Scoring parameters
- Keyword lists (simple, medium, complex, expert, quality)

### 3. Integration in `dispatch-job`
- Calls router after JOB_DIR creation
- Stores recommendation in `$JOB_DIR/model_override.txt`
- Full decision stored in `$JOB_DIR/router_decision.txt`
- Outputs `MODEL_OVERRIDE=` and `MODEL_TIER=` in --no-wait mode

### 4. Integration in SOUL.md Step 3
- Nubo reads `MODEL_OVERRIDE` from dispatch-job output
- Passes model parameter to `sessions_spawn(model: "recommended_model")`
- OpenClaw handles invalid models gracefully (falls back to default)

## Tier System

| Tier | Name | Zenith Model | Worker Model | When |
|------|------|-------------|-------------|------|
| T1 | Routine | _(not used)_ | deepseek/deepseek-chat | Simple lookups, greetings, notifications |
| T2 | Standard | _(not used)_ | google/gemini-2.5-flash | Research, extraction, email, cron |
| T3 | Capable | claude-sonnet-4-6 | gemini-2.5-flash | Complex code, reports, architecture |
| T4 | Expert | claude-opus-4-6 | claude-sonnet-4-6 | Production, security, critical systems |

## Test Suite

`test-model-router.sh` — 20 test cases covering:
- T1 routines (greetings, lookups)
- T2 standard tasks (research, cron)
- T3 capable tasks (coding, refactoring, architecture)
- T4 expert tasks (production migrations, security audits)
- Agent minimum tier enforcement
- Edge cases (empty tasks, multi-step, false positive prevention)
- LLM classifier integration (`--with-llm` flag)

**Results:** 20/20 passing (rules), 14/14 passing (rules+LLM)

## Routing Examples

| Task | Agent | Model | Tier | Score |
|------|-------|-------|------|-------|
| "Busca el clima de Bogota" | atlas | deepseek/deepseek-chat | T1 | 8 |
| "Crea un script Python para parsear CSV" | zenith | claude-sonnet-4-6 | T3 | 43 |
| "Notifica a Santiago que terminó" | flux | gemini-2.5-flash | T2 | 33 |
| "Sistema cache Redis producción zero downtime" | zenith | claude-opus-4-6 | T4 | 85 |
| "Extrae notas de la reunión" | chronos | gemini-2.5-flash | T2 | 28 |

## Cost Impact Estimate

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Simple worker tasks (T1) | gemini-flash | deepseek-chat | ~80-90% |
| Standard Zenith tasks (T3) | sonnet (from P8) | sonnet (confirmed) | 0% (already optimized) |
| Complex Zenith tasks (T4) | sonnet | opus (upgraded for quality) | -cost +quality |

**Net effect:** Simple tasks much cheaper, complex tasks get better models. Quality preserved by safety bias (always tier UP when uncertain).
