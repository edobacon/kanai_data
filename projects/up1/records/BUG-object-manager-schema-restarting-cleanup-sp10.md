---
id: BUG-object-manager-schema-restarting-cleanup-sp10
project: up1
type: bug
module: object-manager
---

Se agrega src/services/schemaConvergence.js: la ultima copia viva de un servicio limpia activamente el estado 'restarting' en vez de esperar a que expire por TTL, evitando una ventana de indisponibilidad percibida en el hot-swap de schema. Commit sin referencia de ticket en el subject.

**sourceRef:** e21e6934 + src/services/schemaConvergence.js (nuevo), src/services/applyChanges.js.
