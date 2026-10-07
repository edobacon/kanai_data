# Modelo de datos — JOR-170 · Reglas de emisión en servidor, Super Usuario y utilidad

**Épica:** Facturas cliente — feedback 2/7 (depende de 1/7 = persistencia real de Ventas, JOR-169).
**Fuente de verdad:** doc de decisiones de Facturas Cliente 06-10 (KB, carpetas tickets), secciones 3 (R-09 a R-17, R-20), 4.2/4.3/4.4/4.7 y 5 (T-06, T-07, T-10).
**Qué cubre este documento:** solo el modelo de datos afectado. Las reglas de validación (front/back) se listan únicamente para justificar campos, no se diseñan aquí.
**Base ya existente que este ticket asume (JOR-169):** `invoices` con `folio`, `is_draft`, snapshot de receptor, `sii_status`, `commercial_status`, `issued_at/by`, `draft_meta`; `invoice_items` con `discount_unit` (porcentaje del descuento) y `net_unit_cost` (costo neto unitario al emitir). Todo eso ya está en el esquema y NO se re-crea.

**Leyenda de estado:** EXISTENTE (no se toca) · EXISTENTE-USO (existe, se consume con regla nueva) · MODIFICADO (se altera) · NUEVO (se crea).

---

## 1. Resumen de entidades afectadas

| Entidad | Estado | Driver | Cambio de esquema |
|---|---|---|---|
| `invoices` | MODIFICADO | P-02.1, R-10, R-13, R-20 | + `origin_warehouse_id`, + `payment_condition` (opcional), CHECK de `discount` (opcional) |
| `invoice_items` | EXISTENTE-USO | R-12, R-14, R-17 | Ninguno (reusa `discount_unit`, `net_unit_cost`, `unit_price`, `total`) |
| `invoice_stock_movements` | NUEVO | T-07 | Tabla nueva (ledger referenciado a la factura) |
| `items` | MODIFICADO | T-10 | Migra `oil`→`bloqueo_descuento`, luego DROP `oil` |
| `item_warehouses` | EXISTENTE-USO | R-11, T-07 | Uso con lock; CHECK `item_qty >= 0` (opcional) |
| `warehouses` / `locations` | EXISTENTE-USO | P-02.1 | Resolución origen→bodega y bodega→ubicación |
| `customers` | EXISTENTE-USO | R-09 | Reusa `locked` (smallint) |
| `capabilities` | DATO NUEVO | R-15, ENF-01 | + fila `sales.invoices:commercial-override` |
| `roles` / `role_capabilities` | DATO NUEVO | R-15, ENF-01 | + rol `Super Usuario` + grant |

---

## 2. `invoices` (cabecera del DTE) — MODIFICADO

Columnas relevantes ya presentes (legacy + JOR-169): `id` (serial PK), `uuid` (uuid único), `workspace_id` (uuid, NOT NULL, FK `workspaces`), `type_id` (int, default 1), `date`, `expiration_date` (date), `vat` (smallint, default 19), `customer_id` (FK `customers.id` ON DELETE SET NULL), `order_reference`, `order_note`, `total` (decimal 14,2), `net_total` (decimal 14,2), `discount` (decimal 14,2, default 0), `origin` (int, legacy), `origin_name` (varchar 120), `is_credit` (smallint, default 0), `commentary`, `status`, `is_draft` (smallint, default 0), `folio` (int, único parcial por workspace+type), `receiver_*`, `sii_status`, `commercial_status`, `issued_at`, `issued_by`, `draft_meta` (jsonb), `created_at`/`updated_at`.

### 2.1 Campos nuevos / a tocar

| Campo | Tipo | Nulo | Default | FK / Enum | Nota | Estado |
|---|---|---|---|---|---|---|
| `origin_warehouse_id` | integer | sí | — | FK `warehouses(id)` ON DELETE SET NULL | Bodega de origen real que determina stock y ubicaciones (P-02.1, R-11). Hoy el front envía el **código** (`warehouses.ds_code`) en `origen` y el repo lo guarda en `origin_name`; el backend debe resolverlo a `warehouses.id` y persistirlo aquí para el gate de stock determinista. Se deja `origin` (int legacy) y `origin_name` (display) intactos. | NUEVO |
| `payment_condition` | varchar(20) | sí | — | CHECK `IN ('contado','credito_30','credito_60')` | Condición de pago efectiva (R-04/R-10). El `formaPago` del builder hoy solo vive en `draft_meta`, que en la emisión se anula: sin esta columna una factura emitida pierde su condición (el plazo queda solo inferible de `expiration_date`). Se omite `credito_90` (queda fuera del enum, REQ-04). | NUEVO (recomendado) |
| `discount` | decimal(14,2) | NO | 0 | CHECK `discount >= 0 AND discount <= 80` (opcional) | Ya existe y guarda el **porcentaje** de descuento general. El CHECK superior se fija en 80 (tope del Super Usuario, R-16); el 20 del usuario común se valida en el servicio (depende de la capability, no del dato). | EXISTENTE (CHECK opcional) |
| `expiration_date` + `is_credit` | date + smallint | sí / NO | — / 0 | — | Ya soportan R-10: vencimiento = fecha del documento + días corridos (30/60). No requieren cambio. | EXISTENTE-USO |
| `customer_id` | int | sí | — | FK `customers(id)` | Base del gate de cliente bloqueado (R-09). | EXISTENTE-USO |
| `discount` / `net_total` / `total` | decimal | — | — | — | `net_total`/`total` los calcula el backend (fuente de verdad, ENF-03). | EXISTENTE-USO |

`draft_meta` (jsonb) mantiene `moneda`, `formaPago`, `medioPago`, `despacho`, `transporte`, `clienteId` mientras el documento es borrador; al emitir se anula. No se agregan claves por este ticket.

---

## 3. `invoice_items` (líneas) — EXISTENTE-USO (sin cambio de esquema)

Columnas actuales: `id`, `uuid` (único), `workspace_id` (NOT NULL), `invoice_id` (FK `invoices.id` ON DELETE CASCADE), `location_id` (FK `locations.id` ON DELETE SET NULL), `item_id` (FK `items.id` ON DELETE SET NULL), `quantity` (int, CHECK > 0 o NULL), `unit_price` (decimal 14,2), `total` (decimal 14,2), `discount` (decimal 14,2, default 0), `description` (varchar 300), `discount_unit` (decimal 5,2), `net_unit_cost` (decimal 14,2), `created_at`/`updated_at`.

Mapeo regla → campo (R-05..R-17):

| Regla | Campo que la respalda | Estado |
|---|---|---|
| Descuento de línea validado en **porcentaje** con tope `ds_max_discount` (R-12) | `discount` = importe; `discount_unit` = porcentaje derivado/persistido. La pantalla acepta importe y se convierte a % para validar. | EXISTENTE-USO |
| Precio mínimo = `nm_net` vigente (R-14) | `unit_price` vs `items.nm_net` (piso); revalidado al retomar borrador. | EXISTENTE-USO |
| Precio bajo el vigente permitido con override, costo/utilidad (R-16, R-17) | `unit_price`, `quantity`, `net_unit_cost` (costo congelado al emitir) | EXISTENTE-USO |
| Venta neta de línea / total (R-17) | `total` (= `unit_price*quantity - discount`, piso 0) | EXISTENTE-USO |

**No se agregan columnas.** Los campos de regla que ENF-02 exige espejar (`bloqueoDescuento`, `descuentoPorcentaje`, `minPrice`, `maxDiscount`) son de **contrato** (front ↔ DTO): `descuentoPorcentaje` mapea a `discount_unit` (persistido) y los otros tres se evalúan server-side contra `items` al emitir. Congelarlos por línea (snapshot de `max_discount`/`min_price`/`bloqueo_descuento`) queda como **opcional de auditoría**, no requerido por los CA.

---

## 4. `invoice_stock_movements` (ledger de inventario) — NUEVO

Necesario para T-07: el movimiento de inventario queda **referenciado a la factura** y **no se duplica ante reintentos**. Hoy no existe ningún ledger de stock en el esquema (Guías y Ajustes solo hacen `increment/decrement` sobre `item_warehouses`).

| Campo | Tipo | Nulo | Default | FK / Enum | Nota |
|---|---|---|---|---|---|
| `id` | increments | NO | — | PK | Serial interno. |
| `uuid` | uuid | NO | `uuid_generate_v4()` | UNIQUE | Identificador público (RULE-api-001). |
| `workspace_id` | uuid | NO | — | FK `workspaces(id)` ON DELETE CASCADE | Tenant isolation (RULE-global-002). |
| `invoice_id` | integer | NO | — | FK `invoices(id)` ON DELETE CASCADE | Referencia fuerte a la factura emitida. |
| `invoice_item_id` | integer | sí | — | FK `invoice_items(id)` ON DELETE SET NULL | Línea que originó el movimiento (nullable si la línea se borra). |
| `item_id` | integer | sí | — | FK `items(id)` ON DELETE SET NULL | Maestro borrable sin perder el movimiento histórico. |
| `warehouse_id` | integer | sí | — | FK `warehouses(id)` ON DELETE SET NULL | Bodega de origen afectada. |
| `location_id` | integer | sí | — | FK `locations(id)` ON DELETE SET NULL | Ubicación de la baja (de `invoice_items.location_id`). |
| `movement_type` | varchar(20) | NO | `'salida'` | CHECK `IN ('salida','entrada','ajuste')` | Esta factura emite `salida`. Los otros valores quedan para reversas/ajustes futuros. |
| `quantity` | integer | NO | — | CHECK `quantity > 0` | Siempre positiva; el signo lo da `movement_type`. |
| `unit_cost` | decimal(14,2) | sí | — | — | Costo neto unitario al momento del movimiento (trazabilidad kardex). |
| `created_at` / `updated_at` | timestamps | NO | — | — | Convención del repo. |

**Índices y constraints**

| Nombre | Definición | Propósito |
|---|---|---|
| `invoice_stock_movements_uuid_unique` | UNIQUE (`uuid`) | Identificador público. |
| `uq_invoice_stock_movements_idem` | UNIQUE (`invoice_id`, `item_id`, `warehouse_id`, `movement_type`) | Backstop de idempotencia: un reintento que re-emita el mismo conjunto no duplica el movimiento. El alta es **agregada** por (item, bodega, tipo) dentro de la factura. |
| `idx_invoice_stock_movements_invoice_id` | (`invoice_id`) | Lectura por factura. |
| `idx_invoice_stock_movements_item_id` | (`item_id`) | Kardex por repuesto. |
| `idx_invoice_stock_movements_warehouse_id` | (`warehouse_id`) | Kardex por bodega. |
| `idx_invoice_stock_movements_workspace_id` | (`workspace_id`) | Aislamiento de tenant. |

**Notas de emisión (T-07, no son DDL):** cabecera, líneas y baja de stock se escriben en **una transacción**; la bodega se resuelve desde `origin_warehouse_id`; antes de descontar se toma lock de fila (`SELECT ... FROM item_warehouses WHERE ... FOR UPDATE`) para serializar emisiones concurrentes; sobre reintento de una emisión ya confirmada, el guard `is_draft=0` responde 400 (no re-descuenta) y el UNIQUE de idempotencia es la segunda barrera.

---

## 5. `items` (fichas de repuestos) — MODIFICADO (T-10)

Columnas relevantes ya presentes: `id` (serial PK), `uuid` (único), `workspace_id` (NOT NULL), `nm_price` (int, precio venta), `nm_net` (int, **precio neto de venta** → piso `minPrice`), `net_price` (int, **costo neto de compra** → base de utilidad), `mayor_price` (int), `ds_max_discount` (varchar 50 → tope %), `critical_stock` (int), `oil` (smallint, default 0), `bloqueo_descuento` (smallint NOT NULL, default 0).

### 5.1 Cambio T-10 (unificación `oil` ↔ `bloqueo_descuento`)

| Campo | Acción | Detalle | Estado |
|---|---|---|---|
| `bloqueo_descuento` | destino | `UPDATE items SET bloqueo_descuento = 1 WHERE oil = 1` (solo 1→1; no pisa 0 existente). Único flag de bloqueo de descuento (pantalla y CSV ya lo escriben). | EXISTENTE |
| `oil` | DROP | Se elimina tras copiar. Sus lectores migran a `bloqueo_descuento` (Ventas builder, Compras, Guías, Solicitudes) y el badge “Aceite” pasa a “Bloqueo descuento”. | MODIFICADO (DROP) |

Backfill en la dirección segura: si un item tenía `oil=1` y `bloqueo_descuento=0`, queda bloqueado; nunca se des-bloquea. `down()` re-crea `oil` y copia `oil = CASE WHEN bloqueo_descuento = 1 THEN 1 ELSE 0 END` (reversible, aunque pierde la distinción previa si ambos eran 1 — no había dato para distinguir).

### 5.2 Campos de regla ya presentes (sin cambio)

| Campo | Rol en JOR-170 | Nota |
|---|---|---|
| `nm_net` | piso de precio (`minPrice`, R-14) | Es precio neto de **venta**, no el costo `net_price`. |
| `net_price` | costo neto de compra → base de utilidad (R-17) | Field-level RBAC (`items.parts:cost-view`, JOR-077): sigue gateado; el costo se congela en `invoice_items.net_unit_cost` al emitir. |
| `ds_max_discount` | tope % del descuento de línea (R-12) | Columna **varchar**: el validador debe parsear a número; no se cambia el tipo en este ticket. |
| `bloqueo_descuento` | sin descuento de línea + bloquea el general (R-07) | smallint-as-boolean (convención `offer_is`, `is_kit`). |

---

## 6. `item_warehouses` (stock por bodega) — EXISTENTE-USO

Columnas: `id`, `uuid` (único), `workspace_id` (NOT NULL), `item_id` (FK `items.id`), `warehouse_id` (FK `warehouses.id`), `item_qty` (int, stock), `location_id` (FK `locations.id`), timestamps.

| Aspecto | Detalle | Estado |
|---|---|---|
| Stock del origen (R-11, REQ-02) | Fuente del disponible: `item_qty` para (`item_id`, `origin_warehouse_id`). Incluye el caso 0. Aplica también a Super Usuario. | EXISTENTE-USO |
| Baja transaccional (T-07) | Descuento de `item_qty` bajo `SELECT ... FOR UPDATE`, dentro de la misma transacción que la emisión. | EXISTENTE-USO |
| `CHECK (item_qty >= 0)` | Backstop opcional contra stock negativo bajo concurrencia; agregar como `NOT VALID` si hay filas legacy negativas (documentadas como gap de seguridad: `item_warehouses` no es tenant-scoped — ver `guides.repository.ts`). | CHECK opcional |
| Cardinalidad | Puede haber varias filas por (item, bodega) con distinto `location_id`; el disponible se agrega por (item, bodega). | EXISTENTE (nota) |

---

## 7. `warehouses` / `locations` y `customers` — EXISTENTE-USO

| Entidad | Campo | Rol |
|---|---|---|
| `warehouses` | `id`, `ds_code`, `ds_name` | El front envía el **código** como origen; el backend resuelve `ds_code → id` (por workspace) y lo persiste en `invoices.origin_warehouse_id`. Determina el stock de origen. |
| `locations` | `id`, `warehouse_id`, `ds_code` | Ubicaciones de la bodega de origen; alimentan `invoice_items.location_id`. |
| `customers` | `locked` (smallint, NOT NULL, default 0) | Gate de cliente bloqueado (R-09/REQ-01). Sin cambio de esquema. |

---

## 8. RBAC (datos sembrados) — DATO NUEVO

Tablas existentes: `capabilities`, `roles`, `role_capabilities`, `user_roles` (JOR-010/DEC-006). No cambia su esquema; solo se insertan filas.

### 8.1 Capability

| Campo | Valor |
|---|---|
| `name` | `sales.invoices:commercial-override` |
| `module` | `sales` |
| `feature` | `invoices` |
| `action` | `commercial-override` |
| `description` | Superar tope de descuento de ficha, descontar repuestos con bloqueo, descuento general hasta 80%, precio bajo el vigente, y ver costo/utilidad. |

### 8.2 Rol y grants

| Objeto | Detalle |
|---|---|
| Rol `Super Usuario` | `roles` (workspace-scoped, `is_system = true`) con la capability 8.1. Es un rol propio del workspace; se crea por seed y no reemplaza `owner`/`internal-admin`. |
| `owner` e `internal-admin` | Reciben la capability por los seeds grant-all (`09_internal_admin_grant_all` → internal-admin; `16_workspace_owner_role` → owner), que otorgan “todo lo que exista en `capabilities`” y corren después de los seeds de catálogo. |
| Orden de seeds | La capability debe insertarse en un seed de catálogo **anterior** a `09` (el seed de Ventas `05_sales_capabilities` es el lugar canónico) para que el grant-all la levante en una corrida limpia sin depender de un re-seed. |

---

## 9. Relaciones (cardinalidad)

| Desde | Hacia | Tipo | Regla |
|---|---|---|---|
| `invoices.workspace_id` | `workspaces.id` | N:1 | Tenant. |
| `invoices.customer_id` | `customers.id` | N:1 | Bloqueo (R-09). |
| `invoices.origin_warehouse_id` | `warehouses.id` | N:1 | Origen que fija stock/ubicaciones (P-02.1). |
| `invoices` → `invoice_items` | `invoice_items.invoice_id` | 1:N | CASCADE. |
| `invoices` → `invoice_stock_movements` | `invoice_stock_movements.invoice_id` | 1:N | CASCADE; referenciado a la factura (T-07). |
| `invoice_items.item_id` | `items.id` | N:1 | SET NULL; la línea histórica sobrevive. |
| `invoice_stock_movements.item_id` | `items.id` | N:1 | SET NULL. |
| `invoice_stock_movements.(warehouse_id, location_id)` | `warehouses.id`, `locations.id` | N:1 | SET NULL. |
| `role_capabilities.role_id` / `.capability_id` | `roles.id` / `capabilities.id` | N:M | Grant del Super Usuario. |
| `user_roles.user_id` / `.role_id` | `users.id` / `roles.id` | N:M | Asignación de usuarios al rol. |

---

## 10. Migraciones (orden, contenido, reversibilidad)

Convención del repo: timestamp `YYYYMMDDHHMMSS`, `up/down` simétricas, aditivas y no destructivas salvo el DROP explícito de T-10.

| # | Archivo propuesto | Contenido | Reversible |
|---|---|---|---|
| 1 | `20261004000000_items_unify_oil_bloqueo_descuento.ts` | `UPDATE items SET bloqueo_descuento = 1 WHERE oil = 1;` luego `DROP COLUMN oil`. | `down`: re-crea `oil` (smallint, default 0) y copia desde `bloqueo_descuento`. |
| 2 | `20261004000001_invoices_sales_rules_persistence.ts` | `ADD` `origin_warehouse_id` (int, FK `warehouses(id)` ON DELETE SET NULL, nullable), `payment_condition` (varchar 20, nullable, CHECK enum), `CHECK discount <= 80` (opcional), índice en `origin_warehouse_id`. | `down`: DROP de columnas/constraints/índice. |
| 3 | `20261004000002_invoice_stock_movements.ts` | Crea la tabla (sección 4) con FKs, CHECKs, UNIQUE de idempotencia e índices. | `down`: `dropTableIfExists`. |

Notas:
- La migración 2 es aditiva: filas legacy quedan con `origin_warehouse_id` NULL y `payment_condition` NULL (no se backfillea; el origen legacy `origin`/`origin_name` no se toca).
- La migración 3 no backfillea movimientos de facturas ya emitidas (no había ledger); solo aplica a emisiones nuevas.
- La capability y el rol van por **seeds**, no por migración (patrón del repo: catálogo en seeds no-prod).

---

## 11. Cobertura de criterios de aceptación por el modelo

| CA / REQ | Respaldo en el modelo |
|---|---|
| Cliente bloqueado (REQ-01, criterio 6) | `customers.locked` + `invoices.customer_id` (validación server-side). |
| Stock insuficiente, concurrencia, sin negativo (REQ-02/03, criterio 7) | `item_warehouses.item_qty` + `origin_warehouse_id` + lock `FOR UPDATE` + `invoice_stock_movements` (idempotencia). |
| Tope de ficha, general+linea, bloqueo descuento (REQ-05/06/07, criterios 8/9) | `items.ds_max_discount`, `items.bloqueo_descuento`, `invoices.discount`, `invoice_items.discount_unit`. |
| Precio bajo el vigente / piso (REQ-08, criterio 8) | `invoice_items.unit_price` vs `items.nm_net`. |
| Copia desde otro documento (REQ-09) | Líneas clonadas pasan por las mismas columnas/reglas. |
| Unificación oil (REQ-10, criterio 30) | Migración sección 5 + lectores sobre `bloqueo_descuento`. |
| Capability y rol (REQ-11, ENF-01) | `capabilities` + `roles` + `role_capabilities` (sección 8). |
| Overrides del Super Usuario (REQ-12, criterio 10/28) | Validación por capability; `discount` hasta 80 (CHECK), `unit_price` libre. |
| Utilidad congelada (REQ-13, criterio 26) | `invoice_items.net_unit_cost` (costo al emitir) + `total` (venta neta); cálculo en lectura. |
| Crédito 30/60 (REQ-04, criterio 11) | `payment_condition` (enum sin `credito_90`) + `expiration_date` + `is_credit`. |
| Espejo front/back y no-ruptura de Compras/Guías/Solicitudes (ENF-02) | `line-item.dto.ts` ↔ `lineItemSchema` sobre columnas ya existentes. |

---

## 12. Riesgos y notas abiertas

- **`ds_max_discount` es varchar(50)**: el validador debe parsear con tolerancia a vacío/no numérico (tratar no parseable como “sin tope”). No se cambia el tipo en este ticket.
- **Origen por código**: mientras el front envíe el código de bodega y no el id, la resolución `ds_code → warehouses.id` es obligatoria y puede fallar si el código no existe en el workspace; `origin_warehouse_id` queda NULL y el gate de stock no tiene contra qué validar → definir rechazo explícito.
- **`item_warehouses` no es tenant-scoped** (gap ya documentado en Guías): el descuento de stock debe filtrar por las bodegas del workspace vía `warehouses.workspace_id` para no mutar stock de otro tenant.
- **Idempotencia**: el UNIQUE de `invoice_stock_movements` es el backstop; el mecanismo primario es el guard `is_draft` de la emisión. Si en el futuro se permite re-emitir, agregar `DELETE` de movimientos previos por `invoice_id` dentro de la transacción (patrón `replaceItems`).
- **CHECK `item_qty >= 0`** y **CHECK `discount <= 80`**: agregar como `NOT VALID` si hay datos legacy que los violen; validar aparte.
- **Seed de capability**: si se inserta en un seed con ordinal mayor a `09`, el grant-all de `internal-admin` no la toma en una corrida limpia; usar `05_sales_capabilities` (o forzar re-seed).