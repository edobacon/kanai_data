---
id: RULE-layout-050
project: up1
type: rule
module: layout
tags:
  - recordlist
  - layoutselector
  - embedded
  - parentid
  - uengagement
---

# Una lista embebida filtrada por `{{parentId}}` declara `showLayoutSelector: false`

## What

Si un layout de RecordList existe solo para vivir embebido y sus filtros usan el
placeholder `{{parentId}}`, declara `showLayoutSelector: false` en su
configuracion. Sin el flag, el selector de layouts queda visible y ofrece al
usuario saltar a otros layouts del mismo objeto, incluidos los que solo tienen
sentido embebidos.

## Why

El selector se renderiza en
`src/layouts/RecordList/RecordList.vue:21-37` bajo la condicion
`v-if unifiedConfig.showLayoutSelector !== false`, y lista
`translatedAvailableLayouts`, es decir los otros layouts del mismo objeto, con
`@layout-changed="handleLayoutChange"`. O sea: el default es mostrarlo, y hay que
apagarlo explicitamente.

El patron ya esta aplicado en tres layouts del mod uengagement:

- `mods/uengagement-up1/config/layouts/engagement_Event_admin_list.json:22`
- `mods/uengagement-up1/config/layouts/engagement_Event_responsible_list.json:49`
- `mods/uengagement-up1/config/layouts/engagement_Event_view.json:146`

**No verificado**: la justificacion original (commit `4ab5f54`, 2026-08-13) dice
que estos layouts "break when opened standalone" porque filtran por
`{{parentId}}`. Esa afirmacion es del autor del commit y **no se rastreo hasta el
punto de falla en el codigo**: no se siguio el flujo de resolucion del
placeholder `{{parentId}}` cuando el layout se navega fuera del contexto
embebido, asi que no se sabe si el sintoma es una query vacia, un filtro sin
resolver o una excepcion. Lo verificado es el contrato (el flag existe, se
consume donde se indica y se usa en esos tres layouts), no el mecanismo de la
ruptura.

## Where

Cualquier layout de RecordList del mod pensado para uso embebido, tipicamente los
que aparecen como tab o lista anidada dentro de un RecordDetail y filtran por el
id del padre.

## When

Al crear un layout de lista que solo tiene sentido dentro de otro registro. Si
mas adelante alguien necesita el detalle del mecanismo de la ruptura para decidir
si conviene un fix en core en vez de un flag por layout, hay que seguir el trace
del placeholder primero: hoy ese dato no esta confirmado.
