---
id: DECISION-object-manager-core-inverse-relations-UPONE-1561
project: up1
type: decision
module: object-manager
---

Se extrae deriveCoreInverseRelations como helper puro y exportado: una FK core-a-core sin backRelationName cae a un nombre inverso auto-derivado al estilo business, asi que una FK core-a-core nueva solo necesita isForeignKey/references. Output de schema verificado sin cambios. Commit previo 7a33c8fa deriva las relaciones inversas de CORE desde backRelationName del JSON; f49495be remueve el id redundante de los JSON de objetos CORE.

**sourceRef:** 9769b6b8 + src/services/codegen/generatePrismaSchema.js; docs/reference/codegen-system.md.
