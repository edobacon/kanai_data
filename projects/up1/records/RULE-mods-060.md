---
id: RULE-mods-060
project: up1
type: rule
module: mods
tags:
  - academic-scheduling
  - scenario
  - reconciliation
---

# runScenario acepta draft/completed/failed; una fila de asignación se borra solo si las 3 dimensiones quedan vacías

## What

`runScenario` (mutation que dispara al motor externo de asignación) debe aceptar un `Scenario` en
estado `draft`, `completed` o `failed` para (re)correrlo - no solo `draft`. Estados `running` no se
pueden re-correr (conflicto). Al reconciliar asignaciones manuales (instructor/sala/bloque horario),
una fila de `ScenarioSectionAssignment` se elimina únicamente cuando las TRES dimensiones (instructor,
sala, bloque) quedan vacías tras la operación; si queda al menos una dimensión poblada, la fila se
actualiza (null-out parcial), nunca se borra.

## Why

Antes solo `draft` podía re-correrse, bloqueando el flujo de reintento después de una corrida fallida
del motor externo. La reconciliación tri-dimensional evita perder asignaciones manuales parciales
(ej. instructor ya asignado a mano) cuando se limpia solo la dimensión de bloque horario: si se
borrara la fila entera al vaciar una sola dimensión, se perdería el resto de la asignación. El mismo
patrón de reconciliación se repite en el fix de forced timeblock codes ([[BUG-mods-011]]).

## Where

- `mods/academic-scheduling/logic/runScenario.resolver.js:114` (estados válidos:
  `scenario.status !== 'draft' && scenario.status !== 'completed' && scenario.status !== 'failed'`
  lanza conflicto; `running` también rechaza vía chequeo separado línea 111).
- `mods/academic-scheduling/logic/assign-timeblock.resolver.js` (reconciliación tri-dimensional,
  sección §4.4 del header del archivo; dedup post null-out y borrado condicional a las 3 dimensiones
  vacías).

## When

Al modificar `runScenario`, cualquier resolver de asignación (`assign-instructor`, `assign-resource`,
`assign-timeblock`) que borre o modifique filas de `ScenarioSectionAssignment`, o al agregar nuevas
dimensiones de asignación al modelo.
