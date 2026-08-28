---
id: BUG-layout-011
project: up1
type: bug
module: layout
tags:
  - layout
  - RecordList
  - defaultSort
  - searchPlaceholder
  - freshness
  - useDataFetching
---

# `defaultSort` y `searchPlaceholder` declarados pero ignorados; frescura de datos inventada

## Symptom

Dos defectos independientes en RecordList:

1. Los layouts declaraban `defaultSort` y `searchPlaceholder` en `layoutConfig`, pero RecordList los ignoraba por completo: el orden por defecto de la tabla y el placeholder del buscador no reflejaban lo configurado.
2. El texto "actualizado hace X" mostraba una frescura de datos que no correspondia a la ultima carga real.

## Expected behavior

RecordList deberia aplicar `defaultSort` y `searchPlaceholder` cuando el layout los declara, y el timestamp "actualizado hace X" deberia reflejar la ultima carga real de datos sin importar si esa carga vino de una busqueda.

## Root cause

File: `layout/src/layouts/RecordList/RecordList.vue`
Cause: (1) `defaultSort` y `searchPlaceholder` eran dos keys de contrato declaradas en 37 y 31 layouts respectivamente, pero muertas en el consumidor: RecordList nunca las leia. (2) El timestamp de frescura se actualizaba solo desde `useSearch`, en vez del punto que todo path de carga de datos atraviesa (`useDataFetching`); cualquier carga que no pasara por una busqueda dejaba el timestamp desactualizado, inventando una frescura que no reflejaba el ultimo fetch real.

## Fix

Commit `e1f4895b`: RecordList empieza a leer y aplicar `defaultSort` y `searchPlaceholder` del layout. Commit `26c26a8c`: el timestamp de "actualizado hace X" se mueve a `useDataFetching`, el punto comun de todo path de carga.

## Impact

| Area | Antes | Despues |
|---|---|---|
| `defaultSort` en 37 layouts | Declarado, ignorado | Aplicado como orden inicial de la tabla |
| `searchPlaceholder` en 31 layouts | Declarado, ignorado | Aplicado como placeholder del buscador |
| Timestamp "actualizado hace X" | Se actualizaba solo desde `useSearch`, frescura inventada en cargas que no pasaban por busqueda | Se actualiza desde `useDataFetching`, punto comun a todo path de carga |

## Reproduction

### Steps
1. Declarar `defaultSort` y `searchPlaceholder` en el `layoutConfig` de un RecordList.
2. Cargar el listado y verificar que el orden inicial y el placeholder del buscador no coinciden con lo declarado.
3. Cargar datos por un camino que no pase por `useSearch` (ej. paginacion) y verificar que el timestamp "actualizado hace X" no se actualiza.

## Related

- **Rules**: ninguna registrada
