---
id: SPEC-percent-stepper-descuento
project: jormat-evolution
ticket: JOR-117
status: done
---

# Componente % (stepper 0-100) para descuento y fix del "010"

# Componente % (stepper 0-100) para descuento y fix del "010"

## Diagnostico

El input de descuento de linea (`LineItemsTable`, compartido ventas+compras) es un `Input type=number`
plano con `value ?? 0` fijo y `step={100}` (resabio de la epoca de monto). Sintomas: al tipear "10" sobre
el 0 controlado queda "010" (leading zero pegado) y no hay tope superior (permite > 100). El descuento es
un PORCENTAJE 0-100 (DEC-018). El `NumberStepper` (usado en cantidad y en `descuentoMax` de items) tiene
+/- pero NO soporta `max`, asi que el `+` no topa en 100.

## Requirements

### REQ-01 — NumberStepper soporta `max`
MUST: agregar prop opcional `max` a `NumberStepper`: `increment` clampa a `max`, `handleInput` clampa a
`max`, y el boton `+` queda `disabled` cuando `value >= max`. Backward-compatible (sin `max` = sin tope).

### REQ-02 — Componente PercentStepper (0-100, %)
MUST: `PercentStepper` que compone `NumberStepper` con `min=0`, `max=100`, `step=1` y muestra "%" como
adorno. Reutilizable. Es "el componente para el %".

### REQ-03 — Descuento de linea usa PercentStepper
MUST: reemplazar el `Input` plano de descuento en `LineItemsTable` por `PercentStepper`. Arregla el "010"
(el stepper parsea y re-controla el valor), clampa 0-100, y agrega +/-. Cubre ventas y compras (compartido).

### REQ-04 — descuentoMax (items) usa PercentStepper
MUST: en `ItemCreateForm`, `descuentoMax` pasa de `NumberStepper` (sin tope) a `PercentStepper` (0-100).
Mantiene el mapeo `v === 0 ? undefined : v`.

### REQ-05 — Tests + regresion
MUST: tests del `max` en NumberStepper (clamp + boton disabled), del PercentStepper (0-100, "%", sin
"010"), y regresion de descuento en ventas/compras + descuentoMax en items.

## Tasks (Session 1, tier T2)
- S1.T1 — `NumberStepper` + `max` (clamp/disable) + `PercentStepper` nuevo + tests/stories del atom.
- S1.T2 — cablear `LineItemsTable.descuento` y `ItemCreateForm.descuentoMax` a `PercentStepper` + regresion.
- S1.T3 — verificacion (vitest builder/items + tsc) + screenshot runtime del stepper de descuento.
- S1.GATE.

## No-goals
- `descuentoGlobal` (es MONTO, no %). Cambiar el contrato/schema (descuento ya es 0-100 en zod). Backend.
