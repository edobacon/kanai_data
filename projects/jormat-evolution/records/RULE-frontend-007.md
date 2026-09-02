---
id: RULE-frontend-007
project: jormat-evolution
type: rule
module: frontend
level: must
tags:
  - frontend
  - dnd-kit
  - tabla
  - accesibilidad
  - html
---

# `DndContext` de dnd-kit envuelve la tabla COMPLETA (fuera de `<table>`), nunca entre `<thead>` y `<tbody>`

## What

Al agregar drag-and-drop (dnd-kit) a filas de una tabla, `DndContext` debe envolver la tabla **completa** (por fuera del elemento `<table>`); `SortableContext` puede quedar alrededor de `<tbody>`. Anidar `DndContext` DENTRO de `<table>` (entre `<thead>` y `<tbody>`) rompe el HTML: el modulo de accesibilidad de dnd-kit (`HiddenText`+`LiveRegion`) renderiza `<div>` como hijos directos de `<table>`, que no son un elemento de tabla valido — el browser los expulsa del arbol, rompiendo el layout y el aria.

## Why

Es un error silencioso: no lanza excepcion, el browser simplemente reubica los nodos invalidos fuera de la tabla, lo que rompe el layout visual y la exposicion de accesibilidad (live region) sin que un test unitario superficial lo detecte. Solo un reviewer revisando el HTML resultante (o un test que inspeccione la estructura DOM) lo atrapa.

## Where

- **Layers**: frontend (componentes de tabla con reordenamiento drag-and-drop via dnd-kit).
- Ejemplo origen: `LineItemsTable` (JOR-014, reviewer aislado Session 3).

## When

- Al agregar dnd-kit a cualquier tabla HTML nativa (`<table>`/`<thead>`/`<tbody>`).

## Verification

- `DndContext` es ancestro de `<table>` (no descendiente de `<thead>`/dentro de `<table>` directamente).
- El HTML renderizado no tiene `<div>` como hijo directo de `<table>` (inspeccionar con testing-library `container.innerHTML` o el DOM real).

## Source

- **Discovered in**: JOR-014, Session #3 (reviewer aislado, bug real P4).
- **Evidence**: L2 (DndContext anidado entre thead/tbody rompia HTML; fix: DndContext fuera de `<table>`, SortableContext alrededor de `<tbody>`).
