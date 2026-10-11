---
id: TAO-244-SPEC
project: taomangalam
ticket: TAO-244
status: draft
---

# TAO-244 · Vigencias de sesión y configuración pública desde claves sembradas, y autorización por capacidad con denegación por defecto

## Resumen ejecutivo

Se hacen dos cosas. Primero, un seed nombrado e idempotente de configuracion_clave, que corre el pipeline con el rol de migración. Siembra la vigencia del access token (15 min), la del refresh (30 días) y accountDeletionPortalUrl. El servicio de emisión pasa a leer esas claves en vez de JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS, que quedan solo como respaldo hasta que todos los entornos estén sembrados. Se agrega además la prueba de expiración del refresh con reloj falso. Segundo, el middleware capacidad.ts pasa a denegar por defecto y se monta en routes/cuenta.ts. Se suman una prueba de cableado de todo el contrato contra app.ts, el cruce de CAPACIDADES_CUENTA_COMPLETA con x-requiere-cuenta y un log muestreado de cada denegación. NO se rehace la emisión, la rotación ni el bearer. Tampoco se tocan el alta ni la reautenticación del dispositivo (HU-03a-03/04), las claves de límites de frecuencia (HU-03a-05), la impersonación (EP-14b) ni /sync (EP-09). Se sabe que funciona cuando: correr el seed dos veces deja las mismas filas, una emisión nueva vence a los 15 min y a los 30 días, GET /configuracion/publica responde 200, renovarToken responde refresh_invalido a los 30 días y 1 segundo, una operación sin x-capacidad responde 403 y la prueba de cableado nombra cualquier ruta sin middleware. Tamaño: 5 puntos en 3 sesiones T2. ADVERTENCIAS: (1) El rollback restaura las variables de entorno: hay que mantener el respaldo por env mientras falte sembrar algún entorno. (2) La denegación por defecto puede cortar rutas autenticadas hoy permisivas; la prueba de cableado y su lista de exenciones son la red. (3) Las pruebas existentes (middleware-capacidad, session-rotate) no se modifican sin aprobación: los casos nuevos van en archivos nuevos.
Datos a confirmar antes de ejecutar: (a) La ruta y el comando del escenario precedente catalogo-capacidades: ver server/package.json y el directorio de seeds de server/prisma. (b) Los nombres exactos de las claves de vigencia en configuracion_clave y si el contrato usa soportePlazoSinRespuestaDias: ver el schema de obtenerConfiguracionPublica en server/contract. (c) El valor provisional de accountDeletionPortalUrl por entorno, que lo fija Producto. (d) Si sembrar debe incrementar configuracion_version: ver el servicio de configuración de TAO-191. (e) La ruta de ci-checks.ts, de los tests de middleware y de app.ts dentro de server/src. (f) Si renovarToken ya revoca la sesión con un motivo de expiración o solo la rechaza. (g) El nombre del paquete pnpm del server, para los comandos verify (se asumió pnpm -C server). (h) El mecanismo de muestreo de logs que ya existe, si lo hay, y su tasa.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:108
> Necesidad: build
Existe un seed nombrado e idempotente del catálogo configuracion_clave, ejecutable por el pipeline de despliegue con el rol de migración, siguiendo el precedente del escenario catalogo-capacidades. Inserta solo las claves faltantes, no altera valores existentes (no pisa ajustes de operación) e informa cuántas claves creó, actualizó o dejó igual.

#### REQ-02 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:109
> Necesidad: build
El servicio de emisión lee la vigencia del access token y la del refresh desde configuracion_clave en cada emisión, en vez de JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS. Las variables de entorno quedan solo como respaldo cuando falta la clave, hasta que todos los entornos estén sembrados. Un cambio de clave rige para las emisiones nuevas sin redesplegar y no altera las sesiones ya emitidas.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:111
> Necesidad: build
En una base sembrada, GET /configuracion/publica (obtenerConfiguracionPublica) responde 200 con accountDeletionPortalUrl válida contra el contrato, en lugar del 503 actual.

#### REQ-04 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:113
> Necesidad: build
Un refresh emitido deja de ser válido al cumplir su vigencia: a los 30 días y 1 segundo, renovarToken responde refresh_invalido y la sesión queda revocada con un motivo de expiración (QA-03a-02-04, segunda mitad).

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:114
> Necesidad: build
Denegación por defecto en server/src/middleware/capacidad.ts: una operación autenticada que no se resuelve en el contrato o no declara x-capacidad responde 403 en tiempo de ejecución, en vez de llamar a next(). Se conservan el cálculo de capacidades efectivas sin caché y las respuestas capacidad_denegada y requiere_cuenta_completa.

#### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:119
> Necesidad: build
Una prueba de cableado sobre la app real (app.ts) recorre todas las operaciones autenticadas del contrato y comprueba que cada una pasa por el middleware de capacidad o figura en una lista de exenciones con su justificación.

#### REQ-07 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:142
> Necesidad: build
Se cruza CAPACIDADES_CUENTA_COMPLETA con las operaciones que declaran x-requiere-cuenta: completa, para que la nota 3 del catálogo 14 no dependa solo del contrato.

#### REQ-08 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:142
> Necesidad: build
Cada denegación del middleware (capacidad_denegada, requiere_cuenta_completa y la denegación por defecto) se registra con errorCode, capacidad y accountRef seudónimo, sin otras capacidades de la cuenta. El registro se muestrea para no saturar la cuota de logs, y la respuesta HTTP no revela capacidades ajenas a la pedida.

#### REQ-09 `confirmed`
> Fuente: sonda:card-guardas-de-entrada-0f52c828da
> Necesidad: build
Variante de guardas de entrada: POST /cuenta/registro (server/src/routes/cuenta.ts:72) y PUT /cuenta/correo (server/src/routes/cuenta.ts:106) aplican el middleware de capacidad con la capacidad y el tipo de cuenta que declara el contrato. Si alguna se exime, la exención se declara y justifica por operación.

#### REQ-10 `confirmed`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145
> Necesidad: build
Variante de privilegios de rol: configuracion_clave es un catálogo de solo lectura para la app (DEC-222). taomangalam_app conserva solo SELECT, con REVOKE explícito de INSERT, UPDATE y DELETE si los default privileges de la migración init los otorgan, y la siembra usa el rol de migración.

#### REQ-11 `confirmed`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6
> Necesidad: build
Variante de docs de la superficie: el seed del catálogo de configuración queda documentado (uso, parámetros, ejemplo de salida con los conteos) en docs/development/configuration.md, y su paso con el rol de migración en el runbook docs/development/release-runbook.md.

#### REQ-12 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:286
> Necesidad: build
Reuso y fidelidad: se usan la emisión de TokenPair con jose (^6.2.12, sin cambiar de versión ni agregar dependencias), renovarToken, sesion_auth, el middleware capacidad.ts, ci-checks.ts y la regla Spectral tm-operation-x-capacidad existentes, sin reimplementarlos. El seed replica el patrón del escenario catalogo-capacidades y no hay cambio de contrato.

## Tasks

#### S1.T1 — Migración de privilegios para configuracion_clave (y configuracion_version si comparte la condición): REVOKE INSERT, UPDATE, DELETE ON configuracion_clave FROM taomangalam_app, dejando solo SELECT, porque los default privileges de server/prisma/migrations/20260927223537_init/migration.sql otorgan escritura. Incluir down.sql y sumarla a la lista MIGRACIONES de migracion-inversa solo si se aprueba tocar ese test
Contrato: rollback: Aplicar el down.sql (GRANT de lo revocado) y quitar el directorio de la migración. Status: pending

#### S1.T2 — Seed nombrado e idempotente del catálogo configuracion_clave, con el patrón del escenario catalogo-capacidades: script ejecutable con la URL del rol de migración (MIGRATION_URL) desde el pipeline. Usa INSERT ... ON CONFLICT DO NOTHING para no pisar valores ajustados. Siembra la vigencia del access token=15 (minutos), la del refresh=30 (días), accountDeletionPortalUrl con el valor provisional por entorno y soportePlazoSinRespuestaDias solo si el contrato la usa. Al final imprime los conteos creadas, actualizadas e iguales. Sin secretos en los valores
Contrato: rollback: Quitar el script y su entrada en package.json; las filas sembradas se conservan. Status: pending

#### S1.T3 — Documentar el seed en docs/development/configuration.md (uso, parámetros, URL del rol de migración, ejemplo de salida con conteos y política de no pisar valores) y agregar el paso en docs/development/release-runbook.md (seed con el rol de migración y luego el smoke de GET /v1/configuracion/publica)
Contrato: rollback: Revertir los dos archivos .md. Status: pending

#### S1.T4 — Pruebas contra PostgreSQL efímero, en archivos nuevos: seed-configuracion.test.ts (base vacía da 3 o 4 claves, la segunda corrida no cambia nada, no pisa un valor ajustado, falla con el rol de aplicación); privilegios-configuracion.test.ts (SELECT permitido, INSERT/UPDATE/DELETE denegados para taomangalam_app); docs-seed-configuracion.test.ts (configuration.md contiene el comando del seed de package.json)
Contrato: rollback: Borrar los tres archivos de prueba nuevos. Status: pending

#### S2.T1 — En el servicio de emisión que hoy usa JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS, leer las vigencias desde configuracion_clave en cada emisión (sin caché, para que un cambio rija sin redesplegar). El respaldo es la variable de entorno y después el default actual. Reusar la emisión de TokenPair con jose ^6.2.12 y la escritura de expiración en sesion_auth sin reimplementarlas
Contrato: rollback: Revertir el servicio de emisión al SHA anterior, que vuelve a leer las variables de entorno; las claves sembradas se conservan. Status: pending

#### S2.T2 — Comprobar que renovarToken trata como refresh_invalido un refresh con expiración vencida y marca la sesión revocada con un motivo de expiración, distinto del reuso, que revoca la familia. Agregar ese motivo solo si hoy no existe
Contrato: rollback: Revertir el cambio en renovarToken. Status: pending

#### S2.T3 — Pruebas nuevas: session-ttl-config.test.ts (con reloj falso, 900 s y 30 días por defecto, 300 s al cambiar la clave, la sesión previa conserva su vigencia, respaldo por env); session-refresh-expiry.test.ts (30 días y 1 segundo da refresh_invalido con revocación por expiración, 30 días menos 1 segundo rota); configuracion-publica.test.ts (Supertest sobre la app real en base sembrada: 200 válido contra el contrato, 503 sin la clave, accesible sin bearer). Regresión: session-emit, session-rotate y bearer-verify sin modificar
Contrato: rollback: Borrar los archivos de prueba nuevos. Status: pending

#### S3.T1 — Endurecer server/src/middleware/capacidad.ts y cablear las rutas de cuenta
Contrato: rollback: Revertir capacidad.ts, routes/cuenta.ts y app.ts al SHA anterior, sin abrir rutas protegidas que ya tenían middleware. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S3.T1.1 — Denegación por defecto: si la operación autenticada no se resuelve en el contrato o no tiene x-capacidad, responder 403 en vez de next(). Dejar un punto de extensión para las exclusiones de impersonación de EP-14b, sin implementarlas
Contrato: rollback: Revertir el bloque de resolución de capacidad.ts. Status: pending

#### S3.T1.2 — Registro muestreado de cada denegación con errorCode, capacidad y accountRef seudónimo (el mismo accountRef de la observabilidad de auth), sin otras capacidades; tasa de muestreo como constante configurable
Contrato: rollback: Quitar la llamada de log del middleware. Status: pending

#### S3.T1.3 — Montar el middleware en server/src/routes/cuenta.ts para POST /cuenta/registro (línea 72) y PUT /cuenta/correo (línea 106) con la capacidad y el tipo de cuenta del contrato; si alguna se exime, declararla con su justificación en la lista de exenciones
Contrato: rollback: Revertir routes/cuenta.ts. Status: pending

#### S3.T1.4 — Lista de exenciones justificada (operationId y motivo) que consume la prueba de cableado; incluye solo operaciones públicas o exentas con justificación escrita
Contrato: rollback: Borrar el módulo de exenciones. Status: pending

#### S3.T2 — Pruebas nuevas, sin modificar middleware-capacidad.test.ts: capacidad-denegacion-defecto.test.ts (403 sin x-capacidad y sin resolver, QA-03a-07-03 con la capacidad quitada en la base); capacidad-denegacion-log.test.ts (campos del log, sin capacidades ajenas, muestreo al 0%); cuenta-capacidad.test.ts (router real de cuenta con cuenta de dispositivo y completa); cableado-capacidad.test.ts (recorre las operaciones con bearer del contrato contra app.ts, incluye QA-03a-07-02 listarMisDispositivos y falla nombrando el operationId sin middleware ni exención); cuenta-completa-cruce.test.ts (CAPACIDADES_CUENTA_COMPLETA contra x-requiere-cuenta: completa, nombra la operación que falla). Regresión: middleware-capacidad y ci-capacidad
Contrato: rollback: Borrar los archivos de prueba nuevos. Status: pending

## Cambios al modelo de datos

- tipo: seed_rbac | objetos: configuracion_clave, configuracion_version, taomangalam_app | destructivo: no | tarea: S1.T1 | rollback: down.sql de la migración de privilegios que vuelve a otorgar lo revocado; no toca filas
- tipo: seed_catalog | objetos: configuracion_clave | destructivo: no | tarea: S1.T2 | rollback: Las claves sembradas se conservan, según el rollback del handoff; volver al SHA anterior, donde la emisión lee las variables de entorno. Si hiciera falta, borrar a mano solo las claves recién creadas con el rol de migración
