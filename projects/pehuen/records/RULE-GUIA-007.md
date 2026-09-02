---
id: RULE-GUIA-007
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - normalización
---

# Strip whitespace de `guiaArauco` en POST

## What

En `POST /api/guias`, el valor de `guiaArauco` debe ser tratado con `.trim()` antes de persistir. Espacios al inicio o al final del número de guía se eliminan automáticamente.

## Why

El número de guía Arauco es un string que los operadores pueden tipear con espacios accidentales. Si se almacena con whitespace, la validación de unicidad fallaría (consideraría `' 12345'` diferente de `'12345'`), y los reportes mostrarían valores inconsistentes.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (Zod: `z.string().trim()`) o `server/api/guias/index.post.ts`
- **Endpoints**: `POST /api/guias`
- **Layers**: shared schema o backend handler

## When

Solo en POST (creación). No en PATCH, ya que el número de guía no debería cambiar en una actualización.

## Verification

- Test: `POST /api/guias` con `guiaArauco: '  12345  '` → guía creada con `guiaArauco: '12345'`.
- `grep -n "trim\|guiaArauco" shared/schemas/guia.schema.ts` → debe mostrar `.trim()`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campo `guiaArauco`: "Whitespace removido en POST". Contrato migración punto 8.
- **Related**: RULE-GUIA-006
