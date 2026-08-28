---
id: RULE-mods-038
project: up1
type: rule
module: mods
tags:
  - codegen
  - prisma
  - enum
  - naming
  - colision
  - json-object-definitions
  - platform-constraint
---

# Field enum naming: evitar colision con models existentes en codegen

## What

Cuando un mod declara un campo enum en sus JSON object definitions (e.g. `"status": { "type": "string", "enum": ["Active", "Archived"] }`), el codegen UP1 genera un Prisma enum con nombre concatenado **hardcoded** segun la convencion `{objectType}{FieldNameCapitalized}`. Ejemplo: campo `status` en object `workflow` produce enum `workflowStatus`. NO existe forma de declarar un nombre custom para el enum en el JSON. Si el nombre generado colisiona con un modelo Prisma existente (otro object del codebase), la validacion del schema Prisma falla con error `Type "X" already declared`.

## Why

El codegen UP1 en `object-manager/scripts/codegen/generatePrismaSchema.js:926` aplica la concatenacion `{objectType}{capitalize(fieldName)}` sin opciones de override. Esto es necesario para garantizar unique enum names cuando dos objects diferentes tienen el mismo nombre de campo enum (ej. `workflow.lifecycle` y `workflowStatus.lifecycle` generarian `workflowLifecycle` y `workflowStatusLifecycle`). El trade-off es que el dev debe verificar manualmente que el nombre concatenado NO colisione con un modelo declarado.

Caso observado: TICKET-018 declaro `workflow.status` con enum Draft/Active/Archived. El codegen genero el enum `workflowStatus` (de `workflow` + `Status`). Pero el objeto `workflowStatus` (otra entidad del modelo workflow) ya existia como model Prisma. Colision → codegen falla con `Type 'workflowStatus' already declared`. La solucion fue renombrar el campo: `workflow.status` → `workflow.lifecycle` (DEC-LOCAL-04 de SPEC-003).

## Where

Aplica a: cualquier mod en `up1/mods/<mod>/objects/*.json` que declare un campo `"type": "string", "enum": [...]`. NO aplica a: campos sin enum (string libre, references FK, primitivos). El check debe hacerse ANTES del primer `npm run sync` — verificar que el nombre concatenado `{objectType}{capitalize(fieldName)}` NO matchee ningun model del schema actual.

## When

Vigente desde TICKET-018 (HU3 SP2, 2026-05-13). Permanecera hasta que el codegen UP1 soporte: (a) opcion de override del enum name via JSON (e.g. `enumName: "customEnum"`), o (b) deteccion automatica de colision en codegen-time con mensaje de error sugiriendo rename. Hasta entonces: verificar manualmente.

## Verification

(1) Pre-sync check: `grep -l "^model {objectType}{FieldNameCapitalized}" up1/object-manager/prisma/UPU/schema.prisma` debe retornar 0 matches para el nombre concatenado del enum nuevo. (2) Si el primer `npm run sync` falla con `Type 'X' already declared` y X coincide con `{objectType}{capitalize(fieldName)}` de algun campo nuevo: renombrar el campo en el JSON del mod, borrar el archivo en `up1/object-manager/objects/business/Base/{objectType}.json`, re-syncing. (3) Decision tipica de rename: usar termino sinonimo que NO genere colision (ej: `status` → `lifecycle`, `state`, `phase`, `condition`).

## Source

- **Discovered in**: TICKET-018
