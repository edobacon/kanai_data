---
id: SPEC-JOR-143-office-payment-validate
project: jormat-evolution
ticket: JOR-143
status: done
---

# Validar pago de sucursal (estados validada/mixta/rechazada) + permiso + contraste del modal

# Validar pago de sucursal (estados validada/mixta/rechazada) + permiso + contraste del modal

## Executive summary — lo que estas aprobando

**Que se hace**: en la vista Pagos de sucursal (office-payments) se agrega la capacidad de **validar** un pago con los tres desenlaces del legacy (Validada / Mixta / Rechazada), gated por una capability nueva `payments.offices:validate`; se arregla el **contraste** del modal "Detalle del pago" y se enriquece su cabecera para paridad con la vista legacy; se crean los **endpoints respectivos con stub** en el backend NestJS; se **endurece el gating** de la ruta crear (de `:view` a `:create`); y se documenta + testea todo.

**Fuente canonica (DET-2)**: el contrato de estados/endpoint/permiso viene del legacy (office-payments-print.html + officePaymentsPrintController.js + officePaymentsServices.js). statusValue: Validada=2, Rechazada=3, Mixta=5.

**Reuso (DET-32)**: sin lenguaje visual nuevo. `Badge`, `Button`, `Can`, `Dialog`, `officeStatusBadge` ya existen; el endpoint de estado y la capability NO existen -> se construyen.

**Deuda tecnica (confirmada)**: el backend es stub (sin persistencia real ni ciclo de imputacion, Fase C). El cambio de estado se sirve en memoria; el contrato (URL, gating, statusValue) queda estable para cuando llegue la persistencia. Se registra en `docs/front/deuda-tecnica.md`.

## Requirements

### REQ-01: Contraste y cabecera del modal de detalle
> Que cambia: los valores de la tabla del modal "Detalle del pago" (documento, forma de pago, pago) pasan a un token de color legible (`text-foreground`), no `muted`; y el modal muestra una cabecera con estado (badge semantico), origen, usuario y total.
> Por que: hoy los valores se pintan con contraste insuficiente (reporte del dev) y el modal no muestra la metadata del pago que el legacy si expone en la vista view.

MUST: los valores de datos del modal MUST usar un token de color con contraste AA (foreground), reservando `muted-foreground` solo para labels/encabezados secundarios.
MUST: el modal MUST mostrar la cabecera del pago: estado (con `Badge` semantico via `officeStatusBadge`), origen, usuario de creacion y total.

<details><summary>Scenarios</summary>

- GIVEN el modal de detalle abierto, WHEN se renderiza la tabla de documentos, THEN documento/forma de pago/pago se leen con contraste AA (no gris tenue).
- GIVEN un pago con estado y metadata, WHEN se abre el modal, THEN se ve el badge del estado + origen + usuario + total en la cabecera.
</details>

### REQ-02: Acciones de validacion gated por capability
> Que cambia: el modal ofrece las acciones Validar / Mixta / Rechazar, visibles solo cuando el pago esta pendiente, y solo para quien tiene `payments.offices:validate`.
> Por que: el legacy permite marcar el desenlace del pago (office-payments-print.html:13-20) y lo gatea con `pago-oficinas-validate`; se traslada al patron RBAC del front nuevo (`Can` / capability `payments.offices:validate`).

MUST: las acciones de validacion MUST envolverse en `<Can cap="payments.offices:validate">`; sin la capability NO se renderizan.
MUST: las acciones MUST mostrarse solo si el estado del pago es pendiente (regla legacy: visibles si `Pendiente ...`, ocultas si `Validada`). Un pago ya validado NO ofrece acciones.
MUST: no introducir la capability por wildcard; se agrega al catalogo (seed 07) para que el grant-all de internal-admin (seed 09) la tome en el reseed.

<details><summary>Scenarios</summary>

- GIVEN un usuario con `payments.offices:validate` y un pago pendiente, WHEN abre el modal, THEN ve Validar / Mixta / Rechazar.
- GIVEN un usuario sin la capability, WHEN abre el modal, THEN NO ve ninguna accion de validacion.
- GIVEN un pago ya Validada, WHEN abre el modal, THEN NO ve acciones (independiente de la capability).
</details>

### REQ-03: Mutacion de estado (front)
> Que cambia: cada accion dispara una mutacion que llama al endpoint de estado con el statusValue correcto y refresca detalle + listado.
> Por que: el estado del pago debe persistir (stub) y reflejarse en la UI sin recarga manual, igual que el resto de mutaciones del modulo (patron `useApiMutation` + invalidate).

MUST: Validar MUST enviar statusValue 2, Mixta MUST enviar 5, Rechazar MUST enviar 3 (fiel al legacy).
MUST: al completar, la mutacion MUST invalidar las queries de detalle y listado (`officePaymentsKeys.detail` + `.list`) y mostrar toast de exito; ante error, toast de error (patron del modulo).
MUST: el estado se identifica por su `statusValue` estable (enum tipado en el schema con mapeo a label/badge), no por el label de texto.

<details><summary>Scenarios</summary>

- GIVEN el modal de un pago pendiente, WHEN se hace click en Rechazar, THEN se llama PATCH con statusValue 3, se invalidan detail+list y sale el toast de exito.
- GIVEN el endpoint responde 4xx/5xx, WHEN se valida, THEN sale toast de error y el estado no cambia en la UI.
</details>

### REQ-04: Endpoint backend de cambio de estado (stub)
> Que cambia: el controlador NestJS `pagos/oficina` publica un endpoint para cambiar el estado del pago, gated por `payments.offices:validate`, con datos stub.
> Por que: "deben crearse los endpoints respectivos con sus stubs"; el front necesita un contrato real detras del proxy en dev.

MUST: nuevo endpoint `PATCH /pagos/oficina/:paymentId/status` (convencion REST del backend nuevo) con body `{ statusValue: number }`; userId lo resuelve el server desde la sesion (como create).
MUST: gated por `@RequireCapability('payments.offices:validate')` bajo el trio de guards existente (AuthGuard -> CapabilitiesHydrationGuard -> CapabilitiesGuard); 403 sin la capability.
MUST: validar statusValue contra el set permitido {2,3,5} (dto); 400 si es invalido. Reflejar el estado en el store en memoria del stub y devolverlo en el detalle.
MUST: marcar el endpoint con `DEUDA_TECNICA_CONFIRMAR` (sin persistencia/ciclo real, Fase C), consistente con JOR-140.

<details><summary>Scenarios</summary>

- GIVEN un token sin `payments.offices:validate`, WHEN PATCH status, THEN 403.
- GIVEN statusValue 2/3/5, WHEN PATCH status, THEN 200 y el detalle refleja el nuevo estado.
- GIVEN statusValue fuera de {2,3,5}, WHEN PATCH status, THEN 400.
</details>

### REQ-05: Capability sembrada
> Que cambia: `payments.offices:validate` se agrega al catalogo de capabilities de pagos (seed 07).
> Por que: el modelo post-JOR-033 no usa wildcard; toda capability vive en el catalogo y el grant-all de internal-admin (seed 09) la toma en el reseed.

MUST: `payments.offices:validate` MUST existir en `seeds/07_payments_capabilities.ts` junto a `:view` / `:create`, con su descripcion.

<details><summary>Scenarios</summary>

- GIVEN un reseed no-prod, WHEN corre el seed 09, THEN internal-admin queda con `payments.offices:validate`.
</details>

### REQ-06: Endurecer el gating de la ruta crear
> Que cambia: la ruta `/finanzas/pagos-oficina/crear` (OfficePaymentCreateView) pasa de `RouteGuard cap="payments.offices:view"` a `payments.offices:create`.
> Por que: hoy el form de creacion es alcanzable con solo `:view` (solo el submit exige `:create`); crear un pago debe estar bajo permiso desde la ruta, no solo en el boton.

MUST: el `RouteGuard` de la vista crear MUST exigir `payments.offices:create`; el gating del submit `:create` se conserva (defensa en profundidad).
MUST: verificar que ningun consumidor dependa del comportamiento previo (`:view` alcanza el form) — analisis de impacto colateral.

<details><summary>Scenarios</summary>

- GIVEN un usuario con `:view` pero sin `:create`, WHEN navega a `/crear`, THEN el RouteGuard lo bloquea (no ve el form).
</details>

### REQ-07: Docs + tests
> Que cambia: se documenta el flujo de validacion + la capability en `docs/front/payments.md`, se registra la deuda del endpoint stub en `docs/front/deuda-tecnica.md`, y se cubre con tests front + backend.
> Por que: DET-37 (completitud docs+tests) y el pedido explicito del dev.

MUST: `docs/front/payments.md` MUST describir estados (validada/mixta/rechazada), la capability `payments.offices:validate` y el gating de crear.
MUST: `docs/front/deuda-tecnica.md` MUST registrar el endpoint de estado como stub (origen, que falta).
MUST: tests front (contraste/cabecera, visibilidad+gating de acciones, mutacion con statusValue) + backend (endpoint gated 403/200/400, capability en catalogo) verdes, incluyendo el proyecto storybook.

## Tasks

| Task | Descripcion | Archivos (aprox) | Rollback |
|------|-------------|------------------|----------|
| S1.T1 | Backend: endpoint `PATCH /:paymentId/status` (dto con set {2,3,5}, cap `payments.offices:validate`, store en memoria, DEUDA_TECNICA_CONFIRMAR) + spec; seed 07 agrega la capability | backend/jormat-api/src/office-payments/{controller,service,module,dto}, *.spec.ts; seeds/07_payments_capabilities.ts | revertir archivos backend + quitar la cap del seed |
| S1.T2 | Front data-layer: enum de estado (statusValue) en schema, tipo, service `changeOfficePaymentStatus`, hook `useChangeOfficePaymentStatus`, handler MSW | lib/schemas/office-payments.ts, types/office-payments.ts, services/api/payments/offices.ts, hooks/useOfficePayments.ts, test/msw/handlers/office-payments.ts | revertir data-layer |
| S1.T3 | Modal: contraste (foreground en valores) + cabecera (estado/origen/usuario/total) + acciones Validar/Mixta/Rechazar gated por `<Can>` y visibles solo si pendiente + wire de la mutacion; badge para "Mixta"/femeninos en OFFICE_STATUS_BADGE; RouteGuard de crear -> `:create` | components/payments/office/OfficePaymentsListView/OfficePaymentsListView.tsx, lib/schemas/office-payments.ts, app/(app)/finanzas/pagos-oficina/crear (o CreateView) | revertir modal + RouteGuard |
| S1.T4 | Tests + stories + docs | *.test.tsx, *.stories.tsx, docs/front/payments.md, docs/front/deuda-tecnica.md | revertir tests/docs |
| S1.GATE | Quality review T2 + dual-judge (money) + self-report verificado (DET-33) con la suite storybook incluida | — | — |

## Acceptance

- [ ] REQ-01: valores del modal en foreground (AA) + cabecera con estado/origen/usuario/total.
- [ ] REQ-02: acciones gated por `payments.offices:validate` y visibles solo si pendiente.
- [ ] REQ-03: mutacion con statusValue 2/5/3 + invalidate detail+list + toasts.
- [ ] REQ-04: endpoint `PATCH /:paymentId/status` gated (403/200/400) con DEUDA_TECNICA_CONFIRMAR.
- [ ] REQ-05: `payments.offices:validate` en el seed 07 (grant-all a internal-admin).
- [ ] REQ-06: RouteGuard de crear exige `:create`.
- [ ] REQ-07: docs (payments.md + deuda-tecnica.md) + tests front/backend verdes (incl. storybook), tsc/eslint 0.
