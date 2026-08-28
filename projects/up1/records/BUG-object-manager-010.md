---
id: BUG-object-manager-010
project: up1
type: bug
module: object-manager
tags:
  - filters
  - fk
  - type-coercion
  - referenceLike
---

# Filtro sobre campo FK fallaba por mismatch de tipo (string vs int de la PK referenciada)

## Symptom

Filtrar `listInstances` por un campo FK (`fieldType: "reference"`) fallaba o no matcheaba cuando el tipo de la PK del objeto referenciado no era string (ej. PK entera) - el filtro se forzaba a `String` en vez de coercionarse al tipo real de la PK referenciada.

## Root cause

- **File**: `src/graphql/resolvers/instance.resolver.js` (~línea 1902, verificado: comentario `UPONE-1497: a FK declared fieldType:"reference" must coerce the filter value by the referenced object's PK scalar type`).
- **Cause**: el tipo de campo FK se resolvía como `referenceLike` y `convertFilterValue` lo trataba como `stringLike` (`return String(value)`), sin consultar el tipo real de la PK del objeto referenciado vía `fkFieldMap`/`resolveReferencedIdType`.

## Fix

Cuando `getFieldTypeFamily(fieldType) === 'referenceLike'`, se busca `fkInfo = fkFieldMap.get(field)` y, si trae `references`, se resuelve el tipo real de la PK con `resolveReferencedIdType(fkInfo.references)` antes de construir la condición del filtro (`buildFilterCondition`).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier query `listInstances` con filtro sobre un campo FK cuya PK referenciada no es string |
| Data affected | ninguno (fix de lectura/filtrado, sin migración) |
| Modules affected | object-manager (resolver de filtros), layout/suite consumiendo listados filtrados por FK |
| Frequency | todo filtro por FK contra una PK no-string |
