---
id: TAO-249-SPEC
project: taomangalam
ticket: TAO-249
status: approved
---

# TAO-249 · Base Drift v4 con plan sin tirada y capa de repositorios transaccional y reactiva (HU-06-01, HU-06-02)

## Resumen ejecutivo

Qué se hace: (1) HU-06-01 lleva la base local de la versión 3 a la 4. Se agrega `plan_practica.paso_id` como columna obligatoria y `tirada_revision_id` pasa a nullable solo para los pasos `inicio`, `retorno_casa_1` y `retoma`. Hay triggers de coherencia paso-revisión, migración 3 a 4 con backfill de `paso_id`, snapshots congelados v2 y v3, y `onCreate` produce el mismo esquema que el upgrade. (2) HU-06-02 agrega repositorios por agregado sobre `DaoMutables` y `DaoAppendOnly`, una unidad de trabajo transaccional, streams que solo emiten estado confirmado, providers Riverpod, el catálogo único de errores tipados, el puerto de validación de EP-11, la política de habilitación de tirada y una regla de CI que impide importar Drift desde `presentation/`. Qué NO se hace: supersede (HU-06-07), retroceso, intentos y RKL (HU-06-09 a 11), nota, adjunto y recordatorio (EP-08), tablas de sync (EP-09), Prisma, reglas del método (HU-06-03 a 07) ni la reimplementación de lo que ya cubren `schema_v1_test`, `checks_test` y `migration_test`. Cómo se verifica: pasan las pruebas de migración desde v1, v2 y v3 contra los snapshots, QA-06-01-01 a 04 y QA-06-02-02 a 04 en base en memoria, la prueba de integración que cierra y reabre la base, y el análisis de CI falla al detectar un import de Drift en `presentation/`. QA-06-02-01 (reinicio real en modo avión) queda como QA humana. Tamaño: 3 sesiones T2 dentro del techo de 4, unos 8 puntos. ADVERTENCIAS: (a) La migración 3 a 4 debe reconstruir `plan_practica`, porque SQLite no permite quitar un NOT NULL con ALTER. Eso es una reescritura de datos y la eliminación de una restricción, y ambas requieren aprobación humana explícita. El rollback es solo hacia adelante (v5), nunca destructivo. (b) Sin generador de código Drift no hay TableInfo, así que `watch()` no se entera de escrituras hechas con `customStatement`. La unidad de trabajo debe anunciar las tablas tocadas con `notifyUpdates` dentro de la transacción y leer con `tableUpdates`, y ese es el riesgo técnico principal de S2. (c) La sonda de docs pide documentar un comando de generación de código Drift. El ticket no crea ese comando, porque el esquema es SQL explícito. Se documentan los comandos que sí se crean: la prueba de migración y la regla o script que impide Drift en `presentation/`.
Datos a confirmar antes de ejecutar: 1) El contenido de `esquema_v3.dart` y las columnas e índices actuales de `plan_practica`, para escribir el DDL de la reconstrucción (leerlo en `app/lib/data/drift/esquema_v3.dart`). 2) El comando exacto del linter de docs y si `.docs-baseline.txt` cubre `docs/development/commands.md` (ver `package.json` raíz y `.github/workflows/`). 3) El nombre del workflow de CI donde se cablea `custom_lint` o el script de `scripts/ci`, y cómo se corren hoy los tests de `app/custom_lint` (`dart test` dentro del paquete u otro runner). 4) La ubicación final de los providers: `features/<feature>/application/` según DEC-158, mientras que los de base viven hoy en `features/cuenta/data/`. Confirmar si `appDatabaseProvider` se queda donde está y solo se consume. 5) Qué features alojan los providers de cada agregado (consultante, consulta, recorrido, práctica), porque el pedido no nombra las carpetas.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/app_database.dart:9

Una instalación nueva crea el esquema en la versión 4 (`versionEsquemaLocal = 4` desde `esquema_v4.dart`). En ese esquema `plan_practica.paso_id` es NOT NULL y `tirada_revision_id` es nullable. Triggers BEFORE INSERT y BEFORE UPDATE rechazan un plan sin revisión cuando el paso no es `inicio`, `retorno_casa_1` ni `retoma`, y también un plan cuya revisión pertenece a otro paso.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/app_database.dart:40

Hay una migración 3 a 4 hacia adelante. Reconstruye `plan_practica`, hace backfill de `paso_id` desde `tirada_revision.paso_id`, recrea índices y unicidades, y conserva IDs, identidad del dispositivo, `cuenta_id` vinculada, cola legal y datos del recorrido. La prueba de migración parte de snapshots congelados v1 (el existente), v2 y v3 en `app/test/drift/fixtures`. Si la migración falla, registra versión origen, destino y error sin datos de la persona.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/dao/dao_append_only.dart:12

La regresión de lo que ya cubre main sigue en verde sin reimplementarse: checks de dados, anillo, enums y unicidades (`checks_test.dart`), tablas y espacio local (`schema_v1_test.dart`), y ULID, columnas comunes y DAO append-only sin `update` ni `delete` (`migration_test.dart`), ahora contra la versión 4.

### REQ-04 `inferred`
> Fuente: request HU-06-02, Incluye (operación transaccional y contexto transaccional compartido)

Una unidad de trabajo transaccional compartida envuelve `AppDatabase.transaction`. Cada comando del dominio escribe todas sus filas o ninguna, los generadores y efectos posteriores reciben el mismo contexto sin hacer commits internos, una excepción revierte todo y los streams solo anuncian el estado confirmado (las notificaciones se emiten con `notifyUpdates` dentro de la transacción, que Drift difiere hasta el commit).

### REQ-05 `inferred`
> Fuente: request HU-06-02, Incluye (repositorios por agregado, relleno automático y borrado lógico)

Hay repositorios por agregado (consultante, consulta, recorrido, práctica) en `app/lib/data/`. Rellenan solos `updated_at`, `version + 1`, `device_origin_id` (vía `AppDatabase.deviceOriginId`) y el `espacio_id` del espacio local. Excluyen por defecto las filas con `deleted_at` y ofrecen una lectura explícita de borrados. Devuelven entidades o DTO inmutables, nunca `QueryRow` ni SQL. El repositorio de práctica valida la coherencia paso-revisión como segunda barrera, antes del trigger. Los datos sobreviven al cierre y reapertura de la base.

### REQ-06 `confirmed`
> Fuente: adenda:1 y decision del dev sobre ubicaciones concretas de providers

Los providers Riverpod nuevos exponen los repositorios y las lecturas reactivas como `AsyncValue` y viven en ubicaciones concretas: `app/lib/features/consultas/application/` para los providers de consultante y consulta, `app/lib/features/recorrido/application/` para recorrido y `app/lib/features/practica/application/` para practica. `appDatabaseProvider` se queda en `app/lib/features/cuenta/data/alta_dispositivo_providers.dart` y solo se consume desde ellos: no se mueve, no se duplica y no se abre otra conexion persistente.

### REQ-07 `inferred`
> Fuente: request HU-06-02, Incluye (catálogo único de errores tipados del dominio)

Existe un catálogo único de errores tipados del dominio con código estable: `transicion_invalida`, `entidad_inexistente`, `validacion`, `persistencia`, `reparacion_pendiente` (HU-06-14), `plan_incompleto` (HU-06-05), `consulta_completada` (HU-06-15), `cierre_en_curso` (HU-06-12), `etapa_ya_resuelta` (HU-06-09) y `conflicto_idempotencia` (HU-06-04). Los mensajes no llevan contenido de la persona.

### REQ-08 `inferred`
> Fuente: request HU-06-02, Incluye (puerto de validación de EP-11)

El puerto de validación de EP-11 recibe `ResultadoValidacionUnidad = {unidad, evento}` y deduplica por la clave `unidad.id + evento.id`. Sus resultados se pueden inyectar en pruebas.

### REQ-09 `confirmed`
> Fuente: adenda 1 (2026-10-10) decision 2 y pedido de cambio puntos 1 y 2

La política de habilitación de tirada se implementa una sola vez, en la capa de repositorios (S2.T6). Recibe estado y fase de la consulta (enums de `esquema_v1.dart`) más un indicador `planCompleto` que calcula HU-06-05, dueña de `plan_incompleto`. No lee el plan ni define qué es un plan incompleto. Tabla: HABILITADA si `consulta.estado = activa`, `fase = lista_para_tirada` y `planCompleto = true`. `cierre_en_curso` si `estado = activa` y `fase = cierre_en_curso`. Con `estado = activa`, `fase = lista_para_tirada` y `planCompleto = false` devuelve el error `plan_incompleto` del catálogo. `transicion_invalida` para cualquier otra combinación: estado `borrador`, `completada` o `descartada` (nunca `consulta_completada`), o fase `preparacion`, `acciones_en_curso`, `esperando_material`, `esperando_conexion`, `lectura_pendiente`, `bloqueada_conflicto` o `completada`. No implementa reglas del método.

### REQ-10 `confirmed`
> Fuente: adenda:1 decision 3 y pedido de enmienda punto 7

Una regla nueva en `app/custom_lint/lib/src/` (junto a las dos existentes), con su test y cableada en CI, hace fallar el analisis y nombra el archivo en dos casos: (a) un archivo bajo `presentation/` que importa `package:drift`; (b) una clase que extiende `StatelessWidget` (o cualquier Widget como StatefulWidget) fuera de `presentation/`, en un archivo que importa `package:drift`, con un diagnostico que nombra el archivo. El caso negativo es una clase que no es Widget en `features/demo/application/` que importa drift: no produce diagnostico. Cada caso (a), (b) y el negativo tiene su propio test case.

### REQ-11 `confirmed` `enforcement`
> Fuente: pedido de cambio punto 9 y contexto de ejecución del request

Se reutiliza lo existente sin duplicarlo: `AppDatabase`, `esquema_v1/v2/v3.dart`, `DaoMutables`, `DaoAppendOnlyDrift`, `GeneradorId`, `deviceOriginId` y `actualizarDispositivoDeOrigen` (de `app/lib/features/cuenta/data/alta_dispositivo.dart`), y `appDatabaseProvider`. No hay segunda base, no se agrega un generador de código Drift (el esquema sigue siendo SQL explícito versionado) y el reloj, la zona y la fábrica de ULID se inyectan en pruebas.

### REQ-12 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

`docs/development/commands.md` documenta el uso, los parámetros y un ejemplo de los comandos operativos que crea el ticket: la prueba de migración con snapshots y la verificación de no-Drift en `presentation/`. También deja escrito que no existe un comando de generación de código Drift porque el esquema es SQL explícito.

### REQ-13 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo doc que el ticket modifique (por ejemplo `docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md`, `docs/development/commands.md` o el modelo de datos v2) queda compliant con el linter de docs sin agregar entradas a `.docs-baseline.txt`.

### REQ-14 `confirmed`
> Fuente: pedido de cambio punto 7 y Handoff a Kanai (DEC-239)

La prueba `app/integration_test/persistencia_reinicio_test.dart` requiere dispositivo: no se ejecuta en CI ni en el gate local. Su evidencia es manual en dispositivo y se registra junto a QA-06-02-01 (reinicio real en modo avión en un teléfono y una tablet, con salida y video corto). Lo que el código y los tests locales demuestran queda en los criterios automatizables. El flujo DEC-239 no abre PR por historia, por lo que no se verifica ningún estado de PR por ticket.

### REQ-15 `confirmed` `variant`
> Fuente: pedido de enmienda; request Handoff a Kanai (Flujo de entrega: DEC-239, sin PR/push/CI por historia)

El cableado en CI de la regla no-Drift (REQ-10) solo se verifica en local, con `dart run custom_lint` y el grep del workflow sobre el archivo de CI, porque el flujo DEC-239 no abre PR ni corre CI por historia. Esto queda anotado en la evidencia del ticket y no se declara verificado en CI.
## Tasks

#### S1.T1 — Crear `app/lib/data/drift/esquema_v4.dart` con las sentencias de la migración 3 a 4 y cambiar `versionEsquemaLocal` de 3 a 4 en `app/lib/data/drift/app_database.dart:9`. La migración reconstruye `plan_practica` (SQLite no permite quitar un NOT NULL con ALTER): crea `plan_practica_nueva` con `paso_id TEXT NOT NULL` y `tirada_revision_id` nullable, copia las filas con `paso_id` tomado de `tirada_revision.paso_id`, borra la tabla vieja, renombra la nueva y recrea índices y unicidades. Luego crea los triggers BEFORE INSERT y BEFORE UPDATE que exigen que la revisión pertenezca al mismo paso y que `tirada_revision_id` sea NULL solo para pasos `inicio`, `retorno_casa_1` y `retoma`. Todo corre dentro de la transacción de migración. Procedimiento SQLite de foreign keys: `PRAGMA foreign_keys` no cambia dentro de una transacción; usar `PRAGMA defer_foreign_keys = ON` dentro de la transacción de migración o desactivar las FK fuera de la transacción, y correr `PRAGMA foreign_key_check` antes del commit, abortando la migración si devuelve filas; documentarlo como comentario en español en `esquema_v4.dart`. `onCreate` aplica v1, v2, v3 y v4 en orden para que la instalación nueva y el upgrade den el mismo esquema. Si la migración falla, se registra `origen`, `destino` y el error sin datos de la persona. Antes de escribir el DDL, leer `esquema_v3.dart` para conservar lo que v3 ya cambió. Si `app/test/drift/migration_test.dart` requiere ajuste para v4, la edición es acotada (solo lo necesario para la versión 4) y requiere aprobación explícita del dev antes de editar, igual que la de `schema_v1_test.dart` en S1.T3; no tocar otras aserciones.
Contrato: rollback: Revertir el commit; esto revierte tambien los comentarios y la verificacion de FK de `esquema_v4.dart`. No revertir de forma destructiva una migracion ya aplicada: restaurar con una migracion compatible hacia adelante (v5).. Status: done

#### S1.T2 — Congelar los snapshots de las versiones 2 y 3 en `app/test/drift/fixtures` como constantes DDL (sin modificar el snapshot v1 existente ni ningún snapshot histórico), cada uno con datos semilla por versión para QA-06-01-03. v1: un espacio_datos local con `estado = local` y `cuenta_id` nulo, un consultante, una consulta, un paso, una revisión de tirada y un plan_practica ligado a esa revisión por `tirada_revision_id`. v2: lo anterior más `registro_legal_pendiente` con al menos una fila en la cola legal. v3: lo anterior más un espacio_datos vinculado (`cuenta_id` no nulo) con la identidad del dispositivo, la cola legal, y al menos dos planes ligados a revisiones de pasos distintos, para comprobar el backfill de `paso_id`. Cada semilla usa IDs ULID fijos de 26 caracteres para poder comprobar que persisten tras migrar.
Contrato: rollback: Borrar los archivos de fixtures nuevos, sin efecto en la app.. Status: done

#### S1.T3 — Ajustar `schema_v1_test.dart` solo en lo necesario para la version 4 (instalacion nueva con `plan_practica.paso_id` y `tirada_revision_id` nullable). Esta edicion es acotada y, por regla de no modificar tests existentes sin aprobacion, igual que la edicion acotada de `migration_test.dart` en S1.T1, requiere aprobacion explicita del dev antes de editar; no tocar otras aserciones.
Contrato: rollback: Revertir los tests nuevos. Los existentes no se tocan salvo la versión esperada, con aprobación.. Status: done

#### S1.T4 — Tarea de proceso: al iniciar, registrar el SHA de baseline de `main` (el request observó `debeb05f10a325c428febd01ed509fae98de7c80`) con `git rev-parse origin/main`, actualizarlo si difiere y anotarlo en la sesión sin asumir que EP-02 está integrado.
Contrato: rollback: Descartar la anotación del SHA; no hay cambio de código.. Status: done

#### S1.T5 — Tarea de confirmacion sin codigo. Confirmar en el codigo que `DaoAppendOnly` declara solo `insertar` y `listar`; confirmar el tipo de paso `tirada` y los pasos sin tirada `inicio`, `retorno_casa_1` y `retoma` en `esquema_v1.dart` y `esquema_v3.dart`; confirmar `tablasDelAlcance`, `consulta.paso_actual_id` y `consulta.fase`. El procedimiento de foreign keys NO se escribe aqui: vive en S1.T1.
Contrato: rollback: No hay cambios de codigo que revertir; solo se descarta la anotacion de confirmacion.. Status: done

#### S1.T7 — Checkpoint de aprobación humana explícita antes de ejecutar la reconstrucción de `plan_practica` y el retiro de la restricción NOT NULL de `tirada_revision_id`. Antes de escribir `esquema_v4.dart` o la migración 3 a 4, presentar al dev el DDL propuesto (tabla nueva con `paso_id` NOT NULL, `tirada_revision_id` nullable, backfill, triggers BEFORE INSERT y BEFORE UPDATE) y el plan de rollback (migración hacia adelante a v5). No continuar con las tasks de esquema hasta recibir la aprobación escrita del dev.
Contrato: rollback: No hay cambios de código que revertir: si el dev no aprueba, no se ejecuta la reconstrucción y se ajusta el DDL propuesto.. Status: done

#### S1.T8 — Crear `app/test/drift/migracion_v4_test.dart` con los casos de REQ-01 y REQ-02, usando los snapshots congelados de `app/test/drift/fixtures` y una base efímera. Casos: (1) trigger rechaza un plan cuya revisión pertenece a otro paso (INSERT); (2) rechaza un plan sin revisión para un paso con tirada; (3) rechaza un UPDATE incoherente que cambia la revisión a otra de distinto paso; (4) acepta un plan de `inicio` (también `retorno_casa_1` y `retoma`) con `tirada_revision_id` nulo; (5) migración fallida: registra versión origen 3, destino 4 y error sin datos de la persona, y deja la base intacta (sin cambios parciales); (6) QA-06-01-03: bases congeladas v1, v2 y v3 con datos migran al esquema vigente y conservan datos, IDs e identidad, y el esquema coincide con una instalación nueva; (7) QA-06-01-04: base v3 con identidad, cola legal y planes ligados a revisión migra a v4, conserva IDs/datos, rellena `paso_id` desde `tirada_revision.paso_id` y rechaza un plan ligado a una revisión de otro paso.
Contrato: rollback: Eliminar `app/test/drift/migracion_v4_test.dart`; no toca código de producción ni snapshots existentes.. Status: done

#### S2.T1 — Crear el catálogo único de errores tipados en `app/lib/data/` (por ejemplo `errores_dominio.dart`) con una sealed class y los códigos estables `transicion_invalida`, `entidad_inexistente`, `validacion`, `persistencia`, `reparacion_pendiente`, `plan_incompleto`, `consulta_completada`, `cierre_en_curso`, `etapa_ya_resuelta` y `conflicto_idempotencia`, junto con el traductor de `SqliteException` y `DriftWrappedException` a esos códigos, sin contenido de la persona en el mensaje.
Contrato: rollback: Revertir el commit. Nadie consume el catálogo todavía.. Status: pending

#### S2.T2 — Crear la unidad de trabajo transaccional compartida que envuelve AppDatabase.transaction. Cada comando del dominio escribe todas sus filas o ninguna. Los generadores y efectos posteriores reciben el mismo contexto y no hacen commits internos. Una excepción dentro de la unidad revierte todos los cambios. Los streams solo anuncian el estado confirmado: dentro de la transacción se llama a notifyUpdates con un TableUpdate por cada tabla tocada (el nombre de la tabla, como 'consulta' o 'plan_practica'), y Drift difiere esa notificación hasta el commit.
Contrato: rollback: Revertir el commit, sin datos que compensar.. Status: pending

#### S2.T3 — Crear los providers Riverpod de consultante y consulta en `features/consultas/application/`, que exponen los repositorios y las lecturas reactivas como `AsyncValue`. Los providers consumen `appDatabaseProvider` con `ref.watch` sin moverlo de `app/lib/features/cuenta/data/alta_dispositivo_providers.dart`.
Contrato: rollback: Revertir el commit. La presentación aún no los consume.. Status: pending

#### S2.T4 — Pruebas de la sesión en `app/test/data/` con base en memoria (`NativeDatabase.memory()`), reloj e ids inyectados: `unidad_trabajo_test.dart` cubre QA-06-02-02, QA-06-02-04 (stream sin emisión tras rollback, reapertura sobre archivo temporal) y la traducción de `SqliteException`. `repositorio_consulta_test.dart` cubre versión y `updated_at`, borrado lógico y persistencia tras cerrar y reabrir el archivo. `providers_consulta_test.dart` verifica con `ProviderContainer` que se emite el título nuevo. `errores_dominio_test.dart` hace snapshot de los 10 códigos y comprueba que no hay datos personales en `toString`.
Contrato: rollback: Revertir los archivos de test nuevos.. Status: pending

#### S2.T6 — Implementar la política de habilitación de tirada una sola vez en la capa de repositorios, según la tabla de REQ-09 (recibe estado y fase de la consulta con los enums de `esquema_v1.dart` y el indicador `planCompleto` que calcula HU-06-05; no lee el plan). Crear `app/test/data/politica_tirada_test.dart` con un test por cada combinación de la tabla: HABILITADA (activa + lista_para_tirada + planCompleto true); `cierre_en_curso` (activa + cierre_en_curso); `plan_incompleto` (activa + lista_para_tirada + planCompleto false); `transicion_invalida` para estado borrador, completada y descartada (nunca `consulta_completada`) y para cada fase preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto y completada. Cada test usa assertions con valores concretos (resultado o código de error estable).
Contrato: rollback: Revertir por commit.. Status: pending

#### S2.T7 — Crear los repositorios por agregado de consultante y consulta en `app/lib/data/` sobre `DaoMutables`, usando la unidad de trabajo de S2.T2 y el catalogo de errores de S2.T1. Rellenan solos `updated_at`, `version + 1`, `device_origin_id` (via `AppDatabase.deviceOriginId`) y el `espacio_id` del espacio local. Excluyen por defecto las filas con `deleted_at` y ofrecen lectura explicita de borrados. Devuelven entidades o DTO inmutables, nunca `QueryRow` ni SQL.
Contrato: rollback: Revertir el commit; nadie los consume todavia.. Status: pending

#### S3.T1 — Crear los providers Riverpod de recorrido en `features/recorrido/application/` y de practica en `features/practica/application/`, que exponen los repositorios y las lecturas reactivas como `AsyncValue`; consumen `appDatabaseProvider` con `ref.watch` sin moverlo.
Contrato: rollback: Revertir el commit, sin migración involucrada.. Status: pending

#### S3.T2 — Definir solo el puerto de validación de EP-11: contrato `ResultadoValidacionUnidad = {unidad, evento}` con deduplicación por la clave `unidad.id + evento.id` y resultados inyectables en pruebas. No implementa ni duplica la política de tirada, que vive únicamente en S2.T6.
Contrato: rollback: Revertir el commit. Nadie consume esto todavía.. Status: pending

#### S3.T3 — Crear la regla de custom_lint en `app/custom_lint/lib/src/` (junto a las dos existentes) con dos detecciones: (a) archivo bajo `presentation/` que importa `package:drift`; (b) clase que extiende `Widget` (StatelessWidget, StatefulWidget, etc.) fuera de `presentation/` en un archivo que importa `package:drift`. El diagnóstico nombra el archivo. Una clase no-Widget en `application/` que importa drift no produce diagnóstico. Registrar la regla en el plugin.
Contrato: rollback: Revertir el commit: quitar la regla, su registro, el paso de CI y el bloque de docs.. Status: pending

#### S3.T4 — Escribir los tests de la regla no-Drift (casos (a), (b) y el negativo, cada uno con su propio test case), `app/test/data/repositorio_practica_test.dart` (coherencia paso-revisión como segunda barrera) y `app/test/data/puerto_validacion_ep11_test.dart` (contrato `ResultadoValidacionUnidad = {unidad, evento}` y deduplicación por `unidad.id + evento.id`). La creación de `politica_tirada_test.dart` ya no va aquí: se hace en S2.T6.
Contrato: rollback: Revertir los tests y fixtures nuevos.. Status: pending

#### S3.T6 — Cablear la regla de no-Drift (REQ-10) en el workflow de CI resuelto al inicio de S3 (S3.T8), sin condicionales: el job de análisis ejecuta custom_lint y falla nombrando el archivo cuando se viola la regla. Documentar el comando en `docs/development/commands.md` (uso, parámetros y un ejemplo de la prueba de migración con snapshots y de la verificación de no-Drift en `presentation/`) junto con la nota de que no existe comando de generación de código Drift porque el esquema es SQL explícito (REQ-12), dejando los docs compliant con el linter sin tocar `.docs-baseline.txt` (REQ-13). Los checks de docs (grep de `commands.md`, git diff del baseline y `pnpm run docs:check`) se repiten a propósito en S3.T3 y no se quitan de ahí.
Contrato: rollback: Revertir los cambios de docs y del cableado de CI.. Status: pending

#### S3.T7 — Registrar la evidencia manual en dispositivo de `app/integration_test/persistencia_reinicio_test.dart` junto a QA-06-02-01 (reinicio real en modo avión en un teléfono y una tablet, con salida y video corto). Esta prueba no corre en CI ni en el gate local. No se verifica ningún estado de PR: el flujo DEC-239 no abre PR por historia.
Contrato: rollback: Revertir la edición del criterio y la nota de evidencia manual.. Status: pending

#### S3.T8 — Resolver el workflow de CI al inicio de S3: confirmar primero que `pnpm run docs:check` corre limpio en la línea base (antes de modificar docs) y anotar el resultado. Luego localizar en `.github/workflows/` el workflow que corre el análisis de la app (flutter analyze) y definir en él el paso que ejecuta custom_lint, de modo que las reglas de `app/custom_lint/lib/src/` (incluida la de no-Drift de REQ-10) fallen el CI. Dejar escrito el nombre del workflow y del job para que S3.T6 lo cablee sin condicionales.
Contrato: rollback: Revertir el commit que modifica el workflow; no hay datos que compensar.. Status: pending

#### S3.T9 — Crear los repositorios por agregado de recorrido y practica en `app/lib/data/` con las mismas reglas de REQ-05: relleno automatico de `updated_at`, `version + 1`, `device_origin_id` y `espacio_id`; borrado logico por `deleted_at` con lectura explicita de borrados; entidades o DTO inmutables. El repositorio de practica valida la coherencia paso-revision como segunda barrera, antes del trigger de SQLite: la revision debe pertenecer al mismo paso, y se admite plan sin revision solo para los pasos `inicio`, `retorno_casa_1` y `retoma`. No agregar nada mas alla de REQ-05.
Contrato: rollback: Revertir el commit; nadie los consume todavia.. Status: pending

#### S3.T10 — Crear `app/integration_test/persistencia_reinicio_test.dart`, prueba de integracion que crea una consulta, cierra y reabre la base y comprueba que la consulta persiste con los mismos valores. No corre en CI ni en el gate local porque requiere dispositivo; su evidencia es manual en dispositivo y se registra junto a QA-06-02-01 (ver S3.T7).
Contrato: rollback: Borrar el archivo de integration_test.. Status: pending
## Cambios al modelo de datos

- tipo: alter_additive | objetos: plan_practica.paso_id | destructivo: no | tarea: S1.T1 | rollback: Solo hacia adelante: una migración v5 compatible que deje de usar la columna, conservando IDs, identidad, cola legal y recorrido. No se revierte de forma destructiva una migración aplicada.
- tipo: drop | objetos: plan_practica.tirada_revision_id NOT NULL (restricción) | destructivo: no | tarea: S1.T1 | rollback: Migración v5 hacia adelante que restituya la restricción solo si no hay planes sin tirada. Ningún dato se pierde porque la columna se conserva.
- tipo: data_rewrite | objetos: plan_practica (reconstrucción: copia a tabla nueva, backfill de paso_id desde tirada_revision.paso_id, drop y rename) | destructivo: no | tarea: S1.T1 | rollback: La migración corre en una transacción y un fallo deja la base en v3 intacta. Una vez aplicada, cualquier corrección es una migración v5 hacia adelante. La prueba de migración y QA-06-01-03 y 04 verifican que se conservan IDs y datos.
- tipo: alter_additive | objetos: trigger plan_practica_coherencia_paso_bi, trigger plan_practica_coherencia_paso_bu, índice plan_practica(paso_id) | destructivo: no | tarea: S1.T1 | rollback: Migración v5 hacia adelante con DROP TRIGGER y DROP INDEX, sin pérdida de datos.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-06 (edit) `confirmed`: Los providers Riverpod nuevos de consultante, consulta, recorrido y práctica viven en `app/lib/features/<feature>/application/` y exponen lo
- REQ-09 (edit) `confirmed`: La política de habilitación de tirada vive en la capa de repositorios y recibe estado y fase de la consulta (enums de `esquema_v1.dart`) más
- REQ-10 (edit) `confirmed`: Una regla nueva en `app/custom_lint/lib/src/` (junto a las dos existentes), con su test y cableada en CI, hace fallar el análisis y nombra e
- REQ-14 (add) `confirmed`: La prueba `app/integration_test/persistencia_reinicio_test.dart` requiere dispositivo: no se ejecuta en CI ni en el gate local. Su evidencia

**Tasks agregadas:**

- S1: Tarea de proceso: al iniciar, registrar el SHA de baseline de `main` (el request observó `debeb05f10a325c428febd01ed509fae98de7c80`) con `git rev-parse origin/main`, actualizarlo si difiere y anotarlo en la sesión sin asumir que EP-02 está integrado. (valida: REQ-11; rollback: Descartar la anotación del SHA; no hay cambio de código.)
- S1: Complementa S1.T1. Antes de reconstruir `plan_practica` en la migración 3 a 4, leer `app/lib/data/drift/esquema_v1.dart` y `esquema_v3.dart` y confirmar las columnas y nombres citados: `consulta.paso_actual_id`, `consulta.fase`, `tablasDelAlcance` y el tipo de paso usado por el trigger (`inicio`, `retorno_casa_1`, `retoma`). Documentar en `esquema_v4.dart` (comentario en español) el procedimiento SQLite de reconstrucción con foreign keys: `PRAGMA foreign_keys` no cambia dentro de una transacción; usar `PRAGMA defer_foreign_keys = ON` dentro de la transacción o desactivar FK fuera de ella, y correr `PRAGMA foreign_key_check` antes del commit, abortando si devuelve filas. (valida: REQ-02; rollback: Revertir los comentarios y la verificación en esquema_v4.dart; migración forward-only, no se deshace una versión aplicada.)
- S1: Complementa S1.T3. Redactar la edición de `app/test/drift/schema_v1_test.dart` como modificación acotada: solo la versión esperada pasa a 4 (y las columnas del plan). Requiere aprobación explícita del usuario antes de tocar el archivo (regla de no modificar tests sin aprobación); no ampliar más el cambio. (valida: REQ-03, test; rollback: git checkout del archivo schema_v1_test.dart.)
- S2: Complementa S2.T3. Ubicar los providers nuevos de consultante, consulta, recorrido y práctica en `app/lib/features/<feature>/application/`; `appDatabaseProvider` queda en `features/cuenta/data/alta_dispositivo_providers.dart` y solo se consume con `ref.watch`. Reemplaza el placeholder de ubicación anterior. (valida: REQ-06; rollback: Revertir por commit; no hay datos que compensar.)
- S2: Implementar la política de tirada con la tabla exacta de REQ-09 sobre los enums de `esquema_v1.dart`, con parámetro `planCompleto` (bool) provisto por HU-06-05. Tests por cada combinación: habilitada (activa, lista_para_tirada, true); activa+lista_para_tirada+false no habilita; cierre_en_curso (activa, cierre_en_curso); transicion_invalida para estados borrador, completada, descartada y para las fases preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto y completada. (valida: REQ-09, test; rollback: Revertir por commit.)
- S3: Complementa S3.T1. La regla no-Drift en `app/custom_lint/lib/src/` detecta (a) la ruta `presentation/` y (b) clases que extienden `Widget` fuera de `presentation/`. Test propio por cada caso en `app/custom_lint/test/`, más casos negativos. Los providers se ubican en `features/<feature>/application/`, no en `features/cuenta/data/`. (valida: REQ-10, test; rollback: Eliminar la regla y su test; revertir el cableado en CI.)
- S3: Complementa S3.T3 (verify ampliado). Leer el comando del linter de docs desde el `package.json` raíz o `.github/workflows/` y correrlo sobre los docs modificados, sin tocar `.docs-baseline.txt`. Verificar que `docs/development/commands.md` nombra la regla no-Drift y menciona que no existe generador de código Drift. Si se cablea `custom_lint` en CI, agregar `dart run custom_lint` desde `app/`. (valida: REQ-12, REQ-13, REQ-10; rollback: Revertir los cambios de docs y del cableado de CI.)
- S3: Criterio de gate de S3: el estado de un PR no se observa con diff ni tests locales. Pasarlo a verificación manual o a una sesión advisory y dejar en el criterio solo lo que el código y los tests demuestran. Registrar como evidencia manual, junto a QA-06-02-01, la ejecución en dispositivo de `app/integration_test/persistencia_reinicio_test.dart` (teléfono y tablet, modo avión), sin declararla ejecutada en el gate local. (valida: REQ-14; rollback: Revertir la edición del criterio y la nota de evidencia manual.)

### Enmienda 2
**REQs:**

- REQ-09 (edit) `confirmed`: La política de habilitación de tirada se implementa una sola vez, en la capa de repositorios (S2.T6). Recibe estado y fase de la consulta (e
- REQ-10 (edit) `confirmed`: Una regla nueva en `app/custom_lint/lib/src/` (junto a las dos existentes), con su test y cableada en CI, hace fallar el análisis y nombra e
- REQ-11 (edit) `confirmed`: Se reutiliza lo existente sin duplicarlo: `AppDatabase`, `esquema_v1/v2/v3.dart`, `DaoMutables`, `DaoAppendOnlyDrift`, `GeneradorId`, `devic
- REQ-14 (edit) `confirmed`: La prueba `app/integration_test/persistencia_reinicio_test.dart` requiere dispositivo: no se ejecuta en CI ni en el gate local. Su evidencia

**Tasks agregadas:**

- S1: Checkpoint de aprobación humana explícita antes de ejecutar la reconstrucción de `plan_practica` y el retiro de la restricción NOT NULL de `tirada_revision_id`. Antes de escribir `esquema_v4.dart` o la migración 3 a 4, presentar al dev el DDL propuesto (tabla nueva con `paso_id` NOT NULL, `tirada_revision_id` nullable, backfill, triggers BEFORE INSERT y BEFORE UPDATE) y el plan de rollback (migración hacia adelante a v5). No continuar con las tasks de esquema hasta recibir la aprobación escrita del dev. (valida: REQ-01, REQ-02; rollback: No hay cambios de código que revertir: si el dev no aprueba, no se ejecuta la reconstrucción y se ajusta el DDL propuesto.)
- S3: Resolver el workflow de CI al inicio de S3: localizar en `.github/workflows/` el workflow que corre el análisis de la app (flutter analyze) y definir en él el paso que ejecuta custom_lint, de modo que las reglas de `app/custom_lint/lib/src/` (incluida la de no-Drift de REQ-10) fallen el CI. Dejar escrito el nombre del workflow y del job para que S3.T6 lo cablee sin condicionales. (valida: REQ-10; rollback: Revertir el commit que modifica el workflow; no hay datos que compensar.)

**Task ops:**

- edit S1.T3 { desc="Modificación acotada de `app/test/drift/schema_v1_test.dart`: actualizar solo la versión esperada del esquema a 4 y las columnas de `plan_practica` (`paso_id`, `tirada_revision_id` nullable). Requiere aprobación explícita del dev antes de editar, igual que S1.T6, porque es un test existente. No tocar otras aserciones.", validates=["REQ-01","REQ-03"], verify=["cd app && flutter test test/drift/schema_v1_test.dart"] }
- edit S2.T6 { desc="Implementar una sola vez la política de habilitación de tirada en la capa de repositorios. Recibe estado y fase de la consulta (enums de `esquema_v1.dart`) y el indicador `planCompleto` que calcula HU-06-05; no lee el plan. HABILITADA si estado = activa, fase = lista_para_tirada y planCompleto = true. `cierre_en_curso` si estado = activa y fase = cierre_en_curso. Estado activa, fase lista_para_tirada y planCompleto = false devuelve el error `plan_incompleto` del catálogo. Cualquier otra combinación (estado borrador, completada o descartada; fases preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto, completada) devuelve `transicion_invalida`, nunca `consulta_completada`.", validates=["REQ-09","REQ-07"] }
- edit S3.T2 { desc="Definir solo el puerto de validación de EP-11: contrato `ResultadoValidacionUnidad = {unidad, evento}` con deduplicación por la clave `unidad.id + evento.id` y resultados inyectables en pruebas. No implementa ni duplica la política de tirada, que vive únicamente en S2.T6.", validates=["REQ-08"] }
- edit S3.T3 { desc="Crear la regla de custom_lint en `app/custom_lint/lib/src/` (junto a las dos existentes) con dos detecciones: (a) archivo bajo `presentation/` que importa `package:drift`; (b) clase que extiende `Widget` (StatelessWidget, StatefulWidget, etc.) fuera de `presentation/` en un archivo que importa `package:drift`. El diagnóstico nombra el archivo. Una clase no-Widget en `application/` que importa drift no produce diagnóstico. Registrar la regla en el plugin.", validates=["REQ-10"] }
- edit S3.T4 { desc="Escribir los tests. Política de tirada (REQ-09): estado completada, borrador y descartada devuelven transicion_invalida (no consulta_completada); estado activa, fase lista_para_tirada y planCompleto falso devuelve plan_incompleto; activa, lista_para_tirada y planCompleto verdadero habilita; activa y cierre_en_curso devuelve cierre_en_curso; la política recibe planCompleto y no lee el plan. Regla no-Drift (REQ-10), un test case por caso: (a) archivo en presentation/ que importa drift produce diagnóstico; (b) clase que extiende StatelessWidget fuera de presentation/ y que importa drift produce diagnóstico; negativo: clase no-Widget en application/ que importa drift no produce diagnóstico.", validates=["REQ-09","REQ-10"] }
- edit S3.T5 { desc="Cubrir con tests de la regla de custom_lint los casos de REQ-10: archivo en presentation/ con import de drift, clase StatelessWidget fuera de presentation/ con import de drift (diagnóstico nombrando el archivo) y clase no-Widget en application/ con import de drift (sin diagnóstico). Cada caso es un test case propio dentro del paquete `app/custom_lint`.", validates=["REQ-10"], isTest=true }
- edit S3.T6 { desc="Cablear la regla de no-Drift (REQ-10) en el workflow de CI resuelto al inicio de S3, sin condicionales: el job de análisis ejecuta custom_lint y falla nombrando el archivo cuando se viola la regla. Documentar el comando en `docs/development/commands.md` junto con la nota de que no existe comando de generación de código Drift porque el esquema es SQL explícito (REQ-12), dejando los docs compliant con el linter sin tocar `.docs-baseline.txt` (REQ-13).", validates=["REQ-10","REQ-12","REQ-13"] }
- edit S3.T7 { desc="Registrar la evidencia manual en dispositivo de `app/integration_test/persistencia_reinicio_test.dart` junto a QA-06-02-01 (reinicio real en modo avión en un teléfono y una tablet, con salida y video corto). Esta prueba no corre en CI ni en el gate local. No se verifica ningún estado de PR: el flujo DEC-239 no abre PR por historia.", validates=["REQ-14"], verify=[] }

### Enmienda 3
**REQs:**

- REQ-06 (edit) `confirmed`: Los providers Riverpod nuevos exponen los repositorios y las lecturas reactivas como `AsyncValue` y viven en ubicaciones concretas: `app/lib
- REQ-10 (edit) `confirmed`: Una regla nueva en `app/custom_lint/lib/src/` (junto a las dos existentes), con su test y cableada en CI, hace fallar el analisis y nombra e

**Task ops:**

- edit S1.T4 { validates=[] }
- edit S1.T5 { desc="Confirmacion de lo existente antes de reconstruir `plan_practica` (sin cambios de codigo): confirmar en el codigo que `DaoAppendOnly` declara solo `insertar` y `listar`; confirmar el tipo de paso `tirada` y los pasos sin tirada `inicio`, `retorno_casa_1` y `retoma` en `esquema_v1.dart` y `esquema_v3.dart`; confirmar `tablasDelAlcance`, `consulta.paso_actual_id` y `consulta.fase`. Conservar la nota del procedimiento SQLite de foreign keys ya escrita en la tarea." }
- edit S2.T3 { desc="Crear los providers Riverpod de consultante y consulta en `features/consultas/application/`, que exponen los repositorios y las lecturas reactivas como `AsyncValue`. Los providers consumen `appDatabaseProvider` con `ref.watch` sin moverlo de `app/lib/features/cuenta/data/alta_dispositivo_providers.dart`." }
- edit S3.T1 { desc="Crear los providers Riverpod de recorrido en `features/recorrido/application/` y de practica en `features/practica/application/`, que exponen los repositorios y las lecturas reactivas como `AsyncValue`; consumen `appDatabaseProvider` con `ref.watch` sin moverlo." }
- edit S3.T3 { verify=["cd app/custom_lint && dart test","cd app && dart run custom_lint","grep -n 'test/drift/migration_test.dart' docs/development/commands.md && git diff --exit-code origin/main -- .docs-baseline.txt && pnpm run docs:check"] }
- edit S3.T4 { desc="Escribir los tests de la regla no-Drift en `app/custom_lint/test`, cada uno como caso propio: (a) archivo bajo `presentation/` que importa `package:drift`, con diagnostico que nombra el archivo; (b) clase que extiende `StatelessWidget` fuera de `presentation/` en un archivo que importa drift, con diagnostico que nombra el archivo; (negativo) clase que no es Widget en `features/demo/application/` que importa drift, sin diagnostico." }

### Enmienda 4

**Tasks agregadas:**

- S2: Crear los repositorios por agregado de consultante y consulta en `app/lib/data/` sobre `DaoMutables`, usando la unidad de trabajo de S2.T2 y el catalogo de errores de S2.T1. Rellenan solos `updated_at`, `version + 1`, `device_origin_id` (via `AppDatabase.deviceOriginId`) y el `espacio_id` del espacio local. Excluyen por defecto las filas con `deleted_at` y ofrecen lectura explicita de borrados. Devuelven entidades o DTO inmutables, nunca `QueryRow` ni SQL. (valida: REQ-05, REQ-11; rollback: Revertir el commit; nadie los consume todavia.)
- S3: Crear los repositorios por agregado de recorrido y practica en `app/lib/data/` con las mismas reglas de REQ-05: relleno automatico de `updated_at`, `version + 1`, `device_origin_id` y `espacio_id`; borrado logico por `deleted_at` con lectura explicita de borrados; entidades o DTO inmutables. El repositorio de practica valida la coherencia paso-revision como segunda barrera, antes del trigger de SQLite: la revision debe pertenecer al mismo paso, y se admite plan sin revision solo para los pasos `inicio`, `retorno_casa_1` y `retoma`. No agregar nada mas alla de REQ-05. (valida: REQ-05, REQ-11; rollback: Revertir el commit; nadie los consume todavia.)
- S3: Crear `app/integration_test/persistencia_reinicio_test.dart`, prueba de integracion que crea una consulta, cierra y reabre la base y comprueba que la consulta persiste con los mismos valores. No corre en CI ni en el gate local porque requiere dispositivo; su evidencia es manual en dispositivo y se registra junto a QA-06-02-01 (ver S3.T7). (valida: REQ-14; rollback: Borrar el archivo de integration_test.)

**Task ops:**

- edit S1.T1 { desc="Crear `esquema_v4.dart` con `versionEsquemaLocal = 4` y la migracion 3 a 4 de `plan_practica` (agregar `paso_id` NOT NULL con backfill desde `tirada_revision.paso_id`, volver `tirada_revision_id` nullable, recrear indices y unicidades, triggers BEFORE INSERT y BEFORE UPDATE de coherencia paso-revision), conservando IDs, identidad, cuenta vinculada, cola legal y datos del recorrido; registrar version origen, destino y error sin datos de la persona si falla. Procedimiento SQLite de foreign keys: `PRAGMA foreign_keys` no cambia dentro de una transaccion; usar `PRAGMA defer_foreign_keys = ON` dentro de la transaccion de migracion o desactivar las FK fuera de la transaccion, y correr `PRAGMA foreign_key_check` antes del commit, abortando la migracion si devuelve filas. Documentarlo como comentario en espanol en `esquema_v4.dart`. Si `app/test/drift/migration_test.dart` requiere ajuste para v4, la edicion es acotada (solo lo necesario para la version 4) y requiere aprobacion explicita del dev antes de editar, igual que la de `schema_v1_test.dart` en S1.T3; no tocar otras aserciones.", rollback="Revertir el commit; esto revierte tambien los comentarios y la verificacion de FK de `esquema_v4.dart`. No revertir de forma destructiva una migracion ya aplicada: restaurar con una migracion compatible hacia adelante (v5)." }
- edit S1.T3 { desc="Ajustar `schema_v1_test.dart` solo en lo necesario para la version 4 (instalacion nueva con `plan_practica.paso_id` y `tirada_revision_id` nullable). Esta edicion es acotada y, por regla de no modificar tests existentes sin aprobacion, igual que la edicion acotada de `migration_test.dart` en S1.T1, requiere aprobacion explicita del dev antes de editar; no tocar otras aserciones." }
- edit S1.T5 { desc="Tarea de confirmacion sin codigo. Confirmar en el codigo que `DaoAppendOnly` declara solo `insertar` y `listar`; confirmar el tipo de paso `tirada` y los pasos sin tirada `inicio`, `retorno_casa_1` y `retoma` en `esquema_v1.dart` y `esquema_v3.dart`; confirmar `tablasDelAlcance`, `consulta.paso_actual_id` y `consulta.fase`. El procedimiento de foreign keys NO se escribe aqui: vive en S1.T1.", rollback="No hay cambios de codigo que revertir; solo se descarta la anotacion de confirmacion.", validates=["REQ-02"], verify=["grep -n \"insertar\\|listar\" app/lib/data/drift/dao/dao_append_only.dart","grep -n \"retorno_casa_1\\|retoma\\|paso_actual_id\" app/lib/data/drift/esquema_v1.dart app/lib/data/drift/esquema_v3.dart"] }
- edit S3.T4 { desc="Escribir los tests de la regla no-Drift en `app/custom_lint/test`: caso (a) archivo bajo `presentation/` que importa `package:drift`, caso (b) clase que extiende Widget fuera de `presentation/` en un archivo que importa drift, y caso negativo (clase no Widget en `features/demo/application/` que importa drift, sin diagnostico). Ademas escribir: `app/test/data/repositorio_practica_test.dart` (coherencia paso-revision como segunda barrera, relleno automatico, borrado logico y persistencia tras reabrir); `app/test/data/puerto_validacion_ep11_test.dart` (contrato `ResultadoValidacionUnidad = {unidad, evento}`, deduplicacion por `unidad.id + evento.id`, resultados inyectados); `app/test/data/politica_tirada_test.dart` cubriendo REQ-09 con un test por cada combinacion de la tabla: habilitada (activa, lista_para_tirada, planCompleto true); activa + lista_para_tirada + planCompleto false devuelve `plan_incompleto`; cierre_en_curso (activa, cierre_en_curso); `transicion_invalida` para estados borrador, completada y descartada (nunca `consulta_completada`) y para las fases preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto y completada; la politica recibe `planCompleto` y no lee el plan. Constancia de la Enmienda 2: su mencion de 'edit S3.T5' es una referencia colgante; el contenido de los tests de la regla no-Drift vive ahora en S3.T4 y no existe S3.T5.", validates=["REQ-05","REQ-08","REQ-09","REQ-10"], isTest=true }
- edit S3.T8 { desc="Al inicio, confirmar que `pnpm run docs:check` corre limpio en la linea base (antes de modificar docs) y anotar el resultado junto al nombre del workflow y del job de CI. Luego conservar el resto de la tarea tal como estaba (cableado en CI de la regla no-Drift y su verificacion).", verify=["grep -rn \"custom_lint\" .github/workflows","pnpm run docs:check"] }
- edit S3.T6 { desc="Conservar REQ-12 y REQ-13 en esta tarea: documentar en `docs/development/commands.md` el uso, los parametros y un ejemplo de la prueba de migracion con snapshots y de la verificacion de no-Drift en `presentation/`, dejando escrito que no existe comando de generacion de codigo Drift porque el esquema es SQL explicito; todo doc modificado queda compliant con el linter de docs sin agregar entradas a `.docs-baseline.txt`. Nota: los checks de docs (grep de `commands.md`, git diff del baseline y `pnpm run docs:check`) se repiten a proposito en S3.T3; no se quitan de ahi.", verify=["grep -n -i \"generador\" docs/development/commands.md","git diff --exit-code origin/main -- .docs-baseline.txt","pnpm run docs:check"] }

### Enmienda 5

**Task ops:**

- edit S1.T1 { desc="Crear `app/lib/data/drift/esquema_v4.dart` con las sentencias de la migración 3 a 4 y cambiar `versionEsquemaLocal` de 3 a 4 en `app/lib/data/drift/app_database.dart:9`. La migración reconstruye `plan_practica` (SQLite no permite quitar un NOT NULL con ALTER): crea `plan_practica_nueva` con `paso_id TEXT NOT NULL` y `tirada_revision_id` nullable, copia las filas con `paso_id` tomado de `tirada_revision.paso_id`, borra la tabla vieja, renombra la nueva y recrea índices y unicidades. Luego crea los triggers BEFORE INSERT y BEFORE UPDATE que exigen que la revisión pertenezca al mismo paso y que `tirada_revision_id` sea NULL solo para pasos `inicio`, `retorno_casa_1` y `retoma`. Todo corre dentro de la transacción de migración. Procedimiento SQLite de foreign keys: `PRAGMA foreign_keys` no cambia dentro de una transacción; usar `PRAGMA defer_foreign_keys = ON` dentro de la transacción de migración o desactivar las FK fuera de la transacción, y correr `PRAGMA foreign_key_check` antes del commit, abortando la migración si devuelve filas; documentarlo como comentario en español en `esquema_v4.dart`. `onCreate` aplica v1, v2, v3 y v4 en orden para que la instalación nueva y el upgrade den el mismo esquema. Si la migración falla, se registra `origen`, `destino` y el error sin datos de la persona. Antes de escribir el DDL, leer `esquema_v3.dart` para conservar lo que v3 ya cambió. Si `app/test/drift/migration_test.dart` requiere ajuste para v4, la edición es acotada (solo lo necesario para la versión 4) y requiere aprobación explícita del dev antes de editar, igual que la de `schema_v1_test.dart` en S1.T3; no tocar otras aserciones." }
- edit S3.T4 { desc="Escribir los tests de la regla no-Drift en `app/custom_lint/test`, cada uno como caso propio: (a) archivo bajo `presentation/` que importa `package:drift`, con diagnóstico que nombra el archivo; (b) clase que extiende `StatelessWidget` fuera de `presentation/` en un archivo que importa drift, con diagnóstico que nombra el archivo; (negativo) clase que no es Widget en `features/demo/application/` que importa drift, sin diagnóstico. Además escribir: `app/test/data/repositorio_practica_test.dart` (coherencia paso-revisión como segunda barrera, relleno automático, borrado lógico y persistencia tras reabrir); `app/test/data/puerto_validacion_ep11_test.dart` (contrato `ResultadoValidacionUnidad = {unidad, evento}`, deduplicación por `unidad.id + evento.id`, resultados inyectados); `app/test/data/politica_tirada_test.dart` cubriendo REQ-09 con un test por cada combinación de la tabla: habilitada (activa, lista_para_tirada, planCompleto true); activa + lista_para_tirada + planCompleto false devuelve `plan_incompleto`; cierre_en_curso (activa, cierre_en_curso); `transicion_invalida` para estados borrador, completada y descartada (nunca `consulta_completada`) y para las fases preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto y completada; la política recibe `planCompleto` y no lee el plan." }
- edit S3.T6 { desc="Cablear la regla de no-Drift (REQ-10) en el workflow de CI resuelto al inicio de S3 (S3.T8), sin condicionales: el job de análisis ejecuta custom_lint y falla nombrando el archivo cuando se viola la regla. Documentar el comando en `docs/development/commands.md` (uso, parámetros y un ejemplo de la prueba de migración con snapshots y de la verificación de no-Drift en `presentation/`) junto con la nota de que no existe comando de generación de código Drift porque el esquema es SQL explícito (REQ-12), dejando los docs compliant con el linter sin tocar `.docs-baseline.txt` (REQ-13). Los checks de docs (grep de `commands.md`, git diff del baseline y `pnpm run docs:check`) se repiten a propósito en S3.T3 y no se quitan de ahí.", verify=["grep -n -i \"generador\" docs/development/commands.md","git diff --exit-code origin/main -- .docs-baseline.txt","pnpm run docs:check"] }
- edit S3.T8 { desc="Resolver el workflow de CI al inicio de S3: confirmar primero que `pnpm run docs:check` corre limpio en la línea base (antes de modificar docs) y anotar el resultado. Luego localizar en `.github/workflows/` el workflow que corre el análisis de la app (flutter analyze) y definir en él el paso que ejecuta custom_lint, de modo que las reglas de `app/custom_lint/lib/src/` (incluida la de no-Drift de REQ-10) fallen el CI. Dejar escrito el nombre del workflow y del job para que S3.T6 lo cablee sin condicionales.", verify=["grep -rn \"custom_lint\" .github/workflows","pnpm run docs:check"] }

### Enmienda 6
**REQs:**

- REQ-04 (edit) `inferred`: Una unidad de trabajo transaccional compartida envuelve `AppDatabase.transaction`. Cada comando del dominio escribe todas sus filas o ningun
- REQ-05 (edit) `inferred`: Hay repositorios por agregado (consultante, consulta, recorrido, práctica) en `app/lib/data/`. Rellenan solos `updated_at`, `version + 1`, `
- REQ-07 (edit) `inferred`: Existe un catálogo único de errores tipados del dominio con código estable: `transicion_invalida`, `entidad_inexistente`, `validacion`, `per
- REQ-08 (edit) `inferred`: El puerto de validación de EP-11 recibe `ResultadoValidacionUnidad = {unidad, evento}` y deduplica por la clave `unidad.id + evento.id`. Sus
- REQ-15 (add) `confirmed`: El cableado en CI de la regla no-Drift (REQ-10) solo se verifica en local, con `dart run custom_lint` y el grep del workflow sobre el archiv

**Tasks agregadas:**

- S1: Crear `app/test/drift/migracion_v4_test.dart` con los casos de REQ-01 y REQ-02, usando los snapshots congelados de `app/test/drift/fixtures` y una base efímera. Casos: (1) trigger rechaza un plan cuya revisión pertenece a otro paso (INSERT); (2) rechaza un plan sin revisión para un paso con tirada; (3) rechaza un UPDATE incoherente que cambia la revisión a otra de distinto paso; (4) acepta un plan de `inicio` (también `retorno_casa_1` y `retoma`) con `tirada_revision_id` nulo; (5) migración fallida: registra versión origen 3, destino 4 y error sin datos de la persona, y deja la base intacta (sin cambios parciales); (6) QA-06-01-03: bases congeladas v1, v2 y v3 con datos migran al esquema vigente y conservan datos, IDs e identidad, y el esquema coincide con una instalación nueva; (7) QA-06-01-04: base v3 con identidad, cola legal y planes ligados a revisión migra a v4, conserva IDs/datos, rellena `paso_id` desde `tirada_revision.paso_id` y rechaza un plan ligado a una revisión de otro paso. (valida: REQ-01, REQ-02, REQ-03, test; rollback: Eliminar `app/test/drift/migracion_v4_test.dart`; no toca código de producción ni snapshots existentes.)

**Task ops:**

- edit S1.T2 { desc="Congelar los snapshots de las versiones 2 y 3 en `app/test/drift/fixtures` como constantes DDL (sin modificar el snapshot v1 existente ni ningún snapshot histórico), cada uno con datos semilla por versión para QA-06-01-03. v1: un espacio_datos local con `estado = local` y `cuenta_id` nulo, un consultante, una consulta, un paso, una revisión de tirada y un plan_practica ligado a esa revisión por `tirada_revision_id`. v2: lo anterior más `registro_legal_pendiente` con al menos una fila en la cola legal. v3: lo anterior más un espacio_datos vinculado (`cuenta_id` no nulo) con la identidad del dispositivo, la cola legal, y al menos dos planes ligados a revisiones de pasos distintos, para comprobar el backfill de `paso_id`. Cada semilla usa IDs ULID fijos de 26 caracteres para poder comprobar que persisten tras migrar." }

### Enmienda 7

**Task ops:**

- edit S2.T6 { desc="Implementar la política de habilitación de tirada una sola vez en la capa de repositorios, según la tabla de REQ-09 (recibe estado y fase de la consulta con los enums de `esquema_v1.dart` y el indicador `planCompleto` que calcula HU-06-05; no lee el plan). Crear `app/test/data/politica_tirada_test.dart` con un test por cada combinación de la tabla: HABILITADA (activa + lista_para_tirada + planCompleto true); `cierre_en_curso` (activa + cierre_en_curso); `plan_incompleto` (activa + lista_para_tirada + planCompleto false); `transicion_invalida` para estado borrador, completada y descartada (nunca `consulta_completada`) y para cada fase preparacion, acciones_en_curso, esperando_material, esperando_conexion, lectura_pendiente, bloqueada_conflicto y completada. Cada test usa assertions con valores concretos (resultado o código de error estable)." }
- edit S3.T4 { desc="Escribir los tests de la regla no-Drift (casos (a), (b) y el negativo, cada uno con su propio test case), `app/test/data/repositorio_practica_test.dart` (coherencia paso-revisión como segunda barrera) y `app/test/data/puerto_validacion_ep11_test.dart` (contrato `ResultadoValidacionUnidad = {unidad, evento}` y deduplicación por `unidad.id + evento.id`). La creación de `politica_tirada_test.dart` ya no va aquí: se hace en S2.T6.", validates=["REQ-05","REQ-08","REQ-10"], verify=["cd app && flutter test test/data/repositorio_practica_test.dart test/data/puerto_validacion_ep11_test.dart","cd app/custom_lint && dart test"] }
- edit S3.T8 { validates=["REQ-14","REQ-15"] }
- edit S3.T3 { verify=["cd app/custom_lint && dart test","cd app && dart run custom_lint"] }
- move S1.T7 → S1

### Enmienda 8

**Task ops:**

- edit S2.T2 { desc="Crear la unidad de trabajo transaccional compartida que envuelve AppDatabase.transaction. Cada comando del dominio escribe todas sus filas o ninguna. Los generadores y efectos posteriores reciben el mismo contexto y no hacen commits internos. Una excepción dentro de la unidad revierte todos los cambios. Los streams solo anuncian el estado confirmado: dentro de la transacción se llama a notifyUpdates con un TableUpdate por cada tabla tocada (el nombre de la tabla, como 'consulta' o 'plan_practica'), y Drift difiere esa notificación hasta el commit." }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T7
- [x] S1.T8

**Gate (auto)**: `cd app && flutter test test/drift/` en verde con los tests nuevos de v4 y los existentes. Se ven `user_version = 4`, la columna `paso_id`, los triggers de coherencia y la migración desde los snapshots congelados v2 y v3.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T6
- [ ] S2.T7

**Gate (auto)**: Los tests de repositorios en base en memoria están en verde: el comando que falla en la tercera fila no deja filas, `version` sube y `updated_at` cambia, los borrados quedan fuera del listado, y el provider de consulta emite el título nuevo sin recargar. Se ve el catálogo de 10 errores con sus códigos y `politica_tirada_test.dart` en verde con un test por cada combinación de la tabla de REQ-09.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T6
- [ ] S3.T7
- [ ] S3.T8
- [ ] S3.T9
- [ ] S3.T10

**Gate (auto)**: Los repositorios de recorrido y práctica están en verde, con la segunda barrera paso-revisión. El puerto EP-11 deduplica por `unidad.id + evento.id`. Un widget fixture que importa drift en `presentation/` hace fallar el análisis local nombrando el archivo, y `commands.md` documenta los comandos sin tocar el baseline de docs. La comprobación en CI queda para el PR final de la épica (DEC-239).

### Session 4 · T0 · open
