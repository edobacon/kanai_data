---
id: TV2-004-SPEC
project: tao-v2
ticket: TV2-004
status: approved
---

# TV2-004 B0-02: backend aislado y verificable con comandos backend:prepare/up/verify/down, stack Compose parametrizado y reporte funcional por alcance

## Resumen ejecutivo

Qué se hace: se agregan al package.json raíz los scripts backend:prepare, backend:up, backend:verify y backend:down (contrato C-comandos-backend con TV2-005), armados con las piezas que ya existen (dev:services, db:migrate:deploy, db:seed, dev, test) y fijados a Node 24 por .nvmrc. Además se renombra compose.yaml a tao-v2, se parametrizan nombres de contenedor, volumen y puertos para cada corrida, se agrega generate:server (solo prisma generate) y backend:verify pasa a ser un gate: falla si falta PostgreSQL, worker o correo y también si alguna suite de integración tiene omitidas (las lista, usando como insumo docs/product/v3/matriz-evidencia-v1.md de TV2-003). Se agregan el archivo de operaciones activas, una prueba que lo cruza con las rutas montadas y una prueba de respuestas contra el schema (incluye los x-errores declarados).
Qué NO se hace: no hay Postman (D-04), no se crean cuentas ADM-1/PRD (eso llega con B1-04, aquí solo se prepara el mecanismo), no se tocan el stack legacy ni la base de desarrollo, no cambia el modelo de datos y no entra nada de 21-extensiones-v1.
Cómo se sabe que funciona: desde un checkout limpio, prepare, up, verify y down terminan en verde. Con el legacy corriendo en 54329/1025/8025, dos corridas simultáneas usan nombres, puertos y bases distintos. verify sale con código distinto de cero y lista las suites si hay alguna omitida o si se apaga postgres, worker o mailpit. Ninguna aceptación se da por cerrada con un doble que siempre devuelve éxito.
Tamaño: 3 sesiones (T2, T2, T2), 9 tareas de primer nivel. Cabe en el techo de entrada. ADVERTENCIA: es probable que la paridad de entorno de la batería dev (ci-pr.yml:156-164) y el devcontainer (.devcontainer/start-services.sh:3) dependan de los nombres fijos actuales, así que se revisan como consumidores.
Datos a confirmar antes de ejecutar: (1) nombre de las variables de corrida (propuesta: TAO_RUN_ID para el sufijo de proyecto/contenedor/volumen y TAO_PG_PORT/TAO_SMTP_PORT/TAO_MAIL_UI_PORT para los puertos), confirmar contra compose.yaml y .env.example:6/10; (2) dónde vive el reporte por alcance, server/ o scripts/dev/ (riesgo abierto del request; el plan propone server/test/scope/ para reusar Vitest y Supertest); (3) ruta del CSV de operaciones de V3 que sirve de base (docs/product/v3/, confirmar el nombre exacto); (4) nombre del filtro pnpm del paquete server y su directorio de tests de integración; (5) cómo se identifica el worker (proceso aparte o servicio en compose) para el chequeo de salud; (6) ruta del schema Prisma para generate:server; (7) runner de las pruebas de scripts/dev (node --test, igual que scripts/ci/*.test.mjs).

## Requirements

### REQ-01 `inferred`
> Fuente: Request B0-02, Alcance; Adenda 1, puntos 2 y 6

El package.json raíz expone backend:prepare (instala dependencias con pnpm install --frozen-lockfile --ignore-workspace en server/, corre generate:server, levanta los servicios aislados, aplica db:migrate:deploy y db:seed sobre la base de la corrida), backend:up (arranca el servidor y el worker, este último como proceso separado sin HTTP con pnpm worker, server/src/worker.ts, y guarda su pid en el estado de la corrida, ambos apuntando a esa corrida), backend:verify (gate) y backend:down (detiene el worker por su pid y borra solo los contenedores y el volumen de la corrida). Los cuatro validan que el Node activo coincida con .nvmrc (24) y, si no coincide, abortan con un mensaje explícito. Es el contrato C-comandos-backend que consume TV2-005.

### REQ-02 `inferred`
> Fuente: Request B0-02, Alcance; Adenda 1, punto 4

compose.yaml se renombra a tao-v2 y deja de fijar nombres de contenedor (taomangalam-postgres, taomangalam-mailpit, taomangalam-toxiproxy, taomangalam-server), volumen y puertos publicados (54329, 1025, 8025). Cada corrida de backend:* usa un nombre de proyecto Compose propio, contenedores y volumen con sufijo de corrida, puertos libres resueltos al preparar, su propia base exclusiva y una cola y un buzón de correo vacíos. Los nombres de las variables de corrida quedan fijados: TAO_RUN_ID (identificador y sufijo de la corrida), TAO_PG_PORT (PostgreSQL), TAO_SMTP_PORT (SMTP de Mailpit) y TAO_MAIL_UI_PORT (interfaz de Mailpit). Una segunda corrida no colisiona con la primera ni toca la base de desarrollo ni el stack del repo legacy.

### REQ-03 `inferred`
> Fuente: tao-v2/docs/archivo-v1/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:234 (scripts de server/package.json)

Existe un script generate:server que corre solo prisma generate para el paquete server (sin Dart ni Java). Así se regenera src/generated/, que no está versionado, y alcanza para correr tests; pnpm generate queda tal como está.

### REQ-04 `inferred`
> Fuente: Request B0-02, Criterios de aceptación; Adenda 1, puntos 2 y 3

backend:verify es un gate. Falla con código distinto de cero si PostgreSQL, el worker o el correo (Mailpit) de la corrida no responden. El chequeo del worker lee el pid guardado por la corrida y verifica que el proceso siga vivo; sin worker vivo informa "falta worker". También falla si alguna suite de integración reporta omitidas mayor que cero; en ese caso lista archivo y nombre de cada suite omitida y las cruza con la lista de suites describe.skipIf del contrato C-matriz-evidencia (docs/product/v3/matriz-evidencia-v1.md), que es obligatorio para el cruce y cuya dependencia de TV2-003 está aceptada por la épica. El reporte final registra el SHA, el comando, los casos ejecutados, pasados y omitidos, sin contraseñas, tokens, OTP ni códigos completos.

### REQ-05 `inferred`
> Fuente: Request B0-02, Alcance; Adenda 1, puntos 1 y 5

Hay un archivo versionado de operaciones activas por alcance, derivado de docs/product/v3/backend_operaciones.csv (filas con releaseStatus=active más iniciarSesionWeb), y una prueba Vitest+Supertest en server/test/scope/ que lo cruza con las rutas montadas del servidor. Cada operación activa de docs/product/v3/backend_operaciones.csv responde algo distinto de 404 y su guarda de capacidad se resuelve. La prueba falla si una operación activa no está montada o si su capacidad no existe.

### REQ-06 `inferred`
> Fuente: Request TV2-004 (Alcance: validateResponses: false); contrato OpenAPI del server (ruta por confirmar)

Una prueba Vitest+Supertest valida contra el schema del contrato OpenAPI las respuestas reales de cada operación activa, tanto el éxito como los x-errores que el contrato declara para ella. Hoy validateResponses es false, así que nada compara las respuestas reales con el contrato.

### REQ-07 `confirmed` `enforcement`
> Fuente: Request TV2-004 (Alcance: Sin Postman D-04; ensamblando piezas existentes); tao-v2/.github/workflows/ci-pr.yml:292

Para la verificación se reutiliza lo que ya existe: Vitest y Supertest son la fuente de verdad (sin Postman, D-04). Los comandos backend:* llaman a los scripts que ya hay (dev:services, db:migrate:deploy, db:seed, dev, test) en lugar de duplicar su lógica. Ningún reporte ni documento escribe credenciales de las cuentas R09.

### REQ-08 `confirmed` `enforcement`
> Fuente: tao-v2/.github/workflows/ci-pr.yml:156-164; tao-v2/.env.example:6; tao-v2/.env.example:10

Los nuevos comandos y variables de corrida quedan documentados en docs/development/commands.md y en .env.example/server/.env.example. La batería dev comprueba que los comandos documentados existan y que los .env.example estén en paridad con compose.yaml, y tiene que seguir verde.
## Tasks

#### S1.T1 — Parametrizar compose.yaml. Renombrar el proyecto a tao-v2 y quitar los container_name fijos (taomangalam-postgres, taomangalam-mailpit, taomangalam-toxiproxy, taomangalam-server) y el nombre fijo del volumen; los puertos publicados (54329, 1025, 8025) pasan a variables con esos valores por defecto para desarrollo. Ajustar los consumidores .devcontainer/start-services.sh:3 y .devcontainer/README.md:16/20/38/44 para que el flujo de desarrollo siga funcionando, y agregar las variables a .env.example y server/.env.example.
Contrato: rollback: git revert del commit de compose.yaml, .devcontainer/ y .env.example; docker compose -p tao-v2-<id> down -v para borrar lo creado por la corrida.. Status: done

#### S1.T2 — Agregar el script generate:server al package.json raíz (y, si no existe, el equivalente en server/package.json) que ejecute solo prisma generate sobre el schema del paquete server, sin pasar por pnpm generate (que exige Dart y Java).
Contrato: rollback: Borrar las entradas generate:server de package.json y server/package.json (git revert).. Status: done

#### S1.T3 — Implementar backend:prepare, backend:up y backend:down en scripts/dev/ con su registro en el package.json raíz. Llaman a los scripts que ya existen (dev:services, db:migrate:deploy, db:seed, dev) y no duplican su lógica.
Contrato: rollback: git revert de scripts/dev/backend-*.mjs y de las entradas backend:* del package.json; backend:down manual o docker compose -p tao-v2-<id> down -v.. Status: done

#### S1.T3.1 — Módulo compartido scripts/dev/backend-run.mjs: lee .nvmrc (24) y aborta si process.version no coincide; resuelve el id de corrida (TAO_RUN_ID o uno generado) y el nombre de proyecto Compose tao-v2-{idCorrida}; busca puertos libres con un intento acotado (máximo 20 por servicio) y persiste el estado de la corrida en un archivo bajo un directorio ignorado por git.
Contrato: rollback: Borrar scripts/dev/backend-run.mjs (git revert).. Status: done

#### S1.T3.2 — backend:prepare: corre generate:server, levanta los servicios con dev:services usando el proyecto y los puertos de la corrida, crea la base exclusiva, aplica db:migrate:deploy y db:seed (cuentas R09 USR-A y USR-B; el mecanismo queda listo para ADM-1 y PRD, que llegan con B1-04) y vacía la cola y el buzón de Mailpit. Las contraseñas generadas no se imprimen.
Contrato: rollback: git revert de scripts/dev/backend-prepare.mjs; backend:down de la corrida.. Status: done

#### S1.T3.3 — backend:up y backend:down. up levanta el servidor (dev) y el worker contra la corrida y espera hasta que estén listos con un timeout acotado. down hace docker compose -p tao-v2-{idCorrida} down -v solo sobre la corrida y borra su archivo de estado, sin tocar otras corridas, el volumen de desarrollo ni los contenedores taomangalam-* del legacy.
Contrato: rollback: git revert de scripts/dev/backend-up.mjs y backend-down.mjs.. Status: done

#### S1.T4 — Pruebas y regresión de la sesión. scripts/dev/backend-run.test.mjs (node --test) cubre el guard de Node 24 contra .nvmrc, que dos ids den nombres de proyecto y volumen distintos y que la resolución de puertos evite 54329/1025/8025 cuando están ocupados. Además, prueba manual documentada de dos corridas simultáneas con el legacy arriba.
Contrato: rollback: Borrar scripts/dev/backend-run.test.mjs (git revert).. Status: done

#### S2.T1 — Implementar backend:verify (scripts/dev/backend-verify.mjs). Primero chequea la salud de PostgreSQL (conexión a la base de la corrida), del worker y de Mailpit (API HTTP de la corrida), con timeout acotado, y aborta nombrando la dependencia caída. Después corre el script test existente con el reporter JSON de Vitest apuntando a la corrida.
Contrato: rollback: git revert de scripts/dev/backend-verify.mjs y de la entrada backend:verify.. Status: pending

#### S2.T2 — Gate de suites omitidas. Parsear el reporte JSON de Vitest, contar las suites y pruebas omitidas de integración y, si hay más de cero, salir con código 1 listando archivo y suite, cruzadas con la lista describe.skipIf de docs/product/v3/matriz-evidencia-v1.md (contrato C-matriz-evidencia). Escribir el reporte de cierre con SHA, comando, totales ejecutados/pasados/omitidos y dependencias verificadas, enmascarando cualquier valor sensible.
Contrato: rollback: git revert de scripts/dev/backend-skip-gate.mjs.. Status: pending

#### S2.T3 — Documentar backend:prepare/up/verify/down y generate:server en docs/development/commands.md (variables de corrida, puertos por defecto y cómo convive con el legacy), para que la batería dev encuentre los comandos documentados.
Contrato: rollback: git revert de docs/development/commands.md.. Status: pending

#### S2.T4 — Pruebas y regresión de la sesión. scripts/dev/backend-verify.test.mjs con reportes JSON reales capturados como fixtures (0 omitidas pasa; 1 omitida falla y la lista), chequeo de salud contra un puerto cerrado de verdad (nada de doble que devuelva éxito) y que el reporte no contenga las contraseñas del seed.
Contrato: rollback: Borrar scripts/dev/backend-verify.test.mjs y sus fixtures (git revert).. Status: pending

#### S3.T1 — Crear el archivo versionado de operaciones activas por alcance (operationId, verbo HTTP, ruta, capacidad requerida) a partir del CSV de V3, en la ubicación que se confirme (propuesta: server/test/scope/active-operations.csv). Escribir la prueba Vitest+Supertest server/test/scope/active-operations.integration.test.ts, que monta la app contra la base de la corrida y verifica por cada operación que la respuesta no sea 404 y que su capacidad exista en el mapa de guardas.
Contrato: rollback: git revert de server/test/scope/.. Status: pending

#### S3.T2 — Escribir la prueba de respuestas contra el schema (server/test/scope/response-schema.integration.test.ts). Para cada operación activa ejecuta el caso de éxito con USR-A o USR-B y cada x-error que declara el contrato, y valida status y cuerpo contra el schema OpenAPI. Se activa la validación solo en la prueba, sin cambiar validateResponses en runtime.
Contrato: rollback: git revert de server/test/scope/response-schema.integration.test.ts.. Status: pending

#### S3.T3 — Pruebas y regresión de la sesión. Casos negativos en las dos pruebas de scope: una operación activa sin ruta falla con 'no montada (404)', una capacidad inexistente falla con 'guarda sin resolver' y una respuesta con un campo requerido faltante falla nombrando el operationId. Además se confirma que ambas suites corren dentro de backend:verify con 0 omitidas.
Contrato: rollback: git revert de los casos negativos agregados.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T3.1 { desc="Módulo compartido scripts/dev/backend-run.mjs: lee .nvmrc (24) y aborta si process.version no coincide; resuelve el id de corrida (TAO_RUN_ID o uno generado) y el nombre de proyecto Compose tao-v2-{idCorrida}; busca puertos libres con un intento acotado (máximo 20 por servicio) y persiste el estado de la corrida en un archivo bajo un directorio ignorado por git." }
- edit S1.T3.3 { desc="backend:up y backend:down. up levanta el servidor (dev) y el worker contra la corrida y espera hasta que estén listos con un timeout acotado. down hace docker compose -p tao-v2-{idCorrida} down -v solo sobre la corrida y borra su archivo de estado, sin tocar otras corridas, el volumen de desarrollo ni los contenedores taomangalam-* del legacy." }
- edit S3.T1 { desc="Crear el archivo versionado de operaciones activas por alcance (operationId, verbo HTTP, ruta, capacidad requerida) a partir del CSV de V3, en la ubicación que se confirme (propuesta: server/test/scope/active-operations.csv). Escribir la prueba Vitest+Supertest server/test/scope/active-operations.integration.test.ts, que monta la app contra la base de la corrida y verifica por cada operación que la respuesta no sea 404 y que su capacidad exista en el mapa de guardas." }

### Enmienda 2
**REQs:**

- REQ-05 (edit) `inferred`: Hay un archivo versionado de operaciones activas por alcance (tomando como base el CSV de V3) y una prueba Vitest+Supertest que lo cruza con

### Enmienda 3
**REQs:**

- REQ-01 (edit) `inferred`: El package.json raíz expone backend:prepare (instala dependencias con pnpm install --frozen-lockfile --ignore-workspace en server/, corre ge
- REQ-02 (edit) `inferred`: compose.yaml se renombra a tao-v2 y deja de fijar nombres de contenedor (taomangalam-postgres, taomangalam-mailpit, taomangalam-toxiproxy, t
- REQ-04 (edit) `inferred`: backend:verify es un gate. Falla con código distinto de cero si PostgreSQL, el worker o el correo (Mailpit) de la corrida no responden. El c
- REQ-05 (edit) `inferred`: Hay un archivo versionado de operaciones activas por alcance, derivado de docs/product/v3/backend_operaciones.csv (filas con releaseStatus=a
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T4

**Gate (auto)**: Con el stack legacy corriendo, dos corridas (TAO_RUN_ID=a y b) de pnpm backend:prepare && pnpm backend:up quedan arriba a la vez, docker ps muestra contenedores tao-v2-a-* y tao-v2-b-* con puertos distintos de 54329/1025/8025, y pnpm backend:down de a deja intactos b y el legacy.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: pnpm backend:verify sale con código 0 en una corrida sana. Con una suite describe.skipIf activada sale con código 1 y lista 'omitidas: 1' con archivo y suite, y con el mailpit de la corrida detenido falla nombrando 'correo'. El reporte muestra el SHA y los totales sin secretos.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Dentro de pnpm backend:verify aparece el bloque 'reporte por alcance' con N/N operaciones activas montadas (distinto de 404, guarda resuelta) y 0 desvíos de schema, incluidos los x-errores. Si se agrega al archivo una operación activa falsa, la prueba falla nombrándola.

### Session 4 · T0 · open
