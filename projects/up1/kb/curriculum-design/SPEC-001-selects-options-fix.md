---
id: SPEC-curriculum-design-001-selects-options-fix
project: up1
module: curriculum-design
status: in_progress
work_type: fix
ticket: TICKET-015
external: UPONE-1038
created: 2026-05-11
updated: 2026-05-11
sessions_count: 4
estimated_hours: 8
tags: [selects, enum, bug-ui, sync, i18n]
---

# Completar configuracion de selects en RecordTypes del mod

> **Ticket**: [TICKET-015](../../tickets/ticket-015.md) (external UPONE-1038) · **Module**: curriculum-design
> Spec producido tras intake-explore + teach-intake + decisiones AQ-1 a AQ-6.

## Goal

Que los formularios de edicion en el mod muestren **opciones** en los 10 campos identificados (7 con enum ya declarado + 3 con enum bootstrap nuevo). Solucionar el bug de pipeline UI sobre los enums declarados (H1) y agregar enum bootstrap simple a 3 campos que hoy son text (H3/H4 parcial).

Fuera de alcance: implementacion de modelo v1.10 completo (8 tickets futuros listados en `## Scope refinement` del ticket).

## Requirements (REQ)

| REQ | Descripcion | Source ref | Certainty |
|-----|-------------|-----------|-----------|
| REQ-001 | Modality.`deliveryMode` muestra 5 options en form de edicion con labels i18n | TICKET-015 H1 + `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json` (enum declarado) + `lang/es_CL@rt__Modality__curricularsection.json` (labels) | confirmed |
| REQ-002 | LearningOutcome.`bloomLevel` muestra 6 options Bloom revisada con labels i18n | TICKET-015 H1 + H7 (Bloom confirmada BR-TAX-002) + `rt__LearningOutcome__curricularsection.json` + lang | confirmed |
| REQ-003 | Bibliography.`referenceType` muestra 3 options (Mandatory/Complementary/Digital) con labels i18n | TICKET-015 H1 + `rt__Bibliography__curricularsection.json` + lang | confirmed |
| REQ-004 | Content.`contentType` muestra 3 options (Theoretical/Practical/Laboratory) con labels i18n | TICKET-015 H1 + `rt__Content__curricularsection.json` + lang | confirmed |
| REQ-005 | AcademicActivity.`programLevel` muestra 4 options con labels i18n | TICKET-015 H1 + `AcademicActivity.json` + lang | confirmed |
| REQ-006 | AcademicActivity.`workflowState` muestra 6 options con labels i18n + respeta `static_default: 'Draft'` | TICKET-015 H1 (descubierto en S2) + `AcademicActivity.json` + lang | confirmed |
| REQ-007 | CustomSection.`contentType` muestra 1 option (`richText`) con label i18n (decision intencional DECISION-006) | TICKET-015 H1 + DECISION-006 + `rt__CustomSection__curricularsection.json` + lang | confirmed |
| REQ-008 | EvaluationComponent.`componentType` muestra 3 options (Summative/Formative/Diagnostic) con labels i18n existentes | TICKET-015 H3 + AQ-1 resuelta + lang ya alineado | confirmed |
| REQ-009 | EvaluationComponent.`method` muestra 6 options bootstrap con labels i18n nuevas (WrittenExam/Project/OralPresentation/Rubric/Portfolio/Quiz) | TICKET-015 H3 + AQ-2 confirmada + CAP-CUR-037 + descripcion JSON | confirmed |
| REQ-010 | Session.`activityType` muestra 7 options bootstrap con labels i18n nuevas (Lecture/Workshop/Laboratory/Tutoring/Seminar/Evaluation/Other) | TICKET-015 H4 + AQ-2 confirmada + CAP-CUR-038 + descripcion JSON | confirmed |
| REQ-011 | AcademicActivity.`language` muestra 3 options ISO 639-1/BCP 47 (es/en/pt-BR) con labels i18n nuevas + preserva default `es` | TICKET-015 H4 + AQ-3 confirmada + CAP-CUR-041 + descripcion JSON | confirmed |
| REQ-012 | OrgUnit.`type` permanece como text libre (decision intencional) | TICKET-015 Scope refinement + modelo objetos v1.10 | confirmed |
| REQ-013 | AcademicActivity.`recordType` permanece con enum `['Course']` (sin Workshop/Tutoring/Seminar/Service) | TICKET-015 Scope refinement (flujos no implementados) | confirmed |

## Out-of-scope (NO IMPLEMENTAR EN ESTE SPEC)

- Crear objetos catalogo `EvaluationMethod`, `ActivityType`, `Language` (scope dual BR-TNT-002) — tickets futuros
- Agregar campos nuevos al mod: `AcademicActivity.purpose`, `Modality.code/theoryHours/etc`, `BibliographyReference.referenceFormat`, `EvaluationComponent.componentCode/isDirectEvidence/week` — tickets futuros
- Ampliar `AcademicActivity.recordType` con Workshop/Tutoring/Seminar/Service — depende de flujos no implementados
- MADS herencia automatica programa → silabo
- Workflow state machine completa con transiciones (depende de flow engine SP3)

## Artifacts (cosas que se tocan o crean)

### JSONs del mod a modificar

| Archivo | Cambio | REQ |
|---------|--------|-----|
| `mods/curriculum-design/objects/AcademicActivity.json` | Agregar enum `["es", "en", "pt-BR"]` a `language` | REQ-011 |
| `mods/curriculum-design/objects/RecordTypes/rt__EvaluationComponent__curricularsection.json` | Agregar enum `["Summative", "Formative", "Diagnostic"]` a `componentType` + enum `["WrittenExam", "Project", "OralPresentation", "Rubric", "Portfolio", "Quiz"]` a `method` | REQ-008, REQ-009 |
| `mods/curriculum-design/objects/RecordTypes/rt__Session__curricularsection.json` | Agregar enum `["Lecture", "Workshop", "Laboratory", "Tutoring", "Seminar", "Evaluation", "Other"]` a `activityType` | REQ-010 |

### Lang files a modificar

| Archivo | Cambio | REQ |
|---------|--------|-----|
| `mods/curriculum-design/lang/es_CL@AcademicActivity.json` | Agregar bloque `enums.language.*` con labels (Espanol/Ingles/Portugues (Brasil)) | REQ-011 |
| `mods/curriculum-design/lang/es_CL@rt__EvaluationComponent__curricularsection.json` | Agregar bloque `enums.method.*` con labels (WrittenExam=Examen escrito, Project=Proyecto, OralPresentation=Presentacion oral, Rubric=Rubrica, Portfolio=Portafolio, Quiz=Quiz) | REQ-009 |
| `mods/curriculum-design/lang/es_CL@rt__Session__curricularsection.json` | Agregar bloque `enums.activityType.*` con labels (Lecture=Clase magistral, Workshop=Taller, Laboratory=Laboratorio, Tutoring=Tutoria, Seminar=Seminario, Evaluation=Evaluacion, Other=Otro) | REQ-010 |

### Codigo a investigar/fixear (S3 — bug UI)

Punto de investigacion (no se sabe donde esta la falla aun):

1. `object-manager/src/graphql/resolvers/objectDefinition.resolver.js` — funcion `getObjectFields`
2. `object-manager/src/graphql/typeDefs/dynamic.js` — exposicion de `enumValues`
3. `suite/.../RecordDetail.vue` lineas 2855-2909 — lectura de `fieldMetadata.enumValues`
4. Pipeline `npm run sync` — propagacion JSON → typeDefs

## Decisions

| Decision | Resumen | Drivers principales | Ref |
|----------|---------|---------------------|-----|
| DEC-001 (local) | Usar `Summative/Formative/Diagnostic` para `componentType` | Lang file ya alineado (canonico) + seed UV usa estos valores | AQ-1 resuelta |
| DEC-002 (local) | Enum bootstrap sin crear catalogos institucionales | Velocidad (1 sprint) + reversibilidad (migrar a FK es trivial) + 80% cobertura suficiente | Scope refinement |
| DEC-003 (local) | Incluir `workflowState` en alcance S3 | Enum ya declarado + lang completo + 0 trabajo extra | AQ-5 |
| DEC-004 (local) | Lang updates parte de S4 (no sub-ticket) | Consistencia: agregar enum sin label produce keys raw en UI | AQ-6 |

## Tasks

### Session 3 — Fix bug UI sobre 7 selects con enum declarado (REQ-001 a REQ-007)

| # | Task | REQ | Validacion | Rollback |
|---|------|-----|-----------|----------|
| S3.T1 | Re-correr `npm run sync` desde root + restart backend object-manager. Verificar timestamp de typeDefs regenerados | REQ-001 a REQ-007 | timestamp `object-manager/src/graphql/typeDefs/*` > antes del sync; backend levanta sin errores | n/a — no destructivo |
| S3.T2 | Reproducir UI vacia: levantar suite, abrir form de Modality, abrir Vue devtools, inspeccionar `fieldMetadata` para `deliveryMode`. Capturar screenshot + console output | REQ-001 | Screenshot guardado en `screenshots/TICKET-015-modality-form-empty.png` con devtools visible | n/a — solo lectura |
| S3.T3 | Trazar GraphQL: query `getObjectFields(name: "Modality")` desde GraphQL playground. Verificar que `enumValues` retorna array no vacio | REQ-001 | Resultado documentado: `enumValues: ["InPerson", ...]` retornado correctamente desde resolver | n/a — solo lectura |
| S3.T4 | Si T2 muestra `enumValues` vacio en frontend pero T3 lo retorna correcto → fix en frontend (RecordDetail.vue:2855-2909). Si T3 retorna vacio → fix en resolver `getObjectFields`. Implementar fix segun localizacion. Crear test unit del fix | REQ-001 | Test unit verde + smoke manual: Modality form muestra 5 options con labels | git revert del fix |
| S3.T5 | Replicar verificacion + fix (si aplica) para los otros 6 selects con enum: bloomLevel, referenceType, contentType (Content), programLevel, workflowState, contentType (CustomSection) | REQ-002 a REQ-007 | Smoke manual de cada form: muestra options con labels i18n correctos | git revert |
| **S3.GATE** | **Gate de sync Session 3 (validation tier: T2)** | — | Tests unit del fix verdes + smoke manual de los 7 selects passing + screenshots before/after en `screenshots/TICKET-015-*` | — |

### Session 4 — Agregar enum bootstrap a 3 campos sin enum (REQ-008 a REQ-011)

| # | Task | REQ | Validacion | Rollback |
|---|------|-----|-----------|----------|
| S4.T1 | Edit `rt__EvaluationComponent__curricularsection.json`: agregar `"enum": ["Summative", "Formative", "Diagnostic"]` a `componentType` (lang ya tiene labels) | REQ-008 | `npm run sync` pasa; smoke manual: componentType select muestra 3 options con labels existentes | revert JSON |
| S4.T2 | Edit `rt__EvaluationComponent__curricularsection.json`: agregar `"enum": ["WrittenExam", "Project", "OralPresentation", "Rubric", "Portfolio", "Quiz"]` a `method`. Edit lang `es_CL@rt__EvaluationComponent__curricularsection.json`: agregar bloque `enums.method.*` con 6 labels | REQ-009 | sync pasa; smoke manual: method select muestra 6 options con labels (Examen escrito, Proyecto, Presentacion oral, Rubrica, Portafolio, Quiz) | revert 2 archivos |
| S4.T3 | Edit `rt__Session__curricularsection.json`: agregar `"enum": [7 valores]` a `activityType`. Edit lang `es_CL@rt__Session__curricularsection.json`: agregar bloque `enums.activityType.*` con 7 labels | REQ-010 | sync pasa; smoke manual: activityType select muestra 7 options con labels (Clase magistral, Taller, Laboratorio, Tutoria, Seminario, Evaluacion, Otro) | revert 2 archivos |
| S4.T4 | Edit `AcademicActivity.json`: agregar `"enum": ["es", "en", "pt-BR"]` a `language`. Preservar `static_default: 'es'`. Edit lang `es_CL@AcademicActivity.json`: agregar bloque `enums.language.*` con 3 labels (Espanol, Ingles, Portugues (Brasil)) | REQ-011 | sync pasa; smoke manual: language select muestra 3 options con labels; default `es` preselecciona | revert 2 archivos |
| **S4.GATE** | **Gate de sync Session 4 (validation tier: T1)** | — | Sync sin errores en los 3 workspaces (object-manager pasa codegen y db push si aplica, sin data loss); smoke manual de los 3 selects nuevos passing | — |

### Session 5 — Crear tickets futuros para items out-of-scope (no implementar aqui)

| # | Task | Validacion | Rollback |
|---|------|-----------|----------|
| S5.T1 | Crear 8 placeholder tickets (status=`open`, sin assignee) en `projects/up1/tickets/` con titulos y request basicos para: AcademicActivity.purpose, Modality extendida, BibliographyReference.referenceFormat, EvaluationComponent extendido, catalogo EvaluationMethod, catalogo ActivityType, catalogo Language, ampliacion recordType | Cada ticket creado tiene frontmatter valido + 1-2 lineas de request + tag `out-of-scope-TICKET-015` | borrar archivos |
| S5.T2 | Indexar los 8 tickets via `dkc_index_record`. Actualizar `MEMORY.md` o ticket-015 con la lista de IDs creados | dkc_find_records con tag `out-of-scope-TICKET-015` retorna 8 entradas | unindex (raro) |
| **S5.GATE** | **Gate de sync Session 5 (validation tier: T0)** | — | 8 tickets indexados + dev confirma que el split es correcto | — |

### Session 6 — Close (regression + teach-close)

| # | Task | Validacion | Rollback |
|---|------|-----------|----------|
| S6.T1 | Correr regression completa del mod: `npm test -w @uplanner/curriculum-design` + smoke completo del mod (CRUD de programa de asignatura, todos los selects funcionando) | Tests verdes + smoke OK | — |
| S6.T2 | Producir `tickets/ticket-015.teach/teach-close.md` siguiendo template DET-22. Incluir explicitamente la trazabilidad de "Origen de los valores bootstrap" del ticket | Archivo existe + frontmatter `teachings.close: done` | — |
| S6.T3 | Update ticket frontmatter: `status: closed`, `closed: 2026-05-11` (o fecha real), `spec: SPEC-curriculum-design-001-selects-options-fix` | grep en index | revert frontmatter |
| **S6.GATE** | **Gate de sync Session 6 (validation tier: T3)** ⚑ fuerte | — | Tests + smoke + teach-close + cierre — todo verde antes de marcar closed | — |

## Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-001 | TC-001 (Modality.deliveryMode 5 options con labels) | smoke + unit | pending |
| REQ-002 | TC-002 (LearningOutcome.bloomLevel 6 options Bloom) | smoke + unit | pending |
| REQ-003 | TC-003 (Bibliography.referenceType 3 options) | smoke + unit | pending |
| REQ-004 | TC-004 (Content.contentType 3 options) | smoke + unit | pending |
| REQ-005 | TC-005 (AcademicActivity.programLevel 4 options) | smoke + unit | pending |
| REQ-006 | TC-006 (AcademicActivity.workflowState 6 options + default Draft) | smoke + unit | pending |
| REQ-007 | TC-007 (CustomSection.contentType 1 option richText) | smoke | pending |
| REQ-008 | TC-008 (EvaluationComponent.componentType 3 options bootstrap) | smoke + unit | pending |
| REQ-009 | TC-009 (EvaluationComponent.method 6 options bootstrap + labels nuevas) | smoke + unit | pending |
| REQ-010 | TC-010 (Session.activityType 7 options bootstrap + labels nuevas) | smoke + unit | pending |
| REQ-011 | TC-011 (AcademicActivity.language 3 options ISO + default es) | smoke + unit | pending |
| REQ-012 | TC-012 (OrgUnit.type sigue siendo text libre) | regression | pending |
| REQ-013 | TC-013 (AcademicActivity.recordType sigue siendo enum solo `Course`) | regression | pending |

## Backlog (tickets futuros que cubre este spec referenciar)

Listados en TICKET-015 seccion `## Scope refinement > Out-of-scope`. 8 items totales — se crean en S5.

## Reglas aplicadas

- **DET-3** Inmutabilidad del request — request original preservado en TICKET-015
- **DET-5** Verificacion multi-capa — H1 evidenciada en frontend + backend + config; H3 en backend + schema
- **DET-8** Rollback documentado — cada task tiene rollback
- **DET-19** External id en repo — commits, branches, PRs usaran `UPONE-1038` (no `TICKET-015`)
- **DET-20** Sessions con gate de sync — 4 sessions cada una con su GATE
- **DET-21** teach-intake producido pre-design — `ticket-015.teach/teach-intake.md` existe
- **DET-22** teach-close obligatorio antes de status=closed — listado en S6.T2

## Rules / Bugs / Decisions del proyecto relevantes

- **DECISION-006** CustomSection cerrado a richText (justifica REQ-007 con 1 valor)
- **DECISION-007** RecordTypes globales (cambios afectan todos los tenants)
- **DECISION-012** Rollout phase 1 en tenant UPU
- **BR-TAX-002** Bloom revisada precargada (justifica REQ-002 con 6 valores Anderson-Krathwohl)
- **BR-TNT-002** Catalogos scope dual (justifica DEC-002 bootstrap como transicion)
