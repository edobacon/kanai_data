---
id: BUG-curriculum-design-005
project: up1
type: bug
module: curriculum-design
tags:
  - linaje
  - curriculum
  - guard
  - ui
  - customEndpoint
  - bypass
  - e2e-smoke
---

# Guard de linaje NO cubre el path UI (`createCurriculumWithRecordType` customEndpoint) — bypass E2E

## Symptom

Clonar un Curriculum/Plan con `code` duplicado via UI crea raiz duplicada en DB UPU; el guard de unicidad por linaje se bypaseo. Mismo path via MCP mutation `createInstance` no presenta el problema (guard activo).

## Expected behavior

Cualquier llamada que cree Curriculum (mutation GraphQL `createInstance` O mutation custom `createCurriculumWithRecordType` desde la UI) DEBE pasar por `validateCurriculumCreate`. El codigo duplicado en linaje debe ser bloqueado en AMBOS paths con el mismo error.

## Root cause

El guard solo reside en el override `sectionValidation.createInstance` que reemplaza al generico en el resolver map (`object-manager/graphql/resolvers.js`). El customEndpoint `createCurriculumWithRecordType` (TICKET-070) llama a `generic.createInstance` directamente (fn core importada via dynamic import), bypaseando el resolver map donde el override del mod se aplica. Resultado: la UI se salta el guard y crea la raiz duplicada. DEC-LOCAL-01 (guard solo en override) era insuficiente.

## Impact

Planes de estudio pueden tener 2+ raices con el mismo `code` (inst-UV, UV-ICIV-PLAN-2026, `previousVersionId = null`) en DB. Confunde UI, rompe linaje visible, dispara vista divergente. Regresion silenciosa de la garantia de unicidad por linaje.

## Reproduction

1. Clonar un Plan existente via UI con `code` duplicado esperado (mismo `code` que una raiz ya persistida).
2. El backend acepta la operacion y crea la segunda raiz.
3. DB UPU muestra 2 raices con `(id=inst-UV, code=UV-ICIV-PLAN-2026, previousVersionId=null)`.
4. Mismo path via MCP mutation `createInstance` (con `code` duplicado): rechazado por el guard (1 sola raiz).

## Workaround

Ninguno (la UI es la via principal). Los users deben usar MCP mientras se corrige, o ajustar el `code` antes de clonar.

## Solution

Fix propuesto: mover `validateCurriculumCreate` al helper `lineageUniqueness.js` (fuente unica) e invocarlo desde AMBOS resolvers: el override generico (`sectionValidation.createInstance`) Y el customEndpoint UI (`curriculum-create.resolver.js`, antes del `generic.createInstance`).

Aplicado durante TICKET-065 S5 (re-verificado por E2E). Confirmar que la fusion de paths no introduce regresiones en el caso normal (clone/version con `code` no duplicado).

## Related

- **Specs**: SPEC-curriculum-design-curriculum-clone-version
- **Tickets**: TICKET-065 (S5 re-fijado), TICKET-070 (origen del customEndpoint UI)
- **Learns**: ticket-065 L5 (raw -> refined)
- **DEC**: pendiente formalizar (DEC-LOCAL-01 resulto insuficiente)
