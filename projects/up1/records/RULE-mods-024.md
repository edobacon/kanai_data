---
id: RULE-mods-024
project: up1
type: rule
module: mods
tags:
  - vueform
  - custom-element
  - reactivity
  - composables
---

# Pasar props a composables como Ref via `toRef`

## What

En custom Vueform elements con composables, **pasar props como string snapshot rompe la reactividad**. Si Vueform interpola `{{parentId}}` async o cambia el prop, el composable no re-ejecuta. Patron correcto: en `setup(props)` usar `toRef(props, 'fieldName')` y pasar Ref al composable, que adentro hace `watch(() => ref.value, fetch, { immediate: true })`.

## Why

`props.field` en setup es un snapshot — no reactivo despues. Vueform puede setear el prop async (placeholder `{{parentId}}` se resuelve cuando el RecordDetail tiene el id). Sin Ref, el composable corre con el snapshot inicial (vacio o stale).

## Where

`mods/<m>/modsComponents/<Name>/<Name>Element.vue` — en el `setup(props)` cuando hay props que pueden cambiar.

## When

Siempre que un composable consuma un prop que la plataforma puede setear async (FK ids, ownerId via `{{parentId}}`, etc.).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L30 — Session 4 (2026-04-30)
- F7 (failed approach)
