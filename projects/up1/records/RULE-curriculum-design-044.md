---
id: RULE-curriculum-design-044
project: up1
type: rule
module: curriculum-design
tags:
  - sync
  - default-layouts
  - dbsync
  - syncappsandlayouts
  - up1_layen_layout
  - up1-manager
  - seed
  - tenant
---

# Los default layouts de un mod se siembran por `dbSync` Phase 5, no por el script de up1-manager

## What

El seed de default layouts de un mod a `up1_layen_layout` NO lo hace `up1-manager/scripts/seed-object-manager-layouts.js` (ese siembra los layouts propios de la app up1-manager desde `up1-manager/config/layouts`). El mecanismo real es **dbSync Phase 5 `syncAppsAndLayouts`** (`object-manager/scripts/sync/dbSync.js:500-557` y `700+`), que lee **directo** de `mods/<mod>/config/layouts/*.json` y upsertea por `name` por tenant. Path acotado para regenerar solo eso: `DEV_TENANTS=UPU npm run sync:db` (solo fases DB, sin Prisma/mirror).

## Why

Corrige una suposición común (la del intake de TICKET-106): que el seed de layouts del mod pasa por el script de up1-manager. Perder el mecanismo real lleva a editar el lugar equivocado y a que los layouts del mod "no aparezcan".

## Where

`object-manager/scripts/sync/dbSync.js` (Phase 5), `mods/<mod>/config/layouts/*.json`.

## When

Al agregar/depurar default layouts de un mod, o al diagnosticar por qué un layout del mod no se refleja por tenant.
