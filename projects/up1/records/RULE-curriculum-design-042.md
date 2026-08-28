---
id: RULE-curriculum-design-042
project: up1
type: rule
module: curriculum-design
tags:
  - curriculummesh
  - vueform
  - tabs
  - v-show
  - keep-alive
  - onactivated
  - lifecycle
  - refetch
  - reactividad
---

# Los tabs de malla / líneas de formación son un Vueform siempre montado: `onActivated` no aplica, usar refetch manual

## What

La malla y "líneas de formación" son **tabs de un mismo Vueform siempre montado** (`v-show`, sin `<keep-alive>`), y editar una categoría es un **modal apilado** sobre esa vista. Por eso `CurriculumMeshElement` **nunca se desmonta ni se reactiva**: no hay ciclo activate/deactivate, así que `onActivated` NO es viable para refrescar datos al volver de una edición. La solución mod-only es un **botón manual "Actualizar" → `refetch()`**. La reactividad instantánea (cache Apollo normalizada / event bus) queda como mejora futura porque tocaría suite u otro mod.

## Why

En TICKET-088 (S5, L14), editar color/ícono de una categoría no se reflejaba al volver a la malla porque el componente nunca se re-montaba. Asumir `onActivated`/re-mount lleva a "datos viejos" silenciosos.

## Where

`CurriculumMeshElement` y cualquier vista dentro de los tabs del Vueform de malla/líneas de formación.

## When

Al necesitar refrescar datos tras una edición dentro de estos tabs: usar refetch manual, no confiar en el ciclo de vida de activación.
