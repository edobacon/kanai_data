---
id: SPEC-storage-tests-stale-lint
project: pehuen
ticket: PEH-018
status: approved
---

# Tests de LocalStorage stale + lint del CI — alinear al refactor de filenames

# Tests de LocalStorage stale + lint del CI — alinear al refactor de filenames

## Executive summary — lo que estas aprobando

**Que se quiere**: poner en verde la suite y el CI de `develop`, rojos desde el commit `a170b46` (consolidacion del in-flight PEH-002/PEH-013, entrado con `--no-verify`). Dos frentes: (1) **3 tests de `LocalStorage` stale** — el refactor hizo que `upload` genere el nombre del archivo (`generateFilename`) en vez de preservar el del caller, y los tests siguen hardcodeando `'rumas/test-file.jpg'`; (2) **4 errores de eslint** en `scripts/audit-migration-parity.mjs` que tienen el job `lint` de GitHub Actions rojo.

**Decision critica que ratificas al aprobar este spec**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El comportamiento nuevo de `upload` (nombre generado `{domain}-{timestamp}-{random}.{ext}`) es el **deseado** → el fix va en los TESTS, no en el codigo | Evidencia H1: es transversal (local + r2), tiene test propio (11/11) y los 3 consumidores productivos ya encadenan el `key` retornado. Si lo refutas, el alcance cambia a codigo en ambos providers (re-design) |
| 2 | Los tests encadenan `result.key` y assertean el **patron** del nombre (regex), no el literal | Tests que muerden y sobreviven al naming generado |
| 3 | Commits separados: `fix(test)` para los tests, `chore(lint)` para el script | Granularidad DET-27; el lint fix no depende de la decision #1 |

**Riesgos principales y como los mitigamos**:
- **Aflojar los asserts al pasar a regex** → el patron exige formato completo (`/^rumas\/rumas-\d+-[a-z0-9]{6}\.jpg$/`) y el caso `delete` sigue verificando `exists` true→false sobre el key real.
- **Cambiar la logica del script al "arreglar" el lint** → los 4 fixes son mecanicos (2 consts muertas, 1 escape, 1 console) verificados linea por linea en intake (H5); se valida corriendo el script igual que antes si hay duda.

**Que NO se hace**:
- No se toca `local.ts` / `r2.ts` / `validation.ts` (el codigo es el comportamiento ratificado).
- No se crea unit de R2 (gap preexistente, fuera de scope — `generateFilename` compartido ya esta cubierto).
- No se revierte el `--no-verify` historico ni se cambia el pipeline de hooks.

**Tamano estimado**: 1 session (~1h, T1). Riesgo bajo — solo tests + lint mecanico.

**Como vas a saber que funciona**:
- `pnpm vitest run tests/unit` → **648/648 verde** (los 3 rojos pasan).
- `pnpm lint` → 0 errores.
- El push sale **sin `--no-verify`** y el run de GitHub Actions queda verde.

## Purpose

Fix de los 2 bloqueos de calidad publicados en develop por `a170b46`: 3 unit tests de `LocalStorage` stale respecto al refactor de filenames (causa raiz: hardcodean el nombre que `upload` ya no preserva) y 4 errores de eslint en `scripts/audit-migration-parity.mjs`. Afecta a todo el equipo: el pre-push hook local y el CI bloquean cualquier integracion mientras sigan rojos.

## Fix scope

### Antes (comportamiento actual)
- `local.test.ts`: `upload` se assertea contra `key === 'rumas/test-file.jpg'` y `url === '/api/storage/rumas/test-file.jpg'`; `download`/`exists`/`delete` operan sobre ese literal → 3 tests rojos (`upload` genera `rumas/rumas-{ts}-{rnd}.jpg` via `generateFilename`, `validation.ts:71-76`).
- `scripts/audit-migration-parity.mjs`: 4 errores eslint — L37 `NUXT_APP` y L39 `DECKARD_PEHUEN` sin uso; L180 `\[` escape innecesario en character class; L431 `console.log` (config permite solo warn/error).
- Suite: 645 pass / 3 fail (648). CI: job lint rojo.

### Despues (comportamiento esperado)
- Los 3 tests encadenan `result.key` (download/exists/delete sobre el key retornado) y assertean patron: key `/^rumas\/rumas-\d+-[a-z0-9]{6}\.jpg$/`, url `/^\/api\/storage\/rumas\/rumas-\d+-[a-z0-9]{6}\.jpg$/`.
- Script sin las 2 consts muertas, regex `/[[\]'"]/g`, salida por `console.warn` o `process.stdout.write`. Logica identica.
- Suite 648/648; `pnpm lint` exit 0; CI verde; pre-push pasa sin bypass.

### Archivos afectados

| Archivo | Cambio | Por que |
|---------|--------|---------|
| `pehuen_nuxt/tests/unit/server/utils/storage/local.test.ts` | 3 tests: encadenar `result.key` + asserts por regex | REQ-FIX-01 (causa raiz: literal stale) |
| `pehuen_nuxt/scripts/audit-migration-parity.mjs` | eliminar 2 consts muertas; `/[[\]'"]/g`; `console.log` → salida permitida | REQ-FIX-02 (H5, sin cambio de logica) |

## Requirements

### REQ-FIX-01: Tests de LocalStorage alineados al naming generado

> **Que cambia**: los 3 tests rojos pasan a encadenar el `key` que `upload` retorna y a validar el formato generado — vuelven a verde y muerden de verdad.
> **Por que**: hardcodean un filename que `upload` (deliberadamente) ya no preserva; hoy bloquean pre-push y CI.

Los tests de `LocalStorage` MUST operar sobre `result.key` retornado por `upload` (download/exists/delete) y MUST assertear el patron completo del nombre generado (`{domain}/{domain}-{timestamp}-{random6}.{ext}`) en key y url, no literales.

**Actor**: system
**Layers**: tests

<details><summary>Scenarios de validacion</summary>

#### Scenario: upload retorna key/url con formato generado
- **GIVEN** un buffer y `{ domain: 'rumas', filename: 'test-file.jpg' }`
- **WHEN** `storage.upload(...)`
- **THEN** `result.key` matchea `/^rumas\/rumas-\d+-[a-z0-9]{6}\.jpg$/` y `result.url` el patron equivalente con prefijo `/api/storage/`

#### Scenario: download/delete encadenan el key real
- **GIVEN** un upload exitoso
- **WHEN** `download(result.key)` / `exists(result.key)` / `delete(result.key)`
- **THEN** download retorna el contenido subido; exists pasa true→false tras delete

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm vitest run tests/unit/server/utils/storage/local.test.ts` → verde, y los asserts fallan si se rompe el filtro de formato o el encadenado.

### REQ-FIX-02: Lint del script de auditoria en 0 errores

> **Que cambia**: `scripts/audit-migration-parity.mjs` deja de romper `eslint .` (job lint del CI) con 4 fixes mecanicos.
> **Por que**: entraron sin pasar por lint-staged (`a170b46` con `--no-verify`); el CI los atrapo.

El script MUST quedar sin las consts muertas `NUXT_APP`/`DECKARD_PEHUEN` (L37/L39), con la regex sin escape innecesario (L180 → `/[[\]'"]/g`) y sin `console.log` (L431 → `console.warn` o `process.stdout.write`), manteniendo la logica y el output del script identicos.

**Actor**: system
**Layers**: scripts, ci

<details><summary>Scenarios de validacion</summary>

#### Scenario: lint verde
- **GIVEN** los 4 fixes aplicados
- **WHEN** `pnpm lint`
- **THEN** exit 0

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `pnpm lint` local en 0 y job lint de Actions verde en el siguiente push.

### REQ-REGRESSION-01: Resto de la suite y comportamiento de storage intactos

> **Que cambia**: nada — garantia de no regresion (DET-7).
> **Por que**: el fix toca tests y un script de tooling; ningun comportamiento runtime debe moverse.

El sistema MUST mantener: los 645 tests que hoy pasan, sin cambios de expectativa; el comportamiento runtime de `local.ts`/`r2.ts`/`validation.ts` (cero ediciones); la salida funcional del script de auditoria. El pre-push hook MUST pasar sin `--no-verify` al cierre.

**Actor**: system
**Layers**: tests, ci

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite completa verde
- **WHEN** `pnpm vitest run tests/unit`
- **THEN** 648/648 (645 preexistentes + 3 realineados), 0 fail

</details>

#### Acceptance
**El usuario puede verificar que funciona**: push normal (hook activo) sale limpio; CI completo verde.

## Constraints

- RULE-MIGRATION-002 (TDD): aqui los tests SON el deliverable — se realinean al comportamiento ratificado, validando que muerden (asserts por patron completo, no `toBeTruthy`).
- DET-7: regression obligatoria (suite completa + lint como baseline Before/After ya medidos en intake).
- Codigo en ingles, comentarios en espanol; commitlint subject ≤72, body lines ≤100 (gotcha del repo).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Asserts por regex demasiado laxos (tests que no muerden) | low | medium | Regex de formato completo + encadenado funcional (download retorna contenido; exists true→false) |
| Fix de lint altera la salida del script de auditoria | low | low | Cambios mecanicos verificados linea a linea (H5); diff acotado a 4 puntos |
| El dev refuta la decision #1 (filename debia preservarse) | low | high | El spec lo hace explicito en el Executive summary; si se refuta → escalar a re-design (codigo en 2 providers) |

## Open questions

(ninguna — H1-H5 confirmadas en intake-explore; la ratificacion de la decision #1 ocurre con la aprobacion de este spec)

## Decisions

### DEC-LOCAL-01: Asserts por patron + encadenado de `result.key` (no mockear `generateFilename`)
- **Contexto**: los tests necesitan sobrevivir a nombres no-deterministas (`Date.now()` + random)
- **Drivers**: tests que muerden, sin tocar codigo productivo, sin acoplar el test al detalle interno
- **Opcion elegida**: encadenar el `key` retornado + regex del formato completo
- **Alternativas**: (a) mockear `generateFilename` para nombre fijo — descartada: acopla el test al import interno y deja de cubrir la integracion real; (b) inyectar filename determinista — descartada: requiere cambiar la firma productiva solo para tests
- **Consecuencias**: los tests validan el contrato publico (`{key, url}`) tal como lo usan los consumidores reales
- **Session**: design (2026-06-12)

### DEC-LOCAL-02: Commits separados por tipo
- **Contexto**: dos frentes independientes (tests vs lint)
- **Opcion elegida**: `fix(test): ...` + `chore(lint): ...` (granularidad DET-27)
- **Alternativas**: commit unico — descartada: mezcla tipos y dificulta revert selectivo
- **Session**: design (2026-06-12)

## Tasks

### Session 1 — Realinear tests de LocalStorage + lint del script + verdes [tipo: ⚑ fuerte] [tier: T1]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Preflight: branch `PEH-018-storage-tests-lint` desde develop + re-confirmar baseline (suite 645/3 + `pnpm lint` 4 err) | REQ-REGRESSION-01 | developer | — | git, (lectura) | baseline reproducido | git: borrar branch | DET-11 | done | 1 |
| S1.T2 | Realinear los 3 tests de `local.test.ts`: encadenar `result.key` + asserts por regex de formato completo (key y url) | REQ-FIX-01 | developer | S1.T1 | pehuen_nuxt/tests/unit/server/utils/storage/local.test.ts | `vitest run local.test.ts` verde; mutacion manual rapida (quitar filtro VIGENTE no aplica aqui — verificar que regex rechaza literal viejo) | git revert | DET-7, RULE-MIGRATION-002 | done | 1 |
| S1.T3 | Lint fixes en `audit-migration-parity.mjs`: eliminar consts muertas L37/L39, regex L180 `/[[\]'"]/g`, L431 salida permitida | REQ-FIX-02 | developer | S1.T1 | pehuen_nuxt/scripts/audit-migration-parity.mjs | `pnpm lint` 0 errores; logica intacta (diff de 4 puntos) | git revert | DET-8 | done | 1 |
| S1.T4 | Regression + cierre: suite completa 648/648 + lint 0 + commits `fix(test)` y `chore(lint)` + push CON hook activo (sin --no-verify) + verificar CI verde | REQ-REGRESSION-01 | developer | S1.T2, S1.T3 | (verificacion) | suite verde; hook pre-push pasa; run de Actions verde | git revert local; push requiere OK dev | DET-7, DET-13, DET-27 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir, quality review, decision | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23, DET-27 | done | 1 |

## Acceptance checkpoints

- [ ] **Funcional**: 3 tests de LocalStorage verdes con asserts que muerden (REQ-FIX-01); `pnpm lint` 0 errores (REQ-FIX-02)
- [ ] **Tests**: suite unit 648/648; baseline Before (645/3) → After (648/0) registrado
- [ ] **Rules**: RULE-MIGRATION-002 (tests realineados validados), DET-7 (regression), DET-27 (commits por tipo)
- [ ] **Integration**: pre-push hook pasa sin `--no-verify`; CI (tests + lint) verde en develop
- [ ] **Docs**: no aplica (sin cambio de comportamiento; el ticket documenta el patron)
