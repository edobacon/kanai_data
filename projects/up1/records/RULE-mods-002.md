---
id: RULE-mods-002
project: up1
type: rule
module: mods
tags:
  - graphql
  - pattern
  - resolver
---

# Resolver requiere schema GraphQL pair

## What

Todo resolver custom DEBE tener un archivo .schema.graphql companion con la misma base de nombre.

## Why

El codegen y el registro de resolvers dependen de que exista el par. Sin el .schema.graphql, el resolver no se registra en Apollo Server y la query/mutation no existe.

## Where

mods/*/logic/

## When

Al crear un resolver custom en un mod.

## Verification

Para cada *.resolver.js, verificar que existe *.schema.graphql en el mismo directorio.

## Template

- [TMPL-mod-resolver-validated](../../templates/TMPL-mod-resolver-validated.js.tmpl) — patron canonical de resolver custom validated (con su pair schema GraphQL)
- [TMPL-mod-schema-graphql](../../templates/TMPL-mod-schema-graphql.tmpl) — patron canonical del schema GraphQL pair

## Source

- **Discovered in**: —
