---
id: RULE-mods-055
project: up1
type: rule
module: mods
tags:
  - nav
  - layout
  - showInNav
  - defaultObjects
  - app-json
  - sync
---

# Para ocultar un layout de mod del nav se usa `showInNav: false`: quitarlo de `defaultObjects` NO basta

## What

Tras el sync, TODOS los layouts de un mod quedan como layouts explicitos de la app (`applicationId === appId`), por lo que aparecen en el nav de forma incondicional. Quitar el objeto de `defaultObjects` en `config/app.json` solo cambia el ORDEN de los grupos visibles (los no-listados van al final), NO oculta la entrada. El unico mecanismo real para retirar un layout del menu es declarar `showInNav: false` en su `layoutConfig`.

## Why

`getLayoutsForApp` ([suite/composables/useObjectManager.ts:70-94](../../../up1/suite/composables/useObjectManager.ts#L70)) incluye en el nav (a) los layouts explicitos del app incondicionalmente + (b) los default layouts (`applicationId: null`) de objetos en `defaultObjects`. El filtro real de visibilidad esta en `navObjects` (L460-469): `if (!isActive || !layout.showInNav) return false`. Como el sync asigna `applicationId` a todos los layouts del mod, la rama (a) los muestra siempre, independientemente de `defaultObjects`. Un dev que confia en quitar el objeto de `defaultObjects` para ocultarlo (como planteaba la hipotesis H2 del intake de TICKET-112) obtiene un no-op funcional: la entrada sigue en el menu.

## Where

- `mods/{mod}/config/layouts/default_{Object}_list.json`: agregar `"showInNav": false` en el `layoutConfig` del layout a ocultar.
- Consumer: `suite/composables/useObjectManager.ts` (`getLayoutsForApp` L70-94, `navObjects` L460-469).

## When

Al retirar un objeto/mantenedor del menu de navegacion de un mod, o al disenar un acceso que solo debe abrirse via boton/modal/ruta (no por el nav). Complementa [rule-mods-010](../mods/rule-mods-010.md) y [rule-mods-020](../mods/rule-mods-020.md): esas explican que `defaultObjects` controla asociacion/orden y no visibilidad; esta agrega el toggle concreto (`showInNav: false`) para el caso de layouts ya explicitos por sync. Un modal/ruta que abre el layout por `layoutId` directo (p.ej. `useModalActionButtons.handleClick`) sigue funcionando aunque `showInNav` sea `false`; el toggle solo afecta al nav.

## Verification

Smoke UI real tras `npm run sync`: la entrada del layout desaparece del menu del mod con `showInNav: false` y reaparece sin el (no basta con BD/config). Regresion: el acceso alternativo (boton/modal/ruta) que abre el layout por id sigue operativo.

## Source

- **Discovered in**: TICKET-112 (smoke S1.T6: la hipotesis H2 del intake resulto incorrecta; `defaultObjects` removal fue no-op, `showInNav: false` fue el fix real).
