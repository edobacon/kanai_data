---
id: RULE-curriculum-design-033
project: up1
type: rule
module: curriculum-design
tags:
  - malla
  - prereqs
  - requirement
  - arbol-y-o
  - evaluador
  - recursivo
  - and-or
  - timing
  - creditos
  - metricthreshold
  - mod
---

# La evaluación de requisitos de la malla debe ser FIEL al árbol Y/O, nunca aplanarlo

## What

Toda evaluación de los requisitos (`requirement`) de una asignatura sobre la malla —alta, mover, banner mesh-wide, o cualquier superficie futura— MUST evaluar el árbol de forma **recursiva y fiel a su estructura**, reusando el ensamblado (`buildRequirementTree` / `assembleRequirementTree`) y el evaluador puro `evaluateRequirementTree.logic.ts`. Está PROHIBIDO aplanar el árbol a una lista tratada como `AND` global o mirar sólo los hijos `RecordState` directos de un `Group`.

El evaluador respeta, por nodo:
- `Group`: umbrales presentes — `minToSatisfy` (conteo de hijos hard satisfechos ≥ K) y/o `creditsRequired` (suma de `MeshEntry.credits` de hijos satisfechos ≥ umbral); ambos ausentes ⇒ `combinator=OR` es K=1, en otro caso `AND` (todos). Sólo hijos hard (`isHardRule !== false`) participan.
- `RecordState` por `timing` vs `ownerPeriod`: `Before`/null ⇒ estrictamente anterior (`<`); `Concurrent`/`Either` ⇒ mismo período o antes (`≤`, correquisito).
- `isHardRule=false` (advisory): no bloquea ni cuenta.
- `negate=true`: invierte la satisfacción (y no aporta créditos al padre).
- `MetricThreshold(Credits)`: agregado de `MeshEntry.credits` en períodos estrictamente anteriores, acotado por `scope` (`plan` / `category` por `scopeId`), comparado con `operator value`. Otras métricas: neutrales.

El contrato de salida `MissingPrereqItem[]` (lo consume `PrereqBlockModal`) se preserva en cualquier recableo.

## Why

La evaluación previa (`findMissingPrereqs` aplanado + `usePrereqRequirements` que devolvía nodos planos) era **semánticamente incorrecta**: convertía un `OR` en `AND`, ignoraba `isHardRule`/`negate`/`timing`/créditos y colapsaba el anidamiento. Con el árbol EST200 (`OR{ AND{MAT110,MAT120}, MAT210 }`) exigía "MAT210 y MAT110 y MAT120 y PROG101(advisory)" cuando el modelo dice "MAT210 O (MAT110 y MAT120)". Un banner mesh-wide sobre esa lógica habría hecho visible y persistente la mentira. Corregir el motor (REQ-14) antes de extender su superficie (REQ-11) fue la decisión de alcance del dev (DEC-LOCAL-04, opción A).

## Where

- `mods/curriculum-design/modsComponents/CurriculumMesh/evaluateRequirementTree.logic.ts` — evaluador recursivo puro (fuente de verdad de la semántica).
- `mods/curriculum-design/modsComponents/CurriculumMesh/prereqCheck.logic.ts` — delega en el evaluador (alta).
- `mods/curriculum-design/modsComponents/CurriculumMesh/meshPrereqScan.logic.ts` + `useMeshPrereqScan.ts` — banner mesh-wide (evalúa cada entrada contra su propio período).
- `mods/curriculum-design/modsComponents/ReglaUnificadaView/buildRequirementTree.logic.ts` — ensamblado del árbol (twin FE).
- Doc oficial: `mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md`.

## When

Aplica a toda superficie que evalúe requisitos de la malla, presente y futura. Al agregar una superficie nueva (o una métrica/`recordType` nuevo), extender el evaluador puro + su matriz de tests (`evaluateRequirementTree.logic.spec.ts`, TC-24..33), no reimplementar la evaluación aparte. Relacionada con [[RULE-curriculum-design-032]] (recableo de guards al ampliar `RT_PATTERN`).
