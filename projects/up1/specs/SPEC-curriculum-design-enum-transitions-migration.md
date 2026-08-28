---
id: SPEC-curriculum-design-enum-transitions-migration
project: up1
ticket: TICKET-103
status: in_progress
---

# P4 — Migración de Curriculum/Activity/Offering al motor de transiciones de core

# P4 — Migración de Curriculum/Activity/Offering al motor de transiciones de core

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico esta en Requirements, Artifacts y Tasks.*

**Que se quiere**: hoy los estados de los objetos curriculares se gobiernan de dos formas distintas — Curriculum con un enum simple sin reglas, Activity con un motor de workflow relacional bespoke del mod (tablas, config por institución), y Offering (sílabo) sin flujo propio. Este ticket los unifica bajo el **motor de transiciones "enum" de core** (ya construido y probado): un flujo de estados declarado como datos en el JSON del objeto, validado por la plataforma en `updateInstance`. El resultado: un solo motor mantenido por el core en vez de uno a medida por mod, más el gate de versionado reubicado a la config del versionado para que siga funcionando tras retirar el workflow.

**Decisiones criticas que necesitan tu OK** (cerradas en intake — confirmá o corregí):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Offering usa un campo NUEVO `lifecycleStatus`** (no el `status` de engagement) | El `status` de Offering lo posee uengagement (fuera de scope) y el sync bloquea agregar transitions a un campo ajeno. Modela otro eje (autoría vs disponibilidad). |
| 2 | **`version-from-source.js` (core) se generaliza** para gatear objetos estado-simple vía `versionableFromStates` | Es un cambio de core (RULE-dev-004); sin él, quitar el workflow hace que Activity/Curriculum versionen desde cualquier estado (se pierde el gate). |
| 3 | **DIS → Archived** en el remap de Activity | DIS es categoría `Closed`=terminal. Decide dónde caen las asignaturas descontinuadas hoy. |
| 4 | **REQ-06 retira TODO el subsistema workflow** (objetos + seed + resolvers) | Tras migrar Activity queda huérfano (nadie más lo usa). Eliminar tablas es **migración destructiva** → consent al migrate. |
| 5 | **Capabilities `object:action` desnudo** (`curriculum:approve`, `activity:publish`, `offering:publish`…) | Consistente con las existentes; se agregan a `capabilities.json`. |

**Riesgos principales y como los mitigamos**:

- **Perder el gate de versionado al quitar el workflow** → REQ-04 lo reubica a `versionableFromStates` en el JSON; test de integración verifica `SOURCE_NOT_VERSIONABLE` desde estado no permitido antes de cerrar S2/S3.
- **Regresión de datos en la migración de Activity** (remap BOR/EDIT/REV-DEC/PUB/DIS) → migración idempotente con conteo antes/después por estado; smoke en UPU con Activities en varios estados.
- **Romper los ServiceOffer de engagement al tocar Offering** → campo nuevo `lifecycleStatus` scoped a `recordType=Syllabus`; el `status` de engagement no se toca; regression de `createServiceOffering`.
- **Drift ajeno (report-builder) en object-manager** → `git stash -u` con label al inicio de execute; P4 codegena sobre árbol limpio.
- **Cambio de core sin review** → S2 va en rama `feat/UPONE-1381`, merge a develop gated por team core (RULE-dev-004); el cierre DKC no implica merge.

**Que NO se hace en este ticket** (limites del scope):

- **Versionado de Offering/sílabo** — sigue clonándose, no versiona. Solo entra su flujo de estados.
- **Conditions cross-app BR-WKF-003/004** (matriculados activos, perfil de egreso) — follow-up a PM; los datos viven en engagement/curriculum-mapping.
- **Captura del `comment`/justificación de transición** — DataLog genérico (P3/TICKET-102) no lo captura; se acepta perder salvo decisión posterior.
- **AcademicProgram** — sin estado ni versionado, fuera.
- **Tocar uengagement** — read-only en SP6.

**Tamano estimado**: 6 sessions, ~13 SP (est.), ~10-14h efectivas. La más riesgosa es **S5 (migración de datos de Activity)**; la más sensible por review es **S2 (cambio de core en `version-from-source.js`)**.

**Como vas a saber que funciona**:

- En UPU, cambio el estado de un Curriculum de `Draft`→`InReview`→`Approved` y el motor lo permite; un salto no declarado (`Draft`→`Active`) lo rechaza.
- Versiono un Curriculum en `Approved`/`Active` → crea v2 en `Draft`; versionar uno en `Draft` falla con `SOURCE_NOT_VERSIONABLE`.
- Una Activity que estaba en `PUB` aparece como `Active` tras la migración, sin pérdidas; su badge muestra color.
- Un sílabo (Offering `recordType=Syllabus`) transiciona por `lifecycleStatus`; un ServiceOffer de engagement no se ve afectado.
- La suite (unit + integration) queda verde; el seed del workflow ya no existe.

---

## Purpose

Estandarizar el flujo de estados de Curriculum, Activity y Offering(Syllabus) en el **motor de transiciones enum de core** (`properties.transitions` + `enforceEnumTransitions`), reubicar el gate de versionado desde el workflow relacional del mod a la config `versioning` del JSON (generalizando `version-from-source.js`), y retirar el subsistema workflow del mod que queda huérfano tras migrar Activity. Actor: **configurador/plataforma**. Toca `object-manager` (core), `mods/curriculum-design` (config + migración + retiro) y `up1-mcp` (tools).

## Requirements

### REQ-01: Declarar `transitions` en Curriculum, Activity y Offering

> **Que cambia**: los 3 objetos declaran su máquina de estados en el JSON; tras codegen queda en `core_FieldDefinition.properties.transitions` y el motor de core la conoce.
> **Por que**: hoy el flujo o no existe (Curriculum/Offering) o vive en un motor bespoke (Activity).

El sistema MUST persistir el bloque `transitions` declarado en `status` (Curriculum, Activity) y `lifecycleStatus` (Offering) en `core_FieldDefinition.properties.transitions` tras `npm run codegen` + `npm run sync`. Curriculum/Activity: 6 estados; Offering: 4 estados (ver Artifacts).

**Actor**: system · **Layers**: config, backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: persistencia tras codegen
- **GIVEN** Curriculum.json con `status.enum` de 6 valores + `transitions`
- **WHEN** corre `npm run codegen`
- **THEN** `core_FieldDefinition` de `Curriculum.status` tiene `properties.transitions` con las 8 aristas; codegen loguea `✓ Persisted N enum transition(s)`

#### Scenario: shape inválido aborta
- **GIVEN** un `transitions` con `to` fuera del enum
- **WHEN** corre codegen
- **THEN** el pre-pass aborta con error explícito (archivo + campo)

</details>

#### Acceptance
El configurador ve, en el editor/GraphQL (`getObjectFields`), las transiciones declaradas por objeto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | persist Curriculum | Curriculum.json 6 estados+transitions | codegen | core_FieldDefinition | 8 transitions persistidas |
| 2 | persist Offering | Offering.json lifecycleStatus+transitions | codegen | core_FieldDefinition | 5 transitions persistidas |

### REQ-02: Validación de transiciones en `updateInstance`

> **Que cambia**: cambiar el estado de estos objetos pasa por `enforceEnumTransitions`; un salto no declarado se rechaza, una condición no cumplida se rechaza.
> **Por que**: el flujo debe ser enforced por la plataforma, no solo declarativo.

El sistema MUST rechazar en `updateInstance` toda transición `old→new` no declarada en `transitions`, y evaluar `conditions` (si existen) antes de permitirla. El guard ya existe (`enforceEnumTransitions`, `instance.resolver.js:135`); este REQ verifica su aplicación por objeto (no se re-implementa).

**Actor**: user · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: transición válida
- **GIVEN** Curriculum en `Draft`
- **WHEN** `updateInstance` con `status: InReview`
- **THEN** procede

#### Scenario: transición inválida
- **GIVEN** Curriculum en `Draft`
- **WHEN** `updateInstance` con `status: Active`
- **THEN** rechaza (transición no declarada)

</details>

#### Acceptance
El configurador intenta un salto de estado no permitido y el sistema lo bloquea con mensaje.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | válida | Curriculum Draft | →InReview | procede | update OK |
| 2 | inválida | Curriculum Draft | →Active | rechaza | error transición no declarada |

### REQ-03: Migrar Activity del workflow relacional al enum de core

> **Que cambia**: Activity deja de usar `currentStatusId` (FK → WorkflowStatus) y pasa a un campo `status` enum con los 6 estados canónicos; los datos existentes se remapean sin pérdida.
> **Por que**: unifica Activity con el motor de core y elimina el motor bespoke.

El sistema MUST reemplazar el campo `currentStatusId` de Activity por `status` (enum 6 estados + transitions), migrar los datos existentes según el mapa D2 (BOR→Draft, EDIT/REV-DEC→InReview, PUB→Active, DIS→Archived), y reemplazar el coordinador `transitionActivityValidated` por el `updateInstance` genérico. NO debe haber regresión de estados (toda Activity termina en un estado canónico equivalente).

**Actor**: configurador · **Layers**: config, backend, database, frontend (badge)

<details><summary>Scenarios de validacion</summary>

#### Scenario: remap sin pérdida
- **GIVEN** Activities en BOR/EDIT/REV-DEC/PUB/DIS
- **WHEN** corre la migración
- **THEN** cada una queda en Draft/InReview/InReview/Active/Archived; conteo total preservado

#### Scenario: cambio de estado por el motor de core
- **GIVEN** Activity migrada en `InReview`
- **WHEN** `updateInstance` con `status: Approved` y capability `activity:approve`
- **THEN** procede; sin la capability, rechaza

#### Scenario: badge conserva color
- **GIVEN** Activity en `Active`
- **WHEN** se renderiza `ActivityStatusBadge`
- **THEN** muestra color (mapa estado→color sin depender de `workflowStatus.category`)

</details>

#### Acceptance
El configurador ve las Activities existentes en sus estados canónicos equivalentes y puede transicionarlas por el nuevo motor.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | remap PUB | Activity PUB | migración | status=Active | sin pérdida |
| 2 | remap DIS | Activity DIS | migración | status=Archived | sin pérdida |
| 3 | direct status update rechazado sin cap | Activity InReview | →Approved sin cap | rechaza | error capability |

### REQ-04: Reubicar el gate de versionado a la config del versionado

> **Que cambia**: desde qué estado se puede versionar se declara en el bloque `versioning` del JSON (`versionableFromStates`), no en el workflow; `version-from-source.js` lo gatea genéricamente para objetos estado-simple.
> **Por que**: al quitar el workflow, `prepareVersionData` cae a la rama sin-workflow y pierde el gate `allowsVersioning`.

El sistema MUST gatear el versionado de objetos estado-simple por `source[stateField] ∈ versionableFromStates`, fallando con `SOURCE_NOT_VERSIONABLE` desde un estado no permitido; la nueva versión MUST nacer en el `static_default` del enum. Curriculum y Activity declaran `versionableFromStates: [Approved, Active]`. Es cambio de **core** (`version-from-source.js`).

**Actor**: configurador · **Layers**: backend (core), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: versiona desde estado permitido
- **GIVEN** Curriculum en `Active`, `versionableFromStates:[Approved,Active]`
- **WHEN** se versiona
- **THEN** crea v2 encadenada, estado `Draft`

#### Scenario: bloqueo desde estado no permitido
- **GIVEN** Curriculum en `Draft`
- **WHEN** se versiona
- **THEN** falla con `SOURCE_NOT_VERSIONABLE`

#### Scenario: objeto sin `versionableFromStates` no regresiona
- **GIVEN** un objeto estado-simple que versiona hoy sin gate
- **WHEN** se versiona
- **THEN** versiona como hoy (gate opt-in, no rompe existentes)

</details>

#### Acceptance
El configurador versiona un plan Aprobado/Vigente; intentar versionar un Borrador falla con mensaje claro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | permitido | Curriculum Active | version | v2 Draft | OK |
| 2 | bloqueado | Curriculum Draft | version | error | SOURCE_NOT_VERSIONABLE |
| 3 | sin gate | objeto sin versionableFromStates | version | OK | sin regresión |

### REQ-05: Preservar el deep-clone al versionar

> **Que cambia**: nada — se preserva. El deep-clone de hijos polimórficos al versionar sigue igual.
> **Por que**: reubicar el gate no debe tocar `deepClonePolymorphicChildren`.

El sistema MUST seguir deep-clonando los hijos polimórficos al versionar un objeto, idéntico a hoy. `deepClonePolymorphicChildren` NO se modifica.

**Actor**: system · **Layers**: backend (core)

#### Acceptance
Versionar un Curriculum con plan/entries sigue clonando toda la jerarquía.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | regression deep-clone | Curriculum con hijos | version | hijos clonados | igual que baseline |

### REQ-06: Retirar el subsistema workflow del mod

> **Que cambia**: se eliminan los seeds del workflow y, tras migrar Activity, los objetos/resolvers del workflow relacional que quedan sin consumidor.
> **Por que**: dead code — solo Activity lo usaba; CompetencyNode/ChangeRequest no existen como objetos.

El sistema MUST eliminar `seed/_data-workflow-objects.js` y `seed/_data-workflow-activate.js`, y retirar los objetos (`workflow`, `workflowStatus`, `workflowTransition`, `workflowTransitionHistory`) + resolvers (`workflowTransition.resolver.js`, `workflowTransitionHistory.resolver.js`, coordinador `transitionActivityValidated`) que queden sin consumidor tras REQ-03. La eliminación de los objetos/tablas es una migración destructiva → requiere consent explícito al momento del migrate.

**Actor**: system · **Layers**: config, backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: retiro sin romper Activity
- **GIVEN** Activity migrada al enum (REQ-03 done)
- **WHEN** se retira el workflow (seed + objetos + resolvers)
- **THEN** Activity sigue operando por el motor de core; no hay imports rotos ni referencias colgantes

</details>

#### Acceptance
El seed del workflow ya no existe; el sistema arranca y opera sin él.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | build sin workflow | workflow retirado | build + test suite | verde | sin refs colgantes |
| 2 | seed sin workflow | seed.js | run seed UPU | OK | sin _data-workflow-* |

### REQ-07: RBAC por transición (capability por arista)

> **Que cambia**: cada transición sensible exige una capability (`curriculum:approve`, `activity:publish`, `offering:publish`…); se declaran en `capabilities.json`.
> **Por que**: el flujo estándar debe respetar roles por transición (BR-WKF-002), soportado nativamente por el motor (`requiredCapabilities`).

El sistema MUST gatear las transiciones marcadas por `requiredCapabilities` (semántica OR) y declarar las capabilities nuevas en `mods/curriculum-design/capabilities.json` con formato `object:action` desnudo. Verificar que `checkCapability` acepta el formato.

**Actor**: configurador · **Layers**: backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: transición gateada
- **GIVEN** usuario sin `curriculum:approve`, Curriculum en `InReview`
- **WHEN** intenta `→Approved`
- **THEN** rechaza por capability

</details>

#### Acceptance
Un usuario sin el rol no puede aprobar/publicar; con el rol, sí.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | sin cap | user sin curriculum:approve | InReview→Approved | rechaza | error capability |
| 2 | con cap | user con curriculum:approve | InReview→Approved | procede | OK |

## Artifacts

### Models — cambios de campo por objeto

| Objeto | Campo | Cambio | Enum | static_default | transitions | versioning |
|--------|-------|--------|------|----------------|-------------|-----------|
| Curriculum | `status` | **expandir** enum 3→6 (aditivo) + agregar transitions | Draft/InReview/Approved/Active/Deprecated/Archived | Draft | 8 aristas (datos canónicos) | + `versionableFromStates:[Approved,Active]` |
| Activity | `status` | **nuevo** enum (reemplaza FK `currentStatusId`) | Draft/InReview/Approved/Active/Deprecated/Archived | Draft | 8 aristas | reubica: quitar `initialStateField`, + `versionableFromStates:[Approved,Active]` |
| Activity | `currentStatusId` | **eliminar** (FK → WorkflowStatus) | — | — | — | — |
| Offering | `lifecycleStatus` | **nuevo** enum (curriculum-design), scoped `recordType=Syllabus` | Draft/InReview/Active/Archived | Draft | 5 aristas | no versiona |
| Offering | `status` (engagement) | **no se toca** | Active/Inactive/Cancelled | Active | — | — |

**Enum de core — extensión del schema `versioning`** (object-manager): el bloque `versioning` de `core_ObjectDefinition.versioningConfig` acepta un campo opcional nuevo `versionableFromStates: string[]` (+ `stateField`, default `status`). `version-from-source.js` lo lee en la rama estado-simple (`needsWorkflow=false`).

**Relations**: la eliminación de `currentStatusId` remueve la relación Activity→WorkflowStatus. La eliminación de los objetos workflow remueve sus tablas (destructivo).

### GraphQL / resolver (METASPEC-graphql-resolver)

| Resolver | Cambio |
|----------|--------|
| `enforceEnumTransitions` (core) | sin cambio — se reutiliza |
| `version-from-source.js::prepareVersionData` (core) | generalizar: rama estado-simple gatea `source[stateField] ∈ versionableFromStates` → `SOURCE_NOT_VERSIONABLE` |
| `activity.resolver.js::transitionActivityValidated` | **eliminar** (reemplazado por `updateInstance`) |
| `activity.resolver.js::updateActivityValidated` | quitar el gate `ACTIVITY_STATUS_READ_ONLY` sobre el nuevo `status` |
| `workflowTransition.resolver.js`, `workflowTransitionHistory.resolver.js` | **eliminar** |
| MCP `cd_transition_program`, `cd_list_transitions` | apuntar al enum de core (no al workflow) |
| MCP `cd_version_program`, `cd_version_curriculum`, `cd_get_version_chain` | operar con el nuevo gate |

## Tasks

### Session 1 — Curriculum: transitions + estados + capabilities [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Setup limpio: `git stash -u` del drift report-builder en object-manager (label descriptivo) | — | developer | — | object-manager working tree | `git status` limpio salvo P4 | `git stash pop` | DET-8, DET-16 | done | 1 |
| S1.T2 | Expandir `Curriculum.status` enum 3→6 (aditivo) + declarar `transitions` (8 aristas canónicas) | REQ-01 | developer | S1.T1 | mods/curriculum-design/objects/Curriculum.json | codegen persiste 8 transitions | git revert | DET-1, DET-2, DET-11 | done | 1 |
| S1.T3 | Declarar capabilities `curriculum:{approve,publish,deprecate,archive}` en capabilities.json | REQ-07 | developer | S1.T1 | mods/curriculum-design/capabilities.json | codegen/sync OK | git revert | DET-2, DET-11 | done | 1 |
| S1.T4 | Lang ES para las 3 keys de estado nuevas (InReview/Approved/Deprecated) | REQ-01 | developer | S1.T2 | mods/curriculum-design/lang/ | sync + $t resuelve | git revert | RULE-dev-004 | done | 1 |
| S1.T5 | codegen + sync + migrate UPU; verificar transiciones válida/inválida en updateInstance | REQ-01, REQ-02 | developer | S1.T2, S1.T3, S1.T4 | (pipeline) | integration: transición OK/rechazada | reset migración (consent) | DET-5, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T3) — persistir, quality review, smoke UPU, decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + evidencia runtime | (no aplica) | DET-20, DET-23, DET-36 | done | 1 |

### Session 2 — Core: generalizar el gate de versionado en `version-from-source.js` [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Analizar consumidores de `prepareVersionData` (impacto colateral core) | REQ-04 | researcher | S1.GATE | object-manager/src/graphql/resolvers/helpers/version-from-source.js + consumidores | reporte de consumidores | (no aplica) | DET-5, DET-11, DET-16 | done | 2 |
| S2.T2 | Extender el schema `versioning` para aceptar `versionableFromStates` + `stateField` (codegen + registry) | REQ-04 | developer | S2.T1 | object-manager (codegen versioningConfig) | codegen persiste el nuevo campo | git revert | DET-1, DET-8 | done | 2 |
| S2.T3 | Generalizar `prepareVersionData`: rama estado-simple gatea `source[stateField] ∈ versionableFromStates` → `SOURCE_NOT_VERSIONABLE`; nueva versión en `static_default` | REQ-04 | developer | S2.T2 | version-from-source.js | unit + integration (permitido/bloqueado/sin-gate) | git revert | DET-5, DET-8, DET-10, RULE-dev-004 | done | 2 |
| S2.T4 | Regression: objetos que versionan hoy sin gate no regresionan | REQ-04 | reviewer | S2.T3 | tests | suite core verde | (no aplica) | DET-7, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) — cambio de core, quality review + dual-judge; commit `UPONE-1381` (merge gated por team core) | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate + tests reales | (no aplica) | DET-20, DET-23, DET-35, RULE-dev-004 | done | 2 |

### Session 3 — Curriculum: gate de versionado + regression deep-clone [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Declarar `versionableFromStates:[Approved,Active]` en `versioning` de Curriculum | REQ-04 | developer | S2.GATE | mods/curriculum-design/objects/Curriculum.json | codegen persiste versioningConfig | git revert | DET-1, DET-2 | done | 3 |
| S3.T2 | Integration: versionar Curriculum Approved/Active OK; Draft → SOURCE_NOT_VERSIONABLE | REQ-04 | developer | S3.T1 | tests | integration verde | (no aplica) | DET-5, DET-7 | done | 3 |
| S3.T3 | Regression deep-clone: versionar Curriculum con hijos polimórficos clona igual | REQ-05 | reviewer | S3.T1 | tests | integration deep-clone verde | (no aplica) | DET-7, DET-13 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2) | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Offering: campo `lifecycleStatus` + transitions scoped Syllabus [tipo: auto] [tier: T2]

parallel_groups: [[S4.T1, S4.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Agregar campo `lifecycleStatus` (enum 4 + transitions 5 aristas) a Offering.json (curriculum-design), scoped `recordType=Syllabus` | REQ-01, REQ-02 | developer | S1.GATE | mods/curriculum-design/objects/Offering.json | codegen persiste; status engagement intacto | git revert | DET-1, DET-2, DET-16 | done | 4 |
| S4.T2 | Capabilities `offering:{publish,archive}` en capabilities.json + lang ES | REQ-07 | developer | S1.GATE | capabilities.json, lang/ | sync OK | git revert | DET-2 | done | 4 |
| S4.T3 | codegen+sync+migrate; setear `lifecycleStatus=Draft` en sílabos existentes; verificar ServiceOffer sin regresión | REQ-01, REQ-03 | developer | S4.T1, S4.T2 | (pipeline) + syllabus-offering.resolver.js | integration: flujo sílabo OK, ServiceOffer intacto | reset migración (consent) | DET-5, DET-13 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T2) — smoke sílabo en UPU | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate + evidencia runtime | (no aplica) | DET-20, DET-23, DET-36 | done | 4 |

### Session 5 — Activity: migración workflow → enum [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Analizar consumidores de `currentStatusId`/`transitionActivityValidated`/badge (impacto colateral) | REQ-03 | researcher | S2.GATE, S1.GATE | activity.resolver.js, layouts, ActivityStatusBadge | reporte de consumidores | (no aplica) | DET-5, DET-11, DET-16 | pending | 5 |
| S5.T2 | Agregar `status` enum (6+transitions) a activity.json; capabilities `activity:{approve,publish,deprecate,archive}` | REQ-01, REQ-07 | developer | S5.T1 | mods/curriculum-design/objects/activity.json, capabilities.json | codegen persiste | git revert | DET-1, DET-2 | pending | 5 |
| S5.T3 | Migración de datos: remap `currentStatusId`→`status` (BOR→Draft, EDIT/REV-DEC→InReview, PUB→Active, DIS→Archived); idempotente + conteo antes/después | REQ-03 | developer | S5.T2 | script de migración | conteo por estado preservado | reset (consent) | DET-5, DET-8, DET-11 | pending | 5 |
| S5.T4 | Reubicar gate versionado Activity: quitar `initialStateField`, agregar `versionableFromStates:[Approved,Active]` | REQ-04 | developer | S5.T2 | activity.json | integration versionado Activity | git revert | DET-1, DET-8 | pending | 5 |
| S5.T5 | Reemplazar `transitionActivityValidated`→`updateInstance`; quitar gate `ACTIVITY_STATUS_READ_ONLY`; eliminar FK `currentStatusId` | REQ-03 | developer | S5.T3 | activity.resolver.js, activity.json | integration transición Activity | git revert | DET-5, DET-8, DET-10 | pending | 5 |
| S5.T6 | ActivityStatusBadge: mapa estado→color sin `workflowStatus.category` | REQ-03 | developer | S5.T3 | modsComponents/ActivityStatusBadge/ | storybook + smoke render | git revert | DET-5, RULE-dev-004 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T3) — migración de datos, quality review + dual-judge + mutation; smoke UPU con Activities varias | — | reviewer | S5.T1..T6 | ticket | gate + evidencia runtime + conteo | (no aplica) | DET-20, DET-23, DET-31, DET-35, DET-36 | pending | 5 |

### Session 6 — Retiro workflow + MCP + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Confirmar cero consumidores del workflow tras S5 (grep workflowStatus/workflowTransition/currentStatusId) | REQ-06 | researcher | S5.GATE | mods/curriculum-design | reporte cero refs | (no aplica) | DET-5, DET-16 | pending | 6 |
| S6.T2 | Eliminar seeds `_data-workflow-objects.js` + `_data-workflow-activate.js` + su invocación en seed.js | REQ-06 | developer | S6.T1 | seed/ | run seed UPU OK | git revert | DET-8 | pending | 6 |
| S6.T3 | Eliminar resolvers workflow + coordinador; eliminar objetos workflow (JSON) — migración destructiva (drop 4 tablas), **consent** | REQ-06 | developer | S6.T2 | logic/, objects/workflow*.json | build+suite verde; migrate con consent | restore JSON + migración inversa | DET-8, DET-16, RULE-dev-004 | pending | 6 |
| S6.T4 | Actualizar tools up1-mcp: `cd_transition_program`, `cd_list_transitions` al enum de core; `cd_version_*`, `cd_get_version_chain` con nuevo gate | REQ-06 | developer | S5.GATE | up1-mcp/src/ | tools contra enum de core | git revert | DET-5, DET-16 | pending | 6 |
| S6.T5 | Integration full + smoke UPU end-to-end (3 objetos); doc platform (uplanner/specs) | REQ-01..07 | reviewer | S6.T2, S6.T3, S6.T4 | tests, docs | suite verde + smoke | (no aplica) | DET-7, DET-13, DET-36 | pending | 6 |
| S6.T6 | Doc del modelo de estados en el mod: guía en `mods/curriculum-design/docs/` con el set canónico (6 estados Curriculum/Activity + 4 Offering), grafo de transiciones, capabilities por arista y el remap Activity | REQ-01 | developer | S6.T3 | mods/curriculum-design/docs/ | doc coherente con los JSON declarados | git revert | DET-16, RULE-dev-004 | pending | 6 |
| S6.T7 | Actualizar `object-manager/docs/enum-transitions.md` (core): caso "mod que migra de workflow relacional a enum" + patrón del gate de versionado vía `versionableFromStates` en `version-from-source.js` | REQ-04 | developer | S6.T3 | object-manager/docs/enum-transitions.md | doc coherente con la generalización de S2 | git revert | DET-16, RULE-dev-004 | pending | 6 |
| **S6.GATE** | Gate de sync Session 6 (tier: T3) — cierre técnico, quality review final | — | reviewer | S6.T1..T7 | ticket | gate + DoD verificado | (no aplica) | DET-20, DET-23, DET-33 | pending | 6 |

## Constraints

- **RULE-dev-004**: trabajo core (S2, `version-from-source.js`) en rama única `UPONE-1381`, commits con id externo, merge a develop gated por team core — el cierre DKC no implica merge.
- **`core field protected`** (Merge Sync): un mod no declara transitions sobre campo ajeno → Offering usa campo propio `lifecycleStatus`.
- **Campos `ext__` no-op**: el campo de estado debe ser base, no extended.
- **DET-16 (propagación)**: retiro de workflow verifica cero consumidores antes de eliminar tablas.
- **DEC** (TICKET-074 / SPEC-core-implement-version-without-workflow): `prepareVersionData` ya es workflow-opcional — este spec extiende esa rama, no la recrea.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Motor enum de core (épica AP) | internal | `enforceEnumTransitions` + codegen `enum-transitions.js` | Satisfecha (presente en checkout) |
| uengagement (Offering.status) | internal | objeto compartido — NO se toca | Romper ServiceOffer si se toca el campo ajeno |
| DataLog / P3 (TICKET-102) | internal | captura de transiciones (onTransition) — follow-up | Historial de transición parcial hasta P3 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migración de Activity pierde/malmapea estados | medium | high | script idempotente + conteo antes/después por estado + smoke UPU |
| Quitar workflow pierde el gate de versionado | high | high | REQ-04 lo reubica antes de S5; integration verifica SOURCE_NOT_VERSIONABLE |
| Tocar Offering rompe engagement | medium | high | campo nuevo scoped Syllabus; status engagement intacto; regression ServiceOffer |
| Cambio de core sin review | low | medium | S2 gated por team core (RULE-dev-004) |
| Drop de tablas workflow destructivo | medium | high | consent explícito al migrate; rollback documentado (restore JSON + migración inversa) |

## Open questions

- [ ] ¿`checkCapability` acepta capabilities `object:action` desnudo (sin prefijo `mod/`)? — verificar en S1.T3 antes de declarar todas (evidencia: `activity:version` ya existe como capability, sugiere que sí).
- [ ] ¿Los sílabos existentes deben nacer todos en `lifecycleStatus=Draft` o inferir de su `status`? — default Draft (S4.T3), confirmar si hay sílabos "publicados" que deban entrar como Active.

## Decisions

### DEC-LOCAL-01: Offering usa campo propio `lifecycleStatus`
- **Contexto**: el `status` de Offering lo posee uengagement; el sync bloquea transitions en campo ajeno.
- **Drivers**: ownership limpio, cero impacto en engagement, scope SP6 (uengagement read-only).
- **Opcion elegida**: campo enum nuevo `lifecycleStatus` (curriculum-design), scoped `recordType=Syllabus`.
- **Alternativas**: reusar `status` (bloqueado por sync + cross-mod); campo RT-scoped (más riesgo); sacar Offering (contradice canónico). Ver ticket AskUserQuestion.
- **Consecuencias**: Offering tiene 2 campos de estado (ejes distintos); documentar.
- **Session**: intake (confirmado por dev).

### DEC-LOCAL-02: DIS → Archived
- **Contexto**: remap del workflow de Activity; DIS ("Descontinuado", categoría Closed) ambiguo entre Deprecated/Archived.
- **Drivers**: categoría Closed = terminal.
- **Opcion elegida**: DIS → Archived.
- **Alternativas**: DIS → Deprecated (descartado: Deprecated es intermedio).
- **Session**: intake (confirmado por dev).

### DEC-LOCAL-03: gate de versionado por Vía B (config del JSON)
- **Contexto**: reubicar el gate al quitar el workflow.
- **Drivers**: REQ-04 literal, genérico para plataforma.
- **Opcion elegida**: `versionableFromStates` en `versioning` + generalizar `version-from-source.js`.
- **Alternativas**: guard en el mod (bespoke, H7); motor de enum (concepto distinto).
- **Session**: intake.

## Technical reference

- **Formato transitions**: `{from, to, conditions?, message?/messageKey?, requiredCapabilities?[], onTransition?{event, description}}` — `object-manager/docs/enum-transitions.md`.
- **Guard**: `enforceEnumTransitions` en `instance.resolver.js:135` (paths :4146 base, :3961 RT). Guard puro `evaluateTransition` en `enum-transition-guard.js:92`.
- **Versionado**: `prepareVersionData` en `version-from-source.js:26-114`; `needsWorkflow = !!initialStateField` (:57); gate actual `allowsVersioning` (:77).
- **Datos canónicos de estados + transitions**: ver TICKET-103 "Datos canónicos de estados" (fuente de verdad de los enums/aristas/capabilities).
- **Remap Activity**: TICKET-103 D2 (tabla contra el seed `_data-workflow-objects.js`).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan en UPU
- [ ] **Tests**: unit + integration (transición válida/inválida/condición por objeto; migración sin regresión; gate versionado permitido/bloqueado; deep-clone) verdes
- [ ] **Rules**: motor de core reutilizado (no re-implementado); RULE-dev-004 respetada en S2
- [ ] **Integration**: ServiceOffer de engagement sin regresión; deep-clone preservado
- [ ] **Docs**: lang ES completo; guía del modelo de estados en el mod (S6.T6); `enum-transitions.md` de core actualizado (S6.T7); doc platform en uplanner/specs; sin artefactos sync/seed commiteados; tools up1-mcp actualizadas
- [ ] **DoD Jira**: lint + Prettier + tsc limpios; quality review + smoke UPU
