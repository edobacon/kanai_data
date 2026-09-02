---
id: SPEC-sales-documents
project: jormat-evolution
ticket: JOR-014
status: done
---

# B2 · Ventas (front + stub) — patrón transaction-builder de la Fase B

# B2 · Ventas (front + stub) — patrón transaction-builder de la Fase B

## Executive summary — lo que estas aprobando

### 1. Que se quiere
El **segundo módulo de negocio**: Ventas. Dos vistas — **02 Documentos** (listado de DTE con 5 KPIs + filtros + tabla con **doble eje de estado** SII/comercial — patrón list canónico, reusa JOR-013) y **03 Crear factura cliente** (patrón **transaction-builder**: cabecera + tabla de líneas editable + buscador de items + 3 cards Resumen/Pago/Cliente + recálculo en vivo + banner de stock). Recorre la rampa Bn **solo hasta el stub**: Bn.0 capabilities → Bn.1 contrato Zod → Bn.2 FE contra MSW → Bn.3 BE stub (NestJS, DTO+Swagger hardcodeado, sin DB). **Define el patrón transaction-builder** que reusan B3 (Compras) y B4 (Pagos). El modelo de datos real (DTEs, ciclo AR, emisión SII) es Fase C.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| **No split** del ticket | Las 2 vistas comparten el contrato Bn.1 y el módulo api; el builder se parte en **2 sessions** (shell / resumen) no en tickets (H7). |
| **Front es la fuente del contrato** (Zod a mano, DEC-002 Fase 0) | El front define los shapes DTE + builder; el BE los refleja en DTO. Bn.1 destraba todo. |
| **Doble eje de estado** = 2 enums Zod independientes (H5) | `estadoSII` (aceptado/aceptado_con_reparos/rechazado) y `estadoComercial` (aceptado/pendiente/rechazado) son ortogonales; no confundirlos. |
| **Buscador del builder reusa el contrato/hook de Items** (H3) | `useItems()` + `itemListItemSchema` de JOR-013; en Bn.2 filtra client-side (sin endpoint `?q=`). |
| `formatCLP` extraído a `lib/format.ts` (D2) | Backlog B2 de JOR-013 (privado en `ItemsTable.tsx`); lo consumen DocumentosTable + totales del builder. |
| `NumberStepper` promovido a `components/ui/` (D3) | Hoy domain-scoped en `items/create/`; el builder lo reusa para Cant./Desc. |
| `moneda` en el contrato desde día 1 (D4) | Multi-moneda real es B5, pero el shape `facturaCreateInput` la lleva (default `CLP`, IVA 19%). |
| **Borrador vs Facturar** = 2 schemas (D5) | `facturaDraftInput` (parcial) / `facturaIssueInput` (estricto); RHF valida según la acción. |
| `calcTotals()` función pura testeable (C4) | Recálculo Subtotal/Neto/IVA/Total aislado de la UI; unit-tested y mutation-friendly (`.ts`). |
| Stories-como-tests + Vitest jsdom + Supertest | Convención del proyecto (igual que JOR-013). |

### 3. Riesgos principales y cómo los mitigamos
- **El transaction-builder es lo nuevo de verdad** (primer consumidor de `useFieldArray` RHF + reorden dnd-kit en tabla + recálculo vivo) → partido en S3 (shell) / S4 (resumen+buscador+recálculo); `calcTotals()` como función pura cubre la lógica crítica con unit + mutation.
- **Doble eje de estado**: confundir SII con comercial produciría badges erróneos → 2 enums tipados + 2 badge-maps explícitos; unit del contrato por eje.
- **Drift FE↔BE del contrato**: el front define Zod (S1) y el BE lo refleja en DTO (S5); el regen de tipos (Fase 1) hace fallar `tsc` si difieren.
- **Gateo por capability**: cada acción mapea a `sales.*`; el stub aplica `@RequireCapability` + test 403. La UI oculta, el backend revalida.
- **MSW `onUnhandledRequest:'error'`**: cada hook nuevo necesita su handler; los de ventas se agregan junto al hook.
- **Contexto de sucursal activa (D1)**: el banner de stock por sucursal no tiene store; en Bn.2 se simula con MSW (item `sin_stock`), el modelado se difiere.

### 4. Que NO se hace
- **Modelo de datos real** (tablas DTE, facturas, ciclo AR, repos dinámicos) → Fase C.
- **Emisión real de DTE** (integración SII, folios CAF, firma) → fuera de alcance total.
- **Entidad Customer / CRUD de clientes** → "Actualizar receptor" es stub gateado (D6); el modelo de clientes es posterior.
- **Multi-moneda avanzado** (conversión, IVA 0 import) → B5 (solo el campo `moneda` existe en el contrato).
- **RBAC por endpoint dinámico** con datos reales y cross-tenant → Capa C (el stub aplica `@RequireCapability` + `workspace_id` placeholder).
- Tocar la base entregada / MSAL / `AuthGuard` (RULE-global-003).

### 5. Tamaño estimado
**5 sessions**. Las más riesgosas: **S3** (builder shell — header form + tabla líneas `useFieldArray` + reorden dnd-kit, ⚑ fuerte) y **S4** (buscador + 3 cards + recálculo vivo + banner stock + draft/issue, ⚑ fuerte).

### 6. Cómo vas a saber que funciona
- En `/ventas/documentos`: 5 KPIs con conteos, filtros operativos (tipo DTE, ambos ejes de estado, rango fecha), tabla con **doble badge** (SII + comercial), y "Anular" **oculto** sin `sales.documents:void`.
- En `/ventas/crear-factura`: agregar items desde el buscador los inserta en la tabla de líneas; cambiar Cant./Desc. recalcula Subtotal/Neto/IVA(19%)/Total en vivo; reordenar filas por drag funciona; el banner de stock aparece para un item sin stock; "Facturar" oculto sin `sales.invoices:issue`.
- El stub responde el shape del contrato (supertest verde), devuelve 403 sin la capability, y tras el switch el FE compila contra los tipos regenerados del Swagger.

## Purpose

Construir el módulo Ventas recorriendo la rampa Bn **solo hasta el stub** (contrato → FE contra mock → BE stub), para el actor con capabilities `sales.*`. Establece el **patrón transaction-builder** reusable por Compras (B3) y Pagos (B4): cómo se compone una vista de construcción de transacciones (cabecera + líneas editables + buscador + resumen con recálculo en vivo) sobre la librería UI de Fase A y el contrato de Items de JOR-013. El valor: desbloquea la construcción de los flujos de facturación/compra con un contrato estable y un patrón de UI complejo ya resuelto, antes de que llegue lo dinámico (Fase C).

## Requirements

### REQ-01 · Bn.0 — Registrar las capabilities de Ventas en el catálogo (seed)

> **Que cambia**: se agregan al catálogo `capabilities` las del módulo Ventas, vía un seed idempotente nuevo, para gatear las vistas y otorgarlas a roles.
> **Por qué**: es el primer módulo que consume `sales.*`; sin ellas, ni el `<Can>` FE ni el `@RequireCapability` BE tienen contra qué resolver.

El sistema MUST registrar en la tabla `capabilities` (vía seed idempotente `seeds/05_sales_capabilities.ts`, mismo patrón que `04_items_capabilities.ts`) las capabilities: `sales.documents:{view,void}`, `sales.invoices:{edit,issue}`, `entities.customers:edit`. Cada fila MUST tener `name` (`module.feature:action`), `module`, `feature`, `action` y `description`. El seed MUST ser idempotente (insertar solo si no existe por `name`) y MUST no correr en producción (`if (NODE_ENV === 'production') return`). El seed NO MUST alterar capabilities existentes de otros módulos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed inserta capabilities de ventas
- **GIVEN** una DB de test con el catálogo RBAC
- **WHEN** se corre el seed `05_sales_capabilities.ts`
- **THEN** existen 5 filas nuevas (`sales.documents:view`, `:void`, `sales.invoices:edit`, `:issue`, `entities.customers:edit`) con `module`/`feature`/`action` correctos.

#### Scenario: idempotencia
- **GIVEN** el seed ya corrido una vez
- **WHEN** se corre de nuevo
- **THEN** no se duplican filas.

#### Scenario: no corre en prod
- **GIVEN** `NODE_ENV=production`
- **WHEN** se invoca el seed
- **THEN** retorna sin insertar.

</details>

**Acceptance**: 5 capabilities en el catálogo de test; idempotente; guard de producción presente; sin tocar otras capabilities.

- **source_ref**: `implementation-tasks.md:217` (sales caps), `permissions-model.md`, DEC-006, `seeds/04_items_capabilities.ts`. **Layers**: backend (seeds), db (catálogo capabilities). **Certeza**: confirmed.

### REQ-02 · Bn.1 — Contrato Zod del módulo Ventas (DTE + builder) + tipos FE + scaffolding api/MSW

> **Que cambia**: se definen los schemas Zod del contrato (documento DTE de listado con doble eje de estado, payload del builder de factura draft/issue, línea de factura), los enums de estado/tipo, los tipos derivados, el módulo api tipado (skeleton) y los handlers MSW base. Se extrae `formatCLP` y se promueve `NumberStepper`.
> **Por qué**: artefacto linchpin (DEC-002 Fase 0); destraba las 2 vistas (Bn.2) y el stub (Bn.3).

El sistema MUST definir en `src/lib/schemas/ventas.ts` los enums tipados `ESTADO_SII` (`aceptado`/`aceptado_con_reparos`/`rechazado`), `ESTADO_COMERCIAL` (`aceptado`/`pendiente`/`rechazado`) y `TIPO_DTE` (`factura_electronica`/`nota_credito_electronica`/`guia_despacho_electronica`) con sus `*_LABEL` y badge-variant maps; y los schemas: `documentoDTESchema` (listado: id, folio, tipoDTE, fecha, receptor `{razonSocial, rut}`, estadoSII, estadoComercial, neto, iva, total), `lineItemSchema` (`{ itemId, descripcion, precio, cantidad, descuento, total }`), `facturaDraftInputSchema` (parcial — todo opcional salvo estructura) y `facturaIssueInputSchema` (estricto — header requerido + ≥1 línea + forma de pago), ambos con `{ receptor, fecha, oc?, origen, tipoDTE, moneda (default 'CLP'), lineas: lineItem[], formaPago, despacho: boolean, observacion?, descuentoGlobal? }` (D4/D5). Los tipos TS MUST derivarse (`z.infer`) en `src/types/ventas.ts`. El sistema MUST crear el módulo api tipado `src/services/api/ventas/documentos.ts` y `src/services/api/ventas/facturas.ts` (skeletons: `listDocumentos`, `getDocumento`; `createFacturaDraft`, `issueFactura` sobre el axios centralizado) y los handlers MSW base en `src/test/msw/handlers/ventas.ts`. El sistema MUST extraer `formatCLP` a `src/lib/format.ts` (D2) y reemplazar su uso privado en `ItemsTable.tsx`. El sistema MUST promover `NumberStepper` a `src/components/ui/number-stepper/` (D3) y actualizar su import en la vista 06 de Items.

<details><summary>Scenarios de validacion</summary>

#### Scenario: schemas válidos
- **GIVEN** un documento DTE que cumple el shape del listado (ambos ejes de estado)
- **WHEN** `documentoDTESchema.safeParse(obj)`
- **THEN** `success: true`.

#### Scenario: ejes de estado independientes
- **GIVEN** un documento con `estadoSII: 'aceptado_con_reparos'` y `estadoComercial: 'pendiente'`
- **WHEN** se valida
- **THEN** pasa (los enums son ortogonales; `aceptado_con_reparos` NO es valor válido de `estadoComercial`).

#### Scenario: issue rechaza factura sin líneas
- **GIVEN** un payload de factura sin líneas o sin forma de pago
- **WHEN** `facturaIssueInputSchema.safeParse(payload)`
- **THEN** `success: false` con issue en el campo correcto; `facturaDraftInputSchema` del mismo payload SÍ pasa (parcial).

#### Scenario: formatCLP extraído
- **GIVEN** `formatCLP(1234567)`
- **WHEN** se invoca desde `lib/format.ts`
- **THEN** retorna `"$ 1.234.567"`; `ItemsTable.tsx` lo importa (sin copia privada).

</details>

**Acceptance**: unit Vitest de schemas (válidos/inválidos por eje y por modo draft/issue) + `formatCLP` verdes; tipos derivados sin `any`; módulo api compila; handlers MSW devuelven el contrato; `NumberStepper` en `ui/` con import de Items actualizado.

- **source_ref**: `implementation-tasks.md` B2.1, DEC-002 (Fase 0 Zod manual), `02-ventas-documentos.md:27` (doble eje), `03-ventas-crear-factura.md`, `frontend-api-layer.md`, JOR-013 backlog B2 (formatCLP). **Layers**: frontend (schemas, types, services, test/msw, lib, ui). **Certeza**: confirmed.

### REQ-03 · Bn.2 vista 02 — Listado de Documentos DTE (`/ventas/documentos`)

> **Que cambia**: nueva ruta `/ventas/documentos` con 5 KPIs, filtros (tipo DTE + ambos ejes de estado + rango fecha), y `DataTable` con **doble badge** de estado; acciones gateadas; contra MSW.
> **Por qué**: vista de consulta de DTEs; aplica el patrón list canónico (reusa JOR-013) al dominio de ventas.

El sistema MUST renderizar en `/ventas/documentos` (route group `(app)`, página nueva) un `PageLayout` con título "Documentos" + subtítulo "Consulta y gestión de documentos electrónicos" y acción "+ Crear documento" (primary, gateada con `sales.invoices:edit`); un `StatGrid` con 5 `KPICard` (Total documentos / Pendientes [warning] / Aceptados [success] / Rechazados [destructive] / Total facturado [success, CLP]); un `FilterBar` (search por receptor/folio/rut + selects Tipo de documento / Estado SII / Estado comercial + rango Desde/Hasta + limpiar); y un `DataTable` (columnas Receptor [razón social + RUT], Tipo de documento, Folio, Fecha, **Estado SII** [badge], **Estado** comercial [badge], Neto, IVA, Total, Acciones [Ver + kebab]) alimentado por `useDocumentos()` (React Query, contra MSW). Los dos badges MUST usar `Badge` con variantes success/warning/error según su eje (mapas independientes). La acción "Anular" del kebab MUST gatearse con `<Can cap="sales.documents:void">`; "+ Crear documento" con `sales.invoices:edit`. La vista MUST manejar loading (skeleton), vacío (`EmptyState`) y error (`ErrorState`). El nav (`nav-data.ts`) MUST recibir `cap: 'sales.documents:view'` en el item Documentos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado con datos y doble badge
- **GIVEN** MSW devolviendo 7 DTEs con estados variados (incl. uno `aceptado_con_reparos`/`pendiente` y uno `rechazado`/`rechazado`)
- **WHEN** se renderiza la vista
- **THEN** la tabla muestra 7 filas, los 5 KPIs muestran conteos, y cada fila tiene los DOS badges correctos (SII y comercial) con su color.

#### Scenario: acción oculta sin capability
- **GIVEN** caps `['sales.documents:view']` (sin `:void` ni `invoices:edit`)
- **WHEN** se inspecciona el DOM
- **THEN** "+ Crear documento" y "Anular" no se renderizan; "Ver" sí.

#### Scenario: estado vacío
- **GIVEN** MSW devolviendo `[]`
- **WHEN** se renderiza
- **THEN** se ve `EmptyState`.

#### Scenario: error de fetch
- **GIVEN** MSW respondiendo 500
- **WHEN** se renderiza
- **THEN** se ve `ErrorState` con retry.

</details>

**Acceptance**: stories (default/vacío/carga/error/filtros) + hook test (loading/success/error) + Can-gating test (void/edit ocultos) verdes; smoke UI de `/ventas/documentos`.

- **source_ref**: `02-ventas-documentos.md`, `component-patterns.md` (patrón list), `permissions-model.md` (sales), `nav-data.ts:18-23` (grupo Ventas), JOR-013 REQ-03 (patrón). **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-04 · Bn.2 vista 03 (parte A) — Builder shell: cabecera + tabla de líneas editable

> **Que cambia**: nueva ruta `/ventas/crear-factura` con el shell del transaction-builder: barra de acciones (Cancelar / Guardar borrador / Facturar), card "Datos del documento" y la tabla de líneas editable (`useFieldArray` + reorden dnd-kit + steppers + delete).
> **Por qué**: establece el esqueleto del patrón transaction-builder reusable (B3/B4); la tabla de líneas editable es el núcleo nuevo.

El sistema MUST renderizar en `/ventas/crear-factura` (route group `(app)`, página nueva) un `TransactionBuilder` (composite) con: barra de acciones superior "✕ Cancelar" (ghost), "Guardar borrador" (outline) y "Facturar" (primary, gateado con `<Can cap="sales.invoices:issue">`); una card **"Datos del documento"** (form RHF+zod) con Rut/Razón social* (search), Fecha*, O.C., Origen* (select), Tipo de documento (select `TIPO_DTE`); y una card **"Ítems del documento"** con una `LineItemsTable` editable construida sobre `useFieldArray` (RHF) cuyas columnas son: handle de reorden (`@dnd-kit/sortable`), ID, Descripción, Precio, **Cant** (`NumberStepper`), **Desc** (`NumberStepper`), Total (por fila, computado), y botón eliminar (destructive). El reorden por drag MUST reordenar el array de líneas; eliminar fila MUST removerla del field array. El total por fila MUST computarse vía `calcLineTotal()` (función pura). El form MUST usar `facturaDraftInputSchema` mientras se edita. Sin items, la tabla MUST mostrar un estado vacío con CTA implícito (usar el buscador). El footer de la card MUST tener el link "+ Agregar observación a ítems".

<details><summary>Scenarios de validacion</summary>

#### Scenario: agregar y editar líneas
- **GIVEN** el builder con 2 líneas
- **WHEN** se cambia la cantidad de una línea a 3
- **THEN** el Total de esa fila se recalcula (`precio * cantidad - descuento`) en vivo.

#### Scenario: reorden por drag
- **GIVEN** una tabla con 3 líneas
- **WHEN** se arrastra la 3ª al primer lugar
- **THEN** el array de líneas refleja el nuevo orden.

#### Scenario: eliminar línea
- **GIVEN** una tabla con 3 líneas
- **WHEN** se hace click en eliminar de la 2ª
- **THEN** quedan 2 líneas; el field array se actualiza.

#### Scenario: Facturar gateado
- **GIVEN** caps sin `sales.invoices:issue`
- **WHEN** se ve la barra de acciones
- **THEN** "Facturar" no se renderiza; "Guardar borrador"/"Cancelar" sí.

</details>

**Acceptance**: stories (sin items / con items / reorden) + tests del form header + interacción (agregar/quitar/reordenar/editar cantidad) + Can-gating verdes; smoke UI de `/ventas/crear-factura`.

- **source_ref**: `03-ventas-crear-factura.md`, `component-patterns.md:157-161` (TransactionBuilder), `@dnd-kit` (package.json), `FormField`/`FormSection` (A3), `NumberStepper` (promovido REQ-02). **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-05 · Bn.2 vista 03 (parte B) — Buscador de items + 3 cards + recálculo vivo + banner stock

> **Que cambia**: completa el builder con el panel buscador de items (reusa `useItems` de JOR-013), las 3 cards inferiores (Resumen / Forma de pago / Datos del cliente), el recálculo en vivo de totales (`calcTotals()` pura) + banner de stock y las acciones Guardar borrador / Facturar.
> **Por qué**: cierra el patrón transaction-builder con la lógica de negocio (totales, stock) y el consumo del contrato de Items (H3).

El sistema MUST agregar al `TransactionBuilder` un panel **"Buscar ítems"** (search por descripción/referencia/marca + botón Filtros + tabla con columnas `+`/ID/Descripción/Referencias/Precio + "Ver más ítems") alimentado por `useItems()` (de JOR-013, contra MSW) filtrando client-side; el botón `+` MUST insertar el item como línea nueva en la `LineItemsTable` (mapeando `itemListItem`→`lineItem`). El sistema MUST renderizar 3 cards: **"Resumen del documento"** (Subtotal, Descuento, Neto, IVA (19%), **Total** destacado) computada por `calcTotals(lineas, descuentoGlobal)` (función pura en `src/lib/ventas/calc-totals.ts`: `subtotal = Σ líneas`, `neto = subtotal - descuento`, `iva = round(neto * 0.19)`, `total = neto + iva`); **"Forma de pago"** (select forma de pago + toggle Despacho + sub-bloque Receptor/Observación); **"Datos del cliente"** (key-value Rut/Teléfono/Ciudad/Dirección + botón "Actualizar receptor" gateado con `<Can cap="entities.customers:edit">`, stub no-funcional — D6). El sistema MUST mostrar un **banner de stock** (`Alert` variante warning, dismissible) cuando una línea referencia un item marcado sin stock para la sucursal (simulado por MSW en Bn.2 — D1): "⚠️ Su sucursal no cuenta con stock suficiente para el item ID {id} - {descripcion}. Stock disponible: 0". "Guardar borrador" MUST llamar `useCreateFacturaDraft()` (valida `facturaDraftInputSchema`); "Facturar" MUST validar `facturaIssueInputSchema` (requeridos + ≥1 línea) e invocar `useIssueFactura()` (contra MSW), mapeando errores `{code}`→campo. Todo valor monetario MUST usar `formatCLP`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: buscar e insertar item
- **GIVEN** el buscador con items de MSW
- **WHEN** se hace click en `+` de un item
- **THEN** aparece como línea nueva en la tabla; el Resumen recalcula Subtotal/Neto/IVA/Total.

#### Scenario: recálculo de totales (función pura)
- **GIVEN** líneas `[{precio:1000,cant:2,desc:0},{precio:500,cant:1,desc:100}]` y `descuentoGlobal:0`
- **WHEN** `calcTotals(lineas, 0)`
- **THEN** `subtotal:2400, neto:2400, iva:456, total:2856` (IVA 19% redondeado).

#### Scenario: banner de stock
- **GIVEN** una línea con un item marcado `sin_stock` (MSW)
- **WHEN** se agrega
- **THEN** aparece el banner warning con el ID/descripción; es dismissible (no bloquea Facturar).

#### Scenario: Facturar valida estricto
- **GIVEN** el builder sin líneas o sin forma de pago
- **WHEN** se hace click en "Facturar"
- **THEN** la validación falla inline (issue schema); no se llama `useIssueFactura`. "Guardar borrador" del mismo estado SÍ persiste (draft schema).

#### Scenario: Actualizar receptor gateado
- **GIVEN** caps sin `entities.customers:edit`
- **WHEN** se ve la card de cliente
- **THEN** "Actualizar receptor" no se renderiza.

</details>

**Acceptance**: unit `calcTotals` (descuentos/cantidades/redondeo IVA) + stories (vacío/con items/warning stock/resumen actualizado) + interacción (buscar→insertar, recálculo) + tests draft-vs-issue + Can-gating verdes; smoke UI del builder completo.

- **source_ref**: `03-ventas-crear-factura.md`, `useItems`/`itemListItemSchema` (JOR-013, H3), `frontend-api-layer.md`, DEC-006. **Layers**: frontend (components, hooks, lib). **Certeza**: confirmed.

### REQ-06 · Bn.3 — BE stub del módulo Ventas (NestJS DTO+Swagger hardcodeado)

> **Que cambia**: nuevo `SalesModule` (controllers Documentos + Facturas + service stub + DTOs con `@ApiProperty` + Swagger) que responde el contrato con datos hardcodeados (sin DB), con `@RequireCapability` por endpoint; el front deja MSW y apunta al stub.
> **Por qué**: cierra el loop FE↔BE (proxy/auth/errores reales) y habilita la regeneración de tipos (REQ-07).

El sistema MUST exponer `SalesModule` (registrado en `app.module.ts`, importando `PermissionsModule`) con un `DocumentosController` (`@Controller('ventas/documentos')`, guard trio `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`) y un `FacturasController` (`@Controller('ventas/facturas')`, mismo guard trio), con endpoints stub que devuelven el shape del contrato (Bn.1) con datos hardcodeados, sin DB: `GET /ventas/documentos` (list, `@RequireCapability('sales.documents:view')`), `GET /ventas/documentos/:id` (detail, `sales.documents:view`), `POST /ventas/facturas/draft` (`sales.invoices:edit`), `POST /ventas/facturas` (issue, `sales.invoices:issue`). Los DTOs (`DocumentoDTEDto`, `LineItemDto`, `FacturaInputDto` con los enums de estado/tipo) MUST decorarse con `@ApiProperty` (Swagger con shapes reales — caveat H6) y con `class-validator`. Los endpoints MUST documentarse con `@ApiTags('ventas')`/`@ApiOperation`/`@ApiResponse`, y `main.ts` MUST añadir `.addTag('ventas', ...)`. Las respuestas de error MUST seguir `{code, message}`. El listado MUST incluir el `workspace_id` del tenant en la firma del servicio (placeholder — sin query real). El front MUST reemplazar los handlers MSW por llamadas al stub (`/api/proxy/ventas/...`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: stub responde el contrato
- **GIVEN** el `DocumentosController` montado (Supertest, sin DB)
- **WHEN** `GET /ventas/documentos` con cap `sales.documents:view`
- **THEN** 200 con un array que cumple el shape `documentoDTESchema` (ambos ejes de estado presentes).

#### Scenario: 403 sin capability
- **GIVEN** un request sin `sales.documents:view`
- **WHEN** `GET /ventas/documentos`
- **THEN** 403 con `{code:'FORBIDDEN'}`.

#### Scenario: issue requiere su capability
- **GIVEN** caps con `sales.invoices:edit` pero sin `:issue`
- **WHEN** `POST /ventas/facturas` (issue)
- **THEN** 403; `POST /ventas/facturas/draft` con `:edit` → 201.

#### Scenario: regen significativo
- **GIVEN** el stub con DTOs `@ApiProperty`
- **WHEN** `npm run generate:api-types`
- **THEN** `src/types/api.gen.ts` contiene los shapes de Ventas (no `Record<string,never>`).

</details>

**Acceptance**: supertest (shape + 403 por capability + draft/issue) verde; Swagger expone `ventas`; FE apunta al stub y las 2 vistas siguen funcionando.

- **source_ref**: `implementation-tasks.md` B2.3, `items/items.controller.ts` (patrón guard trio + `@RequireCapability`), `common/auth/require-capability.decorator.ts`, `main.ts` (ValidationPipe/Swagger), caveat H6. **Layers**: backend (módulo, dto), frontend (services — switch MSW→stub). **Certeza**: confirmed.

### REQ-07 · DEC-002 Fase 1 (regen de tipos del stub) + cierre de cobertura

> **Que cambia**: con el stub decorado, se regeneran los tipos del FE desde el Swagger (Fase 1); si el contrato cambia, el FE deja de compilar. Y se consolida la cobertura de tests del módulo.
> **Por qué**: el contrato deja de mantenerse a mano (sincronización FE↔BE automática); la cobertura cierra el DoD.

El sistema MUST regenerar `src/types/api.gen.ts` desde el Swagger del stub (`npm run generate:api-types`) y MUST reconciliar los tipos a mano de `src/types/ventas.ts` con los generados donde sea significativo, dejando el FE compilando (`tsc` limpio). El sistema MUST consolidar la suite del módulo: stories-como-tests por estado de cada vista, hooks (Vitest + `renderHook` + MSW), gateo `<Can>`, unit de `calcTotals` y supertest del stub; y MUST reportar el coverage delta del módulo sales. Mutation testing (DET-31) MUST correr sobre el código nuevo `.ts` (schemas, `calcTotals`, seed) al cerrar las sessions que tocan código (warn-first; blind a `.tsx`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: FE compila contra tipos regenerados
- **GIVEN** el stub corriendo y los tipos regenerados
- **WHEN** `tsc`
- **THEN** sin errores en los consumidores de `ventas`.

#### Scenario: drift detectado
- **GIVEN** un cambio en el DTO del stub que rompe el contrato
- **WHEN** se regeneran tipos y compila el FE
- **THEN** `tsc` falla en el consumidor (red de seguridad del contrato).

</details>

**Acceptance**: `generate:api-types` produce shapes de ventas; `tsc` limpio; suite verde; coverage delta reportado; mutación warn-first registrada.

- **source_ref**: DEC-002 (Fase 1), `implementation-tasks.md` B2.3 (regen), `package.json` `generate:api-types`. **Layers**: frontend (types, tests), backend (tests). **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Target | Cómo se mide |
|------|--------|--------------|
| Security | El gateo UI nunca es la única frontera: cada acción mapea a su capability `sales.*` + el stub aplica `@RequireCapability` (test 403). DTO del stub sin campos internos ni RUT/datos de empresa reales (S3). `workspace_id` en la firma del servicio (scope, sin query real hasta Fase C). | supertest 403 por capability (REQ-06) + revisión por acción |
| Maintainability | Vista 02 reusa el patrón list de JOR-013 (sin duplicación C1); `formatCLP`/`NumberStepper` extraídos a primitivas compartidas; `calcTotals`/`calcLineTotal` lógica pura aislada de UI (C4); `TransactionBuilder` reusable por B3/B4; sin `any` (C2). | quality review 10-dim por session (DET-23) |

## Artifacts

| Artefacto | Path | source_ref | Acción |
|-----------|------|-----------|--------|
| Seed capabilities Ventas | `backend/jormat-api/seeds/05_sales_capabilities.ts` | REQ-01 | crea |
| Contrato Zod Ventas | `front/jormat-front/src/lib/schemas/ventas.ts` | REQ-02 | crea |
| Tipos de dominio Ventas | `front/jormat-front/src/types/ventas.ts` | REQ-02/07 | crea |
| `formatCLP` (extraído) | `front/jormat-front/src/lib/format.ts` | REQ-02 (D2) | crea |
| `NumberStepper` (promovido) | `front/jormat-front/src/components/ui/number-stepper/` | REQ-02 (D3) | mueve (+ actualiza import en `items/create/`) |
| `calcTotals` / `calcLineTotal` | `front/jormat-front/src/lib/ventas/calc-totals.ts` | REQ-04/05 | crea |
| Módulo API Ventas | `front/jormat-front/src/services/api/ventas/{documentos,facturas}.ts` | REQ-02..06 | crea |
| Handlers MSW Ventas | `front/jormat-front/src/test/msw/handlers/ventas.ts` | REQ-02 | crea |
| Hooks React Query | `front/jormat-front/src/hooks/useVentas.ts` (useDocumentos/useDocumento/useCreateFacturaDraft/useIssueFactura) | REQ-03/04/05 | crea |
| Vista Documentos | `front/jormat-front/src/app/(app)/ventas/documentos/page.tsx` + `src/components/ventas/list/` (DocumentosListView, DocumentosTable) | REQ-03 | crea |
| Vista Crear factura | `front/jormat-front/src/app/(app)/ventas/crear-factura/page.tsx` + `src/components/ventas/builder/` (TransactionBuilder, LineItemsTable, ItemSearchPanel, DocumentSummaryCard, PaymentCard, CustomerCard) | REQ-04/05 | crea |
| Primitiva Alert/StockWarningBanner | `front/jormat-front/src/components/ui/alert/` | REQ-05 | crea |
| Nav gateado (cap en items Ventas) | `front/jormat-front/src/components/shell/nav/nav-data.ts` | REQ-03 | modifica (aditivo — `cap: 'sales.documents:view'` / `'sales.invoices:edit'`) |
| Módulo BE Ventas (stub) | `backend/jormat-api/src/sales/` (module, documentos.controller, facturas.controller, sales.service, dto/*) | REQ-06 | crea |
| Tipos regenerados | `front/jormat-front/src/types/api.gen.ts` | REQ-07 | modifica (regen) |
| Tests (stories/hooks/can/calc/supertest) | `src/components/ventas/**/*.stories.tsx`, `*.test.tsx`, `src/lib/ventas/*.test.ts`, `src/sales/*.spec.ts` | REQ-03..07 | crea |

> **Checklist de calidad por artefacto**: copys/labels de la UI hardcodeados en español — el proyecto **no tiene infra i18n aún** (deuda explícita; i18n es alcance de B5); se documenta, no se bloquea. Cada artefacto tiene consumidor en este sprint. Los estados usan **constantes tipadas** (`ESTADO_SII`/`ESTADO_COMERCIAL`/`TIPO_DTE`), no magic strings. El recálculo vive en **funciones puras** (`calcTotals`/`calcLineTotal`), no inline en la UI.

## Constraints

- **RULE-global-001**: DoD C1–C6 — separar lógica/hooks/presentación; sin `any`; sin código muerto ni `console.*`; nombres en inglés / comentarios en español; primitivas compartidas extraídas (`formatCLP`, `NumberStepper`, `calcTotals`).
- **RULE-global-002**: seguridad S1–S4 — cada acción mapea a su capability + `@RequireCapability` en el stub (test 403); DTO sin campos internos ni RUT/datos reales; requeridos del builder validados (issue schema).
- **RULE-global-003**: NO tocar base entregada (MSAL/`AuthGuard`/RLS). El stub aplica el patrón existente.
- **DEC-002**: Fase 0 (Zod a mano, front fuente del contrato) en S1; Fase 1 (regen del Swagger) en S5.
- **DEC-006**: capabilities `module.feature:action`.
- **DET-30**: rama de ticket (no develop/master). `execute_scope` declarado en el ticket.
- **DET-31**: mutation testing warn-first al cierre de sessions que tocan código (scope `.ts` — blind a `.tsx`).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-013 (B1 Items) | internal | `useItems`, `itemListItemSchema`, módulo api Items, stub Items, `formatCLP` (a extraer), `NumberStepper` (a promover) | DONE — bajo (sibling recién cerrado) |
| JOR-006 (UI atoms/forms) | internal | Button, Input, Select, Card, Badge, FormField, FormSection | DONE — bajo |
| JOR-007 (UI data+layout) | internal | DataTable, FilterBar, KPICard, StatGrid, EmptyState, ErrorState, PageLayout, TwoColumn, Pagination | DONE — bajo |
| JOR-008/010/011 (RBAC) | internal | `<Can>`/`useCan`/`can()`, guard trio + `@RequireCapability` + catálogo capabilities | DONE — bajo |
| `@dnd-kit/core` + `/sortable` | external (npm) | reorden de líneas en la tabla del builder | DONE — instalado (2do consumer tras galería de JOR-013) |
| `react-hook-form` (`useFieldArray`) | external (npm) | tabla de líneas dinámica | DONE — RHF presente; `useFieldArray` primer consumer (riesgo de wiring) |
| `openapi-typescript` | external (npm) | regen de tipos (Fase 1) | DONE — script presente; caveat H6 (requiere `@ApiProperty`) |
| Backend levantado en dev | runtime | Swagger en `/api/docs` para regen (S5) | medio — requiere `./run.sh dev` + DB migrada/seed |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Transaction-builder es lo más nuevo (primer `useFieldArray` + reorden dnd-kit en tabla + recálculo vivo) | high | medium | Partido en S3 (shell) / S4 (resumen+buscador); `calcTotals`/`calcLineTotal` puras unit-tested; reorden reusa patrón de la galería de JOR-013 |
| Recálculo vivo en cada `onChange` con performance | medium | low | Lógica en función pura memoizable; recálculo derivado del field array, no estado paralelo |
| Confundir eje SII con comercial | medium | medium | 2 enums Zod tipados + 2 badge-maps explícitos; unit del contrato por eje; scenario dedicado |
| Drift FE↔BE del contrato | medium | medium | Front define Zod (S1); BE refleja en DTO (S5); regen hace fallar `tsc` si difieren |
| Contexto de sucursal activa no modelado (banner stock) | medium | low | Bn.2 simula con MSW (item `sin_stock`); modelado diferido (D1); banner no bloquea Facturar |
| MSW `onUnhandledRequest:'error'` rompe tests al añadir hooks | medium | low | Cada hook nuevo agrega su handler en `handlers/ventas.ts` o `server.use()` por test |
| Storybook browser flaky (dual-project) | medium | low | jsdom para hooks/gating/calc; stories de interacción con `play`; limpiar cache si flaky (ref. memoria jormat-front vitest dual-project) |

## Open questions

- Ninguna abierta. Las 6 del draft resueltas (D1 sucursal→MSW/diferido, D2 formatCLP→`lib/format.ts`, D3 NumberStepper→`ui/`, D4 moneda en contrato, D5 draft/issue 2 schemas, D6 Actualizar receptor stub gateado) — ver `tickets/JOR-014.draft/intent.md` + ticket decisions_log.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: No split del ticket — partición por sessions (builder en 2)
- **Contexto**: el triage marcó el builder como el patrón más complejo de la Fase B (H7).
- **Drivers**: las 2 vistas comparten el contrato Bn.1 y el módulo api; el builder tiene cohesión interna (shell + resumen son un solo componente).
- **Opción elegida**: una sola ticket JOR-014, partición por 5 sessions (S1 contrato → S2 vista 02 → S3/S4 builder → S5 stub).
- **Alternativas**: split en tickets por vista (descartada — fragmenta el contrato) / builder en una session (descartada — H7: excede 3h por la combinación form+tabla+buscador+recálculo).
- **Consecuencias**: el builder se entrega incrementalmente (shell funcional en S3, completo en S4).
- **Session**: intake-explore (H7) + design-feature.

### DEC-LOCAL-02: Doble eje de estado como 2 enums Zod independientes
- **Contexto**: `02-ventas-documentos.md:27` define Estado SII y Estado comercial como ejes ortogonales con valores distintos.
- **Drivers**: corrección semántica (un DTE puede estar `aceptado` por SII y `pendiente` comercialmente); badges con color por eje.
- **Opción elegida**: `ESTADO_SII` y `ESTADO_COMERCIAL` como `z.enum` separados + 2 badge-variant maps.
- **Alternativas**: un solo enum combinado (descartada — explota la combinatoria y pierde semántica).
- **Consecuencias**: dos columnas/badges en la tabla; el contrato distingue los ejes.
- **Session**: design-feature.

### DEC-LOCAL-03: TransactionBuilder como patrón reusable (B3/B4)
- **Contexto**: B3 (Compras) y B4 (Pagos) reusarán la construcción de transacciones (H2/H7).
- **Drivers**: evitar reimplementar líneas editables + recálculo + buscador en cada módulo.
- **Opción elegida**: `components/ventas/builder/` con piezas componibles (LineItemsTable, ItemSearchPanel, DocumentSummaryCard) + `calcTotals` parametrizable (tasa IVA / moneda).
- **Alternativas**: builder monolítico específico de ventas (descartada — no reusable, viola C1).
- **Consecuencias**: B3 reusa con delta (lado AP, moneda); +1 patrón mantenido.
- **Session**: design-feature.

### DEC-LOCAL-04: Borrador vs Facturar = 2 schemas Zod (draft parcial / issue estricto)
- **Contexto**: "Guardar borrador" persiste un documento incompleto; "Facturar" exige validación completa (D5).
- **Drivers**: RHF no soporta nativo dos niveles de validación por acción.
- **Opción elegida**: `facturaDraftInputSchema` (campos opcionales) + `facturaIssueInputSchema` (requeridos + ≥1 línea + forma de pago); el submit elige el resolver/parse según la acción.
- **Alternativas**: un schema con `superRefine` condicional (descartada — más opaco y propenso a error que dos schemas explícitos).
- **Consecuencias**: dos endpoints stub (`/draft` vs `/`) con su capability (`edit` vs `issue`).
- **Session**: design-feature.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan.
- [ ] **Tests**: stories-como-tests por estado + hooks (RTL+MSW) + Can-gating + unit `calcTotals` + supertest del stub verdes; coverage delta del módulo reportado.
- [ ] **NFRs**: cada acción mapea a su capability + stub revalida (403 por capability); DTO sin campos internos ni RUT reales; requeridos del builder validados (issue).
- [ ] **Rules**: RULE-global-001/002/003 (sin `any`, base intacta, primitivas extraídas, scope `workspace_id`).
- [ ] **Integration**: tras el switch, las 2 vistas funcionan contra el stub; FE compila contra los tipos regenerados (no `Record<string,never>`).
- [ ] **Patrón transaction-builder**: el módulo queda como referencia replicable para B3/B4 (cabecera + líneas + buscador + recálculo).
- [ ] **Mutation (DET-31)**: corrida warn-first registrada por session que toca código (.ts); sobrevivientes críticos → hardening task; light → backlog must.

## Tasks

### Session 1 — Bn.0 seed + Bn.1 contrato Zod + tipos + scaffolding api/MSW + prep (formatCLP, NumberStepper) [tipo: auto] [tier: T2]

parallel_groups: [[S1.T4, S1.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Seed idempotente `05_sales_capabilities.ts` (5 capabilities `sales.*` + `entities.customers:edit`), guard de prod | REQ-01 | developer | — | `backend/jormat-api/seeds/05_sales_capabilities.ts` | seed en DB test + verificar 5 filas + idempotencia | git rm del seed | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Contrato Zod `lib/schemas/ventas.ts` (enums SII/comercial/tipoDTE + documentoDTE + lineItem + facturaDraft/Issue con `moneda`) | REQ-02 | developer | — | `front/jormat-front/src/lib/schemas/ventas.ts` | unit Vitest (shapes válidos/inválidos por eje + draft/issue) | git rm | DET-1, DET-2, DET-8 | done | 1 |
| S1.T3 | Tipos `types/ventas.ts` (z.infer) + módulo api skeleton `services/api/ventas/{documentos,facturas}.ts` | REQ-02 | developer | S1.T2 | `src/types/ventas.ts`, `src/services/api/ventas/*.ts` | `tsc` limpio + lint (sin `any`, sin fetch suelto) | git revert | DET-2, DET-8, RULE-global-001 | done | 1 |
| S1.T4 | Extraer `formatCLP`→`lib/format.ts` (D2) + actualizar `ItemsTable.tsx` | REQ-02 | developer | — | `src/lib/format.ts`, `src/components/items/list/.../ItemsTable.tsx` | unit `formatCLP` + tests de Items siguen verdes | git revert | DET-16, RULE-global-001 | done | 1 |
| S1.T5 | Promover `NumberStepper`→`components/ui/number-stepper/` (D3) + actualizar import en vista 06 Items + handlers MSW base `ventas.ts` | REQ-02 | developer | S1.T2 | `src/components/ui/number-stepper/`, `src/components/items/create/`, `src/test/msw/handlers/ventas.ts` | tests de Items verdes + handler parsea contrato | git revert | DET-16, DET-8, RULE-global-001 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): quality review 10-dim + unit Zod/seed/formatCLP verdes + mutation warn-first (.ts) | REQ-01/02 | reviewer | S1.T1..T5 | ticket, spec | gate persistido + vitest --coverage + dkc-mutate async | — | DET-13, DET-20, DET-23, DET-31 | done | 1 |

### Session 2 — Bn.2 vista 02 Documentos (listado DTE doble eje) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `useDocumentos()` (RQ list, contra MSW) + key factory `ventasKeys` | REQ-03 | developer | S1.GATE | `src/hooks/useVentas.ts` | unit hook (loading/success/error) RTL+MSW | git revert | DET-2, DET-8 | done | 2 |
| S2.T2 | Página `/ventas/documentos` + DocumentosListView (PageLayout + StatGrid 5 KPIs + FilterBar) + `DocumentosTable` (doble badge SII/comercial) | REQ-03 | developer | S2.T1 | `src/app/(app)/ventas/documentos/page.tsx`, `src/components/ventas/list/` | stories (default/vacío/carga/error/filtros) + smoke UI | git rm ruta | DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T3 | Gateo acciones (`<Can sales.documents:void>` Anular; `sales.invoices:edit` Crear) + nav `cap` en nav-data | REQ-03 | developer | S2.T2 | `src/components/ventas/list/`, `src/components/shell/nav/nav-data.ts` | unit Can-gating (oculta sin cap) | git revert | DET-8, RULE-global-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3, ⚑ fuerte): reviewer aislado + smoke UI listado + quality review + mutation | REQ-03 | reviewer | S2.T1..T3 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — Bn.2 vista 03 parte A: builder shell (header + líneas editables) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `calcLineTotal()` pura + `TransactionBuilder` shell (página `/ventas/crear-factura` + barra acciones + card Datos del documento RHF+zod draft) | REQ-04 | developer | S1.GATE | `src/lib/ventas/calc-totals.ts`, `src/app/(app)/ventas/crear-factura/page.tsx`, `src/components/ventas/builder/` | unit `calcLineTotal` + stories shell + form header test | git rm ruta | DET-2, DET-8, RULE-global-001 | done | 3 |
| S3.T2 | `LineItemsTable` editable (`useFieldArray` + NumberStepper Cant/Desc + total por fila + delete fila) | REQ-04 | developer | S3.T1 | `src/components/ventas/builder/` | stories (sin items/con items) + tests (editar cantidad recalcula, eliminar) | git revert | DET-5, DET-8, RULE-global-001 | done | 3 |
| S3.T3 | Reorden de filas con `@dnd-kit/sortable` + gateo "Facturar" (`<Can sales.invoices:issue>`) | REQ-04 | developer | S3.T2 | `src/components/ventas/builder/` | stories (reorden) + play (drag) + Can-gating | git revert | DET-8, RULE-global-002 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T3, ⚑ fuerte): reviewer aislado + smoke builder shell + quality review + mutation (.ts calc) | REQ-04 | reviewer | S3.T1..T3 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 3 |

### Session 4 — Bn.2 vista 03 parte B: buscador + cards + recálculo + banner [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S4.T2, S4.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | `calcTotals()` pura (Subtotal/Neto/IVA 19%/Total) + `DocumentSummaryCard` (formatCLP) | REQ-05 | developer | S3.GATE | `src/lib/ventas/calc-totals.ts`, `src/components/ventas/builder/` | unit `calcTotals` (descuentos/cantidades/redondeo IVA) + story | git revert | DET-2, DET-7, RULE-global-001 | done | 4 |
| S4.T2 | `ItemSearchPanel` (reusa `useItems` JOR-013, filtra client-side, botón `+` inserta línea) | REQ-05 | developer | S3.GATE | `src/components/ventas/builder/` | stories + interacción (buscar→insertar línea) | git revert | DET-8, RULE-global-001 | done | 4 |
| S4.T3 | `PaymentCard` + `CustomerCard` (Actualizar receptor gateado `entities.customers:edit`) + primitiva `Alert`/StockWarningBanner (warning, dismissible) | REQ-05 | developer | S3.GATE | `src/components/ventas/builder/`, `src/components/ui/alert/` | stories (warning stock) + Can-gating | git rm/revert | DET-8, RULE-global-002 | done | 4 |
| S4.T4 | `useCreateFacturaDraft`/`useIssueFactura` (RQ mutation, MSW) + wiring acciones Guardar borrador (draft) / Facturar (issue estricto) + mapeo error→campo | REQ-05 | developer | S4.T1, S4.T2, S4.T3 | `src/hooks/useVentas.ts`, `src/components/ventas/builder/` | tests draft-vs-issue (issue valida ≥1 línea) + submit | git revert | DET-5, DET-8, RULE-global-002 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier T3, ⚑ fuerte): reviewer aislado + smoke builder completo + quality review + mutation (.ts calc) | REQ-05 | reviewer | S4.T1..T4 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 4 |

### Session 5 — Bn.3 BE stub + switch MSW→stub + regen tipos + cierre cobertura [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S5.T1, S5.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | `SalesModule` + `DocumentosController` (guard trio + `@RequireCapability` view) + service stub + `DocumentoDTEDto`/`LineItemDto` (`@ApiProperty` + class-validator) + Swagger `@ApiTags('ventas')` + `main.ts` addTag | REQ-06 | developer | S1.GATE | `backend/jormat-api/src/sales/`, `src/app.module.ts`, `src/main.ts` | supertest (shape documentos + 403) | git rm módulo | DET-2, DET-8, RULE-global-002 | done | 5 |
| S5.T2 | `FacturasController` (`/draft` cap edit, `/` issue cap issue) + `FacturaInputDto` + 403 por capability | REQ-06 | developer | S1.GATE | `backend/jormat-api/src/sales/` | supertest (draft 201 con edit / issue 403 sin issue) | git rm | DET-2, DET-8, RULE-global-002 | done | 5 |
| S5.T3 | FE switch MSW→stub (módulos api apuntan a `/api/proxy/ventas/...`) + regen `api.gen.ts` + reconciliar tipos | REQ-07 | developer | S5.T1, S5.T2 | `src/services/api/ventas/*.ts`, `src/types/{ventas,api.gen}.ts` | `generate:api-types` + `tsc` limpio + las 2 vistas contra stub | revertir a MSW | DET-5, DET-8, DET-16 | done | 5 |
| S5.T4 | Consolidar cobertura del módulo (stories/hooks/can/calc/supertest) + coverage delta + mutation final | REQ-07 | developer | S5.T3 | tests del módulo | vitest --coverage verde + supertest verde | — | DET-7, DET-13 | done | 5 |
| **S5.GATE** | Gate de cierre Session 5 (tier T3, ⚑ fuerte): reviewer aislado + acceptance checkpoints + FE compila contra tipos regenerados + quality review + mutation | REQ-06/07 | reviewer | S5.T1..T4 | ticket, spec | acceptance ejecutado + tsc + supertest + quality review + dkc-mutate | — | DET-13, DET-14, DET-20, DET-23, DET-31 | done | 5 |

## Technical reference

**Contrato (Bn.1, front fuente — DEC-002 Fase 0):**
- `ESTADO_SII = ['aceptado','aceptado_con_reparos','rechazado']`; `ESTADO_COMERCIAL = ['aceptado','pendiente','rechazado']`; `TIPO_DTE = ['factura_electronica','nota_credito_electronica','guia_despacho_electronica']`.
- `documentoDTESchema`: `{ id, folio: string, tipoDTE, fecha: string, receptor: { razonSocial, rut }, estadoSII, estadoComercial, neto: number, iva: number, total: number }`
- `lineItemSchema`: `{ itemId, descripcion, precio: number, cantidad: number, descuento: number, total: number }`
- `facturaDraftInputSchema` (parcial) / `facturaIssueInputSchema` (estricto): `{ receptor, fecha, oc?, origen, tipoDTE, moneda (default 'CLP'), lineas: lineItem[] (issue: min 1), formaPago, despacho: boolean, observacion?, descuentoGlobal? }`

**Recálculo (funciones puras, `src/lib/ventas/calc-totals.ts`):**
- `calcLineTotal(precio, cantidad, descuento) = precio * cantidad - descuento`
- `calcTotals(lineas, descuentoGlobal=0) = { subtotal: Σ line.total, descuento: descuentoGlobal, neto: subtotal - descuento, iva: Math.round(neto * 0.19), total: neto + iva }`

**Endpoints stub (Bn.3, base `/api`, proxy `/api/proxy`, prefijo `ventas`):**
- `GET /ventas/documentos` (`sales.documents:view`) → `documentoDTESchema[]`
- `GET /ventas/documentos/:id` (`sales.documents:view`) → `documentoDTESchema`
- `POST /ventas/facturas/draft` (`sales.invoices:edit`) → `{ id, ... }`
- `POST /ventas/facturas` (`sales.invoices:issue`) → `{ id, folio, ... }`

**Capabilities B2**: `sales.documents:{view,void}`, `sales.invoices:{edit,issue}`, `entities.customers:edit`.

**Patrones a reusar (verificados en intake-explore S0):**
- List: `ItemsListView` (JOR-013) → DocumentosListView (PageLayout + StatGrid + FilterBar + DataTable genérico + DropdownMenu kebab).
- Guard trio BE + `@RequireCapability` (ref. `items/items.controller.ts:37-41,49`); módulo importa `PermissionsModule`; registra en `app.module.ts`; `main.ts` addTag.
- FE: cliente axios `services/api.ts` (`/api/proxy`); hooks RQ (ref. `useItems.ts`); `<Can>`/`useCan`; FormField + `mapApiErrorToField`; `useFieldArray` (RHF) para líneas.
- Reorden dnd-kit: patrón de la galería de JOR-013 (`@dnd-kit/sortable`) aplicado a filas de tabla.
- Tests: jsdom para hooks/gating/calc (vitest project `!storybook`), Storybook browser para stories `play`; MSW `server.use()` o `handlers/ventas.ts`; supertest in-process sin DB.
- Render monetario con `formatCLP` (`lib/format.ts`); vacíos como "—".
