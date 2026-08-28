---
id: RULE-curriculum-design-031
project: up1
type: rule
module: curriculum-design
tags:
  - composables
  - vite
  - dev-server
  - dynamic-import
  - restart
---

# Nuevo `modsComposable` requiere restart del suite dev server para que RecordDetail lo cargue

## What

Tras agregar un composable nuevo en `mods/<mod>/composables/`, reiniciar el suite dev server antes de verificar. RecordDetail resuelve el composable de `autoPopulate` con import dinamico por variable (`import(\`../composables/${name}\`)`); Vite pre-analiza el set de imports al bootear.

## Why

Composable nuevo sin restart da `Error: Unknown variable dynamic import: ../composables/useX`. Mismo patron staleness que el elemento Vueform `json-field-viewer` (T102 L11).

## Where

Composables de mod usados por RecordDetail (autoPopulate).

## When

Post-agregar composable.

## Verification

Log de dev server sin errores de dynamic import + composable disponible via `useX()` en el componente.

## Source

- **Discovered in**: TICKET-102
