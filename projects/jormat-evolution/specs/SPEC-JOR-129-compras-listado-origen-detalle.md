---
id: SPEC-JOR-129-compras-listado-origen-detalle
project: jormat-evolution
ticket: JOR-129
status: done
---

# Compras: listado/detalle/origen (origen por usuario, row action Pagos, subtotal)

# Compras: listado/detalle/origen (origen por usuario, row action Pagos, subtotal)

## Executive summary — lo que estas aprobando

**Que se corrige**: tres divergencias del modulo de compras frente al legacy (referencia canonica), acotadas a listado/detalle/origen. NO se toca el flujo de creacion/edicion de borrador (diferido por JOR-136, `SHOW_SAVE_DRAFT` intacto).

**Alcance de las tres piezas:**

| Pieza | Alcance | Como |
|-------|---------|------|
| R1 origen por bodegas del usuario (C-12) | Mecanismo cableado AHORA + DEUDA backend explicita | El builder consume `user.id`; `listBodegas(userId?)` + hook `useBodegasByUser` quedan cableados end-to-end. El backend NO expone hoy relacion usuario-bodega ni el param `userId`, por lo que el filtro es no-op (trae todas) sin regresion. La deuda queda registrada para el dia que el backend lo soporte |
| R2 row action Pagos (C-13) | En scope AHORA (VIABLE) | Accion "Pagos" en el listado de facturas de proveedor: oculta en estado Borrador, gateada por capability `purchases.supplier-invoices:view`, navega a `/compras/facturas-proveedor/:id#pagos-ap` |
| R3 subtotal en el detalle (C-17) | En scope AHORA (VIABLE) | Subtotal = suma de los totales de linea, mostrado en el card de Totales del detalle |

> **Row action "Modificar" diferida (DEUDA/follow-up)**: en el legacy "Modificar" es exclusiva del estado Borrador y enlaza al editor de borrador. Como ese flujo esta hoy diferido (JOR-136 mantiene el borrador oculto), no existe ruta de edicion a la que apuntar. No se toco; queda como follow-up para reactivar cuando el borrador se presupueste.

**Lo que NO cambia**: el flujo de borrador (crear/editar/abandonar) sigue oculto (`SHOW_SAVE_DRAFT` intacto); el conteo de borradores del listado no se toca.

**Necesidad y reuso (DET-32)**: veredicto `reuse`. Las tres piezas reusan primitivos existentes (DataTable/menu de row actions del listado, TotalsCard del detalle, hooks de catalogos). No se crea componente nuevo; por eso Gate 2 (draft) se marca `skipped`.

## Purpose

- **Problema**: el modulo de compras diverge del legacy en tres puntos de listado/detalle/origen: (1) el "Origen" no esta acotado a las bodegas del usuario, (2) falta la row action "Pagos" para navegar a los pagos de la factura de proveedor, (3) el detalle no muestra el subtotal.
- **A quien afecta**: usuarios que operan compras (facturas de proveedor); no ven el subtotal, no tienen acceso directo a los pagos desde el listado, y el origen no refleja sus bodegas.
- **Sintoma reportado**: casos C-12 (origen por bodegas del usuario), C-13 (row action Pagos), C-17 (subtotal en el detalle).

## Requirements

### R1 (REQ-FIX-01): el "Origen" se acota a las bodegas del usuario — mecanismo cableado + DEUDA backend
> Que cambia: el listado de bodegas de "Origen" pasa a resolverse por el usuario actual; el builder consume `user.id`.
> Por que: el legacy restringe el origen a las bodegas asignadas al usuario; el nuevo traia todas sin distincion.

MUST: el mecanismo MUST quedar cableado end-to-end: `listBodegas(userId?)` acepta el id de usuario, el hook `useBodegasByUser` lo propaga, y el builder consume `user.id`. La firma MUST ser retrocompatible (`userId` opcional): sin `userId` el comportamiento es identico al actual (DET-40, caso base).

> **DEUDA_TECNICA_CONFIRMAR (backend)**: el backend NO expone hoy relacion usuario-bodega ni acepta el parametro `userId`. Con el mecanismo cableado el filtro es un **no-op**: se sigue trayendo todas las bodegas, sin regresion. El efecto real (filtrado por usuario) queda pendiente del soporte backend. La deuda se registra en decisions_log (`origen-por-usuario | mecanismo + DEUDA`).

- Scenario: GIVEN el backend sin soporte de `userId` WHEN el builder pide bodegas con `user.id` THEN se traen todas las bodegas (no-op, sin regresion frente al comportamiento previo).
- Scenario (futuro, cuando el backend soporte la relacion): GIVEN el usuario tiene asignadas las bodegas A y B WHEN se abre "Origen" THEN solo aparecen A y B.

### R2 (REQ-FIX-02): row action "Pagos" en el listado de facturas de proveedor
> Que cambia: el listado suma una accion "Pagos" por fila que navega a los pagos de la factura.
> Por que: fidelidad al legacy; acceso directo a los pagos sin abrir el detalle completo.

MUST: la row action "Pagos" MUST estar OCULTA en estado Borrador, MUST estar gateada por la capability `purchases.supplier-invoices:view`, y MUST navegar a `/compras/facturas-proveedor/:id#pagos-ap` (el ancla `#pagos-ap` posiciona en la seccion de pagos del detalle).

- Scenario: GIVEN una factura de proveedor NO borrador y el usuario con `purchases.supplier-invoices:view` WHEN abre el menu de acciones de la fila THEN aparece "Pagos" y navega a `/compras/facturas-proveedor/:id#pagos-ap`.
- Scenario: GIVEN una factura en estado Borrador WHEN abre el menu de acciones THEN "Pagos" NO aparece.
- Scenario: GIVEN el usuario sin la capability WHEN abre el menu THEN "Pagos" NO aparece.

### R3 (REQ-FIX-03): subtotal en el detalle
> Que cambia: el card de Totales del detalle muestra el subtotal.
> Por que: fidelidad al legacy; el detalle no exponia el subtotal.

MUST: el detalle de la factura de proveedor MUST mostrar el subtotal como la suma de los totales de linea, en el card de Totales.

- Scenario: GIVEN una factura con lineas cuyos totales suman S WHEN se abre el detalle THEN el card de Totales muestra el subtotal = S.

### REQ-REGRESSION-01: el flujo de borrador no cambia
MUST: el flujo de crear/editar/abandonar borrador MUST permanecer OCULTO (`SHOW_SAVE_DRAFT` intacto); el conteo de borradores del listado MUST permanecer sin cambios.

## Nota: row action "Modificar" (diferida)

"Modificar" NO se implementa en este ticket. En el legacy es exclusiva del estado Borrador y enlaza al editor de borrador; ese flujo esta diferido (JOR-136 mantiene el borrador oculto), asi que no hay ruta de edicion a la que apuntar. Reactivarla tocaria el borrador diferido. Queda como DEUDA/follow-up. Registrado en decisions_log (`row-action-modificar | DEUDA/follow-up`).

## Tasks

### Session 1 — Compras listado/detalle/origen [tipo: ⚑ fuerte] [tier: T2]

**Task S1.T1 — Origen por bodegas del usuario (mecanismo + DEUDA backend)**
- source_ref: R1 (REQ-FIX-01)
- agent: developer
- validation: `listBodegas(userId?)` retrocompatible (caso base identico), hook `useBodegasByUser` propaga, builder consume `user.id`; sin soporte backend el filtro es no-op sin regresion; vitest compras verde; tsc/eslint exit 0
- rollback: git revert ee471b2
- rules: [DET-4, DET-40]

**Task S1.T2 — Row action "Pagos"**
- source_ref: R2 (REQ-FIX-02)
- agent: developer
- validation: "Pagos" oculta en Borrador, gateada `purchases.supplier-invoices:view`, navega a `/compras/facturas-proveedor/:id#pagos-ap`; "Modificar" no se toca (diferida); vitest compras verde
- rollback: git revert 1e0e574
- rules: [DET-32]

**Task S1.T3 — Subtotal en el detalle**
- source_ref: R3 (REQ-FIX-03)
- agent: developer
- depends_on: S1.T2
- validation: card de Totales muestra subtotal = suma de totales de linea; ancla `#pagos-ap` posiciona en pagos; vitest compras verde
- rollback: git revert c7728c0
- rules: [DET-32]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a listado/detalle/origen de compras. No se toca el builder ni el flujo de borrador (JOR-136).
- Reusar DataTable/menu de row actions, TotalsCard y hooks de catalogos existentes (DET-32 reuse). No crear componente nuevo.
- La firma `listBodegas(userId?)` es retrocompatible: sin `userId`, comportamiento identico (DET-40, caso base).

## Dependencies

- **JOR-136**: mantiene el borrador oculto; condiciona que "Modificar" quede diferida (sin ruta de edicion).
- Sin dependencia dura de backend para el cableado del mecanismo de R1; el filtrado real por usuario SI depende de soporte backend (DEUDA_TECNICA_CONFIRMAR).

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| El mecanismo de origen aparenta filtrar pero es no-op | `listBodegas(userId?)` / `useBodegasByUser` | DEUDA explicita en decisions_log + spec; caso base identico (DET-40), sin regresion |
| Cambio de firma `listBodegas` rompe consumidores | services/api/catalogos | `userId` opcional, retrocompatible; auditoria de reemplazo covered (DET-40) |
| "Pagos" visible en estado invalido o sin permiso | FacturasProveedorTable | Oculta en Borrador + gateada por capability |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Origen por usuario: cablear el mecanismo AHORA + registrar DEUDA backend | El backend no expone relacion usuario-bodega ni param `userId`; cablear deja el front listo y no-op (sin regresion) hasta que el backend lo soporte |
| 2 | Firma `listBodegas(userId?)` retrocompatible | Caso base identico sin `userId` (DET-40); no rompe consumidores |
| 3 | "Pagos" oculta en Borrador + gateada + navega a `#pagos-ap` | Fidelidad al legacy; acceso directo a pagos sin abrir el detalle completo |
| 4 | "Modificar" diferida (DEUDA/follow-up) | Es exclusiva de Borrador enlazando al editor de borrador; ese flujo esta diferido (JOR-136), no hay ruta de edicion; reactivarla tocaria el borrador diferido |
| 5 | Subtotal = suma de totales de linea en el card de Totales | Fidelidad al legacy |

## Acceptance checkpoints

- [x] AC-1 (R1): `listBodegas(userId?)` retrocompatible + hook + builder consume `user.id`; no-op sin regresion (test + tsc/eslint).
- [x] AC-2 (R2): "Pagos" oculta en Borrador, gateada, navega a `#pagos-ap` (test).
- [x] AC-3 (R3): card de Totales muestra subtotal = suma de totales de linea (test).
- [x] AC-4 (REGRESSION-01): borrador oculto (`SHOW_SAVE_DRAFT` intacto), conteo de borradores sin cambios (regression verde).
