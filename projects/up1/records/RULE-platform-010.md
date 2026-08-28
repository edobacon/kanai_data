---
id: RULE-platform-010
project: up1
type: rule
module: platform
tags:
  - uniqueness
  - scoped-uniqueness
  - createInstance
  - polymorphic
  - CurricularSection
  - Modality
  - codegen
  - formatError
  - UNIQUE_VIOLATION
  - i18n
---

# Unicidad scoped en objetos polimórficos: enforcement en resolver cuando el codegen no emite @@unique

## What

Para objetos polimórficos donde `@@unique` de la DB está bloqueado o el scope incluye columnas de la tabla RT (no disponibles en la tabla base), la unicidad scoped se enforza en el resolver `createInstance`/`updateInstance` antes de crear el registro: validar `name` (tabla base) y `code` (tabla RT via relation-filter) únicos por `[ownerId, recordType]`. El resolver lanza un error con el patrón `Unique constraint failed on the fields: (X)` que `formatError` normaliza a `{ code: 'UNIQUE_VIOLATION', extensions.fields }`. El cliente traduce vía i18n; el servidor solo devuelve el `code` estable.

## Why

El codegen NO emite `@@unique` para `uniqueConstraints` declarados en objetos polimórficos base (ej. `CurricularSection`): la anotación se propaga al JSON synced pero no aparece en `schema.prisma` ni en DB (sí funciona para objetos simples como `workflowStatus`). Adicionalmente, un `@@unique` compuesto que incluye columnas de la tabla RT (por ejemplo `code` en `rt__Modality__curricularsection`) es imposible de expresar en la tabla base vía Prisma standard. El enforcement en resolver compensa este gap y es además más robusto: rechaza ANTES de crear, sin registro a medias. El `prefilledModal` clone depende de este enforcement para ser realmente seguro (sin él es solo un nudge UX).

## Where

object-manager/src/graphql/resolvers/helpers/scoped-uniqueness.js (helper `enforceScopedUniqueness`) · object-manager/src/graphql/resolvers/instance.resolver.js (invocado en el RT block de `createInstance` ~L2489 y `updateInstance` ~L3320) · mods/curriculum-design/objects/CurricularSection.json y rt__Modality__curricularsection.json (declaran `uniqueScopedBy: ["ownerId","recordType"]` en las field properties) · La prop `uniqueScopedBy` la escribe el codegen a `core_FieldDefinition.properties` vía `generatePrismaSchema.js`.

## When

Al declarar unicidad en objetos con RT projection o FK polimórfica donde el scope cruza tablas. Al revisar regresión del enforcement: verificar que `core_FieldDefinition.properties` contiene `uniqueScopedBy` (el codegen debe haber corrido para ese tenant). Si el campo está ausente en DB, el helper falla en silencio (no loguea warn — ver B2/B-pf-drift-detector-rt). Ante regresión del invariante: comprobar primero el DATO en DB (`SELECT properties FROM core_FieldDefinition WHERE ...`), no asumir revert de código.

## Verification

SQL: `SELECT properties FROM core_FieldDefinition WHERE objectType='CurricularSection' AND fieldName='name'` → debe contener `uniqueScopedBy`. Test E2E: clonar Modalidad con `name` o `code` duplicado dentro del mismo Activity → debe retornar `UNIQUE_VIOLATION`, sin fila creada.

## Source

- **Discovered in**: TICKET-044
