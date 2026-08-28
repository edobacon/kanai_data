---
id: DECISION-025
project: up1
type: decision
module: core
tags:
  - object-manager
  - security
  - graphql
  - complexity
  - depth-limit
---

# DECISION-025: `graphql-query-complexity` descartada por mismatch ESM/CJS; guard propio vía AST walk

## Contexto

SEC-15 (UPONE-1424) requería limitar la complejidad de queries GraphQL (además de la profundidad, ya cubierta por `graphql-depth-limit`) para prevenir abuso vía queries con alias fan-out o listas de gran tamaño. La librería estándar del ecosistema para esto es `graphql-query-complexity`.

## Decisión

Se descarta `graphql-query-complexity` por incompatibilidad de módulos (mismatch ESM/CJS con `graphql` v16 y Apollo Server v5, el stack actual de object-manager). En su lugar, se implementa un **guard propio vía AST walk**: un plugin que recorre el AST de la query detectando alias fan-out y tamaño de listas, aplicando el límite `GRAPHQL_MAX_COMPLEXITY` (default 1000, env-configurable) junto a `GRAPHQL_MAX_DEPTH` (`graphql-depth-limit`, default 10). Verificado en `object-manager/src/index.js:96-115`.

## Alternativas descartadas

- **`graphql-query-complexity`**: descartada por incompatibilidad técnica confirmada (mismatch ESM/CJS), no por preferencia de diseño. Follow-up de reevaluación diferido si la librería publica una versión compatible.
- **Solo `graphql-depth-limit` sin guard de complejidad adicional**: descartada porque profundidad sola no cubre el vector de alias fan-out (múltiples alias del mismo campo costoso en un solo nivel) ni list-size sin nesting profundo.

## Impacto / reversibilidad

Afecta `object-manager` (middleware de Apollo Server, `src/index.js`). Agrega un límite de complejidad configurable por env a toda query GraphQL, cambio de contrato observable (queries que excedan `GRAPHQL_MAX_COMPLEXITY` ahora fallan). Reversibilidad: alta a nivel de código (plugin propio, aislado); requiere mantenimiento propio en vez de depender de una librería de terceros (trade-off aceptado explícitamente).
