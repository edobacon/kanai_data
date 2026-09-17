---
id: DOC-kb-sp11-CM-05-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - aduana
  - frontera
  - B.4
  - cm-plan
  - CM-05
---

# CM-05 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-05 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-05-detalle](CM-05-matriz-arbol-rubrica-b4).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_competency_tree` | mod-only | Tool del pack del mod; llama upsertCompetencyTreeValidated del mod (reemplazo total en transacción) | logic/competencyTree-upsert.resolver.js |
| `cm_delete_competency_nodes` | mod-only | Llama deleteCompetencyNodesValidated del mod | logic/competencyTree-upsert.schema.graphql |
| Cierre B.4: precondición performanceScaleId + levelId pertenece a la escala | mod-only | Cambio dentro del resolver `*Validated` propio de cm (logic/), NO en object-manager ni en el motor del MCP | logic/competencyTree-upsert.resolver.js:230 (readMatrix); helpers/nodeDevelopmentLevels.js:102 (patrón assertLevelsInCatalog a reusar) |
| Objetos escritos dentro (CompetencyNode Competency/SubCompetency, RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel) | mod-only | Sin tool propia; se escriben dentro de la compuesta | objects/*.json |
| registerExtra / fichas | mod-only (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. Punto de atención: B.4 es la ÚNICA pieza server-side del plan de cm, y aun así es mod-only: se cierra en el resolver `*Validated` que el mod posee, no en el core. No hay artefacto core-worthy ni dependencia cross-mod. El cierre en el resolver es lo que hace que la regla valga para UI + MCP + cualquier otra vía que llame esa mutation.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE por completo. Las tools son compuestas y B.4 es resolver propio: el core no las reemplaza ni cubre B.4.

## Mecánica de publicación (sync)
Config de `ai/` del mod + cambio de resolver del mod. No siembra objetos por sync. Sin dependencia externa.
