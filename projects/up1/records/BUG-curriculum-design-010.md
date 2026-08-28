---
id: BUG-curriculum-design-010
project: up1
type: bug
module: curriculum-design
tags:
  - activity
  - enumengine
  - publishweight
  - i1
  - regression
  - gate-dropped
---

# Migracion de Activity al enum de core dropea el I1 publish-weight gate (T061) — regresion funcional silenciosa

## Symptom

Publicar un Course cuyo arbol de evaluacion no suma (EVALUATION_WEIGHT_MISMATCH) ya NO se bloquea al migrar Activity al enum engine de core.

## Expected behavior

El `from -> to Published` debe verificar `getInvalidEvaluationNodes` (query de `validateActivityEvaluations`) y bloquear si hay mismatch, igual que `transitionActivityValidated:176-188` antes.

## Root cause

`transitionActivityValidated:176-188` (gate I1) se reemplaza por `updateInstance` generico al migrar a core. El motor de enum (`enforceEnumTransitions`) solo hace `from/to` + `requiredCapabilities` + `onTransition` — sin hook para reglas de negocio por transicion. Reemplazar por `updateInstance` sin reubicar el gate = regresion funcional silenciosa.

## Impact

Cualquier Course con evaluacion desbalanceada puede pasar a Published, perdiendo la garantia de suma 100%. Cobertura del gate I1 movida a `tests/integration/activity-publish-weights.test.ts` pero el gate runtime quedaria debilisimo.

## Reproduction

Crear Course con evaluaciones que suman 90 (no 100). Publicar -> deberia fallar con EVALUATION_WEIGHT_MISMATCH; tras migracion, lo permite.

## Workaround

Hook pre-publicacion custom (no implementado; pendiente). Requiere una capa `transitionActivityValidated`-equivalente o un middleware previo a `enforceEnumTransitions`.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-curriculum-design-enum-transitions-migration
- **Tickets**: TICKET-103
