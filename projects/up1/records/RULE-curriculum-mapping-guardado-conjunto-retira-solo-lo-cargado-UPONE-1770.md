---
id: RULE-curriculum-mapping-guardado-conjunto-retira-solo-lo-cargado-UPONE-1770
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
---

competencyAlignment-batch.resolver.js valida el permiso ANTES de leer los datos existentes; el retiro alcanza solo las filas que el cliente cargo en el lote, no todo lo que exista en el servidor para ese plan; se registra el historial completo de retiros (competencyAlignmentHistory.js); y los errores de base de datos durante el guardado se propagan en vez de tragarse con un catch vacio.

sourceRef: d035a6f logic/competencyAlignment-batch.resolver.js, logic/helpers/resolverUtils.js:1-28
