---
id: RULE-mods-004
project: up1
type: rule
module: mods
tags:
  - graphql
  - resolver
  - naming
---

# Const name del resolver debe contener Query o Mutation

## What

La constante exportada de un resolver custom DEBE contener la palabra 'Query' o 'Mutation' en su nombre.

## Why

El sistema de registro automatico de resolvers busca estas palabras en los const names para determinar si es query o mutation. Sin ellas, el resolver no se registra en Apollo Server.

## Where

mods/*/logic/*.resolver.js

## When

Al crear o renombrar un resolver custom.

## Verification

Grep por 'export const' en el resolver — el nombre debe contener 'Query' o 'Mutation'.

## Template

- [TMPL-mod-resolver-validated](../../templates/TMPL-mod-resolver-validated.js.tmpl) — patron canonical de resolver custom validated con const name terminando en `Mutation` o `Query`

## Source

- **Discovered in**: —
