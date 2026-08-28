---
id: RULE-core-023
project: up1
type: rule
module: core
tags:
  - clone
  - deepclone
  - polymorphicChildren
  - directChildren
  - codegen
  - versioning
  - core
---

# deepClone de hijos: clasificar por mecanismo de FK (polymorphicChildren vs directChildren)

## What

Clasificar cada relación de hijos clonables por el mecanismo de su FK, no por si el objeto es polimórfico. `polymorphicChildren`: el hijo apunta al padre con un par de FK polimórfico (`ownerType`+`ownerId`, discriminado) — se declara en el **owner** bajo `metadata.polymorphicChildren` con `via: "ownerType/ownerId"` y `ownerTypeValue`. `directChildren`: el hijo apunta por una FK concreta simple, incluida la self-referencia recursiva (ej. `fk: "parentId"`, `recursiveBy: "parentId"`). Un mismo objeto puede participar en ambas al mismo tiempo.

## Why

Elegir el contenedor por 'el objeto es polimórfico' lleva a poner relaciones recursivas de FK directa en `polymorphicChildren`, lo que: (1) aborta el codegen del tenant (validador rechaza la forma inválida), bloqueando que `uniqueScopedBy` u otras props se persistan en el registry; (2) rompe el routing del deepClone de subárbol: el path polimórfico consulta `findMany({ ownerType, ownerId })` y obtiene 0 filas cuando debería consultar por `parentId`. El cloneMap (`buildRemapAPI.toObject`) mapea `oldId→{newId,type}` (NO string plano); extraer `.newId` es obligatorio para re-puntear FKs internas.

## Where

- `mods/curriculum-design/objects/CurricularSection.json` — `metadata.polymorphicChildren` vs `metadata.directChildren`
- `object-manager/objects/business/Base/curricularsection.json` (copia synced)
- `object-manager/src/graphql/resolvers/deep-clone-polymorphic.js` — walk via `findMany({ ownerType, ownerId })`
- `object-manager/src/graphql/resolvers/deep-clone-direct.js` — walk via `findMany({ [fk]: sourceId })`
- `object-manager/src/services/codegen/generatePrismaSchema.js` — validador `polymorphicChildren` (SP3, `5b67fc7`)

## When

Al declarar `metadata.polymorphicChildren` o `metadata.directChildren` en cualquier objeto del mod. Al implementar o extender el deepClone de subárbol. Al extender el evento BullMQ post-create para exponer `_cloneMap` a hooks de mod.

## Verification

1. Para cada entrada en `metadata.polymorphicChildren`: verificar que usa `ownerType`+`ownerId`. 2. Para `metadata.directChildren`: verificar FK concreta (posiblemente `recursiveBy`). 3. `npm run codegen -- <tenant>` sin errores. 4. Verificar conteo de registros clonados en E2E.

## Source

- **Discovered in**: TICKET-054, TICKET-037, TICKET-043
