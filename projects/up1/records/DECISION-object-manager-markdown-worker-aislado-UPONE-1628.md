---
id: DECISION-object-manager-markdown-worker-aislado-UPONE-1628
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1628
  - sp11
  - markdown
---

El worker de conversion (txt, csv, docx, xlsx, pdf) recibe solo { mime, buffer, filename } por workerData: nunca tenant, bucket ni Prisma, asi que estructuralmente no puede escribir en el tenant equivocado. Se usa terminate() para cortar trabajo CPU-bound (un Promise.race no detiene el calculo). Los limites (zip bomb, tamano de origen, paginas de PDF, timeout, heap) viven en limits.js y se configuran por env. Todo corre sobre buffers en memoria, sin archivos temporales.

sourceRef: ec67b064 src/services/markdown/conversionWorker.js, src/services/markdown/limits.js
