---
id: DOC-kb-sp11-CM-02-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-02
---

# CM-02 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-02. Material human-read, no va a Jira. Contrato en [CM-02-detalle](CM-02-escala-desempeno).

## Enfoque
Tres tools en `mods/curriculum-mapping/ai/`:
- `cm_upsert_performance_scale`: por `registerExtra` (es upsert busca-luego-crea, no reduce a una ficha; patrón como as_set_rule_value). Payload = header del Scheme (name, code, description, position, ownerType, ownerId, kind, scoreBasis, scaleMin, scaleMax, isActive) + array `levels` (name, code, description, position, weight, isAchieved, minThreshold, maxThreshold). Si viene `id`, edita y reconcilia; si no, crea. Soporta `prefillFrom.source` para duplicar.
- `cm_set_performance_scale_active`: ficha (una llamada a setPerformanceScaleActiveValidated con id + isActive).
- `cm_delete_performance_scale`: ficha con `writePattern:"preview-confirm"` (destructivo; guard R9/D-12 bloquea si una matriz referencia la escala).

## Origen (verificado)
- upsert/set_active/delete -> logic/performanceScale-upsert.schema.graphql + logic/performanceScale-upsert.resolver.js
- validaciones R5-R8/R11 -> logic/helpers/validatePerformanceScale.js
- unicidad R1/R2 -> logic/helpers/performanceScaleUniqueness.js

## Consideraciones
- El backend valida, no reparte: la tool no debe asumir defaults de peso/threshold; manda valores válidos (la herencia de minThreshold es conveniencia de UI, opcional replicar como helper, ver CM-plan 8.1).
- deletePerformanceScaleValidated devuelve PerformanceScaleDeleteResult (id + name); mapear el `resultPath`.
- La escala inactiva sella sus niveles con ese estado (un nivel no tiene ciclo propio).

## Hipótesis a validar
- Confirmar la forma exacta del `input` de cada ficha contra el resolver.
- Confirmar si la escala escribe historial (para el DoD de auditoría).

## Decisiones técnicas
- upsert por registerExtra; set_active/delete por ficha. delete siempre preview-confirm.
