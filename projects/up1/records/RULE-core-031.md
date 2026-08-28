---
id: RULE-core-031
project: up1
type: rule
module: core
tags:
  - delete-cascade
  - casing
  - name-resolution
  - introspection
  - subtree
  - UPONE-1382
---

# Comparar pertenencia por identidad normalizada, no por el nombre de tipo crudo

## What

Cuando el motor de delete/clone (u otro codigo core) decide si un registro pertenece a un conjunto (subarbol de borrado, plan de cascada, set de nodos), la comparacion de la clave `objectType:id` MUST hacerse sobre identidad **normalizada** (tipo resuelto a un casing canonico, o resuelto por introspeccion del schema Prisma), NO comparando el nombre de tipo crudo tal como cada fuente lo provee. En particular: NO comparar el `PascalName` de un modelo Prisma contra una clave construida con el `object` de la metadata (que un JSON puede declarar en minuscula). Los dos strings referencian el mismo objeto pero difieren en casing.

## Why

El `object` de la metadata de hijos (`directChildren`/`polymorphicChildren`) se declara con casing libre por cada JSON (ej. `Curriculum.json` declara `requirementCategory` en minuscula), mientras el escaneo de FK entrantes reporta el `PascalName` del modelo (`RequirementCategory`). Comparar strings crudos hace que un hijo del subarbol se cuente como referencia externa → false-Restrict que bloquea un borrado valido (BUG-curriculum-design-012). Es la misma clase de fragilidad que ya obligo al lookup case-insensitive en `getObjLabels`/`findModelKeyCI`: el casing de los nombres de objeto/modelo NO es uniforme en up1, asi que ninguna comparacion de identidad puede asumir un casing fijo.

## Where

- **Files**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (helper `normalizeSubtreeKey`; `subtreeKeys` en `detectRestrictions`; `filterExternal` en `findIncomingReferences`). Aplica a cualquier codigo core que compare claves `objectType:id`.
- **Layers**: backend
- **Precedentes del mismo principio**: `findModelKeyCI` (resolucion CI del accessor Prisma), `getObjLabels` (lookup CI de core_ObjectDefinition)

## When

Siempre que se compare si una clave `objectType:id` (o un nombre de objeto/modelo) pertenece a un conjunto, y las dos puntas de la comparacion provengan de fuentes con convenciones de casing distintas (metadata JSON vs nombre de modelo Prisma vs objectType del request). Aplica en delete cascade, deep-clone, y cualquier walk que arme sets de nodos por clave compuesta.

## Verification

- Unit: un caso que arme un subarbol con un hijo cuyo `object` de metadata este en minuscula y verifique que NO se marca como referencia externa (ej. `R-CASING` en `deleteImpactPlan.test.js`, roja sin la normalizacion).
- Integration: borrado real de un padre con ese hijo debe cascada, no Restrict (TC-2 en `hard-delete-cascade.integration.test.js`).
- Grep: buscar comparaciones `Set.has(\`${Pascal}:${id}\`)` o similares que no pasen por un normalizador.

## Source

- **Discovered in**: TICKET-107, Session 1 (review de UPONE-1382)
- **Evidence**: el false-Restrict de `requirementCategory` (BUG-curriculum-design-012); dos unit tests estaban verdes porque cargaban un `object` PascalCase inexistente en el JSON real, ocultando la fragilidad.
- **Related**: BUG-curriculum-design-012, DEC-050, DEC-LOCAL-01 (spec), RULE-core-023 (clasificacion de hijos por mecanismo de FK), memoria de proyecto "resolver nombres por introspeccion, no por string"
