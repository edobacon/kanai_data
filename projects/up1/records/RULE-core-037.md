---
id: RULE-core-037
project: up1
type: rule
module: core
tags:
  - security
  - graphql
  - depth-limit
  - complexity
  - dos
---

# Toda query GraphQL está sujeta a límites de profundidad y complejidad, configurables por env

## What

Toda query GraphQL que llega al servidor MUST validarse contra `GRAPHQL_MAX_DEPTH` (default 10) y `GRAPHQL_MAX_COMPLEXITY` (default 1000) antes de ejecutarse. Ambos límites son configurables por variable de entorno, nunca hardcodeados en el código de negocio.

## Why

Sin límites, una query anidada o con alias fan-out puede sobrecargar la base de datos (ataque de denegación de servicio vía GraphQL). `graphql-depth-limit` cubre profundidad; para complejidad se descartó `graphql-query-complexity` por incompatibilidad ESM/CJS con graphql v16 / Apollo Server v5, y se implementó un guard propio vía AST walk (alias fan-out + tamaño de listas). Ticket UPONE-1424 (parte de la épica SEC-*).

## Where

`src/index.js:96-97` (constantes `GRAPHQL_MAX_DEPTH`/`GRAPHQL_MAX_COMPLEXITY`), `validationRules: [depthLimit(GRAPHQL_MAX_DEPTH)]` y `createComplexityGuardPlugin({ maxComplexity: GRAPHQL_MAX_COMPLEXITY })` en la configuración de `ApolloServer` (`src/index.js:106-110`).

## When

En cada request GraphQL, antes de la ejecución del resolver (fase de validación de Apollo Server). Verificar al modificar `src/index.js` o al agregar queries con anidación profunda o listas grandes.
