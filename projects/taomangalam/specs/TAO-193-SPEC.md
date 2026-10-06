---
id: TAO-193-SPEC
project: taomangalam
ticket: TAO-193
status: draft
---

# Preparacion M2 de EP-01: correo transaccional, registro, validacion, inicio de sesion y vista Cuenta (HU-03b-11)

## Resumen ejecutivo

Se entrega la cadena HU-03b-01 -> HU-03b-03 -> HU-03b-04 -> HU-03b-06 -> HU-03b-11: servicio de correo agnostico con Mailjet detras de EmailService enviado por la cola pg-boss con reintentos idempotentes y plantillas por clave, conversion de cuenta de dispositivo a cuenta completa (V-23), validacion de correo por codigo (V-24), inicio de sesion con bloqueo por fuerza bruta persistido (V-25) y la vista Cuenta con tipo de cuenta, estado local/pendiente/completo, accesos de registro e inicio de sesion, cierre de sesion sin borrar datos y acceso permanente a Privacidad y consentimientos (secciones de V-27 propias de HU-03b-11).
NO se hace: vinculacion de cuenta de dispositivo a cuenta existente (HU-03b-07), recuperacion de contrasena (V-26), cambio de correo (HU-03b-05), invitaciones (HU-03b-09/10), borrado y eliminacion de cuenta, purga, siembra de perfiles (HU-03b-02), funciones de EP-09, la implementacion de V-51 (es TAO-188) ni el resto de secciones de V-27.
Se sabe que funciona cuando: en local Mailpit recibe el correo del codigo tras POST /cuenta/registro; POST /cuenta/correo/verificacion con el codigo valido deja la cuenta completa activa conservando el mismo identificador de cuenta y sus aceptaciones; POST /auth/login devuelve sesion y bloquea tras el limite de intentos; la vista Cuenta muestra los tres estados y el cierre de sesion conserva los datos locales; el check CI ep01-account-provider mapea cada caso de esta preparacion a un test que corre.
ADVERTENCIA DE TECHO: el paquete (5 historias, 28 puntos, backend + migraciones + 4 superficies de UI) EXCEDE el techo de 4 sesiones; el plan se comprime al maximo permitido y deberia partirse en al menos dos tickets (correo+registro+validacion / login+Cuenta). ADVERTENCIAS fuera de alcance detectadas y NO convertidas en requisitos: HU-03b-03 depende operativamente de que el login vincule la instalacion (HU-03b-07) para no dejar huerfana la cuenta de dispositivo al entrar desde otro aparato; la pregunta de DEC-052 sobre datos locales queda sin consumidor hasta EP-09; la evidencia de staging SPF/DKIM/DMARC depende de configuracion de dominio que este ticket no puede crear y, si falta, el ejecutor pausa con el bloqueo y el responsable en vez de marcar el criterio.
Tamano estimado: 4 sesiones (dos de ellas T3 con subtasks), tocando server (Prisma, endpoints, cola, correo), app (V-23, V-24, V-25, V-27), docs/development y .github/workflows.

Datos a confirmar antes de ejecutar:
- SHA fijo de epic/EP-01a para DOCS_DIFF_BASE (capturarlo al primer arranque tras integrar el trabajo previo; no usar HEAD ni origin/main).
- Nombre exacto del script del linter de docs y del job de docs en .github/workflows (el plan usa pnpm run lint:docs como marcador); confirmar en package.json raiz y en ci-pr.yml.
- Rutas reales de server/src (modulos de dominio y de rutas) y nombre del cliente Mailjet en server/package.json: los verify del plan asumen server/src/<modulo>/ y deben ajustarse a la estructura ya integrada.
- Credenciales y dominio de Mailjet en staging (remitente verificado, SPF/DKIM/DMARC): quien las provee; sin ellas la evidencia de staging se pausa, no se fabrica.
- Valores tecnicos de caducidad del codigo de validacion y del limite de intentos de login/bloqueo: V-24 declara que no estan fijados; confirmarlos al aprobar el spec o dejarlos configurables con el default documentado.
- Sintaxis esperada del check CI ep01-account-provider (job propio en ci-pr.yml vs entrada en el quality-gate) y si debe correr en PRs hacia epic/** pese a DEC-239.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03b_cuenta_completa.md:41

Existe un EmailService agnostico con adaptador Mailjet y adaptador local Mailpit, cuyos envios se despachan por la cola pg-boss con reintentos idempotentes (un mismo evento de correo no genera dos envios) y plantillas resueltas por clave.

### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-03b_cuenta_completa.md:111 (HU-03b-01) + docs/product/tecnologia/07 + DEC-165

Los correos se despachan por la cola pg-boss mediante un worker con reintentos y clave de idempotencia, de modo que un mismo envio encolado dos veces produce un solo correo entregado; la fuente del requisito es HU-03b-01 de `docs/backlog/EP-03b_cuenta_completa.md:111` junto con `docs/product/tecnologia/07` (Email / Trabajos asincronicos) y DEC-165, no un workflow de CI.

### REQ-03 `confirmed`
> Fuente: server/contract/openapi.yaml (RegistroCuentaRequest/RegistroCuentaRespuesta) + docs/product/vistas/V-23_crear_cuenta.md + DEC-212, DEC-218

`POST /cuenta/registro` responde **202** con `RegistroCuentaRespuesta` y deja la cuenta en estado **`pendiente_verificacion`** (no 201 ni `pendiente_validacion`), reusando `RegistroCuentaRequest` tal como existe en `server/contract/openapi.yaml` (solo `email` y `password`; la repeticion de contrasena es validacion de UI, no campo del contrato) y el middleware de contratos actual; persiste `emailNormalizado` para unicidad y `emailCifrado` para contacto segun el schema vigente, hashea la contrasena con argon2id, conserva el mismo id de cuenta con sus usos de producto, solicitudes, aceptaciones y consentimiento, no escala permisos, es idempotente ante reintento del mismo registro, y encola el correo con el codigo.

### REQ-04 `confirmed`
> Fuente: server/contract/openapi.yaml + docs/product/vistas/V-24_validar_correo.md (HU-03b-04)

`POST /cuenta/correo/verificacion` valida el codigo y termina la conversion dejando la cuenta completa activa: invocado **con** bearer devuelve tokens nuevos; **sin** bearer solo valida el correo, conforme a `server/contract/openapi.yaml`. El codigo OTP se persiste solo como hash, es de uso unico y nunca se devuelve en una respuesta ni se escribe en logs. El reenvio y `PUT /cuenta/correo` permiten reintentar sujetos a espera y limite de intentos, y la correccion de correo se limita al estado pendiente de validacion de V-24 (el cambio de correo de una cuenta activa es HU-03b-05, fuera de este paquete).

### REQ-05 `confirmed`
> Fuente: docs/backlog/EP-03b_cuenta_completa.md:116 (HU-03b-06); docs/product/vistas/V-25_iniciar_sesion.md; DEC-163; server/contract/openapi.yaml (POST /auth/login)

`POST /auth/login` conforme a `server/contract/openapi.yaml`, a V-25 y a DEC-163: verifica la contrasena con argon2id contra el hash persistido, exige cuenta completa con correo ya validado (una cuenta con correo pendiente no emite sesion y deriva a V-24), emite los tokens y los persiste en el almacenamiento de sesion de la app, aplica bloqueo por fuerza bruta persistido en base (5 fallos en una ventana de 15 minutos, bloqueo de 15 minutos) y responde de forma neutra sin revelar si el correo existe ni si la contrasena es incorrecta. No existe inicio de sesion offline: sin respuesta del backend no se abre una sesion nueva. Este REQ cubre exclusivamente el inicio de sesion; el contenido de la vista Cuenta es REQ-06.

### REQ-06 `confirmed`
> Fuente: docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md (HU-03b-11)

La vista Cuenta (V-27, solo las secciones de HU-03b-11) muestra el tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validacion / completa), las acciones de acceso y seguridad hacia V-23/V-24/V-25 y cierra sesion con la advertencia explicita de que no borra datos; `Recuperar contrasena` (V-26) y `Tengo una invitacion` se presentan como destinos pendientes declarados, sin ofrecer un funcionamiento inexistente.

### REQ-07 `confirmed`
> Fuente: docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md (seccion Privacidad y consentimientos); DEC-209; DEC-212; Request TAO-193, criterio 'Existe el acceso permanente a Privacidad y consentimientos con cualquier tipo de cuenta; TAO-188 implementa su revision V-51'

La vista Cuenta ofrece un acceso permanente a `V-51 Privacidad y consentimientos`, disponible con cualquier tipo de cuenta (de dispositivo, con correo pendiente de validar o completa) y tambien sin sesion de cuenta completa. Este paquete entrega unicamente el punto de acceso y su navegacion; la vista V-51 y su revision las implementa TAO-188, por lo que el destino se declara como pendiente mientras TAO-188 no este integrado y no se simula contenido de V-51 ni se da por verificada su revision.

### REQ-08 `confirmed`
> Fuente: Request TAO-193, seccion 'Evidencia y fases posteriores'

El check CI `ep01-account-provider` es un job real que ejecuta los tests de backend y de app de este paquete trazados caso a caso, con los filtros de paths de docs y scripts pertinentes y declarado en los `needs` del quality-gate; falla si alguno de los REQ-01 a REQ-16 deja de cumplirse. No se implementa con `grep` ni con comprobaciones textuales.

### REQ-09 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

VARIANTE Docs de la superficie que cambia: se documentan exclusivamente las superficies nuevas reales de este paquete, reutilizando los documentos existentes y sin ampliar el catalogo de producto ni agregar historias fuera del pedido. En `docs/development/configuration.md`: la configuracion del servicio de correo y la cola (adaptador agnostico, Mailpit local, Mailjet en staging, sin secretos ni credenciales fabricadas) y los parametros tecnicos con sus defaults (OTP TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos; login 5 fallos en ventana de 15 minutos con bloqueo de 15 minutos; contrasena minimo 8 caracteres segun `server/contract/openapi.yaml:6403-6416`). En `docs/development/commands.md`: los comandos reproducibles, las plantillas por clave y como correr el check `ep01-account-provider` en local. En `docs/development/release-runbook.md`: la evidencia y el runbook de correo de staging con SPF, DKIM y DMARC, y el rollback del paquete.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

VARIANTE Docs con lint en baseline: solo se normalizan al linter los documentos efectivamente modificados por este paquete, y el lint de docs corre con `DOCS_DIFF_BASE=<SHA de epic/EP-01a capturado en el PRIMER ARRANQUE, despues de reconciliar e integrar el trabajo previo>`, nunca contra HEAD de la rama viva ni contra origin/main, y nunca capturado recien en la sesion de docs.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145

VARIANTE Privilegios de rol: se inspeccionan las tablas y grants reales antes de disenar la migracion; las tablas que este paquete crea o modifica (cuenta/credenciales, desafios de validacion, intentos de seguridad, cola) otorgan a `taomangalam_app` solo SELECT/INSERT/UPDATE donde hace falta y sin DELETE por defecto; las aceptaciones y consentimientos quedan append-only con REVOKE explicito de UPDATE y DELETE solo donde ese REVOKE no exista ya (no se emiten REVOKE redundantes ni se degradan privilegios definidos por EP-00/EP-01); el DDL lo administra el rol migrador y la inversa es incremental: revierte lo que esta migracion agrega conservando datos y sin devolver los grants al estado por defecto del init.

### REQ-12 `confirmed`
> Fuente: Request TAO-193, criterio de HU-03b-01 y seccion 'Evidencia y fases posteriores' + DEC-165

El envio de correo en staging usa Mailjet real con SPF, DKIM y DMARC verificados en el dominio, y la verificacion final exige evidencia de entrega real; si falta configuracion de correo de staging o una credencial, el ejecutor pausa registrando el bloqueo y el responsable, y ese criterio no se marca como probado ni se sustituye por documentacion, Mailpit o una simulacion.

### REQ-13 `confirmed`
> Fuente: docs/product/vistas/V-23_crear_cuenta.md, V-24_validar_correo.md, V-25_iniciar_sesion.md

La app implementa las pantallas reales de V-23, V-24 y V-25 conectadas a los providers, al cliente HTTP del contrato y al almacenamiento de sesion: mostrar u ocultar contrasena de forma accesible, validacion de la repeticion de contrasena en la UI, errores por campo que llevan el foco al campo a corregir conservando los valores validos, comportamiento sin conexion con reintento, navegacion de retorno al contexto de origen y derivacion a V-24 cuando el correo esta pendiente.

### REQ-14 `confirmed` `enforcement`
> Fuente: Request TAO-193, 'Contrato con EP-01' y 'Fuera de alcance' de docs/backlog/EP-03b_cuenta_completa.md

Lo que no entrega este paquete se declara explicitamente y no se simula: la vinculacion transaccional de la cuenta de dispositivo a una cuenta existente (HU-03b-07) queda fuera y, si no existe entrega previa integrada, se registra como dependencia que impide dar por completo el recorrido de inicio de sesion desde una cuenta de dispositivo; el cambio de correo de una cuenta activa (HU-03b-05), la recuperacion (V-26) y la invitacion (V-24 variante) quedan como destinos pendientes honestos; y la subida de datos de EP-09 no se implementa: no se suben datos ni se afirma respaldo operativo, y la pregunta de DEC-052 queda como punto de enganche posterior sin sincronizacion.

### REQ-15 `inferred` `enforcement`
> Fuente: docs/product/vistas/V-24_validar_correo.md ('sin fijar todavia sus valores tecnicos') + Request TAO-193 punto 3

El TTL del codigo, el limite de intentos y la espera de reenvio son parametros tecnicos configurables, con defaults acotados documentados en `docs/development/configuration.md` y pruebas de sus limites; no se tratan como decisiones pendientes de producto ni bloquean la ejecucion.

### REQ-16 `confirmed` `enforcement`
> Fuente: Request TAO-193, Adenda 1 (2026-10-06) + punto 6 del pedido de cambio

La preparacion del ticket no ejecuta pre-gate, checkout, commit ni codigo sobre el arbol concurrente sucio; el PRIMER ARRANQUE de la ejecucion exige reconciliar e integrar el trabajo previo de `epic/EP-01a` y, hecho eso, registra el SHA base que usara el lint de docs y la traza de CI.
## Tasks

#### S2.T1 — Implementar el servicio de correo agnostico de HU-03b-01 en `server/src/email/`: interfaz `EmailService` con adaptador Mailpit para desarrollo local y adaptador Mailjet para staging (credenciales solo por variables de entorno, sin secretos en el repo ni credenciales fabricadas), plantillas resueltas por clave, y despacho por la cola pg-boss ya existente del proyecto con reintentos y clave de idempotencia, de modo que un mismo evento de correo encolado dos veces entregue un solo correo. Registrar el worker de la cola en el arranque de la app y su configuracion en `server/src/config` (parametros con sus defaults: OTP TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos). Redactar OTP y PII en logs: el codigo nunca se escribe en un log ni se devuelve en una respuesta. Documentar la superficie nueva en `docs/development/configuration.md` (adaptador agnostico, Mailpit local, Mailjet staging, parametros y defaults) y en `docs/development/commands.md` (comandos reproducibles, plantillas por clave, como correr `ep01-account-provider` en local), normalizando al linter de docs solo esos dos documentos. Tests reales contra Postgres, cola y Mailpit (sin mockear el transporte): entrega efectiva, reintento idempotente que no duplica el envio, resolucion de plantilla por clave y ausencia de OTP en logs.
Contrato: rollback: Revertir los commits de esta task (servicio, adaptadores, registro del worker y los dos documentos) conservando los datos: no borrar ni truncar las tablas de pg-boss, no purgar los jobs ya encolados y no revertir migraciones de EP-00/EP-01.. Status: pending

#### S3.T5 — Desafio de verificacion de correo: persistir el codigo solo como hash, de uso unico, nunca devuelto en una respuesta ni escrito en logs (incluido el log del worker de correo). Incluir el redactado del codigo en el logger.
Contrato: rollback: Revertir el commit del servicio de desafios y del filtro del logger.. Status: pending

#### S3.T6 — `POST /cuenta/correo/verificacion`: con bearer valido devuelve un par de tokens nuevo; sin bearer solo valida el correo y no emite tokens, exactamente como lo declara `server/contract/openapi.yaml`.
Contrato: rollback: Revertir el commit del handler de verificacion.. Status: pending

#### S3.T7 — Parametrizar TTL del codigo, limite de intentos y espera de reenvio como configuracion con defaults acotados (sin literales en el dominio), y exponerlos al arranque del servidor. Dejar los defaults listos para documentar en `docs/development/configuration.md`.
Contrato: rollback: Revertir el commit de configuracion; los defaults vuelven a los valores previos del codigo.. Status: pending

#### S3.T8 — Limitar la correccion de correo (`PUT /cuenta/correo` y reenvio) al estado pendiente de validacion de V-24: rechazar la operacion sobre una cuenta ya activa, que corresponde a HU-03b-05 y queda fuera del paquete.
Contrato: rollback: Revertir el commit del guard de estado en el handler de cambio de correo.. Status: pending

#### S3.T9 — Migracion de schema con privilegios minimos: inspeccionar primero los grants reales de las tablas afectadas (cuenta/credenciales, desafios, intentos de seguridad, cola); otorgar a `taomangalam_app` solo SELECT/INSERT/UPDATE donde haga falta y nada de DELETE; emitir REVOKE de UPDATE/DELETE sobre aceptaciones y consentimientos solo si no existe ya; DDL por el rol migrador. Escribir la inversa incremental que conserva datos y no devuelve los grants a los default del init `server/prisma/migrations/20260927223537_init/migration.sql`.
Contrato: rollback: Aplicar la migracion inversa incremental escrita en esta misma task: elimina lo que agrega esta migracion y restituye los grants previos exactos, sin borrar filas de aceptaciones, consentimientos ni usos de producto.. Status: pending

#### S3.T12 — Pantalla real de V-23 Crear cuenta: formulario con correo, contrasena y repeticion, provider de estado, cliente del contrato real y almacenamiento de sesion; mostrar u ocultar contrasena accesible; validacion de la repeticion en la UI; errores por campo que mueven el foco al campo a corregir conservando los valores validos; estado sin conexion con reintento; `Ya tengo cuenta` hacia V-25 y `Ahora no` de vuelta al contexto de origen.
Contrato: rollback: Revertir el commit de la pantalla y su provider; la navegacion vuelve al estado anterior sin rutas huerfanas.. Status: pending

#### S3.T13 — Pantalla real de V-24 Validar correo: correo parcialmente oculto, campo de codigo, `Validar correo`, `Reenviar codigo` sujeto a la espera configurada, `Cambiar correo` hacia la correccion en estado pendiente, mensajes de codigo incorrecto, caducado e intentos agotados; al validar con sesion activa persiste los tokens nuevos devueltos y abre V-27.
Contrato: rollback: Revertir el commit de la pantalla y su provider.. Status: pending

#### S3.T14 — Implementar el backend de registro de HU-03b-03 con schema incremental. Scope: `server/prisma/schema.prisma`, una migracion nueva con su inversa en `server/prisma/migrations/`, `server/src/auth/registro-cuenta.ts` y las rutas de cuenta. Reusar los campos ya existentes del modelo `Cuenta`; crear solo lo que falte (`credencial_password`, `desafio` de validacion de correo, `intento_seguridad`) en vez de duplicar estructuras. Contrasena con argon2id; correo persistido como `emailNormalizado` (unicidad) y `emailCifrado` (contacto). `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y deja la cuenta en estado `pendiente_verificacion`, reusando `RegistroCuentaRequest` tal como esta en `server/contract/openapi.yaml` (solo `email` y `password`, minimo 8 caracteres segun `server/contract/openapi.yaml:6403-6416`; la repeticion de contrasena es validacion de UI y no entra al contrato) y el middleware de contratos actual. La conversion corre en una sola transaccion e idempotente ante reintento del mismo registro: conserva el mismo id de cuenta con sus usos de producto, solicitudes, aceptaciones y consentimiento, no escala permisos, y encola el correo con el codigo. El OTP se persiste solo como hash, es de uso unico y nunca se devuelve ni se loguea. Privilegios: inspeccionar las tablas y grants reales antes de escribir la migracion; otorgar a `taomangalam_app` solo SELECT/INSERT/UPDATE donde hace falta, sin DELETE por defecto, y emitir REVOKE de UPDATE/DELETE sobre aceptaciones y consentimientos unicamente donde ese REVOKE no exista ya, sin degradar privilegios definidos por EP-00/EP-01; el DDL lo administra el rol migrador.
Contrato: rollback: Aplicar la migracion inversa incremental: revierte solo lo que esta migracion agrega y conserva los datos de las cuentas ya convertidas; no eliminar credenciales ni desafios a ciegas, no devolver los grants al estado por defecto del init y no tocar las tablas de EP-00/EP-01. Revertir los commits de codigo de la task.. Status: pending

#### S4.T8 — Suite de integracion combinada de backend contra servicios REALES levantados (Postgres, pg-boss y Mailpit; sin dobles del proveedor ni simulacion), que cubre REQ-03, REQ-04, REQ-05, REQ-11 y REQ-12: registro 202 con estado `pendiente_verificacion`, password minimo 8 y sin campo de repeticion en la API; reintento del mismo registro idempotente (una sola cuenta, un solo correo entregado en Mailpit); verificacion de correo con bearer que devuelve tokens y sin bearer que solo valida; desafio persistido solo como hash, de uso unico, ausente de la respuesta y de los logs; login argon2id con cuenta validada, respuesta neutra indistinguible entre correo inexistente y contrasena incorrecta, bloqueo persistido al quinto fallo en ventana de 15 minutos que sobrevive al reinicio del proceso y expira a los 15 minutos; limites de OTP (TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos); grants reales del rol `taomangalam_app` consultados contra la base (sin DELETE donde corresponde, aceptaciones y consentimientos append-only); y el caso de ausencia de credenciales de correo de staging, que debe registrar el bloqueo con responsable en vez de dar el criterio por probado o sustituirlo por Mailpit.
Contrato: rollback: Eliminar los archivos de test agregados por esta task. No toca codigo de produccion, migraciones ni datos.. Status: pending

#### S4.T9 — Implementar el backend de inicio de sesion de HU-03b-06. Scope: `server/src/auth/login.ts`, `server/src/routes/auth.ts` y la configuracion de seguridad en `server/src/config`. `POST /auth/login` conforme a `server/contract/openapi.yaml`: verifica la contrasena con argon2id contra el hash persistido y emite tokens reusando el `ServicioSesiones` existente (no crear un emisor paralelo). Respuesta neutra: no revela si el correo existe ni si la contrasena es incorrecta. Bloqueo por fuerza bruta persistido en base (tabla `intento_seguridad`): 5 fallos en una ventana de 15 minutos, bloqueo de 15 minutos; los tres valores son parametros tecnicos configurables con esos defaults, documentados en `docs/development/configuration.md`. Estados de cuenta resueltos segun el contrato: `pendiente_verificacion` no emite sesion y deriva a V-24; `suspendida` y `en_eliminacion` responden lo que declara OpenAPI. No hay inicio de sesion offline: sin respuesta del backend no se abre sesion nueva. Fuera de alcance explicito y no simulado: la vinculacion transaccional de la cuenta de dispositivo a una cuenta existente (HU-03b-07); si no hay entrega previa integrada, registrarla como dependencia que impide dar por completo el recorrido desde una cuenta de dispositivo.
Contrato: rollback: Revertir los commits de esta task conservando los datos: no borrar cuentas, credenciales ni las filas de `intento_seguridad` acumuladas, y no revertir la migracion de la sesion anterior.. Status: pending

#### S4.T10 — Implementar las pantallas reales de inicio de sesion en la app. Scope: `app/lib/features/cuenta/presentation`, `app/lib/features/cuenta/data` y la navegacion de la feature. Provider conectado al cliente HTTP real del contrato (sin stub ni respuesta simulada) que persiste los tokens en el almacenamiento de sesion existente de la app. UI: mostrar u ocultar contrasena de forma accesible, errores por campo que llevan el foco al campo a corregir conservando los valores validos, comportamiento sin conexion con reintento, derivacion a V-24 cuando el correo esta pendiente de validar, y navegacion de retorno al contexto de origen tras iniciar sesion. `Olvide mi contrasena` (V-26) y `Tengo una invitacion` se presentan como destinos pendientes declarados: no se simula un flujo inexistente ni se oculta la accion. Validacion por tests de widget y de integracion de la feature.
Contrato: rollback: Revertir los archivos agregados o modificados de `app/lib/features/cuenta` sin borrar el almacenamiento de sesion local ni los tokens ya persistidos en dispositivos de prueba.. Status: pending

#### S5.T2 — Secciones de V-27 correspondientes a HU-03b-11: tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validacion / completa), bloque de acceso y seguridad hacia V-23/V-24/V-25, cierre de sesion con la advertencia explicita de que no borra datos, y el acceso permanente a `V-51 Privacidad y consentimientos` visible con cualquier tipo de cuenta (solo el punto de entrada; la vista destino es de TAO-188). No incluir borrado, eliminacion, respaldo ni dispositivos.
Contrato: rollback: Revertir el commit de las secciones agregadas a V-27; la vista queda como estaba antes del paquete.. Status: pending

#### S5.T3 — Tests de la vista Cuenta: los tres estados con sus textos y acciones, cierre de sesión con advertencia y datos locales intactos tras cerrarla, acceso a Privacidad visible en los tres estados y no gateable, y la regresión de que no se renderizan secciones fuera de HU-03b-11 (respaldo, dispositivos, conflictos, borrado, eliminación).
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S5.T4 — Verificar en test de integracion de la app que cerrar sesion desde V-27 conserva los datos locales (consultantes, consultas, tiradas, tareas) en el almacenamiento del dispositivo y que el estado de la app vuelve al modo sin sesion sin purgar nada.
Contrato: rollback: Revertir el commit del test y del ajuste de limpieza de sesion si lo hubo.. Status: pending

#### S5.T5 — Implementar el cierre de sesion de HU-03b-11 en backend y su contraparte en la vista Cuenta. Scope backend: `server/src/auth/sesiones.ts` y `server/src/routes/auth.ts`. `POST /auth/logout` conforme a `server/contract/openapi.yaml`: revoca la sesion en el servidor, es idempotente (un segundo logout con el mismo token revocado no falla ni crea estado nuevo) y no borra datos de la cuenta ni del dispositivo. Scope app: la vista Cuenta muestra el tipo de cuenta y sus implicancias, los tres estados (de dispositivo / pendiente de validacion / completa) y las acciones de acceso y seguridad hacia V-23, V-24 y V-25; `Cerrar sesion` lleva la advertencia explicita y accesible de que no borra datos; y existe el acceso permanente a `V-51 Privacidad y consentimientos`, disponible con cualquier tipo de cuenta y tambien sin sesion de cuenta completa, declarado como destino pendiente mientras TAO-188 no este integrado (no se simula contenido de V-51 ni se da por verificada su revision). Tests reales: revocacion efectiva de la sesion en servidor, idempotencia del segundo logout, y datos locales y de servidor intactos despues de cerrar sesion; en app, los tres estados, el texto de advertencia y la presencia del acceso a Privacidad en cada tipo de cuenta.
Contrato: rollback: Revertir los commits de codigo de esta task sin recrear ni reactivar los tokens ya revocados y sin tocar los datos locales ni los del servidor.. Status: pending

#### S6.T2 — Documentar la superficie operativa nueva en los docs existentes: correo/cola y configuracion local Mailpit + staging Mailjet sin secretos, y los defaults de TTL/intentos/reenvio, en `docs/development/configuration.md`; comandos, plantillas por clave y el check reproducible `ep01-account-provider` en `docs/development/commands.md`; evidencia de correo en staging (SPF/DKIM/DMARC) y rollback en `docs/development/release-runbook.md`. Normalizar al linter solo estos documentos.
Contrato: rollback: Revertir el commit de docs; los tres documentos vuelven a su contenido previo.. Status: pending

#### S6.T3 — Implementar el job de CI `ep01-account-provider` como job real: ejecuta las suites de backend y de app de este paquete con la traza caso-a-REQ, aplica los filtros de paths de docs y scripts pertinentes, y queda declarado en los `needs` del `quality-gate`. Sin pasos basados en `grep` como sustituto de test.
Contrato: rollback: Revertir el commit del workflow y quitar el `needs` agregado al quality-gate.. Status: pending

#### S6.T5 — Configurar y verificar el correo de staging con Mailjet real y el dominio con SPF, DKIM y DMARC; registrar la evidencia de una entrega real (message id y resultados de autenticacion) en `docs/development/release-runbook.md`. Si falta una credencial o un registro DNS, pausar registrando el bloqueo y el responsable: no simular el proveedor, no reemplazar por Mailpit y no marcar el criterio como probado.
Contrato: rollback: Revertir el commit de configuracion de staging; no se modifican registros DNS desde la ejecucion.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: POST /cuenta/registro convierte la cuenta de dispositivo en cuenta completa pendiente de validacion con correo normalizado y cifrado y contrasena argon2id, conservando el mismo identificador de cuenta, los usos de producto, las solicitudes y las aceptaciones legales, y dispara 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `confirmed`: Los correos se despachan por la cola pg-boss mediante un worker con reintentos y clave de idempotencia, de modo que un mismo envio encolado 
- REQ-03 (edit) `confirmed`: `POST /cuenta/registro` responde **202** con `RegistroCuentaRespuesta` y deja la cuenta en estado **`pendiente_verificacion`** (no 201 ni `p
- REQ-04 (edit) `confirmed`: `POST /cuenta/correo/verificacion` valida el codigo y termina la conversion dejando la cuenta completa activa: invocado **con** bearer devue
- REQ-06 (edit) `confirmed`: La vista Cuenta (V-27, solo las secciones de HU-03b-11) muestra el tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendie
- REQ-08 (edit) `confirmed`: El check CI `ep01-account-provider` es un job real que ejecuta los tests de backend y de app de este paquete trazados caso a caso, con los f
- REQ-10 (edit) `confirmed`: VARIANTE Docs con lint en baseline: solo se normalizan al linter los documentos efectivamente modificados por este paquete, y el lint de doc
- REQ-11 (edit) `confirmed`: VARIANTE Privilegios de rol: se inspeccionan las tablas y grants reales antes de disenar la migracion; las tablas que este paquete crea o mo
- REQ-12 (add) `confirmed`: El envio de correo en staging usa Mailjet real con SPF, DKIM y DMARC verificados en el dominio, y la verificacion final exige evidencia de e
- REQ-13 (add) `confirmed`: La app implementa las pantallas reales de V-23, V-24 y V-25 conectadas a los providers, al cliente HTTP del contrato y al almacenamiento de 
- REQ-14 (add) `confirmed`: Lo que no entrega este paquete se declara explicitamente y no se simula: la vinculacion transaccional de la cuenta de dispositivo a una cuen
- REQ-15 (add) `inferred`: El TTL del codigo, el limite de intentos y la espera de reenvio son parametros tecnicos configurables, con defaults acotados documentados en
- REQ-16 (add) `confirmed`: La preparacion del ticket no ejecuta pre-gate, checkout, commit ni codigo sobre el arbol concurrente sucio; el PRIMER ARRANQUE de la ejecuci

**Tasks agregadas:**

- S2: Alinear el contrato de registro con `server/contract/openapi.yaml`: `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y deja estado `pendiente_verificacion`; `RegistroCuentaRequest` conserva solo `email` y `password` (la repeticion de contrasena no es campo del contrato) y se reusa el middleware de validacion de contratos existente. Corregir handler, tipos y cualquier referencia a 201 o a `pendiente_validacion`. (valida: REQ-03; rollback: Revertir el commit del handler y de los tipos de registro; el contrato OpenAPI no se modifica, por lo que no queda estado residual.)
- S2: Implementar la conversion preservando identidad: mismo id de cuenta, usos de producto, solicitudes, aceptaciones legales y consentimiento de analitica intactos; sin escalamiento de permisos; reintento del mismo registro idempotente (no crea segunda cuenta ni segundo desafio activo) y encolado del correo con clave de idempotencia por cuenta y desafio. (valida: REQ-03, REQ-02; rollback: Revertir el commit del servicio de conversion; los registros ya convertidos no se revierten por codigo (la inversa de datos la cubre la migracion incremental).)
- S2: Persistencia del correo segun el schema vigente: `emailNormalizado` como clave de unicidad y `emailCifrado` para contacto, reusando las columnas y el helper de cifrado existentes. No introducir HMAC obligatorio ni afirmar en codigo, tests o docs que la columna normalizada nunca contiene texto legible. (valida: REQ-03; rollback: Revertir el commit del mapeo de correo; no hay cambio de columnas que deshacer.)
- S2: Desafio de verificacion de correo: persistir el codigo solo como hash, de uso unico, nunca devuelto en una respuesta ni escrito en logs (incluido el log del worker de correo). Incluir el redactado del codigo en el logger. (valida: REQ-04; rollback: Revertir el commit del servicio de desafios y del filtro del logger.)
- S2: `POST /cuenta/correo/verificacion`: con bearer valido devuelve un par de tokens nuevo; sin bearer solo valida el correo y no emite tokens, exactamente como lo declara `server/contract/openapi.yaml`. (valida: REQ-04; rollback: Revertir el commit del handler de verificacion.)
- S2: Parametrizar TTL del codigo, limite de intentos y espera de reenvio como configuracion con defaults acotados (sin literales en el dominio), y exponerlos al arranque del servidor. Dejar los defaults listos para documentar en `docs/development/configuration.md`. (valida: REQ-15; rollback: Revertir el commit de configuracion; los defaults vuelven a los valores previos del codigo.)
- S2: Limitar la correccion de correo (`PUT /cuenta/correo` y reenvio) al estado pendiente de validacion de V-24: rechazar la operacion sobre una cuenta ya activa, que corresponde a HU-03b-05 y queda fuera del paquete. (valida: REQ-04, REQ-14; rollback: Revertir el commit del guard de estado en el handler de cambio de correo.)
- S2: `POST /auth/login`: autenticacion de cuenta completa validada con devolucion del nivel autorizado, respuesta neutra ante credenciales invalidas y bloqueo por fuerza bruta persistido. Sin vinculacion de la cuenta de dispositivo (HU-03b-07 fuera de alcance): no reasignar usos ni solicitudes y registrar la dependencia. (valida: REQ-05, REQ-14; rollback: Revertir el commit del handler de login y del contador de intentos; la tabla de intentos se vacia con la inversa de la migracion.)
- S2: Migracion de schema con privilegios minimos: inspeccionar primero los grants reales de las tablas afectadas (cuenta/credenciales, desafios, intentos de seguridad, cola); otorgar a `taomangalam_app` solo SELECT/INSERT/UPDATE donde haga falta y nada de DELETE; emitir REVOKE de UPDATE/DELETE sobre aceptaciones y consentimientos solo si no existe ya; DDL por el rol migrador. Escribir la inversa incremental que conserva datos y no devuelve los grants a los default del init `server/prisma/migrations/20260927223537_init/migration.sql`. (valida: REQ-11; rollback: Aplicar la migracion inversa incremental escrita en esta misma task: elimina lo que agrega esta migracion y restituye los grants previos exactos, sin borrar filas de aceptaciones, consentimientos ni usos de producto.)
- S3: Pantalla real de V-23 Crear cuenta: formulario con correo, contrasena y repeticion, provider de estado, cliente del contrato real y almacenamiento de sesion; mostrar u ocultar contrasena accesible; validacion de la repeticion en la UI; errores por campo que mueven el foco al campo a corregir conservando los valores validos; estado sin conexion con reintento; `Ya tengo cuenta` hacia V-25 y `Ahora no` de vuelta al contexto de origen. (valida: REQ-13; rollback: Revertir el commit de la pantalla y su provider; la navegacion vuelve al estado anterior sin rutas huerfanas.)
- S3: Pantalla real de V-24 Validar correo: correo parcialmente oculto, campo de codigo, `Validar correo`, `Reenviar codigo` sujeto a la espera configurada, `Cambiar correo` hacia la correccion en estado pendiente, mensajes de codigo incorrecto, caducado e intentos agotados; al validar con sesion activa persiste los tokens nuevos devueltos y abre V-27. (valida: REQ-13, REQ-04; rollback: Revertir el commit de la pantalla y su provider.)
- S3: Pantalla real de V-25 Iniciar sesion: correo y contrasena, mostrar u ocultar accesible, errores sin revelar informacion sensible, derivacion a V-24 cuando el correo esta pendiente, retorno al contexto de origen, y `Olvide mi contrasena` y `Tengo una invitacion` presentados como destinos todavia no disponibles en este paquete, sin pantallas simuladas. (valida: REQ-13, REQ-14; rollback: Revertir el commit de la pantalla y su provider.)
- S3: Secciones de V-27 correspondientes a HU-03b-11: tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validacion / completa), bloque de acceso y seguridad hacia V-23/V-24/V-25, cierre de sesion con la advertencia explicita de que no borra datos, y el acceso permanente a `V-51 Privacidad y consentimientos` visible con cualquier tipo de cuenta (solo el punto de entrada; la vista destino es de TAO-188). No incluir borrado, eliminacion, respaldo ni dispositivos. (valida: REQ-06, REQ-07; rollback: Revertir el commit de las secciones agregadas a V-27; la vista queda como estaba antes del paquete.)
- S3: Verificar en test de integracion de la app que cerrar sesion desde V-27 conserva los datos locales (consultantes, consultas, tiradas, tareas) en el almacenamiento del dispositivo y que el estado de la app vuelve al modo sin sesion sin purgar nada. (valida: REQ-06, test; rollback: Revertir el commit del test y del ajuste de limpieza de sesion si lo hubo.)
- S4: Primer arranque: reconciliar e integrar el trabajo previo pendiente de `epic/EP-01a` sobre el arbol concurrente sucio, dejar el arbol limpio y registrar el SHA resultante como base del paquete, que sera el valor de `DOCS_DIFF_BASE` y la traza de CI. No commitear codigo del paquete en este paso. (valida: REQ-16, REQ-10; rollback: No aplica cambio de codigo: si la reconciliacion no es posible, detener la ejecucion dejando el arbol como estaba y registrar el bloqueo con su responsable.)
- S4: Documentar la superficie operativa nueva en los docs existentes: correo/cola y configuracion local Mailpit + staging Mailjet sin secretos, y los defaults de TTL/intentos/reenvio, en `docs/development/configuration.md`; comandos, plantillas por clave y el check reproducible `ep01-account-provider` en `docs/development/commands.md`; evidencia de correo en staging (SPF/DKIM/DMARC) y rollback en `docs/development/release-runbook.md`. Normalizar al linter solo estos documentos. (valida: REQ-09, REQ-10; rollback: Revertir el commit de docs; los tres documentos vuelven a su contenido previo.)
- S4: Implementar el job de CI `ep01-account-provider` como job real: ejecuta las suites de backend y de app de este paquete con la traza caso-a-REQ, aplica los filtros de paths de docs y scripts pertinentes, y queda declarado en los `needs` del `quality-gate`. Sin pasos basados en `grep` como sustituto de test. (valida: REQ-08; rollback: Revertir el commit del workflow y quitar el `needs` agregado al quality-gate.)
- S4: Corregir los casos de test existentes que contradicen el contrato (201 en lugar de 202, estado `pendiente_validacion`, validacion de repeticion de contrasena en el servidor, afirmacion de que `emailNormalizado` nunca contiene texto legible) y ampliar los faltantes: preservacion de identidad/aceptaciones/consentimiento/usos, idempotencia del registro, registro sin sesion y sin conexion, tokens de verificacion con y sin bearer, desafio de uso unico, privilegios por rol, UI en ancho de telefono y de tablet, preservacion de datos al cerrar sesion. (valida: REQ-03, REQ-04, REQ-11, REQ-13, test; rollback: Revertir el commit de tests; las suites vuelven a su estado previo.)
- S4: Configurar y verificar el correo de staging con Mailjet real y el dominio con SPF, DKIM y DMARC; registrar la evidencia de una entrega real (message id y resultados de autenticacion) en `docs/development/release-runbook.md`. Si falta una credencial o un registro DNS, pausar registrando el bloqueo y el responsable: no simular el proveedor, no reemplazar por Mailpit y no marcar el criterio como probado. (valida: REQ-12; rollback: Revertir el commit de configuracion de staging; no se modifican registros DNS desde la ejecucion.)
- S4: Verificacion final posterior a todo el codigo, con items concretos y resultado explicito por item: (1) correo local por Mailpit e idempotencia de la cola; (2) entrega real en staging por Mailjet con SPF/DKIM/DMARC; (3) recorrido de app V-23/V-24/V-25/V-27 en smartphone y tablet con accesibilidad del mostrar u ocultar contrasena y del foco de error; (4) cierre de sesion con datos intactos; (5) acceso a Privacidad con cualquier tipo de cuenta, dejando constancia de que la revision de V-51 se verifica despues de TAO-188; (6) `ep01-account-provider` verde en CI remoto sobre el SHA integrado, con la traza casos-a-tests y el `quality-gate` en verde. Los pendientes humanos o externos se registran como pendientes, nunca como aprobados. (valida: REQ-12, REQ-08, REQ-06, REQ-07, REQ-13, REQ-14; rollback: No aplica: la verificacion no modifica codigo. Si un item falla, se registra el bloqueo con responsable y no se cierra el paquete.)

### Enmienda 2
**REQs:**

- REQ-05 (edit) `confirmed`: `POST /auth/login` conforme a `server/contract/openapi.yaml`, a V-25 y a DEC-163: verifica la contrasena con argon2id contra el hash persist
- REQ-07 (edit) `confirmed`: La vista Cuenta ofrece un acceso permanente a `V-51 Privacidad y consentimientos`, disponible con cualquier tipo de cuenta (de dispositivo, 
- REQ-09 (edit) `confirmed`: VARIANTE Docs de la superficie que cambia: se documentan exclusivamente las superficies nuevas reales de este paquete, reutilizando los docu

**Tasks agregadas:**

- S2: Backend incremental de cuenta y acceso. Extender `server/prisma/schema.prisma` REUTILIZANDO el modelo de cuenta existente (no crear una tabla de cuenta paralela): credencial argon2id asociada a la cuenta, desafio de validacion de correo persistido solo como hash y de uso unico, e intentos de seguridad para el bloqueo de login. Generar la migracion con su inversa incremental y los grants minimos de REQ-11 (SELECT/INSERT/UPDATE para `taomangalam_app` donde haga falta, sin DELETE por defecto; REVOKE explicito de UPDATE/DELETE solo donde aun no exista, sin degradar privilegios definidos por EP-00/EP-01; el DDL lo administra el rol migrador). Implementar en `server/src/auth` el hashing argon2id, el verificador de desafio/token (uso unico, nunca devuelto en una respuesta ni escrito en logs) y el emisor de sesion. Exponer en `server/src/routes/auth.ts` y en las rutas de cuenta, pasando por el middleware de contratos existente: `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y deja la cuenta en `pendiente_verificacion` (no 201 ni `pendiente_validacion`), password minimo 8 caracteres segun `server/contract/openapi.yaml:6403-6416` y SIN campo de repeticion en la API (la repeticion es validacion de UI), persiste `emailNormalizado` para unicidad y `emailCifrado` para contacto, conserva el mismo id de cuenta con usos, solicitudes, aceptaciones y consentimiento, es idempotente ante reintento del mismo registro y encola el correo en pg-boss; `POST /cuenta/correo/verificacion` con bearer devuelve tokens nuevos y sin bearer solo valida el correo; `POST /auth/login` con argon2id, cuenta validada, respuesta neutra y bloqueo persistido. Valores tecnicos: OTP TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos; login 5 fallos en ventana de 15 minutos y bloqueo de 15 minutos. No se agregan reglas de negocio nuevas. (valida: REQ-03, REQ-04, REQ-05, REQ-11, REQ-15; rollback: Revertir los commits de la task y aplicar la migracion inversa incremental: se eliminan unicamente las columnas, tablas y grants que esta migracion agrega, conservando cuentas, aceptaciones, consentimientos, solicitudes y usos de producto. No se borran credenciales ni datos de cuentas a ciegas y se deja registrado que revertir el codigo NO revierte las conversiones de datos ya realizadas (una cuenta ya convertida sigue convertida).)
- S4: Suite de integracion combinada de backend contra servicios REALES levantados (Postgres, pg-boss y Mailpit; sin dobles del proveedor ni simulacion), que cubre REQ-03, REQ-04, REQ-05, REQ-11 y REQ-12: registro 202 con estado `pendiente_verificacion`, password minimo 8 y sin campo de repeticion en la API; reintento del mismo registro idempotente (una sola cuenta, un solo correo entregado en Mailpit); verificacion de correo con bearer que devuelve tokens y sin bearer que solo valida; desafio persistido solo como hash, de uso unico, ausente de la respuesta y de los logs; login argon2id con cuenta validada, respuesta neutra indistinguible entre correo inexistente y contrasena incorrecta, bloqueo persistido al quinto fallo en ventana de 15 minutos que sobrevive al reinicio del proceso y expira a los 15 minutos; limites de OTP (TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos); grants reales del rol `taomangalam_app` consultados contra la base (sin DELETE donde corresponde, aceptaciones y consentimientos append-only); y el caso de ausencia de credenciales de correo de staging, que debe registrar el bloqueo con responsable en vez de dar el criterio por probado o sustituirlo por Mailpit. (valida: REQ-03, REQ-04, REQ-05, REQ-11, REQ-12, test; rollback: Eliminar los archivos de test agregados por esta task. No toca codigo de produccion, migraciones ni datos.)

**Task ops:**

- delete S2.T1
- delete S2.T2
- delete S2.T3
- delete S2.T4
- delete S2.T5
- delete S3.T1
- delete S3.T2
- delete S3.T3
- delete S3.T4
- delete S4.T1
- delete S4.T2
- delete S4.T3
- edit S4.T4 { desc="Inspeccion previa, SIN escribir codigo. (1) Verificar que el trabajo previo de `epic/EP-01a` ya fue reconciliado e integrado por su responsable y que el arbol esta limpio: el gate inicial NO autoriza a esta ejecucion a incorporar cambios ajenos; si el arbol esta sucio o el trabajo previo no esta integrado, la task se detiene registrando el bloqueo y el responsable. (2) Leer las tablas, roles y grants REALES antes de disenar la migracion, tomando como base `server/prisma/migrations/20260927223537_init/migration.sql` y el estado vivo de la base, e identificar donde ya existe el REVOKE de UPDATE/DELETE para no emitir REVOKE redundantes ni degradar privilegios de EP-00/EP-01. (3) Capturar el SHA fijo de `epic/EP-01a` que usaran `DOCS_DIFF_BASE` y la traza de CI, y dejarlo registrado antes de tocar codigo; nunca HEAD de una rama viva ni origin/main.", rollback="Ninguno: la task solo lee e inspecciona. Si se detiene por arbol sucio o trabajo previo no integrado, deja registrado el bloqueo y el responsable sin modificar el repositorio.", validates=["REQ-10","REQ-11","REQ-16"], verify=["git status --porcelain","git rev-parse epic/EP-01a"] }
- edit S4.T7 { desc="Escribir DESDE CERO las suites de prueba alineadas al contrato vigente (`server/contract/openapi.yaml`): esta task no es corregir tests de codigo previamente escrito. Ademas, actualizar los casos canonicos actuales que contradicen el contrato: se reescriben todos los casos que asumen 201, estado `pendiente_validacion`, campo de repeticion de contrasena en la API o `emailNormalizado` no legible. Quedan como 202 con `RegistroCuentaRespuesta`, estado `pendiente_verificacion`, sin repeticion de contrasena en la API (es validacion de UI) y con `emailNormalizado` persistido para unicidad junto a `emailCifrado` para contacto. No se agregan reglas de negocio nuevas ni casos fuera de los REQ vigentes.", validates=["REQ-03","REQ-04","REQ-05"], isTest=true, verify=["pnpm --dir server test tests/contract/cuenta-registro.contract.test.ts tests/contract/cuenta-correo-verificacion.contract.test.ts"] }
- move S4.T9 → S7
- edit S4.T9 { desc="Verificacion FINAL del paquete, en sesion de verificacion separada de las sesiones de codigo, con seis items concretos: (1) el check CI `ep01-account-provider` corre verde en la rama, ejecuta los tests reales de backend y de app trazados caso a caso y esta declarado en los `needs` del quality-gate; (2) el lint de documentos cambiados corre con `DOCS_DIFF_BASE=<SHA de epic/EP-01a capturado en el primer arranque>` y pasa cubriendo solo los documentos efectivamente modificados; (3) evidencia de entrega real de correo en staging con Mailjet y SPF, DKIM y DMARC verificados en el dominio; si falta configuracion o credencial, se registra el bloqueo con responsable y el criterio NO se marca como probado ni se sustituye por Mailpit, documentacion o simulacion; (4) recorrido manual en la app de V-23 -> V-24 -> V-25 -> V-27 contra el backend real, incluido el acceso permanente a Privacidad y consentimientos con cuenta de dispositivo, con cuenta pendiente y con cuenta completa; (5) verificacion sobre una copia del store de los grants reales por tabla y rol y de la inversa incremental de la migracion, confirmando que conserva datos y no elimina credenciales a ciegas; (6) declaracion explicita de lo no entregado: la vinculacion transaccional de la cuenta de dispositivo (HU-03b-07) no se encontro como entrega previa integrada y se registra honestamente como dependencia que bloquea solo la integracion del recorrido de fusion, no la construccion de correo, registro, validacion y login, y no se aprueba como cumplida; HU-03b-05, la recuperacion (V-26), la variante de invitacion y la subida de datos de EP-09 quedan como destinos pendientes declarados.", rollback="Ninguno: la sesion solo verifica y registra evidencia; no modifica codigo, documentos ni datos. Un item no verificado se registra como bloqueo con responsable en vez de darse por aprobado.", isTest=false, verify=[] }

### Enmienda 3

**Tasks agregadas:**

- S2: Implementar el servicio de correo agnostico de HU-03b-01 en `server/src/email/`: interfaz `EmailService` con adaptador Mailpit para desarrollo local y adaptador Mailjet para staging (credenciales solo por variables de entorno, sin secretos en el repo ni credenciales fabricadas), plantillas resueltas por clave, y despacho por la cola pg-boss ya existente del proyecto con reintentos y clave de idempotencia, de modo que un mismo evento de correo encolado dos veces entregue un solo correo. Registrar el worker de la cola en el arranque de la app y su configuracion en `server/src/config` (parametros con sus defaults: OTP TTL 10 minutos, 5 intentos, espera de reenvio 60 segundos). Redactar OTP y PII en logs: el codigo nunca se escribe en un log ni se devuelve en una respuesta. Documentar la superficie nueva en `docs/development/configuration.md` (adaptador agnostico, Mailpit local, Mailjet staging, parametros y defaults) y en `docs/development/commands.md` (comandos reproducibles, plantillas por clave, como correr `ep01-account-provider` en local), normalizando al linter de docs solo esos dos documentos. Tests reales contra Postgres, cola y Mailpit (sin mockear el transporte): entrega efectiva, reintento idempotente que no duplica el envio, resolucion de plantilla por clave y ausencia de OTP en logs. (valida: REQ-01, REQ-02, REQ-09; rollback: Revertir los commits de esta task (servicio, adaptadores, registro del worker y los dos documentos) conservando los datos: no borrar ni truncar las tablas de pg-boss, no purgar los jobs ya encolados y no revertir migraciones de EP-00/EP-01.)
- S3: Implementar el backend de registro de HU-03b-03 con schema incremental. Scope: `server/prisma/schema.prisma`, una migracion nueva con su inversa en `server/prisma/migrations/`, `server/src/auth/registro-cuenta.ts` y las rutas de cuenta. Reusar los campos ya existentes del modelo `Cuenta`; crear solo lo que falte (`credencial_password`, `desafio` de validacion de correo, `intento_seguridad`) en vez de duplicar estructuras. Contrasena con argon2id; correo persistido como `emailNormalizado` (unicidad) y `emailCifrado` (contacto). `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y deja la cuenta en estado `pendiente_verificacion`, reusando `RegistroCuentaRequest` tal como esta en `server/contract/openapi.yaml` (solo `email` y `password`, minimo 8 caracteres segun `server/contract/openapi.yaml:6403-6416`; la repeticion de contrasena es validacion de UI y no entra al contrato) y el middleware de contratos actual. La conversion corre en una sola transaccion e idempotente ante reintento del mismo registro: conserva el mismo id de cuenta con sus usos de producto, solicitudes, aceptaciones y consentimiento, no escala permisos, y encola el correo con el codigo. El OTP se persiste solo como hash, es de uso unico y nunca se devuelve ni se loguea. Privilegios: inspeccionar las tablas y grants reales antes de escribir la migracion; otorgar a `taomangalam_app` solo SELECT/INSERT/UPDATE donde hace falta, sin DELETE por defecto, y emitir REVOKE de UPDATE/DELETE sobre aceptaciones y consentimientos unicamente donde ese REVOKE no exista ya, sin degradar privilegios definidos por EP-00/EP-01; el DDL lo administra el rol migrador. (valida: REQ-03, REQ-04, REQ-11; rollback: Aplicar la migracion inversa incremental: revierte solo lo que esta migracion agrega y conserva los datos de las cuentas ya convertidas; no eliminar credenciales ni desafios a ciegas, no devolver los grants al estado por defecto del init y no tocar las tablas de EP-00/EP-01. Revertir los commits de codigo de la task.)
- S4: Implementar el backend de inicio de sesion de HU-03b-06. Scope: `server/src/auth/login.ts`, `server/src/routes/auth.ts` y la configuracion de seguridad en `server/src/config`. `POST /auth/login` conforme a `server/contract/openapi.yaml`: verifica la contrasena con argon2id contra el hash persistido y emite tokens reusando el `ServicioSesiones` existente (no crear un emisor paralelo). Respuesta neutra: no revela si el correo existe ni si la contrasena es incorrecta. Bloqueo por fuerza bruta persistido en base (tabla `intento_seguridad`): 5 fallos en una ventana de 15 minutos, bloqueo de 15 minutos; los tres valores son parametros tecnicos configurables con esos defaults, documentados en `docs/development/configuration.md`. Estados de cuenta resueltos segun el contrato: `pendiente_verificacion` no emite sesion y deriva a V-24; `suspendida` y `en_eliminacion` responden lo que declara OpenAPI. No hay inicio de sesion offline: sin respuesta del backend no se abre sesion nueva. Fuera de alcance explicito y no simulado: la vinculacion transaccional de la cuenta de dispositivo a una cuenta existente (HU-03b-07); si no hay entrega previa integrada, registrarla como dependencia que impide dar por completo el recorrido desde una cuenta de dispositivo. (valida: REQ-05, REQ-14; rollback: Revertir los commits de esta task conservando los datos: no borrar cuentas, credenciales ni las filas de `intento_seguridad` acumuladas, y no revertir la migracion de la sesion anterior.)
- S4: Implementar las pantallas reales de inicio de sesion en la app. Scope: `app/lib/features/cuenta/presentation`, `app/lib/features/cuenta/data` y la navegacion de la feature. Provider conectado al cliente HTTP real del contrato (sin stub ni respuesta simulada) que persiste los tokens en el almacenamiento de sesion existente de la app. UI: mostrar u ocultar contrasena de forma accesible, errores por campo que llevan el foco al campo a corregir conservando los valores validos, comportamiento sin conexion con reintento, derivacion a V-24 cuando el correo esta pendiente de validar, y navegacion de retorno al contexto de origen tras iniciar sesion. `Olvide mi contrasena` (V-26) y `Tengo una invitacion` se presentan como destinos pendientes declarados: no se simula un flujo inexistente ni se oculta la accion. Validacion por tests de widget y de integracion de la feature. (valida: REQ-05, REQ-13, REQ-14; rollback: Revertir los archivos agregados o modificados de `app/lib/features/cuenta` sin borrar el almacenamiento de sesion local ni los tokens ya persistidos en dispositivos de prueba.)
- S5: Implementar el cierre de sesion de HU-03b-11 en backend y su contraparte en la vista Cuenta. Scope backend: `server/src/auth/sesiones.ts` y `server/src/routes/auth.ts`. `POST /auth/logout` conforme a `server/contract/openapi.yaml`: revoca la sesion en el servidor, es idempotente (un segundo logout con el mismo token revocado no falla ni crea estado nuevo) y no borra datos de la cuenta ni del dispositivo. Scope app: la vista Cuenta muestra el tipo de cuenta y sus implicancias, los tres estados (de dispositivo / pendiente de validacion / completa) y las acciones de acceso y seguridad hacia V-23, V-24 y V-25; `Cerrar sesion` lleva la advertencia explicita y accesible de que no borra datos; y existe el acceso permanente a `V-51 Privacidad y consentimientos`, disponible con cualquier tipo de cuenta y tambien sin sesion de cuenta completa, declarado como destino pendiente mientras TAO-188 no este integrado (no se simula contenido de V-51 ni se da por verificada su revision). Tests reales: revocacion efectiva de la sesion en servidor, idempotencia del segundo logout, y datos locales y de servidor intactos despues de cerrar sesion; en app, los tres estados, el texto de advertencia y la presencia del acceso a Privacidad en cada tipo de cuenta. (valida: REQ-06, REQ-07, REQ-13; rollback: Revertir los commits de codigo de esta task sin recrear ni reactivar los tokens ya revocados y sin tocar los datos locales ni los del servidor.)
## Sessions

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1

**Gate (auto)**: Correo observable de punta a punta en local: al disparar el envio de prueba documentado, el mensaje con la plantilla del codigo de validacion aparece en la bandeja de Mailpit; procesar dos veces el mismo job de la cola deja un solo correo y el job agotado queda consultable. Tests del servicio y de la cola en verde (idempotencia, reintento 5xx, plantilla inexistente, agotamiento) y `docs/development/configuration.md` y `commands.md` con las variables y el comando de prueba, sin credenciales reales, con el lint de docs cambiados verde contra el SHA base.

### Session 3 · T3 · open

**Tasks:**
- [ ] S3.T5
- [ ] S3.T6
- [ ] S3.T7
- [ ] S3.T8
- [ ] S3.T9
- [ ] S3.T12
- [ ] S3.T13
- [ ] S3.T14

**Gate (auto)**: Conversion a cuenta completa revisable de punta a punta: desde V-23 en la app se registra un correo y una contrasena, `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y estado `pendiente_verificacion`, llega el codigo a Mailpit, y desde V-24 se valida el correo dejando la cuenta activa con el mismo id, usos, solicitudes, aceptaciones y consentimiento intactos. Se ve el error por campo con foco, el estado sin conexion, el reenvio sujeto a espera y el rechazo de `PUT /cuenta/correo` sobre cuenta activa. Suite de registro, validacion y privilegios de rol en verde, con el codigo OTP ausente de respuestas y logs.

### Session 4 · T2 · open

**Tasks:**
- [ ] S4.T8
- [ ] S4.T9
- [ ] S4.T10

**Gate (auto)**: Inicio de sesion revisable de punta a punta: desde V-25 en la app, credenciales correctas devuelven sesion con el nivel autorizado y persisten tokens; contrasena incorrecta y correo inexistente devuelven la misma respuesta neutra; una cuenta con correo pendiente deriva a V-24 sin emitir sesion; al alcanzar el limite se ve el bloqueo, que sobrevive al reinicio del proceso y se reinicia tras un login exitoso. `Olvide mi contrasena` y `Tengo una invitacion` se ven como destinos no disponibles, sin pantallas simuladas. Suite de integracion de acceso (registro, validacion y login) y de privilegios de rol en verde.

### Session 5 · T2 · open

**Tasks:**
- [ ] S5.T2
- [ ] S5.T3
- [ ] S5.T4
- [ ] S5.T5

**Gate (auto)**: Vista Cuenta revisable: V-27 muestra los tres estados (cuenta de dispositivo con la advertencia de perdida al reinstalar, correo pendiente con Ingresar/Reenviar codigo, cuenta completa con su correo), el bloque de acceso y seguridad hacia V-23/V-24/V-25, el acceso permanente a Privacidad y consentimientos en los tres estados, y Cerrar sesion con la advertencia explicita de que no borra datos. Tras cerrar sesion los datos locales siguen intactos y la app vuelve al modo sin sesion. Tests de los tres estados, del cierre de sesion y la regresion de que no se renderizan secciones fuera de HU-03b-11 en verde.

### Session 6 · T3 · open

**Tasks:**
- [ ] S6.T2
- [ ] S6.T3
- [ ] S6.T5

**Gate (auto)**: Evidencia y cierre: el job `ep01-account-provider` corre verde en CI remoto sobre el SHA integrado, ejecutando las suites reales de backend y app con la traza caso-a-REQ y declarado en los `needs` del quality-gate, que tambien queda verde. `configuration.md`, `commands.md` y `release-runbook.md` documentan configuracion, defaults de TTL/intentos/reenvio, comandos, evidencia de correo y rollback, con lint de docs cambiados verde contra el SHA base. La verificacion final deja resultado explicito por item (correo local, entrega real en staging con SPF/DKIM/DMARC, recorrido V-23/V-24/V-25/V-27 en telefono y tablet, cierre de sesion con datos intactos, acceso a Privacidad, CI verde); lo bloqueado o pendiente humano queda registrado como bloqueo con responsable, nunca como aprobado.

### Session 7 · T0 · open

**Gate (strong)**: Verificación final con evidencia auténtica. Pendientes humanos/staging/vinculación se registran con responsable y no habilitan consumo final; CI remoto se exige en entrega final épica->main DEC239, no push/PR por ticket.
## Technical

Primer arranque exige trabajo previo terminado e integrado por su responsable, árbol limpio y baseline verificable en epic/EP-01a. El ejecutor verifica, NO incorpora ni adopta cambios ajenos. Capturar entonces el SHA fijo DOCS_DIFF_BASE y conservarlo todo el paquete. Este intake no establece pre-gate ni ejecuta código.

Contrato OpenAPI manda: registro 202 RegistroCuentaRespuesta, pendiente_verificacion, email/password solamente. Repetición password solo UI, mínimo8 openapi6403-6416. emailNormalizado legible para unicidad y emailCifrado para contacto. Argon2id. Parámetros INFERIDOS de implementación configurable: OTP TTL10min máximo5 intentos reenvío60s; login5fallos ventana15min bloqueo15min. Estos números NO son decisiones fuente de producto aunque estén descritos en requisitos confirmados; son defaults técnicos documentados sustituibles por configuración.

Reusar campos, contrato/middleware, tokens/idempotencia, pg-boss/servicios y navegación existentes. Verificar reuso antes de asumir helpers que no existan. OTP hash almacenamiento, nunca en respuestas/logs. No hardcodear secretos.

HU03b07 vinculación fuera, no encontrada en código. Implementar login cuenta completa; integración desde cuenta dispositivo no se declara concluida hasta proveedor real vinculación. No cambiar propietarios legales/consentimientos ni intentar fusión. Cuenta->V51 independiente revisión final TAO188. Sin subir datos EP09; DEC052 hook posterior.

Grants reales preservados; inversa incremental no borra credenciales/datos de cuentas convertidas ciegamente ni devuelve grants al init. Revertir código no revierte conversiones: contener escrituras nuevas, conservar filas y revisar rollback en base de prueba.

Mailpit no sustituye Mailjet staging/DNS reales. CI suites reales app/backend con trazabilidad/SHA. Checks automáticos no prueban DNS ni revisión humana; items finales pendientes hasta evidencia auténtica.

## Secuenciacion

Orden S2 correo -> S3 registro/validación V23/V24 -> S4 login V25 -> S5 Cuenta/logout -> S6 CI/docs/staging -> S7 verificación. Primer arranque ANTES S2: comprobar trabajo previo integrado por responsable, árbol limpio baseline; registrar SHA fijo DOCS_DIFF_BASE. No incorporar cambios ajenos.

DEC239 vigente tiene prioridad: acumular localmente epic/EP-01a sin push/PR/CI ticket. Implementar ep01-account-provider runner local y job CI dependiente quality-gate; pruebas/gates locales por ticket. CI remoto real sobre SHA integrado se verifica PR ÚNICO final epic/EP-01a->main, previo consumo final. S6 exige runner/configuración/tests locales, no PR individual. No alterar triggers para PRs epic/**.

Docs: DOCS_DIFF_BASE=<SHA registrado> pnpm run docs:check:changed desde raíz. Server suites bajo server/src/test. Archivos nuevos del plan son scopes propuestos, no evidencia existencia. Ejecutores comprueban reuso.

HU03b07 vinculación no encontrada: FU21 dependencia externa; no implementar fusión ni dar por concluido recorrido desde dispositivo. V51 final TAO188. Correo staging auténtico FU20 no sustituible por local. Limitaciones bloquean criterio y consumo final; no fabricar evidencia.

