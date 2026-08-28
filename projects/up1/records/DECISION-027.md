---
id: DECISION-027
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - mod
  - layout
  - conditions
  - progression
  - plan-modular
  - periodType
---

# DECISION-027: `periodType` es cadencia de inscripcion/oferta, no estructura de la malla — visible en todo Plan

## Contexto

En el fix de visibilidad de campos del Plan de estudio (UPONE-1538 / TICKET-119) quedo una decision abierta: si `periodType` ("Tipo de periodo") debe condicionarse a `progression==Sequential` (escenario A, mismo tratamiento que `totalPeriods`) o conservarse en todo Plan sin importar la progresion (escenario B).

El resto del fix ya estaba resuelto: `totalPeriods` se muestra solo con progresion Secuencial (un plan Modular no fija un total de periodos porque la progresion depende de la inscripcion del estudiante); `totalCredits` permanece visible con cualquier progresion.

## Decision

Se elige el **escenario B**: `periodType` se conserva visible en todo Plan (`Curriculum` tipo `Plan`), con cualquier valor de `progression`, incluido Modular.

Razon (Esteban): la inscripcion y la oferta **siempre** ocurren en un periodo academico, exista o no una secuencia fija de periodos. `periodType` no describe la estructura de la malla (como si lo hace `totalPeriods`), sino la **cadencia de inscripcion/oferta**, y esa cadencia aplica tambien al plan Modular.

Consecuencia tecnica: `periodType` **no cambia** — mantiene su condicion actual `[["recordType","==","Plan"]]` en los 3 layouts. El unico delta del ticket es la clausula `progression==Sequential` en `totalPeriods`. `periodType` queda con el mismo tratamiento que `totalCredits` (dato general del Plan, independiente de la progresion).

## Alternativas descartadas

- **Escenario A — condicionar `periodType` a `progression==Sequential`**: descartada. Trataba `periodType` como estructura de la malla (equivalente a `totalPeriods`), lo que ocultaria el campo en planes Modulares. Contradice que la inscripcion/oferta de un plan Modular tambien ocurre en un tipo de periodo definido; dejaria al plan Modular sin la cadencia de inscripcion.

## Impacto / reversibilidad

Impacto: nulo en modelo/backend; solo define el estado final de una condicion de visibilidad en 3 JSON de layout del mod `curriculum-design`. Reversibilidad: alta — el delta A↔B es la presencia o ausencia de la clausula `["progression","==","Sequential"]` en la condicion de `periodType`. Volver a A seria agregar esa clausula en los 3 layouts.

Alcance: no afecta los valores del catalogo de `periodType` (`[Semester, Trimester, Quarter, Annual]`), que siguen con su `[NEEDS CLARIFICATION]` heredado de SP5 — esta decision es de visibilidad, no de valores.
