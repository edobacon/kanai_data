---
id: BUG-platform-006
project: up1
type: bug
module: platform
tags:
  - vueform
  - hidden-field
  - grid
  - ux
---

# Vueform con `type: "hidden"` intercalado rompe el flow del grid

## Symptom

Un field declarado como `type: "hidden"` en el schema JSON ocupa **un slot virtual del grid CSS** aunque no se renderice visualmente — interrumpe el flow de columnas (`columns.container`) de los fields adyacentes. Sintoma observado: 3 fields con `cols 4` en una fila esperada (12 cols total) se desordenan: 2 entran en una fila + 1 cae a la siguiente.

## Expected behavior

Fields hidden no deberian ocupar slot del grid. Deberian ser invisibles a la layout system.

## Root cause

Vueform itera sobre el schema en orden de declaracion y renderiza placeholders, incluyendo hidden. El grid CSS reserva el slot para mantener consistency con el orden declarado.

## Impact

UX: layout del form se rompe visualmente cuando declaras un hidden intercalado. Usuario ve campos "fuera de lugar" sin razon aparente.

## Workaround

Declarar fields `type: "hidden"` siempre **al final del schema** (o agruparlos en una zona aparte). Ejemplo: en `default_AcademicActivity_create.json`, mover `workflowState` despues de `description` solucio el grid.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L43 — Session 6 (2026-04-30)
