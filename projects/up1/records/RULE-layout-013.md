---
id: RULE-layout-013
project: up1
type: rule
module: layout
tags:
  - vueform
  - defineElement
  - inject
  - getCurrentInstance
  - parentContext
---

# inject() no funciona en defineElement() de Vueform — usar getCurrentInstance()

## What

`inject()` de Vue NO se ejecuta correctamente dentro del `setup()` de `defineElement()` de Vueform. Los valores inyectados siempre retornan el default (o undefined). Para acceder al contexto del componente padre (como `parentContext` provisto por `LayoutRecordDetail`), usar `getCurrentInstance()` y subir por `instance.parent` hasta encontrar el componente con la prop necesaria.

Patron correcto:
```js
import { getCurrentInstance } from 'vue'

function resolveInstanceIdFromParents() {
  const instance = getCurrentInstance()
  let curr = instance?.parent
  while (curr) {
    if (curr.props?.instanceId) return curr.props.instanceId
    curr = curr.parent
  }
  return ''
}
```

`LayoutRecordDetail` provee via `provide('parentContext', ...)` un objeto con `{ id, objectName, data, record }` — pero este solo es accesible desde componentes Vue estandar via `inject`, no desde Vueform elements.

## Why

`defineElement()` de Vueform tiene su propio ciclo de inicializacion que no respeta el timing de `inject()` de Vue. El `setup()` de un element se ejecuta en un contexto donde las inyecciones del arbol Vue no estan disponibles. Esto es una limitacion de la integracion Vueform + Vue 3.

## Where

- **Files**: `mods/*/modsComponents/*/Element.vue` (todo custom Vueform element que necesite datos del record padre)
- **Layers**: frontend (layout, suite)

## When

Cuando un Vueform custom element necesita acceder al ID del record actual (por ejemplo para hacer una query GraphQL con el ID como parametro). Tipicamente en tabs de RecordDetail donde el element necesita el `instanceId` del record que se esta viendo.

## Verification

- Grep por `inject(` en archivos que usen `defineElement` — si aparece, verificar que funciona en runtime
- Verificar que custom elements que necesitan contexto del record padre usen `getCurrentInstance()` en lugar de `inject()`

## Source

- **Discovered in**: TICKET-002, Session 1
- **Evidence**: TributationHeatmap con `inject('parentContext')` siempre retornaba `{}`. Fix: reemplazar por `getCurrentInstance()` subiendo el arbol Vue
- **Related**: RULE-layout-004 (defineElement + ElementLayout), L2 y L3 de TICKET-002
