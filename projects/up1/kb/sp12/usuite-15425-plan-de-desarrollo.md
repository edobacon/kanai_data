---
id: DOC-kb-sp12-usuite-15425-plan-de-desarrollo
project: up1
type: doc
module: sandbox-api/user-api
tags:
  - usuite-15425
  - seguridad
  - logs
  - legacy
  - user-api
  - sandbox-api
  - plan
  - helper
  - authlog
---

# USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles)

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · Plan creado el 2026-09-29, actualizado el 2026-09-30 · Producto: uPlanner Suite (legacy), no UP1.
> Documentos relacionados (misma carpeta):
> - [usuite-15425-claves-en-logs-uvmcl.md](./usuite-15425-claves-en-logs-uvmcl.md): análisis inicial y flujo del login de uvmcl.
> - [usuite-15425-niveles-de-solucion.md](./usuite-15425-niveles-de-solucion.md): vulnerabilidades, estado verificado de uvmcl y niveles de solución.
> - [usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md](./usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md): mapa del sistema de logs (loggerLevel, niveles, salidas que no controla). **Este plan reemplaza su parte B** (diseño del helper).
>
> Este documento es el **plan vivo** del desarrollo: cada fase tiene su checklist y se registra el avance en la tabla de abajo.

## Registro de avance

| Fase | Estado | Fecha | Repo | Commits | Evidencia |
|---|---|---|---|---|---|
| F0 Verificación previa | Pendiente | | | | |
| F1 Helper de ofuscación | Pendiente | | user-api | | |
| F2 Detección en texto | Pendiente | | user-api | | |
| F3 Función de log `authLog` | Pendiente | | user-api | | |
| F4 Conversión del login de uvmcl | Pendiente | | user-api | | |
| F5 Conversión del resto de user-api | Pendiente | | user-api | | |
| F6 Sentry | Pendiente | | sandbox-api | | |
| F7 Chequeo estático y smoke local | Pendiente | | user-api | | |
| F8 Documentación | Pendiente | | user-api, sandbox-api | | |
| F9 Nivel de log en uvmcl (DevOps) | Pendiente | | (config EFS) | | |
| F10 QA, despliegue y verificación | Pendiente | | | | |

Estados: `Pendiente` · `En curso` · `Hecho` · `Bloqueado (motivo)`.

## Objetivo

Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.

## Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| Alcance | Qué logs | **Todos** los logs del módulo de autenticación (`user-api`: `console.*`, `logger.*` y `Sentry.capture*`) + el filtro de Sentry en `sandbox-api/server/app.js` |
| Tipo de log | Cómo se escribe | Todo pasa por una función única (`authLog`) que **envuelve al logger global** (`winston`), en niveles **siempre visibles**: eventos → `info`, advertencias → `warn`, errores → `error` |
| Datos | Qué se oculta por defecto | Contraseñas y secretos → bloqueados (`[OCULTO]`). Correos → parcial `light`. RUT y documentos → parcial `light`. Nombres → visibles, pero catalogados para poder cambiar su nivel |
| Catálogo | Cómo se organiza | **Por estrategia** (`block`, `email`, `id`, `text`), cada una con su nivel, su lista de nombres de campo y sus expresiones regulares para agregar o quitar |
| Campos de tipo variable | `ds_name`, `username`, `usuario`, `nmuserdom` (según el cliente traen correo, RUT o usuario simple) | **B:** van en la estrategia `email`. Si el valor no es un correo, se oculta como texto con el mismo nivel. Cada ambiente puede moverlos a otra estrategia por configuración |
| D1 | Logs de ruido (`'tttt'`, `'vignesh'`, separadores, `'FALLO!'`) | **A:** se eliminan; los bloques de varias líneas se consolidan en un solo log con contexto |
| D2 | Ubicación del helper | **En `user-api`** (`server/api/user-api/helpers/`) |
| D3 | Errores que hoy llegan a Sentry por `console.error` | **A:** `authLog.error` los reenvía a Sentry, sanitizados |
| D4 | Alcance de la configuración | **Todo configurable**, incluido excluir campos bloqueados y apagar la ofuscación. Todo **encendido por defecto**. Las reducciones de protección generan un aviso al arrancar |
| D5 | Sentry en `sandbox-api` | **A:** se incluye en este ticket (F6), con `require` protegido del helper |
| Config | Dónde vive | Catálogo y valores por defecto **dentro del helper**; `LOG_MASKING` en `local.env.js` solo sobrescribe. Sin configuración, el helper funciona igual |
| Docs | Documentación | JSDoc en todo lo público + guía de uso y configuración + ejemplo en la plantilla de config (F8) |
| Runtime de pruebas | Dónde corren los tests | En Docker con la **imagen de producción** `node:10.24.1-alpine3.11` |

"Siempre visible" significa que el log se ve con el nivel recomendado (`info`) y con cualquier nivel más detallado, incluido el caso sin `loggerLevel` configurado (`silly`). Solo se ocultaría si alguien configura explícitamente `warn` o `error`.

## Relevamiento de campos en producción (2026-09-30)

Se ejecutó un script de solo lectura en 20 namespaces (muestra de clientes productivos) que extrae **solo nombres de campos y el tipo de valor** (correo, RUT, texto, vacío, objeto) de los logs de autenticación de las últimas 48 horas. No se copiaron valores.

| Cliente | `LOGIN_INTEGRATION` | Bloques encontrados | Campos relevantes |
|---|---|---|---|
| uvmcl-retention | WSDL | `Login user response` (4), `users->` (19) | `CLAVE`, `NRRUTUSER` (RUT **sin** verificador), `DVRUTALU`, `EMAILUVM`, `NMEMAIL`, `CORREOS`, `NMNOMBRS`, `NMAPEPAT`, `NMAPEMAT`, `NMUSERDOM`, `CODERROR`, `CODIGOERROR`, `NRESTADO`, `AAMATRIC`, `CDCARRER`, `PIDM`, `USERALUM`, `USERAPO`, `USEREGRE`, `USERFUN`, `USERPOST`, `USERPROF` |
| univalle | POST | `Login response..` (**163**, nivel `silly`), `Axios request failed` (3), `users->` (39) | `nombres`, `apellidos`, `numero_documento`, `tipo_documento`, `documento`, `correo_institucional`, `correo_alterno`, `mensaje` (**texto libre con correo o documento**), `codigo`, `rol`, `dependencia`, `datosPersona` |
| udla, ibero | WSDL + SAML | `SAML Profile`, `users->` | `nameID` (correo), `issuer`, `nameIDFormat`, `sessionIndex` |
| ulima (AD), upn, senati-retention, uvg (ADAL), ucc-retention (LDAP), utec (ADB2C) | Varios | `users->` | `ds_mail` (correo), `ds_name` (correo en ibero y ulima; usuario en otros), `ds_fullname`, `id_code`, `is_active` |
| umayor, isil (WSDL), uniandes, ceipa (ADAL), continental-retention, tecsup (ADB2C) | Varios | Ninguno en 48 h | Sin logins en el período o con mensajes no reconocidos |
| ust, unabcol, uwiener, cftaraucania | | | Sin pods `suite-api` |

**Conclusiones:**
- **Ningún ambiente tiene `loggerLevel`**: todos están en `silly`.
- **Todos los ambientes revisados tienen Sentry encendido.** La vía de "Sentry deshabilitado imprime el evento" no aplica en ellos, pero F6 sigue siendo necesaria por el body del request que Sentry adjunta.
- En la muestra, **solo uvmcl mostró contraseña** (`CLAVE`). Univalle envía la clave al servicio pero no vuelve en la respuesta.
- **`users->` (`services.js:1151`) aparece en casi todos los clientes**, con cualquier tipo de login: es un punto transversal.
- Hallazgos que cambiaron el diseño: nombres de campo variables (`correo_institucional`) → **patrones**; documentos no chilenos y RUT sin verificador → estrategia **`id`**; `ds_name` con contenido variable → en **`email`** con respaldo a texto; datos personales en texto libre (`mensaje`) → **detección de correos en texto**; atributos SAML con URL como nombre → comparación por **último tramo**.

**Pendiente del relevamiento:**
- Conocer la **forma** de los valores de `PIDM` y de los campos `USER*` de uvmcl (pueden ser indicadores `S`/`N`, usuarios o identificadores). Se propone una versión del script que muestre el largo y el tipo de caracteres sin el valor, excluyendo campos bloqueados.
- Los clientes sin bloques necesitan una ventana mayor (Loki) o un login de prueba.
- El script emite un aviso inofensivo de `awk` por el texto `Login response\.\.`; corregir con `Login response[.][.]`.

## Restricciones técnicas verificadas

| Restricción | Detalle | Consecuencia en el plan |
|---|---|---|
| Node 10 | La imagen de producción usa `node:10.24.1-alpine3.11`. Un prototipo del recorrido recursivo se ejecutó en esa imagen el 2026-09-29: funcionan `WeakSet`, `Object.getOwnPropertyNames` (para `Error`), spread de objetos, `Buffer.isBuffer` y `String.prototype.normalize('NFD')` (ICU 64.2), y el original quedó intacto | Código sin `?.`, `??`, `Object.fromEntries` (Node 12), `Array.prototype.flat`/`flatMap` (Node 11), `String.prototype.matchAll` (Node 12), `structuredClone` (Node 17) ni lookbehind en expresiones regulares |
| Node 10 local | El Node 10 de `nvm` en la máquina de desarrollo es para Intel y **no ejecuta** en Apple Silicon | **Todos los tests y el smoke corren en Docker** con la imagen de producción |
| Sentry y `console.error` | `CaptureConsole` (`app.js:116`) envía cada `console.error` a Sentry. `winston` escribe directo a `process.stdout` | `authLog.error` reenvía explícitamente a Sentry (D3) |
| Formato del logger | Con 3 argumentos descarta los extra; con 2 mezcla las propiedades del objeto con las del mensaje (`message`, `level`, `stack` se pisan) | `authLog` llama siempre con 2 argumentos y los datos envueltos: `logger.info(msg, { data })` |
| Tests del repo | `server/test/globals.js` levanta la app completa y se conecta a la base | Los tests del helper corren aislados, sin `--opts` |
| JSDoc | El repo ya genera docs con `npm run jsdoc` (plantilla `docdash`, con `typedefs`) | El JSDoc del helper debe generar sin errores con esa configuración |
| Repos | `user-api` es un repo propio dentro de `sandbox-api/server/api/`; `app.js` pertenece a `sandbox-api` | Dos ramas y dos PR. F6 hace un `require` protegido |

## Cómo correr los tests

Desde la raíz de `sandbox-api`:

```bash
docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha server/api/user-api/test/helpers/<archivo>.test.js
```

Todos los tests del helper:

```bash
docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha "server/api/user-api/test/helpers/**/*.test.js"
```

- Se usa la imagen de producción: si pasa ahí, pasa en el runtime real.
- Mocha, Chai y winston son JavaScript puro: funcionan desde el `node_modules` del host.
- Sin `--opts`, para no levantar la app ni conectarse a la base.

## Inventario de logs del módulo de autenticación (`user-api`)

| Archivo | `console.*` | `logger.*` | `Sentry.capture*` |
|---|---|---|---|
| `loginServices.js` | 12 | 7 | 13 |
| `authentication/auth.js` | 28 | 5 | 10 |
| `multiAuth/ad.js` | 14 | 0 | 0 |
| `multiAuth/azureSaml.js` | 0 | 15 | 0 |
| `multiAuth/openIdConnect.js` | 0 | 9 | 0 |
| `custom/ucalTls.js` | 7 | 0 | 0 |
| `userInfoMethod/ldap.js` | 15 | 0 | 0 |
| `userInfoMethod/userInfoMethod1.js` | 5 | 0 | 0 |
| `services.js` | 11 | 0 | 1 |
| `index.js` | 12 | 13 | 0 |
| `seeds/seeds.js` y `seeds/seed-helper.js` | 9 | 6 | 4 |
| **Total** | **113** | **55** | **28** |

Más `sandbox-api/server/app.js`: `beforeSend` de Sentry (`:123-141`) e integración `CaptureConsole` (`:116`).

---

## Diseño

### Piezas

| Pieza | Archivo propuesto | Responsabilidad |
|---|---|---|
| Helper de ofuscación | `server/api/user-api/helpers/logSanitizer.js` | Catálogo por estrategia, lectura y validación de config, recorrido recursivo, niveles y detección en texto |
| Función de log | `server/api/user-api/helpers/authLog.js` | Envuelve al logger global: sanitiza, formatea para `winston`, reenvía errores a Sentry y nunca rompe el flujo |
| Guía | `server/api/user-api/helpers/LOGGING.md` | Uso, catálogo, niveles, opciones, ejemplos, avisos y resolución de problemas |

### Flujo

```
Código del login (loginServices.js, auth.js, ...)
        │  authLog.info('Login user response', { user, result })
        ▼
authLog (user-api/helpers/authLog.js)
        │  1. sanitizeForLog(datos)          → copia con los datos sensibles ocultos
        │  2. logger.info(msg, { data })      → logger global de siempre (winston)
        │  3. solo en error: Sentry con datos sanitizados
        │  (todo dentro de try/catch: nunca rompe el login)
        ▼
Logger global: filtra por loggerLevel y da formato
        ▼
Log del pod: 26-09-30 10:00:00 - - [info]: Login user response { "data": { ... "CLAVE": "[OCULTO]" ... } }
```

### API

```js
const { sanitizeForLog, maskValue } = require('./helpers/logSanitizer')
const authLog = require('./helpers/authLog')

sanitizeForLog(valor)                         // objeto, lista, Error o texto → copia ofuscada
maskValue(valor, 'email')                     // valor suelto con la estrategia y el nivel configurados
maskValue(valor, 'id' | 'text' | 'block')

authLog.info('Login user response', { user: maskValue(name, 'email'), result })
authLog.warn('Login estudiante rechazado', { response, result })
authLog.error('Error al conectar con WebService cliente', err)    // además envía a Sentry, sanitizado
```

| Función | Nivel del logger | Para qué |
|---|---|---|
| `authLog.info` | `info` | Eventos normales del login |
| `authLog.warn` | `warn` | Situaciones anómalas que no son falla del sistema |
| `authLog.error` | `error` (+ Sentry) | Fallas |

El nombre de usuario suelto del login (`name`) se oculta con `maskValue(name, 'email')`: si es un correo queda como correo parcial; si es un RUT o un usuario simple, se oculta como texto con el mismo nivel.

### Estrategias y niveles

| Estrategia | Qué hace | Nivel |
|---|---|---|
| `block` | Reemplaza el valor completo por `totalText` (`[OCULTO]`) | No aplica (siempre total) |
| `email` | Oculta parte del usuario del correo; el dominio queda visible. Si el valor no es un correo, lo oculta como `text` con el mismo nivel | Configurable (`light`) |
| `id` | RUT o documento. Con forma de RUT (con o sin verificador) conserva el formato; con otra forma oculta los últimos caracteres. Si no es un identificador, lo oculta como `text` con el mismo nivel | Configurable (`light`) |
| `text` | Texto general (nombres) | Configurable (`none`) |

**Niveles de las estrategias parciales:** `none`, `light`, `medium`, `strong`.

| Nivel | `text` (`PAULINA`) | `email` (`pablo.perez@uvm.cl`) | `id` RUT (`18.456.789-K`) | `id` RUT sin verificador (`18456789`) | `id` documento (`1234567890`) |
|---|---|---|---|---|---|
| `none` | `PAULINA` | `pablo.perez@uvm.cl` | `18.456.789-K` | `18456789` | `1234567890` |
| `light` | `PAUL***` (oculta el tercio final) | `pablo.pe***@uvm.cl` (oculta los 3 últimos del usuario) | `18.456.***-K` (oculta los 3 últimos dígitos) | `18456***` | `1234567***` (oculta los 3 últimos) |
| `medium` | `PA*****` (deja el tercio inicial) | `pa*********@uvm.cl` (deja los 2 primeros) | `18.***.***-K` (deja los 2 primeros dígitos) | `18******` | `12********` |
| `strong` | `P******` (deja el primero) | `p**********@uvm.cl` (deja el primero) | `**.***.***-K` (deja el verificador) | `********` | `**********` |

Reglas generales:
- Nunca se muestra más de lo que indica el nivel, también con valores cortos.
- **Los niveles parciales solo se aplican a textos y números** (los números se tratan como texto). Los booleanos no se tocan, para que un patrón como `mail` no afecte a `mail_enabled: true`.
- `block` se aplica a cualquier tipo de valor, incluidos objetos y listas completos.

### Catálogo base (dentro del helper)

```js
// Catálogo por estrategia: el helper funciona con esto aunque el ambiente no tenga configuración
const DEFAULT_MASKING = {
  block: { keys: ['clave', 'password', 'pass', 'passwd', 'pwd', 'contrasena', 'secret', 'clientsecret', 'token',
                  'accesstoken', 'refreshtoken', 'idtoken', 'authorization', 'cookie', 'aes256secrettoken', 'aes256iv'] },
  email: { level: 'light',
           keys: ['nameid', 'emailaddress', 'upn', 'dsname', 'username', 'usuario', 'nmuserdom'],
           patterns: ['mail', 'correo'] },
  id:    { level: 'light',
           keys: ['rut', 'run', 'nrrutuser', 'numerodocumento', 'documento', 'cedula', 'dni', 'nrodocumento'],
           patterns: ['documento'] },
  text:  { level: 'none',
           keys: ['nmnombrs', 'nmapepat', 'nmapemat', 'nombres', 'apellidos', 'dsfullname', 'fullname', 'givenname', 'sn'] },
}
```

**Cómo se compara el nombre de un campo:**
- `keys`: contra el nombre **normalizado** (minúsculas, sin tildes, sin `_`, `-` ni espacios). `CLAVE_ACCESO`, `claveAcceso` y `clave-acceso` son lo mismo.
- `patterns`: expresión regular contra el **nombre original**, sin distinguir mayúsculas.
- Si el nombre es una URL (atributos de SAML, como `http://schemas.xmlsoap.org/.../claims/emailaddress`), se compara también su **último tramo** (`emailaddress`).

### Configuración (`LOG_MASKING` en `local.env.js`, todo opcional)

```js
LOG_MASKING: {
  enabled: true,
  strategies: {
    block: { add: ['clave_acceso'], addPatterns: ['^pin'] },
    email: { level: 'medium', exclude: ['upn'] },
    id:    { add: ['rut_alumno', 'ds_name'], excludePatterns: ['^tipo_documento$'] },   // p. ej. uvmcl mueve ds_name a id
    text:  { level: 'light', add: ['nombre_social'] },
  },
  exclude: [],             // fuerza visibles estos campos, en cualquier estrategia
  excludePatterns: [],     // lo mismo, con expresiones regulares
  totalText: '[OCULTO]',
  maskChar: '*',
  textDetection: { block: true, email: true, id: false },
  maxDepth: 10,
  maxTextLength: 65536,
},
```

| Opción | Default | Qué controla |
|---|---|---|
| `enabled` | `true` | Enciende o apaga la ofuscación. Solo `false` o `'false'` la apagan |
| `strategies.<s>.level` | Según catálogo | Nivel de `email`, `id` o `text`: `none`, `light`, `medium`, `strong` |
| `strategies.<s>.add` / `exclude` | `[]` | Suma o quita nombres exactos en esa estrategia |
| `strategies.<s>.addPatterns` / `excludePatterns` | `[]` | Suma o quita por expresión regular en esa estrategia |
| `exclude` / `excludePatterns` | `[]` | Deja visibles esos campos en cualquier estrategia |
| `totalText` | `'[OCULTO]'` | Texto de reemplazo de `block` |
| `maskChar` | `'*'` | Carácter del ocultamiento parcial |
| `textDetection.block` | `true` | Busca claves bloqueadas dentro de textos (XML, `clave=...`, JSON serializado, `curl -u`). Apagarla vuelve a exponer esas claves |
| `textDetection.email` | `true` | Oculta correos que aparecen dentro de texto libre (p. ej. el campo `mensaje` de univalle), con el nivel de `email` |
| `textDetection.id` | `false` | Oculta RUT dentro de texto libre. Apagado por defecto: un número largo cualquiera puede parecer un documento |
| `maxDepth` | `10` | Niveles de anidación recorridos; más allá, `'[MaxDepth]'`. No afecta la seguridad |
| `maxTextLength` | `65536` | Tamaño máximo por texto; lo que excede se corta y se marca. No afecta la seguridad |

**Reglas de combinación** (una sola vez, al cargar el módulo):
1. Un campo entra en una estrategia si coincide con sus `keys` o `patterns` (base más `add`/`addPatterns`) y no está en sus `exclude`/`excludePatterns`.
2. Si coincide con varias estrategias, gana la más fuerte: `block` primero; entre las parciales, la de nivel más alto.
3. `exclude`/`excludePatterns` globales lo dejan visible en cualquier caso.

**Expresiones regulares configuradas:**
- Se compilan una vez al cargar, cada una en su `try/catch`. Una inválida se ignora con un aviso; el resto sigue.
- Largo máximo de 200 caracteres.
- Solo se prueban contra **nombres de campo** (textos cortos), nunca contra valores. Las expresiones que buscan dentro de valores son fijas del helper.

**Validación y comportamiento por ambiente:**

| Situación | Comportamiento |
|---|---|
| Sin `LOG_MASKING` | Todo por defecto, activo, sin avisos |
| Solo algunas opciones | Se aplican esas; el resto queda por defecto |
| Un valor inválido (nivel o estrategia inexistente, tipo incorrecto, expresión inválida o muy larga) | Solo ese valor vuelve a su default; el resto se respeta. **Un único** `logger.warn` al cargar, listando lo ignorado |
| Números fuera de rango | Se ajustan al valor válido más cercano; nunca falla |
| Reducción de protección (`enabled: false`, exclusión de campos de `block`, `textDetection.block: false`) | Se aplica, con un `logger.warn` al arrancar: "Ofuscación de logs reducida por configuración: ..." |
| No se puede leer `local.env.js` | Todo por defecto, activo |

### Garantías

| Garantía | Cómo |
|---|---|
| No modifica el original | Construye un objeto nuevo mientras recorre. El mismo objeto arma la sesión |
| Nunca lanza excepciones | `try/catch` general en el helper y en `authLog`; ante error devuelve `'[SANITIZE_ERROR]'`, nunca el valor original |
| Ciclos vs. referencias compartidas | Registro de visitados por **camino actual** (se agrega al entrar, se quita al salir): solo un ciclo real se marca `'[Circular]'` |
| `Error` | Recorre `message` y `stack` con `Object.getOwnPropertyNames` y sanitiza sus propiedades (`config.data`, `response.data` de axios, `cmd` de `exec`) |
| Otros tipos | `Buffer` → `'[Buffer N bytes]'`; `Date` → ISO; funciones se omiten; `null` y `undefined` se conservan; getters que lanzan → `'[SANITIZE_ERROR]'` en ese campo |
| Rendimiento | Config y expresiones calculadas una vez; `maxDepth` y `maxTextLength` acotan el trabajo por log |

---

## Fases

### F0. Verificación previa

- [ ] Confirmar con DevOps cómo se construye y despliega `user-api` y `sandbox-api` (orden y si pueden llegar a producción por separado).
- [ ] Revisar en el proyecto de Sentry si el filtro de datos del servidor está activo (elimina campos como `password`).
- [ ] Leer `uplanner/rules/COMMITS.md` y crear la rama `USUITE-15425-logs-auth-seguros` desde `develop` en `user-api` y `sandbox-api`.
- [ ] Verificar el comando de Docker de "Cómo correr los tests" con un test mínimo.
- [ ] Conseguir un usuario de prueba de uvmcl para QA.
- [ ] Completar el relevamiento: forma de `PIDM` y `USER*` de uvmcl; clientes sin bloques (Loki o login de prueba).
- [ ] Armar fixtures anonimizados (valores ficticios, nombres de campo reales) de: WSDL de uvmcl, POST de univalle (incluido `mensaje` con correo), `users->`, perfil SAML (con atributos tipo URL), error de axios, error de TOKEN.

**Validación:** hallazgos anotados en el registro de avance. **Esfuerzo:** 0,25 a 0,5 días.

### F1. Helper de ofuscación (`logSanitizer.js`)

- [ ] Catálogo por estrategia, niveles y estrategias `block`, `email`, `id`, `text`, con respaldo a `text` cuando el valor no tiene la forma esperada.
- [ ] Comparación por `keys` normalizadas, `patterns` y último tramo de nombres tipo URL.
- [ ] Lectura de `LOG_MASKING` protegida, combinación y validación por opción, con aviso único; compilación protegida de expresiones.
- [ ] Avisos de protección reducida al cargar.
- [ ] Recorrido recursivo con las garantías.
- [ ] `maskValue`.
- [ ] JSDoc completo (ver F8).

**Tests** (`server/api/user-api/test/helpers/logSanitizer.test.js`):

| # | Caso | Esperado |
|---|---|---|
| T1 | `CLAVE`, `Clave`, `password`, `contraseña` en distintos niveles | Todos `[OCULTO]` |
| T2 | Campo `block` que contiene objeto o lista | Subárbol entero `[OCULTO]` |
| T3 | `email`: normal, corto (`ab@x.cl`), mayúsculas, sin `@` | Según nivel; sin `@` se oculta como `text` |
| T4 | `id` con RUT: con puntos, sin puntos, `k` minúscula, **sin verificador** (`NRRUTUSER`) | Según la tabla de niveles |
| T5 | `id` con documento colombiano (`numero_documento`), como texto y como número | Últimos caracteres ocultos |
| T6 | `text`: nombres sin config y con `level: 'light'` | Visibles; `PAUL***` con `light` |
| T7 | Lista `CORREOS` | Cada correo según nivel |
| T8 | Booleano en campo que coincide con un patrón (`mail_enabled: true`) | Sin cambios |
| T9 | Patrones por defecto: `correo_institucional`, `correo_alterno`, `EMAILUVM`, `NMEMAIL`, `ds_mail` | Todos como `email` |
| T10 | `ds_name` en `email` con correo, RUT y usuario simple | `pablo.pe***@uvm.cl`, `184567***`, `jpe***` |
| T11 | Atributos SAML con nombre tipo URL (`.../claims/emailaddress`, `.../claims/name`) | Coinciden por el último tramo |
| T12 | Sin `LOG_MASKING` | Catálogo base |
| T13 | Config mal formada | Lo inválido al default, el resto aplicado, un solo aviso |
| T14 | `add` y `exclude` por estrategia | Campos sumados y quitados |
| T15 | `addPatterns`/`excludePatterns` por estrategia y `exclude`/`excludePatterns` globales | Aplicados correctamente |
| T16 | Expresión inválida y expresión de más de 200 caracteres | Ignoradas con aviso; el resto funciona |
| T17 | Campo que coincide con `block` y `email`; campo en dos parciales | Gana `block`; entre parciales, el nivel más alto |
| T18 | Niveles por estrategia (`email: medium`, `id: strong`, `text: light`) y tabla completa | Salidas exactas |
| T19 | `exclude: ['clave']`, `enabled: false`, `textDetection.block: false` | Se aplica + aviso de protección reducida |
| T20 | `enabled: 'false'`, `0`, `'no'` | Solo `'false'` apaga |
| T21 | `totalText` y `maskChar` personalizados | Se usan en la salida |
| T22 | **El original no cambia** (comparación profunda antes y después) | Idéntico |
| T23 | Ciclo real, profundidad 20, `null`, `undefined`, `Buffer`, `Date`, getter que lanza | Sin excepción; marcadores esperados |
| T24 | Referencia compartida sin ciclo | Completa en ambos campos; sin `'[Circular]'` |
| T25 | `Error` de axios con `config.data` con clave | Clave oculta; `message` y `stack` presentes |
| T26 | `maxDepth` y `maxTextLength` personalizados e inválidos | Aplicados; inválidos al default |
| T27 | Fixture WSDL de uvmcl (todos los campos del relevamiento) | Salida exacta esperada |
| T28 | Fixture POST de univalle | Salida exacta esperada |
| T29 | Fixture `users->` | `ds_mail` y `ds_name` según `email`; `ds_fullname` visible |

**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 2 a 2,5 días.

### F2. Detección de datos dentro de texto

- [ ] `textDetection.block`: patrones fijos construidos desde los campos de `block`: `<clave>...</clave>`, `clave=...`, `"clave":"..."`, `-u usuario:secreto`.
- [ ] `textDetection.email`: correos dentro de cualquier texto, ocultos con el nivel de `email`.
- [ ] `textDetection.id` (apagado por defecto): RUT con formato dentro de texto.
- [ ] Corte por `maxTextLength` antes de buscar. Sin lookbehind ni funciones de expresiones regulares posteriores a Node 10.

**Tests:**

| # | Caso | Esperado |
|---|---|---|
| T30 | XML con `<CLAVE>x</CLAVE>` | `<CLAVE>[OCULTO]</CLAVE>` |
| T31 | `clave=x&user=y` y JSON serializado `"password":"x"` | Valor reemplazado |
| T32 | `curl -u USER:SECRET ... --data "...password..."` | Credenciales reemplazadas |
| T33 | Texto libre con correo (campo `mensaje`) | Correo oculto con el nivel de `email`; el resto del texto intacto |
| T34 | Texto libre con RUT: con `textDetection.id` apagado y encendido | Intacto; oculto |
| T35 | Texto mayor a `maxTextLength` | Cortado y marcado, sin error |
| T36 | `textDetection.block: false` | Textos intactos; campos por nombre siguen ocultos |

**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,75 a 1 día.

### F3. Función de log `authLog.js`

- [ ] `info`, `warn`, `error`: sanitizan y llaman al logger global con 2 argumentos y los datos en `{ data }`.
- [ ] `error` reenvía a Sentry mensaje y error sanitizados, si Sentry está disponible.
- [ ] `try/catch` general: ante falla escribe un log mínimo (`'authLog error'`) y no propaga.
- [ ] JSDoc completo (ver F8).

**Tests** (`authLog.test.js`):

| # | Caso | Esperado |
|---|---|---|
| T37 | Salida con el formato real de `config/logger.js` | `[info]: Login user response { "data": { ... "CLAVE": "[OCULTO]" ... } }` |
| T38 | Datos con claves `message`, `level`, `stack` | No se pisan; quedan dentro de `data` |
| T39 | Logger en `silly` (sin `loggerLevel`) y en `info` | Se imprime en ambos |
| T40 | Sanitizador que falla (stub) | No lanza; queda log mínimo |
| T41 | `authLog.error` | Sentry recibe datos sanitizados (stub) |
| T42 | Sentry ausente o deshabilitado | No lanza |

**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,5 días.

### F4. Conversión del login de uvmcl (`loginServices.js`)

- [ ] `:243` → `authLog.info('Login user response', { user: maskValue(name, 'email'), result })`.
- [ ] `:815` `console.log(response, result)` → `authLog.warn`.
- [ ] `:211` y `:247`: sin `error: err` en la respuesta al navegador (solo mensaje y código); Sentry vía `authLog.error`.
- [ ] `:291` `Session data`, `:727` `HACIENDO LOGIN CON USER`, `:70` y `:91` (POST, hoy `silly`) → `authLog.info`.
- [ ] Resto de `console.*` y `Sentry.capture*` del archivo, con el criterio D1.

**Validación:** tests F1 a F3 en verde; smoke local (F7) con el fixture de uvmcl; ningún `console.*` en el archivo. **Esfuerzo:** 0,5 días.

### F5. Conversión del resto de `user-api`

| Archivo | Cambios relevantes |
|---|---|
| `authentication/auth.js` | Se elimina `decripted pw` (`:762`); los `silly` del autologin pasan a `info`; errores TOKEN (`:808-845`) por `authLog.error`; bloques AD (`:163-197`) consolidados en un log por intento; `wso2oidCallback` (`:519`) con `req.user` sanitizado |
| `multiAuth/ad.js` | Bloques AD consolidados |
| `multiAuth/azureSaml.js`, `multiAuth/openIdConnect.js` | Pasan a `authLog` (perfil SAML en `:31`) |
| `index.js` | `user->` (`:482`) y errores de rutas de auth |
| `services.js` | `getUserInfo` (`:1149-1152`, `:1188-1190`): el `users->` que aparece en casi todos los clientes |
| `custom/ucalTls.js`, `userInfoMethod/ldap.js`, `userInfoMethod/userInfoMethod1.js` | Conversión con criterio D1 |
| `seeds/seeds.js`, `seeds/seed-helper.js` | Conversión; confirmar que no se loguea `cas_userinfo.pass` |

**Validación:** tests en verde; chequeo estático (F7) en cero; smoke local con los fixtures de cada proveedor. **Esfuerzo:** 1,5 a 2 días.

### F6. Sentry (`sandbox-api/server/app.js`)

- [ ] Extender el `beforeSend` existente: sanitizar `event.request.data`, `request.headers`, `request.cookies`, `extra` y `contexts`.
- [ ] Rama con Sentry deshabilitado: el evento que hoy se imprime con `console.error` se imprime sanitizado por el logger.
- [ ] `require` protegido del helper de `user-api`: si no está disponible, se descarta `request.data` en vez de enviarlo o imprimirlo.
- [ ] Hallazgo preexistente, **se consulta antes de tocarlo**: `const { message } = hint.originalException` lanza si no hay excepción (p. ej. `captureMessage`).

**Tests:** T43 (evento con `password` en `request.data` y en `extra`), T44 (helper no disponible: `request.data` descartado), T45 (Sentry deshabilitado: salida sanitizada).
**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,5 días.

### F7. Chequeo estático y smoke local

- [ ] Chequeo estático, con resultado esperado cero (fuera de `helpers/` y `test/`):
  ```bash
  grep -rnE "console\.(log|error|warn|info)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "logger\.(error|warn|info|http|verbose|debug|silly)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "Sentry\.capture(Exception|Message)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  ```
- [ ] Chequeo de sintaxis Node 10 en la imagen de producción:
  ```bash
  docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 sh -c 'for f in <archivos modificados>; do node --check "$f" || exit 1; done'
  ```
- [ ] Smoke que carga el logger real, pasa cada fixture por `authLog` e imprime la salida, en Docker con la imagen de producción, en tres escenarios:
  1. **sin `LOG_MASKING` ni `loggerLevel`** (como todos los clientes hoy);
  2. con `LOG_MASKING` mal formado;
  3. con `loggerLevel: 'info'`, niveles por estrategia y patrones personalizados.
- [ ] En los tres: sin claves visibles, correos e identificadores según nivel, nombres y códigos según config, sin excepciones.
- [ ] Repetir el relevamiento de campos (script de solo lectura) en QA después del despliegue, para confirmar que ya no aparecen campos de `block` con valor visible.

**Validación:** salidas guardadas como evidencia. **Esfuerzo:** 0,25 a 0,5 días.

### F8. Documentación

- [ ] **JSDoc** en `logSanitizer.js` y `authLog.js` (descripciones en español):
  - encabezado de módulo con el propósito y un enlace a `LOGGING.md`;
  - `@typedef` de `LogMaskingConfig`, `MaskingStrategyConfig`, `MaskLevel`, `MaskStrategy` y `TextDetectionConfig`, con cada opción, su tipo y su default;
  - `@param`, `@returns` y `@example` en `sanitizeForLog`, `maskValue`, `authLog.info`, `authLog.warn` y `authLog.error`;
  - las garantías y los marcadores posibles.
- [ ] **Guía `server/api/user-api/helpers/LOGGING.md`:**
  - qué resuelve y cuándo usar `authLog` (y por qué no `console.*`);
  - catálogo base por estrategia y tabla de niveles con ejemplos;
  - cómo se comparan los nombres (`keys`, `patterns`, último tramo de URL);
  - todas las opciones con default, efecto y si afectan la seguridad;
  - ejemplos: cambiar el nivel de nombres, agregar un campo, agregar un patrón, excluir un campo, mover `ds_name` a `id`, apagar la ofuscación;
  - avisos que emite al arrancar y cómo interpretarlos;
  - relación con `loggerLevel` y cómo verificar ambos en un pod;
  - cómo correr los tests (Docker con la imagen de producción);
  - resolución de problemas: `[MaxDepth]`, `...[truncado]`, `[SANITIZE_ERROR]`, `[Circular]`, "no veo los logs de auth", "un campo nuevo sale completo".
- [ ] **Plantilla de ejemplo** `sandbox-api/server/config/local.env.sample.backend.js`: bloque `LOG_MASKING` comentado con los defaults y `loggerLevel: 'info'`, con un comentario que apunte a la guía.
- [ ] **KB:** actualizar este documento y el mapa del sistema de logs si algo cambió.

**Validación:** `npx jsdoc -c jsdoc.json server/api/user-api/helpers -d <scratch>/jsdoc` sin errores ni advertencias y con los `@typedef` en la salida (puede correr con el Node del host); revisión de lectura de `LOGGING.md` por otra persona del equipo. **Esfuerzo:** 0,5 a 0,75 días.

### F9. Nivel de log en uvmcl (DevOps, en paralelo)

- [ ] Respaldar `/efs/<environment>/efs-pvc/templates/configurator/api/local.env.js` y agregar `loggerLevel: 'info',`. Primero QA, después producción.
- [ ] `kubectl rollout restart deployment/suite-api -n <namespace>`.
- [ ] Verificar en cada réplica:
  `kubectl exec -n <namespace> <pod> -c suite-api -- sh -c 'cd $HOME/sandbox-api && node -e "console.log(require(\"./server/config/logger.js\").transports.console.level)"'` → `info`.

**Esfuerzo:** 0,25 a 0,5 días.

### F10. QA, despliegue y verificación

**QA en `uvmcl-retention-qa`** (evidencia: `kubectl logs` filtrado por `clave|password|Login user response|OCULTO` y evento de Sentry si aplica):

| # | Caso | Esperado |
|---|---|---|
| Q1 | Login correcto | Entra normal; sesión completa (nombre, correo, rol, permisos). **Caso crítico** |
| Q2 | Log de Q1 | `[info]: Login user response` con fecha, `CLAVE: [OCULTO]`, correos e identificadores `light`, nombres y códigos completos |
| Q3 | Clave incorrecta | Mismo mensaje al usuario; log con resultado y sin la clave |
| Q4 | Login de estudiantes, correcto y fallido (si aplica) | Igual que antes; log sanitizado |
| Q5 | Ambiente **sin** `LOG_MASKING` | Funciona con defaults, sin errores ni avisos |
| Q6 | Con `LOG_MASKING` de prueba (`text: light`, `id: medium`, un `addPatterns`) y reinicio | Cada estrategia con su nivel |
| Q7 | Con `loggerLevel: 'info'` (tras F9) | Logs de auth visibles; `silly` y `debug` no |
| Q8 | Error del WebService (simulado) | Mensaje de siempre; navegador sin error crudo; Sentry sanitizado |
| Q9 | Relevamiento de campos repetido en QA | Ningún campo de `block` con valor visible |
| Q10 | Regresión | Navegar el módulo de retención y cerrar sesión sin errores nuevos |

**Despliegue:** en el orden definido en F0. Antes del merge, confirmar con DevOps que los clientes con imagen `master` estén fijados por digest.

**Producción de uvmcl:** smoke de login coordinado con el cliente, revisión del log de las 2 réplicas y de Sentry durante 24 horas.

**Criterio de salida:** tests T1 a T45 en verde en la imagen de producción, chequeo estático en cero, chequeo de sintaxis Node 10 sin errores, smoke local guardado, JSDoc generado sin errores, `LOGGING.md` revisado, Q1 a Q10 aprobados con evidencia y producción sin hallazgos.

**Esfuerzo:** 1 a 1,5 días.

---

## Esfuerzo total

| Fase | Días |
|---|---|
| F0 Verificación previa | 0,25 a 0,5 |
| F1 Helper | 2 a 2,5 |
| F2 Detección en texto | 0,75 a 1 |
| F3 `authLog` | 0,5 |
| F4 Login de uvmcl | 0,5 |
| F5 Resto de `user-api` | 1,5 a 2 |
| F6 Sentry | 0,5 |
| F7 Chequeo y smoke | 0,25 a 0,5 |
| F8 Documentación | 0,5 a 0,75 |
| F9 Nivel de log (DevOps, en paralelo) | 0,25 a 0,5 |
| F10 QA y despliegue | 1 a 1,5 |
| **Total** | **8 a 10,75** |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el login al sanitizar | T22 (el original no cambia) + Q1 |
| Sintaxis no soportada por Node 10 que solo falla en producción | Tests y smoke en la imagen de producción + `node --check` (F7) |
| Campos sensibles con nombres no previstos en otros clientes | Patrones por defecto (`mail`, `correo`, `documento`), config por ambiente sin redeploy de imagen y relevamiento repetible (F7, Q9) |
| Patrones que ocultan de más | Solo textos y números en niveles parciales (T8); `exclude`/`excludePatterns` por ambiente |
| Expresiones regulares configuradas inválidas o costosas | Compilación protegida, límite de 200 caracteres y uso solo contra nombres de campo (T16) |
| Referencias compartidas marcadas como circulares | Registro por camino + T24 |
| Perder alertas de Sentry al dejar `console.error` | `authLog.error` reenvía (D3) + T41 |
| Desfase de despliegue entre repos | Orden definido en F0 + `require` protegido en F6 (T44) |
| Datos perdidos o pisados por el formato del logger | Datos en `data` + T37 y T38 |
| Más volumen de log | Consolidación y eliminación de ruido (D1) |
| Ambientes sin config o con config errónea | Defaults + validación por opción (T12, T13, Q5) |
| Configuración que reduce la protección | Aviso visible al arrancar (T19) |
| Clientes con imagen `master` reciben el cambio sin validar | Fijación por digest (DevOps) |

## Fuera de alcance

- `console.*` del resto de `sandbox-api` fuera de `user-api` (unas 900 llamadas).
- Purga de logs ya almacenados en Loki (DevOps).
- Cifrado recuperable de claves.
- Protección de `/changeLog`.
