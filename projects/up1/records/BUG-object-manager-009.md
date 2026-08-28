---
id: BUG-object-manager-009
project: up1
type: bug
module: object-manager
tags:
  - transformations
  - trim
  - unique
  - schemaTransformations
---

# Transformations declaradas en JSON de objeto (ej. trim) no se aplicaban en create/update

## Symptom

Un campo con `transformations: [{"type": "trim"}]` declarado en el JSON del objeto (ej. `Instructor.instructorCode`) no se recortaba realmente en create/update. Espacios en blanco al inicio/fin del valor sorteaban el `unique: true` del campo (dos valores visualmente iguales, con espacios, pasaban como distintos).

## Root cause

- **File**: `src/graphql/resolvers/helpers/schemaTransformations.js:101-102` (verificado).
- **Cause**: la declaración `transformations` en el JSON del objeto nunca se conectaba al pipeline de `createInstance`/`updateInstance`; no existía un punto centralizado que leyera `fieldDef.transformations` y aplicara el trim antes de persistir.

## Fix

Se extrae la lógica a `schemaTransformations.js`, que itera `baseSchema.properties`, detecta `transformation?.type === 'trim'` y aplica `.trim()` sobre el valor de string antes de create/update. Otros tipos declarados (ej. `uppercase`) quedan como no-op explícito hasta implementarse.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier alta/edición de campos con `unique: true` + `transformations: trim` declarado |
| Data affected | campos afectados en múltiples objetos (ej. `Instructor.instructorCode`) |
| Modules affected | object-manager (persistencia, validación de unicidad) |
| Frequency | cada create/update de un campo con transformation declarada pero no aplicada |
