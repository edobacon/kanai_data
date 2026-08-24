---
id: SPEC-curriculum-design-open-questions
project: up1
type: spec
module: curriculum-design
status: open
tags: [curriculum-design, open-questions, sp2, pendientes, modelo-datos]
external_refs:
  - UPONE-1033
  - UPONE-1038
sources:
  - "Modelo de objetos de negocio Learning Assurance (Confluence 2038366242)"
  - "ejemplos-cursos-legacy-univalle-aiep_v2.md (v2.2, 2026-04-25)"
  - "AGENTS.md / EXAMPLES.md (formato up1, 2026-04-27)"
  - "Codigo: up1/object-manager/objects/business/Base/*.json (Bases reales del core)"
---

# Curriculum Design — Open Questions

## Resoluciones de la reunion 2026-04-28

> Reunion: Eduardo Bacon + Esteban Cortes (modelador) + Juan Diego Galdames (plataforma up1).
> Transcripcion: `transcripts/2026-04-28-revision-dudas-modelo.md` (a archivar).
> Duracion: ~31 min. Cubrio las 5 preguntas criticas del meeting deck (P1..P5).

| Q | Tema | Resolucion 2026-04-28 | Decision formal |
|---|------|-----------------------|----------------|
| **Q1** | externalId 1 vs 2 campos | ✅ **1 solo campo**. La unificacion N→1 ocurre en una capa de datos previa (data lake interno) que pre-procesa antes de llegar a UP1. El externalId mapea al `integrationId` del modelo estandar. **Place holder** sujeto a refinamientos futuros del equipo Data Service. | [DECISION-004](../../decisions/DECISION-004-externalid-single-field.md) |
| **Q2** | workflowState valores y casing | ✅ **NO bloqueante este sprint**. El objeto `Workflow` y la logica de transiciones se modelan en sprint futuro. **Accion**: ajustar ejemplos legacy para que usen valores del enum actual (`draft`, `active`, `suspended`, `discontinue`). El enum se modificara cuando se implemente Workflow. | [DECISION-005](../../decisions/DECISION-005-workflow-state-defer.md) |
| **Q3** | CustomSection 1 vs N | ✅ **1 RT fijo** con estructura estandar definida por la plataforma. Campos no obligatorios para flexibilidad. Las variaciones por cliente se manejan via **Extensions** (campos custom adicionales), NO via N RTs custom. **Principio**: minima personalizacion, maxima estandarizacion. | [DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md) |
| **Q5** caso Univalle "habilitacion" | semana 18 = ApprovalCondition? | ✅ **No**. Tratar como `Session` normal con descripcion "habilitacion". El analisis IA sobre-interpreto el texto. | (registrado en open-questions, no requiere decision formal) |
| **Q5** RTs sin campos (GeneralData, GraduationProfile, EntryProfile) | modelar este sprint? | ✅ **No**. Estan en estado `draft` en Confluence, sin campos refinados. Postergados — se refinan al implementar funcionalidad por funcionalidad. NO entran en TICKET-009. | [DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md) |
| **Q10** | enum casing UPPER_SNAKE vs PascalCase | 🟡 **NO bloqueante**. Confirmado por Juan Diego: NO existe regla de casing obligatoria en codigo up1 (validacion solo exige letras + sin espacios/guiones). Los enums actuales en up1 mezclan PascalCase, upper_snake_case y lower snake_case. Juan Diego va a impulsar establecer convencion en UP1 con el equipo. **Accion provisoria**: avanzar con UPPER_SNAKE_CASE (alineado a las 5 Bases verificadas) y ajustar si la convencion oficial difiere. | (pendiente confirmacion con team UP1) |
| **T1** | Tenant IDs UNIVALLE/AIEP | ✅ **Resuelta — Rollout 2 fases (final)**. Cadena de 4 reconsideraciones (DECISION-003 → 009 → 010 → 011 → 012). Decision FINAL: Fase 1 (SP2) carga **ambos data sets en `UPU` solo** — SP2 no usa capacidades por tenant, asi que validar aislamiento ahora no aporta. Fase 2 (post-SP2) separa por tenant cuando haya contexto sobre infra. Identificacion en SP2 por `name`/`externalId`/`Institution.code` dentro de UPU. | [DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md) (FINAL) supersedes 003/009/010/011 |
| **T2** | RTs globales o per-tenant | ✅ **Globales**. Esteban: "Los record son base del modelo, tienen que ser para todos." Siempre estan todos los RTs en plataforma; el cliente decide si la **instancia** del RT tiene datos o no. Las extensiones por cliente van como **campos adicionales (Extensions)** dentro del RT existente. | [DECISION-007](../../decisions/DECISION-007-recordtypes-global.md) |

### Citas verbatim de la reunion

- **Q1 externalId** (Esteban): _"un external ID está bien. (...) la unificación de n identificadores a un único identificador debería venir en esa capa de datos. (...) por ahora es como un place holder."_
- **Q2 workflowState** (Esteban): _"todavia falta modelar (...) el objeto de workflow y como va a ser la relacion con ese estado. (...) considerarlos como un preview de lo que va a ser. (...) completa en el enum el faltante (...) ajustalos para que sean consistentes."_
- **Q3 CustomSection** (Esteban): _"la custom section tambien sea una estructura ya definida por nosotros. (...) que sea siempre igual. (...) la menor cantidad de personalizacion (...) que sea lo mas generico posible."_
- **Q3 Extensions** (Juan Diego): _"limitar solamente como a campo custom, solamente como un campo extra, pero no un record dedicado."_
- **Q5 habilitacion** (Esteban): _"hay que ignorar no mas ese caso. (...) considerarlo como una descripcion de la sesion simplemente."_
- **Q5 RTs draft** (Esteban): _"hay campos que no van a estar del todo refinados porque si no nos demorariamos mucho en tener un modelo (...) la idea es ir marcando como draft."_
- **Q10 casing** (Juan Diego): _"no hay una regla de casing obligatoria, hay normas no mas de que tiene que empezar solamente con letras y que no puede tener espacios ni guiones (...) hay diferentes (...) PascalCase, upper snake case, lower snake case."_
- **Q10 acuerdo** (Juan Diego + Esteban + Eduardo): _"voy a comentar y voy a impulsar tambien que haya una regla, un estandar de nomenclatura."_
- **T1 tenants** (Juan Diego): _"podriamos hacer probando (...) tenemos ya dos tenants como que usamos siempre de base que esta UPU y test. (...) podriamos dejar cosas en upu y en test para hacer distinciones."_
- **T2 RTs globales** (Esteban): _"los record son base del modelo. (...) siempre van a estar todos los recortes, no necesariamente van a estar siempre con datos dependiendo del cliente."_

### Preguntas que NO se discutieron en esta reunion

- **Q4** (referenceFormat enum), **Q6** (LearningOutcomes derivados AIEP), **Q7** (estados sub-objetos), **Q8** (BibliographyReference AIEP), **Q9** (Modality cardinalidad >= 1), **Q11** (subset RTs en TICKET-009), **Q12** (timing seed legacy), **Q13** (recordType enum o libre), **Q14** (RTs no cubiertos)
- **T3, T4, T5** dependen del resultado de T1 (cambio a TEST/UPU obliga a redocumentar mapeo)

### Implicancia inmediata para tickets

- **TICKET-006 (UPONE-1033)**: desbloqueado parcialmente. Q1, Q3 resueltas. Q2 mantiene enum minimo lowercase actual hasta sprint futuro. Q10 no bloquea (avanzar con UPPER_SNAKE). T1 requiere alinear si se usan TEST/UPU vs UNIVALLE/AIEP.
- **TICKET-009 (UPONE-1035)**: GeneralData/GraduationProfile/EntryProfile NO se modelan. Subset RT efectivo se reduce a Modality + LearningOutcome + Content + Session + EvaluationComponent + Bibliography + ApprovalCondition (este ultimo aun pendiente Q5).
- **TICKET-007 (UPONE-1034)**: sin cambios.

---

## Prisma de revision

Cada pregunta se evalua bajo **4 lentes**:

1. **Confluence Learning Assurance (verdad estructural)** — define que entidades existen y que semantica tienen.
2. **Formato — Confluence up1 + codigo real** — define como se codifica en up1 (convenciones de JSON Schema, casing, FKs, enums).
3. **Discrepancias del legacy** — que tenemos en los ejemplos v2.2, que falta, que difiere, como se convierte.
4. **Cobertura este sprint vs sprint futuro** — que se hace ahora, que pregunta queda abierta, que ejemplos lo justifican, que repercusiones tiene.

> **Regla**: cuando hay pregunta abierta, **NO se toma decision**. Si hay una via tecnica respaldada por codigo (ej: enums en UPPER_SNAKE), se registra como **propuesta a confirmar con el equipo funcional**, no como decision tomada.

> Las menciones a Business Rules, Capabilities, Decisions y Tickets se consolidan en la seccion [Referencias cruzadas](#referencias-cruzadas) al final del documento.

### Hallazgos clave del codigo (ver [validacion en Bases del core](#validacion-en-bases-del-core))

| Hallazgo | Implicacion |
|----------|-------------|
| **Todos los Bases con enum usan UPPER_SNAKE_CASE** | Q2, Q4, Q10 — el casing legacy/Confluence (PascalCase) NO esta en codigo |
| **`externalId` no existe en ningun Base** | Q1 — patron nuevo, sin precedente que validar |
| **Ningun Base usa FK polimorfica `ownerType`/`ownerId`** | CurricularSection seria el primer caso real |
| **Solo 1 RecordType en codigo: `rt__Student__core_user.json`** | Q3, Q5 — sin precedente empirico para RTs custom |

---

## Propuesta preliminar del modelo

> **Estado**: BORRADOR sujeto a las open questions Q1..Q14. Cada campo marcado con icono tiene pregunta abierta o decision a confirmar.
>
> **Alcance**: solo objetos de **TICKET-006 (UPONE-1033)** — los 4 objetos base del agregado. Los RecordTypes (futuro `rt__<RT>__curricularsection.json`) van en TICKET-009 (UPONE-1035).

### Convencion de iconos

| Icono | Significado |
|-------|-------------|
| ❓ | Pregunta abierta sin decision — requiere confirmacion del equipo funcional |
| ⚠️ | Discrepancia entre fuentes (Confluence Learning Assurance vs legacy v2.2 vs codigo up1) |
| 📘 | Decision o valor proviene de **Confluence Learning Assurance** (verdad estructural) |
| 📊 | Decision o valor proviene de **legacy v2.2** (datos reales Univalle/AIEP) |
| 🛠️ | Decision o valor proviene del **codigo real de up1** (Bases del core o AGENTS.md) |
| 🔒 | Campo postergado por una `DECISION-XXX` formal |
| 💡 | Propuesta del modelador (a validar — sin respaldo unico de fuente) |

### Fuentes consultadas

| Fuente | Detalle |
|--------|---------|
| 📘 Confluence | "Modelo de objetos de negocio Learning Assurance" (id `2038366242`, modificado 2026-04-27, autor: Esteban Cortes) |
| 📊 Legacy v2.2 | `ejemplos-cursos-legacy-univalle-aiep_v2.md` v2.2 (2026-04-25) — instancias Univalle (`aa-uv-1124`) y AIEP (`aa-aiep-14757`) |
| 🛠️ AGENTS.md | Guia de formato up1 entregada 2026-04-27 ([references/AGENTS.md](references/AGENTS.md)) |
| 🛠️ Bases del core | `up1/object-manager/objects/business/Base/*.json` — 21 archivos verificados |

### 1. `Activity` — Programa de asignatura (raíz)

**Archivo propuesto**: `up1/mods/curriculum-design/objects/Activity.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Activity",
  "type": "object",
  "metadata": {
    "label": "Programa de asignatura",
    "labelPlural": "Programas de asignatura",
    "gender": "masculino",
    "description": "Documento curricular oficial que define como se enseña una asignatura en la institucion.",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "name":              { "type": "string",  "title": "Name",          "not_null": true,  "description": "Nombre de la asignatura", "transformations": [{ "type": "trim" }] },
    "code":              { "type": "string",  "title": "Code",          "not_null": true,  "description": "Codigo del curso", "transformations": [{ "type": "trim" }] },
    "version":           { "type": "string",  "title": "Version",       "not_null": false, "description": "Cadena libre (ej: 'v2022-actual')" },
    "previousVersionId": { "type": "string",  "title": "Previous Version", "not_null": false, "description": "Self-FK a version anterior", "isForeignKey": true, "references": "Activity", "targetField": "id" },
    "recordType":        { "type": "string",  "title": "Record Type",   "not_null": false, "description": "Solo 'Course' segun Confluence", "static_default": "Course" },
    "description":       { "type": "string",  "title": "Description",   "not_null": false, "description": "Texto libre" },
    "credits":           { "type": "number",  "title": "Credits",       "not_null": false, "description": "Creditos academicos" },
    "programLevel":      { "type": "string",  "title": "Program Level", "not_null": false, "description": "Undergraduate / Postgraduate / ContinuingEducation / TechnicalProfessional — ver Q10 para casing" },
    "workflowState":     { "type": "string",  "title": "Workflow State","not_null": false, "description": "Valores conocidos: Draft, Review, Approved, Published, OpenForEdit, Deprecated, Active (legacy) — ver Q2" },
    "language":          { "type": "string",  "title": "Language",      "not_null": false, "description": "ISO 639-1", "static_default": "es" },
    "executionUnitId":   { "type": "string",  "title": "Execution Unit","not_null": false, "description": "FK a OrgUnit — POSTERGADO (DECISION-002)" },
    "externalId":        { "type": "string",  "title": "External ID",   "not_null": false, "description": "Identificador del sistema origen — ver Q1" }
  },
  "required": ["name", "code"]
}
```

**Decisiones por campo**:

| Campo | Icono | Razon | Fuente |
|-------|-------|-------|--------|
| `metadata.gender: "masculino"` | 💡 | "El programa de asignatura" — articulo masculino en español | Convencion AGENTS.md (gender obligatorio) |
| `name`, `code`, `description` | 📊 | Confirmados verbatim en legacy Univalle/AIEP | Univalle: `name="Ecuaciones Diferenciales"`, `code="111026C"` |
| `code` con `transformations: trim` | 💡 | Estandar up1 en campos texto | AGENTS.md (`Faculty.code` ejemplo similar) |
| `version` (string libre) | 📊📘 | Legacy: `"v2022-actual"`. Confluence: cadena libre | Univalle + AIEP |
| `previousVersionId` self-FK nullable | 📘 | "Cadena de versiones encadenadas" | Confluence LA + BR-VER-001 |
| `recordType` con `static_default: "Course"` | 📘📊 | Confluence dice solo "Course". Legacy lo confirma. **NO declarar enum** — Q5 abre la posibilidad de mas RTs | Confluence + legacy |
| `credits: number` | 📊 | Univalle: 3, AIEP: 5 | Legacy v2.2 |
| `programLevel` ❓⚠️ | ⚠️ | **Q10 abierta**: legacy usa `"Undergraduate"` PascalCase, codigo usa UPPER_SNAKE en otros enums. Modelado como `string` SIN enum hasta cerrar Q10 | Q10 |
| `workflowState` ❓⚠️ | ⚠️ | **Q2 abierta**: legacy `"Active"` no esta en el enum oficial de Confluence. Modelado como `string` libre hasta cerrar Q2 | Q2 |
| `language` con default `"es"` | 📊 | Legacy: ambos casos `"es"` | Univalle + AIEP |
| `executionUnitId` 🔒 | 🔒 | **Sin `isForeignKey`** — OrgUnit no existe en codigo. Postergado segun DECISION-002 | DECISION-002 |
| `externalId` ❓ | ❓ | **Q1 abierta**: 1 campo (legacy) vs 2 campos (interpretacion Confluence). Propuesta provisoria: 1 campo | Q1 |
| `id`, `createdAt`, `updatedAt` | 🛠️ | NO declarar — los inyecta `common.json` del framework | AGENTS.md regla no negociable |

---

### 2. `CurricularSection` — Polimorfica (objeto base)

**Archivo propuesto**: `up1/mods/curriculum-design/objects/CurricularSection.json`

> **Importante**: este es **solo el objeto base** con campos comunes. Los RecordTypes (`rt__Modality__...`, `rt__LearningOutcome__...`, etc.) NO se declaran en TICKET-006 — viven en TICKET-009.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CurricularSection",
  "type": "object",
  "metadata": {
    "label": "Sección curricular",
    "labelPlural": "Secciones curriculares",
    "gender": "femenina",
    "description": "Elemento estructural o complementario dentro de un documento curricular.",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "ownerType":        { "type": "string",  "title": "Owner Type",     "not_null": true,  "description": "Tipo del documento dueno: Activity u Offering — ver Q10 para casing" },
    "ownerId":          { "type": "string",  "title": "Owner",          "not_null": true,  "description": "ID del dueno segun ownerType. Sin FK directa (polimorfica)." },
    "recordType":       { "type": "string",  "title": "Record Type",    "not_null": true,  "description": "Discriminador. Valores conocidos: Modality, LearningOutcome, Session, EvaluationComponent, Content, Bibliography, CustomSection — ver Q13" },
    "sectionType":      { "type": "string",  "title": "Section Type",   "not_null": false, "description": "Structural o Complementary — ver Q10" },
    "name":             { "type": "string",  "title": "Name",           "not_null": true,  "description": "Nombre de la seccion" },
    "position":         { "type": "integer", "title": "Position",       "not_null": false, "description": "Orden visual" },
    "isVisible":        { "type": "boolean", "title": "Visible",        "not_null": false, "description": "Si la seccion se muestra en la UI", "static_default": "true" },
    "isRequired":       { "type": "boolean", "title": "Required",       "not_null": false, "description": "Si la seccion es obligatoria", "static_default": "false" },
    "isSynchronizable": { "type": "boolean", "title": "Synchronizable", "not_null": false, "description": "Controla herencia template→syllabus (BR-MIG-001)", "static_default": "true" },
    "sourceId":         { "type": "string",  "title": "Source",         "not_null": false, "description": "Trazabilidad MADS al template original" }
  },
  "required": ["ownerType", "ownerId", "recordType", "name"]
}
```

**Decisiones por campo**:

| Campo | Icono | Razon | Fuente |
|-------|-------|-------|--------|
| `metadata.gender: "femenina"` | 💡 | "La seccion" — femenino en español | Convencion AGENTS.md |
| `ownerType` ❓⚠️ | ⚠️ | **Q10 abierta**: enum cerrado con casing pendiente. Modelado como string libre. Valores del legacy: `"Activity"`, `"Offering"` | Q10 + Confluence + legacy |
| `ownerId` SIN `isForeignKey` | 🛠️ | Patron de FK polimorfica segun AGENTS.md: el `*Id` no declara `references` porque depende de `*Type`. **Primer caso real en up1** — sin precedente en Bases | AGENTS.md + verificacion en Bases |
| `recordType` ❓ | ❓ | **Q13 abierta**: enum cerrado vs string libre. Modelado como string libre. La validacion semantica es la presencia del archivo `rt__<value>__curricularsection.json` | Q13 |
| `sectionType` ❓⚠️ | ⚠️ | **Q10 abierta**: enum cerrado pendiente. Modelado como string. Valores legacy: `"Structural"`, `"Complementary"` | Q10 + legacy |
| `name`, `position` | 📊 | Verbatim del legacy en TODAS las secciones | Univalle + AIEP |
| `isVisible`, `isRequired`, `isSynchronizable` con default `"true"`/`"false"` | 📊🛠️ | Booleans con default como string segun AGENTS.md regla. Valores legacy verificados en TODOS los registros | AGENTS.md + legacy |
| `sourceId` | 📘 | Trazabilidad MADS — Confluence LA define el campo | Confluence + BR-MIG-001 |
| `workflowState` (NO declarar) | 📘📊 | **Q7**: heredar del padre Activity. Las 3 fuentes alineadas en NO modelar | Confluence + legacy + AGENTS.md |

---

### 3. `CurricularLink` — Vinculos pedagogicos internos

**Archivo propuesto**: `up1/mods/curriculum-design/objects/CurricularLink.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CurricularLink",
  "type": "object",
  "metadata": {
    "label": "Vínculo curricular",
    "labelPlural": "Vínculos curriculares",
    "gender": "masculino",
    "description": "Vinculo descriptivo interno entre dos CurricularSection del mismo documento curricular.",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "sourceSectionId": { "type": "string",  "title": "Source Section", "not_null": true,  "description": "Seccion origen del vinculo", "isForeignKey": true, "references": "CurricularSection", "targetField": "id" },
    "targetSectionId": { "type": "string",  "title": "Target Section", "not_null": true,  "description": "Seccion destino del vinculo (mismo owner que source)", "isForeignKey": true, "references": "CurricularSection", "targetField": "id" },
    "linkType":        { "type": "string",  "title": "Link Type",      "not_null": true,  "description": "Develops / Evaluates / Covers / Uses / Custom — ver Q10" },
    "notes":           { "type": "string",  "title": "Notes",          "not_null": false, "description": "Requerido si linkType=Custom" },
    "position":        { "type": "integer", "title": "Position",       "not_null": false, "description": "Orden" }
  },
  "required": ["sourceSectionId", "targetSectionId", "linkType"]
}
```

**Decisiones por campo**:

| Campo | Icono | Razon | Fuente |
|-------|-------|-------|--------|
| `metadata.gender: "masculino"` | 💡 | "El vinculo" | AGENTS.md |
| `sourceSectionId`, `targetSectionId` con FK estandar | 🛠️📘 | Patron de FK estandar segun AGENTS.md. Confluence: ambos apuntan a CurricularSection | AGENTS.md + Confluence |
| `linkType` ❓⚠️ | ⚠️ | **Q10 abierta**: casing pendiente. Valores legacy: `"Develops"`, `"Evaluates"`, `"Covers"`, `"Uses"`, `"Custom"` | Q10 + Confluence + legacy |
| `notes`, `position` | 📊 | Confirmados en legacy Univalle (3 links: `cl-uv-1124-q1-evaluates-ra1` con notas) | Univalle |

---

### 4. `BibliographyReference` — Catalogo bibliografico institucional

**Archivo propuesto**: `up1/mods/curriculum-design/objects/BibliographyReference.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BibliographyReference",
  "type": "object",
  "metadata": {
    "label": "Referencia bibliográfica",
    "labelPlural": "Referencias bibliográficas",
    "gender": "femenina",
    "description": "Entrada del catalogo institucional compartido de referencias bibliograficas.",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "institutionId":    { "type": "string",  "title": "Institution",     "not_null": true,  "description": "Institucion duena del catalogo", "isForeignKey": true, "references": "Institution", "targetField": "id" },
    "rawCitation":      { "type": "string",  "title": "Raw Citation",    "not_null": true,  "description": "Cita en texto, fallback universal" },
    "title":            { "type": "string",  "title": "Title",           "not_null": false, "description": "Titulo de la obra" },
    "author":           { "type": "string",  "title": "Author",          "not_null": false, "description": "Autores" },
    "year":             { "type": "integer", "title": "Year",            "not_null": false, "description": "Año de publicacion" },
    "publisher":        { "type": "string",  "title": "Publisher",       "not_null": false, "description": "Editorial" },
    "publicationPlace": { "type": "string",  "title": "Publication Place","not_null": false, "description": "Lugar de publicacion (legacy: 'Cali', 'Mexico')" },
    "edition":          { "type": "string",  "title": "Edition",         "not_null": false, "description": "Edicion (legacy: '3a reimpresion', '4a', '11a')" },
    "isbn":             { "type": "string",  "title": "ISBN",            "not_null": false, "description": "ISBN si aplica" },
    "doi":              { "type": "string",  "title": "DOI",             "not_null": false, "description": "DOI si aplica" },
    "url":              { "type": "string",  "title": "URL",             "not_null": false, "description": "URL si aplica" },
    "referenceFormat":  { "type": "string",  "title": "Reference Format","not_null": false, "description": "Valores conocidos: Book/Article/Website/Thesis/Chapter/ConferencePaper/Other/free-text — ver Q4" },
    "metadata":         { "type": "object",  "title": "Metadata",        "not_null": false, "description": "Campos institucionales adicionales", "static_default": "{}" }
  },
  "required": ["institutionId", "rawCitation"]
}
```

**Decisiones por campo**:

| Campo | Icono | Razon | Fuente |
|-------|-------|-------|--------|
| `metadata.gender: "femenina"` | 💡 | "La referencia" | AGENTS.md |
| `institutionId` FK a `Institution` | 🛠️ | Verificado: `Institution` existe en `up1/object-manager/objects/business/Base/institution.json` | Codigo |
| `rawCitation` requerido | 📘📊 | Confluence: "fallback universal, requerido siempre". Legacy: presente en 9/9 referencias Univalle | Confluence + legacy |
| `title`, `author`, `year`, `publisher`, `publicationPlace`, `edition`, `isbn`, `url` opcionales | 📊 | Confirmados en legacy Univalle. ISBN/DOI nullable porque varias referencias no lo tienen | Univalle 9 referencias |
| `referenceFormat` ❓⚠️ | ⚠️ | **Q4 abierta**: enum 7 valores Confluence, legacy usa `"free-text"` (no esta en el enum). Modelado como string libre. **Q10** tambien aplica al casing | Q4 + Q10 |
| `metadata: object` con default `"{}"` | 🛠️📘 | AGENTS.md regla: `static_default` SIEMPRE como string. Confluence: "campos institucionales adicionales" | AGENTS.md + Confluence |

---

### Resumen de campos con preguntas abiertas

| Objeto | Campo | Q | Estado |
|--------|-------|---|--------|
| `Activity` | `programLevel` | Q10 | ⚠️ casing |
| `Activity` | `workflowState` | Q2, Q10 | ❓⚠️ enum + casing + valor "Active" |
| `Activity` | `executionUnitId` | DECISION-002 | 🔒 postergado |
| `Activity` | `externalId` | Q1 | ❓ 1 vs 2 campos |
| `CurricularSection` | `ownerType` | Q10 | ⚠️ casing del enum |
| `CurricularSection` | `recordType` | Q13, Q10 | ❓⚠️ enum o libre + casing |
| `CurricularSection` | `sectionType` | Q10 | ⚠️ casing |
| `CurricularLink` | `linkType` | Q10 | ⚠️ casing |
| `BibliographyReference` | `referenceFormat` | Q4, Q10 | ❓⚠️ enum + casing + valor "free-text" |

**RecordTypes (fuera de TICKET-006)** — todos pendientes para TICKET-009 segun [Q11..Q14](#q11--qué-subset-de-recordtypes-entra-en-ticket-009-upone-1035):

- 7 RTs validados por legacy (Modality, LearningOutcome, Session, EvaluationComponent, Content, Bibliography, CustomSection)
- 4 RTs solo en Confluence sin datos legacy (Q5: ApprovalCondition, GeneralData, GraduationProfile, EntryProfile)

---

## Priorizacion: este sprint vs sprint futuro

### Criterios de importancia

Para cada pregunta, su **importancia** se evalua por sprint segun lo que la pregunta puede romper o bloquear:

| Nivel | Criterio este sprint | Criterio sprint futuro |
|-------|-------------|-------------|
| ⚪ **Nula** | Las 3 fuentes alineadas o tema fuera de scope este sprint | Modelo soporta el caso sin cambio; agregar despues no rompe nada |
| 🟢 **Baja** | Afecta detalle menor del modelado; facil de revertir; no impacta UI/seed visible | Refactor cosmetico; migracion idempotente y barata |
| 🟡 **Media** | Afecta caso especifico del seed o un layout chico; revertir requiere algun trabajo manual | Migracion media (clasificar registros, mapping manual) |
| 🔴 **Alta** | Afecta layouts visibles (UPONE-1034/1035), seed amplio, o convencion transversal | Migracion masiva o feature nueva grande (UI, ETL) |
| 🔴⚠️ **Critica** | Bloquea entrega de este sprint (no aplica a ninguna Q actual) | **Bloquea capability futura entera** (no se puede iniciar sin la respuesta) |

### Tabla maestra de priorizacion

| Q | Tema | Este sprint | Sprint futuro | Por que |
|---|------|----|-----|---------|
| Q1 | externalId 1 vs 2 campos | 🟢 Baja | 🟢 Baja | Modelado funciona con cualquiera. Importa solo cuando se haga import desde SIS. |
| **Q2** | workflowState valores y casing | 🔴 **Alta** | 🔴⚠️ **Critica** | Este sprint: el filtro "Estado" del UPONE-1034 muestra valores ambiguos. Sprint futuro: **bloquea CAP-CUR-019 (workflow)**. |
| Q3 | CustomSection 1 vs N | 🟢 Baja | 🔴⚠️ **Critica** | Este sprint: 1 RT generico funciona con seed Univalle. Sprint futuro: **bloquea CAP-CUR-013 (config institucional)**. |
| Q4 | referenceFormat enum | 🟢 Baja | 🟢 Baja | Solo afecta filtros y reportes futuros. Sin enum estricto, todo carga. |
| Q5 | 4 RTs no validados | 🟡 Media | 🔴 Alta | Este sprint: caso "Habilitacion" Univalle es ambiguo (Session vs ApprovalCondition). Sprint futuro: cada RT requiere UI/formulario nuevo. |
| Q6 | LOs derivados AIEP | ⚪ Nula | 🔴 Alta | Este sprint: migracion fuera de scope. Sprint futuro: bloquea migracion legacy AIEP cuando se priorice. |
| Q7 | workflowState sub-objetos | ⚪ Nula | 🟢 Baja | 3 fuentes alineadas (no modelar). Si llega caso real, agregar columna nullable es retrocompatible. |
| Q8 | Bibliography AIEP | ⚪ Nula | 🟢 Baja | Modelo soporta cero o N. Sin restriccion. ETL si aplica en sprint futuro. |
| Q9 | Modality >= 1 | 🟢 Baja | 🔴 Alta | Este sprint: seed cumple naturalmente. Sprint futuro: validacion critica para transiciones de workflow. |
| **Q10** | Casing enums | 🔴 **Alta** | 🔴⚠️ **Critica** | Este sprint: **transversal — afecta TODOS los enums del modulo**. Sprint futuro: si se decide cambiar, migracion masiva (seeds + layouts + APIs). |
| Q11 | Subset RTs en TICKET-009 | 🟡 Media | 🟢 Baja | Define scope de TICKET-009. Sin claridad: sobre/sub-modelar. Migracion futura: archivo nuevo. |
| Q12 | Cuando carga seed completo | 🟢 Baja | ⚪ Nula | Decision de implementacion. Sin retrabajo. |
| Q13 | recordType enum o libre | 🟡 Media | 🟢 Baja | Si plataforma valida vs archivos RT: posible problema con strings sin RT. Vale verificar. |
| Q14 | RTs no cubiertos en UPONE-1035 | 🟡 Media | 🟢 Baja | Define UI visible del detail Univalle. Si solo 3 RTs: detail "incompleto" con SEM 18, EvaluationComponent. |

### Resumen ejecutivo de priorizacion

**Importantes para ESTE sprint (resolver antes de cerrar el modelo este sprint)**:
- 🔴 **Q2** — `workflowState`: el seed tiene `"Active"` que no esta en el enum oficial. Sin resolver, el filtro Estado del UPONE-1034 muestra valores ambiguos.
- 🔴 **Q10** — Casing enums: es **transversal**. Si modelamos PascalCase ahora y luego se decide UPPER_SNAKE, hay que migrar TODO (seeds + layouts + descripciones + formularios).
- 🟡 **Q5** (parcial) — el caso "Habilitacion" Univalle: necesitamos saber si es `Session` o `ApprovalCondition` para no modelar mal el seed.

**Importantes para el SPRINT FUTURO (resolver antes de iniciar capabilities futuras)**:
- 🔴⚠️ **Q2 + Q9 + Q10** — bloquean **CAP-CUR-019 (workflow del programa)**: sin enum cerrado no hay transiciones.
- 🔴⚠️ **Q3** — bloquea **CAP-CUR-013 (configuracion estructura institucional)**: sin saber si N RTs custom o 1 generico no hay UI Super Admin.
- 🔴 **Q6 + Q8** — bloquean **ETL migracion legacy AIEP**: sin definir el patron no se puede mapear.
- 🔴 **Q5** — cada RT que se agregue (ApprovalCondition, GeneralData, GraduationProfile, EntryProfile) requiere formularios nuevos.

**No urgentes (resolver cuando llegue caso real)**:
- ⚪ Q1, Q4, Q7, Q8 — alineadas o sin impacto inmediato.

### Recomendacion de orden para preguntar al equipo

> **19 preguntas en total**: Q1..Q14 (modelo/schema) + T1..T5 (multi-tenancy). T1 ya esta confirmada en DECISION-003.

| # | Pregunta | Por que primero |
|---|----------|----------------|
| 1 | **Q10** (casing) | Transversal — afecta como modelamos TODOS los demas enums en este sprint. Confirmar antes de nada. |
| 2 | **Q2** (workflowState valores) | Junto con Q10. Define el seed visible en UPONE-1034. |
| 3 | **Q11 + T3** (subset RTs Univalle/AIEP) | Define scope de TICKET-009. Univalle (6 RTs) vs AIEP (3-4 RTs) — ¿quien priorizamos? |
| 4 | **Q5** (Habilitacion ¿Session o ApprovalCondition?) | Puede afectar el seed Univalle de este sprint. |
| 5 | **T2** (RTs globales vs per-tenant) | Define donde viven los archivos RT en TICKET-009 |
| 6 | Q3 | Bloquea CAP-CUR-013 en sprint futuro. Puede esperar. |
| 7 | T5 (Extensions Univalle/AIEP) | Solo si llega caso concreto — sin info no se modela |
| 8 | Q6, Q8 | Importantes solo cuando se priorice migracion AIEP. |
| 9 | Q1, Q4, Q7, Q9, Q12, Q13, Q14, T4 | Pueden esperar — no bloquean ni afectan visible. |

---

## Q1 — Identificador externo: ¿1 o 2 campos?

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `Activity` | `externalId` (o `externalSystemId` + `externalRecordId`) | Estructura del schema: 1 o 2 columnas |

### Contexto
Los programas pueden importarse desde sistemas externos (Banner, Anthology). Necesitan trazar su origen para sincronizacion idempotente.

### 1. Confluence Learning Assurance dice
"Toda entidad lleva un identificador del sistema de origen [...] El formato del identificador **puede ser compuesto** (ej: codigo de programa + codigo de periodo para Banner). El identificador permite sincronizacion idempotente: si el registro ya existe, se actualiza; si no, se crea."

→ **Ambiguo**: no especifica si "compuesto" es un solo campo string concatenado o dos campos separados.

### 2. Formato — Confluence up1 + codigo
| Fuente | Que dice |
|--------|---------|
| Confluence up1 (CLAUDE.md, AGENTS.md) | No menciona el patron `externalId` especificamente |
| Codigo (`Base/*.json`) | **Ningun Base actual** tiene `externalId`, `externalSystemId` ni `externalRecordId`. Patron nuevo. |

→ **Sin precedente en codigo**. Decision queda libre.

### 3. Discrepancias del legacy

| Aspecto | Legacy v2.2 | Confluence LA | Conversion |
|---------|-------------|---------------|-----------|
| Cantidad de campos | 1 (`externalId` string) | Ambiguo | — |
| Formato | String simple (`"1124"`, `"TIR101"`) | "Compuesto" sin definir | — |
| Compatible con A | ✅ Si | ✅ Si | Cero |
| Compatible con B (2 campos) | ❌ No | ✅ Si | `SPLIT_PART(externalId, ':', 1)` |

### 4. Ejemplo del campo en cada lente

**Segun Confluence Learning Assurance** (interpretacion ambigua):
```json
// Opcion A — un campo, valor compuesto en string
"externalId": {
  "type": "string",
  "title": "External ID",
  "description": "Identificador del sistema de origen. Puede ser compuesto (ej: 'BANNER:CODE-2024-1')."
}
```
o
```json
// Opcion B — dos campos
"externalSystemId": { "type": "string", "title": "External System" },
"externalRecordId": { "type": "string", "title": "External Record ID" }
```

**Segun formato up1 (codigo)**: NO hay precedente. Cualquier de las dos formas es valida segun convencion general.

**Segun legacy v2.2**:
```json
// Univalle
{ "externalId": "1124" }

// AIEP
{ "externalId": "TIR101" }
```

### 5. Preguntas a resolver con el equipo

> ❓ **¿El modelo final usa un campo `externalId` o dos campos `externalSystemId` + `externalRecordId`?**
>
> ❓ Si el equipo prefiere "compuesto en string", ¿se establece un separador convencional (`:`, `|`, etc.)?

### Via posible respaldada (a confirmar)

Sin respaldo de codigo (no hay precedente). Legacy v2.2 muestra 1 campo y Confluence permite ambas. **No hay via dominante**.

### Soluciones detalladas — JSON Schema en formato up1

**Opcion A (1 campo) — propuesta este sprint**:
```json
"externalId": {
  "type": "string",
  "title": "External ID",
  "not_null": false,
  "description": "Identificador del sistema origen (Banner/Anthology). Puede ser compuesto en string (ej: 'BANNER:CODE-2024-1' separado por ':')."
}
```

**Opcion B (2 campos)**:
```json
"externalSystemId": {
  "type": "string",
  "title": "External System",
  "not_null": false,
  "description": "Sistema externo origen (BANNER, ANTHOLOGY, etc.).",
  "transformations": [{ "type": "uppercase" }]
},
"externalRecordId": {
  "type": "string",
  "title": "External Record ID",
  "not_null": false,
  "description": "Identificador del registro en el sistema externo."
}
```

### Migracion futura A → B (si se decide)

```sql
-- Migration idempotente
ALTER TABLE academic_activity
  ADD COLUMN external_system_id VARCHAR(50),
  ADD COLUMN external_record_id VARCHAR(255);

-- Caso compuesto con separador
UPDATE academic_activity
   SET external_system_id = SPLIT_PART(external_id, ':', 1),
       external_record_id = SPLIT_PART(external_id, ':', 2)
 WHERE external_id LIKE '%:%';

-- Caso simple sin separador (Univalle "1124", AIEP "TIR101")
UPDATE academic_activity
   SET external_record_id = external_id
 WHERE external_id NOT LIKE '%:%' AND external_record_id IS NULL;

-- Drop columna vieja despues de validar
ALTER TABLE academic_activity DROP COLUMN external_id;
```

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Modelar 1 campo `externalId` (string nullable) **siguiendo el legacy v2.2 hasta confirmar**. Documentar como provisorio. Seed Univalle: `"1124"`. Seed AIEP: `"TIR101"`. |
| **Sprint futuro si decide A (1 campo)** | Confirmar lo modelado. Cero refactor. |
| **Sprint futuro si decide B (2 campos)** | Migration: agregar `externalSystemId` + parsear el string actual. Refactor de seed. Costo bajo si se hace antes de produccion. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | El campo se modela igual con cualquiera de las opciones (1 campo string es subset de B). No bloquea modelado, listado ni detalle. |
| **Sprint futuro** | 🟢 Baja | Solo cobra importancia cuando se implemente import outbound a SIS (fuera de este sprint y sprint futuro inmediato). Migracion idempotente y barata. |

---

## Q2 — `workflowState`: valores y casing del enum

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `Activity` | `workflowState` | Enum cerrado vs string libre. Casing del valor. Mapping de `"Active"` legacy. |

### Contexto
`workflowState` controla todo el ciclo de vida del programa: aprobacion, publicacion, herencia MADS al syllabus.

### 1. Confluence Learning Assurance dice
Enum con **6 valores en PascalCase**: `Draft`, `Review`, `Approved`, `Published`, `OpenForEdit`, `Deprecated`.

### 2. Formato — Confluence up1 + codigo

| Fuente | Que dice |
|--------|---------|
| AGENTS.md | "Convencion en el core: **UPPER_SNAKE_CASE** para valores enum". |
| Codigo (verificado en 5+ Bases) | **Todos los enums son UPPER_SNAKE**. |

**Citas verbatim del codigo:**
```json
// Base/csenrollment.json
"enum": ["ENROLLED", "COMPLETED", "DROPPED"]

// Base/csstudent.json y Base/hwassessment.json
"enum": ["LOW", "MEDIUM", "HIGH"]

// Base/hwfactor.json
"enum": ["ACADEMIC", "ATTENDANCE", "ENGAGEMENT"]

// Base/hwintervention.json
"enum": ["ACADEMIC_ADVISING", "TUTORING", "COUNSELING"]
"enum": ["SCHEDULED", "IN_PROGRESS", "COMPLETED"]
```

→ **Codigo es consistente en UPPER_SNAKE_CASE**. PascalCase NO aparece en ningun enum de Base.

### 3. Discrepancias del legacy

| Aspecto | Legacy v2.2 | Confluence LA | Codigo up1 | Conversion necesaria |
|---------|-------------|---------------|-----------|---------------------|
| Casing | PascalCase | PascalCase | UPPER_SNAKE | **Si — convertir todos los valores** |
| Valores presentes | `"Active"` | `Draft`, `Review`, `Approved`, `Published`, `OpenForEdit`, `Deprecated` | (codigo no define el enum del programa todavia) | **`"Active"` no esta en el enum oficial** |
| Mapping | — | — | — | **Indefinido** — pregunta abierta |

### 4. Ejemplo del campo en cada lente

**Segun Confluence Learning Assurance**:
```json
"workflowState": {
  "type": "string",
  "title": "Workflow State",
  "enum": ["Draft", "Review", "Approved", "Published", "OpenForEdit", "Deprecated"]
}
```

**Segun formato up1 (codigo) — propuesta a confirmar**:
```json
"workflowState": {
  "type": "string",
  "title": "Workflow State",
  "enum": ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "OPEN_FOR_EDIT", "DEPRECATED"]
}
```

**Segun legacy v2.2 (lo que tenemos)**:
```json
{ "workflowState": "Active" }   // Univalle Y AIEP
```

**Diferencia clave**: legacy usa `"Active"`, que no esta en el enum oficial de Confluence ni en cualquiera de sus posibles formas codificadas. Casing tambien es distinto al codigo.

### 5. Preguntas a resolver con el equipo

> ❓ **¿`"Active"` se mapea a cual de los 6 valores del enum oficial?**
> Posibilidades:
> - (a) `"Active"` → `"PUBLISHED"` — programa vigente, publicado
> - (b) `"Active"` → `"APPROVED"` — programa aprobado, no necesariamente publicado
> - (c) `"Active"` es un septimo valor del enum (ampliar a 7)
> - (d) `"Active"` viene del legacy y se elimina al migrar (no usado en up1)
>
> ❓ **¿Confirmamos UPPER_SNAKE_CASE como casing del enum?** Es lo que dicen AGENTS.md y todos los Bases del core. Si si: convertir los 6 valores a UPPER_SNAKE.

### Via posible respaldada (a confirmar)

**UPPER_SNAKE_CASE**: respaldado por **5 Bases del core** + AGENTS.md. Vale registrarlo como propuesta tecnica fuerte. **El mapping de `"Active"` queda como pregunta abierta**.

### Soluciones detalladas — JSON Schema en formato up1

**Postura este sprint (provisorio)** — string SIN enum:
```json
"workflowState": {
  "type": "string",
  "title": "Workflow State",
  "not_null": false,
  "description": "Estados conocidos: Draft, Review, Approved, Published, OpenForEdit, Deprecated, Active (legacy). Enum cerrado pendiente — ver Q2.",
  "static_default": "Draft"
}
```

**Solucion futura A — Enum 6 valores Confluence con UPPER_SNAKE**:
```json
"workflowState": {
  "type": "string",
  "title": "Workflow State",
  "not_null": true,
  "enum": ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "OPEN_FOR_EDIT", "DEPRECATED"],
  "static_default": "DRAFT"
}
```

**Solucion futura B — Enum 7 valores (incluye Active)**:
```json
"enum": ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "OPEN_FOR_EDIT", "DEPRECATED", "ACTIVE"]
```

### Citas verbatim del codigo (Bases reales)

```json
// up1/object-manager/objects/business/Base/hwintervention.json
"status": {
  "type": "string",
  "title": "Status",
  "enum": ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  "static_default": "SCHEDULED"
}
// → Patron de "estado/workflow" en up1: UPPER_SNAKE_CASE + static_default como string
```

### Mapping del legacy (ejemplos por opcion)

```js
// Si se decide A (mapeo "Active" → "PUBLISHED")
const enumMapping = {
  "Active": "PUBLISHED"  // hipotesis (a) — pendiente confirmar
};
// Migration:
// UPDATE academic_activity SET workflow_state = 'PUBLISHED' WHERE workflow_state = 'Active';

// Si se decide B (extender enum a 7)
const enumMapping = {
  "Active": "ACTIVE"  // mapping idempotente uppercase
};
// Migration:
// UPDATE academic_activity SET workflow_state = UPPER(workflow_state);
```

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Modelar `workflowState` como `string` SIN `enum`. Listar valores conocidos en `description`. Seed: `"Active"` (legacy textual). NO implementar transiciones (capability futura). NO bloquear cargas. |
| **Sprint futuro si confirma UPPER_SNAKE (sin Active)** | Migration: `UPDATE ... SET workflowState = 'PUBLISHED' WHERE workflowState = 'Active'` (suponiendo mapping a → PUBLISHED). Costo bajo. |
| **Sprint futuro si extiende a 7 valores con Active** | Solo agregar `enum` al schema con `"ACTIVE"` extra. Sin migracion de datos. |
| **Sprint futuro si decide PascalCase** | Inconsistencia con todos los Bases del core. Costo: rompe convencion de plataforma. |
| **Bloqueo** | La capability futura de **workflow del programa (CAP-CUR-019)** no se puede implementar hasta cerrar Q2 — sin enum no hay transiciones. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🔴 **Alta** | El UPONE-1034 (vista listado) tiene un filtro **"Estado"**. Si modelamos como string libre y el seed lleva `"Active"`, el filtro mostrara `"Active"` como unica opcion conocida. Cuando se aclare el enum oficial hay que actualizar **seed + layout + descripciones**. Conviene resolver antes de cerrar el modelo este sprint. |
| **Sprint futuro** | 🔴⚠️ **Critica** | **Bloquea CAP-CUR-019** (workflow del programa). Sin enum cerrado no hay transiciones. La validacion `Modality >= 1` (Q9) tambien depende de esto. |

---

## Q3 — RecordType `CustomSection`: ¿1 RT fijo o N customizables?

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` (objeto base) | `recordType` (string discriminador) | Si N RTs custom: el discriminador acepta nombres dinamicos por institucion. |
| RT `CustomSection` (futuro `rt__CustomSection__curricularsection.json`) | `contentType`, `content`, `maxLength` | 1 archivo generico vs N archivos por tipo. |

### Contexto
La configuracion institucional permite secciones libres del programa (Metodologia, Politicas, etc.). Pregunta: ¿un RT generico que admite cualquier contenido, o N RTs especificos declarados por el Super Admin?

### 1. Confluence Learning Assurance dice
"Secciones complementarias **custom** — Permitir a la institucion agregar secciones libres (metodologia, politicas, etc.). El Super Admin define que secciones tiene el programa en su institucion."

→ Plural ("secciones complementarias **custom**") sugiere multiples RTs. Pero el patron tecnico no se especifica.

### 2. Formato — Confluence up1 + codigo

| Fuente | Que dice |
|--------|---------|
| Confluence up1 (CAP-CUR-013) | "Configuracion de estructura institucional" — Super Admin define que secciones existen. |
| AGENTS.md | El patron de RecordTypes permite RTs especificos por archivo. |
| Codigo (`object-manager/objects/business/RecordTypes/`) | **Solo existe 1 RT: `rt__Student__core_user.json`**. Sin precedente de RTs custom dinamicos por institucion. |

→ **El mecanismo dinamico (Super Admin define RTs en runtime) no esta implementado**. La plataforma RecordTypes (UPONE-938..947) soporta RTs declarados como archivos JSON.

### 3. Discrepancias del legacy

| Aspecto | Legacy v2.2 (Univalle) | Confluence LA | Conversion |
|---------|------------------------|---------------|-----------|
| Cantidad de RTs custom | 1 (`CustomSection`) | Plural sugerido | — |
| Como se diferencian las secciones | Por `name` ("Descripcion extendida", "Temario detallado") | Por RT propio (sugerido) | Si N RTs: crear `rt__Methodology__...` y mover registro |
| Campos | `contentType`, `content`, `maxLength` | No especificado | — |

### 4. Ejemplo en cada lente

**Segun Confluence Learning Assurance** (interpretacion plural):
```
mods/curriculum-design/RecordTypes/  o  object-manager/objects/business/RecordTypes/
├── rt__Methodology__curricularsection.json       (campos: contenido educativo, framework)
├── rt__Policies__curricularsection.json          (campos: regulaciones, normativas)
├── rt__GeneralData__curricularsection.json       (campos: metadata institucional)
└── (...N por institucion via Super Admin...)
```

**Segun formato up1 (codigo)** — patron actual: 1 RT generico declarado:
```json
// rt__CustomSection__curricularsection.json
{
  "title": "CustomSection",
  "baseObject": "CurricularSection",
  "metadata": {
    "label": "Seccion personalizada",
    "labelPlural": "Secciones personalizadas",
    "description": "Seccion complementaria con contenido libre"
  },
  "properties": {
    "contentType": {
      "type": "string",
      "title": "Content Type",
      "enum": ["RICH_TEXT", "MARKDOWN", "HTML"]   // propuesta UPPER_SNAKE; ver Q10
    },
    "content": { "type": "string", "title": "Content" },
    "maxLength": { "type": "integer", "title": "Max Length" }
  }
}
```

**Segun legacy v2.2 (Univalle)**:
```json
[
  {
    "id": "cs-uv-1124-cs-desc",
    "recordType": "CustomSection",
    "name": "Descripción extendida del curso",
    "contentType": "richText",            // ← camelCase, no PascalCase ni UPPER_SNAKE (Q10)
    "content": "<p>El propósito de este curso...</p>",
    "maxLength": null
  },
  {
    "id": "cs-uv-1124-cs-temario",
    "recordType": "CustomSection",
    "name": "Temario detallado",
    "contentType": "richText",
    "content": "1. Ecuaciones...",
    "maxLength": null
  }
]
```

**Diferencia clave**:
- Legacy diferencia las 2 secciones solo por `name`, mismo `recordType`.
- Confluence sugiere 2 RTs distintos (un RT por tipo de seccion).
- Codigo no tiene mecanismo para RTs custom dinamicos por institucion todavia.

### 5. Preguntas a resolver con el equipo

> ❓ **¿El modelo final tiene 1 RT generico `CustomSection` (parametrizable por `name`) o N RTs custom declarados por institucion?**
>
> ❓ Si N RTs: ¿como se declaran? ¿File-based (Super Admin commitea archivos) o runtime (Super Admin en UI los crea)?
>
> ❓ ¿`contentType: "richText"` del legacy se convierte a `"RICH_TEXT"`? Es camelCase y no encaja con ninguna convencion del codigo.

### Via posible respaldada (a confirmar)

**1 RT generico para este sprint**: respaldado por (a) el legacy v2.2, (b) ausencia de precedente para RTs dinamicos en codigo. Si el equipo confirma N RTs, se migran post-este-sprint.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Crear 1 archivo `rt__CustomSection__curricularsection.json`. Seed Univalle: 2 instancias diferenciadas por `name`. Documentar como provisorio. |
| **Sprint futuro si confirma 1 RT** | Sin migracion. |
| **Sprint futuro si decide N RTs custom** | Por cada `name` distinto: crear `rt__<Name>__curricularsection.json`. Migrar registros legacy al nuevo RT. **Bloquea CAP-CUR-013** (config institucional) hasta que se defina. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | 1 RT generico funciona perfecto con el seed Univalle (2 instancias por `name`). Decision facil de revertir. |
| **Sprint futuro** | 🔴⚠️ **Critica** | **Bloquea CAP-CUR-013** (configuracion estructura institucional). Sin saber si N RTs custom o 1 generico, no se puede iniciar la UI Super Admin. La migracion (1 RT → N RTs) es trabajo medio: por cada `name` distinto crear archivo + mover registros + ajustar formularios. |

---

## Q4 — `referenceFormat` en `BibliographyReference`: ¿enum o cadena libre?

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `BibliographyReference` (catalogo) | `referenceFormat` | Enum cerrado vs string libre. Aceptacion de `"free-text"` legacy. |

### Contexto
El catalogo bibliografico institucional puede tener cientos de referencias (libros, articulos, sitios web, etc.). Si el formato es enum cerrado, se puede filtrar y reportar; si es libre, la riqueza esta en `rawCitation` pero pierde estructura.

### 1. Confluence Learning Assurance dice
Enum con **7 valores en PascalCase**: `Book`, `Article`, `Website`, `Thesis`, `Chapter`, `ConferencePaper`, `Other`.

### 2. Formato — Confluence up1 + codigo

| Fuente | Que dice |
|--------|---------|
| AGENTS.md | UPPER_SNAKE_CASE para enums. |
| Codigo (Bases verificados) | UPPER_SNAKE_CASE en todos los enums (ver hallazgos al inicio). |

→ **Codigo gana con UPPER_SNAKE**. Convencion uniforme.

### 3. Discrepancias del legacy

| Aspecto | Legacy v2.2 (9 referencias Univalle) | Confluence LA | Conversion |
|---------|--------------------------------------|---------------|-----------|
| Casing | PascalCase no aplica — usa `"free-text"` (camelCase con guion) | PascalCase 7 valores | **Si** — convertir formato + casing |
| Valor `"free-text"` | Presente en 9 de 9 referencias | NO esta en el enum | **Indefinido** — ¿se elimina o queda como 8vo valor "FREE_TEXT"? |

### 4. Ejemplo en cada lente

**Segun Confluence Learning Assurance**:
```json
"referenceFormat": {
  "type": "string",
  "title": "Reference Format",
  "enum": ["Book", "Article", "Website", "Thesis", "Chapter", "ConferencePaper", "Other"]
}
```

**Segun formato up1 (codigo) — propuesta a confirmar**:
```json
"referenceFormat": {
  "type": "string",
  "title": "Reference Format",
  "enum": ["BOOK", "ARTICLE", "WEBSITE", "THESIS", "CHAPTER", "CONFERENCE_PAPER", "OTHER"]
}
```

**Segun legacy v2.2 (las 9 referencias Univalle)**:
```json
{
  "id": "br-uv-1",
  "title": "Ecuaciones diferenciales para estudiantes...",
  "author": "G. Calderón, J. Arango, A. Gómez",
  "referenceFormat": "free-text",       // ← NO esta en el enum, casing inconsistente
  "rawCitation": "G. Calderón, J. Arango y A. Gómez, ..."
}
```

**Diferencia clave**:
- Legacy usa `"free-text"` literal en TODOS los registros — sugiere "no clasificado / fuente cruda".
- Confluence no contempla ese estado.
- Casing tambien difiere: `"free-text"` no es PascalCase ni UPPER_SNAKE.

### 5. Preguntas a resolver con el equipo

> ❓ **¿`"free-text"` es un valor adicional del enum (el 8vo) que indica "fuente cruda sin clasificar"?**
> O alternativamente:
> - (a) Se elimina al cargar — cada referencia se reclasifica a uno de los 7 valores
> - (b) Se mantiene como 8vo valor `"FREE_TEXT"`
> - (c) El campo no es enum sino cadena libre (cualquier valor pasa)
>
> ❓ Si se mantiene como 8vo: ¿`"free-text"` → `"FREE_TEXT"` (UPPER_SNAKE conversion)?

### Via posible respaldada (a confirmar)

**UPPER_SNAKE_CASE para los 7 valores**: respaldado por codigo (5+ Bases) + AGENTS.md. **El destino de `"free-text"` queda abierto**.

### Soluciones detalladas — JSON Schema en formato up1

**Postura este sprint (provisorio)** — string SIN enum (acepta legacy):
```json
"referenceFormat": {
  "type": "string",
  "title": "Reference Format",
  "not_null": false,
  "description": "Valores conocidos: Book, Article, Website, Thesis, Chapter, ConferencePaper, Other, free-text (legacy). Enum cerrado pendiente — ver Q4."
}
```

**Solucion futura A — Enum estricto 7 valores (Confluence + UPPER_SNAKE)**:
```json
"referenceFormat": {
  "type": "string",
  "title": "Reference Format",
  "not_null": true,
  "enum": ["BOOK", "ARTICLE", "WEBSITE", "THESIS", "CHAPTER", "CONFERENCE_PAPER", "OTHER"],
  "static_default": "OTHER"
}
```

**Solucion futura B — Enum extendido 8 valores (incluye free-text legacy)**:
```json
"referenceFormat": {
  "type": "string",
  "title": "Reference Format",
  "not_null": false,
  "enum": ["BOOK", "ARTICLE", "WEBSITE", "THESIS", "CHAPTER", "CONFERENCE_PAPER", "OTHER", "FREE_TEXT"],
  "static_default": "FREE_TEXT"
}
```

**Solucion futura D — Enum + flag `isLegacyImport` separado**:
```json
"referenceFormat": {
  "type": "string",
  "enum": ["BOOK", "ARTICLE", "WEBSITE", "THESIS", "CHAPTER", "CONFERENCE_PAPER", "OTHER"],
  "not_null": true
},
"isLegacyImport": {
  "type": "boolean",
  "title": "Is Legacy Import",
  "static_default": "false",
  "description": "Indica si fue importada del legacy sin clasificacion previa."
}
```

### Reclasificacion de las 9 referencias Univalle (si A o D)

```js
// Las 9 referencias del legacy Univalle, clasificadas manualmente:
const reclasificacion = {
  "br-uv-1": "BOOK",       // Calderón, Arango, Gómez (2018) — texto académico
  "br-uv-2": "BOOK",       // Blanchard, Devaney, Hall (1999)
  "br-uv-3": "BOOK",       // Boyce, DiPrima (2005)
  "br-uv-4": "BOOK",       // Braun (1990)
  "br-uv-5": "BOOK",       // Simmons (1993)
  "br-uv-6": "BOOK",       // Simmons (2007)
  "br-uv-7": "BOOK",       // Trench (2013) Trinity University — abierto pero libro
  "br-uv-8": "BOOK",       // Zill (2017)
  "br-uv-9": "WEBSITE"     // Recursos online Khan/YouTube/Matefacil
};

// Migration SQL (opcion A):
// UPDATE bibliography_reference SET reference_format = 'BOOK' WHERE id IN ('br-uv-1', ...);
// UPDATE bibliography_reference SET reference_format = 'WEBSITE' WHERE id = 'br-uv-9';
```

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Modelar `referenceFormat` como `string` SIN `enum` — acepta `"free-text"` legacy. Listar valores conocidos en `description`. Seed Univalle: 9 con `"free-text"`. AIEP no aplica. |
| **Sprint futuro si decide enum estricto sin free-text** | Clasificar las 9 referencias Univalle a uno de los 7 valores. Trabajo manual o IA. Costo bajo-medio. |
| **Sprint futuro si decide enum extendido con FREE_TEXT** | Solo agregar el valor al enum. Conversion mecanica de seed. Costo casi nulo. |
| **Sprint futuro si decide cadena libre** | Sin cambio en sprint futuro. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | String libre acepta `"free-text"`. UI muestra el valor tal cual. No hay filtros por formato en este sprint. |
| **Sprint futuro** | 🟢 Baja | Si decide enum estricto: clasificar 9 referencias Univalle es trabajo manual chico (o IA-asistido). No bloquea capabilities futuras criticas. |

---

## Q5 — RecordTypes mencionados en Confluence pero NO en legacy

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` (objeto base) | `recordType` (valores aceptados) | Permite o no `"ApprovalCondition"`, `"GeneralData"`, `"GraduationProfile"`, `"EntryProfile"` como valores |
| Futuro `rt__ApprovalCondition__curricularsection.json` | `conditionType`, `threshold`, `unit` | Modelar o no este RT |
| Futuro `rt__GeneralData__...`, `rt__GraduationProfile__...`, `rt__EntryProfile__...` | (sin campos definidos en Confluence) | Modelar o no — sin info suficiente |
| Caso "Habilitacion" Univalle | RT `Session` vs RT `ApprovalCondition` | Como se modela la SEM 18 del seed |

### Contexto
Confluence Learning Assurance lista 4 RecordTypes que **no aparecen** en los datos reales de los ejemplos legacy (ni Univalle ni AIEP los usan).

### 1. Confluence Learning Assurance dice

| RecordType | Categoria | Campos especificos en Confluence |
|-----------|-----------|---------------------------------|
| `ApprovalCondition` | Structural | `conditionType` (MinAttendance/MinGrade/Custom), `threshold` (numero), `unit` (string) |
| `GeneralData` | Structural | **Sin campos especificados** |
| `GraduationProfile` | Complementaria institucional | **Sin campos especificados** |
| `EntryProfile` | Complementaria institucional | **Sin campos especificados** |

### 2. Formato — Confluence up1 + codigo

| Fuente | Que dice |
|--------|---------|
| Codigo (RecordTypes) | Solo 1 RT existente (`rt__Student__core_user.json`). Sin precedente para los 4 RTs en cuestion. |

### 3. Discrepancias del legacy

| RT | Legacy v2.2 | Observacion |
|----|-------------|-------------|
| `ApprovalCondition` | NO aparece. Univalle modela "Habilitacion" (SEM 18) como `Session` | Caso candidato a ser ApprovalCondition? |
| `GeneralData` | NO aparece | ¿Existe en otra version del modelo? |
| `GraduationProfile` | NO aparece | Probablemente aplica a planes, no a programas |
| `EntryProfile` | NO aparece | Mismo dilema |

### 4. Ejemplo en cada lente — caso `ApprovalCondition`

**Segun Confluence Learning Assurance**:
```json
// rt__ApprovalCondition__curricularsection.json (propuesta)
{
  "title": "ApprovalCondition",
  "baseObject": "CurricularSection",
  "properties": {
    "conditionType": {
      "type": "string",
      "title": "Condition Type",
      "enum": ["MinAttendance", "MinGrade", "Custom"]   // PascalCase segun Confluence
    },
    "threshold": { "type": "number", "title": "Threshold" },
    "unit": { "type": "string", "title": "Unit" }
  }
}
```

**Segun formato up1 (codigo) — propuesta a confirmar**:
```json
{
  "title": "ApprovalCondition",
  "baseObject": "CurricularSection",
  "metadata": {
    "label": "Condicion de aprobacion",
    "labelPlural": "Condiciones de aprobacion",
    "gender": "femenina"
  },
  "properties": {
    "conditionType": {
      "type": "string",
      "title": "Condition Type",
      "enum": ["MIN_ATTENDANCE", "MIN_GRADE", "CUSTOM"]   // UPPER_SNAKE segun codigo
    },
    "threshold": { "type": "number", "title": "Threshold" },
    "unit": { "type": "string", "title": "Unit" }
  }
}
```

**Segun legacy v2.2 (Univalle)**:
```json
// La "Habilitacion" se modela como Session, no como ApprovalCondition:
{
  "id": "cs-uv-1124-ses-18",
  "recordType": "Session",                  // ← Session, no ApprovalCondition
  "name": "SEM 18",
  "week": 18,
  "activityDescription": "Habilitación.",
  "isRequired": false
}
```

**Diferencia clave**: Confluence dice que ApprovalCondition es un RT propio. Legacy lo modela como Session. ¿Es error del legacy o son conceptos distintos?

### 5. Preguntas a resolver con el equipo

> ❓ **¿`ApprovalCondition` se modela en este sprint con los campos de Confluence, o se posterga?** El RT tiene campos definidos pero no hay caso real.
>
> ❓ La "Habilitacion" (Univalle SEM 18) viene como `Session`. ¿Es interpretacion del legacy o es realmente Session? ¿Como se distingue una "condicion de aprobacion" de una "sesion final"?
>
> ❓ **`GeneralData`, `GraduationProfile`, `EntryProfile`**: Confluence menciona estos RTs pero **no especifica campos**. ¿Cuales son?
>   - `GeneralData`: ¿es contenedor de metadata libre o tiene campos fijos?
>   - `GraduationProfile` / `EntryProfile`: ¿realmente aplican al programa de asignatura o solo a planes de estudio?
>
> ❓ Si se modelan estos 4 RTs: ¿el casing del enum `conditionType` es PascalCase (Confluence) o UPPER_SNAKE (codigo)? — depende de Q10.

### Via posible respaldada (a confirmar)

Sin respaldo claro. Confluence los lista pero no aporta campos para 3 de 4. Legacy no los usa. Codigo no los tiene. **No hay informacion suficiente para crear los archivos sin inferir**.

### Soluciones detalladas — Si se decide modelar `ApprovalCondition`

**Archivo propuesto** (sprint futuro): `up1/object-manager/objects/business/RecordTypes/rt__ApprovalCondition__curricularsection.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ApprovalCondition",
  "baseObject": "CurricularSection",
  "metadata": {
    "label": "Condición de aprobación",
    "labelPlural": "Condiciones de aprobación",
    "gender": "femenina",
    "description": "Condicion que el estudiante debe cumplir para aprobar la asignatura."
  },
  "properties": {
    "conditionType": {
      "type": "string",
      "title": "Condition Type",
      "not_null": true,
      "description": "Tipo de condicion: asistencia minima, nota minima, custom",
      "enum": ["MIN_ATTENDANCE", "MIN_GRADE", "CUSTOM"]
    },
    "threshold": {
      "type": "number",
      "title": "Threshold",
      "not_null": true,
      "description": "Valor minimo requerido (ej: 75 para 75% asistencia)"
    },
    "unit": {
      "type": "string",
      "title": "Unit",
      "not_null": false,
      "description": "Unidad del threshold: '%', 'puntos', etc."
    }
  }
}
```

### Migracion del caso "Habilitación" Univalle (si se decide ApprovalCondition)

```json
// ANTES — legacy v2.2 (Univalle SEM 18 modelado como Session)
{
  "id": "cs-uv-1124-ses-18",
  "ownerType": "Activity",
  "ownerId": "aa-uv-1124",
  "recordType": "Session",
  "name": "SEM 18",
  "week": 18,
  "activityType": null,
  "activityDescription": "Habilitación.",
  "duration": null,
  "isRequired": false
}

// DESPUES — si se decide modelar ApprovalCondition
{
  "id": "cs-uv-1124-ac-habilitacion",
  "ownerType": "Activity",
  "ownerId": "aa-uv-1124",
  "recordType": "ApprovalCondition",
  "name": "Habilitación",
  "conditionType": "CUSTOM",
  "threshold": null,
  "unit": null,
  "isRequired": false
}
```

### RTs sin campos definidos por Confluence (GeneralData, GraduationProfile, EntryProfile)

> **No proponemos schema** sin info del equipo funcional — estaria inventando.
> Cuando se confirmen los campos, se modelarian igual que `ApprovalCondition` arriba.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | NO crear los 4 archivos de RT. Documentar la duda. La "Habilitacion" Univalle se modela como `Session` (textual del legacy). |
| **Sprint futuro cuando se confirme** | Crear `rt__<RT>__curricularsection.json` con los campos confirmados por el equipo funcional. Sin migracion (no hay datos previos). |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | El caso "Habilitacion" Univalle es ambiguo: el legacy lo modela como `Session` (`SEM 18`, `activityDescription: "Habilitación."`). Si en realidad debiera ser `ApprovalCondition`, el seed Univalle queda mal modelado. **Vale preguntar antes de cerrar el seed**. |
| **Sprint futuro** | 🔴 Alta | Cada RT que se agregue (ApprovalCondition tiene campos definidos; los otros 3 no) requiere: archivo nuevo + formulario en detail (UPONE-1035 evolucion) + posibles validaciones. Si se agregan los 4: ~4 archivos + 4 formularios. |

---

## Q6 — LearningOutcomes derivados de competencias en migracion AIEP

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` con `recordType="LearningOutcome"` | Posible campo `sourceCompetencyId` (trazabilidad a competencia origen) | Se agrega o no |
| `CurricularLink` | `sourceSectionId`, `targetSectionId`, `linkType="Develops"` | Como se generan los 9 vinculos AIEP en migracion |
| Tema de **migracion (ETL externo)**, no de modelo | — | El modelo del mod no cambia; cambia el proceso de migracion |

### Contexto
El legacy AIEP tiene 9 `CurricularLink` que apuntan a LOs **no incluidos en la lista de 40 LearningOutcomes declarados**. Vienen de otra tabla legacy (`imp_competencies`).

### 1. Confluence Learning Assurance dice
No menciona el caso especifico. El modelo soporta `LearningOutcome` con cualquier origen (interno o derivado).

### 2. Formato — Confluence up1 + codigo
No aplica — es tema de migracion (ETL), no de modelo.

### 3. Discrepancias del legacy — texto verbatim

> "Una entrada por cada `imp_courseunit_expectedlearning` del legacy AIEP — vinculan unidades tematicas (Content) con sus aprendizajes esperados granulares (LearningOutcome derivados de competencias atomicas). Los IDs `cs-aiep-14757-lo-uXaXX` referencian LO adicionales que se crearian a partir de las competencias `imp_competencies` (CEI-00620-C01-TIR101-UnAm)."

| Aspecto | Datos del legacy AIEP |
|---------|----------------------|
| LOs declarados explicitamente | 40 (con IDs `cs-aiep-14757-lo-1` a `lo-40`) |
| LOs referenciados en CurricularLinks | 9 adicionales (`cs-aiep-14757-lo-u1a01` a `u3a09`) |
| Origen de los 9 adicionales | Tabla legacy `imp_competencies` |
| Ejemplo concreto | `cl-aiep-14757-u1-develops-u1a01` apunta a `cs-aiep-14757-lo-u1a01` (no declarado) |

### 4. Ejemplo del flujo de migracion

**Datos del legacy AIEP — tablas origen**:
```sql
-- Tabla 1: imp_competencies
SELECT competencyId, codigo
FROM imp_competencies
WHERE referenceCode = 'CEI-00620-C01-TIR101-UnAm';
-- Resultado: 9 competencias atomicas

-- Tabla 2: imp_courseunit_expectedlearning
SELECT unidadId, competencyId, descripcion
FROM imp_courseunit_expectedlearning
WHERE courseId = 'TIR101';
-- Resultado: 9 vinculos competencia-unidad
```

**ETL propuesto (a confirmar)**:
```js
// Pseudo-codigo del ETL en sprint futuro+
for (const competency of imp_competencies) {
  // 1. Crear LearningOutcome derivado
  const loId = `cs-aiep-14757-lo-${competency.code}`;
  curricularSections.push({
    id: loId,
    recordType: "LearningOutcome",
    name: competency.descripcion,
    code: competency.code,
    // Campo extra propuesto para trazabilidad:
    sourceCompetencyId: competency.competencyId
  });

  // 2. Crear CurricularLink Develops
  const link = imp_courseunit_expectedlearning.find(l => l.competencyId === competency.competencyId);
  if (link) {
    curricularLinks.push({
      sourceSectionId: contentIdFromUnidad(link.unidadId),
      targetSectionId: loId,
      linkType: "Develops",
      notes: link.descripcion
    });
  }
}
```

### 5. Preguntas a resolver con el equipo

> ❓ **¿La migracion AIEP es responsabilidad de un ETL externo al mod, o el mod expone una API para crear LOs en lote?**
>
> ❓ ¿Los LOs derivados necesitan un campo extra para trazabilidad a la competencia origen (ej: `sourceCompetencyId`)? Si si, agregarlo al RT `LearningOutcome`.
>
> ❓ ¿Las 40 instituciones que migren AIEP siguen el mismo patron, o cada una tiene tablas legacy distintas?

### Via posible respaldada (a confirmar)

**ETL externo** alineado con como up1 maneja imports historicamente (BR-INT-001/002). Modelar bien `LearningOutcome` ahora — el ETL viene en sprint futuro.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Modelar `rt__LearningOutcome__curricularsection.json` segun legacy. **NO incluir en seed AIEP** los 9 LOs derivados ni sus 9 CurricularLinks. Documentar el caso. |
| **Sprint futuro** | Diseñar ETL que lea `imp_competencies` + `imp_courseunit_expectedlearning` y genere LOs + CurricularLinks. Modelo ya listo. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | ⚪ Nula | La migracion legacy AIEP esta fuera de este sprint. El modelo de `LearningOutcome` esta bien definido por el legacy. El seed AIEP de este sprint omite los 9 LOs derivados — no afecta. |
| **Sprint futuro** | 🔴 Alta | Cuando se priorice migracion AIEP real, **bloquea avance** hasta diseñar el ETL. El esfuerzo es construir el script (no refactor del mod). |

---

## Q7 — Estados de `CurricularSection` y `BibliographyReference`

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` (objeto base) | Posible `workflowState` (string nullable) | Se agrega o no la columna |
| `BibliographyReference` (catalogo) | Posible `workflowState` | Idem |
| Todos los RTs (`rt__<RT>__curricularsection.json`) | Heredan o no el campo | Idem |

### Contexto
¿Los sub-objetos del agregado tienen `workflowState` propio o heredan del padre `Activity`?

### 1. Confluence Learning Assurance dice
Workflow esta declarado **solo en `Activity`**. Las CurricularSections solo tienen `isVisible`, `isRequired`, `isSynchronizable` como flags de estado.

### 2. Formato — Confluence up1 + codigo
| Fuente | Que dice |
|--------|---------|
| Codigo | No hay precedente para sub-objetos con workflow propio en Curriculum Design (modulo nuevo). |

### 3. Discrepancias del legacy
**Ninguna** — legacy v2.2 NO incluye `workflowState` en CurricularSection ni BibliographyReference. Alineado con Confluence.

### 4. Ejemplo en cada lente

**Segun Confluence Learning Assurance** y **Segun legacy** (alineados):
```json
// CurricularSection NO tiene workflowState
{
  "id": "cs-uv-1124-lo-1",
  "recordType": "LearningOutcome",
  "name": "RA1. Resuelve...",
  "isVisible": true,
  "isRequired": true,
  "isSynchronizable": true
  // (sin workflowState)
}
```

**Si en futuro se agregara** (alternativa):
```json
{
  ...,
  "workflowState": "DRAFT"   // opcional, si se decide modelar
}
```

### 5. Preguntas a resolver con el equipo

> ❓ ¿Algun caso de negocio requiere workflow propio por seccion (ej: una `LearningOutcome` aprobada antes que el programa entero)?
>
> ❓ ¿Algun cliente (institucion) ha solicitado este nivel de granularidad?

### Via posible respaldada (a confirmar)

**NO modelar `workflowState` en sub-objetos**: alineado con Confluence + legacy. Es lo minimo viable.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | NO declarar `workflowState` en sub-objetos. UI deriva estado del padre. |
| **Sprint futuro si llega caso real** | Agregar columna nullable. Migracion idempotente (NULL = heredar del padre). Costo bajo. Retrocompatible. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | ⚪ Nula | Las 3 fuentes alineadas (no modelar). Cero impacto. |
| **Sprint futuro** | 🟢 Baja | Si llega caso real, agregar columna nullable es retrocompatible (NULL = heredar). Sin migracion. |

---

## Q8 — `BibliographyReference` para AIEP

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `BibliographyReference` (catalogo) | Cardinalidad de registros en seed AIEP | 0 o N — define que carga el ETL AIEP |
| RT `Bibliography` (`rt__Bibliography__curricularsection.json` futuro) | Cardinalidad por programa | Idem |

### Contexto
El ejemplo legacy AIEP **no incluye** ninguna `BibliographyReference` ni seccion `Bibliography`. Univalle si (9 referencias).

### 1. Confluence Learning Assurance dice
El modelo soporta cero o N `Bibliography`. Sin restriccion de cardinalidad minima.

### 2. Formato — Confluence up1 + codigo
No aplica al campo — aplica al modelo.

### 3. Discrepancias del legacy

| Aspecto | Univalle | AIEP | Observacion |
|---------|----------|------|-------------|
| BibliographyReferences | 9 | 0 | ¿AIEP no usa o no se documento? |
| Secciones Bibliography | 9 | 0 | Idem |

### 4. Ejemplo

**Univalle (legacy)** — 9 referencias en seccion Bibliography:
```json
[
  { "id": "br-uv-1", "rawCitation": "G. Calderón... 2018", ... },
  { "id": "br-uv-2", "rawCitation": "P. Blanchard... 1999", ... },
  // ... 9 entradas
]
```

**AIEP (legacy)** — vacio:
```json
// Sin BibliographyReferences ni secciones Bibliography
```

### 5. Preguntas a resolver con el equipo

> ❓ **¿AIEP realmente no documenta bibliografia en su programa, o esta ausente del ejemplo por incompletitud?**
>
> ❓ Si AIEP tiene bibliografia en otra tabla legacy: ¿cual? ¿el ETL la mapea?
>
> ❓ ¿La cardinalidad minima de Bibliography es 0 (cualquiera puede tener) o existen instituciones que requieren al menos 1?

### Via posible respaldada (a confirmar)

**Modelo soporta cero o N**: alineado con Confluence + legacy.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | Seed Univalle: 9 BibRef + 9 secciones. Seed AIEP: 0. UI muestra seccion vacia si no hay datos. NO restriccion de cardinalidad. |
| **Sprint futuro (al migrar AIEP)** | Si ETL descubre bibliografia en otra tabla: la genera. Si no: AIEP queda sin Bibliography (valido). |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | ⚪ Nula | Modelo soporta cero o N. Univalle 9, AIEP 0 — ambos validos. UI no rompe sin datos. |
| **Sprint futuro** | 🟢 Baja | Si la migracion AIEP descubre bibliografia oculta, ETL la mapea. Si no, queda valido. Sin refactor. |

---

## Q9 — Cardinalidad minima de Modality (>= 1)

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `Activity` (workflow) | Validacion en handler de transicion | Bloqueante en transicion `Draft → Review` o no |
| RT `Modality` (`rt__Modality__curricularsection.json` futuro) | Cardinalidad por programa | Validar `>= 1` o no |
| `CurricularSection` (objeto base) | — | Sin cambio de schema — es validacion logica |

### Contexto
Confluence afirma que "una asignatura debe tener al menos una Modality". ¿Donde se valida?

### 1. Confluence Learning Assurance dice
"Una asignatura debe tener **>= 1** seccion `Modality`. Cada modalidad tiene su propia carga horaria y delivery mode. Solo una puede tener `isDefault: true`."

### 2. Formato — Confluence up1 + codigo
| Fuente | Que dice |
|--------|---------|
| Confluence up1 / AGENTS.md | No hay validacion declarativa en JSON Schema para "minItems en arrays de FK polimorficas" — son validaciones de negocio. |
| Codigo | Validaciones bloqueantes se implementan en handlers de transicion de workflow, no en el schema. |

### 3. Discrepancias del legacy
**Ninguna** — Univalle 1 Modality, AIEP 13. Ambos cumplen.

### 4. Ejemplo

**Validacion conceptual (Confluence)**:
```
Activity con:
- 0 Modality → INVALIDO (no puede transicionar de Draft a Review)
- 1 Modality → VALIDO
- N Modality → VALIDO (Univalle 1, AIEP 13)
```

**Validacion en codigo (segun convencion up1)** — handler de workflow:
```js
async function transitionDraftToReview(programId) {
  const modalityCount = await prisma.curricularSection.count({
    where: {
      ownerType: 'ACADEMIC_ACTIVITY',
      ownerId: programId,
      recordType: 'MODALITY'
    }
  });
  if (modalityCount < 1) {
    throw new Error('Programa requiere al menos una Modality para pasar a Review');
  }
  // ... transicion
}
```

### 5. Preguntas a resolver con el equipo

> ❓ **¿La validacion >= 1 Modality es bloqueante (workflow) o solo informativa (warning UI)?**
>
> ❓ Si bloqueante: ¿en que transicion? (Draft → Review, Review → Approved, ...)
>
> ❓ ¿Hay otras invariantes parecidas (ej: >= 1 LearningOutcome, >= 1 Content)?

### Via posible respaldada (a confirmar)

**Validacion bloqueante en handler de transicion `Draft → Review`**: alineado con la estructura up1 (validaciones en transiciones, no en schema). Pero **depende de Q2** (sin enum cerrado de workflowState no hay transiciones).

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | NO implementar validacion bloqueante. Seed cumple naturalmente (Univalle 1, AIEP 13). UI no rompe si falta. |
| **Sprint futuro (al implementar workflow)** | Validacion en handler de transicion. Sin refactor de schema. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | El seed cumple naturalmente. Sin validacion no hay riesgo de datos invalidos en este sprint (no hay flujo de creacion vacia). UI no rompe. |
| **Sprint futuro** | 🔴 Alta | Validacion **critica** para CAP-CUR-019 (handler de transicion `Draft → Review`). Depende de Q2 (sin enum cerrado de workflowState no se sabe en que transicion validar). |

---

## Q10 — Casing de valores enum: ¿UPPER_SNAKE_CASE o PascalCase?

### Modelos afectados (TRANSVERSAL)

**Afecta TODOS los enums declarados en TODOS los objetos del agregado**:

| Objeto / RT | Campo(s) enum |
|------------|--------------|
| `Activity` | `recordType`, `programLevel`, `workflowState` (cuando se cierre Q2) |
| `CurricularSection` (objeto base) | `ownerType`, `sectionType`, `recordType` (cuando se cierre Q13) |
| `CurricularLink` | `linkType` |
| `BibliographyReference` | `referenceFormat` (cuando se cierre Q4) |
| RT `Modality` | `deliveryMode` |
| RT `EvaluationComponent` | `componentType` |
| RT `Content` | `contentType` |
| RT `CustomSection` | `contentType` (caso `"richText"` atipico) |
| Futuro RT `ApprovalCondition` | `conditionType` |

### Contexto
3 fuentes oficiales con 3 convenciones distintas. **Esta pregunta es transversal**: afecta TODOS los enums del modulo (workflowState, recordType, programLevel, deliveryMode, linkType, referenceType, componentType, sectionType, contentType, ownerType, conditionType, etc.).

### 1. Confluence Learning Assurance dice
Valores en **PascalCase**: `Draft`, `Approved`, `Theoretical`, `Hybrid`, `Develops`, `Mandatory`, etc. **Es notacion humano-legible** del documento conceptual.

### 2. Formato — Confluence up1 + codigo

| Fuente | Que dice |
|--------|---------|
| AGENTS.md | "Convencion en el core: **UPPER_SNAKE_CASE** para valores enum". |
| Codigo (verificado en 5+ Bases) | **TODOS los enums son UPPER_SNAKE_CASE**. Cero excepciones encontradas. |

**Citas verbatim**:
```json
// Base/csenrollment.json
"enum": ["ENROLLED", "COMPLETED", "DROPPED"]

// Base/csstudent.json
"enum": ["LOW", "MEDIUM", "HIGH"]

// Base/hwfactor.json
"enum": ["ACADEMIC", "ATTENDANCE", "ENGAGEMENT"]

// Base/hwintervention.json
"enum": ["ACADEMIC_ADVISING", "TUTORING", "COUNSELING"]
"enum": ["SCHEDULED", "IN_PROGRESS", "COMPLETED"]

// Base/hwassessment.json
"enum": ["LOW", "MEDIUM", "HIGH"]
```

### 3. Discrepancias del legacy

| Campo | Legacy v2.2 (PascalCase) | Codigo up1 (UPPER_SNAKE) | Conversion necesaria |
|-------|--------------------------|--------------------------|---------------------|
| `workflowState` | `"Active"` | (a definir) | `Active` → `"ACTIVE"` o mapear (Q2) |
| `recordType` (Activity) | `"Course"` | (a definir) | `Course` → `"COURSE"` |
| `recordType` (CurricularSection) | `"Modality"`, `"LearningOutcome"`, etc. | (a definir) | `LearningOutcome` → `"LEARNING_OUTCOME"` |
| `programLevel` | `"Undergraduate"`, `"TechnicalProfessional"` | (a definir) | `Undergraduate` → `"UNDERGRADUATE"` |
| `deliveryMode` | `"Presencial"`, `"Online"`, `"Hybrid"` | (a definir) | `Presencial` → `"PRESENCIAL"` |
| `linkType` | `"Develops"`, `"Evaluates"`, etc. | (a definir) | `Develops` → `"DEVELOPS"` |
| `referenceType` | `"Mandatory"`, `"Complementary"`, `"Digital"` | (a definir) | `Mandatory` → `"MANDATORY"` |
| `componentType` | `"Summative"`, `"Formative"` | (a definir) | `Summative` → `"SUMMATIVE"` |
| `sectionType` | `"Structural"`, `"Complementary"` | (a definir) | `Structural` → `"STRUCTURAL"` |
| `contentType` (Content) | `"Theoretical"`, `"Practical"`, `"Laboratory"` | (a definir) | `Theoretical` → `"THEORETICAL"` |
| `contentType` (CustomSection) | **`"richText"`** (camelCase) | (a definir) | `richText` → `"RICH_TEXT"` |
| `ownerType` | `"Activity"` | (a definir) | `Activity` → `"ACADEMIC_ACTIVITY"` |

> Nota: el campo `contentType` de `CustomSection` legacy usa `"richText"` (camelCase), que **no es PascalCase ni UPPER_SNAKE**. Convencion atipica.

### 4. Ejemplo en cada lente — caso `linkType`

**Segun Confluence Learning Assurance**:
```json
"linkType": {
  "type": "string",
  "title": "Link Type",
  "enum": ["Develops", "Evaluates", "Covers", "Uses", "Custom"]
}
```

**Segun formato up1 (codigo) — propuesta a confirmar**:
```json
"linkType": {
  "type": "string",
  "title": "Link Type",
  "enum": ["DEVELOPS", "EVALUATES", "COVERS", "USES", "CUSTOM"]
}
```

**Segun legacy v2.2**:
```json
{
  "id": "cl-uv-1124-q1-evaluates-ra1",
  "linkType": "Evaluates",      // ← PascalCase
  "sourceSectionId": "cs-uv-1124-ec-q1",
  "targetSectionId": "cs-uv-1124-lo-1"
}
```

### 5. Preguntas a resolver con el equipo

> ❓ **¿Se confirma UPPER_SNAKE_CASE como casing oficial de los enums del modulo?**
> Es lo que hacen los Bases del core (5 verificados, sin excepciones). AGENTS.md tambien lo afirma.
>
> ❓ Si si: aceptamos que **el legacy se convierte mecanicamente** al cargar (`Develops → "DEVELOPS"`, etc.).
>
> ❓ El caso especial: **`contentType: "richText"`** (camelCase atipico) — ¿se convierte a `"RICH_TEXT"`?
>
> ❓ ¿La convencion debe oficializarse a nivel **plataforma up1** (ticket cross-equipo) o es local al modulo?

### Via posible respaldada (a confirmar)

**UPPER_SNAKE_CASE en todos los enums**: respaldado por **5 Bases del core** + AGENTS.md. Legacy y Confluence usan PascalCase como notacion humana, pero la codificacion del modulo deberia seguir la convencion del codigo. **Esta es la via mas alineada con el codigo y queda como propuesta a validar**.

### Cobertura este sprint / sprint futuro

| | Accion |
|---|--------|
| **Este sprint (sin decision)** | **NO declarar enums** en los archivos JSON donde sea ambiguo. Modelar campos como `string` libre con `description` listando valores conocidos (Q2 y Q4). Para campos que **claramente son enum** (ver tabla), usar UPPER_SNAKE como propuesta a confirmar — facil revertir. |
| **Sprint futuro si confirma UPPER_SNAKE** | Migracion mecanica del seed: script idempotente. Costo bajo. |
| **Sprint futuro si decide PascalCase** | Inconsistencia con todos los Bases del core. Costo: rompe convencion de plataforma + requiere migrar los Bases existentes (improbable). |
| **Sprint futuro si decide otra cosa (mixto)** | Definir frontera. Costo medio. |

### Soluciones detalladas — Citas verbatim del codigo

**Patrones reales en Bases del core de up1** (todos UPPER_SNAKE_CASE, sin excepciones):

```json
// up1/object-manager/objects/business/Base/csenrollment.json
"status": {
  "type": "string",
  "enum": ["ENROLLED", "COMPLETED", "DROPPED"]
}

// up1/object-manager/objects/business/Base/hwfactor.json
"factorType": {
  "type": "string",
  "enum": ["ACADEMIC", "ATTENDANCE", "ENGAGEMENT"]
}

// up1/object-manager/objects/business/Base/hwintervention.json
"interventionType": {
  "type": "string",
  "enum": ["ACADEMIC_ADVISING", "TUTORING", "COUNSELING"]
},
"status": {
  "type": "string",
  "enum": ["SCHEDULED", "IN_PROGRESS", "COMPLETED"]
},
"priority": {
  "type": "string",
  "enum": ["LOW", "MEDIUM", "HIGH"]
}

// up1/object-manager/objects/business/Base/hwassessment.json
"riskLevel": {
  "type": "string",
  "enum": ["LOW", "MEDIUM", "HIGH"]
}

// up1/object-manager/objects/business/Base/csstudent.json
"academicRiskLevel": {
  "type": "string",
  "enum": ["LOW", "MEDIUM", "HIGH"]
}
```

**Patrones de naming UPPER_SNAKE observados**:
- Una palabra: `ENROLLED`, `LOW`, `HIGH`, `ACADEMIC`, `COMPLETED`
- Dos palabras: `ACADEMIC_ADVISING`, `IN_PROGRESS`
- Conversion mecanica desde PascalCase: `LearningOutcome` → `LEARNING_OUTCOME` (insertar `_` antes de cada mayuscula no-inicial)

### Solucion futura — script de conversion del seed legacy

```js
// Funcion utilitaria de conversion PascalCase → UPPER_SNAKE_CASE
function pascalToUpperSnake(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

// Mapping de TODOS los enums afectados en el modulo (12 enums):
const enumConversions = {
  // Activity
  recordType: { "Course": "COURSE" },
  programLevel: {
    "Undergraduate": "UNDERGRADUATE",
    "Postgraduate": "POSTGRADUATE",
    "ContinuingEducation": "CONTINUING_EDUCATION",
    "TechnicalProfessional": "TECHNICAL_PROFESSIONAL"
  },
  workflowState: {
    // mapping pendiente Q2 — no decidir aqui
  },

  // CurricularSection
  ownerType: {
    "Activity": "ACADEMIC_ACTIVITY",
    "Offering": "OFFERING"
  },
  recordType_section: {
    "Modality": "MODALITY",
    "LearningOutcome": "LEARNING_OUTCOME",
    "Session": "SESSION",
    "EvaluationComponent": "EVALUATION_COMPONENT",
    "Content": "CONTENT",
    "Bibliography": "BIBLIOGRAPHY",
    "CustomSection": "CUSTOM_SECTION"
  },
  sectionType: {
    "Structural": "STRUCTURAL",
    "Complementary": "COMPLEMENTARY"
  },

  // CurricularLink
  linkType: {
    "Develops": "DEVELOPS",
    "Evaluates": "EVALUATES",
    "Covers": "COVERS",
    "Uses": "USES",
    "Custom": "CUSTOM"
  },

  // BibliographyReference
  referenceFormat: {
    "Book": "BOOK",
    "Article": "ARTICLE",
    "Website": "WEBSITE",
    "Thesis": "THESIS",
    "Chapter": "CHAPTER",
    "ConferencePaper": "CONFERENCE_PAPER",
    "Other": "OTHER",
    "free-text": "FREE_TEXT"  // mapping pendiente Q4 — no decidir aqui
  },

  // RTs (cuando se modelen en TICKET-009)
  deliveryMode: { "Presencial": "PRESENCIAL", "Online": "ONLINE", "Hybrid": "HYBRID" },
  componentType: { "Summative": "SUMMATIVE", "Formative": "FORMATIVE" },
  contentType_content: {
    "Theoretical": "THEORETICAL",
    "Practical": "PRACTICAL",
    "Laboratory": "LABORATORY"
  },
  contentType_customSection: {
    "richText": "RICH_TEXT"  // caso atipico — el legacy usa camelCase
  },
  referenceType: {
    "Mandatory": "MANDATORY",
    "Complementary": "COMPLEMENTARY",
    "Digital": "DIGITAL"
  }
};

// Migration en SQL (idempotente, ejecutar antes de produccion):
// UPDATE academic_activity SET program_level = UPPER(REGEXP_REPLACE(program_level, '([a-z])([A-Z])', '\1_\2', 'g'))
//   WHERE program_level ~ '[a-z][A-Z]';
// (ejemplo conceptual — adaptar por DB engine)
```

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🔴 **Alta** | **Transversal — afecta TODOS los enums del modulo**. Si modelamos PascalCase y luego se decide UPPER_SNAKE: refactor de seeds (Univalle + AIEP) + descripciones + layouts (filtros y formularios). Confirmar antes de modelar enums es lo barato. |
| **Sprint futuro** | 🔴⚠️ **Critica** | Si la decision es UPPER_SNAKE (la via respaldada): migracion mecanica masiva. Si llega tarde (con datos en produccion + APIs externas), costo alto. Resolver temprano evita esto. |

---

## Q11 — ¿Qué subset de RecordTypes entra en TICKET-009 (UPONE-1035)?

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` (objeto base) | `recordType` (valores efectivamente soportados) | Solo los RTs declarados como archivo viven en el sistema |
| Archivos `rt__<RT>__curricularsection.json` en TICKET-009 | (segun RT) | Define cuales se crean: 3 (subset minimo) vs 6 (Univalle completo) vs 7 (Univalle + AIEP) |

### Contexto
El ticket UPONE-1033 (TICKET-006) **NO incluye RecordTypes** (strict scope — el ticket textual pide solo los 4 objetos base). Los RTs se declaran en TICKET-009 (UPONE-1035) cuando se construyen los layouts del detail. Pregunta: ¿qué subset de los 7 RTs identificados en legacy v2.2 entran en UPONE-1035?

### 1. Confluence Learning Assurance dice
Lista 7 RTs structurales/complementarios para `CurricularSection`. No prioriza.

### 2. Formato — Confluence up1 + codigo
Cada RT requiere 1 archivo `rt__<RT>__curricularsection.json` + layouts default por modo (view/edit/create) si se quieren formularios distintos.

### 3. Discrepancias del legacy
Univalle usa 7 RTs (Modality, LearningOutcome, Session, EvaluationComponent, Bibliography, CustomSection). AIEP usa 4 RTs (Modality, LearningOutcome, Content, EvaluationComponent root).

### 4. Alternativas

| Opcion | RTs en TICKET-009 | Justificacion |
|--------|-------------------|---------------|
| **A. Minimo viable (3 RTs)** | Modality + LearningOutcome + Content | Suficiente para validar el patron RecordTypes-layouts. Probable subset menor para "probar distintas configuraciones de secciones" (texto del ticket UPONE-1035). |
| **B. Caso Univalle completo (6 RTs)** | + Session + EvaluationComponent + Bibliography + CustomSection | Permite cargar el seed Univalle end-to-end. |
| **C. Todos los validados (7 RTs)** | + todos los anteriores | Permite cargar Univalle + AIEP. |
| **D. Estrictamente lo que pide el ticket UPONE-1035** | A definir leyendo el ticket en detalle | "Probar distintas configuraciones" sugiere variedad — puede ser 3-5 RTs. |

### 5. Preguntas a resolver con el equipo

> ❓ **¿Cuántos y cuáles RTs entran en UPONE-1035?** ¿Es suficiente probar 3 (Modality/LO/Content) o se requieren los 6 de Univalle para tener un caso end-to-end?
>
> ❓ ¿AIEP entra en sprint futuro o el seed completo es solo Univalle?

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | Define el scope de TICKET-009. Sin claridad podemos sobre-modelar (esfuerzo extra) o sub-modelar (UI incompleta). |
| **Sprint futuro** | 🟢 Baja | Si entran menos RTs ahora, agregar uno mas es archivo nuevo + layout. Cero migracion. |

---

## Q12 — ¿Cuándo se carga el seed completo del legacy?

### Modelos afectados

Ninguno — es decision de **implementacion** (orden de carga del seed), no de modelo.

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| (n/a) | — | Donde se ejecuta el `npm run seed` con datos completos |

### Contexto
El seed Univalle/AIEP del legacy v2.2 incluye campos especificos por RT (`bloomLevel`, `weight`, `theoryHours`, etc.) que requieren los RTs declarados. ¿En que ticket carga ese seed completo?

### Alternativas

| Opcion | Cuando carga el seed completo |
|--------|------------------------------|
| **A.** TICKET-009 (UPONE-1035) cuando ya estan los RTs | Strict — el seed sigue al modelo |
| **B.** Cargar parcial en TICKET-006 (campos comunes) + completar en TICKET-009 | Hibrido — TICKET-006 tiene datos pero "sin alma" |
| **C.** Solo TICKET-006 carga seed minimo de prueba; el seed Univalle/AIEP completo viene en TICKET-009 | Postura este sprint propuesta |

### Postura este sprint (a confirmar)
**Opcion C**. El seed de TICKET-006 es minimo (1-2 programas con secciones genericas). El seed Univalle/AIEP completo (50+ secciones con campos especificos) se carga en TICKET-009 cuando los RTs existen.

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | Es decision de implementacion, sin impacto funcional. |
| **Sprint futuro** | ⚪ Nula | Sin retrabajo independientemente de la decision. |

---

## Q13 — ¿El campo `recordType` de `CurricularSection` es enum cerrado o string libre?

### Modelos afectados

| Objeto / RT | Campo(s) | Naturaleza del impacto |
|------------|---------|------------------------|
| `CurricularSection` (objeto base) | `recordType` | Enum cerrado (lista RTs valida) vs string libre (cualquier valor pasa) |

### Contexto
En UPONE-1033 modelamos `CurricularSection` con campo `recordType`. Si es string libre, cualquier valor pasa. Si es enum cerrado, hay que listar TODOS los RTs (incluso los que no se modelan en UPONE-1033 ni UPONE-1035).

### Alternativas

| Opcion | Implicacion |
|--------|-------------|
| **A. String libre en este sprint** | Acepta cualquier valor. UPONE-1035 declara los RTs como archivos pero el campo no valida contra ellos. |
| **B. Enum cerrado con todos los RTs conocidos** | Lista los 7 del legacy + los 4 de Confluence (11 valores). Pero no todos se modelan como RT. |
| **C. Enum cerrado con solo los RTs que se declaran** | El enum crece con cada RT nuevo. Migracion cada vez que se agrega. |

### Postura este sprint (a confirmar)
**Opcion A** (string libre). El validador de RTs es la presencia del archivo `rt__<value>__curricularsection.json`, no el enum del campo base. Esto es lo que parece sugerir el codigo (RTs file-based). **Pendiente confirmar con codigo de plataforma**.

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | Si el codigo de plataforma valida `recordType` contra archivos RT existentes, podriamos tener problema con strings sin RT correspondiente. Vale validar. |
| **Sprint futuro** | 🟢 Baja | Cambio de string libre a enum es solo agregar el `enum` al schema. Cero migracion si no hay datos invalidos. |

---

## Q14 — RecordTypes que aparecen en el legacy pero no se cubren en UPONE-1035

### Modelos afectados

Si el subset Q11 deja afuera RTs presentes en el legacy, se afectan:

| Objeto / RT no modelado | Campo(s) que se pierden | Impacto en seed Univalle |
|------------------------|------------------------|--------------------------|
| RT `Session` | `week`, `activityType`, `activityDescription`, `duration` | 18 sesiones Univalle no se renderizan |
| RT `EvaluationComponent` | `componentCode`, `parentId`, `weight`, `componentType`, `isDirectEvidence` | 8 componentes (1 root + 7 hijos) Univalle / 1 root AIEP no se renderizan |
| RT `Bibliography` | `libraryRefId`, `referenceType`, `notes` | 9 secciones de bibliografia Univalle no se renderizan (pero el catalogo `BibliographyReference` SI esta — TICKET-006) |
| RT `CustomSection` | `contentType`, `content`, `maxLength` | 2 secciones libres Univalle (Descripcion extendida, Temario) no se renderizan |

### Contexto
Si TICKET-009 modela solo 3 RTs (postura A de Q11), los otros RTs del legacy (Session, EvaluationComponent, Bibliography, CustomSection) **no estan modelados**. Pregunta: ¿como se representan en sprint futuro?

### Casos concretos

| RT no modelado | Aparece en | Que pasa si no se modela en sprint futuro |
|----------------|-----------|----------------------------------|
| `Session` | Univalle (18 sesiones) | UI no muestra sesiones del programa Univalle. Seed parcial. |
| `EvaluationComponent` | Univalle (8 con Composite) + AIEP (1 root) | UI no muestra estructura de evaluacion. Cardinal del legacy roto. |
| `Bibliography` (RT) | Univalle (9 secciones) | UI no muestra referencias bibliograficas en el programa. (Catalogo `BibliographyReference` SI existe — TICKET-006). |
| `CustomSection` | Univalle (2 secciones) | UI no muestra "Descripcion extendida" ni "Temario" de Univalle. |

### Alternativas

| Opcion | Justificacion |
|--------|---------------|
| **A. Modelar todos los RTs del legacy en UPONE-1035** | Caso Univalle end-to-end completo. Mas esfuerzo. |
| **B. Modelar solo el subset minimo** + dejar los demas como RTs futuros (post-sprint-futuro) | Strict — solo lo necesario para "probar distintas configuraciones". |
| **C. Modelar todos los RTs como ARCHIVOS pero formularios solo para 3** | Hibrido — el seed carga, los formularios no estan completos. |

### Importancia

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | Define la experiencia visible del detail en UPONE-1035. Si solo se modelan 3 RTs, los stakeholders pueden ver el detail Univalle "incompleto". |
| **Sprint futuro** | 🟢 Baja | Agregar RTs faltantes es archivo nuevo + layout. Cero migracion. |

---

## Tenant Questions (T1..T5)

> **Categoria especial**: preguntas con **sabor multi-tenant**. Se separan de Q1..Q14 porque la naturaleza de la pregunta es per-tenant (no de schema global).
>
> **Tenants confirmados** ([DECISION-003](../../decisions/DECISION-003-tenant-ids.md)): `UNIVALLE` y `AIEP`. Pre-requisito a TICKET-006.

### T1 — TENANT_IDs: ¿`UNIVALLE` y `AIEP`?

**Modelos afectados**: ninguno — es config de plataforma, no del mod.

**Estado**: ✅ **CONFIRMADO** ([DECISION-003](../../decisions/DECISION-003-tenant-ids.md), 2026-04-27).

| Sprint | Nivel | Accion |
|--------|-------|--------|
| **Este sprint** | ⚪ Decidido | Pre-requisito ANTES de TICKET-006: `npm run tenant:create UNIVALLE` y `npm run tenant:create AIEP` |
| **Sprint futuro** | ⚪ Nula | Sin accion adicional |

---

### T2 — RecordTypes: ¿globales o per-tenant?

**Modelos afectados**:

| Objeto / RT | Naturaleza del impacto |
|------------|------------------------|
| Archivos `rt__<RT>__curricularsection.json` | ¿Viven en `up1/object-manager/objects/business/RecordTypes/` (global) o en `up1/object-manager/objects/tenants/<TENANT_ID>/RecordTypes/` (per-tenant)? |

**Contexto**

Verificado en codigo: el tenant `UPU` tiene **su propio RT custom** (`tenants/UPU/RecordTypes/rt__Investigador__core_user.json`). Eso confirma que **RTs per-tenant SI son posibles** en up1.

Pero el patron general en core (`Modality`, `Course`, etc.) seria global.

**Pregunta**: para curriculum-design, ¿los 7 RTs (Modality, LearningOutcome, etc.) son globales o per-tenant?

| Opcion | Implicacion |
|--------|-------------|
| **A. RTs globales (en `business/RecordTypes/`)** | Univalle y AIEP comparten los mismos RTs. Modelo unico. **Postura este sprint**. |
| **B. RTs per-tenant** (en `tenants/<ID>/RecordTypes/`) | Cada tenant declara los suyos — pueden divergir. Mas flexible pero mas archivos. |
| **C. Hibrido** — RTs comunes globales + custom per-tenant | Patron observado en codigo (UPU tiene RTs propios + Bases globales) |

**Postura este sprint**: A (RTs globales). Univalle y AIEP usan los mismos `Modality`, `LearningOutcome`, etc.

**Pregunta a resolver**: ¿algun RT debe ser per-tenant especificamente? (probablemente no, pero confirmar)

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | Define donde viven los archivos RT en TICKET-009 |
| **Sprint futuro** | 🟢 Baja | Si llega caso de RT per-tenant, se mueve a la carpeta del tenant |

---

### T3 — Subset de RTs: ¿el mismo para ambos tenants?

**Modelos afectados**: archivos `rt__<RT>__curricularsection.json` que se crean en TICKET-009.

**Contexto**

[Q11](#q11--qué-subset-de-recordtypes-entra-en-ticket-009-upone-1035) pregunta cuantos RTs entran en TICKET-009. Los datos legacy tienen distinta cobertura por tenant:

| RecordType | Univalle | AIEP | ¿En TICKET-009? |
|-----------|----------|------|-----------------|
| Modality | ✅ 1 | ✅ 13 | Si — confirmado |
| LearningOutcome | ✅ 3 | ✅ 40 | Si — confirmado |
| Session | ✅ 18 | ❌ | Q11 abierta |
| EvaluationComponent | ✅ 8 | ✅ 1 | Q11 abierta |
| Content | ❌ | ✅ 3 | Q11 abierta |
| Bibliography | ✅ 9 | ❌ | Q11 abierta |
| CustomSection | ✅ 2 | ❌ | Q11 abierta |

**Implicacion practica**: si el subset Q11 elige solo "Modality + LearningOutcome + Content":
- **Univalle**: ve incompleto el detail (faltan Session, EvalComp, Bibliography, CustomSection)
- **AIEP**: ve completo (Content cubre la diferencia con Univalle)

**Pregunta a resolver con el equipo**:

> ❓ ¿El subset minimo de TICKET-009 debe priorizar cobertura de Univalle (mas completo) o AIEP (mas simple)?
>
> ❓ Si solo se modelan 3 RTs, ¿se acepta que el detail Univalle se vea incompleto en demos?

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟡 Media | Determina experiencia visible en demos |
| **Sprint futuro** | 🟢 Baja | Agregar RT faltante = archivo nuevo + layout. Cero migracion. |

---

### T4 — Estructura del seed por tenant

**Modelos afectados**: ninguno — decision de **organizacion** de seed.

**Contexto**

Los datos legacy v2.2 incluyen **2 instancias** (una por tenant). El seed se debe dividir.

**Opciones**

| Opcion | Estructura | Pros | Contras |
|--------|-----------|------|---------|
| **A. Carpetas por tenant** | `mods/curriculum-design/seed/UNIVALLE/...`, `seed/AIEP/...` | Claro. Cada tenant carga su carpeta. | Mas archivos. |
| **B. Un archivo por objeto con `tenantId` por registro** | `seed/academic_activity.json` con array; cada item tiene `tenantId` | Menos archivos. | Confunde — el `tenantId` no se setea explicito en seed normalmente, lo provee el contexto |
| **C. Seed global** + script que asigna tenant | Un seed neutro y script que copia a cada tenant | Reusable | Mas complejo de mantener |

**Postura este sprint**: A (carpetas por tenant). Es lo mas explicito y alineado con `up1/object-manager/prisma/<TENANT_ID>/seed.js` que ya existe en plataforma.

**Pregunta a resolver**: confirmar la convencion con el equipo (¿algun mod existente tiene seed dividido por tenant?).

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | 🟢 Baja | Decision de implementacion. Sin impacto funcional. |
| **Sprint futuro** | ⚪ Nula | Sin retrabajo. |

---

### T5 — Extensions con casos concretos Univalle/AIEP

**Modelos afectados**: archivos potenciales `ext__univalle__<base>.json` y `ext__aiep__<base>.json`.

**Contexto**

[AGENTS.md](references/AGENTS.md) documenta el patron de Extensions: cada cliente puede agregar campos a un Base via `Extended/ext__<cliente>__<base>.json`. Verificado en codigo: el tenant `UPU` tiene archivos en `tenants/UPU/Base/` (faculty, course, etc.) — son objetos custom del tenant, similar mecanismo.

**Casos hipoteticos** (no confirmados por el equipo):

| Cliente | Posible Extension | Campos hipoteticos |
|---------|-------------------|--------------------|
| Univalle | `ext__univalle__academicactivity.json` | `consejoAprobacionResolucion`, `consejoAprobacionFecha`, `departamentoAcademicoId` |
| AIEP | `ext__aiep__academicactivity.json` | `siesCarreraCode`, `legacyImpCompetenciaRef`, `perfilEgresoOficialId` |
| AIEP | `ext__aiep__rt__learningoutcome__curricularsection.json` ❓ | `sourceCompetencyId` para trazabilidad legacy (Q6) |

**Limitacion conocida**: AGENTS.md documenta Extensions de **Bases**, NO de RecordTypes. La tercera fila (Extension de un RT) **no tiene precedente documentado** en up1.

**Pregunta a resolver con el equipo**:

> ❓ ¿Univalle requiere algun campo custom no contemplado en el modelo base? (Probables: codigo de resolucion del consejo, departamento academico)
>
> ❓ ¿AIEP requiere algun campo custom? (Probables: codigo SIES, perfil de egreso oficial)
>
> ❓ Si AIEP necesita campo extra en el RT `LearningOutcome` (ej: `sourceCompetencyId` para trazabilidad legacy AIEP solamente): ¿como se modela? AGENTS.md no documenta Extensions de RTs.

**Postura este sprint**: NO modelar Extensions. Los datos del legacy v2.2 caben en el modelo base. Inferir Extensions sin info del equipo seria inventar.

| Sprint | Nivel | Por que |
|--------|-------|---------|
| **Este sprint** | ⚪ Nula | Sin info del equipo, no se modelan |
| **Sprint futuro** | 🟢 Baja | Si llega requerimiento, crear `ext__<cliente>__<base>.json` es trivial. Sin migracion (es campo nuevo). |

---

### Resumen Tenant Questions

| T | Tema | Estado | Importancia este sprint |
|---|------|--------|-------------------------|
| **T1** | TENANT_IDs `UNIVALLE`+`AIEP` | ✅ Confirmado (DECISION-003) | ⚪ Decidido |
| T2 | RTs globales vs per-tenant | Abierto — postura A (globales) | 🟡 Media |
| T3 | Subset de RTs cubriendo Univalle/AIEP | Abierto — define experiencia visible | 🟡 Media |
| T4 | Seed por tenant (estructura) | Abierto — postura A (carpetas por tenant) | 🟢 Baja |
| T5 | Extensions concretas Univalle/AIEP | Abierto — sin info, no modelar | ⚪ Nula |

**Conexiones con Q1..Q14**:
- T2 ↔ Q3 (RTs custom dinamicos), Q5 (4 RTs no validados)
- T3 ↔ Q11 (subset RTs)
- T4 ↔ Q12 (cuando se carga seed)
- T5 ↔ Q1 (externalId), Q5 (campos custom de RTs)

---

## Resumen ejecutivo

| Q | Tema | Importancia (este sprint) | Importancia (sprint futuro) | Postura (este sprint) | Pregunta principal | Via posible respaldada | Estado 2026-04-28 |
|---|------|----|----|-------------|-------------------|-----------------------|-------|
| Q1 | externalId 1 vs 2 campos | 🟢 Baja | 🟢 Baja | 1 campo string nullable | ¿1 o 2 campos? | Sin via dominante | ✅ **Resuelta** [DECISION-004](../../decisions/DECISION-004-externalid-single-field.md) |
| **Q2** | workflowState enum | 🔴 **Alta** | 🔴⚠️ **Critica** | String libre (sin enum) | ¿Que valor es `"Active"`? + casing | UPPER_SNAKE (5 Bases) | ✅ **Postergada** [DECISION-005](../../decisions/DECISION-005-workflow-state-defer.md) |
| Q3 | CustomSection 1 vs N | 🟢 Baja | 🔴⚠️ **Critica** | 1 RT generico | ¿1 generico o N dinamicos? | 1 RT (sin precedente dinamico) | ✅ **Resuelta** [DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md) |
| Q4 | referenceFormat enum | 🟢 Baja | 🟢 Baja | Enum Confluence | ¿`"free-text"` se mantiene? | Enum oficial Confluence | ✅ **Resuelta — Enum Confluence** (2026-04-28). Adoptado: `["Book", "Article", "Website", "Thesis", "Chapter", "ConferencePaper", "Other"]`. Casing PascalCase. Valor legacy `"free-text"` mapea a `"Other"` o queda como `null`. |
| Q5 | 4 RTs no validados | 🟡 Media | 🔴 Alta | NO crear los 4 | ¿Habilitacion = Session o ApprovalCondition? + campos | Sin via clara | ✅ **Parcial** habilitacion=Session + GeneralData/GraduationProfile/EntryProfile postergados [DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md) |
| Q6 | LOs derivados AIEP | ⚪ Nula | 🔴 Alta | Migracion fuera de este sprint | ¿ETL externo o API? | ETL externo (BR-INT) | ⏳ Pendiente |
| Q7 | workflow sub-objetos | ⚪ Nula | 🟢 Baja | NO modelar | ¿Caso real? | NO modelar (alineado) | ⏳ Pendiente |
| Q8 | Bibliography AIEP | ⚪ Nula | 🟢 Baja | Cero o N — sin restriccion | ¿AIEP no usa o no documentado? | Modelo soporta | ⏳ Pendiente |
| Q9 | Modality >= 1 | 🟢 Baja | 🔴 Alta | Sin validacion | ¿Bloqueante o soft? | Handler de workflow (depende Q2) | ⏳ Pendiente |
| **Q10** | Enum casing | 🔴 **Alta** | 🔴⚠️ **Critica** | UPPER_SNAKE en propuestas | ¿UPPER_SNAKE o PascalCase? | UPPER_SNAKE (5 Bases + AGENTS.md) | 🟡 **No bloqueante** — JD impulsa estandar UP1, avanzar con UPPER_SNAKE provisorio |
| **Q11** | Subset RTs en TICKET-009 | 🟡 Media | 🟢 Baja | A definir | ¿3 RTs minimos o 6 Univalle completo? | Cumple "probar configuraciones" del ticket | ⏳ Pendiente (afectado por DECISION-008) |
| **Q12** | Cuándo carga seed completo | 🟢 Baja | ⚪ Nula | Seed completo en TICKET-009 | (decision implementacion) | — | ⏳ Pendiente |
| **Q13** | `recordType` enum o libre | 🟡 Media | 🟢 Baja | String libre | ¿Plataforma valida vs archivos RT? | Pendiente verificar codigo | ⏳ Pendiente |
| **Q14** | RTs no cubiertos | 🟡 Media | 🟢 Baja | Depende Q11 | ¿Que pasa con Session/EvalComp/Bibliography/CustomSection? | — | ⏳ Pendiente |
| **T1** | Tenant IDs | 🔴 Alta | 🟢 Baja | Solo UPU (SP2) | ¿Multi-tenant en SP2 o despues? | SP2 no usa capacidades por tenant | ✅ **Resuelta — Rollout 2 fases (FINAL)** [DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md) supersedes 003/009/010/011. F1=UPU solo; F2=separar. |
| **T2** | RTs globales o per-tenant | 🟡 Media | 🟢 Baja | Globales (postura A) | ¿Globales o per-tenant? | Pattern UPU (rt__Investigador__core_user) | ✅ **Resuelta — Globales** [DECISION-007](../../decisions/DECISION-007-recordtypes-global.md) |

### Bloqueos identificados

| Capability futura | Bloqueado por | Por que |
|------------------|--------------|---------|
| Workflow del programa (CAP-CUR-019) | Q2 + Q9 + Q10 | Sin enum cerrado no hay transiciones |
| Configuracion estructura institucional (CAP-CUR-013) | Q3 | Sin saber si N RTs custom o 1 generico |
| Migracion legacy AIEP | Q6 + Q8 | Pendiente diseñar ETL |

### Conversiones legacy → modelo (necesarias si se confirma UPPER_SNAKE)

```js
// Mapping mecanico para seed Univalle/AIEP:
const enumConversions = {
  // Q2 — pendiente confirmar mapping de "Active"
  workflowState: { "Active": /* ? */ },

  // Q10 — propuesta a confirmar
  recordType: { "Course": "COURSE", "LearningOutcome": "LEARNING_OUTCOME", "Modality": "MODALITY", ... },
  programLevel: { "Undergraduate": "UNDERGRADUATE", "TechnicalProfessional": "TECHNICAL_PROFESSIONAL", ... },
  deliveryMode: { "Presencial": "PRESENCIAL", "Online": "ONLINE", "Hybrid": "HYBRID" },
  linkType: { "Develops": "DEVELOPS", "Evaluates": "EVALUATES", ... },
  referenceType: { "Mandatory": "MANDATORY", "Complementary": "COMPLEMENTARY", "Digital": "DIGITAL" },
  componentType: { "Summative": "SUMMATIVE", "Formative": "FORMATIVE" },
  sectionType: { "Structural": "STRUCTURAL", "Complementary": "COMPLEMENTARY" },
  contentType_Content: { "Theoretical": "THEORETICAL", "Practical": "PRACTICAL", "Laboratory": "LABORATORY" },
  contentType_CustomSection: { "richText": "RICH_TEXT" },
  ownerType: { "Activity": "ACADEMIC_ACTIVITY", "Offering": "OFFERING" },

  // Q4 — pendiente
  referenceFormat: { "free-text": /* ? */ }
};
```

---

## Validacion en Bases del core

Bases verificados al 2026-04-27 en `up1/object-manager/objects/business/Base/`:

| Base | Enums encontrados | Casing |
|------|-------------------|--------|
| `csenrollment.json` | `["ENROLLED", "COMPLETED", "DROPPED"]` | UPPER_SNAKE |
| `csstudent.json` | `["LOW", "MEDIUM", "HIGH"]` | UPPER_SNAKE |
| `hwassessment.json` | `["LOW", "MEDIUM", "HIGH"]` | UPPER_SNAKE |
| `hwfactor.json` | `["ACADEMIC", "ATTENDANCE", "ENGAGEMENT"]` | UPPER_SNAKE |
| `hwintervention.json` | `["ACADEMIC_ADVISING", "TUTORING", "COUNSELING"]`, `["SCHEDULED", "IN_PROGRESS", "COMPLETED"]`, `["LOW", "MEDIUM", "HIGH"]` | UPPER_SNAKE |

**Patrones NO encontrados en codigo**:

| Patron | Status |
|--------|--------|
| Campo `externalId`, `externalSystemId`, `externalRecordId` | ❌ No existe en ningun Base. Q1 sin precedente. |
| FK polimorfica `ownerType` + `ownerId` | ❌ No existe en ningun Base. CurricularSection seria el primer caso. |
| RecordTypes custom dinamicos por institucion | ❌ Solo existe `rt__Student__core_user.json`. Sin precedente para Q3/Q5. |

---

## Referencias cruzadas

### Q ↔ Business Rules afectadas

| Q | BRs principales | Tipo de relacion |
|---|----------------|------------------|
| Q1 | [BR-INT-001](business-rules/BR-INT-001.md) | Define identificador externo. Si decide A: actualizar texto a "1 campo". |
| Q2 | [BR-WKF-001](business-rules/BR-WKF-001.md), [BR-WKF-002](business-rules/BR-WKF-002.md), [BR-MIG-001](business-rules/BR-MIG-001.md) | Definen ciclo de vida y herencia MADS. La decision determina enum y transiciones. |
| Q4 | (sin BR especifico) | Solo afecta el catalogo `BibliographyReference`. |
| Q5 | (sin BR especifico) | Afecta el catalogo de RTs disponibles. |
| Q6 | [BR-INT-001](business-rules/BR-INT-001.md), [BR-INT-002](business-rules/BR-INT-002.md) | Patron de import legacy. |
| Q7 | [BR-WKF-001](business-rules/BR-WKF-001.md) | Define workflow solo en `Activity`. |
| Q9 | (sin BR especifico explicito) | Validacion de negocio aplicable al workflow. |
| Q10 | Aplica a TODAS las BRs que mencionen valores enum | Cambio cosmetico si se decide UPPER_SNAKE. |

### Q ↔ Capabilities afectadas

| Q | Capability | Impacto |
|---|-----------|---------|
| Q2, Q9, Q10 | [CAP-CUR-019](capabilities/CAP-CUR-019.md) (Workflow del programa) | **Bloqueada hasta resolver Q2 + Q10**. Sin enum cerrado, no hay transiciones. |
| Q3 | CAP-CUR-013 (Configuracion estructura institucional) | Si decide N RTs custom: nueva UI. |
| Q5 | CAP-CUR-016 (potencialmente) | Si llegan los 4 RTs: actualizar formularios. |
| Q10 | Todas las CAP-CUR con enums en UI | Cambio cosmetico en filtros y formularios. |

### Q ↔ Decisions formales

| Decision | Estado | Fecha |
|----------|--------|-------|
| [DECISION-001](../../decisions/DECISION-mod-unico-curriculum-design.md) | ✅ accepted — mod unico curriculum-design | 2026-04-27 |
| [DECISION-002](../../decisions/DECISION-org-unit-defer.md) | ✅ accepted — postergar OrgUnit | 2026-04-27 |
| ~~[DECISION-003](../../decisions/DECISION-003-tenant-ids.md)~~ | ⚠️ superseded por DECISION-011 — UNIVALLE + AIEP | 2026-04-27 |
| [DECISION-004](../../decisions/DECISION-004-externalid-single-field.md) | ✅ accepted — externalId 1 solo campo (data lake unifica) | 2026-04-28 |
| [DECISION-005](../../decisions/DECISION-005-workflow-state-defer.md) | ✅ accepted — workflowState postergado a sprint futuro | 2026-04-28 |
| [DECISION-006](../../decisions/DECISION-006-custom-section-fixed-rt.md) | ✅ accepted — CustomSection 1 RT fijo + Extensions para custom | 2026-04-28 |
| [DECISION-007](../../decisions/DECISION-007-recordtypes-global.md) | ✅ accepted — RTs globales, NO per-tenant | 2026-04-28 |
| [DECISION-008](../../decisions/DECISION-008-draft-rts-defer.md) | ✅ accepted — RTs draft sin campos quedan postergados | 2026-04-28 |
| ~~[DECISION-009](../../decisions/DECISION-009-use-existing-tenants.md)~~ | ⚠️ superseded por DECISION-012 — TEST + UPU (sugerido reunion) | 2026-04-28 |
| ~~[DECISION-010](../../decisions/DECISION-010-revert-to-dedicated-tenants.md)~~ | ⚠️ superseded por DECISION-012 — revertir UNIVALLE + AIEP | 2026-04-28 |
| ~~[DECISION-011](../../decisions/DECISION-011-final-use-test-upu.md)~~ | ⚠️ superseded por DECISION-012 — TEST + UPU (analisis coexistencia) | 2026-04-28 |
| **[DECISION-012](../../decisions/DECISION-012-two-phase-tenant-rollout.md)** | ✅ **accepted FINAL** — Rollout 2 fases (F1 SP2 solo UPU; F2 separar) | **2026-04-28** |

### Q ↔ Tickets DKC

| Q | Ticket DKC |
|---|-----------|
| Q1, Q2, Q3, Q4, Q5, Q7, Q10 | [TICKET-006](../../tickets/ticket-006.md) (modelado de objetos) |
| Q5, Q9 | [TICKET-007](../../tickets/ticket-007.md) (listado) |
| Q3, Q5, Q10 | [TICKET-009](../../tickets/ticket-009.md) (detail) |
| Q6, Q8 | (ticket futuro: ETL migracion AIEP) |
| Q2, Q9 | (ticket futuro: CAP-CUR-019) |
| Q3 | (ticket futuro: CAP-CUR-013) |

### Q ↔ Tickets Jira (UPONE) sugeridos para sprint futuro+

| # | Ticket sugerido | Depende de |
|---|----------------|-----------|
| 1 | Migracion de schema post-resolucion | Q1, Q2, Q4, Q10 |
| 2 | Implementacion CAP-CUR-019 (workflow del programa) | Q2, Q9, Q10 |
| 3 | Implementacion CAP-CUR-013 (config estructura institucional) | Q3 |
| 4 | ETL migracion AIEP legacy | Q6, Q8 |
| 5 | Definir convencion enum casing oficial up1 | Q10 |

### Bibliografia / Fuentes

| Documento | Ubicacion | Q relacionadas |
|-----------|-----------|---------------|
| Modelo de objetos de negocio Learning Assurance | Confluence id `2038366242` | Q1, Q2, Q3, Q4, Q5, Q7, Q9, Q10 |
| ejemplos-cursos-legacy-univalle-aiep_v2.md | Doc v2.2, 2026-04-25 | Todas (Q1..Q10) |
| AGENTS.md | [references/AGENTS.md](references/AGENTS.md) | Q1, Q10 |
| EXAMPLES.md | [references/EXAMPLES.md](references/EXAMPLES.md) | Q10 |
| Bases del core | `up1/object-manager/objects/business/Base/*.json` | Q1, Q2, Q4, Q10 (validados) |
| RecordTypes existentes | `up1/object-manager/objects/business/RecordTypes/*.json` | Q3, Q5 (sin precedente) |
| Legacy AIEP (`imp_competencies`, `imp_courseunit_expectedlearning`) | DB legacy | Q6 |

---

## Resolucion (cuando se resuelva una pregunta)

1. Actualizar el spec correspondiente (programa-de-asignatura.md, BR, CAP, etc.).
2. Marcar la pregunta como `resolved` con el ID del ticket o nota que la resolvio.
3. Si la resolucion implica refactor del schema o seed, levantar un ticket nuevo en Jira.
4. Formalizar como `DECISION-XXX` si la decision tiene impacto arquitectonico.
5. Actualizar la tabla de [Referencias cruzadas](#referencias-cruzadas).
