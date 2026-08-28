---
id: RULE-mods-061
project: up1
type: rule
module: mods
tags:
  - report-builder
  - rbac
  - auth
  - security
---

# requireAuth en todas las queries de lectura de report-builder; checkCapability en las mutations bespoke

## What

Todas las queries de `reportBuilderQuery` y `reportTemplateQuery` deben envolverse con `requireAuth`
(gate de autenticación, no de capability): rechazan acceso anónimo, permiten cualquier sesión
autenticada. Las mutations bespoke que bypasean el resolver genérico de instancia (`createReport`,
`updateReport`, `deleteReport`, `duplicateReport`, `createReportTemplate`, `updateReportTemplate`,
`deleteReportTemplate`) deben llamar `checkCapability` con capabilities namespaced
`mod/up1-manager/*` (ej. `mod/up1-manager/report:create`, `mod/up1-manager/reporttemplate:delete`)
ANTES de tocar la base de datos.

## Why

Estas mutations bespoke existen fuera del resolver genérico de instancia
(`instance.resolver.js` en object-manager), que sí trae auth/RBAC automático. Antes de este fix solo
había gating en la UI (`requiredPermissions`), que nunca corría contra llamadas GraphQL directas:
cualquier request autenticado podía crear/editar/borrar templates y reports sin la capability
correspondiente. Enlaza [[BUG-mods-013]] (el bug de este gap). El gate de autenticación en las
queries (`requireAuth`) es un ticket separado (UPONE-1412 / SEC-02) y NO reemplaza el checkCapability
de las mutations: son gates distintos (autenticación vs autorización).

## Where

- `report-builder/logic/reportData.resolver.js:920-921` (`reportBuilderQuery` se arma con
  `Object.fromEntries(Object.entries(reportBuilderQueryRaw).map(([name, resolver]) =>
  [name, requireAuth(resolver)]))`); `checkCapability` en `createReport`/`updateReport`
  (línea 932/1076) y `deleteReport`/`duplicateReport` (línea 1400/1427).
- `report-builder/logic/reportTemplate.resolver.js:214` (mismo patrón `requireAuth` en
  `reportTemplateQuery`); `checkCapability` en create/edit/delete de template (líneas 400/478/595).
- `report-builder/logic/reportVisibility.js` (filtro de visibilidad por rol, complementario:
  `buildTemplateVisibilityWhere`/`canViewTemplateForRoleNames`, case-sensitive para calzar con el
  `hasSome` de Prisma sobre `String[]`).

## When

Al agregar una nueva query o mutation bespoke a report-builder que no pase por el resolver genérico
de instancia del object-manager.
