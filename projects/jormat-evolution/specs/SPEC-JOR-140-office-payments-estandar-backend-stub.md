---
id: SPEC-JOR-140-office-payments-estandar-backend-stub
project: jormat-evolution
ticket: JOR-140
status: done
---

# Alinear "Pagos sucursal" (office-payments) al estandar del front + backend NestJS stub

# Alinear "Pagos sucursal" (office-payments) al estandar del front + backend NestJS stub

## Executive summary — lo que estas aprobando

**Que se hace**: la vista "Pagos sucursal" (office-payments, entregada en JOR-132) no seguia el estandar del front nuevo y solo tenia MSW como backend. Este ticket la alinea al estandar en cuatro ejes y crea el backend NestJS stub de sus endpoints.

**FRONT**:
1. **Fix P0 de tokens**: la vista usaba clases `border-error` / `text-error` / `bg-error-bg` que NO existen en el sistema de tokens → estilos muertos (no renderizaban). Se corrigen a `destructive`; los estilos de error ahora renderizan.
2. **KPIs**: `StatGrid` + 5 `KPICard` derivados del universo filtrado (`calc-office-kpis.ts`).
3. **Tablas**: listado, carrito y bodega migrados al atomo `DataTable` (ColumnDef / renderRowActions / getRowClassName / estados) + `DateDisplay` + badge semantico `OFFICE_STATUS_BADGE`.
4. **Crear**: el flujo multi-documento pasa de `useState` a RHF + `zodResolver` + `FormField` (errores inline) + `useFieldArray` + `useUnsavedChangesGuard({ when: items>0 })` + contador; export CSV + imprimir + `FilterBar`.

**BACKEND (ampliacion pedida por el dev)**: nuevo modulo NestJS `office-payments` (`backend/jormat-api/src/office-payments/`) montado en `pagos/oficina`, con datos stub coherentes con el schema Zod del front. Endpoints: `GET /sales?warehouse`, `GET /list`, `POST /` (batch), `GET /:paymentId`. Gateado por `payments.offices:view` / `payments.offices:create` (capabilities de JOR-139). Total recalculado server-side `Σ round(pay)`. El MSW del front queda intacto para los tests jsdom (coexisten); en dev el front pega al backend real via proxy.

**Reuso (DET-32)**: no se crea lenguaje visual nuevo. `StatGrid`, `KPICard`, `DataTable`, `FormField`, `FilterBar` ya existen; por eso `draft_approved: skipped`.

**Deuda tecnica (confirmada)**: la persistencia real (inventario / imputacion / saldos, Fase C) queda fuera de alcance; hoy el store del backend es en memoria.

## Requirements

### REQ-01: Fix P0 de tokens de error (estilos muertos → destructive)
> Que cambia: las clases `border-error` / `text-error` / `bg-error-bg` de la vista office-payments se reemplazan por el token `destructive`; los estilos de error ahora renderizan.
> Por que: esas clases no existen en el sistema de design tokens del front, por lo que los estados de error de la vista no aplicaban estilo alguno (bug P0 visual heredado de JOR-132).

MUST: la vista office-payments no debe referenciar clases de token inexistentes (`border-error`, `text-error`, `bg-error-bg`). Los estados de error MUST usar el token `destructive` del sistema, de modo que rendericen visiblemente.

<details>
<summary>Scenario</summary>

- GIVEN la vista office-payments renderiza un estado de error (validacion / stock / saldo)
- WHEN se aplica el estilo de error
- THEN el elemento usa el token `destructive` y el estilo es visible (no clase muerta).
</details>

### REQ-02: KPIs y tablas al estandar (StatGrid/KPICard + DataTable + badge/fechas)
> Que cambia: se agregan KPIs (`StatGrid` + 5 `KPICard`) derivados del universo filtrado y las tres tablas (listado, carrito, bodega) migran del markup a mano al atomo `DataTable` con `DateDisplay` y el badge semantico `OFFICE_STATUS_BADGE`.
> Por que: JOR-132 dejo las tablas construidas a mano y sin KPIs, divergiendo del estandar del front nuevo (consistencia visual, ordenamiento, estados y acciones por fila unificados).

MUST: las tablas de listado, carrito y bodega MUST usar el atomo `DataTable` (ColumnDef, renderRowActions, getRowClassName, estados de carga/vacio). Las fechas MUST renderizarse via `DateDisplay` y los estados via el badge semantico `OFFICE_STATUS_BADGE`. La vista MUST exponer KPIs con `StatGrid` + `KPICard` calculados sobre el universo filtrado (`calc-office-kpis.ts`).

<details>
<summary>Scenario</summary>

- GIVEN el usuario aplica un filtro sobre el listado de pagos de sucursal
- WHEN la vista recalcula
- THEN los KPIs (`StatGrid` + 5 `KPICard`) reflejan el universo filtrado y las tablas se renderizan con `DataTable` + `DateDisplay` + badge semantico.
</details>

### REQ-03: Crear multi-documento a RHF + guard + contador + export/print/filtros
> Que cambia: el flujo de creacion multi-documento migra de `useState` a React Hook Form (`zodResolver` + `FormField` con errores inline + `useFieldArray`), con guard de cambios sin guardar (`useUnsavedChangesGuard({ when: items>0 })`), contador de items, export CSV, imprimir y `FilterBar`.
> Por que: el manejo con `useState` no daba validacion declarativa ni proteccion ante salida con cambios; el estandar del front usa RHF + guard.

MUST: el formulario de creacion MUST usar RHF con `zodResolver` y `FormField` (errores inline), `useFieldArray` para las lineas y `useUnsavedChangesGuard({ when: items > 0 })`. La vista MUST exponer contador de items, export CSV, imprimir y `FilterBar`.

<details>
<summary>Scenario</summary>

- GIVEN el usuario agrego una o mas lineas al formulario de creacion (items > 0)
- WHEN intenta salir de la vista
- THEN el guard de cambios sin guardar intercepta la salida; y los errores de validacion de cada linea se muestran inline via `FormField`.
</details>

### REQ-04: Backend NestJS stub gateado y coherente con el schema del front
> Que cambia: nuevo modulo NestJS `office-payments` montado en `pagos/oficina`, con datos stub coherentes con el schema Zod del front, gateado por las capabilities de JOR-139 y con total recalculado server-side.
> Por que: la vista solo tenia MSW; se necesita un backend real (stub por ahora) para servir los endpoints en dev, con el mismo contrato de datos y el gate de RBAC correcto.

MUST: el modulo MUST exponer `GET /sales?warehouse`, `GET /list`, `POST /` (batch) y `GET /:paymentId` bajo `pagos/oficina`, con datos stub coherentes con el schema Zod del front. La lectura MUST estar gateada por `payments.offices:view` y la escritura por `payments.offices:create` (capabilities de JOR-139). El total del batch MUST recalcularse server-side como `Σ round(pay)` (no confiar en el total del cliente). El MSW del front MUST permanecer intacto para los tests jsdom.

<details>
<summary>Scenario</summary>

- GIVEN un cliente sin la capability `payments.offices:create`
- WHEN hace `POST /` al modulo office-payments
- THEN la request es rechazada por el gate de RBAC.
- AND GIVEN un batch valido, WHEN se persiste, THEN el total se recalcula server-side como `Σ round(pay)`.
</details>

## Tasks

### Session 1 — Alinear office-payments + backend stub [tier: T2]

**Task S1.T1 — Fix P0 de tokens de error**
- source_ref: REQ-01
- agent: developer
- files: `front/jormat-front/src/components/payments/office/`
- validation: sin referencias a `border-error` / `text-error` / `bg-error-bg`; estados de error usan `destructive` y renderizan; tsc / eslint exit 0
- rollback: git revert

**Task S1.T2 — KPIs + DataTable + badge/fechas**
- source_ref: REQ-02
- agent: developer
- depends_on: S1.T1
- files: `front/jormat-front/src/components/payments/office/` (listado, carrito, bodega, `calc-office-kpis.ts`, `OFFICE_STATUS_BADGE`)
- validation: tablas via `DataTable`; fechas via `DateDisplay`; estados via badge semantico; KPIs `StatGrid` + 5 `KPICard` sobre universo filtrado; vitest verde
- rollback: git revert

**Task S1.T3 — Crear a RHF + guard + contador + export/print/filtros**
- source_ref: REQ-03
- agent: developer
- depends_on: S1.T2
- files: `front/jormat-front/src/components/payments/office/` (formulario de creacion), `front/jormat-front/src/app/(app)/finanzas/pagos-oficina/`
- validation: RHF + `zodResolver` + `FormField` (errores inline) + `useFieldArray` + `useUnsavedChangesGuard({ when: items>0 })`; contador, export CSV, imprimir, `FilterBar`; vitest verde
- rollback: git revert

**Task S1.T4 — Backend NestJS stub + tests**
- source_ref: REQ-04
- agent: developer
- files: `backend/jormat-api/src/office-payments/`
- validation: `GET /sales?warehouse`, `GET /list`, `POST /` (batch), `GET /:paymentId` bajo `pagos/oficina`; gateado por `payments.offices:view` / `:create`; total server-side `Σ round(pay)`; datos stub coherentes con el schema Zod del front; MSW del front intacto; jest 57 passed (5 suites, office-payments 19) / tsc 0 / eslint 0
- rollback: git revert

**S1.GATE**: quality review (DET-23, tier T2 → standard), self-report verificado independiente por el orquestador (DET-33) sobre front y backend, replacement-audit (DET-40) de los caminos retirados (tablas a mano → DataTable, useState → RHF), decisions del gate registradas.

## Constraints

- No se crea lenguaje visual nuevo: se reusan `StatGrid`, `KPICard`, `DataTable`, `FormField`, `FilterBar` (DET-32). Por eso `draft_approved: skipped`.
- El MSW del front no se toca: coexiste con el backend real (los tests jsdom siguen usando MSW; en dev el front pega al backend via proxy).
- El total del batch se recalcula server-side (`Σ round(pay)`); no se confia en el total enviado por el cliente.
- La persistencia real (inventario / imputacion / saldos, Fase C) queda FUERA de alcance: el store del backend es en memoria (deuda tecnica confirmada).

## Acceptance checkpoints

- [ ] AC-1 (REQ-01): la vista office-payments no referencia tokens inexistentes; los estados de error usan `destructive` y renderizan.
- [ ] AC-2 (REQ-02): tablas via `DataTable` + `DateDisplay` + badge semantico; KPIs `StatGrid` + 5 `KPICard` sobre el universo filtrado.
- [ ] AC-3 (REQ-03): creacion con RHF + `zodResolver` + `FormField` + `useFieldArray` + guard `when: items>0` + contador + export CSV + imprimir + `FilterBar`.
- [ ] AC-4 (REQ-04): backend NestJS stub sirve los 4 endpoints bajo `pagos/oficina`, gateado por `payments.offices:view/create`, total server-side `Σ round(pay)`; jest 57 passed (office-payments 19).
