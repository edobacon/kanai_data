---
id: SPEC-JOR-132-pago-multidocumento-office
project: jormat-evolution
ticket: JOR-132
status: done
---

# Pago multi-documento (office-payments)

# Pago multi-documento (office-payments)

## Executive summary — lo que estas aprobando

**Que se construye**: el flujo de pago multi-documento del modulo de pagos (office-payments), la pieza de mayor alcance de la cadena de pagos del front nuevo. Tres capacidades:

1. **Crear multi-documento (P-04)** — ruta `/finanzas/pagos-oficina/crear`: seleccionar bodega, cargar los documentos de esa bodega, armar un carrito de N documentos con forma de pago + monto por documento, ver el total en vivo (`total = Σ round(pay)`) y hacer submit.
2. **Listado + ver items (P-10)** — ruta `/finanzas/pagos-oficina`: tabla de pagos + modal con los items de cada pago.
3. **Formas de pago Mixto + Anulacion (P-11)** — enum `OFFICE_FORMA_PAGO` = los 8 medios + `Mixto` + `Anulacion`, **aislado** del enum de 8 medios que usa el pago 1-factura (que no se toca).

**Sobre que se construye**: sobre el stub MSW del modulo de pagos. Las tres capacidades son **VIABLES hoy** sobre stub, reusando patrones ya establecidos del modulo (DataTable, formularios, listas, el enum base de medios de pago, el `origen`). No se crea lenguaje visual nuevo (DET-32 reuse): la vista compone componentes ya presentes.

**Lo que NO cambia**: el enum de 8 medios del pago 1-factura. `OFFICE_FORMA_PAGO` es un enum separado que extiende con `Mixto`/`Anulacion`; un test verifica que el enum de 8 permanece intacto.

**DEUDA TECNICA a confirmar (backend, no 3o)**: la persistencia real depende de trabajo backend fuera de este ticket (ver seccion "Deuda tecnica — backend"). El front queda completo y verificado sobre stub; el sign-off runtime real queda diferido al backend.

## Purpose

- **Problema**: el front nuevo no tiene el flujo de pago multi-documento (office-payments) que el legacy si expone. Es la capacidad de pagos de mayor alcance pendiente en la migracion.
- **A quien afecta**: usuarios de finanzas que registran pagos que cubren varios documentos de una misma bodega en una sola operacion.
- **Alcance**: front sobre stub MSW; la persistencia real (endpoints + capabilities + mapeo de ids) es deuda tecnica de backend a confirmar.

## Requirements

### REQ-01: crear un pago multi-documento con total en vivo = Σ round(pay)
> Que cambia: se agrega el flujo de creacion de pago que cubre N documentos de una bodega en una sola operacion.
> Por que: paridad con el legacy (office-payments); es la capacidad P-04 del plan.

MUST: la ruta `/finanzas/pagos-oficina/crear` MUST permitir (1) seleccionar la bodega (por `origen`, no por catalogo de nombres — ver DEC-002), (2) cargar los documentos de esa bodega, (3) armar un carrito de N documentos donde cada linea tiene forma de pago + monto (`pay`), (4) mostrar el total en vivo calculado como `Σ round(pay)` por documento, y (5) hacer submit del carrito.

- Scenario: GIVEN una bodega con 3 documentos WHEN el usuario agrega los 3 al carrito con montos 100.4, 200.6 y 50 THEN el total en vivo muestra `round(100.4) + round(200.6) + round(50)` (el redondeo se aplica por documento antes de sumar, no al total).
- Scenario: GIVEN un carrito con documentos WHEN el usuario cambia el monto de una linea THEN el total se re-calcula en vivo.
- Scenario (submit): GIVEN un carrito valido WHEN el usuario hace submit THEN se envia el batch (hoy contra el stub MSW; el POST batch real es deuda backend).

### REQ-02: listado de pagos + ver items
> Que cambia: se agrega la vista de listado de pagos multi-documento y el detalle de items de cada uno.
> Por que: capacidad P-10 del plan (consultar lo creado).

MUST: la ruta `/finanzas/pagos-oficina` MUST mostrar una tabla de pagos y, por pago, un modal con los items (los documentos cubiertos por ese pago).

- Scenario: GIVEN pagos existentes WHEN el usuario abre la vista THEN ve la tabla de pagos.
- Scenario: GIVEN un pago con N items WHEN el usuario abre "ver items" THEN el modal lista los N documentos del pago.

### REQ-03: formas de pago Mixto y Anulacion, aisladas del enum de 8
> Que cambia: office-payments soporta 8 medios + `Mixto` + `Anulacion`; el pago 1-factura conserva sus 8 medios sin cambios.
> Por que: capacidad P-11; el legacy office-payments admite Mixto y Anulacion que el flujo 1-factura no.

MUST: el enum `OFFICE_FORMA_PAGO` MUST contener los 8 medios base + `Mixto` + `Anulacion`. El enum de 8 medios del pago 1-factura MUST permanecer intacto (no se le agregan Mixto/Anulacion).

- Scenario (aislamiento): GIVEN el enum de 8 del pago 1-factura WHEN se agrega `OFFICE_FORMA_PAGO` THEN el enum de 8 no cambia (verificado por test).
- Scenario: GIVEN el flujo office-payments WHEN el usuario elige forma de pago de una linea THEN puede elegir cualquiera de los 8 + Mixto + Anulacion.

## Deuda tecnica — backend (DEUDA_TECNICA_CONFIRMAR)

El front queda completo y verificado sobre el stub MSW. La persistencia real depende de trabajo backend fuera de este ticket, a confirmar antes del sign-off en entorno real:

| Item | Estado hoy | Que falta (backend) |
|------|-----------|---------------------|
| Endpoints `/pagos/oficina/*` | Solo MSW (stub) | Endpoints reales de lectura/listado |
| POST batch (crear multi-doc) | Solo MSW (stub) | Endpoint POST batch real que persista el carrito de N documentos |
| Capabilities `payments.offices:view` / `payments.offices:create` | Gating de UI ya implementado | Seed RBAC (falta) para que las capabilities existan en el backend |
| Mapeo `token -> id` + `warehouseId` (DEC-002) | Resuelto en el front por `origen` | El backend real resuelve el mapeo definitivo token->id y warehouseId |

## Tasks

### Session 1 — Construir office-payments sobre stub [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Enum `OFFICE_FORMA_PAGO` aislado (8 + Mixto + Anulacion)**
- source_ref: REQ-03
- agent: developer
- validation: `OFFICE_FORMA_PAGO` expone 8 + Mixto + Anulacion; el enum de 8 del pago 1-factura permanece intacto (test de aislamiento)
- rollback: git revert
- rules: [DET-32]

**Task S1.T2 — Vista crear multi-documento (carrito + total en vivo)**
- source_ref: REQ-01
- agent: developer
- depends_on: S1.T1
- validation: ruta `/finanzas/pagos-oficina/crear`; seleccionar bodega -> cargar docs -> carrito de N docs con forma+monto -> total en vivo = Σ round(pay) -> submit contra stub. Reusa DataTable/form/list del modulo de pagos (DET-32)
- rollback: git revert
- rules: [DET-32, DET-8]

**Task S1.T3 — Listado + modal ver items**
- source_ref: REQ-02
- agent: developer
- depends_on: S1.T1
- validation: ruta `/finanzas/pagos-oficina`; tabla de pagos + modal de items por pago
- rollback: git revert
- rules: [DET-32]

**Task S1.T4 — Tests + verificacion runtime**
- source_ref: REQ-01, REQ-02, REQ-03
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest payments verde; total = Σ round(pay); aislamiento del enum de 8; listado + modal; tsc/eslint exit 0. Smoke runtime recomendado (vistas DB/capability-gated) — ver DET-36
- rollback: N/A (tests)
- rules: [DET-4, DET-7, DET-13, DET-36]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive + dual-judge DET-35), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado al front sobre stub MSW. No se implementan endpoints backend reales ni el seed RBAC (deuda tecnica documentada).
- `OFFICE_FORMA_PAGO` es un enum separado; el enum de 8 del pago 1-factura no se toca.
- Reusar los patrones del modulo de pagos (DataTable, form, list); no crear lenguaje visual nuevo (DET-32).
- El `total` se calcula como `Σ round(pay)` por documento (redondeo por documento, no al total).

## Dependencies

- Sin dependencia bloqueante para el front (stub MSW). La persistencia real es deuda backend (ver seccion "Deuda tecnica — backend").

## Acceptance checkpoints

- [x] AC-1 (REQ-01): carrito de N docs con total en vivo = Σ round(pay); submit contra stub (test + componente).
- [x] AC-2 (REQ-02): listado de pagos + modal de items por pago (test + componente).
- [x] AC-3 (REQ-03): `OFFICE_FORMA_PAGO` = 8 + Mixto + Anulacion; enum de 8 del pago 1-factura intacto (test de aislamiento).
- [x] AC-4: vitest payments 140 passed, tsc 0, eslint 0.

## Technical reference

- Vistas: `front/jormat-front/src/app/(app)/finanzas/pagos-oficina/` (listado + `/crear`).
- Componentes: `front/jormat-front/src/components/payments/` (carrito, modal de items, form de linea).
- Servicios/stub: `front/jormat-front/src/services/api/payments/` + handlers MSW `/pagos/oficina/*`.
- Enum: `OFFICE_FORMA_PAGO` (8 medios + Mixto + Anulacion), aislado del enum de 8 del pago 1-factura.
- `origen` (DEC-002): el select usa el codigo de origen (4 codigos que valida `origenSchema`), no el catalogo de 6 bodegas, para respetar el contrato del payload.
