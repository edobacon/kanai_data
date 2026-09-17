---
id: DECISION-object-manager-core-id-uuid-migration-UPONE-1560
project: up1
type: decision
module: object-manager
---

Migracion multi-fase de los ids de objetos CORE (y luego BASEMODEL) de Int a uuidv7 String, coexistiendo con idLegacy durante la transicion. Fase 1 (2a7bd04f, 2026-09-01) cambia objects/core/*.json e ids en prisma/*/schema.prisma de todos los tenants; Fase 2 (293c07a2, 974a295f, 17e95d9e) agrega emision nativa de uuidv7 + columnas @db.Uuid detras del flag PHASE2_UUID_IDS, con migracion de datos y guard de referencias suaves (b34dec05, e7ac2a21). Desde esta migracion no queda ninguna PK Int en la plataforma (premisa usada por 931b1958 para cambiar el fallback de detectIdTypeFromSchema).

**sourceRef:** 2a7bd04f (85 archivos, objects/core/*.json + prisma/*/schema.prisma); docs/reference/object-id-convention.md.
