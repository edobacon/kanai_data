---
id: RULE-object-manager-referencia-blanda-sin-isforeignkey-UPONE-1990
project: up1
type: rule
module: object-manager/codegen-sync
level: should
tags:
  - UPONE-1990
  - document-engine
  - relations
---

El motor de documentos reconoce las relaciones fk, self y polymorphic (y las declaradas por mods). softReferences se eliminó: una referencia blanda es simplemente una referencia sin isForeignKey (id sin FK ni relación Prisma, remapeada por la migración de ids). Los filtros y orden con punto dentro de un loop de plantilla requieren una FK base con isForeignKey, porque listInstances los anida sobre una relación Prisma; no valen ids polimórficos, referencias blandas ni FK propias de un RT.

Fuente: 99280e46 docs/features/document-templates.md:43,53.
