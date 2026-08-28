---
id: RULE-mods-008
project: up1
type: rule
module: mods
tags:
  - seed
  - prisma
  - relations
  - connect
  - lowercase
---

# Seeds usan connect con relacion lowercase para FK, no campo directo

## What

En seeds que usan el Prisma client per-tenant, las foreign keys NO se pasan como campo directo (`cmCompetencyMatrixId: 'xxx'`). Se deben usar relaciones Prisma con `connect` y el nombre de la relacion en **lowercase** (como Prisma lo genera).

Correcto:
```js
await prisma.cmCompetency.create({
  data: {
    code: 'CG-01',
    name: 'Pensamiento Critico',
    cmcompetencymatrix: { connect: { id: matrixId } },  // lowercase
  }
})
```

Incorrecto:
```js
await prisma.cmCompetency.create({
  data: {
    code: 'CG-01',
    cmCompetencyMatrixId: matrixId,  // campo FK directo — no funciona
    tenantId: 'TEST',                // no existe en schema per-tenant
  }
})
```

Para seeds que necesitan importar el Prisma client manualmente (fuera del sync), usar el path del tenant especifico: `object-manager/prisma/{TENANT}/generated/index.js`.

## Why

El Prisma client per-tenant genera nombres de relacion en lowercase (ej: `cmcompetencymatrix` en lugar de `cmCompetencyMatrix`). El campo FK directo (`cmCompetencyMatrixId`) no esta expuesto en el client per-tenant — solo la relacion. Ademas, `@prisma/client` default no esta inicializado en el monorepo; hay que usar el generated del tenant.

## Where

- **Files**: `mods/*/seed/*.js`
- **Layers**: backend (seeds)

## When

Siempre que se escriba un seed de un mod que tenga relaciones entre objetos (foreign keys). Aplica tanto a `create` como a `upsert`.

## Verification

- Grep por `Id:` (patron de FK directo) en archivos `seed/*.js` — deberia usar `connect` en su lugar
- Grep por `@prisma/client` en seeds — deberia usar path relativo al generated del tenant

## Template

- [TMPL-mod-seed](../../templates/TMPL-mod-seed.js.tmpl) — patron canonical de seed idempotente con `prisma.connect` lowercase + separacion create/update para preservar runtime state

## Source

- **Discovered in**: TICKET-002, Session 1
- **Evidence**: Seed fallo con `Unknown argument 'tenantId'` y luego con FK no reconocida. Fix: usar `connect` con relacion lowercase e importar Prisma client del tenant
- **Related**: RULE-core-009 (tenantId), RULE-layout-002 (FK lowercase), L4 y L5 de TICKET-002
