---
id: RULE-core-036
project: up1
type: rule
module: core
tags:
  - testing
  - auditoria
  - atribucion
  - userid
  - changelog
  - datalog
  - assertion
  - contrato
---

# Un test de auditoría/atribución debe asertar el `userId` resultante, no solo setear el actor

## What

Un unit/integration test que **setea el actor** pero NO **asierta el `userId` resultante** deja pasar bugs de atribución (un test 7/7 en verde con la atribución rota). La atribución (quién hizo el cambio, en `ChangeLog`/`DataLog`) es un **contrato** que MUST asertarse explícitamente con el valor concreto esperado, no darse por implícito porque el actor se seteó.

## Why

En TICKET-109 (F1), un test seteaba el actor y pasaba 7/7 aunque la atribución quedaba mal, porque nadie asertaba el `userId` final. Es un caso del principio general de assertions con valores concretos (no solo existencia/tipo): el resultado observable debe verificarse contra el valor esperado.

## Where

Tests de resolvers/motores que registran auditoría (`ChangeLog`, `DataLog`, cualquier campo de atribución `userId`/actor).

## When

Al escribir o revisar tests que tocan atribución de auditoría: agregar una assertion sobre el `userId` resultante, no solo sobre que la operación corrió.
