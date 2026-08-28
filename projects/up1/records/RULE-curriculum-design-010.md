---
id: RULE-curriculum-design-010
project: up1
type: rule
module: curriculum-design
tags:
  - tenant-base
  - stale-override
  - mod-ownership
  - codegen
  - registry
  - recordtype
  - model-reduction
---

# Un objeto que pasó de tenant-specific a mod-defined deja un tenant Base override STALE que sombrea la def mod-derived

## What

Cuando un objeto que antes era tenant-specific pasa a definirse en un mod (su def vive en `mods/<mod>/objects/<Obj>.json` y el sync la deriva a `object-manager/objects/business/Base/<obj>.json`), puede quedar un override viejo en `object-manager/objects/tenants/<TENANT>/Base/<obj>.json` (artefacto de migración congelado, git-tracked). El codegen, al construir `objectToFileMap`, keyea por title con **last-wins** y el tenant override **gana** sobre business/Base (`fileParsing.js:getObjectToFileMap` → `getAllObjectFilesForTenant`). Resultado: el codegen registra los campos del objeto contra el MODELO VIEJO del override stale.

## Why

Síntoma observable: editar/clonar el objeto falla con `Unknown argument <rtfield>` (los campos del RecordType — ej. `totalCredits` — caen al `prisma.<base>.update/create()` porque `core_FieldDefinition` los tiene como `isBaseField=true` en vez de RT) y versionar falla con `OBJECT_NOT_VERSIONABLE` (`versioningConfig` queda null porque el override viejo no declara `metadata.versioning`). **Un `reset-tenant` NO lo arregla**: regenera el registry desde el MISMO source committeado stale. Y el sync (`fileSync`) **NO regenera** los tenant Base (solo escribe `business/Base/`) — son artefactos de migración congelados. La causa se confunde fácil con un bug de resolver/registry/coerción (TICKET-074/076 lo mis-diagnosticaron como casteo FK / coerción de tipo). El fix correcto es **eliminar el override stale** (`git rm`) para que el objeto caiga al `business/Base` mod-derived (igual que un objeto sin override, ej. AcademicProgram). El resolver/adapter del mod NO se toca: es correcto y depende de un registry correcto.

## Where

- Stale (a borrar): `object-manager/objects/tenants/<TENANT>/Base/<obj>.json` (git-tracked, commit "objetos migrados").
- Correcto (mod-derived): `object-manager/objects/business/Base/<obj>.json`.
- Resolución: `object-manager/src/services/fileParsing.js` (`getObjectToFileMap`); consumo en `src/services/codegen/generatePrismaSchema.js` (`syncRtFieldsToRegistry` lee `objectToFileMap[baseObject]` como base props).

## When

Cuando un objeto **hoy definido en un mod** falla al guardar campos RT / versionar, especialmente tras un cambio de modelo. ANTES de sospechar del resolver o de la coerción, verificar a qué archivo resuelve el objeto para ese tenant.

## Verification

`node -e "import('.../object-manager/src/services/fileParsing.js').then(m=>console.log(m.getObjectToFileMap('<TENANT>')['<Obj>']))"` — si resuelve a `tenants/<T>/Base/`, ese override es el sospechoso: comparar sus `properties` vs `business/Base` y querear `core_FieldDefinition` (campos RT deben ser `isBaseField=false`). Nota: hay 6+ objetos mod con el mismo leftover en UPU (campus/career/course/faculty/modality/supportCenter) — candidatos a la misma falla.

## Source

- **Discovered in**: TICKET-077 (supersede el mis-diagnóstico de casteo FK / coerción de TICKET-074 H/074-S3 y TICKET-076 H7 para el caso Plan).
