---
id: RULE-curriculum-design-009
project: up1
type: rule
module: curriculum-design
tags:
  - org-spine
  - model-reduction
  - blast-radius
  - stale-schema
  - upstream
  - methodology
---

# Adaptar a una reducción de modelo upstream: verificar liveness contra el git del core + blast radius sobre TODOS los objetos reducidos

## What

Cuando un cambio upstream REDUCE el modelo de datos (objetos/campos eliminados) y hay que adaptar consumidores: (1) verificar si la reduccion esta VIVA contra el GIT COMMITTEADO del core (object-manager objects/business/Base/*.json), NO contra el schema Prisma generado local (prisma/{TENANT}/schema.prisma), que puede estar stale si el entorno no se re-sincronizo; (2) mapear el blast radius sobre TODOS los objetos reducidos del spine, no solo el que motivo el ticket.

## Why

(1) El schema generado local lagea hasta el re-sync: verificar contra el artefacto generado da falso-negativo ('la reduccion no esta viva') y puede llevar a revertir una adaptacion CORRECTA. En TICKET-076, DEC-017 reverso S1 por leer un schema stale; DEC-018 lo corrigio tras verificar el git real (Base reducido desde 42f55f3, sin revert). (2) Una reduccion del spine suele tocar varios objetos a la vez: mapear solo uno deja consumidores rotos. En TICKET-076 el intake mapeo OrgUnit (recordType/institutionId) pero NO Institution.country (movido a Organization) -> el seed seguia abortando incluso tras adaptar OrgUnit.

## Where

Fuente de verdad: object-manager/objects/business/Base/*.json (git committeado). Artefacto stale potencial: prisma/{TENANT}/schema.prisma (generado). Consumidores: todo el mod que se adapta.

## When

Al adaptar un mod a una reduccion de modelo upstream (engagement-canonical u otra), ANTES de concluir si la reduccion esta viva, y ANTES de cerrar el mapeo del blast radius.

## Verification

git log/show del Base committeado del core para confirmar la reduccion y su fecha; grep del mod por TODOS los objetos/campos reducidos del spine (no solo el disparador). Ver DEC-018.

## Source

- **Discovered in**: TICKET-076
