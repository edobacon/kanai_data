---
id: BUG-mods-009
project: up1
type: bug
module: mods
tags:
  - academic-scheduling
  - scenario-summary
  - data-integrity
---

# Indicador "sección asignada" contaba filas con las 3 FK en null como asignadas

## Symptom

El resumen de un `Scenario` mostraba escenarios sin ninguna asignación real como 100% completos:
secciones totales = secciones asignadas = secciones sin horario, sin sala y sin instructor a la vez.

## Root cause

- **File**: `mods/academic-scheduling/logic/schedule/summaryAggregates.js:21-33` (verificado).
- **Cause**: la regla v1 contaba "existe fila de `ScenarioSectionAssignment`" como sección asignada.
  Pero una fila de esa tabla es válida en el modelo con las tres dimensiones (instructor, sala,
  bloque) en null (solo `scenarioSectionId` y `assignedBy` son obligatorios), y el runner externo de
  asignación escribe exactamente esa fila cuando no logra asignar nada, dejando el motivo en
  `failureCode`.

## Fix

Nueva función `isAssigned(f)` (`summaryAggregates.js:32-34`): verdadero solo si al menos una dimensión
(`instr`, `room`, `block`) es no nula. Se agrega el export `ASSIGNS_ANY_DIMENSION_WHERE` como filtro
Prisma equivalente. Ver regla canónica [[RULE-mods-059]].

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios que revisan el resumen/dashboard de un escenario de scheduling |
| Data affected | ninguna (no corrompe datos, solo el cálculo del indicador mostrado) |
| Modules affected | academic-scheduling (resumen de escenario) |
| Frequency | siempre que el motor externo deja filas sin ninguna dimensión asignada |
