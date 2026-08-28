---
id: RULE-layout-040
project: up1
type: rule
module: layout
tags:
  - layout
  - enum
  - RecordDetail
  - view-mode
  - round-trip
---

# Campos enum en view-mode preservan el valor crudo además de la label traducida

## What

Al construir el form data de un campo enum en modo vista, `RecordDetail` debe conservar el valor crudo original (el que espera el backend) junto con la label traducida que se muestra al usuario. No alcanza con mostrar solo la label: si el usuario pasa de vista a edición, el form debe poder reeditar con el valor crudo, no con el texto traducido.

## Why

Dos fixes consecutivos tocaron el mismo flujo de enum en view-mode: primero se preservó la label traducida (commit fef065bd, 2026-07-24), y luego UPONE-1515 corrigió que el valor crudo se perdía al construir el form data de vista, rompiendo el round-trip al volver a editar. El patrón de dos fixes parciales sobre el mismo flujo es evidencia de que el contrato ("raw value + translated label", ambos presentes) no estaba documentado, por lo que el primer fix resolvió solo la mitad. Ver [[BUG-layout-008]].

## Where

- `layout/src/layouts/RecordDetail.vue` (construcción de form data para campos enum en modo vista; ~64 líneas modificadas en UPONE-1515, 2026-07-31).

## When

Al modificar la lógica de render o de construcción de form data para campos enum (o cualquier campo con transformación valor→label para mostrar), verificar que el dato que queda en el form es el valor crudo, y que la label traducida es solo una capa de presentación separada. Antes de mergear un fix de "no se traduce X en vista", validar que no se está reintroduciendo la pérdida del valor crudo.

## Source

- **Discovered in**: UPONE-1515
