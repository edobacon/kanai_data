---
id: BUG-mods-006
project: up1
type: bug
module: mods
---

# Duplicate key ca_matrix_list en lang JSON de assessment-matrix

## Symptom

La clave `ca_matrix_list` aparece dos veces dentro del objeto `layout` en `lang/en_CL.json:47-48`, `lang/es_CL.json` y `lang/pt_BR.json`. JSON parse acepta duplicados silenciosamente y la segunda definición sobreescribe la primera sin warning.

## Expected behavior

Cada clave declarada una sola vez. Lint pre-sync que detecte duplicados en archivos lang.

## Root cause

Agregado manual de claves sin validación ni linter. El JSON parser de Node no advierte sobre duplicados.

## Impact

Uno de los dos textos se pierde silenciosamente. Potencial desalineación entre locales si las duplicadas difieren entre idiomas.

## Reproduction

Abrir `mods/assessment-matrix/lang/en_CL.json` y buscar `ca_matrix_list` — aparece dos veces en el objeto `layout`.

## Workaround

Revisar manualmente los archivos y consolidar las entradas duplicadas.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix
- **Tickets**: TICKET-005
