---
id: SPEC-curriculum-design-plan-version-deep-clone
project: up1
ticket: TICKET-111
status: done
---

# Plan de estudio · Versionamiento con arrastre completo de la malla (deep clone)

# Plan de estudio · Versionamiento con arrastre completo de la malla (deep clone)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: cerrar la pieza que SP4 dejo pendiente a proposito. Hoy versionar un Plan (`Curriculum` con recordType=Plan) crea una v2 "vacia": no arrastra su malla (`planEntry`), ni las categorias/requisitos, ni sus datos de recordType. Este ticket habilita que **versionar arrastre todo el contenido del plan de forma atomica**: datos generales del `curriculum`, datos del recordType (`rt__Plan__curriculum`: progression/totalCredits), secciones curriculares (`curricularSection`) y la malla completa (`planEntry` + `requirementCategory` + `requirement`) con sus cross-refs internos re-apuntados a la v2. El motor de deep-clone en cascada **ya existe, es atomico y es config-driven**; el trabajo real es (a) declarar la config, (b) generalizar el motor para remapear cross-refs entre hijos DIRECTOS (`planEntry.categoryId → requirementCategory`), y (c) cerrar el gap del recordType del padre.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El remapeo de cross-refs entre hijos DIRECTOS se resuelve **generalizando el motor core con `directChildrenDerived`** (espejo de `polymorphicChildrenDerived`), NO con un hook del mod | El versionado completo debe ser capacidad de plataforma. `applyDerivedRemap` ya es agnostico poly/direct → es un reader + una llamada, no logica nueva. Precedente: `polymorphicChildrenDerived` subio al motor el hook HU-8b de CurricularLink. Toca CORE (revisar con criterio "tocar con cuidado") |
| 2 | **S1 es un spike bloqueante** que verifica en runtime si el recordType del padre (`rt__Plan__curriculum`) se arrastra end-to-end (BUG-core-004) antes de comprometer alcance | Es lo unico que puede mover el estimado 8→13 SP. HU-10 agrego un mecanismo (`prefillFrom.source` mergea base+RT+ext) despues de que se detecto el bug; hay que confirmar si ya cubre el path `asNewVersion` o si falta fix core |
| 3 | `planEntry.sourceEntryId` (self-FK de trazabilidad) se decide en S1: apuntar al viejo / remapear / limpiar | Define si la v2 conserva trazabilidad al plan origen o queda "limpia". Es BL-1, `should`. Sin decidir, el clon podria dejar FKs apuntando a la v1 |
| 4 | Config del mod se edita sobre `Curriculum.json` (PascalCase), la fuente confirmada; S1 tambien resuelve la colision de case (`curriculum.json` vs `Curriculum.json`) antes de tocar | En filesystem case-insensitive los dos nombres colisionan. Editar el archivo equivocado no tendria efecto tras el sync |

**Riesgos principales y como los mitigamos**:

- **Cross-ref entre hijos directos apunta al plan viejo** (`planEntry.categoryId → requirementCategory` de la v1) → se generaliza `applyDerivedRemap` (ya agnostico) via `directChildrenDerived`; test e2e verifica que ningun hijo de la v2 referencia ids de la v1.
- **La v2 nace sin sus campos de recordType** (BUG-core-004, high, detected) → S1 verifica end-to-end ANTES de codear; si el gap sigue vivo, S2 aplica `cloneChildProjections` al padre versionado + atomicidad del split base/RT.
- **Tocar el motor core rompe el clone de `Activity`** (que ya usa deepClone) → el cambio es aditivo (nuevo reader + nueva llamada), no modifica el path polimorfico existente; regresion de `Activity` corre en S3 (REQ-05 preserva el gate de estado y el clone existente).
- **Unit tests mockeados consagran bugs de runtime** (memoria: proyecciones RT/casing de FK) → S3 exige integration contra BD real + smoke runtime del grafo renderizado en UPU (DET-36), no solo unit.

**Que NO se hace en este ticket**:

- **UPONE-1340** (gestion de "version actual" / iscurrent) — adyacente, fuera de SP6 (BL-2, confirmar en S1).
- **Cambio de schema / migracion DB nueva** — todo es config (`Curriculum.json`) + generalizacion del motor en `logic/helpers`; no se agregan tablas ni columnas.
- **Construir el motor de deep-clone** — ya existe y es atomico; solo se generaliza (reader `directChildrenDerived`) y se cablea config.
- **Rediseño de la UI de versionado** — las rowActions "Crear nueva version" ya existen desde SP4; solo se profundiza lo que arrastran.

**Tamano estimado**: 3 sessions (~5-8h efectivas), condicionado a S1. La mas riesgosa es **S1** (spike runtime del recordType del padre — decide si el estimado 8 se sostiene o sube a 13) seguida de **S2** (core-touch: generalizar el motor).

**Como vas a saber que funciona**:

- Tomo un Plan en estado Approved/Active con malla completa (planEntry + categorias + requisitos + secciones), ejecuto "Crear nueva version", y la v2 aparece con **toda** la malla replicada.
- Abro la malla de la v2 y veo que los `planEntry` apuntan a las categorias **de la v2**, no a las del plan original (cross-refs remapeados).
- La v2 conserva progression/totalCredits (datos de recordType); versionar un plan en estado no permitido sigue siendo rechazado (gate de estado intacto).

---

## Purpose

Habilitar el versionamiento **profundo** de `Curriculum` (recordType=Plan) en el mod `curriculum-design`: al crear una nueva version, arrastrar atomicamente el grafo completo del plan (datos generales + recordType + `curricularSection` + malla `planEntry`/`requirementCategory`/`requirement`) con remapeo de todos los cross-refs internos, reusando y generalizando el motor de deep-clone en cascada de core (`asNewVersion` + helpers). Actor primario: administrador curricular con capability de versionado de planes. Valor: cerrar el diferido explicito de SP4 (UPONE-1270 / Backlog B1) ahora que la malla existe (MC-01..MC-09), entregando versionado real de planes sin reconstruccion manual de la malla.

## Requirements

### REQ-01: Replicar datos generales del curriculum

> **Que cambia**: al versionar un Plan, la v2 nace con todos los datos generales del `curriculum` copiados del origen (nombre, code, institution, etc.), como ya ocurre hoy.
> **Por que**: es la base del versionado; sin esto la v2 no representa al mismo plan. Es regresion a preservar, no capacidad nueva.

El sistema MUST replicar los campos generales del `curriculum` en la nueva version, respetando la config `prefillFrom.exclude` (version, previousVersionId, versionLabel, status).

**Actor**: admin curricular
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: version conserva datos generales
- **GIVEN** un Plan v1 Approved con datos generales completos
- **WHEN** el admin ejecuta "Crear nueva version"
- **THEN** la v2 copia los datos generales del v1
- **AND** `version` incrementa, `status` nace Draft, `previousVersionId` apunta al v1 (via `exclude`)

#### Scenario: campos excluidos no se copian tal cual
- **GIVEN** un Plan v1 con `status=Approved`
- **WHEN** se versiona
- **THEN** la v2 NO hereda `status=Approved` (nace Draft) ni el `version` del v1

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versiona un plan y ve la v2 con el mismo nombre/code y `version` incrementado, en estado Draft.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | datos generales | Plan v1 Approved | versionar | v2 con datos generales copiados | code igual, version+1, status Draft |

### REQ-02: Replicar datos del recordType del plan

> **Que cambia**: la v2 conserva los campos del recordType `rt__Plan__curriculum` (progression, totalCredits, totalPeriods, periodType), que hoy no se arrastran.
> **Por que**: BUG-core-004 (high) — versionar corre con objectType=Curriculum (base) y el path que crea base+RT+ext no dispara; la v2 nace sin sus campos temporales y la malla queda rota.

El sistema MUST replicar los campos de la extension recordType (`rt__Plan__curriculum`) en la nueva version del plan.

**Actor**: admin curricular
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: v2 conserva campos de recordType
- **GIVEN** un Plan v1 con `progression`, `totalCredits`, `totalPeriods`, `periodType` seteados
- **WHEN** se versiona
- **THEN** la v2 conserva esos cuatro campos con los valores del v1

#### Scenario: interaccion con el guard de recordType
- **GIVEN** el path `asNewVersion` sobre un `Curriculum` recordType=Plan
- **WHEN** el versionado corre
- **THEN** NO se dispara `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` (ese guard bloquea `model=rt__`, el versionado va por el base)
- **AND** la proyeccion recordType del padre se persiste (via HU-10 `prefillFrom.source` o via fix core si S1 confirma el gap)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la v2 y ve progression/totalCredits iguales al plan origen (no vacios).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | RT arrastrado | Plan v1 con RT completo | versionar | v2 con progression/totalCredits | valores == v1 |
| 2 | guard no bloquea | asNewVersion base | versionar | sin error de guard | operacion completa |

### REQ-03: Replicar las secciones curriculares

> **Que cambia**: la v2 arrastra las `curricularSection` del plan (hijos polimorficos), incluyendo su recursion y sub-secciones.
> **Por que**: las secciones son parte del plan; el motor ya las clona via `polymorphicChildren` — se activa declarando el alias en `deepClone`.

El sistema MUST replicar las `curricularSection` del plan como hijos del deep-clone, con sus FKs re-apuntadas a la v2.

**Actor**: admin curricular
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: secciones clonadas y re-apuntadas
- **GIVEN** un Plan v1 con N `curricularSection`
- **WHEN** se versiona
- **THEN** la v2 tiene N secciones equivalentes
- **AND** ninguna seccion de la v2 apunta (owner) a la v1

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la v2 muestra las mismas secciones que el plan origen.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | secciones | Plan v1 con 3 secciones | versionar | v2 con 3 secciones | owner == v2 |

### REQ-04: Replicar la malla con cross-refs remapeados

> **Que cambia**: la v2 arrastra la malla completa (`planEntry` + `requirementCategory` + `requirement`), y los `planEntry` de la v2 apuntan a las categorias de la v2, no a las del plan origen.
> **Por que**: `planEntry.categoryId → requirementCategory` son ambos hijos DIRECTOS; hoy `applyDerivedRemap` solo remapea cross-refs entre hijos POLIMORFICOS → el cross-ref directo quedaria apuntando a la v1. Es el gap core central del ticket.

El sistema MUST clonar `planEntry`, `requirementCategory` y `requirement` como hijos del deep-clone, Y MUST remapear el cross-ref `planEntry.categoryId` para que apunte a la `requirementCategory` clonada de la v2, mediante un mecanismo `directChildrenDerived` en el motor core (espejo de `polymorphicChildrenDerived`).

**Actor**: admin curricular
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: malla clonada con cross-ref remapeado
- **GIVEN** un Plan v1 con planEntries que referencian requirementCategories via `categoryId`
- **WHEN** se versiona
- **THEN** la v2 tiene los planEntries y categorias equivalentes
- **AND** cada `planEntry.categoryId` de la v2 apunta a una `requirementCategory` de la v2 (nunca a una de la v1)

#### Scenario: sin declaracion, el cross-ref rompe (regresion del gap)
- **GIVEN** el motor SIN `directChildrenDerived`
- **WHEN** se clona la malla
- **THEN** `planEntry.categoryId` apuntaria a la categoria de la v1 (comportamiento a corregir)

#### Scenario: reader agnostico reusa applyDerivedRemap
- **GIVEN** el bloque `directChildrenDerived: [{object: planEntry, via: categoryId, remapTo: requirementCategories}]` declarado
- **WHEN** corre la fase DERIVED del deep-clone
- **THEN** `applyDerivedRemap` re-apunta `categoryId` usando el `cloneMap` (extraer `.newId`, no string plano — RULE-core-023)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la malla de la v2 y ve los planEntries organizados bajo las categorias de la v2 (no aparecen vacios ni apuntando al plan viejo).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | malla clonada | Plan v1 con 10 planEntry + 3 categorias | versionar | v2 con 10 planEntry + 3 categorias | conteos iguales |
| 2 | cross-ref remapeado | planEntry.categoryId → cat v1 | versionar | categoryId → cat v2 | 0 refs a ids de v1 |

### REQ-05: Preservar las restricciones de estado (regresion)

> **Que cambia**: nada de comportamiento — el gate de "desde/hacia que estado se versiona" (UPONE-1381/1220) sigue vigente y se preserva.
> **Por que**: el request de Jira pide validar explicitamente que el gate de estado se mantiene; es capacidad ya implementada que este ticket no debe romper.

El sistema MUST preservar `versionableFromStates: ["Approved","Active"]` y el rechazo `SOURCE_NOT_VERSIONABLE` para planes en estado no permitido; la v2 MUST nacer en el estado inicial configurado (Draft).

**Actor**: system
**Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: estado permitido versiona
- **GIVEN** un Plan en estado Approved
- **WHEN** se versiona
- **THEN** la operacion procede

#### Scenario: estado no permitido rechaza
- **GIVEN** un Plan en estado Draft
- **WHEN** se intenta versionar
- **THEN** el sistema rechaza con `SOURCE_NOT_VERSIONABLE`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar versionar un plan Draft muestra error; versionar uno Approved funciona.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | gate permitido | Plan Approved | versionar | procede | v2 creada |
| 2 | gate bloquea | Plan Draft | versionar | rechazo | SOURCE_NOT_VERSIONABLE |

### REQ-06: Clone profundo del Plan (row action "Duplicar" arrastra la malla)

> **Que cambia**: la row action **"Duplicar"** de un Plan pasa de clon superficial (solo datos generales) a **clon profundo**: la copia independiente arrastra todo el arbol (secciones + requisitos + malla `planEntry`/`requirementCategory` + RT base), igual que el versionado, pero como **raiz de linaje nueva** (no version).
> **Por que**: cierra la **mitad no terminada del diferido de UPONE-1270** ("el clone profundo del Plan — arrastrar la malla"). 1450 lo entrego solo para el versionado (`asNewVersion`); la accion "Duplicar" (`cloneStrategy: prefilledModal`) quedo superficial. Verificado en runtime 2026-07-22 (clon = 0 planEntries). Reusa el mismo motor de REQ-04.

El sistema MUST, al ejecutar "Duplicar" sobre un Plan, crear una copia **independiente** (raiz de linaje nueva: `version=1`, `previousVersionId=null`, `status=Draft`, `code` nuevo provisto por el usuario) que replica `sections` + `requirements` + `planEntries` + `requirementCategories` con los cross-refs internos remapeados a la copia (0 refs al origen, RULE-core-032) y el RT base (`rt__Plan__curriculum`). El Plan origen MUST quedar intacto.

**Actor**: admin curricular
**Layers**: frontend (layout), backend (mod), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: clone profundo por el path real (Duplicar)
- **GIVEN** un Plan con malla completa (planEntries + categorias + secciones + requisitos)
- **WHEN** el admin ejecuta "Duplicar" y define un `code` nuevo
- **THEN** la copia nace como raiz nueva (`version=1`, `previousVersionId=null`, `code` nuevo) con toda la malla replicada
- **AND** cada `planEntry.categoryId` de la copia apunta a una `requirementCategory` **de la copia** (nunca del origen)
- **AND** la copia conserva progression/totalCredits (RT base)
- **AND** el Plan origen no se modifica

#### Scenario: unicidad de linaje respetada
- **GIVEN** el clon es una raiz nueva
- **WHEN** se crea
- **THEN** `validateCurriculumCreate` valida `(institutionId, code)` unico entre raices → el `code` nuevo lo satisface (a diferencia del versionado que mantiene `code`)

#### Scenario: reuso del motor (no logica nueva de clonado)
- **GIVEN** el clon rutea por el objectType base `Curriculum` con `prefillFrom.{source, deepClone}`
- **WHEN** corre `createInstance`
- **THEN** dispara el mismo motor de deep-clone de REQ-01..04 (capa 1, sin cambio de core)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: duplica un plan con malla, define un code nuevo, y la copia aparece con la malla completa colgando de sus propias categorias; el plan original queda igual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | clone profundo | Plan con 6 planEntry + 4 cats | Duplicar + code nuevo | copia con 6 planEntry + 4 cats | conteos iguales, code nuevo, version 1 |
| 2 | cross-ref remapeado | planEntry.categoryId → cat origen | Duplicar | categoryId → cat de la copia | 0 refs a ids del origen |
| 3 | origen intacto | Plan origen | Duplicar | origen sin cambios | mesh del origen igual |

### REQ-07: El fix del clone se implementa por CAPAS reusables (capacidad de plataforma)

> **Que cambia**: la habilitacion del clone profundo se estructura en 3 capas para que el motor y el frontend queden como **capacidad de plataforma reusable** (no un hook Curriculum-only). Precedente: `directChildrenDerived` subio al motor core en vez de vivir como hook del mod.
> **Por que**: analisis forward (2026-07-22): si a futuro AcademicProgram (u otro objeto base) crece con hijos, el clone profundo debe salirle **con solo config**, reusando la misma logica de OM. Solo el "peaje" del alias RT es especifico de objetos RecordType-typed.

El sistema SHOULD implementar el clone profundo en capas: **(1) motor OM** = reuso sin cambio; **(2) frontend** = el handler generico de "Duplicar" (`RecordList`) manda `prefillFrom.source` para cualquier objeto con `cloneStrategy: prefilledModal` (capacidad de plataforma); **(3) glue del alias RT** = especifico de Curriculum (objeto RecordType-typed ruteado por customEndpoint), acotado al mod.

**Actor**: system
**Layers**: frontend (layout), backend (mod)

<details><summary>Analisis de reuso (AcademicProgram)</summary>

- **AcademicProgram** es objeto **base** (no RecordType-typed) → NO necesita la capa 3 (llega al motor por el path generico). Si creciera con hijos, el clone profundo seria **solo config** (`prefillFrom.deepClone` + bloques de hijos) + la capa 2 generica ya construida aca. Verificado: su clone de entidad ya funciona (UPONE-1271); su unico hijo hoy (`curricula`) NO se clona por diseño (fuera de scope).
- **CurricularSection**/Modality (RecordType-typed + hijos): unico caso que reusaria la capa 3 si a futuro se quiere clone profundo de sub-secciones. Fuera de 1450.

</details>

#### Acceptance
**Verificable**: la capa 2 (frontend) vive en el handler compartido de `RecordList`, no en un branch Curriculum-only; un objeto base con `prefillFrom.deepClone` declarado hereda el clone profundo sin tocar OM.

## Artifacts

> El motor de deep-clone y el objeto `Curriculum` **ya existen**. No hay objetos ni resolvers nuevos (por eso `meta_specs: []`). Los artifacts abajo son (A) un cambio de config declarativo sobre un objeto existente y (B) una generalizacion aditiva del motor core existente.

### A. Config del objeto — `Curriculum.json` (mod curriculum-design)

Cambios declarativos sobre el objeto existente. NO es objeto nuevo.

| Bloque | Accion | Contenido | Notas |
|--------|--------|-----------|-------|
| `metadata.prefillFrom.deepClone` | **agregar** | `["sections", "requirements", "planEntries", "requirementCategories"]` | Hoy `prefillFrom` solo tiene `exclude`. Activa la cascada de clonado de los 4 conjuntos de hijos |
| `metadata.directChildrenDerived` | **agregar** | `[{ "object": "planEntry", "via": "categoryId", "remapTo": "requirementCategories" }]` | Declara el cross-ref directo a remapear. Espejo de `polymorphicChildrenDerived`. Lo consume el reader nuevo del motor (artifact B) |
| `metadata.polymorphicChildren` | (existente) | `[sections, requirements]` | Sin cambio — ya declarado |
| `metadata.directChildren` | (existente) | `[planEntries (fk planId), requirementCategories (fk curriculumId)]` | Sin cambio — ya declarado |

**Fuente confirmada**: `Curriculum.json` (PascalCase). S1 resuelve la colision de case con `curriculum.json` antes de editar (AQ4).

### B. Generalizacion del motor core — `directChildrenDerived`

Cambio aditivo en `object-manager` (CORE). El motor ya clona hijos directos; falta remapear cross-refs ENTRE hijos directos.

| Elemento | Accion | Ubicacion | Notas |
|----------|--------|-----------|-------|
| Reader `readDirectChildrenDerived` | **agregar** | `object-manager/src/graphql/resolvers/helpers/` (espejo de `readPolymorphicChildrenDerived`) | Lee `metadata.directChildrenDerived` del objeto |
| Llamada en fase DERIVED | **agregar** | `instance.resolver.js` (~fase DERIVED, `:3810-3829`) | Junto a la llamada existente de `readPolymorphicChildrenDerived` (`:3816`) |
| `applyDerivedRemap` | **reusar (sin cambio)** | `deep-clone-polymorphic.js:108` | Ya agnostico poly/direct: opera sobre `cloneMap` + `{object, via, remapTo}` |
| Proyeccion RT del padre (`rt__Plan__curriculum`) | **verificar/fix condicional** | `instance.resolver.js` (HU-10 `:3106-3129` / `cloneChildProjections`) | Alcance definido por S1 (BUG-core-004). Si el gap sigue vivo: aplicar `cloneChildProjections` al padre versionado |

## Tasks

### Session 1 — Spike de evidencia (RT base end-to-end + fuente del objeto) [tipo: ⚑ fuerte] [tier: T3]

> Driver de SP. Resuelve AQ1 (BUG-core-004: ¿el recordType del padre se arrastra?) y AQ4 (colision de case del JSON). Decide si el estimado 8 se sostiene o sube a 13, y el alcance del fix del RT base. Tambien cierra la decision de `planEntry.sourceEntryId` (BL-1). Verificacion runtime real (servidor UPU corriendo o test de integracion), NO inferencia estatica.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Verificar en runtime si versionar un `Curriculum` recordType=Plan arrastra `rt__Plan__curriculum` (progression/totalCredits/totalPeriods/periodType) end-to-end via HU-10, y como interactua con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`. Confirmar si BUG-core-004 sigue vivo | REQ-02 | researcher | — | object-manager/src/graphql/resolvers/instance.resolver.js; object-manager/src/graphql/resolvers/helpers/version-from-source.js | manual (runtime: crear plan test con RT + versionar + inspeccionar create payload / v2 en BD) | (no aplica — solo lectura) | DET-5, DET-33, DET-36 | pending | 1 |
| S1.T2 | Resolver la colision de case `curriculum.json` vs `Curriculum.json` en `mods/curriculum-design/objects/`: confirmar cual es la fuente real que consume el sync antes de editar | REQ-04 | researcher | — | mods/curriculum-design/objects/ (ls + git); object-manager/objects/business/ (copia synced) | manual (identificar fuente + verificar en la rama de trabajo) | (no aplica — solo lectura) | DET-4, DET-5 | pending | 1 |
| S1.T3 | Decidir el comportamiento de `planEntry.sourceEntryId` (self-FK de trazabilidad) al versionar: apuntar al viejo / remapear / limpiar (BL-1). Registrar como DEC-LOCAL | REQ-04 | architect | S1.T1 | specs/up1/... (decision en spec) | manual (decision documentada en Decisions) | (no aplica — decision) | DET-1, DET-16 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir hallazgos en `## Sessions`, lockear SP (8 vs 13), fijar alcance del RT base para S2, decidir continue/escalate | — | reviewer | S1.T1, S1.T2, S1.T3 | tickets/TICKET-111.md | gate persistido + decision de alcance documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-33 | pending | 1 |

### Session 2 — Core: generalizar el motor con `directChildrenDerived` (+ RT base condicional) [tipo: ⚑ fuerte] [tier: T2]

> Core-touch (tocar con cuidado). Cambio aditivo: reader `directChildrenDerived` + llamada en fase DERIVED, reusando `applyDerivedRemap` (ya agnostico). Declarar el bloque en el JSON para poder ejercitar el reader. El fix del RT base entra aqui SOLO si S1 confirma que el gap sigue vivo (alcance fijado en S1.GATE).

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Declarar `metadata.directChildrenDerived: [{object: planEntry, via: categoryId, remapTo: requirementCategories}]` en `Curriculum.json` (fuente confirmada en S1.T2) | REQ-04 | developer | S1.GATE | mods/curriculum-design/objects/Curriculum.json | manual (JSON valido) + npm run codegen -- UPU sin errores | git revert | DET-2, RULE-core-023 | pending | 2 |
| S2.T2 | Agregar el reader `readDirectChildrenDerived` (espejo de `readPolymorphicChildrenDerived`) + su llamada en la fase DERIVED de `instance.resolver.js`, reusando `applyDerivedRemap` sin modificarla | REQ-04 | developer | S2.T1 | object-manager/src/graphql/resolvers/helpers/deep-clone-direct.js (o helper nuevo espejo); object-manager/src/graphql/resolvers/instance.resolver.js | vitest (unit del motor de clone) | git revert | DET-5, DET-8, DET-16, RULE-core-023, RULE-core-027 | pending | 2 |
| S2.T3 | **N/A (condicional resuelto en S1, sin trabajo)** — ~~Cerrar el gap del recordType del padre en core~~. El RT base ya lo hereda el hook mod `inheritRecordTypeExtensionOnVersion` (UPONE-1270, mergeado) por el path real `createInstance`→override del mod. NO requiere fix core; solo regresion en S3.T3. | REQ-02 | developer | — | — | (no aplica — condicion S1 = false) | (no aplica) | DET-5 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review core-touch (dual-judge T2, DET-35), verificar regresion del clone de `Activity` no rota, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3 | tickets/TICKET-111.md | gate persistido + unit verdes + coverage no baja | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35 | pending | 2 |

### Session 3 — Config del mod + tests de integracion + smoke runtime + docs/KB [tipo: ⚑ fuerte] [tier: T3]

> Cablear `prefillFrom.deepClone` con los 4 aliases, correr integration contra BD real (no solo unit mockeado — memoria), smoke runtime del grafo clonado renderizado en UPU (DET-36), y cerrar la completitud de planificacion (DET-37): docs oficiales del motor + promover `directChildrenDerived` a RULE-core.

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Agregar `metadata.prefillFrom.deepClone: ["sections","requirements","planEntries","requirementCategories"]` en `Curriculum.json` **+ SYNC a object-manager** (la copia synced `object-manager/objects/business/Base/curriculum.json` esta stale: sin polymorphicChildren/directChildren desde UPONE-1381). **CRITICO (dual-judge S2.GATE)**: los 4 aliases deben ir COMPLETOS — si `requirementCategories` falta pero `planEntries` esta, el remap de `categoryId` queda colgando en la v1 (solo console.warn). `resolveEffectivePrefillFrom` unifica el deepClone declarado (registry) con el runtime, asi que declararlo aca activa el path real de la row action `create-new-version` (que NO pasa deepClone en runtime). | REQ-01, REQ-03, REQ-04 | developer | S2.GATE | mods/curriculum-design/objects/Curriculum.json | manual (JSON valido) + npm run codegen + npm run sync (verificar copia synced con los 4 aliases) | git revert | DET-2, RULE-core-027 | pending | 3 |
| S3.T2 | Test de integracion del deep-clone atomico contra BD real: versionar un Plan con malla completa y verificar conteos + cross-refs remapeados (categoryId → cat v2) + RT base arrastrado + secciones | REQ-01, REQ-02, REQ-03, REQ-04 | developer | S3.T1 | object-manager/tests/e2e/clone-*-children.test.js (o test nuevo del grafo plan) | vitest integration (BD real, no mock) | git revert | DET-5, DET-7, DET-13 | pending | 3 |
| S3.T3 | Test de regresion del gate de estado (REQ-05): versionar Approved procede, versionar Draft rechaza `SOURCE_NOT_VERSIONABLE`; regresion del clone de `Activity` | REQ-05 | developer | S3.T1 | object-manager/tests/... (version-from-source / gate estado) | vitest | git revert | DET-7, DET-14 | pending | 3 |
| S3.T4 | Smoke runtime en UPU: versionar un plan real, abrir la malla de la v2 renderizada y verificar que los planEntry cuelgan de las categorias de la v2 (evidencia runtime real, DET-36) | REQ-04 | reviewer | S3.T2, S3.T3 | UPU (tenant uplanner_upu) | manual (screenshot/DOM con marca de corrida) | (no aplica — verificacion) | DET-33, DET-36 | pending | 3 |
| S3.T5 | Docs oficiales del proyecto (DET-37 dim1): documentar `directChildrenDerived` (espejo de la seccion de `polymorphicChildrenDerived`) + el versionado profundo del plan via `prefillFrom.deepClone` + receta de config del `Curriculum.json` | REQ-04 | developer | S3.T2 | object-manager/docs/polymorphic-children.md; object-manager/docs/versioning-capability.md; object-manager/docs/prefill-capability.md; mods/curriculum-design/docs/ (reference/patterns) | manual (docs reflejan el contrato nuevo; sin referencias stale) | git revert | DET-37, DET-16 | pending | 3 |
| S3.T6 | KB interno DKC (DET-37 dim2): promover `directChildrenDerived` a RULE-core nueva (espejo de RULE-core-023/027) + marcar BUG-core-004 resuelto/actualizado segun el desenlace de S1/S2 | REQ-04, REQ-02 | developer | S3.T2 | deckard: projects/up1/rules/core/; projects/up1/bugs/core/bug-core-004.md | dkc-validate Rule + Bug | git revert | DET-37, DET-11, DET-16 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, acceptance checkpoints ejecutados, evidencia runtime consolidada, docs+KB actualizados (DET-37), decidir continue/close-ready | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5, S3.T6 | tickets/TICKET-111.md | gate persistido + acceptance verde + smoke con evidencia + docs/KB al dia | (no aplica — cierre de session) | DET-20, DET-23, DET-36, DET-37 | pending | 3 |

### Session 4 — Clone profundo del Plan ("Duplicar" arrastra la malla) [tipo: ⚑ fuerte] [tier: T3]

> **Ampliacion de alcance (2026-07-22)**: cierra la mitad no terminada del diferido de UPONE-1270. REQ-06/07. Reusa el motor (capa 1, sin cambio). Toca `layout/` (**CORE** — la capa 2 se hace GENERICA, capacidad de plataforma) + mod (capa 3, glue RT Curriculum-especifico). El versionado (S1-S3) ya esta entregado; esta session agrega el clone. **Diseñada, pendiente de autorizacion para ejecutar.**

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | **Capa 2 (frontend generico)**: el handler de `cloneStrategy: prefilledModal` en `RecordList` agrega `prefillFrom: { source: rowId }` al initialData del create; extender el allowlist de `recordDetailInitialData` para dejar pasar `prefillFrom`. Generico (beneficia a cualquier objeto con hijos declarados) | REQ-06, REQ-07 | developer | S3.GATE | layout/src/layouts/RecordList.vue (~2835-2890); layout/src/layouts/recordDetailInitialData.ts | vitest layout + verificar objeto base (AcademicProgram) sin deepClone sigue clonando shallow (no-op) | git revert | DET-16, RULE-core-032 | pending | 4 |
| S4.T2 | **Capa 2 (customEndpoint)**: `RecordDetail` customEndpoint branch debe transportar `initialData.prefillFrom` al `data` de la mutation (hoy solo lee `formData.*`) — necesario porque Curriculum crea via `createCurriculumWithRecordType` (customEndpoint) | REQ-06 | developer | S4.T1 | layout/src/layouts/RecordDetail.vue (~4045-4080) | vitest + smoke: el payload del clone de Curriculum incluye prefillFrom.source | git revert | DET-16 | pending | 4 |
| S4.T3 | **Capa 3 (glue RT, mod)**: en `curriculum-create.resolver.js` el caso clone rutea el create por el objectType **base** (`Curriculum`) con `prefillFrom.{source, deepClone}` (alcanza el motor), luego adjunta la proyeccion RT del propio Curriculum (extraer la logica de copia-RT de `inheritRecordTypeExtensionOnVersion` a un helper compartido no-gateado por asNewVersion) + envolver en `$transaction` (el path plain-create no es transaccional hoy). **CRITICO — unicidad de linaje en ruteo por base**: el clon es RAIZ nueva (`asNewVersion=false`, `previousVersionId=null`) → DEBE pasar la unicidad `(institutionId, code)`; pero `validateCurriculumCreate` corre solo si `objectType` matchea `CURRICULUM_RT_PATTERN` (alias RT), y aca ruteamos por el BASE `Curriculum` → el guard NO dispararia. Invocar la unicidad de linaje **explicitamente** en el path base (llamar `assertUniqueLineageRoot`/`validateCurriculumCreate` adaptado, o relajar el patron para el caso clone). El `code` nuevo lo aporta el uniqueFields del modal → el check pasa. Los hijos de la malla no tienen code de linaje (scoped por ownerId, cambia al clon) → sin colision. | REQ-06 | developer | S4.T2 | mods/curriculum-design/logic/curriculum-create.resolver.js; mods/curriculum-design/logic/sectionValidation.resolver.js (extraer helper); mods/curriculum-design/logic/helpers/lineageUniqueness.js | vitest unit del mod (incluye caso: clon raiz con code duplicado → rechaza CURRICULUM_LINEAGE_DUPLICATE por el path base) | git revert | DET-5, DET-8, RULE-core-023, RULE-core-027 | pending | 4 |
| S4.T4 | Integration BD real: duplicar un Plan con malla → copia independiente (raiz nueva, code nuevo, version 1) con malla completa, cross-refs remapeados (0 refs al origen), RT base; origen intacto | REQ-06 | developer | S4.T3 | object-manager/tests/e2e/ (test nuevo del clone profundo) | vitest integration (BD real UPU) | git revert | DET-5, DET-7, DET-13 | pending | 4 |
| S4.T5 | Regresion: (a) versionado sigue OK; (b) clone shallow de AcademicProgram sigue OK (la capa 2 generica no lo rompe: sin deepClone = no-op); (c) otros `prefilledModal` sin deepClone intactos | REQ-06, REQ-07 | developer | S4.T3 | object-manager/tests/; layout/src/ | vitest (suite consolidada verde) | git revert | DET-7, DET-14 | pending | 4 |
| S4.T6 | Smoke runtime UPU (DET-36): "Duplicar" un Plan real por la UI → la malla de la copia renderiza colgando de sus categorias; origen intacto | REQ-06 | reviewer | S4.T4, S4.T5 | UPU (uplanner_upu) | manual (screenshot/DOM + query BD, marca de corrida) | (no aplica — verificacion) | DET-33, DET-36 | pending | 4 |
| S4.T7 | **Docs oficiales (DET-37 dim1)**: (a) `mods/curriculum-design/docs/patterns/clone-strategies.md` — "Duplicar" del Plan ahora es **deep** (arrastra la malla); tabla clon (raiz nueva, `code` nuevo) vs version (mantiene `code`); (b) `object-manager/docs/` (prefill/polymorphic-children) — capacidad "clone profundo via `prefillFrom.source` en la row action Duplicar" + arquitectura por capas (frontend generico + motor reuso + glue RT); (c) nota de unicidad de linaje en ruteo por base | REQ-06, REQ-07 | developer | S4.T4 | mods/curriculum-design/docs/patterns/clone-strategies.md; object-manager/docs/prefill-capability.md; object-manager/docs/polymorphic-children.md | manual (docs reflejan el contrato; sin refs stale) | git revert | DET-37, DET-16 | pending | 4 |
| S4.T8 | **KB DKC (DET-37 dim2)**: RULE nueva (o extender RULE-core-032) — "clone profundo por `prefillFrom.source` en `prefilledModal` es capacidad generica de plataforma; para objetos RecordType-typed ruteados por base hay que invocar la unicidad de dominio explicitamente (el guard por-patron solo cubre el alias RT)". Registrar DEC-LOCAL-04 en KB si aplica | REQ-06, REQ-07 | developer | S4.T4 | deckard: projects/up1/rules/{core,curriculum-design}/ | dkc-validate Rule | git revert | DET-37, DET-11, DET-16 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — dual-judge del core-touch de `layout/` (DET-35), regresion consolidada, smoke con evidencia, docs+KB al dia (DET-37), decidir continue/close-ready | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4, S4.T5, S4.T6, S4.T7, S4.T8 | tickets/TICKET-111.md | gate persistido + acceptance REQ-06/07 verde + smoke runtime + regresion + docs/KB | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35, DET-36, DET-37 | pending | 4 |

### Session 5 — Fixes pre-merge (post-review) [tipo: ⚑ fuerte] [tier: T2]

> **Origen**: ajustes surgidos del review de los cambios de 1450 (2026-07-23). NO agregan alcance funcional; cierran deuda pre-merge que el review re-confirmo. Ningun bloqueante nuevo: la feature esta entregada y verificada en runtime (matriz round-trip). **Pendiente de ejecucion.**

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | **RBAC server-side del clone (BL-7)**: enforzar `curriculum:clone` DENTRO de `cloneWithRecordType` (`checkCapability(context, ['curriculum:clone'])`), distinguiendo el contexto CLONE del VERSIONADO. **NO** en `prefillFrom.requiredCapability` (el versionado tambien pasa `prefillFrom.source` → quedaria gateado con `curriculum:clone`, rompiendo usuarios con solo `curriculum:version`). Resolver el import synced-vs-source de `authChecker`/`checkCapability` (patron `loadGenericInstanceMutation`) | BL-7 / review | developer | S4.GATE | mods/curriculum-design/logic/curriculum-create.resolver.js | vitest unit del mod (clone sin `curriculum:clone` → rechaza; versionado con solo `curriculum:version` → sigue OK; clone con `curriculum:clone` → procede) | git revert | DET-10, DET-33, RULE-core-033 | pending | 5 |
| S5.T2 | **Higiene DET-19 + null explicito `sourceEntryId`**: quitar ` / TICKET-111` (dejar `UPONE-1450`) en layout (RecordList.vue:2859, RecordDetail.vue:4095, recordDetailInitialData.ts:26, recordlist.ts:269) + mod (logic/helpers/recordTypeExtension.js:4, docs/patterns/clone-strategies.md:14) + copia synced (regenerable); quitar `RULE-core-019` (deep-clone-direct.js:41, deep-clone-polymorphic.js:78, instance.resolver.js:3828) y `DET-16` (useCreateRowAction.ts:41) de los comentarios. **+** agregar `sourceEntryId` a `prefillFrom.exclude` de `Curriculum.json` (null explicito, consistente con `CurricularSection.sourceId`) + codegen + sync. `DECISION-006` en dynamic.js:1844 es GENERADO → no editar | review DET-19 / DEC-LOCAL-02 | developer | — | layout/src/layouts/{RecordList.vue,RecordDetail.vue,recordDetailInitialData.ts}; layout/src/types/recordlist.ts; layout/src/composables/useCreateRowAction.ts; mods/curriculum-design/logic/helpers/recordTypeExtension.js; mods/curriculum-design/docs/patterns/clone-strategies.md; mods/curriculum-design/objects/Curriculum.json; object-manager/src/graphql/resolvers/helpers/{deep-clone-direct.js,deep-clone-polymorphic.js}; object-manager/src/graphql/resolvers/instance.resolver.js | grep 0 `TICKET-\d+`/`RULE-\w+-\d+`/`DET-\d+` en artefactos no-generados de los 3 repos + JSON valido + codegen | git revert | DET-19, DET-16 | pending | 5 |
| S5.T3 | **Tooling (L17)**: reinstalar `@vitejs/plugin-vue` en el mod para restaurar la carga del `vitest.config.ts` y correr la suite COMPLETA del mod (256/256), no el config minimo usado en S4 | L17 | developer | — | mods/curriculum-design (node_modules / package.json) | `npm test` del mod verde completo (256/256) | (no aplica — tooling ambiental) | DET-33 | pending | 5 |
| S5.T4 | **Cobertura end-to-end**: test de integracion contra BD real que recorra el `createInstance` COMPLETO (poly + direct + ambas fases derived, dentro del `$transaction`, resolviendo `deepClone` del registry) para un versionado Y un clon de Curriculum. Blinda el path que hoy solo cubren helpers directos + orquestacion mockeada + smoke manual | review (gap de cobertura) | developer | S5.T1 | object-manager/tests/e2e/ (test nuevo) | vitest integration (BD real UPU) | git revert | DET-7, DET-13, DET-33 | pending | 5 |
| S5.T5 | **Docs + KB (DET-37)**: (dim1 docs) documentar el enforcement server-side de `curriculum:clone` en `clone-strategies.md` + `prefill-capability.md` (el clone exige su propia capability, no solo `create`); (dim2 KB) cerrar BL-7 + actualizar RULE-core-033 con el corolario de enforcement RBAC en ruteo por base + registrar la aclaracion de `sourceEntryId` (campo del modelo LA sin consumidor, DEC-LOCAL-02) | DET-37 / BL-7 | developer | S5.T1 | mods/curriculum-design/docs/patterns/clone-strategies.md; object-manager/docs/prefill-capability.md; deckard: projects/up1/rules/core/ | manual (docs sin refs stale) + dkc-validate Rule | git revert | DET-37, DET-16, DET-19 | pending | 5 |
| S5.T6 | **Reemplazar el gate del mod (S5.T1) por enforcement en el MOTOR** (dual-judge iterate, DET-35): `prefillFrom.requiredCapability` condicionado a `!asNewVersion` en `instance.resolver.js` + `curriculum:clone` en `Curriculum.json.prefillFrom` (patron de los objetos solo-clonables) + revertir el gate del mod y sus tests RBAC. Cierra el bypass del `createInstance` generico confirmado por el dual-judge; enforcement unico y consistente entre objetos | dual-judge S5.GATE | developer | S5.T1 | object-manager/src/graphql/resolvers/instance.resolver.js; mods/curriculum-design/objects/Curriculum.json; mods/curriculum-design/logic/curriculum-create.resolver.js (revert); tests (motor + mod) | vitest (motor 99 + mod 15 + integration 2) + re-dual-judge | git revert | DET-35, DET-10, DET-16 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — dual-judge del cambio RBAC (DET-35), regresion consolidada (OM + mod + layout), verificacion independiente (DET-33), docs+KB al dia (DET-37), decidir continue/close-ready. Tras esto el ticket queda listo para el CLOSE (que SIEMPRE requiere OK del dev, DET-30) | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4, S5.T5, S5.T6 | tickets/TICKET-111.md | gate persistido + regresion verde + dual-judge RBAC + docs/KB | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35, DET-37 | pending | 5 |

### Task contract (detalle de las tasks de mayor riesgo)

```
Task S1.T1: Verificar RT base end-to-end (driver de SP)
- source_ref: REQ-02
- agent: researcher
- files: instance.resolver.js, version-from-source.js
- precondition: servidor UPU corriendo o entorno de test de integracion disponible; plan test con recordType Plan y campos temporales
- expected_output: veredicto documentado — ¿la v2 arrastra rt__Plan__curriculum via HU-10, o BUG-core-004 sigue vivo? + alcance del fix del RT base para S2
- validation: manual (crear plan test → versionar → inspeccionar create payload de prisma.curriculum.create y la fila v2 en BD)
- rollback: (no aplica — solo lectura/verificacion)
- rules: [DET-5, DET-33, DET-36]
```

```
Task S2.T2: Reader directChildrenDerived + llamada en fase DERIVED (core-touch)
- source_ref: REQ-04
- agent: developer
- files: helpers/deep-clone-direct.js (o helper espejo), instance.resolver.js
- precondition: S2.T1 (bloque declarado en Curriculum.json); alcance fijado en S1.GATE
- expected_output: fase DERIVED remapea planEntry.categoryId al id de la requirementCategory clonada (v2); path polimorfico existente intacto
- validation: vitest unit del motor de clone; verificar cloneMap extrae .newId (no string plano)
- rollback: git revert
- rules: [DET-5, DET-8, DET-16, RULE-core-023, RULE-core-027]
```

## Constraints

- RULE-core-023: deepClone de hijos por mecanismo de FK — el cloneMap mapea `oldId→{newId,type}`; extraer `.newId` es obligatorio al re-apuntar FKs internas. Aplica directo al remapeo de `planEntry.categoryId`.
- RULE-core-027: el motor de deep-copy en cascada ya existe y es config-driven — se DECLARA config, no se escribe codigo por-objeto. Aplica a `prefillFrom.deepClone`. Ojo: el padre con RecordType tiene el gap aparte (BUG-core-004).
- DEC-013: objetos core viven en el mod para desarrollo — `Curriculum.json` en `mods/curriculum-design/objects/` es la fuente que el sync propaga.
- DET-30 (execute_scope): SP6 acota a core (object-manager) + mod curriculum-design; otros mods read-only.
- Feedback memoria: sync canonico (codegen + sync + migrate), NO ALTER TABLE / db push manual. `layout/`, `suite/`, `object-manager/` son CORE — tocar con cuidado, flujo canonico.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Motor deep-clone core (`asNewVersion`, helpers, `applyDerivedRemap`) | internal | Base que se generaliza; ya atomico ($transaction Serializable) | Bajo — cambio aditivo; regresion de Activity cubierta en S3.T3 |
| Malla (planEntry/requirementCategory/requirement) MC-01..MC-09 | internal | Debe existir para que el deep-clone tenga hijos que arrastrar | Nulo — ya finalizada |
| Tenant UPU (uplanner_upu) con plan de prueba + malla | internal | Necesario para S1.T1 (runtime) y S3.T4 (smoke) | Medio — requiere data de prueba; se prepara en Setup |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| BUG-core-004 sigue vivo y el fix del RT base es mas grande de lo estimado (8→13) | medium | alto (mueve el SP) | S1 spike verifica end-to-end ANTES de codear; S1.GATE lockea el alcance |
| Cross-ref directo no remapeado (planEntry.categoryId → cat v1) | medium | alto (malla rota en v2) | `directChildrenDerived` + test e2e que verifica 0 refs a ids de v1 (S3.T2) |
| Tocar el motor core rompe el clone de Activity | low | alto (regresion silenciosa) | cambio aditivo (no toca path poly); regresion de Activity en S3.T3 |
| Unit mockeado pasa pero runtime falla (casing FK / proyeccion RT) | medium | medio | integration contra BD real (S3.T2) + smoke runtime UPU (S3.T4) |
| Editar el archivo JSON equivocado por colision de case | low | medio (cambio sin efecto tras sync) | S1.T2 confirma la fuente real antes de editar |

## Open questions

- [x] AQ1/BUG-core-004: ¿el path `asNewVersion` arrastra `rt__Plan__curriculum`? — **RESUELTO (S1.T1)**: NO por core, SI por el hook mod `inheritRecordTypeExtensionOnVersion` (UPONE-1270, mergeado) via el path real `createInstance`→override del mod. SP=8 confirmado; S2.T3 N/A.
- [x] AQ4: fuente real del objeto — **RESUELTO (S1.T2)**: `Curriculum.json` (PascalCase), unico tracked en git; no hay `curriculum.json` lowercase (artefacto de la ficha).
- [x] BL-1: `planEntry.sourceEntryId` al versionar — **RESUELTO (S1.T3)**: DEC-LOCAL-02, queda null (campo muerto hoy; lineage activo diferido a follow-up).
- [x] BL-2: ¿UPONE-1340 (version actual) entra a SP6? — **NO** (fuera de SP6, confirmado S1.GATE).

## Decisions

### DEC-LOCAL-01: Generalizar el motor core con `directChildrenDerived` (no hook de mod)
- **Contexto**: `planEntry.categoryId → requirementCategory` (ambos hijos directos) no se remapea; `applyDerivedRemap` solo se invoca desde `readPolymorphicChildrenDerived`.
- **Drivers**: el versionado completo debe ser capacidad de plataforma; `applyDerivedRemap` ya es agnostico poly/direct; precedente `polymorphicChildrenDerived` (HU-8b subio el hook al motor).
- **Opcion elegida**: agregar `directChildrenDerived` en core (reader + llamada), espejo de `polymorphicChildrenDerived`.
- **Alternativas**: hook en el mod — descartado (fragmenta la capacidad, no reusable, contradice el precedente).
- **Consecuencias**: gana capacidad de plataforma reusable; cuesta un core-touch (revisado con dual-judge en S2.GATE).
- **Session**: design (confirmada por dev 2026-07-21 en intake).

### DEC-LOCAL-02: `planEntry.sourceEntryId` NO se pobla al versionar (queda null) — BL-1
- **Contexto**: `planEntry.sourceEntryId` es una self-FK nullable declarada para "trazabilidad de clon". S1.T1 confirmo (grep) que HOY **nada la pobla** en ningun path de clon (0 setters en `mods/curriculum-design/logic` ni `object-manager/src`; solo aparece en `typeDefs/dynamic.js:836` generado). Campo declarado pero muerto.
- **Drivers**: (a) los sources actuales tienen `sourceEntryId = null` → al clonar via `deepCloneDirectChildren` (que copia campos verbatim salvo id/createdAt/updatedAt + exclude) la v2 nace con `null` → sin riesgo de cross-ref stale a la v1 en este ticket; (b) poblarla con lineage real (v2.sourceEntryId → planEntry origen de la v1) es feature nueva fuera del AC (REQ-01..05 no la mencionan); (c) BL-1 es priority `should`, no `must`.
- **Opcion elegida**: al versionar, `sourceEntryId` **queda null** (no se pobla, no se remapea). No requiere wiring nuevo.
- **Alternativas**: (1) poblar `sourceEntryId = oldEntryId` para lineage — descartado: feature nueva, fuera de AC, se difiere a follow-up; (2) agregar a `directChildrenDerived` para remapear a la entry v2 — descartado: contradice la semantica del campo ("de que entrada se copio" apunta al origen, no a un hermano de la v2).
- **Consecuencias**: v2 sin trazabilidad activa de clon (consistente con el comportamiento actual). Si a futuro se puebla `sourceEntryId` en algun path, revisar que el clone de version lo limpie/remapee para no arrastrar refs a la v1 (follow-up BL-1).
- **Session**: S1.T3 (execute, 2026-07-22).
- **Actualizacion (S5 planning, 2026-07-23)**: el review de 1450 reabrio el campo y se confirmo su origen en Confluence — "Modelo de objetos de negocio — Learning Assurance" (espacio uP1) lista `sourceEntryId` en la tabla de `planEntry` como metadata OPCIONAL prevista (`UUID? ❌ Trazabilidad de clonacion`), unica mencion en todo Confluence, **sin caso de uso ni flujo**. Cero consumidores en el monorepo (0 setters/readers/UI; solo schema + doc de referencia + label i18n). Decision **ratificada = null**. Refinamiento: S5.T2 lo vuelve null EXPLICITO agregandolo a `prefillFrom.exclude` de `Curriculum.json` (higiene, consistente con el precedente `CurricularSection.sourceId` que el mod tambien excluye). Activar el lineage de fila = feature nueva (requiere un tercer mecanismo en el motor de deep-clone para sellar un campo hijo con el `oldId` + un consumidor real) → historia futura (BL-9, candidato adyacente UPONE-1340).

### DEC-LOCAL-03: `directChildrenDerived` usa remap UPDATE-based (no reusa `applyDerivedRemap`)
- **Contexto**: el spec asumia que `applyDerivedRemap` (fase DERIVED polimorfica) era "reusable tal cual, agnostico poly/direct". S2.T2 descubrio que NO aplica al caso de `planEntry`: `applyDerivedRemap` hace **findMany(source) → create** (crea filas nuevas), porque sus "derived" polimorficos (ej. `CurricularLink`) NO se clonan como hijos primarios (no tienen FK-owner directa). En cambio `planEntry` SI es hijo directo primario: `deepCloneDirectChildren` ya lo clona y re-apunta su FK-owner (`planId`) a la v2. Reusar `applyDerivedRemap` **duplicaria** los planEntries.
- **Drivers**: el cross-ref a remapear (`planEntry.categoryId`) vive en una fila que YA existe (clonada como primaria); ademas `planId` (FK-owner) no es remapeable via cloneMap (el raiz no esta en el mapa), asi que `planEntry` DEBE ser primario. La operacion correcta es un **UPDATE** de la FK interna, no un create.
- **Opcion elegida**: nueva funcion `applyDirectChildrenDerivedRemap` (`deep-clone-direct.js`), espejo ESTRUCTURAL de `applyDerivedRemap` (mismo shape `{object, via, remapTo}`, mismo cloneMap, misma defensa null/cross-owner/type), pero UPDATE-based: recorre las filas ya clonadas (type === object en el cloneMap), lee cada una y actualiza sus `via` FK old→new. Reader `readDirectChildrenDerived` espejo de `readPolymorphicChildrenDerived`. Llamada en la fase DERIVED del resolver junto a la poly, reusando el mismo `merged` cloneMap. `applyDerivedRemap` (poly) queda intacta.
- **Alternativas descartadas**: (1) reusar `applyDerivedRemap` tal cual → duplica planEntries; (2) sacar `planEntry` de `directChildren` primarios y clonarlo solo en la fase derived via create → deja `planId` apuntando a la v1 (el raiz no esta en el cloneMap).
- **Consecuencias**: +1 funcion en core (aditiva, no toca el path poly). Regresion de `Activity`/poly intacta (35 unit + 97 del resolver verdes). Verificacion multi-capa: el cross-ref `categoryId` remapeado se prueba con integration real en S3.T2.
- **Session**: S2.T2 (execute, 2026-07-22).

### DEC-LOCAL-04: Ampliar 1450 al clone profundo del Plan (REQ-06/07) + arquitectura por capas
- **Contexto**: la definicion original de 1450 se acoto a "versionamiento", pero el diferido de UPONE-1270 era "el **clone profundo** del Plan" (generico). El versionado y el clonado son la misma capacidad (UPONE-1206: "versionamiento como caso particular de la clonacion"). 1450 entrego el versionado; la accion "Duplicar" quedo superficial (verificado runtime 2026-07-22: clon = 0 malla). Miss de definicion del ticket, corregido al detectarlo.
- **Drivers**: cierra el diferido completo de 1270 en un solo entregable cohesivo; 1450 sigue abierto (Developing en Jira); mismo objeto/motor/mod.
- **Opcion elegida**: **expandir 1450** (no ticket nuevo) con Session 4 (clone profundo de Curriculum), en 3 capas: (1) motor OM = reuso sin cambio; (2) frontend generico (`RecordList` handler manda `prefillFrom.source`) = capacidad de plataforma; (3) glue del alias RT = Curriculum-especifico (mod). AC de 1450 se amplia de "versionamiento" a "clone profundo del Plan (versionar Y duplicar)".
- **Alternativas descartadas**: (a) ticket nuevo linkeado — parte el diferido de 1270 en dos, menos cohesivo dado que 1450 sigue abierto; (b) fix Curriculum-only del frontend — desperdicia la reusabilidad (la capa 2 generica sirve a futuros objetos con solo config).
- **AcademicProgram**: NO entra. Su clone de entidad ya funciona (UPONE-1271); no tiene arbol propio que copiar (su unico hijo `curricula` no se clona por diseño). Si a futuro crece con hijos, hereda el clone profundo con **solo config** (capas 1+2 ya construidas), sin la capa 3 (es objeto base, sin peaje RT). Documentado en REQ-07.
- **Consecuencias**: SP sube (~8 → ~13); toca `layout/` (CORE, con cuidado, capa 2 generica); el ticket NO cierra hasta que el clone este verificado (integration + smoke) igual que el versionado. Reversibilidad: git revert por capa.
- **Session**: design de ampliacion (2026-07-22).

### DEC-LOCAL-05: El clone profundo por `prefillFrom.source` es OPT-IN por acción (`action.deepClone: true`), no ciego por `prefilledModal`
- **Contexto**: REQ-07 pedía que el handler genérico de `RecordList` mandara `prefillFrom.source` para "cualquier objeto con `cloneStrategy: prefilledModal`". El dual-judge de S4.GATE (ambos jueces) detectó que eso reactivaría el `prefillFrom.deepClone` declarado pero **dormido** de `CurricularSection` (`deepClone: ["children"]`, UPONE-1216): las row actions `duplicate-modality`/`duplicate-customsection` del syllabus (fuera del alcance de 1450, sin tests) pasarían de clon superficial a deep-clone recursivo del subárbol — cambio de comportamiento silencioso en producción.
- **Drivers**: no reactivar comportamiento fuera de alcance; mantener la capacidad genérica y reusable; control explícito y auditable de qué acción arrastra el grafo.
- **Opción elegida**: inyectar `prefillFrom.source` **solo** cuando la row action declara `deepClone: true` (nuevo flag opt-in en `RowAction`). `Curriculum.duplicate` lo declara; `CurricularSection`/`AcademicProgram` no → su "Duplicar" queda idéntico a antes de S4. Sigue siendo capacidad de plataforma (cualquier acción opta con el flag + el objeto declarando `prefillFrom.deepClone`).
- **Alternativas descartadas**: (a) inyección ciega (REQ-07 literal) — reactiva CurricularSection, fuera de alcance/sin tests; (b) acotar por objectType hardcodeado en el frontend — menos reusable y frágil.
- **Consecuencias**: refina REQ-07 (de "cualquier objeto" a "cualquier acción que opte in"). Zero cambio de comportamiento para AcademicProgram/CurricularSection. `confirmCascade: true` añadido a `Curriculum.duplicate` (el deep-clone crea muchos registros).
- **Session**: S4.GATE (dual-judge, 2026-07-23).

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Malla replicada al versionar un plan | 0% (v2 nace vacia) | 100% de planEntry + categorias + requisitos + secciones | conteo en v2 vs v1 (test e2e S3.T2) |
| Cross-refs correctos en la v2 | roto (apuntan a v1) | 0 refs a ids de la v1 | query de integridad post-clone |

## Technical reference

- `instance.resolver.js:3724-3726` — `asNewVersion` en `$transaction` Serializable (atomicidad).
- `instance.resolver.js:3768-3808` — split polyAliases/directAliases → `deepClonePolymorphicChildren` / `deepCloneDirectChildren`.
- `instance.resolver.js:3810-3829` — fase DERIVED (hoy solo `readPolymorphicChildrenDerived` en `:3816`). Aqui entra la llamada nueva.
- `instance.resolver.js:3106-3129` — HU-10: `prefillFrom.source` mergea base+RT+ext del source (mecanismo del RT base).
- `deep-clone-polymorphic.js:108` — `applyDerivedRemap` (agnostico poly/direct, reusable).
- `deep-clone-direct.js` — walk via `findMany({ [fk]: sourceId })`.
- `Curriculum.json` — `polymorphicChildren:[sections,requirements]`, `directChildren:[planEntries fk planId, requirementCategories fk curriculumId]`, `prefillFrom:{exclude:[...]}` (falta `deepClone`), `versionableFromStates:["Approved","Active"]`.

## Rules discovered

- **RULE-core-033** (S4): el clone profundo por `prefillFrom.source` en `prefilledModal` es capacidad generica de plataforma (frontend `layout` inyecta el source; motor dispara solo con `deepClone` declarado). Objetos RecordType-typed ruteados por base deben invocar la unicidad de dominio explicitamente + copiar la extension RT. Corolario: gate del `$transaction` extendido a clone-con-hijos.
- RULE-core-032 (S3): `directChildrenDerived` UPDATE-based para cross-refs entre hijos directos.

## Bugs found

- BUG-core-004: versionar Curriculum no arrastra `rt__Plan__curriculum` en el path base de core. **S1.T1: resuelto a nivel MOD** por el hook `inheritRecordTypeExtensionOnVersion` (UPONE-1270, mergeado), no en core. El gap de core sigue existiendo (versionado base no arrastra la extension RT del raiz) pero esta cubierto funcionalmente por el hook mod para Curriculum. Actualizar BUG-core-004 en KB (S3.T6): estado → mitigado-en-mod (no core), con caveat de atomicidad (hook fuera del `$transaction`).
- BUG latente (L5): `deepCloneDirectChildren` no llama `cloneChildProjections` para hijos directos clonados. Inerte hoy (planEntry/requirementCategory sin recordType). → backlog `could`.

## Acceptance checkpoints

- [x] **Funcional**: REQ-01 (datos generales, deepClone), REQ-02 (RT base via hook mod, S1.T1), REQ-03 (secciones, poly deepClone), REQ-04 (malla remapeada — integration S3.T2), REQ-05 (gate estado, regresion S3.T3). Todos con evidencia.
- [x] **Tests**: integration contra BD real (S3.T2, clone-plan-mesh-derived: categoryId→v2, 0 refs a v1) + regresion gate estado y Activity (S3.T3) verdes. Suite consolidada 146/146.
- [x] **Runtime**: smoke UPU **smoke-executed** (DET-36, S3.T4) — versionado real por UI (row action "Nueva versión" sobre UV-ICIV-PLAN-2026 Active) → v2 `cmrwdc4xg…`: 6 planEntries + 4 cats, 0 refs a cats v1 / 6 a cats v2, RT base Sequential/240; malla v2 renderizada. (Requirió el sync del dev que completó el retiro de Workflow.)
- [x] **Rules**: RULE-core-023 (`.newId`), RULE-core-027 (config-driven) respetadas + RULE-core-032 nueva (directChildrenDerived).
- [x] **Integration**: clone de `Activity` no rota (regresion S3.T3, clone-activity-polymorphic e2e verde).
- [x] **Core-touch**: dual-judge del cambio core (S2.GATE) — 1 finding (N+1) confirmado y resuelto; sin warnings bloqueantes restantes.
- [x] **Docs oficiales (DET-37 dim1)**: `directChildrenDerived` documentado en object-manager/docs/polymorphic-children.md + receta en mods/curriculum-design/docs/patterns/clone-strategies.md (S3.T5).
- [x] **KB DKC (DET-37 dim2)**: RULE-core-032 creada; BUG-core-004 → fixed (S3.T6).
- [x] **Tests verdes (DET-37 dim4)**: integration + regresion + unit corridas y en verde (146/146 consolidado).

### Clone profundo (S4 — REQ-06/07, ejecutado 2026-07-23)
- [x] **Funcional REQ-06**: "Duplicar" un Plan crea raiz nueva (code nuevo, version propia, previousVersionId null) con malla completa + cross-refs remapeados a la copia + RT base; origen intacto. Probado contra Postgres real (S4.T4 `clone-plan-deep-root` 2/2).
- [x] **REQ-07 (capas)**: capa 2 (frontend generico) en `RecordList` handler + allowlist + carry customEndpoint (reusable); capa 3 (glue RT + unicidad) acotada al mod; motor reuso + gate `$transaction` extendido (aditivo).
- [x] **Unicidad de linaje en ruteo por base** (S4.T3): `cloneWithRecordType` invoca `assertUniqueLineageRoot` explicito; unit de rechazo por code duplicado por el path base (verde).
- [x] **Tests (DET-37 dim4)**: unit (curriculumCreate 15 incl. 4 clone + recordDetailInitialData 6) + integration BD real (S4.T4, 2/2) + regresion consolidada verde (OM 11 e2e + 106 unit; mod 256; layout 25).
- [x] **Runtime (DET-36)**: smoke UI **smoke-executed** (2026-07-23, tras desplegar S4 + `npm install`). Path real: "Clonar" UV-ICIV-PLAN-2026 v1 -> code nuevo -> clon `UV-ICIV-PLAN-SMOKE1450`: v1/previousVersionId null, 4 cats + 6 planEntries, RT Sequential/240, categoryId 6->clon/0->source; SRC intacto; round-trip cascade 0 residuo. BL-6 resuelto.
- [x] **Docs (DET-37 dim1)**: clone-strategies.md (Duplicar deep, clon vs version, gotcha) + object-manager/docs/prefill-capability.md (capacidad + capas + atomicidad) (S4.T7).
- [x] **KB (DET-37 dim2)**: RULE-core-033 (clone-deep generico + gotcha unicidad en ruteo por base), validada (S4.T8).
- [ ] **Core-touch (DET-35)**: dual-judge del cambio en `layout/` + core `$transaction` — pendiente S4.GATE.

## Archiving

Cuando el versionado profundo del plan quede entregado y estable, y esta spec deje de ser fuente de verdad, archivar con `/dkc-archive-spec SPEC-curriculum-design-plan-version-deep-clone "razon"`. NO borrar manualmente.
