---
id: RULE-up1-manager-columna-baseobject-recordtype-list-computed-UPONE-1500
project: up1
type: rule
module: up1-manager
level: should
tags:
  - UPONE-1500
  - record-list
  - computed
---

RecordList descarta toda clave de columna que no sea un campo del objeto, por lo que baseObject, que no es campo, no se mostraba. Se marcó computed: true en recordtype-list.json y un test de contrato lo exige.

Fuente: cebcca1 config/layouts/recordtype-list.json:31; tests/recordtype-base-object-contract.test.ts.
