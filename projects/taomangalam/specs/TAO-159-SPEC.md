---
id: TAO-159-SPEC
project: taomangalam
ticket: TAO-159
status: approved
---

# HU-00-07 · Cola pg-boss en schema propio con trabajo de ejemplo idempotente, reintentos, estado observable y entrypoint worker separable

## Resumen ejecutivo

Se integra pg-boss como cola durable en su schema `pgboss` con el rol `taomangalam_queue`: config validada con zod, pool de 5 conexiones y guard de presupuesto de conexiones leido en runtime al arranque. Los consumidores corren dentro del backend y un entrypoint `worker` del mismo artefacto arranca solo consumidores sin HTTP. Se agrega un trabajo de ejemplo idempotente por clave con reintentos de backoff y limite finito, logs con `jobId`/`queue`/`attempt` (fallo definitivo como `error`) y cierre ordenado ante SIGTERM. NO incluye: trabajos reales (correo, purgas, exportaciones), servicio worker separado en Railway, ni Redis/BullMQ. Se sabe que funciona porque: base recien migrada crea el schema `pgboss` por el rol sin tocar el schema de aplicacion, el job de ejemplo se completa/reintenta/falla segun el limite, el worker no abre puerto HTTP y el arranque falla citando el presupuesto cuando se excede el 70%. Tamano: 3 sesiones (T2/T2/T1), encaja en el techo de entrada; sin alcance fuera del pedido.

## Requirements

### REQ-01 `confirmed`
> Fuente: request#alcance + adenda-1

Agregar `PGBOSS_DATABASE_URL` con el rol `taomangalam_queue` al esquema de configuracion existente del server, validada con zod. El schema `pgboss` NO lo crea el arranque: lo provee la infraestructura con el rol de cola como propietario (`infra/postgres/init/001_roles.sql` en local). Al arrancar con `createSchema: false`, el backend verifica que el schema `pgboss` exista y falla con un mensaje accionable si falta; pg-boss instala y migra sus TABLAS dentro del schema existente, dejando el schema de aplicacion sin cambios.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:570

El pool de conexiones de pg-boss queda limitado a 5 conexiones simultaneas.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:747

Guard de arranque: (8 conexiones de Prisma + 5 de pg-boss + 5 de reserva) por replica declarada debe ser menor o igual al 70% de `max_connections`, leido al arrancar; si se excede, el arranque falla con un mensaje que cita el presupuesto.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:113

El backend inicia los consumidores despues de validar la configuracion; el entrypoint `worker` (mismo artefacto, comando distinto) arranca solo consumidores, sin abrir puerto HTTP.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:740

El trabajo de ejemplo sin efecto de negocio en `server/src/jobs/` tiene handler idempotente por clave y reintentos con backoff y limite finito, sin reintentos infinitos.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:750

El procesamiento emite logs estructurados con `jobId`, `queue` y `attempt`; el fallo definitivo se registra con nivel `error`.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:741

Cierre ordenado de pg-boss ante SIGTERM, integrado con el shutdown existente, sin perder trabajos en curso (deja de tomar nuevos y termina los activos).

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:775

El rol `taomangalam_queue` tiene privilegios sobre el schema `pgboss` y no puede leer tablas del schema de aplicacion (recibe `permission denied`).

### REQ-09 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:768

Seccion en `docs/development/local-services.md` sobre como inspeccionar el estado de la cola (tablas `pgboss.*`) con pasos copiables.
## Tasks

#### S1.T1 — Agregar PGBOSS_DATABASE_URL (rol taomangalam_queue) al esquema de configuracion del server con validacion zod y crear el modulo de arranque de pg-boss con createSchema:false (el schema pgboss lo provee la infraestructura, p.ej. infra/postgres/init/001_roles.sql) y pool limitado a 5 conexiones; al arrancar, VERIFICAR que el schema pgboss exista y fallar con un mensaje accionable si falta.
Contrato: rollback: Revertir el modulo de arranque y la entrada de config; el schema `pgboss` se puede dropear manualmente sin afectar el schema de aplicacion.. Status: done

#### S1.T2 — Implementar el guard de arranque que lee `max_connections` en runtime y valida (8 Prisma + 5 pg-boss + 5 reserva) por replica declarada <= 70%, fallando el arranque con un mensaje que cita el presupuesto.
Contrato: rollback: Quitar el guard del flujo de arranque; el resto de la inicializacion queda igual.. Status: done

#### S1.T3 — Verificar el aislamiento del rol: `taomangalam_queue` accede al schema `pgboss` y recibe `permission denied` al leer una tabla del schema de aplicacion; confirmar que el schema de aplicacion no cambia tras la migracion.
Contrato: rollback: N/A: verificacion sin cambios persistentes.. Status: done

#### S1.T4 — Tests de bootstrap: config zod invalida no inicializa pg-boss; migracion idempotente sobre base ya migrada; limites del guard (14/20 pasa, 15/20 falla); el arranque del server existente (health/HTTP) sigue funcionando; y el caso de schema pgboss ausente aborta con MissingPgbossSchemaError citando el remedio.
Contrato: rollback: N/A: solo tests.. Status: done

#### S2.T1 — Crear el trabajo de ejemplo sin efecto de negocio en `server/src/jobs/` con handler idempotente por clave, reintentos con backoff y limite finito de intentos.
Contrato: rollback: Eliminar el archivo del job de ejemplo y su registro en la cola.. Status: done

#### S2.T2 — Registrar los consumidores en el proceso backend tras validar la configuracion y agregar el comando `worker` al mismo artefacto que arranca solo consumidores, sin abrir puerto HTTP.
Contrato: rollback: Revertir el entrypoint `worker` y el registro de consumidores del backend.. Status: done

#### S2.T3 — Emitir logs estructurados del procesamiento con `jobId`, `queue` y `attempt` en cada intento, y nivel `error` en el fallo definitivo.
Contrato: rollback: Revertir los logs agregados (sin cambios de logica de negocio).. Status: done

#### S2.T4 — Tests de procesamiento: job de ejemplo completa con log, falla-2-completa-3 con `attempt` 1/2/3, falla-siempre termina fallido con log `error`, doble encolado con la misma clave produce un solo efecto y el `worker` no abre puerto HTTP.
Contrato: rollback: N/A: solo tests.. Status: done

#### S3.T1 — Implementar el cierre ordenado de pg-boss ante SIGTERM integrado con el shutdown existente del server, dejando de tomar trabajos nuevos y terminando los activos.
Contrato: rollback: Revertir el handler de SIGTERM; el proceso vuelve al cierre previo.. Status: done

#### S3.T2 — Agregar a `docs/development/local-services.md` la seccion de inspeccion del estado de la cola con pasos verificables (consultas a `pgboss.*`, trabajos pendientes/activos/fallidos).
Contrato: rollback: Revertir la seccion agregada al documento.. Status: done

#### S3.T3 — Tests de operacion: ante SIGTERM el trabajo en curso se completa y no se aceptan nuevos, y los comandos documentados para inspeccionar `pgboss` corren contra la DB local tal como estan escritos.
Contrato: rollback: N/A: solo tests.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Arranque contra base local inicializada: el schema `pgboss` (provisto por `001_roles.sql` a nombre de `taomangalam_queue`) existe y pg-boss migra sus tablas dentro de el; si falta el schema, el arranque aborta con un mensaje accionable; el schema de aplicacion queda intacto; el pool de pg-boss queda en 5 y con `max_connections=20` el arranque aborta citando el presupuesto.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: Encolar el trabajo de ejemplo y ver en logs `jobId`/`queue`/`attempt`: se completa; falla dos veces y completa al tercero; falla siempre y queda fallido con log `error`; el entrypoint `worker` procesa trabajos sin abrir puerto HTTP.

### Session 3 · T1 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: SIGTERM deja de tomar trabajos nuevos y completa los en curso antes de salir; `docs/development/local-services.md` documenta con pasos copiables como inspeccionar las tablas `pgboss.*`.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Agregar `PGBOSS_DATABASE_URL` con el rol `taomangalam_queue` al esquema de configuracion existente del server, validada con zod. El schema `

### Enmienda 2

**Task ops:**

- edit S1.T1 { desc="Agregar PGBOSS_DATABASE_URL (rol taomangalam_queue) al esquema de configuracion del server con validacion zod y crear el modulo de arranque de pg-boss con createSchema:false (el schema pgboss lo provee la infraestructura, p.ej. infra/postgres/init/001_roles.sql) y pool limitado a 5 conexiones; al arrancar, VERIFICAR que el schema pgboss exista y fallar con un mensaje accionable si falta." }
- edit S1.T4 { desc="Tests de bootstrap de pg-boss: la configuracion invalida aborta el arranque, el pool queda limitado a 5 conexiones y el caso de schema pgboss ausente aborta con MissingPgbossSchemaError citando el remedio." }

### Enmienda 3

**Task ops:**

- edit S1.T4 { desc="Tests de bootstrap: config zod invalida no inicializa pg-boss; migracion idempotente sobre base ya migrada; limites del guard (14/20 pasa, 15/20 falla); el arranque del server existente (health/HTTP) sigue funcionando; y el caso de schema pgboss ausente aborta con MissingPgbossSchemaError citando el remedio." }
