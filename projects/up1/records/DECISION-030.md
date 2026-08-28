---
id: DECISION-030
project: up1
type: decision
module: mods
tags:
  - academic-scheduling
  - scenario
  - modelo-de-datos
---

# `Scenario.termId` escalar se retira en favor de `ScenarioTerm` N:M

## Contexto

Un `Scenario` de academic-scheduling solo podia cubrir un unico periodo (`Term`), modelado como escalar `termId`. La necesidad real es que un escenario cubra varios periodos a la vez (ej. planificar dos semestres en un mismo ejercicio de asignacion).

## Decision

Se elimina el escalar `Scenario.termId` y se modela la relacion como N:M mediante el objeto nuevo `ScenarioTerm` (`mods/academic-scheduling/objects/ScenarioTerm.json`), con `uniqueConstraint scenarioId+termId`. El objeto `Scenario` (`mods/academic-scheduling/objects/Scenario.json`) queda sin `termId`, solo con `name`/`status`/`orgUnitId`/`shiftId`/`ruleSetId`. Se agrega un selector custom `TermMultiSelect` porque el mecanismo generico de opciones FK de RecordDetail no puede ser a la vez campo virtual (no-FK) y multi-select.

Auditoria de reemplazo: todo lo que dependia del escalar `termId` se migro al modelo N:M en los mismos commits: seeds (`2a9c2b4`) y frontend/resolvers de creacion de escenario (`b5d637c`). El merge de sync es append-only por diseño (nunca remueve campos que un mod deja de declarar), asi que retirar `termId` del lado sincronizado a `object-manager` requirio borrar manualmente el `objects/business/Base/scenario.json` fusionado una vez, para que `sync:files` lo regenerara limpio desde la fuente actual del mod.

## Alternativas descartadas

- **Mantener `termId` y crear un escenario por periodo**: evita el modelo N:M, pero obliga a duplicar toda la configuracion de un escenario (rule set, secciones candidatas, asignaciones) por cada periodo que se quiera cubrir simultaneamente, en vez de planificarlos juntos.

## Impacto y reversibilidad

Cambio de contrato de objeto: cualquier consumidor que leyera `Scenario.termId` directo se rompe (columna eliminada). Afecta resolvers de creacion (`logic/scenario-create.resolver.js`), el resolver nuevo `scenarioCandidateSections`, y los layouts `scenario-create.json`/`scenario-list.json`. Reversible a nivel de schema, pero requeriria recrear el escalar y migrar de vuelta los datos ya modelados como N:M (perdida de informacion si un escenario ya cubre mas de un periodo).
