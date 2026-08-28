---
id: TICKET-121
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1538
module: mods/curriculum-design
autopilot: autonomous
---

# Sanear el seed de `progression` del Plan (valor invalido `Credits` → `Sequential`)

## Request

Corregir el seed de `Curriculum` del mod: los 20 planes de `seed/_data-curriculum.js` traen `progression: "Credits"`, que **no es un valor del enum** `["Sequential","Modular"]` (`rt__Plan__curriculum.json`, default `Sequential`). Es dato invalido que, con la regla de visibilidad de UPONE-1538 (`totalPeriods` solo con `progression==Sequential`), deja `totalPeriods` oculto en esos planes.

> Atado al mismo Jira **UPONE-1538** (el ticket que destapo esto en el smoke; ver TICKET-119 learn L2 / FUP-01). No es un Jira nuevo.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (data/seed) |
| Tipo de cambio | single (mod-only, seed) |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | ninguno |

## Diagnostico

- **No es column-shift**: `progression: "Credits"` esta **hardcodeado** en las 20 filas de `_data-curriculum.js` (constante equivocada, no un valor corrido de otra columna). El Minor no tiene bloque `plan`.
- **Valor correcto inferible del propio contexto → `Sequential` (univoco)**: los 20 planes definen `totalPeriods` (10/8/5/4) + `periodType: "Semester"` = plan secuencial por periodos (definicion del enum). No hay ningun plan con pinta de Modular. Default del modelo tambien es `Sequential`.
- **Matiz**: `"Credits"` podria delatar la intencion de una tercera modalidad ("por creditos"), pero el enum solo admite 2 valores; agregar una tercera seria cambio de modelo (fuera de este fix). Para el modelo actual, `Sequential` es la correccion correcta.

## Evidencia (verificada 2026-08-06, tenant UPU)

**Fuente del dato (seed):** `mods/curriculum-design/seed/_data-curriculum.js:29-48` — 20 filas `recordType: 'Plan'`, **todas** con `plan.progression: "Credits"` literal. 1 fila `recordType: 'Minor'` sin bloque `plan` (no aplica).
- Distribucion en el seed: `grep 'progression: "..."' → 20× "Credits"` (cero variedad, ningun `Modular`, ningun `Sequential`).
- Todas traen `totalPeriods` + `periodType: "Semester"`; los valores por tier: `totalCredits/totalPeriods` = 240/10 (pregrado), 120/4 (magister), 180/8 (doctorado), 100/5 (tecnico).
- Cabecera del seed: paquete **PM #097 rev.2** (UPONE-1456), owner=Institution. Es **idempotente-restaurador** por `(institutionId, code)`: *"si la fila existe la actualiza al estado canonico del seed (revierte ediciones manuales)"*.

**Enum valido (modelo):** `objects/RecordTypes/rt__Plan__curriculum.json:11-18` → `progression` enum `["Sequential","Modular"]`, `static_default: "Sequential"`, PLAN-ONLY (MC-01/UPONE-1344). `"Credits"` no pertenece al enum.

**En DB UPU (antes del fix):** `rt__Plan__curriculum.progression` = `"Credits"` en ~21 filas → con la regla de UPONE-1538 esos planes muestran `totalPeriods` **oculto** en los 3 modos (Credits != Sequential).

**Por que `Sequential` es el valor correcto (inferencia univoca):** los 20 definen `totalPeriods` + `periodType=Semester` = plan "secuencial por periodos" (definicion del enum); ninguno tiene forma de Modular; el default del modelo es `Sequential`.

> ⚠️ **Estado actual de la DB (no canonico):** durante el smoke de TICKET-119 se setearon manualmente 2 planes para poder probar — `Plan Biologia 2026` → `Sequential` (totalPeriods=8) y `Plan Ciencia de Datos 2026` → `Modular`. **Ese cambio manual se revertira** al re-sembrar (seed idempotente-restaurador). El fix real es sobre la **fuente** (`_data-curriculum.js`), no sobre esas 2 filas.

## Fix scope

| File | Change |
|------|--------|
| `mods/curriculum-design/seed/_data-curriculum.js` | `progression: "Credits"` → `"Sequential"` en las 20 filas de Plan |

- Aplicar via re-seed (`npm run sync`, fase seed): el seed es **idempotente-restaurador** por `(institutionId, code)` → alinea las 20 filas. **Importante**: el seed revierte ediciones manuales, asi que corregir solo la DB no es durable; la fuente debe cambiar.
- Verificacion: `SELECT progression, count(*) FROM rt__Plan__curriculum GROUP BY 1` → 0 filas con valor distinto de `Sequential`/`Modular`; y en la UI, un Plan seed muestra `totalPeriods`.

## Acceptance

- [x] `_data-curriculum.js` sin `"Credits"` en `progression` (20 filas → `Sequential`). Verificado: grep Credits=0, Sequential=20.
- [x] Tras re-seed, DB UPU sin valores de `progression` fuera del enum **para los datos del seed** (20 planes Active = Sequential). Excepcion documentada: 1 fila Plan `Draft` code `test`, creada a mano fuera del seed, aun `Credits` (learn L1) — fuera del alcance de UPONE-1538; el dev la limpiara con el reset de BD. Requisito clave cumplido: **el seed produce datos validos** en cualquier sync/reset.
- [x] Un Plan seed (Biologia) muestra `totalPeriods` en la UI (Secuencial). Smoke runtime: `PERÍODOS TOTALES=10`, `PROGRESIÓN=Sequential`.
- [x] Sin artefactos de sync/seed commiteados; commit `72ce0d3` con id `UPONE-1538` (DET-19), solo el seed.

## Triage

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Es pequeno de verdad? | Si — 1 archivo, correccion de 1 valor de enum repetido en 20 filas identicas |
| 2 | ¿Toca logica nueva? | No — cero cambio de codigo/comportamiento; solo dato de seed |
| 3 | ¿Estructura o multiples archivos? | No — un unico archivo (`_data-curriculum.js`) |
| 4 | ¿Riesgo de impacto colateral? | Bajo — ningun consumer hace switch sobre `progression==="Credits"` (verificado) |
| 5 | ¿Vale registrarlo? | Si — FUP-01 de TICKET-119, atado a UPONE-1538; dato invalido en produccion de datos |

Full path (no quick): dato invalido en seed canonico + acceptance con verificacion DB/UI + trazabilidad a Jira.

### Hipotesis

| Hipotesis | Status | Evidencia |
|-----------|--------|-----------|
| H1: `progression: "Credits"` esta hardcodeado en las 20 filas Plan del seed (no column-shift) | ✓ confirmada | `_data-curriculum.js:29-48`, 20× literal `"Credits"`, ningun `Modular`/`Sequential` |
| H2: `"Credits"` no pertenece al enum del modelo | ✓ confirmada | `rt__Plan__curriculum.json`: enum `["Sequential","Modular"]`, default `Sequential` |
| H3: El valor correcto univoco es `Sequential` | ✓ confirmada | 20 filas con `totalPeriods` + `periodType: "Semester"` = plan secuencial por periodos; ningun plan con forma Modular; default del modelo |
| H4: Ningun codigo consume el valor invalido `"Credits"` | ✓ confirmada | grep en `mods/curriculum-design/`: unica aparicion son las 20 filas del seed; cero switches sobre el valor |

### Context found

- **Causa raiz**: constante equivocada hardcodeada en el seed (`_data-curriculum.js:29-48`), no un valor corrido de otra columna. Introducida en el paquete PM #097 rev.2 (UPONE-1456).
- **Consumers del valor** (analisis de impacto colateral): ningun consumer con logica condicional hace branch sobre `progression === "Credits"` (ningun resolver, componente ni condicion de layout). La regla de visibilidad de UPONE-1538 compara contra `"Sequential"`, por eso `"Credits"` deja `totalPeriods` oculto. Corregir el dato es suficiente; no hay codigo que ajustar. El literal `'Credits'` tambien aparece como **fixture inline** en tests (`tests/integration/seed-counts.test.ts:313,325,358`, `tests/unit/curriculumVersionInherit.test.js`), pero son filas arbitrarias que ejercitan otra logica (ownerType, status, dedup, herencia) y no hacen assertion sobre el valor de `progression` → el fix del seed no los rompe (regresion verificada, DET-7). Fuera de `execute_scope`; no se tocan.
- **Relacion**: FUP-01 de TICKET-119 (learn L2), mismo Jira UPONE-1538.

## Setup

### Environment
- Repo del mod: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design` (repo git propio), rama `sp8-06-ago` (no protegida — pasa guarda DET-30).
- Tenant de prueba: UPU (BD `uplanner_upu`), plataforma en `/Users/edobacon/Workspace/uplanner/up1`.
- Aplicacion del fix a BD: fase seed de `npm run sync` (seed idempotente-restaurador por `(institutionId, code)`).

## Testing

### Test cases

| TC | Given | When | Then | Affects UI | Actual | Evidence | Status |
|----|-------|------|------|------------|--------|----------|--------|
| TC-1 | seed corregido | `grep 'progression: "Credits"'` sobre `_data-curriculum.js` | 0 coincidencias; 20 filas Plan con `"Sequential"` | no | Credits=0, Sequential=20; git diff solo el seed (20 insert/20 delete), cero cambios colaterales | grep + git diff --stat | PASS |
| TC-2 | seed corregido + re-seed scopeado a UPU | `SELECT progression, count(*) FROM "rt__Plan__curriculum" GROUP BY 1` | 0 filas con valor fuera de `{Sequential, Modular}` | no | 20 planes Active del seed = Sequential; 0 Modular; unica excepcion 1 fila Draft code `test` (manual, fuera del seed — learn L1, se limpia en reset de BD) | `docker exec pg psql -d uplanner_upu` group by progression: Sequential=20, Credits=1(Draft test) | PASS (scope seed) |
| TC-3 | re-seed aplicado | abrir Plan Biologia (UPU-LBIO-PLAN-2026) en la UI, modo view (login Clerk test como Admin) | `totalPeriods` visible (regla de progresion Sequential) | yes | Detalle en vivo: PROGRESIÓN=Sequential, **PERÍODOS TOTALES=10** visible, CRÉDITOS TOTALES=240, TIPO DE PERÍODO=Semester | smoke runtime real (navegacion en vivo + screenshot del view mode) | PASS |

### Regression
- REQ-REGRESSION: los planes ya validos (`Sequential`/`Modular`) no cambian; el re-seed solo alinea las 20 filas invalidas. El plan manual `Ciencia de Datos 2026 = Modular` (seteado en smoke TICKET-119) se revierte a `Sequential` por el seed restaurador — comportamiento esperado y documentado, no regresion.

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-08-06T00:00:00Z | (sin modo) → super | dev trigger "super autopilot" al entrar a `/dkc 121` | S1 (arranque) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks | Gate | Criterio |
|---|----------|------|------|-------|------|----------|
| S1 | Sanear `progression` del seed (Credits→Sequential) + verificacion DB/UI | execute | T1 | S1.T1-S1.T2 | auto | grep sin "Credits"; re-seed deja DB sin valores fuera del enum; un Plan seed muestra `totalPeriods` en la UI |

Tier T1: correccion de un unico valor de enum en un solo archivo de seed, cero cambio de logica/comportamiento; efecto user-facing es data-driven y se verifica con re-seed + un smoke. Path de seed/dato no es sensible (no `auth/**`) → sin ratchet de trigger-rules.

### Session 1 — 2026-08-06 — Sanear `progression` del seed (Credits→Sequential) + verificacion [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Corregir el valor invalido `progression: "Credits"` a `"Sequential"` en las 20 filas de Plan del seed fuente (`_data-curriculum.js`) y verificar (grep, re-seed a UPU, SQL enum-check, smoke UI de `totalPeriods`).

**Tasks completadas**:
- [x] S1.T1 — Corregir `progression: "Credits"` a `"Sequential"` en las 20 filas de Plan del seed
- [x] S1.T2 — Verificar regresion + acceptance (grep + re-seed a UPU + SQL enum-check + smoke UI)
- [x] S1.GATE — Gate de sync Session 1 (tier T1)

**Flujo de la session**: (1) fix del valor en la fuente del seed via Edit `replace_all` (20 filas, cero cambio colateral); (2) verificacion de codigo (grep + git diff); (3) consentimiento del dev para aplicar a BD → re-seed scopeado a UPU (`DEV_TENANTS=UPU npm run sync:db`, fase seed idempotente, sin regen de modelo); (4) verificacion DB (SQL enum-check); (5) smoke runtime en la UI (Plan Biologia view).

**Commit**: `72ce0d3` UPONE-1538-S1 fix(curriculum-design): sanitize Plan progression seed value (Credits -> Sequential). Repo `uplanner/up1/mods/curriculum-design`, rama `sp8-06-ago`. Solo `seed/_data-curriculum.js` (20 insert/20 delete), sin artefactos de sync. Local; push pendiente de OK del dev.

**Validacion del tier (T1)**:
- T0 — JS del seed valido (parse OK); sin cambio de modelo/i18n.
- T1 — TC-1 grep (Credits=0, Sequential=20) + TC-2 SQL enum-check (20 Active seed = Sequential) + TC-3 smoke runtime. Regresion: fixtures de test con `'Credits'` son inline y no assertan sobre el valor → sin delta (DET-7).

**Runtime-verification (DET-36)**: smoke-executed — Plan Biologia (UPU-LBIO-PLAN-2026) en modo view muestra `PERÍODOS TOTALES=10` con `PROGRESIÓN=Sequential`. Evidencia por navegacion en vivo (login Clerk test, rol Admin) + screenshot del view mode. No referencia a test file.

**Self-report verification (DET-33)**: N/A para el ejecutor — el fix y las 3 verificaciones (git diff, grep, SQL contra BD real, smoke runtime en vivo) las corrio el LLM principal directamente, no via sub-agente. El unico self-report externo (spec-judge) se contrasto contra el codigo real (fixtures de test verificadas por grep).

**Quality review (DET-23)**

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: light (cambio de un valor de dato constante en un unico archivo de seed; sin codigo ejecutable nuevo)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambio de 1 valor de enum en 20 filas identicas; sin console.* ni debug; diff quirurgico |
| 2 | Lint | n/a | JS de seed; parse valido |
| 3 | Tipado | n/a | Dato JS, sin tipos |
| 4 | Testing | pass | TC-1/TC-2/TC-3 verdes; regresion sin delta (fixtures inline no afectadas) |
| 5 | Escalabilidad | n/a | Dato de seed |
| 6 | Mantenibilidad | pass | Valor ahora dentro del enum; futuros resets/sync producen dato valido |
| 7 | Claridad | pass | Valor semanticamente correcto (Sequential = plan por periodos) |
| 8 | A11y | n/a | Sin UI nueva |
| 9 | Storybook | n/a | Sin componente |
| 10 | Error handling | n/a | Sin logica |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Ultima session. Acceptance verde (3 TC PASS, smoke runtime OK). Commit local 72ce0d3. Procede a request-close, que SIEMPRE pide OK del dev (DET-30). Pendiente: push (pide OK).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Learns

| # | Learn (raw) | Estado |
|---|-------------|--------|
| L1 | Tras el re-seed scopeado a UPU, los 20 planes Active del seed quedaron `Sequential`, pero persiste **1 fila Plan fuera del seed**: `Curriculum` code `test`, name "Plan de Estudios Ingenieria Civil 2026", **status Draft**, ownerType Institution, `progression: "Credits"` (invalido), `totalPeriods=10`. Es un plan **creado a mano** (codigo literal `test`, no esta en `_data-curriculum.js`), residuo de testing. El seed no lo gestiona (upsert por `(institutionId, code)`), asi que el fix de fuente no lo alcanza. Hace que el acceptance item 2 ("DB sin valores fuera del enum"), leido estricto, tenga 1 excepcion — pero es data-hygiene fuera del alcance de UPONE-1538 (saneo del seed). Recomendacion: borrar la fila basura por separado (decision del dev). | discarded (DET-39: data-hygiene reconocida por el dev, se limpia con el reset de BD; no defecto de codigo/seed) |
