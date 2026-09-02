---
id: SPEC-catalogos-front-consumo
project: jormat-evolution
ticket: JOR-058
status: done
---

# B2.4 · Consumo de catálogos en el front + filtros dinámicos

# B2.4 · Consumo de catálogos en el front + filtros dinámicos

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Cablear el front a los **6 endpoints de catálogo demo** que ya entregó JOR-057 (`GET /api/catalogos/{categorias,aplicaciones,proveedores,bodegas,formas-pago,clientes}`), reemplazando los **arrays estáticos hardcodeados en componentes** por datos de servicio (axios → `/api/proxy` → backend) vía hooks React Query. El contrato (rutas + shapes camelCase + capability `catalogos:view`) está **fijado por JOR-057** — esto es wiring contra un contrato estable, no diseño nuevo.

Tres frentes: (a) **capa API** (schemas zod + tipos + 6 servicios axios + 6 hooks + handlers MSW de test); (b) **consumidores de Items** (alta de item 06, filtros del listado 04, selector de bodega del detalle 05); (c) **consumidores de transacciones** (forma de pago en 03/10, origen/bodega en 03/08, búsqueda de cliente en 03, proveedores en 08).

### 2. Decisiones criticas

| # | Decision | Racional (1 linea) |
|---|----------|--------------------|
| 1 | **Un módulo front `services/api/catalogos/` (6 archivos) + un `hooks/useCatalogos.ts`** espejo del backend `catalogos/*` | Catálogos transversales reusados por varias vistas; agruparlos evita dispersión y replica el molde `inventario/items.ts`. |
| 2 | **Contrato front = espejo exacto de los DTO de JOR-057** (camelCase, `lib/schemas/catalogos.ts` + `types/catalogos.ts`) | El backend ya fijó la shape y la decoró con `@ApiProperty`; el front la refleja en zod (convención DEC-002) sin reinventarla. |
| 3 | **`value` de los selects = `id` del catálogo (referencia estable), `label` = `nombre`/`descripcion`** — antes eran slugs inventados (`'frenos'`) | El `id` es la referencia que tendrá el modelo real (drop-in); el slug era placeholder. Cambia lo que el form submite → se actualizan sus tests en la misma task (DET-7). |
| 4 | **`useClientes(q)` con búsqueda server-side (`?q=`)**; el resto son listas completas cacheadas | Clientes/proveedores son los catálogos grandes; el contrato ya expone `?q=`. Selects chicos (categorías/bodegas/formas-pago) no necesitan filtro. |
| 5 | **MSW: se AÑADEN handlers de catálogo para tests** (`test/msw/handlers/catalogos.ts`), no se "quita" nada | **Verificado (DET-4)**: no existe worker MSW de navegador (MSW es test-only) ni handlers de catálogo previos; los datos vivían como arrays estáticos en componentes. La instrucción "quitar intercept MSW" del request era genérica; el delta real es swap de estáticos + handlers de test nuevos. |
| 6 | **Búsqueda de cliente en 03 = typeahead que autocompleta el receptor** (razón social/RUT/ciudad/dirección) | El legacy autocompleta el receptor desde el maestro Clientes; se replica con `useClientes(q)` + selección que rellena el form. |

### 3. Riesgos principales y como los mitigamos

- **Cambiar `value` slug→id rompe tests de ItemCreateForm / payload de createItem** → cada consumidor trae sus tests actualizados en su task (DET-7); el item-create es stub (no valida el set de categorías), sin ruptura funcional.
- **Caída de coverage <90** (RULE-testing-coverage-threshold-002) → servicios y hooks con test propio; cada select/filtro cableado verifica estado loading/datos/selección.
- **Hooks sin `QueryClientProvider` en tests** → reusar el harness de render existente (los tests de Items/Ventas ya lo proveen); MSW responde el contrato.
- **`?q=` dispara fetch por tecla** → `useClientes` con `enabled` por longitud mínima del término; el cache de React Query absorbe repeticiones.
- **Filtros del listado 04 hoy `disabled` con `<select>` nativo** → poblar opciones del hook y conectar al estado de filtro existente sin rediseñar la barra.

### 4. Que NO se hace (limites de scope)

- **Mantenedores CRUD de catálogos** (crear categoría/proveedor/etc.) → fuera; solo lectura para poblar selects (ver data-dependencies §5).
- **Modelo de datos / tablas / RLS** → diferido a Capa C (JOR-020); el STUB del backend no cambia.
- **Camiones (fichas)** → diferible (solo relaciona Aplicaciones); no entra.
- **Enums** (Moneda, Tipo DTE, Tipo NAC/INTER, estados) → siguen como constantes; no son catálogo de servicio.
- **Marca** → string libre / distinct del listado; sin endpoint.

### 5. Tamano estimado
**3 sessions**, tier T2 cada una. S1 (capa API) es la base; S2 (consumidores Items) y S3 (consumidores transacciones + docs + cierre) apoyan sobre ella.

### 6. Como vas a saber que funciona
- Alta de item (06): los multiselect Categorías/Aplicaciones/Proveedores muestran los datos del backend (6 categorías, 5 aplicaciones, 4 proveedores reales), no los placeholders.
- Listado items (04): los filtros Categoría y Aplicación dejan de estar `disabled` y filtran.
- Detalle item (05): el selector de bodega lista las 6 bodegas reales (MAT/BOD-*).
- Factura cliente (03): Origen lista bodegas; Forma de pago lista las 22 reales; al buscar un cliente y elegirlo se autocompleta el receptor.
- Factura proveedor (08): Proveedor/Origen poblados por catálogo.
- Aplicar pago (10): Forma de pago lista las 22 reales.
- Suite vitest dual-project verde, coverage ≥90.

## Purpose

Conectar la UI de Capa B (Items, Ventas, Compras, Pagos) a los catálogos demo del backend, eliminando los datos hardcodeados en componentes. Cierra el bloqueo "selects con datos estáticos / filtros disabled" registrado en `ongoing/flows/data-dependencies.md`, dejando el front cableado una sola vez contra el contrato estable; cuando llegue el modelo real (Capa C) solo cambia el interior del service del backend, sin tocar el front.

## Requirements

### REQ-01: Capa API de catálogos (servicios + hooks + contrato)

> **Que cambia**: aparece una capa tipada `catalogos` (schemas zod, tipos, 6 servicios axios, 6 hooks React Query) que expone los datos del backend al front. Antes no existía; los datos eran arrays estáticos en componentes.
> **Por que**: centralizar el acceso a catálogos en un punto tipado, reusable por todos los consumidores, con el mismo molde que `inventario/items`.

El sistema DEBE exponer:
- `lib/schemas/catalogos.ts`: schemas zod que espejan los DTO de JOR-057 (`categoriaSchema`, `aplicacionSchema`, `proveedorSchema`, `bodegaSchema`, `formaPagoSchema`, `clienteSchema`).
- `types/catalogos.ts`: tipos `z.infer` derivados.
- `services/api/catalogos/{categorias,aplicaciones,proveedores,bodegas,formasPago,clientes}.ts`: funciones axios contra `/catalogos/*`, propagando `AbortSignal` en los GET (RULE-api-client-001). `clientes` acepta `q?: string`.
- `hooks/useCatalogos.ts`: `useCategorias`, `useAplicaciones`, `useProveedores`, `useBodegas`, `useFormasPago`, `useClientes(q?)`, con `catalogoKeys` namespaceadas y `useApiQuery`.
- `test/msw/handlers/catalogos.ts`: handlers que cumplen el contrato, compuestos en `handlers.ts`.

El contrato DEBE ser camelCase (sin mapeo snake_case). Los GET DEBEN propagar `signal`.

<details><summary>Scenarios</summary>

- GIVEN un consumidor monta `useCategorias` WHEN la query resuelve THEN retorna `Categoria[]` validado por el schema.
- GIVEN `useClientes('acme')` WHEN se ejecuta THEN llama `GET /catalogos/clientes?q=acme` y retorna los clientes que matchean.
- GIVEN un GET se cancela (AbortSignal) WHEN el componente se desmonta THEN la request se aborta (sin warning de estado en unmount).
</details>

### REQ-02: Consumidores de Items (06 alta, 04 filtros, 05 bodega)

> **Que cambia**: los selects/filtros de Items dejan de usar arrays estáticos y consumen los hooks de catálogo.
> **Por que**: datos reales del backend, coherentes entre vistas, y filtros de listado funcionales.

- `ItemCreateForm` (06) DEBE poblar Categorías/Aplicaciones/Proveedores con `useCategorias`/`useAplicaciones`/`useProveedores` (mapeo `{value:id, label:nombre}`), eliminando `CATEGORIAS_OPTIONS`/`APLICACIONES_OPTIONS`/`PROVEEDORES_OPTIONS`.
- `ItemsListView` (04) DEBE habilitar los filtros Categoría y Aplicación (hoy `disabled`) poblándolos con los hooks y conectándolos al estado de filtro.
- `ItemDetailModal` (05) DEBE poblar el selector de bodega con `useBodegas` en vez del array estático.

<details><summary>Scenarios</summary>

- GIVEN el form 06 monta WHEN cargan los catálogos THEN los multiselect muestran nombres reales (Frenos, Filtros, …) y submiten `id`.
- GIVEN el listado 04 WHEN se elige una categoría en el filtro THEN la tabla filtra por esa categoría.
</details>

### REQ-03: Consumidores de transacciones (03 factura cliente, 08 factura proveedor, 10 pago)

> **Que cambia**: forma de pago, origen/bodega, proveedor y búsqueda de cliente se pueblan desde catálogo.
> **Por que**: los builders y el pago dejan de depender de opciones placeholder/free-text donde existe catálogo.

- Forma de pago (03 `PaymentCard`, 10 `EfectuarPagoForm`) DEBE poblarse con `useFormasPago`.
- Origen/Bodega (03/08) DEBE poblarse con `useBodegas`.
- Proveedor (08) DEBE poder seleccionarse desde `useProveedores`.
- Búsqueda de cliente (03 receptor) DEBE usar `useClientes(q)`: al elegir un cliente se autocompletan los campos del receptor (razón social, RUT, …).

<details><summary>Scenarios</summary>

- GIVEN el pago 10 WHEN se abre el select Forma de pago THEN lista las 22 formas reales.
- GIVEN la factura 03 WHEN se busca "acme" y se elige el resultado THEN el receptor queda autocompletado con los datos del cliente.
</details>

## Necessity/reuse gate (DET-32)

| Artifact/REQ | Veredicto | Razón |
|--------------|-----------|-------|
| Capa API catálogos (REQ-01) | **build** | No existe; es la base. Construida sobre molde existente (`items` service/hook + `useApiQuery`) → reuso de infra. |
| Schemas zod | **build (reuse pattern)** | Espejo de los DTO de JOR-057; reusa el patrón de `lib/schemas/items`. |
| Handlers MSW | **build** | No hay handlers de catálogo; necesarios para que los hooks resuelvan en test. |
| Selects/filtros UI | **reuse** | Los componentes (MultiSelect, Select, barra de filtros, selector de bodega) ya existen; solo cambia la fuente de datos. |
| Mantenedores CRUD | **drop** | Fuera de scope (solo lectura). |

## Tasks

### Session 1 — Capa API de catálogos [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Schemas zod (6) + tipos z.infer | REQ-01 | developer | — | `src/lib/schemas/catalogos.ts`, `src/types/catalogos.ts` | tsc | git revert | DET-1, DET-2 | done | 1 |
| S1.T2 | 6 servicios axios (GET+signal; `clientes` con `?q=`) + test de servicio | REQ-01 | developer | S1.T1 | `src/services/api/catalogos/{categorias,aplicaciones,proveedores,bodegas,formasPago,clientes}.ts`, `catalogos.test.ts` | vitest | git revert | DET-2, RULE-api-client-001 | done | 1 |
| S1.T3 | 6 hooks React Query + keys + test de hook | REQ-01 | developer | S1.T2 | `src/hooks/useCatalogos.ts`, `useCatalogos.test.tsx` | vitest | git revert | DET-2 | done | 1 |
| S1.T4 | Handlers MSW de test + composición | REQ-01 | developer | S1.T1 | `src/test/msw/handlers/catalogos.ts`, `handlers.ts` | vitest | git revert | DET-4 | done | 1 |
| **S1.GATE** | **Gate de sync S1 (tier: T2)** — persistir en ticket, typecheck full + vitest, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33 | done | 1 |

### Session 2 — Consumidores de Items (06/04/05) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | ItemCreateForm: 3 multiselect a hooks (value=id/label=nombre) + test | REQ-02 | developer | S1.GATE | `src/components/items/create/ItemCreateForm/ItemCreateForm.tsx` (+ `.test.tsx`) | vitest | git revert | DET-5, DET-7 | done | 2 |
| S2.T2 | ItemsListView: habilitar+poblar filtros Categoría/Aplicación; extender `ItemListItem` con `categorias?`/`aplicaciones?` opcionales + mock items + test (DEC-LOCAL-01) | REQ-02 | developer | S1.GATE | `src/components/items/list/ItemsListView/ItemsListView.tsx` (+ `.test.tsx`), `src/lib/schemas/items.ts`, `src/test/msw/handlers/items.ts` | vitest --coverage | git revert | DET-5, DET-7, DET-16 | done | 2 |
| S2.T3 | ItemDetailModal: selector de bodega a `useBodegas` + test | REQ-02 | developer | S1.GATE | `src/components/items/detail/ItemDetailModal/ItemDetailModal.tsx` (+ `.test.tsx`) | vitest | git revert | DET-5, DET-7 | done | 2 |
| **S2.GATE** | **Gate de sync S2 (tier: T2)** — vitest + coverage ≥90, quality review, decidir | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33 | done | 2 |

### Session 3 — Consumidores de transacciones (03/08/10) + docs + cierre [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T0 | Revisión de errores Storybook (pedido del dev): App Router + NavigationGuardProvider globales, cache de catálogo sembrado en play, Home determinista | — | developer | S2.GATE | `.storybook/preview.tsx`, `src/components/items/create/ItemCreateForm/ItemCreateForm.stories.tsx`, `src/components/shell/Home/Home.stories.tsx` | vitest --project storybook | git revert | DET-4, DET-13 | done | 3 |
| S3.T1 | ~~Forma de pago (03/10) → catálogo~~ **DIFERIDA (DEC-LOCAL-02)**: 03/10 usan enums zod validados distintos del catálogo; migrar toca schemas+backends de otros dominios | REQ-03 | developer | S2.GATE | (n/a — diferida) | (n/a) | (no aplica) | DET-5, DET-32 | deferred | 3 |
| S3.T2 | Origen/bodega (03/08) + proveedores (08) → `useBodegas`/`useProveedores` + tests | REQ-03 | developer | S2.GATE | `src/components/ventas/builder/TransactionBuilder/*`, `src/components/compras/builder/PurchaseInvoiceBuilder.tsx` (+ tests) | vitest | git revert | DET-5, DET-7 | done | 3 |
| S3.T3 | Búsqueda de cliente (03) → `useClientes(q)` + autocompletado del receptor + test | REQ-03 | developer | S3.T2 | `src/components/ventas/builder/TransactionBuilder/*` (+ test) | vitest | git revert | DET-5, DET-7 | done | 3 |
| S3.T4 | Docs: `jormat_docs/frontend/` (capa API + consumo catálogos) + marcar resuelto el bloqueo en `ongoing/flows/data-dependencies.md` | REQ-03 | developer | S3.T1, S3.T2, S3.T3 | `jormat_docs/frontend/api-client.md`, `jormat_docs/ongoing/flows/data-dependencies.md` | manual | git revert | RULE-global-005, DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync S3 (tier: T2)** — vitest + coverage ≥90, quality review, cierre (teach-close skipped) | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-22, DET-23, DET-33 | done | 3 |

## Decisions

### DEC-LOCAL-01: Filtros 04 — extender `ItemListItem` con campos de catálogo opcionales
- **Contexto**: los filtros Categoría/Aplicación del listado 04 estaban `disabled`; `itemListItemSchema` no incluye `categorias`/`aplicaciones`, por lo que poblar el select no permitía filtrar las filas.
- **Drivers**: dejar el filtro funcional en demo sin inventar un contrato divergente; ser drop-in cuando el backend list devuelva el campo.
- **Opción elegida (A)**: habilitar+poblar los selects desde el catálogo y extender `ItemListItem` con `categorias?: string[]` / `aplicaciones?: string[]` **opcionales** + mock MSW de items; `applyFilters` matchea cuando el campo está presente.
- **Alternativas**: (B) solo poblar sin matching efectivo → filtro que aparenta funcionar y no filtra (mala UX); (C) diferir → no habilitar ahora. Descartadas en favor de A.
- **Consecuencias**: toca el contrato de items (aditivo/seguro). Contra el backend real actual (sin el campo) el filtro degrada a "no match"; sin ruptura. Confirmada por el dev (2026-06-29).
- **Session**: S2

### DEC-LOCAL-02: Forma de pago se mantiene en enum (no migrar al catálogo en JOR-058)
- **Contexto**: el request pedía cablear "forma de pago" en 03/10 al catálogo. Verificado (DET-5): `formaPago` es un `z.enum` validado distinto por dominio — ventas `['contado','credito_30','credito_60','credito_90']`, payments `['Transferencia','Debito','Cheque','Efectivo','Sin pago']` — y el catálogo expone 22 formas con `{id, descripcion}`. Tres espacios de valores distintos.
- **Drivers**: migrar cambiaría el valor enviado a los backends de ventas/pagos (contrato), tocando schemas+forms+tests+DTO de otros dominios; excede "consumir catálogos en el front".
- **Opción elegida**: **dejar forma de pago como está aplicada hoy** (los enums validados). Cablear desde catálogo solo origen/bodega (03/08), proveedores (08) y cliente (03).
- **Alternativas**: migrar ventas+payments al id de catálogo (mayor blast radius, riesgo de drift); migrar solo 10 (inconsistente). Descartadas.
- **Consecuencias**: forma de pago sigue funcionando con su contrato; la unificación con el catálogo queda como backlog `should` para cuando el backend alinee el contrato. Confirmada por el dev (2026-06-29).
- **Session**: S3

## Backlog

| # | Item | Priority | Status | Origen |
|---|------|----------|--------|--------|
| B1 | Unificar "forma de pago" de ventas (03) y pagos (10) con el catálogo `formas-pago` (22 valores con id), alineando schemas zod + DTO de backend ventas/payments | should | open | DEC-LOCAL-02 |

> DET-17: B1 es `should` → **no bloquea** el cierre de JOR-058. Se aborda cuando el backend de ventas/pagos exponga/acepte el contrato de catálogo.

## Open questions

- (resuelta) Filtros 04 sin campo de categoría en la fila → DEC-LOCAL-01 (opción A, confirmada por el dev).
