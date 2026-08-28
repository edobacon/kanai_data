---
id: RULE-layout-049
project: up1
type: rule
module: layout
tags:
  - layout
  - i18n
  - Tag
  - prefill
  - picker
  - convencion
---

# La i18n de un contrato JSON nuevo se declara con el sufijo `*Tag`

## What

Cuando un contrato JSON nuevo necesita texto traducible que no pasa por el mecanismo estandar de columnas/campos (`column.{key}`), la convencion establecida es declarar la key de traduccion con el sufijo `Tag`: `labelTag`, `placeholderTag`, `descriptionTag`, siguiendo el mismo patron que ya usaban `titleTag`/`buttonLabelTag`. Si la key declarada no existe en el idioma activo, el literal original queda intacto (retrocompatible, no rompe si falta la traduccion).

## Why

El caso que origino la convencion en esta ventana: el paso de prefill del picker de RecordDetail usa Vueform, que renderiza `label`/`placeholder`/`description` tal cual sin pasarlos por i18n. Un texto de prefill se mostraba sin traducir porque no existia un mecanismo declarativo para decirle a Vueform "esto es una key, resuelvela". Agregar `labelTag`/`placeholderTag`/`descriptionTag` resuelve contra el idioma activo antes de pasarle el valor final a Vueform.

## Where

- Paso de prefill del picker de RecordDetail (commit `e0cf33a8`); documentado en el propio repo via el commit `1d06a218 docs(prefill): document i18n divergence from RecordDetail convention`

## When

Al disenar un contrato JSON nuevo que necesite texto traducible fuera del flujo estandar de `column.{key}` (por ejemplo, un paso de formulario, un prefill, un texto embebido en un componente de terceros como Vueform): declarar la key con sufijo `Tag`, no un literal fijo ni una key sin marcar.

## Source

- **Discovered in**: UPONE-1503 (commit `e0cf33a8`)
