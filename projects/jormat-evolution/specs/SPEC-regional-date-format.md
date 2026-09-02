---
id: SPEC-regional-date-format
project: jormat-evolution
ticket: JOR-079
status: done
---

# Formato regional de fecha es-CL (cerrar gap legacy)

# Formato regional de fecha es-CL (cerrar gap legacy)

## Executive summary

El legacy formateaba fechas con `date:'dd/MM/yyyy'`; el new imprime el string ISO **sin formatear**
en varias vistas (ventas listado/detalle, compras, pagos, auditoría de item). Cerrar ese gap
aplicando la capa de formateo es-CL **que ya existe** (`lib/date.ts` `formatDate` + componente
`DateDisplay`, JOR-017). Front-only, quick win.

## Hallazgos de grounding (DET-33 + evidencia legacy §4)

Evidencia: `jormat_docs/legacy/front/migracion/transversales.md` §4 "Estados de UI y formato
regional".

- **Fecha (gap real, evidencia fuerte)**: legacy `date:'dd/MM/yyyy'`; new imprime ISO crudo. → cerrar.
- **Moneda**: legacy `pesosChilenos` ≡ new `formatCurrency('CLP')` — **ya equivalente**. Sin gap.
  `formatCLP` (alias retro-compat de `format.ts`) delega en `formatCurrency`; no se renombra en masa
  (fuera de alcance/evidencia). → sin acción.
- **RUT**: legacy validaba módulo 11; el new ya tiene mantenedor de clientes + `formatRut` (JOR-089).
  → cubierto, sin acción.
- **Estados de UI**: el `DataTable` compartido ya centraliza loading/empty/error (props
  `isLoading`/`isError`) y las vistas de listado los cablean (verificado en `DocumentosListView`).
  Los componentes `ui/empty-state`, `ui/error-state`, `ui/loading-skeleton` ya existen y se usan.
  → sin acción (el doc legacy lo marca como "conviene definir", ya cubierto por la infra actual).

Infra existente reutilizada: `lib/date.ts` (`formatDate(iso, 'date'|'datetime')`, es-CL dd/MM/yyyy) +
`components/shared/DateDisplay`.

## Requirements

### REQ-01 — Fechas es-CL en las vistas que imprimen ISO crudo
> Que cambia: usar `DateDisplay`/`formatDate` en los spots que hoy renderizan el string ISO.
> Por que: cerrar el gap regional de fecha (legacy dd/MM/yyyy).

MUST: las siguientes vistas formatean la fecha con la capa es-CL existente (no string ISO crudo):
- `ventas/list/DocumentosTable` (columna fecha)
- `ventas/detail/DocumentoDetalleView` (campo Fecha)
- `compras/list/FacturasProveedorTable` (columna fecha)
- `payments/detail/PagosAsociadosTable` (columna fecha)
- `items/detail/ItemDetailModal` (auditoría "Última actualización")

### REQ-02 — Dedupe del formateador local
MUST: `items/catalogos/CatalogosView` usa el `formatDate` compartido en vez de su `formatFecha`
local duplicado (una sola fuente de verdad de formateo de fecha).

## Tasks

### Session 1 (frontend, tier T2)
- S1.T1 — Aplicar `DateDisplay`/`formatDate` a los 5 spots de fecha ISO cruda (REQ-01).
- S1.T2 — Dedupe `formatFecha` local de `CatalogosView` → `formatDate` compartido (REQ-02).
- S1.T3 — Regression front (vitest) + typecheck; ajustar/añadir asserts de fecha formateada.
- S1.GATE.

## No-goals
- Rename masivo de `formatCLP` (alias funcional, sin gap). Estados de UI (ya centralizados). RUT
  (cubierto por JOR-089). i18n multi-idioma (JOR-080, condicional a producto). Impresión/export
  (JOR-078).
