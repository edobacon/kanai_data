---
id: SPEC-024-curriculum-plan-minor-object
project: up1
ticket: TICKET-063
status: done
---

# Curriculum (Plan + Minor) — objeto nuevo tipado por RecordType + vista en curriculum-design

# Curriculum (Plan + Minor) — objeto nuevo tipado por RecordType + vista en curriculum-design

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: agregar el objeto de negocio **`Curriculum`** (contenedor curricular tipado) al mod `curriculum-design`, con dos RecordTypes — **`Plan`** (declara campos temporales: progression, totalCredits, totalPeriods, periodType) y **`Minor`** (sin esos campos) — y su vista completa de gestion: lista unica con columna Tipo, detalle, crear, editar y eliminar real. El owner del curriculum es **polimorfico** (un programa academico o una institucion) y el objeto es **versionable** (cadena `previousVersionId`), lo que habilita despues UPONE-1270 (clonar/versionar el Plan). El alcance esta acotado a "solo el objeto": campos + edit/delete, sin tablas hijas (planEntry, requirement, milestone). Todo el cambio es aditivo y vive en el mod; object-manager solo regenera schema via sync.

**Decisiones criticas que necesitan tu OK** (racional en secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Layout unico + `conditions`** para campos del Plan y owner polimorfico (Opcion B), NO layouts separados por RecordType | Menos archivos, un solo mecanismo (`conditions: [[campo, op, valor]]`) resuelve ambos casos. Reversible a layouts-por-RT si la validacion empirica de H4.1 falla. Ver DEC-LOCAL-01 |
| 2 | **Owner polimorfico sin core**: `ownerType` (select) + un select por destino (`AcademicProgram` / `Institution`) con `conditions: [["ownerType","==","<val>"]]`, resuelto a `ownerId` en submit | No existe picker polimorfico nativo. Esta solucion no toca core/layout-engine; usa el mismo `conditions` que el resto. Ref `RecordDetail.vue:2850-2893` |
| 3 | **Versionado replicando el bloque de `activity`** (`linkageField: previousVersionId`, `versionStrategy: increment`) + `uniqueConstraints: [["previousVersionId","version"]]`; `code` NO unico global | Habilita UPONE-1270. La unicidad por linaje real la aporta 1270 en el resolver; aqui solo la integridad de la cadena de version |
| 4 | **`status` como enum simple** Draft\|Active\|Archived (default Draft), NO workflow formal | academicProgram tampoco usa workflow; "nace Draft" de 1270 se satisface con el default. Reversible (agregar workflow es aditivo). Ver DEC-LOCAL-02. **Confirmar enum** (open question 3) |

**Riesgos principales y como los mitigamos**:

- **`conditions` puede no re-evaluar en create-mode cuando el campo dependiente (`ownerType`) aun no tiene valor al render (H4.1)** -> validacion empirica explicita en S2 (smoke del create de un Plan con cada owner); fallback documentado: dos selects siempre visibles o `ownerType` con default.
- **Drift de BASEMODEL al seedear el objeto nuevo (warning #3)** -> seed idempotente (busca antes de crear); NO usar `--accept-data-loss`; regenerar baseline si hay drift.
- **`@@unique([previousVersionId, version])` puede fallar silencioso si el sync no lo aplica en la DB del tenant (gotcha TICKET-054, warning #4)** -> verificacion explicita del indice en la DB del tenant como task de S1, no solo grep del schema generado.
- **PascalCase mal escrito rompe el codegen en Linux (RULE-platform-006)** -> naming verificado en cada artefacto (`Curriculum`, `rt__Plan__curriculum`, `default_Curriculum_*`, `defaultObjects: ["Curriculum"]`).

**Que NO se hace en este ticket** (limites explicitos del scope):

- Tablas/tabs hijas (planEntry, requirement, milestone, perfiles) — fuera de SP4 (D-F).
- Clonar/versionar el Plan (la operacion) — es UPONE-1270; aqui solo se deja el modelo habilitado.
- `rotationConfig` en la UI — esta en el data model (PLAN-ONLY) pero fuera del layout de detalle v1.
- Unicidad por linaje (`institutionId`, `code`) en raices — la aporta el resolver de 1270, no la DB de este ticket.
- Vistas filtradas por tipo (Plan/Minor) hardcodeadas — las resuelve el usuario final con vistas-con-filtros guardadas (D-A).

**Tamano estimado**: **3 sessions** (~3 SP). S1 DataModel (objeto + 2 RT + sync), S2 UI (4 layouts + owner polimorfico + i18n), S3 Validacion (seed + smoke TC-1..7 + regression). **La mas riesgosa es S2**: concentra la validacion empirica de H4.1 (`conditions` en create-mode) y la solucion sin-core del owner polimorfico — si H4.1 falla, hay retrabajo de layout (fallback documentado).

**Como vas a saber que funciona**:

- Abro el menu de objetos y veo **Curriculum** junto a Activity y AcademicProgram; entro y veo una lista unica con columna **Tipo** poblada con Plans y Minors del seed.
- Abro el detalle de un **Plan** y veo los campos temporales (progression/totalCredits/totalPeriods/periodType); abro un **Minor** y NO los veo.
- Creo un curriculum eligiendo owner = programa o institucion, y persiste con el `ownerId` correcto; edito y elimino real.
- Activity, AcademicProgram y el resto del mod siguen funcionando (sin regresion).

---

## Purpose

Definir el objeto `Curriculum` en `mods/curriculum-design/objects/` con RecordTypes `Plan` y `Minor` (discriminador sobre la misma tabla), owner polimorfico `ownerType`/`ownerId`, versionado por `previousVersionId` y `uniqueConstraints: [["previousVersionId","version"]]`; sus 4 layouts (list/view/create/edit) que muestran los campos del Plan y el owner condicionalmente via `conditions`; i18n `es_CL`; alta en `defaultObjects`; y un seed idempotente. El codegen del object-manager genera el modelo Prisma + GraphQL CRUD; la vista se arma 100% por configuracion de layouts JSON, sin tocar codigo de suite/layout. Encuadre identico a `AcademicProgram` (SPEC-021).

## Requirements

### REQ-01: Definicion del objeto Curriculum + RecordTypes Plan/Minor + versionado

> **Que cambia**: aparece la entidad `Curriculum` tipada por `recordType` (Plan/Minor), con owner polimorfico, campos comunes, campos temporales solo en el Plan, y cadena de versionado. El codegen genera el modelo Prisma con el `@@unique` de la cadena de version.
> **Por que**: es la base de todo el ticket y de UPONE-1270; sin el objeto no hay vista ni versionado.

El sistema MUST definir `Curriculum` en `objects/Curriculum.json` (PascalCase) con los campos comunes: `name` (string, req), `code` (string, req, NO unico global), `recordType` (string discriminador, req), `ownerType` (enum `[AcademicProgram, Institution]`, req), `ownerId` (string, req), `institutionId` (FK->Institution, req), `appearsInDiploma` (boolean, default false), `status` (enum `[Draft, Active, Archived]`, default `Draft`), `externalId` (string, opt); el bloque `versioning` replicando `activity` (`linkageField: previousVersionId`, `versionField: version`, `versionStrategy: increment`) con `version` (int, default 1), `versionLabel` (string, opt), `previousVersionId` (string self-ref, opt); y `metadata.uniqueConstraints: [["previousVersionId","version"]]`. El sistema MUST declarar los RecordTypes en `RecordTypes/rt__Plan__curriculum.json` y `rt__Minor__curriculum.json`; el `Plan` MUST declarar las properties temporales `progression` (string, nullable), `totalCredits` (int, nullable), `totalPeriods` (int, nullable), `periodType` (string, nullable), `rotationConfig` (json, nullable, fuera de la UI v1); el `Minor` NO declara esas properties. El codegen MUST generar el modelo Prisma con `@@unique([previousVersionId, version])` y el tipo GraphQL CRUD; el `versionStrategy: increment` MUST setear `requiredCapability: curriculum:version`.

**Actor**: system
**Layers**: backend, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: codegen genera el modelo (happy)
- **GIVEN** `objects/Curriculum.json` + los 2 RecordTypes validos en el mod
- **WHEN** se corre `npm run sync` desde object-manager
- **THEN** el schema Prisma incluye `model Curriculum` con `@@unique([previousVersionId, version])`
- **AND** el tipo `Curriculum` es queryable via GraphQL (introspection)
- **AND** las properties del Plan (progression, totalCredits, totalPeriods, periodType, rotationConfig) son columnas nullable de la tabla

#### Scenario: @@unique aplicado en la DB del tenant (error evitado — gotcha TICKET-054)
- **GIVEN** `uniqueConstraints: [["previousVersionId","version"]]` declarado
- **WHEN** se corre el sync y se inspecciona la DB del tenant (no solo el schema generado)
- **THEN** el indice unico `@@unique([previousVersionId, version])` quedo realmente aplicado en la tabla
- **AND** si NO se aplico, la task falla y se regenera baseline (sin `--accept-data-loss`)

#### Scenario: RecordType como discriminador, no tabla separada (edge)
- **GIVEN** los RecordTypes `Plan` y `Minor`
- **WHEN** el codegen procesa el objeto
- **THEN** NO se generan tablas separadas: ambos comparten la tabla `Curriculum` con la columna `recordType`
- **AND** las properties del Plan existen como columnas nullable (un Minor las deja en NULL)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, una query GraphQL `curricula { id name recordType }` responde sin error y el indice unico esta en la DB del tenant.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | codegen ok | JSON + 2 RT validos | npm run sync | modelo Prisma generado | `model Curriculum` + `@@unique([previousVersionId, version])` presentes |
| 2 | @@unique en DB | sync corrido | inspeccionar DB tenant | indice aplicado | `@@unique` realmente presente en la tabla (no falla silencioso) |
| 3 | GraphQL queryable | sync + restart | introspection/query | tipo expuesto | `curricula` resuelve `[]` o filas |

### REQ-02: RecordList unico con columna Tipo

> **Que cambia**: el objeto tiene una sola lista que muestra Plans y Minors juntos, con una columna Tipo (Plan/Minor); el usuario filtra por tipo con vistas guardadas, no con layouts separados.
> **Por que**: D-A — una sola lista escala sin tocar layouts al sumar RecordTypes futuros (Major, Track, Concentration).

El sistema MUST proveer `config/layouts/default_Curriculum_list.json` (`layoutType: RecordList`, `objectName: "Curriculum"`, `tenants: ["UPU"]`) con columnas: `name`, `recordType` (Tipo), `code`, `version`, owner (display del programa/institucion), `status`; `relationDisplayFields: {Institution: "name", AcademicProgram: "name"}`; `rowActions` con view/edit/delete; `canCreate`; `openMode: "route"`. El filtrado Plan/Minor NO MUST hardcodearse en el layout (lo resuelve el usuario final con vistas-con-filtros guardadas).

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: lista muestra ambos tipos (happy) — TC-1
- **GIVEN** seed con Plans y Minors + `default_Curriculum_list.json` sincronizado
- **WHEN** el usuario abre el recordList de Curriculum
- **THEN** ve una sola lista con todos los registros y una columna Tipo que distingue Plan de Minor

#### Scenario: sin layout separado por tipo (edge)
- **GIVEN** el unico list layout `default_Curriculum_list.json`
- **WHEN** se suma un RecordType futuro (ej. Major)
- **THEN** aparece en la misma lista sin crear un layout nuevo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre Curriculum desde el menu y ve una lista unica con la columna Tipo poblada (Plan/Minor). Cubre TC-1.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | lista unica con Tipo | seed Plans+Minors | abrir lista | columna Tipo visible | Plan y Minor en la misma lista (TC-1) |

### REQ-03: Detalle/create/edit condicional por RecordType (campos del Plan)

> **Que cambia**: al abrir/crear/editar un Plan se ven los campos temporales (progression/totalCredits/totalPeriods/periodType); al hacerlo con un Minor NO aparecen.
> **Por que**: D-B/D-C — solo el Plan tiene semantica temporal; los campos no deben mostrarse para el Minor.

El sistema MUST proveer `config/layouts/default_Curriculum_{view,create,edit}.json` (`layoutType: RecordDetail`, `objectName: "Curriculum"`, `tenants: ["UPU"]`) usando **un layout unico por modo** (no por RecordType — DEC-LOCAL-01) donde las properties del Plan (`progression`, `totalCredits`, `totalPeriods`, `periodType`) declaran `conditions: [["recordType","==","Plan"]]`. Los campos comunes (name, code, recordType, owner, appearsInDiploma, version, status, externalId) MUST mostrarse siempre. `recordType` MUST renderizarse como select (Plan/Minor) en create; en view/edit MUST mostrarse pero no debe permitir cambiar el tipo de un registro existente (read-only en edit). `rotationConfig` NO MUST aparecer en la UI v1.

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle de un Plan muestra campos temporales (happy) — TC-2
- **GIVEN** un Plan existente + view layout sincronizado
- **WHEN** el usuario abre el detalle
- **THEN** se ven progression, totalCredits, totalPeriods, periodType

#### Scenario: detalle de un Minor NO muestra campos temporales (error evitado) — TC-3
- **GIVEN** un Minor existente
- **WHEN** el usuario abre el detalle
- **THEN** NO aparecen los campos temporales del Plan (las `conditions` los ocultan)

#### Scenario: crear/editar con cada RecordType (edge) — TC-4, TC-5
- **GIVEN** el create layout con `recordType` como select
- **WHEN** el usuario crea un Plan y luego un Minor, y edita uno existente
- **THEN** el Plan persiste con sus campos temporales, el Minor sin ellos, y los cambios del edit persisten

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un Plan y ve los campos temporales; abre un Minor y no los ve; crea ambos y edita uno. Cubre TC-2, TC-3, TC-4, TC-5.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Plan con temporales | Plan existente | abrir detalle | campos visibles | progression/totalCredits/totalPeriods/periodType (TC-2) |
| 2 | Minor sin temporales | Minor existente | abrir detalle | campos ocultos | conditions ocultan los temporales (TC-3) |
| 3 | crear ambos | create layout | crear Plan y Minor | persisten | Plan con temporales, Minor sin (TC-4) |
| 4 | editar | curriculum existente | editar + guardar | cambios persisten | valores actualizados (TC-5) |

### REQ-04: Owner polimorfico (AcademicProgram | Institution)

> **Que cambia**: al crear/editar un curriculum el usuario elige el tipo de dueno (programa o institucion) y luego selecciona el dueno concreto; el sistema guarda `ownerType` + `ownerId`.
> **Por que**: D-D — el curriculum se ancla a un programa academico o a una institucion; no hay picker polimorfico nativo.

El sistema MUST resolver el owner polimorfico sin tocar core: un select `ownerType` (enum AcademicProgram\|Institution) + un select por destino — uno con `references: AcademicProgram` y `conditions: [["ownerType","==","AcademicProgram"]]`, otro con `references: Institution` y `conditions: [["ownerType","==","Institution"]]`. El valor del select activo MUST resolverse a `ownerId` en submit. Ref de implementacion: `layout/src/layouts/RecordDetail.vue:2850-2893` (references estatico). El comportamiento de `conditions` en create-mode MUST validarse empiricamente (ver REQ-05 / H4.1).

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: elegir owner programa (happy) — TC-7
- **GIVEN** create layout con `ownerType` + dos selects condicionales
- **WHEN** el usuario elige ownerType=AcademicProgram y selecciona un programa
- **THEN** se muestra el select de programas (no el de instituciones) y al guardar `ownerType=AcademicProgram` + `ownerId` = id del programa

#### Scenario: elegir owner institucion (happy) — TC-7
- **GIVEN** create layout
- **WHEN** el usuario elige ownerType=Institution y selecciona una institucion
- **THEN** se muestra el select de instituciones y al guardar `ownerType=Institution` + `ownerId` = id de la institucion

#### Scenario: cambiar ownerType limpia el select previo (edge)
- **GIVEN** el usuario eligio AcademicProgram y selecciono un programa
- **WHEN** cambia ownerType a Institution
- **THEN** el select de programas se oculta y el de instituciones aparece (sin arrastrar el id anterior)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al crear un curriculum, elige programa o institucion como dueno y el registro persiste con el `ownerId` correcto. Cubre TC-7.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | owner programa | create layout | ownerType=AcademicProgram + select | persiste | ownerType + ownerId de programa (TC-7) |
| 2 | owner institucion | create layout | ownerType=Institution + select | persiste | ownerType + ownerId de institucion (TC-7) |

### REQ-05: Delete real + validacion empirica de conditions en create-mode (H4.1)

> **Que cambia**: el usuario puede eliminar un curriculum de la DB (no soft-delete); y se confirma empiricamente que los campos condicionales (`conditions`) se muestran/ocultan correctamente en create-mode.
> **Por que**: el ticket pide eliminar real; H4.1 es un riesgo abierto que bloquea comprometer el layout unico — debe validarse antes de cerrar la decision.

El sistema MUST proveer un `rowAction` de tipo delete en `default_Curriculum_list.json` que elimine el registro de la DB. El sistema MUST validar empiricamente (smoke en S2) que las `conditions` re-evaluan en vivo en create-mode cuando el campo dependiente (`ownerType` / `recordType`) aun no tiene valor inicial: al elegir el valor, el campo dependiente debe aparecer. Si la validacion empirica falla, se MUST aplicar el fallback documentado (dos selects siempre visibles, o `ownerType`/`recordType` con default) y registrarlo como learn + actualizar DEC-LOCAL-01.

**Actor**: user
**Layers**: frontend, config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: eliminar real (happy) — TC-6
- **GIVEN** un curriculum existente + rowAction delete
- **WHEN** el usuario elimina el registro
- **THEN** el registro se borra de la DB (no aparece mas en la lista ni via GraphQL)

#### Scenario: conditions re-evalua en create (validacion empirica H4.1) — TC-7
- **GIVEN** create layout, formulario recien abierto (ownerType sin valor)
- **WHEN** el usuario selecciona ownerType
- **THEN** el select de owner correspondiente aparece en vivo (conditions re-evalua)

#### Scenario: conditions NO re-evalua (fallback — error a manejar)
- **GIVEN** la validacion empirica muestra que el campo dependiente no aparece al cambiar el valor
- **WHEN** se detecta el fallo en el smoke de S2
- **THEN** se aplica el fallback (selects siempre visibles o default) y se documenta en DEC-LOCAL-01 + learn

</details>

#### Acceptance
**El usuario puede verificar que funciona**: elimina un curriculum y desaparece de la DB; al crear, los campos condicionales aparecen al elegir el valor del que dependen. Cubre TC-6, TC-7.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | delete real | curriculum existente | eliminar | borrado | ausente de DB y lista (TC-6) |
| 2 | conditions en create | form recien abierto | elegir ownerType/recordType | campo dependiente aparece | re-evalua en vivo o fallback (TC-7) |

### REQ-06: Seed + i18n es_CL

> **Que cambia**: al abrir la lista se ven Plans y Minors precargados con owners variados (programa e institucion), y las etiquetas/enums se muestran en espanol.
> **Por que**: el ticket pide datos precargados para visualizar y demo; las etiquetas no deben quedar hardcoded.

El sistema MUST proveer `seed/_data-curriculum.js` (enganchado en `seed/seed.js`) que crea de forma idempotente varios `Curriculum` en tenant UPU: Plans y Minors, con owners variados (algunos con `ownerType=AcademicProgram` colgados de programas seedeados, otros con `ownerType=Institution`). El seed MUST buscar antes de crear (idempotente) y NO usar `--accept-data-loss`. El sistema MUST proveer `lang/es_CL@Curriculum.json` con `column.<field>` para cada campo y `enums.<field>.<EnumValue>` para `recordType`, `ownerType`, `status` y los enums del Plan (`progression`, `periodType` — pendiente de confirmar valores, ver open questions). Las labels de objeto (`label`/`labelPlural`) viven en `metadata` del objeto.

**Actor**: system
**Layers**: database, frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed idempotente (happy)
- **GIVEN** el seed engancha en seed.js
- **WHEN** se corre el seed dos veces
- **THEN** no se duplican registros (busca por una clave de negocio antes de crear)

#### Scenario: datos visibles con owners variados (happy)
- **GIVEN** seed corrido en UPU
- **WHEN** el usuario abre la lista de Curriculum
- **THEN** ve Plans y Minors con owners de programa y de institucion

#### Scenario: i18n cargado (edge)
- **GIVEN** `es_CL@Curriculum.json` con keys `column.*` y `enums.*`
- **WHEN** el usuario abre las vistas en locale es_CL
- **THEN** columnas y valores de enum se muestran en espanol (no las keys crudas)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras reset-seed, la lista muestra Plans y Minors con owners variados, y las etiquetas/enums estan en espanol.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | seed visible | seed corrido | abrir lista | filas presentes | Plans + Minors con owners variados |
| 2 | idempotencia | seed 2x | re-correr | sin duplicados | conteo estable |
| 3 | i18n | lang file sync | abrir vista | labels en espanol | "Tipo", "Plan", "Activo", etc. |

### REQ-PRESERVE-01: No romper objetos existentes del mod

> **Que cambia**: nada — Activity, AcademicProgram y el resto del mod siguen igual.
> **Por que**: el cambio toca codegen/seed compartidos; hay que probar que no regresiona.

El sistema MUST preservar el comportamiento de los objetos existentes del mod (Activity, AcademicProgram, BibliographyReference, CurricularSection, etc.): el codegen no falla, el menu sigue mostrando los objetos previos, y sus vistas funcionan.

**Actor**: user
**Layers**: backend, frontend

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, Activity y AcademicProgram abren y operan como antes; el codegen completa sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regresion menu | objeto nuevo agregado | abrir menu | objetos previos visibles | Activity + AcademicProgram siguen |
| 2 | codegen completo | sync con objeto nuevo | npm run sync | exit 0 | sin error de schema |

## Artifacts

### Objects (METASPEC-json-object)

**Object: Curriculum** (`objects/Curriculum.json`) — PascalCase, tenantScoped: true, mod: curriculum-design.

| name | type | nullable | default | description |
|------|------|----------|---------|-------------|
| name | string | no | — | Nombre del curriculum |
| code | string | no | — | Codigo institucional. NO unico global (compartido entre versiones del linaje, D-E) |
| recordType | string (discriminador) | no | — | "Plan" \| "Minor" (enum a nivel JSON del objeto/RecordTypes) |
| ownerType | string (enum) | no | — | "AcademicProgram" \| "Institution" (owner polimorfico) |
| ownerId | string | no | — | id del owner segun ownerType (FK polimorfica, sin relacion Prisma directa) |
| institutionId | string (FK) | no | — | FK -> Institution (scope institucional; derivable del owner, explicito para 1270). `[NEEDS CLARIFICATION: required confirmado?]` |
| appearsInDiploma | boolean | no | false | Si el curriculum aparece en el diploma |
| status | string (enum) | no | Draft | "Draft" \| "Active" \| "Archived". `[NEEDS CLARIFICATION: enum confirmado vs workflow]` |
| externalId | string | yes | — | ID en sistema externo (integracion) |
| version | int | no | 1 | Numero de version (system-managed, versionStrategy: increment) |
| versionLabel | string | yes | — | Etiqueta libre de version |
| previousVersionId | string (self-ref FK) | yes | — | Cadena de version (linkageField) |
| progression | string (enum) | yes | — | **PLAN-ONLY**. `[NEEDS CLARIFICATION: valores del enum de progresion]` |
| totalCredits | int | yes | — | **PLAN-ONLY**. Total de creditos del plan |
| totalPeriods | int | yes | — | **PLAN-ONLY**. Total de periodos del plan |
| periodType | string (enum) | yes | — | **PLAN-ONLY**. `[NEEDS CLARIFICATION: valores (Semester\|Trimester\|Quarter\|Annual?)]` |
| rotationConfig | json | yes | — | **PLAN-ONLY**. Fuera del layout de detalle v1 (en data model, no en UI) |

**RecordTypes**:
| Archivo | recordType | Properties que declara |
|---------|-----------|------------------------|
| RecordTypes/rt__Plan__curriculum.json | Plan | progression, totalCredits, totalPeriods, periodType, rotationConfig (PLAN-ONLY, nullable) |
| RecordTypes/rt__Minor__curriculum.json | Minor | (ninguna adicional — solo campos comunes) |

**Versioning block** (metadata, replicado de `activity`):
| Campo | Valor |
|-------|-------|
| linkageField | previousVersionId |
| versionField | version |
| versionStrategy | increment |
| requiredCapability | curriculum:version |

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------|
| Curriculum | Institution | belongsTo | institutionId | RESTRICT (default codegen) |
| Curriculum | Curriculum | belongsTo (version chain) | previousVersionId | SET NULL (nullable) |
| Curriculum | AcademicProgram \| Institution | polimorfica (sin FK Prisma) | ownerType + ownerId | — (no FK directa) |

**Indexes**:
| Columns | Type | Unique | Purpose |
|---------|------|--------|---------|
| previousVersionId, version | btree | si | Integridad de la cadena de version (`@@unique`, generado por codegen; misma raiz no repite numero) |
| ownerType, ownerId | btree | no | Lookup del owner polimorfico |

### Layouts (METASPEC-layout-config)

| Layout | objectName | layoutType | Notas |
|--------|-----------|------------|-------|
| default_Curriculum_list | Curriculum | RecordList | Columnas: name, recordType (Tipo), code, version, owner (display), status; `relationDisplayFields: {Institution: "name", AcademicProgram: "name"}`; `rowActions`: view/edit/delete (delete real); `canCreate`; `openMode: "route"`. Sin filtro Plan/Minor hardcoded (D-A) |
| default_Curriculum_view | Curriculum | RecordDetail | `mode: "view"`; campos comunes siempre + campos del Plan con `conditions: [["recordType","==","Plan"]]`; owner como display |
| default_Curriculum_create | Curriculum | RecordDetail | `mode: "create"`; `recordType` select; campos del Plan con `conditions`; owner polimorfico: `ownerType` select + select AcademicProgram (`conditions ownerType==AcademicProgram`) + select Institution (`conditions ownerType==Institution`); rotationConfig fuera de la UI |
| default_Curriculum_edit | Curriculum | RecordDetail | `mode: "edit"`; idem create pero `recordType` read-only (no cambia el tipo de un registro existente) |

**Checklist de calidad de artefactos**:
- [x] Configuracion declarativa, no hardcoded: labels y enums en `lang/es_CL@Curriculum.json` (recordType, ownerType, status, progression, periodType).
- [x] Cada artefacto tiene consumidor en este sprint: objeto <- RecordTypes <- layouts <- menu <- seed, todos en este spec.
- [x] Sin heuristicas por nombre: enums declarados como prop tipada; campos del Plan condicionados por `recordType` (dato), no por nombre de campo.

## Constraints

- **RULE-mods-003** (must): `npm run sync` tras cualquier cambio del mod (objeto, RecordTypes, layouts, i18n) — sin sync, el objeto/layout no existe en runtime. Aplica a S1 y S2.
- **RULE-dev-006** (must): tests del modulo + verificacion de arranque al mergear; regression sin nuevos rojos. Aplica a S3 (gate de cierre).
- **RULE-platform-006** (must): PascalCase obligatorio en title del objeto y de los RecordTypes (`Curriculum`, `rt__Plan__curriculum`, `rt__Minor__curriculum`, `default_Curriculum_*`, `defaultObjects: ["Curriculum"]`). Lowercase rompe el codegen en Linux.
- **DET-7**: cada test case (TC-1..7) traza a un REQ; regression obligatoria (S3).
- **DET-13**: cierre basado en evidencia — acceptance checkpoints ejecutados, smoke con screenshots reales, NO "parece estar bien".

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager codegen/sync | internal | Genera Prisma + GraphQL desde Curriculum.json + RecordTypes | Si falla el sync, el objeto no existe en runtime |
| Institution / AcademicProgram seedeados (UPU) | internal | El seed cuelga los curriculums de estos owners | Si no existen, el seed no encuentra owners (mitigado: seed previo los crea — SPEC-021) |
| `conditions` en layout-engine (RecordDetail -> Vueform) | internal | Mecanismo de campos condicionales por RecordType y owner | H4.1: puede no re-evaluar en create-mode (validacion empirica en S2; fallback documentado) |

## Tasks

### Session 1 — DataModel: objeto Curriculum + RecordTypes + versionado + sync [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `objects/Curriculum.json` (campos comunes, owner polimorfico, bloque versioning, uniqueConstraints `[[previousVersionId, version]]`, `code` NO unico, status enum) | REQ-01 | developer | — | mods/curriculum-design/objects/Curriculum.json | lint JSON + comparar shape vs activity.json (versioning) y AcademicProgram.json | rm del archivo (nuevo) | DET-1, DET-2, RULE-platform-006 | done | 1 |
| S1.T2 | Crear `RecordTypes/rt__Plan__curriculum.json` (properties temporales PLAN-ONLY) | REQ-01 | developer | — | mods/curriculum-design/objects/RecordTypes/rt__Plan__curriculum.json | lint JSON + verificar properties Plan-only | rm del archivo (nuevo) | DET-1, DET-2, RULE-platform-006 | done | 1 |
| S1.T3 | Crear `RecordTypes/rt__Minor__curriculum.json` (sin properties adicionales) | REQ-01 | developer | — | mods/curriculum-design/objects/RecordTypes/rt__Minor__curriculum.json | lint JSON + verificar sin campos temporales | rm del archivo (nuevo) | DET-1, DET-2, RULE-platform-006 | done | 1 |
| S1.T4 | Agregar `"Curriculum"` a `defaultObjects` en `config/app.json` | REQ-01 | developer | S1.T1 | mods/curriculum-design/config/app.json | revisar array | git revert | DET-16, RULE-platform-006 | done | 1 |
| S1.T5 | `npm run sync` desde object-manager + restart; verificar `model Curriculum` + `@@unique([previousVersionId, version])` en schema generado Y aplicado en DB del tenant (gotcha TICKET-054); GraphQL introspection | REQ-01 | developer | S1.T1, S1.T2, S1.T3, S1.T4 | object-manager (sync) | grep `model Curriculum` + inspeccionar indice en DB tenant + query GraphQL `curricula` | regenerar baseline (NO --accept-data-loss) | DET-13, RULE-mods-003 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, validar codegen + @@unique en DB + GraphQL, quality review, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — UI: 4 layouts + owner polimorfico + i18n + validacion empirica H4.1 [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear los 4 layouts `default_Curriculum_{list,view,create,edit}.json` (layout unico + `conditions` para campos del Plan y owner polimorfico — DEC-LOCAL-01; delete real en list) | REQ-02, REQ-03, REQ-04, REQ-05 | developer | S1.GATE | mods/curriculum-design/config/layouts/default_Curriculum_list.json, _view.json, _create.json, _edit.json | lint JSON + render en UI | git revert (rm archivos) | DET-2, RULE-platform-006 | pending | 2 |
| S2.T2 | Crear `lang/es_CL@Curriculum.json` (column.* + enums.* de recordType/ownerType/status/progression/periodType) | REQ-06 | developer | S1.GATE | mods/curriculum-design/lang/es_CL@Curriculum.json | revisar keys vs campos/enums | git revert | DET-2 | pending | 2 |
| S2.T3 | `npm run sync` + restart + validacion empirica H4.1: smoke del create de un Plan con cada owner (programa/institucion) — confirmar que `conditions` re-evalua en create-mode; si falla, aplicar fallback + actualizar DEC-LOCAL-01 + learn | REQ-04, REQ-05 | developer | S2.T1, S2.T2 | object-manager (sync) + suite (UI) | smoke create Plan/Minor con cada owner + screenshots | regenerar baseline; fallback (selects siempre visibles / default) | DET-13, RULE-mods-003 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, validar H4.1 con evidencia, PascalCase (RULE-platform-006), quality review, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision + screenshots H4.1 | (no aplica) | DET-20, DET-23, DET-25 | pending | 2 |

### Session 3 — Validacion: seed idempotente + smoke TC-1..7 + regression [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear `seed/_data-curriculum.js` + enganchar en `seed/seed.js` (idempotente; Plans + Minors con owners variados academicProgram/institution; sin --accept-data-loss) | REQ-06 | developer | S2.GATE | mods/curriculum-design/seed/_data-curriculum.js, mods/curriculum-design/seed/seed.js | correr seed 2x sin duplicar; visible en lista | git revert + limpiar filas seedeadas si aplica | DET-2, RULE-mods-003 | pending | 3 |
| S3.T2 | Smoke UI TC-1..TC-7 con evidencia (lista con Tipo, detalle Plan/Minor, create/edit, delete real, owner polimorfico) | REQ-02, REQ-03, REQ-04, REQ-05 | reviewer | S3.T1 | suite (UI) | screenshots por TC-1..7; registrar Actual/Evidence/Status en la tabla del ticket (DET-25) | (no aplica — verificacion) | DET-7, DET-13, DET-25 | pending | 3 |
| S3.T3 | Regression del modulo (Activity, AcademicProgram, resto): codegen sin error + vistas previas funcionan | REQ-PRESERVE-01 | reviewer | S3.T1 | object-manager + suite | regression sin nuevos rojos; Activity/AcademicProgram abren | (no aplica — verificacion) | DET-13, RULE-dev-006 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, TC-1..7 verdes con evidencia, regression sin rojos nuevos, quality review, decidir continue/close | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + TC con evidencia + regression | (no aplica) | DET-13, DET-20, DET-23, DET-25 | pending | 3 |

### Task contract (detalle de las tasks con matices)

```
Task S1.T1: Crear objects/Curriculum.json
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/objects/Curriculum.json
- precondition: rama del ticket activa (DET-30, resuelta en design-transition-to-execute)
- expected_output: JSON valido con title PascalCase, metadata (label/labelPlural/uniqueConstraints [[previousVersionId,version]] + bloque versioning linkageField/versionField/versionStrategy/requiredCapability), properties comunes (name, code, recordType, ownerType, ownerId, institutionId, appearsInDiploma, status, externalId, version, versionLabel, previousVersionId), required correctos; code SIN unique
- validation: lint JSON; comparar bloque versioning vs activity.json:27-39; comparar shape vs AcademicProgram.json
- rollback: rm del archivo (nuevo)
- rules: [DET-1, DET-2, RULE-platform-006]

Task S1.T5: sync + verificar @@unique en DB
- source_ref: REQ-01
- agent: developer
- files: (ejecuta sync en object-manager; no edita)
- precondition: S1.T1..T4 done
- expected_output: schema.prisma con model Curriculum + @@unique([previousVersionId, version]); indice REALMENTE aplicado en la tabla del tenant (no solo en el schema generado); GraphQL expone curricula
- validation: grep model Curriculum + inspeccionar indice en DB tenant (gotcha TICKET-054) + query introspection; restart object-manager antes de validar GraphQL (no hot-reload)
- rollback: regenerar baseline (NO --accept-data-loss)
- rules: [DET-13, RULE-mods-003]

Task S2.T1: 4 layouts (Opcion B layout unico + conditions)
- source_ref: REQ-02, REQ-03, REQ-04, REQ-05
- agent: developer
- files: mods/curriculum-design/config/layouts/default_Curriculum_{list,view,create,edit}.json
- precondition: S1.GATE (objeto generado y queryable)
- expected_output: list con columna Tipo + rowAction delete real; view/create/edit con campos del Plan condicionados por conditions [["recordType","==","Plan"]]; owner polimorfico (ownerType select + 2 selects condicionados por conditions sobre ownerType); recordType read-only en edit; rotationConfig fuera de la UI
- validation: lint JSON + render en UI (los 4 modos)
- rollback: rm de los 4 archivos
- rules: [DET-2, RULE-platform-006]

Task S2.T3: sync + validacion empirica H4.1
- source_ref: REQ-04, REQ-05
- agent: developer
- files: (ejecuta sync; no edita salvo fallback)
- precondition: S2.T1, S2.T2 done
- expected_output: create de un Plan funciona con owner=programa y con owner=institucion; conditions re-evalua al elegir ownerType/recordType en create-mode; si falla -> fallback aplicado (selects siempre visibles o default) + DEC-LOCAL-01 actualizada + learn registrado
- validation: smoke create con screenshots (TC-7)
- rollback: regenerar baseline; revertir al fallback de layout
- rules: [DET-13, RULE-mods-003]

Task S3.T1: seed idempotente
- source_ref: REQ-06
- agent: developer
- files: mods/curriculum-design/seed/_data-curriculum.js, seed/seed.js
- precondition: S2.GATE (UI validada)
- expected_output: Plans y Minors en UPU con owners variados (programa/institucion); idempotente por clave de negocio; sin --accept-data-loss
- validation: correr seed 2x, conteo estable; visible en lista
- rollback: git revert + limpiar filas seedeadas si aplica
- rules: [DET-2, RULE-mods-003]
```

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `conditions` NO re-evalua en create-mode (H4.1) cuando el campo dependiente no tiene valor inicial | medium | high | Validacion empirica en S2.T3 (smoke create con cada owner); fallback documentado: dos selects siempre visibles o `ownerType`/`recordType` con default. Si falla, reversible a layouts-por-RT |
| `@@unique([previousVersionId, version])` no se aplica en la DB del tenant (falla silencioso — gotcha TICKET-054) | medium | high | Verificacion explicita del indice en la DB del tenant en S1.T5, no solo grep del schema generado |
| Drift de BASEMODEL al seedear objeto nuevo (warning #3) | medium | medium | Seed idempotente (busca antes de crear); NO usar --accept-data-loss; regenerar baseline si hay drift |
| PascalCase mal escrito rompe codegen en Linux (RULE-platform-006) | medium | high | Naming verificado en todos los artefactos; S1.GATE valida modelo generado |
| object-manager no refleja el objeto sin restart (sin hot-reload) | high | medium | S1.T5 incluye restart explicito antes de validar GraphQL |
| Owner polimorfico arrastra `ownerId` previo al cambiar `ownerType` | low | medium | Smoke verifica el cambio de ownerType limpia el select previo (REQ-04 edge); resolver a ownerId en submit segun el select activo |

## Open questions

- [ ] **H3 — A vs B (confirmacion)**: layouts separados por RecordType (`default_rt__Plan__curriculum_*`) vs layout unico con `conditions: [["recordType","==","Plan"]]`. Recomendacion (DEC-LOCAL-01): **B (layout unico + conditions)** por menos archivos y consistencia con el owner polimorfico. Confirmar antes de S2.
- [ ] **H4.1 — `conditions` en create-mode**: re-evalua en vivo cuando el campo dependiente aun no tiene valor? Validacion empirica en S2.T3. Fallback documentado.
- [ ] **`status` — enum vs workflow**: enum simple (Draft\|Active\|Archived, default Draft) o workflow formal (como `activity`)? Propuesta v1 (DEC-LOCAL-02): **enum simple**. `[NEEDS CLARIFICATION]`
- [ ] **`institutionId` required**: el draft lo asume required (lo necesita la unicidad por linaje de 1270). Confirmar si siempre derivable del owner o explicito.
- [ ] **Enums `progression` / `periodType`**: valores exactos no especificados en el ticket. `[NEEDS CLARIFICATION: progression = ? ; periodType = Semester|Trimester|Quarter|Annual?]`

## Decisions

### DEC-LOCAL-01: Layout unico + conditions (Opcion B) para campos del Plan y owner polimorfico
- **Contexto**: el Plan declara campos temporales que el Minor no; ademas el owner es polimorfico. El layout-engine NO tiene `visibleWhen`/`showIf` ni picker polimorfico nativo, pero SI soporta `conditions: [[campo, op, valor]]` (RecordDetail -> Vueform).
- **Drivers**: minimizar cantidad de archivos; un solo mecanismo para ambos casos condicionales; consistencia con el resto del mod; reversibilidad.
- **Opcion elegida**: **B** — un layout unico por modo (view/create/edit) con `conditions: [["recordType","==","Plan"]]` en los campos del Plan, y owner polimorfico via `ownerType` select + dos selects condicionados por `conditions` sobre `ownerType`.
- **Alternativas descartadas**: **A** — layouts separados por RecordType (`default_rt__Plan__curriculum_*`, patron `CurricularSection` con 7 RTs). Descartada por mayor cantidad de archivos (x3 por RT) y porque no resuelve el owner polimorfico (igual necesitaria `conditions`); A queda como fallback estructural si B no escala a futuros RecordTypes con campos muy divergentes.
- **Consecuencias**: gana simplicidad y menos archivos; depende de que `conditions` re-evalue en create-mode (H4.1 — validacion empirica en S2). Si H4.1 falla, fallback inmediato (selects siempre visibles / default) sin migrar a A.
- **Session**: design (pre-S1). Confirmacion empirica en S2.T3.

### DEC-LOCAL-02: status como enum simple, no workflow formal
- **Contexto**: el objeto canonico podria exigir lifecycle; el ticket no pide workflow en v1.
- **Drivers**: academicProgram (SPEC-021) tampoco usa workflow; "nace Draft" de 1270 se satisface con el default; minimizar superficie.
- **Opcion elegida**: `status` como enum `[Draft, Active, Archived]` con default `Draft`.
- **Alternativas descartadas**: workflow formal con `workflowId`/`currentStatusId` (patron `activity`) — descartada por no aportar valor en v1 y agregar campos que luego habria que migrar.
- **Consecuencias**: gana simplicidad y entrega rapida; pierde lifecycle formal (se agrega despues, aditivo). `[NEEDS CLARIFICATION: confirmar enum exacto]`
- **Session**: design (pre-S1).

## Technical reference

- Plantilla base del objeto + vista: SPEC-021 (`AcademicProgram`) — mismo encuadre (objeto + 4 layouts + i18n + seed).
- Bloque `versioning` de referencia: `mods/curriculum-design/objects/activity.json:27-39` (linkageField: previousVersionId, versionField: version, versionStrategy: increment).
- `conditions` (campos condicionales): `mods/object-manager-editor/config/layouts/fielddefinition-create.json:136-165` (precedente real).
- Owner polimorfico / references estatico: `layout/src/layouts/RecordDetail.vue:2850-2893`.
- Codegen de uniqueConstraints: `object-manager/src/services/codegen/generatePrismaSchema.js`.
- Menu: `suite/composables/useObjectManager.ts` + `suite/components/static/ObjectNavBar.vue`.
- Seed: `seed/seed.js` (entrypoint). Comando: `npm run sync` desde object-manager.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..06 pasan; Curriculum CRUD-able desde UI; Plan muestra campos temporales y Minor no; owner polimorfico persiste ownerType+ownerId; delete real.
- [ ] **Tests**: smoke UI TC-1..TC-7 con evidencia (screenshots); H4.1 validado empiricamente.
- [ ] **Rules**: PascalCase (RULE-platform-006), sync (RULE-mods-003), tests+arranque (RULE-dev-006) respetados.
- [ ] **Integration**: Activity, AcademicProgram y objetos previos sin regresion (REQ-PRESERVE-01); `@@unique` realmente aplicado en DB del tenant.
- [ ] **Docs**: i18n es_CL provisto; spec tracked; open questions resueltas o registradas en backlog.
