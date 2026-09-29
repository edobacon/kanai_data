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

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · Plan creado el 2026-09-29 · Producto: uPlanner Suite (legacy), no UP1.
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
| Datos | Qué se oculta por defecto | Contraseñas y secretos → `total` (`[OCULTO]`). Correo y RUT → parcial `light`. Nombres → visibles (`none`), pero catalogados para poder cambiar su nivel |
| D1 | Logs de ruido (`'tttt'`, `'vignesh'`, separadores, `'FALLO!'`) | **A:** se eliminan; los bloques de varias líneas se consolidan en un solo log con contexto |
| D2 | Ubicación del helper | **En `user-api`** (`server/api/user-api/helpers/`) |
| D3 | Errores que hoy llegan a Sentry por `console.error` | **A:** `authLog.error` los reenvía a Sentry, sanitizados |
| D4 | Alcance de la configuración | **Todo configurable**, incluido excluir o bajar el nivel de contraseñas y apagar la ofuscación. Todo **encendido por defecto**. Las reducciones de protección generan un aviso al arrancar |
| D5 | Sentry en `sandbox-api` | **A:** se incluye en este ticket (F6), con `require` protegido del helper |
| Config | Dónde vive | Catálogo y valores por defecto **dentro del helper**; `LOG_MASKING` en `local.env.js` solo sobrescribe. Sin configuración, el helper funciona igual |
| Docs | Documentación | JSDoc en todo lo público + guía de uso y configuración + ejemplo en la plantilla de config (F8) |
| Runtime de pruebas | Dónde corren los tests | En Docker con la **imagen de producción** `node:10.24.1-alpine3.11` (ver restricciones) |

"Siempre visible" significa que el log se ve con el nivel recomendado (`info`) y con cualquier nivel más detallado, incluido el caso sin `loggerLevel` configurado (`silly`, como uvmcl hoy). Solo se ocultaría si alguien configura explícitamente `warn` o `error`.

## Restricciones técnicas verificadas

| Restricción | Detalle | Consecuencia en el plan |
|---|---|---|
| Node 10 | La imagen de producción usa `node:10.24.1-alpine3.11`. Un prototipo del recorrido recursivo se ejecutó en esa imagen el 2026-09-29: funcionan `WeakSet`, `Object.getOwnPropertyNames` (para `Error`), spread de objetos, `Buffer.isBuffer` y `String.prototype.normalize('NFD')` (la imagen trae ICU 64.2), y el objeto original quedó intacto | Código sin `?.`, `??`, `Object.fromEntries` (Node 12), `Array.prototype.flat`/`flatMap` (Node 11), `String.prototype.matchAll` (Node 12) ni `structuredClone` (Node 17) |
| Node 10 local | El binario de Node 10 instalado con `nvm` en la máquina de desarrollo es para Intel y **no ejecuta** en Apple Silicon (`Bad CPU type in executable`) | **Todos los tests y el smoke corren en Docker** con la imagen de producción (comando en "Cómo correr los tests") |
| Sentry y `console.error` | `CaptureConsole` (`app.js:116`) envía cada `console.error` a Sentry. `winston` escribe directo a `process.stdout`, sin pasar por `console.error` | Pasar `console.error` a `logger.error` corta esos envíos: `authLog.error` los reenvía explícitamente (D3) |
| Formato del logger | Con 3 argumentos descarta los extra; con 2 mezcla las propiedades del objeto con las del mensaje (`message`, `level`, `stack` se pisan) | `authLog` llama siempre con 2 argumentos y los datos envueltos: `logger.info(msg, { data })` |
| Tests del repo | `server/test/globals.js` levanta la app completa y se conecta a la base | Los tests del helper corren aislados, sin `--opts` |
| JSDoc | El repo ya genera docs: `npm run jsdoc` (plantilla `docdash`, con `typedefs`) sobre `server/api/` | El JSDoc del helper debe generar sin errores con esa configuración |
| Repos | `user-api` es un repo propio dentro de `sandbox-api/server/api/`; `app.js` pertenece a `sandbox-api` | Dos ramas y dos PR. F6 hace un `require` protegido para tolerar desfases de despliegue |

## Cómo correr los tests

Desde la raíz de `sandbox-api` (monta el repo completo, incluido `server/api/user-api` y `node_modules`):

```bash
docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha server/api/user-api/test/helpers/<archivo>.test.js
```

Para correr todos los tests del helper:

```bash
docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha "server/api/user-api/test/helpers/**/*.test.js"
```

Notas:
- Se usa la imagen de producción: si pasa ahí, pasa en el runtime real.
- Mocha, Chai y winston son JavaScript puro, así que funcionan desde el `node_modules` del host sin recompilar.
- No se usa `--opts` para no levantar la app completa ni conectarse a la base.

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
| Helper de ofuscación | `server/api/user-api/helpers/logSanitizer.js` | Catálogo base, lectura y validación de config, recorrido recursivo, estrategias y niveles |
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
Log del pod: 26-09-29 10:00:00 - - [info]: Login user response { "data": { ... "CLAVE": "[OCULTO]" ... } }
```

### API

```js
const { sanitizeForLog, maskValue } = require('./helpers/logSanitizer')
const authLog = require('./helpers/authLog')

sanitizeForLog(valor)                  // objeto, lista, Error o texto → copia ofuscada
maskValue(valor, 'identifier')         // valor suelto: si parece correo o RUT lo oculta según su grupo; si no, lo deja
maskValue(valor, 'email' | 'rut' | 'text', 'light')   // valor suelto con estrategia y nivel explícitos

authLog.info('Login user response', { user: maskValue(name, 'identifier'), result })
authLog.warn('Login estudiante rechazado', { response, result })
authLog.error('Error al conectar con WebService cliente', err)    // además envía a Sentry, sanitizado
```

| Función | Nivel del logger | Para qué |
|---|---|---|
| `authLog.info` | `info` | Eventos normales del login |
| `authLog.warn` | `warn` | Situaciones anómalas que no son falla del sistema |
| `authLog.error` | `error` (+ Sentry) | Fallas |

### Niveles de ocultamiento

| Nivel | Qué hace |
|---|---|
| `none` | Deja el valor completo |
| `light` | Oculta una parte pequeña del final |
| `medium` | Deja solo el comienzo |
| `strong` | Deja lo mínimo para reconocer el formato |
| `total` | Reemplaza el valor por `totalText` (`[OCULTO]`) |

| Nivel | Texto (`PAULINA`) | Correo (`pablo.perez@uvm.cl`) | RUT (`18.456.789-K`) |
|---|---|---|---|
| `none` | `PAULINA` | `pablo.perez@uvm.cl` | `18.456.789-K` |
| `light` | `PAUL***` (oculta el tercio final) | `pablo.pe***@uvm.cl` (oculta los 3 últimos del usuario) | `18.456.***-K` (oculta los 3 últimos dígitos) |
| `medium` | `PA*****` (deja el tercio inicial) | `pa*********@uvm.cl` (deja los 2 primeros) | `18.***.***-K` (deja los 2 primeros dígitos) |
| `strong` | `P******` (deja el primero) | `p**********@uvm.cl` (deja el primero) | `**.***.***-K` (deja el verificador) |
| `total` | `[OCULTO]` | `[OCULTO]` | `[OCULTO]` |

Reglas para valores cortos o raros: nunca se muestra más de lo que indica el nivel; si el formato no se reconoce (correo sin `@`, RUT inválido), se aplica la estrategia `text` con el mismo nivel. En correos el dominio queda visible salvo en `total`.

### Catálogo base (dentro del helper)

```js
// Grupos por defecto: el helper funciona con esto aunque el ambiente no tenga configuración
const DEFAULT_MASKING_GROUPS = {
  password: { strategy: 'text',  level: 'total', keys: ['clave', 'password', 'pass', 'passwd', 'pwd', 'contrasena'] },
  secret:   { strategy: 'text',  level: 'total', keys: ['secret', 'clientsecret', 'token', 'accesstoken', 'refreshtoken',
                                                         'idtoken', 'authorization', 'cookie', 'aes256secrettoken', 'aes256iv'] },
  email:    { strategy: 'email', level: 'light', keys: ['mail', 'email', 'correo', 'correos', 'emailuvm', 'nmemail', 'dsmail'] },
  rut:      { strategy: 'rut',   level: 'light', keys: ['rut', 'run', 'nrrutuser'] },
  name:     { strategy: 'text',  level: 'none',  keys: ['nmnombrs', 'nmapepat', 'nmapemat', 'givenname', 'sn', 'fullname', 'dsfullname'] },
}
```

Las claves se comparan **normalizadas**: minúsculas, sin tildes (`normalize('NFD')`, verificado en la imagen de producción), sin `_`, `-` ni espacios (`CLAVE_ACCESO`, `claveAcceso` y `clave-acceso` son la misma clave).

### Configuración (`LOG_MASKING` en `local.env.js`, todo opcional)

```js
LOG_MASKING: {
  enabled: true,
  groups: {
    name:      { level: 'light' },                                        // cambia el nivel de un grupo existente
    rut:       { level: 'medium', add: ['rut_alumno'] },                  // nivel + claves nuevas
    email:     { exclude: ['dsmail'] },                                   // quita claves del grupo
    matricula: { strategy: 'text', level: 'medium', keys: ['nrmatric'] }, // grupo nuevo
  },
  exclude: [],
  totalText: '[OCULTO]',
  maskChar: '*',
  textDetection: true,
  maxDepth: 10,
  maxTextLength: 65536,
},
```

| Opción | Default | Qué controla |
|---|---|---|
| `enabled` | `true` | Enciende o apaga la ofuscación. Solo `false` o `'false'` la apagan |
| `groups.<g>.level` | Según catálogo | Nivel del grupo: `none`, `light`, `medium`, `strong`, `total` |
| `groups.<g>.strategy` | Según catálogo | Forma de ocultar: `text`, `email`, `rut` |
| `groups.<g>.add` / `exclude` | `[]` | Suma o quita claves del grupo |
| `groups.<nuevo>.keys` | (obligatorio en grupos nuevos) | Claves del grupo nuevo |
| `exclude` | `[]` | Quita claves de cualquier grupo |
| `totalText` | `'[OCULTO]'` | Texto que reemplaza los valores en nivel `total` |
| `maskChar` | `'*'` | Carácter del ocultamiento parcial |
| `textDetection` | `true` | Busca claves de grupos `total` dentro de textos (XML, `clave=...`, JSON serializado, `curl -u`). Apagarla vuelve a exponer esas claves |
| `maxDepth` | `10` | Niveles de anidación que se recorren; más allá se escribe `'[MaxDepth]'`. No afecta la seguridad (lo no recorrido no se imprime) |
| `maxTextLength` | `65536` | Tamaño máximo de cada texto; lo que excede se corta y se marca. No afecta la seguridad (lo cortado no se imprime) |

**Reglas de combinación** (una sola vez, al cargar el módulo):
1. Se parte del catálogo base.
2. Por cada grupo configurado: `level` y `strategy` reemplazan; `add` suma; `exclude` quita; `keys` define un grupo nuevo.
3. Se aplica el `exclude` global.
4. Si una clave queda en dos grupos, gana el nivel más fuerte (`total` > `strong` > `medium` > `light` > `none`).

**Validación y comportamiento por ambiente:**

| Situación | Comportamiento |
|---|---|
| Sin `LOG_MASKING` | Todo por defecto, activo, sin avisos |
| Solo algunas opciones | Se aplican esas; el resto queda por defecto |
| Un valor inválido (nivel o estrategia inexistente, número negativo, tipo incorrecto, grupo nuevo sin `keys`) | Solo ese valor vuelve a su default; el resto se respeta. **Un único** `logger.warn` al cargar, listando lo ignorado |
| Números fuera de rango | Se ajustan al valor válido más cercano; nunca falla |
| Reducción de protección (`enabled: false`, nivel de `password`/`secret` bajo `total`, exclusión de una de sus claves, `textDetection: false`) | Se aplica, con un `logger.warn` al arrancar: "Ofuscación de logs reducida por configuración: ..." |
| No se puede leer `local.env.js` | Todo por defecto, activo |

### Garantías

| Garantía | Cómo |
|---|---|
| No modifica el original | Construye un objeto nuevo mientras recorre (no copia y modifica). El mismo objeto arma la sesión |
| Nunca lanza excepciones | `try/catch` general en el helper y en `authLog`; ante error devuelve `'[SANITIZE_ERROR]'`, nunca el valor original, y el login sigue |
| Ciclos vs. referencias compartidas | El registro de visitados sigue **el camino actual**: el objeto se agrega al entrar y se quita al salir. Solo un ciclo real se marca `'[Circular]'`; un mismo objeto usado en dos campos distintos se muestra completo en ambos |
| `Error` | Recorre `message` y `stack` (no enumerables) con `Object.getOwnPropertyNames` y sanitiza las propiedades propias (`config.data`, `response.data` de axios, `cmd` de `exec`) |
| Otros tipos | `Buffer` → `'[Buffer N bytes]'`; `Date` → ISO; funciones se omiten; `null` y `undefined` se conservan; getters que lanzan → `'[SANITIZE_ERROR]'` en ese campo |
| Rendimiento | Config calculada una vez; `maxDepth` y `maxTextLength` acotan el trabajo por log |

---

## Fases

### F0. Verificación previa

- [ ] Confirmar con DevOps cómo se construye y despliega `user-api` y `sandbox-api` (orden de despliegue y si pueden llegar a producción por separado).
- [ ] Revisar si uvmcl tiene Sentry encendido (solo lectura):
  `kubectl exec -n uvmcl-retention <pod-suite-api> -c suite-api -- sh -c 'grep -n -A4 "SENTRY" $HOME/sandbox-api/server/config/local.env.js'`
- [ ] Revisar en el proyecto de Sentry si el filtro de datos del servidor está activo (elimina campos como `password`).
- [ ] Leer `uplanner/rules/COMMITS.md` y crear la rama `USUITE-15425-logs-auth-seguros` desde `develop` en `user-api` y en `sandbox-api`.
- [ ] Verificar que el comando de Docker de "Cómo correr los tests" funciona con un test mínimo (imagen `node:10.24.1-alpine3.11` disponible localmente).
- [ ] Conseguir un usuario de prueba de uvmcl para QA.
- [ ] Guardar como fixture una respuesta anonimizada del WebService de uvmcl (campos de la captura del ticket, valores ficticios) y fixtures de los demás proveedores (POST, TOKEN, SAML, OIDC, AD).

**Validación:** hallazgos anotados en el registro de avance. **Esfuerzo:** 0,25 a 0,5 días.

### F1. Helper de ofuscación (`logSanitizer.js`)

- [ ] Catálogo base, niveles y estrategias (`text`, `email`, `rut`).
- [ ] Lectura de `LOG_MASKING` protegida, combinación de reglas y validación por opción, con aviso único.
- [ ] Avisos de protección reducida al cargar.
- [ ] Recorrido recursivo con las garantías (incluida la distinción entre ciclos y referencias compartidas).
- [ ] `maskValue` con modo `identifier`.
- [ ] JSDoc completo (ver F8).

**Tests** (`server/api/user-api/test/helpers/logSanitizer.test.js`):

| # | Caso | Esperado |
|---|---|---|
| T1 | `CLAVE`, `Clave`, `password`, `contraseña` en distintos niveles | Todos `[OCULTO]` |
| T2 | Clave `total` que contiene objeto o lista | Subárbol entero `[OCULTO]` |
| T3 | Correos: normal, corto (`ab@x.cl`), sin `@`, mayúsculas | Salida según nivel; nunca de más |
| T4 | RUT con puntos, sin puntos, `k` minúscula, 7 dígitos, inválido | Salida según nivel |
| T5 | Lista `CORREOS` | Cada correo según su nivel |
| T6 | Nombres y códigos (`NMNOMBRS`, `CODERROR`) sin config | Sin cambios |
| T7 | Sin `LOG_MASKING` | Catálogo base |
| T8 | Config mal formada | Lo inválido al default, el resto aplicado, un solo aviso |
| T9 | `groups.name.level: 'light'` | `NMNOMBRS: 'PAUL***'`, resto igual |
| T10 | Niveles distintos a la vez (`name: light`, `rut: medium`, `password: total`) | Cada campo con su nivel |
| T11 | `add` y `exclude` por grupo y `exclude` global | Claves sumadas y quitadas |
| T12 | Grupo nuevo (`matricula`) | Se aplica; sin `keys` → se ignora con aviso |
| T13 | Clave en dos grupos | Gana el nivel más fuerte |
| T14 | Tabla de niveles completa para `text`, `email`, `rut` | Salidas exactas |
| T15 | `password.level: 'none'`, `exclude: ['clave']`, `enabled: false` | Se aplica + aviso de protección reducida |
| T16 | `enabled: 'false'`, `enabled: 0`, `enabled: 'no'` | Solo `'false'` apaga |
| T17 | `totalText` y `maskChar` personalizados | Se usan en la salida |
| T18 | **El original no cambia** (comparación profunda antes y después) | Idéntico |
| T19 | Ciclo real, profundidad 20, `null`, `undefined`, `Buffer`, `Date`, getter que lanza | Sin excepción; marcadores esperados |
| T19b | **Referencia compartida sin ciclo** (el mismo objeto en dos campos) | Se muestra completa en ambos campos; no aparece `'[Circular]'` |
| T20 | `Error` de axios con `config.data` con clave | Clave oculta dentro del error; `message` y `stack` presentes |
| T21 | `maskValue(x, 'identifier')` con RUT, correo y usuario simple | RUT y correo según su grupo; usuario simple visible |
| T22 | `maxDepth` y `maxTextLength` personalizados e inválidos | Límites aplicados; inválidos al default |
| T23 | Fixture de uvmcl | Salida exacta esperada |

**Validación:** tests en verde en Docker con la imagen de producción (ver "Cómo correr los tests"). **Esfuerzo:** 1,5 a 2 días.

### F2. Detección de datos dentro de texto

- [ ] Patrones construidos desde las claves de grupos `total`: `<clave>...</clave>`, `clave=...`, `"clave":"..."`, `-u usuario:secreto`. Sin lookbehind ni otras funciones de expresiones regulares posteriores a Node 10.
- [ ] Corte por `maxTextLength` antes de buscar.
- [ ] Respeta `textDetection: false`.

**Tests:** T24 (XML), T25 (`clave=` y JSON serializado), T26 (`curl -u` y `--data`), T27 (texto mayor a `maxTextLength`: se corta y se marca, sin error), T28 (`textDetection: false`: textos intactos, campos por nombre sí).
**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,5 a 0,75 días.

### F3. Función de log `authLog.js`

- [ ] `info`, `warn`, `error`: sanitizan y llaman al logger global con 2 argumentos y los datos envueltos en `{ data }`.
- [ ] `error` reenvía a Sentry mensaje y error sanitizados, si Sentry está disponible.
- [ ] `try/catch` general: ante falla escribe un log mínimo (`'authLog error'`) y no propaga.
- [ ] JSDoc completo (ver F8).

**Tests** (`authLog.test.js`):

| # | Caso | Esperado |
|---|---|---|
| T29 | Salida con el formato real de `config/logger.js` | `[info]: Login user response { "data": { ... "CLAVE": "[OCULTO]" ... } }` |
| T30 | Datos con claves `message`, `level`, `stack` | No se pisan; quedan dentro de `data` |
| T31 | Logger en `silly` (sin `loggerLevel`) y en `info` | Se imprime en ambos |
| T32 | Sanitizador que falla (stub) | No lanza; queda log mínimo |
| T33 | `authLog.error` | Sentry recibe datos sanitizados (stub) |
| T34 | Sentry ausente o deshabilitado | No lanza |

**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,5 días.

### F4. Conversión del login de uvmcl (`loginServices.js`)

- [ ] `:243` `console.log('Login user response', name, result)` → `authLog.info('Login user response', { user: maskValue(name, 'identifier'), result })`.
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
| `services.js` | `getUserInfo` (`:1149-1152`, `:1188-1190`) |
| `custom/ucalTls.js`, `userInfoMethod/ldap.js`, `userInfoMethod/userInfoMethod1.js` | Conversión con criterio D1 |
| `seeds/seeds.js`, `seeds/seed-helper.js` | Conversión; confirmar que no se loguea `cas_userinfo.pass` |

**Validación:** tests en verde; chequeo estático (F7) en cero; smoke local con fixtures de cada proveedor. **Esfuerzo:** 1,5 a 2 días.

### F6. Sentry (`sandbox-api/server/app.js`)

- [ ] Extender el `beforeSend` existente: sanitizar `event.request.data`, `request.headers`, `request.cookies`, `extra` y `contexts`.
- [ ] Rama con Sentry deshabilitado: el evento que hoy se imprime con `console.error` se imprime sanitizado por el logger.
- [ ] `require` protegido del helper de `user-api`: si no está disponible, se descarta `request.data` en vez de enviarlo o imprimirlo.
- [ ] Hallazgo preexistente, **se consulta antes de tocarlo**: `const { message } = hint.originalException` lanza si no hay excepción (p. ej. `captureMessage`).

**Tests:** T35 (evento con `password` en `request.data` y en `extra`), T36 (helper no disponible: `request.data` descartado), T37 (Sentry deshabilitado: salida sanitizada).
**Validación:** tests en verde en Docker con la imagen de producción. **Esfuerzo:** 0,5 días.

### F7. Chequeo estático y smoke local

- [ ] Chequeo estático, con resultado esperado cero (fuera de `helpers/` y `test/`):
  ```bash
  grep -rnE "console\.(log|error|warn|info)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "logger\.(error|warn|info|http|verbose|debug|silly)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "Sentry\.capture(Exception|Message)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  ```
- [ ] Chequeo de sintaxis Node 10: cargar cada archivo modificado en la imagen de producción para detectar sintaxis no soportada (`?.`, `??`, etc.):
  ```bash
  docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 sh -c 'for f in <archivos modificados>; do node --check "$f" || exit 1; done'
  ```
- [ ] Script de smoke que carga el logger real, pasa cada fixture por `authLog` e imprime la salida, **ejecutado en Docker con la imagen de producción**, en tres escenarios:
  1. **sin `LOG_MASKING` ni `loggerLevel`** (igual que uvmcl hoy);
  2. con `LOG_MASKING` mal formado;
  3. con `loggerLevel: 'info'` y niveles personalizados por grupo.
- [ ] En los tres: sin claves visibles, correo y RUT según nivel, nombres y códigos según config, sin excepciones.

**Validación:** salida del chequeo de sintaxis y del smoke guardada como evidencia. **Esfuerzo:** 0,25 a 0,5 días.

### F8. Documentación

- [ ] **JSDoc** en `logSanitizer.js` y `authLog.js` (descripciones en español):
  - encabezado de módulo con el propósito y un enlace a `LOGGING.md`;
  - `@typedef` de `LogMaskingConfig`, `MaskingGroup`, `MaskLevel` y `MaskStrategy`, con cada opción, su tipo y su default;
  - `@param`, `@returns` y `@example` en `sanitizeForLog`, `maskValue`, `authLog.info`, `authLog.warn` y `authLog.error`;
  - las garantías (no modifica el original, nunca lanza, marcadores posibles).
- [ ] **Guía `server/api/user-api/helpers/LOGGING.md`:**
  - qué resuelve y cuándo usar `authLog` (y por qué no `console.*`);
  - catálogo base y tabla de niveles con ejemplos;
  - todas las opciones con default, efecto y si afectan la seguridad;
  - ejemplos de configuración: cambiar el nivel de nombres, agregar una clave nueva, excluir una clave, crear un grupo, apagar la ofuscación;
  - avisos que emite al arrancar y cómo interpretarlos;
  - relación con `loggerLevel` (el nivel decide si se imprime; el helper decide qué se imprime) y cómo verificar ambos en un pod;
  - cómo correr los tests (Docker con la imagen de producción);
  - resolución de problemas: "veo `[MaxDepth]`", "veo `...[truncado]`", "no veo los logs de auth", "veo `[SANITIZE_ERROR]`", "veo `[Circular]`".
- [ ] **Plantilla de ejemplo** `sandbox-api/server/config/local.env.sample.backend.js`: bloque `LOG_MASKING` comentado con los defaults y `loggerLevel: 'info'`, con un comentario que apunte a la guía.
- [ ] **KB:** actualizar este documento (registro de avance) y el mapa del sistema de logs si algo cambió.

**Validación:** `npx jsdoc -c jsdoc.json server/api/user-api/helpers -d <scratch>/jsdoc` genera sin errores ni advertencias y los `@typedef` aparecen en la salida (la generación de docs no depende del runtime, puede correr con el Node del host); revisión de lectura de `LOGGING.md` por otra persona del equipo. **Esfuerzo:** 0,5 a 0,75 días.

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
| Q2 | Log de Q1 | `[info]: Login user response` con fecha, `CLAVE: [OCULTO]`, correo y RUT `light`, nombres y códigos completos |
| Q3 | Clave incorrecta | Mismo mensaje al usuario; log con resultado y sin la clave |
| Q4 | Login de estudiantes, correcto y fallido (si aplica) | Igual que antes; log sanitizado |
| Q5 | Ambiente **sin** `LOG_MASKING` | Funciona con defaults, sin errores ni avisos |
| Q6 | Con `LOG_MASKING` de prueba (`name: light`, `rut: medium`) y reinicio | Cada grupo con su nivel |
| Q7 | Con `loggerLevel: 'info'` (tras F9) | Logs de auth visibles; `silly` y `debug` no |
| Q8 | Error del WebService (simulado) | Mensaje de siempre; navegador sin error crudo; Sentry sanitizado |
| Q9 | Sentry deshabilitado (si aplica en QA) | El evento impreso sale sanitizado |
| Q10 | Regresión | Navegar el módulo de retención y cerrar sesión sin errores nuevos |

**Despliegue:** en el orden definido en F0. Antes del merge, confirmar con DevOps que los clientes con imagen `master` estén fijados por digest.

**Producción de uvmcl:** smoke de login coordinado con el cliente, revisión del log de las 2 réplicas y de Sentry durante 24 horas.

**Criterio de salida:** tests T1 a T37 (incluido T19b) en verde en la imagen de producción, chequeo estático en cero, chequeo de sintaxis Node 10 sin errores, smoke local guardado, JSDoc generado sin errores, `LOGGING.md` revisado, Q1 a Q10 aprobados con evidencia y producción sin hallazgos.

**Esfuerzo:** 1 a 1,5 días.

---

## Esfuerzo total

| Fase | Días |
|---|---|
| F0 Verificación previa | 0,25 a 0,5 |
| F1 Helper | 1,5 a 2 |
| F2 Detección en texto | 0,5 a 0,75 |
| F3 `authLog` | 0,5 |
| F4 Login de uvmcl | 0,5 |
| F5 Resto de `user-api` | 1,5 a 2 |
| F6 Sentry | 0,5 |
| F7 Chequeo y smoke | 0,25 a 0,5 |
| F8 Documentación | 0,5 a 0,75 |
| F9 Nivel de log (DevOps, en paralelo) | 0,25 a 0,5 |
| F10 QA y despliegue | 1 a 1,5 |
| **Total** | **7,25 a 10** |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el login al sanitizar | T18 (el original no cambia) + Q1 |
| Sintaxis no soportada por Node 10 que solo falla en producción | Tests y smoke en la imagen de producción + chequeo `node --check` (F7) |
| Referencias compartidas marcadas como circulares (se pierde info de debug) | Registro de visitados por camino + T19b |
| Perder alertas de Sentry al dejar `console.error` | `authLog.error` reenvía (D3) + T33 |
| Desfase de despliegue entre repos | Orden definido en F0 + `require` protegido en F6 (T36) |
| Datos perdidos o pisados por el formato del logger | Datos envueltos en `data` + T29 y T30 |
| Más volumen de log | Consolidación y eliminación de ruido (D1) |
| Ambientes sin config o con config errónea | Defaults + validación por opción (T7, T8, Q5) |
| Configuración que reduce la protección | Aviso visible al arrancar (T15) |
| Clientes con imagen `master` reciben el cambio sin validar | Fijación por digest (DevOps) |

## Fuera de alcance

- `console.*` del resto de `sandbox-api` fuera de `user-api` (unas 900 llamadas).
- Purga de logs ya almacenados en Loki (DevOps).
- Cifrado recuperable de claves.
- Protección de `/changeLog`.
