# Modelo de datos: JOR-174 · Entrega Rápida, Formato Bodega e impresión de despacho

> Alcance: entidades que leen o escriben Entrega Rápida (REQ-01, REQ-07), Formato Bodega (REQ-02), Imprimir datos de despacho (REQ-03), el selector T-09 (REQ-04, REQ-08) y Visualizar (REQ-05).
> Convención: **[EXISTENTE]** ya está en el esquema; **[EXISTENTE 1/7]** lo aporta el ticket 1/7 (persistencia y copia del receptor); **[NUEVO]** lo introduce este ticket; **[TRANSITORIO]** existe solo en memoria o en la UI y no se persiste.
> Los nombres físicos marcados con `(verificar)` vienen del ticket y del doc de decisiones (sección 4.6 y 5) y hay que confirmarlos contra el esquema real antes de implementar. No se infieren nombres que el pedido no da.

## 1. Resumen de impacto

| Entidad | Estado | Operación en este ticket | REQ |
|---|---|---|---|
| Factura cliente (`invoices` legacy, verificar) | EXISTENTE | UPDATE condicional de 4 columnas legacy | REQ-01, REQ-06, REQ-07 |
| Datos de despacho del receptor en la factura | EXISTENTE 1/7 | Solo lectura | REQ-03 |
| Línea de factura (detalle) | EXISTENTE | Solo lectura | REQ-02 |
| Repuesto (producto) | EXISTENTE | Solo lectura | REQ-02 |
| Bodega | EXISTENTE | Solo lectura | REQ-02 |
| Ubicación de repuesto en bodega | EXISTENTE | Solo lectura | REQ-02 |
| `transport_companies` | EXISTENTE | Solo lectura (reemplaza la lista simulada) | REQ-04, REQ-08 |
| Usuario | EXISTENTE | FK de `user_out_id` | REQ-01 |
| Capability de Bodega (Entrega Rápida) | NUEVO (fila de seed) o EXISTENTE reutilizada | Alta de permiso, sin DDL | REQ-01 |
| Movimientos de stock | EXISTENTE | **No se toca** | REQ-01 |
| Formulario de impresión de despacho | TRANSITORIO | Solo en la UI | REQ-03 |
| Bloque remitente Jormat | EXISTENTE (configuración) | Solo lectura | REQ-03 |

**DDL:** ninguno. No se crean tablas ni columnas (REQ-07). El único cambio persistente posible es una fila de permiso (sección 3.9).

## 2. Diagrama de relaciones

```
users 1 ──< invoices.user_out_id            (Entrega Rápida)
transport_companies 1 ──< invoices.transport_company_id   (despacho, 1/7)
warehouses 1 ──< invoices.warehouse_id      (bodega de origen)
invoices 1 ──< invoice_lines >── 1 products
products 1 ──< product_locations >── 1 warehouses
        (filtro Formato Bodega: product_locations.warehouse_id = invoices.warehouse_id)
```

## 3. Entidades

### 3.1 Factura cliente: columnas de entrega [EXISTENTE]

Tabla legacy de facturas (nombre físico: verificar). Se reutilizan las columnas legacy de salida (REQ-07).

| Campo | Tipo | Oblig. | Default | FK | Estado | Uso |
|---|---|---|---|---|---|---|
| `id` | PK | sí | | | EXISTENTE | Identificación |
| `is_out` | boolean | no (legacy admite NULL, verificar) | `false` | | EXISTENTE | `true` = entregada |
| `date_out` | datetime (zona del servidor, verificar) | no | NULL | | EXISTENTE | Fecha y hora de la entrega |
| `user_out_id` | int/bigint (igual a `users.id`) | no | NULL | `users.id` | EXISTENTE | Usuario que entrega (el actual) |
| `commentary_out` | text | no | NULL | | EXISTENTE | Comentario de la entrega (opcional en la UI) |
| estado de emisión (verificar nombre) | enum/int | sí | | | EXISTENTE | Condición: solo **emitidas** aceptan Entrega Rápida |
| estado SII (verificar nombre) | enum | | | | EXISTENTE | **No se lee** en ninguna acción de este ticket (REQ-06) |
| `warehouse_id` (verificar) | FK | sí | | `warehouses.id` | EXISTENTE | Bodega de origen para Formato Bodega |
| folio / número, fecha de emisión, `client_id` | varios | sí | | `clients.id` | EXISTENTE | Encabezado de Formato Bodega y de despacho |

**Invariantes de Entrega Rápida (REQ-01):**

- Precondición: factura emitida y `COALESCE(is_out, false) = false`. No se exige pago.
- Escritura atómica e idempotente: un solo `UPDATE` condicional.
  ```sql
  UPDATE <invoices>
     SET is_out = true, date_out = :now, user_out_id = :currentUserId, commentary_out = :comment
   WHERE id = :id AND <estado_emitida> AND COALESCE(is_out, false) = false;
  ```
  Si afecta 0 filas: no hay escritura, se devuelve el estado actual (ya entregada) sin error y **sin** reescribir `date_out` ni `user_out_id` (criterio 19).
- No genera movimientos de stock (el stock ya se descontó al emitir, ticket 2/7).
- No depende del estado SII (REQ-06, P-15.1.D1).

### 3.2 Factura cliente: datos de despacho del receptor [EXISTENTE 1/7]

Los persiste 1/7 en la factura. Aquí son **solo lectura** para Imprimir datos de despacho (REQ-03). Los nombres físicos los define 1/7 (verificar).

| Campo lógico | Tipo | Oblig. | FK | Nota |
|---|---|---|---|---|
| Destinatario | varchar | no | | Copia guardada en la factura, no se relee del cliente |
| RUT | varchar | no | | Igual que arriba |
| Teléfono | varchar | no | | |
| Dirección | varchar | no | | |
| Ciudad (o comuna) | varchar o FK | no | catálogo de ciudades, si existe (verificar) | |
| Transporte | FK | no | `transport_companies.id` | Se muestra el nombre del transportista |
| Observación | text | no | | |

Regla: el documento de despacho usa **los datos guardados en la factura**, no los datos actuales del cliente (criterio 21). Un campo vacío se imprime vacío; no se completa desde otra fuente.

### 3.3 Línea de factura [EXISTENTE]

| Campo | Tipo | Oblig. | FK | Uso en Formato Bodega |
|---|---|---|---|---|
| `id` | PK | sí | | Orden de las líneas (o columna de posición, si existe: verificar) |
| `invoice_id` | FK | sí | factura | |
| `product_id` | FK | sí | `products.id` | Une con ubicaciones |
| cantidad | numeric/int | sí | | Cantidad |
| descripción de la línea (si existe) | varchar | no | | Prioridad sobre la descripción del repuesto, si así lo hace la factura comercial (verificar) |

Orden de salida: el mismo orden de las líneas de la factura (REQ-02). No se reordena por ubicación (la asignación de picking está fuera de alcance).

### 3.4 Repuesto (producto) [EXISTENTE]

| Campo | Tipo | Uso |
|---|---|---|
| `id` | PK | |
| código | varchar | Columna "Código" |
| descripción | varchar | Columna "Descripción" |

### 3.5 Bodega [EXISTENTE]

| Campo | Tipo | Uso |
|---|---|---|
| `id` | PK | Filtro de ubicaciones |
| nombre | varchar | Encabezado "Bodega de origen" en Formato Bodega |

### 3.6 Ubicación de repuesto en bodega [EXISTENTE]

Tabla de ubicaciones físicas (nombre físico y forma: verificar según el doc de decisiones 4.6; puede ser una tabla puente producto x bodega x ubicación, o un catálogo de ubicaciones más una tabla de asignación).

| Campo | Tipo | Oblig. | FK | Nota |
|---|---|---|---|---|
| `product_id` | FK | sí | `products.id` | |
| `warehouse_id` | FK | sí | `warehouses.id` | Se filtra por la bodega de origen de la factura |
| código o etiqueta de la ubicación | varchar o FK a catálogo | sí | catálogo de ubicaciones (verificar) | Texto impreso |

Reglas de lectura (REQ-02, criterio 20):

- Cardinalidad 0..N por (repuesto, bodega). Con varias ubicaciones se listan **todas** en la misma fila (separadas, en orden estable: por código de ubicación).
- Con 0 ubicaciones la línea **se mantiene** y muestra el texto `Sin ubicacion` (constante de UI, no un dato persistido). Se resuelve con `LEFT JOIN`, nunca con `INNER JOIN`.
- Una línea repetida del mismo repuesto repite sus ubicaciones; no se agrupan líneas.

### 3.7 `transport_companies` [EXISTENTE]

| Campo | Tipo | Oblig. | Nota |
|---|---|---|---|
| `id` | PK | sí | Valor que guarda la factura (1/7) |
| nombre | varchar | sí | Etiqueta del selector T-09 y del documento de despacho |
| activo / borrado lógico (si existe: verificar) | boolean / datetime | | El selector lista solo los activos; la impresión muestra el guardado aunque esté inactivo |

REQ-04 y REQ-08: T-09 consume **el mismo servicio o endpoint** que `TransportistasView`. Se elimina la lista simulada. No hay una segunda consulta al catálogo ni una copia en el frontend.

### 3.8 Usuario [EXISTENTE]

Solo como destino de `user_out_id`. Visualizar puede mostrar el nombre del usuario que entregó (lectura).

### 3.9 Capability de Bodega [NUEVO fila o EXISTENTE reutilizada]

Hay que decidir entre dos opciones:

| Opción | Cambio de datos | Pros | Contras |
|---|---|---|---|
| A. Capability nueva (p. ej. `invoices.quick_delivery`, nombre por definir) | 1 fila de seed en el catálogo de permisos y su asignación a los roles de Bodega | Control fino; se le puede quitar al vendedor | Requiere seed y asignación a roles existentes (si no se asigna, nadie la ve tras el deploy) |
| B. Reutilizar una capability existente de Bodega/despacho | Ninguno | Sin migración | Hereda el alcance de esa capability, que puede ser más amplio |

En ambas opciones no hay DDL. Formato Bodega e impresión de despacho usan el permiso de lectura de la factura que ya existe.

### 3.10 Formulario de impresión de despacho [TRANSITORIO]

Solo existe en la pantalla de impresión (REQ-03). **No se persiste**: no tiene tabla, ni columna, ni endpoint de escritura.

| Campo | Tipo | Oblig. | Default | Validación |
|---|---|---|---|---|
| `packageCount` (bultos) | entero | no | 1 | >= 1 |
| `dimensions` | texto libre (o largo/ancho/alto numéricos) | no | vacío | |
| `weight` | decimal (kg) | no | vacío | >= 0 |
| `fragile` | boolean | no | `false` | |

### 3.11 Bloque remitente Jormat [EXISTENTE configuración]

Razón social, RUT, dirección y teléfono del emisor. Se leen de la configuración de empresa o emisor que ya usa la factura comercial (verificar la fuente). No se hardcodean en la vista.

## 4. Índices

| Índice | Estado | Motivo |
|---|---|---|
| PK de la factura | EXISTENTE | El `UPDATE` condicional de Entrega Rápida va por PK; no requiere índice nuevo |
| Línea de factura por `invoice_id` | EXISTENTE (verificar) | Carga de líneas para Formato Bodega |
| Ubicaciones por (`product_id`, `warehouse_id`) | EXISTENTE (verificar) | `LEFT JOIN` de Formato Bodega. Si no existe, se recomienda crearlo, **pero queda fuera de este ticket** salvo aprobación (sería DDL) |
| `invoices(is_out)` | NO se crea | La acción de fila se evalúa por factura ya cargada; el filtro "no entregadas" del listado, si existe, ya usa el índice que tenga hoy |

## 5. Notas de migración

1. **Sin DDL.** No hay columnas ni tablas nuevas (REQ-07).
2. **No se reescriben datos migrados.** Las facturas legacy con `is_out = true` mantienen su `date_out`, `user_out_id` y `commentary_out`. Las que tienen `is_out = NULL` se tratan como no entregadas en la lectura (`COALESCE`), sin backfill.
3. **Legacy con `is_out = true` y `user_out_id` NULL** (posible en datos migrados): Visualizar debe tolerarlo (mostrar "sin registro"). Entrega Rápida no las vuelve a tocar.
4. **Seed de capability** (solo con la opción A de 3.9): migración de datos idempotente (`INSERT` si no existe) más la asignación a los roles de Bodega definidos por el negocio. Rollback: borrar la fila y sus asignaciones.
5. **Dependencias de orden:** requiere en el ambiente los cambios de 1/7 (columnas del receptor en la factura) y 2/7 (descuento de stock al emitir). Sin 2/7, Entrega Rápida dejaría facturas entregadas sin ningún descuento de stock.
6. **Lista simulada de T-09:** se elimina del código; no hay datos que migrar.

## 6. Fuera de alcance (sin impacto en el modelo)

- Entrega parcial: no hay cantidades entregadas por línea.
- Asignación de ubicaciones de picking: no se escribe en la tabla de ubicaciones.
- Reservas de stock: no se tocan stock ni reservas.
- Persistencia de bultos, dimensiones, peso y frágil.

## 7. Puntos a verificar antes de implementar

| # | Qué verificar | Dónde |
|---|---|---|
| 1 | Nombre físico de la tabla de facturas y de los campos de estado de emisión y SII | Esquema de Evolution |
| 2 | Si `is_out` admite NULL en datos migrados | Datos legacy |
| 3 | Nombres físicos de los campos de despacho que agrega 1/7 | Ticket 1/7 |
| 4 | Forma de la tabla de ubicaciones (puente directo o catálogo más asignación) y su índice | Doc de decisiones 4.6 y esquema |
| 5 | Columna de orden de las líneas (posición o `id`) | Esquema de líneas |
| 6 | Servicio exacto que usa `TransportistasView` para `transport_companies` | Frontend o servicio de transportistas |
| 7 | Fuente de los datos del remitente Jormat | Configuración de empresa o emisor |
| 8 | Decisión de capability: opción A o B (3.9) | Negocio |