---
id: DECISION-layout-subida-archivos-multipart-UPONE-1979
project: up1
type: decision
module: layout
tags:
  - UPONE-1979
---

`FileFieldElement.vue` sube el archivo con el composable `useFieldFileUpload.ts` a la ruta multipart de object-manager, y confirma el borrado y refresca la lista tras cambios. La suite expone los headers de la request en `plugins/apollo.client.ts` para las subidas que van fuera de Apollo (ae82130e en suite). [sin verificar: detalle de manejo de errores del composable]

sourceRef: 351b5e42 y 4de6ed1b (layout, UPONE-1979), ae82130e (suite), src/composables/useFieldFileUpload.ts
