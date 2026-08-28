---
id: RULE-core-035
project: up1
type: rule
module: core
tags:
  - rt-ext
  - projection
  - casing
  - model-resolution
  - fk
  - introspection
  - string-transform
  - platform
---

# Resolver nombre de modelo y FK de proyecciones RT/ext por introspección case-insensitive, nunca por transformación de string

## What

El casing del segmento base en las tablas de proyección (`rt__<RT>__<base>`, `ext__<client>__<base>`) **NO es uniforme**: coexisten `rt__Course__activity` (FK `activityId`) y `rt__Service__Activity` (FK `ActivityId`), porque `parseRecordTypeFileName` usa el segmento verbatim del nombre de archivo. Cualquier código que construya el nombre de modelo Prisma o la FK **asumiendo un casing fijo** (lowercase o camelCase, ej. `${objectType.toLowerCase()}Id`) deja huérfana la proyección del casing contrario. MUST resolver accessor y FK por **introspección case-insensitive** del datamodel, nunca por transformación de string sobre el objectType.

## Why

Uno de los 7 bugs de runtime del motor de borrado de TICKET-104 (ver [[RULE-core-034]]): construir FK por string dejaba huérfanas proyecciones del casing contrario.

## Where / reconciliación con la regla de plataforma (IMPORTANTE)

- El learn original (L11/L15 de TICKET-104) implementó la resolución vía `_runtimeDataModel` de Prisma (`findModelKeyCI`/`resolveBaseFk`).
- **PERO** el CLAUDE.md de up1 tiene una regla crítica: NO referenciar DMMF (`prisma._dmmf`, `prisma._baseDmmf`, `Prisma.dmmf`, `prisma._runtimeDataModel`) porque **no está disponible en clientes tenant-scoped**; usar `core_FieldDefinition` para descubrir relaciones/FK.
- **Tensión a verificar**: si el motor de borrado corre sobre un cliente tenant-scoped, la solución vía `_runtimeDataModel` contradice esa regla y hay que migrarla a `core_FieldDefinition` (o confirmar que el motor usa un cliente no-tenant, ej. BASEMODEL, donde el datamodel sí está disponible). El **principio** de esta regla (resolver por introspección, nunca por string) es firme; el **mecanismo** debe ser el válido para el cliente real del motor.

## When

Al construir queries dinámicas sobre proyecciones RT/ext (delete, update, display). Verificar el mecanismo de introspección contra el tipo de cliente Prisma en uso.
