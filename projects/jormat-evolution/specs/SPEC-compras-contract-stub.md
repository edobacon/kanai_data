---
id: SPEC-compras-contract-stub
project: jormat-evolution
ticket: JOR-112
status: done
---

# Compras: congelar contrato + extender stub (sin BD)

# Compras: congelar contrato + extender stub (sin BD)

## Executive summary

Bloque C0 del PLAN: extender el stub de facturas proveedor para que el front (JOR-091) cierre gaps sobre
stub, sin BD. El contrato base ya existe (JOR-060: listado AP, currency/valueCurrency, estado
borrador/pendiente/pagada). Aqui se agrega: detalle (GET /:id con lineas + pagos AP), validacion
multimoneda condicional, y la capability `:view` del listado. AP se incluye en el shape (DEC-014). El
descuento de linea ya es porcentaje (JOR-111). Sin tablas; persistencia real = JOR-090.

## Requirements

### REQ-01 — Detalle de factura proveedor (GET /:id)
MUST: `FacturaProveedorDetalleDto` = fila del listado + `lineas` (SupplierLineItemDto) + endpoint
`GET /compras/facturas-proveedor/:id` en el stub, con data de ejemplo. Espeja el patron de ventas
(`DocumentoDTEDetalleDto`). 404 para ids desconocidos.

### REQ-02 — Pagos AP en el detalle
MUST (DEC-014, dev incluye AP ahora sobre stub): shape de pagos aplicados a la factura proveedor
(`pagos`: fecha, monto, forma) en el detalle. Inferido, sin respaldo legacy directo; se marca
`DEUDA_TECNICA[compras]` y el sign-off real es JOR-090.

### REQ-03 — Multimoneda: valueCurrency condicional
MUST: en `FacturaProveedorInputDto`, `valueCurrency` (tipo de cambio) es requerido solo si
`currency != 'CLP'` (regla de integridad; en CLP no aplica). Validacion condicional en el DTO/servicio.

### REQ-04 — Capability `:view` del listado
MUST: agregar `purchases.supplier-invoices:view` (seed + grant en roles demo) y cambiar los GET
(listado + summary + detalle) a `:view` (hoy exigen `:edit` para ver). `:edit`/`:issue` siguen para
escribir/emitir. Decidir/registrar en el ticket.

## Tasks (Session 1, tier T2)
- S1.T1 — `FacturaProveedorDetalleDto` + `GET /:id` en el stub + data de ejemplo (REQ-01).
- S1.T2 — shape de pagos AP en el detalle + marca DEUDA_TECNICA (REQ-02).
- S1.T3 — validacion condicional `valueCurrency` requerido si currency != CLP (REQ-03).
- S1.T4 — capability `:view` (seed + grant) + GET guards a `:view` (REQ-04).
- S1.T5 — tests (detalle, AP, validacion multimoneda, guard :view) + verificacion (jest purchases + tsc).
- S1.GATE.

## No-goals
- Tablas de factura proveedor + repo Knex + CRUD proveedores + calculo real de AP (JOR-090).
- Front (panel Moneda/Valor condicional, detalle/AP UI) = JOR-091.
