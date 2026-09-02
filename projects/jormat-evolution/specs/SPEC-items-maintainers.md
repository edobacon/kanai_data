---
id: SPEC-items-maintainers
project: jormat-evolution
ticket: JOR-064
status: in_progress
---

# Mantenedores de Categorías y Aplicaciones (CRUD) + generador de Catálogos, gateados por permiso

# Mantenedores de Categorías y Aplicaciones (CRUD) + generador de Catálogos, gateados por permiso

## Executive summary — lo que estás aprobando

> Spec **draft** (work_type explore): define el rediseño de los mantenedores del dominio Items para aplicarlo en un ciclo implement posterior. Alcance acordado (Opción B): **Categorías + Aplicaciones** (CRUD) + **Catálogos** (generador) + **RBAC**. **Camiones** queda fuera (ticket propio, B7).

**Qué se construye**: dos mantenedores CRUD (Categorías, Aplicaciones) con **formularios en modal** y guard de cambios sin guardar al hacer dismiss; una vista **generadora de Catálogos** (builder de filtros + selección + generar/imprimir); y el **RBAC** por acción (view/edit/delete) por mantenedor, asociado al admin. Todo **con backend incluido, stub-backed** esta iteración (contrato real de endpoints; BD real = capa siguiente).

**Decisiones críticas (ya tomadas con el dev)**:

| # | Decisión | Por qué |
|---|----------|---------|
| 1 | Excluir Camiones de este ciclo | Depende de fuente de Marca inexistente + entidad rica; nada del core lo consume (JOR-064 H4) |
| 2 | Crear/editar en **modal** (no página) | Consistente con `RolesView`/`UsersView`; mantiene contexto del listado; guard vía `onOpenChange→requestLeave` |
| 3 | Backend **stub** esta iteración (POST/PATCH/DELETE en `catalogos`) | Entrega contrato real sin bloquear en migraciones Knex; front integra contra endpoints, no solo MSW |
| 4 | Items referencia mantenedores **por ID** (fuente de verdad) | Cierra el gap ID↔nombre (JOR-064 L8); front ya resuelve nombre para display |
| 5 | Catálogos = **generador** (no CRUD, sin tabla) | Es un builder filtros→selección→generar/imprimir (patrón `TransactionBuilder`) |

**Cómo vas a saber que funciona**:
- Abres `/config/categorias` (o `/inventario/...`), creas una categoría desde el modal, aparece en la tabla; editas y persiste; eliminas con confirmación.
- Con el modal sucio, Escape/clic-fuera/Cancelar dispara "Perderás los cambios"; con el modal limpio, cierra directo.
- Un usuario sin `items.categories:edit` no ve el botón Crear ni las acciones de editar/eliminar.
- El form de item (crear/editar) sigue funcionando: selecciona categorías/aplicaciones por id y el detalle round-trippea sin perder la selección.

## Purpose

Traer del legacy los mantenedores que afectan el uso de los items (Categorías, Aplicaciones) como CRUD modernos gateados por permiso, más el generador de Catálogos, y **cerrar el vínculo items↔mantenedores por ID**. Backend incluido (stub esta iteración). Reusa moldes: `permissions/roles` (backend CRUD+RBAC), `RolesView`/`UsersView` (frontend maestro-detalle + modal), `TransactionBuilder` (generador), `useUnsavedChangesGuard`+`useFormMountBaseline` (guard).

## Requirements

### REQ-01: Backend CRUD de Categorías (stub-backed)

> **Que cambia**: el módulo `catalogos` gana escritura para categorías: `POST /catalogos/categorias`, `PATCH /catalogos/categorias/:id`, `DELETE /catalogos/categorias/:id` (el `GET` ya existe).
> **Por que**: el front necesita integrar contra endpoints reales; hoy solo hay GET stub.

El backend MUST exponer CRUD de categorías con contrato `{ id, codigo, nombre }`, validación `class-validator` (nombre y código requeridos, código único), y gating por capability (`items.categories:view` para leer, `items.categories:edit` para crear/editar/eliminar). Implementación **stub en memoria** aceptable esta iteración (sin BD), preservando el shape canónico y el aislamiento por `workspaceId` en la firma.

**Actor**: system (API)
**Layers**: backend

<details><summary>Scenarios</summary>

#### Scenario: crear categoría
GIVEN un usuario con `items.categories:edit`
WHEN `POST /catalogos/categorias {codigo:'FRE', nombre:'Frenos'}`
THEN responde 201 con `{id, codigo:'FRE', nombre:'Frenos'}`

#### Scenario: código duplicado
GIVEN ya existe categoría con código 'FRE'
WHEN se crea otra con 'FRE'
THEN responde 409/400 (conflicto), no se crea

#### Scenario: sin permiso
GIVEN un usuario sin `items.categories:edit`
WHEN `POST /catalogos/categorias`
THEN responde 403
</details>

### REQ-02: Backend CRUD de Aplicaciones (stub-backed)

> **Que cambia**: idéntico a REQ-01 para aplicaciones (`/catalogos/aplicaciones` + POST/PATCH/DELETE).
> **Por que**: mismo mantenedor CRUD.

El backend MUST exponer CRUD de aplicaciones `{ id, codigo, nombre }`, validación + gating por `items.applications:view` / `items.applications:edit`, stub-backed.

**Actor**: system (API) · **Layers**: backend

### REQ-03: Capabilities CRUD + seed + grant a admin

> **Que cambia**: nuevas capabilities `items.categories:{view,edit,delete}` y `items.applications:{view,edit,delete}` sembradas; `internal-admin` las recibe.
> **Por que**: el mantenedor debe estar gateado por permiso y asociado al admin (requisito del ticket).

El sistema MUST sembrar las capabilities en la tabla `capabilities` (formato `module.feature:action`), y el rol global `internal-admin` MUST recibirlas (verificar el grant-all del seed 09). El `view` existente (`items.categories:view`, `items.applications:view`) se reutiliza; se agregan `:edit` y `:delete`.

**Actor**: system (RBAC) · **Layers**: backend (seeds + tablas RBAC existentes)

<details><summary>Scenarios</summary>

#### Scenario: admin tiene todo
GIVEN el rol `internal-admin`
WHEN se resuelven sus capabilities
THEN incluye `items.categories:edit`, `items.categories:delete`, `items.applications:edit`, `items.applications:delete`
</details>

### REQ-04: Hook reusable de modal-form con guard de dismiss

> **Que cambia**: nuevo `useUnsavedChangesModal({ isDirty, onClose })` que devuelve el `onOpenChange` guardado (dirty → `UnsavedChangesDialog`; limpio → cierra).
> **Por que**: evitar reimplementar el guard en cada modal; base de las vistas mantenedor y retrofit de modales existentes.

El sistema MUST proveer un hook que combine `useUnsavedChangesGuard({ when: isDirty })` + la intercepción del cierre del `Dialog` (Escape/overlay/X → `requestLeave(() => onClose())`), y documentar el uso de `useFormMountBaseline` + remonte por apertura para que `isDirty` parta en false.

**Actor**: system (UI hook) · **Layers**: frontend

<details><summary>Scenarios</summary>

#### Scenario: dismiss con cambios
GIVEN un modal-form sucio
WHEN el usuario presiona Escape / clic fuera / X / Cancelar
THEN se muestra `UnsavedChangesDialog`, el modal NO se cierra hasta confirmar

#### Scenario: dismiss limpio
GIVEN un modal-form sin cambios (recién abierto)
WHEN el usuario cierra
THEN cierra directo, sin diálogo
</details>

### REQ-05: Vista mantenedor Categorías (modal CRUD, gateada)

> **Que cambia**: nueva vista `CategoriasView` (listado + crear/editar en modal + eliminar con confirm), reusando el molde `RolesView`/`UsersView`.
> **Por que**: administrar categorías desde la plataforma nueva.

El sistema MUST renderizar un listado de categorías (tabla con `Código · Nombre · Acciones`, buscador), botón **Crear** (gateado a `items.categories:edit`), modal de crear/editar (`{codigo*, nombre*}`) con guard (REQ-04), y eliminar con `ConfirmDialog` (gateado a `items.categories:delete`). La vista se gatea a `items.categories:view` (`RouteGuard`). Hooks React Query `useCategorias`/`useCreateCategoria`/`useUpdateCategoria`/`useDeleteCategoria`.

**Actor**: usuario · **Layers**: frontend

<details><summary>Scenarios</summary>

#### Scenario: crear desde modal
GIVEN usuario con `items.categories:edit` en `CategoriasView`
WHEN abre "Crear", completa código+nombre, guarda
THEN el modal cierra, la tabla muestra la nueva categoría (invalidación de query)

#### Scenario: gating de acciones
GIVEN usuario con solo `items.categories:view`
THEN no ve botón Crear ni acciones editar/eliminar
</details>

### REQ-06: Vista mantenedor Aplicaciones (modal CRUD, gateada)

> **Que cambia**: `AplicacionesView`, análoga a REQ-05.
> **Por que**: administrar aplicaciones.

Idéntico a REQ-05 para aplicaciones, gateado a `items.applications:{view,edit,delete}`.

**Actor**: usuario · **Layers**: frontend

### REQ-07: Vínculo items ↔ mantenedores por ID

> **Que cambia**: items referencia categorías/aplicaciones/proveedores **por id**; el detalle de item devuelve ids (no nombres); el front resuelve nombre para display.
> **Por que**: cerrar el gap ID↔nombre (JOR-064 L8) — hoy el form/filtros usan id pero el stub devuelve nombres, y `itemDetailToFormValues` es lossy.

El backend (stub items) MUST devolver/aceptar ids en `categorias/aplicaciones/proveedores`; `itemDetailToFormValues` MUST mapear ids a la selección del MultiSelect sin pérdida; el listado y el detalle resuelven el nombre vía los catálogos. Cambio de contrato coordinado front+back.

**Actor**: system · **Layers**: backend (items stub) + frontend (mapper, detalle)

<details><summary>Scenarios</summary>

#### Scenario: round-trip crear→editar
GIVEN un item creado con categorías `['cat-001']`
WHEN se abre en edición
THEN el MultiSelect muestra 'Frenos' seleccionado (id resuelto a nombre), no vacío
</details>

### REQ-08: Generador de Catálogos (builder, gateado)

> **Que cambia**: vista `CatalogosView` — filtros (Categorías/Aplicaciones/Proveedores/Marca/Oferta) + grilla de items con selección (+) + Generar/Imprimir.
> **Por que**: traer el generador del legacy (`/app/items/catalogos`).

El sistema SHOULD renderizar un builder tipo `TransactionBuilder`: panel de filtros que consultan items filtrados (server-side, anti-patrón: NO carga masiva client-side), selección de items al "listado de repuestos", y acciones Generar/Imprimir (export). Gateado a `items.parts:view` (+ capability de catálogos si se define). Consume los mantenedores (categorías/aplicaciones/proveedores).

**Actor**: usuario · **Layers**: frontend (+ backend endpoint de items filtrados)

### REQ-REGRESSION-01: No romper el consumo actual de items

> **Que cambia**: nada — se preserva.

El form de crear/editar item (MultiSelect por id), los filtros del listado y el detalle MUST seguir funcionando tras el cambio de contrato a ids. Suites existentes de items verdes.

**Actor**: usuario · **Layers**: frontend

## Tasks

> Spec **draft** — al activar (pasar a implement en un ticket propio o reabriendo este), estas sessions se refinan con task contracts. Particionadas por capa (backend → frontend → vínculo → generador).

### Session 1 — Backend: capabilities + CRUD stub (categorías/aplicaciones) [tier: T2]
| # | Task | source_ref | Files (orientativo) | Rules |
|---|------|-----------|---------------------|-------|
| S1.T1 | Seed capabilities `items.{categories,applications}:{view,edit,delete}` + verificar grant-all internal-admin | REQ-03 | `backend/jormat-api/seeds/*_items_capabilities.ts`, `09_internal_admin_grant_all.ts` | DET-2 |
| S1.T2 | CRUD stub categorías (POST/PATCH/DELETE) + DTOs class-validator + gating `@RequireCapability` | REQ-01 | `backend/jormat-api/src/catalogos/*` | DET-2, DET-8 |
| S1.T3 | CRUD stub aplicaciones (idem) | REQ-02 | `backend/jormat-api/src/catalogos/*` | DET-2, DET-8 |
| S1.GATE | Tests backend (unit + e2e stub) verdes; contrato `{id,codigo,nombre}` estable | REQ-01,02,03 | — | DET-13, DET-23 |

### Session 2 — Frontend: hook de guard-modal + vistas Categorías/Aplicaciones [tier: T2]
| # | Task | source_ref | Files (orientativo) | Rules |
|---|------|-----------|---------------------|-------|
| S2.T1 | Hook `useUnsavedChangesModal` (+ test) | REQ-04 | `src/hooks/useUnsavedChangesModal.ts` | RULE-frontend-002 |
| S2.T2 | Hooks CRUD `useCreate/Update/DeleteCategoria` + `...Aplicacion` (React Query + invalidación) | REQ-05,06 | `src/hooks/useCatalogos.ts` (o nuevos) | RULE-api-client-001 |
| S2.T3 | `CategoriasView` + `CategoriaFormModal` + eliminar con ConfirmDialog + gating | REQ-05 | `src/components/config/categorias/*` (molde RolesView) + ruta | RULE-frontend-001/002 |
| S2.T4 | `AplicacionesView` + `AplicacionFormModal` (análogo) | REQ-06 | `src/components/config/aplicaciones/*` + ruta | RULE-frontend-001/002 |
| S2.GATE | Tests (Select/modal reales con polyfills), gating, guard de dismiss; coverage ≥90 | REQ-04,05,06 | — | DET-13, DET-23, DET-36 |

### Session 3 — Vínculo items↔IDs + regression [tier: T3]
| # | Task | source_ref | Files (orientativo) | Rules |
|---|------|-----------|---------------------|-------|
| S3.T1 | Alinear items stub (back) a ids en categorías/aplicaciones/proveedores | REQ-07 | `backend/jormat-api/src/items/*` | DET-16 |
| S3.T2 | `itemDetailToFormValues` sin pérdida (id→selección) + detalle resuelve nombre | REQ-07 | `src/components/items/create/ItemCreateForm/itemDetailToFormValues.ts`, `ItemDetailModal` | DET-7 |
| S3.T3 | Regression items (form/filtros/detalle) + smoke UI | REQ-REGRESSION-01 | suites items | DET-7, DET-36 |
| S3.GATE | Regression completa verde; round-trip crear→editar sin pérdida | — | — | DET-13 |

### Session 4 — Generador de Catálogos (SHOULD) [tier: T2]
| # | Task | source_ref | Files (orientativo) | Rules |
|---|------|-----------|---------------------|-------|
| S4.T1 | `CatalogosView` builder (filtros + grilla + selección + Generar/Imprimir), patrón TransactionBuilder | REQ-08 | `src/components/items/catalogos/*` + endpoint items filtrados | RULE-frontend-001/002 |
| S4.GATE | Filtro server-side (no carga masiva); export/print; gating | REQ-08 | — | DET-13 |

### Session 5 — Documentación [tier: T1]

> **Dos KBs, cada uno con su rol** (ambos obligatorios):
> - **`jormat_docs/`** (externo, `docs.location: external`) — KB de arquitectura/contrato. Respeta las 4 reglas de crecimiento de `conventions/documentation-standards.md` (espejo src/ 1:1, un hecho un solo hogar, archivo→carpeta al crecer, README = mapa src/→doc) + frontmatter (title/project/type/tags/source_files/related/status).
> - **`docs/` interno del monorepo** (JOR-048) — fuente operativa del estado real del código. Estructura existente: `docs/api/`, `docs/back/`, `docs/front/`, `docs/permissions.md`, `docs/guides/`.
>
> Evitar duplicación textual: el interno describe *cómo está el código hoy*; el externo el *contrato/arquitectura*. Alcance: solo lo implementado en S1–S4 (categorías/aplicaciones + generador); **camiones excluidos** (ver Constraints).

| # | Task | source_ref | Files (orientativo) | Rules |
|---|------|-----------|---------------------|-------|
| S5.T1 | Documentar API CRUD categorías/aplicaciones: contrato `{id,codigo,nombre}`, DTOs, headers, gating por capability, errores 403/404/409 — en **ambos** KBs | REQ-01,02,03 | `jormat_docs/api/README.md` · `docs/api/README.md` | RULE-global-005 |
| S5.T2 | Documentar módulo backend `catalogos` (CRUD stub in-memory, contrato estable) + capabilities `items.{categories,applications}:{view,edit,delete}` + nota "stub sin Knex" — en **ambos** KBs | REQ-01,02,03 | `jormat_docs/backend/modules/catalogos.md` + `jormat_docs/backend/README.md` · `docs/back/README.md` + `docs/back/patterns.md` + `docs/permissions.md` | RULE-global-005 |
| S5.T3 | Documentar frontend: vistas `CategoriasView`/`AplicacionesView` (modales, gating, guard de dismiss) + hook `useUnsavedChangesModal` — en **ambos** KBs | REQ-04,05,06 | `jormat_docs/frontend/*` + README (mapa) · `docs/front/views.md` + `docs/front/patterns.md` + `docs/front/README.md` | RULE-global-005 |
| S5.T4 | Documentar generador de Catálogos (patrón builder, filtro server-side) si S4 entró; actualizar `observations/README.md` (gaps resueltos); revisar `docs/guides/` (add-backend-endpoint / manage-permissions) si el flujo nuevo lo amerita | REQ-08 | `jormat_docs/frontend/*` + `jormat_docs/observations/README.md` · `docs/front/views.md` + `docs/guides/*` | RULE-global-005 |
| S5.GATE | Ambos KBs consistentes con el código real (verificación cruzada, no self-report); frontmatter + README-mapa (externo) completos; sin duplicación contradictoria entre KBs; RULE-global-005 satisfecho de forma explícita | REQ-01..08 | — | DET-13, DET-33 |

## Constraints

- **Camiones fuera de alcance** (Opción B) — ticket propio (B7).
- **Backend stub esta iteración**: endpoints de escritura pueden ser in-memory; NO se agregan migraciones Knex reales aquí (capa siguiente). El contrato `{id,codigo,nombre}` debe ser estable.
- **Modales, no páginas** para crear/editar (decisión 2). Guard de dismiss obligatorio vía REQ-04.
- **Items por ID** (decisión 4) — cambio de contrato coordinado front+back; no romper el consumo actual (REQ-REGRESSION-01).
- **Anti-patrones legacy a NO replicar**: `userId` por query, carga masiva client-side, exponer campos sensibles. Filtro/paginación server-side.
- Coverage no baja de 90 (RULE-testing-coverage-threshold-002). Tests de Select/modal ejercitan Radix real (polyfills jsdom), no solo mocks.

## Acceptance checkpoints

- [ ] AC-1 — CRUD categorías y aplicaciones responde (POST/PATCH/DELETE) con contrato `{id,codigo,nombre}` y gating por capability (403 sin permiso).
- [ ] AC-2 — `internal-admin` tiene las 6 capabilities nuevas (view/edit/delete × 2 mantenedores).
- [ ] AC-3 — `CategoriasView`/`AplicacionesView`: crear/editar en modal, eliminar con confirm, todo gateado; acciones ocultas sin permiso.
- [ ] AC-4 — Modal sucio → dismiss muestra `UnsavedChangesDialog`; modal limpio → cierra directo (guard REQ-04).
- [ ] AC-5 — Round-trip item crear→editar: la selección de categorías/aplicaciones se preserva (vínculo por id, REQ-07).
- [ ] AC-6 — Generador de Catálogos filtra server-side y permite generar/imprimir (REQ-08, si entra en el ciclo).
- [ ] AC-7 — Regression completa verde; coverage ≥90.
- [ ] AC-8 — Documentación en **ambos** KBs — externo `jormat_docs/` (API + módulo `catalogos` + vistas/hook + generador, con frontmatter y README-mapa) e interno `docs/` del monorepo (`api/`, `back/`, `front/`, `permissions.md`) — espeja el código real; sin duplicación contradictoria; RULE-global-005 satisfecho de forma explícita (no "n/a").
