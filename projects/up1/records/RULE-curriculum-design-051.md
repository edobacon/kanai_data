---
id: RULE-curriculum-design-051
project: up1
type: rule
module: curriculum-design
tags:
  - recordlist
  - columnas-relacion
  - dot-path
  - opt-in
  - relations
  - proyeccion
---

# Una columna de un objeto relacionado en un RecordList se declara con `relations` + columna dot-path, y es opt-in por `visible: true`

## What

Para mostrar en un RecordList una columna que pertenece a un objeto RELACIONADO (proyección a-uno), SHOULD declararse:

1. `relations: ["<rel>"]` a nivel del layout (esto trae el dato de la relación), y
2. una columna con key dot-path: `{ "key": "<rel>.<campo>", "visible": true }`.

Es OPT-IN: sin `visible: true` la columna dot-path NO renderiza. Esta es la diferencia con las columnas de campos propios (que renderizan salvo `visible: false`).

## Why

El motor SÍ soporta columnas de proyección de relación (dot-path); no es una falta de capacidad de core, es un comportamiento opt-in. El mecanismo:

- `layout/src/composables/useColumnConfiguration.ts` — `relationColumnFields` (~108-125) detecta la columna sintética dot-path; el gate (~219) exige `col.visible === true` para las columnas de relación (`visible: relationColumnKeys.has(col.key) ? col.visible === true : col.visible !== false`).
- `layout/src/composables/recordListFormatters.ts` — `getDisplayValue` camina el dot-path para obtener el valor.
- `layout/src/composables/useDataFetching.ts` (~157) — deriva `includeRelations: true` a partir de `relations`, así que basta declarar `relations` para que el dato llegue.

La capacidad existe desde el commit `4b9bf665` ("feat(recordlist): support opt-in to-one relation columns", mergeado el 2026-08-12). Antes de asumir que "el RecordList no soporta columnas de relación", verificar este mecanismo: la ausencia de la columna casi siempre es falta de `visible: true`, no falta de soporte.

> Nota de atribución: la rama del merge de esa capacidad se llamó `feat/UPONE-1503`, pero en Jira UPONE-1503 es otro tema (roles / permisos). No citar UPONE-1503 como el ticket de esta capacidad.

## Where

- `layout/src/composables/useColumnConfiguration.ts`, `recordListFormatters.ts`, `useDataFetching.ts`.
- Cualquier RecordList (embebido o standalone) que muestre atributos de una relación a-uno, p.ej. columnas de un satélite RecordType.
- Precedente: el `section-list` de academic-scheduling declara columnas de relación con el mismo patrón.

## When

Al necesitar columnas de un objeto relacionado en una tabla RecordList. Al depurar por qué una columna dot-path "no aparece": comprobar que la columna tenga `visible: true` y que el layout declare `relations` con la relación correspondiente, antes de concluir que falta capacidad de core.

## Verification

- Grep del layout: la columna dot-path `<rel>.<campo>` declara `visible: true` y el layout declara `relations: ["<rel>"]`.
- Runtime: la columna renderiza el valor del objeto relacionado por fila.

## Source

- Descubierto en UPONE-1619 (Jira): al `piezasList` (view + edit) se le agregó `visible: true` a las 4 columnas dot-path (Tipo / Horas semanales / Tamaño de grupo / Docentes) y renderizaron con sus valores por pieza (verificado en runtime). Cambio mod-only, no core.
