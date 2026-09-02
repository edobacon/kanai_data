---
id: SPEC-JOR-120-descuento-global-porcentaje
project: jormat-evolution
ticket: JOR-120
status: done
---

# Descuento global como porcentaje + control en UI (Ventas + Compras)

# Descuento global como porcentaje + control en UI (Ventas + Compras)

## Executive summary — lo que estas aprobando

**Que se corrige**: el descuento GLOBAL de cabecera del builder (ventas y compras) se restaba como MONTO fijo y sin control en la UI (constructo introducido en JOR-065-S7 el 2026-07-05; comentario literal en `calc-totals.ts`: "constructo nuevo que se resta como monto"). El legacy lo trata como PORCENTAJE con cap por modulo (ventas 0-20, compras 0-30) y lo aplica sobre el neto DESPUES de los descuentos de linea. Este spec lo pasa a % con un input en la UI (reusa `PercentStepper` con prop `max`) y el cap por modulo, fiel al legacy.

**Ajuste de fidelidad (decision del dev, opcion A)**: el descuento global NO se redondea. El redondeo se aplica solo al total y al IVA sobre el neto ya descontado: `total = round(netoInvoice * 1.19)`, `IVA = round(total - netoInvoice)` (path CLP, fiel a `clientsInvoicesCreateController.js:362-365` / `invoicesProviderCreateController.js:232-235`). USD/EUR sin cambios (JOR-104).

**Lo que NO cambia**: el descuento por LINEA (ya es % correcto, DEC-018 / commit `b085ffd`) se preserva como regresion. El path de monedas USD/EUR (JOR-104) queda intacto. El global % se aplica sobre el neto post-linea, no sobre el bruto.

**Reuso (DET-32)**: no se crea componente ni utilidad nueva. El control de UI reusa `PercentStepper` (ya usado para el descuento de linea) agregando una prop `max`; el resumen reusa `DocumentSummaryCard`. El cap vive como constante en los schemas (`DESCUENTO_GLOBAL_MAX` 20 ventas / 30 compras).

**Riesgo principal (money-critical, T3) y mitigacion**: cambiar la formula del total puede desalinear neto/IVA/total respecto del legacy (±1 peso por redondeo). Mitigacion: DET-40 auditoria de reemplazo 1:1 del path viejo (monto) vs el nuevo (%), con casos numericos fijados (redondo y fraccional) verificados contra el legacy; quality gate dual-judge (DET-35) con un juez dedicado a fidelidad.

## Purpose

- **Problema**: el descuento global se restaba como monto fijo sin input en la UI, divergiendo del legacy (porcentaje con cap, sobre el neto post-linea).
- **A quien afecta**: usuarios que emiten ventas o registran compras aplicando un descuento global de cabecera; el monto resultante y el IVA no coincidian con el legacy.
- **Sintoma**: el descuento global no era editable desde la UI y se aplicaba como monto, no como porcentaje.

## Requirements

### REQ-01: el descuento global es un porcentaje 0-cap, editable en la UI, aplicado sobre el neto post-linea
> Que cambia: el descuento global deja de ser un monto fijo y pasa a ser un porcentaje 0-cap con control en la UI, aplicado sobre el neto DESPUES de los descuentos de linea; el redondeo se limita al total y al IVA (fiel al legacy).
> Por que: fidelidad al legacy (`clientsInvoicesCreateController.js:362-365`, `invoicesProviderCreateController.js:232-235`), que trata el global como % con cap por modulo y redondea solo total/IVA.

MUST: el descuento global MUST expresarse como PORCENTAJE en el rango `0..DESCUENTO_GLOBAL_MAX` (20 en ventas, 30 en compras) con un control en la UI (`PercentStepper` con prop `max` = cap del modulo). El calculo MUST aplicar el global sobre el neto resultante DESPUES de aplicar los descuentos de linea (`netoInvoice = netoPostLinea - netoPostLinea * globalPct/100`). El descuento global NO se redondea; el redondeo MUST aplicarse solo al total y al IVA en el path CLP: `total = round(netoInvoice * 1.19)`, `IVA = round(total - netoInvoice)`. USD/EUR NO cambian (JOR-104).

- Scenario: GIVEN un neto post-linea de 100.000 y descuento global 10% (ventas) WHEN se calculan los totales THEN neto = 90.000, IVA = 17.100, total = 107.100.
- Scenario (fraccional, fiel al legacy): GIVEN un neto post-linea de 1.217 y descuento global 15% WHEN se calculan los totales THEN neto = 1.034, IVA = 197, total = 1.231 (el global no se redondea; redondeo solo en total/IVA).
- Scenario (cap por modulo): GIVEN el modulo compras WHEN el usuario edita el descuento global THEN el control NO permite superar 30; GIVEN ventas THEN el cap es 20.
- Scenario (regresion linea): GIVEN descuentos de linea vigentes (DEC-018) WHEN se aplica el global % THEN los descuentos de linea se aplican primero y el global opera sobre el neto ya descontado, sin alterar el comportamiento de linea.

## Tasks

### Session 1 — Descuento global como porcentaje [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Calculo del descuento global a porcentaje**
- source_ref: REQ-01
- agent: developer
- validation: `calc-totals.ts` (ventas) y `calc-iva.ts` (compras) aplican el global como % sobre el neto post-linea; casos numericos redondo (100.000@10%) y fraccional (1.217@15%) verificados
- rollback: git revert
- rules: [DET-40, DET-4, DET-5]

**Task S1.T2 — Control de UI + cap por modulo**
- source_ref: REQ-01
- agent: developer
- depends_on: S1.T1
- validation: `PercentStepper` con prop `max` cableado en ambos builders via `DocumentSummaryCard`; `DESCUENTO_GLOBAL_MAX` 20 ventas / 30 compras en los schemas (`ventas.ts`, `purchases.ts`); el control no permite exceder el cap del modulo
- rollback: git revert
- rules: [DET-32, DET-4]

**Task S1.T3 — Ajuste de fidelidad del redondeo**
- source_ref: REQ-01
- agent: developer
- depends_on: S1.T1
- validation: el descuento global NO se redondea; `total = round(netoInvoice*1.19)`, `IVA = round(total - netoInvoice)` (path CLP); USD/EUR intactos (JOR-104); caso fraccional 1.217@15% da neto 1.034 / IVA 197 / total 1.231 (fiel al legacy)
- rollback: git revert
- rules: [DET-40, DET-4]

**Task S1.T4 — Tests del calculo**
- source_ref: REQ-01
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest calc verde (47 passed); casos redondo y fraccional fijados; regresion descuento de linea (DEC-018) y monedas (JOR-104) sin cambios; tsc/eslint exit 0
- rollback: N/A (tests)
- rules: [DET-7, DET-13, DET-14]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive + dual-judge DET-35), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Path CLP unicamente; USD/EUR (JOR-104) NO se tocan.
- El descuento global se aplica sobre el neto DESPUES de los descuentos de linea, nunca sobre el bruto.
- El descuento global NO se redondea; el redondeo va solo a total/IVA (fiel al legacy).
- Cap por modulo: 20 ventas / 30 compras (`DESCUENTO_GLOBAL_MAX`).
- Reusar `PercentStepper` (prop `max`) y `DocumentSummaryCard`; no crear componente nuevo (DET-32).

## Dependencies

- **JOR-119** (cerrado): builder de ventas/compras alineado al legacy en el warning de stock; base branch compartida.
- **DEC-018 / commit `b085ffd`**: el descuento de LINEA ya es % correcto; se preserva como regresion.
- **JOR-104**: path de monedas USD/EUR; no se toca.

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Desalineacion neto/IVA/total vs legacy (±1 peso) | `calc-totals.ts`, `calc-iva.ts` | DET-40 auditoria 1:1 + casos redondo y fraccional verificados contra el legacy; ajuste de fidelidad (no redondear el global) |
| Romper el descuento de linea (DEC-018) | calc ventas/compras | Regresion en S1.T4; el global opera sobre el neto post-linea sin tocar la logica de linea |
| Tocar el path de monedas USD/EUR (JOR-104) | calc | Cambio acotado al path CLP; regresion de monedas |
| Cap incorrecto por modulo | schemas | `DESCUENTO_GLOBAL_MAX` 20/30 + prop `max` del control |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Descuento global como % con cap por modulo (20/30), sobre el neto post-linea | Fidelidad al legacy; el monto fijo (JOR-065-S7) fue un gap, no una decision |
| 2 | Reusar `PercentStepper` con prop `max` + `DocumentSummaryCard` | DET-32 reuse; el descuento de linea ya usa `PercentStepper` |
| 3 (opcion A, dev) | No redondear el descuento global; redondear solo total/IVA (`total=round(netoInvoice*1.19)`, `IVA=round(total-netoInvoice)`) | Fidelidad al legacy (`clientsInvoicesCreateController.js:362-365`); resuelve el hallazgo menor de redondeo del juez A (±1 peso). Path CLP; USD/EUR sin cambios (JOR-104) |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): neto post-linea 100.000 + global 10% → neto 90.000 / IVA 17.100 / total 107.100 (test).
- [x] AC-2 (REQ-01): neto post-linea 1.217 + global 15% → neto 1.034 / IVA 197 / total 1.231, fiel al legacy (test).
- [x] AC-3 (REQ-01): cap por modulo aplicado (20 ventas / 30 compras) via prop `max` del control.
- [x] AC-4 (regresion): descuento de linea (DEC-018) y monedas USD/EUR (JOR-104) sin cambios (vitest 47 passed, tsc/eslint 0).

## Technical reference

- Legacy canonico: `clientsInvoicesCreateController.js:362-365` (ventas), `invoicesProviderCreateController.js:232-235` (compras) — global como % + redondeo solo total/IVA.
- Front nuevo: `lib/ventas/calc-totals.ts`, `lib/purchases/calc-iva.ts` (calculo), `lib/schemas/ventas.ts` / `lib/schemas/purchases.ts` (`DESCUENTO_GLOBAL_MAX` 20/30), `components/ui/percent-stepper/percent-stepper.tsx` (prop `max`), `components/shared/builder/DocumentSummaryCard/*` (control + resumen), builders de ventas y compras (wiring).
