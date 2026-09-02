---
id: DECISION-core-application-profiles-UPONE-1700
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1700
  - sp9
  - rbac
  - core
  - profiles
---

Decision sp9 (UPONE-1700). Se renombra "mod-role" a "application profile" en todo el stack. Reglas: (1) exclusividad roles XOR profiles validada en el sync; (2) la visibilidad/acceso de layout se resuelve por application profile via FK, no por nombre; (3) enum DefaultLayoutStatus + terminologia renombrada; tenant-create deja de escribir profileRoleMapping en app-write. Afecta object-manager, layout, suite, up1-manager, hello-world-mod, curriculum-design.

sourceRef (verificado por diff): object-manager scripts/sync/dbSync.js:1376 (08708c1a exclusivity gate roles XOR profiles), src/graphql/resolvers/instance.resolver.js:3294 (4117b09e getInstance layout gate por profile), ec6e5be4 (rename mod-role -> application profile); layout logic/layout.resolver.js:83 + objects/up1_layen_layout_role.json (cbc1aa7a layout profile field + FK-based visibility), 62e32507 (resolveDefaultLayout por profile); suite 13ad970 (getAppsFiltered: profile-gated apps never fall open).
