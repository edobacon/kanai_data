---
id: RULE-core-016
project: up1
type: rule
module: core
tags:
  - testing
  - vitest
  - object-manager
  - file-paths
---

# Los tests de object-manager viven en `tests/`, NO en `src/**/__tests__/` — vitest.config solo incluye `tests/**`

## What

En `up1/object-manager`, el `vitest.config` define el glob de inclusion como **`tests/**/*.test.js` y `tests/**/*.spec.js`** unicamente. Cualquier archivo de test colocado en otra ubicacion (ej. `src/services/codegen/__tests__/foo.test.js` o `src/**/foo.test.js`) **NO es recogido por vitest** — el test existe pero nunca corre, dando falsa sensacion de cobertura.

Estructura canonica de tests:

- Unit: `tests/unit/<area>/<file>.test.js` (ej. `tests/unit/services/codegen/`, `tests/unit/resolvers/`)
- Integration: `tests/integration/<file>.integration.test.js`
- E2E / smoke: `tests/e2e/<file>.test.js`

**Anti-patron**: colocar tests junto al codigo en `src/**/__tests__/` por convencion de otros proyectos. En este repo no se ejecutan.

## Why

El glob de vitest esta acotado a `tests/**` por configuracion explicita del repo. Un test fuera de ese arbol no falla ni avisa — simplemente se ignora. El riesgo es alto: un dev escribe el test, lo ve "verde" (porque no corre y no rompe), y asume cobertura inexistente.

## Where

- **Files**: `up1/object-manager/vitest.config.*` (define `include`); arbol `up1/object-manager/tests/`
- **Layers**: backend (testing infra)

## When

Siempre que se cree o mueva un archivo de test en `object-manager`. Antes de asumir que un test corre, verificar que su path cae bajo `tests/`.

## Verification

```bash
# El include de vitest acota a tests/**
grep -n "include" up1/object-manager/vitest.config.*
# Expected: patrones 'tests/**/*.test.js' / 'tests/**/*.spec.js'

# Ningun test fuera de tests/
find up1/object-manager/src -name "*.test.js" -o -name "*.spec.js"
# Expected: 0 matches

# Confirmar que un test nuevo corre
npx vitest run tests/<area>/<file>.test.js --workspace=@uplanner/object-management-backend
```

## Source

- **Discovered in**: TICKET-033, Session 4 (L1) — el spec.task tenia path desactualizado `src/services/codegen/__tests__/`
- **Evidence**: El path desactualizado tripeo dos veces en el ticket: en S4 (codegen sync tests) y de nuevo al ubicar el smoke E2E en S8 (se corrigio a `tests/e2e/` — ver DEC-LOCAL-S8-01). Ambas veces el sintoma fue el mismo: test escrito en ubicacion no incluida por vitest.
- **Related**: DEC-LOCAL-S8-01 del TICKET-033 (smoke E2E en `tests/e2e/`)
