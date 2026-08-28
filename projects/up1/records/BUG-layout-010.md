---
id: BUG-layout-010
project: up1
type: bug
module: layout
tags:
  - layout
  - Vueform
  - modal
  - picker
  - FormBoundaryElement
  - lista-embebida
---

# Abrir el picker desde una lista embebida mataba todo el modal

## Symptom

Al abrir el picker de RecordDetail desde una lista embebida (una lista dentro de un modal de RecordDetail), el modal completo quedaba muerto: no respondia, y solo un refresh duro de la pagina lo recuperaba.

## Expected behavior

Abrir el picker desde una lista embebida no deberia afectar al modal contenedor. El walk de resolucion de path de Vueform deberia detenerse en el limite del formulario anidado, sin corromper el `contextId` de un componente externo.

## Root cause

File: paso de prefill del picker de RecordDetail (componente exacto no releido linea por linea; confirmado por `git show --stat` del commit `26f9e1af`)
Cause: Vueform arma el `path` de cada campo subiendo por `$parent` hasta encontrar el primer componente cuyo nombre matchea `/Element$/`, sin detenerse en el limite de un `<Vueform>` anidado. Abierto desde una lista embebida, ese walk cruzaba el limite del modal de prefill y llegaba hasta el `RecordListElement` que hostea la lista externa, corrompiendo el `contextId` resuelto y matando el mounted hook del select del picker.

## Fix

Se envuelve el formulario de prefill del picker en `FormBoundaryElement`, el mismo componente que `ModalStackManager` ya usa para el mismo proposito (frenar el walk de `$parent` de Vueform en el limite del formulario anidado).

## Impact

| Area | Antes | Despues |
|---|---|---|
| Picker abierto desde lista embebida | El walk de Vueform cruzaba al `RecordListElement` externo, corrompiendo `contextId` y matando el modal | El walk se detiene en `FormBoundaryElement`, el modal queda funcional |
| Recuperacion del error | Solo un refresh duro de la pagina | No aplica, el bug ya no ocurre |

## Reproduction

### Steps
1. Abrir un RecordDetail que contenga una lista embebida.
2. Desde una fila de esa lista, abrir el picker de referencia.
3. Verificar que el modal completo deja de responder, sin error visible, y que solo un refresh duro de la pagina lo recupera.

## Related

- **Rules**: ninguna registrada; patron reusable si aparece un tercer caso de Vueform cruzando limites de formulario anidado
