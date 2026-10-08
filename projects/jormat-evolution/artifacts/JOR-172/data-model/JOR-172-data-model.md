# Modelo de datos: JOR-172 · Popup del cliente, Estado de cuenta y cheques

> Parte 4/7 de la épica "Facturas cliente: ajustes del feedback". Depende de 3/7 (JOR-171, proyección de saldo).
> Leyenda: **[NUEVO]** se crea en este ticket · **[EXISTENTE]** ya existe y se reusa sin cambios · **[EXISTENTE, MOD]** ya existe y cambia · **[VERIFICAR]** supuesto que hay que confirmar contra el código de `backend/jormat-api` antes de implementar.

---

## 1. Resumen

| # | Elemento | Tipo | Estado | REQ |
|---|----------|------|--------|-----|
| 1 | `cheques` | Tabla | **[NUEVO]** | REQ-03 |
| 2 | `cheque_facturas` | Tabla puente | **[NUEVO]** | REQ-03 |
| 3 | `statuses` (módulo 3) | Catálogo | **[EXISTENTE]** | REQ-03, REQ-05 |
| 4 | `clientes` / sucursales del cliente | Tablas | **[EXISTENTE]** | REQ-01, REQ-04 |
| 5 | Facturas de cliente | Tabla | **[EXISTENTE]** (solo índice nuevo) | REQ-01, REQ-04 |
| 6 | Notas de crédito | Tabla | **[EXISTENTE]** (solo índice nuevo) | REQ-02, REQ-04 |
| 7 | Proyección de saldo (3/7) | Vista o consulta reutilizable | **[EXISTENTE]** (la entrega JOR-171) | REQ-01, REQ-02, REQ-05 |
| 8 | `ClienteNotification` (DTO) | Contrato API | **[EXISTENTE, MOD]**: los contadores dejan de ser `null` | REQ-06 |
| 9 | `EstadoCuentaCliente` (DTO) | Contrato API | **[NUEVO]** | REQ-04 |
| 10 | Constantes de estado de cheque | Código | **[NUEVO]** | REQ-05 |

No se agregan columnas a facturas, notas ni clientes. El saldo **no se persiste**: siempre sale de la proyección de 3/7 (REQ-05).

---

## 2. Entidades nuevas

### 2.1 `cheques` **[NUEVO]** (T-11)

Registro mínimo de cheques recibidos de un cliente. Alcanza para el contador del popup. La gestión completa (depositar, validar, rechazar) queda fuera de alcance.

| Campo | Tipo | Oblig. | Default | FK / Enum | Nota |
|-------|------|--------|---------|-----------|------|
| `id` | `bigint` / `increments` | Sí | autoincremental | PK | Igual que las PK de las tablas vecinas **[VERIFICAR]** |
| `cliente_id` | mismo tipo que `clientes.id` | Sí | - | FK → `clientes.id`, `ON DELETE RESTRICT` | Cliente titular (no sucursal) |
| `numero` | `varchar(30)` | Sí | - | - | Número impreso en el cheque |
| `banco` | `varchar(100)` | Sí | - | - | Texto libre. Si ya existe un catálogo de bancos, usar `banco_id` FK **[VERIFICAR]** |
| `importe` | `numeric(14,2)` | Sí | - | `CHECK (importe > 0)` | Misma precisión que los totales de factura **[VERIFICAR]** |
| `fecha_emision` | `date` | Sí | - | - | |
| `fecha_cobro` | `date` | Sí | - | `CHECK (fecha_cobro >= fecha_emision)` | Vencimiento o fecha de cobro (cheque a fecha) |
| `status_id` | mismo tipo que `statuses.id` | Sí | `1` (Pendiente) | FK → `statuses`, restringido al módulo 3 (ver §5.2) | 1 Pendiente, 2 Validada, 3 Rechazada, 4 Depositado |
| `fecha_estado` | `timestamptz` | No | `null` | - | Fecha del último cambio de estado (p. ej. del protesto) |
| `observacion` | `varchar(500)` | No | `null` | - | Motivo de rechazo u otra nota |
| `created_at` | `timestamptz` | Sí | `now()` | - | Convención de auditoría del repo **[VERIFICAR]** |
| `updated_at` | `timestamptz` | Sí | `now()` | - | |
| `created_by` | FK usuario | No | `null` | FK → usuarios | Solo si las tablas vecinas lo usan **[VERIFICAR]** |

**Restricciones**
- `UNIQUE (cliente_id, banco, numero)`: evita registrar dos veces el mismo cheque.
- `CHECK (importe > 0)` y `CHECK (fecha_cobro >= fecha_emision)`.

**Índices**
- `ix_cheques_cliente_status (cliente_id, status_id)`: el contador del popup resuelve `COUNT(*) WHERE cliente_id = ? AND status_id = 3` usando solo el índice (DET-41).

### 2.2 `cheque_facturas` **[NUEVO]**

Vínculo N:M entre un cheque y las facturas que paga. Un cheque puede cubrir varias facturas y una factura puede pagarse con varios cheques.

| Campo | Tipo | Oblig. | Default | FK | Nota |
|-------|------|--------|---------|----|------|
| `cheque_id` | FK | Sí | - | → `cheques.id`, `ON DELETE CASCADE` | |
| `factura_id` | FK | Sí | - | → facturas de cliente `.id`, `ON DELETE RESTRICT` | Nombre real de la tabla **[VERIFICAR]** |
| `importe_aplicado` | `numeric(14,2)` | No | `null` | `CHECK (importe_aplicado IS NULL OR importe_aplicado > 0)` | Opcional. Hoy no participa en el saldo (ver §6) |
| `created_at` | `timestamptz` | Sí | `now()` | - | |

**Clave e índices**
- `PRIMARY KEY (cheque_id, factura_id)`.
- `ix_cheque_facturas_factura (factura_id)`: consulta inversa, de la factura a sus cheques (futura gestión de cheques).

**Integridad entre tablas (en el servicio, no en la DB):** la factura vinculada debe pertenecer al mismo `cliente_id` del cheque, sumando todas sus sucursales. Se valida en la capa de servicio porque un CHECK no puede cruzar tablas.

---

## 3. Entidades existentes que se reusan

### 3.1 `statuses`, módulo 3 **[EXISTENTE]**
Migrado en `backend/jormat-api/migrations/20260914000000_types_statuses_legacy.ts:37`. No se modifica.

| id | Nombre | Uso en este ticket |
|----|--------|--------------------|
| 1 | Pendiente | Default al registrar |
| 2 | Validada | No cuenta |
| 3 | Rechazada (protestado) | **Único estado que cuenta** en el popup (D1, opción B) |
| 4 | Depositado | No cuenta |

### 3.2 `clientes` y sucursales del cliente **[EXISTENTE]**
- La cabecera del Estado de cuenta usa los datos del cliente y el estado Activo/Bloqueado que ya calcula `getClienteNotification` (campo `bloqueo`). No hay un segundo cálculo de bloqueo.
- **Agregación por cliente**: los contadores suman todas las sucursales. Si la factura apunta a la sucursal (`sucursal_cliente_id`) y no al cliente, el COUNT hace JOIN a la sucursal y agrupa por `cliente_id` **[VERIFICAR qué FK usa la factura]**.

### 3.3 Facturas de cliente **[EXISTENTE]**
Sin columnas nuevas. Campos que se leen: `id`, `cliente_id` o sucursal, número/folio, origen, `fecha_emision`, `fecha_vencimiento`, `total`, estado del documento. El abono y el pendiente salen de la proyección (§3.5).

**Índice nuevo:**
- `ix_facturas_cliente_fecha (cliente_id, fecha_emision)`: filtro por rango y paginación del Estado de cuenta. Si la proyección de 3/7 ya trae un índice equivalente, no se duplica **[VERIFICAR]**.

### 3.4 Notas de crédito **[EXISTENTE]**
Sin columnas nuevas. "Saldo disponible" = total de la nota menos lo ya aplicado, según la proyección.
- Si 5/7 (aplicación de notas) todavía no está, el saldo disponible es el total de la nota, y el contador devuelve un número real (normalmente 0 si no hay notas), **nunca `null`** (REQ-02).

**Índice nuevo:**
- `ix_notas_credito_cliente_fecha (cliente_id, fecha_emision)`: mismo propósito que en facturas **[VERIFICAR nombre de tabla y columnas]**.

### 3.5 Proyección de saldo (JOR-171, 3/7) **[EXISTENTE, dependencia]**
Única fuente de `abono`, `pendiente` y estado comercial (`PENDIENTE_PAGO` / `VENCIDA` / `PAGADA`) por documento (REQ-05). Este ticket la **consume** y no la redefine:

- **Facturas con saldo**: `pendiente > 0`.
  - *Pendiente de pago*: `pendiente > 0 AND fecha_vencimiento >= CURRENT_DATE`.
  - *Vencida*: `pendiente > 0 AND fecha_vencimiento < CURRENT_DATE`.
- **No se usa** el criterio legacy `status != 2`.
- Requisito para DET-41: la proyección tiene que poder componerse en SQL (vista, CTE o query builder reutilizable) para hacer `COUNT ... GROUP BY` sin traer filas a memoria. Si 3/7 la entrega solo como función en memoria, es un **bloqueante** que hay que resolver en 3/7 y no duplicar aquí.

---

## 4. Contratos de lectura (DTO)

### 4.1 `ClienteNotification` **[EXISTENTE, MOD]** (`catalogos.service.ts:96`)

| Campo | Tipo antes | Tipo después | Cambio |
|-------|-----------|--------------|--------|
| `credito` | (sin cambios) | (sin cambios) | Ninguno |
| `bloqueo` | (sin cambios) | (sin cambios) | Ninguno |
| contador facturas pendientes de pago | `null` | `number` (≥ 0) | Calculado |
| contador facturas vencidas | `null` | `number` (≥ 0) | Calculado |
| contador notas | `null` | `number` (≥ 0) | Calculado |
| contador cheques | `null` | `number` (≥ 0) | Solo `status_id = 3` |

- Se respetan los **nombres actuales** de los campos de contadores; no se renombran ni se anidan (REQ-06). Antes de implementar hay que listar los nombres exactos y sus consumidores en el front **[VERIFICAR]**.
- Si el contrato hoy tiene un solo contador de facturas, la separación Pendiente/Vencida se **agrega** como campos nuevos sin quitar el existente (el existente pasa a ser la suma de ambos).

### 4.2 `EstadoCuentaCliente` **[NUEVO]** (T-12)

**Request** (`GET /clientes/:clienteId/estado-cuenta`)

| Parámetro | Tipo | Oblig. | Default |
|-----------|------|--------|---------|
| `fechaDesde` | `date` | No | sin límite |
| `fechaHasta` | `date` | No | hoy |
| `page` | `int ≥ 1` | No | 1 |
| `pageSize` | `int` 1..100 | No | 20 |

**Response**

```
{
  cliente: { id, rut, razonSocial, ...datos de cabecera, estado: 'ACTIVO' | 'BLOQUEADO' },
  items: EstadoCuentaItem[],
  totalPendiente: number,   // suma de TODO el rango filtrado, no solo de la página
  total: number, page: number, pageSize: number
}
```

**`EstadoCuentaItem`**

| Campo | Tipo | Origen |
|-------|------|--------|
| `tipoDocumento` | enum `FACTURA` \| `NOTA_CREDITO` | Constante |
| `documentoId` | id | Para el enlace al detalle |
| `numeroDocumento` | string | Factura o nota |
| `origen` | string | Columna origen del documento |
| `estado` | string | Estado comercial de la proyección |
| `fecha` | date | `fecha_emision` |
| `total` | numeric(14,2) | Documento |
| `abono` | numeric(14,2) | Proyección |
| `pendiente` | numeric(14,2) | Proyección. En notas es saldo disponible y **se resta** del total |

- Sin cheques (alcance T-12).
- La unión facturas + notas se hace con `UNION ALL` en SQL, con `ORDER BY fecha, numero` y `LIMIT/OFFSET` en servidor (DET-41).
- `totalPendiente` = suma de pendiente de facturas menos saldo disponible de notas. Tiene que coincidir con lo que muestra el popup y el listado (criterio 25). La convención de signo de las notas hay que confirmarla con el doc de decisiones §4.2 **[VERIFICAR]**.

---

## 5. Constantes y reglas de código

### 5.1 Constantes **[NUEVO]** (sin ids mágicos, REQ-05)

```
STATUS_MODULE_CHEQUES = 3
CHEQUE_STATUS = { PENDIENTE: 1, VALIDADA: 2, RECHAZADA: 3, DEPOSITADO: 4 }
DOCUMENTO_TIPO = { FACTURA: 'FACTURA', NOTA_CREDITO: 'NOTA_CREDITO' }
ESTADO_CUENTA_PAGE_SIZE_DEFAULT = 20
ESTADO_CUENTA_PAGE_SIZE_MAX = 100
```
Si el módulo de catálogos ya expone constantes de `statuses`, se extienden esas en vez de crear otras **[VERIFICAR]**.

### 5.2 Restricción del estado al módulo 3
`statuses` guarda estados de varios módulos, así que una FK simple a `statuses.id` no garantiza que el estado sea de cheques. Hay dos opciones; las decide el dev:

| Opción | Cómo | Pros | Contras |
|--------|------|------|---------|
| A. FK simple + validación en el servicio | `status_id` FK → `statuses.id`; el servicio valida que `module = 3` | Simple, sin columnas extra | La DB acepta un estado de otro módulo si alguien escribe directo |
| B. FK compuesta | Columna `status_module smallint NOT NULL DEFAULT 3 CHECK (status_module = 3)` + FK `(status_module, status_id)` → `statuses(module, id)` | Integridad garantizada por la DB | Requiere un `UNIQUE (module, id)` en `statuses` si no existe, y una columna redundante |

Recomendación: **A**. El registro es mínimo, solo escribe el servicio y la gestión completa vendrá en otro módulo. Se pasa a **B** si `statuses` ya tiene `UNIQUE (module, id)`.

---

## 6. Relaciones

```
clientes 1 ──< N sucursales_cliente            [EXISTENTE]
clientes 1 ──< N facturas (vía cliente/sucursal) [EXISTENTE]
clientes 1 ──< N notas_credito                 [EXISTENTE]
clientes 1 ──< N cheques                       [NUEVO]
statuses(mód.3) 1 ──< N cheques                [NUEVO FK]
cheques N >──< M facturas  (cheque_facturas)   [NUEVO]
facturas / notas ──> proyección de saldo (3/7) [lectura, sin FK]
```

- `cheque_facturas.importe_aplicado` **no afecta** el saldo de la factura en este ticket. Si en el futuro un cheque pasa a abonar facturas, el abono tiene que entrar por la proyección de 3/7 y no por un cálculo paralelo.

---

## 7. Notas de migración

1. **Archivo**: una migración nueva en `backend/jormat-api/migrations/`, con timestamp posterior a las de 3/7, p. ej. `20261008000000_cheques_registro.ts`.
2. **Orden en `up`**: crear `cheques` (FK a `clientes` y `statuses`) → crear `cheque_facturas` → crear índices `ix_cheques_cliente_status`, `ix_cheque_facturas_factura`, `ix_facturas_cliente_fecha` y `ix_notas_credito_cliente_fecha` (estos dos últimos solo si no existen).
3. **`down`**: borrar en orden inverso: índices sobre facturas y notas → `cheque_facturas` → `cheques`. No toca `statuses`.
4. **Precondición**: la migración de `statuses` (`20260914000000`) debe estar aplicada y tener las filas 1 a 4 del módulo 3. La migración nueva **no inserta** filas en el catálogo.
5. **Datos**: no hay backfill. No se migran cheques del legacy (fuera de alcance); el contador arranca en 0 con datos reales. Si más adelante se quiere traer el histórico de cheques protestados del legacy, va en un ticket aparte.
6. **Índices en tablas con datos**: si facturas y notas son grandes en producción, crear los índices con `CREATE INDEX CONCURRENTLY` (en una migración sin transacción) para no bloquear escrituras **[VERIFICAR volumen]**.
7. **Reversibilidad**: total. Las tablas nuevas no tienen consumidores fuera de este ticket, y el cambio en `ClienteNotification` es aditivo (de `null` a número).

---

## 8. Puntos abiertos [VERIFICAR] antes de implementar

| # | Pregunta | Impacto si se asume mal |
|---|----------|-------------------------|
| 1 | Nombres reales de las tablas de facturas y notas de crédito, y si la factura referencia al cliente o a la sucursal | JOIN y agregación por cliente incorrectos (criterio 12) |
| 2 | Forma en que 3/7 expone la proyección (vista/CTE vs función en memoria) | Si es en memoria, no se cumple DET-41: bloqueante en 3/7 |
| 3 | Nombres exactos de los campos de contadores en `ClienteNotification` y sus consumidores | Romper el front (REQ-06) |
| 4 | Signo de las notas en `totalPendiente` según el doc de decisiones §4.2 | El pendiente no coincide entre popup y Estado de cuenta (criterio 25) |
| 5 | Existencia de un catálogo de bancos | `banco` como texto vs FK |
| 6 | Si `statuses` tiene `UNIQUE (module, id)` | Elegir opción A o B de §5.2 |