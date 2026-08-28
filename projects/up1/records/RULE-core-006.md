---
id: RULE-core-006
project: up1
type: rule
module: core
tags:
  - codegen
  - schema-driven
  - pattern
---

# No editar archivos auto-generados por codegen

## What

Nunca modificar archivos generados por codegen: prisma/schema.prisma, src/graphql/typeDefs/ auto-generados, ni migrations generadas. Modificar solo el JSON source en objects/.

## Why

Codegen sobreescribe estos archivos en cada ejecucion. Cambios directos se pierden. Ademas, el JSON es la fuente de verdad que alimenta Prisma, GraphQL y metadata simultaneamente.

## Where

object-manager/prisma/schema.prisma, object-manager/src/graphql/typeDefs/

## When

Al necesitar cambiar el schema de un objeto. Siempre ir al .json en objects/.

## Verification

Git diff no debe mostrar cambios manuales en archivos auto-generados. Solo en objects/*.json.

## Source

- **Discovered in**: —
