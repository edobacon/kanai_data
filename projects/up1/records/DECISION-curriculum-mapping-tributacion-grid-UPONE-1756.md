---
id: DECISION-curriculum-mapping-tributacion-grid-UPONE-1756
project: up1
type: decision
module: curriculum-mapping
---

La sesion 11 (30+ commits de UI del 4 al 9 de septiembre) cierra el rediseno de CompetencyAlignmentGridElement.vue: modal de detalle en tema purpura, panel de asignaturas con indicador "en mano", badges de estado, competencias con hijas colapsables, selector Por competencia/Por malla, color por nivel/posicion. Ultimo ajuste (a070c82): se quita el pill "Adoptada" del selector porque TODAS las matrices que ofrece salen de adoptedMatricesForPlan (adoptadas y vigentes por definicion) y el pill podia mentir si la lista quedaba desactualizada. Se registra como UNA decision de UI, no un record por commit.

**sourceRef:** a070c82 + modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue (remocion del pill ~L146-160).
