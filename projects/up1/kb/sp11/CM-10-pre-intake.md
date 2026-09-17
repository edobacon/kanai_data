---
id: DOC-kb-sp11-CM-10-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - pre-intake
  - cm-plan
  - CM-10
---

# CM-10 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CM-10. Material human-read, no va a Jira. Contrato en [CM-10-detalle](CM-10-huecos-server-rm7-rp5).

## Enfoque
Es primero una decisión de PO; recién con OK se implementa. Si se aprueba:
- **RM7:** decidir transición de estado (ya cubierta por CM-04, sin trabajo nuevo) vs retiro/borrado real (nueva mutation gobernada en el mod + guard análogo a RA-8). Si es solo transición, este ticket se cierra sin código.
- **RP5:** validación de completitud de descriptores en logic/competencyTree-upsert.resolver.js (persistRubric), con mensaje de negocio.

## Origen (verificado)
- RM7 estado -> objects/RecordTypes/rt__Matrix__competencynode.json (enum de estado); logic/competencyMatrix-update.*
- RP5 -> logic/competencyTree-upsert.resolver.js (persistRubric)

## Consideraciones
- Ninguno es requisito de MCP-ready; el MCP ya iguala a la plataforma.
- RM7 como delete real cambia semántica académica; preferir transición salvo pedido explícito.

## Decisiones técnicas
- No implementar hasta OK del PO. Si se implementa, mod-only en el resolver propio.
