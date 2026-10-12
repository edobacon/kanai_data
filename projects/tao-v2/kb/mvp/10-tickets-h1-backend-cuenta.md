---
id: DOC-kb-mvp-10-tickets-h1-backend-cuenta
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - backend
  - h1
---

# MVP tao-v2: tickets H0 y H1, decisiones y cuenta en servidor

Fichas de los tickets X01 y de B0 a B3 (14 tickets tras fundir B1-05 en B1-04, revisadas contra el análisis de backend). Formato en `01-ficha-de-ticket`. Recursos y cuentas en `02-recursos-cuentas-y-assets`. Cuentas externas: ninguna en todos. Repo: `tao-v2`, carpeta `server/` salvo que se indique. Todas las fichas parten en estado pendiente de verificación. Cada ticket de backend debe cubrir además la lista de `x-errores` que declara el contrato para sus operaciones (los textos i18n de los 46 códigos ya existen).

Nota de ids: B1-05 (seed de perfiles y CLI de cuentas) quedó absorbido por B1-04. Los documentos que aún nombran B1-05 se leen como "la parte de seed y CLI de B1-04".

Decisiones cerradas el 2026-10-12 que estas fichas recogen: el estado de la cuenta se verifica en cada petición (B1-04); la purga programada queda fuera del MVP (B3-02); la política de unidades al revocar o eliminar a un Productor está fijada (B7-01 y B3-04); la URL del portal de eliminación se deriva de una ruta del servidor (B1-01, D-12).

## Hallazgos de backend que estas fichas corrigen

- Login web imposible: `LoginRequest` exige `deviceCode` y el servidor responde credenciales inválidas si el dispositivo no existe (`server/src/auth/inicio-sesion.ts:221-234`); `SesionAuth.dispositivoId` es obligatorio (`server/prisma/schema.prisma:117`). Se resuelve con B0-03 y B1-04.
- Perfiles Administrador y Productor no existen (solo `PERFIL_ESTANDAR` en `server/src/capacidades/catalogo.ts:515`), no hay CLI de administrador inicial, y el chequeo de CI compara solo la columna E de capacidades: B1-04.
- La suspensión no es efectiva hoy: `renovarToken` solo comprueba que la cuenta exista (`server/src/auth/sesiones.ts:205-209`), el bearer no toca la base, el middleware de capacidad no lee `estado` y no existe revocar por cuenta: B1-04.
- Eliminación de cuenta subestimada: 5 operaciones sin handler, 4 tablas ausentes, FK `Restrict` en aceptaciones y consentimientos (un `DELETE` de cuenta falla, solo cabe tombstone), plantillas de correo faltantes: B0-03, B3-02 y B3-04.
- Modelo de datos de B4 a B7 más grande que lo declarado (11 entidades ausentes): una sola migración en B0-03.
- Ids `cuid()` frente a contrato ULID: B0-03.
- El gate puede quedar verde sin PostgreSQL (46 usos de `describe.skipIf`): B0-01 y B0-02.
- Postman y los comandos `backend:*` no existen en el repo: B0-02.
- `GET /cuenta` tenía doble dueño: queda en B1-01.
- Límites HTTP solo declarados en el contrato: construcción nueva en B1-03.
- `cambiarCorreo` responde 409 para cuenta activa: B3-01 y D-05.
- El manifiesto anuncia funciones diferidas (Estándar concede `soporte.abrir`, `sync.conflicto.resolver`, `producto.catalogo.ver` y otras): filtro de alcance en B1-01.
- `compose.yaml` conserva nombres `taomangalam-*` y los mismos puertos que el stack del repo viejo: B0-02.
- La URL del portal de eliminación (DEC-129) no tiene un valor propio: se deriva de la ruta que sirve el portal del servidor (B1-01 y W04).

---

## X01. DEC del MVP: web de administración y productor, y recordatorios

- Tipo: improvement. Módulo: Docs. Cambio: N.
- Depende de: ninguno.
- Repo y rutas: `docs/decisiones/` (nueva DEC), ajustes a `DEC-105`, `DEC-229`, `DEC-153`, `DEC-163`, `DEC-129` y `DEC-224`.
- Entregable: una DEC que fija D-01 a D-12 de `00-alcance-y-decisiones`, indica qué decisiones anteriores supera o precisa, y registra el efecto sobre la matriz de superficies (backoffice en web, no solo en el app), la excepción de línea visual web (D-11) y el portal público de eliminación como vista del servidor (D-12, precisa DEC-229 y DEC-129). Deja también anotado que la purga programada de cuentas de dispositivo inactivas (DEC-224) queda fuera del MVP con su clave de configuración declarada.
- Aceptación local: `DOCS_DIFF_BASE=main pnpm docs:check` verde con Node 24; la DEC lista las decisiones supersedidas con enlace.
- Datos externos: ninguno.
- Información por confirmar: numeración de la DEC (siguiente libre en `docs/decisiones/`); si Producto exige revisión previa.
- Recursos: R01. Verificación: docs. Extensión v1: la DEC deja explícita la web como superficie ampliable.

## B0-01. Conciliar base heredada y recuperar la regresión

- Tipo: improvement. Módulo: Backend. Cambio: C.
- Depende de: ninguno.
- Repo y rutas: `server/`, `docs/product/v3/` (matriz), `tests/`.
- Entregable: matriz de evidencia por ticket v1 cerrado (qué entrega existe, qué prueba pasa, qué sigue pendiente); suites de `server/` recuperadas; lista de las suites con `describe.skipIf` (46 usos) y de cuáles dependen de PostgreSQL, como insumo del gate de B0-02.
- Aceptación local: `pnpm run check` y Vitest en `server/` con Node 24; las fallas de entorno preexistentes (119 de unittest, 8 de node tests) quedan clasificadas, no corregidas; la matriz distingue "ticket cerrado" de "pruebas que corren".
- Datos y fixtures: SHA auditado; seis espejos EP-06 divergentes.
- Recursos: R01, R02. Información por confirmar: lista de skips aceptados explícitamente (si hay). Verificación: backend.

## B0-02. Backend aislado y verificable

- Tipo: implement. Módulo: Backend. Cambio: C.
- Depende de: B0-01.
- Repo y rutas: `package.json` raíz, `scripts/dev/`, `compose.yaml`, `server/package.json`, `server/.env.example`.
- Entregable:
  - Los cuatro comandos que hoy no existen (`backend:prepare`, `backend:up`, `backend:verify`, `backend:down`), ensamblando las piezas existentes (`dev:services`, `db:migrate:deploy`, `db:seed`, `dev`, `test`). Fijan Node 24 por `.nvmrc`.
  - Base exclusiva por corrida, puertos libres, cola y correo limpios; el Compose actual tiene nombres (`taomangalam-postgres`, `taomangalam-mailpit`, `taomangalam-toxiproxy`, `taomangalam-server`) y volumen fijos, y publica los mismos puertos (54329, 1025, 8025) que el stack del repo legacy que sigue corriendo en esta máquina: se renombra a tao-v2 y se parametrizan nombres y puertos, porque cambiar solo el nombre del proyecto no basta.
  - Script `generate:server` separado: `pnpm generate` exige Dart y Java, y para correr tests basta `prisma generate` (el cliente `src/generated/` no está versionado; `api.d.ts` sí).
  - `backend:verify` falla si alguna suite de integración reporta omitidas mayor que cero y lista las omitidas.
  - Reporte funcional por alcance: archivo de operaciones activas (el CSV de V3 sirve de base) y una prueba que lo cruza con las rutas montadas (cada operación activa responde distinto de 404 y su guarda de capacidad se resuelve).
  - Prueba de respuestas contra el schema para las operaciones activas (hoy `validateResponses: false`, nada compara respuestas reales con el contrato).
  - Sin Postman (D-04): la fuente de verdad es Vitest y Supertest.
- Aceptación local: desde checkout limpio, preparar, levantar, verificar y detener; falla si falta PostgreSQL, worker o correo, o si hay suites omitidas; una segunda corrida no colisiona ni toca desarrollo ni el stack del repo legacy.
- Datos y fixtures: cuentas USR-A, USR-B, ADM-1, PRD-A, PRD-B del dataset R09 (ADM-1 y PRD solo existen tras B1-04; aquí se prepara el mecanismo).
- Recursos: R01, R02, R03, R09. Información por confirmar: cómo aislar nombres, puertos y volumen del Compose; si el reporte por alcance vive en `server/` o en `scripts/dev/`. Verificación: backend.

## B0-03. Migración única del modelo de datos con ULID

- Tipo: implement. Módulo: Backend. Cambio: N.
- Depende de: B0-02.
- Repo y rutas: `server/prisma/schema.prisma` y migraciones, `server/src/` (generador de ids ULID).
- Entregable: una sola migración que deja el modelo completo del MVP, para no migrar tres veces:
  - Sesión web: `sesion_auth.dispositivoId` opcional más columna `superficie` (`app` o `web`) con CHECK.
  - Eliminación (B3): `solicitud_eliminacion_cuenta`, `eliminacion_componente` (estado por componente: dominio, sesiones, analítica, comunicaciones), `comprobante_eliminacion` (sin datos personales, vence a 90 días) y `retencion_legal`.
  - Auditoría (B4, B6, B7): `evento_auditoria` con todas las columnas de v1 desde el inicio (actor real y efectivo, perfil o capacidad usada, `request_id`, resultado, motivo, valores anterior y nuevo, `impersonacion_id` y `caso_id` nulables), más un helper único `registrarAuditoria(tx, ...)` que se llama dentro de la transacción del efecto.
  - Producto (B5, B6, B7): `producto` con `estado`, `uso_en_metodo`, `momento_de_uso`, `disponibilidad_publicada`, `imagen` y `publicado_at` nulables desde la primera migración; `producto_productor` con índice parcial de un productor activo por producto (no columna `productor_id` en producto); `unidad_producto` (`estado_emision`, `estado_uso`, `codigo_lookup_hash` único, `reemplaza_unidad_id`); `unidad_evento` como única fuente del ciclo de vida; `intento_codigo_producto` (anti abuso sin guardar códigos desconocidos en claro).
  - `preferencia_cuenta`: se decide en el ticket; la alternativa es escribir `cuenta.locale` y `timezoneId` y registrar la decisión en el contrato.
  - Límites HTTP: tabla de intentos por ruta, IP o cuenta, o generalización de `intento_login` (ver B1-03).
  - Privilegios: las tablas nuevas heredan SELECT, INSERT, UPDATE y DELETE para `taomangalam_app`; las append-only (`evento_auditoria`, `unidad_evento`, y las de aceptación existentes) llevan `REVOKE UPDATE, DELETE` explícito, como hizo la migración legal. Sin eso la inmutabilidad es solo convención.
  - Ids: ULID generado en el servicio (D-04) para `cuenta`, `producto`, `unidad_producto` y toda tabla expuesta por path; el repo hoy mezcla `cuid()` y `ulid()` manual (`desafio_verificacion`, `intento_login`).
- Aceptación local: migración desde cero por el rol migrador en PostgreSQL local; drift de migraciones y tests de Prisma verdes; ids cumplen el patrón `Ulid` del contrato; `GET /admin/cuentas/{cuentaId}` acepta ids de cuentas ya creadas (antes habría dado 400 con ids cuid); los REVOKE se verifican con una prueba que intenta UPDATE y DELETE y falla.
- Datos y fixtures: base vacía y base con datos heredados.
- Recursos: R02. Información por confirmar: estrategia para ids cuid existentes (migrar, o relajar el patrón para ids heredados); decisión sobre `preferencia_cuenta`; si el límite HTTP usa tabla nueva o generaliza `intento_login`. Verificación: backend. Extensión v1: `evento_auditoria` y `producto` nacen completos para sumar consola de auditoría, impersonación y publicación sin migrar.

## B1-01. Dispositivo, configuración, lectura de cuenta y manifiesto

- Tipo: improvement. Módulo: Backend. Cambio: C.
- Depende de: B0-03.
- Entregable:
  - Alta de instalación y configuración con contratos existentes.
  - Clave de configuración `accountDeletionPortalUrl` (DEC-129): se calcula con la URL pública del servidor (variable nueva `PUBLIC_BASE_URL` en `server/.env.example`) y la ruta del portal de eliminación, que se define una sola vez en un módulo compartido de rutas públicas (`server/src/config/rutas-publicas.ts`, ruta `/eliminar-cuenta`). La app la lee de la configuración y nunca la construye (DEC-129); el portal que sirve esa ruta lo entrega W04. Hasta que W04 exista, la ruta responde 404 y la prueba de B1-01 solo verifica la forma de la URL.
  - `GET /cuenta` (`obtenerMiCuenta`): este ticket es el único dueño (el CSV lo declara de B1; B3 ya no lo implementa).
  - Manifiesto con filtro de alcance: lista de operaciones y capacidades activas en servidor, alimentada por el alcance del MVP, para que una app conectada no vea vistas cuyas rutas responden 404 (Estándar concede hoy `soporte.abrir`, `producto.catalogo.ver`, `solicitud.crear`, `unidad.registrar`, `respaldo.*`, `dispositivo.gestionar` y otras).
  - Documentar `/devices` como el alta de versión que ya usa el cliente, no como gestión de dispositivos (que está fuera de alcance).
- Aceptación local: alta repetida no duplica; el manifiesto refleja el rol y excluye lo diferido; el rol no se habilita por payload del cliente; la cuenta A no lee la B; la configuración entrega `accountDeletionPortalUrl` absoluta, formada por `PUBLIC_BASE_URL` más la constante de ruta, y cambiar la variable cambia la URL sin tocar código.
- Datos y fixtures: instalación nueva y repetida, manifiesto vigente e incompatible, cuenta suspendida.
- Recursos: R01, R02, R03. Información por confirmar: dónde vive la lista de alcance (hay que crearla: `releaseScope` solo existe en los documentos); cómo valida el contrato la URL en local (DEC-129 exige HTTPS y un host permitido en producción; en local se usa `http://localhost` con una excepción de entorno explícita). Verificación: backend.

## B1-02. Recuperar contraseña por correo

- Tipo: implement. Módulo: Backend. Cambio: =.
- Depende de: B1-01.
- Entregable: flujo con plantilla de correo nueva (hoy hay 3 plantillas), TTL, límites y revocación de sesiones según contrato; usa `PropositoDesafio.recuperar_contrasena`, que ya existe.
- Aceptación local: el mensaje se lee automáticamente desde Mailpit; el código es de un solo uso, caduca y tiene límites; la respuesta no revela si existe la cuenta.
- Datos y fixtures: cuenta existente e inexistente, código vencido y usado, reintento.
- Recursos: R02, R03. Verificación: backend.

## B1-03. Protección HTTP y límites: construcción nueva

- Tipo: implement. Módulo: Backend. Cambio: C.
- Depende de: B1-01, B1-02.
- Entregable:
  - helmet con CSP estricta (DEC-162) y sin CORS (la web es del mismo origen, D-01).
  - Rate limit nuevo: el contrato declara `x-rate-limit` en 12 operaciones (8 activas: `autenticarCuentaDispositivo`, `iniciarSesion`, `solicitarRecuperacion`, `verificarCodigoRecuperacion`, `reenviarCodigoCorreo`, `solicitarEliminacionCuenta`, `validarYUsarUnidad`, `consultarEstadoEliminacion`), pero hoy solo hay bloqueo por correo en login y topes por desafío. No hay limitador por IP ni por cuenta (DEC-163).
  - Redacción de logs; certificación de rotación de sesión y refresh concurrente.
- Aceptación local: HTTP real verifica 401, 403 y 429; revocación efectiva; reportes sin secretos; respeta el contrato de refresh concurrente sin inventar otra política.
- Datos y fixtures: tokens vencidos y reutilizados, refresh concurrente, rol sin permiso, reloj controlado.
- Recursos: R01, R02, R03. Información por confirmar: valores de límite por ruta (los fija el contrato donde lo declara). Verificación: backend.

## B1-04. Sesión web, estado de cuenta efectivo, seed de perfiles y CLI de cuentas

- Tipo: implement. Módulo: Backend. Cambio: N (absorbe B1-05).
- Depende de: B1-03, X01.
- Repo y rutas: `server/contract/openapi.yaml` (nueva operación `POST /auth/web/login`), `server/src/auth/` (inicio de sesión, sesiones), `server/src/middleware/capacidad.ts`, `server/src/capacidades/` (seed y chequeo de CI), `server/scripts/` (CLI de cuentas).
- Entregable:
  - `iniciarSesionWeb`: login por email y contraseña sin `deviceCode`, solo cuentas completas y activas con perfil Administrador o Productor; emite sesión con `superficie=web` y claim `superficie`; Estándar y suspendidas se rechazan con una respuesta indistinguible de credenciales inválidas; no existe unión a dispositivo en la web (D-09). La lista de perfiles permitidos es configurable, no una constante.
  - Estado de cuenta efectivo (H-03), con la política decidida: el estado de la cuenta se verifica en cada petición contra la base (DEC-161), de modo que una suspensión surte efecto de inmediato y la ventana de 15 minutos del access token (DEC-232) no sirve de espera. Incluye `revocarSesionesDeCuenta` (hoy solo hay revocar por familia, por sesión y por dispositivo); chequeo de `estado` en el refresh (el contrato declara `cuenta_suspendida` y el código no lo aplica); `estado` en el `select` del middleware de capacidad (lee la base en cada petición y no agrega consultas).
  - Seed idempotente con perfiles Estándar, Productor y Administrador como filas de `perfil` con `esSistema=true` e ids deterministas (D-06); la lógica de negocio usa capacidades (`x-capacidad`), nunca compara nombres de perfil (hoy `registro-dispositivo.ts:225` busca el perfil por nombre). Se registra en la lista de seeds nombrados (`catalogo-capacidades`, `configuracion-catalogo`, `politica-analitica` existentes).
  - Extender el chequeo de CI de capacidades (`server/src/capacidades/ci-checks.ts`, hoy solo columna E) a las columnas Administrador y Productor del catálogo de vistas y capacidades (`docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md`).
  - CLI de cuentas con perfil: crea una cuenta completa con correo verificado, `credencial_password` y `cuenta_perfil` para el perfil indicado (`--perfil administrador` o `--perfil productor`); sirve para el primer administrador y para cuentas Productor en entornos locales. No requiere dispositivo gracias al login web. Solo funciona en entorno local o de prueba.
  - Origen de una cuenta Productor (decidido): se registra como cuenta Estándar normal en la app y un Administrador le asigna el perfil Productor desde la web (W03); no hay autoalta de Productor. En entornos locales la CLI crea la cuenta directamente con el perfil.
- Aceptación local: Supertest cubre Estándar rechazada, Administrador y Productor aceptados, suspendida rechazada, refresh de sesión web, que un token web no sirve donde se exige dispositivo, y "token emitido antes de suspender" con reloj controlado (el access token aún vigente también se rechaza apenas la cuenta se suspende, sin esperar su caducidad); el seed corre dos veces sin duplicar; la CLI crea ADM-1 y PRD-A con contraseña de prueba solo en entorno local y se niega a correr fuera de él; el CI falla si una capacidad de Administrador o Productor del catálogo no está en el seed.
- Datos y fixtures: perfiles, USR-A, USR-SUS, ADM-1, PRD-A del dataset R09.
- Recursos: R02, R09. Información por confirmar: forma exacta del contrato (openapi-diff como cambio compatible); si el middleware de versión debe tratar `X-Plataforma: web` (hoy lo ignora y solo evalúa ios y android); ULIDs fijos de los perfiles (los fija este ticket y los publica en la documentación). Verificación: backend. Extensión v1: `revocarSesionesDeCuenta` sirve luego para cierre remoto de sesiones.

## B2-01. Registro y lectura legal de versiones

- Tipo: improvement. Módulo: Backend. Cambio: =.
- Depende de: B1-01.
- Entregable: registro de versiones y servicio de textos locales con hash; scripts adaptados para no requerir staging.
- Aceptación local: la API devuelve versión, hash y texto coherentes y recupera versiones históricas; sin URL remota.
- Datos y fixtures: textos provisionales existentes y una versión nueva de prueba con hash distinto.
- Recursos: R02, R04. Datos externos: aprobación definitiva de textos pendiente (se usa el fixture). Verificación: backend.

## B2-02. Aceptación, pendientes y privacidad: verificación y ajustes

- Tipo: improvement. Módulo: Backend. Cambio: C.
- Depende de: B2-01, B1-03.
- Entregable: aceptación con idempotencia, pendientes y consentimiento de analítica. `aceptarDocumentosLegales` ya está completo según el análisis: el trabajo es certificarlo con pruebas y corregir lo que falle. Aclaración: "cola legal" del plan se refiere a la cola offline del cliente Flutter; en servidor no hay cola legal y la única cola es pg-boss de correo.
- Aceptación local: respuesta perdida y reintento no duplican la aceptación; hash incorrecto falla; el consentimiento no activa captura nueva de métricas.
- Datos y fixtures: aceptación repetida, hash incorrecto, versión nueva, consentimiento concedido y revocado, USR-LEGAL.
- Recursos: R02, R04. Verificación: backend.

## B3-01. Registro, verificación y cambio de correo pendiente

- Tipo: improvement. Módulo: Backend. Cambio: C.
- Depende de: B1-03, B2-02.
- Entregable: pruebas y ajustes de alta, verificación, reenvío y conversión de identidad a cuenta completa; `cambiarCorreo` solo para corregir un correo pendiente (D-05): para una cuenta activa el servicio hoy responde 409 y eso se mantiene; HU-03b-05 queda como extensión. La app ofrece esa corrección únicamente en el estado "correo pendiente de validar" (V-24 y V-27). `GET /cuenta` ya no se trata aquí (lo hace B1-01).
- Aceptación local: convertir identidad conserva propiedad; el cambio de correo respeta verificación y límites; para una cuenta activa responde 409 con el error del contrato.
- Datos y fixtures: USR-I, USR-A, USR-B, correo ocupado, desafío vencido.
- Recursos: R02, R03, R04. Verificación: backend.

## B3-02. Eliminación de cuenta: núcleo con componentes registrados

- Tipo: implement. Módulo: Backend. Cambio: C.
- Depende de: B3-01.
- Entregable:
  - Los 5 handlers faltantes (operaciones 26 a 30 de la tabla de V3), con tombstone (`estado` `en_eliminacion` y `eliminada`, `deletedAt`): un `DELETE` de la cuenta falla por las FK `Restrict` de aceptaciones y consentimientos, y el rol de aplicación no tiene DELETE sobre `aceptacion_documento_legal`. Son las operaciones que consumen la app (V-27) y el portal web de eliminación (W04), que no duplica lógica: llama a los mismos servicios.
  - Registro extensible de componentes (`eliminacion_componente`): dominio, sesiones, analítica y comunicaciones; cada componente futuro registra su propia limpieza.
  - Plantillas de correo de eliminación; comprobante sin datos personales que vence a 90 días (DEC-127); revocación de sesiones; idempotencia; tabla de qué se elimina, conserva o anonimiza (las reglas de conservación existen en documentos, no en código).
  - Purga programada: queda FUERA del MVP (decidido el 2026-10-12). No se crea ningún job de pg-boss. Se declara la clave de configuración del plazo de inactividad de 12 meses de las cuentas de dispositivo (DEC-224) sin trabajo que la use, y el comprobante vencido se trata como vencido al consultarlo (el borrado físico automático a los 90 días va con la purga, como extensión). Debe hacerse antes de publicar.
- Aceptación local: eliminación idempotente, tokens revocados, conservación trazable; el comprobante vencido responde como vencido; no se inventa copia remota de consultas ni borrado de dispositivos desconectados; el componente de producto NO se prueba aquí (lo cubre B3-04).
- Datos y fixtures: cuenta con sesiones y aceptaciones; solicitud repetida; fallo a mitad de operación; comprobante vigente y vencido con reloj controlado.
- Recursos: R02, R04. Información por confirmar: reglas de conservación (Producto). Verificación: backend. Extensión v1: purga programada de cuentas de dispositivo inactivas y borrado físico de comprobantes (primer job programado de pg-boss).

## B3-03. Integración de cuenta y privacidad

- Tipo: implement. Módulo: Backend. Cambio: =.
- Depende de: B3-02.
- Entregable: suite de punta a punta registro, verificación, acceso, recuperación, cambio de correo pendiente y eliminación (núcleo); fixtures reutilizables por la app.
- Aceptación local: recorrido completo con servidor, base, worker y Mailpit reales locales; dobles solo para fallos controlados.
- Recursos: R02, R03, R04. Verificación: backend.

## B3-04. Eliminación: componente de producto y política de Productor

- Tipo: implement. Módulo: Backend. Cambio: N.
- Depende de: B3-02, B7-01.
- Entregable: componente "producto" registrado en `eliminacion_componente`: los usos de producto quedan anonimizados (lo exige el contrato de `/cuenta/eliminacion/dispositivo` y DEC-127); política para una cuenta Productor eliminada (decidida): sus unidades ya emitidas se conservan y válidas (DEC-061, nunca se invalidan unidades generadas ni usadas), su referencia `productor_cuenta_id` se reasigna al productor técnico "Sistema (siembra)" (DEC-232 #8) para que la trazabilidad quede sin cuenta (DEC-127), y sus asignaciones activas en `producto_productor` se revocan con evento de auditoría; prueba de regresión del recorrido completo con unidades.
- Aceptación local: eliminar un consumidor anonimiza sus usos sin romper la unidad; eliminar un Productor reasigna sus unidades al productor técnico, revoca sus asignaciones y deja las unidades disponibles y usadas como estaban; no queda correo ni identidad del Productor en unidades ni eventos; el recorrido de B3-03 sigue verde.
- Datos y fixtures: cuenta con unidades asociadas (K-DISP, K-USADA), PRD-A con unidades emitidas y asignaciones.
- Recursos: R02, R04, R09. Información por confirmar: que el productor técnico "Sistema (siembra)" exista en el seed de este repo (DEC-232 lo describe para la versión anterior; si falta, lo crea B5-02). Verificación: backend.
