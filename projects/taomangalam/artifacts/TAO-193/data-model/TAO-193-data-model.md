# Modelo de datos — TAO-193 · Preparación M2 de EP-01 (EP-03b: correo, registro, validación, sesión y vista Cuenta)

Alcance del modelo: solo lo que exigen REQ-01 a REQ-06 y REQ-10/REQ-11. Fuera de alcance de este documento: recuperación de contraseña (HU-03b-08 / V-26), invitaciones (HU-03b-09/10), vinculación de instalación (HU-03b-07), borrado y eliminación de cuenta (HU-03b-12 a HU-03b-16), respaldo y dispositivos (EP-09). Esas entidades se nombran solo donde este paquete deja ganchos previstos, marcados como **futuro (no se crea aquí)**.

Las entidades marcadas **EXISTENTE** provienen de EP-00/EP-03a (cola, cuenta de dispositivo, perfiles, aceptaciones legales y consentimientos). Su forma real debe verificarse contra el esquema integrado en `epic/EP-01a` antes de escribir la migración: si un campo ya existe con otro nombre o tipo, se adopta el existente y se registra la diferencia como bloqueo de intake, no se duplica la columna.

---

## 1. Resumen de impacto

| Entidad / objeto | Estado | Motivo (REQ) |
|---|---|---|
| `cuenta` | **MODIFICADA** | REQ-02, REQ-03, REQ-04, REQ-05 |
| `cuenta_credencial` | **NUEVA** | REQ-02, REQ-04 |
| `desafio_correo` | **NUEVA** | REQ-02, REQ-03 |
| `desafio_correo_intento` | **NUEVA** | REQ-03 |
| `intento_acceso` | **NUEVA** | REQ-04 |
| `bloqueo_acceso` | **NUEVA** | REQ-04 |
| `sesion` | **NUEVA** | REQ-04, REQ-05 |
| `correo_mensaje` | **NUEVA** | REQ-01 |
| `correo_plantilla` | **NUEVA** (catálogo sembrado) | REQ-01 |
| `dispositivo` | **EXISTENTE**, sin cambios | REQ-05 (lectura: modelo y fecha de alta) |
| `aceptacion_legal`, `consentimiento` | **EXISTENTE**, sin cambios de forma | REQ-02 (preservación), REQ-06 (acceso), REQ-10 (privilegios) |
| `perfil` / matriz de capacidades | **EXISTENTE**, sin cambios | REQ-04 (nivel autorizado en la sesión) |
| Artefactos `pg-boss` | **EXISTENTE** (schema propio) | REQ-01, REQ-10, REQ-11 |
| Enums nuevos | **NUEVOS** (7) | ver §3 |

Invariante rector de todo el paquete: **la conversión no crea una cuenta nueva**. `cuenta.id` se conserva desde la cuenta de dispositivo; todo lo que cuelga de `cuenta_id` (usos de producto, solicitudes, aceptaciones, consentimientos) permanece intacto sin reasignación. Por eso el correo, la credencial y los desafíos se modelan **colgando de `cuenta`**, nunca como una entidad "usuario" paralela.

---

## 2. Entidades

### 2.1 `cuenta` — **MODIFICADA**

Tabla existente de EP-03a (cuenta de dispositivo). Este paquete le agrega la identidad por correo y el estado de validación.

| Campo | Tipo | Obligatorio | Estado | Notas |
|---|---|---|---|---|
| `id` | `uuid` PK | sí | existente | **No cambia al convertir.** Invariante de identidad (DEC-212). |
| `tipo` | enum `cuenta_tipo` | sí | **nuevo** | `dispositivo` \| `completa`. Default `dispositivo`. Backfill: todas las filas existentes a `dispositivo`. |
| `estado` | enum `cuenta_estado` | sí | **nuevo** | `activa` \| `pendiente_validacion`. Default `activa`. Ver §3 para la relación tipo×estado. |
| `correo_cifrado` | `bytea` | no | **nuevo** | Correo normalizado y cifrado en reposo (DEC-162/DEC-218). Nulo con cuenta de dispositivo. No se indexa: no es buscable. |
| `correo_hash` | `bytea` (32 B) | no | **nuevo** | HMAC-SHA256 con clave de servidor sobre el correo **normalizado**. Es la columna de búsqueda y de unicidad; permite login y detección de duplicado sin descifrar. |
| `correo_cifrado_clave_ref` | `text` | no | **nuevo** | Identificador de la clave de cifrado usada (no la clave). Habilita rotación sin releer el secreto. Obligatorio si `correo_cifrado` no es nulo (CHECK). |
| `correo_mascara` | `text` | no | **nuevo** | Correo parcialmente oculto precomputado para V-24/V-27 (`ma•••@ej•••.com`). Derivado, no autoritativo; evita descifrar para pintar la vista. |
| `correo_validado_en` | `timestamptz` | no | **nuevo** | Nulo mientras el correo esté pendiente. Marca el fin de la conversión (REQ-03). |
| `convertida_en` | `timestamptz` | no | **nuevo** | Momento del `POST /cuenta/registro` aceptado. Traza de la conversión; no implica validación. |
| `perfil_id` | FK → `perfil` | sí | existente | Nivel autorizado. **No lo toca este paquete**: la conversión preserva el perfil vigente. |
| `dispositivo_id` | FK → `dispositivo` | depende | existente | Verificar nombre real en EP-03a. Se conserva tras convertir (la instalación sigue siendo la misma). |
| `creada_en` | `timestamptz` | sí | existente | Fecha de alta mostrada en V-27 con cuenta de dispositivo. |
| `actualizada_en` | `timestamptz` | sí | existente | |

**Restricciones nuevas**

- `UNIQUE (correo_hash) WHERE correo_hash IS NOT NULL` — índice único parcial. Una sola cuenta por correo; las cuentas de dispositivo (hash nulo) no compiten por él. Es la restricción que respalda el estado especial "correo ya asociado" de V-23.
- `CHECK (tipo = 'completa' → correo_hash IS NOT NULL AND correo_cifrado IS NOT NULL AND correo_cifrado_clave_ref IS NOT NULL)`.
- `CHECK (tipo = 'dispositivo' → correo_hash IS NULL AND correo_validado_en IS NULL AND estado = 'activa')` — una cuenta de dispositivo nunca queda pendiente de validación.
- `CHECK (estado = 'activa' AND tipo = 'completa' → correo_validado_en IS NOT NULL)` — no hay cuenta completa activa sin correo validado.

**Índices nuevos**

- `ux_cuenta_correo_hash` — único parcial, arriba. Sirve a `POST /auth/login` y a la detección de duplicado en registro.
- `ix_cuenta_tipo_estado` — parcial sobre `(estado)` donde `estado = 'pendiente_validacion'`. Soporta la purga/expiración de conversiones abandonadas y los reportes de estado; evita escanear la tabla entera.

**Decisión de modelo (mediana).** Correo como columnas de `cuenta` en lugar de una tabla `identidad_correo` 1:1.
*Por qué*: la relación es estrictamente 1:1 y obligatoria para toda cuenta completa; una tabla aparte agregaría un join en el camino caliente de login sin ganar nada. *Alternativa descartada*: `identidad_correo(cuenta_id, correo_hash, ...)`, que sería correcta si V1 admitiera varios correos o varios proveedores de identidad — pero DEC-176/DEC-221 excluyen proveedores externos en V1, así que el costo no se paga. *Reversibilidad*: alta, extraer a tabla 1:1 más adelante es una migración mecánica. *Si el ejecutor encuentra que EP-03a ya definió una tabla de identidad*, se adopta esa y se registra el desvío; no se crean las dos.

---

### 2.2 `cuenta_credencial` — **NUEVA**

Contraseña argon2id, separada de `cuenta`.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `cuenta_id` | `uuid` PK, FK → `cuenta(id)` ON DELETE CASCADE | sí | 1:1. La PK es la FK: impide dos credenciales por cuenta sin índice extra. |
| `hash` | `text` | sí | Cadena PHC completa de argon2id (incluye salt y parámetros). No se guardan salt ni parámetros por separado. |
| `algoritmo` | enum `credencial_algoritmo` | sí | Default `argon2id`. Existe para permitir rehash si cambian los parámetros de costo. |
| `creada_en` | `timestamptz` | sí | Default `now()`. |
| `rotada_en` | `timestamptz` | no | Última vez que se cambió la contraseña. **Gancho previsto** para HU-03b-08 (recuperación): ese paquete lo usa para invalidar sesiones anteriores. Aquí solo se escribe en el registro inicial. |

**Por qué tabla aparte y no una columna en `cuenta`** (decisión mediana): `cuenta` se lee en casi todo request autenticado y la vista Cuenta la proyecta completa; el hash de contraseña no debe viajar en esas lecturas. Separarla permite además dar al rol de runtime privilegios distintos sobre el material secreto (REQ-10) y hace trivial auditar quién la lee. *Alternativa descartada*: columna `password_hash` en `cuenta` — menos tablas, pero obliga a listar columnas explícitamente en cada `SELECT` para no filtrar el hash, y eso falla por omisión.

**Índices**: ninguno además de la PK. Siempre se accede por `cuenta_id`.

---

### 2.3 `desafio_correo` — **NUEVA**

Un código enviado al correo para validarlo. Modelado genéricamente por propósito, para que HU-03b-05 (cambio de correo) y HU-03b-08 (recuperación) lo reutilicen sin tabla nueva.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `uuid` PK | sí | |
| `cuenta_id` | FK → `cuenta(id)` ON DELETE CASCADE | sí | |
| `proposito` | enum `desafio_proposito` | sí | Este paquete solo emite `validacion_correo`. Los demás valores quedan declarados pero sin emisor: ver §3. |
| `correo_hash` | `bytea` | sí | Correo destino al momento de emitir. Redundante con `cuenta.correo_hash` hoy, pero necesario para HU-03b-05: si la persona corrige el correo, los desafíos del correo viejo deben poder invalidarse por destino. |
| `codigo_hash` | `bytea` | sí | SHA-256 del código. **El código en claro no se persiste**: solo viaja al correo. |
| `expira_en` | `timestamptz` | sí | Caducidad (REQ-03). El valor concreto es configuración, no columna. |
| `intentos_usados` | `smallint` | sí | Default 0. Contador denormalizado para la decisión de corte en el request caliente. |
| `intentos_maximos` | `smallint` | sí | Congelado al emitir, no leído de config al validar: un cambio de configuración no debe alterar el límite de un desafío ya en vuelo. |
| `estado` | enum `desafio_estado` | sí | `pendiente` \| `consumido` \| `expirado` \| `agotado` \| `invalidado`. Default `pendiente`. |
| `consumido_en` | `timestamptz` | no | |
| `reenvio_de_id` | FK → `desafio_correo(id)` | no | Autorreferencia. Un reenvío apunta al desafío que reemplaza, que pasa a `invalidado`. Permite contar reenvíos por cadena para el límite de REQ-03. |
| `creado_en` | `timestamptz` | sí | Default `now()`. Base de la ventana de espera entre reenvíos. |
| `correo_mensaje_id` | FK → `correo_mensaje(id)` | no | Traza al envío real. Nulo si el encolado falló; permite diagnosticar "no me llegó el código" sin adivinar. |

**Restricciones / índices**

- `UNIQUE (cuenta_id, proposito) WHERE estado = 'pendiente'` — índice único parcial. **Esta es la pieza clave**: garantiza a nivel de base que hay a lo sumo un desafío vivo por cuenta y propósito, así que un doble `Reenviar código` concurrente no deja dos códigos válidos. Sin ella, la idempotencia queda sujeta a una carrera entre dos requests.
- `ix_desafio_correo_expira` sobre `(expira_en) WHERE estado = 'pendiente'` — para el barrido por lote que marca `expirado`.
- `ix_desafio_correo_cuenta` sobre `(cuenta_id, creado_en DESC)` — historial y cálculo de la ventana de reenvío.

**Nota sobre `estado` vs cálculo.** `expirado` y `agotado` son estados materializados por un job de barrido, pero **la validación en línea nunca confía solo en `estado`**: evalúa `estado = 'pendiente' AND expira_en > now() AND intentos_usados < intentos_maximos`. El estado materializado existe para el historial y para no retener filas vivas, no como fuente de verdad del camino caliente. Esto debe quedar en los casos de prueba: un desafío vencido pero aún `pendiente` en la columna debe rechazarse igual.

---

### 2.4 `desafio_correo_intento` — **NUEVA**

Historial de intentos de validación. Append-only.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `bigserial` PK | sí | |
| `desafio_id` | FK → `desafio_correo(id)` ON DELETE CASCADE | sí | |
| `resultado` | enum `intento_resultado` | sí | `exito` \| `codigo_incorrecto` \| `expirado` \| `agotado`. Mapea 1:1 a los mensajes exigidos por V-24. |
| `ocurrido_en` | `timestamptz` | sí | Default `now()`. |
| `origen_hash` | `bytea` | no | Hash del identificador de origen (IP o instalación). Nunca la IP en claro. Nulo si no se dispone. |

**Índice**: `ix_desafio_intento_desafio` sobre `(desafio_id, ocurrido_en DESC)`.

**Pregunta abierta para el intake (no se resuelve aquí).** ¿Cuánto se retiene este historial? Las fuentes conservadas fijan retención para eliminación de cuenta (DEC-127/DEC-128) pero no para intentos de validación. Si no hay decisión, el ejecutor **registra el bloqueo con responsable** y aplica `ON DELETE CASCADE` desde la cuenta como único borrado, sin inventar una política de purga. No marcar como probado el criterio asociado.

---

### 2.5 `intento_acceso` — **NUEVA**

Registro de intentos de `POST /auth/login`, base del bloqueo persistido por fuerza bruta (DEC-163, REQ-04).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `bigserial` PK | sí | |
| `correo_hash` | `bytea` | sí | **Deliberadamente no es FK a `cuenta`.** Un intento contra un correo inexistente también debe contarse, y crear la fila no debe revelar si la cuenta existe. |
| `cuenta_id` | FK → `cuenta(id)` ON DELETE SET NULL | no | Se completa solo cuando el correo resolvió a una cuenta. Nulo no significa "no hubo intento", significa "no resolvió". |
| `resultado` | enum `login_resultado` | sí | `exito` \| `credencial_invalida` \| `correo_pendiente` \| `bloqueado`. `correo_pendiente` es un resultado propio porque V-25 redirige a V-24 y eso **no** debe contar como fallo de credencial. |
| `ocurrido_en` | `timestamptz` | sí | Default `now()`. |
| `origen_hash` | `bytea` | no | Hash del origen. |

**Índices**

- `ix_intento_acceso_correo_ventana` sobre `(correo_hash, ocurrido_en DESC)` — consulta de la ventana deslizante en cada login.
- `ix_intento_acceso_purga` sobre `(ocurrido_en)` — soporte de la limpieza por lote de intentos vencidos exigida por REQ-04.

---

### 2.6 `bloqueo_acceso` — **NUEVA**

Bloqueo vigente, materializado. Separado de `intento_acceso` porque el camino caliente debe resolver "¿está bloqueado?" con una lectura puntual por clave, no con un conteo sobre el historial.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `correo_hash` | `bytea` PK | sí | Clave natural. Bloqueo por identidad intentada, no por cuenta: así cubre correos inexistentes. |
| `bloqueado_hasta` | `timestamptz` | sí | Fin del bloqueo. |
| `fallos_consecutivos` | `smallint` | sí | Default 0. Se reinicia con `resultado = 'exito'`. |
| `ultimo_fallo_en` | `timestamptz` | sí | |
| `actualizado_en` | `timestamptz` | sí | |

**Índice**: `ix_bloqueo_acceso_vencidos` sobre `(bloqueado_hasta)` — barrido por lote de bloqueos vencidos.

**Decisión (mediana): dos tablas en vez de una.** *Qué*: `intento_acceso` (append-only, histórico) + `bloqueo_acceso` (upsert, estado vigente). *Por qué*: con una sola tabla histórica, cada login paga un `COUNT(*)` sobre una ventana que crece con el ataque — exactamente el peor momento para que la consulta se degrade. Con el estado materializado, el camino de rechazo es un lookup por PK. *Alternativa descartada*: contar sobre el historial con índice; más simple, pero el costo escala con el volumen del ataque que pretende mitigar. *Segunda alternativa descartada*: mantener el contador en memoria o en caché; DEC-163 exige bloqueo **persistido**, así que no califica. *Impacto*: dos tablas nuevas, una escritura extra por login fallido, ambas en la misma transacción. *Reversibilidad*: alta, `bloqueo_acceso` es derivable de `intento_acceso` y puede reconstruirse.

---

### 2.7 `sesion` — **NUEVA**

Sesión de cuenta completa. Necesaria para `POST /auth/login` y `POST /auth/logout` (REQ-04, REQ-05).

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `uuid` PK | sí | |
| `cuenta_id` | FK → `cuenta(id)` ON DELETE CASCADE | sí | |
| `dispositivo_id` | FK → `dispositivo(id)` | no | Verificar la tabla real de EP-03a. Es el gancho de la gestión de dispositivos y el cierre de sesión remoto, que son de **EP-09 — no se implementan aquí**; la columna se crea ahora para no migrar sesiones vivas después. |
| `token_hash` | `bytea` | sí | Hash del token de sesión. El token en claro no se persiste. |
| `perfil_id_emitido` | FK → `perfil` | sí | Nivel autorizado **congelado al emitir**. Ver nota abajo. |
| `creada_en` | `timestamptz` | sí | Default `now()`. |
| `expira_en` | `timestamptz` | sí | |
| `ultima_actividad_en` | `timestamptz` | no | |
| `cerrada_en` | `timestamptz` | no | Nulo = vigente. |
| `motivo_cierre` | enum `sesion_cierre_motivo` | no | `logout` \| `expiracion` \| `invalidacion`. Este paquete solo escribe `logout` y `expiracion`. |

**Índices**

- `UNIQUE (token_hash)`.
- `ix_sesion_cuenta_vigente` sobre `(cuenta_id) WHERE cerrada_en IS NULL` — sesiones vigentes de una cuenta.
- `ix_sesion_expira` sobre `(expira_en) WHERE cerrada_en IS NULL` — barrido de expiradas.

**`perfil_id_emitido`: advertencia explícita.** Congelar el perfil en la sesión hace que un cambio de perfil del lado del servidor **no** surta efecto hasta la siguiente emisión de sesión. Eso es correcto para el alcance de este paquete (recuperar el nivel autorizado al iniciar sesión) pero **se vuelve un defecto en cuanto EP-14b limite una cuenta**: la limitación no se aplicaría a una sesión ya emitida. Dónde fallaría: la resolución de capacidades del middleware, si lee `sesion.perfil_id_emitido` en vez de `cuenta.perfil_id`. Mitigación dentro de este paquete: el middleware resuelve capacidades desde `cuenta.perfil_id` y `perfil_id_emitido` queda **solo como traza de auditoría de qué nivel se emitió**. Si el ejecutor encuentra que el middleware de EP-03a ya resuelve de otro modo, se adopta el existente y se descarta esta columna antes que crear dos fuentes de verdad.

**Cerrar sesión no borra datos (REQ-05).** A nivel de modelo esto significa: `POST /auth/logout` escribe `cerrada_en` y `motivo_cierre` en `sesion`, y **no toca ninguna otra tabla**. Ningún `DELETE` sobre datos de la cuenta forma parte de este flujo. El caso de prueba correspondiente debe verificar que el conteo de filas de las tablas de datos de la cuenta es idéntico antes y después del logout.

---

### 2.8 `correo_mensaje` — **NUEVA**

Unidad de envío del `EmailService`, despachada por `pg-boss` (REQ-01). Es la tabla que sostiene la idempotencia: *un mismo evento de correo no genera dos envíos*.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `uuid` PK | sí | |
| `clave_idempotencia` | `text` | sí | **UNIQUE.** Derivada del evento de dominio (p. ej. `desafio_correo:<id>:emision`), no del momento ni de un aleatorio. Es lo que convierte el reintento de la cola en un no-op. |
| `plantilla_clave` | FK → `correo_plantilla(clave)` | sí | Resolución por clave, no por contenido embebido (REQ-01). |
| `destinatario_hash` | `bytea` | sí | Para trazar y deduplicar sin exponer el correo. |
| `destinatario_cifrado` | `bytea` | sí | Necesario para componer el envío real. Mismo esquema de cifrado que `cuenta.correo_cifrado`. |
| `destinatario_clave_ref` | `text` | sí | Referencia de clave de cifrado. |
| `variables` | `jsonb` | sí | Default `'{}'`. Variables de la plantilla. **Nunca el código en claro**: el código se compone al renderizar, a partir de un material que no se persiste, o bien se acepta explícitamente su presencia transitoria y se documenta la retención. Esto es una **decisión requerida del intake**: si no se resuelve, el ejecutor registra el bloqueo y no marca el criterio como probado. |
| `estado` | enum `correo_estado` | sí | `pendiente` \| `enviado` \| `fallido` \| `descartado`. Default `pendiente`. |
| `intentos` | `smallint` | sí | Default 0. Reintentos consumidos. |
| `ultimo_error` | `text` | no | Mensaje del proveedor, sin stack trace. |
| `proveedor` | enum `correo_proveedor` | no | `mailjet` \| `mailpit`. Se escribe al despachar, no al encolar: el adaptador lo decide el entorno. Nulo mientras está pendiente. |
| `proveedor_mensaje_id` | `text` | no | Id devuelto por el proveedor. Evidencia de entregabilidad en staging. |
| `creado_en` / `enviado_en` | `timestamptz` | sí / no | |

**Índices**

- `ux_correo_mensaje_idempotencia` — `UNIQUE (clave_idempotencia)`. El productor hace `INSERT ... ON CONFLICT DO NOTHING` **antes** de encolar en pg-boss; si no insertó, no encola. Así la idempotencia la garantiza la base, no la cola.
- `ix_correo_mensaje_estado` sobre `(estado, creado_en) WHERE estado IN ('pendiente','fallido')`.

**Relación con pg-boss (REQ-11).** `correo_mensaje` **no reemplaza** la cola: pg-boss sigue siendo el transporte, con su propio schema y sus propias tablas, administradas por su instalador y no por las migraciones de este paquete. `correo_mensaje` es el registro de dominio del envío; el job de pg-boss transporta su `id`. No se crea un broker ni un runner paralelo.

---

### 2.9 `correo_plantilla` — **NUEVA** (catálogo, sembrado por migración)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `clave` | `text` PK | sí | P. ej. `validacion_correo.codigo`. |
| `descripcion` | `text` | sí | |
| `activa` | `boolean` | sí | Default `true`. |
| `creada_en` | `timestamptz` | sí | |

Las plantillas de este paquete: la de código de validación y la de reenvío del mismo código (que puede ser la misma clave). **No se siembran** plantillas de recuperación, invitación, eliminación ni limitación de cuenta: pertenecen a historias no incluidas aquí y sembrarlas sería anticipar entrega.

El cuerpo renderizable (asunto y contenido por idioma) vive **en el repositorio como archivo versionado**, no en esta tabla. *Por qué*: una plantilla es código revisable en PR, no dato operativo; guardarla en base la saca del review y del rollback por commit. La tabla solo registra qué claves existen y si están activas, para que una clave inválida falle al encolar y no al renderizar.

---

### 2.10 Entidades existentes que este paquete **lee pero no modifica**

| Entidad | Uso | Garantía exigida |
|---|---|---|
| `dispositivo` | V-27 muestra tipo, modelo y fecha de alta con cuenta de dispositivo. | Sin cambios de forma. |
| `aceptacion_legal` | La conversión las **preserva**: cuelgan de `cuenta_id`, que no cambia. | **Cero filas escritas, movidas o reasignadas** por el registro o el login. Caso de prueba obligatorio: el conjunto de aceptaciones es idéntico antes y después de convertir. |
| `consentimiento` | Igual que el anterior; V-27 ofrece acceso permanente a V-51 (REQ-06). | Append-only, ver REQ-10. |
| `uso_producto` / `solicitud_producto` | Se conservan al convertir (DEC-218). | Mismo invariante: cuelgan de `cuenta_id`, no se reasignan. |
| `perfil` y matriz de capacidades | Nivel autorizado de la sesión. | Sin cambios. La siembra de perfiles restantes es HU-03b-02, **no incluida**. |

**Nota de verificación previa.** Los nombres de estas tablas se toman de la descripción de EP-03a y EP-01 y **deben confirmarse contra el esquema integrado en `epic/EP-01a` antes de escribir la migración**. Si alguno difiere, se adopta el nombre real; no se crea un alias ni una tabla paralela.

---

### 2.11 Ganchos previstos, **no creados aquí**

Se declaran para que el modelo no se contradiga cuando lleguen, y para que nadie los dé por entregados:

- `vinculacion_instalacion` (HU-03b-07): la reasignación transaccional de usos y aceptaciones al vincular. `sesion.dispositivo_id` es el único gancho que este paquete deja.
- `invitacion` (HU-03b-09/10): código de uso único de 7 días. Podría reutilizar `desafio_correo` con `proposito = 'invitacion'`, pero **esa decisión no se toma aquí**: requiere el estado `invitacion_pendiente` en `cuenta.estado`, que no se agrega.
- `solicitud_eliminacion` (HU-03b-14/15/16) y la purga de cuentas inactivas: fuera de alcance por completo.
- Recuperación de contraseña (HU-03b-08): reutilizaría `desafio_correo` con `proposito = 'recuperacion'` y `cuenta_credencial.rotada_en`. No se emite ningún desafío de ese propósito en este paquete.

---

## 3. Enums

| Enum | Valores | Estado | Nota |
|---|---|---|---|
| `cuenta_tipo` | `dispositivo`, `completa` | nuevo | |
| `cuenta_estado` | `activa`, `pendiente_validacion` | nuevo | **No incluye `invitacion_pendiente`**: es de HU-03b-09, fuera de alcance. Agregarlo después es `ALTER TYPE ... ADD VALUE`, no destructivo. |
| `credencial_algoritmo` | `argon2id` | nuevo | Un solo valor hoy; existe para el rehash futuro. |
| `desafio_proposito` | `validacion_correo` | nuevo | **Solo un valor.** Los propósitos de recuperación, cambio de correo e invitación se agregan en sus historias. Declarar valores sin emisor invitaría a creer que el flujo existe. |
| `desafio_estado` | `pendiente`, `consumido`, `expirado`, `agotado`, `invalidado` | nuevo | |
| `intento_resultado` | `exito`, `codigo_incorrecto`, `expirado`, `agotado` | nuevo | Mapea a los mensajes de V-24. |
| `login_resultado` | `exito`, `credencial_invalida`, `correo_pendiente`, `bloqueado` | nuevo | |
| `sesion_cierre_motivo` | `logout`, `expiracion`, `invalidacion` | nuevo | |
| `correo_estado` | `pendiente`, `enviado`, `fallido`, `descartado` | nuevo | |
| `correo_proveedor` | `mailjet`, `mailpit` | nuevo | |

**Enums de Postgres vs tablas de catálogo** (decisión menor, declarada por consistencia): se usan enums nativos porque son conjuntos cerrados, pequeños y gobernados por el código. El costo conocido es que quitar un valor exige recrear el tipo; agregar es barato. Ninguno de estos conjuntos tiene valores que se esperen retirar. Si EP-00/EP-01 ya estableció la convención contraria (tablas de catálogo), se sigue la existente.

---

## 4. Relaciones

```
perfil ──1:N──> cuenta
dispositivo ──1:N──> cuenta            (verificar cardinalidad real en EP-03a)

cuenta ──1:1──> cuenta_credencial            (solo si tipo = 'completa')
cuenta ──1:N──> desafio_correo               (máx. 1 'pendiente' por propósito)
cuenta ──1:N──> sesion
cuenta ──0:N──> intento_acceso               (FK anulable: el intento puede no resolver)
cuenta ──1:N──> aceptacion_legal             EXISTENTE, preservada
cuenta ──1:N──> consentimiento               EXISTENTE, preservada
cuenta ──1:N──> uso_producto / solicitud     EXISTENTE, preservada

desafio_correo ──1:N──> desafio_correo_intento
desafio_correo ──0:1──> desafio_correo       (reenvio_de_id, autorreferencia)
desafio_correo ──0:1──> correo_mensaje

correo_plantilla ──1:N──> correo_mensaje

bloqueo_acceso: sin FK. Clave natural correo_hash, por diseño (cubre correos inexistentes).
```

**Política de borrado.** Todas las FK hacia `cuenta` usan `ON DELETE CASCADE`, salvo `intento_acceso.cuenta_id` que usa `SET NULL` (el registro de seguridad sobrevive a la cuenta, anonimizado). Esto **no** implementa la eliminación de cuenta de HU-03b-14/15/16: es solo integridad referencial. La eliminación real tiene retención propia (DEC-127/DEC-128) y es de otro paquete.

---

## 5. Privilegios por rol (REQ-10)

Dos roles, según REQ-11: **migrador** (dueño del DDL) y **runtime** (la app). El DDL completo y los `GRANT` los ejecuta el migrador vía `prisma migrate deploy`; el runtime nunca emite DDL.

| Tabla | Runtime: SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `cuenta` | sí | sí | sí (columnas de correo, estado, tipo) | **no** |
| `cuenta_credencial` | sí | sí | sí (`hash`, `rotada_en`) | **no** |
| `desafio_correo` | sí | sí | sí (`estado`, `intentos_usados`, `consumido_en`) | **no** |
| `desafio_correo_intento` | sí | sí | **no** | **no** |
| `intento_acceso` | sí | sí | **no** | sí, **solo** para la limpieza por lote de REQ-04 |
| `bloqueo_acceso` | sí | sí | sí | sí, **solo** barrido de vencidos |
| `sesion` | sí | sí | sí | **no** (el cierre es `UPDATE cerrada_en`) |
| `correo_mensaje` | sí | sí | sí | **no** |
| `correo_plantilla` | sí | **no** | **no** | **no** (catálogo, lo siembra el migrador) |
| `aceptacion_legal` | sí | sí | **REVOKE explícito** | **REVOKE explícito** |
| `consentimiento` | sí | sí | **REVOKE explícito** | **REVOKE explícito** |

Reglas que la migración debe cumplir:

1. **Sin `DELETE` por defecto en historiales.** `desafio_correo_intento` y `sesion` no se borran: expiran y se marcan. Los dos `DELETE` concedidos (`intento_acceso`, `bloqueo_acceso`) existen porque REQ-04 exige limpieza por lote; se otorgan sobre esas tablas y no sobre otras.
2. **Append-only con `REVOKE` explícito**: `aceptacion_legal` y `consentimiento` reciben `REVOKE UPDATE, DELETE` nominado al rol de runtime, aunque ya no lo tuvieran. El `REVOKE` explícito es lo que hace auditable la intención y lo que exige REQ-10 — no basta con "no se otorgó".
3. **No degradar lo existente.** La migración **no** emite `REVOKE` sobre privilegios definidos por EP-00/EP-01 fuera de las dos tablas del punto anterior. Antes de escribirla, el ejecutor vuelca los privilegios vigentes (`information_schema.role_table_grants`) de las tablas tocadas y lo adjunta como evidencia. Si un `REVOKE` de este paquete quitaría algo que EP-00/EP-01 otorgó, **se detiene y registra el bloqueo**: no se resuelve por criterio propio.
4. **Secuencias**: `GRANT USAGE` al runtime sobre las secuencias de `desafio_correo_intento` e `intento_acceso`; sin ella el `INSERT` falla aunque el `GRANT INSERT` esté.
5. **pg-boss**: sus tablas conservan los privilegios que ya tengan. Este paquete **no** los toca.

---

## 6. Notas de migración

**Orden**, en una sola migración por fase para que cada fase deje el sistema funcional:

1. **M-01 · Enums.** `CREATE TYPE` de los diez enums. Sin efecto sobre datos.
2. **M-02 · Catálogo de correo.** `correo_plantilla` + `correo_mensaje` + grants. Independiente de `cuenta`: puede validarse sola con Mailpit.
3. **M-03 · Cuenta.** Columnas nuevas en `cuenta`, **todas anulables o con default**, backfill de `tipo='dispositivo'` y `estado='activa'`, luego `SET NOT NULL` en `tipo` y `estado`, y por último los `CHECK` y el índice único parcial. En ese orden: los CHECK se validan contra filas ya backfilleadas, no contra nulos.
4. **M-04 · Credencial y desafíos.** `cuenta_credencial`, `desafio_correo`, `desafio_correo_intento`.
5. **M-05 · Acceso.** `intento_acceso`, `bloqueo_acceso`, `sesion`.
6. **M-06 · Privilegios.** Todos los `GRANT`/`REVOKE` en un solo paso auditable, incluido el `REVOKE` explícito sobre `aceptacion_legal` y `consentimiento`.

**Puntos de cuidado, concretos:**

- **El backfill de `cuenta` es el único paso con datos existentes.** Toda cuenta previa es de dispositivo. Si en `epic/EP-01a` hubiera ya filas con correo (p. ej. sembradas), el backfill las clasificaría mal como `dispositivo` y el CHECK fallaría al crearse. El ejecutor **verifica primero** con un conteo de filas con correo no nulo; si hay alguna, se detiene y lo reporta.
- **`CREATE INDEX CONCURRENTLY` no corre dentro de una transacción.** `prisma migrate deploy` envuelve cada migración en una; los índices parciales de este paquete son sobre tablas nuevas o de volumen bajo, así que se crean en transacción normal. La excepción posible es `ux_cuenta_correo_hash` sobre `cuenta` si ya tiene volumen: si lo tiene, se separa a su propia migración sin transacción. **Decidirlo con el conteo real, no por anticipado.**
- **`ALTER TYPE ... ADD VALUE` no es reversible** por `DROP VALUE`. Por eso `cuenta_estado` y `desafio_proposito` arrancan mínimos: es más barato agregar en la historia que los necesite que convivir con valores huérfanos.
- **Índices únicos parciales son la línea de defensa de la idempotencia**, no un detalle de rendimiento: `ux_correo_mensaje_idempotencia` (un evento, un envío) y el único parcial de `desafio_correo` (un código vivo por propósito). Si una de las dos se degrada a validación en código, REQ-01 y REQ-03 dejan de estar garantizados bajo concurrencia. Los casos de prueba de CI deben ejercitar ambos **con requests concurrentes**, no secuenciales.
- **`SQLITE_BUSY` no aplica aquí**: el store de Kanai es SQLite, el de la aplicación es Postgres. No confundir los dos al escribir los scripts.

**Rollback del modelo.** Revertir los commits del paquete y, en base, bajar en orden inverso M-06→M-01. Las tablas nuevas se eliminan completas; en `cuenta` se quitan primero los CHECK y el índice único, luego las columnas. **Datos preservados**: no se borra ninguna fila de `cuenta`, `aceptacion_legal`, `consentimiento`, `uso_producto` ni `solicitud_producto`. La pérdida real del rollback son las conversiones hechas entre el deploy y la reversión: una cuenta que convirtió quedaría sin correo ni credencial, volviendo a ser de dispositivo con su identidad y sus datos intactos. **Eso debe decirse antes de revertir en un entorno con conversiones reales**, y es el motivo por el que el rollback en staging se ensaya con al menos una conversión hecha.

---

## 7. Decisiones que el intake debe resolver antes de ejecutar

Ninguna de estas se resuelve en este documento. Si siguen abiertas al ejecutar, el ejecutor **pausa con el bloqueo y el responsable** y no marca el criterio asociado como probado:

1. **Retención de `desafio_correo_intento` e `intento_acceso`.** REQ-04 exige limpieza por lote de los intentos vencidos pero no fija la ventana. Sin decisión no hay valor para el job.
2. **El código en claro en `correo_mensaje.variables`.** Si la plantilla se renderiza en el worker, el código pasa por `jsonb` y queda en reposo hasta la purga de la fila. Alternativas: (A) renderizar en el productor y guardar solo el cuerpo cifrado; (B) aceptar la presencia transitoria con purga agresiva y documentarla; (C) pasar un material derivado que el worker expande. Decisión de seguridad, responsable a designar.
3. **Esquema de cifrado del correo y gestión de la clave** (DEC-162/DEC-218 lo exigen, no lo especifican): qué cifra, dónde vive la clave, cómo se rota. `correo_cifrado_clave_ref` existe para soportar rotación, pero el esquema concreto no está decidido. **Sin credenciales fabricadas** (REQ-07).
4. **Nombres reales de las tablas existentes** (`dispositivo`, `aceptacion_legal`, `consentimiento`, `uso_producto`, `solicitud_producto`, `perfil`) contra el esquema integrado en `epic/EP-01a`.
5. **Resolución de capacidades en el middleware**: si ya lee de `cuenta.perfil_id`, `sesion.perfil_id_emitido` queda como traza; si no existe aún esa resolución, definir cuál es la fuente de verdad antes de crear la columna.