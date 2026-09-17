---
id: RULE-curriculum-design-052
project: up1
type: rule
module: curriculum-design
---

El vinculo rol -> application profile de un mod se DECLARA en `config/app.json` (`profileRoleMapping`) y lo MATERIALIZA el sync (`syncAppProfileMapping` en `object-manager/scripts/sync/dbSync.js`) en el bridge `up1_suite_app_role.modRoleId`; no requiere runbook manual. Una app con `navByRole` es profile-gated: visible solo a quien sostiene el perfil mapeado, nunca publica; borrar los mappings la oculta.

**PERO** el rename de roles institucionales debe PRECEDER al 1er sync del `profileRoleMapping`: `syncAppProfileMapping` resuelve los roles por NOMBRE (`core_Role.findFirst({ name })`), y el run-once gate por fingerprint (UPONE-1700, dbSync.js:1490-1500) CONGELA un mapeo parcial si en ese 1er sync los roles aun tienen el nombre viejo -> los saltea (`profile_mapping_role_absent`) y marca el run como hecho. El unico desbloqueo es un reseed forzado: `UP1_SEED_RESEED=true pnpm sync`.

Verificacion: contar `up1_suite_app_role` con `modRoleId != null` por app curricular (esperado: 6 = 4 roles curriculares + Admin + Consultor via compuesto). Detectado en runtime (smoke S6.T3, TICKET-133); tema de dbSync (core), trasladado a core en `kb/sp10/Core-El-run-once-gate-del-profileRoleMapping-...`.
