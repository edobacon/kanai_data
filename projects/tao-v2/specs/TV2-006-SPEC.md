---
id: TV2-006-SPEC
project: tao-v2
ticket: TV2-006
status: approved
---

# TV2-006 B1-01: alta de dispositivo, configuración con accountDeletionPortalUrl, lectura de cuenta y manifiesto filtrado por alcance

## Resumen ejecutivo

Se completa la base del servidor para una app conectada. El alta de instalación por /devices queda idempotente y documentada como alta de versión del cliente, no como gestión de dispositivos. La configuración entrega accountDeletionPortalUrl absoluta, armada con PUBLIC_BASE_URL y la constante /eliminar-cuenta de server/src/config/rutas-publicas.ts. GET /cuenta (obtenerMiCuenta) solo devuelve la cuenta del token. El manifiesto filtra las operaciones y capacidades según el rol y una lista de alcance del MVP (releaseScope) que se crea en código.
No se toca: el portal de eliminación, que entrega W04 (hasta entonces la ruta responde 404 y solo se verifica la forma de la URL), la gestión de dispositivos, lo diferido a v1 (21-extensiones-v1) ni el modelo de datos, que ya trae TV2-005 (C-modelo-datos-mvp).
Verificación: pruebas de integración por operación con los x-errores del contrato (alta repetida, cuenta A contra B, cuenta suspendida, manifiesto vigente e incompatible, rol forzado por payload, URL que cambia con la variable). Además pnpm run check, pnpm run check:ci y DOCS_DIFF_BASE=main pnpm docs:check con Node 24. Una suite omitida no cuenta como verde.
ADVERTENCIA: el anclaje de código solo trajo archivos de la app Flutter y de docs. Los archivos del servidor que se citan (rutas, servicios, contrato OpenAPI, tests) son inferred y hay que ubicarlos al empezar la sesión 1. No se agrega gestión de dispositivos ni endpoints fuera del contrato.

Datos a confirmar antes de ejecutar:
- Ruta del contrato OpenAPI del servidor y nombres exactos de las operaciones de alta de instalación, configuración y manifiesto, con sus x-errores (buscar en server/ o docs/ del repo tao-v2).
- Runner de tests del servidor y carpeta de pruebas de integración (vitest o jest; server/test o server/src/**/*.test.ts). Hay que ajustar los comandos verify a lo que se encuentre.
- Dónde se valida hoy la URL de configuración y qué nombre de variable usa la excepción de entorno local para aceptar http://localhost (DEC-129).
- Lista literal de operaciones y capacidades del MVP para releaseScope (ficha 00-alcance-y-decisiones y 05-epicas-y-orden-de-ejecucion del KB, carpeta mvp).
- Clave de unicidad del alta de instalación (id de instalación del cliente o par cuenta+instalación) en el modelo de TV2-005.

## Requirements

### REQ-01 `confirmed`
> Fuente: request:Alcance + adenda 1 punto 3

El alta de instalación y versión por /devices usa los contratos existentes y es idempotente. La clave natural es el campo único `codigo` del modelo Dispositivo (schema.prisma, registro-dispositivo.ts): un alta repetida con el mismo `codigo` actualiza el registro sin duplicarlo. Queda documentada como alta de versión del cliente, no como gestión de dispositivos.

### REQ-02 `confirmed`
> Fuente: request:Alcance + Riesgos + adenda 1 puntos 1 y 2

La configuración entrega accountDeletionPortalUrl absoluta, calculada como PUBLIC_BASE_URL más la constante de ruta /eliminar-cuenta definida una sola vez en server/src/config/rutas-publicas.ts. PUBLIC_BASE_URL se declara en server/.env.example. Validación del portal (DEC-129): el hostname en minúsculas debe coincidir exactamente con alguno de los valores de PORTAL_ALLOWED_HOSTS (lista separada por comas; valor de producción portal.taomangalam.cl); un host fuera de la lista se rechaza. En producción se exige HTTPS. Excepción local: PORTAL_ALLOW_LOCALHOST_HTTP=true acepta http://localhost solo si NODE_ENV no es production; en producción esa variable se ignora. Ambas variables se declaran en server/.env.example.

### REQ-03 `inferred`
> Fuente: request TV2-006 Alcance (GET /cuenta, obtenerMiCuenta) y Criterios de aceptación

GET /cuenta (obtenerMiCuenta) devuelve solo la cuenta del token autenticado y cubre los x-errores que declara el contrato, incluida la cuenta suspendida. Este ticket es su único dueño.

### REQ-04 `confirmed`
> Fuente: request:Alcance + adenda 1 punto 4

El manifiesto lista solo las operaciones y capacidades activas en el servidor: la intersección entre lo que concede el rol (resuelto en el servidor, nunca por payload del cliente) y la lista de alcance del MVP (releaseScope). Esa lista se crea como constante en server/src (aún no existe) a partir de docs/product/v3/backend_operaciones.csv: las operaciones con releaseStatus=active (46 operaciones más iniciarSesionWeb). Así excluye lo diferido, como soporte.abrir, producto.catalogo.ver, solicitud.crear, unidad.registrar, respaldo.* y dispositivo.gestionar cuando no estén en el alcance.

### REQ-05 `confirmed` `enforcement`
> Fuente: Contrato de épica C-modelo-datos-mvp (TV2-005 a TV2-006)

Se reutiliza el modelo de C-modelo-datos-mvp de TV2-005 sin migraciones nuevas: ids ULID generados en el servicio, registrarAuditoria para los eventos y nada de UPDATE ni DELETE sobre las tablas append-only.

### REQ-06 `confirmed` `enforcement`
> Fuente: request:Criterios de aceptación + adenda 1 punto 5

Las operaciones se implementan contra el contrato existente, incluidos sus x-errores, sin inventar campos ni rutas. Las pruebas se escriben con Vitest, en archivos *.test.ts e *.integration.test.ts junto al código en server/src y en la carpeta server/src/test/. Las pruebas de aceptación no usan dobles que siempre devuelven éxito, y una suite de integración omitida no cuenta como verde.
## Tasks

#### S1.T2 — Hacer idempotente el alta de instalación por /devices sobre el modelo de TV2-005: upsert por la clave de instalación, ULID generado en el servicio y registrarAuditoria. Mantener la forma de respuesta del contrato y documentar /devices en el contrato y la doc como alta de versión del cliente, no como gestión de dispositivos.
Contrato: rollback: Revertir el commit de la task: vuelve el alta previa y la documentación anterior.. Status: done

#### S1.T3 — Tests de integración de la sesión: primero fijar la respuesta actual del alta; después cubrir el alta repetida sin duplicado, la URL de configuración que cambia con PUBLIC_BASE_URL, la URL rechazada en producción con http o un host no permitido, y los x-errores de ambas operaciones. Cada caso corre contra la base del seed R09, sin dobles de éxito.
Contrato: rollback: Borrar los archivos de test agregados en la task.. Status: done

#### S1.T4 — Implementar REQ-02. Crear server/src/config/rutas-publicas.ts con la constante de ruta unica /eliminar-cuenta. Declarar PUBLIC_BASE_URL, PORTAL_ALLOWED_HOSTS y PORTAL_ALLOW_LOCALHOST_HTTP en server/.env.example (el puerto del servidor sale de PORT en ese archivo). Calcular accountDeletionPortalUrl a partir de PUBLIC_BASE_URL y la ruta. Validar que la URL sea HTTPS y que su host figure en PORTAL_ALLOWED_HOSTS, con la excepcion http://localhost solo si PORTAL_ALLOW_LOCALHOST_HTTP=true y NODE_ENV no es production. Crear server/src/config/rutas-publicas.test.ts con un caso aceptado, un host no permitido rechazado y el caso localhost.
Contrato: rollback: Revertir los archivos de la task: eliminar server/src/config/rutas-publicas.ts y server/src/config/rutas-publicas.test.ts, y quitar de server/.env.example las líneas de PUBLIC_BASE_URL, PORTAL_ALLOWED_HOSTS y PORTAL_ALLOW_LOCALHOST_HTTP (git checkout -- server/.env.example y git clean sobre los dos archivos nuevos).. Status: done

#### S2.T1 — Implementar GET /cuenta (obtenerMiCuenta) según el contrato: resolver la cuenta solo desde la sesión autenticada (sesion_auth), sin aceptar un id de cuenta del cliente, y devolver los x-errores declarados (cuenta suspendida, no autenticado).
Contrato: rollback: Revertir el commit de la task: quita la ruta y el servicio de cuenta.. Status: pending

#### S2.T2 — Crear la lista de alcance del MVP (releaseScope) en código con las operaciones y capacidades de la ficha 00-alcance-y-decisiones, y filtrar el manifiesto por la intersección entre el rol, resuelto en el servidor e ignorando rol o capacidades del payload, y releaseScope. Responder el x-error del contrato ante un manifiesto incompatible.
Contrato: rollback: Revertir el commit de la task: el manifiesto vuelve a listar lo que concede el rol sin filtro de alcance.. Status: pending

#### S2.T3 — Tests de integración de la sesión: la cuenta A no lee la B, la cuenta suspendida recibe su x-error, el manifiesto del rol Estándar excluye lo diferido y cada operación listada responde distinto de 404, el rol forzado por payload se ignora y el manifiesto incompatible devuelve su x-error. Además, regresión de que no hay migraciones nuevas en server/prisma/migrations.
Contrato: rollback: Borrar los archivos de test agregados en la task.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T3 { desc="Tests de integración de la sesión: primero fijar la respuesta actual del alta; después cubrir el alta repetida sin duplicado, la URL de configuración que cambia con PUBLIC_BASE_URL, la URL rechazada en producción con http o un host no permitido, y los x-errores de ambas operaciones. Cada caso corre contra la base del seed R09, sin dobles de éxito." }

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: El alta de instalación y versión por /devices usa los contratos existentes y es idempotente. La clave natural es el campo único `codigo` del
- REQ-02 (edit) `confirmed`: La configuración entrega accountDeletionPortalUrl absoluta, calculada como PUBLIC_BASE_URL más la constante de ruta /eliminar-cuenta definid
- REQ-04 (edit) `confirmed`: El manifiesto lista solo las operaciones y capacidades activas en el servidor: la intersección entre lo que concede el rol (resuelto en el s
- REQ-06 (edit) `confirmed`: Las operaciones se implementan contra el contrato existente, incluidos sus x-errores, sin inventar campos ni rutas. Las pruebas se escriben

### Enmienda 3

**Tasks agregadas:**

- S1: Implementar la resolución de accountDeletionPortalUrl (REQ-02), sin acceso externo ni intervención de persona. (1) Crear server/src/config/rutas-publicas.ts con la constante única de ruta del portal de eliminación: `export const RUTA_PORTAL_ELIMINACION = '/eliminar-cuenta'` (único lugar donde se define esa ruta). (2) Declarar en server/.env.example las variables PUBLIC_BASE_URL (URL pública del servidor, ej. https://portal.taomangalam.cl en producción, http://localhost:<puerto> en local), PORTAL_ALLOWED_HOSTS (lista separada por comas; valor de producción portal.taomangalam.cl) y PORTAL_ALLOW_LOCALHOST_HTTP (true solo en local; se ignora si NODE_ENV=production). (3) Calcular accountDeletionPortalUrl como PUBLIC_BASE_URL más RUTA_PORTAL_ELIMINACION, leyendo la variable en tiempo de ejecución (sin valores fijos en el código) para que cambiar PUBLIC_BASE_URL cambie la URL sin tocar código. (4) Validar la URL resultante: en producción exige protocolo https; el hostname en minúsculas debe coincidir exactamente con alguno de PORTAL_ALLOWED_HOSTS, y un host fuera de la lista se rechaza; excepción local: con PORTAL_ALLOW_LOCALHOST_HTTP=true se acepta http://localhost solo si NODE_ENV no es production (en producción la variable se ignora). (5) Crear el test unitario server/src/config/rutas-publicas.test.ts (Vitest) con casos concretos: URL absoluta formada por base más ruta; cambio de PUBLIC_BASE_URL cambia el resultado; host no listado rechazado; http rechazado en producción; http://localhost aceptado con la excepción fuera de producción e ignorada en producción. Sin dobles que devuelvan éxito siempre. No tocar nada más. (valida: REQ-02; rollback: Revertir los archivos de la task: eliminar server/src/config/rutas-publicas.ts y server/src/config/rutas-publicas.test.ts, y quitar de server/.env.example las líneas de PUBLIC_BASE_URL, PORTAL_ALLOWED_HOSTS y PORTAL_ALLOW_LOCALHOST_HTTP (git checkout -- server/.env.example y git clean sobre los dos archivos nuevos).)

### Enmienda 4

**Task ops:**

- edit S1.T4 { desc="Reemplazar el marcador de puerto de la tarea S1.T4 por el valor real: el puerto del servidor de la corrida se lee de la variable PORT de server/.env.example (o del puerto que publica la corrida de backend:up). No usar corchetes angulares en ningún texto de la tarea." }

### Enmienda 5

**Task ops:**

- edit S1.T4 { desc="Implementar REQ-02. Crear server/src/config/rutas-publicas.ts con la constante de ruta unica /eliminar-cuenta. Declarar PUBLIC_BASE_URL, PORTAL_ALLOWED_HOSTS y PORTAL_ALLOW_LOCALHOST_HTTP en server/.env.example (el puerto del servidor sale de PORT en ese archivo). Calcular accountDeletionPortalUrl a partir de PUBLIC_BASE_URL y la ruta. Validar que la URL sea HTTPS y que su host figure en PORTAL_ALLOWED_HOSTS, con la excepcion http://localhost solo si PORTAL_ALLOW_LOCALHOST_HTTP=true y NODE_ENV no es production. Crear server/src/config/rutas-publicas.test.ts con un caso aceptado, un host no permitido rechazado y el caso localhost." }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: POST /devices es idempotente y la configuración devuelve accountDeletionPortalUrl armada con PUBLIC_BASE_URL más /eliminar-cuenta; las pruebas de integración de ambos pasan y la documentación de /devices queda actualizada.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: GET /cuenta devuelve solo la cuenta del token con sus x-errores, y el manifiesto lista solo las capacidades del rol que están dentro de releaseScope; las pruebas de integración lo muestran y los chequeos completos pasan con Node 24.

### Session 3 · T0 · open
