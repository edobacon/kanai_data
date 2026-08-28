---
id: RULE-core-012
project: up1
type: rule
module: core
---

# Todo rowAction declara requiredCapability explícita — incluso los de lectura

## What

Todo objeto `rowAction` dentro de un layout JSON DEBE declarar el campo `requiredCapability` apuntando a una capability definida en el `capabilities.json` del mod. Aplica incluso a acciones de navegación/lectura como 'Ver detalle' — deben apuntar a una capability `mod/<modname>:view_<object>` (o equivalente).

## Why

La tercera capa RBAC (client-side gate de UI) debe cubrir todo action, no solo mutaciones. Si 'Ver detalle' no tiene `requiredCapability`, cualquier usuario autenticado con acceso al listado puede abrir el detalle — aunque el resolver de lectura filtre en backend (RULE-core-004), la UX expone la acción indiscriminadamente. Refuerza RULE-core-004 con un criterio de completitud.

## Where

En todo `layout.json` de mod, dentro de los arrays `rowActions` de RecordList o `actions` de RecordDetail.

## When

Al crear o editar un layout JSON con row actions. Durante code review de PRs de mods.

## Verification

Grep en `config/layouts/**/*.json` por `rowAction`s — cada uno debe tener campo `requiredCapability`. La capability referenciada existe en `capabilities.json`.

## Source

- **Discovered in**: TICKET-005
