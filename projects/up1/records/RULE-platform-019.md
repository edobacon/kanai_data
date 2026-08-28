---
id: RULE-platform-019
project: up1
type: rule
module: platform
tags:
  - record-list
  - columnas
  - enrichment
  - core-FieldDefinition
---

# RecordList muestra solo columnas cuyo key es campo declarado/persistido del objeto (derivados descartados)

## What

El RecordList estandar solo renderiza columnas cuyo key matchea un campo en `core_FieldDefinition` del objeto (helper `availableFields` <- `getObjectFields`); columnas derivadas post-fetch se descartan en silencio.

## Why

`useColumnConfiguration.ts:149-156` filtra por fields declarados. Verificado en T087 (ISSUE-SP5-01): derivar columnas en enrichment no se ve en el RecordList. Para visibilidad de derivados, hay que declararlos en el layout o usar RecordDetail.

## Where

Layouts de RecordList (`default_ObjectName_list.json`).

## When

Feature que requiera columna derivada (calculo en runtime).

## Verification

Repro: enrichment que agrega campo derivado (key que no esta en core_FieldDefinition) -> no aparece como columna.

## Source

- **Discovered in**: TICKET-087
