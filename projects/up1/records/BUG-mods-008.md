---
id: BUG-mods-008
project: up1
type: bug
module: mods
---

# CompetencyTree render O(n²) con template duplicado

## Symptom

`modsComponents/CompetencyTree/CompetencyTreeElement.vue:37-80` duplica verbatim el bloque de render de nodo para roots (líneas 39-55) y children (60-77). El `v-for` anidado llama `getVisibleDescendants()` por cada iteración — complejidad O(n²) respecto al número total de competencias.

## Expected behavior

Componente recursivo que renderiza cada nodo y sus hijos sin duplicar template, o lista aplanada pre-calculada en el composable (`useCompetencyTree.ts`) como array reactivo de nodos visibles.

## Root cause

Implementación inicial del árbol sin optimización ni extracción de template. Se replicó el bloque para «acelerar» y quedó así.

## Impact

Con árboles >50 nodos el render es perceptiblemente lento. Con matrices grandes (100+ competencias) la UI se bloquea al expandir/colapsar.

## Reproduction

Seed con matriz de 100+ competencias (modificar `seed/am-seed.js`) y abrir `ca-matrix-view` — lag perceptible en expand/collapse.

## Workaround

Limitar matrices a <50 competencias.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix
- **Tickets**: TICKET-005
