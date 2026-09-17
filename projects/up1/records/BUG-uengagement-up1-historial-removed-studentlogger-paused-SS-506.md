---
id: BUG-uengagement-up1-historial-removed-studentlogger-paused-SS-506
project: up1
type: bug
module: uengagement-up1
---

7bb9363 elimina 112 lineas del tab de Historial en retention_ProgramEnrollment_view.json porque StudentLogger (el generador automatico de esas entradas) esta pausado y el tab quedaba vacio/engañoso; revert temporal, no definitivo.

**sourceRef:** 7bb9363 + config/layouts/retention_ProgramEnrollment_view.json (-112 lineas).
