---
id: TAO-250-SPEC
project: taomangalam
ticket: TAO-250
status: approved
---

# TAO-250 · Plan de energización (inicio, avance y permanencia) desde el catálogo de casas, con renovación del kuberani, esperas tipadas y bloqueo de la siguiente tirada (HU-06-05)

## Resumen ejecutivo

Qué se hace: un generador de dominio local (sin migración propia) crea en una sola transacción el plan_practica (via consultante, content_version, resumen_snapshot) con sus acciones desde el procedimiento de energización del catálogo de casas de HU-02-05. Cubre el inicio en Casa 1 (paso sin revisión), el avance (revisión vigente) y la permanencia (retiro o quema, renovación validada y energización, en ese orden). Además registra el evento de activación con local_date y timezone_id, maneja las esperas esperando_conexion y esperando_material con sus motivos tipados, cierra el plan en completado con la fase lista_para_tirada y bloquea la tirada con la política de HU-06-02.
Qué NO se hace: el conteo de días ni el día omitido (HU-06-06), la corrección por supersede (HU-06-07), la reparación, la coherencia y el cierre (M1b), la vía del consultor (M3), los recordatorios (EP-08), la interfaz (V-05 y V-07) ni el registro público de la tirada (HU-06-04).
Cómo se valida: los tests de QA-06-05-01 a QA-06-05-04 pasan sobre Drift en memoria con pasos y revisiones sembrados, al igual que los planes de las casas 1 a 11 en avance y permanencia, el ciclo de permanencia con resultados simulados de EP-11 y el rollback total ante un fallo al insertar acciones. pnpm run docs:check queda verde.
Tamaño: 3 sesiones T2, unas 6 a 8 horas en total.
ADVERTENCIAS: (1) Es un bloqueo externo: el catálogo de casas (app/assets/catalogos/casas.v1.json y app/lib/catalogos/cargador_catalogo_casas.dart) existe solo en origin/epic/EP-02. Sin GH-71 y GH-72 integrados en main o en epic/EP-06 no se puede ejecutar, y no se debe inventar un catálogo alternativo. (2) En el esquema v1, plan_practica.tirada_revision_id es NOT NULL (esquema_v1.dart:194). El plan del inicio en Casa 1 sin tirada depende de la base Drift v4 de TAO-249, que debe estar integrada. (3) La política de habilitación de tirada y su error tipado son de HU-06-02 (TAO-249): se reusan, no se redefinen. (4) Fuera de lo pedido y no incluido: la interfaz para abrir la validación (DEC-231, V-07 y V-03).
Datos a confirmar antes de ejecutar: (a) el SHA vigente de main y de epic/EP-06, y si EP-02 ya está integrado (git log origin/epic/EP-06). (b) La ruta y el nombre reales de los repositorios transaccionales de TAO-249 y de la política de habilitación de tirada con su error tipado de plan incompleto (spec TAO-249). (c) La estructura de casas.v1.json: la clave del procedimiento de energización por casa y vía, y los campos de días y repeticiones (cargador_catalogo_casas.dart en EP-02). (d) Los valores admitidos de accion_practica.tipo y accion_practica.estado, y de evento_plan.tipo, en el esquema v4. (e) Dónde se persiste el flag 'la permanencia viene de una reparación' (DEC-028): un campo de evento_plan o del resumen. Hay que confirmarlo en tecnologia/20. (f) El valor de producto_id del kuberani para la acción de renovación. (g) La ruta del cliente OpenAPI 2.4.1 generado en app/ (ContextoUsoUnidad.motivo y motivoBloqueo).

## Requirements

### REQ-01 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:191

Dado un paso de inicio (sin revisión) o de avance (con revisión vigente) sembrado en Drift, el generador crea en una sola transacción: un plan_practica con via=consultante, content_version del catálogo y resumen_snapshot; las accion_practica de energización de la casa alcanzada, con dias_requeridos, repeticiones, content_key y texto_snapshot tomados del catálogo; y el evento_plan de activación con local_date y timezone_id. Además fija consulta.plan_actual_id y consulta.fase=acciones_en_curso. Si falla cualquier inserción, se revierte todo.

### REQ-02 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:213

En una permanencia, el plan contiene en orden: retiro o quema del kuberani usado (confirmación sin prueba, DEC-059), renovación del kuberani (uso de producto con motivo kuberani_renovacion, que se completa con el resultado de validación de EP-11) y la energización de la casa. Las acciones diarias no admiten cumplimientos hasta que se confirma la renovación, y queda registrado si la casa venía de una reparación, siempre como falso en M1a.

### REQ-03 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:208

El resultado de la renovación gestiona las esperas. Sin conexión, el plan queda en esperando_conexion y la consulta con motivo_bloqueo=validar_kuberani_renovacion. Si la persona indica que no tiene unidad, quedan en esperando_material con motivo_bloqueo=kuberani_renovacion. Un reintento exitoso devuelve el plan a activo, la consulta a acciones_en_curso y el motivo a nulo. Las esperas conservan las acciones, no activan días y no reutilizan los motivos de inicio ni de reposición.

### REQ-04 `inferred`
> Fuente: taomangalam/app/lib/data/drift/dao/entidades.dart:50

Cada cambio de estado del plan (activación, material agregado o renovación, espera y cumplimiento) agrega un evento_plan append-only con occurred_at_utc, local_date y timezone_id. El evento de activación es el punto desde el que HU-06-06 cuenta los días (DEC-232).

### REQ-05 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:208

Al evaluar la finalización de un plan con todas sus acciones obligatorias completas, el plan pasa a completado y la consulta a fase=lista_para_tirada en la misma transacción, con un evento de cumplimiento. Mientras falte alguna, se mantiene acciones_en_curso. Esta historia completa solo las acciones de confirmación; las diarias se siembran completas en los tests.

### REQ-06 `inferred`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:176

La siguiente tirada se bloquea con la política compartida de habilitación de HU-06-02. Con un plan incompleto o en espera, se rechaza con el error tipado de plan incompleto del catálogo de HU-06-02. Con un plan completado y la fase lista_para_tirada, se admite.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/app/test/catalogos/cargador_catalogo_casas_test.dart:55

Las acciones y su content_key, content_version y texto_snapshot salen solo del catálogo de casas validado y versionado de HU-02-05 (cargador_catalogo_casas.dart y casas.v1.json integrados desde EP-02). No se crea un catálogo alternativo ni se duplican textos en el código.

### REQ-08 `inferred` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/dao/entidades.dart:10

La persistencia usa la capa de repositorios transaccional de TAO-249 y la clasificación de entidades existente: plan_practica y accion_practica son mutables, con columnas comunes; evento_plan es append-only. No se agrega ninguna migración ni columna nueva.

### REQ-09 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md:801

El cliente OpenAPI 2.4.1 generado conserva kuberani_renovacion en ContextoUsoUnidad.motivo y validar_kuberani_renovacion en motivoBloqueo. El motor usa esos valores sin agregarlos por duplicado.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo doc que el ticket modifique (EP-06, modelo de datos v2, PLAN.md o docs/content/casas/01_casa_1.md) queda compliant con el linter de docs sin tocar .docs-baseline.txt. Si se toca 01_casa_1.md, se normaliza el patrón que el linter rechaza.
## Tasks

#### S1.T1 — Precondición: verificar que epic/EP-06 contiene app/assets/catalogos/casas.v1.json, app/lib/catalogos/cargador_catalogo_casas.dart (EP-02, GH-71 y GH-72), la base Drift v4 y los repositorios y la política de TAO-249. Verificar también que el cliente OpenAPI 2.4.1 generado conserva kuberani_renovacion y validar_kuberani_renovacion. Si algo falta, detener y reportar el bloqueo externo sin crear un catálogo alternativo.
Contrato: rollback: Sin cambios de código: no hay nada que revertir.. Status: done

#### S1.T2 — Crear el generador de plan de energización en la capa de dominio de EP-06, ubicado junto a los repositorios de TAO-249. Entradas: contexto transaccional, paso, revisión opcional, casa, tipo de movimiento o vía y catálogo de casas. Lee el procedimiento de energización de la casa desde el cargador existente y crea, en una sola transacción, plan_practica (via=consultante, content_version, resumen_snapshot) y accion_practica (orden, content_key, texto_snapshot, dias_requeridos, repeticiones, es_obligatoria=1). Luego fija consulta.plan_actual_id y fase=acciones_en_curso, y agrega el evento_plan de activación con occurred_at_utc, local_date y timezone_id desde un reloj inyectable. El inicio en Casa 1 usa el paso sin revisión; el avance usa la revisión vigente del mismo paso. Si a una casa le falta el procedimiento, falla con un error tipado.
Contrato: rollback: git revert del commit: el generador es nuevo, no tiene consumidores aún y no hay migración.. Status: done

#### S1.T3 — Tests del generador para inicio y avance con Drift en memoria y pasos y revisiones sembrados. Casos: QA-06-05-01 (Casa 1, 3 días, acciones_en_curso); QA-06-05-04 (sin tirada_revision nueva, versión y snapshot conservados, y rollback total al forzar un fallo en la segunda acción); avance a Casa 6 con plan_actual_id; casas 1 a 11 en avance contra el catálogo; texto_snapshot igual al del catálogo; evento de activación con local_date y timezone_id; columnas comunes de las entidades mutables; catálogo de prueba con content_version propia.
Contrato: rollback: git revert del commit de tests.. Status: done

#### S2.T1 — Extender el generador para la permanencia (DEC-028 y DEC-134). Antepone las acciones de retiro o quema del kuberani (confirmación sin prueba, DEC-059) y de renovación del kuberani (uso de producto con motivo kuberani_renovacion) a la energización de la casa, y registra en el historial viene_de_reparacion=false (M1a).
Contrato: rollback: git revert del commit: se recupera el generador solo de inicio y avance.. Status: done

#### S2.T1.1 — Generación de las dos acciones de confirmación con orden 1 y 2, y desplazamiento de la energización a orden 3 en adelante. El flag de reparación se persiste donde lo defina tecnologia/20 (ver 'Datos a confirmar').
Contrato: rollback: git revert del commit.. Status: done

#### S2.T1.2 — Operación de dominio mínima para confirmar un cumplimiento: solo valida que la acción esté habilitada y rechaza las acciones diarias mientras la renovación no esté confirmada. El conteo de días queda fuera, porque es de HU-06-06.
Contrato: rollback: git revert del commit.. Status: done

#### S2.T2 — Handler de confirmaciones y del resultado de la renovación. Confirma el retiro o la quema. Ante un resultado exitoso de EP-11, completa la renovación y habilita la práctica diaria. Ante sin_conexion, deja el plan y la consulta en esperando_conexion con motivo_bloqueo=validar_kuberani_renovacion. Si no hay unidad, los deja en esperando_material con motivo_bloqueo=kuberani_renovacion. En un reintento exitoso, vuelve a activo y acciones_en_curso con el motivo nulo. Cada transición agrega un evento_plan con fecha local y zona. Las esperas no crean ciclos ni eventos de activación de días. El motor recibe solo el resultado, nunca códigos.
Contrato: rollback: git revert del commit: el handler es nuevo y no hay datos que compensar.. Status: done

#### S2.T3 — Tests de permanencia y esperas con resultados simulados de EP-11. Casos: el orden en Casa 3; las casas 1 a 11 en permanencia; QA-06-05-02 (rechazo antes de la renovación y aceptación después); sin_conexion con el motivo validar_kuberani_renovacion; un reintento exitoso que vuelve a activo y acciones_en_curso con el motivo nulo; sin material, con kuberani_renovacion y las acciones conservadas; las esperas no agregan eventos de activación; los eventos de material agregado con local_date y timezone_id; viene_de_reparacion=false.
Contrato: rollback: git revert del commit de tests.. Status: done

#### S3.T1 — Evaluación de la finalización: si todas las acciones obligatorias están completas, en la misma transacción deja el plan en completado, la consulta en fase=lista_para_tirada y agrega un evento de cumplimiento con fecha local y zona. Si no, mantiene acciones_en_curso. HU-06-06 la invocará al completar la última acción diaria. El bloqueo se delega en la política compartida de habilitación de tirada de HU-06-02 (TAO-249), sin redefinir el error tipado.
Contrato: rollback: git revert del commit: la evaluación es nueva y la política de HU-06-02 queda intacta.. Status: done

#### S3.T2 — Actualizar la sección HU-06-05 de docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md con el estado de implementación y las rutas reales, solo si el flujo de entrega lo pide. Dejar compliant con el linter todo doc tocado (EP-06, modelo de datos v2, PLAN.md o docs/content/casas/01_casa_1.md), sin editar .docs-baseline.txt. Si se toca 01_casa_1.md, normalizar el patrón que el linter rechaza.
Contrato: rollback: git revert del commit de docs.. Status: done

#### S3.T3 — Tests de finalización y bloqueo, más el ciclo integral. Casos: QA-06-05-03 (con el plan completo la política admite; con un plan incompleto rechaza con el error tipado de plan incompleto); las esperas también se rechazan; las acciones diarias sembradas como completadas llevan a completado y lista_para_tirada en una transacción; un fallo forzado al actualizar la consulta revierte el plan; el ciclo completo de permanencia (retiro, renovación sin conexión, reintento exitoso, acciones diarias sembradas, finalización y política admite) con resultados simulados de EP-11; y la comprobación de que .docs-baseline.txt no cambió.
Contrato: rollback: git revert del commit de tests.. Status: done
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: El test QA-06-05-01/04 pasa: el inicio en Casa 1 y el avance a Casa 6 generan un plan con acciones del catálogo, plan_actual_id, fase acciones_en_curso y evento de activación con local_date y timezone_id; un fallo forzado al insertar acciones no deja filas.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: El test de permanencia en Casa 3 muestra el orden retiro, renovación y energización. QA-06-05-02 rechaza el cumplimiento antes de la renovación, y los resultados simulados de EP-11 (sin conexión, sin material y reintento exitoso) dejan los estados y motivos esperados.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: El test QA-06-05-03 pasa: con el plan completo, la política admite la tirada; con un plan incompleto o en espera, la rechaza con el error tipado de HU-06-02. La finalización deja completado y lista_para_tirada en una transacción, y pnpm run docs:check queda verde.

### Session 4 · T0 · open
