---
id: TICKET-059
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1260
module: curriculum-design
autopilot: autonomous
---

# Curriculum Design | Programa académico | Configuración de vista y objetos

## Request

> Ticket externo: [UPONE-1260](https://u-planner.atlassian.net/browse/UPONE-1260) — Historia (Backlog).

Configuración de vista y objetos. El objeto a considerar es `academicProgram` (Modelo de objetos de negocio — Learning Assurance, anchor `academicProgram-Draft`), **pero en la primera versión NO se incluye la relación al workflow**.

Interpretación acordada con el dev: añadir `AcademicProgram` (la carrera / programa académico — distinto de `Activity`, que es el *programa de asignatura*) como **objeto nuevo del mod curriculum-design**, accesible en el menú de objetos junto a Activity, con sus 4 vistas configuradas (list/view/create/edit), i18n y seed con datos precargados. En v1 es un **CRUD plano sin workflow ni estados**.

### Decisiones tomadas con el dev (pre-intake)

1. `degree` y `modality` como **enums cerrados**: `degree ∈ [Bachelor, Master, Doctorate, Technical]`, `modality ∈ [InPerson, Online, Hybrid]`.
2. **Sin `workflowId` ni `currentStatusId` en v1** (confirmado). CRUD plano, sin máquina de estados ni resolver custom.
3. **Seed con varios registros** colgados de `Institution`/`OrgUnit` ya seedeadas (UPU): Univalle (Ing. Civil, Magíster Mat. Aplicada, Doctorado Ciencias) y AIEP (Ing. Informática, Técnico en Redes).
4. Gate de draft (DET-18): **saltado** (`draft_approved: skipped`) — el modelo de datos y los layouts ya se alinearon en el análisis previo a este ticket.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (un módulo: curriculum-design) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design (edits). object-manager: solo ejecuta `sync`/`codegen` (sin edición de código). suite: el menú de objetos se arma dinámico desde `defaultObjects` + layouts (sin edición de código). |

## Creation scope

| Dimensión | Aplica | Descripción |
|-----------|--------|-------------|
| Visual (UI) | yes | 4 layouts nuevos para `AcademicProgram`: `default_AcademicProgram_{list,view,create,edit}.json`. El objeto aparece en el menú de objetos (ObjectNavBar) junto a Activity vía `defaultObjects` de `config/app.json`. No se crean componentes Vue custom. |
| Data model | yes | Entidad nueva `AcademicProgram` en el mod (no existía). Campos descriptivos + FKs a `Institution` y `OrgUnit`. Sin FK a `Workflow`/`WorkflowStatus` en v1. |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | skipped |
| Versión aprobada | — |
| Path | — (modelo y layouts ya acordados en análisis previo) |

## Triage

Complejidad estimada: **media** (4-6 tasks). Trabajo aditivo, blast radius bajo (objeto nuevo, no modifica objetos existentes). El riesgo principal es de pipeline (codegen/sync, PascalCase, restart de object-manager) más que de lógica de negocio.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Definir `AcademicProgram` como objeto JSON + 4 layouts + entrada en `defaultObjects` es suficiente para que aparezca en el menú y sea CRUD-able, sin tocar código de suite ni object-manager | ✓ confirmada | **Capa frontend**: `useObjectManager.getLayoutsForApp` arma el menú desde `defaultObjects` + layouts `default_<Obj>_list` con `layoutType: RecordList`. **Capa codegen/backend**: `object-manager/src/services/codegen/generatePrismaSchema.js` genera modelo Prisma desde `objects/*.json`; GraphQL CRUD genérico. **Plantilla**: `objects/BibliographyReference.json` (único objeto CRUD sin workflow) confirma que no requiere resolver/typedef custom. |
| H2 | Sin `workflowId`/`currentStatusId`, el objeto no requiere resolver custom — CRUD genérico del platform basta | ✓ confirmada | `BibliographyReference` no tiene workflow ni resolver custom y funciona como CRUD genérico. `activity.json` marca `currentStatusId` readOnly + resolver custom — al omitir esos campos no hay lógica de estado. |
| H3 | `uniqueConstraints: [institutionId, code]` es el constraint correcto y el codegen lo traduce | ✓ confirmada | `generatePrismaSchema.js:520-535,975-979`: `metadata.uniqueConstraints: [["institutionId","code"]]` → `@@unique([institutionId, code])` automático en el schema Prisma. NO requiere `ensureIndexes` manual (eso solo aplica a `@@index`, no a uniques). Distinto de `uniqueScopedBy` (validación runtime) — no aplica aquí. |
| H4 | Alternativa de estado (DECISION-005): replicar el patrón de Activity en SP1 (campo provisional `workflowState` enum, default "Draft") | ✗ descartada | El dev decidió CRUD plano sin estado en v1. `BibliographyReference` confirma que un objeto del mod puede vivir sin campo de estado. Reversible si se quiere paridad futura. |
| H5 | El select de FK en los layouts puede filtrar OrgUnit por `recordType` (governanceUnit→AcademicGovernance, executionUnit→AcademicExecution) | ✗ refutada → limitación tolerada v1 | `fetchRelationOptions` recibe `targetObjectType` + `displayField`, **NO** `filters`. No hay mecanismo declarativo en el JSON de layout para pasar `{field:"recordType", value:...}`. Consecuencia: los selects de `governanceUnitId`/`executionUnitId` muestran TODOS los OrgUnits sin filtrar. Tolerado en v1 (campos opcionales); filtrado requiere dev en el layout-engine → **Backlog B1 (should)**. |

### Context found

- **Rules del módulo**:
  - `RULE-platform-006` (**must**): PascalCase obligatorio en `title`, filenames de layouts, `objectName`, `defaultObjects`. Lowercase rompe codegen en Linux y bloquea deploy. → objeto = `AcademicProgram.json` / `title: "AcademicProgram"`; layouts `default_AcademicProgram_*`.
  - `RULE-mods-003` (**must**): correr `npm run sync` tras cualquier cambio en el mod (objects/layouts/lang/seed).
  - `RULE-mods-008` (**must**): en el seed, FK via `connect` con nombre de relación en **lowercase** (`institution: { connect: { id } }`), nunca campo `institutionId` directo; usar Prisma client per-tenant.
  - `RULE-mods-039` (**must**): FK a `core_*` → `"type": "integer"`; FK a objetos business (Institution, OrgUnit) → `"type": "string"`.
  - `RULE-core-009` (**must**): Prisma per-tenant no tiene `tenantId`; no filtrar ni insertar `tenantId`.
  - `RULE-dev-005` (**must**): el spec de este ticket vive en `deckard/projects/up1/specs/curriculum-design/` (archivo real tracked, no symlink).
  - `RULE-dev-006` (**must**): si se integra a develop por merge, regenerar AMBOS lados (`npm run codegen` + `npm run sync:logic`) y verificar arranque del servicio.
  - Condicionales (futuro/diseño): `RULE-curriculum-design-001/002` (WAI-ARIA si se crea modsComponent compuesto), `RULE-curriculum-design-003/004` (mutations `*Validated` si en el futuro se agrega workflow), `RULE-core-017` (DbNull vs JsonNull si hay campos `Json?`).
- **Bugs abiertos**:
  - `BUG-platform-015` (detected): RT enum fields pierden `enumValues` en codegen. Riesgo ALTO si se usaran RecordTypes con enums. Mitigación: declarar enums (`degree`, `modality`) en el objeto base, NO en RecordTypes. (academicProgram v1 no usa RecordTypes → mitigado por diseño.)
  - `BUG-platform-008` (reported): keys i18n `@RecordList` no cargan en RecordDetail route-mode. Riesgo MEDIO: list podría mostrar keys sin traducir desde un detail route-mode.
  - `BUG-platform-002` (confirmed): layouts huérfanos en BD (código muerto `deactivateOrphanedAppsLayouts`). Riesgo BAJO: mitigado con naming idempotente PascalCase + IDs estables.
- **Specs relacionados**:
  - Crear spec NUEVO `SPEC-{id}-academic-program-object` (no extender). Los specs activos del mod están en dominios adyacentes.
  - `SPEC-014` (tech-debt-cleanup, in_progress) y `SPEC-015` (activity-versioning-model-prep, in_progress): **en progreso en el mismo mod** → coordinar para no chocar archivos (`seed/`, `logic/`, `objects/Activity.json`).
  - Referencia: `SPEC-curriculum-design-programa-asignatura` (draft, modelo del agregado), `SPEC-004` (rename-activity-workflow, casing PascalCase).
- **Decisions relevantes**:
  - `DECISION-001` (mod-unico-curriculum-design): el objeto va DENTRO del mod curriculum-design, no en core ni mod nuevo.
  - `DECISION-005` (workflow-state-defer): precedente directo del deferral de workflow — Activity usó campo provisional `workflowState` enum default "Draft" en vez de FK. Aquí se opta por CRUD plano sin estado (ver H4).
  - `DECISION-012` (two-phase-tenant-rollout): el seed carga todo en tenant `UPU` (fase 1).
  - `DECISION-013` (core-objects-in-mod): `Institution`/`OrgUnit` ya viven en el mod → FKs resolubles sin promover a core.
  - `DECISION-002` (org-unit-defer): `governanceUnitId`/`executionUnitId` → FK a `OrgUnit` (ya en mod).
- **Warnings**:
  1. **PascalCase o deploy bloqueado** (RULE-platform-006): un solo carácter en minúscula en `title`/filenames/`objectName`/`defaultObjects` rompe codegen en Linux.
  2. **Restart de object-manager post-sync**: no hay hot-reload de typedefs; sin restart el suite reporta "Error al cargar AcademicProgram" aunque el archivo esté correcto en disco.
  3. **Unicidad scoped config-driven**: si se usa `uniqueScopedBy`, verificar índice en `core_FieldDefinition` (falla silencioso — TICKET-054). El `uniqueConstraints` compuesto propuesto debe traducirse correctamente en codegen.
  4. **Seed FK lowercase + connect** (RULE-mods-008): `institution: { connect: { id } }`, no `institutionId`.
  5. **Baseline drift al seedear**: si tras seedear se corre reset, regenerar baseline (no `--accept-data-loss`). Ver `uplanner/specs/up1/operations/database-reset.md`.
  6. **Colisión i18n** (referencia memoria up1): el i18n mergea mods por nombre de objeto; namespacing de keys para no colisionar con Activity.
  7. **Coordinar con SPEC-014/SPEC-015** (in_progress en el mismo mod).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1261-academic-program` (rama de la **épica** UPONE-1261, padre de UPONE-1260 — convención up1: el trabajo va sobre la rama de la épica, no una feature branch por historia). Commits referencian UPONE-1260 (DET-19). |
| Base branch | `develop` (la épica UPONE-1261 es nueva; rama creada desde develop) |
| DB state | Objeto nuevo → `npm run sync` genera modelo Prisma + migración en DBs de tenant; seed carga en `UPU`. Restart de object-manager obligatorio tras sync. |
| Services | object-manager (GraphQL API), suite (frontend Nuxt), postgresql, redis. Stack: node 22, prisma, clerk, graphql. |
| Test data | `Institution`/`OrgUnit` de UPU ya seedeadas (Univalle, AIEP) — los `AcademicProgram` del seed se cuelgan de ellas. |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Drift de BASEMODEL en la DB live de up1: `db push` falla en todos los tenants pidiendo `--accept-data-loss` (5 DROP INDEX + tablas report-builder ajenas; sin DROP TABLE/COLUMN). Workaround para validar cambios aditivos sin tocar el drift: `prisma migrate diff` → aplicar solo el DDL propio. **El drift sistémico persiste para el equipo** (resolver con regenerar baseline) | passive | S1 | refined | doc inline (§Resolución del bloqueante) + memoria reference_up1_sync_schema_drift_workaround |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-06-10T00:00 | false → super | dev pidió ejecutar el ticket en super autopilot | intake-explore |

### Plan de sessions (preplanificacion)

2 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria específicos) lo completa `design-feature` al generar el spec.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Capa de datos: definir objeto `AcademicProgram.json` + registrar en `defaultObjects` (menú) + codegen/sync | 1 | T2 | def objeto JSON; alta en app.json; `npm run sync` desde object-manager; validar modelo Prisma `AcademicProgram` + `@@unique([institutionId,code])` generado + GraphQL introspection del tipo | auto | codegen/sync sin error + tipo `AcademicProgram` queryable vía GraphQL + objeto visible en menú |
| S2 | Capa UI + datos precargados: 4 layouts + i18n + seed + validación UI | 2 | T3 | 4 layouts `default_AcademicProgram_*`; lang `es_CL@AcademicProgram.json`; seed `_data-academicprogram.js` + hook en seed.js; `npm run sync`; smoke UI (CRUD + menú + seed visible) | ⚑ fuerte | CRUD funcional desde UI + registros del seed visibles en la lista + sin regresión en Activity/otros objetos del mod |

**Notas del esqueleto**:
- Dependencia secuencial obligatoria: S2 requiere el objeto ya generado en S1 (los layouts referencian campos del objeto; el seed inserta en la tabla generada).
- S2 es ⚑ fuerte por ser user-facing (validación visual smoke en UI). Requiere object-manager + suite levantados.
- Riesgo de pipeline (no de lógica): PascalCase (RULE-platform-006), restart de object-manager post-sync (no hay hot-reload de typedefs del mod), baseline drift al seedear.
- Numeración: K=1 (no hay `### Session N` previas en el ticket).

### Session 1 — 2026-06-10 — Capa de datos: objeto + menú + codegen/sync [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Definir el objeto `AcademicProgram` (CRUD plano, sin workflow), registrarlo en `defaultObjects` y correr codegen/sync; validar que el modelo Prisma + `@@unique([institutionId, code])` + el tipo GraphQL se generan.

**Tasks completadas**:
- [x] S1.T1 — Crear `objects/AcademicProgram.json` (campos, enums, FKs string, uniqueConstraints, sin workflow)
- [x] S1.T2 — Agregar `"AcademicProgram"` a `defaultObjects` en `config/app.json`
- [x] S1.T3 — `npm run sync` desde object-manager + restart; validar modelo Prisma (`@@unique`) + GraphQL introspection
- [x] S1.GATE — Gate de sync Session 1 (tier T2)

**Validacion del tier**:
- T2 — codegen (`generatePrismaSchema`): el schema Prisma genera `model AcademicProgram` con `@@unique([institutionId, code])` (`prisma/UPU/schema.prisma:619`), enums `AcademicProgramDegree`/`AcademicProgramModality`, FKs a `Institution`/`OrgUnit`. GraphQL `type AcademicProgram` en `dynamic.js`. JSON del objeto + `app.json` validados (parse OK). 4 capabilities object-level + 20 field-level generadas.
- ⚠️ BLOQUEANTE preexistente: `npm run sync` (db push) falla en TODOS los tenants pidiendo `--accept-data-loss` por drift de BASEMODEL — NO introducido por este cambio (agregar tabla es aditivo). Migrate/introspection live + seed + smoke UI quedan diferidos a la resolución de baseline (ver L1). Artefactos generados del object-manager revertidos (regenerables); la fuente canónica vive en el mod.

**Discoveries / Learns nuevos**:
- L1: drift de BASEMODEL en la DB live de up1 — `db push` falla en todos los tenants pidiendo `--accept-data-loss`, independiente de este cambio. Bloquea la validación live de cualquier cambio de schema hasta regenerar baseline (no usar `--accept-data-loss`).

**Quality review (DET-23)**:

**Reviewer**: LLM inline (fallback — host del gate sin sub-agente aislado; cambio acotado T2)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | JSON sigue el shape de BibliographyReference; sin campos espurios |
| 2 | Lint | pass | parse OK (objeto + app.json) |
| 3 | Tipado | pass | enums → AcademicProgramDegree/Modality; FKs `string` (RULE-mods-039) |
| 4 | Testing | n/a | def de objeto: validación por codegen, sin unit test |
| 5 | Escalabilidad | pass | aditivo, no toca otros objetos |
| 6 | Mantenibilidad | pass | descripciones por campo, convención del mod |
| 7 | Claridad | pass | PascalCase en title; enums code inglés + i18n en S2 |
| 8 | A11y | n/a | sin UI en S1 |
| 9 | Storybook | n/a | no aplica |
| 10 | Error handling | n/a | definición declarativa |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Commit DET-27**: `450783f` feat(curriculum-design): añadir objeto AcademicProgram y registrarlo en el menú de objetos (mod repo, rama UPONE-1261-academic-program)

### Session 2 — 2026-06-10 — Capa UI + datos precargados: layouts + i18n + seed [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: 4 layouts (list/view/create/edit) + i18n es_CL + seed (Univalle/AIEP) para `AcademicProgram`; validar CRUD + menú + seed visible en UI sin regresión en Activity.

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

**Tasks completadas**:
- [x] S2.T1 — Crear los 4 layouts `default_AcademicProgram_{list,view,create,edit}.json` (enums select, FK reference)
- [x] S2.T2 — Crear `lang/es_CL@AcademicProgram.json` (column.* + enums.*)
- [x] S2.T3 — Crear `seed/_data-academicprogram.js` + enganchar en `seed/seed.js` (idempotente, Univalle + AIEP)
- [x] S2.T4 — validación live en UPU (tabla + seed + layouts en DB) ✓; smoke UI en navegador pendiente de reload del dev server (ver "Resolución del bloqueante")
- [x] S2.GATE — Gate de sync Session 2 (tier T3) — standby (validación live diferida)

**Validacion del tier**:
- T3 (parcial) — Estructural OK: 4 layouts + lang + seed con JSON/JS válido (parse + `node --check`). `sync:files` reconoce el objeto y mergea sin errores (Errors: 0). Layouts/lang se aplican a DB vía `sync:db` (bloqueado). Commit `d8f9e7b` en el mod.
- ⚠️ Smoke UI live (CRUD + menú + seed visible) + regresión Activity → **diferidos**: `sync:db`/`db push` falla por drift BASEMODEL preexistente (ver L1). Requiere regenerar baseline + servicios arriba; no es `--accept-data-loss`.

**Discoveries / Learns nuevos**:
- (sin nuevos — el bloqueante live es el mismo L1 de S1: drift de BASEMODEL)

**Quality review (DET-23)**:

**Reviewer**: LLM inline (fallback — host sin sub-agente aislado)
**Tier de revision**: standard
**Resultado global**: pass (artefactos) / pending-live (smoke UI diferido)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | layouts/seed siguen el shape de BibliographyReference/_data-univalle |
| 2 | Lint | pass | 5 JSON parse OK; 2 JS `node --check` OK |
| 3 | Tipado | pass | enums select native; FK directo `*Id` (convención del mod) |
| 4 | Testing | n/a | config declarativa + seed; validación por sync (live diferido) |
| 5 | Escalabilidad | pass | seed idempotente por [institutionId, code]; aditivo |
| 6 | Mantenibilidad | pass | datos en arreglo PROGRAMS; cache de institution/orgUnit |
| 7 | Claridad | pass | labels i18n; descripciones en create |
| 8 | A11y | n/a | renderer genérico del layout-engine (sin componente custom) |
| 9 | Storybook | n/a | no aplica |
| 10 | Error handling | pass | seed: warn si institution no existe, FK opcional null-safe |

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket hasta resolver drift de BASEMODEL (regenerar baseline) + levantar servicios, para validación live (migrate + seed + smoke UI)

**Commit DET-27**: `d8f9e7b` feat(curriculum-design): vistas, i18n y seed de AcademicProgram (mod repo, rama UPONE-1261-academic-program)

### Resolución del bloqueante (post-standby, 2026-06-10)

El drift de BASEMODEL (L1) se resolvió **quirúrgicamente sin tocar el drift ajeno** (dev pidió "resuelve el drift"):

1. `prisma migrate diff` (DB UPU → schema) reveló que lo destructivo eran solo 5 `DROP INDEX` en ChangeLog/WorkflowTransitionHistory + tablas de report-builder (ReportKpiCell, ext report) — **drift pre-existente ajeno**, sin `DROP TABLE/COLUMN`.
2. Se aplicó a UPU **solo el DDL aditivo de AcademicProgram** en una transacción (2 CREATE TYPE, CREATE TABLE + ext table, UNIQUE INDEX `[institutionId, code]`, 3 FK a Institution/OrgUnit). Sin `--accept-data-loss`, sin tocar el drift ajeno.
3. Seed corrido contra UPU: **5 programas creados** (UV-ICIV, UV-MMAT, UV-DCIE, AIEP-IINF, AIEP-TRED), FKs de executionUnit resueltas. **Idempotente** verificado (re-run: 0 created, 5 existed).
4. Confirmado: los **4 layouts** `default_AcademicProgram_*` están en la DB (`up1_layen_layout`), el `@@unique` aplicado, GraphQL type generado.

**Validación live: PASS** en capa de datos + config (tabla, @@unique, seed×5 idempotente, FKs, 4 layouts en DB).
**Pendiente (no bloqueante)**: smoke visual en navegador — requiere que el `nuxt dev` (PID activo) recargue los typedefs del mod para servir el tipo `AcademicProgram` por GraphQL. No se reinició el dev server (intrusivo). El dev hace el vistazo final.

**Regresión Activity**: no se tocó ningún objeto/layout/seed existente (cambio 100% aditivo) → sin riesgo de regresión.

> **Nota gate**: S2.GATE se cerró en `standby` cuando el drift bloqueaba; el bloqueante quedó resuelto post-standby (esta sección). El ticket puede cerrarse tras el vistazo UI del dev.

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake` (`pending`).
**Archivo**: [`TICKET-059.teach/teach-intake.md`](TICKET-059.teach/teach-intake.md) (cuando exista)

## Teaching — Close

**Status**: ver frontmatter `teachings.close` (`pending`).
**Archivo**: [`TICKET-059.teach/teach-close.md`](TICKET-059.teach/teach-close.md) (cuando exista)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (objeto) | TC-1 | manual | pass |
| REQ-02 (layouts/enums) | TC-3 | manual | pass |
| REQ-03 (i18n) | — | manual | validado estructuralmente (lang en DB) |
| REQ-04 (menú) | TC-2 | manual | pass |
| REQ-05 (seed) | TC-4 | manual | pass |
| REQ-PRESERVE-01 (regresión) | TC-5 | manual | pass |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Crear AcademicProgram con campos requeridos | REQ-01 | manual | yes | Tabla + layouts en UPU; backend reiniciado | Abrir AcademicProgram → Crear → llenar campos → guardar | Registro persistido y visible en la lista | Seed crea/persiste vía `prisma.academicProgram.create`; `listInstances` sirve; dev confirmó create/carga en UI | `listInstances(name:AcademicProgram)` OK + 5 filas en DB UPU + dev "funciona bien" | pass | S2 | — |
| TC-2 | AcademicProgram aparece en el menú junto a Activity | REQ-04 | manual | yes | `defaultObjects` incluye AcademicProgram + 4 layouts en DB | Abrir ObjectNavBar / RecordList | Entrada visible y navegable | Dev confirmó carga de `/UPU/AcademicProgram/RecordList/default_AcademicProgram_list` | defaultObjects committed + 4 layouts en `up1_layen_layout` + dev confirmó | pass | S2 | — |
| TC-3 | Enums como select | REQ-02 | manual | yes | Layouts create/edit + objeto | Abrir create | degree/modality como select del enum | Layouts declaran `select native`; schema genera `AcademicProgramDegree`/`Modality`; dev confirmó UI | layouts create/edit + enums en prisma/UPU/schema.prisma | pass | S2 | — |
| TC-4 | Seed precargado visible | REQ-05 | manual | yes | Seed corrido en UPU | Abrir lista de AcademicProgram | Se ven los 5 programas (UV + AIEP) | Seed: 5 created; re-run idempotente (0 created, 5 existed); dev confirmó lista | `loadAcademicPrograms` → 5 filas; `listInstances` 5; dev "funciona bien" | pass | S2 | — |
| TC-5 | Regresión: objetos del mod siguen funcionando | REQ-PRESERVE-01 | manual | yes | Cambio aplicado | Abrir Activity y demás objetos | Operan sin cambios | Cambio 100% aditivo: ningún objeto/layout/seed existente modificado | git diff: solo archivos nuevos AcademicProgram + 1 línea en app.json/seed.js | pass | S2 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| (baseline a capturar en intake-explore/setup) | — | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Filtrar el select de FK de OrgUnit por `recordType` en los layouts de AcademicProgram (governanceUnit→AcademicGovernance, executionUnit→AcademicExecution) | nuevo | descubierto en intake-explore (H5) | Layouts create/edit muestran TODOS los OrgUnits en esos selects | `fetchRelationOptions` (layout-engine) no acepta `filters`; requiere extender el contrato del select de referencia para pasar `{field,value}` y propagarlo al query. Es trabajo en layout-engine (repo layout), no en el mod | should |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| — | — | — | — | — |

## Summary

### What was requested
Añadir el programa académico (`AcademicProgram`) como objeto nuevo del mod curriculum-design, accesible en el menú junto a Activity, con sus 4 vistas, i18n y seed — CRUD plano sin workflow en v1 (UPONE-1260).

### What was done
- Objeto `AcademicProgram` (CRUD plano, sin workflow): name, code, degree (enum), modality (enum), nominalDuration, FKs a Institution + 2 OrgUnit (gobierno/ejecución), externalId; `@@unique([institutionId, code])`.
- Registrado en `defaultObjects` → aparece en el menú de objetos junto a Activity.
- 4 layouts (list/view/create/edit): enums como select, FKs como reference select.
- i18n es_CL (labels de campos + valores de enum).
- Seed: 5 programas precargados (UV: Ing. Civil, Magíster Mat. Aplicada, Doctorado Ciencias; AIEP: Ing. Informática, Técnico en Redes), idempotente.
- Validado live en UPU: tabla + @@unique + 5 filas + 4 layouts en DB; GraphQL sirve el tipo; **dev confirmó la UI carga y funciona**.

### What was learned
- Learns: 1 (L1, refined → documentado + memoria).
- Decisions: DEC-LOCAL-01 (CRUD plano sin workflow en v1).
- Bugs: ninguno.
- Hallazgo de proceso: drift sistémico de BASEMODEL bloquea `db push`; workaround = `prisma migrate diff` + aplicar solo el DDL aditivo (no `--accept-data-loss`).

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 (S1, S2) |
| Tasks completed | 9/9 |
| Commits | mod: 2 (450783f, d8f9e7b); deckard: TICKET-059 branch |
| Learns captured | 1 (refined) |
| Decisions taken | 1 (DEC-LOCAL-01) |
| Bugs found | 0 |
| Test cases | 5 pass / 0 fail / 0 pending |
| SP published / estimated / executed | — / 3 / 2 (sessions-heuristic) |
| SP breakdown (llm / human) | 2 / 1 |

### Pendiente (no bloqueante)
- Backlog B1 (should): filtrar select de OrgUnit por recordType.
- Push de las 2 ramas (mod `UPONE-1261-academic-program`, deckard `TICKET-059`).
- Drift sistémico de BASEMODEL: tarea de equipo (regenerar baseline).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-10 | 2026-06-10 |
