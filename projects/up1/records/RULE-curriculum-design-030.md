---
id: RULE-curriculum-design-030
project: up1
type: rule
module: curriculum-design
tags:
  - tabs
  - v-show
  - react-cache
  - refetch
  - keep-alive
---

# Tabs con `v-show` (sin keep-alive) requieren refetch manual tras mutaciones cache

## What

Si una vista tiene tabs con `v-show` (sin `<keep-alive>`) y el usuario edita data via modal en otra tab, la primera tab no se reactiva automaticamente al volver; ofrecer boton manual 'Actualizar' -> `refetch()`.

## Why

`CurriculumMeshElement` nunca se desmonta/reactiva (solo cambia via `display:none`); editar `requirementCategory.color` (modal apilado) no se refleja al volver. `onActivated` no aplica (no hay ciclo activate/deactivate). Reactividad Instantanea requeriria bus de eventos cross-mod (suite/otro mod).

## Where

Cualquier vista del mod con tabs `v-show` (malla, lineas de formacion).

## When

Implementacion de mutacion en modal apilado sobre tab `v-show`.

## Verification

Repro: editar color categoria -> volver a tab malla -> cambio no se ve -> click 'Actualizar' -> si.

## Source

- **Discovered in**: TICKET-088
