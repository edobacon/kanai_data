---
id: RULE-layout-record-list-card-respeta-confirmcascade-UPONE-2027
project: up1
type: rule
module: layout/record-list
level: should
tags:
  - UPONE-2027
  - record-list
  - row-actions
---

Antes la card llamaba al handler directo y la confirmación declarada solo aparecía desde la tabla. runCardAction espera confirm cuando la acción declara confirmCascade, no llama al handler si el usuario rechaza, y devuelve si se ejecutó para refrescar solo cuando hubo cambio.

Fuente: 8031dd1e src/layouts/RecordList/recordListCardActionDispatch.ts:57.
