---
id: BUG-platform-005
project: up1
type: bug
module: platform
tags:
  - recorddetail
  - autoassign
  - valuesource
  - gap
---

# `autoAssignFields` no soporta `MAX_PLUS_ONE` para auto-calcular `position`

## Symptom

El `valueSource` enum del `autoAssignFields` ([RecordDetail.vue:246](../../../up1/layout/src/layouts/RecordDetail.vue#L246)) NO incluye opciones tipo `MAX_PLUS_ONE`, `AUTO_INCREMENT`, `NEXT_IN_SEQUENCE` para calcular `MAX(position)+1` filtrado por `ownerId+recordType` al crear. Tampoco hay logica equivalente en `instance.resolver.js` que auto-asigne position cuando viene null.

## Expected behavior

`autoAssignFields` deberia incluir un `valueSource: "MAX_PLUS_ONE"` (o similar) con `sourceField` + filterContext para auto-calcular el siguiente position al crear. O el resolver deberia detectar `recordType+ownerId` y auto-asignar.

## Root cause

Capability gap en el feature de autoAssignFields — no se contemplo el caso "ordenar al final".

## Impact

El user debe ingresar `position` manualmente en el form de create de cada RT. Para campos de orden interno (no user-visible), expone un detalle tecnico que no deberia ser editable por user.

## Workaround

Mod-side: en el create form, calcular el next position en el setup y pasarlo via `payload.position` antes de la mutation. Patron implementado en `CompositeSectionTreeElement.submitForm` (Session 7) — auto-asigna `max(siblings.position) + 1` para create-root y create-child sin exponer position en el form.

Para fix real: PR a plataforma agregando `valueSource: "MAX_PLUS_ONE"` con `sourceField` + `filterContext`, o custom logic en `instance.resolver.js`.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L39 — Session 6 (2026-04-30) y Session 7 (2026-05-04)
