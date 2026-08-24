---
id: SPEC-la-objects-model-snapshot-sp2
project: up1
type: spec
module: learning-assurance
category: objects-model
status: snapshot
sprint: SP2
sprint_end_date: 2026-05-12
snapshot_basis: "modelo implementado en codigo al cierre de SP2 (mods/curriculum-design/objects/)"
confluence_baseline_version: ~v1.4
confluence_baseline_notes: "Confluence v1.4 era la version vigente al iniciar SP2 (2026-04-27). Las versiones v1.5..v1.10 salieron durante el sprint pero NO fueron absorbidas — el codigo refleja v1.4 con divergencias locales declaradas."
divergencias_vs_confluence:
  - "Casing enum: codigo usa PascalCase para nombres de objetos y UPPER_SNAKE para valores de enum. Confluence v1.8+ pasa a camelCase/PascalCase pero local NO se actualizo."
  - "workflowState como enum local hardcoded en activity (DECISION-005). Confluence v1.9 introdujo 4 objetos workflow separados."
  - "activity.purpose no incluido. Confluence v1.10 lo agrega como opcional."
  - "executionUnitId nullable en codigo. Confluence dice requerido (DECISION-002, divergencia pre-existente conocida)."
extraction_date: 2026-05-13
extracted_by: Eduardo Bacon
tags: [learning-assurance, modelo-objetos, snapshot, sprint-SP2]
---

# Snapshot SP2 — Modelo de objetos al cierre del sprint (2026-05-12)

**Proposito**: registrar el modelo de objetos LA tal como fue **efectivamente implementado en codigo** al cierre del SP2 — antes de absorber las versiones v1.5..v1.10 de Confluence.

**Fuente**: `mods/curriculum-design/objects/*.json` en el monorepo up1 (rama `develop` al 2026-05-12) + decisions del sprint (DECISION-002, DECISION-005, DECISION-012).

**Composicion**: 3 objetos en Tier 1 (efectivamente implementados) + 4 objetos en Tier 2 (referenciados/adyacentes ya existentes en plataforma) + 23 objetos en Tier 3 (no relacionados).

> Este snapshot es **inmutable**. Para correcciones tipograficas usar `**Erratum YYYY-MM-DD**: ...` inline.

---

## Tier 1 — Objetos efectivamente implementados en SP2

### AcademicActivity (mod curriculum-design)

**Archivo origen**: `mods/curriculum-design/objects/AcademicActivity.json`
**Status Confluence v1.4**: Implementado (sin cambios v1.0..v1.4 mas que metadata)
**Status en codigo**: implementado, productivo en tenant UPU
**Etiqueta UI**: "Programa de asignatura"

**Campos:**

| Campo | Tipo | Requerido | Notas locales SP2 |
|-------|------|-----------|-------------------|
| `name` | string | Si | trim aplicado |
| `code` | string | Si | trim aplicado |
| `recordType` | enum | Si | `["Course"]`. v1.0..v1.4 documentaba `Course` como unico; planificados Workshop/Tutoring/Seminar/Service no implementados |
| `version` | string | Si | — |
| `previousVersionId` | string | No | **Sin `isForeignKey` declarado** (deuda registrada en TICKET-018 finding H4). Confluence dice FK → activity |
| `workflowState` | enum | Si | `["Draft","Review","Approved","Published","OpenForEdit","Deprecated"]`. **Provisorio segun DECISION-005**: enum minimo simplificado, sin objetos workflow separados. Reemplazado en HU4 (TICKET-019). |
| `language` | string | Si | default `"es"` |
| `description` | string | No | — |
| `credits` | number | Si | — |
| `programLevel` | enum | Si | `["Undergraduate","Postgraduate","ContinuingEducation","TechnicalProfessional"]` (4 valores). v1.6 agrego `TechnicalProfessional` — absorbido. |
| `executionUnitId` | string | **No** | **Divergencia pre-existente declarada (DECISION-002)**: Confluence dice requerido, local lo dejo nullable. FK → OrgUnit. |
| `externalId` | string | No | — |

**Constraints/decisiones SP2:**
- Nombre PascalCase `AcademicActivity` — sin rename a camelCase (Confluence v1.8 introdujo el rename, NO absorbido en SP2).
- `workflowState` simplificado por DECISION-005 (objetos workflow postergados a sprint futuro). Los mapeos del seed legacy (Univalle/AIEP) consolidan estados originales a estos 6 valores.
- NO se conecta a workflow runtime: solo el campo enum existe, no hay handler de transiciones ni log de auditoria.

**Faltantes vs Confluence v1.4 (deuda registrada):**
- Casing PascalCase (rename a camelCase llego en v1.8).
- `purpose` no existe (llego en v1.10).
- FK constraint en `previousVersionId`.

---

### CurricularSection (mod curriculum-design)

**Archivo origen**: `mods/curriculum-design/objects/CurricularSection.json`
**Status Confluence v1.4**: Implementado
**Status en codigo**: implementado, productivo en tenant UPU con 7 RecordTypes
**Etiqueta UI**: "Seccion curricular"

**Campos:**

| Campo | Tipo | Requerido | Notas locales SP2 |
|-------|------|-----------|-------------------|
| `ownerType` | enum | Si | `["AcademicActivity","Offering"]` (**PascalCase, falta `curriculumPlan`**). Confluence v1.8+ usa camelCase `["activity","offering","curriculumPlan"]`. Deuda H1. |
| `ownerId` | string | Si | FK polimorfica via ownerType |
| `recordType` | string | Si | Discriminador del subtipo. 7 RTs implementados (LearningOutcome/Modality/Session/EvaluationComponent/Content/Bibliography/CustomSection). v1.5 introdujo Modality con migracion de hours desde activity. |
| `sectionType` | enum | No | `["STRUCTURAL","COMPLEMENTARY"]` (**UPPER_SNAKE**). Confluence usa PascalCase `Structural/Complementary`. Deuda H2. |
| `name` | string | Si | trim aplicado |
| `position` | integer | No | Orden visual dentro del documento curricular |
| `parentId` | string | No | FK self a la seccion padre (Composite). Valido solo para EvaluationComponent en runtime (regla de negocio) |
| `sourceId` | string | No | ID origen para trazabilidad MADS — self-FK simple, NO declarado como `isForeignKey` (puede apuntar a tenants distintos) |
| `isSynchronizable` | boolean | No | `static_default: "true"` (**string**, no boolean). Deuda H6. |
| `isVisible` | boolean | No | `static_default: "true"` (string). Deuda H6. |
| `isRequired` | boolean | No | `static_default: "false"` (string). Deuda H6. |

**Faltantes vs Confluence v1.4 (deuda registrada):**
- `description` (string?, opcional) — finding H5.
- Defaults boolean como string — finding H6.
- Casing camelCase en ownerType + valor `curriculumPlan` — finding H1.
- Casing PascalCase en sectionType — finding H2.

**Constraints SP2:**
- Index compuesto `(ownerType, ownerId, recordType)` para queries comunes del agregado.
- Index `(parentId)` para navegacion del arbol Composite (usado en EvaluationComponent).

---

### CurricularLink (mod curriculum-design)

**Archivo origen**: `mods/curriculum-design/objects/CurricularLink.json`
**Status Confluence v1.7**: Implementado (paso de Draft a En implementacion en v1.7, despues a Implementado)
**Status en codigo**: declarado y schema validado, **NO populated en seed** ni expuesto en UI durante SP2. Layouts y seed agregados en SP3 cuando entren los flows de vinculacion pedagogica (TC-009-27 marcado n/a en TICKET-009).
**Etiqueta UI**: "Vinculo curricular"

**Campos:**

| Campo | Tipo | Requerido | Notas locales SP2 |
|-------|------|-----------|-------------------|
| `sourceSectionId` | string | Si | FK CurricularSection |
| `targetSectionId` | string | Si | FK CurricularSection. Constraint de negocio: source y target deben tener el mismo owner. **NO expresado en codigo** (deuda H9). |
| `linkType` | enum | Si | `["DEVELOPS","EVALUATES","COVERS","USES","CUSTOM"]` (**UPPER_SNAKE**). Confluence: `Develops/Evaluates/Covers/Uses/Custom` (PascalCase). Deuda H3. |
| `notes` | string | No | Requeridas a nivel de validacion de negocio cuando `linkType=CUSTOM`. **NO expresado en codigo** (deuda H8). |
| `position` | integer | No | Orden entre vinculos de la misma source-target |

**Constraints SP2:**
- Index `sourceSectionId` y `targetSectionId`.
- Sin constraint cross-field en codigo (validacion runtime falta).

---

## Tier 2 — Adyacentes ya implementados (plataforma)

| Objeto | Status Confluence v1.4 | Campos principales | Razon de relevancia para SP2 |
|--------|------------------------|---------------------|-------------------------------|
| organization | Implementado | id, name, code, externalId | Base multi-tenancy (FK desde institution) |
| institution | Implementado | id, name, code, organizationId, ... | Discriminador de tenant (FK desde activity, curricularSection via owner, eventualmente workflow) |
| orgUnit | Implementado | id, name, code, recordType (AcademicExecution/AdminUnit), institutionId | FK desde `activity.executionUnitId` |
| bibliographyReference | Implementado | id, rawCitation (G3 — unico requerido), authors?, year?, ... | Referenciado por `curricularSection (recordType=Bibliography)`. Tolerante a datos pobres confirmado en SP2 con datos Univalle (18 referencias texto libre) y AIEP (0 referencias). |

---

## Tier 3 — Resto del catalogo (no implementados, no referenciados en SP2)

Los 23 objetos restantes del modelo Confluence al cierre SP2. Para SP2, **ninguno** era relevante operacionalmente:

| Objeto | Status Confluence v1.4 | Notas SP2 |
|--------|------------------------|-----------|
| academicProgram | Draft | — |
| curriculumPlan | Draft | — |
| planEntry | Draft | — |
| competencyNode | Draft | — |
| milestone | Draft | — |
| studentGrade | Draft | — |
| achievement | Draft | — |
| graduationProfileEntry | Draft | — |
| requirementCategory | Draft | — |
| activityEquivalence | Draft | — |
| competencyEquivalence | Draft | — |
| electiveOption | Draft | — |
| entryDependency | Draft | — |
| competencyAlignment | Draft | — |
| changeRequest | Draft | — |
| planEnrollment | Draft | — |
| changeLog | En implementacion (segun Confluence) | **NO EXISTIA en codigo SP2**. Auditoria postergada — primer paso de implementacion llega en HU2 (TICKET-020) en SP3. |
| specialization | Draft | — |
| planEntrySpecialization | Draft | — |
| workflow / workflowStatus / workflowTransition / workflowTransitionHistory | **NO EXISTIAN en Confluence v1.4 — llegaron en v1.9** | NO aplica para SP2. Se modelaba como `workflowState` enum local en activity (DECISION-005). |

---

## Decisiones locales del sprint SP2 (resumen)

| Decision | Fecha | Resumen |
|----------|-------|---------|
| [DECISION-002](../../decisions/DECISION-002-execution-unit-nullable.md) | pre-SP2 | `executionUnitId` nullable en codigo (vs requerido en Confluence). Divergencia pre-existente conservada |
| [DECISION-003](../../decisions/DECISION-003-tenant-ids.md) | 2026-04-27 | UNIVALLE + AIEP — convencion uppercase. **superseded** |
| [DECISION-005](../../decisions/DECISION-005-workflow-state-defer.md) | 2026-04-28 | `workflowState` postergado: enum local hardcoded en activity en lugar de objetos workflow separados |
| [DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md) | 2026-04-28 | Rollout en 2 fases: Fase 1 solo UPU, Fase 2 separar UNIVALLE/AIEP. **Reemplaza DECISION-003** |

---

## Tickets DKC que produjeron este snapshot

| Ticket | Titulo | Cerrado | Aporte al modelo |
|--------|--------|---------|------------------|
| TICKET-006 | Configuracion de objetos del agregado Programa de asignatura | 2026-05-12 | 4 objetos base (academicActivity, curricularSection, curricularLink, bibliographyReference) declarados |
| TICKET-007 | Vista general listado de Programa de asignatura | 2026-04-29 | Layout default RecordList de AcademicActivity (sin cambios al modelo) |
| TICKET-009 | Vista de detalle de Programa de asignatura con secciones configurables | 2026-05-04 | 7 RecordTypes especificos de CurricularSection (`rt__<RT>__curricularsection.json`) |
| TICKET-010 | Mejoras de calidad de codigo en mod curriculum-design | 2026-05-05 | Refactor zero-behavior-change (sin cambios al modelo) |
| TICKET-011 | Plan de pruebas baseline + QA automatizado de curriculum-design SP2 | 2026-05-05 | Cobertura inicial (sin cambios al modelo) |
| TICKET-012 | Calidad post-baseline CompositeSectionTree+RichTextRenderer | 2026-05-07 | Refactor componentes UI (sin cambios al modelo) |
| TICKET-013 | ESLint config para mod | 2026-05-08* | Sin cambios al modelo |
| TICKET-014 | Resolver 84 errores TS en mod | 2026-05-09* | Sin cambios al modelo |
| TICKET-015 | Completar configuracion de selects en RecordTypes | 2026-05-10* | Ajustes a enums de RTs (Modality deliveryMode, etc.) |
| TICKET-016 | Storybook para custom components | 2026-05-10* | Sin cambios al modelo |
| TICKET-017 | Habilitar crear primer EvaluationComponent | 2026-05-11* | Bugfix UI (sin cambios al modelo) |
| TICKET-022 | Implementar buenas practicas WCAG 2.1 AA | 2026-05-12 | Mejoras a11y (sin cambios al modelo) |

*Fechas aproximadas — verificar contra frontmatter del ticket.

---

## Referencias

- [INDEX.md](INDEX.md) — Hub con tabla maestra de los 30 objetos
- [CHANGELOG.md](CHANGELOG.md) — Cambios cross-version y delta SP2 → SP3
- [snapshot-sp3-2026-05-13.md](snapshot-sp3-2026-05-13.md) — Modelo objetivo SP3
- `mods/curriculum-design/objects/` — fuente del codigo
- [specs/up1/curriculum-design/programa-de-asignatura.md](../../curriculum-design/programa-de-asignatura.md) — Spec local del agregado (interpretacion SP2)

---

## Historial

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2026-05-13 | Creacion del snapshot (retroactivo, basado en JSON definitions del repo al cierre SP2 + decisions del sprint). | Eduardo Bacon + Deckard Cain (via Claude Code) |
