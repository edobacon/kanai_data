---
id: BUG-platform-020
project: up1
type: bug
module: platform
tags:
  - drift-detector
  - detect-schema-drift
  - RecordType
  - false-positive
  - sync
  - Modality
  - rt__
  - canonical-name
---

# detect-schema-drift.js produce falso-positivo de colisión entre RecordType y objeto Base del mismo nombre

## Symptom

Al correr `npm run sync` (o `npm run drift:check`) con un mod que tiene un RecordType cuyo `title` coincide con el nombre de un objeto Base del mismo tenant (ej. `rt__Modality__curricularsection` con `title="Modality"` y un objeto Base `Modality`), el detector de drift reporta 7 errores sobre "Modality" y bloquea el sync, aunque el schema real, la DB y el E2E estén completamente correctos. Solo el detector de drift falla.

## Expected behavior

El detector de drift distingue entre un RecordType (cuyo identificador canónico es `rt__X__Y`) y un objeto Base (cuyo identificador es su nombre corto). Coincidencias de `title` no generan falso-positivo.

## Root cause

Dos bugs compuestos en `detect-schema-drift.js` (object-manager):\n1. **No carga el directorio RecordTypes**: el detector no incluye los archivos de `objects/business/Base/RecordTypes/` en su scan de objetos, por lo que los RecordTypes quedan sin contexto correcto.\n2. **Clave por `title` corto en lugar del nombre canónico**: el detector indexa los objetos por su campo `title` (ej. `"Modality"`) en vez del nombre del archivo (`rt__Modality__curricularsection`). Cuando un objeto Base y un RecordType tienen el mismo `title`, ambos ocupan la misma clave en el mapa → colisión → comparación contra el tenant da 7 errores. Documentado en TICKET-048 L1 y L3.

## Impact

Bloquea `npm run sync` full en tenants que tienen esta combinación (UPU tiene objeto Base `Modality` + RecordType `rt__Modality__curricularsection`). No bloquea `npm run codegen -- <tenant>` (que es independiente del detector). Runtime/DB/E2E son correctos — es un falso-positivo del gate, no un error real.

## Reproduction

1. Tener un tenant con un objeto Base cuyo nombre coincide con el `title` de un RecordType de un mod (ej. `Modality` Base + `rt__Modality__curricularsection` con `title: "Modality"`). 2. Correr `npm run sync`. 3. El drift check falla con ~7 errores sobre `Modality`. 4. Correr `npm run codegen -- <tenant>` directamente → pasa sin error.

## Workaround

Usar `npm run codegen -- <tenant>` en lugar de `npm run sync` full cuando el drift detector bloquea por falso-positivo. Fix definitivo: en `detect-schema-drift.js`, (a) incluir el directorio `RecordTypes/` en el scan y (b) indexar por nombre canónico (`rt__X__Y`, igual que el modelo Prisma, la tabla DB y el tipo GraphQL) en vez de por el campo `title`.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-048
