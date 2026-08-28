---
id: RULE-core-014
project: up1
type: rule
module: core
---

# Capability Sync borra huerfanas y solo asigna nuevas a roles default — rename pierde asignaciones custom

## What

La Fase 3 del sync (`syncCapabilities` en `dbSync.js`) procesa `capabilities.json` de projects y mods con el siguiente comportamiento:

1. **Upsert por `name`**: si la capability existe (find por `name`), hace update de description/riskLevel. Si no existe, hace create.
2. **DELETE de huerfanas**: las capabilities custom (con `objectDefinitionId=null` Y `fieldDefinitionId=null` Y `name NOT LIKE 'system:%'`) que ya NO aparezcan en ningun JSON despues de procesar todos los sources son **eliminadas** de `core_Capability`.
3. **Asignacion automatica a roles default**: las NUEVAS capabilities (las que se crearon en esta corrida del sync) se asignan automaticamente a roles default via `assignNewCapabilitiesToDefaultRoles`. Field-level capabilities (con `.` en el nombre antes del `:`) quedan EXCLUIDAS de esta asignacion automatica.
4. **Admin tiene todas**: `ensureAdminHasAllCapabilities` garantiza que el rol Admin tenga todas las capabilities non-field-level del tenant.

**Implicacion critica para RENAME**: cuando renombras una capability (ej `academicActivity:view` → `activity:view`), el sync:
- Crea la nueva (`activity:view`) y la asigna a roles default + Admin
- Borra la vieja (`academicActivity:view`) por ser huerfana
- **Las asignaciones a roles CUSTOM no-default se PIERDEN silenciosamente** (no hay rename, solo delete + create)

## Why

El sync esta optimizado para el caso comun (agregar/quitar/modificar capabilities) pero NO maneja **renames** preservando asignaciones a roles custom. En entornos de produccion con roles institucionales custom (ej. "Coordinador Academico UNIVALLE" con asignaciones manuales en `core_RoleCapability`), un rename via JSON resulta en perdida silenciosa de permisos.

En entornos sandbox (TEST, UPU) donde las asignaciones son via roles default exclusivamente, el sync ES suficiente para un rename.

Descubrimiento relevante en analisis de UPONE-1100 (HU4 Rename academicActivity → activity, sprint Migracion uAssessment SP2, mayo 2026): el ticket Jira originalmente afirmaba en AC6 que "asignaciones existentes en `core_RoleCapability` y `core_RoleAssignment` se preservan", lo cual es **incorrecto** dado este comportamiento. La estimacion correcta debe incluir un script de migracion de asignaciones si el entorno tiene roles custom afectados.

## Where

**Codigo principal:**
- `up1/object-manager/scripts/sync/dbSync.js` — funcion `syncCapabilities` completa, lineas ~28-118
  - DELETE de huerfanas: lineas ~85-105 (`for (const cap of customCapabilities) { if (!allCapabilityNames.has(cap.name)) { await prisma.core_Capability.delete(...) } }`)
  - Filtro de "customs" (no auto-gen, no system): lineas ~87-95 (`AND: [{ objectDefinitionId: null }, { fieldDefinitionId: null }, { NOT: { name: { startsWith: 'system:' } } }]`)
  - Asignacion a defaults: lineas ~65-78 (`assignNewCapabilitiesToDefaultRoles`)
  - Admin tiene todas: linea ~83 (`ensureAdminHasAllCapabilities`)

**Codigo de scan:**
- `up1/object-manager/scripts/sync/dbSync.js:124+` — `scanProjectCapabilities` (carga desde root projects)
- `up1/object-manager/scripts/sync/dbSync.js` (mas abajo) — `scanModCapabilities` (carga desde mods/*/capabilities.json)

**Documentacion:**
- `up1/object-manager/docs/features/custom-capabilities.md` — documenta los pasos CREATE/UPDATE/DELETE/SKIP pero NO advierte sobre perdida de asignaciones custom en rename
- Confluence: `RBAC & Permisos` (page/1984790532) — overview RBAC

**Schema:**
- `up1/object-manager/prisma/schema.prisma` — modelo `core_Capability`, `core_RoleCapability`, `core_RoleAssignment` (auto-generado, revisar FK on delete behavior)

## When

**Aplica cuando** se ejecute cualquier operacion que toque `capabilities.json`:
- Rename de capability (`X:view` → `Y:view`)
- Eliminacion de capability del JSON
- Cambio de prefix (`mod/X:action` → `X:action` o viceversa)
- Cualquier scope con `npm run sync` o `npm run sync:db`

**Precaucion especial:**
- Antes de hacer rename, verificar si hay asignaciones en `core_RoleCapability` a roles custom (no-default) con la capability vieja
- Si las hay: preparar script de migracion `INSERT INTO core_RoleCapability(roleId, capabilityName) SELECT roleId, '<new-name>' FROM core_RoleCapability WHERE capabilityName='<old-name>' AND roleId NOT IN (<default-role-ids>)` antes del sync, y un DELETE de las viejas despues (o aprovechar la delete del sync)
- En UPU/TEST (sandbox): el sync solo es suficiente, no hay roles custom afectados

## Verification

**Verificacion de codigo:**
```bash
grep -n 'Cleaning up orphaned\|core_Capability.delete\|assignNewCapabilitiesToDefaultRoles\|ensureAdminHasAllCapabilities' up1/object-manager/scripts/sync/dbSync.js
# Debe retornar referencias a las 4 operaciones
```

**Verificacion runtime de DELETE huerfanas:**
1. Agregar capability `test:cap` en algun `capabilities.json`
2. `npm run sync` → confirma `Created: test:cap`
3. Quitar `test:cap` del JSON
4. `npm run sync` → debe loguear `Deleted: test:cap (no longer in any project/mod)`

**Verificacion del riesgo de rename:**
1. Crear capability `foo:view` en mod, sync
2. Crear rol custom "TestRole", asignar `foo:view`
3. Rename a `bar:view` en JSON, sync
4. Consultar `core_RoleCapability` para TestRole: la asignacion a `foo:view` ya no existe, y NO se creo asignacion a `bar:view`

## Source

- **Discovered in**: —
