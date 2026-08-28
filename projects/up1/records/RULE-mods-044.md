---
id: RULE-mods-044
project: up1
type: rule
module: mods
tags:
  - sync
  - merge
  - core
  - mod
  - codegen
  - core-flag
  - type-change
  - workflow
---

# Merge sync mod→core: flag core y cambios de tipo van en el objeto correcto

## What

El sync de un mod al core opera en dos pasos: Fase 2 (performMergeSync) deep-mergea los objetos del mod en business/Base ANTES del codegen (Fase 3). El flag `core:true` protege ~15 objetos canónicos (availability, attendance, event, etc.) de overrides del mod: `isObjectCore()` retorna true y bloquea el merge. Objetos SIN `core:true` (ej. Workflow) admiten campos nuevos del mod vía append. El validador `validateTypeCompatibility` rechaza cambios de TIPO o NOT NULL de campos EXISTENTES si se intentan desde el mod solamente. El codegen siempre lee de business/Base (fileParsing.js getObjectToFileMap(); generatePrismaSchema.js:989).

## Why

Un campo nuevo (ej. `initialStatusId`) definido en `mods/curriculum-design/objects/workflow.json` llega a `object-manager/objects/business/Base/workflow.json` vía Fase 2 y el codegen lo genera. En cambio, cambiar el TIPO de un campo existente (ej. `version: string → integer`) falla el validateTypeCompatibility si solo se edita el mod. Si solo se edita el core, el sync revierte el cambio al re-mergear el mod en el próximo sync. Editar ambos garantiza coherencia sin revert.

## Where

- `object-manager/src/sync/SyncManager.js:122-134` (performMergeSync, Fase 2)
- `object-manager/src/sync/fileSync.js:322-386` (merge lógica), `:667-670,746,799,834` (isObjectCore)
- `object-manager/src/sync/fileParsing.js` (getObjectToFileMap)
- `object-manager/src/codegen/generatePrismaSchema.js:989` (fuente del codegen)
- Objetos con `core:true`: availability, attendance, event y ~13 más (grep `"core": true` en objects/business/Base/)
- `mods/<mod>/objects/<Obj>.json` (fuente del mod, append-only para campos existentes)

## When

Al agregar o modificar campos en objetos del mod:
1. Si el campo es NUEVO y el objeto no tiene `core:true` → editar solo en el mod; el sync lo propaga al core.
2. Si el cambio es de TIPO o NOT NULL de un campo EXISTENTE → editar TAMBIÉN en el core (`object-manager/objects/business/Base/<obj>.json`) en la misma operación; si solo se edita el mod, validateTypeCompatibility lo rechaza y el sync revierte.
3. Si el objeto tiene `core:true` → el campo nuevo debe ir directo en el core (el mod no puede tocarlo).

## Verification

1. Confirmar presencia/ausencia de `"core": true` en el objeto antes de decidir dónde editar.
2. `grep '"core"' mods/<mod>/objects/<obj>.json object-manager/objects/business/Base/<obj>.json`
3. Tras el sync, verificar que el campo aparece en el schema generado: `grep <campo> object-manager/prisma/<tenant>/schema.prisma`
4. Si se edita el core directamente, correr `npm run sync` y verificar que el mod no revirtió el cambio.

## Source

- **Discovered in**: TICKET-034
