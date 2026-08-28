---
id: RULE-layout-041
project: up1
type: rule
module: layout
tags:
  - layout
  - layoutConfig
  - contrato
  - hasIntegratedControls
  - openMode
  - RecordDetail
  - RecordList
---

# Contratos layoutConfig: hasIntegratedControls y openMode.create='route'

## What

Dos opciones de `layoutConfig` habilitan patrones de layout que antes requerían tocar el core:

1. **`layoutConfig.hasIntegratedControls: true`**: cuando el schema del layout renderiza un elemento custom con sus propios controles de guardar/cancelar (ej. un wizard interno), `RecordDetail` no muestra los suyos. Sin esta opción, un layout con controles propios terminaría con controles duplicados.
2. **`layoutConfig.openMode.create: 'route'`**: en `RecordList`, `handleCreateRequest` emite `navigate-to-relation` en vez de abrir un modal, permitiendo listas donde la creación navega a una ruta dedicada.

## Why

Ambas opciones son contratos nuevos de `layoutConfig` confirmados en código (UPONE-1377); su ausencia obligaría a bifurcar el componente core o a hacks locales por mod para lograr el mismo resultado. Documentarlas evita que un futuro mod reimplemente el mismo patrón con otro nombre o con lógica duplicada.

## Where

- `layout/src/layouts/RecordDetail.vue:5482-5490` (`hasIntegratedControls`, computed que lee `props.layoutConfig?.hasIntegratedControls === true`).
- `layout/src/layouts/RecordDetail.vue:5649` (uso: solo se muestran los controles propios si `!hasIntegratedControls.value`).
- `layout/src/layouts/RecordList.vue:4484-4496` (`getOpenMode`, lee `layoutConfig.openMode`).
- `layout/src/layouts/RecordList.vue:5711-5712` (`handleCreateRequest` emite `navigate-to-relation` cuando `openMode.create === 'route'`).

## When

Al declarar un layout JSON: si el schema incluye un elemento con controles de guardar/cancelar propios (wizard, editor embebido), setear `hasIntegratedControls: true`. Si una lista debe crear vía ruta en vez de modal, usar `openMode: { create: "route" }` (o `openMode: "route"`) en vez de implementar navegación custom.

## Source

- **Discovered in**: UPONE-1377
