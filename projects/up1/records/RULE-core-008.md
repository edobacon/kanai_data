---
id: RULE-core-008
project: up1
type: rule
module: core
tags:
  - graphql
  - crud
  - api
  - pattern
---

# CRUD generico: createInstance/updateInstance/deleteInstance con objectType

## What

El CRUD de objetos usa mutations genericas: createInstance(objectType, data), updateInstance(objectType, id, data), deleteInstance(objectType, id). No se generan mutations por objeto (no existe createStudyNote). Queries: getInstance(objectType, id), getInstances(objectType, filters).

## Why

El codegen genera un schema generico que opera sobre cualquier objeto via objectType. Los resolvers custom (en logic/) extienden este CRUD pero no lo reemplazan.

## Where

object-manager/src/graphql/resolvers/

## When

Al interactuar con la API GraphQL para operaciones CRUD.

## Verification

Usar createInstance con objectType, no intentar mutations con nombre de objeto.

## Source

- **Discovered in**: —
