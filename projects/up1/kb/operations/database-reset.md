---
id: SPEC-operations-005
project: up1
type: spec
module: operations
category: operations
tags: [up1, reset, database, tenant, setup, prisma, migrate, db-push, drift, seed, multi-tenant]
fecha: 2026-07-16
sources:
  - object-manager/scripts/setup-reset.js (reset full / canonico)
  - object-manager/scripts/setup-all-tenants.js (setup:dev / rebuild-all, flags --skip-presync, cap de pool por tenant)
  - object-manager/scripts/tenant-create.js (pipeline 12 fases por tenant, flags --from-sync/--skip-sync-db/--skip-register)
  - object-manager/scripts/tenant-reset.js (migrate reset por tenant)
  - object-manager/src/services/codegen/generatePrismaSchema.js (modos --schema-only/--db-only/--skip-capabilities/--skip-shared)
  - object-manager/scripts/sync/SyncManager.js, scripts/sync/dbSync.js (aislamiento por tenant, PARTIAL FAILURE, --strict)
  - object-manager/src/services/tenantMaintenanceGate.js (gate 503 por tenant en runtime)
  - object-manager/docs/reference/multi-tenant-architecture.md (UPONE-1365, tabla de knobs y exit semantics)
  - object-manager/docs/migrations.md (rollback playbook — capa produccion)
  - object-manager/.gitignore (prisma/*/migrations gitignored)
  - validacion empirica 2026-06-04 (reset full de los 15 tenants + caso drift)
  - commits 57f0fdb5, adbb9104, 22de2180/b7347c6c (UPONE-1365, revision 2026-07-16)
---
# Reset de base de datos — uP1

Tipos de reset disponibles para uP1, con alcance, que cambia, prerequisitos, pasos y cuando usar cada uno. El objetivo: ante cierto tipo de cambio, saber **que reset aplicar** sin re-investigar.

> **Contexto de arquitectura (leer primero).** uP1 es schema-driven: la **fuente de verdad** son los JSON de objetos (`object-manager/objects/`) → `codegen` genera `prisma/{TENANT}/schema.prisma` → ese schema se aplica a la DB. Las **migraciones (`prisma/{TENANT}/migrations/`) estan gitignored** (`.gitignore:43`): son artefacto **local** de cada maquina, NO la verdad ni un artefacto compartido. Por eso la primitiva de aplicacion de schema en dev es `db push` o `migrate dev` regenerado, no un historial de migraciones versionado. Esto define por que ciertos resets funcionan y otros driftan (ver §7).

> **🛑 Regla de seguridad — no negociable (aplica al asistente/LLM y a cualquier ejecutor).** Toda operacion que implique **perdida de datos** —resets duros (§1), o cualquier paso con `migrate reset`, `--accept-data-loss`, drop/recreate de DB— se rige por un **protocolo de dos momentos** que **no se puede saltar, adelantar ni evitar**:
>
> **Momento 1 — al seleccionar/proponer el reset.** Antes de empezar, **alertar explicitamente al usuario** que la opcion elegida **produce perdida de datos**: que borra, alcance (que tenants, data de usuario incluida) e irreversibilidad. En el mismo aviso, **anticipar que se le pedira una confirmacion en el momento exacto en que se vaya a ejecutar el paso destructivo**.
>
> **Momento 2 — al llegar al paso destructivo.** Al ejecutar la operacion que borra, **detenerse y pedir confirmacion explicita al usuario**, y **esperar su respuesta**. Sin "sí" expreso, no se ejecuta. El consentimiento es **por operacion**: una aprobacion previa (de otro reset, de otra sesion, o un "dale con todo" generico) **no se hereda** a esta ejecucion.
>
> **Prohibiciones para el LLM — esta regla pesa sobre toda la informacion de este doc:**
>
> 1. **No usar este doc como menu para esquivar la pregunta.** El guard AI de Prisma (§2), `--accept-data-loss`, `reset-pushdb` (§5.F), el consentimiento literal, o cualquier flag/workaround documentado **NO son medios para evitar o adelantar la confirmacion**. Estan aqui para casos legitimos, no para destrabar sin preguntar. El guard existe para **forzar la decision humana** — esa es su funcion, no un obstaculo.
> 2. **No inventar tecnicas no convencionales para evitar al usuario.** Prohibido improvisar caminos fuera de este doc para no tener que preguntar: ir directo a la DB con SQL, dropear/editar/borrar registros a mano, scripts ad-hoc, o cualquier atajo. La unica salida valida es un **reset canonico** (§1) o el fix/workaround **ya documentado**.
> 3. **Si todo esta bloqueado, escalar — no resolver por fuera.** Cuando ningun reset canonico aplica o todos fallan, la accion correcta es **volver al usuario y explicar**, nunca buscar una via alternativa que evite la confirmacion.

---

## 1. Nomenclatura y tabla de referencia

**Como pedir un reset.** Usa el **nombre** de la tabla (ej. *"hace `reset-full`"*, *"`reset-tenant UPU`"*, *"`reset-mods`"*). Cada nombre mapea a un alcance y comando exactos; con eso ejecuto el correcto sin ambiguedad. `<T>` = id de tenant (DEMO01..DEMO10, TEST, UCASMT, UCENG, UCPLN, UPU; **15 locales**).

### Resets duros (dropean/recrean DB — borran data, incluida la de usuario)

| Nombre | Ref | Alcance | Que borra | Comando | Headless |
|--------|-----|---------|-----------|---------|----------|
| **`reset-full`** (canonico) | §5.A | TODOS los tenants, desde 0 | toda la data de las 15 DBs | `npm run setup:reset` | ⚠️ requiere baseline sin drift (§7) |
| **`rebuild-all`** | §5.B | TODOS los tenants | nada (idempotente, no wipea) | `npm run setup:dev` | ⚠️ sync global puede driftar |
| **`reset-tenant <T>`** | §5.C | 1 tenant, desde 0 | toda la data de ese tenant | `npm run tenant:create -- <T> --recreate --force` | ⚠️ como reset-full (§7) |
| **`rebuild-tenant <T>`** | §5.D | 1 tenant | nada (no wipea) | `npm run tenant:create -- <T> --resume --force` | sí |
| **`wipe-tenant <T>`** | §5.E | 1 tenant, solo schema/DB | data del tenant (sin repoblar) | `npm run tenant:reset -- --tenant <T> --force` | ⚠️ guard AI Prisma |
| **`reset-pushdb <T>`** | §5.F | 1+ tenants (workaround drift) | aplica schema via db push | manual (§5.F) | sí |

### Resets blandos / parciales (NO dropean DB — no tocan data de usuario)

| Nombre | Ref | Alcance | Que re-escribe | Comando |
|--------|-----|---------|----------------|---------|
| **`reset-mods [<T>]`** | §6 | datos declarados por mods/proyectos | capabilities + apps + layouts + seeds (upsert) | `npm run sync` (todo) o `npm run sync:db` (solo DB) |
| **`reset-seed <T>`** | §6 | seed propio del tenant | `prisma/{T}/seed.js` | `npm run seed <T>` |
| **`reset-rbac <T>`** | §6 | capabilities RBAC del tenant | `core_Capability` | `npm run capabilities:generate <T>` |
| **`reset-schema <T>`** | §6 | schema + metadata de objetos | `schema.prisma` + registry (sin borrar data) | `npm run codegen -- <T>` |

> **Duro vs blando.** Duro = dropea/recrea (pierde TODO, incl. data de usuario). Blando = **upsert** de lo que declaran los mods/proyectos, sin tocar el resto. *"Reset de datos de un mod"* = **`reset-mods`** (incluye sus seeds); si solo quieres el seed propio del tenant, es **`reset-seed`**.

---

## 2. Prerequisitos comunes

| Requisito | Verificar |
|-----------|-----------|
| PostgreSQL :5432 arriba | `nc -z localhost 5432` |
| Redis :6379 arriba | `redis-cli ping` → `PONG` |
| Node 22 | `node -v` (default de la maquina ya es 22) |
| `.env` con `DATABASE_URL_<TENANT>` por tenant | `grep DATABASE_URL_ object-manager/.env` |

**Agentes / headless / CI — guard de Prisma.** Prisma 6.19 detecta ejecucion por agente IA (Claude Code) y **bloquea** acciones destructivas (`migrate reset`, a veces `db push --accept-data-loss`). Para destrabar, pasar el consentimiento **literal** del dev:

```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<texto exacto del mensaje de consentimiento>" npm run setup:reset -- --skip-confirmation
```

Un dev en terminal interactiva **no** necesita esto (el guard no se dispara).

---

## 3. Pipeline de un tenant (12 fases) — referencia

Los resets `reset-full` y `reset-tenant` corren este pipeline (`tenant-create.js`). Entender las fases explica que saltea cada modo:

| Fase | Que hace | Salta en `--resume`? |
|------|----------|----------------------|
| 1 | Escribe `DATABASE_URL_<T>` en `.env` | no |
| 2 | Crea estructura de directorios | no |
| 3 | Crea la DB PostgreSQL si no existe | no |
| **4** | **Reset DB** (`tenant:reset` → `migrate reset`) | **sí (resume no wipea)** |
| 5 | Codegen del schema desde objetos (`codegen -- <T> --schema-only`, `tenant-create.js:446`) | no (salvo `--from-sync` con schema ya escrito, ver mas abajo) |
| **6** | **Migracion inicial** (`tenant:migrate init` → `migrate dev`) | **sí (si ya hay client generado)** |
| 7 | Genera Prisma client | no |
| 8 | Puebla metadata de objetos en DB (`codegen -- <T> --db-only --skip-shared`, `tenant-create.js:449`) | no |
| 9 | Genera capabilities RBAC | no |
| 10 | Bootstrap RBAC (rol Admin, contexts, apps de mods) | no |
| 11 | Registra tenant en archivos de infraestructura (saltable con `--skip-register`; auto-skip en ECS) | no |
| 12 | Seed (`prisma/{T}/seed.js` si existe) + `sync:db` (saltable con `--skip-sync-db`) | no |

`--recreate` corre las 12. `--resume` salta 4 y 6 → **no destructivo**, repuebla todo lo demas sobre el schema ya presente.

### 3.1 Modos granulares de codegen (fases 5 y 8)

Desde el commit `57f0fdb5`, `codegen` (`generatePrismaSchema.js`) admite modos aditivos que recortan el trabajo por fase en vez de correr siempre el codegen completo (default sin flags = comportamiento previo, sin cambios):

| Flag | Que hace | Que NO hace | Donde se usa |
|------|----------|-------------|---------------|
| `--schema-only` | Escribe `prisma/<T>/schema.prisma` | No corre el sync de metadata a DB, ni GraphQL TypeDefs, ni capabilities | Fase 5 (`tenant-create.js:446`) |
| `--db-only` | Corre el sync de metadata de objetos a DB (`core_ObjectDefinition`, `core_FieldDefinition`, etc.) | No escribe `schema.prisma`, ni GraphQL TypeDefs, ni capabilities | Fase 8, junto con `--skip-shared` (`tenant-create.js:449`) |
| `--skip-capabilities` | No dispara `generateCapabilities.js` desde dentro de codegen (implicito en los dos de arriba) | (no aplica) | Fase 5/8 (implicito); `tenant:create` ya genera capabilities en su propia fase 9 |
| `--skip-shared` | No regenera `dynamic.js` (GraphQL TypeDefs global, identico en cada tenant) | (no aplica) | Pasadas por-tenant; la pasada BASEMODEL/compartida sigue generandolo una sola vez |

**Caveat documentado en codigo** (`generatePrismaSchema.js:1288-1294`): la particion no es 100% limpia. `syncRtFieldsToRegistry` (bloque DB) puede inyectar un campo `recordType` en un objeto Base la primera vez que se agrega un RecordType, y el bloque de escritura de schema persiste filas `core_CustomFieldDefinition` para campos Extended `type:'JSON'` + `jsonSchema`. Ninguno de los dos casos esta activo hoy en los objetos existentes, pero si un cambio dispara alguno de ellos, correr codegen completo (sin `--schema-only`/`--db-only`) en vez de los modos granulares.

`--schema-only`/`--db-only` son **tenant-only**: invocarlos contra `BASEMODEL` o sin tenant falla explicitamente (`generatePrismaSchema.js:3877`), porque la pasada BASEMODEL es la unica que construye el `dynamic.js` compartido.

### 3.2 Flags de omision para orquestacion bulk (setup-task)

Encadenan los pasos de arriba para evitar redundancia cuando `tenant:create` corre 15 veces seguidas (`rebuild-all` / ECS setup task). Uso normal de un dev (`reset-tenant`, `rebuild-tenant` sueltos) no las necesita:

| Flag | Script | Que fase saltea | Cuando usarla |
|------|--------|-------------------|----------------|
| `--from-sync` | `tenant-create.js` | Fase 5 (codegen del schema), **solo si** `prisma/<T>/schema.prisma` ya existe (`tenant-create.js:853-859`) | El orquestador ya corrio un `npm run sync` que escribio el schema; un tenant recien creado sin schema previo igual corre la fase 5 (guard por existencia de archivo, no ciego) |
| `--skip-sync-db` | `tenant-create.js` | Fase 12: el `npm run sync:db` que normalmente corre al final de cada tenant (`tenant-create.js:761-767`) | Setup bulk: el llamador corre **un solo** `sync:db` para los 15 tenants despues del loop, en vez de 15 veces |
| `--skip-register` | `tenant-create.js` | Fase 11: edicion de Dockerfiles, docker-compose y `suite/config/tenants.ts` (`tenant-create.js:563-573`) | Bulk/ECS: la imagen ya esta construida, editar infra en runtime no aplica. Se auto-activa ademas si `AWS_EXECUTION_ENV=AWS_ECS_FARGATE` |
| `--skip-shared` | `codegen` (via `npm run codegen`) | Regeneracion de `dynamic.js` (ver 3.1) | Pasadas de codegen por-tenant dentro de un loop bulk, despues de que la pasada BASEMODEL ya lo genero una vez |
| `--skip-presync` | `setup-all-tenants.js` (`rebuild-all` / `npm run setup:dev`) | El BASEMODEL codegen + `prisma generate` + `npm run sync` completo previos al loop de tenants, y el `sync:db` final posterior al loop (`setup-all-tenants.js:58-62`) | Solo cuando el llamador (ECS setup task) ya corrio ese sync antes de invocar `setup-all-tenants.js`. Un `rebuild-all` standalone (`npm run setup:dev` sin flags) corre ambos, como siempre |

---

## 4. Que reset para que cambio — guia de decision

| Cambio que hiciste | Reset a pedir |
|--------------------|---------------|
| Edite un mod (`mods/<mod>/`) — seeds/layouts/capabilities/apps | **`reset-mods`** (upsert, no dropea). §6 |
| Un registro seedeado / layout de mod quedo sucio en DB | **`reset-mods`** (`sync:db` restaura al estado del mod). §6 |
| Solo quiero re-correr el seed propio del tenant | **`reset-seed <T>`**. §6 |
| Agregue/edite un **field no estructural** en un objeto JSON | **`reset-schema <T>`** + reiniciar OM (o `rebuild-tenant <T>`) |
| Agregue **constraint / relacion / versioning** (cambio estructural) | 1 tenant: **`reset-tenant <T>`**. Todos: **`reset-full`**. Requiere baseline sin drift (§7) |
| Un tenant quedo en estado inconsistente | **`reset-tenant <T>`** |
| Quiero estado limpio de 0, todos los tenants | **`reset-full`** |
| Quiero repoblar metadata/RBAC/seed sin perder datos | **`rebuild-tenant <T>`** (1) o **`rebuild-all`** (todos) |
| Solo necesito vaciar la DB de un tenant | **`wipe-tenant <T>`** |
| `reset-full`/`reset-tenant` falla en `migrate dev` (drift) y necesito levantar ya | **`reset-pushdb <T>`** (workaround) + aplicar fix §7 |

> **Nota (UPONE-1365, ver §7 "Aislamiento por tenant").** En un reset batch (`reset-full`, `rebuild-all`) un tenant que falla (migracion, capabilities, seeds, relationship paths) ya **no** aborta ni ensucia a los demas: el fallo queda aislado, la conexion de ese tenant se libera de inmediato y el resto de los 14 tenants restantes sigue su curso. Esto no cambia que reset pedir para cada situacion, solo que un fallo puntual de 1 tenant ya no bloquea ni contamina la corrida completa.

---

## 5. Detalle por tipo

### A. `reset-full` (canonico) — `npm run setup:reset`

- **Alcance**: dropea y recrea **los 15 tenants** desde DB vacia.
- **Que cambia**: borra TODA la data de todas las DBs de tenant y las reconstruye (schema + metadata + RBAC + seed).
- **Pasos** (`setup-reset.js`):
  1. `sync:files` — mirror + merge de mods → `objects/business/Base/` (para que codegen vea los objetos de mods).
  2. `codegen BASEMODEL` + `prisma generate` (schema base compartido).
  3. Por cada tenant: `tenant:create -- <T> --recreate --force` (12 fases, §3).
  4. `sync.js` completo — layouts, capabilities, seeds, drift check.
- **Salida**: summary con éxito/fallo por tenant; exit 1 si alguno falla.
- **Prereq especial**: baseline migrations **sin drift** (si no, muere en fase 6 — ver §7).
- **Flags**: `-- --skip-confirmation` para no-interactivo.

> Es el "reset canonico" referenciado en los tickets de SP4 (033, 039, 048): estado limpio desde cero para validar flujos de punta a punta.

### B. `rebuild-all` (bring-up no destructivo) — `npm run setup:dev`

- **Alcance**: todos los tenants, **idempotente**, NO wipea.
- **Que cambia**: regenera schema/client/metadata/RBAC/seed sobre las DBs existentes (no borra data).
- **Pasos** (`setup-all-tenants.js`): codegen BASEMODEL + generate → `npm run sync` → por tenant `tenant:create -- <T> --resume --force`.
- **Cuando**: setup inicial recomendado, o reparar un entorno sin perder datos.
- **⚠️ Issue conocido**: el `npm run sync` (Step 5) hace `db push` de BASEMODEL **sin** `--accept-data-loss` y muere si hay drift, **antes** del loop per-tenant. Mismo origen que §7.

### C. `reset-tenant <T>` (recreate) — `npm run tenant:create -- <T> --recreate --force`

- **Alcance**: 1 tenant, wipe + recreate completo (12 fases).
- **Cuando**: un tenant corrupto, o validar el flujo de creacion de tenant.
- Mismo issue de drift que A en la fase 6.

### D. `rebuild-tenant <T>` (resume) — `npm run tenant:create -- <T> --resume --force`

- **Alcance**: 1 tenant, rebuild **idempotente** sin wipe (salta fases 4 y 6).
- **Que cambia**: repuebla metadata/RBAC/seed sobre el schema ya aplicado; NO borra data.
- **Cuando**: estado canonico de un tenant sin perder datos (usado para UPU en tickets 039/048).

### E. `wipe-tenant <T>` (DB reset) — `npm run tenant:reset -- --tenant <T> --force`

- **Alcance**: 1 tenant, **solo** `prisma migrate reset --skip-seed --skip-generate`.
- **Que cambia**: dropea + re-aplica las migraciones locales → DB vacia con schema. **No** corre codegen/RBAC/seed.
- **Cuando**: vaciar rapido la DB de un tenant (luego correr D para repoblar).
- **⚠️**: dispara el guard AI de Prisma para agentes (ver §2).

### F. `reset-pushdb <T>` (rebuild via db push) — workaround para drift

Cuando `reset-full`/`reset-tenant` estan bloqueados por drift (§7) y se necesita levantar **headless ya**, sobre DBs de **dev/vacias**:

```bash
# Por cada tenant: aplicar el schema codegen via db push, luego repoblar con --resume
for t in DEMO01 DEMO02 ... UPU; do
  npm run codegen -- "$t"
  url=$(grep "^DATABASE_URL_${t}=" object-manager/.env | cut -d= -f2-)
  DATABASE_URL="$url" PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<consent>" \
    npx prisma db push --schema "./prisma/${t}/schema.prisma" --accept-data-loss --skip-generate
  npm run tenant:create -- "$t" --resume --force   # repuebla metadata/RBAC/seed
done
```

> **⚠️ `--accept-data-loss` enmascara riesgo**: en una DB con datos, agregar un unique constraint nuevo puede fallar por duplicados o perder data. Este workaround es **solo dev / DB vacia**. NO usar como fix permanente ni en produccion. El fix correcto es §7.

---

## 6. Resets blandos: `sync` y re-escritura de datos de mod

`npm run sync` **no es un reset duro**: no dropea la DB ni borra data de usuario. Re-aplica a la DB lo que **declaran los mods/proyectos** (capabilities, apps, layouts, seeds) mediante **upsert** (idempotente, seguro de correr N veces). Es el mecanismo para **"resetear los datos de un mod"** a su definicion declarada — por ejemplo, si alguien edito en DB un registro seedeado o una layout y quieres volver al estado del mod.

### Comandos de sync (granulares)

| Comando | Fases | Toca DB | Que re-escribe |
|---------|-------|---------|----------------|
| `npm run sync` | 1–9 + reload de eventos | sí | Todo: archivos + resolvers + capabilities + apps/layouts + seeds + schema + flows |
| `npm run sync:files` | 1, 2 | no | Solo JSON de objetos (mirror proyectos + merge mods → Base) |
| `npm run sync:logic` | 4 | no | Resolvers JS + GraphQL TypeDefs |
| **`npm run sync:db`** | **3b, 3, 5, 6, 7** | **sí** | **Relationship paths + capabilities + apps/layouts + seeds + reportes de mod** ← re-escribe datos de mod. Comprehensive desde `adbb9104` (antes solo 3, 5, 6, 7); excluye Flows (fase 9, no depende de schema de tenant). Aislamiento por tenant + `--strict`/`SYNC_DB_STRICT=1`: ver §7 "Aislamiento por tenant" |
| `npm run sync:flows` | 9 | vía n8n | Flows de mods → n8n (REST) |

### Que re-escribe cada fase de DB (todas upsert salvo nota)

| Fase | Fuente (mod/proyecto) | Tabla destino | Modo |
|------|-----------------------|---------------|------|
| 3b — Relationship Paths | `core_FieldDefinition` (FKs) | tabla de paths BFS pre-computados | upsert |
| 3 — Capabilities | `capabilities.json` | `core_Capability` | upsert |
| 5 — Apps & Layouts | `mods/{mod}/config/app.json`, `config/layouts/*.json` | `up1_suite_app`, `up1_layen_layout` | upsert |
| 6 — Default Layouts | `layout/config/defaults/*.json` | `up1_layen_layout` | upsert |
| 7 — **Seeds** | `mods/{mod}/seed/*.js` | tablas del tenant | **upsert** ← datos de mod |
| 7b — Reportes de mod | `mods/{mod}/reports/*.js` (ReportTemplates) | tablas de reporting | upsert, corre despues de Seeds (necesita `ReportCategory` ya sembrado) |

> **Alcance preciso del reset blando.** Es **upsert por clave**: refresca/sobreescribe los registros que el mod declara, pero **no borra** filas que no esten en el seed (no es un "replace" total). Excepcion: las asignaciones de rol (`up1_layen_layout_role`, `up1_suite_app_role`) se **reemplazan** (deleteMany + recrear) para reflejar exactamente la config del mod. La data de usuario ajena a mods no se toca.

### Otros resets parciales (sin dropear DB)

| Nombre | Comando | Alcance |
|--------|---------|---------|
| **`reset-seed <T>`** | `npm run seed <T>` | Re-corre `prisma/{T}/seed.js` (seed propio del tenant) |
| **`reset-rbac <T>`** | `npm run capabilities:generate <T>` | Regenera capabilities RBAC del tenant |
| **`reset-schema <T>`** | `npm run codegen -- <T>` | Regenera `schema.prisma` + puebla metadata de objetos (no borra data) |

### Cuando usar reset blando vs duro

| Situacion | Reset |
|-----------|-------|
| Cambie seeds/layouts/capabilities/apps de un mod y quiero verlos en DB | `reset-mods` (`sync` o `sync:db`) |
| Un registro seedeado o layout quedo "sucio" en DB y quiero volver al estado del mod | `reset-mods` (`sync:db` — upsert lo restaura) |
| Quiero estado limpio total (borrar tambien data de usuario) | duro: `reset-full` / `reset-tenant` |
| Solo cambie resolvers/typeDefs (sin DB) | `sync:logic` + reiniciar OM |

---

## 7. Caso drift — root cause y fix (cumpliendo las reglas de seguridad)

**Sintoma.** Reset A / C muere en **fase 6** (`migrate dev`) headless con:
`Prisma Migrate has detected that the environment is non-interactive` + warnings tipo
`A unique constraint covering the columns [previousVersionId, version] on the table Activity will be added. If there are existing duplicate values, this will fail.`

**Root cause.** No es bug de constraint ni de codegen. Los `uniqueConstraints` / `versioning` se agregaron en SP4 a los JSON de objetos (`activity.json`, `modality.json`, ...) y ya están commiteados en `prisma/BASEMODEL/schema.prisma`. (Nota: a partir del Sprint 7 con **UPONE-1381**, los objetos `Activity`, `Curriculum` y `Offering` se migraron de workflows relacionales a transiciones de enum de core via el campo `status`, dejando las tablas relacionales de workflow antiguas como obsoletas). Sin embargo, las **migraciones baseline locales por-tenant son gitignored** y se generaron **antes** de que existieran estos constraints y campos actualizados, por lo que quedan *stale*. En el reset: `migrate reset` (fase 4) aplica la migración vieja → `codegen` (fase 5) produce el schema actual con los constraints y estados enum → `migrate dev` (fase 6) ve el delta → quiere crear migración nueva → prompt interactivo → muere headless.

**Por que NO usar `--accept-data-loss` como fix.** Las warnings "if there are existing duplicate values, this will fail" son reales: en una DB con datos (producción) forzar el constraint puede fallar o destruir data. Saltarse con el flag viola la regla de seguridad. Sirve solo como workaround dev (§5.F).

**Fix compatible con las reglas (validado 2026-06-04).** Desde DB **vacia** y **sin migraciones**, `prisma migrate dev` crea+aplica el baseline **headless, sin prompt, sin guard, sin `--accept-data-loss`**; y una segunda corrida da "Already in sync" → lo respeta (cero drift). O sea: **regenerar el baseline** en vez de re-aplicar el stale.

**Secuencia del fix en el reset dev from-0 (Nota: la automatización sigue pendiente en `tenant-create.js`, por lo que debe hacerse de forma manual):**

```
fase 4 (recreate):  vaciar DB  +  rm -rf prisma/{TENANT}/migrations   (baseline stale fuera)
fase 6:             prisma migrate dev --name baseline                 (desde vacio → limpio)
```

Validacion empirica (DB scratch vacia):
- `migrate dev --name baseline` → "PostgreSQL database created" + "migration created and applied" + "in sync". Exit 0, headless, sin flags de data-loss.
- 2da corrida → "Already in sync, no schema change". `migrate status` → "Database schema is up to date!".

**Capa produccion (merge UPONE-1206 → develop).** El reset destructivo NO aplica en prod. Alli los constraints van por **migracion forward formal + dedup de datos previo** (resolver duplicados antes de aplicar el unique). Documentado en `object-manager/docs/migrations.md`.

**Issue relacionado — drift detector (Backlog B-1, ticket-048).** `object-manager/scripts/detect-schema-drift.js` da falso positivo con Modality (no carga `objects/business/RecordTypes/` y keyea por `schema.title` → colisiona RT homonimo con Base object). Puede bloquear el `sync.js` final de `reset-full`. Fix: cargar RecordTypes + keyear por nombre canonico `rt__X__Y`. Core (UPONE-1206).

### Aislamiento por tenant en migracion/sync (UPONE-1365): antes vs ahora

**Antes.** Durante el `sync.js` final de `reset-full`/`rebuild-all` (o un `sync:db` suelto), un fallo de una fase de DB (capabilities, apps/layouts, seeds, relationship paths) en un tenant quedaba logueado a nivel debug ("skipped: ...") sin distincion clara entre exito total y parcial, y sin garantia de liberar la conexion de ese tenant antes de seguir con el siguiente.

**Ahora.** Cada fase que itera tenants (`syncCapabilities`, `syncAppsAndLayouts`, `syncDefaultLayouts`, `syncSeeds`, `syncModReports`, `syncRelationshipPaths` en `object-manager/scripts/sync/dbSync.js` y `relationshipPathSync.js`) registra el fallo por tenant via `recordTenantError` y libera la conexion de ese tenant en un `finally` (`tenantManager.disconnect(tenantId)`) antes de continuar con el siguiente (`object-manager/scripts/sync/SyncManager.js:826-850`). Un tenant caido o lento ya no tumba ni bloquea a los demas.

- **Reporte.** `npm run sync:db` (standalone) imprime un bloque `PARTIAL FAILURE` al final, listando tenant + fase + mensaje si hubo errores (`object-manager/scripts/sync/dbSync.js:1945-1951`). El `npm run sync` completo no imprime ese bloque aparte; los errores por tenant quedan contabilizados en el `Errors: N` del summary general.
- **Exit code.** Por defecto `sync:db` sigue saliendo con exit 0 aunque haya `PARTIAL FAILURE` (compatibilidad: `setup-all-tenants.js` y CI ya tratan `sync:db` como no-fatal). Para forzar exit 1 ante cualquier fallo por tenant: `--strict` o `SYNC_DB_STRICT=1` (`object-manager/scripts/sync/dbSync.js:1955`). `setup-all-tenants.js` (`rebuild-all`) ya salia con exit 1 si algun tenant fallaba, sin cambios ahi.
- **Cap de conexiones.** Cada cliente Prisma por tenant abre `num_cpus + 8` conexiones por defecto; con 15 tenants contra el mismo RDS eso agota `max_connections`. Los scripts (no la API) cappean via `TENANT_DB_CONNECTION_LIMIT` (default 5) y `TENANT_DB_POOL_TIMEOUT` (default 30s), aplicados sobre las `DATABASE_URL_<T>` (`object-manager/scripts/setup-all-tenants.js:37-48`, `object-manager/src/services/dbUrl.js`). No exportar estas env vars globalmente en pods de la API: bajarian el pool de GraphQL bajo carga.
- **Maintenance gate en runtime (OM Editor).** Al aplicar un cambio de schema en caliente sobre un tenant, `tenantMaintenanceGate` responde 503 + `Retry-After` **solo** a ese tenant (via `tenant:{id}:schema:status` en Redis; fail-open si Redis esta caido), mientras el resto de los tenants sigue sirviendo sin interrupcion (`object-manager/src/services/tenantMaintenanceGate.js:1-15`). Detalle completo del gate, el stagger de restarts y el hot-swap de schema en `features/schema-hot-swap.md`.

Esto no relaja el protocolo de seguridad de este doc: el aislamiento evita que un tenant tumbe a los demas, pero sigue sin existir un modo que salte la confirmacion humana ante un paso destructivo.

---

## 8. Verificar que el reset quedo bien

```bash
# 1. Conteos por tenant (debe haber data, no vacio)
#    Esperado aprox: ObjectDefinition 60-90, Capability 1500-1900, Role 6-9, User 90-140
DATABASE_URL_UPU="<url>" TENANT=UPU node -e '
  const {PrismaClient}=require("./prisma/"+process.env.TENANT+"/generated");
  const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL_UPU}}});
  const q=async t=>(await p.$queryRawUnsafe("SELECT count(*)::int n FROM \""+t+"\""))[0].n;
  (async()=>{console.log("ObjectDefinition",await q("core_ObjectDefinition"),"Capability",await q("core_Capability"),"Role",await q("core_Role"),"User",await q("core_User"));await p.$disconnect();})();
'

# 2. La plataforma levanta y sirve GraphQL
node src/index.js   # (o ./up1-start.sh --om)
curl -s -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { queryType { name } } }"}'
# Esperado: {"data":{"__schema":{"queryType":{"name":"Query"}}}}
```

> Si el server quedo corriendo con `node` (no `nodemon`), reinicialo tras un reset para cargar el `dynamic.js` regenerado por codegen.

---

## 9. Errores comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| `migrate dev ... environment is non-interactive` | Drift + headless (§7) | Regenerar baseline (§7) o workaround §5.F |
| `Prisma Migrate detected that it was invoked by Claude Code` | Guard AI en `migrate reset`/`db push` | `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="..."` (§2) |
| `Use the --accept-data-loss flag` (en sync de BASEMODEL) | `setup:dev` Step 5 push sin flag | Aplicar fix §7 o levantar con loop per-tenant `--resume` |
| `EADDRINUSE :4000` | Ya hay un Object Manager corriendo | Es esperado; valida contra ese, o bajalo antes |
| `for t in $VAR` itera 1 sola vez | zsh no hace word-splitting de variables sin comillas | Usar lista literal en el `for`, o `${=VAR}` en zsh |

---

## Referencias

- `operations/local-environment.md` — levantar/bajar servicios, sync, logs.
- `features/schema-hot-swap.md` — detalle del maintenance gate por tenant, stagger de restarts y hot-swap de schema en runtime (UPONE-1365).
- `object-manager/docs/migrations.md` — rollback playbook (capa produccion).
- `object-manager/docs/reference/multi-tenant-architecture.md` — tabla canonica de knobs (`TENANT_DB_CONNECTION_LIMIT`, `--strict`, etc.) y exit semantics por entrypoint.
- `object-manager/scripts/setup-reset.js`, `setup-all-tenants.js`, `tenant-create.js`, `tenant-reset.js`.
- RULE-dev-004 / `core_work_policy` — trabajo core va en rama UPONE-1206, merge gated.
- Tickets SP4: 033 (prereqs clonacion), 039 (versionamiento), 048 (validacion e2e desde estado canonico).
- UPONE-1365: aislamiento de migracion/sync por tenant (commits `22de2180` / `b7347c6c`).

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-06-04 | Creacion. Matriz de 6 tipos de reset duro, guia de decision, pipeline 12 fases, caso drift con root cause + fix validado (regenerar baseline), guard AI de Prisma, verificacion. |
| 2026-06-04 | §6 Resets blandos: `sync`/`sync:db` re-escriben datos de mod (upsert) sin dropear; tabla de fases de DB y que re-escribe cada una; resets parciales (seed-only, capabilities-only, schema-only); distincion duro vs blando. |
| 2026-06-04 | §1 Nomenclatura: nombre canonico por reset (`reset-full`, `rebuild-all`, `reset-tenant`, `rebuild-tenant`, `wipe-tenant`, `reset-pushdb`, `reset-mods`, `reset-seed`, `reset-rbac`, `reset-schema`) → tabla de referencia para pedir un reset por nombre. Guia de decision y detalles alineados a los nombres. |
| 2026-06-15 | Regla de seguridad no negociable (callout tras contexto de arquitectura), dirigida al asistente/LLM. Protocolo de dos momentos ante perdida de datos: (M1) al seleccionar/proponer, alertar que la opcion produce data-loss + anticipar que se pedira confirmacion; (M2) al paso destructivo, pedir confirmacion explicita y esperar respuesta (consentimiento por operacion, no heredable). Prohibiciones al LLM: no usar el doc (guard, --accept-data-loss, reset-pushdb) como menu para esquivar la pregunta; no inventar tecnicas no convencionales (SQL directo, drop manual) para evitar al usuario; si todo bloqueado, escalar, no resolver por fuera. |
| 2026-07-16 | §3: nuevas subsecciones 3.1 (modos granulares de codegen `--schema-only`/`--db-only`/`--skip-capabilities`/`--skip-shared`, commit `57f0fdb5`) y 3.2 (flags de omision bulk `--from-sync`/`--skip-sync-db`/`--skip-register`/`--skip-presync`, commit `adbb9104`), con su fila actualizada en la tabla de 12 fases. §4: nota de aislamiento por tenant. §6: tabla de `sync:db` actualizada a su alcance comprehensivo actual (relationship paths + reportes de mod, ya no solo 4 fases). §7: nueva subseccion "Aislamiento por tenant en migracion/sync (UPONE-1365): antes vs ahora", con `recordTenantError`, bloque `PARTIAL FAILURE`, `--strict`/`SYNC_DB_STRICT`, cap de conexiones por tenant, maintenance gate en runtime (enlaza a `features/schema-hot-swap.md`). Commits `22de2180`/`b7347c6c`. |
