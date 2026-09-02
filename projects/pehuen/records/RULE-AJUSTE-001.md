---
id: RULE-AJUSTE-001
project: pehuen
type: rule
module: ajustes
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - enum
---

# `Ajuste.tipoAjuste` solo acepta `'ADD'` o `'REDUCE'`

## What

El campo `Ajuste.tipoAjuste` es un string enum que acepta únicamente dos valores: `'ADD'` (agrega volumen al stock) y `'REDUCE'` (reduce volumen del stock). Cualquier otro valor debe rechazarse con 400.

## Why

El ajuste de stock tiene exactamente dos operaciones semánticas: sumar o restar. El enum binario refleja la realidad operativa del negocio y evita valores inválidos que no tendrían interpretación en los algoritmos de cálculo de stock.

## Where

- **Files**: `server/models/ajuste.model.ts` (campo `tipoAjuste: { type: String, enum: ['ADD', 'REDUCE'] }`), `shared/schemas/ajuste.schema.ts` (Zod: `z.enum(['ADD', 'REDUCE'])`)
- **Tables**: colección `ajustes`, campo `tipoAjuste`
- **Layers**: database, backend, shared schema

## When

En POST de ajuste individual y en carga batch desde Excel.

## Verification

- Test schema: `tipoAjuste: 'DELETE'` → rechazado. `tipoAjuste: 'ADD'` → aceptado.
- `grep -n "tipoAjuste.*enum\|enum.*ADD.*REDUCE" server/models/ajuste.model.ts` → debe mostrar `['ADD', 'REDUCE']`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/config.yaml` key_concepts: "Ajuste: corrección manual de stock (tipoAjuste 'ADD' o 'REDUCE')". Comportamiento legacy verificado en el schema de ajuste.
- **Related**: RULE-AJUSTE-002, RULE-AJUSTE-003
