---
id: RULE-mods-036
project: up1
type: rule
module: mods
tags:
  - eslint
  - tooling
  - quality
---

# Todo mod del monorepo debe tener `eslint.config.js` propio

## What

Cada mod en `up1/mods/<modname>/` DEBE incluir un archivo `eslint.config.js` (flat config, ESLint v9+) en su raiz, junto con scripts `lint` y `lint:fix` declarados en su `package.json`. La config del mod hereda de `up1/layout/eslint.config.js` ajustando los disables y overrides necesarios por contexto del mod (ej: atoms reusados, convenciones Vueform, sanitizers, stubs intencionales).

**Criterios obligatorios**:

1. `eslint.config.js` en la raiz del mod
2. `package.json` del mod declara:
   ```json
   "scripts": {
     "lint": "../../node_modules/.bin/eslint .",
     "lint:fix": "../../node_modules/.bin/eslint . --fix"
   }
   ```
3. El comando `npm run lint` ejecuta sin error de configuracion y el resultado es `0 problems` cuando el codigo cumple la config.
4. La config NO ignora `modsComponents/` (a diferencia del layout config que SI los ignora explicitamente — los SFCs custom + helpers TS del mod deben ser linteables).
5. Los disables y overrides aplicados en la config deben estar documentados en `.ai/PATTERNS.md` del mod con la razon (ej: RULE-mods-014 justifica disable de `vue/no-reserved-component-names`).

**No retroactiva**: la rule aplica a mods nuevos creados despues de TICKET-013 (cerrado 2026-05-07). Para mods existentes sin config (`ai-agent`, `retention-wellbeing`, `object-manager-editor`, `flow-viewer`, `hello-world-mod`), la migracion se hace caso a caso en tickets separados (con coordinacion platform para `hello-world-mod` que es el template).

## Why

Pre-TICKET-013, ningun mod del monorepo tenia config eslint propia. Aunque `up1/layout/eslint.config.js` existe, ignora `modsComponents/` (linea 47), por lo que los SFCs custom + helpers TS de mods nunca eran lintedos cuando alguien intentaba hacerlo desde layout. Resultado:

- Cambios al codigo del mod entran sin quality gate objetivo (order-in-components, prop-types, v-html sin sanitizer, etc. no se detectan en code review)
- Drift potencial entre mods: cada uno con conventions ad-hoc, sin pattern compartido
- Reviewers sin criterio automatizable

Validado empiricamente en TICKET-013 sobre `curriculum-design`: lint ad-hoc reporto 21 problemas (10 errors + 11 warnings) — 5 accionables reales (3 auto-fix `vue/order-in-components` + 2 manual `vue/require-prop-types`). Sin la config del mod, esos 5 nunca se hubieran detectado.

Tener config propia + scripts en cada mod establece quality gate consistente, valida en CI/local, y crea pattern replicable para futuros mods.

## Where

- **Files**:
  - Config: `up1/mods/<modname>/eslint.config.js`
  - Scripts: `up1/mods/<modname>/package.json`
  - Docs: `up1/mods/<modname>/.ai/PATTERNS.md` (seccion "Lint del mod")
- **Layers**: tooling, quality

## When

- Al crear un mod nuevo (debe nacer con eslint.config.js + scripts)
- Al revisar un PR que crea un mod (verificar que los 3 archivos cumplen los criterios)
- Al actualizar el template `hello-world-mod` (ticket separado tras coordinacion platform)
- NO retroactiva a mods existentes — migrar caso a caso

## Verification

- Grep en `up1/mods/*/`:
  - Cada mod tiene `eslint.config.js` en la raiz: `ls up1/mods/*/eslint.config.js`
  - Cada `package.json` declara scripts `lint` y `lint:fix`: `grep -l '"lint":' up1/mods/*/package.json`
- Manual:
  - `cd up1/mods/<mod> && npm run lint` ejecuta y reporta exit 0 con "0 problems"
  - `.ai/PATTERNS.md` documenta los disables y razon
- Auditoria periodica: `for d in up1/mods/*/; do test -f "$d/eslint.config.js" || echo "MISSING: $d"; done`

## Source

- **Discovered in**: TICKET-013, Session 2 (execute) — UPONE-1038
- **Evidence**:
  - Pre-ticket: ningun mod (`ai-agent`, `retention-wellbeing`, `object-manager-editor`, `flow-viewer`, `hello-world-mod`) tenia eslint.config — verificado al hacer intake.
  - layout/eslint.config.js linea 47 ignora `modsComponents/` — confirma que el config layout NO cubre mods.
  - 21 hallazgos detectados en `curriculum-design` al ejecutar lint con config layout sin el ignore — 5 accionables reales que estaban sin quality gate.
  - Post-ticket: curriculum-design es el primer mod con config propia. `npm run lint` exit 0, 0 problems.
- **Related**:
  - SPEC-curriculum-design-improve-eslint (spec de TICKET-013)
  - DEC-LOCAL-01 del spec (ESLint usa binario monorepo, no devDeps locales)
  - DEC-LOCAL-02 del spec (esta rule promovida al cierre)
  - RULE-mods-014 (atoms del layout-library — justifica disable de `vue/no-reserved-component-names` en mods)
  - RULE-platform-001 (CSS inline en SFCs Vueform — refuerza por que un mod necesita lint que cubra sus modsComponents)
