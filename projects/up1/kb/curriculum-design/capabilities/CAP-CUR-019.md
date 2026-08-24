---
id: CAP-CUR-019
project: up1
type: spec
module: curriculum-design
status: in-spec
priority: must
actors: [coordinador-curso, director-programa]
external_refs: []
related: [CAP-CUR-014]
business_rules: [BR-WKF-001, BR-WKF-002]
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
tags: [curriculum-design, programa-asignatura, capability, workflow]
---

# CAP-CUR-019: Gestionar workflow del programa de curso

**Actores:** Coordinador, Director de Programa | **Prioridad:** Must

> **Implementado** (UPONE-1381): el campo es `status` (no `workflowState`), con 6 estados y transiciones declarativas gateadas por capability. El motor de workflow relacional (`WorkflowTransition`/`WorkflowStatus`) fue retirado y reemplazado por `properties.transitions` sobre el enum. Ver [features/enum-transitions.md](../../features/enum-transitions.md).

## Descripcion (verbatim)

Transicionar el programa entre estados (Borrador → Revision → Aprobado → Publicado).

## Reglas de negocio

- Ver: [BR-WKF-001](../business-rules/BR-WKF-001.md), [BR-WKF-002](../business-rules/BR-WKF-002.md)

## Resultado esperado

Programa en nuevo estado, transicion registrada.

## Estados (modelo real, campo `status`)

6 estados: `Draft`, `InReview`, `Approved`, `Active`, `Deprecated`, `Archived`. Declarados en `mods/curriculum-design/objects/activity.json:134-150` (`properties.transitions`), no en un `WorkflowStatus` relacional.

| From | To | Capability requerida | requiresComment |
|---|---|---|---|
| Draft | InReview | (ninguna) | no |
| InReview | Approved | `activity:approve` | no |
| InReview | Draft | (ninguna) | si |
| Approved | Active | `activity:publish` | no |
| Approved | Draft | (ninguna) | no |
| Active | Deprecated | `activity:deprecate` | si |
| Active | Draft | `activity:revert` | si |
| Deprecated | Archived | `activity:archive` | no |

## Notas de implementacion

- El guard de transiciones (`enforceEnumTransitions`) corre en `updateInstance` despues de auth y antes de `prisma.update()`; rechaza cualquier transicion no declarada en la tabla anterior.
- `requiresComment` esta declarado como metadata en el JSON, pero aun no lo enforcea el motor de enum de core (hoy no existe UI de transicion manual que lo consuma).
- Un guard adicional (`assertNoActiveDependentsOnRevert`) bloquea `Active` → `Draft` cuando el programa tiene matriculados activos.
- Solo en estados `Approved`/`Active` se permite versionar (`versionableFromStates`, ver [CAP-CUR-018](CAP-CUR-018.md)) y, segun el modelo de MADS, la herencia al syllabus ([BR-MIG-001](../business-rules/BR-MIG-001.md)).

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- [BR-WKF-001](../business-rules/BR-WKF-001.md), [BR-WKF-002](../business-rules/BR-WKF-002.md) (superseded, ver nota en cada uno)
- [features/enum-transitions.md](../../features/enum-transitions.md)
