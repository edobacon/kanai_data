---
id: RULE-mods-045
project: up1
type: rule
module: mods
tags:
  - recordtype
  - codegen
  - extension-table
  - prisma
  - model
  - drift-detector
  - offering
  - curriculum
---

# RecordTypes en el modelo: identidad canónica rt__X__base, tablas de extensión 1:1, tipo derivado upstream

## What

La identidad canónica de un RecordType en up1 es `rt__<RT>__<base>` — es el nombre del model Prisma, la tabla en DB, el tipo GraphQL y la clave de layout. El `title` corto (ej. "Plan") es solo una etiqueta humana; usarlo como clave produce colisiones con objetos Base homónimos (ej. `Modality` vs `rt__Modality__curricularsection`).

El codegen genera tablas de extensión 1:1 (`rt__Plan__curriculum`, `rt__Minor__curriculum`) con FK al objeto base (`curriculumId`). Los campos específicos del RecordType viven en esa tabla satélite, NO como columnas nullable en la base.

El tipo de un objeto compartido puede derivarse upstream: `Offering` no tiene `recordType` en model-v2 (retirado junto al modelo `Service` legacy); es 'Sílabo' si su `ActivityLine → Activity` tiene `recordType=Course`. Verificar en 4 capas: JSON del mod, Base sincronizado, schema Prisma y resolver antes de asumir que el campo existe.

## Why

- Usar el title corto como clave colapsa en el drift detector (`detect-schema-drift.js` keyeaba por title → 7 falsos positivos, bloquea `setup:reset`).
- El data-model.prisma del draft (columnas nullable en base) es una aproximación; el seed y los layouts DEBEN contemplar la tabla de extensión (`rt__Plan__curriculum`) para poblar/mostrar los campos del RecordType.
- El tipo derivado upstream (ej. Offering) requiere filtros/resolvers custom porque el RecordList no puede filtrar a 2 saltos declarativos.

## Where

- `mods/<mod>/objects/RecordTypes/rt__<RT>__<base>.json` (definición del RecordType)
- `object-manager/prisma/<tenant>/schema.prisma` (tablas `rt__<RT>__<base>` generadas)
- `object-manager/src/graphql/typeDefs/dynamic.js` (tipos GraphQL generados)
- `object-manager/scripts/detect-schema-drift.js` (bug: keyeaba por title, no por nombre canónico; fix: cargar RecordTypes + keyear por `rt__X__Y`)
- `mods/curriculum-design/objects/RecordTypes/rt__Plan__curriculum.json`, `rt__Minor__curriculum.json` (ejemplos reales)
- `mods/curriculum-design/objects/Offering.json` (ejemplo de tipo derivado upstream: no tiene `recordType` propio)

## When

1. Al crear un RecordType nuevo: usar `rt__<NombreRT>__<nombreBase>` como clave en todos los artefactos (archivo JSON, nombre de tabla, layout, i18n).
2. Al sembrar datos con RecordType: incluir el satélite `rt__<RT>__<base>` como objeto anidado en el create del seed (sin él, las columnas quedan null).
3. Al diseñar layouts para RecordType con campos propios: los fields SOLO-RT referencian la tabla de extensión, no la base.
4. Al modelar el tipo de un objeto compartido (como Offering): verificar en 4 capas antes de asumir que `recordType` existe; puede ser derivado upstream.

## Verification

1. `grep 'rt__' object-manager/prisma/<tenant>/schema.prisma` → confirmar tabla generada.
2. Crear un registro vía resolver y verificar que la fila en `rt__<RT>__<base>` existe con los campos esperados.
3. En layouts, verificar que los campos del RecordType resuelven correctamente (no quedan null).
4. Para tipo derivado upstream: verificar en `object-manager/src/graphql/resolvers/*/offering-create.resolver.js` (o similar) que el campo fue efectivamente retirado.

## Source

- **Discovered in**: TICKET-063,TICKET-048,TICKET-064
