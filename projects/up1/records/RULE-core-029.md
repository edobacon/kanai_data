---
id: RULE-core-029
project: up1
type: rule
module: core
tags:
  - codegen
  - BASEMODEL
  - tenant
  - cross-tenant
---

# Codegen: regenerar BASEMODEL (`TENANT_ID=BASEMODEL npm run codegen`) PRIMERO, luego tenant

## What

Para cambios en objetos `core`/`shared`, regenerar `BASEMODEL` primero (`TENANT_ID=BASEMODEL npm run codegen`); luego correr el codegen del tenant. El paso BASEMODEL regenera el modelo base desde los JSON core (`generatePrismaSchema.js:1231-1236`).

## Why

El codegen normal solo copia BASEMODEL (posiblemente stale) al tenant -> sin BASEMODEL-first, un cambio de schema core no aparece en ningun tenant. El propio codegen avisa (`:1375`).

## Where

Release de objetos core/shared; tickets con cambios cross-tenant.

## When

Cambios de schema en `objects/core/*` o `objects/business/Base/*` compartidos.

## Verification

diff de `prisma/BASEMODEL/schema.prisma` post-codegen muestra el cambio core.

## Source

- **Discovered in**: TICKET-102
