---
id: DOC-kb-sp7-UPONE-1456-seed-rev2-PLAN-VALIDACION
project: up1
type: doc
---

# UPONE-1456 - Plan de validacion del seed rev.2

> Complementa `INSTRUCCIONES-INTEGRACION.md`. Objetivo: confirmar que los nuevos datos subieron **integramente**, corroborando en 3 capas: **modelo** (el schema los soporta), **DB** (las filas estan, con integridad) y **smoke** (renderizan por el path real del usuario).
> Fundamento: DET-33 (el "corrio sin error" es self-report, no hecho) y DET-36 (evidencia runtime real, no referencia a test file). Un seed puede terminar en verde y aun asi subir datos parciales (ej. el skip silencioso del historial de Activity, o campos que caen a default).

## Conteos esperados (verificados del paquete, 2026-07-24)

| Objeto | Esperado | Fuente |
|---|---:|---|
| AcademicProgram | 20 | programs.array.js |
| Curriculum (Plan) | 20 | curricula.array.js |
| rt__Plan__curriculum | 20 | satelite de cada Plan |
| Activity (mesh) | 301 | _data-mesh.js MALLA_ACTIVITIES |
| requirementCategory | 80 | _data-mesh.js CATEGORIES |
| planEntry | 549 | _data-mesh.js PLAN_ENTRIES |
| curricularSection | 374 | _data-syllabus-sections.js |
| OrgUnit (Faculty CIE/ING) | 2 | _data-offerings.js FACULTIES |
| rt__Faculty__OrgUnit | 2 | anclaje de cada Faculty |
| ActivityLine | 12 | _data-offerings.js LINES |
| offering | 120 | _data-offerings.js OFFERINGS |
| DataLog (si P6 migrado) | 159 | 60 AcademicProgram + 63 Curriculum + 36 Activity (39 - 3 TIR101) |

curricularSection por RecordType (7): Session 176, Content 55, EvaluationComponent 44, LearningOutcome 44, Bibliography 33, CustomSection 11, Modality 11.

> DataLog = 0 si se decide dropear el loader (alternativa P6). Si se migra SIN remapear codigos de Activity, quedarian ~126 (se pierden 33 de Activity en silencio): ese resultado es una **falla** de la validacion, no un estado valido.

## Capa 1 - Modelo (ANTES de correr el seed)

Confirmar que el schema actual (post codegen + sync, contra develop) soporta lo que el seed escribe. Ataja P5/P6 antes de ejecutar.

- [ ] **Existen** los objetos destino: AcademicProgram, Curriculum, Activity, requirementCategory, planEntry, curricularSection (7 RT), offering, ActivityLine, OrgUnit, `core_DataLog`.
- [ ] **Existen** los campos que el seed setea: `Activity.executionUnitId`, `Activity.status` (enum), `Activity.versionLabel`; `ActivityLine.orgUnitId` (not_null); en DataLog: `objectName, recordId, action, changes, metadata, historyKey, userId, createdAt, updatedAt`.
- [ ] **NO existen** (confirma que P5/P6 son necesarios): columnas `Activity.workflowId` / `Activity.currentStatusId`, modelos `workflow` / `workflowStatus` / `changeLog`.
- [ ] `Activity.status` enum contiene `Active` (valor que usa el fix P5).

Metodo: revisar `prisma/schema.prisma` del tenant generado, o consultar via `core_FieldDefinition` (NO usar DMMF - regla del proyecto), o `describe_object` del MCP up1. Grep directo:
```bash
grep -nE "workflowId|currentStatusId|model ChangeLog|model Workflow" object-manager/prisma/schema.prisma   # esperado: 0 lineas
grep -nE "executionUnitId|model DataLog|status " object-manager/prisma/schema.prisma                        # esperado: presentes
```

## Capa 2 - DB (DESPUES de correr el seed, tenant uplanner_upu)

Correr el seed via sync fase 8 y corroborar filas + integridad. SQL: comillas dobles en tablas PascalCase, filtrar por tenant.

### Conteos (deben coincidir con la tabla de arriba)
```sql
SELECT 'AcademicProgram' obj, count(*) FROM "AcademicProgram"
UNION ALL SELECT 'Curriculum', count(*) FROM "Curriculum"
UNION ALL SELECT 'Activity', count(*) FROM "Activity"
UNION ALL SELECT 'requirementCategory', count(*) FROM "requirementCategory"
UNION ALL SELECT 'planEntry', count(*) FROM "planEntry"
UNION ALL SELECT 'ActivityLine', count(*) FROM "ActivityLine"
UNION ALL SELECT 'offering', count(*) FROM "offering"
UNION ALL SELECT 'DataLog', count(*) FROM "core_DataLog";
```

### Integridad (cada query debe devolver 0 filas salvo que se indique)
- [ ] **P1** - Activity sin executionUnit: `SELECT count(*) FROM "Activity" WHERE "executionUnitId" IS NULL;` = 0
- [ ] Activity sin status: `SELECT count(*) FROM "Activity" WHERE "status" IS NULL;` = 0
- [ ] **P2** - ActivityLine sin orgUnit: `SELECT count(*) FROM "ActivityLine" WHERE "orgUnitId" IS NULL;` = 0 (y = 12 filas totales)
- [ ] planEntry huerfanos: filas con `activityId`/`planId` que no matchean Activity/Curriculum = 0
- [ ] requirementCategory huerfanos: `curriculumId` sin Curriculum = 0
- [ ] offering huerfanos: `activityLineId` sin ActivityLine = 0
- [ ] Faculties: `SELECT code FROM "OrgUnit" WHERE code IN ('UPU-FAC-CIE','UPU-FAC-ING');` = 2 filas
- [ ] **P6** (si migrado) - DataLog con recordId huerfano: entradas cuyo `recordId` no resuelve a fila real = 0; `action` fuera del enum = 0; `historyKey` null = 0
- [ ] **P6** - historial de Activity remapeado: `SELECT count(*) FROM "core_DataLog" WHERE "objectName"='Activity';` = 36 (no 6, no menos: confirma que el remap curado->mesh funciono y TIR101 se dropeo)

### Idempotencia y guard
- [ ] Correr el seed 2 veces NO duplica (guard por code / claves naturales). Re-contar: mismos numeros.
- [ ] Guard UPU: con tenant != UPU los loaders hacen skip (no escriben).

Metodo: `psql` a `uplanner_upu`, o `npm run tenant:studio` (Prisma Studio), o count queries por GraphQL / `query_records` del MCP.

## Capa 3 - Smoke (runtime, por el path real del usuario)

Los datos deben **renderizar**, no solo existir. El RecordList filtra columnas a campos reales del objeto; validar por el alias RT del mod, no por la API base (aprendizaje UPONE-1380). Evidencia runtime real (screenshot / DOM / console con marca de corrida), no referencia a archivo de test.

- [ ] Login UPU (Clerk test mode: `eduardo.bacon+clerk_test`, OTP `424242`).
- [ ] RecordList AcademicProgram: 20 filas.
- [ ] RecordList Curriculum/Plan: 20. Abrir una malla -> planEntry por periodo + requirementCategory + lineas de formacion visibles.
- [ ] Programa de asignatura (Activity): abrir uno del mesh (ej. `C-CALCULOI-001`) -> **columna Unidad Organizativa NO vacia** (confirma P1 en UI), status `Active`, secciones de syllabus (Sessions/Content/Evaluation/etc.).
- [ ] Offerings/ActivityLine: las 12 lineas con orgUnit CIE/ING.
- [ ] **Historial (visor DataLog)**: abrir un AcademicProgram y un Curriculum con historial -> ver entradas. Abrir una Activity remapeada (`C-CALCULOI-001`, ex `MAT101`) -> ver sus 3 cambios (confirma remap end-to-end). Verificar que **no** aparezcan codigos viejos (`MAT101`, `TIR101`...).

Metodo: MCP up1 (`query_records`, `cd_get_mesh`, `get_change_history`) o navegacion real por la UI (browser/Playwright), no atajos por la API base.

## Criterio de aprobacion

Pasa solo si: **(1)** Capa 1 confirma que workflow/changeLog no existen y executionUnit/status/DataLog si; **(2)** Capa 2 da los conteos exactos de la tabla + todas las integridades en 0 huerfanos + Activity en DataLog = 36; **(3)** Capa 3 muestra evidencia runtime real de programas, malla, executionUnit poblado e historial remapeado. Cualquier conteo por debajo (skip silencioso) es falla, no verde.
