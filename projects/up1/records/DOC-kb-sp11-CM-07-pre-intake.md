---
id: DOC-kb-sp11-CM-07-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-07
---

# CM-07 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-07. Material human-read, no va a Jira. Contrato en [CM-07-detalle](CM-07-tools-simples).

## Enfoque
Seis tools de una fila en `mods/curriculum-mapping/ai/`, todas fichas declarativas (una llamada GraphQL cada una):
- `cm_create_competency_alignment`, `cm_update_competency_alignment`, `cm_delete_competency_alignment` (delete preview-confirm; guard R-1).
- `cm_close_matrix_adoption`, `cm_remove_matrix_adoption` (preview-confirm), `cm_set_matrix_adoption_exemption`.

## Origen (verificado)
- alineación -> logic/competencyAlignment.schema.graphql + competencyAlignment.resolver.js + helpers/alignmentRules.js, validateCompetencyAlignment.js
- adopción de a una -> logic/matrixAdoption.schema.graphql (closeMatrixAdoptionValidated, removeMatrixAdoptionValidated, setMatrixAdoptionExemptionValidated)

## Consideraciones
- Son 1:1 puras (una fila, una mutation): fichas simples, sin registerExtra.
- Antes de construirlas, chequear la decisión de core (ver Decisión abierta del detalle): son las que el genérico gobernado volvería redundantes.
- La versión de a una NO es duplicada de la masiva de CM-06: el botón de fila falla con mensaje preciso sobre esa fila, que es lo correcto cuando el usuario apuntó a una.

## Hipótesis a validar
- La condición exacta del guard R-1 en el borrado de alineación.

## Decisiones técnicas
- Fichas declarativas; deletes con preview-confirm. Construcción condicionada a la decisión de core.
