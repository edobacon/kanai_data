---
id: RULE-curriculum-design-safe-delete-failsafe
project: up1
type: rule
module: mods/curriculum-design
tags:
  - curriculum-mesh
  - deletion
  - fail-safe
  - cache
  - safety
  - dual-judge
---

# El borrado seguro de la malla debe FAIL-SAFE ante datos de dependencia incompletos

## What

La clasificacion de borrado (allow/cascade/block) depende de la cache de arboles de requisitos (`meshTrees`, poblada async). Si esa cache NO esta completa (carga en vuelo, o un fetch por-actividad fallo y quedo cacheado como `[]`), el flujo de borrado NO debe clasificar con datos parciales: debe ESPERAR (await de la carga de TODAS las entries colocadas) o BLOQUEAR con un mensaje claro. NUNCA degradar a `allow` por falta de datos. Distinguir "fetch fallo" de "genuinamente sin requisitos".

## Why

Es una operacion DESTRUCTIVA. Degradar a `allow` cuando el dato de dependencia inversa aun no llego borra un curso que ES prerrequisito de otros, dejando huerfanos y saltandose toda la red de cascada/bloqueo — justo lo que la feature existe para evitar. Fail-open en una feature de seguridad es el fallo peligroso. Cazado por dual-judge S9.

## Where

- **Files**: `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue` (`onEditRemove`), `useMeshPrereqScan.ts` (`ensureTrees`/`failedActivityIds`).
- **Layers**: frontend del mod (wire del borrado).

## When

Siempre que se dispare un borrado que dependa de la clasificacion por dependencia inversa. Antes de clasificar, asegurar los arboles de las colocadas; ante incompletitud, diferir/bloquear.

## Verification

- `onEditRemove` hace `await` de la carga de arboles de TODAS las entries colocadas antes de clasificar.
- Si alguna fallo, aborta con mensaje (no clasifica ni borra).

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 9 (dual-judge REQ-14).
- **Evidence**: L10 del ticket.

## Cluster

**Familia de evaluacion de malla modular (UPONE-1539):** [[RULE-curriculum-design-modular-prereq-by-presence]] · [[RULE-curriculum-design-modular-level-excludes-unplaced-options]] · [[RULE-curriculum-design-batch-coadd-carries-real-credits]] · [[RULE-curriculum-design-deletion-collapse-single-path]] · [[RULE-curriculum-design-safe-delete-failsafe]]. Disciplina de tests transversal: [[RULE-dev-test-real-shape-not-mocked]].
