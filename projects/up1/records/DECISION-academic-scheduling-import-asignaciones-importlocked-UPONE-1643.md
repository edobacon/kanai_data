---
id: DECISION-academic-scheduling-import-asignaciones-importlocked-UPONE-1643
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1643
  - scenario-import
  - importLocked
---

Scenario.importLocked se enciende al pasar el import a running (con el último trozo) y se apaga al quedar succeeded, rejected o discarded. Solo lo escriben las mutaciones del import y el clonado no lo copia (está en el exclude del clone). En scenario-list deshabilita Clonar y Simular y oculta Borrar. El import se procesa en el mismo proceso con subida en segundo plano y detalle de filas paginado.

Fuente: faa1f07 objects/Scenario.json:20,49-54; logic/scenario-import.resolver.js:344,726,970.
