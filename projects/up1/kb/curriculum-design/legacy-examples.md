---
id: SPEC-curriculum-design-legacy-examples
project: up1
type: spec
module: curriculum-design
status: reference
tags: [curriculum-design, legacy, ejemplos, seed, univalle, aiep]
external_refs:
  - UPONE-1033
sources:
  - "ejemplos-cursos-legacy-univalle-aiep_v2.md (v2.2, 2026-04-25)"
  - "modelo-objetos-negocio_v1.md v1.6 (referenciado por el doc anterior)"
---

# Ejemplos legacy — Programas de curso Univalle y AIEP

Documentacion fiel de los 2 ejemplos entregados por el equipo funcional como instancias reales del modelo del agregado Programa de asignatura.

**Fuente original**: `ejemplos-cursos-legacy-univalle-aiep_v2.md` v2.2 fechado 2026-04-25.
**Modelo base referenciado**: `modelo-objetos-negocio_v1.md` v1.6.
**Alcance del documento**: solo instancias de `Activity`, `CurricularSection` (incluyendo `Modality`), `CurricularLink` y catalogo `BibliographyReference`. 1 ejemplo por institucion.

> Este archivo es **referencia primaria** para el seed del mod. NO modificar — si llegan nuevos ejemplos del equipo funcional, agregar como version posterior.

> **IMPORTANTE — Cobertura por ticket**:
> - **TICKET-006 (UPONE-1033)** carga **solo campos comunes** de cada `CurricularSection`: `ownerType`, `ownerId`, `recordType` (string), `sectionType`, `name`, `position`, `isVisible`, `isRequired`, `isSynchronizable`, `sourceId`. NO carga campos especificos por RT (`bloomLevel`, `weight`, `theoryHours`, etc.) porque los RTs no estan declarados en este ticket.
> - **TICKET-009 (UPONE-1035)** declara los RTs y **carga el seed completo** con todos los campos especificos.

---

## Caso 1: Universidad del Valle — Ecuaciones Diferenciales

| Campo | Valor |
|-------|-------|
| `id` | `aa-uv-1124` |
| `executionUnitId` | `ou-uv-academicunit-111` |
| `code` | `111026C` |
| `externalId` | `1124` |
| `name` | Ecuaciones Diferenciales |
| `recordType` | `Course` |
| `version` | `v2022-actual` |
| `previousVersionId` | `null` |
| `workflowState` | `Active` |
| `language` | `es` |
| `credits` | 3 |
| `programLevel` | `Undergraduate` |
| `createdAt` | `2022-11-16T16:41:18Z` |
| `updatedAt` | `2026-03-17T09:53:51Z` |

**Description**: Curso que brinda herramientas conceptuales para el planteamiento y solucion de ecuaciones diferenciales ordinarias. Metodologia ABP.

### CurricularSections

| RecordType | Cantidad | Notas |
|-----------|---------|-------|
| **Modality** | 1 | Solo "Modalidad Presencial" (PRES). 4 theoryHours + 2 practiceHours, isDefault=true |
| **LearningOutcome** | 3 | RA1 (Resuelve EDOs), RA2 (Analiza familia de soluciones), RA3 (Modela situaciones). Todos con `code` "RA1/RA2/RA3" pero `bloomLevel: null` |
| **Session** | 18 | SEM 1 a SEM 18 (todas con `week` 1-18). Las 2 ultimas (`isRequired: false`) son opcional examen parcial + habilitacion |
| **EvaluationComponent** | 8 (Composite) | 1 root "Nota Final" weight=100 + 7 hijos (Q1..Q6 weight=11 + EP=34) |
| **Bibliography** | 9 | 4 Mandatory + 4 Complementary + 1 Digital |
| **CustomSection** | 2 | Descripcion extendida + Temario detallado (`contentType: "richText"`) |

### CurricularLinks (3)

| Link | Source → Target | linkType |
|------|-----------------|----------|
| `cl-uv-1124-q1-evaluates-ra1` | EC `Q1` → LO `RA1` | `Evaluates` |
| `cl-uv-1124-sem3-covers-q1` | Session `SEM 3` → EC `Q1` | `Covers` |
| `cl-uv-1124-sem14-uses-bib1` | Session `SEM 14` → Bibliography `bib-1` | `Uses` |

### BibliographyReference (9)

Catalogo institucional. Todos con `referenceFormat: "free-text"`. Algunos campos clave:
- `br-uv-1`: Calderon, Arango, Gomez (2018) — Programa Editorial Univalle, Cali, "3a reimpresion"
- `br-uv-7`: Trench (2013) Trinity University — incluye `url: "https://digitalcommons.trinity.edu/mono/8"`
- `br-uv-9`: Recursos online — solo `url: "https://es.khanacademy.org/math/differential-equations"` y `rawCitation`

---

## Caso 2: AIEP — Introduccion a las Redes

| Campo | Valor |
|-------|-------|
| `id` | `aa-aiep-14757` |
| `executionUnitId` | `ou-aiep-academicunit-11` |
| `code` | `TIR101` |
| `externalId` | `TIR101` |
| `name` | Introduccion a las Redes |
| `recordType` | `Course` |
| `version` | `v2022-actual` |
| `previousVersionId` | `null` |
| `workflowState` | `Active` |
| `language` | `es` |
| `credits` | 5 |
| `programLevel` | `TechnicalProfessional` |
| `description` | `null` |
| `createdAt` | `2022-09-29T16:24:58Z` |
| `updatedAt` | `2025-05-19T16:06:36Z` |

### CurricularSections

| RecordType | Cantidad | Notas |
|-----------|---------|-------|
| **Modality** | **13** | Una asignatura con 13 modalidades distintas (DIU-FLE, DIU-PRE, DIU-TLP, DIU-TLS, ONL-ONL, PED-7X7, PED-PRE, PEV-PRE, PEV-TLP, PEV-TLS, SEM-PRE, VES-PRE, VES-TLS). `isDefault: true` solo en DIU-PRE. Todas con `2/2/2` theory/practice/lab |
| **LearningOutcome** | **40** | LOs sin `code` (`code: null`). Sin `bloomLevel` |
| **Content** | 3 | "Introduccion a las redes de datos" (30h Theoretical), "Redes de datos: LAN, WAN, protocolos" (30h Theoretical), "Implementacion de la configuracion basica" (30h Practical) |
| **EvaluationComponent** | 1 | Solo el root `"Nota 6"` con `componentCode: "N6"`, `weight: null`, `componentType: null`, `isDirectEvidence: null`. Sin Composite hijos en este ejemplo |

### CurricularLinks (9)

Todas con `linkType: "Develops"`. Vinculan los 3 `Content` (unidades tematicas) con LOs adicionales (`cs-aiep-14757-lo-u1a01..u3a09`).

> **Nota del documento original**: "Una entrada por cada `imp_courseunit_expectedlearning` del legacy AIEP — vinculan unidades tematicas (Content) con sus aprendizajes esperados granulares (LearningOutcome derivados de competencias atomicas). Los IDs `cs-aiep-14757-lo-uXaXX` referencian LO adicionales que se crearian a partir de las competencias `imp_competencies` (CEI-00620-C01-TIR101-UnAm)."

Esto implica que en la migracion legacy AIEP **se generaran LOs adicionales desde otra tabla** (`imp_competencies`), no incluidos en la lista de 40 LOs declarados.

### BibliographyReference

El documento NO incluye `BibliographyReference` ni `Bibliography` (CurricularSection) para AIEP.

---

## Hallazgos: campos y patrones observados (sin inferir)

### Campos comunes a TODA `CurricularSection` (segun ejemplos)

Todos los items en ambos ejemplos los tienen:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | PK |
| `ownerType` | string | `"Activity"` en ambos casos |
| `ownerId` | UUID | apunta al programa |
| `recordType` | string | discriminador |
| `sectionType` | enum | `"Structural"` o `"Complementary"` (CustomSection es Complementary) |
| `name` | string | siempre presente |
| `position` | integer | orden 1, 2, 3, ... |
| `isSynchronizable` | boolean | `true` en TODOS los ejemplos del legacy |
| `isVisible` | boolean | `true` en TODOS los ejemplos |
| `isRequired` | boolean | mayoria `true`, algunas Sessions `false` |

### Campos especificos por RecordType (verbatim de los ejemplos)

#### Modality
`code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours` (nullable), `isDefault` (boolean, una sola por curso), `deliveryMode` (enum: `Presencial`/`Online`/`Hybrid`).

#### LearningOutcome
`code` (puede ser `null` como en AIEP), `bloomLevel` (puede ser `null`), `isRequiredInAllSections` (boolean). En Univalle el `name` lleva el RA completo con prefijo "RA1./RA2.".

#### Session
`week` (integer), `activityType` (puede ser `null`), `activityDescription` (string), `duration` (puede ser `null`).

#### EvaluationComponent
`componentCode`, `parentId` (UUID nullable, self-FK para Composite), `weight` (numero), `method` (puede ser `null`), `componentType` (`Summative`/`Formative`/`null`), `isDirectEvidence` (boolean/`null`), `week` (puede ser `null`).

#### Content (no aparece en Univalle, sí en AIEP)
`description` (puede ser `null`), `hours` (numero), `contentType` (enum: `Theoretical`/`Practical`/`Laboratory`).

#### Bibliography (CurricularSection con recordType=Bibliography, no la BibliographyReference catalogo)
`libraryRefId` (FK al catalogo BibliographyReference), `referenceType` (enum: `Mandatory`/`Complementary`/`Digital`), `notes` (string nullable).

#### CustomSection (solo Univalle)
`contentType` (enum observado: `richText`), `content` (HTML/markdown libre), `maxLength` (puede ser `null`).

### Campos del catalogo `BibliographyReference` (verbatim del legacy Univalle)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | string | PK |
| `title` | string | requerido en todos excepto br-uv-9 (recursos online) |
| `author` | string nullable | |
| `year` | integer nullable | |
| `publisher` | string nullable | |
| `publicationPlace` | string nullable | "Cali", "Mexico", `null` |
| `edition` | string nullable | "3a reimpresion", "4a", "11a" |
| `isbn` | string nullable | `null` en todos los Univalle |
| `url` | string nullable | solo en br-uv-7 (Trench) y br-uv-9 (recursos online) |
| `rawCitation` | string requerido | siempre presente — fallback universal |
| `referenceFormat` | enum | `"free-text"` en todos los del legacy Univalle |

### Patrones observados

1. **`workflowState: "Active"`** se usa en ambos casos (Univalle y AIEP).
2. **`previousVersionId: null`** en ambos: ningun ejemplo tiene cadena de versiones declarada.
3. **`externalId`**: un solo campo string (no `externalSystemId + externalRecordId`). Univalle: `"1124"`. AIEP: `"TIR101"`.
4. **Composite de EvaluationComponent solo en Univalle** (1 root + 7 hijos). AIEP solo tiene root sin Composite.
5. **AIEP usa 13 Modality, Univalle usa 1** — confirma variabilidad institucional del modelo.
6. **CustomSection usado solo en Univalle**: 2 secciones (descripcion extendida + temario).
7. **AIEP no tiene Bibliography ni BibliographyReference** declaradas — el legacy AIEP no documenta bibliografia en este nivel.
8. **CurricularLinks de AIEP** apuntan a LOs no declarados (vienen de migracion `imp_competencies`).

---

## Uso recomendado

1. **Seed inicial del mod `curriculum-design`** (TICKET-006): usar Univalle como semilla minima (caso simple, todos los RTs principales) + AIEP como caso edge (multi-modalidad, alta cardinalidad de LOs).
2. **Validacion del modelo**: si declaramos un campo no presente en estos ejemplos, levantarlo como [open question](open-questions.md) — no inferir.
3. **Migracion legacy** (futuro): el ejemplo AIEP indica que los LOs vienen de `imp_competencies` — capturado como pendiente para post-SP1.

---

## Discrepancias con la documentacion previa

Las diferencias entre estos ejemplos legacy y la pagina Confluence "Modelo de objetos de negocio Learning Assurance" (id 2038366242, version anterior a estos ejemplos) estan listadas en [open-questions.md](open-questions.md). **NO se toman decisiones aqui** — solo se documentan para resolver con el equipo funcional cuando corresponda.
