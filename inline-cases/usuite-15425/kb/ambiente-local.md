# Cómo levantar suite-api en local (Apple Silicon) y validar con login local

Verificado el 2026-10-02 en la máquina del dev (macOS, `arm64`).

## Node 10

- El Node 10 de `nvm` (`v10.24.1`) es un binario para Intel (`x86_64`). En Apple Silicon falla con `Bad CPU type in executable` si no está instalado **Rosetta 2**. No existe Node 10 nativo para `arm64` (empieza en Node 16).
- Solución: `softwareupdate --install-rosetta --agree-to-license` (lo ejecuta el dev). Con Rosetta, `node -p process.arch` da `x64` y el `node_modules` del repo carga sin cambios (el módulo nativo `bufferutil` también es `x86_64`).
- Esto sirve para levantar la app. **Los tests y el `node --check` del plan siguen en Docker** con la imagen de producción `node:10.24.1-alpine3.11`: el Node local corre en macOS, no en Alpine.

## Base de datos

- `local.env.js` apunta la base principal a `localhost:5500`. En ese puerto escucha el túnel SSM de AWS hacia la base **de develop** (`mariadb-cl-develop`). No hace falta MariaDB local.
- Hay otros túneles abiertos en la misma máquina: 5501 a 5503 son QA y **5504 es producción** (`mariadb-cl`). Si se cambia el puerto en `local.env.js`, revisar que no quede en 5504.
- El usuario de la base tiene `max_user_connections = 5`. La app abre más: el pool principal llega a 5 por sí solo, y `rosario-api-prod` e `integration-api` crean sus propias conexiones a la misma base. Síntoma en el login: `ER_USER_LIMIT_REACHED` al cargar permisos (`user-api/seeds/seed-helper.js:282`).
- Ajuste local aplicado: `server/config/environment/development.js`, pool de la base MariaDB `max: 5` → `max: 3`. Con eso el login funciona. **Es un cambio local: no se commitea.** La solución de fondo es pedir que suban el límite del usuario en develop.

## Lo que modifica `npm start`

- La tarea `default` de gulp corre `inject:router` e `inject:helper`, que **reescriben `server/routes.js` y `server/app.js`** agregando un `require` / `app.use` por cada API presente en `server/api/` (unas 169 y 32 líneas). Su propio watcher reinicia el servidor una vez a los pocos segundos.
- `server/app.js` es el archivo que este ticket cambia en F6. Antes de crear ramas o commitear: `git checkout -- server/app.js server/routes.js` para descartar la inyección, y revisar `git status` para que tampoco entre el ajuste del pool.
- Avisos esperables al arrancar, ajenos al ticket: `JSON.parse` de la configuración `textField` (`core-api/config/config.js:65`), S3 sin credenciales (sigue sin almacenamiento), `express-validator` y SDK de AWS v2.

## Pasos

1. Abrir el túnel de develop (puerto 5500).
2. Desde la raíz de `sandbox-api`: `nvm use 10` y `npm start`.
3. La app queda en el puerto 9000, en modo development.
4. Al terminar: bajar la app y descartar la inyección de gulp antes de cualquier operación de git.

## Login local como validación (decidido el 2026-10-02)

- Se usa como **complemento** en F5 y F6 (criterio formal en el plan): login correcto y login con clave incorrecta, y revisar que la consola no muestre claves ni tokens, y que correos e identificadores salgan según su nivel.
- Valida la integración real (rutas, `require`, logger global, filtro de Sentry en `app.js`) que los tests aislados no cubren.
- **No valida** el login de uvmcl (usa su servicio web propio; se cubre con los fixtures y en la QA de F9), ni el runtime exacto de producción, ni SAML, OIDC o AD salvo que estén configurados en local.
- Ejemplo real visto el 2026-10-02: el log `users->` imprime correo, nombre completo y datos del usuario sin ocultar. Es uno de los logs que convierte F5 y sirve de modelo para los fixtures de F0.8.
