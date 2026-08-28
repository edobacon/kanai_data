---
id: BUG-core-005
project: up1
type: bug
module: core
tags:
  - eslint
  - lint
  - tooling
  - det-23
  - quality-gate
  - monorepo
  - infra-gap
---

# up1 no tiene config de ESLint: la dimensión lint de DET-23 no tiene tooling que ejecutar

## Symptom

El mod `curriculum-design` y el monorepo `up1` NO tienen config de ESLint (`eslint.config*` / `.eslintrc*` ausentes). La dimensión de lint del quality review (DET-23) no tiene herramienta que correr, así que "lint pass" no se puede afirmar de verdad.

## Expected behavior

Debería existir una config de ESLint ejecutable (al menos en los workspaces core y en los mods activos) para que el gate de lint de DET-23 sea real y no un no-op.

## Root cause

Gap de infraestructura del monorepo: nunca se configuró ESLint. No es un bug de comportamiento de la app.

## Impact

Bajo para el runtime; relevante para la **honestidad del quality gate**: al evaluar DET-23, la dimensión lint debe marcarse `n/a` (sin tooling) en vez de `pass`, hasta que se agregue la config. Candidato a backlog de infra del proyecto up1.
