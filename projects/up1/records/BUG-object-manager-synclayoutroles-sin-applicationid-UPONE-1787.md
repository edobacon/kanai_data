---
id: BUG-object-manager-synclayoutroles-sin-applicationid-UPONE-1787
project: up1
type: bug
module: object-manager/codegen-sync
tags:
  - UPONE-1787
  - layouts
  - roles
  - security
---

Un layout auxiliar con applicationId null caía en el guard '&& applicationId' antes de syncLayoutRoles, se descartaban sus roles declarados y el default 'sin filas de rol = público' lo hacía visible a todos. syncLayoutRoles resuelve por nombre y no necesita applicationId; el guard se mantiene solo en syncLayoutProfiles, que sí necesita contexto de app.

Fuente: 628f1ad9 scripts/sync/dbSync.js:961-968.
