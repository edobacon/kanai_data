---
id: SPEC-JOR-131-compras-pagos-ap-importacion
project: jormat-evolution
ticket: JOR-131
status: done
---

# Compras - pagos AP + factura desde importacion

# Compras - pagos AP + factura desde importacion

## Executive summary — lo que estas aprobando

**Que se resuelve**: en el modulo de compras del front nuevo (`front/jormat-front/src/components/compras/detail/`), el detalle de la factura de proveedor exponia los pagos AP (accounts payable) en modo SOLO LECTURA. Este ticket habilita el ciclo interactivo de pagos AP crear/eliminar sobre el stub, espejando el mecanismo ya probado del modulo AR (accounts receivable) de clientes: recalculo del saldo derivado (total - suma de pagos), auto-marca de estado `pagada` cuando el saldo llega a 0, y confirmacion (ConfirmDialog existente) antes de eliminar un pago. RBAC reusa la capability existente `purchases.supplier-invoices:edit` (no se sembraron caps nuevas).

**Lo que queda como DEUDA_TECNICA_CONFIRMAR** (no se invento infraestructura ausente):
- **C-09 factura desde importacion**: el modulo de importaciones NO esta migrado al front nuevo. No hay `services/api/imports`, ni ruta, ni schema. Crear la factura sembrada desde una importacion no es alcanzable hoy sin inventar el modulo entero; se difiere.
- **C-20 columna Import ID**: ligada a C-09. El contrato del listado de facturas de proveedor NO expone `importId`; sin el modulo de importaciones no hay dato que poblar la columna. Se difiere junto con C-09.
- **Ciclo AP real (C-08 backend)**: el crear/eliminar interactivo corre sobre el stub MSW. El ciclo AP real depende del backend de compras (JOR-090, D7/DEC-014); el sign-off del ciclo real queda diferido a ese ticket.

**Por que sobre stub y no bloqueado**: el stub ya modela la factura de proveedor con sus pagos y saldo; el mecanismo del modulo AR de clientes ya esta implementado y probado en el mismo front. Espejarlo es reuse (DET-32) de un patron existente, no construccion de infraestructura nueva. El valor de negocio (UI de pagos AP interactiva, fiel al AR) se entrega hoy; lo que depende de backend/importaciones se marca explicito.

**Riesgos principales y mitigacion**: (a) divergencia del mecanismo AP respecto del AR de clientes → se espeja 1:1 (recalculo de saldo, auto-marca pagada, confirm de borrado) y se audita el reemplazo del camino read-only (DET-40). (b) inventar el modulo de importaciones → NO se hace; C-09/C-20 se difieren con evidencia de ausencia (sin service/ruta/schema). (c) RBAC → se reusa `purchases.supplier-invoices:edit`, sin caps nuevas; JOR-090 podra granularizar cuando exista el ciclo real.

## Purpose

- **Problema**: el detalle de la factura de proveedor mostraba los pagos AP en solo lectura; no habia forma de registrar ni eliminar un pago desde la UI del front nuevo, a diferencia del modulo AR de clientes que ya lo permite.
- **A quien afecta**: usuarios de compras que gestionan pagos a proveedores y esperan paridad con el flujo de cobros a clientes.
- **Contexto de migracion**: parte de la ola 1 de paridad con el legacy (`fix/ola1-paridad-vcp`). La importacion como origen de factura depende de un modulo (`imports`) que aun no fue migrado.

## Requirements

### REQ-01: pagos AP crear/eliminar sobre el stub, espejando el modulo AR
> Que cambia: el bloque de pagos del detalle de factura de proveedor pasa de solo lectura a interactivo (crear pago con forma y monto, eliminar pago con confirmacion), con el saldo recalculado.
> Por que: paridad con el modulo AR de clientes (mismo mecanismo ya probado) y con el legacy; el usuario de compras necesita registrar/deshacer pagos sin salir del detalle.

MUST: el detalle de factura de proveedor MUST permitir crear un pago AP (forma de pago + monto) y eliminarlo. Al crear/eliminar, el saldo derivado MUST recalcularse como `total - suma(pagos)`. Cuando el saldo llega a 0 el estado de la factura MUST auto-marcarse `pagada`. Eliminar un pago MUST requerir confirmacion (ConfirmDialog existente). El acceso MUST estar gateado por la capability existente `purchases.supplier-invoices:edit` (no se crean capabilities nuevas). El mecanismo MUST espejar el del modulo AR de clientes (no divergir en el calculo ni en los estados).

<details>
<summary>Scenarios</summary>

- Scenario (crear pago parcial): GIVEN una factura de proveedor con total 100 y saldo 100 WHEN el usuario crea un pago de 40 THEN el saldo pasa a 60 y el estado NO es `pagada`.
- Scenario (crear pago que salda): GIVEN una factura con saldo 60 WHEN el usuario crea un pago de 60 THEN el saldo pasa a 0 y el estado se auto-marca `pagada`.
- Scenario (eliminar pago con confirmacion): GIVEN una factura `pagada` con saldo 0 WHEN el usuario elimina un pago de 60 THEN se pide confirmacion (ConfirmDialog); al confirmar, el saldo vuelve a 60 y el estado deja de ser `pagada`.
- Scenario (RBAC): GIVEN un usuario sin `purchases.supplier-invoices:edit` WHEN abre el detalle THEN el bloque de pagos AP queda en solo lectura (sin acciones de crear/eliminar).
</details>

> **DEUDA_TECNICA_CONFIRMAR (ciclo AP real)**: el crear/eliminar corre sobre el stub MSW. El ciclo AP real (persistencia backend, efectos contables) depende de JOR-090 (D7/DEC-014); su sign-off queda diferido a ese ticket.

### REQ-02: factura desde importacion (C-09) e Import ID (C-20) = DEUDA_TECNICA_CONFIRMAR
> Que cambia: nada en runtime — se documenta que estos dos casos no son alcanzables hoy y por que.
> Por que: el modulo de importaciones no fue migrado al front nuevo; construir la factura sembrada desde importacion o la columna Import ID exigiria inventar el modulo entero (service, ruta, schema), lo que viola no inventar infraestructura ausente.

MUST: C-09 (crear factura de proveedor sembrada desde una importacion) y C-20 (columna Import ID en el listado/detalle) MUST quedar registrados como DEUDA_TECNICA_CONFIRMAR y NO implementarse en este ticket. La razon MUST constar con evidencia de ausencia: no existe `services/api/imports`, ni ruta de importaciones, ni schema de importacion en el front nuevo; el contrato del listado de facturas de proveedor no expone `importId`.

<details>
<summary>Scenarios</summary>

- Scenario (evidencia de ausencia C-09): GIVEN el front nuevo WHEN se busca el modulo de importaciones (service/ruta/schema) THEN no existe; por lo tanto no se puede sembrar una factura desde importacion sin inventar el modulo → deferido.
- Scenario (evidencia de ausencia C-20): GIVEN el contrato del listado de facturas de proveedor WHEN se inspecciona el shape THEN no expone `importId`; la columna quedaria vacia/artificial → deferido junto con C-09.
</details>

## Tasks

### Session 1 — Pagos AP crear/eliminar (espejo AR) [tier: T2]

**Task S1.T1 — Pagos AP crear/eliminar sobre el stub (mecanismo espejo del AR)**
- source_ref: REQ-01
- agent: developer
- validation: crear pago recalcula saldo (`total - suma pagos`); saldo 0 auto-marca `pagada`; eliminar pago pide confirmacion (ConfirmDialog) y revierte el saldo/estado; acceso gateado por `purchases.supplier-invoices:edit`; vitest compras verde; tsc/eslint exit 0
- rollback: git revert
- rules: [DET-32, DET-40, DET-7]

**Task S1.T2 — Registro de deuda tecnica C-09/C-20 (importacion no migrada)**
- source_ref: REQ-02
- agent: developer
- validation: evidencia de ausencia registrada (sin `services/api/imports`, sin ruta, sin schema; contrato del listado sin `importId`); C-09/C-20 marcados DEUDA_TECNICA_CONFIRMAR; no se implementa runtime
- rollback: N/A (documentacion)
- rules: [DET-4, DET-5]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), suite amplia de compras corrida, decisiones del gate registradas.

## Constraints

- Alcance acotado a `components/compras/detail/` y `services/api/compras/`. No inventar el modulo de importaciones.
- El mecanismo de pagos AP MUST espejar el del modulo AR de clientes (recalculo de saldo, auto-marca pagada, confirm de borrado); no divergir.
- RBAC: reusar `purchases.supplier-invoices:edit`; no sembrar capabilities nuevas (JOR-090 podra granularizar).
- Sobre stub MSW; el ciclo AP real es DEUDA de JOR-090 (D7/DEC-014).

## Dependencies

- **JOR-090** (D7/DEC-014): backend del ciclo AP real; sign-off del ciclo real diferido a ese ticket.
- **Modulo `imports`**: no migrado al front nuevo; bloquea C-09/C-20 (DEUDA_TECNICA_CONFIRMAR).
- **JOR-119** (relacionado): mismo patron de fidelidad legacy en el builder; DEC-7 (identificar por codigo estable) aplica transversal.

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Divergencia del mecanismo AP vs AR de clientes | compras/detail | Espejar 1:1 (recalculo de saldo, auto-marca pagada, confirm de borrado); DET-40 audita el reemplazo del camino read-only |
| Inventar el modulo de importaciones | C-09/C-20 | NO se hace; se difiere con evidencia de ausencia (sin service/ruta/schema, contrato sin importId) |
| RBAC ad-hoc | acceso a pagos AP | Reusar `purchases.supplier-invoices:edit`; sin caps nuevas |
| Regresion en tests de pagos AR al tocar el mecanismo compartido | compras/detail | Suite amplia de compras corrida en el gate; se corrigio una regresion de JOR-124 (`AplicarPagoView.extra`, fecha default) |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): crear pago parcial recalcula saldo (100 → 60) sin marcar `pagada` (test).
- [x] AC-2 (REQ-01): pago que salda lleva el saldo a 0 y auto-marca `pagada` (test).
- [x] AC-3 (REQ-01): eliminar pago pide confirmacion (ConfirmDialog) y revierte saldo/estado (test).
- [x] AC-4 (REQ-01): acceso gateado por `purchases.supplier-invoices:edit` (sin la cap, solo lectura).
- [x] AC-5 (REQ-02): C-09/C-20 registrados DEUDA_TECNICA_CONFIRMAR con evidencia de ausencia del modulo imports.

## Technical reference

- Front nuevo compras: `front/jormat-front/src/components/compras/detail/` (detalle de factura de proveedor), `services/api/compras/`.
- Modulo AR espejado: mecanismo de pagos de clientes (`AplicarPagoView`) — recalculo de saldo, auto-marca pagada, ConfirmDialog de borrado.
- RBAC: capability existente `purchases.supplier-invoices:edit` (no se sembraron caps nuevas).
- Regresion JOR-124 corregida: `AplicarPagoView.extra` (la fecha default de hoy invalidaba el submit del test), commit `12eb160`.
- DEUDA importaciones: ausencia de `services/api/imports`, ruta y schema en el front nuevo; contrato del listado de facturas de proveedor sin `importId`.
