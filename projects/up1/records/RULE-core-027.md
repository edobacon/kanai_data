---
id: RULE-core-027
project: up1
type: rule
module: core
tags:
  - versionado
  - clonado
  - cascada
  - deepClone
  - core
  - sp5
---

# El motor de deep-copy en cascada (clonar/versionar hijos) ya existe en core y es config-driven

## What

Para clonar/versionar los HIJOS de un objeto contenedor, NO construir un motor: ya existe en core. Helpers `deep-clone-polymorphic.js` (hijos por ownerType/ownerId) y `deep-clone-direct.js` (FK 1-N) + `applyDerivedRemap` (remapeo de FKs internas), activados por `prefillFrom.deepClone` + `metadata.directChildren`/`polymorphicChildren` del objeto. Se DECLARA config, no se escribe código por-objeto.

## Why

Evita reimplementar la cascada. Precedente real: `Activity` declara `deepClone: ["sections"]` y arrastra CurricularSection (recursiveBy parentId) + sub-secciones + CurricularLink con remapeo de FKs. Se activa en instance.resolver.js cuando prefillFrom.deepClone tiene aliases.

## Where

objects/<contenedor>.json (config: directChildren/polymorphicChildren + prefillFrom.deepClone). El motor vive en object-manager/src/graphql/resolvers/helpers/ — no tocar salvo gap real.

## When

Al versionar/clonar un objeto con hijos (ej. Curriculum → planEntry + requirementCategory + requirement). OJO: el padre con RecordType tiene un gap aparte (ver BUG-core-004).

## Verification

Declarar deepClone y verificar que la copia remapea las FKs (ningún hijo de la v2 apunta a ids del original). Tests e2e: object-manager/tests/e2e/clone-*-children.test.js.

## Source

- **Discovered in**: —
