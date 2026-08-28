---
id: RULE-platform-001
project: up1
type: rule
module: platform
tags:
  - platform
  - css
  - sync
  - vueform
  - C1
---

# CSS de SFCs custom Vueform debe vivir inline en el SFC hasta fix BUG-platform-012

## What

El CSS de los SFCs custom Vueform de los mods debe declararse INLINE dentro del bloque `<style>` del SFC. NO extraer a archivos `mods/<mod>/css/1-theme/*.css` separados con la intencion de cargarlos via @import (sync) o desde el SFC con path relativo.

## Why

Dos limitaciones acumuladas: (1) BUG-platform-012 — sync-styles.js NO agrega los CSS sincronizados a la seccion 'Auto-generated mod imports' del up1.css, el archivo queda fuera del bundle; (2) @import desde el SFC con path relativo NO resuelve post-sync porque los archivos terminan en directorios distintos (SFC en layout/src/modsComponents/, CSS en suite/css/1-theme/). Caso concreto documentado: TICKET-010 item C1 — extracto fallido de 582 LOC del CompositeSectionTreeElement.vue, reverti tras error 500 de Nuxt.

## Where

Cualquier mod que defina custom Vueform elements via `defineElement({ ... })` con CSS asociado.

## When

Aplica desde TICKET-010 (2026-05-05) hasta que se resuelva BUG-platform-012. Cuando el sync corrija el auto-import, esta regla se relaja y permitimos extracts.

## Verification

Cualquier SFC custom Vueform debe tener su CSS dentro de `<style>...</style>` inline. NO debe haber `@import './path.css'` con paths que crucen la frontera mod/suite/layout. Test integration podria validar que ningun .vue del mod tiene `@import` en su style block.

## Source

- **Discovered in**: TICKET-010 item C1
