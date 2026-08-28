---
id: SPEC-la-objects-model-CHANGELOG
project: up1
type: doc
module: learning-assurance
status: active
tags:
  - learning-assurance
  - modelo-objetos
  - changelog
  - versionado
---

# Modelo de objetos LA — CHANGELOG

Tracking de cambios al modelo de objetos del dominio Learning Assurance + capa transversal.

Tres capas de cambios:
1. **Cambios upstream de Confluence** — evolucion de la pagina canonica v1.0..v1.10 (tabla "Versión" verbatim).
2. **Evolucion por objeto cross-version** — vista por objeto con su historia de cambios.
3. **Delta accionable entre snapshots** — diff entre lo que tenemos vs lo que queremos al cerrar el sprint nuevo.

---

## Tabla "Versión" (verbatim de Confluence v1.10)

| Version doc | Fecha | Resumen del cambio |
|---|---|---|
| 1.0 | 2026-04-24 | Documentacion inicial con estados de madurez por objeto (Draft / En implementacion / Implementado). 26 objetos: 3 plataforma + 23 LA. Estados iniciales: 6 en implementacion (organization, institution, orgUnit, activity, curricularSection, bibliographyReference); 20 en Draft. |
| 1.1 | 2026-04-24 | Ampliacion de la documentacion: todos los objetos con spec completa independiente del estado. Agregados 7 mapas de informacion principales (capa organizacional, ciclo curricular, modelo de competencias, cadena de logro, flexibilidad del plan, auditoria y workflow, MADS). |
| 1.2 | 2026-04-24 | Estados de madurez con componente nativo de Status de Confluence (Grey/Yellow/Green). |
| 1.3 | 2026-04-24 | Reorganizacion de headers. Removidas sub-secciones detalladas de Workshop, Tutoring y Seminar en activity — solo Course documentado. |
| 1.4 | 2026-04-24 | Recordtypes en tablas estructuradas (Campo / Tipo / Requerido / Notas), trazabilidad uniforme. |
| 1.5 | 2026-04-25 | **G1+G2+G3** — Validacion contra cursos reales Univalle/AIEP. (1) Carga horaria y modalidad migran a `curricularSection (recordType=Modality)` — removidos campos `theoryHours/practiceHours/labHours/autonomousHours` de `activity` Course. (2) Nuevo objeto `curricularLink` con `linkType` enum (Develops/Evaluates/Covers/Uses/Custom). (3) Bibliografia tolerante a datos pobres (`rawCitation` unico requerido) — ya estaba aplicado, confirmado. Total 27 objetos. |
| 1.6 | 2026-04-25 | **G6** — `TechnicalProfessional` agregado a `activity(Course).programLevel` (3 → 4 valores). Cubre instituciones tecnico-profesionales como AIEP. |
| 1.7 | 2026-04-25 | `curricularLink` pasa de Draft a **En implementacion**. Sin el, programa de asignatura no puede expresar relaciones criticas entre secciones (que evaluacion mide que RA, etc.). |
| 1.8 | 2026-04-28 | **Estandarizacion camelCase en nombres de objetos.** 27 objetos renombrados: `Organization` → `organization`, `AcademicActivity` → `activity`, `CurricularSection` → `curricularSection`, etc. Tambien actualizadas las referencias polimorficas (ownerType, targetType, sourceType, entityType). Cambio notacional puro, sin alteracion semantica. |
| 1.9 | 2026-04-28 | **Workflow remodelado como capa transversal configurable (estilo Jira).** El estado de documentos curriculares deja de vivir como `workflowState: enum` hardcoded y pasa a maquina de estados editable por la institucion. Nueva seccion "Objetos de plataforma — Workflow" con 4 objetos: `workflowStatus` (estado institucional reutilizable con code/name/category), `workflow` (plantilla del flujo, inmutable post-uso, scopeType incluye booking), `workflowTransition` (flecha entre status), `workflowTransitionHistory` (log inmutable polimorfico). Consumidores actualizados (academicProgram, curriculumPlan, activity, competencyNode, changeRequest, specialization): pierden `workflowState: enum`, ganan `workflowId + currentStatusId`. La seccion `## workflowTransition` LA-interna eliminada. Total objetos: 27 → 30 (3 org + 4 workflow + 23 LA). |
| 1.10 | 2026-04-28 | **Dos cambios.** (1) `academicActivity → activity` + nuevo campo opcional `purpose` con valores `Academic` / `Formative` / `Service` / `Extracurricular`. Tabla general, mapas, todos los enums polimorficos (workflow.scopeType, workflowTransitionHistory.entityType, curricularSection.ownerType, changeRequest.targetType) y referencias actualizadas. (2) Categoria `InReview` agregada al enum `workflowStatus.category` (4 → 5 categorias). `InExecution` (alguien editando) e `InReview` (esperando evaluacion de tercero) son semanticamente distintos. Flujo natural: `ToDo → InExecution → InReview → Published`, con `Closed` como terminal alternativo. |

**Nota**: las versiones v1.0 a v1.10 estan todas concentradas en 2026-04-24..2026-04-28. La pagina Confluence se edito por ultima vez 2026-05-12 (page version 14) sin bump del campo "Version", probablemente para correcciones menores de redaccion.

---

## Evolucion por objeto (vista cross-version)

Leyenda:
- `exists` = el objeto existia en esa version sin cambios respecto a la anterior
- `NEW` = primera aparicion del objeto
- `+ X` = se agrego algo (campo, valor enum, etc.)
- `– X` = se elimino algo
- `rename A→B` = cambio de nombre
- `(refactor)` = cambio estructural mayor sin agregar/eliminar campos
- `—` = no existia aun

| Objeto | v1.0 | v1.5 | v1.7 | v1.8 | v1.9 | v1.10 | Status v1.10 |
|--------|------|------|------|------|------|-------|--------------|
| organization | exists (Implementado) | exists | exists | rename `Organization`→`organization` | exists | exists | Implementado |
| institution | exists | exists | exists | rename | exists | exists | Implementado |
| orgUnit | exists | exists | exists | rename `OrgUnit`→`orgUnit` | exists | exists | Implementado |
| workflowStatus | — | — | — | — | **NEW** (5 campos + category 4 valores) | **+ InReview en category** (5 valores) | En implementacion |
| workflow | — | — | — | — | **NEW** (8 campos, scopeType enum) | **+ booking en scopeType** | En implementacion |
| workflowTransition | — | — | — | — | **NEW** (6 campos) | exists | En implementacion |
| workflowTransitionHistory | — | — | — | — | **NEW** polimorfico (reemplaza al `workflowTransition` LA-interno antiguo) | exists | En implementacion |
| academicProgram | exists (Draft) | exists | exists | rename | **– workflowState; + workflowId + currentStatusId** | exists | Draft |
| curriculumPlan | exists (Draft) | exists | exists | rename `CurriculumPlan`→`curriculumPlan` | **– workflowState; + workflowId + currentStatusId** | exists | Draft |
| planEntry | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| activity | exists (Implementado, como `AcademicActivity` con `workflowState` enum) | **– theoryHours/practiceHours/labHours/autonomousHours/modalityDefault** (migran a curricularSection.Modality) | exists | rename `AcademicActivity`→`activity` (camelCase) | **– workflowState enum; + workflowId + currentStatusId** | **rename `academicActivity`→`activity`; + `purpose` enum opcional (Academic/Formative/Service/Extracurricular)** | En implementacion |
| curricularSection | exists (Implementado) | **+ recordType `Modality` con horas semanales + deliveryMode + isDefault** | exists | rename `CurricularSection`→`curricularSection`. Tambien casing de `ownerType` enum cambia a camelCase | exists | exists | Implementado |
| competencyNode | exists (Draft) | exists | exists | rename | **– workflowState; + workflowId + currentStatusId** | exists | Draft |
| milestone | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| studentGrade | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| achievement | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| graduationProfileEntry | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| requirementCategory | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| activityEquivalence | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| competencyEquivalence | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| electiveOption | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| entryDependency | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| competencyAlignment | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| curricularLink | — | **NEW** (G2 — vinculo descriptivo, Draft, `linkType` enum Develops/Evaluates/Covers/Uses/Custom) | **pasa a En implementacion** | rename `CurricularLink`→`curricularLink`, casing de `linkType` a PascalCase | exists | exists | Implementado |
| changeRequest | exists (Draft) | exists | exists | rename | **– workflowState; + workflowId + currentStatusId** | exists | Draft |
| planEnrollment | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| changeLog | exists (En implementacion, polimorfico via entityType string) | exists | exists | rename | exists | exists | En implementacion |
| specialization | exists (Draft) | exists | exists | rename | **– workflowState; + workflowId + currentStatusId** | exists | Draft |
| planEntrySpecialization | exists (Draft) | exists | exists | rename | exists | exists | Draft |
| bibliographyReference | exists (Implementado, G3 `rawCitation` tolerante a datos pobres) | exists | exists | rename `BibliographyReference`→`bibliographyReference` | exists | exists | Implementado |

**Resumen del cambio entre v1.8 y v1.10 (lo que SP3 absorbe):**
- 4 objetos NUEVOS (workflowStatus, workflow, workflowTransition, workflowTransitionHistory).
- 5 objetos pierden `workflowState` enum y ganan `workflowId` + `currentStatusId` (academicProgram, curriculumPlan, activity, competencyNode, changeRequest, specialization).
- 1 objeto se renombra a nivel semantico (`academicActivity` → `activity`) y suma `purpose`.
- 1 enum gana valor (`workflowStatus.category` agrega `InReview`).

---

## Delta accionable SP2 → SP3

Diff entre el snapshot SP2 (modelo implementado al cierre 2026-05-12) y el snapshot SP3 (modelo objetivo Confluence v1.10).

### Objetos AGREGADOS (5)

| Objeto | Tier SP3 | Ticket DKC | Action item |
|--------|----------|------------|-------------|
| workflowStatus | Tier 1 | TICKET-018 | Crear `mods/curriculum-design/objects/workflowStatus.json` con 6 campos (id, institutionId, code, name, `category` enum 5 valores, `status` enum Active/Archived). Seed UPU con 9 statuses. |
| workflow | Tier 1 | TICKET-018 | Crear `mods/curriculum-design/objects/workflow.json` con 8 campos (id, institutionId, name, description, `scopeType` enum 5 valores, isDefault, `status` enum Draft/Active/Archived, createdBy FK CoreUser). Seed UPU con 5 workflows en `status: Draft` (decision dev 2026-05-13). |
| workflowTransition | Tier 1 | TICKET-018 | Crear JSON con 6 campos. Constraint BD `fromStatusId != toStatusId`. Seed UPU con 21 transiciones. |
| workflowTransitionHistory | Tier 1 | TICKET-018 | Crear JSON polimorfico (entityType string + entityId UUID). Append-only. Seed UPU con 5 entries demo. |
| changeLog | Tier 1 | TICKET-020 | Crear JSON polimorfico (entityType string + entityId UUID). Auditoria universal via events BullMQ + worker del mod. |

### Objetos MODIFICADOS (3)

| Objeto | Cambios | Ticket DKC | Action item |
|--------|---------|------------|-------------|
| AcademicActivity → activity | (1) Rename Pascal→camel; (2) Reemplazar `workflowState` enum por `workflowId` + `currentStatusId` FKs; (3) Agregar `purpose` enum opcional | TICKET-019 | Rename cross-repo (JSON, Prisma, GraphQL, traducciones, FKs, layouts BD, capabilities). Reemplazar campo. Migrar instancias (mapeo 6→6 con DECISION-005). |
| curricularSection | Audited por changeLog (sin cambios al objeto en si, agrega comportamiento en captura de eventos) | TICKET-020 | Declarar events JSON (create/update/delete). Agregar tab Historial en RecordDetail via embed record-list. |
| curricularLink | Audited por changeLog (idem) | TICKET-020 | Idem |

### Cambios NO ABORDADOS en SP3 (deuda → ticket de homologacion futuro)

Identificados durante el intake de TICKET-018 (Session 1 + extraccion estructural 2026-05-13):

| # | Finding | Objeto | Severidad |
|---|---------|--------|-----------|
| H1 | Casing `ownerType` enum: codigo `["AcademicActivity","Offering"]` (PascalCase) vs Confluence `activity / offering / curriculumPlan` (camelCase). Falta `curriculumPlan` | curricularSection | Bloquea coherencia con workflow scopeType si se quisiera consistencia visual |
| H2 | Casing `sectionType` enum: codigo `["STRUCTURAL","COMPLEMENTARY"]` (UPPER_SNAKE) vs Confluence `Structural/Complementary` (PascalCase) | curricularSection | Estetica/consistencia |
| H3 | Casing `linkType` enum: codigo `["DEVELOPS","EVALUATES","COVERS","USES","CUSTOM"]` vs Confluence `Develops/Evaluates/Covers/Uses/Custom` | curricularLink | Estetica/consistencia |
| H4 | `previousVersionId` sin `isForeignKey` declarado en JSON; Confluence dice `UUID? FK → activity` | activity | Bug — pierde FK constraint en BD |
| H5 | `curricularSection.description` faltante en codigo; Confluence lo declara `string?` opcional | curricularSection | Spec gap |
| H6 | `static_default` strings `"true"` / `"false"` en `isSynchronizable`, `isVisible`, `isRequired` en lugar de booleans | curricularSection | Posible bug de codegen — falta validar comportamiento |
| H7 | `executionUnitId` declarado `not_null: false` en codigo; Confluence dice `Si requerido` | activity | Divergencia pre-existente conocida (DECISION-002). NO se cambia en SP3 |
| H8 | Constraint condicional `notes` requerido cuando `linkType=Custom` no expresada en codigo | curricularLink | Validacion runtime falta |
| H9 | Constraint `sourceSectionId.owner == targetSectionId.owner` no expresada en codigo | curricularLink | Validacion runtime falta |
| H10 | `Modality.isDefault=true` unique por (ownerType, ownerId) no expresado | curricularSection | Validacion runtime falta |
| H11 | Cleanup de entries demo huerfanos en `workflowTransitionHistory` (sembrados en HU3 con `entityId LIKE 'demo-%'`) | workflowTransitionHistory | Cleanup ilustrativo — los demos sirven como fixture/referencia durante SP3 (HU2 vista + HU4 smoke). Una vez generados entries reales en SP3+ y consolidados, ejecutar `DELETE FROM workflowTransitionHistory WHERE entityId LIKE 'demo-%'`. Script trivial, priority `should`, NO bloqueante. Postergado a SP4 |
| H12 | Logica condicional por tenant en script de migracion legacy → workflow (HU4) | activity | UPU usa mapeo sandbox-fresh (`todo → BOR`, decision L13). En Fase 2 (post-SP3) cuando se separen UNIVALLE/AIEP con data productiva real, el script necesitara mapeo conservador por tenant (`Approved → PUB`, etc.). Documentado en HU4 Session 1, implementacion diferida hasta que existan tenants separados |

---

## Politica de actualizacion

Cada nuevo sprint que arranque ejecuta el procedimiento de [UPDATE.md](UPDATE.md):

1. Trae la version actual de Confluence via MCP atlassian.
2. Compara contra el snapshot del sprint vigente.
3. Si la `model_version` cambio, agrega entrada en la "Tabla Versión" arriba.
4. Si hay cambios en objetos: actualiza la tabla "Evolucion por objeto cross-version" con nueva columna.
5. Crea snapshot del nuevo sprint con Tier 1 ajustado segun scope del sprint.
6. Anade seccion "Delta accionable SP(N-1) → SP(N)" en este CHANGELOG.
7. Actualiza la tabla maestra del INDEX.md.

---

## Historial de actualizaciones de este CHANGELOG

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2026-05-13 | Creacion inicial. Snapshots SP2 (cierre 2026-05-12) y SP3 (inicio 2026-05-13, Confluence v1.10). Bitacora Confluence v1.0..v1.10. Tabla cross-version por objeto. Delta SP2→SP3. 10 findings pendientes. | Eduardo Bacon + Deckard Cain (via Claude Code) |
| 2026-05-13 | Agregadas decisiones L13-L15 al snapshot SP3 + findings H11-H12 al CHANGELOG (cleanup demos + logica condicional por tenant). Capturadas en TICKET-018 Session 4, TICKET-019 Session 1, TICKET-020 Session 2. | Eduardo Bacon + Deckard Cain (via Claude Code) |
