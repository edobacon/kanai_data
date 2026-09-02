---
id: RULE-GUIA-011
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - update
  - preservacion
---

# Update preserva `ingresoPlanta`, `ingresoRomana`, `salida` si el valor previo no está vacío y el body viene vacío

## What

En `PATCH /api/guias/:id`, los campos `ingresoPlanta`, `ingresoRomana` y `salida` siguen la siguiente lógica de preservación: si el documento existente tiene un valor no vacío para el campo, y el body del PATCH envía el campo vacío o no lo envía, el valor existente se preserva (no se sobreescribe con vacío).

## Why

Estos campos representan timestamps de ingreso y salida de la planta/romana, que son registrados en diferentes momentos del proceso. Un PATCH genérico que incluya el form completo pero con estos campos vacíos (porque aún no ocurrieron) no debe borrar un registro previo ya cargado. Es comportamiento de negocio crítico para la trazabilidad.

## Where

- **Files**: `server/api/guias/[id].patch.ts`
- **Endpoints**: `PATCH /api/guias/:id`
- **Layers**: backend (handler, antes de persistir)

## When

En cada PATCH de guía. La lógica se aplica campo por campo: para cada uno de los tres campos, si `existing[field]` tiene valor y `body[field]` es vacío, no actualizar ese campo.

## Verification

- Test: guía con `ingresoPlanta: '2026-01-15'`, PATCH con `{ ingresoPlanta: '' }` → `ingresoPlanta` sigue siendo `'2026-01-15'`.
- Test: guía con `ingresoPlanta: ''`, PATCH con `{ ingresoPlanta: '' }` → `ingresoPlanta` sigue vacío (no error).
- Test: guía con `ingresoPlanta: '2026-01-15'`, PATCH con `{ ingresoPlanta: '2026-01-20' }` → se actualiza.
- `grep -n "ingresoPlanta\|ingresoRomana\|salida" server/api/guias/\[id\].patch.ts` → debe mostrar lógica de preservación.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campos `ingresoPlanta`, `ingresoRomana`, `salida`: "Preservado en update si previo y nuevo vacio." Contrato migración punto 11.
- **Related**: RULE-GUIA-009, DEC-009
