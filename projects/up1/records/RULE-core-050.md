---
id: RULE-core-050
project: up1
type: rule
module: core
tags:
  - zod
  - validation
  - resolver
  - graphql
  - pattern
---

# Un resolver custom valida sus argumentos con zod `.strict()` via `withValidation`, ubicado fuera de auth y logging

## What

Un resolver custom que reciba argumentos estructurados SHOULD envolverse con `withValidation(schema, resolver)`, donde `schema` es un zod schema (idealmente `.strict()`). `withValidation` se compone con otros wrappers (`withObjectAuth`, `withDataLog`) y se aplica en la posicion mas externa, para que el input mal formado se rechace antes de que corran los checks de auth y el logging de auditoria.

## Why

Antes de este wrapper, un resolver custom validaba sus argumentos (si acaso) dentro del propio cuerpo, despues de auth y de cualquier logging, lo que dejaba pasar validacion inconsistente entre resolvers y auditaba intentos con input invalido como si fueran ejecuciones normales. `withValidation` unifica el contrato: en fallo, lanza un `GraphQLError` con `code: VALIDATION_FAILED` y `extensions.issues` (array de `{ path, message, code }`) sin llegar a auth ni a la auditoria; en exito, el resolver recibe `parsed.data` (zod ya aplico coercion y defaults). El patron ya se replico en up1-manager (`appRoles`/`objectRoles`), lo que confirma que conviene fijarlo como convencion.

Source_ref: `object-manager/src/services/graphql/withValidation.js:1-37`; `.ai/PATTERNS.md`.

## Where

`object-manager/src/services/graphql/withValidation.js`. Aplica a cualquier resolver custom nuevo con argumentos estructurados (`saveConfig`, `manageObjectRoles`, `getInstance`, `getVersionChain` ya lo usan).

## When

Al escribir un resolver custom nuevo: envolverlo con `withValidation(schema, resolver)` como capa mas externa, antes de decidir si tambien necesita `withObjectAuth`/`withDataLog`.
