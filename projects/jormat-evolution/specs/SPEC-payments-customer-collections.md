---
id: SPEC-payments-customer-collections
project: jormat-evolution
ticket: JOR-016
status: done
---

# B4 · Pagos (front + stub) — vistas 09 Pagos clientes + 10 Aplicar pago

# B4 · Pagos (front + stub) — vistas 09 Pagos clientes + 10 Aplicar pago

## Executive summary — lo que estas aprobando

### 1. Que se quiere
El **cuarto módulo de negocio**: Pagos (cobranza / cuentas por cobrar — AR). Dos vistas: **09 Pagos clientes** (listado canónico — 5 KPIs + filter bar + tabla, reusa las primitivas list de JOR-013/014) y **10 Aplicar pago** (patrón **master-detail** de ruta propia: cabecera de factura read-only + tabla de pagos aplicados + form de alta de pago — primero de su tipo en el repo). Recorre la rampa Bn **hasta el stub**: Bn.0 capabilities → Bn.1 contrato Zod + función pura de saldo → Bn.2 FE contra MSW → Bn.3 BE stub. El modelo de datos real (pagos persistidos, aplicación a facturas, ciclo AR, vencimiento real) es Fase C.

### 2. Decisiones críticas

| Decisión | Racional (1 línea) |
|----------|--------------------|
| Enum `PaymentStatus` = `Pagado`/`Pendiente`/`Vencida` (nunca "Cancelada") | El mockup 10 dibuja "Cancelada" pero el enum real (legacy + doc) no la tiene; "Cancelado" es eje SII de factura proveedor — no confundir |
| Saldo como **función pura** `calcPending(total, payments)` = `total − Σ payments.total` | Lógica de negocio testeable aislada (C4); abono parcial y 🗑-revierte caen del mismo cálculo |
| `pending` se **deriva**, no se persiste en el contrato de alta | Single source of truth; el stub la calcula y la devuelve; evita drift entre `pending` guardado y la suma real |
| 4 sessions (vs 3 de JOR-015): vista 10 master-detail en session dedicada (T3 ⚑) | Patrón nuevo de mayor riesgo; S1 foundation bajo riesgo (T2 auto) |
| Reuso directo de primitivas list (KpiCard/StatGrid/FilterBar/DataTable) | Ya extraídas (JOR-013/014); **sin refactor de extracción** aquí (DET-32 reuse > build) |
| Capabilities: `view` gatea ruta+vistas; submit del form gatea `record-payment`+`apply-payment` (AND backend); 🗑 gatea `delete` | Mapeo fiel a las 4 capabilities declaradas; documenta la semántica record vs apply |

### 3. Riesgos principales y cómo los mitigamos

| Riesgo | Mitigación |
|--------|-----------|
| Confundir "Sin abono" (0 pagos) con "Pendiente" (parcial) en los KPIs | Contrato distingue: `Sin abono` = facturas con `payments.length === 0`; `Pendiente` = `pending > 0`. KPIs documentados + tests |
| Master-detail de ruta propia sin precedente en el repo | Reusa `TwoColumn`, `DataTable`, primitivas form (Input/Select/Textarea) ya existentes; encapsula la orquestación en `AplicarPagoView` |
| Abono parcial que excede el saldo | `validateAbono(total, pending)` función pura + schema Zod `.refine(total <= pending)`; tests de borde |
| Replicar "Cancelada" del mockup | Enum Zod estricto (no acepta "Cancelada"); test de rechazo |

### 4. Que NO se hace
Pagos a proveedores (ciclo AP — Fase C) · modelo de datos real / persistencia (Fase C) · paginación server-side (client-side como ventas/items) · lógica de vencimiento real basada en fecha (el stub marca `Vencida` hardcoded) · estado de cuenta del cliente / vouchers (`/finance/vouchers` del legacy — fuera de alcance) · navegación/sidebar taxonomía (se resuelve en otro ticket).

### 5. Tamaño estimado
4 sessions · ~22 tasks · FE (2 vistas + schemas + función pura + api + MSW + hooks + stories + tests) + BE stub (module/service/controller/dto + supertest) + codegen.

### 6. Cómo vas a saber que funciona
- `npm run test` verde: unit de schemas (estados válidos/inválidos, abono parcial), función pura `calcPending`/`validateAbono`, hooks con MSW, gateo `<Can>`, supertest del stub (shape + 403 por capability + DELETE revierte saldo).
- Storybook: vista 09 (vacío/con datos/error/filtros) y vista 10 (0 pagos / N pagos / form) renderizan; a11y sin violaciones.
- Swagger `/docs` expone los endpoints de pagos; `npm run generate:api-types` regenera `api.gen.ts` sin error.

## Purpose

Entregar el módulo Pagos del lado cobranza (AR) en su escalón Bn (FE funcional contra mock + BE stub contratado), reutilizando el patrón list y aportando el patrón master-detail reutilizable. Deja el contrato de datos (Zod + DTO + Swagger) estable para que Fase C conecte la persistencia real sin rediseñar la UI.

## Requirements

### REQ-01 · Bn.0 — Registrar las capabilities de Pagos en el catálogo (seed)

> **Que cambia**: se agrega el seed `07_payments_capabilities.ts` con las 4 capabilities `payments.customers:{view,record-payment,apply-payment,delete}`.
> **Por qué**: el gateo `<Can>` (FE) y `@RequireCapability` (BE) necesitan que las capabilities existan en la tabla `capabilities`; sin seed, el guard de hidratación nunca las otorga.

El seed MUST insertar las 4 capabilities (`module: payments`, `feature: customers`, `action: {view,record-payment,apply-payment,delete}`), MUST ser idempotente (no duplica si ya existen) y MUST NOT correr en `production`. NO MUST tocar `03_rbac.ts` — `internal-admin` ya tiene wildcard `*`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed idempotente
- **GIVEN** la tabla `capabilities` vacía de filas `payments.*`
- **WHEN** se corre `knex seed:run --specific=07_payments_capabilities.ts` dos veces
- **THEN** quedan exactamente 4 filas `payments.customers:*`, sin duplicados

#### Scenario: guard de producción
- **GIVEN** `NODE_ENV=production`
- **WHEN** se invoca el seed
- **THEN** retorna sin insertar nada
</details>

**Acceptance**: `select count(*) from capabilities where module='payments'` → 4, tras correr el seed (idempotente).
- **source_ref**: `09-pagos-clientes-listado.md`, `permissions-model.md`; patrón `06_purchases_capabilities.ts`. **Layers**: DB seed. **Certeza**: confirmed.

### REQ-02 · Bn.1 — Contrato Zod del módulo Pagos + función pura de saldo + tipos

> **Que cambia**: nuevo `src/lib/schemas/payments.ts` (enums + schemas), `src/types/payments.ts` (z.infer), `src/lib/payments/calc-balance.ts` (función pura).
> **Por qué**: es la fuente de verdad del shape de datos; destraba vistas, MSW, hooks y el stub.

El contrato MUST definir: `paymentStatusSchema = z.enum(['Pagado','Pendiente','Vencida'])` (estricto — NO MUST aceptar "Cancelada"); `formaPagoSchema = z.enum(['Transferencia','Debito','Cheque','Efectivo','Sin pago'])`; `invoiceRefSchema` (factura read-only — ver Technical reference); `appliedPaymentSchema` (pago aplicado); `invoiceWithPaymentsSchema` (cabecera + `payments: appliedPayment[]`); `paymentApplyInputSchema` (alta — `total > 0` y `total <= pending` via `.refine`, `nroDoc` requerido, `observacion` opcional `.max(300)`, `formaPago` requerida). La función `calcPending(total, payments)` MUST devolver `total − Σ payments.total`; `validateAbono(total, pending)` MUST rechazar `total <= 0` y `total > pending`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: enum rechaza "Cancelada"
- **GIVEN** `paymentStatusSchema`
- **WHEN** `safeParse('Cancelada')`
- **THEN** `success: false`

#### Scenario: abono parcial válido
- **GIVEN** factura `total=1000`, `pending=400`
- **WHEN** `paymentApplyInputSchema.safeParse({ total:300, nroDoc:'X', formaPago:'Transferencia', fecha:'2026-06-05' })` con `pending=400` en contexto
- **THEN** `success: true`

#### Scenario: abono excede saldo
- **GIVEN** `pending=400`
- **WHEN** `validateAbono(500, 400)`
- **THEN** retorna inválido (excede)

#### Scenario: calcPending tras N pagos
- **GIVEN** `total=296050`, `payments=[{total:200000},{total:96050}]`
- **WHEN** `calcPending(296050, payments)`
- **THEN** `0`
</details>

**Acceptance**: unit Vitest verde cubriendo los 4 scenarios + casos de borde (saldo negativo imposible, observación >300 rechazada).
- **source_ref**: `10-pagos-cliente-detalle.md`, `legacy/finanzas-pagos.md`; `SPEC-sales-documents` (`documentoDTESchema`). **Layers**: FE schema + lógica pura. **Certeza**: confirmed.

### REQ-03 · Bn.1 — Scaffolding api + MSW + hooks React Query

> **Que cambia**: `src/services/api/payments/customers.ts`, `src/test/msw/handlers/payments.ts` (+ registro en `handlers.ts`), `src/hooks/usePayments.ts`.
> **Por qué**: las vistas necesitan datos; en Bn.2 vienen del mock MSW (Fase 0), en Bn.3 del stub.

El servicio MUST exponer `listCobranza()`, `getInvoiceWithPayments(invoiceId)`, `applyPayment(invoiceId, input)`, `deletePayment(invoiceId, paymentId)` contra `/api/proxy/pagos/clientes...`. Los handlers MSW MUST devolver datos mock coherentes con el contrato (incluyendo factura con 0/N pagos). Los hooks MUST usar `useApiQuery`/`useApiMutation`; las mutaciones MUST invalidar las queries de listado y detalle.

**Acceptance**: hooks testeados con MSW (loading→success→error; mutación success/error + invalidación).
- **source_ref**: patrón `useVentas.ts`, `handlers/ventas.ts`, `services/api/ventas/`. **Layers**: FE api + mock + hooks. **Certeza**: confirmed.

### REQ-04 · Bn.2 vista 09 — Pagos clientes (listado de cobranza)

> **Que cambia**: `src/components/payments/list/PagosClientesListView/` + `PagosClientesTable/` + page `src/app/(app)/pagos/clientes/page.tsx`.
> **Por qué**: vista de consulta/control de cobranza; punto de entrada al detalle.

La vista MUST envolver con `<RouteGuard cap="payments.customers:view">`; MUST mostrar 5 KPIs derivados del universo filtrado (Total pagos = registros; Pendientes = facturas `pending>0`; Pagados = `pending===0`; **Sin abono** = `payments.length===0`; Total ingresado = Σ totales pagados, CLP); MUST tener filter bar (search cliente/factura, Estado, Origen, Forma de pago, rango Desde/Hasta, Limpiar) con filtrado **client-side**; la tabla MUST renderizar badges (Pendiente amber / Pagado verde / Vencida) y pill de Forma de pago ("No hay pagos" gris cuando 0 pagos); el botón "+ Registrar pago" MUST estar gateado por `<Can cap="payments.customers:record-payment">`; la acción de fila MUST navegar a la vista 10.

<details><summary>Scenarios de validacion</summary>

#### Scenario: KPI "Sin abono" ≠ "Pendiente"
- **GIVEN** 1 factura con `pending>0` y 1 pago aplicado (parcial), y 1 factura con `pending>0` y 0 pagos
- **WHEN** se calculan los KPIs
- **THEN** Pendientes=2, Sin abono=1

#### Scenario: gateo del botón
- **GIVEN** caps sin `payments.customers:record-payment`
- **WHEN** render de la vista
- **THEN** "+ Registrar pago" ausente del DOM
</details>

**Acceptance**: stories (vacío/con datos/error/filtros activos) + tests de KPIs + gateo; a11y sin violaciones.
- **source_ref**: `09-pagos-clientes-listado.md`; patrón `DocumentosListView`. **Layers**: FE vista. **Certeza**: confirmed.

### REQ-05 · Bn.2 vista 10 — Aplicar pago (master-detail)

> **Que cambia**: `src/components/payments/detail/AplicarPagoView/` con `FacturaHeaderCard/` + `PagosAsociadosTable/` + `EfectuarPagoForm/`; page `src/app/(app)/pagos/clientes/[invoiceId]/page.tsx`.
> **Por qué**: ver pagos de una factura y registrar uno nuevo; introduce el patrón master-detail reutilizable.

La vista MUST mostrar la cabecera de factura read-only (folio, fecha, vencimiento, total, pending, estado `Pagado`/`Pendiente`/`Vencida`); el master MUST listar los pagos aplicados (Id, Fecha, Total, Forma pago, Usuario pill, N° Doc, Obs, 🗑); 🗑 MUST estar gateado por `<Can cap="payments.customers:delete">` y al eliminar MUST recalcular el saldo (en vivo en el mock). El form (RHF + zodResolver) MUST tener Fecha*, Total* (pre-llenado con `pending`, editable → abono parcial), N° Doc*, Observación (textarea contador 0/300), Forma de pago*; MUST mostrar el banner "el pago quedará asociado a la factura {folio}"; el submit MUST estar gateado por `<Can cap="payments.customers:record-payment">` y validar con `paymentApplyInputSchema` (no exceder `pending`). NO MUST renderizar "Cancelada".

<details><summary>Scenarios de validacion</summary>

#### Scenario: abono parcial recalcula pending
- **GIVEN** factura `total=1000`, `pending=1000`, 0 pagos
- **WHEN** se registra un pago de `400`
- **THEN** el master muestra 1 pago y el pending pasa a `600` (factura sigue Pendiente)

#### Scenario: 🗑 revierte saldo
- **GIVEN** factura con 1 pago de `400` aplicado, `pending=600`
- **WHEN** se elimina el pago
- **THEN** `pending` vuelve a `1000`

#### Scenario: submit excede saldo
- **GIVEN** `pending=400`
- **WHEN** se intenta registrar `500`
- **THEN** error de validación, no se envía
</details>

**Acceptance**: stories (0 pagos / N pagos / form vacío-lleno) + tests de interacción (registrar, eliminar, abono parcial, gateo) + a11y.
- **source_ref**: `10-pagos-cliente-detalle.md`, `legacy/finanzas-pagos.md`. **Layers**: FE vista master-detail. **Certeza**: confirmed.

### REQ-06 · Bn.3 — BE stub NestJS + switch MSW→stub + regen tipos

> **Que cambia**: `backend/jormat-api/src/payments/` (module/service/controller/dto) + regen `src/types/api.gen.ts`.
> **Por qué**: contratar el API real (Swagger) para que Fase C conecte persistencia sin rediseñar; cierra la rampa Bn.

El módulo MUST exponer (prefijo `/api`): `GET /pagos/clientes` (`view`), `GET /pagos/clientes/:invoiceId` (`view`), `POST /pagos/clientes/:invoiceId/pagos` (`record-payment` + `apply-payment`), `DELETE /pagos/clientes/:invoiceId/pagos/:paymentId` (`delete`). Cada endpoint MUST usar `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` + `@RequireCapability`, MUST documentar con `@ApiProperty`/`@ApiResponse`, MUST devolver respuestas hardcodeadas coherentes con el contrato, y MUST recibir `workspaceId` en la firma del service (prefijo `_`, scope futuro). El DELETE MUST devolver la factura con `pending` recalculado (revierte). `npm run generate:api-types` MUST regenerar `api.gen.ts` sin error.

<details><summary>Scenarios de validacion</summary>

#### Scenario: 403 por capability específica
- **GIVEN** usuario con `payments.customers:view` pero sin `:record-payment`
- **WHEN** `POST /pagos/clientes/156634/pagos`
- **THEN** 403 `{code:'FORBIDDEN'}`

#### Scenario: shape del listado
- **GIVEN** usuario con `payments.customers:view`
- **WHEN** `GET /pagos/clientes`
- **THEN** 200 + array que cumple el contrato (cada fila con `status` ∈ enum)

#### Scenario: DELETE revierte saldo
- **GIVEN** factura con 1 pago aplicado en el stub
- **WHEN** `DELETE .../pagos/:id` con `:delete`
- **THEN** 200 + factura con `pending` aumentado por el monto del pago eliminado
</details>

**Acceptance**: supertest in-process (override AuthGuard + mock PermissionsService) cubriendo los 3 scenarios + casos OK; Swagger expone los 4 endpoints; FE switchea de MSW a stub para los hooks (o mantiene MSW en tests).
- **source_ref**: patrón `purchases` BE stub (`facturas-proveedor.controller.ts`), DEC-002. **Layers**: BE stub + codegen. **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Target | Cómo se mide |
|------|--------|--------------|
| Tipado | 0 `any`; enums estrictos | `tsc --noEmit` + grep `any` en archivos nuevos |
| Tenant scope | `workspaceId` en firma de todos los métodos del service | revisión de firma + comentario `scope futuro` |
| RBAC | 403 por capability específica en cada endpoint mutante | supertest |
| A11y | sin violaciones en stories | `@storybook/addon-a11y` runner |
| Test | unit schemas + función pura + hooks + gateo + supertest verdes | `npm run test` |
| Mutation (DET-31) | warn-first sobre `.ts` nuevos (schemas, calc-balance) | `dkc-mutate` async en gate (diferible) |

## Artifacts

| Artefacto | Path | source_ref | Acción |
|-----------|------|-----------|--------|
| Seed capabilities | `backend/jormat-api/seeds/07_payments_capabilities.ts` | REQ-01 | crear |
| Schema Zod | `front/jormat-front/src/lib/schemas/payments.ts` | REQ-02 | crear |
| Tipos | `front/jormat-front/src/types/payments.ts` | REQ-02 | crear |
| Función pura saldo | `front/jormat-front/src/lib/payments/calc-balance.ts` | REQ-02 | crear |
| Servicio API | `front/jormat-front/src/services/api/payments/customers.ts` | REQ-03 | crear |
| MSW handlers | `front/jormat-front/src/test/msw/handlers/payments.ts` (+ registro) | REQ-03 | crear |
| Hooks | `front/jormat-front/src/hooks/usePayments.ts` | REQ-03 | crear |
| Vista 09 | `front/jormat-front/src/components/payments/list/PagosClientesListView/` + `PagosClientesTable/` | REQ-04 | crear |
| Page 09 | `front/jormat-front/src/app/(app)/pagos/clientes/page.tsx` | REQ-04 | crear |
| Vista 10 | `front/jormat-front/src/components/payments/detail/{AplicarPagoView,FacturaHeaderCard,PagosAsociadosTable,EfectuarPagoForm}/` | REQ-05 | crear |
| Page 10 | `front/jormat-front/src/app/(app)/pagos/clientes/[invoiceId]/page.tsx` | REQ-05 | crear |
| BE stub | `backend/jormat-api/src/payments/{payments.module,payments.service,payments.controller}.ts` + `dto/` | REQ-06 | crear |
| Tipos generados | `front/jormat-front/src/types/api.gen.ts` | REQ-06 | regen |

## Constraints

- `code: english`, `content/comments: spanish` (RULE-global-001).
- Todo query de tenant filtra por `workspace_id` en el service (RULE-global-002 / DEC-001); en stub se acepta en firma (`_workspaceId`).
- FE nunca llama la API directo — siempre vía `/api/proxy` (RULE-global-003).
- El enum de estado de pago es `Pagado`/`Pendiente`/`Vencida`; "Cancelada" prohibido.
- Reuso directo de primitivas list/form existentes (DET-32) — sin extracción nueva.

## Dependencies

| Dependency | Type | Description | Risk |
|-----------|------|-------------|------|
| SPEC-sales-documents (JOR-014) | hard | `documentoDTESchema` (factura de venta a la que se aplica el pago) | bajo — closed |
| SPEC-backend-rbac | hard | guards `CapabilitiesHydrationGuard`/`CapabilitiesGuard` + `@RequireCapability` | bajo |
| SPEC-frontend-ui-data-layout | hard | `KpiCard`/`StatGrid`/`FilterBar`/`DataTable`/`PageLayout`/`TwoColumn` | bajo |
| SPEC-frontend-ui-atoms-forms | hard | `Input`/`Select`/`Textarea`/`Button` + RHF+Zod pattern | bajo |
| SPEC-frontend-rbac-admin-views | hard | `<Can>`/`<RouteGuard>`/`useCan` | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Master-detail sin precedente | media | medio | Reusar TwoColumn/DataTable/form atoms; encapsular orquestación |
| Semántica KPIs ambigua (Sin abono vs Pendiente) | media | medio | Definición explícita en contrato + tests |
| Abono parcial mal validado | baja | alto | `.refine` Zod + función pura `validateAbono` + tests de borde |

## Open questions

- (resuelta en design) Observación: el mockup la marca opcional, el legacy requerida → **se implementa opcional** `.max(300)` (la maqueta marca el alcance); documentado en DEC-LOCAL-03.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Enum de estado estricto `Pagado`/`Pendiente`/`Vencida`
El mockup 10 dibuja un badge "Cancelada" que no existe en el dominio. Se modela `paymentStatusSchema = z.enum(['Pagado','Pendiente','Vencida'])` y se testea el rechazo de "Cancelada". `Vencida` = `pending>0` y vencido; en el stub se marca hardcoded (la fecha real es Fase C). Alternativa descartada: incluir "Cancelada" para fidelidad al mockup — descartada por contradecir el dominio (legacy + doc).

### DEC-LOCAL-02: `pending` derivado, no persistido en el alta
El input de alta (`paymentApplyInputSchema`) NO lleva `pending`; el saldo se deriva con `calcPending(total, payments)`. El stub devuelve `invoiceWithPayments` con el `pending` recalculado en cada GET/POST/DELETE. Evita drift entre un `pending` guardado y la suma real de pagos. La validación de abono usa el `pending` del contexto (factura cargada).

### DEC-LOCAL-03: Observación opcional `.max(300)`
Discrepancia mockup (opcional) vs legacy (requerida). Se implementa opcional con tope 300 (contador 0/300 del mockup). Razón: la maqueta marca el alcance v1; requerirla es una regla de negocio que se confirma en Fase C si aplica.

### DEC-LOCAL-04: Capabilities — `record-payment` (FE) + `record-payment`∧`apply-payment` (BE POST)
`view` gatea ruta y ambas vistas. El botón "Registrar pago" / submit del form se gatean en FE con `record-payment`. El endpoint POST (que crea el pago **y** lo aplica a la factura en un paso) requiere en BE **ambas** `record-payment` ∧ `apply-payment` (el acto atómico de registrar+aplicar). 🗑 / DELETE gatean `delete`. Así las 4 capabilities declaradas quedan con semántica real; `apply-payment` queda además disponible para una futura re-imputación independiente (Fase C).

## Acceptance checkpoints

- [x] REQ-01: `select count(*) from capabilities where module='payments'` = 4 (seed idempotente, guard prod) — verificado en DB dev (5433)
- [x] REQ-02: unit schemas + `calcPending`/`validateAbono` verdes (incl. rechazo "Cancelada", abono parcial, excede saldo)
- [x] REQ-03: hooks con MSW verdes (loading→success→error, mutación + invalidación)
- [x] REQ-04: vista 09 — stories + KPIs (Sin abono ≠ Pendiente) + gateo; a11y limpio (10 stories browser)
- [x] REQ-05: vista 10 — stories + abono parcial recalcula + 🗑 revierte + gateo submit/delete; a11y limpio (12 stories browser + jsdom e2e)
- [x] REQ-06: stub — supertest 10 casos (403 por capability AND, shape, DELETE revierte) + Swagger + regen `api.gen.ts`
- [x] `tsc --noEmit` 0 errores; sin `any` en archivos nuevos
- [x] commits granulares por session (DET-27) en `epic/jormat-v1` (10 commits)

## Tasks

### Session 1 — Bn.0 seed + Bn.1 contrato Zod + función pura + api/MSW/hooks [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Seed `07_payments_capabilities.ts` (4 caps, idempotente, guard prod) | REQ-01 | developer | — | `backend/jormat-api/seeds/07_payments_capabilities.ts` | `seed:run --specific` x2 → count=4 | git rm seed | DET-2 | done | S1 |
| S1.T2 | Contrato Zod `payments.ts` (enums + invoiceRef + appliedPayment + invoiceWithPayments + applyInput) | REQ-02 | developer | — | `src/lib/schemas/payments.ts` | tsc | git checkout | RULE-global-001 | done | S1 |
| S1.T3 | Tipos `z.infer` `types/payments.ts` | REQ-02 | developer | S1.T2 | `src/types/payments.ts` | tsc | git checkout | — | done | S1 |
| S1.T4 | Función pura `calc-balance.ts` (`calcPending`, `validateAbono`) | REQ-02 | developer | S1.T2 | `src/lib/payments/calc-balance.ts` | unit Vitest | git checkout | DET-2 | done | S1 |
| S1.T5 | Test unit schemas + función pura (rechazo Cancelada, abono parcial, excede, calcPending) | REQ-02 | developer | S1.T2,T4 | `*.test.ts` | `npm run test` | git checkout | DET-7 | done | S1 |
| S1.T6 | api `customers.ts` + MSW `handlers/payments.ts` (+ registro) + hooks `usePayments.ts` + test hooks MSW | REQ-03 | developer | S1.T2,T3 | `services/api/payments/`, `test/msw/handlers/payments.ts`, `hooks/usePayments.ts` | `npm run test` | git checkout | RULE-global-003 | done | S1 |
| **S1.GATE** | Persistir + validar T2 (tsc + tests verdes + seed count=4) + quality review light + commits | — | reviewer | S1.T1..T6 | — | tier T2 | — | DET-23,27 | done | S1 |

### Session 2 — Bn.2 vista 09 Pagos clientes (listado) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | KPIs derivados (función pura `calc-kpis.ts`) + test (Sin abono ≠ Pendiente) | REQ-04 | developer | S1 | `src/lib/payments/calc-kpis.ts` + test | unit | git checkout | DET-2 | done | S2 |
| S2.T2 | `PagosClientesTable` (columnas + badges + pill forma pago) + story | REQ-04 | developer | S1,S2.T1 | `components/payments/list/PagosClientesTable/` | story render | git checkout | — | done | S2 |
| S2.T3 | `PagosClientesListView` (RouteGuard + StatGrid/KpiCard + FilterBar client-side + Can registrar) + page | REQ-04 | developer | S2.T2 | `.../PagosClientesListView/`, `app/(app)/pagos/clientes/page.tsx` | story render | git checkout | — | done | S2 |
| S2.T4 | Stories (vacío/datos/error/filtros) + tests (KPIs, filtros, gateo Can) + a11y | REQ-04 | developer | S2.T3 | `*.stories.tsx`, `*.test.tsx` | `npm run test` + a11y | git checkout | DET-7 | done | S2 |
| **S2.GATE** | Persistir + validar T3 (tests + stories + a11y + evidencia visual) + quality review standard + reviewer aislado + commits | — | reviewer | S2.T1..T4 | — | tier T3 | — | DET-23,27 | done | S2 |

### Session 3 — Bn.2 vista 10 Aplicar pago (master-detail) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S3.T1 | `FacturaHeaderCard` (read-only, estado badge, vencimiento) + story | REQ-05 | developer | S1 | `components/payments/detail/FacturaHeaderCard/` | story | git checkout | — | done | S3 |
| S3.T2 | `PagosAsociadosTable` (master, usuario pill, 🗑 gated delete) + story | REQ-05 | developer | S1 | `.../PagosAsociadosTable/` | story | git checkout | — | done | S3 |
| S3.T3 | `EfectuarPagoForm` (RHF+zodResolver, total editable, contador 0/300, banner, Can record) + story | REQ-05 | developer | S1 | `.../EfectuarPagoForm/` | story | git checkout | — | done | S3 |
| S3.T4 | `AplicarPagoView` orquesta (TwoColumn, recálculo en vivo, 🗑 revierte) + page `[invoiceId]` | REQ-05 | developer | S3.T1,T2,T3 | `.../AplicarPagoView/`, `app/(app)/pagos/clientes/[invoiceId]/page.tsx` | story | git checkout | — | done | S3 |
| S3.T5 | Stories (0 pagos/N pagos/form) + tests interacción (registrar, abono parcial recalcula, 🗑 revierte, gateo) + a11y | REQ-05 | developer | S3.T4 | `*.stories.tsx`, `*.test.tsx` | `npm run test` + a11y | git checkout | DET-7 | done | S3 |
| S3.T6 | Verificación visual Playwright (vista 10 render en dev) | REQ-05 | developer | S3.T5 | screenshots | screenshots subdir ticket | — | DET-13 | done | S3 |
| **S3.GATE** | Persistir + validar T3 + quality review standard + reviewer aislado + commits | — | reviewer | S3.T1..T6 | — | tier T3 | — | DET-23,27 | done | S3 |

### Session 4 — Bn.3 BE stub + switch + codegen + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S4.T1 | DTOs `payments/dto/` (`@ApiProperty` + class-validator) | REQ-06 | developer | S1 | `backend/.../payments/dto/` | tsc | git checkout | DET-2 | done | S4 |
| S4.T2 | `payments.service` (STUB_* hardcoded, `_workspaceId`, recálculo pending) + `payments.controller` (4 endpoints, guards, @RequireCapability, Swagger) + `payments.module` (registrar en app.module) | REQ-06 | developer | S4.T1 | `backend/.../payments/` | build | git checkout | RULE-global-002 | done | S4 |
| S4.T3 | Supertest (shape, 403 por capability, DELETE revierte) | REQ-06 | developer | S4.T2 | `*.spec.ts` | supertest | git checkout | DET-7 | done | S4 |
| S4.T4 | Regen `api.gen.ts` desde Swagger del stub (DEC-002 Fase 1) | REQ-06 | developer | S4.T2 | `src/types/api.gen.ts` | generate:api-types | git checkout | — | done | S4 |
| S4.T5 | Cierre cobertura: actualizar coverage map del ticket, suite completa verde, request-close | — | reviewer | S4.T1..T4 | — | full suite | — | DET-13 | done | S4 |
| **S4.GATE** | Persistir + validar T3 (suite completa + supertest + codegen) + quality review standard + reviewer aislado + commits + cierre | — | reviewer | S4.T1..T5 | — | tier T3 | — | DET-13,23,27 | done | S4 |

## Technical reference

### Contrato Zod (`src/lib/schemas/payments.ts`)

```
paymentStatusSchema = z.enum(['Pagado','Pendiente','Vencida'])           // NUNCA 'Cancelada'
formaPagoSchema     = z.enum(['Transferencia','Debito','Cheque','Efectivo','Sin pago'])
origenSchema        = z.enum(['MAT','BOD-CHILL','BOD-CONST','BOD-CONCE']) // reusa set multi-bodega

invoiceRefSchema = z.object({
  id: z.string(), folio: z.string(),
  cliente: z.object({ razonSocial: z.string(), rut: z.string() }),
  fecha: z.string(), expirationDate: z.string(),
  total: z.number(), pending: z.number(),
  status: paymentStatusSchema, origin: origenSchema,
})

appliedPaymentSchema = z.object({
  id: z.string(), fecha: z.string(), total: z.number(),
  formaPago: formaPagoSchema, usuario: z.string(),
  nroDoc: z.string(), observacion: z.string().max(300).optional(),
})

invoiceWithPaymentsSchema = invoiceRefSchema.extend({ payments: z.array(appliedPaymentSchema) })

// fila del listado 09 (cobranza): invoiceRef + formaPago del último pago (o 'Sin pago')
cobranzaRowSchema = invoiceRefSchema.extend({ formaPago: formaPagoSchema })

// alta de pago (detalle 10) — pending viene del contexto de la factura cargada
paymentApplyInputSchema = z.object({
  fecha: z.string().min(1),
  total: z.number().positive(),
  nroDoc: z.string().min(1),
  observacion: z.string().max(300).optional(),
  formaPago: formaPagoSchema,
})
```

### Función pura (`src/lib/payments/calc-balance.ts`)

```
calcPending(total: number, payments: {total:number}[]): number   // total − Σ payments.total (>= 0)
validateAbono(total: number, pending: number): { ok: boolean; reason?: string }  // ok si 0 < total <= pending
```

### Endpoints stub (BE — prefijo `/api`)

```
GET    /pagos/clientes                              → CobranzaRow[]            (view)
GET    /pagos/clientes/:invoiceId                   → InvoiceWithPayments      (view)
POST   /pagos/clientes/:invoiceId/pagos             → InvoiceWithPayments      (record-payment ∧ apply-payment)   body: PaymentApplyInput
DELETE /pagos/clientes/:invoiceId/pagos/:paymentId  → InvoiceWithPayments      (delete) — pending recalculado (revierte)
```

Service: respuestas `STUB_*` hardcodeadas; `_workspaceId` en firma (scope futuro Bn.4+). POST/DELETE devuelven la factura con `pending` recalculado vía la misma lógica de `calcPending`.

### Patrones reusados

- List: `KpiCard`/`StatGrid`/`FilterBar`/`DataTable`/`PageLayout` (`components/ui/*`, `components/layout/*`). Filtrado client-side.
- Master-detail: `TwoColumn` + `DataTable` + form atoms (`Input`/`Select`/`Textarea`/`Button`) + RHF + zodResolver.
- RBAC: `<RouteGuard cap>` / `<Can cap>` / `useCan`; BE `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` + `@RequireCapability`.
- Codegen: `npm run generate:api-types` → `src/types/api.gen.ts`.
