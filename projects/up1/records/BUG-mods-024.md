---
id: BUG-mods-024
project: up1
type: bug
module: mods
tags:
  - academic-scheduling
  - heatmap
  - availability
  - orgunit
  - datetime
---

# El heatmap de ocupacion mezclaba datos de otros orgUnits y la disponibilidad declarada se comparaba sin normalizar formato de hora

## Symptom

El heatmap de ocupacion del resumen del escenario mostraba porcentajes calculados con datos de salas
de OTRAS unidades organizacionales, no solo las que el escenario podia usar. Por separado, toda sala
con disponibilidad declarada aparecia "fuera de disponibilidad" en TODOS los bloques, tanto en el
panel de salas como en el de horario.

## Expected behavior

El heatmap de ocupacion deberia calcular el denominador solo con las salas del subarbol organizacional del escenario. La comparacion de disponibilidad declarada deberia normalizar el formato de hora entre `DateTime` y `String` antes de evaluar si un bloque cae dentro de la ventana.

## Root cause

File: `mods/academic-scheduling/logic/schedule/blockOccupancy.js`

Cause 1 (scoping): el denominador de salas del heatmap se calculaba contra todas las salas Active de
la institucion, sin acotar al subarbol de la unidad organizacional (`Scenario.orgUnitId`) del
escenario. Fix: `resolveOrgUnitSubtree` (linea 142) recorre por BFS sobre `parentId` el subarbol
completo (el escenario referencia tipicamente la raiz, campus, y las salas cuelgan varios niveles
abajo); `countRoomsForScenario` (linea 167) cuenta solo las salas de ese subarbol. Un escenario sin
`orgUnitId` sigue contando el tenant completo (comportamiento previo a la acotacion).

File: `mods/academic-scheduling/logic/schedule/evalResource.js`

Cause 2 (formato de hora): `Availability.startTime`/`endTime` son columnas `DateTime` (Prisma las
devuelve como `Date`), mientras `TimeBlock` guarda sus horarios como `String` `"HH:MM"`. La funcion
`toMin` solo aceptaba texto y devolvia 0 para cualquier otro tipo, asi que toda ventana de
disponibilidad declarada colapsaba a `0..0` y ningun bloque quedaba nunca dentro de ella. Fix:
`windowTime` (linea 40), usado desde `getResourceAvailability` (linea 243), normaliza a `"HH:MM"`
leyendo el `Date` en UTC (el valor se persiste tal cual se escribe: `"08:00"` queda
`1970-01-01T08:00:00.000Z`; leerlo con getters locales lo desplazaria segun la zona horaria del
proceso). Una ventana con hora ilegible se descarta con warning en vez de colapsar a 0.

## Fix

`resolveOrgUnitSubtree` + `countRoomsForScenario` acotan el denominador del heatmap al subarbol
organizacional del escenario. `windowTime` normaliza `DateTime` a `"HH:MM"` en UTC antes de comparar
con los horarios string de `TimeBlock`. Ademas se agrega refresco de los paneles de resumen y
calendario tras una asignacion nueva (antes quedaban con datos obsoletos hasta recargar la pagina).

## Impact

| Area | Antes | Despues |
|---|---|---|
| Heatmap de ocupacion | Denominador mezclaba salas de toda la institucion | Denominador acotado al subarbol organizacional del escenario |
| Disponibilidad declarada | Toda sala con disponibilidad aparecia "fuera de disponibilidad" siempre | Comparacion correcta tras normalizar `DateTime` a `"HH:MM"` en UTC |
| Refresco de UI | Paneles quedaban desactualizados tras asignar | Se refrescan automaticamente tras la asignacion |

## Reproduction

### Steps
1. Crear un escenario con `orgUnitId` acotado a una sede especifica.
2. Abrir el heatmap de ocupacion del resumen del escenario y verificar que el porcentaje se calcula con salas de otras sedes.
3. Declarar disponibilidad horaria en una sala y verificar que aparece "fuera de disponibilidad" en todos los bloques, tanto en el panel de salas como en el de horario.
