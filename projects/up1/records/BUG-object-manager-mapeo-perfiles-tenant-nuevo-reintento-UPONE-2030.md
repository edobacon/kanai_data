---
id: BUG-object-manager-mapeo-perfiles-tenant-nuevo-reintento-UPONE-2030
project: up1
type: bug
module: object-manager/codegen-sync
tags:
  - UPONE-2030
  - sync
  - profiles
---

En un tenant nuevo el mapeo corre antes de que el seed core cree los roles institucionales; registrar ese no-op gatearía todos los syncs posteriores y los perfiles nunca se mapearían. Si desiredRoleIds está vacío no se graba la ejecución y el siguiente sync reintenta; con al menos un rol resuelto se registra como antes.

Fuente: aec0cb4f scripts/sync/dbSync.js:1688-1697.
