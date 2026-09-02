---
id: SPEC-test-fragility-hardening
project: pehuen
ticket: PEH-019
status: done
---

# Hardening de tests fragiles (pehuen-nuxt) — 7 clases

# Hardening de tests fragiles (pehuen-nuxt) — 7 clases

## Executive summary — lo que estas aprobando

**Que se quiere**: revisar y corregir las 7 clases de tests fragiles catalogadas en PEH-018 S1.T5
(y re-verificadas con grounding en el intake de PEH-019). Un test fragil pasa/falla por la razon
equivocada: stubs que no interceptan, asserts que no muerden, esperas por reloj de pared, IDs
compartidos que colisionan, dependencias de infra no hermeticas. El objetivo es que la suite
diga la verdad — que un test verde signifique "el codigo es correcto", no "el test no miro".

**Decisiones criticas que ratificas al aprobar**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El deliverable son los TESTS + config de runner (no el codigo productivo), salvo clase A que puede tocar un runner script y clase E que puede tocar config de test-db | Es un ticket de test-hardening; el comportamiento runtime esta ratificado por PEH-013..018. Si un test endurecido destapa un bug real de runtime, se reporta como bug nuevo (no se corrige a escondidas — DET clasificacion introducido/preexistente) |
| 2 | Clase F se corrige por auditoria caso-a-caso, NO por migracion masiva: cada `vi.stubGlobal` se contrasta con como el SUT resuelve el simbolo (auto-import de Nitro = stub OK; import estatico = no-op → migrar a `vi.mock`) | Los 32 usos son en su mayoria legitimos (auto-imports de Nuxt: `useToast`, `navigateTo`, `createError`). Migrar a ciegas romperia tests que hoy funcionan bien |
| 3 | Clase G se endurece SELECTIVO: `toBeDefined` → assert de valor/estructura concreta solo donde una assertion concreta agrega poder de deteccion. Un `toBeDefined` legitimo (verificar que algo existe antes de accederlo) se deja | 100 `toBeDefined` en ~30 archivos; reescribir todos es scope creep y muchos son correctos. Foco: model tests que solo verifican presencia de campos cuyo valor si importa |
| 4 | Orden por verificabilidad: S1/S2 (unit, 100% verificable con `pnpm test:run`) primero; S3/S4 (e2e/integracion, requieren app+mongo) despues, con verificacion honesta segun infra reproducible | El valor mas alto y seguro (F/D/G) se entrega primero; lo infra-dependiente no se declara "hecho" sin evidencia runtime |

**Riesgos principales y como los mitigamos**:
- **Endurecer un assert y que destape un bug de runtime real** → se clasifica como bug (introducido vs preexistente), se reporta al dev, NO se silencia el test para que pase.
- **Migrar un `stubGlobal` legitimo y romper un test verde** → auditoria caso-a-caso con lectura del SUT antes de tocar; baseline 648/648 re-corrido tras cada clase.
- **Aflojar asserts al reemplazar `waitForTimeout`** → las web-first assertions (`expect(locator).toBeVisible()`) son MAS estrictas que un sleep, no menos; se verifica corriendo el e2e contra staging.
- **e2e no reproducible en el entorno** → block honesto por-session (evidencia de que falta), no "hecho".

**Que NO se hace**:
- No se reescribe la logica de negocio ni los schemas Zod (comportamiento ratificado).
- No se migran los `toBeDefined` legitimos ni los `stubGlobal` de auto-imports de Nuxt.
- No se resuelve el gap de paridad de los 5 stats mas alla de des-skipear el `it.skip` con params correctos (la validacion numerica profunda es follow-up de PEH-014).
- Clase B ya trackeada en PEH-017 B1 (`could`): aqui se ejecuta el fix de aislamiento, no se re-cataloga.

**Tamano estimado**: 4 sessions. S1 (F+D) y S2 (G) son T2 unit; S3 (C) y S4 (B+E+A) son T3 e2e/integracion.
La mas riesgosa es S4 (infra-dependiente, undici+vitest de clase A no resuelto aun).

**Como vas a saber que funciona**:
- S1/S2: `pnpm test:run` → 648+ verde; los tests endurecidos FALLAN si se inyecta un valor incorrecto (muerden).
- S3: e2e sin `waitForTimeout` residual (salvo justificado) corriendo verde contra staging containers.
- S4: `workers>1` sin colisiones; bloque HTTP de integracion corre fuera de vitest; `it.skip` de stats des-skipeado.

## Purpose

Endurecer la suite de tests de `pehuen-nuxt` eliminando fragilidad estructural en 7 clases
catalogadas (A-G). Para quien: el equipo de la migracion — una suite fragil da falsos verdes
(riesgo de cortar la migracion sobre cobertura ilusoria) y falsos rojos (flaky que erosiona
confianza y obliga a `--workers=1`). Dolor concreto: PEH-018 destapo un `stubGlobal` no-op que
hacia pasar un test por la razon equivocada, y la suite hoy depende del reloj de pared, de IDs
compartidos y de infra no hermetica.

## Analisis de mejora

### Estado actual (baseline, grounded 2026-07-17)
- Unit: `pnpm test:run` → **79 files / 648 tests verdes** (14.6s). Integracion aislada en `vitest.integration.config.ts`; e2e (28 specs) via Playwright.
- Clase A: 1 bloque HTTP de integracion falla dentro de vitest (undici `SocketError` determinista), aislado del pre-push en PEH-018; `it.skip` de 5 stats nunca validado.
- Clase B: IDs `ObjectId` a nivel modulo compartidos entre projects Playwright → colisiones con `workers>1` (mitigado con `--workers=1`).
- Clase C: **9 e2e / 71 usos** de `waitForTimeout` (los 4 `*-flows` por-rol son los mas cargados).
- Clase D: 5 unit usan reloj/anio real, **ninguno** usa `useFakeTimers`.
- Clase F: 32 `vi.stubGlobal`; algunos stubean helpers de dominio cuyo no-op depende de la resolucion del SUT.
- Clase G: **100 `toBeDefined`** (0 `toBeTruthy`) en ~30 archivos, concentrados en model tests.

### Estado deseado
Suite que muerde: sin stubs no-op, sin dependencia del reloj, con asserts de valor concreto donde
importa, con e2e deterministicos (web-first) y aislados por worker, e integracion HTTP corriendo
en un runner compatible. Verde bajo `workers>1` y bajo alteracion de `TZ`/fecha del sistema.

### Alcance
Se toca: tests unit/integration/e2e + config de vitest/playwright + (clase A) un runner script + (clase E) config de test-db.
NO se toca: logica de negocio, schemas Zod, endpoints, componentes runtime.

## Changes

### Modified: tests unit (clases D, F, G)
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Reloj (D) | `new Date()`/`Date.now()`/`getFullYear()` reales | `vi.useFakeTimers()` + fecha fija por test | independencia del reloj/TZ |
| Stubs (F) | `vi.stubGlobal` sobre simbolos import-estatico = no-op | `vi.mock('<modulo>')` donde el SUT importa estatico; dejar los auto-import de Nuxt | el stub debe interceptar de verdad |
| Asserts (G) | `toBeDefined` sobre valores que importan | assert de valor/estructura concreta (selectivo) | el test detecta valores incorrectos |

### Modified: tests e2e (clases B, C, E)
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Esperas (C) | `waitForTimeout(ms)` fijo | `expect(locator).toBeVisible()` / `waitFor` | determinismo, sin flaky por carga |
| IDs (B) | `ObjectId` a nivel modulo compartido | IDs por-test / fixtures aisladas por worker | recuperar `workers>1` |
| Mongo (E) | dependencia implicita de `pehuen-test` con credenciales | gate por env documentado o `mongodb-memory-server` | hermeticidad |

### Modified: integracion (clase A)
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Runner HTTP | bloque falla bajo undici+vitest | runner node plano fuera de vitest (o fix de manejo de respuesta grande) | el server responde OK via curl/node; es incompat del runner |
| Stats paridad | `it.skip` (5 endpoints) | des-skip con params por-endpoint | cobertura de paridad que nunca corrio |

## Requirements

### REQ-IMPROVE-01: Clase F — `vi.stubGlobal` que no intercepta, eliminado

> **Que cambia**: cada stub global se audita contra como el SUT resuelve el simbolo; los que son no-op (SUT importa estatico) pasan a `vi.mock`, el resto queda.
> **Por que**: un stub no-op hace pasar/fallar el test por la razon equivocada (el bug de PEH-018).

El sistema MUST asegurar que todo `vi.stubGlobal` en la suite intercepta realmente el simbolo que el SUT usa: donde el SUT importa el simbolo de forma estatica, el test MUST migrar a `vi.mock('<modulo>')`; donde el SUT lo consume como auto-import de Nitro/Nuxt (global), el `stubGlobal` MUST conservarse.

**Actor**: system · **Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: stub no-op detectado y migrado
- **GIVEN** un test que stubea `X` como global y un SUT que hace `import { X } from '<modulo>'`
- **WHEN** se ejecuta el audit
- **THEN** el test migra a `vi.mock('<modulo>')` y el mock SI intercepta (verificable: al forzar el mock a retornar un valor invalido, el test falla)

#### Scenario: stub legitimo conservado
- **GIVEN** un test que stubea `useToast`/`navigateTo` (auto-import de Nuxt)
- **THEN** se conserva `vi.stubGlobal` (el SUT los consume como global)

</details>

#### Acceptance
`pnpm test:run` verde; por cada stub migrado, una mutacion manual del mock hace fallar el test (muerde).

### REQ-IMPROVE-02: Clase D — tests independientes del reloj

> **Que cambia**: los 5 tests que usan reloj/anio real pasan a `vi.useFakeTimers()` + fecha fija.
> **Por que**: hoy pueden romper en bordes de anio o segun la `TZ` del proceso.

El sistema MUST hacer que `guide.schema.test.ts`, `guia-bulk.schema.test.ts`, `ajustes-routes.test.ts`, `ajuste-batch.test.ts` y `files-mii-routes.test.ts` produzcan el mismo resultado independientemente del reloj de pared y la `TZ`, usando timers/fechas fijas.

**Actor**: system · **Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: verde con reloj alterado
- **GIVEN** los tests D con fake timers + fecha fija
- **WHEN** se corren con `TZ=Pacific/Kiritimati` y con `TZ=Etc/GMT+12`
- **THEN** identico resultado, verde en ambos

</details>

#### Acceptance
`TZ=Pacific/Kiritimati pnpm test:run <archivos D>` y `TZ=Etc/GMT+12 ...` ambos verdes e identicos.

### REQ-IMPROVE-03: Clase G — asserts que muerden (foco model tests)

> **Que cambia**: `toBeDefined` sobre valores que importan pasa a assert de valor/estructura concreta, selectivo.
> **Por que**: `toBeDefined` pasa aunque el valor sea incorrecto — no detecta regresiones de valor.

El sistema MUST reemplazar los `toBeDefined` que solo verifican presencia de un valor cuyo contenido importa por assertions de valor/estructura concreta, priorizando los model tests (`special-models`, `user`, `guia`, `ruma`, `cancha`, `ajuste`, `producto`, `catalogs`). Los `toBeDefined` legitimos (guardas de existencia previas a acceso) MAY conservarse con justificacion.

**Actor**: system · **Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: assert endurecido muerde
- **GIVEN** un model test que hacia `expect(doc.campo).toBeDefined()`
- **WHEN** se endurece a `expect(doc.campo).toBe(<valor esperado>)` y se inyecta un valor incorrecto en el fixture
- **THEN** el test falla (antes pasaba)

</details>

#### Acceptance
`pnpm test:run` verde; muestra representativa de asserts endurecidos falla al mutar el valor esperado.

### REQ-IMPROVE-04: Clase C — esperas e2e deterministas (web-first)

> **Que cambia**: los 71 `waitForTimeout` de 9 specs pasan a web-first assertions / `waitFor`.
> **Por que**: sleeps fijos son flaky bajo carga/CI y suman lentitud.

El sistema MUST reemplazar los `waitForTimeout(ms)` por `expect(locator).toBeVisible()`/`toHaveText`/`waitFor` esperando la condicion real. Un `waitForTimeout` residual MAY quedar solo con comentario que justifique por que no hay condicion observable.

**Actor**: system · **Layers**: tests (e2e)

<details><summary>Scenarios de validacion</summary>

#### Scenario: e2e verde sin sleeps
- **GIVEN** los 9 specs migrados a web-first
- **WHEN** se corren contra los staging containers
- **THEN** verdes; `grep -rc waitForTimeout tests/e2e` = 0 (o solo residuales justificados)

</details>

#### Acceptance
e2e runnables verdes; conteo de `waitForTimeout` a 0 salvo residuales comentados. Lo no reproducible: block honesto con evidencia.

### REQ-IMPROVE-05: Clase B — e2e aislado por worker

> **Que cambia**: los `ObjectId` compartidos a nivel modulo pasan a IDs por-test / fixtures por worker.
> **Por que**: IDs fijos compartidos colisionan con `workers>1` (hoy mitigado con `--workers=1`, lento).

El sistema MUST eliminar la dependencia de IDs `ObjectId` compartidos entre projects Playwright, generando IDs por-test o fixtures aisladas por worker, de modo que la suite e2e corra con `workers>1` sin colisiones.

**Actor**: system · **Layers**: tests (e2e)

<details><summary>Scenarios de validacion</summary>

#### Scenario: paralelismo recuperado
- **GIVEN** `rumas-bulk-edit.spec.ts` y specs de paridad con IDs aislados
- **WHEN** se corre e2e con `workers>1`
- **THEN** sin colisiones de datos entre workers

</details>

#### Acceptance
e2e verde con `workers>1` (default de config), sin `--workers=1` forzado.

### REQ-IMPROVE-06: Clase E — e2e mongo hermetico o con gate

> **Que cambia**: la dependencia implicita del mongo `pehuen-test` con credenciales pasa a gate por env documentado o `mongodb-memory-server`.
> **Por que**: hoy los specs asumen un mongo con estado/credenciales concretos → no hermeticos.

El sistema MUST hacer explicita la dependencia de mongo de los specs afectados: o bien un gate por env (skip documentado si no esta disponible) o bien `mongodb-memory-server`. La eleccion se decide en la task con pros/contras.

**Actor**: system · **Layers**: tests (e2e), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: prerequisito explicito
- **GIVEN** un entorno sin el mongo `pehuen-test`
- **WHEN** se corren los specs de clase E
- **THEN** skip documentado con mensaje claro (no fallo opaco), o mongo efimero levantado por el runner

</details>

#### Acceptance
Los specs de clase E no fallan de forma opaca sin mongo; el prerequisito queda documentado o auto-provisto.

### REQ-IMPROVE-07: Clase A — runner de integracion HTTP + stats des-skipeado

> **Que cambia**: el bloque HTTP corre en un runner compatible (fuera de vitest o con el manejo de respuesta grande resuelto); el `it.skip` de 5 stats se des-skipea con params por-endpoint.
> **Por que**: el bloque falla por incompat undici+vitest (server responde OK via curl/node); la paridad de stats nunca se valido.

El sistema MUST hacer que el bloque `HTTP auth-protected` de `migration-roundtrip.test.ts` corra verde en un runner compatible, y MUST des-skipear el test de paridad de los 5 stats construyendo los params por-endpoint. La validacion numerica profunda de stats queda como follow-up de PEH-014.

**Actor**: system · **Layers**: tests (integration)

<details><summary>Scenarios de validacion</summary>

#### Scenario: HTTP corre fuera de vitest
- **GIVEN** el runner node plano (o el fix del manejo de respuesta grande)
- **WHEN** se ejecuta el bloque HTTP contra el legacy clone
- **THEN** login 200 + counts de paridad verdes, sin `SocketError`

</details>

#### Acceptance
Bloque HTTP verde en su runner; `it.skip` de stats des-skipeado y corriendo (aunque la validacion numerica profunda sea follow-up).

### REQ-PRESERVE-01: Suite unit verde y comportamiento intacto (regression, DET-7)

> **Que cambia**: nada — garantia de no regresion.
> **Por que**: endurecer tests no debe cambiar comportamiento runtime ni tumbar tests sanos.

El sistema MUST mantener la suite unit en 648+ verde tras cada clase, sin alterar comportamiento runtime. Si un test endurecido destapa un bug real, MUST reportarse como bug (clasificado introducido/preexistente), no silenciarse.

**Actor**: system · **Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: baseline preservado
- **WHEN** `pnpm test:run` tras cada session
- **THEN** >= 648 verde, 0 fail (o el delta explicado por tests des-skipeados que ahora corren)

</details>

#### Acceptance
`pnpm test:run` verde al cierre de cada session; ningun bug de runtime silenciado.

### REQ-PRESERVE-02: Sin cambios de codigo productivo (salvo A/E acotado)

> **Que cambia**: el codigo runtime no se toca; excepciones acotadas y justificadas (A: runner script; E: config test-db).
> **Por que**: el deliverable son los tests; el comportamiento esta ratificado.

El sistema MUST no modificar logica de negocio, schemas ni endpoints. Las unicas ediciones fuera de tests permitidas son: config de runner (vitest/playwright), un runner script para clase A, y config de test-db para clase E — cada una justificada en su task.

**Actor**: system · **Layers**: tests, config

#### Acceptance
`git diff --stat` al cierre: cambios acotados a tests + config + (A) runner + (E) test-db config.

## Constraints

- RULE-MIGRATION-002 (TDD): los tests SON el deliverable; se endurecen validando que muerden (asserts concretos, no `toBeDefined`/`toBeTruthy` donde el valor importa).
- DET-7: regression obligatoria (suite completa como baseline Before/After por session).
- DET-13: cierre por evidencia — e2e/integracion no se declaran "hecho" sin corrida real.
- Config critical_rules del proyecto: sin `console.log` en runtime; auto-imports de Nitro NO se importan manual (relevante para distinguir stub legitimo vs no-op en clase F).
- Codigo en ingles, comentarios en espanol; commit subject ≤72.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Endurecer un assert destapa un bug de runtime real | medium | medium | Clasificar introducido/preexistente, reportar al dev, NO silenciar (REQ-PRESERVE-01) |
| Migrar un `stubGlobal` legitimo rompe test sano | medium | medium | Auditoria caso-a-caso leyendo el SUT; baseline 648 re-corrido tras cada clase |
| Web-first assertions mal escritas (esperan condicion equivocada) | low | medium | Correr e2e contra staging; verificar que fallan si la condicion no ocurre |
| e2e/integracion no reproducible en el entorno | medium | low | Block honesto por-session con evidencia; no "hecho" |
| Clase A undici+vitest sin fix viable | medium | medium | Fallback: runner node plano fuera de vitest (ya identificado en catalogo) |

## Open questions

- Clase E: gate por env vs `mongodb-memory-server` — se decide en S4.T (pros/contras) segun si los specs necesitan datos sembrados especificos.
- Clase A: fix del manejo de respuesta grande bajo undici vs runner node plano — se decide en S4 tras reintentar reproducir.

## Decisions

### DEC-LOCAL-01: Auditoria caso-a-caso para clase F (no migracion masiva)
- **Contexto**: 32 `vi.stubGlobal`, mayoria auto-imports legitimos de Nuxt
- **Drivers**: no romper tests sanos; corregir solo los no-op reales
- **Opcion elegida**: leer el SUT de cada stub, migrar a `vi.mock` solo import-estatico
- **Alternativas**: migrar todo a `vi.mock` — descartada: rompe los auto-import de Nuxt que dependen del global
- **Session**: design (2026-07-17)

### DEC-LOCAL-02: Clase G selectiva, no blanket
- **Contexto**: 100 `toBeDefined`, muchos legitimos
- **Opcion elegida**: endurecer solo donde el valor importa (foco model tests)
- **Alternativas**: reescribir los 100 — descartada: scope creep + muchos asserts de presencia son correctos
- **Session**: design (2026-07-17)

### DEC-LOCAL-03: Orden por verificabilidad (unit antes que e2e)
- **Contexto**: super autopilot, verificacion honesta
- **Opcion elegida**: S1/S2 unit (100% verificable) → S3/S4 e2e/integracion (infra-dependiente)
- **Consecuencias**: valor alto y seguro primero; lo infra-dependiente con block honesto si falta evidencia
- **Session**: design (2026-07-17)

## Tasks

### Session 1 — Clase F (audit stubGlobal no-op) + Clase D (reloj/anio) [tipo: auto] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Preflight: crear branch `PEH-019-test-fragility-hardening` desde develop + re-confirmar baseline (648/648) | REQ-PRESERVE-01 | developer | — | git, (lectura) | baseline 648 reproducido en branch | git: borrar branch | DET-11 | done | 1 |
| S1.T2 | Clase F: auditar los 32 `vi.stubGlobal` leyendo el SUT de cada uno; migrar a `vi.mock('<modulo>')` los que stubean simbolos import-estatico (no-op); conservar los auto-import de Nuxt. Empezar por helpers de dominio (`auth.test.ts`, `auth-tokens`, `auth-jwt-alg`, `validation`, `role`) | REQ-IMPROVE-01 | developer | S1.T1 | pehuen_nuxt/tests/unit/**/*.test.ts (los que usan stubGlobal) | `pnpm test:run` verde; por cada migracion, mutacion del mock hace fallar el test | git revert | DET-7, RULE-MIGRATION-002 | done | 1 |
| S1.T3 | Clase D: `vi.useFakeTimers()` + fecha fija en los 5 archivos (`guide.schema`, `guia-bulk.schema`, `ajustes-routes`, `ajuste-batch`, `files-mii-routes`) | REQ-IMPROVE-02 | developer | S1.T1 | pehuen_nuxt/tests/unit/schemas/guide.schema.test.ts, guia-bulk.schema.test.ts, pehuen_nuxt/tests/unit/server/api/ajustes-routes.test.ts, files-mii-routes.test.ts, pehuen_nuxt/tests/unit/server/services/ajuste-batch.test.ts | verde con `TZ=Pacific/Kiritimati` y `TZ=Etc/GMT+12` | git revert | DET-7 | done | 1 |
| S1.T4 | Regression S1: `pnpm test:run` 648+ verde; commits `test:` granulares (F y D separados); reportar bugs de runtime si algun assert endurecido los destapa | REQ-PRESERVE-01 | reviewer | S1.T2, S1.T3 | (verificacion) | suite verde; bugs clasificados si aparecen | git revert | DET-7, DET-13, DET-27 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir, quality review 10-dim, decision continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Clase G (asserts debiles, foco model tests) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Clase G model tests: endurecer `toBeDefined` → assert de valor/estructura concreta en `special-models`, `user`, `guia`, `ruma`, `cancha`, `ajuste`, `producto`, `catalogs`/`catalog` (donde el valor importa; conservar guardas de existencia legitimas) | REQ-IMPROVE-03 | developer | — | pehuen_nuxt/tests/unit/server/models/*.test.ts | `pnpm test:run` verde; muestra de asserts falla al mutar el valor esperado | git revert | DET-7, RULE-MIGRATION-002 | done | 2 |
| S2.T2 | Clase G resto: revisar `RumaForm`, `DataTable`, `LoginForm`, `StatsGraphs`, `useReportList`, `guide.schema`, schemas y auth utils; endurecer selectivo lo que aplique | REQ-IMPROVE-03 | developer | S2.T1 | pehuen_nuxt/tests/unit/components/*.test.ts, pehuen_nuxt/tests/unit/composables/useReportList.test.ts, pehuen_nuxt/tests/unit/schemas/*.test.ts | `pnpm test:run` verde; asserts muerden | git revert | DET-7 | done | 2 |
| S2.T3 | Regression S2: `pnpm test:run` 648+ verde; commit `test:` de clase G; reportar bugs si aparecen | REQ-PRESERVE-01 | reviewer | S2.T1, S2.T2 | (verificacion) | suite verde | git revert | DET-7, DET-13, DET-27 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, quality review, decision | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | done | 2 |

### Session 3 — Clase C (waitForTimeout → web-first) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Preflight e2e: levantar/confirmar staging containers (nuxt + mongo) alcanzables; capturar baseline e2e (que specs corren hoy y cuales dependen de infra) | REQ-IMPROVE-04 | developer | — | (lectura), docker | baseline e2e documentado | (no aplica) | DET-11, DET-13 | done | 3 |
| S3.T2 | Clase C: reemplazar `waitForTimeout` por web-first en los 4 `*-flows` por-rol (`asesor` 15, `receptor` 12, `supervisor` 11, `consultor` 11) | REQ-IMPROVE-04 | developer | S3.T1 | pehuen_nuxt/tests/e2e/asesor-flows.spec.ts, receptor-flows.spec.ts, supervisor-flows.spec.ts, consultor-flows.spec.ts | specs runnables verdes contra staging; sin waitForTimeout residual salvo justificado | git revert | DET-7 | pending | 3 |
| S3.T3 | Clase C resto: `guia-crear` (8), `admin-login` (6), `admin-flows` (6), `products` (1), `ajustes` (1) | REQ-IMPROVE-04 | developer | S3.T1 | pehuen_nuxt/tests/e2e/guia-crear.spec.ts, admin-login.spec.ts, admin-flows.spec.ts, products.spec.ts, ajustes.spec.ts | idem; `grep -rc waitForTimeout tests/e2e` = 0/justificado | git revert | DET-7 | pending | 3 |
| S3.T4 | Regression S3: correr e2e runnables verdes; block honesto (con evidencia) de lo no reproducible; commit `test(e2e):` | REQ-IMPROVE-04 | reviewer | S3.T2, S3.T3 | (verificacion) | e2e verde o block honesto documentado | git revert | DET-7, DET-13, DET-27 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, quality review, runtime-verification (DET-36), decision | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + evidencia runtime o block | (no aplica) | DET-13, DET-20, DET-23, DET-36 | done | 3 |

### Session 4 — Clase B (worker isolation) + Clase E (mongo) + Clase A (integration runner) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Clase B: reemplazar `ObjectId` compartidos a nivel modulo por IDs por-test / fixtures aisladas por worker en `rumas-bulk-edit`, `guias-status-parity`, `rumas-volume-parity` | REQ-IMPROVE-05 | developer | — | pehuen_nuxt/tests/e2e/rumas-bulk-edit.spec.ts, pehuen_nuxt/tests/e2e/migration-paridad/api-guias/guias-status-parity.spec.ts, pehuen_nuxt/tests/e2e/migration-paridad/api-rumas/rumas-volume-parity.spec.ts | e2e verde con `workers>1` sin colisiones | git revert | DET-7 | pending | 4 |
| S4.T2 | Clase E: decidir (pros/contras) gate por env vs `mongodb-memory-server` para specs sobre mongo real; implementar la opcion elegida | REQ-IMPROVE-06 | developer | S4.T1 | pehuen_nuxt/tests/e2e/rumas-bulk-edit.spec.ts, rumas-volume-parity.spec.ts, playwright.config.ts | sin mongo: skip documentado (no fallo opaco) o mongo efimero levantado | git revert | DET-8 | pending | 4 |
| S4.T3 | Clase A: reintentar reproducir el `SocketError`; implementar runner node plano fuera de vitest (o fix del manejo de respuesta grande) para el bloque HTTP; des-skipear el `it.skip` de 5 stats con params por-endpoint | REQ-IMPROVE-07 | developer | S4.T1 | pehuen_nuxt/tests/integration/migration-roundtrip.test.ts, vitest.integration.config.ts, (runner script si aplica) | bloque HTTP verde en su runner; stats des-skipeado corriendo | git revert | DET-7, DET-8 | pending | 4 |
| S4.T4 | Regression S4 + cierre de scope: e2e con `workers>1` verde; integracion HTTP verde; suite unit 648+ intacta; commits granulares; block honesto de lo no reproducible | REQ-PRESERVE-01 | reviewer | S4.T1, S4.T2, S4.T3 | (verificacion) | todo verde o block honesto documentado | git revert | DET-7, DET-13, DET-27 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, quality review, runtime-verification (DET-36), decision + preparar cierre (close requiere OK dev) | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | gate persistido + evidencia o block; ticket listo para close | (no aplica) | DET-13, DET-20, DET-23, DET-36 | pending | 4 |

## Acceptance checkpoints

- [ ] **Funcional**: F (stubs no-op eliminados, muerden), D (independientes del reloj), G (asserts concretos muerden), C (web-first, sin sleeps), B (workers>1), E (hermetico/gated), A (HTTP en runner + stats des-skip)
- [ ] **Tests**: suite unit 648+ verde tras cada session; e2e runnables verdes contra staging; integracion HTTP verde en su runner
- [ ] **Rules**: RULE-MIGRATION-002 (tests que muerden), DET-7 (regression por session), DET-13 (cierre por evidencia), DET-27 (commits granulares)
- [ ] **Integration**: `pnpm test:run` verde; e2e con `workers>1` sin colisiones; no regresion de comportamiento runtime
- [ ] **Docs**: prerequisito de mongo (clase E) documentado si se elige gate por env
