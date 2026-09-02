---
id: SPEC-ventas-list-detail-gaps
project: jormat-evolution
ticket: JOR-087
status: done
---

# Ventas: cerrar gaps de listado y detalle de facturas (sobre stub)

# Ventas: cerrar gaps de listado y detalle de facturas (sobre stub)

## Executive summary

Cerrar los gaps de UI del listado y detalle de facturas consumiendo el contrato ya congelado por JOR-111
(origen/oc/vencimiento/receptor completo/despacho). Front-sobre-stub, sin BD. Incluye columnas nuevas,
resaltado "Vencida" fiel al legacy, export CSV, y anular como flujo real de UI (ConfirmDialog + mutacion
mock). El sign-off de persistencia real del anulado queda diferido a JOR-086.

## Requirements

### REQ-01 — Columnas Origen y OC en el listado
> Que cambia: la tabla muestra origen y orden de compra.

MUST: `DocumentosTable` agrega columnas `origen` y `oc` (OC opcional muestra guion). Consume el contrato de JOR-111.

### REQ-02 — Resaltado "Vencida"
> Que cambia: las facturas vencidas se marcan visualmente.
> Por que: fidelidad al legacy (badge rojo cuando expira).

MUST: badge `error` "Vencida" cuando `vencimiento <= hoy` y `estadoComercial !== 'aceptado'`. Derivado de la
fecha, sin agregar valor al enum de estado. Legacy: `clients-invoices-list.html:90` (bg-danger), regla
`expirationDate <= hoy` (`paymentsListController.js:75`).

### REQ-03 — Export CSV del listado
MUST: boton "Exportar CSV" en la toolbar; exporta las filas cargadas (folio, tipo, receptor, rut, fecha,
vencimiento, origen, oc, estados, montos). Reusa `lib/csv`. Escape RFC 4180.

### REQ-04 — Anular (flujo de UI real)
MUST: reemplazar el placeholder `toast.info` por ConfirmDialog (unico del proyecto): nombre del documento
(folio + receptor) en la PREGUNTA del cuerpo con word-break, condiciones debajo, boton de confirmar con
label fijo corto "Anular". Al confirmar: mutacion `useAnularDocumento` contra mock void → invalida el
listado + toast. Sin inventar estado `anulado` nuevo; persistencia real diferida a JOR-086.

### REQ-05 — Detalle: receptor completo, despacho, subtotal/descuento
MUST: `DocumentoDetalleView` muestra receptor completo (telefono/ciudad/direccion), seccion de despacho,
origen/oc/vencimiento en cabecera, y subtotal/descuento (derivados de `lineas` en cliente). Anular con el
mismo ConfirmDialog.

## Tasks (Session 1, tier T2)
- S1.T1 — listado: columnas origen/OC + badge Vencida (helper `isVencida`) (REQ-01, REQ-02).
- S1.T2 — export CSV en la toolbar (`lib/csv`) (REQ-03).
- S1.T3 — anular: ConfirmDialog + hook `useAnularDocumento` + mock void; en tabla y detalle (REQ-04).
- S1.T4 — detalle: receptor completo + despacho + origen/oc/vencimiento + subtotal/descuento (REQ-05).
- S1.T5 — tests (columnas, Vencida vencido/no/futuro, CSV, flujo anular) + verificacion + stories.
- S1.GATE.

## Evidencia
- Front vitest `components/ventas` + `hooks/useVentas` **180/180**. `tsc --noEmit` exit 0. ESLint exit 0.
- Runtime (DET-36): screenshot del listado en Storybook (columnas origen/OC + badge Vencida + tipos
  canonicos) y toolbar con boton Exportar CSV. Detalle/anular via Storybook con MSW habilitado.
- Commits (rama `JOR-087-list-detail`): 821fc22 feat · 1871243 test.

## No-goals
- Persistencia real del anulado / estado nuevo en el enum (JOR-086). Impresion/PDF (JOR-078). Cambios de
  contrato/DTO (JOR-111, congelado).
