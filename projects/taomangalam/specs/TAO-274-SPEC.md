---
id: TAO-274-SPEC
project: taomangalam
ticket: TAO-274
status: draft
---

# TAO-274 · Límite persistente del alta pública por IP y código con intento_seguridad y respuesta genérica

## Resumen ejecutivo

Se crea la tabla intento_seguridad (migración Prisma, down.sql y privilegios copiados de intento_login) y un servicio de límite persistente reutilizable. POST /auth/dispositivo pasa a limitar 5 altas/h por IP y 3/h por código, con un bloqueo configurable de 15 min, 429 limite_frecuencia con Retry-After por el manejador existente y una respuesta genérica que no revela si el código tenía cuenta. Además se expone una API de límite por cuenta (10/h) para EP-11.
No incluye: cabeceras, CORS, el límite general o estricto en memoria, la seudonimización de IP ni las claves generales (TAO-247), la integridad del dispositivo (HU-03a-17), la fuerza bruta en login (EP-03b) ni la aplicación del límite por cuenta en la validación de códigos (EP-11).
Cómo se verifica: Supertest con PostgreSQL efímero. La sexta alta por IP y la cuarta por código responden 429; si se cambia la clave a 3, la cuarta responde 429 sin redesplegar; el bloqueo sobrevive al reinicio del proceso; otra IP recibe 201; los logs salen sin IP en claro ni código completo; la prueba de privilegios niega DELETE a taomangalam_app.
Tamaño: 3 sesiones (unas 7 h), 5 puntos, riesgo alto.
ADVERTENCIA: al agregar la migración hay que sumarla a la lista MIGRACIONES de server/src/test/migrations/migracion-inversa.test.ts:37 para que la reversión siga cubierta. Los consumidores Dart (puerto_cuenta_api.dart:195, puerto_login_api.dart:130) ya interpretan limite_frecuencia y Retry-After; no se tocan, pero el contrato del 429 debe mantenerse.

Datos a confirmar antes de ejecutar:
1) Prefijo común y nombres exactos de las claves en configuracion_clave que fijó TAO-247 (ver docs/development/configuration.md en main tras TAO-247).
2) Nombre y ubicación del helper de seudonimización de IP (sal IP_HASH_SALT) y del helper de muestreo de logs de TAO-247.
3) Archivo del manejador de POST /auth/dispositivo (autenticarCuentaDispositivo) y del middleware del límite estricto en memoria, para insertar la evaluación antes de él.
4) Mecanismo de siembra de HU-03a-02: si es una migración SQL o un script de seed.
5) Nombre del paquete o filtro pnpm del servidor y del archivo de test de documentación existente; los comandos verify asumen `pnpm -C server exec vitest run <archivo>`.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/server/prisma/migrations/20261008140000_intento_login/migration.sql:4
> Necesidad: build
Existe la tabla intento_seguridad (doc 20 §3) con operación, sujeto seudónimo, IP seudónima, resultado, contador, inicio de ventana y bloqueo_hasta, creada por una migración Prisma nueva con su down.sql, siguiendo el patrón de intento_login. Qué: persistir intentos y bloqueos. Por qué: el bloqueo debe sobrevivir a un reinicio.

#### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
POST /auth/dispositivo limita a 5 altas por hora por IP (DEC-222, DEC-232, DEC-233 punto 3). La sexta dentro de la ventana responde 429 limite_frecuencia con Retry-After y queda registrada en intento_seguridad. Una IP distinta no se ve afectada.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
POST /auth/dispositivo limita a 3 altas por hora por código de dispositivo, aunque vengan de IPs distintas. La cuarta responde 429 limite_frecuencia.

#### REQ-04 `confirmed`
> Fuente: taomangalam/server/src/auth/inicio-sesion.ts
> Necesidad: build
Al superar cualquier límite, el bloqueo dura lo que indica la clave de duración (15 min por defecto). Retry-After no supera ese plazo. El bloqueo persiste tras reiniciar el proceso. Al vencer, el contador vuelve a 1, la ventana se reinicia y bloqueo_hasta queda nulo (adenda, decisión 1).

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
Las cuatro claves (alta por IP 5, alta por código 3, duración del bloqueo 15 min y validación por cuenta 10) se siembran en configuracion_clave con el prefijo común de TAO-247 y el mecanismo de HU-03a-02, se leen en cada evaluación y se ajustan sin desplegar. Una clave faltante o no numérica usa el valor por defecto con un warn.

#### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
Ante abuso, la respuesta del alta es genérica: el 429 de un código con cuenta previa es indistinguible del de un código nunca visto (mismo estado, mismo cuerpo problem+json y mismas cabeceras salvo el valor de Retry-After). Ya no se emite credencial_dispositivo_invalida en el camino de abuso.

#### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
Los rechazos por límite se registran como warn con errorCode limite_frecuencia y sujeto seudónimo, muestreados a la tasa de TAO-247 (0.1) con un generador inyectable. El log no contiene la IP en claro, el secreto ni el código completo.

#### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:658
> Necesidad: build
Existe una API reutilizable de límite por cuenta (operación y sujeto cuenta seudónima, umbral de la clave de validación por cuenta, 10/h por defecto) que EP-11 aplicará. Al superarla responde 429 y no afecta a otra cuenta.

#### REQ-09 `confirmed`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145
> Necesidad: build
intento_seguridad copia los privilegios de intento_login: REVOKE DELETE a taomangalam_app; GRANT SELECT, INSERT y UPDATE a taomangalam_app (el bloqueo se actualiza, no se borra); GRANT SELECT a taomangalam_readonly. down.sql los revierte y una prueba los verifica.

#### REQ-10 `confirmed`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6
> Necesidad: build
docs/development/configuration.md documenta las cuatro claves con su nombre exacto, el valor por defecto y cómo cambiarlas sin desplegar, junto a las de TAO-247. Si release-runbook.md menciona los límites, enlaza a esa sección. Un test de documentación verifica los nombres.

#### REQ-11 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:662
> Necesidad: build
Se reutiliza lo existente sin duplicarlo: el 429 sale por AppError.retryAfterSegundos y el manejador de errores (problem+json, Retry-After entero), la seudonimización y el muestreo son los de TAO-247, el patrón de persistencia es el de intento_login, y el límite persistente se evalúa antes del estricto en memoria de TAO-247.

## Tasks

#### S1.T1 — Crear la migración Prisma nueva (timestamp posterior a 20261008160000, nombre intento_seguridad) con el modelo en schema.prisma: id, operacion, sujeto (hash), ip (hash), resultado, contador, ventana_inicio, bloqueo_hasta, creado y actualizado, más un índice único (operacion, sujeto). Incluir en migration.sql REVOKE DELETE ON intento_seguridad FROM taomangalam_app; GRANT SELECT, INSERT, UPDATE TO taomangalam_app; GRANT SELECT TO taomangalam_readonly, copiando el patrón de 20261008140000_intento_login. down.sql revoca y hace DROP TABLE intento_seguridad. Agregar la migración a MIGRACIONES en server/src/test/migrations/migracion-inversa.test.ts:37
Contrato: rollback: Borrar la carpeta de la migración, el modelo de schema.prisma y la entrada en MIGRACIONES; en una base aplicada, ejecutar down.sql. Status: pending

#### S1.T2 — Sembrar las cuatro claves en configuracion_clave con el mecanismo de HU-03a-02 y el prefijo común de TAO-247 (alta por IP = 5, alta por código = 3, duración del bloqueo = 15 min, validación por cuenta = 10). Exportarlas como constantes con nombre y con sus valores por defecto. Agregar un lector que consulta la clave en cada evaluación y que, si falta o no es numérica, usa el valor por defecto y emite un warn con el nombre de la clave
Contrato: rollback: Revertir la siembra (borrar las cuatro claves por nombre) y el módulo de constantes y lector. Status: pending

#### S1.T3 — Crear el servicio de límite persistente reutilizable con reloj inyectable: evaluar(operacion, sujetoSeudonimo, ipSeudonima, claveUmbral). Hace un upsert transaccional en intento_seguridad por (operacion, sujeto). Si la ventana de 1 h venció, o si bloqueo_hasta venció, reinicia contador a 1, abre una ventana nueva y deja bloqueo_hasta nulo. Al superar el umbral fija bloqueo_hasta = ahora + duración leída de la clave y lanza AppError 429 limite_frecuencia con retryAfterSegundos = ceil(restante), que nunca supera la duración. Exponer limitarPorCuenta(operacion, cuentaId) usando la clave de validación por cuenta. Una sola fila por sujeto (acotado, no O(filas))
Contrato: rollback: Eliminar el módulo del servicio; nada lo consume todavía. Status: pending

#### S1.T4 — Tests de la sesión: prueba de privilegios de intento_seguridad como taomangalam_app y taomangalam_readonly; unitarios del servicio con reloj falso (ventana, bloqueo de 900 s, borde de 899 s y 900 s, reinicio tras vencer, duración cambiada a 5 min, clave faltante o no numérica con warn); límite por cuenta que bloquea la cuenta A sin afectar la B
Contrato: rollback: Eliminar los archivos de test nuevos. Status: pending

#### S2.T1 — Integrar el límite persistente en POST /auth/dispositivo (autenticarCuentaDispositivo)
Contrato: rollback: Revertir los cambios del handler y del orden de middlewares; intento_seguridad se preserva. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S2.T1.1 — En POST /auth/dispositivo, antes del límite estricto en memoria de TAO-247, evaluar el límite por IP (sujeto = IP seudonimizada con el helper de TAO-247 y la sal IP_HASH_SALT, clave alta por IP) y el límite por código (sujeto = hash del código, clave alta por código). Si cualquiera se supera, lanzar el AppError 429 del servicio para que salga por el manejador existente
Contrato: rollback: Quitar las dos llamadas al servicio del handler. Status: pending

#### S2.T1.2 — Respuesta genérica: en el camino de abuso, responder siempre el mismo 429 limite_frecuencia, sin consultar si el código tiene cuenta y sin emitir credencial_dispositivo_invalida; el cuerpo problem+json no lleva campos que dependan de la cuenta
Contrato: rollback: Revertir el ajuste del camino de rechazo. Status: pending

#### S2.T1.3 — Registrar los rechazos por límite como warn con errorCode limite_frecuencia y sujeto seudónimo, usando el helper de muestreo de TAO-247 (tasa 0.1) con un generador inyectable; sin IP en claro, sin secreto y sin código completo
Contrato: rollback: Quitar la llamada de log del rechazo. Status: pending

#### S2.T2 — Supertest con PostgreSQL efímero y umbrales en memoria elevados: QA-03a-05-01 (sexta alta por IP con cinco códigos distintos → 429 y fila en intento_seguridad), QA-03a-05-02 (recrear la app con el bloqueo vigente → sigue en 429), QA-03a-05-03 (otra IP → 201), QA-03a-05-04 (cuarta alta del mismo código desde IPs distintas → 429 y vencimiento a los 15 min con reloj falso), clave de IP cambiada a 3 → 429 en la cuarta, comparación de los 429 entre un código con cuenta y uno nuevo, logs muestreados sin datos sensibles, y regresión del 201 del alta válida
Contrato: rollback: Eliminar el archivo de test nuevo. Status: pending
Subtasks: 8 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Crear src/auth/alta-dispositivo-limite.test.ts con el fixture común: PostgreSQL efímero con las migraciones aplicadas y las cuatro claves sembradas, fábrica de app Supertest que recibe reloj falso, generador de muestreo inyectable y umbrales en memoria de TAO-247 elevados, captura del logger, limpieza de intento_seguridad entre casos y un helper que crea un código con cuenta previa
Contrato: rollback: Eliminar el archivo de test nuevo. Status: pending

#### S2.T2.2 — Caso QA-03a-05-01 y borde de ventana por IP: cinco altas desde 203.0.113.7 con cinco códigos distintos → 201; la sexta → 429 limite_frecuencia, Content-Type application/problem+json, Retry-After entero > 0 y fila en intento_seguridad con resultado bloqueado (el corte lo hace el límite persistente, no el de memoria); con reloj falso, la sexta a los 60 min y 1 s del inicio de la ventana → 201
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S2.T2.3 — Caso QA-03a-05-03: con 203.0.113.7 bloqueada, un alta legítima desde 198.51.100.4 con un código nuevo → 201
Contrato: rollback: Quitar el caso agregado. Status: pending

#### S2.T2.4 — Caso QA-03a-05-04: tres altas con el mismo código desde tres IPs distintas no reciben 429; la cuarta desde una cuarta IP → 429 limite_frecuencia; un código distinto desde esa misma cuarta IP → 201 mientras el primer código sigue bloqueado
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S2.T2.5 — Duración y persistencia del bloqueo con reloj falso: al superar el límite, bloqueo_hasta = ahora + 900 s y Retry-After = 900; a los 899 s sigue 429 con Retry-After = 1; a los 900 s el alta legítima → 201 con contador 1 y bloqueo_hasta nulo; QA-03a-05-02: cerrar y recrear la app contra la misma base con el bloqueo vigente → sigue 429; con la clave de duración en 5 min, el nuevo bloqueo da Retry-After <= 300 sin recrear la app
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S2.T2.6 — Claves ajustables sin desplegar: con la clave de alta por IP actualizada a 3 en configuracion_clave, la cuarta alta de la hora → 429 sin recrear la app; con la clave de alta por código borrada o con valor 'abc', se aplica 3 por defecto y el logger capturado contiene un warn con el nombre de la clave
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S2.T2.7 — Respuesta genérica y regresión: el 429 por límite de código de un código con cuenta previa y el de un código nunca visto tienen el mismo status, el mismo codigo, el mismo cuerpo y las mismas cabeceras salvo el valor de Retry-After; ningún rechazo por abuso responde 401 credencial_dispositivo_invalida; un alta válida fuera del abuso sigue respondiendo 201 con el contrato actual
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S2.T2.8 — Logs del rechazo: con el generador inyectado en 0.05, el rechazo emite un warn con errorCode limite_frecuencia y sujeto igual al hash de la IP; con 0.5 no emite; en todos los logs capturados no aparecen '203.0.113.7', el secreto del alta ni el código de dispositivo completo
Contrato: rollback: Quitar los casos agregados. Status: pending

#### S3.T1 — Documentar en docs/development/configuration.md, junto a las claves de TAO-247, las cuatro claves de este ticket con su nombre exacto, valor por defecto (5/h, 3/h, 15 min, 10/h) y cómo cambiarlas en configuracion_clave sin desplegar (se leen en cada evaluación). Si docs/development/release-runbook.md menciona los límites, enlazar a esa sección. Documentar el rollback: redesplegar el SHA anterior y preservar intento_seguridad
Contrato: rollback: Revertir los cambios en configuration.md y release-runbook.md. Status: pending

#### S3.T2 — Test de documentación: verificar que configuration.md contiene los cuatro nombres de clave exportados como constantes y que falla nombrando la clave faltante. Correr como regresión los tests de inicio-sesion y migracion-inversa
Contrato: rollback: Eliminar el test nuevo o el caso agregado. Status: pending

## Cambios al modelo de datos

- tipo: create | objetos: intento_seguridad | destructivo: no | tarea: S1.T1 | rollback: down.sql de la migración: DROP TABLE intento_seguridad; no toca otras tablas
- tipo: seed_rbac | objetos: intento_seguridad (taomangalam_app: SELECT, INSERT, UPDATE; REVOKE DELETE), intento_seguridad (taomangalam_readonly: SELECT) | destructivo: no | tarea: S1.T1 | rollback: down.sql revoca los grants antes del DROP TABLE
- tipo: seed_catalog | objetos: configuracion_clave (alta por IP, alta por código, duración del bloqueo, validación por cuenta) | destructivo: no | tarea: S1.T2 | rollback: Revertir la siembra borrando las cuatro claves por nombre; el código usa los valores por defecto
