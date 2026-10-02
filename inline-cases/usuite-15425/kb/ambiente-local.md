# Cómo levantar suite-api en local (Apple Silicon) y validar con login local

Verificado el 2026-10-02 en la máquina del dev (macOS, `arm64`).

## Node 10

- El Node 10 de `nvm` (`v10.24.1`) es un binario para Intel (`x86_64`). En Apple Silicon falla con `Bad CPU type in executable` si no está instalado **Rosetta 2**. No existe Node 10 nativo para `arm64` (empieza en Node 16).
- Solución: `softwareupdate --install-rosetta --agree-to-license` (lo ejecuta el dev). Con Rosetta, `node -p process.arch` da `x64` y el `node_modules` del repo carga sin cambios (el módulo nativo `bufferutil` también es `x86_64`).
- Esto sirve para levantar la app. **Los tests y el `node --check` del plan siguen en Docker** con la imagen de producción `node:10.24.1-alpine3.11`: el Node local corre en macOS, no en Alpine.

## Base de datos

- La base se elige con el bloque activo de `local.env.js` (los demás quedan comentados). No hace falta MariaDB local: cada bloque usa un túnel SSM de AWS en `localhost`.
- Túneles abiertos en la máquina del dev (2026-10-02): **5500** develop (`mariadb-cl-develop`), **5501** QA (`mariadb-5-qa`), **5502** QA de Chile (`mariadb-cl-qa`, donde vive `uvmcl_retention_qa`), **5503** QA de México (`mariadb-mx-qa`) y **5504 producción** (`mariadb-cl`). Si se cambia el puerto, revisar que no quede en 5504.
- Desde las 09:10 del 2026-10-02 el bloque activo es `uvmcl_retention_qa` por el 5502, con `LOGIN_INTEGRATION: 'WSDL'`. El login local que funcionó ese día fue contra esa base.
- El usuario de la base tiene `max_user_connections = 5`. La app abre más: el pool principal llega a 5 por sí solo, y `rosario-api-prod` e `integration-api` crean sus propias conexiones a la misma base. Síntoma en el login: `ER_USER_LIMIT_REACHED` al cargar permisos (`user-api/seeds/seed-helper.js:282`).
- Ajuste local aplicado: `server/config/environment/development.js`, pool de la base MariaDB `max: 5` → `max: 3`. Con eso el login funciona. **Es un cambio local: no se commitea** (queda en un stash, "local: pool mariadb max 3"). La solución de fondo es pedir que suban el límite del usuario.
- La suite existente (`NODE_ENV=test`) no usa este bloque: lee `MARIADB_TEST_DATABASE`, `MARIADB_TEST_HOST` y `MARIADB_TEST_PORT` (`server/config/environment/test.js`), que no están en `local.env.js`. En Docker se pasan con `-e`, y el host es `host.docker.internal` en vez de `localhost`. El usuario y la clave sí salen del bloque activo.

## Lo que modifica `npm start`

- La tarea `default` de gulp corre `inject:router` e `inject:helper`, que **reescriben `server/routes.js` y `server/app.js`** agregando un `require` / `app.use` por cada API presente en `server/api/` (unas 169 y 32 líneas). Su propio watcher reinicia el servidor una vez a los pocos segundos.
- `server/app.js` es el archivo que este ticket cambia en F6. Antes de crear ramas o commitear: `git checkout -- server/app.js server/routes.js` para descartar la inyección, y revisar `git status` para que tampoco entre el ajuste del pool.
- Avisos esperables al arrancar, ajenos al ticket: `JSON.parse` de la configuración `textField` (`core-api/config/config.js:65`), S3 sin credenciales (sigue sin almacenamiento), `express-validator` y SDK de AWS v2.

## Pasos

1. Abrir el túnel del bloque activo de `local.env.js` (hoy, el 5502).
2. Si hace falta, aplicar el ajuste del pool: `git stash apply` del stash "local: pool mariadb max 3".
3. Desde la raíz de `sandbox-api`: `nvm use 10` y `npm start`.
4. La app queda en el puerto 9000, en modo development.
5. Al terminar: bajar la app y descartar la inyección de gulp antes de cualquier operación de git.

## Login local como validación (decidido el 2026-10-02)

- Se usa como **complemento** en F5 y F6 (criterio formal en el plan): login correcto y login con clave incorrecta, y revisar que la consola no muestre claves ni tokens, y que correos e identificadores salgan según su nivel.
- Valida la integración real (rutas, `require`, logger global, filtro de Sentry en `app.js`) que los tests aislados no cubren.
- **No reemplaza** la QA de uvmcl de F9 ni el runtime exacto de producción. Qué tipo de login recorre depende del bloque activo de `local.env.js` (hoy WSDL de uvmcl); SAML, OIDC o AD solo si están configurados en local.
- Ejemplo real visto el 2026-10-02: el log `users->` imprime correo, nombre completo y datos del usuario sin ocultar. Es uno de los logs que convierte F5 y sirve de modelo para los fixtures de F0.8.
