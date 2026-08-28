---
id: RULE-dev-nullability-basemodel-first
project: up1
type: rule
module: dev
tags:
  - codegen
  - sync
  - prisma
  - schema
  - basemodel
  - nullability
  - objects
---

# La nulabilidad de un campo base la deriva codegen del array `required`, y volverla nullable exige editar el objeto acumulado + codegen BASEMODEL-first

## What

En up1 la **nulabilidad** de un campo de un objeto Base NO se controla con un flag directo en el schema Prisma (ese es auto-generado): codegen la deriva **solo** del array `required` del objeto. Un campo que esta en `required[]` sale `not null`; fuera de `required[]` sale nullable (`generatePrismaSchema.js:422`).

Dos consecuencias operativas al querer volver **nullable** un campo base compartido (shared):

1. **El sync UNE `required` (add-only, nunca remueve)** (`fileSync.js:857`). Quitar el campo del `required` del objeto del mod NO propaga: el merge conserva el `required` acumulado. Para removerlo hay que editar el **objeto OM acumulado** (`object-manager/objects/business/Base/<Object>.json`), es decir, tocar el repo core, no solo el JSON del mod.
2. **codegen es BASEMODEL-first**: correr `npm run codegen` con `TENANT_ID=<tenant>` (default del `.env`) solo regenera los modelos tenant-specific y COPIA los shared **verbatim** del `prisma/BASEMODEL/schema.prisma` existente. Para propagar un cambio de un objeto shared hay que correr `TENANT_ID=BASEMODEL npm run codegen` PRIMERO y luego el del tenant. Sin el paso BASEMODEL el cambio nunca aparece en el schema del tenant (queda stale).

Regla operativa: para volver nullable un campo base compartido (a) editar el objeto acumulado en OM (fuera del `required[]`) y (b) correr codegen BASEMODEL-first, luego el del tenant, luego migrar.

## Why

La hipotesis natural ("hacer un campo base nullable es puro `layer:mod`: edito el JSON del mod y corro codegen del tenant") es **falsa** y se comprobo empiricamente: quitar `period` del `required` del mod + `npm run codegen` (UPU) dejo el schema en `period Int` porque el sync no removio el `required` acumulado y la codegen UPU-scoped copio `planEntry` verbatim del BASEMODEL stale. Sin esta rule, el cambio parece aplicado (edicion hecha, codegen corrido sin error) pero el schema del tenant no cambia, y el bug se descubre recien al migrar o en runtime.

## Where

- **Files**: `object-manager/scripts/.../generatePrismaSchema.js:422` (deriva nulabilidad del `required`); `object-manager/scripts/.../fileSync.js:857` (union add-only del `required`); `object-manager/objects/business/Base/<Object>.json` (objeto acumulado a editar); `prisma/BASEMODEL/schema.prisma` (fuente que copia el codegen tenant-scoped).
- **Layers**: backend / database / config (codegen + sync + prisma).
- **Comando clave**: `TENANT_ID=BASEMODEL npm run codegen` antes del codegen del tenant.

## When

Siempre que se necesite cambiar la **nulabilidad** (o el `required`) de un campo de un objeto **Base compartido** entre tenants. No aplica a campos de objetos tenant-specific ni a campos que ya nacen con la nulabilidad deseada.

## Verification

- Tras el cambio, `grep '<campo>' prisma/BASEMODEL/schema.prisma` y `prisma/<TENANT>/schema.prisma` deben mostrar el tipo esperado (`Int?` para nullable).
- El objeto acumulado en `object-manager/objects/business/Base/<Object>.json` NO debe listar el campo en `required[]`.
- Confirmar en DB (`is_nullable`) tras migrar.

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 2.
- **Evidence**: L1 + L2 del ticket. Failed approach #1 (edit solo del mod + codegen UPU dejo `period Int`). Verificado por dual-judge S2 (bridge edit-puntual durable: el mod ya no declara `period` en `required`, un sync futuro no lo reintroduce).
- **Related**: TICKET-101 (precedente de propagacion de cambio de objeto del mod); backlog B2 (codegen no emite `metadata.indexes`); RULE-dev-004 (trabajo core requiere rama + revision del team up1).
