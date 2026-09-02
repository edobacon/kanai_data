---
id: SPEC-frontend-destination-views
project: jormat-evolution
ticket: JOR-060
status: done
---

# B2.6 · Vistas destino faltantes sobre stub: listado AP, detalle DTE, edición de item

# B2.6 · Vistas destino faltantes sobre stub: listado AP, detalle DTE, edición de item

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes.*

**Que se quiere**: cerrar los tres "callejones sin salida" de navegación que quedaron en la app: (1) Compras hoy entra directo al builder de factura proveedor porque no existe el **listado AP** — se construye el listado canónico (KPIs+filtros+tabla, espejo de Documentos/Pagos) y el builder pasa a ser su hija en `/crear`; (2) el 👁 de Documentos hoy es un toast muerto — se construye el **detalle de DTE** en `/ventas/documentos/:id` (cabecera + líneas + badges de estado + acciones); (3) "Editar" en Items hoy es un toast muerto — se habilita la **edición de item** en `/inventario/items/:id/editar` reusando el form de alta con prellenado. Todo contra stubs (sin DB), extendiendo los contratos existentes.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **D1 (intake)**: el "Playwright e2e" del request se reduce a tests de integración vitest jsdom (router+MSW) + stories en chromium real + smoke sobre el dev stack al cierre | No existe infra Playwright e2e en el front y montarla implica resolver login MSAL automatizado (proyecto propio, flaky). El stack actual ya cubre los flujos; el smoke real valida el render (RULE-global-004) |
| 2 | **D2 (intake)**: el listado toma `/compras/facturas-proveedor` y el builder se MUEVE a `/compras/facturas-proveedor/crear` | Cambio de URL del builder — espejo del par Documentos→Crear factura; el canon del sidebar lo exige. Riesgo bajo: no hay links externos a la URL vieja |
| 3 | **D3 (intake)**: contrato de fila nuevo `FacturaProveedorListItem` (no se engorda `FacturaProveedorDto`, que sigue siendo la respuesta de draft/issue) | Mantiene la semántica de los POST del builder intacta (cero riesgo de regresión en JOR-015) |
| 4 | `GET /ventas/documentos/:id` pasa a responder un **detalle** (`DocumentoDTEDetalleDto` = documento + `lineas[]`) | El request exige cabecera+líneas; el DTO actual no tiene líneas. Aditivo — el listado no cambia |
| 5 | Edición de item = **PATCH stub nuevo** + form 06 con props de modo (`create`/`edit`) y mapper puro `ItemDetail→form values` | Reuso real del form (DC-3) en vez de duplicarlo; el PATCH es el único endpoint nuevo del ticket |
| 6 | El listado AP **no lleva row actions muertas** (sin 👁/pagos/editar por fila en v1) | Detalle AP y pagos AP no existen (wiring 4.4, fuera de alcance); agregar toasts "no implementado" nuevos va contra la Fase 0.4 (eliminarlos, no crearlos) |

**Riesgos principales y como los mitigamos**:

- **Mover el builder de URL rompe tests/stories existentes del builder** → S1 corre la suite de compras completa tras el recableado; los tests que asuman la ruta se actualizan en la misma task (cambio mecánico, no de lógica).
- **Extender `getDocumento` a detalle rompe consumidores del tipo actual** → `documentoDTEDetalleSchema` **extiende** el schema actual (los campos del listado no cambian); grep de consumidores de `useDocumento`/`getDocumento` antes de tocar (hoy: sin vista consumidora).
- **El form 06 en modo edit degrada el modo create** → props opcionales con defaults = comportamiento actual; suite existente de `ItemCreateForm` queda como red de regresión + scenarios nuevos de edit.
- **Breadcrumb con segmentos dinámicos (`[id]`)**: el breadcrumb centralizado resuelve labels desde nav-data (rutas estáticas) → task explícita que verifica/extiende la resolución para las 3 rutas hijas nuevas antes de dar por cerrada la navegación.

**Que NO se hace en este ticket** (limites explicitos):

- Modelo de datos real / persistencia (Fase C — los stubs siguen hardcodeados, `workspaceId` placeholder).
- Detalle de factura AP, pagos a proveedor (wiring 4.4) y retomar borrador desde el listado (wiring 2.4) — el listado AP v1 es solo lectura, sin row actions.
- Anulación formal de DTE (wiring 2.3, DEC+BE pendiente) — la acción "Anular" del detalle espeja el comportamiento actual del listado (gate por capability + placeholder).
- Descarga real de XML/PDF (depende de emisión SII real, Fase 6) — botón placeholder explícito.
- Infra Playwright e2e standalone (D1).
- Split-menu "Crear documento ▾" por tipo DTE (wiring 4.5, DEC pendiente).

**Tamano estimado**: 4 sessions (S1-S4), ~7-10h efectivas. La mas riesgosa es S1 (listado AP + recableado de rutas del builder — es la que toca código existente con más consumidores).

**Como vas a saber que funciona**:

- Entras a Compras desde el sidebar y ves un **listado** de facturas proveedor con KPIs y filtros; "+ Crear factura" te lleva al builder; al facturar vuelves al listado con toast.
- En Documentos, el 👁 de una fila te lleva a `/ventas/documentos/doc-1` con cabecera, líneas y badges; un id inexistente muestra not-found.
- En Items, "Editar" (tabla o modal) abre `/inventario/items/item-1/editar` con el form **prellenado**; guardas y vuelves al listado con toast.
- `vitest run` + `jest` verdes, coverage ≥90 en ambas capas, dev stack levanta con consola limpia.

---

## Purpose

Construir las 3 vistas destino de la Fase 4 del wiring-plan (4.1 listado AP, 4.2 edición item DC-3, 4.3 detalle DTE DC-4) sobre los stubs Bn.3 existentes, extendiendo los contratos Zod/DTO donde falten campos (fila de listado AP, líneas del detalle DTE, update de item) y recableando la navegación para que los flujos compras/ventas/inventario tengan entrada y retorno reales. Frontend Next 14 App Router + capa `services/api`/hooks React Query + MSW; backend NestJS stubs aditivos sobre módulos propios (purchases/sales/items).

## Requirements

### REQ-01: Listado de facturas proveedor (AP) — patrón listado canónico

> **Que cambia**: Compras deja de aterrizar en el builder; el ítem del sidebar abre un listado con KPIs, filtros y tabla de facturas proveedor (stub), como Documentos y Pagos clientes.
> **Por que**: hoy no hay dónde ver las facturas AP ni desde dónde entrar/volver al builder — el flujo Compras no tiene inicio ni fin.

El sistema MUST exponer en `/compras/facturas-proveedor` una vista de listado canónico (`FacturasProveedorListView`) que consume `GET /api/compras/facturas-proveedor` via hook React Query, con: (a) KPIs (total facturas, borradores, pendientes, pagadas, total CLP); (b) filtros: búsqueda libre (proveedor/RUT/código), estado, tipo (nacional/inter), moneda, proveedor (select desde catálogo JOR-057), rango de fechas; (c) tabla con columnas código · proveedor · fecha · tipo · origen · moneda · total · estado (badge); (d) botón primario "+ Crear factura" → `/compras/facturas-proveedor/crear`; (e) estados vacío/carga/error con los patrones existentes. La vista MUST estar gateada por capability `purchases.supplier-invoices:edit` (la misma del endpoint y del nav). El listado MUST NOT incluir row actions hacia vistas inexistentes.

**Actor**: usuario con capability `purchases.supplier-invoices:edit`
**Layers**: frontend, api (contrato), backend (stub)

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado carga y muestra filas del stub
- **GIVEN** MSW/stub responde N facturas proveedor
- **WHEN** el usuario navega a `/compras/facturas-proveedor`
- **THEN** la tabla muestra N filas con código, proveedor, fecha, tipo, moneda, total formateado y badge de estado
- **AND** los KPIs reflejan los conteos por estado del dataset

#### Scenario: filtros reducen el dataset
- **GIVEN** el listado cargado con facturas de estados distintos
- **WHEN** el usuario filtra por estado `pendiente` (o busca por razón social del proveedor)
- **THEN** la tabla muestra solo las filas que cumplen el filtro y aparece el chip de filtro activo

#### Scenario: error del endpoint
- **GIVEN** el endpoint responde 500
- **WHEN** la vista carga
- **THEN** se muestra el estado de error del patrón canónico (sin crash, sin console.error no controlado)

#### Scenario: dataset vacío
- **GIVEN** el endpoint responde `[]`
- **WHEN** la vista carga
- **THEN** se muestra el empty state con invitación a crear la primera factura

</details>

**Acceptance criteria**: entrar a Compras desde el sidebar muestra el listado (no el builder); KPIs/filtros/tabla operan sobre los datos stub; sin acciones muertas por fila.

### REQ-02: Contrato de fila del listado AP (Zod + DTO enriquecido)

> **Que cambia**: el `GET` de facturas proveedor deja de devolver filas de 4 campos y pasa a devolver la fila completa del listado legacy (proveedor, fecha, tipo, origen, estado, montos).
> **Por que**: el DTO actual `{id,codigo,total,currency}` es la respuesta del builder, no una fila de listado — no alcanza para KPIs/filtros/columnas.

El frontend MUST definir `facturaProveedorListItemSchema` (Zod, fuente del contrato — DEC-002 Fase 0) con shape: `{ id, codigo, proveedor: {razonSocial, rut}, fecha (ISO), tipo: 'nacional'|'inter', origen, currency: 'CLP'|'EUR'|'USD', valueCurrency?, neto, iva, total, estado: 'borrador'|'pendiente'|'pagada' }`. El backend MUST reflejarlo en `FacturaProveedorListItemDto` (con `@ApiProperty`) como respuesta de `GET /api/compras/facturas-proveedor`, con `STUB_LIST` enriquecido (≥5 filas coherentes con el dominio repuestos, proveedores alineados al catálogo de JOR-057, estados variados). Las respuestas de `POST /draft` y `POST /` MUST NOT cambiar (siguen con `FacturaProveedorDto`).

**Actor**: system (contrato FE↔BE)
**Layers**: frontend (schema/tipos/servicio/MSW), backend (DTO/service/controller)

<details><summary>Scenarios de validacion</summary>

#### Scenario: parse estricto del contrato
- **GIVEN** la respuesta stub del GET
- **WHEN** el servicio la parsea con `facturaProveedorListItemSchema`
- **THEN** el parse es exitoso y los enums (`tipo`, `currency`, `estado`) rechazan valores fuera del set

#### Scenario: respuestas del builder intactas (regresión)
- **GIVEN** la suite existente de purchases (front y back)
- **WHEN** corre tras el cambio
- **THEN** los tests de draft/issue pasan sin modificación de expectativas de shape

</details>

**Acceptance criteria**: `curl` al GET devuelve filas con los campos nuevos; el builder sigue emitiendo/guardando borrador igual que antes.

### REQ-03: Builder 08 como hija del listado + navegación de cierre de flujo

> **Que cambia**: el builder vive en `/compras/facturas-proveedor/crear`; "Facturar" con éxito y "Salir" vuelven al listado AP (hoy: sin navegación / Home).
> **Por que**: regla de cierre de flujo (wiring Fase 0.1) — crear/emitir navega al listado de origen; el canon del sidebar define el builder como hija oculta.

El sistema MUST montar `PurchaseInvoiceBuilder` en `/compras/facturas-proveedor/crear` (page nueva) y el listado en `/compras/facturas-proveedor`. Post-éxito de "Facturar" el builder MUST navegar al listado (+ toast de éxito existente). "Salir" MUST navegar al listado (con el guard de cambios existente). `nav-data.ts` MUST registrar la ruta `/crear` como entrada `hidden` (resoluble por breadcrumb) manteniendo el ítem visible de Compras apuntando al listado. El breadcrumb MUST resolver las rutas hijas nuevas (`/crear`, `/ventas/documentos/[id]`, `/inventario/items/[id]/editar`) con labels legibles.

**Actor**: usuario con capability `purchases.supplier-invoices:edit|issue`
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: facturar vuelve al listado
- **GIVEN** el builder en `/compras/facturas-proveedor/crear` con líneas válidas
- **WHEN** el usuario factura y el POST responde 201
- **THEN** navega a `/compras/facturas-proveedor` y se muestra el toast de éxito

#### Scenario: salir con cambios pide confirmación y vuelve al listado
- **GIVEN** el builder con el form dirty
- **WHEN** el usuario pulsa "Salir" y confirma el descarte
- **THEN** navega a `/compras/facturas-proveedor`

#### Scenario: breadcrumb de la hija
- **GIVEN** el usuario en `/compras/facturas-proveedor/crear`
- **WHEN** se renderiza el breadcrumb
- **THEN** muestra la cadena Compras › Facturas proveedor › Crear (label legible, no el segmento crudo)

</details>

**Acceptance criteria**: el ciclo entrar→crear→facturar→volver al listado se completa sin URLs muertas.

### REQ-04: Detalle de DTE en ruta propia (DC-4)

> **Que cambia**: el 👁 de Documentos abre `/ventas/documentos/:id` con la ficha del DTE — cabecera (folio, tipo, fecha, receptor, montos), tabla de líneas y badges de estado SII/comercial — en vez de un toast.
> **Por que**: DC-4 cerró que el detalle es ruta propia; hoy la acción más visible del listado no hace nada.

El sistema MUST exponer `/ventas/documentos/[id]` (`DocumentoDetalleView`) que consume `GET /api/ventas/documentos/:id` via `useDocumento(id)`, mostrando: cabecera con folio/tipoDTE/fecha/receptor (razón social + RUT)/montos (neto, IVA, total con `formatCLP`); badges de `estadoSII` y `estadoComercial` (mismos badge-maps del listado — reuso, no copia); tabla de `lineas` (código, descripción, cantidad, precio, total por línea); acciones: "Descargar" (placeholder explícito deshabilitado/toast — depende de emisión SII real) y "Anular" (espejo de la acción del listado: mismo gate `sales.documents:void` y mismo comportamiento actual). El backend MUST extender el stub: `DocumentoDTEDetalleDto` = `DocumentoDTEDto` + `lineas[]` (shape reusado de las líneas del builder) devuelto por `GET /:id`; el `GET /` (listado) MUST NOT cambiar. Un id inexistente MUST renderizar el estado not-found de la vista (desde el 404 del stub). El 👁 de `DocumentosTable` MUST navegar a la ruta del detalle.

**Actor**: usuario con capability `sales.documents:view`
**Layers**: frontend, api (contrato), backend (stub)

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle completo desde el listado
- **GIVEN** el listado de Documentos cargado
- **WHEN** el usuario pulsa 👁 en la fila del doc `doc-1`
- **THEN** navega a `/ventas/documentos/doc-1` y ve cabecera, badges y la tabla de líneas del stub

#### Scenario: id inexistente
- **GIVEN** la ruta `/ventas/documentos/doc-999`
- **WHEN** la vista carga y el stub responde 404
- **THEN** se muestra el estado not-found (sin crash) con vuelta al listado

#### Scenario: badges de doble eje
- **GIVEN** un doc con `estadoSII: aceptado_con_reparos` y `estadoComercial: pendiente`
- **WHEN** se renderiza el detalle
- **THEN** cada eje muestra su badge con el estilo del listado (no se confunden entre sí)

#### Scenario: acciones gateadas
- **GIVEN** un usuario sin `sales.documents:void`
- **WHEN** ve el detalle
- **THEN** "Anular" no se muestra (Can) y "Descargar" aparece como placeholder deshabilitado

</details>

**Acceptance criteria**: click en 👁 lleva al detalle con líneas visibles; URL directa con id inválido muestra not-found.

### REQ-05: Edición de item reusando el form 06 (DC-3)

> **Que cambia**: "Editar" en la tabla de Items y en el modal de detalle abre `/inventario/items/:id/editar` con el form de alta prellenado; guardar actualiza via PATCH stub y vuelve al listado.
> **Por que**: DC-3 cerró reusar el form 06 en modo edición; hoy Editar es un toast muerto y el backend no tiene update.

El backend MUST exponer `PATCH /api/inventario/items/:id` (stub: valida id contra el dataset, 404 si no existe; acepta el shape del create; responde `ItemDetailDto` con los campos mergeados; capability `items.parts:edit`). El frontend MUST: (a) servicio `updateItem(id, input)` + hook `useUpdateItem` (invalida listado + detalle) + MSW handler; (b) `ItemCreateForm` acepta modo edición via props opcionales (`mode: 'create' | 'edit'`, item inicial) con mapper puro `ItemDetail → form values` y submit que en modo edit ejecuta el update — los defaults actuales del modo create MUST NOT cambiar; (c) ruta `/inventario/items/[id]/editar` que carga `useItem(id)` (loading/not-found) y monta el form prellenado; (d) "Editar" en `ItemsTable` y `ItemDetailModal` navega a la ruta. Post-éxito MUST volver al listado de items con toast. El guard de cambios sin guardar existente MUST seguir operando en modo edit.

**Actor**: usuario con capability `items.parts:edit`
**Layers**: frontend, api (contrato), backend (stub)

<details><summary>Scenarios de validacion</summary>

#### Scenario: form prellenado
- **GIVEN** el item `item-1` del stub con descripción/marca/precios/flags conocidos
- **WHEN** el usuario abre `/inventario/items/item-1/editar`
- **THEN** el form muestra los valores del item (incluidos multiselects y steppers), no los defaults de alta

#### Scenario: guardar actualiza y vuelve
- **GIVEN** el form de edición con un campo modificado y válido
- **WHEN** el usuario guarda y el PATCH responde 200
- **THEN** navega a `/inventario/items` con toast de éxito y las queries de listado/detalle se invalidan

#### Scenario: modo create intacto (regresión)
- **GIVEN** la suite existente de `ItemCreateForm`
- **WHEN** corre tras el cambio
- **THEN** pasa sin cambios de comportamiento (defaults, validación, submit de create)

#### Scenario: item inexistente
- **GIVEN** la ruta `/inventario/items/item-999/editar`
- **WHEN** el GET responde 404
- **THEN** la vista muestra not-found sin montar el form

#### Scenario: PATCH sin capability
- **GIVEN** un usuario sin `items.parts:edit`
- **WHEN** llama al PATCH
- **THEN** el backend responde 403 (test supertest del stub)

</details>

**Acceptance criteria**: editar un item desde la tabla o el modal muestra el form con sus datos; guardar vuelve al listado; crear item sigue funcionando idéntico.

### REQ-06: Cobertura de los 3 flujos de navegación + pisos de calidad

> **Que cambia**: los flujos entrada→listado→detalle/edición quedan cubiertos por tests de integración (router + MSW) y las vistas nuevas por test+story cada una.
> **Por que**: D1 redujo el "Playwright e2e" al stack vitest existente — la cobertura de navegación es el sustituto verificable.

Cada componente nuevo MUST seguir RULE-frontend-001/002 (carpeta-por-componente con `.test.tsx` + `.stories.tsx`). Los 3 flujos MUST tener test de integración de navegación (jsdom, `next/navigation` mockeado + MSW): compras (listado→crear→post-éxito→listado), ventas (listado→👁→detalle), items (tabla/modal→editar→guardar→listado). Los GET nuevos MUST cumplir RULE-api-client-001 (AbortSignal). La suite completa (front vitest + back jest) MUST quedar verde con coverage ≥90 en las 4 métricas de ambas capas (RULE-testing-coverage-threshold-002). El dev stack MUST levantar con consola limpia y las 3 rutas nuevas responder 200 (RULE-global-004, smoke de cierre).

**Actor**: system (calidad)
**Layers**: frontend, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: gate de coverage
- **GIVEN** el código nuevo mergeado en la rama del ticket
- **WHEN** corre `vitest run --project '!storybook' --coverage` y `npm run test:cov` (back)
- **THEN** ambos terminan exit 0 con ≥90 en lines/branches/functions/statements

#### Scenario: smoke del stack
- **GIVEN** `./run.sh dev` levantado
- **WHEN** se visitan `/compras/facturas-proveedor`, `/ventas/documentos/doc-1`, `/inventario/items/item-1/editar`
- **THEN** responden 200 y la consola de front/api queda sin errores

</details>

**Acceptance criteria**: suites verdes + coverage ≥90 + smoke de las 3 rutas OK documentado en el ticket.

## Artifacts

### API (contratos stub — fuente: Zod del front, BE refleja)

| Method | Path | Auth/Capability | Request | Response | Errores | Estado |
|--------|------|-----------------|---------|----------|---------|--------|
| GET | `/api/compras/facturas-proveedor` | `purchases.supplier-invoices:edit` | — | `FacturaProveedorListItemDto[]` (**enriquecido** — REQ-02) | 401/403 | modificado |
| GET | `/api/ventas/documentos/:id` | `sales.documents:view` | — | `DocumentoDTEDetalleDto` (**+ lineas[]** — REQ-04) | 401/403/404 | modificado |
| PATCH | `/api/inventario/items/:id` | `items.parts:edit` | `UpdateItemDto` (shape del create) | `ItemDetailDto` | 400/401/403/404 | **nuevo** |

Sin cambios: `POST /compras/facturas-proveedor[/draft]`, `GET /ventas/documentos`, `GET/POST /inventario/items`, `POST /inventario/items/:id/images`.

### Frontend (componentes/rutas/data — todos consumidos en este sprint)

| Artefacto | Path | Tipo | Consumidor |
|-----------|------|------|------------|
| `facturaProveedorListItemSchema` + tipo | `lib/schemas/purchases.ts`, `types/purchases.ts` | contrato | servicio + vista AP |
| `listFacturasProveedor` + `useFacturasProveedor` + MSW GET | `services/api/compras/facturas-proveedor.ts`, `hooks/usePurchases.ts`, `test/msw/handlers/purchases.ts` | data | vista AP |
| `FacturasProveedorListView` + `FacturasProveedorTable` | `components/compras/list/...` (carpeta-por-componente) | vista | page listado |
| page listado + page builder `/crear` | `app/(app)/compras/facturas-proveedor/{page.tsx, crear/page.tsx}` | ruta | nav |
| `documentoDTEDetalleSchema` (+ línea) + tipo | `lib/schemas/ventas.ts`, `types/ventas.ts` | contrato | servicio + detalle |
| `DocumentoDetalleView` | `components/ventas/detail/DocumentoDetalleView/` | vista | page detalle |
| page detalle | `app/(app)/ventas/documentos/[id]/page.tsx` | ruta | 👁 listado 02 |
| badge-maps de estado compartidos (si hoy privados en tabla) | `components/ventas/...` (extracción mínima) | reuso | listado + detalle |
| `updateItem` + `useUpdateItem` + MSW PATCH | `services/api/inventario/items.ts`, `hooks/useItems.ts`, `test/msw/handlers/items.ts` | data | edición item |
| `ItemCreateForm` modo edit + mapper `itemDetailToFormValues` | `components/items/create/ItemCreateForm/` | vista (ext.) | page editar |
| page editar (+ vista wrapper con loading/404) | `app/(app)/inventario/items/[id]/editar/page.tsx` (+ componente en `components/items/edit/`) | ruta | Editar 04/05 |
| entradas nav `hidden` + breadcrumb hijas | `components/shell/nav/nav-data.ts` | nav | breadcrumb |

### Backend (aditivo sobre módulos propios — RULE-global-003 OK)

| Artefacto | Path | Cambio |
|-----------|------|--------|
| `FacturaProveedorListItemDto` + STUB_LIST enriquecido | `purchases/dto/factura-proveedor.dto.ts`, `purchases.service.ts` | fila de listado + datos demo |
| `DocumentoDTEDetalleDto` + `LineaDTEDto` + STUB de líneas | `sales/dto/documento.dto.ts`, `sales.service.ts` | detalle con líneas |
| `UpdateItemDto` + `update()` + `@Patch(':id')` | `items/dto/`, `items.service.ts`, `items.controller.ts` | endpoint nuevo |

Checklist por artefacto: labels/copys de UI en español directo (el proyecto NO tiene infra i18n — deuda ya documentada en el patrón de las vistas existentes, se mantiene la consistencia); todos los artefactos tienen consumidor en este sprint (tabla arriba); sin heurísticas por nombre (estados/tipos son enums tipados del contrato).

## Tasks

### Session 1 — Listado AP + recableado de rutas Compras [tipo: auto] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Contrato fila AP: `facturaProveedorListItemSchema` + tipo + unit del schema | REQ-02 | developer | — | `front/.../lib/schemas/purchases.ts`, `front/.../types/purchases.ts` | vitest schema + `tsc --noEmit` | git revert del commit | DET-1, DET-2, DET-8 | pending | 1 |
| S1.T2 | BE: `FacturaProveedorListItemDto` (@ApiProperty) + STUB_LIST enriquecido (≥5 filas, proveedores del catálogo JOR-057, estados variados) + controller `@ApiResponse` + specs actualizados | REQ-02 | developer | S1.T1 | `backend/.../purchases/dto/factura-proveedor.dto.ts`, `purchases.service.ts`, `facturas-proveedor.controller.ts`, `*.spec.ts` | jest suite purchases verde | git revert | DET-5, DET-8, RULE-global-003 | pending | 1 |
| S1.T3 | FE data: `listFacturasProveedor` (signal) + `useFacturasProveedor` + query keys + MSW GET handler + tests hook | REQ-01, REQ-02 | developer | S1.T1 | `front/.../services/api/compras/facturas-proveedor.ts`, `hooks/usePurchases.ts`, `test/msw/handlers/purchases.ts` | vitest hooks verde | git revert | RULE-api-client-001, DET-8 | pending | 1 |
| S1.T4 | Vista `FacturasProveedorListView` + `FacturasProveedorTable` (KPIs+filtros+tabla espejo 02/09, filtro proveedor via `useProveedores`, empty/loading/error, sin row actions) + test + story | REQ-01 | developer | S1.T3 | `front/.../components/compras/list/FacturasProveedorListView/*`, `FacturasProveedorTable/*` | vitest componente + story render | git revert | RULE-frontend-001, RULE-frontend-002, DET-8 | pending | 1 |
| S1.T5 | Recableado: page listado en `/compras/facturas-proveedor`, builder movido a `crear/page.tsx`, nav-data hidden `/crear`, builder post-éxito y Salir → listado, breadcrumb hijas verificado/extendido; suite compras + shell verde | REQ-03 | developer | S1.T4 | `front/.../app/(app)/compras/facturas-proveedor/{page.tsx,crear/page.tsx}`, `components/shell/nav/nav-data.ts`, `components/compras/builder/PurchaseInvoiceBuilder.tsx` (+ tests afectados) | vitest compras+shell verde | git revert (2 archivos page + 2 edits) | DET-5, DET-8, DET-16, RULE-global-003 | pending | 1 |
| S1.T6 | Test integración navegación compras: listado→crear→facturar→listado (jsdom router mock + MSW) | REQ-06 | developer | S1.T5 | `front/.../components/compras/list/FacturasProveedorListView/FacturasProveedorListView.flow.test.tsx` (o co-locado equivalente) | vitest flow verde | git revert | DET-7, RULE-frontend-002 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): coverage ≥90, lint/tsc, dual-judge DET-35, mutation warn DET-31, commits DET-27, persistencia session | REQ-06 | reviewer | S1.T6 | ticket JOR-060 | coverage + gates persistidos | — | DET-13, DET-20, DET-23, DET-27, DET-31, DET-33, DET-35 | pending | 1 |

### Session 2 — Detalle de DTE (DC-4) [tipo: auto] [tier: T2]

parallel_groups: [[S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Contrato detalle: `lineaDTESchema` + `documentoDTEDetalleSchema` (extend del actual) + tipos + unit | REQ-04 | developer | — | `front/.../lib/schemas/ventas.ts`, `types/ventas.ts` | vitest schema + tsc | git revert | DET-1, DET-2, DET-8 | pending | 2 |
| S2.T2 | BE: `LineaDTEDto` + `DocumentoDTEDetalleDto` + STUB líneas por documento + `findDocumento` devuelve detalle + controller `@ApiResponse` + specs | REQ-04 | developer | S2.T1 | `backend/.../sales/dto/documento.dto.ts`, `sales.service.ts`, `documentos.controller.ts`, `*.spec.ts` | jest suite sales verde | git revert | DET-5, DET-8, RULE-global-003 | pending | 2 |
| S2.T3 | FE data: `getDocumento` tipado a detalle + MSW GET `/:id` con líneas + grep consumidores de `useDocumento` (sin regresión) | REQ-04 | developer | S2.T1 | `front/.../services/api/ventas/documentos.ts`, `hooks/useVentas.ts`, `test/msw/handlers/ventas.ts` | vitest hooks verde | git revert | RULE-api-client-001, DET-5 | pending | 2 |
| S2.T4 | Vista `DocumentoDetalleView` (cabecera + badges reusados + tabla líneas + acciones Descargar placeholder / Anular espejo con Can) + ruta `[id]/page.tsx` + loading/not-found + test + story | REQ-04 | developer | S2.T3 | `front/.../components/ventas/detail/DocumentoDetalleView/*`, `app/(app)/ventas/documentos/[id]/page.tsx` (+ extracción badge-maps si privados) | vitest componente + story | git revert | RULE-frontend-001, RULE-frontend-002, DET-8 | pending | 2 |
| S2.T5 | Cablear 👁 de `DocumentosTable` → detalle + test integración navegación listado→detalle + not-found | REQ-04, REQ-06 | developer | S2.T4 | `front/.../components/ventas/list/DocumentosTable/DocumentosTable.tsx`, `DocumentosListView` tests de flujo | vitest ventas verde | git revert | DET-5, DET-7, DET-16 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2): coverage ≥90, lint/tsc, dual-judge, mutation warn, commits, persistencia | REQ-06 | reviewer | S2.T5 | ticket JOR-060 | coverage + gates persistidos | — | DET-13, DET-20, DET-23, DET-27, DET-31, DET-33, DET-35 | pending | 2 |

### Session 3 — Edición de item (DC-3) [tipo: auto] [tier: T2]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | BE: `UpdateItemDto` + `ItemsService.update(id, dto)` (merge stub, 404) + `@Patch(':id')` con `items.parts:edit` + specs (incl. 403/404) | REQ-05 | developer | — | `backend/.../items/dto/update-item.dto.ts`, `items.service.ts`, `items.controller.ts`, `*.spec.ts` | jest suite items verde | git revert | DET-5, DET-8, RULE-global-003 | pending | 3 |
| S3.T2 | FE data: `updateItem(id, input)` + `useUpdateItem` (invalidate list+detail) + MSW PATCH + tests hook | REQ-05 | developer | — | `front/.../services/api/inventario/items.ts`, `hooks/useItems.ts`, `test/msw/handlers/items.ts` | vitest hooks verde | git revert | RULE-api-client-001, DET-8 | pending | 3 |
| S3.T3 | Form 06 modo edición: props opcionales (`mode`, item inicial) + mapper puro `itemDetailToFormValues` (unit dedicado) + submit edit → update + labels por modo; suite create existente intacta | REQ-05 | developer | S3.T2 | `front/.../components/items/create/ItemCreateForm/*` (+ mapper co-locado) | vitest ItemCreateForm completo verde (create + edit) | git revert | DET-5, DET-8, RULE-frontend-002 | pending | 3 |
| S3.T4 | Ruta + wrapper: `components/items/edit/ItemEditView/` (useItem(id), loading/not-found, monta form prellenado, post-éxito → listado+toast) + `app/(app)/inventario/items/[id]/editar/page.tsx` + nav hidden + test + story | REQ-05 | developer | S3.T3 | `front/.../components/items/edit/ItemEditView/*`, `app/(app)/inventario/items/[id]/editar/page.tsx`, `nav-data.ts` | vitest componente + story | git revert | RULE-frontend-001, RULE-frontend-002 | pending | 3 |
| S3.T5 | Cablear Editar en `ItemsTable` y `ItemDetailModal` → ruta editar + test integración navegación (04→editar→guardar→listado) | REQ-05, REQ-06 | developer | S3.T4 | `front/.../components/items/list/ItemsTable/*`, `components/items/detail/ItemDetailModal/*` (paths reales a confirmar por grep) | vitest items verde | git revert | DET-5, DET-7, DET-16 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2): coverage ≥90, lint/tsc, dual-judge, mutation warn, commits, persistencia | REQ-06 | reviewer | S3.T5 | ticket JOR-060 | coverage + gates persistidos | — | DET-13, DET-20, DET-23, DET-27, DET-31, DET-33, DET-35 | pending | 3 |

### Session 4 — Integración, smoke y docs [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Regresión completa: vitest run (dual-project, cache limpia) + jest full + coverage ≥90 ambas capas + eslint + tsc | REQ-06 | reviewer | — | — (verificación) | suites verdes + coverage reportado en ticket | — | DET-13, RULE-testing-coverage-threshold-002 | pending | 4 |
| S4.T2 | Smoke dev stack (RULE-global-004): `./run.sh dev`, consola front/api limpia, 3 rutas nuevas HTTP 200, flujo manual entrada→listado→detalle/edición verificado y evidenciado en el ticket | REQ-06 | reviewer | S4.T1 | — (verificación) | evidencia en Test cases del ticket | — | DET-13, RULE-global-004 | pending | 4 |
| S4.T3 | Docs: `jormat_docs/frontend/` (doc de las 3 vistas), `jormat_docs/api/README.md` (GET AP enriquecido, GET detalle, PATCH item), `ongoing/flows/` (wiring-plan 4.1/4.2/4.3 resueltas, sidebar-canonical nota AP, docs 02/08 estados), `docs/` del repo si describe rutas/tests afectados | REQ-01..05 (RULE-global-005) | developer | S4.T2 | `jormat_docs/frontend/*`, `jormat_docs/api/README.md`, `jormat_docs/ongoing/flows/*`, `{repo}/docs/*` | review de consistencia doc↔código | git revert (docs) | DET-16, RULE-global-005 | pending | 4 |
| **S4.GATE** | Gate de cierre (⚑ fuerte, tier T3): acceptance checkpoints + propagación DET-16 + backlog/learns + veredicto docs/tests | REQ-06 | reviewer | S4.T3 | ticket JOR-060 | acceptance ejecutado + gates persistidos | — | DET-13, DET-16, DET-17, DET-20, DET-23, DET-27, DET-33 | pending | 4 |

## Technical reference

- **Cliente API front**: axios baseURL `/api/proxy` (`services/api/api.ts`); GET propaga `{signal}` (RULE-api-client-001); errores mapeados a `ApiError` (`lib/api`); MSW `onUnhandledRequest:'error'` — todo endpoint nuevo/cambiado necesita handler.
- **Trío de guards BE**: `AuthGuard → CapabilitiesHydrationGuard → CapabilitiesGuard` + `@RequireCapability` (patrón de todos los controllers de negocio). `@WorkspaceId()` placeholder en stubs.
- **Shape líneas builder ventas** (reusar para `lineas` del detalle): ver `backend/.../sales/dto/line-item.dto.ts` y `lib/schemas/ventas.ts` del front (líneas del `facturaInputSchema`).
- **Patrones de vista**: `DocumentosListView.tsx` (02) es el espejo canónico del listado AP; `PagosClientesListView` (09) segunda referencia. `formatCLP` en `lib/format.ts`.
- **Breadcrumb**: centralizado (JOR-037), resuelve labels desde `nav-data.ts`; verificar resolución de segmentos dinámicos `[id]` (fallback actual desconocido — task S1.T5 lo verifica).
- **Puertos de esta máquina**: front `:3001`, api `:4001` (overrides). Rebuild imagen dev si se tocan configs de raíz (no previsto en este ticket).
- **Coverage**: front `vitest run --project '!storybook' --coverage`; back `npm run test:cov`. v8 ignore SOLO bloques start/stop jsdom-unreachable (RULE-testing-coverage-config-001).

## Constraints

- RULE-frontend-001: carpeta-por-componente + story + test por componente nuevo (vistas AP/detalle/edit, tabla AP).
- RULE-frontend-002: stories con `nextjs.appDirectory: true` cuando usan router; tests jsdom mockean `next/navigation`; radix con `defaultOpen` en tests.
- RULE-api-client-001: GET nuevos aceptan/propagan `AbortSignal`; mutations quedan fuera.
- RULE-testing-coverage-threshold-002 (must): piso 90 en 4 métricas, ambas capas.
- RULE-testing-coverage-config-001 (must): exclusiones por categoría; `app/**/page.tsx` ya excluidos del coverage (thin wrappers) — la lógica vive en componentes testeables.
- RULE-global-003 (must): sales/purchases/items son módulos creados por el equipo (JOR-013/014/015) — modificables; NO tocar auth/workspaces/users/database/seeds entregados.
- RULE-global-004 (must): dev stack levanta + consola limpia antes del cierre.
- RULE-global-005 (must): veredicto docs/tests explícito al cierre.
- DEC-002 Fase 0: el front (Zod) es la fuente del contrato; BE refleja en DTO.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-057 catálogos stub (`useProveedores`) | internal (closed) | select de proveedor en filtros AP | ninguno — entregado |
| JOR-055 nav canónica + breadcrumb | internal (closed) | hidden entries + resolución de hijas | breadcrumb con `[id]` dinámico a verificar (S1.T5) |
| Guard de cambios sin guardar (JOR-056) | internal (closed) | reuso en builder movido y form edit | ninguno — ya operativo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Mover el builder de URL rompe tests/stories que asuman la ruta | medium | suite roja en S1 | actualización mecánica en S1.T5 + suite compras+shell como validación de la task |
| `getDocumento` → detalle rompe consumidores del tipo actual | low | tsc/tests rojos | schema extiende (no muta) el actual; grep de consumidores en S2.T3 (hoy sin vista consumidora) |
| Form 06 en modo edit degrada create | medium | regresión en alta de items | props opcionales con defaults actuales + suite create existente como red + scenario de regresión explícito |
| Breadcrumb no resuelve segmentos dinámicos | medium | migas rotas en 3 rutas nuevas | verificación temprana en S1.T5; si requiere extensión, es cambio acotado al resolver de labels |
| Galería de imágenes en modo edit (media existente del item) se comporta distinto que en create | medium | UX inconsistente en edit | mapper incluye media del detalle; scenarios de prellenado la cubren; si emerge complejidad real, se documenta como backlog `should` (la subida usa el endpoint por id existente) |
| Coverage cae bajo 90 con 3 vistas nuevas | low | gate rojo | test+story por componente desde la task (no al final) + flujos de integración |

## Open questions

— (las 3 decisiones del intake D1/D2/D3 cierran los puntos abiertos; sin preguntas pendientes)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Listado AP sin row actions en v1
- **Contexto**: el legacy tiene acciones por fila (ver/imprimir/pagos/editar); sus vistas destino no existen en el mono.
- **Drivers**: Fase 0.4 del wiring-plan (eliminar toasts "no implementado", no crear nuevos); YAGNI (DET-32).
- **Opcion elegida**: tabla sin columna de acciones; única acción de la vista = "+ Crear factura".
- **Alternativas**: 👁 con toast placeholder (descartada — crea deuda de UX nueva); construir detalle AP (descartada — fuera de alcance, wiring 4.4).
- **Consecuencias**: gana consistencia con la dirección del wiring; pierde paridad visual con el legacy hasta la fase 4.4.
- **Session**: design.

### DEC-LOCAL-02: Detalle DTE reusa badge-maps del listado (extracción mínima si son privados)
- **Contexto**: los badges de doble eje (SII/comercial) viven en `DocumentosTable`; el detalle los necesita idénticos.
- **Drivers**: C1 sin duplicar (patrón JOR-015: extraer primitivas en vez de copiar); riesgo de divergencia de estilos por eje.
- **Opcion elegida**: si los maps son privados de la tabla, extraerlos a módulo compartido del dominio ventas y consumirlos de ambos lados.
- **Alternativas**: copiar los maps al detalle (descartada — divergencia futura asegurada).
- **Consecuencias**: gana single source de estilos de estado; toca `DocumentosTable` (cubierto por su suite).
- **Session**: design (ejecuta S2.T4).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-05 pasan (listado AP operativo, ciclo builder→listado, detalle DTE con líneas y not-found, edición con prellenado y regresión de create).
- [ ] **Tests**: tests+stories por componente nuevo, 3 tests de flujo de navegación, suites front+back verdes.
- [ ] **Coverage**: ≥90 en 4 métricas, ambas capas (comandos de Technical reference).
- [ ] **Rules**: RULE-frontend-001/002, RULE-api-client-001, RULE-global-003 respetadas (verificable en review).
- [ ] **Integration**: dev stack levanta con consola limpia; 3 rutas nuevas responden 200; smoke manual del flujo completo evidenciado (RULE-global-004).
- [ ] **Docs**: jormat_docs (frontend/ + api/ + ongoing/flows/) y docs del repo actualizados; veredicto `docs:`/`tests:` en el cierre (RULE-global-005).
