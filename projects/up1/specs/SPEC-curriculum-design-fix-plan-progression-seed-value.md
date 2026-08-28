---
id: SPEC-curriculum-design-fix-plan-progression-seed-value
project: up1
ticket: TICKET-121
status: done
---

# Fix: sanear el valor de `progression` del seed de Plan (`Credits` → `Sequential`)

# Fix: sanear el valor de `progression` del seed de Plan (`Credits` → `Sequential`)

## Executive summary — lo que estas aprobando

**Que se quiere**: el seed canonico del mod (`_data-curriculum.js`) siembra las 20 filas de Plan con `progression: "Credits"`, un valor que no pertenece al enum del modelo (`["Sequential","Modular"]`). Con la regla de visibilidad de UPONE-1538 (`totalPeriods` solo se muestra si `progression==Sequential`), esos planes ocultan `totalPeriods` en la UI. Se corrige la fuente del dato a `Sequential`, el valor univoco correcto, y se re-siembra para alinear la BD.

**Decisiones criticas que necesitan tu OK**: Sin decisiones criticas — correccion straightforward de un valor de dato invalido. El unico punto de control operativo es el re-seed a la BD del tenant UPU (ver Riesgos).

**Riesgos principales y como los mitigamos**:

- **El re-seed muta la BD live de UPU y revierte 2 planes seteados a mano en el smoke de TICKET-119** (`Biologia`→Sequential ya coincide; `Ciencia de Datos`→Modular vuelve a Sequential) → es comportamiento esperado del seed idempotente-restaurador, documentado; se corre con consentimiento explicito del dev antes de aplicarlo.
- **Que `"Credits"` delatara una tercera modalidad de negocio** → descartado: el enum es cerrado de 2 valores (MC-01/UPONE-1344); agregar una tercera seria cambio de modelo, fuera de alcance.

**Que NO se hace en este ticket**:

- No se agrega una tercera modalidad de `progression` (cambio de modelo — fuera de alcance).
- No se toca codigo de logica/resolvers/layout (ningun consumer hace switch sobre el valor; verificado).
- No se corrige la BD a mano como fix durable (el seed restaurador lo revertiria; la fuente es el seed).

**Tamano estimado**: 1 session ejecutable (T1), aproximadamente 0.5h efectiva. La parte mas sensible es el re-seed + smoke (verificacion DB/UI).

**Como vas a saber que funciona**:

- `grep 'progression: "Credits"'` sobre el seed devuelve 0 coincidencias (20 filas en `Sequential`).
- `SELECT progression, count(*) FROM "rt__Plan__curriculum" GROUP BY 1` en UPU no devuelve valores fuera de `{Sequential, Modular}`.
- Abrir un Plan seed (ej. Biologia) en la UI muestra `totalPeriods`.

---

## Purpose

Corregir dato invalido en el seed canonico de `Curriculum` del mod curriculum-design: 20 filas de Plan con `progression: "Credits"` fuera del enum `["Sequential","Modular"]`. Afecta a cualquier tenant sembrado con este paquete (UPU verificado), donde los planes ocultan `totalPeriods` por la regla de visibilidad de UPONE-1538. Es FUP-01 de TICKET-119 (mismo Jira UPONE-1538, learn L2).

## Requirements

### REQ-FIX-01: `progression` del seed dentro del enum

> **Que cambia**: las 20 filas de Plan del seed pasan de `progression: "Credits"` a `"Sequential"`. Tras re-sembrar, esos planes vuelven a mostrar `totalPeriods` en la UI.
> **Por que**: `"Credits"` no existe en el enum del modelo; la regla de visibilidad de UPONE-1538 lo trata como no-Sequential y oculta `totalPeriods`.

El sistema MUST sembrar cada fila de Plan con un valor de `progression` perteneciente al enum `["Sequential","Modular"]`. Para las 20 filas actuales el valor MUST ser `Sequential` (inferencia univoca: todas definen `totalPeriods` + `periodType: "Semester"` = plan secuencial por periodos; ninguna tiene forma Modular; el default del modelo es `Sequential`).

**Actor**: system (seed)
**Layers**: config (seed data), database (via re-seed)

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed corregido
- **GIVEN** `_data-curriculum.js` corregido
- **WHEN** `grep 'progression: "Credits"'` sobre el archivo
- **THEN** 0 coincidencias; las 20 filas Plan tienen `progression: "Sequential"`

#### Scenario: BD alineada tras re-seed
- **GIVEN** el seed corregido aplicado a UPU via fase seed de `npm run sync`
- **WHEN** `SELECT progression, count(*) FROM "rt__Plan__curriculum" GROUP BY 1`
- **THEN** 0 filas con valor fuera de `{Sequential, Modular}`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un Plan seed (ej. Biologia) en la UI y ve `totalPeriods`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | seed sin Credits | seed corregido | grep sobre `_data-curriculum.js` | sin coincidencias de `"Credits"` | 20× `"Sequential"` |
| 2 | BD dentro del enum | re-seed aplicado a UPU | SELECT group by progression | ninguna fila fuera del enum | 0 filas invalidas |
| 3 | totalPeriods visible | re-seed aplicado | abrir Plan Biologia en UI (view) | `totalPeriods` visible | campo renderizado |

### REQ-REGRESSION-01: los planes ya validos no cambian

> **Que cambia**: nada, para los planes que ya tenian un valor valido de `progression`.
> **Por que**: DET-7 — el fix no debe alterar comportamiento existente correcto.

El sistema MUST preservar el valor de `progression` de cualquier plan que ya sea `Sequential` o `Modular`. El re-seed solo alinea las 20 filas invalidas. La reversion del plan manual `Ciencia de Datos 2026 = Modular` (seteado en el smoke de TICKET-119) al estado canonico del seed es comportamiento esperado del restaurador, no una regresion.

**Actor**: system
**Layers**: database

#### Acceptance
**El usuario puede verificar que funciona**: los planes no listados en el seed (o ya validos) conservan su valor; no hay cambios de schema ni de logica.

## Fix scope

### Antes (comportamiento actual)
Las 20 filas de Plan del seed traen `progression: "Credits"` (invalido). En UPU esos planes ocultan `totalPeriods` en los 3 modos por la regla de UPONE-1538.

### Despues (comportamiento esperado)
Las 20 filas traen `progression: "Sequential"`. Tras re-seed, la BD no tiene valores fuera del enum y los planes muestran `totalPeriods`.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/seed/_data-curriculum.js` | `progression: "Credits"` → `"Sequential"` en las 20 filas de Plan (lineas 29-48) | Ninguno en codigo — ningun consumer hace switch sobre el valor. Aplica a la BD via re-seed. |

## Tasks

### Session 1 — Sanear `progression` del seed + verificacion DB/UI [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Corregir `progression: "Credits"` → `"Sequential"` en las 20 filas de Plan del seed | REQ-FIX-01 | developer | — | mods/curriculum-design/seed/_data-curriculum.js | `grep 'progression: "Credits"'` = 0; 20× `"Sequential"` | git revert | DET-3, DET-4, DET-40 | done | 1 |
| S1.T2 | Verificar regresion + acceptance: grep del archivo, confirmar cero consumers del valor, re-seed a UPU (con consentimiento del dev), `SELECT progression, count(*) ... GROUP BY 1` sin valores fuera del enum, smoke UI de un Plan seed mostrando `totalPeriods` | REQ-REGRESSION-01 | reviewer | S1.T1 | mods/curriculum-design/seed/_data-curriculum.js, DB UPU (rt__Plan__curriculum), UI | grep + SQL enum-check (0 invalidas) + smoke runtime (totalPeriods visible) | (no aplica — verificacion) | DET-7, DET-13, DET-36 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir resultados en `## Sessions` del ticket, correr validacion del tier, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

### Task contract

```
Task S1.T1: Corregir el valor de progression en el seed
- source_ref: REQ-FIX-01
- agent: developer
- files: mods/curriculum-design/seed/_data-curriculum.js
- precondition: rama del mod != protegida (sp8-06-ago OK)
- expected_output: 20 filas de Plan con progression: "Sequential"; sin "Credits" en el archivo
- validation: grep 'progression: "Credits"' = 0 coincidencias; grep 'progression: "Sequential"' = 20
- rollback: git revert / git checkout del archivo
- rules: [DET-3, DET-4, DET-40]
```

```
Task S1.T2: Verificar regresion + acceptance (DB + UI)
- source_ref: REQ-REGRESSION-01
- agent: reviewer
- files: seed + DB UPU + UI
- precondition: S1.T1 done; consentimiento del dev para re-seed (muta BD live)
- expected_output: BD sin progression fuera del enum; Plan seed muestra totalPeriods
- validation: SQL enum-check (0 filas invalidas) + smoke runtime (DET-36)
- rollback: (no aplica — verificacion)
- rules: [DET-7, DET-13, DET-36]
```

## Constraints

- RULE (enum cerrado MC-01/UPONE-1344): `progression` admite solo `Sequential`/`Modular`; no ampliar el enum en este fix.
- DET-3: el request original del ticket no se reescribe.
- DET-40: el cambio es puramente corrective (valor de dato), no retira ni reenruta un camino de codigo → replacement-audit N/A.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El re-seed revierte cambios manuales de la BD de UPU | high (esperado) | low | Documentado; el fix es sobre la fuente, no sobre filas manuales. Se corre con consentimiento del dev. |
| El re-seed via `npm run sync` toca mas que el seed (no quirurgico) | medium | medium | Correr solo la fase seed cuando sea posible; consentimiento del dev antes de ejecutar (proceso que muta BD). |

## Open questions

_(ninguna — diagnostico e inferencia del valor son univocos)_

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01 y REQ-REGRESSION-01 verificados (grep + SQL + smoke)
- [ ] **Tests** (DET-37 dim4): sin unit test nuevo (valor de dato constante); verificacion via TC-1/TC-2/TC-3 (grep + SQL enum-check + smoke). Regresion del mod sin delta.
- [ ] **Integration**: no rompe funcionalidad existente; sin cambio de schema ni de logica
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): N/A — correccion de valor de dato, sin cambio de contrato/API/comportamiento documentable
- [ ] **KB DKC** (DET-37 dim2): N/A — el learn de seed invalido ya quedo capturado en TICKET-119 (L2 → FUP-01)
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — no toca DKC
- [ ] **Planning-completeness**: entry `planning-completeness` registrada (mixed: dim4 verificacion sin unit; dim1-3 N/A)
