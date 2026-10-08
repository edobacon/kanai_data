---
id: BUG-object-manager-sync-layouts-uuid-id-por-nombre-UPONE-2002
project: up1
type: bug
module: object-manager/codegen-sync
tags:
  - UPONE-2002
  - UPONE-2010
  - layouts
  - uuid
---

Con PHASE2_UUID_IDS, Phase 6 (layouts de mod) y Phase 7 (default layouts) dejan que la base genere el id del layout. Phase 7 pasa a buscar filas existentes por name, como Phase 6, y un layout que no se puede escribir se loguea como warning con nombre y motivo. Con índice único por nombre (UPONE-2010) un default repetido ya no se renombra a _v2: falla con el error de unicidad.

Fuente: ced5cc17 scripts/sync/dbSync.js; src/utils/generateLayoutId.js; c4027dbc src/graphql/resolvers/layout.resolver.js:143.
