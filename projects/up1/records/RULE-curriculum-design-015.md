---
id: RULE-curriculum-design-015
project: up1
type: rule
module: curriculum-design
tags:
  - select-suggest
  - vueform
  - curriculum-design
  - sp5
---

# Select-suggest (elegir-existente-o-crear): reusar Vueform search+create, no construir

## What

Para un selector con autocompletar + crear-nuevo (suggest), REUSAR el Vueform `SelectElement`/`TagsElement` con `search: true` + `create: true`; poblar opciones remotas con el patrón `useOwnerIdOptions` (autoPopulate + `listInstances`). NO construir un componente de autocompletar custom.

## Why

Es capacidad nativa de Vueform ya usada en up1 (`AllInputsModal.vue:265-266`). Evita reinventar un autocompletar custom.

> **Enmienda 2026-07-01 (TICKET-086 L1):** el supuesto original — "las opciones remotas de bloques `requirement(Group)` se pueblan con `useOwnerIdOptions`" — es **incorrecto**. `useOwnerIdOptions` está **hardcodeado a AcademicProgram/Institution** (`useOwnerIdOptions.ts:53`) y NO sirve para bloques por currículo. Para poblar bloques usar un composable dedicado **`useBlockOptions`** sobre `listInstances` filtrando `recordType=Group, ownerType=curriculum, ownerId=planId`.
>
> **Enmienda 2026-07-01 (TICKET-086/098):** la implementación real del selector de bloque **no** usó Vueform `search+create`, sino un `<select>` nativo + centinela `__new__` + input de texto para el nombre (`blockSelect.logic.ts` — `resolveBlockSelection`/`BLOCK_NEW_SENTINEL`), reutilizable en los modales de alta y edición. Sidestep del riesgo `create:true`/ModalStackManager (BUG-platform-011). Preferir este patrón nativo cuando el `create:true` de Vueform tenga riesgo de integración.

## Where

mods/<mod>/modsComposables/ (opciones remotas) + el campo del form/modal (Vueform search+create). Si el modal es casero, embeber el SelectElement como mini-form Vueform.

## When

Cuando se necesite seleccionar-existente-o-crear-nuevo (ej. bloque electivo OptionPool en la malla — MC-06/B5).

## Verification

El select permite elegir una opción existente y crear una nueva por texto; render validado dentro del modal casero como primer paso.

## Source

- **Discovered in**: —
