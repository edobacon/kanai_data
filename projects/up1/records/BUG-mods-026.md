---
id: BUG-mods-026
project: up1
type: bug
module: mods
tags:
  - curriculum-mapping
  - catalog
  - lifecycle
  - isActive
---

# Inactivar un LevelScheme o CoverageScheme dejaba sus niveles hijos activos

## Symptom

Al inactivar un LevelScheme o un CoverageScheme desde el toggle de fila, sus niveles hijos quedaban
con `isActive: true`, generando datos incoherentes: niveles "vigentes" bajo un esquema retirado.

## Expected behavior

Inactivar un LevelScheme o CoverageScheme deberia propagar `isActive: false` a todos sus niveles hijos, y un nivel nuevo agregado a un esquema ya inactivo deberia nacer `isActive: false`, para evitar datos incoherentes.

## Root cause

File: `mods/curriculum-mapping/logic/helpers/compositeCatalog.js`

Cause: un nivel no tiene ciclo de vida propio en el modelo de datos (su estado deberia seguir al de
su esquema padre), pero al crearse nace `isActive: true` por el `static_default` de la tabla base, y
el toggle del padre no propagaba ese cambio a los hijos existentes.

## Fix

Se agrega `setChildrenActive` (`logic/helpers/compositeCatalog.js:163-183`) al motor de catalogo
comun (`createCatalogEngine`), que propaga el `isActive` del padre a TODOS sus hijos en una sola
query (`updateMany`, costo constante, no una escritura por fila). Se invoca en dos puntos: el toggle
de activar/inactivar de fila, y el upsert cuando se agrega un nivel nuevo a un esquema ya inactivo (el
nivel nuevo nace `true` y hay que sellarlo de inmediato). El llamador corre `setChildrenActive` DENTRO
de la misma transaccion que actualiza el padre, asi que padre e hijos cambian juntos o no cambia
nada. No se audita hijo por hijo a proposito: el estado de un hijo es el de su padre, y N entradas
identicas en el historial serian ruido sobre la entrada del header que ya lo documenta.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Toggle de isActive | Solo afectaba al header (LevelScheme/CoverageScheme) | Propaga a todos los niveles hijos en la misma transaccion |
| Nivel nuevo en esquema inactivo | Nacia `isActive: true` pese al padre inactivo | Se sella `false` en el mismo upsert |
| Auditoria | N/A | Se registra el cambio del padre; los hijos no generan entradas redundantes |

## Reproduction

### Steps
1. Crear un `LevelScheme` con niveles hijos activos.
2. Inactivar el `LevelScheme` desde el toggle de fila.
3. Verificar que los niveles hijos siguen con `isActive: true`.
4. Agregar un nivel nuevo a un esquema ya inactivo y verificar que nace `isActive: true`.
