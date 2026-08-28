---
id: BUG-mods-010
project: up1
type: bug
module: mods
tags:
  - academic-scheduling
  - layout
  - fk-column
---

# Columna FK con key mal formada en la lista de tipos de recurso caía silenciosamente a auto-columnas

## Symptom

La columna que debía mostrar `resourcetype.name` en la lista embebida de tipos de recurso de
`Resource` nunca resolvía el nombre esperado; el layout caía sin error visible a una auto-columna
redundante en su lugar.

## Root cause

- **File**: `mods/academic-scheduling/config/layouts/resource-resourcetypes-list.json` (sin verificar
  línea exacta, ver reporte de recon).
- **Cause**: la key de la columna FK estaba mal formada (`resourcetype.name` no calzaba con la
  convención de resolución de campos FK del layout engine), y el motor de columnas hace fallback
  silencioso a auto-columnas cuando una key declarada no resuelve, en vez de fallar visiblemente.

## Fix

Corrección de la key de columna FK en `resource-resourcetypes-list.json`, dentro del mismo cambio que
unifica la pestaña "Tipos de recurso" como lista embebida con `canCreateAction` filtrado por
`HAS_NONE` (no repetir tipos ya asignados).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios que ven la lista de tipos de recurso asociados a un Resource |
| Data affected | ninguna, solo presentación (columna incorrecta en UI) |
| Modules affected | academic-scheduling (layout de Resource) |
| Frequency | siempre que se abría esa lista embebida antes del fix |

## Nota

Patrón reutilizable: cualquier layout con columna FK cuya key no siga la convención de resolución cae
silenciosamente a auto-columnas sin error visible. Vale la pena auditar otros layouts del mod con el
mismo patrón de key.
