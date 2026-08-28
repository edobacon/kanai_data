---
id: RULE-mods-027
project: up1
type: rule
module: mods
tags:
  - graphql
  - mutation
  - platform-typedef
---

# `InstanceResult` GraphQL solo expone `{ id, data, extended }`

## What

Las mutaciones `createInstance`/`updateInstance` retornan tipo `InstanceResult` con shape **solo** `{ id, data, extended }`. NO existen `success`, `message`, `instance` ni similares ([up1/object-manager/src/graphql/typeDefs/static.js](../../../up1/object-manager/src/graphql/typeDefs/static.js)). Pedir solo `{ id }` y confiar en `result.errors` para detectar fallas.

```graphql
mutation CreateInstance($objectType: String!, $data: JSON!) {
  createInstance(objectType: $objectType, data: $data) {
    id
  }
}
```

## Why

GraphQL valida shape al validar la query → response 400 "Cannot query field 'X' on type 'InstanceResult'" antes de ejecutar el resolver. Asumir convenciones tipo "Result" wrapper rompe la mutation.

## Where

Cualquier custom Vueform element o composable del mod que use `apolloClient.mutate({ mutation: CREATE_INSTANCE | UPDATE_INSTANCE })`.

## When

Al escribir/copiar mutaciones. Verificar con `static.js` o `__schema { types ... }` introspection.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L40 — Session 6 (2026-04-30)
