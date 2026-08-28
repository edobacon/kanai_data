---
id: SPEC-core-implement-version-without-workflow
project: up1
ticket: TICKET-074
status: done
---

# Versionar objetos versionables SIN workflow — `prepareVersionData` workflow-opcional

# Versionar objetos versionables SIN workflow — `prepareVersionData` workflow-opcional

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy versionar un Curriculum lanza `INTERNAL_SERVER_ERROR` porque el helper de versionado de core (`prepareVersionData`) asume que todo objeto versionable tiene un workflow (FK a `WorkflowStatus`), y Curriculum modela su estado como enum simple. Este spec hace **opcional** esa asunción: si el objeto no declara `initialStateField` en su `versioning`, se salta toda la lógica de workflow. Es el primer objeto versionable sin workflow (curriculum hoy, academicProgram mañana), así que el arreglo generaliza la plataforma en vez de parchear el caso. Además, con el crash destrabado, se **observa** si la nueva versión arrastra su extensión de RecordType (`rt__Plan__curriculum`) atómicamente — un segundo frente que decide si nace un backlog de core.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Discriminar "tiene workflow" por `!!initialStateField` (no por nombre de objeto ni flag nuevo) | `initialStateField` ya existe y es la señal natural; evita agregar config nueva y mantiene un solo path de versionado |
| 2 | El estado inicial de la v2 sin workflow lo resuelve el `static_default` del enum (`Draft`), no el helper | Sin workflow no hay "estado inicial" que setear; delegarlo al default del modelo evita acoplar el helper al dominio |
| 3 | La extensión RecordType (frente #2) se **observa**, no se arregla en este ticket | El fix de workflow es chico y de bajo riesgo; el path RT atómico es trabajo de core mayor (TICKET-056) que se decide con evidencia de S2 |

**Riesgos principales y como los mitigamos**:

- **Regresión silenciosa en activity (que SÍ tiene workflow)** → test unitario que preserva el path activity (TC-3/TC-4) + el gate `needsWorkflow` es `true` para activity por construcción (declara `initialStateField`).
- **Creer que el fix cierra "versionar curriculum" cuando la v2 pierde sus campos de Plan** → S2 observa explícitamente la extensión RT (TC-5); si falta, se levanta backlog B1 en vez de declarar cierre falso.

**Que NO se hace en este ticket**:

- NO se arregla el path RT no-atómico (extensión `rt__Plan__curriculum` en versión) — se observa y, si aplica, se difiere a backlog B1 / TICKET-056.
- NO se toca el mod `curriculum-design` ni `layout` — la config `versioning` de Curriculum ya es correcta.
- NO se toca el path de clone ni el deepClone de hijos (eso es TICKET-072, ortogonal).

**Tamano estimado**: 2 sessions (~2-3h efectivas). La más riesgosa es S2 (observación del frente #2), no por código sino porque su hallazgo puede abrir trabajo de core nuevo.

**Como vas a saber que funciona**:

- Versiono un Curriculum desde la UI/MCP y obtengo una v2 (no un error 500), encadenada por `previousVersionId`, en estado `Draft`.
- Versiono una activity (con workflow) y sigue funcionando idéntico: v+1, estado inicial del workflow, gating de `allowsVersioning` intacto.
- El test unitario nuevo (objeto sin `initialStateField`) pasa, y los tests de activity siguen verdes.

---

## Purpose

Generalizar el helper `prepareVersionData` (`object-manager/src/graphql/resolvers/helpers/version-from-source.js`) para que versione objetos versionables que NO tienen workflow formal, gateando toda la lógica de estado de workflow a la presencia de `initialStateField` en el `versioningConfig`. Habilita versionar `Curriculum` (y futuros objetos de estado-simple como `AcademicProgram`) sin romper el versionado workflow-backed existente de `activity`. Es core layer (`object-manager`), backward-compatible.

## Requirements

### REQ-IMPL-01: Workflow opcional en `prepareVersionData`

> **Que cambia**: versionar un objeto que NO tiene workflow (enum simple, como Curriculum) deja de crashear; la nueva versión se crea con el bump de versión y el linkage, y el estado lo resuelve el default del modelo.
> **Por que**: hoy el helper incluye `currentstatus`+`workflow` en el `findUnique` incondicionalmente → Prisma falla con `Unknown field 'currentstatus'` en objetos sin esas relaciones.

El sistema MUST gatear la lógica de workflow de `prepareVersionData` a `needsWorkflow = !!initialStateField` (del `versioningConfig`): cuando es `false`, MUST omitir el `include` de `currentstatus`/`workflow`, MUST omitir las validaciones `SOURCE_NOT_VERSIONABLE` y `WORKFLOW_HAS_NO_INITIAL_STATUS`, y MUST NO setear el campo de estado inicial. El bump de `versionField` y el `linkageField` MUST aplicarse igual en ambos casos.

**Actor**: system (resolver de versionado), gatillado por admin/user que versiona desde UI/MCP
**Layers**: backend (core resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto sin workflow versiona sin crashear
- **GIVEN** un Curriculum raíz cuyo `versioning` NO declara `initialStateField`
- **WHEN** se invoca `prepareVersionData` (vía `asNewVersion: true`)
- **THEN** NO se incluye `currentstatus`/`workflow` en el `findUnique`
- **AND** retorna `data` con `version = max(linaje)+1` y `previousVersionId = source.id`, sin claves de workflow

#### Scenario: objeto sin workflow no exige allowsVersioning
- **GIVEN** un objeto sin `initialStateField` cuyo source no tiene `currentstatus`
- **WHEN** se prepara la versión
- **THEN** NO se lanza `SOURCE_NOT_VERSIONABLE` ni `WORKFLOW_HAS_NO_INITIAL_STATUS`

#### Scenario: source inexistente sigue fallando claro
- **GIVEN** un `sourceId` que no existe
- **WHEN** se prepara la versión
- **THEN** se lanza `PREFILL_SOURCE_NOT_FOUND` (comportamiento preservado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versiona un Curriculum desde la UI/MCP y obtiene una nueva versión (no un error 500), en estado Draft, encadenada a la anterior.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Version curriculum no crashea | Curriculum raíz sin initialStateField | asNewVersion | v2 creada | version=2, previousVersionId=source.id, sin error |
| 2 | v2 nace Draft | TC-1 ejecutado | inspeccionar status | estado por static_default | status="Draft" |
| 4 | Unit sin initialStateField | versioningConfig sin initialStateField | prepareVersionData | data con bump+linkage | sin include workflow, sin throws de estado |

### REQ-PRESERVE-01: Versionado workflow-backed (activity) intacto

> **Que cambia**: nada para el dev — activity sigue versionando exactamente igual.
> **Por que**: el gate `needsWorkflow` debe ser 100% backward-compatible; activity declara `initialStateField` → entra al path con workflow.

El sistema MUST preservar el comportamiento actual de `prepareVersionData` para objetos que declaran `initialStateField`: include de `currentstatus`/`workflow`, validación de `allowsVersioning` e `initialStatusId`, y set del estado inicial del workflow en la nueva versión.

**Actor**: system
**Layers**: backend (core resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: activity versiona idéntico
- **GIVEN** una activity (declara `initialStateField: currentStatusId`) en estado que habilita versionado
- **WHEN** se prepara la versión
- **THEN** se incluye `currentstatus`/`workflow`, se valida `allowsVersioning`, y la v2 nace en el estado inicial del workflow

#### Scenario: activity en estado no versionable sigue rechazada
- **GIVEN** una activity cuyo `currentstatus.allowsVersioning` es false
- **WHEN** se prepara la versión
- **THEN** se lanza `SOURCE_NOT_VERSIONABLE` (comportamiento preservado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versiona una activity publicada y obtiene v+1 en el estado inicial del workflow, como hoy.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 3 | Regresión activity | activity con workflow, allowsVersioning=true | asNewVersion | v+1 con estado inicial | version+1, currentStatusId=initialStatusId, gating intacto |

### REQ-FIX-01: Update de objeto con FK de relación base no crashea (FK escalar → relation connect)

> **Que cambia**: actualizar un curriculum (u otro objeto con relación requerida + extensión) desde la UI/MCP deja de fallar con "Valor inválido proporcionado. Ubicación: InstitutionId".
> **Por que**: `updateInstance` mandaba el FK escalar (`institutionId`) crudo; al coexistir con la escritura anidada de la extensión, Prisma fuerza el *checked input* que lo rechaza. `createInstance` ya convertía FK→connect; `updateInstance` no (asimetría).

> **Origen**: bug surgido durante el execute (el dev lo encontró en la UI actualizando un Minor owner Institution). Plegado a este ticket por decisión del dev (era ortogonal al versionado pero del mismo dominio core).

El sistema MUST convertir, en `updateInstance`, los campos FK escalares de relaciones base (los `fieldDefinitions` con `isBaseField && properties.isForeignKey`) a la forma `{ <relation>: { connect: { id } } }` antes del `prisma[model].update`, eliminando el FK escalar del payload — mismo patrón que `createInstance`. FK escalar null/'' MUST eliminarse del payload.

**Actor**: admin/user que edita un objeto desde la suite/MCP
**Layers**: backend (core resolver — `updateInstance`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: update de curriculum Minor (owner Institution) no crashea
- **GIVEN** un curriculum Minor con `institutionId` (relación requerida `institution`) y extensión `ext__`
- **WHEN** se actualiza un campo base (ej. `versionLabel`)
- **THEN** el update persiste sin error
- **AND** la relación `institution` se preserva (el `data` lleva `institution: { connect: { id } }`, no `institutionId` crudo)

#### Scenario: regresión — objetos sin FK base siguen actualizando igual
- **GIVEN** un objeto sin campos FK base en el payload
- **WHEN** se actualiza
- **THEN** comportamiento idéntico (la conversión es no-op cuando no hay FK presente)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: edita un Minor con owner Institución en la suite y el guardado funciona (sin el error "Valor inválido proporcionado. Ubicación: InstitutionId").

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 6 | Update curriculum owner Institution | Minor con institutionId + ext | update campo base | FK→connect, relación preservada | updated OK; `institution:{connect}`; sin `institutionId` crudo |

### REQ-OBSERVE-01: Observación del frente #2 (extensión RecordType en versión)

> **Que cambia**: nada se implementa necesariamente — se produce evidencia de si la v2 de un Curriculum Plan arrastra su extensión `rt__Plan__curriculum` atómicamente.
> **Por que**: el fix de workflow destraba el crash pero no garantiza que la v2 cargue `progression`/`totalCredits` (viven en la extensión RT); hay que saberlo para no declarar un cierre falso.

El sistema SHOULD ser observado end-to-end al versionar un Curriculum Plan: se MUST documentar si la v2 crea/arrastra su extensión `rt__Plan__curriculum` y si el write base+RT es atómico. Si NO lo hace, MUST levantarse el backlog B1 (path RT atómico) en vez de declarar "versionar curriculum" cerrado.

**Actor**: developer/reviewer (observación dirigida)
**Layers**: backend (core resolver + path RT)

<details><summary>Scenarios de validacion</summary>

#### Scenario: observar extensión RT en la v2
- **GIVEN** un Curriculum recordType Plan con su extensión `rt__Plan__curriculum` poblada (progression, totalCredits)
- **WHEN** se versiona (post-fix REQ-IMPL-01)
- **THEN** se inspecciona la v2 y se documenta: ¿existe su fila `rt__Plan__curriculum`? ¿con qué campos? ¿el write fue atómico?
- **AND** si falta o no es atómico → se registra backlog B1 con la evidencia

</details>

#### Acceptance
**El usuario puede verificar que funciona**: existe un hallazgo documentado (TC-5) en el ticket con el estado de la extensión RT en la versión, y una decisión registrada (cerrar vs backlog B1).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 5 | Observación extensión RT | Curriculum Plan con extensión poblada | versionar post-fix | inspeccionar v2 + atomicidad | hallazgo documentado + decisión backlog/cierre |

## Constraints

- **RULE-dev-004 / core_work_policy**: layer:core → el trabajo de `object-manager` va en la rama de épica core (`UPONE-1261-academic-program`), NO en `develop`; merge a develop gated por review del team up1. El git hook rechaza commits directos a develop/master.
- **DET-1 / DET-2**: el único item `build` (REQ-IMPL-01) es `confirmed` con source_ref en `version-from-source.js:54-88`.
- **TICKET-056**: el path RT (`rt__<RT>__curriculum`) no es atómico — restringe el alcance: la versión RT-aware NO se aborda aquí (frente #2 → backlog).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresión en versionado de activity (workflow) | low | high | TC-3/TC-4 unit preservan el path; `needsWorkflow=true` para activity por construcción |
| Cierre falso: v2 de curriculum sin campos de Plan | medium | medium | REQ-OBSERVE-01 / TC-5 observa la extensión RT antes de declarar cierre; backlog B1 si falta |
| Merge a develop conflictúa con sync/seed del working tree | low | low | el working tree de sync NO se commitea (solo el helper + test); commits acotados al execute_scope |

## Tasks

### Session 1 — Fix workflow-opcional + tests [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Aplicar Alt A en `prepareVersionData`: `needsWorkflow = !!initialStateField`; include condicional; 2 checks gateados; set condicional de `initialStateField`; ajustar JSDoc `@throws` | REQ-IMPL-01 | developer | — | object-manager/src/graphql/resolvers/helpers/version-from-source.js | vitest unit del helper | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T2 | Extender test unitario: caso "sin initialStateField" (no include workflow, no exige allowsVersioning, no setea estado, bump+linkage); preservar casos de activity | REQ-IMPL-01, REQ-PRESERVE-01 | developer | S1.T1 | object-manager/tests/unit/resolvers/version-from-source-helper.test.js | vitest run (TC-4 + regresión TC-3) | git revert | DET-7, DET-13 | done | 1 |
| S1.T3 | Smoke E2E: versionar un Curriculum Plan vía MCP/UI → v2 sin crash, Draft, encadenada (TC-1/TC-2); regresión activity version (TC-3) | REQ-IMPL-01, REQ-PRESERVE-01 | reviewer | S1.T2 | (runtime: object-manager :4000 + suite/MCP) | TC-1/TC-2/TC-3 verdes | (no aplica — verificación) | DET-7, DET-13 | done | 1 |
| S1.T4 | Fix update FK→connect en `updateInstance`: convertir FK escalares base (isBaseField+isForeignKey) a `{ relation: { connect } }` antes del update (mismo patrón que createInstance) | REQ-FIX-01 | developer | — | object-manager/src/graphql/resolvers/instance.resolver.js | unit + E2E update curriculum (TC-6) | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T5 | Test regresión del FK→connect en update + verificar suite resolvers sin regresión (542 tests) | REQ-FIX-01 | developer | S1.T4 | object-manager/tests/unit/resolvers/instance.resolver.test.js | vitest resolvers (TC-6 + 542 verdes) | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, correr vitest del helper + quality review (DET-23), commits por tipo (DET-27), decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Observación frente #2 (extensión RT) [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Versionar un Curriculum Plan con su extensión poblada; inspeccionar la v2: ¿crea `rt__Plan__curriculum`? ¿con progression/totalCredits? ¿write atómico? Documentar hallazgo (TC-5) | REQ-OBSERVE-01 | reviewer | S1.GATE | (runtime: object-manager :4000 + DB UPU); ticket (hallazgo) | TC-5 documentado con evidencia | (no aplica — observación) | DET-4, DET-13 | done | 2 |
| S2.T2 | Decidir build/backlog: si la extensión RT falta o no es atómica → confirmar backlog B1 (path RT atómico / TICKET-056) con evidencia; si está OK → marcar "versionar curriculum" completo | REQ-OBSERVE-01 | reviewer | S2.T1 | ticket (Backlog) | decisión registrada (dkc-record-decision) | (no aplica) | DET-13, DET-16, DET-17 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — persistir hallazgo + decisión, commits docs (DET-27), decidir continue/close | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 2 |

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Discriminar workflow por `initialStateField`, no por flag nuevo
- **Contexto**: cómo distinguir objetos con/sin workflow en `prepareVersionData`.
- **Drivers**: minimizar config nueva; reusar señal existente; un solo path de versionado.
- **Opcion elegida**: `needsWorkflow = !!initialStateField` (campo ya declarado por activity, ausente en curriculum).
- **Alternativas**: (a) flag explícito `hasWorkflow` en versioning — agrega config redundante; (b) detectar por nombre de objeto — frágil y acoplado. Descartadas.
- **Consecuencias**: cero config nueva; backward-compatible; el "gating desde qué estado versionar" se pierde para objetos sin workflow (aceptable — no tienen estado publicable).
- **Session**: design (S0).

### DEC-LOCAL-02: Frente #2 (extensión RT) se observa, no se arregla aquí
- **Contexto**: la v2 de curriculum podría no arrastrar `rt__Plan__curriculum`.
- **Drivers**: el fix de workflow es chico/bajo-riesgo; el path RT atómico es trabajo de core mayor (TICKET-056).
- **Opcion elegida**: observar en S2 y diferir a backlog B1 si aplica.
- **Alternativas**: resolver el path RT aquí — expande el alcance y mezcla dos frentes de core. Descartada.
- **Consecuencias**: el ticket entrega el destrabe del crash; "versionar curriculum end-to-end" puede requerir B1.
- **Session**: design (S0).

## Open questions

- ¿La v2 de un Curriculum Plan crea su extensión `rt__Plan__curriculum` atómicamente? → se resuelve en S2 (REQ-OBSERVE-01 / TC-5).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPL-01 y REQ-PRESERVE-01 pasan
- [ ] **Tests**: TC-1..TC-4 ejecutados con resultado real; unit nuevo verde; activity unit verde
- [ ] **Rules**: RULE-dev-004 respetada (rama de épica core, no develop)
- [ ] **Integration**: versionado de activity sin regresión
- [ ] **Observación**: REQ-OBSERVE-01 / TC-5 documentado + decisión backlog/cierre registrada
