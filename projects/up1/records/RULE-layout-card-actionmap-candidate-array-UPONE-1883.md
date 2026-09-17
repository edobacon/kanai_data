---
id: RULE-layout-card-actionmap-candidate-array-UPONE-1883
project: up1
type: rule
module: layout
tags:
  - UPONE-1883
  - sp10
  - recordlist
---

En RecordList, card.service.actionMap ahora acepta un ARRAY ORDENADO de candidatos de accion (antes un unico valor); el dispatcher src/layouts/RecordList/recordListCardActionDispatch.ts resuelve el primer candidato aplicable en orden. Tipos en src/shared/types/recordlist.ts; wiring en src/layouts/RecordList/RecordList.vue. sourceRef: e612dcd.
