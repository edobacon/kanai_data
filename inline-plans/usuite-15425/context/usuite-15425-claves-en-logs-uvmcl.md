---
id: DOC-kb-sp12-usuite-15425-claves-en-logs-uvmcl
project: up1
type: doc
module: sandbox-api/user-api
tags:
  - usuite-15425
  - seguridad
  - logs
  - legacy
  - sandbox-api
  - uvmcl
  - login
---

# USUITE-15425: contraseñas en los logs de suite-api (uvmcl). Análisis, plan de prueba y esfuerzo

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · Estado al 2026-09-28: Backlog · Producto: uPlanner Suite (legacy), no UP1.
> Código analizado: `sandbox-api` (sub-repo `server/api/user-api`, rama `develop` @ `6778950`), `suite-front`, `sandbox-front` y `platform-gitops`. Análisis de solo lectura.

## En una frase

Cuando un usuario de uvmcl inicia sesión, el backend escribe en el log la respuesta completa del servicio de login del cliente, y esa respuesta trae la contraseña (`CLAVE`) junto con nombre, RUT y correos. Esto **no depende del modo debug**: se usa `console.log`, que imprime siempre, sin importar el nivel de log configurado.

## Qué se decidió hasta ahora

| Tema | Decisión | Estado |
|---|---|---|
| Alcance | Un solo cambio de código que cubre todos los flujos de login; se valida y despliega **solo en uvmcl**. Los demás clientes quedan listos | Acordado |
| Necesidad de soporte | La info de la clave se usa para depurar, así que debe poder consultarse | Acordado |
| Restricción operativa | Después del despliegue del arreglo, **depurar no puede requerir otro despliegue** (nada de envs que se activan o desactivan) | Acordado |
| Mecanismo | **Cifrado asimétrico siempre activo**, con la llave pública leída en caliente desde AWS Secrets Manager | Propuesto, pendiente de confirmación |
| Alternativa | Huella (HMAC) + flags, sin clave recuperable | Queda como plan B |

## Alcance

- **Dentro:** corregir el código una sola vez (el código de `sandbox-api` es el mismo para todos los clientes), cubriendo todos los flujos de login, y validarlo y desplegarlo solo en uvmcl.
- **Fuera (queda listo, no se valida ahora):** despliegue y validación en los demás clientes. Se hace después, por tipo de login (ver "Después de uvmcl").

## Glosario mínimo

- **Tipo de login (`LOGIN_INTEGRATION`):** cada cliente configura cómo se validan sus usuarios: contra un WebService SOAP del cliente (`WSDL`), un POST HTTP (`POST`), Active Directory (`AD`), `LDAP`, `SAML`, `OPENID`, `TOKEN`, etc. Todos viven en el mismo código; la configuración elige cuál se usa.
- **Nivel de log:** el logger (`winston`) solo imprime los mensajes de nivel igual o más grave que el configurado (`error` > `warn` > `info` > ... > `silly`). `console.log` **no** pasa por este filtro.
- **Sanitizar:** hacer una copia del dato que se va a loguear, reemplazar los campos sensibles y loguear la copia, nunca el original.
- **Base64:** un cambio de formato, no un cifrado. Cualquiera lo revierte sin llave.
- **Cifrado simétrico:** la misma llave cifra y descifra. Si el pod cifra, el pod también puede descifrar.
- **Cifrado asimétrico:** un par de llaves. La **pública** solo cifra; la **privada** descifra. El pod tiene solo la pública, así que no puede leer lo que escribió.

## Flujo del login en uvmcl (tipo WSDL)

1. El front envía usuario y contraseña en base64 a `POST /` de user-api (`suite-front/components/organisms/login/OAppAuthStrategyWebV2.vue:108`). La ruta se elige por `LOGIN_INTEGRATION=WSDL` (`user-api/index.js:151`).
2. `webserviceLoginApi` decodifica la contraseña y la inserta en el request SOAP (`user-api/loginServices.js:155`, `searchAndReplacePasswordDeep`).
3. Se llama al servicio del cliente. Con la respuesta, **`loginServices.js:243`** ejecuta `console.log('Login user response', name, result)`. **Aquí se filtra CLAVE + datos personales.** Línea agregada en abril de 2024.
4. Se parsea la respuesta y se arma la sesión `req.session.cas_userinfo` (incluye `pass` en texto plano), y se continúa con `wsdlLogin`.
5. Variante estudiantes: `POST /students` → `wsdlProcess` (`loginServices.js:725`). En error de validación hace `console.log(response, result)` (`loginServices.js:815`) con la respuesta parseada, que también puede traer CLAVE.

> Supuesto a confirmar: que uvmcl es tipo WSDL se deduce de que el texto `Login user response` solo existe en ese flujo. La configuración por cliente vive en secrets, no en el repo.

## Hallazgos en todos los flujos de login

El arreglo se aplica a todos, porque el código es uno solo. Solo los marcados para uvmcl se prueban en esta etapa.

| # | Severidad | Dónde | Qué expone | ¿Lo usa uvmcl? |
|---|---|---|---|---|
| 1 | Alta | `loginServices.js:243` (WSDL) | Respuesta completa: CLAVE, nombre, RUT, correos | Sí |
| 2 | Alta | `loginServices.js:815` (WSDL estudiantes) | Respuesta parseada en login fallido | Sí, si usa `/students` |
| 3 | Media | `loginServices.js:211` y `:247` (WSDL) | El error SOAP se envía a Sentry y al front (`error: err`); puede incluir el request con la clave | Sí |
| 4 | Alta | `authentication/auth.js:762` (autologin) | `logger.silly('decripted pw:', req.body)`: clave descifrada | A confirmar |
| 5 | Alta | `config/logger.js:35` | Nivel por defecto `silly`: si el cliente no define `loggerLevel`, se imprimen todos los `silly` | A confirmar |
| 6 | Alta | `app.js:64` | `GET /changeLog/:logLevel` cambia el nivel en caliente, sin autenticación | Sí (es global) |
| 7 | Alta | `auth.js:808-845` (TOKEN) | Arma un `curl` con usuario, clave y secreto en el comando; si falla, el error (con el comando) va a Sentry | No |
| 8 | Media | `loginServices.js:86` (POST) | `logger.silly('Login response..', response.data)` | No |
| 9 | Media | `index.js:482` (SAML), `auth.js:519` (OIDC), `services.js:1151` y `:1189` | Perfil del usuario (datos personales; en OIDC posiblemente tokens) | A confirmar |
| 10 | Baja | `auth.js:163-197` (AD), `userInfoMethod/ldap.js` | Usuario y errores de bind | No |

En `engagement-api`, `api-gateway` y los demás sub-API de `sandbox-api` no se encontró nada equivalente.

## Cómo cifra hoy la Suite (evaluado como alternativa)

Ninguno de los mecanismos existentes sirve tal cual para proteger claves en logs:

| Mecanismo | Dónde | Qué hace | ¿Sirve? |
|---|---|---|---|
| Clave del login | `suite-front/.../OAppAuthStrategyWebV2.vue:108` (también Ldap, Wsdl, RPA, Impersonate) → `loginServices.js:39` y `:158` | Solo base64 | No: no es cifrado |
| `encryptRequest` | `suite-front/utils/helpers.ts:1045` y `sandbox-front/.../userListController.js:216` → `user-api/services.js:258` | AES-128-CBC con llave = nombre del cliente + texto fijo **escrito en el código del front**, recortada a 16 caracteres | No: la llave es pública (está en el JS que descarga el navegador). Es un hallazgo en sí |
| Autologin | `auth.js:754` | AES-128-CBC con llave e IV fijos en la config del servidor (`AES256SECRETTOKEN`, `AES256IV`) | Parcial: simétrico, la llave vive en el pod; quien accede al pod descifra todo. El IV fijo hace que la misma clave dé siempre el mismo texto cifrado |
| ucalTls | `custom/ucalTls.js:21` | 3DES con llave derivada por MD5, hacia el servicio de un cliente | No: algoritmo obsoleto |

Conclusión: el problema del ticket es que quien accede al pod o a sus logs vea las claves. Un esquema simétrico con la llave en el pod no lo resuelve. Por eso se propone cifrado asimétrico.

## Diseño de la solución

### Opción elegida: cifrado asimétrico siempre activo

1. **Helper `sanitizeForLog`** en `core-api/helpers`:
   - Recursivo, con claves sensibles case-insensitive (`clave`, `password`, `pass`, `passwd`, `contrasena`, `contraseña`, `secret`, `token`, `access_token`, `refresh_token`, `authorization`).
   - Los campos de **clave** se reemplazan por un bloque cifrado `enc:v1:<base64>`. Los de **datos personales** (`rut`, `mail`, `correo`, `email`) se enmascaran (`12.***.***-K`) en el texto visible y, si soporte los necesita, viajan dentro del mismo bloque cifrado.
   - **Siempre trabaja sobre una copia; nunca modifica el original** (riesgo R1).
2. **Cifrado:** híbrido con `crypto` nativo de Node (sin dependencias nuevas). Por cada registro se genera una llave AES-256-GCM aleatoria, que cifra el contenido; esa llave se cifra con la pública RSA-OAEP. El cifrado es aleatorio, así que dos logins con la misma clave producen textos distintos.
3. **Llave pública leída en caliente** desde Secrets Manager, con el mismo patrón que `fakeAuth` (`loginServices.js:456-500`: `getSecret` + caché en Redis). **Rotarla no requiere despliegue.**
4. **Falla segura:** si no hay llave pública disponible (secreto ausente, error de AWS), el campo se escribe como `[REDACTED]`. **Nunca en texto plano.** El login no se ve afectado.
5. **Llave privada fuera del cluster:** la custodian 1 o 2 personas de soporte o seguridad. Se descifra con un script local (`decrypt-log.js`) documentado en un runbook.
6. **Filtro `beforeSend` en Sentry** (`app.js`, `Sentry.init`): aplica el mismo sanitizador a `event.request.data`, `extra` y `contexts`.
7. **Errores devueltos al front:** no enviar `error: err` crudo; solo mensaje y código.
8. **Aplicación en los puntos 1 a 4 y 7 a 10** de la tabla de hallazgos. Los logs sin valor (por ejemplo `decripted pw`) se eliminan.

**Resultado operativo:** un solo despliegue (el del arreglo). Desde ahí, cada login deja su bloque cifrado y soporte puede depurar en cualquier momento sin tocar configuración ni redesplegar.

### Opciones descartadas

| Opción | Motivo |
|---|---|
| Flag por env para activar el cifrado | Activar o desactivar exige redespliegue |
| Flag leído en caliente desde Secrets Manager | Cumple la restricción, pero obliga a pedir al usuario que repita el login y agrega un paso operativo. El cifrado siempre activo lo hace innecesario |
| Endpoint tipo `/changeLog` | Estado en memoria por pod, se pierde al reiniciar, hoy sin autenticación |
| Cifrado simétrico (reusar el esquema del autologin) | La llave vive en el pod: no protege frente a quien accede al pod o a los logs |
| Reusar `encryptRequest` | Llave expuesta en el código del front |
| Base64 u otra codificación | No es cifrado |

### Plan B: huella (HMAC) sin clave recuperable

Si seguridad o legal no aprueban guardar claves recuperables: la clave se reemplaza por una huella HMAC más flags (`largo`, `tieneEspaciosAlInicioOFinal`, `tieneCaracteresNoAscii`, `md5Aplicado`). Soporte puede comparar la clave que llegó con la que el usuario dice haber escrito, pero no verla. Esfuerzo: 3,5 a 5 días.

### Decisión opcional

Cambiar el nivel de log por defecto de `silly` a `info` y proteger `/changeLog` (+0,5 días). Efecto colateral: los clientes que no definan `loggerLevel` dejan de ver los logs `silly`.

## Plan de prueba (uvmcl)

### Antes de empezar (bloqueantes)

- Confirmar el tipo de login de uvmcl (se espera WSDL) y si usa `/students` y autologin.
- Confirmar el `loggerLevel` de uvmcl en QA y producción.
- Confirmar con DevOps cómo se despliega uvmcl en producción. En `platform-gitops` solo aparece `uvmcl-retention-qa`, fijado por digest.
- Tener un usuario de prueba válido de uvmcl para QA.
- **Aprobación de seguridad o legal** para guardar claves recuperables cifradas. Si no se aprueba, se aplica el plan B.
- Definir quién custodia la llave privada y crear el secreto con la llave pública en Secrets Manager para QA y producción.
- Confirmar que el rol IAM del pod puede leer el secreto nuevo. Si el campo se agrega al secreto `fakeAuth` existente, ya tiene permiso.

### Nivel 1: tests unitarios (antes del PR)

| ID | Caso | Resultado esperado |
|---|---|---|
| U1 | `sanitizeForLog` con objeto anidado que trae `CLAVE`, `Clave`, `password` en distintos niveles | Ningún valor queda en texto plano; todos son `enc:v1:...` |
| U2 | `sanitizeForLog` con RUT y correo | Enmascarados en el texto visible; el resto de los campos intacto |
| U3 | **El original no cambia** después de sanitizar | El objeto de entrada es idéntico antes y después (protege la sesión) |
| U4 | Entradas raras: `null`, `undefined`, string, array, referencias circulares, XML crudo como string | No lanza excepción; un string XML con `<CLAVE>` queda cifrado o redactado |
| U5 | Cifrar y descifrar con un par de llaves de prueba | El script devuelve exactamente la clave original, incluidas tildes y espacios |
| U6 | Misma clave cifrada dos veces | Dos textos cifrados distintos |
| U7 | Sin llave pública disponible | El campo queda `[REDACTED]`; nunca en texto plano; no lanza excepción |
| U8 | `beforeSend` de Sentry con un evento que trae `request.data.password` | El evento sale sin la clave en texto plano |
| U9 | Fixtures de respuesta de cada tipo de login (WSDL, POST, TOKEN, SAML, OIDC) | Sin claves en texto plano; cubre los tipos que no se prueban en ambiente |

### Nivel 2: QA en `uvmcl-retention-qa`

Evidencia de cada caso: extracto de `kubectl logs -n uvmcl-retention-qa <pod suite-api>` filtrado por `clave|password|Login user response|enc:v1` y captura del evento en Sentry si corresponde.

| ID | Caso | Resultado esperado |
|---|---|---|
| Q1 | Login correcto (usuario administrativo, `POST /`) | Entra normal. La sesión queda completa: nombre, correo, rol y permisos. **Es el caso crítico** |
| Q2 | Q1, revisión del log | `Login user response` aparece con `CLAVE: enc:v1:...` y RUT o correo enmascarados. Ninguna contraseña en texto plano |
| Q3 | Descifrar el bloque de Q2 con el script local y la llave privada | Se obtiene exactamente la clave usada en Q1 |
| Q4 | Revisar el pod (variables de entorno, secretos montados, archivos) | La llave privada **no** está en el pod |
| Q5 | Clave incorrecta | Rechaza con el mismo mensaje de siempre; la clave ingresada queda cifrada, no en texto plano |
| Q6 | Login de estudiante (`/students`), correcto y fallido (si uvmcl lo usa) | Mismo comportamiento que antes; log cifrado |
| Q7 | Autologin (si uvmcl lo usa) | Funciona; no aparece `decripted pw` con ningún nivel |
| Q8 | Forzar `GET /changeLog/silly` y repetir Q1 | Aun con el nivel más verboso, no aparece la clave en texto plano |
| Q9 | Rotar la llave pública en Secrets Manager (sin redeploy) y repetir Q1 al vencer el caché | El bloque nuevo se descifra solo con la llave privada nueva |
| Q10 | Quitar temporalmente el acceso al secreto (o apuntar a uno inexistente en QA) y repetir Q1 | Login normal; el campo queda `[REDACTED]` |
| Q11 | Error del servicio del cliente (URL WSDL inválida en QA, o simulado en test si no se puede tocar la config) | Mensaje de siempre al usuario; la respuesta al front no trae `error` crudo; Sentry sin la clave en texto plano |
| Q12 | Regresión general | Navegar el módulo de retención con el usuario de Q1 (carga inicial, permisos, logout). Sin errores nuevos en el log |

### Nivel 3: producción de uvmcl

| ID | Caso | Resultado esperado |
|---|---|---|
| P1 | Smoke de login con un usuario real o de soporte, coordinado con el cliente | Entra normal |
| P2 | Revisión del log del pod tras P1 y durante las primeras horas | Solo bloques `enc:v1:...`; ninguna CLAVE en texto plano |
| P3 | Descifrado de control del bloque de P1 por quien custodia la llave | Se obtiene la clave usada |
| P4 | Revisión de Sentry en las primeras 24 h | Sin eventos de login con datos sensibles en texto plano; sin aumento de errores de login |

**Criterio de salida:** U1 a U9 en verde, Q1 a Q12 aprobados con evidencia, P1 a P4 sin hallazgos.

## Esfuerzo (hasta uvmcl en producción)

| Tarea | Días |
|---|---|
| Helper `sanitizeForLog` + tests U1 a U4 | 0,5 a 1 |
| Cifrado híbrido + lectura de llave pública desde Secrets Manager con caché + falla segura + U5 a U7 | 1 a 1,25 |
| Generación y custodia de llaves, script de descifrado y runbook | 0,5 a 0,75 |
| Aplicar en el flujo WSDL de uvmcl (puntos 1 a 3) | 0,25 |
| Aplicar en los demás flujos (puntos 4, 7 a 10) + fixtures U9 | 1 a 1,5 |
| `beforeSend` de Sentry + errores al front sin `err` crudo + U8 | 0,5 |
| Code review y ajustes | 0,25 |
| QA en uvmcl (Q1 a Q12) | 0,75 a 1 |
| Despliegue a producción + P1 a P4 | 0,25 a 0,5 |
| **Total** | **5 a 7** |
| Plan B en lugar del cifrado (huella HMAC) | 3,5 a 5 en total |
| Opcional: nivel por defecto `info` + proteger `/changeLog` | +0,5 |

La mayor incertidumbre está en QA y en el despliegue: depende de los bloqueantes (tipo de login, usuario de prueba, aprobación de seguridad, creación del secreto y mecanismo de despliegue en producción).

## Riesgos

- **R1: romper el login al sanitizar.** Si el helper modifica el objeto original, el log queda limpio pero la sesión queda con el valor cifrado o sin datos. Mitigación: clonar siempre, cubierto por U3 y Q1.
- **R2: despliegue involuntario en otros clientes.** Los clientes con la imagen de `suite-api` en tag `master` (7 en staging y 7 en producción según `platform-gitops`, casi todos demos) toman el cambio al reiniciar el pod, sin validación. Mitigación: fijarlos por digest antes del merge (decisión de DevOps). En esos clientes, si no existe el secreto con la llave pública, la falla segura deja `[REDACTED]` y el login sigue funcionando.
- **R3: flujos no probados en ambiente.** Los tipos que uvmcl no usa quedan cubiertos solo por tests unitarios (U9) hasta que se despliegue un cliente de ese tipo.
- **R4: custodia de la llave privada.** Si se filtra, todos los logs cifrados quedan legibles. Mitigación: pocas personas con acceso, guardada fuera del cluster, y rotación del par de llaves (sin redeploy) si hay sospecha.
- **R5: cumplimiento normativo.** Guardar claves recuperables, aunque estén cifradas, puede chocar con la normativa de datos personales. Requiere aprobación registrada de seguridad o legal (bloqueante).

## Fuera de alcance, para escalar

- **Logs ya recolectados:** siguen conteniendo contraseñas en texto plano. Hay que purgar el colector de logs de uvmcl y decidir si se pide al cliente rotar las claves.
- **Inyección de comandos en el login TOKEN** (`auth.js:808-845`): la clave se interpola sin escapar en un `curl` ejecutado con `exec`. Requiere ticket propio.
- **Llave de `encryptRequest` expuesta en el front** (`suite-front/utils/helpers.ts:1045`, `sandbox-front/.../userListController.js:216`): cualquiera con el JS del navegador puede derivarla. Requiere ticket propio.
- **Contraseña en texto plano en la sesión** (`cas_userinfo.pass`, guardada en Redis). La usan `seeds.js:55`, `seeds.js:137` y `auth.js:700`. Quitarla exige revisar esos consumidores.

## Después de uvmcl (otros clientes)

No se valida cliente por cliente, sino **por tipo de login**:

1. Inventario del tipo de login de cada cliente (0,5 a 1 día).
2. Crear el secreto con la llave pública para cada cliente que se despliegue. Sin él, la falla segura deja `[REDACTED]` y no hay info para depurar, pero tampoco exposición.
3. Por cada tipo, en un QA representativo: Q1, Q2, Q3, Q5 y Q11 adaptados.
4. Al desplegar cada cliente: smoke de login y revisión del log (P1 y P2). Toma minutos y lo puede hacer quien despliega.
5. Esfuerzo estimado: 1,5 a 2,5 días de QA en total, según cuántos tipos tengan ambiente disponible.

## Decisiones pendientes

1. Confirmar el cifrado asimétrico siempre activo, o pasar al plan B (huella).
2. Aprobación de seguridad o legal para guardar claves recuperables cifradas.
3. Quién custodia la llave privada.
4. Si se aplica el cambio de nivel de log por defecto y la protección de `/changeLog`.
5. Si se fijan por digest los clientes con tag `master` antes del merge.
