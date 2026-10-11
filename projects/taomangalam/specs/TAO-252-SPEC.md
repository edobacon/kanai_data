---
id: TAO-252-SPEC
project: taomangalam
ticket: TAO-252
status: approved
---

# TAO-252 · Registro de tirada de tres dados con clasificación, idempotencia y orquestador transaccional, más el handler de Retroceso con anillo, fuerza del kipot versionada y espera de reparación (HU-06-14, HU-06-04)

## Resumen ejecutivo

Qué se hace: en la app Flutter (Drift) se agregan cuatro piezas. (1) Un handler de Retroceso (HU-06-14). Escribe el paso tipo tirada y la tirada_revision 1 vigente con anillo_destino = D8, fuerza_kipot según una tabla D4 versionada (1 y 2 baja, 3 y 4 alta) y clasificacion_d4_version. Deja la consulta en acciones_en_curso sin plan ni motivo y devuelve un resultado tipado (casa, anillo, fuerza, versión). (2) Una guarda de reparación pendiente. (3) Un clasificador puro de D12 y la validación de rangos. (4) El registro idempotente por ULID y un orquestador público que compone plan (HU-06-05), retroceso y cierre (HU-06-15) en una sola transacción de la unidad de trabajo de HU-06-02.
Qué NO se hace: streams, rastro ni resumen (HU-06-08), diagnóstico ni reconocimiento (HU-06-09), plan de reparación ni kuberani (HU-06-10), corrección de tirada (HU-06-07), interfaz (HU-07-05/13/14), ciclos ni días de práctica (HU-06-06), migración de esquema. Las columnas ya existen en esquema_v1.dart:152-187.
Cómo se sabe que funciona: pruebas Drift en memoria. Se cubren las 1760 combinaciones de retroceso y las 132 de clasificación (la salida de CI imprime ambos conteos). Se prueban la idempotencia (un solo paso con la misma clave y un conflicto tipado sin escritura si cambian los dados) y el rollback total si falla el plan de un Avance. También la relectura tras reabrir la base y QA-06-14-01..04 y QA-06-04-01..05.
Tamaño: 3 sesiones T2 (cabe en el techo de 4).
ADVERTENCIAS: (a) El ticket está Blocked. HU-06-05 (#150) y HU-06-03/HU-06-15 (#151) deben estar integrados en epic/EP-06 antes de la sesión 3; las sesiones 1 y 2 solo dependen de HU-06-02 (TAO-249). (b) Si el catálogo de errores de HU-06-02 no tiene el error de reparación pendiente o el de conflicto de idempotencia, hay que agregarlos ahí: es un cambio en el catálogo de otra historia, avisar antes de tocarlo. (c) El flujo es DEC-239: rama acumuladora epic/EP-06, sin PR, push ni CI por historia.
Datos a confirmar antes de ejecutar: 1) Rutas y nombres reales de la unidad de trabajo, los repositorios y el catálogo de errores tipados de HU-06-02 (TAO-249), en app/lib de epic/EP-06. Las rutas de archivos nuevos de este plan (app/lib/dominio/tirada/..., app/test/dominio/tirada/...) son propuestas y deben alinearse con esa estructura. 2) Firma del generador de plan de HU-06-05 y del handler de cierre de HU-06-15. 3) El literal de versión de la tabla D4 que fija DEC-131 (p. ej. 'd4-v1'). 4) La librería o el helper de ULID que ya usa la app. 5) El SHA vigente de main o epic/EP-06 (el baseline observado es debeb05f). 6) El literal de fuerza_kipot ('baja'/'alta') según tecnologia/20 §15.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:152-187

Handler de Retroceso independiente (HU-06-14). Recibe el contexto transaccional, una consulta activa en lista_para_tirada y una tirada con D12 menor que casa_actual. Inserta paso_recorrido tipo tirada y tirada_revision 1 vigente con resultado retroceso, anillo_destino = D8, fuerza_kipot de la tabla D4 versionada (1 y 2 baja, 3 y 4 alta; DEC-131 y DEC-132) y clasificacion_d4_version con la versión vigente. En la misma transacción deja la consulta con casa_actual = casa_destino, paso_actual_id = paso nuevo, plan_actual_id nulo, fase acciones_en_curso y motivo_bloqueo nulo. No confirma su propia transacción, no crea ciclos ni cumplimientos y devuelve un resultado tipado con casa y anillo de destino, fuerza y versión D4.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:89-92

Guarda de reparación pendiente en la política compartida de HU-06-02. Si la consulta está en acciones_en_curso sin plan_actual_id y su última revisión vigente es de Retroceso, registrar otra tirada se rechaza con el error tipado de reparación pendiente del catálogo, distinto del de plan incompleto, sin escribir nada y con un código estable sin valores de la persona.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:176

Clasificador puro (doc 03, DEC-028): D12 = 12 es Cierre; D12 mayor que casa_actual y distinto de 12 es Avance; igual es Permanencia; menor es Retroceso. Devuelve el resultado y la casa de destino, sin efectos.

### REQ-04 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:179-181

Validación de rangos antes de escribir: D12 1..12, D8 1..8 y D4 1..4. Fuera de rango, rechaza con un error de validación que nombra el dado y no escribe nada.

### REQ-05 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:102-103

Guardas de estado y fase del registro: solo se admite una consulta activa con fase lista_para_tirada. Las fases acciones_en_curso, esperando_conexion y esperando_material, y el estado completada, se rechazan con el error tipado correspondiente del catálogo de HU-06-02, sin escribir.

### REQ-06 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:122-187

Registro de Avance y Permanencia. Inserta paso_recorrido tipo tirada con el numero_paso siguiente, la fecha local y la zona, y tirada_revision 1 vigente con d12, d8, d4, resultado, casa_origen, casa_destino y lanzada_por = consultante. El D4 se guarda como número y anillo_destino, fuerza_kipot y clasificacion_d4_version quedan nulos (DEC-029, DEC-134). casa_actual y paso_actual_id se actualizan en la misma transacción.

### REQ-07 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:142

Idempotencia por ULID del paso, generado al confirmar. Repetir el registro con el mismo id y los mismos dados devuelve el resultado previo sin crear otro paso, revisión ni plan. El mismo id con dados distintos devuelve el error tipado de conflicto de idempotencia y no modifica datos.

### REQ-08 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:79-107

Orquestador de la entrada pública. Valida, aplica guardas, clasifica y despacha una sola vez dentro de la unidad de trabajo de HU-06-02, con un único commit. Para Avance y Permanencia inserta paso y revisión y genera el plan de HU-06-05 (fase acciones_en_curso, plan_actual_id del plan). Para Retroceso delega en el handler de REQ-01 y para Cierre en el de HU-06-15, que son dueños de su paso y su revisión, sin escrituras duplicadas. Ningún handler confirma por separado y no consume red ni unidades remotas.

### REQ-09 `inferred` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:174-186

Reutilizar lo existente: la unidad de trabajo, los repositorios y el catálogo de errores tipados de HU-06-02 (TAO-249), el generador de plan de HU-06-05 y el cierre de HU-06-15. No crear transacciones propias ni jerarquías de error paralelas. Respetar los CHECK de Drift (tirada_revision_anillo_check, d12/d8/d4_check, consulta_fase_check) sin migrar el esquema.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Variante de docs con lint en baseline: todo doc que el ticket modifique (EP-06, docs/PLAN.md, tecnologia/20_modelo_de_datos_v2_incremental.md, SCHEMA.md) queda compliant con pnpm run docs:check sin tocar .docs-baseline.txt.
## Tasks

#### S1.T1 — Tabla D4 versionada como código (DEC-131/132): constante de versión (literal a confirmar, p. ej. 'd4-v1') y función pura fuerzaKipot(d4) con 1 y 2 baja, 3 y 4 alta. Rechaza d4 fuera de 1..4. Archivo propuesto: app/lib/dominio/tirada/tabla_d4.dart, a alinear con la estructura de TAO-249.
Contrato: rollback: git revert del commit; archivo nuevo sin consumidores fuera del ticket.. Status: done

#### S1.T2 — Handler de Retroceso (HU-06-14) sobre la unidad de trabajo de HU-06-02. Recibe la transacción, la consulta y la tirada validada. Inserta paso_recorrido (tipo tirada, numero_paso siguiente, local_date, timezone_id) y tirada_revision 1 vigente (resultado retroceso, anillo_destino = d8, fuerza_kipot, clasificacion_d4_version, lanzada_por consultante). Actualiza la consulta: casa_actual = destino, paso_actual_id, plan_actual_id NULL, fase acciones_en_curso, motivo_bloqueo NULL y version + 1. No confirma, no crea ciclos ni cumplimientos y devuelve el DTO ResultadoRetroceso {casaDestino, anilloDestino, fuerzaKipot, versionD4, pasoId}. Columnas en esquema_v1.dart:81-106 y :152-187.
Contrato: rollback: git revert del commit; sin migración, los datos de prueba se descartan con la base efímera.. Status: done

#### S1.T3 — Guarda de reparación pendiente en la política compartida de HU-06-02. Detecta fase acciones_en_curso, plan_actual_id NULL y última revisión vigente con resultado retroceso, y lanza el error tipado de reparación pendiente del catálogo (código estable sin valores de la persona), distinto del de plan incompleto. Si el catálogo no lo tiene, agregarlo ahí avisando antes (advertencia b).
Contrato: rollback: git revert del commit; si se tocó el catálogo de HU-06-02, revertir esa entrada en el mismo commit.. Status: done

#### S1.T4 — Tests del handler y de la guarda invocando directamente el handler real dentro de la unidad de trabajo sobre Drift en memoria, con consultas y planes sembrados (patrón insertarConsulta/insertarPaso de app/test/drift/checks_test.dart:44-78). Casos: QA-06-14-01..04; 1760 combinaciones con print del conteo; tabla D4 de 1..4 y su versión; resultado tipado tras inicio, Avance a 8 y Retroceso a 3 en anillo 2; 0 ciclos y cumplimientos; relectura tras cerrar y reabrir una base de archivo temporal; ausencia de valores de la persona en el error.
Contrato: rollback: git revert del commit de tests.. Status: done

#### S2.T1 — Clasificador puro clasificarMovimiento(casaActual, d12) que devuelve resultado (avance, permanencia, retroceso, cierre) y casaDestino según doc 03 y DEC-028 (12 es cierre; mayor es avance; igual es permanencia; menor es retroceso), y validador de rangos que lanza un error de validación nombrando el dado (D12 1..12, D8 1..8, D4 1..4). Archivo propuesto: app/lib/dominio/tirada/clasificador.dart.
Contrato: rollback: git revert del commit; función pura sin consumidores externos.. Status: done

#### S2.T2 — Registro de Avance y Permanencia con idempotencia. Guardas de estado y fase de HU-06-02: activa y lista_para_tirada; el resto, error tipado. Búsqueda previa por el ULID del paso: si existe con los mismos dados devuelve el resultado previo; si los dados difieren, error de conflicto de idempotencia sin escribir. Inserta paso_recorrido y tirada_revision 1 vigente con D4 numérico y fuerza, anillo y versión nulos, y actualiza casa_actual y paso_actual_id en la misma transacción.
Contrato: rollback: git revert del commit; sin migración.. Status: done

#### S2.T3 — Tests: 132 combinaciones del clasificador con print del conteo y los casos literales (Casa 4 con 7/4/2/12, Casa 1 con 1, Casa 11 con 12); rangos (QA-06-04-03 y bordes 0, 13, 5); guardas de fase (esperando_conexion, esperando_material, acciones_en_curso, completada); QA-06-04-01; QA-06-04-02 y QA-06-04-04 de idempotencia y conflicto, con conteos de filas antes y después.
Contrato: rollback: git revert del commit de tests.. Status: done

#### S3.T1 — Orquestador de la entrada pública registrarTirada({consultaId, pasoUlid, d12, d8, d4, localDate, timezoneId}). Abre una sola unidad de trabajo de HU-06-02 y en orden valida rangos, chequea idempotencia, aplica las guardas (incluida la de reparación pendiente), clasifica y despacha una sola vez. Avance y Permanencia: registro de la sesión 2 más el generador de plan de HU-06-05 (fase acciones_en_curso, plan_actual_id). Retroceso: handler de la sesión 1. Cierre: handler de HU-06-15. Sin escrituras duplicadas, sin red ni unidades remotas y un único commit. Requiere #150 y #151 integrados en epic/EP-06.
Contrato: rollback: git revert del commit; los handlers de las sesiones 1 y 2 siguen funcionando por sí solos.. Status: pending

#### S3.T2 — Actualizar solo si hace falta el estado de HU-06-14 y HU-06-04 en docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md y docs/PLAN.md, dejándolos compliant con el linter de docs sin tocar .docs-baseline.txt.
Contrato: rollback: git revert del commit de docs.. Status: pending

#### S3.T3 — Tests de integración por la entrada pública sobre Drift: QA-06-04-05 (Avance con plan y acciones_en_curso; Permanencia con plan de permanencia; Retroceso sin plan con anillo y fuerza; Cierre completada; 1 paso y 1 revisión cada uno); fallo inyectado en el generador de plan con rollback total (consulta, paso y revisión iguales a antes); reintento público con el mismo ULID tras Retroceso; relectura de las cuatro clases tras cerrar y reabrir la base; regresión de checks_test y migration_test.
Contrato: rollback: git revert del commit de tests.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Test visible en app/test/dominio/tirada/retroceso_handler_test.dart que pasa: imprime 'retroceso: 1760 combinaciones', cubre QA-06-14-01..04, la guarda de reparación pendiente y la relectura tras reabrir la base Drift.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Tests de clasificador y registro que pasan: imprimen 'clasificacion: 132 combinaciones', rechazan d8 = 9 nombrando D8, rechazan las fases no admitidas y muestran un solo paso ante un reintento con el mismo ULID o un conflicto con dados distintos.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Test del orquestador público que pasa: registra Avance, Permanencia, Retroceso y Cierre cada uno en un solo commit, revierte todo si falla el plan del Avance y la relectura tras reabrir la base coincide; pnpm run docs:check en verde si se tocaron docs.

### Session 4 · T0 · open
