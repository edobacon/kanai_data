---
id: TAO-247-SPEC
project: taomangalam
ticket: TAO-247
status: draft
---

# TAO-247 · Línea base HTTP, límite general y estricto, y alta pública con límite persistente por IP, código y cuenta con respuesta genérica

## Resumen ejecutivo

Se hace: línea base HTTP del servidor (helmet con HSTS, CORS por allowlist vacía en M1a, trust proxy de Railway, límite general en memoria de 100/min por IP y límite estricto para operaciones x-rate-limit: estricto), seudonimización de IP para logs. También la tabla intento_seguridad con límites persistentes del alta (5/h por IP, 3/h por código, bloqueo de 15 min), respuesta 429 genérica que no revela si el código tenía cuenta, y un mecanismo reutilizable por cuenta. Todos los umbrales son claves de configuración leídas en cada evaluación.
No se hace: verificación de integridad (HU-03a-17), fuerza bruta de login y recuperación (EP-03b), límite de validación de códigos de producto (EP-11 solo reutiliza el mecanismo), store distribuido (DEC-195), verificación en staging real (Adenda 1: queda pendiente y no bloquea).
Cómo se sabe que funciona: Supertest con PostgreSQL efímero muestra cabeceras helmet/HSTS, ausencia de CORS para origen no permitido, 429 limite_frecuencia con Retry-After en la petición 101, en la sexta alta por IP y en la cuarta por código, el bloqueo sobrevive al reinicio del proceso, el cuerpo del 429 es idéntico con código con y sin cuenta, y los privilegios del rol taomangalam_app no incluyen DELETE. Evidencia local de QA-03a-05-01 a 06.
Tamaño: 3 sesiones (T2, T3, T1), 8 puntos.
ADVERTENCIAS (fuera de alcance, no son requirements): (1) leer el umbral del límite general desde la base en cada petición agrega una consulta por request; el request lo pide así (sin caché) y una caché sería alcance nuevo. (2) El límite general alcanzaría también los health checks de Railway si los hay; confirmar si se excluyen. (3) El 401 credencial_dispositivo_invalida fuera de abuso sigue distinguiendo por código; el request solo exige genericidad ante abuso, y unificar ese 401 sería alcance extra.
Datos a confirmar antes de ejecutar: (a) nombres exactos de las claves de configuración (límite general, estricto, alta por IP, alta por código, duración del bloqueo, umbral por cuenta) y el mecanismo de siembra de HU-03a-02 (issue #90) en configuracion_clave: confirmar que ya está en main, porque bloquea esta historia. (b) Valor por defecto del límite estricto para x-rate-limit: estricto: el request no lo fija; confirmar en DEC-163/DEC-233. (c) Ruta real de redaccion.ts y del manejador de errores con AppError.retryAfterSegundos dentro de server/src. (d) Runner y convención de ubicación de tests del server (vitest/jest, carpeta) y el helper de PostgreSQL efímero existente; los comandos verify asumen `pnpm -C server test -- <archivo>`. (e) Secreto o sal para la seudonimización de IP (variable de entorno). (f) Si los intentos fallidos del alta cuentan para el límite (se asume que cuenta todo intento a POST /auth/dispositivo). (g) Origen de la allowlist de CORS por entorno: variable de entorno o clave de configuración.

## Requirements

### REQ-01 `confirmed`
> Fuente: request:Criterios de aceptación HU-03a-05

Toda respuesta del API incluye las cabeceras de seguridad de helmet y Strict-Transport-Security (DEC-162).

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:111

CORS por allowlist de orígenes por entorno, vacía en M1a: un origen web no permitido no recibe cabeceras CORS de permiso (DEC-162, DEC-163).

### REQ-03 `confirmed`
> Fuente: Adenda 7 (decisión del dev, TAO-247-Q11: trust proxy = 1)

Límite general en memoria por IP real tras el proxy de Railway con trust proxy fijado en 1 (un salto), por defecto 100 peticiones por minuto (DEC-233), con umbral leído de una clave de configuración en cada evaluación; un cliente no puede falsear su IP con una cabecera X-Forwarded-For adicional. Al superarlo responde 429 con codigo limite_frecuencia, reintentarDespuesSegundos y cabecera Retry-After en segundos enteros. El límite general no se monta sobre POST /auth/dispositivo (ver REQ-16).

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:122

Límite estricto aplicado a las operaciones con x-rate-limit: estricto del contrato, con umbral por clave de configuración, que responde 429 limite_frecuencia con Retry-After (DEC-163).

### REQ-05 `confirmed`
> Fuente: request:Adenda 6 correcciones 3

Función de seudonimización de IP reutilizable y registro de cada rechazo por límite como warn con errorCode, muestreado con una fuente aleatoria inyectable (determinista en test) cuya tasa se lee de la clave de muestreo, con IP y sujeto seudónimos y sin secreto ni código de dispositivo completo.

### REQ-10 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

docs/development/configuration.md documenta las tres claves de configuración de este ticket con sus nombres exactos y prefijo común (límite general 100/min por IP, límite estricto 10/min por IP provisional, muestreo de logs warn de rechazo 0.1), con valor por defecto y cómo cambiarlas sin desplegar; documenta también las variables de entorno IP_HASH_SALT (sal de IP, obligatoria en producción) y CORS_ALLOWED_ORIGINS (allowlist de CORS, vacía en M1a). Si release-runbook.md menciona los límites, enlaza a esa sección. Las claves del alta persistente y de la validación por cuenta las agrega TAO-274.

### REQ-12 `confirmed` `enforcement`
> Fuente: Adenda 5 (corte a HU-03a-05) y código existente: error-handler.ts, AppError.retryAfterSegundos

Reuso obligatorio: todo 429 del límite general y del estricto sale por el manejador de errores existente (server/src/middleware/error-handler.ts) con AppError.retryAfterSegundos y conserva el contrato que consume la app: campo codigo = 'limite_frecuencia' en problem+json y Retry-After en segundos enteros. Sin persistencia ni uso de intento_login en este ticket.

### REQ-13 `confirmed`
> Fuente: Adenda 5 (a) y Adenda 2 Q1, Q2, Q3

Se siembran solo tres claves en configuracion_clave, todas con un prefijo común derivado de la convención existente del catálogo (HU-03a-02): límite general (100/min por IP), límite estricto (10/min por IP, valor provisional) y muestreo de logs warn de rechazo (0.1, 1 de cada 10). Se siembran con su valor por defecto en un único seed (S1.T5, un solo seed_catalog) sin migración ni tablas nuevas; el resto del código consume constantes con los nombres, no literales. Se leen de configuración en cada evaluación. Si una clave falta o su valor no es numérico, se usa el valor por defecto y se registra un warn. Las claves del alta persistente las siembra TAO-274.

### REQ-14 `confirmed`
> Fuente: request:Adenda 6 correcciones 2

La sal para seudonimizar la IP se lee de la variable de entorno IP_HASH_SALT (constante única de REQ-21); en producción, si falta, el servidor falla al arrancar con error explícito; en desarrollo y test se usa un valor fijo documentado. La función de seudonimización es reutilizable por TAO-274 (que la usará para intento_seguridad), pero en este ticket se usa y se prueba solo en los logs de rechazo por límite, sin exigir consumidor adicional.

### REQ-16 `confirmed`
> Fuente: Adenda 5 (b) y Adenda 4 Q10

El limitador general en memoria se excluye de POST /auth/dispositivo con skip por método y ruta; esa ruta queda cubierta por el limitador estricto en memoria (10/min por IP, clave de configuración). El orden persistente-primero lo implementa TAO-274, y este ticket deja el montaje de modo que TAO-274 pueda anteponer su evaluación sin retocar estos limitadores. El test de 100 peticiones y 429 en la 101 usa una ruta pública sin x-rate-limit estricto.

### REQ-17 `confirmed`
> Fuente: Adenda 2 (Q7)

La allowlist de CORS se lee de una variable de entorno por ambiente (lista de orígenes separados por coma); vacía o ausente significa ningún origen permitido, que es el valor en M1a.

### REQ-18 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:122

Las operaciones con x-rate-limit: estricto se identifican a partir del contrato OpenAPI (o, si no es viable, de una lista explícita única en código verificada por test contra el contrato), de modo que ninguna operación marcada quede sin límite estricto.

### REQ-19 `confirmed` `enforcement`
> Fuente: server/src/middleware/error-handler.ts

express-rate-limit se configura con las cabeceras propias desactivadas (legacyHeaders y standardHeaders en false) y su handler delega en el manejador de errores problem+json (server/src/middleware/error-handler.ts) mediante AppError.retryAfterSegundos, para que Retry-After salga solo del manejador.

### REQ-21 `confirmed` `enforcement`
> Fuente: Adenda 3 (nombres de variables de entorno como constante única documentada)

Los nombres de las variables de entorno de la sal de IP y de la allowlist de CORS se definen como constante única exportada desde un solo módulo, documentados en docs/development/configuration.md; el código y los tests importan esa constante y no repiten el literal.

### REQ-22 `confirmed` `variant`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145

Este ticket no crea tablas ni migraciones y no altera privilegios de roles: la siembra de las tres claves solo inserta filas en configuracion_clave, que conserva los privilegios existentes para taomangalam_app y taomangalam_readonly. Los privilegios de intento_seguridad (REVOKE DELETE, GRANT SELECT, INSERT, UPDATE) son de TAO-274.
## Tasks

#### S1.T1 — Instalar express-rate-limit, helmet y cors una sola vez con `pnpm -C server add express-rate-limit helmet cors` (versiones en package.json y pnpm-lock.yaml, sin probar otras). Configurar express-rate-limit con legacyHeaders:false y standardHeaders:false, y un handler que delegue en el manejador de errores problem+json lanzando AppError con retryAfterSegundos y codigo limite_frecuencia, de modo que Retry-After salga solo del manejador (REQ-19). Absorbe lo que era S2.T4.
Contrato: rollback: Revertir package.json y pnpm-lock.yaml del server y la configuración base del limitador.. Status: pending

#### S1.T2 — Helper de log muestreado para rechazos por límite: emite warn con errorCode, IP y sujeto ya seudonimizados y sin secreto ni código de dispositivo completo, con tasa de muestreo leída de la clave de configuración (0.1 por defecto). No contiene la función de seudonimización de IP: esa vive solo en S1.T6.
Contrato: rollback: Eliminar el helper y sus llamadas.. Status: pending

#### S1.T3 — Montar helmet con HSTS, CORS por allowlist leída de CORS_ALLOWED_ORIGINS (constante única, vacía en M1a), trust proxy para la IP real tras Railway, limitador general en memoria (100/min por IP, umbral leído de configuración en cada evaluación) con skip por método y ruta para POST /auth/dispositivo, y limitador estricto en memoria (10/min) aplicado a las operaciones x-rate-limit estricto. Consumir las constantes de claves de S1.T5 sin literales. El orden persistente-primero de POST /auth/dispositivo lo implementa TAO-274; aquí el estricto cubre esa ruta.
Contrato: rollback: Revertir el commit del montaje de middlewares; las rutas vuelven a responder sin cabeceras de helmet, sin CORS y sin límites en memoria.. Status: pending

#### S1.T4 — Escribir los tests Supertest de la sesión 1: cabeceras helmet y HSTS, CORS sin permiso para origen no permitido, 429 en la petición 101 sobre una ruta pública sin x-rate-limit estricto, cambio de la clave general sin reiniciar, límite estricto en una operación estricta, exclusión del limitador general en POST /auth/dispositivo (cubierto por el estricto), identificación de operaciones estrictas desde el contrato, y express-rate-limit sin cabeceras propias con 429 por el manejador. Sin tests del límite persistente del alta (son de TAO-274).
Contrato: rollback: Eliminar los archivos de test agregados en esta task; no afecta código de producción.. Status: pending

#### S1.T5 — Sembrar en un único seed (un solo seed_catalog, sin migración ni tablas) solo 3 claves en configuracion_clave con prefijo común derivado de la convención del catálogo de HU-03a-02: límite general 100/min por IP, límite estricto 10/min por IP (provisional) y muestreo de logs warn de rechazo 0.1. Exportar constantes con los nombres para que el resto del código no use literales. Las 4 claves del alta persistente las siembra TAO-274. Clave faltante o no numérica usa el valor por defecto con warn (REQ-13).
Contrato: rollback: Revertir el commit del seed y borrar las 3 filas sembradas de configuracion_clave; no hay migración ni tablas que revertir.. Status: pending

#### S1.T6 — Implementar una única función de seudonimización de IP (HMAC con la sal leída de IP_HASH_SALT, constante única de REQ-21), diseñada como reutilizable por TAO-274 pero usada en este ticket solo en los logs de rechazo por límite. En producción falla al arrancar si falta la sal; en development y test usa un valor fijo documentado. No agrega consumidores fuera de los logs de este ticket.
Contrato: rollback: Revertir el commit que agrega la función y su validación de arranque; los logs vuelven a no emitir IP seudonimizada.. Status: pending

#### S3.T2 — Ejecutar localmente (servidor local con PostgreSQL efímero, según Adenda 1) las verificaciones QA-03a-05-05 (101 peticiones desde una IP en un minuto sobre una ruta pública sin x-rate-limit estricto, la 101 responde 429 limite_frecuencia) y QA-03a-05-06 (inspección de cabeceras de helmet y HSTS en una respuesta real local), y guardar la evidencia (salidas de los scripts y cabeceras capturadas) en docs/evidence/TAO-247/. La verificación en staging real queda como prueba de integración pendiente y no bloquea el cierre.
Contrato: rollback: Eliminar docs/evidence/TAO-247/; no afecta código ni datos.. Status: pending

#### S3.T4 — Redactar docs/development/configuration.md con las tres claves de configuración de este ticket (nombres exactos con prefijo común, valores por defecto 100/min, 10/min provisional y 0.1, y cómo cambiarlas sin desplegar) y las variables IP_HASH_SALT (obligatoria en producción) y CORS_ALLOWED_ORIGINS (vacía en M1a); enlazar desde release-runbook.md solo si este menciona los límites. Escribir su test de documentación, que lee el archivo y falla si falta alguna clave o variable, e importa los nombres desde la constante única de REQ-21. No incluye evidencia local ni verificaciones con acceso externo.
Contrato: rollback: Revertir docs/development/configuration.md, el enlace en release-runbook.md si se agregó y el archivo de test de documentación.. Status: pending

#### S3.T5 — Agregar test del caso REQ-13 en server/test/config/umbrales-configuracion.test.ts: con una clave faltante en configuracion_clave y con una clave de valor no numérico ('abc'), la lectura del umbral devuelve el valor por defecto de la constante y emite un warn con el nombre de la clave. Importar las constantes de claves; no repetir literales.
Contrato: rollback: Eliminar server/test/config/umbrales-configuracion.test.ts.. Status: pending

#### S3.T6 — Escribir el archivo de prueba server/test/db/sin-migracion-tao247.test.ts que valida REQ-22: (a) no existe migración nueva en server/prisma/migrations posterior a la última de la línea base (20261008140000) atribuible a este ticket; (b) ninguna migración contiene CREATE TABLE intento_seguridad; (c) los privilegios de taomangalam_app y taomangalam_readonly sobre configuracion_clave son idénticos antes y después de correr el seed de las tres claves (consulta a information_schema.role_table_grants con PostgreSQL efímero). No modifica tests existentes.
Contrato: rollback: Eliminar server/test/db/sin-migracion-tao247.test.ts; no hay cambios de datos ni de código de producción.. Status: pending
## Cambios al modelo de datos

- tipo: create | objetos: intento_seguridad | destructivo: no | tarea: S2.T1 | rollback: Aplicar down.sql de la migración (DROP TABLE intento_seguridad); según el rollback del handoff, en producción se preserva la tabla y solo se redespliega el SHA anterior.
- tipo: seed_rbac | objetos: intento_seguridad, taomangalam_app, taomangalam_readonly | destructivo: no | tarea: S2.T1 | rollback: Los grants desaparecen con el DROP TABLE de down.sql; no se tocan privilegios de otras tablas.
- tipo: seed_catalog | objetos: configuracion_clave | destructivo: no | tarea: S1.T3 | rollback: Borrar las filas de las claves del límite general y del estricto sembradas con el mecanismo de HU-03a-02; el código usa el valor por defecto si la clave falta.
- tipo: seed_catalog | objetos: configuracion_clave | destructivo: no | tarea: S2.T2 | rollback: Borrar las filas de las claves del alta por IP, por código, de duración del bloqueo y del umbral por cuenta sembradas con el mecanismo de HU-03a-02.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-13 (add) `confirmed`: Claves de configuración con nombres fijados en configuracion_clave, todas con un prefijo común derivado de la convención existente del catál
- REQ-14 (add) `confirmed`: La sal para seudonimizar la IP se lee de una variable de entorno; en producción, si falta, el servidor falla al arrancar con error explícito
- REQ-15 (add) `confirmed`: Cuando vence un bloqueo, el siguiente intento reinicia el contador y la ventana del sujeto en intento_seguridad (empieza una ventana nueva c
- REQ-16 (add) `confirmed`: Orden de evaluación en POST /auth/dispositivo: primero el límite persistente del alta (intento_seguridad) y después el límite general en mem
- REQ-17 (add) `confirmed`: La allowlist de CORS se lee de una variable de entorno por ambiente (lista de orígenes separados por coma); vacía o ausente significa ningún
- REQ-18 (add) `confirmed`: Las operaciones con x-rate-limit: estricto se identifican a partir del contrato OpenAPI (o, si no es viable, de una lista explícita única en
- REQ-19 (add) `confirmed`: express-rate-limit se configura con las cabeceras propias desactivadas (legacyHeaders y standardHeaders en false) y su handler delega en el 
- REQ-20 (add) `confirmed`: Los tests de límite del alta por IP usan cinco códigos de dispositivo distintos para las 5 altas permitidas, de modo que el límite por códig
- REQ-10 (edit) `confirmed`: docs/development/configuration.md documenta las siete claves de configuración con sus nombres exactos y prefijo común (límite general, estri
- REQ-11 (edit) `confirmed`: intento_seguridad copia los privilegios de intento_login (migración 20261008140000): REVOKE DELETE FROM taomangalam_app; GRANT SELECT, INSER
- REQ-06 (edit) `confirmed`: Tabla intento_seguridad (operación, sujeto seudónimo, IP seudónima, resultado, contador, ventana, bloqueo_hasta) creada por migración Prisma

**Tasks agregadas:**

- S1: Fijar y sembrar las siete claves de configuración en configuracion_clave con el prefijo común derivado de la convención existente del catálogo de HU-03a-02: límite general 100/min, límite estricto 10/min (provisional), alta por IP 5/h, alta por código 3/h, bloqueo 15 min, validación por cuenta 10/h, muestreo de logs 0.1. Exponer constantes con los nombres exactos y un lector que consulta la base en cada evaluación. (valida: REQ-13; rollback: Revertir el commit y borrar las claves sembradas con la migración o seed inverso.)
- S1: Implementar la función de seudonimización de IP con la sal leída de una variable de entorno; en producción, si falta la variable, fallar al arrancar con error explícito; en desarrollo y test usar un valor fijo documentado. Reutilizarla en logs e intento_seguridad. (valida: REQ-14, REQ-05; rollback: Revertir el commit; los logs vuelven a no registrar IP.)
- S2: Configurar express-rate-limit con legacyHeaders: false y standardHeaders: false y un handler que lance AppError con retryAfterSegundos para que el manejador problem+json emita Retry-After. Leer la allowlist de CORS de una variable de entorno (lista separada por comas, vacía por defecto). Identificar las operaciones x-rate-limit: estricto leyendo el contrato OpenAPI, o con una lista explícita única verificada por test contra el contrato. (valida: REQ-17, REQ-18, REQ-19; rollback: Revertir el commit; se retira el middleware y el servidor vuelve al comportamiento previo.)
- S2: Ordenar la evaluación en POST /auth/dispositivo: límite persistente del alta (intento_seguridad) antes del límite general en memoria. Al vencer un bloqueo, reiniciar contador y ventana del sujeto. Escribir los tests: la sexta alta por IP usa cinco códigos distintos en las cinco primeras y el umbral en memoria se eleva en los tests para aislarlo; cubrir también el vencimiento con reloj falso y el reinicio de contador y ventana. (valida: REQ-15, REQ-16, REQ-20, test; rollback: Revertir el commit y los tests asociados.)
- S3: Actualizar docs/development/configuration.md con las siete claves (nombres exactos, valor por defecto, cómo cambiarlas sin desplegar), la variable de sal de IP (obligatoria en producción), la variable de la allowlist de CORS (vacía en M1a) y enlazar desde release-runbook.md si menciona los límites. Verificar con test o grep que la migración de intento_seguridad conserva REVOKE DELETE y los GRANT de intento_login y que down.sql los revierte. (valida: REQ-10, REQ-11; rollback: Revertir el commit de documentación.)

### Enmienda 2
**REQs:**

- REQ-16 (edit) `confirmed`: Orden de evaluación en POST /auth/dispositivo: primero el límite persistente del alta (intento_seguridad) y después el límite general en mem
- REQ-13 (edit) `confirmed`: Claves de configuración con nombres fijados en configuracion_clave, todas con un prefijo común derivado de la convención existente del catál
- REQ-21 (add) `confirmed`: Los nombres de las variables de entorno de la sal de IP y de la allowlist de CORS se definen como constante única exportada desde un solo mó
- REQ-22 (add) `confirmed`: Docs de la superficie operativa: docs/development/configuration.md documenta las claves de umbral, la duración del bloqueo, la sal de IP y l
- REQ-23 (add) `confirmed`: Privilegios de rol: intento_seguridad copia el precedente de intento_login (migración 20261008140000): REVOKE DELETE FROM taomangalam_app; G

**Tasks agregadas:**

- S3: Agregar test del caso REQ-13 en server/test/config/umbrales-configuracion.test.ts: con una clave faltante en configuracion_clave y con una clave de valor no numérico ('abc'), la lectura del umbral devuelve el valor por defecto de la constante y emite un warn con el nombre de la clave. Importar las constantes de claves; no repetir literales. (valida: REQ-13, test; rollback: Eliminar server/test/config/umbrales-configuracion.test.ts.)

**Task ops:**

- delete S2.T4
- edit S1.T1 { desc="Instalar express-rate-limit, helmet y cors una sola vez con `pnpm -C server add express-rate-limit helmet cors` (versiones en package.json y pnpm-lock.yaml, sin probar otras). Configurar express-rate-limit con legacyHeaders:false y standardHeaders:false, y un handler que delegue en el manejador de errores problem+json lanzando AppError con retryAfterSegundos y codigo limite_frecuencia, de modo que Retry-After salga solo del manejador (REQ-19). Absorbe lo que era S2.T4.", rollback="Revertir package.json y pnpm-lock.yaml del server y la configuración base del limitador.", validates=["REQ-04","REQ-19"], verify=["pnpm -C server test -- test/http/limitador-handler.test.ts"] }
- edit S1.T3 { desc="Montar helmet con HSTS, CORS por allowlist leída de la variable de entorno cuyo nombre es la constante única de REQ-21 (lista separada por comas; vacía o ausente significa ningún origen, valor en M1a), trust proxy para Railway, y el limitador general por IP con umbral leído de configuración en cada evaluación mediante la constante de clave (sin sembrarla aquí: la siembra es solo de S1.T5). Excluir explícitamente POST /auth/dispositivo del limitador global (skip por método y ruta); su límite general en memoria se aplica dentro de la ruta, después de la evaluación persistente (REQ-16). Absorbe lo que era S2.T4 para CORS.", rollback="Quitar los middlewares montados en el arranque de la app y devolver la app al estado previo.", validates=["REQ-01","REQ-02","REQ-03","REQ-16","REQ-17"], verify=["pnpm -C server test -- test/http/cabeceras-cors.test.ts","pnpm -C server test -- test/http/limite-general.test.ts"] }
- edit S1.T4 { desc="Identificar las operaciones con x-rate-limit: estricto desde el contrato OpenAPI (o, si no es viable, desde una lista explícita única en código verificada por test contra el contrato) y aplicarles el limitador estricto con umbral por clave de configuración (REQ-04, REQ-18). Cubrir además la CORS por variable de entorno (REQ-17) y el handler sin cabeceras propias de express-rate-limit (REQ-19) con tests.", rollback="Quitar el limitador estricto de las rutas marcadas y la lista asociada.", validates=["REQ-04","REQ-17","REQ-18","REQ-19"], verify=["pnpm -C server test -- test/http/limite-estricto.test.ts","pnpm -C server test -- test/http/limitador-handler.test.ts"] }
- edit S1.T2 { desc="Helper de log muestreado para rechazos por límite: emite warn con errorCode, IP y sujeto ya seudonimizados y sin secreto ni código de dispositivo completo, con tasa de muestreo leída de la clave de configuración (0.1 por defecto). No contiene la función de seudonimización de IP: esa vive solo en S1.T6.", rollback="Eliminar el helper y sus llamadas.", validates=["REQ-05"], verify=["pnpm -C server test -- test/observabilidad/log-rechazo-muestreado.test.ts"] }
- edit S1.T6 { desc="Función única de seudonimización de IP (HMAC con la sal leída de la variable de entorno cuyo nombre es la constante única de REQ-21; en producción, si falta, el arranque falla con error explícito; en desarrollo y test se usa un valor fijo documentado). La usan los logs (S1.T2) e intento_seguridad (REQ-14). Fusiona toda la lógica de seudonimización en un solo lugar.", rollback="Eliminar la función y volver a las llamadas previas.", validates=["REQ-05","REQ-14","REQ-21"], verify=["pnpm -C server test -- test/seguridad/seudonimizar-ip.test.ts"] }
- edit S1.T5 { desc="Sembrar en configuracion_clave, solo aquí, las 7 claves con prefijo común derivado de la convención existente del catálogo y sus valores por defecto: límite general 100/min, estricto 10/min, alta por IP 5/h, alta por código 3/h, duración del bloqueo 15 min, validación por cuenta 10/h y muestreo 0.1. Exportar los nombres como constantes que el resto del código consume; ninguna otra task inserta claves.", rollback="Revertir la migración o seed de las 7 claves (DELETE por clave) y quitar las constantes.", validates=["REQ-13"], verify=["pnpm -C server test -- test/config/siembra-claves-limites.test.ts"] }
- delete S3.T1
- edit S3.T4 { desc="Cubrir con las 7 claves sembradas y la variable de entorno de la sal los tests de integración de límites; incluye la verificación de privilegios de intento_seguridad en test/auth/intento-seguridad-privilegios.test.ts (REQ-11, REQ-23) y el filtro verify alineado con ese archivo. Absorbe lo que cubría S3.T1.", validates=["REQ-07","REQ-11","REQ-13","REQ-23"], verify=["pnpm -C server test -- test/auth/intento-seguridad-privilegios.test.ts","pnpm -C server test -- test/auth/alta-limites.test.ts"] }

### Enmienda 3

**Task ops:**

- edit S1.T4 { validates=["REQ-17","REQ-18","REQ-19"], isTest=false }
- edit S2.T2 { rollback="Revertir el commit de la task: eliminar el módulo de evaluación persistente del alta y el cableado en la ruta, y dejar POST /auth/dispositivo con el comportamiento previo. No hay siembra de claves que deshacer (solo S1.T5 siembra, con un único seed_catalog). Preservar los datos de intento_seguridad." }
- edit S2.T2.3 { desc="Conectar la evaluación persistente en POST /auth/dispositivo consumiendo las constantes de nombres de clave definidas en S1.T5. Esta subtask NO siembra ni inserta claves de configuración: la única siembra de las 7 claves ocurre en S1.T5 mediante un único seed_catalog. Rutas relativas a server, comandos con pnpm -C server.", rollback="Revertir el cableado de la evaluación persistente en la ruta. No hay siembra de claves que deshacer." }
- edit S2.T5 { desc="Fijar y probar el orden de evaluación en POST /auth/dispositivo: 1) límite persistente del alta (5/h por IP, 3/h por código, intento_seguridad), 2) límite estricto en memoria (10/min por IP, aplicado dentro de la ruta después de la evaluación persistente). El limitador general en memoria NO se monta sobre esta ruta: se excluye explícitamente con skip por método y ruta (POST /auth/dispositivo) y lo cubre el estricto. Los tests de aislamiento del estricto usan otra operación estricta o elevan los umbrales persistentes; los tests del alta por IP usan cinco códigos distintos (REQ-20). El test de 100 peticiones con 429 en la 101 usa una ruta pública sin x-rate-limit estricto. Rutas relativas a server, comandos con pnpm -C server.", verify=["pnpm -C server test test/auth/limite-alta-ip.test.ts","pnpm -C server test test/auth/limite-alta-codigo.test.ts","pnpm -C server test test/auth/limite-alta-orden.test.ts"] }
- edit S3.T4 { desc="Redactar docs/development/configuration.md con las 7 claves de configuración (nombres exactos con prefijo común, valor por defecto y cómo cambiarlas sin desplegar: límite general 100/min, estricto 10/min, alta por IP 5/h, alta por código 3/h, duración del bloqueo 15 min, validación por cuenta 10/h, muestreo de logs 0.1) y las variables de entorno IP_HASH_SALT (obligatoria en production) y CORS_ALLOWED_ORIGINS (lista separada por comas, vacía en M1a). Si release-runbook.md menciona los límites, enlazar a esa sección. Incluye el test que verifica el documento (claves y variables presentes, nombres iguales a las constantes) y el filtro verify alineado con test/auth/intento-seguridad-privilegios.test.ts. Rutas relativas a server, comandos con pnpm -C server.", rollback="Revertir los commits de la task: restaurar docs/development/configuration.md (y el enlace en release-runbook.md si se agregó) a su estado previo y quitar los archivos de test añadidos. No se toca la base ni la siembra de claves.", isTest=true }

**REQ ops:**

- remove REQ-22
- remove REQ-23

### Enmienda 4
**REQs:**

- REQ-16 (edit) `confirmed`: Orden de evaluación en POST /auth/dispositivo: primero el límite persistente del alta (intento_seguridad: 5/h por IP y 3/h por código) y des
- REQ-19 (edit) `confirmed`: express-rate-limit se configura con las cabeceras propias desactivadas (legacyHeaders y standardHeaders en false) y su handler delega en el 

**Task ops:**

- edit S1.T3 { desc="Montar los limitadores en memoria: el general (100/min por IP, umbral leído de su clave de configuración en cada evaluación, constantes de nombres de clave sin literales) a nivel de app con skip explícito por método y ruta para POST /auth/dispositivo, y el estricto (10/min por IP, clave de configuración) sobre las operaciones con x-rate-limit: estricto. En POST /auth/dispositivo el orden es: límite persistente del alta primero y luego el estricto en memoria; el general en memoria NO se monta sobre esa ruta. CORS por allowlist leída de la variable de entorno cuyo nombre es la constante única de REQ-21. Los 429 salen por el manejador de errores existente con AppError.retryAfterSegundos." }
- edit S1.T4 { validates=["REQ-03","REQ-04","REQ-17","REQ-18","REQ-19"], isTest=false }
- edit S1.T5 { desc="Sembrar las 7 claves de configuración (prefijo común derivado de la convención del catálogo de HU-03a-02) con su valor por defecto en un único seed_catalog: límite general 100/min, estricto 10/min, alta por IP 5/h, alta por código 3/h, duración del bloqueo 15 min, validación de códigos por cuenta 10/h y muestreo de logs 0.1. Es el único lugar que siembra; el resto del código consume constantes con los nombres." }
- edit S2.T2.1 { desc="Implementar la lógica de evaluación del límite persistente sobre intento_seguridad (ventana, contador, bloqueo, reinicio al vencer el bloqueo) y exponer además la API reutilizable por cuenta: operación con sujeto = cuenta seudónima y umbral leído de la clave de configuración de validación de códigos por cuenta (10/h). Al superarse responde 429 por AppError.retryAfterSegundos sin afectar a otra cuenta; queda lista para que EP-11 la aplique.", validates=["REQ-06","REQ-09","REQ-15"] }
- edit S3.T2 { desc="Ejecutar localmente contra PostgreSQL efímero los casos QA-03a-05-01 a 06 (scripts de carga, cabeceras, reinicio con bloqueo vigente) y guardar la evidencia en docs/evidence/TAO-247/ (un archivo por caso con comando, salida y fecha), según la Adenda 1; la verificación en staging real queda como prueba de integración pendiente." }
- edit S3.T3 { desc="Pruebas de privilegios de intento_seguridad (REQ-11) y de límites del alta en test/auth/intento-seguridad-privilegios.test.ts y test/auth/alta-limites.test.ts. El test de documentación test/docs/configuracion-documentada.test.ts NO se escribe aquí: su único dueño es S3.T4." }
- edit S3.T4 { desc="Redactar docs/development/configuration.md con las 7 claves (nombres exactos, valor por defecto y cómo cambiarlas sin desplegar) y las variables IP_HASH_SALT (obligatoria en producción) y CORS_ALLOWED_ORIGINS (vacía en M1a); enlazar desde release-runbook.md si menciona los límites. Es el único dueño de test/docs/configuracion-documentada.test.ts, que verifica las 7 claves, ambas variables y que el código importa la constante única en vez del literal.", validates=["REQ-10","REQ-21"], isTest=true, verify=["pnpm -C server test -- test/docs/configuracion-documentada.test.ts"] }
- edit S2.T5 { verify=["pnpm -C server test -- test/auth/limite-alta-estricto.test.ts"] }
- edit S1.T1 { verify=["pnpm -C server test -- test/http/limitador-config.test.ts"] }

### Enmienda 5
**REQs:**

- REQ-10 (edit) `confirmed`: docs/development/configuration.md documenta las tres claves de configuración de este ticket con sus nombres exactos y prefijo común (límite 
- REQ-12 (edit) `confirmed`: Reuso obligatorio: todo 429 del límite general y del estricto sale por el manejador de errores existente (server/src/middleware/error-handle
- REQ-13 (edit) `confirmed`: Se siembran solo tres claves en configuracion_clave, todas con un prefijo común derivado de la convención existente del catálogo (HU-03a-02)
- REQ-16 (edit) `confirmed`: El limitador general en memoria se excluye de POST /auth/dispositivo con skip por método y ruta; esa ruta queda cubierta por el limitador es
- REQ-22 (add) `confirmed`: Este ticket no crea tablas ni migraciones y no altera privilegios de roles: la siembra de las tres claves solo inserta filas en configuracio

**Task ops:**

- edit S1.T5 { desc="Sembrar en un único seed (un solo seed_catalog, sin migración ni tablas) solo 3 claves en configuracion_clave con prefijo común derivado de la convención del catálogo de HU-03a-02: límite general 100/min por IP, límite estricto 10/min por IP (provisional) y muestreo de logs warn de rechazo 0.1. Exportar constantes con los nombres para que el resto del código no use literales. Las 4 claves del alta persistente las siembra TAO-274. Clave faltante o no numérica usa el valor por defecto con warn (REQ-13).", rollback="Revertir el commit del seed y borrar las 3 filas sembradas de configuracion_clave; no hay migración ni tablas que revertir.", validates=["REQ-13","REQ-22"], isTest=false }
- edit S1.T3 { desc="Montar helmet con HSTS, CORS por allowlist leída de CORS_ALLOWED_ORIGINS (constante única, vacía en M1a), trust proxy para la IP real tras Railway, limitador general en memoria (100/min por IP, umbral leído de configuración en cada evaluación) con skip por método y ruta para POST /auth/dispositivo, y limitador estricto en memoria (10/min) aplicado a las operaciones x-rate-limit estricto. Consumir las constantes de claves de S1.T5 sin literales. El orden persistente-primero de POST /auth/dispositivo lo implementa TAO-274; aquí el estricto cubre esa ruta.", rollback="Revertir el commit del montaje de middlewares; las rutas vuelven a responder sin cabeceras de helmet, sin CORS y sin límites en memoria.", validates=["REQ-01","REQ-02","REQ-03","REQ-04","REQ-16","REQ-17"] }
- edit S1.T4 { desc="Escribir los tests Supertest de la sesión 1: cabeceras helmet y HSTS, CORS sin permiso para origen no permitido, 429 en la petición 101 sobre una ruta pública sin x-rate-limit estricto, cambio de la clave general sin reiniciar, límite estricto en una operación estricta, exclusión del limitador general en POST /auth/dispositivo (cubierto por el estricto), identificación de operaciones estrictas desde el contrato, y express-rate-limit sin cabeceras propias con 429 por el manejador. Sin tests del límite persistente del alta (son de TAO-274).", rollback="Eliminar los archivos de test agregados en esta task; no afecta código de producción.", validates=["REQ-01","REQ-02","REQ-03","REQ-04","REQ-12","REQ-16","REQ-17","REQ-18","REQ-19"], isTest=false }
- edit S3.T2 { desc="Registrar evidencia local contra el servidor local (sin staging ni cuentas externas, Adenda 1): QA-03a-05-05 con un script que envía 101 peticiones desde una IP en menos de un minuto a una ruta pública sin x-rate-limit estricto y verifica 429 limite_frecuencia en la última, y QA-03a-05-06 con la inspección de cabeceras helmet y HSTS en una respuesta real del servidor local. QA-03a-05-01 a 04 son de TAO-274.", rollback="Eliminar el script y los archivos de evidencia local agregados; no afecta código de producción.", validates=["REQ-01","REQ-03"] }
- edit S3.T3 { desc="Escribir el test que verifica que este ticket no agrega migraciones ni cambia privilegios: falla si aparece un directorio nuevo en server/prisma/migrations o una tabla intento_seguridad, y compara los privilegios de configuracion_clave para taomangalam_app y taomangalam_readonly antes y después del seed. Sin pruebas de intento_seguridad ni de bloqueos persistentes.", rollback="Eliminar el archivo de test agregado; no afecta código de producción.", validates=["REQ-22"], isTest=true }
- edit S3.T4 { desc="Redactar docs/development/configuration.md con las 3 claves de este ticket (nombres exactos con prefijo común: límite general 100/min, estricto 10/min provisional, muestreo 0.1), su valor por defecto y cómo cambiarlas sin desplegar, más las variables IP_HASH_SALT (obligatoria en producción) y CORS_ALLOWED_ORIGINS (vacía en M1a), importadas desde la constante única (REQ-21). Si release-runbook.md menciona los límites, enlazar a esa sección. Agregar test de documentación que falle si falta alguno de estos elementos. TAO-274 agrega sus claves.", rollback="Revertir los cambios a configuration.md, a release-runbook.md y el test de documentación.", validates=["REQ-10","REQ-21"], isTest=true }

**REQ ops:**

- remove REQ-06
- remove REQ-07
- remove REQ-08
- remove REQ-09
- remove REQ-11
- remove REQ-15
- remove REQ-20

### Enmienda 6
**REQs:**

- REQ-01 (edit) `confirmed`: Toda respuesta del API incluye las cabeceras de seguridad de helmet y Strict-Transport-Security (DEC-162).
- REQ-05 (edit) `confirmed`: Función de seudonimización de IP reutilizable y registro de cada rechazo por límite como warn con errorCode, muestreado con una fuente aleat
- REQ-14 (edit) `confirmed`: La sal para seudonimizar la IP se lee de la variable de entorno IP_HASH_SALT (constante única de REQ-21); en producción, si falta, el servid
- REQ-18 (edit) `confirmed`: Las operaciones con x-rate-limit: estricto se identifican a partir del contrato OpenAPI (o, si no es viable, de una lista explícita única en

**Tasks agregadas:**

- S3: Escribir el archivo de prueba server/test/db/sin-migracion-tao247.test.ts que valida REQ-22: (a) no existe migración nueva en server/prisma/migrations posterior a la última de la línea base (20261008140000) atribuible a este ticket; (b) ninguna migración contiene CREATE TABLE intento_seguridad; (c) los privilegios de taomangalam_app y taomangalam_readonly sobre configuracion_clave son idénticos antes y después de correr el seed de las tres claves (consulta a information_schema.role_table_grants con PostgreSQL efímero). No modifica tests existentes. (valida: REQ-22, test; rollback: Eliminar server/test/db/sin-migracion-tao247.test.ts; no hay cambios de datos ni de código de producción.)

**Task ops:**

- edit S1.T6 { desc="Implementar una única función de seudonimización de IP (HMAC con la sal leída de IP_HASH_SALT, constante única de REQ-21), diseñada como reutilizable por TAO-274 pero usada en este ticket solo en los logs de rechazo por límite. En producción falla al arrancar si falta la sal; en development y test usa un valor fijo documentado. No agrega consumidores fuera de los logs de este ticket.", rollback="Revertir el commit que agrega la función y su validación de arranque; los logs vuelven a no emitir IP seudonimizada.", validates=["REQ-05","REQ-14"], verify=["pnpm -C server test -- test/http/seudonimizar-ip.test.ts"] }
- edit S3.T2 { desc="Ejecutar localmente (servidor local con PostgreSQL efímero, según Adenda 1) las verificaciones QA-03a-05-05 (101 peticiones desde una IP en un minuto sobre una ruta pública sin x-rate-limit estricto, la 101 responde 429 limite_frecuencia) y QA-03a-05-06 (inspección de cabeceras de helmet y HSTS en una respuesta real local), y guardar la evidencia (salidas de los scripts y cabeceras capturadas) en docs/evidence/TAO-247/. La verificación en staging real queda como prueba de integración pendiente y no bloquea el cierre.", rollback="Eliminar docs/evidence/TAO-247/; no afecta código ni datos.", verify=["test -s docs/evidence/TAO-247/QA-03a-05-05.txt","test -s docs/evidence/TAO-247/QA-03a-05-06.txt"] }
- edit S3.T4 { desc="Redactar docs/development/configuration.md con las tres claves de configuración de este ticket (nombres exactos con prefijo común, valores por defecto 100/min, 10/min provisional y 0.1, y cómo cambiarlas sin desplegar) y las variables IP_HASH_SALT (obligatoria en producción) y CORS_ALLOWED_ORIGINS (vacía en M1a); enlazar desde release-runbook.md solo si este menciona los límites. Escribir su test de documentación, que lee el archivo y falla si falta alguna clave o variable, e importa los nombres desde la constante única de REQ-21. No incluye evidencia local ni verificaciones con acceso externo.", rollback="Revertir docs/development/configuration.md, el enlace en release-runbook.md si se agregó y el archivo de test de documentación.", isTest=true, verify=["pnpm -C server test -- test/docs/configuration-doc.test.ts"] }

### Enmienda 7
**REQs:**

- REQ-03 (edit) `confirmed`: Límite general en memoria por IP real tras el proxy de Railway con trust proxy fijado en 1 (un salto), por defecto 100 peticiones por minuto
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6

**Gate (auto)**: Suite Supertest en verde que muestra cabeceras helmet/HSTS, ausencia de CORS para origen no permitido, 429 limite_frecuencia con Retry-After en la petición 101 y en la operación estricta, umbral cambiado sin reinicio, y log warn con IP seudonimizada.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T2
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6

**Gate (auto)**: docs/development/configuration.md con las tres claves de este ticket, IP_HASH_SALT y CORS_ALLOWED_ORIGINS, test de documentación en verde y reportes de evidencia local de QA-03a-05-05 (101 peticiones y 429) y QA-03a-05-06 (cabeceras helmet y HSTS reales del servidor local).

### Session 4 · T0 · open
