---
id: DOC-kb-sp11-CD-07-pre-intake
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - pre-intake
  - cd-plan
  - CD-07
---

# CD-07 · Pre-intake (guía de implementación)

Guía de implementación (el COMO) de CD-07. Material human-read, no va a Jira. Contrato en [CD-07-detalle](CD-07-postura-genericwriteallowed).

## Enfoque
En `mods/curriculum-design/ai/`: declarar `genericWriteAllowed` para los 13 objetos (opt-out del bloqueo del MCP; el genérico es seguro por N0). governedObjects: cero (ningún objeto de cd tiene su regla en una mutation separada inalcanzable por el genérico).

## Pre-requisito: resolver las 2 decisiones técnicas
1. **Delete sin override** (Activity/Curriculum/CurricularSection/Offering): grepear/leer si hay guard de delete; si no lo hay, decidir con el equipo si es backstop por constraint de DB (declarar allowed) o hueco (agregar guard en requirementCategoryDelete.resolver.js antes de declarar).
2. **movePlanEntry vs update genérico**: confirmar si el `updateInstance` genérico sobre position/period de una planEntry debería pasar por `computeMoveRenumbering`/`assertValidMoveDestination`. No hay unique constraint en (planId,period,position); decidir si se cablea o se documenta (se relaciona con CD-08).

## Origen (verificado)
- cd no declara nada hoy (grep governedObjects/genericWriteAllowed/blockGenericMutation -> cero)
- overrides N0 -> sectionValidation.resolver.js, polymorphicUpdate.resolver.js, requirementCategoryDelete.resolver.js
- gate de completitud -> up1/mcp/scripts/validate-governed-objects.js
- lockstep -> Reporte del fix de blockGeneric, sección 6

## Consideraciones
- Es formalización: cd ya es seguro. La declaración solo cobra efecto cuando el motor del bloqueo está presente (ver gate, sección 0 del detalle).
- Mantener el genérico ABIERTO (allowed) preserva la reproducción de las orquestaciones de la malla por genérico.

## Decisiones técnicas
- genericWriteAllowed de los 13 (opt-out), tras resolver las 2 decisiones. Coordinar el merge con CM-09.
