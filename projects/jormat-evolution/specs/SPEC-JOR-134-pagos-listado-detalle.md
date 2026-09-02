---
id: SPEC-JOR-134-pagos-listado-detalle
project: jormat-evolution
ticket: JOR-134
status: done
---

# Pagos - listado/detalle: export CSV, resaltado full-row Vencida + leyenda, navegacion

# Pagos - listado/detalle: export CSV, resaltado full-row Vencida + leyenda, navegacion

## Executive summary — lo que estas aprobando

**Que se implementa**: tres piezas del listado/detalle de pagos que tienen paridad viable con el legacy (referencia canonica), mas la funcion de imprimir:

1. **Export CSV del universo filtrado** (P-09): el export baja el conjunto completo que matchea los filtros activos, no solo la pagina visible. Resuelto con `fetchAllPagesCapped` (tope 5000 filas) para no colgar el navegador con universos grandes.
2. **Resaltado full-row "Vencida" + leyenda** (P-12): la fila completa de un pago vencido se resalta (no solo una celda), con una leyenda que explica el codigo de color. Port de la clase `critical` del legacy via `getRowClassName` + token de diseno.
3. **Folio-link al detalle** (P-08 parcial): el folio del pago es un enlace que abre el detalle del pago.
4. **Imprimir listado** (P-13): `window.print` sobre la vista.

**Lo que NO entra (DEUDA / deferido)** — ver seccion "Deuda tecnica y deferidos":
- **"Ver cliente" y "estado de cuenta"** (P-08 parcial): no existen rutas destino en el front nuevo; NO se invento un id-mapping para fabricarlas. Deuda hasta que existan esas vistas.
- **Reporte de pagos por rango de fechas** (P-06): el endpoint `/payments/report` no existe. El nucleo del caso ya lo cubren los filtros desde/hasta del listado + el export CSV del universo filtrado. Deferido.
- **Soft-delete** (P-14): el front nuevo hace un DELETE duro; el legacy hace soft-delete via PUT. Divergencia documentada en el JSDoc de `deletePayment`; NO se toco backend. Requiere confirmacion del owner.

**Necesidad y reuso (DET-32)**: veredicto **reuse**. Las tres piezas reusan primitivos existentes (DataTable, patron de leyenda, utilidad de export CSV, `getRowClassName`); no se crea componente nuevo. Por eso el ticket no genero draft (Gate 2 no aplica).

## Purpose

- **Problema**: el listado/detalle de pagos del front nuevo no tenia paridad con el legacy en export (solo pagina visible), resaltado de vencidos (sin full-row ni leyenda) ni navegacion al detalle por folio.
- **A quien afecta**: usuarios que gestionan pagos y necesitan exportar el universo filtrado, identificar de un vistazo los pagos vencidos y saltar al detalle.
- **Referencia canonica**: el front legacy (no el codigo nuevo, que diverge).

## Requirements

### R1 — Export CSV del universo filtrado (P-09)
> Que cambia: el export deja de limitarse a la pagina visible y baja todo el conjunto que matchea los filtros activos.
> Por que: paridad con el legacy; un export que solo trae la pagina en pantalla no sirve para conciliacion.

MUST: el export CSV MUST incluir todas las filas que matchean los filtros activos (universo filtrado completo), no solo la pagina renderizada. MUST aplicar un tope de seguridad de 5000 filas (`fetchAllPagesCapped`) para no colapsar el navegador con universos grandes.

- Scenario: GIVEN un filtro que matchea 300 pagos y la tabla muestra 25 por pagina WHEN el usuario exporta THEN el CSV contiene las 300 filas, no 25.
- Scenario (tope): GIVEN un filtro que matchea mas de 5000 pagos WHEN el usuario exporta THEN el export corta en 5000 filas (tope de seguridad).

### R2 — Resaltado full-row "Vencida" + leyenda (P-12)
> Que cambia: la fila completa de un pago vencido se resalta y se agrega una leyenda que explica el color.
> Por que: paridad con la clase `critical` del legacy; el usuario identifica vencidos de un vistazo.

MUST: cada fila cuyo pago este "Vencida" MUST recibir la clase de resaltado full-row (via `getRowClassName`), usando un token de diseno (no color hardcodeado). MUST mostrarse una leyenda que asocie el color al estado "Vencida".

- Scenario: GIVEN un pago con estado "Vencida" WHEN se renderiza el listado THEN su fila completa aparece resaltada y la leyenda explica el codigo de color.
- Scenario: GIVEN un pago no vencido WHEN se renderiza el listado THEN su fila no recibe el resaltado.

### R3 — Folio-link al detalle (P-08 parcial)
> Que cambia: el folio del pago pasa a ser un enlace que abre el detalle del pago.
> Por que: navegacion al detalle, pieza viable de P-08 (las otras dos, "ver cliente" y "estado de cuenta", son deuda por falta de rutas destino).

MUST: el folio de cada fila MUST ser un enlace navegable al detalle del pago correspondiente.

- Scenario: GIVEN una fila de pago con folio WHEN el usuario hace click en el folio THEN se abre el detalle de ese pago.

### R4 — Imprimir listado (P-13)
> Que cambia: se agrega la accion de imprimir el listado.
> Por que: paridad con el legacy (impresion directa).

MUST: la vista MUST ofrecer una accion "Imprimir" que dispare `window.print`.

- Scenario: GIVEN el listado renderizado WHEN el usuario acciona "Imprimir" THEN se abre el dialogo de impresion del navegador.

## Deuda tecnica y deferidos

Piezas del request original que NO se implementaron, con razon auditada. Ninguna bloquea el cierre del registro DKC; SI son follow-ups reales.

| Pieza | Caso | Estado | Razon |
|-------|------|--------|-------|
| "Ver cliente" (navegacion) | P-08 | DEUDA | No existe ruta destino de detalle de cliente en el front nuevo. NO se invento un id-mapping para fabricar el link (identificar/rutear por dato inventado es fragil). |
| "Estado de cuenta" (navegacion) | P-08 | DEUDA | Idem: no existe la vista "estado de cuenta" en el front nuevo. |
| Reporte de pagos por rango de fechas | P-06 | DEUDA / deferido | El endpoint `/payments/report` no existe (backend). El nucleo del caso lo cubren los filtros desde/hasta del listado + el export CSV del universo filtrado (R1). Se defiere hasta que exista el endpoint. |
| Soft-delete del pago | P-14 | DEUDA_TECNICA_CONFIRMAR | El front nuevo usa DELETE duro; el legacy hace soft-delete via PUT. Divergencia documentada en el JSDoc de `deletePayment`. NO se toco backend. Requiere confirmacion del owner sobre el comportamiento esperado. |

## Tasks

### Session 1 — Pagos listado/detalle: export CSV + resaltado + folio-link + imprimir [tier: T2]

**Task S1.T1 — Export CSV del universo filtrado (`fetchAllPagesCapped`, tope 5000)**
- source_ref: R1 (P-09)
- agent: developer
- validation: el export baja todas las filas del universo filtrado, no solo la pagina; tope 5000 aplicado; test de paginado agregado sobre el filtro activo
- rollback: git revert
- rules: [DET-32, DET-40]

**Task S1.T2 — Resaltado full-row "Vencida" + leyenda (`getRowClassName` + token)**
- source_ref: R2 (P-12)
- agent: developer
- validation: fila con estado "Vencida" recibe la clase full-row; fila no vencida no; leyenda presente; token de diseno (sin color hardcodeado); port de la clase `critical` del legacy verificado
- rollback: git revert
- rules: [DET-32]

**Task S1.T3 — Folio-link al detalle + imprimir (`window.print`)**
- source_ref: R3 (P-08 parcial), R4 (P-13)
- agent: developer
- validation: el folio navega al detalle del pago; accion "Imprimir" dispara `window.print`
- rollback: git revert
- rules: [DET-32]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas. Verificacion independiente: vitest payments, tsc, eslint.

## Constraints

- Alcance acotado a `components/payments/list/` y `services/api/payments/`. No tocar backend (soft-delete P-14 queda como deuda documentada, no como cambio).
- Reusar primitivos existentes (DataTable, leyenda, export CSV, `getRowClassName`); no crear componente nuevo (DET-32).
- El resaltado usa un token de diseno, no color hardcodeado.
- No inventar rutas ni id-mapping para "ver cliente"/"estado de cuenta": si no existe la ruta destino, es deuda, no un link fabricado.

## Acceptance checkpoints

- [x] AC-1 (R1): export con filtro de 300 pagos baja 300 filas (no la pagina); tope 5000 aplicado (test).
- [x] AC-2 (R2): fila "Vencida" resaltada full-row + leyenda presente; fila no vencida sin resaltado (test).
- [x] AC-3 (R3): click en folio abre el detalle del pago.
- [x] AC-4 (R4): accion "Imprimir" dispara `window.print`.
- [x] AC-5: vitest payments verde, tsc exit 0, eslint exit 0 (verificacion independiente).

## Technical reference

- Export universo filtrado: `fetchAllPagesCapped` (tope 5000) en `services/api/payments/`.
- Resaltado: `getRowClassName` + token de diseno; port de la clase `critical` del legacy.
- Soft-delete: divergencia documentada en el JSDoc de `deletePayment` (front nuevo DELETE duro vs legacy soft-delete PUT).
- Commits: 8b85731, 27f4904, 8cdf32c en `fix/ola1-paridad-vcp`.
