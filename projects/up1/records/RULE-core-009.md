---
id: RULE-core-009
project: up1
type: rule
module: core
tags:
  - prisma
  - multi-tenant
  - tenantId
  - resolver
  - seed
---

# Prisma client per-tenant no tiene campo tenantId — no filtrar ni insertar tenantId

## What

El Prisma client generado por tenant (`object-manager/prisma/{TENANT}/generated/`) opera sobre un esquema que ya esta aislado por tenant. El campo `tenantId` NO existe en los modelos de ese client. Resolvers custom y seeds que usen el Prisma client per-tenant DEBEN omitir `tenantId` en queries `where`, `create` y `upsert`.

## Why

uP1 usa isolation por esquema separado: cada tenant tiene su propio schema Prisma y su propia base de datos logica. El campo `tenantId` existe en el schema compartido (`BASEMODEL`) pero NO se propaga al schema per-tenant. Intentar filtrar por `tenantId` produce `PrismaClientValidationError: Unknown argument 'tenantId'`.

## Where

- **Files**: `mods/*/logic/*.resolver.js`, `mods/*/seed/*.js`, cualquier codigo que use `context.prisma` en resolvers
- **Layers**: backend (resolvers, seeds)

## When

Siempre que se escriba un resolver custom o un seed que opera con el Prisma client del tenant (via `context.prisma` en resolvers, o importando el generated del tenant en seeds).

## Verification

- Grep por `tenantId` en archivos `.resolver.js` y `seed/*.js` de mods — no debe aparecer en `where`, `create` ni `upsert`
- Si un resolver necesita el tenant actual, esta implicito en el client que recibe via `context.prisma`

## Source

- **Discovered in**: TICKET-002, Session 1
- **Evidence**: Seed fallo con `Unknown argument 'tenantId'`. Resolver fallo con el mismo error. Ambos se corrigieron omitiendo tenantId
- **Related**: RULE-core-008 (CRUD generico), L1 y L4 de TICKET-002
