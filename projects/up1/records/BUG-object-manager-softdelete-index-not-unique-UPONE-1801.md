---
id: BUG-object-manager-softdelete-index-not-unique-UPONE-1801
project: up1
type: bug
module: object-manager
---

Prisma no permite un indice unico parcial/filtrado (WHERE active = true) en schema.prisma. Un @@unique de tabla completa en un objeto con metadata.softDelete bloquea recrear una combinacion previamente soft-deleteada. Confirmado en produccion: ScenarioSectionAssignment/academic-scheduling en CONTINENTAL tenia 19k+ filas activas con un gemelo soft-deleted identico, y `prisma db push` chocaba con el indice parcial fuera de banda, rompiendo cada redeploy. Fix: cuando `metadata.softDelete?.field` existe, generatePrismaSchema.js emite `@@index(...)` en vez de `@@unique(...)` (generateBaseModel y updateBaseModelSchema). La unicidad real vive en un indice parcial fuera de banda, reconciliado por scripts/reconcile-unique-drift.js. Relaciona con RULE-core-pre-push-db-safety.

**sourceRef:** 9d3b8455 + src/services/codegen/generatePrismaSchema.js ~585-600 y ~1031-1040.
