---
id: DECISION-031
project: up1
type: decision
module: mods
tags:
  - academic-scheduling
  - ruledefinition
  - algoritmo-de-asignacion
---

# Los parametros del algoritmo de asignacion pasan de hardcode a catalogo `RuleDefinition`

## Contexto

Los parametros que controlan el algoritmo de asignacion (Lambda externa) estaban hardcodeados: un unico set global de valores para toda la plataforma, sin forma de ajustarlos por escenario desde la UI.

## Decision

Los parametros se migran al catalogo `RuleDefinition` (`mods/academic-scheduling/objects/RuleDefinition.json`, `RuleSet.json`, `RuleSetRule.json`), editables por escenario desde el `RuleSetEditor`. Como parte de la migracion se reclasifica `PARTIAL_ASSIGNMENT_PRIORITY` de "codigo muerto" a parametro activo: estaba hardcodeado en el algoritmo pero nunca se exponia via RuleSet (nota de reclasificacion fechada 2026-08-12 en `mods/academic-scheduling/seed/config-rule-definitions.js:73`).

Criterio de cierre explicito: la migracion no se da por terminada solo con el catalogo poblado. Cada valor de `RuleDefinition` debe confirmarse contra el `PARAMETERS_DICT` real del algoritmo (que vive en el codigo de la Lambda, fuera de este repo) antes de cerrar el ticket, segun quedo documentado en el propio commit de la migracion.

## Alternativas descartadas

- **Un unico set global de parametros hardcodeado en el algoritmo**: es el comportamiento previo. Se descarta porque impide ajustar el comportamiento del algoritmo por escenario (ej. distinta prioridad de asignacion parcial para una sede vs otra) sin tocar codigo.

## Impacto y reversibilidad

Cambio de contrato: RBAC/config nuevo (el catalogo `RuleDefinition` se consume desde `RuleSetEditor`) y cambio en el payload del algoritmo (el parametro pasa de fijo a configurable por RuleSet). Afecta `mods/academic-scheduling/modsComponents/RuleSetEditor/ruleValue.ts` y los seeds de `RuleDefinition`. Reversible a nivel de codigo (volver al set global hardcodeado), pero un rollback perderia cualquier personalizacion por escenario que un tenant ya haya configurado via el editor. Verificacion del `PARAMETERS_DICT` real confirmada en commits posteriores (`e06e6bb`, `9dafe62`), fuera del alcance de este repo.
