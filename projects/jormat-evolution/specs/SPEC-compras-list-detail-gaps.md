---
id: SPEC-compras-list-detail-gaps
project: jormat-evolution
ticket: JOR-091
status: done
---

# Compras: cerrar gaps de listado y builder de factura proveedor (sobre stub)

# Compras: cerrar gaps de listado y builder de factura proveedor (sobre stub)

## Executive summary

Cerrar los gaps del front de compras consumiendo el contrato extendido por JOR-112: detalle de factura
proveedor (GET /:id con lineas + pagos AP), panel Moneda/Valor condicional (valueCurrency requerido solo
si currency != CLP, alineando el front con el backend), acciones de fila en el listado, y fecha editable.
Descuento ya es porcentaje (JOR-111). Front-sobre-stub, sin BD.

## Requirements

### REQ-01 — Detalle de factura proveedor
MUST: vista de detalle en ruta propia (`/compras/facturas-proveedor/:id`) que consume el nuevo
`GET /:id` (JOR-112): cabecera (proveedor, fecha, tipo, moneda/valueCurrency, estado, totales), tabla de
lineas, y seccion de **pagos AP** (fecha/monto/forma). Reusa el patron del detalle de ventas. Agrega al
front el schema espejo (`facturaProveedorDetalleSchema` + `pagoAPSchema`) en `lib/schemas/purchases.ts`,
el service `getDetalle` y el hook. 404 → not-found.

### REQ-02 — Panel Moneda/Valor condicional
MUST: `valueCurrency` (tipo de cambio) requerido solo si `currency != 'CLP'` (hoy el issue schema lo exige
siempre). Alinear `facturaProveedorIssueInputSchema` con el backend (JOR-112) y `CurrencyDetailCard`
muestra/exige el campo solo en moneda extranjera.

### REQ-03 — Acciones de fila + fecha editable
MUST: en `FacturasProveedorTable`, accion de fila "Ver detalle" (navega a la ruta del detalle). La fecha
del builder es editable (no fija).

## Tasks (Session 1, tier T2)
- S1.T1 — front schema detalle+pagos + service getDetalle + hook + `FacturaProveedorDetalleView` (lineas + pagos AP) + ruta (REQ-01).
- S1.T2 — valueCurrency condicional (issue schema + CurrencyDetailCard) alineado con backend (REQ-02).
- S1.T3 — accion de fila "Ver detalle" en el listado + fecha editable en el builder (REQ-03).
- S1.T4 — tests (detalle render, pagos AP, valueCurrency condicional, accion fila) + verificacion + stories + MSW mock del detalle.
- S1.GATE.

## No-goals
- Persistencia real / CRUD proveedores / AP real (JOR-090). Cambios de contrato backend (JOR-112, cerrado).
