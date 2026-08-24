---
id: BR-TNT-001
project: up1
type: spec
module: curriculum-design
category: multi-tenancy
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, multi-tenant, aislamiento, curriculum-design]
---

# BR-TNT-001: Aislamiento por institucion

## Texto verbatim

- Todas las entidades pertenecen a una institucion o heredan la pertenencia via sus relaciones
- Las consultas siempre filtran por institucion
- Los datos de una institucion nunca son visibles para otra

## Aplicacion en Programa de asignatura

- Todos los objetos del mod (`Activity`, `CurricularSection`, `CurricularLink`, `BibliographyReference`) deben filtrar por `tenantId` (header `X-Tenant-ID` segun pattern up1).
- `BibliographyReference.institutionId` es el FK explicito a Institution (que es el tenant).
- `Activity` heredaria pertenencia via `executionUnitId → OrgUnit` cuando se resuelva.

## Estado de implementacion

Implementado: el mod opera en produccion como multi-objeto con `tenantId` agregado automaticamente por el codegen de up1 a todos los objetos del mod, y filtrado por `tenantId` respetado en las queries (header `X-Tenant-ID`).

## Referencias

- [BR-TNT-002](BR-TNT-002.md) (defaults vs custom)
- Critical rule de up1: "Toda query DEBE filtrar por tenantId"
