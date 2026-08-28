---
id: RULE-layout-044
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordDetail
  - Vue
  - watch
  - autoPopulate
  - callback-arity
---

# Un callback de `watch` recibe `(newValue, oldValue)`: envolverlo si el primer parametro no debe ser el valor observado

## What

Al pasar una funcion a `watch(source, fn)` de Vue, `fn` se invoca como `fn(newValue, oldValue, onCleanup)`. Si `fn` tiene un primer parametro con otro proposito (ej. un flag con default), Vue le inyecta `newValue` en ese parametro de forma silenciosa. Cuando el primer argumento NO debe ser el valor observado, envolver siempre el callback: `watch(source, () => fn(<arg-correcto>))`.

## Why

En `RecordDetail.vue`, `executePopulation` paso a recibir `isInitialMount = false` para limpiar dirty+validacion solo en el montaje. El watcher lo llamaba directo (`watch(src, executePopulation)`), asi que en cada cambio de un `watchField` Vue pasaba el `newValue` del campo como `isInitialMount`; un valor truthy activaba el reset durante una edicion real del usuario, suprimiendo la validacion del campo dependiente (UPONE-1540, hallazgo F-1). El unit del helper pasaba `false` explicito y quedaba verde, pero el call site de produccion pasaba `newValue`: un test que no refleja el cableado real consagra el bug.

## Where

- `layout/src/layouts/RecordDetail/RecordDetail.vue` (`setupAutoPopulationWatcher`): el `watch` de cada `watchField` se envuelve como `() => executePopulation(false)`; solo el disparo on-mount pasa `true`.

## When

Siempre que se agregue o cambie la firma de una funcion que ya se usa como callback directo de `watch` (o de cualquier API que inyecte argumentos posicionales: event handlers, `.map`, etc.). Verificar la aridad real del call site, no solo el unit que la prueba en aislamiento.

## Source

- **Discovered in**: UPONE-1540 (review de PR, hallazgo F-1)
