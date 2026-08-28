---
id: RULE-platform-014
project: up1
type: rule
module: platform
tags:
  - codegen
  - build-time-validator
  - polymorphicChildren
  - directChildren
  - corpus-audit
  - multi-tenant
  - generatePrismaSchema
---

# Al agregar un gate build-time, re-validar el corpus existente en todos los tenants

## What

Cuando se agrega o endurece un validador build-time en el pipeline de codegen de object-manager (ej. validación de `polymorphicChildren` / `directChildren`, `prefillFrom`, etc.), se DEBE (a) correr `codegen -- <tenant>` contra TODOS los tenants activos (BASEMODEL, UPU, DEMO01-10, UCASMT, UCENG, UCPLN, TEST) y verificar que ninguno aborta, O (b) auditar manualmente el corpus de JSONs existentes contra el nuevo contrato antes de mergear el validador. Sin este paso, el siguiente `sync`/`reset-tenant` puede fallar por una entry preexistente que "funcionaba" solo porque no había sido re-procesada desde antes del validador. El contrato de `polymorphicChildren` exige `via:"ownerTypeField/ownerIdField"` + `ownerTypeValue`; el de `directChildren` exige `fk:"<campo>"` (y `recursiveBy` para auto-referencial). Mezclarlos aborta el codegen en `generatePrismaSchema.js:86`.

## Why

TICKET-054: el validador `polymorphicChildren` introducido en SP3 (commit `5b67fc7`, UPONE-1219-S6) rechazó la entry `children` de `curricularsection.json` que declaraba `via:"parentId"` (forma inválida para `polymorphicChildren`; es una FK recursiva que pertenece a `directChildren`). La entry preexistía desde antes del validador y el codegen nunca la había procesado con el nuevo contrato. El validador tiene razón al rechazarla, pero nadie auditó el corpus al agregar el gate. Consecuencia: cada `sync`/`reset-tenant` de UPU abortaba el codegen, bloqueando la escritura de `uniqueScopedBy` al registry y causando una regresión silenciosa del enforcement de unicidad scoped (L3 de TICKET-054). El costo de no auditar fue mayor que el costo de auditar.

## Where

object-manager/src/generatePrismaSchema.js (validación ~L86: `polymorphicChildren`, `prefillFrom`) · object-manager/objects/business/Base/*.json y mods/*/objects/*.json (corpus de objetos) · scripts: `npm run codegen -- <tenant>` (sin `sync`; no requiere drift detector limpio)

## When

Antes de mergear cualquier PR que agregue o endurezca un validador en el pipeline de codegen (`generatePrismaSchema.js` o equivalente). Checklist: (1) `npm run codegen -- BASEMODEL`, (2) `npm run codegen -- UPU`, (3) un tenant de cada grupo DEMO/UC/TEST. Si algún tenant aborta: arreglar la entry antes del merge (no diferir).

## Verification

Post-rollout de un validador nuevo: todos los tenants del checklist completan `codegen -- <tenant>` sin abortar. `git diff prisma/<tenant>/schema.prisma` sin cambios inesperados.

## Source

- **Discovered in**: TICKET-054
