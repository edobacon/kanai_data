---
id: DOC-kb-sp10-Decision-Test-de-core-del-profile-gating-app-resolver-getAppsFiltered-descartado
project: up1
type: doc
module: curriculum-design
tags:
  - core
  - rbac
  - profile-gating
  - navByRole
  - app.resolver
  - getAppsFiltered
  - mod-only
  - UPONE-1615
  - UPONE-1700
  - test-descartado
---

# Decision — Test de core del profile-gating (app.resolver getAppsFiltered) descartado: se mantiene mod-only, se difiere a core

**Tipo:** Decision de alcance · UPONE-1615 (TICKET-133), S4.T3/T6/T7 · frontera core/mod

## Contexto

Durante UPONE-1615 se escribio un test unit del resolver de **core** `getAppsFiltered`
(`object-manager`/`suite`), que implementa el **profile-gating** / `navByRole`. El archivo vivia en
`object-manager/tests/unit/resolvers/app.resolver.test.js` (431 lineas, **untracked** en `develop`),
23 casos, todos en verde.

## Decision

El ticket UPONE-1615 es **mod-only**. Ese test prueba codigo de **core** (el resolver vive en
object-manager/suite), no de los mods curriculares. Para no meter cambios de core en la rama del ticket,
**se descarta el archivo por ahora** y se mantiene el alcance **mod-only**. Si el core quiere cobertura
de este mecanismo, debe ir en un **PR propio de core** (object-manager), bajo el ticket dueño del
profile-gating: **UPONE-1700** (run-once gate / navByRole) o **UPONE-1513**.

## Que cubria (para reconstruirlo si se retoma en core)

`describe getAppsFiltered`:
- **Profile-gating de visibilidad (UPONE-1700)**: (a) rol con perfil mapeado VE la app y viaja
  `navScoped`; (b) rol sin perfil NO la ve (el rol institucional no es fallback); (c) borrar los
  mappings OCULTA la app profile-gated (no la vuelve publica); (c-bis) una cuenta de servicio la ve aun
  sin perfil (bypass documentado).
- **Admin/Consultor via perfil compuesto + 4 curriculares (S4.T6)**: Admin y Consultor (roles de core)
  ven la app por el compuesto y resuelven sus tabs; los 4 roles `Learning Assurance ... Curricular`
  (it.each) la ven; un rol institucional sin perfil no la ve.
- **No-regresion de orden/labels del menu 1616 (S4.T7)**: cada perfil de cd resuelve las 5 vistas en el
  orden/label de UPONE-1616; cm resuelve su unica vista; `navByRole` coincide 1:1 con `profileRoleMapping`
  (set de visibilidad exacto).

## Cobertura que SI queda en los mods (por que descartarlo no deja un hueco de mod)

El comportamiento de resolucion de perfiles (union por `extends`, dedupe, matriz accion->capability,
equivalencia vs baseline) queda cubierto de forma determinista por los tests de mod
`rbacProfiles.test.js`, `permissionMatrix.test.js` y `profileBaselineEquivalence.test.js` (verdes en cd
y cm). Lo que NO queda testeado desde los mods es el **resolver real de core** `getAppsFiltered` en si
(su filtrado por `up1_suite_app_role` en runtime); eso es responsabilidad de core.

## Estado

Descartado del working tree de object-manager (era untracked, sin historia git). Reconstruible desde
esta nota. Relacionado: `kb/sp10/Core-El-run-once-gate-del-profileRoleMapping-...` y
`RULE-curriculum-design-052`.
