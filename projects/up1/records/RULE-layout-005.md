---
id: RULE-layout-005
project: up1
type: rule
module: layout
tags:
  - apollo
  - graphql
  - multi-tenant
  - pattern
---

# Apollo Client solo via useTenantApolloClient

## What

Componentes que hacen queries GraphQL DEBEN usar useTenantApolloClient(). No importar Apollo Client directamente.

## Why

useTenantApolloClient inyecta automaticamente el X-Tenant-ID header y configura el endpoint correcto. Import directo de Apollo Client salta el tenant context y puede enviar requests sin tenant.

## Where

mods/*/modsComponents/, mods/*/modsComposables/, layout/src/components/

## When

Al crear componentes o composables que necesitan hacer queries GraphQL.

## Verification

Grep por 'import.*ApolloClient' o 'new ApolloClient' en componentes — deben estar ausentes. Solo useTenantApolloClient.

## Source

- **Discovered in**: —
