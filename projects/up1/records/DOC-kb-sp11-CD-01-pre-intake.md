---
id: DOC-kb-sp11-CD-01-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-01
---

# CD-01 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-01. Material human-read, no va a Jira. Contrato en [CD-01-detalle](CD-01-prereq-on-add).

## Enfoque
Cablear el evaluador de requisitos ya existente como guard del ALTA de planEntry, en el resolver override propio de cd, replicando el patrón que ya usa el BORRADO.

- **Delete (existe, patrón a copiar):** `planEntryDeletionRequirementGuard.js` carga el árbol con `requirementTreeLoader.js` y evalúa con `evaluateRequirementTree.js`.
- **Create (a construir):** en el camino de create de planEntry (`sectionValidation.resolver.js:202-221` para individual; `planEntry-batch.resolver.js:154-160` para batch), invocar el mismo loader + evaluador antes de persistir, y rechazar si viola prerreq/correq/créditos.

## Origen (verificado)
- guard de delete (patrón) -> logic/planEntryDeletionRequirementGuard.js
- evaluador server -> logic/evaluateRequirementTree.js
- loader -> logic/requirementTreeLoader.js
- create individual -> logic/sectionValidation.resolver.js:202-221
- create batch -> logic/planEntry-batch.resolver.js:154-160
- lógica cliente equivalente (referencia) -> CurriculumMesh/evaluateRequirementTree.logic.ts, prereqCheck.logic.ts:41-168, CurriculumMeshElement.vue:1713

## Consideraciones
- El twin server ya evalúa el árbol; el trabajo es el CABLEADO en create, no reescribir el evaluador.
- Definir la atomicidad del batch ante una entrada inválida (coherente con `createPlanEntriesBatch`).
- Mensaje de negocio claro (qué requisito falta), como el que ya da el delete.

## Hipótesis a validar
- Que la firma del loader/evaluador sirva igual en el contexto de create (puede necesitar el estado del plan proyectado con la nueva entrada).
- Cómo evaluar el umbral de créditos en el alta (sumar la entrada nueva al total del plan).

## Decisiones técnicas
- Guard en el override N0 (mod-owned), reusando el evaluador. No tool nueva.
