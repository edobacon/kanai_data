---
id: RULE-api-003
project: jormat-evolution
type: rule
module: api
level: should
tags:
  - api
  - stub
  - contrato
  - dto
  - envelope
---

# Contrato de detalle como superset del listado; update de stub sobreescribe campos explicitos, no spardea el input

## What

Dos convenciones para el diseno de stubs backend (sin BD real) detectadas en JOR-060:

1. **Detalle como superset del listado**: el DTO de detalle (`GET :id`) se define extendiendo el schema/DTO del listado (`schema.extend(...)` en Zod, `extends` en clases DTO), nunca duplicando el shape base. Esto mantiene el listado intacto cuando el detalle agrega campos.
2. **Update no spardea el input DTO sobre el detalle**: al simular una actualizacion en un stub, sobreescribir explicitamente cada campo del detalle con el valor correspondiente del input, NO hacer `{...detalle, ...inputDto}`. Un spread indiscriminado contamina la respuesta con campos que no pertenecen al contrato de salida (sobre todo sin `ClassSerializerInterceptor` que filtre).

## Why

Duplicar el shape del detalle en vez de extenderlo hace que un cambio al listado no se propague, y diverge con el tiempo. Spardear el input sobre el detalle filtra campos internos del DTO de entrada (que no deberian aparecer en la respuesta) hacia el contrato de salida — un test que solo verifica presencia de los campos esperados no detecta la contaminacion; hace falta un assert negativo (`not.toHaveProperty`) sobre los campos que NO deberian estar.

## Where

- **Layers**: backend (DTOs, services de stubs sin BD real).
- Ejemplo origen: modulo de items/catalogos (JOR-060).

## When

- Al definir el DTO/schema de un endpoint de detalle que expone mas campos que el listado del mismo recurso.
- Al implementar el update de un stub (sin persistencia real): construir la respuesta campo a campo desde el detalle base, no por spread del input.

## Verification

- El schema/DTO de detalle usa `.extend()`/`extends` sobre el del listado (no un literal duplicado).
- Existe un test que verifica `not.toHaveProperty` sobre campos del input DTO que no pertenecen al contrato de salida del update.

## Source

- **Discovered in**: JOR-060, Session 3 (dual-judge).
- **Evidence**: L3 (`GET :id` devuelve el superset del listado sin tocar su GET); L4 (sobreescribir por campo explicito + test de contrato `not.toHaveProperty` tras detectar contaminacion por spread).
