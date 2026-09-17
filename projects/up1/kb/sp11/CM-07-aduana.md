---
id: DOC-kb-sp11-CM-07-aduana
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
  - CM-07
---

# CM-07 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-07 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-07-detalle](CM-07-tools-simples).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_create/update/delete_competency_alignment` | mod-only | Llaman las `*Validated` de alineación (guard R-1) del mod | logic/competencyAlignment.resolver.js; helpers/alignmentRules.js |
| `cm_close/remove/set_exemption_matrix_adoption` | mod-only | Llaman las `*Validated` de adopción de a una del mod | logic/matrixAdoption.schema.graphql |
| registerExtra / fichas | mod-only (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. No hay artefacto core-worthy ni dependencia cross-mod para construirlo.

## Nota de reajuste (si el core se implementa, Camino B)
**SE ELIMINA.** Es el único ticket del plan cuyos artefactos son escrituras de UNA fila: el genérico gobernado del core (interceptores componibles) las cubriría y estas tools quedarían redundantes. Por eso la decisión de core conviene tomarse antes de construirlo (Decisión abierta del detalle).

## Mecánica de publicación (sync)
Config de `ai/` del mod. Sin siembra por sync. Sin dependencia externa.
