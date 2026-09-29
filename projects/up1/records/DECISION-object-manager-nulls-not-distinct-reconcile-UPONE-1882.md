---
id: DECISION-object-manager-nulls-not-distinct-reconcile-UPONE-1882
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1882
  - sp11
  - codegen
  - unicidad
---

Prisma no puede expresar UNIQUE ... NULLS NOT DISTINCT. Cuando una clave unica incluye una columna opcional, el codegen emite un @@index (no @@unique) y la restriccion real se aplica y verifica directo en Postgres con scripts/reconcile-unique-drift.js. El helper deriveUniqueConstraints es la unica fuente de verdad que usan tanto el codegen como el reconciliador, para que ambos coincidan en que columnas llevan la restriccion.

sourceRef: da611f7e scripts/reconcile-unique-drift.js, src/services/codegen/deriveUniqueConstraints.js:16
