---
id: RULE-RUMA-004
project: pehuen
type: rule
module: rumas
level: must
tags:
  - legacy-paridad
  - migration
  - schema
---

# `Ruma.producto` es `[String]` (códigos) — no `[ObjectId]`

## What

El campo `Ruma.producto` es un array de strings, donde cada string es el código del producto (no su ObjectId). Ejemplo: `['PRAD01', 'PRAD02']`. No es un array de ObjectId ni de referencias Mongoose.

## Why

El legacy almacena los códigos directamente en el array, no referencias. Cambiar a ObjectId requeriría migrar todos los documentos de rumas existentes y actualizar todas las queries de filtrado y populación. El formato de código string también permite usarlo directamente en filtros de display sin necesidad de populate.

## Where

- **Files**: `server/models/ruma.model.ts` (campo `producto: [{ type: String }]` o `[String]`), `shared/schemas/ruma.schema.ts`
- **Tables**: colección `rumas`, campo `producto`
- **Layers**: database, backend schema

## When

En todo el ciclo de vida de una ruma. Al crear, actualizar y consultar rumas.

## Verification

- `grep -n "producto" server/models/ruma.model.ts` → debe mostrar `[String]` o `[{ type: String }]`, no `ObjectId`.
- Test: crear ruma con `producto: ['PRAD01']` → `db.rumas.findOne().producto` es `['PRAD01']` (strings).
- `db.rumas.findOne({ producto: { $elemMatch: { $type: "objectId" } } })` → 0 documentos.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: comportamiento legacy del schema de ruma — `producto` almacenado como códigos string (verificar en `pehuen-server/src/models/ruma.model.ts`). Config `config.yaml`: entity `Producto` tiene códigos alfanuméricos.
- **Related**: RULE-RUMA-005
