# Modelo de datos — TAO-159 (HU-00-07)

## 1. Resumen

**No hay entidades nuevas del dominio de aplicación.** El cambio introduce una nueva *frontera de persistencia*: `pg-boss` opera en su propio schema `pgboss`, aislado del schema de aplicación y creado/migrado por el rol dedicado `taomangalam_queue`. El modelo de datos propio del producto no se modifica (AC-1).

Lo "modelable" en este ticket no es un esquema de negocio, sino la **propiedad, los privilegios y el aislamiento** de un schema gestionado por una librería.

## 2. Alcance del modelo

- Objetos de aplicación (tablas, columnas, índices, relaciones): **sin cambios**.
- Objetos gestionados por `pg-boss`: **fuera de nuestro contrato**; su forma la define la versión de la librería, no este diseño.
- Configuración de conexión y presupuesto: **operacional**, no genera estructuras de datos.

## 3. Inventario de objetos afectados

| Objeto | Estado | Propietario | ¿Contrato nuestro? | Notas |
|---|---|---|---|---|
| schema `pgboss` | **NUEVO** | pg-boss (vía rol `taomangalam_queue`) | No | Creado/migrado por la librería al inicializar (REQ-01) |
| `pgboss.version` | **NUEVO** (librería) | pg-boss | No | Control de versión de schema de la librería |
| `pgboss.queue` | **NUEVO** (librería) | pg-boss | No | Definición de colas y política de reintentos |
| `pgboss.job` | **NUEVO** (librería) | pg-boss | No | Estado de trabajos (pending/active/completed/failed/retry) |
| `pgboss.schedule` | **NUEVO** (librería) | pg-boss | No | Trabajos programados (no usados en este ticket) |
| `pgboss.subscription` | **NUEVO** (librería) | pg-boss | No | Suscripciones de consumidores |
| `pgboss.archive` | **NUEVO** (librería) | pg-boss | No | Retención/archivado tras completar |
| `pgboss.bam` | **NUEVO** (librería, según versión) | pg-boss | No | Mantenimiento en background (verificar contra versión instalada) |
| schema de aplicación (`public` u otro) | **EXISTENTE** | app | Sí | Sin cambios; AC-1 |
| rol `taomangalam_queue` | **NUEVO** | cluster/DB | Sí | Privilegios acotados a `pgboss` (REQ-08) |
| config `PGBOSS_DATABASE_URL` | **NUEVO** (configuración) | app | Sí | Validada con zod (REQ-01) |

## 4. Campos de objetos de la librería (referencia operativa, **no contrato**)

Solo a título orientativo para inspección y diagnóstico. No se definen ni migran a mano:

- `pgboss.job`: `id`, `name`, `data` (jsonb), `state`, `retryLimit`, `retryCount`, `retryDelay`, `retryBackoff`, `singletonKey`, `singletonOn`, `startAfter`, `startedOn`, `createdOn`, `completedOn`, `keepUntil`, `output`, `deadLetter`.
- `pgboss.queue`: `name`, `policy`, `retryLimit`, `retryDelay`, `retryBackoff`, `expireIn`, `retentionSeconds`, `createdOn`, `updatedOn`.
- `pgboss.schedule`: `name`, `cron`, `timezone`, `data`, `options`, `createdOn`, `updatedOn`.
- `pgboss.archive`: mismo shape que `job`.

> La lista exacta depende de la **versión de `pg-boss`** fijada al instalar. Confirmarla en el hito antes de documentar SQL de inspección (REQ-09).

## 5. Claves e índices

- **No definimos índices propios.**
- `pg-boss` crea sus índices en `pgboss.*`, incluida la **unicidad de `singletonKey`**, base de la deduplicación por clave (REQ-05 / AC-5).
- **FK / relaciones propias:** ninguna. Las relaciones internas (`job` ↔ `queue`, particionado por cola si aplica) son de la librería.

## 6. Idempotencia por clave (nota de modelo)

- La idempotencia "por clave" se apoya en `singletonKey` y su índice único: deduplica mientras el trabajo está en estado pendiente / activo / reintentando.
- **Limitación a documentar:** `singletonKey` no garantiza deduplicación *después* de completado; una nueva inserción con la misma clave puede volver a entrar. Para un **efecto duradero** único (AC-5), el handler debe ser idempotente por su cuenta (clave persistida propia o efecto upsert). En este ticket el job de ejemplo **no tiene efecto de negocio**: su garantía observable es el log/estado, no un cambio en el schema de aplicación.
- **Estado:** advertencia de diseño, no un objeto a migrar.

## 7. Privilegios y seguridad (capa de datos — REQ-08)

Rol **NUEVO** `taomangalam_queue`:

| Privilegio | Objeto | Resultado |
|---|---|---|
| `USAGE`, `CREATE` | schema `pgboss` | permite a `pg-boss` crear/migrar su schema |
| `SELECT/INSERT/UPDATE/DELETE` | `pgboss.*` | operación normal de la cola |
| `SELECT` sobre tablas de aplicación | schema de aplicación | **denegado → `permission denied`** (AC-8) |

- El schema de aplicación **no otorga grants** a este rol.
- Definir si el schema `pgboss` lo **crea `pg-boss` en runtime** o lo **provisiona la migración**; de ello depende si el rol necesita `CREATE` sobre la base/schema.

## 8. Presupuesto de conexiones (operacional, no schema)

- Fórmula: `(8 Prisma + 5 pg-boss + 5 reserva) × réplicas ≤ 70% × max_connections`.
- Guard evaluado **al arrancar**, `fail-closed`: si se excede, el proceso termina con código ≠ 0 y mensaje que cita el presupuesto (REQ-03, AC-7).
- Con `max_connections=20` y 1 réplica: `18 ≤ 14` → falso → arranque falla.
- **No genera estructuras de datos ni columnas.** Es validación de configuración de arranque.

## 9. Ciclo de vida y migración

- El schema `pgboss` **no se versiona en nuestras migraciones de aplicación**: es de la librería y se auto-migra al inicializar (idempotente).
- **Orden de arranque (REQ-04):** validar config (zod) → validar presupuesto → inicializar `pg-boss` (crea/migra schema) → iniciar consumidores. El entrypoint `worker` recorre el mismo camino **sin abrir puerto HTTP**.
- **Rollback:** revertir la integración de `pg-boss`, y remover el schema `pgboss` y el rol `taomangalam_queue`. **No hay datos de aplicación que revertir**; conservar los logs de prueba del job de ejemplo.
- **Cierre:** ante SIGTERM, `pg-boss` deja de tomar nuevos trabajos y termina los activos (REQ-07); no deja estado inconsistente en `pgboss.job`.

## 10. Nuevo vs existente (resumen)

| Categoría | Detalle |
|---|---|
| **NUEVO** | schema `pgboss` + sus tablas (librería), rol `taomangalam_queue`, config `PGBOSS_DATABASE_URL`, guard de presupuesto, entrypoint `worker` |
| **EXISTENTE sin cambios** | schema de aplicación y todas sus tablas/columnas/índices/relaciones, shutdown existente (solo se integra) |

## 11. Inspección de la cola (vínculo REQ-09)

`docs/development/local-services.md` documenta pasos copiables contra `pgboss.*`: por ejemplo consultar `pgboss.job` filtrando por `state` y `retryCount`, y `pgboss.archive` para trabajos retenidos. Las consultas exactas se cierran al fijar la versión de `pg-boss`.

## 12. Preguntas y riesgos abiertos

1. **Versión de `pg-boss`**: determina el set exacto de tablas (¿`bam`?, ¿particionado de `job`?) y el SQL de inspección.
2. **Provisión del schema**: ¿lo crea `pg-boss` en runtime o lo crea la migración? Condiciona los grants del rol.
3. **Alcance de `singletonKey` vs AC-5**: si "un solo efecto observable" exige deduplicación post-completado, el handler debe aportar idempotencia propia (o definir retención del `singletonOn`).