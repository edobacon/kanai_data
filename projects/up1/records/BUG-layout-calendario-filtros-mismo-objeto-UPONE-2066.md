---
id: BUG-layout-calendario-filtros-mismo-objeto-UPONE-2066
project: up1
type: bug
module: layout
tags:
  - UPONE-2066
---

Cuando un calendario consulta un objeto relacionado (lista de Offering, calendario de Event), cada filtro sin punto se prefija con la relacion padre ("status" pasa a "offering.status"). Si lista y calendario son del mismo objeto, ese prefijo rompia los filtros. `adaptParentFilters(filters, parentRelation, adapt)` no los prefija cuando `adapt` es false, cuando no hay relacion padre o cuando el filtro ya trae una ruta con punto.

sourceRef: 7e157fd0 (UPONE-2066), src/utils/calendarFieldResolver.ts:215-231
