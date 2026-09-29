---
id: TAO-161-SPEC
project: taomangalam
ticket: TAO-161
status: approved
---

# HU-00-17 · Script operativo de configuración versionada

## Resumen ejecutivo

Se entrega la base de configuración versionada en server/: migración Prisma de configuracion_clave (clave, tipo, alcance, sensibilidad, descripción) y configuracion_version (clave, valor validado, región/plataforma, vigencia, autor, motivo, caso), con historial inmutable para el rol de aplicación; y un script CLI que inserta una nueva versión con autor, motivo y fecha validando el valor contra el tipo de la clave. NO se hace: endpoints de escritura (DEC-222), evento de auditoría (EP-15) ni catálogo de claves concretas/lectura pública. Se observa que funciona cuando correr el script contra una base local agrega una fila nueva sin tocar las previas; las entradas inválidas, la clave inexistente o la falta de autor/--motivo salen con código ≠ 0 sin insertar; en producción se exige flag explícito; y una clave sensible nunca expone su valor en salida ni logs. Tamaño: 2 puntos, 2 sesiones (esquema+roles, script+validaciones). ADVERTENCIA: el request no fija los valores concretos del enum `tipo` ni el catálogo de claves sensibles (fuera de alcance por diseño); el script implementa el validador genérico y el catálogo queda para las épicas consumidoras.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md:612

La migración Prisma crea configuracion_clave (clave, tipo, alcance, sensibilidad, descripción) y configuracion_version (clave, valor validado, región o plataforma opcional, vigencia, autor, motivo y caso opcional) según tecnologia/20 §9, y deja configuracion_version inmutable para el rol de aplicación: taomangalam_app conserva SELECT e INSERT pero recibe permission denied en UPDATE y DELETE.

### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1700

El script recibe clave, valor, autor, --motivo (obligatorio), --caso opcional, región o plataforma opcional y vigencia, y escribe una NUEVA fila en configuracion_version con autor, motivo y fecha, sin modificar ni borrar las versiones previas (historial inmutable).

### REQ-03 `confirmed`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1735

El script rechaza entradas inválidas sin insertar filas y termina con código distinto de 0: valor que no cumple el tipo de la clave, clave inexistente (nombrándola) y falta de autor o de --motivo.

### REQ-04 `confirmed`
> Fuente: docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:195

La ejecución contra producción está protegida por flag explícito: con `--env production` sin el flag de confirmación el script se niega (código ≠ 0) sin tocar la base.

### REQ-05 `confirmed`
> Fuente: docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1744

Cuando la clave es sensible, la salida y los logs no muestran el valor (se redacta); para claves no sensibles la salida puede mostrarlo.

### REQ-06 `confirmed` `enforcement`
> Fuente: server/src/models/prisma.ts:17

El script reutiliza la infraestructura existente del server —guardas de CLI (src/db/local-guard.ts), cliente Prisma acotado (createPrismaClient en src/models/prisma.ts) y logger con redactor central (src/logger.ts)— en vez de reimplementar conexión, guardas o logging, y sus mensajes de error nombran el parámetro o la clave sin exponer el valor (patrón de src/config.ts).
## Tasks

#### S1.T1 — Crear la migración Prisma de configuracion_clave y configuracion_version (schema.prisma + migration.sql) según tecnologia/20 §9, con las columnas de ambas tablas y la política de inmutabilidad: REVOKE UPDATE, DELETE ON configuracion_version FROM taomangalam_app conservando SELECT e INSERT, siguiendo el patrón de privilegios explícitos e idempotentes de la migración init.
Contrato: rollback: Revertir la migración (prisma migrate resolve --rolled-back o eliminar la carpeta de migración y las tablas en local); no hay datos previos porque las tablas son nuevas.. Status: done

#### S1.T2 — Test de integración de migración y permisos por rol (patrón de src/migrations.integration.test.ts) sobre base efímera: migrate deploy crea ambas tablas, taomangalam_app inserta y lee configuracion_version y recibe permission denied en UPDATE y DELETE; una segunda corrida informa no pending migrations.
Contrato: rollback: Eliminar el archivo de test; usa una base probe efímera y no toca datos reales.. Status: done

#### S2.T1 — Implementar la entrada del script CLI en server/: parseo de argumentos (clave, valor, autor, --motivo obligatorio, --caso, región/plataforma, vigencia) con zod, guarda de producción (--env production exige flag explícito, reutilizando el patrón de src/db/local-guard.ts) y redacción del valor cuando la clave es sensible, con mensajes que nombran el parámetro o la clave sin exponer el valor.
Contrato: rollback: Revertir los archivos nuevos del script; no toca la base.. Status: done

#### S2.T2 — Implementar la lógica de dominio del script: resolver la clave en configuracion_clave, validar el valor según su tipo y, en una transacción, INSERTAR una nueva fila en configuracion_version (autor, motivo, fecha, y caso/región/vigencia opcionales) usando createPrismaClient (src/models/prisma.ts); nunca UPDATE ni DELETE sobre el historial. Clave inexistente o valor inválido devuelve error sin insertar.
Contrato: rollback: Revertir el módulo de dominio; las versiones ya insertadas se conservan (historial inmutable).. Status: done

#### S2.T3 — Tests unitarios (validación de tipo por clave, parámetros obligatorios, guarda de producción, redacción de sensibles) e integración contra PostgreSQL efímero con los roles reales: la inserción feliz conserva la versión previa, y clave inexistente, valor inválido o falta de motivo salen con código ≠ 0 sin insertar; incluir la regresión de que un UPDATE/DELETE de la app sobre el historial falla por permisos.
Contrato: rollback: Eliminar los archivos de test; no toca datos reales.. Status: done

#### S3.T1 — Consolidar y verificar sobre la rama las correcciones del gate integral del script de configuración. Archivos esperados: server/src/configuracion/{cli,args,guardas,tipos}.ts, server/src/configuracion/*.test.ts y server/prisma/migrations/20260929013806_configuracion_operativa/migration.sql. Validación: pnpm test con la suite completa en verde más typecheck, lint y depcruise. Gate de la sesión (auto): la suite del server queda entera en verde y la guarda de producción valida el destino real de DATABASE_URL.
Contrato: rollback: Revertir los commits de la rama del ticket.. Status: done

#### S4.T1 — Atender los hallazgos de la segunda ronda del gate integral del script de configuración: (a) hacer --env obligatorio (sin valor por defecto) en server/src/configuracion/args.ts, de modo que ninguna corrida declare entorno local por omisión y la ausencia del flag se rechace con código ≠ 0 nombrando el parámetro; (b) ajustar la guarda de producción en server/src/configuracion/guardas.ts para que exija --confirmar-produccion únicamente cuando --env production, dejando que local y staging procedan sin el flag (TC-REQ-04-3); (c) propagar ambos cambios en server/src/configuracion/cli.ts y registrar la decisión TAO-161-DEC-REDACTOR-CLI que documenta la reutilización del redactor central de src/logger.ts en vez de reimplementar redacción en el CLI. Archivos esperados: server/src/configuracion/{args,guardas,cli}.ts y sus tests. Validación: pnpm test (suite completa verde) + pnpm run static.
Contrato: rollback: Revertir el commit d904d47 (git revert d904d47), lo que restaura el default de --env y la guarda de producción previos; no requiere tocar la base de datos ni la migración.. Status: done

#### S5.T1 — Aplicar los hallazgos de kn-dredd del PR del script de configuración. Archivos: server/prisma/migrations/20260929013806_configuracion_operativa/migration.sql, server/src/configuracion.integration.test.ts, server/src/configuracion/cli.ts, docs/development/commands.md, docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md. Trabajo: (a) dejar configuracion_clave solo-lectura para el rol de aplicación (REVOKE INSERT/UPDATE/DELETE + GRANT SELECT a taomangalam_app) y cubrirlo con un test de permisos que verifique permission denied en INSERT/UPDATE/DELETE; (b) documentar el comando config:set en el runbook (docs/development/commands.md) y en tecnologia/21 §5, incluyendo el flag explícito para producción; (c) loguear la causa de los errores inesperados del script sin exponer el valor cuando la clave es sensible. Validación: pnpm -C server test y pnpm -C server run static verdes, más los tests de docs del repo.
Contrato: rollback: Revertir el commit 2e35180 (restaura migration.sql, cli.ts, el test de integración y los docs al estado previo).. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: Migración aplicada sobre una base efímera: existen configuracion_clave y configuracion_version y el test de roles muestra permission denied en UPDATE/DELETE de configuracion_version para taomangalam_app.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Ejecutar el script contra el PostgreSQL local inserta una nueva configuracion_version (autor/motivo/fecha) dejando las previas intactas; las entradas inválidas, la clave inexistente y la falta de motivo/entorno de producción salen con código ≠ 0 sin insertar ni exponer valores sensibles.

### Session 3 · continue

**Tasks:**
- [x] S3.T1

### Session 4 · continue

**Tasks:**
- [x] S4.T1

### Session 5 · continue

**Tasks:**
- [x] S5.T1
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S3: Consolidar y verificar sobre la rama las correcciones del gate integral del script de configuración. Archivos esperados: server/src/configuracion/{cli,args,guardas,tipos}.ts, server/src/configuracion/*.test.ts y server/prisma/migrations/20260929013806_configuracion_operativa/migration.sql. Validación: pnpm test con la suite completa en verde más typecheck, lint y depcruise. Gate de la sesión (auto): la suite del server queda entera en verde y la guarda de producción valida el destino real de DATABASE_URL. (valida: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06; rollback: Revertir los commits de la rama del ticket.)

### Enmienda 2

**Tasks agregadas:**

- S4: Atender los hallazgos de la segunda ronda del gate integral del script de configuración: (a) hacer --env obligatorio (sin valor por defecto) en server/src/configuracion/args.ts, de modo que ninguna corrida declare entorno local por omisión y la ausencia del flag se rechace con código ≠ 0 nombrando el parámetro; (b) ajustar la guarda de producción en server/src/configuracion/guardas.ts para que exija --confirmar-produccion únicamente cuando --env production, dejando que local y staging procedan sin el flag (TC-REQ-04-3); (c) propagar ambos cambios en server/src/configuracion/cli.ts y registrar la decisión TAO-161-DEC-REDACTOR-CLI que documenta la reutilización del redactor central de src/logger.ts en vez de reimplementar redacción en el CLI. Archivos esperados: server/src/configuracion/{args,guardas,cli}.ts y sus tests. Validación: pnpm test (suite completa verde) + pnpm run static. (valida: REQ-04, REQ-03, REQ-06; rollback: Revertir el commit d904d47 (git revert d904d47), lo que restaura el default de --env y la guarda de producción previos; no requiere tocar la base de datos ni la migración.)

### Enmienda 3

**Tasks agregadas:**

- S5: Aplicar los hallazgos de kn-dredd del PR del script de configuración. Archivos: server/prisma/migrations/20260929013806_configuracion_operativa/migration.sql, server/src/configuracion.integration.test.ts, server/src/configuracion/cli.ts, docs/development/commands.md, docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md. Trabajo: (a) dejar configuracion_clave solo-lectura para el rol de aplicación (REVOKE INSERT/UPDATE/DELETE + GRANT SELECT a taomangalam_app) y cubrirlo con un test de permisos que verifique permission denied en INSERT/UPDATE/DELETE; (b) documentar el comando config:set en el runbook (docs/development/commands.md) y en tecnologia/21 §5, incluyendo el flag explícito para producción; (c) loguear la causa de los errores inesperados del script sin exponer el valor cuando la clave es sensible. Validación: pnpm -C server test y pnpm -C server run static verdes, más los tests de docs del repo. (valida: REQ-01, REQ-05, REQ-06; rollback: Revertir el commit 2e35180 (restaura migration.sql, cli.ts, el test de integración y los docs al estado previo).)
