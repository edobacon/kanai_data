---
id: RULE-layout-042
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordList
  - row-actions
  - deepClone
  - prefilledModal
  - opt-in
---

# Row action deepClone es opt-in explícito

## What

El handler `prefilledModal` de `RecordList` solo traspasa `prefillFrom.source` al `initialData` cuando la row action declara `action.deepClone === true`. Es opt-in explícito: sin esa propiedad, el motor de deep-clone no se activa, aunque el objeto tenga `prefillFrom.deepClone` declarado en su registry.

## Why

Reactivar el deep-clone sin gate rompía otros flujos de `prefilledModal` que no lo esperaban (UPONE-1450). El gate doble (`action.deepClone` en la row action + `prefillFrom.deepClone` en el registry del objeto) evita que declarar el registry por sí solo dispare el clone en acciones que no lo pidieron.

## Where

- `layout/src/layouts/RecordList.vue:2932-2938` (comentario explica la razón del gate opt-in; condición `if (action.deepClone === true && cloneSourceId !== undefined && cloneSourceId !== null)`).

## When

Al configurar una row action de tipo `prefilledModal` que debe clonar un registro existente, declarar `deepClone: true` en la action del layout JSON. No asumir que basta con que el objeto tenga `prefillFrom.deepClone` en su registry.

## Source

- **Discovered in**: UPONE-1450
