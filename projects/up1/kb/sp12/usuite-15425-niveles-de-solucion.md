---
id: DOC-kb-sp12-usuite-15425-niveles-de-solucion
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
  - logger
---

# USUITE-15425: niveles de solución (consolidado con verificación en uvmcl)

> Ticket: [USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425) · Consolidado al 2026-09-28 · Producto: uPlanner Suite (legacy), no UP1.
> Documento anterior (análisis inicial, flujo y primer plan de prueba): [usuite-15425-claves-en-logs-uvmcl.md](./usuite-15425-claves-en-logs-uvmcl.md). **Este documento lo reemplaza** en diagnóstico, niveles de solución y esfuerzo; el anterior se conserva como historia del análisis.

## 1. Causa del caso reportado

- La línea responsable es **`sandbox-api/server/api/user-api/loginServices.js:243`**: `console.log('Login user response', name, result)`. Imprime la respuesta completa del WebService de login de uvmcl: `CLAVE`, RUT (`NRRUTUSER`), nombres, apellidos y correos. Sigue siendo `console.log` en `develop` y `master` (último commit revisado de `origin/master`: 2026-09-16).
- **`console.log` no pasa por el logger**, así que se imprime con cualquier nivel de log. La captura del ticket lo confirma: la línea sale sin fecha ni `[info]` y con el objeto en varias líneas, a diferencia de las líneas del logger (`26-09-21 15:11:22 - - [info]: ...`).
- **Origen:** hasta abril de 2024 la línea era `logger.silly(...)`. Se cambió a `console.log` en el commit `6dbf55fd` ([USUITE-3902](https://u-planner.atlassian.net/browse/USUITE-3902), incidente de UNAB) para ver siempre la respuesta del WebService en producción.
- **Aclaración sobre el logger:** `winston` no oculta ni cifra nada. Hace solo dos cosas:
  - **Filtra por nivel:** decide si una línea se imprime o no (`error` > `warn` > `info` > `http` > `verbose` > `debug` > `silly`).
  - **Da formato.** Con la configuración actual (`config/logger.js`), una llamada con 3 argumentos (`logger.silly(msg, a, b)`) descarta los datos extra; una con 2 argumentos (`logger.silly(msg, objeto)`) imprime el objeto completo en texto plano. Verificado ejecutando el logger del repo con datos ficticios.

## 2. Estado verificado del ambiente uvmcl (producción)

| Qué se revisó | Resultado |
|---|---|
| Pods que atienden el login | `suite-api-5c8dd475b7-c9dlh` y `suite-api-5c8dd475b7-zqsdt` (2 réplicas, 34 días arriba al 2026-09-28), namespace `uvmcl-retention` |
| Config usada por la app | `/home/uplanner/sandbox-api/server/config/local.env.js`, copiada al arrancar desde la plantilla `/data/templates/configurator/api/local.env.js` (en el EFS: `/efs/<environment>/efs-pvc/templates/configurator/api/local.env.js`) |
| `loggerLevel` en la config y en la plantilla | **No existe**: el nivel configurado es `silly` (`config/logger.js:35`: `env.loggerLevel \|\| 'silly'`) |
| `NODE_ENV` | La app corre en **`development`**: el pod arranca con `gulp` (`bin/docker-entrypoint.sh`) y `gulpfile.js:26` lo fuerza. Confirma la nota del ticket sobre el "modo debug", pero **no es la causa** del caso |
| Niveles en el log reciente | Solo `[info]` (2.303 y 2.346 líneas en 2 horas) |
| Retención del log del pod | Unos 2 días (desde 26-09-26 21:22). Lo anterior está en Loki |
| `GET /changeLog/:logLevel` (`app.js:64`) | Cambia el nivel en caliente, pod por pod, **sin autenticación**. **No deja rastro en el log de la app**, porque se declara antes del registrador de requests (`app.js:155`) y de `morgan` (`app.js:250`). No existe endpoint para consultar el nivel |
| Nivel real actual | **No se puede determinar.** No es `error` ni `warn` (salen líneas `[info]`); entre `info` y `silly` no hay forma de saberlo sin fijarlo |

### Comandos usados (solo lectura)

```bash
kubectl exec -n uvmcl-retention <pod-suite-api> -c suite-api -- sh -c 'grep -n loggerLevel $HOME/sandbox-api/server/config/local.env.js || echo "SIN loggerLevel: nivel efectivo silly"'
kubectl exec -n uvmcl-retention <pod-suite-api> -c suite-api -- grep -n -i "logger" /data/templates/configurator/api/local.env.js
kubectl logs -n uvmcl-retention <pod-suite-api> -c suite-api --since=2h | sed 's/\x1b\[[0-9;]*m//g' | grep -oE '\[(error|warn|info|http|verbose|debug|silly)\]' | sort | uniq -c
```

## 3. Vulnerabilidades detectadas

**La que levanta el caso:**

| # | Dónde | Qué expone | Cómo se imprime |
|---|---|---|---|
| **1** | **`loginServices.js:243`, login WSDL** | **Respuesta completa con `CLAVE` y datos personales** | **`console.log`** |

**Mismo tipo de exposición:**

| # | Dónde | Qué expone | Cómo se imprime | ¿Aplica a uvmcl? |
|---|---|---|---|---|
| 2 | `loginServices.js:815`, login de estudiantes WSDL | Respuesta en login fallido (puede incluir `CLAVE`) | `console.log` | Sí, si usa `/students` |
| 3 | `loginServices.js:211` y `:247`, login WSDL | El error del WebService va a Sentry y al navegador sin filtrar | Sentry / respuesta HTTP | Sí |
| 4 | `authentication/auth.js:762`, autologin | Clave descifrada | `logger.silly` (2 argumentos: se imprime en claro con nivel `silly`) | A confirmar |
| 5 | `loginServices.js:91`, login POST | Respuesta del servicio del cliente | `logger.silly` (2 argumentos) | No |
| 6 | `auth.js:808-845`, login TOKEN | El comando `curl` con usuario, clave y secreto queda en Sentry | Sentry | No |
| 7 | `index.js:482` (SAML), `auth.js:519` (OIDC), `services.js:1151` y `:1189` | Perfil del usuario (datos personales) | `console.log` | A confirmar |
| 8 | `auth.js:163-197` (AD), `userInfoMethod/ldap.js` | Usuario y errores de conexión | `console.log` | No |

**Configuración que agrava:**

| # | Qué | Efecto |
|---|---|---|
| 9 | `loggerLevel` sin definir → `silly` | Se imprimen todos los logs `silly` y `debug`, incluidos los puntos 4 y 5 |
| 10 | `/changeLog` sin autenticación y sin rastro | Cualquiera con acceso a la ruta sube o baja el nivel, y no queda registro |
| 11 | `NODE_ENV=development` en producción | Carga la config y las rutas de desarrollo |

## 4. Niveles de solución

### Nivel 0. Fijar y verificar el nivel del logger

**Qué se hace:**
1. Respaldar la plantilla (`local.env.js.bak-USUITE-15425`) y agregar `loggerLevel: 'info',` dentro de `module.exports = { ... }`.
2. Reiniciar suite-api: `kubectl rollout restart deployment/suite-api -n uvmcl-retention`.
3. Verificar en cada réplica nueva:
   - que la config se copió: `grep -n loggerLevel $HOME/sandbox-api/server/config/local.env.js`;
   - el nivel efectivo: `cd $HOME/sandbox-api && node -e "console.log(require('./server/config/logger.js').transports.console.level)"` (probado localmente: sin la clave devuelve `silly`).
4. Hacer un login de prueba y revisar el log.

**Se deja de imprimir:** los `logger.silly`, `logger.debug` y `logger.verbose` (incluidos los puntos 4 y 5).

**Se sigue imprimiendo:** los `console.log` (**punto 1, el caso**, y los puntos 2, 7 y 8), las líneas `[info]`, `[warn]` y `[error]`, y lo que va a Sentry (puntos 3 y 6).

**Resultado esperado de la prueba:**

| En el log | Esperado | Demuestra |
|---|---|---|
| `[silly]` o `[debug]` | No aparecen | El nivel funciona |
| `[info]` | Aparecen | El log normal se mantiene |
| `Login user response ... CLAVE` | **Sigue apareciendo** | Hace falta cambiar el código |

**¿Cubre el caso?** No. Es diagnóstico y punto de partida de los demás niveles.

**Consideraciones:**
- La plantilla afecta a todos los pods del namespace que usan `sandbox-api`, incluido `cron-api` cuando se reinicie.
- `/changeLog` puede volver a cambiar el nivel de un pod hasta el siguiente reinicio.

**Esfuerzo:** 0,25 a 0,5 días (QA y producción). Requiere a DevOps. Sin cambio de código ni imagen nueva.

---

### Nivel 1. Pasar los logs sensibles a nivel bajo

**Qué se hace:**
- Cambiar los `console.log` de los puntos 1 y 2 (solo uvmcl), o de los puntos 1, 2, 7 y 8 (todos los flujos), a `logger.silly`.
- Quitar el error crudo de lo que va a Sentry y al navegador (puntos 3 y 6).
- Se apoya en el nivel 0.

**Resultado:**
- Con nivel `info`, la contraseña deja de imprimirse.
- **También desaparece el registro del evento**: no queda la respuesta del WebService ni los códigos de error. Al depurar no hay información.
- **Si alguien sube el nivel a `silly` con `/changeLog`:**
  - con 2 argumentos (`logger.silly(msg, datos)`), **la clave sale en texto plano**;
  - con 3 argumentos (`logger.silly(msg, name, result)`), no sale nada ni siquiera con `silly`, así que no sirve para depurar.

**¿Cubre el caso?** Sí, mientras el nivel se mantenga en `info`.

**Esfuerzo:** 1 a 1,5 días (solo uvmcl) / 1,75 a 2,75 días (todos los flujos). Incluye QA en uvmcl y despliegue.

---

### Nivel 2. Helper que oculta la contraseña

**Qué se hace:**
- Crear un helper `sanitizeForLog` en `core-api/helpers` que trabaja sobre una **copia** del dato (para no afectar la sesión):
  - la clave (`CLAVE`, `password`, `pass`, `passwd`, `contrasena`, `contraseña`, `token`, `secret`, `authorization`, etc., sin distinguir mayúsculas) queda como `[REDACTED]`;
  - RUT y correo quedan enmascarados (`12.***.***-K`);
  - el resto de los campos queda intacto.
- Aplicarlo en los puntos de exposición y en un filtro `beforeSend` de Sentry.
- No devolver el error crudo al navegador.
- Se apoya en el nivel 0.

**Resultado:**
- **Queda el log del evento**: se ven la respuesta del WebService y `CODERROR`, `CODIGOERROR` y `NRESTADO`, que sirven para depurar.
- La contraseña no sale nunca, con ningún nivel.
- Soporte no puede ver la clave real.

**¿Cubre el caso?** Sí, siempre.

**Esfuerzo:** 1,5 a 2,5 días (solo uvmcl) / 3,25 a 4,75 días (todos los flujos).

---

### Nivel 3. Contraseña cifrada y recuperable

**Qué se hace:**
- Lo mismo que el nivel 2, pero la clave se escribe **cifrada** (`CLAVE: enc:v1:...`) en vez de `[REDACTED]`.
- **Cifrado asimétrico** (híbrido RSA-OAEP + AES-256-GCM con `crypto` nativo de Node, sin dependencias nuevas):
  - el pod tiene solo la **llave pública**: puede cifrar, no descifrar;
  - la **llave privada** queda fuera del cluster, en manos de 1 o 2 personas, que recuperan la clave con un script local (`decrypt-log.js`) y un runbook;
  - cada cifrado es distinto aunque la clave sea la misma.
- **La llave pública se lee desde AWS Secrets Manager** (mismo patrón que `fakeAuth`, `loginServices.js:456`, con caché en Redis): rotarla no requiere despliegue.
- **Falla segura:** si la llave no está disponible, la clave queda como `[REDACTED]`, nunca en texto plano, y el login sigue funcionando.
- **Mecanismos existentes de la Suite descartados:**

| Mecanismo | Dónde | Por qué no sirve |
|---|---|---|
| Base64 del login | `suite-front/components/organisms/login/OAppAuthStrategyWebV2.vue:108` (y Ldap, Wsdl, RPA, Impersonate) | No es cifrado |
| `encryptRequest` | `suite-front/utils/helpers.ts:1045`, `sandbox-front/.../userListController.js:216` → `user-api/services.js:258` | Llave = nombre del cliente + texto fijo en el código del front |
| AES del autologin | `auth.js:754` | Simétrico con llave e IV fijos en el pod: quien accede al pod descifra |
| 3DES de ucalTls | `custom/ucalTls.js:21` | Algoritmo obsoleto |

**Resultado:**
- Queda el log del evento, como en el nivel 2.
- Quien lee el log ve solo el texto cifrado.
- Soporte recupera la clave cuando depura, sin redeploy ni cambios de configuración.

**¿Cubre el caso?** Sí, siempre.

**Requisitos previos:**
- Aprobación de seguridad o legal para guardar claves recuperables.
- Definir quién custodia la llave privada.
- Crear el secreto con la llave pública en QA y producción, y confirmar que el rol IAM del pod puede leerlo.

**Esfuerzo:** 3,25 a 4,75 días (solo uvmcl) / 5 a 7 días (todos los flujos).

## 5. Comparación

| Nivel | ¿Cubre el caso? | ¿Queda el log del evento? | ¿Se puede ver la clave para depurar? | ¿Cambia código? | Esfuerzo (uvmcl / todos los flujos) |
|---|---|---|---|---|---|
| 0. Fijar nivel | No | Sí | Sí, en texto plano (el problema sigue) | No | 0,25 a 0,5 días |
| 1. Nivel bajo | Sí, salvo que se suba el nivel | No | Solo subiendo el nivel, y en texto plano | Sí | 1 a 1,5 / 1,75 a 2,75 días |
| 2. Ocultar | Sí | Sí | No | Sí | 1,5 a 2,5 / 3,25 a 4,75 días |
| 3. Cifrar | Sí | Sí | Sí, con el script y la llave privada | Sí | 3,25 a 4,75 / 5 a 7 días |

El nivel 0 se ejecuta siempre primero. Los niveles 1 a 3 son alternativas entre sí y se apoyan en él.

## 6. Plan de prueba en uvmcl (niveles 1 a 3)

**Tests unitarios (niveles 2 y 3):**
- El helper oculta la clave en objetos anidados, sin distinguir mayúsculas.
- **El dato original no cambia al sanitizar** (caso crítico: protege la sesión).
- Entradas raras (`null`, `undefined`, arrays, referencias circulares, XML como texto) no rompen nada.
- Sentry (`beforeSend`) sale limpio.
- Solo nivel 3: cifrar y descifrar devuelve la clave exacta; dos cifrados de la misma clave son distintos; sin llave queda `[REDACTED]`.

**QA en `uvmcl-retention-qa`** (evidencia: extracto de `kubectl logs` filtrado por `clave|password|Login user response|enc:v1` y evento de Sentry si aplica):

| Caso | Esperado |
|---|---|
| Login correcto | Entra normal; sesión completa (nombre, correo, rol, permisos). **Caso crítico** |
| Log del login correcto | Sin `CLAVE` en texto plano. Nivel 2: `[REDACTED]`; nivel 3: `enc:v1:...`; nivel 1: la línea no aparece |
| Clave incorrecta | Mismo mensaje de siempre; sin la clave en el log |
| Login de estudiantes (si aplica) | Igual que antes; log limpio |
| Forzar `/changeLog/silly` y repetir el login | Niveles 2 y 3: la clave sigue protegida. Nivel 1: se documenta el riesgo |
| Error del WebService (simulado) | Mensaje de siempre; navegador y Sentry sin el error crudo |
| Solo nivel 3: descifrar con el script | Se obtiene exactamente la clave usada |
| Solo nivel 3: llave privada en el pod | No está |
| Solo nivel 3: rotar la llave pública sin redeploy | Los logins siguientes se descifran solo con la privada nueva |
| Regresión | Navegar el módulo de retención y cerrar sesión sin errores nuevos |

**Producción de uvmcl:**
- Smoke de login coordinado con el cliente.
- Revisión del log de las 2 réplicas.
- Revisión de Sentry durante 24 horas.
- Solo nivel 3: un descifrado de control.

**Criterio de salida:** tests en verde, casos de QA aprobados con evidencia y producción sin hallazgos.

## 7. Complementos recomendados (niveles 1 a 3)

| Complemento | Por qué | Esfuerzo |
|---|---|---|
| Proteger `/changeLog` con autenticación y agregar una consulta del nivel actual | Hoy cualquiera lo cambia sin rastro y no se puede saber qué nivel hay | +0,5 días |
| Revisar que el ingress no exponga rutas de suite-api fuera de `/api/*` | Define si `/changeLog` es accesible desde internet (en el `api-gateway` del repo no está expuesto) | DevOps |
| Fijar por digest los clientes que usan la imagen `master` antes del merge | Evita que reciban el cambio sin validar (7 en staging y 7 en producción según `platform-gitops`, casi todos demos) | DevOps |

## 8. Pendiente en cualquier caso

- **Purgar de Loki los logs con contraseñas** y decidir si se pide al cliente rotar las claves.
- **Avisar a uvmcl que su WebService devuelve la `CLAVE` en la respuesta.** Un servicio de login no debería hacerlo.
- **Editar USUITE-3902**: su descripción contiene una contraseña en texto plano.

## 9. Para tickets aparte

- El login TOKEN permite inyección de comandos: la clave se interpola sin escapar en un `curl` ejecutado con `exec` (`auth.js:808-845`).
- La llave de `encryptRequest` está escrita en el front (`suite-front/utils/helpers.ts:1045`).
- La contraseña se guarda en texto plano en la sesión (`cas_userinfo.pass`, en Redis). La usan `seeds.js:55`, `seeds.js:137` y `auth.js:700`.
- Producción corre con `gulp` en modo `development`.

## 10. Decisiones pendientes

1. Qué nivel se implementa (1, 2 o 3), y si es solo el flujo de uvmcl o todos los flujos.
2. Solo nivel 3: aprobación de seguridad o legal, y quién custodia la llave privada.
3. Si se suma la protección de `/changeLog`.
4. Coordinación con DevOps para el nivel 0 (plantilla y reinicio) y para fijar por digest.
