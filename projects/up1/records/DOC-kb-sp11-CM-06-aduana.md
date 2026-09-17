---
id: DOC-kb-sp11-CM-06-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - aduana
  - frontera
  - cm-plan
  - CM-06
---

# CM-06 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-06 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-06-detalle](CM-06-matriz-adopcion-masiva).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_set_matrix_adoption_scope` | mod-only | Llama setMatrixAdoptionScopeValidated del mod | logic/matrixAdoption.schema.graphql |
| `cm_add_matrix_adoptions` / `..._by_filter` | mod-only | Llaman addMatrixAdoptions(...ByFilter)Validated del mod | logic/matrixAdoption.resolver.js |
| `cm_apply_matrix_adoption_reconciliation` | mod-only | Llama applyMatrixAdoptionReconciliationValidated del mod | logic/matrixAdoption.resolver.js; helpers/reconcileAdoptions.js |
| `cm_close_matrix_adoptions` / `cm_remove_matrix_adoptions` | mod-only | Llaman close/removeMatrixAdoptionsValidated (guard RA-8) del mod | logic/matrixAdoption.schema.graphql |
| Objeto escrito: MatrixAdoption, CompetencyNodeScopeUnit | mod-only | Del mod | objects/MatrixAdoption.json, CompetencyNodeScopeUnit.json |
| registerExtra / fichas | mod-only (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. Las reglas (RA-8, semántica de lote, reconciliación) viven en los resolvers/helpers del mod; las tools solo las invocan. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Son operaciones COMPUESTAS/masivas (lote transaccional con salteo por fila, reconciliación multi-efecto), no escrituras de una fila. Las operaciones de UNA fila del mismo dominio están separadas en CM-07 (esas sí se simplifican con el core).

## Mecánica de publicación (sync)
Config de `ai/` del mod. No siembra objetos por sync. Sin dependencia externa.
