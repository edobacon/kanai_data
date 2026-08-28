---
id: RULE-mods-021
project: up1
type: rule
module: mods
tags:
  - vueform
  - custom-element
  - dev-workflow
---

# Tras agregar un custom Vueform element, forzar reload del glob

## What

Vueform's `import.meta.glob` en `suite/vueform.config.ts` es estatico — se evalua en build/start. Agregar un nuevo `.vue` al modsComponent NO se registra automaticamente en HMR; Vueform no encuentra el element y el componente no se monta (el tab queda vacio). Workaround: `touch suite/vueform.config.ts` despues del sync para forzar re-evaluacion via HMR. En caso de no funcionar, restart manual del dev server.

## Why

Vite HMR no detecta cambios en archivos resueltos por glob estatico. La config debe re-evaluarse.

## Where

Cualquier nuevo custom Vueform element en `mods/<m>/modsComponents/<Name>/`.

## When

Despues de cada `npm run sync` que agregue un element nuevo. No hace falta para modificaciones de elements ya registrados.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L26 — Session 4 (2026-04-30)
