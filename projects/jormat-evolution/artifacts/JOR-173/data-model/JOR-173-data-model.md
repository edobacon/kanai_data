# Modelo de datos: JOR-173 · Anular factura mediante nota de crédito

> **Supuestos a verificar contra el código.** No se pudo leer `backend/jormat-api` desde este workspace. Los nombres de tablas y columnas existentes (`sales_documents`, `sales_document_lines`, `stock_movements`, proyección de saldo de 3/7) siguen la convención del seed `05_sales_capabilities.ts`. Antes de migrar, hay que ajustarlos a los nombres reales. Lo marcado **EXISTENTE** se reutiliza tal cual o solo se extiende. Lo marcado **NUEVO** se crea en este ticket.

## 1. Resumen de cambios

| Objeto | Estado | Cambio |
|---|---|---|
| `sales_documents` (cabecera de documento de venta) | EXISTENTE, se extiende | Se agrega el valor `credit_note` al tipo y el valor `voided` al estado. Se agregan columnas de vínculo, motivo y observación de la nota, y la marca de anulación de la factura. |
| `sales_document_lines` (líneas de documento de venta) | EXISTENTE, se extiende | Nueva columna `source_line_id` que vincula cada línea de la nota con la línea de la factura. |
| `stock_movements` (servicio de 2/7) | EXISTENTE, se extiende | Se agrega el valor `credit_note_return` al tipo. Nuevo índice único contra duplicados por referencia. |
| `credit_note_applications` | NUEVO | Aplicación real de una nota a una factura (nota -> factura destino, importe). |
| Proyección de saldo (3/7) | EXISTENTE, cambia el cálculo | Suma las aplicaciones de notas. Calcula el crédito disponible por cliente con agregados SQL. |
| `capabilities` / roles | EXISTENTE, sin cambios | Se usa `sales.documents:void`. No se tocan seeds. |

## 2. Entidades y campos

### 2.1 `sales_documents` (EXISTENTE, se extiende)

La nota de crédito es una fila más de esta tabla, con `document_type = 'credit_note'` (REQ-01, REQ-08).

| Campo | Tipo | Oblig. | Default | FK / Enum | Estado | Nota |
|---|---|---|---|---|---|---|
| `id` | uuid / bigint | sí | | PK | EXISTENTE | |
| `document_type` | enum | sí | | `invoice`, ..., **`credit_note`** | EXISTENTE + valor NUEVO | Si hoy es varchar con CHECK, se amplía el CHECK. |
| `status` | enum | sí | | `issued`, `pending`, `overdue`, `paid`, ..., **`voided`** | EXISTENTE + valor NUEVO | La factura anulada pasa a `voided`. Así deja de calcularse como Pendiente o Vencida (REQ-04). |
| `customer_id` | FK | sí | | -> `customers.id` | EXISTENTE | La nota copia el cliente de la factura. |
| `total_amount` | numeric(14,2) | sí | | | EXISTENTE | En la nota es igual al total de la factura. No se puede editar (REQ-01). |
| `source_document_id` | FK | no | null | -> `sales_documents.id` ON DELETE RESTRICT | **NUEVO** | Solo para notas: apunta a la factura anulada. Es NOT NULL cuando `document_type = 'credit_note'` y la nota se creó desde una anulación. |
| `credit_note_reason` | enum | no | null | **`return`** (Devolución), **`defect`** (Falla) | **NUEVO** | Obligatorio en notas (CHECK). Define el efecto en stock. |
| `credit_note_observation` | text | no | null | | **NUEVO** | Observación libre. Se sanitiza en el endpoint. Longitud máxima sugerida: 1000. |
| `voided_at` | timestamptz | no | null | | **NUEVO** | En la factura: momento de la anulación. |
| `voided_by_user_id` | FK | no | null | -> `users.id` | **NUEVO** | En la factura: usuario que anuló. Sirve para auditoría del permiso. |

**Restricciones nuevas (CHECK):**

- `chk_credit_note_fields`: `document_type <> 'credit_note' OR (source_document_id IS NOT NULL AND credit_note_reason IS NOT NULL)`.
- `chk_non_credit_note_fields`: `document_type = 'credit_note' OR (source_document_id IS NULL AND credit_note_reason IS NULL AND credit_note_observation IS NULL)`.
- `chk_voided_consistency`: `status <> 'voided' OR voided_at IS NOT NULL`.

> El crédito disponible de la nota **no se guarda** como columna. Se calcula como `total_amount - SUM(credit_note_applications.amount)`. Así no queda un valor que pueda desincronizarse (ver alternativa descartada en §6).

### 2.2 `sales_document_lines` (EXISTENTE, se extiende)

| Campo | Tipo | Oblig. | Default | FK | Estado | Nota |
|---|---|---|---|---|---|---|
| `id` | PK | sí | | | EXISTENTE | |
| `document_id` | FK | sí | | -> `sales_documents.id` | EXISTENTE | |
| `product_id` | FK | sí | | -> `products.id` | EXISTENTE | |
| `warehouse_id` | FK | sí | | -> `warehouses.id` | EXISTENTE (verificar) | Bodega de origen de la línea. Es el destino del reingreso en Devolución. **Si la bodega está en la cabecera y no en la línea, se toma de la cabecera. Confirmar con el código de 2/7.** |
| `quantity` | numeric | sí | | | EXISTENTE | Se copia sin cambios. |
| `unit_price`, `discount`, `tax`, `line_total` | numeric | sí | | | EXISTENTE | Se copian sin cambios. |
| `source_line_id` | FK | no | null | -> `sales_document_lines.id` ON DELETE RESTRICT | **NUEVO** | En la línea de la nota: apunta a la línea de la factura. Da trazabilidad línea a línea y la referencia del movimiento de stock. |

### 2.3 `stock_movements` (EXISTENTE, servicio de 2/7, se extiende)

| Campo | Tipo | Oblig. | FK / Enum | Estado | Nota |
|---|---|---|---|---|---|
| `movement_type` | enum | sí | `sale_out`, ..., **`credit_note_return`** | EXISTENTE + valor NUEVO | Ingreso por Devolución. |
| `reference_document_id` | FK | sí | -> `sales_documents.id` | EXISTENTE (verificar) | Apunta a la **nota**, no a la factura (REQ-04). |
| `reference_line_id` | FK | sí | -> `sales_document_lines.id` | EXISTENTE (verificar) | Apunta a la línea de la nota. |
| `warehouse_id` | FK | sí | -> `warehouses.id` | EXISTENTE | Igual al `warehouse_id` de la línea de la factura. |
| `quantity` | numeric | sí | | EXISTENTE | Positiva (entrada). |

Con `credit_note_reason = 'defect'` no se crean filas.

### 2.4 `credit_note_applications` (NUEVO)

Es el vínculo real entre una nota y la factura a la que se aplica (REQ-05). Cubre dos casos con la misma tabla:

- **Aplicación automática al anular:** se aplica a la factura original el importe pendiente que tenía en ese momento. La deuda queda en 0.
- **Aplicación posterior:** el saldo disponible de la nota se aplica a otra factura del mismo cliente.

| Campo | Tipo | Oblig. | Default | FK / Enum | Nota |
|---|---|---|---|---|---|
| `id` | uuid / bigint | sí | gen | PK | |
| `credit_note_id` | FK | sí | | -> `sales_documents.id` ON DELETE RESTRICT | Debe ser `document_type = 'credit_note'` (se valida en el servicio). |
| `target_document_id` | FK | sí | | -> `sales_documents.id` ON DELETE RESTRICT | Factura que recibe el crédito. |
| `customer_id` | FK | sí | | -> `customers.id` | Se desnormaliza para validar el mismo cliente con la FK compuesta (ver índices) y para agregar por cliente sin join. |
| `amount` | numeric(14,2) | sí | | CHECK `amount > 0` | |
| `application_kind` | enum | sí | | `void_settlement`, `manual` | `void_settlement` = aplicación automática al anular. `manual` = aplicación posterior. |
| `applied_at` | timestamptz | sí | now() | | |
| `applied_by_user_id` | FK | sí | | -> `users.id` | |

**Invariantes, garantizadas en el servicio dentro de la transacción y con bloqueo de fila sobre la nota:**

- `SUM(amount) WHERE credit_note_id = X` <= `total_amount` de la nota.
- `amount` <= saldo pendiente de la factura destino.
- La factura destino no puede estar en `voided` (salvo la `void_settlement` sobre la factura original).

## 3. Índices

| Índice | Tabla | Definición | Estado | Propósito |
|---|---|---|---|---|
| `uq_credit_note_source_document` | `sales_documents` | UNIQUE (`source_document_id`) WHERE `document_type = 'credit_note'` | **NUEVO** | REQ-03: una sola nota por factura, también ante solicitudes concurrentes. El segundo INSERT falla con una violación de unicidad, y el endpoint la traduce a 409. |
| `ix_sales_documents_customer_type` | `sales_documents` | (`customer_id`, `document_type`, `status`) | **NUEVO** (si no existe uno equivalente) | Agregados de crédito disponible por cliente (DET-41). |
| `uq_sales_documents_id_customer` | `sales_documents` | UNIQUE (`id`, `customer_id`) | **NUEVO** | Permite la FK compuesta de `credit_note_applications`. |
| `ix_lines_source_line` | `sales_document_lines` | (`source_line_id`) WHERE `source_line_id IS NOT NULL` | **NUEVO** | Trazabilidad de la nota a la línea de la factura. |
| `uq_stock_movement_reference` | `stock_movements` | UNIQUE (`reference_line_id`, `movement_type`) | **NUEVO** | REQ-04: sin movimientos duplicados por línea de nota. Verificar que no choque con los movimientos existentes de 2/7 antes de crearlo (ver §5). |
| `ix_cna_credit_note` | `credit_note_applications` | (`credit_note_id`) | **NUEVO** | SUM aplicado por nota. |
| `ix_cna_target_document` | `credit_note_applications` | (`target_document_id`) | **NUEVO** | SUM de notas aplicadas por factura (proyección 3/7). |
| `ix_cna_customer` | `credit_note_applications` | (`customer_id`) | **NUEVO** | SUM aplicado por cliente (popup y Estado de cuenta). |
| `fk_cna_credit_note_customer` / `fk_cna_target_customer` | `credit_note_applications` | FK (`credit_note_id`, `customer_id`) y FK (`target_document_id`, `customer_id`) -> `sales_documents(id, customer_id)` | **NUEVO** | Garantiza en la DB que la nota y la factura destino son del mismo cliente. |

## 4. Relaciones

```
sales_documents (invoice) 1 ──── 0..1 sales_documents (credit_note)     vía source_document_id (UNIQUE parcial)
sales_document_lines (invoice) 1 ──── 0..1 sales_document_lines (nota)  vía source_line_id
sales_documents (credit_note) 1 ──── 0..N stock_movements               vía reference_document_id (solo return)
sales_document_lines (nota)   1 ──── 0..1 stock_movements               vía reference_line_id (UNIQUE con movement_type)
sales_documents (credit_note) 1 ──── 1..N credit_note_applications      vía credit_note_id
sales_documents (invoice)     1 ──── 0..N credit_note_applications      vía target_document_id
customers                     1 ──── 0..N credit_note_applications      vía customer_id
```

## 5. Efecto en saldos (proyección de 3/7, EXISTENTE con cálculo extendido)

Fórmulas con agregados SQL, sin iterar filas en memoria (DET-41):

- **Saldo pendiente de una factura** = `total_amount - SUM(pagos aplicados) - SUM(credit_note_applications.amount WHERE target_document_id = factura)`.
- **Crédito disponible de una nota** = `total_amount - SUM(credit_note_applications.amount WHERE credit_note_id = nota)`.
- **Crédito disponible del cliente** = `SUM(total_amount de notas del cliente) - SUM(credit_note_applications.amount WHERE customer_id = cliente)`.

Comportamiento por caso al anular:

| Caso | `void_settlement` creada | Crédito disponible |
|---|---|---|
| Factura sin pagos (criterios 15 y 16) | Por el total | 0 |
| Factura pagada en $100.000 (criterio 17) | Ninguna (saldo pendiente ya en 0) | $100.000 |
| Factura con pago parcial | Por el saldo pendiente | Total menos el saldo pendiente |

La factura queda con `status = 'voided'`. La proyección la excluye de Pendiente y de Vencida, con o sin aplicación.

## 6. Notas de migración

1. **Orden en una sola migración, reversible:**
   1. Ampliar los enums o CHECKs: `document_type += 'credit_note'`, `status += 'voided'`, `movement_type += 'credit_note_return'`, más el nuevo enum `credit_note_reason`.
   2. `ALTER TABLE sales_documents ADD` de `source_document_id`, `credit_note_reason`, `credit_note_observation`, `voided_at` y `voided_by_user_id`, todas nullable y sin backfill.
   3. `ALTER TABLE sales_document_lines ADD source_line_id`, nullable.
   4. `CREATE TABLE credit_note_applications`.
   5. Crear los índices y CHECKs. En Postgres, ampliar un enum con `ALTER TYPE ... ADD VALUE` no se puede usar dentro de la misma transacción en la que se agrega. Si la herramienta de migración envuelve todo en una sola transacción, hay que separar el paso 1 en su propia migración.
2. **Datos existentes:** no hay backfill. Las notas creadas en el legacy o en el módulo independiente (fuera de alcance) quedan con `source_document_id = NULL`. Por eso el índice único es parcial y el CHECK `chk_credit_note_fields` debe aceptarlas. **Decisión pendiente:**
   - **A.** Exigir `source_document_id` solo cuando la nota la crea el flujo de anulación (CHECK relajado, la regla vive en el servicio).
   - **B.** Agregar `origin` (`void` | `standalone`) y que el CHECK dependa de él. Es más explícito, pero suma una columna.
3. **`uq_stock_movement_reference`:** antes de crearlo hay que verificar con una consulta que no haya duplicados en los movimientos actuales de 2/7. Si los hay, se acota el índice con `WHERE movement_type = 'credit_note_return'`.
4. **Rollback:** se borran los índices nuevos, la tabla `credit_note_applications` y las columnas nuevas. Los valores agregados a enums de Postgres no se pueden quitar sin recrear el tipo. Si ya hay filas con esos valores, el rollback requiere migrar esos datos primero.
5. **Sin cambios en seeds de capabilities ni de roles** (REQ-08). `sales.documents:void` ya existe en `seeds/05_sales_capabilities.ts:26`.

### Alternativa descartada: guardar `available_credit_amount` en la nota

- **Ventaja:** la lectura es directa, sin SUM.
- **Desventaja:** es un valor derivado que puede desincronizarse de las aplicaciones y obliga a actualizarlo en cada aplicación.
- **Motivo del descarte:** con `ix_cna_credit_note` el SUM es barato, y se mantiene una sola fuente de verdad. Si el rendimiento lo exige más adelante, la columna se puede agregar como caché mantenida en la misma transacción.