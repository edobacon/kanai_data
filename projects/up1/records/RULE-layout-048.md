---
id: RULE-layout-048
project: up1
type: rule
module: layout
tags:
  - layout
  - modalActionButtons
  - openMode
  - roles
  - RBAC
  - navegacion
---

# `modalActionButtons` acepta `openMode:"route"` y `roles`

## What

Un boton declarado en `modalActionButtons` acepta dos keys nuevas:

- `openMode: "route"`: en vez de apilar un modal, el boton navega en el lugar. Se emite `navigate-to-relation` para que Suite lo resuelva; se evalua antes que el guard del `ModalStackManager`, porque un destino en modo route no necesita stack de modales.
- `roles`: filtro independiente de `requiredPermission`. `requiredPermission` dice que puede hacer el usuario (capability); `roles` dice quien llega a la pantalla destino. Dos roles pueden compartir todas las capabilities y aun asi diferir en los layouts que pueden abrir, asi que un gate solo por capability renderiza un boton que el destino luego rechaza con "unauthorized".

## Why

**Importante, no confundir con otra key similar**: esto es distinto de `layoutConfig.openMode`, cubierto por [[RULE-layout-028]] y [[RULE-layout-041]]. Ese `openMode` vive a nivel de `layoutConfig` de RecordList y gobierna como se abre el layout completo (modal vs pantalla) desde una fila o accion de lista. El `openMode` de esta rule vive dentro de cada entrada de `modalActionButtons`, un array de botones de header en RecordDetail, y gobierna solo ese boton puntual. Mismo nombre de key, ubicacion y alcance distintos: verificar en que nivel del JSON se esta declarando antes de asumir cual de las dos rules aplica.

## Where

- `layout/src/composables/useModalActionButtons.ts:70-96` (tipos `ModalActionButtonRouteTarget`, opcion `navigate` en `UseModalActionButtonsOptions`)
- `layout/src/composables/useModalActionButtons.ts:141-165` (filtro por `roles` ademas de `requiredPermission`, comentario "Two gates, not interchangeable")
- `layout/src/composables/useModalActionButtons.ts:191-203` (branch `button.openMode === 'route'`, llamada a `options.navigate`)

## When

Al declarar un boton en `modalActionButtons`: usar `openMode: "route"` cuando el destino es una pantalla propia y no un dialogo; usar `roles` cuando el gate debe basarse en quien puede alcanzar la pantalla destino, no solo en que capability tiene. No confundir esta key con `layoutConfig.openMode` de RecordList ([[RULE-layout-028]], [[RULE-layout-041]]).

## Source

- **Discovered in**: UPONE-1503
