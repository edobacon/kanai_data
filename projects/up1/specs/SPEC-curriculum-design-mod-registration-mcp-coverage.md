---
id: SPEC-curriculum-design-mod-registration-mcp-coverage
project: up1
ticket: TICKET-084
status: done
---

# Malla — Registro del mod + cobertura MCP de los 3 objetos

# Malla — Registro del mod + cobertura MCP de los 3 objetos

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: tomar los 3 objetos de malla que MC-02/03 ya crearon (`planEntry`, `requirementCategory`, `requirement`) y hacerlos **operables** en dos frentes que viven en repos distintos. (1) En el mod `curriculum-design`: registrar permisos CRUD object-level en `capabilities.json` (hoy ausentes), reconciliar layouts y verificar lang. (2) En el adaptador `up1-mcp` (repo standalone): declarar 3 `ObjectContract` + ampliar el allowlist + extender el resolver de FK para el `ownerId` polimórfico de `requirement`, de modo que `describe_object`/`get_create_guide` auto-deriven y `create_object`/`query_records` apliquen validaciones espejo. Cierra la "Épica A" (objetos operables UI + MCP). Las tools `cd_*` de dominio ergonómicas → SP6.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El `ownerId` polimórfico de `requirement` (REQ-05) se resuelve por nombre **extendiendo el resolver config-driven** (un `FieldDoc` con `polymorphicFkFrom: "ownerType"`), NO dejándolo como convención documentada | REQ-05 está `confirmed` y pide explícitamente resolución por nombre condicional a `ownerType`. Es el ÚNICO código no-declarativo del ticket (~20 líneas). **Supersede** la postura "doc convención" que MC-03 tomó para su propio scope (allí no había consumidor; aquí el MCP lo exige) |
| 2 | Layouts (REQ-01): se **honran las decisiones no-menú de MC-02/03** — NO se agregan `_list` para los 3 objetos | DET-16: MC-02 decidió `planEntry` se crea vía la malla (sin menú); MC-03 decidió `requirement` no-menú. "RecordList/RecordDetail" del pre-spec es genérico, no literal. Re-introducir `_list` contradiría tickets cerrados. La visibilidad en object-manager es schema-driven, no requiere `_list` |
| 3 | `requirement` (3 RecordTypes) se expone con **UN solo `ObjectContract` base** con `recordType` como enum, no un contrato por RT | Precedente `CURRICULUM_CONTRACT` (un contrato, `recordType` enum {Plan,Minor}). `getContract` resuelve por `objectType`. Los campos por-RT se documentan en `fieldDocs`; el create genérico enforza por schema del core |
| 4 | La validación espejo `minCredits ≤ maxCredits` (REQ-04, TC-03) se implementa con un **flag booleano `validateCreditRange`** en el contrato + función en `validations.ts`, replicando el patrón de `validateWeights` | El contrato ya tiene el patrón "flag → función de validación" (`validateWeights`). Reusar ese mecanismo evita inventar un DSL de validación genérico. Mínima superficie nueva |

**Riesgos principales y como los mitigamos**:

- **La extensión del resolver polimórfico podría no encajar con el flujo genérico** → S2.T2 la implementa config-driven (mapa `ownerType→objectType`), con unit test (TC-04) sobre un mock de `ListGetApi`. Si resulta invasiva, fallback a "convención documentada" (REQ-05 baja a SHOULD) — decisión #1 lo deja explícito.
- **Agregar contratos rompe `test/contracts.test.ts`** (afirma forma de los contratos existentes) → S2.T3 solo AGREGA tests; los 6 contratos previos no se tocan (registry idempotente + guard de colisión).
- **El smoke vivo (TC-01) es DB-gated** (OM corriendo + sync + re-OTP del MCP) → S3 se difiere al dev como en MC-02/03; TC-02..05 son auto (vitest, mockables) y NO dependen de DB.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Tools `cd_*` de dominio ergonómicas para los 3 objetos (el CRUD genérico ya cubre las operaciones) → SP6.
- Crear/modificar los objetos (los crearon MC-02/03): este ticket solo los registra y expone.
- Agregar layouts `_list` (decisión #2, honra MC-02/03).
- Motor de evaluación del árbol de `requirement` (eso es SP6).
- Commit de artefactos generados por sync/seed (solo source del mod + source del MCP — RULE-curriculum-design-013).

**Tamano estimado**: 3 sessions (~5 SP). S1 (registro del mod: capabilities + layouts + lang) T2 auto. S2 (MCP: 3 contratos + allowlist + resolver polimórfico + validación espejo + tests) T3 ⚑ fuerte — **la más riesgosa** (único código real). S3 (smoke vivo) T3 ⚑ fuerte, DB-gated → probablemente diferido al dev. Cross-repo: S1 en `mods/curriculum-design`, S2 en `uplanner/mcp`.

**Como vas a saber que funciona**:

- En object-manager, los 3 objetos aparecen y se puede crear un `planEntry` vía el GraphQL del mod (TC-01).
- `describe_object("requirement")` devuelve los enums (recordType, effect, ownerType…) y las FK sin receta a mano (TC-02).
- Crear un `requirementCategory` con `minCredits > maxCredits` es rechazado por la validación espejo (TC-03).
- Crear un `requirement` con `ownerType=activity` y `ownerId="EST200"` (nombre) resuelve al id real de la Activity (TC-04).
- Intentar `create_object` sobre un objeto que NO está en el allowlist es rechazado (TC-05).

---

## Purpose

Hacer operables los 3 objetos de malla (`planEntry`, `requirementCategory`, `requirement`) creados por MC-02/03, en dos frentes: el mod `curriculum-design` (registro RBAC CRUD + layouts + lang, para la UI vía GraphQL nativo) y el adaptador `up1-mcp` (allowlist + `ObjectContract` declarativos + resolución de FK incl. polimórfica, para la vía conversacional/programática vía Elric). Para el diseñador curricular (UI) y el usuario de Elric (conversacional). Cierra la Épica A del sprint (objetos operables UI + MCP) y habilita el componente de malla (MC-05/06) y las tools de dominio ergonómicas (SP6).

## Requirements

### REQ-01: registro en config del mod (capabilities + layouts + lang)

> **Que cambia**: los 3 objetos pasan a tener permisos CRUD propios en el mod (hoy no los tienen), con sus layouts y traducciones verificados; el diseñador puede ver/crear/editar/borrar según su rol.
> **Por que**: sin entradas en `capabilities.json` el RBAC object-level no existe para estos objetos y la UI no puede gobernar el acceso; es el último paso para que el modelo sea usable en la suite.

El sistema MUST agregar a `capabilities.json` las capabilities object-level (sin prefijo `mod/`, patrón RULE-mods-037) para los 3 objetos: `planentry:{view,create,modify,delete}`, `requirementcategory:{view,create,modify,delete}`, `requirement:{view,create,modify,delete}`. El guard de borrado de `requirementCategory` YA existe (`logic/requirementCategoryDelete.resolver.js`, MC-02) — no se recrea. El sistema MUST verificar que los layouts existentes satisfacen el rol UX de cada objeto **honrando las decisiones no-menú de MC-02/03** (decisión #2: sin `_list` nuevos) y que el lang `es_CL` de los 3 objetos está completo (labels + enums).

**Actor**: diseñador curricular (admin); system (RBAC)
**Layers**: config (capabilities, layouts), i18n (lang)

<details><summary>Scenarios de validacion</summary>

#### Scenario: capability presente
- **GIVEN** `capabilities.json` actualizado
- **WHEN** se inspecciona el manifiesto
- **THEN** existen las 12 entradas object-level (4 × 3 objetos) con riskLevel apropiado

#### Scenario: sin re-introducir menú
- **GIVEN** las decisiones no-menú de MC-02/03
- **WHEN** se revisan los layouts
- **THEN** NO hay `_list` nuevos para planEntry/requirementCategory/requirement; lang completo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el RBAC del mod reconoce permisos CRUD para los 3 objetos y la suite del mod sigue verde.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | capabilities + layouts + lang | mod | inspección + suite | 12 capabilities, sin `_list` nuevo, lang completo, suite verde | inspección + vitest del mod |

### REQ-02: objetos consumibles por el componente (smoke real)

> **Que cambia**: los 3 objetos no solo compilan — se pueden crear y leer de verdad vía el GraphQL del mod, y se ven en object-manager.
> **Por que**: el componente de malla (MC-05/06) los consumirá por GraphQL; un smoke real (no solo build) confirma que el registro funciona end-to-end.

El sistema MUST verificar empíricamente (smoke real, no solo build) que los 3 objetos son visibles en object-manager y consumibles vía el GraphQL nativo del mod: crear un `planEntry` vía mutación GraphQL y verlo persistido/listado. (DB-gated: requiere OM corriendo + sync; se difiere al dev como en MC-02/03.)

**Actor**: diseñador curricular (admin); system (suite)
**Layers**: backend (GraphQL del mod), frontend (object-manager)

<details><summary>Scenarios de validacion</summary>

#### Scenario: create vía GraphQL
- **GIVEN** el mod registrado y sincronizado en UPU
- **WHEN** se crea un `planEntry` vía mutación GraphQL del mod
- **THEN** se persiste y es visible en object-manager

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea un `planEntry` por GraphQL y lo ve en object-manager.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | smoke create planEntry | mod sincronizado | mutación GraphQL | creado + visible | TC-01 |

### REQ-03: allowlist + ObjectContract en el MCP

> **Que cambia**: los 3 objetos quedan expuestos al MCP — entran al allowlist y obtienen un contrato declarativo; un objeto fuera del allowlist sigue rechazado.
> **Por que**: sin estar en el allowlist el CRUD genérico se rehúsa a tocarlos; sin contrato, el MCP no sabe sus enums/FK/validaciones. Es la puerta de entrada de Elric a estos objetos.

El sistema MUST declarar 3 `ObjectContract` en `src/contracts/registry.ts` (`PLAN_ENTRY_CONTRACT`, `REQUIREMENT_CATEGORY_CONTRACT`, `REQUIREMENT_CONTRACT`) con `requiredOnCreate`, `enums` + `enumLabels`, `fieldDocs` (FK con `fk`/`resolveBy`), y validaciones espejo (`validateCreditRange` para requirementCategory — decisión #4); agregarlos a `ALL_CONTRACTS` y a `curriculumDesignPack.contracts`; y ampliar `curriculumDesignPack.objects` (allowlist) con los 3 `objectType`. `requirement` se expone con UN contrato base (`recordType` enum — decisión #3). El CRUD genérico MUST rehusarse sobre un objeto NO en el allowlist.

**Actor**: usuario de Elric; system (MCP)
**Layers**: backend (MCP: registry, mod pack)

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto en allowlist
- **GIVEN** los 3 contratos + allowlist actualizados
- **WHEN** `allowedObjectTypes()` se evalúa
- **THEN** incluye planEntry, requirementCategory, requirement

#### Scenario: objeto fuera del allowlist
- **GIVEN** un objectType no expuesto
- **WHEN** `create_object` se invoca sobre él
- **THEN** es rechazado (no expuesto)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los 3 objetos son operables por el MCP; uno no expuesto es rechazado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | allowlist gatea | contratos + allowlist | create_object objeto no-allowlist | rechazado | TC-05 |

### REQ-04: `describe_object`/`get_create_guide` auto-derivan + validaciones espejo

> **Que cambia**: con solo declarar el contrato, el MCP describe cada objeto (enums + FKs) y aplica validaciones espejo del dominio, sin recetas escritas a mano.
> **Por que**: es la promesa del registry config-driven; recetas manuales se desincronizarían del modelo real.

El sistema MUST hacer que `describe_object` y `get_create_guide` deriven su salida del contrato (enums, FKs, guía) para los 3 objetos sin recetas hardcoded; y que `create_object` aplique las validaciones espejo declaradas — en particular `minCredits ≤ maxCredits` para `requirementCategory` (flag `validateCreditRange`, decisión #4, espejo de la validación de dominio del mod) rechazando `minCredits > maxCredits`.

**Actor**: usuario de Elric; system (MCP)
**Layers**: backend (MCP: guide, validations)

<details><summary>Scenarios de validacion</summary>

#### Scenario: describe deriva
- **GIVEN** el contrato de requirement
- **WHEN** `describe_object("requirement")`
- **THEN** devuelve los enums (recordType, effect, ownerType…) + las FK

#### Scenario: validación espejo min>max
- **GIVEN** el contrato de requirementCategory con `validateCreditRange`
- **WHEN** `create_object` con `minCredits=10, maxCredits=5`
- **THEN** es rechazado (min ≤ max)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `describe_object` lista enums/FK de cada objeto; crear una categoría con min>max es rechazado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | describe deriva | contrato requirement | describe_object | enums + FKs | TC-02 |
| 2 | min>max rechazado | contrato requirementCategory | create min>max | rechazado | TC-03 |

### REQ-05: resolución de FK por nombre/código (incl. polimórfica)

> **Que cambia**: las FK de los 3 objetos se pueden escribir por nombre/código en vez de id — incluido el `ownerId` polimórfico de `requirement`, que resuelve contra el objeto correcto según `ownerType`.
> **Por que**: Elric habla en lenguaje de negocio ("la Activity EST200"), no en ids; la FK polimórfica es el caso que el resolver actual no cubre y el que da el salto de ergonomía.

El sistema MUST resolver las FK estáticas de los 3 objetos por nombre/código vía el mecanismo config-driven existente (`fieldDocs[f].fk` + `resolveBy`): `planEntry.planId→Curriculum`, `activityId→Activity`, `categoryId→requirementCategory`, `requirementCategory.curriculumId→Curriculum`, `requirement.parentId→requirement`. El sistema MUST extender el resolver para soportar FK **polimórfica**: `requirement.ownerId` se resuelve contra el `objectType` derivado de `ownerType` (`curriculum→Curriculum`, `activity→Activity`, `offering→Offering`) mediante un `FieldDoc` con `polymorphicFkFrom: "ownerType"` + mapa (decisión #1).

**Actor**: usuario de Elric; system (MCP)
**Layers**: backend (MCP: resolve-inputs, registry)

<details><summary>Scenarios de validacion</summary>

#### Scenario: FK estática por nombre
- **GIVEN** el contrato de planEntry
- **WHEN** `create_object` con `planId="<nombre del currículo>"`
- **THEN** resuelve al id del Curriculum

#### Scenario: FK polimórfica por nombre
- **GIVEN** el contrato de requirement con `ownerId` polimórfico
- **WHEN** `create_object` con `ownerType="activity"`, `ownerId="EST200"`
- **THEN** resuelve al id real de la Activity EST200

#### Scenario: polimórfica condicional
- **GIVEN** el mismo contrato
- **WHEN** `ownerType="curriculum"`, `ownerId="<nombre del plan>"`
- **THEN** resuelve contra Curriculum (no Activity)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: puede crear un requirement diciendo "owner: activity EST200" y el MCP resuelve el id correcto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | FK polimórfica activity | contrato requirement | resolver ownerType=activity ownerId=EST200 | id real Activity | TC-04 |

## Artifacts

### Mod — capabilities (REQ-01)

**`capabilities.json`** — agregar 12 entradas object-level (patrón RULE-mods-037, sin prefijo `mod/`):

| Capability | riskLevel | Nota |
|------------|-----------|------|
| `planentry:view` | low | listar/ver entradas de plan |
| `planentry:create` | medium | crear (también vía malla MC-05/06) |
| `planentry:modify` | medium | editar |
| `planentry:delete` | high | borrar |
| `requirementcategory:view` | low | — |
| `requirementcategory:create` | medium | — |
| `requirementcategory:modify` | medium | — |
| `requirementcategory:delete` | high | guard de dominio ya existe (`requirementCategoryDelete.resolver.js`) |
| `requirement:view` | low | — |
| `requirement:create` | medium | — |
| `requirement:modify` | medium | — |
| `requirement:delete` | high | — |

### Mod — layouts (REQ-01, reconciliación — sin build)

| Estado actual | Decisión |
|---------------|----------|
| `planEntry`: solo `_view` | OK — se crea vía malla (MC-02), sin menú; no agregar `_list`/`_create`/`_edit` |
| `requirementCategory`: `_create/_edit/_view` | OK — completo; no agregar `_list` |
| `requirement` (3 RT): 9 layouts RecordDetail | OK — no-menú (MC-03); no agregar `_list` |

> Verdict DET-32: **reduce** (los layouts existen; MC-04 reconcilia y verifica, no construye). DEC-LOCAL-02.

### Mod — lang (REQ-01, verificación)

`lang/es_CL@planEntry.json`, `lang/es_CL@requirementCategory.json`, `lang/es_CL@requirement.json` + 3 × `rt__*__requirement` — verificar cobertura completa (labels + enums). Verdict DET-32: **reuse** (completos por MC-02/03).

### MCP — ObjectContract (REQ-03,04,05) — declarativos en `src/contracts/registry.ts`

**`PLAN_ENTRY_CONTRACT`** (objectType `planEntry`):

| Campo | En contrato |
|-------|-------------|
| `requiredOnCreate` | `[planId, activityId, kind, period]` |
| `enums.kind` | `[Course, Internship, Thesis]` (+ enumLabels es_CL) |
| `fieldDocs.planId` | fk `Curriculum` |
| `fieldDocs.activityId` | fk `Activity` |
| `fieldDocs.categoryId` | fk `requirementCategory` (opcional) |
| `fieldDocs.sourceEntryId` | fk `planEntry` (self, opcional) |
| escalares | period (int), position, credits, blockId |

**`REQUIREMENT_CATEGORY_CONTRACT`** (objectType `requirementCategory`):

| Campo | En contrato |
|-------|-------------|
| `requiredOnCreate` | `[curriculumId, name, minCredits]` |
| `fieldDocs.curriculumId` | fk `Curriculum` |
| `validateCreditRange` | `true` (espejo min ≤ max — decisión #4) |
| escalares | code, maxCredits, position, description, color, icon |

**`REQUIREMENT_CONTRACT`** (objectType `requirement`, UN contrato base — decisión #3):

| Campo | En contrato |
|-------|-------------|
| `requiredOnCreate` | `[ownerType, ownerId, recordType, effect, label]` |
| `enums.ownerType` | `[curriculum, activity, offering]` |
| `enums.recordType` | `[Group, RecordState, MetricThreshold]` |
| `enums.effect` | `[EligibilityToEnroll, ProgressGate, Completion, DiplomaAward]` |
| `enums` por-RT (doc en fieldDocs) | `combinator [AND,OR]`, `mustBe [Approved,Taken]`, `timing [Before,Concurrent,Either]`, `operator [Gte,Gt,Eq,Lt,Lte]`, `metric [Credits]`, `targetType [activity]`, `scope [plan,category]` |
| `fieldDocs.parentId` | fk `requirement` (self, opcional) |
| `fieldDocs.ownerId` | **polimórfico**: `polymorphicFkFrom: "ownerType"` + mapa `{curriculum:Curriculum, activity:Activity, offering:Offering}` (decisión #1) |

Los 3 se agregan a `ALL_CONTRACTS` (registry.ts) y se importan en `src/mods/curriculum-design/index.ts` (`curriculumDesignPack.contracts` + `.objects`).

### MCP — extensión del resolver (REQ-05) + validación espejo (REQ-04)

| File | Cambio | source_ref |
|------|--------|------------|
| `src/contracts/registry.ts` | `FieldDoc` gana `polymorphicFkFrom?: string` + `polymorphicFkMap?: Record<string,string>`; `ObjectContract` gana `validateCreditRange?: boolean` | REQ-04,05 |
| `src/contracts/resolve-inputs.ts` | en `resolveContractInputs`, si un `FieldDoc` declara `polymorphicFkFrom`, resolver el target `objectType` desde el valor (ya canónico) del campo fuente y delegar a `resolveReference` con ese target | REQ-05 |
| `src/contracts/validations.ts` | función `validateCreditRange(data)` (rechaza `minCredits > maxCredits` cuando ambos presentes), espejo de la validación de dominio del mod (MC-02) | REQ-04 |

### MCP — tests de contrato (TC-02..05)

| File | Cubre |
|------|-------|
| `test/contracts.test.ts` (extender) | TC-02 (describe deriva enums+FK de requirement), TC-03 (validateCreditRange rechaza min>max), TC-04 (resolución polimórfica ownerId con mock de ListGetApi), TC-05 (allowlist rechaza objeto no expuesto) |

## Tasks

### Session 1 — Registro del mod: capabilities + layouts + lang [tipo: auto] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar a `capabilities.json` las 12 capabilities object-level (`planentry:{view,create,modify,delete}`, `requirementcategory:{...}`, `requirement:{...}`), patrón RULE-mods-037 (sin prefijo `mod/`), con riskLevel (view=low, create/modify=medium, delete=high) + description en es_CL. NO recrear el guard de borrado (ya existe en `logic/requirementCategoryDelete.resolver.js`) | REQ-01 | developer | — | `capabilities.json` | JSON.parse + suite del mod (vitest) | revertir entradas (git revert) | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Reconciliar layouts (verificar que los existentes cubren el rol UX; **NO agregar `_list`** — honrar no-menú MC-02/03, DEC-LOCAL-02) + verificar cobertura lang es_CL completa (labels + enums) de los 3 objetos. Documentar el verdict reduce/reuse | REQ-01 | developer | — | `config/layouts/` (verificación), `lang/es_CL@*.json` (verificación) | `layouts-declared.test.ts` + lang JSON.parse | n/a (verificación; revertir si se tocara algo) | DET-4, DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` (Template de Gate), quality review aislado (DET-30/35), validación T2 (suite del mod), consolidar TC con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decisión + suite verde | (no aplica) | DET-20, DET-23, DET-30, DET-35 | done | 1 |

### Session 2 — Cobertura MCP: contratos + allowlist + resolver polimórfico + validación espejo + tests [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Declarar 3 `ObjectContract` (`PLAN_ENTRY_CONTRACT`, `REQUIREMENT_CATEGORY_CONTRACT`, `REQUIREMENT_CONTRACT` — base con recordType enum, decisión #3) en `registry.ts` con requiredOnCreate, enums + enumLabels, fieldDocs (FK estáticas con `fk`/`resolveBy`). Agregar a `ALL_CONTRACTS`. Importar + sumar a `curriculumDesignPack.contracts` + `.objects` (allowlist) en el pack | REQ-03, REQ-04 | developer | — | `src/contracts/registry.ts`, `src/mods/curriculum-design/index.ts` | `npm run build` (tsc) + `getContract`/`allowedObjectTypes` | quitar contratos + entradas del pack (git revert) | DET-1, DET-2, DET-8, DET-16 | done | 2 |
| S2.T2 | Extender la capa de resolución/validación: (a) `FieldDoc.polymorphicFkFrom` + `polymorphicFkMap` y rama en `resolveContractInputs` que resuelve el target desde `ownerType` (decisión #1); declarar `requirement.ownerId` con ello. (b) `validateCreditRange(data)` en `validations.ts` + flag en el contrato de requirementCategory (decisión #4); cablearla en el path de create genérico donde corre `validateWeights` | REQ-05, REQ-04 | developer | S2.T1 | `src/contracts/registry.ts` (interfaces), `src/contracts/resolve-inputs.ts`, `src/contracts/validations.ts` | `npm run build` + unit (cubierto en T3) | quitar la rama polimórfica + la validación (git revert) | DET-5, DET-8, DET-11, DET-16 | done | 2 |
| S2.T3 | Tests de contrato en `test/contracts.test.ts` (solo AGREGAR): TC-02 (describe_object deriva enums+FK de requirement), TC-03 (validateCreditRange rechaza min>max), TC-04 (resolución polimórfica ownerId con mock de `ListGetApi`), TC-05 (allowlist rechaza objeto no expuesto). Regression: los 6 contratos previos sin afectar | REQ-03, REQ-04, REQ-05 | developer | S2.T2 | `test/contracts.test.ts` | `npm test` (vitest del MCP) | quitar tests nuevos (git revert) | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3, ⚑ fuerte)** — persistir, quality review con loop dual-judge aislado (DET-30/35 — toca código real: resolver + validación), validación T3 (build + vitest del MCP), consolidar TC-02..05 con evidencia, decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + dual-judge + TCs con evidencia | (no aplica) | DET-13, DET-14, DET-20, DET-23, DET-30, DET-35 | done | 2 |

### Session 3 — Smoke real (REQ-02) [tipo: ⚑ fuerte] [tier: T3] (DB-gated)

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Smoke real (DB-gated): (a) crear un `planEntry` vía mutación GraphQL del mod y verlo en object-manager (TC-01); (b) MCP en vivo (build + re-OTP): `describe_object("requirement")` deriva enums+FK, `create_object` con `ownerId` polimórfico por nombre resuelve. Requiere OM + sync + MCP server | REQ-02 | developer | S2.GATE | (smoke runtime — sin archivos nuevos) | TC-01 smoke (DB-gated; diferido al dev como MC-02/03) | n/a | DET-5, DET-13 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3, ⚑ fuerte)** — persistir, consolidar TC-01 + smoke MCP en vivo con evidencia (o marcar DB-gated diferido al dev con racional), propagación DET-16 (MC-05/06, SP6 cd_*), decidir continue/standby | — | reviewer | S3.T1 | ticket | gate persistido + smoke/diferido + propagación | (no aplica) | DET-13, DET-16, DET-20, DET-23 | done | 3 |

## Constraints

- RULE-dev-004: trabajo de épica va en rama `UPONE-1267-sp5` (mod) / `UPONE-1267-sp5` (mcp, repo standalone desde `main`); commits con id externo `UPONE-1347`; nunca `develop`/`main`.
- RULE-mcp-015: acoplamiento mod→MCP — todo objeto desarrollado en el mod se cubre en el MCP en el mismo sprint (backlog must del módulo up1-mcp). Este ticket lo cumple.
- RULE-curriculum-design-013: mod-only para el registro; no commitear artefactos de sync/seed (Base, schema, typeDefs, lang sincronizado al core). En el MCP se commitea el source (contratos, resolver, tests).
- RULE-mods-037: capabilities object-level sin prefijo `mod/` (`<objeto>:<acción>`).
- RULE-dev-009 (kb_ref del ticket): convención del mod.
- CONSTRAINT (registry MCP): `registerContract` es idempotente y tiene guard de colisión por clave `objectType[:recordType]`; agregar contratos no afecta los 6 existentes.
- DEC-037 (kb_ref): objeto MCP-ready (enums + FK refs + labels) — entregado por MC-02/03.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-082 (MC-02) | internal | planEntry + requirementCategory existentes y MCP-ready | ya closed |
| TICKET-083 (MC-03) | internal | requirement (3 RT) existente y MCP-ready | ya closed |
| object-manager (sync + GraphQL del mod) | internal | smoke real de REQ-02 | DB-gated; diferido al dev |
| up1-mcp (repo standalone) | external | repo separado, rama propia, default `main` | branch ya en `UPONE-1267-sp5`, clean |
| MCP server + Clerk OTP | internal | smoke en vivo de contratos (S3) | re-OTP requerido; DB-gated |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| La extensión del resolver polimórfico no encaja con el flujo genérico de `resolveContractInputs` | medium | REQ-05 incompleto | implementar config-driven (mapa ownerType→objectType), unit test TC-04 con mock; fallback a convención documentada (REQ-05 → SHOULD) — decisión #1 lo deja explícito |
| Agregar contratos rompe `test/contracts.test.ts` | low | test falla | solo AGREGAR tests; registry idempotente + guard de colisión; los 6 contratos previos intactos |
| El smoke vivo (TC-01) requiere infra (OM + sync + OTP) no disponible en CI | high | TC-01 no verificable en gate | DB-gated → diferido al dev con racional (precedente MC-02/03); TC-02..05 son auto y cubren el contrato |
| `validateCreditRange` no se cablea en el mismo path que `validateWeights` | low | min>max no rechazado | seguir exactamente dónde `validateWeights` se invoca en el create genérico; TC-03 lo verifica |
| Confundir el enum `operator` (Gte/Gt/Eq/Lt/Lte) con símbolos | low | enum mal documentado | usar los valores canónicos del objeto del mod (extraídos: Gte,Gt,Eq,Lt,Lte) con enumLabels es_CL (≥,>,=,<,≤) |

## Open questions

Ninguna bloqueante. La decisión #1 (resolver polimórfico vs convención) se cierra a favor de extender el resolver; si en S2 la extensión resulta más invasiva de lo previsto, se documenta el fallback (REQ-05 → SHOULD) con racional en el gate.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: `ownerId` polimórfico se resuelve extendiendo el resolver config-driven (REQ-05)
- **Contexto**: REQ-05 pide resolver `requirement.ownerId` por nombre/código condicional a `ownerType`. El resolver actual (`resolveContractInputs`) solo soporta FK de target estático (`doc.fk` string).
- **Drivers**: REQ-05 está `confirmed` y nombra explícitamente el caso polimórfico; Elric opera en lenguaje de negocio (nombres, no ids); el registry es config-driven y la extensión encaja con esa filosofía.
- **Opcion elegida**: extender `FieldDoc` con `polymorphicFkFrom: "ownerType"` + `polymorphicFkMap {curriculum:Curriculum, activity:Activity, offering:Offering}`; `resolveContractInputs` deriva el target del valor (ya canónico) del campo fuente y delega a `resolveReference`. ~20 líneas.
- **Alternativas**: convención documentada (rechazada como default: MC-03 la tomó porque NO tenía consumidor; aquí el MCP es el consumidor que REQ-05 exige). Resolver de dominio dedicado tipo `curriculum-write.ts` (rechazada: estos objetos usan CRUD genérico — drop de cd_*; un resolver dedicado contradiría ese drop).
- **Consecuencias**: único código no-declarativo del ticket; concentra el riesgo en S2 (⚑ fuerte). Fallback documentado si resulta invasiva.
- **Session**: design.

### DEC-LOCAL-02: honrar las decisiones no-menú de MC-02/03 — sin `_list` nuevos (REQ-01)
- **Contexto**: REQ-01 dice "layouts (RecordList/RecordDetail)". El estado real: planEntry solo `_view`; requirementCategory `_create/_edit/_view`; requirement 9 RecordDetail. Ningún `_list`.
- **Drivers**: MC-02 decidió planEntry se crea vía la malla (sin menú); MC-03 decidió requirement no-menú (sub-estructura embebida). DET-16: no contradecir tickets cerrados. La visibilidad en object-manager es schema-driven, no requiere `_list`.
- **Opcion elegida**: interpretar "RecordList/RecordDetail" como "los layouts que cada objeto necesita según su rol UX", ya decididos por MC-02/03. MC-04 reconcilia y verifica; no agrega `_list`.
- **Alternativas**: agregar `_list` a los 3 (rechazada: contradice MC-02/03, mete objetos sueltos en el menú que confunden al usuario).
- **Consecuencias**: REQ-01 se reduce a capabilities (build real) + verificación de layouts/lang (reuse/reduce). Verdict DET-32 mixto.
- **Session**: design.

### DEC-LOCAL-03: `requirement` se expone con UN contrato base (recordType enum), no per-RT (REQ-03)
- **Contexto**: requirement tiene 3 RecordTypes (Group, RecordState, MetricThreshold). El contrato podría declararse por-RT (clave compuesta `objectType:recordType`) o como uno base.
- **Drivers**: precedente `CURRICULUM_CONTRACT` (un contrato, `recordType` enum {Plan,Minor}); `getContract` resuelve por `objectType` cuando no hay clave compuesta; los campos por-RT se documentan en `fieldDocs`.
- **Opcion elegida**: un `REQUIREMENT_CONTRACT` base con `recordType` enum {Group,RecordState,MetricThreshold} + enums por-RT documentados en fieldDocs; el create genérico del core enforza el schema por RT.
- **Alternativas**: 3 contratos por clave compuesta (rechazada: triplica el config sin beneficio — el core ya discrimina por RT; describe_object derivaría 3 entradas redundantes).
- **Consecuencias**: 1 contrato declarativo; describe_object lista los 3 recordType como enum.
- **Session**: design.

### DEC-LOCAL-04: validación espejo `minCredits ≤ maxCredits` vía flag `validateCreditRange` (REQ-04)
- **Contexto**: TC-03 exige rechazar `create requirementCategory` con `minCredits > maxCredits` (espejo de la validación de dominio del mod, MC-02).
- **Drivers**: el `ObjectContract` ya tiene el patrón "flag booleano → función de validación" (`validateWeights` para EvaluationComponent); reusarlo evita un DSL de validación genérico.
- **Opcion elegida**: flag `validateCreditRange?: boolean` en el contrato + `validateCreditRange(data)` en `validations.ts`, cableada en el mismo path del create genérico donde corre `validateWeights`.
- **Alternativas**: DSL genérico de validaciones cruzadas (rechazada: sobre-ingeniería para un solo caso); validación solo en el mod (rechazada: REQ-04 pide validación espejo en el MCP para feedback temprano a Elric).
- **Consecuencias**: mínima superficie nueva, consistente con el patrón existente; extensible a futuras validaciones espejo.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..05 satisfechos (capabilities + layouts/lang verificados en el mod; 3 contratos + allowlist + resolver polimórfico + validación espejo en el MCP).
- [ ] **Tests**: TC-02..05 verificados (vitest del MCP); TC-01 smoke (DB-gated, diferido al dev con racional) con evidencia.
- [ ] **NFRs**: n/a.
- [ ] **Rules**: mod-only para el registro (sin artefactos de sync); source del MCP committeado; RULE-mods-037 (object-level RBAC) respetado; los 6 contratos previos del MCP intactos.
- [ ] **Integration**: la suite del mod sigue verde; el build + vitest del MCP verdes; allowlist gatea objetos no expuestos.
- [ ] **Docs**: decisiones DEC-LOCAL-01..04 registradas; propagación DET-16 a MC-05/06 + SP6 (cd_* ergonómicos) registrada.
