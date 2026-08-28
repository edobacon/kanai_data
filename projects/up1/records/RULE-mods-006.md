---
id: RULE-mods-006
project: up1
type: rule
module: mods
tags:
  - graphql
  - schema
  - pattern
---

# Extend type Query/Mutation en schemas GraphQL — nunca redefine

## What

Los archivos .schema.graphql de resolvers custom DEBEN usar 'extend type Query' o 'extend type Mutation'. Nunca 'type Query' o 'type Mutation' sin extend.

## Why

Apollo Server ya define los root types Query y Mutation. Redefinirlos (sin extend) causa conflicto de tipos y el server no arranca.

## Where

mods/*/logic/*.schema.graphql

## When

Al crear o modificar schemas GraphQL de resolvers custom.

## Verification

Grep en .schema.graphql por 'type Query' o 'type Mutation' sin 'extend' — deben estar ausentes.

## Template

- [TMPL-mod-schema-graphql](../../templates/TMPL-mod-schema-graphql.tmpl) — patron canonical con `extend type Query` y `extend type Mutation`

## Source

- **Discovered in**: —
