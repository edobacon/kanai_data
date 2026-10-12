---
id: TV2-065-SPEC
project: tao-v2
ticket: TV2-065
status: approved
---

# TV2-065 B0-01b: suite de integración de server/ estable en verde con Node 24 (limpieza de bases efímeras, 405 de verificacion-correo y aislamiento de pgboss frente a la base del stack legacy)

## Resumen ejecutivo

Se corrigen las tres causas de inestabilidad que TV2-003 dejó en el baseline de Vitest en server/ (648 pruebas, 645 pasan, 2 omitidas). Primero, la carrera del afterAll de app-release.integration y configuracion.integration: el DROP DATABASE ... WITH (FORCE) intenta terminar conexiones de otros roles y falla con 'permission denied to terminate process'. Segundo, el 405 intermitente de verificacion-correo dentro de la suite completa. Tercero, el job sobrante de pgboss.integration por estado compartido con taomangalam-postgres (54329). También se quitan de la config de calidad los flakes que queden resueltos. Fuera de alcance: parametrizar compose.yaml y los scripts backend:* (TV2-004), el modelo de datos (TV2-005) y las fallas de unittest y node --test. El aislamiento se resuelve dentro de las pruebas (base efímera propia), sin tocar compose.yaml. Se verifica con 3 corridas consecutivas de `pnpm -C server exec vitest run` con Node 24 (0 fallas, 648 ejecutadas, ninguna omitida ni marcada flaky) y `pnpm run check` con exit 0. Cada corrida queda registrada con SHA, comando, totales y salida, comparada contra el baseline de docs/product/v3/matriz-evidencia-v1.md. ADVERTENCIA: si la única corrección viable de la limpieza fuera otorgar pg_signal_backend o superuser al rol de migración, eso es un cambio de roles (seed_rbac) que cambia el entorno local. No está en este plan y requiere aprobación humana antes de aplicarse. ADVERTENCIA: hoy hay 2 pruebas omitidas en el baseline. Para llegar a 648 ejecutadas hay que entender por qué se omiten (por ejemplo, falta de PostgreSQL) sin forzarlas con dobles.
Datos a confirmar antes de ejecutar: (1) ruta exacta del test de verificacion-correo y del de pgboss.integration en server/src (no figuran en el contexto; confirmar con un glob en server/src). (2) dónde vive la lista de flakes conocidos de la config de calidad: scripts/dev/quality-ci.mjs:13, server/vitest.integration.ci.ts (citado en scripts/ci/ep01-release-provider.mjs:33) o server/vitest.config.ts. (3) si el rol de MIGRATION_DATABASE_URL es superuser o no (define si basta con cerrar las conexiones propias antes del DROP). (4) cuáles son las 2 pruebas omitidas del baseline y su condición de omisión (sección Pendientes de docs/product/v3/matriz-evidencia-v1.md).

## Requirements

### REQ-01 `confirmed`
> Fuente: tao-v2/server/src/app-release.integration.test.ts:56-66 (DROP DATABASE IF EXISTS ... WITH (FORCE) en :62); tao-v2/server/src/configuracion.integration.test.ts:5

La limpieza de las bases efímeras (afterAll de app-release.integration y configuracion.integration) termina sin 'permission denied to terminate process' en la suite completa. Cómo: antes del DROP se cierran todas las conexiones que abrió la propia prueba (runtime Prisma, clientes por rol, pg-boss), y el borrado no depende de terminar procesos de otros roles. Solo se reintenta si el timeout del hook lo cubre.

### REQ-02 `confirmed`
> Fuente: Adenda 1 del request, criterio (3)

El 405 intermitente de verificacion-correo (pasa aislado, falla dentro de la suite completa) no se pudo reproducir: queda registrado como no reproducido, con la evidencia de las corridas, y su flake conocido se mantiene en la config de calidad del proyecto. No se exige corregir una causa no identificada ni se omite la prueba.

### REQ-03 `inferred`
> Fuente: Request TV2-065 Alcance item 3; patrón de base efímera existente en tao-v2/server/src/app-release.integration.test.ts:12,38-54

pgboss.integration ('migración idempotente') corre contra una base de pruebas propia de tao-v2, aislada del estado de la base del stack legacy (taomangalam-postgres, puerto 54329). Antes de aislarla se confirma que esa es la causa del job sobrante, y el aislamiento no toca compose.yaml.

### REQ-04 `confirmed`
> Fuente: Adenda 1 del request, criterios (1), (2) y (4)

La config de calidad del proyecto deja de listar como flakes conocidos solo app-release.integration, configuracion.integration y pgboss.integration (resueltos por REQ-01 y REQ-03, con estabilidad verificada en las 3 corridas); verificacion-correo se mantiene. La suite completa de server/ corre 3 veces consecutivas con Node 24 con 0 fallas, registrando el total ejecutado y los omitidos tal como se miden (hoy 652 ejecutados y 2 omitidos de email-docs, que exige DOCS_DIFF_BASE), sin exigir 648 ni 0 omitidos. `pnpm run check` no empeora frente al baseline y sus rojos preexistentes (9 tests Flutter que requieren el runner de provider) quedan documentados como preexistentes, no de este ticket. El runner ep01-release-provider encuentra src/app-release.integration.test.ts. Las corridas quedan registradas con SHA, comandos, totales y salida. El job residual de pgboss en la base compartida y las bases probe huerfanas quedan fuera de alcance y se reportan.

### REQ-05 `confirmed` `enforcement`
> Fuente: tao-v2/server/src/app-release.integration.test.ts:12-36

Las bases efímeras nuevas o ajustadas reutilizan el patrón existente (nombre con randomBytes, roleUrl restringido a host local, CREATE en beforeAll y DROP en afterAll) y no se crea un mecanismo paralelo. No se escriben contraseñas ni tokens nuevos en documentos ni reportes.
## Tasks

#### S1.T1 — Corregir la carrera de limpieza de bases efímeras. Antes del DROP, el afterAll cierra todas las conexiones propias: closeRuntimePrisma, clientes por rol y pg-boss si aplica. Después borra la base sin depender de terminar procesos de otros roles: sin WITH (FORCE), o con FORCE solo cuando ya no quedan sesiones ajenas. Solo se reintenta si el timeout del hook lo cubre. No se cambian permisos de roles; si resultara imprescindible, se detiene y se reporta.
Contrato: rollback: git checkout -- server/src/app-release.integration.test.ts server/src/configuracion.integration.test.ts. Status: done

#### S1.T1.1 — app-release.integration.test.ts: ajustar el afterAll (líneas 56-66) para que cierre las conexiones propias antes del DROP de la línea 62 y no termine procesos ajenos
Contrato: rollback: git checkout -- server/src/app-release.integration.test.ts. Status: done

#### S1.T1.2 — configuracion.integration.test.ts: aplicar la misma corrección al afterAll importado en la línea 5
Contrato: rollback: git checkout -- server/src/configuracion.integration.test.ts. Status: done

#### S1.T2 — Diagnosticar el 405 intermitente de verificacion-correo. Pasos: correrlo aislado y junto a los archivos que mutan estado global (process.env.DATABASE_URL, runtime Prisma, app). Registrar la causa encontrada y corregirla en el test o en el aislamiento de archivos de server/vitest.config.ts, sin omitir ni relajar aserciones.
Contrato: rollback: git checkout -- server/src server/vitest.config.ts. Status: done

#### S1.T3 — pgboss.integration: confirmar que el job sobrante viene del estado compartido con taomangalam-postgres (54329), consultando la tabla de jobs antes de correr. Después aislar la prueba en una base efímera propia de tao-v2 con el patrón de app-release.integration.test.ts:12-54 (nombre aleatorio, roleUrl local, CREATE y migrate en beforeAll, DROP en afterAll sin la carrera de REQ-01). No se toca compose.yaml.
Contrato: rollback: git checkout -- server/src. Status: done

#### S1.T4 — Quitar de la config de calidad los flakes conocidos ya resueltos (app-release.integration, configuracion.integration, verificacion-correo, pgboss.integration). La config está en scripts/dev/quality-ci.mjs, server/vitest.integration.ci.ts o server/vitest.config.ts, según lo que se confirme. Solo se quitan los que pasan en verde estable.
Contrato: rollback: git checkout -- scripts/dev/quality-ci.mjs server/vitest.config.ts server/vitest.integration.ci.ts. Status: done

#### S1.T5 — Regresión y evidencia. Con Node 24 por .nvmrc (PATH antepuesto), correr `pnpm -C server exec vitest run` tres veces consecutivas y `pnpm run check`. Registrar en la sección Fallas de entorno preexistentes y Pendientes de docs/product/v3/matriz-evidencia-v1.md el SHA, los comandos, los totales ejecutados/pasados/fallidos/omitidos y la salida de cada corrida, comparados contra el baseline 645/648 con 2 omitidas. Una corrida que no se pudo hacer queda pendiente, no aprobada.
Contrato: rollback: git checkout -- docs/product/v3/matriz-evidencia-v1.md. Status: done
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Criterio acotado a lo medido (adenda 1 del request): la suite completa de server/ corre 3 veces consecutivas con 0 fallas y el total ejecutado y los omitidos se registran tal como se miden (hoy 652 y 2 omitidos de email-docs); pnpm run check no empeora frente al baseline y sus 9 rojos Flutter preexistentes quedan documentados; el 405 de verificacion-correo se registra como no reproducido y su flake conocido se mantiene; solo se quitan de knownFlakes app-release.integration, configuracion.integration y pgboss.integration. No se exige 648 ni 0 omitidos ni check en 0.

### Session 2 · T0 · open
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `confirmed`: El 405 intermitente de verificacion-correo (pasa aislado, falla dentro de la suite completa) no se pudo reproducir: queda registrado como no
- REQ-04 (edit) `confirmed`: La config de calidad del proyecto deja de listar como flakes conocidos solo app-release.integration, configuracion.integration y pgboss.inte

