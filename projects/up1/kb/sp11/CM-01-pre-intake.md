---
id: DOC-kb-sp11-CM-01-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-01
---

# CM-01 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-01. Material human-read, no va a Jira. Contrato en [CM-01-detalle](CM-01-lectura-dominio).

## Enfoque
Declarar las 6 queries de dominio como fichas de tool (`ToolDescriptor` con `operation:"query"`, sin `writePattern`) en el pack del mod (`mods/curriculum-mapping/ai/`, hoy `tools: []` en index.js:38). El motor las registra por `register-declarative-tools.js`. Cada ficha necesita: name, title, description (routing del LLM), el texto GraphQL de la query, `input` (forma de parámetros), `resultPath` (dónde está el dato útil) y su contrato de campos.

## Queries y su origen (verificadas)
- `adoptedMatricesForPlan(planId)` -> logic/adoptedMatrices.resolver.js:121
- `competencyAlignmentView(planId, matrixId)` -> logic/alignmentView.resolver.js:317
- `listCompetencyAlignments(planId, competencyNodeId)` -> logic/competencyAlignment.resolver.js:337
- `reconcileMatrixAdoptions(matrixId)` + `reconcileGroupPage(matrixId, group, limit, offset)` -> logic/matrixAdoption.schema.graphql
- consulta de adopción de matriz -> logic/matrixAdoption.resolver.js:1847

## Consideraciones
- `reconcileGroupPage` es paginada: la ficha debe exponer limit/offset y el `resultPath` debe apuntar al total para que el agente sepa pedir la página siguiente (patrón ya usado por `up1_query_records`).
- La descripción de cada tool es la que rutea al LLM: usar el vocabulario de dominio del usuario (tributación, adopción, vigencia), no nombres técnicos.
- El contrato de campos (guía) de cada resultado puede empezar mínimo y enriquecerse; es lo que hace que el agente interprete bien la salida. Coordinar con CM-08.

## Hipótesis a validar
- El `resultPath` de cada query resuelve al nodo con el dato útil (confirmar contra la forma real de cada resolver).
- Ninguna de las 6 requiere `registerExtra` (todas son una sola llamada GraphQL, no orquestación); si alguna arma su resultado en varios pasos, iría por `registerExtra`.

## Decisiones técnicas
- Fichas declarativas por defecto; `registerExtra` solo si una query no se reduce a una llamada.
