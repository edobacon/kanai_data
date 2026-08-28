---
id: RULE-curriculum-design-005
project: up1
type: rule
module: curriculum-design
tags:
  - friendly-errors
  - error-handling
  - formatError
  - uniqueness
  - mod-only
  - UPONE-1216
---

# Mensaje de unicidad de un mod debe terminar con el formato Prisma para mapear al friendly-error

## What

Un mod que necesite un mensaje user-facing de 'valor duplicado/unico' (mod-only, sin tocar core) debe lanzar un Error cuyo texto TERMINE con el formato Prisma `Unique constraint failed on the fields: (`<campo>`)` (sin texto despues). El detalle de dominio (code propio, ids en conflicto) va ANTES de esa frase.

## Why

El formatError de object-manager (UPONE-1216, src/index.js:72) intercepta TODO mensaje que contenga 'Unique constraint failed' y extrae el campo con un regex ANCLADO AL FINAL del string. Si hay texto despues del campo, la extraccion falla y devuelve el bare 'Unique constraint failed' (sin backtick) -> el front (useFriendlyErrors.ts:191, /Unique constraint.*failed.*`(\w+)`/i) no lo matchea y cae al default 'Ocurrio un error inesperado'. Con la frase al final, formatError normaliza a la forma canonica + extensions.code=UNIQUE_VIOLATION, y el front muestra 'Ya existe un registro con ese valor.' (traduccion ES ya existente en layout/lang/es_CL@RecordDetail.json). Bug real observado en TICKET-073: el primer intento puso el campo a mitad del mensaje y la UI mostro el default.

## Where

Cualquier mod que lance errores de unicidad/duplicado de dominio destinados a la UI (ej. mods/curriculum-design/logic/helpers/lineageUniqueness.js). Cadena de 3 saltos: mod throw -> object-manager/src/index.js formatError (normaliza) -> layout/src/composables/useFriendlyErrors.ts:191 (mapea a uniqueness).

## When

Al emitir errores de unicidad/duplicado de dominio desde un mod sin modificar core (mod-only). NO aplica si se usa el enfoque de extensions GraphQL (el mod gobierna el texto exacto, requiere tocar core).

## Verification

Test que replique formatError (regex de campo anclado al final) sobre el mensaje lanzado y verifique que la forma normalizada matchea /Unique constraint.*failed.*`(\w+)`/i y NO el de concurrencia; ademas smoke UI real del toast (un test a nivel-datos no prueba el render). Reiniciar object-manager tras `npm run sync:logic` (corre como `npm start` plano, no recarga).

## Source

- **Discovered in**: TICKET-073
