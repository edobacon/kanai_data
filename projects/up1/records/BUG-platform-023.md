---
id: BUG-platform-023
project: up1
type: bug
module: platform
tags:
  - report-builder
  - dashboard
  - filter
  - bug-fix
---

# El filtro "Created By Me" del dashboard de reportes no matcheaba nunca

## Symptom

En el dashboard de Report Builder, el filtro "Creado por mi" devolvia siempre la lista vacia, sin importar cuantos reportes hubiera creado el usuario actual.

## Expected behavior

El filtro "Creado por mi" deberia comparar contra campos que la API realmente expone (`createdById`, `createdByUser`), no contra un campo inexistente, y devolver los reportes del usuario actual.

## Root cause

File: `report-builder/modsComponents/ReportListManager/useReportDashboard.ts:38-65` (`createdByMe`)
Cause: la comparacion original usaba `r.createdBy`, un campo que la API de Report/ReportTemplate **nunca devuelve**. El objeto expone `createdById` (id numerico del creador) y `createdByUser` (relacion con `name`/`email`), pero no un campo plano `createdBy`; la comparacion contra `undefined` nunca era verdadera para ningun registro.

## Fix

Se reescribe el match contra los campos reales que la API si expone: coincidencia exacta por `createdById` (normalizado a string en minusculas contra el id del usuario actual), o coincidencia fuzzy bidireccional por `createdByUser.name`/`createdByUser.email`. De paso se eliminan los parametros `tenantId`/`scopeType` no usados de los helpers de listado del mismo composable (`useReportBuilder.ts`), porque el tenant ya viaja por el header `X-Tenant-ID` y no por parametro explicito.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Filtro "Created By Me" | Siempre vacio (comparaba contra un campo inexistente en la respuesta) | Devuelve los reportes/templates del usuario actual, por id exacto o por nombre/email |
| Firma de `listReports`/`listReportTemplates`/`listCategories` | Aceptaban `tenantId`/`scopeType` sin uso real | Firma reducida a los parametros que efectivamente se consumen |

## Reproduction

### Steps
1. Crear reportes/templates con el usuario actual como creador.
2. Abrir el dashboard de Report Builder y aplicar el filtro "Creado por mi".
3. Verificar que la lista devuelta esta vacia pese a existir reportes propios.
