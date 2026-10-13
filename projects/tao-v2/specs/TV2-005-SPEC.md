---
id: TV2-005-SPEC
project: tao-v2
ticket: TV2-005
status: approved
---

# TV2-005 B0-03: migración única del modelo de datos del MVP con ids ULID, auditoría append-only y privilegios verificados

## Resumen ejecutivo

Se entrega una sola migración Prisma en server/prisma/migrations que deja completo el modelo del MVP: sesion_auth con dispositivoId opcional y superficie con CHECK, las tablas de eliminación (B3), evento_auditoria con el helper registrarAuditoria(tx, ...), producto con sus unidades y eventos (B5 a B7), la tabla de intentos por ruta, IP o cuenta, los GRANT para taomangalam_app y REVOKE UPDATE, DELETE en las tablas append-only. Los ids de cuenta, producto, unidad_producto y de toda tabla expuesta por path pasan a ser ULID generados en el servicio (D-04), lo que unifica la mezcla actual de cuid() y ulid() manual.
NO se hace: consola de auditoría, impersonación, publicación de productos, endpoints de eliminación ni nada de 21-extensiones-v1. Las tablas nacen preparadas, pero sin lógica de negocio que las use, salvo el helper de auditoría y el generador de ids.
Cómo se sabe que funciona: la migración corre desde cero con el rol migrador en PostgreSQL local; prisma migrate diff no muestra drift; pnpm backend:verify queda verde y sin suites de integración omitidas; los ids nuevos cumplen el patrón Ulid del contrato; GET /admin/cuentas/{cuentaId} responde 200 con una cuenta heredada; un UPDATE o DELETE de taomangalam_app sobre evento_auditoria o unidad_evento falla con permission denied.
Tamaño: 2 sesiones (T2 y T3) y 9 tareas de primer nivel. Cabe en el techo.
ADVERTENCIAS: (1) dispositivoId opcional implica quitar un NOT NULL. Es un drop de restricción y requiere aprobación humana. (2) La estrategia para los ids cuid heredados es data_rewrite si se migran. Este plan recomienda reescribirlos a ULID dentro de la misma migración, con mapeo en las FK, porque el criterio de aceptación pide que GET /admin/cuentas acepte ids ya creados. La alternativa es relajar el patrón Ulid del contrato para aceptar cuid heredados: sin data_rewrite, pero deja dos formatos de id vivos. Se requiere aprobación explícita de una de las dos. (3) Los REVOKE son seed_rbac y también requieren aprobación. (4) Se recomienda no crear preferencia_cuenta y usar cuenta.locale y cuenta.timezoneId, registrando la decisión en el contrato. Si se prefiere la tabla, se suma un create.
Datos a confirmar antes de ejecutar: el runner de tests del servidor y la ruta de las suites de Prisma e integración (confirmar en server/package.json); si cuenta.locale y cuenta.timezoneId ya existen en server/prisma/schema.prisma; el nombre del rol migrador y si taomangalam_app ya recibe default privileges (revisar la migración legal existente en server/prisma/migrations); la librería ulid que ya usan desafio_verificacion e intento_login (versión en server/package.json); la ubicación del patrón Ulid y de los x-errores de GET /admin/cuentas/{cuentaId} en el contrato OpenAPI; la lista de tablas de aceptación legal existentes que deben llevar REVOKE.

## Requirements

### REQ-01 `confirmed`
> Fuente: Adenda 1 (2026-10-12), puntos 1 y 5; pedido de cambio 1, 6 y 7

Una sola migración Prisma nueva en server/prisma/migrations deja el modelo completo del MVP y se aplica desde una base vacía con el rol migrador en PostgreSQL local, sin drift entre schema.prisma y migraciones. La migración solo agrega tablas y columnas nuevas: no borra ni renombra ninguna tabla o columna existente y no contiene reescritura de datos (sin data_rewrite). La única relajación es que sesion_auth.dispositivoId pasa a ser opcional (DROP NOT NULL de una columna, sin tocar datos). Las migraciones se prueban solo desde base vacía.

### REQ-02 `confirmed`
> Fuente: Adenda 1 (2026-10-12), punto 5 y pedido de cambio 2 y 6

sesion_auth admite dispositivoId nulo (DROP NOT NULL de una columna, sin tocar datos) y agrega la columna superficie restringida por CHECK a los valores 'app' y 'web', con DEFAULT 'app'. No se contempla ningún caso de filas existentes: las migraciones se prueban desde base vacía.

### REQ-03 `confirmed`
> Fuente: Adenda 1 (2026-10-12), puntos 2 y 3

Existen solicitud_eliminacion_cuenta, eliminacion_componente, comprobante_eliminacion (sin datos personales) y retencion_legal. eliminacion_componente.estado admite solo pendiente, en_proceso, completada y fallida_reintentando (CHECK), y su componente es uno de dominio, sesiones, analitica y comunicaciones. comprobante_eliminacion.vence_at lo calcula el servicio al crear el comprobante (fecha de creación más 90 días); un comprobante vencido se trata como vencido al consultarlo. La purga queda fuera del MVP.

### REQ-04 `confirmed`
> Fuente: Adenda 1 (2026-10-12), punto 2

evento_auditoria nace con todas las columnas de v1 (actor real y efectivo, perfil o capacidad usada, request_id, resultado, motivo, valor anterior y nuevo, impersonacion_id y caso_id nulables). resultado admite solo exito y rechazado (CHECK). El helper único registrarAuditoria(tx, ...) escribe dentro de la transacción del efecto.

### REQ-05 `confirmed`
> Fuente: Adenda 1 (2026-10-12), punto 2

El modelo de producto queda completo: producto con estado, uso_en_metodo, momento_de_uso, disponibilidad_publicada, imagen y publicado_at nulables; producto_productor con índice parcial de un productor activo por producto (sin productor_id en producto); unidad_producto con estado_emision, estado_uso, codigo_lookup_hash único y reemplaza_unidad_id; unidad_evento como única fuente del ciclo de vida; intento_codigo_producto sin códigos desconocidos en claro. Valores con CHECK: producto.estado borrador, publicado, oculto o retirado; unidad_producto.estado_emision candidata, confirmada o descartada; unidad_producto.estado_uso no_reclamada, disponible, en_uso, usada, quemada o anulada; unidad_evento.tipo generada, descartada, confirmada, activada, asignada, usada, quemada, anulada, propiedad_corregida, reasignada_por_vinculacion o intento_rechazado; unidad_evento.resultado exito o rechazo.

### REQ-06 `inferred`
> Fuente: tao-v2/.github/workflows/ci-pr.yml:158

Existe una tabla de intentos por ruta, IP o cuenta para los límites HTTP (intento por ruta según el contrato C-modelo-datos-mvp). intento_login se conserva sin cambios.

### REQ-07 `confirmed`
> Fuente: Adenda 1 (2026-10-12), punto 4

taomangalam_app es un rol de base de datos (no una cuenta de usuario de la aplicación). Las tablas nuevas le otorgan SELECT, INSERT, UPDATE y DELETE. evento_auditoria, unidad_evento y las tablas de aceptación existentes llevan REVOKE UPDATE, DELETE explícito, y una prueba conectada como taomangalam_app lo verifica intentando UPDATE y DELETE y esperando fallo por privilegios.

### REQ-08 `confirmed`
> Fuente: Adenda 1 (2026-10-12), punto 1; pedido de cambio 3, 4 y 7

Los ids de cuenta, producto, unidad_producto y de todo modelo con id propio son ULID generados en el servicio (D-04) por un generador único en server/src/, que reemplaza los cuid() de schema.prisma y los ulid() manuales (desafio_verificacion, intento_login). Los modelos con id propio quedan sin @default(cuid()) en schema.prisma, con id String generado en el servicio, de modo que la migración única y el chequeo de drift no se reabren en la sesión 2. Los tests de la sesión 1 que insertan filas generan el id con el paquete ulid. La base es nueva con ULID desde el inicio: no hay reescritura de ids cuid, ni mapeo de claves foráneas, ni backup previo, ni fixture o base heredada, y el patrón Ulid del contrato no cambia. GET /admin/cuentas/{cuentaId} se prueba con una cuenta creada por el servicio con id ULID (200), un id malformado (400) y un ULID inexistente (404).

### REQ-09 `confirmed`
> Fuente: tao-v2/docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:223

La decisión sobre preferencia_cuenta (tabla nueva o cuenta.locale y timezoneId) queda registrada en el contrato del ticket y el modelo la refleja.

### REQ-10 `confirmed` `enforcement`
> Fuente: tao-v2/.github/workflows/ci-pr.yml:1431

La verificación se hace con Node 24 y los comandos backend:prepare, up, verify y down de TV2-004. backend:verify no cuenta como verde si hay suites de integración omitidas. El reporte de cierre no incluye contraseñas, tokens, OTP ni códigos completos.
## Tasks

#### S1.T1 — Modelo Prisma y migración única: los modelos con id propio quedan sin @default(cuid()) en schema.prisma, con id String generado en el servicio (ULID, D-04), para que la migración única y el chequeo de drift no se reabran en la sesión 2. Los tests de la sesión 1 que inserten filas generan el id con el paquete ulid.
Contrato: rollback: Revertir los cambios de schema.prisma y borrar la carpeta de la migración nueva. En la base local, pnpm backend:down y luego pnpm backend:prepare.. Status: done

#### S1.T1.1 — sesion_auth: dispositivoId opcional (DROP NOT NULL de una columna, sin tocar datos) y columna superficie con DEFAULT 'app' y CHECK ('app','web'). No hay caso de filas existentes.
Contrato: rollback: Revertir el bloque de sesion_auth en schema.prisma y el SQL del CHECK.. Status: done

#### S1.T1.2 — Tablas de eliminación B3: solicitud_eliminacion_cuenta, eliminacion_componente (componente en dominio, sesiones, analitica, comunicaciones, con estado), comprobante_eliminacion sin columnas personales y con vence_at, y retencion_legal.
Contrato: rollback: Quitar los 4 modelos de schema.prisma.. Status: done

#### S1.T1.3 — evento_auditoria con actor real y efectivo, perfil o capacidad usada, request_id, resultado, motivo, valor anterior y nuevo (JSON), e impersonacion_id y caso_id nulables.
Contrato: rollback: Quitar el modelo evento_auditoria.. Status: done

#### S1.T1.4 — Modelo de producto: producto (estado, uso_en_metodo, momento_de_uso, disponibilidad_publicada, imagen y publicado_at nulables, sin productor_id), producto_productor con índice único parcial WHERE activo en SQL manual, unidad_producto (estado_emision, estado_uso, codigo_lookup_hash único, reemplaza_unidad_id autorreferente), unidad_evento e intento_codigo_producto (solo hash o prefijo, sin código en claro).
Contrato: rollback: Quitar los 5 modelos y el SQL del índice parcial.. Status: done

#### S1.T1.5 — Tabla intento_ruta (ruta, ip, cuentaId nulable, creado_at) con índice compuesto (ruta, ip, creado_at) para consultas acotadas por ventana de tiempo, sin barridos O(filas). Según la decisión de REQ-09, agregar o no cuenta.locale y cuenta.timezoneId.
Contrato: rollback: Quitar el modelo intento_ruta y el bloque de preferencias.. Status: done

#### S1.T2 — Agregar al SQL de la migración los GRANT SELECT, INSERT, UPDATE, DELETE a taomangalam_app sobre cada tabla nueva y REVOKE UPDATE, DELETE explícito sobre evento_auditoria, unidad_evento y las tablas de aceptación existentes, con el mismo patrón que la migración legal ya presente en server/prisma/migrations.
Contrato: rollback: Quitar el bloque GRANT/REVOKE del SQL de la migración.. Status: done

#### S1.T2.1 — Leer la migración legal existente en server/prisma/migrations y anotar en el SQL nuevo, como comentario, el nombre del rol migrador, el patrón de GRANT usado y la lista de tablas de aceptación existentes que llevarán REVOKE.
Contrato: rollback: Quitar el comentario de cabecera del SQL de la migración.. Status: done

#### S1.T2.2 — GRANT SELECT, INSERT, UPDATE, DELETE a taomangalam_app sobre las tablas nuevas de eliminación (solicitud_eliminacion_cuenta, eliminacion_componente, comprobante_eliminacion, retencion_legal) e intento_ruta.
Contrato: rollback: Quitar esas sentencias GRANT del SQL de la migración.. Status: done

#### S1.T2.3 — GRANT SELECT, INSERT, UPDATE, DELETE a taomangalam_app sobre producto, producto_productor, unidad_producto e intento_codigo_producto, y GRANT SELECT, INSERT sobre evento_auditoria y unidad_evento.
Contrato: rollback: Quitar esas sentencias GRANT del SQL de la migración.. Status: done

#### S1.T2.4 — REVOKE UPDATE, DELETE explícito a taomangalam_app sobre evento_auditoria y unidad_evento, ubicado después de los GRANT para que no lo anulen default privileges.
Contrato: rollback: Quitar los REVOKE de evento_auditoria y unidad_evento del SQL.. Status: done

#### S1.T2.5 — REVOKE UPDATE, DELETE explícito a taomangalam_app sobre cada tabla de aceptación legal existente identificada en la primera subtarea.
Contrato: rollback: Quitar los REVOKE de las tablas de aceptación del SQL.. Status: done

#### S1.T2.6 — Aplicar la migración sobre la base local con el rol migrador (pnpm backend:prepare) y confirmar con una consulta a information_schema.role_table_grants que taomangalam_app no tiene UPDATE ni DELETE en las tablas append-only.
Contrato: rollback: pnpm backend:down y pnpm backend:prepare para recrear la base local sin la migración.. Status: done

#### S1.T3 — Registrar en el contrato del ticket la decisión de preferencia_cuenta (recomendada: cuenta.locale y timezoneId) y la de intentos HTTP (tabla nueva intento_ruta, sin generalizar intento_login).
Contrato: rollback: Revertir la entrada del contrato.. Status: done

#### S1.T3.1 — Agregar al contrato del ticket la decisión de preferencia_cuenta: opción elegida (cuenta.locale y cuenta.timezoneId, o tabla preferencia_cuenta), motivo y alternativa descartada.
Contrato: rollback: Quitar la entrada de preferencia_cuenta del contrato.. Status: done

#### S1.T3.2 — Agregar al contrato del ticket la decisión de intentos HTTP: tabla nueva intento_ruta con índice (ruta, ip, creado_at), e intento_login sin cambios ni generalización.
Contrato: rollback: Quitar la entrada de intentos HTTP del contrato.. Status: done

#### S1.T3.3 — Contrastar el contrato con server/prisma/schema.prisma: la forma de preferencias declarada existe en el schema y la otra no (no conviven cuenta.locale y preferencia_cuenta).
Contrato: rollback: Ajustar la entrada del contrato o el bloque del schema para que coincidan.. Status: done

#### S1.T4 — Probar la migración única desde base vacía con el rol migrador en PostgreSQL local, y verificar que no hay drift. Sin fixture ni base heredada.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: done

#### S1.T4.1 — Test de migración desde cero: sobre base vacía, prisma migrate deploy con el rol migrador registra la migración nueva como aplicada en _prisma_migrations, y prisma migrate diff --exit-code devuelve 0 (sin drift).
Contrato: rollback: Borrar el archivo de test de migración desde cero.. Status: done

#### S1.T4.3 — Test de sesion_auth: INSERT con superficie='web' y dispositivoId NULL se acepta; INSERT con superficie='desktop' falla por el CHECK.
Contrato: rollback: Borrar los casos de sesion_auth.. Status: done

#### S1.T4.4 — Test de eliminación: solicitud con sus 4 eliminacion_componente se inserta y consulta; componente='facturacion' falla; comprobante_eliminacion tiene vence_at = creado + 90 días y no expone columnas de email, nombre ni teléfono (consulta a information_schema.columns).
Contrato: rollback: Borrar los casos de eliminación.. Status: done

#### S1.T4.5 — Test de producto: producto con producto_productor activo, unidad_producto y unidad_evento se insertan y leen; un segundo productor activo falla y uno inactivo se acepta; codigo_lookup_hash duplicado falla; intento_codigo_producto no tiene columna de código en claro.
Contrato: rollback: Borrar los casos de producto.. Status: done

#### S1.T4.6 — Test de intento_ruta: INSERT con cuentaId NULL se acepta y EXPLAIN de la consulta por (ruta, ip) en ventana de tiempo muestra Index Scan sobre el índice compuesto.
Contrato: rollback: Borrar los casos de intento_ruta.. Status: done

#### S1.T4.7 — Test de privilegios conectado como taomangalam_app: UPDATE y DELETE sobre evento_auditoria, unidad_evento y una tabla de aceptación existente fallan con código 42501; INSERT y UPDATE sobre producto y solicitud_eliminacion_cuenta se aceptan.
Contrato: rollback: Borrar el archivo de test de privilegios.. Status: done

#### S1.T4.8 — Verificar con Node 24 que pnpm backend:verify sale con código 0 y reporta 0 suites de integración omitidas, y que forzar la omisión de la suite de Prisma hace fallar el comando. El reporte no incluye contraseñas, tokens, OTP ni códigos completos.
Contrato: rollback: Revertir cualquier ajuste al runner de verify hecho en esta subtarea.. Status: done

#### S2.T1 — Generador único de ULID en server/src/ que reemplaza los ulid() manuales de desafio_verificacion e intento_login y los cuid() de cuenta, producto, unidad_producto y tablas expuestas por path. Se reusa la dependencia ulid ya presente en el servidor; no se agrega otra.
Contrato: rollback: Revertir el módulo del generador de ids ULID y sus usos en el servicio. No se restaura cuid.. Status: pending

#### S2.T3 — Helper registrarAuditoria(tx, entrada) en server/src/ con entrada tipada (objeto, sin any) que solo acepta el cliente transaccional y escribe en evento_auditoria. Es el único punto de escritura de auditoría.
Contrato: rollback: Borrar el módulo del helper.. Status: pending

#### S2.T4 — Prueba de GET /admin/cuentas/{cuentaId} con una cuenta creada por el servicio con id ULID (200), un id malformado (400) y un ULID inexistente (404), sin fixture heredado.
Contrato: rollback: Revertir el validador del parámetro al estado previo.. Status: pending

#### S2.T5 — Tests de regresión de la sesión 2 sobre ids y auditoría, sin tocar GET /admin/cuentas (eso lo cubre S2.T4): (a) los ids nuevos generados por el servicio para cuenta, producto, unidad_producto, desafio_verificacion e intento_login cumplen el patrón ^[0-9A-HJKMNP-TV-Z]{26}$; (b) registrarAuditoria(tx, ...) deja exactamente 1 fila en evento_auditoria dentro de su transacción y esa fila se revierte (0 filas) cuando la transacción hace rollback.
Contrato: rollback: Eliminar los archivos de test añadidos o ajustados por esta task; no hay cambios en código de producción ni en el esquema.. Status: pending
## Cambios al modelo de datos

- tipo: alter_additive | objetos: sesion_auth.superficie, CHECK sesion_auth_superficie_chk | destructivo: no | tarea: S1.T1 | rollback: Migración inversa: DROP CONSTRAINT del CHECK y DROP COLUMN superficie.
- tipo: drop | objetos: sesion_auth.dispositivoId NOT NULL | destructivo: no | tarea: S1.T1 | rollback: ALTER COLUMN dispositivoId SET NOT NULL después de borrar o rellenar las sesiones web sin dispositivo. No toca datos existentes (la base es nueva).
- tipo: create | objetos: solicitud_eliminacion_cuenta, eliminacion_componente, comprobante_eliminacion, retencion_legal | destructivo: no | tarea: S1.T1 | rollback: DROP TABLE en orden inverso de FK en una migración de reversión.
- tipo: create | objetos: evento_auditoria | destructivo: no | tarea: S1.T1 | rollback: DROP TABLE evento_auditoria.
- tipo: create | objetos: producto, producto_productor, idx parcial producto_productor(producto_id) WHERE activo, unidad_producto, unidad_evento, intento_codigo_producto | destructivo: no | tarea: S1.T1 | rollback: DROP TABLE en orden inverso de FK.
- tipo: create | objetos: intento_ruta (ruta, ip, cuentaId) | destructivo: no | tarea: S1.T1 | rollback: DROP TABLE intento_ruta.
- tipo: seed_rbac | objetos: GRANT SELECT, INSERT, UPDATE, DELETE a taomangalam_app en tablas nuevas, REVOKE UPDATE, DELETE a taomangalam_app en evento_auditoria, unidad_evento y tablas de aceptación existentes | destructivo: no | tarea: S1.T2 | rollback: GRANT UPDATE, DELETE de vuelta y REVOKE de los grants nuevos en una migración de reversión.

Los ids no se reescriben: la base es nueva y todo id nuevo es ULID generado en el servicio (sin migración de datos).
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Una sola migración Prisma nueva en server/prisma/migrations deja el modelo completo del MVP y se aplica desde una base vacía con el rol migr
- REQ-03 (edit) `confirmed`: Existen solicitud_eliminacion_cuenta, eliminacion_componente, comprobante_eliminacion (sin datos personales) y retencion_legal. eliminacion_
- REQ-04 (edit) `confirmed`: evento_auditoria nace con todas las columnas de v1 (actor real y efectivo, perfil o capacidad usada, request_id, resultado, motivo, valor an
- REQ-05 (edit) `confirmed`: El modelo de producto queda completo: producto con estado, uso_en_metodo, momento_de_uso, disponibilidad_publicada, imagen y publicado_at nu
- REQ-07 (edit) `confirmed`: taomangalam_app es un rol de base de datos (no una cuenta de usuario de la aplicación). Las tablas nuevas le otorgan SELECT, INSERT, UPDATE 
- REQ-08 (edit) `confirmed`: Los ids de cuenta, producto, unidad_producto y de todo modelo con id propio son ULID generados en el servicio (D-04) por un generador único

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: sesion_auth admite dispositivoId nulo (DROP NOT NULL de una columna, sin tocar datos) y agrega la columna superficie restringida por CHECK a
- REQ-01 (edit) `confirmed`: Una sola migración Prisma nueva en server/prisma/migrations deja el modelo completo del MVP y se aplica desde una base vacía con el rol migr
- REQ-08 (edit) `confirmed`: Los ids de cuenta, producto, unidad_producto y de todo modelo con id propio son ULID generados en el servicio (D-04) por un generador único 

**Task ops:**

- edit S1.T1 { desc="Modelo Prisma y migración única: los modelos con id propio quedan sin @default(cuid()) en schema.prisma, con id String generado en el servicio (ULID, D-04), para que la migración única y el chequeo de drift no se reabran en la sesión 2. Los tests de la sesión 1 que inserten filas generan el id con el paquete ulid." }
- edit S1.T1.1 { desc="sesion_auth: dispositivoId opcional (DROP NOT NULL de una columna, sin tocar datos) y columna superficie con DEFAULT 'app' y CHECK ('app','web'). No hay caso de filas existentes." }
- edit S1.T4 { desc="Probar la migración única desde base vacía con el rol migrador en PostgreSQL local, y verificar que no hay drift. Sin fixture ni base heredada." }
- edit S2.T1 { rollback="Revertir el módulo del generador de ids ULID y sus usos en el servicio. No se restaura cuid." }
- edit S2.T4 { desc="Prueba de GET /admin/cuentas/{cuentaId} con una cuenta creada por el servicio con id ULID (200), un id malformado (400) y un ULID inexistente (404), sin fixture heredado." }
- edit S2.T5 { desc="Prueba de integración de GET /admin/cuentas/{cuentaId} con una cuenta creada por el servicio con id ULID (200), un id malformado (400) y un ULID inexistente (404), sin fixture heredado." }

### Enmienda 3

**Task ops:**

- edit S2.T5 { desc="Tests de regresión de la sesión 2 sobre ids y auditoría, sin tocar GET /admin/cuentas (eso lo cubre S2.T4): (a) los ids nuevos generados por el servicio para cuenta, producto, unidad_producto, desafio_verificacion e intento_login cumplen el patrón ^[0-9A-HJKMNP-TV-Z]{26}$; (b) registrarAuditoria(tx, ...) deja exactamente 1 fila en evento_auditoria dentro de su transacción y esa fila se revierte (0 filas) cuando la transacción hace rollback.", rollback="Eliminar los archivos de test añadidos o ajustados por esta task; no hay cambios en código de producción ni en el esquema.", validates=["REQ-04","REQ-08"], isTest=true }
## Sessions

### Session 1 · T3 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T1.4
- [x] S1.T1.5
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T2.4
- [x] S1.T2.5
- [x] S1.T2.6
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T3.3
- [x] S1.T4
- [x] S1.T4.1
- [x] S1.T4.3
- [x] S1.T4.4
- [x] S1.T4.5
- [x] S1.T4.6
- [x] S1.T4.7
- [x] S1.T4.8

**Gate (auto)**: La migración única se aplica desde base vacía con el rol migrador, prisma migrate diff no muestra drift, y una suite de integración muestra UPDATE y DELETE rechazados en evento_auditoria, unidad_evento y aceptaciones.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5

**Gate (auto)**: Con una cuenta creada por el servicio (id ULID), GET /admin/cuentas/{cuentaId} responde 200, y 400 con un id malformado o 404 con un ULID inexistente según los x-errores del contrato. Las cuentas nuevas tienen id ULID y registrarAuditoria persiste o revierte junto con su transacción.

### Session 3 · T0 · open
