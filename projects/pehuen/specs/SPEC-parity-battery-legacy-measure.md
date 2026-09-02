---
id: SPEC-parity-battery-legacy-measure
project: pehuen
ticket: PEH-021
status: done
---

# Bateria de paridad legacy vs nuxt: estabilizar los specs y medir contra el legacy real

# Bateria de paridad legacy vs nuxt: estabilizar los specs y medir contra el legacy real

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy la bateria de tests de paridad corre solo contra nuxt, asi que "verde" significa "nuxt es internamente consistente", no "nuxt reproduce el legacy". Esta mejora estabiliza los specs de paridad (para recuperar paralelismo y fallar claro si mongo no esta) y los conecta al legacy real (`legacy-server :4402` + `nuxt-staging :4400`, ambos ya levantados), de modo que "verde" pase a significar "nuxt se comporta como el legacy observado" — que es el objetivo de RULE-MIGRATION-004.

**Decisiones criticas que necesitan tu OK** (ya resueltas en intake con el dev — se ratifican):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | E2 corre contra `:4400` (nuxt-staging, dataset clonado), par directo del legacy-clone `:4402`; se descarta `:4401`/pehuen-test para la comparacion de paridad | `:4401` no tiene par de datos en legacy-mongo; comparar ahi seria ruido |
| 2 | `guias-status` + cookies httpOnly + currentPassword se retaguean `@improvement` y se EXCLUYEN de E2 contra legacy | Correrlos contra legacy daria 200/404, no 403 (el 403 es regla de cliente Vue, no del server `guia.controller.ts:36`). Es endurecimiento deliberado, no paridad |
| 3 | E2 exige un `loginAs` en modo API-only (login por POST; Bearer para legacy, cookie para nuxt), no un swap de `baseURL` | El legacy-clone NO sirve UI (`docker/compose.yml` sin `pehuen-client`); los specs con login por UI no corren tal cual contra `:4402` |

**Riesgos principales y como los mitigamos**:

- **Refactor de `loginAs` rompe los flows e2e existentes** que dependen del login por UI → el modo API-only se agrega como capacidad NUEVA del fixture (parametro/variante), preservando `performLogin` UI. REQ-PRESERVE-01 valida que los flows por UI siguen verdes.
- **Los contratos transcritos no matchean el legacy** (riesgo central de RULE-MIGRATION-004) → E2 corre el subset validable contra `:4402` y registra pasa/falla por spec; un fallo se reconcilia como contrato mal escrito (no el legacy) o se documenta como delta `@improvement` intencional.
- **`workers>1` reintroduce colisiones de seed** → los specs API-level se aislan a un solo Playwright project (viewport-independiente), eliminando la carrera cross-project que hoy obliga a `--workers=1`.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Gaps de codigo productivo (TTL, audit, health, indice rut, defaults, origen!=destino) → PEH-022.
- Cobertura de areas sin ningun test (R2, anonymizeUser, descarga de reportes, RBAC admin, sockets realtime) → PEH-023.
- No se toca el clon de staging `:4400` ni codigo productivo — solo tooling de tests, config y seed.

**Tamano estimado**: 3 sessions ejecutables (S1 estabilizacion, S2 E2, S3 E4), aproximadamente 5-7h efectivas. La mas riesgosa es S2 (refactor del fixture de auth + reconciliacion de contratos contra el legacy).

**Como vas a saber que funciona**:

- Los 3 specs de paridad + `rumas-bulk-edit` corren con `workers>1` sin `duplicate key` (hoy fuerzan `--workers=1`).
- Si mongo no esta, esos specs skipean con mensaje claro ("pehuen-test no disponible"), no fallan opaco.
- El subset E2-validable corre contra `:4402` y cada spec tiene evidencia registrada de pasa/falla contra el legacy.
- El roundtrip HTTP compara los 5 stats legacy vs nuxt en vivo (0 skips) y el user de roundtrip se siembra desde `seed-test-data.sh`.

---

## Purpose

Estabilizar y reorientar la bateria de paridad de la migracion pehuen (legacy Express/Mongoose 5 → Nuxt 4). Hoy los specs de paridad (`migration-paridad/**`) y `rumas-bulk-edit` se auto-seedean por mongoose con IDs a nivel modulo y corren x3 (mobile/tablet/desktop), colisionando bajo paralelismo; ademas se ejecutan solo contra nuxt `:4401`. El delta: (B) aislar a un solo project + guard de mongo, (E2) parametrizar el target y agregar login API-only para correr el subset validable contra el legacy `:4402`, (E4) completar el roundtrip HTTP en vivo (stats + seed durable). Consumidores: el pipeline de tests de la migracion y el criterio GO/NO-GO de corte.

## Requirements

### REQ-IMPROVE-B01: Specs de paridad API-level aislados a un solo Playwright project

> **Que cambia**: los specs `rumas-bulk-edit`, `guias-status-parity`, `rumas-volume-parity` (y demas API-level de `migration-paridad/**`) dejan de correr una vez por viewport (mobile/tablet/desktop) y corren en un unico project dedicado.
> **Por que**: son tests de API (viewport-independiente); correrlos x3 con IDs de seed a nivel modulo produce `duplicate key` y hoy se mitiga con `--workers=1` (lento, esconde el problema).

El sistema MUST ejecutar los specs de paridad API-level en un solo Playwright project, de modo que `workers>1` no produzca colisiones de seed cross-project.

**Actor**: system (test runner)
**Layers**: config, test

<details><summary>Scenarios de validacion</summary>

#### Scenario: paralelismo sin colision
- **GIVEN** `pehuen-test` mongo disponible y el dev server `:4401` levantado
- **WHEN** se corre `pnpm test:e2e` sobre `migration-paridad/**` + `rumas-bulk-edit` con `workers>1`
- **THEN** ningun `beforeAll` falla con `duplicate key`
- **AND** cada spec corre exactamente una vez (no x3 por viewport)

#### Scenario: los flows por UI siguen multi-viewport
- **GIVEN** la nueva config de projects
- **WHEN** se corren los specs UI (guia-crear, flows por rol, responsive)
- **THEN** siguen ejecutando en mobile/tablet/desktop (no se degrada su cobertura responsive)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre la suite de paridad con workers por defecto (no `--workers=1`) y no aparece `duplicate key`; el reporte muestra cada spec de paridad una sola vez.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | paralelismo | mongo up, dev up | `test:e2e migration-paridad workers>1` | sin duplicate key | exit 0 |
| 2 | no x3 | config nueva | correr rumas-volume-parity | 1 corrida | 2 tests, no 6 |

### REQ-IMPROVE-E01: Guard de mongo en los specs de paridad

> **Que cambia**: los 3 specs que hacen `mongoose.connect()` en `beforeAll` sin guard skipean con mensaje claro si `pehuen-test` no esta disponible, en vez de fallar opaco.
> **Por que**: es precondicion de E2 — sin hermeticidad, un fallo de mongo se confunde con un contrato que no matchea el legacy.

El sistema MUST verificar disponibilidad de la DB de test antes de conectar y, si no esta, MUST skipear el spec con un mensaje accionable (`test.skip(true, 'pehuen-test no disponible en <uri>')`).

**Actor**: system (test runner)
**Layers**: test

<details><summary>Scenarios de validacion</summary>

#### Scenario: mongo ausente
- **GIVEN** `pehuen-test` mongo NO disponible
- **WHEN** se corre `rumas-volume-parity.spec.ts`
- **THEN** el spec se skipea con mensaje `pehuen-test no disponible`
- **AND** NO se reporta como failure

#### Scenario: mongo presente
- **GIVEN** `pehuen-test` disponible
- **WHEN** se corre el spec
- **THEN** conecta y ejecuta normal (comportamiento actual preservado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: baja el mongo de test, corre un spec de paridad, y ve `skipped` con la razon en vez de un stack trace de conexion.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | ausente | mongo down | correr spec | skip con razon | skipped, no failed |
| 2 | presente | mongo up | correr spec | ejecuta | pass |

### REQ-IMPROVE-E201: Target de paridad parametrizable + login API-only

> **Que cambia**: el fixture de auth gana un modo API-only (login por POST, sin UI) que adjunta Bearer para el target legacy y cookie para nuxt; el target de los specs E2-validables se elige por env.
> **Por que**: el legacy-clone `:4402` no sirve UI; sin login API-only ningun spec con `loginAs` corre contra el legacy (decision 3).

El sistema MUST permitir que los specs E2-validables (auth, rumas-volume, ajustes; subset confirmado en intake) corran contra el legacy `:4402` o contra nuxt `:4400`/`:4401` seleccionando el target por env (`PEHUEN_PARITY_TARGET` / `PEHUEN_API_BASE`), autenticando por API (Bearer para legacy, cookie httpOnly para nuxt).

**Actor**: system (test runner)
**Layers**: test, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: correr subset contra legacy
- **GIVEN** legacy-server `:4402` up y target=legacy
- **WHEN** se corre el subset E2-validable
- **THEN** el login usa POST + Bearer y los GET puros comparan contra el legacy
- **AND** se registra por spec pasa/falla contra el legacy

#### Scenario: contrato que no matchea el legacy
- **GIVEN** un spec cuyo contrato transcrito difiere del server legacy
- **WHEN** corre contra `:4402`
- **THEN** falla, y la reconciliacion decide: (a) corregir el contrato transcrito, o (b) documentar delta `@improvement` intencional
- **AND** `guias-status` NO entra al subset (decision 2)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre el subset con `PEHUEN_PARITY_TARGET=legacy`, y obtiene un resultado por spec (pasa/falla vs legacy) registrado en el ticket.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | login legacy | :4402 up | login API-only Bearer | 200 + token | autentica |
| 2 | login nuxt | :4400 up | login API-only cookie | 200 + set-cookie | autentica |
| 3 | subset vs legacy | :4402 up | correr subset | resultado por spec | registrado |

### REQ-IMPROVE-E401: Roundtrip HTTP compara los 5 stats en vivo

> **Que cambia**: se des-skipea `it.skip('GET /stats')` en `migration-roundtrip.test.ts`; se mapean los 5 slugs nuxt a los paths largos del legacy y se construyen los params por-endpoint.
> **Por que**: el skip documentaba "legacy responde sin params" pero el intake confirmo que los params coinciden (`stats.controller.ts`); el gap real es el mapeo de nombres de ruta.

El sistema MUST comparar numericamente los 5 stats (compras-mensual, stock-antiguedad, stock-productos, stock-proveedor, volumen-especie) legacy vs nuxt en vivo, resolviendo el `canchaId` dinamico y el `date` MM-YYYY donde apliquen.

**Actor**: system (integration runner)
**Layers**: test

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad de stats
- **GIVEN** legacy `:4402` + nuxt `:4400` up con dataset clonado y user de roundtrip sembrado
- **WHEN** se corre `test:integration` sin skips
- **THEN** los 5 stats retornan valores identicos (o delta numerico < tolerancia declarada)

#### Scenario: mapeo de ruta
- **GIVEN** slug nuxt `compras-mensual`
- **WHEN** se consulta el legacy
- **THEN** se resuelve a `cantidad-mensual-de-compras-por-cancha` con `date` MM-YYYY (+tipo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `pnpm test:integration` y ve el bloque de stats ejecutando (0 skips) con las 5 comparaciones.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | 5 stats | ambos up + seed | test:integration | 5 comparaciones | sin skip, pasan |
| 2 | mapeo | slug nuxt | resolver legacy | path largo + params | 200 en ambos |

### REQ-IMPROVE-E402: Seed del user de roundtrip durable en script

> **Que cambia**: el user de roundtrip (rut 999999999, `PEHUEN_ROUNDTRIP_PASSWORD`) se siembra desde `scripts/seed-test-data.sh` en ambos mongos, en vez de depender de un default en el test.
> **Por que**: hoy es un default de env no reproducible; un reseed borra el user y el roundtrip auth queda sin credenciales conocidas.

El sistema MUST sembrar el user de roundtrip en legacy-mongo y nuxt-mongo como parte de `seed-test-data.sh`, con password conocida via `PEHUEN_ROUNDTRIP_PASSWORD`, sobreviviendo a un reseed.

**Actor**: system (seed script)
**Layers**: test, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: reseed preserva el user
- **GIVEN** un reseed ejecutado (`seed-test-data.sh`)
- **WHEN** el roundtrip intenta login con rut 999999999
- **THEN** el login funciona en ambos backends (user presente con hash conocido)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `seed-test-data.sh`, luego `test:integration`, y el `beforeAll` del roundtrip autentica sin depender de datos pre-existentes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | durable | reseed | login roundtrip | autentica | token + cookie |

### REQ-PRESERVE-01: Los flows e2e por UI siguen verdes

> **Que cambia**: nada — el modo API-only se agrega SIN quitar el login por UI.
> **Por que**: DET-7 (regression obligatoria) — mejorar la infra de paridad no debe romper los flows por UI existentes.

El sistema MUST preservar el login por UI (`performLogin` navegando a `/login`) y los specs que lo usan multi-viewport (guia-crear, flows por rol, responsive).

**Actor**: system
**Layers**: test

#### Acceptance
**El usuario puede verificar que funciona**: los flows e2e por UI que ya pasaban siguen pasando tras el refactor del fixture.

### REQ-PRESERVE-02: Las 3 comparaciones HTTP del roundtrip ya verdes no regresan

> **Que cambia**: nada — mantenedores/guias/rumas siguen comparando legacy vs nuxt.
> **Por que**: DET-7 — des-skipear stats no debe romper las comparaciones core que PEH-014 dejo verdes.

El sistema MUST mantener verdes las comparaciones de `GET /mantenedores`, `GET /guias`, `GET /rumas` (catalogos + totales + volumenes) en el entorno actual (verificar no-regresion undici).

**Actor**: system
**Layers**: test

#### Acceptance
**El usuario puede verificar que funciona**: corre `test:integration` y las 3 comparaciones core pasan junto con los stats nuevos.

## Non-functional requirements

No aplican NFRs de performance/scale — es una mejora de tooling de tests, no de codigo productivo.

## Artifacts

### Modified: `playwright.config.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| projects | mobile/tablet/desktop corren TODO (incl. API-level x3) | project dedicado `parity-api` (workers>1, sin viewport) para specs API-level; viewport projects con `testIgnore` de esos specs | Elimina colision cross-project (REQ-B01) |

### Modified: `tests/e2e/fixtures/auth.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| login | solo `performLogin` por UI | + modo API-only (POST /auth/login; Bearer legacy, cookie nuxt) seleccionable por target | E2 contra legacy sin UI (REQ-E201, decision 3) |

### Added: `tests/e2e/fixtures/mongo-guard.ts` (helper reusable)

| Field | Value | Purpose |
|-------|-------|---------|
| `skipIfNoMongo(uri)` | helper que hace un connect con timeout corto y `test.skip(true, msg)` si falla | REQ-E01 — hermeticidad de los specs de paridad |

### Modified: `tests/integration/migration-roundtrip.test.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| stats | `it.skip` | `it` con mapeo slug→path largo + params por-endpoint | REQ-E401 |

### Modified: `scripts/seed-test-data.sh`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| roundtrip user | no sembrado (default en test) | insert idempotente del user rut 999999999 con hash de `PEHUEN_ROUNDTRIP_PASSWORD` en ambos mongos | REQ-E402 |

## Tasks

### Session 1 — Estabilizacion (clases B + E) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear helper `mongo-guard.ts` (`tryConnectMongo(uri)` timeout corto + `mongoUnavailableReason`) | REQ-IMPROVE-E01 | developer | — | tests/e2e/fixtures/mongo-guard.ts | tsc + import desde un spec | git revert | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Cablear el guard en los 3 specs de paridad (`rumas-bulk-edit`, `guias-status-parity`, `rumas-volume-parity`): flag en `beforeAll`, skip en `beforeEach` | REQ-IMPROVE-E01 | developer | S1.T1 | tests/e2e/rumas-bulk-edit.spec.ts, tests/e2e/migration-paridad/api-guias/guias-status-parity.spec.ts, tests/e2e/migration-paridad/api-rumas/rumas-volume-parity.spec.ts | correr un spec con mongo down → skip; mongo up → pass | git revert | DET-5, DET-8, DET-10 | done | 1 |
| S1.T3 | Aislar los specs API-level a un project `parity-api` dedicado en `playwright.config.ts` (+ `testIgnore` en mobile/tablet/desktop) | REQ-IMPROVE-B01 | developer | — | pehuen_nuxt/playwright.config.ts | correr suite con workers>1 sin duplicate key; specs API una sola vez | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T4 | Verificar regresion: flows UI siguen multi-viewport + parity specs verdes vs nuxt con workers>1 | REQ-PRESERVE-01 | reviewer | S1.T2, S1.T3 | tests/e2e | `test:e2e` parity subset + un flow UI, evidencia runtime | (no aplica) | DET-5, DET-7, DET-13, DET-14 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket, quality review DET-23, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision + evidencia runtime (DET-36) | done (continue) | DET-13, DET-20, DET-23, DET-36 | done | 1 |

### Session 2 — E2: correr el subset de paridad contra el legacy [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Modo API-only en fixture `parity-api.ts` (login POST; Bearer legacy, cookie nuxt) + target por env, preservando `performLogin` UI | REQ-IMPROVE-E201, REQ-PRESERVE-01 | developer | S1.GATE | tests/e2e/fixtures/parity-api.ts | tsc + login API-only 200 contra :4400 y :4402 | git revert | DET-5, DET-8, DET-10, RULE-MIGRATION-004 | done | 2 |
| S2.T2 | Parametrizar target por env + spec E2 read-only opt-in (`api-e2/e2-contract-probe`) | REQ-IMPROVE-E201 | developer | S2.T1 | tests/e2e/migration-paridad/api-e2, playwright.config.ts | probe verde vs nuxt + vs legacy | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | E2 contra legacy `:4402` — resuelto por DEC-LOCAL-03 (B): contract probe read-only verde vs legacy real + nuxt. Role-based crafted-data no se persigue (delta by-design) | REQ-IMPROVE-E201, RULE-MIGRATION-004 | developer | S2.T2 | tests/e2e/migration-paridad/api-e2, ticket | evidencia runtime contra :4402 (3 passed) | git revert | DET-4, DET-5, DET-12, DET-13, RULE-MIGRATION-004 | done | 2 |
| S2.T4 | Verificar regresion: battery verde vs nuxt (`workers>1`); `guias-status` sigue en E3 no E2 | REQ-PRESERVE-01 | reviewer | S2.T3 | tests/e2e | parity-api workers=4 → 85 passed | (no aplica) | DET-7, DET-13, DET-14 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir resultados, quality review DET-23, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + evidencia runtime (DET-36) | (no aplica) | DET-13, DET-20, DET-23, DET-35, DET-36 | done (continue) | 2 |

### Session 3 — E4: completar el roundtrip HTTP en vivo [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Sembrar el user de roundtrip (rut 999999999, hash de `PEHUEN_ROUNDTRIP_PASSWORD`) idempotente en ambos mongos desde `seed-test-data.sh` (+ subcomando `roundtrip`) | REQ-IMPROVE-E402 | developer | S2.GATE | pehuen_nuxt/scripts/seed-test-data.sh | seed + login roundtrip 200 en ambos backends | git revert | DET-2, DET-8 | done | 3 |
| S3.T2 | Des-skipear `GET /stats`: mapear los 5 slugs nuxt a paths legacy + params (canchaId dinamico, date MM-YYYY) + unwrap payload | REQ-IMPROVE-E401 | developer | S3.T1 | tests/integration/migration-roundtrip.test.ts | stats corre 0 skips; caracteriza 4 divergencias (PEH-022) | git revert | DET-4, DET-5, DET-8, RULE-MIGRATION-004 | done | 3 |
| S3.T3 | Verificar no-regresion 3 core HTTP + fix undici (Connection: close + retry) + users-count (excluir test-users) | REQ-PRESERVE-02 | reviewer | S3.T2 | tests/integration | test:integration 11/11 verde x2 | (no aplica) | DET-7, DET-13, DET-14 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir resultados, quality review DET-23, decidir continue/close | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + evidencia runtime (DET-36) | (no aplica) | DET-13, DET-20, DET-23, DET-36 | done (continue) | 3 |

### Task contract (referencia — detalles criticos)

```
Task S2.T1: modo API-only del fixture de auth
- source_ref: REQ-IMPROVE-E201, REQ-PRESERVE-01
- agent: developer
- files: tests/e2e/fixtures/auth.ts
- precondition: S1.GATE approved
- expected_output: fixture con `loginAs` UI (preservado) + capacidad API-only (POST /auth/login) que devuelve headers de auth segun target (Bearer legacy / cookie nuxt)
- validation: tsc; login API-only retorna 200 y credenciales usables contra :4400 y :4402
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, RULE-MIGRATION-004]
```

## Constraints

- RULE-MIGRATION-001: cero regresion — los specs de paridad existentes no deben romperse (REQ-PRESERVE-01/02).
- RULE-MIGRATION-002: TDD / source_ref = legacy — cada assertion de paridad traza a `pehuen-server/...`.
- RULE-MIGRATION-004: legacy = fuente unica de verdad — si un contrato transcrito no matchea el legacy, se corrige el contrato o se documenta como delta `@improvement` (no se "arregla" el legacy).
- DET-7: regression obligatoria — REQ-PRESERVE-01/02 cubren los tests que no cambian.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| legacy-server `:4402` | internal (docker) | API legacy para E2/E4 | Si esta abajo, E2/E4 skipean o no comparan — S1 no depende |
| nuxt-staging `:4400` | internal (docker) | nuxt con dataset clonado, par del legacy | Idem |
| `pehuen-test` mongo `:27017` | internal (docker) | dataset minimo para specs de paridad (S1) | El guard de REQ-E01 lo maneja (skip con razon) |
| node 24 | toolchain | e2e requiere ABI de better-sqlite3 (`.nvmrc`=24) | Correr e2e con node 22 rompe; usar `nvm use 24` para S1/S2 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Refactor de `loginAs` rompe flows UI | medium | alto (regression) | Modo API-only aditivo; REQ-PRESERVE-01 lo valida |
| Contratos transcritos != legacy | high | medio (es el hallazgo esperado) | E2 registra pasa/falla por spec; reconciliacion explicita; `guias-status` excluido |
| `workers>1` reintroduce colisiones | medium | medio | project unico API-level; validacion runtime en S1.T4 |
| node 22 en el shell rompe e2e | medium | medio | usar node 24 (`.nvmrc`) para correr e2e; documentar en gate si no se pudo |

## Open questions

- [ ] Comportamiento de `tipo=undefined` en el helper de calculo de stats (`stats.helper.ts` no leido en intake) — resolver en S3.T2 al construir los params.

## Decisions

### DEC-LOCAL-01: E2 corre contra :4400 (nuxt-staging), no :4401
- **Contexto**: elegir el target nuxt para la comparacion de paridad E2.
- **Drivers**: `:4400` (staging, dataset clonado) es el par de datos directo del legacy-clone `:4402`; `:4401` (dev, pehuen-test minimo) no tiene par en legacy-mongo.
- **Opcion elegida**: `:4400`.
- **Alternativas**: `:4401`/pehuen-test — descartada (sin par de datos, comparacion seria ruido).
- **Consecuencias**: el user de roundtrip debe sembrarse en nuxt-staging (REQ-E402).
- **Session**: intake (ratificada por dev 2026-07-19).

### DEC-LOCAL-03: E2 = contract probe read-only; no se persigue role-gating crafted-data contra el legacy
- **Contexto**: los specs de paridad crafted-data siembran en `pehuen-test` (dev), no en la DB del server-bajo-test; los mongos staging no tienen los role-users con password conocida; el clon 443k es "NO tocar" y `:4401`/pehuen-test fue descartado para paridad (decision 1). E2 crafted-data quedaba sin destino de seed legitimo.
- **Drivers**: no mutar la referencia de paridad; el 403 role-gating es regla de cliente (DEC-LOCAL-02) → el legacy server da 200/404, correrlo re-confirmaria el delta, no validaria paridad.
- **Opcion elegida (dev, B)**: el contract probe read-only (auth + shapes, verde vs legacy real) ES el E2 significativo. El role-gating queda cubierto por los specs E3 vs nuxt + DEC-LOCAL-02.
- **Alternativas**: A (seed append-only de 5 role-users en staging) — descartada (varios casos fallarian by-design + mutacion de staging); C (dataset de paridad dedicado) — descartada por ahora (infra mayor, valor marginal dado que el gating es client-side).
- **Consecuencias**: E2 valida el contrato server-level contra el legacy (endpoints/auth/shape), no el gating de UI. Cero mutacion de staging.
- **Session**: 2.

### DEC-LOCAL-02: guias-status + cookies + currentPassword son @improvement, excluidos de E2
- **Contexto**: el spec `guias-status-parity` afirma 403 para SUPERVISOR/CONSULTOR como "paridad client".
- **Drivers**: `guia.controller.ts:36` usa `jwtMiddleware('ACCESS')` sin array de roles → el server legacy da 200/404, no 403. El 403 es regla de cliente Vue, no de servidor.
- **Opcion elegida**: retaguear `@improvement` (nuxt endurece el server) y excluir de E2 contra legacy. No se quita el gate.
- **Alternativas**: correrlo contra legacy — descartada (fallaria por diseno, no por bug).
- **Consecuencias**: E2 valida solo el subset donde server legacy y nuxt deben coincidir.
- **Session**: intake (ratificada por dev 2026-07-19).

## Acceptance checkpoints

- [ ] **Funcional**: B01 (workers>1 sin colision), E01 (skip con razon), E201 (subset vs legacy registrado), E401 (5 stats sin skip), E402 (seed durable)
- [ ] **Tests**: parity subset verde vs nuxt; roundtrip completo (3 core + 5 stats) verde
- [ ] **Regression**: flows UI verdes (REQ-PRESERVE-01); 3 comparaciones core no regresan (REQ-PRESERVE-02)
- [ ] **Rules**: RULE-MIGRATION-001/002/004 respetadas; contratos no-matcheantes reconciliados
- [ ] **Evidencia runtime (DET-36)**: cada session con evidencia de corrida real (no referencia a test file)
