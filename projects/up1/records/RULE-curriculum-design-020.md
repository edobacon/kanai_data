---
id: RULE-curriculum-design-020
project: up1
type: rule
module: curriculum-design
tags:
  - i18n
  - lang
  - storybook
  - modsComponents
  - convention
---

# i18n de un componente del mod va anidado bajo su clave en es_CL.json, NO en un archivo es_CL@componente.json con claves planas

## What

Los strings i18n de un componente del mod (labels, placeholders, estados) van anidados bajo una clave del componente en `lang/es_CL.json` (ej. `colorPicker: { label, swatch: {...} }`, como `richTextRenderer`/`compositeSectionTree`). El componente referencia `$t('colorPicker.label')`. NO crear un archivo `es_CL@componente.json` con claves PLANAS a top-level.

## Why

El storybook preview hace `Object.assign(messages.es, content)` (merge FLAT) sobre TODOS los `es_CL*.json` del lang/. Un archivo `@componente.json` con claves planas (ej. `{ label, empty }`) las mete a top-level de messages.es → colisión entre componentes (dos `label` distintos se pisan). El anidamiento bajo la clave del componente evita la colisión y hace que `$t('comp.key')` resuelva. Los archivos `es_CL@Objeto.json` con claves planas SÍ existen pero son para LABELS DE COLUMNAS de objetos (otro consumidor), no para componentes.

## Where

mods/curriculum-design/lang/es_CL.json (componentes) vs lang/es_CL@<Objeto>.json (columnas de objetos).

## When

Al agregar i18n para un nuevo modsComponent. Verificar que la clave esté anidada en es_CL.json y que $t use el prefijo de la clave.

## Verification

Grep: las claves del componente están anidadas en es_CL.json bajo `<componentName>: {...}`. No existe `es_CL@<componentName>.json` con claves planas que colisionen.

## Source

- **Discovered in**: TICKET-094
