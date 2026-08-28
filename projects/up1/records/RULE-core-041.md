---
id: RULE-core-041
project: up1
type: rule
module: core
tags:
  - codegen
  - prisma
  - extended-objects
  - cascade
---

# Extended JSON puede declarar baseRelation.onDelete=Cascade (opt-in) para codegen Prisma

## What

Un objeto Extended (`ext__<CLIENT>__<objeto>.json`) SHOULD poder declarar `"baseRelation": { "onDelete": "Cascade" }` para que el codegen de Prisma genere `onDelete: Cascade` en la FK hacia el objeto base. El default, sin esta declaración, es sin cascade (comportamiento histórico).

## Why

Antes de UPONE-1376/1377, el cascade en la relación Extended→Base vivía como Prisma crudo escrito a mano para casos puntuales (ej. `ext__uplanner__report` tenía `onDelete: Cascade` antes de UPONE-1396). Al migrar los modelos Extended a definición JSON, había que preservar esa opción por-modelo sin volver a hardcodear Prisma. El default (sin cascade) mantiene el comportamiento histórico para los 84 modelos `ext__` que nunca declararon uno.

## Where

`src/services/codegen/generatePrismaSchema.js:607-608` (`const baseOnDelete = extSchema?.baseRelation?.onDelete ? ... : ''`).

## When

Al definir o revisar un objeto Extended donde el borrado del registro base debe (o no debe) cascadear al registro extendido. Requiere `npm run codegen` + `npx prisma migrate dev` para tomar efecto.
