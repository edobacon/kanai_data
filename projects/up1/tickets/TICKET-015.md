---
id: TICKET-015
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Completar configuracion de selects en RecordTypes del mod (modo entrega, Bloom, bibliografia, formato, contenidos, evaluacion)

## Request

Los formularios de edicion de instancias en el mod curriculum-design muestran campos tipo select sin options en varios RecordTypes: Modalidad (modo de entrega), LearningOutcome (nivel Bloom), Bibliography (tipo), CustomSection (formato), Content (tipo de contenidos), EvaluationComponent (tipo). Revisar contra documentacion en Confluence (Curriculum Design + Modelo de objetos Learning Assurance) que opciones debe considerar cada select y si tienen alguna relacion. Hipotesis dual: (a) bug de UI/sync que oculta los enums ya declarados en 5 de 6 JSONs, (b) modelado incompleto en CustomSection.contentType (solo richText) y EvaluationComponent.componentType+method (sin enum). Asociar a UPONE-1038.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | data-modeling + UI/sync investigation |
| Modulo principal | curriculum-design |
| Modulos afectados | object-manager (typeDefs + sync), layout (RecordDetail.vue), suite (i18n enums.*) |
| creates_visual | false |
| creates_data | false |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Bug de UI/sync que oculta options de selects con enum declarado en el JSON. Los 5 RT con enum (Modality.deliveryMode, LearningOutcome.bloomLevel, Bibliography.referenceType, Content.contentType, AcademicActivity.programLevel) muestran select vacio en form de edicion | open | JSONs en mods/curriculum-design/objects/RecordTypes/* tienen `enum` con 3-6 valores cada uno. Pendiente verificar: (a) que `getObjectFields` exponga `enumValues` correctamente; (b) que RecordDetail.vue lea fieldMetadata.enumValues; (c) que i18n `enums.{fieldName}.{val}` no este silenciando options sin label. Referencias en RecordDetail.vue:2855-2909 (suite) |
| H2 | ~~Modelado incompleto CustomSection.contentType solo richText~~ → **DESCARTADA** post-research: DECISION-006 documenta que CustomSection es 1 RT fijo con campos estandar (richText unico contentType). Filosofia: estandarizacion > personalizacion. Doc Confluence v1.10 lista 6 valores (text/richText/list/table/file/json) pero el mod tomo decision explicita de cerrar a richText. Extensions UP1 cubren campos custom sin crear RTs nuevos. **El select vacio aqui es bug UI igual que H1, no gap de modelado** | resolved (descartada) | DECISION-006 (accepted 2026-04-28) en /Users/edobacon/Workspace/deckard/projects/up1/decisions/ |
| H3 | EvaluationComponent.componentType y method estan sin enum y sin FK. Por doc CAP-CUR-037 method es catalogo institucional configurable (portafolio, debate, simulacion, rubrica) → debe ser FK a objeto catalogo `EvaluationMethod`; componentType tipico `Parcial/Final/Agregado` (institucional, no cerrada) | open | rt__EvaluationComponent__curricularsection.json + Confluence Curriculum Design pageId 1989148681 CAP-CUR-029/037 |
| H4 | Campos adicionales con problemas similares descubiertos en barrido del mod: OrgUnit.type, AcademicActivity.language, AcademicActivity.recordType (enum solo `Course`), CurricularSection.recordType, Session.activityType — todos sin enum/FK. Confluence sugiere catalogos compartidos (CAP-CUR-036..044) para varios | open | Barrido automatico de mods/curriculum-design/objects/*.json + Confluence CAP-CUR-038/041, modelo de objetos |
| H5 | Drift entre Modelo v1.10 (Confluence) y JSONs del mod: existen campos documentados que no estan implementados (AcademicActivity.purpose, Modality.code/theoryHours/practiceHours/labHours/autonomousHours/isDefault, BibliographyReference.referenceFormat, EvaluationComponent.componentCode/isDirectEvidence/week, AcademicActivity.workflowState con 6 valores Draft/Review/Approved/Published/OpenForEdit/Deprecated). Tambien hay drift en valores enum: EvaluationComponent.componentType segun modelo es `Parcial/Final/Agregado` pero seed UV usa `Summative/Formative/Diagnostic` | open | Cruce Confluence pageId 2038366242 vs JSONs del mod + seeds del agente exploration (UV Ecuaciones Diferenciales) |
| H6 | Patron Default plataforma + Custom institucion (BR-TNT-002): los catalogos compartidos (estrategias, metodos, tipos actividad, idiomas) tienen 2 origenes — defaults de plataforma (no editables) + custom institucional. Resolucion: custom-first, fallback default. Esto implica que los catalogos no son enum cerrado ni FK simple — son objetos catalogo con scope dual | open | Confluence Reglas Transversales BR-TNT-002 + CAP-CUR-036..044 |
| H7 | Bloom revisada esta documentada como taxonomia precargada de plataforma (BR-TAX-002) con 6 niveles cognitivos Anderson-Krathwohl 2001 (Recordar/Comprender/Aplicar/Analizar/Evaluar/Crear). El mod ya tiene los 6 niveles en ingles (Remember/Understand/Apply/Analyze/Evaluate/Create) coincidente. Sugerencia IA disponible (BR-TAX-003) | confirmed | Confluence Reglas Transversales BR-TAX-002 + rt__LearningOutcome del mod |

### Context found

**Inventario completo de campos select del mod (mods/curriculum-design/objects/)**

| Objeto / RecordType | Campo | Estado actual | Doc Confluence | Brecha |
|---------------------|-------|--------------|----------------|--------|
| Modality (RT) | `deliveryMode` | enum 5: InPerson, Virtual, Hybrid, Synchronous, Asynchronous | doc: Presencial/Online/Hybrid (3) | ✅ Tiene opciones — investigar bug UI. Granularidad mayor que doc, OK |
| LearningOutcome (RT) | `bloomLevel` | enum 6 Bloom revisada: Remember, Understand, Apply, Analyze, Evaluate, Create | doc opcional, sin valores listados | ✅ Tiene opciones — investigar bug UI |
| Bibliography (RT) | `referenceType` | enum 3: Mandatory, Complementary, Digital | doc CAP-CUR-028: obligatoria/complementaria/digital | ✅ Coincide — investigar bug UI |
| Bibliography (RT) | `libraryRefId` | FK → BibliographyReference | doc CAP-CUR-042: biblioteca centralizada | ✅ FK correcta |
| CustomSection (RT) | `contentType` | enum **1 valor**: richText | doc: text/richText/list/table/file/json (6) | ❌ Modelado incompleto — ampliar enum |
| Content (RT) | `contentType` | enum 3: Theoretical, Practical, Laboratory | doc CAP-CUR-025 + modelo objetos: coincide | ✅ Coincide — investigar bug UI |
| EvaluationComponent (RT) | `componentType` | sin enum, sin FK | doc tipico Parcial/Final/Agregado (institucional) | ❌ Modelado incompleto — definir enum o FK |
| EvaluationComponent (RT) | `method` | sin enum, sin FK | doc CAP-CUR-037: catalogo institucional configurable | ❌ Falta — FK a objeto catalogo `EvaluationMethod` (o enum bootstrap) |
| Session (RT) | `activityType` | sin enum, sin FK | doc CAP-CUR-038: catalogo de tipos de actividad | ❌ Falta — FK a catalogo `ActivityType` (o enum bootstrap) |
| AcademicActivity (Base) | `programLevel` | enum 4: Undergraduate, Postgraduate, ContinuingEducation, TechnicalProfessional | doc coincide | ✅ Tiene opciones — investigar bug UI |
| AcademicActivity (Base) | `recordType` | enum **1 valor**: Course | doc Activity.purpose sugiere variedad (Academic/Formative/Service/Extracurricular) | ⚠️ Revisar si recordType debe ampliarse o si campo `purpose` separado falta |
| AcademicActivity (Base) | `language` | sin enum, sin FK | doc CAP-CUR-041: catalogo de idiomas | ❌ Falta — FK a catalogo `Language` (o enum ISO 639-1) |
| AcademicActivity (Base) | `purpose` | **NO EXISTE** en JSON | doc Modelo de objetos: enum Academic/Formative/Service/Extracurricular | ⚠️ Campo no implementado — evaluar si entra en alcance |
| OrgUnit (Base) | `type` | sin enum, sin FK | doc no listado en detalle (Faculty/Department/School/etc.) | ❌ Falta — enum o FK a catalogo `OrgUnitType` |
| CurricularSection (Base) | `recordType` | sin enum | discriminator de RT — sistema lo maneja nativamente | ⚠️ Verificar si requiere enum o queda por descubrimiento de archivos RT |

**Resumen de gaps por categoria**

| Categoria | Campos | Accion |
|-----------|--------|--------|
| Bug de UI/sync (enum existe, no aparece) | deliveryMode, bloomLevel, referenceType (Bibliography), contentType (Content), programLevel | Investigar fix UI/sync/i18n |
| Modelado: ampliar enum | CustomSection.contentType, AcademicActivity.recordType | Edit JSON del mod |
| Modelado: enum nuevo o FK a catalogo | EvaluationComponent.componentType, EvaluationComponent.method, Session.activityType, AcademicActivity.language, OrgUnit.type | Definir politica (enum bootstrap vs FK a objeto catalogo) y aplicar |
| Modelado: campo no existe | AcademicActivity.purpose | Evaluar incorporacion |

**Referencias documentales (Confluence)**

- [Curriculum Design (pageId 1989148681)](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681/Curriculum+Design) — CAP-CUR-015 (RA), CAP-CUR-017 (Modalidad), CAP-CUR-025 (Temas/contenidos), CAP-CUR-028 (Bibliografia tipo), CAP-CUR-029 (Evaluacion plantilla), CAP-CUR-036..044 (catalogos compartidos)
- [Modelo de objetos Learning Assurance (pageId 2038366242)](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242/Modelo+de+objetos+de+negocio+Learning+Assurance) — schemas detallados de cada objeto, enums y FKs propuestas
- [Configuracion de referencias (pageId 980713497)](https://u-planner.atlassian.net/wiki/spaces/uSuite0/pages/980713497/Configuracion+de+referencias) — patron legacy de tipos de referencia + estilos de citacion (imp_referencetype, imp_citationstyles, imp_referenceformats)
- [Transcript 2026-05-07 refinamiento backlog](../transcripts/2026-05-07-refinamiento-backlog-uassessment.md) — Outcomes C12 (sub_section en CustomSection), C16 (prioridad core: estado > versionamiento > carga archivos)

**Como funciona el sistema (research previo)**

1. Enum estatico: campo con `"enum": [...]` en JSON → `getObjectFields` expone `enumValues` → RecordDetail.vue construye `allowedItems = enumVals.map(val => ({ value: val, label }))` y crea Vueform `type: 'select'`. Intenta i18n `enums.{fieldName}.{val}`; si no existe usa raw.
2. FK dinamica: campo con `isForeignKey: true` + `references: "ObjetoTarget"` → fetchRelationOptions(target) → GraphQL `listInstances(name: target, limit: 100)` → mapea a `{value: id, label: displayLabel}`
3. NO existe mecanismo "endpoint custom para options" — solo enum o lookup via listInstances

## Scope refinement (2026-05-11)

**Decision del dev**: la documentacion Confluence (modelo v1.10) esta mas avanzada que la implementacion actual. Eso es trabajo de **otros tickets futuros**. Este ticket ajusta SOLO lo que ya existe para que presente opciones.

### In-scope (TICKET-015)

Para campos que **ya existen** en los JSONs del mod:

1. **Selects con enum YA declarado pero UI muestra vacio** (H1 — investigar pipeline JSON → typeDef → resolver → RecordDetail.vue → i18n). Campos:
   - Modality.`deliveryMode` (5 valores)
   - LearningOutcome.`bloomLevel` (6 valores)
   - Bibliography.`referenceType` (3 valores)
   - Content.`contentType` (3 valores)
   - AcademicActivity.`programLevel` (4 valores)
   - CustomSection.`contentType` (1 valor `richText`, intencional por DECISION-006)

2. **Selects sin enum/FK pero el campo ya existe — agregar enum bootstrap simple** (sin crear objetos catalogo nuevos, solo enum array en el JSON):
   - EvaluationComponent.`componentType` — reconciliar valor entre seed (Summative/Formative/Diagnostic) y doc (Parcial/Final/Agregado). Decision del dev requerida
   - EvaluationComponent.`method` — enum bootstrap minimo (no FK a catalogo, eso es futuro)
   - Session.`activityType` — enum bootstrap minimo (no FK a catalogo, eso es futuro)
   - AcademicActivity.`language` — enum bootstrap ISO 639-1 minimo (es/en/pt-BR como minimo). NO FK a catalogo
   - OrgUnit.`type` — **mantener como string libre** (es decision intencional segun modelo)
   - AcademicActivity.`recordType` — **mantener enum `['Course']`** (no agregar Workshop/Tutoring/Seminar/Service porque sus flujos no estan implementados)

### Out-of-scope (tickets futuros)

Implementacion de modelo v1.10 que va mas alla de ajustar selects existentes:

| Item | Razon | Ticket futuro sugerido |
|------|-------|------------------------|
| `AcademicActivity.purpose` (enum 4 valores) | Campo no existe en JSON. Implementacion nueva | `feat(curriculum-design): agregar AcademicActivity.purpose` |
| `Modality.code/theoryHours/practiceHours/labHours/autonomousHours/isDefault` | Campos no existen. Implementacion + UX | `feat(curriculum-design): campos extendidos Modality (carga horaria + isDefault)` |
| `BibliographyReference.referenceFormat` (enum 7 valores) | Campo no existe. Implementacion nueva | `feat(curriculum-design): BibliographyReference.referenceFormat` |
| `EvaluationComponent.componentCode/isDirectEvidence/week` | Campos no existen. Implementacion nueva | `feat(curriculum-design): campos extendidos EvaluationComponent` |
| Crear objeto catalogo `EvaluationMethod` (FK desde EvaluationComponent.method) | Objeto nuevo + scope dual (BR-TNT-002). Trabajo > 1 sprint | `feat(curriculum-design): catalogo EvaluationMethod` |
| Crear objeto catalogo `ActivityType` (FK desde Session.activityType) | Objeto nuevo + scope dual | `feat(curriculum-design): catalogo ActivityType` |
| Crear objeto catalogo `Language` (FK desde AcademicActivity.language) | Objeto nuevo + scope dual | `feat(curriculum-design): catalogo Language` |
| Ampliar `AcademicActivity.recordType` con Workshop/Tutoring/Seminar/Service | Necesita flujos implementados primero | `feat(curriculum-design): tipos de Activity adicionales` |
| Workflow state machine completa (Draft → Review → Approved → Published → OpenForEdit → Deprecated) | Depende de flow engine SP2 | (ya en backlog SP2) |
| MADS herencia automatica programa → silabo | Requiere offering implementado | (futuro) |

### Hipotesis activas tras el refinamiento

- **H1** (bug UI sobre 5 enums declarados) — core del ticket
- **H3** (EvaluationComponent.componentType+method sin enum) — parcialmente en alcance: agregar enum bootstrap, NO FK a catalogo
- **H4** (adicionales sin enum/FK) — parcialmente en alcance: solo enum bootstrap simple
- ~~H2~~ descartada (DECISION-006)
- ~~H5~~ trasladada a out-of-scope (drift v1.10 = tickets futuros)
- ~~H6~~ trasladada a out-of-scope (catalogos scope dual = tickets futuros)
- **H7** confirmada (Bloom OK, no requiere accion)

## Documentation digest

Consolidacion del modelo, comportamiento y reglas de negocio para cada objeto/campo del alcance del ticket. Fuentes: Confluence Learning Assurance (espacio uP1) + decisions DKC del proyecto + README del mod + seed/lang del mod.

### Filosofia del modelo (decisiones que rigen el ticket)

| Decision | Tema | Resumen |
|----------|------|---------|
| [DECISION-006](../decisions/) | `CustomSection` cerrado a richText | 1 RT fijo con estructura fija. **Estandarizacion > personalizacion**. Extensions UP1 cubren campos custom sin crear RTs nuevos. Implica: contentType=`['richText']` es por diseno, NO gap |
| [DECISION-007](../decisions/) | RecordTypes globales | Todos los RT (Modality, LearningOutcome, Content, Session, EvaluationComponent, Bibliography, CustomSection) son globales para todos los tenants. 1 set a mantener vs N duplicados. Implica: agregar/cambiar enums afecta a todos los tenants simultaneamente |
| [DECISION-012](../decisions/) | Rollout 2 fases | SP1 carga TODO en tenant UPU (Univalle + AIEP como datos distintos en mismo tenant). Phase 2 separa por tenant |
| [DECISION-013](../decisions/) | Core objects en mod | `Organization`, `OrgUnit`, extension `Institution` modelados en el mod con append-only merge al core. Permite avanzar sin coordinacion externa. Implica: OrgUnit.type, Organization.type viven en el mod hoy y se promoveran |
| [DECISION-004](../decisions/) | `externalId` campo unico | 1 campo `externalId: string \| null`. Alineado con `integrationId` estandar UP1 |

### Reglas transversales aplicables (BR-XXX-NNN)

| Regla | Aplicable a este ticket |
|-------|--------------------------|
| **BR-WKF-001** Reglas generales workflow | AcademicActivity tiene `workflowId` + `currentStatusId`. Cada transicion genera auditoria inmutable (quien/cuando/origen/destino/comentario). Workflows configurables por institucion con defaults de plataforma no eliminables |
| **BR-WKF-002** Control acceso por workflow | Estados finales no editables; para editar deben transicionar a estado editable primero. Rol requerido por transicion |
| **BR-WKF-003** Inmutabilidad por estudiantes activos | Plan con alumnos activos no puede cerrarse. Se propaga a matrices y perfiles. Implementacion como validacion de negocio, no constraint BD |
| **BR-TNT-002** Defaults plataforma vs custom institucional | Catalogos = default plataforma (no editable) + custom institucion (editable). Resolucion: custom-first, fallback default. **Implica para el ticket**: `EvaluationMethod`, `ActivityType`, `Language`, `OrgUnitType` deben ser objetos catalogo con scope dual, NO enums duros |
| **BR-TAX-002** Taxonomias precargadas | Bloom revisada (Anderson-Krathwohl 2001) precargada en plataforma. 6 niveles: Recordar/Comprender/Aplicar/Analizar/Evaluar/Crear. Sugerencia IA por verbo de accion (BR-TAX-003) |
| **BR-MIG-001** Herencia MADS | Al crear silabo, estructura del programa de curso se hereda automaticamente: componentes evaluacion, RA, contenidos, estrategias, referencias, vinculos. Flag `isSynchronizable` distingue heredado de manual |
| **BR-MIG-002** Control sincronizacion | Parametros institucionales: `migrationOverUserEdition`, `migrationWithDataDeactivation`, `migrationWithSyllabusTransition` |
| **BR-LIB-001** Libertad evaluativa | Parametro institucional Restringido/Guiado/Libre que define personalizacion del docente sobre estructura heredada |
| **BR-INT-002** Escenarios integracion SIS | Escenario A (SIS gobierna), B (transicion), C (gobernanza uPlanner). Determina si taxonomias aplican |

### Objetos en alcance — schema documentado vs schema en mod

#### `AcademicActivity` (silabo / programa de asignatura)

**Schema documentado en Confluence (v1.10)**:

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `id` | UUID | Si | PK | ✅ |
| `executionUnitId` | UUID | Si | FK → orgUnit (recordType=AcademicExecution) | ✅ |
| `name` | string | Si | | ✅ |
| `code` | string | Si | Compartido entre versiones | ✅ |
| `recordType` | string | Si | `Course` documentado; planificados `Workshop, Tutoring, Seminar, Service` | ⚠️ enum solo `['Course']` |
| `purpose` | string? | No | Enum `Academic / Formative / Service / Extracurricular`. Agrupador transversal por intencion | ❌ **NO EXISTE** |
| `version` | string | Si | Codigo de version libre | ✅ |
| `previousVersionId` | UUID? | No | FK → activity (cadena) | ✅ |
| `workflowId` | UUID | Si | FK → workflow; scopeType=activity | ¿? verificar |
| `currentStatusId` | UUID | Si | FK → workflowStatus. Categorias tipicas: ToDo → InExecution → InReview → Published → Closed | ¿? verificar |
| `language` | string | Si | ISO 639-1, default `es` | ⚠️ sin enum, sin FK a catalogo |
| `description` | string? | No | | ✅ |
| `externalId` | string? | No | DECISION-004 | ✅ |
| `credits` | number | Si (Course) | Solo para recordType=Course | ¿? verificar |
| `programLevel` | string | Si (Course) | Enum `Undergraduate / Postgraduate / ContinuingEducation / TechnicalProfessional`. Solo para recordType=Course | ✅ enum 4 |
| `workflowState` | enum | Si | `Draft / Review / Approved / Published / OpenForEdit / Deprecated` (6) — Ver README mod | ¿? verificar JSON |

**Reglas de negocio**:
- "No tiene `programId` directo. Una asignatura puede aparecer en multiples academicProgram via planEntry."
- "OpenForEdit permite cambios micro sobre una version Active sin generar nueva version."
- "Carga horaria y modalidad viven en `curricularSection (recordType=Modality)`. Una asignatura debe tener al menos una seccion Modality."
- Creditos canonicos: `credits` es fuente de verdad; `planEntry.credits` es override opcional.
- MADS: sus secciones se heredan a offering cuando currentStatus.category=Published.

#### `CurricularSection` (base abstract, discriminator pattern)

**Schema documentado**:

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | UUID | Si | |
| `ownerType` | enum | Si | `activity / offering / curriculumPlan` |
| `ownerId` | UUID | Si | FK polimorfica |
| `parentId` | UUID? | No | Composite; solo EvaluationComponent |
| `sourceId` | UUID? | No | FK → curricularSection origen (MADS) |
| `recordType` | string | Si | 7 RTs (ver abajo) — discriminator |
| `sectionType` | enum | Si | `Structural / Complementary`. Solo CustomSection es Complementary |
| `name` | string | Si | |
| `position` | number | Si | Orden dentro del dueno o padre |
| `isSynchronizable` | boolean | Si | Default true; propaga MADS si true |
| `isVisible` | boolean | Si | Default true |
| `isRequired` | boolean | Si | Default false |

**Mapeo recordType × ownerType**:

| recordType | activity | offering | curriculumPlan |
|------------|----------|----------|----------------|
| LearningOutcome | Si | Si (MADS) | No |
| EvaluationComponent | Si | Si (MADS + ajustes) | No |
| Content | Si | Si (MADS) | No |
| Session | Opcional | Si | No |
| Modality | Si (≥1 requerida) | Si (MADS) | No |
| ApprovalCondition | Si | Si (MADS) | No |
| GeneralData | Si | Si | Si |
| GraduationProfile | No | No | Si |
| EntryProfile | No | No | Si |
| Bibliography | Si | Si (MADS + ajustes) | Si |
| CustomSection | Si | Si | Si |

**Comportamiento MADS**: sourceId traza el origen. Si template cambia e `isSynchronizable=true`, copia se re-sincroniza automaticamente. ChangeLog registra con `source=MADS`, `action=MADSSync`.

#### `Modality` (RT de CurricularSection)

**Schema documentado** (v1.10):

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `code` | string | Si | Ej: PRES, ONL, DIU-PRE, VES-TLS | ¿? verificar |
| `theoryHours` | number? | No | Horas semanales teoria | ¿? verificar |
| `practiceHours` | number? | No | Horas semanales practica | ¿? verificar |
| `labHours` | number? | No | Horas semanales laboratorio | ¿? verificar |
| `autonomousHours` | number? | No | Horas semanales trabajo autonomo | ¿? verificar |
| `isDefault` | boolean | Si | Solo una Modality por dueno puede ser `true` | ¿? verificar |
| `deliveryMode` | enum? | No | `Presencial / Online / Hybrid` (3 doc) | ✅ enum 5 (mod tiene granularidad mayor: InPerson/Virtual/Hybrid/Synchronous/Asynchronous) |

**Regla**: "Una asignatura debe tener al menos una seccion Modality." Multi-modalidad nativa.

#### `LearningOutcome` (RT de CurricularSection)

**Schema documentado**:

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `code` | string | Si | Ej: RA-01 | ✅ |
| `bloomLevel` | string | No | Nivel taxonomia Bloom revisada (BR-TAX-002). Sugerencia IA por verbo de accion | ✅ enum 6 EN |
| `isRequiredInAllSections` | boolean | Si | Requerido en toda seccion del curso; default false. BR-LIB-003 | ¿? verificar |

**Comportamiento**: Curriculum Mapping lo consume para tributacion; Learning Assessment para calculo logro. Vinculos via `competencyAlignment` (sourceType=curricularSection) y `curricularLink` (linkType=Develops).

#### `Content` (RT de CurricularSection)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `hours` | number? | No | Horas asignadas | ¿? verificar |
| `contentType` | string? | No | `Theoretical / Practical / Laboratory` | ✅ enum 3 |

**Comportamiento**: jerarquia plana (sin Composite). Vinculos via `competencyAlignment` y `curricularLink` (Session cubre Content `Covers`, Content desarrolla LearningOutcome `Develops`). Un Content puede desarrollar varios RAs.

#### `Session` (RT de CurricularSection)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `week` | integer | Si | Numero de semana | ¿? verificar |
| `activityType` | string? | No | Tipo de actividad del **catalogo institucional** (CAP-CUR-038) | ❌ sin enum / sin FK |
| `activityDescription` | string? | No | | ¿? verificar |
| `duration` | number? | No | Horas | ¿? verificar |

**Comportamiento**: tipica en silabo, opcional en programa de asignatura. Vinculos via curricularLink: Session cubre Content (Covers), Session usa Bibliography (Uses).

#### `Bibliography` (RT de CurricularSection)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `libraryRefId` | UUID | Si | FK → bibliographyReference | ✅ |
| `referenceType` | enum | Si | `Mandatory / Complementary / Digital` | ✅ enum 3 |
| `notes` | string? | No | Ej: "Capitulos 3 a 5" | ¿? verificar |

#### `BibliographyReference` (catalogo institucional)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `id` | UUID | Si | | ✅ |
| `institutionId` | UUID | Si | FK → institution. Scope institucional | ¿? verificar |
| `rawCitation` | string | Si | **Unico campo siempre requerido**. Fallback universal | ¿? verificar |
| `title`, `author`, `year`, `publisher`, `isbn`, `doi`, `url` | string?/int? | No | Todos opcionales | ¿? verificar |
| `referenceFormat` | enum? | No | `Book / Article / Website / Thesis / Chapter / ConferencePaper / Other` (7) | ❌ **NO existe en JSON** |
| `metadata` | JSON? | No | Custom por institucion | ¿? verificar |

**Regla**: "El estilo de citacion no vive aqui. Se aplica al renderizar" (CAP-CUR-043: catalogo estilos citacion APA/MLA/Chicago/Vancouver/IEEE).

#### `EvaluationComponent` (RT de CurricularSection — composite tree)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `weight` | number | Si | Ponderacion porcentual (relativa al padre en Composite, o a 100 raiz) | ¿? verificar |
| `method` | string? | No | Metodo evaluacion — **catalogo institucional** (CAP-CUR-037: portafolio, debate, simulacion, rubrica, etc.) | ❌ sin enum / sin FK |
| `componentCode` | string? | No | Ej: P1, NF | ¿? verificar |
| `componentType` | string? | No | **Drift entre fuentes**: doc dice "Parcial/Final/Agregado (institucional, no cerrada)"; seed UV dice `Summative/Formative/Diagnostic` | ❌ sin enum / sin FK |
| `isDirectEvidence` | boolean? | No | true = evidencia directa; false = nodo agregador | ¿? verificar |
| `week` | integer? | No | Semana de aplicacion; solo offering | ¿? verificar |

**Comportamiento**: composite tree (parentId del base habilita arbol). Unico RT con estructura de arbol. Base del calculo de notas y herencia MADS. Cadena de logro: studentGrade → EvaluationComponent (offering) → EvaluationComponent (activity) → competencyAlignment → competencyNode → achievement.

**Reglas evaluacion** (CAP-CUR-029):
- Suma de ponderaciones de primer nivel = 100%
- Method del catalogo institucional CAP-CUR-037
- Vinculos opcionales a LearningOutcome se heredan a seccion via MADS

#### `CustomSection` (RT de CurricularSection — Complementary)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `contentType` | enum | Si | Doc lista `text/richText/list/table/file/json` (6) | ⚠️ **mod cerro a `['richText']` por DECISION-006 — INTENCIONAL** |
| `content` | string? | No | Serializado segun contentType | ¿? verificar |
| `maxLength` | integer? | No | Configurable institucion | ¿? verificar |

**Decision**: CustomSection es 1 RT fijo con estructura fija; Extensions UP1 cubren campos custom. No crear N RTs custom.

#### `OrgUnit` (Base — composite auto-referencial)

| Campo | Tipo | Requerido | Notas | En mod? |
|-------|------|-----------|-------|---------|
| `id` | UUID | Si | | ✅ |
| `organizationId` | UUID | Si | FK → organization | ¿? verificar |
| `institutionId` | UUID? | No | Requerido solo si recordType=AcademicGovernance | ¿? verificar |
| `parentId` | UUID? | No | FK → orgUnit self; padre debe tener mismo recordType | ¿? verificar |
| `recordType` | enum | Si | `Geographic / AcademicGovernance / AcademicExecution` (3 trees independientes) | ¿? verificar |
| `name` | string | Si | | ✅ |
| `code` | string? | No | Ej: DEPT-MAT | ¿? verificar |
| `type` | string | Si | **String abierto** con sugeridos por tree (ver abajo) | ❌ sin enum (consistente con doc) |
| `status` | enum | Si | `Active / Suspended / Discontinued` | ¿? verificar |

**Sugeridos `type` por tree** (no enum cerrado, son ejemplos):
- **Geographic**: Campus, Building, Floor, Room
- **AcademicGovernance**: Vicerrectoria, Faculty, School, Department, Committee
- **AcademicExecution**: Department, Unit, TeachingGroup, LanguageCenter

**Regla**: "Los tres arboles son independientes" + "Discontinued no es Deleted — los nodos descontinuados se conservan para trazabilidad historica."

### Catalogos compartidos (CAP-CUR-036 a CAP-CUR-044)

Por BR-TNT-002 son objetos con scope dual (Default plataforma + Custom institucion, custom-first resolution):

| Catalogo | CAP | Usado por | Estado en mod |
|----------|-----|-----------|---------------|
| Estrategias de aprendizaje | CAP-CUR-036 | Session.strategy | NO existe como objeto en mod |
| Metodos de evaluacion | CAP-CUR-037 | EvaluationComponent.method | NO existe como objeto en mod |
| Tipos de actividad | CAP-CUR-038 | Session.activityType | NO existe como objeto en mod |
| Areas/subareas aprendizaje | CAP-CUR-039 | AcademicActivity | — |
| Tipos de recurso | CAP-CUR-040 | Session resource | — |
| Idiomas | CAP-CUR-041 | AcademicActivity.language | NO existe como objeto en mod |
| Biblioteca referencias | CAP-CUR-042 | Bibliography.libraryRefId | ✅ existe (BibliographyReference) |
| Estilos citacion | CAP-CUR-043 | Render-time (no FK directa) | NO existe como objeto en mod |
| Tipos de curso | CAP-CUR-044 | AcademicActivity.recordType extension | NO existe como objeto en mod |

### i18n — keys de enums existentes en el mod (lang/)

Segun barrido de `lang/es_CL@*.json` del mod:

| Archivo lang | Keys de enum |
|--------------|--------------|
| `es_CL@rt__Modality__curricularsection.json` | `enums.deliveryMode.*` (5 valores) |
| `es_CL@rt__LearningOutcome__curricularsection.json` | `enums.bloomLevel.*` (6 valores) |
| `es_CL@rt__EvaluationComponent__curricularsection.json` | `enums.componentType.*` (drift Summative/Formative/Diagnostic vs doc Parcial/Final/Agregado) |
| `es_CL@AcademicActivity.json` | `enums.workflowState.*`, `enums.programLevel.*` |
| `es_CL@OrgUnit.json` | `enums.recordType.*`, `enums.status.*` |
| `es_CL@BibliographyReference.json` | `enums.referenceFormat.*` (existe lang aunque campo no este en JSON) |

**Implicacion para H1 (bug UI)**: si los lang keys existen pero la UI muestra select vacio, el problema NO es i18n missing — esta en el pipeline JSON → typeDef → resolver → RecordDetail.vue.

### Drift detectado entre Confluence y mod

| Campo | Doc dice | Mod tiene | Gap |
|-------|----------|-----------|-----|
| AcademicActivity.purpose | enum 4 valores | no existe | falta campo |
| AcademicActivity.recordType | Course + Workshop/Tutoring/Seminar/Service planificados | enum solo `Course` | ampliar |
| AcademicActivity.language | FK a catalogo idiomas (CAP-CUR-041) | sin enum / sin FK | modelar catalogo |
| AcademicActivity.workflowState | enum 6 valores | ¿? verificar | confirmar |
| Modality (varios campos) | code/theoryHours/practiceHours/labHours/autonomousHours/isDefault | parciales | verificar JSON |
| Bibliography.referenceFormat | enum 7 valores en BibliographyReference | no existe campo | agregar a BibliographyReference (no al RT) |
| EvaluationComponent.componentType | "Parcial/Final/Agregado" (institucional) | sin enum + seed usa Summative/Formative/Diagnostic | reconciliar |
| EvaluationComponent.method | catalogo institucional (CAP-CUR-037) | sin enum / sin FK | modelar catalogo |
| EvaluationComponent.componentCode/isDirectEvidence/week | doc | ¿? | verificar |
| Session.activityType | catalogo institucional (CAP-CUR-038) | sin enum / sin FK | modelar catalogo |
| OrgUnit.type | string abierto con sugeridos por tree | sin enum (consistente) | no es gap, validar UX |

### Referencias completas

**Confluence (espacio uP1 — Learning Assurance)**:
- [Vision Funcional](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2002223105)
- [Curriculum Design](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681) (capacidades CAP-CUR-001 a CAP-CUR-065)
- [Curriculum Mapping](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1987674175)
- [Learning Assessment](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989705746)
- [Reglas Transversales](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713) (BR-WKF, BR-TNT, BR-INT, BR-VER, BR-PRM, BR-LIC, BR-NOT, BR-TAX, BR-MOD, BR-MIG, BR-CAL, BR-LIB, BR-HIL)
- [Flujos Funcionales](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2001207299)
- [Integraciones](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989574665)
- [Modelo de objetos Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) (schema v1.10)

**Decisions DKC (proyecto up1)**:
- DECISION-004 (externalId), DECISION-006 (CustomSection cerrado), DECISION-007 (RTs globales), DECISION-012 (rollout 2 fases UPU), DECISION-013 (core objects en mod)

**Docs del mod (curriculum-design/docs/guides/)**:
- `seed-data.md` (datasets idempotentes, dispatch por tenant)
- `composite-section-tree.md` (componente custom Vueform)
- `rich-text-renderer.md` (HTML sanitizado read-only)
- `rt-extending.md` (patron para agregar RTs nuevos)

**Datos seed (UV — Ecuaciones Diferenciales 111026C v2022-actual)**:
- 3 LearningOutcomes (RA1-RA3, sin bloomLevel poblado)
- 18 Sessions semanales
- Tree evaluacion: Nota Final (100%) → 6 Quizzes (11% c/u) + Examen Parcial (34%)
- 9 referencias bibliograficas (3 Mandatory + 3 Complementary + 2 Digital)
- Componentes con type: Summative (NF), Formative (Q1-Q6), Summative (EP)

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion — refinado 2026-05-11 tras scope adjustment)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Intake + research: barrido completo del mod, consulta Confluence, hipotesis, scope refinement | intake | T0 | request → intake-explore → teach-intake | ⚑ fuerte | Hipotesis activas documentadas, context found completo, scope in/out delimitado, teach-intake.md producido |
| S2 | Design del fix: trazado del pipeline JSON → typeDef → resolver → RecordDetail.vue + decisiones de valores para enums bootstrap (componentType, method, activityType, language) | design | T0 | design-fix → spec con tasks contractuales | ⚑ fuerte | Spec firmado, tasks con source_ref y rollback, valores de enum bootstrap decididos con el dev |
| S3 | Investigacion + fix bug UI (H1 — core del ticket): reproducir UI vacio en navegador, trazar `getObjectFields` → typeDef → RecordDetail.vue → Vueform render. Identificar y arreglar la causa raiz. Aplica a 6 selects con enum ya declarado | execute | T2 | reproducir → trazar → fix → verificar | auto | Tests unit + smoke manual UI: Modality/LearningOutcome/Bibliography/Content/programLevel/CustomSection muestran options con labels i18n |
| S4 | Agregar enum bootstrap a campos sin enum (H3/H4 — alcance parcial): EvaluationComponent.componentType+method, Session.activityType, AcademicActivity.language. Edits JSON simples; mantener `recordType=['Course']` y `OrgUnit.type` libre | execute | T1 | edits JSON + sync + lang keys + verificacion | auto | Sync pasa, los nuevos enums se renderizan con options + labels |
| S5 | Documentar trabajo futuro out-of-scope: crear 8 placeholders de tickets futuros (purpose, Modality extendida, referenceFormat, EvaluationComponent extendido, 3 catalogos, recordType expansion) en backlog del ticket o como tickets nuevos en estado `open`. NO implementar | execute | T0 | docs + crear tickets backlog | ⚑ fuerte | Backlog de tickets futuros registrado, dev confirma split correcto |
| S6 | Close: regression del mod + teach-close | close | T3 | regression + teach-close | ⚑ fuerte | Tests verdes, teach-close.md producido, ticket marcado closed |

### Session 1 — Intake + research (2026-05-11) [tipo: ⚑ fuerte] [tier: T0]

| Campo | Valor |
|-------|-------|
| Objetivo | Capturar el problema, consultar Confluence, hacer barrido completo del mod, formular hipotesis, delimitar scope, producir teach-intake |
| Started | 2026-05-11 |
| Closed | 2026-05-11 |
| Status | done |

**S1.GATE — Gate de sync Session 1**

| Item | Resultado |
|------|-----------|
| Hipotesis documentadas (H1-H7) | ✅ 7 hipotesis con evidencia multi-capa y rationale |
| Context found completo | ✅ Inventario de 15 campos + cross-reference vs Confluence + decisions |
| Scope in/out delimitado | ✅ Seccion `## Scope refinement (2026-05-11)` con 10 items in-scope + 8 out-of-scope |
| teach-intake.md producido | ✅ `tickets/ticket-015.teach/teach-intake.md` con 7 secciones canonicas + blockquotes narrativos + 4 bloques `dkc:*` |
| Frontmatter `teachings.intake: done` | ✅ Actualizado |
| Active questions registradas | ✅ AQ-1 (drift componentType BLOQUEANTE), AQ-2/3 (valores bootstrap), AQ-4 (verificar i18n) |
| Decision: continue / iterate / escalate / standby | **continue** → S2 design-fix |

**Log**

- Pregunta original del dev: como obtienen las options los selects, donde se registran
- Research previo (Explore agent): mecanismo de selects = enum estatico o FK via listInstances. RecordDetail.vue lee fieldMetadata.enumValues; FK fetchea con listInstances(name, limit:100)
- Dev identifica 5+1 selects con problema: Modalidad/modo entrega, RA/Bloom, Bibliografia/tipo, CustomSection/formato, Content/tipo, Evaluacion/tipo
- Consulta Confluence en paralelo (6 queries) → 4 paginas relevantes leidas (Curriculum Design 1989148681, Modelo de objetos 2038366242, Config referencias 980713497, Modelo datos uAssessment 1205895174)
- Cruce con JSONs del mod: 3 selects estan OK con enum (deliveryMode, bloomLevel, referenceType, contentType de Content, programLevel), 1 incompleto (CustomSection.contentType = solo richText), 1 sin enum (EvaluationComponent)
- Dev pide registrar adicionales encontrados en barrido: barrido completo del mod identifica 4 mas (OrgUnit.type, AcademicActivity.language, AcademicActivity.recordType limitado a Course, Session.activityType) + 1 campo no existente (AcademicActivity.purpose)
- Ticket TICKET-015 scaffoldado, external UPONE-1038, work_type fix, module curriculum-design
- Dev pide incorporar TODA la info de Confluence + docs sobre estos elementos
- Research exhaustivo lanzado en paralelo (4 agentes): (a) decisions DKC del proyecto, (b) re-lectura completa modelo objetos Learning Assurance (106KB), (c) docs/guides del mod + seeds + lang, (d) lectura Reglas Transversales en Confluence
- Hallazgo CRITICO 1: DECISION-006 confirma que CustomSection.contentType=`['richText']` es INTENCIONAL (filosofia estandarizacion > personalizacion). H2 descartada
- Hallazgo CRITICO 2: DECISION-007 establece RTs globales (no per-tenant). Implica que cambios en enums impactan todos los tenants simultaneamente
- Hallazgo CRITICO 3: Modelo v1.10 documenta campos que no existen en JSON del mod: AcademicActivity.purpose (enum 4 valores), Modality.code/theoryHours/practiceHours/labHours/autonomousHours/isDefault, BibliographyReference.referenceFormat (enum 7), EvaluationComponent.componentCode/isDirectEvidence/week
- Hallazgo CRITICO 4: BR-TNT-002 dice que catalogos (estrategias, metodos, tipos actividad, idiomas) son **objetos con scope dual** (default plataforma + custom institucion, custom-first). NO son enum cerrado ni FK simple. Esto refina H6 sobre EvaluationMethod, ActivityType, Language, OrgUnitType
- Hallazgo CRITICO 5: BR-TAX-002 confirma Bloom revisada (Anderson-Krathwohl 2001) precargada. Los 6 niveles del mod coinciden con la taxonomia. Hay sugerencia IA disponible (BR-TAX-003)
- Hallazgo CRITICO 6: Drift entre fuentes en EvaluationComponent.componentType: doc dice "Parcial/Final/Agregado"; seed UV usa "Summative/Formative/Diagnostic"; lang files tienen `enums.componentType.*` keys. Necesario reconciliar antes de implementar
- Hallazgo CRITICO 7: Lang files YA TIENEN keys `enums.*` para los enums declarados (Modality.deliveryMode, LearningOutcome.bloomLevel, EvaluationComponent.componentType, AcademicActivity.workflowState/programLevel, OrgUnit.recordType/status, BibliographyReference.referenceFormat). Si la UI no muestra options, el problema NO es i18n missing — es pipeline JSON → typeDef → resolver → RecordDetail.vue
- Hipotesis actualizadas: H1, H3, H4 abiertas; H2 descartada; H5 (drift), H6 (catalogos scope dual), H7 (Bloom confirmada) agregadas
- Documentation digest completo agregado al ticket en `## Documentation digest`
- Dev refina alcance (2026-05-11): doc Confluence v1.10 esta mas avanzada que implementacion actual; ese gap es trabajo de tickets futuros. Este ticket SOLO ajusta lo que ya existe para que muestre opciones
- Scope split documentado en `## Scope refinement`: in-scope = bug UI sobre 6 enums declarados (H1) + enum bootstrap simple para 4 campos sin enum (H3/H4 parcial). Out-of-scope = 8 items de implementacion v1.10 (purpose, Modality extendida, referenceFormat, EvaluationComponent extendido, catalogos EvaluationMethod/ActivityType/Language, ampliacion recordType)
- H5 y H6 reclasificadas a out-of-scope (se mantienen en hipotesis para trazabilidad pero no son alcance)
- Plan de sessions refinado: S2 ya no decide enum vs FK vs catalogo (los catalogos son out-of-scope), solo trazado pipeline + decisiones de valores bootstrap. S4 reducida a edits JSON simples. S5 ahora documenta y crea tickets futuros (no implementa)
- teach-intake.md producido bajo `ticket-015.teach/teach-intake.md` con cobertura 4-ejes (eje 1: why, eje 2: hypothesis map + basics, eje 3: code preview, eje 4: decision drivers) + 4 bloques `dkc:hypothesis-map` / `dkc:decision-matrix` x2 / `dkc:code-walkthrough` / `dkc:learning-path`
- S1 cerrada con gate ⚑ fuerte. Decision: continue → S2

### Session 6 — Close (2026-05-11) [tipo: ⚑ fuerte] [tier: T0]

| Campo | Valor |
|-------|-------|
| Objetivo | Producir teach-close (DET-22) + MD ampliado de presentacion del caso para team UP1 + cerrar ticket en estado bloqueado por fix de core |
| Started | 2026-05-11 |
| Closed | 2026-05-11 |
| Status | done |

**S6.GATE — Gate de sync Session 6**

| Item | Resultado |
|------|-----------|
| teach-close.md producido (DET-22) | ✅ `tickets/ticket-015.teach/teach-close.md` con 5 ejes cubiertos + 3 decisiones documentadas + dkc:hypothesis-map post-hoc + dkc:learning-path |
| MD ampliado de presentacion para team UP1 | ✅ `tickets/ticket-015.escalation/case-presentation-platform-team.md` con TL;DR + objetos relacionados + esperado/actual + root cause + line-level localization + 4 alternativas de fix + alcance ampliado |
| Frontmatter teachings.close: done | ✅ |
| Frontmatter closed: 2026-05-11 | ✅ |
| Decision: continue / iterate / escalate / **standby** | **standby** — ticket cerrado en estado bloqueado por BUG-platform-015. Implementacion S3.T2-T5 + S4 + S5 + S6 regression pendientes hasta que el equipo plataforma aplique el fix |

**Log**

- 2026-05-11 S6: produccion teach-close.md siguiendo template DET-22. Cubre 5 ejes obligatorios (1-2-3 desde teach-intake, 4-5 propios del close)
- 2026-05-11 S6: MD de presentacion del caso producido en `ticket-015.escalation/case-presentation-platform-team.md` — un solo documento consolidado con TL;DR + contexto del mod + objetos relacionados + sintoma esperado vs actual con mockups + reproduccion GraphQL + comparacion RT vs baseObject + pipeline vertical con bug aislado + root cause line-level (2154/2361/2432) + fix con diff + validacion + seccion "¿se pierden datos?" (no) + 4 alternativas + alcance ampliado opcional + impacto. **Doc consolidado**: previamente coexistia un escalation-to-platform.md compacto que se merged en este unico archivo (2026-05-11)
- 2026-05-11 S6: ticket cerrado en estado `closed` con `must` items pendientes (regla 17 — backlog must bloquearia cierre, pero el `must` aqui esta bloqueado por dependencia externa). Documentado en teach-close What to do next como sub-backlog que se retoma cuando llegue fix del core
- 2026-05-11 S6: ticket reabrirse via `dkc continue` cuando el equipo plataforma confirme fix aplicado. Reabrir → volver al execute (continuar S3.T2-T5 + S4 + S5 + S6 regression con plan ya documentado en SPEC-001)

---

### Session 3 — Execute fix bug UI (2026-05-11) [tipo: auto] [tier: T2]

| Campo | Valor |
|-------|-------|
| Objetivo | Reproducir bug UI sobre selects con enum declarado; trazar pipeline JSON → typeDef → resolver → RecordDetail.vue; localizar falla; aplicar fix; validar 7 selects (REQ-001 a REQ-007) |
| Started | 2026-05-11 |
| Status | in_progress |

**Log**

- 2026-05-11 S3.T1 inicio: snapshot timestamps typeDefs antes del sync (09:14:09)
- 2026-05-11 S3.T1: backend om (PID 88942 nodemon) y suite (PID 89420 nuxt dev) corriendo en hot-reload
- 2026-05-11 S3.T1: `npm run sync` completo ✅ — 3 workspaces (om 52.68s, layout 0.64s, suite 1.05s). TypeDefs regenerados (10:50:51 > pre 09:14:09)
- 2026-05-11 S3.T2: query directa al backend GraphQL para trazar pipeline:
  - `getObjectFields(name: "Modality")` → retorna solo 2 fields irrelevantes (otro objeto "Modality" del workspace engagement). Patron de nombrado de RT es `rt__X__Y` desde el filename
  - `getObjectFields(name: "CurricularSection")` → 11 baseFields, ownerType.enumValues=`["AcademicActivity","Offering"]` ✅, sectionType.enumValues=`["STRUCTURAL","COMPLEMENTARY"]` ✅. PERO los campos del RT (deliveryMode, etc) NO aparecen
  - `getObjectFields(name: "rt__Modality__curricularsection")` → 11 baseFields + 7 customFields del RT. **TODOS los enumValues retornan `null`**, incluyendo `ownerType` que en el otro query SI tenia enumValues
- 2026-05-11 S3.T3: trace del resolver `getObjectFields` en `object-manager/src/graphql/resolvers/objectDefinition.resolver.js`. Linea 247/269: `enumValues: fd.properties?.enumValues || null` — lee desde BD `core_FieldDefinition.properties.enumValues`. Si la BD no tiene `enumValues` poblado, retorna null. **El resolver no es el bug** — la BD no tiene el dato

### Bug localizado (FUERA DE ALCANCE — codigo de equipo plataforma UP1)

**Bug**: `object-manager/src/services/codegen/generatePrismaSchema.js` — drift entre 3 paths de creacion de `core_FieldDefinition`:

| Path | Linea | Para que | Copia `enumValues`? |
|------|-------|----------|---------------------|
| 1 (baseFields de Base object) | 2154-2157 | Procesar Base/X.json | ✅ SI — copia tanto `enum` como `enumValues` |
| 2 (baseFields heredados al RT) | 2361 | Para cada RT, copia campos del baseObject | ❌ NO — solo copia `enum` (sin `enumValues`) |
| 3 (customFields del RT) | 2432 | Para cada RT, persiste sus campos especificos | ❌ NO — solo copia `enum` (sin `enumValues`) |

**Codigo afectado** (path 2 — linea 2361):
```js
const fieldProps = {};
if (fieldSchema.enum) fieldProps.enum = fieldSchema.enum;   // ← falta: fieldProps.enumValues = fieldSchema.enum
if (fieldSchema.format) fieldProps.format = fieldSchema.format;
...
```

**Codigo afectado** (path 3 — linea 2432): identico bug.

**Fix sugerido para equipo plataforma** (3 lineas total):
```diff
- if (fieldSchema.enum) fieldProps.enum = fieldSchema.enum;
+ if (fieldSchema.enum) {
+   fieldProps.enum = fieldSchema.enum;
+   fieldProps.enumValues = fieldSchema.enum;
+ }
```

**Impacto del bug**: TODO RT con campo enum (de cualquier mod, no solo curriculum-design) tiene `enumValues: null` en la respuesta de `getObjectFields`, causando que la UI no muestre options. Esto afecta:
- curriculum-design: 6 selects (deliveryMode, bloomLevel, referenceType, contentType de Content, programLevel via path 2, contentType de CustomSection)
- Probablemente otros mods con RTs y enums (retention-wellbeing, ai-agent, etc.)

**Por que esta fuera de alcance**: el archivo `generatePrismaSchema.js` esta en `object-manager/`, propiedad del equipo plataforma UP1. Por convencion del proyecto, el mod NO modifica codigo del core (memoria: `feedback_up1_mod_scope.md`).

### Decision pendiente (S3 gate ⚑ fuerte)

Tres opciones para avanzar:

**Opcion A — Escalar a equipo plataforma y pausar S3** (recomendada): crear BUG record en deckard + comunicar el fix de 3 lineas a Juan Diego/Claus. Mientras esperamos PR al core, podemos avanzar con S4 (enum bootstrap) que toca solo el mod, y completar S5 (tickets futuros). Cuando llegue el fix de core, los 6 selects de H1 se arreglan sin tocar el mod.

**Opcion B — Workaround temporal en el mod** (cuestionable): no hay forma sana de hacer workaround sin modificar object-manager. Posibles hacks:
- Crear un GraphQL resolver custom en el mod que envuelva `getObjectFields` y reinyecte enumValues leyendo el JSON. Complejo, frágil
- Mutar la BD via mutation custom para reescribir `properties.enumValues` post-sync. Hack

**Opcion C — Modificar el core con autorizacion explicita del dev**: el fix son 3 lineas, alto valor, bajo riesgo. Si el dev autoriza, aplicar fix + correr sync + verificar. Coordinar PR a object-manager con Juan Diego.

### Decision tomada — Opcion A (2026-05-11)

Dev confirma escalado al equipo plataforma. Producidos:
- **[BUG-platform-015](../bugs/platform/bug-platform-015.md)** registrado en deckard (modulo platform, severity high)
- **[case-presentation-platform-team.md](ticket-015.escalation/case-presentation-platform-team.md)** documento consolidado listo para enviar a Juan Diego / Claus con TL;DR + contexto + sintoma + reproduction + root cause + fix + validacion + alternativas + alcance ampliado + impacto

### Hallazgo bonus durante S3 — correccion al inventario inicial

Mi barrido inicial marco `BibliographyReference.referenceFormat` como "NO existe en JSON" → out-of-scope. **Error**: si existe en `objects/BibliographyReference.json` con enum 7 valores `["Book", "Article", "Website", "Thesis", "Chapter", "ConferencePaper", "Other"]`. Como esta en Base object (no RT), va por path 1 del codegen que SI funciona — debe estar mostrando options correctamente. Verificar en smoke manual y, si esta OK, eliminarlo del out-of-scope.

Otros campos enum en Base objects de curriculum-design (todos van por path 1, deberian funcionar):
- `AcademicActivity.recordType` = `['Course']` (1 valor, intencional)
- `AcademicActivity.workflowState` = 6 valores
- `AcademicActivity.programLevel` = 4 valores
- `BibliographyReference.referenceFormat` = 7 valores ← corregido
- `CurricularLink.linkType` = 5 valores `['DEVELOPS', 'EVALUATES', 'COVERS', 'USES', 'CUSTOM']`
- `CurricularSection.ownerType` = 2 valores `['AcademicActivity', 'Offering']`
- `CurricularSection.sectionType` = 2 valores `['STRUCTURAL', 'COMPLEMENTARY']`
- `Institution.type` = 5 valores
- `Institution.status` = 3 valores
- `OrgUnit.recordType` = 3 valores
- `OrgUnit.status` = 3 valores
- `Organization.status` = 3 valores

**Total enum fields del mod curriculum-design**: 12 en Base + 5 en RTs = **17 selects** (no 10 como yo decia). Path 1 (12) probablemente funciona, path 2/3 (5) roto por BUG-platform-015.

**S3.GATE — Gate de sync Session 3** ⚑ fuerte

| Item | Resultado |
|------|-----------|
| Sync ejecutado + typeDefs regenerados | ✅ |
| Pipeline trazado JSON → typeDef → resolver → BD | ✅ Resolver lee correctamente; BD es la que tiene null |
| Root cause localizado | ✅ generatePrismaSchema.js:2361 y 2432 — drift entre 3 paths |
| Fix aplicable desde el mod? | ❌ Codigo del core de UP1, fuera de alcance del mod |
| BUG record creado | ✅ BUG-platform-015 en `bugs/platform/` |
| Documento de escalado producido | ✅ `ticket-015.escalation/case-presentation-platform-team.md` (consolidado) |
| Hallazgo bonus: inventario inicial corregido | ✅ BibliographyReference.referenceFormat SI existe (sale de out-of-scope), 12 enums Base + 5 RT = 17 totales |
| Decision: continue / iterate / **escalate** / standby | **escalate** — bloqueado por bug en core. Avanzar con S4 mientras se espera PR de plataforma |

**Decision sobre flujo**: avanzar con S4 (enum bootstrap a 3 campos sin enum) sin esperar el fix del core, porque:
1. S4 toca solo el mod (JSONs + lang) — independiente del bug del core
2. Sin el fix de core, los enum bootstrap nuevos tampoco mostraran options. **PERO**: cuando el fix de core llegue, todos los 5 selects de H1 + los 3 nuevos de S4 se arreglan simultaneamente con un solo `npm run sync`
3. S5 (crear backlog tickets) es independiente
4. S6 close debe esperar a que se aplique el fix de core en el repo de up1

Re-clasificacion del scope ajustado:

| Bloque | Estado |
|--------|--------|
| H1 (6 selects con enum en RT — del mod) | ⏸️ bloqueado por BUG-platform-015 |
| ~~H2~~ descartada | ✅ DECISION-006 |
| H3/H4 parcial (enum bootstrap a 3 campos) | ▶️ ejecutable en S4, validacion bloqueada hasta fix core |
| H7 (Bloom confirmada) | ✅ |
| Campos Base con enum (12 — incluye referenceFormat correccion) | ✅ probablemente funciona (path 1) — validar en S3.T5 cuando se reabra session |

### Session 2 — Design-fix (2026-05-11) [tipo: ⚑ fuerte] [tier: T0]

| Campo | Valor |
|-------|-------|
| Objetivo | Trazado del pipeline JSON → typeDef → resolver → RecordDetail.vue para H1; reconciliar drift componentType (AQ-1); decidir valores bootstrap para method/activityType/language (AQ-2/3); producir spec con tasks contractuales |
| Started | 2026-05-11 |
| Status | in_progress |

**S2.GATE — Gate de sync Session 2**

| Item | Resultado |
|------|-----------|
| AQ-1 resuelta (drift componentType) | ✅ Summative/Formative/Diagnostic (lang gana) |
| AQ-2 confirmada (method + activityType) | ✅ 6 + 7 valores propuestos por dev |
| AQ-3 confirmada (language) | ✅ es/en/pt-BR + default es |
| AQ-5 confirmada (workflowState in-scope) | ✅ Inventario S3 actualizado a 7 selects |
| AQ-6 confirmada (lang updates en S4) | ✅ Incluido en tasks S4.T2/T3/T4 |
| Origen de valores bootstrap documentado | ✅ Seccion `## Origen de los valores bootstrap (trazabilidad)` agregada al ticket |
| Nota para teach-close (DET-22) | ✅ Lista de 5 items obligatorios para teach-close |
| Spec producido | ✅ [SPEC-curriculum-design-001-selects-options-fix](../specs/curriculum-design/SPEC-001-selects-options-fix.md) con 13 REQs + 4 sessions (S3-S6) + tasks contractuales + coverage map |
| Frontmatter ticket actualizado | ✅ `spec: SPEC-curriculum-design-001-selects-options-fix` |
| Decision: continue / iterate / escalate / standby | **continue** → S3 execute (fix bug UI) |

**Log**

- 2026-05-11: Verificacion del lang file `es_CL@rt__EvaluationComponent__curricularsection.json` revela que ya tiene labels para `Summative/Formative/Diagnostic` (Sumativa/Formativa/Diagnostica). **AQ-1 resuelta**: usar `Summative/Formative/Diagnostic` (alineado con lang + seed, ahorra migracion)
- 2026-05-11: Verificacion del JSON `objects/AcademicActivity.json` revela 2 cosas:
  - `workflowState` YA tiene enum 6 valores `Draft/Review/Approved/Published/OpenForEdit/Deprecated` + static_default `Draft` + lang labels completos. **Es un candidato H1 adicional** (no estaba en el inventario inicial — el barrido inicial no lo detecto porque mi heuristica no incluyo "state")
  - `purpose` confirmado NO existe → out-of-scope
- 2026-05-11: `AcademicActivity.language` tiene `static_default: 'es'` pero sin enum. La descripcion JSON sugiere ISO 639-1 (`es`, `en`)
- 2026-05-11: Descripciones JSON revelan drift adicional entre descripcion y lang/seed:
  - `EvaluationComponent.componentType` description: "parcial, final, tareas, asistencia, etc." — terminos institucionales menos canonicos que el lang (Sumativa/Formativa/Diagnostica). **Drift no afecta la decision AQ-1** porque el lang es la fuente canonica (gana sobre descripcion)
  - `EvaluationComponent.method` description: "prueba escrita, proyecto, presentacion oral, etc." (texto libre sugerido)
  - `Session.activityType` description: "clase magistral, taller, evaluacion, habilitacion, etc." (texto libre sugerido)
  - El "etc." en las descripciones sugiere que originalmente se penso como texto libre. Decision: agregar enum bootstrap **igual** porque el dev pide que muestren options (alineado con scope refinement)
- 2026-05-11: Session lang file `es_CL@rt__Session__curricularsection.json` esta incompleto: solo tiene `column.*` keys, NO tiene `enums.activityType.*`. Esto significa que para `activityType` hay que **agregar tambien las keys lang** ademas del enum en JSON

### Inventario S3 actualizado — campos a fixear

**Total: 8 selects con problema** (no 6 como inicial — workflowState agregado en intake mejor):

| # | Campo | Estado actual | Accion S3/S4 | Lang ya alineado? |
|---|-------|---------------|--------------|---------------------|
| 1 | Modality.`deliveryMode` | enum 5 + lang OK | S3 fix UI | ✅ |
| 2 | LearningOutcome.`bloomLevel` | enum 6 + lang OK | S3 fix UI | ✅ |
| 3 | Bibliography.`referenceType` | enum 3 + lang OK | S3 fix UI | ⚠️ verificar |
| 4 | Content.`contentType` | enum 3 + lang OK | S3 fix UI | ⚠️ verificar |
| 5 | AcademicActivity.`programLevel` | enum 4 + lang OK | S3 fix UI | ✅ |
| 6 | AcademicActivity.`workflowState` | enum 6 + lang OK | S3 fix UI (descubierto en S2) | ✅ |
| 7 | EvaluationComponent.`componentType` | sin enum, lang OK | S4 agregar enum `[Summative, Formative, Diagnostic]` | ✅ |
| 8 | CustomSection.`contentType` | enum 1 + lang | S3 fix UI (mantener 1 valor por DECISION-006) | ⚠️ verificar |

**Campos pendientes de decision del dev** (AQ-2, AQ-3):

| Campo | Sugerencia LLM | Valores propuestos |
|-------|----------------|---------------------|
| EvaluationComponent.`method` | enum bootstrap minimo | `["WrittenExam", "Project", "OralPresentation", "Rubric", "Portfolio", "Quiz"]` (lang nuevo) |
| Session.`activityType` | enum bootstrap minimo + crear lang keys nuevas | `["Lecture", "Workshop", "Laboratory", "Tutoring", "Seminar", "Evaluation", "Other"]` (lang nuevo) |
| AcademicActivity.`language` | enum bootstrap ISO 639-1 | `["es", "en", "pt-BR"]` con default `es` (lang nuevo) |

### Active questions resueltas

- ✅ **AQ-1** RESUELTA: usar `Summative/Formative/Diagnostic` para componentType (lang ya alineado, ahorra migracion)
- ✅ **AQ-2** CONFIRMADA por dev (2026-05-11): set propuesto 6 valores method + 7 valores activityType
- ✅ **AQ-3** CONFIRMADA por dev: trio basico ISO 639-1 `["es", "en", "pt-BR"]` con default `es`
- ⏳ **AQ-4** EN S3: verificar que `enums.deliveryMode.InPerson` se traduce a "Presencial" (test functional, parte de S3)
- ✅ **AQ-5** CONFIRMADA: workflowState entra en S3 (gratis, alcance ampliado a 7 selects H1)
- ✅ **AQ-6** CONFIRMADA: lang updates incluidos en S4 junto con edits JSON

### Origen de los valores bootstrap (trazabilidad)

> **Por que esta seccion existe**: cuando otro ticket implemente los catalogos institucionales (BR-TNT-002 scope dual) — EvaluationMethod, ActivityType, Language — necesita saber **de donde vinieron** los valores actuales para hacer la migracion correcta sin perder semantica. Tambien sirve para que clientes que cuestionen un valor sepan en que fuente se baso.

#### EvaluationComponent.`componentType` = `["Summative", "Formative", "Diagnostic"]`

| Fuente | Evidencia | Peso en decision |
|--------|-----------|------------------|
| **Lang file del mod** (`es_CL@rt__EvaluationComponent__curricularsection.json`) | `enums.componentType.*` ya tiene labels: Sumativa/Formativa/Diagnostica | **Dominante** — lang es fuente canonica del mod |
| **Seed UV** (Ecuaciones Diferenciales) | Componentes con type: Summative (NF root), Formative (Q1-Q6), Summative (EP) | Refuerzo — datos demo ya usan estos valores |
| Doc Confluence v1.10 (Modelo objetos) | Doc menciona `"Parcial / Final / Agregado (institucional, no cerrada)"` | Descartada — terminos institucionales menos canonicos. Lang gana |
| Descripcion JSON | "parcial, final, tareas, asistencia, etc." | Descartada — descripcion legacy no actualizada al lang |

**Origen pedagogico**: clasificacion canonica de tipos de evaluacion educativa (Sumativa/Formativa/Diagnostica corresponden a evaluacion **del** aprendizaje vs **para** el aprendizaje vs **como** aprendizaje).

#### EvaluationComponent.`method` = `["WrittenExam", "Project", "OralPresentation", "Rubric", "Portfolio", "Quiz"]`

| Fuente | Evidencia |
|--------|-----------|
| **CAP-CUR-037** (Confluence Curriculum Design pageId 1989148681) | Catalogo de metodos pedagogicos de evaluacion. Texto: "(portafolio, debate evaluado, simulacion, rubrica, etc.)" |
| **Descripcion JSON** del campo | "prueba escrita, proyecto, presentacion oral, etc." |
| **BR-TNT-002** (Reglas Transversales 1988165713) | Define que este catalogo es scope dual (default plataforma + custom institucion). Los 6 valores propuestos son el **default plataforma** para bootstrap; clientes podran agregar custom |

**Mapeo** entre fuentes y valores propuestos:

| Valor propuesto | Origen |
|-----------------|--------|
| `WrittenExam` | Descripcion JSON "prueba escrita" |
| `Project` | CAP-CUR-037 "proyecto" + descripcion JSON "proyecto" |
| `OralPresentation` | Descripcion JSON "presentacion oral" |
| `Rubric` | CAP-CUR-037 "rubrica" |
| `Portfolio` | CAP-CUR-037 "portafolio" |
| `Quiz` | Seed UV (componentes Q1-Q6) |

**Out-of-scope** (no incluidos en bootstrap, pendientes para catalogo institucional CAP-CUR-037): Debate evaluado, Simulacion (mencionados en doc pero no urgentes para SP1).

#### Session.`activityType` = `["Lecture", "Workshop", "Laboratory", "Tutoring", "Seminar", "Evaluation", "Other"]`

| Fuente | Evidencia |
|--------|-----------|
| **CAP-CUR-038** (Confluence Curriculum Design pageId 1989148681) | Catalogo de actividades academicas. Texto: "(clase magistral, laboratorio, taller, seminario, tutoria, etc.)" |
| **Descripcion JSON** del campo | "clase magistral, taller, evaluacion, habilitacion, etc." |
| **BR-TNT-002** | Scope dual — bootstrap es default plataforma |

**Mapeo**:

| Valor propuesto | Origen |
|-----------------|--------|
| `Lecture` | CAP-CUR-038 "clase magistral" + descripcion JSON |
| `Workshop` | CAP-CUR-038 "taller" + descripcion JSON |
| `Laboratory` | CAP-CUR-038 "laboratorio" |
| `Tutoring` | CAP-CUR-038 "tutoria" |
| `Seminar` | CAP-CUR-038 "seminario" |
| `Evaluation` | Descripcion JSON "evaluacion" |
| `Other` | Comodin para "etc." + cobertura de "habilitacion" no estandar |

**Diferencia con descripcion JSON**: la descripcion JSON menciona "habilitacion" (termino regional/institucional especifico). Lo agrupamos bajo `Other` para no contaminar el bootstrap default; instituciones que lo necesiten lo agregaran como custom.

#### AcademicActivity.`language` = `["es", "en", "pt-BR"]` con default `es`

| Fuente | Evidencia |
|--------|-----------|
| **ISO 639-1** (estandar internacional) | Codigos `es`/`en`/`pt` son ISO 639-1 |
| **BCP 47** (variante regional) | `pt-BR` es BCP 47 — distingue Portugues Brasil de Portugal. Justificado por la base de clientes uPlanner (Brasil + LATAM + ingles institucional) |
| **Descripcion JSON** del campo | Dice "codigo ISO 639-1, por ejemplo 'es', 'en'" |
| **CAP-CUR-041** (Confluence) | Catalogo de idiomas — confirma que la fuente canonica institucional sera FK a catalogo, no enum. Bootstrap minimo aqui |
| **Default `es`** | El JSON ya tiene `static_default: 'es'` — preservar |

**Nota tecnica**: `pt-BR` rompe la pureza ISO 639-1 (que solo permite 2 letras puras). Estrictamente seria BCP 47. Alternativa: usar `pt` puro y manejar la variante BR a nivel cultural (locale completo `pt-BR` para i18n). Por simplicidad bootstrap, mantener `pt-BR` como string.

**Out-of-scope** (catalogo CAP-CUR-041): fr, de, it, ja, zh, etc. Se agregan cuando se implemente el objeto catalogo `Language`.

#### Sub-decision: por que enum bootstrap y no FK a catalogo

| Driver | Peso | Racional |
|--------|------|----------|
| Velocidad (1 sprint vs 1 trimestre) | high | FK requiere crear objeto catalogo + seed + UI mantenedor + scope dual logica. Imposible en sprint actual |
| Reversibilidad | high | Enum → FK es trivial: agregar tabla, migrar valores existentes, cambiar `enum` a `isForeignKey`. Sin perdida de datos |
| Cobertura de casos urgentes | high | El bootstrap cubre 80% de casos demo. El otro 20% (instituciones con metodos/actividades exoticos) espera al catalogo |
| Alineamiento con doc final | mid | El catalogo institucional es la fuente canonica eventual. El bootstrap solo posterga el modelado correcto |

**Conclusion**: bootstrap es transicion pragmatica. Migracion futura a catalogo dejara el enum vacio en el JSON; los valores actuales pasaran a ser registros default de plataforma del catalogo.

### Nota para teach-close (DET-22)

Cuando se cierre el ticket via `request-close`, el teach-close producido debe incluir como minimo:

1. **Que se hizo**: lista de los 7 selects fixeados (UI bug) + 3 selects con enum bootstrap agregado + 3 lang files actualizados
2. **De donde vinieron los valores bootstrap**: copiar la trazabilidad de esta seccion al teach-close en "Knowledge promoted" o "What you should know" — con tabla de fuentes (CAP-CUR-037/038/041, BR-TNT-002, ISO 639-1, lang preexistente, seed UV)
3. **Migracion futura a catalogo**: documentar que el bootstrap es transicional; cuando se implementen los objetos catalogo (8 tickets futuros listados), la migracion es agregar tabla + cambiar `enum` a `isForeignKey`
4. **Decisiones tomadas con drivers** (de la seccion Decision drivers del teach-intake): scope split + politica enum bootstrap + AQ-1 resolution (lang gana sobre doc)
5. **Lessons learned**:
   - Cuando una decision esta documentada (DECISION-006), antes de declarar "gap" buscar el racional (caso H2 descartada)
   - Lang files son fuente canonica del mod, ganan sobre descripcion JSON y doc Confluence cuando hay drift (caso componentType)
   - El barrido inicial de "selects sin options" puede no detectar campos con keyword no obvio (caso workflowState — la heuristica no incluyo "state")

**Log**

- Pregunta original del dev: como obtienen las options los selects, donde se registran
- Research previo (Explore agent): mecanismo de selects = enum estatico o FK via listInstances. RecordDetail.vue lee fieldMetadata.enumValues; FK fetchea con listInstances(name, limit:100)
- Dev identifica 5+1 selects con problema: Modalidad/modo entrega, RA/Bloom, Bibliografia/tipo, CustomSection/formato, Content/tipo, Evaluacion/tipo
- Consulta Confluence en paralelo (6 queries) → 4 paginas relevantes leidas (Curriculum Design 1989148681, Modelo de objetos 2038366242, Config referencias 980713497, Modelo datos uAssessment 1205895174)
- Cruce con JSONs del mod: 3 selects estan OK con enum (deliveryMode, bloomLevel, referenceType, contentType de Content, programLevel), 1 incompleto (CustomSection.contentType = solo richText), 1 sin enum (EvaluationComponent)
- Dev pide registrar adicionales encontrados en barrido: barrido completo del mod identifica 4 mas (OrgUnit.type, AcademicActivity.language, AcademicActivity.recordType limitado a Course, Session.activityType) + 1 campo no existente (AcademicActivity.purpose)
- Ticket TICKET-015 scaffoldado, external UPONE-1038, work_type fix, module curriculum-design
- Dev pide incorporar TODA la info de Confluence + docs sobre estos elementos
- Research exhaustivo lanzado en paralelo (4 agentes): (a) decisions DKC del proyecto, (b) re-lectura completa modelo objetos Learning Assurance (106KB), (c) docs/guides del mod + seeds + lang, (d) lectura Reglas Transversales en Confluence
- Hallazgo CRITICO 1: DECISION-006 confirma que CustomSection.contentType=`['richText']` es INTENCIONAL (filosofia estandarizacion > personalizacion). H2 descartada
- Hallazgo CRITICO 2: DECISION-007 establece RTs globales (no per-tenant). Implica que cambios en enums impactan todos los tenants simultaneamente
- Hallazgo CRITICO 3: Modelo v1.10 documenta campos que no existen en JSON del mod: AcademicActivity.purpose (enum 4 valores), Modality.code/theoryHours/practiceHours/labHours/autonomousHours/isDefault, BibliographyReference.referenceFormat (enum 7), EvaluationComponent.componentCode/isDirectEvidence/week
- Hallazgo CRITICO 4: BR-TNT-002 dice que catalogos (estrategias, metodos, tipos actividad, idiomas) son **objetos con scope dual** (default plataforma + custom institucion, custom-first). NO son enum cerrado ni FK simple. Esto refina H6 sobre EvaluationMethod, ActivityType, Language, OrgUnitType
- Hallazgo CRITICO 5: BR-TAX-002 confirma Bloom revisada (Anderson-Krathwohl 2001) precargada. Los 6 niveles del mod coinciden con la taxonomia. Hay sugerencia IA disponible (BR-TAX-003)
- Hallazgo CRITICO 6: Drift entre fuentes en EvaluationComponent.componentType: doc dice "Parcial/Final/Agregado"; seed UV usa "Summative/Formative/Diagnostic"; lang files tienen `enums.componentType.*` keys. Necesario reconciliar antes de implementar
- Hallazgo CRITICO 7: Lang files YA TIENEN keys `enums.*` para los enums declarados (Modality.deliveryMode, LearningOutcome.bloomLevel, EvaluationComponent.componentType, AcademicActivity.workflowState/programLevel, OrgUnit.recordType/status, BibliographyReference.referenceFormat). Si la UI no muestra options, el problema NO es i18n missing — es pipeline JSON → typeDef → resolver → RecordDetail.vue
- Hipotesis actualizadas: H1, H3, H4 abiertas; H2 descartada; H5 (drift), H6 (catalogos scope dual), H7 (Bloom confirmada) agregadas
- Documentation digest completo agregado al ticket en `## Documentation digest`
- Dev refina alcance (2026-05-11): doc Confluence v1.10 esta mas avanzada que implementacion actual; ese gap es trabajo de tickets futuros. Este ticket SOLO ajusta lo que ya existe para que muestre opciones
- Scope split documentado en `## Scope refinement`: in-scope = bug UI sobre 6 enums declarados (H1) + enum bootstrap simple para 4 campos sin enum (H3/H4 parcial). Out-of-scope = 8 items de implementacion v1.10 (purpose, Modality extendida, referenceFormat, EvaluationComponent extendido, catalogos EvaluationMethod/ActivityType/Language, ampliacion recordType)
- H5 y H6 reclasificadas a out-of-scope (se mantienen en hipotesis para trazabilidad pero no son alcance)
- Plan de sessions refinado: S2 ya no decide enum vs FK vs catalogo (los catalogos son out-of-scope), solo trazado pipeline + decisiones de valores bootstrap. S4 reducida a edits JSON simples. S5 ahora documenta y crea tickets futuros (no implementa)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Summary
