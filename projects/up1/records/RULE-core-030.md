---
id: RULE-core-030
project: up1
type: rule
module: core
tags:
  - sync
  - codegen
  - retiro
  - aditivo
  - BASEMODEL-first
---

# Retiro de objeto: borrar en mod + copia synced en core a mano + codegen (BASEMODEL-first) + migrate

## What

`npm run sync` es aditivo (NO purga objetos borrados); retirar un objeto requiere 4 pasos: (1) borrar en el mod, (2) borrar `objects/business/Base/<objeto>.json` (copia synced) a mano, (3) `TENANT_ID=BASEMODEL npm run codegen` para regenerar BASEMODEL, (4) codegen del tenant + migrate.

## Why

Una copia synced huerfana (objeto borrado del mod pero presente en core synced) hace que codegen siga emitiendo el modelo viejo (verificado T102 L7: tras borrar `changeLog.json` del mod sin tocar copia synced, codegen seguia regenerando `model ChangeLog`).

## Where

Tickets con retiro de objetos (mod o core).

## When

Delete en mod o core.

## Verification

Ausencia del modelo en BASEMODEL + tenant post-codegen + migrate limpia.

## Source

- **Discovered in**: TICKET-102
