# Borrador Confluence: nueva versión de la página "Logging" (Operaciones)

Estado: **borrador sin publicar** (2026-10-02). Decisión del dev: opción A, actualizar la página existente
[Operaciones › Software Engineering › Logging](https://u-planner.atlassian.net/wiki/spaces/OP/pages/577765435/Logging)
(id 577765435). Se publica **después de que se aprueben y mergeen los PR** de USUITE-15425, para que la página no
describa algo que todavía no está en `develop`. Antes de publicar, revisar que lo descrito siga igual al código
mergeado y mostrar el texto final al dev.

Qué cambia respecto de la versión actual (versión 7, 2022-11-24):

- Se quita "[EN ETAPA DE PRUEBA]": winston es el logger de sandbox-api desde hace años.
- Se corrige el nivel por defecto: la página dice que `silly` "por defecto no se mostrará", pero sin `loggerLevel`
  el transporte de consola queda en `silly` y se imprime **todo**, incluido `debug` (`server/config/logger.js`).
- Se aclara que los datos van como segundo argumento (con más de uno, el formato los descarta o los mezcla).
- Se agrega la sección "Logs del módulo de autenticación (user-api)" con `authLog`, qué oculta y `LOG_MASKING`.
- Se recomienda `loggerLevel: 'info'` y se avisa que `/changeLog` cambia el nivel sin autenticación.

---

## Texto propuesto para la página

### Logging

sandbox-api usa [winston](https://github.com/winstonjs/winston) como logger. La configuración está en
`server/config/logger.js`: un único transporte de consola con formato
`fecha producto módulo [nivel]: mensaje { datos }`.

#### Cómo usarlo

**Opción A:** importar winston y llamarlo directamente.

```js
const logger = require('winston')

logger.info('Usuario sincronizado', { userId })
```

**Opción B (recomendada):** en cada proyecto, un `logging.js` que agregue el producto y el módulo, para saber de
dónde viene cada log.

```js
// logging.js
const logger = require('winston')

module.exports = function (name) {
	return logger.child({ moduleName: name, productName: 'U_EXAM' })
}
```

```js
const logger = require('./logging.js')('redis')

logger.debug('Conexión abierta')
```

Los datos van **como segundo argumento y en un solo objeto**: `logger.info(mensaje, { datos })`. Con más
argumentos el formato los descarta, y si el objeto tiene campos como `message`, `level` o `stack`, pisan los del
log.

**Nunca loguear contraseñas, tokens, cookies ni respuestas completas de un login o de una integración.** El
nivel de log no las protege: si la línea se imprime, se imprime con la clave. En el módulo de autenticación se
usa `authLog` (ver abajo), que las oculta siempre.

#### Niveles de log

| Nivel | Valor | Para qué |
|---|---|---|
| `error` | 0 | Errores |
| `warn` | 1 | Alertas que permiten seguir el flujo |
| `info` | 2 | Información general, de alto nivel |
| `http` | 3 | Llamadas a servicios HTTP |
| `verbose` | 4 | Funciones y variables críticas |
| `debug` | 5 | Consultas SQL |
| `silly` | 6 | Cualquier log |

El nivel configurado decide **qué líneas se imprimen**: se imprimen las de ese nivel y las de valor menor. No
cambia lo que contiene cada línea.

#### Cambiar el nivel de logs

1. **Variable `loggerLevel` en `server/config/local.env.js`** (recomendado `'info'`).
   - **Sin `loggerLevel` el nivel es `silly`: se imprime todo**, incluidos `debug` y las consultas SQL. Así
     arrancan hoy los ambientes que no la definen.
   - El cambio se aplica al reiniciar la app.
2. **URL `/changeLog/<nivel>`** (por ejemplo `http://localhost:9002/changeLog/debug`): cambia el nivel en
   caliente, hasta el próximo reinicio. Ojo: hoy esta ruta no pide autenticación.

Para ver el nivel efectivo en un pod de suite-api:

```bash
kubectl exec -n <namespace> <pod> -c suite-api -- sh -c 'cd $HOME/sandbox-api && node -e "console.log(require(\"./server/config/logger.js\").transports.console.level)"'
```

#### Logs del módulo de autenticación (user-api)

Desde USUITE-15425, todos los logs del login (`server/api/user-api`) pasan por una única función, `authLog`, en
las dos líneas de entrega (normal y secure):

```js
const authLog = require('./helpers/authLog')

authLog.info('Login user response', { user, result })
authLog.warn('Login rechazado', { response })
authLog.error('Error al conectar con el WebService', err)   // además envía a Sentry, ya oculto
```

- **Oculta siempre** claves, tokens, cookies y encabezados de autorización (`[OCULTO]`), también dentro de textos
  (XML, `clave=...`, JSON serializado, `curl -u`).
- **Oculta en parte** correos (`ana.pru***@uvm.cl`) y RUT o documentos (`18.456.***-K`). Los nombres quedan
  visibles por defecto.
- Escribe con niveles `info`, `warn` y `error`, así que se ve con `loggerLevel: 'info'`.
- Nunca rompe el login: si algo falla al escribir, deja `authLog error` y sigue.
- Los eventos que se envían a Sentry desde sandbox-api (`server/config/sentryBeforeSend.js`) también salen con
  los datos ocultos.

En `user-api` no se usan `console.*`, `logger.*` ni `Sentry.capture*` directos.

**Configuración por cliente (opcional):** `LOG_MASKING` en `local.env.js`. Sin configurar, se usa el catálogo
base con la ocultación activa. Ejemplos:

```js
// Ocultar también los nombres
LOG_MASKING: { strategies: { text: { level: 'light' } } }

// Bloquear un campo propio del cliente
LOG_MASKING: { strategies: { block: { add: [ 'clave_acceso' ] } } }
```

Al arrancar, la app avisa una sola vez si la configuración tiene valores inválidos o si reduce la protección.

**Guía completa** (catálogo, niveles de ocultamiento, todas las opciones, qué queda visible por defecto,
resolución de problemas): `server/api/user-api/helpers/LOGGING.md` en el repo user-api. Es la fuente de verdad:
si esta página y la guía no coinciden, vale la guía.

---

## Pendiente antes de publicar

- [ ] PR de user-api y sandbox-api aprobados y mergeados en las dos líneas (F10 del caso).
- [ ] Revisar que nombres de archivo, ejemplos y comportamiento sigan iguales a lo mergeado.
- [ ] Cambiar la referencia a `LOGGING.md` por el enlace de Bitbucket a la rama `develop` de user-api.
- [ ] Mostrar el texto final al dev y publicar con su OK, como nueva versión de la página 577765435.
