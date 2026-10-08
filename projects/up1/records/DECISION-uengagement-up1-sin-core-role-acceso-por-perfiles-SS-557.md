---
id: DECISION-uengagement-up1-sin-core-role-acceso-por-perfiles-SS-557
project: up1
type: decision
module: uengagement-up1
tags:
  - SS-557
  - SS-521
  - UPONE-1761
  - rbac
  - profiles
---

Se eliminaron ensureEngagementRoles, linkEngagementRolesToCoreAdmins y seed/_data-rbac.js completo; el acceso queda como rol institucional, profileRoleMapping y perfil. Los seis core_Role del mod y sus filas colgantes se borran por tenant con seed/migrations/2026-09-29-eliminar-roles-del-mod.sql, que antes asigna Facilitador, Estudiante y Gestor a las cuentas que tenían el rol equivalente. Admin y Coordinador no se otorgan solos, y los roles nuevos del cliente se mapean a mano desde la UI de RBAC. Reemplaza a DECISION-uengagement-up1-mod-creates-own-roles-UPONE-1761 y cierra el paso 4 de DECISION-uengagement-up1-application-profiles-SS-521.

Fuente: 8a97da8 seed/seed.js:22; seed/_data-rbac.js (eliminado); .ai/CONTEXT.md (sección Migración cerrada SS-557).
