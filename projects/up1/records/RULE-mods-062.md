---
id: RULE-mods-062
project: up1
type: rule
module: mods
tags:
  - rbac
  - auth
  - mutation-custom
  - core-boundary
  - curriculum-mapping
---

# Las mutations custom de un mod no reciben auth automática del core: deben llamar `checkObjectPermissions` manualmente

## What

Toda mutation GraphQL **custom** de un mod (fuera del CRUD genérico que expone `instance.resolver.js`) MUST invocar `checkObjectPermissions` (via el helper `loadCheckObjectPermissions`) antes de tocar la base de datos. El core NO envuelve automáticamente las mutations bespoke de un mod con ninguna guarda de autorización; esa responsabilidad recae en el resolver del mod.

## Why

En `curriculum-mapping` las 3 mutations custom de `LevelScheme` (`upsertLevelSchemeValidated`, `setLevelSchemeActiveValidated`, `deleteLevelSchemeValidated`) llegaron a estar sin chequeo de permisos hasta que se agregó explícitamente `loadCheckObjectPermissions(import.meta.url)` en cada una. El helper `resolverUtils.js` carga `checkObjectPermissions` del platform (authChecker) via dynamic import y lo cachea; la función lanza si no hay usuario o permiso. Este mismo patrón de riesgo (mutation custom sin auth) es el que causó [[BUG-mods-017]] en `up1-manager` (SEC-01): la guarda ahí también tuvo que agregarse manualmente porque el core no la provee.

## Where

- `mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js:623,628,632` (invocación en las 3 mutations)
- `mods/curriculum-mapping/logic/helpers/resolverUtils.js:49-75` (`loadCheckObjectPermissions`)
- Aplica a cualquier mutation custom de cualquier mod que no pase por el CRUD genérico del core (ver también `up1-manager/logic/objectRoles.resolver.js` con `withAuth`/`requireCapability` como variante equivalente del mismo problema).

## When

Al crear cualquier mutation custom en un mod (resolver propio, no generado por el core). En code review: verificar que toda mutation nueva fuera del CRUD genérico tenga guarda de auth explícita antes de aprobar.
