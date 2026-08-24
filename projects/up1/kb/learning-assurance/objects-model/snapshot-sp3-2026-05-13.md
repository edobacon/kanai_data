---
id: SPEC-la-objects-model-snapshot-sp3
project: up1
type: spec
module: learning-assurance
category: objects-model
status: snapshot
sprint: SP3
sprint_start_date: 2026-05-11
snapshot_basis: "modelo objetivo segun Confluence v1.10 vigente al inicio de SP3 (page version 14 al 2026-05-12)"
confluence_id: "2038366242"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
confluence_page_version: 14
model_version: "1.10"
model_version_date: 2026-04-28
extraction_date: 2026-05-13
extracted_by: Eduardo Bacon
autor: Esteban Cortes Sandoval
supersedes_snapshot: snapshot-sp2-2026-05-12.md
tickets_dkc:
  - TICKET-018  # HU3 — Modelo de objetos workflow + seed UPU
  - TICKET-019  # HU4 — Rename academicActivity → activity y conectar a workflow
  - TICKET-020  # HU2 — changeLog para activity, curricularSection y curricularLink
tags: [learning-assurance, modelo-objetos, snapshot, sprint-SP3, confluence-v1.10]
---

# Snapshot SP3 — Modelo objetivo al inicio del sprint (2026-05-13)

**Proposito**: registrar el modelo de objetos LA que el SP3 va a implementar/absorber, segun la version canonica Confluence v1.10 (page version 14, ultima edicion 2026-05-12).

**Composicion**: 8 objetos en Tier 1 (en scope HU2+HU3+HU4) + 8 objetos en Tier 2 (referenciados/adyacentes) + 14 objetos en Tier 3 (no relacionados).

**Cambios principales desde SP2** (ver [CHANGELOG.md](CHANGELOG.md) seccion "Delta accionable SP2 → SP3"):
- 5 objetos AGREGADOS al scope: los 4 workflow + changeLog
- 1 objeto RENOMBRADO + REESTRUCTURADO: AcademicActivity → activity (con workflowId/currentStatusId + purpose)
- 2 objetos AUDITED por nuevo changeLog: curricularSection, curricularLink

> Este snapshot es **inmutable**. Para correcciones tipograficas usar `**Erratum YYYY-MM-DD**: ...` inline.

---

## Tier 1 — Objetos en scope del sprint

### workflowStatus (objeto Plataforma — Workflow)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-018 (HU3)

**Definicion**: estado institucional reutilizable que las instituciones componen en sus workflows. Equivalente conceptual al "Status" de Jira.

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `institutionId` | UUID | Si | FK → institution |
| `code` | string | Si | Codigo corto (ej `BOR`, `PUB`). Unique por institucion. Estable para integraciones |
| `name` | string | Si | Nombre visible. Unique por institucion. Editable sin romper integraciones |
| `category` | **enum** | Si | `ToDo` / `InExecution` / `InReview` / `Published` / `Closed`. Enum fijo del sistema (5 valores desde v1.10; `InReview` agregado en v1.10) |
| `description` | string? | No | Aclaracion opcional |
| `status` | **enum** | Si | `Active` / `Archived` (soft-delete) |

**Constraints:**
- `code`: unique por institucion.
- `name`: unique por institucion.
- `category`: enum cerrado del sistema — NO extensible por institucion.

**Semantica de `category`:**
- `ToDo`: estado de origen, sin acciones en curso. Ej: "Borrador".
- `InExecution`: activo, alguien esta editando/produciendo. Ej: "Editando", "OpenForEdit".
- `InReview`: pasivo, esperando evaluacion de un actor distinto del autor. Ej: "En revision decanato".
- `Published`: vigente y operacional. Ej: "Aprobado", "Vigente".
- `Closed`: terminado, ya no operativo. Ej: "Rechazado", "Descontinuado".
- Flujo natural: `ToDo → InExecution → InReview → Published`, con `Closed` como terminal desde cualquier categoria.

**Seed UPU SP3 (TICKET-018)**: 9 statuses cargados con `status: Active`:

| Code | Name | Category |
|------|------|----------|
| BOR | Borrador | ToDo |
| EDIT | Editando | InExecution |
| REV-DEC | En revision decanato | InReview |
| PUB | Publicado | Published |
| DIS | Descontinuado | Closed |
| PROP | Propuesto | ToDo |
| EVAL | En evaluacion | InReview |
| APR | Aprobado | Published |
| REJ | Rechazado | Closed |

---

### workflow (objeto Plataforma — Workflow)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-018 (HU3)

**Definicion**: plantilla de un flujo de aprobacion. Equivalente conceptual al "Workflow" de Jira. Conecta estados (`workflowStatus`) con transiciones (`workflowTransition`). Cada workflow esta acotado a un unico `scopeType`. Es **inmutable una vez en uso**: mientras `status = Draft` se puede editar libremente; al primer documento que lo referencia, pasa a `Active` y se congela.

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `institutionId` | UUID | Si | FK → institution |
| `name` | string | Si | Nombre del flujo. Unique por `(institutionId, scopeType)` |
| `description` | string? | No | — |
| `scopeType` | **enum** | Si | `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking`. **El enum se extiende cuando una nueva app uP1 se suma al patron** |
| `isDefault` | boolean | Si | Default para documentos del scopeType sin `workflowId` explicito. Unique por `(institutionId, scopeType)` |
| `status` | **enum** | Si | `Draft` (editable) / `Active` (en uso, congelado) / `Archived` (retirado) |
| `createdBy` | UUID | Si | FK → CoreUser |
| `createdAt` | DateTime | Si | — |
| `updatedAt` | DateTime | Si | — |

**Constraints:**
- `name`: unique por `(institutionId, scopeType)`.
- `isDefault`: unique por `(institutionId, scopeType)` — solo un workflow puede ser default por tipo de objeto por institucion.
- `status`: inmutable post-uso. Mientras Draft es editable; al primer consumidor pasa a Active y se congela. Para evolucionar: clonar y crear uno nuevo.

**Decisiones de diseño (Confluence)**:
- Un unico `scopeType` por workflow. Los flujos de plan, asignatura y reserva difieren en roles, SLA y semantica.
- Inmutable post-uso. Mientras Draft se pueden agregar/quitar status y transitions. Al primer consumidor → Active.
- Sin permisos por transicion en el primer release. Cualquier actor con permiso de edicion sobre el consumidor puede ejecutar cualquier transicion.

**Seed UPU SP3 (TICKET-018)**: 5 workflows en `status: Draft` ([decision dev 2026-05-13](#decisiones-locales-del-sprint-sp3)):

| Code/Name | scopeType | Statuses incluidos | Transiciones |
|-----------|-----------|---------------------|--------------|
| activity-standard (default) | activity | BOR → EDIT → REV-DEC → PUB / DIS | 5 |
| activity-fast | activity | BOR → PUB / DIS | 2 |
| curriculumPlan-standard | curriculumPlan | PROP → EVAL → APR → PUB → DIS / REJ | 6 |
| competencyNode-standard | competencyNode | BOR → REV-DEC → PUB / DIS | 4 |
| changeRequest-standard | changeRequest | BOR → EDIT → REV-DEC → APR → PUB / REJ | 4 |

---

### workflowTransition (objeto Plataforma — Workflow)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-018 (HU3)

**Definicion**: arista del grafo de un workflow. Conecta dos `workflowStatus` con una accion etiquetable.

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `workflowId` | UUID | Si | FK → workflow |
| `fromStatusId` | UUID | Si | FK → workflowStatus. Misma institucion que el workflow |
| `toStatusId` | UUID | Si | FK → workflowStatus. Misma institucion. Distinto de fromStatusId |
| `name` | string | Si | Etiqueta de accion visible. Unique por `(workflowId, fromStatusId, toStatusId)` |
| `requiresComment` | boolean | Si | Fuerza al actor a justificar (tipico para rechazos) |

**Constraints:**
- No self-transitions: `fromStatusId != toStatusId` (constraint BD).
- `fromStatusId` y `toStatusId` deben pertenecer a la misma institucion que el workflow (constraint BD).
- `name`: unique por `(workflowId, fromStatusId, toStatusId)`.

**Seed UPU SP3 (TICKET-018)**: 21 transiciones distribuidas en los 5 workflows.

---

### workflowTransitionHistory (objeto Plataforma — Workflow)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-018 (HU3)

**Definicion**: log inmutable polimorfico de cada transicion ejecutada. Reemplaza al antiguo `workflowTransition` LA-interno (v1.9 movio el log a transversal).

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `entityType` | **string** | Si | Discriminador polimorfico. Valores: `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking` (extiende con consumidores) |
| `entityId` | UUID | Si | FK polimorfico al consumidor que transiciono |
| `transitionId` | UUID | Si | FK → workflowTransition. `fromStatusId`, `toStatusId` y `workflowId` se derivan por join — no se duplican |
| `userId` | UUID | Si | FK → CoreUser. Quien ejecuto la transicion |
| `comment` | string? | No / requerido si `transition.requiresComment=true` | Justificacion |
| `createdAt` | DateTime | Si | Inmutable |

**Constraints:**
- Append-only: sin edits, sin deletes. Correcciones se hacen como transiciones nuevas.
- `comment`: requerido cuando `transition.requiresComment=true` (validacion en capa de aplicacion).
- `fromStatusId`, `toStatusId`, `workflowId` NO se almacenan aqui — se derivan por join desde `workflowTransition`. Evita drift.

**Decisiones de diseño (Confluence)**:
- Keyed por `transitionId`, no por status from/to. Toda la metadata del workflow se deriva por join.
- Polimorfico `entityType` + `entityId`. **Conjunto abierto de consumidores** (LA hoy, uBooking manana). Una FK polimorfica evita una columna por consumidor.
- Append-only.

**Seed UPU SP3 (TICKET-018)**: 5 entries demo.

---

### activity (objeto LA — Dominio principal)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-019 (HU4)

**Definicion**: actividad organizada por la institucion que un estudiante puede matricular o participar. Incluye actividades formativas no curriculares (Service) y eventualmente extracurriculares. v1.10 generalizo el alcance de `academicActivity` a `activity`.

**Campos base** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `executionUnitId` | UUID | Si | FK → orgUnit (recordType=AcademicExecution). **Confluence dice requerido**; codigo SP2 lo dejo nullable (DECISION-002 — divergencia pre-existente) |
| `name` | string | Si | — |
| `code` | string | Si | Codigo compartido entre versiones |
| `recordType` | string | Si | `Course` (unico documentado). Planificados: `Workshop`, `Tutoring`, `Seminar`, `Service` |
| `purpose` | string? | No | `Academic` / `Formative` / `Service` / `Extracurricular`. **Campo nuevo en v1.10** — incluir en HU4 (decision dev 2026-05-13) |
| `version` | string | Si | — |
| `previousVersionId` | UUID? | No | FK → activity. Encadena versiones |
| `workflowId` | UUID | Si | FK → workflow. `scopeType=activity` |
| `currentStatusId` | UUID | Si | FK → workflowStatus |
| `language` | string | Si | ISO 639-1, default `es` |
| `description` | string? | No | Descripcion breve |
| `externalId` | string? | No | ID en sistema externo |
| `createdAt` | DateTime | Si | — |
| `updatedAt` | DateTime | Si | — |

**Campos especificos del recordType `Course`:**

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `credits` | number | Si | Valor canonico de creditos |
| `programLevel` | string | Si | `Undergraduate` / `Postgraduate` / `ContinuingEducation` / `TechnicalProfessional` |

**Constraints:**
- `workflowId`: si el operador no especifica, hereda del workflow con `isDefault=true` para `scopeType=activity`.
- `previousVersionId`: FK autorreferencial. `code` se mantiene entre versiones, cambian `version` y UUID.
- `programLevel`: enum cerrado de 4 valores.
- `purpose`: campo opcional, no impone restriccion sobre `recordType`.
- Carga horaria y modalidad viven en `curricularSection (recordType=Modality)`, NO en `activity` directamente. Al menos una seccion `Modality` requerida.

**Cambios respecto a SP2 (action items HU4):**
- Rename Pascal→camelCase: `AcademicActivity` → `activity`.
- Rename semantico v1.10: el objeto YA esta en camelCase tras v1.8, pero v1.10 lo amplia a `activity` (de `academicActivity`).
- Reemplazo de `workflowState` enum local por `workflowId` + `currentStatusId` FKs.
- Agregar `purpose` (decision dev 2026-05-13 — incluir en HU4).
- Migracion de instancias: mapeo `workflowState` legacy → `currentStatusId` segun statuses del workflow `activity-standard`.

---

### curricularSection (objeto LA — Dominio principal)

**Status Confluence**: Implementado
**Ticket DKC**: TICKET-020 (HU2 — auditada por changeLog, sin cambios al objeto en si)

**Definicion**: elemento estructural o complementario dentro de un documento curricular. El `recordType` determina el subtipo (LearningOutcome, Modality, Session, EvaluationComponent, Content, Bibliography, CustomSection, ApprovalCondition, GeneralData, GraduationProfile, EntryProfile).

**Campos base** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `ownerType` | enum | Si | `activity` / `offering` / `curriculumPlan`. FK polimorfica — discriminador. **camelCase desde v1.8**. Codigo SP2 tiene PascalCase + falta `curriculumPlan` (deuda H1) |
| `ownerId` | UUID | Si | FK polimorfica segun ownerType |
| `parentId` | UUID? | No | Composite. Solo recordType=EvaluationComponent |
| `sourceId` | UUID? | No | FK → curricularSection origen (MADS) |
| `recordType` | string | Si | Discriminador del subtipo |
| `sectionType` | enum | Si | `Structural` / `Complementary`. **PascalCase**. Codigo SP2 tiene UPPER_SNAKE (deuda H2) |
| `name` | string | Si | — |
| `description` | string? | No | **Faltante en codigo SP2 (deuda H5)** |
| `position` | number | Si | Orden dentro del dueno o padre |
| `isSynchronizable` | boolean | Si | Default `true`. Propaga via MADS si true |
| `isVisible` | boolean | Si | Default `true`. Configurable por institucion (solo Structural) |
| `isRequired` | boolean | Si | Default `false`. Configurable por institucion |
| `createdAt` | DateTime | Si | — |
| `updatedAt` | DateTime | Si | — |

**RecordTypes** (campos especificos resumen):
- **LearningOutcome**: `code`, `bloomLevel?`, `isRequiredInAllSections`.
- **EvaluationComponent**: `weight`, `method?`, `componentCode?`, `componentType?`, `isDirectEvidence?`, `week?` (solo offering).
- **Content**: `hours?`, `contentType?` (`Theoretical/Practical/Laboratory`).
- **Session**: `week`, `activityType?`, `activityDescription?`, `duration?`.
- **Modality**: `code`, `theoryHours?`, `practiceHours?`, `labHours?`, `autonomousHours?`, `isDefault`, `deliveryMode?` (`Presencial/Online/Hybrid`).
- **ApprovalCondition**: `conditionType` (`MinAttendance/MinGrade/Custom`), `threshold?`, `unit?` (`Percentage/Grade/Count`).
- **GeneralData**: `fieldKey`, `fieldValue?`, `fieldType` (`text/number/select/date/boolean`).
- **GraduationProfile** (solo `ownerType=curriculumPlan`): `narrativeContent`, `isLinkedToCompetencyProfile`, `lastReviewDate?`.
- **EntryProfile** (solo `ownerType=curriculumPlan`): `narrativeContent`, `minimumRequirements?`, `targetAudience?`.
- **Bibliography**: `libraryRefId` (FK bibliographyReference), `referenceType` (`Mandatory/Complementary/Digital`), `notes?`.
- **CustomSection** (Complementary): `contentType` (`text/richText/list/table/file/json`), `content?`, `maxLength?`.

**Constraints:**
- `ownerType` + `ownerId`: FK polimorfica. Validacion de scope recordType × ownerType es regla de negocio.
- `parentId`: solo valido cuando `recordType=EvaluationComponent`.
- `isDefault=true` en Modality: unique por `(ownerType, ownerId)` (deuda H10 — no expresado en codigo).
- `isSynchronizable=true` + `sourceId`: re-sincronizacion automatica cuando el template MADS cambia.

**Cambios respecto a SP2:**
- Sin cambios al objeto en si (la auditoria via changeLog es comportamiento agregado, no schema).
- 4 RecordTypes adicionales en Confluence (`ApprovalCondition`, `GeneralData`, `GraduationProfile`, `EntryProfile`) no implementados en codigo SP2 — fuera de scope SP3.
- Deuda de homologacion documentada (H1, H2, H5, H6, H10).

---

### curricularLink (objeto LA — Soporte)

**Status Confluence**: Implementado
**Ticket DKC**: TICKET-020 (HU2 — auditada por changeLog)

**Definicion**: vinculo descriptivo interno entre dos `curricularSection` del mismo dueño (mismo `ownerType` + `ownerId`).

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `sourceSectionId` | UUID | Si | FK → curricularSection |
| `targetSectionId` | UUID | Si | FK → curricularSection. **Debe compartir el mismo `(ownerType, ownerId)` que source** — validacion app (deuda H9) |
| `linkType` | enum | Si | `Develops` / `Evaluates` / `Covers` / `Uses` / `Custom`. **PascalCase**. Codigo SP2 tiene UPPER_SNAKE (deuda H3) |
| `notes` | string? | No / **requerido si `linkType=Custom`** | Aclaracion pedagogica (deuda H8 — no expresado en codigo) |
| `position` | integer? | No | Orden si hay multiples links del mismo tipo desde el mismo source |
| `createdAt` | DateTime | Si | — |
| `updatedAt` | DateTime | Si | — |

**Semantica de `linkType`:**
- `Develops`: source desarrolla target (ej: Content → LearningOutcome).
- `Evaluates`: source evalua target (ej: EvaluationComponent → LearningOutcome).
- `Covers`: source cubre target (ej: Session → Content).
- `Uses`: source usa target (ej: Session → Bibliography).
- `Custom`: vocabulario institucional especifico; `notes` requerido.

**Constraints:**
- `sourceSectionId` y `targetSectionId` deben compartir el mismo `(ownerType, ownerId)` — validado en capa de aplicacion (deuda H9).
- `notes` requerido cuando `linkType=Custom` (deuda H8).
- Cardinalidad M:N (un Content puede desarrollar varios LOs; un LO puede ser desarrollado por varios Contents).

**Cambios respecto a SP2:**
- Sin cambios al objeto en si (auditoria por changeLog).
- Casing UPPER_SNAKE → PascalCase pendiente (deuda H3).
- Constraints condicionales no expresadas en codigo (deuda H8, H9).

---

### changeLog (objeto LA — Soporte)

**Status Confluence**: En implementacion
**Ticket DKC**: TICKET-020 (HU2)

**Definicion**: auditoria universal de cambios sobre cualquier documento curricular u objeto de apoyo. Polimorfico via `entityType` + `entityId`. Append-only.

**Campos** (verbatim Confluence v1.10):

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | PK |
| `entityType` | **string** | Si | Tipo de la entidad auditada (cualquier documento curricular u objeto de apoyo). **Polimorfico abierto — set extensible por mods sin migracion** |
| `entityId` | UUID | Si | FK polimorfica al objeto auditado |
| `userId` | UUID | Si | FK → CoreUser (autor del cambio) |
| `action` | enum | Si | `Create` / `Update` / `Delete` / `StateTransition` / `MADSSync` / `Import` / `Restore` |
| `source` | enum | Si | `DirectEdit` / `Workflow` / `changeRequest` / `MADS` / `Import` / `SystemCalculation` |
| `field` | string? | Si para `Update` | Nombre del campo modificado (una entrada por campo) |
| `oldValue` | JSON? | Si para `Update` | Valor anterior. Si JSON > 10KB: truncar + guardar hash |
| `newValue` | JSON? | Si para `Update` | Valor nuevo. Idem truncado |
| `changeRequestId` | UUID? | No / si cuando `source=changeRequest` | FK → changeRequest |
| `workflowTransitionHistoryId` | UUID? | No / si cuando `action=StateTransition` | FK → workflowTransitionHistory |
| `sourceRefId` | UUID? | No | ID generico de la fuente (MADS sync, Import) |
| `comment` | string? | No | — |
| `createdAt` | DateTime | Si | — |

**Captura automatica:**
- `Create` → entrada con `action=Create`, `source=DirectEdit`.
- `Update` → UNA entrada POR CAMPO modificado, con `field/oldValue/newValue` poblados.
- `Delete` → entrada con `action=Delete`.
- `StateTransition` → `action=StateTransition` + link a `workflowTransitionHistoryId`.

**Mecanismo de implementacion (HU2 — decision DKC)**:
- El mecanismo de pre-fetch ya esta en core: UPONE-1052 introdujo `_previousData` + `_triggeredBy` en eventos BullMQ (RULE-core-013).
- El mod declara event JSONs en `events/` (uno por `objectType + operation`).
- Un worker del mod consume eventos via BullMQ, hace diff field-by-field y escribe N rows de changeLog (una por campo modificado).
- Edge cases (truncado JSON >10KB, batch transaccional, source=SystemCalculation) viven en el worker.
- Sincronizacion obligatoria para `action=StateTransition`: el worker **copia `entityType` desde la fila linkeada de `workflowTransitionHistory`**, no del payload del evento. Garantiza coherencia automatica.

**Polimorfismo curricularSection** (decision PM Esteban 2026-05-13): `entityType` plano — `"curricularSection"` para todas las filas, independiente del recordType. Mismo principio aplica a `curricularLink` y a `activity`.

**RBAC del tab Historial:**
- 3 capabilities granulares: `activity:audit`, `curricularsection:audit`, `curricularlink:audit` (recomendacion PM, alternativa a `changelog:view` global).
- Sin la capability correspondiente, el tab Historial no se renderiza.

**Seed SP3**: NO se seedea data demo de changeLog — se llena organicamente desde events al ejecutar mutations sobre activity/curricularSection/curricularLink.

---

## Tier 2 — Objetos referenciados / adyacentes

| Objeto | Status Confluence | Campos principales | Por que nos importa SP3 |
|--------|---------------------|---------------------|--------------------------|
| organization | Implementado | id, name, code, externalId | Base multi-tenancy (FK desde institution) |
| institution | Implementado | id, name, code, organizationId, ... | Discriminador de tenant. FK desde `workflow.institutionId`, `workflowStatus.institutionId` |
| orgUnit | Implementado | id, name, code, recordType (AcademicExecution/AdminUnit), institutionId | FK desde `activity.executionUnitId` |
| curriculumPlan | Draft | id, name, code, version, workflowId, currentStatusId, ... | Aparece en `workflow.scopeType="curriculumPlan"`, `workflowTransitionHistory.entityType="curriculumPlan"`, `curricularSection.ownerType="curriculumPlan"`, `changeRequest.targetType="curriculumPlan"`. **Si cambia su nombre o estructura, afecta nuestros seeds + queries cruzadas** |
| competencyNode | Draft | id, name, code, recordType (Matrix/Competency), ... | Aparece en `workflow.scopeType="competencyNode"`. Si renombramos competencyNode, afecta el seed UPU |
| changeRequest | Draft | id, recordType (Micro/Macro), targetType, targetId, currentStatusId, ... | Aparece en `workflow.scopeType="changeRequest"`. Tambien `changeLog.source="changeRequest"` con `changeLog.changeRequestId` FK. Si cambia, afecta el modelo de auditoria HU2 |
| bibliographyReference | Implementado | id, rawCitation, authors?, year?, ... | Referenciado desde `curricularSection (recordType=Bibliography).libraryRefId`. Tolerante a datos pobres confirmado (G3) |
| CoreUser (objeto compartido, NO en el modelo LA pero referenciado) | Implementado en up1 core | id, email, name, ... | FK desde `workflow.createdBy`, `workflowTransitionHistory.userId`, `changeLog.userId` |

---

## Tier 3 — Resto del catalogo

Listado completo con status. Para detalle estructural: ver pagina Confluence v1.10.

| Objeto | Categoria Confluence | Status | Notas |
|--------|----------------------|--------|-------|
| academicProgram | LA — Dominio principal | Draft | scopeType valido para workflow pero no instancia en seed UPU SP3 |
| planEntry | LA — Dominio principal | Draft | — |
| milestone | LA — Dominio principal | Draft | — |
| studentGrade | LA — Dominio principal | Draft | v1.5 G1 — hours migraron a curricularSection.Modality |
| achievement | LA — Dominio principal | Draft | — |
| graduationProfileEntry | LA — Soporte | Draft | — |
| requirementCategory | LA — Soporte | Draft | — |
| activityEquivalence | LA — Soporte | Draft | — |
| competencyEquivalence | LA — Soporte | Draft | — |
| electiveOption | LA — Soporte | Draft | — |
| entryDependency | LA — Soporte | Draft | — |
| competencyAlignment | LA — Soporte | Draft | Hermano de curricularLink — tributacion al perfil de competencias institucional (vs curricularLink que modela coherencia interna del documento) |
| planEnrollment | LA — Soporte | Draft | — |
| specialization | LA — Soporte | Draft | — |
| planEntrySpecialization | LA — Soporte | Draft | — |

**Verbatim de la pagina Confluence**: [page/2038366242](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242). Cache local en `.claude/projects/-Users-edobacon-Workspace-uplanner/.../tool-results/mcp-atlassian-getConfluencePage-1778677784333.txt` (al 2026-05-13).

---

## Decisiones locales del sprint SP3

Decisiones tomadas por el dev/equipo durante el intake de TICKET-018 que aplican al snapshot SP3. **No son parte del modelo Confluence — son interpretaciones/configuraciones del sprint**.

| # | Decision | Origen | Detalle |
|---|----------|--------|---------|
| L1 | `workflowStatus.status` enum (Active/Archived) | Confluence v1.10 literal + respaldo PM Slack 2026-05-13 | Set cerrado del sistema |
| L2 | `workflowStatus.category` enum 5 valores con `InReview` | Confluence v1.10 literal | 5 valores transversales, set fijo |
| L3 | `workflow.status` enum (Draft/Active/Archived) | Confluence v1.10 literal | Ciclo de vida del workflow |
| L4 | `workflow.scopeType` **enum cerrado** | Confluence v1.10 literal — "El enum se extiende cuando una nueva app uP1 se suma al patron". Confirmado por dev 2026-05-13 (Session 3 TICKET-018) | Rigor para definicion del flujo. Cada consumer nuevo requiere migracion controlada |
| L5 | `workflowTransitionHistory.entityType` **string** polimorfico | Confluence v1.10 literal — "string + entityId. Conjunto abierto de consumidores". Confirmado por dev 2026-05-13 | Permite escribir log sin migracion previa. Asimetria intencional con L4 |
| L6 | `changeLog.entityType` **string** polimorfico | Confluence v1.10 literal. Confirmado por PM Esteban Slack 2026-05-13 ("plano") | Auditoria universal, set abierto a mods |
| L7 | Convencion **camelCase** literal para todos los valores polimorficos | Convencion del sprint | `"activity"`, `"curriculumPlan"`, etc. Aplica a frontmatter, seeds, eventos, queries |
| L8 | Sincronizacion automatica del worker changeLog para `action=StateTransition` | TICKET-018 Session 3 | Worker copia `entityType` desde la fila linkeada de `workflowTransitionHistory` (no del payload del evento). Garantiza coherencia automatica entre las dos tablas |
| L9 | Seed UPU de workflows en `workflow.status: Draft` | Dev 2026-05-13 (TICKET-018 Decision #2) | HU4 (o setup posterior) los activa explicitamente |
| L10 | Granularidad `entityType` plano para curricularSection y curricularLink | PM Esteban Slack 2026-05-13 (TICKET-020 Session 1) | NO sufijo por recordType. `"curricularSection"` para todas las filas. Aplica analogamente a curricularLink y activity |
| L11 | Capabilities granulares `<objeto>:audit` (vs `changelog:view` global) | TICKET-020 (recomendacion PM) | Tres capabilities: `activity:audit`, `curricularsection:audit`, `curricularlink:audit` |
| L12 | `activity.purpose` incluido en HU4 (TICKET-019) | Dev 2026-05-13 (TICKET-018 Decision #4) | Bajo costo, alta alineacion con Confluence v1.10 |
| L13 | Mapeo legacy `Approved → BOR` para UPU (sandbox), NO `Approved → PUB` | Dev 2026-05-13 (TICKET-018 Session 4, Decision #6) | UPU es sandbox de validacion (DECISION-012 Fase 1), no produccion fiel. Bajar a BOR permite ejercicio completo del flujo end-to-end en HU2 + HU4 (BOR → EDIT → REV-DEC → PUB). El cambio se aplica en el script de migracion de HU4. En Fase 2 (post-SP3, tenants UNIVALLE/AIEP separados), el script requerira logica condicional por tenant (`UPU → BOR`, `UNIVALLE/AIEP → PUB`) |
| L14 | 5 entries demo en `workflowTransitionHistory` son **huerfanos** con `entityId` ficticios | Dev 2026-05-13 (TICKET-018 Session 4, Decision #7) | Etiquetado obligatorio: `entityId` con prefijo `demo-` (ej. `demo-activity-001`) + `comment` con prefijo `DEMO:`. Polimorfismo abierto (L5) permite apuntar a entityIds inexistentes — valido tecnicamente, fixture demo. Distribucion: 2 entries activity + 2 curriculumPlan + 1 changeRequest. Sirven como referencia ilustrativa para validar shape/layout en HU2 (vista) y HU4 (smoke) antes de que existan entries reales |
| L15 | HU4 ejecuta 2-3 transiciones reales en smoke (genera entries iniciales sobre activities legacy) | Dev 2026-05-13 (TICKET-018 Session 4, Decision #10) | Como parte del closing de HU4: BOR → EDIT en `aa-uv-1124` (UV) usando workflow `activity-standard`; BOR → EDIT en `TIR101` (AIEP) usando workflow `activity-fast`. Resultado: ~5 demos huerfanos + ~2 entries reales coexisten en BD post-HU4. Cleanup de huerfanos diferido a SP4 (backlog) — script trivial `DELETE FROM workflowTransitionHistory WHERE entityId LIKE 'demo-%'` |

---

## Acciones no en scope SP3 (deuda — ticket de homologacion futuro)

Los 10 findings registrados en CHANGELOG.md seccion "Cambios NO ABORDADOS en SP3" siguen aqui como referencia. Resumen:

- Casing inconsistente: H1, H2, H3 (curricularSection.ownerType, sectionType, curricularLink.linkType).
- Spec gaps: H4 (previousVersionId sin FK), H5 (curricularSection.description), H6 (defaults booleanos como string).
- Divergencias pre-existentes: H7 (executionUnitId nullable, DECISION-002).
- Constraints condicionales runtime: H8 (notes-if-Custom), H9 (same owner), H10 (Modality.isDefault unique).

---

## Referencias

- [INDEX.md](INDEX.md) — Hub con tabla maestra de los 30 objetos
- [CHANGELOG.md](CHANGELOG.md) — Cambios cross-version y delta SP2 → SP3
- [UPDATE.md](UPDATE.md) — Procedimiento para generar snapshot SP4 cuando arranque
- [snapshot-sp2-2026-05-12.md](snapshot-sp2-2026-05-12.md) — Snapshot anterior (modelo implementado al cierre SP2)
- [Pagina canonica Confluence](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) — fuente de verdad
- `deckard/projects/up1/tickets/ticket-018.md`, `ticket-019.md`, `ticket-020.md` — tickets DKC del sprint
- `mods/curriculum-design/objects/` — destino del codigo en SP3

---

## Historial

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2026-05-13 | Creacion del snapshot a partir de Confluence v1.10 (page version 14, cache extraido 2026-05-13). 12 decisiones locales del sprint registradas. | Eduardo Bacon + Deckard Cain (via Claude Code) |
