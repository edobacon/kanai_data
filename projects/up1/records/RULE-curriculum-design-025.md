---
id: RULE-curriculum-design-025
project: up1
type: rule
module: curriculum-design
tags:
  - enrichment
  - testing
  - prisma
  - select
  - n+1
  - read-resolver
  - mod
---

# Extender un enrichment de lectura es aditivo y barato — pero rompe los tests que asertan el shape exacto del `select`

## What

Al agregar campos derivados en el resolver de lectura del mod (`curriculum-read.resolver.js`, `enrichRequirementCategoryRows` / `enrich*Rows`):

1. **Reusar el `findMany` existente**: los derivados nuevos (`mandatoryCount`, `electiveCount`, `creditStatus`, …) se calculan sobre el **mismo** `planEntry.findMany` que ya trae `currentCredits` — agregar solo el campo faltante al `select` (ej. `blockId`). **Cero N+1**; el costo marginal es nulo.
2. **Los tests que asertan el shape EXACTO del `select` se rompen ante esa extensión aditiva**: un `expect(...).toHaveBeenCalledWith({ where, select: { a, b } })` falla al agregar `c` al select, aunque el cambio sea correcto y no rompa nada en runtime. Actualizar esos tests **con** el cambio (es cambio de contrato intencional), o preferir asserts parciales (`objectContaining`) para el `select`.

## Why

Caso real: TICKET-087 (MC-07) agregó `blockId` al `select` de `enrichRequirementCategoryRows` para derivar conteos → rompió `requirementCategoryGuard.test.js`, que aserta el `select` completo. El cambio era correcto (aditivo, reusa el `findMany`, cero N+1), pero el test de shape exacto lo marcó como regresión falsa. Reaparece en cualquier extensión futura del enrichment.

## Where

- `mods/curriculum-design/logic/curriculum-read.resolver.js` — `enrichRequirementCategoryRows` / `enrichRequirementCategoryItem` (y análogos).
- Tests afectados: `tests/unit/requirementCategoryGuard.test.js` y cualquiera que asserte `toHaveBeenCalledWith({ select: {...} })` sobre el `findMany` del enrichment.

## When

Al agregar cualquier campo derivado en el resolver de lectura del mod, o al escribir un test que verifique el `findMany` del enrichment.

## Verification

Tras extender el enrichment: el resolver expone el campo nuevo junto a los previos; `vitest` verde; si un test asertaba el `select` exacto, se actualizó al nuevo shape (o migró a `objectContaining`). Confirmar 1 sola query por lote (sin N+1).

## Source

TICKET-087 (MC-07 / UPONE-1350), learns L1+L2. Patrón reconfirmado en TICKET-089 (nota en teach-close).
