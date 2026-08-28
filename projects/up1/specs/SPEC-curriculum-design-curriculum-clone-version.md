---
id: SPEC-curriculum-design-curriculum-clone-version
project: up1
ticket: TICKET-065
status: done
---

# curriculum (Plan) · Clonar y versionar (superficial v1)

# curriculum (Plan) · Clonar y versionar (superficial v1)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: dar al objeto `Curriculum` (el "Plan" de estudio entregado por UPONE-1268) las dos acciones que ya tiene `activity`: **Versionar** (encadenar una nueva version de la misma entidad — mismo `code`, `version` incrementa) y **Clonar** (copia independiente — `code` nuevo, sin `previousVersionId`, nace `Draft`). Como el `code` se comparte entre versiones de un linaje, no puede ser unico a nivel de fila; por eso este ticket agrega ademas una **validacion de unicidad por linaje** que impide que dos planes distintos (dos raices) compartan `(institutionId, code)`. Alcance v1 **superficial**: solo el objeto Plan, sin arrastrar la malla (`planEntry` aun no existe).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | La validacion de unicidad por linaje vive **extendiendo el override de `createInstance` que ya posee `sectionValidation.resolver.js`** (no en el adapter UI `createCurriculumWithRecordType`, ni en un archivo nuevo) | Es la unica forma de cubrir TODOS los paths (UI/MCP/REST/n8n convergen en `createInstance`). Un guard en el adapter UI seria saltado por MCP. Un segundo export `createInstance` colisionaria con el del scanner ("ultimo gana") — ver DEC-LOCAL-01 |
| 2 | El guard solo aplica a **raices** (`previousVersionId == null`); las versiones nunca chocan | Es lo que distingue clon (raiz nueva) de version (no-raiz). La condicion parcial "solo raices" es la razon por la que NO se puede usar `uniqueScopedBy` declarativo (D-D) |
| 3 | Clone **superficial**: el clone profundo (arrastrar `planEntry`) se difiere al Backlog B1 | Sin `planEntry` el deep clone no es testeable (YAGNI); su diseño ya quedo resuelto en el intake (D-E) |

**Riesgos principales y como los mitigamos**:

- **El guard de linaje, mal ubicado, deja un agujero de enforcement** (clientes no-UI lo saltan) → se ancla en el override de `createInstance`, verificado empiricamente en S2 con un test que invoca el resolver directo (simula MCP), no solo via UI.
- **Tocar `sectionValidation.resolver.js` puede romper la validacion de secciones de TICKET-061** → la logica de secciones queda literalmente intacta; el guard de curriculum se agrega como rama nueva + helper separado; los tests de seccion existentes corren en regression (REQ-PRESERVE-01).
- **Los tests podrian "pasar" sin morder el branching del guard** → S2 corre mutation testing (DET-31, warn-first) sobre el guard para confirmar empiricamente que los mutantes mueren.
- **Incertidumbre: cuando crea una version, ¿`previousVersionId` ya viene seteado al entrar a `createInstance`?** → se verifica empiricamente en S2.T1 antes de escribir el guard (Open question OQ-1).

**Que NO se hace en este ticket**:

- **Clone profundo** (arrastrar la malla `planEntry`) — diferido al Backlog B1 (no hay malla en SP4).
- **Cambio de schema / migracion DB** — todo es config + resolver `logic/`. El `@@unique([previousVersionId, version])` ya existe (UPONE-1268).
- **MCP tools nuevas** — `cd_version_program` / `cd_create_program` ya existen; solo se verifican (no se construyen).
- **Backstop por indice parcial DB** (`WHERE previousVersionId IS NULL`) — opcion 2 de D-D, queda como mejora posterior opcional.

**Tamano estimado**: 3 sessions (~4-6h efectivas). La mas riesgosa es **S2** (el guard de linaje en el override compartido + mutation testing).

**Como vas a saber que funciona**:

- En el recordList de Curriculo aparecen las acciones "Crear nueva version" y "Duplicar"; versionar deja v1 intacto y crea v2 (mismo code, version+1); duplicar abre un modal con `code` vacio y crea un plan nuevo.
- Intentar duplicar con un `code` que ya usa otra raiz de la misma institucion → error claro (no se crea).
- Versionar el mismo plan repetidas veces nunca dispara ese error (mantiene el code).

---

## Purpose

Habilitar clonado superficial y versionado encadenado sobre el objeto `Curriculum` del mod `curriculum-design`, replicando el patron declarativo de `activity` (`prefillFrom` + `versioning` + rowActions), y agregar enforcement de unicidad por linaje `(institutionId, code)` sobre raices en el path de creacion compartido por todos los clientes. Actor primario: usuario con capability `curriculum:clone` / `curriculum:version` (admin curricular). Valor: gobernanza de la identidad de los planes (evita "dos v1" del mismo plan) sin bloquear el versionado legitimo.

## Requirements

### REQ-01: Versionar un Curriculum

> **Que cambia**: en el recordList de Curriculo aparece "Crear nueva version"; al usarla, el plan actual queda intacto y nace una v2 en `Draft` encadenada (mismo `code`, `version` incrementa, `previousVersionId → v1`).
> **Por que**: hoy el objeto soporta versionado en su metadata (`versioning`) pero no hay accion de UI ni `prefillFrom` que lo dispare.

El sistema MUST exponer una rowAction de versionado que cree una nueva version encadenada del Curriculum fuente, preservando el `code` e incrementando `version`, gateada por la capability `curriculum:version`.

**Actor**: usuario con `curriculum:version`
**Layers**: config (object JSON + layout), backend (createInstance generico via versioning metadata)

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionar deja v1 intacto y crea v2 encadenada
- **GIVEN** un Curriculum `v1` (raiz, `code=UV-ICIV-PLAN-2026`, `previousVersionId=null`)
- **WHEN** el usuario ejecuta "Crear nueva version"
- **THEN** se crea `v2` con `previousVersionId → v1`, mismo `code`, `version=2`, `status=Draft`
- **AND** `v1` queda sin cambios

#### Scenario: versionar sin capability se rechaza
- **GIVEN** un usuario sin `curriculum:version`
- **WHEN** intenta versionar
- **THEN** la accion no esta disponible / el backend la rechaza por auth

#### Scenario: versionar repetido mantiene el code (no choca con la regla de linaje)
- **GIVEN** un Curriculum `v1` ya versionado a `v2`
- **WHEN** se versiona `v2` a `v3`
- **THEN** `v3` mantiene el `code` sin disparar el error de unicidad por linaje (no es raiz)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el recordList, "Crear nueva version" sobre un plan produce otra fila con el mismo codigo y el plan original sigue ahi.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Versionar v1→v2 | Plan v1 raiz | RowAction "Crear nueva version" | v2 Draft encadenada | `previousVersionId=v1.id`, `code` igual, `version=2` |
| 2 | Versionar mantiene code | Plan v1 raiz | Versionar | v2 no-raiz | regla de linaje NO dispara |

### REQ-02: Clonar un Curriculum (superficial)

> **Que cambia**: aparece "Duplicar"; abre un modal de create prellenado con todo salvo `code` (vacio). Al completar `code` y guardar, nace un plan nuevo e independiente (`Draft`, sin `previousVersionId`).
> **Por que**: clonar produce una entidad nueva (otra cadena de versiones), distinta de versionar.

El sistema MUST exponer una rowAction de clonado con `cloneStrategy: "prefilledModal"` y `uniqueFields: ["code"]` que cree una copia independiente del Curriculum fuente (nuevo `id`, `status=Draft`, sin `previousVersionId`, `version` de arranque), gateada por la capability `curriculum:clone`. El prefill MUST excluir `version`, `previousVersionId` y `versionLabel` para no arrastrar datos de linaje de la fuente.

**Actor**: usuario con `curriculum:clone`
**Layers**: config (object JSON `prefillFrom` + layout rowAction), frontend (modal prefilledModal), backend (createInstance)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clonar crea copia independiente con code nuevo
- **GIVEN** un Curriculum existente `code=UV-ICIV-PLAN-2026`
- **WHEN** el usuario ejecuta "Duplicar", el modal abre con `code` vacio, completa `code=UV-ICIV-PLAN-2027` y guarda
- **THEN** se crea un plan nuevo (`id` distinto), `status=Draft`, `previousVersionId=null`, `code=UV-ICIV-PLAN-2027`
- **AND** el plan fuente queda sin cambios

#### Scenario: el modal de clone abre con code vacio
- **GIVEN** un Curriculum existente
- **WHEN** el usuario ejecuta "Duplicar"
- **THEN** el modal de create esta prellenado con los escalares del source EXCEPTO `code` (vacio)

#### Scenario: clonar no arrastra version/previousVersionId de la fuente
- **GIVEN** un Curriculum `v3` (no raiz, `version=3`)
- **WHEN** se clona
- **THEN** la copia arranca como raiz (`previousVersionId=null`, `version` de arranque), NO `version=3`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: "Duplicar" abre un formulario con el codigo en blanco; al completarlo y guardar aparece un plan nuevo y el original intacto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Clonar con code nuevo | Plan existente | Duplicar → code nuevo → guardar | copia independiente | `id` nuevo, `previousVersionId=null`, `code` nuevo, Draft |
| 2 | Clone no arrastra lineage | Plan v3 | Clonar | copia raiz | `version` reseteado, `previousVersionId=null` |

### REQ-03: Unicidad por linaje en el path de creacion (enforcement real)

> **Que cambia**: crear una raiz de Curriculum (clon, o create directo) con un `code` que ya usa otra raiz de la misma institucion es rechazado por el backend — en cualquier cliente (UI, MCP, REST, n8n), no solo en la UI.
> **Por que**: como el `code` se comparte entre versiones, la DB no puede expresar esta unicidad; sin el guard entrarian "dos v1" del mismo plan.

El sistema MUST rechazar la creacion de un Curriculum **raiz** (`previousVersionId == null`) cuando ya existe otra raiz con el mismo `(institutionId, code)`. La validacion MUST vivir en el override de `createInstance` del mod (path compartido por todos los clientes), NO en el adapter UI. La validacion MUST NOT aplicar a la creacion de versiones (no-raices), que comparten `code` por diseño.

**Actor**: system (enforcement); afecta a cualquier cliente de creacion
**Layers**: backend (`logic/sectionValidation.resolver.js` createInstance override + helper)

<details><summary>Scenarios de validacion</summary>

#### Scenario: clonar/crear raiz con code de raiz existente se rechaza
- **GIVEN** una raiz con `(institutionId=UV, code=UV-ICIV-PLAN-2026)`
- **WHEN** se crea otra raiz con `(institutionId=UV, code=UV-ICIV-PLAN-2026)` (clon que no cambio el code, o create directo via MCP)
- **THEN** el resolver lanza un error de dominio (`CURRICULUM_LINEAGE_DUPLICATE` o equivalente) y NO se crea la fila

#### Scenario: versionar (no-raiz) con mismo code NO se rechaza
- **GIVEN** una raiz `v1` con `code=UV-ICIV-PLAN-2026`
- **WHEN** se crea `v2` (`previousVersionId=v1.id`, mismo `code`)
- **THEN** la creacion procede (la regla solo aplica a raices)

#### Scenario: code distinto en la misma institucion procede
- **GIVEN** una raiz con `code=UV-ICIV-PLAN-2026`
- **WHEN** se crea otra raiz con `code=UV-ICIV-PLAN-2027`
- **THEN** la creacion procede (no colisiona)

#### Scenario: el guard cubre el path no-UI (anti-bypass)
- **GIVEN** la validacion vive en el override de `createInstance`
- **WHEN** un cliente crea via `createInstance(rt__Plan__curriculum)` directo (simulando MCP)
- **THEN** el guard se aplica igual que via UI

</details>

#### Acceptance
**El usuario puede verificar que funciona**: duplicar un plan sin cambiar el codigo arroja un error y no crea nada; cambiar el codigo permite crear.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Raiz duplicada rechazada | raiz (UV, code-X) | create raiz (UV, code-X) | rechazo | error dominio, 0 filas nuevas |
| 2 | Version mismo code OK | raiz v1 (UV, code-X) | create v2 (prevId=v1, code-X) | acepta | fila creada |
| 3 | Code distinto OK | raiz (UV, code-X) | create raiz (UV, code-Y) | acepta | fila creada |
| 4 | Anti-bypass (no-UI) | guard en createInstance | createInstance(alias) directo, code dup | rechazo | error dominio |

### REQ-04: Capabilities RBAC `curriculum:clone` / `curriculum:version`

> **Que cambia**: las dos acciones quedan gateadas por capabilities object-level; sin ellas no aparecen ni se ejecutan.
> **Por que**: las acciones de gobernanza curricular requieren RBAC explicito (patron de `activity:version`, `academicprogram:clone`).

El sistema MUST declarar las capabilities `curriculum:clone` y `curriculum:version` (object-level, sin prefix `mod/`, per RULE-mods-037) y las rowActions MUST referenciarlas en `requiredCapability`.

**Actor**: admin (asignacion de capability), usuario (uso gateado)
**Layers**: config (capabilities.json + layout)

<details><summary>Scenarios de validacion</summary>

#### Scenario: usuario sin capability no ve / no puede
- **GIVEN** un usuario sin `curriculum:clone`
- **WHEN** abre el recordList de Curriculo
- **THEN** la accion "Duplicar" no esta disponible (o el backend la rechaza por `requiredCapability` del prefillFrom)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un rol sin la capability no ve las acciones; con la capability si.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Capabilities declaradas | capabilities.json | sync | `curriculum:clone` y `curriculum:version` presentes | RBAC reconoce ambas |

### REQ-PRESERVE-01: La validacion de secciones (TICKET-061) sigue intacta

> **Que cambia**: nada visible — al extender el override de `createInstance` para curriculum, la validacion de Modality default (I2) y peso de EvaluationComponent (I1) debe seguir funcionando igual.
> **Por que**: el guard de linaje se agrega en el MISMO archivo que ya valida secciones; no debe alterar ese comportamiento.

El sistema MUST preservar el comportamiento de `validateSectionCreate` (Modality `isDefault` unico, peso de EvaluationComponent) sin cambios. La rama de curriculum MUST ser aditiva.

**Actor**: system
**Layers**: backend

#### Acceptance
**Verificable**: la suite de `sectionValidation` / `activity-resolvers` existente pasa sin cambios despues de agregar el guard de curriculum.

## Artifacts

### Config — object definition (`mods/curriculum-design/objects/Curriculum.json`)

| Bloque | Cambio | Detalle |
|--------|--------|---------|
| `metadata.versioning` | ya existe | `requiredCapability: "curriculum:version"` ya presente (UPONE-1268). Sin cambio salvo verificacion |
| `metadata.prefillFrom` | **agregar** | **Implementado**: `{ "exclude": ["version", "previousVersionId", "versionLabel", "status"] }`. Sin `deepClone` (no hay malla en v1). NOTA OQ-2 (cierre): `exclude.status` solo afecta el path server-side `asNewVersion`; el prefilledModal de clone (client-side) NO lo respeta → el clon nace `status=Active`, no Draft. Ver Backlog B3 |

> Nota: el `code` NO va en `prefillFrom.exclude` (la version SI debe carriarlo). El vaciado del `code` en el clone lo da `uniqueFields: ["code"]` del rowAction (solo path clone).

### Config — layout rowActions (`mods/curriculum-design/config/layouts/default_Curriculum_list.json`)

Hoy sin `rowActions`. Agregar dos (patron de `default_Activity_list.json` y `default_AcademicProgram_list.json`):

| rowAction | Campos clave |
|-----------|--------------|
| Versionar | `id: "create-new-version"`, `type: "create"`, `prefillFromCurrent: true`, `asNewVersion: true`, `requiredCapability: "curriculum:version"`, `redirectTo: "edit"`. `confirmCascade`: **false/omitir** (sin hijos en v1) |
| Clonar | `id: "duplicate"`, `type: "create"`, `cloneStrategy: "prefilledModal"`, `uniqueFields: ["code"]`, `requiredCapability: "curriculum:clone"` |

### Config — capabilities (`mods/curriculum-design/capabilities.json`)

| name | riskLevel | description |
|------|-----------|-------------|
| `curriculum:version` | medium | Crear nueva version de un Curriculum via row action. Object-level (RULE-mods-037). UPONE-1270 |
| `curriculum:clone` | medium | Clonar (duplicar) un Curriculum via row action; modal prellenado salvo `code`; unicidad por linaje la enforce el resolver de create. Object-level. UPONE-1270 |

### Backend — guard de unicidad por linaje

| Artefacto | Archivo | Cambio |
|-----------|---------|--------|
| Helper | `mods/curriculum-design/logic/helpers/lineageUniqueness.js` (**nuevo**) | **Implementado**: `assertUniqueLineageRoot({ prisma, institutionId, code, selfId })` + `findConflictingLineageRoot` (`findMany` en `curriculum` con `{ institutionId, code, previousVersionId: null }`, excluye `selfId`; `findMany` no `findFirst` — devuelve los ids en conflicto para el mensaje); si existe → throw `CURRICULUM_LINEAGE_DUPLICATE`. **+ `validateCurriculumCreate`** (dispatch rt__*__curriculum + detección de raíz por `asNewVersion`/`previousVersionId`) movido aquí como fuente única (cierre/L5) |
| Validador | `mods/curriculum-design/logic/sectionValidation.resolver.js` | **agregar** `validateCurriculumCreate({ objectType, data, context })` (sibling de `validateSectionCreate`) + invocarlo en el override `createInstance` ANTES del delegate. Dispatch por `objectType ∈ {rt__Plan__curriculum, rt__Minor__curriculum}` y `previousVersionId == null` |

### Tests

| Artefacto | Archivo | Cambio |
|-----------|---------|--------|
| Tests del guard | `mods/curriculum-design/tests/integration/curriculum-lineage.test.ts` (**nuevo**) | Patron `stubPrisma` de `activity-resolvers.test.ts`: TC-3 (raiz dup rechazada), TC-4 (version OK), code-distinto OK, anti-bypass (invocar el override directo) |

## Tasks

### Session 1 — Config: prefillFrom + rowActions + capabilities + sync [tipo: auto] [tier: T1]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar bloque `prefillFrom` (`exclude: ["version","previousVersionId","versionLabel"]`) a Curriculum.json; verificar `versioning.requiredCapability` | REQ-01, REQ-02 | developer | — | mods/curriculum-design/objects/Curriculum.json | lint JSON + schema valida | git revert | DET-2, DET-8, RULE-mods-003 | done | 1 |
| S1.T2 | Agregar rowActions "Crear nueva version" (asNewVersion) y "Duplicar" (prefilledModal + uniqueFields:["code"]) al layout | REQ-01, REQ-02, REQ-04 | developer | — | mods/curriculum-design/config/layouts/default_Curriculum_list.json | lint JSON | git revert | DET-2, DET-8, RULE-mods-003 | done | 1 |
| S1.T3 | Declarar capabilities `curriculum:version` y `curriculum:clone` (object-level, sin prefix mod/) | REQ-04 | developer | — | mods/curriculum-design/capabilities.json | lint JSON | git revert | DET-2, RULE-mods-037 | done | 1 |
| S1.T4 | Correr `npm run sync` + codegen; verificar object-manager arranca y la config llega a Base (downstream del mod) | REQ-01, REQ-02, REQ-04 | developer | S1.T1, S1.T2, S1.T3 | mods/curriculum-design/ (sync) | sync verde + arranque object-manager | re-sync desde estado previo | DET-8, RULE-mods-003, RULE-dev-006 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T1) — persistir resultados + quality review + decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Guard de unicidad por linaje + tests + mutation [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Verificar empiricamente OQ-1 (¿`previousVersionId` viene seteado al entrar a createInstance en el path version?) leyendo el flujo de versioning de core; documentar el hallazgo | REQ-03 | researcher | S1.GATE | object-manager/src/graphql/resolvers/instance.resolver.js | hallazgo documentado en ticket | (no aplica — read-only) | DET-4, DET-5 | done | 2 |
| S2.T2 | Crear helper `lineageUniqueness.js`: `assertUniqueLineageRoot` (findFirst root con (institutionId, code, previousVersionId=null)) | REQ-03 | developer | S2.T1 | mods/curriculum-design/logic/helpers/lineageUniqueness.js | unit (stubPrisma) | git revert | DET-1, DET-2, DET-8 | done | 2 |
| S2.T3 | Extender override `createInstance` de sectionValidation.resolver.js: agregar `validateCurriculumCreate` (dispatch por rt__*__curriculum + raiz), invocar antes del delegate; preservar validateSectionCreate intacto | REQ-03, REQ-PRESERVE-01 | developer | S2.T2 | mods/curriculum-design/logic/sectionValidation.resolver.js | vitest mod (TC-2/3 verdes + section tests verdes) | git revert | DET-5, DET-8, DET-10, RULE-curriculum-design-003, RULE-mods-027 | done | 2 |
| S2.T4 | Tests de integracion del guard (TC-3 raiz dup, TC-4 version OK, code-distinto OK, anti-bypass via override directo) | REQ-03 | developer | S2.T3 | mods/curriculum-design/tests/integration/curriculum-lineage.test.ts | vitest (4 TC verdes con asserts concretos) | git revert | DET-7, DET-13 | done | 2 |
| S2.T5 | Mutation testing (DET-31, warn-first): `dkc-mutate` sobre el guard del resolver; override `EXCLUDE_TESTS` para NO excluir `tests/integration/`; sobreviviente critico → hardening task | — | reviewer | S2.T4 | mods/curriculum-design/logic/ (diff-only) | mutation score reportado; sobrevivientes triados | (no aplica) | DET-31, DET-7, DET-23 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) — persistir + quality review exhaustivo + mutation + decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5 | ticket | gate persistido + decision + mutation | (no aplica) | DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — E2E clonar/versionar + verificar MCP + regression [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Smoke UI en la suite (Playwright): versionar (TC-1) y clonar (TC-2/TC-5) sobre un Plan del seed; capturar evidencia (payload + UI) | REQ-01, REQ-02 | developer | S2.GATE | (suite — verificacion, sin edicion de codigo) | smoke verde + screenshots | (no aplica) | DET-13, DET-25 | done | 3 |
| S3.T2 | Verificar MCP `cd_version_program` / creacion de program respeta el guard de linaje (anti-bypass end-to-end); confirmar no se construyen tools nuevas | REQ-03 | developer | S2.GATE | (MCP up1 — verificacion) | smoke MCP verde | (no aplica) | DET-13, DET-16 | done | 3 |
| S3.T3 | Regression del mod curriculum-design (vitest suite completa); confirmar section tests (TICKET-061) verdes y sin delta negativo | REQ-PRESERVE-01 | reviewer | S3.T1, S3.T2 | mods/curriculum-design/ | vitest suite completa verde | (no aplica) | DET-13, DET-7 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T3) — persistir + acceptance checkpoints + decidir cierre | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + acceptance | (no aplica) | DET-20, DET-23 | done | 3 |

### Task contract (detalle de las criticas)

```
Task S2.T3: Extender override createInstance con guard de curriculum
- source_ref: REQ-03, REQ-PRESERVE-01
- agent: developer
- files: mods/curriculum-design/logic/sectionValidation.resolver.js
- precondition: helper lineageUniqueness.js listo (S2.T2); OQ-1 resuelta (S2.T1)
- expected_output: el override createInstance invoca validateCurriculumCreate (dispatch por objectType rt__Plan/Minor__curriculum + previousVersionId==null) antes del delegate; validateSectionCreate sin cambios
- validation: vitest del mod — TC-2/TC-3 verdes + section tests existentes verdes
- rollback: git revert del archivo
- rules: [DET-5, DET-8, DET-10, RULE-curriculum-design-003, RULE-mods-027]
```

```
Task S2.T5: Mutation testing del guard (DET-31, warn-first)
- source_ref: — (refuerza DET-7/DET-23 sobre REQ-03)
- agent: reviewer
- files: mods/curriculum-design/logic/ (diff-only, worktree aislado DKC)
- precondition: tests del guard verdes (S2.T4)
- expected_output: mutation score del guard reportado; mutantes en el branching (==→!=, &&→||) muertos; sobrevivientes triados (critico→hardening task en G-open S3 o backlog must)
- validation: dkc-mutate --repo <up1> diff-only; override EXCLUDE_TESTS para incluir tests/integration/
- rollback: (no aplica — DKC-owned, footprint cero en el repo target)
- rules: [DET-31, DET-7, DET-23]
```

## Constraints

- **RULE-mods-027**: `InstanceResult` solo expone `{ id, data, extended }` — el adapter UI ya reshapa; el guard NO altera el shape de retorno (valida y delega).
- **RULE-curriculum-design-003**: las escrituras de gobernanza van por resolver de dominio con validacion custom (no CRUD generic crudo) — el guard de linaje es exactamente esto.
- **RULE-mods-037**: capabilities object-level sin prefix `mod/` — `curriculum:clone` / `curriculum:version`.
- **RULE-mods-003**: `npm run sync` despues de cada cambio en mods.
- **RULE-dev-006**: tests + arranque del servicio antes de cerrar.
- **DET-31**: mutation testing respalda la dimension testing del quality review sobre el guard.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| UPONE-1268 / SPEC-024 (objeto Curriculum) | internal | Objeto Curriculum con versioning + RecordType Plan/Minor + seed de Plans | Cerrado (TICKET-063 closed) — sin riesgo |
| createInstance generico de core | internal | El override delega en el; el versioning metadata lo interpreta core | Estable; el override ya existe para secciones (TICKET-061) |
| sub-cache DKC vitest3 (mutation) | internal | dkc-mutate corre vitest 3 sobre el mod | Verificado listo 2026-06-15 (nota de intake) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Guard mal ubicado deja bypass no-UI | medium | high | Anclar en override de createInstance; TC anti-bypass invoca el resolver directo (simula MCP) |
| Romper validacion de secciones (TICKET-061) al tocar el archivo compartido | low | high | Rama aditiva; validateSectionCreate intacto; section tests en regression (REQ-PRESERVE-01) |
| Tests verdes que no muerden el branching del guard | medium | medium | Mutation testing (DET-31) warn-first sobre el guard en S2 |
| `previousVersionId` no seteado al entrar al guard en el path version → version tratada como raiz (falso rechazo) | medium | high | OQ-1 verificada empiricamente en S2.T1 antes de escribir el guard; TC-4 (version mismo code OK) lo cubre |
| Colision de scanner si se crea un 2do export createInstance | low | high | NO crear archivo nuevo con createInstance; extender el existente (DEC-LOCAL-01) |

## Open questions

- [ ] **OQ-1**: ¿En el path de versionado (`asNewVersion`), `data.previousVersionId` ya viene seteado al entrar a `createInstance` (de modo que el guard correctamente lo trata como no-raiz), o core lo setea despues del delegate? Verificar en S2.T1 leyendo el flujo de versioning de core. Si core lo setea post-delegate, el guard debe leer el `asNewVersion`/flag o el `previousVersionId` resuelto, no solo `data.previousVersionId`.
- [ ] **OQ-2**: ¿Excluir `status` del `prefillFrom` basta para que clone/version nazcan `Draft` (via `static_default`), o el prefill lo arrastra igual? Verificar en S1/S3.

## Decisions

### DEC-LOCAL-01: El guard de unicidad por linaje extiende el override de createInstance existente (no el adapter UI, no un archivo nuevo)
- **Contexto**: D-D del intake decidio "validacion de dominio en el resolver del create, enforcement real". Habia que elegir DONDE: (A) en el adapter UI `createCurriculumWithRecordType`, (B) en un archivo nuevo con override `createInstance`, (C) extendiendo el override que ya posee `sectionValidation.resolver.js`.
- **Drivers**: cobertura de todos los paths (UI/MCP/REST/n8n convergen en `createInstance`, NO en el adapter UI — verificado: el MCP crea por `createInstance(rt__X__curriculum)` directo); restriccion del scanner (acumula exports con "mutation"; dos `createInstance` → "ultimo gana" → colision silenciosa, documentada como CONSTRAINT H7 en el propio archivo); disciplina RULE-mods-027/TICKET-070 (validacion va donde TODOS los clientes pasan, no en el adapter thin); minimizar blast radius.
- **Opcion elegida**: C — extender el override de `sectionValidation.resolver.js` con una rama de curriculum (`validateCurriculumCreate` + helper `lineageUniqueness.js`), dejando `validateSectionCreate` intacto.
- **Alternativas**: A descartada (UI-only → MCP la salta, contradice "enforcement real"). B descartada (colision de scanner con el createInstance existente → uno se pierde en silencio).
- **Consecuencias**: gana cobertura completa + cero colision + reuso del patron validate-then-delegate ya probado. Pierde: el archivo `sectionValidation.resolver.js` pasa a validar tambien curriculum (nombre queda algo estrecho); se acepta por minimizar blast radius (renombrar el synced resolver es mas riesgoso). Posible follow-up: generalizar el nombre a `createValidation` si se suman mas objetos.
- **Session**: design (intake D-D ya habia fijado "resolver"; este spec fija el archivo exacto)

### DEC-LOCAL-02: Clone superficial, deep clone diferido (confirma D-A/D-E)
- **Contexto**: el clone podria arrastrar la malla `planEntry`.
- **Drivers**: `planEntry` no existe en SP4; sin hijos el deep clone no es testeable (YAGNI).
- **Opcion elegida**: clone superficial; `prefillFrom` SIN `deepClone`.
- **Alternativas**: deep clone ahora — descartado (diseño ya resuelto en D-E, ejecucion diferida a Backlog B1).
- **Consecuencias**: scope acotado y testeable; el deep clone espera a `planEntry`.
- **Session**: design

## Technical reference

- **Override pattern (validate-then-delegate)**: `mods/curriculum-design/logic/sectionValidation.resolver.js:113-119` — exporta `createInstance` (mismo nombre que core → gana por spread `...dynamicResolvers.mutations` en `object-manager/src/graphql/resolverIndex.js`). Carga el generico via dynamic import dual-path, valida, delega. CONSTRAINT H7 (lineas 27-31) documenta que `createInstance` vive aca y `updateInstance` en polymorphicUpdate.
- **Adapter UI thin**: `mods/curriculum-design/logic/curriculum-create.resolver.js` — `createCurriculumWithRecordType` (UI-only via customEndpoint). NO es el lugar del guard (lo dice su docstring: validacion va donde todos pasan).
- **Patron de versionado/clone de activity**: `mods/curriculum-design/objects/activity.json:27-39` (`prefillFrom` + `versioning`); `config/layouts/default_Activity_list.json:23-41` (rowAction version); `default_AcademicProgram_list.json:17-27` (rowAction clone `prefilledModal` + `uniqueFields:["code"]`).
- **Objeto Curriculum**: `mods/curriculum-design/objects/Curriculum.json` — `metadata.versioning` (con `requiredCapability: curriculum:version`) y `uniqueConstraints: [["previousVersionId","version"]]` ya presentes; el `code` documenta que UPONE-1270 aporta la unicidad por linaje.
- **Tests pattern**: `mods/curriculum-design/tests/integration/activity-resolvers.test.ts` — `stubPrisma` (Proxy que mockea findFirst/findUnique/create/$transaction sin DB real); invocar el resolver y asertar sobre el store mutado.
- **Seed test data**: `mods/curriculum-design/seed/_data-curriculum.js` — Plans `UV-ICIV-PLAN-2026` (Plan) y `UV-MINOR-MAT-2026` (Minor), institucion `UV`, solo tenant UPU.
- **Capabilities pattern**: `mods/curriculum-design/capabilities.json` — `activity:version`, `academicprogram:clone` (object-level, sin prefix).

## Rules discovered

- (se llena durante ejecucion)

## Bugs found

- (se llena si se descubren)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01 (versionar), REQ-02 (clonar), REQ-03 (unicidad linaje), REQ-04 (capabilities) pasan
- [ ] **Tests**: TC-1..TC-6 escritos y pasando (auto los de resolver; manual/smoke los de UI)
- [ ] **Mutation**: guard de linaje con score reportado, mutantes del branching muertos (DET-31)
- [ ] **Rules**: RULE-mods-027/037/003, RULE-curriculum-design-003, RULE-dev-006 respetadas
- [ ] **Integration**: regression del mod verde; section tests (TICKET-061) intactos (REQ-PRESERVE-01)
- [ ] **Docs**: doc del mod actualizada si aplica (PATTERNS / capabilities)

## Archiving

Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-curriculum-clone-version "razon"`.
