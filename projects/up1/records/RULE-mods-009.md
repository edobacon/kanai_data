---
id: RULE-mods-009
project: up1
type: rule
module: mods
tags:
  - layout
  - applicationId
  - nav
  - sync
  - visibility
---

# Layouts que deben aparecer en el nav NO deben tener applicationId — sync lo asigna

## What

Para que un layout del mod aparezca en el menú de navegación (dropdown por objeto), el campo `applicationId` debe OMITIRSE del JSON. El sync (Phase 6) lo asigna automáticamente basándose en el `app.json` del mod.

Si se pone `applicationId: null` explícitamente, el sync lo trata como layout auxiliar y NO aparece en el nav. La diferencia es:
- `applicationId` **ausente** → sync asigna el ID de la app del mod → aparece en nav
- `applicationId: null` **explícito** → layout auxiliar (create forms, views embebidos, modales) → NO aparece en nav

## Why

El código del sync (`dbSync.js`) verifica `layout.hasOwnProperty('applicationId') && layout.applicationId === null`. Si la propiedad existe y es null, marca como auxiliar. Si no existe, busca la app del mod y la asigna. Esta distinción no es obvia — un dev asumiría que omitir y poner null son equivalentes.

## Where

- **Files**: `mods/*/config/layouts/*.json`
- **Layers**: config (layout JSON)

## When

Al crear un nuevo layout para un mod. Decidir si debe ser visible en el nav (omitir applicationId) o auxiliar (applicationId: null explícito).

## Verification

- Revisar layouts del mod: los que deben aparecer en nav no tienen campo `applicationId` en el JSON
- Los auxiliares (create, view, embedded) tienen `applicationId: null` explícito
- Despues de sync, verificar en la app que los layouts esperados aparecen en el dropdown

## Source

- **Discovered in**: TICKET-003, Session 1
- **Evidence**: Layouts de curriculum-mapping con `applicationId: null` no aparecían en nav. Fix: omitir el campo. Confirmado leyendo `dbSync.js:588`
- **Related**: RULE-layout-010, RULE-mods-007
