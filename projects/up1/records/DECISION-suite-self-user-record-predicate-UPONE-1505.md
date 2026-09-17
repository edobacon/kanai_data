---
id: DECISION-suite-self-user-record-predicate-UPONE-1505
project: up1
type: decision
module: suite
---

isSelfUserRecord() (nuevo composable, sin imports de Nuxt/Vue) centraliza la pregunta "es mi propio registro" para core_User. Ambas rutas de detalle le pasan core_user_self_view al orchestrator cuando el registro es el usuario autenticado, y el mismo predicado reemplaza las dos copias inline de los guards de acceso. Mantener layout y permiso bypass en un solo lugar evita que se desincronicen.

**sourceRef:** 8f3f8df + composables/selfUserRecord.ts:1-40.
