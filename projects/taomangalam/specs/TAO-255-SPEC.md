---
id: TAO-255-SPEC
project: taomangalam
ticket: TAO-255
status: approved
---

# TAO-255 · Diagnóstico del retroceso con intentos de reconocimiento append-only, lectura pendiente, remisión frente a permanencia y recorrido persistente (HU-06-09)

## Resumen ejecutivo

Se agrega la migración Drift v6 con diagnostico_retroceso e intento_reconocimiento, más el backfill idempotente de los Retrocesos vigentes de M1a. También se crea el diagnóstico sin_intento dentro de la transacción del Retroceso. Además se incluyen el registro append-only de intentos con su proyección, la fase lectura_pendiente, la guarda de tirada, el reconocimiento tardío, el diagnóstico propio en la corrección, la regla de remisión frente a permanencia (reemplaza el valor siempre falso de M1a) y la proyección del recorrido persistente.
NO incluye: plan de reparación, corrector, quema ni reposición (HU-06-10), ciclos RKL (HU-06-11), pantallas V-09/V-10, presentación V-13 (HU-08-10) ni renumeración multi-dispositivo (EP-09).
Cómo se sabe que funciona: los tests de migración v6 sobre una base M1a efímera (doble corrida, QA-06-09-02 y QA-06-09-06), los tests de intentos y fase (QA-06-09-01, 03 y 05), los de remisión y permanencia (QA-06-09-04) y los de relectura tras reabrir la base quedan en verde. Además, pnpm run check queda en verde con los docs actualizados.
Tamaño: 3 sesiones (T2, T3, T2), 5 puntos publicados. ADVERTENCIA: el propio request declara riesgo de desborde de la estimación; el plan no agrega alcance y cabe en el techo de 4 sesiones. ADVERTENCIA de bloqueo: depende de que HU-06-14/04 (G4), HU-06-07 (G5) y HU-06-06 (G6) estén integrados en epic/EP-06; actualizar el SHA baseline (debeb05f) al iniciar.
Datos a confirmar antes de ejecutar: (1) si el check de consulta.fase en el esquema v5 ya admite 'lectura_pendiente'; si no lo admite, la v6 debe recrear consulta con el patrón de 12 pasos de esquema_v3.dart, y eso pasa a ser un data_rewrite que requiere aprobación. Se confirma en app/lib/data/drift/esquema_v1.dart y esquema_v5.dart. (2) Los nombres exactos de las clases de error 'reparación pendiente' y 'etapa ya resuelta' del catálogo de HU-06-02 (se confirman en la capa de errores tipados de app/lib/data, junto a ErrorTransicionInvalida). (3) El archivo y la clase del handler de Retroceso de TAO-252, el del supersede de TAO-253 y el del conteo de días de HU-06-06 (EvaluadorRetraso u otro). (4) La ruta de los tests de migración existentes en app/test, para ubicar migracion_v6_test.dart junto a ellos. (5) El punto de HU-06-05 donde vive el valor 'venido de reparación' siempre falso.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 al request (Q1, 2026-10-11)

La migración Drift v6 (el esquema vigente es v5, la migración nueva es v6) crea diagnostico_retroceso (tirada_revision_id único, estado_reconocimiento con check sin_intento|reconocido|no_reconocido_continuar|lectura_pendiente, ultimo_intento_id nullable, sin columna anillo_destino) e intento_reconocimiento (diagnostico_id, numero_intento, occurred_at_utc, local_date, timezone_id, resultado reconocido|no_reconocido, decision nullable continuar_reparacion|lectura_pendiente, patron_reconocido nullable, confirmado_por_cuenta_id nullable, device_origin_id) con unique(diagnostico_id, numero_intento) y check de coherencia entre resultado y decision. La v6 NO recrea la tabla consulta: consulta_fase_check de esquema_v1 ya admite lectura_pendiente y no cambia hasta v5. Una instalación nueva nace con el mismo esquema.

### REQ-02 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:246

Al registrar un Retroceso se crea, en la misma transacción, su diagnóstico con estado_reconocimiento = sin_intento y la consulta sigue en acciones_en_curso sin plan. El paso de datos de la v6 crea de forma idempotente el diagnóstico sin_intento de cada revisión vigente de Retroceso de M1a que no lo tenga, sin tocar la revisión ni la consulta.

### REQ-03 `confirmed`
> Fuente: Adenda 1 al request (correcciones, 2026-10-11)

Registrar un intento (DEC-206) asigna un numero_intento correlativo por diagnóstico y guarda la fecha local, la zona y occurred_at_utc del momento. Exige decision solo si resultado = no_reconocido. En la misma transacción proyecta estado_reconocimiento según el último intento y deja ultimo_intento_id apuntando a ese intento; la proyección se puede recalcular desde los intentos. La inmutabilidad append-only se garantiza y se verifica por la API del registro EntidadAppendOnly: intento_reconocimiento no expone edición ni borrado (la llamada de edición lanza o no existe).

### REQ-04 `confirmed`
> Fuente: Adenda 1 al request (correcciones, 2026-10-11)

Un intento no_reconocido con lectura_pendiente (DEC-068) deja la consulta en fase = lectura_pendiente con motivo_bloqueo NULL y se puede repetir. No consume días, no abre ciclos ni reinicia el conteo (DEC-030). Un intento posterior reconocido o con continuar_reparacion devuelve la consulta a acciones_en_curso: tras dos intentos lectura_pendiente y un tercero reconocido, la consulta pasa de lectura_pendiente a acciones_en_curso. La espera no se asigna a plan_practica.estado.

### REQ-05 `inferred`
> Fuente: taomangalam/app/lib/data/confirmacion_dia.dart:208

Guarda y reconocimiento tardío (DEC-234 punto 5): registrar una tirada con el diagnóstico vigente en sin_intento o lectura_pendiente se rechaza con el error tipado de reparación pendiente del catálogo de HU-06-02. Con un plan de reparación ya generado, solo se admite un intento reconocido, que se guarda y actualiza la proyección sin tocar el plan; un no_reconocido se rechaza con el error tipado de etapa ya resuelta.

### REQ-06 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:240

Al corregir la tirada de un Retroceso (HU-06-07), si la revisión nueva sigue siendo Retroceso, crea su propio diagnóstico sin_intento. El diagnóstico anterior y sus intentos quedan ligados a la revisión sustituida y siguen legibles.

### REQ-07 `confirmed`
> Fuente: Adenda 1 al request (Q2, 2026-10-11)

Remisión frente a permanencia (DEC-028): una reparación completada es un plan_practica con estado 'completado' (check vigente en v5; HU-06-10 después solo produce ese estado y los tests de S3.T4 lo siembran directo en remision_permanencia_test.dart). En la tirada que sigue a esa reparación, D12 igual a la casa reparada es Permanencia (energización, sin plan de reparación) y el paso se marca como venido de una reparación con un enlace al paso del retroceso, derivado de ese paso sin columna nueva. D12 menor es un Retroceso nuevo con su propio diagnóstico sin_intento. Reemplaza el valor siempre falso de M1a (HU-06-05).

### REQ-08 `confirmed`
> Fuente: Adenda 1 al request (Q3 y correcciones, 2026-10-11)

La proyección del recorrido persistente (DEC-097) expone las etapas diagnostico, anillo, reparacion y coherencia, la etapa actual y las fechas de cada intento. La etapa coherencia aparece solo en las casas cuyo campo coherence en el catálogo practica.v1.json lo indica (lo parsea cargador_catalogo_practica; EP-06 indica casas 1 a 11), sin constante duplicada en el código. Una etapa solo se habilita cuando la anterior está resuelta: tras el intento reconocido la etapa actual avanza de diagnostico a anillo. La fase lectura_pendiente alimenta la etiqueta 'Lectura pendiente' de V-03 (DEC-233 punto 6).

### REQ-09 `inferred`
> Fuente: taomangalam/app/lib/data/ciclo_practica.dart:253

Observabilidad y privacidad: el rechazo de un intento inválido y el de una tirada con diagnóstico sin resolver devuelven códigos estables sin datos de la persona. patron_reconocido no se escribe en logs y queda NULL en M1b.

### REQ-10 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/data/confirmacion_dia.dart:219

Se reutilizan los patrones existentes: SQL explícito versionado por esquema (esquema_vN.dart con lista de sentencias), DaoMutables para el diagnóstico, una entrada de EntidadAppendOnly para intento_reconocimiento (sin update ni delete), ContextoTransaccional con tocar() para la reactividad, MomentoNegocio para occurred_at_utc, local_date y timezone_id, y los errores tipados del catálogo de HU-06-02. No se crean DAOs, relojes ni errores paralelos.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

Las tablas diagnostico_retroceso e intento_reconocimiento y la migración v6 (con su paso de datos) se documentan en docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md, con el esquema vigente v5 como punto de partida, y la ficha de HU-06-09 se actualiza en docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md, con el baseline SHA al día. No requiere runbook porque no hay superficie operativa nueva (es motor local en la app).

### REQ-12 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Los docs tocados (EP-06, el modelo de datos v2 incremental y docs/PLAN.md si aplica) quedan conformes con el linter de docs: pnpm run check pasa y ningún doc sale del baseline .docs-baseline.txt.
## Tasks

#### S1.T1 — Crear app/lib/data/drift/esquema_v6.dart con sentenciasEsquemaV6 (mismo patrón que esquema_v3.dart:12, SQL explícito) que crea diagnostico_retroceso e intento_reconocimiento con los checks de tecnologia/20 §4 y §11, la unique(diagnostico_id, numero_intento) y la unicidad de tirada_revision_id; incorporarlas a onCreate y a onUpgrade a v6, y subir schemaVersion a 6. Verificar antes si el check de consulta.fase admite 'lectura_pendiente' (ver Datos a confirmar).
Contrato: rollback: Revertir el commit (la v6 no se publicó); si ya se publicó, migración v7 compatible hacia adelante.. Status: pending

#### S1.T2 — Agregar a la v6 el backfill idempotente: INSERT en diagnostico_retroceso (estado sin_intento) por cada tirada_revision con estado='vigente' y resultado='retroceso' que no tenga diagnóstico (WHERE NOT EXISTS), sin UPDATE sobre tirada_revision ni consulta.
Contrato: rollback: Revertir el commit; en datos ya migrados, operación compensatoria transaccional sin borrar revisiones.. Status: pending

#### S1.T3 — Ampliar el handler de Retroceso de HU-06-14 (TAO-252) para crear el diagnóstico sin_intento con DaoMutables dentro del mismo ContextoTransaccional que registra la tirada_revision, llamar a contexto.tocar() y dejar la consulta en acciones_en_curso sin plan.
Contrato: rollback: Revertir el commit del handler; el resto del registro de tirada queda igual.. Status: pending

#### S1.T4 — Tests: app/test/data/drift/migracion_v6_test.dart (base v5 efímera con consultas M1a esperando la reparación, onUpgrade, doble corrida, conservación de paso, dados, anillo y fuerza, igualdad entre onCreate y onUpgrade, checks y unicidad, QA-06-09-02, 03 y 06) y app/test/data/diagnostico_retroceso_test.dart (creación del diagnóstico en el Retroceso de Casa 8 con D12 3, D8 2 y D4 1, rollback ante un fallo).
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending

#### S1.T5 — Actualizar el baseline observado de main (SHA) y el esquema vigente en la ficha de HU-06-09 de docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md y en docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md: el esquema vigente es v5 y la migración nueva es v6 (esquema_v6.dart), que NO recrea consulta. Dejar los docs conformes con el linter (.docs-baseline.txt).
Contrato: rollback: git checkout -- docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md. Status: pending

#### S2.T1 — Implementar el registro de intentos de reconocimiento con su proyección, la fase lectura_pendiente, la guarda y la corrección.
Contrato: rollback: Revertir los commits de la sesión; el esquema v6 de S1 queda sin uso y no rompe nada.. Status: pending

#### S2.T1.1 — Registrar intento_reconocimiento como EntidadAppendOnly (junto a eventoPlan) y crear el servicio de registro: numero_intento = MAX+1 por diagnóstico, MomentoNegocio para occurred_at_utc, local_date y timezone_id, validación de decision según resultado antes de escribir, y proyección de estado_reconocimiento y ultimo_intento_id en la misma transacción, más una función de recálculo desde los intentos. Sin métodos de edición ni borrado.
Contrato: rollback: Revertir el commit del servicio y la entrada del enum.. Status: pending

#### S2.T1.2 — Transición de fase: lectura_pendiente pone consulta.fase='lectura_pendiente' y motivo_bloqueo=NULL; reconocido o continuar_reparacion devuelve la fase a acciones_en_curso. No escribe en plan_practica, ciclos ni cumplimientos, y el conteo de HU-06-06 trata lectura_pendiente como una fase sin días omitidos ni reinicio.
Contrato: rollback: Revertir el commit de la transición.. Status: pending

#### S2.T1.3 — Guarda en el orquestador de tirada (TAO-252): si el diagnóstico de la revisión vigente está en sin_intento o lectura_pendiente, lanza el error tipado de reparación pendiente del catálogo de HU-06-02. Reconocimiento tardío: con plan_actual_id de reparación ya generado, admite solo reconocido (sin tocar el plan) y rechaza no_reconocido con el error de etapa ya resuelta. Los códigos son estables y los mensajes no llevan datos personales ni patron_reconocido.
Contrato: rollback: Revertir el commit de la guarda.. Status: pending

#### S2.T1.4 — En el supersede de HU-06-07 (TAO-253): si la revisión nueva es Retroceso, crear su diagnóstico sin_intento en la misma transacción; el diagnóstico anterior queda ligado a la revisión sustituida.
Contrato: rollback: Revertir el commit del ajuste al supersede.. Status: pending

#### S2.T2 — Tests en app/test/data/intento_reconocimiento_test.dart: QA-06-09-01, la secuencia lectura_pendiente, lectura_pendiente y reconocido con los intentos 1, 2 y 3 sin cambios, la validación de decision sin escritura, los cuatro días sin omitidos, la guarda de tirada (sin_intento y lectura_pendiente), QA-06-09-05, el tardío reconocido con el plan intacto (se usa un plan de reparación sembrado como fixture), la corrección de Retroceso a Retroceso y a Avance, la relectura tras cerrar y reabrir la base, y los códigos de error sin datos personales.
Contrato: rollback: Borrar el archivo de test nuevo.. Status: pending

#### S2.T2.1 — Crear app/test/data/intento_reconocimiento_test.dart con los fixtures compartidos: base Drift efímera en v6, consulta con un Retroceso de Casa 11 a Casa 8 y su diagnóstico sin_intento, MomentoNegocio con reloj fijo (fecha local y zona controladas) y un plan de reparación sembrado como fixture para los casos de reconocimiento tardío.
Contrato: rollback: Borrar el archivo de test nuevo.. Status: pending

#### S2.T2.2 — Grupo 'registro y proyeccion': QA-06-09-01 (no_reconocido con continuar_reparacion da no_reconocido_continuar y fase acciones_en_curso), la secuencia lectura_pendiente, lectura_pendiente y reconocido con los intentos 1, 2 y 3 y las filas 1 y 2 sin cambios, ultimo_intento_id igual al id del intento 3, y el recálculo desde los intentos igual a la proyección guardada.
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S2.T2.3 — Grupo 'validacion y append-only': no_reconocido sin decision y reconocido con decision se rechazan con el error de validación y COUNT(intento_reconocimiento) no cambia; el código del error es constante y su mensaje o toString no contiene ids de cuenta ni texto de la persona; patron_reconocido queda NULL; el DAO no expone edición ni borrado de intentos (EntidadAppendOnly).
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S2.T2.4 — Grupo 'fase lectura_pendiente': el intento 1 con lectura_pendiente guarda local_date y timezone_id, deja la fase en lectura_pendiente con motivo_bloqueo NULL; cuatro días locales en lectura_pendiente no dan días omitidos ni reinicio en el conteo de HU-06-06; continuar_reparacion devuelve la fase a acciones_en_curso; no se crean ni modifican filas de plan_practica, ciclo_practica ni cumplimiento_dia.
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S2.T2.5 — Grupo 'guarda y tardio': registrar una tirada con el diagnóstico en sin_intento y en lectura_pendiente se rechaza con el error de reparación pendiente sin crear tirada_revision; con el plan sembrado, un reconocido tardío crea el intento nuevo, la proyección pasa a reconocido y el plan conserva acciones, dias_requeridos, estado y version; QA-06-09-05 (no_reconocido con lectura_pendiente rechazado con el error de etapa ya resuelta, sin cambios en el plan ni en la fase).
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S2.T2.6 — Grupo 'correccion': un Retroceso con 2 intentos corregido a otro Retroceso deja un diagnóstico nuevo sin_intento en la revisión vigente y el anterior con sus 2 intentos intactos ligado a la sustituida; corregido a Avance no crea diagnóstico nuevo y el anterior sigue legible; después de la corrección la guarda evalúa solo el diagnóstico de la revisión vigente.
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S2.T2.7 — Grupo 'persistencia y reactividad': después de cerrar y reabrir la base (sin red) el intento y la proyección leídos son iguales a los de antes de cerrar; registrar un intento notifica a los listeners de diagnostico_retroceso y consulta (contexto.tocar()).
Contrato: rollback: Quitar el grupo del archivo de test.. Status: pending

#### S3.T1 — Reemplazar el valor siempre falso de M1a (HU-06-05) por la derivación de remisión frente a permanencia: tras una reparación completada, D12 igual a la casa reparada da Permanencia con energización y un enlace derivado al paso del retroceso (sin columna nueva); D12 menor da un Retroceso nuevo con diagnóstico sin_intento (reutiliza S1.T3).
Contrato: rollback: Revertir el commit; vuelve al valor falso de M1a.. Status: pending

#### S3.T2 — Proyección del recorrido persistente: etapas diagnostico, anillo, reparacion y coherencia (solo si la casa la indica), etapa actual con habilitación secuencial y fechas de los intentos; exponer la fase lectura_pendiente a la proyección de listado de TAO-253 para la etiqueta 'Lectura pendiente' de V-03.
Contrato: rollback: Revertir el commit de la proyección.. Status: pending

#### S3.T3 — Documentar en docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md las tablas diagnostico_retroceso e intento_reconocimiento, el esquema v6 y el backfill; actualizar la ficha de HU-06-09 en docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md con el archivo y el nombre completo de los tests y el estado antes y después. Dejar los docs conformes con el linter respecto de .docs-baseline.txt.
Contrato: rollback: Revertir el commit de docs.. Status: pending

#### S3.T4 — Tests en app/test/data/remision_permanencia_test.dart (Casa 5 con D12 5, Casa 5 con D12 2, QA-06-09-04, Permanencia sin reparación previa) y app/test/data/recorrido_retroceso_test.dart (etapas, habilitación secuencial, coherencia condicional, fechas de intentos, etiqueta 'Lectura pendiente' en el listado).
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending

#### S3.T5 — Agregar aserciones de test: tras el tercer intento reconocido (después de dos lectura_pendiente) la consulta vuelve de lectura_pendiente a acciones_en_curso y la etapa actual del recorrido persistente avanza a 'anillo'. Agregar también un test de que la etapa coherencia se lee del campo coherence de practica.v1.json (vía cargador_catalogo_practica) y que la reparación completada se siembra como plan_practica con estado 'completado' en remision_permanencia_test.dart.
Contrato: rollback: Revertir los archivos de test tocados con git checkout -- sobre ellos.. Status: pending

#### S3.T6 — Agregar test de inmutabilidad append-only de intento_reconocimiento por la API del registro EntidadAppendOnly: la llamada de edición o borrado lanza o no existe, y el intento queda sin cambios.
Contrato: rollback: Revertir el archivo de test agregado con git checkout -- sobre él.. Status: pending
## Cambios al modelo de datos

- tipo: create | objetos: diagnostico_retroceso, diagnostico_retroceso.tirada_revision_id, diagnostico_retroceso.estado_reconocimiento, diagnostico_retroceso.ultimo_intento_id | destructivo: no | tarea: S1.T1 | rollback: Migración compatible hacia adelante (v7) que deja de usar la tabla sin borrarla; los diagnósticos se conservan.
- tipo: create | objetos: intento_reconocimiento, intento_reconocimiento.diagnostico_id, intento_reconocimiento.numero_intento, intento_reconocimiento.occurred_at_utc, intento_reconocimiento.local_date, intento_reconocimiento.timezone_id, intento_reconocimiento.resultado, intento_reconocimiento.decision, intento_reconocimiento.patron_reconocido, intento_reconocimiento.confirmado_por_cuenta_id, intento_reconocimiento.device_origin_id | destructivo: no | tarea: S1.T1 | rollback: Migración compatible hacia adelante; los intentos son append-only y se conservan.
- tipo: data_rewrite | objetos: diagnostico_retroceso (backfill desde tirada_revision vigente con resultado='retroceso') | destructivo: no | tarea: S1.T2 | rollback: Solo inserta filas nuevas e idempotentes (INSERT ... WHERE NOT EXISTS). La compensación es una operación transaccional que marca o ignora los diagnósticos sobrantes; no se tocan tirada_revision ni consulta.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: La migración Drift v6 (el esquema vigente es v5, la migración nueva es v6) crea diagnostico_retroceso (tirada_revision_id único, estado_reco
- REQ-03 (edit) `confirmed`: Registrar un intento (DEC-206) asigna un numero_intento correlativo por diagnóstico y guarda la fecha local, la zona y occurred_at_utc del m
- REQ-04 (edit) `confirmed`: Un intento no_reconocido con lectura_pendiente (DEC-068) deja la consulta en fase = lectura_pendiente con motivo_bloqueo NULL y se puede rep
- REQ-07 (edit) `confirmed`: Remisión frente a permanencia (DEC-028): una reparación completada es un plan_practica con estado 'completado' (check vigente en v5; HU-06-1
- REQ-08 (edit) `confirmed`: La proyección del recorrido persistente (DEC-097) expone las etapas diagnostico, anillo, reparacion y coherencia, la etapa actual y las fech
- REQ-11 (edit) `confirmed`: Las tablas diagnostico_retroceso e intento_reconocimiento y la migración v6 (con su paso de datos) se documentan en docs/product/tecnologia/
- REQ-12 (edit) `confirmed`: Los docs tocados (EP-06, el modelo de datos v2 incremental y docs/PLAN.md si aplica) quedan conformes con el linter de docs: pnpm run check 

**Tasks agregadas:**

- S1: Actualizar el baseline observado de main (SHA) y el esquema vigente en la ficha de HU-06-09 de docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md y en docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md: el esquema vigente es v5 y la migración nueva es v6 (esquema_v6.dart), que NO recrea consulta. Dejar los docs conformes con el linter (.docs-baseline.txt). (valida: REQ-01, REQ-11, REQ-12; rollback: git checkout -- docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md)
- S3: Agregar aserciones de test: tras el tercer intento reconocido (después de dos lectura_pendiente) la consulta vuelve de lectura_pendiente a acciones_en_curso y la etapa actual del recorrido persistente avanza a 'anillo'. Agregar también un test de que la etapa coherencia se lee del campo coherence de practica.v1.json (vía cargador_catalogo_practica) y que la reparación completada se siembra como plan_practica con estado 'completado' en remision_permanencia_test.dart. (valida: REQ-04, REQ-07, REQ-08, test; rollback: Revertir los archivos de test tocados con git checkout -- sobre ellos.)
- S3: Agregar test de inmutabilidad append-only de intento_reconocimiento por la API del registro EntidadAppendOnly: la llamada de edición o borrado lanza o no existe, y el intento queda sin cambios. (valida: REQ-03, test; rollback: Revertir el archivo de test agregado con git checkout -- sobre él.)

## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

**Gate (auto)**: El test de migración v5 a v6 sobre una base M1a efímera pasa (incluida la doble corrida de QA-06-09-02 y la conservación de QA-06-09-06), y un Retroceso nuevo deja su diagnóstico sin_intento en la misma transacción.

### Session 2 · T3 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T1.4
- [ ] S2.T2
- [ ] S2.T2.1
- [ ] S2.T2.2
- [ ] S2.T2.3
- [ ] S2.T2.4
- [ ] S2.T2.5
- [ ] S2.T2.6
- [ ] S2.T2.7

**Gate (auto)**: Los tests de intentos muestran la secuencia 1, 2 y 3 append-only, las proyecciones no_reconocido_continuar, lectura_pendiente y reconocido, la fase de la consulta, el rechazo de la tirada con reparación pendiente, el reconocimiento tardío sin cambios en el plan y la corrección con diagnóstico nuevo, todo en verde.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6

**Gate (auto)**: Los tests de remisión frente a permanencia (Casa 5 con D12 5 y con D12 2, QA-06-09-04) y del recorrido persistente están en verde, los docs del modelo v2 y de EP-06 están actualizados y pnpm run check termina con código 0.

### Session 4 · T0 · open

