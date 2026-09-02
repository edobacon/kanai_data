---
id: SPEC-pagos-cobranza-gaps
project: jormat-evolution
ticket: JOR-093
status: done
---

# Pagos: cerrar gaps de cobranza (FE, sobre stub)

# Pagos: cerrar gaps de cobranza (FE, sobre stub)

## Executive summary

Cerrar los gaps del front de cobranza consumiendo el contrato alineado por JOR-113: filtro de forma de
pago con los 8 medios + "Sin pago" (COBRANZA_FORMA_PAGO), render del bloqueo por mora del cliente (flag
`locked`), y verificacion del resaltado "Vencida" y la observacion obligatoria (ya en contrato). Se evalua
el pago multi-documento (office-payments). Front-sobre-stub, sin BD.

## Requirements

### REQ-01 — Filtro de forma de pago (8 medios + Sin pago)
MUST: el filtro de `PagosClientesListView` usa `COBRANZA_FORMA_PAGO` (los 8 medios canonicos + "Sin pago"
como pseudo-valor de filtro), no `FORMA_PAGO` (que ya no incluye "Sin pago"). Los chips/labels se alinean.

### REQ-02 — Render del bloqueo por mora (locked)
MUST: cuando el cliente esta `locked` (bloqueo por mora, JOR-113/DEC-013), mostrar un indicador claro
(badge/banner "Cliente bloqueado") en la fila del listado y/o en el detalle de cobranza. El calculo real
(plazo credito >= 120, on-demand) es JOR-092; aca solo se renderiza el flag del shape.

### REQ-03 — Vencida + observacion obligatoria (verificar/pulir)
MUST: confirmar el resaltado "Vencida" (badge estado ya existe) y que el form de aplicar pago exige
observacion (JOR-113 lo marco required). Pulir si falta consistencia (chip/badge).

### REQ-04 — Pago multi-documento (evaluar)
SHOULD: evaluar el pago multi-documento del legacy (office-payments: aplicar un pago a varias facturas).
Si excede el alcance FE-sobre-stub (requiere endpoint/flujo nuevo), documentarlo como follow-up y NO
implementarlo a ciegas.

## Tasks (Session 1, tier T2)
- S1.T1 — filtro forma de pago usa COBRANZA_FORMA_PAGO (8 + Sin pago) en el listado (REQ-01).
- S1.T2 — render del flag `locked` (badge/banner "Cliente bloqueado") en fila/detalle (REQ-02).
- S1.T3 — verificar/pulir Vencida + observacion obligatoria en la UI (REQ-03).
- S1.T4 — evaluar multi-documento: documentar veredicto (implementar minimo vs follow-up) (REQ-04).
- S1.T5 — tests + verificacion + stories.
- S1.GATE.

## No-goals
- Calculo real del bloqueo 120d + validacion de saldo server-side + persistencia (JOR-092). Cambios de contrato (JOR-113 cerrado).
