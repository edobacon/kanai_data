---
id: RULE-suite-009
project: up1
type: rule
module: suite
tags:
  - navigation
  - homescreen
  - navtabs
---

# La navegacion de una app se declara con `homescreen` + `navTabs` + `navScoped`, reemplazando `defaultObjects`

## What

Una app declara su navegacion con tres campos server-resueltos: `homescreen` (layout de aterrizaje), `navTabs` (lista de tabs, cada uno con `kind: 'object'` o `kind: 'dashboards'`) y `navScoped` (booleano que activa el modo donde `navTabs` es la unica fuente, sin fallback a `defaultObjects`). El tab `kind: 'dashboards'` agrupa layouts sueltos bajo la clave sintetica reservada `__dashboards__`.

## Why

El mecanismo legacy (`defaultObjects`) solo permitia listar objetos, sin distinguir un grupo de "Dashboards" ni resolver el aterrizaje inicial de la app. `navTabs`/`homescreen` se resuelven server-side y reemplazan a `defaultObjects` como fuente cuando `navScoped` esta activo, habilitando la navegacion "homepage por modulo via dashboard".

## Source_ref

- `composables/navTabs.ts:33` (`export const DASHBOARDS_GROUP_KEY = '__dashboards__';`)
- `composables/navTabs.ts:154-161` (`navOrderedGroupKeys`, agrega `DASHBOARDS_GROUP_KEY` cuando `t?.kind === 'dashboards'`)
- `composables/useObjectManager.ts:58-63` (interfaz `Application`: `homescreen?: string | null`, `navTabs?: NavTab[]`, `navScoped?: boolean`, comentario "PLAT-15: true when the app uses navByRole")
- `composables/useObjectManager.ts:647,655` (`navOrderedGroupKeys(navTabs, ...)`, chequeo de `activeApplication.value?.navScoped`)
- `objects/up1_suite_app.json` (definicion del objeto de app, confirmado que existe; no se cito linea especifica del JSON)

## Where

- `suite/composables/navTabs.ts`
- `suite/composables/useObjectManager.ts`
- `suite/objects/up1_suite_app.json`
- `object-manager/objects/up1/suite/up1_suite_app.json`

## When

Al configurar la navegacion de una app nueva o migrar una existente al modo por rol: usar `homescreen` + `navTabs` + `navScoped`, no extender `defaultObjects`. Si se necesita un grupo de dashboards, usar un tab `kind: 'dashboards'`: la clave `__dashboards__` es reservada y no debe reutilizarse como `objectName` real.
