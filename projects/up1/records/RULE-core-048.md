---
id: RULE-core-048
project: up1
type: rule
module: core
tags:
  - rbac
  - public-objects
  - security
  - ownership
  - writes
---

# "Objeto publico" no habilita escritura: los writes pasan por el gate de capability y el owner es el usuario autenticado del request

## What

Un objeto marcado como `PUBLIC_OBJECTS` (apps, layouts, workflows n8n) solo exime del gate de capability las lecturas (`view`). Toda mutation (create/modify/delete) sobre esos objetos MUST pasar por el mismo `withObjectAuth` que cualquier otro objeto. La unica excepcion es declarativa y acotada: `ownedObjectAccess.js` autoriza por ownership de fila cuando la capability ya fallo, y solo para las formas que permiten estampar un owner (`create` con payload plano single-row; `modify`/`delete` con un solo id). El owner que se estampa o compara SIEMPRE es `context?.user`, el usuario autenticado del request, nunca un campo del payload que el cliente pueda falsificar.

## Why

Antes, la excepcion de objeto publico en `withObjectAuth` ignoraba la accion de la mutation: cualquier token de tenant valido podia crear, modificar o borrar apps, layouts o workflows n8n sin ninguna capability. El fix acota la exencion a `PUBLIC_ACTIONS = Set(['view'])` y agrega `ownedObjectAccess.js` como fallback de ultimo recurso, solo tras una denegacion de capability, y solo para las vistas privadas creadas desde el wizard del selector de layout.

Source_ref: `object-manager/src/services/auth/withAuth.js` (`const PUBLIC_ACTIONS = new Set(['view'])` seguido de la funcion `authorizeByOwnership`; import de `authorizeOwnedCreate`/`authorizeOwnedMutation` desde `./ownedObjectAccess.js`), `object-manager/src/services/auth/ownedObjectAccess.js`.

## Where

`object-manager/src/services/auth/withAuth.js`, `object-manager/src/services/auth/ownedObjectAccess.js`. Aplica a cualquier objeto listado como publico para lectura (apps, layouts, workflows n8n).

## When

Al agregar un objeto nuevo a la lista de objetos publicos, o al revisar un resolver que escribe sobre uno de ellos: confirmar que la exencion solo cubre `view` y que el owner de un write viene siempre de `context.user`, no de `args.data` ni de ningun campo del payload.
