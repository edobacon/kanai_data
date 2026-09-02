---
id: SPEC-builder-refinements
project: jormat-evolution
ticket: JOR-065
status: in_progress
---

# Refinamientos del transaction-builder (ventas/compras)

# Refinamientos del transaction-builder (ventas/compras)

## Executive summary — lo que estás aprobando

**Qué se quiere**: pulir el transaction-builder compartido (ventas + compras) sobre 3 ejes: dar más ancho al buscador (layout 60/40), hacerlo navegable con detalle de ítem reutilizando el modal de Items, y en ventas permitir elegir factura afecta/exenta de IVA para que el cálculo aplique o no el 19%. Cantidad/descuento por fila, drag&drop y el resumen calculado desde la selección ya existen (se verifican, no se re-construyen).

**Decisiones críticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | "Tipo de documento" pasa a afecta/exenta (reemplaza los DTE genéricos) | Cambia el enum + la firma de `calcTotals`; ripplea a consumidores del cálculo |
| 2 | Buscador 40% / tabla 60% (no 50/50) | Refinamiento del dev sobre el pedido inicial |

## Purpose

Cerrar los gaps de UX/negocio del builder detectados por el dev en `/ventas/crear-factura` y `/compras/facturas-proveedor/crear`, reutilizando componentes existentes (`ItemDetailModal`, `Pagination`, `TwoColumn`).

## Requirements

### REQ-01 — Layout 60/40 del bloque de ítems

> **Qué cambia**: el bloque "Ítems del documento" pasa de sidebar fijo (1fr/320px) a 60% (tabla) / 40% (buscador).
> **Por qué**: el buscador angosto no da espacio a la tabla navegable + botón ver.

`TwoColumn` DEBE aceptar un prop de proporción (`ratio`) con default = comportamiento histórico; ambos builders lo usan en `'60-40'`. AplicarPagoView (otro consumidor) NO cambia.

### REQ-02 — Buscar ítems navegable + ver detalle

> **Qué cambia**: la tabla del buscador pagina in-place y cada fila gana un botón "Ver" que abre el detalle del ítem.
> **Por qué**: "Ver más ítems" era placeholder; no había forma de inspeccionar un ítem antes de agregarlo.

`ItemSearchPanel` DEBE paginar los resultados (N por página) y abrir `ItemDetailModal` (reuso) al pulsar "Ver". El `+` sigue agregando a `lineas`.

### REQ-03 — Afectación IVA en ventas (afecta/exenta)

> **Qué cambia**: "Tipo de documento" ofrece "Factura afecta de IVA" (19%) y "Factura exenta de IVA" (0%); el cálculo aplica IVA según eso.
> **Por qué**: hoy el IVA es fijo 19% en ventas.

El enum de tipo de documento DEBE ser afecta/exenta; `calcTotals` recibe si aplica IVA; `DocumentSummaryCard` muestra IVA 0 en exenta. Compras no cambia (IVA condicional por moneda ya existe).

<details><summary>Scenario: exenta → IVA 0</summary>
GIVEN una factura con tipo "exenta" WHEN se calculan los totales THEN el IVA es 0 y el total = neto.
</details>

### REQ-04 — Resumen calculado desde la selección (verificación)

> **Qué cambia**: se verifica (no se construye) que el resumen viene de la selección e inicia en 0.
> **Por qué**: pedido explícito del dev; el código ya lo cablea (`calcTotals(useWatch('lineas'))`, `DEFAULT_VALUES.lineas: []`).

Al agregar/editar ítems (cantidad, descuento, descuento global, afectación) el resumen DEBE recalcular desde 0 con las cifras correctas.

## Tasks

### Session 1 — Layout 60/40 [tier: T1]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S1.T1 | `TwoColumn` prop `ratio` ('sidebar' default \| '60-40') + aplicar '60-40' en ambos builders + test del prop | REQ-01 | `src/components/layout/two-column/*`, `TransactionBuilder.tsx`, `PurchaseInvoiceBuilder.tsx` | DET-23 |

### Session 2 — Buscar navegable + ver detalle [tier: T2]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S2.T1 | `ItemSearchPanel`: paginación in-place (reemplaza "Ver más" placeholder) + botón "Ver" por fila → `ItemDetailModal` (reuso) + tests | REQ-02 | `src/components/shared/builder/ItemSearchPanel/*` | DET-23, RULE-frontend-001 |

### Session 3 — IVA afecta/exenta (ventas) [tier: T2]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S3.T1 | `TIPO_DTE` → afecta/exenta + `calcTotals(lineas, descuentoGlobal, aplicaIva)` condicional + wiring en `TransactionBuilder` + `DocumentSummaryCard` (IVA 0 exenta) + tests | REQ-03 | `src/lib/schemas/ventas.ts`, `src/lib/ventas/calc-totals.ts`, `TransactionBuilder.tsx`, `DocumentSummaryCard.tsx` | DET-23, DET-16 |

### Session 4 — Verificación resumen←selección + cierre [tier: T3]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S4.T1 | Verificación runtime: agregar ítems + cantidad/descuento/afectación recalcula el resumen desde 0; suite completa verde | REQ-04 | builders + calc | DET-13, DET-36 |

## Constraints

- `TwoColumn`, `ItemSearchPanel`, `calc-totals` son compartidos por ventas+compras: no romper compras.
- Reusar `ItemDetailModal`, `Pagination` existentes (no duplicar).
- Backend sin cambios (stubs).

## Acceptance checkpoints

- [ ] Layout 60/40 en ambos builders; AplicarPagoView intacto.
- [ ] Buscador paginado + "Ver" abre `ItemDetailModal`.
- [ ] Factura exenta → IVA 0; afecta → IVA 19%.
- [ ] Resumen recalcula desde 0 con cantidad/descuento/afectación.
- [ ] Suite completa verde; tsc + lint limpios.
