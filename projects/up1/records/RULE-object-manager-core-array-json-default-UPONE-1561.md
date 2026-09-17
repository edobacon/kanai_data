---
id: RULE-object-manager-core-array-json-default-UPONE-1561
project: up1
type: rule
module: object-manager
---

Primer paso para generar objetos CORE por el mismo camino generico que business/up1. Regla: un campo array de CORE sin prismaType explicito emite Json (el default de business), en vez de String[]; declarar prismaType: String[] explicitamente sigue habilitando un array nativo. Verificado con prisma migrate diff: el unico cambio de schema fue core_FieldDefinition.previousNames (String[] a Json).

**sourceRef:** 8bad3efe + src/services/codegen/generatePrismaSchema.js.
