---
id: SPEC-021-academic-program-object
project: up1
ticket: TICKET-059
status: done
---

# AcademicProgram — objeto nuevo en curriculum-design (v1 CRUD plano)

# AcademicProgram — objeto nuevo en curriculum-design (v1 CRUD plano)

## Executive summary — lo que estas aprobando

**Que se quiere**: agregar el **programa académico** (la carrera, ej. "Ingeniería Civil") como objeto de negocio nuevo del mod `curriculum-design`, accesible en el menú de objetos junto a `Activity`, con sus 4 vistas (lista/detalle/crear/editar), traducciones y datos precargados. Es el primer incremento del objeto `academicProgram` del modelo Learning Assurance, deliberadamente mínimo: **sin workflow ni estados en v1** (recorte explícito del ticket UPONE-1260). Todo el cambio es aditivo y vive en el mod; object-manager solo regenera schema vía sync.

**Decisiones críticas que necesitan tu OK** (racional en secciones técnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | CRUD plano sin `workflowId`/`currentStatusId` en v1 | Es lo que pide el ticket. Evita resolver custom; reversible (agregar workflow después es aditivo). Ver DEC-LOCAL-01 |
| 2 | `uniqueConstraints: [["institutionId","code"]]` | El codegen lo traduce a `@@unique` automático; garantiza código único por institución sin trabajo extra |
| 3 | Enums cerrados con codes en inglés + labels por i18n (`degree`, `modality`) | Sigue la convención del mod (Activity); labels en español vía `es_CL@AcademicProgram.json` |
| 4 | Tolerar que el select de FK de OrgUnit no filtre por `recordType` | Limitación del layout-engine (H5). Campos opcionales en v1; filtrado queda como Backlog B1 (should) |

**Riesgos principales y como los mitigamos**:

- **PascalCase mal escrito rompe el codegen en Linux (RULE-platform-006)** → naming verificado en cada artefacto (`AcademicProgram`, `default_AcademicProgram_*`, `defaultObjects: ["AcademicProgram"]`); gate de S1 valida que el modelo Prisma se generó.
- **object-manager no tiene hot-reload de typedefs del mod** → S1 incluye restart explícito tras el sync antes de validar GraphQL.
- **Seedear puede chocar con baseline/drift** → seed idempotente (busca antes de crear) colgado de Institution/OrgUnit ya existentes; sin `--accept-data-loss`.

**Que NO se hace en este ticket** (límites del scope):

- Relación a workflow (`workflowId`/`currentStatusId`) — diferida (decisión del ticket).
- Objeto hijo `curriculumPlan` ni versionado del programa — no existe aún en el mod.
- Filtrado del select de OrgUnit por `recordType` — Backlog B1.
- Componentes Vue custom — los 4 layouts usan el renderer genérico.

**Tamaño estimado**: 2 sessions (~3-5h efectivas). La más riesgosa es S1 (codegen/sync + validar el modelo generado); S2 es UI declarativa + seed.

**Como vas a saber que funciona**:

- Abro el menú de objetos y veo **AcademicProgram** junto a Activity; entro y veo la lista poblada con los programas del seed.
- Creo un programa nuevo desde la UI (name/code/degree/modality/institución) y se persiste y aparece en la lista.
- Activity y el resto de objetos del mod siguen funcionando (sin regresión).

---

## Purpose

Definir el objeto `AcademicProgram` en `mods/curriculum-design/objects/` (CRUD plano, FKs a `Institution` y `OrgUnit`, enums cerrados, `@@unique([institutionId, code])`, sin workflow), sus 4 layouts, i18n `es_CL`, su alta en `defaultObjects` y un seed idempotente en tenant UPU. El codegen del object-manager genera el modelo Prisma + GraphQL CRUD genérico; el menú y las vistas se arman declarativamente sin tocar código de suite/layout.

## Requirements

### REQ-01: Definición del objeto AcademicProgram

> **Que cambia**: aparece una entidad nueva `AcademicProgram` con campos descriptivos (name, code, degree, modality, nominalDuration), FKs a Institution y OrgUnit, enums cerrados y unicidad por institución+código — sin campos de workflow.
> **Por que**: el modelo Learning Assurance define la carrera como entidad raíz; es la base de todo el ticket.

El sistema MUST definir `AcademicProgram` en `objects/AcademicProgram.json` (PascalCase) con: `name` (string, req), `code` (string, req), `degree` (enum `[Bachelor,Master,Doctorate,Technical]`, req), `modality` (enum `[InPerson,Online,Hybrid]`, req), `nominalDuration` (number, opt), `institutionId` (FK→Institution, req), `governanceUnitId` (FK→OrgUnit, opt), `executionUnitId` (FK→OrgUnit, opt), `externalId` (string, opt); `metadata.uniqueConstraints: [["institutionId","code"]]`; SIN `workflowId`/`currentStatusId`. El codegen MUST generar el modelo Prisma con `@@unique([institutionId, code])` y el tipo GraphQL CRUD.

**Actor**: system
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: codegen genera el modelo
- **GIVEN** `objects/AcademicProgram.json` válido en el mod
- **WHEN** se corre `npm run sync` desde object-manager
- **THEN** el schema Prisma incluye `model AcademicProgram` con `@@unique([institutionId, code])`
- **AND** el tipo `AcademicProgram` es queryable vía GraphQL (introspection)

#### Scenario: FK type correcto (caso de error evitado)
- **GIVEN** `institutionId`/`governanceUnitId`/`executionUnitId` referencian objetos business
- **WHEN** se declaran como `"type": "string"` (RULE-mods-039)
- **THEN** el codegen no falla por type mismatch

#### Scenario: sin workflow
- **GIVEN** el objeto sin `workflowId`/`currentStatusId`
- **WHEN** se genera el CRUD
- **THEN** no se requiere resolver custom (CRUD genérico, como BibliographyReference)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, una query GraphQL `academicPrograms { id name }` responde sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | codegen ok | JSON válido | npm run sync | modelo Prisma generado | `model AcademicProgram` + `@@unique([institutionId, code])` presentes |
| 2 | GraphQL queryable | sync corrido + restart | introspection/query | tipo expuesto | `academicPrograms` resuelve `[]` o filas |

### REQ-02: Layouts de las 4 vistas

> **Que cambia**: el objeto tiene lista, detalle, crear y editar; los enums se muestran como select y las FKs como select de referencia.
> **Por que**: sin layouts el objeto no es usable desde la UI; el ticket pide "configuración de vista".

El sistema MUST proveer `config/layouts/default_AcademicProgram_{list,view,create,edit}.json` con `objectName: "AcademicProgram"`, `tenants: ["UPU"]`; list `layoutType: RecordList` con columnas (name, code, degree, modality, institutionId) + `relationDisplayFields: {Institution: "name"}`; view/create/edit `layoutType: RecordDetail`; enums (`degree`, `modality`) como `{"type":"select","native":true}`; FKs como campo con solo `label` (reference select).

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegación list→view→create
- **GIVEN** los 4 layouts sincronizados
- **WHEN** el usuario abre AcademicProgram y navega lista → detalle → crear
- **THEN** cada vista renderiza los campos definidos sin error

#### Scenario: enum como select
- **GIVEN** create layout con `degree`/`modality` como select native
- **WHEN** el usuario abre el formulario de creación
- **THEN** los campos muestran las opciones del enum

#### Scenario: FK reference select (limitación conocida)
- **GIVEN** `institutionId` declarado con solo label
- **WHEN** se abre create
- **THEN** se muestra un select con las instituciones; los OrgUnit no filtran por recordType (B1)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre AcademicProgram desde el menú, ve la lista, abre un registro y el formulario de creación con selects funcionales.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | render 4 vistas | layouts sync | navegar list/view/create/edit | sin error | campos renderizados |
| 2 | enum select | create layout | abrir form | opciones visibles | degree/modality como select |

### REQ-03: Internacionalización (i18n es_CL)

> **Que cambia**: las etiquetas de columnas y los valores de enum se ven en español.
> **Por que**: las etiquetas no deben quedar hardcoded (checklist de calidad de artefactos); el mod usa i18n por objeto.

El sistema MUST proveer `lang/es_CL@AcademicProgram.json` con `column.<field>` para cada campo y `enums.<field>.<EnumValue>` para los valores de `degree` y `modality`. Las labels de objeto (`label`/`labelPlural`) viven en `metadata` del objeto.

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: labels traducidas
- **GIVEN** `es_CL@AcademicProgram.json` con keys `column.*` y `enums.*`
- **WHEN** el usuario abre las vistas en locale es_CL
- **THEN** columnas y valores de enum se muestran en español (no las keys crudas)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la lista y el detalle, las etiquetas y los valores de degree/modality aparecen en español.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | i18n cargado | lang file sync | abrir vista | labels en español | "Modalidad", "Licenciatura", etc. |

### REQ-04: Visible en el menú de objetos

> **Que cambia**: AcademicProgram aparece en el menú de objetos junto a Activity.
> **Por que**: requisito explícito del ticket ("accesible en el menú, a la par de Activity").

El sistema MUST incluir `"AcademicProgram"` en `defaultObjects` de `config/app.json` para que `ObjectNavBar` lo muestre (junto al ya presente `Activity` y `BibliographyReference`).

**Actor**: user
**Layers**: frontend, config

#### Acceptance
**El usuario puede verificar que funciona**: el menú de objetos lista AcademicProgram y al clickear abre su lista.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | en el menú | defaultObjects + layout list | abrir ObjectNavBar | entrada visible | AcademicProgram navegable |

### REQ-05: Seed con datos precargados

> **Que cambia**: al abrir la lista se ven varios programas precargados (Univalle y AIEP), no una lista vacía.
> **Por que**: el ticket pide datos precargados para visualizar; facilita validación y demo.

El sistema MUST proveer `seed/_data-academicprogram.js` (enganchado en `seed/seed.js`) que crea de forma idempotente varios `AcademicProgram` en tenant UPU, colgados de las `Institution`/`OrgUnit` ya seedeadas: Univalle (Ingeniería Civil, Magíster en Matemática Aplicada, Doctorado en Ciencias) y AIEP (Ingeniería en Informática, Técnico en Redes).

**Actor**: system
**Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed idempotente
- **GIVEN** el seed engancha en seed.js
- **WHEN** se corre el sync/seed dos veces
- **THEN** no se duplican registros (busca por `[institutionId, code]` antes de crear)

#### Scenario: datos visibles
- **GIVEN** seed corrido en UPU
- **WHEN** el usuario abre la lista de AcademicProgram
- **THEN** ve los 5 programas (3 Univalle + 2 AIEP)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `reset-seed`, la lista muestra los programas de Univalle y AIEP.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | seed visible | seed corrido | abrir lista | filas presentes | 5 programas |
| 2 | idempotencia | seed 2x | re-correr | sin duplicados | conteo estable |

### REQ-PRESERVE-01: No romper objetos existentes del mod

> **Que cambia**: nada — Activity y el resto del mod siguen igual.
> **Por que**: el cambio toca codegen/seed compartidos; hay que probar que no regresiona.

El sistema MUST preservar el comportamiento de los objetos existentes del mod (Activity, BibliographyReference, CurricularSection, etc.): el codegen no falla, el menú sigue mostrando los objetos previos, y sus vistas funcionan.

**Actor**: user
**Layers**: backend, frontend

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, Activity abre y opera como antes; el codegen completa sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regresión menú | objeto nuevo agregado | abrir menú | objetos previos visibles | Activity + BibliographyReference siguen |
| 2 | codegen completo | sync con objeto nuevo | npm run sync | exit 0 | sin error de schema |

## Artifacts

### Models (METASPEC-json-object)

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| AcademicProgram | name | string | no | — | Nombre del programa |
| AcademicProgram | code | string | no | — | Código institucional |
| AcademicProgram | degree | string (enum) | no | — | Grado: Bachelor/Master/Doctorate/Technical |
| AcademicProgram | modality | string (enum) | no | — | Modalidad: InPerson/Online/Hybrid |
| AcademicProgram | nominalDuration | number | yes | — | Duración nominal |
| AcademicProgram | institutionId | string (FK) | no | — | FK → Institution |
| AcademicProgram | governanceUnitId | string (FK) | yes | — | FK → OrgUnit (gobierno) |
| AcademicProgram | executionUnitId | string (FK) | yes | — | FK → OrgUnit (ejecución) |
| AcademicProgram | externalId | string | yes | — | ID en sistema externo |

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------|
| AcademicProgram | Institution | belongsTo | institutionId | RESTRICT (default codegen) |
| AcademicProgram | OrgUnit | belongsTo | governanceUnitId | SET NULL (nullable) |
| AcademicProgram | OrgUnit | belongsTo | executionUnitId | SET NULL (nullable) |

**Indexes**:
| Columns | Type | Unique | Purpose |
|---------|------|--------|---------|
| institutionId, code | btree | si | Código único por institución (`@@unique`, generado por codegen) |

### Layouts (METASPEC-layout-config)

| Layout | objectName | layoutType | Notas |
|--------|-----------|------------|-------|
| default_AcademicProgram_list | AcademicProgram | RecordList | Columnas: name, code, degree, modality, institutionId; `relationDisplayFields: {Institution: "name"}`; `canCreate`, `openMode: "route"`, `associatedLayoutConfigs` → view/edit |
| default_AcademicProgram_view | AcademicProgram | RecordDetail | `mode: "view"`; todos los campos; FK como link estático |
| default_AcademicProgram_create | AcademicProgram | RecordDetail | `mode: "create"`; enums como select native; FK como reference select |
| default_AcademicProgram_edit | AcademicProgram | RecordDetail | `mode: "edit"`; idem create |

**Checklist de calidad de artefactos**:
- [x] Configuración declarativa, no hardcoded: labels y enums en `lang/es_CL@AcademicProgram.json`.
- [x] Cada artefacto tiene consumidor en este sprint: objeto ← layouts ← menú ← seed, todos en este spec.
- [x] Sin heurísticas por nombre: enums declarados como prop tipada en el objeto.

## Tasks

### Session 1 — Capa de datos: objeto + menú + codegen/sync [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `objects/AcademicProgram.json` (campos, enums, FKs string, uniqueConstraints, sin workflow) | REQ-01 | developer | — | mods/curriculum-design/objects/AcademicProgram.json | lint JSON + revisar shape vs BibliographyReference | git revert (archivo nuevo: rm) | DET-1, DET-2, RULE-platform-006, RULE-mods-039 | pending | 1 |
| S1.T2 | Agregar `"AcademicProgram"` a `defaultObjects` en `config/app.json` | REQ-04 | developer | S1.T1 | mods/curriculum-design/config/app.json | revisar array | git revert | DET-16, RULE-platform-006 | pending | 1 |
| S1.T3 | Correr `npm run sync` desde object-manager + restart; validar modelo Prisma (`@@unique`) + GraphQL introspection del tipo | REQ-01 | developer | S1.T2 | object-manager (sync) | grep `model AcademicProgram` en schema.prisma + query GraphQL | regenerar baseline (no accept-data-loss) | DET-13, RULE-mods-003 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, validar codegen + GraphQL, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Capa UI + datos precargados: layouts + i18n + seed [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear los 4 layouts `default_AcademicProgram_{list,view,create,edit}.json` (enums select, FK reference) | REQ-02 | developer | S1.GATE | mods/curriculum-design/config/layouts/default_AcademicProgram_list.json, _view.json, _create.json, _edit.json | lint JSON + render en UI | git revert (rm archivos) | DET-2, RULE-platform-006 | pending | 2 |
| S2.T2 | Crear `lang/es_CL@AcademicProgram.json` (column.* + enums.*) | REQ-03 | developer | S1.GATE | mods/curriculum-design/lang/es_CL@AcademicProgram.json | revisar keys vs campos/enums | git revert | DET-2 | pending | 2 |
| S2.T3 | Crear `seed/_data-academicprogram.js` + enganchar en `seed/seed.js` (idempotente, Univalle + AIEP) | REQ-05 | developer | S1.GATE | mods/curriculum-design/seed/_data-academicprogram.js, mods/curriculum-design/seed/seed.js | correr seed 2x sin duplicar | git revert | DET-2, RULE-mods-008, RULE-core-009 | pending | 2 |
| S2.T4 | `npm run sync` + restart + smoke UI (menú + CRUD + seed visible) + regresión Activity | REQ-02, REQ-05, REQ-PRESERVE-01 | reviewer | S2.T1, S2.T2, S2.T3 | object-manager (sync) + suite (UI) | screenshots CRUD/menú/seed + Activity ok | regenerar baseline | DET-7, DET-13, DET-23, RULE-mods-003 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir, smoke UI con evidencia, quality review, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision + screenshots | (no aplica) | DET-20, DET-23, DET-25 | pending | 2 |

### Task contract (detalle de las tasks con matices)

```
Task S1.T1: Crear objects/AcademicProgram.json
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/objects/AcademicProgram.json
- precondition: rama UPONE-1261-academic-program activa
- expected_output: JSON válido con title PascalCase, metadata (label/labelPlural/gender/defaultLayoutType/uniqueConstraints), properties (9 campos), required
- validation: lint JSON; comparar shape contra BibliographyReference.json
- rollback: rm del archivo (es nuevo)
- rules: [DET-1, DET-2, RULE-platform-006, RULE-mods-039]

Task S1.T3: sync + validar
- source_ref: REQ-01
- agent: developer
- files: (ejecuta sync en object-manager; no edita)
- precondition: S1.T2 done
- expected_output: schema.prisma con model AcademicProgram + @@unique([institutionId, code]); GraphQL expone el tipo
- validation: grep en schema generado + query introspection; reiniciar object-manager antes de validar GraphQL (no hot-reload)
- rollback: regenerar baseline (NO --accept-data-loss)
- rules: [DET-13, RULE-mods-003]

Task S2.T3: seed
- source_ref: REQ-05
- agent: developer
- files: mods/curriculum-design/seed/_data-academicprogram.js, seed/seed.js
- precondition: objeto generado (S1.GATE)
- expected_output: 5 AcademicProgram en UPU colgados de Institution UV/AIEP y OrgUnit existentes (ej. UV-DEPT-MAT); idempotente por [institutionId, code]
- validation: correr seed 2x, conteo estable; visible en lista
- rollback: git revert + limpiar filas seedeadas si aplica
- rules: [DET-2, RULE-mods-008, RULE-core-009]
```

## Constraints

- RULE-platform-006: PascalCase obligatorio — `AcademicProgram` en title/filenames/objectName/defaultObjects. Lowercase rompe codegen en Linux.
- RULE-mods-003: `npm run sync` tras cualquier cambio del mod.
- RULE-mods-008: seed con FK por relación; usar Prisma per-tenant.
- RULE-mods-039: FK a objetos business → `"type": "string"` (Institution, OrgUnit).
- RULE-core-009: Prisma per-tenant sin `tenantId`.
- RULE-dev-005: esta spec vive tracked en `specs/curriculum-design/` (cumplido).
- RULE-dev-006: si se mergea a develop, regenerar codegen + sync:logic y verificar arranque.
- DECISION-001 (mod-unico-curriculum-design): el objeto va dentro del mod.
- DECISION-005 (workflow-state-defer): precedente del deferral de workflow (se opta por CRUD plano).
- DECISION-012 (two-phase-tenant-rollout): seed en tenant UPU.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager codegen/sync | internal | Genera Prisma + GraphQL desde objects/*.json | Si falla el sync, el objeto no existe en runtime |
| Institution/OrgUnit seedeados (UPU) | internal | El seed cuelga los programas de estos | Si no existen, el seed de AcademicProgram no encuentra FKs (mitigado: seed.js los crea antes) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| PascalCase mal escrito rompe codegen en Linux | medium | high | Naming verificado en todos los artefactos; S1.GATE valida modelo generado |
| object-manager no refleja el objeto sin restart | high | medium | S1.T3 incluye restart explícito antes de validar GraphQL |
| Select de OrgUnit muestra todos sin filtrar recordType | high | low | Tolerado v1 (campos opcionales); Backlog B1 |
| Seed duplica o choca con baseline | low | medium | Idempotente por [institutionId, code]; sin --accept-data-loss |

## Open questions

(ninguna — convergidas en intake-explore)

## Decisions

### DEC-LOCAL-01: CRUD plano sin workflow en v1
- **Contexto**: el objeto canónico `academicProgram` exige `workflowId`+`currentStatusId`; el ticket recorta workflow para v1.
- **Drivers**: requisito explícito del ticket; minimizar superficie; reversibilidad.
- **Opción elegida**: definir el objeto sin campos de workflow ni campo de estado (CRUD genérico).
- **Alternativas**: enum provisional `workflowState` default "Draft" (patrón de Activity en DECISION-005) — descartada por no aportar valor en v1 y agregar un campo que luego habría que migrar.
- **Consecuencias**: gana simplicidad y entrega rápida; pierde lifecycle (se agrega después, aditivo).
- **Session**: intake (S0) / confirmada con el dev.

## Technical reference

- Plantilla base del objeto: `mods/curriculum-design/objects/BibliographyReference.json` (único CRUD sin workflow).
- Codegen de uniqueConstraints: `object-manager/src/services/codegen/generatePrismaSchema.js` (líneas ~520-535, ~975-979).
- Menú: `suite/composables/useObjectManager.ts` (`getLayoutsForApp`) + `suite/components/static/ObjectNavBar.vue`.
- Layouts de referencia: `config/layouts/default_BibliographyReference_{list,view,create,edit}.json`.
- Seed: `seed/seed.js` (entrypoint) + `seed/_data-univalle.js` (Institution UV upsert por code, OrgUnit `UV-DEPT-MAT` findFirst). Comando: `npm run sync` desde object-manager.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan; AcademicProgram CRUD-able desde UI.
- [ ] **Tests**: smoke UI con evidencia (screenshots) de menú/CRUD/seed.
- [ ] **Rules**: PascalCase, sync, FK types respetados.
- [ ] **Integration**: Activity y objetos previos sin regresión (REQ-PRESERVE-01).
- [ ] **Docs**: i18n provisto; spec tracked.

## Acceptance checkpoints — backlog

- B1 (should): filtrar select de OrgUnit por recordType en layouts (no bloquea cierre).
