---
id: RULE-uengagement-up1-bloqueo-escritura-generica-mcp-SS-710
project: up1
type: rule
module: uengagement-up1
tags:
  - SS-710
---

El pack MCP de uengagement bloquea la escritura generica (crear, editar, borrar fila cruda) en objetos con una mutation propia con reglas que el generico se saltea: inscripcion, oferta, evento, retroalimentacion y plantilla de formulario. El resto va en `genericWriteAllowed` y manda el RBAC. El bloqueo cubre solo la puerta del MCP: el bulk-edit del core, los layouts del mod y GraphQL directo siguen funcionando. Los mensajes van en lenguaje de negocio.

sourceRef: b5300fde (SS-710), ai/contracts.js:1-60, ai/index.js
