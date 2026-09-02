---
id: SPEC-JOR-121-precio-linea-editable
project: jormat-evolution
ticket: JOR-121
status: done
---

# Precio de linea editable + piso (ventas) + siembra de costo (compras)

# Precio de linea editable + piso (ventas) + siembra de costo (compras)

## Executive summary — lo que estas aprobando

**Que se implementa**: el precio unitario de cada linea del builder pasa a ser EDITABLE (ventas y compras comparten `LineItemsTable`); al editarlo se recalcula el total de la linea. En ventas se agrega un piso `minPrice`: cuando el precio editado cae por debajo del neto minimo la celda se pinta en rojo y la emision del documento queda bloqueada. En compras el precio de cada linea se siembra desde el COSTO del item (no desde el retail), con fallback al retail mientras el stub no puebla el costo.

**Desviacion deliberada del runtime del legacy (opcion B, decision del dev)**: el bloqueo de emision por precio bajo el piso NO existe en el RUNTIME del legacy. La clausula `clients-invoices-create.html:61` (`items.price >= items.minPrice`) es CODIGO MUERTO: el alias `items` del `ng-repeat` esta fuera del scope del boton, por lo que evalua `undefined >= undefined` = false y nunca bloquea. En runtime el legacy SOLO marca la celda en rojo (`:168`) cuando `precio < minPrice`; no impide emitir. El dev decidio honrar el INTENT evidente del legacy (impedir vender bajo el neto minimo — el legacy sembraba `minPrice` y escribia la clausula) e implementar el bloqueo ACTIVO, aunque el runtime del legacy nunca lo ejecutara. Es una desviacion deliberada del runtime, fundada en el intent. NO revertir a no-bloqueante en futuras auditorias de fidelidad.

**Deuda tecnica confirmada (compras)**: el list item del stub no puebla `costoCompra`, por lo que la siembra del precio en compras cae al fallback (retail). `minPrice` se siembra desde `item.precio`, que HOY es el neto. El backend (JOR-086/090) debe exponer el costo real y el piso explicito en el listado; hasta entonces el fallback es la unica fuente.

**Reuso (DET-32)**: el input de precio editable reusa el atom `Input` con el mismo patron que las celdas de cantidad y descuento de la tabla; no se crea componente nuevo.

**Riesgo principal (money-critical, T3) y mitigacion**: editar el precio y bloquear la emision toca el path de emision de ventas; un piso mal calculado bloquearia ventas legitimas o dejaria pasar ventas bajo el neto. Mitigacion: verificacion independiente del orquestador (vitest 125 passed, tsc/eslint 0), cross-check de la semantica legacy contra los archivos reales, y tests + stories dedicados (PrecioEditable, PrecioBajoPiso).

## Purpose

- **Problema**: el precio unitario de linea era read-only; en ventas no habia piso que impidiera vender bajo el neto minimo; en compras el precio se sembraba del retail en vez del costo.
- **A quien afecta**: usuarios que emiten ventas (precio editable + piso) y quienes registran compras (siembra desde el costo).
- **Sintoma**: precio no editable; sin control de piso en ventas; precio de compra sembrado del retail.

## Requirements

### REQ-01: el precio unitario de linea es editable y recalcula el total de la linea
> Que cambia: el precio unitario de cada linea del builder deja de ser read-only y pasa a ser editable; al editarlo se recalcula el total de la linea.
> Por que: fidelidad al legacy, que permite editar el precio unitario de cada linea; ventas y compras comparten `LineItemsTable`.

MUST: cada fila de `LineItemsTable` MUST exponer un input editable para el precio unitario. Al cambiar el precio, el total de la linea MUST recalcularse con la misma logica de cantidad y descuento existente. El input reusa el atom `Input` con el patron de las celdas de cantidad/descuento (DET-32).

<details>
<summary>Scenarios</summary>

- Scenario: GIVEN una linea con precio unitario WHEN el usuario edita el precio THEN el total de la linea se recalcula segun cantidad y descuento vigentes.
- Scenario (compartido): GIVEN el builder de ventas o el de compras WHEN se renderiza `LineItemsTable` THEN ambos exponen el mismo input de precio editable.

</details>

### REQ-02: piso minPrice en ventas — marca roja + bloqueo de emision (opcion B, honra el intent del legacy)
> Que cambia: en ventas se agrega un piso `minPrice`; cuando el precio editado cae bajo el piso la celda se pinta en rojo Y la emision del documento queda bloqueada.
> Por que: honrar el INTENT del legacy (impedir vender bajo el neto minimo). El bloqueo NO existe en el runtime del legacy — la clausula que lo intentaba es codigo muerto — pero el legacy sembraba `minPrice` y escribia la clausula; el dev eligio la opcion B: implementar el bloqueo activo.

MUST: en el builder de ventas, cuando el precio de una linea cae por debajo de su `minPrice`, la celda del precio MUST pintarse en rojo Y la emision del documento MUST quedar bloqueada (gate en el boton de emision Y en `onSubmit`). En compras NO aplica piso. `minPrice` es opcional en `lineItemSchema` (`lib/schemas/ventas.ts`).

> Desviacion deliberada del runtime del legacy: el legacy en runtime SOLO marca la celda en rojo (`clients-invoices-create.html:168`); su gate de emision (`:61`, `items.price >= items.minPrice`) es codigo muerto (alias `items` fuera del scope del boton → `undefined >= undefined` = false). El dev decidio (opcion B) honrar el intent e implementar el bloqueo activo. NO revertir a no-bloqueante.

<details>
<summary>Scenarios</summary>

- Scenario (marca roja): GIVEN una linea de ventas con `minPrice` WHEN el precio editado cae bajo `minPrice` THEN la celda del precio se pinta en rojo.
- Scenario (bloqueo de emision): GIVEN al menos una linea de ventas con precio bajo `minPrice` WHEN el usuario intenta emitir THEN el boton de emision esta deshabilitado y `onSubmit` no procede (banner precio-bajo-piso).
- Scenario (compras sin piso): GIVEN el builder de compras WHEN se edita el precio bajo cualquier valor THEN no hay marca roja ni bloqueo (el piso es exclusivo de ventas).

</details>

### REQ-03: siembra del precio desde el costo en compras (fallback a retail mientras el stub no puebla costo)
> Que cambia: en compras el precio de cada linea se siembra desde el COSTO del item, no desde el retail; con fallback al retail mientras el stub no expone el costo.
> Por que: en una compra el precio de referencia es el costo de adquisicion, no el precio de venta al publico (retail).

MUST: al agregar un item en el builder de compras, el precio de la linea MUST sembrarse desde el costo del item cuando este disponible; SI el costo no esta disponible (el list item del stub no puebla `costoCompra`), MUST caer al retail como fallback. La siembra de ventas (y de `minPrice`) sigue desde `item.precio`.

> Deuda tecnica (DEUDA_TECNICA_CONFIRMAR): el stub no puebla `costoCompra`, por lo que hoy la siembra de compras cae al fallback (retail). El backend JOR-086/090 debe exponer costo + piso explicito en el listado. Hasta entonces el fallback es la unica fuente en compras.

<details>
<summary>Scenarios</summary>

- Scenario (costo disponible): GIVEN un item con costo WHEN se agrega a una compra THEN el precio de la linea se siembra desde el costo.
- Scenario (fallback): GIVEN un item sin costo poblado (stub actual) WHEN se agrega a una compra THEN el precio se siembra desde el retail (fallback).

</details>

## Tasks

### Session 1 — Precio de linea editable + piso + costo [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Input de precio editable + recalc en LineItemsTable**
- source_ref: REQ-01
- agent: developer
- validation: cada fila de `LineItemsTable.tsx` expone input de precio editable; al editar recalcula el total de la linea; ventas y compras comparten el comportamiento
- rollback: git revert
- rules: [DET-32, DET-4]

**Task S1.T2 — Piso minPrice en ventas: celda roja + gate de emision (opcion B)**
- source_ref: REQ-02
- agent: developer
- depends_on: S1.T1
- validation: `minPrice` opcional en `lineItemSchema` (`lib/schemas/ventas.ts`); celda roja en `LineItemsTable.tsx` cuando precio < minPrice; banner precio-bajo-piso + gate en boton y `onSubmit` de `TransactionBuilder.tsx`; compras sin piso
- rollback: git revert
- rules: [DET-40, DET-4, DET-5]

**Task S1.T3 — Siembra del precio desde el costo en compras (fallback retail)**
- source_ref: REQ-03
- agent: developer
- depends_on: S1.T1
- validation: `PurchaseInvoiceBuilder.tsx` siembra el precio desde el costo con fallback a retail; `minPrice` de ventas se siembra desde `item.precio`
- rollback: git revert
- rules: [DET-4]

**Task S1.T4 — Tests + stories (PrecioEditable, PrecioBajoPiso)**
- source_ref: REQ-01, REQ-02, REQ-03
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest verde (125 passed | 11 skipped, 15 files); stories PrecioEditable y PrecioBajoPiso; tsc/eslint exit 0
- rollback: N/A (tests)
- rules: [DET-7, DET-13, DET-14]

**S1.GATE**: quality review (DET-23, tier T3), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- El piso `minPrice` es EXCLUSIVO de ventas; compras no aplica piso.
- El bloqueo de emision (opcion B) es una desviacion deliberada del runtime del legacy fundada en su intent; NO revertir a no-bloqueante.
- La siembra de compras cae al fallback (retail) mientras el stub no puebla `costoCompra` (deuda tecnica JOR-086/090).
- Reusar el atom `Input` (patron cantidad/descuento); no crear componente nuevo (DET-32).
- `LineItemsTable` es compartida por ventas y compras (y por JOR-119/122); serializar la cadena builder-calc.

## Dependencies

- **JOR-120** (ready-to-close): descuento global como %; base branch compartida `epic/jormat-v1`.
- **JOR-119** (cerrado): builder alineado al legacy en el warning de stock; comparte `LineItemsTable`.
- **JOR-086/090** (backend): deben exponer costo real + piso explicito en el listado; hasta entonces el fallback (retail) es la fuente en compras.

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Piso mal calculado bloquea ventas legitimas o deja pasar ventas bajo el neto | `TransactionBuilder.tsx`, `lib/schemas/ventas.ts` | verificacion independiente + tests PrecioBajoPiso; gate en boton y onSubmit |
| Siembra de compras usa retail en vez de costo (stub no puebla costo) | `PurchaseInvoiceBuilder.tsx` | fallback documentado como DEUDA_TECNICA_CONFIRMAR; backend JOR-086/090 |
| Regresion en `LineItemsTable` compartida (JOR-119/122) | `LineItemsTable.tsx` | vitest 125 passed; stories; recalc reusa logica cantidad/descuento |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 (opcion B, dev) | Bloqueo ACTIVO de emision bajo `minPrice` en ventas | El gate del legacy es codigo muerto (`clients-invoices-create.html:61`); solo la marca roja (`:168`) corre en runtime. El dev honra el INTENT (impedir vender bajo el neto), no el runtime. Desviacion deliberada; no revertir |
| 2 | Siembra de compras desde el costo con fallback a retail | El precio de referencia de una compra es el costo, no el retail; el stub no puebla costo → fallback (deuda tecnica JOR-086/090) |
| 3 | Reusar atom `Input` (patron cantidad/descuento) | DET-32 reuse; no se crea componente nuevo |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): editar el precio de una linea recalcula el total (test + story PrecioEditable).
- [x] AC-2 (REQ-02): precio bajo `minPrice` en ventas pinta la celda en rojo y bloquea la emision (test + story PrecioBajoPiso).
- [x] AC-3 (REQ-03): siembra del precio de compras desde el costo con fallback a retail (test).
- [x] AC-4 (regresion): `LineItemsTable` compartida sin regresion (vitest 125 passed | 11 skipped, tsc/eslint 0).

## Technical reference

- Legacy canonico: `clients-invoices-create.html:61` (gate de emision — CODIGO MUERTO, alias `items` fuera de scope), `clients-invoices-create.html:168` (marca roja — unico comportamiento en runtime).
- Front nuevo: `components/shared/builder/LineItemsTable/LineItemsTable.tsx` (input de precio + recalc + celda roja), `lib/schemas/ventas.ts` (`minPrice` opcional en `lineItemSchema`), `components/ventas/builder/TransactionBuilder.tsx` (seed minPrice, banner precio-bajo-piso, gate en boton + onSubmit), `components/compras/builder/PurchaseInvoiceBuilder.tsx` (seed desde costo con fallback).
- Commits (epic/jormat-v1, mergeados): e8d9040, 24de2a9, 63a7aa2, 6f3be62.
