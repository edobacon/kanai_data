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
> Fuente: taomangalam/docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md

La vista Cuenta muestra siempre el tipo de cuenta y el estado correspondiente (cuenta de dispositivo con la advertencia de perdida al reinstalar y los accesos Registrarme e Iniciar sesion, correo pendiente de validar con Ingresar o Reenviar codigo, cuenta completa con su correo) y ofrece Cerrar sesion (POST /auth/logout) advirtiendo que no borra datos.

### REQ-06 `confirmed`
> Fuente: docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md (HU-03b-11)

La vista Cuenta (V-27, solo las secciones de HU-03b-11) muestra el tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validacion / completa), las acciones de acceso y seguridad hacia V-23/V-24/V-25 y cierra sesion con la advertencia explicita de que no borra datos; `Recuperar contrasena` (V-26) y `Tengo una invitacion` se presentan como destinos pendientes declarados, sin ofrecer un funcionamiento inexistente.

### REQ-07 `inferred`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:625

Existe el check de CI ep01-account-provider que ejecuta los casos de esta preparacion trazados a tests reales, con Mailpit para el camino local y sin credenciales fabricadas; si falta configuracion de correo de staging o una decision requerida, el ejecutor registra el bloqueo con responsable y no marca ese criterio como probado.

### REQ-08 `confirmed`
> Fuente: Request TAO-193, seccion 'Evidencia y fases posteriores'

El check CI `ep01-account-provider` es un job real que ejecuta los tests de backend y de app de este paquete trazados caso a caso, con los filtros de paths de docs y scripts pertinentes y declarado en los `needs` del quality-gate; falla si alguno de los REQ-01 a REQ-16 deja de cumplirse. No se implementa con `grep` ni con comprobaciones textuales.

### REQ-09 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Solo los documentos efectivamente modificados por este paquete se normalizan conforme al linter de docs, y el lint de documentos cambiados corre con DOCS_DIFF_BASE fijado al SHA capturado de epic/EP-01a, nunca contra HEAD de una rama viva ni contra origin/main; los documentos citados pero no modificados no se normalizan.

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

#### S1.T1 — Primer arranque: reconciliar e integrar el trabajo previo pendiente de `epic/EP-01a` sobre el arbol concurrente sucio, dejar el arbol limpio y registrar el SHA resultante como base del paquete, que sera el valor de `DOCS_DIFF_BASE` y la traza de CI. No commitear codigo del paquete en este paso.
Contrato: rollback: No aplica cambio de codigo: si la reconciliacion no es posible, detener la ejecucion dejando el arbol como estaba y registrar el bloqueo con su responsable.. Status: pending

#### S2.T1 — Crear la interfaz EmailService agnostica con dos adaptadores: Mailjet para staging/produccion y SMTP contra Mailpit para desarrollo, seleccionados por variable de entorno. Reusar la configuracion de servicios ya declarada en compose.yaml y el cliente HTTP del server; no agregar un broker ni un segundo cliente de correo. Las plantillas se resuelven por clave (la primera es la del codigo de validacion de correo).
Contrato: rollback: Revertir el commit del modulo de correo y su registro en el contenedor de dependencias; sin consumidores, el resto del server queda igual.. Status: pending

#### S2.T2 — Despachar los envios por la cola pg-boss existente con reintentos y clave de idempotencia por evento de correo, de modo que procesar dos veces el mismo job produzca un solo envio, y dejar el job fallido consultable al agotar los reintentos sin bloquear el flujo que lo encolo.
Contrato: rollback: Revertir el commit del worker y del encolado; la cola vuelve a no tener la cola de correo registrada.. Status: pending

#### S2.T3 — Documentar la superficie nueva en los documentos existentes: variables de correo con el valor local de Mailpit y placeholders de staging en docs/development/configuration.md, y el comando de envio de prueba y el del check ep01-account-provider en docs/development/commands.md. Sin credenciales reales. Normalizar conforme al linter solo esos documentos y correr el lint de docs cambiados con DOCS_DIFF_BASE fijado al SHA capturado de epic/EP-01a.
Contrato: rollback: Revertir el commit de documentacion; los documentos vuelven a su contenido previo y el baseline de lint queda como estaba.. Status: pending

#### S2.T4 — Tests del servicio de correo y de la cola: envio por clave de plantilla visible en el adaptador local, idempotencia ante doble procesamiento, reintento ante 5xx, clave de plantilla inexistente y agotamiento de reintentos. Incluir el caso que verifica que la documentacion de configuracion no contiene credenciales reales.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T1 — Backend de conversion a cuenta completa y validacion de correo: migracion, endpoints POST /cuenta/registro y POST /cuenta/correo/verificacion con reenvio, consumiendo la cola de correo de la sesion anterior. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir los commits de las subtasks en orden inverso y aplicar la migracion inversa, que conserva las filas de aceptaciones y usos de producto existentes.. Status: pending

#### S3.T1.1 — Migracion de Prisma para cuentas con correo y contrasena, desafios de validacion de correo e intentos de seguridad, aplicada con el rol migrador (prisma migrate deploy, igual que el job integration). Fijar privilegios minimos por rol sobre las tablas nuevas: el rol de aplicacion conserva SELECT/INSERT/UPDATE donde los necesita, sin DELETE en historiales, y REVOKE explicito de UPDATE y DELETE sobre aceptaciones y consentimientos append-only. No tocar los grants ya definidos por EP-00/EP-01.
Contrato: rollback: Aplicar la migracion inversa incluida en el mismo commit; conserva los datos de aceptaciones y usos de producto.. Status: pending

#### S3.T1.2 — Endpoint POST /cuenta/registro: normaliza y cifra el correo, hashea la contrasena con argon2id, convierte la cuenta de dispositivo en cuenta completa pendiente de validacion conservando el mismo identificador de cuenta junto con sus usos de producto, solicitudes y aceptaciones, y encola el correo del codigo. Un correo ya asociado a una cuenta completa responde ofreciendo iniciar sesion o recuperar contrasena sin revelar mas informacion.
Contrato: rollback: Revertir el commit del endpoint; la ruta deja de estar registrada y el esquema queda sin consumidor.. Status: pending

#### S3.T1.3 — Endpoint POST /cuenta/correo/verificacion y su reenvio: valida el codigo dentro de su vigencia y deja la cuenta completa activa; aplica caducidad del codigo, limite de intentos y espera minima entre reenvios; un reenvio emite un codigo nuevo que invalida al anterior. Los valores de caducidad y de limite de intentos se leen de configuracion con el default documentado (V-24 no los fija).
Contrato: rollback: Revertir el commit del endpoint; las cuentas pendientes quedan pendientes y no se pierden datos.. Status: pending

#### S3.T1.4 — Generar la migración y agregar al SQL los GRANT mínimos para `taomangalam_app` sobre las tablas nuevas: SELECT/INSERT/UPDATE donde la operación lo exige y ningún DELETE. Usar los nombres reales de tablas y rol obtenidos en el inventario.
Contrato: rollback: Revertir el archivo de migración antes de aplicarlo; si ya se aplicó en local, correr la migración inversa de la subtask de rollback.. Status: pending

#### S3.T1.5 — Agregar al mismo SQL el REVOKE explícito de UPDATE y DELETE para `taomangalam_app` sobre las tablas de aceptaciones legales y consentimientos, dejándolas append-only (INSERT y SELECT), porque las default privileges del init otorgan escritura completa. Confirmar que el rol de cola conserva los privilegios que pg-boss necesita sobre su esquema.
Contrato: rollback: Revertir el bloque de REVOKE del archivo de migración; los privilegios vuelven a los del init.. Status: pending

#### S3.T1.6 — Escribir el SQL de migración inversa del paquete: restituye los privilegios previos registrados en el inventario y elimina solo las tablas nuevas, sin tocar filas de tablas preexistentes. Dejarlo versionado junto a la migración para que el rollback sea ejecutable y no improvisado.
Contrato: rollback: Revertir el archivo de rollback; la migración directa queda igual.. Status: pending

#### S3.T1.7 — Aplicar la migración en local con el rol migrador, volver a volcar `information_schema.role_table_grants` y comparar contra el inventario inicial: las únicas diferencias deben estar en las tablas nuevas y en el append-only de aceptaciones. Registrar el conteo de aceptaciones y de usos de producto antes y después.
Contrato: rollback: Correr la migración inversa versionada y volver a comparar los grants contra el inventario inicial.. Status: pending

#### S3.T2 — Alinear el contrato de registro con `server/contract/openapi.yaml`: `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y deja estado `pendiente_verificacion`; `RegistroCuentaRequest` conserva solo `email` y `password` (la repeticion de contrasena no es campo del contrato) y se reusa el middleware de validacion de contratos existente. Corregir handler, tipos y cualquier referencia a 201 o a `pendiente_validacion`.
Contrato: rollback: Revertir el commit del handler y de los tipos de registro; el contrato OpenAPI no se modifica, por lo que no queda estado residual.. Status: pending

#### S3.T3 — Implementar la conversion preservando identidad: mismo id de cuenta, usos de producto, solicitudes, aceptaciones legales y consentimiento de analitica intactos; sin escalamiento de permisos; reintento del mismo registro idempotente (no crea segunda cuenta ni segundo desafio activo) y encolado del correo con clave de idempotencia por cuenta y desafio.
Contrato: rollback: Revertir el commit del servicio de conversion; los registros ya convertidos no se revierten por codigo (la inversa de datos la cubre la migracion incremental).. Status: pending

#### S3.T4 — Persistencia del correo segun el schema vigente: `emailNormalizado` como clave de unicidad y `emailCifrado` para contacto, reusando las columnas y el helper de cifrado existentes. No introducir HMAC obligatorio ni afirmar en codigo, tests o docs que la columna normalizada nunca contiene texto legible.
Contrato: rollback: Revertir el commit del mapeo de correo; no hay cambio de columnas que deshacer.. Status: pending

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

#### S3.T10 — Pantallas V-23 Crear cuenta y V-24 Validar correo en la app, con sus estados especiales y su navegacion. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir los commits de las subtasks en orden inverso; la app vuelve a no ofrecer el registro ni la validacion de correo.. Status: pending

#### S3.T10.1 — Pantalla V-23 Crear cuenta: formulario con correo, contrasena y repeticion de contrasena, la explicacion de que la cuenta completa es gratuita, y el envio contra POST /cuenta/registro con los estados de carga y exito que llevan a V-24.
Contrato: rollback: Revertir el commit de la pantalla y su registro de ruta; la app vuelve a no ofrecer el registro.. Status: pending

#### S3.T10.2 — Validacion y manejo de errores de V-23: contrasena y repeticion distintas, correo con formato invalido y errores del servidor conservan los valores ya validos (entre ellos el correo ingresado) y llevan el foco al campo a corregir, sin vaciar el formulario.
Contrato: rollback: Revertir el commit; V-23 queda con el envio sin el manejo fino de errores.. Status: pending

#### S3.T10.3 — Estados especiales y navegacion de V-23: correo ya asociado a una cuenta completa se presenta ofreciendo iniciar sesion sin revelar mas informacion; sin conexion se informa y la app sigue operando en local; Ya tengo cuenta abre V-25 y Ahora no vuelve al contexto anterior.
Contrato: rollback: Revertir el commit; V-23 queda sin los estados especiales ni los accesos de navegacion.. Status: pending

#### S3.T10.4 — Pantalla V-24 Validar correo: muestra el correo parcialmente oculto, el campo de codigo y el envio contra POST /cuenta/correo/verificacion; al validar, abre V-27 o el contexto protegido de origen.
Contrato: rollback: Revertir el commit de la pantalla y su ruta; la app no ofrece ingresar el codigo.. Status: pending

#### S3.T10.5 — Reenvio y mensajes de error de V-24: accion Reenviar codigo con su espera visible, y los mensajes diferenciados de codigo incorrecto, codigo caducado, intentos agotados y espera de reenvio no cumplida, cada uno mapeado a la respuesta del endpoint.
Contrato: rollback: Revertir el commit; V-24 queda sin reenvio y con el error generico.. Status: pending

#### S3.T10.6 — Ruta `POST /cuenta/registro` que compone lo anterior: 201 con el estado de la cuenta en el caso feliz, y respuesta neutra cuando el correo ya está asociado a una cuenta completa (ofrece iniciar sesión o recuperar, sin confirmar la existencia de la cuenta ni filtrar datos del titular ni variar el tiempo de respuesta de forma delatora).
Contrato: rollback: Revertir el commit de la ruta y su registro en el router; los servicios quedan sin consumidor HTTP.. Status: pending

#### S3.T11 — Tests de registro, validacion de correo y permisos por rol sobre las tablas nuevas. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Eliminar los archivos de test agregados por las subtasks.. Status: pending

#### S3.T11.1 — Tests de POST /cuenta/registro: la conversion preserva el mismo id de cuenta, sus usos de producto, solicitudes y aceptaciones; la cuenta queda pendiente de validacion y se encola el correo del codigo; correo ya asociado responde sin revelar informacion de la cuenta existente.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T11.2 — Test del hash de contrasena: el campo almacenado es argon2id, no contiene la contrasena en claro y verifica correctamente contra ella; una contrasena distinta no verifica.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: pending

#### S3.T11.3 — Tests de POST /cuenta/correo/verificacion: codigo correcto dentro de vigencia deja la cuenta completa activa; codigo incorrecto devuelve el error especifico, incrementa intentos y no cambia el estado; superado el limite el desafio queda agotado y el codigo correcto es rechazado.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T11.4 — Tests de caducidad y reenvio del codigo: un codigo caducado es rechazado aunque sea el ultimo emitido; reenviar antes de la espera minima devuelve el error de espera sin encolar un segundo correo; un reenvio valido emite un codigo nuevo que invalida al anterior.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T11.5 — Tests reales de permisos por rol sobre las tablas nuevas: con el rol de aplicacion, INSERT y UPDATE en desafios de correo funcionan, y DELETE y UPDATE sobre aceptaciones son rechazados; la comparacion de grants antes y despues solo muestra las tablas nuevas de este paquete.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S3.T11.6 — Test de la migracion inversa: aplicar el down revierte el esquema de este paquete sin borrar filas de aceptaciones ni de usos de producto preexistentes.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: pending

#### S3.T12 — Pantalla real de V-23 Crear cuenta: formulario con correo, contrasena y repeticion, provider de estado, cliente del contrato real y almacenamiento de sesion; mostrar u ocultar contrasena accesible; validacion de la repeticion en la UI; errores por campo que mueven el foco al campo a corregir conservando los valores validos; estado sin conexion con reintento; `Ya tengo cuenta` hacia V-25 y `Ahora no` de vuelta al contexto de origen.
Contrato: rollback: Revertir el commit de la pantalla y su provider; la navegacion vuelve al estado anterior sin rutas huerfanas.. Status: pending

#### S3.T13 — Pantalla real de V-24 Validar correo: correo parcialmente oculto, campo de codigo, `Validar correo`, `Reenviar codigo` sujeto a la espera configurada, `Cambiar correo` hacia la correccion en estado pendiente, mensajes de codigo incorrecto, caducado e intentos agotados; al validar con sesion activa persiste los tokens nuevos devueltos y abre V-27.
Contrato: rollback: Revertir el commit de la pantalla y su provider.. Status: pending

#### S4.T1 — Implementar `POST /auth/login` (V-25) con verificación argon2id, emisión de sesión con el nivel autorizado, respuesta diferenciada para cuenta con correo pendiente (sin emitir sesión, derivando a V-24), respuesta neutra idéntica para contraseña incorrecta y correo inexistente, y bloqueo por fuerza bruta persistido en base (DEC-163) que sobrevive al reinicio del proceso y se reinicia tras un login exitoso. No implementar la vinculación transaccional de la cuenta de dispositivo: eso es HU-03b-07, fuera de este paquete.
Contrato: rollback: Revertir el commit del endpoint de login; las cuentas y sus intentos registrados se conservan.. Status: pending

#### S4.T1.1 — Búsqueda de cuenta por la forma normalizada del correo y verificación argon2id de la contraseña, reusando las utilidades de S2.T2. El camino de correo inexistente ejecuta igualmente una verificación señuelo para no delatar por tiempo de respuesta cuál de los dos campos falló.
Contrato: rollback: Revertir el commit; ninguna ruta lo consume todavía.. Status: pending

#### S4.T1.2 — Registro persistido de intentos fallidos y evaluación del bloqueo (DEC-163): umbral y ventana como constantes configurables documentadas, estado de bloqueo derivado de la tabla de intentos para que sobreviva al reinicio del proceso. Sin cache en memoria como única fuente.
Contrato: rollback: Revertir el commit; la tabla de intentos queda escrita pero sin lectores, no altera el comportamiento previo.. Status: pending

#### S4.T1.3 — Emisión de sesión con el nivel autorizado de la cuenta, reusando el mecanismo de sesión ya existente del servidor. No implementar la vinculación transaccional de la cuenta de dispositivo: eso es HU-03b-07, fuera de este paquete.
Contrato: rollback: Revertir el commit; el mecanismo de sesión vuelve a sus emisores previos.. Status: pending

#### S4.T1.4 — Ruta `POST /auth/login` que compone las ramas: 200 con sesión y nivel autorizado en el caso feliz; respuesta neutra idéntica para contraseña incorrecta y correo inexistente; estado `pendiente de validación` con la indicación de ir a V-24 sin emitir sesión; y respuesta de bloqueo que se impone incluso con credenciales correctas.
Contrato: rollback: Revertir el commit de la ruta y su registro en el router.. Status: pending

#### S4.T1.5 — Reinicio del contador de intentos fallidos de la cuenta tras un login exitoso, en la misma transacción que la emisión de sesión para que un fallo parcial no deje la cuenta bloqueada por un acceso válido.
Contrato: rollback: Revertir el commit; el contador deja de reiniciarse y los intentos caducan solo por ventana.. Status: pending

#### S4.T2 — `POST /auth/login`: autenticacion de cuenta completa validada con devolucion del nivel autorizado, respuesta neutra ante credenciales invalidas y bloqueo por fuerza bruta persistido. Sin vinculacion de la cuenta de dispositivo (HU-03b-07 fuera de alcance): no reasignar usos ni solicitudes y registrar la dependencia.
Contrato: rollback: Revertir el commit del handler de login y del contador de intentos; la tabla de intentos se vacia con la inversa de la migracion.. Status: pending

#### S4.T3 — Tests de integración del acceso: registro feliz conservando id/usos/aceptaciones, correo ya asociado con respuesta neutra, contraseña bajo el mínimo, correo normalizado y cifrado, hash con prefijo argon2id; validación con código correcto, incorrecto, caducado, intentos agotados y cambio de correo; login feliz, neutro ante credenciales inválidas, bloqueo persistido tras reinicio, pendiente de validación y reinicio de contador; y los tests de privilegios de rol (DELETE denegado a `taomangalam_app`, aceptaciones append-only, comparación de `role_table_grants` antes y después).
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.1 — Utilidades de prueba del paquete: fixture de cuenta de dispositivo con usos de producto y aceptaciones previas, helper de lectura de la bandeja de Mailpit para extraer el código del correo, y helper de conexión como `taomangalam_app` (distinto del rol migrador) para los tests de privilegios.
Contrato: rollback: Revertir el commit de los helpers; ningún test los consume todavía.. Status: pending

#### S4.T3.2 — Tests de `POST /cuenta/registro`: caso feliz 201 con cuenta `pendiente_validacion`, mismo `cuentaId` y usos y aceptaciones intactos más el correo en Mailpit; correo ya asociado con respuesta neutra que no confirma la existencia; contraseña bajo el mínimo y repetición que no coincide con 400 y sin modificar la cuenta.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.3 — Tests de almacenamiento del registro: la columna de correo no contiene el texto plano, `A@X.com` y `a@x.com` colisionan como el mismo correo contra el índice único, y el hash de contraseña tiene prefijo `$argon2id$` verificando la contraseña correcta y rechazando una distinta.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.4 — Tests de validación de correo: código correcto deja la cuenta `activa` conservando id y aceptaciones y devuelve el estado que V-27 muestra; código incorrecto incrementa intentos sin cambiar el estado; código caducado se rechaza; intentos agotados rechazan incluso un código correcto; reenvío dentro de la ventana responde espera y fuera de la ventana invalida el anterior; `PUT /cuenta/correo` vuelve a pendiente con código nuevo al correo corregido.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.5 — Tests de `POST /auth/login`: caso feliz con sesión y nivel autorizado; contraseña incorrecta y correo inexistente con respuesta idéntica; cuenta con correo pendiente sin sesión y derivando a V-24; y reinicio del contador de intentos tras un login exitoso.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.6 — Test del bloqueo por fuerza bruta persistido: superado el umbral la cuenta queda bloqueada y un login con credenciales correctas responde bloqueo; tras reconstruir la instancia del servidor (simulando el reinicio del proceso) el bloqueo sigue vigente porque vive en la base.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.7 — Tests de privilegios de rol conectados como `taomangalam_app`: INSERT y UPDATE exitosos sobre desafíos de validación y DELETE rechazado por permiso; UPDATE y DELETE rechazados sobre aceptaciones legales con el INSERT todavía permitido; y el worker de correo arrancando sin error de permisos sobre el esquema de la cola.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T3.8 — Test de regresión de la migración: comparar `information_schema.role_table_grants` antes y después de aplicar la migración mostrando diferencias solo en las tablas nuevas y en el append-only de aceptaciones, y correr la migración inversa comprobando que el conteo de aceptaciones y de usos de producto es idéntico antes y después.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T4 — Endpoint POST /auth/login: autentica correo y contrasena de una cuenta completa validada, devuelve la sesion con el nivel autorizado, responde validacion pendiente cuando el correo no esta validado, y aplica bloqueo por fuerza bruta persistido en la tabla de intentos de seguridad (sobrevive al reinicio del proceso). La limpieza de intentos vencidos corre por lotes acotados con tamano configurable, nunca recorriendo la tabla completa.
Contrato: rollback: Revertir el commit del endpoint y del job de limpieza; la tabla de intentos queda sin escritor y no se pierden cuentas.. Status: pending

#### S4.T5 — Pantalla V-25 Iniciar sesion en la app: correo, contrasena con mostrar u ocultar accesible, errores comprensibles que no revelan si el correo existe, y las acciones Crear cuenta hacia V-23, Ahora no hacia el contexto anterior y la apertura de V-24 cuando el correo sigue pendiente. No se implementa Olvide mi contrasena (V-26 es HU-03b-08, fuera de este paquete): la accion queda ausente, no simulada.
Contrato: rollback: Revertir el commit de la vista y su ruta; la app vuelve a no ofrecer inicio de sesion.. Status: pending

#### S4.T5.1 — Sección de tipo de cuenta y estado con cuenta de dispositivo: tipo, qué implica, advertencia de pérdida al reinstalar sin cuenta completa, y los accesos `Registrarme` (V-23) e `Iniciar sesión` (V-25). Si todavía no hubo conexión, indicar que la cuenta de dispositivo se creará cuando haya red.
Contrato: rollback: Revertir el commit de esta sección; el resto de la vista sigue compilando porque las secciones se componen de forma independiente.. Status: pending

#### S4.T5.2 — Sección de estado pendiente de validación: correo parcialmente oculto, etiqueta `Correo pendiente de validar`, accesos `Ingresar código` y `Reenviar código` hacia V-24 y la acción de corregir el correo.
Contrato: rollback: Revertir el commit de esta sección; la vista conserva las demás secciones.. Status: pending

#### S4.T5.3 — Sección Acceso y seguridad con cuenta completa: correo como identidad visible, accesos a validar correo e iniciar sesión según estado, y `Cerrar sesión` conectado a `POST /auth/logout` con la advertencia explícita de que no borra datos antes de confirmar.
Contrato: rollback: Revertir el commit de esta sección; el endpoint de logout queda sin consumidor en la UI pero no rompe nada.. Status: pending

#### S4.T6 — Tests de inicio de sesion: credenciales correctas devuelven sesion y nivel autorizado; contrasena incorrecta y correo inexistente devuelven identica respuesta; bloqueo al alcanzar el limite y persistencia del bloqueo; cuenta pendiente de validacion; limpieza por lotes acotada.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S4.T7 — Pantalla real de V-25 Iniciar sesion: correo y contrasena, mostrar u ocultar accesible, errores sin revelar informacion sensible, derivacion a V-24 cuando el correo esta pendiente, retorno al contexto de origen, y `Olvide mi contrasena` y `Tengo una invitacion` presentados como destinos todavia no disponibles en este paquete, sin pantallas simuladas.
Contrato: rollback: Revertir el commit de la pantalla y su provider.. Status: pending

#### S5.T1 — Vista Cuenta con las secciones de HU-03b-11 y el cierre de sesion. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir los commits de las subtasks en orden inverso; la app vuelve a la vista Cuenta previa.. Status: pending

#### S5.T1.1 — Endpoint POST /auth/logout que cierra la sesion del servidor sin tocar datos, y exposicion del estado de cuenta (tipo de cuenta, estado de validacion del correo, correo cuando es completa) que la vista consume para decidir que seccion mostrar.
Contrato: rollback: Revertir el commit; la sesion solo caduca por su vencimiento natural y no se pierden datos.. Status: pending

#### S5.T1.2 — Pantalla V-27 Cuenta, solo las secciones de esta historia: tipo de cuenta y que implica cada uno; estado con cuenta de dispositivo con la advertencia de que reinstalar sin cuenta completa pierde los datos de este telefono y los accesos Registrarme (V-23) e Iniciar sesion (V-25); estado pendiente de validacion con el correo parcialmente oculto y el acceso a V-24; acceso y seguridad; y Cerrar sesion con la advertencia de que no borra datos. Primer uso sin conexion indica que la cuenta de dispositivo se creara al haber red. No se implementan borrado, eliminacion, respaldo, dispositivos, conflictos ni Mi personalidad.
Contrato: rollback: Revertir el commit de la vista; Cuenta vuelve a su contenido previo.. Status: pending

#### S5.T1.3 — Acceso permanente a Privacidad y consentimientos desde Cuenta, visible y habilitado con cualquier tipo de cuenta (de dispositivo, pendiente de validacion y completa) y no condicionado por capacidades gateables. El destino es la vista V-51, cuya implementacion y revision corresponden a TAO-188: aqui solo se entrega el punto de entrada.
Contrato: rollback: Revertir el commit del acceso; Cuenta queda sin el enlace y ninguna otra seccion cambia.. Status: pending

#### S5.T2 — Secciones de V-27 correspondientes a HU-03b-11: tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validacion / completa), bloque de acceso y seguridad hacia V-23/V-24/V-25, cierre de sesion con la advertencia explicita de que no borra datos, y el acceso permanente a `V-51 Privacidad y consentimientos` visible con cualquier tipo de cuenta (solo el punto de entrada; la vista destino es de TAO-188). No incluir borrado, eliminacion, respaldo ni dispositivos.
Contrato: rollback: Revertir el commit de las secciones agregadas a V-27; la vista queda como estaba antes del paquete.. Status: pending

#### S5.T3 — Tests de la vista Cuenta: los tres estados con sus textos y acciones, cierre de sesión con advertencia y datos locales intactos tras cerrarla, acceso a Privacidad visible en los tres estados y no gateable, y la regresión de que no se renderizan secciones fuera de HU-03b-11 (respaldo, dispositivos, conflictos, borrado, eliminación).
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S5.T4 — Verificar en test de integracion de la app que cerrar sesion desde V-27 conserva los datos locales (consultantes, consultas, tiradas, tareas) en el almacenamiento del dispositivo y que el estado de la app vuelve al modo sin sesion sin purgar nada.
Contrato: rollback: Revertir el commit del test y del ajuste de limpieza de sesion si lo hubo.. Status: pending

#### S5.T5 — Tests de la vista Cuenta, del cierre de sesion, del acceso a Privacidad y consentimientos y de la trazabilidad del check. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Eliminar los archivos de test agregados por las subtasks.. Status: pending

#### S5.T5.1 — Tests de los tres estados de Cuenta: cuenta de dispositivo con la advertencia de reinstalacion y los accesos Registrarme e Iniciar sesion; correo registrado sin validar con el correo parcialmente oculto y el acceso a V-24; cuenta completa activa con el correo como identidad visible y sin nombre de cuenta.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S5.T5.2 — Test del primer uso sin conexion: Cuenta indica que la cuenta de dispositivo se creara al haber red y la app sigue operando en local sin bloquear la vista.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: pending

#### S5.T5.3 — Tests de cierre de sesion: POST /auth/logout cierra la sesion del servidor sin tocar datos, y tras cerrar sesion los datos locales de consultas siguen presentes y la app lo comunica explicitamente.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S5.T5.4 — Tests del acceso a Privacidad y consentimientos: visible y habilitado con cuenta de dispositivo, pendiente de validacion y completa, y no oculto al deshabilitar capacidades gateables.
Contrato: rollback: Eliminar los archivos de test agregados.. Status: pending

#### S5.T5.5 — Test de la trazabilidad del check: un caso declarado por ep01-account-provider sin test asociado hace fallar el check, y eliminar uno de los tests declarados tambien lo hace fallar.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: pending

#### S6.T1 — Check de CI ep01-account-provider y documentacion de evidencia y rollback en el runbook. La task padre no se ejecuta directamente: se completa cuando terminan sus subtasks.
Contrato: rollback: Revertir los commits de las subtasks en orden inverso; CI vuelve a los checks previos y los documentos a su contenido anterior.. Status: pending

#### S6.T1.1 — Declarar el mapa de trazabilidad del check: cada caso de esta preparacion (correo, registro, validacion, login y Cuenta) apuntando al test real que lo cubre, en un archivo versionado que es la unica fuente del check.
Contrato: rollback: Revertir el commit del mapa; el check queda sin declaracion y no se agrega a CI.. Status: pending

#### S6.T1.2 — Runner del check que ejecuta los tests declarados en el mapa y falla cuando un caso declarado no tiene test asociado o cuando el test que declara dejo de existir; corre con Mailpit o doble local y no lee variables de Mailjet de staging.
Contrato: rollback: Revertir el commit del runner; el mapa queda sin ejecutor y CI no lo invoca.. Status: pending

#### S6.T1.3 — Agregar el check ep01-account-provider a .github/workflows/ci-pr.yml con el servicio Mailpit y el Postgres por roles ya declarados para el job integration, sin secretos y sin levantar infraestructura propia, y documentar su comando reproducible en docs/development/commands.md.
Contrato: rollback: Revertir el commit del workflow y del documento; CI vuelve a los checks previos.. Status: pending

#### S6.T1.4 — Documentar en docs/development/release-runbook.md la evidencia de correo en staging (SPF, DKIM, DMARC) con su responsable y el rollback del paquete conservando datos y registros, dejando lo que depende de configuracion de dominio ausente registrado como bloqueo con responsable, no como criterio aprobado.
Contrato: rollback: Revertir el commit del runbook; el documento vuelve a su contenido previo.. Status: pending

#### S6.T1.5 — Normalizar conforme al linter solo los documentos efectivamente tocados por el paquete y correr el lint de docs cambiados con DOCS_DIFF_BASE fijado al SHA capturado de epic/EP-01a, verificando que el diff de docs no incluye documentos del baseline solo citados.
Contrato: rollback: Revertir el commit de normalizacion; los documentos vuelven a su forma previa.. Status: pending

#### S6.T2 — Documentar la superficie operativa nueva en los docs existentes: correo/cola y configuracion local Mailpit + staging Mailjet sin secretos, y los defaults de TTL/intentos/reenvio, en `docs/development/configuration.md`; comandos, plantillas por clave y el check reproducible `ep01-account-provider` en `docs/development/commands.md`; evidencia de correo en staging (SPF/DKIM/DMARC) y rollback en `docs/development/release-runbook.md`. Normalizar al linter solo estos documentos.
Contrato: rollback: Revertir el commit de docs; los tres documentos vuelven a su contenido previo.. Status: pending

#### S6.T3 — Implementar el job de CI `ep01-account-provider` como job real: ejecuta las suites de backend y de app de este paquete con la traza caso-a-REQ, aplica los filtros de paths de docs y scripts pertinentes, y queda declarado en los `needs` del `quality-gate`. Sin pasos basados en `grep` como sustituto de test.
Contrato: rollback: Revertir el commit del workflow y quitar el `needs` agregado al quality-gate.. Status: pending

#### S6.T4 — Corregir los casos de test existentes que contradicen el contrato (201 en lugar de 202, estado `pendiente_validacion`, validacion de repeticion de contrasena en el servidor, afirmacion de que `emailNormalizado` nunca contiene texto legible) y ampliar los faltantes: preservacion de identidad/aceptaciones/consentimiento/usos, idempotencia del registro, registro sin sesion y sin conexion, tokens de verificacion con y sin bearer, desafio de uso unico, privilegios por rol, UI en ancho de telefono y de tablet, preservacion de datos al cerrar sesion.
Contrato: rollback: Revertir el commit de tests; las suites vuelven a su estado previo.. Status: pending

#### S6.T5 — Configurar y verificar el correo de staging con Mailjet real y el dominio con SPF, DKIM y DMARC; registrar la evidencia de una entrega real (message id y resultados de autenticacion) en `docs/development/release-runbook.md`. Si falta una credencial o un registro DNS, pausar registrando el bloqueo y el responsable: no simular el proveedor, no reemplazar por Mailpit y no marcar el criterio como probado.
Contrato: rollback: Revertir el commit de configuracion de staging; no se modifican registros DNS desde la ejecucion.. Status: pending

#### S6.T6 — Verificacion final posterior a todo el codigo, con items concretos y resultado explicito por item: (1) correo local por Mailpit e idempotencia de la cola; (2) entrega real en staging por Mailjet con SPF/DKIM/DMARC; (3) recorrido de app V-23/V-24/V-25/V-27 en smartphone y tablet con accesibilidad del mostrar u ocultar contrasena y del foco de error; (4) cierre de sesion con datos intactos; (5) acceso a Privacidad con cualquier tipo de cuenta, dejando constancia de que la revision de V-51 se verifica despues de TAO-188; (6) `ep01-account-provider` verde en CI remoto sobre el SHA integrado, con la traza casos-a-tests y el `quality-gate` en verde. Los pendientes humanos o externos se registran como pendientes, nunca como aprobados.
Contrato: rollback: No aplica: la verificacion no modifica codigo. Si un item falla, se registra el bloqueo con responsable y no se cierra el paquete.. Status: pending
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

## Sessions

### Session 1 · T0 · open

**Tasks:**
- [ ] S1.T1

**Gate (auto)**: El arbol de trabajo de epic/EP-01a queda limpio con el trabajo previo reconciliado e integrado: `git status` sin pendientes y el SHA base del paquete registrado por escrito en la sesion, listo para usarse como DOCS_DIFF_BASE y traza de CI. No hay codigo del paquete commiteado todavia.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Correo observable de punta a punta en local: al disparar el envio de prueba documentado, el mensaje con la plantilla del codigo de validacion aparece en la bandeja de Mailpit; procesar dos veces el mismo job de la cola deja un solo correo y el job agotado queda consultable. Tests del servicio y de la cola en verde (idempotencia, reintento 5xx, plantilla inexistente, agotamiento) y `docs/development/configuration.md` y `commands.md` con las variables y el comando de prueba, sin credenciales reales, con el lint de docs cambiados verde contra el SHA base.

### Session 3 · T3 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T1.1
- [ ] S3.T1.2
- [ ] S3.T1.3
- [ ] S3.T1.4
- [ ] S3.T1.5
- [ ] S3.T1.6
- [ ] S3.T1.7
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6
- [ ] S3.T7
- [ ] S3.T8
- [ ] S3.T9
- [ ] S3.T10
- [ ] S3.T10.1
- [ ] S3.T10.2
- [ ] S3.T10.3
- [ ] S3.T10.4
- [ ] S3.T10.5
- [ ] S3.T10.6
- [ ] S3.T11
- [ ] S3.T11.1
- [ ] S3.T11.2
- [ ] S3.T11.3
- [ ] S3.T11.4
- [ ] S3.T11.5
- [ ] S3.T11.6
- [ ] S3.T12
- [ ] S3.T13

**Gate (auto)**: Conversion a cuenta completa revisable de punta a punta: desde V-23 en la app se registra un correo y una contrasena, `POST /cuenta/registro` responde 202 con `RegistroCuentaRespuesta` y estado `pendiente_verificacion`, llega el codigo a Mailpit, y desde V-24 se valida el correo dejando la cuenta activa con el mismo id, usos, solicitudes, aceptaciones y consentimiento intactos. Se ve el error por campo con foco, el estado sin conexion, el reenvio sujeto a espera y el rechazo de `PUT /cuenta/correo` sobre cuenta activa. Suite de registro, validacion y privilegios de rol en verde, con el codigo OTP ausente de respuestas y logs.

### Session 4 · T2 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T1.1
- [ ] S4.T1.2
- [ ] S4.T1.3
- [ ] S4.T1.4
- [ ] S4.T1.5
- [ ] S4.T2
- [ ] S4.T3
- [ ] S4.T3.1
- [ ] S4.T3.2
- [ ] S4.T3.3
- [ ] S4.T3.4
- [ ] S4.T3.5
- [ ] S4.T3.6
- [ ] S4.T3.7
- [ ] S4.T3.8
- [ ] S4.T4
- [ ] S4.T5
- [ ] S4.T5.1
- [ ] S4.T5.2
- [ ] S4.T5.3
- [ ] S4.T6
- [ ] S4.T7

**Gate (auto)**: Inicio de sesion revisable de punta a punta: desde V-25 en la app, credenciales correctas devuelven sesion con el nivel autorizado y persisten tokens; contrasena incorrecta y correo inexistente devuelven la misma respuesta neutra; una cuenta con correo pendiente deriva a V-24 sin emitir sesion; al alcanzar el limite se ve el bloqueo, que sobrevive al reinicio del proceso y se reinicia tras un login exitoso. `Olvide mi contrasena` y `Tengo una invitacion` se ven como destinos no disponibles, sin pantallas simuladas. Suite de integracion de acceso (registro, validacion y login) y de privilegios de rol en verde.

### Session 5 · T2 · open

**Tasks:**
- [ ] S5.T1
- [ ] S5.T1.1
- [ ] S5.T1.2
- [ ] S5.T1.3
- [ ] S5.T2
- [ ] S5.T3
- [ ] S5.T4
- [ ] S5.T5
- [ ] S5.T5.1
- [ ] S5.T5.2
- [ ] S5.T5.3
- [ ] S5.T5.4
- [ ] S5.T5.5

**Gate (auto)**: Vista Cuenta revisable: V-27 muestra los tres estados (cuenta de dispositivo con la advertencia de perdida al reinstalar, correo pendiente con Ingresar/Reenviar codigo, cuenta completa con su correo), el bloque de acceso y seguridad hacia V-23/V-24/V-25, el acceso permanente a Privacidad y consentimientos en los tres estados, y Cerrar sesion con la advertencia explicita de que no borra datos. Tras cerrar sesion los datos locales siguen intactos y la app vuelve al modo sin sesion. Tests de los tres estados, del cierre de sesion y la regresion de que no se renderizan secciones fuera de HU-03b-11 en verde.

### Session 6 · T3 · open

**Tasks:**
- [ ] S6.T1
- [ ] S6.T1.1
- [ ] S6.T1.2
- [ ] S6.T1.3
- [ ] S6.T1.4
- [ ] S6.T1.5
- [ ] S6.T2
- [ ] S6.T3
- [ ] S6.T4
- [ ] S6.T5
- [ ] S6.T6

**Gate (auto)**: Evidencia y cierre: el job `ep01-account-provider` corre verde en CI remoto sobre el SHA integrado, ejecutando las suites reales de backend y app con la traza caso-a-REQ y declarado en los `needs` del quality-gate, que tambien queda verde. `configuration.md`, `commands.md` y `release-runbook.md` documentan configuracion, defaults de TTL/intentos/reenvio, comandos, evidencia de correo y rollback, con lint de docs cambiados verde contra el SHA base. La verificacion final deja resultado explicito por item (correo local, entrega real en staging con SPF/DKIM/DMARC, recorrido V-23/V-24/V-25/V-27 en telefono y tablet, cierre de sesion con datos intactos, acceso a Privacidad, CI verde); lo bloqueado o pendiente humano queda registrado como bloqueo con responsable, nunca como aprobado.

### Session 7 · T0 · open
