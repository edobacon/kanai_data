---
id: RULE-database-003
project: jormat-evolution
type: rule
module: database
level: should
tags:
  - schema
  - convencion
  - boolean
  - migraciones
---

# Columnas booleanas en el schema del backend usan integer/smallint 1/0, no `t.boolean`

## What

El proyecto no usa el tipo `t.boolean` de Knex para flags binarios en tablas existentes; usa `integer`/`smallint` con valores `1`/`0`. Ejemplos confirmados: `items.is_active` es `smallint`; `items.offer_is` e `items.is_kit` son `integer`.

## Why

Mantener consistencia con el patron ya establecido en el schema. Mezclar `t.boolean` con `integer`/`smallint` para flags equivalentes genera inconsistencia en como el codigo lee/escribe esos campos (`=== 1` vs `=== true`) y en como se comparan entre columnas de la misma tabla.

## Where

- **Tables**: `items.is_active` (smallint), `items.offer_is` (integer), `items.is_kit` (integer), `items.bloqueo_descuento` (smallint, agregado en JOR-157 siguiendo esta convencion)
- **Layers**: database, backend (mappers que leen/escriben el flag)

## When

Al agregar una columna nueva de tipo flag/booleano a una tabla existente del backend.

## Verification

Antes de escribir una migracion con un flag nuevo, revisar el tipo de las columnas boolean-like existentes en la misma tabla (inspeccion del schema o del archivo de migracion base) y replicar `integer`/`smallint` + `1`/`0`, no `t.boolean`.

## Source

- **Discovered in**: JOR-157, Session 1
- **Evidence**: la migracion de `bloqueo_descuento` (S1.T1) siguio `smallint` 1/0 tras confirmar que `is_active` es smallint y `offer_is`/`is_kit` son integer (no boolean) en el schema real.
- **Related**: quality review de JOR-157 Session 1, hallazgo #4 (comentario de la migracion cito `offer_is`/`is_kit` como smallint cuando en realidad son integer — imprecision de comentario, no del tipo elegido)
