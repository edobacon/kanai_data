---
id: BR-PRM-002
project: up1
type: spec
module: curriculum-design
category: permisos
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, permisos, cascada, curriculum-design]
---

# BR-PRM-002: Cascada de permisos

## Texto verbatim

- Los permisos se evaluan en cascada: institucion → facultad → programa → plan → seccion del syllabus
- Un permiso mas especifico sobrescribe uno mas general

## Aplicacion en Programa de asignatura

La cascada `institucion → facultad → programa` requiere el modelo de OrgUnit, que en SP2 esta postergado (ver [DECISION-002](../../decisions/DECISION-org-unit-defer.md)).

Mientras tanto, los permisos en SP2 se evaluan a nivel `Institution` y rol global del usuario. La cascada granular se activa cuando se resuelva la jerarquia organizativa.

## Estado de implementacion

Implementado a nivel `Institution`/rol global (RBAC granular por `requiredCapability` en tabs y secciones, UPONE-1393; ver [features/rbac.md](../../features/rbac.md)). La cascada granular via `OrgUnit` (institucion → facultad → programa) sigue pendiente de la jerarquia organizativa (ver [DECISION-002](../../decisions/DECISION-org-unit-defer.md)).

## Referencias

- [BR-PRM-001](BR-PRM-001.md)
- [BR-TNT-001](BR-TNT-001.md) (aislamiento por institucion — base de la cascada)
- [DECISION-002](../../decisions/DECISION-org-unit-defer.md) (OrgUnit postergado)
