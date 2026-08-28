---
id: RULE-curriculum-design-029
project: up1
type: rule
module: curriculum-design
tags:
  - smoke
  - visual
  - vitest-gap
  - ui-verify
  - node-env
---

# Smoke visual obligatorio para features UI antes de cerrar (vitest node-env no monta `.vue`)

## What

Ademas de tests unit/integration, ejecutar smoke visual contra el componente en la UI real (no en vitest node-env) antes de cerrar tasks con output visible / render condicional / state local.

## Why

El vitest del mod corre en `environment: node` sin `@vitejs/plugin-vue` -> los `.vue` no se montan; un unit-verificado != integracion-correcta (T088 L13: `addPeriod` delta vs `groupByPeriod` absoluto convivian en verde, no renderizaban).

## Where

Gate S{N}.GATE de tickets con cambios UI.

## When

Verificacion de features con render condicional / state local / modal / columnas computadas.

## Verification

Capturas en screenshots del ticket (carpeta `tickets/{id}.screenshots/`) con la feature ejercitada.

## Source

- **Discovered in**: TICKET-088
