---
id: TICKET-006
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1033
module: curriculum-design
autopilot: manual
---

# Configuracion de objetos del agregado Programa de asignatura

## Request

Configurar **los 4 objetos base** del agregado Programa de asignatura en un nuevo mod `curriculum-design`. **Strict scope** segun el ticket Jira UPONE-1033 — NO incluye RecordTypes especificos.

## Objetos a modelar (4)

1. **`AcademicActivity`** (raiz del programa) — campos: `name`, `code`, `version`, `recordType` ("Course"), `description`, `credits`, `programLevel`, `workflowState` (string sin enum cerrado en SP1, ver [Q2](../specs/curriculum-design/open-questions.md#q2)), `language`, `previousVersionId` (nullable, self-FK), `externalId` (nullable, ver [Q1](../specs/curriculum-design/open-questions.md#q1)), `executionUnitId` (nullable, FK postergada a OrgUnit segun DECISION-002), `createdAt`, `updatedAt`.

2. **`CurricularSection`** — **SOLO campos comunes** del objeto base polimorfico (NO los RTs especificos). Campos: `ownerType` (enum: AcademicActivity, Offering), `ownerId` (string sin isForeignKey, polimorfico), `recordType` (string libre — sin enum cerrado en SP1), `sectionType` (enum: Structural, Complementary), `name`, `position`, `isVisible`, `isRequired`, `isSynchronizable`, `sourceId` (nullable).
   > **NO crear archivos `rt__<RT>__curricularsection.json` en este ticket**. Los RTs (Modality, LearningOutcome, Session, EvaluationComponent, Content, Bibliography, CustomSection, etc.) se declaran en TICKET-009 (UPONE-1035) segun el subset que el detail layout necesite. Ver [Q11..Q14 en open-questions](../specs/curriculum-design/open-questions.md).

3. **`CurricularLink`** — `sourceSectionId` (FK CurricularSection), `targetSectionId` (FK CurricularSection), `linkType` (string — sin enum cerrado en SP1), `notes`, `position`.

4. **`BibliographyReference`** — `institutionId` (FK Institution core), `rawCitation` (required), `title`, `author`, `year`, `publisher`, `publicationPlace`, `edition`, `referenceFormat` (string — sin enum cerrado en SP1, ver [Q4](../specs/curriculum-design/open-questions.md#q4)), `isbn`, `doi`, `url`, `metadata` (JSON).

## Pre-requisito (FUERA del scope del ticket — antes de empezar)

Tenant para SP1 (Fase 1): `UPU` (existente). Ver [DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) (FINAL).

**NO ejecutar** `npm run tenant:create`. Solo validar:
- `up1/object-manager/objects/tenants/UPU/` existe
- `.env` tiene `DATABASE_URL_UPU`

**Plan en 2 fases** ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md)):
- **Fase 1 (este ticket)**: cargar AMBOS data sets (Univalle + AIEP) en `UPU`. Validar modelo + funcionalidad. NO se prueba aislamiento multi-tenant porque SP1 no usa Extensions ni capabilities por tenant.
- **Fase 2 (post-SP1)**: separar por tenant. TCs de aislamiento estan marcados `deferred to Phase 2`.

## Estructura del mod

`up1/mods/curriculum-design/`:
- `config/app.json` con:
  - `tenants: ["UPU"]` — sin esto el mod no aparece en sidebar (rule-mods-007). En Fase 2 se amplia.
  - `defaultObjects: ["AcademicActivity", "CurricularSection", "CurricularLink", "BibliographyReference"]`
- `objects/` con los 4 JSON
- `seed/` con datos **minimos** (cargan ambos data sets en UPU sin condicional):
  ```
  seed/
  ├── seed.js              — entrypoint; invoca loadUnivalle() y loadAiep() en UPU
  ├── data-univalle.js     — exporta loadUnivalle(prisma): crea Institution UV + curso aa-uv-1124 con tenantId='UPU'
  └── data-aiep.js         — exporta loadAiep(prisma): crea Institution AIEP + curso aa-aiep-14757 con tenantId='UPU'
  ```
  **Idempotencia obligatoria**: usar `upsert` en cada insercion (buena practica — Institution se comparte con seed core "uPlanner University" de UPU; los upserts del mod no destruyen las instancias preexistentes).

  En **Fase 2** los archivos `data-*.js` se reutilizan parametrizando `tenantId`; solo cambia `seed.js` para discriminar.

  El seed completo del legacy v2.2 (campos especificos por RT) **se carga en TICKET-009**.
- `lang/`, `css/`, `tests/` segun pattern up1

## Validacion

- `npm run sync` (desde `up1/`) + `npm run codegen` sin errores
- GraphQL accessible
- Seed carga sin errores en `UPU` (idempotente — re-ejecutar no rompe):
  - Login con `X-Tenant-ID: UPU` → listado de AcademicActivity muestra **2 filas**: "Ecuaciones Diferenciales" (Univalle) + "Introduccion a las Redes" (AIEP)
  - Click en "Ecuaciones Diferenciales" → detail con secciones de Univalle (campos comunes en este ticket; los RTs especificos van en TICKET-009)
  - Click en "Introduccion a las Redes" → detail con secciones de AIEP
  - Identificacion del cliente por `name`/`externalId`/`Institution.code` (NO por TENANT_ID)
- Mod NO aparece en sidebar de TEST (validar que `tenants:["UPU"]` se respeta)
- El seed core de UPU sigue intacto ("uPlanner University", 100 personas, etc. — `upsert` defensivo en `Institution`)
- El mod aparece en el sidebar de **UPU** (no en TEST)

**Riesgo aceptado en Fase 1**: el filtrado por `tenantId` se valida solo a nivel schema (TC-006-08: campo `tenantId` inyectado en Prisma por codegen). El comportamiento runtime de aislamiento entre tenants se valida en Fase 2.

## Cobertura de capabilities Confluence

- CAP-CUR-014 (Crear programa de curso) — modela el sustrato (`AcademicActivity`)
- Parcial CAP-CUR-015/016/017 — modela el contenedor `CurricularSection`, pero los formularios especificos por RT viven en TICKET-009

## Excluido en SP1 (sprint actual)

- RecordTypes de `CurricularSection` (van en TICKET-009)
- Validaciones de workflow (CAP-CUR-019)
- Versionamiento activo (CAP-CUR-018)
- Clonacion (CAP-CUR-022)
- Configuracion estructura institucional (CAP-CUR-013)

## Dependencias verificadas

- Plataforma RecordTypes ([UPONE-938/940](https://u-planner.atlassian.net/browse/UPONE-940)) Finalizada — disponible para TICKET-009.
- Institution existe como objeto core en `up1/object-manager/objects/business/Base/institution.json`
- OrgUnit NO existe — campo `executionUnitId` queda nullable (DECISION-002).

## Open questions relevantes (sin decision en este ticket)

- [Q1](../specs/curriculum-design/open-questions.md#q1): externalId 1 vs 2 campos — postura SP1: 1 campo
- [Q2](../specs/curriculum-design/open-questions.md#q2): workflowState valores y casing — postura SP1: string libre
- [Q4](../specs/curriculum-design/open-questions.md#q4): referenceFormat enum — postura SP1: string libre
- [Q10](../specs/curriculum-design/open-questions.md#q10): casing enums — postura SP1: PascalCase para enums declarados, UPPER_SNAKE como propuesta a confirmar

Link Jira: UPONE-1033 (sprint Migracion uAssessment - SP1, asignado a Eduardo Bacon, prioridad Mayor).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|

### Context found

#### Knowledge Base — alta prioridad (leer antes de comenzar)

| Tipo | Path | Por que es relevante |
|------|------|---------------------|
| meta-spec | [meta-specs/METASPEC-mod.md](../meta-specs/METASPEC-mod.md) | Estructura general de un mod (carpetas, archivos esperados) |
| meta-spec | [meta-specs/METASPEC-json-object.md](../meta-specs/METASPEC-json-object.md) | Como definir un objeto JSON: properties, types, FKs, validations |
| spec | [specs/mods/creation-guide.md](../specs/mods/creation-guide.md) (2197 lineas) | Guia completa con las 8 fases de sync del pipeline mod→core |
| spec | [specs/mods/objects-map.md](../specs/mods/objects-map.md) | Patrones de relacion mod↔core, FKs con objetos core como Institution |
| spec | [specs/curriculum-design/programa-de-asignatura.md](../specs/curriculum-design/programa-de-asignatura.md) | Modelo del agregado: 4 objetos + 7 RecordTypes con campos especificos |
| **spec (seed)** | [specs/curriculum-design/legacy-examples.md](../specs/curriculum-design/legacy-examples.md) | **Ejemplos legacy Univalle + AIEP — usar como SEED inicial del mod** |
| **spec (formato)** | [specs/curriculum-design/up1-modeling-guide.md](../specs/curriculum-design/up1-modeling-guide.md) | **Guia oficial de formato up1** aplicada al modelado de los 4 objetos + RTs. Reglas no negociables (no declarar id/createdAt/updatedAt, FK polimorfica, etc.) |
| **referencia verbatim** | [specs/curriculum-design/references/AGENTS.md](../specs/curriculum-design/references/AGENTS.md) | Doc oficial de formato up1 (entregado 2026-04-27). FUENTE DE VERDAD para schema |
| **referencia verbatim** | [specs/curriculum-design/references/EXAMPLES.md](../specs/curriculum-design/references/EXAMPLES.md) | Snippets canonicos: Enrollment (objeto mod) + Extended cliente |
| spec | [specs/curriculum-design/open-questions.md](../specs/curriculum-design/open-questions.md) | **10 preguntas abiertas (post-SP1)** con detalle, contexto, alternativas, posturas y impacto futuro |
| decision | [decisions/DECISION-mod-unico-curriculum-design.md](../decisions/DECISION-mod-unico-curriculum-design.md) | Por que un solo mod (no varios ni objetos core) |
| decision | [decisions/DECISION-org-unit-defer.md](../decisions/DECISION-org-unit-defer.md) | `executionUnitId` queda nullable, FK postergada |
| ticket cerrado | [tickets/ticket-001.md](ticket-001.md) | POC study-notes — patron end-to-end ya validado |

**Principio de modelado**: ceñirnos a lo que entrega el equipo funcional (Confluence + legacy v2.2). NO inventar campos ni decisiones. Discrepancias → [open-questions.md](../specs/curriculum-design/open-questions.md).

#### Rules de mods que aplican (must)

| Rule | Aplicacion concreta |
|------|---------------------|
| [rule-mods-001](../rules/mods/rule-mods-001.md) | Nunca modificar archivos synced en core — siempre editar en `mods/curriculum-design/` |
| [rule-mods-003](../rules/mods/rule-mods-003.md) | `npm run sync` obligatorio despues de cada cambio en mods |
| [rule-mods-007](../rules/mods/rule-mods-007.md) | `app.json` va en `config/app.json` singular con formato name/label/tenants/defaultObjects |
| [rule-mods-008](../rules/mods/rule-mods-008.md) | Seeds usan `connect` con relacion lowercase para FK (ej: `institution: { connect: { id: ... } }`) |
| [rule-mods-013](../rules/mods/rule-mods-013.md) | Dependencies de runtime peer van en `peerDependencies` |

#### Business rules del modelo (constraints obligatorios)

| BR | Implicacion en el modelado |
|----|----------------------------|
| [BR-MOD-001](../specs/curriculum-design/business-rules/BR-MOD-001.md) | **CRITICO**: NO declarar `studyPlanId` en `AcademicActivity`. Relacion plan↔curso via `PlanEntry` (no en este mod). |
| [BR-VER-001](../specs/curriculum-design/business-rules/BR-VER-001.md) | Modelar `previousVersionId` como self-FK opcional |
| [BR-INT-001](../specs/curriculum-design/business-rules/BR-INT-001.md) | Modelar `externalSystemId` + `externalRecordId` opcionales |
| [BR-MIG-001](../specs/curriculum-design/business-rules/BR-MIG-001.md) | Modelar `sourceId` + `isSynchronizable` en CurricularSection (soporta MADS futuro) |
| [BR-LIB-003](../specs/curriculum-design/business-rules/BR-LIB-003.md) | Modelar `isRequiredInAllSections` en RT LearningOutcome |
| [BR-TAX-002](../specs/curriculum-design/business-rules/BR-TAX-002.md) | Modelar `bloomLevel` (string nullable) en RT LearningOutcome |
| [BR-TNT-001](../specs/curriculum-design/business-rules/BR-TNT-001.md) | Confirmar que el codegen agrega `tenantId` automatico |

#### Capabilities cubiertas (parcialmente, segun cobertura SP1)

| CAP | Cobertura por este ticket |
|-----|---------------------------|
| [CAP-CUR-014](../specs/curriculum-design/capabilities/CAP-CUR-014.md) | Modela el sustrato (`AcademicActivity`) |
| [CAP-CUR-015](../specs/curriculum-design/capabilities/CAP-CUR-015.md) | Modela el RT `LearningOutcome` |
| [CAP-CUR-016](../specs/curriculum-design/capabilities/CAP-CUR-016.md) | Modela `CurricularSection` polimorfica |
| [CAP-CUR-017](../specs/curriculum-design/capabilities/CAP-CUR-017.md) | Modela el RT `Modality` |

#### Codebase (referencias clave)

| Path | Por que |
|------|---------|
| `up1/object-manager/objects/business/RecordTypes/rt__Student__core_user.json` | Ejemplo real de RecordType file-based — pattern a seguir |
| `up1/object-manager/objects/business/Base/institution.json` | Institution core — destino del FK `BibliographyReference.institutionId` |
| `up1/object-manager/docs/features/record-types.md` | Doc oficial del feature RecordTypes |
| `up1/object-manager/src/services/codegen/generatePrismaSchema.js` (~linea 2250) | Codegen que genera tabla 1:1 + GraphQL con herencia |
| `up1/mods/hello-world-mod/` | Mod template oficial (3 objetos) |
| `up1/mods/retention-wellbeing/` | Mod produccion (multi-objeto) |

#### Referencia opcional (consultar segun necesidad)

| Spec | Cuando consultarla |
|------|-------------------|
| [specs/mods/example-engagement.md](../specs/mods/example-engagement.md) (996 lineas) | Detalle de un mod real (retention-wellbeing) |
| [specs/mods/internals.md](../specs/mods/internals.md) (953 lineas) | Si surge duda sobre flujo interno de datos |
| [specs/mods/reference.md](../specs/mods/reference.md) (790 lineas) | Referencia tecnica completa |

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
| L1 | up1 NO genera fields GraphQL especificos por objeto (como `academicActivities`). El listado se hace via query generica `listInstances(name: "AcademicActivity")` que retorna `PaginatedInstancesResult { items, totalCount }`. Las queries especificas (ej: `wellbeingTimeBlockTemplates`) vienen de resolvers explicitos en `mods/<mod>/logic/`, no del codegen. Este mod (curriculum-design) en SP1 NO declara resolvers propios — opera con queries genericas + CRUD generico de la plataforma. | developer | — | refined | [RULE-core-008](../rules/core/rule-core-008.md) |
| L2 | El sync de up1 (Phase 3 Prisma Schema Update) falla con `prisma db push` cuando hay cambios destructivos (drop tablas/columnas). Workaround: ejecutar manualmente `npx prisma db push --schema prisma/<TENANT>/schema.prisma --accept-data-loss` para cada tenant impactado. En este caso UPU tenia tablas Cs*/Hw* del trabajo previo en UPONE-test-showcase (component-showcase + hello-world-mod) que develop NO incluye. Las tablas del seed core (Person, Faculty, etc. de uPlanner University) NO se destruyen — solo lo que sobra del schema actual. | developer | — | discarded | Workaround tactico de desarrollo, no patron general. Se mantiene en el ticket como referencia historica |
| L3 | Multi-tenancy en up1 NO usa campo `tenantId` en el schema Prisma — usa **DBs separadas por tenant** (DATABASE_URL_TEST, DATABASE_URL_UPU, etc.). El `tenantManager.getClient(tenantId)` retorna un PrismaClient apuntando a la DB del tenant. En seeds y resolvers NO se pasa `tenantId` en los datos: el cliente ya esta atado al tenant. (Este learn invalida BR-TNT-001 a nivel codigo runtime — el aislamiento por tenant es a nivel infraestructura DB, no a nivel filtro de query.) | developer | — | refined | [RULE-core-001](../rules/core/rule-core-001.md) + [DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) |
| L4 | El listado visual de objetos en suite (`/UPU/<Object>/RecordList/<layoutName>`) requiere un layout default registrado en `up1_layen_layout`. Sin layout, la suite muestra mensaje "no tiene objetos para mostrar" aunque los objetos existan en DB y schema. El layout es alcance de TICKET-007 (UPONE-1034). En TICKET-006 solo se valida via API/DB que los objetos estan disponibles. Engagement (retention-wellbeing) si funciona porque tiene sus layouts ya declarados. Para autoinscribir un mod nuevo en el listado generico de suite, necesita declarar layouts JSON en `mods/<mod>/config/layouts/`. | developer | — | discarded | Contexto operativo cubierto por [TICKET-007](./ticket-007.md). Sin reusabilidad como rule |
| L5 | Confluence Learning Assurance v1.2 (page 2038366242) lista 7 objetos "En implementación": organization, institution, orgUnit, academicActivity, curricularSection, bibliographyReference, curricularLink. La fuente de verdad NO es solo el modelo del PM — es Confluence. Antes de declarar campos required/nullable, enums, y FKs, validar contra la seccion correspondiente del Confluence. Discrepancias detectadas en mi primera version: workflowState y programLevel debian ser required y con enum PascalCase oficial, no UPPER_SNAKE provisorio. BibliographyReference faltaba doi y externalId. Organization no estaba modelado. | developer | — | refined | RULE-dev-007 |
| L6 | El sync de up1 (Phase 2 Merge) hace UNION entre el JSON del mod y el Base/ existente — no elimina campos que se quitaron del mod. Caso real: al quitar `publicationPlace` y `edition` del mod (alineacion Confluence) y re-correr sync, los campos persisten en `business/Base/bibliographyreference.json`, en `prisma/<TENANT>/schema.prisma`, y como columnas en DB (vacias). Los datos legacy se almacenan correctamente en `metadata` JSONB. Limpieza completa requeriria editar manualmente `business/Base/` (FUERA del alcance del mod, prohibido por feedback_up1_mod_scope) o un bug-fix en el sync. Workaround: aceptar deuda — las columnas vacias no afectan funcionalidad. | developer | — | refined | [RULE-mods-017](../rules/mods/rule-mods-017.md) (caso required[] del mismo patron UNION append-only) |
| L7 | El campo `icon` en `mods/<mod>/config/app.json` debe ser un nombre de Bootstrap Icons (`bi-mortarboard`, `bi-file-earmark-code`, etc.), NO SVG inline. La suite renderiza solo el formato bi-* via clase CSS. Si se pasa SVG inline (ej: lucide/feather encoded), la suite cae al placeholder de cubo. Mod retention-wellbeing y otros con SVG inline ven mismo problema (Confluence Learning Assurance no especifica formato — convencion practica de la suite). Catalogo de iconos: https://icons.getbootstrap.com/. Para curriculum-design se usa `bi-mortarboard` (birrete academico). | developer | — | refined | [RULE-layout-026](../rules/layout/rule-layout-026.md) (icon como clase CSS completa `bi-*`) |
| L8 | Extraccion de un mod de up1 a repo Bitbucket independiente (proceso completo). Estado de partida: directorio `mods/<mod>/` existe en working tree del monorepo, sin commitear (untracked en up1). Pasos: (1) Crear repo en bitbucket.org/uplanner/<mod> via UI (con default branch develop preferentemente). (2) cd up1/mods/<mod>; git init -b develop; git add .; git commit -m "UPONE-XXXX chore: scaffold inicial". (3) git remote add origin git@bitbucket.org:uplanner/<mod>.git; git push -u origin develop. (4) En monorepo: agregar `<mod>.git` al array `uPlannerMods` de up1/package.json; commit en branch del ticket. (5) Validar: git pull directo en mods/<mod> funciona, sync del monorepo procesa el mod. Notas: el monorepo NO usa git submodules — usa `npm run setup` (script propio) que clona desde `BITBUCKET_BASE_URL + uPlannerMods[]`. Sin lock de SHA. NO commitear archivos del mod en el repo del monorepo (quedan untracked, igual que los otros mods externos). | developer | — | refined | RULE-dev-008 |
| L9 | Cuando se cambia un campo de un mod (ej: quitar una columna) y se necesita propagar a Base/ y DB: el sync hace UNION append-only — no elimina campos retirados (ver L6). Workaround: borrar manualmente `up1/object-manager/objects/business/Base/<lowercase>.json`, dejar que sync regenere desde mod limpio. Despues `prisma db push --accept-data-loss --schema prisma/<TENANT>/schema.prisma --skip-generate` para aplicar drop de columnas. Probado con BibliographyReference (publicationPlace, edition movidos a metadata). Despues npm run sync para recargar seed con los datos remapeados. | developer | — | discarded | Workaround tactico complementario a L2/L6. Conocimiento incorporado en RULE-mods-017 |
| L10 | Apps registradas en `up1_suite_app` quedan huerfanas cuando un mod se desactiva o se elimina del repo. Caso real: component-showcase activo en UPONE-test-showcase → registrado en up1_suite_app de UPU. Al volver a develop (sin component-showcase), el registro persiste porque sync no limpia DB cuando un mod desaparece. Limpieza manual: prisma deleteMany en up1_suite_app_role (relaciones por appId) + prisma delete en up1_suite_app + rm -rf mods/<mod>/ residual. hello-world tambien queda huerfano de la misma forma cuando se mueve a ignoredMods. Es deuda del sync de plataforma — se pueden listar huerfanos comparando up1_suite_app.name vs (mods/* activos UNION mods en uPlannerMods). | developer | — | refined | BUG-platform-021 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

> **Nota retroactiva (2026-05-12)**: Este ticket es pre-DET-20 (sessions con gates) y pre-DET-22 (teach-close). Sessions no se registraron al ejecutar; el trabajo fluyo en ciclos no documentados de scaffold → sync → seed → validacion empirica. Lo que se entrego se reconstruye aqui desde los artefactos producidos (mod en disco, learns capturados, REQs declarados).

### Session 1 (retroactivo, 2026-04-27)

- Scaffold del mod `up1/mods/curriculum-design/` con estructura estandar (`config/`, `objects/`, `seed/`, `package.json`).
- Declaracion de los 4 objetos en `objects/business/Base/`: `academicactivity.json`, `curricularsection.json`, `curricularlink.json`, `bibliographyreference.json`.
- Alineacion con Confluence Learning Assurance v1.2 (page 2038366242): correccion de enums a PascalCase, identificacion de campos faltantes (doi, externalId en BibliographyReference), descarte de Organization.
- `app.json` con `tenants: ["UPU"]` (Fase 1 segun [DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md)) e `icon: "bi-mortarboard"`.
- Sync ejecutado, codegen Prisma + GraphQL exitoso, mod visible en sidebar de UPU.
- Seeds `data-univalle.js` y `data-aiep.js` cargados en UPU sin destruir seed core (uPlanner University).
- **Decision de cierre operativo**: validacion empirica manual cubre los REQs criticos (REQ-1, 2, 3, 4, 5, 12, 13, 15, 17). Tests automatizados (Vitest + Playwright) declarados en Coverage Map quedan como deuda tecnica formal — el mod opera en UPU y los siguientes tickets ([TICKET-007](./ticket-007.md), [TICKET-009](./ticket-009.md)) lo consumieron sin regresiones detectadas.

### Cierre formal (2026-05-12)

- Refinado de los 10 learns con cross-ref a rules existentes: 5 promoted, 3 discarded, 2 pending (L5 y L8 quedan anotados para captura futura como rule de proceso / docs/guides).
- Status `done → closed`, fecha `2026-05-12`.
- Spec ref agregado en frontmatter: `SPEC-curriculum-design-overview` (cubre el modelo de objetos del mod).

## Testing

> **Plan**: Fase 1 (este ticket) carga ambos data sets en `UPU` ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) FINAL). Aislamiento multi-tenant validado en Fase 2.
>
> **Identificacion en tests**: NUNCA asumir que `tenant === cliente`. Validar por **contenido distintivo** (`name`, `externalId`, `Institution.code`, volumen).
>
> **Foco de validacion**: los 4 objetos del mod. El seed core de UPU ("uPlanner University", 100 personas, etc.) es ruido visual ignorable — se valida solo coexistencia (idempotencia) como guardarrail secundario.

### Como diferenciar visualmente Univalle vs AIEP (ambos en mismo tenant UPU)

| Identificador | "Univalle" (en UPU) | "AIEP" (en UPU) |
|---------------|---------------------|----|
| `AcademicActivity.name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `AcademicActivity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `Institution.code` (FK desde Bibliography) | `UV` | `AIEP` |
| `Institution.name` | `"Universidad del Valle"` | `"AIEP"` |

**Listado de AcademicActivity en UPU muestra 2 filas** (los 2 cursos del mod). El tester identifica cada cliente por `name`. El listado NO mezcla con `Course` u otros objetos del seed core (objetos distintos en tablas distintas).

### Requisitos verificables

| REQ | Descripcion | Fuente |
|-----|-------------|--------|
| REQ-006-1 | Los 4 objetos JSON Schema declarados en `up1/object-manager/objects/business/Base/` (academicactivity, curricularsection, curricularlink, bibliographyreference) | spec programa-de-asignatura.md |
| REQ-006-2 | `app.json` con `tenants: ["UPU"]` (Fase 1) | rule-mods-007, DECISION-012 |
| REQ-006-3 | Mod aparece en sidebar de `UPU` | rule-mods-007 |
| REQ-006-4 | Codegen genera Prisma schema sin errores en `UPU` | platform UPONE-940 |
| REQ-006-5 | Codegen genera GraphQL types validos | platform UPONE-940 |
| REQ-006-6 | `tenantId` se inyecta automaticamente en cada Base (validacion a nivel schema; runtime se prueba en Fase 2) | BR-TNT-001 |
| REQ-006-7 | FK polimorfica `ownerType` + `ownerId` declarada sin `isForeignKey` (CurricularSection) | AGENTS.md, programa-de-asignatura.md |
| REQ-006-8 | Self-FK `previousVersionId` declarada como string nullable simple (AcademicActivity) | AGENTS.md |
| REQ-006-9 | `workflowState` enum minimo provisorio `["draft", "active", "suspended", "discontinue"]` | DECISION-005 |
| REQ-006-10 | `externalId` campo unico nullable | DECISION-004 |
| REQ-006-11 | `BibliographyReference.rawCitation` unico requerido (resto nullable) | programa-de-asignatura.md |
| REQ-006-12 | Seed `data-univalle.js` carga 1 AcademicActivity ("Ecuaciones Diferenciales") + N CurricularSection en `UPU` sin errores | seed.js del mod |
| REQ-006-13 | Seed `data-aiep.js` carga 1 AcademicActivity ("Introduccion a las Redes") + N CurricularSection en `UPU` sin errores | seed.js del mod |
| ~~REQ-006-14~~ | ~~Aislamiento por tenant — datos NO se cruzan~~ | **deferred to Phase 2** (BR-TNT-001 runtime) |
| REQ-006-15 | Listado generico de AcademicActivity en `UPU` muestra 2 filas (los 2 cursos del mod) | platform CRUD generico |
| REQ-006-16 | Idempotencia: re-ejecutar el seed NO duplica filas ni rompe `Institution` preexistente | upsert defensivo |
| REQ-006-17 | Guardarrail: el seed core de UPU ("uPlanner University") sigue intacto post-seed del mod | DECISION-012 (coexistencia) |
| **REQ-006-18** | **Activacion per-tenant: mod NO aparece en sidebar de TEST (donde no esta declarado en `tenants[]`)** | rule-mods-007 |

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-006-1 | TC-006-01 | Logic | pending |
| REQ-006-2 | TC-006-02 | Logic | pending |
| REQ-006-3 | TC-006-04 | Visual | pending |
| REQ-006-4 | TC-006-06 | Logic | pending |
| REQ-006-5 | TC-006-07 | Logic | pending |
| REQ-006-6 | TC-006-08 | Logic | pending |
| REQ-006-7 | TC-006-09, TC-006-10 | Logic | pending |
| REQ-006-8 | TC-006-11 | Logic | pending |
| REQ-006-9 | TC-006-12 | Logic | pending |
| REQ-006-10 | TC-006-13 | Logic | pending |
| REQ-006-11 | TC-006-14 | Logic | pending |
| REQ-006-12 | TC-006-15 | Logic | pending |
| REQ-006-13 | TC-006-16 | Logic | pending |
| REQ-006-14 (deferred) | TC-006-17, TC-006-18 | Logic | **deferred to Phase 2** |
| REQ-006-15 | TC-006-19 | Visual | pending |
| REQ-006-16 | TC-006-21 | Logic | pending |
| REQ-006-17 | TC-006-22 | Logic | pending |
| REQ-006-18 | TC-006-23 | Visual | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-006-01 | Los 4 archivos Base existen con metadata valida | REQ-006-1 | Logic | Mod creado en `up1/mods/curriculum-design/` | Listar archivos en `up1/object-manager/objects/business/Base/` que pertenezcan al mod; validar JSON schema draft-07; validar metadata (label, labelPlural, gender) | 4 archivos existen: `academicactivity.json`, `curricularsection.json`, `curricularlink.json`, `bibliographyreference.json` con metadata completa | | | pending |
| TC-006-02 | `app.json` declara `tenants:["UPU"]` (Fase 1) | REQ-006-2 | Logic | `up1/mods/curriculum-design/config/app.json` existe | Leer JSON; validar campo `tenants: ["UPU"]` | Lista exacta `["UPU"]` — DECISION-012 Fase 1 | | | pending |
| ~~TC-006-03~~ | ~~Mod visible en sidebar de TEST~~ | — | — | — | — | **N/A en Fase 1** — TEST no tiene el mod activado. Ver TC-006-23 (validacion inversa) | | | n/a |
| TC-006-04 | Mod visible en sidebar de UPU | REQ-006-3 | Visual | App levantada, login con `X-Tenant-ID: UPU` | Navegar a `/`, observar sidebar | Item "Curriculum Design" visible **junto a** los items previos del seed core (uPlanner University) | | screenshots/ticket-006.screenshots/ticket-006-sidebar-upu.png | pending |
| ~~TC-006-05~~ | ~~Codegen Prisma sin errores en TEST~~ | — | — | — | — | **N/A en Fase 1** — TEST no esta en `tenants[]` | | | n/a |
| TC-006-06 | Codegen Prisma sin errores en UPU | REQ-006-4 | Logic | Mod registrado en `tenants:["UPU"]` | Ejecutar `npm run sync` + `npm run codegen` para tenant UPU | Salida sin errores; archivo `prisma/UPU/schema.prisma` actualizado con los 4 modelos del mod (sin tocar tablas del seed core de UPU) | | | pending |
| TC-006-07 | Codegen GraphQL genera tipos | REQ-006-5 | Logic | Codegen completado | Inspeccionar archivos generados de GraphQL types | 4 types: `AcademicActivity`, `CurricularSection`, `CurricularLink`, `BibliographyReference` con sus campos | | | pending |
| TC-006-08 | `tenantId` inyectado en Prisma schema | REQ-006-6 | Logic | Schema generado | Buscar `tenantId` en `prisma/UPU/schema.prisma` | Campo `tenantId` presente en cada modelo del mod (validacion a nivel schema; runtime se prueba en Fase 2) | | | pending |
| TC-006-09 | FK polimorfica sin `isForeignKey` | REQ-006-7 | Logic | `curricularsection.json` declarado | Validar `ownerId` es `string` SIN `isForeignKey: true` | Schema valido para FK polimorfica | | | pending |
| TC-006-10 | `ownerType` enum cerrado | REQ-006-7 | Logic | `curricularsection.json` declarado | Validar `ownerType.enum` incluye `["AcademicActivity", "Offering"]` | Enum cerrado tal cual el spec | | | pending |
| TC-006-11 | Self-FK `previousVersionId` simple | REQ-006-8 | Logic | `academicactivity.json` declarado | Validar `previousVersionId` es `string` nullable, sin `relation: "self"` | Self-FK simple | | | pending |
| TC-006-12 | `workflowState` enum minimo | REQ-006-9 | Logic | `academicactivity.json` declarado | Inspeccionar `workflowState.enum` | Solo 4 valores `["draft", "active", "suspended", "discontinue"]` (DECISION-005 provisorio) | | | pending |
| TC-006-13 | `externalId` nullable | REQ-006-10 | Logic | `academicactivity.json` declarado | Inspeccionar `externalId` | Tipo `["string", "null"]`, sin unique constraint | | | pending |
| TC-006-14 | `rawCitation` unico requerido | REQ-006-11 | Logic | `bibliographyreference.json` declarado | Validar `required: ["rawCitation"]`; resto de campos nullable | Solo `rawCitation` obligatorio | | | pending |
| TC-006-15 | Seed Univalle carga en UPU | REQ-006-12 | Logic | Tenant UPU listo, schema migrado, seed core ya cargado | Ejecutar seed del mod en UPU — `seed.js` invoca `loadUnivalle()` | Inserta 1 AcademicActivity con `name="Ecuaciones Diferenciales"`, `externalId="aa-uv-1124"`, `tenantId="UPU"`. Crea/upserta Institution `code='UV'` sin destruir las preexistentes (uPlanner University). | | | pending |
| TC-006-16 | Seed AIEP carga en UPU (mismo tenant) | REQ-006-13 | Logic | Tenant UPU listo, `loadUnivalle()` ya ejecutado | `seed.js` invoca `loadAiep()` despues de Univalle | Inserta 1 AcademicActivity con `name="Introduccion a las Redes"`, `externalId="aa-aiep-14757"`, `tenantId="UPU"`. Crea/upserta Institution `code='AIEP'`. Univalle + uPlanner University ya cargadas siguen intactas. | | | pending |
| TC-006-17 | ~~Aislamiento Univalle→AIEP~~ | REQ-006-14 | Logic | — | Query con `X-Tenant-ID: <otro tenant>` buscando `externalId='aa-uv-1124'` | 404 / no encontrado | | | **deferred to Phase 2** |
| TC-006-18 | ~~Aislamiento AIEP→Univalle~~ | REQ-006-14 | Logic | — | Query con `X-Tenant-ID: <otro tenant>` buscando `externalId='aa-aiep-14757'` | 404 / no encontrado | | | **deferred to Phase 2** |
| TC-006-19 | Listado AcademicActivity en UPU muestra **2 filas** | REQ-006-15 | Visual | Login UPU, seed cargado | Navegar a `/curriculum-design/academicactivity` (CRUD generico) | Listado renderiza con **2 filas**: (a) `name="Ecuaciones Diferenciales"` (Univalle), (b) `name="Introduccion a las Redes"` (AIEP). Identificacion del cliente por nombre. | | screenshots/ticket-006.screenshots/ticket-006-list-academicactivity-2-rows-upu.png | pending |
| TC-006-21 | **Idempotencia**: re-ejecutar el seed NO duplica filas | REQ-006-16 | Logic | Seed ya ejecutado una vez en UPU | Re-ejecutar `npm run sync` (Phase 7 incluye seeds) | Cero duplicados en `academic_activity` (sigue siendo 2 filas), `curricular_section`. Institutions `code='UV'` y `code='AIEP'` siguen siendo 1 fila cada una (upsert defensivo). | | | pending |
| TC-006-22 | **Guardarrail**: seed core de UPU intacto | REQ-006-17 | Logic | Seed del mod cargado | Query post-seed: `SELECT COUNT(*) FROM person WHERE email LIKE 'person%@test.uplanner.com'` y `SELECT COUNT(*) FROM institution WHERE name='uPlanner University'` | Counts identicos al estado pre-seed-mod (100 personas, 1 institucion uPlanner University). El seed del mod NO destruyo nada del core. | | | pending |
| **TC-006-23** | **Activacion per-tenant: mod NO aparece en sidebar de TEST** | REQ-006-18 | Visual | App levantada, login con `X-Tenant-ID: TEST` | Navegar a `/`, observar sidebar | Item "Curriculum Design" **NO visible** en TEST (porque `tenants:["UPU"]` lo excluye). Confirma que `rule-mods-007` se respeta. | | screenshots/ticket-006.screenshots/ticket-006-sidebar-test-no-mod.png | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `tests/integration/schema-validation.test.ts` | integration | (pending) | TC-006-01, TC-006-02, TC-006-07 a TC-006-14 | Vitest (validacion JSON Schema + Prisma) |
| `tests/integration/seed-load.test.ts` | integration | (pending) | TC-006-15, TC-006-16, TC-006-21 | Vitest (Prisma client UPU; verifica idempotencia con re-ejecucion) |
| `tests/integration/seed-coexistence.test.ts` | integration | (pending) | TC-006-22 | Vitest (snapshot de tablas core antes/despues del seed del mod) |
| `tests/integration/tenant-isolation.test.ts` | integration | **deferred to Phase 2** | TC-006-17, TC-006-18 | Vitest |
| `tests/e2e/sidebar-and-list.spec.ts` | e2e | (pending) | TC-006-04, TC-006-19, TC-006-23 | Playwright + DKC config (screenshots aterrizan en `tickets/ticket-006.screenshots/`) |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Lint workspace | `npm run lint --workspaces` | (pending) | (pending) | (pending) |
| Type-check workspace | `npm run typecheck --workspaces` | (pending) | (pending) | (pending) |
| Tests existentes object-manager | `npm test --workspace=@uplanner/object-management-backend` | (pending) | (pending) | (pending) |
| Sync mods (no rompe otros) | `npm run sync` desde `up1/` | (pending) | (pending) | (pending) |
| Capabilities generation | `npm run capabilities:generate` para UPU | (pending) | (pending) | (pending) |
| **Seed core UPU intacto** | TC-006-22 | (snapshot pre) | (snapshot post) | (delta=0) |

## Summary

Mod `curriculum-design` creado y operativo en tenant **UPU** (Fase 1) con los 4 objetos base del agregado Programa de asignatura: **AcademicActivity, CurricularSection, CurricularLink, BibliographyReference**. Alineado con Confluence Learning Assurance v1.2 (PascalCase enums, FKs polimorficas con ownerType/ownerId sin isForeignKey, self-FK previousVersionId nullable simple, rawCitation unico requerido). Modelado provisorio de `workflowState` con enum minimo ([DECISION-005](../decisions/DECISION-005-workflow-state-defer.md) — refactor a workflow real planificado en [TICKET-018](./ticket-018.md) HU3).

**Lo que quedo entregado:**
- 4 archivos JSON Schema en `up1/mods/curriculum-design/objects/business/Base/`
- `config/app.json` con icon `bi-mortarboard`, `tenants:["UPU"]`
- 2 seeds (`data-univalle.js`, `data-aiep.js`) coexistiendo en mismo tenant UPU sin destruir seed core
- Codegen Prisma + GraphQL sin errores en UPU
- Mod extraido a repo Bitbucket independiente (`uplanner/curriculum-design`) y registrado en `uPlannerMods` del monorepo

**Lo que quedo como deuda tecnica formal:**
- Tests automatizados del Coverage Map (TC-006-01..23) en `pending` — validacion fue empirica/manual. La suite de tests cobertura unit + e2e con Playwright + DKC config se ejecuto retroactivamente en [TICKET-011](./ticket-011.md) (plan de pruebas baseline) y subsecuentes.
- Aislamiento multi-tenant (REQ-006-14, TC-006-17/18) deferred a Fase 2 segun DECISION-012. UP1 multi-tenancy resulto ser por **DBs separadas** (L3) — el riesgo de mezcla cross-tenant es a nivel infraestructura, no logica.
- 2 learns con valor reusable (L5 source-of-truth Confluence, L8 proceso extraccion mod a Bitbucket) quedan como `pending` de promotion a rule/guia operativa — fuera de alcance del cierre.

**Tickets consumidores que validaron el entregable indirectamente** (no detectaron regresiones en los objetos de TICKET-006): [TICKET-007](./ticket-007.md) (UPONE-1034, vista listado), [TICKET-009](./ticket-009.md) (UPONE-1035, vista detalle), [TICKET-010..017, 022](./) (cadena SP1 completa).

Por la fecha de creacion (2026-04-27), este ticket es **pre-DET-20** (sessions con gates) y **pre-DET-22** (teach-close) — no requiere produccion retroactiva de esos artefactos. El cierre formal del 2026-05-12 consiste en housekeeping: Summary, Sessions retroactivos, refinado de learns con cross-ref a rules.
