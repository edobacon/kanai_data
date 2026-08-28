---
id: RULE-curriculum-design-modular-level-excludes-unplaced-options
project: up1
type: rule
module: mods/curriculum-design
tags:
  - curriculum-mesh
  - modular
  - deriveLevel
  - OR
  - K-de-N
  - nivel
  - prereq
---

# En la derivacion de niveles modular, una opcion NO colocada de un grupo OR/K-de-N no es una via de nivel 0

## What

En `deriveLevel` (malla modular), al combinar un grupo de requisitos, SOLO cuentan las vias cuyo curso-prereq esta COLOCADO en el plan. Una opcion cuyo curso no esta colocado se EXCLUYE del `min` (OR), del `max` (AND) y del K-esimo (K-de-N); no puede aportar "nivel 0". Si un grupo no tiene ninguna via colocada, no empuja (nivel 1). Implementacion: la hoja `RecordState` Before con target ausente devuelve el sentinela `ABSENT_PATH`; cada Group filtra `present = childLevels.filter(l => l !== ABSENT_PATH)` y combina solo sobre `present`; un grupo sin via presente propaga `ABSENT_PATH`; la raiz del arbol de la actividad lo coacciona a 0 (`toPushLevel`).

## Why

Tratar una opcion ausente como nivel 0 colapsa el `min` de un OR a esa opcion inexistente: un curso con OR{A, B} (Before) y solo A colocado en nivel 1 quedaba en nivel 1 en vez de nivel 2. Es el caso normal del alta guiada modular (co-agrega UNA via, no todas), asi que el error afecta el uso comun de la malla. El K-de-N sufria lo mismo por `kthSmallest`. El AND (`max`) ya toleraba el ausente (0 ignorado por max), pero debia distinguirse del caso "grupo entero sin vias colocadas" para propagar correctamente en arboles anidados (OR de grupos).

## Where

- **File**: `mods/curriculum-design/modsComponents/CurriculumMesh/deriveLevel.logic.ts` (`resolveNode` Group + hoja `RecordState`; `levelOfActivity` via `toPushLevel`).
- **Layers**: frontend / logica pura de la malla.
- **NO confundir** con la SATISFACCION de requisitos (`evaluateRequirementTree`), que es un computo distinto (banner/modal) y por presencia con centinela (ver [[RULE-curriculum-design-modular-prereq-by-presence]]).

## When

Siempre que se toque la derivacion de niveles modular o su recorrido Y/O. Cualquier combinacion nueva de grupos debe operar sobre las vias COLOCADAS y neutralizar `ABSENT_PATH` antes de que llegue a un nivel final o a las pasadas de creditos (invariante: Infinity nunca alcanza un valor numerico final).

## Verification

- Unit: `deriveLevel.logic.spec.ts` bloque "opciones ausentes no cuentan como via de nivel 0" (OR subconjunto, OR/AND todas ausentes, K-de-N insuficientes vs exactas, rama-grupo anidada ausente).
- Runtime: plan modular con ADM-5 = OR{ADM-1, ADM-2} y solo ADM-1 colocado -> ADM-5 en Nivel 2 (no Nivel 1).

## Source

- **Discovered in**: TICKET-124 (follow-up UPONE-1539), Session 2, durante el smoke del alta en lote modular.
- **Evidence**: fix `ec6e49c` + tests `1ac9b1c`; captura runtime ADM-5 Nivel 2.
- **Related**: [[RULE-curriculum-design-modular-prereq-by-presence]] (satisfaccion por presencia, computo hermano).

## Cluster

**Familia de evaluacion de malla modular (UPONE-1539):** [[RULE-curriculum-design-modular-prereq-by-presence]] · [[RULE-curriculum-design-modular-level-excludes-unplaced-options]] · [[RULE-curriculum-design-batch-coadd-carries-real-credits]] · [[RULE-curriculum-design-deletion-collapse-single-path]] · [[RULE-curriculum-design-safe-delete-failsafe]]. Disciplina de tests transversal: [[RULE-dev-test-real-shape-not-mocked]].
