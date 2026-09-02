---
id: DECISION-core-institutional-roles-fail-closed-UPONE-1699
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1699
  - sp9
  - roles
  - core
  - seed
---

Se elimina el auto-create de roles institucionales; el seed de plataforma pasa a fail-closed. CLI de auditoria e inventario + borrado guardado de huerfanos. Reporte de convencion de naming en el sync; el reporte fail-closed nombra el archivo de la declaracion (AC4).

sourceRef (verificado por diff): object-manager 6b40cca7 scripts/sync/dbSync.js + scripts/sync/roleNaming.js + scripts/sync/SyncManager.js (fin auto-create + fail-closed + naming), 30083b07 scripts/roles-audit.js + scripts/roles-delete-orphan.js (CLI auditoria + borrado huerfanos), 3af269d7 (reporte naming en sync), b1cd98ef (fail-closed nombra archivo).
