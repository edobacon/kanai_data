---
id: BUG-object-manager-sync-ignores-isactive-UPONE-1798
project: up1
type: bug
module: object-manager
---

scripts/sync/dbSync.js hardcodeaba isActive: true en cada upsert de layout/app, ignorando el valor del JSON del mod. Esto hacia que isActive: false en un layout de mod fuera un no-op, y revertia cualquier toggle manual de isActive hecho desde el admin de up1-manager en el siguiente sync. Fix: `isActive: app.isActive !== false` / `isActive: layout.isActive !== false`.

**sourceRef:** 338b8f5c + scripts/sync/dbSync.js:725 y 814.
