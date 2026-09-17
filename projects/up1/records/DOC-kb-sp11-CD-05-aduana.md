---
id: DOC-kb-sp11-CD-05-aduana
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
  - CD-05
---

# CD-05 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-05 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-05-detalle](CD-05-lectura-malla-requisitos).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Resolver de query: malla curricular agregada | mod-only | Nuevo resolver de lectura del mod | logic (nuevo query resolver de cd) |
| Resolver de query: árbol de requisitos agregado | mod-only | Nuevo resolver de lectura del mod; puede reusar requirementTreeLoader.js | logic; requirementTreeLoader.js |
| Tools de lectura (`operation:"query"`) | mod-only | Fichas en el pack del mod; el motor soporta queries nativas | mods/curriculum-design/ai/tools.js; up1/mcp/src/mods/types.js:14 |

## Veredicto global
`todo-mod-only`. La agregación se construye y expone dentro del mod. El único punto que podría haber sido core-worthy (que el motor no soportara tools de lectura) está descartado: `operation:"query"` es nativo. Sin dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. El core no toca la dimensión de lectura.

## Mecánica de publicación (sync)
Nuevos resolvers + config de ai/ del mod. Sin dependencia externa.
