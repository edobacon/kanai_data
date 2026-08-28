---
id: RULE-mods-010
project: up1
type: rule
module: mods
tags:
  - defaultObjects
  - nav
  - layout
  - app-json
---

# defaultObjects en app.json NO controla que objetos aparecen en el nav

## What

El campo `defaultObjects` en `app.json` solo afecta a layouts con patrón `default_{ObjectName}_list` que tengan `applicationId: null`. Estos layouts "default" se asocian a la app como fallback.

Los objetos que aparecen en el menú de navegación (dropdowns) se determinan por los layouts que el sync asocia a la app via `applicationId` — no por `defaultObjects`. Si un mod tiene layouts para `ObjectA` y `ObjectB` sin `applicationId` explícito, ambos aparecerán en el nav independientemente de `defaultObjects`.

`defaultObjects` sigue siendo útil para: registrar qué objetos son relevantes para la app (documentación) y para que los layouts default auto-generados (`default_{Object}_list`) se asocien a la app.

## Why

El nombre `defaultObjects` sugiere que controla qué objetos se muestran, pero el mecanismo real es `applicationId` en cada layout. Sin esta clarificación, un dev podría agregar objetos a `defaultObjects` esperando que aparezcan en el nav, cuando en realidad necesita crear layouts sin `applicationId` explícito.

## Where

- **Files**: `mods/*/config/app.json`, `suite/composables/useObjectManager.ts`
- **Layers**: config, frontend

## When

Al diseñar la navegación de un mod con múltiples objetos. Entender que los dropdowns del nav se construyen desde los layouts asociados por sync, no desde `defaultObjects`.

## Verification

- Verificar que los objetos visibles en el nav corresponden a layouts con `applicationId` asignado por sync, no necesariamente a `defaultObjects`
- Si un objeto no aparece en el nav: verificar que tiene al menos un layout RecordList sin `applicationId: null`

## Source

- **Discovered in**: TICKET-003, Session 1
- **Evidence**: `defaultObjects: ["Person", "Category"]` en Engagement, pero nav muestra Event, Offering (determinados por layouts). Confirmado leyendo `useObjectManager.ts:69-85`
- **Related**: RULE-mods-009, RULE-mods-007
