---
id: RULE-mods-033
project: up1
type: rule
module: mods
tags:
  - deps
  - npm-workspaces
  - mod-package
---

# Deps de un mod se declaran en `mods/<m>/package.json`

## What

Para que un mod use una dep externa, declararla en `mods/<m>/package.json` (`"dependencies": { "<dep>": "^x.y.z" }`). `npm install` en el up1 root la hoistea a `up1/node_modules` via npm workspaces. Otros workspaces (layout, suite, object-manager) la resuelven via Node module resolution standard sin tocar sus package.json.

## Why

`up1/package.json` declara `"workspaces": ["...", "mods/*"]` — npm trata cada subdir de `mods/` con package.json como workspace, lo incluye en el install resolution, y hoistea las deps al root.

## Where

`mods/<m>/package.json` — array `dependencies` (deps runtime) o `devDependencies` (build/test only).

## When

Al introducir una dep externa que el mod necesita en runtime (ej. sortablejs, moment, lodash-es). Si el sync de un mod externo (no-uPlannerMods) no auto-clona el repo, instalar deps manualmente con `npm install` despues de clonar dentro de `mods/`.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L53 — Session 7 (2026-05-04). Validado con `sortablejs ^1.15.6` para curriculum-design.
