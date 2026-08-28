---
id: RULE-mods-012
project: up1
type: rule
module: mods
tags:
  - vueform
  - defineElement
  - custom-element
  - pattern
---

# Custom Vueform elements: defineElement + registro automatico

## What

Los custom elements para Vueform en mods deben usar defineElement() de @vueform/vueform, NO defineComponent() de Vue. El name del componente (ej: 'CompetencyTreeElement') se convierte automaticamente al type del schema en kebab-case sin sufijo 'Element' (ej: 'competency-tree'). El registro es automatico: suite/vueform.config.ts usa import.meta.glob('../layout/src/modsComponents/*/*.vue') que detecta todos los .vue en subcarpetas de modsComponents sin necesidad de editar el config.

## Why

Vueform tiene su propio sistema de registro de elementos. defineComponent() no lo registra. El glob es estatico en build time — no requiere configuracion manual pero si requiere restart del dev server para detectar componentes nuevos.

## Where

mods/{mod}/modsComponents/{ComponentName}/{ComponentName}Element.vue

## When

Al crear un custom element Vueform en un mod (ej: arbol, heatmap, botones de workflow)

## Verification

El type aparece en el schema del layout JSON y el componente renderiza en RecordDetail

## Source

- **Discovered in**: TICKET-005
