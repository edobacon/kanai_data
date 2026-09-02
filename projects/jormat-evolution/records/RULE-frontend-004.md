---
id: RULE-frontend-004
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - testing
  - rtl
  - select
  - mock
---

# En vistas con Select mockeado, no asertar filas por texto: los nombres del catalogo contaminan los matchers de RTL

## What

Cuando una vista de test mockea un catalogo (ej. `estado`, `categoria`) para poblar un `<Select>`, los nombres de las opciones quedan presentes en el DOM como `<option>`/items del listbox. Un assert de fila por texto (`getByText('Activo')`, `findByText(...)`) puede matchear el `<option>` del Select en vez de la celda de la tabla, dando falsos positivos o ambiguedad (`Found multiple elements`). Asertar filas por un identificador unico de la fila (codigo, id) en vez de por el texto que tambien vive en el catalogo mockeado.

## Why

El mock del catalogo introduce el mismo texto en dos lugares del DOM (opcion del Select + celda de tabla si el valor coincide); un test que no lo anticipa puede pasar por accidente (matchea el nodo equivocado) o fallar por ambiguedad, sin relacion con el bug real que se queria cubrir.

## Where

- **Layers**: frontend (tests jsdom de vistas con tabla + filtro Select mockeado).
- Ejemplo origen: vista de detalle/listado de items con Select de estado (JOR-060).

## When

- Al escribir un test de una vista con tabla + Select filtrado por un catalogo mockeado, donde el valor de una fila puede coincidir textualmente con una opcion del Select.

## Verification

- El assert de fila usa un selector por codigo/id unico de la fila (`within(row).getByText(codigoUnico)` o similar), no un `getByText` global sobre un valor que tambien aparece en el Select.

## Source

- **Discovered in**: JOR-060, Session 1.
- **Evidence**: L2 (nombres del catalogo como `<option>` contaminan matchers por texto de RTL; assert de filas por codigo unico).
