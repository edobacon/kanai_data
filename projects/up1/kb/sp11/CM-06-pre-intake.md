---
id: DOC-kb-sp11-CM-06-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-06
---

# CM-06 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-06. Material human-read, no va a Jira. Contrato en [CM-06-detalle](CM-06-matriz-adopcion-masiva).

## Enfoque
Seis tools en `mods/curriculum-mapping/ai/`:
- `cm_set_matrix_adoption_scope`: ficha (setMatrixAdoptionScopeValidated con matrixId, adoptionScope, adoptionPolicy, scopeUnits).
- `cm_add_matrix_adoptions`: ficha (addMatrixAdoptionsValidated con matrixId, curriculumIds).
- `cm_add_matrix_adoptions_by_filter`: ficha o registerExtra según forma (addMatrixAdoptionsByFilterValidated con search/searchField/ownerIds/excludeIds).
- `cm_apply_matrix_adoption_reconciliation`: registerExtra si arma el payload en pasos (applyMatrixAdoptionReconciliationValidated con decisions/defaultDecision/applyToAdd).
- `cm_close_matrix_adoptions`: ficha (closeMatrixAdoptionsValidated con ids, effectiveTo).
- `cm_remove_matrix_adoptions`: ficha con preview-confirm (removeMatrixAdoptionsValidated con ids).

## Origen (verificado)
- todas -> logic/matrixAdoption.schema.graphql + logic/matrixAdoption.resolver.js
- reglas de reconciliación -> logic/helpers/reconcileAdoptions.js
- guards (RA-8) e historial -> logic/helpers/validateMatrixAdoption.js, matrixAdoptionHistory.js

## Consideraciones (verificadas en los docstrings)
- Lote sin tope: pasar la lista completa; el resolver trocea en una sola transacción (el lote entra completo o no entra). El guard de estado se evalúa por matriz, no por fila.
- Salteo por fila (no tira el lote): ya cerrada, rango de vigencia invertido, o id inexistente se cuentan como salteados; la tool devuelve cuántas tocó y la lista sin tocar (que el agente debe reportar).
- Flujo doble addSelected: reproducir con dos llamadas en secuencia (by_filter, luego add), igual que la UI; sin rollback entre ambas.
- Tras set_scope, avisar (refresh) es cosa de UI; el MCP opera sobre estado persistido, no aplica.

## Hipótesis a validar
- Cuáles conviene por ficha vs registerExtra según la forma exacta del input (reconcile y by_filter son candidatas a registerExtra).
- El `resultPath` de close/remove en lote (devuelven conteo + salteados).

## Decisiones técnicas
- remove en lote siempre preview-confirm. Documentar RA-8 (publicada = cerrar, no borrar) y el flujo doble en las descripciones de las tools.
