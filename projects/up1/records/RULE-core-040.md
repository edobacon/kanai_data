---
id: RULE-core-040
project: up1
type: rule
module: core
tags:
  - rbac
  - field-level
  - list-detail-parity
---

# Paridad field-view entre list y detail: getInstance filtra campos igual que listInstances

## What

`getInstance` MUST aplicar el mismo filtro de capabilities field-level que `listInstances`: si el usuario solo pasó el gate object-level por el fallback field-level (tiene *algún* `object.field:view`), la respuesta debe devolver únicamente los campos permitidos, no el registro completo.

## Why

Antes del fix, `listInstances` ya filtraba campos sin capability de vista, pero `getInstance` devolvía todos los campos del registro tras pasar el gate object-level, aun cuando ese gate solo se cumplía por el fallback field-level. Esto exponía datos sin permiso en la vista de detalle (fuga de datos RBAC). Ver [[BUG-object-manager-007]].

## Where

`src/services/auth/authChecker.js:476` (`computeFieldViewAccess`) y `src/services/auth/authChecker.js:513` (`filterDataByAllowedFields`), lógica compartida consumida tanto por `listInstances` como por `getInstance` en `src/graphql/resolvers/instance.resolver.js` (líneas 2797/2805, 2961/2965, 3165/3169).

## When

Al agregar un nuevo path de lectura de instancias (query, resolver custom, o exposición de datos de un objeto) que retorna campos: verificar que aplique `computeFieldViewAccess`/`filterDataByAllowedFields`, no solo el gate object-level.
