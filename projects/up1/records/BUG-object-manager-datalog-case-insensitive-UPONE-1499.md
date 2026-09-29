---
id: BUG-object-manager-datalog-case-insensitive-UPONE-1499
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1499
  - sp11
  - auditoria
  - datalog
---

El lookup de metadata del objeto para el DataLog distinguia mayusculas en el nombre del tenant y ademas se resolvia sin pasar por el pipeline de schema, lo que dejaba eventos de auditoria incompletos o perdidos. Ahora busca el archivo del objeto sin distinguir mayusculas (igual que el codegen) tanto en core/ como en up1/.

sourceRef: 337b5122 src/events/decorators/withDataLog.js:78
