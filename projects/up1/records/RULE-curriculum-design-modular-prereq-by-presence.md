---
id: RULE-curriculum-design-modular-prereq-by-presence
project: up1
type: rule
module: mods/curriculum-design
tags:
  - curriculum-mesh
  - modular
  - prereq
  - evaluateRequirementTree
  - DET-40
---

# En modo modular el chequeo de prerrequisitos es por PRESENCIA (remap centinela), sin tocar el evaluador

## What

En una malla MODULAR las entries no tienen `period` (es null), asi que el chequeo de prerrequisitos NO puede ser por periodo. Se hace por PRESENCIA reusando `evaluateRequirementTree` SIN modificarlo: el caller remapea las entries colocadas a un periodo centinela bajo (`MODULAR_PLACED_PERIOD=1`) y evalua el destino con uno alto (`MODULAR_OWNER_PERIOD=Number.MAX_SAFE_INTEGER`). Asi `placedPeriod < ownerPeriod` (Before) y `<=` (Concurrent/Either) equivalen a "presente". El evaluador queda intacto (el mismo que usa el camino secuencial).

## Why

`evaluateRequirementTree` marca un prereq como no satisfecho si `placedPeriod === null` (todas las entries modulares lo son) -> falso positivo total. Tocar el evaluador para el caso modular arriesgaria el camino secuencial (DET-40). El remap centinela en el caller preserva un unico evaluador para ambos modos.

## Where

- **Files**: `mods/curriculum-design/modsComponents/CurriculumMesh/` (callers: derivacion de nivel, alta guiada, clasificacion de borrado); `evaluateRequirementTree.logic.ts` (NO se toca).
- **Layers**: frontend / logica pura del mod.

## When

Siempre que se evalue satisfaccion de requisitos en modo modular. No re-implementar la satisfaccion; remapear el input.

## Verification

- El evaluador no tiene ramas `isModular`; el modo se resuelve por el remap del caller.
- Los tests de satisfaccion modular usan las constantes centinela.

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 5 (REQ-10).
- **Evidence**: L7 del ticket.

## Cluster

**Familia de evaluacion de malla modular (UPONE-1539):** [[RULE-curriculum-design-modular-prereq-by-presence]] · [[RULE-curriculum-design-modular-level-excludes-unplaced-options]] · [[RULE-curriculum-design-batch-coadd-carries-real-credits]] · [[RULE-curriculum-design-deletion-collapse-single-path]] · [[RULE-curriculum-design-safe-delete-failsafe]]. Disciplina de tests transversal: [[RULE-dev-test-real-shape-not-mocked]].
