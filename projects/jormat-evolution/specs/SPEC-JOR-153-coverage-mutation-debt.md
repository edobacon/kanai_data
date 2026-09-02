---
id: SPEC-JOR-153-coverage-mutation-debt
project: jormat-evolution
ticket: JOR-153
status: in_progress
---

# Cerrar deuda de coverage/mutation backend: update-parcial, setFailure mal etiquetado, mutantes users-admin

# Cerrar deuda de coverage/mutation backend: update-parcial, setFailure mal etiquetado, mutantes users-admin

## Executive summary - lo que estas aprobando

**Que se quiere**: cerrar tres items de deuda de testing backend registrados en backlogs previos (JOR-151 B1, JOR-151 B2, rbac BL-02). Es trabajo **test-only**: cero cambio de codigo de produccion, salvo que el analisis revele un bug real (no fue el caso).

**Los items que se cierran**:
- **B1** (JOR-151 backlog) — las ramas "setear campo opcional en update parcial" de `catalogos-repuestos.buildPatch` y `trucks.updateToColumns` nunca se ejercitan. Se agregan tests de update parcial (un test por builder) que asertan el campo tocado y los campos no-tocados preservados.
- **B2** (JOR-151 backlog) — el test `setFailure` (`items-write.e2e-spec.ts:~407`) usa `'99999999'` (no-uuid), re-ejercitando el guard de formato en vez de la rama "uuid valido pero inexistente" que su nombre promete. Se separa en dos tests, espejo del fix ya aplicado en `setPriority` (JOR-151).
- **BL-02** (rbac backlog) — 7 mutantes sobrevivientes en `users-admin.service.ts` (`SORTABLE_COLUMNS`/`DEFAULT_SORT`). Requiere una suite e2e con DB real (Capa C) que solo un e2e puede ejercitar.

**Decisiones criticas**:

| Decision | Racional |
|----------|----------|
| Mutation testing de la capa e2e queda fuera de config, no de test | `stryker.conf.json` no corre `*.e2e-spec.ts`. Los tests nuevos matan los 7 mutantes en runtime real, pero `dkc-mutate` seguira reportandolos survivor hasta extender la config. Reconfigurar stryker es un cambio de infra, no de test — se registra como backlog `should`, no se hace en este ticket |
| B1 con integration (no unit con repo mockeado) | Un mock consagraria el bug de runtime (feedback del proyecto); el valor esta en ejercitar el UPDATE real con un solo campo opcional |
| B2 split en dos tests, no reemplazo de uno solo | El test original (`'99999999'`) SI cubre una rama real (guard de formato); no se descarta, se le agrega el hermano que cubre la rama que su nombre prometia |

**Riesgos y mitigacion**:
- *Falso verde por test que no ejercita la rama objetivo* (patron ya visto en JOR-151 G3/Discovery-03): cada test se valida verificando que el campo/columna/mutante pasa de no-ejercitado a ejercitado, no solo que el assert pasa.
- *Sort con datos indistinguibles*: sembrar 4 usuarios donde las 4 columnas ordenables y el default sean todos distinguibles entre si (L2).
- *Regresion en suites vecinas*: se corre la suite completa (unit + e2e) antes de cerrar.

**Que NO se hace**: ningun cambio de codigo de produccion (`users-admin.service.ts`, `catalogos-repuestos.service.ts`, `trucks.service.ts` no se tocan). No se reconfigura `stryker.conf.json` para incluir `*.e2e-spec.ts` (backlog `should`, item B1). No se toca el test twin de `setFailure` en `:428` (backlog `could`, item B2, fuera del source_ref literal del ticket).

**Tamano estimado**: 1 session (S1), tier T2. 4 tasks independientes (archivos disjuntos).

**Como vas a saber que funciona**: `npm run test` (719 pass) + `npm run test:e2e` (236 pass, +4 vs baseline 232) verdes; `tsc` clean; `git diff --name-only` solo 4 archivos `*.spec.ts`/`*.e2e-spec.ts`, 0 produccion.

## Purpose

Subir la cobertura y mutation-kill real de tres huecos preexistentes de `backend/jormat-api`, sin cambiar comportamiento de produccion:
1. Ramas TRUE de update-parcial en `buildPatch`/`updateToColumns` (JOR-151 B1).
2. Test mal etiquetado de `setFailure` (JOR-151 B2, mismo patron que el ya corregido en `setPriority`).
3. Mutantes sobrevivientes de sort en `users-admin.service.ts` (rbac BL-02).

Para el equipo backend: una regresion en el update parcial de catalogos/camiones, en el guard de `setFailure`, o en el orden/default de la tabla de usuarios deja de pasar silenciosa.

## Requirements (delta)

### REQ-1: e2e de update parcial (B1)

> **Que cambia**: `catalogos-repuestos.buildPatch` y `trucks.updateToColumns` pasan a tener un test cada uno que ejercita la rama TRUE de "setear un campo opcional en update parcial", asertando que el campo tocado cambia y los no-tocados se preservan.
> **Por que**: hoy esas ramas nunca se ejercitan (JOR-151 backlog B1); un update parcial real (solo un campo) es un caso de uso comun y una regresion ahi (ej. pisar campos no enviados) hoy no se detecta.

El sistema MUST tener cobertura de integracion de `buildPatch` (aplicaciones, categorias, proveedores) y de `updateToColumns` (patent, chassis, year, brand, motorNumber) que, para cada campo opcional, actualice SOLO ese campo y verifique que (a) el campo tocado refleja el nuevo valor y (b) los demas campos preservan su valor original.

<details><summary>Scenarios de validacion</summary>

#### Scenario: update parcial en `buildPatch` (catalogos-repuestos)
- **GIVEN** un catalogo de repuestos sembrado con `aplicaciones`, `categorias` y `proveedores` con valores conocidos
- **WHEN** se llama `buildPatch`/el update real enviando solo `aplicaciones` (o solo `categorias`, o solo `proveedores`) por separado
- **THEN** el campo enviado queda actualizado con el nuevo valor; los campos no enviados preservan su valor original (rama TRUE de cada builder ejercitada, no la rama `undefined`)

#### Scenario: update parcial en `updateToColumns` (trucks)
- **GIVEN** un camion sembrado con `patent`, `chassis`, `year`, `brand`, `motorNumber` con valores conocidos
- **WHEN** se llama `updateToColumns`/el update real enviando un solo campo opcional por vez
- **THEN** el campo enviado queda actualizado; los demas preservan su valor original

</details>

### REQ-2: split del test `setFailure` (B2)

> **Que cambia**: el test `setFailure` (`items-write.e2e-spec.ts:~407`) se separa en dos: uno con un uuid valido-inexistente (rama UPDATE-0-filas real) y otro con un id no-uuid (guard de formato, comportamiento ya cubierto pero ahora nombrado y aislado correctamente).
> **Por que**: el test original usa `'99999999'` (no-uuid), por lo que su nombre ("id inexistente") no corresponde a la rama que ejercita (guard de formato). Mismo mal etiquetado que se corrigio en `setPriority` (JOR-151 Discovery-03).

El sistema MUST tener dos tests de `setFailure`: (a) con un uuid sintacticamente valido pero inexistente en la tabla, verificando que devuelve `false` por la rama UPDATE-0-filas; y (b) con un id no-uuid, verificando que el guard de formato corta antes de tocar Postgres. Ambos deben devolver `false`/404 segun corresponda, sin error crudo de Postgres.

<details><summary>Scenarios de validacion</summary>

#### Scenario: uuid valido-inexistente
- **GIVEN** un uuid sintacticamente valido que no existe en `items`
- **WHEN** se llama `setFailure(uuid-inexistente, workspace, true)`
- **THEN** devuelve `false` (rama UPDATE afecta 0 filas), distinta de la rama del guard de formato

#### Scenario: id no-uuid (guard de formato)
- **GIVEN** un id que no matchea el formato uuid (ej. `'99999999'`)
- **WHEN** se llama `setFailure('99999999', workspace, true)`
- **THEN** devuelve `false` por el guard de formato, sin llegar a ejecutar el UPDATE contra Postgres

</details>

### REQ-3: e2e de sort de `users-admin` (BL-02)

> **Que cambia**: nace un e2e (`users-admin.e2e-spec.ts`) que lista usuarios ordenando por cada columna soportada (`SORTABLE_COLUMNS`) y por el default (`DEFAULT_SORT`), ademas de un caso de fallback (`sortBy` no-whitelisted).
> **Por que**: `users-admin.service.ts` (`SORTABLE_COLUMNS`/`DEFAULT_SORT`, L16-17) tiene 7 mutantes sobrevivientes (rbac BL-02) porque nunca hay un e2e con DB real que ejercite el sort — solo asi se distingue un `StringLiteral` mutado de `SORTABLE_COLUMNS`, un `ArrayDeclaration` truncado, o un `DEFAULT_SORT.column`/`direction` alterado.

El sistema MUST tener un e2e de `users-admin` con 4 usuarios sembrados cuyos `email`, `name`, `role` y `created_at` sean todos mutuamente distinguibles, que verifique: (a) sort por cada columna de `SORTABLE_COLUMNS` (`email`, `name`, `role`, `created_at`) devuelve el array exacto en el orden esperado; (b) sin `sortBy` explicito, se aplica `DEFAULT_SORT` (columna + direccion); (c) un `sortBy` fuera de la whitelist cae al default (fallback), no a un error ni a un sort arbitrario.

<details><summary>Scenarios de validacion</summary>

#### Scenario: sort por cada columna ordenable
- **GIVEN** 4 usuarios sembrados con `email`/`name`/`role`/`created_at` distintos entre si
- **WHEN** se lista con `sortBy=email`, luego `name`, luego `role`, luego `created_at` (cada uno asc y desc si aplica)
- **THEN** el array devuelto es exactamente el orden esperado para esa columna (no solo el mismo largo)

#### Scenario: default sort
- **GIVEN** los mismos 4 usuarios
- **WHEN** se lista sin `sortBy`
- **THEN** el orden corresponde exactamente a `DEFAULT_SORT.column` + `DEFAULT_SORT.direction`

#### Scenario: fallback ante columna no-whitelisted
- **GIVEN** los mismos 4 usuarios
- **WHEN** se lista con `sortBy=algo-no-soportado`
- **THEN** el sistema cae al `DEFAULT_SORT` (mismo orden que el scenario anterior), sin error 500 ni sort arbitrario

</details>

### REQ-PRESERVE-01: sin regresion en las suites existentes

> **Que cambia**: nada de comportamiento; se garantiza que agregar estos 4 tests no rompe las suites vecinas.

El sistema MUST mantener verdes `npm run test` y `npm run test:e2e` tras agregar los 4 tests nuevos.

## Changes

### Added: test artifacts (test-only, cero produccion)

| Artefacto | Archivo | Cubre |
|-----------|---------|-------|
| test update-parcial `buildPatch` | spec de `catalogos-repuestos` (repo/service) | REQ-1 |
| test update-parcial `updateToColumns` | spec de `trucks` (repo/service) | REQ-1 |
| split `setFailure` (uuid-inexistente + no-uuid) | `test/e2e/items-write.e2e-spec.ts` | REQ-2 |
| e2e nuevo `users-admin` (sort + default + fallback) | `test/e2e/users-admin.e2e-spec.ts` | REQ-3 |

Ningun archivo de `src/` de produccion se modifica.

## Tasks

### Session 1 - Cerrar B1/B2/BL-02 [tier: T2]

parallel_groups: [[S1.T1, S1.T2, S1.T3, S1.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | B1: test de update parcial de `catalogos-repuestos.buildPatch` — un campo opcional a la vez (aplicaciones/categorias/proveedores), assert campo tocado + no-tocados preservados | REQ-1 | developer | — | backend/jormat-api spec de `catalogos-repuestos` | `npm run test:e2e -- catalogos-repuestos` (o unit/integration equivalente) verde; coverage scoped muestra la rama TRUE de `buildPatch:146-148` cubierta | git revert | DET-7, DET-13, RULE-testing-coverage-granularity-005 | done | 1 |
| S1.T2 | B1: test de update parcial de `trucks.updateToColumns` — un campo opcional a la vez (patent/chassis/year/brand/motorNumber), assert campo tocado + no-tocados preservados | REQ-1 | developer | — | backend/jormat-api spec de `trucks` | `npm run test:e2e -- trucks` verde; coverage scoped muestra la rama TRUE de `updateToColumns:128-133` cubierta | git revert | DET-7, DET-13, RULE-testing-coverage-granularity-005 | done | 1 |
| S1.T3 | B2: split de `setFailure` (`items-write.e2e-spec.ts:~407`) en dos tests: uuid valido-inexistente (rama UPDATE-0-filas) vs no-uuid (guard de formato); espejo del fix de `setPriority` (JOR-151) | REQ-2 | developer | — | backend/jormat-api/test/e2e/items-write.e2e-spec.ts | `npm run test:e2e -- items-write` verde; ambos tests distinguibles por rama ejercitada | git revert | DET-7, DET-13, RULE-testing-coverage-granularity-005 | done | 1 |
| S1.T4 | BL-02: e2e nuevo `users-admin.e2e-spec.ts` — 4 usuarios con email/name/role/created_at distintos; tests de sort por cada columna de `SORTABLE_COLUMNS` + `DEFAULT_SORT` + fallback (id no-whitelisted), con arrays exactos ordenados | REQ-3 | developer | — | backend/jormat-api/test/e2e/users-admin.e2e-spec.ts | `npm run test:e2e -- users-admin` verde; asserts de array exacto (no `toHaveLength`) por cada columna + default + fallback | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** - persistir en `## Sessions`, quality review con single independent judge (tier T2 test-only), self-report verification (DET-33), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + judge approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33 | done | 1 |

## Backlog

| # | Item | Priority | Status |
|---|------|----------|--------|
| B1 | Extender la config de mutation testing (`stryker.conf.json`) para cubrir `*.e2e-spec.ts` (jest config de e2e o config de stryker acotada + DB efimera). Sin esto, los mutantes de `users-admin.service.ts` y de la capa de datos siguen reportandose survivor en `dkc-mutate` aunque los e2e los maten en runtime | should | open |
| B2 | `setFailure` service-twin (`items-write.e2e-spec.ts:~428`) tiene el mismo mal etiquetado que se corrigio en `:407` (usa `'99999999'` no-uuid en vez de uuid valido-inexistente). Mismo fix trivial; fuera del source_ref literal de este ticket | could | open |

## Constraints

- RULE-testing-coverage-granularity-005: verificacion a nivel statement/branch/mutant, no linea. Cuidar falso-verde: el test debe entrar por la rama/mutante objetivo, no por otra con el mismo efecto observable.
- DET-7: cada test case traza a un REQ. DET-13: cierre con evidencia (tests corridos con resultado real).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Test que pasa por el assert pero no ejercita la rama/mutante objetivo | medium | falso verde, hueco sigue abierto | validar cada test verificando el campo/columna/mutante objetivo especifico, no solo que el assert pasa |
| Sort con datos indistinguibles entre columnas | medium | test que pasa sin matar el mutante | sembrar 4 usuarios con las 4 columnas mutuamente distinguibles (L2) |
| Regresion silenciosa en suites vecinas | low | build rojo | correr suite completa unit+e2e antes de cerrar |
| Mutation testing sigue reportando survivors pese al fix | high (conocido) | falsa sensacion de deuda persistente en `dkc-mutate` | documentado como backlog B1 + learn L1; no es un gap de test, es un gap de config de stryker |

## Decisions (cerradas durante design)

### DEC-LOCAL-01: mutation-infra queda fuera de alcance, se agregan solo los tests
- **Contexto**: `stryker.conf.json` no corre `*.e2e-spec.ts`; los 7 mutantes de `users-admin.service.ts` solo son alcanzables con un e2e (Capa C, DB real).
- **Drivers**: el ticket es test-only; reconfigurar la herramienta de mutation testing es un cambio de infra que excede el alcance de "cerrar deuda de testing" con tests.
- **Opcion elegida**: agregar el e2e (REQ-3) que mata los mutantes en runtime real; documentar el gap de config como backlog `should` (item B1) en vez de reconfigurar stryker en este ticket.
- **Alternativas**: (a) extender `stryker.conf.json` en este mismo ticket — descartada: cambia el alcance de test-only a config de infra, con su propio riesgo (DB efimera para stryker, tiempo de corrida); (b) no hacer el e2e y dejar los mutantes survivor — descartada: no cierra BL-02, que exige la Capa C.
- **Consecuencias**: los 7 mutantes quedan muertos en runtime pero `dkc-mutate` seguira reportandolos survivor hasta que se ejecute el backlog B1.
- **Session**: S1.

## Acceptance checkpoints

- [x] **Funcional**: los 3 requerimientos (update-parcial B1, split setFailure B2, sort users-admin BL-02) tienen test verde
- [x] **Tests**: los 4 tests escritos y verdes; TC1-TC5 con assert de valor concreto (campo tocado/preservado, rama distinguida, array exacto)
- [x] **Rules**: verificacion a rama/mutante objetivo (RULE-testing-coverage-granularity-005), no linea
- [x] **Integration**: suite completa unit (719) + e2e (236) verde
- [x] **Produccion intacta**: `git diff --name-only` solo 4 archivos `*.spec.ts`/`*.e2e-spec.ts`, 0 `src/` de produccion

## Success metrics

| Metric | Baseline | Target | How to measure | When |
|--------|----------|--------|----------------|------|
| `catalogos-repuestos.buildPatch` rama TRUE update-parcial | no ejercitada | ejercitada | coverage scoped | post-S1 |
| `trucks.updateToColumns` rama TRUE update-parcial | no ejercitada | ejercitada | coverage scoped | post-S1 |
| `setFailure:407` etiquetado correcto | mal etiquetado (no-uuid bajo nombre "inexistente") | split correcto en 2 tests | lectura + corrida del test | post-S1 |
| Mutantes `users-admin.service.ts` (`SORTABLE_COLUMNS`/`DEFAULT_SORT`) muertos en runtime | 7 survivors (mutation report rbac S5) | 0 survivors en runtime (e2e); `dkc-mutate` pendiente de backlog B1 para reflejarlo | e2e nuevo + nota de limitacion | post-S1 |
| e2e total | 232 pass | 236 pass | `npm run test:e2e` | post-S1 |
