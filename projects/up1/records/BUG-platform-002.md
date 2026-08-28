---
id: BUG-platform-002
project: up1
type: bug
module: platform
tags:
  - sync
  - layouts
  - orphans
  - dead-code
  - confirmed-empirically
---

# Layouts huerfanos en BD: `deactivateOrphanedAppsLayouts` es codigo muerto

## Symptom

Cuando un mod borra un layout JSON del filesystem y se vuelve a sincronizar, el layout queda activo en BD con su `applicationId` original — aparece como zombie en el menu de la app.

## Expected behavior

El sync deberia desactivar (o borrar) layouts cuyo source JSON ya no existe.

## Root cause

La funcion `deactivateOrphanedAppsLayouts` existe en `dbSync.js:770` pero **no se invoca** desde el flow del sync. Es codigo muerto.

## Impact

UX: usuario ve items "fantasma" en menu lateral. Confusion al click — el layout puede seguir funcionando con data del cache de BD aunque el JSON ya no exista.

## Workaround

Script one-shot via Prisma client por tenant: `UPDATE up1_layen_layout SET isActive=false, applicationId=null WHERE name NOT IN (SELECT name FROM <synced layouts>)`. Solucion correcta: PR a plataforma para invocar `deactivateOrphanedAppsLayouts` despues del sync de cada tenant.

## Empirical confirmation — TICKET-025 (2026-05-18)

Durante TICKET-025 S1.T3 (rename completo Path B de 4 layouts `default_AcademicActivity_* → default_activity_*`) se observo el bug **empiricamente con BD UPU local-dev**:

**Pre-script estado BD UPU**:

```bash
docker exec pg psql -U pg -d uplanner_upu -c "SELECT id, name, \"objectName\", \"layoutType\" FROM up1_layen_layout WHERE name LIKE 'default_AcademicActivity_%' OR name LIKE 'default_activity_%' ORDER BY name;"
```

Output: **8 filas** (4 legacy `default_AcademicActivity_*` con objectName=activity post-HU4 + 4 nuevas `default_activity_*` insertadas por `npm run sync` del rename TICKET-025).

Confirma:
1. `npm run sync` agrega filas nuevas para JSONs renombrados pero NO elimina las viejas
2. El bug es de `dbSync.js` flow — `deactivateOrphanedAppsLayouts` (linea 770) sigue siendo codigo muerto a la fecha 2026-05-18
3. Severity upgrade a `medium`: en TICKET-025 dejaba duplicados 1:1 entre legacy y nuevos — confusion alta para devs y posibles bugs de resolucion (cual id resuelve primero el LayoutOrchestrator?)

**Mitigacion ejecutada en TICKET-025**: script SQL idempotente `scripts/migrations/UPONE-1100-cleanup-academic-activity-layouts.sql` con:

```sql
DELETE FROM up1_layen_layout WHERE name LIKE 'default_AcademicActivity_%';
```

Resultado: `DELETE 4`, verificacion post `legacy_count: 0, new_count: 4` confirma el cleanup. Commit `b757661` curriculum-design.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L20 — Session 1 (2026-04-29) — primera deteccion
- [TICKET-025](../../tickets/ticket-025.md) — Session 1 S1.T3 (2026-05-18) — confirmacion empirica BD UPU local
  - Aprendizaje L5 del ticket: "BUG-platform-002 confirmado empiricamente — sync NO elimina layouts viejos automaticamente"
  - Script de cleanup como referencia operativa para futuros renames de id de layouts
