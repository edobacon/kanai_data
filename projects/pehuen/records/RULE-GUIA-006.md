---
id: RULE-GUIA-006
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - unicidad
---

# Unicidad de guías: `(guiaArauco, movimiento, estado === 'VIGENTE')`

## What

No pueden existir dos guías con el mismo `guiaArauco` y el mismo `movimiento` ambas en estado `'VIGENTE'`. Al intentar crear una guía duplicada, o al intentar reactivar (`NULA → VIGENTE`) una guía que ya tiene una vigente con mismos valores, se rechaza con 400. Guías en estado `'NULA'` no participan en la unicidad.

## Why

El número de guía Arauco es un documento legal. Tener dos guías vigentes con el mismo número y movimiento representaría un fraude o error operacional grave. El legacy valida esto explícitamente al crear y al cambiar estado.

## Where

- **Files**: `server/api/guias/index.post.ts`, `server/api/guia-status/[id].patch.ts`
- **Endpoints**: `POST /api/guias`, `PATCH /api/guia-status/:id`
- **Layers**: backend (query de existencia antes de persist)

## When

Al crear guía y al intentar cambiar estado de `'NULA'` a `'VIGENTE'`. La validación debe ocurrir dentro de la transacción o con un índice único parcial en MongoDB.

## Verification

- Test: crear dos guías con mismo `guiaArauco` y `movimiento`, ambas `VIGENTE` → segunda retorna 400.
- Test: crear guía, anularla, crear otra con mismo `guiaArauco` + `movimiento` → OK (segunda es VIGENTE, primera NULA).
- Test: anular guía, reactivarla cuando ya hay otra VIGENTE con mismos datos → 400.
- Índice MongoDB sugerido: `{ guiaArauco: 1, movimiento: 1, estado: 1 }` parcial con `{ partialFilterExpression: { estado: 'VIGENTE' } }`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` diagrama estados: "no puede haber 2 VIGENTE con mismo (guiaArauco, movimiento)". Validación al volver a VIGENTE: `guia.controller.ts:124-133`. Contrato migración punto 7.
- **Related**: RULE-GUIA-002, RULE-GUIA-007
