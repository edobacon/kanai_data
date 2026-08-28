---
id: RULE-layout-022
project: up1
type: rule
module: layout
tags:
  - graphql
  - listinstances
  - relations
  - data-path
---

# `listInstances` con `relations` retorna RT data en `data.<relationName>` (no en `extended`)

## What

`listInstances` GraphQL con `relations: ["rt__<RT>__<base>"]` retorna el RT data **dentro de `data.<relationName>`**, NO en `extended` (que queda `null`). La propiedad keyed en el RT row es `curricularsectionId` (FK), no `id`. Patron correcto en composables:

```ts
const rt = it.data?.rt__LearningOutcome__curricularsection
const code = rt?.code
```

## Why

Convencion de la plataforma — `data` contiene los fields directos + relations 1:1 cargadas; `extended` se reserva para otros mecanismos (probablemente computed o field augmentation, no relations). Asumir que `extended` tiene el RT data lleva a `null` silencioso y el componente no muestra los fields esperados.

## Where

Cualquier composable o consumidor de `listInstances({ relations: [...] })` — typically en `mods/<m>/modsComponents/<Name>/use<Name>.ts`.

## When

Al consumir GraphQL `listInstances` con relations. Validar el shape via `console.log(items[0])` la primera vez para confirmar el path.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L29 — Session 4 (2026-04-30)
- F5 (failed approach)
