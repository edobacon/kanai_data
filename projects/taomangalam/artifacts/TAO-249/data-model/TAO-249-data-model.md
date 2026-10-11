# Modelo de datos: TAO-249 (HU-06-01, HU-06-02)

> Leyenda: **[NUEVO]** se crea en este ticket · **[MODIFICADO]** existe y cambia · **[EXISTENTE]** existe y se conserva sin cambios (solo regresión).
> Baseline: esquema local `versionEsquemaLocal = 3` (`app_database.dart`). Destino: versión 4 (`esquema_v4.dart`).
> Las columnas marcadas "a confirmar" deben verificarse contra `esquema_v1.dart` al iniciar. Este documento no inventa nombres de columnas que no figuran en el request.

## 1. Alcance del cambio

| Capa | Objeto | Estado |
| --- | --- | --- |
| Drift (SQL explícito) | `plan_practica` | [MODIFICADO] |
| Drift | Triggers de coherencia `plan_practica` ↔ `tirada_revision` ↔ `paso` | [NUEVO] |
| Drift | 13 tablas restantes del dominio y locales | [EXISTENTE] |
| Drift | `registro_legal_pendiente` (desde v2) | [EXISTENTE], se conserva en la migración |
| Drift | `esquema_v4.dart` + migración 3 a 4 | [NUEVO] |
| Fixtures de prueba | Snapshots DDL congelados v2 y v3 | [NUEVO] |
| Fixtures de prueba | Snapshot DDL v1 (hoy inline) | [EXISTENTE], se puede mover a `fixtures` sin alterar su contenido |
| Dominio Dart | Unidad de trabajo transaccional | [NUEVO] |
| Dominio Dart | Repositorios por agregado (4) | [NUEVO] |
| Dominio Dart | Catálogo de errores tipados | [NUEVO] |
| Dominio Dart | Política de habilitación de tirada | [NUEVO] |
| Dominio Dart | Puerto de validación EP-11 (`ResultadoValidacionUnidad`) | [NUEVO] |
| Riverpod | Providers de consultas, recorrido y práctica | [NUEVO] |
| Riverpod | `appDatabaseProvider` | [EXISTENTE], solo se consume |

Fuera de alcance (no se tocan): supersede transaccional (HU-06-07), tablas de retroceso, intentos y RKL (HU-06-09 a 11), `nota`, `archivo_adjunto`, `recordatorio_local` (EP-08), `sync_outbox`, `sync_cursor`, `sync_failure` (EP-09), esquema Prisma del servidor.

## 2. Convenciones comunes (existentes, aplican a toda entidad mutable)

| Columna | Tipo SQLite | Obligatorio | Default / origen | Estado | Nota |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT(26) | Sí, PK | `GeneradorId` (ULID) | [EXISTENTE] | Validado en `migration_test.dart` |
| `espacio_id` | TEXT | Sí, FK → `espacio_datos.id` | Espacio local único | [EXISTENTE] | HU-06-02 lo rellena solo desde el repositorio |
| `created_at` | TEXT/INTEGER (según v1) | Sí | Reloj inyectado | [EXISTENTE] | |
| `updated_at` | idem | Sí | Reloj inyectado | [EXISTENTE] | El repositorio lo actualiza en cada escritura (nuevo comportamiento de capa, no de esquema) |
| `version` | INTEGER | Sí | `1` | [EXISTENTE] | El repositorio hace `version + 1` en cada update |
| `device_origin_id` | TEXT | Sí | `AppDatabase.deviceOriginId` | [EXISTENTE] | Reutiliza `actualizarDispositivoDeOrigen` |
| `deleted_at` | TEXT/INTEGER | No | `NULL` | [EXISTENTE] (verificar presencia en cada tabla mutable) | Borrado lógico: lecturas por defecto filtran `deleted_at IS NULL` |

Tablas append-only (por ejemplo `tirada_revision`): sin `update` ni `delete` genérico en `DaoAppendOnlyDrift`. `tirada_revision.estado` (`vigente` / `sustituida`) es marca de vigencia que solo cambia vía supersede (HU-06-07).

## 3. Entidades Drift

### 3.1 `plan_practica` [MODIFICADO]

| Columna | Tipo | Obligatorio | FK | Estado | Cambio |
| --- | --- | --- | --- | --- | --- |
| `id` | TEXT(26) | Sí, PK | | [EXISTENTE] | |
| `paso_id` | TEXT(26) | **Sí (NOT NULL)** | → `paso.id` | **[NUEVO]** | Hoy no existe; backfill desde `tirada_revision.paso_id` |
| `tirada_revision_id` | TEXT(26) | **No (nullable)** | → `tirada_revision.id` | **[MODIFICADO]** | Hoy `NOT NULL` en `esquema_v1.dart`; pasa a nullable |
| Columnas comunes (§2) | | | | [EXISTENTE] | Sin cambio |
| Resto de columnas del plan | según v1 | según v1 | según v1 | [EXISTENTE] | Se copian íntegras en la reconstrucción |

**Contrato del plan**

- `paso_id` siempre presente.
- `tirada_revision_id IS NULL` permitido solo si el paso es de tipo `inicio`, `retorno_casa_1` o `retoma` (pasos sin tirada).
- Si `tirada_revision_id IS NOT NULL`, entonces `tirada_revision.paso_id = plan_practica.paso_id`.
- No se fabrican dados ni revisiones para pasos sin tirada.

**Índices y unicidades**

| Objeto | Definición | Estado |
| --- | --- | --- |
| Índice por `paso_id` | `idx_plan_practica_paso (paso_id)` | [NUEVO], soporta el trigger y las lecturas por paso del repositorio de práctica |
| Unicidades e índices previos de `plan_practica` | los definidos en v1/v3 | [EXISTENTE], se recrean tras la reconstrucción |
| Nota de nulabilidad | Si existe una unicidad sobre `tirada_revision_id`, SQLite admite varios `NULL`; no restringe planes sin tirada | Revisar: si el dominio exige un solo plan sin tirada por paso, definirlo en HU-06-05, no aquí |

### 3.2 Triggers de coherencia [NUEVO]

SQLite no permite `CHECK` entre tablas; la coherencia se impone con triggers. El repositorio de práctica valida lo mismo antes (segunda barrera, error `validacion`).

| Trigger | Evento | Regla | Error |
| --- | --- | --- | --- |
| `trg_plan_practica_coherencia_ins` | BEFORE INSERT ON `plan_practica` | (a) Si `NEW.tirada_revision_id IS NULL` y el tipo del paso `NEW.paso_id` no está en (`inicio`, `retorno_casa_1`, `retoma`), abortar. (b) Si `NEW.tirada_revision_id IS NOT NULL` y `tirada_revision.paso_id <> NEW.paso_id`, abortar. | `RAISE(ABORT, 'plan_practica_coherencia')` |
| `trg_plan_practica_coherencia_upd` | BEFORE UPDATE OF `paso_id`, `tirada_revision_id` ON `plan_practica` | Mismas reglas (a) y (b) sobre `NEW` | idem |

Columna de tipo de paso usada por la regla (a): la columna enum existente de `paso` que distingue `inicio`, `retorno_casa_1` y `retoma` (**nombre a confirmar** contra `esquema_v1.dart`). El texto del `RAISE` es un código estable sin datos de la persona; la capa de repositorios lo traduce a `validacion`.

### 3.3 `tirada_revision` [EXISTENTE]

Sin cambios de esquema. Relevante para este ticket:

| Columna | Rol |
| --- | --- |
| `paso_id` (FK → `paso.id`) | Fuente del backfill de `plan_practica.paso_id` y referencia de la regla (b) |
| `d12`, `d8`, `d4` | Checks 1 a 12, 1 a 8, 1 a 4 (`checks_test.dart`) |
| `resultado`, `anillo_destino` | Check anillo según resultado |
| `estado` (`vigente` / `sustituida`) | Única `vigente` por `paso_id` (índice parcial existente) |

### 3.4 `paso` [EXISTENTE]

Sin cambios. Unicidad `consulta_id + numero_paso` existente. Su columna de tipo alimenta la regla (a) del trigger.

### 3.5 `consulta` [EXISTENTE]

Sin cambios de esquema. Sus enums `estado` y `fase` (de `esquema_v1.dart`) son la entrada de la política de tirada (§4.4):

| Enum | Valores |
| --- | --- |
| `estado` | `borrador`, `activa`, `completada`, `descartada` |
| `fase` | `preparacion`, `acciones_en_curso`, `esperando_material`, `esperando_conexion`, `lectura_pendiente`, `lista_para_tirada`, `cierre_en_curso`, `bloqueada_conflicto`, `completada` |

Índice de Inicio `espacio_id + estado + updated_at` [EXISTENTE].

### 3.6 `espacio_datos` [EXISTENTE]

Único registro local con `estado = local` y `cuenta_id` nulo en instalación nueva; si hay cuenta vinculada, la migración conserva `cuenta_id`.

### 3.7 `registro_legal_pendiente` [EXISTENTE desde v2]

Sin cambios. La migración 3 a 4 no la toca y la prueba verifica que sus filas persisten.

### 3.8 Resto de tablas del dominio [EXISTENTE]

Consultante, cumplimientos (unicidad `ciclo_id + local_date`), ciclos, recorrido y demás de las 14 tablas: sin cambios. Cubiertas por `schema_v1_test.dart`, `checks_test.dart` y `migration_test.dart`, que pasan a correr contra v4.

## 4. Objetos de dominio (capa `app/lib/data/`) [NUEVO]

Ninguno agrega tablas. Son contratos Dart inmutables.

### 4.1 Unidad de trabajo

| Elemento | Tipo | Nota |
| --- | --- | --- |
| `UnidadDeTrabajo` | clase | Envuelve `AppDatabase.transaction`; un comando escribe todo o nada |
| `ContextoTransaccional` | objeto pasado a repositorios, generadores y efectos | Nadie hace commit interno; una excepción revierte todo |
| Notificación de streams | `notifyUpdates` dentro de la transacción | Drift la difiere hasta el commit: los streams solo ven estado confirmado |
| Dependencias inyectables | `Reloj`, `Zona`, `GeneradorId` (ULID), `PuertoValidacionUnidad` | Sustituibles en pruebas |

### 4.2 Repositorios por agregado

| Repositorio | Tablas principales | Lecturas | Particularidad |
| --- | --- | --- | --- |
| `RepositorioConsultante` | consultante | por id, stream por espacio, `listarBorrados` | |
| `RepositorioConsulta` | consulta, paso | por id, stream por id, lista de Inicio, `listarBorrados` | Expone la política de tirada (§4.4) |
| `RepositorioRecorrido` | ciclo, cumplimiento y tablas de recorrido | streams por consulta | |
| `RepositorioPractica` | plan_practica | por paso, stream por consulta | Valida coherencia paso-revisión antes del trigger |

Reglas comunes: rellenan `updated_at`, `version + 1`, `device_origin_id`, `espacio_id`; filtran `deleted_at IS NULL` por defecto; devuelven entidades o DTO inmutables, nunca `QueryRow` ni SQL; traducen toda excepción de Drift/SQLite a `ErrorDominio`.

### 4.3 Catálogo de errores tipados `ErrorDominio`

| Código estable | Dueño de la regla | Uso |
| --- | --- | --- |
| `transicion_invalida` | HU-06-02 | Combinación estado/fase no permitida |
| `entidad_inexistente` | HU-06-02 | Id no encontrado o borrado |
| `validacion` | HU-06-02 | Incluye coherencia paso-revisión y trigger `plan_practica_coherencia` |
| `persistencia` | HU-06-02 | Fallo SQLite no clasificable |
| `reparacion_pendiente` | HU-06-14 | Solo se declara aquí |
| `plan_incompleto` | HU-06-05 | Lo emite la política de tirada con `planCompleto = false` |
| `consulta_completada` | HU-06-15 | Solo se declara aquí |
| `cierre_en_curso` | HU-06-12 | Lo emite la política de tirada |
| `etapa_ya_resuelta` | HU-06-09 | Solo se declara aquí |
| `conflicto_idempotencia` | HU-06-04 | Solo se declara aquí |

Mensajes sin contenido de la persona; el código es el identificador para Sentry (HU-15-02).

### 4.4 Política de habilitación de tirada

Entrada: `consulta.estado`, `consulta.fase`, `planCompleto: bool` (calculado por HU-06-05). No lee el plan.

| estado | fase | planCompleto | Resultado |
| --- | --- | --- | --- |
| `activa` | `lista_para_tirada` | `true` | Habilitada |
| `activa` | `lista_para_tirada` | `false` | `plan_incompleto` |
| `activa` | `cierre_en_curso` | cualquiera | `cierre_en_curso` |
| `borrador`, `completada`, `descartada` | cualquiera | cualquiera | `transicion_invalida` (nunca `consulta_completada`) |
| `activa` | cualquier otra fase | cualquiera | `transicion_invalida` |

### 4.5 Puerto de validación EP-11

| Elemento | Forma |
| --- | --- |
| `ResultadoValidacionUnidad` | `{ unidad: {id, ...}, evento: {id, ...} }` inmutable |
| Clave de deduplicación | `unidad.id + evento.id` |
| `PuertoValidacionUnidad` | interfaz inyectable; implementación de prueba con resultados prefijados |

Sin persistencia propia en este ticket.

## 5. Providers Riverpod [NUEVO]

| Ubicación | Providers |
| --- | --- |
| `app/lib/features/consultas/application/` | repositorio y streams de consultante y consulta |
| `app/lib/features/recorrido/application/` | repositorio y streams de recorrido |
| `app/lib/features/practica/application/` | repositorio y streams de práctica |
| `app/lib/features/cuenta/data/alta_dispositivo_providers.dart` | `appDatabaseProvider` [EXISTENTE], única conexión a `tao_mangalam.db`; se consume, no se mueve ni duplica |

Las vistas consumen `AsyncValue`; `presentation/` no importa Drift (regla custom_lint nueva, §7).

## 6. Relaciones

```
espacio_datos 1 ─── N consultante / consulta / ... (espacio_id)
consulta      1 ─── N paso              (consulta_id, único numero_paso)
paso          1 ─── N tirada_revision   (paso_id, una sola 'vigente')
paso          1 ─── N plan_practica     (paso_id)            [NUEVO]
tirada_revision 0..1 ─── N plan_practica (tirada_revision_id) [MODIFICADO: ahora opcional]
Invariante: plan.tirada_revision.paso_id = plan.paso_id      [NUEVO, trigger + repositorio]
```

## 7. Notas de migración (3 a 4)

1. **Preparación**: `PRAGMA foreign_keys = OFF` fuera de la transacción (requisito SQLite para reconstruir tablas), luego `BEGIN`.
2. **Precondición**: verificar que todo `plan_practica.tirada_revision_id` existente resuelve a una `tirada_revision`. Si hay huérfanos, abortar y registrar `{origen: 3, destino: 4, error}` sin datos de la persona.
3. **Reconstrucción**: `CREATE TABLE plan_practica_v4` con `paso_id NOT NULL` y `tirada_revision_id` nullable; `INSERT ... SELECT p.*, r.paso_id FROM plan_practica p JOIN tirada_revision r ON r.id = p.tirada_revision_id`; `DROP TABLE plan_practica`; `ALTER TABLE plan_practica_v4 RENAME TO plan_practica`.
4. **Recrear** índices y unicidades previos más `idx_plan_practica_paso`, y los dos triggers de coherencia.
5. **Verificación**: `PRAGMA foreign_key_check` vacío, conteo de filas igual antes y después, `COMMIT`, `PRAGMA foreign_keys = ON`, `user_version = 4`.
6. **Conservación**: IDs, `version`, `created_at`, `updated_at`, `device_origin_id`, identidad del dispositivo, `cuenta_id` vinculada, `registro_legal_pendiente` y datos del recorrido no se reescriben.
7. **`onCreate`** ejecuta `esquema_v4.dart` y debe producir el mismo esquema que v1 a v4 por upgrade (comparación de `sqlite_master` en `migration_test.dart`).
8. **Snapshots**: `app/test/drift/fixtures/` con DDL v1 (existente, sin modificar su contenido), v2 y v3 congelados como constantes, más datos semilla por versión. La prueba migra cada snapshot hasta v4 sobre base efímera.
9. **Rollback**: no se revierte de forma destructiva; cualquier corrección va como v5 hacia adelante con la misma prueba de migración. HU-06-02 no tiene migración (revert por commit).
10. **Sin generador de código Drift**: el esquema sigue siendo SQL explícito versionado.

## 8. Puntos a confirmar al iniciar

- Nombre exacto de la columna de tipo de `paso` usada en la regla (a) del trigger.
- Presencia de `deleted_at` en todas las tablas mutables que exponen los repositorios.
- Unicidades actuales de `plan_practica` en v3 (para recrearlas idénticas) y si alguna debe ajustarse por la nulabilidad de `tirada_revision_id`.
- SHA de `main` vigente (baseline publicado `debeb05f`).