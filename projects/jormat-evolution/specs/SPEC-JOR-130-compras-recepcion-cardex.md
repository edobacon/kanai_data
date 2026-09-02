---
id: SPEC-JOR-130-compras-recepcion-cardex
project: jormat-evolution
ticket: JOR-130
status: done
---

# Compras - recepcion/ingreso a inventario + cardex al facturar

# Compras - recepcion/ingreso a inventario + cardex al facturar

## Executive summary — lo que estas aprobando

**Que se recupera**: dos capacidades del legacy de compras que el front nuevo no tenia cableadas.

1. **Recepcion / ingreso a stock (C-06)**: la factura de proveedor debe poder "recepcionarse" para ingresar sus items al inventario. Se implementa el **mecanismo FE completo**: la accion de fila "Ingreso a stock" (oculta en borrador, gateada por RBAC), el service `recepcionarFacturaProveedor` (PUT `/compras/facturas-proveedor/:id/items-entry`), el hook `useRecepcionarFacturaProveedor`, y el ack del stub MSW. El **ingreso real a inventario** (mover existencias, cantidades/stock, estado de recepcion persistido) es **DEUDA_TECNICA_CONFIRMAR de backend (JOR-090)**: el FE dispara la accion pero el efecto sobre el stock no se inventa desde el cliente.

2. **Cardex / historial al facturar (C-07)**: al emitir la factura de proveedor el legacy registra el movimiento de inventario que alimenta el cardex/historial del item. Esto es **mayormente DEUDA de backend (JOR-090)**: `getHistoric`/`historicalItems` exige stock real, que solo el backend produce. Se deja anotado en `issueFacturaProveedor` y en el `onSubmit` del builder de compras, **sin adjuntar datos de stock** desde el FE.

**Lo que NO se hace en este ticket**: no se simula ni se inventa el efecto de inventario (existencias, cardex) en el cliente. El FE deja el flujo listo y marca el punto exacto donde el backend (JOR-090) debe cerrar el ciclo. Esto evita una fidelidad falsa que ocultaria la deuda real.

## Purpose

- **Problema**: el front nuevo de compras no tenia forma de recepcionar una factura de proveedor (ingresar sus items a stock) ni disparaba el registro de cardex al facturar; el legacy si lo hace. Ambas capacidades dependen de que el backend produzca el efecto de inventario real.
- **A quien afecta**: usuarios de compras que necesitan reflejar la entrada de mercaderia al inventario y consultar el historial/cardex del item.
- **Sintoma reportado**: tras crear/emitir una factura de proveedor no habia accion de recepcion ni movimiento de inventario; el cardex del item no reflejaba la compra.

## Requirements

### REQ-01: mecanismo de recepcion / ingreso a stock cableado en el FE (C-06)
> Que cambia: la factura de proveedor gana una accion "Ingreso a stock" que dispara la recepcion; se agrega el service, el hook y el ack del stub.
> Por que: el legacy permite recepcionar la factura para ingresar sus items al inventario; el front nuevo no tenia el flujo.

MUST: la accion de fila "Ingreso a stock" MUST estar disponible sobre facturas de proveedor NO en borrador (oculta mientras el documento este en borrador) y MUST estar gateada por RBAC. La accion MUST invocar el service `recepcionarFacturaProveedor` (PUT `/compras/facturas-proveedor/:id/items-entry`) a traves del hook `useRecepcionarFacturaProveedor`. El stub MSW MUST responder un ack de la operacion **sin mover existencias**.

MUST (DEUDA): el **ingreso real a inventario** (movimiento de existencias, cantidades/stock, estado de recepcion persistido) NO se implementa en el FE; queda marcado como **DEUDA_TECNICA_CONFIRMAR de backend (JOR-090)**. El FE NO inventa stock ni simula el efecto de inventario.

- Scenario (borrador): GIVEN una factura de proveedor en estado borrador WHEN se abre el menu de acciones de fila THEN la accion "Ingreso a stock" NO aparece.
- Scenario (no borrador + permiso): GIVEN una factura de proveedor NO en borrador y un usuario con la capability requerida WHEN dispara "Ingreso a stock" THEN se invoca `recepcionarFacturaProveedor` (PUT `:id/items-entry`) y el stub responde ack (sin mover existencias).
- Scenario (sin permiso): GIVEN un usuario sin la capability WHEN evalua la fila THEN la accion "Ingreso a stock" queda gateada (no disponible).

### REQ-02: registro de cardex al facturar - deuda de backend anotada (C-07)
> Que cambia: se marca el punto donde el registro de cardex/historial debe dispararse al emitir la factura de proveedor.
> Por que: el legacy registra el movimiento de inventario al facturar; ese movimiento alimenta el cardex del item.

MUST: el registro de cardex/historial al emitir la factura de proveedor MUST quedar anotado como **DEUDA_TECNICA_CONFIRMAR de backend (JOR-090)** en `issueFacturaProveedor` y en el `onSubmit` del builder de compras. El FE NO adjunta datos de stock al emitir: `getHistoric`/`historicalItems` exigen stock real que solo el backend produce.

- Scenario: GIVEN una factura de proveedor emitida desde el builder WHEN se completa el `onSubmit` THEN el punto de registro de cardex queda anotado como deuda backend (JOR-090), sin adjuntar datos de stock desde el cliente.

## Fix scope

### Antes (comportamiento actual)
- El front nuevo de compras no exponia accion de recepcion; una factura de proveedor no podia ingresarse a stock.
- Al emitir no habia registro de cardex/historial; el service `issueFacturaProveedor` no anotaba el punto de movimiento de inventario.

### Despues (comportamiento esperado)
- La factura de proveedor NO en borrador expone "Ingreso a stock" (gateada por RBAC), que dispara `recepcionarFacturaProveedor` (PUT `:id/items-entry`) via `useRecepcionarFacturaProveedor`; el stub ack sin mover existencias.
- El punto de registro de cardex al facturar queda anotado como deuda backend (JOR-090) en `issueFacturaProveedor` y en el `onSubmit` del builder de compras, sin adjuntar datos de stock.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `.../services/api/compras/facturas-proveedor.ts` | `recepcionarFacturaProveedor` (PUT `:id/items-entry`); anotacion de deuda cardex en `issueFacturaProveedor` | Contrato del service de compras |
| `.../hooks/` compras | `useRecepcionarFacturaProveedor` | Hook nuevo aislado |
| `.../components/compras/` (list/detail + builder) | Accion de fila "Ingreso a stock" (oculta en borrador + gateada); anotacion de deuda en el `onSubmit` del builder | Reusa la infra de acciones de fila existente (DataTable/menu) |
| Stub MSW compras | Ack de `:id/items-entry` sin mover existencias | Fixture del stub |
| Tests co-locados (`*.test.ts(x)`) | Cobertura del service/hook/accion (+8 en suite de compras) | Cobertura |

## Tasks

### Session 1 — Recepcion (mecanismo FE) + cardex (deuda backend) [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Recepcion / ingreso a stock: mecanismo FE (accion + service + hook + ack MSW)**
- source_ref: REQ-01
- agent: developer
- validation: la accion "Ingreso a stock" aparece solo en facturas NO borrador y gateada por RBAC; dispara `recepcionarFacturaProveedor` (PUT `:id/items-entry`) via `useRecepcionarFacturaProveedor`; el stub responde ack sin mover existencias; el FE NO inventa stock (deuda backend JOR-090 marcada)
- rollback: git revert
- rules: [DET-32, DET-40]

**Task S1.T2 — Cardex al facturar: anotar deuda backend + tests**
- source_ref: REQ-02
- agent: developer
- depends_on: S1.T1
- validation: el punto de registro de cardex queda anotado como DEUDA_TECNICA_CONFIRMAR backend (JOR-090) en `issueFacturaProveedor` y en el `onSubmit` del builder, sin adjuntar datos de stock; vitest compras verde (+8); tsc/eslint exit 0
- rollback: git revert
- rules: [DET-4, DET-7, DET-13]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive + dual-judge DET-35), self-report verificado (DET-33), decisions del gate registradas.

## Deuda tecnica (sign-off backend JOR-090)

El FE deja cableado el flujo, pero el efecto de inventario real es responsabilidad de backend. Se registra explicitamente para no ocultar la deuda tras una fidelidad falsa:

| Capability | Que hace el FE (este ticket) | Que falta (DEUDA backend JOR-090) |
|-----------|------------------------------|-----------------------------------|
| Recepcion / ingreso a stock (C-06) | Accion "Ingreso a stock" + `recepcionarFacturaProveedor` PUT `:id/items-entry` + hook + ack MSW (sin mover existencias) | Ingreso real a inventario: movimiento de existencias, cantidades/stock, estado de recepcion persistido |
| Cardex al facturar (C-07) | Punto de registro anotado en `issueFacturaProveedor` y en el `onSubmit` del builder, sin adjuntar datos de stock | Efecto de inventario que dispara el backend al emitir; `getHistoric`/`historicalItems` exigen stock real |

## Constraints

- Alcance acotado al FE de compras (`components/compras/`, `services/api/compras/facturas-proveedor.ts`, hooks). No tocar backend.
- NO inventar ni simular el efecto de inventario (existencias, cardex) desde el cliente. El stub ack sin mover existencias; el registro de cardex queda como deuda backend anotada.
- Reusar la infra de acciones de fila existente (DataTable/menu); no crear componente nuevo (DET-32).

## Dependencies

- **JOR-090** (backend): sign-off del ingreso real a inventario y del registro de cardex. DEUDA_TECNICA_CONFIRMAR diferida; no bloquea el mecanismo FE.
- **JOR-129**: serializado antes (ver ticket).

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Recepcion: cablear el mecanismo FE ahora, dejar el ingreso real como deuda backend (JOR-090) | El FE puede exponer la accion + service + hook + ack sin backend; inventar el efecto de inventario en el cliente seria fidelidad falsa que oculta la deuda |
| 2 | Cardex: dejar como deuda backend anotada, sin adjuntar datos de stock al emitir | `getHistoric`/`historicalItems` exigen stock real que solo el backend produce; adjuntar datos falsos desde el FE seria enganoso |
| 3 | Reusar la infra de acciones de fila existente (DataTable/menu) para "Ingreso a stock" | DET-32 reuse; no se justifica un componente nuevo |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): "Ingreso a stock" oculta en borrador, gateada por RBAC, dispara `recepcionarFacturaProveedor` (PUT `:id/items-entry`); stub ack sin mover existencias (test).
- [x] AC-2 (REQ-01 deuda): el FE NO inventa stock; ingreso real marcado como deuda backend JOR-090 (anotacion + review).
- [x] AC-3 (REQ-02): registro de cardex anotado como deuda backend en `issueFacturaProveedor` y `onSubmit` del builder, sin adjuntar datos de stock (review).
- [x] AC-4 (regression): vitest compras 116 passed | 4 skipped (+8), tsc 0, eslint 0.

## Technical reference

- Service: `.../services/api/compras/facturas-proveedor.ts` (`recepcionarFacturaProveedor` PUT `/compras/facturas-proveedor/:id/items-entry`; `issueFacturaProveedor` con anotacion de deuda cardex).
- Hook: `useRecepcionarFacturaProveedor`.
- Accion de fila "Ingreso a stock": oculta en borrador + gateada por RBAC (reusa DataTable/menu).
- Stub MSW: ack de `:id/items-entry` sin mover existencias.
- Deuda backend: JOR-090 (ingreso real a inventario + registro de cardex; `getHistoric`/`historicalItems` exigen stock real).
- Commits: d5a201d (recepcion FE), 7bcdb09 (test), 9ad132a (cardex DEUDA docs) en `fix/ola1-paridad-vcp`.
