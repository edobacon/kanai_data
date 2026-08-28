---
id: RULE-curriculum-design-018
project: up1
type: rule
module: curriculum-design
tags:
  - codegen
  - indexes
  - nullability
  - prisma
  - mod
  - platform-constraint
---

# El codegen ignora `metadata.indexes`; la nullability la decide `required[]`, no `not_null`

## What

Dos comportamientos del codegen de objetos del mod que el JSON NO refleja directamente:

1. **Índices**: `metadata.indexes` del JSON **no** genera `@@index` en el `schema.prisma`. Para índices reales, declararlos en `seed/_data-indexes.js` (`ensureIndexes`, `CREATE INDEX IF NOT EXISTS` en cada sync).
2. **Nullability**: un campo es no-nullable en el schema **solo si está en `required[]`** del JSON — `"not_null": true` por sí solo NO basta. Un enum con `static_default` pero ausente de `required[]` sale `Tipo? @default(...)` (nullable con default); el enum Postgres igual constriñe los valores.

## Why

El generador (`object-manager/src/services/codegen/generatePrismaSchema.js`) deriva la nullability del array JSON-Schema `required` (no del flag `not_null`) y NO procesa `metadata.indexes` (solo emite `@@index` para FKs/core). Es un gap conocido del platform — `CurricularSection` (producción) declara `metadata.indexes` y tampoco los tiene. `onDelete` SÍ se honra (`fieldDef.onDelete`).

## Where

- `object-manager/src/services/codegen/generatePrismaSchema.js` (lee `required` para nullability + `fieldDef.onDelete`; ignora `metadata.indexes`).
- Workaround de índices: `mods/curriculum-design/seed/_data-indexes.js` (`ensureIndexes`).
- Evidencia: `object-manager/prisma/UPU/schema.prisma` (`kind planEntryKind? @default(Course)` vs `period Int`; sin `@@index` de mod).

## When

Al definir un objeto de mod que: (a) requiere índices de consulta → agregarlos a `ensureIndexes`; (b) requiere un campo no-nullable → incluirlo en `required[]` (no basta `not_null: true`). Verificar SIEMPRE post-sync inspeccionando el `schema.prisma` generado.

## Verification

Post-sync: `grep "@@index" prisma/UPU/schema.prisma | grep <tabla-del-mod>` → vacío salvo lo agregado en `ensureIndexes`. Campos requeridos: confirmar que están en `required[]` del JSON y salen sin `?` en el schema.

## Source

TICKET-082 (MC-02 / UPONE-1345), learn L2 — verificado post-sync al inspeccionar el schema generado de `planEntry`. REQ-05 se entregó vía `ensureIndexes` (+5 índices).
