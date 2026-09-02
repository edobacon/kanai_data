---
id: SPEC-items-catalog
project: jormat-evolution
ticket: JOR-013
status: done
---

# B1 · Items / Catálogo (front + stub) — patrón Bn de la Fase B

# B1 · Items / Catálogo (front + stub) — patrón Bn de la Fase B

## Executive summary — lo que estas aprobando

### 1. Que se quiere
El **primer módulo de negocio** del producto: catálogo de repuestos de camión. Tres vistas — **04 Listado** (KPIs + filtros + tabla con semáforo de stock), **05 Detalle** (modal de ficha con stock por bodega, media y resumen comercial) y **06 Alta** (form complejo de 5 secciones + multiselect con chips + galería drag-drop, máx 8 imágenes). Recorre la rampa Bn **solo hasta el stub**: Bn.0 capabilities → Bn.1 contrato Zod → Bn.2 FE contra MSW → Bn.3 BE stub (NestJS, DTO+Swagger hardcodeado, sin DB). Establece el **patrón Bn** que reusan B2–B5. El modelo de datos real es Fase C.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| **No split** del ticket (013a/b/c) | Las 3 vistas comparten el contrato Bn.1, el módulo api y los hooks; splittear fragmenta el linchpin. Partición por **sessions** (H5 refutada en intake). |
| **Front es la fuente del contrato** (Zod a mano, DEC-002 Fase 0) | El front no espera al backend; define los shapes y el BE los refleja en DTO. Bn.1 destraba todo. |
| Tipos a mano en `src/types/items.ts` hasta Bn.3 | El Swagger sin `@ApiProperty` produce `Record<string,never>` (caveat H6). Bn.3 decora los DTO y recién ahí el regen (DEC-002 Fase 1) es significativo. |
| **MultiSelect** primitiva nueva (Select Radix + Badge chips) | La UI lib no la tiene; la vista 06 la exige (Categorías/Aplicaciones/Proveedores). Reusable transversal. |
| Galería con **`@dnd-kit/sortable`** + storage local (DEC-007) | `@dnd-kit` ya instalado (A0); el storage es `StorageService` (Multer `diskStorage`), primer consumidor. S3/R2 diferido a infra. |
| Stories-como-tests (Storybook browser) + Vitest jsdom + Supertest | Convención del proyecto: stories por estado (default/vacío/carga/error) + hooks RTL+MSW + supertest del stub. |
| Vacíos renderizan **"—"** / "Sin ubicación" | El mockup 05 muestra `undefined` literal — anti-patrón documentado a evitar. |

### 3. Riesgos principales y cómo los mitigamos
- **Galería drag-drop + storage es lo nuevo de verdad** (primer consumidor de `@dnd-kit` y DEC-007) → aislada en S4; `StorageService` con validación de tipo/tamaño/límite 8 en el stub (S5). Candidata a split S4a/S4b si excede 3h.
- **Drift FE↔BE del contrato**: el front define Zod (S1) y el BE lo refleja en DTO (S5); si difieren, el regen de tipos (Fase 1) hace fallar la compilación del FE → red de seguridad explícita en S5.
- **Gateo por capability**: cada acción de las vistas mapea a `items.parts:{view,edit,...}`; el stub aplica `@RequireCapability` + test 403. La UI oculta, el backend revalida (no confiar solo en ocultar).
- **`onUnhandledRequest:'error'` en MSW**: cada hook nuevo necesita su handler o el test falla — los handlers de items se agregan junto al hook (S1 base + por vista).

### 4. Que NO se hace
- **Modelo de datos real** (tablas, repos dinámicos, queries con filtros reales) → Fase C / Capa C.
- **RBAC por endpoint dinámico** con datos reales y aislación de tenant verificada cross-tenant → Capa C4 (el stub aplica `@RequireCapability` + `workspace_id` placeholder, sin DB).
- **Lógica de importación CSV** (la vista 04 tiene el botón "Subir CSV" y "Exportar" como acción de UI, sin backend).
- **Fase 2 de DEC-002** (tipado universal) — solo Fase 1 (regen del stub de items).
- Tocar la base entregada / MSAL / `AuthGuard` (RULE-global-003).

### 5. Tamaño estimado
**5 sessions**. Las más riesgosas: **S4** (vista 06 — form complejo + galería dnd-kit + MultiSelect, ⚑ fuerte; candidata a split) y **S5** (BE stub + StorageService + switch MSW→stub + regen tipos + gate S1–S4, ⚑ fuerte).

### 6. Cómo vas a saber que funciona
- En `/inventario/items`: 5 KPIs con conteos, filtros operativos, tabla con semáforo de stock (En stock/Bajo/Sin), y "+ Crear item" **oculto** sin `items.parts:edit`.
- Click en un ID abre el modal de detalle con stock por 6 bodegas; ningún campo muestra `undefined` (se ve "—").
- En `/inventario/nuevo`: form valida requeridos con zod, MultiSelect agrega/quita chips, la galería sube ≤8 imágenes, reordena por drag y marca "Principal".
- El stub responde el shape del contrato (supertest verde), devuelve 403 sin la capability, y tras el switch el FE compila contra los tipos regenerados del Swagger.

## Purpose

Construir el primer módulo de negocio (Items / Catálogo de repuestos) recorriendo la rampa de madurez del servicio **solo hasta el stub** (contrato → FE contra mock → BE stub), para el actor con capabilities `items.*`. Establece el **patrón Bn** reusable por los módulos de Ventas/Compras/Finanzas (B2–B5): cómo se seedean capabilities, cómo el front define el contrato Zod, cómo se componen las vistas sobre la librería UI de Fase A, y cómo el BE responde un stub tipado que habilita la regeneración de tipos. El valor: desbloquea la construcción en paralelo de las vistas de negocio con un contrato estable que no cambia cuando llegue lo dinámico (Fase C).

## Requirements

### REQ-01 · Bn.0 — Registrar las capabilities de Items en el catálogo (seed)

> **Que cambia**: se agregan al catálogo `capabilities` las del módulo Items, vía un seed idempotente nuevo, para que las vistas puedan gatearse y los roles otorgarlas.
> **Por qué**: es el primer módulo que consume `items.*` y `entities.suppliers:view`; sin ellas en el catálogo, ni el `<Can>` FE ni el `@RequireCapability` BE tienen contra qué resolver.

El sistema MUST registrar en la tabla `capabilities` (vía seed idempotente `seeds/04_items_capabilities.ts`, mismo patrón que `03_rbac.ts`) las capabilities: `items.parts:{view,edit,critical,matrix,priority}`, `items.categories:view`, `items.applications:view`, `entities.suppliers:view`. Cada fila MUST tener `name` (`module.feature:action`), `module`, `feature`, `action` y `description`. El seed MUST ser idempotente (insertar solo si no existe por `name`) y MUST no correr en producción (`if (NODE_ENV === 'production') return`). El seed NO MUST alterar capabilities existentes de otros módulos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed inserta capabilities de items
- **GIVEN** una DB de test con el catálogo RBAC (migración `20260614000000_rbac_tables.ts`)
- **WHEN** se corre `knex seed:run`
- **THEN** existen 8 filas nuevas (`items.parts:view`, …, `entities.suppliers:view`) con `module`/`feature`/`action` correctos.

#### Scenario: idempotencia
- **GIVEN** el seed ya corrido una vez
- **WHEN** se corre de nuevo
- **THEN** no se duplican filas (count de `items.*` se mantiene en 7 + 1 de suppliers).

#### Scenario: no corre en prod
- **GIVEN** `NODE_ENV=production`
- **WHEN** se invoca el seed
- **THEN** retorna sin insertar.

</details>

**Acceptance**: 8 capabilities en el catálogo de test; idempotente; guard de producción presente; sin tocar otras capabilities.

- **source_ref**: `implementation-tasks.md` §registro-de-capabilities-por-módulo (B1 Items), `permissions-model.md`, DEC-006, `seeds/03_rbac.ts`. **Layers**: backend (seeds), db (catálogo capabilities). **Certeza**: confirmed.

### REQ-02 · Bn.1 — Contrato Zod del módulo Items (shapes request/response) + tipos FE + scaffolding api/MSW

> **Que cambia**: se definen los schemas Zod que son el **contrato objetivo** del módulo (Item de listado, Item de detalle con stock por bodega, payload de alta), los tipos derivados, el módulo api tipado (skeleton) y los handlers MSW base.
> **Por qué**: es el artefacto linchpin (DEC-002 Fase 0 — el front es la fuente del contrato); destraba las 3 vistas (Bn.2) y el stub (Bn.3).

El sistema MUST definir en `src/lib/schemas/items.ts` los schemas Zod del contrato: `itemListItemSchema` (campos del listado: id, descripción, referencias, marca, códigoMarca, precio, iva, stock, estadoStock), `itemDetailSchema` (ficha completa: información básica, `stockPorBodega[]` con `{ bodega, stock, ubicacion? }`, resumen comercial, auditoría), `itemCreateInputSchema` (payload de alta: 5 secciones — general con categorías/aplicaciones/proveedores N:M, referencias[], precios, canales web, info adicional con stockCritico, imágenes[] con `principal`). Los tipos TS MUST derivarse de los schemas (`z.infer`) y exponerse en `src/types/items.ts` (tipos a mano hasta Bn.3 — caveat H6). El sistema MUST crear el módulo api tipado `src/services/api/inventario/items.ts` (skeleton: firmas `listItems`, `getItem`, `createItem`, `uploadItemImage` sobre el axios centralizado `/api/proxy`, sin `fetch` suelto) y los handlers MSW base en `src/test/msw/handlers/items.ts` con datos hardcodeados que cumplen el contrato. La enumeración de `estadoStock` (En stock/Bajo stock/Sin stock) MUST vivir como constante tipada, no como magic strings dispersos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: schemas válidos
- **GIVEN** un objeto que cumple el shape del listado
- **WHEN** `itemListItemSchema.safeParse(obj)`
- **THEN** `success: true`.

#### Scenario: schema rechaza shape inválido
- **GIVEN** un payload de alta sin `descripcion` (requerido) o con >8 imágenes
- **WHEN** `itemCreateInputSchema.safeParse(payload)`
- **THEN** `success: false` con issue en el campo correcto.

#### Scenario: stock por bodega con ubicación opcional
- **GIVEN** una bodega sin `ubicacion`
- **WHEN** se valida `itemDetailSchema`
- **THEN** pasa (campo opcional); el render posterior mostrará "Sin ubicación", no `undefined`.

</details>

**Acceptance**: unit Vitest de los schemas (válidos/ inválidos por campo clave) verdes; tipos derivados sin `any`; módulo api compila; handlers MSW devuelven el contrato.

- **source_ref**: `implementation-tasks.md` Bn.1, DEC-002 (Fase 0 Zod manual), `04/05/06-items-*.md`, `frontend-api-layer.md`. **Layers**: frontend (schemas, types, services, test/msw). **Certeza**: confirmed.

### REQ-03 · Bn.2 vista 04 — Listado de Items (`/inventario/items`)

> **Que cambia**: nueva ruta `/inventario/items` con 5 KPIs, filtros, y `DataTable` con semáforo de stock; acciones gateadas por capability; contra MSW.
> **Por qué**: es la vista de consulta del catálogo; aplica el patrón list canónico (igual que Documentos) al dominio de inventario.

El sistema MUST renderizar en `/inventario/items` (route group `(app)`, página nueva) un `PageLayout` con título "Listado de Items" + subtítulo y acciones "Subir CSV" (outline), "Exportar" (outline) y "+ Crear item" (primary); un `StatGrid` con 5 `KPICard` (Total / Con stock [info] / Bajo stock [warning] / Sin stock [destructive] / Marcas [accent-brand]); un `FilterBar` (search por nombre/referencia/marca + selects Marca/Categoría/Aplicación/Estado + limpiar); y un `DataTable` (columnas ID [link al detalle], Descripción, Referencias, Marca [pill], Precio/IVA, Stock, Estado [badge semáforo], Acciones) alimentado por `useItems()` (React Query sobre el módulo api, contra MSW). El semáforo de estado MUST usar `Badge` con variantes success/warning/error según `estadoStock`. "+ Crear item" y la acción "Editar" de fila MUST gatearse con `<Can cap="items.parts:edit">`; el ID/ver con `items.parts:view`. La vista MUST manejar estados loading (skeleton), vacío (`EmptyState`) y error (`ErrorState`). El click en el ID MUST abrir el detalle (REQ-04).

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado con datos
- **GIVEN** MSW devolviendo 8 items con estados de stock variados
- **WHEN** se renderiza la vista
- **THEN** la tabla muestra 8 filas, los 5 KPIs muestran conteos, y cada fila tiene el badge de estado correcto (En stock/Bajo/Sin).

#### Scenario: acción oculta sin capability
- **GIVEN** caps `['items.parts:view']` (sin `:edit`)
- **WHEN** se inspecciona el DOM
- **THEN** "+ Crear item" y "Editar" no se renderizan; "Ver" sí.

#### Scenario: estado vacío
- **GIVEN** MSW devolviendo `[]`
- **WHEN** se renderiza
- **THEN** se ve `EmptyState`, no una tabla vacía con headers sueltos.

#### Scenario: error de fetch
- **GIVEN** MSW respondiendo 500
- **WHEN** se renderiza
- **THEN** se ve `ErrorState` con retry.

</details>

**Acceptance**: stories (default/vacío/carga/error) + hook test (loading/success/error) + Can-gating test verdes; smoke UI de `/inventario/items`.

- **source_ref**: `04-items-listado.md`, `component-system.md` §5 (patrón list), `permissions-by-view.md` §4 (items), `nav-data.ts:38` (grupo Inventario). **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-04 · Bn.2 vista 05 — Detalle del item (modal)

> **Que cambia**: modal de ficha completa abierto sobre el listado: información básica, stock por bodega, media card, resumen comercial y footer de acciones.
> **Por qué**: ver la ficha sin salir del listado (patrón detail-modal); reusa el `Dialog` de A3.

El sistema MUST renderizar un `ItemDetailModal` (composite sobre `Dialog`) que, dado un item id, muestra vía `useItem(id)` (contra MSW): **información básica** (Descripción, Aplicaciones, Referencias [chips], Marca [pill], Código marca, Categorías [pill], Proveedores, Bloqueo descuento) en un `KeyValueGrid`; una **media card** (`MediaCard`: logos + imagen + acciones Imprimir/Editar/Duplicar/Compartir); una **sub-tabla `StockByWarehouseTable`** (6 bodegas: MAT, BOD-CHILL, BOD-CONST, BOD-TEM, BOD-ESTR, BOD-CONCE; columnas Stock [pill] y Ubicación); etiquetas de tránsito/disponibilidad; y un **resumen comercial** (`KeyValueGrid`: Neto, IVA, Valor en Dólar, Dcto. máx, Stock crítico, canales, auditoría). El footer MUST tener select de bodegas + Editar (primary) / Ver ficha (info) / Imprimir / Cerrar (destructive). **CRÍTICO**: todo valor vacío/ausente MUST renderizarse como "—" (o "Sin ubicación" en la columna de ubicación), NUNCA el literal `undefined` (anti-patrón del mockup). Las acciones Editar MUST gatearse con `items.parts:edit`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle con stock por bodega
- **GIVEN** un item con stock en 6 bodegas (una sin ubicación)
- **WHEN** se abre el modal
- **THEN** la sub-tabla muestra 6 filas; la bodega sin ubicación muestra "Sin ubicación", no `undefined`.

#### Scenario: campos vacíos como em-dash
- **GIVEN** un item con `proveedores` vacío
- **WHEN** se renderiza el `KeyValueGrid`
- **THEN** el valor muestra "—", no "undefined" ni vacío ambiguo.

#### Scenario: editar gateado
- **GIVEN** caps sin `items.parts:edit`
- **WHEN** se ve el footer
- **THEN** "Editar" no se renderiza; "Cerrar"/"Imprimir" sí.

</details>

**Acceptance**: stories (con/sin ubicación, con campos vacíos) + test que verifica ausencia del literal `undefined` en el render; smoke UI del modal.

- **source_ref**: `05-items-visualizar.md` (incl. nota anti-patrón `undefined`), `component-system.md` §5 (detail-modal), `Dialog` (A3). **Layers**: frontend (components, hooks). **Certeza**: confirmed.

### REQ-05 · Bn.2 vista 06 — Alta de item (form complejo + galería drag-drop)

> **Que cambia**: nueva ruta `/inventario/nuevo` con form de 5 secciones numeradas, multiselect con chips, mini-tabla de referencias, steppers de precio y galería de imágenes con reorden drag-drop (máx 8, marcar principal).
> **Por qué**: es el alta del catálogo; introduce 2 primitivas nuevas (MultiSelect, ImageGalleryUploader) que reusarán otros módulos.

El sistema MUST renderizar en `/inventario/nuevo` un form (RHF + zod con `itemCreateInputSchema`) con barra de acciones **sticky** (Cancelar / Guardar borrador / "+ Crear item") y 5 secciones en cards: (1) Información general con `MultiSelect` de chips para Categorías/Aplicaciones/Proveedores; (2) Códigos y referencias con `ReferencesMiniTable` (agregar/editar/eliminar + contador); (3) Precios con `NumberStepper` (`$`); (4) Canales / Web; (5) Información adicional con Stock crítico (estado de error rojo si inválido). MUST incluir una `ImageGalleryUploader` (`@dnd-kit/sortable`): dropzone (JPG/PNG/WEBP), grid de thumbnails con reorden por drag, marcar "Principal", eliminar, **máximo 8 imágenes**, contador. El submit MUST llamar `useCreateItem()` (contra MSW) y mapear errores `{code}`→campo vía `mapApiErrorToField` (FormField). "+ Crear item" MUST gatearse con `items.parts:edit`. La validación de requeridos MUST ser inline (FormField `error`). El `MultiSelect` MUST ser una primitiva reutilizable nueva (Select Radix + Badge chips removibles).

<details><summary>Scenarios de validacion</summary>

#### Scenario: validación inline de requeridos
- **GIVEN** el form vacío
- **WHEN** se intenta "+ Crear item"
- **THEN** los campos requeridos (Descripción, Marca, Tipo, Categorías, Stock crítico) muestran error inline; no se llama `useCreateItem`.

#### Scenario: multiselect agrega/quita chips
- **GIVEN** el campo Categorías
- **WHEN** se selecciona "Frenos" y luego se quita su chip (`x`)
- **THEN** el valor del form refleja el array actualizado.

#### Scenario: galería respeta el límite de 8
- **GIVEN** 8 imágenes cargadas
- **WHEN** se intenta agregar una 9ª
- **THEN** se rechaza con feedback (no se agrega); el contador permanece en 8.

#### Scenario: reorden marca principal
- **GIVEN** una galería con 3 imágenes
- **WHEN** se arrastra la 3ª al primer lugar
- **THEN** queda como "Principal" (orden principal-primero).

#### Scenario: submit exitoso
- **GIVEN** el form válido y MSW aceptando el POST
- **WHEN** se envía
- **THEN** `useCreateItem` resuelve y se muestra toast de éxito.

</details>

**Acceptance**: stories (vacío/validación/galería con imágenes) + form test (zod valida, submit, mapeo error→campo) + interacción galería (play) + Can-gating verdes; smoke UI de `/inventario/nuevo`.

- **source_ref**: `06-items-nuevo.md`, DEC-007 (storage local), `@dnd-kit` (package.json), `FormField`/`FormSection` (A3), `component-system.md` §5 (create-form). **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-06 · Bn.3 — BE stub del módulo Items (NestJS DTO+Swagger hardcodeado) + StorageService

> **Que cambia**: nuevo `ItemsModule` (controller + service stub + DTOs con `@ApiProperty` + Swagger) que responde el contrato con datos hardcodeados (sin DB), con `@RequireCapability` por endpoint; y un `StorageService` (Multer `diskStorage`) para el upload de la galería. El front deja MSW y apunta al stub.
> **Por qué**: cierra el loop FE↔BE (proxy/auth/errores reales) y habilita la regeneración de tipos (REQ-07); el storage es el primer consumidor de DEC-007.

El sistema MUST exponer `ItemsModule` (registrado en `app.module.ts`, importando `PermissionsModule`) con `ItemsController` (`@Controller('inventario/items')`, guard trio `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`) y endpoints stub que devuelven el shape del contrato (Bn.1) con datos hardcodeados, sin DB: `GET /` (list, `@RequireCapability('items.parts:view')`), `GET /:id` (detail, `items.parts:view`), `POST /` (create, `items.parts:edit`), `POST /:id/images` (upload, `items.parts:edit`). Los DTOs MUST decorarse con `@ApiProperty` (para que el Swagger exponga shapes reales — caveat H6) y con `class-validator` (validados por el `ValidationPipe` global whitelist+transform). Los endpoints MUST documentarse con `@ApiTags('items')`/`@ApiOperation`/`@ApiResponse`. El sistema MUST crear `StorageModule`/`StorageService` (Multer `diskStorage`, validación de tipo JPG/PNG/WEBP + tamaño + límite 8, ruta servida por Nest) consumido por el endpoint de upload. Las respuestas de error MUST seguir el shape `{code, message}` (`AllExceptionsFilter`). El listado MUST incluir el `workspace_id` del tenant en la firma del servicio (placeholder S1 — sin query real). El front MUST reemplazar los handlers MSW por llamadas al stub (`/api/proxy/inventario/items`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: stub responde el contrato
- **GIVEN** el `ItemsController` montado (Supertest, sin DB)
- **WHEN** `GET /inventario/items` con cap `items.parts:view`
- **THEN** 200 con un array de items que cumple el shape del contrato Bn.1.

#### Scenario: 403 sin capability
- **GIVEN** un request sin `items.parts:view`
- **WHEN** `GET /inventario/items`
- **THEN** 403 con `{code:'FORBIDDEN'}`.

#### Scenario: upload valida tipo y límite
- **GIVEN** el endpoint de upload
- **WHEN** se sube un archivo no-imagen o la 9ª imagen
- **THEN** 400 con `{code, message}`; no se persiste.

#### Scenario: regen de tipos significativo
- **GIVEN** el stub con DTOs `@ApiProperty`
- **WHEN** se corre `npm run generate:api-types`
- **THEN** `src/types/api.gen.ts` contiene los shapes de Items (no `Record<string,never>`).

</details>

**Acceptance**: supertest (shape + 403 + upload inválido) verde; Swagger expone `items`; FE apunta al stub y la vista 04/05/06 sigue funcionando contra el stub.

- **source_ref**: `implementation-tasks.md` Bn.3, DEC-007 (StorageService), `permissions/roles.controller.ts` (patrón guard trio), `common/auth/require-capability.decorator.ts`, `main.ts` (ValidationPipe/Swagger), caveat H6 (`src/types/rbac.ts:1-6`). **Layers**: backend (módulo, dto, storage), frontend (services — switch MSW→stub). **Certeza**: confirmed.

### REQ-07 · DEC-002 Fase 1 (regen de tipos del stub) + cierre de cobertura

> **Que cambia**: con el stub decorado, se regeneran los tipos del FE desde el Swagger (Fase 1 del piloto de tipado); si el contrato cambia, el FE deja de compilar. Y se consolida la cobertura de tests del módulo.
> **Por qué**: el contrato deja de mantenerse a mano (sincronización FE↔BE automática); la cobertura cierra el DoD.

El sistema MUST regenerar `src/types/api.gen.ts` desde el Swagger del stub (`npm run generate:api-types`) y MUST hacer que los tipos a mano de `src/types/items.ts` se reconcilien con (o re-exporten desde) los generados donde sea significativo, dejando el front compilando (`tsc` limpio). El sistema MUST consolidar la suite de tests del módulo: stories-como-tests (Storybook browser) por estado de cada vista, hooks (Vitest + `renderHook` + MSW: loading/success/error), gateo `<Can>` (oculta/expone por capability) y supertest del stub; y MUST reportar el coverage delta del módulo items. Mutation testing (DET-31) MUST correr sobre el código nuevo al cerrar las sessions que tocan código (warn-first).

<details><summary>Scenarios de validacion</summary>

#### Scenario: FE compila contra tipos regenerados
- **GIVEN** el stub corriendo y los tipos regenerados
- **WHEN** `tsc`
- **THEN** sin errores en los consumidores de `items`.

#### Scenario: drift detectado
- **GIVEN** un cambio en el DTO del stub que rompe el contrato
- **WHEN** se regeneran tipos y compila el FE
- **THEN** `tsc` falla en el consumidor (red de seguridad del contrato).

</details>

**Acceptance**: `generate:api-types` produce shapes de items; `tsc` limpio; suite verde; coverage delta reportado; mutación warn-first registrada.

- **source_ref**: DEC-002 (Fase 1), `implementation-tasks.md` Bn.3 (regen), `package.json` `generate:api-types`, `Testing por paso`. **Layers**: frontend (types, tests), backend (tests). **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Target | Cómo se mide |
|------|--------|--------------|
| Security | El gateo UI nunca es la única frontera: cada acción mapea a su capability `items.*` + el stub aplica `@RequireCapability` (test 403). DTO del stub sin campos internos. Upload valida tipo/tamaño/límite (no acepta ejecutables ni >8). `workspace_id` en la firma del servicio (scope, aunque sin query real hasta Fase C). | supertest 403 (REQ-06) + revisión por acción (`permissions-by-view.md`) |
| Maintainability | Las 3 vistas comparten primitivas (sin duplicación C1): MultiSelect, KeyValueGrid, NumberStepper reusables; lógica/hooks/presentación separados; sin `any` (C2). | quality review 10-dim por session (DET-23) |

## Artifacts

| Artefacto | Path | source_ref | Acción |
|-----------|------|-----------|--------|
| Seed capabilities Items | `backend/jormat-api/seeds/04_items_capabilities.ts` | REQ-01 | crea |
| Contrato Zod Items | `front/jormat-front/src/lib/schemas/items.ts` | REQ-02 | crea |
| Tipos de dominio Items | `front/jormat-front/src/types/items.ts` | REQ-02/07 | crea |
| Módulo API Items | `front/jormat-front/src/services/api/inventario/items.ts` | REQ-02/03/04/05/06 | crea |
| Handlers MSW Items | `front/jormat-front/src/test/msw/handlers/items.ts` | REQ-02 | crea |
| Hooks React Query | `front/jormat-front/src/hooks/useItems.ts` (useItems/useItem/useCreateItem/useUploadItemImage) | REQ-03/04/05 | crea |
| Vista Listado | `front/jormat-front/src/app/(app)/inventario/items/page.tsx` + `src/components/items/list/` | REQ-03 | crea |
| Vista Detalle (modal) | `src/components/items/detail/` (ItemDetailModal, StockByWarehouseTable, MediaCard, KeyValueGrid) | REQ-04 | crea |
| Vista Alta | `front/jormat-front/src/app/(app)/inventario/nuevo/page.tsx` + `src/components/items/create/` (form, ReferencesMiniTable, NumberStepper) | REQ-05 | crea |
| Primitiva MultiSelect | `front/jormat-front/src/components/ui/multi-select/` | REQ-05 | crea |
| Primitiva ImageGalleryUploader | `front/jormat-front/src/components/ui/image-gallery-uploader/` | REQ-05 | crea |
| Nav gateado (cap en item Inventario) | `front/jormat-front/src/components/shell/nav/nav-data.ts` | REQ-03 | modifica (aditivo — `cap: 'items.parts:view'`) |
| Módulo BE Items (stub) | `backend/jormat-api/src/items/` (module, controller, service, dto/*) | REQ-06 | crea |
| StorageService | `backend/jormat-api/src/storage/` (storage.module.ts, storage.service.ts) | REQ-06 | crea |
| Tipos regenerados | `front/jormat-front/src/types/api.gen.ts` | REQ-07 | modifica (regen) |
| Tests (stories/hooks/can/supertest) | `src/components/items/**/*.stories.tsx`, `*.test.tsx`, `src/items/*.spec.ts` | REQ-03..07 | crea |

> **Checklist de calidad por artefacto**: copys/labels de la UI hardcodeados en español — el proyecto **no tiene infra i18n aún** (deuda explícita; i18n es-CL es alcance de B5 según `implementation-tasks.md`); se documenta como deuda, no se bloquea. Cada artefacto tiene consumidor en este sprint (todas las vistas/hooks/primitivas se usan). Los estados de stock usan una **constante tipada** (`module.feature:action` y enum `estadoStock`), no heurística por nombre de campo.

## Constraints

- **RULE-global-001**: DoD C1–C6 — separar lógica/hooks/presentación; sin `any`; sin código muerto ni `console.*`; nombres en inglés / comentarios en español; primitivas compartidas extraídas (sin duplicar entre vistas).
- **RULE-global-002**: seguridad S1–S4 — cada acción mapea a su capability + `@RequireCapability` en el stub (test 403); DTO sin campos internos; upload valida input; `workspace_id` en la firma del servicio.
- **RULE-global-003**: NO tocar base entregada (MSAL/`AuthGuard`/RLS). El stub aplica el patrón existente sin alterar el flujo de auth.
- **DEC-002**: Fase 0 (Zod a mano, front fuente del contrato) en S1; Fase 1 (regen del Swagger) en S5.
- **DEC-006**: capabilities `module.feature:action`.
- **DEC-007**: storage local Multer `diskStorage` tras `StorageService`; S3/R2 diferido.
- **DET-30**: rama `epic/jormat-v1` (no develop/master). `execute_scope` declarado en el ticket.
- **DET-31**: mutation testing warn-first al cierre de sessions que tocan código.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-006 (UI atoms/forms) | internal | Button, Input, Select, Card, Badge, FormField, FormSection | DONE — bajo |
| JOR-007 (UI data+layout) | internal | DataTable, FilterBar, KPICard, StatGrid, EmptyState, ErrorState, Dialog, PageLayout, Pagination | DONE — bajo (verificado en intake) |
| JOR-008/010/011 (RBAC) | internal | `<Can>`/`useCan`/`can()`, vector real cableado, guard trio + `@RequireCapability` + catálogo capabilities | DONE — bajo |
| `@dnd-kit/core` + `/sortable` | external (npm) | galería drag-drop | DONE — instalado (A0), primer consumidor |
| `openapi-typescript` | external (npm) | regen de tipos (Fase 1) | DONE — script presente (JOR-011); caveat H6 (requiere `@ApiProperty`) |
| `multer` / `@nestjs/platform-express` | external (npm) | StorageService diskStorage | a verificar en S5 — platform-express viene con Nest; `multer` types puede faltar (instalar si es así) |
| Backend levantado en dev | runtime | Swagger en `/api/docs` para regen (S5) | medio — requiere `./run.sh dev` + DB migrada/seed |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Galería dnd-kit + storage es lo más nuevo (primer consumidor de ambos) | high | medium | Aislada en S4 (galería FE) + S5 (storage BE); split S4a/S4b disponible; StorageService valida tipo/tamaño/límite |
| Drift FE↔BE del contrato | medium | medium | Front define Zod (S1); BE refleja en DTO (S5); regen de tipos hace fallar `tsc` si difieren |
| MSW `onUnhandledRequest:'error'` rompe tests al añadir hooks | medium | low | Cada hook nuevo agrega su handler en `handlers/items.ts` o `server.use()` por test |
| `multer` types ausentes | low | low | Verificar en S5; instalar `@types/multer` si falta (devDep) |
| Storybook browser flaky (dual-project) | medium | low | jsdom para hooks/gating; stories de interacción con `play`; limpiar cache si flaky (ref. memoria jormat-front vitest dual-project) |

## Open questions

- Ninguna abierta. Las 4 del draft resueltas (render vacíos "—", MultiSelect nueva, ubicación de schemas `src/lib/schemas/items.ts`, tokens verde fuera de alcance) — ver `tickets/JOR-013.draft/intent.md` + ticket decisions_log.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: No split del ticket — partición por sessions
- **Contexto**: el triage planteó split condicional 013a/b/c por vista (H5).
- **Drivers**: las 3 vistas comparten el contrato Bn.1 (linchpin), el módulo api y los hooks.
- **Opción elegida**: una sola ticket JOR-013, partición por 5 sessions (S1 contrato → S2/S3/S4 vistas → S5 stub).
- **Alternativas**: split en 3 tickets (descartada — fragmentaría el contrato compartido y duplicaría scaffolding).
- **Consecuencias**: el contrato se define una vez y se consume por las 3 vistas; S5 cierra el loop para todas.
- **Session**: intake-explore (H5 refutada).

### DEC-LOCAL-02: Front es la fuente del contrato; tipos a mano hasta Bn.3
- **Contexto**: DEC-002 Fase 0; el Swagger sin `@ApiProperty` produce `Record<string,never>` (caveat H6).
- **Drivers**: el front no espera al backend; el contrato Zod destraba las vistas.
- **Opción elegida**: Zod en `src/lib/schemas/items.ts` (S1) + tipos a mano en `src/types/items.ts`; regen significativo recién en S5 (DTO decorados).
- **Alternativas**: esperar al stub para tipar (descartada — bloquea las vistas; invierte el flujo Bn).
- **Consecuencias**: una ventana donde tipos a mano y Swagger conviven; S5 reconcilia.
- **Session**: design-feature.

### DEC-LOCAL-03: MultiSelect como primitiva nueva reutilizable
- **Contexto**: la UI lib de A3 no tiene MultiSelect; la vista 06 lo exige (3 campos N:M).
- **Drivers**: reutilización transversal (B2–B5 también tendrán N:M); coherencia con shadcn/Radix.
- **Opción elegida**: `components/ui/multi-select/` (Select Radix + Badge chips removibles).
- **Alternativas**: instalar un combobox externo (descartada — incoherente con la lib propia) / inline en la vista (descartada — no reutilizable, viola C1).
- **Consecuencias**: +1 primitiva mantenida por el proyecto.
- **Session**: design-feature.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan.
- [ ] **Tests**: stories-como-tests por estado + hooks (RTL+MSW) + Can-gating + supertest del stub verdes; coverage delta del módulo reportado.
- [ ] **NFRs**: cada acción mapea a su capability + stub revalida (403); DTO sin campos internos; upload valida input.
- [ ] **Rules**: RULE-global-001/002/003 (sin `any`, base intacta, primitivas extraídas, scope `workspace_id`).
- [ ] **Integration**: tras el switch, las 3 vistas funcionan contra el stub; FE compila contra los tipos regenerados (no `Record<string,never>`).
- [ ] **Patrón Bn**: el módulo queda como referencia replicable (seed → contrato → vistas → stub) para B2–B5.
- [ ] **Mutation (DET-31)**: corrida warn-first registrada por session que toca código; sobrevivientes críticos → hardening task; light → backlog must.

## Tasks

### Session 1 — Bn.0 capabilities seed + Bn.1 contrato Zod + tipos + scaffolding api/MSW [tipo: auto] [tier: T2]

parallel_groups: [[S1.T3, S1.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Seed idempotente `04_items_capabilities.ts` (8 capabilities `items.*` + `entities.suppliers:view`), guard de prod | REQ-01 | developer | — | `backend/jormat-api/seeds/04_items_capabilities.ts` | `knex seed:run` en DB test + verificar 8 filas + idempotencia | git rm del seed | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Contrato Zod `lib/schemas/items.ts` (listItem/detail/createInput) + enum `estadoStock` tipado | REQ-02 | developer | — | `front/jormat-front/src/lib/schemas/items.ts` | unit Vitest (shapes válidos/inválidos por campo) | git rm | DET-1, DET-2, DET-8 | done | 1 |
| S1.T3 | Tipos de dominio `types/items.ts` (z.infer) + módulo api skeleton `services/api/inventario/items.ts` (axios centralizado) | REQ-02 | developer | S1.T2 | `src/types/items.ts`, `src/services/api/inventario/items.ts` | `tsc` limpio + lint (sin `any`, sin fetch suelto) | git revert | DET-2, DET-8, RULE-global-001 | done | 1 |
| S1.T4 | Handlers MSW base `test/msw/handlers/items.ts` (datos hardcodeados que cumplen el contrato) | REQ-02 | developer | S1.T2 | `src/test/msw/handlers/items.ts` | unit que consume el handler (parse OK) | git rm | DET-2, DET-8 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): quality review 10-dim + unit Zod/seed verdes + mutation warn-first | REQ-01/02 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket, spec | gate persistido + vitest --coverage + dkc-mutate async | — | DET-13, DET-20, DET-23, DET-31 | done | 1 |

### Session 2 — Bn.2 vista 04 Listado [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `useItems()` (RQ list, contra MSW) + key factory `itemKeys` | REQ-03 | developer | S1.GATE | `src/hooks/useItems.ts` | unit hook (loading/success/error) RTL+MSW | git revert | DET-2, DET-8 | done | 2 |
| S2.T2 | Página `/inventario/items` + PageLayout + StatGrid(5 KPIs) + FilterBar + DataTable (semáforo Badge) | REQ-03 | developer | S2.T1 | `src/app/(app)/inventario/items/page.tsx`, `src/components/items/list/` | stories (default/vacío/carga/error) + smoke UI | git rm ruta | DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T3 | Gateo acciones (`<Can items.parts:edit>` Crear/Editar; view Ver) + nav `cap` en nav-data + click ID→detalle (placeholder) | REQ-03 | developer | S2.T2 | `src/components/items/list/`, `src/components/shell/nav/nav-data.ts` | unit Can-gating (oculta sin cap) | git revert | DET-8, RULE-global-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3, ⚑ fuerte): reviewer aislado + smoke UI listado + quality review + mutation | REQ-03 | reviewer | S2.T1, S2.T2, S2.T3 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — Bn.2 vista 05 Detalle (modal) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `useItem(id)` (RQ detail, MSW) + `KeyValueGrid` (vacío→"—") + `ItemDetailModal` (sobre Dialog) | REQ-04 | developer | S1.GATE | `src/hooks/useItems.ts`, `src/components/items/detail/` | unit hook + test ausencia literal `undefined` | git revert | DET-2, DET-8, RULE-global-001 | done | 3 |
| S3.T2 | `StockByWarehouseTable` (6 bodegas, ubicación vacía→"Sin ubicación") + etiquetas tránsito | REQ-04 | developer | S3.T1 | `src/components/items/detail/` | stories (con/sin ubicación) | git revert | DET-8, RULE-global-001 | done | 3 |
| S3.T3 | `MediaCard` + resumen comercial (KeyValueGrid) + footer acciones gateadas (`items.parts:edit`) | REQ-04 | developer | S3.T1 | `src/components/items/detail/` | stories + Can-gating | git revert | DET-8, RULE-global-002 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T3, ⚑ fuerte): reviewer aislado + smoke modal + verificar sin `undefined` + quality review + mutation | REQ-04 | reviewer | S3.T1, S3.T2, S3.T3 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 3 |

### Session 4 — Bn.2 vista 06 Alta (form + galería) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Primitiva `MultiSelect` (Select Radix + Badge chips removibles) reutilizable | REQ-05 | developer | S1.GATE | `src/components/ui/multi-select/` | stories + unit (agrega/quita chips) | git rm | DET-2, DET-8, RULE-global-001 | done | 4 |
| S4.T2 | Primitiva `ImageGalleryUploader` (`@dnd-kit/sortable`: dropzone, reorden, principal, máx 8, JPG/PNG/WEBP) | REQ-05 | developer | S1.GATE | `src/components/ui/image-gallery-uploader/` | stories + play (reorden/límite 8) | git rm | DET-2, DET-8, RULE-global-001 | done | 4 |
| S4.T3 | `useCreateItem()` (RQ mutation, MSW) + página `/inventario/nuevo` form RHF+zod (5 secciones, NumberStepper, ReferencesMiniTable, sticky bar) | REQ-05 | developer | S4.T1, S4.T2 | `src/app/(app)/inventario/nuevo/page.tsx`, `src/components/items/create/`, `src/hooks/useItems.ts` | stories + form test (zod/submit/mapeo error→campo) + Can-gating | git rm ruta | DET-5, DET-8, RULE-global-002 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier T3, ⚑ fuerte): reviewer aislado + smoke alta + galería + quality review + mutation. Split S4a/S4b si excede 3h | REQ-05 | reviewer | S4.T1, S4.T2, S4.T3 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 4 |

### Session 5 — Bn.3 BE stub + StorageService + switch MSW→stub + regen tipos [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S5.T1, S5.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | `ItemsModule` + controller (guard trio + `@RequireCapability`) + service stub + DTOs (`@ApiProperty` + class-validator) + Swagger `@ApiTags('items')` | REQ-06 | developer | S1.GATE | `backend/jormat-api/src/items/`, `src/app.module.ts` | supertest (shape + 403) | git rm módulo | DET-2, DET-8, RULE-global-002 | done | 5 |
| S5.T2 | `StorageModule`/`StorageService` (Multer diskStorage, valida tipo/tamaño/límite 8) + endpoint `POST /:id/images` | REQ-06 | developer | S1.GATE | `backend/jormat-api/src/storage/`, `src/items/items.controller.ts` | supertest (upload válido + inválido/9ª→400) | git rm módulo | DET-2, DET-8, RULE-global-002 | done | 5 |
| S5.T3 | FE switch MSW→stub (módulo api apunta a `/api/proxy/inventario/items`) + regen `api.gen.ts` + reconciliar tipos | REQ-07 | developer | S5.T1, S5.T2 | `src/services/api/inventario/items.ts`, `src/types/{items,api.gen}.ts` | `generate:api-types` + `tsc` limpio + las 3 vistas contra stub | revertir a MSW | DET-5, DET-8, DET-16 | done | 5 |
| S5.T4 | Consolidar cobertura del módulo (stories/hooks/can/supertest) + coverage delta + mutation final | REQ-07 | developer | S5.T3 | tests del módulo | vitest --coverage verde + supertest verde | — | DET-7, DET-13 | done | 5 |
| **S5.GATE** | Gate de cierre Session 5 (tier T3, ⚑ fuerte): reviewer aislado + acceptance checkpoints + FE compila contra tipos regenerados + quality review + mutation | REQ-06/07 | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket, spec | acceptance ejecutado + tsc + supertest + quality review + dkc-mutate | — | DET-13, DET-14, DET-20, DET-23, DET-31 | done | 5 |

## Technical reference

**Contrato (Bn.1, front fuente — DEC-002 Fase 0):**
- `itemListItemSchema`: `{ id, descripcion, referencias: string[], marca, codigoMarca, precio: number, iva: number, stock: number, estadoStock: 'en_stock'|'bajo_stock'|'sin_stock' }`
- `itemDetailSchema`: list + `{ aplicaciones: string[], categorias: string[], proveedores: string[], bloqueoDescuento: boolean, stockPorBodega: { bodega, stock, ubicacion?: string }[], resumenComercial: { neto, iva, valorDolar, dctoMax, stockCritico, canales }, auditoria: { actualizado, usuario } }`
- `itemCreateInputSchema`: `{ descripcion*, marca*, codigoMarca*, tipo*, categorias*: string[], aplicaciones: string[], proveedores: string[], referencias: { codigo }[], precios: { compraNeto*, compra*, neto*, porMayor }, canales: {...}, bloqueoDescuento, oferta, descuentoMax, stockCritico*, observacionWeb, imagenes: { id, url, principal }[] (max 8) }`

**Endpoints stub (Bn.3, base `/api`, proxy `/api/proxy`, prefijo `inventario/items`):**
- `GET /inventario/items` (`items.parts:view`) → `itemListItemSchema[]`
- `GET /inventario/items/:id` (`items.parts:view`) → `itemDetailSchema`
- `POST /inventario/items` (`items.parts:edit`) → `itemDetailSchema`
- `POST /inventario/items/:id/images` (`items.parts:edit`, multipart) → `{ id, url, principal }`

**Capabilities B1**: `items.parts:{view,edit,critical,matrix,priority}`, `items.categories:view`, `items.applications:view`, `entities.suppliers:view`.

**Patrones a reusar (Fase A, verificados en intake-explore):**
- Guard trio BE: `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` + `@RequireCapability('items.parts:view')` (ref. `permissions/roles.controller.ts:32-38`).
- Módulo importa `PermissionsModule` (ref. `UsersModule`); registra en `app.module.ts` imports.
- FE: cliente axios `services/api.ts` (`/api/proxy`); `useApiQuery`/`useApiMutation` de `@/lib/api`; key factory (ref. `useRoles.ts`); `<Can cap>`/`useCan`; FormField + `mapApiErrorToField`.
- Tests: jsdom para hooks/gating (vitest project), Storybook browser para stories `play`; MSW `server.use()` por test o `handlers/items.ts`; supertest in-process sin DB (ref. `common/foundations.integration.spec.ts`).
- Render vacíos como "—" / "Sin ubicación" (anti-patrón `undefined` del mockup 05).
