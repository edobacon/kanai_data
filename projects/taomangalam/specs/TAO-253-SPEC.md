---
id: TAO-253-SPEC
project: taomangalam
ticket: TAO-253
status: approved
---

# TAO-253 · Proyecciones reactivas de consulta (Inicio, listado y rastro) y corrección de la última tirada por supersede en una transacción (HU-06-08, HU-06-07)

## Resumen ejecutivo

Qué se hace: (1) HU-06-08: el motor expone un DTO inmutable por consulta con estado, fase, motivo, casa, paso y plan actual, último movimiento, tarea vigente 'día n de m' y rastro con casa y anillo. Incluye el listado de Inicio por estado sobre el índice de HU-06-01, la operación de recálculo de proyecciones desde pasos, revisiones y planes, y providers reactivos que no emiten estados intermedios. (2) HU-06-07: vista previa pura de la corrección de la última tirada y aceptación por supersede (revisión N+1, la anterior sustituida, plan sustituido y enlazado, evento_plan y proyecciones recalculadas) en una sola transacción, con las ramas Retroceso, Cierre y desde Retroceso. Qué NO se hace: widgets ni animación (EP-05/EP-07, HU-07-11), orden, filtros y búsqueda (HU-05-11), diagnóstico con reconocimiento (HU-06-09), auditoría de servidor ni migración de esquema. Cómo se verifica: tests unitarios y de integración Drift con los criterios literales (rastro 1,3,3; 'día 2 de 3'; Avance 4 a 6 corregido a D12=3 da Retroceso 4 a 3; rollback deja la revisión 1 vigente; vista previa obsoleta rechazada) y EXPLAIN QUERY PLAN con 50 consultas usando el índice. Tamaño: 8 puntos, 4 sesiones (2 por historia), riesgo medio. ADVERTENCIAS: el ticket está Blocked por HU-06-04/HU-06-14 (G4), HU-06-05 (G2) y HU-06-15 (G3). Este plan consume sus resultados tipados (retroceso, cierre, generador de plan y error de consulta completada) y no los implementa. Si al iniciar no están integrados en epic/EP-06, la ejecución no debe arrancar. El baseline citado (main debeb05f) debe actualizarse al iniciar. El contexto de código solo muestra el esquema v1 a v3 (app_database.dart: versionEsquemaLocal = 3) y no la capa v4 de TAO-249, por lo que las rutas de los archivos nuevos son inferidas.

Datos a confirmar antes de ejecutar:
- Ruta y API de la capa de repositorios transaccional y reactiva de TAO-249 (HU-06-01/02): nombre del método de transacción, del stream reactivo y del DAO append-only genérico. Confirmar en app/lib/data/ de epic/EP-06.
- Nombre del índice de Inicio creado por HU-06-01 y su versión de esquema (v4). Confirmar en app/lib/data/drift/esquema_v4.dart, o donde lo deje TAO-249.
- Firma del generador de plan de HU-06-05 (entrada: revisión vigente; salida: plan_practica más acciones) y si admite la inyección de una falla para QA-06-07-03.
- Tipos exactos del resultado tipado de retroceso de HU-06-14 (casa de retorno, anillo, fuerza del kipot), del resultado de cierre de HU-06-15 y del error tipado de consulta completada.
- Esquema de evento_plan (columnas de tipo, fecha local y zona) y el valor de tipo para la sustitución. Confirmar en tecnologia/20 y en el esquema v4.
- Cómo se marca 'kuberani renovado validado en línea' en la cola legal local (esquema v3) para la advertencia de la vista previa.
- Librería de providers vigente en app/ (Riverpod u otra) y la carpeta de features del motor (se asume app/lib/motor/ y app/test/motor/).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:81

El motor devuelve un resumen inmutable por consulta con consulta_id, título, estado, fase, motivo_bloqueo, casa_actual, paso_actual_id, plan_actual_id, último movimiento (resultado, casa de origen y destino, fecha de la revisión vigente) y tarea vigente (acción pendiente del plan actual con 'día n de m'). Tras un Retroceso, el último movimiento informa casa de origen, casa de retorno, anillo y fuerza, y la tarea vigente queda vacía con el aviso de reparación.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:136

El rastro de una consulta es la secuencia de posiciones (casa y anillo, con su resultado) ordenada por numero_paso. Se toma de la revisión vigente de cada paso (inicio en Casa 1 y cada destino), excluye las revisiones sustituidas y los pasos con rehecho_por_paso_id, y toma la casa y el anillo del resultado tipado de HU-06-14.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:102

El motor lista las consultas del espacio local por estado para Inicio. Usa el índice de Inicio de HU-06-01, lee solo las proyecciones de consulta sin recorrer los pasos de cada consulta (lectura acotada, O(consultas) y no O(pasos)) y excluye las descartadas de las activas.

### REQ-04 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:91

Existe una operación de recálculo que reconstruye casa_actual, paso_actual_id, plan_actual_id y fase desde pasos, revisiones vigentes y planes. Cada comando que cambia esas proyecciones las actualiza en su misma transacción, y tras un reinicio el resumen se reconstruye igual desde Drift.

### REQ-05 `confirmed`
> Fuente: inferred: capa reactiva de TAO-249 (HU-06-02)

Providers reactivos del resumen, del listado de Inicio y del rastro, que emiten al cambiar cualquier dato que afecta la proyección (cumplimiento, paso, revisión, plan o consulta) y no emiten un estado intermedio ante un rollback.

### REQ-06 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:152

La vista previa de la corrección de la última tirada es pura: con la misma consulta y el mismo catálogo devuelve el movimiento, el destino y las acciones actuales frente a los corregidos sin escribir nada, e incluye la advertencia de unidad no devuelta cuando corrige una Permanencia cuyo kuberani renovado ya se validó en línea.

### REQ-07 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:149

Aceptar la corrección crea una tirada_revision con numero_revision siguiente, motivo_correccion_tipo (error_tipeo, error_lectura_dado, otro), texto obligatorio si es 'otro', corregida_at obligatorio, corregida_por_cuenta_id nulo en el espacio local y sustituye_revision_id. Además marca la anterior como sustituida, apunta paso.revision_vigente_id a la nueva, deja el plan anterior sustituido con sustituido_por_plan_id hacia el plan nuevo de HU-06-05 (los cumplimientos del anterior se conservan), registra un evento_plan de sustitución con fecha local y zona, y recalcula las proyecciones con REQ-04. Todo ocurre en una transacción, sin consumir ni reembolsar unidades.

### REQ-08 `confirmed`
> Fuente: inferred: error tipado de consulta completada de HU-06-15 (G3)

La corrección se rechaza con error tipado, sin escrituras, cuando el paso no es el último de la consulta, cuando la última tirada cambió entre la vista previa y la aceptación, o cuando la consulta está completada (en este caso reutiliza el error de HU-06-15).

### REQ-09 `confirmed`
> Fuente: inferred: resultados tipados de HU-06-14 (G4) y HU-06-15 (G3)

Una corrección que produce un Retroceso aplica HU-06-14 (anillo, fuerza, espera de la reparación sin plan nuevo) y una que produce un Cierre aplica HU-06-15 (consulta completada), en la misma transacción. Al corregir un Retroceso vigente a Avance o Permanencia se genera el plan nuevo y la consulta sale de la espera; al corregirlo a otro Retroceso se actualizan anillo, fuerza y casa de retorno.

### REQ-10 `confirmed` `enforcement`
> Fuente: inferred: DAO append-only de TAO-249 (HU-06-02)

El supersede usa una operación específica que solo cambia la marca de vigencia autorizada por tecnologia/20. El DAO append-only genérico conserva su prohibición de update y delete, dados, motivos, timestamps y contenido de la revisión sustituida quedan intactos, ante un fallo se revierte también la marca (siempre hay exactamente una revisión vigente por paso) y el motivo libre no se escribe en logs.

### REQ-11 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/app_database.dart:22

Las proyecciones y la corrección se construyen sobre la capa existente: reutilizan la transacción y los streams de TAO-249, el generador de plan de HU-06-05 y los resultados tipados de HU-06-14 y HU-06-15, sobre las columnas que ya existen en el esquema (sin migración nueva) y sin widgets de EP-05 ni de EP-07.

### REQ-12 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo documento que el ticket modifique (EP-06, SCHEMA.md, modelo de datos v2 o PLAN.md, que están en .docs-baseline.txt) queda compliant con el linter de docs sin tocar el baseline.
## Tasks

#### S1.T1 — Definir el DTO inmutable ResumenConsulta (consulta_id, titulo, estado, fase, motivo_bloqueo, casa_actual, paso_actual_id, plan_actual_id, UltimoMovimiento con resultado, casa_origen, casa_destino, fecha, y para Retroceso casa de retorno, anillo, fuerza y aviso de reparación; TareaVigente con acción, día n y m) y PosicionRastro (numero_paso, casa, anillo, resultado), con igualdad por valor. Ubicación inferida: app/lib/motor/proyecciones/.
Contrato: rollback: Revertir el commit; son tipos nuevos sin consumidores.. Status: done

#### S1.T2 — Implementar las lecturas de composición sobre la capa de TAO-249: resumen por consulta (último movimiento desde la revisión vigente del paso_actual_id; tarea vigente desde la acción pendiente de plan_actual_id contando cumplimientos para obtener 'día n de m'; Retroceso con el resultado tipado de HU-06-14 y la tarea vacía) y rastro (paso_recorrido ordenado por numero_paso, join a tirada_revision por revision_vigente_id, filtro rehecho_por_paso_id IS NULL y deleted_at IS NULL, casa y anillo desde el resultado tipado de HU-06-14).
Contrato: rollback: Revertir el commit; solo agrega lecturas.. Status: done

#### S1.T3 — Implementar la operación recalcularProyecciones(consultaId, executor), que deriva casa_actual, paso_actual_id, plan_actual_id y fase desde pasos, revisiones vigentes y planes (el plan no sustituido más reciente; null si espera reparación o si es un Cierre) y las escribe dentro de la transacción recibida, sin abrir una propia, para que HU-06-07 la reutilice.
Contrato: rollback: Revertir el commit; las proyecciones se recalculan desde los datos base.. Status: done

#### S1.T4 — Escribir test/motor/proyecciones/resumen_rastro_test.dart con Drift en memoria: casos de REQ-01 (borrador, esperando_conexion con validar_kuberani_inicio, día 2 de 3, Retroceso 8 a 3 anillo 2 con tarea vacía, QA-06-08-01), REQ-02 (1,3,3; Casa 3 anillo 2; revisión sustituida; rehecho omitido) y REQ-04 (QA-06-08-02 recálculo tras borrar a mano, reapertura de una base en archivo temporal con resumen igual).
Contrato: rollback: Eliminar el archivo de test.. Status: done

#### S2.T1 — Implementar la lectura del listado de Inicio por estado sobre el índice de HU-06-01, solo con columnas de consulta (proyecciones), sin joins a paso_recorrido por consulta y excluyendo descartadas de las activas (lectura acotada O(consultas)).
Contrato: rollback: Revertir el commit; solo agrega una lectura.. Status: pending

#### S2.T2 — Exponer los providers reactivos del resumen, del listado de Inicio y del rastro sobre los streams de TAO-249, observando consulta, paso_recorrido, tirada_revision, plan_practica, accion_practica y ciclo_practica (cumplimientos). Deben emitir solo tras el commit de la transacción y con distinct por igualdad de DTO.
Contrato: rollback: Revertir el commit; los providers no tienen consumidores aún.. Status: pending

#### S2.T3 — Conectar recalcularProyecciones (o la actualización directa equivalente) dentro de la transacción de cada comando existente que cambia paso_actual_id, plan_actual_id o casa_actual (registrar inicio y tirada, aplicar retroceso y cierre), sin cambiar sus firmas públicas. Antes de tocarlos, listar sus consumidores con grep y reportar el impacto.
Contrato: rollback: Revertir el commit; los comandos vuelven a su escritura previa de proyecciones.. Status: pending

#### S2.T4 — Escribir test/motor/proyecciones/inicio_reactivo_test.dart: 50 consultas sembradas con EXPLAIN QUERY PLAN impreso y verificado (USING INDEX sin SCAN paso_recorrido), QA-06-08-03 descartada excluida, conteo por estado, provider que emite al marcar un día desde otro repositorio, ausencia de emisión ante una transacción que lanza, y comando de tirada que deja las proyecciones actualizadas en la misma transacción. Correr además los tests existentes de test/drift como regresión de REQ-11.
Contrato: rollback: Eliminar el archivo de test.. Status: pending

#### S3.T1 — Implementar la vista previa pura vistaPreviaCorreccion(consultaId, pasoId, dadosCorregidos): calcula el movimiento y el destino corregidos con el motor de resultado existente y las acciones del plan que generaría HU-06-05 sin persistir, frente al actual, e incluye la advertencia unidadNoDevuelta si corrige una Permanencia con el kuberani renovado validado. Sin escrituras: solo lecturas, fuera de transacción de escritura.
Contrato: rollback: Revertir el commit; operación nueva sin escrituras.. Status: pending

#### S3.T2 — Implementar la operación específica de supersede (fuera del DAO append-only genérico, que mantiene la prohibición de update y delete): en una transacción, validar motivo_correccion_tipo y el texto si es 'otro', insertar tirada_revision con numero_revision+1, sustituye_revision_id, corregida_at y corregida_por_cuenta_id null en el espacio local, cambiar solo estado='sustituida' de la anterior, apuntar paso.revision_vigente_id a la nueva, marcar el plan anterior sustituido con sustituido_por_plan_id hacia el plan nuevo de HU-06-05 (con sustituye_plan_id), conservar cumplimientos, insertar evento_plan de sustitución con fecha local, zona y aceptación de la advertencia, y llamar a recalcularProyecciones. No toca unidades ni la cola hacia el servidor, y el texto libre no va a logs.
Contrato: rollback: Revertir el commit; operación nueva y la base efímera de prueba se descarta.. Status: pending

#### S3.T3 — Escribir test/motor/correccion/supersede_test.dart: vista previa 4 a 6 con D12=4 y volcado idéntico tras cancelar, advertencia de kuberani, aceptación con revisión 2, plan sustituido, evento y proyecciones, validación de 'otro' sin texto y sin tipo, revisión 3, espacio sin cuenta, cumplimientos conservados, QA-06-07-01, QA-06-07-03 con falla inyectada, DAO genérico que sigue prohibiendo update y delete, campos de la sustituida intactos y logs sin el motivo libre.
Contrato: rollback: Eliminar el archivo de test.. Status: pending

#### S4.T1 — Agregar al supersede las validaciones previas dentro de la transacción: revalidar que el paso es el último de la consulta (numero_paso máximo no rehecho), que la revisión vigente coincide con la de la vista previa (si no, error de última tirada cambiada) y que la consulta no está completada (error tipado de HU-06-15). Todos los rechazos ocurren antes de cualquier escritura.
Contrato: rollback: Revertir el commit; el supersede vuelve a no revalidar.. Status: pending

#### S4.T2 — Agregar las ramas según el resultado corregido en la misma transacción: Retroceso con HU-06-14 (anillo, fuerza, casa de retorno, sin plan nuevo, plan_actual_id null), Cierre con HU-06-15 (completada), Retroceso vigente a Avance o Permanencia (genera el plan nuevo y la fase pasa a acciones_en_curso) y Retroceso a Retroceso (actualiza anillo, fuerza y retorno, sigue en espera).
Contrato: rollback: Revertir el commit; el supersede queda solo con las ramas Avance y Permanencia.. Status: pending

#### S4.T3 — Si se actualiza el estado de HU-06-08/HU-06-07 en docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md u otro doc del baseline, dejarlo compliant con el linter sin tocar .docs-baseline.txt.
Contrato: rollback: Revertir el commit de docs.. Status: pending

#### S4.T4 — Escribir test/motor/correccion/ramas_rechazos_test.dart: QA-06-07-02 (no última tirada), QA-06-07-04 (vista previa obsoleta, sin cambios en revisiones, planes ni unidades), consulta completada con el error de HU-06-15, 4 a 6 corregido a D12=3 que da Retroceso 4 a 3, D12=12 que da Cierre y completada, QA-06-07-05 (Retroceso a Avance y Retroceso a Retroceso) y QA-06-08-04 (providers de Inicio y rastro con un único estado confirmado y tarea vacía). Verificar además que git diff de .docs-baseline.txt queda vacío.
Contrato: rollback: Eliminar el archivo de test.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Pasa test/motor/proyecciones/resumen_rastro_test.dart con el resumen (borrador, esperando_conexion, día 2 de 3, Retroceso con anillo y fuerza) y el rastro (1,3,3; Casa 3 anillo 2; omite rehecho y sustituidas), y el recálculo reproduce las proyecciones borradas a mano.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Pasa test/motor/proyecciones/inicio_reactivo_test.dart: el EXPLAIN QUERY PLAN con 50 consultas usa el índice sin SCAN de paso_recorrido, las descartadas no aparecen y el provider del resumen emite 'día 3 de 3' al marcar un día desde otro repositorio, sin emitir tras un rollback.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Pasa test/motor/correccion/supersede_test.dart: la vista previa de 4 a 6 con D12=4 devuelve Permanencia frente a Avance sin cambiar ningún volcado de tablas, y la aceptación deja la revisión 2 vigente, la 1 sustituida, el plan sustituido y enlazado, el evento_plan y las proyecciones corregidas; con una falla inyectada, la revisión 1 sigue vigente.

### Session 4 · T2 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T2
- [ ] S4.T3
- [ ] S4.T4

**Gate (auto)**: Pasa test/motor/correccion/ramas_rechazos_test.dart: el Avance de 4 a 6 corregido a D12=3 queda como Retroceso de 4 a 3 en espera sin plan, el corregido a D12=12 deja la consulta completada, el Retroceso corregido a Avance queda en acciones_en_curso, los rechazos tipados no escriben nada y los providers emiten un único estado confirmado (QA-06-08-04); pnpm run docs:check en verde.

### Session 5 · T0 · open
