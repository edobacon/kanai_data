---
id: SPEC-global-modernize-conventions
project: jormat-evolution
ticket: JOR-039
status: done
---

# Guardarrail ESLint de convenciones modernas + refactors acotados (switch / ternario)

# Guardarrail ESLint de convenciones modernas + refactors acotados (switch / ternario)

## Executive summary — lo que estas aprobando

**Que se quiere**: codificar las convenciones modernas de JS/TS como reglas ESLint en ambos
paquetes (guardarrail anti-regresion) y aplicar los pocos refactors manuales de alto valor que
no son autofixables (5 cadenas `if`→`switch` + 1 `if/else`→ternario). Cero cambio de
comportamiento.

**Por que el alcance es chico**: el analisis empirico de intake (JOR-039) midio que lo mecanico
(`==`, `var`, `let`→`const`) ya esta limpio — 0 violaciones reales en codigo nuestro Y en la base
entregada. El valor real es el guardarrail (hoy ESLint existe pero no incluye estas reglas) + los
refactors de legibilidad acotados.

**Decisiones criticas (ya resueltas en design)**:

| # | Decision | Por que | Evidencia |
|---|----------|---------|-----------|
| 1 | Reglas como **`error`** (no `warn`): `eqeqeq` con opcion `'smart'`, `no-var`, `prefer-const`, `prefer-arrow-callback` | `error` da un guardarrail real (falla lint/CI ante regresion). Es seguro porque hay 0 violaciones tanto en codigo nuestro como en la base entregada → no rompe nada ni viola RULE-global-003 | Grep delivered: 0 `==`/`!=`, 0 `let`, 0 `var`, 0 callbacks anonimos. `eqeqeq: 'smart'` preserva el `== null` idiomatico (L2) |
| 2 | **No** hace falta override por path ni mitigacion de pre-commit | `lint-staged` raiz solo corre `prettier --write`, NO `eslint --fix` → agregar reglas autofixables no auto-modifica la base entregada en commit. RULE-global-003 a salvo | `package.json` raiz: `lint-staged: { "*.{ts,tsx,...}": "prettier --write" }` |

**Riesgos y mitigacion**:
- **Una regla rompe el lint de algun archivo nuestro no medido** (ej. `let`-never-reassigned en un `*.spec.ts`) → tras editar cada config se corre `npm run lint` del paquete; si aparece un error en codigo nuestro se corrige en el acto (cambio permitido, es codigo nuestro). Si apareciera en la base entregada (no esperado), se baja la regla a `warn` para ese path.
- **Refactor switch/ternario cambia comportamiento** → baseline de tests capturado ANTES; cada gate re-corre la suite y exige paridad (DET-7).

**Que NO se hace** (out-of-scope):
- No se convierten las 119 `function`→arrow (Backlog B1 del ticket): riesgo de hoisting, bajo valor, 83 son componentes React idiomaticos.
- No se toca la base entregada (RULE-global-003): `auth/workspaces/users/database/health` + migraciones + seeds.
- No se agregan dependencias npm.

**Tamano estimado**: 2 sessions, ~2-3h efectivas.

---

## Purpose

Agregar reglas de convencion a los `eslint.config.mjs` de `backend/jormat-api` y `front/jormat-front`
como guardarrail anti-regresion, y refactorizar los casos manuales de alto valor (switch/ternario)
identificados en intake. Refactor de estilo + tooling: el comportamiento externo NO cambia.

## Requirements

### REQ-01: Guardarrail ESLint de convenciones modernas en ambos paquetes

> **Que cambia**: `backend/jormat-api/eslint.config.mjs` y `front/jormat-front/eslint.config.mjs`
> suman las reglas `eqeqeq` (opcion `'smart'`), `no-var`, `prefer-const`, `prefer-arrow-callback`.
> **Por que**: hoy ESLint existe pero no enforza estas convenciones — nada previene que reaparezcan
> `==`, `var`, `let`-reasignable o callbacks `function` anonimos. RULE-global-001 (DoD de calidad) las
> asume como linea base.

El sistema MUST incluir en ambos `eslint.config.mjs`, sobre los archivos `*.ts`/`*.tsx`, las reglas:
`eqeqeq: ['error', 'smart']`, `no-var: 'error'`, `prefer-const: 'error'`, `prefer-arrow-callback: 'error'`.
`npm run lint` MUST quedar verde en ambos paquetes tras el cambio (0 errores en codigo actual).

**Actor**: system (tooling de lint)
**Layers**: frontend, backend
**Certainty**: confirmed · **source_ref**: JOR-039 Triage H2, RULE-global-001 §Verification

<details><summary>Scenarios de validacion</summary>

#### Scenario: la regla muerde ante regresion
- **GIVEN** las reglas estan activas en el config
- **WHEN** se introduce un `if (a == b)` (no-null) de prueba en un archivo nuestro
- **THEN** `npm run lint` reporta error `eqeqeq` en esa linea
- **AND** al revertir la prueba, `npm run lint` vuelve a verde

#### Scenario: `== null` idiomatico NO se marca
- **GIVEN** `eqeqeq: ['error', 'smart']`
- **WHEN** existe `x != null` en el codigo
- **THEN** la regla NO lo reporta (opcion smart permite comparacion contra null)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm run lint` verde en ambos paquetes; un `==` de prueba dispara el error y desaparece al revertir.

### REQ-02: Cadenas `if` de comparacion de estado refactorizadas a `switch` (zero behavior change)

> **Que cambia**: 4 cadenas de `if` que despachan por el mismo valor (`id`) contra constantes pasan a
> `switch`: los 4 `handleRemoveFilter` (PagosClientesListView, DocumentosListView, ItemsListView,
> CapabilityMatrix) en front.
> **Por que**: legibilidad — `switch` expresa mejor el dispatch de un valor contra estados/enum.
>
> **Ajuste en execute (S2.T3, 2026-06-23)**: el 5to caso candidato (resolucion de CORS en
> `config/env.validation.ts`) se **descarto**: NO es un dispatch por valor sino un `if/else-if` con
> guardas booleanas heterogeneas (chequeo de vacio + igualdad a `'*'`). Convertirlo a `switch` exigiria
> `switch(true)` (anti-patron) o un discriminante artificial → empeora la legibilidad. Se mantiene el
> `if/else-if` original. Decision del dev (descartar). Solo backend queda sin cambios en este REQ.

El sistema MUST refactorizar las 4 cadenas `handleRemoveFilter` a `switch` preservando exactamente la
logica (misma rama tomada para cada valor de entrada). El comportamiento observable MUST ser identico
(los tests existentes pasan sin cambios).

**Actor**: system
**Layers**: frontend, backend
**Certainty**: confirmed · **source_ref**: JOR-039 Triage H3 (catalogo de intake)

<details><summary>Scenarios de validacion</summary>

#### Scenario: handleRemoveFilter preserva el borrado por chip
- **GIVEN** un listado con varios filtros activos
- **WHEN** se remueve cada chip de filtro (cada `id` posible)
- **THEN** el filtro correspondiente se limpia igual que antes del refactor (verificado por los tests del componente)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `vitest run` (front) y `jest` (back) verdes con delta 0 fallos vs baseline.

### REQ-03: ~~`if/else` simple refactorizado a ternario (UserFormModal)~~ — DESCARTADO

> **Descartado en execute (S2.T3, 2026-06-23)** — decision del dev.
>
> El `if (isEdit) { onUpdate?.({...}) } else { onCreate?.({...}) }` del submit NO es un buen candidato a
> ternario: las dos ramas llaman **funciones distintas** (`onUpdate` vs `onCreate`) con **payloads
> distintos** (multilinea). Un ternario usado solo por su efecto colateral, con dos object-literals
> grandes, es "clever sobre explicito" — contra `RULE-global-001 §C4 (KISS)`. Se mantiene el `if/else`
> original. No hay cambio de codigo para este REQ.

**Actor**: n/a (descartado) · **source_ref**: JOR-039 S2.T3 inspeccion + decision del dev

### REQ-PRESERVE: La suite de tests no regresiona

> **Que cambia**: nada nuevo — se exige que la suite completa quede igual o mejor.
> **Por que**: DET-7 — todo refactor preserva comportamiento, verificado por regression.

El sistema MUST mantener la suite de tests con delta 0 fallos nuevos respecto a la baseline capturada al
inicio de S2. `tsc --noEmit` MUST quedar sin errores en ambos paquetes.

**Actor**: system
**Layers**: frontend, backend
**Certainty**: confirmed · **source_ref**: DET-7

## Tasks

### Session 1 — Guardarrail ESLint

#### S1.T1 — Agregar reglas al config del backend
- **Contract**: editar `backend/jormat-api/eslint.config.mjs` agregando al bloque `rules`: `eqeqeq: ['error', 'smart']`, `no-var: 'error'`, `prefer-const: 'error'`, `prefer-arrow-callback: 'error'`. Correr `npm run lint` en `backend/jormat-api`.
- **Files**: `backend/jormat-api/eslint.config.mjs`
- **Validation**: `npm run lint` verde (0 errores). Si aparece error en codigo nuestro → fix en el acto; si en base entregada → bajar esa regla a `warn` y documentar.
- **Rollback**: revertir el bloque `rules` al estado previo (git checkout del archivo).
- **REQ**: REQ-01

#### S1.T2 — Agregar reglas al config del frontend
- **Contract**: editar `front/jormat-front/eslint.config.mjs` agregando las mismas 4 reglas al bloque `rules`. Correr `npm run lint` en `front/jormat-front`.
- **Files**: `front/jormat-front/eslint.config.mjs`
- **Validation**: `npm run lint` verde. Mismo criterio de fix que S1.T1.
- **Rollback**: git checkout del archivo.
- **REQ**: REQ-01

#### S1.GATE — Verificar guardarrail (tier T1)
- Lint verde en ambos paquetes; reglas muerden (TC-1); ninguna regla flaggea la base entregada. Gate ⚑ fuerte.

### Session 2 — Refactors manuales + tests

#### S2.T1 — Capturar baseline de tests
- **Contract**: correr `vitest run` (front) y `jest` (back) ANTES de tocar codigo; registrar resultados en la tabla Regression del ticket.
- **Validation**: baseline registrada (N pass / N fail por suite).
- **Rollback**: n/a (solo lectura).
- **REQ**: REQ-PRESERVE

#### S2.T2 — Refactor `handleRemoveFilter` → switch (front, 4 archivos)
- **Contract**: refactorizar a `switch` las cadenas `if` en `PagosClientesListView.tsx:126`, `DocumentosListView.tsx:176`, `ItemsListView.tsx:110`, `CapabilityMatrix.tsx:218`. Logica identica.
- **Files**: los 4 componentes de listado.
- **Validation**: `vitest run` de esos componentes verde (delta 0 vs baseline); tsc sin errores.
- **Rollback**: git checkout de los 4 archivos.
- **REQ**: REQ-02

#### S2.T3 — ~~Refactor CORS → switch + ternario UserFormModal~~ — DESCARTADO (decision del dev)
- **Resultado**: ambos candidatos descartados tras inspeccion en execute (ver REQ-02 ajuste + REQ-03). CORS no es dispatch por valor (guardas booleanas heterogeneas → exigiria `switch(true)` anti-patron); el ternario de UserFormModal meteria dos object-literals grandes en una expresion por-efecto (contra KISS §C4). Cero cambio de codigo.
- **Files**: ninguno (sin cambios).
- **REQ**: REQ-02 (ajustado), REQ-03 (descartado)

#### S2.T4 — Regression final + tsc
- **Contract**: correr la suite completa en ambos paquetes + `tsc --noEmit`; comparar contra baseline.
- **Validation**: delta 0 fallos nuevos; tsc limpio. Registrar Regression After en el ticket.
- **Rollback**: n/a.
- **REQ**: REQ-PRESERVE

#### S2.GATE — Verificar zero behavior change (tier T2)
- Suite verde con paridad vs baseline; tsc limpio; comportamiento identico. Gate ⚑ fuerte.

## Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-1 | manual | pass |
| REQ-02 | TC-2 (4 handleRemoveFilter) | auto | pass |
| REQ-03 | — | — | DESCARTADO |
| REQ-PRESERVE | regression suite | auto | pending |

## Acceptance checkpoints

- [ ] AC-1 (REQ-01): `npm run lint` verde en `backend/jormat-api` y `front/jormat-front` con las 4 reglas activas; un `==` de prueba dispara error `eqeqeq` y desaparece al revertir.
- [ ] AC-2 (REQ-01): ninguna regla nueva reporta error sobre la base entregada (`auth/workspaces/users/database/health`).
- [x] AC-3 (REQ-02): las 4 cadenas `handleRemoveFilter` quedan como `switch`; `vitest run` (front) verde (36/36 en los 4 componentes). CORS descartado (ver REQ-02 ajuste).
- [~] AC-4 (REQ-03): DESCARTADO — el `if/else` de `UserFormModal` no es buen candidato a ternario (decision del dev, ver REQ-03).
- [ ] AC-5 (REQ-PRESERVE): suite completa con paridad vs baseline; `tsc --noEmit` sin errores en ambos paquetes.
