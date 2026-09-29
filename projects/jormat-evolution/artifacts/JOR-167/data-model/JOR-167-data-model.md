# Modelo de datos afectado — JOR-167 (Iteración 1, slice ejecutable)

> Alcance: REQ-01 a REQ-05 de la Adenda 1. El núcleo de CA-07 (recuperación de N.P./recepción/O.C. y control de cantidades ya facturadas) queda **fuera**, así que su modelo no se define aquí.

## 0. Convenciones

| Marca | Significado |
| --- | --- |
| **NUEVO** | No existe hoy en el código; se crea en este slice |
| **MOD** | Existe, cambia su tipo, semántica, validación o default |
| **=** | Existe y no cambia (se lista por contexto o porque un consumidor sí cambia) |
| **PROPUESTO** | No se implementa en este slice; se deja modelado porque el CA lo exige y hoy no hay soporte |

Léxico de capas (verificado en el repo):

1. **Contrato Zod del front** (`front/jormat-front/src/lib/schemas/*.ts`) es la **fuente de verdad del modelo** por DEC-002 Fase 0. Los tipos se derivan con `z.infer` en `src/types/*`.
2. **DTO NestJS** (`backend/jormat-api/src/sales/dto/*.ts`) refleja el contrato del front.
3. **Persistencia**: **no existe**. No hay tabla de facturas de venta ni de compra en `backend/jormat-api/migrations/` (la última es `20260901000002_transport_companies_legacy_user_update.ts`). `SalesService.createDraft` e `issueFactura` devuelven `STUB_CREATED` sin persistir (`sales.service.ts:405-424`). Esto condiciona directamente a CA-12 (ver §5).

---

## 1. Mapa de entidades tocadas

```
                   ┌──────────────────────────────┐
                   │ DiscountMode (NUEVO)         │  lib/builder/calc-line.ts
                   │ 'percent' | 'amount'         │
                   └──────┬────────────────┬──────┘
                          │                │
           parametriza    │                │  parametriza
                          ▼                ▼
   ┌───────────────────────────┐   ┌───────────────────────────┐
   │ calcLineTotal (MOD)       │   │ LineItemsTable (MOD)      │
   │ lib/builder/calc-line.ts  │   │ shared/builder/...        │
   └────────┬──────────┬───────┘   └────────┬──────────┬───────┘
            │          │                    │          │
   Ventas   │          │ Compras   Ventas   │          │ Compras
   'amount' │          │ 'percent' 'amount' │          │ 'percent'
            ▼          ▼                    ▼          ▼
  ┌──────────────────┐  ┌────────────────────────┐
  │ lineItemSchema   │  │ supplierLineItemSchema │
  │ (MOD: descuento) │  │ (= sin cambio)         │
  └────────┬─────────┘  └────────────────────────┘
           │ 1..N
           ▼
  ┌──────────────────────────────┐        ┌──────────────────────────┐
  │ facturaDraftInputSchema (MOD)│───────▶│ BorradorFactura          │
  │ facturaIssueInputSchema (MOD)│        │ (PROPUESTO — CA-12)      │
  └──────────────────────────────┘        └──────────────────────────┘
           │
           ▼
  ┌──────────────────────────────┐
  │ documentoDTESchema (=)       │  (+ `estado` PROPUESTO)
  └──────────────────────────────┘

  ┌──────────────────────────────┐
  │ ItemSearchState (NUEVO)      │  ItemSearchPanel — REQ-04
  │ ItemSearchFilters (NUEVO)    │
  └──────────────────────────────┘
```

---

## 2. Tipo compartido de descuento (REQ-02) — NUEVO

**Ubicación**: `front/jormat-front/src/lib/builder/calc-line.ts` (el módulo ya compartido por Ventas y Compras desde JOR-015).

### 2.1 `DiscountMode` — enum NUEVO

| Valor | Significado | Consumidor |
| --- | --- | --- |
| `'percent'` | `descuento` es porcentaje 0-100 sobre el bruto de la línea | Compras (`PurchaseInvoiceBuilder`) |
| `'amount'` | `descuento` es importe monetario absoluto en la moneda de la línea | Ventas (`TransactionBuilder`) — canon CA-09 |

```ts
export const DISCOUNT_MODE = ['percent', 'amount'] as const;
export type DiscountMode = (typeof DISCOUNT_MODE)[number];
```

- **Default**: `'percent'`. Es el comportamiento vigente, así que todo consumidor que no pase el modo (Compras, tests preexistentes, stories) conserva su semántica sin tocar una línea. Esta es la razón de elegir `'percent'` como default y no `'amount'`.

### 2.2 `calcLineTotal` — MOD (firma)

| Parámetro | Tipo | Obligatorio | Default | Cambio |
| --- | --- | --- | --- | --- |
| `precio` | `number` | Sí | — | = |
| `cantidad` | `number` | Sí | — | = |
| `descuento` | `number` | Sí | — | **MOD**: la unidad depende de `mode` |
| `mode` | `DiscountMode` | No | `'percent'` | **NUEVO** (4º parámetro posicional) |

Regla de cálculo resultante (`bruto = precio * cantidad`):

- `'percent'`: `total = max(0, round(bruto - (descuento * bruto) / 100))` — idéntico a hoy.
- `'amount'`: `total = max(0, round(bruto - descuento))`.

> Decisión de forma de la firma. Con 4 parámetros posicionales se supera el umbral de ">3 params → objeto tipado". **Recomendación: migrar a `calcLineTotal(values: BuilderLineValues & { mode?: DiscountMode })`**, reusando la interfaz `BuilderLineValues` ya declarada en el mismo archivo y hoy sin consumidores directos. Impacto: 2 llamadores productivos (`calc-totals.ts:47`, `LineItemsTable.tsx:163`) más `calc-purchase-totals` y los tests. Alternativa B (4º parámetro posicional) es menos invasiva pero deja la firma en el límite y sin punto de extensión para el tope por línea.

### 2.3 `BuilderTotals` — = sin cambio

`{ subtotal, descuento, neto, iva, total }`, todos `number` obligatorios. **El campo `descuento` del resumen YA es un importe monetario** (`calc-totals.ts:66`: `descuento = subtotal - neto`), así que `DocumentSummaryCard` no cambia de contrato ni de render. Esto acota el impacto de CA-09 al nivel de línea.

---

## 3. Línea de ítem de Ventas — `lineItemSchema` (MOD)

**Ubicación**: `front/jormat-front/src/lib/schemas/ventas.ts:297-326`.

| Campo | Tipo | Oblig. | Default | Enum / regla | Estado |
| --- | --- | --- | --- | --- | --- |
| `itemId` | `string` (uuid) | Sí | — | FK lógica → `items.id` (uuid público, RULE-api-001) | = |
| `numero` | `int` | No | — | Serial de display; el backend lo descarta por whitelist | = |
| `descripcion` | `string` | Sí | — | — | = |
| `precio` | `number >= 0` | Sí | — | Editable; piso en `minPrice` | = |
| `cantidad` | `int > 0` | Sí | — | `"La cantidad debe ser mayor a 0"` (CA-09) | = |
| **`descuento`** | **`number >= 0`** | **Sí** | **0 (al agregar)** | **Importe monetario CLP. Se elimina `.max(100)`. Nueva regla de línea: `descuento <= precio * cantidad`** | **MOD** |
| `total` | `number` | Sí | — | Derivado: `calcLineTotal(..., 'amount')` | = (valor cambia) |
| `minPrice` | `number >= 0` | No | — | Piso de precio (V-06 / JOR-121) | = |
| `oil` | `int` | No | — | `1` ⇒ descuento deshabilitado y forzado a **0** (V-05) | = (semántica intacta, la unidad del 0 es indiferente) |
| `maxDiscount` | `number` | No | — | **Sigue siendo PORCENTAJE** (origen: `items.maxDiscount` del backend). Ver §3.2 | = (campo) / **MOD** (derivación) |
| `observacion` | `string` | No | — | X-STUB-01, viaja en el payload | = |

### 3.1 Validación nueva de importe no negativo (CA-09)

`.max(100)` desaparece; en su lugar la regla es **por línea** (necesita `precio` y `cantidad`, no cabe en el campo suelto). Se implementa con `superRefine` sobre `lineItemSchema`:

| Regla | Condición de error | Mensaje | Path |
| --- | --- | --- | --- |
| `R-DESC-01` | `descuento > precio * cantidad` | `"El descuento no puede superar el importe de la línea"` | `['descuento']` |
| `R-DESC-02` | `descuento < 0` | ya cubierto por `.nonnegative()` | `['descuento']` |

Nota de coherencia: el issue-schema también debe garantizar que el **neto del documento** no quede negativo tras el descuento global. Con `R-DESC-01` por línea y `descuentoGlobal` acotado a `[0, 20]`, el neto nunca baja de 0; no hace falta una tercera regla.

### 3.2 `maxDiscount`: porcentaje que ahora rinde un tope en monto — MOD (derivación)

El campo **no cambia de tipo ni de unidad** (viene del backend como porcentaje del ítem, legacy `max="{{items.maxDiscount}}"`). Lo que cambia es cómo lo consume la UI de Ventas:

```
descuentoMaxLinea = oil === 1
  ? 0
  : maxDiscount === undefined
    ? precio * cantidad                        // sin tope del ítem: tope natural = bruto (R-DESC-01)
    : round(precio * cantidad * maxDiscount / 100)
```

Consecuencia de modelo: el tope de la línea deja de ser una **constante** (100) y pasa a ser **derivado de `precio` y `cantidad`**, por lo tanto **recalculable en cada cambio de esos campos**. El control debe re-acotar el valor cuando la cantidad baja (si no, un descuento válido para 10 unidades queda por encima del tope al pasar a 2).

> Alternativa descartada: convertir `maxDiscount` a monto en el contrato. Exigiría cambiar el origen del dato en el backend y rompería a Compras, que comparte el mismo campo en `supplierLineItemSchema:116` con semántica de porcentaje.

### 3.3 Control de UI asociado — NUEVO

`PercentStepper` (`components/ui/percent-stepper`) fija `min=0, step=1` y añade el adorno `%`; no sirve para un importe. Dos opciones:

| Opción | Qué implica | Pro | Contra |
| --- | --- | --- | --- |
| **A. `MoneyStepper` nuevo** | Componente hermano que compone `NumberStepper` con adorno de moneda y `step` configurable | Simétrico a `PercentStepper`, cada control con una responsabilidad | Un componente más en `components/ui` |
| **B. Parametrizar `PercentStepper`** | Agregar `adornment`/`unit` y renombrarlo | Un solo control | Renombrar rompe a 4 consumidores (descuento global de Ventas y Compras, descuento de línea de Compras) y mezcla dos unidades en un mismo componente |

**Recomendación: A.** `LineItemsTable` elige el control según `discountMode`, y el renombre transversal no se paga.

---

## 4. Línea de ítem de Compras — `supplierLineItemSchema` (=)

**Ubicación**: `lib/schemas/purchases.ts:101-118`. **No cambia ningún campo.** Se lista porque comparte `LineItemsTable` y `calcLineTotal`:

- `descuento`: `number >= 0`, **sigue siendo porcentaje**. Compras no pasa `discountMode` y cae en el default `'percent'`.
- `DESCUENTO_GLOBAL_MAX` de Compras sigue en 30 (`purchases.ts:126`); el de Ventas sigue en 20 (`ventas.ts:284`).

Impacto colateral verificado en Compras: `PurchaseInvoiceBuilder.tsx` consume `LineItemsTable` sin el prop nuevo y `calcPurchaseTotals` llama a `calcLineTotal` sin el modo. Si se adopta la firma por objeto (§2.2, opción recomendada), **hay que tocar esos llamadores aunque su comportamiento no cambie**; si se adopta el 4º parámetro posicional, Compras queda intacto. Este es el único punto donde la decisión de firma toca a otro módulo.

---

## 5. Cabecera del builder de Ventas (REQ-01 y REQ-03)

**Ubicación**: `lib/schemas/ventas.ts:340-410`.

### 5.1 `facturaDraftInputSchema` / `facturaIssueInputSchema`

| Campo | Tipo | Oblig. draft | Oblig. issue | Default | Estado |
| --- | --- | --- | --- | --- | --- |
| `receptor` | `receptorSchema` (`razonSocial`, `rut` + `telefono?`, `ciudad?`, `direccion?`) | No (parcial) | Sí (`rut` y `razonSocial` no vacíos) | — | = |
| `fecha` | `string` ISO | No | Sí | hoy (`todayIso()`) | = |
| `oc` | `string` | No | No | — | = (texto libre; la recuperación real es CA-07, fuera de slice) |
| `orderNote` | `string` | No | **Sí, `min(1)`** | — | **Delta canon, ver §8.1** |
| `origen` | `string` (código de bodega) | No | Sí, `min(1)` | — | **Delta canon, ver §8.2** |
| `tipoDTE` | enum `TIPO_DTE` (6 valores) | No | Sí | `'factura_afecta'` | = |
| `moneda` | enum `CURRENCY` | No | Sí | `'CLP'` | = |
| `lineas` | `lineItemSchema[]` | No | Sí, `min(1)` | `[]` | **MOD por §3** |
| `formaPago` | enum `FORMA_PAGO` | No | Sí | — | = |
| `medioPago` | enum `MEDIO_PAGO` (10) | No | No | — | = (DT-04: validado, no persistido) |
| `vencimiento` | `string` ISO | No | No | derivado de `medioPago` | = (DT-04) |
| `despacho` | `boolean` | No | Sí | `false` | = |
| `transporte` | `string` (id) | No | No | — | = (DT-04 + DT-01) |
| `observacion` | `string` | No | No | — | = |
| `descuentoGlobal` | `number` `[0, 20]` | No | No | `0` en el cálculo | **= (ver §5.2)** |
| `estadoSII` | enum `ESTADO_SII` | No | No | — | = (contrato-solo) |

### 5.2 `descuentoGlobal`: decisión de unidad

El canon fija el **descuento de línea** como importe (CA-09) y no dice nada del descuento global de cabecera, que en el mockup solo aparece como la fila "Descuento" del resumen (ya monetaria). Opciones:

| Opción | Modelo | Pro | Contra |
| --- | --- | --- | --- |
| **A. Dejarlo en porcentaje 0-20** | Sin cambio de schema | Cero riesgo, fiel al legacy (`max="20"`), el resumen ya muestra el monto | La UI convive con dos unidades de descuento (línea en $, cabecera en %) |
| **B. Pasarlo también a monto** | `descuentoGlobal` pasa a `number >= 0` con regla `<= netAfterLine`; `DESCUENTO_GLOBAL_MAX` pierde sentido y hay que redefinir el tope | UI consistente en $ | El canon no lo pide, rompe el paralelo con Compras (tope 30 %), y cambia `calcTotals` más allá de CA-09 |

**Recomendación: A.** El canon manda sobre el descuento de línea y solo sobre eso; B es alcance auto-asignado.

### 5.3 Flag de borrador — MOD

| Símbolo | Ubicación | Hoy | Queda |
| --- | --- | --- | --- |
| `SHOW_SAVE_DRAFT` | `TransactionBuilder.tsx:106` | `false` | **`true`** |
| `SHOW_SAVE_DRAFT` | `PurchaseInvoiceBuilder.tsx:326` (Compras) | `false` | **`false` (sin cambio)** — el canon de JOR-167 es de Ventas |

El flag gobierna **dos** puntos, no uno: el botón de la barra de acciones (`TransactionBuilder.tsx:536`) y la tercera opción del diálogo de salida (`TransactionBuilder.tsx:506` → `useUnsavedChangesGuard.onSaveDraft` → `NavigationGuardProvider` → `UnsavedChangesDialog.onSaveDraft`). Es decir, **la 3ª opción del guard de CA-15 que pide REQ-03 ya está construida end to end** y se enciende con el mismo flip; no hay que modelar nada nuevo para el guard.

### 5.4 `UnsavedChangesDialog` — = sin cambio de contrato

| Prop | Tipo | Oblig. | Default |
| --- | --- | --- | --- |
| `onSaveDraft` | `() => void` | No | — (ausente ⇒ solo 2 opciones) |
| `saveDraftLabel` | `string` | No | `'Guardar borrador'` |

---

## 6. Persistencia del borrador — brecha real de CA-12 (PROPUESTO)

**Esto es lo más importante del modelo en este slice.** CA-12 pide dos cosas: *conservar la información* y *permitir retomarla*.

Estado verificado:

| Capa | Ventas (hoy) | Compras (hoy, referencia) |
| --- | --- | --- |
| Endpoint de creación | `POST /api/ventas/facturas/draft` (`facturas.controller.ts:34`) | `POST` equivalente |
| Persistencia | **Ninguna**: `createDraft` devuelve `STUB_CREATED` (`sales.service.ts:408`) | Stub en memoria (`STUB_LIST`) pero **con ciclo de vida completo** |
| Estado del documento | `documentoDTESchema` **no tiene campo `estado`**: solo `estadoSII` y `estadoComercial`, ninguno modela "borrador" | `estado: 'borrador' \| 'pendiente' \| 'pagada' \| 'abandonada'` |
| Edición del borrador | **No existe** | `PUT` solo si `estado === 'borrador'` (`purchases.service.ts:357,378-386`) |
| Reentrada desde el listado | **No existe** | Ruta `/compras/facturas-proveedor/[id]/editar` |

Conclusión: **con el flip de flag se cumple "conserva sin emitir" contra el stub, pero NO "permite retomarla"**, porque no hay id persistido, ni estado borrador, ni ruta de reentrada, ni `PUT`. REQ-03 solo se cierra completo si se acepta modelar lo siguiente.

### 6.1 `ESTADO_DOCUMENTO` — enum PROPUESTO (front)

| Valor | Significado |
| --- | --- |
| `borrador` | Guardado sin emitir; editable y retomable |
| `emitido` | Enviado al SII; solo lectura |
| `anulado` | Ya existe el endpoint `POST /ventas/documentos/:id/anular` (JOR-087) sin estado que lo refleje |

Eje **ortogonal** a `estadoSII` y `estadoComercial`, igual que esos dos lo son entre sí (DEC-LOCAL-02). Un borrador no tiene `estadoSII`.

### 6.2 `documentoDTESchema` — campo PROPUESTO

| Campo | Tipo | Oblig. | Default | Nota |
| --- | --- | --- | --- | --- |
| `estado` | enum `ESTADO_DOCUMENTO` | Sí | `'emitido'` para lo existente | Un borrador no lleva `folio` real ni `estadoSII`; ambos pasarían a opcionales en ese estado |

Efecto colateral sobre JOR-166 (listado): agrega una columna/filtro de estado y habilita la acción "Modificar" solo en borradores, tal como hace Compras. **Debe coordinarse con el ticket hermano.**

### 6.3 Tabla `sales_invoice_drafts` — PROPUESTA (fuera de este slice)

Hoy no hay ninguna tabla de facturas, así que esto es diseño a futuro, no una migración a ejecutar ahora:

| Columna | Tipo | Oblig. | Default | Nota |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Sí | `gen_random_uuid()` | PK |
| `workspace_id` | `uuid` | Sí | — | FK → `workspaces.id`; todo el dominio ya es workspace-scoped (`@WorkspaceId()`) |
| `estado` | `text` | Sí | `'borrador'` | CHECK sobre `ESTADO_DOCUMENTO` |
| `payload` | `jsonb` | Sí | `'{}'` | Snapshot de `facturaDraftInputSchema` (parcial por definición) |
| `created_by` | `uuid` | Sí | — | FK → `users.id` |
| `created_at` / `updated_at` | `timestamptz` | Sí | `now()` | — |
| `is_active` | `boolean` | Sí | `true` | Soft delete, patrón ya vigente en el esquema |

Índices propuestos: `(workspace_id, estado)` para el listado filtrado, y `(workspace_id, created_by, updated_at desc)` para "mis borradores recientes".

> Decisión de forma pendiente si se aborda: `payload jsonb` (un borrador es incompleto por naturaleza, columnas tipadas quedarían casi todas nullables) frente a tabla normalizada con `sales_invoice_draft_lines`. Recomendación: `jsonb` para el borrador, normalizado recién al emitir.

---

## 7. Buscador de ítems (REQ-04) — objetos de estado NUEVOS

**Ubicación**: `components/shared/builder/ItemSearchPanel/ItemSearchPanel.tsx`. Es estado de cliente: **no toca contrato, DTO ni DB**.

### 7.1 `ItemSearchState` — MOD del estado interno

| Campo | Tipo | Hoy | Queda |
| --- | --- | --- | --- |
| `search` | `string` | = | = |
| `page` | `number` | `useState(1)` + `<Pagination>` | **Se elimina como control visible**; pasa a cursor interno de acumulación |
| `visibleCount` / `items` | — | — | **NUEVO**: lista acumulada entre páginas |
| `filters` | `ItemSearchFilters` | — | **NUEVO** (scaffold) |

Modelo de "Ver más ítems": el hook `useItems` ya es paginado server-side con `page`/`limit` y devuelve `Paginated<ItemListItem>` (`{ data, total }`). La carga incremental **acumula** páginas en lugar de reemplazarlas; el control se muestra mientras `items.length < total`.

| Constante | Valor | Estado |
| --- | --- | --- |
| `PAGE_SIZE` | `10` (`ItemSearchPanel.tsx:41`) | = (es el `limit` por request; el backend capa en `@Max(100)`) |

> Dos formas de acumular: **A**, `useInfiniteQuery` de React Query (idiomático, cache por cursor, pero introduce un patrón nuevo en el repo y una key distinta a `itemKeys.list`); **B**, mantener `useApiQuery` y concatenar en estado local con `useEffect` (menos código nuevo, pero duplica cache y obliga a resetear a mano en cada cambio de `search`/`filters`). **Recomendación: A**, porque el reset por cambio de filtros sale gratis con la queryKey y el bug de acumulación sucia es el riesgo principal de B.

### 7.2 `ItemSearchFilters` — NUEVO (scaffold, sin contenido definido)

D4 no está respondido, así que el **contenedor** se modela y el **conjunto de filtros ofrecidos** queda abierto. El andamiaje se apoya en lo que `ItemsListParams` ya soporta server-side (`services/api/inventario/items.ts:25-54`), sin inventar parámetros:

| Campo | Tipo | Oblig. | Default | Mapea a | Nota |
| --- | --- | --- | --- | --- | --- |
| `marca` | `string` | No | — | `ItemsListParams.marca` | Match exacto |
| `estado` | `string` | No | — | `ItemsListParams.estado` | Estado de stock |
| `categorias` | `string` (id) | No | — | `ItemsListParams.categorias` | FK lógica → catálogo |
| `aplicaciones` | `string` (id) | No | — | `ItemsListParams.aplicaciones` | FK lógica → catálogo |
| `referencias` | `string` | No | — | `ItemsListParams.referencias` | Substring |
| `oferta` | `boolean` | No | — | `ItemsListParams.oferta` | Solo se envía si `true` |

Regla de modelo: **`ItemSearchFilters` es un subconjunto de `ItemsListParams`, nunca un tipo paralelo.** Cuando negocio responda D4, se agregan o quitan claves de ese subconjunto sin tocar la capa de servicios. Un filtro que negocio pida y que `ItemsListParams` no soporte requiere cambio de backend y queda declarado como tal.

---

## 8. Deltas canon vs stack detectados por REQ-05 que tocan el modelo

La verificación de CA-05, CA-10, CA-11, CA-13, CA-14 y CA-15 encontró dos divergencias de **schema** entre el texto canónico y el contrato vigente. Ninguna depende de las preguntas abiertas a negocio, así que ambas son decidibles hoy.

### 8.1 `orderNote` obligatorio al facturar — contradice el canon

| Fuente | Dice |
| --- | --- |
| Canon (Request) | "N.P. y O.C. son referencias **opcionales**; también se puede facturar cargando productos directamente" |
| Canon (CA-13) | Exige cliente, fecha, origen, bodega, tipo de documento, forma de pago y ≥1 producto. **No menciona N.P.** |
| Stack | `orderNote: z.string().min(1, 'La nota de pedido (N.P) es obligatoria para facturar')` (`ventas.ts:404`), heredado del `required` del legacy (V-13) |

Por la regla de paridad del ticket ("si el texto del canon difiere del legacy, manda el texto"), **`orderNote` debe pasar a opcional en `facturaIssueInputSchema`**. Es un cambio de una línea, de bajo riesgo (relaja una validación, no la endurece) y arrastra el test que hoy cubre ese mensaje. Se marca como **delta a confirmar con el dev** porque no figura explícitamente en REQ-01 a REQ-04.

### 8.2 `origen` y `bodega` son un solo campo — el canon los separa

| Fuente | Dice |
| --- | --- |
| Canon | "Origen y Bodega son campos **distintos**" |
| Stack | Un único `origen: string` que guarda el **código de bodega** (DEC-7), poblado desde `useBodegas()` y usado como clave de `useStockPorBodega` (`TransactionBuilder.tsx:308-312`, `719-730`) |

Separarlos es un cambio con cola larga: nuevo campo `bodega` en draft e issue schema, en `FacturaInputDto`, en la derivación de stock de CA-11 (hoy indexa por `origen`), en el gate de emisión y en el mensaje de advertencia. **No entra en este slice** (REQ-05 es verificación, no rediseño de cabecera), pero queda registrado porque afecta CA-05, CA-07 y CA-11 a la vez, y porque CA-13 nombra a ambos como obligatorios. Modelo objetivo, para cuando se aborde:

| Campo | Tipo | Oblig. issue | Semántica |
| --- | --- | --- | --- |
| `origen` | `string` | Sí | Sucursal/punto de venta que origina el documento |
| `bodega` | `string` (código) | Sí | Bodega que define disponibilidad y stock (clave de `useStockPorBodega`) |

---

## 9. DTOs del backend (reflejo del contrato)

### 9.1 `LineItemDto` — MOD (validación)

`backend/jormat-api/src/sales/dto/line-item.dto.ts`

| Campo | Tipo | Validador hoy | Validador objetivo | Estado |
| --- | --- | --- | --- | --- |
| `itemId` | `string` | `@IsUUID('all')` | = | = |
| `descripcion` | `string` | `@IsString()` | = | = |
| `precio` | `number` | `@IsNumber()` | `@IsNumber() @Min(0)` | MOD (endurece) |
| `cantidad` | `number` | `@IsNumber()` | `@IsNumber() @Min(1)` | MOD (endurece, CA-09) |
| `descuento` | `number` | `@IsNumber()` | `@IsNumber() @Min(0)` | **MOD (semántica: monto)** |
| `total` | `number` | `@IsNumber()` | = | = |

Hallazgo a favor: el comentario del DTO **ya documenta la semántica de monto** (`total = precio * cantidad - descuento`, `line-item.dto.ts:7`), divergente del front que aplicaba porcentaje. Al pasar Ventas a monto, front y DTO quedan **alineados por primera vez**; el comentario deja de estar equivocado. Como el validador es `@IsNumber()` sin tope, **el cambio de unidad no rompe el contrato HTTP vigente**: ningún payload que hoy pasa deja de pasar.

Regla de coherencia por línea (`descuento <= precio * cantidad`): espejo de `R-DESC-01`. Requiere validador custom o chequeo en servicio, porque class-validator no compara campos hermanos de forma nativa.

### 9.2 `FacturaInputDto` — = sin cambios de campo

`descuentoGlobal` sigue `@IsOptional() @IsNumber()` sin tope (`factura-input.dto.ts:108-111`), compatible con la opción A de §5.2. No hay campo de estado ni de borrador que agregar mientras no se aborde §6.

---

## 10. Índices y relaciones

**Índices: no aplica en este slice.** No hay tabla de facturas de venta en `migrations/`; toda la entidad vive en contrato Zod, DTO y stubs en memoria. Los índices propuestos para una eventual `sales_invoice_drafts` están en §6.3.

Relaciones vigentes (todas lógicas, no FK de base):

| Origen | Destino | Cardinalidad | Vía |
| --- | --- | --- | --- |
| `facturaDraftInput` / `facturaIssueInput` | `lineItemSchema` | 1 → N | `lineas[]` |
| `lineItemSchema.itemId` | `items.id` (uuid público) | N → 1 | FK lógica, validada como uuid en el DTO |
| `facturaInput.receptor.rut` | `clientes` (catálogo) | N → 1 | FK lógica por RUT, poblada en `handleSelectCliente` |
| `facturaInput.origen` | `bodegas.codigo` (catálogo) | N → 1 | FK lógica por código; **también** es la clave de stock (ver §8.2) |
| `facturaInput.transporte` | `transport_companies.id` | N → 1 | FK lógica; tabla real existe (`20260901000001_transport_companies.ts`), persistencia pendiente por DT-04 |
| `documentoDTEDetalle` | `lineItemSchema` | 1 → N | `documentoDTEDetalleSchema` reusa la MISMA línea del builder (`ventas.ts:332`) |

**Atención al reuso**: `documentoDTEDetalleSchema.lineas` usa `lineItemSchema`. El cambio de unidad del descuento alcanza por lo tanto a la **vista de detalle de un documento ya emitido** (`/ventas/documentos/[id]`), no solo al builder. Ver §11.

---

## 11. Notas de migración

No hay datos productivos que migrar (sin tabla, sin persistencia). Lo que sí requiere conversión es **todo dato sembrado con semántica de porcentaje**:

| # | Qué | Dónde | Acción |
| --- | --- | --- | --- |
| M1 | Líneas de documentos stub del detalle de Ventas | `sales.service.ts:235,243,253,266` (`descuento: 0`) | **Ninguna.** Todos están en `0`, valor idéntico en ambas unidades. Migración trivial por suerte, no por diseño |
| M2 | Fixtures y stories del builder | `TransactionBuilder.stories.tsx`, `LineItemsTable.stories.tsx` | Revisar cada `descuento` distinto de 0: un `descuento: 10` pasa de "10 %" a "$10" y el total del snapshot cambia |
| M3 | Tests de `calc-totals` | `lib/ventas/calc-totals.test.ts` | Reescribir los casos de descuento de línea en monto; **conservar** los de `descuentoGlobal` (sigue en %) |
| M4 | Tests de `calc-line` | `lib/builder/calc-line` (tests compartidos) | Agregar la batería del modo `'amount'` sin tocar la del modo `'percent'` (Compras) |
| M5 | Tests de borrador hoy anulados | `TransactionBuilder.test.tsx` y compañía, bloques `describe.skip` desactivados en JOR-136 | Re-habilitar junto con el flip de `SHOW_SAVE_DRAFT` |
| M6 | Tests de `LineItemsTable` | `LineItemsTable.test.tsx` | Cubrir ambos modos; el caso `maxDiscount` pasa a verificar el **tope derivado** (§3.2), no el 100 fijo |
| M7 | Detalle de documento emitido | `documentoDTEDetalleSchema` → vista de detalle | Verificar el render del descuento por línea: comparte schema con el builder y hereda la unidad nueva |
| M8 | Compras | `PurchaseInvoiceBuilder`, `calc-purchase-totals`, `supplierLineItemSchema` | **Sin cambio funcional.** Solo tocar los llamadores si se adopta la firma por objeto (§2.2) |

Reversibilidad: el cambio de unidad es **reversible con un flip** mientras `DiscountMode` exista (Ventas volvería a pasar `'percent'`), pero los **valores ya capturados** en un borrador persistido no se reinterpretan solos. Como hoy no hay persistencia, la ventana de riesgo es nula; **si se implementa §6 antes que CA-09, deja de serlo** y el borrador necesitaría versionado de unidad en el `payload`. Orden recomendado: CA-09 primero, persistencia del borrador después.

---

## 12. Resumen de lo nuevo vs lo existente

**NUEVO**: `DISCOUNT_MODE` / `DiscountMode`; parámetro `mode` de `calcLineTotal`; props `discountMode` (y tope derivado) de `LineItemsTable`; `MoneyStepper`; `ItemSearchFilters`; estado acumulado del buscador; regla `R-DESC-01`.

**MOD**: `lineItemSchema.descuento` (porcentaje → monto, se cae `.max(100)`); derivación de `maxDiscount`; `LineItemDto` (`@Min` en `precio`, `cantidad`, `descuento`); `SHOW_SAVE_DRAFT` de Ventas; paginación del buscador.

**PROPUESTO (no se implementa aquí)**: `ESTADO_DOCUMENTO`; `documentoDTESchema.estado`; tabla `sales_invoice_drafts` con sus índices; `PUT` de borrador y ruta de reentrada.

**DELTA CANON A DECIDIR**: `orderNote` opcional al facturar (§8.1, decidible ya); separación de `origen` y `bodega` (§8.2, arrastra CA-05/CA-07/CA-11, fuera de slice).

**SIN CAMBIO**: todo el contrato de Compras; `BuilderTotals` y `DocumentSummaryCard`; `descuentoGlobal` y su tope de 20; `receptorSchema`, `despachoSchema`, `MEDIO_PAGO` y derivados; `UnsavedChangesDialog`; `FacturaInputDto` a nivel de campos.