---
id: RULE-mods-053
project: up1
type: rule
module: mods
tags:
  - sync:logic
  - mod-only
  - cero-core
  - gitignored
---

# Fix mod-only via `sync:logic` NO produce cambio commiteable en core

## What

Los resolvers/helpers sincronizados a `object-manager/src/graphql/resolvers/mods/*` estan gitignored (`.gitignore:78`); un fix mod-only de resolvers/helpers produce cambio solo en runtime local tras restart del OM, NO en el repo commiteable de core.

## Why

La policy `cero core` para mod-only confirma que estos cambios viven en runtime, no en el repo del core. Un ticket con cambio mod-only via sync:logic NO tiene diff en el repo de core (solo runtime local).

## Where

Tickets mod-only con cambios en resolvers/helpers de mod.

## When

Plan de un ticket mod-only que toca resolvers (pre-implementacion).

## Verification

git diff de object-manager repo post-sync:logic no muestra cambios bajo `src/graphql/resolvers/mods/` (gitignored).

## Source

- **Discovered in**: TICKET-073
