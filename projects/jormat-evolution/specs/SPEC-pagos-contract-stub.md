---
id: SPEC-pagos-contract-stub
project: jormat-evolution
ticket: JOR-113
status: done
---

# Pagos: congelar contrato + extender stub (sin BD)

# Pagos: congelar contrato + extender stub (sin BD)

## Executive summary

Bloque P0 del PLAN: alinear el contrato/stub de cobranza al canonico legacy para desbloquear el front
(JOR-093), sin BD. Tres cambios fieles al legacy: forma de pago = los 8 medios del select legacy,
observacion OBLIGATORIA al aplicar un pago, y shape del bloqueo por mora (`locked`) del cliente. Saldo y
estado ya son derivados (pending = total - Σ pagos; Pagado/Pendiente/Vencida). Sin tablas; persistencia y
calculo real del bloqueo = JOR-092.

## Requirements

### REQ-01 — Forma de pago: 8 medios canonicos (legacy)
> Que cambia: el enum de formas de pago pasa de 5 a los 8 del select legacy.

MUST (DEC-011, verificado en `payments-view.html:184-191`): `FORMA_PAGO` = Efectivo, Visa Credito, Debito,
Transferencia, Mercado Pago, WebPay, Cheque, Nota credito. Paridad front (`lib/schemas/payments.ts`) ↔
backend. `Sin pago` NO es un medio: es un pseudo-valor solo-UI del filtro de listado (factura sin pago
aplicado); se mantiene documentado como tal, fuera del enum de medios seleccionables al aplicar.

### REQ-02 — Observacion OBLIGATORIA al aplicar pago (B4)
> Que cambia: aplicar un pago exige observacion.

MUST (DEC-012 accepted = opcion B, fiel al legacy `<textarea ng-model="observation" required>`):
`observacion` requerida en `apply-payment-input` (backend) y en el schema del front. `nroDoc` pasa a
opcional (deja de ser el obligatorio). Revierte la inversion del codigo nuevo.

### REQ-03 — Bloqueo por mora: shape `locked` (B5)
> Que cambia: la cobranza expone si el cliente esta bloqueado.

MUST (DEC-013): exponer en el shape de cobranza un flag `locked` (bloqueo del cliente por mora). Metrica
canonica = plazo de credito (`vencimiento - fecha_factura >= 120`, gated por factura vencida), disparador
on-demand. En el stub el flag se expone (el front solo lo renderiza / gatea); el CALCULO real y el
disparador viven en JOR-092. Marca `DEUDA_TECNICA[pagos]`.

## Tasks (Session 1, tier T2)
- S1.T1 — FORMA_PAGO a los 8 medios legacy (front + back, paridad); `Sin pago` documentado como pseudo-valor de filtro (REQ-01).
- S1.T2 — observacion obligatoria + nroDoc opcional en apply-payment (backend + front schema) (REQ-02).
- S1.T3 — shape `locked` del cliente en la cobranza (stub) + `DEUDA_TECNICA[pagos]`; calculo real = JOR-092 (REQ-03).
- S1.T4 — tests (8 medios paridad, observacion requerida, locked en el shape) + verificacion (jest payments + tsc).
- S1.GATE.

## No-goals
- Tablas de pagos + aplicaciones + validacion de saldo server-side + calculo/disparador real del bloqueo 120d (JOR-092).
- Front de cobranza (bloqueo en UI, resaltado Vencida, multi-documento) = JOR-093.
