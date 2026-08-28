---
id: RULE-curriculum-design-batch-coadd-carries-real-credits
project: up1
type: rule
module: mods/curriculum-design
tags:
  - curriculum-mesh
  - alta-en-lote
  - co-add
  - creditos
  - MetricThreshold
  - prereqCheck
---

# Las entries sintéticas del co-add del alta en lote deben llevar los créditos REALES de cada activity

## What

En el chequeo de prerrequisitos del alta en lote (`findMissingPrereqsForBatch` → `buildCoAddedEntries`), las entries SINTÉTICAS que representan a los demás cursos del mismo lote (co-agregados) deben llevar los **créditos reales** de cada activity, no 0. El caller (`checkPrereqsForBatch`) resuelve un mapa `activityId → créditos` desde el catálogo (`allActivityItems`) y lo pasa como `creditsByActivity`. Un id sin crédito conocido cae a 0 (no infla el umbral).

## Why

Un requisito `MetricThreshold(Credits >= N)` de un curso del lote se evalúa sumando los créditos de las entries "colocadas" (incluidas las sintéticas del co-add). Si las sintéticas aportan 0, el umbral no se cumple aunque el lote traiga los cursos que aportan esos créditos: el alta conjunta del curso gateado por créditos junto con sus proveedores bloquea con un falso "faltan créditos". Es el mismo espíritu del co-add por presencia de los prereqs-curso (ver [[RULE-curriculum-design-modular-prereq-by-presence]]), pero para la cláusula de créditos, que se había quedado fuera.

## Where

- **Files**: `mods/curriculum-design/modsComponents/CurriculumMesh/prereqCheck.logic.ts` (`buildCoAddedEntries`, `findMissingPrereqsForBatch`); `CurriculumMeshElement.vue` (`activityCreditsById` + `checkPrereqsForBatch`).
- **Layers**: frontend / lógica pura del alta de la malla.

## When

Siempre que se toque el co-add del alta en lote o se agreguen umbrales por métrica. Si aparece un `MetricThreshold` con **scope `category`**, recordar que las entries sintéticas hoy llevan `categoryId: null`, así que NO suman a un umbral por categoría — limitación conocida (el co-add por créditos sirve hoy para scope `plan`).

## Verification

- Unit: `prereqCheck.logic.spec.ts` bloque "co-add de CRÉDITOS" (co-agregados con créditos → sin faltante; sin mapa → sigue bloqueando; créditos insuficientes → sigue bloqueando).
- Runtime: curso con Credits>=45 y plan con 40 colocados → agregar solo bloquea; agregar junto con un curso de 5 cr (45 exactos) agrega ambos y ubica el curso en el nivel donde se acumulan los créditos.

## Source

- **Discovered in**: TICKET-125 (follow-up UPONE-1539), reportado por el dev al probar el alta en lote de un curso gateado por créditos.
- **Evidence**: fix `69c48bf` + 3 tests; captura runtime (Electivo Modular D en Nivel 4).
- **Related**: [[RULE-curriculum-design-modular-prereq-by-presence]], [[RULE-curriculum-design-modular-level-excludes-unplaced-options]].

## Cluster

**Familia de evaluacion de malla modular (UPONE-1539):** [[RULE-curriculum-design-modular-prereq-by-presence]] · [[RULE-curriculum-design-modular-level-excludes-unplaced-options]] · [[RULE-curriculum-design-batch-coadd-carries-real-credits]] · [[RULE-curriculum-design-deletion-collapse-single-path]] · [[RULE-curriculum-design-safe-delete-failsafe]]. Disciplina de tests transversal: [[RULE-dev-test-real-shape-not-mocked]].
