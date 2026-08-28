---
id: BUG-core-001
project: up1
type: bug
module: core
tags:
  - object-manager
  - codegen
  - prisma
  - recordtype
  - seed
  - uengagement-up1
  - schema-drift
---

# Colisión de nombre `Student` en codegen rompe `model Student` y el seed (+ drift de modelos `uc*` huérfanos)

## Symptom

`npm run tenant:create -- UPU --recreate --force` (reset desde 0) llega al seed y muere con:

```
TypeError: Cannot read properties of undefined (reading 'findFirst')
  at prisma/UPU/seed.js:4504  ->  await prisma.student.findFirst(...)
```

`prisma.student` es `undefined`: el schema regenerado **no contiene `model Student`** pese a que `objects/business/Base/student.json` (de uengagement-up1) existe y el mod targetea UPU en su `config/app.json`.

## Expected behavior

uengagement-up1 declara `Student` como objeto standalone (FK opcional `userId → core_User`) y targetea todos los tenants. El codegen debería generar `model Student` en cada tenant; `seed.js` (`prisma.student`) debería resolver.

## Root cause

**Colisión de título.** Existen dos definiciones con `"title": "Student"`:

1. `objects/business/RecordTypes/rt__Student__core_user.json` — **ejemplo legacy committeado** (commit `b3ae122` *"added examples"*, `baseObject: core_User`), modela Student como RecordType de `core_User`.
2. `student.json` de **uengagement-up1** — el modelo standalone real del dominio engagement.

El codegen deduplica objetos por `title` → gana el RecordType de ejemplo → genera `rt__Student__core_user` y **no** `model Student` standalone → `seed.js` falla.

### Drift relacionado surgido en el mismo análisis

- El `develop` de object-manager arrastra **~150 modelos `ext__uplanner__uc*` huérfanos** committeados en los schemas prisma **sin objeto source** (`find objects -iname "*uc*"` vacío). Un codegen fresco no los regenera. Origen: merges viejos que dejaron generados drifteados respecto a la fuente.
- Los artefactos core (`business/`, schemas, seeds) en develop estaban generados **sin** uengagement-up1: el mod existe en develop pero nunca se hizo el sync+commit que lo integrara al core.

## Impact

- Reset/seed de cualquier tenant con uengagement falla → no se puede levantar el entorno desde 0.
- Los schemas committeados en develop no reflejan la fuente (modelos huérfanos + mod no integrado) → cualquier regen produce diffs grandes/destructivos si no se entiende la causa.

## Fix

Resuelto en rama `UPONE-1206` (commit `0166bd4`, pendiente de PR/merge a develop):

1. **Eliminar** `objects/business/RecordTypes/rt__Student__core_user.json` (el ejemplo colisionante).
2. Mergear objetos de uengagement-up1 a `business/` (`npm run sync:files`) y **regenerar los 17 schemas** (`npm run codegen -- <tenant>`): aparece `model Student`, se eliminan los `uc*` huérfanos.

Validado end-to-end: tras el fix, `tenant:create -- UPU --recreate` llega a **"✅ TENANT READY"** (migrate headless vía baseline regen §7 + seed completo). Tests verdes (object-manager 1870, uengagement-up1 34, curriculum-design 639).

> **Pendiente equipo**: al mergear a develop, el drop de los ~150 `uc*` huérfanos en un `db push`/deploy real dropearía esas tablas donde existan. Validar impacto fuera de dev/sandbox.

## Workaround (si no se aplica el fix)

Ninguno limpio: sin eliminar el RecordType de ejemplo, codegen no emite `model Student` y el seed seguirá fallando.

## Source

- Merge-up SP3 ramas UPONE-1206 / UPONE-1038 (sesión 2026-06-09).
- Ver [RULE-dev-006](../../rules/dev/rule-dev-006.md) (tests obligatorios post-merge; no hand-merge de generados).
