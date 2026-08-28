---
id: SPEC-014-curriculum-design-tech-debt-cleanup-mod
project: up1
ticket: TICKET-032
status: done
---

# Tech debt cleanup curriculum-design — race conditions, refactor, helpers y escalabilidad (mod-only)

# Tech debt cleanup curriculum-design — race conditions, refactor, helpers y escalabilidad (mod-only)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: limpiar deuda tecnica acumulada en `mods/curriculum-design/` post UPONE-1098/1099/1100. Cubre los 6 critical (correctness + escalabilidad) y los 12 should (refactor + helpers + escalabilidad + testing + tipado) detectados en cross-ticket review del 2026-05-24. Al cerrar, el mod queda con typecheck limpio, 597 tests verdes (mas los nuevos), duplicacion reducida medible, y patrones de mantenibilidad establecidos (helpers, errors.js) para reducir el costo de futuros cambios.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Alcance = must + should (6 sessions). Items `could` (C1-C10) quedan en backlog del ticket para tickets futuros separados | Evita scope creep en un ticket de tech debt. Mantiene el ticket "cerrable" en plazo razonable. Could tipicamente son enforcement/limpieza menor que se hacen mejor focalizados |
| 2 | S3 (red de tests por handler para `recordAuditEvent`) precede S4 (refactor 340 LOC) **en el mismo spec**, no en sub-ticket bloqueante | El refactor zero-behavior-change necesita la red. Partirla a sub-ticket agrega overhead sin valor — el ticket queda autocontenido y la dependencia es explicita (`depends_on: S3.GATE`) |
| 3 | S4 marcada `⚑ fuerte` con validation tier `T3` | Refactor de 340 LOC en `auditCapture.resolver.js` toca el audit chain. Riesgo de regresion silenciosa alto. Requiere review humano del diff antes de marcar gate continue, no solo tests verdes |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en audit chain post-refactor `recordAuditEvent`** → S3 construye una red de tests por handler (`handleCreate`/`handleDelete`/`handleUpdate`/`handleTransition`) ANTES de tocar la funcion. S4 ejecuta el refactor con la red activa + review humano obligatorio en gate fuerte.
- **Cambio de behavior accidental en observer compartido del badge** → contract test del cache API publica (`clearStatusCache`, `invalidateStatusCache(tenantId)`) + smoke a11y badge en S1.GATE.
- **Cleanup seeds afecta datos reales si se corre fuera de integration** → tests viven en `tests/integration/` y solo corren con DB de test resetada. CI-only, no en flujo local de dev.
- **Helpers extraidos rompen consumers no detectados** → grep cross-mod antes de extraer + tests por handler/path despues + S5.GATE valida tests verdes.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Items OUT documentados en TICKET-032: n8n SPOF + DLQ, trigger PG append-only, codegen platform, sublayout-por-referencia, TS errors en symlinks `layout/`, BUG-platform-002 estructural. Cada uno requiere coordinacion fuera del mod — quedan referenciados para tickets futuros.
- Items `could` del backlog priorizado (C1-C10) — quedan en seccion Backlog del ticket markdown para abordar en tickets futuros separados.
- Cambios al spec/objects del mod (changeLog, activity, workflow*) — la deuda es en codigo, no en modelado.

**Tamaño estimado**: 6 sessions ejecutables (S1-S6), aproximadamente 12-16h efectivas distribuidas. La mas riesgosa es **S4** (refactor 340 LOC `⚑ fuerte` con tier T3, ~3-4h efectivas con review humano del diff). S1 y S2 son las primeras y desbloquean correctness inmediato (race condition + diff mutation + audit lookup).

**Como vas a saber que funciona** (criterios de validacion observables):

- `cd mods/curriculum-design && npx vue-tsc --noEmit` retorna **0 errores** en codigo dentro de `modsComponents/` y `tests/` del mod (los 3 TS errors actuales eliminados).
- `npm test` retorna **597 + N tests verdes** (N = nuevos tests agregados en S3 + S6 — al menos 8 por handler + cleanup seeds + ensureIndexes).
- `npm run lint` clean (baseline preservado).
- Reduccion observable de duplicacion: **≥150 LOC eliminadas** entre extraccion de helpers (`publisherLoader`, `assertExists`, `upsertRow`, `errors.js`) y eliminacion de duplicado en seed.
- Smoke a11y badge: el badge se renderiza con observer compartido (1 instance module-scope) sin regresion en tabs/cards de actividades.
- Audit chain integrity verificada en S2.GATE: test con stub de Prisma cuenta correctly los recordAuditEvent calls por entidad.

---

## Purpose

Limpieza de deuda tecnica del mod `curriculum-design` post-SP2. El mod acumulo 6 critical + 12 should + 10 could durante UPONE-1098/1099/1100 — los tickets cumplieron su scope original pero dejaron items diferidos. Este spec cierra must + should (decision dev 2026-05-25 en intake-explore de TICKET-032). El alcance esta limitado a archivos dentro de `mods/curriculum-design/` — items que requieren cambios en platform/codegen/infra quedan documentados como OUT en el ticket para informar tickets futuros de coordinacion. Audiencia: equipo del mod (mantenimiento) y platform team (referencia de items que necesitan su intervencion).

## Requirements

### REQ-IMPROVE-01: Race condition en workflow `isDefault` resuelta con transaccion atomica

> **Que cambia**: cuando dos requests crean workflows con `isDefault=true` simultaneamente, el sistema garantiza que solo uno gana — no quedan dos workflows con `isDefault=true` en la DB.
> **Por que**: hoy la validacion (`partial unique`) corre fuera de transaccion → dos requests concurrentes pueden ambos pasar el check antes de que el primero commitee, violando el invariante.

El sistema MUST usar `prisma.$transaction({ isolationLevel: 'Serializable' })` al crear/actualizar workflows con `isDefault: true`, encapsulando el check `findUnique(isDefault=true existente)` + el insert/update en una sola transaccion serializable.

**Actor**: system
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: dos creates simultaneos con isDefault=true
- **GIVEN** workflow para activityType=ASIGNATURA sin default
- **WHEN** dos clients hacen `createWorkflowValidated({ isDefault: true })` simultaneamente
- **THEN** uno commitea exitosamente y el otro retorna error `WORKFLOW_DOUBLE_DEFAULT`
- **AND** la DB tiene exactamente 1 workflow con `isDefault=true` para ese activityType

#### Scenario: update concurrente cambiando isDefault
- **GIVEN** workflow A con `isDefault=false` y workflow B con `isDefault=true`
- **WHEN** request1 hace `update(A, isDefault=true)` y request2 hace `update(B, isDefault=false)` simultaneamente
- **THEN** el resultado final tiene exactamente 1 workflow con `isDefault=true`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar el test de concurrencia con 10 requests paralelos creando workflows con `isDefault=true`; solo 1 debe quedar en la DB con ese flag.

### REQ-IMPROVE-02: Observer del tema y cache del badge — escalabilidad N×N → 1×N

> **Que cambia**: hoy cada instancia de `ActivityStatusBadge` crea su propio `MutationObserver` para escuchar cambios de tema; con N badges en pantalla son N observers. Con este cambio hay 1 observer module-scope con `Set<callback>` → cada badge se suscribe/desuscribe. Ademas, el `statusCache` (hoy exportado como `Map` mutable sin TTL ni isolation multi-tenant) gana API publica controlada: `clearStatusCache()` y `invalidateStatusCache(tenantId)`.
> **Por que**: con N badges en pantalla (>20 instituciones en Phase 2, vistas de listado de actividades), el patron actual escala como N observers + N cache accesses sin invalidation. Bloquea Phase 2 multi-tenant.

El sistema MUST implementar:

- **(a) Observer compartido**: 1 `MutationObserver` module-scope con `Set<callback>`. Cada `useActivityStatusBadge` se suscribe en mount y se desuscribe en unmount. Cuando el set queda vacio, el observer se disconnecta.
- **(b) API publica de cache**: `clearStatusCache()` (limpia todo) y `invalidateStatusCache(tenantId)` (limpia un tenant). El `Map` interno deja de ser exportado mutable directo.
- **(c) Reset entre tests**: `clearStatusCache()` se invoca en `beforeEach` del test a11y del badge para isolation determinista.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: badge mount/unmount con observer compartido
- **GIVEN** zero badges montados (set vacio, observer disconnected)
- **WHEN** monta badge #1
- **THEN** observer se crea + observer.observe() called + set tiene callback #1
- **WHEN** monta badge #2
- **THEN** observer NO se recrea + set tiene callbacks #1, #2
- **WHEN** desmonta badge #2
- **THEN** set tiene solo callback #1, observer sigue connected
- **WHEN** desmonta badge #1
- **THEN** set vacio + observer.disconnect() called

#### Scenario: cache invalidation por tenant
- **GIVEN** statusCache con entries de tenant=A y tenant=B
- **WHEN** se llama `invalidateStatusCache('A')`
- **THEN** entries de A removidas, entries de B preservadas

#### Scenario: tests aislados por reset
- **GIVEN** test #1 cachea statuses
- **WHEN** test #2 corre con `beforeEach: clearStatusCache()`
- **THEN** test #2 NO ve cache de test #1

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abrir devtools, ir a una vista con ≥5 badges, en console ejecutar `getMutationObserverCount()` → retorna 1, no 5. Cambiar tema → todos los badges reaccionan.

### REQ-IMPROVE-03: AuditCapture — whitelist explicito de entityType + diff inmutable

> **Que cambia**: dos fixes en `auditCapture.resolver.js`. (a) Lookup dinamico de Prisma model en linea 376 deja de depender de `charAt(0).toLowerCase()`; gana mapping explicito `entityType → prismaModelKey`. (b) Diff en lineas 472-473 deja de mutar `stateField.oldValue/newValue` in-place; se crea objeto nuevo via spread.
> **Por que**: (a) hoy el lookup depende de naming convention — si `AUDITABLE_TYPES` cambia, el lookup falla silencioso. (b) la mutacion in-place puede causar side effects silenciosos si la referencia se usa downstream.

El sistema MUST:

- **(a)** Mantener una constante `AUDITABLE_TYPE_TO_PRISMA_KEY: Record<EntityType, string>` con el mapping explicito (ej: `Activity → 'activity'`). El lookup en `recordAuditEvent` usa esta tabla en lugar de transformacion.
- **(b)** Al normalizar `stateField.oldValue/newValue` con nombres legibles, devolver un objeto nuevo (`return { ...stateField, oldValue: nameById.get(id), newValue: nameById.get(id) }`) en lugar de mutar el original.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: whitelist falla si entityType desconocido
- **GIVEN** auditCapture recibe `entityType: 'UnknownType'` (no en whitelist)
- **WHEN** se ejecuta lookup
- **THEN** retorna error `AUDIT_UNKNOWN_ENTITY_TYPE` con detalle del entityType (no silent failure)

#### Scenario: diff inmutable preserva referencia original
- **GIVEN** stateField = { oldValue: 'id-1', newValue: 'id-2' } compartido con downstream consumer
- **WHEN** auditCapture normaliza con name lookup
- **THEN** stateField original SIN cambios, downstream ve los IDs originales

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar `npm test -- auditCapture` → tests de mapping + immutability pasan.

### REQ-IMPROVE-04: WorkflowTransitionHistory — whitelist soft + normalizacion PascalCase

> **Que cambia**: `createWorkflowTransitionHistoryValidated` valida y normaliza el `entityType` a PascalCase canonico. Hoy un caller via CRUD generic puede insertar `'activity'` (lowercase) y corromper consistency con changeLog.
> **Por que**: la convencion PascalCase no esta enforced en `*Validated`; consumers descuidados rompen invariante.

El sistema MUST validar que `entityType` recibido por `createWorkflowTransitionHistoryValidated` pertenezca a un whitelist explicito y normalizarlo a PascalCase canonico antes de persistir. Si el `entityType` no esta en whitelist: retornar error `TRANSITION_HISTORY_INVALID_ENTITY_TYPE`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: lowercase rechazado
- **GIVEN** request con `entityType: 'activity'` (lowercase)
- **WHEN** llama `createWorkflowTransitionHistoryValidated`
- **THEN** retorna error `TRANSITION_HISTORY_INVALID_ENTITY_TYPE` con sugerencia "use 'Activity'"

#### Scenario: PascalCase aceptado y normalizado
- **GIVEN** request con `entityType: 'Activity'` (PascalCase whitelisted)
- **WHEN** llama el validator
- **THEN** persiste con `entityType: 'Activity'` consistente con changeLog

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar insertar via tooling con `entityType: 'activity'` → rechazado con error claro.

### REQ-IMPROVE-05: Refactor `recordAuditEvent` (340 LOC) en 4 handlers privados — zero behavior change

> **Que cambia**: la funcion `recordAuditEvent` (340 lineas, 4 branches por `operation`: CREATE/DELETE/UPDATE/TRANSITION) se divide en 4 handlers privados (`handleCreate`, `handleDelete`, `handleUpdate`, `handleTransition`). Funcion top-level queda como dispatcher (~30 lineas). Zero behavior change — los tests del red construido en S3 validan que los outputs son identicos pre/post refactor.
> **Por que**: 340 lineas en una funcion con 4 branches es un foco de modificacion frecuente con riesgo de regresion cada vez que se toca. Separar en handlers reduce blast radius y permite testear cada path en aislamiento.

El sistema MUST refactorizar `recordAuditEvent` segun:

- **(a)** Extraer 4 funciones privadas: `handleCreate(ctx, input)`, `handleDelete(ctx, input)`, `handleUpdate(ctx, input)`, `handleTransition(ctx, input)`.
- **(b)** La funcion publica `recordAuditEvent` queda como dispatcher: switch por `input.operation` invocando el handler correspondiente.
- **(c)** Los 4 handlers comparten via dependencias inyectadas (`ctx`): `prisma`, `tenantId`, `userId`, `now`, helpers.
- **(d)** **Zero behavior change**: outputs y side effects identicos a la version pre-refactor. Validado por la red de tests de S3.T2.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: dispatcher invoca handler correcto
- **GIVEN** input con `operation: 'CREATE'`
- **WHEN** se llama `recordAuditEvent(input)`
- **THEN** internally invoca `handleCreate`, no los otros 3

#### Scenario: behavior preservado en operation=UPDATE
- **GIVEN** mismo input que test pre-refactor (snapshot capturado en S3.T2)
- **WHEN** se ejecuta `recordAuditEvent` post-refactor
- **THEN** output identico al snapshot pre-refactor + side effects en DB identicos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `git diff` muestra `recordAuditEvent` reducida a ~30 LOC + 4 handlers nuevos. Tests pasan sin cambios. Review humano confirma "zero behavior change" basado en diff visual.

### REQ-IMPROVE-06: Refactor `rtUpdateHandler` + helpers compartidos + modulo errors

> **Que cambia**: 4 cambios paralelos de mantenibilidad. (a) `rtUpdateHandler` (140 LOC en `polymorphicUpdate.resolver.js`) se divide en `fetchAndSplitFields` + `executeUpdates` + `publishEvent`. (b) `loadPublishToChannel` duplicado entre `activity.resolver.js` y `polymorphicUpdate.resolver.js` se extrae a `logic/helpers/publisherLoader.js` (singleton cache module-scope). (c) Helper `assertExists(record, code, message)` extrae el boilerplate repetido en 4 resolvers (`workflow`, `workflowTransition`, `workflowTransitionHistory`, `activity`). (d) `logic/errors.js` centraliza error codes (`ERR.WORKFLOW_*`, `ERR.AUDIT_*`, etc.); 5 resolvers migran a usar `ERR.*` en lugar de string literales.
> **Por que**: duplicacion entre resolvers multiplica el punto de cambio cada vez que se ajusta el patron. Errors centralizados habilitan i18n futuros + logging estructurado. `rtUpdateHandler` y `recordAuditEvent` son los dos focos de cambio mas frecuente del mod — separar en handlers reduce friction.

El sistema MUST:

- **(a)** Refactorizar `rtUpdateHandler` en 3 funciones privadas con responsabilidad unica.
- **(b)** Crear `logic/helpers/publisherLoader.js` exportando `loadPublishToChannel()` con singleton cache. Eliminar duplicado en `activity.resolver.js` y `polymorphicUpdate.resolver.js`.
- **(c)** Crear `logic/helpers/assertExists.js` exportando `assertExists(record, code, message)`. Migrar 4 resolvers para usarlo (reduccion >20 LOC).
- **(d)** Crear `logic/errors.js` con `ERR.{WORKFLOW_DOUBLE_DEFAULT, WORKFLOW_ARCHIVED, AUDIT_UNKNOWN_ENTITY_TYPE, ...}`. Migrar 5 resolvers a usar `ERR.*` (workflow, workflowTransition, workflowTransitionHistory, activity, auditCapture).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: helper compartido elimina duplicacion
- **GIVEN** activity.resolver.js y polymorphicUpdate.resolver.js usan `loadPublishToChannel` desde helper
- **WHEN** grep `loadPublishToChannel` en logic/
- **THEN** retorna 1 implementacion (en `helpers/publisherLoader.js`) + 2+ imports

#### Scenario: errors centralizados
- **GIVEN** un test que verifica error codes
- **WHEN** un resolver lanza error
- **THEN** el codigo es `ERR.X` (referencia al modulo), no string literal "WORKFLOW_DOUBLE_DEFAULT"

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npx eslint --quiet mods/curriculum-design/` retorna 0 warns nuevos. Grep de duplicacion (`grep "function loadPublishToChannel" mods/curriculum-design/logic/`) retorna 1 match (en helpers/), no 2.

### REQ-IMPROVE-07: Fix de 3 TypeScript errors del mod

> **Que cambia**: 3 errores que `vue-tsc --noEmit` reporta en el mod se eliminan: (a) `CompositeSectionForm.ts:138` (TS2769 — handler signature), (b) `CompositeSectionView.ts:127` (TS2769 — `'md'` debe ser valor del enum), (c) `tests/integration/form-feedback.test.ts:181` (TS2322 — `null` → `undefined`).
> **Por que**: el mod no puede incluirse en CI con typecheck mientras estos errores existan. Bloquea quality gates futuros.

El sistema MUST resolver los 3 errores de typecheck del mod sin modificar archivos symlinkeados a `layout/` (los TS errors en `BaseCard/*` y `CalendarEventCard/*` son OUT — viven en layout package).

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: typecheck limpio en codigo del mod
- **GIVEN** los 3 fixes aplicados
- **WHEN** ejecuta `cd mods/curriculum-design && npx vue-tsc --noEmit 2>&1 | grep -E "modsComponents/(CompositeSectionTree|ActivityStatusBadge)|tests/integration/(form-feedback|aria-attrs)"`
- **THEN** retorna 0 lineas (los 3 errores eliminados)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `cd mods/curriculum-design && npx vue-tsc --noEmit` no muestra ninguno de los 3 errores. Los errores en symlinks de `layout/` siguen apareciendo (esperado — son OUT del ticket).

### REQ-IMPROVE-08: Escalabilidad — cache metadata Prisma + MAX_FIELDS + seed batch

> **Que cambia**: tres optimizaciones de escalabilidad. (a) Metadata de modelos Prisma en `polymorphicUpdate.resolver.js` ahora se cachea module-scope con TTL 5min — reduce 4 queries/request a ~0 en steady state. (b) `auditCapture.resolver.js` introduce `MAX_FIELDS_PER_BATCH = 30` con warn log si se supera (no error, no truncar). (c) Seed `_data-workflow-objects.js` reemplaza `findFirst+create` por `createMany`/`upsert` batch donde Prisma lo soporte.
> **Por que**: el N+1 del seed y los queries repetidos del polymorphicUpdate limitan throughput en Phase 2 multi-tenant (>20 instituciones). Cache + batch reducen roundtrips significativamente.

El sistema MUST:

- **(a)** Implementar cache module-scope `prismaMetadataCache: Map<modelName, metadata>` con timestamp + TTL 5min. Invalidacion automatica al expirar.
- **(b)** Definir `MAX_FIELDS_PER_BATCH = 30` como constante exportable. Si `recordAuditEvent` detecta input con >30 fields a registrar, loguear warn con detalle (no truncar, no error).
- **(c)** Migrar seed batches que hoy hacen `findFirst+create` a `createMany`/`upsert` (donde Prisma lo soporte; status: workflows: upsert; statuses: createMany skipDuplicates; transitions: upsert). Reportar reduccion de queries en S6.GATE.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cache reduce queries en steady state
- **GIVEN** un benchmark con 100 calls consecutivos a `polymorphicUpdate.resolveModel` para mismo modelo
- **WHEN** se ejecuta con cache habilitado
- **THEN** numero de queries a Prisma metadata es 1 (no 100)

#### Scenario: MAX_FIELDS warn dispara
- **GIVEN** input con 35 fields a auditar
- **WHEN** ejecuta `recordAuditEvent`
- **THEN** logs incluyen `[WARN] auditCapture: MAX_FIELDS_PER_BATCH (30) exceeded, got 35` con detalle pero el processing continua

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar `npm test` retorna seed counts iguales pre/post refactor + tests de cache pasan + benchmark de seed muestra reduccion de roundtrips.

### REQ-IMPROVE-09: Coverage de tests — cleanup seeds + ensureIndexes error path

> **Que cambia**: dos gaps de testing concretos. (a) Cleanup seeds (`_data-layouts-pascalcase-cleanup.js` y `*-v2.js`) tienen 4 ramas (DELETE-si-pascal-existe / UPDATE-si-no, por cada version v1+v2) que corren en cada `npm run sync` SIN cobertura — bug introducido aqui se descubre solo en runtime. (b) `ensureIndexes` retorna `errors.length > 0` que loguea warning pero no falla; no hay test que cubra ese path.
> **Por que**: el cleanup de PascalCase corre en produccion en cada sync; sin cobertura, regressions silenciosas son posibles. El error path de ensureIndexes oculta fallos en CI.

El sistema MUST agregar:

- **(a)** `tests/integration/cleanup-seeds.test.ts` con ≥4 tests cubriendo las 4 ramas: DELETE-cuando-pascal-existe, UPDATE-cuando-no, idempotency, y handling de filas concurrentemente modificadas.
- **(b)** `tests/integration/ensureIndexes-errors.test.ts` con ≥1 test que stubea Prisma error en `pg_indexes` query y verifica que `ensureIndexes` retorna `errors.length > 0` + loguea warning + no rompe el flujo seed.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cleanup seed v1 path DELETE
- **GIVEN** DB con fila legacy + fila pascalcase para mismo objeto
- **WHEN** corre cleanup seed
- **THEN** legacy borrada, pascalcase preservada

#### Scenario: cleanup seed v1 path UPDATE
- **GIVEN** DB solo con fila legacy (sin pascalcase)
- **WHEN** corre cleanup seed
- **THEN** legacy renombrada a pascalcase

#### Scenario: ensureIndexes error path
- **GIVEN** Prisma stub que rechaza la query a `pg_indexes`
- **WHEN** llama `ensureIndexes`
- **THEN** retorna `{ errors: [...] }` no vacio + loguea warn + el caller continua

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm test -- cleanup-seeds` y `npm test -- ensureIndexes-errors` pasan con ≥5 tests nuevos verdes.

### REQ-PRESERVE-01: Baseline de tests + lint preservado (regression general)

> **Que cambia**: los 597 tests existentes deben seguir verdes y el lint clean preservado al final del ticket. Es regression base para todo refactor.
> **Por que**: mejorar algo y romper otro no es mejora (DET-7).

El sistema MUST mantener 597/597 tests existentes pasando en `npm test` + lint clean en `npm run lint` al cierre de cada `S{N}.GATE`. Cualquier regresion detectada en un gate fuerza decision `iterate` (no `continue`) hasta resolver.

**Actor**: system
**Layers**: backend, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: tests baseline preservado
- **GIVEN** cualquier S{N}.GATE
- **WHEN** ejecuta `cd mods/curriculum-design && npm test`
- **THEN** 597 + (N nuevos tier S{≤N}) tests pasan, 0 fallidos

#### Scenario: lint clean baseline
- **GIVEN** post cualquier task de developer
- **WHEN** ejecuta `npm run lint`
- **THEN** 0 nuevos warnings/errors respecto al baseline

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar suite completa post-S6.GATE → 597+N tests verdes + lint clean.

### REQ-PRESERVE-02: Behavior de `recordAuditEvent` preservado post-refactor (zero behavior change)

> **Que cambia**: la red de tests construida en S3.T2 (≥4 tests por handler) sirve como contract test del comportamiento de `recordAuditEvent`. Despues del refactor en S4, esos tests deben pasar sin modificacion — si alguno requiere cambio, hay behavior change accidental que invalida el refactor.
> **Por que**: refactor de 340 LOC sin red de seguridad es ruleta rusa. La red codifica el behavior actual antes de tocarlo (DET-7).

El sistema MUST garantizar que los tests de `tests/integration/auditCapture-handlers.test.ts` (creados en S3.T2) pasen SIN modificacion post-refactor (S4.T1). Si requieren cambio para pasar: el refactor introdujo behavior change accidental → revertir S4 o documentar la divergencia explicita como decision local.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: tests handler pasan pre y post refactor
- **GIVEN** suite de tests `auditCapture-handlers.test.ts` con ≥4 tests
- **WHEN** se ejecuta antes y despues del refactor S4
- **THEN** mismos N tests pasan, sin modificaciones al test file

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `git log` muestra que `tests/integration/auditCapture-handlers.test.ts` no fue modificado entre el commit de S3 y el de S4.

### REQ-PRESERVE-03: Contract publico de `modsComponents/ActivityStatusBadge` preservado

> **Que cambia**: los consumers del badge (cards y tabs de actividades) no se afectan por el cambio interno a observer compartido + cache API publica. La API exterior (props del componente, valores de tema observados) se preserva.
> **Por que**: el badge se renderiza en multiples consumers; un breaking change rompe la UI silenciosa.

El sistema MUST preservar el contract publico del badge:

- Props del componente (`activityId`, `tenantId`, etc.) sin cambios.
- Comportamiento visual ante cambios de tema sin cambios.
- Hook `useActivityStatusBadge` mantiene la firma actual.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: smoke a11y badge sin regresion
- **GIVEN** test `tests/integration/activity-status-badge-a11y.test.ts`
- **WHEN** corre con observer compartido + cache API publica
- **THEN** tests existentes pasan sin modificaciones

</details>

#### Acceptance
**El usuario puede verificar que funciona**: visualmente, el badge sigue mostrando el status correcto en cards y tabs sin cambio aparente. Tests a11y verdes.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Observers MutationObserver del badge | conteo de instancias por pagina | 1 module-scope (no N por badge) |
| Performance | Queries a Prisma metadata en polymorphicUpdate.resolveModel | queries por call en steady state | 0 (cache hit) post-warmup |
| Performance | Seed roundtrips en `_data-workflow-objects.js` | queries por seed completo | reduccion observable (target: -50% vs baseline) |
| Quality | Typecheck del mod | errores `vue-tsc --noEmit` en codigo del mod | 0 (los 3 actuales eliminados) |
| Quality | Tests existentes baseline | tests verdes en `npm test` | 597/597 + N nuevos (S3+S6) |
| Quality | Lint baseline | warnings/errors `npm run lint` | 0 nuevos respecto a baseline |
| Maintainability | Duplicacion eliminada (helpers extraidos) | LOC eliminadas en logic/ + seed/ | ≥150 LOC |
| Scale | MAX_FIELDS_PER_BATCH en auditCapture | warn (no error) si N>30 fields a auditar | constante configurable, default 30 |

## Artifacts

### Modified: `logic/workflow.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Validacion `isDefault` unique | Check + insert fuera de tx | `$transaction({ isolationLevel: 'Serializable' })` envolviendo check+insert | Race condition bajo concurrencia (REQ-IMPROVE-01) |
| Error codes | String literal `'WORKFLOW_DOUBLE_DEFAULT'` | `ERR.WORKFLOW_DOUBLE_DEFAULT` (de `logic/errors.js`) | Centralizacion (REQ-IMPROVE-06) |

### Modified: `logic/auditCapture.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Lookup `prismaModelKey` (linea 376) | `charAt(0).toLowerCase()` transformacion | Mapping explicito `AUDITABLE_TYPE_TO_PRISMA_KEY` | Whitelist explicito (REQ-IMPROVE-03) |
| Diff `oldValue/newValue` (lineas 472-473) | Mutacion in-place de `stateField` | Spread + objeto nuevo | Immutability (REQ-IMPROVE-03) |
| `recordAuditEvent` shape | 340 LOC en 1 funcion con switch interno | Dispatcher ~30 LOC + 4 handlers privados (`handleCreate`, `handleDelete`, `handleUpdate`, `handleTransition`) | Mantenibilidad (REQ-IMPROVE-05) |
| `MAX_FIELDS_PER_BATCH` | Sin limite | Constante `30` + warn log si se supera | Escalabilidad (REQ-IMPROVE-08) |

### Modified: `logic/workflowTransitionHistory.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Validacion `entityType` en `createWorkflowTransitionHistoryValidated` | No valida, acepta cualquier string | Whitelist + normalizacion PascalCase | Consistency (REQ-IMPROVE-04) |

### Modified: `logic/polymorphicUpdate.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `rtUpdateHandler` shape | 140 LOC en 1 funcion | `fetchAndSplitFields` + `executeUpdates` + `publishEvent` (3 funciones privadas) | Mantenibilidad (REQ-IMPROVE-06) |
| Metadata Prisma queries | 4 queries/request, sin cache | Cache module-scope con TTL 5min | Escalabilidad (REQ-IMPROVE-08) |
| `loadPublishToChannel` | Duplicado en este archivo | Import de `helpers/publisherLoader.js` | Anti-duplicacion (REQ-IMPROVE-06) |

### Modified: `logic/activity.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `loadPublishToChannel` | Duplicado en este archivo | Import de `helpers/publisherLoader.js` | Anti-duplicacion (REQ-IMPROVE-06) |
| `assertExists` boilerplate | Inline en multiples checks | Helper compartido | Anti-duplicacion (REQ-IMPROVE-06) |

### Modified: `modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| MutationObserver | 1 por instancia del badge | 1 module-scope compartido + `Set<callback>` | Escalabilidad (REQ-IMPROVE-02) |

### Modified: `modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `statusCache` API | Exportado como `Map` mutable directo | `clearStatusCache()` + `invalidateStatusCache(tenantId)` API publica | Encapsulation (REQ-IMPROVE-02) |

### Modified: `modsComponents/CompositeSectionTree/CompositeSectionForm.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea 138 — handler signature | TS2769 (No overload matches) | Signature alineada con tipo del prop | Fix TS (REQ-IMPROVE-07) |

### Modified: `modsComponents/CompositeSectionTree/CompositeSectionView.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea 127 — `'md'` literal | TS2769 (No overload matches; `'md'` no es del enum) | Valor del enum correspondiente | Fix TS (REQ-IMPROVE-07) |

### Modified: `tests/integration/form-feedback.test.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea 181 — type assignment | TS2322 (`null` no asignable a `string \| undefined`) | `undefined` en lugar de `null` | Fix TS (REQ-IMPROVE-07) |

### Modified: `seed/_data-workflow-objects.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `upsertStatuses` / `upsertWorkflows` / `upsertTransitions` | 3 funciones casi identicas (~90 LOC duplicados) | 1 helper `upsertRow` parametrizable + 3 invocaciones | Anti-duplicacion (REQ-IMPROVE-06) |
| Patron `findFirst+create` | N+1 queries por seed batch | `createMany skipDuplicates` / `upsert` donde Prisma lo soporte | Escalabilidad (REQ-IMPROVE-08) |

### Added: `logic/helpers/publisherLoader.js`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `loadPublishToChannel()` | function | Singleton publisher loader compartido entre activity y polymorphicUpdate |
| Internal `cachedPublisher` | module-scope variable | Cache del publisher instanciado |

### Added: `logic/helpers/assertExists.js`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `assertExists(record, code, message)` | function | Throw error con code centralizado si record es null/undefined |

### Added: `logic/errors.js`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `ERR` | Object.freeze({...}) | Diccionario central de error codes (`WORKFLOW_*`, `AUDIT_*`, `TRANSITION_HISTORY_*`, `ACTIVITY_*`) |

### Added: `seed/_helpers/upsertRow.js`

| Field | Value | Purpose |
|-------|-------|---------|
| Export `upsertRow(modelName, whereClause, data)` | function | Helper parametrizable usado por `upsertStatuses`, `upsertWorkflows`, `upsertTransitions` |

### Added: `tests/integration/auditCapture-handlers.test.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Tests | ≥4 (uno por handler: handleCreate, handleDelete, handleUpdate, handleTransition) | Red de seguridad para refactor de `recordAuditEvent` (S4) |

### Added: `tests/integration/cleanup-seeds.test.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Tests | ≥4 (cubriendo DELETE-si-pascal / UPDATE-si-no para v1 y v2) | Cobertura del cleanup que corre en cada sync (REQ-IMPROVE-09) |

### Added: `tests/integration/ensureIndexes-errors.test.ts`

| Field | Value | Purpose |
|-------|-------|---------|
| Tests | ≥1 (stub Prisma error en query `pg_indexes`) | Cobertura del error path de `ensureIndexes` (REQ-IMPROVE-09) |

## Tasks

> **Plan de sessions (DET-20)**: 6 sessions ejecutables (S1-S6). Numeracion empieza en **S1** porque el ticket no tiene sessions execute previas — el intake fue offline en cross-ticket review del 2026-05-24, no produjo Session 0 formal.

### Session 1 — must: race condition workflow + observer/cache badge [tipo: auto] [tier: T2]

> Cubre 3 critical: M1 (race condition `isDefault`), M2 (observer compartido badge), M3 (cache API publica + reset entre tests). Tasks paralelas — toca archivos distintos sin overlap. Cierre con smoke a11y del badge + tests de concurrencia.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Fix race condition `isDefault` con `$transaction({ isolationLevel: 'Serializable' })` en createWorkflowValidated + updateWorkflowValidated | REQ-IMPROVE-01 | developer | — | logic/workflow.resolver.js | TC-01 unit test + test concurrencia paralela 10 requests | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 1 |
| S1.T2 | Observer compartido del tema en badge (1 module-scope con Set<callback>) + suscripcion mount/unmount | REQ-IMPROVE-02 | developer | — | modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue | TC-02 mount/unmount tests + smoke a11y badge sin regresion | git revert | DET-5, DET-8, DET-10 | pending | 1 |
| S1.T3 | API publica del cache del badge: `clearStatusCache()` + `invalidateStatusCache(tenantId)` + reset entre tests | REQ-IMPROVE-02, REQ-PRESERVE-03 | developer | S1.T2 | modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts + tests/integration/activity-status-badge-a11y.test.ts | TC-03 cache isolation + tests existentes a11y verdes con reset | git revert | DET-5, DET-7, DET-8 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr `npm test` + `npm run lint`, smoke a11y badge, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + 597+3 tests verdes + smoke a11y badge sin regresion + DET-23 quality review tier standard | (no aplica — cierre de session) | DET-20, DET-23 | pending | 1 |

### Session 2 — must: auditCapture lookup + diff + transition history whitelist [tipo: auto] [tier: T2]

> Cubre 3 critical: M4 (whitelist entityType en auditCapture lookup), M5 (whitelist + normalizacion transitionHistory), M6 (no mutar diff in-place). M4 y M6 viven en `auditCapture.resolver.js` — agrupacion natural por archivo. Cierre con test de audit chain integrity (stub Prisma + count).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Whitelist explicito `AUDITABLE_TYPE_TO_PRISMA_KEY` + reemplazar lookup dinamico en `recordAuditEvent` | REQ-IMPROVE-03 | developer | S1.GATE | logic/auditCapture.resolver.js (linea ~376) | TC-04 test mapping + test unknown entityType rechazado | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 2 |
| S2.T2 | Reemplazar mutacion in-place del diff (lineas 472-473) por spread a objeto nuevo | REQ-IMPROVE-03 | developer | S2.T1 | logic/auditCapture.resolver.js (linea ~472) | TC-05 test referencia original preserved | git revert | DET-5, DET-8 | pending | 2 |
| S2.T3 | Whitelist + normalizacion PascalCase de `entityType` en `createWorkflowTransitionHistoryValidated` | REQ-IMPROVE-04 | developer | S1.GATE | logic/workflowTransitionHistory.resolver.js | TC-06 test lowercase rechazado + PascalCase aceptado | git revert | DET-5, DET-8, DET-10 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir resultados, correr `npm test` + audit chain integrity test (stub Prisma + count), decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + 597+6 tests verdes + audit chain integrity verificada + DET-23 quality review tier standard | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — should pre-refactor: TS fixes + tests por handler para recordAuditEvent [tipo: auto] [tier: T1]

> Pre-condicion CRITICA para S4. S3.T1 fixea los 3 TS errors. S3.T2 construye la red de tests por handler (handleCreate/handleDelete/handleUpdate/handleTransition) que sirve como contract test del refactor de S4 — sin esta red, S4 es ruleta rusa.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Fix 3 TS errors del mod | REQ-IMPROVE-07 | developer | S2.GATE | modsComponents/CompositeSectionTree/CompositeSectionForm.ts:138 + CompositeSectionView.ts:127 + tests/integration/form-feedback.test.ts:181 | `vue-tsc --noEmit` retorna 0 errors en codigo del mod | git revert | DET-5, DET-8 | pending | 3 |
| S3.T2 | Tests por handler para `recordAuditEvent`: ≥4 tests (handleCreate, handleDelete, handleUpdate, handleTransition) — red de seguridad para refactor S4 | REQ-PRESERVE-02 | developer | S2.GATE | tests/integration/auditCapture-handlers.test.ts (NEW) | ≥4 tests nuevos cubren los 4 branches de `recordAuditEvent` + 597+8 tests pasan | git revert | DET-5, DET-7, DET-8 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T1)** — persistir resultados, verificar tests + typecheck, decidir continue/iterate/escalate/standby | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + `vue-tsc` 0 errores + tests nuevos verdes + DET-23 quality review tier light | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — should refactor: recordAuditEvent (340 LOC) zero-behavior-change [tipo: ⚑ fuerte] [tier: T3]

> Refactor de la funcion central del audit chain. ⚑ fuerte por riesgo de regresion silenciosa (340 LOC, 4 branches). Tier T3 — review humano del diff obligatorio antes de marcar continue. La red de tests de S3.T2 valida zero behavior change automaticamente. Esta sesion es la mas riesgosa del ticket.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Refactor `recordAuditEvent` (340 LOC) a 4 handlers privados (`handleCreate`, `handleDelete`, `handleUpdate`, `handleTransition`) + dispatcher (~30 LOC) | REQ-IMPROVE-05, REQ-PRESERVE-02 | developer | S3.GATE | logic/auditCapture.resolver.js | 597+8 tests verdes (incluye los de S3.T2 sin modificar) + diff visualmente review-friendly + zero behavior change verificado | git revert | DET-5, DET-7, DET-8, DET-10, DET-11 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3, ⚑ fuerte)** — persistir resultados, correr suite completa + review humano del diff + smoke audit chain manual, decidir continue/iterate/escalate. Requiere OK humano explicito antes de continue | — | reviewer | S4.T1 | ticket | gate persistido + 597+8 tests verdes + lint clean + review humano del diff documentado + DET-23 quality review tier exhaustive | git revert S4.T1 si review identifica behavior change | DET-20, DET-23 | pending | 4 |

### Session 5 — should refactor: rtUpdateHandler + helpers comunes + errors.js [tipo: auto] [tier: T2]

> 4 cambios paralelos de mantenibilidad: rtUpdateHandler split, helpers compartidos (publisherLoader, assertExists), modulo errors.js central + migracion de 5 resolvers. Ningun cambio funcional — todo es refactor. Reduccion esperada: >100 LOC eliminadas.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Refactor `rtUpdateHandler` (140 LOC) → `fetchAndSplitFields` + `executeUpdates` + `publishEvent` (3 funciones privadas) | REQ-IMPROVE-06 | developer | S4.GATE | logic/polymorphicUpdate.resolver.js | TC-07 tests existentes pasan + diff visual ≤140 LOC top-level | git revert | DET-5, DET-7, DET-8, DET-10 | pending | 5 |
| S5.T2 | Extraer `loadPublishToChannel` duplicado a `logic/helpers/publisherLoader.js` con singleton cache + eliminar duplicados | REQ-IMPROVE-06 | developer | S5.T1 | logic/helpers/publisherLoader.js (NEW) + activity.resolver.js + polymorphicUpdate.resolver.js | `grep "function loadPublishToChannel" mods/curriculum-design/logic/` retorna 1 match (helpers/) + tests pasan | git revert | DET-5, DET-8 | pending | 5 |
| S5.T3 | Crear helper `assertExists(record, code, message)` + migrar 4 resolvers (workflow, workflowTransition, workflowTransitionHistory, activity) | REQ-IMPROVE-06 | developer | S5.T2 | logic/helpers/assertExists.js (NEW) + 4 resolvers | TC-08 tests existentes pasan + reduccion >20 LOC boilerplate eliminado | git revert | DET-5, DET-8 | pending | 5 |
| S5.T4 | Crear `logic/errors.js` con `ERR.{WORKFLOW_*, AUDIT_*, TRANSITION_HISTORY_*, ACTIVITY_*}` + migrar 5 resolvers a usar `ERR.*` | REQ-IMPROVE-06 | developer | S5.T3 | logic/errors.js (NEW) + 5 resolvers | TC-09 error codes centralizados + tests existentes pasan | git revert | DET-5, DET-8 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir resultados, correr tests + lint + medir LOC eliminadas, decidir continue/iterate/escalate/standby | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + 597+8 tests verdes + lint clean + ≥100 LOC eliminadas medidas + DET-23 quality review tier standard | (no aplica) | DET-20, DET-23 | pending | 5 |

### Session 6 — should escalabilidad + seed refactor + tests coverage [tipo: auto] [tier: T2]

> Cierre del ticket. Cubre escalabilidad (cache metadata Prisma, MAX_FIELDS warn), seed refactor (upsertRow helper + createMany batch), y tests coverage (cleanup seeds + ensureIndexes errors). Tras S6.GATE el ticket esta listo para cerrar.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Cache metadata Prisma module-scope con TTL 5min en `polymorphicUpdate.resolveModel` | REQ-IMPROVE-08 | developer | S5.GATE | logic/polymorphicUpdate.resolver.js (lineas 127-148, 224-237) | TC-10 benchmark steady-state cache hit + tests existentes verdes | git revert | DET-5, DET-8 | pending | 6 |
| S6.T2 | `MAX_FIELDS_PER_BATCH = 30` en auditCapture con warn log si N>30 (no error, no truncar) | REQ-IMPROVE-08 | developer | S6.T1 | logic/auditCapture.resolver.js (lineas 601-624) | TC-11 test warn dispara con N>30 + processing continua | git revert | DET-5, DET-8 | pending | 6 |
| S6.T3 | Extraer `upsertRow(modelName, where, data)` helper + migrar `upsertStatuses`/`upsertWorkflows`/`upsertTransitions` del seed | REQ-IMPROVE-06 | developer | S6.T2 | seed/_helpers/upsertRow.js (NEW) + seed/_data-workflow-objects.js | TC-12 seed counts iguales pre/post + ~90 LOC eliminadas | git revert | DET-5, DET-8 | pending | 6 |
| S6.T4 | Migrar seed batches a `createMany skipDuplicates` / `upsert` donde Prisma soporte (statuses, transitions) | REQ-IMPROVE-08 | developer | S6.T3 | seed/_data-workflow-objects.js | TC-13 seed counts iguales + reduccion roundtrips observable | git revert | DET-5, DET-8 | pending | 6 |
| S6.T5 | Tests cleanup seeds (4 ramas v1+v2): DELETE-si-pascal / UPDATE-si-no | REQ-IMPROVE-09 | developer | S6.GATE | tests/integration/cleanup-seeds.test.ts (NEW) | ≥4 tests verdes cubriendo las 4 ramas | git revert | DET-5, DET-7, DET-8 | pending | 6 |
| S6.T6 | Test del path de error de `ensureIndexes` (stub Prisma error en `pg_indexes` query) | REQ-IMPROVE-09 | developer | S6.T5 | tests/integration/ensureIndexes-errors.test.ts (NEW) | ≥1 test cubre fail-path + ensureIndexes loguea warn sin romper | git revert | DET-5, DET-7, DET-8 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T2)** — persistir resultados, correr suite completa final + lint + medir todas las metricas (LOC eliminadas total, queries reducidas seed, typecheck 0), decidir continue/iterate/escalate. Si continue → ticket listo para cerrar | — | reviewer | S6.T1, S6.T2, S6.T3, S6.T4, S6.T5, S6.T6 | ticket | gate persistido + 597+14 tests verdes + lint clean + `vue-tsc` 0 errores mod + ≥150 LOC eliminadas total + DET-23 quality review tier standard | (no aplica) | DET-20, DET-23 | pending | 6 |

## Constraints

- **RULE-platform-003**: convencion PascalCase para entityType en audit/transition history. REQ-IMPROVE-04 enforcea esto a nivel `*Validated` (consistency con changeLog).
- **RULE-platform-006**: PascalCase de objects → camelCase en Prisma client accessor. REQ-IMPROVE-03 documenta el mapping explicito en lugar de transformacion ad-hoc.
- **DET-5** (multi-capa): cada cambio se verifica en codigo + tests. Los REQs incluyen scenarios en multiples capas.
- **DET-7** (test cases ↔ discovery): TC-01 a TC-13 trazan a REQs especificos. Regression (REQ-PRESERVE-01) cubre tests existentes.
- **DET-8** (rollback): todas las tasks tienen `git revert` como rollback. Los refactors son commits atomicos por session.
- **DET-20** (sessions con gate): 6 sessions, cada una con `S{N}.GATE` como ultima task + tier declarado.
- **DET-23** (quality review): cada gate ejecuta quality review tier escalado al tier del session (T1 → light, T2 → standard, T3 → exhaustive).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Prisma client (mods/curriculum-design/node_modules/@prisma/client) | internal | `$transaction({ isolationLevel: 'Serializable' })` + `createMany skipDuplicates` + `upsert` | medium — disponible en version actual; si el target de upgrade Prisma cambia, validar que las APIs siguen disponibles |
| 597 tests existentes (baseline) | internal | Red de regression para todos los refactors. REQ-PRESERVE-01 enforcea baseline. | low — tests estan en repo, baseline conocido |
| `npm test` y `npm run lint` configurados en el mod | internal | Comandos canonicos del mod. Validacion de gates depende de ellos. | low |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion silenciosa en audit chain post-refactor `recordAuditEvent` (S4) | medium | high — bug productivo en compliance/auditing | S3.T2 construye red de tests por handler ANTES de tocar la funcion. S4.GATE es ⚑ fuerte con tier T3 → review humano del diff obligatorio antes de continue |
| Cambio de behavior accidental en observer compartido del badge (S1.T2) | low | medium — UI inconsistente bajo cambios de tema | Contract test del cache API publica (S1.T3) + smoke a11y badge en S1.GATE + REQ-PRESERVE-03 enforcea contract |
| Cleanup seeds afecta datos reales si corre fuera de integration (S6.T5) | low | high — corruption de datos en dev/staging | Tests viven en `tests/integration/`. Solo corren en CI o local con DB de test resetada. NO se incluyen en flujo `npm run dev` ni `npm run sync` |
| Helpers extraidos rompen consumers no detectados (S5.T2, S5.T3) | low | medium — runtime error en path no testeado | Grep cross-mod ANTES de extraer (researcher confirma 2 sites en helpers/publisherLoader, 4 sites en assertExists) + tests verdes en S5.GATE |
| Cache metadata Prisma con TTL incorrecto causa stale data (S6.T1) | low | medium — sync mod muestra metadata desactualizada por hasta 5min | TTL 5min es deliberado (steady state caso comun); cache key incluye modelName, invalidacion explicita disponible para hot paths futuros |

## Open questions

(ninguna — los gaps se resolvieron durante intake-explore. Las decisiones del dev (alcance must+should, S3→S4 acoplado) eliminan ambigüedades)

## Decisions

### DEC-LOCAL-01: alcance = must + should, items could quedan en backlog del ticket

- **Contexto**: el backlog del ticket tiene 6 must + 12 should + 10 could. ¿Que entra en el spec?
- **Drivers**: evitar scope creep en un ticket de tech debt; mantener cierre razonable; could son enforcement/limpieza menor que se hacen mejor focalizados.
- **Opcion elegida**: must + should (S1-S6).
- **Alternativas**: (a) full backlog including could → ticket muy largo y heterogeneo; (b) must only → más tickets para mantener trackeo.
- **Consecuencias**: ticket cierra con 6 critical + 12 refactor/escalabilidad resueltos. Could (C1-C10) quedan en `## Backlog` del ticket para tickets futuros (uno por tema: limpieza, enforcement, etc.).
- **Session**: intake-explore del 2026-05-25 (AskUserQuestion).

### DEC-LOCAL-02: S3 (red de tests recordAuditEvent) precede S4 en el mismo spec

- **Contexto**: refactor de 340 LOC sin red de tests es riesgoso. ¿Construir red en este spec o en sub-ticket bloqueante?
- **Drivers**: ticket autocontenido > overhead de tickets cruzados; la red es pre-condicion natural del refactor.
- **Opcion elegida**: S3 (red) precede S4 (refactor) en el mismo spec. S4.depends_on incluye S3.GATE.
- **Alternativas**: sub-ticket bloqueante separado — agrega friction sin valor; ticket cruzado con dependencias entre sprints.
- **Consecuencias**: el spec es autocontenido. Riesgo: si S3 toma mas tiempo del esperado, S4 se atrasa — pero S4 es deuda no critica para Phase 2.
- **Session**: intake-explore del 2026-05-25 (AskUserQuestion).

### DEC-LOCAL-03: S4 marcada ⚑ fuerte con validation tier T3

- **Contexto**: refactor de 340 LOC en audit chain. ¿Tier auto o ⚑ fuerte?
- **Drivers**: behavior change accidental en audit chain tiene alto impacto (compliance) y baja detectabilidad (test gap historico — antes de S3.T2 no habia tests por handler).
- **Opcion elegida**: ⚑ fuerte con tier T3 → review humano del diff obligatorio antes de continue.
- **Alternativas**: auto con tier T2 (tests + coverage) — insuficiente para detectar behavior change semantico en codigo legacy.
- **Consecuencias**: S4.GATE requiere validacion humana explicita. Tiempo extra estimado: ~30min de review. Beneficio: deteccion temprana de behavior change.
- **Session**: intake-explore del 2026-05-25.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Typecheck errors en codigo del mod | 3 (CompositeSectionForm:138, CompositeSectionView:127, form-feedback.test:181) | 0 | `cd mods/curriculum-design && npx vue-tsc --noEmit 2>&1 \| grep -E "modsComponents/(CompositeSectionTree\|ActivityStatusBadge)\|tests/integration/(form-feedback\|aria-attrs)" \| wc -l` |
| LOC duplicadas en logic/ + seed/ | ~150-200 (helpers, error strings, upsert pattern) | reduccion ≥150 LOC | `git diff --stat` post-S6.GATE |
| MutationObserver instances en pagina con N badges | N | 1 module-scope | devtools console: `getMutationObserverCount()` |
| Queries metadata Prisma por call en steady state polymorphicUpdate | 4 | 0 (cache hit) | benchmark steady-state post-S6.T1 |
| Tests baseline | 597 verdes | 597 + ≥14 nuevos verdes | `npm test` post-S6.GATE |
| Lint baseline | clean | clean (0 nuevos) | `npm run lint` post-S6.GATE |

## Technical reference

### Path canonico de archivos del mod

- Logic resolvers: `mods/curriculum-design/logic/*.resolver.js`
- Helpers (new): `mods/curriculum-design/logic/helpers/*.js`
- Errors module (new): `mods/curriculum-design/logic/errors.js`
- ModsComponents: `mods/curriculum-design/modsComponents/{ActivityStatusBadge,CompositeSectionTree}/`
- Seed: `mods/curriculum-design/seed/_data-workflow-objects.js` + `seed/_helpers/*.js` (new)
- Tests: `mods/curriculum-design/tests/integration/*.test.ts`

### Comandos canonicos del mod

```bash
cd /Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design
source ~/.nvm/nvm.sh && nvm use 22
npm run lint       # baseline clean
npm run typecheck  # equivalent a npx vue-tsc --noEmit
npm test           # 597 verdes baseline
```

### Convencion de naming Prisma (REQ-IMPROVE-03 / REQ-IMPROVE-04)

- Modelos Prisma: `PascalCase` en schema, `camelCase` en client accessor (`prisma.activity`, no `prisma.Activity`).
- `entityType` en audit/transitionHistory: PascalCase canonico (`'Activity'`, `'Workflow'`).
- Mapping explicito de lookup: `AUDITABLE_TYPE_TO_PRISMA_KEY: Record<EntityType, string>` con tabla cerrada.

## Rules discovered

(se llena durante ejecucion — rules emergentes durante execute se crean en `rules/curriculum-design/` y se referencian aqui)

## Bugs found

(se llena si emergen bugs durante execute. Bugs se crean en `bugs/curriculum-design/` y se referencian aqui)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01..09 + REQ-PRESERVE-01..03 pasan
- [ ] **Tests**: 597 + ≥14 nuevos tests verdes (auditCapture-handlers, cleanup-seeds, ensureIndexes-errors)
- [ ] **NFRs**: typecheck 0 mod, lint clean, observers=1 module-scope, ≥150 LOC eliminadas
- [ ] **Rules**: RULE-platform-003 (PascalCase entityType) + RULE-platform-006 (camelCase accessor) respetadas
- [ ] **Integration**: smoke a11y badge + audit chain integrity verificada
- [ ] **Docs**: rules emergentes documentadas en `rules/curriculum-design/` si aplican

## Archiving

Esta spec se archiva cuando el mod sufre un refactor estructural que invalida los patrones aqui establecidos (helpers, errors.js, observer compartido). Usar `/dkc-archive-spec SPEC-014-curriculum-design-tech-debt-cleanup-mod "razon"`.
