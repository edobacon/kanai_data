---
id: RULE-GUIA-005
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - validacion
---

# `origen !== destino` — guía rechazada si son iguales

## What

En `POST /api/guias` y `PATCH /api/guias/:id`, si el valor de `origen` es igual al de `destino`, la operación debe rechazarse con error 400 (`'No puede tener el mismo origen y destino'` o mensaje equivalente).

## Why

Una guía de movimiento entre la misma cancha de origen y destino no tiene sentido operativo. Es un error de datos que el usuario pudo cometer al seleccionar el mismo elemento en ambos campos. El legacy lo valida explícitamente en el DTO.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (Zod `.refine(data => data.origen !== data.destino, ...)`)
- **Endpoints**: `POST /api/guias`, `PATCH /api/guias/:id`
- **Layers**: shared schema, backend

## When

En cada POST y PATCH de guía que incluya tanto `origen` como `destino`.

## Verification

- Test: `{ origen: 'abc123', destino: 'abc123' }` → 400 con mensaje sobre origen/destino iguales.
- Test: `{ origen: 'abc123', destino: 'def456' }` → pasa la validación de este punto.
- Test: `{ origen: '60e90cf10351b55538c40e46', destino: '60e90cf10351b55538c40e46' }` → también 400.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` DTO: "`origen === destino` → 'No puede tener el mismo origen y destino'". Contrato migración punto 6.
- **Related**: RULE-GUIA-004
