---
id: BUG-object-manager-sync-report-definition-silencioso-UPONE-1693
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1693
  - sp11
  - sync
  - reportes
---

syncModReports referenciaba existingExt, un guard sin declarar que quedo huerfano tras UPONE-1377; cada creacion de reporte lanzaba un ReferenceError visible solo en nivel debug. Se quito el guard muerto y el catch de definicion y de plantilla pasa por recordTenantError, para que un fallo real aparezca en el resumen del sync. Segundo bug en la misma rama: escribir templateId como escalar junto al connect/disconnect de category fuerza el checked update input de Prisma, que descarta templateId en favor de la relacion.

sourceRef: cbed8d9a scripts/sync/dbSync.js:2862
