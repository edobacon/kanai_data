---
id: RULE-GUIA-002
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - estado
---

# `Guia.estado` es string enum `'VIGENTE' | 'NULA'` con default `'VIGENTE'`

## What

El campo `Guia.estado` acepta exactamente dos valores: `'VIGENTE'` o `'NULA'`. El default es `'VIGENTE'`. No existe ningún otro estado posible (no hay `'ANULADA'`, `'ELIMINADA'`, `'INACTIVA'`). El toggle se realiza vía `PATCH /api/guia-status`.

## Why

Es la representación exacta del modelo de negocio legacy y el schema Mongoose. El cliente hace queries filtrando por `estado === 'VIGENTE'`, las unicidades dependen de este campo, y cualquier valor distinto rompe la lógica de validación de unicidad y los filtros de listado.

## Where

- **Files**: `server/models/guia.model.ts` (campo `estado: { type: String, enum: ['VIGENTE', 'NULA'], default: 'VIGENTE' }`), `shared/schemas/guia.schema.ts` (Zod: `z.enum(['VIGENTE', 'NULA'])`)
- **Tables**: colección `guias`, campo `estado`
- **Endpoints**: `PATCH /api/guia-status/:id`
- **Layers**: database, backend, shared schema

## When

Al crear una guía (default automático). Al cambiar estado (toggle explícito). Al validar unicidad.

## Verification

- `grep -n "estado.*enum\|enum.*VIGENTE" server/models/guia.model.ts` → debe mostrar `['VIGENTE', 'NULA']`.
- Test: crear guía sin `estado` → `estado === 'VIGENTE'` en respuesta.
- Test: toggle status → `estado` cambia entre `'VIGENTE'` y `'NULA'`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` snippet schema: `estado: { type: String, enum: ['VIGENTE', 'NULA'], default: 'VIGENTE' }`. Contrato migración punto 1.
- **Related**: RULE-GUIA-006, DEC-014
