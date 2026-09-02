---
id: SPEC-frontend-transversal-flow-rules
project: jormat-evolution
ticket: JOR-056
status: done
---

# B2.2 · Reglas transversales de flujo: guard de cambios, confirmaciones y cierres

# B2.2 · Reglas transversales de flujo: guard de cambios, confirmaciones y cierres

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Fijar **una vez** las reglas de flujo que hoy cada vista resolveria distinto, sobre el shell y la navegacion ya cableados por JOR-055, **sin tocar modelo de datos**. Cuatro frentes: (a) **Guard de cambios sin guardar (DC-1, OBLIGATORIO)** — si un form de crear/editar esta *dirty*, **cualquier** intento de salir se intercepta y advierte; (b) **dialogo "Perderas los cambios"** con Cancelar (quedarse) / Confirmar (salir) [+ Guardar borrador en builders]; (c) **confirmaciones destructivas** reusando el `ConfirmDialog` existente (eliminar pago, eliminar linea con datos); (d) **regla de cierre** consistente (crear/emitir → listado + `toast.success`) y limpieza de los `toast.info('no implementado')` de los caminos que se cablean.

Es **~50% reuso**: el `ConfirmDialog` (variante destructive) ya existe y se usa en `config/users`; sonner, RHF y el shell ya estan. El trabajo **neto** es el guard de navegacion — que en App Router **no** tiene equivalente nativo (a diferencia de Pages Router con `router.events`) y hay que construir interceptando anclas (capture-phase) + `popstate` + `beforeunload`.

### 2. Decisiones criticas

| # | Decision | Racional (1 linea) |
|---|----------|--------------------|
| 1 | **Interceptar por click de ancla (capture-phase) + `popstate` + `beforeunload`**, NO envolver `router.push` | El sidebar/breadcrumb navegan con `next/link` (`<a>`); los botones Cancelar/Salir son programaticos y llaman al helper explicito. No existe un hook nativo de bloqueo en App Router. |
| 2 | **Provider central (`NavigationGuardProvider`) + hook (`useUnsavedChangesGuard`)**, un solo dialogo montado en el shell | Una sola fuente de verdad del estado "dirty + pendiente de navegar"; las vistas solo registran su `when`/`onSaveDraft`. Evita N listeners duplicados. |
| 3 | **`UnsavedChangesDialog` nuevo (3 acciones) reusando el primitivo `Dialog`**; `ConfirmDialog` (2 acciones) se reusa tal cual para destructivas | El guard necesita una 3a accion (Guardar borrador) que `ConfirmDialog` no tiene; separar mantiene `ConfirmDialog` simple y reusa el primitivo base. |
| 4 | **"Guardar borrador" solo aparece cuando la vista provee `onSaveDraft`** (builders 03/08). ItemCreateForm/EfectuarPago → solo Quedarse/Salir | ItemCreateForm no tiene hook de borrador (su `toast.info` queda hasta su ticket); ofrecer una accion muerta seria peor UX. |
| 5 | **"Anular documento" (02) se DIFIERE** — no es un confirm simple | Es flujo formal con motivo (open-question §A, DEC+BE) y **no hay endpoint**. El `ConfirmDialog` destructive queda listo para cuando su flujo se decida. |
| 6 | **Regla de cierre = convencion documentada, NO un helper nuevo** | JOR-055 ya cablea el post-exito de ventas inline; abstraer ~3 call-sites es over-engineering (DET-32 reduce). Se documenta el patron y se quitan los `toast.info` cableados. |

### 3. Riesgos principales y como los mitigamos

- **Romper navegacion legitima** (el interceptor traga clicks que no deberia) → el listener solo actua si hay guard activo (`when === true`), el target es un `<a>` con href in-app distinto del actual, sin modificador (ctrl/meta/target=_blank). Tests de cada rama.
- **`popstate` no es cancelable** → patron sentinel: al activarse el guard se hace `history.pushState` de un marcador; en `popstate` se re-empuja y se abre el dialogo; al confirmar se hace el `back()` real. Test del ciclo.
- **`beforeunload` no permite copy custom** → se acepta el prompt nativo del browser (limitacion conocida); el test verifica `preventDefault()`/`returnValue`.
- **Caida de coverage <90** (RULE-testing-coverage-threshold-002) → cada cambio trae su test en la misma task (DET-7); el hook/provider se testean por vector.
- **Leak entre vistas** (guard de una vista sigue activo en otra) → el hook limpia el registro en `useEffect` cleanup; test de desmontaje.

### 4. Que NO se hace (limites de scope)

- **Anular documento (02)** → diferido (flujo formal con motivo, DEC+BE). El `ConfirmDialog` queda disponible.
- **Persistencia real de "Guardar borrador"** → se invoca el hook de draft existente (builders); no se crea modelo ni hook nuevo. ItemCreateForm conserva su `toast.info` de borrador.
- **Post-exito de compras (factura proveedor)** → JOR-060 (listado AP inexistente).
- **Quitar TODOS los `toast.info('no implementado')`** → solo los de los caminos cableados aqui (Cancelar/Salir). Editar/Duplicar/CSV/Ver-detalle/Anular siguen hasta su ticket.
- **Backend / modelo de datos / MSW nuevo** → fuera de alcance (no toca DB).

### 5. Tamano estimado

**2 sessions (~3-4h)**, tier T2 cada una. La sensible es **S1** (infra del guard): vive en el shell, intercepta navegacion global y concentra el riesgo. S2 (wire-in en 4 forms + 2 destructivas + cierre + docs) es mas mecanica una vez existe la infra.

### 6. Como vas a saber que funciona

- En un builder con cambios: pulsar Cancelar, click en el sidebar, back del navegador o cerrar la pestana → aparece "Perderas los cambios" (los 3 primeros) / prompt del browser (el ultimo). Con el form limpio: sale sin friccion.
- En un builder dirty el dialogo ofrece **Guardar borrador**; en alta de item / pago, no.
- Eliminar un pago o una linea con datos pide confirmacion (variante destructive) antes de borrar; una linea vacia se borra directo.
- Tras emitir/crear se vuelve al listado con `toast.success`; los `toast.info('no implementado')` de Cancelar/Salir desaparecen.
- Suite vitest dual-project verde, coverage ≥90.

## Purpose

Establece las reglas de flujo transversales del frontend para el operador del sistema: protege contra perdida de datos al salir de un form con cambios (DC-1, obligatorio), unifica el patron de confirmacion destructiva y fija la regla de cierre de los flujos de creacion/emision. Es la base de Fase 0 del `wiring-plan` sobre la que el resto de la Capa B2 (JOR-058/059/060) apoya sus interacciones, evitando que cada vista reimplemente guard, confirmacion y cierre de forma divergente.

## Requirements

### REQ-01: Guard de cambios sin guardar — interceptacion transversal de todos los vectores (DC-1)

> **Que cambia**: cuando un formulario de crear/editar tiene cambios sin guardar, salir de la vista deja de ser silencioso: se intercepta y se pide confirmacion. Antes no habia ninguna proteccion.
> **Por que**: DC-1 (decision cerrada 2026-06-29) lo declara obligatorio y transversal; perder datos por un click accidental es el peor fallo de UX de los builders.

El sistema MUST proveer un hook `useUnsavedChangesGuard({ when, onSaveDraft? })` y un `NavigationGuardProvider` (montado en el shell) que, cuando `when === true`, intercepten **todos** los vectores de salida: (1) **click en un ancla in-app** (`<a href>` del sidebar/breadcrumb/cualquier `next/link`) via listener capture-phase → `preventDefault` + abrir dialogo; (2) **back/forward del navegador** (`popstate`) via patron sentinel → abrir dialogo y, al confirmar, ejecutar la navegacion real; (3) **cierre/recarga de pestana** (`beforeunload`) → `event.preventDefault()` (prompt nativo del browser); (4) **navegacion programatica** de botones (Cancelar/Salir) via un helper expuesto que abre el dialogo si `when`, o navega directo si no. Cuando `when === false` (form limpio) MUST permitir salir sin friccion. El hook MUST limpiar su registro al desmontarse (sin leak entre vistas). El interceptor de anclas MUST ignorar clicks con modificador (ctrl/meta/shift), `target="_blank"`, hrefs externos y el href de la ruta actual.

<details><summary>Scenarios de validacion</summary>

#### Scenario: ancla del sidebar interceptada con form dirty
- **GIVEN** un form registrado con `when: true`
- **WHEN** el usuario hace click en un item del sidebar (`<a href="/inventario/items">`)
- **THEN** el click se previene, se abre el dialogo y NO se navega; al confirmar "Salir" se navega a `/inventario/items`

#### Scenario: back del navegador interceptado
- **GIVEN** guard activo (`when: true`)
- **WHEN** se dispara `popstate` (boton back)
- **THEN** se re-empuja el estado y se abre el dialogo; al confirmar se ejecuta el `history.back()` real

#### Scenario: beforeunload con cambios
- **GIVEN** guard activo
- **WHEN** se dispara el evento `beforeunload`
- **THEN** se llama `event.preventDefault()` y se setea `returnValue` (el browser muestra su prompt)

#### Scenario: form limpio sale sin friccion
- **GIVEN** un form con `when: false`
- **WHEN** el usuario pulsa Cancelar o hace click en el sidebar
- **THEN** navega directo, sin dialogo

#### Scenario: cleanup al desmontar
- **GIVEN** una vista con guard montado y `when: true`
- **WHEN** la vista se desmonta
- **THEN** los listeners se remueven y una navegacion posterior no abre el dialogo

</details>

### REQ-02: Dialogo "Perderas los cambios" con tres acciones

> **Que cambia**: el dialogo de salida ofrece Cancelar (quedarse), Confirmar (salir y descartar) y, en builders, Guardar borrador.
> **Por que**: el flujo del usuario necesita una salida que no descarte (guardar borrador) ademas de quedarse o descartar.

El sistema MUST renderizar un `UnsavedChangesDialog` (reusando el primitivo `Dialog`) con titulo "Perderas los cambios", las acciones **Cancelar** (cierra el dialogo, permanece en la vista) y **Salir sin guardar** (variante destructive: descarta y ejecuta la navegacion pendiente), y MUST mostrar una tercera accion **Guardar borrador** unicamente cuando la vista provea `onSaveDraft`. "Salir sin guardar" MUST limpiar el guard antes de navegar (para no re-disparar la interceptacion). El dialogo MUST ser unico (montado en el provider), no uno por vista.

<details><summary>Scenarios de validacion</summary>

#### Scenario: tres acciones en builder
- **GIVEN** el guard con `onSaveDraft` provisto
- **WHEN** se abre el dialogo
- **THEN** se ven Cancelar, Salir sin guardar y Guardar borrador

#### Scenario: dos acciones sin onSaveDraft
- **GIVEN** el guard sin `onSaveDraft`
- **WHEN** se abre el dialogo
- **THEN** se ven solo Cancelar y Salir sin guardar

#### Scenario: Guardar borrador no descarta
- **GIVEN** dialogo abierto en builder dirty
- **WHEN** se pulsa Guardar borrador
- **THEN** se invoca `onSaveDraft` y el guard NO descarta los cambios (la navegacion la decide `onSaveDraft`)

</details>

### REQ-03: Guard cableado en los forms de crear/editar (Cancelar/Salir)

> **Que cambia**: Cancelar (ventas) y Salir (compras) dejan de mostrar `toast.info('no implementado')` y pasan por el guard; alta de item y form de pago tambien protegen su salida si hay datos.
> **Por que**: son los caminos donde el usuario ingresa datos; sin guard, un click pierde el trabajo (Fase 1.5/1.7, diferidas de JOR-055 a este ticket).

El sistema MUST cablear `useUnsavedChangesGuard` en TransactionBuilder (Cancelar `:195`, `onSaveDraft` = `handleSaveDraft`), PurchaseInvoiceBuilder (Salir `:168`, `onSaveDraft` = crear borrador), ItemCreateForm (Cancelar/salida, **sin** `onSaveDraft`) y EfectuarPagoForm (salida del form de nuevo pago, sin `onSaveDraft`), usando `formState.isDirty` de RHF como `when` (o el equivalente de estado en EfectuarPago). MUST reemplazar el `toast.info('Cancelar …')` / `toast.info('Salir …')` por la navegacion guardada al listado de origen (`/ventas/documentos`, listado correspondiente). El gating `<Can>` existente MUST preservarse.

<details><summary>Scenarios de validacion</summary>

#### Scenario: Cancelar en ventas con cambios abre guard
- **GIVEN** TransactionBuilder con una linea agregada (dirty)
- **WHEN** se pulsa Cancelar
- **THEN** se abre el dialogo (3 acciones); al confirmar Salir → `router.push('/ventas/documentos')`; ya NO hay `toast.info`

#### Scenario: Salir en compras con cambios abre guard
- **GIVEN** PurchaseInvoiceBuilder dirty
- **WHEN** se pulsa Salir
- **THEN** dialogo con Guardar borrador disponible; ya NO hay `toast.info`

#### Scenario: alta de item sin cambios sale directo
- **GIVEN** ItemCreateForm pristine
- **WHEN** se cancela
- **THEN** navega al listado sin dialogo (y sin opcion Guardar borrador)

</details>

### REQ-04: ConfirmDialog reutilizable para acciones destructivas (eliminar pago, eliminar linea con datos)

> **Que cambia**: eliminar un pago o una linea con datos pide confirmacion antes de borrar; hoy borran directo.
> **Por que**: son operaciones destructivas (Fase 2.1/2.2); el `ConfirmDialog` (patron modal 07) ya existe y debe reusarse, no reinventarse.

El sistema MUST usar el `ConfirmDialog` existente (variante `confirmVariant: 'destructive'`) para confirmar: (a) **eliminar pago** (flujo 10) antes del `deletePayment.mutate()` / `DELETE`; (b) **eliminar linea con datos** (flujos 03/08, `LineItemsTable`) — si la linea tiene contenido (item/cantidad/precio), confirmar; si esta vacia, `remove(index)` directo. El `DELETE`/`remove` MUST ejecutarse solo al confirmar. El `ConfirmDialog` MAY extenderse con un prop opcional `icon`/tono para alinear con "variando icono/color" del requerimiento, sin romper sus consumidores actuales (`config/users`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: eliminar pago pide confirmacion
- **GIVEN** un pago en la lista (flujo 10)
- **WHEN** se pulsa eliminar
- **THEN** aparece ConfirmDialog destructive; el `deletePayment` corre solo al confirmar

#### Scenario: eliminar linea con datos confirma; linea vacia no
- **GIVEN** una linea con item/cantidad y otra vacia
- **WHEN** se elimina cada una
- **THEN** la que tiene datos abre ConfirmDialog; la vacia se remueve directo

#### Scenario: consumidores existentes intactos
- **GIVEN** `config/users` usa ConfirmDialog
- **WHEN** se extiende el componente (icon opcional)
- **THEN** su comportamiento no cambia (prop opcional, default sin icono)

</details>

### REQ-05: Regla de cierre consistente + limpieza de placeholders cableados

> **Que cambia**: se fija la convencion "crear/emitir → listado de origen + `toast.success`" y se eliminan los `toast.info('no implementado')` de los caminos que este ticket cablea.
> **Por que**: cerrar el ciclo del usuario (Fase 0.1/0.4); evitar que cada vista invente su cierre.

El sistema MUST documentar y aplicar la convencion de cierre: tras una mutacion de creacion/emision exitosa, `toast.success` + `router.push` al listado de origen. La navegacion post-exito de **ventas** ya esta cableada (JOR-055) y MUST conservarse; **compras** se mantiene en `toast.success` sin navegar (listado AP → JOR-060). El sistema MUST eliminar unicamente los `toast.info('no implementado')` de los caminos cableados en este ticket (Cancelar/Salir). Los demas placeholders (Editar/Duplicar/CSV/Ver detalle/Anular) MUST permanecer hasta su ticket.

<details><summary>Scenarios de validacion</summary>

#### Scenario: post-exito de ventas conserva navegacion + toast
- **GIVEN** TransactionBuilder, emision exitosa (cableado por JOR-055)
- **WHEN** resuelve `onSuccess`
- **THEN** `toast.success` + `router.push('/ventas/documentos')` (no regresion)

#### Scenario: placeholders no cableados intactos
- **GIVEN** "Anular documento" / "Editar item"
- **WHEN** se pulsan
- **THEN** siguen mostrando su `toast.info` (fuera de alcance)

</details>

## Constraints

- **DC-1** (`ongoing/flows/README.md`, cerrada 2026-06-29): guard de cambios obligatorio y transversal, todos los vectores de salida.
- **DEC-003 / DEC-006**: taxonomia de nav y modelo de capabilities — se respetan, no se redefinen.
- **RULE-frontend-001**: carpeta-por-componente con test + story co-locados (hook/provider/dialog nuevos).
- **RULE-frontend-002**: los tests codifican el comportamiento; al cambiarlo se reescriben en la misma task (DET-7).
- **RULE-testing-coverage-threshold-002**: coverage ≥90, no debe caer.
- **RULE-global-005**: dejar veredicto de docs y tests al cierre.
- App Router (Next 14): no hay `router.events`; la interceptacion es por DOM (capture click) + History API (`popstate`/`beforeunload`).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-frontend-sidebar-canonical-nav (JOR-055, done) | internal | Sidebar/breadcrumb/post-exito de ventas cableados; Cancelar/Salir + guard diferidos a este ticket (DEC-LOCAL-02) | Base del wire-in; sin merge a main → 056 ramifica de la branch de 055 |
| ConfirmDialog (`components/ui/confirm-dialog/`) | internal | Componente destructive reutilizable existente | Reuse; extension `icon` opcional no debe romper `config/users` |
| Primitivo Dialog (`components/ui/dialog/`) | internal | Base del UnsavedChangesDialog | — |
| react-hook-form 7.79 | external | `formState.isDirty` como senal de `when` | Forms no-RHF (EfectuarPago) usan estado equivalente |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El interceptor de anclas traga clicks legitimos (links externos, nueva pestana) | medium | high | Guard solo si `when`; filtra modificadores/`target`/externos/ruta actual; test por rama |
| `popstate` no cancelable deja la URL desincronizada | medium | medium | Patron sentinel (pushState marcador + re-push en popstate); test del ciclo back→dialogo→confirmar |
| Leak de guard entre vistas | medium | medium | Cleanup en `useEffect`; test de desmontaje |
| Caida de coverage <90 al introducir hook/provider | medium | medium | Test por vector en la misma task (DET-7); `--coverage` en cada GATE |
| `beforeunload` testeable solo parcialmente en jsdom | low | low | Test del handler (preventDefault/returnValue), no del prompt del browser |

## Tasks

### Session 1 — Guard de cambios: hook + provider + dialogo [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `UnsavedChangesDialog`: dialogo (reusa `Dialog`) con titulo "Perderas los cambios", acciones Cancelar / Salir sin guardar (destructive) / Guardar borrador (condicional a `onSaveDraft`) | REQ-02 | developer | — | front/jormat-front/src/components/ui/unsaved-changes-dialog/unsaved-changes-dialog.tsx (+ .stories.tsx) | vitest | git revert | DET-1, DET-2, DET-8, DET-16 | pending | 1 |
| S1.T2 | `NavigationGuardProvider` + `useUnsavedChangesGuard`: estado central (when/onSaveDraft/pending), listeners capture-click + popstate (sentinel) + beforeunload, helper `requestLeave(proceed)`, cleanup | REQ-01 | developer | S1.T1 | front/jormat-front/src/components/shell/navigation-guard/NavigationGuardProvider.tsx, .../navigation-guard/useUnsavedChangesGuard.ts, .../navigation-guard/index.ts | vitest | git revert | DET-1, DET-2, DET-8, DET-16 | pending | 1 |
| S1.T3 | Montar el provider en el shell (envuelve el contenido protegido) sin romper SSR/hydration | REQ-01 | developer | S1.T2 | front/jormat-front/src/components/shell/AppShell/AppShell.tsx (o app/(app)/layout.tsx) | vitest (shell) + build | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T4 | Tests: UnsavedChangesDialog (3/2 acciones) + provider/hook por vector (ancla, popstate, beforeunload, programatico, form-limpio, cleanup) | REQ-01, REQ-02 | developer | S1.T2, S1.T3 | front/jormat-front/src/components/ui/unsaved-changes-dialog/unsaved-changes-dialog.test.tsx, .../shell/navigation-guard/*.test.tsx | vitest --coverage (≥90) | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2): persistir + quality review (DET-23, 10 dims) + dual-judge (DET-35) + coverage delta + dkc-mutate async (DET-31) + self-report-verification (DET-33) | — | reviewer | S1.T4 | tickets/JOR-056.md | gate persistido + vitest --coverage verde | — | DET-20, DET-23, DET-31, DET-33, DET-35 | pending | 1 |

### Session 2 — Wire-in en forms + destructivas + cierre + docs [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Cablear guard en TransactionBuilder (Cancelar `:195` → guard + onSaveDraft=handleSaveDraft → push `/ventas/documentos`; quitar toast.info) y conservar post-exito de ventas | REQ-03, REQ-05 | developer | — | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx | vitest (TransactionBuilder) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T2 | Cablear guard en PurchaseInvoiceBuilder (Salir `:168` → guard + onSaveDraft; quitar toast.info) y en ItemCreateForm (Cancelar/salida, sin onSaveDraft) | REQ-03 | developer | — | front/jormat-front/src/components/compras/builder/PurchaseInvoiceBuilder.tsx, front/jormat-front/src/components/items/create/ItemCreateForm/ItemCreateForm.tsx | vitest (ambos) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T3 | Confirmaciones destructivas: eliminar pago (10) y eliminar linea con datos (03/08) reusando ConfirmDialog destructive; guard en EfectuarPagoForm | REQ-04, REQ-03 | developer | — | front/jormat-front/src/components/payments/**, front/jormat-front/src/components/**/LineItemsTable*, front/jormat-front/src/components/payments/detail/EfectuarPagoForm/EfectuarPagoForm.tsx | vitest (payments/lineitems) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T4 | Tests de wire-in (guard en los 4 forms, destructivas con/sin datos, cierre) + actualizar tests que asumian el toast.info | REQ-03, REQ-04, REQ-05 | developer | S2.T1, S2.T2, S2.T3 | front/jormat-front/src/components/**/*.test.tsx (builders/payments/lineitems) | vitest --coverage (≥90) | git revert | DET-7, DET-13 | pending | 2 |
| S2.T5 | Docs: `jormat_docs/frontend/` — patron de guard (useUnsavedChangesGuard/provider), UnsavedChangesDialog, ConfirmDialog destructive y convencion de cierre (desde `ongoing/flows/wiring-plan.md`) | REQ-05 | developer | S2.T4 | jormat_docs/frontend/ (nuevo o seccion en shell.md) | revision manual | git revert | DET-16 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2): persistir + quality review + dual-judge + coverage + dkc-mutate async + veredicto docs/tests (RULE-global-005) | — | reviewer | S2.T5 | tickets/JOR-056.md | gate persistido + suite verde + coverage ≥90 | — | DET-20, DET-23, DET-31, DET-33, DET-35 | pending | 2 |

## Technical reference

- **App Router intercept** (no `router.events`): listener `document.addEventListener('click', handler, true)` (capture). En el handler: `const a = (e.target as HTMLElement).closest('a')`; ignorar si `!a?.href`, externo (`new URL(a.href).origin !== location.origin`), `a.target === '_blank'`, `e.metaKey||e.ctrlKey||e.shiftKey`, o href === ruta actual. Si pasa y `when` → `e.preventDefault(); e.stopPropagation();` guardar `pendingHref` y abrir dialogo. Al confirmar: limpiar guard + `router.push(pendingHref)`.
- **popstate sentinel**: al activar el guard, `history.pushState(MARKER, '')`. En `popstate`: si `when`, `history.pushState(MARKER, '')` (re-empuja) + abrir dialogo; al confirmar, remover guard + `history.back()` (esta vez no se re-empuja).
- **beforeunload**: `const h = (e) => { if (when) { e.preventDefault(); e.returnValue = ''; } }`; add/remove en `useEffect` segun `when`.
- **RHF dirty**: `const { formState: { isDirty } } = useForm(...)`; pasar `when: isDirty` al hook. EfectuarPago: usar el estado de su form de nuevo pago.
- **ConfirmDialog**: `components/ui/confirm-dialog/confirm-dialog.tsx` (props 15-28: `open`, `title`, `description?`, `confirmLabel?`, `cancelLabel?`, `confirmVariant?: 'default'|'destructive'`, `isPending?`, `onConfirm`, `onOpenChange`). Patron: estado de modal en el padre, `onConfirm` corre la mutacion, `onSuccess` → toast + `onOpenChange(false)`.
- **Toast**: `import { toast } from '@/components/ui/toaster'` (re-export de sonner). Toaster montado en `app/(app)/layout.tsx:23`.
- **Test mocks**: `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => '...' }))`; `vi.mock('sonner', ...)`; Wrapper QueryClientProvider; auth store via `useAuthStore.setState()`.
- **Call-sites con `toast.info('no implementado')`**: TransactionBuilder `:195` (Cancelar), PurchaseInvoiceBuilder `:168` (Salir), ItemCreateForm `:188` (Guardar borrador — se conserva), DocumentosTable `:143` (Anular — diferido), DocumentosListView `:155` (Ver detalle — fuera de alcance), LineItemsTable `:291`, ItemsTable/ItemDetailModal/ItemsListView (varios — fuera de alcance).

## Open questions

(ninguna bloqueante — anular documento queda explicitamente diferido, ver Decisions)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Interceptacion por DOM/History, no por wrapper de router
- **Contexto**: App Router (Next 14) no expone `router.events` ni un hook de bloqueo de navegacion.
- **Drivers**: cubrir todos los vectores de DC-1 con la minima superficie; el sidebar/breadcrumb usan `next/link` (anclas), no `router.push`.
- **Opcion elegida**: listener capture-phase de clicks de ancla + `popstate` (sentinel) + `beforeunload`; los botones programaticos llaman a un helper explicito.
- **Alternativas**: (a) envolver `router.push` global → no cubre anclas ni back; (b) Next middleware → server-side, no aplica a navegacion cliente; (c) libreria externa → dependencia nueva para algo acotado (DET-32 drop).
- **Consecuencias**: codigo propio testeable por vector; limitacion conocida de `beforeunload` (copy nativo).
- **Session**: design.

### DEC-LOCAL-02: UnsavedChangesDialog separado de ConfirmDialog
- **Contexto**: el guard necesita 3 acciones (Quedarse/Salir/Guardar borrador); ConfirmDialog tiene 2.
- **Opcion elegida**: componente nuevo `UnsavedChangesDialog` reusando el primitivo `Dialog`; `ConfirmDialog` se reusa tal cual para destructivas.
- **Alternativas**: extender ConfirmDialog a N acciones → complica su API y sus consumidores actuales.
- **Consecuencias**: dos componentes simples > uno complejo; reuso del primitivo base.
- **Session**: design.

### DEC-LOCAL-03: "Anular documento" (02) diferido
- **Contexto**: el Request lista anular como destructiva, pero es flujo formal con motivo (open-question §A, DEC+BE) y no hay endpoint.
- **Opcion elegida**: diferir el wire-in de anular; entregar el `ConfirmDialog` destructive listo para reusar cuando su flujo se decida.
- **Alternativas**: wirear un confirm simple ahora → confirma una accion sin backend (peor que el toast.info actual) y se rehace al definir el flujo formal.
- **Consecuencias**: scope mas limpio; anular se retoma en su ticket. No reescribe el Request (DET-3): es decision de alcance documentada.
- **Session**: design.

### DEC-LOCAL-04: Regla de cierre = convencion, sin helper nuevo
- **Contexto**: JOR-055 ya cabla el post-exito de ventas inline; ~3 call-sites.
- **Opcion elegida**: documentar la convencion (toast.success + push al listado) y quitar los toast.info cableados; sin abstraccion nueva (DET-32 reduce).
- **Alternativas**: helper `navigateOnSuccess` → over-engineering para 3 sitios; se reconsidera si crecen.
- **Session**: design.

## Backlog

| # | Item | Priority | Status | Origen |
|---|------|----------|--------|--------|
| B1 | Cablear "Anular documento" (02) cuando se decida su flujo formal (motivo + estado SII) y exista endpoint — reusar ConfirmDialog destructive | should | open | DEC-LOCAL-03 (diferido) |
| B2 | Persistencia real de "Guardar borrador" en ItemCreateForm (hoy sin hook de draft) | could | open | DEC-LOCAL (REQ-03) |
| B3 | Heredar de JOR-055 B1: test de regresion "Guardar borrador NO navega" en TransactionBuilder | should | resuelto por JOR-154 (2026-08-18) | SPEC-frontend-sidebar-canonical-nav B1. Test agregado en S1.T3 (commit `d9855d4`, TC3 del coverage map). |
| B4 | Correr dkc-mutate jsdom-only (excluir el proyecto storybook/browser que timeoutea el dry-run de Stryker en el worktree) sobre el diff del guard | should | re-rutear: JOR-154 corrio dkc-mutate jsdom-only solo sobre useIdleTimer (BL-01 de transversal-behaviors), no sobre el diff del guard de navegacion de TransactionBuilder que pide este item | S1/S2 gate (DET-31 inconcluso por tooling). El guard solo recibio un test unitario nuevo (S1.T3), sin corrida de mutation que lo confirme. |

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan.
- [ ] **Tests**: vitest dual-project verde; coverage ≥90 (no cae).
- [ ] **Rules**: RULE-frontend-001/002 (test+story co-locados; tests reescritos al cambiar comportamiento); ConfirmDialog reusado, no duplicado.
- [ ] **Integration**: guard no rompe navegacion legitima ni post-exito de ventas (JOR-055); `config/users` ConfirmDialog intacto.
- [ ] **Docs**: patron de guard/ConfirmDialog/cierre documentado en `jormat_docs/frontend/` (RULE-global-005); veredicto `docs:`/`tests:` registrado al cierre.
