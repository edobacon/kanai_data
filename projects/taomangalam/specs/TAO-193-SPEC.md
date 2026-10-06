---
id: TAO-193-SPEC
project: taomangalam
ticket: TAO-193
status: draft
---

# Preparación M2 de EP-01: correo transaccional, conversión a cuenta completa, validación, inicio de sesión y vista Cuenta (HU-03b-11)

## Resumen ejecutivo

Qué se hace: la cadena HU-03b-01 → 03b-03 → 03b-04 → 03b-06 → 03b-11 para que TAO-188 tenga un acceso real desde Cuenta: EmailService agnóstico (Mailjet en staging, Mailpit en local) despachado por la cola pg-boss con reintentos idempotentes y plantillas por clave; registro/conversión (V-23), validación de correo y corrección del correo de entrada (V-24), inicio de sesión con bloqueo por fuerza bruta (V-25) preservando identidad, usos de producto y aceptaciones; y la vista Cuenta (V-27) con tipo de cuenta, estado local/pendiente/completo, acceso y seguridad, cierre de sesión sin borrar datos y acceso permanente a Privacidad y consentimientos con cualquier tipo de cuenta. Qué NO se hace: nada de EP-09 (incorporación de datos locales, respaldo, dispositivos, conflictos), ni borrado/eliminación de datos o cuenta, ni recuperación de contraseña (V-26), ni invitación (DEC-226), ni vinculación transaccional de HU-03b-07, ni siembra de perfiles (HU-03b-02), ni otras secciones de V-27; la revisión de V-51 la implementa TAO-188 y se verifica después. No se simulan proveedores ni se declaran pruebas manuales como aprobadas: sin configuración de correo de staging el ejecutor pausa con bloqueo y responsable. Cómo se sabe que funciona: check CI `ep01-account-provider` verde con los casos de este paquete trazados a tests; correo visible en Mailpit en local; POST de registro deja la cuenta `pendiente_validacion` conservando el id de cuenta de dispositivo; validación con código correcto deja la cuenta activa; login devuelve sesión y bloquea tras el límite; Cuenta renderiza los tres estados y el enlace a Privacidad con ambos tipos de cuenta. Tamaño: 4 sesiones (techo), 3 entregables.

Datos a confirmar antes de ejecutar:
- Credenciales y dominio de Mailjet en staging (API key/secret, remitente verificado, SPF/DKIM/DMARC): no están en el contexto; confirmar con el responsable de infraestructura antes de marcar el criterio de evidencia de staging. Sin eso, el ejecutor pausa ese criterio, no lo da por probado.
- SHA fijo de `epic/EP-01a` para `DOCS_DIFF_BASE`: se captura al primer arranque tras integrar el trabajo previo; no usar HEAD ni origin/main.
- Valores de caducidad y límite de intentos del código de validación, y umbral/ventana del bloqueo por fuerza bruta (DEC-163): V-24 declara explícitamente que no fija todavía sus valores técnicos; confirmar al aprobar el spec o dejarlos como constantes configurables documentadas.
- Nombre exacto del job/check CI `ep01-account-provider` dentro de `.github/workflows/ci-pr.yml` y si corre en PRs hacia `epic/**` (DEC-239 salta los jobs pesados en esa base).
- Versión de la dependencia del cliente Mailjet y del adaptador SMTP de Mailpit: no figuran en los extractos de `server/package.json`; tomar la versión fijada en el repo al instalar.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03b_cuenta_completa.md:41
> Necesidad: build
Existe un `EmailService` agnóstico del proveedor (interfaz + adaptadores Mailjet y SMTP/Mailpit) que envía por clave de plantilla, de modo que el resto del código no conoce al proveedor.

#### REQ-02 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:728
> Necesidad: build
Los correos se despachan por la cola pg-boss mediante un worker con reintentos y clave de idempotencia, de modo que un mismo envío encolado dos veces produce un solo correo entregado.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/product/vistas/V-23_crear_cuenta.md
> Necesidad: build
`POST /cuenta/registro` convierte la cuenta de dispositivo en cuenta completa pendiente de validación con correo normalizado/cifrado y contraseña argon2id, conservando el mismo id de cuenta, los usos de producto y las aceptaciones legales, y encola el correo con el código.

#### REQ-04 `confirmed`
> Fuente: taomangalam/docs/product/vistas/V-24_validar_correo.md
> Necesidad: build
`POST /cuenta/correo/verificacion` valida el código recibido y termina la conversión dejando la cuenta completa activa; el reenvío y `PUT /cuenta/correo` permiten reintentar sujetos a espera y límite de intentos.

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/product/vistas/V-25_iniciar_sesion.md
> Necesidad: build
`POST /auth/login` autentica una cuenta completa validada y devuelve sesión con el nivel autorizado; con correo pendiente indica que falta validar, y aplica bloqueo por fuerza bruta persistido con respuesta neutra ante credenciales inválidas.

#### REQ-06 `confirmed`
> Fuente: taomangalam/docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md
> Necesidad: build
La vista Cuenta (V-27, solo las secciones de HU-03b-11) muestra el tipo de cuenta y sus implicancias, los tres estados (dispositivo / pendiente de validación / completa), las acciones de acceso y seguridad hacia V-23/V-24/V-25, y cierra sesión con la advertencia explícita de que no borra datos.

#### REQ-07 `confirmed`
> Fuente: taomangalam/docs/product/vistas/V-27_cuenta_respaldo_y_dispositivos.md
> Necesidad: build
El acceso a `V-51 Privacidad y consentimientos` está presente de forma permanente en Cuenta con cualquier tipo de cuenta (dispositivo o completa); este paquete entrega solo el punto de entrada, no la vista destino.

#### REQ-08 `inferred`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:625
> Necesidad: build
El check CI `ep01-account-provider` ejecuta los casos de este paquete trazados a tests y falla si alguno de los REQ-01 a REQ-07 deja de cumplirse.

#### REQ-09 `confirmed`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6
> Necesidad: build
VARIANTE Docs de la superficie que cambia: la superficie operativa nueva queda documentada en los docs existentes del proyecto: correo/cola y configuración local Mailpit + staging Mailjet sin secretos en `docs/development/configuration.md`; comandos, plantillas y el check reproducible `ep01-account-provider` en `docs/development/commands.md`; evidencia de correo en staging (SPF/DKIM/DMARC) y rollback en `docs/development/release-runbook.md`.

#### REQ-10 `confirmed`
> Fuente: sonda:card-lint-de-docs-4d9deffd06
> Necesidad: build
VARIANTE Docs con lint en baseline: solo se normalizan al linter los documentos efectivamente modificados por este paquete, y el lint de docs corre con `DOCS_DIFF_BASE=<SHA fijo de epic/EP-01a>`, nunca contra HEAD de la rama viva ni contra origin/main.

#### REQ-11 `confirmed`
> Fuente: taomangalam/server/prisma/migrations/20260927223537_init/migration.sql
> Necesidad: build
VARIANTE Privilegios de rol: las tablas que este paquete crea o modifica (cuenta/credenciales, desafíos de validación, intentos de seguridad, cola) otorgan a `taomangalam_app` solo SELECT/INSERT/UPDATE donde hace falta, sin DELETE por defecto, y las aceptaciones/consentimientos quedan append-only con REVOKE explícito de UPDATE y DELETE; el DDL lo administra el rol migrador.

## Tasks

#### S1.T1 — Crear la interfaz `EmailService` agnóstica en `server/src` con el contrato `send({ templateKey, to, vars })`, el registro de plantillas por clave (al menos `cuenta.validacion`) y los dos adaptadores: SMTP hacia Mailpit para desarrollo y Mailjet para staging, seleccionados por variable de entorno. El proveedor por defecto en desarrollo es Mailpit (DEC-165 fija Mailjet como proveedor de staging/producción detrás de la interfaz). No hardcodear credenciales: leer API key y secret de entorno.
Contrato: rollback: Revertir el commit que agrega el módulo de correo y sus adaptadores; no hay cambios de schema ni de datos, el resto del servidor no lo importa todavía.. Status: pending

#### S1.T2 — Implementar el worker de correo sobre pg-boss con clave de idempotencia por envío (`singletonKey`), reintentos con backoff y timeout por job, procesando en lotes acotados con tamaño máximo configurable. Reusar la instancia de pg-boss ya existente del proyecto (la suite de integración ya corre pg-boss real, ver `.github/workflows/ci-pr.yml:728`); no crear una conexión paralela.
Contrato: rollback: Revertir el commit del worker y su registro en el arranque del servidor; la cola vuelve a su estado previo sin jobs de correo registrados.. Status: pending

#### S1.T3 — Documentar la superficie de correo en los docs existentes: variables de entorno del proveedor con ejemplo Mailpit y placeholders de Mailjet (sin secretos) en `docs/development/configuration.md`; comando para disparar un correo de prueba y para correr el check `ep01-account-provider` en `docs/development/commands.md`; evidencia de correo en staging con SPF/DKIM/DMARC y el rollback del paquete en `docs/development/release-runbook.md`. Normalizar al linter únicamente estos tres documentos.
Contrato: rollback: Revertir el commit de documentación; los tres archivos vuelven a su contenido anterior y el baseline de lint no cambia.. Status: pending

#### S1.T4 — Tests del paquete de correo: envío por clave de plantilla contra Mailpit, error de plantilla desconocida, idempotencia de la cola con la misma clave, reintento ante 5xx del adaptador, y el test de docs que falla si una variable de entorno de correo no está documentada o si aparece un patrón de credencial en los docs.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T1 — Migración Prisma con las tablas y columnas de este paquete: credenciales de cuenta (hash argon2id), correo normalizado y cifrado con índice único sobre la forma normalizada, desafíos de validación de correo (código, caducidad, intentos) e intentos de seguridad persistidos. Aplicar privilegios mínimos explícitos: `taomangalam_app` con SELECT/INSERT/UPDATE donde corresponde y sin DELETE; REVOKE explícito de UPDATE y DELETE sobre aceptaciones/consentimientos (append-only), porque las default privileges del init (`server/prisma/migrations/20260927223537_init/migration.sql`) otorgan escritura completa. El DDL corre con el rol migrador. Inspeccionar las tablas y roles reales antes de escribir los GRANT/REVOKE.
Contrato: rollback: Migración inversa que restituye los privilegios previos y elimina las tablas nuevas sin borrar filas de tablas preexistentes; verificar que el conteo de aceptaciones y de usos de producto es idéntico antes y después.. Status: pending
Subtasks: 7 (ejecutar hojas; el padre espera a todas)

#### S2.T1.1 — Inventariar el estado real antes de escribir DDL: listar las tablas de cuenta, usos de producto y aceptaciones/consentimientos que ya existen, los roles (`taomangalam_app`, rol migrador, rol de cola) y volcar `information_schema.role_table_grants` a un archivo de referencia fuera del repo para compararlo después. No asumir nombres a partir de la documentación.
Contrato: rollback: No aplica: la subtask solo lee el esquema y produce un archivo de referencia temporal fuera del repo.. Status: pending

#### S2.T1.2 — Modelar en `prisma/schema.prisma` las credenciales de cuenta (hash argon2id, parámetros de hashing, marca de actualización) y el correo de la cuenta en su forma normalizada y cifrada, con índice único sobre la forma normalizada. El texto plano no se almacena en ninguna columna.
Contrato: rollback: Revertir el cambio de schema; al no haber migración generada todavía, la base queda intacta.. Status: pending

#### S2.T1.3 — Modelar los desafíos de validación de correo (código, caducidad, contador de intentos, marca de consumo, referencia a la cuenta) y los intentos de seguridad persistidos para el bloqueo por fuerza bruta (cuenta, marca de tiempo, resultado), con los índices que necesitan las consultas por cuenta y ventana temporal.
Contrato: rollback: Revertir el cambio de schema; sin migración generada la base queda intacta.. Status: pending

#### S2.T1.4 — Generar la migración y agregar al SQL los GRANT mínimos para `taomangalam_app` sobre las tablas nuevas: SELECT/INSERT/UPDATE donde la operación lo exige y ningún DELETE. Usar los nombres reales de tablas y rol obtenidos en el inventario.
Contrato: rollback: Revertir el archivo de migración antes de aplicarlo; si ya se aplicó en local, correr la migración inversa de la subtask de rollback.. Status: pending

#### S2.T1.5 — Agregar al mismo SQL el REVOKE explícito de UPDATE y DELETE para `taomangalam_app` sobre las tablas de aceptaciones legales y consentimientos, dejándolas append-only (INSERT y SELECT), porque las default privileges del init otorgan escritura completa. Confirmar que el rol de cola conserva los privilegios que pg-boss necesita sobre su esquema.
Contrato: rollback: Revertir el bloque de REVOKE del archivo de migración; los privilegios vuelven a los del init.. Status: pending

#### S2.T1.6 — Escribir el SQL de migración inversa del paquete: restituye los privilegios previos registrados en el inventario y elimina solo las tablas nuevas, sin tocar filas de tablas preexistentes. Dejarlo versionado junto a la migración para que el rollback sea ejecutable y no improvisado.
Contrato: rollback: Revertir el archivo de rollback; la migración directa queda igual.. Status: pending

#### S2.T1.7 — Aplicar la migración en local con el rol migrador, volver a volcar `information_schema.role_table_grants` y comparar contra el inventario inicial: las únicas diferencias deben estar en las tablas nuevas y en el append-only de aceptaciones. Registrar el conteo de aceptaciones y de usos de producto antes y después.
Contrato: rollback: Correr la migración inversa versionada y volver a comparar los grants contra el inventario inicial.. Status: pending

#### S2.T2 — Implementar `POST /cuenta/registro` (V-23): validar correo y contraseña, normalizar y cifrar el correo, hashear con argon2id, convertir la cuenta de dispositivo existente en cuenta completa `pendiente_validacion` conservando el mismo id de cuenta, sus usos de producto y sus aceptaciones (no reescribir historiales), generar el desafío de validación y encolar el correo con el código. Respuesta neutra cuando el correo ya está asociado a una cuenta completa: ofrecer iniciar sesión o recuperar sin confirmar más información de la necesaria.
Contrato: rollback: Revertir el commit del endpoint y su ruta; la migración puede quedar porque las tablas vacías no afectan el comportamiento previo.. Status: pending
Subtasks: 6 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Esquema de validación de entrada del registro (correo con forma válida, contraseña con el mínimo definido, repetición que coincide) devolviendo 400 con el campo a corregir identificado, sin tocar la cuenta. Reusar el validador ya usado por las rutas existentes del servidor en vez de introducir uno nuevo.
Contrato: rollback: Revertir el commit del esquema; ninguna ruta lo consume todavía.. Status: pending

#### S2.T2.2 — Utilidades de correo: normalización (minúsculas, sin espacios) y cifrado para almacenamiento, más la derivación determinista que alimenta el índice único de la forma normalizada, de modo que `A@X.com` y `a@x.com` colisionen como el mismo correo. La clave de cifrado se lee de entorno, nunca hardcodeada.
Contrato: rollback: Revertir el commit de las utilidades; no hay datos escritos con ellas todavía.. Status: pending

#### S2.T2.3 — Módulo de contraseñas con argon2id: hash con parámetros configurables por entorno y verificación. El hash resultante conserva el prefijo `$argon2id$`.
Contrato: rollback: Revertir el commit del módulo; nadie lo consume todavía.. Status: pending

#### S2.T2.4 — Servicio de conversión de cuenta: toma la cuenta de dispositivo existente, le asocia credenciales y correo, y la deja `pendiente_validacion` conservando el mismo id de cuenta, sus usos de producto y sus aceptaciones. No reescribe ni reinserta historiales (las aceptaciones son append-only por la migración de S2.T1).
Contrato: rollback: Revertir el commit del servicio; las cuentas de dispositivo quedan como estaban.. Status: pending

#### S2.T2.5 — Generación del desafío de validación (código, caducidad, contador de intentos en cero) y encolado del correo `cuenta.validacion` reusando la cola de la sesión anterior, con clave de idempotencia por desafío para que un reintento del request no produzca dos correos.
Contrato: rollback: Revertir el commit; los desafíos ya generados quedan sin consumir y caducan solos.. Status: pending

#### S2.T2.6 — Ruta `POST /cuenta/registro` que compone lo anterior: 201 con el estado de la cuenta en el caso feliz, y respuesta neutra cuando el correo ya está asociado a una cuenta completa (ofrece iniciar sesión o recuperar, sin confirmar la existencia de la cuenta ni filtrar datos del titular ni variar el tiempo de respuesta de forma delatora).
Contrato: rollback: Revertir el commit de la ruta y su registro en el router; los servicios quedan sin consumidor HTTP.. Status: pending

#### S2.T3 — Implementar la validación de correo (V-24): `POST /cuenta/correo/verificacion` que consume el código y deja la cuenta activa preservando id y aceptaciones; reenvío con ventana de espera que invalida el código anterior; `PUT /cuenta/correo` que cambia el correo, vuelve a dejar la cuenta pendiente y encola un código nuevo. Aplicar caducidad y límite de intentos como constantes configurables documentadas: V-24 declara explícitamente que no fija todavía sus valores técnicos, así que no inventar números en el contrato público.
Contrato: rollback: Revertir el commit de los endpoints de validación y cambio de correo; las cuentas pendientes quedan en su estado, sin pérdida de datos.. Status: pending
Subtasks: 6 (ejecutar hojas; el padre espera a todas)

#### S2.T3.1 — Centralizar caducidad del código, límite de intentos y ventana de espera del reenvío como constantes configurables por entorno con valor por defecto, documentadas en `docs/development/configuration.md`. No exponer los números en el contrato público de la API: V-24 declara que todavía no los fija.
Contrato: rollback: Revertir el commit de constantes y su línea de documentación.. Status: pending

#### S2.T3.2 — Servicio de verificación del código: compara contra el desafío vigente, distingue código incorrecto (incrementa intentos, no cambia el estado), código caducado e intentos agotados (rechaza incluso un código correcto y exige reenvío), y en el caso feliz marca el correo validado y deja la cuenta `activa` conservando id y aceptaciones.
Contrato: rollback: Revertir el commit del servicio; los desafíos pendientes quedan sin consumir.. Status: pending

#### S2.T3.3 — Ruta `POST /cuenta/correo/verificacion` que expone el servicio con los errores diferenciados (código inválido, caducado, intentos agotados) y devuelve en el caso feliz el estado de cuenta que V-27 debe mostrar.
Contrato: rollback: Revertir el commit de la ruta; el servicio queda sin consumidor HTTP.. Status: pending

#### S2.T3.4 — Reenvío de código: dentro de la ventana de espera responde error de espera sin generar nada; pasada la ventana genera un desafío nuevo que invalida el anterior y lo encola al mismo correo.
Contrato: rollback: Revertir el commit del reenvío; el desafío original sigue siendo el vigente.. Status: pending

#### S2.T3.5 — `PUT /cuenta/correo`: valida y normaliza el correo nuevo, lo reemplaza, devuelve la cuenta a `pendiente_validacion`, invalida el desafío anterior y encola un código nuevo al correo corregido. Respuesta neutra si el correo nuevo ya pertenece a otra cuenta completa.
Contrato: rollback: Revertir el commit de la ruta; la cuenta conserva el correo previo y su desafío.. Status: pending

#### S2.T3.6 — Contrato de estado de cuenta compartido (tipo de cuenta, estado dispositivo/pendiente/completa, correo parcialmente oculto) que devuelven registro, verificación y cambio de correo, para que la vista Cuenta de la sesión siguiente consuma una sola forma y no reconstruya el estado por su cuenta.
Contrato: rollback: Revertir el commit del contrato y volver a las respuestas previas de cada ruta.. Status: pending

#### S2.T4 — Implementar `POST /auth/login` (V-25) con verificación argon2id, emisión de sesión con el nivel autorizado, respuesta diferenciada para cuenta con correo pendiente (sin emitir sesión, derivando a V-24), respuesta neutra idéntica para contraseña incorrecta y correo inexistente, y bloqueo por fuerza bruta persistido en base (DEC-163) que sobrevive al reinicio del proceso y se reinicia tras un login exitoso. No implementar la vinculación transaccional de la cuenta de dispositivo: eso es HU-03b-07, fuera de este paquete.
Contrato: rollback: Revertir el commit del endpoint de login; las cuentas y sus intentos registrados se conservan.. Status: pending
Subtasks: 5 (ejecutar hojas; el padre espera a todas)

#### S2.T4.1 — Búsqueda de cuenta por la forma normalizada del correo y verificación argon2id de la contraseña, reusando las utilidades de S2.T2. El camino de correo inexistente ejecuta igualmente una verificación señuelo para no delatar por tiempo de respuesta cuál de los dos campos falló.
Contrato: rollback: Revertir el commit; ninguna ruta lo consume todavía.. Status: pending

#### S2.T4.2 — Registro persistido de intentos fallidos y evaluación del bloqueo (DEC-163): umbral y ventana como constantes configurables documentadas, estado de bloqueo derivado de la tabla de intentos para que sobreviva al reinicio del proceso. Sin cache en memoria como única fuente.
Contrato: rollback: Revertir el commit; la tabla de intentos queda escrita pero sin lectores, no altera el comportamiento previo.. Status: pending

#### S2.T4.3 — Emisión de sesión con el nivel autorizado de la cuenta, reusando el mecanismo de sesión ya existente del servidor. No implementar la vinculación transaccional de la cuenta de dispositivo: eso es HU-03b-07, fuera de este paquete.
Contrato: rollback: Revertir el commit; el mecanismo de sesión vuelve a sus emisores previos.. Status: pending

#### S2.T4.4 — Ruta `POST /auth/login` que compone las ramas: 200 con sesión y nivel autorizado en el caso feliz; respuesta neutra idéntica para contraseña incorrecta y correo inexistente; estado `pendiente de validación` con la indicación de ir a V-24 sin emitir sesión; y respuesta de bloqueo que se impone incluso con credenciales correctas.
Contrato: rollback: Revertir el commit de la ruta y su registro en el router.. Status: pending

#### S2.T4.5 — Reinicio del contador de intentos fallidos de la cuenta tras un login exitoso, en la misma transacción que la emisión de sesión para que un fallo parcial no deje la cuenta bloqueada por un acceso válido.
Contrato: rollback: Revertir el commit; el contador deja de reiniciarse y los intentos caducan solo por ventana.. Status: pending

#### S2.T5 — Tests de integración del acceso: registro feliz conservando id/usos/aceptaciones, correo ya asociado con respuesta neutra, contraseña bajo el mínimo, correo normalizado y cifrado, hash con prefijo argon2id; validación con código correcto, incorrecto, caducado, intentos agotados y cambio de correo; login feliz, neutro ante credenciales inválidas, bloqueo persistido tras reinicio, pendiente de validación y reinicio de contador; y los tests de privilegios de rol (DELETE denegado a `taomangalam_app`, aceptaciones append-only, comparación de `role_table_grants` antes y después).
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending
Subtasks: 8 (ejecutar hojas; el padre espera a todas)

#### S2.T5.1 — Utilidades de prueba del paquete: fixture de cuenta de dispositivo con usos de producto y aceptaciones previas, helper de lectura de la bandeja de Mailpit para extraer el código del correo, y helper de conexión como `taomangalam_app` (distinto del rol migrador) para los tests de privilegios.
Contrato: rollback: Revertir el commit de los helpers; ningún test los consume todavía.. Status: pending

#### S2.T5.2 — Tests de `POST /cuenta/registro`: caso feliz 201 con cuenta `pendiente_validacion`, mismo `cuentaId` y usos y aceptaciones intactos más el correo en Mailpit; correo ya asociado con respuesta neutra que no confirma la existencia; contraseña bajo el mínimo y repetición que no coincide con 400 y sin modificar la cuenta.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.3 — Tests de almacenamiento del registro: la columna de correo no contiene el texto plano, `A@X.com` y `a@x.com` colisionan como el mismo correo contra el índice único, y el hash de contraseña tiene prefijo `$argon2id$` verificando la contraseña correcta y rechazando una distinta.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.4 — Tests de validación de correo: código correcto deja la cuenta `activa` conservando id y aceptaciones y devuelve el estado que V-27 muestra; código incorrecto incrementa intentos sin cambiar el estado; código caducado se rechaza; intentos agotados rechazan incluso un código correcto; reenvío dentro de la ventana responde espera y fuera de la ventana invalida el anterior; `PUT /cuenta/correo` vuelve a pendiente con código nuevo al correo corregido.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.5 — Tests de `POST /auth/login`: caso feliz con sesión y nivel autorizado; contraseña incorrecta y correo inexistente con respuesta idéntica; cuenta con correo pendiente sin sesión y derivando a V-24; y reinicio del contador de intentos tras un login exitoso.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.6 — Test del bloqueo por fuerza bruta persistido: superado el umbral la cuenta queda bloqueada y un login con credenciales correctas responde bloqueo; tras reconstruir la instancia del servidor (simulando el reinicio del proceso) el bloqueo sigue vigente porque vive en la base.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.7 — Tests de privilegios de rol conectados como `taomangalam_app`: INSERT y UPDATE exitosos sobre desafíos de validación y DELETE rechazado por permiso; UPDATE y DELETE rechazados sobre aceptaciones legales con el INSERT todavía permitido; y el worker de correo arrancando sin error de permisos sobre el esquema de la cola.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S2.T5.8 — Test de regresión de la migración: comparar `information_schema.role_table_grants` antes y después de aplicar la migración mostrando diferencias solo en las tablas nuevas y en el append-only de aceptaciones, y correr la migración inversa comprobando que el conteo de aceptaciones y de usos de producto es idéntico antes y después.
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S3.T1 — Implementar `POST /auth/logout`: cierra la sesión de la cuenta sin tocar ningún dato de la cuenta ni del dispositivo. El endpoint es idempotente: cerrar una sesión ya cerrada responde éxito.
Contrato: rollback: Revertir el commit del endpoint; las sesiones existentes siguen siendo válidas como antes.. Status: pending

#### S3.T2 — Construir la vista Cuenta (V-27) con exclusivamente las secciones de HU-03b-11, reusando los componentes y el estilo ya existentes de la app: tipo de cuenta (de dispositivo o completa, con el correo como identidad visible y sin nombre de cuenta, DEC-217), estado con cuenta de dispositivo (explicación de que registrarse es gratuito, advertencia de pérdida al reinstalar, accesos `Registrarme` → V-23 e `Iniciar sesión` → V-25), estado pendiente de validación (correo parcialmente oculto, `Correo pendiente de validar`, `Ingresar código`/`Reenviar código` → V-24, corregir correo), y Acceso y seguridad con `Cerrar sesión` y su advertencia de que no borra datos. No renderizar respaldo, dispositivos, conflictos, borrado ni eliminación: están fuera del alcance de este paquete.
Contrato: rollback: Revertir el commit de la vista y su ruta de navegación; la app vuelve al estado anterior sin pantalla Cuenta nueva.. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S3.T2.1 — Sección de tipo de cuenta y estado con cuenta de dispositivo: tipo, qué implica, advertencia de pérdida al reinstalar sin cuenta completa, y los accesos `Registrarme` (V-23) e `Iniciar sesión` (V-25). Si todavía no hubo conexión, indicar que la cuenta de dispositivo se creará cuando haya red.
Contrato: rollback: Revertir el commit de esta sección; el resto de la vista sigue compilando porque las secciones se componen de forma independiente.. Status: pending

#### S3.T2.2 — Sección de estado pendiente de validación: correo parcialmente oculto, etiqueta `Correo pendiente de validar`, accesos `Ingresar código` y `Reenviar código` hacia V-24 y la acción de corregir el correo.
Contrato: rollback: Revertir el commit de esta sección; la vista conserva las demás secciones.. Status: pending

#### S3.T2.3 — Sección Acceso y seguridad con cuenta completa: correo como identidad visible, accesos a validar correo e iniciar sesión según estado, y `Cerrar sesión` conectado a `POST /auth/logout` con la advertencia explícita de que no borra datos antes de confirmar.
Contrato: rollback: Revertir el commit de esta sección; el endpoint de logout queda sin consumidor en la UI pero no rompe nada.. Status: pending

#### S3.T3 — Agregar el acceso permanente a `V-51 Privacidad y consentimientos` en Cuenta, visible y habilitado con cualquier tipo de cuenta (dispositivo, pendiente y completa), sin condicionarlo a ninguna capacidad gateable. Este paquete entrega solo el punto de entrada y la ruta: la vista V-51 y su revisión las implementa TAO-188.
Contrato: rollback: Revertir el commit que agrega el acceso; Cuenta queda sin el enlace y ninguna otra sección depende de él.. Status: pending

#### S3.T4 — Tests de la vista Cuenta: los tres estados con sus textos y acciones, cierre de sesión con advertencia y datos locales intactos tras cerrarla, acceso a Privacidad visible en los tres estados y no gateable, y la regresión de que no se renderizan secciones fuera de HU-03b-11 (respaldo, dispositivos, conflictos, borrado, eliminación).
Contrato: rollback: Revertir el commit de tests; no toca código de producción.. Status: pending

#### S4.T1 — Agregar el job `ep01-account-provider` a `.github/workflows/ci-pr.yml` siguiendo el patrón del job `integration` existente (líneas 625-749): Postgres 18 fijado por digest compartido con `compose.yaml` (DEC-198), creación de bases y roles desde `infra/postgres/init`, migraciones con el rol migrador y ejecución de la suite de este paquete. Agregar Mailpit como service para el adaptador local. No usar `secrets`: el job corre con el adaptador Mailpit, nunca con credenciales de Mailjet. Declarar el filtro de rutas para que corra solo cuando el PR toca `server/` o `app/`, y respetar DEC-239 sobre PRs hacia `epic/**`.
Contrato: rollback: Revertir el commit del workflow; CI vuelve a su conjunto de jobs anterior sin afectar a los existentes.. Status: pending

#### S4.T2 — Capturar el SHA fijo de `epic/EP-01a` tras integrar el trabajo previo y correr el lint de docs con `DOCS_DIFF_BASE=<SHA capturado>` sobre los documentos efectivamente modificados por este paquete, normalizándolos al linter. No usar HEAD de la rama viva ni `origin/main` como base, y no normalizar documentos solo citados por el request. Dejar el SHA registrado en la sesión para que la corrida sea reproducible.
Contrato: rollback: Revertir el commit de normalización de los documentos tocados; `.docs-baseline.txt` conserva sus entradas sin pérdida.. Status: pending

#### S4.T3 — Tests y regresión del paquete: verificar que el job nuevo falla cuando se rompe deliberadamente la idempotencia de la cola (test de REQ-02 identificado por nombre), que el comando documentado en `docs/development/commands.md` reproduce el check localmente tal cual está escrito, que el lint de docs falla si un documento modificado no está normalizado, y que los jobs `integration` y de cobertura backend siguen verdes sin duplicar trabajo.
Contrato: rollback: Revertir el commit de tests y del script de reproducción local; el workflow queda sin cobertura propia pero funcional.. Status: pending
