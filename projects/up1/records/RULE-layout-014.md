---
id: RULE-layout-014
project: up1
type: rule
module: layout
tags:
  - vueform
  - defineElement
  - instanceId
  - DOM
  - workaround
  - RecordDetail
---

# defineElement rompe cadena Vue parents — usar DOM walk para instanceId

## What

Dentro de un custom Vueform element (defineElement), getCurrentInstance().parent no llega hasta LayoutRecordDetail — la cadena se corta en los wrappers internos de Vueform (ElementLayout → FormElements → Vueform). El instanceId del registro (disponible en LayoutRecordDetail.props.instanceId) no es accesible via la cadena de componentes Vue. Workaround: caminar el DOM hacia arriba desde el $el del componente buscando __vueParentComponent.props.instanceId. Ademas, form$.data contiene los campos del layout schema (util para leer status, name, etc.) pero NO incluye id ni publicId del registro.

## Why

defineElement() de Vueform crea una cadena de componentes interna que no expone los props del LayoutRecordDetail padre al componente hijo via getCurrentInstance().parent.

## Where

Cualquier custom Vueform element que necesite el ID del registro padre en un RecordDetail

## When

Al implementar custom elements que ejecutan mutations o queries que necesitan el ID del registro

## Verification

El custom element obtiene el instanceId correctamente y puede ejecutar mutations contra el registro

## Source

- **Discovered in**: TICKET-005
