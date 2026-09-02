---
id: RULE-testing-knex-mock-009
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - knex
  - mock
  - pagination
  - backend
---

# El mock de Knex para paginacion debe ser chainable + thenable con cola, no resolver en cada metodo

## What

Un mock de Knex que cubre `applyPagination` (`orderBy().limit().offset()`) debe mantener la cadena de metodos encadenados (`orderBy`, `limit`, `offset`, etc. devuelven el mismo objeto mock) y resolver solo al final (thenable). Mockear `orderBy`/`limit` individualmente para que **resuelvan** directamente rompe la cadena — el codigo real espera poder seguir encadenando `.limit().offset()` sobre el resultado de `.orderBy()`.

## Why

Un mock que resuelve prematuramente en un metodo intermedio de la cadena hace que las siguientes llamadas encadenadas (`.limit(...)`) fallen (metodo inexistente sobre una promesa resuelta) o silenciosamente no se ejecuten, dando una falsa sensacion de que el mock "funciona" hasta que se prueba con paginacion real.

## Where

- **Layers**: backend (tests de repositorios/servicios que paginan con Knex).

## When

- Al escribir un mock de Knex para cubrir codigo que usa `applyPagination` o cualquier cadena de query builder con `orderBy`/`limit`/`offset`.

## Verification

- El mock devuelve el mismo objeto (chainable) en cada metodo intermedio de la cadena, y solo el ultimo eslabon (o un `then`/await final) resuelve el valor.
- Un test que ejercite `orderBy().limit().offset()` completo pasa sin que ningun eslabon intermedio rompa la cadena.

## Source

- **Discovered in**: JOR-049, Session S1.
- **Evidence**: L2 (mockear orderBy/limit para resolver rompe la cadena orderBy().limit().offset() de applyPagination; el mock debe ser chainable+thenable con cola).
