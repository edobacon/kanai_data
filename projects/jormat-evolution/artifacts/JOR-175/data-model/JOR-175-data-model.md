# Modelo de datos · JOR-175 · Envío SII simulado, Reenviar y acciones por estado

> Alcance: facturas cliente del módulo `sales` de `jormat-api`. El SII sigue como maqueta (R-21). No se modela CAF, firma, XML, credenciales ni consulta de estado real.
>
> Nota de verificación: no se encontró una copia local de `backend/jormat-api` en esta máquina, así que no se pudo leer el código. Los nombres de los campos existentes vienen del ticket y de los tickets 1/7, 5/7 y 6/7. Quien implemente debe confirmarlos contra el esquema real. Lo que no se pudo verificar queda marcado como **[confirmar]**.

## Leyenda

| Marca | Significado |
|---|---|
| **EXISTENTE** | Ya está en el modelo (o lo deja 1/7, 5/7 o 6/7). No cambia. |
| **EXISTENTE · cambia uso** | El campo existe, pero cambia quién lo escribe o cómo se deriva. |
| **NUEVO** | Entidad, campo o índice que agrega este ticket. |

---

## 1. Entidades afectadas

| Entidad | Estado | Rol en JOR-175 |
|---|---|---|
| `DocumentoVenta` (factura cliente) | EXISTENTE · cambia uso | Documento emitido. Recibe un resumen del último envío simulado. |
| `SiiEnvioIntento` | **NUEVO** | Historial de intentos simulados (envío al facturar y cada Reenviar). |
| `EstadoSiiDemo` (enum de `documento.dto.ts:20`) | EXISTENTE | Se reutiliza tal cual para el resultado del intento (REQ-07). |
| `Capability` / `RoleCapability` (seed `05_sales_capabilities.ts`) | EXISTENTE | Sin cambios (REQ-08). |
| Entrega Rápida / Formato Bodega (6/7) | EXISTENTE | Sin cambios de esquema. Solo se exige que **no** lean nada de SII (REQ-03). |
| Nota de crédito / anulación (5/7) | EXISTENTE | Sin cambios de esquema. Se usa su marca de anulado para filtrar acciones. |

---

## 2. `DocumentoVenta` (factura cliente)

### 2.1 Campos

| Campo | Tipo | Oblig. | Default | FK / Enum | Estado | Nota |
|---|---|---|---|---|---|---|
| `id` | uuid / int **[confirmar]** | sí | autogenerado | PK | EXISTENTE | |
| `tipo` | enum | sí | | `TipoDocumento` | EXISTENTE | Filtra a factura cliente. |
| `estado` (comercial) | enum | sí | `BORRADOR` | `EstadoDocumento` | EXISTENTE | `BORRADOR`, `EMITIDA`, ... Reenviar **no** lo modifica. |
| `folio` | int | no (null en Borrador) | null | | EXISTENTE · cambia uso | 1/7 lo persiste al emitir. Se muestra con el rótulo "simulado". Reenviar no lo modifica. |
| `fechaEmision` | timestamptz | no | null | | EXISTENTE (1/7) | |
| `estadoSii` | enum | no | null | `EstadoSiiDemo` | EXISTENTE · cambia uso | Ya no se fuerza a mano en la emisión. Pasa a ser un **resumen derivado** del último `SiiEnvioIntento`. |
| `anulada` / referencia a la NC | bool / FK | | false / null | | EXISTENTE (5/7) | Condición de la acción Anular. |
| `entregada` / estado de entrega | bool / enum | | false | | EXISTENTE (6/7) | Condición de Entrega Rápida. |
| `siiUltimoEnvioAt` | timestamptz | no | null | | **NUEVO** | Fecha del último intento. Desnormalizado para el listado. |
| `siiIntentosCount` | int | sí | 0 | | **NUEVO** | Cantidad de intentos. Se muestra en el detalle y evita un `COUNT` por fila. |

> Alternativa sin desnormalizar: derivar `estadoSii` y `siiUltimoEnvioAt` desde el último intento con una subconsulta o `LATERAL`. Con esto el modelo queda más limpio, pero el listado se vuelve más caro. Se recomienda desnormalizar y escribir el resumen **en la misma transacción** que inserta el intento (ver §5).

### 2.2 Invariantes

- `folio`, montos, líneas y `estado` comercial son **inmutables** tras la emisión. Reenviar solo inserta un `SiiEnvioIntento` y actualiza `estadoSii`, `siiUltimoEnvioAt` y `siiIntentosCount`.
- `estadoSii IS NULL` si y solo si `estado = BORRADOR`.
- Ninguna lógica de Bodega lee `estadoSii`, `siiUltimoEnvioAt` ni `SiiEnvioIntento` (P-15.1.D1).

---

## 3. `SiiEnvioIntento` (**NUEVO**)

Registra cada intento simulado de envío al SII. Es append-only: un intento nunca se edita ni se borra.

### 3.1 Campos

| Campo | Tipo | Oblig. | Default | FK / Enum | Nota |
|---|---|---|---|---|---|
| `id` | uuid / int **[confirmar, seguir la convención del repo]** | sí | autogenerado | PK | |
| `documentoId` | igual al tipo de `DocumentoVenta.id` | sí | | FK a `DocumentoVenta.id`, `ON DELETE RESTRICT` | Un documento emitido no se borra. |
| `numeroIntento` | int | sí | | | Correlativo por documento (1 = envío al facturar, 2 en adelante = Reenviar). |
| `origen` | enum `SiiEnvioOrigen` | sí | | **NUEVO enum** `EMISION`, `REENVIO` | Distingue el envío automático del manual. Es un enum de origen, no un estado SII (REQ-07 no se infringe). |
| `resultado` | enum | sí | | `EstadoSiiDemo` (EXISTENTE, `documento.dto.ts:20`) | Aceptado, aceptado con reparos o rechazado. |
| `simulado` | bool | sí | `true` | | Siempre `true` en este alcance. Permite distinguir envíos reales a futuro sin migrar datos. |
| `detalle` | text | no | null | | Mensaje demo (p. ej. glosa de reparo o rechazo). |
| `enviadoAt` | timestamptz | sí | `now()` | | Fecha del intento (requerida por T-14). |
| `usuarioId` | FK usuario | sí | | FK a `Usuario.id` **[confirmar nombre]** | Quién facturó o reenvió. |

> Sobre `origen`: si el equipo prefiere no agregar ningún enum, se puede derivar de `numeroIntento = 1`. Se recomienda el enum porque la intención queda explícita y no depende del orden de inserción.

### 3.2 Índices y restricciones

| Índice | Tipo | Estado | Propósito |
|---|---|---|---|
| `pk_sii_envio_intento (id)` | PK | NUEVO | |
| `uq_sii_envio_intento_doc_num (documentoId, numeroIntento)` | UNIQUE | NUEVO | Evita correlativos duplicados ante dos Reenviar concurrentes. |
| `ix_sii_envio_intento_doc_fecha (documentoId, enviadoAt DESC)` | B-tree | NUEVO | Historial en el detalle y obtención del último intento. |
| `ck_sii_envio_intento_num (numeroIntento >= 1)` | CHECK | NUEVO | |

### 3.3 Relaciones

```
DocumentoVenta 1 ──── 0..N SiiEnvioIntento
Usuario        1 ──── 0..N SiiEnvioIntento
```

---

## 4. Enums

| Enum | Estado | Valores | Uso |
|---|---|---|---|
| `EstadoSiiDemo` (`documento.dto.ts:20`) | EXISTENTE | aceptado, aceptado con reparos, rechazado **[confirmar literales]** | `DocumentoVenta.estadoSii` y `SiiEnvioIntento.resultado`. No se crea un enum de estado nuevo. |
| `EstadoDocumento` | EXISTENTE | `BORRADOR`, `EMITIDA`, ... | Filtro de acciones. |
| `SiiEnvioOrigen` | **NUEVO** | `EMISION`, `REENVIO` | Solo en `SiiEnvioIntento`. |

> Si `EstadoSiiDemo` hoy es solo un tipo del DTO (y no un enum de base de datos), en la tabla se persiste como `varchar` con un `CHECK` sobre los mismos literales. El DTO sigue siendo la fuente.

---

## 5. Operaciones que escriben (transaccionalidad)

| Operación | Escrituras | Transacción |
|---|---|---|
| `issueFactura` (extendido, REQ-01) | 1) `DocumentoVenta`: `estado = EMITIDA`, `folio`, `fechaEmision`. 2) `INSERT SiiEnvioIntento` (`numeroIntento = 1`, `origen = EMISION`, `resultado` demo). 3) `DocumentoVenta`: `estadoSii`, `siiUltimoEnvioAt`, `siiIntentosCount = 1`. | Una sola. Si falla el envío simulado, se revierte la emisión. La firma pública de `issueFactura` no cambia (REQ-07); el envío va en un helper privado reutilizado por Reenviar. |
| `resendSii` (**NUEVO**, REQ-02) | 1) Validar `estado = EMITIDA` y permiso `sales.invoices:issue`. 2) `INSERT SiiEnvioIntento` (`numeroIntento = siiIntentosCount + 1`, `origen = REENVIO`). 3) Actualizar solo el resumen SII. | Una sola, con lock de fila sobre `DocumentoVenta` (`SELECT ... FOR UPDATE`) o reintento ante una violación de `uq_sii_envio_intento_doc_num`. |

---

## 6. Matriz de acciones por estado (derivada, sin persistir)

No se agrega columna. Se calcula en el servicio y se valida en cada endpoint (REQ-05). La UI usa el mismo cálculo, expuesto como `accionesPermitidas` en el DTO del listado.

| Acción | Condición de datos | Capability (existente) |
|---|---|---|
| Visualizar | siempre | lectura actual de facturas **[confirmar]** |
| Clonar | siempre | `sales.invoices:edit` |
| Editar | `estado = BORRADOR` | `sales.invoices:edit` |
| Anular (NC) | `estado = EMITIDA` y `anulada = false` | `sales.documents:void` |
| Reenviar SII | `estado = EMITIDA` (sin importar `estadoSii`) | `sales.invoices:issue` |
| Entrega Rápida | `estado = EMITIDA` y no entregada | la definida en 6/7 |
| Formato Bodega | `estado = EMITIDA` | la definida en 6/7 |

Sin cambios en `05_sales_capabilities.ts` ni en los roles demo (REQ-08).

---

## 7. DTOs afectados (contrato API, sin esquema de BD)

| DTO | Estado | Cambio |
|---|---|---|
| Item del listado de facturas cliente | EXISTENTE · se amplía | `folio`, `estadoSii`, `siiUltimoEnvioAt`, `simulado: true`, `accionesPermitidas: string[]`. |
| Detalle de factura cliente | EXISTENTE · se amplía | Lo anterior más `intentosSii: SiiEnvioIntentoDto[]`. |
| `SiiEnvioIntentoDto` | **NUEVO** | `numeroIntento`, `origen`, `resultado`, `enviadoAt`, `usuario`, `detalle`, `simulado`. |
| Respuesta de Facturar | EXISTENTE · se amplía | Incluye el intento creado, para mostrar "Documento enviado al SII (simulado)". |
| Input de emisión (forzar estado SII) | EXISTENTE · cambia uso | Si hoy acepta un estado SII forzable, queda solo como **semilla demo** opcional del resultado simulado, no como escritura directa de `estadoSii` **[confirmar con el código]**. |

---

## 8. Notas de migración

1. **Crear la tabla** `sii_envio_intento` con su FK, el UNIQUE, el índice y el CHECK (§3).
2. **Alterar** `documento_venta`: agregar `sii_ultimo_envio_at timestamptz NULL` y `sii_intentos_count int NOT NULL DEFAULT 0`. No bloquea la tabla en volúmenes demo.
3. **Backfill** de las facturas ya emitidas (por 1/7) que tengan `estadoSii` no nulo: insertar un intento `numeroIntento = 1`, `origen = EMISION`, `resultado = estadoSii`, `enviadoAt = fechaEmision`, `usuarioId` = emisor si existe (si no, el usuario sistema **[confirmar]**), y luego actualizar `sii_intentos_count = 1` y `sii_ultimo_envio_at = fechaEmision`. Así el invariante `siiIntentosCount = COUNT(intentos)` se cumple desde el inicio.
4. **Seeds demo**: si el seed crea facturas emitidas, debe crear también su intento inicial para respetar el invariante. No se tocan capabilities ni roles.
5. **Rollback**: borrar la tabla y las dos columnas. `estadoSii` se conserva, así que el estado anterior queda intacto. Es reversible sin pérdida para el flujo previo.
6. **Dependencias**: requiere 1/7 (folio y emisión persistidos). Usa las marcas de 5/7 (anulada) y 6/7 (entregada) solo para leer. Si 5/7 o 6/7 no están mergeados, Anular, Entrega Rápida y Formato Bodega quedan ocultas en la matriz hasta que lo estén.

---

## 9. Fuera del modelo (explícito)

- CAF, rangos de folios autorizados, firma electrónica, XML DTE, track id, consulta de estado al SII y credenciales.
- Un componente de banner nuevo (se reutiliza `SimulacionSiiBanner`).
- Un segundo flujo de emisión o un cambio de firma de `issueFactura` para los consumidores de compras.