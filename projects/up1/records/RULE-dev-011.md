---
id: RULE-dev-011
project: up1
type: rule
module: dev
tags:
  - dev-ops
  - sync:logic
  - smoke
  - object-manager
  - restart
---

# object-manager :4000 corre con `npm start` (sin nodemon); restart obligatorio tras `sync:logic` antes del smoke E2E

## What

Tras `npm run sync:logic`, reiniciar OM manualmente (`pm2 restart object-manager` o equivalente) antes de ejecutar el smoke E2E. `npm start` no recarga modulos.

## Why

El proceso OM en :4000 corre como `node src/index.js` plano (no nodemon); sync:logic escribe archivos en `objects/...` (algunos gitignored) pero el proceso en memoria sigue con la version vieja. Tests a nivel-datos verdes conviven con runtime viejo (falsa confianza).

## Where

Smoke E2E del mod curriculum-design y similares con sync:logic.

## When

Smoke E2E post-sync:logic.

## Verification

Log del proceso post-restart + smoke E2E ejecuta contra la version nueva (regression test del cambio).

## Source

- **Discovered in**: TICKET-073
