---
id: BUG-object-manager-002
project: up1
type: bug
module: object-manager
tags:
  - codegen
  - registry
  - core_FieldDefinition
  - isBaseField
  - poison-pill
  - recordtype
  - base-rt-migration
  - deferred
---

# El codegen del registry no reconcilia `isBaseField` cuando un campo migra base↔RT → poison-pill por `@@unique` + abort silencioso del RT + sin cleanup de orphans RT

## Symptom

Tras mover un campo de base a RecordType (o viceversa) en el modelo de un objeto, un `npm run sync` **incremental** (sobre un registry ya poblado) NO se auto-repara: el campo movido queda mal registrado en `core_FieldDefinition` y, peor, los campos que vienen después de él en el mismo RecordType **no se registran en absoluto**. El sync **reporta éxito** (fallo silencioso). En runtime, guardar/clonar el objeto falla con `Unknown argument <campo>` (el campo RT cae al `prisma.<base>.update/create()` porque su fila quedó `isBaseField=true`), y versionar puede fallar si el `versioningConfig` no se pobló. Observado en TICKET-077: `totalCredits` migró base→RT en `rt__Plan__curriculum` y `totalPeriods`/`periodType` (que venían después) nunca se crearon.

## Expected behavior

El re-sync debería ser idempotente y auto-reparable: si un campo cambió de ubicación base↔RT, el codegen debería **reconciliar** la fila existente (dar vuelta `isBaseField` + actualizar tipo/props), no intentar crear una fila nueva que choca con el `@@unique`. Un error en un campo no debería abortar el procesamiento de los campos siguientes del mismo RecordType. Los campos RT-specific eliminados del JSON deberían limpiarse igual que los base.

## Root cause

Tres defectos en `object-manager/src/services/codegen/generatePrismaSchema.js`, presentes de forma **simétrica** en las dos funciones de registro:

1. **El lookup filtra por `isBaseField` en vez de reconciliarlo.** La tabla tiene `@@unique([objectDefinitionId, name])` (una fila por objeto+campo). Pero la búsqueda usa `isBaseField` como predicado:
   - RT-specific: `findFirst({ objectDefinitionId, name, isBaseField: false })` (`:2833`).
   - inherited base bajo RT: `findFirst({ ..., isBaseField: true })` (`:2753`).
   - base: `findFirst({ ..., isBaseField: true })` (`:2448`).
   Cuando un campo migra (ej. `totalCredits` base→RT), la fila vieja quedó con el `isBaseField` opuesto → el lookup da `null` → rama `create` (`:2838`/`:2758`/`:2488`) → **viola el `@@unique`** → throw.

2. **El try/catch envuelve TODO el RecordType / objeto.** En `syncRtFieldsToRegistry` el `try` abre en `:2661` y el `catch` cierra en `:2864` → un throw en un campo aborta el procesamiento del RT entero; los campos que venían después de `totalCredits` (`totalPeriods`, `periodType`, `rotationConfig`) **nunca se crean**. Simétrico en `syncBaseFieldsToRegistry` (try `:2389` / catch `:2566`). El `catch` solo loguea `console.error` → **fallo silencioso** (el sync no aborta, "termina ok").

3. **Sin cleanup de orphans RT-specific.** Solo hay soft-delete (`active=false`) de orphans para `isBaseField=true` (`syncRtFieldsToRegistry` `:2788`; `syncBaseFieldsToRegistry` `:2553`). CERO cleanup para `isBaseField=false`. Además el soft-delete `active=false` **no libera el `@@unique`** (la fila sigue existiendo) → ni siquiera arregla el caso de migración: la fila stale bloquea el `create` igual.

El fix de fondo es el defecto 1: buscar la fila por `(objectDefinitionId, name)` **sin** filtrar por `isBaseField` (ni por `active`), y si existe con el flag/active equivocado, hacer `update` reconciliando `isBaseField` + tipo + props. Eso elimina el choque de raíz. Defectos 2 (try/catch por-campo) y 3 (cleanup de orphans `isBaseField=false`, con cuidado de NO borrar custom fields creados por el usuario vía `updateCustomField`/`createRecordType`) son defensa en profundidad.

## Impact

Cualquier objeto cuyo modelo mueva un campo entre base y RecordType, en re-sync incremental. Hoy **latente y de bajo impacto** (ver Workaround). Se vuelve crítico cuando un tenant tenga datos reales no-reseteables (ver DEC-019 — condición de reapertura).

**Por qué el deploy NO lo auto-repara** (hallazgo S de esta sesión, 2026-06-22):
- `up1-migration-task` (`aws/migration-task-def.json`) solo corre `prisma db push --skip-generate` → aplica el schema relacional, **no toca el registry** (no corre codegen).
- `up1-setup-task` / `up1-setup-upu-task` (`aws/setup-task-def.json`, `aws/setup-upu-task-def.json`) corren `npm run sync` (codegen → registry sync), pero `setup-all-tenants.js` invoca `tenant:create --resume` → "idempotent re-runs (**no destructive reset**)" (`scripts/setup-all-tenants.js:302`). Y `prisma db push` nunca borra filas de `core_FieldDefinition`. → el registry sync corre **incremental sobre las filas existentes** → poison-pill.
- El registry sync (`syncBaseFieldsToRegistry` `:1311`, `syncRtFieldsToRegistry` `:1323`) **no trunca** `core_FieldDefinition`; los `deleteMany` de `dbSync.js` son de roles de layout/suite, no del registry.
- El único camino que regenera limpio (tabla vacía → sin conflicto) es `tenant:reset` (`mods/curriculum-design/scripts/reset-deploy-upu.md`, `scope: local-dev`, "NO usar contra produccion") o un tenant nuevo.

## Reproduction

1. Tener un objeto con RecordType ya sincronizado (registry poblado, ej. `rt__Plan__curriculum` con `totalCredits` `isBaseField=true`).
2. Cambiar el modelo: mover `totalCredits` a campo RT (extensión) en el JSON del RecordType.
3. Correr `npm run sync` full (incremental, sin reset).
4. Observar: `core_FieldDefinition` para `rt__Plan__curriculum` queda con `totalCredits isBaseField=true` (sin reconciliar) y `totalPeriods`/`periodType` AUSENTES; el log trae un `console.error` de unique-violation pero el sync "termina ok". Guardar el objeto en la UI → `Unknown argument totalCredits`.

Mismo mecanismo en sentido RT→base contra `syncBaseFieldsToRegistry`. Unit-testable sin DB: ambas funciones aceptan `prismaClient` inyectable (ver `tests/unit/services/codegen/syncVersioningConfigToRegistry.test.js`) → un prismaClient stub que respete el `@@unique` reproduce el throw.

## Workaround

Mientras todos los tenants sean **seed** (sin datos reales — estado vigente a 2026-06-22): `tenant:reset` (nuke + reseed) antes del sync → la tabla arranca vacía → sin conflicto. Es el mitigante operacional que cubre el bug por completo hoy. Quirúrgico (sin reset): hard-delete manual de las filas envenenadas de `core_FieldDefinition` (por `objectDefinitionId`) antes del full sync.

## Solution

**Diferida** — ver [[reference_up1_core_object_reduction_needs_model_propose]] y DEC-019. No se arregla ahora: con todos los tenants en seed, el reset-from-scratch cubre el bug y no justifica un cambio core-gated en el codegen. **Trigger de reapertura**: primer tenant con datos reales no-reseteables (ahí el reset deja de ser opción y el sync incremental — que envenena — pasa a ser el único camino). Fix previsto (cuando se retome): reconciliar `isBaseField` en el lookup/update (defecto 1, raíz) + try/catch por-campo (defecto 2) + cleanup de orphans `isBaseField=false` preservando custom fields (defecto 3), simétrico en ambas funciones. Es `layer:core` → rama de épica UPONE-1206 + merge gated team up1 (RULE-dev-004).

## Related

- **Specs**: —
- **Decisions**: DEC-019 (diferir el fix; reset-from-scratch lo cubre con seed)
- **Rules**: RULE-curriculum-design-010 (override stale de tenant Base — mecanismo hermano que pobló el estado corrupto en 077)
- **Tickets**: TICKET-077 (origen — diagnóstico del mecanismo), TICKET-074, TICKET-076
- **Bugs**: BUG-object-manager-001 (otro bug — asimetría FK de `updateInstance`, no confundir)
