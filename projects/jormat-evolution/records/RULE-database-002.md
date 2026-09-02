---
id: RULE-database-002
project: jormat-evolution
type: rule
module: database
level: should
tags:
  - migracion
  - legacy
  - identidad
  - join
---

# FKs heredadas del legacy con id numerico no tienen puente automatico al uuid actual

## What

Columnas que vienen del sistema legacy AngularJS y almacenan un identificador NUMERICO de usuario/entidad (ej. `items.us_modifier_id`) no se pueden joinear directo contra las tablas actuales, que usan `uuid` como PK (ej. `users.id`). Un join defensivo con cast `::text = ::text` evita el error 500, pero SIEMPRE resuelve a `N/A` porque los dos dominios de identidad (entero legacy vs uuid actual) no estan conectados por ninguna columna puente.

## Why

La migracion desde el legacy AngularJS reemplazo ids numericos por uuid en las tablas nuevas, pero varias columnas heredadas (auditoria, referencias de usuario) siguen guardando el id numerico original. Sin una columna puente (ej. `users.legacy_numeric_id`) o una migracion de esas columnas a uuid, cualquier join contra `users` resuelve vacio — no es un bug del join, es ausencia de dato de mapeo.

## Where

- **Files**: `backend/jormat-api/src/items/items.repository.ts` (join defensivo a `users` por `us_modifier_id`)
- **Tables**: `items.us_modifier_id` (int legacy) vs `users.id` (uuid)
- **Layers**: backend, database

## When

Siempre que se implemente un join o resolucion de nombre/entidad sobre una columna heredada del legacy que almacena un id numerico, contra una tabla actual con PK uuid.

## Verification

Revisar si la tabla objetivo (`users` u otra tabla actual) tiene una columna puente (`legacy_numeric_id` o equivalente) antes de prometer que el join resuelve el dato real. Si no existe, el resultado esperado es `N/A`/fallback documentado, no un error ni una "feature completa".

## Source

- **Discovered in**: JOR-157, Session 1
- **Evidence**: DT-20 (auditoria de items) — `us_modifier_id` entero legacy vs `users.id` uuid, sin columna puente; el join defensivo (Option A, cast `::text`) nunca lanza 500 pero resuelve siempre a N/A hasta que exista Option B (columna puente).
- **Related**: JOR-157 backlog item B1 (DT-20 Option B)
