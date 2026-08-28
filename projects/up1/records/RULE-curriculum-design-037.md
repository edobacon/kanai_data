---
id: RULE-curriculum-design-037
project: up1
type: rule
module: curriculum-design
tags:
  - requirement
  - group
  - pool
  - electivo
  - k-de-n
  - empty-group
  - false-satisfied
  - evaluategroup
  - seed
  - atomicidad
  - mod
---

# Todo `Group`/pool de `requirement` debe tener hojas; un grupo vacío es un huérfano falso-satisfecho

## What

Cualquier `Group` (OR/AND o pool electivo K-de-N) del árbol de `requirement` MUST tener al menos una hoja normativa. `evaluateGroup` (`evaluateRequirementTree.logic`) trata un grupo sin hijos normativos como `satisfied: true` (vacuo), así que un OR/pool vacío **se da por satisfecho y anula el requisito**. Está PROHIBIDO dejar grupos vacíos, tanto por seed como por alta/borrado no atómico.

## Why

Auditoría pre-cierre de TICKET-101 halló que `seed/_data-requirement.js` creaba el bloque electivo como `Group(OR, minToSatisfy:4, creditsRequired:24)` SIN cursos hijos → pool vacío huérfano falso-satisfecho. En render se mitiga con `pruneEmptyGroups`, pero la prevención es esta regla. Conecta con un gap latente en la orquestación de alta: `executeElectiveCreate` (`requirementCreate.logic.ts`) no tiene el guard de `leaves` vacío que sí tiene `executeConditionCreateBatch` (línea 171), por lo que con `leaves=[]` crea igual el pool huérfano.

## Where

`seed/_data-requirement.js`, `requirementCreate.logic.ts` (`executeElectiveCreate` / `executeConditionCreate*`), y cualquier alta/borrado de grupos en el editor.

## When

Al crear grupos por seed o por la UI, y al revisar altas/borrados no atómicos (un rollback parcial no debe dejar grupos sin hojas).
