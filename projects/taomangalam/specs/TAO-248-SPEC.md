---
id: TAO-248-SPEC
project: taomangalam
ticket: TAO-248
status: approved
---

# TAO-248 · Cola legal diferida con backoff, V-51 por pendientes y traza; regla de nunca aceptada y traza muestreada del bloqueo legal

## Resumen ejecutivo

Se completa lo que falta sobre el código ya entregado de EP-01. En HU-03a-12 la cola legal pasa a reintentar con espera creciente y acotada cuando hay red pero el servidor falla con 5xx o timeout. Además se usan los `pendientes` del 201 para presentar V-51 y el servidor deja en el log la diferencia entre `aceptada_at` y `registrada_at`. En HU-03a-13 se fija la regla de nunca aceptada con prueba unitaria aislada de `crearFuenteLegalPendiente`, se agrega un log muestreado de bloqueos con `errorCode` y tipo pendiente, y la prueba generada pasa a recorrer las rutas reales.
NO se hace: interfaz de V-51 (HU-01-13), cola de analítica (HU-15-04), validación de kuberani (EP-11), exención de impersonación (EP-14b) ni cambios de esquema Drift o PostgreSQL.
Criterios observables: test con reloj falso que muestra esperas crecientes con tope y la cola vacía al volver el 200/201. Supertest con `aceptada_at` dos días antes de `registrada_at` y el log con `diferenciaDias=2`. Prueba de integración con servidor local y corte de red sin aceptaciones duplicadas. Prueba unitaria con los 3 casos de la regla. Log de bloqueo sin texto de documentos.
Tamaño: 5 puntos en 3 sesiones (T2, T2, T2), dentro del techo de 4.
ADVERTENCIAS: la regla de nunca aceptada sin `exige_reaceptacion` necesita una decisión de Producto. El plan propone que bloquee, alineado con el texto original. Si Producto decide que no bloquee, cambian solo el caso esperado y la implementación de S3.T1. Un cambio de la regla puede bloquear a cuentas existentes que nunca aceptaron una versión vigente: hay que revisarlo antes del despliegue (blast radius, no es alcance nuevo). La verificación en dispositivo se hace en emulador y simulador según la Adenda 1.
Datos a confirmar antes de ejecutar: (1) La decisión de Producto sobre la regla de nunca aceptada: confirmar con Producto y registrarla como DEC en docs/product/decisiones. (2) Las rutas exactas de `version-legal-pendiente.ts`, `legal/pendientes.ts`, `bloqueo-reaceptacion.test.ts`, `contrato-exenciones.test.ts` y del handler de `aceptarDocumentosLegales` en el servidor: no figuran en el contexto; confirmar en taomangalam/server con búsqueda por nombre. (3) El comando exacto de test del servidor (vitest o jest, filtro pnpm) y su runner local `pnpm run check:ci`: confirmarlo en el package.json raíz. (4) El logger del servidor y si ya existe una utilidad de muestreo: confirmarlo en el middleware de errores del servidor. (5) Los parámetros del backoff (base, factor, tope, jitter): no están en el request; proponer base 2 s, factor 2, tope 5 min y confirmarlo al aprobar. (6) El archivo y el método del envío en `cola_offline.dart` (`ServicioColaLegal`) donde se acumula `documentosPendientes` en `ResultadoEnvioLegal`: confirmarlo al leer el archivo completo.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 2 Q2, Adenda 3 Q4

La cola legal reintenta el envío con espera creciente y acotada mientras queden entradas, haya red y el servidor responda 5xx o no responda. Parámetros fijados (constantes con nombre, sin números mágicos): base 2 s, factor 2, tope 5 min aplicado sobre la espera calculada, máximo 8 intentos por ciclo. El jitter es full jitter: la espera real es aleatoria uniforme entre 0 y la espera calculada, con el generador aleatorio inyectable para que los tests lo fijen o anulen. Un ciclo nuevo comienza cuando se recupera la conexión (coordinador de reconexión) o se reabre la app; agotados los 8 intentos del ciclo se espera ese evento. Al recuperarse el servidor la cola se vacía. Se mantienen la misma `Idempotency-Key` por entrada y el borrado solo tras el 201.

### REQ-02 `inferred`
> Fuente: taomangalam/app/lib/features/legal/data/coordinador_reconexion.dart:29

Cuando la respuesta 201 de una aceptación diferida trae `pendientes` no vacío, el coordinador usa `documentosPendientes` de `ResultadoEnvioLegal` para presentar V-51 de inmediato con el documento nuevo (texto empaquetado o `urlPublicada`) y conserva el retorno a la pantalla de origen.

### REQ-03 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:119

Al registrar una aceptación con `diferida = true`, el servidor guarda `aceptada_at` igual a la fecha original y `registrada_at` igual a la de recepción, y emite un log estructurado con la diferencia entre ambas (en segundos y días). El log no incluye texto de documentos ni datos personales.

### REQ-04 `inferred`
> Fuente: taomangalam/app/lib/features/legal/data/cola_offline.dart:1

Una prueba de integración de la app contra un servidor local real (no puertos falsos) con un corte de red simulado a mitad del envío demuestra que, al volver la red, no hay aceptaciones duplicadas y que la entrada se borra solo tras el 201.

### REQ-05 `confirmed`
> Fuente: Pedido de enmienda; Adenda 2 Q1 y Adenda 3 (anotar blast radius de la opción C para revisar antes de desplegar)

Regla de pendientes fijada (opción C, Adenda 2 Q1): una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si aceptó una versión anterior y la nueva no trae `exige_reaceptacion`, no bloquea; con `exige_reaceptacion = true` siempre bloquea. Aplica igual al middleware 403 `version_legal_pendiente` y a `legalPendiente` del manifiesto, y queda fijada con prueba. Blast radius: la opción C amplía el bloqueo a cuentas existentes que nunca aceptaron un tipo vigente aunque no haya marca de reaceptación. El conteo de cuentas que quedarían bloqueadas en staging y producción es un paso previo al despliegue, ejecutado fuera de las sesiones de ejecución (no es una task ni una sesión del plan); su resultado se revisa antes de desplegar.

### REQ-06 `inferred`
> Fuente: Adenda 3 (casos de REQ-06 con opción C), criterios HU-03a-13

`crearFuenteLegalPendiente` tiene una prueba unitaria aislada (sin HTTP ni middleware) que cubre las tres situaciones de la regla de la opción C: cuenta que nunca aceptó ningún documento del tipo (pendiente), aceptó una versión anterior y la vigente no trae exige_reaceptacion (no pendiente), y exige_reaceptacion = true (pendiente aunque haya aceptado una anterior).

### REQ-07 `confirmed`
> Fuente: Adenda 2 Q3; criterio HU-03a-13 (log del bloqueo muestreado)

Cada bloqueo por versión pendiente emite un log muestreado con `errorCode=version_legal_pendiente` y el tipo pendiente (terminos o privacidad), sin texto de documentos ni datos personales. La tasa de muestreo en producción es 0.1, definida como constante con nombre.

### REQ-08 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1613

La prueba generada desde el contrato recorre las operaciones autenticadas montadas en la app real del servidor (rutas reales, no handlers de prueba) y verifica que cada una bloquee o se atienda según su `x-exenta-version-legal`.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/esquema_v2.dart:1

Reutilizar lo existente sin cambiar el esquema: `registro_legal_pendiente` (Drift v2), `ColaLegalDrift`, `ServicioColaLegal`, `CoordinadorDeReconexion`, `PuertoAceptacionApi`, el middleware `version-legal-pendiente.ts` y `legal/pendientes.ts`. No se crean tablas ni columnas, la cola no guarda texto ni datos personales y las nuevas constantes (backoff, muestreo) son con nombre, sin números mágicos.

### REQ-10 `confirmed`
> Fuente: Adenda 2 Q1, Adenda 3 (registro de la DEC solo en S3.T5)

Se registra una única DEC nueva que precisa DEC-225 con la regla de pendientes de la opción C (nunca aceptada de ese tipo bloquea; aceptada anterior sin exige_reaceptacion no bloquea; exige_reaceptacion siempre bloquea) y anota el blast radius de la opción C para revisar antes de desplegar. El registro se hace solo en S3.T5; S3.T1 solo enuncia la regla. Su número y ubicación siguen la convención de docs/product/decisiones.

### REQ-11 `confirmed` `enforcement`
> Fuente: Adenda 2 Correcciones (verificar rutas reales antes de S1)

Antes de empezar S1 se verifica la ruta real de `integration_test/app_shell_integration_test.dart` y de `app/test/legal/cola-offline_test.dart`; las tasks que los referencian usan las rutas verificadas.

### REQ-12 `confirmed`
> Fuente: Adenda 1, Adenda 3 Q5

La verificación final (sesión de verificación) lista los casos QA manuales QA-03a-12-01..04 y QA-03a-13-01..03, ejecutados en emulador o simulador según la Adenda 1, y deja anotado que la prueba en dispositivo real queda pendiente y no bloquea el cierre. Los casos contra staging usan la URL de la variable STAGING_BASE_URL del GitHub Environment staging; la versión legal nueva (con y sin exige_reaceptacion) se publica con el script legal:registrar del pipeline (TAO-245) o, en emulador, se simula con el servidor local de pruebas. Si staging no está disponible, el caso se marca como verificación humana diferida.
## Tasks

#### S1.T1 — Agregar reintento con backoff exponencial acotado en ServicioColaLegal (cola_offline.dart). Constantes con nombre para base, factor, tope y máximo de intentos; el reloj y el temporizador se inyectan para poder probarlos. Solo reintenta ante 5xx o timeout con red presente, conserva la Idempotency-Key de la entrada, cancela el temporizador al perder la red y deja la reconexión a CoordinadorDeReconexion (coordinador_reconexion.dart:11). Un 4xx de rechazo conserva su camino actual.
Contrato: rollback: Revertir el commit de cola_offline.dart; la cola vuelve a reintentar solo al reconectar o reabrir, sin pérdida de entradas porque el esquema no cambia.. Status: pending

#### S1.T2 — Usar `documentosPendientes` de ResultadoEnvioLegal en CoordinadorDeReconexion: si no está vacío tras el envío, invocar `alRequerirReaceptacion` una vez con los documentos deduplicados (texto empaquetado o urlPublicada) antes de liberar las demás operaciones; reutilizar el notificador que ya presenta V-51 y conserva el retorno.
Contrato: rollback: Revertir el commit de coordinador_reconexion.dart; V-51 vuelve a presentarse solo por el manifiesto o por el 403.. Status: pending

#### S1.T3 — Tests de la sesión: backoff con reloj falso (503, 503 y 201; tope; timeout; 4xx sin reintento; misma Idempotency-Key) en cola-offline_test.dart, y un test del coordinador ante un 201 con pendientes (vacío, uno o duplicados). Regresión de app_shell_integration_test.dart.
Contrato: rollback: Revertir los archivos de test agregados o ajustados.. Status: pending

#### S1.T4 — Primera task de S1: comprobar las rutas reales de integration_test/app_shell_integration_test.dart y de app/test/legal/cola-offline_test.dart (REQ-11) antes de cualquier otra task, y usar las rutas verificadas en las demás tasks.
Contrato: rollback: Revertir solo los cambios de rutas en los verify y descripciones de las tasks; no hay cambios de código.. Status: pending

#### S2.T1 — En el handler de `aceptarDocumentosLegales` del servidor, cuando diferida=true, emitir un log estructurado (evento de aceptación diferida) con tipo, version, diferenciaSegundos y diferenciaDias entre aceptada_at y la recepción, sin texto, hash completo ni datos personales. No cambiar la persistencia: aceptada_at es la original y registrada_at queda por defecto.
Contrato: rollback: Revertir el commit del handler; solo desaparece el log, sin cambios de datos.. Status: pending

#### S2.T2 — Prueba de integración de la app contra un servidor local real: levantar el servidor con base de test, usar Drift real en archivo temporal y un proxy o adaptador que corte la conexión a mitad del envío (después de que el servidor procesa y antes del 201). Verificar el orden alta, legal y resto, que no haya duplicados y que la entrada se borre solo tras el 201. Ejecución acotada: dos entradas y un solo corte.
Contrato: rollback: Eliminar el archivo de integración y el script del servidor local; no afecta código productivo.. Status: pending

#### S2.T3 — Tests de la sesión: Supertest de aceptación diferida (aceptadaAt=hoy-2d con diferida=true da registrada_at=hoy y log con diferenciaDias=2; no diferida sin log; fecha futura rechazada; log sin texto ni datos personales).
Contrato: rollback: Revertir el archivo de test.. Status: pending

#### S3.T1 — Enunciar la regla de pendientes de la opción C en el código y su comentario: una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si aceptó una versión anterior y la nueva no trae exige_reaceptacion no bloquea; con exige_reaceptacion = true siempre bloquea. Aplicarla en legal/pendientes.ts (crearFuenteLegalPendiente) para que middleware y legalPendiente la compartan. No registrar la DEC aquí: eso se hace solo en S3.T5.
Contrato: rollback: Revertir el commit de pendientes.ts; vuelve la regla anterior (solo exige_reaceptacion), que no pierde datos y mantiene el bloqueo seguro.. Status: pending

#### S3.T2 — Agregar en version-legal-pendiente.ts un log muestreado del bloqueo con errorCode=version_legal_pendiente y tipos pendientes. La tasa de muestreo va como constante con nombre y se puede inyectar en los tests. No incluye texto, URL con parámetros ni Authorization, y no cambia el cuerpo del 403.
Contrato: rollback: Revertir el commit del middleware; el 403 sigue igual y solo se pierde el log.. Status: pending

#### S3.T3 — Ajustar contrato-exenciones.test.ts para que monte la app real del servidor y recorra cada operación autenticada del contrato con una cuenta pendiente. Debe fallar si un operationId no está montado y verificar que el conteo recorrido sea igual al del contrato.
Contrato: rollback: Revertir el test a la versión con handlers de prueba.. Status: pending

#### S3.T4 — Tests de la sesión: prueba unitaria aislada de crearFuenteLegalPendiente (nunca aceptada, reaceptación exigida, sin marca y los dos tipos a la vez); casos de la regla en bloqueo-reaceptacion.test.ts (403 y legalPendiente coherentes, exenta no bloquea); Supertest del log de bloqueo con muestreo 1 y 0.
Contrato: rollback: Revertir los archivos de test agregados o ajustados.. Status: pending

#### S3.T5 — Registrar la única DEC nueva que precisa DEC-225 con la regla de la opción C (nunca aceptada de ese tipo bloquea; aceptada anterior sin exige_reaceptacion no bloquea; exige_reaceptacion siempre bloquea), siguiendo la convención de número y ubicación de docs/product/decisiones. Anotar el blast radius de la opción C (cuentas existentes que nunca aceptaron un tipo vigente quedarían bloqueadas) para revisar antes de desplegar.
Contrato: rollback: Eliminar el archivo de la DEC nueva y revertir su línea en el índice de decisiones.. Status: pending

#### S4.T1 — Verificación final: listar y ejecutar en emulador o simulador (Android, iPhone y tablet virtuales; modo avión y red intermitente simulados, reloj del emulador adelantado) los casos QA manuales QA-03a-12-01, QA-03a-12-02, QA-03a-12-03, QA-03a-12-04, QA-03a-13-01, QA-03a-13-02 y QA-03a-13-03, registrando el resultado de cada uno. Anotar que la prueba de integración en dispositivo real queda pendiente y no bloquea el cierre (Adenda 1). No agregar una sección genérica de verificación runtime.
Contrato: rollback: No aplica: es una verificación; revertir solo el registro de resultados si se descarta.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Cuando la respuesta 201 de una aceptación diferida trae `pendientes` no vacío, el coordinador usa `documentosPendientes` de `ResultadoEnvioLegal` para presentar V-51 de inmediato con el documento nuevo (texto empaquetado o `urlPublicada`) y conserva el retorno a la pantalla de 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: La cola legal reintenta el envío con espera creciente y acotada mientras queden entradas, haya red y el servidor responda 5xx o no responda.
- REQ-05 (edit) `confirmed`: Regla de pendientes fijada (opción C, Adenda 2 Q1): una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si a
- REQ-07 (edit) `confirmed`: Cada bloqueo por versión pendiente emite un log muestreado con `errorCode=version_legal_pendiente` y el tipo pendiente (terminos o privacida
- REQ-10 (add) `confirmed`: Se registra una DEC nueva que precisa DEC-225 con la regla de pendientes de la opción C (nunca aceptada de ese tipo bloquea; aceptada anteri
- REQ-11 (add) `confirmed`: Antes de empezar S1 se verifica la ruta real de `integration_test/app_shell_integration_test.dart` y de `app/test/legal/cola-offline_test.da
- REQ-12 (add) `confirmed`: La verificación final lista los casos QA manuales QA-03a-12-01..04 y QA-03a-13-01..03, ejecutados en emulador o simulador según la Adenda 1,

**Tasks agregadas:**

- S1: Ejecutar PRIMERO, antes de cualquier otra task de S1: verificar con Glob/ls que existen las rutas reales de `integration_test/app_shell_integration_test.dart` y `app/test/legal/cola-offline_test.dart`. Si alguna difiere, corregir las rutas citadas en los verify y descripciones de las tasks que las usan. No modificar los tests. (valida: REQ-11; rollback: Revertir solo los cambios de rutas en los verify y descripciones de las tasks; no hay cambios de código.)
- S3: Crear la DEC nueva en docs/product/decisiones, siguiendo la convención de numeración y ubicación de ese directorio (tomar el siguiente número libre). Debe precisar DEC-225 con la regla de pendientes de la opción C: bloquea si la cuenta nunca aceptó ningún documento de ese tipo; no bloquea si aceptó una versión anterior y la nueva no trae exige_reaceptacion; con exige_reaceptacion = true siempre bloquea. Citar la Adenda 2 Q1 como origen y enlazar el cambio en el índice de decisiones si existe. (valida: REQ-10, REQ-05; rollback: Eliminar el archivo de la DEC nueva y revertir su línea en el índice de decisiones.)
- S3: Verificación final: listar y ejecutar en emulador o simulador (Android, iPhone y tablet virtuales; modo avión y red intermitente simulados, reloj del emulador adelantado) los casos QA manuales QA-03a-12-01, QA-03a-12-02, QA-03a-12-03, QA-03a-12-04, QA-03a-13-01, QA-03a-13-02 y QA-03a-13-03, registrando el resultado de cada uno. Anotar que la prueba de integración en dispositivo real queda pendiente y no bloquea el cierre (Adenda 1). No agregar una sección genérica de verificación runtime. (valida: REQ-12; rollback: No aplica: es una verificación; revertir solo el registro de resultados si se descarta.)

**Task ops:**

- edit S2.T3 { validates=["REQ-04"] }
- edit S3.T4 { validates=["REQ-08"] }

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: La cola legal reintenta el envío con espera creciente y acotada mientras queden entradas, haya red y el servidor responda 5xx o no responda.
- REQ-05 (edit) `confirmed`: Regla de pendientes fijada (opción C, Adenda 2 Q1): una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si a
- REQ-06 (edit) `inferred`: `crearFuenteLegalPendiente` tiene una prueba unitaria aislada (sin HTTP ni middleware) que cubre las tres situaciones de la regla de la opci
- REQ-10 (edit) `confirmed`: Se registra una única DEC nueva que precisa DEC-225 con la regla de pendientes de la opción C (nunca aceptada de ese tipo bloquea; aceptada 
- REQ-12 (edit) `confirmed`: La verificación final (sesión de verificación) lista los casos QA manuales QA-03a-12-01..04 y QA-03a-13-01..03, ejecutados en emulador o sim

**Task ops:**

- move S1.T4 → S1
- edit S1.T4 { desc="Primera task de S1: comprobar las rutas reales de integration_test/app_shell_integration_test.dart y de app/test/legal/cola-offline_test.dart (REQ-11) antes de cualquier otra task, y usar las rutas verificadas en las demás tasks." }
- edit S2.T3 { validates=["REQ-03"] }
- edit S3.T1 { desc="Enunciar la regla de pendientes de la opción C en el código y su comentario: una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si aceptó una versión anterior y la nueva no trae exige_reaceptacion no bloquea; con exige_reaceptacion = true siempre bloquea. Aplicarla en legal/pendientes.ts (crearFuenteLegalPendiente) para que middleware y legalPendiente la compartan. No registrar la DEC aquí: eso se hace solo en S3.T5." }
- edit S3.T4 { validates=["REQ-05","REQ-06","REQ-07","REQ-08"] }
- edit S3.T5 { desc="Registrar la única DEC nueva que precisa DEC-225 con la regla de la opción C (nunca aceptada de ese tipo bloquea; aceptada anterior sin exige_reaceptacion no bloquea; exige_reaceptacion siempre bloquea), siguiendo la convención de número y ubicación de docs/product/decisiones. Anotar el blast radius de la opción C (cuentas existentes que nunca aceptaron un tipo vigente quedarían bloqueadas) para revisar antes de desplegar." }
- move S3.T6 → S4

### Enmienda 3
**REQs:**

- REQ-05 (edit) `confirmed`: Regla de pendientes fijada (opción C, Adenda 2 Q1): una versión vigente bloquea si la cuenta nunca aceptó ningún documento de ese tipo; si a
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4

**Gate (auto)**: Tests de app/test/legal verdes: backoff con reloj falso (esperas crecientes y con tope, cola vacía tras el 201) y presentación de V-51 ante un 201 con pendientes, con el retorno conservado.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: Supertest verde con aceptada_at dos días anterior a registrada_at y log con diferenciaDias=2; prueba de integración de la app con servidor local y corte de red que deja exactamente 2 filas, sin duplicados, y la cola Drift vacía.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5

**Gate (auto)**: Prueba unitaria de crearFuenteLegalPendiente con 3 casos verde; 403 y legalPendiente coherentes con la regla decidida; Supertest del log de bloqueo muestreado; contrato-exenciones.test.ts recorre las rutas reales y su conteo coincide con el contrato.

### Session 4 · T0 · open

**Tasks:**
- [ ] S4.T1

### Session 5 · T0 · open
