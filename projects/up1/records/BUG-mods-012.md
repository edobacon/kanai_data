---
id: BUG-mods-012
project: up1
type: bug
module: mods
tags:
  - academic-scheduling
  - seed
  - ordering
---

# Orden de seeding dependía implícitamente del nombre de archivo (terms antes que sections)

## Symptom

`evalInstructor` no encontraba `MAX_MODULES_WEEK` vía la cadena `InstructorContract` → `Contract` →
`ContractRestriction`, y caía al tope infinito del catálogo (99999), rompiendo el medidor de carga de
instructor en datos de demo.

## Root cause

- **File**: `mods/academic-scheduling/seed/` (sin verificar línea exacta; archivos `populate-terms.js`
  y `populate-sections.js`).
- **Cause**: faltaban las filas de `InstructorContract` (no existía un seed dedicado), y el orden de
  ejecución de los seeds dependía implícitamente del nombre de archivo alfabético - `terms` no
  precedía de forma garantizada a `sections`, dependencia frágil no declarada explícitamente.

## Fix

Nuevo `mods/academic-scheduling/seed/populate-instructor-contracts.js`; rename de
`populate-terms.js` a `populate-0-terms.js` para forzar que terms se ejecute antes que sections en el
orden alfabético de archivos.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | desarrolladores/QA que levantan datos de demo del mod |
| Data affected | datos seed de InstructorContract y medidor de carga en demo |
| Modules affected | academic-scheduling (seed, solo datos de demo, no afecta contrato de API) |
| Frequency | siempre al correr el seed completo desde cero |

## Nota

El orden por nombre de archivo es una convención frágil e implícita del mod: cualquier seed nuevo con
dependencia de orden debe seguir el prefijo numérico (`populate-0-*`, `populate-1-*`, …), no confiar
en el orden alfabético natural del nombre semántico.
