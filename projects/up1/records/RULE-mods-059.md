---
id: RULE-mods-059
project: up1
type: rule
module: mods
tags:
  - academic-scheduling
  - scenario-summary
  - data-integrity
---

# Una sección de escenario está "asignada" si al menos una dimensión (instructor, sala o bloque) es no nula

## What

Al calcular indicadores de resumen de un `Scenario`, una fila de `ScenarioSectionAssignment` NO cuenta
como sección asignada solo por existir. Debe evaluarse con `isAssigned(f)`: verdadero si al menos una
de las tres dimensiones (`instr`, `room`, `block`) es no nula. Una fila con las tres dimensiones en
null es válida en el modelo (solo `scenarioSectionId` y `assignedBy` son obligatorios) y el runner
externo de asignación la escribe justamente cuando NO logra asignar, dejando el motivo en
`failureCode`.

## Why

La regla anterior contaba "existe fila" como asignada, por lo que un escenario donde el algoritmo
externo no asignó nada se mostraba en el resumen como 100% completo (secciones = asignadas = sin
horario/sala/instructor, al mismo tiempo). `isAssigned()` deriva de las mismas banderas por dimensión
que alimentan el cálculo de brechas, así que el conteo de "Asignadas" y el de "Qué falta asignar" no
pueden contradecirse entre sí. Enlaza [[BUG-mods-009]] (el bug de causa raíz que motivó esta regla).

## Where

- `mods/academic-scheduling/logic/schedule/summaryAggregates.js:21-33` (función `isAssigned`, export
  `ASSIGNS_ANY_DIMENSION_WHERE` como filtro Prisma equivalente para queries que no traen las filas).
- Cualquier resolver o agregado nuevo del mod que necesite calcular "sección asignada" debe reusar
  `isAssigned`/`ASSIGNS_ANY_DIMENSION_WHERE`, no reimplementar el chequeo con "existe fila".

## When

Al tocar `summaryAggregates.js`, el resumen de escenario (`docs/features/scenario-summary-tab.md`), o
cualquier nuevo agregado/indicador que cuente secciones asignadas dentro de academic-scheduling.
