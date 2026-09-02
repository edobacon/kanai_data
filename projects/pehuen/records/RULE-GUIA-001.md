---
id: RULE-GUIA-001
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - movimiento
---

# `Guia.movimiento` es `Number` (1-5) — no ObjectId ni string enum

## What

El campo `Guia.movimiento` se almacena y se opera como `Number` con valores válidos 1, 2, 3, 4, 5. No es un ObjectId referenciando el modelo `Movimiento`, ni un string. Aunque existe el modelo catálogo `Movimiento` en nuxt, el campo en `Guia` debe permanecer como Number directo.

## Why

Toda la data legacy almacena `movimiento` como Number. Si nuxt cambiara a `ObjectId`, requeriría una migración masiva de la colección `guias` completa (posiblemente millones de documentos) y todas las queries que filtran por `movimiento` (ej. `{ movimiento: 1 }`) se romperían. Es un DELTA bloqueante documentado en improvements.md sección 9.1.

## Where

- **Files**: `server/models/guia.model.ts` (campo `movimiento: { type: Number }`), `shared/schemas/guia.schema.ts` (Zod: `z.number().int().min(1).max(5)`)
- **Tables**: colección `guias`, campo `movimiento`
- **Layers**: database, backend schema, shared schema

## When

En todo el ciclo de vida de una guía. La validación Zod debe garantizar que solo valores 1-5 (enteros) sean aceptados (corrección del bug legacy donde el rango no se validaba).

## Verification

- `grep -n "movimiento.*ObjectId\|ObjectId.*movimiento" server/models/guia.model.ts` → 0 matches.
- Test schema: `movimiento: 0` → rechazado. `movimiento: 6` → rechazado. `movimiento: 3` → aceptado.
- `db.guias.findOne({ movimiento: { $type: "objectId" } })` → 0 documentos.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` tabla campos: `movimiento: Number`. Contrato migración punto 2: "Movimiento como Number (no string ni enum schema-side)." `improvements.md` sección 9.1 DELTA-CUESTIONABLE: si nuxt cambia a ObjectId → "TODA la data legacy y queries rompen".
- **Related**: RULE-GUIA-002, DEC-001
