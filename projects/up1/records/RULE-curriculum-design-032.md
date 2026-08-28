---
id: RULE-curriculum-design-032
project: up1
type: rule
module: curriculum-design
tags:
  - polymorphicUpdate
  - RT_PATTERN
  - guard
  - mc-09
  - security
  - regression
  - rt
  - mod
---

# Al extender `RT_PATTERN` de `polymorphicUpdate`, re-cablear los guards de la rama `!RT_PATTERN`

## What

`polymorphicUpdate.resolver.js` bifurca `updateInstance` en dos ramas mutuamente excluyentes por `RT_PATTERN.test(objectType)`:

- **Rama `!RT_PATTERN`** (`:671-681`): aplica los guards de dominio del mod ANTES de delegar al generic — `assertCreditRangeOnUpdate`, `assertActivityNotInActivePlanOnUpdate` (MC-09, plan Active), `assertActivityEvaluationsOnPublish`, `assertNoActiveDependentsOnRevert`.
- **Rama `RT_PATTERN`**: enruta a `rtUpdateHandler` (via `withObjectAuth('modify', ...)`), que hace el bucket-split de los campos del RT pero **NO llama esos guards**.

Por lo tanto, **al agregar un objectType a `RT_PATTERN`** (ej. `(curricularsection)` → `(curricularsection|requirement)`), ese objectType **deja de pasar por la rama guardada** y se mueve a `rtUpdateHandler`. Los guards que antes lo cubrian se **pierden silenciosamente** salvo que se **re-cableen dentro de `rtUpdateHandler`** (o en un punto comun a ambas ramas). Todo cambio que amplie `RT_PATTERN` MUST incluir el recableo de los guards aplicables al nuevo objectType + un test que verifique que el guard sigue disparando por la rama rt.

## Why

Caso real (TICKET-101 / UPONE-1378, revision 2026-07-24): el editor de requisitos necesita habilitar el UPDATE de `rt__*__requirement`, lo que exige extender `RT_PATTERN`. Hoy `requirement` NO matchea el pattern → sus updates caen en la rama `!RT_PATTERN` y SI reciben `assertActivityNotInActivePlanOnUpdate` (MC-09). Al extender el pattern para habilitar el bucket-split del RT, `requirement` pasa a `rtUpdateHandler`, que no invoca MC-09 → se perderia el bloqueo de "no editar requisitos de una Activity en un Curriculum Active", una regla de negocio dura de SP5 (TICKET-089). Es una trampa no obvia: el cambio que habilita la feature (una linea de regex) desactiva un guard en otra rama. Analogo al bug de seguridad ya visto en este mismo resolver (el auth `withObjectAuth` que se bypassaba, fixed 2026-05-20).

## Where

- Resolver: `mods/curriculum-design/logic/polymorphicUpdate.resolver.js` — `RT_PATTERN` (`:199`), rama `!RT_PATTERN` con guards (`:671-681`), `rtUpdateHandler` / `getAuthorizedRtHandler` (rama rt).
- Guards de dominio: `mods/curriculum-design/logic/helpers/requirementActivityGuard.js` (`assertActivityNotInActivePlanOnUpdate`), `helpers/creditRange.js`, y los de UPONE-1381.
- Guard equivalente en create: `sectionValidation.resolver.js:142` (por si el objectType tambien crea por rt).

## When

Siempre que se modifique `RT_PATTERN` (agregar/quitar un objectType) o cuando un objectType migre entre la rama generic y la rama rt del `updateInstance` del mod. Checklist: enumerar los guards de la rama `!RT_PATTERN`, decidir cuales aplican al objectType migrado, y re-invocarlos dentro de `rtUpdateHandler` (o factorizarlos a un punto comun) + test que confirme que el guard dispara por la rama rt.

## Verification

Con `RT_PATTERN` extendido a incluir el nuevo objectType: un update que deberia ser bloqueado por el guard (ej. `updateInstance` de un `rt__RecordState__requirement` cuya Activity esta en un Curriculum `status=Active`) MUST seguir siendo rechazado con el error del guard (`REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN`). Un test de regresion de CurricularSection MUST seguir verde (codigo compartido). Empiricamente: correr el update guardado por ambas ramas y confirmar paridad de guards.

## Source

TICKET-101 (UPONE-1378), revision de factibilidad 2026-07-24 — hallazgo verificado por lectura de `polymorphicUpdate.resolver.js:671-681` durante design-feature. Deuda originada en `SPEC-curriculum-design-requirement-composite-tree` BL-1 (DEC-LOCAL-04): SP5 difirio el UPDATE de rt__requirement precisamente por el riesgo de tocar este resolver compartido. Se implementa y verifica en S1/S3 del spec `SPEC-curriculum-design-activity-requirements-section`.
