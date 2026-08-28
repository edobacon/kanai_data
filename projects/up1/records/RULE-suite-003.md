---
id: RULE-suite-003
project: up1
type: rule
module: suite
tags:
  - vite
  - HMR
  - import-meta-glob
  - dev-server
  - restart
---

# Nuevos modsComponents requieren restart del dev server

## What

import.meta.glob() en vueform.config.ts es evaluado en build time (estatico). Agregar un nuevo componente en modsComponents/ despues de npm run sync no es detectado automaticamente por HMR. Requiere restart del dev server de suite. En algunos casos tambien limpiar cache: rm -rf suite/.nuxt/.cache y node_modules/.vite.

## Why

Vite resuelve los globs al iniciar el dev server. Los archivos agregados despues no entran en el glob hasta el proximo restart.

## Where

suite/vueform.config.ts, layout/src/modsComponents/

## When

Al crear un nuevo custom Vueform element por primera vez (no aplica a ediciones de elementos existentes)

## Verification

Tras restart, el type del custom element es reconocido en el layout JSON y renderiza

## Source

- **Discovered in**: TICKET-005
