---
id: RULE-curriculum-design-038
project: up1
type: rule
module: curriculum-design
tags:
  - delete
  - cross-mod-fk
  - restrict
  - generic
  - convention
  - polymorphic
  - engagement
  - scheduling
  - no-hardcode
---

# El bloqueo de delete por FK cross-mod entrante debe ser GENÉRICO por convención/metadata, nunca hardcodeado por modelo

## What

El motor de borrado MUST bloquear (`restricted`) el delete de un nodo cuando algún modelo de la plataforma declara una FK entrante hacia él, detectada de forma **genérica**:
- por convención de FK (`<objectLower>Id`) y polimórfica (`ownerType`/`ownerId`), y
- por FK con nombre no convencional declaradas vía `core_FieldDefinition.fieldType='reference'` (reusar `referenceValidationService.findReferencingObjects`).

PROHIBIDO hardcodear listas dirigidas por modelo externo (ej. `ENGAGEMENT_REFERENCES` con `Activity → Event/ActivityLine/TeachingAssignment`). Engagement/scheduling son **ejemplos concretos**, no la regla. Esto aplica también a la **documentación**: la matriz de borrado y los test cases nombran el TIPO DE ESTRUCTURA ("FK cross-mod entrante"), con engagement solo entre paréntesis como ejemplo.

## Why

En TICKET-104 (S2) el primer cut tenía una lista dirigida `ENGAGEMENT_REFERENCES`: frágil (si uengagement renombra modelos, la detección se desincroniza en silencio) y producía duplicados (mismo row como `external-reference` y `engagement-data`). Cualquier detección que dependa de nombres específicos de modelos externos es acoplamiento débil. El principio también protege la doc de caer en obsolescencia cuando el código sigue correcto (L7).

## Where

`findIncomingReferences` / detección de `restrict` del motor de borrado; matriz de borrado y test cases del spec/ticket. Reusa `core_FieldDefinition` (RULE-core-023) para FK no convencionales.

## When

Al implementar o revisar detección de referencias entrantes para delete, y al documentar la matriz de borrado.
