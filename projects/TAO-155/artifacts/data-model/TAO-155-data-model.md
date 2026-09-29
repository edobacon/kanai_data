# Modelo de datos — TAO-155 · HU-00-06

Prisma 7 con migración desde cero por el rol migrador, seeds nombrados idempotentes y reinicio local protegido.

---

## 1. Alcance del modelo

Este ticket **no introduce entidades de dominio**. Su modelo de datos es **infraestructura de persistencia**:

- Objetos de PostgreSQL: roles, schema, privilegios por defecto.
- Metadatos de migración (`_prisma_migrations`).
- Una entidad técnica mínima para que el escenario de verificación del runner de seeds sea comprobable (conteos e ids estables).
- Configuración de esquema Prisma (datasource/generator) sin modelos de negocio.

Las tablas de dominio quedan **explícitamente diferidas** a las épicas funcionales (EP-03a en adelante).

> Fuente: el ticket declara «Datos: ninguno (solo infraestructura de migraciones)». Todo objeto con nombre propuesto aquí está marcado como **propuesto** y requiere confirmación; no se deriva de una referencia canónica visible.

---

## 2. Inventario (nuevo vs existente)

| Objeto | Capa | Tipo | Estado | REQ |
|---|---|---|---|---|
| Base `taomangalam_dev` / `taomangalam_test` | PostgreSQL | base | Existente (bootstrap — bloqueada por HU-00-04, HU-00-05) | 03, 05 |
| Rol migrador (`MIGRATION_DATABASE_URL`) | PostgreSQL | rol | Existente (bootstrap) | 02, 03 |
| Rol de aplicación `taomangalam_app` (`DATABASE_URL`) | PostgreSQL | rol | Existente (bootstrap) | 02, 03 |
| Schema `public` | PostgreSQL | schema | Existente | 03 |
| Privilegios por defecto (DML) sobre objetos del migrador | PostgreSQL | privilegios | **Nuevo** (migración inicial) | 03 |
| `_prisma_migrations` | PostgreSQL | tabla | **Nuevo** (gestionada por Prisma) | 01, 03 |
| `seed_probe` *(nombre propuesto)* | PostgreSQL | tabla técnica | **Nuevo** (migración inicial) | 04 |
| Registro de escenarios de seed | `server/` (TypeScript) | código (no persistente) | **Nuevo** | 04 |
| `schema.prisma`, `prisma.config.ts`, `migrations/` | `server/prisma/` | archivos | **Nuevo** | 01 |
| Modelos de dominio | — | tablas | **Diferido** (EP-03a+) | — |

---

## 3. Configuración de esquema Prisma (sin modelos de dominio)

- Ubicación: `server/prisma/schema.prisma`, `server/prisma.config.ts`, `server/prisma/migrations/`.
- Major de Prisma: **7**, fijada en el lockfile (REQ-01).
- `datasource`: un solo proveedor PostgreSQL. La URL **de migración** (`MIGRATION_DATABASE_URL`, rol migrador) se usa para `migrate`/`seed`; la URL **de aplicación** (`DATABASE_URL`, rol `taomangalam_app`) la usa el cliente en runtime (REQ-02).
- `generator`: cliente Prisma 7. **Nota de migración:** verificar en el intake si Prisma 7 requiere *driver adapter* (`@prisma/adapter-pg`) y el cambio de generador (`prisma-client` vs `prisma-client-js`); impacta el pool (REQ-06) y debe quedar en el plan.
- **Sin modelos** en el baseline: la migración inicial no crea tablas de dominio. Si el proveedor necesita extensiones (p. ej. `uuid-ossp`/`pgcrypto`), se declaran aquí como `extensions`; **no confirmado**, marcar para intake.

---

## 4. Roles y privilegios (PostgreSQL)

Entidades de seguridad (no son modelos Prisma; se gobiernan en la migración inicial, REQ-03).

| Objeto | Autoridad | Permisos | Notas |
|---|---|---|---|
| Rol migrador | DDL + DML + dueño de objetos | `CREATE` en `public`, `ALTER DEFAULT PRIVILEGES` | Solo lo usan `db:migrate:dev`, `db:migrate:deploy`, `db:seed`. **Nunca** en el backend en ejecución (REQ-02). |
| Rol `taomangalam_app` | DML sobre objetos del migrador | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (+ `USAGE, SELECT` en secuencias) | `DATABASE_URL` del runtime. |

**Privilegios por defecto** (los deja la migración inicial, ejecutados como migrador):

- `GRANT USAGE ON SCHEMA public TO taomangalam_app;`
- `ALTER DEFAULT PRIVILEGES FOR ROLE <migrador> IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO taomangalam_app;`
- `ALTER DEFAULT PRIVILEGES FOR ROLE <migrador> IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO taomangalam_app;`
- Revocar `CREATE` sobre `public` a `taomangalam_app` (impide DDL accidental).

**Notas:**

- Los privilegios por defecto aplican **solo a objetos futuros** creados por el migrador. Al no haber objetos en el baseline, ninguna tabla existente requiere grant explícito; toda tabla de dominio posterior heredará DML automáticamente (esto es lo que habilita el AC de las cuatro operaciones).
- El rol de aplicación aplicando migraciones debe **fallar por permisos** (AC 2): sin `CREATE` en `public` ni permiso sobre `_prisma_migrations`, el intento se rechaza.
- Los nombres exactos de los roles y el rol dueño salen de HU-00-04/05; aquí se asume `migrador` y `taomangalam_app` según el ticket.

---

## 5. Tabla técnica de verificación de seeds — `seed_probe` *(nombre propuesto)*

Necesaria para que el «escenario de verificación del propio mecanismo» (REQ-04) sea comprobable: dos ejecuciones deben dar **los mismos conteos e ids** (AC 4, QA-00-06-03). Sin tabla de dominio disponible, el escenario siembra esta entidad técnica.

| Campo | Tipo Prisma | Tipo PostgreSQL | Obligatorio | Default | Clave | Notas |
|---|---|---|---|---|---|---|
| `id` | `String` | `text` | Sí | — | PK | **Id determinista** definido por el escenario (p. ej. `probe-1`). No autogenerado: es la razón por la que la 2ª corrida repite los mismos ids. |
| `scenarioId` | `String` | `text` | Sí | — | — | Id estable del escenario que sembró la fila. |
| `label` | `String` | `text` | Sí | — | — | Etiqueta del fixture. |
| `payload` | `Json` | `jsonb` | No | `{}` | — | Datos ficticios, **sin PII real** (requisito transversal de seguridad). |
| `createdAt` | `DateTime` | `timestamptz(3)` | Sí | — | — | Valor del **reloj controlado** (fijo por escenario), **no** `now()`. |
| `updatedAt` | `DateTime` | `timestamptz(3)` | Sí | — | — | Mismo reloj controlado. |

**Claves e índices**

| Índice | Definición | Propósito |
|---|---|---|
| `seed_probe_pkey` | PK (`id`) | Unicidad del fixture. |
| `seed_probe_scenario_label_key` | UNIQUE (`scenarioId`, `label`) | Ancla de idempotencia por upsert. |
| `seed_probe_scenario_id_idx` | IDX (`scenarioId`) | Conteo por escenario en la verificación. |

**Relaciones:** ninguna. Es una tabla técnica aislada, sin FK a dominio.

**Estrategia de idempotencia:** el escenario hace **upsert** por `id` (o por `(scenarioId, label)`); `createdAt`/`updatedAt` vienen del reloj controlado. Resultado: segunda corrida → mismos conteos e ids, sin filas nuevas (AC 4).

**Alternativa descartada:** tabla de bookkeeping `_seed_history` (registrar corridas aplicadas y saltarlas si ya se aplicaron). Se descarta como mecanismo primario porque la idempotencia pedida es **por upsert determinista** (mismos ids), no por salto; queda como opción de observabilidad si se quiere trazar corridas.

---

## 6. Registro de escenarios de seed (código, no persistente)

- Estructura: mapa `id estable → escenario ejecutable` en TypeScript (REQ-04). **No** es tabla de base.
- Id de escenario inexistente → el runner termina con **código ≠ 0** y **lista los ids válidos** (AC 5, QA-00-06-04).
- Reloj controlado inyectado en el contexto del escenario (determinismo).
- Los escenarios de `tecnologia/18 §6` se agregan en las épicas que crean sus entidades; este ticket solo entrega el runner + el escenario de verificación.
- Observabilidad: el runner registra inicio, fin y resultado **sin credenciales** (requisito transversal). Preferir logs; no se crea tabla para esto.

---

## 7. Metadatos de migración — `_prisma_migrations`

| Aspecto | Detalle |
|---|---|
| Origen | Gestionada por Prisma (no la define el modelo de la app). |
| Campos relevantes | `migration_name`, `checksum`, `started_at`, `finished_at`, `rolled_back_at`, `applied_steps_count`, `logs`. |
| Uso en el ticket | QA-00-06-01 verifica que tras `pnpm db:migrate:deploy` sobre base vacía figura la migración inicial. |
| Acceso | Escriben el migrador/Prisma; el rol de aplicación **no** la modifica (refuerza el fallo por permisos del AC 2). |

---

## 8. Conexión y salud (sin impacto de esquema)

- **Pool limitado a 8** conexiones (DEC-200, REQ-06): se fija en la URL de aplicación (`connection_limit=8`) o en la config del adapter; no altera el esquema.
- `GET /health/ready` ejecuta una **sonda real de base** (`SELECT 1`) y responde 200 con el chequeo de base en `ok` (AC 7, REQ-06). No requiere objeto nuevo.
- `db:reset:local` es una **guarda de entorno** (host local, base `taomangalam_dev`/`taomangalam_test`, `APP_ENV=development`), sin cambio de esquema; se niega sin tocar la base (AC 6, QA-00-06-02, REQ-05).

---

## 9. Notas de migración

- **Migración inicial versionada** aplicable desde base vacía con el rol migrador; `db:migrate:deploy` idempotente (segunda corrida: sin pendientes) (AC 1).
- **Baseline sin dominio:** no crea tablas de negocio; sí deja privilegios por defecto para que todo lo que cree el migrador en el futuro sea DML para `taomangalam_app` (REQ-03).
- **Expand/contract** obligatorio para cambios destructivos futuros.
- **Rollback:** revertir schema, migraciones y seeds **juntos** antes de promover. En desarrollo, **recrear la base desde cero** en vez de una reversión ambigua.
- **Prohibido `db push`** fuera de desarrollo desechable (tecnologia/17 §5).
- **`prisma format` / `validate` / `generate`** integrados a `pnpm generate` y al gate de CI (REQ-07); no generan objetos de datos.
- **Convención de nombres** según tecnologia/21 §6 (no visible aquí): confirmar en intake el nombre real de la tabla de verificación y si va en `public` o en un schema dedicado.

---

## 10. Abierto / a confirmar en intake

1. Nombre definitivo y ubicación de la tabla de verificación de seeds (`seed_probe` propuesto); si DEC-157/DEC-198 fijan naming, respetarlo.
2. ¿Prisma 7 exige driver adapter y generador nuevos? Impacta datasource, generación y pool (REQ-06).
3. ¿El baseline declara extensiones (`uuid-ossp`/`pgcrypto`) o se difieren a la primera épica con datos?
4. ¿Se quiere bookkeeping de corridas de seed (tabla) o alcanza con logs?
5. Nombres/rol dueño reales de los roles migrador y aplicación (provistos por HU-00-04/05).

---

## 11. Diferido (fuera de este ticket)

- Tablas de dominio y sus relaciones/índices: EP-03a en adelante.
- Escenarios de seed de `tecnologia/18 §6`: en las épicas que crean sus entidades.
- Scripts remotos de túnel y Prisma Studio remoto: HU-00-14.