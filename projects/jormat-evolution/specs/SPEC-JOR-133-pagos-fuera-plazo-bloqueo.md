---
id: SPEC-JOR-133-pagos-fuera-plazo-bloqueo
project: jormat-evolution
ticket: JOR-133
status: done
---

# Pagos fuera de plazo + bloqueo por plazo de credito 120d + aviso de saldada

# Pagos fuera de plazo + bloqueo por plazo de credito 120d + aviso de saldada

## Executive summary — lo que estas aprobando

**Que se corrige (P-05)**: se recupera el comportamiento del legacy para facturas fuera de plazo. Se agrega una metrica FIJA de plazo de credito por factura (`creditTermDays = floor((venc - emision) / 86400000)`) y la regla `shouldLockByCreditTerm`, que bloquea al cliente cuando la factura esta vencida, tiene saldo pendiente y su plazo de credito es `>= 120` dias (D4/DEC-013). Ademas un disparador on-demand "Cargar facturas fuera de plazo" que, sobre la pagina ya cargada, marca las filas que califican como `locked` + `Vencida` mediante un overlay client-side y muestra un toast con el conteo.

**Que se corrige (P-07)**: se recupera el aviso "factura saldada" que faltaba cuando el saldo llega a 0. Reconciliado con DEC-LOCAL-01 (ver Decisions): NO se reintroduce el estado 'Cancelada' (pertenece al eje SII); el estado equivalente al saldar es 'Pagado', que el contrato YA deriva (`calcPending` / `deriveStatus`). Solo se recupera el aviso side-effect que faltaba, sin tocar el eje de estados.

**Lo que NO cambia (y por que)**: el calculo y la persistencia reales del bloqueo por plazo de credito son sign-off de backend (JOR-092) y quedan diferidos. Los endpoints `getExpirationInvoices` / `lockedClient` / `setStatusInvoices` y la persistencia real NO existen todavia; por eso el disparador on-demand se implementa como un overlay client-side HONESTO sobre la pagina cargada (un preview), no como una mutacion persistida. Esto queda marcado como DEUDA_TECNICA_CONFIRMAR contra JOR-092.

| Pieza | Alcance | Como |
|-------|---------|------|
| P-05 metrica fija plazo de credito | En scope AHORA | `creditTermDays` puro + `shouldLockByCreditTerm` (vencida + saldo + plazo >= 120), D4/DEC-013 |
| P-05 disparador on-demand | En scope AHORA (overlay preview) | "Cargar facturas fuera de plazo" marca `locked` + `Vencida` en las filas que califican sobre la pagina cargada + toast del conteo |
| P-05 backend | DIFERIDO (JOR-092) | endpoints + persistencia real no existen; overlay = preview honesto. DEUDA_TECNICA_CONFIRMAR |
| P-07 aviso de saldada | En scope AHORA | aviso side-effect al llegar saldo a 0; estado 'Pagado' ya derivado por el contrato |

## Purpose

- **Problema**: el front nuevo de pagos no replica el manejo legacy de facturas fuera de plazo (bloqueo por plazo de credito >= 120d) ni el aviso al saldar una factura. P-05 y P-07 quedaron pendientes de la migracion.
- **A quien afecta**: usuarios que gestionan cobranzas; no ven el bloqueo por mora de plazo de credito ni reciben confirmacion visual al saldar.
- **Sintoma reportado**: facturas vencidas con plazo de credito largo no marcan al cliente como bloqueado; al pagar el total no aparece aviso de saldada.

## Requirements

### REQ-01: bloqueo del cliente por plazo de credito (metrica fija 120d) + disparador on-demand
> Que cambia: se agrega una metrica fija de plazo de credito por factura y la regla que bloquea al cliente cuando esa metrica supera el umbral, mas un disparador on-demand que marca las filas que califican.
> Por que: fidelidad al legacy (D4/DEC-013); el front nuevo no evaluaba el plazo de credito para el bloqueo.

MUST: existe una metrica pura `creditTermDays = floor((fechaVencimiento - fechaEmision) / 86400000)` y una regla `shouldLockByCreditTerm(invoice)` que retorna `true` SOLO si la factura esta vencida Y tiene saldo pendiente Y `creditTermDays >= 120`. El disparador "Cargar facturas fuera de plazo" MUST recorrer las facturas de la pagina cargada y marcar `locked` + `Vencida` en las filas que satisfacen `shouldLockByCreditTerm`, mostrando un toast con el conteo de filas afectadas.

MUST (deuda explicita): el disparador opera como overlay CLIENT-SIDE sobre la pagina cargada (preview), NO persiste ni consulta backend. Los endpoints `getExpirationInvoices` / `lockedClient` / `setStatusInvoices` y la persistencia real son sign-off de JOR-092 y quedan marcados DEUDA_TECNICA_CONFIRMAR. El overlay NO debe presentarse como estado persistido.

<details><summary>Scenarios</summary>

- Scenario: GIVEN una factura vencida con saldo pendiente y `creditTermDays = 130` WHEN se ejecuta "Cargar facturas fuera de plazo" THEN esa fila se marca `locked` + `Vencida` y el toast cuenta +1.
- Scenario: GIVEN una factura vencida con saldo pendiente y `creditTermDays = 90` WHEN se ejecuta el disparador THEN esa fila NO se marca (plazo < 120).
- Scenario: GIVEN una factura vencida con `creditTermDays >= 120` pero saldo 0 WHEN se ejecuta el disparador THEN NO se marca (sin saldo pendiente).
- Scenario (borde 120): GIVEN `creditTermDays == 120` y factura vencida con saldo WHEN se ejecuta el disparador THEN se marca (umbral inclusivo `>=`).
</details>

### REQ-02: aviso "factura saldada" al llegar el saldo a 0 (reconciliado con DEC-LOCAL-01)
> Que cambia: se recupera el aviso side-effect que faltaba cuando el saldo de la factura llega a 0.
> Por que: el legacy avisa al saldar; el front nuevo derivaba el estado pero no emitia el aviso.

MUST: cuando un abono lleva el saldo pendiente de la factura a 0, MUST emitirse el aviso de "factura saldada". NO se reintroduce el estado 'Cancelada' (pertenece al eje SII, DEC-LOCAL-01); el estado equivalente al saldar es 'Pagado', que el contrato YA deriva via `calcPending` / `deriveStatus`. El requerimiento se limita al aviso side-effect; el eje de estados NO se toca.

<details><summary>Scenarios</summary>

- Scenario: GIVEN una factura con saldo pendiente WHEN un abono lleva el saldo a 0 THEN se emite el aviso de saldada Y el estado derivado es 'Pagado'.
- Scenario (abono parcial): GIVEN una factura con saldo pendiente WHEN un abono NO lleva el saldo a 0 THEN NO se emite el aviso de saldada.
- Scenario (no-reintroduccion): GIVEN el saldo llega a 0 THEN el estado NO pasa a 'Cancelada' (ese estado sigue reservado al eje SII).
</details>

## Tasks

### Session 1 — Pagos fuera de plazo + aviso de saldada [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Metrica fija de plazo de credito + regla de bloqueo**
- source_ref: REQ-01
- agent: developer
- validation: `creditTermDays` puro (`floor((venc-emision)/86400000)`); `shouldLockByCreditTerm` true solo con vencida + saldo + `>= 120`; tests de umbral (120 inclusivo, 90 no, saldo 0 no)
- rollback: git revert
- rules: [DET-4, DET-8]

**Task S1.T2 — Disparador on-demand "Cargar facturas fuera de plazo" (overlay preview)**
- source_ref: REQ-01
- agent: developer
- depends_on: S1.T1
- validation: el disparador marca `locked` + `Vencida` en las filas que califican sobre la pagina cargada + toast con el conteo; overlay client-side (sin persistencia); DEUDA_TECNICA_CONFIRMAR backend JOR-092 documentada
- rollback: git revert
- rules: [DET-32, DET-8]

**Task S1.T3 — Aviso de saldada reconciliado con DEC-LOCAL-01**
- source_ref: REQ-02
- agent: developer
- depends_on: S1.T1
- validation: aviso al llegar el saldo a 0; sin abono total no hay aviso; estado 'Pagado' ya derivado (no 'Cancelada'); `calcPending`/`deriveStatus` intactos
- rollback: git revert
- rules: [DET-5, DET-40]

**Task S1.T4 — Tests + verificacion**
- source_ref: REQ-01, REQ-02
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest payments verde; tsc/eslint exit 0; DET-40 (ajuste de `AplicarPagoView.extra.test.tsx` a abono parcial conservando su intencion)
- rollback: N/A (tests)
- rules: [DET-4, DET-7, DET-13, DET-40]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a `components/payments/list`, `components/payments/detail`, `lib/payments/calc-balance.ts` y `services/api/payments`. No tocar backend real.
- El bloqueo por plazo de credito y el disparador operan como overlay/preview client-side; la persistencia real es sign-off de JOR-092 (DEUDA_TECNICA_CONFIRMAR).
- No reintroducir el estado 'Cancelada' (DEC-LOCAL-01); el estado al saldar es 'Pagado', ya derivado.

## Dependencies

- **JOR-092** (backend, diferido): endpoints `getExpirationInvoices` / `lockedClient` / `setStatusInvoices` y persistencia real del bloqueo. Sin ellos el disparador es un preview honesto.

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Metrica fija `creditTermDays` + `shouldLockByCreditTerm` (>= 120) | Fidelidad al legacy (D4/DEC-013): bloqueo por plazo de credito, umbral 120 inclusivo, requiere vencida + saldo |
| 2 | Disparador on-demand como overlay client-side (preview), NO persistido | endpoints y persistencia no existen (backend JOR-092); overlay honesto sobre la pagina cargada, marcado DEUDA_TECNICA_CONFIRMAR |
| 3 | P-07 reconciliado con DEC-LOCAL-01: no reintroducir 'Cancelada' | 'Cancelada' pertenece al eje SII; el estado al saldar es 'Pagado', ya derivado por `calcPending`/`deriveStatus`. Solo se recupera el aviso side-effect |
| 4 | Ajustar `AplicarPagoView.extra.test.tsx` a abono parcial (DET-40) | El cambio de aviso de P-07 altera el comportamiento esperado del test; se conserva su intencion original migrando el caso a un abono parcial |

## Acceptance checkpoints

- [x] AC-1 (REQ-01): factura vencida + saldo + `creditTermDays >= 120` → disparador la marca `locked` + `Vencida` + toast (tests).
- [x] AC-2 (REQ-01): plazo < 120 o saldo 0 → no se marca (tests de umbral).
- [x] AC-3 (REQ-02): abono que lleva el saldo a 0 → aviso de saldada + estado 'Pagado' (no 'Cancelada') (tests).
- [x] AC-4 (REQ-02): abono parcial → sin aviso (test ajustado, DET-40).
