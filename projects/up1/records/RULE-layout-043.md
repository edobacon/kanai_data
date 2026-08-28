---
id: RULE-layout-043
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordDetail
  - Vueform
  - JSON_STRING_TRANSPORT_TYPES
  - json-schema-editor
  - tipos-custom
---

# Tipos custom con valor objeto se registran en JSON_STRING_TRANSPORT_TYPES

## What

Un tipo de campo custom cuyo valor es un objeto anidado (no un primitivo) debe agregarse al set `JSON_STRING_TRANSPORT_TYPES` en `RecordDetail.vue` para que el valor se transporte serializado como string. Sin este registro, Vueform colapsa el objeto anidado al construir/leer el form data.

## Why

El tipo `json-schema-editor` (UPONE-1290) maneja un objeto anidado (`properties.jsonSchema`) que Vueform no puede transportar tal cual sin perder estructura. Registrarlo en `JSON_STRING_TRANSPORT_TYPES` establece el patrón a seguir para cualquier futuro editor de valor-objeto (ej. otro editor visual anidado), evitando que cada uno reinvente su propia serialización ad hoc.

## Where

- `layout/src/layouts/RecordDetail.vue:2553-2562` (`JSON_STRING_TRANSPORT_TYPES`, incluye `'json-schema-editor'`).
- `layout/src/layouts/RecordDetail.vue:2566` y `:2702` (chequeo `JSON_STRING_TRANSPORT_TYPES.has(type)` al procesar el schema).

## When

Al agregar un nuevo tipo de campo custom cuyo valor interno sea un objeto (no string/number/boolean/array simple), verificar primero si `JSON_STRING_TRANSPORT_TYPES` ya resuelve el transporte antes de escribir lógica de serialización propia.

## Source

- **Discovered in**: UPONE-1290
