---
id: BUG-mods-025
project: up1
type: bug
module: mods
tags:
  - curriculum-mapping
  - uniqueness
  - case-sensitivity
  - postgres
  - null-distinct
---

# La unicidad de `code` era case-sensitive y permitia duplicados por casing

## Symptom

Los tres objetos del mod (LevelScheme, CoverageScheme, matriz de competencias) permitian que dos
registros convivieran con codigos que solo diferian en mayusculas/minusculas (`"Prueba"` y
`"PRueba"`), pese a ser el mismo codigo para el usuario.

## Expected behavior

La unicidad de `code` deberia ser case-insensitive en los tres objetos del mod, incluido el caso de la matriz de competencias con `parentId` null, de modo que dos registros con el mismo codigo (distinto casing) no puedan convivir.

## Root cause

File: `mods/curriculum-mapping/logic/helpers/levelSchemeUniqueness.js`

Cause: `hasConflictingCode` comparaba el `code` exacto contra la base (`findFirst` sin
`mode: 'insensitive'`), y el `@@unique` de Postgres tambien es case-sensitive, asi que no habia
ningun enforcement que atrapara el duplicado por casing. Ademas, para la matriz de competencias el
`@@unique [parentId, recordType, code]` real no aplica cuando `parentId` es `null` (una matriz no
tiene padre): Postgres trata cada `NULL` como distinto de cualquier otro, asi que dos matrices con
codigo identico entraban igual sin ningun guard.

## Fix

`comparableCode` (`logic/helpers/levelSchemeUniqueness.js:61-64`) pliega el codigo a minusculas SOLO
para comparar; el dato persistido conserva el casing que escribio el usuario. `hasConflictingCode`
(`:82-87`) pasa `mode: 'insensitive'` a la query Prisma, igual que el core hace en sus pre-checks de
unicidad de `email`. `findDuplicateLevelCodes` (`:141-159`), que detecta duplicados dentro de un mismo
payload en memoria (antes de tocar la base), se reescribio con `Map` en vez de `Set` para poder
devolver en el mensaje de error el codigo con el casing de la primera aparicion.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Unicidad contra la base | Solo atrapaba coincidencia exacta de casing | Case-insensitive via `mode: 'insensitive'` |
| Matriz con `parentId` null | Sin ningun enforcement de unicidad de `code` | Cubierta por el mismo guard, scope explicito `{ recordType: 'Matrix' }` |
| Mensaje de error | N/A | Muestra el codigo con el casing de la primera aparicion en el payload |

## Reproduction

### Steps
1. Crear un `LevelScheme` con `code: "Prueba"`.
2. Crear un segundo `LevelScheme` con `code: "PRueba"`.
3. Verificar que ambos se guardan sin error de duplicado.
4. Repetir con dos matrices de competencias (`parentId: null`) usando el mismo `code`.
