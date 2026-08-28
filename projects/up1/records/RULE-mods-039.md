---
id: RULE-mods-039
project: up1
type: rule
module: mods
tags:
  - codegen
  - prisma
  - foreign-key
  - json-object-definitions
  - core-models
  - business-models
  - type-system
  - platform-convention
---

# FK type segun namespace del modelo target (core_* → Int, business → String)

## What

Cuando un mod declara un campo FK (`isForeignKey: true`) en sus JSON object definitions, el `type` del campo debe matchear el tipo del `id` del modelo target segun el namespace del modelo:

| Namespace del target | Type del campo FK en JSON | Type del id en Prisma |
|----------------------|----------------------------|-----------------------|
| `core_*` (e.g. `core_User`, `core_Capability`, `core_Role`) | `"type": "integer"` | `Int @default(autoincrement())` |
| Business (e.g. `Institution`, `AcademicActivity`, `workflow`) | `"type": "string"` | `String @default(cuid())` |

Ejemplo correcto: `workflow.createdBy: { "type": "integer", "isForeignKey": true, "references": "core_User", "targetField": "id" }`.
Ejemplo incorrecto (causa Prisma error de type mismatch): mismo campo declarado como `"type": "string"` apuntando a `core_User`.

## Why

El codegen UP1 (`object-manager/scripts/codegen/generatePrismaSchema.js:197`) distingue el tipo del id segun el namespace del modelo target con la heuristica `const fkType = baseModelName.startsWith('core_') ? 'Int' : 'String'`. Los modelos `core_*` heredan de un base model de Prisma con `id Int @default(autoincrement())` (convencion legacy del codebase pre-UP1). Los modelos business usan `id String @default(cuid())` (convencion UP1 multi-tenant). Si el JSON declara un FK con type mismatch, Prisma genera error de mismatch al codegen (`Foreign key reference cannot reconcile type Int with String`).

Caso observado: TICKET-018 declaro `workflowTransitionHistory.userId` y `workflow.createdBy` como `"type": "string"` apuntando a `core_User`. Codegen fallo. La solucion fue cambiar ambos a `"type": "integer"` (DEC-LOCAL-05 de SPEC-003).

## Where

Aplica a: cualquier campo en `up1/mods/<mod>/objects/*.json` con `isForeignKey: true`. Verificar el namespace del campo `references` para elegir el `type` correcto. NO aplica a: campos no-FK, campos `references` opcionales sin `isForeignKey`. Verificar tambien en tests (e.g. seed scripts que reciben `userId` deben pasar Int, no string).

## When

Vigente permanentemente — es una convencion fundamental del codegen UP1. Solo cambiaria si el platform team migra los modelos `core_*` a usar `id String @default(cuid())` (cambio breaking en multiples mods, no scheduled).

## Verification

(1) Code review: grep en `up1/mods/<mod>/objects/*.json` por `"isForeignKey": true` — verificar que cada campo tiene `"type": "integer"` si references empieza con `core_`, sino `"type": "string"`. (2) Pre-sync check: si el JSON declara un FK nuevo, verificar el id type en `up1/object-manager/prisma/schema.prisma` del modelo target (`model {Target}` → buscar la linea `id`). (3) Runtime: si el seed o el resolver invoca `prisma.<model>.create({ data: { fkField: <value> } })`, el value debe ser Int o String segun la regla.

## Source

- **Discovered in**: TICKET-018
