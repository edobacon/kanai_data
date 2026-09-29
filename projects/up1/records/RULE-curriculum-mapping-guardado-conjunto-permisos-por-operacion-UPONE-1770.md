---
id: RULE-curriculum-mapping-guardado-conjunto-permisos-por-operacion-UPONE-1770
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
  - permisos
---

upsertCompetencyAlignmentSetValidated exigia siempre los tres permisos sobre CompetencyAlignment y dejaba sin guardar a un perfil que puede crear y editar pero no retirar. Ahora pide cada permiso solo si el lote agrega, edita o retira filas. Las filas identicas a lo persistido no se reescriben ni entran al historial (se leen todos los planEntry del lote en una consulta), y retirar y volver a asignar el mismo par (source, competencia) antes de guardar conserva el id persistido.

sourceRef: c61029f logic/competencyAlignment-batch.resolver.js, logic/helpers/validateCompetencyAlignment.js:1-68
