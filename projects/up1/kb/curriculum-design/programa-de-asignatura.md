---
id: SPEC-curriculum-design-programa-asignatura
project: up1
type: spec
module: curriculum-design
status: draft
fecha: 2026-07-20
tags: [curriculum-design, programa-asignatura, modelo-objetos, agregado]
external_refs:
  - UPONE-1033
  - UPONE-1034
  - UPONE-1035
  - UPONE-1038
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
---

# Programa de asignatura — Modelo del agregado

## Multi-tenancy: rollout en 2 fases

> **Decision final SP2** ([DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md), 2026-04-28): rollout en 2 fases.
> - **Fase 1 (SP2)**: cargar todo en `UPU` solo. Validar modelo + funcionalidad. NO se prueba aislamiento multi-tenant.
> - **Fase 2 (post-SP2)**: separar por tenant. Decidir entonces entre UNIVALLE/AIEP dedicados o dividir TEST/UPU.
>
> Razon: SP2 NO usa capacidades por tenant (sin Extensions, sin layouts/i18n/themes per-tenant, sin lógica condicional). La unica diferencia entre tenants seria los datos, asi que validar aislamiento ahora no aporta. Ver "Trazabilidad" al final.

### Tenant unico para SP2 (Fase 1)

| TENANT_ID | Datos del mod cargados | Notas |
|-----------|------------------------|-------|
| **`UPU`** | **Ambos**: Universidad del Valle (`aa-uv-1124`) + AIEP (`aa-aiep-14757`) | Convive con seed core "uPlanner University" |

**Por que UPU y no TEST**:
- UPU es estable, no se resetea. TEST es sandbox volatil (default `tenant:reset` lo soporta).
- UPU es el default en docker-compose, Storybook, batch-processor — el ambiente "vivo".
- TEST esta semanticamente reservado para laboratorio tecnico (Experiment, LabEquipment).

**Por que ambos en mismo tenant en SP2**:
- SP2 NO usa Extensions ni capabilities por tenant. La unica diferencia tenant-a-tenant seria los datos.
- Validar aislamiento multi-tenant en SP2 no aporta — se difiere a Fase 2 cuando haya capacidades distintivas.
- Reduce overhead: sin `tenant:create`, sin coordinacion con plataforma, sin riesgos de pre-flight.

### Pre-requisito (NO requiere crear tenants)

`UPU` ya esta operativo. ❌ NO ejecutar `npm run tenant:create`.

Validar antes de iniciar TICKET-006:
- `up1/object-manager/objects/tenants/UPU/` existe
- `.env` tiene `DATABASE_URL_UPU`

### Coexistencia con seed core de UPU — robusta en 4 capas

| Capa | Mecanismo | Resultado |
|------|-----------|-----------|
| 1. Tablas DB | Los 4 objetos del mod son nuevos (`Activity`, `CurricularSection`, `CurricularLink`, `BibliographyReference`). NO existian en UPU. | Postgres genera tablas nuevas. Cero solapamiento de filas con seed core (uPlanner University). |
| 2. Sidebar UP1 | Cada mod tiene su propio item de menu | "Curriculum Design" muestra solo objetos del mod. No mezcla con `Person`/`Faculty`/`Course` del demo de UPU. |
| 3. Listados/details | Query filtra por objeto + `tenantId` | Listado de Activity en UPU muestra los 2 cursos del mod, sin datos del demo core. |
| 4. Tabla `Institution` (compartida) | El seed del mod usa `upsert` con `code='UV'` y `code='AIEP'` | NO destruye instancias preexistentes ("uPlanner University"). Crea 2 filas adicionales para "Universidad del Valle" y "AIEP". |

**Unico ruido visible**: la tabla `Institution` en UPU tiene 2 filas extras (UV + AIEP) junto a la "uPlanner University" del seed core.

### Identificacion visual: ¿estoy viendo Univalle o AIEP?

Ambos cursos comparten `tenantId='UPU'`. La diferenciacion es por **contenido del registro**:

| Identificador | "Univalle" (en UPU) | "AIEP" (en UPU) |
|---------------|---------------------|----|
| `Activity.name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `Activity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `Activity.code` | (codigo Univalle real) | (codigo AIEP real) |
| `Institution.name` (FK desde Bibliography) | `"Universidad del Valle"` | `"AIEP"` |
| `Institution.code` | `UV` | `AIEP` |
| Volumen Modality | **1** | **13** ← delta visual claro |
| Volumen LearningOutcome | 3 | 40 |
| Volumen Sessions | 18 (incluye semana 18 "habilitacion") | (sin Sessions) |
| Volumen Content | (sin Content) | 3 |

**Listado en UPU muestra 2 filas** (ambos cursos). El tester valida visualmente:
- Click en "Ecuaciones Diferenciales" → detail con 1 Modality, 3 LO, 18 Sessions, 8 EvalComp, 9 Bib, 2 CustomSection
- Click en "Introduccion a las Redes" → detail con 13 Modalities, 40 LO, 3 Content, 1 EvalComp

**Stress visual de RISK-001 (1 vs 13 Modalities) sigue siendo valido** comparando los 2 details.

### Activacion del mod en `app.json` — Fase 1

```json
{
  "name": "curriculum-design",
  "tenants": ["UPU"],
  ...
}
```

Si la lista esta vacia, el mod **no aparece en el sidebar** ([rule-mods-007](../../rules/mods/rule-mods-007.md)).

En Fase 2 esto cambiara a `["UPU", "TEST"]` o `["UNIVALLE", "AIEP"]` segun la opcion elegida.

### Estructura del seed del mod (Fase 1)

```
mods/curriculum-design/seed/
├── seed.js               ← entrypoint, carga ambos data sets en UPU sin condicional
├── data-univalle.js      ← carga curso aa-uv-1124 con tenantId='UPU', upsert defensivo
└── data-aiep.js          ← carga curso aa-aiep-14757 con tenantId='UPU', upsert defensivo
```

**Idempotencia obligatoria**: cada insercion usa `upsert`. Critico para `Institution` (compartido con seed core de UPU).

```js
// data-univalle.js
const institution = await prisma.institution.upsert({
  where: { code: 'UV' },
  create: { code: 'UV', name: 'Universidad del Valle', country: 'CO', tenantId: 'UPU' },
  update: {}  // si ya existe, no la modifica
});

const programa = await prisma.academicActivity.upsert({
  where: { externalId: 'aa-uv-1124' },
  create: { externalId: 'aa-uv-1124', name: 'Ecuaciones Diferenciales', tenantId: 'UPU', /* ... */ },
  update: {}
});
```

En Fase 2, los archivos `data-univalle.js` y `data-aiep.js` se reutilizan cambiando `tenantId` al destino correcto.

### Que es global vs per-tenant en este mod

| Capa | Granularidad | Detalle |
|------|-------------|---------|
| Schema de los 4 objetos base | 🌐 Global | UN archivo `Activity.json` que sirve a TODOS los tenants (incluso si en SP2 solo hay 1) |
| RecordTypes declarados (TICKET-009) | 🌐 Global ([DECISION-007](../../decisions/DECISION-007-recordtypes-global.md)) | UN archivo `rt__Modality__curricularsection.json`. NO hay RTs duplicados per-tenant. |
| Datos (instancias) | 🏢 Per-tenant | En Fase 1: ambos cursos en UPU. En Fase 2: separar por tenant. Filtrado automatico por `tenantId`. |
| Layouts | 🌐 Global por defecto | El mismo layout sirve a todos. Si se requiere per-tenant en Fase 2: campo `tenants[]` en el JSON del layout |
| Extensions (futuras) | 🏢 Per-tenant | NO se usan en SP2. En Fase 2 se podria agregar `ext__<tenant>__<base>.json`. **Personalizaciones por cliente irian por aqui, NO via RTs** ([DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md)) |
| i18n (terminologia) | 🏢 Per-tenant | NO se usa per-tenant en SP2 |
| CSS / theming | 🏢 Per-tenant | NO se usa per-tenant en SP2 |

### Implicancia en el desarrollo (Fase 1 SP2)

- **TICKET-006**: el seed carga ambos data sets en UPU. `upsert` defensivo en `Institution` (UV + AIEP coexisten con "uPlanner University" del core).
- **TICKET-007**: el listado se prueba en UPU. Mostrar 2 filas (Ecuaciones Diferenciales + Introduccion a las Redes). Identificacion por `name`. **TCs de aislamiento entre tenants → Fase 2**.
- **TICKET-009**: el detail se prueba con ambos cursos en UPU para validar variabilidad (1 Modality del curso Univalle vs 13 Modalities del curso AIEP estresa el layout). El RISK-001 POC sigue valido.

### Trazabilidad de la decision

Cadena completa de reconsideraciones (todas el 2026-04-28):

| Hora | Decision | Motivacion | Estado |
|------|----------|-----------|--------|
| 2026-04-27 | [DECISION-003](../../decisions/DECISION-003-tenant-ids.md) — UNIVALLE + AIEP | Convencion uppercase, mapeo limpio cliente↔tenant | superseded |
| ~10:00 | [DECISION-009](../../decisions/DECISION-009-use-existing-tenants.md) — TEST + UPU | Sugerencia Juan Diego: evitar overhead infra | superseded |
| ~14:00 | [DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md) — revertir a UNIVALLE + AIEP | Asumi convivencia generaba deuda creciente | superseded |
| ~17:00 | [DECISION-011](../../decisions/DECISION-011-final-use-test-upu.md) — TEST + UPU (analisis coexistencia) | Coexistencia robusta en 4 capas | superseded |
| **~18:30** | **[DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md)** — Fase 1: solo UPU; Fase 2: separar | SP2 no usa capacidades por tenant; validar modelo primero | **accepted FINAL** |

### Tenant Questions

Estado al 2026-04-28:
- T1: ✅ Resuelta para SP2 — DECISION-012 (solo UPU en Fase 1; separar en Fase 2)
- T2: ✅ Resuelta — DECISION-007 (RTs globales)
- T3, T4, T5: ⏳ Pendientes a Fase 2

---

## Alcance por ticket — IMPORTANTE

Los 3 tickets del sprint **NO modelan todo el agregado completo**. El strict scope es:

| Ticket | Alcance del modelo |
|--------|--------------------|
| **UPONE-1033** ([TICKET-006](../../tickets/ticket-006.md)) | **Solo los 4 objetos base**: `Activity`, `CurricularSection` (campos comunes), `CurricularLink`, `BibliographyReference`. **NO incluye RecordTypes** (`Modality`, `LearningOutcome`, `Session`, `EvaluationComponent`, `Content`, `Bibliography`, `CustomSection`, etc.). |
| **UPONE-1034** ([TICKET-007](../../tickets/ticket-007.md)) | Layout listado de `Activity`. No requiere RTs. |
| **UPONE-1035** ([TICKET-009](../../tickets/ticket-009.md)) | **Aquí se crean los RecordTypes** que el detail necesite mostrar. El seed completo del agregado se carga en este ticket. |

> **Razonamiento**: el ticket UPONE-1033 textual pide solo los 4 objetos. Los RecordTypes son una capa adicional que solo cobra sentido cuando se construyen layouts (UPONE-1035 dice "Probar distintas configuraciones de secciones").

> **Implicacion**: en SP1 (UPONE-1033), el campo `CurricularSection.recordType` se modela como **string libre** sin enum cerrado ni RTs declarados. El seed Univalle/AIEP **no carga campos especificos por RT** (`bloomLevel`, `weight`, `theoryHours`, etc.) hasta UPONE-1035.

Ver [open-questions.md](open-questions.md) — preguntas Q11..Q14 sobre el subset de RTs en UPONE-1035.

---

## Definicion

El **Programa de asignatura** es el **documento curricular oficial** que define como se ensena una asignatura en la institucion: identifica el curso, lo asigna a un departamento, declara sus resultados de aprendizaje, su estructura de evaluacion, sus contenidos tematicos, sus condiciones de aprobacion y su bibliografia.

Es el **template institucional aprobado** que luego se hereda al syllabus de cada seccion dictada (via mecanismo MADS — ver [BR-MIG-001](business-rules/BR-MIG-001.md)).

## Composicion del agregado

> **Nota (2026-07-16)**: esta seccion describe el agregado original del SP2 (4 objetos). El mod `curriculum-design` creció a **12 objetos** en sprints posteriores (SP5-SP7). Ver [Inventario completo de objetos del mod](#inventario-completo-de-objetos-del-mod-2026-07-16) mas abajo para la lista actual.

El agregado original del SP2 se compone de **4 objetos** que residen integramente en el mod `curriculum-design`:

```
                     ┌─────────────────────────────┐
                     │      Activity       │  ← RAIZ (programa de asignatura)
                     │─────────────────────────────│
                     │ id, name, code, version     │
                     │ recordType ("Course")       │
                     │ credits, programLevel       │
                     │ status (Draft/InReview/     │
                     │   Approved/Active/          │
                     │   Deprecated/Archived)      │
                     │ language, previousVersionId │
                     │ executionUnitId → OrgUnit   │  ← FK postergada (ver DECISION-org-unit-defer)
                     └──────────────┬──────────────┘
                                    │ 1:N (ownerType=Activity)
                                    ▼
                ┌─────────────────────────────────────┐
                │         CurricularSection           │  ← polimorfico por recordType
                │─────────────────────────────────────│
                │ id, ownerType, ownerId              │
                │ recordType (LearningOutcome,        │
                │   EvaluationComponent, Content,     │
                │   Session, Modality,                │
                │   ApprovalCondition, Bibliography,  │
                │   GeneralData, ...)                 │
                │ sourceId, isSynchronizable          │
                │ + campos especificos por recordType │
                └─────┬──────────────────────┬────────┘
                      │ source/target        │ libraryRefId (recordType=Bibliography)
                      ▼                      ▼
        ┌────────────────────────┐   ┌──────────────────────────────┐
        │     CurricularLink     │   │   BibliographyReference      │  ← biblioteca institucional
        │────────────────────────│   │──────────────────────────────│     compartida
        │ sourceSectionId        │   │ id, institutionId            │
        │ targetSectionId        │   │ rawCitation (unico required) │
        │ linkType (Develops,    │   │ title, author, year,         │
        │   Evaluates, Covers,   │   │   publisher, referenceFormat │
        │   Uses, Custom)        │   │ isbn, doi, url, metadata     │
        │ notes, position        │   └──────────────────────────────┘
        └────────────────────────┘
```

## Objetos en detalle

### 1. Activity (raiz)

**Proposito**: Definicion detallada de una actividad academica. Incluye la **identidad de la asignatura** (nombre, codigo, creditos, nivel, idioma, descripcion) y su **programa de asignatura completo** (via CurricularSection asociadas).

**Campos clave**:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `name` | string | Nombre de la asignatura |
| `code` | string | Codigo del curso |
| `version` | integer | Versión numérica system-managed (auto-incremental) |
| `versionLabel` | string | Código de versión libre externo (ej. "v2") |
| `previousVersionId` | UUID FK nullable | Self-FK a version anterior |
| `recordType` | string | Tipo de actividad (`"Course"` o `"Service"`) |
| `description` | string nullable | Texto libre |
| `credits` | number | Creditos academicos |
| `programLevel` | enum | Undergraduate / Postgraduate / ContinuingEducation / TechnicalProfessional |
| `status` | enum | **Resuelto en SP7** (UPONE-1381). Estado del programa: `Draft` / `InReview` / `Approved` / `Active` / `Deprecated` / `Archived`. Validado por el motor de transiciones de enum de core. |
| `language` | string | ISO 639-1, default `"es"` |
| `executionUnitId` | UUID FK nullable | Unidad académica asociada (OrgUnit) |
| `externalId` | string nullable | Identificador de sistema externo |
| `isCurrent` | boolean | Flag de versión vigente del programa |
| `createdAt` | timestamp | Auditoria |
| `updatedAt` | timestamp | Auditoria |

**Versionamiento**: campo `previousVersionId` encadena versiones. Solo una version vigente (`isCurrent`) por programa (ver [BR-VER-001](business-rules/BR-VER-001.md)).

**Workflow**: estados controlados por el motor de enum-transitions de core (ver [Workflow y Estados del programa](#workflow-y-estados-del-programa) y [features/enum-transitions.md](../features/enum-transitions.md)); BR-WKF-001 quedo obsoleta como fuente de verdad. La propagacion MADS solo ocurre en estados `Approved`/`Active`.

### 2. CurricularSection (polimorfico)

**Proposito**: Elemento estructural o complementario dentro de un documento curricular — programa de asignatura, plan de estudios, syllabus o cualquier otro documento curricular extensible. El `recordType` determina que tipo de seccion es.

**Campos base** (aplicables a todas las secciones, confirmados por legacy v2.2):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `ownerType` | string | "Activity" (en este mod) — FK polimorfica |
| `ownerId` | UUID | apunta al `Activity.id` (en este mod) |
| `recordType` | string | discriminador (LearningOutcome, EvaluationComponent, ...) |
| `sectionType` | enum | `"Structural"` o `"Complementary"` |
| `name` | string | Nombre de la seccion |
| `position` | integer | Orden visual dentro del programa |
| `sourceId` | UUID nullable | trazabilidad MADS (template original) |
| `isSynchronizable` | boolean | controla herencia template→syllabus ([BR-MIG-001](business-rules/BR-MIG-001.md)) |
| `isVisible` | boolean | si la seccion se muestra en la UI |
| `isRequired` | boolean | si la seccion es obligatoria en el workflow |

### RecordTypes — fuera de UPONE-1033

> **IMPORTANTE**: los RecordTypes **NO se modelan en UPONE-1033** (ver [Alcance por ticket](#alcance-por-ticket--importante)). Esta seccion es **referencia conceptual** del modelo Confluence + datos legacy. Los archivos `rt__<RT>__curricularsection.json` se crean en UPONE-1035 segun el subset que el detail necesite mostrar (ver [open-questions Q11](open-questions.md)).

> **Globales por defecto** ([DECISION-007](../../decisions/DECISION-007-recordtypes-global.md)): TODOS los RTs viven en `up1/object-manager/objects/business/RecordTypes/` y estan disponibles para todos los tenants. Si un tenant no usa un RT, simplemente no crea instancias — el tipo sigue presente. Las personalizaciones por cliente van por **Extensions** (`ext__<tenant>__<base>.json`), NO via RTs duplicados per-tenant.

**RecordTypes confirmados por legacy v2.2** (referencia conceptual):

| RecordType | sectionType | Campos especificos (segun legacy + Confluence) | Volumen en datos legacy |
|-----------|-------------|---------------------|-----------|
| **Modality** | Structural | `code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode` (`Presencial`/`Online`/`Hybrid`) | Univalle 1, AIEP 13 |
| **LearningOutcome** | Structural | `code` (nullable), `bloomLevel` (nullable), `isRequiredInAllSections` (boolean) | Univalle 3, AIEP 40 |
| **Session** | Structural | `week`, `activityType` (nullable), `activityDescription`, `duration` (nullable) | Univalle 18 (incluye semana 18 "habilitacion" — tratada como Session normal por [DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md), NO como ApprovalCondition) |
| **EvaluationComponent** | Structural | `componentCode`, `parentId` (self-FK Composite), `weight`, `method`, `componentType`, `isDirectEvidence`, `week` | Univalle 8, AIEP 1 |
| **Content** | Structural | `description`, `hours`, `contentType` (`Theoretical`/`Practical`/`Laboratory`) | AIEP 3 |
| **Bibliography** | Structural | `libraryRefId` (FK a `BibliographyReference`), `referenceType`, `notes` | Univalle 9 |
| **CustomSection** 🔒 | Complementary | **1 RT FIJO con estructura estandar** ([DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md)). Estructura definida por la plataforma: `contentType` (`"richText"`), `content`, `maxLength`. Campos NO obligatorios (excepto los esenciales). Variaciones por cliente via **Extensions**, NO via N RTs custom. | Univalle 2 |

**RecordTypes mencionados en Confluence pero NO presentes en legacy v2.2** — ver [open-questions Q5](open-questions.md):

| RecordType | Estado SP2 |
|-----------|-----------|
| ApprovalCondition | Mencionado en Confluence (MinAttendance/MinGrade/Custom). NO aparece en ejemplos legacy. **El caso Univalle "habilitacion" semana 18 NO obliga a modelarlo** ([DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md)) — se trata como Session normal. Modelado postergado, no entra en TICKET-009. |
| GeneralData 🔒 | **Postergado** ([DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md)). Esta en estado `draft` en Confluence, sin campos refinados. NO entra en TICKET-009. |
| GraduationProfile 🔒 | **Postergado** ([DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md)). Idem — estado `draft`, sin campos. |
| EntryProfile 🔒 | **Postergado** ([DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md)). Idem — estado `draft`, sin campos. |

**Ejemplos legacy completos**: ver [legacy-examples.md](legacy-examples.md).

### Que se modela de `CurricularSection` en UPONE-1033 (strict scope)

Solo el objeto base con campos comunes:

```json
{
  "title": "CurricularSection",
  "metadata": { "label": "Sección curricular", "labelPlural": "Secciones curriculares" },
  "properties": {
    "ownerType": { "type": "string", "enum": ["Activity", "Offering"] },
    "ownerId": { "type": "string", "description": "ID del owner. Sin FK directa (polimorfica)." },
    "recordType": { "type": "string", "description": "Discriminador del subtipo. Valores: ver RTs declarados en up1/object-manager/objects/business/RecordTypes/" },
    "sectionType": { "type": "string", "enum": ["Structural", "Complementary"] },
    "name": { "type": "string", "title": "Name" },
    "position": { "type": "integer", "title": "Position" },
    "isVisible": { "type": "boolean", "static_default": "true" },
    "isRequired": { "type": "boolean", "static_default": "false" },
    "isSynchronizable": { "type": "boolean", "static_default": "true" },
    "sourceId": { "type": "string", "description": "Trazabilidad MADS al template original" }
  }
}
```

**Importante**: este schema NO permite cargar el seed completo del legacy. Univalle declara 41 secciones con campos especificos (`bloomLevel`, `weight`, `theoryHours`, etc.) que **no tienen columna** hasta que se declaren los RTs en UPONE-1035.

**Implementacion en plataforma**: cada RecordType vive en `up1/object-manager/objects/business/RecordTypes/rt__<RT>__curricularsection.json` y la plataforma genera tabla 1:1 + GraphQL via codegen ([UPONE-940](https://u-planner.atlassian.net/browse/UPONE-940)).

### 3. CurricularLink

**Proposito**: Vinculo descriptivo interno entre dos `CurricularSection` del mismo documento curricular (mismo `ownerType` + `ownerId`). Declara como se desarrolla, cubre o evalua el contenido pedagogico dentro del programa.

**Importante**: NO es tributacion al perfil de competencias — eso es `CompetencyAlignment` (objeto separado, fuera de este mod). `CurricularLink` es **coherencia interna del documento**.

**Campos**:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `sourceSectionId` | UUID FK | → CurricularSection |
| `targetSectionId` | UUID FK | → CurricularSection (mismo owner) |
| `linkType` | enum | Develops / Evaluates / Covers / Uses / Custom |
| `notes` | string | requerido si linkType=Custom |
| `position` | integer | orden |

**Semantica de linkType**:

| linkType | Source | Target | Significado |
|----------|--------|--------|-------------|
| Develops | Content | LearningOutcome | El contenido desarrolla el RA |
| Evaluates | EvaluationComponent | LearningOutcome | El componente evalua el RA |
| Covers | Session | Content | La sesion cubre el contenido |
| Uses | Session | Bibliography | La sesion usa la bibliografia |
| Custom | * | * | Vinculo libre con notas obligatorias |

### 4. BibliographyReference

**Proposito**: Entrada de la **biblioteca compartida institucional** de referencias bibliograficas. Cada registro representa una referencia unica. Una misma referencia puede ser usada por N cursos sin duplicacion de datos.

**Diseño tolerante a datos pobres**: el unico campo siempre requerido es `rawCitation` — fallback cuando el resto de campos no esten poblados. Permite migracion desde legacy con datos desestructurados y enriquecimiento posterior sin tocar secciones que ya apuntan a la referencia.

**Campos** (confirmados por legacy v2.2):

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `institutionId` | UUID FK | → Institution (objeto core, ver [up1/object-manager/objects/business/Base/institution.json](../../../../up1/object-manager/objects/business/Base/institution.json)) |
| `rawCitation` | string | **unico requerido siempre** — fallback universal |
| `title` | string nullable | |
| `author` | string nullable | |
| `year` | integer nullable | |
| `publisher` | string nullable | |
| `publicationPlace` | string nullable | Confirmado por legacy ("Cali", "Mexico", `null`) |
| `edition` | string nullable | Confirmado por legacy ("3a reimpresion", "4a", "11a") |
| `isbn` | string nullable | |
| `url` | string nullable | |
| `referenceFormat` | string | Legacy v2.2 usa `"free-text"`. Modelo Confluence menciona enum (Book/Article/Website/...). Ver [open-questions Q4](open-questions.md) |
| `metadata` | JSON nullable | mencionado en Confluence; el legacy no lo usa |

**Asociacion al programa**: vinculada via `CurricularSection` con `recordType=Bibliography` y campo `libraryRefId`. NO se asocia directamente a `Activity`.

## Relaciones cardinales

| Relacion | Tipo | Mecanismo |
|----------|------|-----------|
| Activity 1—N CurricularSection | uno a muchos | `ownerType="Activity"` + `ownerId` (FK polimorfica) |
| CurricularSection 1—N CurricularLink (source) | uno a muchos | constraint "mismo owner" (solo links dentro del mismo agregado) |
| CurricularSection 1—N CurricularLink (target) | uno a muchos | idem |
| CurricularSection (recordType=Bibliography) N—1 BibliographyReference | muchos a uno | `libraryRefId` |
| BibliographyReference N—1 Institution | muchos a uno | `institutionId` (Institution es objeto core de up1) |
| Activity N—1 OrgUnit | muchos a uno | `executionUnitId` — **POSTERGADO en SP2** |

## Inventario completo de objetos del mod (2026-07-16)

El mod `curriculum-design` paso de los 4 objetos del agregado original (SP2) a **12 objetos**, incorporados en sprints posteriores para cubrir planes de estudio, carreras e inscripciones. Los 4 objetos de workflow relacional (`Workflow`, `WorkflowStatus`, `WorkflowTransition`, `WorkflowTransitionHistory`) que existieron hasta SP7 se **retiraron por completo en UPONE-1459** (codigo muerto tras migrar el estado de `Activity` al motor de enum-transitions de core, UPONE-1381; SS-423 removio la ultima FK de uEngagement). El drop de tablas/columnas se aplica al regenerar el schema (UPU hecho, los demas tenants en deploy). El inventario vivo es:

| Objeto | Origen | Rol |
|--------|--------|-----|
| `Activity` | SP2 | Raiz del agregado Programa de asignatura (este documento) |
| `CurricularSection` | SP2 | Seccion polimorfica del programa (via RecordTypes) |
| `CurricularLink` | SP2 | Vinculo interno entre secciones |
| `BibliographyReference` | SP2 | Biblioteca institucional compartida |
| `AcademicProgram` | SP5-SP7 | Carrera / programa academico (raiz con delete en cascada, clonable) |
| `Curriculum` | SP5-SP7 | Plan de estudios / malla curricular, versionable y clonable |
| `Offering` | SP5-SP7 | Instancia periodica de una `Activity` (silabo dictado, via MADS) |
| `planEntry` | SP5-SP7 | Entrada del plan de estudios dentro de un `Curriculum` |
| `requirement` | SP5-SP7 | Requisito (prerequisito/correquisito) sobre entradas del plan |
| `requirementCategory` | SP5-SP7 | Categoria/agrupacion de requisitos |
| `PlanEnrollment` | SP5-SP7 | Matricula de un estudiante en un `Curriculum` (unico por `programEnrollmentId` + `curriculumId`) |
| `ProgramEnrollment` | SP5-SP7 | Matricula de un estudiante en un `AcademicProgram` (unico por `studentId` + `programId`) |

Ver [Funcionalidades transversales](#delete-en-cascada-y-rbac-granular-por-tab) mas abajo para el detalle de delete en cascada y RBAC granular que aplican a estos objetos agregados.

## Workflow y Estados del programa 🔒

**Resuelto en SP7** (UPONE-1381). El objeto `Activity` (Programa de asignatura), así como `Curriculum` y `Offering`, migraron del modelo relacional a la lógica de **Enum Transitions** transversal de core. Las transiciones permitidas se definen de manera declarativa en la propiedad `transitions` del campo `status` en el JSON de definición del objeto.

El campo `status` puede tomar los siguientes valores:
* **Draft**: Edición libre del programa por el coordinador.
* **InReview**: En revisión, bloquea la edición directa mientras espera aprobación.
* **Approved**: Programa aprobado. Habilita la creación de versiones y silabos (MADS).
* **Active**: Programa activo y vigente en la institución.
* **Deprecated**: Obsoleto, no se pueden crear nuevos silabos a partir de él.
* **Archived**: Archivado históricamente.

Las transiciones permitidas en `activity.json` son:
* `Draft ─────► InReview`
* `InReview ──► Approved` (Requiere capability `activity:approve`)
* `InReview ──► Draft` (Requiere comentario)
* `Approved ──► Active` (Requiere capability `activity:publish`)
* `Approved ──► Draft`
* `Active ────► Deprecated` (Requiere capability `activity:deprecate` y comentario)
* `Active ────► Draft` (Requiere comentario)
* `Deprecated ─► Archived` (Requiere capability `activity:archive`)

Cualquier cambio de estado es validado en runtime por `enforceEnumTransitions` en `instance.resolver.js` y genera auditoría automática persistida en `DataLog` de core.

## Versionamiento

Multiples versiones encadenadas via `previousVersionId`. Solo una version `Active` (vigente, flag `isCurrent`) por programa ([BR-VER-001](business-rules/BR-VER-001.md)). Implementado (SP6-SP7, UPONE-1216/1381): campo `version` numerico auto-incremental, `versionableFromStates: [Approved, Active]` y capability `activity:version` ([features/enum-transitions.md](../features/enum-transitions.md)).

Clonacion ([BR-VER-002](business-rules/BR-VER-002.md), CAP-CUR-022): genera nuevos IDs, nace en `Draft`, registra origen. Implementado (SP6, UPONE-1216): para `Activity` la clonacion se cubre via versionamiento (`activity:version`, no hay `activity:clone` separado); `academicprogram:clone`, `curricularsection:clone` y `curriculum:clone` cubren la clonacion del resto de raices del agregado y de las secciones.

## Modalidades

Una asignatura debe tener **>=1 seccion `Modality`**. Cada modalidad tiene su propia carga horaria (theory/practice/lab/autonomous) y delivery mode (Presencial/Online/Hybrid). Solo una puede tener `isDefault=true`.

Ejemplo: AIEP soporta hasta 13 modalidades por curso; Univalle usa una sola por curso. La estructura es la misma.

## Delete en cascada y RBAC granular por tab

Dos capacidades transversales agregadas en SP7 que aplican sobre el agregado completo (ver [Inventario completo de objetos del mod](#inventario-completo-de-objetos-del-mod-2026-07-16)):

**Delete en cascada** (UPONE-1382): las 4 raices con hijos declarados (`AcademicProgram`, `Curriculum`, `Activity`, `Offering`) declaran su arbol de hijos via metadata `polymorphicChildren`/`directChildren`. Al eliminar un registro, el motor calcula el impacto (`deleteImpactPreview`), detecta si hay referencias que restringen el borrado (`status: 'restricted'`) o si puede ejecutarse en cascada de forma atomica (`status: 'cascade'`), y audita cada nodo borrado en `DataLog`. En UI, `canDelete`/`deleteWarning` habilitan el modal de confirmacion critico en los listados raiz y en las listas embebidas. Detalle completo en [features/delete-cascade.md](../features/delete-cascade.md).

**RBAC granular por tab** (UPONE-1393): ademas del RBAC object-level y field-level ya existente, las secciones/tabs de los layouts `_edit` (`default_Activity_edit.json`, `default_Curriculum_edit.json`, etc.) declaran `requiredCapability` para gatear la visibilidad de tabs completos (ej. `curricularsection:view` en las tabs de Modalidades/Resultados de aprendizaje/Contenidos/Sesiones/Evaluacion/Bibliografia/Secciones personalizadas del programa). Detalle completo en [features/rbac.md](../features/rbac.md).

## Herencia template → syllabus (MADS)

Cuando se crea un syllabus para una seccion dictada del curso:

1. El `Activity` (template, en estado `Approved`/`Active`) se replica como `Offering` (instancia para periodo).
2. Cada `CurricularSection` con `isSynchronizable=true` se copia, manteniendo `sourceId` apuntando a la plantilla original.
3. Cambios futuros en el template propagan al syllabus segun parametros institucionales ([BR-MIG-002](business-rules/BR-MIG-002.md)).
4. **Bloqueo**: si el syllabus ya tiene calificaciones, NO se sincroniza automaticamente — solo edicion manual ([BR-MIG-003](business-rules/BR-MIG-003.md)).

`Offering` es un objeto **compartido**: su definicion vive en este mod (`mods/curriculum-design/objects/Offering.json`) y tambien en `mods/uengagement-up1/objects/Offering.json` (merge por sync). Aparece en el inventario de objetos del mod mas abajo. Su ciclo de vida de sílabo (`lifecycleStatus`) se gobierna con el motor de enum-transitions (UPONE-1381).

## Notas de implementacion en formato up1

Aplicar las convenciones de [up1-modeling-guide.md](up1-modeling-guide.md) (basado en [references/AGENTS.md](references/AGENTS.md) y [references/EXAMPLES.md](references/EXAMPLES.md)). En particular:

- **NO declarar `id`, `createdAt`, `updatedAt`** en los archivos JSON Schema — los inyecta `common.json` del framework. Aunque aparecen en los ejemplos legacy, en los archivos del mod se omiten.
- **`tenantId`** lo agrega el codegen automaticamente (ver [BR-TNT-001](business-rules/BR-TNT-001.md)).
- **FK polimorfica** `ownerType` + `ownerId` segun el patron AGENTS.md: `ownerId` es `string` SIN `isForeignKey` (no se puede declarar destino).
- **Self-FK** simple, sin `relation: "self"`. Aplica a `previousVersionId` (Activity), `sourceId` (CurricularSection), `parentId` en EvaluationComponent (apunta a otra `CurricularSection`).
- **Enum casing**: 🟡 NO bloqueante. UP1 NO tiene regla obligatoria a nivel codigo (confirmado por Juan Diego en reunion 2026-04-28 — los enum existentes mezclan PascalCase, upper_snake_case y lower snake_case). Juan Diego va a impulsar establecer un estandar oficial UP1 con el equipo. **Postura provisoria**: usar **UPPER_SNAKE_CASE** (alineado a las 5 Bases verificadas en `up1/object-manager/objects/business/Base/`). Si se define convencion oficial distinta, ajustar. Ver [Q10](open-questions.md#q10).
- **`static_default` siempre como string** incluso para boolean (`"true"`/`"false"`).

Ver guia completa en [up1-modeling-guide.md](up1-modeling-guide.md).

## Decisiones tecnicas relacionadas

| Decision | Tema | Estado | Fecha |
|----------|------|--------|-------|
| [DECISION-001](../../decisions/DECISION-mod-unico-curriculum-design.md) | Un solo mod para los 4 objetos del agregado | ✅ accepted | 2026-04-27 |
| [DECISION-002](../../decisions/DECISION-org-unit-defer.md) | Postergar FK `executionUnitId` → OrgUnit (opcion C) | ✅ accepted | 2026-04-27 |
| ~~[DECISION-003](../../decisions/DECISION-003-tenant-ids.md)~~ | ~~Tenants UNIVALLE + AIEP~~ | ⚠️ superseded por DECISION-011 | 2026-04-27 |
| [DECISION-004](../../decisions/DECISION-004-externalid-single-field.md) | `externalId` UN solo campo (data lake unifica N→1) | ✅ accepted | 2026-04-28 |
| [DECISION-005](../../decisions/DECISION-005-workflow-state-defer.md) | `workflowState` postergado a sprint futuro junto con CAP-CUR-019 | ✅ accepted | 2026-04-28 |
| [DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md) | `CustomSection` 1 RT FIJO + Extensions para custom (NO N RTs custom) | ✅ accepted | 2026-04-28 |
| [DECISION-007](../../decisions/DECISION-007-recordtypes-global.md) | Todos los RecordTypes son GLOBALES (NO per-tenant) | ✅ accepted | 2026-04-28 |
| [DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md) | RTs draft (GeneralData/GraduationProfile/EntryProfile) postergados; caso "habilitacion" Univalle = Session normal | ✅ accepted | 2026-04-28 |
| ~~[DECISION-009](../../decisions/DECISION-009-use-existing-tenants.md)~~ | ~~Usar tenants existentes TEST + UPU (sugerido en reunion)~~ | ⚠️ superseded por DECISION-012 | 2026-04-28 |
| ~~[DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md)~~ | ~~Revertir a UNIVALLE + AIEP (deuda tecnica)~~ | ⚠️ superseded por DECISION-012 | 2026-04-28 |
| ~~[DECISION-011](../../decisions/DECISION-011-final-use-test-upu.md)~~ | ~~TEST + UPU (analisis coexistencia)~~ | ⚠️ superseded por DECISION-012 | 2026-04-28 |
| **[DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md)** | **DECISION FINAL: Rollout 2 fases — F1 (SP2) solo UPU; F2 (post-SP2) separar por tenant** | ✅ **accepted** | 2026-04-28 |

**Notas adicionales**:
- Polimorfismo CurricularSection: resuelto por plataforma (RecordTypes, [UPONE-939](https://u-planner.atlassian.net/browse/UPONE-939))
- Layouts por RecordType: validar al implementar UPONE-1035 (ver [risks/layouts-recordtype-untested.md](risks/layouts-recordtype-untested.md))
- Resoluciones de la reunion 2026-04-28: ver [transcripts/2026-04-28-revision-dudas-modelo.md](transcripts/2026-04-28-revision-dudas-modelo.md)

## Tickets en alcance

| Ticket Jira | Ticket DKC | Cobertura del modelo |
|-------------|------------|---------------------|
| [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | TICKET-006 | Declarar los 4 objetos + sus RecordTypes |
| [UPONE-1034](https://u-planner.atlassian.net/browse/UPONE-1034) | TICKET-007 | Layout listado de Activity |
| [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | TICKET-009 | Layout detail de Activity con N CurricularSections |
