---
id: BUG-platform-007
project: up1
type: bug
module: platform
tags:
  - sync
  - css
  - mod-styles
  - gap
---

# El sync sincroniza `mod/css/1-theme/<mod>.css` pero no lo `@import`-a en `up1.css`

## Symptom

El sync sincroniza `mods/<mod>/css/1-theme/<mod>.css` a `suite/css/1-theme/<mod>.css` pero **NO agrega un `@import` en `suite/css/up1.css`**. El entry CSS solo importa `default.css` + `dark.css` en layer theme + auto-generated imports de `3-viewType/`. Los archivos del mod en otras layers (1-theme, 2-objectName, etc.) quedan en disco pero el browser nunca los carga.

## Expected behavior

El sync deberia agregar el `@import` correspondiente en `up1.css` para cada layer y mod, o el entry CSS deberia hacer un glob auto-import de todos los `.css` synced.

## Root cause

Capability gap del sync flow — solo se diseño para 3-viewType (auto-imports), no para otras layers.

## Impact

CSS del mod en folders distintos a `3-viewType/` es codigo muerto. Estilos del mod no aplican.

## Workaround

Dentro del mod: usar `<style scoped>` o `<style>` con prefix unico de clase en componentes Vueform (RichTextRenderer pattern) — el CSS viaja con el SFC y `:deep()` permite estilar HTML inyectado via `v-html`. Ver [RULE-mods-023](../../rules/mods/rule-mods-023.md).

Fix real: PR a plataforma para agregar auto-import de mod CSS en up1.css.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L45 — Session 6 (2026-04-30)
