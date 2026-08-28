---
id: RULE-mods-003
project: up1
type: rule
module: mods
tags:
  - sync
  - pattern
  - critical
---

# npm run sync obligatorio despues de cambios en mods

## What

Despues de CUALQUIER cambio en mods/{mod}/ (objects, logic, components, css, lang, capabilities, events, layouts, seeds), ejecutar npm run sync.

## Why

Los artefactos de mods no se usan directamente — se copian a core workspaces via sync (8 fases). Sin sync, los cambios no se reflejan en la app.

## Where

mods/*/

## When

Despues de cada modificacion a archivos dentro de un mod.

## Verification

Ejecutar npm run sync y verificar que los archivos aparecen en los destinos core (layout/src/modsComponents/, suite/modsComponents/, etc.).

## Source

- **Discovered in**: —
