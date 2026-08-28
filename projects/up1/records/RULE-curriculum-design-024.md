---
id: RULE-curriculum-design-024
project: up1
type: rule
module: curriculum-design
tags:
  - vueform
  - select-suggest
  - create
  - modal-casero
  - curriculum-design
  - sp5
---

# El select-suggest Vueform (`search`+`create:true`) es self-contained: seguro dentro del modal casero del mod

## What

El flujo `create:true` de un `SelectElement`/`TagsElement` de Vueform (crear-opcion-desde-texto-tipeado) es **self-contained**: NO invoca el `ModalStackManager` del platform. El `createdOption` es un `computed` local del multiselect (`@vueform/multiselect/.../useOptions.js`) y `handleTag` solo dispara el event bus interno de Vueform. Por lo tanto el select-suggest "elegir-existente-o-crear-nuevo" se puede embeber como mini-form Vueform dentro de un **modal casero** (atomo `Modal`, Teleport-to-body) del mod sin chocar con BUG-platform-011 (que afecta solo al `ModalStackManager`, no al `create` del select). NO se necesita fallback a input de texto.

Extiende RULE-curriculum-design-015 (select-suggest = reusar Vueform): confirma que `create:true` (no solo `search:true`) es seguro en el modal casero.

## Why

En MC-06 (TICKET-086) el dev eligio `create:true` sobre la alternativa de input de texto; el riesgo (H1.2) era que `create:true` dependiera del ModalStackManager ausente. El spike de S3.T1 lo descarto rastreando el codigo fuente de Vueform: `create` es estado local del campo. Documentarlo evita re-evaluar el mismo riesgo en futuros select-suggest del mod.

## Where

Modales caseros del mod que embeben Vueform (`mods/curriculum-design/modsComponents/*`), ej. `AddEntryModal.vue` (bloque electivo). Las opciones remotas se pueblan con un composable propio (ej. `useBlockOptions`), no `useOwnerIdOptions` (hardcodeado — ver DEC-LOCAL-02 del spec).

## When

Al implementar un selector "elegir-existente-o-crear-nuevo" dentro de un modal casero del mod.

## Verification

- El `SelectElement`/`TagsElement` con `search:true`+`create:true` renderiza y crea opciones desde texto dentro del modal casero, sin abrir/depender del ModalStackManager.
- El valor creado se interpreta como "nuevo" (sin id) vs existente (con id) por logica pura testeable (ej. `interpretBlockSelectValue`).

## Source

- **Discovered in**: TICKET-086 (S3, spike S3.T1) — UPONE-1349. Evidencia: `@vueform/multiselect/.../useOptions.js` (createdOption local) + `Modal.stories.ts:1113-1127` + `AllInputsModal.vue:261-269`.
