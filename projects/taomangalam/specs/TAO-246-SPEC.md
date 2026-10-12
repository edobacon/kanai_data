---
id: TAO-246-SPEC
project: taomangalam
ticket: TAO-246
status: draft
---

# TAO-246 · registrarDispositivo, locale y zona reales en el alta, y recuperación de sesión con fuente única del bearer sin perder el trabajo local

## Resumen ejecutivo

Qué se hace: en el servidor se implementa POST /v1/devices (registrarDispositivo) con bearer, capacidad obligatoria y bloqueo por versión legal. En la app, el alta envía locale y timezoneId reales, y registrarDispositivo distingue una falla de red de un error de servidor para no reintentar sin fin. Además, los puertos dejan de recibir el token por parámetro y pasan a un cliente HTTP autenticado con fuente única del bearer. Ese cliente tiene un interceptor que, ante 401 token_expirado, hace una sola renovación en vuelo y reintenta una vez. Si la renovación falla, encadena a reprovisionar() o, ante una credencial rechazada, a _rotarIdentidad(). Cuando hay datos locales, se muestra el aviso de identidad nueva.
Qué NO se hace: límite de frecuencia, respuesta genérica e integridad (HU-03a-05), aceptaciones diferidas (HU-03a-12), cierre de sesión y eliminación de la cuenta (EP-03b), interfaz de V-31 y V-51 (EP-01), y emisión o rotación de tokens en el servidor (ya entregadas).
Cómo se sabe que funciona: Supertest de /v1/devices (200, 401, 403 version_legal_pendiente, alcance a la cuenta autenticada). Pruebas unitarias del interceptor: tres peticiones con el token vencido producen una sola llamada a renovarToken. Integración de la app contra un servidor local con token vencido, refresh revocado, credencial inválida y corte de red: una sola cuenta por Idempotency-Key y las tablas consultante y consulta intactas. Un grep confirma que ningún puerto recibe accessToken por parámetro. QA en emuladores y simuladores (Adenda 1).
Tamaño: 8 puntos, 3 sesiones (T2, T3, T2). Riesgo medio por el refactor transversal de los puertos.
ADVERTENCIAS: (1) Si el seed del perfil Estándar falta en algún entorno, agregarlo es un seed_rbac y requiere aprobación humana explícita. Hoy el plan solo lo verifica, así que dataModelChanges queda vacío. (2) El límite de frecuencia de HU-03a-05 todavía no existe: el interceptor debe acotar los reintentos (una renovación y un reintento por petición) para no depender de él. (3) Si el refactor del bearer resulta más grande de lo estimado, la ficha permite partir HU-03a-04 en (a) bearer más interceptor y (b) aviso de identidad nueva.
Datos a confirmar antes de ejecutar: (a) la ruta exacta del archivo app.ts del servidor (se asume server/src/app.ts) y el nombre del middleware de capacidad y del bloqueo por versión legal que se usan hoy (confirmar en app.ts). (b) El comando de tests del servidor (se asume pnpm --filter server exec vitest run <archivo>; confirmar en server/package.json). (c) Los nombres de los archivos de los puertos de cuenta, legal y manifiesto que hoy reciben accessToken (confirmar con grep de 'accessToken' en app/lib). (d) Los códigos exactos de error del contrato: token_expirado, refresh_invalido y credencial_dispositivo_invalida (confirmar en el OpenAPI y en server/src/auth/registro-dispositivo.ts). (e) El nombre del componente de avisos existente y la ubicación de app_es.arb (confirmar en app/lib/l10n). (f) Dónde está el seed de capacidades y perfiles (confirmar en server/).

## Requirements

### REQ-01 `inferred`
> Fuente: taomangalam/server/src/auth/registro-dispositivo.ts; taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:110

El servidor expone POST /v1/devices (registrarDispositivo). Exige bearer, tiene capacidad obligatoria y x-requiere-cuenta: dispositivo, y no está exento del bloqueo por versión legal. Actualiza versión de app, versión del sistema y modelo del dispositivo de la cuenta autenticada, y responde 200 con el esquema Dispositivo.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/features/cuenta/data/alta_dispositivo.dart:260-266; taomangalam/app/lib/features/cuenta/data/puerto_registro_api.dart:39-40

La app envía en el alta el locale y el timezoneId reales del dispositivo. La zona horaria se lee con el paquete timezone que ya está en el proyecto, y la cuenta queda con locale y timezone_id no nulos.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/features/cuenta/data/alta_dispositivo.dart:543-569; taomangalam/app/lib/features/cuenta/data/puerto_registro_api.dart:6-11

El cliente de registrarDispositivo distingue una falla de red (sin conexión, timeout, 429 o 5xx, que se difiere) de un error de ruta o de contrato (404, 400, respuesta no parseable, que no se reintenta sin fin). Así, un error de servidor no deja un ciclo de reintentos infinito.

### REQ-04 `inferred`
> Fuente: Pedido de cambio (3); Adenda 4: la verificación del seed se hace sobre el seed del repo

Se verifica la precondición del seed sobre el seed del repo (no en cada entorno): el perfil Estándar existe sembrado por el seed de capacidades versionado en el repo antes del alta de una cuenta de dispositivo. La verificación es una prueba de la precondición (consulta que confirma la existencia del perfil tras aplicar ese seed) y no cambia el manejo de error existente del alta.

### REQ-10 `inferred`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:144

La app tiene una prueba de integración contra el servidor local con corte de red simulado. Si la red se corta a mitad del alta y vuelve, se crea una sola cuenta con la misma Idempotency-Key y los datos locales quedan intactos.

### REQ-11 `confirmed`
> Fuente: Pedido de cambio, punto 3; Adendas 4 y 6

El alta y la actualización del dispositivo (registrarDispositivo) se registran en el log del servidor con accountRef seudónimo, resultado, método, ruta, estado y requestId. El log no incluye tokens, secreto, código completo ni cuerpos. La prueba de integración del alta con corte de red (S3.T3) incluye aserciones sobre el contenido del log solo si el harness permite capturar el log del servidor. Si no lo permite, el ejecutor lo reporta sin inventar un mecanismo y esas aserciones quedan únicamente en el Supertest de S1.T5 (REQ-21). El gate de la sesión 3 acepta ese reporte como cumplimiento.

### REQ-12 `confirmed` `enforcement`
> Fuente: Adenda 5 (corte B), sección Ya entregado en main HU-03a-03

Reusar lo existente sin reimplementarlo: autenticarCuentaDispositivo del servidor; AlmacenSeguroDispositivo y el vigilante de red de alta_dispositivo.dart; el paquete timezone. Los datos de Drift no se tocan en el alta. Una regresión en app/test/device/ confirma que el alta existente sigue funcionando.

### REQ-13 `inferred` `enforcement`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:110

La ruta /v1/devices se cablea en app.ts con el mismo middleware de capacidad y el mismo bloqueo por versión legal que usan las demás rutas autenticadas no exentas, siguiendo el contrato OpenAPI existente de registrarDispositivo.

### REQ-15 `confirmed`
> Fuente: Adenda 1, Adenda 2 (Q2, Q3, Q4), Adenda 3 (Q5), Adenda 5 (corte B a TAO-275), Adenda 6 (punto 4); pedido de cambio puntos 1 a 3

Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/, las de la app en app/test/ y la prueba de integración de la app bajo integration_test/ (REQ-20). El ejecutor descubre en el repo cómo se arranca el servidor local de pruebas y dónde ubicar los tests, y fija los comandos verify de cada task con esos hallazgos. La verificación en dispositivo se hace en emulador o simulador (Android, iPhone y tablet virtuales, con corte de red simulado), no en dispositivo real; la prueba en dispositivo real queda pendiente y no bloquea el cierre (Adenda 1). Tras el corte de la Adenda 5, este ticket solo cubre la parte 1 (alta completa en el servidor) y sus QA-03a-03-*, que son QA humana en emulador contra staging y quedan como verificación pendiente de cierre. Quedan en TAO-275 y no se reintroducen aquí: el aviso de identidad nueva (clave cuentaDispositivoIdentidadNuevaAviso en app_es.arb), el access token de 60 s solo en development, el ticket de seguimiento del texto provisional y los casos QA-03a-04-*.

### REQ-18 `confirmed` `enforcement`
> Fuente: Adenda 3: confirmar en OpenAPI el código de estado de creación de cuenta

Se confirma en el contrato OpenAPI existente el código de estado de la creación de cuenta de autenticarCuentaDispositivo (creada = true) y la implementación del servidor y el cliente de la app lo respetan.

### REQ-20 `confirmed` `enforcement`
> Fuente: Adenda 4: una sola ubicacion de la prueba de integracion de alta con corte de red, fijada tras el descubrimiento del harness (integration_test/)

La prueba de integración del alta con corte de red tiene una sola ubicación en el repo, bajo integration_test/ de la app, fijada tras descubrir el harness existente. No se duplica en app/test/ ni en otra carpeta; app/test/device/ conserva solo las pruebas unitarias.

### REQ-21 `confirmed`
> Fuente: Pedido de cambio (3): alinear REQ-21 con REQ-11; REQ-11

Las aserciones de log del servidor para registrarDispositivo viven en el Supertest server/src/test/s01/dispositivo.test.ts, que es el que ejecuta la verificación de S1.T5. Verifican que el log incluye accountRef seudónimo, resultado, método, ruta, estado y requestId, y que no incluye token, secreto, código completo ni cuerpos, con el mismo contenido que exige REQ-11.

### REQ-22 `confirmed`
> Fuente: Pedido de cambio, punto 2; Adenda 6 (1)

Las dependencias existentes de zona horaria (paquete timezone) y de locale con formato BCP 47 quedan documentadas como dependencias del ticket, sin agregar paquetes nuevos ni reimplementar su lectura. La documentación la produce S1.T3 y vive en una sola ficha técnica del cambio bajo docs/ (el ejecutor fija la ruta siguiendo la convención del repo). Esta es la única exigencia de documentación de estas dependencias (absorbe el antiguo REQ-17). S1.T5 solo verifica que la ficha exista y mencione ambas.
## Tasks

#### S1.T1 — Implementar o completar POST /v1/devices (registrarDispositivo) en el servidor según el contrato OpenAPI existente (REQ-01, REQ-13). Confirmar que el log de registrarDispositivo incluye método, ruta, estado y requestId, además de accountRef seudónimo y resultado, y sin token, secreto, código completo ni cuerpos; si falta alguno de esos campos, agregarlo siguiendo el logger existente del servidor.
Contrato: rollback: Revertir el commit del handler; la ruta no existe y la app sigue difiriendo registrarDispositivo como hoy.. Status: pending

#### S1.T2 — Verificar la precondición del seed del perfil Estándar sobre el seed del repo (no en cada entorno): una prueba que, tras aplicar el seed de capacidades versionado, confirma por consulta que el perfil Estándar existe. No cambia el manejo de error existente del alta.
Contrato: rollback: No modifica el seed. Si la prueba de la precondición revela que falta el perfil Estándar, el ejecutor se detiene y reporta: agregarlo al seed es un cambio de seed_rbac que requiere aprobación humana explícita.. Status: pending

#### S1.T3 — Producir la documentación de las dependencias existentes (paquete timezone y locale con formato BCP 47) en la ficha técnica del cambio bajo docs/. El ejecutor fija la ruta siguiendo la convención del repo. No agregar paquetes nuevos ni reimplementar la lectura (REQ-17).
Contrato: rollback: Revertir el commit; locale y timezoneId vuelven a enviarse nulos.. Status: pending

#### S1.T4 — App: en puerto_registro_api.dart, registrarDispositivo traduce 404, 400 y respuestas no parseables a un error de contrato distinto de FallaDeRed (429 y 5xx siguen como FallaDeRed). En _registrarCambioDeVersion (alta_dispositivo.dart:543-569), el error de contrato se registra en el log y no se reintenta en bucle para la misma versión.
Contrato: rollback: Revertir el commit; vuelve el manejo actual de FallaDeRed y VersionLegalPendiente.. Status: pending

#### S1.T5 — Ejecutar y verificar el Supertest real server/src/test/s01/dispositivo.test.ts y las unitarias de app/test/device/. Además verificar solamente (sin producir) que la ficha técnica bajo docs/ creada por S1.T3 documenta el paquete timezone y el locale BCP 47 (REQ-17).
Contrato: rollback: Revertir solo los casos agregados por la task de pruebas de la sesión 1; no se borra server/src/test/s01/dispositivo.test.ts ni los archivos existentes de app/test/device/.. Status: pending

#### S1.T9 — Confirmar en el OpenAPI del servidor el código de estado de creación de cuenta de autenticarCuentaDispositivo (creada = true) y alinear, solo si difiere, el test del servidor y el cliente Dart. No cambiar el contrato sin reportarlo.
Contrato: rollback: Revertir el commit de la task; sin cambios de datos.. Status: pending

#### S1.T10 — Registrar POST /v1/devices (registrarDispositivo) en server/src/app.ts con el middleware de capacidad (capacidad obligatoria, x-requiere-cuenta: dispositivo) y el bloqueo por versión legal, igual que las demás rutas autenticadas no exentas, siguiendo el contrato OpenAPI existente.
Contrato: rollback: Quitar el registro de la ruta POST /v1/devices de server/src/app.ts.. Status: pending

#### S1.T11 — Implementar REQ-02 en la app: leer el locale del sistema en formato BCP 47 y la zona horaria con el paquete timezone ya presente (sin agregar paquetes), y pasarlos como locale y timezoneId reales al servicio de alta en alta_dispositivo.dart y puerto_registro_api.dart, reemplazando los valores nulos actuales. Si la lectura de locale o de zona falla, registrar la falla en el log de la app (sin secreto ni código completo) y continuar el alta con el valor disponible, sin romper el flujo existente. No tocar Drift ni AlmacenSeguroDispositivo.
Contrato: rollback: Revertir solo los cambios de esta task en alta_dispositivo.dart y puerto_registro_api.dart (git revert del commit de la task); el alta vuelve a enviar locale y timezoneId nulos sin afectar cuentas ni datos locales ya creados.. Status: pending

#### S1.T12 — Pruebas que AGREGAN casos nuevos sin borrar ni reescribir los existentes. (a) En server/src/test/s01/dispositivo.test.ts: Supertest de POST /v1/devices con 200 (dispositivo actualizado con versión de app, versión del sistema y modelo), 401 sin bearer, 403 version_legal_pendiente con versión legal pendiente, y cuenta ajena (un token de otra cuenta actúa solo sobre el dispositivo de la cuenta autenticada), más las aserciones de log de REQ-21 (accountRef seudónimo, resultado, método, ruta, estado y requestId; sin token, secreto, código completo ni cuerpos). (b) En app/test/device/: unitaria que verifica que el alta envía locale BCP 47 y timezoneId reales (no nulos) y unitaria del 404 de registrarDispositivo que se trata como error de ruta y no se reintenta (REQ-03), distinguiéndolo de una falla de red o 5xx que sí se difiere.
Contrato: rollback: Revertir solo los casos agregados por esta task; dispositivo.test.ts y los archivos existentes de app/test/device/ se conservan sin borrarse.. Status: pending

#### S3.T3 — Prueba de integración del alta con corte de red bajo integration_test/ de la app (única ubicación, REQ-20) contra el servidor local en emulador o simulador: si la red se corta a mitad del alta y vuelve, se crea una sola cuenta con la misma Idempotency-Key y los datos locales quedan intactos. Las aserciones de log (REQ-11) se hacen solo si el harness permite capturar el log del servidor; si no, se reporta la limitación sin inventar un mecanismo y las aserciones de log quedan solo en el Supertest de S1.T5 (REQ-21). El gate de la sesión 3 acepta ese reporte.
Contrato: rollback: Eliminar solo lo que el ticket creó del harness (el archivo de la prueba de integración y los ayudantes que agregó); lo preexistente del harness no se modifica ni se borra.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: Si el dispositivo tiene datos locales (filas en consultante o consulta en Drift) y se crea una identidad nueva por credencial_dispositivo_invalida, se muestra el aviso de identidad nueva con una clave de i18n en app_es.arb y los demás idiomas, usando el componente de avisos exi
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-14 (add) `confirmed`: El aviso de identidad nueva usa la clave de i18n cuentaDispositivoIdentidadNuevaAviso en app_es.arb (único idioma del repo) con el texto pro
- REQ-15 (add) `confirmed`: Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/ y las de la app en app/test/. El ej
- REQ-16 (add) `confirmed`: La vigencia del access token se reduce a 60 s mediante una variable de configuración que aplica solo en development, para poder verificar QA
- REQ-17 (add) `confirmed`: Las dependencias existentes de zona horaria (paquete timezone) y de locale con formato BCP 47 quedan documentadas como dependencias del tick

**Tasks agregadas:**

- S3: Agregar la clave cuentaDispositivoIdentidadNuevaAviso en app_es.arb con el texto provisional: "Este teléfono ahora tiene una cuenta nueva. Tus consultantes y consultas siguen guardados aquí, pero ya no están vinculados a tu cuenta anterior.". Marcarla como provisional hasta la validación de Contenido (metadato @cuentaDispositivoIdentidadNuevaAviso con description que lo indique) y dejar un seguimiento de reemplazo de texto. Es el único idioma del repo. Usarla desde el componente de avisos existente. (valida: REQ-14, REQ-08; rollback: Revertir el commit: quitar la clave y su metadato de app_es.arb y regenerar las localizaciones.)
- S3: Prueba de widget del aviso de identidad nueva: renderiza el texto de la clave cuentaDispositivoIdentidadNuevaAviso desde app_es.arb, y se muestra solo con datos locales (consultantes o consultas). Ubicarla en app/test/ siguiendo la convención existente y fijar el comando verify con el archivo creado. (valida: REQ-14, REQ-08, test; rollback: Eliminar el archivo de test agregado.)
- S1: Agregar en el servidor una variable de configuración solo de development que reduzca la vigencia del access token a 60 s (en producción rige 15 min, DEC-232 y se ignora la variable). Descubrir en server/ dónde se define la vigencia actual y seguir el patrón de configuración existente; documentar la variable en el ejemplo de entorno. (valida: REQ-16; rollback: Revertir el commit: la vigencia vuelve a 15 min en todos los entornos.)
- S1: Test del servidor en server/src/test/ siguiendo la convención existente: con la variable en development el access token vence a los 60 s; sin variable, o en production, la vigencia es de 15 min. Fijar el comando verify con el archivo de test creado. (valida: REQ-16, test; rollback: Eliminar el archivo de test agregado.)
- S2: Descubrir en el repo el arranque del servidor local de pruebas y la ubicación de los tests (server/src/test/ y app/test/) para la integración de la app con corte de red. Apuntar la integración a un emulador o simulador (no dispositivo real) y fijar los comandos verify de las tasks de integración con los scripts reales encontrados, sin inventar scripts. Documentar que la prueba en dispositivo real queda pendiente y no bloquea el cierre. (valida: REQ-15, REQ-10; rollback: Revertir el commit de la documentación y de los scripts de arranque agregados, sin tocar código de producción.)
- S2: Documentar en la ficha técnica del ticket que el locale BCP 47 y la zona horaria del alta dependen de componentes existentes (paquete timezone ya presente en pubspec.yaml y la lectura del locale del sistema), sin agregar paquetes nuevos. (valida: REQ-17, REQ-02; rollback: Revertir el commit de la documentación.)

### Enmienda 2
**REQs:**

- REQ-04 (edit) `inferred`: Se verifica la precondición del seed: en cada entorno el perfil Estándar existe sembrado (seed de capacidades) antes del alta de una cuenta 
- REQ-08 (edit) `inferred`: Si el dispositivo tiene datos locales (filas en consultante o consulta en Drift) y se crea una identidad nueva por credencial_dispositivo_in
- REQ-11 (edit) `inferred`: El alta, la actualización del dispositivo, las renovaciones y las reautenticaciones se registran en el log con accountRef seudónimo, resulta
- REQ-14 (edit) `confirmed`: El aviso de identidad nueva usa la clave de i18n cuentaDispositivoIdentidadNuevaAviso en app_es.arb (único idioma del repo) con el texto pro
- REQ-18 (add) `confirmed`: Se confirma en el contrato OpenAPI existente el código de estado de la creación de cuenta de autenticarCuentaDispositivo (creada = true) y l
- REQ-19 (add) `confirmed`: Se verifica que reprovisionar() está cableado con _rotarIdentidad() en alta_dispositivo.dart para el caso credencial_dispositivo_invalida. S

**Tasks agregadas:**

- S1: Aserciones de log (REQ-11) del alta con corte de red: capturar el log durante la prueba de integración y verificar accountRef, resultado, método, ruta, estado y requestId, y que no aparecen secreto, tokens, código completo ni cuerpos. (valida: REQ-11, test; rollback: Revertir el commit de la task; solo agrega aserciones de prueba.)
- S1: Confirmar en el OpenAPI del servidor el código de estado de creación de cuenta de autenticarCuentaDispositivo (creada = true) y alinear, solo si difiere, el test del servidor y el cliente Dart. No cambiar el contrato sin reportarlo. (valida: REQ-18; rollback: Revertir el commit de la task; sin cambios de datos.)
- S2: Aserciones de log (REQ-11) de renovación y reautenticación (S2.T1.5): verificar accountRef, resultado, método, ruta, estado y requestId, y que el log no contiene tokens, secreto ni cuerpos. (valida: REQ-11, test; rollback: Revertir el commit de la task; solo agrega aserciones de prueba.)
- S2: Verificar en alta_dispositivo.dart que reprovisionar() está cableado con _rotarIdentidad() para credencial_dispositivo_invalida; si falta, cablearlo sin reimplementar ninguna de las dos y cubrirlo con una prueba. (valida: REQ-19, REQ-07, REQ-12; rollback: Revertir el commit de la task; las funciones originales no se modifican.)
- S3: Crear el ticket de seguimiento en Kanai para reemplazar el texto provisional de cuentaDispositivoIdentidadNuevaAviso tras la validación de Contenido, crear su issue espejo en GitHub edobacon/taomangalam (como se hizo con TAO-216) y dejar ambas referencias en el KB de TAO-246. Sin TODO en el código. (valida: REQ-14; rollback: Cerrar el ticket de seguimiento y el issue espejo creados; sin cambios de código.)

**Task ops:**

- edit S1.T5 { verify=["cd app && flutter test test/integration/alta_corte_red_test.dart"] }
- edit S3.T2 { desc="Agregar solo en app_es.arb (único idioma del repo) la clave cuentaDispositivoIdentidadNuevaAviso con el texto provisional \"Este teléfono ahora tiene una cuenta nueva. Tus consultantes y consultas siguen guardados aquí, pero ya no están vinculados a tu cuenta anterior.\" y marcarla como provisional hasta la validación de Contenido. Incluye lo que cubría S3.T5 (fusionada aquí), sin tocar otros archivos .arb.", validates=["REQ-08","REQ-14"] }
- delete S3.T5
- edit S3.T4 { desc="Prueba de widget del aviso de identidad nueva: se muestra con datos locales (consultantes o consultas) y credencial_dispositivo_invalida, no se muestra sin datos locales, es legible con lector de pantalla y con escala de texto. Incluye lo que cubría S3.T6 (fusionada aquí).", validates=["REQ-08","REQ-14"], isTest=true }
- delete S3.T6

### Enmienda 3
**REQs:**

- REQ-20 (add) `confirmed`: La prueba de integración del alta con corte de red tiene una sola ubicación en el repo, bajo integration_test/ de la app, fijada tras descub
- REQ-21 (add) `confirmed`: Las aserciones de log del servidor para registrarDispositivo (accountRef seudónimo y resultado, sin token ni código completo) viven en el Su

**Task ops:**

- edit S1.T5 { verify=["pnpm --filter server exec vitest run src/test/s01/dispositivo.test.ts","cd app && flutter test test/device/"] }
- move S1.T8 → S3
- edit S3.T2 { rollback="Revertir solo los cambios en app_es.arb (clave cuentaDispositivoIdentidadNuevaAviso) y su uso asociado; app_es.arb es el único idioma del repo, no hay otros .arb que restaurar." }

### Enmienda 4
**REQs:**

- REQ-04 (edit) `inferred`: Se verifica la precondición del seed sobre el seed del repo (no en cada entorno): el perfil Estándar existe sembrado por el seed de capacida
- REQ-15 (edit) `confirmed`: Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/ y las de la app en app/test/, con u
- REQ-09 (edit) `confirmed`: Sin conexión, la app usa el token y el manifiesto cacheados y no intenta renovar hasta tener red. El reintento tras un corte reutiliza el vi

**Task ops:**

- edit S3.T6 { verify=["cd app && flutter test integration_test"] }
- edit S1.T5 { desc="Supertest de registrarDispositivo en server/src/test/s01/dispositivo.test.ts: 200 con el esquema Dispositivo y versión actualizada, 401 sin bearer o con token de otra cuenta, 403 version_legal_pendiente. Incluye las aserciones de log del servidor (REQ-11 y REQ-21): el log trae accountRef seudónimo y resultado, sin token ni código completo. Más las unitarias de app en app/test/device/ (locale, zona horaria y manejo de error de registrarDispositivo).", validates=["REQ-01","REQ-03","REQ-11","REQ-13","REQ-21"], verify=["pnpm --filter server exec vitest run src/test/s01/dispositivo.test.ts","cd app && flutter test test/device/"] }
- edit S1.T2 { desc="Verificar la precondición del seed del perfil Estándar sobre el seed del repo (no en cada entorno): una prueba que, tras aplicar el seed de capacidades versionado, confirma por consulta que el perfil Estándar existe. No cambia el manejo de error existente del alta.", validates=["REQ-04"] }
- edit S2.T1.2 { verify=["! grep -rnE \"Bearer \" app/lib --include=*.dart --exclude=almacen_seguro_dispositivo.dart --exclude=*token*.dart"] }
- edit S2.T2.2 { verify=["! grep -rnE \"(String|required String) accessToken\" app/lib --include=*.dart --exclude=almacen_seguro_dispositivo.dart --exclude=*token*.dart"] }
- edit S3.T4 { desc="Fusiona la prueba de widget del aviso de identidad nueva (con y sin datos locales, lector de pantalla y escala de texto) con la prueba de widget previa de la sesión. Las aserciones de log (REQ-11) no van aquí: son otra task (S3.T3)." }
- edit S1.T9 { verify=["pnpm --filter server exec vitest run src/test/s01/dispositivo.test.ts"] }
- edit S1.T6 { verify=["cd app && flutter test test/device/"] }
- edit S3.T3 { desc="Prueba de integración del alta con corte de red bajo integration_test/ (ubicación única fijada en S2.T3, REQ-20) contra el servidor local en emulador o simulador: una sola cuenta con la misma Idempotency-Key y datos locales intactos; incluye aserciones de log (REQ-11) y el caso de regresión del manifiesto cacheado sin conexión (sin llamar a renovarToken).", validates=["REQ-09","REQ-10","REQ-11","REQ-20"] }
- edit S3.T7 { desc="Registrar el ticket de seguimiento en Kanai para reemplazar el texto provisional de cuentaDispositivoIdentidadNuevaAviso y dejar la referencia en su KB. Antes de publicar el issue espejo en GitHub edobacon/taomangalam, requiere la confirmación explícita del dev; sin ella no se publica." }

### Enmienda 5
**REQs:**

- REQ-22 (add) `inferred`: Un evento de 'identidad nueva' (emitido al crear una cuenta nueva por credencial_dispositivo_invalida) se conecta con el componente de aviso
- REQ-15 (edit) `confirmed`: Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/ y las de la app en app/test/ (inclu

**Tasks agregadas:**

- S1: Registrar POST /v1/devices (registrarDispositivo) en server/src/app.ts con el middleware de capacidad (capacidad obligatoria, x-requiere-cuenta: dispositivo) y el bloqueo por versión legal, igual que las demás rutas autenticadas no exentas, siguiendo el contrato OpenAPI existente. (valida: REQ-01, REQ-13; rollback: Quitar el registro de la ruta POST /v1/devices de server/src/app.ts.)
- S3: Conectar el evento 'identidad nueva' con el componente de avisos existente para mostrar la clave cuentaDispositivoIdentidadNuevaAviso (app_es.arb) solo cuando hay datos locales en Drift (consultante o consulta); sin datos locales no se muestra. Reusar el componente de avisos existente sin crear uno nuevo. (valida: REQ-08, REQ-22; rollback: Revertir la conexión del evento con el componente de avisos, dejando el evento sin suscriptor visible; no tocar los datos de Drift.)

**Task ops:**

- edit S1.T2 { rollback="Revertir los cambios de la task en el repo (git revert del commit); el seed de capacidades versionado vuelve a su estado previo y el manejo de error existente del alta no cambia.", isTest=true, verify=["pnpm --filter server exec vitest run src/test/s01"] }
- edit S1.T6 { verify=["pnpm --filter server exec vitest run src/test/s01/dispositivo.test.ts"] }
- edit S3.T4 { desc="Test de widget del aviso de identidad nueva bajo app/test/ (convención del repo): con datos locales se muestra el aviso con cuentaDispositivoIdentidadNuevaAviso; sin datos locales no se muestra; el aviso es legible con lector de pantalla (semántica/Semantics) y con textScaler 2.0 sin overflow.", isTest=true }
- edit S3.T3 { desc="Prueba de integración del alta con corte de red bajo integration_test/, sin aserciones de log (las aserciones de log de la integración viven solo en S3.T6)." }
- edit S3.T6 { desc="Aserciones de log (REQ-11) de la integración: alta con corte de red, renovación y reautenticación. Verifican accountRef seudónimo, resultado, método, ruta, estado y requestId, sin tokens, secreto, código completo ni cuerpos. Son las únicas aserciones de log de la integración." }

### Enmienda 6
**REQs:**

- REQ-11 (edit) `inferred`: El alta y la actualización del dispositivo (registrarDispositivo) se registran en el log del servidor con accountRef seudónimo, resultado, m
- REQ-12 (edit) `confirmed`: Reusar lo existente sin reimplementarlo: autenticarCuentaDispositivo del servidor; AlmacenSeguroDispositivo y el vigilante de red de alta_di
- REQ-15 (edit) `confirmed`: Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/ y las de la app en app/test/, con u

**Task ops:**

- delete S2.T1
- delete S2.T2
- delete S2.T3
- delete S2.T4
- delete S2.T5
- delete S2.T6
- delete S2.T7
- delete S2.T8
- delete S2.T9
- delete S2.T10
- delete S2.T11
- delete S2.T12
- delete S2.T13
- delete S2.T14
- delete S3.T1
- delete S3.T2
- delete S3.T4
- delete S3.T5
- delete S3.T6
- delete S3.T7

**REQ ops:**

- remove REQ-05
- remove REQ-06
- remove REQ-07
- remove REQ-08
- remove REQ-09
- remove REQ-14
- remove REQ-16
- remove REQ-19
- remove REQ-22

### Enmienda 7
**REQs:**

- REQ-21 (edit) `confirmed`: Las aserciones de log del servidor para registrarDispositivo viven en el Supertest server/src/test/s01/dispositivo.test.ts, que es el que ej

**Task ops:**

- edit S3.T3 { desc="Prueba de integración de la app contra el servidor local, ejecutada en emulador o simulador (no dispositivo real), ubicada únicamente bajo integration_test/ de la app. Corta la red a mitad del alta y la restablece, y verifica que se crea una sola cuenta con la misma Idempotency-Key y que los datos locales (Drift) quedan intactos. Incluye aserciones sobre el log del servidor de registrarDispositivo: accountRef seudónimo, resultado, método, ruta, estado y requestId presentes, y sin token, secreto ni código completo. Los comandos del servidor local y del runner se fijan tras descubrir el harness existente del repo.", validates=["REQ-10","REQ-11","REQ-15","REQ-20"], isTest=true }
- edit S1.T5 { validates=["REQ-01","REQ-02","REQ-11","REQ-12","REQ-13","REQ-17","REQ-21"] }

### Enmienda 8
**REQs:**

- REQ-22 (edit) `confirmed`: Las dependencias existentes de zona horaria (paquete timezone) y de locale con formato BCP 47 quedan documentadas como dependencias del tick

**Task ops:**

- edit S1.T3 { desc="Producir la documentación de las dependencias existentes (paquete timezone y locale con formato BCP 47) en la ficha técnica del cambio bajo docs/. El ejecutor fija la ruta siguiendo la convención del repo. No agregar paquetes nuevos ni reimplementar la lectura (REQ-17).", validates=["REQ-17"] }
- edit S1.T5 { desc="Ejecutar y verificar el Supertest real server/src/test/s01/dispositivo.test.ts y las unitarias de app/test/device/. Además verificar solamente (sin producir) que la ficha técnica bajo docs/ creada por S1.T3 documenta el paquete timezone y el locale BCP 47 (REQ-17)." }
- edit S1.T2 { rollback="No modifica el seed. Si la prueba de la precondición revela que falta el perfil Estándar, el ejecutor se detiene y reporta: agregarlo al seed es un cambio de seed_rbac que requiere aprobación humana explícita." }
- edit S3.T1 { desc="Prueba de integración del alta con corte de red bajo integration_test/ (ubicación única, REQ-20). Las aserciones sobre el log del servidor (REQ-11) solo se hacen si el harness permite capturar el log del servidor; si no lo permite, el ejecutor lo reporta sin inventar ningún mecanismo y las aserciones de log quedan solo en el Supertest de S1.T5 (REQ-21)." }

### Enmienda 9
**REQs:**

- REQ-11 (edit) `confirmed`: El alta y la actualización del dispositivo (registrarDispositivo) se registran en el log del servidor con accountRef seudónimo, resultado, m
- REQ-22 (edit) `confirmed`: Las dependencias existentes de zona horaria (paquete timezone) y de locale con formato BCP 47 quedan documentadas como dependencias del tick

**Tasks agregadas:**

- S1: Implementar REQ-02 en la app: leer el locale del sistema en formato BCP 47 y la zona horaria con el paquete timezone ya presente (sin agregar paquetes), y pasarlos como locale y timezoneId reales al servicio de alta en alta_dispositivo.dart y puerto_registro_api.dart, reemplazando los valores nulos actuales. Si la lectura de locale o de zona falla, registrar la falla en el log de la app (sin secreto ni código completo) y continuar el alta con el valor disponible, sin romper el flujo existente. No tocar Drift ni AlmacenSeguroDispositivo. (valida: REQ-02, REQ-12, REQ-22; rollback: Revertir solo los cambios de esta task en alta_dispositivo.dart y puerto_registro_api.dart (git revert del commit de la task); el alta vuelve a enviar locale y timezoneId nulos sin afectar cuentas ni datos locales ya creados.)
- S1: Pruebas que AGREGAN casos nuevos sin borrar ni reescribir los existentes. (a) En server/src/test/s01/dispositivo.test.ts: Supertest de POST /v1/devices con 200 (dispositivo actualizado con versión de app, versión del sistema y modelo), 401 sin bearer, 403 version_legal_pendiente con versión legal pendiente, y cuenta ajena (un token de otra cuenta actúa solo sobre el dispositivo de la cuenta autenticada), más las aserciones de log de REQ-21 (accountRef seudónimo, resultado, método, ruta, estado y requestId; sin token, secreto, código completo ni cuerpos). (b) En app/test/device/: unitaria que verifica que el alta envía locale BCP 47 y timezoneId reales (no nulos) y unitaria del 404 de registrarDispositivo que se trata como error de ruta y no se reintenta (REQ-03), distinguiéndolo de una falla de red o 5xx que sí se difiere. (valida: REQ-01, REQ-02, REQ-03, REQ-11, REQ-21, test; rollback: Revertir solo los casos agregados por esta task; dispositivo.test.ts y los archivos existentes de app/test/device/ se conservan sin borrarse.)

**Task ops:**

- edit S1.T1 { desc="Implementar o completar POST /v1/devices (registrarDispositivo) en el servidor según el contrato OpenAPI existente (REQ-01, REQ-13). Confirmar que el log de registrarDispositivo incluye método, ruta, estado y requestId, además de accountRef seudónimo y resultado, y sin token, secreto, código completo ni cuerpos; si falta alguno de esos campos, agregarlo siguiendo el logger existente del servidor.", validates=["REQ-01","REQ-11","REQ-13"] }
- edit S1.T5 { rollback="Revertir solo los casos agregados por la task de pruebas de la sesión 1; no se borra server/src/test/s01/dispositivo.test.ts ni los archivos existentes de app/test/device/.", verify=["pnpm --filter server exec vitest run src/test/s01/dispositivo.test.ts","cd app && flutter test test/device/","grep -rlE \"BCP 47\" docs/ | xargs grep -l \"timezone\""] }
- edit S3.T3 { desc="Prueba de integración del alta con corte de red bajo integration_test/ de la app (única ubicación, REQ-20) contra el servidor local en emulador o simulador: si la red se corta a mitad del alta y vuelve, se crea una sola cuenta con la misma Idempotency-Key y los datos locales quedan intactos. Las aserciones de log (REQ-11) se hacen solo si el harness permite capturar el log del servidor; si no, se reporta la limitación sin inventar un mecanismo y las aserciones de log quedan solo en el Supertest de S1.T5 (REQ-21). El gate de la sesión 3 acepta ese reporte.", rollback="Eliminar solo lo que el ticket creó del harness (el archivo de la prueba de integración y los ayudantes que agregó); lo preexistente del harness no se modifica ni se borra.", validates=["REQ-10","REQ-11","REQ-20"] }

**REQ ops:**

- remove REQ-17

### Enmienda 10
**REQs:**

- REQ-15 (edit) `confirmed`: Las pruebas del ticket siguen las convenciones existentes del repo: las del servidor en server/src/test/, las de la app en app/test/ y la pr
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T9
- [ ] S1.T10
- [ ] S1.T11
- [ ] S1.T12

**Gate (auto)**: Supertest verde para POST /v1/devices (200, 401, 403 version_legal_pendiente, alcance a la cuenta propia). Prueba unitaria de la app que confirma locale y timezoneId reales enviados al alta, y prueba que confirma que un 404 de registrarDispositivo no se reintenta.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T3

**Gate (auto)**: La prueba de integración de la app contra el servidor local, bajo integration_test/ y en emulador o simulador, pasa con corte de red a mitad del alta: queda 1 cuenta en la base para el código del dispositivo, la misma Idempotency-Key en el reintento y consultante y consulta locales intactos. El log del servidor de registrarDispositivo trae accountRef y resultado, sin token ni código completo.
