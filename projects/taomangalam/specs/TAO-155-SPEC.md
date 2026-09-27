---
id: TAO-155-SPEC
project: taomangalam
ticket: TAO-155
status: draft
---

# Prisma 7 con migración desde cero por el rol migrador, seeds nombrados idempotentes y reinicio local protegido

## Resumen ejecutivo

Configura Prisma 7 en server/ (schema.prisma, prisma.config.ts, migrations/ con major 7 fijada), los dos roles de conexión validados con zod (migrador vs aplicación), la migración inicial aplicable desde base vacía con privilegios DML por defecto, un runner de seeds nombrados idempotentes, db:reset:local protegido, pool acotado a 8 conexiones y GET /health/ready con sonda real. NO incluye tablas de dominio (EP-03a+), scripts remotos de túnel/Studio (HU-00-14) ni db push fuera de desarrollo. Funciona si: base vacía migra y la segunda corrida no reporta pendientes, el rol de aplicación no puede migrar pero ejecuta DML, los seeds son idempotentes, --scenario inexistente falla listando los válidos, reset:local se niega fuera de local/dev, y /health/ready responde 200 con el chequeo de base en ok. Tamaño: 3 puntos, 4 sesiones.

## Requirements

#### REQ-01 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:221
> Necesidad: build
Prisma queda configurado en server/ con schema.prisma, prisma.config.ts y migrations/, y la major 7 fijada en el lockfile.

#### REQ-02 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-200-roles-y-conexiones-prisma-pgboss.md:24
> Necesidad: build
MIGRATION_DATABASE_URL (rol migrador) y DATABASE_URL (rol aplicación) se validan con zod, y el backend en ejecución normal nunca usa el rol migrador.

#### REQ-03 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:222
> Necesidad: build
La primera migración versionada es aplicable desde una base vacía con el rol migrador, crea el schema de aplicación y otorga privilegios DML por defecto a taomangalam_app para lo que crea el migrador.

#### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:123
> Necesidad: build
Existe un runner de seeds con registro de escenarios por id estable, reloj controlado e idempotencia, expuesto con `pnpm db:seed --scenario <id>`, más un escenario de verificación del propio mecanismo.

#### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:459
> Necesidad: build
La superficie local de base expone `pnpm db:studio:local` y `pnpm db:psql:local`, y `pnpm db:reset:local` verifica host local, base taomangalam_dev o taomangalam_test y APP_ENV=development antes de actuar; en caso contrario se niega sin tocar la base.

#### REQ-06 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-200-roles-y-conexiones-prisma-pgboss.md:24
> Necesidad: build
El pool de Prisma se limita a 8 conexiones (DEC-200) y GET /health/ready ejecuta una sonda real de base que responde 200 con el chequeo de base en ok.

#### REQ-07 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:223
> Necesidad: build
prisma format, prisma validate y prisma generate quedan integrados a `pnpm generate` y al gate de CI.

## Tasks

#### S1.T1 — Configurar Prisma 7 en server/: crear server/prisma/schema.prisma, server/prisma.config.ts y server/prisma/migrations/, y fijar la major 7 en el lockfile.
Contrato: rollback: Revertir schema.prisma, prisma.config.ts, migrations/ y el pin/lockfile de Prisma al estado previo.. Status: pending

#### S1.T2 — Definir con zod la validación de entorno: MIGRATION_DATABASE_URL (rol migrador) y DATABASE_URL (rol aplicación); el runtime de la app consume solo DATABASE_URL.
Contrato: rollback: Quitar el módulo de validación de env y sus referencias en el arranque.. Status: pending

#### S1.T3 — Integrar prisma format, prisma validate y prisma generate al script `pnpm generate` y al gate de validación del proyecto.
Contrato: rollback: Revertir package.json y el script de gate a los comandos previos.. Status: pending

#### S1.T4 — Tests unitarios: validación zod de DATABASE_URL/MIGRATION_DATABASE_URL (válidas, faltante, formato inválido, arranque sin rol migrador) y chequeo de que `pnpm generate` corre format/validate/generate y falla con schema inválido.
Contrato: rollback: Eliminar el archivo de tests agregado.. Status: pending

#### S2.T1 — Crear la primera migración versionada que deja el schema de aplicación y los privilegios por defecto: lo creado por el migrador otorga DML a taomangalam_app.
Contrato: rollback: Borrar la carpeta de migración inicial y, en desarrollo, recrear la base desde cero.. Status: pending

#### S2.T2 — Definir los comandos `pnpm db:migrate:dev` y `pnpm db:migrate:deploy` usando MIGRATION_DATABASE_URL (rol migrador).
Contrato: rollback: Revertir package.json y quitar los scripts de migración.. Status: pending

#### S2.T3 — Tests de integración contra PostgreSQL local: migración desde cero y registro en `_prisma_migrations` (QA-00-06-01), segunda corrida sin pendientes, fallo por permisos con el rol app y DML (SELECT/INSERT/UPDATE/DELETE) permitido al rol app.
Contrato: rollback: Eliminar el archivo de tests y la base efímera usada.. Status: pending

#### S3.T1 — Implementar el runner de seeds con registro de escenarios por id estable, reloj controlado e idempotencia.
Contrato: rollback: Revertir el módulo del runner de seeds y sus registros de escenario.. Status: pending

#### S3.T2 — Exponer el comando `pnpm db:seed --scenario <id>` (con listado y fallo ante id inexistente) y agregar el escenario de verificación del mecanismo.
Contrato: rollback: Revertir el script db:seed y quitar el escenario de verificación.. Status: pending

#### S3.T3 — Tests: idempotencia del escenario de verificación (mismos conteos e ids en dos corridas, QA-00-06-03), escenario inexistente (código != 0 y lista de válidos, QA-00-06-04) y escenario no-op idempotente.
Contrato: rollback: Eliminar el archivo de tests agregado.. Status: pending

#### S4.T1 — Implementar las guardas de `pnpm db:reset:local`: host local, base taomangalam_dev o taomangalam_test y APP_ENV=development, negándose sin tocar la base si no se cumplen.
Contrato: rollback: Revertir el script db:reset:local y sus guardas a ausente.. Status: pending

#### S4.T2 — Agregar los comandos `pnpm db:studio:local` y `pnpm db:psql:local` para operar contra la base local.
Contrato: rollback: Revertir package.json y quitar los scripts db:studio:local y db:psql:local.. Status: pending

#### S4.T3 — Limitar el pool de Prisma a 8 conexiones (DEC-200) e implementar GET /health/ready con sonda real de base (200 con chequeo ok).
Contrato: rollback: Revertir la configuración del pool y el handler de /health/ready al estado previo.. Status: pending

#### S4.T4 — Tests: guardas de db:reset:local (host remoto QA-00-06-02, base no permitida, APP_ENV distinto de development, caso válido, límites 127.0.0.1/localhost vs IP no-loopback) y readiness con base arriba (200, db ok) y caída (no 200).
Contrato: rollback: Eliminar el archivo de tests agregado.. Status: pending
