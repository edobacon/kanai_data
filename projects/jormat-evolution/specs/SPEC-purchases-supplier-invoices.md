---
id: SPEC-purchases-supplier-invoices
project: jormat-evolution
ticket: JOR-015
status: done
---

# B3 · Compras (front + stub) — vista 08 Crear factura proveedor

# B3 · Compras (front + stub) — vista 08 Crear factura proveedor

## Executive summary — lo que estas aprobando

### 1. Que se quiere
El **tercer módulo de negocio**: Compras. Una vista — **08 Crear factura proveedor** (patrón **transaction-builder**: cabecera + tabla de líneas editable + buscador de items + resumen, **espejo de compra** del builder de Ventas/JOR-014). El delta de dominio es el **lado AP** (proveedor en vez de cliente), **multi-moneda** (Euro/Dólar/CLP con `currency` + `valueCurrency` = tipo de cambio) e **IVA condicional** (0% en importación no-CLP, 19% en compra nacional CLP). Recorre la rampa Bn **solo hasta el stub**: Bn.0 capabilities → Bn.1 contrato Zod → Bn.2 FE contra MSW → Bn.3 BE stub. El modelo de datos real (proveedores, facturas proveedor, ciclo AP) es Fase C.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| **Extraer primitivas compartidas** (no copiar, no generalizar full) | El `TransactionBuilder` de JOR-014 no tiene props; C1 (sin duplicar) obliga a reuso. Se extraen las primitivas genéricas (`LineItemsTable`, `ItemSearchPanel`, `DocumentSummaryCard`, lógica de cálculo) a `components/shared/builder/`; Sales se migra a consumirlas; cada módulo mantiene su orquestador. (DEC-LOCAL-01 — elegida por el dev) |
| **IVA condicional como función pura** (C4) | `calcIva(neto, currency)` → 0 si no-CLP (importación), `round(neto*0.19)` si CLP. Aislada, unit-tested, mutation-friendly. |
| **`currency` + `valueCurrency` tipados estrictos** (C2) | `currency` = `z.enum(['CLP','EUR','USD'])`; `valueCurrency` = `number` (tipo de cambio). NO `string` genérico ni duplicado del código (warning del ticket). |
| **Front es la fuente del contrato** (Zod a mano, DEC-002 Fase 0) | El front define `facturaProveedorSchema`; el BE lo refleja en DTO. Bn.1 destraba la vista + el stub. |
| **Borrador vs Facturar = 2 schemas** | `facturaProveedorDraftInputSchema` (parcial) / `facturaProveedorIssueInputSchema` (estricto: requeridos + ≥1 línea + `currency`/`valueCurrency`). |
| **Buscador reusa `useItems` de JOR-013** | La primitiva `ItemSearchPanel` extraída ya consume `useItems()`; en Compras filtra client-side, sin columna stock-por-sucursal (D4). |
| Stories-como-tests + Vitest jsdom + Supertest | Convención del proyecto (igual que JOR-013/014). |

### 3. Riesgos principales y cómo los mitigamos
- **La extracción toca código cerrado de Sales (JOR-014)** → riesgo de regresión en Ventas. Mitigación: S1 (riesgo-primero); migración mecánica (mover archivos + ajustar imports/props); **safety net = stories + tests Vitest de Sales** deben quedar verdes (regresión cero verificada); reviewer aislado en S1.GATE.
- **IVA condicional**: confundir moneda/origen produciría IVA erróneo → función pura `calcIva` con scenarios dedicados (Euro→0, CLP→19%); unit + mutation.
- **`valueCurrency` mal interpretado** (es tipo de cambio, no duplicado del código — warning del ticket) → tipado `number` separado + comentario en español + scenario.
- **Drift FE↔BE del contrato**: el front define Zod (S1) y el BE lo refleja en DTO (S3); el regen de tipos (Fase 1) hace fallar `tsc` si difieren.
- **Gateo por capability**: cada acción mapea a `purchases.supplier-invoices:*`; el stub aplica `@RequireCapability` + test 403. UI oculta, backend revalida.
- **MSW `onUnhandledRequest:'error'`**: cada hook nuevo necesita su handler; los de compras se agregan junto al hook.

### 4. Que NO se hace
- **Órdenes de compra, Recepciones, Notas de crédito, Pagos a proveedores** (otras secciones del menú Compras) → fuera de alcance.
- **Modelo de datos real** (proveedores, facturas proveedor, ciclo AP, repos dinámicos) → Fase C.
- **Multi-moneda global** (conversión cross-módulo, store de tipos de cambio) → B5 (este ticket la implementa solo en el stub de Compras).
- **Entidad Proveedor / CRUD** → "Proveedor" es un search stub; el modelo es posterior.
- **RBAC por endpoint dinámico con datos reales / cross-tenant** → Capa C (el stub aplica `@RequireCapability` + `workspace_id` placeholder).
- Tocar la base entregada / MSAL / `AuthGuard` (RULE-global-003).

### 5. Tamaño estimado
**3 sessions**. B3 reusa el builder de B2, lo que elimina las 2 sessions de construcción del builder (S3/S4 de JOR-014). La más riesgosa: **S1** (extracción de primitivas + migración de Sales — ⚑ fuerte, T3, regresión cross-módulo).

### 6. Cómo vas a saber que funciona
- En `/compras/crear-factura-proveedor`: agregar items desde el buscador los inserta en la tabla de líneas; cambiar Cant./Desc. recalcula Subtotal/Neto/IVA/Total en vivo; al elegir moneda Euro el IVA pasa a **€ 0.00** y al elegir CLP vuelve a 19%; "Facturar" oculto sin `purchases.supplier-invoices:issue`.
- **Ventas sigue funcionando idéntico** tras la extracción: las vistas 02/03 y todos sus tests/stories verdes (regresión cero).
- El stub responde el shape del contrato (supertest verde), devuelve 403 sin la capability, y tras el switch el FE compila contra los tipos regenerados del Swagger.

## Purpose

Construir el módulo Compras recorriendo la rampa Bn **solo hasta el stub**, para el actor con capabilities `purchases.*`. Es el **espejo de compra** del transaction-builder de Ventas (JOR-014): valida que el patrón es reusable extrayendo sus primitivas a una ubicación compartida y consumiéndolas desde un segundo módulo con un delta de dominio real (lado AP, multi-moneda, IVA condicional). El valor: demuestra el reuso del patrón (no copy-paste) y deja las primitivas del builder como infraestructura compartida para B4 (Pagos) y siguientes, con un contrato AP estable antes de la Fase C.

## Requirements

### REQ-01 · Bn.0 — Registrar las capabilities de Compras en el catálogo (seed)

> **Que cambia**: se agregan al catálogo `capabilities` las del módulo Compras, vía un seed idempotente nuevo, para gatear la vista y otorgarlas a roles.
> **Por qué**: sin ellas, ni el `<Can>` FE ni el `@RequireCapability` BE tienen contra qué resolver `purchases.*`.

El sistema MUST registrar en la tabla `capabilities` (vía seed idempotente `seeds/06_purchases_capabilities.ts`, mismo patrón que `05_sales_capabilities.ts`) las capabilities: `purchases.supplier-invoices:{edit,issue}`. Cada fila MUST tener `name` (`module.feature:action`), `module` (`purchases`), `feature` (`supplier-invoices`), `action` y `description`. El seed MUST ser idempotente (insertar solo si no existe por `name`) y MUST no correr en producción (`if (NODE_ENV === 'production') return`). El seed NO MUST alterar capabilities existentes de otros módulos. El rol `internal-admin` (seed RBAC) MUST recibir ambas capabilities.

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed inserta capabilities de compras
- **GIVEN** una DB de test con el catálogo RBAC
- **WHEN** se corre el seed `06_purchases_capabilities.ts`
- **THEN** existen 2 filas nuevas (`purchases.supplier-invoices:edit`, `:issue`) con `module=purchases`/`feature=supplier-invoices`/`action` correctos.

#### Scenario: idempotencia
- **GIVEN** el seed ya corrido una vez
- **WHEN** se corre de nuevo
- **THEN** no se duplican filas.

#### Scenario: no corre en prod
- **GIVEN** `NODE_ENV=production`
- **WHEN** se invoca el seed
- **THEN** retorna sin insertar.

</details>

**Acceptance**: 2 capabilities en el catálogo de test; idempotente; guard de producción presente; sin tocar otras capabilities; `internal-admin` las recibe.

- **source_ref**: `implementation-tasks.md` (CAPA B, B3), `permissions-model.md` (capabilities `purchases.*`), DEC-006, `seeds/05_sales_capabilities.ts` (patrón). **Layers**: backend (seeds), db (catálogo capabilities). **Certeza**: confirmed.

### REQ-02 · Extracción de primitivas compartidas del builder (refactor de reuso, migrar Sales)

> **Que cambia**: se mueven las primitivas genéricas del transaction-builder de Ventas (`LineItemsTable`, `ItemSearchPanel`, `DocumentSummaryCard`, y la lógica de cálculo de líneas) desde `components/ventas/builder/` a una ubicación compartida `components/shared/builder/`, parametrizándolas con props de config; Ventas se migra a consumirlas sin cambio de comportamiento.
> **Por qué**: C1 (sin duplicar) exige reuso; el builder de JOR-014 no tiene props. Extraer es la base para que Compras lo consuma con su delta AP. (DEC-LOCAL-01)

El sistema MUST extraer a `front/jormat-front/src/components/shared/builder/` las primitivas genéricas del builder de Ventas: `LineItemsTable` (tabla de líneas editable con `useFieldArray` + reorden dnd-kit + steppers + delete), `ItemSearchPanel` (buscador que consume `useItems`, inserta líneas) y `DocumentSummaryCard` (card de resumen Subtotal/Descuento/Neto/IVA/Total). Cada primitiva extraída MUST recibir por **props** lo que hoy está hardcodeado a ventas: el `control` RHF tipado de forma genérica sobre un shape de líneas común, y para `DocumentSummaryCard` los `totals` ya computados + un `currencyFormatter` (para soportar formato CLP o €/US$). La lógica de total por línea MUST extraerse a `src/lib/builder/calc-line.ts` (`calcLineTotal` genérico, sin tasa de IVA). El sistema MUST migrar `components/ventas/builder/TransactionBuilder` y sus consumidores para importar las primitivas desde la nueva ubicación, pasando la config de ventas (formatter CLP). **Las vistas 02/03 de Ventas MUST conservar comportamiento idéntico**: todos los stories y tests Vitest de Ventas (`components/ventas/**`) y de items afectados MUST quedar verdes (regresión cero).

<details><summary>Scenarios de validacion</summary>

#### Scenario: primitivas extraídas y consumidas por Ventas
- **GIVEN** las primitivas movidas a `components/shared/builder/`
- **WHEN** se renderiza el builder de Ventas (`/ventas/crear-factura`)
- **THEN** funciona idéntico: agregar/editar/reordenar/eliminar líneas y el resumen CLP se comportan como antes.

#### Scenario: regresión cero en Ventas
- **GIVEN** la suite Vitest de Ventas existente (stories + hooks + gating + calc)
- **WHEN** se corre tras la extracción
- **THEN** todos verdes (sin cambios en los asserts de Ventas).

#### Scenario: primitiva agnóstica de moneda
- **GIVEN** `DocumentSummaryCard` con `totals` y un `currencyFormatter` que formatea en Euro
- **WHEN** se renderiza
- **THEN** muestra los montos en €, sin asumir CLP.

</details>

**Acceptance**: primitivas en `components/shared/builder/` con props de config; Ventas migrado y **toda su suite verde** (regresión cero verificada por reviewer aislado); `calcLineTotal` genérico en `lib/builder/`; sin `any`.

- **source_ref**: ticket decisions_log (builder-reuse-strategy=extract-shared-primitives), `components/ventas/builder/*` (JOR-014), C1. **Layers**: frontend (components, lib). **Certeza**: confirmed. **Riesgo**: cross-módulo (toca Sales cerrado).

### REQ-03 · Bn.1 — Contrato Zod del módulo Compras (factura proveedor multi-moneda) + IVA condicional + tipos + scaffolding api/MSW

> **Que cambia**: se definen los schemas Zod del contrato de factura proveedor (multi-moneda, `currency`/`valueCurrency`, draft/issue), los enums `Currency`/`InvoiceType`, la **función pura de IVA condicional**, los tipos derivados, el módulo api tipado y los handlers MSW.
> **Por qué**: artefacto linchpin (DEC-002 Fase 0); destraba la vista (Bn.2) y el stub (Bn.3). El IVA condicional es la lógica de negocio nueva de B3.

El sistema MUST definir en `src/lib/schemas/purchases.ts` los enums tipados `CURRENCY` (`z.enum(['CLP','EUR','USD'])` con `*_LABEL` y símbolo), `INVOICE_TYPE` (`z.enum(['nacional','inter'])`); y los schemas: `supplierLineItemSchema` (`{ itemId, descripcion, precio, cantidad, descuento, total }` — reusa el shape de línea común), `facturaProveedorDraftInputSchema` (parcial) y `facturaProveedorIssueInputSchema` (estricto: requeridos + ≥1 línea + `currency` + `valueCurrency`), ambos con `{ proveedor: { razonSocial, rut }, fecha, codigo, tipo: INVOICE_TYPE, origen, currency: CURRENCY, valueCurrency: number, lineas: supplierLineItem[], observacion?, descuentoGlobal? }`. El sistema MUST definir la **función pura `calcIva(neto: number, currency: Currency): number`** en `src/lib/purchases/calc-iva.ts`: `0` si `currency !== 'CLP'` (importación), `Math.round(neto * 0.19)` si `currency === 'CLP'` (nacional); y `calcPurchaseTotals(lineas, currency, descuentoGlobal=0)` que compone `calcLineTotal` (de `lib/builder/`, REQ-02) + `calcIva`. Los tipos TS MUST derivarse (`z.infer`) en `src/types/purchases.ts` (incluido `Currency`, `InvoiceType`). El sistema MUST crear el módulo api tipado `src/services/api/compras/facturas-proveedor.ts` (`createFacturaProveedorDraft`, `issueFacturaProveedor` sobre el axios centralizado) y los handlers MSW en `src/test/msw/handlers/purchases.ts` (registrados en `handlers.ts`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: schema válido multi-moneda
- **GIVEN** una factura proveedor en Euro (`currency:'EUR'`, `valueCurrency:1.085`, ≥1 línea)
- **WHEN** `facturaProveedorIssueInputSchema.safeParse(obj)`
- **THEN** `success: true`.

#### Scenario: issue rechaza sin moneda/valor o sin líneas
- **GIVEN** un payload sin `currency`, sin `valueCurrency`, o sin líneas
- **WHEN** `facturaProveedorIssueInputSchema.safeParse(payload)`
- **THEN** `success: false` con issue en el campo correcto; `facturaProveedorDraftInputSchema` del mismo payload SÍ pasa (parcial).

#### Scenario: IVA condicional (función pura)
- **GIVEN** `neto = 12605`
- **WHEN** `calcIva(12605, 'EUR')` y `calcIva(12605, 'CLP')`
- **THEN** `0` (importación) y `2395` (`round(12605*0.19)`) respectivamente.

#### Scenario: valueCurrency es número (tipo de cambio), no string
- **GIVEN** `valueCurrency: "1.085"` (string)
- **WHEN** se valida
- **THEN** falla (debe ser `number`); el campo es independiente de `codigo`.

</details>

**Acceptance**: unit Vitest de schemas (multi-moneda, draft/issue) + `calcIva` (Euro→0, CLP→19%) + `calcPurchaseTotals` verdes; tipos derivados sin `any`; módulo api compila; handlers MSW devuelven el contrato.

- **source_ref**: `08-compras-factura-proveedor.md` (multi-moneda, IVA 0 import., `valueCurrency`=tipo de cambio), DEC-002 (Fase 0), `permissions-model.md`, `lib/schemas/ventas.ts` (patrón). **Layers**: frontend (schemas, types, services, test/msw, lib). **Certeza**: confirmed.

### REQ-04 · Bn.2 vista 08 — Builder de factura proveedor (`/compras/facturas-proveedor`)

> **Corrección de ruta (cierre JOR-015)**: la ruta entregada es `/compras/facturas-proveedor` (nav DEC-003, source of truth — "NO modificar rutas"), no `/compras/crear-factura-proveedor` como bosquejó este spec. Las menciones a `/compras/crear-factura-proveedor` más abajo deben leerse como `/compras/facturas-proveedor`.

> **Que cambia**: nueva ruta con el `PurchaseInvoiceBuilder` (orquestador de Compras) que consume las primitivas compartidas (REQ-02) + `SupplierCard` + panel multi-moneda + resumen con IVA condicional + gateo `<Can>`, contra MSW.
> **Por qué**: la vista de negocio de B3; demuestra el reuso del patrón con el delta AP/multi-moneda.

El sistema MUST renderizar en `/compras/crear-factura-proveedor` (route group `(app)`, página nueva) un `PurchaseInvoiceBuilder` (composite, orquestador propio de Compras) con: barra de acciones "✕ Salir" (ghost), "📄 Crear borrador" (outline) y "✓ Facturar" (primary, gateado con `<Can cap="purchases.supplier-invoices:issue">`, gate de página con `purchases.supplier-invoices:edit`); una card **"Datos factura"** (form RHF+zod draft) con Rut/Proveedor* (search — `SupplierCard`/search stub), Fecha*, Código*, Tipo* (`INVOICE_TYPE`), Origen* (select bodega); la `LineItemsTable` y el `ItemSearchPanel` **compartidos** (REQ-02) cableados al field array de líneas (sin columna stock-por-sucursal — D4); una card **"Resumen financiero"** usando el `DocumentSummaryCard` compartido alimentado por `calcPurchaseTotals(lineas, currency, descuentoGlobal)` (IVA condicional) con `currencyFormatter` según la moneda; y una card **"Detalle adicional"** con `Moneda*` (`CURRENCY` select), `Valor*` (`valueCurrency` — input numérico, tipo de cambio) y `Observación` (textarea). Al cambiar la moneda a no-CLP, el resumen MUST mostrar IVA 0; al volver a CLP, 19%. "Crear borrador" MUST llamar `useCreateFacturaProveedorDraft()` (valida draft schema); "Facturar" MUST validar `facturaProveedorIssueInputSchema` e invocar `useIssueFacturaProveedor()` (contra MSW), mapeando errores `{code}`→campo. El nav (`nav-data.ts`) MUST recibir `cap: 'purchases.supplier-invoices:edit'` en el item de Compras › Facturas proveedor. Todo valor monetario MUST formatearse según la moneda activa.

<details><summary>Scenarios de validacion</summary>

#### Scenario: buscar e insertar item (primitiva compartida)
- **GIVEN** el buscador con items de MSW
- **WHEN** se hace click en `+` de un item
- **THEN** aparece como línea nueva; el Resumen recalcula Subtotal/Neto/IVA/Total.

#### Scenario: IVA condicional en vivo por moneda
- **GIVEN** el builder con líneas (neto > 0) y moneda CLP
- **WHEN** se cambia la moneda a Euro
- **THEN** el IVA del resumen pasa a 0 y el Total = Neto; al volver a CLP el IVA vuelve a 19%.

#### Scenario: Facturar valida estricto
- **GIVEN** el builder sin líneas o sin `currency`/`valueCurrency`
- **WHEN** se hace click en "Facturar"
- **THEN** la validación falla inline (issue schema); no se llama `useIssueFacturaProveedor`. "Crear borrador" del mismo estado SÍ persiste (draft schema).

#### Scenario: Facturar gateado
- **GIVEN** caps sin `purchases.supplier-invoices:issue`
- **WHEN** se ve la barra de acciones
- **THEN** "Facturar" no se renderiza; "Crear borrador"/"Salir" sí.

</details>

**Acceptance**: stories (sin items / con items CLP nacional / con items Euro internacional / resumen calculado) + tests del form header + interacción (buscar→insertar, editar cantidad recalcula, cambiar moneda recalcula IVA) + draft-vs-issue + Can-gating verdes; smoke UI de `/compras/crear-factura-proveedor`.

- **source_ref**: `08-compras-factura-proveedor.md`, primitivas compartidas (REQ-02), `useItems` (JOR-013), `frontend-api-layer.md`, DEC-006. **Layers**: frontend (app router, components, hooks, lib). **Certeza**: confirmed.

### REQ-05 · Bn.3 — BE stub del módulo Compras + switch MSW→stub + regen tipos

> **Que cambia**: nuevo `PurchasesModule` (controller facturas-proveedor + service stub + DTOs con `@ApiProperty` + Swagger) que responde el contrato con datos hardcodeados (sin DB), con `@RequireCapability` por endpoint; el front deja MSW y apunta al stub; se regeneran los tipos (DEC-002 Fase 1).
> **Por qué**: cierra el loop FE↔BE (proxy/auth/errores reales) y habilita la regeneración de tipos.

El sistema MUST exponer `PurchasesModule` (registrado en `app.module.ts`, importando `PermissionsModule`) con un `FacturasProveedorController` (`@Controller('compras/facturas-proveedor')`, guard trio `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`) y endpoints stub que devuelven el shape del contrato (Bn.1) con datos hardcodeados, sin DB: `POST /compras/facturas-proveedor/draft` (`@RequireCapability('purchases.supplier-invoices:edit')`), `POST /compras/facturas-proveedor` (issue, `purchases.supplier-invoices:issue`), y `GET /compras/facturas-proveedor` (list stub, `purchases.supplier-invoices:edit`). Los DTOs (`FacturaProveedorDto`, `SupplierLineItemDto`, `FacturaProveedorInputDto` con los enums `Currency`/`InvoiceType`) MUST decorarse con `@ApiProperty` y `class-validator` (`currency` + `valueCurrency` requeridos en el input estricto). Los endpoints MUST documentarse con `@ApiTags('compras')`/`@ApiOperation`/`@ApiResponse`, y `main.ts` MUST añadir `.addTag('compras', ...)`. Las respuestas de error MUST seguir `{code, message}`. El servicio MUST incluir el `workspace_id` del tenant en la firma (placeholder — sin query real). El stub NO MUST devolver RUT/datos de proveedor reales (S3). El front MUST reemplazar los handlers MSW por llamadas al stub (`/api/proxy/compras/...`) y regenerar `api.gen.ts` (`generate:api-types`), dejando `tsc` limpio.

<details><summary>Scenarios de validacion</summary>

#### Scenario: stub responde el contrato
- **GIVEN** el `FacturasProveedorController` montado (Supertest, sin DB)
- **WHEN** `POST /compras/facturas-proveedor/draft` con cap `purchases.supplier-invoices:edit`
- **THEN** 201 con un objeto que cumple el shape del contrato (multi-moneda).

#### Scenario: 403 sin capability
- **GIVEN** caps con `purchases.supplier-invoices:edit` pero sin `:issue`
- **WHEN** `POST /compras/facturas-proveedor` (issue)
- **THEN** 403 con `{code:'FORBIDDEN'}`; `POST /compras/facturas-proveedor/draft` con `:edit` → 201.

#### Scenario: regen significativo
- **GIVEN** el stub con DTOs `@ApiProperty`
- **WHEN** `npm run generate:api-types`
- **THEN** `src/types/api.gen.ts` contiene los shapes de Compras (no `Record<string,never>`); `tsc` limpio.

</details>

**Acceptance**: supertest (shape + 403 por capability + draft/issue) verde; Swagger expone `compras`; FE apunta al stub y la vista 08 sigue funcionando; `tsc` limpio contra tipos regenerados.

- **source_ref**: `implementation-tasks.md` (B3.3), `sales/*` (patrón stub JOR-014), `common/auth/require-capability.decorator.ts`, `main.ts`, DEC-002 Fase 1. **Layers**: backend (módulo, dto), frontend (services — switch + regen). **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Target | Cómo se mide |
|------|--------|--------------|
| Security | Cada acción mapea a su capability `purchases.supplier-invoices:*` + el stub aplica `@RequireCapability` (test 403). DTO del stub sin RUT/datos de proveedor reales (S3). `workspace_id` en la firma del servicio (scope, sin query real hasta Fase C). `currency`/`valueCurrency` requeridos en el input estricto (S4). | supertest 403 por capability (REQ-05) + revisión por acción |
| Maintainability | Builder de JOR-014 **reusado sin duplicar** vía primitivas compartidas (C1); IVA condicional como función pura aislada de UI (C4); `currency`/`valueCurrency` tipados estrictos, no `string` (C2); sin `any` (C2); **regresión cero en Ventas** verificada. | quality review 10-dim por session (DET-23) + suite de Ventas verde |

## Artifacts

| Artefacto | Path | source_ref | Acción |
|-----------|------|-----------|--------|
| Seed capabilities Compras | `backend/jormat-api/seeds/06_purchases_capabilities.ts` | REQ-01 | crea |
| Primitivas compartidas del builder | `front/jormat-front/src/components/shared/builder/` (LineItemsTable, ItemSearchPanel, DocumentSummaryCard) | REQ-02 | mueve (desde `components/ventas/builder/`) |
| `calcLineTotal` genérico | `front/jormat-front/src/lib/builder/calc-line.ts` | REQ-02 | mueve/crea |
| Migración consumidores Ventas | `front/jormat-front/src/components/ventas/builder/*` | REQ-02 | modifica (imports + props config) |
| Contrato Zod Compras | `front/jormat-front/src/lib/schemas/purchases.ts` | REQ-03 | crea |
| IVA condicional + totales | `front/jormat-front/src/lib/purchases/calc-iva.ts` | REQ-03 | crea |
| Tipos de dominio Compras | `front/jormat-front/src/types/purchases.ts` | REQ-03/05 | crea |
| Módulo API Compras | `front/jormat-front/src/services/api/compras/facturas-proveedor.ts` | REQ-03..05 | crea |
| Handlers MSW Compras | `front/jormat-front/src/test/msw/handlers/purchases.ts` (+ registrar en `handlers.ts`) | REQ-03 | crea |
| Hooks React Query | `front/jormat-front/src/hooks/usePurchases.ts` (useCreateFacturaProveedorDraft/useIssueFacturaProveedor) | REQ-04 | crea |
| Vista Crear factura proveedor | `front/jormat-front/src/app/(app)/compras/crear-factura-proveedor/page.tsx` + `src/components/compras/builder/` (PurchaseInvoiceBuilder, SupplierCard, CurrencyDetailCard) | REQ-04 | crea |
| Nav gateado (cap en item Compras) | `front/jormat-front/src/components/shell/nav/nav-data.ts` | REQ-04 | modifica (aditivo — `cap: 'purchases.supplier-invoices:edit'`) |
| Módulo BE Compras (stub) | `backend/jormat-api/src/purchases/` (module, facturas-proveedor.controller, purchases.service, dto/*) | REQ-05 | crea |
| Tipos regenerados | `front/jormat-front/src/types/api.gen.ts` | REQ-05 | modifica (regen) |
| Tests (stories/hooks/can/calc/supertest) | `src/components/compras/**/*.stories.tsx`, `*.test.tsx`, `src/lib/purchases/*.test.ts`, `src/purchases/*.spec.ts` | REQ-01..05 | crea |

> **Checklist de calidad por artefacto**: copys/labels en español hardcodeados — el proyecto **no tiene infra i18n aún** (deuda explícita; i18n es B5); se documenta, no se bloquea. Cada artefacto tiene consumidor en este sprint. Los enums usan **constantes tipadas** (`CURRENCY`/`INVOICE_TYPE`), no magic strings. El IVA condicional vive en **función pura** (`calcIva`), no inline.

## Constraints

- **RULE-global-001**: DoD C1–C6 — separar lógica/hooks/presentación; sin `any`; sin código muerto ni `console.*`; nombres en inglés / comentarios en español; **builder reusado vía primitivas compartidas (C1, no duplicar)**.
- **RULE-global-002**: seguridad S1–S4 — cada acción mapea a su capability + `@RequireCapability` en el stub (test 403); DTO sin RUT/datos reales; `currency`/`valueCurrency` requeridos (issue).
- **RULE-global-003**: NO tocar base entregada (MSAL/`AuthGuard`/RLS). El stub aplica el patrón existente.
- **DEC-002**: Fase 0 (Zod a mano, front fuente del contrato) en S1; Fase 1 (regen del Swagger) en S3.
- **DEC-006**: capabilities `module.feature:action`.
- **DET-30**: rama de ticket (`epic/jormat-v1`, no develop/master). `execute_scope` declarado en el ticket (incluye `components/shared/builder/` y `components/ventas/builder/` por la extracción REQ-02).
- **DET-31**: mutation testing warn-first al cierre de sessions que tocan código (scope `.ts`: `calc-iva`, schemas, seed, `calc-line` — blind a `.tsx`).
- **DET-32**: la extracción de primitivas es la materialización del veredicto `reuse` (no `build`) — el builder ya existe; se reusa parametrizándolo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-014 (B2 Ventas) | internal | `TransactionBuilder` + primitivas (`LineItemsTable`, `ItemSearchPanel`, `DocumentSummaryCard`) a extraer; patrón stub NestJS; `calcTotals` (ref. para `calcPurchaseTotals`) | DONE — **toca su código** (extracción/migración, riesgo de regresión) |
| JOR-013 (B1 Items) | internal | `useItems`, `itemListItemSchema` (buscador del builder) | DONE — bajo |
| JOR-006/007 (UI) | internal | Button, Input, Select, Card, Badge, FormField, DataTable, PageLayout, Alert | DONE — bajo |
| JOR-008/010/011 (RBAC) | internal | `<Can>`/`useCan`/`can()`, guard trio + `@RequireCapability` + catálogo capabilities | DONE — bajo |
| `@dnd-kit`, `react-hook-form` (`useFieldArray`) | external (npm) | en las primitivas extraídas (reorden + líneas) | DONE — ya consumidas por JOR-014 |
| `openapi-typescript` | external (npm) | regen de tipos (Fase 1) | DONE — script presente |
| Backend levantado en dev | runtime | Swagger en `/api/docs` para regen (S3) | medio — requiere `./run.sh dev` + DB migrada/seed |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| La extracción rompe Ventas (regresión cross-módulo en código cerrado) | medium | high | S1 riesgo-primero; migración mecánica; **suite Vitest + stories de Ventas como safety net (deben quedar verdes)**; reviewer aislado en S1.GATE; smoke UI de Ventas |
| Confundir IVA por moneda/origen | medium | medium | `calcIva` función pura con scenarios dedicados (Euro→0, CLP→19%); unit + mutation |
| `valueCurrency` mal interpretado (es tipo de cambio, no código) | low | medium | tipado `number` separado + comentario en español + scenario; aclarado en doc vista 08 |
| Genericidad insuficiente de las primitivas (props no cubren el caso AP) | medium | medium | extraer con el caso de Compras a la vista (currencyFormatter, shape de línea común); si una primitiva no generaliza limpio, mantener su orquestador específico |
| Drift FE↔BE del contrato | medium | medium | Front define Zod (S1); BE refleja en DTO (S3); regen hace fallar `tsc` si difieren |
| Storybook browser flaky (dual-project) | medium | low | jsdom para hooks/gating/calc; stories de interacción con `play`; limpiar cache si flaky |

## Open questions

- Ninguna abierta. Las 4 del draft resueltas (Q1 `valueCurrency`=tipo de cambio, Q2 IVA por moneda/origen, Q3 "Salir" confirma descarte, Q4 monedas EUR/USD/CLP) — ver `tickets/JOR-015.draft/intent.md` + ticket decisions_log.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Reuso del builder vía extracción de primitivas compartidas
- **Contexto**: C1 exige reusar el transaction-builder de JOR-014 "sin duplicar (props/config)", pero ese builder no tiene props (todo hardcodeado a venta/cliente). Honrar C1 obliga a tocar código de Sales (cerrado) → blast radius.
- **Drivers**: DRY (C1); no duplicar ~3 componentes + lógica de cálculo; dejar el patrón como infraestructura compartida para B4.
- **Opción elegida** (por el dev, surfaced pese a super por cruzar a código cerrado): **extraer las primitivas genéricas** (`LineItemsTable`, `ItemSearchPanel`, `DocumentSummaryCard`, `calcLineTotal`) a `components/shared/builder/` con props de config; migrar Ventas a consumirlas; cada módulo mantiene su **orquestador** (schema, capability, header card, estrategia IVA).
- **Alternativas**: (a) **copiar + adaptar** a `components/compras/builder/` — cero blast radius pero duplica → viola C1; (b) **generalizar full `<DocumentBuilder mode>`** — máximo DRY pero refactor mayor del orquestador cerrado de Sales → más riesgo de regresión.
- **Consecuencias**: S1 toca código cerrado de Ventas (riesgo de regresión, mitigado por su suite verde); las primitivas quedan compartidas; cada orquestador (`TransactionBuilder` ventas / `PurchaseInvoiceBuilder` compras) encapsula su delta.
- **Reversibilidad**: media — si la extracción resultara problemática, fallback a (a) copiar; las primitivas extraídas se podrían re-inline en Ventas con git revert acotado.
- **Session**: intake-explore (S0) + design-feature; elegida por el dev vía AskUserQuestion.

### DEC-LOCAL-02: IVA condicional como función pura por moneda/origen
- **Contexto**: la factura proveedor en importación (Euro/Dólar) lleva IVA 0; en compra nacional (CLP) IVA 19% (doc vista 08 §Dominio).
- **Drivers**: corrección de negocio; testabilidad; mutation-friendly.
- **Opción elegida**: `calcIva(neto, currency)` pura — 0 si `currency !== 'CLP'`, `round(neto*0.19)` si CLP; compuesta en `calcPurchaseTotals`.
- **Alternativas**: IVA inline en el componente de resumen (descartada — no testeable, viola C4); flag booleano `esImportacion` separado de la moneda (descartada — redundante con `currency`, fuente doble de verdad).
- **Consecuencias**: el resumen recalcula IVA al cambiar la moneda; un solo origen de verdad (la moneda).
- **Session**: design-feature.

### DEC-LOCAL-03: `currency` + `valueCurrency` tipados estrictos
- **Contexto**: warning del ticket — `valueCurrency` es el tipo de cambio, NO un duplicado del código (coincidió en el mockup por el dato de ejemplo).
- **Drivers**: C2 (tipado estricto); evitar el error de tratar `valueCurrency` como string/código.
- **Opción elegida**: `currency: z.enum(['CLP','EUR','USD'])`, `valueCurrency: z.number()` (con comentario en español aclarando que es el tipo de cambio).
- **Alternativas**: `currency: string` libre (descartada — C2); fusionar valor con código (descartada — son campos distintos).
- **Consecuencias**: el contrato distingue moneda (enum) de tipo de cambio (número); scenario de validación dedicado.
- **Session**: design-feature.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan.
- [ ] **Tests**: stories-como-tests por estado (CLP nacional / Euro internacional / vacío) + hooks (RTL+MSW) + Can-gating + unit `calcIva`/`calcPurchaseTotals` + supertest del stub verdes; coverage delta del módulo reportado.
- [ ] **Regresión cero en Ventas**: toda la suite de `components/ventas/**` + items afectados verde tras la extracción (REQ-02); smoke UI de `/ventas/crear-factura`.
- [ ] **NFRs**: cada acción mapea a su capability + stub revalida (403 por capability); DTO sin RUT reales; `currency`/`valueCurrency` requeridos (issue).
- [ ] **Rules**: RULE-global-001/002/003 (sin `any`, base intacta, builder reusado sin duplicar, scope `workspace_id`).
- [ ] **Integration**: tras el switch, la vista 08 funciona contra el stub; FE compila contra los tipos regenerados (no `Record<string,never>`).
- [ ] **Mutation (DET-31)**: corrida warn-first por session que toca código (.ts); sobrevivientes críticos → hardening task; light → backlog must.

## Tasks

### Session 1 — Bn.0 seed + REQ-02 extracción de primitivas (migrar Ventas) + Bn.1 contrato Zod + IVA condicional [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S1.T1, S1.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Seed idempotente `06_purchases_capabilities.ts` (`purchases.supplier-invoices:{edit,issue}`) + guard de prod. **Ajuste**: `internal-admin` ya tiene `*` (03_rbac.ts) → NO se edita 03_rbac.ts | REQ-01 | developer | — | `backend/jormat-api/seeds/06_purchases_capabilities.ts` | seed en DB test + verificar 2 filas + idempotencia | git rm del seed | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Extraer primitivas (`LineItemsTable`, `ItemSearchPanel`, `DocumentSummaryCard`) a `components/shared/builder/` con props de config + `calcLineTotal` genérico a `lib/builder/` | REQ-02 | developer | — | `src/components/shared/builder/`, `src/lib/builder/calc-line.ts` | `tsc` exit 0 (sin `any` en API) | git revert (re-inline) | DET-16, RULE-global-001 | done | 1 |
| S1.T3 | Migrar `components/ventas/builder/*` a consumir las primitivas compartidas (imports + props config CLP) — **regresión cero** | REQ-02 | developer | S1.T2 | `src/components/ventas/builder/*`, `src/lib/ventas/calc-totals.ts` | **162 tests jsdom verdes** (ventas+shared+items+lib) + tsc; stories browser diferidas (warn-first) | git revert | DET-16, RULE-global-001 | done | 1 |
| S1.T4 | Contrato Zod `lib/schemas/purchases.ts` (enums `CURRENCY`/`INVOICE_TYPE` + line item + draft/issue con `currency`/`valueCurrency`) + tipos `types/purchases.ts` | REQ-03 | developer | — | `src/lib/schemas/purchases.ts`, `src/types/purchases.ts` | unit Vitest (multi-moneda + draft/issue + valueCurrency=number) | git rm | DET-1, DET-2, DET-8 | done | 1 |
| S1.T5 | IVA condicional `lib/purchases/calc-iva.ts` (`calcIva` + `calcPurchaseTotals`) + módulo api `services/api/compras/` + handlers MSW `purchases.ts` | REQ-03 | developer | S1.T4, S1.T2 | `src/lib/purchases/calc-iva.ts`, `src/services/api/compras/facturas-proveedor.ts`, `src/test/msw/handlers/purchases.ts` | unit `calcIva` (Euro→0, CLP→19%) + `tsc` + handler parsea contrato | git revert | DET-2, DET-7, DET-8, RULE-global-001 | done | 1 (api/MSW completados en S2.T1) |
| **S1.GATE** | Gate de sync Session 1 (tier T3, ⚑ fuerte): regresión Ventas verde (162 jsdom + tsc) + unit Zod/seed/calcIva (20) + quality review 10-dim → continue. Mutation warn-first diferida; stories browser diferidas | REQ-01/02/03 | reviewer | S1.T1..T5 | ticket, spec | gate persistido + vitest 162+20 verde + tsc exit 0 | — | DET-13, DET-20, DET-23, DET-30, DET-31 | done | 1 |

### Session 2 — Bn.2 vista 08 builder de factura proveedor (multi-moneda, IVA condicional) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S2.T2, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `usePurchases.ts` (useCreateFacturaProveedorDraft/useIssueFacturaProveedor, RQ mutation, MSW) + key factory | REQ-04 | developer | S1.GATE | `src/hooks/usePurchases.ts` | unit hook (success/error) RTL+MSW | git revert | DET-2, DET-8 | done | 2 |
| S2.T2 | `PurchaseInvoiceBuilder` orquestador (página `/compras/crear-factura-proveedor` + barra acciones + card Datos factura RHF+zod + `SupplierCard` search stub) consumiendo `LineItemsTable`/`ItemSearchPanel` compartidos | REQ-04 | developer | S1.GATE | `src/app/(app)/compras/crear-factura-proveedor/page.tsx`, `src/components/compras/builder/` | stories (sin items/con items) + form header test | git rm ruta | DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T3 | `CurrencyDetailCard` (Moneda `CURRENCY` + Valor `valueCurrency`) + `DocumentSummaryCard` compartido con `calcPurchaseTotals` (IVA condicional en vivo) + currencyFormatter | REQ-04 | developer | S1.GATE | `src/components/compras/builder/` | stories (CLP 19% / Euro 0) + test (cambiar moneda recalcula IVA) | git revert | DET-2, DET-7, RULE-global-001 | done | 2 |
| S2.T4 | Wiring acciones (Crear borrador=draft / Facturar=issue estricto + mapeo error→campo) + gateo `<Can purchases.supplier-invoices:issue>` + page gate `:edit` + nav `cap` | REQ-04 | developer | S2.T1, S2.T2, S2.T3 | `src/components/compras/builder/`, `src/components/shell/nav/nav-data.ts` | tests draft-vs-issue + Can-gating + smoke UI | git revert | DET-8, RULE-global-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2, ⚑ fuerte): quality review 10-dim + smoke builder completo + mutation (.ts) | REQ-04 | reviewer | S2.T1..T4 | ticket, spec | gate persistido + smoke + vitest --coverage + dkc-mutate | — | DET-13, DET-20, DET-23, DET-31 | done | 2 |

### Session 3 — Bn.3 BE stub + switch MSW→stub + regen tipos + cierre cobertura [tipo: auto] [tier: T2]

parallel_groups: [[S3.T1]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `PurchasesModule` + `FacturasProveedorController` (guard trio + `@RequireCapability` por endpoint) + `purchases.service` stub + `FacturaProveedorDto`/`SupplierLineItemDto`/`FacturaProveedorInputDto` (`@ApiProperty` + class-validator, `currency`/`valueCurrency` requeridos) + Swagger `@ApiTags('compras')` + `main.ts` addTag + registro `app.module.ts` | REQ-05 | developer | S1.GATE | `backend/jormat-api/src/purchases/`, `src/app.module.ts`, `src/main.ts` | supertest (shape draft 201 + issue 403 sin cap) | git rm módulo | DET-2, DET-8, RULE-global-002 | done | 3 |
| S3.T2 | FE switch MSW→stub (`services/api/compras/*` apuntan a `/api/proxy/compras/...`) + regen `api.gen.ts` + reconciliar tipos | REQ-05 | developer | S3.T1 | `src/services/api/compras/*.ts`, `src/types/{purchases,api.gen}.ts` | FE auto (api ya apunta al stub); `tsc` limpio. Codegen Fase 1 EJECUTADO (regen `api.gen.ts` contra stub live, smoke 401) — B1 resuelto | revertir a MSW | DET-5, DET-8, DET-16 | done | 3 |
| S3.T3 | Consolidar cobertura del módulo (stories/hooks/can/calc/supertest) + coverage delta + mutation final | REQ-05 | developer | S3.T2 | tests del módulo | vitest --coverage verde + supertest verde | — | DET-7, DET-13 | done | 3 |
| **S3.GATE** | Gate de cierre Session 3 (tier T2): acceptance checkpoints + FE compila contra tipos regenerados + quality review + mutation | REQ-05 | reviewer | S3.T1..T3 | ticket, spec | acceptance ejecutado + tsc + supertest + quality review + dkc-mutate | — | DET-13, DET-14, DET-20, DET-23, DET-31 | done | 3 |

## Technical reference

**Contrato (Bn.1, front fuente — DEC-002 Fase 0):**
- `CURRENCY = z.enum(['CLP','EUR','USD'])` (símbolos `$`/`€`/`US$`); `INVOICE_TYPE = z.enum(['nacional','inter'])`.
- `supplierLineItemSchema`: `{ itemId, descripcion, precio: number, cantidad: number, descuento: number, total: number }` (shape de línea común con Ventas).
- `facturaProveedorDraftInputSchema` (parcial) / `facturaProveedorIssueInputSchema` (estricto): `{ proveedor: { razonSocial, rut }, fecha: string, codigo: string, tipo: INVOICE_T
