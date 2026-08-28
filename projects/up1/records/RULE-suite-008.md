---
id: RULE-suite-008
project: up1
type: rule
module: suite
tags:
  - navigation
  - breadcrumbs
  - routing
---

# Un layout fuera del menu declara `breadcrumbParent`; el trail reconstruye la cadena y corta ciclos

## What

Un layout alcanzable fuera del menu (por ejemplo, un boton en vez de un item de nav) declara `breadcrumbParent`, que apunta a otro layout (`layoutName`) o a una seccion de nav (`objectName`). `buildBreadcrumbTrail` camina esa cadena de padres, empujando un paso por cada pantalla intermedia, hasta llegar a una seccion del menu o agotar la cadena. El caminado se detiene si un padre ya fue visitado, evitando ciclos infinitos. Ademas, `navigate-to-relation` ya no exige `targetId`: un destino sin registro puntual (hub) omite el segmento de instancia en la URL generada.

## Why

Antes, el grupo de nav del trail se derivaba solo de la ruta activa (`object_name`/`layout_id`). Una pantalla alcanzada por boton, sin grupo propio en el menu, no encontraba coincidencia y el trail colapsaba a solo `App`, perdiendo tanto el camino recorrido como el enlace de retroceso. `breadcrumbParent` resuelve esto declarando explicitamente el padre logico de la pantalla.

`navigate-to-relation` asumia siempre un `targetId` en el payload del evento; un destino tipo hub (una lista o vista sin instancia especifica) no podia expresarse. El segmento de id ahora es opcional en la unica pagina que maneja el evento.

## Source_ref

- `composables/breadcrumbTrail.ts:47-57` (interfaces `TrailParentRef` y `TrailLayoutRef`, con el campo `breadcrumbParent`)
- `composables/breadcrumbTrail.ts:175-202` (loop de ancestros: `visited` seedeado con la pantalla actual para no contar un layout que se declara su propio padre, `while (cursor?.breadcrumbParent)` corta si `parent.layoutName` ya esta en `visited`)
- `pages/[tenant_id]/[object_name]/[view_type]/index.vue:143-145` (`targetId` opcional: `${targetId ? \`/${targetId}\` : ''}`)

## Where

- `suite/composables/breadcrumbTrail.ts`
- `suite/pages/[tenant_id]/[object_name]/[view_type]/index.vue`
- Cualquier `layoutConfig` de un layout que se abra fuera del menu (via boton, accion de fila, etc.)

## When

Antes de publicar un layout que se navega solo por boton o accion (no por item de menu): declarar `breadcrumbParent` en su configuracion, apuntando al layout o seccion de nav de donde logicamente cuelga. Sin esa key, el breadcrumb del usuario colapsa a la app y pierde el camino de vuelta.
