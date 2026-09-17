---
id: RULE-object-manager-common-json-per-object-exceptions-UPONE-1563
project: up1
type: rule
module: object-manager
tags:
  - UPONE-1563
  - sp10
  - codegen
  - common-json
---

Los campos comunes de objects/business/common.json antes se aplicaban a TODOS los objetos por igual; ahora un objeto puede declarar excepciones por campo. Impacta el stamp de updatedById (src/graphql/resolvers/helpers/audit-updated-by.js, que ahora respeta la excepcion) y la emision del schema Prisma (src/services/codegen/generatePrismaSchema.js, que omite el campo comun para el objeto exceptuado). sourceRef: 0401b26. Doc: docs/reference/codegen-system.md.
