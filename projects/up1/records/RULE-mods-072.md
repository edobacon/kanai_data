---
id: RULE-mods-072
project: up1
type: rule
module: mods
level: should
tags:
  - testing
  - guard
  - observability
  - events
  - transaction
  - curriculum-mapping
---

# Un guard cuyo efecto ningún test puede observar es un guard a medias: hacelo verificable

## What

Cuando agregues un guard (un chequeo que descarta, saltea o condiciona una escritura), el resultado del guard MUST ser observable por un test, no solo su intención. Dos formas concretas que aplican a las mutations custom de un mod:

1. **Emisión de eventos post-commit**: el evento lo emite únicamente la operación que ABRIÓ la escritura, y la marca que lo decide (`inTransaction`) la pone `runInTransaction`, estampada también en el fallback sin `$transaction`. La marca no significa "hay una transacción abierta" sino "no sos la operación de afuera", por eso existe también cuando el cliente no expone la transacción: un guard que solo existe cuando el cliente lo expone es un guard que ningún test puede ejercitar.
2. **Contadores e historial**: derivan de lo que la base ESCRIBIÓ, no del set en memoria que se le pidió escribir. Usar `updateManyAndReturn` (`UPDATE ... RETURNING`) en vez de `updateMany` + count, así una fila que el guard de carrera salteó queda visible en `closed`/`skipped` y no se cae del resumen ni entra falsa al historial.

## Why

En `matrixAdoption` (UPONE-1689, AD-19/AD-21) los dos bugs eran latentes e inexpresables por test con la forma vieja del código:

- El reconciliador llamaba al alta pasándole el ctx de SU transacción y el alta cerraba con su propio `safePublishEvent`, así que `matrixAdoption.added` salía ANTES del commit; si el reconciliador fallaba después, quedaba anunciada un alta de filas inexistentes (un evento no se retira). No explotaba solo porque el core no inyecta `publishTransitionEvent` en mutations custom (deuda declarada), se activaba el día que esa deuda se cerrara.
- El guard de carrera puede matchear MENOS filas de las que viajaron en el `IN`, y el `count` de un `updateMany` dice cuántas pero nunca cuáles. Con el set en memoria, la fila salteada quedaba registrada como cerrada sobre evidencia de acreditación y desaparecía del resumen (`{closed: 1, skipped: []}` con dos ids). El caso no tenía test porque con `updateMany` el mock solo podía mentir en el número; recién cuando la sentencia devuelve filas se puede escribir un mock que devuelva menos de las que se mandaron.

La lección de método: un guard sobrevive porque ningún test puede observar su efecto. Ver también [[rule-mods-073]] (la misma disciplina aplicada a la definición de "vigente"), y el guard descarta y GRITA en el log, no lanza (abortar un guardado que el usuario ya dio por bueno cambia un evento perdido por datos perdidos).

## Where

- `mods/curriculum-mapping/logic/matrixAdoption.resolver.js` (`safePublishEvent` gateado por `inTransaction`; `updateManyAndReturn` en el cierre en lote y el retiro del reconciliador)
- `mods/curriculum-mapping/logic/competencyMatrix-create.resolver.js`, `competencyMatrix-update.resolver.js` (`safePublishEvent` / `runInTransaction`)
- `mods/curriculum-mapping/CLAUDE.md` AD-19, AD-21 (decisión y razonamiento)
- Aplica a cualquier mod que emita eventos de dominio dentro de una transacción o que reporte contadores de un `updateMany`/`deleteMany` en lote.

## When

Al agregar un guard, un contador o una emisión de evento en una escritura de un mod. En code review: si un chequeo no tiene un test que observe su rama de descarte (no solo la feliz), es incompleto; pedí el test que ejercite el efecto del guard con un mock que devuelva menos filas de las pedidas, o el evento que NO debe salir antes del commit.
