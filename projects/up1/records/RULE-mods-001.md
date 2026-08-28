---
id: RULE-mods-001
project: up1
type: rule
module: mods
tags:
  - sync
  - pattern
  - critical
---

# Nunca modificar archivos synced en core

## What

Los archivos copiados por npm run sync a core workspaces NO deben modificarse directamente. Siempre modificar en el mod fuente.

## Why

npm run sync sobreescribe estos archivos en cada ejecucion. Cualquier cambio directo en core se pierde silenciosamente.

## Where

layout/src/modsComponents/, layout/src/modsComposables/, suite/modsComponents/, suite/modsComposables/, object-manager/src/graphql/resolvers/mods/, suite/lang/mods/, layout/src/styles/mods/

## When

Al modificar cualquier archivo en las rutas listadas. SIEMPRE verificar si el archivo tiene origen en un mod.

## Verification

Git diff no debe mostrar cambios en paths synced de core. Si se necesita cambiar, buscar el archivo fuente en mods/{mod}/.

## Source

- **Discovered in**: —
