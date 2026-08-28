---
id: RULE-curriculum-design-deletion-collapse-single-path
project: up1
type: rule
module: mods/curriculum-design
tags:
  - curriculum-mesh
  - requirement-tree
  - deletion
  - classification
  - dual-judge
  - testing
---

# La clasificacion de dependencia/borrado DEBE colapsar las vias unicas Group(OR)>Group(AND)>hoja

## What

El editor de requisitos envuelve TODO requisito en una via unica `Group(OR) > Group(AND) > hoja` (contenedor de un solo hijo normativo por nivel). Cualquier logica que recorra ese arbol para clasificar (ej. `findBlockingGroup` / `isRealAlternativeGroup` en la clasificacion de borrado) DEBE colapsar esas vias unicas igual que `evaluateRequirementTree`: un `Group` es una alternativa REAL (candidata a bloqueo) solo si tiene `creditsRequired`, o es OR / `minToSatisfy` CON `>=2` hijos normativos. Un contenedor OR de un solo hijo NO es una eleccion y no debe tratarse como grupo bloqueante.

## Why

Sin el colapso, borrar un curso que es prerrequisito UNICO de otro se clasifica `block` ("0 de 1") en vez de `cascade`, y la rama cascade queda MUERTA en produccion (siempre encuentra el OR contenedor primero). El bug es invisible a tests que construyen arboles "pelados" (RecordState/AND directos sin el envoltorio del editor): pasan verde mientras produccion falla. Cazado por dual-judge S9 trazando contra el fixture real.

## Where

- **Files**: `mods/curriculum-design/modsComponents/CurriculumMesh/deletionImpact.logic.ts` (`isRealAlternativeGroup`, `findBlockingGroup`); paridad en `up1-mcp/src/mods/curriculum-design/mesh-logic.ts`.
- **Layers**: logica pura del mod + su port al MCP.

## When

Al clasificar impacto de borrado, o cualquier recorrido del arbol de requisitos que decida "es una eleccion". Los tests DEBEN incluir la forma REAL del editor (`OR>AND>hoja`), no solo formas peladas.

## Verification

- Test: `{ D: [Group(OR)[Group(AND)[hoja(C)]]] }`, C prereq unico -> verdict `cascade` (no `block`).
- `isRealAlternativeGroup` exige `>=2` hijos normativos (o `creditsRequired`).

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 9 (dual-judge REQ-14).
- **Evidence**: L9 del ticket. Fix del colapso verificado contra `UPONE-1539-modular-smoke-fixture.sql`.

## Cluster

**Familia de evaluacion de malla modular (UPONE-1539):** [[RULE-curriculum-design-modular-prereq-by-presence]] · [[RULE-curriculum-design-modular-level-excludes-unplaced-options]] · [[RULE-curriculum-design-batch-coadd-carries-real-credits]] · [[RULE-curriculum-design-deletion-collapse-single-path]] · [[RULE-curriculum-design-safe-delete-failsafe]]. Disciplina de tests transversal: [[RULE-dev-test-real-shape-not-mocked]].
