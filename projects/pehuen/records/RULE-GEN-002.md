---
id: RULE-GEN-002
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - calidad
  - logging
---

# No `console.log` en runtime — usar Winston logger via `server/plugins/logger.ts`

## What

Está prohibido usar `console.log`, `console.error`, `console.warn`, `console.trace` u otros métodos de `console` en código de producción. Todo logging debe usar el logger Winston configurado en `server/plugins/logger.ts`. En frontend (`app/`), no usar `console.log` en composables ni stores (solo en herramientas de debug en desarrollo).

## Why

El legacy tiene `console.log` y `console.trace(error)` dispersos en más de 50 controllers. En producción esto genera: logs sin estructura (difíciles de parsear con herramientas), sin niveles (no se puede silenciar debug), sin transports (no van a CloudWatch/Datadog). Winston provee logs JSON estructurados con niveles, transports configurables y formato consistente.

## Where

- **Files**: todo `server/` y `app/composables/`, `app/stores/`
- **Layers**: backend, frontend (composables/stores)

## When

Siempre. ESLint debe configurarse para reportar `console.*` como error en archivos de producción.

## Verification

- `grep -rn "console\.log\|console\.error\|console\.warn\|console\.trace" server/ app/composables/ app/stores/` → 0 matches en archivos que no sean tests o mocks.
- ESLint rule `no-console` configurada como `error` en `.eslintrc` para paths de producción.
- `grep -n "logger\." server/api/` → debe aparecer uso del logger Winston.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 2.2. `config.yaml` critical_rules: "Sin console.log en runtime; usar Winston logger via server/plugins/logger.ts". `pehuen_nuxt/CLAUDE.md` stack: `logger: winston`.
- **Related**: RULE-GEN-003
