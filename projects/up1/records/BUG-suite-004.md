---
id: BUG-suite-004
project: up1
type: bug
module: suite
tags:
  - css
  - dark-mode
  - accessibility
---

# En modo oscuro un toggle activo y deshabilitado se leia como apagado

## Symptom

En modo oscuro, un toggle (Vueform) que estaba activo y a la vez deshabilitado se pintaba con el mismo color que un toggle apagado, sin distinguirse visualmente su estado real.

## Expected behavior

En modo oscuro, un toggle activo y deshabilitado deberia distinguirse visualmente de uno apagado y deshabilitado, cumpliendo el contraste minimo de 3:1 exigido por WCAG.

## Root cause

File: `css/1-theme/dark.css:642` (`.theme-dark .vf-toggle.is-disabled`)
Cause: la regla generica `.theme-dark .vf-toggle.is-disabled` aparece despues de `.theme-dark .vf-toggle.is-active` (linea 356), con la misma especificidad y ambas con `!important`. Por orden de aparicion, `.is-disabled` gana y pinta el toggle con `--vf-bg-disabled` sin distinguir si tambien estaba activo. En modo vista (`.recorddetail.mode-view`), ese token cae a `transparent` mas `opacity: 0.5`, incumpliendo el contraste minimo de 3:1.

## Fix

Se agrega una regla especifica para el estado combinado activo-deshabilitado (`css/1-theme/dark.css:706-710`: `.theme-dark .vf-toggle.is-active.is-disabled`, `.vf-toggle-on.is-disabled`, `.vf-toggle-on-disabled`), que deriva su color de fondo del token "on" atenuado (`--up1-vf-toggle-bg-on-disabled`) en vez del token generico de apagado.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Toggle activo + deshabilitado, modo oscuro | Se leia como apagado (mismo color que `is-disabled` sin `is-active`) | Se distingue con un color derivado del estado "on" |
| Contraste (WCAG) | Podia caer bajo el minimo 3:1 en modo vista | Cumple el minimo exigido |

## Reproduction

### Steps
1. Activar el modo oscuro.
2. Renderizar un formulario en modo vista con un campo toggle que este activo y deshabilitado.
3. Comparar visualmente contra un toggle apagado y deshabilitado: ambos se pintaban igual.
