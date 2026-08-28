---
id: RULE-curriculum-design-035
project: up1
type: rule
module: curriculum-design
tags:
  - modscomponents
  - sync
  - logic-only-folder
  - cross-folder-import
  - vite
  - mod
  - smoke
---

# En `modsComponents/` no crear carpetas solo-lógica importadas cross-folder (el sync no las propaga)

## What

El sync a los workspaces core (`suite`/`layout`) solo propaga carpetas de `modsComponents/` que tienen un **componente-entry**. Una carpeta **solo-lógica** (sin componente, ej. solo un `*.logic.ts`) NO se sincroniza. Cualquier import cross-folder hacia esa carpeta rompe en `layout`/`suite` con `Failed to resolve import` de Vite y deja el tab en blanco. MUST co-ubicar la lógica compartida DENTRO de una carpeta que también tenga un componente.

## Why

Descubierto en el smoke de S9.T5 de TICKET-101 (primer sync+render real): `RequirementAddModal/` quedó solo con `requirementFamilies.logic.ts` (el modal se inlineó en el `.vue` del editor), no sincronizó, y el import cross-folder hacia ella rompió el render. Patrón que sí funciona en el mod: `ReglaUnificadaView` / `CompositeSectionTree` tienen lógica + componente en la misma carpeta y por eso sincronizan.

## Where

`mods/*/modsComponents/`. Al refactorizar (inlinear un modal, extraer lógica) verificar que ninguna carpeta quede solo-lógica siendo importada desde otra carpeta.

## When

Al crear o mover lógica compartida dentro de `modsComponents/`, y al revisar imports cross-folder en un review de un mod.
