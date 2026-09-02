---
id: SPEC-permissions-roles-test-harness
project: jormat-evolution
ticket: JOR-041
status: done
---

# Harness de tests RBAC: DB de test efimera + verificacion de la config de los 6 roles

# Harness de tests RBAC: DB de test efimera + verificacion de la config de los 6 roles

## Executive summary — lo que estas aprobando

Infra de testing de integracion para el backend: una **DB de test efimera** que se crea, migra y
siembra al arrancar la suite e2e y se destruye al terminar (automatico), y un test que verifica que
los **6 roles** resuelven exactamente su configuracion de capabilities (la matriz de JOR-040), usando
**una sola cuenta de prueba** (`gerencia`) a la que el test le asigna cada rol por turno.

**Decisiones (super autopilot, aprobadas)**:
- Cuenta de prueba: existente `jormat.gerencia.01@…` (no se crea nueva). El env se reduce a esa.
- DB de test: `jormat_evolution_test` en el mismo Postgres dev (5433), via env `test` del knexfile + `DB_NAME_TEST`.
- Lifecycle: jest `globalSetup` (crear+migrar+seed) / `globalTeardown` (drop), en `jest.e2e.config.ts` aparte.
- `npm test` (unit, rapido) se mantiene; se agrega `test:e2e` (DB efimera) + `test:all`.
- Concurrencia: suite e2e con `maxWorkers: 1` (la cuenta de prueba cambia de rol → sin colision).

**Que NO se hace**: e2e con login real CIAM (Backlog B1); no se tocan los unit tests existentes; no se modifica codigo entregado.

## Purpose

Materializar el patron `*.e2e-spec.ts` previsto en `jest.config.ts`: tests de integracion contra una
DB de test efimera, empezando por el contrato de configuracion de roles (seed→DB→`findEffectiveCapabilities`).

## Requirements

### REQ-01: DB de test efimera, creada y destruida automaticamente

> **Que cambia**: env `test` en `knexfile.ts`; `jest.e2e.config.ts` con `globalSetup`/`globalTeardown`;
> scripts `test:e2e` y `test:all`; `DB_NAME_TEST` en `.env`/`.env.example`.
> **Por que**: poder correr tests de integracion reproducibles sin tocar la DB dev ni dejar residuos.

El sistema MUST, al correr `npm run test:e2e`: (a) crear `jormat_evolution_test` (drop-if-exists + create),
(b) correr `migrate:latest`, (c) sembrar el dataset minimo (workspace + catalogo de capabilities + 6 roles + cuenta de prueba),
(d) correr los specs `*.e2e-spec.ts`, (e) **dropear la DB al terminar** (pase o falle la suite). La DB dev NO se toca.

**Actor**: system (test harness) · **Layers**: backend · **Certainty**: confirmed · **source_ref**: JOR-041 H1/H2/H3

#### Acceptance
`npm run test:e2e` corre verde y `jormat_evolution_test` NO existe al terminar (verificable por `\l` / query a pg_database).

### REQ-02: Verificacion de la configuracion de los 6 roles (1 cuenta de prueba)

> **Que cambia**: `test/.../roles-config.e2e-spec.ts` que itera los 6 roles sobre la cuenta `gerencia`.
> **Por que**: garantizar que cada rol resuelve exactamente sus capabilities (la matriz JOR-040) — hoy ningun test lo cubre.

El sistema MUST, por cada rol ∈ {vendedor, bodega, jefe-local, jefe-venta, gerencia, cajero}: asignar SOLO
ese rol a la cuenta de prueba (replace en `user_roles`), resolver via `KnexPermissionsRepository.findEffectiveCapabilities`,
y **assert que el set == la matriz esperada** (counts exactos 2/11/14/25/25/26 Y membresia de capabilities clave).
El test MUST fallar si un rol gana o pierde una capability (assertions concretas, RULE-global-001).

**Actor**: system · **Layers**: backend · **Certainty**: confirmed · **source_ref**: JOR-040 matriz (SPEC-permissions-demo-roles-seed)

#### Acceptance
`test:e2e` reporta 6 casos verdes; alterar la matriz de un rol hace fallar el caso correspondiente.

### REQ-03: 1 cuenta de prueba en el env (reduccion de 6 → 1)

> **Que cambia**: `~/.jormat.env` y `.jormat.env.example` quedan con 1 sola cuenta de testing (`gerencia`).
> **Por que**: el dev pidio reducir; con role-swap basta una identidad.

`~/.jormat.env` MUST quedar con una sola entrada de cuenta de prueba (gerencia) — las otras 5 se quitan.
`.jormat.env.example` (repo) MUST reflejar la convencion de 1 cuenta. NO se commitea ningun secreto.

**Actor**: system · **Layers**: backend/infra · **Certainty**: confirmed · **source_ref**: JOR-041 request

#### Acceptance
`~/.jormat.env` tiene 1 par de claves de testing; `.jormat.env.example` 1 cuenta, sin passwords.

## Tasks

### Session 1 — Infra de DB de test efimera

#### S1.T1 — env `test` en knexfile + `DB_NAME_TEST` en .env/.env.example
- **Contract**: agregar env `test` a `knexfile.ts` (connection = dev pero `database: DB_NAME_TEST || 'jormat_evolution_test'`). Agregar `DB_NAME_TEST=jormat_evolution_test` a `.env` y `.env.example`.
- **Files**: `knexfile.ts`, `.env`, `.env.example`
- **Validation**: `NODE_ENV=test DB_NAME_TEST=... npx knex migrate:status` apunta a la DB test.
- **Rollback**: git checkout.
- **REQ**: REQ-01

#### S1.T2 — jest.e2e.config.ts + globalSetup/globalTeardown + scripts
- **Contract**: `jest.e2e.config.ts` (testRegex `.e2e-spec.ts$`, `maxWorkers:1`, globalSetup/teardown). `globalSetup`: pg connect a DB `postgres` → drop+create `jormat_evolution_test`; `execSync` `migrate:latest` + `seed:run` con `NODE_ENV=test`. `globalTeardown`: drop DB. Scripts `test:e2e` y `test:all` en package.json.
- **Files**: `jest.e2e.config.ts`, `test/e2e/global-setup.*`, `test/e2e/global-teardown.*`, `package.json`
- **Validation**: `npm run test:e2e` crea/dropea la DB (aunque no haya specs aun, el lifecycle corre limpio).
- **Rollback**: borrar archivos nuevos + revertir package.json.
- **REQ**: REQ-01

#### S1.GATE — DB efimera operativa (tier T2)
- `test:e2e` crea, usa y destruye `jormat_evolution_test` sin residuos. Gate ⚑ fuerte (reviewer aislado DET-35 — quirurgico).

### Session 2 — Test de configuracion de roles + cuenta unica

#### S2.T1 — `roles-config.e2e-spec.ts`
- **Contract**: spec que conecta al knex de test, instancia `KnexPermissionsRepository`, y por cada rol asigna a la cuenta de prueba (gerencia user) ese rol y asserta effectiveCaps == matriz esperada (counts + caps clave). Cleanup de user_roles entre casos.
- **Files**: `test/e2e/roles-config.e2e-spec.ts`
- **Validation**: 6 casos verdes; mutar un expected hace fallar.
- **Rollback**: borrar el spec.
- **REQ**: REQ-02

#### S2.T2 — Reducir `~/.jormat.env` + `.jormat.env.example` a 1 cuenta (gerencia)
- **Contract**: quitar las 5 cuentas extra de `~/.jormat.env` (dejar gerencia, opcional alias `JORMAT_TEST_USER/PASS`); `.jormat.env.example` con 1 cuenta de testing, passwords vacios.
- **Files**: `~/.jormat.env` (fuera de repo), `.jormat.env.example`
- **Validation**: grep confirma 1 cuenta; sin secretos en el example.
- **Rollback**: re-agregar (las claves estan reportadas en el historial del chat / ya en uso).
- **REQ**: REQ-03

#### S2.T3 — Cablear `test:all` + verificacion final
- **Contract**: `test:all` corre unit + e2e; verificar que el unit suite sigue intacto y e2e verde.
- **Validation**: `npm test` (unit) sin cambios; `npm run test:e2e` verde; `test:all` corre ambos.
- **Rollback**: revertir package.json.
- **REQ**: REQ-01, REQ-02

#### S2.GATE — Roles verificados + cuenta unica (tier T2)
- 6 roles verdes con su matriz; env reducido; unit intacto. Gate ⚑ fuerte (reviewer aislado DET-35).

## Acceptance checkpoints

- [x] AC-1 (REQ-01): `test:e2e` crea/dropea `jormat_evolution_test` automaticamente; verificado (solo queda `jormat_evolution` dev). Sin residuos.
- [x] AC-2 (REQ-02): los 6 roles pasan con matriz exacta (2/11/14/25/25/26) — 8/8 verdes (+ deny-by-default). Counts exactos → mutar falla.
- [x] AC-3 (REQ-03): `~/.jormat.env` con 1 cuenta (`JORMAT_TEST_USER/PASS` = gerencia); `.jormat.env.example` 1 cuenta, passwords vacios.
- [x] AC-4: unit suite intacto (190/190, 26 suites); eslint 0; tsc exit 0.

## Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-1 | auto | pending |
| REQ-02 | TC-2 | auto | pending |
| REQ-03 | TC-3 | manual | pending |

## Backlog

| # | Item | Prioridad |
|---|------|-----------|
| B1 | e2e de login real (Playwright + CIAM) por rol en el browser — depende de MFA + oid relink. | could |
