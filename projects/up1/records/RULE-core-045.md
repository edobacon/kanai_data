---
id: RULE-core-045
project: up1
type: rule
module: core
tags:
  - refactor
  - regresion
  - testing
  - sinks
  - decorators
  - args
  - unit-suite
  - delete
  - verificacion
---

# Al eliminar o reenrutar una rama de codigo: auditar todos los sinks del input y correr la suite completa

## What

Cuando un cambio **elimina o reenruta** una rama de codigo (p.ej. reasignar un parametro de entrada para que el flujo caiga por otro camino), dos verificaciones son obligatorias: (1) **auditar TODOS los sinks que consumen el input original** — eventos, DataLog/auditoria, logs, respuestas, wrappers/decorators — porque algunos leen el valor reasignado y otros el valor original de `args`; (2) correr la **suite unit COMPLETA** como regresion, no solo las suites del area tematica, porque unit mockeados en OTRO archivo pueden asertar los internals de la rama retirada.

## Why

- **Sinks divergentes**: al reasignar `objectType` a base en `deleteBulkInstances`, las publicaciones de evento pasaron a emitir el nombre base, mientras `deleteInstance` (via wrapper `withEventPublish` que lee `args.objectType`) seguia emitiendo el nombre RT. Divergencia de contrato downstream (n8n/BullMQ se suscriben por `objectType`) que los tests de estado de BD NO cazan. Fix: preservar `rawObjectType` para los sinks que leen el input original.
- **Regresion parcial**: al retirar la rama RT, correr solo 5 suites del area delete dejo pasar `recordType.resolver.test.js` (otro archivo) que asertaba la secuencia interna de la rama retirada; el pipeline (110 suites) lo cazo con 2 tests rojos.

## Where

Patron transversal. Ejemplos en `object-manager/src/graphql/resolvers/instance.resolver.js` (UPONE-1479): `rawObjectType` preservado para el evento `delete`; realineacion de `tests/unit/resolvers/recordType.resolver.test.js`. La suite completa se corre con `npm run test:unit` (o `test:ci:unit`), no solo `vitest run <area>`.

## When

Todo `work_type` que elimine/reemplace/reenrute una rama existente (fix, refactor, improvement). El diseno debe listar en la task de regresion: (a) el inventario de sinks del input tocado, (b) la corrida de la suite unit completa (o el subconjunto que mockea la rama), ademas de la matriz funcional. Un cambio que solo agrega codigo nuevo sin tocar ramas existentes queda exento de (1).
