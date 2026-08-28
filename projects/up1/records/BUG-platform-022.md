---
id: BUG-platform-022
project: up1
type: bug
module: platform
tags:
  - codegen
  - type-vocabulary
  - metadata
  - float
  - core_FieldDefinition
  - curriculum-mapping
---

# `fieldType:"float"` registra JSON Schema `type:"string"` en `core_FieldDefinition`; `fieldType:"number"` genera columna `Int` y trunca decimales

## Symptom

Al declarar un campo con `fieldType:"float"` en un objeto JSON (ej. weight/threshold del mod curriculum-mapping), el `core_FieldDefinition` resultante registra `type:"string"` en vez de `type:"number"`. Al usar `fieldType:"number"` (semánticamente el tipo esperado para decimales), la columna Prisma generada es `Int`, truncando cualquier valor decimal.

## Root cause

- **File**: `object-manager/src/services/typeMappers.js:538-589` (`canonicalFieldTypeToJsonSchema`, verificado). El `switch` mapea explícitamente `'number' | 'percent' | 'currency'` → JSON Schema `'number'` (líneas 561-564), pero **no tiene case para `'float'`** → cae al `default` (líneas 586-587) que retorna `'string'`.
- **File**: `object-manager/src/services/typeMappers.js:282-330` (`fieldTypeToPrisma`, verificado). El `switch` mapea `'number' | 'integer' | 'int'` → Prisma `'Int'` (líneas 308-311), y solo `'percent' | 'currency' | 'float'` → Prisma `'Float'` (líneas 312-315).
- **Consecuencia combinada**: no existe ningún `fieldType` semántico que mapee limpio a un campo decimal en AMBAS capas (JSON Schema type registrado en `core_FieldDefinition` + columna Prisma). `'float'` da columna `Float` correcta pero metadata `string` incorrecta; `'number'` da metadata `number` correcta pero columna `Int` incorrecta (trunca).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | Cualquier mod que declare campos decimales (weight, threshold, score, porcentajes no cubiertos por `percent`) |
| Data affected | Valores decimales truncados a entero si se usa `fieldType:"number"`; metadata de tipo incorrecta (string) si se usa `fieldType:"float"`, afectando validación/UI que confíe en `core_FieldDefinition.type` |
| Modules affected | object-manager (codegen), cualquier mod consumidor (detectado en curriculum-mapping) |
| Frequency | Siempre que se declare un campo decimal con `fieldType:"float"` o `"number"` |

## Reproduction

1. Declarar en un objeto JSON un campo `{ "fieldType": "float", ... }`.
2. Correr `npm run codegen` y consultar `core_FieldDefinition` para ese campo → `type` registrado es `"string"`, no `"number"`.
3. Declarar en cambio `{ "fieldType": "number", ... }` con un valor decimal (ej. `1.5`).
4. Correr `npm run codegen` + `npx prisma migrate dev` → columna generada es `Int`; persistir `1.5` trunca a `1`.

## Workaround

curriculum-mapping adoptó el patrón "string-everywhere" para `weight/minThreshold/maxThreshold/scaleMin/scaleMax`: declara estos campos como `string` y parsea/formatea en la capa de aplicación, evitando ambos mapeos rotos. Ver [[DECISION-023]].

## Solution

Pendiente. Requiere agregar case explícito para `'float'` en `canonicalFieldTypeToJsonSchema` (retornar `'number'` con algún marcador de precisión, o un `format` distintivo) y decidir si `'number'` debe seguir mapeando a `Int` (renombrar semántica) o agregar un tipo nuevo dedicado a decimales sin ambigüedad. Evaluar impacto en objetos existentes que ya usan `'number'` esperando `Int` antes de cualquier cambio.

## Related

- **Decisions**: [[DECISION-023]] (workaround string-everywhere en curriculum-mapping).
- **Origen**: detectado durante el desarrollo de LevelScheme (curriculum-mapping, UPONE-1454), no reportado como bug de plataforma hasta este recon.
