---
id: BUG-curriculum-design-018
project: up1
type: bug
module: curriculum-design
tags:
  - seed
  - enum
  - progression
  - plan
  - curriculum
---

# El seed de planes sembraba `progression: "Credits"`, un valor fuera del enum

## Symptom

Los planes de estudio sembrados quedaban con un valor de `progression` que el
modelo no reconoce. El enum real del campo admite `Sequential` y `Modular`, y
`Credits` no es ninguno de los dos, asi que todo consumidor que ramificara por
ese valor caia en el camino por defecto o no encontraba coincidencia.

## Expected behavior

El valor de `progression` sembrado deberia pertenecer al enum real del objeto (`Sequential` o `Modular`), y el pipeline de seed deberia validar los valores de enum contra la definicion del objeto antes de cargarlos.

## Root cause

File: `seed/_data-curriculum.js`

Cause: el dato del seed se escribio con un valor de dominio inventado
(`"Credits"`) que nunca existio en el enum del objeto. No fue un cambio de enum
posterior que dejo datos viejos atras: el valor era invalido desde el inicio, y
nada en el pipeline de seed valida los valores de enum contra la definicion del
objeto, asi que el seed corria verde.

## Fix

El commit `72ce0d3` (2026-08-06, `UPONE-1538-S1 fix(curriculum-design): sanitize
Plan progression seed value (Credits -> Sequential)`) reemplazo el valor en todos
los planes del seed.

Estado verificado hoy en el working tree: `grep -nE "progression.*Credits"` sobre
`seed/_data-curriculum.js` no devuelve nada, y hay 20 planes con
`progression: "Sequential"`. Las 22 lineas que todavia contienen la palabra
"Credits" son el campo `totalCredits: 240`, que es legitimo y no tiene relacion
con este defecto.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Planes del seed | 20 planes con `progression` fuera del enum | 20 planes en `Sequential` |
| Consumidores que ramifican por `progression` | Caian al default sin coincidencia | Reciben un valor valido del enum |
| Validacion del pipeline de seed | No valida enums contra la definicion del objeto | Sigue sin validar: el mismo error puede reintroducirse |

## Reproduction

### Steps
1. Correr el seed de `seed/_data-curriculum.js`.
2. Consultar el campo `progression` de los planes sembrados.
3. Verificar que el valor es `"Credits"`, ausente del enum real (`Sequential`/`Modular`).

## Notas

Este record se creo porque el plan de la actualizacion del KB asumia que el tema
ya estaba cubierto por `[[BUG-curriculum-design-016]]`, y al revisarlo resulto
ser un bug distinto (falta de `institution:view` para roles curriculares,
TICKET-119). Se evito mezclar dos defectos bajo un mismo id.

El hueco de fondo sigue abierto: nada valida los valores de enum del seed contra
la definicion del objeto, asi que la clase de error es reintroducible. Ese es el
follow-up util, no el valor puntual ya corregido.
