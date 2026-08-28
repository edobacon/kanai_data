---
id: RULE-layout-004
project: up1
type: rule
module: layout
tags:
  - vueform
  - component
  - pattern
---

# Vueform custom elements usan defineElement con ElementLayout wrapper

## What

Componentes custom registrados como Vueform elements deben usar defineElement() y wrappear su template en ElementLayout con slot forwarding.

## Why

ElementLayout provee la integracion con el form system de Vueform (validacion, labels, errores, conditions). Sin el wrapper, el componente no participa del lifecycle del form.

## Where

mods/*/modsComponents/

## When

Al crear un widget custom para usar en RecordDetail schema (type: 'mi-widget').

## Verification

Verificar que el componente exporta defineElement() y su template raiz es ElementLayout.

## Source

- **Discovered in**: —
