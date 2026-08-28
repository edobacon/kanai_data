---
id: RULE-mods-022
project: up1
type: rule
module: mods
tags:
  - vueform
  - custom-element
  - sync
  - recursive-component
---

# Sub-componentes recursivos de un Vueform element van inline en el mismo SFC

## What

El sync de modsComponents ([layout/scripts/sync.js:147-171](../../../up1/layout/scripts/sync.js#L147-L171)) **rechaza folders con multiples `.vue`** — valida exactamente 1 `.vue` por folder, opcionalmente `.ts` y `.stories.ts`. Si un componente Vueform necesita sub-componentes (ej. nodo recursivo de un treeview), declararlos **inline en el mismo SFC** con `defineComponent({ render() {} })` y referenciar la const local para auto-recursion.

## Why

El sync de plataforma valida la estructura de cada modsComponent antes de copiar. Una sola entrada `.vue` por folder mantiene la convencion de "un element = un SFC".

## Where

`mods/<m>/modsComponents/<Name>/<Name>Element.vue` — solo 1 .vue, sub-componentes inline.

## When

Al diseñar un custom element con sub-componentes (recursivos o composicionales). Si necesitas mas SFCs, refactor el flujo para que todo sea un solo SFC + inline `defineComponent`.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L27 — Session 4 (2026-04-30)
- F4 (failed approach)
