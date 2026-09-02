---
id: RULE-frontend-005
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - api
  - catalogos
  - id
  - contrato
  - fixtures
---

# El vinculo items <-> mantenedores (categorias/aplicaciones/proveedores) se resuelve por ID, no por nombre

## What

El front (form MultiSelect + filtros del listado) trata categorias/aplicaciones/proveedores por **ID**, pero el stub de items (front detalle + backend DTO) los devolvia como **nombres** (ej. `['Frenos']`). Este gap ID<->nombre aparece en dos puntos: (1) `itemDetailToFormValues` no resuelve nombre->id al prellenar un form, y (2) un contrato de detalle que devuelve nombres cuando el control (MultiSelect) espera IDs produce un prellenado no-resoluble. Fijar el ID como fuente de verdad en el contrato (items referencia mantenedores por id), y alinear los fixtures de test a la forma REAL del stub (no a la forma que "deberia" tener).

## Why

Resolver una relacion por nombre es fragil: dos catalogos pueden tener nombres iguales o el nombre puede cambiar sin que cambie el id, rompiendo el vinculo silenciosamente. Un fixture de test con la forma equivocada (ids donde el stub real da nombres) oculta el gap: el test pasa contra un fixture idealizado que no representa el contrato real.

## Where

- **Layers**: frontend (forms MultiSelect, filtros de listado), backend (DTOs de items y mantenedores).
- Ejemplo origen: `itemDetailToFormValues`, DTO de detalle de items (JOR-064, JOR-060).

## When

- Al disenar o consumir un contrato que vincula un recurso con catalogos referenciables (categorias, aplicaciones, proveedores, clientes, etc.): el campo de vinculo es el id/codigo estable, nunca el nombre para mostrar.
- Al escribir fixtures de test para un contrato con este tipo de vinculo: verificar la forma REAL que devuelve el stub/backend (no asumir ids si el stub aun devuelve nombres).

## Verification

- El DTO/contrato de detalle expone el id (no el nombre) para cada referencia a un catalogo.
- Los fixtures de test calzan con la forma real observada del stub/endpoint, no con una forma idealizada.

## Source

- **Discovered in**: JOR-064 (intake) y JOR-060 (Session 3, dual-judge).
- **Evidence**: JOR-064 L8 (gap ID<->nombre en `itemDetailToFormValues`, forma de referencia via id como fuente de verdad); JOR-060 L5 (prellenado no-resoluble por nombres vs control por ids; alinear fixtures a la forma real del stub).
