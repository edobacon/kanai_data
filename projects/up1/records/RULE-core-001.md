---
id: RULE-core-001
project: up1
type: rule
module: core
tags:
  - multi-tenant
  - security
  - pattern
---

# Tenant filtering obligatorio en toda query

## What

Toda query Prisma DEBE filtrar por tenantId. Sin excepciones.

## Why

Sin filtro de tenant, un usuario puede ver datos de otro tenant. Data leak critico en arquitectura multi-tenant con BD unica.

## Where

object-manager/src/graphql/resolvers/, mods/*/logic/

## When

Al crear o modificar cualquier resolver, query Prisma, o endpoint que accede a datos.

## Verification

Grep por 'where' en resolvers — cada query debe incluir tenantId. Revisar context.tenantId en el resolver.

## Source

- **Discovered in**: —
