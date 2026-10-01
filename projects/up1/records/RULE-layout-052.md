---
id: RULE-layout-052
project: up1
type: rule
module: layout
level: must
tags:
  - UPONE-1967
  - relationDisplayFields
  - filtros
  - RecordList
  - kn-dredd
---

# `relationDisplayFields` también gobierna el filtro del usuario: su valor debe ser una columna real del objeto destino

## What

`layoutConfig.relationDisplayFields` no solo decide el texto de la celda de una FK en un RecordList. El servidor también lo usa para filtrar: cuando el usuario filtra por esa columna, `instance.resolver.js` reescribe el filtro sobre la FK a `<relación>.<displayField>` para comparar contra el valor legible y no contra el id. Si el valor declarado no es una propiedad del objeto referenciado (por ejemplo, un campo sintético que agrega a la fila un helper del mod, como `label`), mostrar funciona pero filtrar rompe el listado.

`columns[].filterable: false` no lo evita: el modal de filtros no lee esa propiedad (`useColumnConfiguration.ts` solo la copia) y ofrece todas las columnas declaradas (ver RULE-layout-037).

## Why

En UPONE-1967 (PR #68 de curriculum-design) el layout de la pestaña "Planes de estudio" declaró `relationDisplayFields.Curriculum = "label"`, un campo que solo existe en la fila que arma `planEntryPlacements.js`. La celda se veía bien, pero filtrar por "Plan de estudios" llevaba el filtro a `plan.label`, que no es columna de Curriculum. El intento de arreglo con `filterable: false` no tuvo efecto. La solución fue usar `name` (columna real) y un test que verifica que el display field existe en el objeto. kn-dredd lo dejó pasar en la ronda 1 porque la doc del core describe `relationDisplayFields` solo como etiqueta de visualización.

## Where

- `object-manager/src/graphql/resolvers/instance.resolver.js:2439-2475`: reescritura del filtro de una FK por `relationDisplayFields` (o por el `idColumn` del objeto destino si el layout no declara nada).
- `layout/src/composables/useColumnConfiguration.ts:214`: `filterable` se copia y ningún componente lo lee.
- `layout/docs/features/recordlist.md:106` y `:166`: la doc describe `relationDisplayFields` solo como etiqueta y `filterable` como si habilitara el filtro.
- Ejemplo corregido: `mods/curriculum-design/config/layouts/default_Activity_view.json` (pestaña "Planes de estudio") y `tests/integration/activity-view-plans-tab.test.ts`.

## When

Al declarar o cambiar una entrada de `relationDisplayFields` en cualquier layout de RecordList, y al revisar un PR que lo haga.

## Verification

1. Para cada entrada `<clave>: <valor>` de `relationDisplayFields`, resolver el objeto destino (la clave es el campo FK, el nombre de la relación o el objeto referenciado) y confirmar que cada valor existe en `properties` del objeto destino o de su objeto base si es un record type (`rt__<Tipo>__<Base>`).
2. Si se quiere mostrar un texto armado (código + nombre + estado), usar un campo real o el `idColumn` del objeto, no un campo sintético del helper.
3. Un test del mod que lea el objeto destino y verifique que el display field es una de sus propiedades.

## Source

- **Discovered in**: UPONE-1967, PR #68 de curriculum-design (ronda 3 de kn-dredd; escape de la ronda 1).
- **Related**: RULE-layout-033 (relationDisplayFields para mostrar), RULE-layout-037 (el modal de filtros toma las columnas), RULE-layout-fk-idcolumn-fallback-UPONE-1750 (idColumn como default).
