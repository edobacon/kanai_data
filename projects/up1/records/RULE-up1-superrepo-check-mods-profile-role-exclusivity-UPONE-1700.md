---
id: RULE-up1-superrepo-check-mods-profile-role-exclusivity-UPONE-1700
project: up1
type: rule
module: up1-superrepo
---

analyzeProfileExclusivity escanea app.json y los layouts de cada mod activo y hace fallar check-mods (exit 1) cuando roles y el sistema de perfil estan declarados juntos, para que la regla de exclusividad (DECISION-core-application-profiles-UPONE-1700) se aplique tambien fuera del sync, no en un unico punto.

**sourceRef:** 2a09ee2 + scripts/check-mod-structure.js:1-69 (analyzeProfileExclusivity).
