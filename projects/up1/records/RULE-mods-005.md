---
id: RULE-mods-005
project: up1
type: rule
module: mods
tags:
  - composable
  - vue3
  - pattern
---

# Composables: shared (modsComposables) vs component-level (modsComponents)

## What

Shared composables en modsComposables/ son pure functions, types y constants (useX). Component-level composables en modsComponents/{Component}/ usan Vue ref, Apollo, reactive state (useXApi). No mezclar.

## Why

Shared composables se importan desde multiples componentes — si tienen estado reactivo o Apollo, crean side effects compartidos. Component-level composables encapsulan estado local del componente.

## Where

mods/*/modsComposables/, mods/*/modsComponents/*/

## When

Al decidir donde ubicar un composable nuevo.

## Verification

modsComposables/ no debe importar ref/reactive/Apollo Client. modsComponents/ composables no deben exportarse fuera de su componente.

## Source

- **Discovered in**: —
