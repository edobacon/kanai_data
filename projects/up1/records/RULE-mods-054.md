---
id: RULE-mods-054
project: up1
type: rule
module: mods
tags:
  - sync
  - drift
  - mod-only
  - phase-4
---

# `sync:logic` (Phase 4) es la via correcta para cambios puros en `logic/` del mod

## What

Usar `npm run sync:logic` cuando el cambio del mod es puro a resolvers/typeDefs (no toca objetos/capabilities). NO usar `npm run sync` (que ejecuta drift-checker y arrastra drift preexistente no relacionado).

## Why

El sync completo (`npm run sync`) ejecuta el drift-checker y puede devolver exit != 0 por drift preexistente no relacionado con el cambio del mod. El sync:logic evita esto y se enfoca solo en el surface del mod (resolvers + typeDefs).

## Where

package.json del mod; CI del mod.

## When

Tickets mod-only con cambios en `logic/` puros (sin tocar objetos/capabilities).

## Verification

log del sync:logic + diffs en destino (resolvers/mods/) + no-error en drift-checker.

## Source

- **Discovered in**: TICKET-073
