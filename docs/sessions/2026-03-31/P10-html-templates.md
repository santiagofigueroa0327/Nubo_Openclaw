# P10 — HTML Template System: Tiered Generation (T1-T5)

**Date:** 2026-03-31
**Session:** P10 — Tiered HTML template system for cost-efficient visual generation

---

## Overview

Implemented a 5-tier HTML template system where agents inject JSON data into pre-built templates instead of generating HTML/CSS/JS from scratch. Massive token savings and consistent visual quality.

## Tier System

| Tier | Template | Lines | CDN Dependencies | Use Case |
|------|----------|-------|-----------------|----------|
| T1 | `T1-compact.html` | 67 | None (system fonts) | Quick status reports, notifications |
| T2 | `T2-report.html` | 114 | Google Fonts (DM Sans) | Weekly reports, meeting summaries |
| T3 | `T3-dashboard.html` | 190 | Google Fonts | Dashboards with KPIs, tabs, progress bars |
| T4 | `T4-rich.html` | 293 | Fonts + Chart.js + GSAP | Complex reports with charts, animations, timelines |
| T5 | `T5-application.html` | 438 | Fonts + Chart.js | Full SPA: sidebar nav, search, export, dark/light toggle |

## Architecture

```
Agent receives task → selects tier → reads template
  → builds JSON data → replaces __REPORT_DATA__
  → saves HTML → delivers via delivery-router
```

### Token Savings Estimate

| Scenario | Before (generate from scratch) | After (inject JSON) | Savings |
|----------|-------------------------------|---------------------|---------|
| Simple report (T1) | ~2,000 tokens output | ~200 tokens (JSON only) | ~90% |
| Weekly report (T2) | ~4,000 tokens output | ~500 tokens | ~87% |
| Dashboard (T3) | ~8,000 tokens output | ~800 tokens | ~90% |
| Rich report (T4) | ~15,000 tokens output | ~1,500 tokens | ~90% |
| Full app (T5) | ~25,000+ tokens output | ~2,500 tokens | ~90% |

## File Structure

```
~/.openclaw/workspace/skills/html-generator/
├── SKILL.md (v2.0 — updated with tier system, schemas, feature matrix)
├── templates/
│   ├── T1-compact.html
│   ├── T2-report.html
│   ├── T3-dashboard.html
│   ├── T4-rich.html
│   └── T5-application.html
└── examples/
    ├── T1-example.json
    ├── T2-example.json
    ├── T3-example.json
    ├── T4-example.json
    └── T5-example.json
```

## Design System

- **Dark mode** across all tiers (T5 includes light mode toggle)
- **Color palette**: purple (#a855f7), blue (#3b82f6), green (#22c55e), red (#ef4444), amber (#f59e0b), cyan (#06b6d4), pink (#ec4899)
- **Typography**: System fonts (T1), DM Sans (T2-T3), Inter (T4-T5)
- **Responsive**: All tiers include mobile breakpoints

## Features by Tier

| Feature | T1 | T2 | T3 | T4 | T5 |
|---------|:--:|:--:|:--:|:--:|:--:|
| Items/Tables/Lists | ✅ | ✅ | ✅ | ✅ | ✅ |
| Badges | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trends (▲▼) | — | ✅ | ✅ | ✅ | ✅ |
| KPI Metrics | — | — | ✅ | ✅ | ✅ |
| Tabs | — | — | ✅ | — | — |
| Progress bars | — | — | ✅ | ✅ | ✅ |
| Charts (Chart.js) | — | — | — | ✅ | ✅ |
| GSAP Animations | — | — | — | ✅ | — |
| Timeline | — | — | — | ✅ | ✅ |
| Collapsible sections | — | — | — | ✅ | — |
| External links | — | — | — | ✅ | ✅ |
| Multi-page SPA | — | — | — | — | ✅ |
| Sidebar navigation | — | — | — | — | ✅ |
| Search/filter | — | — | — | — | ✅ |
| Export (JSON/CSV/PDF) | — | — | — | — | ✅ |
| Dark/Light toggle | — | — | — | — | ✅ |

## Integration

### Model Router ↔ HTML Tier Mapping

| Model Router Tier | Recommended HTML Tiers |
|-------------------|----------------------|
| T1 (Routine) | HTML T1 |
| T2 (Standard) | HTML T1, T2 |
| T3 (Capable) | HTML T2, T3, T4 |
| T4 (Expert) | HTML T3, T4, T5 |

### Agent Integration

- **Zenith SOUL.md**: Added HTML Templates section with tier reference and process
- **Flux SOUL.md**: Added compact HTML Templates reference
- Both agents can now select appropriate tier based on task complexity

## JSON Injection Process

1. Agent reads template: `read("templates/T{N}-{name}.html")`
2. Agent reads example for reference: `read("examples/T{N}-example.json")`
3. Agent builds JSON with real data following the schema
4. Replace `__REPORT_DATA__` with serialized JSON
5. Replace `__TITLE__` with document title
6. Save to `$JOB_DIR/evidence/report.html`
7. Deliver via `delivery-router`
