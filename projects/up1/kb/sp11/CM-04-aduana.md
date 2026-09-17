---
id: DOC-kb-sp11-CM-04-aduana
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
  - CM-04
---

# CM-04 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-04 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-04-detalle](CM-04-matriz-cabecera-medicion).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_save_competency_matrix` | mod-only | Tool en el pack del mod; llama create/updateCompetencyMatrixValidated, que ya viven en el mod con toda la validación de cabecera y el gate de publicación | logic/competencyMatrix-create.resolver.js; competencyMatrix-update.resolver.js; helpers/validateCompetencyMatrix.js; assertPublishable.js |
| Ciclo de estado (status en el payload) | mod-only | El enum de estado vive en el RecordType del mod; assertPublishable en el resolver del mod | objects/RecordTypes/rt__Matrix__competencynode.json; helpers/assertPublishable.js |
| Historial de matriz | mod-only | Lo escribe la propia mutation del mod | logic/helpers/competencyMatrixHistory.js |
| registerExtra | mod-only (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. La identidad, el gobierno (ownerUnits), la medición, el ciclo de estado y el historial de la matriz viven en resolvers/RecordTypes del mod; la tool solo los invoca. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Es una operación compuesta (identidad + gobierno + medición + estado + historial, con create/update discriminados y gate de publicación), no una escritura de una fila.

## Mecánica de publicación (sync)
Config de `ai/` del mod. No siembra objetos por sync. Sin dependencia externa.
