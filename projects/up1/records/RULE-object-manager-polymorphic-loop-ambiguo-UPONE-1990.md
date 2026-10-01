---
id: RULE-object-manager-polymorphic-loop-ambiguo-UPONE-1990
project: up1
type: rule
module: object-manager
level: should
tags:
  - UPONE-1990
  - motor-documentos
  - polymorphic
  - plantillas
---

## Regla

Antes de sincronizar una declaracion nueva de `polymorphic` (o `softReferences`) en un campo, hay que revisar si agrega un segundo camino entre un padre y ese hijo. Si lo agrega, las plantillas de documento ya guardadas que recorren ese loop sin `via` dejan de generar. Se deben corregir (agregar `via`) o la ruptura se debe documentar en el mod.

## Por que

El motor de documentos (`findLoopCandidates` en `src/services/documents/templateRelations.js`) junta todos los caminos del padre al hijo: FK, polymorphic, self y declarados. Con mas de uno y sin `via`, `templateValidator` responde `LOOP_AMBIGUOUS`. `generateDocument` (`documentService.js`) revalida la plantilla guardada antes de generar y aborta si no es valida. Por eso el cambio no se ve en la UI y aparece recien al generar el documento.

## Caso de origen

En UPONE-1990 (curriculum-design PR #70), `Curriculum.ownerId` declara `polymorphic` con target `Institution`. Dentro de `Institution`, `{#Curriculum}` tenia un solo camino (la FK `institutionId`) y pasa a tener dos (`institutionId` y `ownerId`). Una plantilla anterior necesita `via institutionId`. Lo mismo ocurre en `Activity` con `{#rt__RecordState__requirement}` (`via ownerId` o `via targetId`).

## Como aplicarla

- Al revisar o planificar una declaracion `polymorphic`, listar los padres cuyos loops hacia el hijo ganan un camino.
- Revisar por tenant los `up1_document_template` anclados a esos padres que usen el loop sin `via`.
- Corregirlos antes del sync, o documentar en el mod que las plantillas previas necesitan `via`.
