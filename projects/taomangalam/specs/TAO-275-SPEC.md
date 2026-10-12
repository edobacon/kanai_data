---
id: TAO-275-SPEC
project: taomangalam
ticket: TAO-275
status: draft
---

# TAO-275 · Recuperación de sesión de la app con código y secreto: cliente HTTP con fuente única del bearer, renovación compartida, reautenticación y aviso de identidad nueva

## Resumen ejecutivo

Qué se hace: los puertos de la app (cuenta, registro, legal, manifiesto) pasan a un cliente HTTP autenticado que toma el bearer de una fuente única. Un interceptor atiende el 401 token_expirado: renueva una sola vez aunque haya varias peticiones a la vez, guarda el par nuevo en AlmacenSeguroDispositivo y repite la petición. Si el refresh es inválido o no existe, se encadena a reprovisionar() con clave nueva. Si llega credencial_dispositivo_invalida, se rota la identidad con _rotarIdentidad, se crea una cuenta nueva y se muestra el aviso cuentaDispositivoIdentidadNuevaAviso solo cuando hay consultantes o consultas locales. Sin red no se renueva, y el vigilante existente reintenta al volver la conexión. Qué NO se hace: emisión y rotación en el servidor, el flujo de alta (solo se dispara), el cierre de sesión (EP-03b) y la prueba en dispositivo real. Cómo se sabe que funciona: tres peticiones con el token vencido producen una sola llamada a renovarToken; un refresh revocado conserva la misma cuenta_id; un secreto alterado da creada=true y deja Drift intacto; un test de integración contra el servidor local con corte de red pasa, usando un access token de 60 s (solo en development). Tamaño: 3 sesiones T2, unas 5 a 7 horas, dentro del techo de 4. ADVERTENCIA: el seguimiento del texto provisional del aviso se registra como ticket en Kanai con issue espejo en GitHub (lo pide la adenda) y no se escribe como TODO en el código. ADVERTENCIA: el interceptor no debe interceptar las llamadas de autenticarCuentaDispositivo ni las de renovarToken, porque eso provocaría bucles de renovación.
Datos a confirmar antes de ejecutar: (1) Las rutas exactas de los puertos de cuenta, legal y manifiesto que hoy reciben el accessToken por parámetro: buscar 'Bearer ' en app/lib/features. (2) El cuerpo del 401 de token vencido: el request dice token_expirado, falta confirmar si viaja en el campo 'codigo' del problem+json, como credencial_dispositivo_invalida, en server/src/auth. (3) El código del refresh inválido o rotado: el request dice refresh_invalido, falta confirmarlo en server/src/auth/registro-dispositivo.ts. (4) El nombre de la variable de configuración de la vigencia del access token en el servidor y dónde se lee: server/src y docs/development/configuration.md. (5) El runner y el comando de tests del servidor: server/package.json. (6) El comando de arranque del servidor local de pruebas: la adenda pide que el ejecutor lo descubra y fije los verify; revisar docs/development/commands.md y CONTRIBUTING.md. (7) Las tablas Drift de consultantes y consultas para detectar datos locales: app/lib/data/drift/app_database.dart. (8) La firma de renovarToken en el AuthApi generado: paquete tao_mangalam_api.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/features/cuenta/data/puerto_registro_api.dart:60

Toda petición autenticada de los puertos de cuenta, registro, legal y manifiesto toma el bearer de una fuente única: un cliente HTTP autenticado que lee el token vigente de AlmacenSeguroDispositivo. Qué: ningún puerto recibe accessToken por parámetro (hoy registrarDispositivo lo recibe y arma el header a mano). Por qué: sin una fuente única, una renovación no llega a los puertos y cada uno puede enviar un token viejo.

### REQ-02 `inferred`
> Fuente: taomangalam/app/lib/features/cuenta/data/alta_dispositivo.dart:218

Ante un 401 token_expirado, el cliente autenticado llama a renovarToken con el refresh guardado, guarda el par nuevo con guardarTokens y repite la petición original una sola vez. Si hay peticiones simultáneas, todas esperan una misma renovación en vuelo. Qué: renovación silenciosa y de una sola llamada. Por qué: la persona no debe ver errores, y la rotación del refresh se rompe si se renueva dos veces en paralelo.

### REQ-03 `confirmed`
> Fuente: pedido de cambio punto 1

Si renovarToken responde refresh_invalido, o no hay refresh guardado, la app encadena a reprovisionar() con una clave de idempotencia nueva y se reautentica con código y secreto, obteniendo tokens de la misma cuenta_id. S2.T1 implementa un único Completer de reprovisión en vuelo, compartido por todas las peticiones simultáneas que reciben refresh_invalido, que se libera al terminar tanto con éxito como con error; S2.T7 solo agrega la prueba de 3 peticiones y 1 reprovisión, y la sesión 1 solo cubre la renovación compartida. Se verifica que reprovisionar() esté cableado con _rotarIdentidad() y, si falta, se cablea. Qué: reautenticación transparente y de una sola llamada. Por qué: un refresh revocado o rotado no debe dejar a la instalación sin sesión, y reprovisionar en paralelo duplicaría la rotación de identidad.

### REQ-04 `confirmed`
> Fuente: adenda 1 Q1 y pedido de cambio punto 1

Si la reautenticación recibe credencial_dispositivo_invalida (CredencialDispositivoRechazada), la app descarta la credencial, genera código y secreto nuevos y crea una cuenta nueva con el flujo de alta existente (creada=true). Si hay consultantes o consultas locales, el aviso con la clave cuentaDispositivoIdentidadNuevaAviso se presenta en la UI mediante el componente de avisos existente, con un punto de consumo que lo muestra. El texto provisional es exactamente: 'Este telefono ahora tiene una cuenta nueva. Tus consultantes y consultas siguen guardados aqui, pero ya no estan vinculados a tu cuenta anterior.' La clave existe solo en app_es.arb y es provisional hasta la validación de Contenido. Sin datos locales no muestra aviso (DEC-232). Drift no se toca. Qué: identidad nueva sin pérdida de datos y con aviso visible. Por qué: una credencial rechazada no se recupera reintentando, y un aviso emitido que no se muestra no cumple el criterio.

### REQ-05 `confirmed`
> Fuente: taomangalam/app/lib/features/cuenta/data/alta_dispositivo.dart:304

Sin conexión, la app usa el token y el manifiesto cacheados y no intenta renovar hasta tener red. El reintento de una renovación cortada lo hace el VigilanteDeAlta existente al reconectar. Qué: degradación offline sin pérdida. Por qué: un corte de red no debe gastar el refresh ni tocar los datos locales.

### REQ-06 `confirmed`
> Fuente: adenda 1 Q4 y pedido de cambio punto 2

En development, la vigencia del access token se puede reducir a 60 s con una variable de configuración del servidor que solo aplica en development. En producción rige la vigencia normal de 15 min y staging no se ve afectado. Qué: un modo de prueba de vencimiento. Por qué: QA-03a-04-01 necesita que el token venza en minutos (adenda Q4).

### REQ-07 `confirmed`
> Fuente: adenda 1, adenda 2 punto 4 y pedido de cambio punto 3

El recorrido completo se prueba contra el servidor local de pruebas con un corte de red simulado, ejecutado en emulador o simulador, sin cuentas de Apple ni de Google: vencimiento con renovación silenciosa, refresh revocado con la misma cuenta_id (QA-03a-04-02 se valida contra el servidor local en emulador), secreto alterado con cuenta nueva, y corte y vuelta de red sin cambios en los datos locales. La corrida de QA-03a-04-02 contra staging queda como verificación manual diferida y no bloquea el cierre, igual que la prueba en dispositivo real. Qué: evidencia de punta a punta. Por qué: es el resultado que pide el objetivo del request.

### REQ-08 `inferred` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

Variante docs de superficie: el comando para levantar el servidor local de pruebas, el comando del test de integración del recorrido y la variable de vigencia de 60 s quedan documentados con uso, parámetros y ejemplo en docs/development/commands.md (comandos) y docs/development/configuration.md (variable, aclarando que solo aplica en development). El nombre de la variable en configuration.md coincide exactamente con el nombre que lee el servidor.

### REQ-09 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/features/cuenta/data/puerto_registro_api.dart:140

El cambio reutiliza las piezas existentes y no crea equivalentes: AlmacenSeguroDispositivo para leer y guardar los tokens (nunca Drift), la clasificación de PuertoRegistroApi._rechazo/_traducir (FallaDeRed, CredencialDispositivoRechazada, VersionLegalPendiente), ReprovisionDispositivo.reprovisionar, _rotarIdentidad, VigilanteDeAlta/Sincronizable para el reintento, el AuthApi generado (renovarToken) y el appAuthApiProvider de core/http/app_client.dart.

### REQ-10 `confirmed`
> Fuente: adenda 1, adenda 2 punto 7, adenda 3 punto 3 y pedido de cambio punto 3

El seguimiento del texto provisional del aviso se registra como ticket de seguimiento en Kanai, con issue espejo en GitHub en edobacon/taomangalam y una referencia a ambos en el KB del ticket, no como TODO en el código. Nada se publica sin confirmación explícita del dev: primero se presenta el borrador y se espera la confirmación, y solo después se crea el ticket y el issue, registrando como evidencia el id del ticket y la URL del issue. Qué: puerta de confirmación previa a publicar. Por qué: publicar en un servicio externo es difícil de revertir (adenda 1, adenda 2 punto 7, adenda 3 punto 3).

### REQ-11 `confirmed` `enforcement`
> Fuente: pedido de cambio punto 5; REQ-09

El cliente autenticado clasifica los errores de red del interceptor reutilizando PuertoRegistroApi._traducir, extrayéndolo a una función compartida o exponiéndolo, sin crear una clasificación equivalente. Qué: una sola traducción de errores HTTP/red a FallaDeRed, CredencialDispositivoRechazada y VersionLegalPendiente. Por qué: evita divergencia entre el puerto de registro y el interceptor.
## Tasks

#### S1.T1 — Crear el cliente HTTP autenticado con fuente única del bearer: un interceptor de Dio, junto a core/http/app_client.dart, que lee leerTokens() de AlmacenSeguroDispositivo en cada petición y agrega 'Authorization: Bearer <accessToken>'. Excluye autenticarCuentaDispositivo y renovarToken. Expone un provider Riverpod keepAlive con el mismo patrón de alta_dispositivo_providers.dart:25-27.
Contrato: rollback: git revert del commit. Los puertos siguen recibiendo el token por parámetro.. Status: pending

#### S1.T2 — Migrar los puertos al cliente autenticado y quitar el accessToken por parámetro.
Contrato: rollback: git revert del commit de migración. La firma anterior de los puertos se restaura.. Status: pending

#### S1.T2.1 — PuertoRegistroDispositivo.registrarDispositivo (alta_dispositivo.dart:269) y PuertoRegistroApi.registrarDispositivo (puerto_registro_api.dart:60-71): quitar accessToken y el header manual, y ajustar los llamadores en alta_dispositivo.dart:534, 543 y 556.
Contrato: rollback: git revert del commit. Se restaura el parámetro accessToken.. Status: pending

#### S1.T2.2 — Puertos de cuenta, legal y manifiesto: reemplazar el bearer recibido por parámetro por el cliente autenticado. Las rutas exactas se confirman buscando 'Bearer ' en app/lib/features.
Contrato: rollback: git revert del commit. Los puertos vuelven a recibir el token.. Status: pending

#### S1.T3 — Implementar el interceptor del cliente autenticado. La clasificación de errores de red reutiliza PuertoRegistroApi._traducir, extrayéndolo a una función compartida o exponiéndolo, sin crear una clasificación equivalente.
Contrato: rollback: git revert del commit. Se quita la renovación del interceptor y el 401 vuelve a subir como antes.. Status: pending

#### S1.T4 — Solo cobertura de test de la migración del puerto de registro al cliente autenticado (sin bearer por parámetro); crea puerto_registro_api_test.dart si no existe. No agrega código de producción.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending

#### S1.T5 — Escribir el test de renovación compartida: tres peticiones simultáneas con access token vencido producen una sola llamada a renovarToken y las tres se completan. Este test NO cubre refresh_invalido ni la reprovisión: el caso de 3 peticiones con refresh_invalido y 1 reprovisión se implementa en la sesión 2 junto al encadenamiento a reprovisionar().
Contrato: rollback: Eliminar el caso de prueba agregado por esta task.. Status: pending

#### S2.T1 — Implementar el encadenamiento a reprovisionar() ante refresh_invalido o refresh ausente, con clave de idempotencia nueva y un único Completer de reprovisión en vuelo compartido por las peticiones simultáneas; el Completer se libera al terminar con éxito o con error (try/finally).
Contrato: rollback: git revert del commit. El interceptor vuelve a propagar refresh_invalido sin reprovisionar.. Status: pending

#### S2.T2 — Aviso de identidad nueva: agregar la clave cuentaDispositivoIdentidadNuevaAviso solo en app_es.arb con el texto provisional literal 'Este teléfono ahora tiene una cuenta nueva. Tus consultantes y consultas siguen guardados aquí, pero ya no están vinculados a tu cuenta anterior.'. Después de _rotarIdentidad con creada=true, consultar con un count acotado (sin cargar filas) si hay consultantes o consultas en AppDatabase y emitir el aviso solo en ese caso (DEC-232). Drift no se escribe.
Contrato: rollback: git revert del commit. Se quita la clave del arb y la emisión del aviso.. Status: pending

#### S2.T3 — Presentar al dev el borrador del ticket de seguimiento del texto provisional del aviso (clave cuentaDispositivoIdentidadNuevaAviso) y de su issue espejo en GitHub, y esperar su confirmación explícita. Solo después de la confirmación, crear el ticket en Kanai y el issue espejo en GitHub, y registrar como evidencia el id del ticket y la URL del issue. No publicar nada antes de la confirmación.
Contrato: rollback: Si ya se publicó: cerrar el issue espejo en GitHub y cancelar el ticket de seguimiento en Kanai, informando al dev.. Status: pending

#### S2.T4 — Tests de la sesión: refresh_invalido con creada=false y la misma cuentaId, refresh ausente directo a reprovisionar, claves de idempotencia distintas, credencial rechazada con datos locales (aviso y Drift intacto), sin datos (sin aviso), solo una consulta (con aviso), y falla de red en el alta nueva. Regresión: cierre_cuenta_convertida_test.dart.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending

#### S2.T5 — Agregar el punto de consumo del aviso de identidad nueva en la UI usando el componente de avisos existente (sin crear uno nuevo), mostrando la clave cuentaDispositivoIdentidadNuevaAviso solo cuando hay consultantes o consultas locales. Incluir una prueba de widget que falla si el aviso emitido no llega a mostrarse.
Contrato: rollback: Revertir el commit de la task; se quita el consumo del aviso en la UI.. Status: pending

#### S2.T7 — Agregar solo el test de 3 peticiones simultáneas con refresh_invalido y 1 sola reprovisión, más el caso de liberación del Completer tras error, en recuperacion_sesion_test.dart. No modifica código de producción.
Contrato: rollback: Eliminar el caso de prueba agregado; no hay cambios de código de producción.. Status: pending

#### S3.T1 — Servidor: variable de configuración de la vigencia del access token que solo se aplica en development (60 s para la prueba) y se ignora fuera de development, leída donde se emiten los tokens en server/src/auth/registro-dispositivo.ts. El nombre de la variable se confirma en la configuración existente.
Contrato: rollback: git revert del commit. La vigencia vuelve a ser fija.. Status: pending

#### S3.T2 — Offline: sin red, no renovar y usar el token y el manifiesto cacheados. Una renovación cortada por FallaDeRed queda pendiente como Sincronizable y la reintenta el VigilanteDeAlta existente (alta_dispositivo.dart:304-321) al reconectar, compartiendo la renovación en vuelo.
Contrato: rollback: git revert del commit. La renovación cortada vuelve a propagarse como FallaDeRed.. Status: pending

#### S3.T3 — Documentar en docs/development/commands.md el arranque del servidor local de pruebas (lo descubre el ejecutor, según la adenda) y el comando del test de integración del recorrido, con un ejemplo. Documentar en docs/development/configuration.md la variable de vigencia del access token (ejemplo 60, solo development).
Contrato: rollback: git revert del commit de docs.. Status: pending

#### S3.T4 — Tests de la sesión: unitarios de vigencia en el servidor (60 s en development, ignorada en producción, por defecto sin la variable). Unitarios offline (sin renovar, reintento al reconectar, varias reconexiones con 1 sola renovación, Drift igual). Test de integración de la app contra el servidor local con corte de red simulado (QA-03a-04-01, 02 y 03, y corte durante la renovación). Chequeo de que la variable usada en el servidor figure en configuration.md.
Contrato: rollback: Borrar los tests nuevos.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-03 (edit) `confirmed`: Si renovarToken responde refresh_invalido, o no hay refresh guardado, la app encadena a reprovisionar() con una clave de idempotencia nueva 
- REQ-04 (edit) `confirmed`: Si la reautenticación recibe credencial_dispositivo_invalida (CredencialDispositivoRechazada), la app descarta la credencial, genera código 
- REQ-07 (edit) `inferred`: El recorrido completo se prueba contra el servidor local de pruebas con un corte de red simulado: vencimiento con renovación silenciosa, ref
- REQ-08 (edit) `inferred`: Variante docs de superficie: el comando para levantar el servidor local de pruebas, el comando del test de integración del recorrido y la va
- REQ-10 (add) `confirmed`: La creación del ticket de seguimiento del texto provisional del aviso en Kanai y su issue espejo en GitHub no se publica sin confirmación ex

**Tasks agregadas:**

- S1: Compartir una sola reprovisión entre peticiones simultáneas que reciben refresh_invalido: en el cliente HTTP autenticado (app/lib/core/http/app_client.dart) mantener un Completer único de reprovisión en vuelo que reutilizan todas las peticiones, y liberarlo al terminar (éxito o error). Añadir un caso de prueba con 3 peticiones simultáneas con refresh_invalido que verifique 1 sola llamada a reprovisionar() y que las 3 se completan. (valida: REQ-03; rollback: Revertir el commit de la task; vuelve a una reprovisión por petición.)
- S2: Agregar el punto de consumo del aviso de identidad nueva en la UI usando el componente de avisos existente (sin crear uno nuevo), mostrando la clave cuentaDispositivoIdentidadNuevaAviso solo cuando hay consultantes o consultas locales. Incluir una prueba de widget que falla si el aviso emitido no llega a mostrarse. (valida: REQ-04, REQ-09; rollback: Revertir el commit de la task; se quita el consumo del aviso en la UI.)
- S2: Antes de publicar el ticket de seguimiento del texto provisional (Kanai) y su issue espejo en GitHub, presentar el borrador al dev y esperar su confirmación explícita. No publicar sin ella. (valida: REQ-10; rollback: Si se publicó por error, cerrar el issue de GitHub y eliminar el ticket de seguimiento en Kanai.)

**Task ops:**

- edit S1.T2.2 { verify=["cd app && flutter analyze lib/features"] }
- edit S3.T3 { verify=["grep -n \"60\" docs/development/configuration.md","grep -n \"development\" docs/development/configuration.md"] }

### Enmienda 2
**REQs:**

- REQ-03 (edit) `confirmed`: Si renovarToken responde refresh_invalido, o no hay refresh guardado, la app encadena a reprovisionar() con una clave de idempotencia nueva 
- REQ-10 (edit) `confirmed`: La creación del ticket de seguimiento del texto provisional del aviso en Kanai y su issue espejo en GitHub no se publica sin confirmación ex

**Tasks agregadas:**

- S2: Escribir el test de la prueba de 3 peticiones simultáneas que reciben refresh_invalido y verifican que reprovisionar() se invoca una sola vez (mismo Completer) y que las tres peticiones se completan. Va junto al encadenamiento a reprovisionar() de S2.T1 y reemplaza el caso que estaba en S1.T5. (valida: REQ-03, test; rollback: Eliminar el caso de prueba agregado; no hay cambios de código de producción.)

**Task ops:**

- edit S1.T5 { desc="Escribir el test de renovación compartida: tres peticiones simultáneas con access token vencido producen una sola llamada a renovarToken y las tres se completan. Este test NO cubre refresh_invalido ni la reprovisión: el caso de 3 peticiones con refresh_invalido y 1 reprovisión se implementa en la sesión 2 junto al encadenamiento a reprovisionar().", validates=["REQ-02"], isTest=true }
- edit S1.T4 { desc="Migrar PuertoRegistroApi al cliente HTTP autenticado (sin recibir accessToken por parámetro) y cubrirlo con puerto_registro_api_test.dart; si el archivo no existe, crearlo junto a los tests de puertos existentes bajo app/test.", validates=["REQ-01"], isTest=true }
- edit S2.T3 { desc="Presentar al dev el borrador del ticket de seguimiento del texto provisional del aviso (clave cuentaDispositivoIdentidadNuevaAviso) y de su issue espejo en GitHub, y esperar su confirmación explícita. Solo después de la confirmación, crear el ticket en Kanai y el issue espejo en GitHub, y registrar como evidencia el id del ticket y la URL del issue. No publicar nada antes de la confirmación.", rollback="Si ya se publicó: cerrar el issue espejo en GitHub y cancelar el ticket de seguimiento en Kanai, informando al dev.", validates=["REQ-10"], isTest=false, verify=[] }
- edit S3.T3 { verify=["for v in $(grep -rhoE 'process\\.env\\.[A-Z0-9_]*(TTL|VIGENCIA|EXPIR)[A-Z0-9_]*' server/src | sed 's/process\\.env\\.//' | sort -u); do grep -nF \"$v\" docs/development/configuration.md || exit 1; done"] }

### Enmienda 3
**REQs:**

- REQ-11 (add) `confirmed`: El cliente autenticado clasifica los errores de red del interceptor reutilizando PuertoRegistroApi._traducir, extrayéndolo a una función com
- REQ-03 (edit) `confirmed`: Si renovarToken responde refresh_invalido, o no hay refresh guardado, la app encadena a reprovisionar() con una clave de idempotencia nueva 

**Task ops:**

- edit S2.T1 { desc="Implementar el encadenamiento a reprovisionar() ante refresh_invalido o refresh ausente, con clave de idempotencia nueva y un único Completer de reprovisión en vuelo compartido por las peticiones simultáneas; el Completer se libera al terminar con éxito o con error (try/finally).", validates=["REQ-03"] }
- edit S2.T7 { desc="Agregar solo el test de 3 peticiones simultáneas con refresh_invalido y 1 sola reprovisión, más el caso de liberación del Completer tras error, en recuperacion_sesion_test.dart. No modifica código de producción.", validates=["REQ-03"], isTest=true, verify=["flutter test test/features/cuenta/recuperacion_sesion_test.dart"] }
- edit S1.T3 { desc="Implementar el interceptor del cliente autenticado. La clasificación de errores de red reutiliza PuertoRegistroApi._traducir, extrayéndolo a una función compartida o exponiéndolo, sin crear una clasificación equivalente.", validates=["REQ-02","REQ-11"] }
- edit S1.T4 { desc="Solo cobertura de test de la migración del puerto de registro al cliente autenticado (sin bearer por parámetro); crea puerto_registro_api_test.dart si no existe. No agrega código de producción.", validates=["REQ-01"], isTest=true }
- edit S1.T5 { rollback="Eliminar el caso de prueba agregado por esta task." }

### Enmienda 4
**REQs:**

- REQ-04 (edit) `confirmed`: Si la reautenticación recibe credencial_dispositivo_invalida (CredencialDispositivoRechazada), la app descarta la credencial, genera código 
- REQ-06 (edit) `confirmed`: En development, la vigencia del access token se puede reducir a 60 s con una variable de configuración del servidor que solo aplica en devel
- REQ-07 (edit) `confirmed`: El recorrido completo se prueba contra el servidor local de pruebas con un corte de red simulado, ejecutado en emulador o simulador, sin cue
- REQ-10 (edit) `confirmed`: El seguimiento del texto provisional del aviso se registra como ticket de seguimiento en Kanai, con issue espejo en GitHub en edobacon/taoma
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T2.1
- [ ] S1.T2.2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5

**Gate (auto)**: Los tests de app/test/core/http pasan: los puertos toman el bearer de la fuente única, un 401 token_expirado se renueva y repite una vez, y tres peticiones simultáneas producen 1 sola llamada a renovarToken.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5
- [ ] S2.T7

**Gate (auto)**: Los tests de app/test/features/cuenta muestran que un refresh_invalido termina en la misma cuenta_id, y que credencial_dispositivo_invalida da creada=true con el aviso cuentaDispositivoIdentidadNuevaAviso solo si hay datos locales. En un emulador con consultantes se ve el aviso tras alterar el secreto.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: El test de integración contra el servidor local pasa los escenarios QA-03a-04-01 a 03 y el corte de red durante la renovación. commands.md y configuration.md documentan el arranque, el test y la variable de 60 s.

### Session 4 · T0 · open
