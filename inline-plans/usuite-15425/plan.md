# Plan inline: USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles)

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.
**Tags:** repos: user-api, sandbox-api · tickets: USUITE-15425 · labels: suite-legacy
**Estado:** 0 de 11 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Verificación previa | antes de escribir código, confirmar que los supuestos del plan siguen siendo ciertos y tener listo todo lo necesario para desarrollar y probar: ramas, Docker, usuario de prueba y fixtures. | Pendiente | - → - | - | 0/5 | F0.1; F0.2; F0.3; F0.4; F0.5; F0.6; F0.7; F0.8; F0.9 |
| F1 Helper de ofuscación (logSanitizer.js) | tener un helper que, dado cualquier dato, devuelva una copia con contraseñas y secretos bloqueados y correos, documentos y nombres ocultos según el nivel configurado, sin modificar el original y sin lanzar excepciones nunca. | Pendiente | - → - | - | 0/4 | F1.1; F1.2; F1.3; F1.4; F1.5; F1.6; F1.7; F1.8 |
| F2 Detección de datos dentro de texto | que las claves, correos y (opcionalmente) RUT que vienen **dentro de un texto** (XML, cadenas `clave=...`, JSON serializado, comandos `curl`, mensajes libres) también se oculten, no solo los que vienen como campo con nombre. | Pendiente | - → - | - | 0/3 | F2.1; F2.2; F2.3; F2.4; F2.5 |
| F3 Función de log authLog.js | una única función de log para todo el módulo de autenticación que sanitiza siempre, escribe en el logger de siempre con niveles visibles (`info`, `warn`, `error`), reenvía los errores a Sentry ya sanitizados y nunca rompe el login. | Pendiente | - → - | - | 0/2 | F3.1; F3.2; F3.3; F3.4; F3.5 |
| F4 Conversión del login de uvmcl (loginServices.js) | que el archivo donde se detectó la fuga (`loginServices.js`) deje de escribir la clave y cualquier dato sensible: todos sus logs pasan por `authLog` y el navegador ya no recibe errores crudos. | Pendiente | - → - | - | 0/4 | F4.1; F4.2; F4.3; F4.4; F4.5 |
| F5 Conversión del resto de user-api | que **todo** el módulo de autenticación escriba sus logs solo a través de `authLog`, para todos los tipos de login (WSDL, POST, SAML, AD, ADAL, ADB2C, LDAP, OIDC). | Pendiente | - → - | - | 0/4 | F5.1; F5.2; F5.3; F5.4; F5.5; F5.6; F5.7; F5.8 |
| F6 Sentry (sandbox-api/server/app.js) | que los eventos que se envían a Sentry (que adjuntan el body del request, como el formulario de login) lleguen sin claves ni datos sensibles, y que el código siga funcionando aunque el helper de `user-api` no esté disponible. | Pendiente | - → - | - | 0/3 | F6.1; F6.2; F6.3; F6.4; F6.5 |
| F7 Chequeo estático y smoke local | comprobar, antes de cualquier PR, que no quedó ningún log fuera de `authLog`, que todo el código corre en Node 10 y que la salida real del logger no muestra datos sensibles en los escenarios que hoy tienen los clientes. | Pendiente | - → - | - | 0/3 | F7.1; F7.2; F7.3; F7.4 |
| F8 Documentación | que cualquier persona del equipo pueda usar, configurar y diagnosticar el helper sin leer su código: JSDoc completo, guía de uso y ejemplo en la plantilla de configuración. | Pendiente | - → - | - | 0/3 | F8.1; F8.2; F8.3; F8.4 |
| F9 QA y entrega a master (línea normal) | llevar el cambio a `master` en ambos repos, validado en la QA de uvmcl, para que quede listo para cualquier ambiente de la línea normal. | Pendiente | - → - | - | 0/3 | F9.1; F9.2; F9.3 |
| F10 Paso a la línea secure | llevar el mismo cambio a `feature/secure-master` en ambos repos sin romper el login con cookies propio de esa línea, para que quede listo para cualquier ambiente de la línea secure. | Pendiente | - → - | - | 0/3 | F10.1; F10.2; F10.3; F10.4; F10.5; F10.6 |

## Riesgos

- Romper el login al sanitizar: T22 (el original no cambia) + Q1
- Sintaxis no soportada por Node 10 que solo falla en producción: Tests y smoke en la imagen de producción + `node --check` (F7)
- Campos sensibles con nombres no previstos en otros clientes: Patrones por defecto (`mail`, `correo`, `documento`), config por ambiente sin redeploy de imagen y relevamiento repetible (F7, Q9)
- Patrones que ocultan de más: Solo textos y números en niveles parciales (T8); `exclude`/`excludePatterns` por ambiente
- Expresiones regulares configuradas inválidas o costosas: Compilación protegida, límite de 200 caracteres y uso solo contra nombres de campo (T16)
- Referencias compartidas marcadas como circulares: Registro por camino + T24
- Perder alertas de Sentry al dejar `console.error`: `authLog.error` reenvía (D3) + T41
- Desfase de despliegue entre repos: `require` protegido en F6 (T44)
- Datos perdidos o pisados por el formato del logger: Datos en `data` + T37 y T38
- Más volumen de log: Consolidación y eliminación de ruido (D1)
- Ambientes sin config o con config errónea: Defaults + validación por opción (T12, T13, Q5)
- Configuración que reduce la protección: Aviso visible al arrancar (T19)
- Ambientes futuros con datos o logins no vistos en uvmcl: El código cubre todos los tipos de login, config por ambiente sin cambiar código y QA mínima por ambiente (ver "Despliegue")
- Conflictos al reaplicar en secure que rompan el login con cookies: Un commit por archivo, resolución archivo por archivo, tests y QA propios de la línea secure con logout (F10)
- Logs que solo existen en secure quedan sin convertir: Búsqueda dedicada y chequeo estático en la rama secure (F10)
- Las líneas cambian antes de entregar (nuevos merges): Ramas actualizadas al empezar cada fase y antes de cada PR (`git fetch` + integrar base), con tests de nuevo
- Confundir un fallo existente con uno introducido: Línea base de tests por línea (F0.9 y F10.1) y comparación en cada fase
- La suite existente no corre por falta de base de pruebas: Se registra en F0.9 con motivo y ambiente alternativo; la suite del helper no depende de la base
- Riesgo aceptado por el dev (2026-10-01): quién ejecutó (`actor`, `executed_by`) y que el juez final corrió ciego en un subagente lo declara el host; Kanai no puede comprobarlo. Mitigación: el `brief_id` liga el veredicto a un brief entregado y todo queda auditado en el log del plan

## Fuera de alcance

- `console.*` del resto de `sandbox-api` fuera de `user-api` (unas 900 llamadas).
- Despliegue en ambientes distintos de uvmcl (se programa después; el código queda listo).
- Purga de logs ya almacenados en Loki (DevOps).
- Cifrado recuperable de claves.
- Protección de `/changeLog`.

## Fases

### F0. Verificación previa

**Meta:** antes de escribir código, confirmar que los supuestos del plan siguen siendo ciertos y tener listo todo lo necesario para desarrollar y probar: ramas, Docker, usuario de prueba y fixtures.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,25 a 0,5 días.

**Registro F0** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F0.pre1: Plan leído completo, en especial "Decisiones tomadas" y "Estrategia de entrega".
  - [ ] F0.pre2: Acceso a Sentry y a los repos `user-api` y `sandbox-api` en Bitbucket.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** pendiente: Revisar en el proyecto de Sentry si el filtro de datos del servidor está activo. *Responder:* activo o no, y qué campos filtra (lista literal).
  - **F0.2** pendiente: Registrar la línea de uvmcl-retention en QA y en producción (la informa quien despliega: rama del checkout de `user-api` y de `sandbox-api` en el bastión). *Responder:* ambiente → repo → rama. *Decidir:* si está en `feature/secure-master`, F10 se adelanta y corre en paralelo con F9.
  - **F0.3** pendiente: Leer `uplanner/rules/COMMITS.md`. En ambos repos: `git fetch origin`, poner `develop` local al día con `origin/develop` (al 2026-10-01 la copia local de `sandbox-api` estaba 8 commits atrás) y crear la rama `USUITE-15425-logs-auth-seguros` desde `origin/develop`. *Responder:* por repo, commit de `origin/develop` usado como base y salida de `git status -sb` de la rama nueva.
  - **F0.4** pendiente: Volver a verificar el estado de las ramas descrito en "Estrategia de entrega", en ambos repos:
  - **F0.5** pendiente: Correr un test mínimo con el comando de "Cómo correr los tests". *Responder:* comando usado y salida (`N passing`).
  - **F0.6** pendiente: Conseguir un usuario de prueba de uvmcl para QA. *Responder:* quién lo entregó y para qué ambiente (sin escribir la clave en el registro).
  - **F0.7** pendiente: Completar el relevamiento: forma de `PIDM` y de los campos `USER*` de uvmcl (largo y tipo de caracteres, sin valores); clientes sin bloques (Loki o login de prueba). *Responder:* tabla campo → forma → estrategia que le corresponde.
  - **F0.8** pendiente: Armar fixtures anonimizados (valores ficticios, nombres de campo reales) en `server/api/user-api/test/helpers/fixtures/`: WSDL de uvmcl, POST de univalle (incluido `mensaje` con correo), `users->`, perfil SAML (con atributos tipo URL), error de axios, error de TOKEN. *Responder:* lista de archivos creados.
  - **F0.9** pendiente: Tomar la **línea base de tests** en la rama nueva (sin cambios todavía), con el comando de "Tests que ya existen", y completar la tabla "Línea base de tests" (fila de `develop`). *Responder:* total, pasan, fallan, omitidos y la lista de fallos preexistentes con su error. Si no se puede correr, el motivo concreto y dónde se tomará.
- **Criterios cumplidos:**
  - **F0.c1** pendiente (manual): Las 9 tareas respondidas con su dato concreto.
  - **F0.c2** pendiente (manual): Ramas 1 y 2 creadas desde `origin/develop` actualizado, sin "behind".
  - **F0.c3** pendiente (manual): Tabla "Línea base de tests" completa para `develop`, con los fallos preexistentes listados (o "ninguno").
  - **F0.c4** pendiente (manual): Test mínimo pasando en Docker con la imagen de producción.
  - **F0.c5** pendiente (manual): Decisión de orden F9/F10 tomada y anotada en "Desvíos del plan" si cambia el orden.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F1.c3 pasa a comando completo (node --check de logSanitizer.js en la imagen node:10.24.1-alpine3.11); F7.c2 pasa a evidencia (la lista de archivos varía, el comando está en F7.2); F9.c1 pasa a manual (resume criterios de F1 a F8); rollback agregado en F9 y F10; riesgo aceptado: actor y juez los declara el host.. Motivo: Ajustes aprobados por el dev el 2026-10-01 tras revisar la vista previa de la importación: el importador tomó "node --check" sin archivo como comando en tres criterios, el lint avisó que F9 y F10 entregan sin rollback, y la consulta abierta de la revisión de planes inline se registra como riesgo aceptado.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F1. Helper de ofuscación (logSanitizer.js)

**Meta:** tener un helper que, dado cualquier dato, devuelva una copia con contraseñas y secretos bloqueados y correos, documentos y nombres ocultos según el nivel configurado, sin modificar el original y sin lanzar excepciones nunca.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 2 a 2,5 días.

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1.pre1: Registro de F0 completo.
  - [ ] F1.pre2: Fixtures de F0.8 disponibles.
  - [ ] F1.pre3: Repasar "Diseño": estrategias, niveles, catálogo base, configuración y garantías.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Catálogo por estrategia (`block`, `email`, `id`, `text`) con niveles, y respaldo a `text` cuando el valor no tiene la forma esperada.
  - **F1.2** pendiente: Comparación por `keys` normalizadas, `patterns` y último tramo de nombres tipo URL.
  - **F1.3** pendiente: Lectura protegida de `LOG_MASKING`, combinación y validación por opción, con un único aviso; compilación protegida de expresiones.
  - **F1.4** pendiente: Avisos de protección reducida al cargar.
  - **F1.5** pendiente: Recorrido recursivo con todas las garantías de la tabla "Garantías".
  - **F1.6** pendiente: `maskValue`.
  - **F1.7** pendiente: JSDoc completo (contenido en F8.1).
  - **F1.8** pendiente: Tests T1 a T29 (`server/api/user-api/test/helpers/logSanitizer.test.js`).
- **Criterios cumplidos:**
  - **F1.c1** pendiente (evidence): T1 a T29 en verde en Docker con la imagen de producción. *Evidencia:* salida de mocha con `29 passing` (o el número real) y `0 failing`.
  - **F1.c2** pendiente (manual): Suite existente (`test:user-api`) sin fallos nuevos respecto de la línea base.
  - **F1.c3** pendiente (command): `node --check` de `logSanitizer.js` sin errores en la imagen de producción (Node 10).
  - **F1.c4** pendiente (manual): Un solo commit con el helper y sus tests (commit 1 de "Estructura de commits").
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Detección de datos dentro de texto

**Meta:** que las claves, correos y (opcionalmente) RUT que vienen **dentro de un texto** (XML, cadenas `clave=...`, JSON serializado, comandos `curl`, mensajes libres) también se oculten, no solo los que vienen como campo con nombre.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,75 a 1 día.

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.pre1: Registro de F1 completo y T1 a T29 en verde.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: `textDetection.block`: patrones fijos construidos desde los campos de `block`: `<clave>...</clave>`, `clave=...`, `"clave":"..."`, `-u usuario:secreto`.
  - **F2.2** pendiente: `textDetection.email`: correos dentro de cualquier texto, ocultos con el nivel de `email`.
  - **F2.3** pendiente: `textDetection.id` (apagado por defecto): RUT con formato dentro de texto.
  - **F2.4** pendiente: Corte por `maxTextLength` antes de buscar. Sin lookbehind ni funciones de expresiones regulares posteriores a Node 10.
  - **F2.5** pendiente: Tests T30 a T36.
- **Criterios cumplidos:**
  - **F2.c1** pendiente (evidence): T1 a T36 en verde en Docker con la imagen de producción (F2 no rompe F1). *Evidencia:* conteo de mocha.
  - **F2.c2** pendiente (command): Ninguna expresión regular con lookbehind (`(?<=`, `(?<!`): `grep -nE '\(\?<[=!]' server/api/user-api/helpers/logSanitizer.js` sin resultados.
  - **F2.c3** pendiente (manual): Un commit propio (commit 2 de "Estructura de commits").
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Función de log authLog.js

**Meta:** una única función de log para todo el módulo de autenticación que sanitiza siempre, escribe en el logger de siempre con niveles visibles (`info`, `warn`, `error`), reenvía los errores a Sentry ya sanitizados y nunca rompe el login.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,5 días.

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.pre1: Registro de F2 completo y T1 a T36 en verde.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: `info`, `warn`, `error`: sanitizan y llaman al logger global con 2 argumentos y los datos en `{ data }`.
  - **F3.2** pendiente: `error` reenvía a Sentry mensaje y error sanitizados, si Sentry está disponible.
  - **F3.3** pendiente: `try/catch` general: ante falla escribe un log mínimo (`'authLog error'`) y no propaga.
  - **F3.4** pendiente: JSDoc completo (contenido en F8.1).
  - **F3.5** pendiente: Tests T37 a T42 (`authLog.test.js`).
- **Criterios cumplidos:**
  - **F3.c1** pendiente (evidence): T1 a T42 en verde en Docker con la imagen de producción. *Evidencia:* conteo de mocha.
  - **F3.c2** pendiente (manual): Un commit propio (commit 3 de "Estructura de commits").
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Conversión del login de uvmcl (loginServices.js)

**Meta:** que el archivo donde se detectó la fuga (`loginServices.js`) deje de escribir la clave y cualquier dato sensible: todos sus logs pasan por `authLog` y el navegador ya no recibe errores crudos.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,5 días.

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.pre1: Registro de F3 completo.
  - [ ] F4.pre2: Contar los `console.*`, `logger.*` y `Sentry.capture*` actuales del archivo para tener la línea base:
```bash
grep -cE "console\.(log|error|warn|info)\(|logger\.[a-z]+\(|Sentry\.capture(Exception|Message)\(" server/api/user-api/loginServices.js
```
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: `:243` → `authLog.info('Login user response', { user: maskValue(name, 'email'), result })`.
  - **F4.2** pendiente: `:815` `console.log(response, result)` → `authLog.warn`.
  - **F4.3** pendiente: `:211` y `:247`: sin `error: err` en la respuesta al navegador (solo mensaje y código); Sentry vía `authLog.error`.
  - **F4.4** pendiente: `:291` `Session data`, `:727` `HACIENDO LOGIN CON USER`, `:70` y `:91` (POST, hoy `silly`) → `authLog.info`.
  - **F4.5** pendiente: Resto de `console.*` y `Sentry.capture*` del archivo, con el criterio D1.
- **Criterios cumplidos:**
  - **F4.c1** pendiente (evidence): Cero `console.*`, `logger.*` directos y `Sentry.capture*` en `loginServices.js` (mismo `grep` del "Antes de empezar" devuelve `0`). *Evidencia:* conteo antes → después.
  - **F4.c2** pendiente (manual): Smoke local (F7) con el fixture de uvmcl sin la clave visible.
  - **F4.c3** pendiente (manual): Tests T1 a T42 siguen en verde y la suite existente sin fallos nuevos respecto de la línea base.
  - **F4.c4** pendiente (manual): Un commit solo con este archivo.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Conversión del resto de user-api

**Meta:** que **todo** el módulo de autenticación escriba sus logs solo a través de `authLog`, para todos los tipos de login (WSDL, POST, SAML, AD, ADAL, ADB2C, LDAP, OIDC).
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 1,5 a 2 días.

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.pre1: Registro de F4 completo.
  - [ ] F5.pre2: Línea base del chequeo estático de F7 (los tres `grep`) anotada en el registro: cantidad por archivo.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: `authentication/auth.js` · Se elimina `decripted pw` (`:762`); los `silly` del autologin pasan a `info`; errores TOKEN (`:808-845`) por `authLog.error`; bloques AD (`:163-197`) consolidados en un log por intento; `wso2oidCallback` (`:519`) con `req.user` sanitizado
  - **F5.2** pendiente: `multiAuth/ad.js` · Bloques AD consolidados
  - **F5.3** pendiente: `multiAuth/azureSaml.js` · Pasa a `authLog` (perfil SAML en `:31`)
  - **F5.4** pendiente: `multiAuth/openIdConnect.js` · Pasa a `authLog`
  - **F5.5** pendiente: `index.js` · `user->` (`:482`) y errores de rutas de auth
  - **F5.6** pendiente: `services.js` · `getUserInfo` (`:1149-1152`, `:1188-1190`): el `users->` que aparece en casi todos los clientes
  - **F5.7** pendiente: `custom/ucalTls.js`, `userInfoMethod/ldap.js`, `userInfoMethod/userInfoMethod1.js` · Conversión con criterio D1 (un commit por archivo)
  - **F5.8** pendiente: `seeds/seeds.js`, `seeds/seed-helper.js` · Conversión; confirmar que no se loguea `cas_userinfo.pass`
- **Criterios cumplidos:**
  - **F5.c1** pendiente (evidence): Chequeo estático de F7 en cero. *Evidencia:* tabla archivo → conteo antes → conteo después.
  - **F5.c2** pendiente (manual): Tests T1 a T42 en verde y la suite existente sin fallos nuevos respecto de la línea base (se corre después de cada archivo convertido).
  - **F5.c3** pendiente (manual): Smoke local con los fixtures de cada proveedor sin datos sensibles visibles.
  - **F5.c4** pendiente (manual): Un commit por archivo (se lista cada SHA en el registro con su archivo).
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F6. Sentry (sandbox-api/server/app.js)

**Meta:** que los eventos que se envían a Sentry (que adjuntan el body del request, como el formulario de login) lleguen sin claves ni datos sensibles, y que el código siga funcionando aunque el helper de `user-api` no esté disponible.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,5 días.

**Registro F6** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F6.pre1: Registro de F5 completo.
  - [ ] F6.pre2: Rama 2 (`sandbox-api`) actualizada con `origin/develop`.
  - [ ] F6.pre3: Resultado de F0.1 (filtro del servidor de Sentry) a mano.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Extender el `beforeSend` existente: sanitizar `event.request.data`, `request.headers`, `request.cookies`, `extra` y `contexts`.
  - **F6.2** pendiente: Rama con Sentry deshabilitado: el evento que hoy se imprime con `console.error` se imprime sanitizado por el logger.
  - **F6.3** pendiente: `require` protegido del helper de `user-api`: si no está disponible, se descarta `request.data` en vez de enviarlo o imprimirlo.
  - **F6.4** pendiente: Hallazgo preexistente, **se consulta antes de tocarlo**: `const { message } = hint.originalException` lanza si no hay excepción (p. ej. `captureMessage`). *Responder:* a quién se consultó y qué se decidió.
  - **F6.5** pendiente: Tests T43 (evento con `password` en `request.data` y en `extra`), T44 (helper no disponible: `request.data` descartado), T45 (Sentry deshabilitado: salida sanitizada).
- **Criterios cumplidos:**
  - **F6.c1** pendiente (manual): T43 a T45 en verde en Docker con la imagen de producción.
  - **F6.c2** pendiente (manual): Suite existente sin fallos nuevos respecto de la línea base (F6 toca el arranque de la app).
  - **F6.c3** pendiente (manual): Un commit propio en `sandbox-api`.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F7. Chequeo estático y smoke local

**Meta:** comprobar, antes de cualquier PR, que no quedó ningún log fuera de `authLog`, que todo el código corre en Node 10 y que la salida real del logger no muestra datos sensibles en los escenarios que hoy tienen los clientes.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,25 a 0,5 días.

**Registro F7** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F7.pre1: Registros de F4, F5 y F6 completos.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F7.1** pendiente: Chequeo estático, con resultado esperado cero (fuera de `helpers/` y `test/`):
  - **F7.2** pendiente: Chequeo de sintaxis Node 10 en la imagen de producción:
  - **F7.3** pendiente: Smoke que carga el logger real, pasa cada fixture por `authLog` e imprime la salida, en Docker con la imagen de producción, en tres escenarios:
  - **F7.4** pendiente: Revisar las tres salidas: sin claves visibles, correos e identificadores según nivel, nombres y códigos según config, sin excepciones. Guardar las salidas como evidencia.
- **Criterios cumplidos:**
  - **F7.c1** pendiente (evidence): Los tres `grep` de F7.1 en `0`. *Evidencia:* salida literal (vacía) y conteo.
  - **F7.c2** pendiente (evidence): `node --check` sin errores en todos los archivos modificados (comando de F7.2). *Evidencia:* lista de archivos revisados y salida del comando.
  - **F7.c3** pendiente (manual): Las tres salidas del smoke guardadas (ruta del archivo) y revisadas, con una línea por escenario: qué se esperaba y qué salió.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F8. Documentación

**Meta:** que cualquier persona del equipo pueda usar, configurar y diagnosticar el helper sin leer su código: JSDoc completo, guía de uso y ejemplo en la plantilla de configuración.
**Responsable sugerido:** dev del ticket, con revisión de otra persona del equipo.
**Esfuerzo:** 0,5 a 0,75 días.

**Registro F8** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F8.pre1: Registro de F7 completo (el comportamiento documentado ya está verificado).
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F8.1** pendiente: **JSDoc** en `logSanitizer.js` y `authLog.js` (descripciones en español):
  - **F8.2** pendiente: **Guía `server/api/user-api/helpers/LOGGING.md`:**
  - **F8.3** pendiente: **Plantilla de ejemplo** `sandbox-api/server/config/local.env.sample.backend.js`: bloque `LOG_MASKING` comentado con los defaults y `loggerLevel: 'info'`, con un comentario que apunte a la guía.
  - **F8.4** pendiente: **KB:** actualizar este documento y el mapa del sistema de logs si algo cambió durante el desarrollo.
- **Criterios cumplidos:**
  - **F8.c1** pendiente (command): `npx jsdoc -c jsdoc.json server/api/user-api/helpers -d <scratch>/jsdoc` sin errores ni advertencias y con los `@typedef` en la salida (puede correr con el Node del host). *Evidencia:* salida del comando.
  - **F8.c2** pendiente (evidence): `LOGGING.md` revisado por otra persona del equipo. *Evidencia:* quién revisó, fecha y observaciones atendidas.
  - **F8.c3** pendiente (manual): Commits de documentación en `user-api` y `sandbox-api`.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F9. QA y entrega a master (línea normal)

**Meta:** llevar el cambio a `master` en ambos repos, validado en la QA de uvmcl, para que quede listo para cualquier ambiente de la línea normal.
**Responsable sugerido:** dev del ticket. El despliegue en QA y producción lo hace quien despliega (ver "Despliegue").
**Esfuerzo:** 0,75 a 1 día.
**Cómo deshacerla:** En cada repo afectado, PR con `git revert -m 1 <SHA del merge>` a `develop` y, si ya llegó, otro a `master`; luego volver a desplegar en uvmcl la rama anterior (quien despliega). El cambio solo toca logs y no modifica datos, así que revertir no deja residuos.

**Registro F9** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F9.pre1: Registros de F0 a F8 completos.
  - [ ] F9.pre2: Si F0.2 dijo que uvmcl está en la línea secure: F10 se hace en paralelo y la QA de uvmcl se hace con lo de F10.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F9.1** pendiente: Antes de abrir los PR: `git fetch`, integrar lo último de `origin/develop` en las ramas 1 y 2 y volver a correr las dos suites. Después, PR de la rama 1 (`user-api`) y de la rama 2 (`sandbox-api`) a `develop`. *Responder:* salida de "Rama actualizada", resultado de las suites, enlace de cada PR, revisores y estado.
  - **F9.2** pendiente: Con `uvmcl-retention-qa` desplegado y registrado en "Despliegue", ejecutar Q1 a Q10 (evidencia: `kubectl logs` filtrado por `clave|password|Login user response|OCULTO` y evento de Sentry si aplica).
  - **F9.3** pendiente: PR de `develop` a `master` en cada repo, confirmando antes que `develop` solo suma este ticket respecto de `master` (`git log --oneline origin/master..origin/develop`). *Responder:* salida de ese comando, enlaces y SHA del merge.
- **Criterios cumplidos:**
  - **F9.c1** pendiente (manual): Tests T1 a T45 en verde en la imagen de producción, chequeo estático en cero, `node --check` sin errores, smoke guardado, JSDoc sin errores y `LOGGING.md` revisado (de F1 a F8).
  - **F9.c2** pendiente (evidence): Q1 a Q10 aprobados, cada uno con su evidencia.
  - **F9.c3** pendiente (manual): PR a `master` mergeados en ambos repos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F10. Paso a la línea secure

**Meta:** llevar el mismo cambio a `feature/secure-master` en ambos repos sin romper el login con cookies propio de esa línea, para que quede listo para cualquier ambiente de la línea secure.
**Responsable sugerido:** dev del ticket. Si la QA necesita un ambiente secure desplegado, lo hace quien despliega y se registra en "Despliegue".
**Esfuerzo:** 1 a 1,5 días.
**Cómo deshacerla:** En cada repo afectado, PR con `git revert -m 1 <SHA del merge>` a `feature/secure-develop` y, si ya llegó, otro a `feature/secure-master`; luego volver a desplegar la rama anterior en el ambiente secure afectado (quien despliega). Sin cambios de datos que deshacer.

**Registro F10** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F10.pre1: F9.1 a F9.3 con registro (o F7 completo, si F10 se adelantó por F0.2).
  - [ ] F10.pre2: Lista de SHA de la línea normal a reaplicar, en el orden de "Estructura de commits".
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F10.1** pendiente: `git fetch` y crear `USUITE-15425-logs-auth-seguros-secure` desde `origin/feature/secure-develop` actualizado en `user-api` y `sandbox-api`. Antes de aplicar commits, tomar la línea base de la suite existente en esta rama y completar la fila de `feature/secure-develop` en "Línea base de tests". *Responder:* commit base por repo y resultado de la línea base con sus fallos preexistentes.
  - **F10.2** pendiente: `git cherry-pick -x` de los commits de la línea normal, en orden. Resolver conflictos archivo por archivo, conservando el comportamiento propio de secure (cookies `httpOnly`, logout con `req.jwt.userId`). *Responder:* por cada commit: SHA original → SHA en secure → con o sin conflicto → cómo se resolvió.
  - **F10.3** pendiente: Buscar logs que **solo existen en secure** (código de USUITE-12513 en `authentication/auth.js`, `index.js`, `loginServices.js`, `multiAuth/*`) y convertirlos en un commit propio de esta rama. *Responder:* archivo:línea de cada log convertido.
  - **F10.4** pendiente: Repetir en esta rama: tests T1 a T45 en Docker, suite existente comparada con **su** línea base (la de `feature/secure-develop`), chequeo estático de F7 en cero, `node --check` y smoke local.
  - **F10.5** pendiente: Antes del PR: `git fetch`, integrar lo último de `origin/feature/secure-develop` y volver a correr las suites. PR a `feature/secure-develop` → QA → PR a `feature/secure-master`, confirmando antes que `feature/secure-develop` solo suma este ticket respecto de `feature/secure-master`.
  - **F10.6** pendiente: QA en un ambiente de la línea secure: Q1 a Q3, Q5, Q8 y Q10 de F9, más el logout (las cookies se borran y no hay errores nuevos).
- **Criterios cumplidos:**
  - **F10.c1** pendiente (manual): Chequeo estático en cero en la rama secure y tests T1 a T45 en verde.
  - **F10.c2** pendiente (evidence): QA de F10.6 aprobada con evidencia, incluido el logout.
  - **F10.c3** pendiente (manual): PR a `feature/secure-master` mergeados en ambos repos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
