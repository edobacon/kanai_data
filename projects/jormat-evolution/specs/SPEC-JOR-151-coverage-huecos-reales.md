---
id: SPEC-JOR-151-coverage-huecos-reales
project: jormat-evolution
ticket: JOR-151
status: in_progress
---

# Cerrar los huecos de test reales que dejo visible la corrida de coverage de JOR-149

# Cerrar los huecos de test reales que dejo visible la corrida de coverage de JOR-149

## Executive summary - lo que estas aprobando

**Que se quiere**: JOR-149 corrio el coverage del merge unit+e2e y dejo visibles comportamientos vivos sin test real. Este ticket cierra los que son **casos reales**, con tests que ejercitan el camino real (DB real para las rutas de dominio, no mocks). Es trabajo **test-only**: cero cambio de codigo de produccion.

**Correccion de alcance verificada a nivel statement/branch (Discovery-01)**: la verificacion granular del coverage json scoped sobre `epic/jormat-v1` (no el agregado de archivo, que enmascara `throw`s no ejecutados en `if (cond) throw`) da, para `auth.guard.ts`: `:177` `throw 'Token malformado'` = **0 hits** (hueco real); `:184` `throw 'Algoritmo no soportado'` = if-branch **[0,29]**, throw **0 hits** (hueco real — el `throw` nunca se ejecuta, pese al test existente de HS256 que es falso-verde, Discovery-02); `:187` `throw 'Signing key no encontrada'` = **[2,25]** (YA cubierto); `:186` `kid ?? ''` = default defensivo (ruido). Resultado: el triage acerto en `:184`, erro en `:186/:187`. G3 se cierra con DOS casos (G3a `:177`, G3b `:184`); `:187` y `:186` quedan fuera con evidencia.

**Los huecos que se cierran**:
- **G1** - el endpoint `PATCH /api/inventario/items/:id/priority` no tiene ningun e2e; su gemelo `setFailure` si. Se agrega e2e (happy path on/off + guard uuid).
- **G2** - el rechazo de `existsActive` ante un `itemId` malformado en el flujo de subida de imagen no esta cubierto (la suite cubre el `attachmentId` malformado de JOR-149, que es otro parametro). Se agrega integration.
- **G3a** - `auth.guard.ts:177`, header de token base64url/JSON malformado -> `'Token malformado'`. Unit.
- **G3b** - `auth.guard.ts:184`, `alg` no-HS256-no-RS256 (ej. `'none'`) -> `'Algoritmo no soportado'` (ejercita el `throw` real, no el falso-verde de HS256). Unit.

**Decisiones criticas**:

| Decision | Racional |
|----------|----------|
| G3 se cierra con G3a (`:177`) + G3b (`:184`); `:187`/`:186` fuera | Evidencia granular (statement/branch): `:177` y `:184` tienen sus `throw` en 0 hits; `:187` ya cubierto ([2,25]); `:186` es `?? ''` ruido. Se cubre lo que realmente falta (DET-4/DET-5/DET-33), no la lectura de linea que enmascaraba `:184` |
| G4 (builders de patch parcial) queda fuera | Es `could`, no bloquea. Se lista como backlog `could` |
| G1/G2 con DB real (e2e/integration), no mocks | Un mock del repo consagraria el bug de runtime; el valor del test esta en ejercitar el WHERE/guard real (feedback del proyecto sobre unit tests mockeados) |

**Riesgos y mitigacion**:
- *Falso verde por test que no ejercita la rama* (lo que le paso a G3 en el triage): cada test se valida corriendo coverage scoped del archivo objetivo y confirmando que la linea/rama pasa de descubierta a cubierta.
- *Regresion en suites vecinas*: se corre la suite completa (unit + e2e) antes de cerrar; el coverage merge no debe bajar del piso (89%).

**Que NO se hace**: ningun cambio de codigo de produccion. No se toca `auth.guard.ts`, `items.repository.ts`, controllers ni services. No se reescribe el test enganoso de HS256 (Discovery-02): se agrega el test correcto (G3b) al lado y se documenta el falso-verde como learn, sin modificar el test ajeno sin aprobacion. No se cubren `:187` (ya cubierto) ni `:186` (`?? ''` ruido).

**Tamano estimado**: 1 session (S1), ~1.5h, tier T2. Sin task mas riesgosa — son 3 tests independientes + regresion.

**Como vas a saber que funciona**: `npm run test` + `npm run test:e2e` verdes; coverage json scoped muestra `setPriority`/`existsActive`(reject `:686`)/`auth.guard.ts:177`/`auth.guard.ts:184` con sus `throw` ejecutados (hits>0); el merge de coverage no baja del piso.

## Purpose

Subir la cobertura **real** (comportamientos vivos ejercitados por el camino de entrada real) de tres huecos preexistentes de `backend/jormat-api`, sin cambiar comportamiento de produccion. Para el equipo backend: una regresion en el toggle de prioridad, en el guard de id malformado del upload de imagen, o en el parseo del header del idToken deja de pasar silenciosa.

## Requirements (delta)

### REQ-IMPROVE-01: e2e del endpoint de prioridad (G1)

> **Que cambia**: el endpoint `PATCH /inventario/items/:id/priority` pasa a tener e2e que ejercita el write real en `items.priority` y el guard de uuid, igual que ya lo tiene `setFailure`.
> **Por que**: hoy es un endpoint publico vivo sin ningun test de integracion; solo hay un unit con el repo mockeado, que no prueba el WHERE ni el guard reales.

El sistema MUST tener cobertura e2e del endpoint `PATCH /api/inventario/items/:id/priority` que verifique (a) el toggle real de `items.priority` (0->1->0) y (b) el guard de uuid (`:id` no-uuid -> 404, nunca 500).

<details><summary>Scenarios de validacion</summary>

#### Scenario: toggle de prioridad
- **GIVEN** un item sembrado en el workspace de test
- **WHEN** se hace `PATCH /items/{uuid}/priority` con `priority=true` y luego `priority=false`
- **THEN** responde 200 y `items.priority` es 1, luego 0

#### Scenario: guard de uuid
- **GIVEN** un `:id` que no es uuid (`'abc'`)
- **WHEN** se hace `PATCH /items/abc/priority`
- **THEN** responde 404 (el guard `!UUID_RE.test(id)` de `setPriority` corta antes de tocar Postgres), nunca 500

</details>

### REQ-IMPROVE-02: rechazo de existsActive en el flujo de imagen (G2)

> **Que cambia**: subir una imagen a un `itemId` malformado queda cubierto: `existsActive` devuelve false y el flujo resuelve 404 sin tocar Postgres.
> **Por que**: la suite de imagenes cubre el `attachmentId` malformado (JOR-149), pero no el `itemId` malformado del upload — que pasa por `existsActive`, una rama distinta.

El sistema MUST tener cobertura de integracion del flujo `addImage` con un `itemId` malformado, verificando que `existsActive` devuelve false -> 404, sin error crudo de Postgres.

<details><summary>Scenarios de validacion</summary>

#### Scenario: upload con itemId malformado
- **GIVEN** el flujo de subida de imagen
- **WHEN** se invoca `addImage` (o el service equivalente) con un `itemId` no-uuid
- **THEN** resuelve 404 (`existsActive` corta por `!UUID_RE.test(id)`), sin `invalid input syntax for type uuid`

</details>

### REQ-IMPROVE-03: throws de rechazo del idToken en el guard (G3a + G3b)

> **Que cambia**: dos `throw` de seguridad del `auth.guard` que hoy nunca se ejecutan en tests quedan cubiertos: header malformado (`:177`) y algoritmo no soportado (`:184`).
> **Por que**: son la primera linea del JWT artesanal; `:184` tiene ademas un falso-verde (el test de HS256 asserta el mensaje sin ejecutar el `throw`), asi que un cambio que los debilite pasa silencioso.

El sistema MUST tener unit tests del `auth.guard` que ejerciten `verifyToken` con: (a) un idToken de 3 partes cuyo header no sea base64url-JSON valido -> `UnauthorizedException('Token malformado')` (`:177`); y (b) un idToken con `alg` que no sea ni `HS256` ni `RS256` (ej. `'none'`) -> `UnauthorizedException('Algoritmo no soportado')` ejecutando el `throw` real de `:184` (no la ruta `verifyE2EToken` del test de HS256).

<details><summary>Scenarios de validacion</summary>

#### Scenario G3a: header no parseable
- **GIVEN** un token `Bearer h.p.s` con 3 partes donde `h` decodifica a algo que no es JSON valido
- **WHEN** el guard corre `canActivate`
- **THEN** lanza `UnauthorizedException('Token malformado')` (cubre el `catch` de `:177`)

#### Scenario G3b: algoritmo no soportado (throw real de :184)
- **GIVEN** un token cuyo header tiene `alg: 'none'` (ni HS256 ni RS256) y 3 partes
- **WHEN** el guard corre `canActivate`
- **THEN** lanza `UnauthorizedException('Algoritmo no soportado')` ejecutando el `throw` de `:184` (branch [0,29] pasa a cubierta), no el mensaje via `verifyE2EToken`

</details>

### REQ-PRESERVE-01: sin regresion en las suites existentes

> **Que cambia**: nada de comportamiento; se garantiza que agregar estos tests no rompe las suites vecinas ni baja el coverage.

El sistema MUST mantener verdes `npm run test` y `npm run test:e2e`, y el coverage merge MUST no bajar del piso vigente (89% branches).

## Changes

### Added: test artifacts (test-only, cero produccion)

| Artefacto | Archivo | Cubre |
|-----------|---------|-------|
| e2e priority | `test/e2e/items-write.e2e-spec.ts` (o suite items propia) | REQ-IMPROVE-01 |
| integration existsActive reject | `test/e2e/items-images.e2e-spec.ts` | REQ-IMPROVE-02 |
| unit header malformado (`:177`) + alg no soportado (`:184`) | `src/auth/auth.guard.canactivate.spec.ts` | REQ-IMPROVE-03 |

Ningun archivo de `src/` de produccion se modifica.

## Tasks

### Session 1 - Cerrar G1/G2/G3' [tier: T2]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | G1: e2e de `PATCH /items/:id/priority` — happy path (priority true->false, assert `items.priority` 1->0) + guard uuid (`:id`='abc' -> 404, nunca 500). Copiar el patron del e2e de `setFailure` de la misma suite | REQ-IMPROVE-01 | developer | — | backend/jormat-api/test/e2e/items-write.e2e-spec.ts | `npm run test:e2e -- items-write` verde; coverage scoped de `items.repository.ts` muestra `setPriority` (funcion + ramas `:674-681`) cubierto | git revert | DET-7, DET-13, RULE-testing-facade-e2e-004 | done | 1 |
| S1.T2 | G2: integration del flujo de imagen con `itemId` malformado -> `existsActive` false -> 404 (sin error de Postgres). Ubicar junto a los casos malformados de JOR-149 en la suite de imagenes; el parametro es el `itemId` del `addImage`, no el `attachmentId` | REQ-IMPROVE-02 | developer | — | backend/jormat-api/test/e2e/items-images.e2e-spec.ts | `npm run test:e2e -- items-images` verde; coverage scoped de `items.repository.ts` muestra la rama `:686` (`!UUID_RE.test(id)` de `existsActive`) cubierta | git revert | DET-7, DET-13, RULE-testing-facade-e2e-004 | done | 1 |
| S1.T3 | G3a+G3b: dos unit del `auth.guard` en el `describe('verifyToken — token malformado')` existente: (a) header no-base64url-JSON -> `'Token malformado'` (`:177`); (b) `alg: 'none'` (ni HS256 ni RS256) -> `'Algoritmo no soportado'` ejecutando el `throw` real de `:184`. NO se modifica el test existente de HS256 (falso-verde, Discovery-02): se agrega al lado | REQ-IMPROVE-03 | developer | — | backend/jormat-api/src/auth/auth.guard.canactivate.spec.ts | `npm run test -- auth.guard.canactivate` verde; coverage json scoped de `auth.guard.ts`: `:177` stmt hits>0, `:184` throw stmt hits>0 y su if-branch pasa de [0,29] a ambas ramas cubiertas | git revert | DET-7, DET-13, RULE-testing-coverage-threshold-002 | done | 1 |
| S1.T4 | Regresion: correr `npm run test` + `npm run test:e2e` completos y el merge de coverage; confirmar verde y que el merge no baja del piso (89%) | REQ-PRESERVE-01 | reviewer | S1.T1, S1.T2, S1.T3 | backend/jormat-api/ | `npm run test` + `npm run test:e2e` verdes; `npm run test:cov:merge` >= 89% branches | (no aplica - solo lectura) | DET-7, DET-13, RULE-testing-coverage-threshold-002 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** - persistir en `## Sessions`, quality review con dual-judge aislado (DET-35), self-report verification (DET-33), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + reviewer approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

## Backlog

| # | Item | Priority | Status |
|---|------|----------|--------|
| B1 | G4: ramas "setear campo opcional en update parcial" de `catalogos-repuestos.buildPatch:146-148` y `trucks.updateToColumns:128-133`. Un test de update parcial las cubriria | could | resuelto por JOR-153 (2026-08-18): S1.T1/S1.T2 (commits `3e74918`, `c88f56a`) |
| B2 | Corregir el test gemelo `setFailure` (`items-write.e2e-spec.ts:407`, 'devuelve false para un id inexistente'): usa `'99999999'` (no-uuid) y re-ejercita el guard de formato en vez de la rama 'uuid valido pero inexistente'. Mismo mal etiquetado que se corrigio en `setPriority` (Discovery-03). Fuera de alcance de JOR-151 (test ajeno) | could | resuelto por JOR-153 (2026-08-18): S1.T3 (commit `387fb23`) |

## Constraints

- RULE-testing-facade-e2e-004: los tests de fachada de dominio van a nivel e2e con DB real, no mock del repo.
- RULE-testing-coverage-threshold-002: el merge de coverage no baja del piso (89% branches).
- DET-7: cada test case traza a un REQ. DET-13: cierre con evidencia (tests corridos con resultado real).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Test que pasa por el mensaje pero no ejercita la rama (lo de G3 en el triage) | medium | falso verde, hueco sigue abierto | validar cada test con coverage scoped del archivo objetivo; confirmar la linea/rama de descubierta a cubierta |
| Regresion silenciosa en suites vecinas | low | build rojo | correr suite completa unit+e2e antes de cerrar |
| El e2e de priority necesita cuenta CIAM / DB efimera | low | flaky | reusar el harness existente de `items-write` (ya montado) |

## Decisions (cerradas durante design)

### DEC-LOCAL-01: G3 se cierra con G3a (:177) + G3b (:184), tras verificacion granular
- **Contexto**: el triage marcaba `auth.guard.ts:184`/`:186` como huecos. Una primera lectura mia a nivel LINEA sugirio que solo `:177` faltaba (falso — el line-coverage enmascara `throw`s no ejecutados).
- **Drivers**: la verificacion a nivel statement/branch (coverage json scoped sobre `epic`, 2026-08-17) muestra `:177` throw=0, `:184` throw=0 (if-branch [0,29]), `:187` cubierto [2,25], `:186` `?? ''` ruido.
- **Opcion elegida**: cerrar G3a (`:177` header malformado) + G3b (`:184` alg no soportado, con el `throw` real via `alg:'none'`); dejar fuera `:187` (ya cubierto) y `:186` (ruido).
- **Alternativas**: (a) confiar en la lectura de linea y cubrir solo `:177` — descartada por Judge B: la evidencia era menos granular que la de G1/G2 y ocultaba `:184`; (b) reescribir el test de HS256 existente — descartada: no se toca test ajeno sin aprobacion, se agrega el correcto al lado.
- **Consecuencias**: se cierran los dos `throw` reales de seguridad y se corrige un falso-verde (Discovery-02). Rigor de evidencia homogeneo con G1/G2 (hit-counts explicitos).
- **Session**: S1 (design).

## Acceptance checkpoints

- [ ] **Funcional**: los 3 scenarios (priority toggle+guard, existsActive reject, header malformado) pasan
- [ ] **Tests**: los 3 tests escritos y verdes; coverage scoped confirma cada rama cubierta
- [ ] **Rules**: e2e con DB real (no mock) para G1/G2; unit para G3'
- [ ] **Integration**: suite completa unit+e2e verde; coverage merge >= piso
- [ ] **Produccion intacta**: `git diff` no toca ningun archivo `.ts` de produccion (no-`.spec.ts`) bajo `src/` ni ningun controller/service/repository; solo `*.spec.ts` y `test/e2e/*.e2e-spec.ts`

## Success metrics

| Metric | Baseline | Target | How to measure | When |
|--------|----------|--------|----------------|------|
| `items.repository.ts` `setPriority` cubierto | funcion sin llamar (f=0) | funcion + ramas cubiertas | coverage scoped | post-S1 |
| `items.repository.ts` `existsActive` rama reject (`:686`) | `[0,7]` | rama cubierta | coverage scoped | post-S1 |
| `auth.guard.ts:177` throw 'Token malformado' | stmt 0 hits | hits>0 | coverage json scoped | post-S1 |
| `auth.guard.ts:184` throw 'Algoritmo no soportado' | if-branch [0,29], throw 0 hits | ambas ramas + throw hits>0 | coverage json scoped | post-S1 |
| coverage merge branches | >= 89% (piso) | no baja | `test:cov:merge` | post-S1 |
