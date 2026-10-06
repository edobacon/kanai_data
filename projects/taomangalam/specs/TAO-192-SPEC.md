---
id: TAO-192-SPEC
project: taomangalam
ticket: TAO-192
status: approved
---

# TAO-192 · Preparación EP-01: identidad, autorización, manifiesto y contratos legales

## Resumen ejecutivo

Prepara la infraestructura de EP-01 en 4 etapas verticales: (1) identidad y autorización (sesiones jose/sesion_auth con rotación y revocación, cuenta de dispositivo idempotente, esquema Drift local v1, seed del catálogo de capacidades/perfil Estándar y middleware por capacidad), (2) manifiesto versionado con ETag/caché y manifiesto Estándar empaquetado con refresco por denegación, (3) documentos legales versionados con hash, publicación, lectura pública y permisos de rol append-only, (4) aceptación legal en línea y offline con idempotencia, cola y bloqueo por reaceptación. NO se hace: presentación/retorno de V-51 ni menú de TAO-186 (permanecen en sus consumidores), ni cierre anticipado de HU-03a-08/10/11/12/13; no se simulan proveedores ni aprobación jurídica. Se sabe que funciona por respuestas observables de los endpoints (201/200/304/403/404 con códigos refresh_invalido, token_expirado, capacidad_denegada, version_legal_pendiente), rechazos de psql por permisos, y tests de contrato/persistencia trazados a los casos QA de cada fuente. Tamaño estimado: paquete grande; el request agrupa 10 HU y EXCEDE el techo de 4 sesiones — en la práctica debería partirse en varios tickets por HU; este plan lo coordina como una secuencia mínima de 4 etapas sin inflar alcance.

Datos a confirmar antes de ejecutar:
- Nombre exacto de la variable de entorno de la clave de firma JWT (la que S1.T2 nombra al fallar el arranque).
- Base/valor de `url_publicada` usado al registrar los documentos legales (REQ-07).
- Ruta real del proyecto Flutter, ruta de `docs/legal/` y ruta del texto legal empaquetado en la app.
- Nombre del job de lint de docs local y comando exacto de tests del servidor y del proyecto Flutter (runner real) para los `verify`.
- Ubicación de los tests/CI existentes del repo para anclar los archivos de test propuestos.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:240

El servidor emite un par de tokens por sesión (access token JWT corto firmado con `jose` y refresh opaco guardado hasheado en `sesion_auth`), renueva rotando el refresh en cada uso, revoca la familia ante reuso de un refresh rotado y autentica cada petición con bearer. La configuración vive en el schema zod de `server/src/config.ts` siguiendo el patrón existente (`loadConfigOrExit` / `describeConfigError`): `JWT_SIGNING_KEY` es obligatoria y sin ella el arranque falla temprano nombrando la variable sin imprimir su valor; `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30) gobiernan las expiraciones. Las tres se declaran en `docs/development/configuration.md` y en `.env.example` con la paridad que exige `scripts/dev/env-parity.test.mjs`.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-06_motor_local_de_dominio_y_persistencia.md:145

La app tiene una base Drift versionada con las tablas del Alcance del recorrido del modelo V2 y las tablas locales mínimas, con ids ULID, borrado lógico, dispositivo de origen y fechas locales con zona, y pruebas de migración desde el primer esquema.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:366

Una instalación nueva obtiene automáticamente su cuenta de dispositivo en el primer uso con conexión, sin registro, con perfil Estándar y credencial hasheada, de forma idempotente y operable sin conexión.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:851

Toda petición autenticada pasa por un middleware que lee de la operación del contrato su `x-capacidad` y su `x-requiere-cuenta`, verifica la capacidad contra los perfiles vigentes de la cuenta y deniega por tipo de cuenta lo que exige cuenta completa, con relectura en cada petición.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:740

La base contiene el registro completo de capacidades del catálogo 14 y el perfil Estándar con su matriz, sembrados por un seed idempotente y verificados en CI contra el catálogo y el contrato.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:962

La app conoce y respeta las vistas y acciones habilitadas también sin conexión: manifiesto versionado con ETag/caché, manifiesto Estándar empaquetado y refresco por denegación.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1194

Términos y privacidad existen como versiones inmutables en `documento_legal`, con `hash_contenido` = SHA-256 del Markdown de `docs/legal/` (convención `terminos-vX.Y.md` / `privacidad-vX.Y.md`) y `url_publicada` = `${STAGING_BASE_URL}/legal/<tipo>/<version>` reutilizando la variable `STAGING_BASE_URL` ya existente del pipeline (`.github/workflows/deploy-staging.yml`); `server/` sirve esa ruta como página estática con el texto de esa versión y su número, sin sesión. El texto empaquetado en la app vive en `app/assets/legal/`, se declara en `app/pubspec.yaml` y su hash se verifica contra `docs/legal/`. El registro de cada versión lo hace el script del pipeline de despliegue y las aceptaciones son append-only, con permisos de rol que rechazan UPDATE/DELETE.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1326

Una cuenta acepta términos y privacidad en línea con registro de versión, fecha, origen y dispositivo, con idempotencia por `Idempotency-Key`, validación de versión/fecha/hash y listado paginado propio.

### REQ-09 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1442

Una instalación nueva acepta sin conexión en el primer uso y la aceptación se registra con su fecha original al reconectar, en cola persistente que no se pierde y se reintenta con la misma `Idempotency-Key`.

### REQ-10 `confirmed`
> Fuente: request:Fuente conservada HU-03a-13 + Criterios de esta preparación (presentación/retorno fuera de alcance)

Ante una versión legal nueva con `exige_reaceptacion` el servidor detiene el servicio: responde 403 `version_legal_pendiente` con `documentosPendientes` en toda operación autenticada no exenta, y atiende las marcadas con `x-exenta-version-legal` (`obtenerManifiesto`, `obtenerDocumentoLegal`, `aceptarDocumentosLegales`); una versión sin `exige_reaceptacion` no bloquea ni aparece en `legalPendiente`. La presentación de V-51 y el retorno al punto previo NO entran en esta preparación: quedan en ep01-legal-integration.

### REQ-11 `confirmed` `variant`
> Fuente: sonda:card-docs-de-superficie-6c8ae176a6

La superficie operativa nueva queda documentada en la documentación de desarrollo del repo: el comando de seed de capacidades y el de registro legal con uso, parámetros y ejemplo en `docs/development/commands.md`; las claves de configuración nuevas (`JWT_SIGNING_KEY`, `JWT_ACCESS_TTL_MINUTES` con default 15, `JWT_REFRESH_TTL_DAYS` con default 30 y el uso de `STAGING_BASE_URL` para la `url_publicada` legal) en `docs/development/configuration.md` y en `.env.example` con la paridad que exige `scripts/dev/env-parity.test.mjs`; y el paso de ejecución en `docs/development/release-runbook.md` si la superficie corre en un ambiente.

### REQ-12 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Los documentos referenciados (`docs/backlog/EP-03a_...md` y `docs/backlog/EP-06_...md`) permanecen compliant con el linter de docs y el job de docs local corre antes del PR si el plan llega a tocarlos.

### REQ-13 `confirmed` `variant`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145

Las tablas nuevas reciben privilegios de rol explícitos: `capacidad` y `perfil_capacidad` solo SELECT para el rol de app, `documento_legal` SELECT para el rol de app con escritura del script de despliegue, y `aceptacion_documento_legal` append-only (SELECT e INSERT, REVOKE de UPDATE/DELETE).

### REQ-14 `confirmed` `enforcement`
> Fuente: taomangalam/server/contract/generated/api.d.ts:1947

El paquete reutiliza los tipos y códigos del contrato generado (`TokenPair`, `CodigoError`, `Problem`, `TipoCuenta`, `EstadoCuenta`, `DispositivoRegistro`) y no redefine enums ni códigos de error ya presentes; `server/contract/generated/api.d.ts` no se edita a mano, se regenera con `pnpm -C server run generate` (contract/scripts/generate.mjs → openapi-typescript).
## Tasks

#### S1.T1 — Crear la migración del servidor con las tablas de identidad: `sesion_auth` (hash del refresh, rotado, familia, expiración), `cuenta` (tipo, email nulo, `dispositivo_id` único, perfil), `dispositivo` (codigo, tipo, plataforma, versión) y `credencial_dispositivo` (secreto hasheado), con índices únicos.
Contrato: rollback: Revertir la migración con la migración inversa; dejar las tablas vacías sin borrar datos existentes y sin degradar consentimientos.. Status: done

#### S1.T1.1 — Migración de `sesion_auth` con columnas de hash del refresh, rotado, familia, expiración y sus índices únicos (por hash y por familia).
Contrato: rollback: Revertir la migración de `sesion_auth` con su inversa; no toca otras tablas.. Status: done

#### S1.T1.2 — Migración de `cuenta` (tipo, email nulo, `dispositivo_id` único, perfil) y `dispositivo` (codigo, tipo, plataforma, versión) con sus índices únicos.
Contrato: rollback: Revertir estas dos tablas con su inversa; no borra datos existentes.. Status: done

#### S1.T1.3 — Migración de `credencial_dispositivo` (secreto hasheado) con índice único por cuenta/dispositivo.
Contrato: rollback: Revertir la tabla con su inversa; las credenciales existentes quedan intactas.. Status: done

#### S1.T1.4 — Verificar la migración completa: `prisma validate` en verde y la migración inversa deja el esquema previo sin pérdida de datos.
Contrato: rollback: Revertir la verificación; no cambia datos.. Status: done

#### S1.T2 — Implementar el servicio de sesiones: emisión de access token JWT firmado con `jose` usando la clave `JWT_SIGNING_KEY` (claims cuenta, tipo, dispositivo y versión del manifiesto) y refresh opaco hasheado en `sesion_auth`, renovación con rotación y revocación de familia, y verificación bearer, con las expiraciones tomadas de `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30) validadas en el schema zod de `server/src/config.ts`.
Contrato: rollback: Revertir los commits del servicio de sesiones y dejar `sesion_auth` intacta; las sesiones emitidas por el código revertido dejan de validar.. Status: done

#### S1.T2.1 — Emitir sesión: JWT `jose` firmado con `JWT_SIGNING_KEY` y claims cuenta/tipo/dispositivo/versión-manifiesto, refresh opaco hasheado en `sesion_auth` (nunca el valor), expiraciones tomadas de `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30); el par devuelto usa el shape `TokenPair` del contrato generado.
Contrato: rollback: Revertir la emisión; las filas de `sesion_auth` se conservan sin uso.. Status: done

#### S1.T2.2 — `renovarToken` con rotación en cada uso: responde 200 con par nuevo y marca el refresh anterior como rotado; reuso de rotado o de familia revocada responde `refresh_invalido` y revoca toda la familia.
Contrato: rollback: Revertir la renovación; los refresh previos quedan como estaban.. Status: done

#### S1.T2.3 — Verificación bearer: 401 `token_expirado` para token vencido, 401 `no_autenticado` para firma inválida o sin token. Validar la configuración con zod en el schema de `server/src/config.ts` siguiendo el patrón existente (`loadConfigOrExit` / `describeConfigError`): `JWT_SIGNING_KEY` obligatoria, `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30); sin `JWT_SIGNING_KEY` el arranque falla temprano nombrando la variable sin imprimir su valor. Declarar las tres claves en `.env.example` para mantener la paridad schema-ejemplo que exige `scripts/dev/env-parity.test.mjs`, y redactar los logs (sin refreshToken/accessToken/Authorization).
Contrato: rollback: Revertir la verificación y la configuración de arranque; no cambia datos.. Status: done

#### S1.T3 — Implementar el seed idempotente del catálogo 14 (§1) y del perfil Estándar (§3 columna E) con su matriz, más los checks de CI que comparan catálogo, obligatorias (◎) y `x-capacidad` del contrato; incluir los REVOKE de rol (capacidad/perfil_capacidad solo SELECT).
Contrato: rollback: Revertir el seed y los checks de CI; conservar el catálogo previo.. Status: done

#### S1.T3.1 — Seed idempotente de `capacidad` con las claves y descripción exactas de tecnologia/14 §1 (registro completo del catálogo).
Contrato: rollback: Revertir el seed de `capacidad`; conservar el catálogo previo.. Status: done

#### S1.T3.2 — Seed idempotente del perfil Estándar y su matriz (§3 columna E) incluyendo `sesion.cerrar` y excluyendo `rkl.registrar` y `paso.historico.detalle.ver`.
Contrato: rollback: Revertir el seed del perfil Estándar; conservar el perfil previo.. Status: done

#### S1.T3.3 — REVOKE de rol: `capacidad` y `perfil_capacidad` solo SELECT para el rol de app.
Contrato: rollback: Revertir los REVOKE; restaurar los privilegios previos.. Status: done

#### S1.T3.4 — Checks de CI que comparan el catálogo 14, las obligatorias (◎) y las `x-capacidad` del contrato, fallando y nombrando la clave u operación distinta.
Contrato: rollback: Revertir los checks de CI; no afecta datos.. Status: done

#### S1.T4 — Implementar el esquema Drift esquema 1: tablas del Alcance del recorrido V2 y tablas locales mínimas, columnas comunes (id ULID 26, created_at/updated_at, version, device_origin_id, borrado lógico, fechas locales con zona), checks de integridad y DAO append-only sin update/delete, más la prueba de migración desde esquema 1.
Contrato: rollback: Revertir el esquema a la versión previa y las pruebas nuevas; no borrar la base local del usuario.. Status: done

#### S1.T4.1 — Definir las 14 tablas del Alcance y el único `espacio_datos` con estado local y cuenta_id nulo.
Contrato: rollback: Revertir las definiciones de tablas; la base se recrea en la próxima apertura.. Status: done

#### S1.T4.2 — Checks de integridad (tirada d12/d8/d4, resultado/anillo_destino, vigente única por paso_id, numero_paso/ciclo_id+local_date únicos, enums de tecnologia/20).
Contrato: rollback: Revertir los checks; no cambia datos existentes.. Status: done

#### S1.T4.3 — Columnas comunes (ULID, version, device_origin_id) y DAO append-only sin operaciones de actualización/borrado, más la migración desde esquema 1 con datos hacia un esquema 2 de prueba.
Contrato: rollback: Revertir columnas/DAO y la prueba de migración; conservar datos de prueba.. Status: done

#### S1.T5 — Implementar el alta automática de cuenta de dispositivo sobre el esquema Drift ya creado en S1.T4 y el perfil Estándar ya sembrado en S1.T3: endpoint idempotente por `Idempotency-Key`, creación de `cuenta` tipo dispositivo con perfil Estándar y `credencial_dispositivo` hasheada, persistencia de cuenta_id/tipo/estado en Drift, almacenamiento seguro de secreto y tokens, y funcionamiento sin conexión con alta diferida.
Contrato: rollback: Revertir el endpoint y el adaptador de alta; las cuentas ya creadas quedan sin tocar.. Status: done

#### S1.T5.1 — Endpoint idempotente por `Idempotency-Key`: crea `cuenta` tipo dispositivo con perfil Estándar, email nulo, `dispositivo_id` único y `credencial_dispositivo` con el secreto hasheado, respondiendo 201.
Contrato: rollback: Revertir el endpoint; las cuentas ya creadas quedan sin tocar.. Status: done

#### S1.T5.2 — Persistencia local y almacenamiento seguro sobre el esquema Drift esquema 1 entregado en S1.T4: secreto y tokens solo en almacenamiento seguro, y Drift guarda cuenta_id, tipo y estado del alta.
Contrato: rollback: Revertir la persistencia y el almacenamiento seguro; no borra la base local del usuario.. Status: done

#### S1.T5.3 — Alta diferida sin conexión: el recorrido local funciona sin avisos de red y al recuperar conexión la cuenta se crea sin intervención; reintento con la misma `Idempotency-Key` no duplica la cuenta.
Contrato: rollback: Revertir la alta diferida; conservar las cuentas y datos locales existentes.. Status: done

#### S1.T5.4 — Reinstalación y cambio de versión: descarta el secreto residual, genera código y secreto nuevos, obtiene otra cuenta; ante cambio de versión llama a `registrarDispositivo` y el `dispositivo.tipo` refleja smartphone/tablet.
Contrato: rollback: Revertir el manejo de reinstalación/versión; la cuenta anterior queda sin tocar.. Status: done

#### S1.T6 — Implementar el middleware que lee `x-capacidad` y `x-requiere-cuenta` del contrato, verifica contra los perfiles vigentes en cada petición, exime `obligatoria` y deniega con `capacidad_denegada`/`requiere_cuenta_completa`, más el check de CI para operaciones sin `x-capacidad`.
Contrato: rollback: Revertir el middleware; los endpoints vuelven a no autorizar por capacidad.. Status: done

#### S1.T6.1 — Leer `x-capacidad` y `x-requiere-cuenta` de la operación del contrato en cada petición autenticada.
Contrato: rollback: Revertir la lectura de metadatos; no cambia datos.. Status: done

#### S1.T6.2 — Verificar la capacidad contra los perfiles vigentes con relectura por petición y exención de operaciones `obligatoria`.
Contrato: rollback: Revertir la verificación de capacidad; no cambia datos.. Status: done

#### S1.T6.3 — Denegación 403 `capacidad_denegada` y `requiere_cuenta_completa` según tipo de cuenta.
Contrato: rollback: Revertir las denegaciones; los endpoints vuelven a no autorizar por capacidad.. Status: done

#### S1.T6.4 — Check de CI que falla si una operación nueva del contrato no declara `x-capacidad`; la extensión se agrega en la fuente del contrato y los tipos se regeneran con `pnpm -C server run generate` (no se edita `server/contract/generated/api.d.ts` a mano).
Contrato: rollback: Revertir el check de CI; no afecta datos.. Status: done

#### S1.T7 — Escribir los tests de contrato y persistencia de la sesión 1 (sesiones, cuenta de dispositivo, esquema Drift, seed y middleware) que trazan a los casos QA de HU-03a-02, HU-06-01, HU-03a-03, HU-03a-06 y HU-03a-07.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: done

#### S1.T7.1 — Tests de sesiones: emisión (hash guardado, claims), rotación, revocación de familia (`refresh_invalido`) y verificación bearer (`token_expirado`/`no_autenticado`), más los asserts de reuso del contrato generado: el par emitido usa el shape `TokenPair` (accessToken, refreshToken, accessTokenExpiraEn, tipoCuenta, cuentaId) con `TipoCuenta`/`EstadoCuenta` del contrato y los códigos pertenecen al enum `CodigoError`, sin enums ni códigos paralelos declarados en `server/src`.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: done

#### S1.T7.2 — Tests de cuenta de dispositivo: alta idempotente, offline, reinstalación y cambio de versión.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: done

#### S1.T7.3 — Tests de esquema Drift: 14 tablas y `espacio_datos`, checks de integridad y migración desde esquema 1.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: done

#### S1.T7.4 — Tests de seed y middleware: catálogo/perfil sin duplicados y denegaciones `capacidad_denegada`/`requiere_cuenta_completa`.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: done

#### S2.T1 — Implementar `obtenerManifiesto`: calcular `version`/`ETag` desde las asignaciones de perfil vigentes, responder 304 ante `If-None-Match` sin cambios, exponer `capacidades` (Estándar + obligatorias), `capacidadesPorTipoCuenta` y `legalPendiente` no vacío cuando hay versión legal pendiente (200 exento).
Contrato: rollback: Revertir el endpoint; los consumidores vuelven a no tener manifiesto.. Status: pending

#### S2.T2 — Generar y empaquetar el manifiesto Estándar en la app/módulo, y agregar el check de CI que falla nombrando la capacidad distinta si el perfil Estándar del seed cambia sin regenerar el manifiesto empaquetado.
Contrato: rollback: Revertir el manifiesto empaquetado y su check; conservar el seed.. Status: pending

#### S2.T3 — Implementar en la app la caché del manifiesto, el uso del manifiesto empaquetado sin conexión y el refresco al recibir `capacidad_denegada` (repetición de la petición del manifiesto).
Contrato: rollback: Revertir la caché y el refresco; la app vuelve a no aplicar manifiesto.. Status: pending

#### S2.T4 — Escribir los tests de contrato/persistencia del manifiesto (version/ETag/304, capacidades por tipo de cuenta, empaquetado y refresco por denegación) trazados a los casos QA de HU-03a-08.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S3.T1 — Crear la migración de `documento_legal` y `aceptacion_documento_legal` (append-only) con REVOKE explícito: documento_legal SELECT para el rol de app y escritura del script de despliegue; aceptacion_documento_legal SELECT+INSERT con REVOKE de UPDATE/DELETE.
Contrato: rollback: Revertir la migración con su inversa; conservar registros legales existentes y no degradar consentimientos.. Status: pending

#### S3.T2 — Implementar el script de registro de versión legal del pipeline: inserta la fila con `hash_contenido` = SHA-256 del Markdown de `docs/legal/` (convención `terminos-vX.Y.md` / `privacidad-vX.Y.md`), `url_publicada` = `${STAGING_BASE_URL}/legal/<tipo>/<version>` reutilizando la variable `STAGING_BASE_URL` ya existente del pipeline de despliegue (`.github/workflows/deploy-staging.yml`) y `texto_snapshot` nulo; idempotente (no duplica ni altera versiones anteriores), más el check de CI de hash del texto empaquetado contra `docs/legal/`.
Contrato: rollback: Revertir el script y el check; las filas registradas quedan como están (inmutables).. Status: pending

#### S3.T3 — Implementar la lectura pública por API (`obtenerDocumentosLegalesVigentes` sin texto y `obtenerDocumentoLegal` con `hashContenido`/`urlPublicada` y `texto` nulo, 404 `recurso_no_encontrado`) y el servido en `server/` de la página estática `/legal/<tipo>/<version>` (la ruta que apunta `url_publicada`) con el texto de esa versión y su número de versión, sin requerir sesión.
Contrato: rollback: Revertir los endpoints y el servido estático; las versiones registradas quedan intactas.. Status: pending

#### S3.T4 — Empaquetar el texto legal en la app al compilarse: los Markdown viven en `app/assets/legal/` y se declaran como assets en `app/pubspec.yaml`, con su versión; agregar el check de CI que falla si el hash del texto empaquetado difiere de la fuente de `docs/legal/` (`terminos-vX.Y.md` / `privacidad-vX.Y.md`).
Contrato: rollback: Revertir el empaquetado y el check; conservar los textos fuente.. Status: pending

#### S3.T5 — Escribir los tests de documentos legales (registro con hash, idempotencia, publicación por versión, lectura pública, 404 y rechazo de UPDATE/DELETE por rol) trazados a los casos QA de HU-03a-10.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S4.T1 — Implementar `aceptarDocumentosLegales` en línea: dos filas con versión, `aceptada_at`, origen `app`, dispositivo y versión de app; idempotencia por `Idempotency-Key` (sin duplicar, `idempotencia_conflicto` con cuerpo distinto); validaciones `version_legal_desconocida`, `aceptacion_fecha_invalida`, `documento_legal_modificado` con `pendientes` de versiones más nuevas que exigen reaceptación; `listarMisAceptaciones` paginado por cuenta de más reciente a más antigua.
Contrato: rollback: Revertir el endpoint y el listado; las aceptaciones ya insertadas permanecen (append-only).. Status: pending

#### S4.T1.1 — Insertar las dos filas (términos y privacidad) con versión, `aceptada_at`, origen `app`, dispositivo y versión de app.
Contrato: rollback: Revertir la inserción; las aceptaciones ya insertadas permanecen (append-only).. Status: pending

#### S4.T1.2 — Idempotencia por `Idempotency-Key`: la misma petición no duplica filas y con cuerpo distinto responde `idempotencia_conflicto`.
Contrato: rollback: Revertir la idempotencia; no borra aceptaciones existentes.. Status: pending

#### S4.T1.3 — Validaciones de versión/fecha/hash: `version_legal_desconocida`, `aceptacion_fecha_invalida` y `documento_legal_modificado`, con `pendientes` de versiones más nuevas que exigen reaceptación.
Contrato: rollback: Revertir las validaciones; no inserta ni borra filas por sí sola.. Status: pending

#### S4.T1.4 — `listarMisAceptaciones` paginado por cuenta de más reciente a más antigua, sin incluir las de otras cuentas.
Contrato: rollback: Revertir el listado; las aceptaciones quedan intactas.. Status: pending

#### S4.T2 — Implementar la cola offline `registro_legal_pendiente` (versión, hash, fecha y dispositivo), el envío diferido con `aceptada_at` original y `registrada_at` de envío, el bloqueo de otras peticiones hasta el 201 de la cola, el reintento con la misma `Idempotency-Key` y el borrado de la entrada al confirmar 201, con persistencia entre cierres.
Contrato: rollback: Revertir la cola y el envío diferido; conservar las entradas no enviadas del usuario.. Status: pending

#### S4.T2.1 — Persistencia de la cola `registro_legal_pendiente` (versión, hash, fecha y dispositivo) que sobrevive al cierre de la app.
Contrato: rollback: Revertir la persistencia; conservar las entradas no enviadas del usuario.. Status: pending

#### S4.T2.2 — Envío diferido con `aceptada_at` original y `registrada_at` de envío, y borrado de la entrada al recibir 201.
Contrato: rollback: Revertir el envío diferido; conservar las entradas no enviadas.. Status: pending

#### S4.T2.3 — Bloqueo de otras peticiones (`registrarDispositivo`/kuberani) hasta el 201 de la cola y reintento con la misma `Idempotency-Key` sin duplicados.
Contrato: rollback: Revertir el bloqueo y el reintento; no borra entradas de la cola.. Status: pending

#### S4.T2.4 — Manejo de `aceptadaAt` futura: cuando el servidor responde `aceptacion_fecha_invalida`, la entrada sale de la cola `registro_legal_pendiente` y no se reintenta, quedando la cuenta sin aceptación registrada. La re-presentación de V-51 queda en ep01-legal-integration.
Contrato: rollback: Revertir el manejo de fecha inválida; conservar el resto de la cola.. Status: pending

#### S4.T3 — Implementar el bloqueo por reaceptación del lado proveedor: 403 `version_legal_pendiente` con `documentosPendientes` en operaciones autenticadas no exentas, lista de exentas por `x-exenta-version-legal` (`obtenerManifiesto`, `obtenerDocumentoLegal`, `aceptarDocumentosLegales`), y no bloqueo de versiones sin `exige_reaceptacion`. La presentación de V-51 y el retorno al punto previo no entran: quedan en ep01-legal-integration.
Contrato: rollback: Revertir el bloqueo y las exenciones; no cambia datos.. Status: pending

#### S4.T3.1 — Bloqueo 403 `version_legal_pendiente` con `documentosPendientes` en operaciones autenticadas no exentas.
Contrato: rollback: Revertir el bloqueo; no cambia datos.. Status: pending

#### S4.T3.2 — Lista de exentas por `x-exenta-version-legal` (`obtenerManifiesto`, `obtenerDocumentoLegal`, `aceptarDocumentosLegales`).
Contrato: rollback: Revertir las exenciones; el bloqueo vuelve a aplicar a todas las operaciones.. Status: pending

#### S4.T3.3 — No bloqueo de versiones sin `exige_reaceptacion`: al publicarse no bloquean ni aparecen en `legalPendiente`.
Contrato: rollback: Revertir el criterio de no bloqueo; no cambia datos.. Status: pending

#### S4.T3.4 — Prueba generada sobre el contrato que verifica cada operación autenticada según su `x-exenta-version-legal`; la extensión se declara en la fuente del contrato y los tipos se regeneran con `pnpm -C server run generate` (no se edita `server/contract/generated/api.d.ts` a mano).
Contrato: rollback: Revertir la prueba de contrato; no toca código productivo.. Status: pending

#### S4.T4 — Documentar la superficie operativa: comando de seed de capacidades y comando de registro legal con uso, parámetros y ejemplo en `docs/development/commands.md`; claves de configuración nuevas (`JWT_SIGNING_KEY`, `JWT_ACCESS_TTL_MINUTES` default 15, `JWT_REFRESH_TTL_DAYS` default 30 y el uso de `STAGING_BASE_URL` para la `url_publicada` legal) en `docs/development/configuration.md` y en `.env.example`; paso de registro legal en el despliegue en `docs/development/release-runbook.md`.
Contrato: rollback: Revertir los cambios de documentación; no afecta código.. Status: pending

#### S4.T4.1 — Documentar el comando de seed de capacidades en `docs/development/commands.md` con uso, parámetros y ejemplo.
Contrato: rollback: Revertir la sección de commands.md; no afecta código.. Status: pending

#### S4.T4.2 — Documentar el comando de registro legal en `docs/development/commands.md` con uso, parámetros y ejemplo.
Contrato: rollback: Revertir la sección de commands.md; no afecta código.. Status: pending

#### S4.T4.3 — Listar en `docs/development/configuration.md` las claves de configuración nuevas: `JWT_SIGNING_KEY` (obligatoria, sin valor de ejemplo real), `JWT_ACCESS_TTL_MINUTES` (default 15), `JWT_REFRESH_TTL_DAYS` (default 30) y el uso de `STAGING_BASE_URL` para componer la `url_publicada` legal; declararlas también en `.env.example` para mantener la paridad schema-ejemplo que exige `scripts/dev/env-parity.test.mjs`.
Contrato: rollback: Revertir la sección de configuration.md; no afecta código.. Status: pending

#### S4.T4.4 — Registrar en `docs/development/release-runbook.md` el paso de ejecución del script de registro de versión legal en el despliegue de staging (incluida la dependencia de `STAGING_BASE_URL`).
Contrato: rollback: Revertir la sección de release-runbook.md; no afecta código.. Status: pending

#### S4.T5 — Correr el job de lint de docs local y dejar compliant cualquier doc referenciado que el plan llegue a tocar (`docs/backlog/EP-03a_...md`, `docs/backlog/EP-06_...md`).
Contrato: rollback: Revertir los ajustes de lint; los docs vuelven a su estado previo si el job no aplica.. Status: pending

#### S4.T5.1 — Correr markdownlint, cspell y vale sobre `docs/backlog/EP-03a_...md` y `docs/backlog/EP-06_...md` y dejar los archivos compliant.
Contrato: rollback: Revertir los ajustes de lint; los docs vuelven a su estado previo.. Status: pending

#### S4.T5.2 — Verificar que el job de docs local quede verde antes del PR si el plan tocó esos docs.
Contrato: rollback: Revertir la verificación; no afecta los docs.. Status: pending

#### S4.T6 — Escribir los tests de aceptación legal (online, idempotencia, cola offline con fecha original, bloqueo/exenciones por reaceptación) trazados a los casos QA de HU-03a-11, HU-03a-12 y HU-03a-13, sin declarar pruebas manuales como aprobadas.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S4.T6.1 — Tests de aceptación en línea e idempotencia (`idempotencia_conflicto` con cuerpo distinto, dos toques dejan solo dos filas).
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S4.T6.2 — Tests de cola offline con `aceptada_at` original al reconectar y reintento con la misma `Idempotency-Key`.
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S4.T6.3 — Tests de bloqueo/exenciones por reaceptación (`version_legal_pendiente`, exentas por `x-exenta-version-legal`).
Contrato: rollback: Revertir los archivos de test nuevos; no toca código productivo.. Status: pending

#### S4.T6.4 — Tests de cola offline en la app: guardado sin red, envío con fecha original, orden, borrado/reintento y salida por aceptacion_fecha_invalida.
Contrato: rollback: Revertir los tests de cola offline.. Status: pending

#### S4.T6.5 — Tests de bloqueo generados sobre el conjunto de operaciones autenticadas del contrato según x-exenta-version-legal, más las exentas y las versiones sin exige_reaceptacion.
Contrato: rollback: Revertir los tests de bloqueo.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por TAO-192 · Preparación EP-01: identidad, autorización, manifiesto y contratos legales
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- delete S2.T1.1
- delete S2.T1.2
- delete S2.T1.3
- delete S2.T2.1
- delete S2.T2.2
- delete S2.T3.1
- delete S2.T3.2
- delete S2.T4.1
- delete S2.T4.2
- delete S3.T1.1
- delete S3.T1.2
- delete S3.T1.3
- delete S3.T2.1
- delete S3.T2.2
- delete S3.T2.3
- delete S3.T3.1
- delete S3.T3.2
- delete S3.T3.3
- delete S3.T4.1
- delete S3.T4.2
- delete S4.T5.3
- delete S4.T5.4

### Enmienda 2
**REQs:**

- REQ-01 (edit) `confirmed`: El servidor emite un par de tokens por sesión (access token JWT corto firmado con `jose` y refresh opaco guardado hasheado en `sesion_auth`)
- REQ-07 (edit) `confirmed`: Términos y privacidad existen como versiones inmutables en `documento_legal`, con `hash_contenido` = SHA-256 del Markdown de `docs/legal/` (
- REQ-11 (edit) `confirmed`: La superficie operativa nueva queda documentada en la documentación de desarrollo del repo: el comando de seed de capacidades y el de regist
- REQ-14 (edit) `confirmed`: El paquete reutiliza los tipos y códigos del contrato generado (`TokenPair`, `CodigoError`, `Problem`, `TipoCuenta`, `EstadoCuenta`, `Dispos

**Task ops:**

- edit S1.T1 { verify=["pnpm -C server exec prisma validate"] }
- edit S1.T1.1 { verify=["pnpm -C server exec prisma validate"] }
- edit S1.T1.2 { verify=["pnpm -C server exec prisma validate"] }
- edit S1.T1.3 { verify=["pnpm -C server exec prisma validate"] }
- edit S1.T1.4 { verify=["pnpm -C server exec prisma validate"] }
- edit S1.T2 { desc="Implementar el servicio de sesiones: emisión de access token JWT firmado con `jose` usando la clave `JWT_SIGNING_KEY` (claims cuenta, tipo, dispositivo y versión del manifiesto) y refresh opaco hasheado en `sesion_auth`, renovación con rotación y revocación de familia, y verificación bearer, con las expiraciones tomadas de `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30) validadas en el schema zod de `server/src/config.ts`.", verify=["pnpm -C server run test -- test/auth/session-emit.test.ts","pnpm -C server run test -- test/auth/session-rotate.test.ts","pnpm -C server run test -- test/auth/bearer-verify.test.ts"] }
- edit S1.T2.1 { desc="Emitir sesión: JWT `jose` firmado con `JWT_SIGNING_KEY` y claims cuenta/tipo/dispositivo/versión-manifiesto, refresh opaco hasheado en `sesion_auth` (nunca el valor), expiraciones tomadas de `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30); el par devuelto usa el shape `TokenPair` del contrato generado.", verify=["pnpm -C server run test -- test/auth/session-emit.test.ts"] }
- edit S1.T2.2 { verify=["pnpm -C server run test -- test/auth/session-rotate.test.ts"] }
- edit S1.T2.3 { desc="Verificación bearer: 401 `token_expirado` para token vencido, 401 `no_autenticado` para firma inválida o sin token. Validar la configuración con zod en el schema de `server/src/config.ts` siguiendo el patrón existente (`loadConfigOrExit` / `describeConfigError`): `JWT_SIGNING_KEY` obligatoria, `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30); sin `JWT_SIGNING_KEY` el arranque falla temprano nombrando la variable sin imprimir su valor. Declarar las tres claves en `.env.example` para mantener la paridad schema-ejemplo que exige `scripts/dev/env-parity.test.mjs`, y redactar los logs (sin refreshToken/accessToken/Authorization).", verify=["pnpm -C server run test -- test/auth/bearer-verify.test.ts","node --test scripts/dev/env-parity.test.mjs"] }
- edit S1.T3 { verify=["pnpm -C server run test -- test/device/registro-cuenta.test.ts"] }
- edit S1.T3.1 { verify=["pnpm -C server run test -- test/device/registro-cuenta.test.ts"] }
- edit S1.T3.2 { verify=["cd app && fvm flutter test test/device/alta_persistencia_test.dart"] }
- edit S1.T3.3 { verify=["cd app && fvm flutter test test/device/alta_offline_test.dart"] }
- edit S1.T3.4 { verify=["cd app && fvm flutter test test/device/reinstalacion_version_test.dart"] }
- edit S1.T4 { verify=["cd app && fvm flutter test test/drift/schema_v1_test.dart"] }
- edit S1.T4.1 { verify=["cd app && fvm flutter test test/drift/schema_v1_test.dart"] }
- edit S1.T4.2 { verify=["cd app && fvm flutter test test/drift/checks_test.dart"] }
- edit S1.T4.3 { verify=["cd app && fvm flutter test test/drift/migration_test.dart"] }
- edit S1.T5 { verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T5.1 { verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T5.2 { verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T5.3 { verify=["pnpm -C server run test -- test/capacidades/privilegios.test.ts"] }
- edit S1.T5.4 { verify=["pnpm -C server run test -- test/capacidades/ci-checks.test.ts"] }
- edit S1.T6 { verify=["pnpm -C server run test -- test/auth/middleware-capacidad.test.ts"] }
- edit S1.T6.1 { verify=["pnpm -C server run test -- test/auth/middleware-capacidad.test.ts"] }
- edit S1.T6.2 { verify=["pnpm -C server run test -- test/auth/middleware-capacidad.test.ts"] }
- edit S1.T6.3 { verify=["pnpm -C server run test -- test/auth/middleware-capacidad.test.ts"] }
- edit S1.T6.4 { desc="Check de CI que falla si una operación nueva del contrato no declara `x-capacidad`; la extensión se agrega en la fuente del contrato y los tipos se regeneran con `pnpm -C server run generate` (no se edita `server/contract/generated/api.d.ts` a mano).", verify=["pnpm -C server run test -- test/auth/ci-capacidad.test.ts","pnpm -C server run generate"] }
- edit S1.T7 { verify=["pnpm -C server run test -- test/s01","cd app && fvm flutter test test/drift"] }
- edit S1.T7.1 { desc="Tests de sesiones: emisión (hash guardado, claims), rotación, revocación de familia (`refresh_invalido`) y verificación bearer (`token_expirado`/`no_autenticado`), más los asserts de reuso del contrato generado: el par emitido usa el shape `TokenPair` (accessToken, refreshToken, accessTokenExpiraEn, tipoCuenta, cuentaId) con `TipoCuenta`/`EstadoCuenta` del contrato y los códigos pertenecen al enum `CodigoError`, sin enums ni códigos paralelos declarados en `server/src`.", validates=["REQ-01","REQ-14"], verify=["pnpm -C server run test -- test/s01"] }
- edit S1.T7.2 { verify=["pnpm -C server run test -- test/s01"] }
- edit S1.T7.3 { verify=["cd app && fvm flutter test test/drift"] }
- edit S1.T7.4 { verify=["pnpm -C server run test -- test/s01"] }
- edit S2.T1 { verify=["pnpm -C server run test -- test/manifiesto/obtener.test.ts"] }
- edit S2.T2 { verify=["pnpm -C server run test -- test/manifiesto/empaquetado.test.ts"] }
- edit S2.T3 { verify=["cd app && fvm flutter test test/manifiesto/cache_test.dart"] }
- edit S2.T4 { verify=["pnpm -C server run test -- test/manifiesto","cd app && fvm flutter test test/manifiesto"] }
- edit S3.T1 { verify=["pnpm -C server exec prisma validate"] }
- edit S3.T2 { desc="Implementar el script de registro de versión legal del pipeline: inserta la fila con `hash_contenido` = SHA-256 del Markdown de `docs/legal/` (convención `terminos-vX.Y.md` / `privacidad-vX.Y.md`), `url_publicada` = `${STAGING_BASE_URL}/legal/<tipo>/<version>` reutilizando la variable `STAGING_BASE_URL` ya existente del pipeline de despliegue (`.github/workflows/deploy-staging.yml`) y `texto_snapshot` nulo; idempotente (no duplica ni altera versiones anteriores), más el check de CI de hash del texto empaquetado contra `docs/legal/`.", verify=["pnpm -C server run test -- test/legal/registro-version.test.ts"] }
- edit S3.T3 { desc="Implementar la lectura pública por API (`obtenerDocumentosLegalesVigentes` sin texto y `obtenerDocumentoLegal` con `hashContenido`/`urlPublicada` y `texto` nulo, 404 `recurso_no_encontrado`) y el servido en `server/` de la página estática `/legal/<tipo>/<version>` (la ruta que apunta `url_publicada`) con el texto de esa versión y su número de versión, sin requerir sesión.", verify=["pnpm -C server run test -- test/legal/lectura.test.ts"] }
- edit S3.T4 { desc="Empaquetar el texto legal en la app al compilarse: los Markdown viven en `app/assets/legal/` y se declaran como assets en `app/pubspec.yaml`, con su versión; agregar el check de CI que falla si el hash del texto empaquetado difiere de la fuente de `docs/legal/` (`terminos-vX.Y.md` / `privacidad-vX.Y.md`).", verify=["cd app && fvm flutter test test/legal/empaquetado_test.dart"] }
- edit S3.T5 { verify=["pnpm -C server run test -- test/legal"] }
- edit S4.T1 { verify=["pnpm -C server run test -- test/legal/aceptar-online.test.ts"] }
- edit S4.T1.1 { verify=["pnpm -C server run test -- test/legal/aceptar-online.test.ts"] }
- edit S4.T1.2 { verify=["pnpm -C server run test -- test/legal/aceptar-online.test.ts"] }
- edit S4.T1.3 { verify=["pnpm -C server run test -- test/legal/aceptar-online.test.ts"] }
- edit S4.T1.4 { verify=["pnpm -C server run test -- test/legal/aceptar-online.test.ts"] }
- edit S4.T2 { verify=["cd app && fvm flutter test test/legal/cola-offline_test.dart"] }
- edit S4.T2.1 { verify=["cd app && fvm flutter test test/legal/cola-offline_test.dart"] }
- edit S4.T2.2 { verify=["cd app && fvm flutter test test/legal/cola-offline_test.dart"] }
- edit S4.T2.3 { verify=["cd app && fvm flutter test test/legal/cola-offline_test.dart"] }
- edit S4.T2.4 { verify=["cd app && fvm flutter test test/legal/cola-offline_test.dart"] }
- edit S4.T3 { verify=["pnpm -C server run test -- test/legal/bloqueo-reaceptacion.test.ts"] }
- edit S4.T3.1 { verify=["pnpm -C server run test -- test/legal/bloqueo-reaceptacion.test.ts"] }
- edit S4.T3.2 { verify=["pnpm -C server run test -- test/legal/bloqueo-reaceptacion.test.ts"] }
- edit S4.T3.3 { verify=["pnpm -C server run test -- test/legal/bloqueo-reaceptacion.test.ts"] }
- edit S4.T3.4 { desc="Prueba generada sobre el contrato que verifica cada operación autenticada según su `x-exenta-version-legal`; la extensión se declara en la fuente del contrato y los tipos se regeneran con `pnpm -C server run generate` (no se edita `server/contract/generated/api.d.ts` a mano).", verify=["pnpm -C server run test -- test/legal/contrato-exenciones.test.ts","pnpm -C server run generate"] }
- edit S4.T4 { desc="Documentar la superficie operativa: comando de seed de capacidades y comando de registro legal con uso, parámetros y ejemplo en `docs/development/commands.md`; claves de configuración nuevas (`JWT_SIGNING_KEY`, `JWT_ACCESS_TTL_MINUTES` default 15, `JWT_REFRESH_TTL_DAYS` default 30 y el uso de `STAGING_BASE_URL` para la `url_publicada` legal) en `docs/development/configuration.md` y en `.env.example`; paso de registro legal en el despliegue en `docs/development/release-runbook.md`.", verify=["pnpm run docs:check","node --test scripts/dev/env-parity.test.mjs"] }
- edit S4.T4.1 { verify=["pnpm run docs:check"] }
- edit S4.T4.2 { verify=["pnpm run docs:check"] }
- edit S4.T4.3 { desc="Listar en `docs/development/configuration.md` las claves de configuración nuevas: `JWT_SIGNING_KEY` (obligatoria, sin valor de ejemplo real), `JWT_ACCESS_TTL_MINUTES` (default 15), `JWT_REFRESH_TTL_DAYS` (default 30) y el uso de `STAGING_BASE_URL` para componer la `url_publicada` legal; declararlas también en `.env.example` para mantener la paridad schema-ejemplo que exige `scripts/dev/env-parity.test.mjs`.", verify=["pnpm run docs:check","node --test scripts/dev/env-parity.test.mjs"] }
- edit S4.T4.4 { desc="Registrar en `docs/development/release-runbook.md` el paso de ejecución del script de registro de versión legal en el despliegue de staging (incluida la dependencia de `STAGING_BASE_URL`).", verify=["pnpm run docs:check"] }
- edit S4.T5 { verify=["pnpm run docs:check"] }
- edit S4.T5.1 { verify=["pnpm run docs:check"] }
- edit S4.T5.2 { verify=["pnpm run docs:check"] }
- edit S4.T6 { verify=["pnpm -C server run test -- test/legal","cd app && fvm flutter test test/legal"] }
- edit S4.T6.1 { verify=["pnpm -C server run test -- test/legal"] }
- edit S4.T6.2 { verify=["cd app && fvm flutter test test/legal"] }
- edit S4.T6.3 { verify=["pnpm -C server run test -- test/legal"] }
- edit S4.T6.4 { verify=["cd app && fvm flutter test test/legal_cola_test.dart"] }
- edit S4.T6.5 { verify=["pnpm -C server run test -- test/legal-bloqueo.test.ts"] }

### Enmienda 3
**REQs:**

- REQ-10 (edit) `confirmed`: Ante una versión legal nueva con `exige_reaceptacion` el servidor detiene el servicio: responde 403 `version_legal_pendiente` con `documento

**Task ops:**

- edit S1.T3 { desc="Implementar el seed idempotente del catálogo 14 (§1) y del perfil Estándar (§3 columna E) con su matriz, más los checks de CI que comparan catálogo, obligatorias (◎) y `x-capacidad` del contrato; incluir los REVOKE de rol (capacidad/perfil_capacidad solo SELECT).", rollback="Revertir el seed y los checks de CI; conservar el catálogo previo.", validates=["REQ-05","REQ-13"], verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T3.1 { desc="Seed idempotente de `capacidad` con las claves y descripción exactas de tecnologia/14 §1 (registro completo del catálogo).", rollback="Revertir el seed de `capacidad`; conservar el catálogo previo.", validates=["REQ-05"], verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T3.2 { desc="Seed idempotente del perfil Estándar y su matriz (§3 columna E) incluyendo `sesion.cerrar` y excluyendo `rkl.registrar` y `paso.historico.detalle.ver`.", rollback="Revertir el seed del perfil Estándar; conservar el perfil previo.", validates=["REQ-05"], verify=["pnpm -C server run test -- test/capacidades/seed.test.ts"] }
- edit S1.T3.3 { desc="REVOKE de rol: `capacidad` y `perfil_capacidad` solo SELECT para el rol de app.", rollback="Revertir los REVOKE; restaurar los privilegios previos.", validates=["REQ-13"], verify=["pnpm -C server run test -- test/capacidades/privilegios.test.ts"] }
- edit S1.T3.4 { desc="Checks de CI que comparan el catálogo 14, las obligatorias (◎) y las `x-capacidad` del contrato, fallando y nombrando la clave u operación distinta.", rollback="Revertir los checks de CI; no afecta datos.", validates=["REQ-05"], verify=["pnpm -C server run test -- test/capacidades/ci-checks.test.ts"] }
- edit S1.T5 { desc="Implementar el alta automática de cuenta de dispositivo sobre el esquema Drift ya creado en S1.T4 y el perfil Estándar ya sembrado en S1.T3: endpoint idempotente por `Idempotency-Key`, creación de `cuenta` tipo dispositivo con perfil Estándar y `credencial_dispositivo` hasheada, persistencia de cuenta_id/tipo/estado en Drift, almacenamiento seguro de secreto y tokens, y funcionamiento sin conexión con alta diferida.", rollback="Revertir el endpoint y el adaptador de alta; las cuentas ya creadas quedan sin tocar.", validates=["REQ-03"], verify=["pnpm -C server run test -- test/device/registro-cuenta.test.ts"] }
- edit S1.T5.1 { desc="Endpoint idempotente por `Idempotency-Key`: crea `cuenta` tipo dispositivo con perfil Estándar, email nulo, `dispositivo_id` único y `credencial_dispositivo` con el secreto hasheado, respondiendo 201.", rollback="Revertir el endpoint; las cuentas ya creadas quedan sin tocar.", validates=["REQ-03"], verify=["pnpm -C server run test -- test/device/registro-cuenta.test.ts"] }
- edit S1.T5.2 { desc="Persistencia local y almacenamiento seguro sobre el esquema Drift esquema 1 entregado en S1.T4: secreto y tokens solo en almacenamiento seguro, y Drift guarda cuenta_id, tipo y estado del alta.", rollback="Revertir la persistencia y el almacenamiento seguro; no borra la base local del usuario.", validates=["REQ-03"], verify=["cd app && fvm flutter test test/device/alta_persistencia_test.dart"] }
- edit S1.T5.3 { desc="Alta diferida sin conexión: el recorrido local funciona sin avisos de red y al recuperar conexión la cuenta se crea sin intervención; reintento con la misma `Idempotency-Key` no duplica la cuenta.", rollback="Revertir la alta diferida; conservar las cuentas y datos locales existentes.", validates=["REQ-03"], verify=["cd app && fvm flutter test test/device/alta_offline_test.dart"] }
- edit S1.T5.4 { desc="Reinstalación y cambio de versión: descarta el secreto residual, genera código y secreto nuevos, obtiene otra cuenta; ante cambio de versión llama a `registrarDispositivo` y el `dispositivo.tipo` refleja smartphone/tablet.", rollback="Revertir el manejo de reinstalación/versión; la cuenta anterior queda sin tocar.", validates=["REQ-03"], verify=["cd app && fvm flutter test test/device/reinstalacion_version_test.dart"] }
- edit S4.T2.4 { desc="Manejo de `aceptadaAt` futura: cuando el servidor responde `aceptacion_fecha_invalida`, la entrada sale de la cola `registro_legal_pendiente` y no se reintenta, quedando la cuenta sin aceptación registrada. La re-presentación de V-51 queda en ep01-legal-integration.", rollback="Revertir el manejo de fecha inválida; conservar el resto de la cola." }
- edit S4.T3 { desc="Implementar el bloqueo por reaceptación del lado proveedor: 403 `version_legal_pendiente` con `documentosPendientes` en operaciones autenticadas no exentas, lista de exentas por `x-exenta-version-legal` (`obtenerManifiesto`, `obtenerDocumentoLegal`, `aceptarDocumentosLegales`), y no bloqueo de versiones sin `exige_reaceptacion`. La presentación de V-51 y el retorno al punto previo no entran: quedan en ep01-legal-integration.", rollback="Revertir el bloqueo y las exenciones; no cambia datos." }
## Decisions

### DEC-LOCAL-01: plan-dedup → auto-pruned
Recorte por exceso aplicado en autónomo: S2.T1.1, S2.T1.2, S2.T1.3, S2.T2.1, S2.T2.2, S2.T3.1, S2.T3.2, S2.T4.1, S2.T4.2, S3.T1.1, S3.T1.2, S3.T1.3, S3.T2.1, S3.T2.2, S3.T2.3, S3.T3.1, S3.T3.2, S3.T3.3, S3.T4.1, S3.T4.2, S4.T5.3, S4.T5.4

## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T3.4
- [x] S1.T4
- [x] S1.T4.1
- [x] S1.T4.2
- [x] S1.T4.3
- [x] S1.T5
- [x] S1.T5.1
- [x] S1.T5.2
- [x] S1.T5.3
- [x] S1.T5.4
- [x] S1.T6
- [x] S1.T6.1
- [x] S1.T6.2
- [x] S1.T6.3
- [x] S1.T6.4
- [x] S1.T7
- [x] S1.T7.1
- [x] S1.T7.2
- [x] S1.T7.3
- [x] S1.T7.4

**Gate (auto)**: El servidor emite/rota/revoca sesiones (201/200/`refresh_invalido`, 401 `token_expirado`/`no_autenticado`), crea la cuenta de dispositivo en primer uso (201 con perfil Estándar y credencial hasheada), el seed deja el catálogo 14 y perfil Estándar sin duplicados y el middleware deniega por capacidad/cuenta (403); la base Drift abre en esquema 1 con las 14 tablas y un `espacio_datos` local. Verificable por tests de contrato/persistencia y psql.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: `obtenerManifiesto` devuelve `version`, `ETag` y `capacidades` (Estándar + obligatorias) con `capacidadesPorTipoCuenta`; con `If-None-Match` responde 304; un cambio de asignación de perfil cambia version/ETag; la app sin conexión usa el manifiesto Estándar empaquetado y al recibir `capacidad_denegada` vuelve a pedir el manifiesto. Verificable por respuesta del endpoint y CI de regeneración.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5

**Gate (auto)**: `GET /v1/legal/documentos` devuelve la vigente de cada tipo con `hashContenido` y `urlPublicada` y `texto` nulo; `obtenerDocumentoLegal` inexistente responde 404 `recurso_no_encontrado`; cada `urlPublicada` sirve su versión sin sesión; el rol de app no puede UPDATE/DELETE `aceptacion_documento_legal`; el CI falla si el texto empaquetado no coincide con la fuente. Verificable por API y psql.

### Session 4 · T3 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T1.1
- [ ] S4.T1.2
- [ ] S4.T1.3
- [ ] S4.T1.4
- [ ] S4.T2
- [ ] S4.T2.1
- [ ] S4.T2.2
- [ ] S4.T2.3
- [ ] S4.T2.4
- [ ] S4.T3
- [ ] S4.T3.1
- [ ] S4.T3.2
- [ ] S4.T3.3
- [ ] S4.T3.4
- [ ] S4.T4
- [ ] S4.T4.1
- [ ] S4.T4.2
- [ ] S4.T4.3
- [ ] S4.T4.4
- [ ] S4.T5
- [ ] S4.T5.1
- [ ] S4.T5.2
- [ ] S4.T6
- [ ] S4.T6.1
- [ ] S4.T6.2
- [ ] S4.T6.3
- [ ] S4.T6.4
- [ ] S4.T6.5

**Gate (auto)**: `aceptarDocumentosLegales` crea dos filas con versión/fecha/origen/dispositivo y es idempotente; la cola offline registra `aceptada_at` original al reconectar; `listarMisAceptaciones` pagina por cuenta; las operaciones no exentas responden 403 `version_legal_pendiente` mientras que manifiesto/documentos/aceptar se atienden. Verificable por respuestas de API, staging y cola local.

### Session 5 · T0 · open
## Datos a confirmar antes de ejecutar

Sin pendientes. Los valores que antes figuraban como "a confirmar" quedaron fijados en los requisitos vinculantes:

- Firma JWT: `JWT_SIGNING_KEY` obligatoria (fallo temprano nombrando la variable, sin imprimir su valor), `JWT_ACCESS_TTL_MINUTES` (default 15) y `JWT_REFRESH_TTL_DAYS` (default 30) — REQ-01, REQ-11.
- Documentos legales: `url_publicada = ${STAGING_BASE_URL}/legal/<tipo>/<version>` reutilizando la variable del pipeline; `docs/legal/` (ya existente) y texto empaquetado en `app/assets/legal/` verificado por hash — REQ-07, REQ-11.
- Comandos de verificación: `pnpm -C server run test`/`typecheck`/`lint`, `fvm flutter test` dentro de `app/`, `python3 -m unittest discover -s tests`, `pnpm run docs:check` (job `docs` del CI) y `pnpm -C server run generate` para el contrato — REQ-01, REQ-11, REQ-14.

La presentación y el retorno de V-51 y el menú real por capacidades permanecen en sus consumidores (fases ep01-legal-integration y ep01-capabilities-integration), no en esta preparación.

