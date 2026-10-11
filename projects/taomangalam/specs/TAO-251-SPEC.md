---
id: TAO-251-SPEC
project: taomangalam
ticket: TAO-251
status: approved
---

# Ciclo de vida de la consulta (borrador, inicio en Casa 1 con kuberani validado, descarte, propósito inmutable) y cierre mínimo en Casa 12 con bloqueo definitivo de tiradas (HU-06-03, HU-06-15)

## Resumen ejecutivo

Qué se hace: el motor local en Drift crea consultas en borrador con la revisión 1 de la descripción. Edita el título y agrega revisiones mientras la consulta está en borrador o activa. El propósito solo se edita en borrador. El descarte procede solo desde borrador. Dar inicio aplica en una transacción el resultado tipado de EP-11: deja la consulta activa en Casa 1, crea el paso 1 de inicio y genera el plan real de Casa 1 con HU-06-05. El inicio maneja las esperas esperando_conexion y esperando_material y es idempotente por unidad.id + evento.id. HU-06-15 suma un handler de cierre con estrategia inyectable (por defecto, el cierre mínimo M1a) que completa la consulta en Casa 12 y bloquea para siempre el registro y la corrección de tiradas. Qué NO se hace: validar el kuberani ni su interfaz (EP-11), el contenido del plan de Casa 1 (HU-06-05), clasificar D12 = 12 como Cierre (HU-06-04), las proyecciones de Inicio y listado (HU-06-08), el plan final ni cierre_en_curso (HU-06-12) ni pantallas (EP-05 y EP-08). Cómo se sabe que funciona: los tests de Drift QA-06-03-01 a 04 y QA-06-15-01 a 06 pasan contra la base real (en memoria y reabierta), con estados, fases, motivos, pasos, planes y closed_at concretos. Tamaño: 3 sesiones T2, unas 6 a 8 h, sin migración. ADVERTENCIAS: (1) El ticket está Blocked. HU-06-02 (#148, TAO-249: Drift v4, catálogo de errores, política compartida, unidad de trabajo y deduplicación) y HU-06-05 (#150, plan de Casa 1) deben estar integradas en epic/EP-06 antes de ejecutar, y el plan no las implementa ni las simula con stubs. (2) En origin/main, plan_practica.tirada_revision_id es NOT NULL (esquema_v1.dart:194). El plan sin tirada (paso_id, tirada_revision_id nulo) depende de la v4 de TAO-249: si no está, la S2 no puede cumplir el criterio y hay que detenerse. (3) Las rutas de los archivos de dominio y de los tests nuevos son propuestas (inferred) hasta ver la estructura que deja TAO-249. Datos a confirmar antes de ejecutar: (a) rutas y nombres del catálogo de errores tipados, de la política compartida de guardas (lista_para_tirada) y de la unidad de trabajo transaccional de HU-06-02 en la rama epic/EP-06 (ver TAO-249). (b) Firma de la operación de HU-06-05 que genera el plan de Casa 1 y de cómo marca el plan como vigente. (c) Forma exacta del resultado tipado de validarYUsarUnidad de EP-11 (exitoso, sin_conexion y la referencia de operación unidad.id + evento.id). (d) Dónde persiste HU-06-02 la clave de deduplicación (tabla o columna de la v4). (e) Proveedor de reloj y zona horaria inyectable para local_date y timezone_id. (f) SHA vigente de main y de epic/EP-06 al iniciar (baseline publicado: debeb05f10a325c428febd01ed509fae98de7c80). (g) Comando de test de la app (se asume cd app && flutter test <archivo>; confirmar en docs de comandos de TAO-249).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:81-120

Crear consulta sin red: se persiste con estado = borrador, fase = preparacion, motivo_bloqueo nulo, casa_actual nula, propósito, título y consultante del mismo espacio, y con la revisión 1 de consulta_descripcion_revision.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:108-120

Edición acotada por estado: el título se edita en borrador y en activa; la descripción agrega una revisión con número siguiente (append-only, la vigente es la de mayor número) en borrador o activa; el propósito solo se edita en borrador; en descartada o completada, la edición de la descripción se rechaza con error tipado y no agrega revisión.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:102

Máquina de estados con transiciones explícitas: borrador->activa (inicio), borrador->descartada (descartar), activa->completada (cierre); cualquier otra se rechaza con un error tipado del catálogo de HU-06-02 que informa el código y el estado de origen. Descartar no borra la fila: no hay borrado físico y deleted_at sigue nulo.

### REQ-04 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:124-147

Dar inicio con resultado exitoso de EP-11 en una sola transacción: estado = activa, casa_actual = 1, fecha_inicio, paso 1 de tipo = inicio con occurred_at_utc, local_date y timezone_id del momento del inicio y revision_vigente_id nulo, plan vigente de Casa 1 generado por HU-06-05 (paso_id del inicio, tirada_revision_id nulo), plan_actual_id y paso_actual_id apuntando a ellos, fase = acciones_en_curso y motivo_bloqueo nulo. El motor no recibe ni guarda el código del kuberani. Si la generación del plan falla, la consulta y sus revisiones quedan como estaban.

### REQ-05 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:103-104

Esperas del inicio: un resultado 'sin conexión' deja estado = borrador, fase = esperando_conexion y motivo_bloqueo = validar_kuberani_inicio, sin crear paso; indicar que aún no se tiene el kuberani deja fase = esperando_material y motivo_bloqueo = kuberani_inicio. Para salir de la espera, un reintento exitoso inicia igual que desde preparacion, y volver al borrador sin iniciar deja fase = preparacion y motivo_bloqueo nulo.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md:543

Idempotencia del inicio: aplicar dos veces el mismo resultado de EP-11 (misma clave unidad.id + evento.id, definida en HU-06-02) no crea un segundo paso ni un segundo plan, no crea tiradas ficticias y no repite el consumo remoto ya confirmado.

### REQ-07 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:152-187

Handler de cierre (resultado = cierre) invocable con contexto transaccional y una consulta lista: en una sola transacción crea el paso tipo = cierre y una tirada_revision con resultado = cierre, casa_origen = casa actual y casa_destino = 12, con anillo_destino y fuerza_kipot nulos; deja estado = completada, fase = completada, casa_actual = 12, paso_actual_id en el paso del cierre, plan_actual_id nulo y closed_at igual al momento del paso; y devuelve un resumen tipado que la identifica como completada.

### REQ-08 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:102

Bloqueo definitivo tras el cierre: sobre una consulta completada, registrar una tirada o corregir la última (incluida la del cierre) se rechaza con el error tipado estable de consulta completada, mediante la política compartida real de HU-06-02, sin escribir nada. Reintentar la misma clave de operación del cierre conserva una sola revisión y el mismo closed_at. El estado y el bloqueo persisten al reabrir la base, y el repositorio por estado la lista entre las completadas y no entre las activas.

### REQ-09 `inferred`
> Fuente: taomangalam/docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md:655

Estrategia de cierre explícita e intercambiable: el handler recibe por inyección la estrategia de cierre; sin inyección usa el cierre mínimo M1a, y otra implementación (la futura de HU-06-12) se usa sin modificar el handler. Ninguna estrategia reabre una consulta completada.

### REQ-10 `inferred` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:102-105

Reuso obligatorio de la base de HU-06-02 (TAO-249): los handlers usan la unidad de trabajo transaccional, el catálogo de errores tipados, la política compartida de guardas y la clave de deduplicación unidad.id + evento.id que ya existen en epic/EP-06. No crean catálogos, transacciones ni tablas paralelas ni usan stubs que omitan la escritura de estado, y escriben solo valores de los CHECK cerrados del esquema.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo doc que el ticket modifique (EP-06 backlog, SCHEMA.md, modelo de datos v2, PLAN.md) queda compliant con el linter de docs (pnpm run docs:check), sin agregar entradas a .docs-baseline.txt.
## Tasks

#### S1.T1 — Implementar el servicio de dominio de consulta (crear, editarTitulo, agregarRevisionDescripcion, editarProposito y descartar) sobre la unidad de trabajo de HU-06-02, con una tabla explícita de transiciones válidas (borrador->activa, borrador->descartada, activa->completada) y rechazo mediante el catálogo de errores de HU-06-02 (código + estado de origen). Escribir solo valores de los CHECK de esquema_v1.dart:102-104. La ruta del archivo es una propuesta, por confirmar contra la estructura de TAO-249.
Contrato: rollback: Revertir el commit de la task; sin migración ni datos que compensar.. Status: done

#### S1.T2 — Tests del ciclo de vida sobre Drift real (archivo propuesto: app/test/dominio/consulta_ciclo_vida_test.dart): creación sin red, revisiones append-only, propósito inmutable en activa, rechazo de edición en descartada y completada (la consulta completada se siembra directamente), descarte desde borrador, QA-06-03-02 y QA-06-03-03, y tabla de transiciones inválidas. Incluye regresión de app/test/drift.
Contrato: rollback: Revertir el commit del archivo de test.. Status: done

#### S2.T1 — Implementar el comando Dar inicio, que recibe el resultado tipado de validarYUsarUnidad de EP-11 (nunca el código del kuberani). Si el resultado es exitoso, en una transacción: estado = activa, casa_actual = 1, fecha_inicio, paso 1 tipo = inicio con occurred_at_utc, local_date y timezone_id de un reloj inyectable, plan de Casa 1 generado por HU-06-05 (paso_id del inicio, tirada_revision_id nulo), plan_actual_id, paso_actual_id, fase = acciones_en_curso y motivo_bloqueo nulo. Si falla la generación del plan, se revierte todo. Si es sin_conexion: fase = esperando_conexion y motivo = validar_kuberani_inicio. Si es sin kuberani: fase = esperando_material y motivo = kuberani_inicio. Volver al borrador: fase = preparacion y motivo nulo. Deduplicar con la clave unidad.id + evento.id de HU-06-02 sin repetir el consumo remoto.
Contrato: rollback: Revertir el commit de la task; sin migración ni datos que compensar.. Status: pending

#### S2.T2 — Tests de inicio sobre Drift real con resultados simulados de EP-11 y el generador real de HU-06-05 (archivo propuesto: app/test/dominio/consulta_inicio_test.dart): QA-06-03-01 (local_date del día de inicio y no del de creación), plan sin tirada, rollback ante fallo del plan, esperas y reintento, ausencia del código del kuberani y QA-06-03-04 (idempotencia, sin tiradas ficticias, puerto remoto con 0 invocaciones).
Contrato: rollback: Revertir el commit del archivo de test.. Status: pending

#### S3.T1 — Implementar el handler de cierre (resultado = cierre) para la unidad de trabajo compartida, con contexto transaccional y consulta lista. Crea el paso tipo = cierre y la tirada_revision (casa_destino = 12, anillo_destino y fuerza_kipot nulos) y delega a una estrategia de cierre inyectable cuyo default es el cierre mínimo M1a: estado y fase completada, casa_actual = 12, paso_actual_id en el cierre, plan_actual_id nulo y closed_at = momento del paso. Devuelve un resumen tipado completado. El rechazo de registro y de corrección sobre consultas completadas se resuelve con la política compartida real de HU-06-02 y un código estable, y se deduplica por clave de operación.
Contrato: rollback: Revertir el commit de la task; sin migración ni datos que compensar.. Status: pending

#### S3.T2 — Si se actualizan docs del ticket (p. ej. criterios en docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md), dejarlos compliant con el linter de docs sin tocar .docs-baseline.txt.
Contrato: rollback: Revertir el commit de docs.. Status: pending

#### S3.T3 — Tests del handler de cierre sobre Drift real, con consultas y pasos válidos sembrados y sin depender de HU-06-04 ni de HU-06-08 (archivo propuesto: app/test/dominio/consulta_cierre_test.dart): Casa 7 con D12 12, D8 4 y D4 2; QA-06-15-01; Casa 11 como borde; QA-06-15-02 a 06 (fallo simulado, corrección rechazada, reapertura de la base en archivo temporal con la misma clave, estrategia inyectada y estrategia por defecto); y repositorio por estado activa o completada.
Contrato: rollback: Revertir el commit del archivo de test.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: En app/test, el test del ciclo de vida pasa: crear en borrador, editar título, descripción y propósito según estado, descartar desde borrador y rechazar transiciones inválidas con código y estado de origen.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2

**Gate (auto)**: En app/test, el test de inicio pasa: un borrador queda activo en Casa 1 con paso de inicio y plan vigente real de HU-06-05; las esperas sin conexión y sin kuberani fijan fase y motivo; el reintento inicia, y repetir el resultado no duplica paso ni plan.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: En app/test, el test del handler de cierre pasa: consulta completada en Casa 12 con closed_at del paso, rollback ante fallo, rechazo de registro y corrección, idempotencia tras reabrir la base y estrategia inyectada usada sin cambios; pnpm run docs:check queda en verde.

### Session 4 · T0 · open
