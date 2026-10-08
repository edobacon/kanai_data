---
id: RULE-up1-manager-counter-seeds-capabilities-runalways-UPONE-1914
project: up1
type: rule
module: up1-manager
level: must
tags:
  - UPONE-1914
  - seeds
  - capabilities
---

restrict-user-create-to-admin.js y restrict-report-templates-to-admin.js deshacen el auto-grant de la fase 4 del capability sync, que corre en cada sync sin importar el contenido del seed. Un gate por hash de contenido dejaba ganar el grant en silencio después de la primera corrida, por eso ambos exportan runAlways = true. Todo seed que revoque capabilities concedidas por el sync debe declararlo.

Fuente: c97efd5 seed/restrict-user-create-to-admin.js:15; seed/restrict-report-templates-to-admin.js:20.
