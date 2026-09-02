---
id: RULE-GUIA-009
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - defaults
  - schema
---

# Defaults numéricos: pesos, volúmenes, cantidades y fotos = 0 si no enviados

## What

Los siguientes campos numéricos de `Guia` tienen default `0` si no se incluyen en el body del POST:
- `pesoBrutoRecepcion`, `pesoBrutoDespacho`, `pesoNetoRecepcion`, `pesoNetoDespacho`
- `volumenRecepcion`, `volumenDespacho`
- `cantidadRollizoEntrada`, `cantidadRollizoSalida`
- `fotoEntrada`, `fotoSalida`

## Why

El legacy aplica estos defaults en el DTO (`fromPlainObject`). Sin ellos, los campos quedan `undefined` en MongoDB, lo que rompe operaciones matemáticas en reportes y stats que suman estos campos asumiendo valores numéricos.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (Zod: `z.number().default(0)` en campos opcionales numéricos), `server/models/guia.model.ts` (schema Mongoose con `default: 0`)
- **Tables**: colección `guias`
- **Layers**: shared schema, database

## When

En POST de guías cuando estos campos no se incluyen en el body.

## Verification

- Test: `POST /api/guias` sin `fotoEntrada` → guía creada con `fotoEntrada: 0`.
- Test: `POST /api/guias` con `movimiento: 1` (no requiere `pesoBrutoRecepcion`) → `pesoBrutoRecepcion: 0`.
- `grep -n "default.*0" server/models/guia.model.ts` → debe mostrar los campos numéricos con default 0.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` tabla campos: `pesoBrutoRecepcion: Number, default: 0`, `fotoEntrada: Number, default: 0`, etc. Contrato migración punto 12: "Defaults numéricos del DTO".
- **Related**: RULE-GUIA-011
