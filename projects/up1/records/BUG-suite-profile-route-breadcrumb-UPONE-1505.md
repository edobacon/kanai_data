---
id: BUG-suite-profile-route-breadcrumb-UPONE-1505
project: up1
type: bug
module: suite
---

buildBreadcrumbTrail() devolvia como maximo el paso de la app para la ruta de perfil (sin object_name/layout_id), dejando la pantalla sin trail ni nombre. buildProfileTrail() arma "Inicio > Mi Perfil" con las labels que traduce el shell, con raiz en el landing del tenant (no en la seccion Usuarios).

**sourceRef:** 610f51f + composables/breadcrumbTrail.ts:275-309 (buildProfileTrail).
