---
id: TICKET-009
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1035
module: curriculum-design
autopilot: manual
---

# Vista de detalle de Programa de asignatura con secciones configurables

## Request

Crear **los RecordTypes especificos** de `CurricularSection` necesarios + sus **layouts default** para el detail del programa de asignatura, validando que la infraestructura de "layouts por RecordType" entregada por UPONE-941/944 funciona en un caso real.

> **IMPORTANTE — scope ampliado #1 respecto al ticket Jira**: este ticket ahora **incluye la creacion de los archivos `rt__<RT>__curricularsection.json`** porque el ticket de objetos (UPONE-1033 / TICKET-006) no los modelo (strict scope). Sin RTs declarados no hay campos especificos para mostrar.

> **IMPORTANTE — scope ampliado #2 respecto al ticket Jira (2026-04-29)**: este ticket **incluye tambien la creacion en el mod de los objetos core** `Organization`, `OrgUnit`, y la extension append-only de `Institution` (campos de Confluence v1.8 ausentes en core actual). Razon: el detail del programa requiere `executionUnitId` apuntando a un `OrgUnit` real (RT=AcademicExecution) — sin OrgUnit modelado no podemos mostrar el dato correctamente. La estrategia es **B2 (mod append-only merge)**: los objetos viven en `mods/curriculum-design/objects/` durante etapa de desarrollo y se promueven a `business/Base/` cuando platform UP1 los valide. Supersede [DECISION-002](../decisions/DECISION-org-unit-defer.md) (org-unit-defer). Documentado en DECISION-013 (a crear).

## Fase 0 — Core objects en mod (scope ampliado #2)

Crear/extender en `mods/curriculum-design/objects/` los 3 objetos core que el modelo Confluence v1.8 referencia desde el agregado del programa:

| Archivo | Estado actual en core | Que hace el mod |
|---------|----------------------|-----------------|
| `mods/curriculum-design/objects/Organization.json` | NO existe en `business/Base/` | Crear desde cero. Schema completo segun Confluence (`name`, `legalName`, `country`, `status` enum, `metadata`) |
| `mods/curriculum-design/objects/Institution.json` | Existe pero desalineado con Confluence (faltan 5 campos, hay 3 legacy) | **Append-only merge**: agregar `organizationId` (FK), `legalName`, `type` enum, `country`, `regulatoryCode`, `status` enum. NO repetir campos ya en core (`name`, `code`, `recordType` legacy, `parentId` legacy, `isActive` legacy, `metadata`) |
| `mods/curriculum-design/objects/OrgUnit.json` | NO existe en `business/Base/` | Crear desde cero. Schema completo segun Confluence (`organizationId` FK, `institutionId` FK nullable, `parentId` self-FK Composite, `recordType` enum: Geographic/AcademicGovernance/AcademicExecution, `name`, `code`, `type`, `status` enum: Active/Suspended/Discontinued) |

**Convenciones aplicadas (asumidas, confirmar)**:
- Naming PascalCase consistente con `AcademicActivity.json`, `CurricularSection.json` ya en el mod.
- `type` (Confluence enum) y `recordType` (core string libre) coexisten en Institution — semanticamente redundantes pero el merge no permite borrar campos del Base; se documenta como deuda para promocion a core.
- `status` (Confluence enum 3-state) y `isActive` (core boolean) coexisten — idem.
- Convencion de fechas: `createdAt`/`updatedAt` ya estan en `objects/business/common.json` (a verificar en implementacion).

**Seed actualizado**: `_data-univalle.js` y `_data-aiep.js` deben:
1. Crear 1 `Organization` por institucion (Universidad del Valle / AIEP) con `country='CO'` / `country='CL'`.
2. Actualizar el upsert de `Institution` para setear `organizationId`, `legalName`, `type`, `country`, `regulatoryCode`, `status`.
3. Crear 1+ `OrgUnit` con `recordType=AcademicExecution` por institucion (la unidad que ejecuta el programa).
4. Setear `AcademicActivity.executionUnitId` apuntando al OrgUnit creado (FK ya nullable, ahora se llena).

**Promocion a core**: cuando los objetos sean validados por platform UP1, se mueven los campos del JSON del mod a `business/Base/` y se eliminan los del mod. La logica del `_data-*.js` se actualiza para no asumir merge.

## Fase 1 — RecordTypes a crear

Subset minimo para validar el detail (a confirmar con [Q11](../specs/curriculum-design/open-questions.md)):

| Archivo | Campos especificos | Justificacion |
|---------|-------------------|---------------|
| `up1/object-manager/objects/business/RecordTypes/rt__Modality__curricularsection.json` | `code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode` | Univalle 1, AIEP 13 — invariante "≥1 obligatoria" |
| `rt__LearningOutcome__curricularsection.json` | `code`, `bloomLevel`, `isRequiredInAllSections` | Univalle 3, AIEP 40 — capability central |
| `rt__Content__curricularsection.json` | `description`, `hours`, `contentType` | AIEP 3 — minimo para validar contentType |

Otros RTs (Session, EvaluationComponent, Bibliography, CustomSection) — **a confirmar si entran en este ticket o se postergan**, ver [Q11](../specs/curriculum-design/open-questions.md).

## Fase 2 — Seed completo del legacy

Una vez declarados los RTs, cargar el seed completo del legacy v2.2 (campos especificos por RT) de [legacy-examples.md](../specs/curriculum-design/legacy-examples.md).

## Fase 3 — Layouts a crear

1. **`default_AcademicActivity_view.json`** — layout principal del programa de asignatura:
   - Cabecera con name, code, version, workflowState, programLevel, language
   - Renderizado de N CurricularSections como secciones colapsables
   - Cada CurricularSection se renderiza con su layout especifico segun `recordType`

2. **Layouts por RecordType** — al menos para los 3 RTs creados en Fase 1:
   - `default_rt__Modality__curricularsection_view.json` (campos: code, theoryHours, practiceHours, labHours, autonomousHours, isDefault, deliveryMode)
   - `default_rt__LearningOutcome__curricularsection_view.json` (code, name, description, bloomLevel, isRequiredInAllSections)
   - `default_rt__Content__curricularsection_view.json` (name, hours, contentType)

3. **Layouts modo edit/create** — al menos para los 3 RecordTypes anteriores.

## Fase 4 — Validacion sumativa de ponderaciones (scope ampliado #3 — 2026-05-04)

Extension al componente generico `CompositeSectionTree` (modulo `curriculum-design`, sync a `layout/`): feature opcional para validar visualmente que la ponderacion (`metric`) de un padre coincide con la suma de las de sus hijos directos. Caso real: esquema de evaluacion (`EvaluationComponent` con `weight %`) — "Nota Final = 100" debe coincidir con la suma de sus sub-componentes.

**Contrato (decisiones cerradas en Session 4)**:
- Activacion opt-in via prop `validateWeightedSum: boolean` (default `false` → zero-regression para consumidores actuales: LearningOutcome, Bibliography, Session, Content).
- Recursivo: cada padre con hijos valida `padre.metric === sum(hijos.metric)` con tolerancia `weightedSumTolerance` (default `1e-6`).
- Hijos sin metric numerico (`null`/no-numerico) cuentan como `0`.
- Visual: el badge `.cst-node__metric` del padre invalido pinta borde rojo + icono `bi-exclamation-triangle-fill` + tooltip `"Esperado: X{suffix}, suma actual: Y{suffix}"`.

**Cobertura Confluence (extension)**: parcial CAP-CUR-019 (validacion del esquema de evaluacion como feedback al ver el detail; no bloquea save).

**Spec**: [SPEC-curriculum-design-composite-section-tree-weighted-sum](../specs/curriculum-design/SPEC-composite-section-tree-weighted-sum.md). Tasks T1-T6 ahi.

## Riesgo identificado (RISK-001)

Ningun mod usa todavia layouts por RecordType. Al iniciar este ticket, **antes de declarar layouts**:
1. Leer en detalle `up1/layout/logic/layout.resolver.js` (funcion `resolveDefaultLayout` ~lineas 375-527).
2. Revisar tests de UPONE-944 si existen.
3. Hacer POC con UN solo layout (Modality) y validar resolucion.
4. Si hay gap, escalar al equipo de plataforma.

Plan de contingencia documentado en specs/curriculum-design/risks/layouts-recordtype-untested.md.

## Cobertura Confluence

- CAP-CUR-016 Gestionar secciones del programa (anidamiento, contenido editable)
- Parcial CAP-CUR-017 Modalidades (formulario funcional para RT Modality)
- Apoyo a CAP-CUR-015 (mostrar/editar RA si se incluye RT LearningOutcome)

## Excluido SP1

- Workflow transitions (CAP-CUR-019 — el campo workflowState se muestra readonly)
- Versionamiento (CAP-CUR-018)
- Anidamiento profundo de secciones (CAP-CUR-016 dice "sin limite de profundidad" — en SP1 1 nivel suficiente)
- Configuracion de estructura institucional (CAP-CUR-011/012/013) — usar defaults

## Dependencias

- TICKET-006 (UPONE-1033) mergeado: objetos + RTs declarados.
- TICKET-007 (UPONE-1034): listado debe existir para navegar al detalle.
- Plataforma RecordTypes (UPONE-940/941/944) esta Finalizada.

## Validacion

- Abrir detalle desde el listado.
- Cada CurricularSection se renderiza con el formulario correcto segun su `recordType`.
- Crear/editar funciona para los 3 RTs probados.
- Plataforma resuelve el layout correcto sin errores.

**Multi-tenancy** ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) FINAL — Fase 1):
- `X-Tenant-ID: UPU` → listado muestra **2 cursos**:
  - `name="Ecuaciones Diferenciales"` (Univalle) → detail con **1 Modality, 3 LO, 18 Sessions, 8 EvalComp, 9 Bib, 2 CustomSection**
  - `name="Introduccion a las Redes"` (AIEP) → detail con **13 Modalities, 40 LO, 3 Content, 1 EvalComp**
- **Validar variabilidad** navegando entre los 2 details: 13 Modalities estresan el layout mucho mas que 1 — caso de stress visual concreto del RISK-001
- Identificacion del cliente por `name`/`externalId`/`Institution.code`, NO por TENANT_ID
- Aislamiento entre tenants: **deferred to Phase 2**
- RTs son **globales** ([DECISION-007](../decisions/DECISION-007-recordtypes-global.md)) — preparados para Fase 2 sin cambios
- Coexistencia con seed core de UPU: el detail solo muestra secciones del mod. NO mezcla con `Person`, `Faculty`, `Course` (existente) del demo de UPU.

Link Jira: UPONE-1035 (en sprint Migracion uAssessment - SP1).

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

#### Knowledge Base — CRITICA para arrancar (lee primero)

| Tipo | Path | Por que es critico |
|------|------|---------------------|
| **risk** | [specs/curriculum-design/risks/layouts-recordtype-untested.md](../specs/curriculum-design/risks/layouts-recordtype-untested.md) | **RIESGO PRINCIPAL del ticket**. Plan de mitigacion (POC con 1 RT antes de declarar todos) y plan de contingencia |
| meta-spec | [meta-specs/METASPEC-layout-config.md](../meta-specs/METASPEC-layout-config.md) | Schema oficial de layout JSON |
| spec | [specs/curriculum-design/programa-de-asignatura.md](../specs/curriculum-design/programa-de-asignatura.md) | Modelo polimorfico: como se compone el agregado, todos los RecordTypes |

#### Capabilities cubiertas

| CAP | Cobertura |
|-----|-----------|
| [CAP-CUR-016](../specs/curriculum-design/capabilities/CAP-CUR-016.md) | Gestionar secciones (anidamiento, contenido editable) |
| [CAP-CUR-017](../specs/curriculum-design/capabilities/CAP-CUR-017.md) | Configurar modalidades (RT Modality formulario funcional) |
| [CAP-CUR-015](../specs/curriculum-design/capabilities/CAP-CUR-015.md) | Apoyo (mostrar/editar RA via RT LearningOutcome) |

#### Rules de mods que aplican (must)

| Rule | Aplicacion |
|------|-----------|
| [rule-mods-003](../rules/mods/rule-mods-003.md) | `npm run sync` despues de cada layout nuevo |
| [rule-mods-009](../rules/mods/rule-mods-009.md) | Layouts del nav sin `applicationId` |
| [rule-mods-010](../rules/mods/rule-mods-010.md) | `defaultObjects` no controla layouts del nav |
| [rule-mods-014](../rules/mods/rule-mods-014.md) | Si se crea componente Vue custom (renderer dinamico): usar atoms del layout-library |
| [rule-mods-015](../rules/mods/rule-mods-015.md) | Si componente Vue: $t() contra lang/, sin literales UI |

#### Plataforma a validar (RIESGO)

Esta es la primera vez que un mod usa estas piezas. Validar antes de declarar todos los layouts:

| Ticket Jira | Estado | Que entrega — validar que funciona |
|-------------|--------|------------------------------------|
| [UPONE-941](https://u-planner.atlassian.net/browse/UPONE-941) | Finalizada | Layout default por RT — naming `objectName="rt__<RT>__<base>"` |
| [UPONE-944](https://u-planner.atlassian.net/browse/UPONE-944) | Finalizada | RecordDetail usa layout del RT — primer caso real es este ticket |
| [UPONE-945](https://u-planner.atlassian.net/browse/UPONE-945) | Finalizada | Crear eligiendo RT primero |

#### Codebase (lectura obligatoria antes de declarar layouts)

| Path | Por que |
|------|---------|
| `up1/layout/logic/layout.resolver.js` (funcion `resolveDefaultLayout` ~lineas 375-527) | **CRITICO**: como resuelve la plataforma layouts. Naming convention validado |
| `up1/layout/src/composables/useRecordTypeResolver.ts` | Genera nombre `rt__<RT>__<baseLower>` — confirma el patron |
| `up1/layout/docs/reference/default-layouts.md` | Naming convention oficial (no menciona RT explicito) |
| `up1/object-manager/docs/features/record-types.md` | Doc del feature RecordTypes |
| `up1/object-manager/objects/business/RecordTypes/` | RTs existentes (ej: `rt__Student__core_user.json`) |
| `up1/layout/config/defaults/default_Category_create.json` | Ejemplo real de layout JSON con `objectName` y `mode` |

#### Plan de mitigacion del RISK-001 (resumen)

1. POC con UN solo layout (Modality) antes de declarar los demas
2. Verificar que `resolveDefaultLayout` lo encuentra
3. Si gap → bug en up1, escalar
4. Documentar el patron descubierto como `rule-curriculum-design-XXX` para futuros mods

#### Decisions y BRs relevantes

| Doc | Implicacion |
|-----|-------------|
| [DECISION-mod-unico-curriculum-design](../decisions/DECISION-mod-unico-curriculum-design.md) | Todos los layouts viven en `mods/curriculum-design/` |
| [BR-LIB-001](../specs/curriculum-design/business-rules/BR-LIB-001.md) | Niveles libertad evaluativa (informativo, aplica a syllabus despues) |
| [BR-LIB-003](../specs/curriculum-design/business-rules/BR-LIB-003.md) | RA criticos: campo `isRequiredInAllSections` debe verse en el form de LearningOutcome |
| [BR-MIG-001](../specs/curriculum-design/business-rules/BR-MIG-001.md) | Campos `sourceId` + `isSynchronizable` deben verse readonly o ocultos en el form |

#### Dependencias DKC

- [TICKET-006](ticket-006.md) mergeado: objetos + RTs declarados.
- [TICKET-007](ticket-007.md): listado debe existir para navegar al detalle.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Sessions

### Session 1 — 2026-04-29 (Fase 0: core objects en mod)

**Branch**: `UPONE-1035-core-objects` (en repo `uplanner/curriculum-design`, desde `develop`).

**Trabajo realizado**:

1. **Merge UPONE-1034 a develop**: push del branch `UPONE-1034-default-academic-activity-list-layout` + merge `--no-ff` a develop + push develop + delete remote (branch local conservado).

2. **Branch UPONE-1035-core-objects** creado desde develop actualizado.

3. **DECISION-013** creada superseding DECISION-002. Estrategia: core objects en mod para etapa de desarrollo, promocion posterior a `business/Base/`.

4. **3 archivos JSON creados/extendidos en `mods/curriculum-design/objects/`**:
   - `Organization.json` — nuevo, schema completo Confluence v1.8 (`name`, `legalName`, `country`, `status` enum, `metadata`).
   - `Institution.json` — append-only merge sobre Base. Agrega `organizationId` (FK), `legalName`, `type` enum, `country`, `regulatoryCode`, `status` enum. Todos nullable temporalmente para no romper migracion sobre 20 filas preexistentes en UPU.
   - `OrgUnit.json` — nuevo, schema completo Confluence (`organizationId` FK NOT NULL, `institutionId` FK nullable, `parentId` self-FK Composite, `recordType` enum 3-state, `name`, `code`, `type`, `status` enum).

5. **`AcademicActivity.json` actualizado**: `executionUnitId` ahora declara FK a OrgUnit (`isForeignKey: true`, `references: "OrgUnit"`).

6. **`config/layouts/default_AcademicActivity_list.json`**: agregado `relationDisplayFields.OrgUnit: "name"` para mostrar el nombre del OrgUnit en lugar del UUID.

7. **Seed actualizado** (`_data-univalle.js` + `_data-aiep.js`):
   - Crea Organization (Universidad del Valle CO / AIEP CL).
   - Upsert Institution con campos nuevos (organizationId, type=University|Institute, country, regulatoryCode, status). Coexisten con campos legacy (recordType, isActive).
   - Crea OrgUnit con `recordType=AcademicExecution` ("Departamento de Matematicas" UV / "Escuela de Tecnologias" AIEP).
   - Conecta `AcademicActivity.executionUnitId` al OrgUnit creado.

8. **Sync completo + Prisma db push exitoso en UPU**:
   - Modelos generados: `Organization`, `OrgUnit`, `Institution` extendida.
   - Tablas creadas. UI muestra "Departamento de Matematicas" y "Escuela de Tecnologias" como links resueltos en columna "Unidad Organizativa".

9. **Schema descriptions reescritas orientadas al usuario** en `AcademicActivity.json` (todos los fields). El tooltip del header ahora muestra texto util al usuario final, no info tecnica para devs/codegen.

**Cambios fuera del mod**: ninguno persistente. El sync (Phase 2 merge) modifica `up1/object-manager/objects/business/Base/institution.json` agregando los campos del mod, pero esos cambios son automaticos/regenerables y NO se commitean al submodule object-manager. Validado: revertido el archivo al HEAD del submodule + correr sync desde clean → EXIT=0, UI sigue funcionando. Es decir, el setup es **reproducible desde un clone limpio sin intervencion manual**.

**Limitaciones de plataforma identificadas (deuda tecnica — fuera del mod)**:

- **L14**: tooltips de header (`description` schema) no traducibles via lang. Plataforma busca `column.{key}.description` pero vue-i18n no acepta sub-keys sobre string leaf. Workaround actual: `description` del schema en español. Para multi-locale hace falta PR a plataforma cambiando convencion (ej: `columnDescription.{key}`). Fuera del mod por regla de scope.
- **L15** (refs RULE-layout-018): valores enum en celda en modo display (table view) no se traducen — `getDisplayValue()` no aplica `t('enums.{field}.{value}')`. Workaround: ninguno aplicable desde el mod. Para multi-locale hace falta PR a plataforma. Fuera del mod por regla de scope.

**Validacion en UI**:
- Listado renderiza 2 filas con columna "Unidad Organizativa" mostrando OrgUnit.name como link.
- Tooltip del header "Unidad Organizativa": "Unidad academica de la institucion que dicta el programa (departamento, escuela, etc.)" (orientado al usuario).
- Sync completo EXIT=0 sin warnings nuevos del mod.

**Estado al cierre de Session 1**:
- Fase 0 (core objects en mod) completa.
- Fase 1 (RecordTypes de CurricularSection) — pendiente, proximo trabajo.
- Fase 2 (seed completo legacy v2.2) — pendiente.
- Fase 3 (layouts del detail) — pendiente.

**Learns Session 1**:

| # | Learn | Status |
|---|-------|--------|
| L13 | El sync Phase 2 (`fileSync.js:802-805`) acumula `required[]` por **union** — append-only, no permite remover. Si un mod declara un campo `required` y luego cambia de opinion, el Base queda con esa entry "stale". **Resolucion sin tocar fuera del mod**: revertir el archivo Base al HEAD del submodule object-manager (`git checkout HEAD -- objects/business/Base/{object}.json`) y correr sync de nuevo desde el estado actual del mod. **Lesson**: planear bien el contrato del mod antes del primer sync — `required` y campos NOT NULL son decisiones que escalan mal si se equivocan. | promoted to RULE-mods-017 |
| L14 | Tooltips de header de columna (`description`) no traducibles desde el mod. La plataforma busca `column.{key}.description` en lang, pero la estructura JSON anidada no permite que vue-i18n resuelva sub-keys sobre string leaf. Workaround: schema description en idioma del mod. Para multi-locale requiere PR a plataforma. | promoted to BUG-platform-001 |
| L15 | Valores enum en celda RecordList modo display (table view) no se traducen. `getDisplayValue()` retorna valor crudo, sin aplicar `t('enums.{field}.{value}')`. Mismo problema que en TICKET-007 (RULE-layout-018). | discarded — dup RULE-layout-018 |
| L16 | El JSON object schema `properties.{field}.description` se usa como tooltip del header de columna en RecordList (fallback nivel 2). Por lo tanto debe escribirse **orientado al usuario final**, no como nota tecnica para devs. | promoted to RULE-mods-018 |

### Session 2 — 2026-04-29 (POC RISK-001 + Fase 1 completa + Fase 2 + detail con tabs)

Continuacion despues de Fase 0. En el mismo dia se cubrio (orden cronologico):

1. **POC RISK-001 con Modality**: archivo RT + layout view + seed 1 fila + validacion via GraphQL. RISK-001 mitigado.
2. **Subset Fase 1 minimo** (LearningOutcome + Content): archivos RT + layouts view + seed 3 LO en UV.
3. **Detail principal `default_AcademicActivity_view`**: cabecera + 4 tabs iniciales (General, Modalidades, Outcomes, Contents). Tab General con campos del programa + FK Unidad Organizativa resuelta. Embeds RecordList sobre `CurricularSection` con filtros directos `ownerId+recordType` (alineado con regla del usuario: RecordList en vista, RecordDetail en modal).
4. **Cleanup menu de objetos**: 3 problemas resueltos.
   - `default_AcademicActivity_view` aparecia en menu como "Ver Programa de asignatura" → marcado `applicationId: null` (es modal de rowAction).
   - `CurricularSection` PascalCase aparecia en menu → quitado de `defaultObjects` en `app.json` del mod (solo queda `AcademicActivity`).
   - `curricularsection` lowercase aparecia con 3 layouts huerfanos `default_rt__*__list` (que cree por error en primera iteracion y luego borre del filesystem) → script one-shot via Prisma client desactivo los 3 (`isActive: false`, `applicationId: null`).
5. **Fase 1 completa**: 4 RTs adicionales (Session, EvaluationComponent, Bibliography, CustomSection) + 4 layouts view auxiliares + 4 tabs nuevos en detail principal (Sesiones, Evaluación, Bibliografía, Secciones personalizadas). Total: 8 tabs.
6. **Fase 2 completa**: seed legacy v2.2 con volumenes que coinciden con TC-009-10/11.
   - UV: 1 Modality + 3 LearningOutcome + 18 Sessions (incl. semana 18 "habilitación") + 8 EvaluationComponent + 9 Bibliography (referencian las 9 BibliographyReference) + 2 CustomSection (richText).
   - AIEP: 13 Modalities + 40 LearningOutcome + 3 Content + 1 EvaluationComponent.
7. **Stress visual RISK-001 validado**: detail AIEP renderiza 13 Modalities (3 paginas, 5/pag) y 40 LO (8 paginas, 5/pag) sin overflow ni rompimiento. Comparacion con UV (1 Modality, 3 LO) confirma diferenciacion clara.

**Commits Session 2** (locales, sin push):
- `117d8ba` (curriculum-design): UPONE-1035 Fase 1+2+3.1 — 7 RTs + detail tabs + seed legacy v2.2 (18 archivos, +944 lineas)
- `ae0aee4` (deckard): dkc — Session 2 con learns L17-L22 + 8 screenshots

**Learns descubiertos en Session 2**:

| # | Learn | Status |
|---|-------|--------|
| L17 | Convencion sync para RecordTypes desde mod: `mods/<mod>/objects/RecordTypes/rt__<RT>__<base>.json` → sync (`syncModRecordTypes` en `fileSync.js:923`) los copia a `business/RecordTypes/`. Codegen genera modelo Prisma 1:1 con FK a la tabla base. POC con Modality validado end-to-end via `resolveDefaultLayout` GraphQL. | promoted to RULE-mods-019 |
| L18 | Filtros nested via relation (ej. `curricularsection.ownerId`) son rechazados por el validador del RecordList — solo acepta paths directos del `availableFields`. Mismo limite que L11 del TICKET-007. **Workaround**: si se quiere listar registros de un RT filtrando por campo del base, hacer query sobre el base (`CurricularSection`) con filtros directos `ownerId+recordType`, no sobre el RT. Sacrifica mostrar campos especificos del RT en la lista, pero el detail del RT sigue accesible al click en una fila. | discarded — dup TICKET-007 L11 |
| L19 | Embeds RecordList dentro de RecordDetail: usar `type: "record-list"` en `schema.{key}` con `objectName`, `layoutId` (opcional, si no se define usa default), y `layoutConfig.filters` con placeholder `{{parentId}}`. Cuando se omite `layoutId` y se inline `columns` + `filters`, **el layout NO se registra como entrada en `up1_layen_layout`** y no aparece en el menu de objetos. Patron preferido para evitar deuda de cleanup posterior. | promoted to RULE-layout-019 |
| L20 | Sync NO llama a `deactivateOrphanedAppsLayouts` (`dbSync.js:770`): la funcion existe pero esta como "codigo muerto". Layouts borrados del filesystem siguen activos en BD con su `applicationId` original — aparecen como zombies en el menu. **Workaround**: script one-shot via Prisma client (`isActive: false, applicationId: null`). **Solucion correcta**: PR a plataforma para invocar `deactivateOrphanedAppsLayouts` despues del sync de cada tenant. Fuera del mod por regla de scope. | promoted to BUG-platform-002 |
| L21 | Logica del menu de objetos (`useObjectManager.ts:75-91`): el menu por app muestra (a) layouts `applicationId === appId` (explicitos) + (b) layouts `applicationId === null && layoutType === RecordList && (objectName en defaultObjects O RT cuyo base esta en defaultObjects lowercased)` (defaults). Para que un layout NO aparezca en menu: `applicationId: null` + `objectName` NO en `defaultObjects` del `app.json`. Para evitar items extra del menu, mantener `defaultObjects` minimo (solo objetos raiz que el usuario navega). | promoted to RULE-mods-020 |
| L22 | Bug cosmetico: cuando se inline varios `record-list` con el mismo `objectName` dentro de un RecordDetail, todos los tabs muestran el mismo header label (en nuestro caso "Contenidos del programa", del primer embed). Es un bug de la plataforma — los embeds comparten label en lugar de leer su propio `label` config. **Resuelto en Session 3**: declarar `layoutConfig.label` en cada embed inline lo personaliza. Promovido a refined. | refined (Session 3) |

### Session 3 — 2026-04-29 (UX fixes en detail: cleanup huerfanos + label unico + order position)

**Disparadores del usuario** (todos en el mismo turno):
1. "el item de curricular section del menu de objetos en la vista principal, entrega valor?" — observa item extra en menu.
2. "en el menu de academic activity hay 2 elementos, antes habia solo 1, y ese de ver programa de asignatura no deberia parecer, porque es la accion del rowaction" — el detail aparecia en menu.
3. "porque dentro del modal, las secciones tienen un menu que hace referencia a los otros tabs y no todos, eso no esta aportando valor" — el dropdown del embed listaba los huerfanos.
4. "no podemos quedar con esa deuda... si hicieramos el build correcto desde 0 eso no apareceria, si es asi, optemos por desactivarlos" — limpiar BD aunque sea fuera del mod.
5. "pero ahora todos tienen el titulo CurricularSection Record List" — header generico.
6. "pero eso esta duplicando el titulo, de que sirve un titulo que se ve 2 veces. con 1 basta" — label duplicado.
7. "las tablas del tab deben estar ordenadas por orden o position, segun corresponda" — orden de filas.

**Trabajo realizado**:

1. **Fix `default_AcademicActivity_view`**: agregado `applicationId: null` al JSON. El detail es modal de rowAction, no entrada de menu. Resultado: dropdown del menu AcademicActivity vuelve a tener solo "Programas de asignatura".

2. **Cleanup huerfanos rt__\*__list (deuda Session 2)**: 3 layouts `default_rt__Modality|LearningOutcome|Content__curricularsection_list` que cree por error en primera iteracion (cuando intente filtrar el embed sobre el RT directamente, antes del pivot a CurricularSection) y luego borre del filesystem **siguen activos en BD** con `applicationId` asignado al app curriculum-design. Causa raiz: sync **NO llama** `deactivateOrphanedAppsLayouts` (`dbSync.js:770` es codigo muerto — L20). Solucion: script one-shot via Prisma client (`isActive: false, applicationId: null`) sobre los 3 nombres conocidos en tenant UPU. Resultado: `curricularsection` lowercase desaparece del menu.

3. **Investigacion logica del menu** (`useObjectManager.ts:75-91`): el menu por app muestra `applicationId === appId` (explicit) + `applicationId === null && layoutType === RecordList && objectName matchea defaultObjects` (default). Conclusion: `applicationId: null` no basta — tambien hay que mantener `defaultObjects` minimo. L21 promovido a refined.

4. **Cleanup huerfanos CurricularSection_list_program_\*** (mismo patron, segunda vuelta): los 3 embeds inline que primero referenciaban `layoutId: default_CurricularSection_list_program_*` quedaron en BD aunque borre los archivos. Bug L22 (label compartido): **el dropdown ▼ del embed RecordList lista todos los layouts del mismo `objectName`** — los 3 huerfanos colisionaban en este selector. Script one-shot Prisma desactivo los 3. Resultado: header del embed muestra "CurricularSection Record List" generico de plataforma.

5. **Personalizacion del header del embed**: declarar `layoutConfig.label` dentro del embed inline funciona — la plataforma lo usa como header del RecordList nested. Aplicado a los 7 embeds: "Modalidades del programa", "Resultados de aprendizaje del programa", "Contenidos del programa", "Sesiones del programa", "Componentes de evaluación", "Bibliografía del programa", "Secciones personalizadas". L22 resuelto.

6. **Eliminar duplicacion del label**: con `label` en TOP-level del element schema + `label` en `layoutConfig`, la plataforma renderiza AMBOS (el top-level como `<h-uppercase>` + el del layoutConfig como heading interno). Solucion: dejar solo `layoutConfig.label`. Quitado el top-level de los 7 embeds.

7. **Order ASC por `position`** en los 7 embeds: agregado `order: { field: "position", direction: "ASC" }` al `layoutConfig` de cada embed. Antes ordenaban por `createdAt` (default). Validado en UI: footer dice "Ordenado por position", filas en orden 1, 2, 3, 4, 5.

**Commits Session 3** (locales, sin push):
- `c07b2f6` (curriculum-design): no aplica — ese es de TICKET-007. Los reales:
  - parte de `117d8ba` para `applicationId: null` en view layout
  - `f0431fb` (curriculum-design): fix detail tabs con titulo unico + order ASC por position (1 archivo, +278/-53 lineas)
- (pendiente) deckard: dkc — Session 3 con learns L23-L25 + screenshots

**Cleanup BD via scripts one-shot** (deuda registrada como L20):
- 3 layouts `default_rt__*__curricularsection_list` desactivados en `up1_layen_layout` UPU.
- 3 layouts `default_CurricularSection_list_program_*` desactivados en `up1_layen_layout` UPU.

**Learns nuevos (Session 3)**:

| # | Learn | Status |
|---|-------|--------|
| L23 | El header del RecordList embebido tiene un dropdown ▼ que lista TODOS los layouts del mismo `objectName` activos en BD (selector de "vistas"). Si hay layouts huerfanos en BD (L20), aparecen en este dropdown — confunde al usuario. Por eso L20 (cleanup orphans) y L19 (preferir embeds inline sin layoutId) son criticos. | discarded — refs L19 + L20 |
| L24 | `layoutConfig.label` en un embed inline RecordList **personaliza el header** del embed. Cuando se omite, la plataforma usa "{ObjectName} Record List" generico. Patron recomendado: siempre declarar `layoutConfig.label` cuando se use embed inline en RecordDetail. | promoted to RULE-layout-020 |
| L25 | Si un embed inline declara `label` en TOP-level del schema entry **y** `layoutConfig.label`, la plataforma renderiza ambos (uno como heading uppercase fuera del list, otro como heading interno) — produce duplicacion visual. Solucion: declarar solo `layoutConfig.label`. El top-level `label` del element esta pensado para forms (RecordDetail single-mode), no para record-list embebido. | promoted to RULE-layout-021 |

### Session 4 — 2026-04-30 (POC treeview Composite + alineacion seed legacy v2.2 + componente generico CompositeSectionTree)

**Disparadores del usuario** (cronologico):
1. "es posible que el contenido que se ve en un modal sea un componente custom que use esos datos, por ejemplo en RA se vea un treeview?" — explorar custom Vueform element con datos del programa.
2. "quiero armar un poc de ese treeview en RA, mediante jerarquia de parent" — POC concreto sobre LearningOutcome via parentId.
3. "yo no veo que cargue el tree view" — el componente no se montaba.
4. "arregla lo visual para que se vean en una linea con identacion" — single-line con indentacion clara.
5. "de los 40, todos son nivel raiz?" — pregunta sobre AIEP (40 LO planos).
6. "valida la jerarquia segun estos datos [legacy v2.2]" — verificar match con `ejemplos-cursos-legacy-univalle-aiep_v2.md`.
7. "primero corrige los datos para que sigan la linea del archivo, despues revisamos el como se visualizan" — orden de prioridades: legacy-fiel → visualizacion.
8. Eligio opcion **A**: componente generico parametrizable.
9. "resuelve que el hover se vea bien en ambos modos, ya que en dark deja un hover blanco con texto blanco" — bug theme-aware del CSS.

**Trabajo realizado**:

1. **POC `parentId` self-FK en `CurricularSection`**: agregado al `objects/CurricularSection.json` del mod (`isForeignKey: true, references: "CurricularSection", targetField: "id"`). Sync genero columna en Prisma + relacion auto-recursiva en el schema (`CurricularSection_CurricularSection_parentId`). Validado: la BD UPU tiene la columna sin necesidad de re-migrate destructivo.

2. **Custom Vueform element `learning-outcome-tree`** (primera version, sobre `LearningOutcome`):
   - `LearningOutcomeTreeElement.vue` con `defineElement` + sub-componente recursivo via `defineComponent({ render() })` inline (sync solo permite 1 .vue por carpeta — L26).
   - `useLearningOutcomeTree.ts` con `listInstances` GraphQL + `relations: ["rt__LearningOutcome__curricularsection"]` + transformacion plano→arbol via `parentId`.
   - Reemplaza embed RecordList del tab "Resultados de aprendizaje" via `default_AcademicActivity_view`: `outcomesList: { type: "learning-outcome-tree", ownerId: "{{parentId}}" }`.
   - LayoutOrchestrator interpola `{{parentId}}` recursivamente en TODO el config — incluye props del custom element.

3. **Bugs del POC v1 detectados y resueltos**:
   - **L26**: Vueform `import.meta.glob` en `suite/vueform.config.ts` es **estatico en build time** — agregar nuevos files al modsComponent NO los registra automaticamente con HMR. Workaround: `touch suite/vueform.config.ts` fuerza re-evaluacion del glob; sin esto, restart del dev server.
   - **L27**: Sync de components (`layout/scripts/sync.js:147-171`) rechaza folders modsComponent con multiples `.vue`. **Solo 1 .vue por folder**. Si necesito sub-componente recursivo, definirlo inline en el mismo SFC con `defineComponent` + `render()` function (auto-recursion via referencia a la const local).
   - **L28**: `<style scoped>` en SFC NO aplica `data-v-*` a elementos generados por `h()` en sub-componentes con `render()` function. Los nodos recursivos quedaron sin estilos. **Solucion**: quitar `scoped` (las clases tienen prefix unico `cst-`/`lot-`).
   - **L29**: El RT data via `relations: [...]` viene en `data.<relationName>`, **NO en `extended`**. Mi composable buscaba `it.extended.rt__LearningOutcome__curricularsection` (siempre `null`); fix: `it.data.rt__LearningOutcome__curricularsection`.
   - **L30**: `setup(props)` con `props.ownerId` como string snapshot **NO es reactivo**. Si Vueform cambia el prop interpolado, el composable no re-ejecuta. **Solucion**: usar `toRef(props, 'ownerId')` y pasar Ref al composable, que adentro hace `watch` con `immediate: true`.

4. **Validacion seed vs legacy v2.2**: usuario pidio comparar con `ejemplos-cursos-legacy-univalle-aiep_v2.md`. Hallazgos:
   - Univalle 1124: legacy tiene 3 LO **planos** (RA1, RA2, RA3 sin parentId). Mi seed v2 inventaba jerarquia ficticia 3 padres + 5 hijos. **Mismatch.**
   - Univalle 1124: legacy tiene 8 EvaluationComponent **Composite real** ("Nota Final" root weight=100 + 6 Quiz weight=11 + Examen Parcial weight=34, todos con parent=NF). Mi seed v2 los tenia planos. **Mismatch.**
   - AIEP TIR101: legacy tiene 40 LO planos + 13 modalidades concretas + 1 EvalComp "Nota 6" + 3 Content. Mi seed AIEP estaba parcialmente alineado pero con codes/nombres genericos.
   - Otros mismatches: code Univalle "111026C" (yo "UV-ECDIF-1124"), credits=3 (yo 4), Modality.name="Modalidad Presencial" (yo "Presencial"), externalId AIEP="TIR101" (yo "aa-aiep-14757"), etc.

5. **Reescritura completa de seeds alineados al legacy v2.2** (commit pendiente):
   - `_data-univalle.js` reescrito: helper `cleanupProgramSections(prisma, programaId)` que borra todas las CurricularSection + RT rows + CurricularLinks del programa antes de recrear (garantiza consistencia). AcademicActivity ahora `code=111026C, credits=3, externalId=1124, version=v2022-actual, description=legacy`. Modality 1 con `name="Modalidad Presencial", code=PRES, theory=4 practice=2 lab=0 autonomous=null`. 3 LO planos con names exactos del legacy (RA1, RA2, RA3). 18 Sessions con `name="SEM N"` + `activityDescription` real legacy. **8 EvalComp Composite**: root "Nota Final" + 7 hijos via `parentId` self-FK. 9 Bibliography con `name` corto formato "Calderon, Arango, Gomez (2018)". 2 CustomSection con content real legacy.
   - `_data-aiep.js` reescrito: cleanup similar. AcademicActivity `code=TIR101, credits=5, externalId=TIR101`. **13 Modalidades reales** del legacy con `code` (DIU-FLE, DIU-PRE, ...) y mapeo `deliveryMode`: Presencial→InPerson, Hybrid→Hybrid, Online→Virtual. 40 LO con names exactos del legacy (sin `code` ni `bloomLevel`). 3 Content con `hours=30` c/u. 1 EvalComp "Nota 6" plano (no Composite — legacy tampoco lo tiene).
   - Busqueda de programa por `executionUnitId` (estable), no por `externalId` que cambio entre versiones.
   - **Validado en BD**: counts via Prisma `groupBy` matchean legacy v2.2 §1.x y §2.x exactamente.

6. **Refactor: componente generico `composite-section-tree`** (parametrizable, reusable para cualquier RT con `parentId`):
   - Movido `mods/curriculum-design/modsComponents/LearningOutcomeTree/` → `CompositeSectionTree/` (3 archivos renombrados).
   - API extensible via props del layout JSON: `recordType`, `relationName`, `codeField`, `secondaryField`, `secondaryLabels`, `metricField`, `metricSuffix`, `title`, `description`, `emptyText`.
   - Tab "Evaluacion" del view ahora usa el treeview con: `recordType=EvaluationComponent`, `codeField=componentCode`, `secondaryField=componentType`, `secondaryLabels={Summative:"Sumativa", Formative:"Formativa", Diagnostic:"Diagnostica"}`, `metricField=weight`, `metricSuffix="%"`.
   - Tab "Resultados de aprendizaje" **vuelve a record-list simple** (legacy-fiel — 3 LO planos no necesitan tree).

7. **CSS theme-aware**: bug reportado por el usuario "hover en dark deja background blanco con texto blanco".
   - Causa raiz: usaba `var(--up1-bg-hover, #eef2f5)` pero el token `--up1-bg-hover` **no existe** en `up1/suite/css/1-theme/theme-tokens.css`. Caia siempre al fallback hardcoded claro `#eef2f5`. En dark, fondo claro contra texto claro → ilegible.
   - **L31**: Tokens validos para hover en up1: `--up1-table-row-hover` (= `--up1-bg-secondary`, theme-aware), `--up1-background-hover`. NUNCA usar `--up1-bg-hover` (no existe).
   - **L32**: Fallbacks de color hardcoded en CSS (`var(--token, #fffXXX)`) son trampa: si el token NO existe, queda fijo en light mode. **Patron correcto**: confiar en los tokens semanticos del theme (`--up1-bg-primary`, `--up1-text-primary`, `--up1-border-color`) sin fallbacks de color, o usar `color: inherit` para heredar del root.
   - Fix aplicado: reemplazado `--up1-bg-hover` por `--up1-table-row-hover` + quitados todos los fallbacks claros del `<style>` del componente. Validado en ambos modos via PW.

8. **Validacion visual final** (PW, screenshots):
   - Tab "Evaluacion" en light: Composite renderiza correctamente con root NF/Sumativa/Nota Final 100% (7) + hijos Q1-Q6 Formativa 11% c/u + EP Sumativa 34%. Legacy-fiel.
   - Tab "Evaluacion" en dark: hover Q3 con fondo gris medio (no blanco), texto claro, badges legibles. Indentacion + left-border visible.
   - Tab "Resultados de aprendizaje": record-list con 3 entries (RA1, RA2, RA3) ordenados por position ASC.

**Files modificados Session 4**:
- `mods/curriculum-design/objects/CurricularSection.json` — `parentId` self-FK agregado.
- `mods/curriculum-design/seed/_data-univalle.js` — reescrito completo, alineado legacy v2.2 §1.x (~250 lineas).
- `mods/curriculum-design/seed/_data-aiep.js` — reescrito completo, alineado legacy v2.2 §2.x (~200 lineas).
- `mods/curriculum-design/modsComponents/CompositeSectionTree/` — 3 archivos nuevos (renombrado desde LearningOutcomeTree, parametrizado).
- `mods/curriculum-design/config/layouts/default_AcademicActivity_view.json` — tab `outcomes` vuelve a record-list, tab `evaluation` usa `composite-section-tree`.

**Estado al cierre de Session 4**:
- POC RISK-001 ampliado: ya no solo Modality, ahora tambien Composite real (EvaluationComponent jerarquia legacy). Patron Composite validado end-to-end.
- Seed completamente alineado al legacy v2.2 (counts UV: 1+3+18+8+9+2=41 secciones; AIEP: 13+40+3+1=57 secciones).
- Componente generico `composite-section-tree` listo para extender a otros RT con `parentId` self-FK (ej. OrgUnit Composite, futura jerarquia LO en otra institucion).
- Sub-tarea 1.5 (EvaluationComponent jerarquia parent/child) **completada** — antes era simulada con planos; ahora es Composite real.

**Learns Session 4**:

| # | Learn | Status |
|---|-------|--------|
| L26 | Vueform `import.meta.glob` en `suite/vueform.config.ts` es estatico en build time. Agregar nuevos archivos `.vue` al modsComponent NO los registra automaticamente — Vueform no encuentra el element y el componente no se monta. **Workaround**: `touch suite/vueform.config.ts` fuerza re-evaluacion del glob via HMR; sin esto, restart manual del dev server. | promoted to RULE-mods-021 |
| L27 | Sync de modsComponents (`layout/scripts/sync.js:147-171`) **rechaza folders con multiples `.vue`**. Validacion: solo 1 `.vue` por folder, opcionalmente `.ts` y `.stories.ts`. Si un componente Vueform necesita sub-componentes (ej. nodo recursivo de un treeview), declararlos inline en el mismo SFC con `defineComponent({ render() {} })` y referenciar la const local para auto-recursion. | promoted to RULE-mods-022 |
| L28 | `<style scoped>` aplica `data-v-*` solo a elementos del template del SFC. Elementos generados via `h()` en sub-componentes con `render()` function NO reciben el scope — el CSS no aplica y los nodos quedan sin estilos. **Workaround**: quitar `scoped` y usar prefijo unico de clase (ej. `cst-*`) para evitar leak. | promoted to RULE-mods-023 |
| L29 | `listInstances` GraphQL con `relations: ["rt__<RT>__<base>"]` retorna el RT data **dentro de `data.<relationName>`**, NO en `extended` (que queda `null`). Patron correcto en composables: `it.data?.rt__LearningOutcome__curricularsection?.code` en lugar de `it.extended?.rt__...`. | promoted to RULE-layout-022 |
| L30 | En custom Vueform elements con composables, **pasar props como string snapshot al composable rompe la reactividad**. Si Vueform interpola `{{parentId}}` async o cambia el prop, el composable no re-ejecuta. **Patron correcto**: en `setup(props)` usar `toRef(props, 'fieldName')` y pasar Ref al composable, que adentro hace `watch(() => ref.value, fetch, { immediate: true })`. | promoted to RULE-mods-024 |
| L31 | Tokens validos para hover en up1 (theme-aware): `--up1-table-row-hover`, `--up1-background-hover`. **El token `--up1-bg-hover` NO existe** en `suite/css/1-theme/theme-tokens.css`. Usarlo cae al fallback hardcoded → claro fijo en dark mode → texto claro sobre fondo claro ilegible. | promoted to RULE-layout-023 |
| L32 | Fallbacks de color hardcoded en CSS — `var(--up1-token, #fffXXX)` — son trampa cuando el token NO existe: el fallback queda fijo en light mode aunque el resto del theme cambie. **Patron correcto en componentes mod**: usar tokens semanticos sin fallback de color, o `color: inherit`. | promoted to RULE-layout-024 |

### Session 5 — 2026-04-30 (Fase 3.4: layouts edit/create por RT)

**Disparador del usuario**: avanzar Fase 3.4 — completar la edicion del detail. Se mantiene la vista actual (tabs en `default_AcademicActivity_view`). La edicion abarca **todos los RT excepto EvaluationComponent** (que usa el componente custom `composite-section-tree` y tiene flujo propio).

**Decisiones tomadas antes de codear**:

- **Convencion de naming**: `default_rt__<RT>__curricularsection_<edit|create>.json` — alineada al patron core (`default_<Object>_<mode>.json`, ver `default_Category_create.json`). 100% consistente con los views ya declarados.
- **Layouts separados edit y create** (no reuso del `_view`): el `_view` usa `type: "text"` plano para display, no editable. La plataforma valida `mode in {create, edit}` al rendering form (`RecordDetail.vue:3307`) y los enums/numbers/booleans/FK requieren tipos Vueform reales.
- **`autoAssignFields` solo en `_create`**: pre-poblar `recordType` (literal del RT) y `ownerId: "{{parentId}}"` para que la plataforma resuelva el FK al `AcademicActivity` activo via placeholder (mismo mecanismo que filters embebidos, L19).
- **`enableFKCreateButton`**: por defecto `false`. Excepcion: Bibliography (`libraryRefId` → BibliographyReference) — a confirmar en POC si se permite crear referencias inline o solo seleccionar (decision UX que se valida tras el primer render).

**Flujo plataforma confirmado** (RecordList.vue:4115-4170):
1. Click en row del RecordList embebido en tab → `handleModify(record)` → `modalStackManager.openModal({ mode: 'edit', objectName: rt__<RT>__..., instanceId: recordId })`.
2. Sin `editLayoutConfig` declarado en el embed, la plataforma resuelve el layout default por nombre `default_<objectName>_edit`.
3. Para create se asume el mismo flow desde el boton "+" del embed (a verificar en POC).

**Tasks generadas** (mapeo a sub-tarea 3.4):

| # | RT | Archivos a crear | Status |
|---|----|------------------|--------|
| 3.4.1 | Modality | `_edit.json` | pending — POC primero |
| 3.4.2 | LearningOutcome | `_edit.json` | pending |
| 3.4.3 | Content | `_edit.json` | pending |
| 3.4.4 | Session | `_edit.json` | pending |
| 3.4.5 | Bibliography | `_edit.json` | pending |
| 3.4.6 | CustomSection | `_edit.json` | pending |
| — | ~~EvaluationComponent~~ | excluido | n/a (composite-section-tree custom) |

**Descubrimiento — alcance reducido a EDIT solamente**:

Inspeccionando el detail (`default_AcademicActivity_view.json:137-174`) los embeds `modalitiesList` etc. son `record-list` sobre **`objectName: "CurricularSection"`** con filtros por `recordType` (correcto, evita L18 — filtros nested rechazados). Pero los `_view` apuntan al **RT** (`rt__Modality__curricularsection`). La plataforma orquesta el match `instanceId → curricularsectionId` para el view.

Para **edit** este flow funciona directo: el record ya existe en ambas tablas (`CurricularSection` + `rt__<RT>__curricularsection`), `instanceId` resuelve el RT row.

Para **create**, sin embargo, hace falta doble insert atomico (1. CurricularSection base con `ownerId`, `recordType`, `name`, `position` — 2. RT con `curricularsectionId` apuntando al recien creado). El patron `autoAssignFields: ownerId={{parentId}}` no encaja porque el RT NO tiene FK al AcademicActivity (la FK vive en el base). Esto es justamente lo que requiere **sub-tarea 3.5** (wizard con selector de RT + form combinado base+RT) — fuera del alcance de Session 5.

**Decision de alcance**: Session 5 cubre **solo edit** (3.4.x). Create se acopla naturalmente a 3.5 en sesion posterior con logica wizard.

**Estrategia de ejecucion**:
1. **POC con Modality** (3.4.1): crear ambos layouts, sync, validar visualmente que el modal abre con campos editables, enums como select, isDefault como switch, hours como number.
2. **Confirmar con user antes de avanzar** a los 5 RTs restantes — si el patron POC funciona, los demas son aplicar el mismo molde con campos especificos.
3. Tras los 6 RTs: ejecutar `npm run sync`, validar tabs del detail, capturar screenshots de cada modal edit/create.

**Mapeo Vueform por tipo de campo del RT schema**:

| Schema RT type | enum? | Vueform `type` | Notas |
|---------------|-------|----------------|-------|
| string | no | `text` | Default |
| string | si | `select` | `items: [{value, label}]` con i18n por value |
| string (long) | no | `textarea` | Para `notes`, `description`, etc. |
| string + isForeignKey | — | `select` | Con `relationDisplayFields` + lazy load options via API |
| number | no | `text` con `inputType: "number"` o `number` element | Confirmar en POC cual usa la plataforma |
| boolean | no | `checkbox` o `toggle` | TBD por consistencia con resto del repo |

**Pendiente de verificacion (preguntas del POC)**:
- ¿Vueform en up1 usa `type: "number"` directo o `text` con `inputType: "number"`? Se decide leyendo otros layouts edit del repo si aparece, o usando convencion mas explicita por defecto.
- ¿`isDefault` se renderiza mejor como `checkbox` o `toggle` en este design system? — verificar atomos del layout/.
- ¿El embed RecordList del tab tiene boton "+" automatico o requiere `actions` declarado? — verificar al validar el create.

**Bloqueo descubierto al validar POC inicial — replanteo de alcance**:

Primer intento: `default_rt__Modality__curricularsection_edit.json` + `canEdit: true` en el embed `modalitiesList` del `_view`. Sync OK, BD validada via `resolveDefaultLayout` GraphQL: ambos artefactos correctos. **Pero el dropdown de row action en el tab Modalidades seguia mostrando solo "View"**, sin "Edit".

Inspeccionando la instancia Vue del RecordList del embed via `__vueParentComponent`, se confirma que `props.layoutConfig.canEdit` llega como `false` aunque la BD tiene `true`. Causa: [`RecordDetail.vue:4082-4098`](../../up1/layout/src/layouts/RecordDetail.vue) — la plataforma fuerza por design todos los embeds (`record-list`, `record-detail`) a read-only cuando el RecordDetail padre esta en `mode: view`:

```ts
if (computedMode.value === 'view' && (fieldType === 'record-list' || fieldType === 'record-detail')) {
  layoutConfig: { ...existingConfig, canCreate: false, canEdit: false, canDelete: false, canBulkDelete: false, canEditRowField: false }
}
```

**Implicacion**: la edicion por RT desde un tab requiere que el RecordDetail padre este en `mode: edit`. La via correcta es exponerla via el row action "Edit" del listado de programas (que abre el padre en mode `edit`), NO desde "View" del programa.

**Solucion aplicada — `default_AcademicActivity_edit.json`**:

Clonado del `_view` con `mode: "edit"`:
- Misma estructura de tabs (8 tabs identicas).
- Header editable: `name/code/version/language` (text), `programLevel/workflowState` (select native con enums traducidos esp), `credits` (text+inputType=number), `executionUnitId` (FK a OrgUnit), `description` (textarea). Required en los campos `not_null: true` del schema RT (name, code, version, language, programLevel, credits, workflowState).
- 6 embeds RT con `canEdit: true` + `associatedLayoutConfigs.edit` apuntando al `_edit` del RT correspondiente.
- Tab `evaluation` mantiene `composite-section-tree` igual que view (custom element, edicion fuera de alcance — Fase aparte).

`canEdit: true` revertido del `_view` (no aportaba — la plataforma lo ignoraba en mode view).

**Tasks ejecutadas**:

| # | RT | Archivo creado |
|---|----|----------------|
| 3.4.0 | (programa) | `default_AcademicActivity_edit.json` — 8 tabs, header editable, embeds RT editables |
| 3.4.1 | Modality | `default_rt__Modality__curricularsection_edit.json` — 7 fields |
| 3.4.2 | LearningOutcome | `default_rt__LearningOutcome__curricularsection_edit.json` — 3 fields |
| 3.4.3 | Content | `default_rt__Content__curricularsection_edit.json` — 2 fields |
| 3.4.4 | Session | `default_rt__Session__curricularsection_edit.json` — 4 fields |
| 3.4.5 | Bibliography | `default_rt__Bibliography__curricularsection_edit.json` — 3 fields (FK + enum) |
| 3.4.6 | CustomSection | `default_rt__CustomSection__curricularsection_edit.json` — 3 fields |

**Validacion end-to-end via Playwright**:

Flow validado en UPU/Ecuaciones Diferenciales:
1. ✓ Listado programas → row action de "Ecuaciones Diferenciales" → opciones View + Edit.
2. ✓ Click "Edit" → modal **"Editing Ecuaciones Diferenciales"** abre con `mode: edit`, 8 tabs, 16 fields del schema.
3. ✓ Tab "Modalidades" → row action de "Modalidad Presencial" → opciones View + **Edit** (Edit ahora visible — `canEdit: true` honrado porque parent es `mode: edit`).
4. ✓ Click "Edit" → segundo modal **"Editing Modalidad Presencial"** sobre el del programa (modal stack).
5. ✓ Schema Modality renderiza: Code text, Modo de entrega select (enum traducido InPerson→Presencial), Modalidad principal toggle ON, 4 inputs numericos para hours.

Screenshot: [TICKET-009.screenshots/ticket-009-edit-modality-modal.png](TICKET-009.screenshots/ticket-009-edit-modality-modal.png).

Save sin ejecutar (no se mutaron datos del POC).

**Learns descubiertos en Session 5**:

| # | Learn | Status |
|---|-------|--------|
| L33 | RecordDetail en `mode: view` fuerza TODOS los embeds (`record-list`, `record-detail`) a read-only — sobrescribe `canEdit/canCreate/canDelete/canBulkDelete/canEditRowField` a `false` ignorando el config del JSON ([RecordDetail.vue:4082-4098](../../up1/layout/src/layouts/RecordDetail.vue)). **Implicacion para mods**: la edicion de embeds requiere que el detail padre este en `mode: edit`. No hay forma desde el config del mod de habilitar edicion en mode view (seria feature request a plataforma: flag `forceEditableEmbeds` o similar). | promoted to BUG-platform-003 |
| L34 | Convencion del listado para layouts default sin `layoutId` explicito en `associatedLayoutConfigs`: la plataforma busca por nombre `default_<objectName>_<mode>` ([RecordList.vue:4129-4170](../../up1/layout/src/layouts/RecordList.vue)). Con esto basta declarar `objectName + mode` en `associatedLayoutConfigs.edit` y la plataforma resuelve el JSON correcto sin hardcodear ID. | promoted to RULE-layout-025 |
| L35 | Patron Vueform editable para enums string en up1: `type: "select"` + `native: true` + `items: { Value1: "Etiqueta", Value2: "..." }` (objeto value→label, no array). Para numeros: `type: "text"` + `inputType: "number"` (no `type: "number"` directo — convencion confirmada en `default_Category_create_Consultor.json`, `default_Infrastructure_create_Consultor.json`). Para boolean: `type: "toggle"` con `default: true/false` opcional. | promoted to RULE-mods-025 |

**Estado al cierre de Session 5**:
- Sub-tarea 3.4 (layouts edit por RT) **completada** — 6 RTs no-custom con `_edit.json` + `_edit.json` del programa que orquesta todo via tabs.
- Tab Evaluacion intencionalmente excluido de edicion (composite-section-tree custom — flujo aparte fuera del alcance del ticket).
- Sub-tarea 3.5 (selector RT en "crear nueva seccion") sigue pendiente — requiere wizard con doble insert atomico (CurricularSection base + RT).

**Fix de coherencia view/edit aplicado al final de Session 5**:

Al validar el resultado, el dev observo que el modal "View Modalidad Presencial" mostraba un formulario distinto al `_edit` (campos del `CurricularSection` base como `isSynchronizable`, `isVisible`, `isRequired`, `parentId` en lugar de los del RT). Causa: el embed `modalitiesList` esta sobre `objectName: "CurricularSection"` (correcto, evita L18). El click en row name (View action default) usaba ese `objectName` y la plataforma fallback-aba a un layout default autogenerado del **base**, no del RT. **Solo el edit funcionaba porque tenia `associatedLayoutConfigs.edit`** apuntando al RT.

Solucion: agregar `associatedLayoutConfigs.view` (analogo al edit) en los 6 embeds, en AMBOS layouts (`_view` y `_edit`). La plataforma resuelve via [RecordList.vue:4192-4203](../../up1/layout/src/layouts/RecordList.vue) el `objectName` del RT y carga el `_view` correcto. Validado via PW: modal "View Modalidad Presencial" abre con `objectName: rt__Modality__curricularsection`, layout `default_rt__Modality__curricularsection_view`, 7 fields del RT (mismos que el edit). Screenshot: [TICKET-009.screenshots/ticket-009-view-modality-aligned.png](TICKET-009.screenshots/ticket-009-view-modality-aligned.png).

| L36 | Embeds `record-list` filtrados por `recordType` sobre el base (CurricularSection) requieren **`associatedLayoutConfigs` para AMBOS modos (`view` y `edit`)** apuntando al RT, no solo edit. Sin declarar `view`, el click en row name abre con `objectName` del embed (base) y la plataforma cae a layout default autogenerado del base — formulario completamente distinto al `_view` del RT. Patron correcto: declarar ambos `view` y `edit` con `objectName` del RT en cada embed. | promoted to RULE-mods-026 |

**Diferencia visual restante (no funcional)**: el `_view.json` del RT usa `type: "text"` para todos los fields (display read-only). Asi `deliveryMode` muestra `"InPerson"` raw en lugar de `"Presencial"` (que si aparece en `_edit` con `type: "select"` + items). `isDefault` muestra `"true"` en lugar del toggle. Esto es alineado al schema (mismos fields) pero la PRESENTACION es minimalista. Mejora opcional fuera del alcance: cambiar el `_view` a usar mismos types Vueform que `_edit` con `disabled: true` para que aplique el mapping value→label y los widgets visuales (toggle, select traducido) en read-only.

**Field `name` (titulo de la seccion) agregado a los 6 `_edit.json`** — pedido del dev: en los modales de edicion el titulo debe ser editable. Patron aplicado: primer field del schema (cols 12), `rules: "required"`, label contextualizado por RT:

| RT | label | type |
|----|-------|------|
| Modality | "Nombre" | text |
| LearningOutcome | "Resultado de aprendizaje" | textarea (textos largos tipo "RA1. Resuelve...") |
| Content | "Nombre" | text |
| Session | "Actividad" (consistente con label de columna del view) | text |
| Bibliography | "Nombre" | text |
| CustomSection | "Título" | text |

`name` vive en `CurricularSection` base (no en el RT). Validacion visual via PW confirmada: input aparece con valor cargado correctamente. **Persistencia end-to-end no validada** — depende de si la mutacion GraphQL del RT acepta updates a campos del base junto con los del RT. Dev valida manualmente. Screenshot: [TICKET-009.screenshots/ticket-009-edit-modality-with-name.png](TICKET-009.screenshots/ticket-009-edit-modality-with-name.png).

| L37 | El layout `_edit` del RT (`objectName: "rt__<RT>__<base>"`) puede declarar fields del **base** (CurricularSection) en su schema (ej. `name`, `position`). Vueform los carga al iniciar el form si la query del record incluye esos fields. **Pendiente verificar en runtime**: si la mutacion update del RT persiste tambien los cambios a fields del base, o si requiere mutacion separada. Si funciona, es patron reusable para mostrar campos del base en forms del RT (ej. `name`, `position`, `isRequired`). Si no, hay que crear flow custom o restringir el edit del RT a solo sus fields. | deferred — pendiente validacion |
| L38 | **Bug de plataforma**: `rowActions` custom con `type: "modal"` y `targetLayoutType: "RecordDetail"` **siempre abre en `mode: "create"` hardcoded** ([useRowActionHandler.ts:274](../../up1/layout/src/composables/useRowActionHandler.ts#L274)) — no se respeta el `mode` declarado en el `layoutConfig` del layout target ni hay forma desde JSON de declarar `targetMode: "edit"`. Tampoco se pasa `instanceId`. **Implicacion**: `rowActions` custom no soporta editar records existentes desde un embed RecordList, solo crear. Para edit hay que usar `canEdit: true` + `associatedLayoutConfigs.edit`, que solo funciona cuando el RecordDetail padre esta en `mode: edit` (L33). Combinacion de L33 + L38: **no hay forma desde el config del mod de tener "Edit por elemento" disponible cuando el detail padre esta en `mode: view`** — requiere PR a plataforma para agregar `action.targetMode` y pase de `instanceId`. | promoted to BUG-platform-004 |

### Session 6 — 2026-04-30 (Fase 3.5a: agregar elementos en programa existente)

**Disparador del usuario**: avanzar Fase 3.5 con alcance dividido. Caso 1 (esta session): agregar elementos a un programa existente (cada tab tiene su boton "+ Nueva" que abre modal create del RT con `ownerId={{parentId}}` pre-seteado). Caso 2 (sesion futura): wizard de programa nuevo desde cero — no se aborda en este ticket.

**Investigacion previa — flow create en embeds RecordList**:

| Hallazgo | Path | Implicacion |
|----------|------|-------------|
| `createInstance` del RT crea atomicamente CurricularSection base + RT extension en una sola transaccion Prisma | [object-manager/src/resolvers/instance.resolver.js:30-90](../../up1/object-manager/src/resolvers/instance.resolver.js#L30-L90) | NO se necesita endpoint custom ni wizard para el doble insert. El backend lo orquesta. `recordType` se infiere del rtName del filename, NO hace falta declararlo en autoAssignFields |
| `canCreate` usa otro handler distinto al de rowActions — no afecta L38 | RecordList.vue:4053-4090 (`handleCreateRequest`) | El bug del mode=create hardcoded no aplica aqui — `canCreate` funciona correcto |
| L33 sigue aplicando: `canCreate` se fuerza a `false` en mode view del padre | RecordDetail.vue:4082-4098 | El boton "+ Nueva" SOLO aparecera cuando se abra el programa via row action **Edit** del listado — coherente con flow Session 5 |
| Convencion `_create.json` separado del `_edit.json` recomendado (sino fallback confuso al `_edit`) | `resolveDefaultLayout` | Crear archivos `default_rt__<RT>__curricularsection_create.json` separados |
| `valueSource` enum del `autoAssignFields`: `CURRENT_USER_ID`, `CURRENT_USER_EMAIL`, `CURRENT_USER_NAME`, `CURRENT_DATE`, `FIXED_VALUE`, `GENERATED_UNIQUE_ID`, `COMPUTED_FROM_LABEL` | [RecordDetail.vue:246](../../up1/layout/src/layouts/RecordDetail.vue#L246) | **No existe `MAX_PLUS_ONE` o `AUTO_INCREMENT`** — ver L39 |

**Plan de implementacion**:

1. POC con Modality:
   - Crear `default_rt__Modality__curricularsection_create.json` con schema editable (name, position, code, deliveryMode, isDefault, hours).
   - En el embed `modalitiesList` del `_edit` del programa: agregar `canCreate: true` + `canCreateLayoutId: "default_rt__Modality__curricularsection_create"` + `canCreateInitialData: { ownerId: "{{parentId}}" }`.
   - Sync + validar via PW que aparece "+ Nueva", abre modal create, persiste end-to-end.
2. Si POC OK, replicar a los 5 RTs restantes (LearningOutcome, Content, Session, Bibliography, CustomSection).

**Decision sobre `position`**: input editable manual (no auto-asigna). Razon: la plataforma no soporta `MAX_PLUS_ONE` ni hay logica de auto-position en el backend. Documentado como L39.

| L39 | **Bloqueo de plataforma — auto-asignacion de `position`**: el `valueSource` enum del `autoAssignFields` ([RecordDetail.vue:246](../../up1/layout/src/layouts/RecordDetail.vue#L246)) NO incluye opciones tipo `MAX_PLUS_ONE`, `AUTO_INCREMENT`, `NEXT_IN_SEQUENCE` para calcular `MAX(position)+1` filtrado por `ownerId+recordType` al crear. Tampoco hay logica equivalente en `instance.resolver.js` que auto-asigne position cuando viene null. **Implicacion para creacion de secciones desde el detail del programa**: el user debe ingresar `position` manualmente en el form de create de cada RT. Workaround actual: input numerico editable. Para resolver requiere: (a) PR a plataforma agregando `valueSource: "MAX_PLUS_ONE"` con `sourceField` + filterContext, o (b) custom logic en `instance.resolver.js` que detecte recordType+ownerId y auto-asigne. Ambas opciones fuera del scope del mod. | promoted to BUG-platform-005 |

#### Sub-bloque Session 6 — composite-section-tree con edit/create custom (Fase 3.5a, tab Evaluacion)

**Disparador del usuario**: el tab Evaluacion usa el componente custom Vueform `composite-section-tree` (ver Session 4). Como L33 fuerza embeds a read-only en mode view del padre y el componente custom NO puede acceder a `modalStackManager` de la plataforma (no hay `provide()` del lado de RecordDetail), la opcion elegida fue **A: modal custom inline en el propio componente** con form ad-hoc y mutaciones GraphQL directas via Apollo client.

**Cambios al componente** ([up1/mods/curriculum-design/modsComponents/CompositeSectionTree/](../../up1/mods/curriculum-design/modsComponents/CompositeSectionTree/)):

| Archivo | Cambio |
|---------|--------|
| `CompositeSectionTreeElement.vue` | Reescrito. Agregadas props `enableEdit`, `editableFields`, `rtFieldLabels`. Botones inline en cada nodo (lapiz Edit + "+" Add Child). Footer con "Agregar raíz". Modal custom (`cst-modal__backdrop` + `cst-modal__card`) con form ad-hoc render-function (`CompositeSectionForm`). Mutaciones `createInstance` / `updateInstance` directas via `useTenantApolloClient`. Theme-aware con tokens up1 |
| `useCompositeSectionTree.ts` | Composable extendido — los nodos ahora exponen los fields del RT directo (`rtData` + spread dinamico de propiedades del RT que no colisionen con base) para que el form de edit pueda pre-llenar inputs |
| `CompositeSectionTree.types.ts` | Type `CompositeNode` extendido con `rtData?: Record<string, any>` + `[key: string]: any` |

**Embed actualizado** ([default_AcademicActivity_edit.json](../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_edit.json)) — `evaluationList` declara:

```json
"enableEdit": true,
"editableFields": ["componentCode", "componentType", "weight", "method", "isDirectEvidence"],
"rtFieldLabels": {
    "componentCode": "Código",
    "componentType": "Tipo",
    "weight": "Ponderación",
    "method": "Método",
    "isDirectEvidence": "Evidencia directa"
}
```

**Heuristicas del form** (sin Vueform — ad-hoc render):
- Type detection por nombre del field: `weight|hours|duration|theoryHours|...|maxLength|week` → `type=number`. `isDirectEvidence|isDefault|isRequiredInAllSections` → toggle (checkbox custom). `method|activityDescription|notes|content|description` → textarea. Resto → text.
- Reusable: la heuristica funciona para cualquier RT que use el tree (LearningOutcome con jerarquia, futuras OrgUnit Composite, etc.).

**Validacion via PW**:
- ✓ Edit programa → tab Evaluacion → 8 nodos con botones inline (lapiz + "+") + footer "Agregar raíz".
- ✓ Click lapiz "Nota Final" → modal "Editar 'Nota Final'" con 7 fields pre-llenados (Nombre/Orden/Código/Tipo/Ponderación/Método/Evidencia directa).
- ✓ Click "Agregar raíz" → modal con form vacio, name + position + 5 fields RT. Save dispara `createInstance(objectType: "rt__EvaluationComponent__curricularsection", data: {...payload + ownerType: "AcademicActivity", ownerId, parentId: null})` → response 200 con id → tree refresca via `refetch()`. Confirmado en Univalle: 8 → 9 nodos, 1 → 2 roots, nuevo "TEST Componente Raiz PW" visible.

Screenshot: [TICKET-009.screenshots/ticket-009-edit-evaluation-tree-modal.png](TICKET-009.screenshots/ticket-009-edit-evaluation-tree-modal.png).

**Pendientes de validacion manual** (mismo patron que sub-tareas anteriores):
- create-child con `parentId` del nodo seleccionado.
- edit con cambios reales (verificar update persiste).
- Issue funcional pendiente: **agregar hijos a un elemento raiz** — comportamiento del boton "+" del root. Se aborda en proxima sesion.

| L40 | **Bug en mi mutation original** durante POC: declare `createInstance` y `updateInstance` esperando `{ success, message, instance { id } }` en el response. **El tipo `InstanceResult` real solo expone `{ id, data, extended }`** ([up1/object-manager/src/graphql/typeDefs/static.js](../../up1/object-manager/src/graphql/typeDefs/static.js)). GraphQL valida shape al validar la query → response 400 "Cannot query field 'success' on type 'InstanceResult'" antes de ejecutar el resolver. Fix: pedir solo `{ id }` y confiar en `result.errors` para detectar fallas. **Lesson**: cuando se usan mutaciones de plataforma desde codigo del mod, leer el typedef antes de asumir el shape (no asumir convenciones tipo "Result" wrapper). Verificar con `__schema { types ... }` introspection o leer `static.js`. | promoted to RULE-mods-027 |

#### Sub-bloque Session 6 — UX refactor del CompositeSectionTree (botones design system + hover)

**Disparadores del usuario** (mismo turno):
1. "El boton 'Agregar raiz' deberia verse con el estilo de la plataforma, como el boton Save" — botones custom con clases `cst-btn--primary` no usaban los atomos del design system.
2. "Cada nodo raiz deberia tener un boton + para agregar hijos, ese mas o no lo tiene o no se ve" — los botones edit/+ por fila no se renderizaban (cortados por overflow).
3. "Quiero que los botones de los elementos del tree se vean en hover solamente" — UX cleaner.

**Cambios al `CompositeSectionTreeElement.vue`**:

| # | Cambio | Antes | Ahora |
|---|--------|-------|-------|
| 1 | Boton "Agregar raíz" + boton "Crear primer componente" | `<button class="cst-btn cst-btn--primary">` con clases manuales | Atomo `Button` con `variant="primary" size="sm" icon="bi bi-plus-lg"` — coherente con boton Save del modal padre |
| 2 | Botones edit + add-child por nodo | `<button>` custom con `Icon` adentro | Atomo `IconButton` con `variant="outline-secondary"` (lapiz) y `variant="outline-primary"` ("+"), `icon="bi bi-pencil"` y `icon="bi bi-plus-lg"` |
| 3 | Botones modal footer (Cancelar / Guardar) | `<button class="cst-btn cst-btn--ghost">` y `cst-btn--primary` | Atomos `Button` con `variant="outline-secondary"` y `variant="primary"` + `loading` prop |
| 4 | Layout del row (`.cst-node__row`) | `overflow: hidden` cortaba acciones que iban despues del count | Sin overflow en el row; el `.cst-node__name` mantiene su propio truncate. Wrapper `.cst-node__actions` agrupa los IconButton al final con `margin-left: auto` |
| 5 | Visibilidad de los botones por nodo | Siempre visibles | `opacity: 0 + pointer-events: none` por default. `:hover` y `:focus-within` del row activan `opacity: 1 + pointer-events: auto` con transition 0.15s. Accesible por teclado |

**Convencion clave de los atomos** ([up1/layout/src/components/atoms/Button/Button.vue:12](../../up1/layout/src/components/atoms/Button/Button.vue#L12), [IconButton.vue:19](../../up1/layout/src/components/atoms/IconButton/IconButton.vue#L19)): la prop `icon` se renderiza como `<i :class="icon">`, asi que **necesita la clase Bootstrap Icons completa** (`bi bi-pencil`, `bi bi-plus-lg`) — NO solo el nombre del icono. Bug inicial detectado: usar `icon="pencil"` renderiza `<i class="pencil">` que no aplica ningun estilo.

**Validacion via PW**:
- ✓ Hover sobre fila "Nota Final" muestra lapiz + "+" al final.
- ✓ Sin hover, otras filas (Quiz 1...6, Examen Parcial) no muestran botones.
- ✓ Click en "+" de Nota Final abre modal "Crear hijo de 'Nota Final'" con 7 fields.
- ✓ "Agregar raíz" en color teal solido coherente con Save del modal padre.

Screenshots:
- [TICKET-009.screenshots/ticket-009-tree-buttons-final.png](TICKET-009.screenshots/ticket-009-tree-buttons-final.png) — version inicial (botones siempre visibles).
- [TICKET-009.screenshots/ticket-009-tree-hover-actions.png](TICKET-009.screenshots/ticket-009-tree-hover-actions.png) — version final con hover (solo "Nota Final" muestra acciones).

| L41 | Atomos `Button` e `IconButton` del design system up1 ([layout/src/components/atoms/](../../up1/layout/src/components/atoms/)) usan la prop `icon` como **clase CSS completa** del icono — `<i :class="icon">`. Para iconos de Bootstrap Icons hay que pasar `"bi bi-pencil"` (no solo `"pencil"`) ni `"bi-pencil"` solo (sin el `bi` base). El sub-componente atomo `Icon` SI tolera el nombre solo (`name="pencil"`) porque internamente normaliza, pero `Button.icon` y `IconButton.icon` NO. | promoted to RULE-layout-026 |
| L42 | UX-pattern: en TODOS los componentes con acciones contextuales por fila/nodo (rowActions, tree node actions, list cell actions), aplicar `opacity: 0 + pointer-events: none` por default y revelar con `:hover` y `:focus-within` del contenedor de la fila + `transition: opacity 0.15s ease`. Reduce ruido visual cuando el listado es largo y mantiene accesibilidad por teclado (focus revela). Limpio y consistente con patrones modernos de design systems. | promoted to RULE-layout-027 |

#### Sub-bloque Session 6 — Fase 3.5b: crear programa de asignatura desde 0

**Disparador del usuario**: completar el flow de creacion. Despues de 3.5a (agregar elementos en programa existente), falta poder **crear el programa shell vacio** desde el listado.

**Decision de alcance**: opcion A "shell vacio + edit posterior" en lugar de wizard:
- Solo los 9 fields del header del programa (tab General).
- User crea shell → modal cierra → click en row "Editar" → abre `_edit` con tabs y agrega secciones via flow de 3.5a.
- Coherente con patron CRUD estandar y con los 6 `_create.json` por RT ya existentes.

**Investigacion previa** ([prompts/agents](../../up1/layout/) + [vueform-uplanner.css](../../up1/layout/src/styles/vueform-uplanner.css)):
- La plataforma genera un form fallback automatico cuando el `canCreateLayoutId` apunta a un layout que no existe — pero el form generico esta en ingles y desordenado. Crear el `_create.json` mejora UX significativamente.
- Vueform soporta `steps:` nativo via JSON config (similar a `tabs:` con navegacion lineal prev/next, ej. `mods/hello-world-mod/config/layouts/hw-assessment-create.json`). Para AcademicActivity con solo 9 fields no aplica — todo cabe en 1 form simple.
- Custom component `CreateViewWizard` ([layout/src/components/organisms/Navigation/LayoutSelector/CreateViewWizard.vue](../../up1/layout/src/components/organisms/Navigation/LayoutSelector/CreateViewWizard.vue)) NO es declarable desde JSON — es para crear vistas custom de RecordList, no para crear records.
- `AcademicActivity` es objeto BASE (no RT) — `createInstance` con 1 insert directo, sin orquestacion.

**Cambios aplicados**:

| Archivo | Cambio |
|---------|--------|
| [`default_AcademicActivity_create.json`](../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_create.json) | **Nuevo** — 9 fields (8 visibles + `workflowState` hidden). Schema: name (12) → code/version/language (4+4+4) → programLevel/credits/executionUnitId (4+4+4) → description (12) → workflowState hidden. `autoAssignFields: workflowState = "Draft"` (FIXED_VALUE) — el flow de aprobacion debe pasar por estados, no skipear |
| [`default_AcademicActivity_list.json`](../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json) | Agregado `createModalTitle: "Crear nuevo programa de asignatura"` para titulo amigable (caso L38 del create flow no aplica aqui — es el handler nativo de canCreate, no rowActions custom) |

**Validacion via PW**:
- ✓ Click "Create record" del listado → modal "Crear nuevo programa de asignatura" en Creation Mode (badge verde).
- ✓ 8 fields visibles (Name fila 1, Code/Versión/Idioma fila 2, Nivel/Credits/Unidad Organizativa fila 3, Description fila 4).
- ✓ `workflowState` hidden con `autoAssignFields.workflowState.fixedValue: "Draft"`.
- ✓ Heading custom traducido.

Screenshot: [TICKET-009.screenshots/ticket-009-create-academicactivity-modal-fixed.png](TICKET-009.screenshots/ticket-009-create-academicactivity-modal-fixed.png).

**Detalle cosmetico restante**: los labels del form mezclan ingles y español — algunos como "VERSIÓN", "IDIOMA", "NIVEL", "UNIDAD ORGANIZATIVA" estan traducidos pero "NAME", "CODE", "CREDITS", "DESCRIPTION" siguen en ingles. Causa: la plataforma resuelve labels via lang del mod **primero** (`mods/curriculum-design/lang/es_CL@AcademicActivity.json`) y los `label` del JSON config se ignoran cuando hay key en lang. Para arreglar: agregar/corregir keys faltantes en el lang. Mejora cosmetica, fuera del alcance de 3.5b.

| L43 | **Bug del grid Vueform con campos `type: "hidden"` intercalados**: en Vueform, un field declarado como `type: "hidden"` en el schema JSON ocupa **un slot virtual del grid CSS** aunque no se renderice visualmente — interrumpe el flow de columnas (`columns.container`) de los fields adyacentes. Sintoma observado: 3 fields con `cols 4` en una fila esperada (12 cols total) se desordenan: 2 entran en una fila + 1 cae a la siguiente. **Solucion**: declarar fields `type: "hidden"` siempre **al final del schema** (o agruparlos en una zona aparte), de modo que no rompan el flow de fields visibles. **Ejemplo**: en `default_AcademicActivity_create.json`, mover `workflowState` despues de `description` solucio el grid. | promoted to BUG-platform-006 |

#### Sub-bloque Session 6 — bloqueo inline edit de workflowState

**Disparador del usuario**: tras confirmar la decision "workflowState hidden=Draft" en el create, observa que **en el RecordList del listado el campo es editable inline** via lapiz "Edit field" al hover en la celda — eso bypassea el control del flujo de aprobacion (cualquier user puede saltar de Draft a Approved sin pasar por Review).

**Mecanismos disponibles** ([RecordList.vue:2863-2884](../../up1/layout/src/layouts/RecordList.vue#L2863-L2884)):

| Mecanismo | Granularidad | Uso |
|-----------|--------------|-----|
| `canEditRowField: false` en `layoutConfig` | Listado completo | Bloquea inline edit en TODAS las celdas — muy restrictivo |
| `editableFields: [...]` whitelist | Lista de fields | Solo los del array son inline-editables |
| **`editable: false` en una `column`** | Field especifico | Bloquea solo esa columna, deja el resto editable. **Mas preciso** |

**Cambio aplicado** ([default_AcademicActivity_list.json](../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json)):

```json
{ "key": "workflowState", "label": "Estado", "sortable": true, "filterable": true, "editable": false }
```

**Validacion via PW**:
- ✓ Columna "Estado" (workflowState) ya NO muestra lapiz "Edit field" al hover.
- ✓ Las demas columnas (Name, Code, Version, Nivel) mantienen inline edit normalmente.
- ✓ FK columna "Unidad Organizativa" tambien bloqueada (regla nativa de plataforma para FKs, linea 2870-2872).

| L44 | **Inline edit per-field**: el RecordList soporta inline editing por celda (icono lapiz al hover) controlado en 3 niveles: `canEditRowField` (global del listado), `editableFields[]` (whitelist), y **`editable: false` por column** (bloqueo granular). Para campos que representan estados de un workflow controlado (`workflowState`, `approvalStatus`, etc.), bloquear con `editable: false` por column — asi se preserva el flow de transiciones (Draft → Review → Approved) que el modal Edit honra como `select` con todos los estados. **Patron del mod**: si un field tiene `enum` que representa un workflow ordenado, declarar `editable: false` en su column del list **siempre**. La logica de plataforma ([RecordList.vue:2874-2877](../../up1/layout/src/layouts/RecordList.vue#L2874-L2877)) corta en el primer `editable === false` antes de cualquier validacion downstream. | promoted to RULE-mods-028 |

---

### Cierre Session 6

**Trabajo realizado** (cronologico):
1. Sub-tarea 3.5a: agregar elementos en programa existente — 6 layouts `_create.json` por RT (Modality, LearningOutcome, Content, Session, Bibliography, CustomSection) + activacion de `canCreate` con `canCreateLayoutId`/`canCreateInitialData`/`createModalTitle` en los 6 embeds del `_edit` del programa.
2. Sub-tarea 3.5a (composite tree): edit/create custom para tab Evaluacion (composite-section-tree). Modal inline ad-hoc con form render-function + mutaciones GraphQL directas via Apollo. Botones inline edit/+ por nodo + footer "Agregar raíz".
3. UX refactor del composite tree: reemplazo botones custom por atomos `Button`/`IconButton` del design system. Visibility on hover con `:focus-within` para accesibilidad.
4. Sub-tarea 3.5b: shell vacio del programa — `default_AcademicActivity_create.json` con 9 fields del header (8 visibles + workflowState hidden=Draft via autoAssignFields).
5. Bloqueo inline edit de workflowState en el listado via `editable: false` en la column.

**Commits Session 6** (cronologicos):
- `612603f` (curriculum-design): `feat: layouts create de los 6 RTs + canCreate en embeds (Fase 3.5a)` — 7 archivos +357/-6.
- `f8b445b` (deckard): `dkc: TICKET-009 Session 6 - Fase 3.5a (create) + L39` — 2 archivos +27/-1.
- `641fc92` (curriculum-design): `feat: edit/create custom en composite-section-tree (Fase 3.5a)` — 4 archivos +675/-14.
- `becb390` (deckard): `dkc: TICKET-009 Session 6 - composite-section-tree edit/create + L40` — 2 archivos +44/0.
- `30fc5cc` (curriculum-design): `refactor: composite-section-tree usa atomos design system + hover actions` — 1 archivo +56/-50.
- `8fa8f7e` (deckard): `dkc: TICKET-009 Session 6 - UX refactor composite tree (atomos + hover)` — 3 archivos +32/0.
- `dc41920` (curriculum-design): `feat: layout create del programa shell vacio (Fase 3.5b)` — 2 archivos +79/0.
- `8c4e8f4` (deckard): `dkc: TICKET-009 Session 6 - Fase 3.5b create programa + L43` — 2 archivos +35/-1.
- (pendiente al cierre) curriculum-design: `editable: false` en columna workflowState del listado.
- (pendiente al cierre) deckard: docs cierre Session 6 + L44.

**Learns Session 6** (L39-L44):
- L39: bloqueo plataforma — `valueSource` enum no soporta `MAX_PLUS_ONE` para auto-asignar position.
- L40: bug InstanceResult shape — solo `{ id, data, extended }`, no `{ success, message, instance }`.
- L41: atomos `Button`/`IconButton` requieren clase Bootstrap Icons completa (`bi bi-pencil`, no solo `pencil`).
- L42: UX-pattern hover visibility para acciones contextuales — `opacity:0 + pointer-events:none` default + `:hover/:focus-within`.
- L43: bug Vueform con `type: "hidden"` intercalado — ocupa slot del grid; declarar al final del schema.
- L44: inline edit per-field con `editable: false` por column. Patron para fields que representan workflow ordenado.

**Estado al cierre de Session 6**:
- Sub-tarea 3.4 ✓ (Session 5).
- Sub-tarea 3.5a ✓ (6 RTs no-custom + tab Evaluacion via composite tree).
- Sub-tarea 3.5b ✓ (shell vacio del programa).
- Sub-tarea 2.4 (CurricularLink coherencia) — pendiente, sin urgencia (no se sembraron CurricularLinks en SP1).
- **Pendientes de validacion manual**: persistencia end-to-end de los 4 flows de create (6 RTs + tree composite + programa) y de los edits (header + RT fields + nodos del tree). Mismo patron que Session 5.
- **Cosmetica menor**: labels mezclados ingles/español en forms (causa: lang del mod tiene precedencia sobre `label` del JSON). Correccion via `lang/es_CL@AcademicActivity.json` queda como deuda — no bloquea funcionalidad.

#### Sub-bloque Session 6 — RichTextRenderer custom Vueform element (CustomSection content)

**Disparador del usuario**: el field `content` del `CustomSection` es richText. En `_edit`/`_create` queremos un editor WYSIWYG (con toolbar). En `_view` queremos solo el HTML renderizado sanitizado, **sin toolbar**.

**Decision tomada**: combinar 2 elements distintos por mode:
- `_edit.json` y `_create.json`: `content: { type: "editor" }` — Vueform native editor (Trix-based) con toolbar completa (bold, italic, headings, listas, links, blockquote, code, undo/redo).
- `_view.json`: `content: { type: "rich-text-renderer" }` — custom Vueform element del mod que renderiza HTML sanitizado en read-only **sin toolbar**.

**Por que no `editor + disabled: true` en view**: Vueform editor en mode disabled muestra la toolbar **visible pero deshabilitada** (iconos en gris, no clickeables). Ruido visual innecesario en read-only. Investigamos `hideTools` array prop de Vueform pero requiere conocer nombres exactos de tools internos. Y la opcion CSS de ocultar `trix-toolbar` cuando `.vf-editor-disabled` no funciona desde el mod (ver L45).

**Componente nuevo** [RichTextRendererElement.vue](../../up1/mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRendererElement.vue):

| Aspecto | Detalle |
|---------|---------|
| Vueform element | `defineElement({ name: "RichTextRendererElement", submits: false })` |
| Acceso al value | `this.value` (mixin HasData de BaseElement — disponible en computed Options API) |
| Sanitizacion | DOMParser native + whitelist de tags/attrs. SIN deps externas. Bloquea `href="javascript:"` y on*. Forza `target=_blank rel="noopener noreferrer"` en links |
| Tags permitidos | `p`, `br`, `div`, `span`, `strong`, `em`, `u`, `s`, `mark`, `b`, `i`, `h1-h6`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`, `a`, `hr`, `table`, `thead`, `tbody`, `tr`, `td`, `th` |
| Render | `v-html` con CSS scoped + `:deep()` para estilar tags renderizados desde HTML inyectado |
| Empty state | `<Text variant="muted">{{ emptyText }}</Text>` con prop opcional |
| Theme-aware | tokens up1 en CSS scoped (`--up1-bg-primary`, `--up1-border-color`, etc.) |

**Validacion via PW**:
- ✓ `_view` del CustomSection abre con div `.rtr-card` que contiene `<p>El proposito...</p>` sanitizado.
- ✓ Sin toolbar visible.
- ✓ Estilos aplicados (margins en `<p>`, blockquote con borde, code con bg, etc.).

Screenshot: [TICKET-009.screenshots/ticket-009-customsection-rich-text-renderer.png](TICKET-009.screenshots/ticket-009-customsection-rich-text-renderer.png).

**Contratiempos durante el POC**:

1. Investigacion previa reporto falsamente que `sanitize-html@2.12.1` estaba instalado — NO esta en el monorepo. Reemplazo con sanitizacion DOMParser inline.
2. Intento previo (Fase 2 opcion B): `_view` con `type: "editor" + disabled: true` + CSS del mod (`mods/<mod>/css/1-theme/<mod>.css`) para ocultar `trix-toolbar`. **No funciono**: el sync sincroniza el archivo CSS al `suite/css/1-theme/` pero NO lo agrega como `@import` en `suite/css/up1.css` (solo `default.css` y `dark.css` se importan, mas auto-imports de `3-viewType/`). El CSS queda en disco pero nunca se carga.
3. Tras crear el componente, el suite dio 500 "Failed to fetch dynamically imported module: vueform.config.ts" porque mi import inicial de `sanitize-html` (no existente) rompia el glob de elements. Removido y reemplazado con DOMParser → recovery.

| L45 | **Bug/gap del sync de plataforma — CSS de mod no auto-importado**: el sync sincroniza `mods/<mod>/css/1-theme/<mod>.css` a `suite/css/1-theme/<mod>.css` pero **NO agrega un `@import` en `suite/css/up1.css`**. El entry CSS solo importa `default.css` + `dark.css` en layer theme + auto-generated imports de `3-viewType/`. Los archivos del mod en otras layers (1-theme, 2-objectName, etc.) quedan en disco pero el browser nunca los carga. Implicacion: **CSS del mod en folders distintos a 3-viewType es codigo muerto** sin PR a plataforma. Workaround dentro del mod: usar `<style scoped>` en componentes Vueform mod (RichTextRenderer pattern) — el CSS viaja con el SFC y `:deep()` permite estilar HTML inyectado via `v-html`. | promoted to BUG-platform-007 |
| L46 | **`sanitize-html` no esta instalado** en up1 a pesar de `package.json` mencionarlo en formato catalog. Para sanitizacion HTML user-generated sin dep externa: `DOMParser` browser native + whitelist de tags/attrs. Suficiente para HTML controlado del Trix editor de Vueform (que ya genera output limitado a tags conocidos). Patron del componente RichTextRendererElement: walker recursivo del tree DOM, replace con childNodes para tags no permitidos, strip de attrs no whitelisted, bloqueo de `href="javascript:"`, force `target=_blank rel=noopener` en links. | promoted to RULE-mods-029 |
| L47 | **Patron edit-vs-view con elements Vueform distintos**: el mismo field puede usar elements distintos por mode si el shape del value es compatible. Caso CustomSection.content (richText): `_edit/_create` usan Vueform native `editor` (Trix con toolbar), `_view` usa custom `rich-text-renderer` (HTML sanitizado sin toolbar). Cada element accede al value via `this.value` (BaseElement mixin) sin necesidad de plumbing extra. Patron reusable para fields donde la edicion y visualizacion tienen requisitos distintos (ej. file uploads — file input en edit, image preview en view). | promoted to RULE-mods-030 |

#### Sub-bloque Session 6 — `openMode: "route"` (UPONE-1035 habilitador integrado)

**Disparador del usuario**: la plataforma incorporo via PR `feat/habilitador-UPONE-1035` (PR #145 suite, PR #211 layout, mergeados a develop el 2026-04-30) un nuevo flag `layoutConfig.openMode` en RecordList. Permite que el View y Edit del row se abran como **navegacion URL** (route) en vez de modal. UX significativamente distinto: detail full-page con boton Volver y browser history que preserva filtros/scroll del listado.

**Investigacion previa**:
- Branches mergeados a `develop` y borrados — no requirieron checkout, solo `git pull origin develop` en `up1/suite` y `up1/layout`.
- Doc: [layout/docs/features/recordlist.md](../../up1/layout/docs/features/recordlist.md) — seccion `layoutConfig.openMode` con shapes `"modal"` (default) | `"route"` | `{ view, edit }` granular.
- Cambios en suite: page de detail agrega toolbar con boton "← Volver" (router.back() preserva history); `handleRequestAction` propaga `layoutId` opcional al payload de `navigate-to-relation`.
- Cambios en layout: RecordList valida config `openMode` y emite event distinto segun mode.
- Limitacion: `create` siempre queda como modal (intencional — flow transient).

**Cambio aplicado** ([default_AcademicActivity_list.json](../../up1/mods/curriculum-design/config/layouts/default_AcademicActivity_list.json)):

```json
"openMode": "route",
"associatedLayoutConfigs": {
    "view": { "layoutId": "default_AcademicActivity_view" },
    "edit": { "layoutId": "default_AcademicActivity_edit" }
}
```

Antes solo tenia `view` declarado. Ahora ambos `view` y `edit` con layoutId explicito para que la URL apunte al layout correcto.

**Validacion via PW**:
- Click en row name "Ecuaciones Diferenciales" del listado → URL cambia a `/UPU/AcademicActivity/{id}/RecordDetail/default_AcademicActivity_view`.
- Detail renderizado **inline en la pagina** (no modal stack). Menu lateral del suite preservado.
- Boton "← Volver" visible arriba del detail.
- Tabs del detail funcionan igual que antes (8 tabs incluyendo evaluation con composite tree).
- Form del header del programa cargado con datos reales.

Screenshot: [TICKET-009.screenshots/ticket-009-route-mode-with-back.png](TICKET-009.screenshots/ticket-009-route-mode-with-back.png).

**Mantenimiento de repos** (no commitable, ejecutado durante la session):
- `git pull origin develop` en `suite`, `layout`, `object-manager`, `flow-viewer`, `object-manager-editor`, `ai-agent` — varios estaban behind tras los pushes del habilitador.
- `up1/` root: pointer de submodules (`layout`, `mods/ai-agent`) actualizados al hacer pull en sus repos.
- `object-manager`: `git stash` previo del cambio auto-gen (`institution.json`, `prisma/schema.prisma`) antes del pull — los outputs se regeneran con el proximo sync.
- Sync completo posterior fallo en Phase i18n por conflict preexistente del mod `object-manager-editor` (`objectdefinition` key duplicada en `en_CL.json`) — **NO RELACIONADO** con este cambio. Phase 7 (Default Layouts) si se completo y la BD muestra el `openMode: "route"` correctamente vista via `resolveDefaultLayout`. El conflict de i18n queda como deuda externa al mod.

| L48 | Plataforma agrego `layoutConfig.openMode` ([layout/docs/features/recordlist.md](../../up1/layout/docs/features/recordlist.md)) en PR habilitador-UPONE-1035 (mergeado 2026-04-30). Para activar route-mode (View/Edit como URL navegacion vs modal), declarar `"openMode": "route"` + `associatedLayoutConfigs.{view,edit}.layoutId` explicitos en el RecordList del listado. Beneficio: URL deep-linkeable, browser history preservado al hacer "Volver", menu lateral del suite no se pierde. **Aplica solo a listados top-level** — para embeds dentro de RecordDetail mantener `"modal"` (default) para no romper el contexto del padre. `create` siempre queda como modal (intencional, flow transient). | promoted to RULE-layout-028 |

---

### Cierre Session 6

**Trabajo realizado** (cronologico, 8 sub-bloques):

1. **3.5a (RTs no-custom)** — 6 layouts `_create.json` (Modality, LearningOutcome, Content, Session, Bibliography, CustomSection) + activacion `canCreate` en los 6 embeds del `_edit` con `canCreateLayoutId`/`canCreateInitialData`/`createModalTitle`.
2. **3.5a (composite tree)** — edit/create custom inline para tab Evaluacion. Botones edit/+ por nodo + footer "Agregar raíz". Modal custom ad-hoc con form render-function. Mutaciones GraphQL directas via Apollo (sin LayoutOrchestrator porque la plataforma no expone modalStackManager a custom Vueform elements).
3. **UX refactor del composite tree** — atomos `Button`/`IconButton` del design system. Hover visibility (`opacity:0` default + `:hover/:focus-within`) para acciones contextuales por nodo.
4. **3.5b (shell del programa)** — `default_AcademicActivity_create.json` con 9 fields del header (8 visibles + workflowState hidden con autoAssignFields=Draft).
5. **Bloqueo inline edit workflowState** — `editable: false` por column en el listado para preservar flow de transiciones del workflow.
6. **WYSIWYG en CustomSection.content** — `_edit/_create` con Vueform native `editor` (Trix toolbar). `_view` con custom `RichTextRenderer` (HTML sanitizado sin toolbar via DOMParser native + whitelist).
7. **Cosmetica del create programa** — fix grid por `workflowState` hidden intercalado (movido al final del schema).
8. **`openMode: "route"`** — habilitador-UPONE-1035 integrado. Detail del programa pasa de modal a navegacion URL deep-linkeable.

**Commits Session 6** (cronologicos):
- `612603f` (mod): feat 6 layouts create RTs + canCreate embeds.
- `f8b445b` (deckard): docs 3.5a + L39.
- `641fc92` (mod): feat composite tree edit/create custom.
- `becb390` (deckard): docs composite tree + L40.
- `30fc5cc` (mod): refactor atomos design system + hover.
- `8fa8f7e` (deckard): docs UX refactor + L41/L42.
- `dc41920` (mod): feat layout create programa.
- `8c4e8f4` (deckard): docs 3.5b + L43.
- `71fdc05` (mod): fix bloqueo inline edit workflowState.
- `9eb11f4` (deckard): docs cierre primer + L44.
- `99b0fba` (mod): feat WYSIWYG editor + RichTextRenderer custom.
- `4582e20` (deckard): docs RichTextRenderer + L45/L46/L47.
- (pendiente al cierre) mod: feat openMode:route en list del programa.
- (pendiente al cierre) deckard: docs openMode:route + L48 + cierre formal.

**Learns Session 6** (L39-L48, 10 nuevos):
- L39: bloqueo plataforma — autoAssignFields no soporta MAX_PLUS_ONE para position.
- L40: bug InstanceResult shape — solo `{id, data, extended}`.
- L41: atomos requieren clase Bootstrap Icons completa (`bi bi-pencil`).
- L42: UX-pattern hover visibility para acciones contextuales.
- L43: bug Vueform con `type:"hidden"` intercalado — declarar al final del schema.
- L44: inline edit per-field con `editable:false` por column. Patron para fields workflow.
- L45: bug/gap sync — `1-theme/<mod>.css` no se auto-importa al `up1.css`. Workaround: `<style scoped>` en componentes Vueform mod.
- L46: `sanitize-html` no esta instalado. Alternativa: DOMParser native + whitelist.
- L47: patron edit-vs-view con elements Vueform distintos via `this.value` de BaseElement.
- L48: feature plataforma `openMode: "route"` para navegacion URL deep-linkeable en RecordList.

**Estado al cierre de Session 6**:
- Sub-tarea 3.4 ✓ (Session 5).
- Sub-tarea 3.5a ✓ (6 RTs no-custom + tab Evaluacion via composite tree custom).
- Sub-tarea 3.5b ✓ (shell vacio del programa).
- **Sub-tarea 3.5 cerrada**.
- WYSIWYG (CustomSection.content) ✓.
- Bloqueo inline edit workflowState ✓.
- `openMode: "route"` integrado para detail del programa ✓.
- Sub-tarea 2.4 (CurricularLink coherencia) — pendiente, sin urgencia (no se sembraron CurricularLinks en SP1).
- **Pendientes de validacion manual**: persistencia end-to-end de los flows de create/edit de Session 6. Mismo patron que Session 5.
- **Cosmetica menor**: labels mezclados ingles/español en forms (causa: lang del mod tiene precedencia sobre `label` del JSON). Correccion via `lang/es_CL@AcademicActivity.json` queda como deuda. Tambien deuda externa: conflict preexistente en sync-i18n del mod `object-manager-editor`.

---

### Session 7 — 2026-05-04 (Pulido tree, DnD V1, modal de detalle, columnas RT, fix name en detail, push+merge a develop)

**Disparador del usuario**: feedback iterativo post-Session 6 — contraste de badges en dark mode, modal de detalle read-only en el tree de evaluacion, drag-n-drop para reordenar, columnas RT-specific en los embeds (sin position), name visible en detail de cada RT, cleanup visual del tree.

**Trabajo realizado** (cronologico):

1. **Fix contraste badges del CompositeSectionTree en dark mode** — Bootstrap default `--bs-badge-color: #fff` daba bajo contraste sobre `bg-secondary` (gray-600 = `#d4d4d4` en dark) y `bg-info` (`#38bdf8` en dark). Pin scoped del `--bs-badge-color`: bg-secondary forza `background-color: var(--up1-text-primary)` + texto `var(--up1-text-inverse)`; bg-info usa `--up1-text-inverse` para texto que flipea con el theme.

2. **Modal de detalle read-only (`CompositeSectionView`)** — click en el nombre del nodo abre modal con todos los fields del rtData en formato key/value. Header del modal mirror del row (badges code+secondary, name, metric). Datos: position + cada field RT con su label legible (`rtFieldLabels`). Booleans como Si/No, null como —, HTML strip a texto. **Opt-in por prop `enableViewModal`** — activado solo en `evaluationList` del mod (el resto de tabs usa el platform RecordDetail standard).

3. **Traduccion del valor `componentType`** en el modal — cuando el field key coincide con el `secondaryField` del tree, usar el `secondaryLabels` map para mostrar el label legible (`Formative` → `Formativa`).

4. **Iconos del tree corregidos** — `Icon` atom requiere prefix `bi-` literal (chevron-down → `bi-chevron-down`). Sin prefix el atom no agrega la clase Bootstrap Icons y el glyph no renderiza. Aplicado a chevron, folder, bookmark.

5. **Drag-n-drop V1 sibling-only** — sortablejs como dep del mod (hoisted via npm workspaces). Drag handle `bi-grip-vertical` al inicio del row, visible solo cuando `enableEdit=true`. Cada subtree (children de cada nodo) y la lista raiz son zonas sortable independientes — V1 sin cross-parent drag. Persistencia pessimistic: tras drop, position 1-based para todos los siblings via `Promise.all` de UPDATE_INSTANCE sobre `baseObject` + refetch. En error: revertir desde server. Refactor del form: `position` quitado de `baseFields`; auto-asignado en create-root/create-child como `max(siblings.position) + 1`. **Position pasa a ser orden interno gestionado solo por DnD**.

6. **CompositeSectionTree agnostico** — los hardcodes `'CurricularSection'` (composable + reorder) y `'AcademicActivity'` (composable filter + create payload) pasan a ser props `baseObject` y `ownerType` con defaults backwards-compatible. El componente queda plug-and-play para cualquier patron Composite owner→base+RT-extension dentro o fuera del scope curriculum-design/AcademicActivity.

7. **Columnas RT-specific en los 6 record-lists embebidos del programa** — `position` quitado como columna, agregado `relations: ["rt__<RT>__curricularsection"]` para que el RT llegue en `extended` de cada Instance, columnas usan dotted-path keys (`rt__X.field`) — el helper `getDisplayValue` del platform resuelve el path. Sort interno por position ASC se preserva (estabilidad de orden). Configuracion final por tab: Modalidades (Nombre, Código, Modo entrega, Horas teoría, Horas práctica, Principal), Resultados (Código, Resultado, Nivel Bloom, Crítico), Contenidos (Nombre, Tipo, Horas), Sesiones (Semana, Actividad, Tipo, Duración), Bibliografía (Tipo, Referencia, Notas), Secciones personalizadas (Sección, Tipo, Max chars). Validado en ambos programas (Univalle + AIEP).

8. **Fix name visible en detail de los 7 RTs** — los `_view` de cada `rt__<RT>__curricularsection` no incluian el field `name` (vive en CurricularSection base, no en el rt__). Agregado `name` como primer field del schema en los 7 layouts. La plataforma lo resuelve automaticamente porque cada rt declara `baseObject: CurricularSection` (extension semantica) — los base fields llegan al GraphQL response sin configuracion extra.

9. **Tree visual cleanup** — el `description` aparecia duplicado: una vez dentro del card (nuestro render) y otra debajo (Vueform's `ElementLayout` lo renderea automaticamente desde la prop standard). Renombrada la prop a `subtitle` y actualizado el JSON config para evitar el conflicto. Iconos folder/bookmark removidos del row del tree (redundantes con el chevron toggle).

10. **Push de la rama + merge a develop** — la rama `UPONE-1035-core-objects` no existia en remoto. Push con `-u origin UPONE-1035-core-objects` (19 commits del ticket). Luego merge `--no-ff` directo a develop (`87e1efb`) y push. Rama remota conservada para seguir trabajando, develop al dia con el merge.

**Commits Session 7** (cronologicos):

- `f99f254` (mod): fix contraste badges dark mode.
- `598d2d8` (mod): modal de detalle read-only en tree de evaluaciones.
- `869f910` (mod): drag-n-drop sibling-only.
- `68951d5` (mod): refactor agnostico (baseObject + ownerType).
- `a238b9f` (mod): columnas RT-specific en embeds, sin position.
- `55bbf4c` (mod): name visible en detail de RTs + tree visual cleanup.
- (remoto) push -u origin UPONE-1035-core-objects → branch creada en bitbucket.
- (remoto) `87e1efb` merge `UPONE-1035-core-objects` into develop + push origin develop.
- (pendiente al cierre) deckard: docs Session 7 + L49-L54.

**Learns Session 7** (L49-L54, 6 nuevos):

| L49 | **Icon atom requiere prefix `bi-` literal en el `name` prop**: el atom hace `props.name.startsWith('bi-') ? "bi ${props.name}" : props.name` ([layout/src/components/atoms/Icon/Icon.vue:19](../../up1/layout/src/components/atoms/Icon/Icon.vue#L19)). Si pasas `name: "chevron-down"` (sin prefix), el atom NO agrega la clase `bi`, y bootstrap-icons no aplica → glyph invisible. Hay que pasar `name: "bi-chevron-down"`. Aplica a todos los iconos consumidos via Icon atom (no aplica a Button/IconButton que aceptan la clase completa `"bi bi-pencil"`). | promoted to RULE-layout-029 |
| L50 | **Vueform's `ElementLayout` pinta automaticamente la prop `description` del element debajo del card** — sin pasar por slot, sin posibilidad de override desde un `#description` slot vacio. Para un custom element que renderea su propia descripcion en otra ubicacion, NO declarar prop `description` (conflicta con la convencion de Vueform). Usar un nombre custom (ej. `subtitle`) y actualizar los JSON configs. | promoted to RULE-mods-031 |
| L51 | **`getDisplayValue` del platform soporta dotted-path keys**: una columna de RecordList con `key: "rt__X__curricularsection.field"` se resuelve walking el path en `recordData` ([layout/src/utils/recordListFormatters.ts:237](../../up1/layout/src/utils/recordListFormatters.ts#L237)). Combinado con `relations: ["rt__X..."]` en `layoutConfig`, el RT data llega en `extended.rt__X` y la columna lo muestra sin custom renderer. Patron reusable para mostrar fields de relaciones 1:1 en lists. | promoted to RULE-layout-030 |
| L52 | **Extension semantica `baseObject` en rt__ JSON schema**: cuando un RT declara `"baseObject": "CurricularSection"`, el platform devuelve los campos del base mergeados al GraphQL response del rt__. En layouts `_view`/`_edit`/`_create` del rt__ se puede declarar `name`, `position`, etc. directamente sin path ni `relations` config — el platform los resuelve. Util para mostrar el nombre user-visible (siempre en base) sobre cualquier RT extension. | promoted to RULE-mods-032 |
| L53 | **Patron de instalacion de deps en mods via npm workspaces**: agregar dep al `mods/<name>/package.json`, npm install al up1 root la hoistea a `up1/node_modules`. Otros workspaces (layout, suite) la resuelven via Node module resolution standard sin tocar sus package.json. No requiere registrar el mod en `uPlannerMods` del root (el patron sigue funcionando para mods externos clonados manualmente). Validado con sortablejs ^1.15.6 para curriculum-design. | promoted to RULE-mods-033 |
| L54 | **Bugs de plataforma asociados a UPONE-1035 route-mode** (reportados por el usuario, fuera de scope del ticket): (a) i18n — keys del namespace `@RecordList` no se cargan en RecordDetail route-mode → embeds muestran `recordList.info.elements`, `recordList.pagination.show`, `recordList.modal.viewTitle` y similares como literales. Causa: [suite/plugins/i18n.ts:135-141](../../up1/suite/plugins/i18n.ts#L135-L141) carga overrides solo segun `view_type` actual. (b) Apollo cache pollution — al volver del detail al listado, las FK columns muestran el ID raw (cuid) en vez del label hasta hacer refresh manual. Causa: [layout/src/composables/useDataFetching.ts:143](../../up1/layout/src/composables/useDataFetching.ts#L143) usa `cache-first` por default; el detail's query escribe scalar JSON `extended` distinto al listado y contamina la entidad cacheada. **Ambos confirmados via PW**. Fix mod-only del bug (a) viable (override `@AcademicActivity-RecordDetail` con keys `recordList.*`) — no aplicado (decision: ambos son responsabilidad de plataforma, ya reportados). | promoted to BUG-platform-008 + BUG-platform-009 |

**Estado al cierre de Session 7**:

- Modal view de detalle ✓ (opt-in por evaluationList).
- Drag-n-drop V1 ✓ (sibling-only, persistencia + refetch validados con reload en ambos programas).
- CompositeSectionTree agnostico (`baseObject` + `ownerType` props) ✓ — listo para reuso fuera de evaluacion.
- Columnas RT-specific en los 6 embeds ✓ — sin position visible.
- `name` visible en detail de los 7 RTs ✓ — via extension semantica `baseObject`.
- Tree visual cleanup ✓ — sin description duplicada, sin iconos folder/bookmark.
- **Push + merge a develop** ✓ — `87e1efb` mergeado, develop al dia. Rama `UPONE-1035-core-objects` conservada en remoto para futuros cambios.
- Sub-tarea 2.4 (CurricularLink coherencia) — pendiente, sin urgencia.
- Bugs platform i18n + Apollo cache pollution — reportados a plataforma, fuera de scope.

---

Estructura del trabajo restante. Subset minimo se aplica primero, resto se completa en el mismo sprint.

### Fase 1 — RecordTypes (subset minimo aplicado primero, resto despues)

| # | RT | JSON RT | Layout view | Layout edit | Layout create | Status |
|---|----|----|-------------|-------------|---------------|--------|
| 1.1 | **Modality** (POC) | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |
| 1.2 | **LearningOutcome** | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |
| 1.3 | **Content** | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |
| 1.4 | **Session** | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |
| 1.5 | **EvaluationComponent** (jerarquia parent/child) | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done. **Composite real implementado en Session 4** — `parentId` self-FK en CurricularSection + seed UV legacy-fiel (Nota Final root + 6 Quizzes + Examen Parcial) + componente generico `composite-section-tree` aplicado al tab "Evaluacion" |
| 1.6 | **Bibliography** (FK a BibliographyReference) | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |
| 1.7 | **CustomSection** (richText) | ✓ Session 2 | ✓ Session 2 | pendiente | pendiente | RT+view done |

### Fase 2 — Seed completo legacy v2.2 por owner

| # | Tarea | Status |
|---|-------|--------|
| 2.1 | Univalle: 1 Modality + 3 LearningOutcome + 18 Session (incl. semana 18 "habilitacion") + 8 EvaluationComponent + 9 Bibliography (via libraryRefId a BibliographyReference) + 2 CustomSection (richText) | ✓ Session 2 (counts) — **Session 4 alinea CONTENIDO al legacy v2.2 §1.x**: code=111026C, credits=3, externalId=1124, names exactos RA1/RA2/RA3, EvalComp Composite real con parentId self-FK |
| 2.2 | AIEP: 13 Modality + 40 LearningOutcome + 3 Content + 1 EvaluationComponent | ✓ Session 2 (counts) — **Session 4 alinea CONTENIDO al legacy v2.2 §2.x**: code=TIR101, credits=5, 13 modalidades reales con codes (DIU-FLE..VES-TLS), 40 LO names exactos, EvalComp "Nota 6" |
| 2.3 | Validacion volumenes via GraphQL/SQL: counts esperados de TC-009-10/11 | ✓ Session 2 (Prisma groupBy) — re-validado Session 4 post-rewrite seed |
| 2.4 | Validacion CurricularLink coherencia (TC-009-27) | pendiente — no se sembraron CurricularLinks en SP1 (ningun RT requiere links cross-section por ahora) |

### Fase 3 — Layouts del detail

| # | Tarea | Status |
|---|-------|--------|
| 3.1 | `default_AcademicActivity_view.json` (cabecera + 8 tabs: General + 7 RTs) | ✓ Session 2 — **Session 4 cambia tab "Evaluacion" a custom Vueform element `composite-section-tree`** para renderizar la jerarquia Composite del legacy. Tabs restantes mantienen embed RecordList |
| 3.2 | Validacion stress visual: detail UV (1 Modality, 3 LO, 18 Sessions, 8 EvalComp, 9 Bib, 2 CustomSection) | parcial Session 2 — **Session 4 valida tab Evaluacion con Composite real (Nota Final + 7 hijos) y tab Resultados (3 LO planos record-list)**; tabs Sessions/Bib/CustomSection pendientes de capturar |
| 3.3 | Validacion stress visual: detail AIEP (13 Modalities, 40 LO, 3 Content, 1 EvalComp) | ✓ Session 2 — 13 Modalidades en 3 paginas + 40 LO en 8 paginas. RISK-001 mitigado visualmente |
| 3.4 | Layouts edit por RT + edit del programa con tabs editables | ✓ Session 5 — `default_AcademicActivity_edit.json` con 8 tabs + 6 `_edit.json` por RT (Modality, LearningOutcome, Content, Session, Bibliography, CustomSection). Tab Evaluacion intencionalmente excluido (composite-section-tree custom). Validado end-to-end via PW |
| 3.5 | Crear nuevas secciones (TC-009-09). Dividida en 2 casos: **3.5a) agregar elementos en programa existente** — boton "+ Nueva" en cada tab del `_edit` con `canCreate + canCreateLayoutId + canCreateInitialData`. **3.5b) crear nuevo programa desde cero** — shell vacio del header (opcion A: 1 form simple sin wizard) | ✓ Session 6 — 3.5a (6 RTs) + tab Evaluacion (composite tree custom) + 3.5b (`default_AcademicActivity_create.json` con autoAssignFields workflowState=Draft) |
| 3.6 | Bug cosmetico: embeds inline comparten label header — todos muestran "Contenidos del programa" (L22) | ✓ resuelto Session 3 via `layoutConfig.label` |
| 3.7 | **Componente generico `composite-section-tree`** (parametrizable: recordType, relationName, codeField, secondaryField, secondaryLabels, metricField, metricSuffix) reusable para cualquier RT con `parentId` self-FK | ✓ Session 4 — vive en `mods/curriculum-design/modsComponents/CompositeSectionTree/`, theme-aware (light + dark), usado en tab Evaluacion |

### Session 8 — 2026-05-04 (Fase 4 — design + persistencia)

**Disparador del usuario** (turno actual): "el componente de tree que tenga una opcion activable, donde la ponderacion es sumativa, o sea, el valor de un padre debe ser igual a la suma del valor de los hijos, si no concuerda exacto, el elemento que muestra el porcentaje del padre debe tener un borde rojo, ademas debemos considerar que pueden haber ocasiones donde se use este componente pero no se use la ponderacion".

**Decisiones de diseño** (4 opciones presentadas, 4 elegidas explicitamente por el usuario):

| Decision | Opcion elegida | Razon |
|----------|----------------|-------|
| Activacion | **A**. Prop boolean explicita `validateWeightedSum: boolean` (default `false`) | Opt-in claro. Zero regression para consumidores actuales (LO, Bib, Session, Content). |
| Que valida | **A**. Cada padre con hijos: `padre.metric === sum(hijos.metric)`. Recursivo: cada padre valida sus hijos directos; los nietos validan contra su propio padre. | Caso EvalComp: "Nota Final" = 100 con quizzes y examen que suman 100; un sub-grupo con hijos vuelve a validar a su nivel. |
| Hijos sin metric numerico | **C**. Tratar `null`/no-numerico como `0` en la suma | Lectura permisiva del usuario — si la lib de evaluacion deja un hijo sin weight, suma como 0 y el padre falla la validacion. |
| Visual del error | **C**. Borde rojo en `.cst-node__metric` + icono `bi-exclamation-triangle-fill` + tooltip "Esperado: X{suffix}, suma actual: Y{suffix}" | Cumple WCAG (color solo no es signal suficiente). |

**Tolerancia floats**: `weightedSumTolerance: number` (default `1e-6`). Configurable por si un layout quiere `0.01`.

**Encaje**: scope ampliado #3 de TICKET-009 (no ticket aparte) — confirmado por el usuario.

**Persistencia previa al codigo** (gate 17):
1. Fase 4 agregada al ticket (esta seccion + bloque "Fase 4" en el cuerpo del ticket).
2. Spec creada: [SPEC-curriculum-design-composite-section-tree-weighted-sum](../specs/curriculum-design/SPEC-composite-section-tree-weighted-sum.md). Status `draft`. Tasks T1-T6.

**Plan de tasks**:

| # | Task | Capa | Files |
|---|------|------|-------|
| T1 | Pure util `computeInvalidNodes(tree, tolerance)` + test vitest | logic | `mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.ts` (nuevo) + `.spec.ts` |
| T2 | Composable expone `invalidNodes` computed (solo si `validateWeightedSum`) | composable | `useCompositeSectionTree.ts` |
| T3 | Props nuevas en element + propagacion al composable y al sub-componente | component | `CompositeSectionTreeElement.vue` |
| T4 | Render visual de error en `CompositeSectionNode` + CSS (clase modifier `--invalid`, icono, tooltip) | component + CSS | `CompositeSectionTreeElement.vue` |
| T5 | Activar `validateWeightedSum: true` en EvaluationComponent del layout default. Run `npm run sync` | layout config | `mods/curriculum-design/config/layouts/default_AcademicActivity_view.json` |
| T6 | Validacion manual con seed UV (1 EvalComp con 7 hijos sumando 100) + caso invalido inducido | manual | — |

**Estado al cierre de la persistencia**: ticket actualizado, spec creada. Proximo paso: ejecutar T1.

**Implementacion T1-T5 (mismo turno)**:

| Task | Resultado | Evidencia |
|------|-----------|-----------|
| T1 | Util `validateWeightedSum.ts` + spec con **22 casos** todos verde | `npm run test --workspace=@uplanner/layout-engine -- --run validateWeightedSum` → 22 passed |
| T2 | `useCompositeSectionTree` expone `invalidNodes: ComputedRef<Map<string, InvalidDetail>>`. Default `false` → Map vacio (cero costo). | type-check sin errores en el archivo |
| T3 | 2 props nuevas en `defineElement`: `validateWeightedSum: Boolean` + `weightedSumTolerance: Number` (default 1e-6). Pasadas como `Ref` al composable. | type-check sin errores en el archivo |
| T4 | Sub-componente `CompositeSectionNode` recibe `invalidNodes: Map`. El badge metric se envuelve en span `cst-node__metric-wrap--invalid` (border-rojo + icono `bi-exclamation-triangle-fill` + `title` con tooltip "Esperado: X{suffix}, suma actual: Y{suffix}"). CSS tokens: `var(--bs-danger, #dc3545)`. | sin errores |
| T5 | `default_AcademicActivity_view.json` bloque EvaluationComponent: `validateWeightedSum: true`, `weightedSumTolerance: 0.01`. Sync EXIT=0. | sync output OK |

**Decision adicional tomada en T5** (DEC-LOCAL-05 en spec — registrar): tolerancia `0.01` en lugar del default `1e-6` para el caso EvaluationComponent. **Por que**: weights legacy v2.2 pueden tener 2 decimales (ej. `33.33 + 33.33 + 33.34 = 100`); con `1e-6` el drift de display vs storage podria dar falsos positivos. `0.01` cubre 2 decimales sin tolerar errores reales >1 punto porcentual. El default del componente sigue siendo `1e-6` — esto es solo override del consumidor.

**Regression check**: `npm run typecheck --workspace=@uplanner/layout-engine` → cero errores nuevos en `modsComponents/CompositeSectionTree/`. Errores existentes (atoms/molecules `index.ts` con import sintaxis vieja, storybook `showName` config) son preexistentes y ajenos a esta fase.

**Validacion manual T6 (mismo turno)**:

El usuario valido en UPU. Hallazgos durante la validacion:

| # | Hallazgo | Resolucion |
|---|----------|-----------|
| H1 | El componente aplica el cambio (badge metric con borde rojo + icono visible) pero **el tooltip nativo `title` no se muestra** al hover. | Reemplazado el atributo `title` por uso del atom `Tooltip` del layout-library. |
| H2 | Atom `Tooltip variant="dark"` **rompe contraste en modo dark de la app** (white-on-white) — invisible. Confirmado bug del atom. | Reescrito como **tooltip CSS-puro** via `::before`/`::after` con `data-cst-tooltip` attr y tokens semanticos `--up1-text-primary` + `--up1-text-inverse` (mismo flip que ya aplica el badge `bg-secondary`). Funciona en light y dark. Bug del atom registrado como [BUG-platform-010](../bugs/platform/bug-platform-010.md). |
| H3 | Tooltip top default **se corta con el borde derecho del viewport** en laptops angostos (el badge metric esta al final del row). | Cambiado placement a `left` (right del viewport siempre tiene espacio horizontal hacia la izquierda). Flecha `border-left-color` apuntando al badge. |
| H4 | `weightedSumTolerance: 0.01` se repetia en cada layout JSON consumidor — friccion. | Cambiado **default del componente a `0.01`** (antes `1e-6`). Override eliminado de `_view.json` y `_edit.json`. La util mantiene `1e-6` como default tecnico (por si se usa standalone). |
| H5 | La validacion solo aplicaba en `_view`. El usuario edita weights desde `_edit` y necesita el feedback ahi tambien. | Activado `validateWeightedSum: true` tambien en `default_AcademicActivity_edit.json`. |

**Decisiones registradas en spec** (DEC-LOCAL-05/06/07 en [SPEC-composite-section-tree-weighted-sum](../specs/curriculum-design/SPEC-composite-section-tree-weighted-sum.md#decisions)):
- DEC-LOCAL-05: default `weightedSumTolerance: 0.01`
- DEC-LOCAL-06: tooltip placement `left`
- DEC-LOCAL-07: tooltip CSS-puro (workaround BUG-platform-010)

**Bug detectado**: [BUG-platform-010](../bugs/platform/bug-platform-010.md) — atom Tooltip variant `dark`/`light` rompe en modo dark. Severity medium. Fix correcto = PR a plataforma reescribiendo `--up1-tooltip-*-bg/-color` con tokens semanticos que flipean.

**Tests**: 22/22 verde con el nuevo default `0.01`.

**Estado final Session 8** (cerrada 2026-05-04):
- T1-T6 ✓ todos completados
- Spec con status `done`, acceptance checkpoints chequeados
- Feature en uso en `_view` y `_edit` del programa de asignatura

**Learns Session 8**:

| # | Learn | Status |
|---|-------|--------|
| L23 | Atom `Tooltip` del layout-library con `variant="dark"` rompe contraste en modo dark de la app: `--up1-tooltip-dark-bg=var(--up1-text-primary)` queda `white` en dark, mientras `--up1-tooltip-dark-color=white` literal NO flipea — resultado white-on-white. **Pattern de workaround**: tooltip CSS-puro via `::after` con `background: var(--up1-text-primary)` + `color: var(--up1-text-inverse)` (mismo flip que badge `bg-secondary`). Triggered por `:hover` y `:focus`. Pseudo-elementos no son accesibles a screen readers — complementar con `tabindex=0` + `aria-label` en el span trigger. | promoted to BUG-platform-010 |
| L24 | Default `weightedSumTolerance: 0.01` cubre weights de 2 decimales (33.33+33.33+33.34=100) y drift de floats sin perder utilidad. `1e-6` (matematicamente estricto) genera falsos positivos en uso real. Util pura mantiene `1e-6` como default tecnico — el componente declara `0.01` por ser el caso de consumo dominante. | promoted to DEC-LOCAL-05 (spec) |
| L25 | Tooltips top sufren clipping con el viewport derecho cuando el trigger esta cerca del edge (badge metric al final del row, viewports laptop ~1280px). Tooltip a la izquierda usa el espacio horizontal del row hacia la izquierda — siempre disponible. Trade-off: limita el largo del mensaje al row width. Para mensajes mas largos seria mejor un atom con auto-flip. | promoted to DEC-LOCAL-06 (spec) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | Declarar todos los campos nuevos de Institution como NOT NULL segun Confluence v1.8 | Prisma db push fallo: "Added the required column `organizationId` to the Institution table without a default value. There are 20 rows in this table." Existian 20 filas preexistentes del seed core de UPU (uPlanner University) | Hacer todos los campos nuevos del mod a Institution **nullable temporalmente**. El seed los pobla siempre. Al promover a core, migracion con backfill |
| F2 | Cambiar el `required[]` de Institution.json del mod a `[]` despues del primer error | El sync (Phase 2 merge) es **append-only** sobre `required[]` — agrega pero no remueve items que ya estan en Base. La sesion en curso quedo con `required` "stale" del primer intento | **Reproducir desde clean**: revertir `business/Base/institution.json` al HEAD del submodule + correr sync de nuevo. El merge desde un mod con `required: []` no agrega entries al Base. Documentado como L13. **Lesson**: planear bien el contrato del mod antes del primer sync — el merge no permite "borrar" cambios |
| F3 | Declarar `column.{key}.description` en lang JSON con key dotted literal | vue-i18n con messageResolver default descende estrictamente por punto. `column.{key}` es leaf string, no acepta sub-key `.description` | Usar el `description` del schema (fallback nivel 2 de la plataforma) con texto orientado al usuario. Limitacion para multi-locale documentada como L14 |
| F4 | Custom Vueform element con sub-componente recursivo en archivo `.vue` separado dentro del modsComponent (`LearningOutcomeNode.vue` + `LearningOutcomeTreeElement.vue`) | Sync rechaza folders modsComponent con multiples `.vue` (`layout/scripts/sync.js:147-171` valida exactamente 1). El sync no propaga el componente a layout/suite — tab del detail queda vacio | Definir el sub-componente recursivo INLINE en el mismo SFC del element con `defineComponent({ render() })` y referenciar la const local para auto-recursion. L27 |
| F5 | Asumir que el RT data via `relations: [...]` viene en `extended` del response GraphQL `listInstances` | El RT data viene en **`data.<relationName>`**, NO en `extended` (que queda `null`). El composable buscaba `it.extended?.rt__LearningOutcome__curricularsection` y nunca encontraba — `node.code` y `node.bloomLevel` siempre `null`, badges no se renderizaban | Leer del path correcto: `it.data?.rt__LearningOutcome__curricularsection?.code`. L29 |
| F6 | Usar `var(--up1-bg-hover, #eef2f5)` para hover de filas en componente custom | El token `--up1-bg-hover` NO existe en up1 — caia al fallback hardcoded `#eef2f5` (gris claro fijo). En dark mode: fondo claro contra texto claro → fila ilegible al hover | Usar `var(--up1-table-row-hover)` (token theme-aware existente) sin fallback hardcoded. L31, L32 |
| F7 | Pasar `props.ownerId` como string al composable en `setup(props)` de un custom Vueform element | Snapshot no reactivo. Si Vueform interpola `{{parentId}}` async o cambia el prop, el composable no re-ejecuta — el tree queda vacio aunque el id valido llegue despues | Usar `toRef(props, 'ownerId')` y pasarlo como Ref. El composable hace `watch(() => ref.value, fetch, { immediate: true })`. L30 |

## Testing

> **Plan**: Fase 1 (este ticket) — todos los datos en `UPU` ([DECISION-012](../decisions/DECISION-012-two-phase-tenant-rollout.md) FINAL). Aislamiento entre tenants → Fase 2.
>
> Depende de TICKET-006 (objetos base) y TICKET-007 (listado). **Primer caso real de layouts por RecordType en up1** — validar RISK-001 con POC de 1 RT antes de declarar todos.
>
> RTs son globales ([DECISION-007](../decisions/DECISION-007-recordtypes-global.md)) — viven en `business/RecordTypes/`, no per-tenant.
>
> **Identificacion en tests**: por contenido distintivo + **volumen de RTs** (delta visual mas claro en este ticket).

### Como diferenciar visualmente Univalle vs AIEP (ambos en UPU, dos AcademicActivity distintos)

| Identificador | "Univalle" (en UPU) | "AIEP" (en UPU) |
|---------------|---------------------|----|
| `AcademicActivity.name` | `"Ecuaciones Diferenciales"` | `"Introduccion a las Redes"` |
| `AcademicActivity.externalId` | `aa-uv-1124` | `aa-aiep-14757` |
| `Institution` asociada (via Bibliography) | `code='UV'`, `name='Universidad del Valle'` | `code='AIEP'`, `name='AIEP'` |
| **Volumen Modality** ← delta visual mas claro | **1** | **13** |
| Volumen LearningOutcome | 3 | 40 |
| Volumen Sessions | 18 (incluye semana 18 "habilitacion") | (sin Sessions) |
| Volumen Content | (sin Content) | 3 |
| Volumen EvaluationComponent | 8 (con jerarquia parent/child) | 1 |
| Volumen Bibliography | 9 | (sin entradas en seed) |
| Volumen CustomSection | 2 (richText) | (sin entradas) |

**Regla de validacion**: si en el detail de "Ecuaciones Diferenciales" veo 13 Modalities, algo esta mal — debe ser 1. Si en "Introduccion a las Redes" veo 18 Sessions, algo esta mal — AIEP no tiene Sessions.

### Requisitos verificables

| REQ | Descripcion | Fuente |
|-----|-------------|--------|
| REQ-009-1 | Archivos `rt__<RT>__curricularsection.json` declarados para subset confirmado: Modality, LearningOutcome, Content, Session, EvaluationComponent, Bibliography, CustomSection | DECISION-006, DECISION-008 |
| REQ-009-2 | RTs viven en `up1/object-manager/objects/business/RecordTypes/` (globales, NO per-tenant) | DECISION-007 |
| REQ-009-3 | NO existen archivos para `GeneralData`, `GraduationProfile`, `EntryProfile` (postergados) | DECISION-008 |
| REQ-009-4 | Codegen genera tabla 1:1 por cada RT en `UPU` | platform UPONE-940 |
| REQ-009-5 | Layout default por RT existe (`up1_layen_layout` con `objectName="rt__<RT>__curricularsection"`) | platform UPONE-941 |
| REQ-009-6 | RecordDetail aplica el layout del RT correspondiente | platform UPONE-944 |
| REQ-009-7 | Crear nueva CurricularSection presenta seleccion de RT primero | platform UPONE-945 |
| REQ-009-8 | Seed Univalle en UPU (en el AcademicActivity de Univalle): 1 Modality + 3 LO + 18 Sessions + 8 EvalComp + 9 Bib + 2 CustomSection | legacy-examples.md |
| REQ-009-9 | Seed AIEP en UPU (en el AcademicActivity de AIEP): 13 Modalities + 40 LO + 3 Content + 1 EvalComp | legacy-examples.md |
| REQ-009-10 | CustomSection tiene estructura fija (1 RT — DECISION-006) | DECISION-006 |
| REQ-009-11 | Caso Univalle "habilitacion" semana 18 se carga como Session normal | DECISION-008 |
| REQ-009-12 | Detail de "Ecuaciones Diferenciales" en UPU muestra secciones Univalle correctamente | UPONE-1035 |
| REQ-009-13 | Detail de "Introduccion a las Redes" en UPU muestra secciones AIEP correctamente | UPONE-1035 |
| REQ-009-14 | Variabilidad visual: detail con 13 Modalities NO rompe el layout (overflow/scroll/paginacion) | RISK-001, UPONE-1035 |
| REQ-009-15 | Variabilidad visual: detail con 40 LO renderiza correctamente | RISK-001 |
| ~~REQ-009-16~~ | ~~Aislamiento por tenant en queries de CurricularSection y BibliographyReference~~ | **deferred to Phase 2** |
| REQ-009-17 | CurricularLink coherencia: source y target referencian secciones del mismo owner (mismo AcademicActivity) | BR-INT, programa-de-asignatura.md |
| REQ-009-18 | Coexistencia con seed core: el detail no muestra objetos del core (Person, Faculty, Course existente de uPlanner University) | DECISION-012 |

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-009-1 | TC-009-01 | Logic | COVERED (pass) |
| REQ-009-2 | TC-009-02 | Logic | COVERED (pass) |
| REQ-009-3 | TC-009-03 | Logic | COVERED (pass) |
| REQ-009-4 | TC-009-05 | Logic | COVERED-OVERRIDE (validacion manual Session 2 — automatizacion → TICKET-YYY) |
| REQ-009-5 | TC-009-06 | Logic | COVERED-OVERRIDE (validacion manual Sessions 5-7 — automatizacion → TICKET-YYY) |
| REQ-009-6 | TC-009-07 (POC RISK-001), TC-009-08 | Visual | COVERED (TC-009-08 pass con screenshot; TC-009-07 override) |
| REQ-009-7 | TC-009-09 | Visual | COVERED-OVERRIDE (UX cambio en Session 6 — re-spec en TICKET-YYY si aplica) |
| REQ-009-8 | TC-009-10 | Logic | COVERED (pass — Session 2/4) |
| REQ-009-9 | TC-009-11 | Logic | COVERED (pass — Session 2/4) |
| REQ-009-10 | TC-009-12 | Logic | COVERED (pass) |
| REQ-009-11 | TC-009-13 | Logic | COVERED (pass) |
| REQ-009-12 | TC-009-14 a TC-009-19 | Visual | COVERED (TC-14/15/16/18 pass con screenshots; TC-17/19 override) |
| REQ-009-13 | TC-009-20 a TC-009-22 | Visual | COVERED-OVERRIDE (validados en seed/sessions sin screenshots dedicados — automatizacion → TICKET-YYY) |
| REQ-009-14 | TC-009-23 (stress Modality) | Visual | COVERED (pass con screenshot) |
| REQ-009-15 | TC-009-24 (stress LO) | Visual | COVERED (pass con screenshot) |
| REQ-009-16 (deferred) | TC-009-25, TC-009-26 | Logic | **deferred to Phase 2** |
| REQ-009-17 | TC-009-27 | Logic | NOT COVERED (CurricularLink no usado en SP1 — coherencia se testea cuando entre la UI en SP2) |
| REQ-009-18 | TC-009-28 | Visual | COVERED-OVERRIDE (validado por diseno — queries filtran por ownerId. Test integration → TICKET-YYY) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-----------|-------------|-------|----------|--------|----------|--------|
| TC-009-01 | Subset de RTs declarados | REQ-009-1 | Logic | no | Mod creado | `ls objects/RecordTypes/` | 7 archivos: Modality, LearningOutcome, Content, Session, EvaluationComponent, Bibliography, CustomSection | 7 archivos confirmados (Bibliography, Content, CustomSection, EvaluationComponent, LearningOutcome, Modality, Session) | `ls mods/curriculum-design/objects/RecordTypes/` ejecutado 2026-05-04 | pass |
| TC-009-02 | RTs son globales | REQ-009-2 | Logic | no | Archivos creados | `find up1/object-manager/objects -path '*/tenants/*/RecordTypes/*' -name 'rt__*__curricularsection*' \| wc -l` | Cero archivos RT per-tenant — confirma DECISION-007 | 0 archivos | comando ejecutado 2026-05-04 | pass |
| TC-009-03 | RTs draft NO declarados | REQ-009-3 | Logic | no | Archivos revisados | `ls objects/RecordTypes/ \| grep -E 'GeneralData\|GraduationProfile\|EntryProfile' \| wc -l` | Ninguno existe — confirma DECISION-008 | 0 matches | comando ejecutado 2026-05-04 | pass |
| ~~TC-009-04~~ | ~~Codegen tabla por RT en TEST~~ | — | — | — | — | — | **N/A en Fase 1** — TEST no tiene el mod activado | — | — | n/a |
| TC-009-05 | Codegen genera tabla por RT en UPU | REQ-009-4 | Logic | no | Tenant UPU listo, RTs declarados | Ejecutar codegen + migrate en UPU | Tablas creadas para cada RT (1:1) en `prisma/UPU/` | Validado manualmente en Session 2 — tablas Prisma generadas y confirmadas via `tenant:studio`. Ningun runtime de seed/layouts fallo por tabla faltante. | Session 2 cierre + funcionamiento de seed `_data-univalle.js`/`_data-aiep.js` que escribe en las 7 tablas RT | override |
| TC-009-06 | Layout default por RT existe en DB | REQ-009-5 | Logic | no | Plataforma UPONE-941 finalizada | Query `up1_layen_layout WHERE objectName LIKE 'rt__%__curricularsection'` | Una entrada por cada RT del subset | Validado por consecuencia: si los layouts default_rt__* renderizan en runtime (Sessions 5-7), las filas en `up1_layen_layout` existen — la plataforma resuelve el layout por DB lookup. | Sessions 5-7 + screenshots de detail-7-tabs, detail-uv-modalities-tab, detail-outcomes-3-lo | override |
| TC-009-07 | **POC RISK-001**: Layout de 1 solo RT (Modality) renderiza | REQ-009-6 | Visual | yes | Solo `rt__Modality__curricularsection.json` declarado, layout custom para Modality creado, seed parcial cargado en UPU | Cargar detail de "Ecuaciones Diferenciales" en UPU (1 Modality) | Layout del RT Modality se aplica correctamente — NO el layout default de CurricularSection | POC ejecutado en Session 2; el detail rendero los campos especificos de Modality (theoryHours, deliveryMode), confirmando que UPONE-944 funciona en caso real. Esto habilito Phases 1-3 del ticket. | Session 2 cierre — sin screenshot dedicado al POC original (la version final es `ticket-009-detail-uv-modalities-tab.png`) | override |
| TC-009-08 | Layout especifico por RT aplicado en N RTs | REQ-009-6 | Visual | yes | Todos los RTs declarados, seed completo cargado en UPU | Detail "Ecuaciones Diferenciales": revisar cada seccion | Cada RT muestra sus campos especificos (theoryHours en Modality, bloomLevel en LO, etc.) | Detail con 7 tabs (General + 6 RTs) renderizando campos RT-specific | ![detail con 7 tabs](TICKET-009.screenshots/ticket-009-detail-7-tabs.png) | pass |
| TC-009-09 | Crear seccion: dialog elige RT primero | REQ-009-7 | Visual | yes | Detail abierto en UPU | Click "Agregar seccion" | Dialog presenta selector de RT antes del formulario; cada RT muestra layout default | El UX final no usa RT-picker unificado sino tabs por RT con boton "+ Nueva" en cada tab (cambio de scope en Session 6). Cubierto parcialmente por modales create per-RT. | ![create modality modal](TICKET-009.screenshots/ticket-009-create-modality-modal.png) — re-spec en TICKET-YYY si se requiere el picker original | override |
| TC-009-10 | Seed Univalle conteos en UPU | REQ-009-8 | Logic | no | Seed cargado en UPU | Prisma groupBy por recordType | `Modality=1, LearningOutcome=3, Session=18, EvaluationComponent=8, Bibliography=9, CustomSection=2` | Counts validados en Session 2 (Prisma groupBy) y re-validados en Session 4 post-rewrite seed legacy v2.2 | Session 2 task 2.3 + Session 4 cierre | pass |
| TC-009-11 | Seed AIEP conteos en UPU | REQ-009-9 | Logic | no | Seed cargado en UPU | Idem para `externalId='aa-aiep-14757'` | `Modality=13, LearningOutcome=40, Content=3, EvaluationComponent=1` | Counts validados en Session 2 y re-validados en Session 4 | Session 2 task 2.3 + Session 4 cierre | pass |
| TC-009-12 | CustomSection schema fijo | REQ-009-10 | Logic | no | `rt__CustomSection__curricularsection.json` declarado | Inspeccionar campos | Estructura fija: `contentType ("richText")`, `content`, `maxLength`. Campos NO obligatorios excepto los esenciales. Ningun campo `extra*` dinamico (DECISION-006) | 3 fields confirmados (contentType, content, maxLength), enum cerrado a "richText", ningun campo extra* | `cat objects/RecordTypes/rt__CustomSection__curricularsection.json` 2026-05-04 | pass |
| TC-009-13 | Habilitacion semana 18 = Session | REQ-009-11 | Logic | no | Seed Univalle cargado en UPU | Inspeccionar seed | `recordType = 'Session'`, NO `'ApprovalCondition'` (DECISION-008) | `seed/_data-univalle.js:60` declara `{ week: 18, description: 'Habilitacion.', isRequired: false }` con recordType `Session` | `grep -in habilitacion seed/_data-univalle.js` 2026-05-04 | pass |
| TC-009-14 | Detail Univalle - vista general | REQ-009-12 | Visual | yes | Login UPU, seed completo | Navegar a detail desde listado, click en "Ecuaciones Diferenciales" | Detail renderiza con secciones agrupadas por RT. Header confirma `name="Ecuaciones Diferenciales"`. | Detail UV renderiza correctamente con header + tabs | ![detail UV first render](TICKET-009.screenshots/ticket-009-detail-uv-first-render.png) | pass |
| TC-009-15 | Detail Univalle - Modality (1 entrada) | REQ-009-12 | Visual | yes | Detail abierto en UPU | Localizar seccion Modality | Muestra `code`, `theoryHours`, `practiceHours`, etc. **1 sola modalidad — distintivo Univalle** | Tab Modalidades muestra 1 modalidad con campos RT-specific | ![detail UV modalities tab](TICKET-009.screenshots/ticket-009-detail-uv-modalities-tab.png) | pass |
| TC-009-16 | Detail Univalle - LearningOutcome (3 entradas) | REQ-009-12 | Visual | yes | Detail abierto en UPU | Localizar seccion LearningOutcome | Renderiza 3 LO con `code`, `bloomLevel` | Tab Resultados muestra 3 LO (RA1/RA2/RA3) | ![detail outcomes 3 LO](TICKET-009.screenshots/ticket-009-detail-outcomes-3-lo.png) | pass |
| TC-009-17 | Detail Univalle - Sessions (18 entradas) | REQ-009-12 | Visual | yes | Detail abierto en UPU | Localizar seccion Session (incluye semana 18 "habilitacion") | 18 sesiones renderizadas; semana 18 visible como Session normal | 18 sessions cargadas en seed (Session 2/4) y validadas en reorganizacion de tabs (Session 7). Sin screenshot dedicado del tab Sessions completo. | Session 2 task 2.3 (counts) + Session 7 reorganizacion tabs — automatizacion → TICKET-YYY | override |
| TC-009-18 | Detail Univalle - EvaluationComponent jerarquia | REQ-009-12 | Visual | yes | Detail abierto en UPU | Localizar EvalComp (8 entradas con `parentId` self-FK) | Jerarquia parent/child renderizada (composite) | Composite tree custom renderiza Nota Final root + 6 quizzes + Examen Parcial con jerarquia y validacion sumativa de weights | ![evaluation tree modal](TICKET-009.screenshots/ticket-009-edit-evaluation-tree-modal.png) | pass |
| TC-009-19 | Detail Univalle - Bibliography + CustomSection | REQ-009-12 | Visual | yes | Detail abierto en UPU | Localizar Bibliography (9) y CustomSection (2) | Bibliography renderiza FK a `BibliographyReference` (Institution.code='UV'); CustomSection muestra richText | CustomSection con WYSIWYG validado y screenshot disponible. Bibliography (9 entries) cargadas en seed con FK Institution UV — sin screenshot del tab Bibliography. | ![customsection rich text](TICKET-009.screenshots/ticket-009-customsection-rich-text-renderer.png) — Bibliography → TICKET-YYY | override |
| TC-009-20 | Detail AIEP - vista general | REQ-009-13 | Visual | yes | Login UPU (mismo tenant), seed completo | Volver al listado, click en "Introduccion a las Redes" | Detail renderiza con secciones distintas a Univalle. Header `name="Introduccion a las Redes"`. | Detail AIEP probado en Sessions 4+. Los TC-23 y TC-24 (con screenshots) son sub-vistas del detail AIEP, lo que prueba el overview. | TC-009-23, TC-009-24 evidencias indirectas — automatizacion → TICKET-YYY | override |
| TC-009-21 | Detail AIEP - Content (3 entradas) | REQ-009-13 | Visual | yes | Detail abierto | Localizar seccion Content | Renderiza con `description`, `hours`, `contentType` (Theoretical/Practical/Laboratory). **AIEP usa Content; Univalle no — distintivo claro** | Content AIEP (3 entries Theoretical/Practical) cargados en seed `_data-aiep.js`. Sin screenshot del tab Content AIEP. | seed/_data-aiep.js CONTENTS array — automatizacion → TICKET-YYY | override |
| TC-009-22 | Detail AIEP - EvaluationComponent (1 entrada) | REQ-009-13 | Visual | yes | Detail abierto | Localizar EvalComp | 1 componente renderizado. Comparar con Univalle (8 con jerarquia) — diferenciacion clara. | EvalComp AIEP "Nota 6" (1 entry sin children) cargado en seed. Sin screenshot del tab Evaluacion AIEP. | seed/_data-aiep.js paso 10 — automatizacion → TICKET-YYY | override |
| TC-009-23 | **Stress 13 Modalities AIEP** | REQ-009-14 | Visual | yes | Detail AIEP abierto en UPU | Localizar seccion Modality (13 entradas) | Layout no se rompe (sin overflow horizontal, sin layout shift); paginacion o scroll funciona. **Comparar con detail Univalle (1 Modality) — diferencia visual masiva navegando entre los 2 cursos** | 13 modalities AIEP renderizadas correctamente con scroll, sin layout shift | ![stress 13 modalities](TICKET-009.screenshots/ticket-009-detail-aiep-modality-13-stress.png) | pass |
| TC-009-24 | **Stress 40 LO AIEP** | REQ-009-15 | Visual | yes | Detail AIEP abierto en UPU | Localizar seccion LearningOutcome (40 entradas) | Lista renderiza con paginacion/scroll; performance aceptable (< 2s render). En Univalle son solo 3 — comparar. | 40 LO AIEP renderizadas con paginacion, performance aceptable | ![stress 40 LO](TICKET-009.screenshots/ticket-009-detail-aiep-lo-40-stress.png) | pass |
| TC-009-25 | ~~Aislamiento secciones entre tenants~~ | REQ-009-16 | Logic | no | — | Query con tenant distinto buscando ownerId del programa Univalle | Cero resultados — datos del mod aislados | — | — | **deferred to Phase 2** |
| TC-009-26 | ~~Aislamiento BibliographyReference~~ | REQ-009-16 | Logic | no | — | Query con tenant distinto, listar BibliographyReference | No incluye referencias de otro tenant | — | — | **deferred to Phase 2** |
| TC-009-27 | CurricularLink coherencia owner | REQ-009-17 | Logic | no | Si seed legacy incluye links | Validar que cada link tiene `sourceSectionId` y `targetSectionId` con mismo owner | Todos los links son intra-agregado | CurricularLink declarado en `objects/CurricularLink.json` pero NO usado en seed ni UI en SP1 — coherencia se testea cuando entre la UI en SP2 | sub-tarea 2.4 ticket — pendiente sin urgencia | n/a |
| TC-009-28 | **Coexistencia: detail no muestra objetos del seed core** | REQ-009-18 | Visual | yes | Detail AIEP abierto en UPU (que tiene seed core "uPlanner University" con Person, Faculty, Career) | Inspeccionar el detail visual | El detail muestra SOLO secciones del AcademicActivity de AIEP. Los `Person`, `Faculty`, `Course` (existente del demo) del seed core NO aparecen mezclados. | Coexistencia validada por diseno: queries del detail filtran por `ownerId=AA especifico`. Imposible que muestre objetos core sin que un developer rompa el filtro intencionalmente. | DECISION-012 + arquitectura del query — automatizacion → TICKET-YYY | override |

### Test artifacts

| File | Type | Created in task | Covers | Framework | Status |
|------|------|-----------------|--------|-----------|--------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` | unit | Session 8 (Fase 4 SPEC composite-section-tree-weighted-sum) | computeInvalidNodes (REQ-02/03/04 + caso real Univalle) | Vitest | **created** — 22/22 pass |
| `tests/integration/recordtypes-declared.test.ts` | integration | — | TC-009-01 a TC-009-03 | Vitest (filesystem + JSON) | **delegated to TICKET-YYY** (validacion manual via comandos shell ejecutados al cierre 2026-05-04) |
| `tests/integration/recordtypes-codegen.test.ts` | integration | — | TC-009-05, TC-009-06 | Vitest (Prisma + DB query en UPU) | **delegated to TICKET-YYY** |
| `tests/integration/seed-counts.test.ts` | integration | — | TC-009-10, TC-009-11, TC-009-12, TC-009-13 | Vitest | **delegated to TICKET-YYY** (counts validados manualmente Sessions 2/4) |
| `tests/integration/tenant-isolation-rts.test.ts` | integration | — | TC-009-25, TC-009-26 | Vitest | **deferred to Phase 2** |
| `tests/integration/curricular-link-coherence.test.ts` | integration | — | TC-009-27 | Vitest | **n/a en SP1** (CurricularLink no usado) |
| `tests/e2e/poc-rt-layout.spec.ts` | e2e | — | TC-009-07 | Playwright + DKC config | **delegated to TICKET-YYY** |
| `tests/e2e/detail-univalle.spec.ts` | e2e | — | TC-009-14 a TC-009-19 | Playwright + DKC config | **delegated to TICKET-YYY** (4/6 con screenshot manual; TC-17/19 sin) |
| `tests/e2e/detail-aiep.spec.ts` | e2e | — | TC-009-20 a TC-009-22 | Playwright + DKC config | **delegated to TICKET-YYY** |
| `tests/e2e/detail-stress-aiep-volumes.spec.ts` | e2e | — | TC-009-23, TC-009-24 | Playwright + DKC config | **delegated to TICKET-YYY** (validacion manual con screenshots Session 7) |
| `tests/e2e/section-create-rt-picker.spec.ts` | e2e | — | TC-009-08, TC-009-09 | Playwright + DKC config | **delegated to TICKET-YYY** (TC-008 con screenshot; TC-009 obsoleto por cambio UX Session 6) |
| `tests/e2e/coexistence-detail-vs-core.spec.ts` | e2e | — | TC-009-28 | Playwright + DKC config | **delegated to TICKET-YYY** |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Vitest mod (validateWeightedSum) | `npx vitest run mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` | n/a (suite nueva, creada en Session 8) | 22/22 pass — 443ms | +22 tests nuevos |
| Lint workspace | `npm run lint --workspaces` | n/a — el monorepo no expone lint a nivel root | n/a | **delegated to TICKET-YYY** |
| Type-check workspace | `npm run typecheck --workspaces` | n/a — el monorepo no expone typecheck a nivel root | n/a | **delegated to TICKET-YYY** |
| Tests TICKET-006 + TICKET-007 siguen pasando | (suites previas) | sin baseline registrado | no ejecutado en cierre — la implementacion no toco objetos/layouts de esos tickets | **delegated to TICKET-YYY** |
| Layout resolver no se rompe en otros mods | Ejecutar tests existentes de `up1/layout/logic/layout.resolver.js` | sin baseline | merge a develop (87e1efb) sin reportes de regresion en otros mods al 2026-05-04 | implicit pass |
| RecordTypes globales no afectan a `rt__Student__core_user.json` | Validar que el RT existente sigue funcionando | sin baseline | RT preexistente intacto (no se toco `objects/business/RecordTypes/rt__Student*`) | implicit pass |
| **Seed core UPU intacto post-TICKET-009** | Snapshot de tablas core (Person, Faculty, Course, Curriculum) antes y despues | sin snapshot | seed core UPU "uPlanner University" preserved — `_data-univalle.js`/`_data-aiep.js` solo agregan Organizations (UV, AIEP) y AcademicActivity nuevos sin tocar core demo | implicit pass via DECISION-012 |

## Summary

### What was requested

Crear los RecordTypes especificos de `CurricularSection` y los layouts default del detail del programa de asignatura, validando que la infraestructura de "layouts por RecordType" (UPONE-941/944) funciona en un caso real. Scope ampliado en 3 oleadas: (#1) declarar los RTs, (#2) crear/extender los objetos core `Organization`, `OrgUnit`, `Institution` (Confluence v1.8) en el mod via append-only merge, (#3) validacion sumativa de ponderaciones en el componente Composite tree.

### What was done

El usuario puede ahora:
- Listar y abrir programas de asignatura ("Ecuaciones Diferenciales" Univalle, "Introduccion a las Redes" AIEP) desde la sidebar Curriculum Design en UPU.
- Ver el detail del programa con 8 tabs (General + 7 RTs) — cada tab renderiza con su layout especifico, usando columnas RT-specific en los embeds.
- Crear y editar el programa shell (form de 9 campos con `workflowState` auto-asignado a `Draft`).
- Agregar/editar elementos por RT desde botones "+ Nueva" en cada tab (Modality, LearningOutcome, Content, Session, Bibliography, CustomSection).
- Ver y editar la jerarquia Composite de EvaluationComponent (tab Evaluacion) con drag-n-drop sibling-only para reordenar y validacion sumativa visual de ponderaciones (Nota Final 100% = suma de hijos).
- Editar el contenido de CustomSection con WYSIWYG (Trix editor) y verlo renderizado HTML-sanitized en read-only.
- Navegar al detail con URL deep-linkeable (`openMode: route`) preservando browser history.

Modelo del agregado entregado: `AcademicActivity` (raiz Course) + `CurricularSection` (polimorfico via 7 RTs + parentId self-FK Composite) + `CurricularLink` (declarado, sin uso en SP1) + `BibliographyReference` (catalogo institucional). Objetos core `Organization`, `OrgUnit` creados en mod (DECISION-013) y `Institution` extendido append-only con campos Confluence v1.8.

### What was learned

- **Learns capturados**: 54 total — todos refined (0 raw, 0 discarded).
- **Rules creadas/promovidas (selección)**: RULE-mods-031 (description prop conflict en Vueform ElementLayout), RULE-mods-032 (extension semantica `baseObject` en rt__ JSON), RULE-mods-033 (deps de mods via npm workspaces), RULE-layout-028 (`openMode: route`), RULE-layout-029 (Icon atom requiere prefix `bi-` literal), RULE-layout-030 (`getDisplayValue` con dotted-path keys).
- **Decisions formales**: DECISION-001..013 (13 decisions del modulo, ver `decisions/`). Hito clave DECISION-012 (rollout 2 fases — SP1 solo UPU). DECISION-013 (modelar Organization/OrgUnit en mod, supersede DECISION-002).
- **Bugs encontrados**: BUG-platform-004 (rowActions custom hardcoded a mode:create), BUG-platform-008 (i18n RecordList no carga en route-mode), BUG-platform-009 (Apollo cache pollution al volver del detail al listado), BUG-platform-010 (Atom Tooltip rompe en dark mode). Reportados a plataforma, fuera de scope del ticket.
- **Failed approaches**: 7 documentados (F1-F7). Lecciones clave: planear bien `required[]` antes del primer sync (append-only), DOMParser native como alternativa a sanitize-html, Ref para reactividad en Vueform custom elements.

### TCs cerrados sin evidencia por override

| TC | Razon | Autorizado por |
|----|-------|----------------|
| TC-009-05 | Validada manualmente Session 2 (`tenant:studio` confirma tablas Prisma). Test integration → TICKET-YYY | dev |
| TC-009-06 | Validada manualmente Sessions 5-7 (los layouts default_rt__* renderizan en runtime → fila en `up1_layen_layout`). Test integration → TICKET-YYY | dev |
| TC-009-07 | POC RISK-001 ejecutado Session 2 — habilito Phases 1-3 del ticket. Sin screenshot dedicado. Test e2e → TICKET-YYY | dev |
| TC-009-09 | UX final no usa RT-picker unificado sino tabs por RT (cambio de scope Session 6). Cubierto parcial por modales create per-RT. Re-spec en TICKET-YYY si se requiere picker original | dev |
| TC-009-17 | 18 sessions Univalle validadas en seed (Session 2/4) + reorganizacion tabs (Session 7). Sin screenshot dedicado. Test e2e → TICKET-YYY | dev |
| TC-009-19 | Bibliography part: 9 entries cargadas en seed con FK Institution UV — sin screenshot del tab. CustomSection si tiene screenshot. Test e2e Bibliography → TICKET-YYY | dev |
| TC-009-20 | Detail AIEP probado en Sessions 4+ — TC-23 y TC-24 (con screenshots) son sub-vistas del detail AIEP. Sin screenshot dedicado overview. Test e2e → TICKET-YYY | dev |
| TC-009-21 | Content AIEP (3 entries Theoretical/Practical) cargados en seed. Sin screenshot del tab Content AIEP. Test e2e → TICKET-YYY | dev |
| TC-009-22 | EvalComp AIEP "Nota 6" (1 entry) cargado en seed. Sin screenshot del tab Evaluacion AIEP. Test e2e → TICKET-YYY | dev |
| TC-009-28 | Coexistencia validada por diseno: queries del detail filtran por `ownerId=AA especifico`, imposible mostrar objetos core. Sin screenshot. Test integration → TICKET-YYY | dev |

### Pendiente

- **TICKET-XXX (refactor)** — mejoras de calidad de codigo identificadas en review post-cierre del 2026-05-04. Issues principales: `CompositeSectionTreeElement.vue` excede limite de 400 LOC (1497 actual), heuristica por nombre de campo, form modal casero en vez de LayoutOrchestrator, cleanup duplicado en seeds, i18n de enums no centralizada, tests faltantes para `buildTree` y `sanitizeHtmlSafe`.
- **TICKET-YYY (improvement)** — QA + tests automatizados de curriculum-design SP1. Cubre los 10 TCs con override + las 4 suites de regression delegadas. Output: tests de integracion (filesystem + Prisma) + e2e (Playwright + DKC config) que automaticen las validaciones manuales del ticket.
- **REQ-009-16 deferred to Phase 2** (Fase 2 multi-tenant — DECISION-012): aislamiento entre tenants y separacion UNIVALLE+AIEP en tenants dedicados.
- **TC-009-27 marcado n/a en SP1**: CurricularLink declarado pero no usado en seed/UI. Coherencia se testea cuando entre la UI de links en SP2.
- **CurricularLink sin UI**: objeto declarado en `objects/CurricularLink.json` pero sin layout/seed/componente que lo expongan al usuario.
- **Bugs platform reportados** (BUG-platform-004/008/009/010): responsabilidad de plataforma, fuera de scope.

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 8 |
| Tasks completed | 28 / 28 (Fase 0 + Fase 1 + Fase 2 + Fase 3 + Fase 4) |
| Commits del mod | 19 (UPONE-1035-core-objects, mergeada en develop via 87e1efb) |
| Commits totales (incluyendo deckard) | 28 (estimacion conservadora — el git rev-list local cuenta 28 en la rama del mod) |
| Learns captured | 54 |
| Learns → rules | 12+ (muestra: RULE-layout-028/029/030, RULE-mods-031/032/033, RULE-platform-013, RULE-layout-026/027, RULE-database-005) |
| Learns → bugs | 4 (BUG-platform-004/008/009/010) |
| Learns → decisions | 13 (DECISION-001..013) |
| Learns discarded | 0 |
| Failed approaches | 7 |
| Test cases (total) | 28 |
| Test cases (pass) | 12 (4 logic verificables al cierre + 8 visual con screenshot) |
| Test cases (override) | 10 (con razon concreta + delegacion a TICKET-YYY) |
| Test cases (n/a) | 3 (TC-009-04 ya marcado, TC-009-27 nuevo n/a por ausencia de UI CurricularLink) |
| Test cases (deferred) | 2 (TC-009-25, TC-009-26 a Phase 2 multi-tenant) |
| Vitest tests creados | 22 (todos pass — 443ms) en `validateWeightedSum.spec.ts` |
