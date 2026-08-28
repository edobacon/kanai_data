---
id: BUG-object-manager-007
project: up1
type: bug
module: object-manager
tags:
  - rbac
  - field-level
  - data-leak
  - getInstance
---

# getInstance exponía campos sin capability field-view (no aplicaba el filtro de listInstances)

## Symptom

Un usuario que solo tenía capability field-level (`object.field:view` de al menos un campo, sin el object-level `object:view`) podía ver TODOS los campos del registro al abrir el detalle (vía `getInstance`), aunque `listInstances` ya restringía correctamente la misma fila a solo los campos permitidos.

## Root cause

- **File**: `src/services/auth/authChecker.js` (funciones `computeFieldViewAccess`/`filterDataByAllowedFields`, verificado en líneas 476 y 513); consumidas por `getInstance` en `src/graphql/resolvers/instance.resolver.js`.
- **Cause**: `getInstance` devolvía todos los campos del registro tras pasar el gate object-level, incluso cuando ese gate solo se cumplía por el fallback field-level (tener *cualquier* `object.field:view`). La lógica de filtrado de `listInstances` no estaba extraída ni reutilizada en `getInstance`.

## Fix

Se extrajo la lógica compartida a `computeFieldViewAccess`/`filterDataByAllowedFields` en `authChecker.js` y se aplicó también en `getInstance` (`instance.resolver.js:2961/2965` y `3165/3169`), logrando paridad list↔detail. Ver [[RULE-core-040]].

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios con capability field-level pero sin object-level:view |
| Data affected | cualquier objeto con capabilities field-level configuradas |
| Modules affected | object-manager (RBAC), cualquier layout que use RecordDetail sobre esos objetos |
| Frequency | siempre que se abría el detalle de un registro bajo esa condición de permisos |
