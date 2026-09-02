---
id: SPEC-JOR-123-reacople-tipo-moneda
project: jormat-evolution
ticket: JOR-123
status: done
---

# Re-acople tipo<->moneda (IVA de compra fiel al legacy) (Compras)

# Re-acople tipo<->moneda (IVA de compra fiel al legacy) (Compras)

## Executive summary — lo que estas aprobando

**Que se corrige**: en el builder de compras el TIPO de documento (Nacional / Internacional) y la MONEDA estan DESACOPLADOS, permitiendo combos imposibles en el legacy (Nacional+Dolar -> IVA 0; Internacional+CLP -> IVA 19%). El legacy determina el IVA por TIPO (Nacional 19% / Internacional 0) y ademas Nacional fuerza moneda CLP e Internacional fuerza moneda extranjera. Este spec restaura ese acople: seleccionar Nacional coacciona la moneda a CLP y bloquea el resto; seleccionar Internacional coacciona a moneda extranjera. Con el acople, el IVA-por-moneda que ya tenemos (DEC-LOCAL-02, "la moneda es el unico origen de verdad del IVA") coincide SIEMPRE con el IVA-por-tipo del legacy, sin tocar la primitiva `calcIva`.

**Lo que NO cambia**: `lib/currency.ts` / `calcIva` (la primitiva de IVA por moneda se conserva; DEC-LOCAL-02 se refuerza, no se revierte). El redondeo por linea nacional del legacy (C-18) NO se alinea aca: es una decision consagrada por JOR-104 y sus tests; queda como follow-up pre-existente, no se pisa.

**Reuso (DET-32, reduce)**: no se crea utilidad ni componente de calculo nuevo. El acople se resuelve con un coercer puro (`coerceCurrencyForType`) + `superRefine` en el schema de compras, y el filtrado/bloqueo del selector de moneda reusa `CurrencyDetailCard`. El IVA sigue derivandose de la moneda ya coaccionada.

**Cambio de comportamiento (DET-40, requiere OK dev)**: es el UNICO cambio visible del plan. Combos antes aceptados (Nacional+moneda extranjera, Internacional+CLP) quedan bloqueados. Aceptado por el dev. Fiel al legacy (Nacional fuerza CLP).

**Riesgo principal y mitigacion**: bloquear combos previamente validos puede romper documentos en vuelo con moneda incongruente. Mitigacion: el coercer normaliza la moneda al cambiar el tipo (no deja estado invalido), `superRefine` valida la congruencia, y la regresion de JOR-120 (calc de descuento/total) se corre verde.

## Purpose

- **Problema**: tipo y moneda desacoplados en el builder de compras habilitan combos imposibles en el legacy, con IVA incongruente respecto del comportamiento canonico.
- **A quien afecta**: usuarios que registran compras y eligen tipo/moneda; el IVA resultante podia no coincidir con el legacy.
- **Sintoma**: se podia seleccionar Nacional con moneda extranjera (IVA 0) o Internacional con CLP (IVA 19%), combinaciones que el legacy no permite.

## Requirements

### REQ-01: el tipo de documento coacciona la moneda (Nacional -> CLP, Internacional -> extranjera) y el IVA queda fiel al legacy
> Que cambia: seleccionar el tipo de documento fuerza la moneda congruente (Nacional -> CLP, Internacional -> moneda extranjera) y bloquea las monedas incongruentes en el selector; con la moneda coaccionada, el IVA-por-moneda coincide siempre con el IVA-por-tipo del legacy, sin tocar `calcIva`.
> Por que: fidelidad al legacy, que determina el IVA por tipo (Nacional 19% / Internacional 0) y acopla tipo<->moneda; hoy estan desacoplados y permiten combos imposibles.

MUST: al seleccionar el TIPO en el builder de compras, la MONEDA MUST coaccionarse al valor congruente: Nacional MUST forzar CLP; Internacional MUST forzar una moneda extranjera. El selector de moneda MUST filtrar/bloquear las opciones incongruentes con el tipo elegido. El schema de compras MUST validar (`superRefine`) que la combinacion tipo/moneda sea congruente. El IVA MUST seguir derivandose de la moneda ya coaccionada (`calcIva` sin cambios): con el acople, el IVA-por-moneda coincide SIEMPRE con el IVA-por-tipo del legacy. La primitiva `calcIva` / `lib/currency.ts` NO cambia.

- Scenario (Nacional fuerza CLP): GIVEN un documento de compra WHEN el usuario selecciona tipo Nacional THEN la moneda se coacciona a CLP, el selector bloquea las monedas extranjeras y el IVA resultante es 19%.
- Scenario (Internacional fuerza extranjera): GIVEN un documento de compra WHEN el usuario selecciona tipo Internacional THEN la moneda se coacciona a moneda extranjera, el selector bloquea CLP y el IVA resultante es 0.
- Scenario (combo incongruente bloqueado): GIVEN tipo Nacional WHEN se intenta setear moneda extranjera THEN `superRefine` rechaza la combinacion (no se persiste un estado invalido).
- Scenario (IVA sin tocar la primitiva): GIVEN la moneda coaccionada por el tipo WHEN se calcula el IVA THEN el resultado coincide con el IVA-por-tipo del legacy usando `calcIva` intacto (DEC-LOCAL-02 reforzada, no revertida).

## Tasks

### Session 1 — Re-acople tipo<->moneda [tipo: ⚑ fuerte] [tier: T2]

**Task S1.T1 — Coercer tipo->moneda + superRefine**
- source_ref: REQ-01
- agent: developer
- validation: `coerceCurrencyForType` (puro) normaliza la moneda al cambiar el tipo (Nacional->CLP, Internacional->extranjera); `superRefine` en el schema de compras rechaza combinaciones incongruentes; `calcIva` / `lib/currency.ts` sin cambios
- rollback: git revert
- rules: [DET-40, DET-4, DET-5]

**Task S1.T2 — CurrencyDetailCard filtrado/bloqueado + wiring en el builder**
- source_ref: REQ-01
- agent: developer
- depends_on: S1.T1
- validation: `CurrencyDetailCard` filtra/bloquea las monedas incongruentes con el tipo; el builder de compras cablea el coercer al cambio de tipo; al cambiar el tipo la moneda visible queda coaccionada
- rollback: git revert
- rules: [DET-32, DET-4]

**Task S1.T3 — Tests + story**
- source_ref: REQ-01
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2
- validation: vitest verde (180 passed) cubriendo coercer (Nacional->CLP, Internacional->extranjera), `superRefine` (combos incongruentes rechazados) e IVA congruente; story del selector filtrado/bloqueado; regresion JOR-120 (calc descuento/total) verde; tsc/eslint exit 0
- rollback: N/A (tests)
- rules: [DET-7, DET-13, DET-14]

**S1.GATE**: quality review (DET-23, tier T2), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- `calcIva` / `lib/currency.ts` NO se tocan: el IVA sigue derivandose de la moneda; el acople hace que coincida con el legacy.
- DEC-LOCAL-02 ("la moneda es el unico origen de verdad del IVA") se refuerza, no se revierte.
- El redondeo por linea nacional del legacy (C-18) NO se alinea en este ticket: follow-up pre-existente (JOR-104, consagrado por tests), no se pisa.
- El acople es un cambio de comportamiento visible (DET-40): bloquea combos antes aceptados; requiere OK del dev (aceptado).

## Dependencies

- **JOR-120** (cerrado): calc de descuento global / totales; regresion compartida en compras.
- **DEC-LOCAL-02** (JOR-015-S1 / JOR-017-S1, 2026-06-16): IVA por moneda; se refuerza con el acople.
- **JOR-104**: path/redondeo de monedas; C-18 queda como follow-up, no se toca.

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Documentos en vuelo con moneda incongruente al tipo | builder compras | el coercer normaliza la moneda al cambiar tipo; `superRefine` valida congruencia; no deja estado invalido |
| Revertir por error DEC-LOCAL-02 (IVA por moneda) | calc-iva | `calcIva` / `lib/currency.ts` intactos; el acople opera sobre la moneda, no sobre la primitiva |
| Tocar el redondeo por linea (C-18) fuera de alcance | calc-iva | C-18 explicitamente follow-up (JOR-104); no se toca en este ticket |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Acoplar tipo<->moneda (Nacional->CLP, Internacional->extranjera) via coercer + `superRefine`, sin tocar `calcIva` | Fidelidad al legacy; con el acople el IVA-por-moneda coincide con el IVA-por-tipo sin revertir DEC-LOCAL-02 |
| 2 | Reusar `CurrencyDetailCard` (filtrado/bloqueo) en vez de crear selector nuevo | DET-32 reduce; el selector ya existe |
| 3 (dev) | Aceptar el cambio de comportamiento: bloquear combos antes validos (Nacional+extranjera, Internacional+CLP) | Fiel al legacy (Nacional fuerza CLP); combos imposibles en el legacy no deben ser seleccionables |
| 4 | Dejar C-18 (redondeo por linea nacional) como follow-up, no pisarlo | Es decision JOR-104 consagrada por tests; alinearla es otro alcance |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): tipo Nacional coacciona moneda a CLP, bloquea extranjeras, IVA 19% (test + story).
- [x] AC-2 (REQ-01): tipo Internacional coacciona moneda a extranjera, bloquea CLP, IVA 0 (test).
- [x] AC-3 (REQ-01): `superRefine` rechaza combos incongruentes (Nacional+extranjera / Internacional+CLP) (test).
- [x] AC-4 (REQ-01): `calcIva` / `lib/currency.ts` sin cambios; IVA coincide con el IVA-por-tipo del legacy (test).
- [x] AC-5 (regresion): JOR-120 (calc descuento/total) verde; vitest 180 passed, tsc/eslint 0.

## Technical reference

- Legacy canonico: acople tipo<->moneda + IVA por tipo (Nacional 19% / Internacional 0; Nacional fuerza CLP).
- Front nuevo: `lib/purchases/calc-iva.ts` (IVA por moneda; NO cambia), coercer `coerceCurrencyForType` + `superRefine` en el schema de compras, `CurrencyDetailCard` (selector filtrado/bloqueado), builder de compras (wiring del coercer al cambio de tipo).
