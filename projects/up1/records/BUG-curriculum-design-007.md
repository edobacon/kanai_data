---
id: BUG-curriculum-design-007
project: up1
type: bug
module: curriculum-design
tags:
  - createinstance
  - rtprojected
  - polimorfico
  - owner
  - attribution
  - mock-gap
---

# `createInstance` de objetos RT-projected no expone `ownerType`/`ownerId` al top-level del `result`

## Symptom

El snapshot del CREATE en P3 quedaba con `ownerType: null, ownerId: null` aunque `args.data` los tuviera. La atribucion polimorfica del DataLog quedaba rota.

## Expected behavior

El snapshot del CREATE combina `args.data` (input, trae el owner) con `result` (output del resolver, que NO incluye `ownerType`/`ownerId` al top-level en RT-projected).

## Root cause

`createInstance` de RT-projected (`rt__<RT>__<base>`) NO expone `ownerType`/`ownerId` al top-level del `result` GraphQL (queda solo en la tabla de extension). Los unit mocks lo ocultaban porque devolvian `result` con `owner: {...}`.

## Impact

P3 audit (atribucion polimorfica) queda con `metadata.ownerType/ownerId` null para hijos derivados de Curriculum (Planes y Menores).

## Reproduction

Crear via UI con recordType Plan + verificar entrada DataLog con `metadata.ownerType/ownerId` null. Mocks con `result.owner` ocultan el bug.

## Workaround

Combinar `args.data` con `result` en el snapshot antes de persistir (fix aplicado en T102).

## Solution

Pendiente.

## Related

- **Specs**: SPEC-curriculum-design-datalog-history-attribution
- **Tickets**: TICKET-102
