---
id: RULE-platform-017
project: up1
type: rule
module: platform
tags:
  - graphql
  - listInstances
  - relations
  - includeRelations
  - object-manager
  - frontend
  - mapping
---

# Relaciones incluidas en listInstances: el nombre del FK va en lowercase (no-core) y los datos llegan en item.data[rel] (fallback extended)

## What

Al consumir `listInstances(..., includeRelations: true, relations: [...])` y mapear el resultado, dos contratos del resolver DEBEN respetarse:

1. **Nombre de la relación = lowercase del FK sin sufijo `Id`** (para objetos NO core). El resolver lo deriva con `getRelationName(modelName, fkField)`: `baseName = fkField.replace(/Id\d*$/, '')`, y si el modelo **no** empieza con `core_` → `baseName.toLowerCase()`. Ejemplos: `activityId` → `activity`, `categoryId` → `category`, `planId` → `plan`. Pasar el nombre del **objeto** (PascalCase, ej. `Activity`) en `relations` produce un include que Prisma **ignora en silencio** (no error, relación ausente).
2. **Los datos de la relación llegan en `item.data[<rel>]`** (fusionados por el resolver), con fallback defensivo a `item.extended[<rel>]`. El patrón de lectura correcto es `item.data[rel] ?? item.extended[rel]` (igual que `buildTree.ts`). Leer sólo de `item.extended['<Rel>']` falla.

> Para objetos `core_*` el nombre conserva el `baseName` sin lowercase (ver la rama `modelName.startsWith('core_')`). La regla lowercase aplica a objetos de mods/no-core.

## Why

Caso real (TICKET-085 / MC-05): el composable de la malla leía la asignatura desde `item.extended['Activity']` y pedía `relations: ['Activity', 'requirementCategory']`. Como el resolver nombra la relación `activity` (lowercase) y la deposita en `item.data`, el include con `'Activity'` se ignoró y la lectura de `extended['Activity']` devolvía `null` → en runtime toda la malla habría mostrado UUIDs en lugar de códigos, nombres vacíos y créditos en 0. El bug pasó tests unitarios (la lógica pura no toca la capa de carga) y fue cazado por el dual-judge + verificación del resolver. Es un contrato fácil de equivocar y de falla silenciosa.

## Where

- Resolver: `object-manager/src/graphql/resolvers/instance.resolver.js` — `getRelationName(modelName, fkFieldName)` (~línea 140) y la fusión de relaciones incluidas en `item.data` (enhancedData).
- Patrón de lectura de referencia: `mods/curriculum-design/modsComponents/CompositeSectionTree/buildTree.ts` (`const rt = d[relationName] ?? ext[relationName]`).
- Aplica a cualquier consumer de `listInstances` con `relations`/`includeRelations` (composables del frontend, modsComponents, adapters).

## When

Al escribir/mapear cualquier query `listInstances` que incluya relaciones de FK. Antes de asumir el nombre o la ubicación: derivar el nombre con la regla lowercase y leer de `data` con fallback a `extended`.

## Verification

- En el array `relations`: el nombre es el FK sin `Id` en lowercase (`activityId`→`activity`), no el nombre del objeto.
- El mapeo lee `item.data[rel] ?? item.extended[rel]` (no sólo `extended`).
- Empírico: con datos reales, los campos de la relación (código, nombre, créditos) llegan poblados, no `null`/UUID.

## Source

TICKET-085 (MC-05 / UPONE-1348), learn L1 — relación `Activity`/`extended` (incorrecta) vs `activity`/`data` (real); confirmado contra `instance.resolver.js` `getRelationName` + `buildTree.ts`; fix en `f2a2cf5` (commit del composable corregido).
