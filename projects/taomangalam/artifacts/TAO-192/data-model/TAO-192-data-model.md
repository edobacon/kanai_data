# Modelo de datos afectado · TAO-192 · Preparación de EP-01

Ticket: **TAO-192** · módulo `EP-03a` · rama `epic/EP-01` · prepara HU-03a-02, HU-03a-06, HU-06-01, HU-03a-03, HU-03a-07, HU-03a-08, HU-03a-10, HU-03a-11, HU-03a-12 y HU-03a-13.

Fuentes normativas: `docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md` §1–§3, §9–§11 y §15; `docs/product/tecnologia/11_modelo_de_datos.md`; `docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md` §1, §3–§5; `docs/product/tecnologia/03_modelo_de_permisos.md`; `docs/product/tecnologia/15_contrato_openapi.md`; `docs/legal/README.md`; decisiones DEC-026, DEC-153, DEC-154, DEC-161, DEC-162, DEC-200, DEC-208, DEC-212, DEC-219, DEC-220, DEC-222, DEC-224, DEC-225, DEC-232; contrato `server/contract/openapi.yaml`; repo `server/prisma/` y `app/`.

---

## 0. Leyenda y convenciones

| Marca | Significado |
|---|---|
| **EXISTENTE** | Ya está en el repo (Prisma/PostgreSQL o Drift) y no cambia de forma en este ticket. |
| **NUEVA** | Migración nueva de este paquete de preparación. |
| **NUEVA · canónica pendiente** | Definida en el modelo canónico (doc 20/11) pero aún no materializada; esta preparación la crea. |
| **DIFERIDA** | Canónica o de EP-03b/EP-15/EP-09, fuera de este ticket; se nombra solo para no colisionar. |

Convenciones aplicadas (doc 20 §1 y §11):

- Ids de dominio expuestos por contrato: **ULID** (texto de 26, Crockford base32), generados por el servidor o en cliente; el generador `ulid` ya existe en `server/` (`server/src/middleware/request-id.ts`).
- Enums: **enum PostgreSQL** para conjuntos cerrados y **`text + check`** cuando el conjunto se espera que crezca; los valores son los del contrato (minúscula, en español). No se codifican niveles en la app.
- Hashes de secreto/refresh: SHA-256 en hexadecimal `char(64)`; nunca el valor en claro. Comparación en tiempo constante.
- Fechas absolutas `timestamptz(3)`; fechas de negocio locales `date` (`local_date`) + `timezone_id`, sin reconstruir la zona.
- Los enums y códigos de error del contrato son **fuente única** (REQ-14): el modelo los consume, no los redefine.

---

## 1. Mapa de capas afectadas

| Capa | Dónde | Entidades de este ticket |
|---|---|---|
| Plataforma (solo PostgreSQL) | `server/prisma/schema.prisma` + migraciones | `cuenta`, `dispositivo`, `credencial_dispositivo`, `sesion_auth`, `perfil`, `capacidad`, `perfil_capacidad`, `cuenta_perfil`, `manifiesto_acceso_version`, `documento_legal`, `aceptacion_documento_legal`, `idempotencia_solicitud` (brecha §9) |
| Dominio local (solo Drift) | `app/lib/data/` (nuevo), esquema versionado | `espacio_datos`, `consultante`, `consulta`, `consulta_descripcion_revision`, `paso_recorrido`, `tirada_revision`, `plan_practica`, `accion_practica`, `ciclo_practica`, `cumplimiento_dia`, `cumplimiento_correccion`, `evento_plan`, `preferencia_local`, `estado_onboarding` |
| Operación local (solo Drift) | igual | `registro_legal_pendiente`; caché de manifiesto (`manifiesto_cache`, brecha §9) |
| Almacenamiento seguro del sistema (no es tabla) | `flutter_secure_storage` | `dispositivo.codigo`, `dispositivo.secreto`, `accessToken`, `refreshToken`, `Idempotency-Key` del alta en curso |
| Artefacto empaquetado (no es tabla) | `app/assets/` | manifiesto del perfil Estándar y textos legales vigentes con su hash |
| Servidor existente (solo lectura / datos operativos) | ya en repo | `configuracion_clave`, `configuracion_version`, `app_metadata`, `app_release` |

**Colisión de nombres a resolver:** `app/assets/manifest.json` ya existe y es el **catálogo de assets** (schemaVersion 1, sistema visual), no el manifiesto de acceso. El manifiesto de acceso empaquetado (DEC-232) debe ir en un artefacto distinto (propuesta: `app/assets/acceso/manifiesto-estandar.json`).

---

## 2. PostgreSQL · Identidad y sesión

### 2.1 `cuenta` — NUEVA · canónica pendiente

Dueña de identidad (HU-03a-03). Consumida por sesión, cuentas, perfiles, legal y métricas.

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `tipo` | enum | sí | `TipoCuenta` = `dispositivo`, `completa` | describe la forma de identificarse, no los permisos |
| `email_normalizado` | text | no | — | nulo en `dispositivo`; obligatorio en `completa` |
| `email_cifrado` | text | no | — | contacto cifrado; nulo en `dispositivo` |
| `email_verificado_at` | timestamptz(3) | no | — | — |
| `estado` | enum | sí | `EstadoCuenta` = `invitacion_pendiente`, `pendiente_verificacion`, `activa`, `suspendida`, `en_eliminacion`, `eliminada`, `fusionada` | `activa` |
| `locale` | text | no | — | del alta (HU-03a-03) |
| `timezone_id` | text | no | — | del alta |
| `dispositivo_id` | text(26) | no | FK `dispositivo` | vínculo 1:1 de la cuenta de dispositivo |
| `convertida_at` | timestamptz(3) | no | — | DE EP-03b: conversión conserva `id` |
| `fusionada_en_cuenta_id` | text(26) | no | FK `cuenta` (self) | DE EP-03b |
| `ultima_actividad_at` | timestamptz(3) | no | — | última petición autenticada; insumo del job de purga por inactividad (DEC-224, EP-03b) |
| `created_at` | timestamptz(3) | sí | — | `now()` |
| `updated_at` | timestamptz(3) | sí | — | — |
| `deleted_at` | timestamptz(3) | no | — | borrado lógico |

Restricciones e índices:

- Check `tipo`: `dispositivo` ⟹ `dispositivo_id IS NOT NULL AND email_normalizado IS NULL`; `completa` ⟹ `email_normalizado IS NOT NULL`.
- Índice único parcial `unique(dispositivo_id) WHERE tipo = 'dispositivo' AND deleted_at IS NULL`.
- Índice único parcial `unique(email_normalizado) WHERE deleted_at IS NULL` (solo `completa`; un email nulo no colisiona en PostgreSQL).
- Índice `(estado, ultima_actividad_at)` para el barrido de purga.
- Sin cascada física hacia eventos/auditoría/comprobantes (doc 20 §11).

### 2.2 `dispositivo` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `codigo` | text | sí | unique | código del aparato (DEC-026) |
| `cuenta_id` | text(26) | no | FK `cuenta` | nulo hasta vincular; ver redundancia en §9 |
| `tipo` | enum | sí | `TipoDispositivo` = `smartphone`, `tablet` | — |
| `plataforma` | enum | sí | `Plataforma` = `ios`, `android` | — |
| `marca` | text | no | — | — |
| `modelo` | text | no | — | — |
| `os` | text | no | — | versión del SO |
| `app_version` | text | sí | — | se actualiza con `registrarDispositivo` |
| `nombre` | text | no | — | etiqueta editable |
| `ultima_actividad_at` | timestamptz(3) | no | — | — |
| `created_at` / `updated_at` | timestamptz(3) | sí | — | `now()` |
| `deleted_at` | timestamptz(3) | no | — | — |

Índices: `unique(codigo)`; índice `(cuenta_id)`.

### 2.3 `credencial_dispositivo` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `cuenta_id` | text(26) | sí | PK, FK `cuenta` | 1:1 con cuenta (DEC-212) |
| `dispositivo_id` | text(26) | sí | unique, FK `dispositivo` | un dispositivo, una credencial |
| `secreto_hash` | char(64) | sí | — | SHA-256 del secreto (≥32 chars) |
| `algoritmo` | text | sí | — | `sha256` (secreto de alta entropía; argon2id se reserva a contraseñas) |
| `created_at` | timestamptz(3) | sí | — | `now()` |
| `revocada_at` | timestamptz(3) | no | — | al eliminar/purgar la cuenta |
| `motivo_revocacion` | text | no | — | p. ej. `eliminacion`, `sustitucion` |

Índices: `unique(dispositivo_id)`; `unique(cuenta_id)` por PK.

### 2.4 `sesion_auth` — NUEVA · canónica pendiente

Soporta HU-03a-02 (emisión, rotación, reuso, revocación). Una fila por refresh emitido; la **familia** agrupa la cadena de rotaciones.

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID de la sesión/refresh |
| `cuenta_id` | text(26) | sí | FK `cuenta` | — |
| `dispositivo_id` | text(26) | sí | FK `dispositivo` | — |
| `familia` | text(26) | sí | — | ULID de familia, igual en toda la cadena |
| `refresh_hash` | char(64) | sí | unique | SHA-256 del refresh; nunca el valor |
| `algoritmo` | text | sí | — | `sha256` |
| `emitida_at` | timestamptz(3) | sí | — | `now()` |
| `expira_at` | timestamptz(3) | sí | — | `emitida_at` + `auth.refresh_token_ttl_dias` (30) |
| `rotada_at` | timestamptz(3) | no | — | al renovar; si se vuelve a presentar ⟹ reuso |
| `sustituida_por_id` | text(26) | no | FK `sesion_auth` (self) | refresh que la reemplazó |
| `revocada_at` | timestamptz(3) | no | — | — |
| `motivo_revocacion` | enum | no | `MotivoRevocacionSesion` = `reuso`, `rotacion`, `cierre_sesion`, `eliminacion`, `suspension`, `purga` | — |
| `created_at` | timestamptz(3) | sí | — | `now()` |

Reglas de negocio que la tabla debe permitir (HU-03a-02):

- Renovar: buscar por `refresh_hash`, marcar `rotada_at` + `sustituida_por_id` e insertar el nuevo en la misma `familia`.
- Reuso de refresh rotado: `UPDATE` de toda la `familia` a `revocada_at` con `motivo_revocacion = 'reuso'` y respuesta `refresh_invalido` (no emite tokens).
- Sesión revocada o expirada (`expira_at < now()`): `refresh_invalido`.
- El access token (JWT `jose`) no se persiste; lleva cuenta, tipo, dispositivo y versión del manifiesto.

Índices: `unique(refresh_hash)`; `(cuenta_id)`; `(familia)`; `(expira_at)` para limpieza.

### 2.5 `credencial_password` — DIFERIDA (EP-03b, M2)

No se crea en este ticket. Canónica en doc 20 §3 (`cuenta_id` PK, `password_hash`, `algoritmo`, `updated_at`). Se nombra para no reutilizar el nombre.

---

## 3. PostgreSQL · RBAC, capacidades y manifiesto

### 3.1 `capacidad` — NUEVA · canónica pendiente

Registro completo del catálogo 14 §1, sembrado por seed idempotente (HU-03a-06).

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `clave` | text | sí | unique | forma `recurso.accion`; coincide con `x-capacidad` del contrato |
| `descripcion` | text | sí | — | del catálogo 14 §1 |
| `modulo` | text | sí | — | agrupación de origen (p. ej. `vistas`, `recorrido`, `productos`, `cuenta`) |
| `es_sistema` | boolean | sí | — | `true` para las de la app base |
| `estado` | enum | sí | `EstadoCapacidad` = `activa`, `retirada` | `activa` |
| `obligatoria` | boolean | sí | — | `true` solo para las marcadas ◎ (DEC-232) |
| `created_at` / `updated_at` | timestamptz(3) | sí | — | `now()` |

Invariantes de seed (verificadas en CI, no en check de tabla):

- `capacidad` contiene **exactamente** las claves de catálogo 14 §1.
- `obligatoria = true` es **exactamente** el conjunto ◎: `vista.crear_cuenta.acceder`, `vista.validar_correo.acceder`, `vista.iniciar_sesion.acceder`, `vista.recuperar_contrasena.acceder`, `vista.privacidad.acceder`, `vista.portal_eliminacion.acceder`, `documento_legal.aceptar`, `metrica.consentir`, `cuenta.eliminar.solicitar`. Ninguna aparece en `perfil_capacidad`.

### 3.2 `perfil` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `nombre` | text | sí | unique | en M1a solo `Estándar` |
| `descripcion` | text | no | — | — |
| `es_sistema` | boolean | sí | — | `true` para perfiles base |
| `estado` | enum | sí | `EstadoPerfil` = `activa`, `retirada` | `activa` |
| `created_at` / `updated_at` | timestamptz(3) | sí | — | `now()` |

### 3.3 `perfil_capacidad` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `perfil_id` | text(26) | sí | PK, FK `perfil` | — |
| `capacidad_id` | text(26) | sí | PK, FK `capacidad` | — |
| `granted_by` | text | no | — | actor (script/administrador) |
| `granted_at` | timestamptz(3) | sí | — | `now()` |

Restricciones: `unique(perfil_id, capacidad_id)` (PK compuesta). La matriz de la columna E de catálogo 14 §3 se siembra aquí; **las ◎ no se siembran por perfil**.

### 3.4 `cuenta_perfil` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `cuenta_id` | text(26) | sí | PK, FK `cuenta` | — |
| `perfil_id` | text(26) | sí | PK, FK `perfil` | Estándar al dar de alta |
| `assigned_by` | text | no | — | — |
| `assigned_at` | timestamptz(3) | sí | — | `now()` |
| `effective_from` | timestamptz(3) | sí | — | `now()` |
| `effective_until` | timestamptz(3) | no | — | nulo = vigente |

Restricciones: `unique(cuenta_id, perfil_id)`. El middleware (HU-03a-07) calcula capacidades efectivas como **unión de perfiles vigentes** (`effective_from <= now() < coalesce(effective_until,'inf')`) **más** las `capacidad.obligatoria`, releyendo en **cada** petición.

### 3.5 `manifiesto_acceso_version` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `cuenta_id` | text(26) | sí | unique, FK `cuenta` | una versión vigente por cuenta |
| `version` | text | sí | — | hash del manifiesto efectivo (también en `ETag`) |
| `generado_at` | timestamptz(3) | sí | — | `now()` |
| `snapshot` | jsonb | no | — | opcional: manifiesto materializado para auditoría/depuración |

`version`/`ETag` cambian cuando cambian perfiles, capacidades o asignaciones de la cuenta (HU-03a-08). El cálculo es determinista sobre datos vigentes; la fila guarda la última versión para comparar `If-None-Match` y responder 304.

---

## 4. PostgreSQL · Documentos legales

### 4.1 `documento_legal` — NUEVA · canónica pendiente

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `tipo` | enum | sí | `TipoDocumentoLegal` = `terminos`, `privacidad` | — |
| `version` | text | sí | unique con `tipo` | igual a la del nombre de archivo (`vX.Y`) |
| `vigente_desde` | timestamptz(3) | sí | — | — |
| `vigente_hasta` | timestamptz(3) | no | — | nulo = vigente |
| `url_publicada` | text | no | — | página estática servida por `server/` |
| `texto_snapshot` | text | no | — | **nulo**: el texto vive empaquetado en la app (DEC-232) |
| `hash_contenido` | char(64) | sí | — | SHA-256 del Markdown de `docs/legal/` |
| `exige_reaceptacion` | boolean | sí | — | `false` |
| `publicado_por` | text | sí | — | pipeline de despliegue |
| `created_at` | timestamptz(3) | sí | — | `now()` |

Restricciones e índices:

- `unique(tipo, version)`.
- Check `vigente_hasta IS NULL OR vigente_hasta > vigente_desde`.
- Índice `(tipo, vigente_desde DESC)` para resolver la vigente.
- **Append-only**: el rol `taomangalam_app` queda con `SELECT` únicamente (REVOKE `INSERT, UPDATE, DELETE`); escribe el script de despliegue con su propio rol.

### 4.2 `aceptacion_documento_legal` — NUEVA · canónica pendiente · append-only

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `cuenta_id` | text(26) | sí | FK `cuenta` | se reasigna al vincular (EP-03b) |
| `documento_legal_id` | text(26) | sí | FK `documento_legal` | — |
| `tipo` | enum | sí | `TipoDocumentoLegal` | desnormalizado para consulta |
| `version` | text | sí | — | versión aceptada |
| `hash_contenido` | char(64) | sí | — | hash que la app mostró; debe coincidir con el registrado |
| `aceptada_at` | timestamptz(3) | sí | — | **fecha original** (puede ser pasada si fue diferida) |
| `registrada_at` | timestamptz(3) | sí | — | `now()` (momento de llegada) |
| `origen` | enum | sí | `OrigenAceptacion` = `app`, `portal` | — |
| `diferida` | boolean | sí | — | `false`; `true` si se tomó sin conexión |
| `dispositivo_id` | text(26) | no | FK `dispositivo` | — |
| `app_version` | text | no | — | — |
| `idempotency_key` | text | no | — | clave del POST (ver §5) |

Restricciones e índices:

- Sin unicidad por cuenta/documento: conserva **cada** aceptación como fila (doc 20 §11).
- Índice `(cuenta_id, aceptada_at DESC)` para `listarMisAceptaciones` (paginado por cursor).
- Índice único parcial para idempotencia: `unique(cuenta_id, idempotency_key, documento_legal_id) WHERE idempotency_key IS NOT NULL`.
- Check `diferida = false OR dispositivo_id IS NOT NULL` (una aceptación diferida siempre trae dispositivo).
- **Append-only**: REVOKE `UPDATE, DELETE` al rol de app; solo `SELECT, INSERT`. PostgreSQL debe rechazar `UPDATE`/`DELETE` aunque la app los intente (QA-03a-10-02).

---

## 5. Idempotencia REST — NUEVA (brecha §9)

El contrato exige `Idempotency-Key` en todo POST que crea/consume (doc 15), pero el modelo canónico (doc 20) **no nombra** una tabla de idempotencia REST; solo `sync_operation_receipt` para `/sync` (cuentas completas). La preparación necesita idempotencia en `autenticarCuentaDispositivo` (HU-03a-03) y `aceptarDocumentosLegales` (HU-03a-11).

Propuesta de tabla (alternativa en §9):

`idempotencia_solicitud` — NUEVA

| Campo | Tipo | Oblig. | FK / enum | Default / nota |
|---|---|---|---|---|
| `id` | text(26) | sí | PK | ULID |
| `cuenta_id` | text(26) | no | FK `cuenta` | nulo en operaciones públicas (alta de dispositivo) |
| `operacion` | text | sí | — | `operationId` del contrato |
| `clave` | text | sí | — | valor de `Idempotency-Key` |
| `hash_cuerpo` | char(64) | sí | — | SHA-256 del cuerpo normalizado |
| `estado` | enum | sí | `EstadoIdempotencia` = `en_proceso`, `completada` | `en_proceso` |
| `codigo_http` | integer | no | — | respuesta guardada |
| `respuesta` | jsonb | no | — | cuerpo devuelto, para rejugar |
| `created_at` | timestamptz(3) | sí | — | `now()` |
| `expira_at` | timestamptz(3) | sí | — | ventana de idempotencia (24 h propuesto, EP-11) |

Restricciones: `unique(operacion, clave)`; `unique(operacion, clave, hash_cuerpo)` implícito. Misma clave + mismo cuerpo ⟹ replay de la respuesta (señal `Idempotency-Replayed`); misma clave + cuerpo distinto ⟹ 409 `idempotencia_conflicto`. Índice `(expira_at)` para limpieza.

---

## 6. Drift (app) · Esquema del dominio y local — NUEVAS (HU-06-01)

Esquema Drift versionado en `app/lib/data/`. Convenciones V2 (§0): entidades mutables llevan `id` ULID, `created_at`, `updated_at`, `version` (=1 al crear), `deleted_at?`, `device_origin_id`; las append-only no exponen edición/borrado en su DAO. Índice de Inicio `(espacio_id, estado, updated_at)`; historial `(consulta_id, numero_paso)` y `(paso_id, numero_revision)`.

`device_origin_id` es el ULID de instalación generado localmente (no hay tabla `dispositivo` en Drift).

### 6.1 `espacio_datos`

| Campo | Tipo | Oblig. | Enum / nota |
|---|---|---|---|
| `id` | TEXT | sí | PK (ULID) |
| `cuenta_id` | TEXT | no | nulo mientras local; único cuando vinculado |
| `device_origin_id` | TEXT | sí | ULID de instalación |
| `estado` | TEXT | sí | check `local`,`vinculando`,`vinculado`,`fusionado`,`bloqueado`; default `local` |
| `fusionado_en_id` | TEXT | no | FK self |
| `linked_at` | DATETIME | no | — |
| `created_at` / `updated_at` | DATETIME | sí | — |
| `version` | INTEGER | sí | default 1 |
| `deleted_at` | DATETIME | no | — |

Invariante: en el primer arranque existe **un único** `espacio_datos` con `estado = 'local'` y `cuenta_id` nulo (AC/QA-06-01-01).

### 6.2 `consultante`

`id` PK · `espacio_id` FK · `cuenta_titular_id?` · `es_titular` (bool, default 1) · `nombre` · `fecha_nacimiento` (DATE) · campos de convención. `signo` y `numero_personal` **no** se almacenan (derivados).

### 6.3 `consulta`

`id` PK · `espacio_id` FK · `consultante_id` FK · `consultor_cuenta_id?` · `proposito` (inmutable tras iniciar) · `titulo?` · `estado` check `borrador`,`activa`,`completada`,`descartada` default `borrador` · `fase` check `preparacion`,`lista_para_tirada`,`acciones_en_curso`,`esperando_material`,`esperando_conexion`,`lectura_pendiente`,`cierre_en_curso`,`bloqueada_conflicto`,`completada` default `preparacion` · `motivo_bloqueo?` check (`kuberani_inicio`,`kuberani_renovacion`,`kuberani_reposicion`,`corrector`,`minerales`,`validar_kuberani_inicio`,`validar_kuberani_renovacion`,`validar_kuberani_reposicion`,`validar_corrector`,`conflicto_sync`) · `fecha_inicio?` (DATE) · `casa_actual?` INTEGER check 1–12 · `paso_actual_id?` FK `paso_recorrido` · `plan_actual_id?` FK `plan_practica` · `closed_at?` · campos de convención. No existe `archivada` (DEC-207).

La antigua columna `descripcion` de V1 migra a `consulta_descripcion_revision`; `casa_actual`, `paso_actual_id` y `plan_actual_id` son **proyecciones** recalculables.

### 6.4 `consulta_descripcion_revision` — append-only

`id` PK · `consulta_id` FK · `numero_revision` INTEGER (1 = original) · `texto` TEXT (puede ser vacío) · `autor_cuenta_id?` · `device_origin_id` · `created_at`. `unique(consulta_id, numero_revision)`. La vigente es la de mayor `numero_revision`.

### 6.5 `paso_recorrido`

`id` PK · `espacio_id` FK · `consulta_id` FK · `numero_paso` INTEGER · `tipo` check `inicio`,`tirada`,`cierre`,`retorno_casa_1`,`retoma` · `occurred_at_utc` · `local_date` DATE · `timezone_id` · `casa_inicial` INTEGER check 1–12 · `revision_vigente_id?` FK `tirada_revision` · `retoma_desde_paso_id?` FK self · `rehecho_por_paso_id?` FK self · `created_at`.

Restricciones: `unique(consulta_id, numero_paso)`; `retoma_desde_paso_id` solo y obligatorio en `tipo = retoma` y apunta a un paso anterior de la misma consulta; `revision_vigente_id` nulo en `retorno_casa_1` y `retoma`.

### 6.6 `tirada_revision`

`id` PK · `paso_id` FK · `numero_revision` INTEGER · `d12` INTEGER check 1–12 · `d8` INTEGER check 1–8 · `d4` INTEGER check 1–4 · `lanzada_por` check `consultor`,`consultante` · `resultado` check `avance`,`permanencia`,`retroceso`,`cierre` · `casa_origen` / `casa_destino` INTEGER check 1–12 · `anillo_destino?` INTEGER check 1–8 · `fuerza_kipot?` INTEGER · `clasificacion_d4_version?` TEXT · `estado` check `vigente`,`sustituida` default `vigente` · `sustituye_revision_id?` FK self · `motivo_correccion_tipo?` check `error_tipeo`,`error_lectura_dado`,`otro` · `motivo_correccion?` TEXT · `corregida_por_cuenta_id?` · `corregida_at?` · `occurred_at_utc` · `local_date` DATE · `timezone_id` · `device_origin_id` · `created_at`.

Restricciones: `unique(paso_id, numero_revision)`; índice parcial de **una sola** `vigente` por `paso_id`; `anillo_destino` no nulo **solo si** `resultado = retroceso` (y nulo en los demás); desde `numero_revision >= 2` son obligatorios `motivo_correccion_tipo` y `corregida_at`; `motivo_correccion` obligatorio si `motivo_correccion_tipo = otro`. Contenido append-only; la transición `vigente → sustituida` la aplica el servicio de dominio en una transacción, no un update genérico del DAO.

### 6.7 `plan_practica`

`id` PK · `espacio_id` FK · `tirada_revision_id` FK · `via` check `consultante`,`consultor` · `estado` check `pendiente`,`activo`,`esperando_material`,`esperando_conexion`,`lectura_pendiente`,`completado`,`sustituido`,`cancelado` · `content_version` TEXT · `resumen_snapshot` (JSON) · `sustituye_plan_id?` FK self · `sustituido_por_plan_id?` FK self · fechas · campos de convención. Restricción: un plan vigente por `(tirada_revision_id, via)`. `lectura_pendiente` se conserva en el enum pero no se asigna.

### 6.8 `accion_practica`

`id` PK · `plan_id` FK · `orden` INTEGER · `tipo` TEXT check (práctica diaria, lectura, medición RKL, uso/renovación/quema de producto, consulta de arcano, tarea informativa) · `content_key?` · `texto_snapshot` · `dias_requeridos?` INTEGER · `repeticiones?` INTEGER · `es_obligatoria` bool · `producto_id?` · `cantidad_producto?` INTEGER · `estado` TEXT · campos de convención.

### 6.9 `ciclo_practica`

`id` PK · `accion` FK `accion_practica` · `numero_ciclo` INTEGER · `inicio` DATE · `fin?` DATE · `estado` TEXT · `motivo_cierre?` TEXT · campos de convención.

### 6.10 `cumplimiento_dia`

`id` PK · `ciclo_id` FK · `occurred_at_utc` · `local_date` DATE · `timezone_id` · `estado` check `cumplido`,`desmarcado` · `nota?` · `actor?` · `registrado_por_informe` bool default 0 · campos de convención. `unique(ciclo_id, local_date)`. `estado` es proyección de la última corrección.

### 6.11 `cumplimiento_correccion` — append-only

`id` PK · `cumplimiento_id` FK · `estado_anterior` check `cumplido`,`desmarcado` · `estado_nuevo` check `cumplido`,`desmarcado` · `motivo?` (obligatorio si la fecha es de un día anterior) · `actor?` · `occurred_at_utc` · `local_date` · `timezone_id` · `device_origin_id` · `created_at`.

### 6.12 `evento_plan` — append-only

`id` PK · `plan_id` FK · `tipo` check `activacion`,`pausa`,`material_agregado`,`reinicio`,`cumplimiento`,`sustitucion`,`continuar_con_retraso`,`decision_indicacion_omitida` · `occurred_at_utc` · `local_date` · `timezone_id` · `metadata` (JSON: días de retraso, día que tocaba, días que exige la casa, `salida` `comenzar_casa_1`/`rehacer_desde_incumplimiento`, `pasoElegidoId`) · `device_origin_id` · `created_at`.

### 6.13 `preferencia_local`

| Campo | Tipo | Oblig. | Nota |
|---|---|---|---|
| `clave` | TEXT | sí | PK |
| `valor` | TEXT / JSON | no | — |
| `updated_at` | DATETIME | sí | — |

Claves de este ticket: `cuenta.id`, `cuenta.tipo`, `alta.estado`, `alta.idempotency_key`, `sujeto` (UUID seudónimo de analítica, EP-15), `motion`, accesibilidad, `recordatorio.hora_elegida`. **No** guarda tokens ni el secreto. (Alternativa de caché de manifiesto en §9.)

### 6.14 `estado_onboarding`

`id`/`clave` PK · `version_presentacion` · `visto` bool · `no_volver_a_mostrar` bool · `tutorial_completado` bool · `instructivo_capitulo?` · `instructivo_apartados` (JSON) · `content_version` · `updated_at`.

### 6.15 `registro_legal_pendiente` — NUEVA · solo Drift (HU-03a-12)

Cola persistente del primer uso sin conexión; **comparte tabla con el consentimiento de analítica** (HU-15-04) y se vacía antes que cualquier otra operación al reconectar.

| Campo | Tipo | Oblig. | Enum / nota |
|---|---|---|---|
| `id` | TEXT | sí | PK (ULID) |
| `tipo` | TEXT | sí | check `terminos`,`privacidad`,`metrica` (esta última para el consentimiento) |
| `version` | TEXT | no | versión mostrada (legal) |
| `hash_contenido` | TEXT | no | hash mostrado (legal) |
| `aceptada_at` | DATETIME | sí | fecha **original** de la aceptación |
| `dispositivo_id` | TEXT | no | nulo si aún no existe cuenta/dispositivo |
| `device_origin_id` | TEXT | sí | ULID de instalación |
| `app_version` | TEXT | sí | — |
| `idempotency_key` | TEXT | sí | estable; se reutiliza en cada reintento; unique |
| `payload` | JSON | no | decisión/región para `metrica` |
| `estado` | TEXT | sí | check `pendiente`,`enviando` default `pendiente` |
| `intentos` | INTEGER | sí | default 0 |
| `proximo_intento_at` | DATETIME | no | espera creciente |
| `created_at` / `updated_at` | DATETIME | sí | — |

Reglas: al confirmar 201 se borra la fila; borrado lógico nulo no aplica (es cola). Si el servidor responde `aceptacion_fecha_invalida`, `version_legal_desconocida` o `documento_legal_modificado`, la fila sale de la cola y V-51 se representa con el texto vigente. Debe sobrevivir al cierre de la app.

---

## 7. Contrato ↔ modelo (REQ-14, sin redefinir)

| Tipo del contrato | Uso en el modelo |
|---|---|
| `TokenPair` | respuesta de `autenticarCuentaDispositivo`, `renovarToken`; se persiste `sesion_auth`, no el tipo |
| `SesionIniciada` | alta; `creada=true` si insertó `cuenta` |
| `DispositivoRegistro` | entrada de alta y `registrarDispositivo`; mapea a `dispositivo` |
| `CuentaPropia`, `TipoCuenta`, `EstadoCuenta` | mapean a `cuenta.tipo` / `cuenta.estado` |
| `Manifiesto`, `DocumentoLegalRef` | mapean a `manifiesto_acceso_version` + capacidades vigentes |
| `DocumentoLegal`, `TipoDocumentoLegal` | mapean a `documento_legal` |
| `AceptacionLegalEntrada`, `AceptacionLegal`, `AceptacionLegalResultado` | mapean a `aceptacion_documento_legal` |
| `CodigoError`, `Problem`, `ErrorCampo` | códigos de negocio (`refresh_invalido`, `capacidad_denegada`, `requiere_cuenta_completa`, `version_legal_pendiente`, `version_legal_desconocida`, `documento_legal_modificado`, `aceptacion_fecha_invalida`, `idempotencia_conflicto`, `token_expirado`, `no_autenticado`); **no** se redefinen en el modelo |
| `Ulid` | tipo de todos los ids expuestos |

Prohibido agregar enums o códigos de error nuevos que ya existan en `server/contract/generated`. El paquete los importa.

---

## 8. Relaciones (resumen)

| Origen | Campo | Destino | Cardinalidad |
|---|---|---|---|
| `cuenta` | `dispositivo_id` | `dispositivo` | 1:1 (solo `tipo = dispositivo`) |
| `cuenta` | `fusionada_en_cuenta_id` | `cuenta` | N:1 |
| `dispositivo` | `cuenta_id` | `cuenta` | N:1 (redundante con el vínculo 1:1; ver §9) |
| `credencial_dispositivo` | `cuenta_id`, `dispositivo_id` | `cuenta`, `dispositivo` | 1:1 |
| `sesion_auth` | `cuenta_id`, `dispositivo_id`, `sustituida_por_id` | `cuenta`, `dispositivo`, `sesion_auth` | N:1, N:1, 1:0..1 |
| `perfil_capacidad` | `perfil_id`, `capacidad_id` | `perfil`, `capacidad` | N:1 |
| `cuenta_perfil` | `cuenta_id`, `perfil_id` | `cuenta`, `perfil` | N:1 |
| `manifiesto_acceso_version` | `cuenta_id` | `cuenta` | 1:1 |
| `aceptacion_documento_legal` | `cuenta_id`, `documento_legal_id`, `dispositivo_id` | `cuenta`, `documento_legal`, `dispositivo` | N:1 |
| `idempotencia_solicitud` | `cuenta_id` | `cuenta` | N:1 (opcional) |

Drift (por FK lógicas, sin enforcement cruzado):
`espacio_datos` 1—N `consultante`, `consulta`, `paso_recorrido`, `plan_practica`; `consulta` 1—N `consulta_descripcion_revision`, `paso_recorrido`; `paso_recorrido` 1—N `tirada_revision`, self `retoma_desde_paso_id`/`rehecho_por_paso_id`; `tirada_revision` 1—N `plan_practica`; `plan_practica` 1—N `accion_practica`, 1—N `evento_plan`; `accion_practica` 1—N `ciclo_practica`; `ciclo_practica` 1—N `cumplimiento_dia`; `cumplimiento_dia` 1—N `cumplimiento_correccion`. `paso_recorrido.revision_vigente_id` 1:0..1 `tirada_revision`.

---

## 9. Brechas y decisiones abiertas (opciones)

1. **Persistencia de idempotencia REST** (afecta HU-03a-03 y HU-03a-11). El modelo canónico no la nombra.
   - **Opción A (recomendada): tabla `idempotencia_solicitud`** genérica (§5). Pros: reutilizable por todos los POST del contrato (EP-11 ya exige 24 h y `Idempotency-Replayed`); desacopla la lógica de deduplicación. Contras: una entidad nueva fuera de doc 20 → requiere precisar/decisión.
   - **Opción B: idempotencia embebida por operación** (`aceptacion_documento_legal.idempotency_key` + `unique(cuenta_id, idempotency_key, documento_legal_id)`, y en el alta la unicidad natural `dispositivo.codigo` + `credencial_dispositivo`). Pros: cero tablas nuevas; suficiente para el alcance de este ticket. Contras: no cubre "mismo cuerpo distinto" de forma general ni el resto de POST; cada endpoint reimplementa la regla.
   - No implementar hasta que el dev/PO elija (impacta migración y tests).

2. **Caché local del manifiesto** (HU-03a-08). Doc 20 §10 no la lista.
   - **Opción A: tabla Drift `manifiesto_cache`** (`cuenta_id`, `version`, `etag`, `payload` JSON, `schema_version`, `origen` `servidor`/`empaquetado`, `actualizado_at`). Pros: explícita, versionable y testeable; permite descartar por `schema_version`. Contras: tabla fuera de doc 20.
   - **Opción B: claves en `preferencia_local`** (`manifiesto.json`, `manifiesto.version`, `manifiesto.schema`). Pros: sin tabla nueva. Contras: sin tipado ni índice; mezcla caché con preferencias.
   - **Opción C (recomendada): archivo/caché JSON versionado** separado de Drift, con `schema_version`, dado que es un blob único por instalación. Decidir junto con HU-01-11 (filtrado de menú).

3. **Redundancia `cuenta.dispositivo_id` vs `dispositivo.cuenta_id`.** Ambas canónicas (doc 20 §3 y doc 11). Propuesta: `cuenta.dispositivo_id` es la arista autoritativa del vínculo 1:1 de la cuenta de dispositivo (con unique parcial); `dispositivo.cuenta_id` se mantiene para la relación general dispositivo—cuenta completa (M2) y se sincroniza en la transacción de alta. Confirmar antes de migrar.

4. **Manifiesto de acceso empaquetado vs `app/assets/manifest.json`** (colisión de nombres, §1). Propuesta: `app/assets/acceso/manifiesto-estandar.json`, generado desde el mismo seed y verificado por CI contra `perfil_capacidad`. Requiere OK de la convención.

5. **`cuenta.ultima_actividad_at`** se agrega ahora porque el job de purga por inactividad (DEC-224) lo consumirá en EP-03b; se actualiza en la ruta autenticada. Confirmar si el equipo prefiere diferirlo a EP-03b (evita escritura por petición en M1a).

6. **`sesion_auth.motivo_revocacion`**: el conjunto propuesto (`reuso`, `rotacion`, `cierre_sesion`, `eliminacion`, `suspension`, `purga`) incluye valores usados por EP-03b/EP-14b. Confirmar el valor canónico de "rotación normal" (la rotación no es una revocación; si no se marca `revocado`, no debe figurar en el enum de revocación).

---

## 10. Notas de migración

### 10.1 PostgreSQL / Prisma

- **Migraciones nuevas** (sugeridas, una por unidad lógica, sin tocar las existentes `init`, `app_metadata_timestamptz`, `configuracion_operativa`, `app_release`):
  1. `identidad_sesion`: `cuenta`, `dispositivo`, `credencial_dispositivo`, `sesion_auth` + enums `TipoCuenta`, `EstadoCuenta`, `TipoDispositivo`, `Plataforma`, `MotivoRevocacionSesion`.
  2. `rbac_capacidades`: `perfil`, `capacidad`, `perfil_capacidad`, `cuenta_perfil`, `manifiesto_acceso_version` + enums `EstadoPerfil`, `EstadoCapacidad`.
  3. `legal_versionado`: `documento_legal`, `aceptacion_documento_legal` + enums `TipoDocumentoLegal`, `OrigenAceptacion`.
  4. `idempotencia_solicitud` (si se aprueba §9.1-A).
- **Privilegios (DEC-200, REQ-13)**, sobre las default privileges del init:
  - `capacidad`, `perfil_capacidad`: `REVOKE INSERT, UPDATE, DELETE`; `GRANT SELECT` al rol de app.
  - `perfil`, `cuenta_perfil`, `manifiesto_acceso_version`: `SELECT` (escritura administrativa futura con su propio rol); `cuenta_perfil` puede habilitar `INSERT/UPDATE` cuando EP-14b lo requiera.
  - `documento_legal`: `REVOKE INSERT, UPDATE, DELETE`; `GRANT SELECT` (escribe el pipeline de despliegue con otro rol).
  - `aceptacion_documento_legal`: `REVOKE UPDATE, DELETE`; `GRANT SELECT, INSERT` (append-only real en PostgreSQL).
  - `cuenta`, `dispositivo`, `credencial_dispositivo`, `sesion_auth`, `idempotencia_solicitud`: DML normal del rol de app (default).
- **Datos operativos (no esquema)**: nuevas claves en `configuracion_clave`/`configuracion_version` para las vigencias de sesión (`auth.access_token_ttl_segundos = 900`, `auth.refresh_token_ttl_dias = 30`), ajustables sin migración (DEC-222, DEC-232).
- **Seed idempotente** (HU-03a-06): `upsert` por `clave` en `capacidad` para todo catálogo 14 §1; `upsert` de `perfil` `Estándar`; reconstrucción determinista de `perfil_capacidad` con la columna E de §3; **excluir** las ◎ de `perfil_capacidad`. El seed informa claves y asignaciones creadas/iguales.
- **Rollback**: revertir las migraciones en orden inverso. `aceptacion_documento_legal` y `documento_legal` no se borran si hay datos productivos; revertir el esquema no debe degradar consentimientos ni borrar aceptaciones. Respetar los rollback de cada fuente; sin inventar versiones legales ni aceptaciones.

### 10.2 Drift

- `schemaVersion = 1` exporta las **14 tablas** de HU-06-01 (`espacio_datos`, `consultante`, `consulta`, `consulta_descripcion_revision`, `paso_recorrido`, `tirada_revision`, `plan_practica`, `accion_practica`, `ciclo_practica`, `cumplimiento_dia`, `cumplimiento_correccion`, `evento_plan`, `preferencia_local`, `estado_onboarding`) y crea el espacio local único en el primer arranque.
- `schemaVersion = 2` agrega `registro_legal_pendiente` (HU-03a-12) y, si se aprueba §9.2-A, `manifiesto_cache`. Cada versión exporta su esquema para la prueba de migración hacia adelante sobre base efímera (QA-06-01-03), conservando datos.
- Enums como `TEXT + CHECK` con los valores exactos de doc 20 §11; checks de dados (1–12, 1–8, 1–4), casas (1–12), `anillo_destino` solo en retroceso, `unique(ciclo_id, local_date)`, `unique(consulta_id, numero_paso)`, `unique(paso_id, numero_revision)` y único vigente parcial.
- DAOs append-only (`consulta_descripcion_revision`, `tirada_revision`, `cumplimiento_correccion`, `evento_plan`) sin `update`/`delete` en su interfaz; las transiciones de `estado` las aplica el servicio de dominio.
- `registro_legal_pendiente` se crea antes de que HU-03a-12 lo consuma; el código de la app usa un almacenamiento propio y acotado hasta que el esquema de dominio esté disponible (riesgo de EP-03a).

### 10.3 CI y artefactos de verificación

- Chequeo de catálogo (HU-03a-06): el seed coincide con catálogo 14 §1 y con la columna E de §3; toda `x-capacidad` del contrato existe en el registro, o es `publica`/`obligatoria`; falla nombrando la clave u operación distinta.
- Chequeo de hash legal (HU-03a-10): el hash del texto empaquetado coincide con `docs/legal/`; un cambio de texto sin cambiar versión falla.
- Chequeo de manifiesto empaquetado (HU-03a-08): regenerarlo desde el seed y comparar contra el artefacto; falla nombrando la capacidad distinta.
- Casos trazados por CI: `ep01-legal-provider` (hash + registro + permisos de rol) y, para los criterios que requieren V-51 o el menú real, `ep01-legal-integration` y `ep01-capabilities-integration` (tras TAO-185/TAO-186), sin cerrar anticipadamente las historias.

### 10.4 Fuera del modelo de este ticket (DIFERIDAS)

`intento_seguridad` (HU-03a-05), `credencial_password`, `desafio_verificacion`, `solicitud_eliminacion_cuenta`, `eliminacion_componente`, `comprobante_eliminacion`, `retencion_legal`, `preferencia_cuenta`, `entrega_comunicacion` (EP-03b); `politica_analitica_region`, `consentimiento_analitica`, `sesion_uso`, `evento_metrica` (EP-15); `sync_*` (EP-09); `diagnostico_retroceso`, `intento_reconocimiento`, `ciclo_rkl`, `medicion_rkl`, `nota`, `archivo_adjunto`, `recordatorio_local` (M1b/EP-08).

---

## 11. Trazabilidad REQ → entidad

| REQ | Entidades |
|---|---|
| REQ-01 | `sesion_auth` (+ `configuracion_clave`/`configuracion_version` para vigencias) |
| REQ-02 | 14 tablas Drift de HU-06-01 |
| REQ-03 | `cuenta`, `dispositivo`, `credencial_dispositivo`, `cuenta_perfil`, `preferencia_local`, almacenamiento seguro |
| REQ-04 | `capacidad`, `perfil_capacidad`, `cuenta_perfil`, `cuenta.tipo` |
| REQ-05 | `capacidad`, `perfil`, `perfil_capacidad` + seed |
| REQ-06 | `manifiesto_acceso_version`, caché local de manifiesto (§9), artefacto empaquetado |
| REQ-07 | `documento_legal`, `aceptacion_documento_legal`, privilegios de rol |
| REQ-08 | `aceptacion_documento_legal` (+ `idempotencia_solicitud` §5) |
| REQ-09 | `registro_legal_pendiente` (Drift), `aceptacion_documento_legal` |
| REQ-10 | `documento_legal.exige_reaceptacion`/vigencia, `aceptacion_documento_legal`, `capacidad` (`x-exenta-version-legal`) |
| REQ-11 | claves de configuración nuevas y comandos de seed (documentación) |
| REQ-12 | sin entidades (docs) |
| REQ-13 | privilegios declarados en §10.1 |
| REQ-14 | sin entidades nuevas; consumo de enums/tipos del contrato |