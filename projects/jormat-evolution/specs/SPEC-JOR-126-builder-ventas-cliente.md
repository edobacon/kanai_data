---
id: SPEC-JOR-126-builder-ventas-cliente
project: jormat-evolution
ticket: JOR-126
status: done
---

# Builder ventas: cliente (persistir direccion + notificacion + wire del gate bloqueado)

# Builder ventas: cliente (persistir direccion + notificacion + wire del gate bloqueado)

## Executive summary — lo que estas aprobando

**Que se corrige** en el bloque de cliente del builder de ventas (`CustomerCard` + `TransactionBuilder`), en tres piezas:

1. **Persistir direccion (V-07)**: hoy "Actualizar direccion" NO persiste; la accion se comporta como solo-lectura. Se invierte: ahora hace `PATCH /customers/:id` (endpoint REAL de JOR-089, SIN deuda tecnica) para persistir `address` + `city` al cliente. `address`/`city` pasan a ser editables en `CustomerCard`. Al invertir el comportamiento se audita el camino viejo (DET-40): el refresh de datos del cliente no se pierde, porque re-seleccionar el cliente repuebla la card desde el backend.

2. **Notificacion proactiva al seleccionar cliente (V-10)**: al elegir un cliente se evalua si tiene pendientes (facturas, notas, cheques) y, de haberlos, se abre `CustomerNotificationDialog` (via hook `useCustomerNotification`). Los **conteos** y los **flags** `bloqueado` / `isCredit` son `DEUDA_TECNICA_CONFIRMAR`: dependen de backend (JOR-092/113) que hoy no expone endpoint de notificacion. El mecanismo queda cableado sobre un stub MSW; sin dato real el fallback es seguro (no se muestra aviso / gate inactivo).

3. **Wire del gate bloqueado**: el gate de cliente bloqueado se cablea desde el dato de seleccion del cliente (merge no destructivo), listo para activarse cuando el backend provea el flag `bloqueado` real.

**Lo que NO cambia**: el resto del builder de ventas (totales, tipos DTE, lineas, emision). La notificacion y el gate no bloquean el flujo mientras el backend no provea los datos reales (fallback seguro).

**Alcance de las tres piezas**:

| Pieza | Alcance | Como |
|-------|---------|------|
| R1 persistir direccion | En scope AHORA (endpoint real, sin deuda) | `PATCH /customers/:id` (JOR-089). `address`/`city` editables en `CustomerCard`; invierte solo-lectura (DET-40 auditado) |
| R2 notificacion al seleccionar | Mecanismo AHORA; datos = deuda | `CustomerNotificationDialog` + `useCustomerNotification`; stub MSW hasta backend JOR-092/113. Fallback seguro sin data |
| R3 wire del gate bloqueado | Cableado AHORA; activo cuando llegue el flag | Merge no destructivo del dato de seleccion; gate inactivo sin flag real |

**Riesgos principales y mitigacion**: (a) invertir "Actualizar direccion" de solo-lectura a persistir puede perder el refresh del camino viejo → DET-40 auditoria 1:1: el refresh se conserva re-seleccionando el cliente (repuebla desde backend). (b) los conteos/flags de notificacion no tienen backend → se marca `DEUDA_TECNICA_CONFIRMAR`, stub MSW, fallback sin aviso (no se muestra estado falso). (c) el gate bloqueado no debe activarse con dato ausente → merge no destructivo, gate inactivo hasta que el flag exista.

## Purpose

- **Problema**: el bloque de cliente del builder de ventas no alcanza la paridad con el legacy: "Actualizar direccion" no persiste, no hay aviso del estado del cliente al seleccionarlo, y el gate de cliente bloqueado no esta cableado al dato de seleccion.
- **A quien afecta**: usuarios que emiten documentos de venta y necesitan mantener la direccion del cliente al dia y conocer su estado (pendientes, bloqueo por mora) antes de facturar.
- **Sintoma reportado**: "Actualizar direccion" no guarda cambios; al seleccionar un cliente con pendientes no se avisa nada.

## Requirements

### R1: "Actualizar direccion" persiste address + city al cliente via PATCH real
> Que cambia: la accion deja de ser solo-lectura y persiste `address` + `city` al cliente mediante `PATCH /customers/:id`.
> Por que: paridad con el legacy; el endpoint real ya existe (JOR-089), no hay deuda que diferir.

MUST: "Actualizar direccion" MUST invocar `PATCH /customers/:id` con `address` + `city` y reflejar el resultado. Los campos `address`/`city` MUST ser editables en `CustomerCard`. NO se recurre a stub ni deuda: el endpoint es el real de JOR-089.

- Scenario: GIVEN un cliente seleccionado con direccion editable WHEN el usuario edita `address`/`city` y pulsa "Actualizar direccion" THEN se ejecuta `PATCH /customers/:id` y la direccion queda persistida en el cliente.
- Scenario (DET-40, camino viejo): GIVEN el comportamiento previo era solo-lectura (refrescaba la card) WHEN se invierte a persistir THEN el refresh NO se pierde: re-seleccionar el cliente repuebla `CustomerCard` desde el backend.

### R2: notificacion proactiva del estado del cliente al seleccionarlo
> Que cambia: al seleccionar un cliente se evalua si tiene pendientes y, de haberlos, se abre un dialog con el estado.
> Por que: paridad con el legacy, que avisa de facturas/notas/cheques pendientes antes de facturar.

MUST: al seleccionar un cliente, `useCustomerNotification` MUST evaluar los pendientes y, si existen, abrir `CustomerNotificationDialog`. Los conteos (facturas/notas/cheques) y los flags `bloqueado`/`isCredit` SON `DEUDA_TECNICA_CONFIRMAR`: backend JOR-092/113 no expone endpoint de notificacion; el mecanismo se cablea contra stub MSW. MUST: sin dato real el fallback es seguro (no se muestra aviso; el gate queda inactivo), nunca un estado falso.

- Scenario: GIVEN un cliente con pendientes (stub MSW) WHEN se selecciona THEN se abre `CustomerNotificationDialog` con los conteos.
- Scenario (fallback): GIVEN el backend no provee datos de notificacion WHEN se selecciona un cliente THEN NO se muestra aviso ni estado falso (fallback seguro).

### R3: wire del gate de cliente bloqueado desde el dato de seleccion
> Que cambia: el gate de cliente bloqueado queda cableado al dato de seleccion del cliente, listo para activarse cuando el backend provea el flag.
> Por que: dejar el mecanismo listo sin activar comportamiento con dato ausente.

MUST: el gate MUST tomar el flag `bloqueado` del dato de seleccion del cliente mediante un merge NO destructivo. MUST: el gate permanece inactivo mientras el flag real no exista (fallback seguro, `DEUDA_TECNICA_CONFIRMAR` hasta backend JOR-092/113).

- Scenario: GIVEN el flag `bloqueado` no esta presente en el dato del cliente WHEN se selecciona THEN el gate no bloquea (inactivo).
- Scenario: GIVEN el backend provee `bloqueado: true` WHEN se selecciona THEN el gate se activa (comportamiento listo, sin cambios adicionales de codigo).

### REQ-REGRESSION: el resto del builder de ventas no cambia
MUST: totales, tipos DTE, lineas, emision, y el resto del comportamiento del builder de ventas MUST permanecer sin cambios.

- Scenario: GIVEN el builder de ventas WHEN se opera sobre lineas/totales/emision THEN el comportamiento es identico al previo (regression suite verde).

## Tasks

### Session 1 — Builder ventas: cliente [tipo: ⚑ fuerte] [tier: T2]

**Task S1.T1 — Persistir direccion via PATCH /customers/:id**
- source_ref: R1
- agent: developer
- validation: "Actualizar direccion" invoca `PATCH /customers/:id` con address+city (endpoint real JOR-089); `address`/`city` editables en `CustomerCard`; test de persistencia
- rollback: git revert
- rules: [DET-40, DET-4]

**Task S1.T2 — Notificacion al seleccionar cliente (CustomerNotificationDialog + hook)**
- source_ref: R2
- agent: developer
- depends_on: S1.T1
- validation: al seleccionar cliente con pendientes (stub MSW) se abre `CustomerNotificationDialog`; conteos/flags marcados `DEUDA_TECNICA_CONFIRMAR`; fallback seguro sin data (sin aviso falso); test del hook
- rollback: git revert
- rules: [DET-32, DET-4]

**Task S1.T3 — Wire del gate bloqueado desde el dato de seleccion**
- source_ref: R3
- agent: developer
- depends_on: S1.T2
- validation: merge no destructivo del dato de seleccion; gate inactivo sin flag real; activo cuando el flag exista; test
- rollback: git revert
- rules: [DET-5, DET-40]

**Task S1.T4 — Tests + verificacion**
- source_ref: R1, R2, R3, REQ-REGRESSION
- agent: reviewer/tester
- depends_on: S1.T1, S1.T2, S1.T3
- validation: vitest builder verde; regression del builder sin cambios; tsc/eslint exit 0
- rollback: N/A (tests)
- rules: [DET-4, DET-7, DET-13, DET-33]

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado (DET-33), decisions del gate registradas.

## Constraints

- Alcance acotado a `components/ventas/builder/CustomerCard/`, `components/ventas/builder/TransactionBuilder/`, `services/api/ventas/`, `lib/schemas/ventas.ts`.
- R1 usa el endpoint REAL (JOR-089), sin stub ni deuda.
- R2/R3 no bloquean el flujo mientras el backend no provea datos reales (fallback seguro).
- Reusar el primitivo `Dialog` existente para `CustomerNotificationDialog` (DET-32): no crear componente visual nuevo desde cero.

## Dependencies

- **JOR-089** (endpoint `PATCH /customers/:id`): provee la persistencia real usada por R1.
- **JOR-092 / JOR-113** (backend de estado/pendientes del cliente): pendiente; provee los conteos/flags reales de R2/R3. Hasta entonces, `DEUDA_TECNICA_CONFIRMAR` + stub MSW.
- **JOR-125**: serializado antes (depends_on del ticket).

## Risks

| Riesgo | Donde | Mitigacion |
|--------|-------|-----------|
| Invertir "Actualizar direccion" pierde el refresh del camino viejo | CustomerCard / TransactionBuilder | DET-40 auditoria 1:1; el refresh se conserva re-seleccionando el cliente |
| Conteos/flags de notificacion sin backend | useCustomerNotification / CustomerNotificationDialog | `DEUDA_TECNICA_CONFIRMAR`, stub MSW, fallback sin aviso (no estado falso) |
| Gate bloqueado se activa con dato ausente | wire del gate | Merge no destructivo; gate inactivo hasta que el flag real exista |

## Decisions

| # | Decision | Racional |
|---|----------|----------|
| 1 | "Actualizar direccion" persiste via `PATCH /customers/:id` (endpoint real JOR-089) | Paridad legacy; el endpoint real ya existe, no hay deuda. Invierte solo-lectura (DET-40 auditado: el refresh se conserva re-seleccionando) |
| 2 | Notificacion cableada con stub MSW; conteos/flags = `DEUDA_TECNICA_CONFIRMAR` | Backend JOR-092/113 no expone endpoint de notificacion; se deja el mecanismo listo con fallback seguro |
| 3 | Wire del gate por merge no destructivo del dato de seleccion | Deja el gate listo sin activar comportamiento con dato ausente |
| 4 | `CustomerNotificationDialog` reusa el primitivo `Dialog` existente | DET-32 reuse: sin componente visual nuevo que draftear |

## Acceptance checkpoints

- [ ] AC-1 (R1): editar address/city + "Actualizar direccion" ejecuta `PATCH /customers/:id` y persiste (test).
- [ ] AC-2 (R2): seleccionar cliente con pendientes (stub) abre `CustomerNotificationDialog`; sin data, fallback seguro (test).
- [ ] AC-3 (R3): gate inactivo sin flag; activo con `bloqueado: true` (test).
- [ ] AC-4 (REQ-REGRESSION): totales/DTE/lineas/emision sin cambios (regression suite verde).
