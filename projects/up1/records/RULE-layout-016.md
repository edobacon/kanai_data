---
id: RULE-layout-016
project: up1
type: rule
module: layout
tags:
  - recordlist
  - sort
  - layoutConfig
  - naming
---

# Default sort en RecordList se declara con `order: { field, direction }`, no `defaultSort`

## What

Al declarar el orden inicial de un layout `RecordList` en su JSON, usar:

```json
"layoutConfig": {
  "order": { "field": "name", "direction": "ASC" }
}
```

NO usar `defaultSort: { field, order }` — la propiedad existe en TypeScript types pero **no se consume en runtime**. La plataforma lee `layoutConfig.order` para construir la query GraphQL.

## Why

`defaultSort` es legacy: aparece en algunos types pero `RecordList.vue` siempre usa `layoutConfig.order` para el sort de query. Si se declara solo `defaultSort`, el listado se ordena por `createdAt` (fallback runtime) y el footer reporta "Ordenado por createdAt", confundiendo al usuario que esperaba el orden declarado.

Documentado en `up1/layout/docs/features/recordlist.md:121`:
> "The `table.defaultSort` property exists in TypeScript types but is not read at runtime (RecordList.vue uses layoutConfig.order at query time)."

## Where

- **Files**: `mods/*/config/layouts/*.json`, `up1/layout/config/defaults/default_*_list.json`
- **Layers**: config (layout JSON)

## When

Al declarar un layout `RecordList` que requiere orden inicial determinista.

## Verification

- Grep en layouts del mod por `"defaultSort"` — no debe aparecer.
- Validacion empirica: footer del listado dice "Ordenado por {field}" del `order.field` declarado, no por `createdAt`.
- Acepta `direction: "ASC" | "DESC"` (mayusculas o minusculas, runtime normaliza).

## Source

- **Discovered in**: TICKET-007, Session 1
- **Evidence**: `default_AcademicActivity_list.json` declarado con `defaultSort: { field: "name", order: "asc" }` ordenaba por `createdAt`. Cambio a `order: { field: "name", direction: "ASC" }` y el listado paso a ordenar alfabeticamente. Confirmado leyendo `up1/layout/docs/features/recordlist.md:121` y ejemplo `engagement-mis-eventos-list.json:71-74`.
- **Related**: RULE-layout-010 (naming convention default layouts)
