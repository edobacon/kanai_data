---
id: DOC-kb-sp11-CM-04-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-04
---

# CM-04 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-04. Material human-read, no va a Jira. Contrato en [CM-04-detalle](CM-04-matriz-cabecera-medicion).

## Enfoque
Una tool `cm_save_competency_matrix` por `registerExtra` (crea-o-edita según exista `id`; no reduce a una ficha). Internamente: si no hay id -> createCompetencyMatrixValidated; si hay id -> updateCompetencyMatrixValidated. El input debe soportar payload PARCIAL para reproducir el guardado por etapas del shell (General manda identidad+gobierno; Medición manda escala/niveles/modelo/ejes) y debe poder llevar `status`.

## Origen (verificado)
- create -> logic/competencyMatrix-create.resolver.js (docstring detalla qué campos acepta create vs update; create descarta en silencio los campos de medición)
- update -> logic/competencyMatrix-update.resolver.js (payload parcial, data: JSON!)
- gate de publicación -> logic/helpers/assertPublishable.js
- validaciones de cabecera -> logic/helpers/validateCompetencyMatrix.js
- historial -> logic/helpers/competencyMatrixHistory.js

## Consideraciones (del docstring de create, verificado)
- create solo recibe identidad + gobierno (name, code, description, matrixType, ownerUnits) + opcional position/externalId/metadata + el ALCANCE de adopción (adoptionScope/Policy/scopeUnits). Los campos de medición (performanceScaleId, developmentLevelId, defaultEvaluationMode, defaultRubricModel, measurementModel, requiresAllCriteria, achievementBasis, los tres ejes de agregación) se DESCARTAN en create y se setean en update (pestaña Medición). El descarte es silencioso a propósito (retrocompat de firma).
- La matriz nace en Draft (create ignora status) con alcance Explicit. status y medición van por update.
- Los tres ejes de consolidación reemplazan al viejo aggregationMode único: entre asignaturas del mismo nivel, entre niveles de desarrollo, entre subcompetencias.

## Hipótesis a validar
- Confirmar que el input de la tool cubre create y update sin ambigüedad (el discriminante es la presencia de id).
- Confirmar el `resultPath` (create/update devuelven el id de la matriz).

## Decisiones técnicas
- registerExtra (crea-o-edita). Payload parcial + status obligatorios por diseño (la mutation ya lo soporta, 0 SP extra). Documentar la dependencia de orden (matriz antes de árbol/adopción) en la descripción de la tool.
