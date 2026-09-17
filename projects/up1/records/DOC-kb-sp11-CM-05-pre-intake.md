---
id: DOC-kb-sp11-CM-05-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - B.4
  - CM-05
---

# CM-05 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-05. Material human-read, no va a Jira. Contrato en [CM-05-detalle](CM-05-matriz-arbol-rubrica-b4).

## Enfoque, dos frentes

### Tools
- `cm_upsert_competency_tree`: por `registerExtra` (reemplazo total del árbol + rúbrica + niveles en transacción; no reduce a una ficha). Input = matrixId + nodes (con rúbrica y developmentLevelIds por nodo).
- `cm_delete_competency_nodes`: ficha con `writePattern:"preview-confirm"` (borra subárbol + descendientes + rúbricas; ids ajenos a la matriz se ignoran).

### Cierre B.4 (resolver propio, logic/competencyTree-upsert.resolver.js)
- **Precondición de escala:** en el flujo de upsert, tras `readMatrix` (RT7, ~línea 230, que ya trae la config de la matriz incluyendo performanceScaleId), rechazar si no hay `performanceScaleId` seteado antes de aceptar nodos con rúbrica. Análogo a como ya se valida "la matriz existe".
- **levelId pertenece a la escala:** en `persistRubric`, validar que cada `RubricDescriptor.levelId` pertenezca a la escala de desempeño de ESA matriz. Hoy existe `assertLevelsInCatalog` (logic/helpers/nodeDevelopmentLevels.js:102) pero para el eje de niveles de desarrollo, no para el eje de la escala de la rúbrica: replicar el mismo patrón para el performanceScale de la matriz.

## Origen (verificado)
- resolver -> logic/competencyTree-upsert.resolver.js (readMatrix ~230; buildLevels/planTree/reconcile; persistRubric)
- validación de árbol -> logic/helpers/validateCompetencyTree.js
- catálogo de niveles -> logic/helpers/nodeDevelopmentLevels.js:102 (assertLevelsInCatalog, patrón a reusar)
- historial -> logic/helpers/competencyMatrixHistory.js

## Consideraciones
- B.4 va en la `*Validated`, así que cierra el hueco para UI + MCP + cross-client de esa regla a la vez.
- El upsert es reemplazo total: cuidar el orden (elegir escala en CM-04 antes del árbol).
- deleteCompetencyNodesValidated es su propia mutation inmediata (no depende de un guardado posterior).

## Hipótesis a validar
- Confirmar que `readMatrix` ya devuelve performanceScaleId en MATRIX_CONFIG_FIELDS (para la precondición sin lectura extra).
- Confirmar la forma de la escala de desempeño para validar pertenencia del levelId (reusar la consulta de niveles de la escala).

## Decisiones técnicas
- upsert por registerExtra; delete por ficha preview-confirm. B.4 como dos validaciones en el resolver, con sus tests server.
