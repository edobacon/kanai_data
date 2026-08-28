---
id: RULE-curriculum-design-036
project: up1
type: rule
module: curriculum-design
tags:
  - polymorphicupdate
  - rt-pattern
  - upsert
  - prisma
  - base-only-update
  - resolver
  - sync
  - mod
---

# Un update base-only sobre un `rt__` no debe hacer upsert de la proyección RT

## What

En `polymorphicUpdate` (`executeUpdates`, `polymorphicUpdate.resolver.js`), un `updateInstance` **base-only** sobre un objectType `rt__` MUST **saltar el upsert de la proyección `rt__`** cuando el payload no trae campos RT. Prisma valida el `create` del upsert aunque termine usando la rama `update`, y lo rechaza si falta un campo RT requerido (ej. `combinator` en `rt__Group__requirement`) con `Argument \`combinator\` is missing`. En su lugar, leer la fila existente con `findUnique` para devolver `updatedRt`. Aplica también a `curricularsection` (misma rama `RT_PATTERN`).

## Why

Runtime bug hallado en el smoke S13.T3 de TICKET-101: un reparent base-only (`parentId`) sobre un `rt__` disparaba siempre el upsert y fallaba. El unit test previo NO lo cazaba porque el mock de `upsert` no validaba `required` en el `create` (ver [[feedback_mocked_tests_consecrate_runtime_bugs]]); se agregó regresión que exige `upsert` NO llamado + `findUnique` llamado en un update base-only.

## Where

`mods/curriculum-design/logic/` (se sincroniza a `object-manager/resolvers`) → aplicar requiere `npm run sync` (o `sync:logic`) + restart de object-manager.

## When

Al tocar `polymorphicUpdate` o cualquier resolver que actualice objectTypes de la rama `RT_PATTERN`, y al escribir tests de update sobre `rt__` (exigir integration o mocks que validen `required`, no solo que el mock resuelva).
