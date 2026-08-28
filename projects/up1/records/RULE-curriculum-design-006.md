---
id: RULE-curriculum-design-006
project: up1
type: rule
module: curriculum-design
tags:
  - activity
  - cross-mod
  - codegen
  - co-definition
  - org-spine
---

# Activity es co-definido por curriculum-design + uengagement-up1 (dos mods, un modelo)

## What

El objeto `Activity` es co-definido por DOS mods: curriculum-design aporta `recordType [Course, Service]` + campos academicos (credits, etc.); uengagement-up1 aporta `formTemplateId` (FK->FormTemplate) + campos operativos. El codegen de object-manager MERGEA ambas contribuciones en un unico modelo Prisma. Ningun mod tiene la definicion completa de Activity por si solo.

## Why

Un campo 'removido' de `mods/curriculum-design/objects/activity.json` puede seguir existiendo en runtime si engagement lo define (y viceversa). Asumir que el activity.json de un solo mod es la definicion completa lleva a falsos diagnosticos: creer que un campo no existe cuando si (un resolver que lo usa NO romperia en deploy conjunto), o creer que removerlo de un lado lo elimina del schema cuando el otro mod lo reinyecta. En TICKET-076 caso C, `formTemplateId` parecia removido de cd pero engagement lo define -> el resolver funciona.

## Where

mods/curriculum-design/objects/activity.json + mods/uengagement-up1/objects/Activity.json; merge en el codegen de object-manager.

## When

Al diagnosticar si un campo de Activity existe/falta, o ANTES de agregar/remover un campo de Activity en cualquiera de los dos mods (verificar la contribucion del otro mod primero).

## Verification

Grep ambos objects/*ctivity.json + inspeccionar el modelo Activity en el schema Prisma generado; confirmar la union de campos multi-capa (no asumir desde un solo mod).

## Source

- **Discovered in**: TICKET-076
