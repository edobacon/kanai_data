---
id: DOC-kb-sp11-CD-03-aduana
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - aduana
  - frontera
  - cd-plan
  - CD-03
---

# CD-03 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-03 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-03-detalle](CD-03-ensamblado-arbol-requisitos).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Mutation de dominio `createRequirementCondition` (ensamblado por vías) | mod-only | Nueva mutation en el resolver propio de cd; porta lógica hoy en el cliente | logic (resolver de requirement); cliente RequirementEditor/requirementCreate.logic.ts |
| Tool que la expone | mod-only | Ficha en el pack del mod | mods/curriculum-design/ai/tools.js |

## Veredicto global
`todo-mod-only`. La estructura y su validación viven en el resolver de cd; al ser N0, vale para todas las vías. Sin artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Es una mutation de dominio + gap de resolver propio; el core no la reemplaza ni cubre la lógica de ensamblado.

## Mecánica de publicación (sync)
Cambio de resolver + config de ai/ del mod. Sin dependencia externa.
