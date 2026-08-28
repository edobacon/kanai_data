---
id: BUG-mods-011
project: up1
type: bug
module: mods
tags:
  - academic-scheduling
  - conflict-detail
  - forced-codes
---

# Forced timeblock codes se persistían en la fila equivocada al reasignar

## Symptom

Al reasignar un bloque horario en conflicto, los códigos de "forzado" (`forcedCode`) quedaban
persistidos en la propia fila que originó la reasignación en vez de en la fila del actor
(instructor/sala) que efectivamente queda en conflicto.

## Root cause

- **File**: `mods/academic-scheduling/logic/assign-instructor.resolver.js`,
  `mods/academic-scheduling/logic/assign-resource.resolver.js`,
  `mods/academic-scheduling/logic/assign-timeblock.resolver.js`,
  `mods/academic-scheduling/logic/schedule/conflictDetail.js` (sin línea exacta verificada, ver
  reporte de recon).
- **Cause**: primera iteración del fix agrupó tarjetas de conflicto similares y limpió códigos
  forzados obsoletos al reasignar, pero seguía escribiendo el código en la fila propia; la corrección
  final mueve la escritura a la fila del actor en conflicto.

## Fix

Se persisten los forced timeblock codes en la fila del actor en conflicto (instructor o sala), no en
la fila que dispara la reasignación. Complementa la agrupación de tarjetas de conflicto similares.

## Otros sintomas del mismo ticket (mismo archivo, commits posteriores)

Verificados contra el repo real; son fixes distintos dentro de UPONE-1397, sobre el mismo
`conflictDetail.js`, y no estaban cubiertos por el sintoma de arriba.

**Se reportaba el bloque en conflicto de la OTRA seccion (commit `4da80a5`)**

- Root cause: una sección puede tener distinto instructor por bloque. La detección de conflictos
  comparaba el horario ocupado del instructor contra `getSectionModules`, que es agnóstico del
  instructor, así que el bloque de OTRO instructor en la misma sección se reportaba como choque; y el
  item de conflicto mostraba el bloque de la sección CONTRARIA en vez del bloque propio en conflicto.
- Fix: `instructorSignal` (`logic/schedule/conflictDetail.js`) rutea según la forma de la asignación:
  filas por-bloque van a `evalInstructorBlocks` con los bloques de ESE instructor; una fila a nivel de
  sección mantiene `evalInstructor` con el horario completo (misma ruta que ya usaba el guardado
  por-bloque). El item pasa a reportar el bloque en conflicto de la sección ACTUAL.

**La bandera `hasConflict` no se recalculaba para la sección contraparte (commit `aeaa319`)**

- Root cause: un conflicto en vivo es relacional (la sala se comparte CON otra sección, el instructor
  choca CON otra sección), pero las mutaciones de asignación solo recomputaban `hasConflict` de la
  sección tocada. Resolver un lado dejaba la bandera de la contraparte en `true` para siempre
  (persistía tras un reload); la stat-card, que lee la bandera, bajaba 1 mientras la lista filtrada,
  que evalúa en vivo, bajaba 2.
- Fix: las mutaciones de asignación (`logic/assign-instructor.resolver.js`,
  `assign-resource.resolver.js`, `assign-timeblock.resolver.js`) toman snapshot de las secciones
  contraparte antes de mutar y recomputan la sección tocada más las contrapartes de antes y después
  del cambio (dos o tres secciones por guardado, no todo el escenario).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios que resuelven conflictos de asignación en el panel de conflictos |
| Data affected | `ScenarioSectionAssignment.failureCode`/forced codes en filas equivocadas; `ScenarioSection.hasConflict` desactualizado en la contraparte |
| Modules affected | academic-scheduling (resolvers de asignación + `logic/schedule/conflictDetail.js` + `ConflictDetailPanelElement.vue`) |
| Frequency | al reasignar un bloque horario con conflicto detectado, y al resolver un conflicto relacional (sala/instructor compartido con otra sección) |
