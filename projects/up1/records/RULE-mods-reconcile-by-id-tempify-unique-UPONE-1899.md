---
id: RULE-mods-reconcile-by-id-tempify-unique-UPONE-1899
project: up1
type: rule
module: mods
level: should
tags:
  - UPONE-1899
  - prisma
  - unique
  - reconcile
  - tempify
  - testing
---

# Reconciliar filas por id sobre un campo unico se hace en dos pasadas: primero valores temporales, despues los definitivos

## What

Cuando un guardado reconcilia filas existentes por id (update de las que siguen, alta de las nuevas, baja de las que faltan) y actualiza un campo con restriccion de unicidad (`code`, `position`, un nombre unico por padre), aplica el estado final en dos pasadas:

1. Lleva a un valor temporal unico los valores que cambian.
2. Recien despues escribe los valores definitivos.

Actualizar fila por fila en el orden del payload falla en cuanto dos filas intercambian o desplazan valores, aunque el estado final sea valido: el primer update deja dos filas con el mismo valor y Prisma responde P2002. Dar de baja las filas que salen ANTES de los updates cubre los desplazamientos hacia un valor liberado, pero no los intercambios entre filas que sobreviven.

## Why

- curriculum-mapping ya tuvo este bug en los nodos del arbol y lo resolvio con `tempifyCodes` (decision M-29 del mod).
- UPONE-1899 (PR curriculum-mapping #42) cambio `persistRubric` de "borrar y recrear" a "reconciliar por id" para conservar los ids, y repitio el patron sin tempificar: con A=C1 y B=C2 pasando a A=C2 y B=C3, el guardado entero falla contra `@@unique([competencyNodeId, code])` de `RubricDimension`. El caso es alcanzable desde la pantalla, porque el editor manda ids y codigos editados a mano.
- Ningun test lo atrapo: los mocks de Prisma no aplican la restriccion de unicidad. Es el mismo falso verde que describe [[RULE-dev-test-real-shape-not-mocked]].

## Where

Cualquier resolver de mod que reconcilie colecciones hijas por id con una unique sobre un campo editable. Referencias: `logic/competencyTree-upsert.resolver.js` (`tempifyCodes` para nodos; `persistRubric` para dimensiones).

## When

Al pasar un guardado de "borrar y recrear" a "reconciliar por id", o al agregar una unique a un campo que un guardado en lote ya actualiza.

## Verification

- Test de intercambio y de desplazamiento entre filas que sobreviven, contra un Prisma (o un fake) que SI aplique la unicidad.
- En code review: un `update` en loop sobre un campo unico sin paso previo de temporales es sospechoso.

## Source

- **Discovered in**: UPONE-1899, revisiones del PR curriculum-mapping #42 (heads 31e9958 y 8bc784a), 2026-09-24; confirmado por verificador adversarial contra el schema Prisma generado.
- **Related**: M-29 de curriculum-mapping/CLAUDE.md, [[RULE-dev-test-real-shape-not-mocked]], [[RULE-core-pre-push-db-safety]].
