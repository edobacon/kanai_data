---
id: SPEC-ventas-builder-gaps
project: jormat-evolution
ticket: JOR-088
status: done
---

# Ventas: cerrar gaps del builder de factura (sobre stub)

# Ventas: cerrar gaps del builder de factura (sobre stub)

## Executive summary

Cerrar los gaps del builder de factura (`TransactionBuilder`) sobre el contrato congelado (JOR-111),
sin BD. Alcance dentro de `components/ventas/builder/`. Stock se mantiene como **warning no bloqueante
fiel al legacy** (decision del dev 2026-08-08). Descuento ya es porcentaje (JOR-111); aqui se valida el
input 0-100. Se agrega credito con vencimiento y bloqueo de emision por cliente moroso. SII y stock/
credito reales son sign-off diferido (JOR-086).

## Requirements

### REQ-01 — Stock: warning no bloqueante (fiel al legacy)
> Que cambia: el aviso de stock insuficiente no bloquea la emision.
> Por que: el legacy avisa (ngNotify warn) + impide agregar mas de ese item, pero NO bloquea facturar.

MUST: mantener el banner de stock como warning dismissible (no bloquea "Facturar"). Ademas, impedir subir
la cantidad de una linea por encima del stock del catalogo (equivalente al `buttonMore` del legacy
`clientsInvoicesCreateController.js:320-350`). NO agregar validacion bloqueante en el submit.

### REQ-02 — Descuento por linea: input porcentaje 0-100
> Que cambia: el input de descuento se valida como porcentaje.

MUST: el campo de descuento por linea acepta 0-100 (el calculo ya es % via `calcLineTotal`, DEC-018/JOR-111).
Clamp/validacion en el input; sin cambiar el schema (ya tiene `.max(100)`).

### REQ-03 — Credito con vencimiento
> Que cambia: elegir credito setea la fecha de vencimiento.

MUST: al seleccionar forma de pago `credito_30/60/90`, calcular `vencimiento = fecha + N dias` (contado →
sin vencimiento). Mostrarlo en el resumen/header del builder.

### REQ-04 — Bloqueo de emision por cliente moroso
> Que cambia: si el cliente esta bloqueado, no se puede emitir.

MUST: si el receptor esta `locked` (bloqueo por mora, DEC-013; shape del stub), deshabilitar "Facturar"
con mensaje. Sobre stub (el bloqueo real lo calcula el backend, JOR-092/113 — sign-off diferido).

### REQ-05 — Clonar (prefill del builder desde un documento)
> Que cambia: el builder puede iniciarse con datos precargados de un documento existente.

SHOULD: el builder acepta datos iniciales (lineas + receptor) para clonar un documento como nuevo draft.
El mecanismo de prefill vive en el builder; el punto de entrada (accion "Clonar" en listado/detalle) y
"convertir cotizacion→factura" quedan como follow-up (el modulo de cotizaciones no existe en el front nuevo).

## Tasks (Session 1, tier T2)
- S1.T1 — stock warning no bloqueante + impedir cantidad > stock por linea (REQ-01).
- S1.T2 — input descuento 0-100 + credito con vencimiento (fecha + N) (REQ-02, REQ-03).
- S1.T3 — bloqueo de emision si receptor.locked (REQ-04).
- S1.T4 — clonar: prefill del builder desde datos iniciales (REQ-05, SHOULD).
- S1.T5 — tests (stock no-bloqueante, descuento clamp, vencimiento credito, bloqueo cliente, prefill) + verificacion + stories.
- S1.GATE.

## No-goals
- Bloqueo de stock en el submit (diverge del legacy). Stock/credito/bloqueo REALES (JOR-086/092).
- Convertir cotizacion→factura (no hay modulo de cotizaciones). SII real. Emision/XML.
