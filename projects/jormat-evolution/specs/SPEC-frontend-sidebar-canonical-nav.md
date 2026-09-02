---
id: SPEC-frontend-sidebar-canonical-nav
project: jormat-evolution
ticket: JOR-055
status: done
---

# B2.1 · Sidebar canónico + cableado de navegación entre vistas

# B2.1 · Sidebar canónico + cableado de navegación entre vistas

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Aplicar el **menú canónico** (Alternativa B, `sidebar-canonical.md`) sobre el shell ya existente y **cablear la navegación muerta** entre las vistas con maqueta, sin tocar modelo de datos. Tres frentes: (a) **acotar el sidebar** a una vista por módulo y tratar Crear/Editar/Detalle como **hijas ocultas** (no items de menú); (b) **gatear el Home por capabilities** (hoy filtra solo por `hasView`); (c) **conectar** los botones que hoy son `toast.info('no implementado')` a su ruta real.

Es **~70% reuso**: el sidebar ya gatea items por capability, `<Can>`/`can()` ya existen, y el breadcrumb ya está centralizado y auto-derivado de la nav (JOR-037). El trabajo neto es podar/reorganizar `nav-data.ts`, llevar el gating por capability al Home, y wirear 3 handlers.

### 2. Decisiones críticas

| # | Decisión | Racional (1 línea) |
|---|----------|--------------------|
| 1 | **Hijas ocultas vía flag `hidden?: boolean` en `NavItem`**, no quitándolas de `NAV_ENTRIES` | El breadcrumb deriva labels de `NAV_ENTRIES`; si se borran, el breadcrumb de `/ventas/crear-factura` pierde su label. `hidden` las excluye del menú/Home pero las mantiene resolubles |
| 2 | **Omitidos sin maqueta se ELIMINAN de `nav-data.ts`** (no se dejan como "Próximamente") | El canónico §Omitidos los saca del menú; no tienen ruta ni vista. Dejarlos disabled contradice el canónico y suma ruido |
| 3 | **Perfil/Empresa del AccountMenu → deshabilitados** (no crear stub de ruta) | Las rutas `/configuracion/*` no existen (404 hoy). Deshabilitar es honesto y de menor alcance que crear páginas vacías; se habilitan cuando exista su vista (follow-up) |
| 4 | **Cancelar/Salir de los builders se DIFIEREN a JOR-056** | Fase 1.5/1.7 dependen del guard de cambios sin guardar (DC-1, Fase 0.2) que es alcance de 056. Wirear nav sin guard abre una ventana de pérdida de datos que 056 rehace de inmediato → doble trabajo + riesgo |
| 5 | **Post-éxito de Compras (factura proveedor) queda en toast** | El listado AP destino no existe aún (lo construye JOR-060). Navegar requeriría una ruta inexistente; se mantiene `toast.success` (intermedio) y se wirea en 060 |

### 3. Riesgos principales y como los mitigamos

- **Gatear por capability deja la nav vacía** → descartado por verificación multi-capa (H1): caps seedeadas (04-08) + `internal-admin` grant-all (seed 09) → el demo user las tiene todas. Test con caps y **sin** caps (degradación limpia).
- **Romper el breadcrumb de las hijas ocultas** → el flag `hidden` las conserva en `NAV_ENTRIES`; `buildCrumb` las sigue resolviendo. TC-4 lo verifica explícitamente.
- **Caída de coverage <90** (RULE-testing-coverage-threshold-002) → cada cambio de comportamiento trae su test en la misma task (DET-7); los tests existentes de Sidebar/Home/AccountMenu se actualizan a la estructura canónica (regresión esperada, no fallo).

### 4. Que NO se hace (límites de scope)

- **Guard de cambios sin guardar + ConfirmDialog + confirmaciones destructivas** → JOR-056. Incluye Cancelar/Salir de los builders.
- **Consumo de catálogos / quitar MSW** → JOR-058. **Mock SII / banners de simulación** → JOR-059.
- **Listado AP, detalle DTE, edición de item** (vistas destino) → JOR-060.
- **Crear rutas `/configuracion/perfil` y `/configuracion/empresa`** → fuera de alcance (se deshabilitan).
- No se cambia la taxonomía DEC-003 (se **aplica/refina**, no se redefine).

### 5. Tamaño estimado

**2 sessions (~3-4h)**, tier T2 cada una. La más sensible es **S1** (estructura del menú + gating del Home): toca el shell que ven todas las vistas y reescribe tests del sidebar. S2 (wiring de handlers + account menu) es mecánica y de bajo riesgo.

### 6. Como vas a saber que funciona

- El sidebar muestra **un item por módulo** (Documentos / Facturas proveedor / Items / Pagos clientes) + Inicio + Reportes; **no** aparecen "Nuevo item", "Crear factura cliente", "Aplicar pago", ni los omitidos.
- "Crear item" abre `/inventario/nuevo`; "Crear documento" abre `/ventas/crear-factura`; "Facturar" (ventas) lleva al listado de documentos con toast.
- Un usuario sin la capability de un módulo **no ve** su tile en el Home ni su item en el sidebar; con la capability, sí.
- El breadcrumb de una hija oculta muestra `Inicio › {Módulo} › {Acción}`.
- Suite vitest dual-project verde, coverage ≥90.

## Purpose

Aplica el menú de navegación canónico (Alternativa B) y conecta la navegación entre vistas para el operador del sistema (cualquier rol con acceso a los módulos de negocio). Cierra el "no pasa nada al hacer click" en los caminos más visibles y unifica la visibilidad de menú/Home bajo el modelo de capabilities RBAC, alineando la UI con `sidebar-canonical.md` y `permissions-by-view.md`. Base de navegación sobre la que JOR-056/058/059/060 construyen el resto de la Capa B2.

## Requirements

### REQ-01: Sidebar canónico — un item por módulo, hijas ocultas, sin omitidos

> **Que cambia**: el menú deja de mostrar "Nuevo item", "Crear factura cliente", "Aplicar pago" y los sub-items sin maqueta (Órdenes de compra, Recepciones, Proveedores, Notas de crédito, Pagos a proveedores). Cada grupo queda con su única vista con maqueta; las pantallas de alta/detalle se alcanzan por interacción.
> **Por que**: hoy `nav-data.ts` lista pantallas que el canónico define como hijas ocultas o directamente omite, generando un menú más ancho que el alcance real con maqueta.

El sistema MUST renderizar el sidebar con exactamente: **Inicio** · **Ventas › Documentos** · **Compras › Facturas proveedor** · **Inventario › Items** · **Finanzas › Pagos clientes** · **Reportes** (top-level, opcional). Las entradas `Crear factura cliente` (`/ventas/crear-factura`), `Nuevo item` (`/inventario/nuevo`) y `Aplicar pago` (`/finanzas/aplicar-pago`) MUST permanecer en `NAV_ENTRIES` marcadas `hidden: true` (para resolución de breadcrumb) y NO MUST renderizarse como items de menú ni como tiles del Home. Las entradas sin maqueta ni ruta (Compras: Órdenes/Recepciones/Proveedores/Notas crédito/Pagos prov.; Ventas: Notas de crédito) MUST eliminarse de `NAV_ENTRIES`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: items canónicos presentes
- **GIVEN** el usuario con todas las capabilities
- **WHEN** renderiza el Sidebar
- **THEN** ve Inicio, Ventas›Documentos, Compras›Facturas proveedor, Inventario›Items, Finanzas›Pagos clientes, Reportes — y nada más

#### Scenario: hijas ocultas no son items
- **GIVEN** `NAV_ENTRIES` con `hidden: true` en Crear factura cliente / Nuevo item / Aplicar pago
- **WHEN** renderiza el Sidebar y el Home
- **THEN** esos labels no aparecen como items de menú ni tiles

#### Scenario: omitidos eliminados
- **GIVEN** el canónico §Omitidos
- **WHEN** renderiza el grupo Compras
- **THEN** solo aparece "Facturas proveedor" (sin Órdenes/Recepciones/Proveedores/Notas crédito/Pagos prov.)

</details>

### REQ-02: Visibilidad del Home y del sidebar gateada por capabilities (Fase 0.5)

> **Que cambia**: los tiles del Home aparecen/desaparecen según las capabilities del usuario (igual que ya hace el sidebar), no solo según si la feature está implementada.
> **Por que**: hoy el Home usa solo `hasView`; un usuario sin permiso de un módulo igual ve su tile. El sidebar ya gatea por capability — el Home queda desalineado.

El sistema MUST filtrar los tiles del Home por capability aplicando la **regla de agregación** de `permissions-by-view.md §3`: un tile de grupo es visible si el usuario tiene ≥1 capability de acceso de algún hijo; un tile/leaf es visible si tiene la capability de acceso de su vista. El Home MUST excluir entradas `hidden`. El sidebar MUST gatear también las entradas **top-level leaf** con `cap` (ej. Reportes) por capability, no solo los items dentro de grupos. El Home de Inicio (sin `cap`) MUST permanecer visible para todo usuario autenticado.

<details><summary>Scenarios de validacion</summary>

#### Scenario: tile oculto sin capability
- **GIVEN** un usuario sin ninguna capability de Inventario
- **WHEN** renderiza el Home
- **THEN** el tile "Inventario" no aparece

#### Scenario: tile visible con capability
- **GIVEN** un usuario con `items.parts:view`
- **WHEN** renderiza el Home
- **THEN** el tile "Inventario" aparece y navega a `/inventario/items`

#### Scenario: Reportes top-level gateado
- **GIVEN** un usuario sin `reportes.summary:view`
- **WHEN** renderiza el Sidebar
- **THEN** el item "Reportes" no aparece

</details>

### REQ-03: Cablear navegación muerta de creación (Fase 1.1 / 1.2)

> **Que cambia**: "Crear item" abre el formulario de alta; "Crear documento" abre el builder de factura. Hoy solo muestran un toast "no implementado".
> **Por que**: las rutas destino ya existen; el botón debe llevar a ellas.

El sistema MUST navegar a `/inventario/nuevo` al pulsar "+ Crear item" (ItemsListView) y a `/ventas/crear-factura` al pulsar "+ Crear documento" (DocumentosListView), reemplazando el `toast.info('… no implementado')`. El gating `<Can>` existente (`items.parts:edit` / `sales.invoices:edit`) MUST preservarse.

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear item navega
- **GIVEN** ItemsListView con `items.parts:edit`
- **WHEN** se pulsa "+ Crear item"
- **THEN** `router.push('/inventario/nuevo')` y no hay toast "no implementado"

#### Scenario: crear documento navega
- **GIVEN** DocumentosListView con `sales.invoices:edit`
- **WHEN** se pulsa "+ Crear documento"
- **THEN** `router.push('/ventas/crear-factura')`

</details>

### REQ-04: Navegación post-éxito al emitir (Fase 1.3)

> **Que cambia**: tras emitir una factura de venta, vuelves al listado de documentos con el toast de éxito, en vez de quedarte en el builder.
> **Por que**: la "regla de cierre" del flujo (crear/emitir → listado de origen + toast) cierra el ciclo del usuario.

El sistema MUST navegar a `/ventas/documentos` tras emitir con éxito en TransactionBuilder (`onSuccess` de la emisión), manteniendo el `toast.success`. Para la factura de proveedor (PurchaseInvoiceBuilder), como el listado AP destino no existe aún (JOR-060), el post-éxito MUST conservar el `toast.success` sin navegar (se wirea en JOR-060).

<details><summary>Scenarios de validacion</summary>

#### Scenario: emitir venta navega al listado
- **GIVEN** TransactionBuilder, emisión exitosa
- **WHEN** la mutación resuelve `onSuccess`
- **THEN** `toast.success` + `router.push('/ventas/documentos')`

#### Scenario: emitir compra mantiene toast (sin listado destino)
- **GIVEN** PurchaseInvoiceBuilder, emisión exitosa
- **WHEN** resuelve `onSuccess`
- **THEN** `toast.success` y NO navega (listado AP es JOR-060)

</details>

### REQ-05: Breadcrumb resuelve hijas ocultas

> **Que cambia**: el breadcrumb de las pantallas de alta/detalle muestra su ruta jerárquica completa.
> **Por que**: al marcar las hijas como `hidden`, hay que garantizar que el breadcrumb (que deriva de `NAV_ENTRIES`) las siga resolviendo.

El sistema SHOULD mostrar `Inicio › {Módulo} › {Acción}` en las rutas de hijas ocultas (ej. `/ventas/crear-factura` → `Inicio › Ventas › Crear factura cliente`). El componente `Breadcrumb` existente (JOR-037) MUST seguir resolviendo el label desde `NAV_ENTRIES` aun cuando la entrada esté `hidden`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: breadcrumb de hija oculta
- **GIVEN** ruta `/ventas/crear-factura` con su entrada `hidden: true`
- **WHEN** renderiza el Breadcrumb
- **THEN** muestra `Inicio › Ventas › Crear factura cliente`

</details>

### REQ-06: Account menu — Perfil/Empresa deshabilitados (Fase 1.9)

> **Que cambia**: "Perfil" y "Empresa" del menú de cuenta dejan de llevar a un 404; quedan visibles pero deshabilitados hasta que exista su vista.
> **Por que**: `/configuracion/perfil` y `/configuracion/empresa` no existen; hoy navegan a 404.

El sistema MUST mostrar "Perfil" y "Empresa" en el AccountMenu como items **deshabilitados** (sin navegar), en vez de `router.push` a rutas inexistentes. "Usuarios" (`/config/users`) y "Roles y Permisos" (`/config/roles`), ya gateados por `<Can>` y con ruta real, MUST permanecer sin cambios.

<details><summary>Scenarios de validacion</summary>

#### Scenario: Perfil deshabilitado
- **GIVEN** el AccountMenu abierto
- **WHEN** se observa "Perfil"
- **THEN** aparece deshabilitado y un click no dispara `router.push('/configuracion/perfil')`

#### Scenario: Usuarios intacto
- **GIVEN** usuario con `config.users:view`
- **WHEN** pulsa "Usuarios"
- **THEN** `router.push('/config/users')` (sin cambios)

</details>

## Constraints

- **DEC-003** (taxonomía sidebar/router): este spec **aplica/refina** la taxonomía Alternativa B; no la redefine. Rutas en español (implementadas), no las inglesas propuestas en `permissions-by-view.md`.
- **DEC-006** (modelo de permisos): capabilities `module.feature:action`; visibilidad UI deriva de capabilities, el backend revalida.
- **RULE-frontend-001** (organización de componentes): carpeta-por-componente con test + story co-locados.
- **RULE-frontend-002** (convenciones de test/story): los tests codifican el comportamiento; al cambiarlo, se reescriben en la misma task (DET-7).
- **RULE-testing-coverage-threshold-002**: coverage ≥90, no debe caer.
- **RULE-global-005**: dejar veredicto de docs y tests al cierre.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-frontend-breadcrumb-in-view (JOR-037, done) | internal | Breadcrumb centralizado y auto-derivado de `NAV_ENTRIES` | Si se borran las hijas de nav-data, el breadcrumb pierde labels → mitigado con flag `hidden` |
| SPEC-backend-rbac + seeds 04-09 | internal | Catálogo de capabilities seedeado y otorgado a internal-admin | Sin caps el gating ocultaría todo → verificado (H1) |
| JOR-056 (B2.2) | internal | Guard de cambios sin guardar (DC-1) | Cancelar/Salir se difieren a 056 — sin dependencia bloqueante para este ticket |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Gatear por capability oculta toda la nav | low | high | Verificado multi-capa (H1): internal-admin grant-all. Test con y sin caps |
| Romper breadcrumb de hijas ocultas | medium | medium | Flag `hidden` mantiene las entradas en `NAV_ENTRIES`; TC-4 explícito |
| Caída de coverage <90 al reescribir tests del shell | medium | medium | Cada cambio trae su test en la misma task (DET-7); correr `--coverage` en cada GATE |
| Tests existentes de Sidebar/Home asumen estructura vieja | high | low | Regresión esperada: se reescriben a la estructura canónica en S1.T4 (no es fallo) |

## Tasks

### Session 1 — Sidebar canónico + gating del Home por capabilities [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `nav-data.ts` + `types.ts`: agregar `hidden?: boolean` a `NavItem`; marcar `hidden:true` en Crear factura cliente / Nuevo item / Aplicar pago; eliminar omitidos sin maqueta | REQ-01 | developer | — | front/jormat-front/src/components/shell/nav/nav-data.ts, .../nav/types.ts | vitest (nav-data/NavGroup) | git revert del commit | DET-2, DET-5, DET-16 | pending | 1 |
| S1.T2 | Sidebar/NavGroup/NavItem: excluir entradas `hidden` del render; gatear top-level leaf con `cap` (Reportes) por capability | REQ-01, REQ-02 | developer | S1.T1 | front/jormat-front/src/components/shell/Sidebar/Sidebar.tsx, .../Sidebar/NavGroup/NavGroup.tsx, .../Sidebar/NavItem/NavItem.tsx | vitest (Sidebar/NavGroup/NavItem) | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T3 | Home.tsx: filtrar tiles por capability (regla de agregación) usando `can()` + capabilities del auth store; excluir `hidden` | REQ-02 | developer | S1.T1 | front/jormat-front/src/components/shell/Home/Home.tsx | vitest (Home) | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T4 | Tests: reescribir/añadir Sidebar/NavGroup/NavItem/Home a estructura canónica + gating con/sin caps; test breadcrumb de hija oculta; añadir test de `nav-data` (forma canónica) | REQ-01, REQ-02, REQ-05 | developer | S1.T2, S1.T3 | front/jormat-front/src/components/shell/Sidebar/**/*.test.tsx, .../Home/Home.test.tsx, .../TopBar/Breadcrumb/Breadcrumb.test.tsx | vitest --coverage (≥90) | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2): persistir + quality review (DET-23, 10 dims) + coverage delta + dkc-mutate async (DET-31) | — | reviewer | S1.T4 | tickets/JOR-055.md | gate persistido + vitest --coverage verde | — | DET-20, DET-23, DET-31, DET-33 | pending | 1 |

### Session 2 — Cableado de navegación + account menu [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | ItemsListView + DocumentosListView: reemplazar `toast.info('no implementado')` por `router.push` ('/inventario/nuevo' / '/ventas/crear-factura'); preservar `<Can>` | REQ-03 | developer | — | front/jormat-front/src/components/items/list/ItemsListView/ItemsListView.tsx, front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx | vitest (ambos list views) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T2 | TransactionBuilder: en `onSuccess` de emisión, añadir `router.push('/ventas/documentos')` tras `toast.success` | REQ-04 | developer | — | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx | vitest (TransactionBuilder) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T3 | AccountMenu: Perfil/Empresa como items deshabilitados (sin `router.push`); Usuarios/Roles sin cambios | REQ-06 | developer | — | front/jormat-front/src/components/shell/TopBar/AccountMenu/AccountMenu.tsx | vitest (AccountMenu) | git revert | DET-5, DET-8 | pending | 2 |
| S2.T4 | Tests: actualizar/añadir wiring tests (ItemsListView/DocumentosListView navegan, TransactionBuilder navega post-éxito, AccountMenu Perfil/Empresa disabled) | REQ-03, REQ-04, REQ-06 | developer | S2.T1, S2.T2, S2.T3 | front/jormat-front/src/components/items/list/ItemsListView/*.test.tsx, .../ventas/list/DocumentosListView/*.test.tsx, .../ventas/builder/TransactionBuilder/*.test.tsx, .../shell/TopBar/AccountMenu/*.test.tsx | vitest --coverage (≥90) | git revert | DET-7, DET-13 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2): persistir + quality review + coverage + dkc-mutate async + veredicto docs/tests (RULE-global-005) | — | reviewer | S2.T4 | tickets/JOR-055.md | gate persistido + suite verde + coverage ≥90 | — | DET-20, DET-23, DET-31, DET-33 | pending | 2 |

## Technical reference

- **`can(capabilities, required)`** (`lib/can.ts`): soporta wildcards `*`, `module.*`, `module.feature:*`. Las capabilities efectivas viven en `auth.store` (`useAuthStore(s => s.capabilities)`), cargadas en `initialize()`. Usar el store, NO `useMyCapabilities` (ese es para debug/refetch).
- **`NavGroup.tsx:43`** ya implementa `visibleItems = items.filter(i => !i.cap || can(capabilities, i.cap))` + `return null` si vacío — el filtro `hidden` se suma a esta misma expresión.
- **`Home.tsx:61-70`**: `getEntryPath`/`isEntryEnabled` hoy usan solo `entry.hasView`. Añadir capa de capability: leaf visible si `!cap || can(caps, cap)`; grupo visible si `items.some(i => !i.cap || can(caps, i.cap))` y con ≥1 hijo no-hidden con `hasView`.
- **Breadcrumb (`buildCrumb`, Breadcrumb.tsx:87)**: busca el path en `NAV_ENTRIES` para el label. Las entradas `hidden` deben permanecer en el array (no filtrarse en la fuente, solo en los consumidores Sidebar/Home).
- **Toast**: `sonner` — `import { toast } from 'sonner'`.
- **Rutas existentes** (App Router): ver `## Context found` del ticket.

## Open questions

(ninguna — todas las decisiones de scope cerradas; ver Decisions)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Hijas ocultas vía flag `hidden` en lugar de quitarlas de NAV_ENTRIES
- **Contexto**: el canónico pide que Crear/Editar/Detalle no sean items de menú, pero el breadcrumb deriva labels de `NAV_ENTRIES`.
- **Drivers**: una sola fuente de verdad para nav + breadcrumb; mínimo blast radius.
- **Opción elegida**: agregar `hidden?: boolean`; los consumidores (Sidebar/Home) lo excluyen; el breadcrumb lo conserva.
- **Alternativas**: (a) borrarlas de nav-data → rompe breadcrumb; (b) mapa de labels separado → duplica fuente.
- **Consecuencias**: +1 campo en el tipo; cero duplicación.
- **Session**: design.

### DEC-LOCAL-02: Cancelar/Salir y post-éxito de Compras se difieren (056 / 060)
- **Contexto**: Fase 1.5/1.7 dependen del guard (056); post-éxito de compras necesita el listado AP (060).
- **Drivers**: evitar pérdida de datos sin guard; no navegar a rutas inexistentes; no duplicar trabajo.
- **Opción elegida**: diferir; este ticket no toca Cancelar/Salir ni navega post-éxito de compras.
- **Alternativas**: wirear nav plana ahora → ventana de pérdida de datos que 056 rehace.
- **Consecuencias**: scope más limpio; los botones quedan con su toast actual una iteración más.
- **Session**: design.

### DEC-LOCAL-03: Perfil/Empresa deshabilitados, no stub de ruta
- **Contexto**: `/configuracion/*` no existen (404).
- **Opción elegida**: deshabilitar los items hasta tener vista.
- **Alternativas**: crear páginas stub vacías → código muerto sin valor.
- **Consecuencias**: UX honesta; follow-up cuando exista la vista de configuración.
- **Session**: design.

## Backlog

| # | Item | Priority | Status | Origen |
|---|------|----------|--------|--------|
| B1 | Endurecer tests para los 8 mutantes sobrevivientes de S1 (score 88.1, ≥80): cubrir `getEntryPath`/`isEntryEnabled` (hoy redundantes con `isEntryVisible` — o colapsarlos) y literales `hasView`/`cap` de nav-data; agregar test de regresión "Guardar borrador NO navega" en TransactionBuilder | should | re-rutear: parcial. Test de regresion "Guardar borrador NO navega" SI resuelto (JOR-154 S1.T3, commit `d9855d4`); tests unitarios para `!i.hidden`/literales `cap`/`hasView` agregados (S1.T2, commit `edb728e`), pero sin confirmacion empirica de los 8 mutantes via re-mutacion (JOR-154 difirio la corrida `--ignoreStatic` sobre `nav-data.ts`/`Home.tsx` a su propio backlog B1) | dkc-mutate S1 + jueces de calidad (DET-31, warn-first) |

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..06 pasan.
- [ ] **Tests**: vitest dual-project verde; coverage ≥90 (no cae).
- [ ] **Rules**: RULE-frontend-001/002 respetados (test+story co-locados); gating por capability vía `<Can>`/`can()`.
- [ ] **Integration**: no rompe vistas existentes; breadcrumb intacto para rutas no-hijas.
- [ ] **Docs**: sidebar/navegación documentadas en `jormat_docs/frontend/` (RULE-global-005); veredicto `docs:`/`tests:` registrado al cierre.
