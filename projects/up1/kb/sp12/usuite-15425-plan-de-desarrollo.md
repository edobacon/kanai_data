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
  - entrega
  - ramas
  - guia
---

# USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles)

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · Plan creado el 2026-09-29, actualizado el 2026-10-01 (estrategia de entrega en dos líneas) · Producto: uPlanner Suite (legacy), no UP1.
> Documentos relacionados (misma carpeta):
> - [usuite-15425-claves-en-logs-uvmcl.md](./usuite-15425-claves-en-logs-uvmcl.md): análisis inicial y flujo del login de uvmcl.
> - [usuite-15425-niveles-de-solucion.md](./usuite-15425-niveles-de-solucion.md): vulnerabilidades, estado verificado de uvmcl y niveles de solución.
> - [usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md](./usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md): mapa del sistema de logs (loggerLevel, niveles, salidas que no controla). **Este plan reemplaza su parte B** (diseño del helper).
>
> Este documento es el **plan vivo** del desarrollo. Se ejecuta con la **"Guía de ejecución"** (más abajo): cada fase tiene meta, qué revisar antes, tareas con código, criterios de cumplimiento y un registro obligatorio. El avance se resume en la tabla de abajo y el detalle va en el registro de cada fase.

## Registro de avance

| Fase | Meta | Estado | Fecha planificada | Fecha real | Commits | Cumplido | Pendiente (qué, por qué, cuándo) |
|---|---|---|---|---|---|---|---|
| F0 Verificación previa | Supuestos confirmados y todo listo para desarrollar | Pendiente | | | | | |
| F1 Helper de ofuscación | Copia sanitizada de cualquier dato, sin tocar el original | Pendiente | | | | | |
| F2 Detección en texto | Claves y correos ocultos también dentro de textos | Pendiente | | | | | |
| F3 Función de log `authLog` | Un único punto de log que sanitiza y nunca rompe el login | Pendiente | | | | | |
| F4 Conversión del login de uvmcl | `loginServices.js` sin fugas | Pendiente | | | | | |
| F5 Conversión del resto de user-api | Todo el módulo de auth por `authLog` | Pendiente | | | | | |
| F6 Sentry | Eventos de Sentry sanitizados | Pendiente | | | | | |
| F7 Chequeo estático y smoke local | Cero logs fuera de `authLog` y salida real verificada | Pendiente | | | | | |
| F8 Documentación | Uso y configuración sin leer el código | Pendiente | | | | | |
| F9 QA y entrega a `master` (línea normal) | En `master`, validado en QA de uvmcl | Pendiente | | | | | |
| F10 Paso a la línea secure | En `feature/secure-master`, validado en QA | Pendiente | | | | | |

Estados: `Pendiente` · `En curso` · `Hecho` · `Bloqueado (motivo)`.

## Objetivo

Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.

**Alcance:** el código cubre **todos los clientes** (todos los tipos de login) y **las dos líneas de entrega**. El despliegue de este ticket es **solo uvmcl** y lo hace manualmente quien despliega; los demás ambientes se programan después (ver "Despliegue").

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
| D6 | Entrega (2026-10-01) | **C:** el cambio va a **todos los clientes**, en las dos líneas (`master` y `feature/secure-master`). Se desarrolla una vez sobre `develop` y se **reaplica con `cherry-pick -x`** sobre `feature/secure-develop`, como USUITE-15104. Detalle en "Estrategia de entrega" |
| D7 | Despliegue (2026-10-01) | **Solo uvmcl** en este ticket, manual y fuera de la guía de ejecución; queda en el registro de "Despliegue". Los demás ambientes se programan después con el código ya listo |

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
| Repos | `user-api` es un repo propio dentro de `sandbox-api/server/api/`; `app.js` pertenece a `sandbox-api` | Dos repos por cada línea de entrega: 4 ramas y 8 PR (ver "Estrategia de entrega"). F6 hace un `require` protegido |
| Dos líneas de entrega | Ambos repos tienen la línea normal (`develop` → `master`) y la línea secure (`feature/secure-develop` → `feature/secure-master`, login con cookies `httpOnly` de USUITE-12513). `develop_secure` es de 2020 y no se usa | El cambio se entrega en las dos líneas (D6) |

## Estrategia de entrega (D6)

### Estado de las ramas (verificado el 2026-10-01)

| Repo | Línea normal | Línea secure | Diferencia entre líneas |
|---|---|---|---|
| `user-api` | `develop` ≈ `master` (sin pendientes propios) | `feature/secure-develop` = `feature/secure-master` | Punto común: 2026-05-04. Secure difiere en 9 archivos: `authentication/auth.js`, `index.js`, `loginServices.js`, `model.js`, `multiAuth/ad.js`, `multiAuth/azureSaml.js`, `multiAuth/openIdConnect.js`, `seeds/seeds.js`, `services.js`. A secure le faltan USUITE-12513 (arreglos OIDC de julio), USUITE-15102, USUITE-15389, USUITE-14535, USUITE-14805 y OPS-1626 |
| `sandbox-api` | `develop` ≈ `master` | `feature/secure-develop` = `feature/secure-master` | Punto común: 2026-02-17. `server/app.js` difiere en la sección de Sentry (unas 99 líneas). A secure le faltan USUITE-14405, USUITE-12671 y USUITE-14774 |

Como las ramas de integración de cada línea están al día con su master, el PR hacia master lleva solo este ticket.

### Precedente

USUITE-15104 y USUITE-14273 se entregaron así: rama del ticket desde `develop` → PR a `develop` → PR de `develop` a `master`; y rama `<ticket>-secure` desde `feature/secure-develop` → PR a `feature/secure-develop` → PR a `feature/secure-master`. Mismo contenido, dos commits con distinto padre (por ejemplo `da9deab` en la línea normal y `d11e922` en secure).

### Alternativas descartadas

- **A. Rama desde el punto común de las dos líneas, con PR a ambas:** la base es de mayo (`user-api`) y febrero (`sandbox-api`), así que no tiene los logs agregados después (por ejemplo los de OIDC de julio) y habría que completar en cada línea igual; además, los conflictos se resuelven dos veces.
- **B. Merge de `develop` completo hacia `feature/secure-develop`:** arrastra unos 10 tickets que secure no tiene y requiere aprobación de quien mantiene esa línea; la simulación del merge da conflictos ajenos al ticket (`index.js` y `multiAuth/openIdConnect.js` en `user-api`; `server/config/express.js` y `whitelist.js` en `sandbox-api`).

### Ramas y PR

| # | Repo | Rama | Sale de | PR a | Luego |
|---|---|---|---|---|---|
| 1 | `user-api` | `USUITE-15425-logs-auth-seguros` | `develop` | `develop` | PR `develop` → `master` |
| 2 | `sandbox-api` | `USUITE-15425-logs-auth-seguros` | `develop` | `develop` | PR `develop` → `master` |
| 3 | `user-api` | `USUITE-15425-logs-auth-seguros-secure` | `feature/secure-develop` | `feature/secure-develop` | PR `feature/secure-develop` → `feature/secure-master` |
| 4 | `sandbox-api` | `USUITE-15425-logs-auth-seguros-secure` | `feature/secure-develop` | `feature/secure-develop` | PR `feature/secure-develop` → `feature/secure-master` |

### Estructura de commits (para que el cherry-pick sea simple)

| Commit | Contenido | En secure |
|---|---|---|
| 1 | Helper `logSanitizer.js` + tests (F1) | Archivos nuevos: sin conflicto |
| 2 | Detección en texto + tests (F2) | Archivo nuevo: sin conflicto |
| 3 | `authLog.js` + tests (F3) | Archivos nuevos: sin conflicto |
| 4..n | **Un commit por archivo convertido** (F4, F5) | Conflicto posible en los 9 archivos que difieren; se resuelve uno a la vez |
| n+1 | Sentry en `sandbox-api/server/app.js` (F6) | Conflicto probable en la sección de Sentry |
| n+2 | Documentación (F8) | Sin conflicto esperado |

No mezclar en un mismo commit archivos nuevos con conversiones. Los mensajes siguen `uplanner/rules/COMMITS.md` y llevan la key `USUITE-15425`.

### Orden de entrega

1. Línea normal: PR a `develop`, QA en uvmcl, PR a `master` (F9).
2. Línea secure: cherry-pick, PR a `feature/secure-develop`, QA, PR a `feature/secure-master` (F10).
3. Despliegue de uvmcl, manual (ver "Despliegue").
4. Resto de los ambientes: fuera de este ticket.

Si uvmcl corre en la línea secure (F0.2), F10 se adelanta y corre en paralelo con F9, y la QA de uvmcl se hace con lo de F10.

### Despliegue (manual, fuera de la guía de ejecución)

**Alcance del despliegue de este ticket: solo uvmcl** (`uvmcl-retention-qa` y `uvmcl-retention`). El código, en cambio, cubre **todos los clientes y las dos líneas** (todos los tipos de login y `master` y `feature/secure-master`), porque el despliegue en los demás ambientes se programa después, fuera de este ticket.

El despliegue lo hace manualmente quien despliega, en el bastión, y **no es parte de la guía de ejecución**. La guía solo exige que, antes de la QA (F9.2) y del cierre, el despliegue de uvmcl esté registrado en la tabla de abajo.

**Datos útiles para el despliegue** (verificados en el código):
- El código de `user-api` no viaja en la imagen de `sandbox-api`: `bin/docker-entrypoint.sh` (líneas 57 y 97) lo copia al arrancar desde `/data/products/api/v2/user-api`, que es el EFS del ambiente. Por eso cada repo se actualiza por separado en el bastión y después se reinicia.
- La rama del checkout de cada repo dice la línea del ambiente: `master` es la normal y `feature/secure-master` la secure.
- El `require` protegido de F6 permite que un repo quede actualizado antes que el otro sin romper el arranque.
- Nivel de log de uvmcl: agregar `loggerLevel: 'info',` en `/efs/<environment>/efs-pvc/templates/configurator/api/local.env.js` (con respaldo previo) y reiniciar. Se verifica en cada réplica con:
  `kubectl exec -n <namespace> <pod> -c suite-api -- sh -c 'cd $HOME/sandbox-api && node -e "console.log(require(\"./server/config/logger.js\").transports.console.level)"'` → `info`.

**Registro del despliegue** (lo completa quien despliega, con las mismas reglas de los registros de la guía):

| Ambiente | Fecha y hora | Línea | Commit anterior → nuevo `user-api` | Commit anterior → nuevo `sandbox-api` | `loggerLevel` (respaldo y verificación por réplica) | Verificación posterior | Resultado y observaciones |
|---|---|---|---|---|---|---|---|
| `uvmcl-retention-qa` | | | | | | | |
| `uvmcl-retention` (producción) | | | | | | | |

En "Verificación posterior" de producción: smoke de login coordinado con el cliente y revisión del log de las 2 réplicas y de Sentry durante 24 horas.

**Otros ambientes:** fuera de este ticket. Cuando se programen, se usa este mismo registro (una fila por ambiente) y la QA mínima Q1, Q2, Q3 y Q10.

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

### Tests que ya existen (verificado el 2026-10-01)

| Suite | Archivos | Casos | Cómo corre | Qué necesita |
|---|---|---|---|---|
| `user-api` (existente) | `server/api/user-api/test/userdetail.test.js` (8), `server/api/user-api/test/rolesAndPermission.test.js` (5) | 13 | `npm run test:user-api` desde la raíz de `sandbox-api` (usa `server/test/mocha-opts/mocha.user.opts`) | Es de **integración**: `server/test/globals.js` levanta la app completa (`require('../index.js')`) y `server/test/index.test.js` recarga la config y hace login con el usuario de prueba del repo. Necesita `server/config/local.env.js` apuntando a una base de pruebas disponible |
| Helper (nueva, de este ticket) | `server/api/user-api/test/helpers/*.test.js` | T1 a T45 | Comando de arriba, sin `--opts` | Nada externo |

Para la suite existente, el comando en la imagen de producción es:

```bash
docker run --rm -v "$PWD":/w -w /w -e NODE_ENV=test node:10.24.1-alpine3.11 node node_modules/.bin/mocha --opts server/test/mocha-opts/mocha.user.opts
```

Si la base de pruebas no está disponible desde el contenedor, se registra como "No cumplido" en F0.9 con el motivo, y la línea base se toma en el ambiente donde sí corra (se anota cuál).

### Línea base de tests

Se toma en F0.9, **con las ramas actualizadas** y **antes de cambiar código**. Sirve para separar los fallos que ya existían (`preexistente`) de los que introduce este ticket (`introducido`). Se vuelve a tomar en la rama secure en F10.1, porque esa línea tiene otro código.

| Fecha | Repo · rama · commit | Suite y comando | Total | Pasan | Fallan | Pendientes/omitidos | Fallos preexistentes (test → error resumido → clasificación) |
|---|---|---|---|---|---|---|---|
| | `user-api` · `develop` · | `test:user-api` | | | | | |
| | `user-api` · `feature/secure-develop` · | `test:user-api` | | | | | |

**Regla:** en cada fase con cambios de código se vuelve a correr la suite existente y la del helper. Un fallo que **no** está en esta tabla es `introducido`: se corrige antes de cerrar la fase. Un fallo que sí está se reporta en "Hallazgos" como `preexistente` y no se corrige sin aprobación.

**Ojo con el conteo:** el patrón de `mocha.user.opts` (`server/api/user-api/test/**/*.test.js`) también toma los tests nuevos de `test/helpers/`. Al comparar con la línea base, se separan los 13 casos existentes de los T1 a T45 nuevos.

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

## Guía de ejecución

### Cómo usar esta guía

- Las fases se ejecutan **en orden**. La única excepción es F10, que se adelanta si uvmcl corre en la línea secure (lo define F0.2).
- **No se empieza una fase si su bloque "Antes de empezar" no está completo.** Si algo de ese bloque falla, se registra en la fase anterior como "No cumplido" y se resuelve antes de seguir.
- Cada tarea tiene un código (`F1.3`) para nombrarla en commits, PR y registros.
- Una fase está **terminada solo cuando su registro está completo** y su fila en "Registro de avance" está actualizada. Una fase con tareas pendientes queda `En curso` o `Bloqueado (motivo)`, nunca `Hecho`.
- Si se pausa una fase a la mitad, igual se completa el registro con lo hecho hasta ese momento y el siguiente paso con fecha.
- **Ramas actualizadas, siempre.** Al empezar cada fase, y antes de cada PR, se corre `git fetch` y se trae lo último de la rama base a la rama de trabajo, en cada repo que toca la fase:
  ```bash
  git fetch origin
  git status -sb                       # la rama de trabajo no debe decir "behind"
  git log --oneline HEAD..origin/develop   # (o origin/feature/secure-develop en F10) debe salir vacío
  ```
  Si la base avanzó, se integra (`git merge origin/develop` o `git rebase origin/develop`, sin reescribir commits ya publicados en un PR) y se vuelven a correr los tests. La salida se pega en el campo "Rama actualizada" del registro.
- **Tests contra la línea base.** Toda fase con cambios de código termina corriendo la suite existente y la del helper, y compara contra "Línea base de tests".

### Reglas para completar los registros

Aplican a cualquier persona o agente que avance el plan. Un registro que no cumple estas reglas se considera incompleto.

1. **Prohibidas las respuestas sin contenido**: "ok", "listo", "hecho", "sin problemas", "todo bien", "funciona". Cada respuesta dice **qué** se hizo, **dónde** (repo, rama, archivo y línea) y **cómo se comprobó**.
2. **Commits**: uno por línea, con SHA corto, mensaje, repo y rama. Si la fase no generó commits, decir por qué ("No aplica: fase de verificación sin cambios de código").
3. **Cumplido**: cada criterio de cumplimiento de la fase, uno por uno, con su evidencia: resumen de la salida del comando (con números: tests pasados/fallidos, cantidad de coincidencias), ruta del archivo de evidencia, enlace al PR o captura.
4. **No cumplido**: por cada punto, **qué** quedó fuera, **por qué** (causa concreta: "el WSDL de QA responde 503 desde el 2026-10-03", no "faltó tiempo"), **qué impacto** tiene en las fases siguientes, **fecha comprometida** para cerrarlo y **responsable**.
5. **Desvíos del plan**: qué se hizo distinto a lo escrito y por qué. Si el desvío cambia una decisión, se actualiza la tabla "Decisiones tomadas" en el mismo momento.
6. **Hallazgos**: errores o sorpresas encontradas, con archivo:línea y clasificación: `introducido` (se corrige ya), `preexistente` (se reporta, no se corrige sin aprobación) o `no es bug` (comportamiento correcto que la revisión confirma).
7. **Fechas**: absolutas (`2026-10-06`), nunca relativas ("mañana", "la próxima semana").
8. Si un campo no aplica: `No aplica: <motivo>`. Ningún campo queda vacío.
9. **Tests**: siempre con números (total, pasan, fallan, omitidos) y, por cada fallo, el nombre del test, el error resumido y si está o no en la línea base (`preexistente` o `introducido`).

**Plantilla del registro** (cada fase la trae al final; se completa ahí mismo):

- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:** (SHA · mensaje · repo/rama, uno por línea)
- **PR:** (enlace · estado)
- **Qué se hizo:** (por tarea: `FX.n` → resultado concreto)
- **Criterios cumplidos:** (criterio → evidencia)
- **No cumplido:** (qué · por qué · impacto · fecha comprometida · responsable)
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F0. Verificación previa

**Meta:** antes de escribir código, confirmar que los supuestos del plan siguen siendo ciertos y tener listo todo lo necesario para desarrollar y probar: ramas, Docker, usuario de prueba y fixtures.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Plan leído completo, en especial "Decisiones tomadas" y "Estrategia de entrega".
- [ ] Acceso a Sentry y a los repos `user-api` y `sandbox-api` en Bitbucket.

**Tareas:**

- [ ] **F0.1** Revisar en el proyecto de Sentry si el filtro de datos del servidor está activo. *Responder:* activo o no, y qué campos filtra (lista literal).
- [ ] **F0.2** Registrar la línea de uvmcl-retention en QA y en producción (la informa quien despliega: rama del checkout de `user-api` y de `sandbox-api` en el bastión). *Responder:* ambiente → repo → rama. *Decidir:* si está en `feature/secure-master`, F10 se adelanta y corre en paralelo con F9.
- [ ] **F0.3** Leer `uplanner/rules/COMMITS.md`. En ambos repos: `git fetch origin`, poner `develop` local al día con `origin/develop` (al 2026-10-01 la copia local de `sandbox-api` estaba 8 commits atrás) y crear la rama `USUITE-15425-logs-auth-seguros` desde `origin/develop`. *Responder:* por repo, commit de `origin/develop` usado como base y salida de `git status -sb` de la rama nueva.
- [ ] **F0.4** Volver a verificar el estado de las ramas descrito en "Estrategia de entrega", en ambos repos:
  ```bash
  git rev-list --left-right --count origin/master...origin/feature/secure-master
  git cherry -v origin/feature/secure-develop origin/develop | grep '^+'
  git diff --stat origin/master origin/feature/secure-master
  ```
  *Responder:* números y archivos; si cambiaron respecto de lo escrito, actualizar la tabla "Estado de las ramas".
- [ ] **F0.5** Correr un test mínimo con el comando de "Cómo correr los tests". *Responder:* comando usado y salida (`N passing`).
- [ ] **F0.6** Conseguir un usuario de prueba de uvmcl para QA. *Responder:* quién lo entregó y para qué ambiente (sin escribir la clave en el registro).
- [ ] **F0.7** Completar el relevamiento: forma de `PIDM` y de los campos `USER*` de uvmcl (largo y tipo de caracteres, sin valores); clientes sin bloques (Loki o login de prueba). *Responder:* tabla campo → forma → estrategia que le corresponde.
- [ ] **F0.8** Armar fixtures anonimizados (valores ficticios, nombres de campo reales) en `server/api/user-api/test/helpers/fixtures/`: WSDL de uvmcl, POST de univalle (incluido `mensaje` con correo), `users->`, perfil SAML (con atributos tipo URL), error de axios, error de TOKEN. *Responder:* lista de archivos creados.
- [ ] **F0.9** Tomar la **línea base de tests** en la rama nueva (sin cambios todavía), con el comando de "Tests que ya existen", y completar la tabla "Línea base de tests" (fila de `develop`). *Responder:* total, pasan, fallan, omitidos y la lista de fallos preexistentes con su error. Si no se puede correr, el motivo concreto y dónde se tomará.

**Criterios de cumplimiento:**
- Las 9 tareas respondidas con su dato concreto.
- Ramas 1 y 2 creadas desde `origin/develop` actualizado, sin "behind".
- Tabla "Línea base de tests" completa para `develop`, con los fallos preexistentes listados (o "ninguno").
- Test mínimo pasando en Docker con la imagen de producción.
- Decisión de orden F9/F10 tomada y anotada en "Desvíos del plan" si cambia el orden.

**Esfuerzo:** 0,25 a 0,5 días.

**Registro F0**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F1. Helper de ofuscación (`logSanitizer.js`)

**Meta:** tener un helper que, dado cualquier dato, devuelva una copia con contraseñas y secretos bloqueados y correos, documentos y nombres ocultos según el nivel configurado, sin modificar el original y sin lanzar excepciones nunca.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F0 completo.
- [ ] Fixtures de F0.8 disponibles.
- [ ] Repasar "Diseño": estrategias, niveles, catálogo base, configuración y garantías.

**Tareas:**

- [ ] **F1.1** Catálogo por estrategia (`block`, `email`, `id`, `text`) con niveles, y respaldo a `text` cuando el valor no tiene la forma esperada.
- [ ] **F1.2** Comparación por `keys` normalizadas, `patterns` y último tramo de nombres tipo URL.
- [ ] **F1.3** Lectura protegida de `LOG_MASKING`, combinación y validación por opción, con un único aviso; compilación protegida de expresiones.
- [ ] **F1.4** Avisos de protección reducida al cargar.
- [ ] **F1.5** Recorrido recursivo con todas las garantías de la tabla "Garantías".
- [ ] **F1.6** `maskValue`.
- [ ] **F1.7** JSDoc completo (contenido en F8.1).
- [ ] **F1.8** Tests T1 a T29 (`server/api/user-api/test/helpers/logSanitizer.test.js`).

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

**Criterios de cumplimiento:**
- T1 a T29 en verde en Docker con la imagen de producción. *Evidencia:* salida de mocha con `29 passing` (o el número real) y `0 failing`.
- Suite existente (`test:user-api`) sin fallos nuevos respecto de la línea base.
- `node --check` del archivo sin errores en la imagen de producción.
- Un solo commit con el helper y sus tests (commit 1 de "Estructura de commits").

**Esfuerzo:** 2 a 2,5 días.

**Registro F1**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F2. Detección de datos dentro de texto

**Meta:** que las claves, correos y (opcionalmente) RUT que vienen **dentro de un texto** (XML, cadenas `clave=...`, JSON serializado, comandos `curl`, mensajes libres) también se oculten, no solo los que vienen como campo con nombre.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F1 completo y T1 a T29 en verde.

**Tareas:**

- [ ] **F2.1** `textDetection.block`: patrones fijos construidos desde los campos de `block`: `<clave>...</clave>`, `clave=...`, `"clave":"..."`, `-u usuario:secreto`.
- [ ] **F2.2** `textDetection.email`: correos dentro de cualquier texto, ocultos con el nivel de `email`.
- [ ] **F2.3** `textDetection.id` (apagado por defecto): RUT con formato dentro de texto.
- [ ] **F2.4** Corte por `maxTextLength` antes de buscar. Sin lookbehind ni funciones de expresiones regulares posteriores a Node 10.
- [ ] **F2.5** Tests T30 a T36.

| # | Caso | Esperado |
|---|---|---|
| T30 | XML con `<CLAVE>x</CLAVE>` | `<CLAVE>[OCULTO]</CLAVE>` |
| T31 | `clave=x&user=y` y JSON serializado `"password":"x"` | Valor reemplazado |
| T32 | `curl -u USER:SECRET ... --data "...password..."` | Credenciales reemplazadas |
| T33 | Texto libre con correo (campo `mensaje`) | Correo oculto con el nivel de `email`; el resto del texto intacto |
| T34 | Texto libre con RUT: con `textDetection.id` apagado y encendido | Intacto; oculto |
| T35 | Texto mayor a `maxTextLength` | Cortado y marcado, sin error |
| T36 | `textDetection.block: false` | Textos intactos; campos por nombre siguen ocultos |

**Criterios de cumplimiento:**
- T1 a T36 en verde en Docker con la imagen de producción (F2 no rompe F1). *Evidencia:* conteo de mocha.
- Ninguna expresión regular con lookbehind (`(?<=`, `(?<!`): `grep -nE '\(\?<[=!]' server/api/user-api/helpers/logSanitizer.js` sin resultados.
- Un commit propio (commit 2 de "Estructura de commits").

**Esfuerzo:** 0,75 a 1 día.

**Registro F2**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F3. Función de log `authLog.js`

**Meta:** una única función de log para todo el módulo de autenticación que sanitiza siempre, escribe en el logger de siempre con niveles visibles (`info`, `warn`, `error`), reenvía los errores a Sentry ya sanitizados y nunca rompe el login.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F2 completo y T1 a T36 en verde.

**Tareas:**

- [ ] **F3.1** `info`, `warn`, `error`: sanitizan y llaman al logger global con 2 argumentos y los datos en `{ data }`.
- [ ] **F3.2** `error` reenvía a Sentry mensaje y error sanitizados, si Sentry está disponible.
- [ ] **F3.3** `try/catch` general: ante falla escribe un log mínimo (`'authLog error'`) y no propaga.
- [ ] **F3.4** JSDoc completo (contenido en F8.1).
- [ ] **F3.5** Tests T37 a T42 (`authLog.test.js`).

| # | Caso | Esperado |
|---|---|---|
| T37 | Salida con el formato real de `config/logger.js` | `[info]: Login user response { "data": { ... "CLAVE": "[OCULTO]" ... } }` |
| T38 | Datos con claves `message`, `level`, `stack` | No se pisan; quedan dentro de `data` |
| T39 | Logger en `silly` (sin `loggerLevel`) y en `info` | Se imprime en ambos |
| T40 | Sanitizador que falla (stub) | No lanza; queda log mínimo |
| T41 | `authLog.error` | Sentry recibe datos sanitizados (stub) |
| T42 | Sentry ausente o deshabilitado | No lanza |

**Criterios de cumplimiento:**
- T1 a T42 en verde en Docker con la imagen de producción. *Evidencia:* conteo de mocha.
- Un commit propio (commit 3 de "Estructura de commits").

**Esfuerzo:** 0,5 días.

**Registro F3**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F4. Conversión del login de uvmcl (`loginServices.js`)

**Meta:** que el archivo donde se detectó la fuga (`loginServices.js`) deje de escribir la clave y cualquier dato sensible: todos sus logs pasan por `authLog` y el navegador ya no recibe errores crudos.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F3 completo.
- [ ] Contar los `console.*`, `logger.*` y `Sentry.capture*` actuales del archivo para tener la línea base:
  ```bash
  grep -cE "console\.(log|error|warn|info)\(|logger\.[a-z]+\(|Sentry\.capture(Exception|Message)\(" server/api/user-api/loginServices.js
  ```

**Tareas:**

- [ ] **F4.1** `:243` → `authLog.info('Login user response', { user: maskValue(name, 'email'), result })`.
- [ ] **F4.2** `:815` `console.log(response, result)` → `authLog.warn`.
- [ ] **F4.3** `:211` y `:247`: sin `error: err` en la respuesta al navegador (solo mensaje y código); Sentry vía `authLog.error`.
- [ ] **F4.4** `:291` `Session data`, `:727` `HACIENDO LOGIN CON USER`, `:70` y `:91` (POST, hoy `silly`) → `authLog.info`.
- [ ] **F4.5** Resto de `console.*` y `Sentry.capture*` del archivo, con el criterio D1.

**Criterios de cumplimiento:**
- Cero `console.*`, `logger.*` directos y `Sentry.capture*` en `loginServices.js` (mismo `grep` del "Antes de empezar" devuelve `0`). *Evidencia:* conteo antes → después.
- Smoke local (F7) con el fixture de uvmcl sin la clave visible.
- Tests T1 a T42 siguen en verde y la suite existente sin fallos nuevos respecto de la línea base.
- Un commit solo con este archivo.

**Esfuerzo:** 0,5 días.

**Registro F4**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F5. Conversión del resto de `user-api`

**Meta:** que **todo** el módulo de autenticación escriba sus logs solo a través de `authLog`, para todos los tipos de login (WSDL, POST, SAML, AD, ADAL, ADB2C, LDAP, OIDC).

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F4 completo.
- [ ] Línea base del chequeo estático de F7 (los tres `grep`) anotada en el registro: cantidad por archivo.

**Tareas** (un commit por archivo, en este orden):

| Tarea | Archivo | Cambios relevantes |
|---|---|---|
| **F5.1** | `authentication/auth.js` | Se elimina `decripted pw` (`:762`); los `silly` del autologin pasan a `info`; errores TOKEN (`:808-845`) por `authLog.error`; bloques AD (`:163-197`) consolidados en un log por intento; `wso2oidCallback` (`:519`) con `req.user` sanitizado |
| **F5.2** | `multiAuth/ad.js` | Bloques AD consolidados |
| **F5.3** | `multiAuth/azureSaml.js` | Pasa a `authLog` (perfil SAML en `:31`) |
| **F5.4** | `multiAuth/openIdConnect.js` | Pasa a `authLog` |
| **F5.5** | `index.js` | `user->` (`:482`) y errores de rutas de auth |
| **F5.6** | `services.js` | `getUserInfo` (`:1149-1152`, `:1188-1190`): el `users->` que aparece en casi todos los clientes |
| **F5.7** | `custom/ucalTls.js`, `userInfoMethod/ldap.js`, `userInfoMethod/userInfoMethod1.js` | Conversión con criterio D1 (un commit por archivo) |
| **F5.8** | `seeds/seeds.js`, `seeds/seed-helper.js` | Conversión; confirmar que no se loguea `cas_userinfo.pass` |

- [ ] F5.1 · [ ] F5.2 · [ ] F5.3 · [ ] F5.4 · [ ] F5.5 · [ ] F5.6 · [ ] F5.7 · [ ] F5.8

**Criterios de cumplimiento:**
- Chequeo estático de F7 en cero. *Evidencia:* tabla archivo → conteo antes → conteo después.
- Tests T1 a T42 en verde y la suite existente sin fallos nuevos respecto de la línea base (se corre después de cada archivo convertido).
- Smoke local con los fixtures de cada proveedor sin datos sensibles visibles.
- Un commit por archivo (se lista cada SHA en el registro con su archivo).

**Esfuerzo:** 1,5 a 2 días.

**Registro F5**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F6. Sentry (`sandbox-api/server/app.js`)

**Meta:** que los eventos que se envían a Sentry (que adjuntan el body del request, como el formulario de login) lleguen sin claves ni datos sensibles, y que el código siga funcionando aunque el helper de `user-api` no esté disponible.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registro de F5 completo.
- [ ] Rama 2 (`sandbox-api`) actualizada con `origin/develop`.
- [ ] Resultado de F0.1 (filtro del servidor de Sentry) a mano.

**Tareas:**

- [ ] **F6.1** Extender el `beforeSend` existente: sanitizar `event.request.data`, `request.headers`, `request.cookies`, `extra` y `contexts`.
- [ ] **F6.2** Rama con Sentry deshabilitado: el evento que hoy se imprime con `console.error` se imprime sanitizado por el logger.
- [ ] **F6.3** `require` protegido del helper de `user-api`: si no está disponible, se descarta `request.data` en vez de enviarlo o imprimirlo.
- [ ] **F6.4** Hallazgo preexistente, **se consulta antes de tocarlo**: `const { message } = hint.originalException` lanza si no hay excepción (p. ej. `captureMessage`). *Responder:* a quién se consultó y qué se decidió.
- [ ] **F6.5** Tests T43 (evento con `password` en `request.data` y en `extra`), T44 (helper no disponible: `request.data` descartado), T45 (Sentry deshabilitado: salida sanitizada).

**Criterios de cumplimiento:**
- T43 a T45 en verde en Docker con la imagen de producción.
- Suite existente sin fallos nuevos respecto de la línea base (F6 toca el arranque de la app).
- Un commit propio en `sandbox-api`.

**Esfuerzo:** 0,5 días.

**Registro F6**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F7. Chequeo estático y smoke local

**Meta:** comprobar, antes de cualquier PR, que no quedó ningún log fuera de `authLog`, que todo el código corre en Node 10 y que la salida real del logger no muestra datos sensibles en los escenarios que hoy tienen los clientes.

**Responsable sugerido:** dev del ticket.

**Antes de empezar:**
- [ ] Registros de F4, F5 y F6 completos.

**Tareas:**

- [ ] **F7.1** Chequeo estático, con resultado esperado cero (fuera de `helpers/` y `test/`):
  ```bash
  grep -rnE "console\.(log|error|warn|info)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "logger\.(error|warn|info|http|verbose|debug|silly)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  grep -rnE "Sentry\.capture(Exception|Message)\(" server/api/user-api --include='*.js' | grep -vE "/(test|helpers)/"
  ```
- [ ] **F7.2** Chequeo de sintaxis Node 10 en la imagen de producción:
  ```bash
  docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 sh -c 'for f in <archivos modificados>; do node --check "$f" || exit 1; done'
  ```
- [ ] **F7.3** Smoke que carga el logger real, pasa cada fixture por `authLog` e imprime la salida, en Docker con la imagen de producción, en tres escenarios:
  1. **sin `LOG_MASKING` ni `loggerLevel`** (como todos los clientes hoy);
  2. con `LOG_MASKING` mal formado;
  3. con `loggerLevel: 'info'`, niveles por estrategia y patrones personalizados.
- [ ] **F7.4** Revisar las tres salidas: sin claves visibles, correos e identificadores según nivel, nombres y códigos según config, sin excepciones. Guardar las salidas como evidencia.

**Criterios de cumplimiento:**
- Los tres `grep` de F7.1 en `0`. *Evidencia:* salida literal (vacía) y conteo.
- `node --check` sin errores en todos los archivos modificados. *Evidencia:* lista de archivos revisados.
- Las tres salidas del smoke guardadas (ruta del archivo) y revisadas, con una línea por escenario: qué se esperaba y qué salió.

**Esfuerzo:** 0,25 a 0,5 días.

**Registro F7**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F8. Documentación

**Meta:** que cualquier persona del equipo pueda usar, configurar y diagnosticar el helper sin leer su código: JSDoc completo, guía de uso y ejemplo en la plantilla de configuración.

**Responsable sugerido:** dev del ticket, con revisión de otra persona del equipo.

**Antes de empezar:**
- [ ] Registro de F7 completo (el comportamiento documentado ya está verificado).

**Tareas:**

- [ ] **F8.1** **JSDoc** en `logSanitizer.js` y `authLog.js` (descripciones en español):
  - encabezado de módulo con el propósito y un enlace a `LOGGING.md`;
  - `@typedef` de `LogMaskingConfig`, `MaskingStrategyConfig`, `MaskLevel`, `MaskStrategy` y `TextDetectionConfig`, con cada opción, su tipo y su default;
  - `@param`, `@returns` y `@example` en `sanitizeForLog`, `maskValue`, `authLog.info`, `authLog.warn` y `authLog.error`;
  - las garantías y los marcadores posibles.
- [ ] **F8.2** **Guía `server/api/user-api/helpers/LOGGING.md`:**
  - qué resuelve y cuándo usar `authLog` (y por qué no `console.*`);
  - catálogo base por estrategia y tabla de niveles con ejemplos;
  - cómo se comparan los nombres (`keys`, `patterns`, último tramo de URL);
  - todas las opciones con default, efecto y si afectan la seguridad;
  - ejemplos: cambiar el nivel de nombres, agregar un campo, agregar un patrón, excluir un campo, mover `ds_name` a `id`, apagar la ofuscación;
  - avisos que emite al arrancar y cómo interpretarlos;
  - relación con `loggerLevel` y cómo verificar ambos en un pod;
  - cómo correr los tests (Docker con la imagen de producción);
  - resolución de problemas: `[MaxDepth]`, `...[truncado]`, `[SANITIZE_ERROR]`, `[Circular]`, "no veo los logs de auth", "un campo nuevo sale completo".
- [ ] **F8.3** **Plantilla de ejemplo** `sandbox-api/server/config/local.env.sample.backend.js`: bloque `LOG_MASKING` comentado con los defaults y `loggerLevel: 'info'`, con un comentario que apunte a la guía.
- [ ] **F8.4** **KB:** actualizar este documento y el mapa del sistema de logs si algo cambió durante el desarrollo.

**Criterios de cumplimiento:**
- `npx jsdoc -c jsdoc.json server/api/user-api/helpers -d <scratch>/jsdoc` sin errores ni advertencias y con los `@typedef` en la salida (puede correr con el Node del host). *Evidencia:* salida del comando.
- `LOGGING.md` revisado por otra persona del equipo. *Evidencia:* quién revisó, fecha y observaciones atendidas.
- Commits de documentación en `user-api` y `sandbox-api`.

**Esfuerzo:** 0,5 a 0,75 días.

**Registro F8**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F9. QA y entrega a `master` (línea normal)

**Meta:** llevar el cambio a `master` en ambos repos, validado en la QA de uvmcl, para que quede listo para cualquier ambiente de la línea normal.

**Responsable sugerido:** dev del ticket. El despliegue en QA y producción lo hace quien despliega (ver "Despliegue").

**Antes de empezar:**
- [ ] Registros de F0 a F8 completos.
- [ ] Si F0.2 dijo que uvmcl está en la línea secure: F10 se hace en paralelo y la QA de uvmcl se hace con lo de F10.

**Tareas:**

- [ ] **F9.1** Antes de abrir los PR: `git fetch`, integrar lo último de `origin/develop` en las ramas 1 y 2 y volver a correr las dos suites. Después, PR de la rama 1 (`user-api`) y de la rama 2 (`sandbox-api`) a `develop`. *Responder:* salida de "Rama actualizada", resultado de las suites, enlace de cada PR, revisores y estado.
- [ ] **F9.2** Con `uvmcl-retention-qa` desplegado y registrado en "Despliegue", ejecutar Q1 a Q10 (evidencia: `kubectl logs` filtrado por `clave|password|Login user response|OCULTO` y evento de Sentry si aplica).

| # | Caso | Esperado |
|---|---|---|
| Q1 | Login correcto | Entra normal; sesión completa (nombre, correo, rol, permisos). **Caso crítico** |
| Q2 | Log de Q1 | `[info]: Login user response` con fecha, `CLAVE: [OCULTO]`, correos e identificadores `light`, nombres y códigos completos |
| Q3 | Clave incorrecta | Mismo mensaje al usuario; log con resultado y sin la clave |
| Q4 | Login de estudiantes, correcto y fallido (si aplica) | Igual que antes; log sanitizado |
| Q5 | Ambiente **sin** `LOG_MASKING` | Funciona con defaults, sin errores ni avisos |
| Q6 | Con `LOG_MASKING` de prueba (`text: light`, `id: medium`, un `addPatterns`) y reinicio | Cada estrategia con su nivel |
| Q7 | Con `loggerLevel: 'info'` (configurado en el despliegue) | Logs de auth visibles; `silly` y `debug` no |
| Q8 | Error del WebService (simulado) | Mensaje de siempre; navegador sin error crudo; Sentry sanitizado |
| Q9 | Relevamiento de campos repetido en QA | Ningún campo de `block` con valor visible |
| Q10 | Regresión | Navegar el módulo de retención y cerrar sesión sin errores nuevos |

- [ ] **F9.3** PR de `develop` a `master` en cada repo, confirmando antes que `develop` solo suma este ticket respecto de `master` (`git log --oneline origin/master..origin/develop`). *Responder:* salida de ese comando, enlaces y SHA del merge.

**Criterios de cumplimiento:**
- Tests T1 a T45 en verde en la imagen de producción, chequeo estático en cero, `node --check` sin errores, smoke guardado, JSDoc sin errores y `LOGGING.md` revisado (de F1 a F8).
- Q1 a Q10 aprobados, cada uno con su evidencia.
- PR a `master` mergeados en ambos repos.

**Esfuerzo:** 0,75 a 1 día.

**Registro F9**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

---

### F10. Paso a la línea secure

**Meta:** llevar el mismo cambio a `feature/secure-master` en ambos repos sin romper el login con cookies propio de esa línea, para que quede listo para cualquier ambiente de la línea secure.

**Responsable sugerido:** dev del ticket. Si la QA necesita un ambiente secure desplegado, lo hace quien despliega y se registra en "Despliegue".

**Antes de empezar:**
- [ ] F9.1 a F9.3 con registro (o F7 completo, si F10 se adelantó por F0.2).
- [ ] Lista de SHA de la línea normal a reaplicar, en el orden de "Estructura de commits".

**Tareas:**

- [ ] **F10.1** `git fetch` y crear `USUITE-15425-logs-auth-seguros-secure` desde `origin/feature/secure-develop` actualizado en `user-api` y `sandbox-api`. Antes de aplicar commits, tomar la línea base de la suite existente en esta rama y completar la fila de `feature/secure-develop` en "Línea base de tests". *Responder:* commit base por repo y resultado de la línea base con sus fallos preexistentes.
- [ ] **F10.2** `git cherry-pick -x` de los commits de la línea normal, en orden. Resolver conflictos archivo por archivo, conservando el comportamiento propio de secure (cookies `httpOnly`, logout con `req.jwt.userId`). *Responder:* por cada commit: SHA original → SHA en secure → con o sin conflicto → cómo se resolvió.
- [ ] **F10.3** Buscar logs que **solo existen en secure** (código de USUITE-12513 en `authentication/auth.js`, `index.js`, `loginServices.js`, `multiAuth/*`) y convertirlos en un commit propio de esta rama. *Responder:* archivo:línea de cada log convertido.
- [ ] **F10.4** Repetir en esta rama: tests T1 a T45 en Docker, suite existente comparada con **su** línea base (la de `feature/secure-develop`), chequeo estático de F7 en cero, `node --check` y smoke local.
- [ ] **F10.5** Antes del PR: `git fetch`, integrar lo último de `origin/feature/secure-develop` y volver a correr las suites. PR a `feature/secure-develop` → QA → PR a `feature/secure-master`, confirmando antes que `feature/secure-develop` solo suma este ticket respecto de `feature/secure-master`.
- [ ] **F10.6** QA en un ambiente de la línea secure: Q1 a Q3, Q5, Q8 y Q10 de F9, más el logout (las cookies se borran y no hay errores nuevos).

**Criterios de cumplimiento:**
- Chequeo estático en cero en la rama secure y tests T1 a T45 en verde.
- QA de F10.6 aprobada con evidencia, incluido el logout.
- PR a `feature/secure-master` mergeados en ambos repos.

**Esfuerzo:** 1 a 1,5 días.

**Registro F10**
- **Responsable:**
- **Fecha planificada:** inicio `____` · fin `____`
- **Fecha real:** inicio `____` · fin `____`
- **Repo y rama:**
- **Rama actualizada:** (salida de `git status -sb` y de `git log --oneline HEAD..origin/<base>` tras `git fetch`)
- **Tests contra la línea base:** (suite → total / pasan / fallan / omitidos → fallos nuevos o "ninguno")
- **Commits:**
- **PR:**
- **Qué se hizo:**
- **Criterios cumplidos:**
- **No cumplido:**
- **Desvíos del plan:**
- **Hallazgos:**
- **Siguiente paso y fecha:**

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
| F9 QA y entrega a `master` | 0,75 a 1 |
| F10 Paso a la línea secure | 1 a 1,5 |
| **Total** | **8,5 a 11,25** |

No incluye el despliegue (manual, fuera de la guía).

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
| Desfase de despliegue entre repos | `require` protegido en F6 (T44) |
| Datos perdidos o pisados por el formato del logger | Datos en `data` + T37 y T38 |
| Más volumen de log | Consolidación y eliminación de ruido (D1) |
| Ambientes sin config o con config errónea | Defaults + validación por opción (T12, T13, Q5) |
| Configuración que reduce la protección | Aviso visible al arrancar (T19) |
| Ambientes futuros con datos o logins no vistos en uvmcl | El código cubre todos los tipos de login, config por ambiente sin cambiar código y QA mínima por ambiente (ver "Despliegue") |
| Conflictos al reaplicar en secure que rompan el login con cookies | Un commit por archivo, resolución archivo por archivo, tests y QA propios de la línea secure con logout (F10) |
| Logs que solo existen en secure quedan sin convertir | Búsqueda dedicada y chequeo estático en la rama secure (F10) |
| Las líneas cambian antes de entregar (nuevos merges) | Ramas actualizadas al empezar cada fase y antes de cada PR (`git fetch` + integrar base), con tests de nuevo |
| Confundir un fallo existente con uno introducido | Línea base de tests por línea (F0.9 y F10.1) y comparación en cada fase |
| La suite existente no corre por falta de base de pruebas | Se registra en F0.9 con motivo y ambiente alternativo; la suite del helper no depende de la base |

## Fuera de alcance

- `console.*` del resto de `sandbox-api` fuera de `user-api` (unas 900 llamadas).
- Despliegue en ambientes distintos de uvmcl (se programa después; el código queda listo).
- Purga de logs ya almacenados en Loki (DevOps).
- Cifrado recuperable de claves.
- Protección de `/changeLog`.
