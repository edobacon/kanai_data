---
id: SPEC-JOR-125-builder-ventas-pagos-despacho
project: jormat-evolution
ticket: JOR-125
status: done
---

# Builder ventas: pagos y despacho

# Builder ventas: pagos y despacho

## Executive summary — lo que estas aprobando

**Que se construye**: cuatro piezas del builder de ventas (`TransactionBuilder` + `PaymentCard`) para alcanzar paridad con el legacy en pagos y despacho:

1. **10 medios de pago con visibilidad condicional (V-09)**: un nuevo enum `MEDIO_PAGO` de 10 valores agrupados. La condicion de pago congelada `formaPago` (DEC-011) NO se toca: se DERIVA del medio elegido. El bloqueo del cliente oculta cheque/aplazado/credito; el grupo credito solo aparece si el cliente tiene `isCredit`.
2. **Vencimiento persistido (V-11)**: `computeVencimientoIso` (30/60 dias) se escribe en el campo `vencimiento` del payload (antes solo display).
3. **Nota de pedido (V-13)**: `orderNote` requerido y en el payload.
4. **Transporte con despacho (V-14)**: selector de transportista visible cuando el despacho esta activo, sobre un catalogo stub nuevo (`transportistas`: schema, tipo, service, hook, MSW).

**Decision de diseño clave (mediana)**: un unico selector de 10 medios que DERIVA la condicion congelada `formaPago`, en vez de dos selects separados (medio + condicion). Es fiel al legacy y respeta el DTO congelado por DEC-011: `formaPago` se mantiene como campo de salida, computado desde el medio.

**Lo que NO cambia**: el shape del DTO congelado (DEC-011). Los medios/vencimiento/orderNote/transporte viajan HOY sobre el stub; el DTO real aun no los declara (deuda tecnica hacia backend JOR-086).

**DEUDA_TECNICA_CONFIRMAR (backend JOR-086)**: catalogo real de transportistas; flags `bloqueado` / `isCredit` del cliente (hoy `undefined` → bloqueo inactivo, credito oculto); campos DTO `medioPago` / `vencimiento` / `orderNote` / `transporte` (viajan sobre el stub; el DTO aun no los declara). No se inventaron datos: cuando el backend no expone la señal, el comportamiento degrada de forma segura (bloqueo inactivo, credito oculto).

## Purpose

- **Problema**: el builder de ventas del front nuevo no replica los pagos ni el despacho del legacy: falta el set de 10 medios con su visibilidad condicional, el vencimiento no se persiste (solo se mostraba), no existe la Nota de pedido, ni el selector de transporte con despacho.
- **A quien afecta**: usuarios que emiten documentos de venta con distintos medios de pago, credito con vencimiento, y despacho con transportista.
- **Referencia canonica**: el front legacy de ventas (medios de pago agrupados, condicion derivada, vencimiento a 30/60 dias, nota de pedido y transporte con despacho).

## Requirements

### REQ-01: 10 medios de pago con visibilidad condicional; la condicion se DERIVA del medio
> Que cambia: se reemplaza la seleccion de medio actual por un selector de 10 medios (`MEDIO_PAGO`), agrupados, con visibilidad condicional. La condicion congelada `formaPago` (DEC-011) no se elige aparte: se deriva del medio.
> Por que: paridad con el legacy sin romper el DTO congelado. Un solo selector es fiel al legacy y evita el desalineo entre medio y condicion.

MUST: el selector MUST ofrecer los 10 medios del enum `MEDIO_PAGO` agrupados. La condicion `formaPago` (DEC-011, congelada) MUST derivarse del medio elegido, sin exponer un segundo select ni modificar el shape del DTO. Cuando el cliente esta bloqueado (`bloqueado`), los medios cheque / aplazado / credito MUST ocultarse. El grupo credito MUST aparecer solo si el cliente tiene `isCredit`.

<details><summary>Scenarios</summary>

- GIVEN un cliente sin bloqueo y sin `isCredit` WHEN se abre el selector de medios THEN se ven los medios base agrupados, sin el grupo credito.
- GIVEN un cliente `bloqueado` WHEN se abre el selector THEN cheque / aplazado / credito NO aparecen.
- GIVEN un cliente con `isCredit` WHEN se abre el selector THEN el grupo credito aparece.
- GIVEN un medio elegido WHEN se arma el payload THEN `formaPago` (congelada) se deriva del medio, sin campo extra en el DTO.
</details>

### REQ-02: el vencimiento de credito se PERSISTE en el payload
> Que cambia: `computeVencimientoIso` (30/60 dias) deja de ser solo display y se escribe en el campo `vencimiento` del payload.
> Por que: el legacy persiste el vencimiento; hoy se calculaba y mostraba pero no viajaba.

MUST: cuando el medio implica credito con plazo, el `vencimiento` computado por `computeVencimientoIso` (30/60 dias) MUST escribirse en el campo `vencimiento` del payload.

<details><summary>Scenarios</summary>

- GIVEN un medio de credito a 30 dias WHEN se arma el payload THEN `vencimiento` = fecha base + 30 dias (ISO).
- GIVEN un medio de credito a 60 dias WHEN se arma el payload THEN `vencimiento` = fecha base + 60 dias (ISO).
</details>

### REQ-03: campo Nota de pedido requerido y en el payload
> Que cambia: se agrega `orderNote` como campo requerido y se incluye en el payload.
> Por que: paridad con el legacy (nota de pedido obligatoria).

MUST: `orderNote` MUST ser un campo requerido del builder (issue de validacion si falta) y MUST incluirse en el payload.

<details><summary>Scenarios</summary>

- GIVEN el builder sin Nota de pedido WHEN se intenta emitir THEN el campo marca issue de requerido.
- GIVEN el builder con Nota de pedido WHEN se arma el payload THEN `orderNote` viaja en el payload.
</details>

### REQ-04: selector de transporte visible cuando hay despacho
> Que cambia: con el despacho activo aparece un selector de transportista, sobre un catalogo stub nuevo (`transportistas`).
> Por que: paridad con el legacy (transporte con despacho).

MUST: cuando el despacho esta activo, el selector de transportista MUST ser visible y poblarse desde el catalogo `transportistas` (stub: schema + tipo + service + hook + MSW). El transportista elegido MUST viajar en el payload (campo `transporte`, sobre stub).

<details><summary>Scenarios</summary>

- GIVEN el despacho inactivo WHEN se renderiza el builder THEN el selector de transportista NO se muestra.
- GIVEN el despacho activo WHEN se renderiza el builder THEN el selector de transportista se muestra y ofrece el catalogo `transportistas`.
</details>

### REQ-REGRESSION-01: el resto del builder no cambia
MUST: totales, tipos DTE, clonado (prefill), stock warning (JOR-119), gate de cliente bloqueado y demas comportamiento del builder MUST permanecer sin cambios. El shape del DTO congelado (DEC-011) MUST preservarse.

## Tasks

### Session 1 — Builder ventas: pagos y despacho [tipo: ⚑ fuerte] [tier: T3]

**Task S1.T1 — Enum de 10 medios + campos DTO**
- source_ref: REQ-01, REQ-02, REQ-03, REQ-04
- agent: developer
- validation: enum `MEDIO_PAGO` (10 valores agrupados) en `lib/schemas/ventas.ts`; campos DTO `medioPago` / `vencimiento` / `orderNote` / `transporte` (sobre stub); `formaPago` congelada derivada del medio, shape del DTO congelado preservado; tsc/eslint exit 0
- rollback: git revert
- rules: [DET-4, DET-32]

**Task S1.T2 — PaymentCard condicional + vencimiento + transporte**
- source_ref: REQ-01, REQ-02, REQ-04
- agent: developer
- depends_on: S1.T1
- validation: selector de 10 medios agrupados con visibilidad condicional (bloqueado oculta cheque/aplazado/credito; grupo credito solo si `isCredit`); `computeVencimientoIso` (30/60d) escrito en `vencimiento`; selector de transporte visible con despacho activo sobre catalogo stub `transportistas` (schema/tipo/service/hook/MSW); reusa PaymentCard/selects/catalogo existentes
- rollback: git revert
- rules: [DET-5, DET-8, DET-32]

**Task S1.T3 — Nota de pedido (orderNote)**
- source_ref: REQ-03
- agent: developer
- depends_on: S1.T1
- validation: `orderNote` requerido (issue de validacion) + wiring al payload
- rollback: git revert
- rules: [DET-4]

**Task S1.T4 — Tests + stories**
- source_ref: REQ-01, REQ-02, REQ-03, REQ-04, REQ-REGRESSION-01
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest ventas builder verde; PaymentCard 23/23; schemas/ventas 24/24; gaps 12/12; tsc 0; eslint 0; stories del PaymentCard condicional
- rollback: N/A (tests)
- rules: [DET-7, DET-13, DET-23]

**S1.GATE**: quality review (DET-23, tier T3 → exhaustive), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a `components/ventas/builder/PaymentCard/`, `components/ventas/builder/TransactionBuilder/` y `lib/schemas/ventas.ts` (+ catalogo stub `transportistas`).
- El DTO congelado (DEC-011) NO se modifica: `formaPago` se DERIVA del medio, no se elige aparte.
- Reusar PaymentCard / selects / catalogo existentes (DET-32); el selector de transporte reusa el patron de select. No crear componente visual nuevo.
- No inventar datos del backend: cuando la señal no existe (flags del cliente, catalogo real), degradar de forma segura.

## Dependencies

- **JOR-122** (despacho): serializa antes de este ticket; el transporte necesita el stub de transportistas coordinado.
- **backend JOR-086** (DEUDA_TECNICA_CONFIRMAR): catalogo real de transportistas, flags `bloqueado` / `isCredit`, campos DTO `medioPago` / `vencimiento` / `orderNote` / `transporte`.

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | Un unico selector de 10 medios que DERIVA la condicion congelada `formaPago` (DEC-011), en vez de dos selects (medio + condicion) | Fiel al legacy y respeta el DTO congelado: `formaPago` se computa desde el medio, sin campo extra ni riesgo de desalineo medio↔condicion |
| 2 | Vencimiento persistido en el campo `vencimiento` del payload (30/60d), no solo display | El legacy persiste el vencimiento; el display sin persistencia perdia el dato al emitir |
| 3 | Transporte sobre catalogo stub `transportistas` (schema/tipo/service/hook/MSW); flags del cliente y campos DTO como DEUDA_TECNICA_CONFIRMAR (backend JOR-086) | El backend aun no expone catalogo ni flags; se construye el contrato front sobre stub y se degrada seguro sin inventar datos |

## Acceptance checkpoints

- [ ] AC-1 (REQ-01): selector con 10 medios agrupados; cliente bloqueado oculta cheque/aplazado/credito; grupo credito solo con `isCredit`; `formaPago` derivada del medio.
- [ ] AC-2 (REQ-02): credito 30/60d → `vencimiento` ISO en el payload.
- [ ] AC-3 (REQ-03): Nota de pedido requerida (issue si falta) + en el payload.
- [ ] AC-4 (REQ-04): despacho activo → selector de transporte visible sobre catalogo stub.
- [ ] AC-5 (REQ-REGRESSION-01): totales, tipos DTE, clonado, stock warning y DTO congelado sin cambios.

## Technical reference

- Front nuevo: `front/jormat-front/src/components/ventas/builder/PaymentCard/`, `front/jormat-front/src/components/ventas/builder/TransactionBuilder/`, `front/jormat-front/src/lib/schemas/ventas.ts`.
- Catalogo stub nuevo: `transportistas` (schema + tipo + service + hook + MSW handler).
- DTO congelado: DEC-011 (`formaPago` como condicion de pago; se deriva del medio).
- Commits: 96a98ae (transportistas stub), 7150f2a (enum 10 medios + campos DTO), a6d15e5 (PaymentCard condicional + vencimiento + transporte), 1bab1c9 (N.P + wiring), 5b2eae2 (tests), en `fix/ola1-paridad-vcp`.
