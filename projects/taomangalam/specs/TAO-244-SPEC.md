---
id: TAO-244-SPEC
project: taomangalam
ticket: TAO-244
status: approved
---

# TAO-244 · Vigencias de sesión y configuración pública desde claves sembradas, y autorización por capacidad con denegación por defecto

## Resumen ejecutivo

Se hacen dos cosas. Primero, un seed nombrado e idempotente del catálogo de configuración (escenario configuracion-catalogo en server/src/seeds/scenarios, registrado en server/src/seeds/registry.ts, con el patrón de catalogo-capacidades), que se ejecuta con el rol de migración. Siembra sesion.access_ttl_segundos=900 y sesion.refresh_ttl_segundos=2592000 (INTEGER, sensibilidad INTERNA) y accountDeletionPortalUrl=https://portal.taomangalam.cl/eliminar-cuenta (PUBLICA, provisional, igual en los tres entornos), cada una con su versión inicial en configuracion_version. Usa ON CONFLICT DO NOTHING: no pisa valores ajustados, y por eso el conteo "actualizadas" es siempre 0. El servicio de emisión pasa a leer la última versión de esas claves en cada emisión; JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS quedan solo como respaldo hasta que todos los entornos estén sembrados. Se agrega la prueba de expiración del refresh con reloj falso (el código ya revoca con motivo 'refresh expirado'). Segundo, server/src/middleware/capacidad.ts pasa a denegar por defecto (operación autenticada sin x-capacidad, no resuelta o con capacidad inexistente) y se monta en server/src/routes/cuenta.ts. Se suman una prueba de cableado de todo el contrato contra server/src/app.ts, el cruce de CAPACIDADES_CUENTA_COMPLETA con x-requiere-cuenta y un log muestreado de cada denegación con la operación (100% en development y staging, 10% en producción según APP_ENV, siguiendo el patrón REJECTION_LOG_SAMPLE_RATE).

NO se rehace la emisión, la rotación ni el bearer. Tampoco se tocan el alta ni la reautenticación del dispositivo (HU-03a-03/04), las claves de límites de frecuencia (HU-03a-05), la impersonación (EP-14b, queda el punto de extensión), /sync (EP-09), los privilegios de configuracion_clave (ya vigentes desde la migración 20260929013806_configuracion_operativa) ni el workflow deploy-staging.yml (el seed queda como paso previo documentado en el runbook, igual que catalogo-capacidades).

Se sabe que funciona cuando: correr el seed dos veces deja las mismas filas; una emisión nueva da accessTokenExpiraEn=900 (segundos) y 300 al cambiar la clave; GET /v1/configuracion/publica responde 200; renovarToken responde refresh_invalido a los 30 días y 1 segundo; una operación sin x-capacidad responde 403; la prueba de cableado nombra cualquier ruta sin middleware ni exención. QA-03a-02-01 en staging es evidencia posterior al despliegue. Tamaño: 5 puntos en 3 sesiones T2.

ADVERTENCIAS: (1) El rollback vuelve a leer las variables de entorno: hay que mantener el respaldo mientras falte sembrar algún entorno. (2) La denegación por defecto puede cortar rutas autenticadas hoy permisivas; la prueba de cableado y su lista de exenciones son la red. (3) Las pruebas existentes no se modifican, con una excepción acotada: si server/src/test/s01/middleware-capacidad.test.ts afirma el next() viejo para una operación autenticada fuera del contrato o sin x-capacidad, se adapta para esperar 403 sin aflojar otras aserciones (regla vigente del dev). Los casos nuevos van en archivos nuevos.

Pendiente: valor de soportePlazoSinRespuestaDias (opcional en el contrato) solo si Producto lo fija antes de la sesión 1.
## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:108

Existe un seed nombrado e idempotente del catálogo configuracion_clave, ejecutable por el pipeline de despliegue con el rol de migración, siguiendo el precedente del escenario catalogo-capacidades. Inserta solo las claves faltantes, no altera valores existentes (no pisa ajustes de operación) e informa cuántas claves creó, actualizó o dejó igual.

### REQ-02 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:109

El servicio de emisión lee la vigencia del access token y la del refresh desde configuracion_clave en cada emisión, en vez de JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS. Las variables de entorno quedan solo como respaldo cuando falta la clave, hasta que todos los entornos estén sembrados. Un cambio de clave rige para las emisiones nuevas sin redesplegar y no altera las sesiones ya emitidas.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:111

En una base sembrada, GET /configuracion/publica (obtenerConfiguracionPublica) responde 200 con accountDeletionPortalUrl válida contra el contrato, en lugar del 503 actual.

### REQ-04 `inferred`
> Fuente: QA-03a-02-04 · HU-03a-02 · TAO-244-Q7

Un refresh emitido deja de ser válido al cumplir su vigencia: a los 30 días y 1 segundo, renovarToken responde refresh_invalido y la sesión queda revocada con un motivo de expiración (QA-03a-02-04, segunda mitad). El motivo es el texto existente 'refresh expirado' (server/src/auth/sesiones.ts), distinto de 'reuso de refresh rotado'; ya se implementa, así que este ticket solo agrega la prueba.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:114

Denegación por defecto en server/src/middleware/capacidad.ts: una operación autenticada que no se resuelve en el contrato o no declara x-capacidad responde 403 en tiempo de ejecución, en vez de llamar a next(). Se conservan el cálculo de capacidades efectivas sin caché y las respuestas capacidad_denegada y requiere_cuenta_completa.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:119

Una prueba de cableado sobre la app real (app.ts) recorre todas las operaciones autenticadas del contrato y comprueba que cada una pasa por el middleware de capacidad o figura en una lista de exenciones con su justificación.

### REQ-08 `inferred`
> Fuente: HU-03a-07 · Observabilidad · TAO-244

Cada denegación del middleware (capacidad_denegada, requiere_cuenta_completa y la denegación por defecto) se registra con errorCode, capacidad, accountRef seudónimo y la operación (operationId, o método y ruta cuando no se resuelve), sin otras capacidades de la cuenta. El registro se muestrea para no saturar la cuota de logs, y la respuesta HTTP no revela capacidades ajenas a la pedida.

### REQ-09 `confirmed` `variant`
> Fuente: sonda:card-guardas-de-entrada-0f52c828da

Variante de guardas de entrada: POST /cuenta/registro (server/src/routes/cuenta.ts:72) y PUT /cuenta/correo (server/src/routes/cuenta.ts:106) aplican el middleware de capacidad con la capacidad y el tipo de cuenta que declara el contrato. Si alguna se exime, la exención se declara y justifica por operación.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145

Variante de privilegios de rol: configuracion_clave es un catálogo de solo lectura para la app (DEC-222), garantizado ya por la migración 20260929013806_configuracion_operativa (taomangalam_app solo SELECT sobre configuracion_clave; SELECT e INSERT append-only sobre configuracion_version). Este ticket no crea migración de privilegios ni cambia los de configuracion_version. La siembra usa el rol de migración (MIGRATION_DATABASE_URL) y el seed falla con permission denied si se ejecuta con el rol de aplicación.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

Variante de docs de la superficie: el seed del catálogo de configuración queda documentado (uso, parámetros, ejemplo de salida con los conteos) en docs/development/configuration.md, y su paso con el rol de migración en el runbook docs/development/release-runbook.md.

### REQ-12 `confirmed` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:286

Reuso y fidelidad: se usan la emisión de TokenPair con jose (^6.2.12, sin cambiar de versión ni agregar dependencias), renovarToken, sesion_auth, el middleware capacidad.ts, ci-checks.ts y la regla Spectral tm-operation-x-capacidad existentes, sin reimplementarlos. El seed replica el patrón del escenario catalogo-capacidades y no hay cambio de contrato.

### REQ-13 `inferred`
> Fuente: request:HU-03a-07 Incluye 'Denegación por defecto' + Rollback 'las rutas públicas siguen accesibles'

La denegación por defecto del middleware de capacidad cubre también el caso de una operación autenticada cuyo x-capacidad está presente pero no existe en el registro de capacidades: responde 403 y se registra como denegación, sin llamar a next(). Las rutas públicas (sin bearer) no pasan por esta denegación y siguen accesibles.

### REQ-14 `confirmed`
> Fuente: Incluye: claves de vigencia y accountDeletionPortalUrl sembradas; soportePlazoSinRespuestaDias si el contrato la usa

El seed del catálogo de configuración siembra sesion.access_ttl_segundos=900 (15 minutos), sesion.refresh_ttl_segundos=2592000 (30 días) y accountDeletionPortalUrl=https://portal.taomangalam.cl/eliminar-cuenta (valor provisional, igual en development, staging y producción), y soportePlazoSinRespuestaDias solo si el contrato la usa. Las claves no contienen secretos. El seed solo agrega claves faltantes con INSERT ... ON CONFLICT DO NOTHING: no pisa valores ajustados por operación, y ejecutarlo dos veces no duplica ni altera filas. La URL provisional es decisión registrada del dev en nombre de Producto: el mismo valor en los tres entornos es aceptable hasta que Producto fije la definitiva (se cambia con config:set, sin redesplegar). soportePlazoSinRespuestaDias es opcional en el contrato (server/contract/openapi.yaml, schema de obtenerConfiguracionPublica, campo no requerido): se siembra solo si Producto fija su valor antes de la sesión 1; si no, el seed crea 3 claves y la respuesta omite el campo.

### REQ-15 `confirmed`
> Fuente: Incluye 'Cruzar CAPACIDADES_CUENTA_COMPLETA' (nota 3 del catálogo 14)

Cruce de integridad: toda capacidad de CAPACIDADES_CUENTA_COMPLETA debe estar declarada solo en operaciones con x-requiere-cuenta: completa, y la prueba o regla falla nombrando la operación que la declara sin marcar x-requiere-cuenta: completa. Así la nota 3 del catálogo 14 no depende solo del contrato.

### REQ-16 `confirmed`
> Fuente: request:HU-03a-07 casos QA-03a-07-02 y QA-03a-07-03

QA-03a-07-02 y QA-03a-07-03 por la ruta real: una cuenta de dispositivo que llama a listarMisDispositivos recibe 403 requiere_cuenta_completa, y una capacidad quitada en la base se refleja en la siguiente petición como 403 capacidad_denegada sin reiniciar ni caché.

### REQ-17 `confirmed` `enforcement`
> Fuente: request:HU-03a-02 Compatibilidad/migración + Handoff Rollback

Retiro de las variables JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS: este cambio no las elimina; el respaldo por variable de entorno se conserva y su retiro queda condicionado a que las claves estén sembradas en todos los entornos. El rollback vuelve a leer las vigencias de las variables sin borrar claves sembradas ni sesiones activas.
## Tasks

#### S1.T2 — Escenario de seed nombrado e idempotente del catálogo configuracion_clave, con INSERT ... ON CONFLICT DO NOTHING, ejecutable con el rol de migración. Las claves sesion.access_ttl_segundos y sesion.refresh_ttl_segundos se siembran con tipo INTEGER, alcance GLOBAL y sensibilidad INTERNA, para que no aparezcan en GET /configuracion/publica; accountDeletionPortalUrl con tipo STRING, GLOBAL y PUBLICA.
Contrato: rollback: Quitar server/src/seeds/scenarios/configuracion-catalogo.ts y su entrada en server/src/seeds/registry.ts; las filas sembradas se conservan. Status: done

#### S1.T3 — Documentar el seed configuracion-catalogo en docs/development/configuration.md (uso, parámetros, ejecución con el rol de migración vía MIGRATION_DATABASE_URL, comando pnpm -C server db:seed y node dist/seeds/cli.js --scenario configuracion-catalogo en el servicio, ejemplo de salida con los conteos creadas, actualizadas y sin cambios, que 'actualizadas' es siempre 0 por ON CONFLICT DO NOTHING, y la política de no pisar valores ajustados) y agregar en docs/development/release-runbook.md el paso previo del seed con el rol de migración seguido del smoke de GET /v1/configuracion/publica, junto al precedente de catalogo-capacidades.
Contrato: rollback: Revertir los dos archivos .md. Status: done

#### S1.T4 — Pruebas del seed y su documentación en server/src/test/configuracion/seed-configuracion.test.ts y server/src/test/configuracion/docs-seed-configuracion.test.ts: idempotencia (segunda corrida no duplica ni altera filas), valores sembrados, conteos informados, caso de que el seed con el rol de aplicación falla con permission denied y no inserta filas, y caso de que cada clave creada tiene exactamente una fila en configuracion_version. Los privilegios de configuracion_clave ya los cubre server/src/configuracion.integration.test.ts (línea 198), que se ejecuta sin modificarlo; no se crea privilegios-configuracion.test.ts.
Contrato: rollback: Borrar los dos archivos de prueba nuevos (seed-configuracion.test.ts y docs-seed-configuracion.test.ts). Status: done

#### S2.T1 — El servicio de emisión lee la vigencia del access token y la del refresh desde configuracion_clave en cada emisión, con las variables JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS solo como respaldo cuando falta la clave. Fuente de lectura: la última versión de configuracion_version de cada clave (misma resolución que server/src/models/public-configuration.ts), consultada en cada emisión. Las pruebas cambian el valor agregando una versión por la misma vía que config:set (ejecutarAplicacionVersion de server/src/configuracion/aplicar.ts), no editando filas.
Contrato: rollback: Revertir el servicio de emisión al SHA anterior, que vuelve a leer las variables de entorno; las claves sembradas se conservan. Status: done

#### S2.T2 — Sin cambio de código: confirmar que renovarToken ya devuelve refresh_invalido y revoca la familia con motivoRevocacion='refresh expirado' cuando expiraAt <= instante (server/src/auth/sesiones.ts). Si al ejecutar no fuera así, detenerse y reportar.
Contrato: rollback: No aplica: no cambia código. Status: done

#### S2.T3 — Crear las pruebas nuevas de S2: server/src/test/auth/session-ttl-config.test.ts (accessTokenExpiraEn=900 por defecto, como número en segundos, igual que ya fijan session-emit.test.ts y login.test.ts; 300 al cambiar la clave a 300 sin reiniciar; la sesión previa conserva su vigencia; respaldo por variable de entorno cuando falta la clave), server/src/test/auth/session-refresh-expiry.test.ts (reloj falso: 30 días + 1 s da refresh_invalido y revocación por expiración; 30 días - 1 s rota) y server/src/test/configuracion/configuracion-publica.test.ts (Supertest sobre la app real en base sembrada: 200 con https://portal.taomangalam.cl/eliminar-cuenta válido contra el contrato, sin bearer). Regresión sin modificar: session-emit, session-rotate, bearer-verify y server/src/public-configuration.integration.test.ts.
Contrato: rollback: Borrar los archivos de prueba nuevos. Status: done

#### S3.T1 — Contenedora de la denegación por defecto del middleware de capacidad. Agrupa exactamente S3.T1.1 (denegación por defecto), S3.T1.2 (log de denegación), S3.T1.3 (middleware en server/src/routes/cuenta.ts) y S3.T1.4 (lista de exenciones y cableado).
Contrato: rollback: Revertir capacidad.ts, routes/cuenta.ts y app.ts al SHA anterior, sin abrir rutas protegidas que ya tenían middleware. Status: pending

#### S3.T1.1 — En server/src/middleware/capacidad.ts, responder 403 (y registrar la denegación) a una operación autenticada que no se resuelve en el contrato, que no declara x-capacidad o cuyo x-capacidad está presente pero no existe en el registro de capacidades, en vez de llamar a next(). Las peticiones sin autenticación (sin res.locals.autenticacion) siguen pasando. Antes de cambiar, revisar server/src/test/s01/middleware-capacidad.test.ts: si algún caso afirma que una operación autenticada fuera del contrato o sin x-capacidad sigue con next() (comportamiento viejo que este ticket cambia), adaptarlo para que espere 403 sin aflojar ninguna otra aserción; si no lo afirma, no se toca.
Contrato: rollback: Revertir el bloque de resolución de capacidad.ts. Status: pending

#### S3.T1.2 — Registro de cada denegación con errorCode, capacidad y accountRef seudónimo, muestreado. La entrada de log incluye además la operación (operationId cuando se resuelve; método y ruta normalizada cuando no se resuelve en el contrato). La tasa sigue el patrón REJECTION_LOG_SAMPLE_RATE de server/src/middleware/app-version.ts, pero se elige por APP_ENV (server/src/config.ts): 1.0 en development y staging, 0.1 en production; la prueba la inyecta por opción del middleware.
Contrato: rollback: Quitar la llamada de log del middleware. Status: pending

#### S3.T1.3 — Montar el middleware en server/src/routes/cuenta.ts para POST /cuenta/registro (línea 72) y PUT /cuenta/correo (línea 106) con la capacidad y el tipo de cuenta del contrato; si alguna se exime, declararla con su justificación en la lista de exenciones
Contrato: rollback: Revertir routes/cuenta.ts. Status: pending

#### S3.T1.4 — Lista de exenciones justificada (operationId y motivo) que consume la prueba de cableado; incluye solo operaciones públicas o exentas con justificación escrita
Contrato: rollback: Borrar el módulo de exenciones. Status: pending

#### S3.T2 — Crear las pruebas nuevas de S3: server/src/test/capacidades/capacidad-denegacion-defecto.test.ts (403 sin x-capacidad, no resuelta y con capacidad inexistente; QA-03a-07-03 capacidad quitada en la base da capacidad_denegada en la siguiente petición), server/src/test/capacidades/capacidad-denegacion-log.test.ts (errorCode, capacidad y accountRef seudónimo, sin otras capacidades; muestreo forzado a 1.0 y a 0), server/src/test/cuenta/cuenta-capacidad.test.ts (router real de cuenta con cuenta de dispositivo y completa), server/src/test/capacidades/cableado-capacidad.test.ts (recorre las operaciones con bearer del contrato contra la app real de server/src/app.ts; incluye QA-03a-07-02: listarMisDispositivos con cuenta de dispositivo da 403 requiere_cuenta_completa; falla nombrando el operationId sin middleware ni exención) y server/src/test/capacidades/cuenta-completa-cruce.test.ts (CAPACIDADES_CUENTA_COMPLETA contra x-requiere-cuenta: completa, falla nombrando la operación). Regresión: server/src/test/s01/middleware-capacidad.test.ts (con la adaptación de S3.T1.1 solo si aplica) y server/src/test/s01/ci-capacidad.test.ts.
Contrato: rollback: Borrar los archivos de prueba nuevos. Status: pending
## Cambios al modelo de datos

- tipo: seed_catalog | objetos: configuracion_clave, configuracion_version | destructivo: no | tarea: S1.T2 | rollback: quitar el escenario configuracion-catalogo y su entrada en server/src/seeds/registry.ts; las claves y versiones sembradas se conservan, según el rollback del handoff; volver al SHA anterior, donde la emisión lee las variables de entorno.
- Sin migraciones: los privilegios de configuracion_clave (solo SELECT para taomangalam_app) y de configuracion_version (SELECT e INSERT append-only) ya vigen desde 20260929013806_configuracion_operativa; motivoRevocacion de sesion_auth es texto libre y ya admite 'refresh expirado'.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-13 (add) `inferred`: La denegación por defecto del middleware de capacidad cubre también el caso de una operación autenticada cuyo x-capacidad está presente pero
- REQ-14 (add) `confirmed`: El seed del catálogo de configuración siembra las claves de vigencia de sesión (access token 15 minutos, refresh 30 días) y accountDeletionP
- REQ-15 (add) `confirmed`: Cruce de integridad: toda capacidad de CAPACIDADES_CUENTA_COMPLETA debe estar declarada solo en operaciones con x-requiere-cuenta: completa,
- REQ-16 (add) `confirmed`: QA-03a-07-02 y QA-03a-07-03 por la ruta real: una cuenta de dispositivo que llama a listarMisDispositivos recibe 403 requiere_cuenta_complet
- REQ-17 (add) `confirmed`: Retiro de las variables JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS: este cambio no las elimina; el respaldo por variable de entorno se co

**Tasks agregadas:**

- S1: Crear el seed nombrado e idempotente del catálogo configuracion_clave replicando el patrón del escenario catalogo-capacidades, ejecutable con el rol de migración: claves de vigencia access token (15 minutos) y refresh (30 días), accountDeletionPortalUrl provisional por entorno (y soportePlazoSinRespuestaDias si el contrato la usa). Insertar solo claves faltantes, sin pisar valores existentes, e informar creadas/actualizadas/iguales. (valida: REQ-01, REQ-14, REQ-10; rollback: Revertir el commit del seed y su registro en el pipeline; las filas ya sembradas se conservan, no se borran.)
- S1: Hacer que el servicio de emisión de sesión lea las vigencias desde configuracion_clave en cada emisión, con respaldo en JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS cuando falta la clave. Sin tocar la rotación, jose (^6.2.12) ni la versión de dependencias. (valida: REQ-02, REQ-17, REQ-12; rollback: Revertir el commit para volver a leer solo las variables de entorno; las sesiones emitidas no cambian.)
- S1: Pruebas HU-03a-02: expiración del refresh con reloj falso (30 días y 1 segundo da refresh_invalido y sesión revocada con motivo de expiración), vigencias desde configuración con cambio a 5 minutos sin afectar la sesión anterior, seed idempotente contra PostgreSQL efímero, Supertest de GET /configuracion/publica en base sembrada (200), y verificación de que taomangalam_app solo tiene SELECT sobre configuracion_clave (REVOKE explícito si los default privileges otorgan escritura). (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-10, REQ-14, REQ-17, test; rollback: Revertir los archivos de prueba nuevos; no afectan código de producción.)
- S1: Documentar el seed del catálogo de configuración (uso, parámetros, ejemplo de salida con los conteos) en docs/development/configuration.md y su paso con el rol de migración en docs/development/release-runbook.md. (valida: REQ-11; rollback: Revertir el commit de documentación.)
- S2: En server/src/middleware/capacidad.ts, reemplazar el next() de operaciones autenticadas no resueltas o sin x-capacidad (o con capacidad inexistente en el registro) por respuesta 403, conservando el cálculo sin caché y las respuestas capacidad_denegada y requiere_cuenta_completa. Las rutas públicas quedan fuera. (valida: REQ-05, REQ-13; rollback: Revertir el commit del middleware; vuelve al comportamiento permisivo con la CI como red.)
- S2: Aplicar el middleware de capacidad en server/src/routes/cuenta.ts para POST /cuenta/registro (línea 72) y PUT /cuenta/correo (línea 106) con la capacidad y el tipo de cuenta que declara el contrato; si alguna se exime, declarar y justificar la exención por operación en la lista de exenciones. (valida: REQ-09, REQ-16; rollback: Revertir el commit de routes/cuenta.ts; las rutas vuelven a quedar solo con bearer.)
- S2: Registrar cada denegación (capacidad_denegada, requiere_cuenta_completa y denegación por defecto) con errorCode, capacidad y accountRef seudónimo, con muestreo y sin listar otras capacidades de la cuenta ni exponerlas en la respuesta. (valida: REQ-08; rollback: Revertir el commit del logging; las respuestas 403 no cambian.)
- S3: Pruebas HU-03a-07: prueba de cableado sobre app.ts real que recorre todas las operaciones autenticadas del contrato (middleware o lista de exenciones justificada), cruce de CAPACIDADES_CUENTA_COMPLETA con x-requiere-cuenta: completa (falla nombrando la operación), Supertest sobre rutas reales de cuenta (POST /cuenta/registro, PUT /cuenta/correo, listarMisDispositivos), caso de capacidad quitada en la base, denegación por defecto y contenido del log de denegación. (valida: REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-13, REQ-15, REQ-16, test; rollback: Revertir los archivos de prueba nuevos; no afectan código de producción.)

### Enmienda 2
**REQs:**

- REQ-14 (edit) `confirmed`: El seed del catálogo de configuración siembra sesion.access_ttl_segundos=900 (15 minutos), sesion.refresh_ttl_segundos=2592000 (30 días) y a

**Task ops:**

- edit S1.T1 { validates=["REQ-10"], verify=["pnpm -C server exec vitest run src/test/configuracion/privilegios-configuracion.test.ts"] }
- edit S1.T2 { desc="Crear el escenario nuevo server/src/seeds/scenarios/configuracion-catalogo.ts y registrarlo en server/src/seeds/registry.ts, siguiendo el patrón del escenario catalogo-capacidades y ejecutado con el rol de migración (MIGRATION_DATABASE_URL) mediante `pnpm -C server db:seed`. Sembrar en configuracion_clave, con los valores de REQ-14 y en segundos: sesion.access_ttl_segundos=900, sesion.refresh_ttl_segundos=2592000 y accountDeletionPortalUrl=https://portal.taomangalam.cl/eliminar-cuenta (igual en development, staging y producción); soportePlazoSinRespuestaDias solo si el contrato la usa. Usar INSERT ... ON CONFLICT DO NOTHING para no pisar valores ajustados por operación. Informar creadas, actualizadas y sin cambios. Como usa ON CONFLICT DO NOTHING, el conteo 'actualizadas' es siempre 0; se informa igual para mantener el formato de catalogo-capacidades (creadas, actualizadas, sin cambios).", validates=["REQ-01","REQ-14"], verify=["pnpm -C server exec vitest run src/test/configuracion/seed-configuracion.test.ts"] }
- edit S1.T3 { desc="Documentar el seed del catálogo de configuración (uso con `pnpm -C server db:seed`, parámetros y ejemplo de salida con los conteos) en docs/development/configuration.md, y su paso con el rol de migración en docs/development/release-runbook.md. Mencionar en la doc que el conteo 'actualizadas' es siempre 0 porque el seed usa ON CONFLICT DO NOTHING.", validates=["REQ-11"], verify=["pnpm -C server exec vitest run src/test/configuracion/docs-seed-configuracion.test.ts"] }
- edit S1.T4 { desc="Crear las pruebas nuevas de S1: server/src/test/configuracion/seed-configuracion.test.ts (base vacía crea las claves de REQ-14 con 900, 2592000 y la URL provisional; segunda corrida creadas=0 y actualizadas=0; no pisa un valor ajustado; el rol de aplicación no puede sembrar), server/src/test/configuracion/privilegios-configuracion.test.ts y server/src/test/configuracion/docs-seed-configuracion.test.ts.", validates=["REQ-01","REQ-10","REQ-11","REQ-14"], verify=["pnpm -C server exec vitest run src/test/configuracion/seed-configuracion.test.ts src/test/configuracion/privilegios-configuracion.test.ts src/test/configuracion/docs-seed-configuracion.test.ts"] }
- edit S2.T1 { desc="Leer sesion.access_ttl_segundos y sesion.refresh_ttl_segundos (en segundos) desde configuracion_clave en cada emisión, con respaldo en JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS (hoy pasados en server/src/app.ts:177-178) y luego el default (15 minutos y 30 días). Las variables de entorno no se eliminan. Un cambio de clave rige para emisiones nuevas sin redesplegar y no altera sesiones ya emitidas.", validates=["REQ-02","REQ-12","REQ-17"], verify=["pnpm -C server exec vitest run src/test/auth/session-ttl-config.test.ts"] }
- edit S2.T2 { validates=["REQ-04"], verify=["pnpm -C server exec vitest run src/test/auth/session-refresh-expiry.test.ts"] }
- edit S2.T3 { desc="Crear las pruebas nuevas de S2: server/src/test/auth/session-ttl-config.test.ts (accessTokenExpiraEn=900 por defecto, como número en segundos, igual que ya fijan session-emit.test.ts y login.test.ts; 300 al cambiar la clave a 300 sin reiniciar; la sesión previa conserva su vigencia; respaldo por variable de entorno cuando falta la clave), server/src/test/auth/session-refresh-expiry.test.ts (reloj falso: 30 días + 1 s da refresh_invalido y revocación por expiración; 30 días - 1 s rota) y server/src/test/configuracion/configuracion-publica.test.ts (Supertest sobre la app real en base sembrada: 200 con https://portal.taomangalam.cl/eliminar-cuenta válido contra el contrato, sin bearer). Regresión sin modificar: session-emit, session-rotate, bearer-verify y server/src/public-configuration.integration.test.ts.", validates=["REQ-02","REQ-03","REQ-04","REQ-17"], verify=["pnpm -C server exec vitest run src/test/auth/session-ttl-config.test.ts src/test/auth/session-refresh-expiry.test.ts src/test/configuracion/configuracion-publica.test.ts","pnpm -C server exec vitest run src/test/auth src/public-configuration.integration.test.ts"] }
- edit S3.T1 { desc="Contenedora de la denegación por defecto del middleware de capacidad. Agrupa exactamente S3.T1.1 (denegación por defecto), S3.T1.2 (log de denegación), S3.T1.3 (middleware en server/src/routes/cuenta.ts) y S3.T1.4 (lista de exenciones y cableado).", validates=["REQ-05","REQ-06","REQ-08","REQ-09","REQ-13"], verify=["pnpm -C server exec vitest run src/test/capacidades/capacidad-denegacion-defecto.test.ts src/test/s01/middleware-capacidad.test.ts","pnpm -C server exec vitest run src/test/capacidades/capacidad-denegacion-log.test.ts src/test/cuenta/cuenta-capacidad.test.ts","pnpm -C server exec vitest run src/test/capacidades/cableado-capacidad.test.ts"] }
- edit S3.T1.1 { desc="En server/src/middleware/capacidad.ts, responder 403 (y registrar la denegación) a una operación autenticada que no se resuelve en el contrato, que no declara x-capacidad o cuyo x-capacidad está presente pero no existe en el registro de capacidades, en vez de llamar a next(). Las peticiones sin autenticación (sin res.locals.autenticacion) siguen pasando. Antes de cambiar, revisar server/src/test/s01/middleware-capacidad.test.ts: si algún caso afirma que una operación autenticada fuera del contrato o sin x-capacidad sigue con next() (comportamiento viejo que este ticket cambia), adaptarlo para que espere 403 sin aflojar ninguna otra aserción; si no lo afirma, no se toca.", validates=["REQ-05","REQ-13"], verify=["pnpm -C server exec vitest run src/test/capacidades/capacidad-denegacion-defecto.test.ts src/test/s01/middleware-capacidad.test.ts"] }
- edit S3.T1.2 { desc="Registrar cada denegación del middleware con errorCode, capacidad y accountRef seudónimo, sin otras capacidades de la cuenta. La tasa de muestreo es una constante configurable por entorno: 1.0 (100%) en development y staging, 0.1 (10%) en producción.", validates=["REQ-08"], verify=["pnpm -C server exec vitest run src/test/capacidades/capacidad-denegacion-log.test.ts"] }
- edit S3.T1.3 { validates=["REQ-09"], verify=["pnpm -C server exec vitest run src/test/cuenta/cuenta-capacidad.test.ts"] }
- edit S3.T1.4 { validates=["REQ-06"], verify=["pnpm -C server exec vitest run src/test/capacidades/cableado-capacidad.test.ts"] }
- edit S3.T2 { desc="Crear las pruebas nuevas de S3: server/src/test/capacidades/capacidad-denegacion-defecto.test.ts (403 sin x-capacidad, no resuelta y con capacidad inexistente; QA-03a-07-03 capacidad quitada en la base da capacidad_denegada en la siguiente petición), server/src/test/capacidades/capacidad-denegacion-log.test.ts (errorCode, capacidad y accountRef seudónimo, sin otras capacidades; muestreo forzado a 1.0 y a 0), server/src/test/cuenta/cuenta-capacidad.test.ts (router real de cuenta con cuenta de dispositivo y completa), server/src/test/capacidades/cableado-capacidad.test.ts (recorre las operaciones con bearer del contrato contra la app real de server/src/app.ts; incluye QA-03a-07-02: listarMisDispositivos con cuenta de dispositivo da 403 requiere_cuenta_completa; falla nombrando el operationId sin middleware ni exención) y server/src/test/capacidades/cuenta-completa-cruce.test.ts (CAPACIDADES_CUENTA_COMPLETA contra x-requiere-cuenta: completa, falla nombrando la operación). Regresión: server/src/test/s01/middleware-capacidad.test.ts (con la adaptación de S3.T1.1 solo si aplica) y server/src/test/s01/ci-capacidad.test.ts.", validates=["REQ-05","REQ-06","REQ-07","REQ-08","REQ-09","REQ-12","REQ-13","REQ-15","REQ-16"], verify=["pnpm -C server exec vitest run src/test/capacidades/capacidad-denegacion-defecto.test.ts src/test/capacidades/capacidad-denegacion-log.test.ts src/test/cuenta/cuenta-capacidad.test.ts src/test/capacidades/cableado-capacidad.test.ts src/test/capacidades/cuenta-completa-cruce.test.ts","pnpm -C server exec vitest run src/test/s01/middleware-capacidad.test.ts src/test/s01/ci-capacidad.test.ts"] }

### Enmienda 3
**REQs:**

- REQ-15 (edit) `confirmed`: Cruce de integridad: toda capacidad de CAPACIDADES_CUENTA_COMPLETA debe estar declarada solo en operaciones con x-requiere-cuenta: completa,
- REQ-14 (edit) `confirmed`: El seed del catálogo de configuración siembra sesion.access_ttl_segundos=900 (15 minutos), sesion.refresh_ttl_segundos=2592000 (30 días) y a

**Task ops:**

- edit S3.T2 { validates=["REQ-05","REQ-06","REQ-08","REQ-09","REQ-12","REQ-13","REQ-15","REQ-16"] }
- edit S1.T2 { desc="'Ejecutable por el pipeline de despliegue' significa invocable con el rol de migración igual que catalogo-capacidades (node dist/seeds/cli.js --scenario configuracion-catalogo dentro del servicio, o pnpm -C server db:seed en local). Hoy deploy-staging.yml no corre seeds y el precedente (docs/development/release-runbook.md, seed del catálogo de capacidades) es un paso previo documentado; cablearlo en el workflow queda fuera de alcance. El escenario solo corre cuando se nombra con --scenario, así que no ejecuta escenarios de desarrollo en producción.", rollback="Quitar server/src/seeds/scenarios/configuracion-catalogo.ts y su entrada en server/src/seeds/registry.ts; las filas sembradas se conservan" }
- edit S1.T1 { desc="Incluir down.sql. No se modifica server/src/test/migrations/migracion-inversa.test.ts (requiere aprobación del dev para tocar una prueba existente); el down.sql queda cubierto por el caso de regresión de REQ-10 en server/src/test/configuracion/privilegios-configuracion.test.ts" }

**REQ ops:**

- remove REQ-07

### Enmienda 4
**REQs:**

- REQ-10 (edit) `confirmed`: Variante de privilegios de rol: configuracion_clave es un catálogo de solo lectura para la app (DEC-222), garantizado ya por la migración 20

**Task ops:**

- edit S1.T2 { desc="Implementar el seed nombrado e idempotente del catálogo configuracion_clave siguiendo el precedente server/src/seeds/scenarios/catalogo-capacidades.ts, registrado en server/src/seeds/registry.ts y ejecutable con db:seed o node dist/seeds/cli.js --scenario, con el rol de migración (MIGRATION_DATABASE_URL). Siembra sesion.access_ttl_segundos=900, sesion.refresh_ttl_segundos=2592000 y accountDeletionPortalUrl=https://portal.taomangalam.cl/eliminar-cuenta con INSERT ... ON CONFLICT DO NOTHING, e informa cuántas claves creó, actualizó o dejó igual. Por cada clave creada, el seed inserta también su valor inicial en configuracion_version (valor, autor='seed', motivo='Siembra inicial del catálogo'), dentro de la misma transacción y solo si la clave se creó en esta corrida; si la clave ya existía no agrega versión, así no pisa valores ajustados con config:set. La lectura usa la última versión vigente de configuracion_version.", validates=["REQ-01","REQ-10","REQ-14"] }
- edit S1.T4 { desc="Pruebas del seed y su documentación en server/src/test/configuracion/seed-configuracion.test.ts y server/src/test/configuracion/docs-seed-configuracion.test.ts: idempotencia (segunda corrida no duplica ni altera filas), valores sembrados, conteos informados, caso de que el seed con el rol de aplicación falla con permission denied y no inserta filas, y caso de que cada clave creada tiene exactamente una fila en configuracion_version. Los privilegios de configuracion_clave ya los cubre server/src/configuracion.integration.test.ts (línea 198), que se ejecuta sin modificarlo; no se crea privilegios-configuracion.test.ts.", validates=["REQ-01","REQ-10","REQ-11","REQ-14"], verify=["pnpm -C server exec vitest run src/test/configuracion/seed-configuracion.test.ts src/test/configuracion/docs-seed-configuracion.test.ts","pnpm -C server exec vitest run src/configuracion.integration.test.ts"] }

### Enmienda 5
**REQs:**

- REQ-04 (edit) `inferred`: Un refresh emitido deja de ser válido al cumplir su vigencia: a los 30 días y 1 segundo, renovarToken responde refresh_invalido y la sesión 
- REQ-08 (edit) `inferred`: Cada denegación del middleware (capacidad_denegada, requiere_cuenta_completa y la denegación por defecto) se registra con errorCode, capacid

**Task ops:**

- edit S2.T2 { desc="Sin cambio de código: confirmar que renovarToken ya devuelve refresh_invalido y revoca la familia con motivoRevocacion='refresh expirado' cuando expiraAt <= instante (server/src/auth/sesiones.ts). Si al ejecutar no fuera así, detenerse y reportar.", rollback="No aplica: no cambia código", validates=["REQ-04"] }
- edit S2.T1 { desc="El servicio de emisión lee la vigencia del access token y la del refresh desde configuracion_clave en cada emisión, con las variables JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS solo como respaldo cuando falta la clave. Fuente de lectura: la última versión de configuracion_version de cada clave (misma resolución que server/src/models/public-configuration.ts), consultada en cada emisión. Las pruebas cambian el valor agregando una versión por la misma vía que config:set (ejecutarAplicacionVersion de server/src/configuracion/aplicar.ts), no editando filas." }
- edit S1.T2 { desc="Escenario de seed nombrado e idempotente del catálogo configuracion_clave, con INSERT ... ON CONFLICT DO NOTHING, ejecutable con el rol de migración. Las claves sesion.access_ttl_segundos y sesion.refresh_ttl_segundos se siembran con tipo INTEGER, alcance GLOBAL y sensibilidad INTERNA, para que no aparezcan en GET /configuracion/publica; accountDeletionPortalUrl con tipo STRING, GLOBAL y PUBLICA." }
- edit S1.T4 { rollback="Borrar los dos archivos de prueba nuevos (seed-configuracion.test.ts y docs-seed-configuracion.test.ts)", verify=["pnpm docs:check:changed"] }
- edit S3.T1.2 { desc="Registro de cada denegación con errorCode, capacidad y accountRef seudónimo, muestreado. La entrada de log incluye además la operación (operationId cuando se resuelve; método y ruta normalizada cuando no se resuelve en el contrato). La tasa sigue el patrón REJECTION_LOG_SAMPLE_RATE de server/src/middleware/app-version.ts, pero se elige por APP_ENV (server/src/config.ts): 1.0 en development y staging, 0.1 en production; la prueba la inyecta por opción del middleware." }
- edit S1.T3 { desc="QA-03a-02-01 (staging recién desplegado) y el log del seed en staging son evidencia posterior al despliegue, fuera de las sesiones de código: se obtienen corriendo el seed en staging según el runbook y consultando GET /v1/configuracion/publica." }

### Enmienda 6

**Task ops:**

- edit S1.T3 { desc="Documentar el seed configuracion-catalogo en docs/development/configuration.md (uso, parámetros, ejecución con el rol de migración vía MIGRATION_DATABASE_URL, comando pnpm -C server db:seed y node dist/seeds/cli.js --scenario configuracion-catalogo en el servicio, ejemplo de salida con los conteos creadas, actualizadas y sin cambios, que 'actualizadas' es siempre 0 por ON CONFLICT DO NOTHING, y la política de no pisar valores ajustados) y agregar en docs/development/release-runbook.md el paso previo del seed con el rol de migración seguido del smoke de GET /v1/configuracion/publica, junto al precedente de catalogo-capacidades.", rollback="Revertir los dos archivos .md", validates=["REQ-11"], verify=["pnpm -C server exec vitest run src/test/configuracion/docs-seed-configuracion.test.ts","pnpm docs:check:changed"] }
- edit S1.T4 { verify=["pnpm -C server exec vitest run src/test/configuracion/seed-configuracion.test.ts src/test/configuracion/docs-seed-configuracion.test.ts","pnpm -C server exec vitest run src/configuracion.integration.test.ts","pnpm docs:check:changed"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Tareas S1.T2 a S1.T4. Al correr el seed sobre una base efímera, el log muestra creadas=3 (4 solo si Producto fijó soportePlazoSinRespuestaDias), actualizadas=0 la primera vez y creadas=0, actualizadas=0 la segunda (actualizadas es siempre 0 por ON CONFLICT DO NOTHING); cada clave creada tiene una versión inicial en configuracion_version; un valor ajustado no se pisa; el seed con el rol de aplicación falla con permission denied; los docs describen el seed y su paso en el runbook. Verde: pnpm -C server exec vitest run src/test/configuracion/seed-configuracion.test.ts src/test/configuracion/docs-seed-configuracion.test.ts y la regresión pnpm -C server exec vitest run src/configuracion.integration.test.ts

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Tareas S2.T1 a S2.T3. accessTokenExpiraEn (número en segundos) vale 900 por defecto y 300 al cambiar sesion.access_ttl_segundos a 300 sin reiniciar; la expiración del refresh en sesion_auth queda 2592000 s después de la emisión; GET /v1/configuracion/publica responde 200 con https://portal.taomangalam.cl/eliminar-cuenta en la base sembrada; renovarToken responde refresh_invalido a los 30 días y 1 segundo. Verde: pnpm -C server exec vitest run src/test/auth/session-ttl-config.test.ts src/test/auth/session-refresh-expiry.test.ts src/test/configuracion/configuracion-publica.test.ts y la regresión pnpm -C server exec vitest run src/test/auth src/public-configuration.integration.test.ts

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T1.1
- [ ] S3.T1.2
- [ ] S3.T1.3
- [ ] S3.T1.4
- [ ] S3.T2

**Gate (auto)**: Tareas S3.T1 (S3.T1.1 a S3.T1.4) y S3.T2. 403 para una operación autenticada sin x-capacidad, no resuelta o con capacidad inexistente; capacidad_denegada o requiere_cuenta_completa en /cuenta/registro, /cuenta/correo y listarMisDispositivos por la app real; cableado-capacidad verde con la lista de exenciones justificada; cuenta-completa-cruce verde; entrada de log con errorCode, capacidad y accountRef seudónimo; middleware-capacidad y ci-capacidad verdes (middleware-capacidad adaptado solo si afirmaba el next() viejo, sin aflojar aserciones). Verde: los dos verify de S3.T2.

### Session 4 · T0 · open

### Session 5 · T0 · open

**Gate (auto)**: Evidencia posterior al despliegue de HU-03a-02 en staging (QA-03a-02-01).
