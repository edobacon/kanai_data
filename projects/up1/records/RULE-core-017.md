---
id: RULE-core-017
project: up1
type: rule
module: core
tags:
  - prisma
  - json
  - registry
  - object-definition
  - queries
---

# Prisma `Json?` distingue `JsonNull` (`'null'::jsonb`) de `DbNull` (SQL NULL) — las queries de `versioningConfig` deben contemplar ambos

## What

En un campo Prisma `Json?` (jsonb nullable), escribir `data: { field: null }` persiste **`JsonNull`** = el valor JSON literal `'null'::jsonb`, **NO** `DbNull` = SQL `NULL`. Son dos estados fisicamente distintos en Postgres:

| Estado | Como se produce | SQL real | Significado en el dominio |
|--------|-----------------|----------|---------------------------|
| `DbNull` (SQL NULL) | registro nunca tocado / seed antiguo / `Prisma.DbNull` | `field IS NULL` | sin sincronizar |
| `JsonNull` (`'null'::jsonb`) | `data: { field: null }` via sync | `field = 'null'::jsonb` | sincronizado pero config vacia |
| valor real | `data: { field: {...} }` | `field IS NOT NULL AND field != 'null'::jsonb` | config declarativa presente |

Desde JS ambos `DbNull` y `JsonNull` deserializan a `null`, por lo que el consumer JS no los distingue — **pero las queries SQL directas si los distinguen y deben manejar los 3 casos**.

**Estado heredado del registry post-sync inicial (2026-05-28)**: la columna `versioningConfig` de `core_ObjectDefinition` tiene **13 filas `DbNull` + 76 filas `JsonNull`**. Los registros antiguos (seed/migration) conservan SQL NULL; los tocados por el sync de Fase 3 quedan `JsonNull`. Toda query de HU-1+ que filtre por "config ausente" debe cubrir ambos: `(field IS NULL OR field = 'null'::jsonb)`.

## Why

`syncVersioningConfigToRegistry` (Fase 3 del codegen) escribe `field: null` cuando el objeto no declara `metadata.versioning`, generando `JsonNull`. Los registros pre-existentes nunca pasaron por ese sync, asi que siguen en SQL NULL. La inconsistencia es real y observable en el registry. Una query que asuma solo `IS NULL` ignora 76 filas; una que asuma solo `= 'null'::jsonb` ignora 13. Ambos errores son silenciosos.

## Where

- **Tables**: `core_ObjectDefinition.versioningConfig` (jsonb nullable) en cada tenant
- **Files**: `up1/object-manager/src/services/codegen/generatePrismaSchema.js` (`syncVersioningConfigToRegistry`)
- **Layers**: database, backend (codegen + futuros resolvers HU-1+)

## When

Siempre que una HU futura (HU-1+) consulte `versioningConfig` (o cualquier campo `Json?` poblado por sync con `null`) via SQL crudo o filtros Prisma que dependan de la distincion null. Aplica al diseñar queries de "objetos con/sin config de versionamiento".

## Verification

```sql
-- Inventario de los 3 estados en un tenant
SELECT
  COUNT(*) FILTER (WHERE "versioningConfig" IS NULL)                                AS db_null,
  COUNT(*) FILTER (WHERE "versioningConfig" = 'null'::jsonb)                        AS json_null,
  COUNT(*) FILTER (WHERE "versioningConfig" IS NOT NULL
                     AND "versioningConfig" != 'null'::jsonb)                       AS real_config
FROM "core_ObjectDefinition";
```

En Prisma, para "config ausente" usar `OR: [{ versioningConfig: { equals: Prisma.DbNull } }, { versioningConfig: { equals: Prisma.JsonNull } }]`.

## Source

- **Discovered in**: TICKET-033, Session 5 (L3 + L4) — detectado por reviewer aislado durante regresion HU-0j
- **Evidence**: Inventario post-sync inicial mostro 13 `DbNull` + 76 `JsonNull` en `versioningConfig`. El sync de Fase 3 escribe `JsonNull` via `data: { versioningConfig: null }`; los registros de seed/migration antiguos quedaron en `DbNull`.
- **Related**: RULE-core-018 (campos del resolver y SDL), `syncVersioningConfigToRegistry` (C4 del spec)
