---
id: DOC-kb-sp11-CM-02-aduana
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
  - CM-02
---

# CM-02 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-02 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-02-detalle](CM-02-escala-desempeno).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_performance_scale` | mod-only | Tool en el pack del mod; llama upsertPerformanceScaleValidated, que ya vive en el mod y contiene R1/R2/R5-R8/R11 | logic/performanceScale-upsert.resolver.js; logic/helpers/validatePerformanceScale.js; performanceScaleUniqueness.js |
| `cm_set_performance_scale_active` | mod-only | Llama setPerformanceScaleActiveValidated del mod | logic/performanceScale-upsert.schema.graphql |
| `cm_delete_performance_scale` | mod-only | Llama deletePerformanceScaleValidated (guard R9/D-12) del mod | logic/performanceScale-upsert.schema.graphql |
| registerExtra / fichas declarativas | mod-only (se consume) | API existente del motor del MCP; no se crea ni modifica core | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. Todas las reglas (R1/R2, R5-R8/R11, R9) viven en resolvers/helpers del mod; las tools solo las invocan. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Son operaciones COMPUESTAS (Scheme + niveles con reconciliación, cascada de activación, borrado con guard), no escrituras de una fila; el genérico gobernado del core no las reemplaza.

## Mecánica de publicación (sync)
Es config de `ai/` del mod. No siembra objetos por sync. Sin dependencia externa.
