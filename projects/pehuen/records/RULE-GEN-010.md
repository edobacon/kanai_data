---
id: RULE-GEN-010
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - schema
  - timestamps
  - paridad
---

# `createdAt` y `updatedAt` como `Number` (epoch ms) — no `Date` ni `timestamps: true` Mongoose

## What

Los campos `createdAt` y `updatedAt` en todos los modelos Mongoose se definen como `Number` con default `0`, representando epoch en milisegundos. No se usa `timestamps: true` de Mongoose (que genera objetos `Date`). No se usan objetos `Date` nativos.

## Why

El legacy almacena estos campos como Number epoch ms. Si nuxt usara `timestamps: true`, los campos serían objetos `Date` en MongoDB y los valores serían incompatibles con el legacy. Queries que filtran por `createdAt > 1700000000000` (epoch ms) fallarían si el campo es `Date`. La serialización JSON de `Date` vs `Number` también es diferente para el cliente.

## Where

- **Files**: `server/models/*.ts` (todos los modelos: no incluir `timestamps: true`, definir `createdAt: { type: Number, default: 0 }` y `updatedAt: { type: Number, default: 0 }`)
- **Tables**: todas las colecciones con `createdAt`/`updatedAt`
- **Layers**: database, backend model layer

## When

En cada modelo Mongoose. Los handlers de escritura deben asignar `createdAt: Date.now()` en CREATE y `updatedAt: Date.now()` en UPDATE.

## Verification

- `grep -rn "timestamps: true" server/models/` → 0 matches.
- `grep -rn "createdAt.*Number\|updatedAt.*Number" server/models/` → debe aparecer en cada modelo.
- `db.guias.findOne().createdAt` → valor numérico (epoch ms), no objeto Date.
- Test: crear documento → `typeof createdAt === 'number'`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` tabla campos: `createdAt: Number, default: 0`, "No usa `timestamps: true` de Mongoose". Mismo patrón en `guia.model.ts`. Contrato migración: paridad de schema.
- **Related**: RULE-GEN-008, RULE-GEN-009
