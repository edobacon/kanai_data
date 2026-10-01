---
id: DOC-kb-sp12-usuite-15425-plan-helper-ofuscacion-y-mapa-logger
project: up1
type: doc
module: sandbox-api/core-api/helpers
tags:
  - usuite-15425
  - seguridad
  - logs
  - legacy
  - sandbox-api
  - logger
  - helper
  - plan
---

# USUITE-15425: plan del helper de ofuscación y mapa del sistema de logs de suite-api

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · 2026-09-28 · Producto: uPlanner Suite (legacy), no UP1.
> Documentos relacionados (misma carpeta):
> - [usuite-15425-claves-en-logs-uvmcl.md](./usuite-15425-claves-en-logs-uvmcl.md): análisis inicial y flujo del login de uvmcl.
> - [usuite-15425-niveles-de-solucion.md](./usuite-15425-niveles-de-solucion.md): consolidado de vulnerabilidades, estado verificado de uvmcl y niveles de solución 0 a 3.
>
> Este documento detalla el **nivel 2 (helper que oculta)**, extendido con ofuscación parcial configurable, y agrega el **mapa del sistema de logs**.

## Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| 1 | Dónde vive la configuración de reglas | **Opción A:** defaults en código + override por cliente en `local.env.js` (plantilla del EFS). Cambiar reglas requiere reiniciar pods, no imagen nueva |
| 2 | Alcance | **Todos los flujos de login** (WSDL, estudiantes, POST, autologin, TOKEN, SAML, OIDC, AD/LDAP, `getUserInfo`) + Sentry |
| 3 | Detección de datos dentro de texto (XML crudo, `password=...`) | Evaluada por esfuerzo (sección 7): **se recomienda incluirla**, porque el alcance "todos los flujos" tiene casos reales que solo se cubren así |
| 4 | Utilidad de debug | **Se mantiene.** Solo se tocan los campos con regla; nombres, RUT y correos van en `PARTIAL` (legibles en parte), y solo secretos van en `TOTAL` |

## Restricciones del código actual

- **suite-api corre con Node 10** (`FROM node:10.24.1-alpine3.11`): sin `structuredClone`, `?.`, `??` ni `Object.fromEntries`. El helper debe escribirse compatible con Node 10.
- **Tres repos:** `core-api` (helpers compartidos), `user-api` (login) y `sandbox-api` (`app.js`, Sentry). Cambio multi-repo con orden de despliegue.
- **Tests:** Mocha 6 + Chai 3, archivos `server/api/**/test/**/*.test.js`.

---

# Parte A. Mapa del sistema de logs de suite-api

## A.1 Cómo se arma el nivel del logger

```
EFS: /efs/<environment>/efs-pvc/templates/configurator/api/local.env.js     (plantilla por ambiente)
        │   montado en el pod como /data/templates/configurator/api/local.env.js
        ▼
bin/docker-entrypoint.sh  (al arrancar el pod)
        │   copia la plantilla a server/config/local.env.js
        │   (o la genera desde local.env.js.tpl con envsubst, si ese archivo existe)
        ▼
server/config/local.env.js   → propiedad `loggerLevel` (hoy NO existe en uvmcl)
        ▼
server/config/logger.js:35
        │   new winston.transports.Console({ level: env.loggerLevel || 'silly' })
        │   winston.configure({ format, transports: [console] })   ← configura el logger GLOBAL
        ▼
Todo el código que hace  const logger = require('winston')  usa ese logger global
        ▲
        │   GET /changeLog/:logLevel  (app.js:64)
        │   cambia transports.console.level EN MEMORIA, solo en el pod que recibe la llamada,
        │   hasta el siguiente reinicio. Sin autenticación y sin rastro en el log.
```

Puntos clave:
- El nivel se lee **una sola vez al arrancar**. Cambiar la plantilla requiere reiniciar los pods.
- El único cambio en caliente es `/changeLog`, que afecta a una réplica a la vez y no queda registrado. Se declara antes del registrador de requests (`app.js:155`) y de `morgan` (`app.js:250`).
- **No existe forma de consultar el nivel actual** de un pod en ejecución. Sí se puede ver el nivel **configurado** con:
  `node -e "console.log(require('./server/config/logger.js').transports.console.level)"` (desde `$HOME/sandbox-api` dentro del pod).

## A.2 Los niveles

`winston` usa los niveles estándar de npm. Cada nivel tiene una prioridad; **con un nivel configurado se imprimen ese nivel y todos los más graves**.

| Prioridad | Nivel | Para qué se usa | Llamadas en `sandbox-api` |
|---|---|---|---|
| 0 | `error` | Fallas | 145 |
| 1 | `warn` | Situaciones anómalas que no rompen | 14 |
| 2 | `info` | Eventos normales (requests, health) | 40 + log de requests |
| 3 | `http` | Tráfico HTTP detallado | 1 |
| 4 | `verbose` | Detalle de procesos | 12 |
| 5 | `debug` | Depuración (p. ej. consultas SQL en modo `development`) | 10 |
| 6 | `silly` | Máximo detalle | 50 |

## A.3 Qué muestra u oculta cada configuración

| `loggerLevel` | `error` | `warn` | `info` | `http` | `verbose` | `debug` | `silly` |
|---|---|---|---|---|---|---|---|
| `error` | Sí | No | No | No | No | No | No |
| `warn` | Sí | Sí | No | No | No | No | No |
| `info` (recomendado) | Sí | Sí | Sí | No | No | No | No |
| `http` | Sí | Sí | Sí | Sí | No | No | No |
| `verbose` | Sí | Sí | Sí | Sí | Sí | No | No |
| `debug` | Sí | Sí | Sí | Sí | Sí | Sí | No |
| `silly` **(uvmcl hoy: sin definir)** | Sí | Sí | Sí | Sí | Sí | Sí | Sí |

El nivel **solo decide si una línea se imprime**. No modifica ni oculta su contenido: si la línea se imprime y lleva una contraseña, la contraseña sale en claro.

## A.4 Salidas de log que NO controla `loggerLevel`

| Salida | Dónde | Cómo se ve en el log | ¿La controla `loggerLevel`? |
|---|---|---|---|
| `console.log` / `console.error` / `console.warn` | 925 / 110 / 8 llamadas en `sandbox-api` (incluida la línea del caso, `loginServices.js:243`) | Sin fecha ni `[nivel]`; objetos en varias líneas | **No, se imprime siempre** |
| `morgan('dev')` | `config/express.js:66` y `:76` (activo porque la app corre en `development`) | `OPTIONS /api/user-api 200 0.295 ms - 4` | No |
| Log de requests `express-winston` | `app.js:155` | `[info]: GET /api/... 200 1ms` | Sí (es nivel `info`) |
| Sentry: `CaptureConsole` | `app.js:116`, `levels: ['error']` | No va al log: **envía cada `console.error` a Sentry** | No |
| Sentry: `beforeSend` con Sentry deshabilitado | `app.js:123-141` | Si `SENTRY.ENABLED` es falso, **imprime el evento completo con `console.error`** | No |
| Logger propio de rosario-api | `api/rosario-api-prod/util/log.js:9` (`bunyan`) | Formato de bunyan | No (usa otro logger) |

## A.5 Formato: por qué `logger.silly(msg, a, b)` "no muestra nada"

Con el formato de `config/logger.js` (sin `format.splat()`):

| Llamada | Qué imprime |
|---|---|
| `logger.x('texto')` | `[x]: texto` |
| `logger.x('texto', objeto)` | `[x]: texto { ...objeto completo en JSON... }` |
| `logger.x('texto', valor1, valor2)` | `[x]: texto` (los valores extra se descartan) |

Verificado ejecutando el logger del repo con datos ficticios.

## A.6 Estado verificado en uvmcl (producción, 2026-09-28)

- `loggerLevel` no existe en la plantilla ni en la config del pod → **nivel configurado `silly`**.
- La app corre con `NODE_ENV=development` (lo fuerza `gulpfile.js:26`).
- En el log reciente solo aparecen líneas `[info]`. El nivel real no es `error` ni `warn`; entre `info` y `silly` no se puede saber, por lo que pudo haber pasado con `/changeLog`.

---

# Parte B. Plan del helper de ofuscación

## B.1 Idea

`sanitizeForLog(valor, opciones)` recorre el dato de forma recursiva y **construye una copia nueva**. Para cada propiedad busca su nombre en la tabla de reglas y aplica el modo que corresponda. Funciona con cualquier forma de respuesta. Para un sistema nuevo con propiedades nuevas, basta con agregar los nombres de campo en la configuración.

Archivo propuesto: `server/api/core-api/helpers/logSanitizer.helper.js`.

## B.2 Modos y jerarquía

| Modo | Qué hace | Ejemplo |
|---|---|---|
| `NONE` | Deja el valor igual (default de campos sin regla) | `CODERROR: '0'` |
| `PARTIAL` | Campo legible, con datos parciales según una estrategia | `EMAILUVM: 'pa***@uvm.cl'` |
| `TOTAL` | Valor reemplazado por un texto fijo, sin revelar el largo | `CLAVE: '[REDACTED]'` |

**Jerarquía:**
- Si a un campo le aplican varias reglas, gana la más restrictiva: `TOTAL` > `PARTIAL` > `NONE`.
- `TOTAL` sobre un objeto o una lista bloquea el subárbol entero.
- `PARTIAL` sobre una lista u objeto aplica la estrategia a cada valor de texto que contiene (p. ej. `CORREOS: ['a@x.cl', 'b@x.cl']`).
- Queda espacio para un modo futuro `ENCRYPT` (nivel 3 de las soluciones) como una estrategia más, sin cambiar el recorrido.

## B.3 Estrategias de `PARTIAL`

| Estrategia | Regla | Entrada → Salida |
|---|---|---|
| `email` | 2 primeros caracteres del usuario + `***` + dominio completo | `pablo.perez@uvm.cl` → `pa***@uvm.cl` |
| `rut` | 2 primeros dígitos + `.***.***-` + dígito verificador | `18.456.789-K` / `18456789K` → `18.***.***-K` |
| `generic` | N primeros y M últimos caracteres (configurable; para nombres, N=2 y M=1) | `PAULINA` → `PA****A` |

Si un valor no tiene la forma esperada (un "email" sin `@`, un RUT con formato raro), se usa `generic`. **Nunca se deja el valor completo por un error de formato.**

## B.4 Utilidad de debug que se conserva

| Lo que soporte necesita saber | Cómo se sigue viendo |
|---|---|
| ¿Respondió el WebService? ¿Validó? ¿Por qué falló? | `CODERROR`, `CODIGOERROR`, `NRESTADO` y demás campos sin regla quedan intactos |
| ¿Qué usuario es? | RUT parcial (`18.***.***-K`) + iniciales de nombres; se contrasta con el RUT que informa el usuario |
| ¿Llegó el correo? ¿De qué dominio? | Dominio completo visible (`pa***@uvm.cl`) |
| ¿Viene vacío o con datos? | `null` y `''` se conservan tal cual (no se enmascaran) |
| ¿Cuál es la clave? | No se puede ver (`TOTAL`). Para verla haría falta el nivel 3 (cifrado) |

## B.5 Configuración (opción A)

**Formato** (dentro de `module.exports` de la plantilla `local.env.js`; todo es opcional):

```js
LOG_MASKING: {
  rules: [
    { keys: ['clave_acceso'], mode: 'TOTAL' },                         // agrega un campo nuevo
    { keys: ['nrrutalumno'], mode: 'PARTIAL', strategy: 'rut' },
    { keys: ['nmnombrs'], mode: 'PARTIAL', strategy: 'generic', keepStart: 2, keepEnd: 1 },
  ],
  maxDepth: 10,
  textDetection: true,
}
```

**Reglas por defecto en código:**

| Modo | Campos (normalizados) |
|---|---|
| `TOTAL` (piso fijo) | `clave`, `password`, `pass`, `passwd`, `pwd`, `contrasena`, `secret`, `clientsecret`, `token`, `accesstoken`, `refreshtoken`, `idtoken`, `authorization`, `cookie`, `aes256secrettoken`, `aes256iv` |
| `PARTIAL` `email` | `mail`, `email`, `correo`, `correos`, `emailuvm`, `nmemail` |
| `PARTIAL` `rut` | `rut`, `run`, `nrrutuser`, `dvrutalu` |
| `PARTIAL` `generic` | `nmnombrs`, `nmapepat`, `nmapemat`, `givenname`, `sn`, `fullname`, `dsfullname` |

**Normalización del nombre del campo:** minúsculas, sin tildes, sin `_`, `-` ni espacios. `CLAVE`, `Clave`, `contraseña` y `access-token` coinciden sin escribir cada variante. La comparación es **exacta** por defecto. Una regla puede usar `contains: ['email']` para variantes, con cuidado de no generar falsos positivos (`pass` dentro de `passport`).

**Piso de seguridad:** las reglas `TOTAL` por defecto **no se pueden bajar** desde la configuración. La config puede agregar campos o subir un modo (`NONE` → `PARTIAL` → `TOTAL`), nunca bajarlo. Un error de configuración no puede volver a exponer claves.

**Config inválida:** si `LOG_MASKING` viene mal formado, se ignora con un `logger.warn` y se usan los defaults. Nunca se desactiva la ofuscación por un error de config.

## B.6 Garantías

| Garantía | Cómo | Por qué |
|---|---|---|
| **No modifica el original** | Construye el objeto nuevo mientras recorre (no copia y modifica) | El mismo objeto arma la sesión; si se modifica, el login se rompe |
| **No lanza excepciones** | `try/catch` general; ante error devuelve `'[SANITIZE_ERROR]'`, nunca el original | Un log no puede tumbar el login |
| Referencias circulares | `WeakSet` de visitados → `'[Circular]'` | Respuestas de SOAP y axios las tienen |
| Profundidad máxima | Por defecto 10 → `'[MaxDepth]'` | Evita recorridos enormes |
| `Error` | Se sanitizan `message`, `stack` y propiedades propias (`config.data`, `response.data` de axios, `cmd` de `exec`) | Los errores traen el request con la clave |
| Otros tipos | `Buffer` → `'[Buffer N bytes]'`; `Date` → ISO; funciones se omiten; `null`/`undefined` se conservan | Salida estable |
| Getters que fallan | Se capturan → `'[SANITIZE_ERROR]'` en ese campo | No rompe el resto |

## B.7 API

```js
const { sanitizeForLog, maskValue } = require('../core-api/helpers/logSanitizer.helper')

sanitizeForLog(obj)          // objeto/lista/Error/texto → copia ofuscada
maskValue(valor, 'rut')      // valor suelto con una estrategia: 'rut' | 'email' | 'generic' | 'total'
```

`maskValue` hace falta porque hay valores sueltos sin nombre de campo. En la línea del caso, el segundo argumento `name` es el RUT del usuario (`1845...` en la captura).

**Ejemplo, línea del caso (`loginServices.js:243`):**

```js
console.log('Login user response', maskValue(name, 'rut'), sanitizeForLog(result))
```

Salida esperada con los campos de la captura (valores ficticios):

```
Login user response 18.***.***-X { LoginResult:
   { AAMATRIC: '0', CDCARRER: '0', CLAVE: '[REDACTED]', CODERROR: '0', CODIGOERROR: '0',
     CORREOS: null, DVRUTALU: '0', EMAILUVM: 'pa***@uvm.cl', NMAPEMAT: 'GO***Z',
     NMAPEPAT: 'PE**Z', NMEMAIL: 'pa***@dominio.co', NMNOMBRS: 'PA*****A', NMUSERDOM: null,
     NRESTADO: '0', NRRUTUSER: '18.***.***-X' } }
```

## B.8 Puntos donde se aplica (todos los flujos)

| # | Dónde | Cambio |
|---|---|---|
| 1 | `loginServices.js:243` (WSDL) | `maskValue(name, 'rut')` + `sanitizeForLog(result)` |
| 2 | `loginServices.js:815` (WSDL estudiantes) | `sanitizeForLog(response)`, `sanitizeForLog(result)` |
| 3 | `loginServices.js:211` y `:247` (WSDL) | Sentry recibe `sanitizeForLog(err)`; al navegador solo mensaje y código, sin `error: err` |
| 4 | `auth.js:762` (autologin) | Se elimina el log `decripted pw` (no aporta a debug) |
| 5 | `loginServices.js:91` (POST) | `sanitizeForLog(response.data)` |
| 6 | `auth.js:808-845` (TOKEN) | Sentry recibe `sanitizeForLog(err)` (con detección de texto cubre `err.cmd` del `curl`) |
| 7 | `index.js:482` (SAML), `auth.js:519` (OIDC), `services.js:1151` y `:1189` | `sanitizeForLog(req.user)`, `sanitizeForLog(users)`, `sanitizeForLog(req.session.cas_userinfo)` |
| 8 | `auth.js:163-197` (AD), `userInfoMethod/ldap.js` | `maskValue(username, 'generic')` y `sanitizeForLog(err)` |
| 9 | `app.js:123-141` (`beforeSend` de Sentry) | Se **extiende** el `beforeSend` existente: sanitiza `event.request.data`, `request.headers`, `extra` y `contexts`; y el `console.error` que imprime cuando Sentry está deshabilitado pasa por `sanitizeForLog` |

Hallazgo preexistente en el punto 9 (no se corrige sin aprobación): `const { message } = hint.originalException` lanza error cuando `originalException` no existe (por ejemplo en `Sentry.captureMessage`). Al extender la función conviene proteger esa lectura; se consulta antes de tocarla.

## B.9 Fases

| Fase | Qué se hace | Repo | Validación | Días |
|---|---|---|---|---|
| F1 | Helper: recorrido, modos, jerarquía, estrategias, lectura de config con piso de seguridad, garantías + tests T1 a T12 | `core-api` | Tests unitarios | 1 a 1,5 |
| F1b | Detección de texto incrustado (sección 7) + tests T13 a T15 | `core-api` | Tests unitarios | 0,5 a 0,75 |
| F2 | Aplicar en el flujo WSDL de uvmcl (puntos 1 a 3) | `user-api` | Tests + log local con respuesta de ejemplo | 0,25 a 0,5 |
| F3 | Extender `beforeSend` de Sentry (punto 9) | `sandbox-api` | Test de evento con `password` | 0,5 |
| F4 | Aplicar en los demás flujos (puntos 4 a 8) + fixtures por tipo de login | `user-api` | Tests con respuestas de ejemplo | 1 a 1,5 |
| F5 | Code review, QA en `uvmcl-retention-qa`, despliegue y verificación en producción | | Plan de prueba de uvmcl (documento de niveles, sección 6) | 1 a 1,5 |
| | **Total** | | | **4,25 a 6,25** |

**Prerrequisito:** nivel 0 aplicado (`loggerLevel: 'info'` en la plantilla + reinicio). Ver documento de niveles.

**Orden de despliegue:** `core-api` (el helper sin usar es inofensivo) → `user-api` → `sandbox-api`. Antes de empezar, confirmar con DevOps cómo se construye la imagen de cada sub-repo, porque el pod arma `server/api/` copiando productos al arrancar.

## B.10 Tests unitarios

| # | Caso | Esperado |
|---|---|---|
| T1 | Objeto anidado con `CLAVE`, `Clave`, `password`, `contraseña` en distintos niveles | Todos `[REDACTED]` |
| T2 | `TOTAL` sobre un campo con objeto o lista | Subárbol entero bloqueado |
| T3 | `PARTIAL` `email`, `rut`, `generic`, incluidos formatos raros | Salida parcial; nunca el valor completo |
| T4 | Lista `CORREOS` con `PARTIAL` | Cada correo enmascarado |
| T5 | Campo con reglas `PARTIAL` y `TOTAL` a la vez | Gana `TOTAL` |
| T6 | Config que intenta bajar `clave` a `NONE` | Se ignora; sigue `TOTAL` |
| T7 | Config que agrega un campo nuevo | Se aplica |
| T8 | **El original no cambia** (comparación profunda antes y después) | Idéntico |
| T9 | Circular, profundidad 20, `null`, `undefined`, números, `Buffer`, `Date` | Sin excepción; marcadores esperados |
| T10 | `Error` de axios con `config.data` con clave | Clave `[REDACTED]` dentro del error |
| T11 | Getter que lanza excepción | No rompe; marcador en ese campo |
| T12 | Respuesta anonimizada de uvmcl (campos de la captura) | Igual a la salida de B.7 |
| T13 | Texto con XML `<CLAVE>x</CLAVE>` | `<CLAVE>[REDACTED]</CLAVE>` |
| T14 | Texto con `password=x&user=y` y JSON serializado `"password":"x"` | Valor reemplazado |
| T15 | Comando `curl -u USER:SECRET ... --data "...password..."` | Credenciales reemplazadas |

## B.11 Detección de texto incrustado: evaluación por esfuerzo

| | Detalle |
|---|---|
| Qué cubre | Valores de texto que contienen datos sensibles sin nombre de campo: XML crudo (rama `PARSE_TYPE == 'XML'` del login WSDL), cuerpos `password=...`, JSON serializado dentro de un string, y el comando `curl` del login TOKEN que viaja en `err.cmd` |
| Cómo | Expresiones regulares construidas desde las mismas claves `TOTAL`: `<clave>...</clave>`, `clave=...`, `"clave":"..."`, `-u usuario:secreto` |
| Esfuerzo | 0,5 a 0,75 días |
| Riesgo | Falsos positivos en textos largos (se mitiga aplicándolo solo a claves `TOTAL`) y costo de CPU en strings grandes (se mitiga con un límite de tamaño, p. ej. 64 KB) |
| Sin esto | Los puntos 2 (rama XML) y 6 (TOKEN) quedan sin cubrir, aunque están dentro del alcance "todos los flujos" |
| **Recomendación** | **Incluirla (F1b).** El costo es acotado y cierra dos puntos del alcance acordado |

## B.12 Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el login al sanitizar | Nunca modificar el original (T8) + caso crítico "login correcto" en QA |
| Campo sensible con un nombre no previsto | Reglas extensibles por config sin redeploy de imagen; revisión de fixtures por tipo de login (F4) |
| Falsos positivos que ocultan info útil | Comparación exacta por defecto; `contains` solo explícito; `PARTIAL` en vez de `TOTAL` para datos personales |
| Config mal escrita | Se ignora con aviso; el piso de seguridad sigue activo |
| Cambios fuera de uvmcl sin validar | Clientes con imagen `master` fijados por digest antes del merge (DevOps) |

## Pendientes fuera de este plan

Ver sección 8 y 9 del [documento de niveles](./usuite-15425-niveles-de-solucion.md): purga en Loki, aviso a uvmcl sobre la `CLAVE` en su WebService, edición de USUITE-3902, inyección de comandos del login TOKEN, llave de `encryptRequest` en el front, contraseña en la sesión de Redis y producción en modo `development`.
