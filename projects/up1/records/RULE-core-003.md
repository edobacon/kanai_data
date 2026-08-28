---
id: RULE-core-003
project: up1
type: rule
module: core
tags:
  - graphql-first
  - architecture
  - security
---

# Todo acceso a datos via GraphQL — nunca bypass directo a DB

## What

Todo acceso a datos pasa por la API GraphQL de object-manager. Nunca queries directas a PostgreSQL desde suite, layout o flow.

## Why

GraphQL es la capa que aplica tenant filtering, RBAC, validaciones y codegen. Bypass directo salta todas estas protecciones y rompe el contrato multi-tenant.

## Where

suite/, layout/, flow/, mods/*/modsComponents/, mods/*/modsComposables/

## When

Al necesitar leer o escribir datos desde cualquier capa que no sea object-manager.

## Verification

Grep por imports de Prisma, pg, knex o conexiones SQL directas fuera de object-manager — deben estar ausentes.

## Source

- **Discovered in**: —
