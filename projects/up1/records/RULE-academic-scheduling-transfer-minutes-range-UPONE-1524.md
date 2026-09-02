---
id: RULE-academic-scheduling-transfer-minutes-range-UPONE-1524
project: up1
type: rule
module: academic-scheduling
tags:
  - UPONE-1524
  - sp9
  - academic-scheduling
  - TransferTime
---

(UPONE-1524) El rango de minutos de traslado (TransferTime) se enforza tanto en el inline edit como en la API, no solo en la UI.

sourceRef (verificado por diff): academic-scheduling db2de3d objects/TransferTime.json:~4 + tests/unit/transferTimeObject.test.js (enforce transfer minutes range on inline edit and API).
