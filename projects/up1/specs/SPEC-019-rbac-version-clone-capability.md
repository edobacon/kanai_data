---
id: SPEC-019-rbac-version-clone-capability
project: up1
ticket: TICKET-050
status: done
---

# RBAC por capability para versionar y clonar — declarable por objeto en el mod

# RBAC por capability para versionar y clonar — declarable por objeto en el mod

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive abajo (Requirements, Artifacts, Tasks).*

**Que se quiere**: hoy las acciones de **versionar** una Activity y **clonar** una BibliographyReference o una Modalidad se muestran u ocultan solo según el estado del workflow (`allowsVersioning`), igual para todos los usuarios — no hay control por permiso. Este ticket agrega esa dimensión: un **permiso RBAC por objeto** (`activity:version`, `bibliographyreference:clone`, `curricularsection:clone`) que gobierna quién ve la acción (UI) y quién puede ejecutarla (backend). Sigue la filosofía declarativa de up1: el mod declara la política, el core aporta un mecanismo genérico que la aplica solo si está presente.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Enforcement **opt-in declarativo**: el core lee `requiredCapability` de la metadata del objeto y enforce SOLO si está declarado; sin declaración → permite (como hoy) | Preserva la soberanía del mod y garantiza cero impacto colateral sobre los ~14 call-sites de creación scratch |
| 2 | `requiredCapability` se declara en **dos lugares con la misma capability-string**: el layout (gating UI) y la metadata del object definition (enforcement backend) | Defensa en profundidad — ocultar el botón no basta, la mutación directa también debe rechazarse |
| 3 | Capabilities **object-level** (sin RT-level): `curricularsection:clone` cubre todos los RecordType incluida Modalidad | Object-level se auto-asigna a los roles default; RT-level requeriría asignación manual en seed |

**Riesgos principales y como los mitigamos**:

- **El clone de Modalidad pasa por un bloque separado del resolver (L1)** → el check debe cubrir el path de objeto base **y** el bloque RecordType; se valida con un TC que clona una Modalidad sin la capability y exige rechazo (cobertura dual probada empíricamente, no asumida).
- **Romper flujos ajenos de creación (scratch)** → el opt-in declarativo limita el enforce a objetos que declaran `requiredCapability`; un unit test verifica que un `createInstance` scratch sin flags queda idéntico.
- **Activación requiere DB (sync + asignación a roles)** → el código (core) y las ediciones declarativas (mod) se completan y commitean local de forma autónoma; la activación DB-gated + validación UI/e2e queda como gate de standby explícito (no se fuerza un entorno DB en autopilot).

**Que NO se hace en este ticket** (limites del scope):

- No se crean vistas, pantallas ni componentes nuevos (solo se gatean row actions ya existentes — los declaró TICKET-044).
- No se agrega RT-level ni field-level RBAC para estas acciones (object-level alcanza).
- No se fuerza el enforce a objetos que no lo declaren (no es un "cierre de hueco" global — es opt-in).
- No se toca el gating por estado (`allowsVersioning`) — convive en serie con el de capability.

**Tamano estimado**: 2 sessions ejecutables (S1 core + S2 mod/activación), ~2-3h efectivas. La más riesgosa es **S1** (cambio en el resolver genérico del core, multi-repo, security).

**Como vas a saber que funciona**:

- Un usuario CON `activity:version` ve "Crear nueva versión" en una Activity versionable; uno SIN la capability NO la ve.
- Invocar la mutación `createInstance` con `asNewVersion` (o clone) sin la capability → rechazo por permiso, sin crear el registro.
- Un usuario CON `curricularsection:clone` puede duplicar una Modalidad; sin ella, "Duplicar" no aparece y la mutación directa se rechaza.
- Los tests unitarios de object-manager pasan, incluyendo el de regresión scratch.

---

## Purpose

Agregar control RBAC por capability a las acciones de versionar (Activity) y clonar (BibliographyReference, CurricularSection/Modalidad) del mod `curriculum-design`. El core object-manager gana un mecanismo genérico opt-in que lee `requiredCapability` de la metadata del objeto (`versioning.requiredCapability` / `prefillFrom.requiredCapability`) y la enforce en `createInstance` solo si está declarada; el mod declara la política (capabilities + metadata + gating UI). Defensa en profundidad: UI (layout `requiredCapability`) + backend (resolver check).

## Requirements

### REQ-01: Declarar y asignar capabilities object-level

> **Que cambia**: el mod gana 3 permisos nuevos — `activity:version`, `bibliographyreference:clone`, `curricularsection:clone` — que al correr el sync quedan creados y asignados a los roles default (Admin/Consultor/Colaborador).
> **Por que**: sin la capability declarada y asignada, el gating UI y el enforce backend no tienen contra qué evaluar.

El sistema MUST declarar en `mods/curriculum-design/capabilities.json` las capabilities `activity:version`, `bibliographyreference:clone` y `curricularsection:clone` con shape `{name, description, riskLevel}` y naming sin prefijo `mod/` (RULE-mods-037), de modo que `npm run sync` las cree en `core_Capability` y las asigne a los roles default.

**Actor**: system (sync) / admin (asignación)
**Layers**: config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: capabilities creadas y asignadas
- **GIVEN** las 3 capabilities declaradas en `capabilities.json`
- **WHEN** se corre `npm run sync`
- **THEN** existen en `core_Capability` y `assignNewCapabilitiesToDefaultRoles` las asigna a Admin/Consultor/Colaborador con `defaultValue: 'allow'`

#### Scenario: naming sin prefijo mod/
- **GIVEN** una capability object-level
- **WHEN** se valida su `name`
- **THEN** es `activity:version` (no `mod/curriculum-design:version`) — RULE-mods-037

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, en el panel de roles las 3 capabilities aparecen otorgadas a los roles default.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Sync crea caps | 3 caps en json | `npm run sync` | filas en core_Capability | 3 caps presentes |
| 2 | Auto-asignación | caps object-level sin `.` | sync | role_capabilities | allow en 3 roles default |

### REQ-02: Gating UI de los row actions por capability

> **Que cambia**: los botones "Crear nueva versión" (Activity) y "Duplicar" (BibliographyReference, Modalidad, CustomSection) se ocultan si el usuario no tiene la capability correspondiente.
> **Por que**: hoy se muestran a todos según solo el estado; falta el filtro por permiso de usuario.

El sistema MUST agregar `requiredCapability` a los row actions de versionar/clonar en los layouts del mod, de modo que `isActionVisible` oculte la acción para usuarios sin la capability, evaluado en serie con las `visibilityConditions` por estado existentes.

**Actor**: user
**Layers**: frontend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: usuario con capability ve el botón
- **GIVEN** Activity con `allowsVersioning=true` y usuario con `activity:version`
- **WHEN** se renderiza la lista
- **THEN** "Crear nueva versión" es visible

#### Scenario: usuario sin capability no ve el botón
- **GIVEN** misma Activity y usuario sin `activity:version`
- **WHEN** se renderiza la lista
- **THEN** "Crear nueva versión" está oculta

#### Scenario: capability presente pero estado no permite (serie)
- **GIVEN** usuario con `activity:version` y Activity en estado con `allowsVersioning=false`
- **WHEN** se renderiza la lista
- **THEN** "Crear nueva versión" sigue oculta (capability AND estado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: dos usuarios (uno con, uno sin la capability) ven distinta disponibilidad del botón sobre el mismo registro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Gating versionar | user con/sin `activity:version` | render lista Activity | botón version | visible / oculto |
| 2 | Gating clonar BibRef | user con/sin `bibliographyreference:clone` | render lista | "Duplicar" | visible / oculto |
| 3 | Serie cap+estado | user con cap, estado bloquea | render | botón | oculto |

### REQ-03: Mecanismo genérico de enforcement backend opt-in

> **Que cambia**: el core `createInstance` aprende a leer `requiredCapability` de la metadata del objeto y a rechazar la mutación si el usuario no la tiene — solo cuando el objeto lo declara.
> **Por que**: ocultar el botón no protege la mutación directa (API/GraphQL); el backend debe enforzar, y solo el core puede hacerlo sobre su resolver genérico.

El sistema MUST, en `createInstance`, leer `requiredCapability` desde `versioningConfig.versioning.requiredCapability` (path `asNewVersion`) y desde `versioningConfig.prefillFrom.requiredCapability` (path clone) y, si está presente, invocar `checkCapability(context, [requiredCapability])` ANTES de cualquier escritura a DB, publicación de eventos o audit. Si NO está declarado, MUST permitir la operación (comportamiento actual). El check MUST cubrir el path de versionar, el path de clone de objeto base **y** el bloque de clone de RecordType/Modalidad.

**Actor**: system (resolver) / user (autorizado)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: enforce cuando declarado y falta capability
- **GIVEN** Activity con `versioning.requiredCapability: activity:version` y usuario sin la cap
- **WHEN** `createInstance({asNewVersion:true, prefillFrom})`
- **THEN** lanza error de permiso; no se crea v2; no hay eventos ni audit

#### Scenario: permite cuando NO declarado (opt-in)
- **GIVEN** un objeto sin `requiredCapability` en su metadata
- **WHEN** `createInstance` con o sin flags
- **THEN** se comporta idéntico a hoy (solo `withObjectAuth('create')`)

#### Scenario: cobertura dual — clone de Modalidad (RecordType)
- **GIVEN** CurricularSection con `prefillFrom.requiredCapability: curricularsection:clone`, RT Modalidad, usuario sin la cap
- **WHEN** `createInstance({prefillFrom:{source}})` sobre la Modalidad
- **THEN** lanza error de permiso (el bloque RecordType también está cubierto)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: invocar la mutación de versionar/clonar sin la capability (vía GraphQL directo) devuelve error de autorización y no persiste nada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Enforce version | cap declarada, user sin cap | createInstance asNewVersion | throw permiso | sin v2 creada |
| 2 | Opt-in permite | sin requiredCapability | createInstance | sin check | crea normal |
| 3 | Cobertura dual RT | cap declarada, user sin cap | clone Modalidad | throw permiso | sin clon |
| 4 | Autorizado pasa | cap declarada, user con cap | createInstance | check pasa | crea ok |

### REQ-04: Activar la política declarando requiredCapability en la metadata de los objetos

> **Que cambia**: los object definitions de Activity, BibliographyReference y CurricularSection declaran la capability que protege su versionado/clonado.
> **Por que**: es lo que enciende el mecanismo opt-in de REQ-03 para estos 3 objetos concretos.

El sistema MUST declarar `requiredCapability` en la metadata fuente del mod: `versioning.requiredCapability: activity:version` en `activity.json`, `prefillFrom.requiredCapability: bibliographyreference:clone` en `BibliographyReference.json`, y `prefillFrom.requiredCapability: curricularsection:clone` en `CurricularSection.json`, de modo que el sync lo propague a `core_ObjectDefinition.versioningConfig` (que el resolver lee).

**Actor**: system
**Layers**: config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: metadata propagada al registry
- **GIVEN** `requiredCapability` declarada en los 3 objects del mod
- **WHEN** se corre el merge sync + codegen
- **THEN** `core_ObjectDefinition.versioningConfig.{versioning|prefillFrom}.requiredCapability` contiene la capability esperada

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras el sync, la columna `versioningConfig` de los 3 objetos contiene su `requiredCapability`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Activity version cap | activity.json con cap | sync+codegen | versioningConfig.versioning | `activity:version` |
| 2 | BibRef clone cap | bibref.json con cap | sync | versioningConfig.prefillFrom | `bibliographyreference:clone` |
| 3 | CurricularSection clone cap | curricularsection.json | sync | versioningConfig.prefillFrom | `curricularsection:clone` |

### REQ-PRESERVE-01: Cero impacto en creación scratch y en el gating por estado

> **Que cambia**: nada para los flujos que no declaran `requiredCapability` ni para el gating por estado.
> **Por que**: el cambio es aditivo y opt-in; cualquier regresión en los ~14 call-sites scratch o en `allowsVersioning` sería un defecto.

El sistema MUST preservar el comportamiento actual de todos los `createInstance` que NO pasan `asNewVersion` ni `prefillFrom.source` (creación scratch: enrollment, recurrence, calendar, RecordDetail/forms, import, bulk, AI agent, n8n), y MUST preservar el gating por `currentstatus.allowsVersioning` existente, que opera en serie con el nuevo gating por capability.

**Actor**: system
**Layers**: backend, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: scratch sin flags intacto
- **GIVEN** un `createInstance` sin `asNewVersion` ni `prefillFrom.source`
- **WHEN** se ejecuta
- **THEN** no se evalúa ningún `requiredCapability` de versioning/prefillFrom; comportamiento idéntico a hoy

#### Scenario: gating por estado preservado
- **GIVEN** usuario con `activity:version` y Activity en estado no versionable
- **WHEN** render
- **THEN** botón oculto por `allowsVersioning` (regresión TICKET-044)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Scratch intacto | createInstance sin flags | ejecutar | sin check capability | crea normal |
| 2 | Estado preservado | cap presente, estado bloquea | render | botón | oculto |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Enforcement server-side de versionar/clonar (defense-in-depth, no solo UI) | mutación directa sin capability | rechazada (throw antes de DB/eventos/audit) |

## Artifacts

### Capabilities (capabilities.json — METASPEC-json-object)

| name | description | riskLevel |
|------|-------------|-----------|
| `activity:version` | Permite crear una nueva versión de una Activity | medium |
| `bibliographyreference:clone` | Permite duplicar una referencia bibliográfica | low |
| `curricularsection:clone` | Permite duplicar una sección curricular (incluye Modalidad y CustomSection) | medium |

### Object metadata (declaración opt-in — METASPEC-json-object)

| Object (fuente mod) | Bloque | Campo nuevo | Valor |
|---------------------|--------|-------------|-------|
| `mods/curriculum-design/objects/activity.json` | `metadata.versioning` | `requiredCapability` | `activity:version` |
| `mods/curriculum-design/objects/BibliographyReference.json` | `metadata.prefillFrom` | `requiredCapability` | `bibliographyreference:clone` |
| `mods/curriculum-design/objects/CurricularSection.json` | `metadata.prefillFrom` | `requiredCapability` | `curricularsection:clone` |

### Layouts (row actions — METASPEC-layout-config)

| Layout | Row action (id) | Campo nuevo | Valor |
|--------|-----------------|-------------|-------|
| `config/layouts/default_Activity_list.json` | `create-new-version` | `requiredCapability` | `activity:version` |
| `config/layouts/default_BibliographyReference_list.json` | `duplicate` | `requiredCapability` | `bibliographyreference:clone` |
| `config/layouts/default_Activity_edit.json` | `duplicate-modality` | `requiredCapability` | `curricularsection:clone` |
| `config/layouts/default_Activity_edit.json` | `duplicate-customsection` | `requiredCapability` | `curricularsection:clone` |

### Resolver (METASPEC-graphql-resolver)

| File | Cambio |
|------|--------|
| `object-manager/src/graphql/resolvers/instance.resolver.js` | Import de `checkCapability`; check opt-in en path version (tras lectura de `versioningConfig`) y en path clone (tras `resolveEffectivePrefillFrom`), cubriendo objeto base + bloque RecordType |
| `object-manager/src/graphql/helpers/prefill-from-source.js` | (si necesario) surface de `requiredCapability` en el retorno de `resolveEffectivePrefillFrom` |
| `object-manager/tests/unit/resolvers/instance.resolver.test.js` | Tests del enforcement opt-in + regresión scratch |

## Tasks

### Session 1 — Core object-manager: mecanismo genérico opt-in de enforcement + unit tests [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Importar `checkCapability` (y/o `hasCapability`) en el resolver desde `services/auth/authChecker.js` (via withAuth.js o import directo) | REQ-03 | developer | — | object-manager/src/graphql/resolvers/instance.resolver.js | lint + build | git revert | DET-5, DET-8, DET-11 | done | 1 |
| S1.T2 | Check opt-in en path versionar: tras leer `versioningConfig` (asNewVersion), si `versioningConfig.versioning.requiredCapability` presente → `checkCapability(context,[cap])` antes de cualquier write | REQ-03 | developer | S1.T1 | object-manager/src/graphql/resolvers/instance.resolver.js | vitest unit (instance.resolver) | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T3 | Check opt-in en path clonar: surface `requiredCapability` desde `resolveEffectivePrefillFrom` y enforce tras resolverlo; cubrir objeto base **y** bloque RecordType/Modalidad (cobertura dual L1) | REQ-03 | developer | S1.T1 | object-manager/src/graphql/resolvers/instance.resolver.js, object-manager/src/graphql/helpers/prefill-from-source.js | vitest unit | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T4 | Unit tests: (a) enforce version+clone cuando declarado y falta cap → throw; (b) permite cuando NO declarado; (c) regresión scratch sin flags intacto; (d) cobertura dual clone de Modalidad | REQ-03, REQ-PRESERVE-01 | developer | S1.T2, S1.T3 | object-manager/tests/unit/resolvers/instance.resolver.test.js | vitest run tests/unit/ | git revert | DET-4, DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — correr vitest unit de object-manager + coverage delta, persistir resultados en `## Sessions` del ticket (Template de Gate), quality review (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

### Session 2 — Mod curriculum-design: capabilities + metadata + UI gating + activación/validación [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar 3 capabilities a `capabilities.json` (`activity:version` medium, `bibliographyreference:clone` low, `curricularsection:clone` medium) con shape `{name,description,riskLevel}`, naming sin prefijo `mod/` | REQ-01 | developer | S1.GATE | mods/curriculum-design/capabilities.json | JSON lint + naming RULE-mods-037 | git revert | DET-1, DET-2, RULE-mods-037 | done | 2 |
| S2.T2 | Declarar `requiredCapability` en metadata de los 3 objects del mod (activity→versioning, BibliographyReference→prefillFrom, CurricularSection→prefillFrom) | REQ-04 | developer | S1.GATE | mods/curriculum-design/objects/activity.json, mods/curriculum-design/objects/BibliographyReference.json, mods/curriculum-design/objects/CurricularSection.json | JSON lint | git revert | DET-2, DET-16 | done | 2 |
| S2.T3 | Agregar `requiredCapability` a los 4 row actions de versionar/clonar en los layouts (Activity_list, BibliographyReference_list, Activity_edit ×2) | REQ-02 | developer | S1.GATE | mods/curriculum-design/config/layouts/default_Activity_list.json, mods/curriculum-design/config/layouts/default_BibliographyReference_list.json, mods/curriculum-design/config/layouts/default_Activity_edit.json | JSON lint + RULE-platform-006 | git revert | DET-2, RULE-platform-006 | done | 2 |
| S2.T4 | Activación DB-gated + validación e2e/UI: correr `npm run capabilities:generate` + `npm run sync` (crea caps, asigna a roles, propaga metadata a registry); validar UI con/sin capability (TC-1, TC-2) y rechazo backend (TC-3); registrar evidencia (DET-25) | REQ-01, REQ-02, REQ-04 | reviewer | S2.T1, S2.T2, S2.T3 | (entorno up1 + DB) | sync ok + e2e/manual UI + GraphQL directo | (no aplica — validación) | DET-13, DET-25 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — consolidar evidencia de TCs en el ticket (DET-25), regresión (gating por estado + scratch), quality review (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23, DET-25 | done | 2 |

### Task contract — detalle

```
Task S1.T2: Check opt-in en path versionar
- source_ref: REQ-03
- agent: developer
- files: object-manager/src/graphql/resolvers/instance.resolver.js
- precondition: S1.T1 (checkCapability importado); versioningConfig ya se lee ~L2317-2327
- expected_output: si versioningConfig.versioning.requiredCapability presente → checkCapability(context,[cap]) ANTES de finalizeCreate/eventos/audit; si ausente → comportamiento actual
- validation: vitest unit instance.resolver (caso enforce + caso opt-in permite)
- rollback: git revert
- rules: [DET-5, DET-8, DET-16]

Task S1.T3: Check opt-in en path clonar (cobertura dual)
- source_ref: REQ-03
- agent: developer
- files: object-manager/src/graphql/resolvers/instance.resolver.js, object-manager/src/graphql/helpers/prefill-from-source.js
- precondition: S1.T1; resolveEffectivePrefillFrom lee versioningConfig.prefillFrom
- expected_output: requiredCapability surfaced desde resolveEffectivePrefillFrom; enforce tras L2300 cubriendo objeto base; verificar empíricamente (TC-3 de S1.T4) que el bloque RecordType/Modalidad (~L2395) queda cubierto — si el check post-L2300 no lo alcanza, agregar segundo check en el bloque RT
- validation: vitest unit + TC cobertura dual
- rollback: git revert
- rules: [DET-5, DET-8, DET-16]

Task S2.T4: Activación DB-gated + validación
- source_ref: REQ-01, REQ-02, REQ-04
- agent: reviewer
- files: entorno up1 (DB) — sin edición de código
- precondition: S2.T1/T2/T3 commiteados; entorno up1 levantado con DB
- expected_output: caps creadas+asignadas; versioningConfig propagado; UI gateada con/sin cap; mutación directa sin cap rechazada
- validation: npm run sync OK + e2e/manual UI + GraphQL directo (TC-1..TC-3)
- rollback: (no aplica — validación; revertir sync re-corriendo con metadata previa)
- rules: [DET-13, DET-25]
- NOTA AUTOPILOT (super): esta task es DB-gated. Si el entorno DB no está disponible en la corrida autónoma, el código y las ediciones declarativas (S1 + S2.T1/T2/T3) se commitean local y S2.T4 queda como gate de standby — el dev corre el sync + validación UI/e2e y aprueba el push. No se fuerza un entorno DB en autopilot.
```

## Constraints

- RULE-mods-037: capabilities object-level sin prefijo `mod/` — aplica al naming de las 3 nuevas capabilities.
- RULE-dev-004: layer:mod → repo `mods/curriculum-design` rama `UPONE-1038`; layer:core → repo `object-manager` rama `UPONE-1206`. Este ticket toca ambos.
- RULE-platform-006: layout filenames PascalCase — aplica a los `default_*` editados (sin renombrar, solo edición).
- DEC-LOCAL-01 (abajo): enforcement opt-in declarativo (decisión 3 del intake, formalizada).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-018 / TICKET-044 (UPONE-1216) | internal | Los row actions de versionar/clonar deben existir ya en los layouts (los declaró TICKET-044) | Si TICKET-044 no cerró su parte, los row actions pueden no estar o cambiar; coordinar — este ticket agrega `requiredCapability` encima |
| `checkCapability` (authChecker.js) | internal | Helper de verificación de capability por string | Bajo — existe y es estable |
| Entorno DB up1 + sync | internal | Activación de capabilities y propagación de metadata requieren DB | Medio — DB-gated; mitigado con gate de standby |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El check post-L2300 no cubre el bloque RecordType/Modalidad (clone de Modalidad se escapa) | medium | high (hueco de seguridad) | TC de cobertura dual (S1.T4) que clona Modalidad sin cap y exige rechazo; si falla, segundo check en bloque RT |
| Romper flujos scratch ajenos | low | high | Opt-in declarativo + unit test de regresión scratch (S1.T4) |
| `resolveEffectivePrefillFrom` filtra `requiredCapability` y no llega al resolver | medium | medium | S1.T3 hace surface explícito del campo + test verifica que llega |
| TICKET-044 cambia los row actions en paralelo (mismo Jira) | low | medium | Coordinar; los cambios de este ticket son aditivos (`requiredCapability`), no reescriben el row action |

## Open questions

- [x] ~~Confirmar que `npm run sync` propaga `requiredCapability` dentro de `versioningConfig.{versioning|prefillFrom}` sin filtrarlo~~ — **RESUELTA (análisis estático, S2)**: ni `applyModToObject` (fileSync.js:817 — copia `metadata[key]` completo por asignación directa) ni `syncVersioningConfigToRegistry` (generatePrismaSchema.js:2575 — asigna `{ versioning, prefillFrom }` sin pick de claves) hacen whitelist de claves internas. `requiredCapability` sobrevive la cadena sin cambio adicional. Resta solo la verificación live (correr el sync contra DB) en S2.T4.

## Decisions

### DEC-LOCAL-01: Enforcement opt-in declarativo con soberanía del mod
- **Contexto**: cómo aplicar el RBAC server-side a versionar/clonar sin romper los ~14 call-sites de creación scratch.
- **Drivers**: cero impacto colateral (H4/L1), autonomía del mod, filosofía declarativa de up1.
- **Opcion elegida**: el core lee `requiredCapability` de `versioningConfig.{versioning|prefillFrom}` y enforce SOLO si está presente; sin declaración → permite (como hoy). La ausencia no genera warning/error del validador.
- **Alternativas**: enforce incondicional (rechazado — rompería adoptantes futuros y quitaría soberanía al mod); warning build-time si no se declara (rechazado — viola la autonomía del mod).
- **Consecuencias**: gana cero colateral + extensibilidad declarativa; pierde la garantía de "todo objeto protegido por default" (decisión consciente — proteger o no es del mod).
- **Session**: intake (2026-06-03), formalizada en design (2026-06-04).

### DEC-LOCAL-02: requiredCapability se declara en el object metadata (no en el layout) para el enforcement
- **Contexto**: dónde declarar la capability que el backend lee.
- **Drivers**: el resolver ya lee `versioningConfig.{versioning|prefillFrom}` del registry; el layout es solo trigger UI.
- **Opcion elegida**: backend lee de `metadata.{versioning|prefillFrom}.requiredCapability` (object definition del mod, propagado a `core_ObjectDefinition`); el layout declara su propio `requiredCapability` para el gating UI (misma capability-string, distinta capa).
- **Alternativas**: declarar solo en el layout y que el backend lea el layout (rechazado — el resolver no consume layouts; acoplamiento indebido).
- **Consecuencias**: dos declaraciones de la misma string (una por capa); defensa en profundidad limpia, cada capa con su fuente natural.
- **Session**: design (2026-06-04).

## Success metrics

(No aplican métricas de negocio post-deploy para este cambio — es control de acceso. La validación es funcional, ver Acceptance.)

## Technical reference

- **Resolver**: `object-manager/src/graphql/resolvers/instance.resolver.js` (~5280 líneas). Path versionar: `asNewVersion` guard ~L2285-2327 (lee `versioningConfig.versioning`). Path clonar: `resolveEffectivePrefillFrom` ~L2300 (lee `versioningConfig.prefillFrom`); bloque RecordType/Modalidad ~L2357-2414. Todos los writes en `finalizeCreate` (~L2977+); `withEventPublish` publica DESPUÉS del resolver → throw de permiso pre-write es seguro.
- **Capability check**: `checkCapability(context, requiredCaps[])` (throws) / `hasCapability(context, requiredCaps, resourceId?)` (bool) en `object-manager/src/services/auth/authChecker.js` (L46 / L186). Itera `context.user.roleAssignments[*].role.roleCapabilities` con `defaultValue === 'allow'`.
- **Sync**: `npm run sync` (`object-manager/scripts/sync/dbSync.js`) lee `mods/{mod}/capabilities.json` y `assignNewCapabilitiesToDefaultRoles` → Admin/Consultor/Colaborador. Caps sin `.` en el prefijo se auto-asignan. `npm run capabilities:generate` cubre object/system-level del registry.
- **Metadata → registry**: `mods/curriculum-design/objects/*.json` (metadata `versioning`/`prefillFrom`) → merge sync (`fileSync.js:mergeObjectFromMods`) → `objects/business/Base/*.json` → `syncVersioningConfigToRegistry` (`generatePrismaSchema.js`) → `core_ObjectDefinition.versioningConfig`.
- **Tests**: `object-manager/tests/unit/resolvers/instance.resolver.test.js` (mockea `withAuth.js`); e2e: `tests/e2e/version-asnewversion.test.js`, `clone-activity-polymorphic.test.js`, `clone-direct-children.test.js`.
- **Layouts con requiredCapability (referencia)**: `mods/hello-world-mod/config/layouts/hw-assessment-list.json:27` (`"requiredCapability": "hwintervention:create"`).

## Rules discovered

- RULE-core-020: Gating RBAC de versionar/clonar — opt-in declarativo via `requiredCapability` en metadata + un solo check upstream del RecordType branch (promovida desde L2).

## Bugs found

(ninguno)

## Acceptance checkpoints

- [x] **Funcional**: REQ-01 (caps creadas+asignadas, DB UPU), REQ-02 (UI gating live TC-1/TC-2), REQ-03 (enforcement 87/87 unit + UI), REQ-PRESERVE-01 (scratch unit + TC-4 estado). REQ-04 declarado+commiteado; propagación a registry pendiente (codegen, backlog B1)
- [x] **Tests**: 4 unit tests de object-manager (enforce version/clone + cobertura dual RT + regresión scratch) — 87/87 vitest
- [x] **NFRs**: mutación directa sin capability rechazada (security) — unit-proven; confirmación live en B1
- [x] **Rules**: RULE-mods-037 (naming sin prefijo mod/) ✓, RULE-dev-004 (object-manager UPONE-1206 / curriculum-design UPONE-1038) ✓, RULE-platform-006 (sin rename de layouts) ✓
- [x] **Integration**: gating por estado (`allowsVersioning`) preservado (TC-4) + scratch sin regresión (unit) — reviewer aislado de cierre approve
- [ ] **Docs**: `object-manager/docs/features/custom-capabilities.md` no actualizado — diferido (RULE-core-020 documenta el patrón en KB; doc del repo opcional, no bloqueante)

## Archiving

Usar `/dkc-archive-spec SPEC-019-rbac-version-clone-capability "razon"` cuando deje de ser fuente de verdad. No borrar manualmente.
