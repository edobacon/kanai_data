---
id: RULE-GEN-009
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - fecha
  - formato
  - paridad
---

# Formato de fecha en strings: `'DD-MM-YYYY'`

## What

Los campos de fecha que se almacenan como string en la base de datos (como `Guia.fechaGuia` y `Guia.fechaCorta`) usan el formato `'DD-MM-YYYY'` (día-mes-año con guiones). Ejemplos: `'15-04-2026'`, `'01-01-2025'`. No se usa ISO 8601 (`'2026-04-15'`) ni formato con barras (`'15/04/2026'`) en estos campos.

## Why

Es el formato del legacy, validado y parseado por `moment-timezone`. El cliente espera este formato para mostrar fechas en la UI. Si el servidor retornara ISO 8601, el cliente Vue/Nuxt necesitaría conversión adicional. La paridad de formato evita bugs de display y parseo.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (validación Zod del formato), `server/utils/dateToTimestamp.ts` (parsing de `'DD-MM-YYYY'` a epoch)
- **Tables**: colección `guias`, campos `fechaGuia`, `fechaCorta`
- **Layers**: shared schema, backend

## When

Al validar y parsear cualquier campo de fecha string en guías. Al generar fechas en respuestas si se retornan como string.

## Verification

- Test schema: `fechaGuia: '2026-04-15'` (ISO) → rechazado. `fechaGuia: '15-04-2026'` → aceptado.
- Test: `moment('15-04-2026', 'DD-MM-YYYY').isValid()` → true.
- `grep -n "DD-MM-YYYY\|fechaGuia\|fechaCorta" shared/schemas/guia.schema.ts` → debe mostrar el formato.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campo `fechaGuia`: "Formato `'DD-MM-YYYY'`". Campo `fechaCorta`: "Formato `'DD-MM-YYYY'`". Contrato migración punto 9: "`guideDateOnMs` derivado de `fechaGuia` (formato DD-MM-YYYY con dateToTimestamp)".
- **Related**: RULE-GEN-008, RULE-GEN-010
