# Plan inline: USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles)

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.
**Tags:** repos: user-api, sandbox-api · tickets: USUITE-15425 · labels: suite-legacy
**Estado:** 3 de 11 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Verificación previa | antes de escribir código, confirmar que los supuestos del plan siguen siendo ciertos y tener listo todo lo necesario para desarrollar y probar: ramas, Docker, usuario de prueba y fixtures. | Hecho | 2026-10-02 → 2026-10-02 | - | 5/5 | - |
| F1 Helper de ofuscación (logSanitizer.js) | tener un helper que, dado cualquier dato, devuelva una copia con contraseñas y secretos bloqueados y correos, documentos y nombres ocultos según el nivel configurado, sin modificar el original y sin lanzar excepciones nunca. | Hecho | 2026-10-02 → 2026-10-02 | - | 4/4 | - |
| F2 Detección de datos dentro de texto | que las claves, correos y (opcionalmente) RUT que vienen **dentro de un texto** (XML, cadenas `clave=...`, JSON serializado, comandos `curl`, mensajes libres) también se oculten, no solo los que vienen como campo con nombre. | Hecho | 2026-10-02 → 2026-10-02 | b3cc26f, 3d25f1b | 3/3 | - |
| F3 Función de log authLog.js | una única función de log para todo el módulo de autenticación que sanitiza siempre, escribe en el logger de siempre con niveles visibles (`info`, `warn`, `error`), reenvía los errores a Sentry ya sanitizados y nunca rompe el login. | Pendiente | - → - | - | 0/2 | F3.1; F3.2; F3.3; F3.4; F3.5 |
| F4 Conversión del login de uvmcl (loginServices.js) | que el archivo donde se detectó la fuga (`loginServices.js`) deje de escribir la clave y cualquier dato sensible: todos sus logs pasan por `authLog` y el navegador ya no recibe errores crudos. | Pendiente | - → - | - | 0/4 | F4.0; F4.1; F4.2; F4.3; F4.4; F4.5 |
| F5 Conversión del resto de user-api | que **todo** el módulo de autenticación escriba sus logs solo a través de `authLog`, para todos los tipos de login (WSDL, POST, SAML, AD, ADAL, ADB2C, LDAP, OIDC). | Pendiente | - → - | - | 0/5 | F5.0; F5.1; F5.2; F5.3; F5.4; F5.5; F5.6; F5.7; F5.8 |
| F6 Sentry (sandbox-api/server/app.js) | que los eventos que se envían a Sentry (que adjuntan el body del request, como el formulario de login) lleguen sin claves ni datos sensibles, y que el código siga funcionando aunque el helper de `user-api` no esté disponible. | Pendiente | - → - | - | 0/4 | F6.1; F6.2; F6.3; F6.4; F6.5 |
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

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-02 · fin 2026-10-02
- **Antes de empezar:**
  - [x] F0.pre1: Leídas "Decisiones tomadas" y "Estrategia de entrega (D6)" del plan original (plan-original.md#decisiones-tomadas y plan-original.md#estrategia-de-entrega-d6). No hace falta leer el plan original completo: cada tarea cita su sección. Se registra en el plan (registro validado), no en las tablas ni plantillas de plan-original.md: esa es la copia congelada del import y no se edita. (Leídas el 2026-10-02 las secciones plan-original.md#decisiones-tomadas (alcance, authLog, D1 a D7) y plan-original.md#estrategia-de-entrega-d6 (estado de ramas, 4 ramas y 8 PR, estructura de commits, orden de entrega, despliegue solo uvmcl).)
  - [x] F0.pre2: Acceso a Sentry y a los repos `user-api` y `sandbox-api` en Bitbucket. (Parcial, con decisión del dev el 2026-10-02: acceso a Bitbucket confirmado (git fetch origin sin errores en sandbox-api y user-api el 2026-10-02). Sin acceso a Sentry: el dev decidió avanzar sin él y verificar Sentry al final (ver desvío del 2026-10-02).)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** → No aplica en F0: el dev no tiene acceso a Sentry (2026-10-02) y no se sabe si Sentry sigue en uso en uvmcl-retention tras los cambios de ambiente. El filtro propio de F6 se aplica igual.. Dónde: Sentry del proyecto suite-api (sin acceso).. Cómo se comprobó: Decisión del dev registrada como desvío el 2026-10-02; la verificación de Sentry queda condicionada al acceso en F9.2 y Q8.
  - **F0.2** → No aplica en F0: el dev decidió trabajar primero solo en la línea normal (develop), así que el orden queda F9 y después F10 sin depender de la rama del bastión. La rama del checkout de cada repo en uvmcl-retention (QA y producción) se pide a quien despliega antes de F9.2.. Dónde: Bastión de uvmcl-retention (dato pendiente de quien despliega).. Cómo se comprobó: Decisión del dev del 2026-10-02 registrada como desvío.
  - **F0.3** → Develop local puesto al día con origin/develop por avance directo y rama USUITE-15425-logs-auth-seguros creada en ambos repos. COMMITS.md leído el 2026-10-02 (formato 'USUITE-15425 {tipo}: ...', un solo tipo de cambio por commit).. Dónde: sandbox-api: base origin/develop bfacbb0 (antes f9a9def, 8 commits atrás; el último es 'Merged in USUITE-12513 (pull request #322)'). user-api: base origin/develop 6778950 (ya estaba al día).. Cómo se comprobó: Verificado el 2026-10-02 con git status -sb y git rev-parse: en ambos repos '## USUITE-15425-logs-auth-seguros', HEAD = origin/develop, 0 commits atrás y 0 adelante. · ejecutó: dev, `for r in . server/api/user-api; do echo "== $r"; (cd "$r" && git fetch origin && git checkout develop && git merge --ff-only origin/develop && git checkout -b USUITE-15425-logs-auth-seguros && git rev-parse --short origin/develop && git status -sb) || exit 1; done`, salida 0, 2 repos; 2 ramas creadas; 0 commits behind; en sandbox-api solo queda el ajuste local del pool (stash aplicado, no se commitea) y archivos sin seguimiento .mcp.json y node_modules.zip.
  - **F0.4** → Estado de las ramas de entrega verificado de nuevo en ambos repos y comparado con plan-original.md#estado-de-las-ramas-verificado-el-2026-10-01.. Dónde: sandbox-api: master...secure-master 50/15; master vs secure-master difiere en 6 archivos (.dockerignore, bin/docker-entrypoint.sh, package.json, server/app.js 99 líneas, server/config/express.js 142, server/config/whitelist.js). A secure le faltan USUITE-14405, USUITE-12671, USUITE-14774 y f9a9def (.dockerignore). user-api: master...secure-master 84/31; difiere en los mismos 9 archivos del plan (575+/144-). A secure le faltan USUITE-10649 (4 commits), USUITE-14535, OPS-1626, USUITE-14805, USUITE-12513 (4), USUITE-15102 (2) y USUITE-15389.. Cómo se comprobó: Comparación adicional de contenido (git diff --stat): secure-develop = secure-master en ambos repos; develop = master en user-api; en sandbox-api master tiene 3 commits del 2026-09-16 (/api/version en server/app.js:234 y exclusión en server/config/express.js) que develop no tiene. develop no tiene nada que master no tenga. · ejecutó: dev, `for r in . server/api/user-api; do echo "== $r"; (cd "$r" && git rev-list --left-right --count origin/master...origin/feature/secure-master; git cherry -v origin/feature/secure-develop origin/develop | grep '^+'; git diff --stat origin/master origin/feature/secure-master; true) || exit 1; done`, salida 0, El dev lo ejecutó en una terminal externa; los números salen de la verificación en lectura del agente con los mismos comandos el 2026-10-02.
  - **F0.5** → Comprobado que Docker y la imagen de producción corren el mocha del repo.. Dónde: Raíz de sandbox-api, rama USUITE-15425-logs-auth-seguros (bfacbb0), 2026-10-02.. Cómo se comprobó: Salida del contenedor impresa por el dev: v10.24.1 y 6.2.3, sin errores. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 sh -c 'node -v && node node_modules/.bin/mocha --version'`, salida 0, Node v10.24.1, mocha 6.2.3, exit 0.
  - **F0.6** → No aplica en F0: el usuario de prueba de uvmcl solo se usa en la QA de F9.2. En desarrollo el login de uvmcl se evalúa con el fixture uvmcl-wsdl.js; el login local usa el usuario de prueba de la suite contra suite_dev.. Dónde: server/api/user-api/test/helpers/fixtures/uvmcl-wsdl.js. Cómo se comprobó: Decisión del dev del 2026-10-02 registrada como desvío; el usuario real se pide antes de F9.2.
  - **F0.7** → No aplica en F0: la forma real de PIDM y de los campos USER* de uvmcl no se relevó. Se trabaja con los valores supuestos del fixture (PIDM numérico de 7 dígitos, USER* como indicador S/N), tratados como texto visible fuera del catálogo sensible. El relevamiento real se repite en la QA (Q9 de F9.2) y, si algún campo resulta sensible, se agrega al catálogo y a sus tests.. Dónde: server/api/user-api/test/helpers/fixtures/uvmcl-wsdl.js. Cómo se comprobó: Decisión del dev del 2026-10-02 registrada como desvío.
  - **F0.8** → Fixtures anonimizados creados (valores ficticios, nombres de campo reales del relevamiento del 2026-09-30 y del código), como módulos CommonJS que devuelven copias nuevas en cada llamada: uvmcl-wsdl.js (22 campos del WSDL y la misma respuesta como XML), univalle-post.js (respuesta correcta con correo y documento en 'mensaje' y respuesta rechazada), users-response.js (users-> con ds_name como correo, RUT o usuario), saml-profile.js (nameID y atributos con URL como nombre), axios-error.js (Error con la clave en config.data y token en headers) y token-error.js (Error de exec con usuario:secreto en el curl de token y la clave en --data del curl de login). Sin commitear, para revisión del dev.. Dónde: user-api, rama USUITE-15425-logs-auth-seguros: server/api/user-api/test/helpers/fixtures/ (6 archivos). No terminan en .test.js, así que mocha.user.opts no los ejecuta como tests.. Cómo se comprobó: 2026-10-02, en Docker con node:10.24.1-alpine3.11: node --check sin errores en los 6 archivos y require de cada uno con conteos (uvmcl 22 campos, univalle 9 en datosPersona, users 8, saml 8 atributos; axios y token contienen la clave y el secreto ficticios donde corresponde; cada llamada devuelve un objeto nuevo). Pendiente: PIDM y USER* usan valores supuestos hasta F0.7.
  - **F0.9** → Línea base de la suite existente tomada el 2026-10-02 sin cambios de código del ticket (solo los fixtures de F0.8 sin commitear, que no son tests). Total 15 (2 de server/test/index.test.js y 13 de user-api): pasan 14, fallan 1, omitidos 0. Fallo preexistente: userdetail.test.js 'check detail of user / check if response all field' → TypeError: Cannot read property 'should' of undefined en la línea 14 (getUsrDetails?id=1 no trae data.roles con los datos de suite_dev) → preexistente, depende de datos.. Dónde: sandbox-api · USUITE-15425-logs-auth-seguros · bfacbb0 (user-api · USUITE-15425-logs-auth-seguros · 6778950), en Docker node:10.24.1-alpine3.11, base suite_dev (develop, túnel 5500).. Cómo se comprobó: Resumen de mocha impreso al dev: '14 passing (18s)', '1 failing'. Coincide con la corrida previa del mismo día con el reenvío de Redis por archivo (14 passing en 22 s, mismo fallo). · ejecutó: dev, `MARIADB_TEST_USERNAME="$(node -p "require('./server/config/local.env.js').MARIADB_USERNAME")" MARIADB_TEST_PASSWORD="$(node -p "require('./server/config/local.env.js').MARIADB_PASSWORD")" docker run --rm -v "$PWD":/w -w /w -e NODE_ENV=test -e MARIADB_TEST_HOST=host.docker.internal -e MARIADB_TEST_PORT=5500 -e MARIADB_TEST_DATABASE=suite_dev -e MARIADB_TEST_USERNAME -e MARIADB_TEST_PASSWORD node:10.24.1-alpine3.11 sh -c 'node -e "var n=require(\"net\");n.createServer(function(c){var u=n.connect(6379,\"host.docker.internal\");c.pipe(u).pipe(c);u.on(\"error\",function(){c.destroy()});c.on(\"error\",function(){u.destroy()})}).listen(6379,\"127.0.0.1\")" & sleep 1; node node_modules/.bin/mocha --opts server/test/mocha-opts/mocha.user.opts'`, salida 1, 15 tests: 14 passing, 1 failing (userdetail.test.js:14, preexistente), 0 pending, 18 s; código de salida 1.
- **Criterios cumplidos:**
  - **F0.c1** Las 9 tareas respondidas con su dato concreto. → Las 9 tareas de F0 tienen registro el 2026-10-02: F0.3, F0.4, F0.5, F0.8 y F0.9 con su dato; F0.1, F0.2, F0.6 y F0.7 como 'No aplica en F0' por decisión del dev (trabajar en develop con fixtures), con el dato real pendiente para F9.2.
  - **F0.c2** Ramas 1 y 2 creadas desde `origin/develop` actualizado, sin "behind". → 2026-10-02: sandbox-api y user-api en '## USUITE-15425-logs-auth-seguros' sin 'behind'; git log HEAD..origin/develop vacío en ambos (bases bfacbb0 y 6778950). · ejecutó: dev, `for r in . server/api/user-api; do echo "== $r"; (cd "$r" && git status -sb && git log --oneline HEAD..origin/develop) || exit 1; done`, salida 0, El dev lo ejecutó en una terminal externa; los números salen de la verificación en lectura del agente con los mismos comandos el mismo día: 2 de 2 repos al día, 0 commits pendientes.
  - **F0.c3** Línea base de `develop` registrada en F0.9 con números y los fallos preexistentes listados (o "ninguno"). → Registro de F0.9 del 2026-10-02 en server/api/user-api/test/userdetail.test.js:14: suite existente en sandbox-api · USUITE-15425-logs-auth-seguros · bfacbb0 con 15 tests, 14 passing, 1 failing, 0 pending; fallo preexistente userdetail.test.js:14 (TypeError: Cannot read property 'should' of undefined, falta data.roles en getUsrDetails con los datos de suite_dev).
  - **F0.c4** Docker con la imagen de producción corre el mocha del repo (F0.5): Node v10.24.1 y versión de mocha impresas. → Registro de F0.5 del 2026-10-02: docker run con node:10.24.1-alpine3.11 desde la raíz de sandbox-api imprime Node v10.24.1 y mocha 6.2.3, código de salida 0.
  - **F0.c5** Decisión de orden F9/F10 tomada con el dato de F0.2; si cambia el orden, registrada como desvío del plan. → Decisión del dev del 2026-10-02: se trabaja solo en develop y el orden queda F9 y después F10, sin adelantar la línea secure; registrada como desvío del plan.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - 1) F0.1 (filtro de datos del servidor de Sentry) no se responde en F0: se verifica al final, en la QA de F9.2 (evento de Sentry) o con quien tenga acceso. 2) Se agregó la rama local feature/secure-develop siguiendo a origin/feature/secure-develop en ambos repos (sandbox-api 7fd983d, user-api 148c4af), sin cambiar la rama actual.. Por qué: El dev no tiene acceso a Sentry; el filtro propio de F6 (beforeSend) se aplica igual, esté o no activo el de Sentry. La rama secure local la pidió el dev para revisarla antes de F10.. Cambia la decisión: F0.1 pasa a verificación final; F0.pre2 queda cumplido solo para los repos.
  - Estado de ramas distinto al del 2026-10-01 en sandbox-api: master tiene 3 commits del 2026-09-16 que develop no tiene (endpoint /api/version en server/app.js, 24 líneas cerca de la línea 234, y su exclusión en server/config/express.js). Además, a la línea secure le faltan f9a9def en sandbox-api y USUITE-10649 en user-api, que el plan no listaba.. Por qué: Hotfix aplicado directo en master sin volver a develop; el merge de USUITE-12513 en develop (2026-07-28) ya estaba en master y no cambia nada.. Cambia la decisión: Sin cambio de estrategia: el PR develop a master sigue llevando solo este ticket. En F9.3 revisar el merge de server/app.js (F6 toca las líneas 106 a 141, lejos de /api/version).
  - Corrige el registro de F0.4 con la salida real del dev (2026-10-02): en user-api, git cherry lista 30 commits de develop sin equivalente en feature/secure-develop, no solo los recientes. Además de USUITE-10649 (7), USUITE-14535, OPS-1626 (2), USUITE-14805, USUITE-12513 (4), USUITE-15102 (2) y USUITE-15389, aparecen USUITE-10952, USUITE-9959 (4), USUITE-10026 (2), un commit sin clave de optimización de consultas y los reverts de 'Develop (pull request #480)'. En sandbox-api la lista es la registrada (4 commits). Contadores y archivos sin cambios: 50/15 y 6 archivos en sandbox-api; 84/31 y 9 archivos en user-api.. Por qué: El agente había recortado la salida a las últimas 15 líneas. Los commits viejos (USUITE-9959, 10026, 10952 y los reverts) explican parte de la diferencia en los 9 archivos que difieren entre líneas.. Cambia la decisión: Sin cambio de estrategia: en F10 se reaplican solo los commits de este ticket con cherry-pick, y los conflictos en los 9 archivos se resuelven uno a la vez conservando el comportamiento de secure.
  - Decisión del dev el 2026-10-02: se trabaja solo en la línea normal (develop) y se avanza a F1 sin esperar F0.1, F0.2, F0.6 y F0.7. Los casos que dependían de accesos o de terceros (usuario de uvmcl, forma de PIDM y USER*, Sentry) se evalúan con los fixtures de F0.8 en develop; los datos reales quedan para la QA de F9. El orden de entrega queda el del plan: F9 (línea normal) y después F10 (secure).. Por qué: Ninguna de las cuatro tareas cambia el código de F1 a F8: F0.7 solo ajusta valores de prueba, F0.2 definía si F10 se adelantaba, y F0.6 y F0.1 se usan en la QA.. Cambia la decisión: F0.1, F0.2, F0.6 y F0.7 se cierran como 'No aplica en F0' y su dato real se pide antes de F9.2; F10 no se adelanta.
  - Enmienda: F1.c3 pasa a comando completo (node --check de logSanitizer.js en la imagen node:10.24.1-alpine3.11); F7.c2 pasa a evidencia (la lista de archivos varía, el comando está en F7.2); F9.c1 pasa a manual (resume criterios de F1 a F8); rollback agregado en F9 y F10; riesgo aceptado: actor y juez los declara el host.. Motivo: Ajustes aprobados por el dev el 2026-10-01 tras revisar la vista previa de la importación: el importador tomó "node --check" sin archivo como comando en tres criterios, el lint avisó que F9 y F10 entregan sin rollback, y la consulta abierta de la revisión de planes inline se registra como riesgo aceptado.
  - Enmienda: F2.c2 espera código de salida 1 (grep sin coincidencias termina con 1) y se corre desde la raíz de sandbox-api; F8.c1 pasa a un comando concreto con salida en /tmp/usuite-15425-jsdoc (fuera del repo) y se corre desde la raíz de sandbox-api.. Motivo: Aprobado por el dev el 2026-10-01 al re-registrar el caso por el MCP: con código esperado 0, F2.c2 se rechazaría justo cuando se cumple (grep sin coincidencias termina con 1); F8.c1 no decía dónde correrlo y dejaba el marcador sin completar, así que el comando registrado nunca coincidiría con el del plan.
  - Enmienda: Se agrega a los riesgos el riesgo aceptado que anuncia e0001: quién ejecutó (actor, executed_by) y que el juez final corrió ciego lo declara el host; mitigación con brief_id y log auditado.. Motivo: Completar e0001: al re-registrar el caso por el MCP el 2026-10-01, la enmienda e0001 se aplicó con su texto original, que menciona el riesgo aceptado, pero sin agregarlo a la lista de riesgos; el plan creado por CLI sí lo tenía.
  - Enmienda: Cada tarea cita su sección del KB (59 de 64); comandos para el dev en 14 tareas y 23 criterios (antes 0 y 3); 20 criterios manuales pasan a comando o evidencia; F0.pre1 ya no pide leer el plan original completo; las referencias a tablas del plan original (línea base, estado de ramas, desvíos, despliegue, registro de avance) pasan a registro validado, desvíos o documentos del KB del caso (smoke-f7.md, despliegue-uvmcl.md); F0.5 comprueba Docker y mocha en la imagen de producción; tareas nuevas F4.0 (conteo y verificación de líneas) y F5.0 (conteo por archivo); requisito de rama al día en F1, F2, F3 y F8 (F4, F5 y F6 lo reemplazan).. Motivo: Revisión del plan antes de ejecutar (2026-10-01): sin citas el siguiente paso no entregaba contexto y empujaba a leer el plan original entero (71.000 caracteres); el texto mandaba a editar tablas de la copia congelada, partiendo el registro en dos; los comandos dentro del texto no salían como acciones para el dev; y F0.5 no se podía ejecutar porque en F0 no hay tests del helper.
  - Enmienda: 1) Nuevos criterios manuales F5.c5 y F6.c4: login local (correcto y con clave incorrecta) con el log de consola sin claves ni tokens, según ambiente-local.md. 2) Sentry pasa a ser condicional al acceso: F0.1 se responde solo si se consigue acceso y Sentry sigue en uso en uvmcl-retention; si no, "No aplica" con motivo y no bloquea. F6.pre3 ya no exige el resultado de F0.1. F9.2 y Q8 piden la evidencia de Sentry solo si hay acceso y está en uso.. Motivo: Decisión del dev el 2026-10-02: el login local valida la integración real que los tests aislados no cubren (F5 y F6 tocan el resto de user-api y server/app.js). Sobre Sentry: el dev no tiene acceso, no se sabe si se conseguirá antes de cerrar y, por cambios de ambiente, puede que Sentry ya no esté en uso en uvmcl.
  - Enmienda: Commits separados por tipo según uplanner/rules/COMMITS.md: F1.c4, F2.c3 y F3.c2 pasan de un commit con código y tests a dos commits por pieza (feat solo código, test solo tests y fixtures); F6.c3 pasa a dos commits en sandbox-api (fix con server/app.js y test con T43 a T45). La línea normal queda con 6 commits de archivos nuevos (F1 a F3) y el cherry-pick a secure reaplica esos 6, también sin conflicto.. Motivo: Decisión del dev el 2026-10-02 (opción A) para resolver el hallazgo de F0: el plan pedía un commit con helper y tests, y COMMITS.md exige un solo tipo de cambio por commit y no mezclar tests con features.
  - Enmienda: Comando de la suite existente reemplazado por el que corre en Docker en la máquina del dev (base suite_dev por el túnel 5500 vía host.docker.internal, MARIADB_TEST_USERNAME y MARIADB_TEST_PASSWORD leídos de local.env.js y reenvío de Redis 127.0.0.1:6379 dentro del contenedor), con código de salida esperado 1 (el fallo preexistente de la línea base) en F0.9, F1.c2, F4.c3, F5.c2 y F6.c2. F10.1 deja de tener control automático: los comandos pasan al detalle y se registran los números, porque la línea secure todavía no tiene línea base.. Motivo: Decisión del dev el 2026-10-02 (A para la línea normal, B para F10.1). El comando original no corría en Docker: test.js usa claves propias de usuario y clave (MARIADB_TEST_*) que no están en local.env.js, y core-api/helpers/redis.helper.js:47 fija redis://127.0.0.1, que dentro del contenedor no es el Mac. La línea base tiene 1 fallo preexistente (userdetail.test.js:14) y mocha termina con código igual a la cantidad de fallos.
- **Hallazgos:**
  - preexistente · Plan: 'Estructura de commits' y criterios F1.c4, F2.c3 y F3.c2 frente a uplanner/rules/COMMITS.md ('Separacion de commits'): El plan pide un solo commit con el helper y sus tests (F1, F2 y F3), pero COMMITS.md exige un solo tipo de cambio por commit y no mezclar tests con features (feat sin tests; test aparte). Hay que decidir antes de F1 si se separan en feat + test (y ajustar los criterios y la estructura del cherry-pick) o si se acepta una excepción.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F0 cerrada el 2026-10-02. Ramas USUITE-15425-logs-auth-seguros creadas desde origin/develop al día (sandbox-api bfacbb0, user-api 6778950). Estado de las líneas verificado: el PR develop a master sigue llevando solo este ticket; master de sandbox-api tiene /api/version que develop no tiene (revisar en F9.3). Docker con node:10.24.1-alpine3.11 y mocha 6.2.3. Fixtures anonimizados en test/helpers/fixtures/ (6 archivos, sin commitear). Línea base: 15 tests, 14 passing, 1 failing preexistente (userdetail.test.js:14). Comando de la suite ajustado para Docker (base suite_dev, claves MARIADB_TEST_*, reenvío de Redis). Commits separados feat y test según COMMITS.md. Sentry, línea del bastión, usuario de uvmcl y forma de PIDM y USER* quedan para antes de F9.2; el trabajo sigue en develop con fixtures.. Siguiente: Iniciar F1 (helper logSanitizer.js) el 2026-10-02.

### F1. Helper de ofuscación (logSanitizer.js)

**Meta:** tener un helper que, dado cualquier dato, devuelva una copia con contraseñas y secretos bloqueados y correos, documentos y nombres ocultos según el nivel configurado, sin modificar el original y sin lanzar excepciones nunca.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 2 a 2,5 días.

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-02 · fin 2026-10-02
- **Antes de empezar:**
  - [x] F1.pre1: Registro de F0 completo. (F0 cerrada el 2026-10-02 (evento phase_closed de F0): 9 de 9 tareas y 5 de 5 criterios registrados, sin no cumplidos abiertos.)
  - [x] F1.pre2: Fixtures de F0.8 disponibles. (Fixtures de F0.8 en server/api/user-api/test/helpers/fixtures/ (uvmcl-wsdl.js, univalle-post.js, users-response.js, saml-profile.js, axios-error.js, token-error.js), validados con node --check y require en node:10.24.1-alpine3.11 el 2026-10-02.)
  - [x] F1.pre3: Repasar el diseño: piezas, API, estrategias y niveles, catálogo base, configuración y garantías (secciones citadas en cada tarea de F1). (Leídas el 2026-10-02 las secciones plan-original.md#piezas, #api, #estrategias-y-niveles, #catalogo-base-dentro-del-helper, #configuracion-log-masking-en-local-env-js-todo-opcional y #garantias, además de server/config/logger.js (formato de winston) y cómo user-api importa local.env (require('../../../config/local.env')).)
  - [x] F1.preR: Rama de trabajo al día en user-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo. (2026-10-02, tras git fetch origin: user-api '## USUITE-15425-logs-auth-seguros' sin 'behind' y git log HEAD..origin/develop con 0 commits; sandbox-api igual (0 commits pendientes).)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** → Catálogo por estrategia (block, email, id, text) con niveles y regla B de la decisión (tercio con tope); email sin forma de correo e id sin forma de RUT o documento se ocultan como texto con el mismo nivel.. Dónde: server/api/user-api/helpers/logMaskingConfig.js (DEFAULT_MASKING) y helpers/logSanitizer.js (visibleCount, maskEmail, maskId, maskFormattedRut). Cómo se comprobó: Salida de la tabla de niveles en node:10.24.1-alpine3.11 el 2026-10-02 (ver decision-niveles-y-archivos-helper.md); cubierto por T3 a T6, T10 y T18 (29 passing en la corrida del agente).
  - **F1.2** → Comparación de nombres de campo: keys contra el nombre normalizado (minúsculas, sin tildes, sin _ - ni espacios), patterns contra el nombre original sin distinguir mayúsculas, y último tramo de nombres con / o #. Resultado guardado en un mapa por nombre.. Dónde: helpers/logMaskingConfig.js (normalizeKey) y helpers/logSanitizer.js (candidateNames, strategyMatches, findStrategy, findCachedStrategy). Cómo se comprobó: T1, T9 y T11 (atributos SAML por último tramo) en verde en la corrida del agente del 2026-10-02.
  - **F1.3** → Lectura protegida de LOG_MASKING (require de local.env en try/catch), validación por opción con vuelta al default de lo inválido, rangos maxDepth 1 a 50 y maxTextLength 256 a 1.048.576, expresiones compiladas una vez en try/catch con tope de 200 caracteres, y un único aviso que lista lo ignorado.. Dónde: helpers/logMaskingConfig.js (buildMaskingConfig y lectores) y helpers/logSanitizer.js (loadLocalMaskingConfig, reportConfig). Cómo se comprobó: T12, T13, T16 y T26 en verde en la corrida del agente del 2026-10-02.
  - **F1.4** → Aviso al cargar 'Ofuscación de logs reducida por configuración' cuando enabled es false, cuando se excluyen campos de block (en la estrategia o con exclude global que alcanza una key de block) o cuando textDetection.block es false.. Dónde: helpers/logMaskingConfig.js (findReductions) y helpers/logSanitizer.js (reportConfig). Cómo se comprobó: T19 en verde en la corrida del agente del 2026-10-02.
  - **F1.5** → Recorrido recursivo que arma una copia nueva: ciclos detectados por camino actual ([Circular] solo en ciclo real), Error recorrido con Object.getOwnPropertyNames más name, Buffer como [Buffer N bytes], Date en ISO, funciones omitidas, null y undefined conservados, getter que lanza como [SANITIZE_ERROR], [MaxDepth] y ...[truncado]; block aplica a cualquier tipo y los niveles parciales solo a textos y números; listas y objetos heredan la estrategia del campo que los contiene; try/catch general.. Dónde: helpers/logSanitizer.js (walk, walkPrimitive, walkSpecialObject, walkContainer, walkProperties, readProperty). Cómo se comprobó: T2, T7, T8, T22 a T25 en verde en la corrida del agente del 2026-10-02.
  - **F1.6** → maskValue(valor, estrategia) con el nivel configurado; estrategia desconocida tratada como block; con la ofuscación apagada o valor null/undefined devuelve el valor; nunca lanza.. Dónde: helpers/logSanitizer.js (createSanitizer: maskValue). Cómo se comprobó: T3 y T18 (tabla completa de niveles con maskValue) en verde en la corrida del agente del 2026-10-02.
  - **F1.7** → JSDoc inicial en español: encabezado de módulo con enlace a LOGGING.md en ambos archivos, y @param/@returns en normalizeKey, buildMaskingConfig, visibleCount, createSanitizer, sanitizeForLog y maskValue. Los @typedef y @example completos quedan para F8.1, como indica la tarea.. Dónde: helpers/logMaskingConfig.js y helpers/logSanitizer.js. Cómo se comprobó: Revisión del agente de los comentarios /** */ en ambos archivos el 2026-10-02; la generación con jsdoc se valida en F8.c1.
  - **F1.8** → Tests T1 a T29 del helper escritos y en verde en la imagen de producción.. Dónde: server/api/user-api/test/helpers/logSanitizer.test.js (usa los fixtures de test/helpers/fixtures/). Cómo se comprobó: Salida de mocha impresa al dev el 2026-10-02: 29 passing (17 ms), sin fallos. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha server/api/user-api/test/helpers/logSanitizer.test.js`, salida 0, 29 passing, 0 failing, 17 ms.
- **Criterios cumplidos:**
  - **F1.c1** T1 a T29 en verde en Docker con la imagen de producción. *Evidencia:* salida de mocha con `29 passing` (o el número real) y `0 failing`. → Nueva corrida del 2026-10-02 sobre los commits 60b366a (feat) y 824d2f2 (test) de user-api, después de excluir tipo_documento y ajustar el estilo: server/api/user-api/test/helpers/logSanitizer.test.js con T1 a T29 en verde. Reemplaza la corrida anterior a esos cambios. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha "server/api/user-api/test/helpers/**/*.test.js"`, salida 0, 29 passing, 0 failing, 20 ms. El dev lo corrió con 'cd ~/Workspace/uplanner/sandbox-api && ' adelante, desde la raíz de sandbox-api como pide el plan.
  - **F1.c2** Suite existente (`test:user-api`) sin fallos nuevos respecto de la línea base de F0.9. → Nueva corrida del 2026-10-02 sobre los commits 60b366a y 824d2f2 de user-api: 44 tests (29 del helper y 15 de la línea base), 43 passing y 1 failing. El único fallo es el preexistente de F0.9 (server/api/user-api/test/userdetail.test.js:14). Sin fallos nuevos. Reemplaza la corrida anterior a los últimos cambios. · ejecutó: dev, `MARIADB_TEST_USERNAME="$(node -p "require('./server/config/local.env.js').MARIADB_USERNAME")" MARIADB_TEST_PASSWORD="$(node -p "require('./server/config/local.env.js').MARIADB_PASSWORD")" docker run --rm -v "$PWD":/w -w /w -e NODE_ENV=test -e MARIADB_TEST_HOST=host.docker.internal -e MARIADB_TEST_PORT=5500 -e MARIADB_TEST_DATABASE=suite_dev -e MARIADB_TEST_USERNAME -e MARIADB_TEST_PASSWORD node:10.24.1-alpine3.11 sh -c 'node -e "var n=require(\"net\");n.createServer(function(c){var u=n.connect(6379,\"host.docker.internal\");c.pipe(u).pipe(c);u.on(\"error\",function(){c.destroy()});c.on(\"error\",function(){u.destroy()})}).listen(6379,\"127.0.0.1\")" & sleep 1; node node_modules/.bin/mocha --opts server/test/mocha-opts/mocha.user.opts'`, salida 1, 43 passing (19 s), 1 failing (userdetail.test.js:14, preexistente); código de salida 1. El dev lo corrió con 'cd ~/Workspace/uplanner/sandbox-api && ' adelante.
  - **F1.c3** `node --check` de `logMaskingConfig.js` y `logSanitizer.js` sin errores en la imagen de producción (Node 10). → Nueva corrida del 2026-10-02 sobre el commit 60b366a de user-api: node --check sin errores en server/api/user-api/helpers/logMaskingConfig.js y server/api/user-api/helpers/logSanitizer.js en node:10.24.1-alpine3.11. Reemplaza la corrida anterior a la exclusión de tipo_documento y al ajuste de estilo. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 sh -c 'node --check server/api/user-api/helpers/logMaskingConfig.js && node --check server/api/user-api/helpers/logSanitizer.js'`, salida 0, 2 archivos revisados, 0 errores, exit=0. El dev lo corrió con 'cd ~/Workspace/uplanner/sandbox-api && ' adelante y '; echo "exit=$?"' al final.
  - **F1.c4** Dos commits separados según uplanner/rules/COMMITS.md: `USUITE-15425 feat:` solo con el helper (`logMaskingConfig.js` y `logSanitizer.js`) y `USUITE-15425 test:` solo con sus tests y los fixtures de F0.8. → 2026-10-02, user-api · USUITE-15425-logs-auth-seguros: 2 commits sobre origin/develop. 60b366a 'USUITE-15425 feat: agregar helper de ofuscación de datos sensibles para logs de autenticación' toca solo helpers/logMaskingConfig.js (313) y helpers/logSanitizer.js (396). 824d2f2 'USUITE-15425 test: agregar tests del helper de ofuscación de logs' toca solo test/helpers/logSanitizer.test.js (336) y 6 fixtures en test/helpers/fixtures/ (272). · ejecutó: dev, `git log --oneline --stat origin/develop..HEAD`, salida 0, 2 commits: feat con 2 archivos y 709 líneas, test con 7 archivos y 608 líneas. El dev lo corrió desde la raíz de sandbox-api como 'git -C server/api/user-api log ...', que es el mismo repo del plan.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Helper en dos archivos (logMaskingConfig.js y logSanitizer.js) y detección en texto en un tercero (logTextDetection.js): F1.c3 revisa los dos archivos con node --check, F1.c4 espera el commit feat con los dos archivos, F2.1 crea logTextDetection.js, F2.c2 busca lookbehind en todos los archivos de helpers/ y F8.1 documenta los cuatro archivos. Regla de niveles B (tercio con tope): el T10 espera jperez como jper** y F1.1 y F1.8 citan la decisión en el KB.. Motivo: Decisión del dev el 2026-10-02 (decision-niveles-y-archivos-helper.md): con una regla fija los valores cortos quedaban casi ocultos completos; la regla B escala con el largo y coincide con la tabla de niveles del plan. Un solo archivo superaba el límite de unas 400 líneas por archivo.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F1 cerrada el 2026-10-02. Helper de ofuscación en dos archivos de user-api (helpers/logMaskingConfig.js y helpers/logSanitizer.js): catálogo por estrategia, regla de niveles B (tercio con tope), lectura y validación de LOG_MASKING con un único aviso, avisos de protección reducida, recorrido recursivo con todas las garantías del plan, maskValue y createSanitizer. tipo_documento queda fuera de id en el catálogo base. Tests T1 a T29 con fixtures anonimizados. Commits 60b366a (feat) y 824d2f2 (test), sin push. Validado sobre esos commits: 29 passing del helper, node --check exit 0 en Node 10 y suite existente con 43 passing y el único fallo preexistente. Estilo ajustado a mano según .eslintrc.js (eslint no está instalado). Pendiente para F2: correos dentro de textos (SAML claims/name, mensaje de univalle, URL de axios).. Siguiente: Iniciar F2 (detección de datos dentro de texto en helpers/logTextDetection.js) el 2026-10-02.

### F2. Detección de datos dentro de texto

**Meta:** que las claves, correos y (opcionalmente) RUT que vienen **dentro de un texto** (XML, cadenas `clave=...`, JSON serializado, comandos `curl`, mensajes libres) también se oculten, no solo los que vienen como campo con nombre.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,75 a 1 día.

**Registro F2** (estado: Hecho)
- **Fecha real:** inicio 2026-10-02 · fin 2026-10-02
- **Antes de empezar:**
  - [x] F2.pre1: Registro de F1 completo y T1 a T29 en verde. (F1 cerrada el 2026-10-02 (evento phase_closed de F1) con T1 a T29 en verde sobre los commits 60b366a y 824d2f2 (registro de F1.c1).)
  - [x] F2.preR: Rama de trabajo al día en user-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo. (2026-10-02, tras git fetch origin en user-api: '## USUITE-15425-logs-auth-seguros' sin 'behind' y git log HEAD..origin/develop con 0 commits.)
- **Commits:**
  - `b3cc26f` · USUITE-15425 feat: ocultar claves, correos y RUT dentro de textos en los logs · user-api/USUITE-15425-logs-auth-seguros (verificado)
  - `3d25f1b` · USUITE-15425 test: agregar tests de la detección de datos dentro de textos · user-api/USUITE-15425-logs-auth-seguros (verificado)
- **Qué se hizo:**
  - **F2.1** → Código de F2 commiteado con OK del dev (sin push): detección en texto en el archivo nuevo, con la decisión B del XML (cada etiqueta se oculta según la estrategia de su nombre), integración en logSanitizer.js y carga de configuración y avisos en logMaskingConfig.js. Este commit también contiene F2.2, F2.3 y F2.4.. Dónde: user-api, rama USUITE-15425-logs-auth-seguros: helpers/logTextDetection.js (79 líneas nuevas), helpers/logSanitizer.js y helpers/logMaskingConfig.js (160 líneas agregadas, 31 quitadas). Cómo se comprobó: 36 passing en la corrida del agente del 2026-10-02 sobre el código de este commit, con T30 comprobando el XML completo de uvmcl; node --check sin errores en los 3 archivos en node:10.24.1-alpine3.11. Las comprobaciones del dev se registran en F2.5, F2.c1 y F2.c2.
  - **F2.2** → textDetection.email: cada correo dentro de un texto sin estrategia se oculta con el nivel configurado de email (por defecto light); cubre el mensaje de univalle y el atributo SAML .../claims/name.. Dónde: helpers/logTextDetection.js (EMAIL_IN_TEXT) y helpers/logSanitizer.js (maskEmail pasado al detector). Cómo se comprobó: T33 (incluido nivel medium) y T28 en verde en la corrida del agente del 2026-10-02.
  - **F2.3** → textDetection.id, apagado por defecto: RUT con formato y verificador (18.456.789-K o 18456789-K) dentro de texto, ocultado con el nivel de id; un número sin guion no se toca.. Dónde: helpers/logTextDetection.js (RUT_IN_TEXT) y helpers/logSanitizer.js (maskFormattedRut pasado al detector). Cómo se comprobó: T34 apagado y encendido en verde en la corrida del agente del 2026-10-02.
  - **F2.4** → El texto se corta por maxTextLength antes de la detección; las expresiones son fijas, sin lookbehind ni funciones posteriores a Node 10 (sin matchAll ni flags nuevos).. Dónde: helpers/logSanitizer.js (truncate antes de detectText) y helpers/logTextDetection.js. Cómo se comprobó: T35 en verde y grep -nE '\(\?<[=!]' sobre helpers/*.js sin coincidencias (código de salida 1) en la corrida del agente del 2026-10-02; node --check sin errores en los 3 archivos en node:10.24.1-alpine3.11.
  - **F2.5** → Tests T30 a T36 de la detección en texto escritos y en verde, con T14 y T28 de F1 ajustados al comportamiento nuevo; T30 comprueba el XML completo de uvmcl con la estrategia por nombre de etiqueta.. Dónde: user-api: test/helpers/logTextDetection.test.js (nuevo) y test/helpers/logSanitizer.test.js. Cómo se comprobó: Salida de mocha impresa al dev el 2026-10-02 sobre los commits b3cc26f y 3d25f1b: 36 passing (25 ms), sin fallos. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha "server/api/user-api/test/helpers/**/*.test.js"`, salida 0, 36 passing (29 de logSanitizer y 7 de logTextDetection), 0 failing, 25 ms. El dev lo corrió con 'cd ~/Workspace/uplanner/sandbox-api && ' adelante.
- **Criterios cumplidos:**
  - **F2.c1** T1 a T36 en verde en Docker con la imagen de producción (F2 no rompe F1). *Evidencia:* conteo de mocha. → 2026-10-02, sandbox-api en node:10.24.1-alpine3.11 sobre los commits b3cc26f y 3d25f1b de user-api: server/api/user-api/test/helpers/logSanitizer.test.js (T1 a T29) y logTextDetection.test.js (T30 a T36) en verde; F2 no rompe F1. · ejecutó: dev, `docker run --rm -v "$PWD":/w -w /w node:10.24.1-alpine3.11 node node_modules/.bin/mocha "server/api/user-api/test/helpers/**/*.test.js"`, salida 0, 36 passing, 0 failing, 25 ms.
  - **F2.c2** Ninguna expresión regular con lookbehind (`(?<=`, `(?<!`) en los archivos del helper: `grep -nE '\(\?<[=!]' server/api/user-api/helpers/*.js` sin resultados. → 2026-10-02, sandbox-api sobre el commit b3cc26f de user-api: grep sin coincidencias de lookbehind en server/api/user-api/helpers/logMaskingConfig.js, logSanitizer.js y logTextDetection.js. · ejecutó: dev, `grep -nE '\(\?<[=!]' server/api/user-api/helpers/*.js`, salida 1, 0 coincidencias en 3 archivos, exit=1. El dev lo corrió con 'cd ~/Workspace/uplanner/sandbox-api && ' adelante y '; echo "exit=$?"' al final.
  - **F2.c3** Dos commits propios según COMMITS.md: `feat` solo con la detección en texto y `test` solo con T30 a T36. → 2026-10-02, user-api · USUITE-15425-logs-auth-seguros: 4 commits sobre origin/develop. F2: b3cc26f feat toca solo helpers/ (logMaskingConfig.js, logSanitizer.js, logTextDetection.js; 160+ 31-) y 3d25f1b test toca solo test/helpers/ (logSanitizer.test.js, logTextDetection.test.js; 81+ 2-). F1: 60b366a feat y 824d2f2 test. · ejecutó: dev, `git log --oneline --stat origin/develop..HEAD`, salida 0, 4 commits: 2 de F1 y 2 de F2; el feat de F2 con 3 archivos y el test con 2. El dev lo corrió desde la raíz de sandbox-api como 'git -C server/api/user-api --no-pager log ...', el mismo repo del plan.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Los commits de F1 no quedaron asociados a ninguna tarea en el registro (campo commits vacío; las métricas muestran 0 commits en F1). Son 60b366a 'USUITE-15425 feat: agregar helper de ofuscación de datos sensibles para logs de autenticación' (helpers/logMaskingConfig.js, helpers/logSanitizer.js) y 824d2f2 'USUITE-15425 test: agregar tests del helper de ofuscación de logs' (test/helpers/), repo user-api, rama USUITE-15425-logs-auth-seguros, sin push. Constan como evidencia en el registro de F1.c4.. Por qué: Omisión del agente al registrar F1; Kanai no admite registros nuevos en una fase cerrada, así que se deja constancia en la fase actual.. Cambia la decisión: Desde F2 cada commit se asocia con su SHA, repo y rama a la tarea que lo produjo.
- **Hallazgos:**
  - introducido · server/api/user-api/helpers/logSanitizer.js (findStrategy): Al integrar la detección en texto, un campo con exclusión global (exclude/excludePatterns) quedaba sin estrategia y la detección le ocultaba los correos de su texto, contra la regla 'deja visibles esos campos en cualquier estrategia'. Lo detectó T15. Corregido el 2026-10-02: los campos con exclusión global reciben la estrategia interna VISIBLE (nivel none, sin revisar el texto por dentro).
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F2 cerrada el 2026-10-02. Detección de datos dentro de textos en helpers/logTextDetection.js, aplicada solo a textos sin estrategia por nombre (decisión A): dentro de un XML cada etiqueta se oculta según la estrategia de su nombre (decisión B), claves de block en formularios, JSON serializado (también escapado), curl -u y Bearer/Basic, correos con el nivel de email y RUT con formato si textDetection.id está encendido. Hallazgo introducido y corregido: los campos con exclusión global se ocultaban por la detección (T15). Carga de LOG_MASKING y avisos movidos a logMaskingConfig.js. Commits b3cc26f (feat) y 3d25f1b (test), asociados a F2.1 y F2.5 y verificados; sin push. Validado: 36 passing, 0 coincidencias de lookbehind, commits separados. Los commits de F1 (60b366a y 824d2f2) quedaron registrados como desvío en esta fase porque Kanai no admite registros en una fase cerrada.. Siguiente: Iniciar F3 (función de log authLog.js) el 2026-10-02.

### F3. Función de log authLog.js

**Meta:** una única función de log para todo el módulo de autenticación que sanitiza siempre, escribe en el logger de siempre con niveles visibles (`info`, `warn`, `error`), reenvía los errores a Sentry ya sanitizados y nunca rompe el login.
**Responsable sugerido:** dev del ticket.
**Esfuerzo:** 0,5 días.

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.pre1: Registro de F2 completo y T1 a T36 en verde.
  - [ ] F3.preR: Rama de trabajo al día en user-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: `info`, `warn`, `error`: sanitizan y llaman al logger global con 2 argumentos y los datos en `{ data }`.
  - **F3.2** pendiente: `error` reenvía a Sentry mensaje y error sanitizados, si Sentry está disponible.
  - **F3.3** pendiente: `try/catch` general: ante falla escribe un log mínimo (`'authLog error'`) y no propaga.
  - **F3.4** pendiente: JSDoc completo (contenido en F8.1).
  - **F3.5** pendiente: Tests T37 a T42 (`authLog.test.js`).
- **Criterios cumplidos:**
  - **F3.c1** pendiente (command): T1 a T42 en verde en Docker con la imagen de producción. *Evidencia:* conteo de mocha.
  - **F3.c2** pendiente (command): Dos commits propios según COMMITS.md: `feat` solo con `authLog.js` y `test` solo con T37 a T42.
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
  - [ ] F4.pre2: Rama de trabajo al día en user-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.0** pendiente: Línea base del archivo: contar y ubicar los `console.*`, `logger.*` y `Sentry.capture*` de `loginServices.js` y confirmar que las líneas que nombra F4 (`:70`, `:91`, `:211`, `:243`, `:247`, `:291`, `:727`, `:815`) siguen siendo esas. *Responder:* conteo y, si alguna línea se movió, registrar un desvío del plan con la línea nueva.
  - **F4.1** pendiente: `:243` → `authLog.info('Login user response', { user: maskValue(name, 'email'), result })`.
  - **F4.2** pendiente: `:815` `console.log(response, result)` → `authLog.warn`.
  - **F4.3** pendiente: `:211` y `:247`: sin `error: err` en la respuesta al navegador (solo mensaje y código); Sentry vía `authLog.error`.
  - **F4.4** pendiente: `:291` `Session data`, `:727` `HACIENDO LOGIN CON USER`, `:70` y `:91` (POST, hoy `silly`) → `authLog.info`.
  - **F4.5** pendiente: Resto de `console.*` y `Sentry.capture*` del archivo, con el criterio D1.
- **Criterios cumplidos:**
  - **F4.c1** pendiente (command): Cero `console.*`, `logger.*` directos y `Sentry.capture*` en `loginServices.js` (el mismo `grep` de F4.0 devuelve `0`). *Evidencia:* conteo antes → después.
  - **F4.c2** pendiente (manual): Smoke local (F7) con el fixture de uvmcl sin la clave visible.
  - **F4.c3** pendiente (command): Tests del helper (T1 a T42) en verde y suite existente sin fallos nuevos respecto de la línea base de F0.9.
  - **F4.c4** pendiente (command): Un commit solo con este archivo.
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
  - [ ] F5.pre2: Rama de trabajo al día en user-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.0** pendiente: Línea base del chequeo estático: cantidad de `console.*`, `logger.*` y `Sentry.capture*` por archivo de user-api (fuera de `helpers/` y `test/`). *Responder:* tabla archivo → cantidad.
  - **F5.1** pendiente: `authentication/auth.js` · Se elimina `decripted pw` (`:762`); los `silly` del autologin pasan a `info`; errores TOKEN (`:808-845`) por `authLog.error`; bloques AD (`:163-197`) consolidados en un log por intento; `wso2oidCallback` (`:519`) con `req.user` sanitizado
  - **F5.2** pendiente: `multiAuth/ad.js` · Bloques AD consolidados
  - **F5.3** pendiente: `multiAuth/azureSaml.js` · Pasa a `authLog` (perfil SAML en `:31`)
  - **F5.4** pendiente: `multiAuth/openIdConnect.js` · Pasa a `authLog`
  - **F5.5** pendiente: `index.js` · `user->` (`:482`) y errores de rutas de auth
  - **F5.6** pendiente: `services.js` · `getUserInfo` (`:1149-1152`, `:1188-1190`): el `users->` que aparece en casi todos los clientes
  - **F5.7** pendiente: `custom/ucalTls.js`, `userInfoMethod/ldap.js`, `userInfoMethod/userInfoMethod1.js` · Conversión con criterio D1 (un commit por archivo)
  - **F5.8** pendiente: `seeds/seeds.js`, `seeds/seed-helper.js` · Conversión; confirmar que no se loguea `cas_userinfo.pass`
- **Criterios cumplidos:**
  - **F5.c1** pendiente (command): Chequeo estático de F7 en cero. *Evidencia:* tabla archivo → conteo antes → conteo después.
  - **F5.c2** pendiente (command): Tests del helper en verde y suite existente sin fallos nuevos respecto de la línea base (se corre después de cada archivo convertido).
  - **F5.c3** pendiente (manual): Smoke local con los fixtures de cada proveedor sin datos sensibles visibles.
  - **F5.c4** pendiente (command): Un commit por archivo (se lista cada SHA en el registro con su archivo).
  - **F5.c5** pendiente (manual): Login local en la app levantada (ver ambiente-local.md#login-local-como-validacion-decidido-el-2026-10-02): login correcto y login con clave incorrecta, con la app reiniciada después de los archivos convertidos. *Evidencia:* fecha, usuario de prueba (sin clave), resultado de cada login y extracto del log de consola sin claves ni tokens, con correos e identificadores según su nivel. No reemplaza los tests en Docker ni la QA de uvmcl.
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
  - [ ] F6.pre2: Rama de trabajo al día en sandbox-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo.
  - [ ] F6.pre3: Resultado de F0.1 a mano, si se obtuvo. Si F0.1 quedó como "No aplica" (sin acceso a Sentry o Sentry fuera de uso), se avanza igual: el filtro de F6 se aplica de todos modos.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Extender el `beforeSend` existente: sanitizar `event.request.data`, `request.headers`, `request.cookies`, `extra` y `contexts`.
  - **F6.2** pendiente: Rama con Sentry deshabilitado: el evento que hoy se imprime con `console.error` se imprime sanitizado por el logger.
  - **F6.3** pendiente: `require` protegido del helper de `user-api`: si no está disponible, se descarta `request.data` en vez de enviarlo o imprimirlo.
  - **F6.4** pendiente: Hallazgo preexistente, **se consulta antes de tocarlo**: `const { message } = hint.originalException` lanza si no hay excepción (p. ej. `captureMessage`). *Responder:* a quién se consultó y qué se decidió.
  - **F6.5** pendiente: Tests T43 (evento con `password` en `request.data` y en `extra`), T44 (helper no disponible: `request.data` descartado), T45 (Sentry deshabilitado: salida sanitizada).
- **Criterios cumplidos:**
  - **F6.c1** pendiente (evidence): T43 a T45 en verde en Docker con la imagen de producción. *Evidencia:* comando usado y conteo de mocha.
  - **F6.c2** pendiente (command): Suite existente sin fallos nuevos respecto de la línea base de F0.9 (F6 toca el arranque de la app).
  - **F6.c3** pendiente (command): Dos commits propios en `sandbox-api` según COMMITS.md: `fix` solo con `server/app.js` y `test` solo con T43 a T45.
  - **F6.c4** pendiente (manual): Login local en la app levantada con el server/app.js nuevo (ver ambiente-local.md#login-local-como-validacion-decidido-el-2026-10-02): la app arranca sin errores nuevos, login correcto y login con clave incorrecta funcionan, y el log de consola no muestra claves ni tokens. *Evidencia:* fecha, resultado de cada login y extracto del log. Antes del commit, descartar la inyección de gulp en server/app.js y server/routes.js y el ajuste local del pool.
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
  - **F7.4** pendiente: Revisar las tres salidas: sin claves visibles, correos e identificadores según nivel, nombres y códigos según config, sin excepciones. Guardar las tres salidas en el KB del caso como un documento de tipo registro (`smoke-f7.md`) y citar ese nombre en el registro de la tarea.
- **Criterios cumplidos:**
  - **F7.c1** pendiente (command): Los tres `grep` de F7.1 en `0`. *Evidencia:* salida literal (vacía) y conteo.
  - **F7.c2** pendiente (command): `node --check` sin errores en todos los archivos modificados (comando de F7.2). *Evidencia:* lista de archivos revisados y salida del comando.
  - **F7.c3** pendiente (evidence): Las tres salidas del smoke guardadas en el KB del caso (`smoke-f7.md`) y revisadas, con una línea por escenario: qué se esperaba y qué salió.
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
  - [ ] F8.preR: Rama de trabajo al día en user-api y sandbox-api: tras `git fetch origin`, `git status -sb` sin "behind" y `git log --oneline HEAD..origin/develop` vacío (si la base avanzó, integrarla y volver a correr los tests). Evidencia: esa salida por repo.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F8.1** pendiente: **JSDoc** en `logMaskingConfig.js`, `logSanitizer.js`, `logTextDetection.js` y `authLog.js` (descripciones en español):
  - **F8.2** pendiente: **Guía `server/api/user-api/helpers/LOGGING.md`:**
  - **F8.3** pendiente: **Plantilla de ejemplo** `sandbox-api/server/config/local.env.sample.backend.js`: bloque `LOG_MASKING` comentado con los defaults y `loggerLevel: 'info'`, con un comentario que apunte a la guía.
  - **F8.4** pendiente: **KB del caso:** si el comportamiento final cambió respecto del análisis, agregar al KB del caso un documento de tipo decisión o revisión con lo que cambió y por qué. No se edita plan-original.md (copia congelada del import).
- **Criterios cumplidos:**
  - **F8.c1** pendiente (command): `npx jsdoc -c jsdoc.json server/api/user-api/helpers -d /tmp/usuite-15425-jsdoc` sin errores ni advertencias y con los `@typedef` en la salida (puede correr con el Node del host). *Evidencia:* salida del comando.
  - **F8.c2** pendiente (evidence): `LOGGING.md` revisado por otra persona del equipo. *Evidencia:* quién revisó, fecha y observaciones atendidas.
  - **F8.c3** pendiente (command): Commits de documentación en `user-api` y `sandbox-api`.
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
**Responsable sugerido:** dev del ticket. El despliegue en QA y producción lo hace quien despliega y lo informa (queda en despliegue-uvmcl.md del KB del caso).
**Esfuerzo:** 0,75 a 1 día.
**Cómo deshacerla:** En cada repo afectado, PR con `git revert -m 1 <SHA del merge>` a `develop` y, si ya llegó, otro a `master`; luego volver a desplegar en uvmcl la rama anterior (quien despliega). El cambio solo toca logs y no modifica datos, así que revertir no deja residuos.

**Registro F9** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F9.pre1: Registros de F0 a F8 completos (fases cerradas).
  - [ ] F9.pre2: Si F0.2 dijo que uvmcl está en la línea secure: F10 se hace en paralelo y la QA de uvmcl se hace con lo de F10.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F9.1** pendiente: Antes de abrir los PR: `git fetch`, integrar lo último de `origin/develop` en las ramas 1 y 2 y volver a correr las dos suites. Después, PR de la rama 1 (`user-api`) y de la rama 2 (`sandbox-api`) a `develop`. *Responder:* salida de "Rama actualizada", resultado de las suites, enlace de cada PR, revisores y estado.
  - **F9.2** pendiente: Con `uvmcl-retention-qa` desplegado (lo informa quien despliega: fecha, ambiente y rama por repo; guardarlo en el KB del caso como documento de tipo registro `despliegue-uvmcl.md`), ejecutar Q1 a Q10 (evidencia: `kubectl logs` filtrado por `clave|password|Login user response|OCULTO` y, solo si hay acceso a Sentry y sigue en uso en el ambiente, el evento de Sentry; si no, "No aplica: <motivo>" en lo que toca a Sentry).
  - **F9.3** pendiente: PR de `develop` a `master` en cada repo, confirmando antes que `develop` solo suma este ticket respecto de `master` (`git log --oneline origin/master..origin/develop`). *Responder:* salida de ese comando, enlaces y SHA del merge.
- **Criterios cumplidos:**
  - **F9.c1** pendiente (evidence): Tests T1 a T45 en verde en la imagen de producción, chequeo estático en cero, `node --check` sin errores, smoke guardado, JSDoc sin errores y `LOGGING.md` revisado (de F1 a F8). *Evidencia:* referencia a los criterios registrados de F1 a F8.
  - **F9.c2** pendiente (evidence): Q1 a Q10 aprobados, cada uno con su evidencia.
  - **F9.c3** pendiente (evidence): PR a `master` mergeados en ambos repos. *Evidencia:* enlace de cada PR y SHA del merge.
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
**Responsable sugerido:** dev del ticket. Si la QA necesita un ambiente secure desplegado, lo hace quien despliega y queda en despliegue-uvmcl.md del KB del caso.
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
  - **F10.1** pendiente: `git fetch` y crear `USUITE-15425-logs-auth-seguros-secure` desde `origin/feature/secure-develop` actualizado en `user-api` y `sandbox-api`. Antes de aplicar commits, tomar la línea base de la suite existente en esta rama. *Responder* en el registro de la tarea: commit base por repo y la línea base (total, pasan, fallan, omitidos y fallos preexistentes). Se registra en el plan (registro validado), no en las tablas ni plantillas de plan-original.md: esa es la copia congelada del import y no se edita.
  - **F10.2** pendiente: `git cherry-pick -x` de los commits de la línea normal, en orden. Resolver conflictos archivo por archivo, conservando el comportamiento propio de secure (cookies `httpOnly`, logout con `req.jwt.userId`). *Responder:* por cada commit: SHA original → SHA en secure → con o sin conflicto → cómo se resolvió.
  - **F10.3** pendiente: Buscar logs que **solo existen en secure** (código de USUITE-12513 en `authentication/auth.js`, `index.js`, `loginServices.js`, `multiAuth/*`) y convertirlos en un commit propio de esta rama. *Responder:* archivo:línea de cada log convertido.
  - **F10.4** pendiente: Repetir en esta rama: tests T1 a T45 en Docker, suite existente comparada con **su** línea base (la de `feature/secure-develop`), chequeo estático de F7 en cero, `node --check` y smoke local.
  - **F10.5** pendiente: Antes del PR: `git fetch`, integrar lo último de `origin/feature/secure-develop` y volver a correr las suites. PR a `feature/secure-develop` → QA → PR a `feature/secure-master`, confirmando antes que `feature/secure-develop` solo suma este ticket respecto de `feature/secure-master`.
  - **F10.6** pendiente: QA en un ambiente de la línea secure: Q1 a Q3, Q5, Q8 y Q10 de F9, más el logout (las cookies se borran y no hay errores nuevos).
- **Criterios cumplidos:**
  - **F10.c1** pendiente (command): Chequeo estático en cero en la rama secure y tests T1 a T45 en verde.
  - **F10.c2** pendiente (evidence): QA de F10.6 aprobada con evidencia, incluido el logout.
  - **F10.c3** pendiente (evidence): PR a `feature/secure-master` mergeados en ambos repos. *Evidencia:* enlace de cada PR y SHA del merge.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
