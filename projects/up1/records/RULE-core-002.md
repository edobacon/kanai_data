---
id: RULE-core-002
project: up1
type: rule
module: core
tags:
  - codegen
  - schema-driven
  - pattern
  - critical
---

# npm run codegen obligatorio despues de cambiar objects JSON

## What

Despues de crear o modificar archivos JSON en objects/ (base o extended), ejecutar npm run codegen para regenerar Prisma schema y GraphQL types.

## Why

Los JSON objects son source of truth. Codegen (8 pasos) genera: Prisma schema, GraphQL types, metadata, validaciones. Sin codegen, la BD y API quedan desactualizados respecto al JSON.

## Where

object-manager/objects/business/, mods/*/objects/

## When

Despues de crear, modificar o eliminar un archivo .json de definicion de objeto.

## Verification

Ejecutar npm run codegen. Verificar que prisma/schema.prisma y src/graphql/typeDefs/ reflejan los cambios.

## Source

- **Discovered in**: —
