---
id: SPEC-object-manager-hu1-prefillfrom-createinstance
project: up1
ticket: TICKET-036
status: done
---

# SPEC — HU-1: `prefillFrom` en `createInstance` (primitivo transversal de clonacion)

# SPEC — HU-1: `prefillFrom` en `createInstance` (primitivo transversal de clonacion)

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle tecnico vive en Requirements y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: que el resolver generico de creacion `createInstance` (unico punto CRUD de creacion, `instance.resolver.js:2175`) pre-llene una instancia nueva desde otra del mismo tipo. La directiva viaja dentro de `data.prefillFrom.source` (mecanismo existente desde 033/HU-0d — ver DEC-LOCAL-02; sin cambio de SDL). Reusa validacion, RBAC y hooks existentes. Primer ladrillo de la capacidad de clonacion de SP3 (epica UPONE-1206); HU-2/HU-3/HU-6 se construyen encima.

**Decisiones criticas que necesitan tu OK** (racional en secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | HU-1 **extiende `data.prefillFrom` existente**, sin arg GraphQL (DEC-LOCAL-02) | Descubierto en S1: `prefillFrom` ya existe (033/HU-0d) dentro de `data`, clonando solo hijos. HU-1 agrega el pre-llenado de campos propios. Agregar un arg GraphQL competiria con lo existente. Sin cambio de SDL. |
| 2 | El lookup usa el **client Prisma tenant-scoped** (REQ-04 / DEC-LOCAL-01) | Tenancy es por DB/schema per-tenant, no por columna `tenantId`. `context.prisma` ya aisla; no se agrega `tenantId` al where (L2). |
| 3 | Gating por **presencia de `prefillFrom.source`** (REQ-01) | Garantiza que los ~64 callers existentes (sin prefillFrom) vean comportamiento identico. La rama `deepClone` de 033 se preserva intacta. |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en ~64 callers existentes** → S2 incluye un gate ⚑ fuerte de regression: tests que llaman `createInstance` SIN `prefillFrom` y verifican comportamiento identico. El guard vive entero dentro de `if (prefillFrom?.source)`.
- **Fuga cross-tenant** → REQ-04: el lookup usa el `context.prisma` tenant-scoped (DB/schema per-tenant); un source de otro tenant no es alcanzable → `PREFILL_SOURCE_NOT_FOUND`.
- **Guard que entra con `prefillFrom = {}` vacio** → condicion `prefillFrom?.source` (no `prefillFrom != null`); test explicito (TC-02) en la suite.

**Que NO se hace**: deep-clone de relaciones/hijos polimorficos (HU-2/HU-0d), metadata `createdVia:"prefill"` (HU-6), lectura de `prefillFrom` declarado en el JSON del objeto (HU-2). Solo el param explicito de la mutation.

**Tamaño estimado**: 3 sessions (~1 SP). La mas riesgosa es **S2** (regression de callers) — ahi se demuestra el invariante.

**Como vas a saber que funciona**: (a) crear un objeto pasando `prefillFrom:{sourceId}` produce una instancia con los campos del source salvo id/timestamps/createdBy; (b) los campos explicitos pisan a los del source; (c) source inexistente o de otro tipo → error claro; (d) las llamadas existentes sin `prefillFrom` no cambian en nada.

## Purpose

Exponer un primitivo de clonacion generico en `createInstance` (`object-manager`): cuando `data.prefillFrom.source` esta presente, el resolver pre-llena `data` con los campos de un objeto fuente del mismo `objectType`, combinando con los campos explicitos (explicit > source > exclude). Actor: dev de mod / consumidor del API GraphQL que necesita "duplicar desde". Valor: habilita clonacion reusable para todos los tipos sin resolver custom, manteniendo un unico punto CRUD con su validacion/RBAC/hooks.

## Requirements

### REQ-01: Pre-llenado de campos propios via `data.prefillFrom.source` (gating estricto)

> **Que cambia**: pasando `data.prefillFrom = { source: <id> }`, la instancia nueva hereda los campos del source; sin esa directiva, la llamada se comporta exactamente como hoy.
> **Por que**: `createInstance` tiene ~64 callers; el cambio debe ser invisible para ellos.

> **DESCUBRIMIENTO S1 (L1) — pivote vs intake**: `prefillFrom` YA existe en el resolver (`instance.resolver.js:2185`), introducido por 033/HU-0d fase 2 (REQ-06). Vive **dentro de `data`** (no es arg GraphQL), shape `{ source, deepClone[], exclude[] }`, y hoy solo clona **hijos polimorficos** post-create. HU-1 NO agrega un arg GraphQL ni cambia el SDL: extiende el mecanismo existente para tambien pre-llenar los **campos propios** del source. Ver DEC-LOCAL-02.

El sistema MUST, cuando `data.prefillFrom.source` esta presente, pre-llenar `data` con los campos propios del registro fuente. Si `prefillFrom` ausente o `prefillFrom.source` `null`/ausente, el codigo de pre-llenado MUST NOT ejecutarse y el flujo MUST ser identico al actual.

<details><summary>Scenarios de validacion</summary>

#### Scenario: caller existente sin prefillFrom (gating)
- **GIVEN** un caller que llama `createInstance(objectType, data)` sin `data.prefillFrom`
- **WHEN** corre el resolver
- **THEN** el resultado y los side-effects (hooks, validacion) son identicos al comportamiento pre-cambio

#### Scenario: prefillFrom sin source no activa el pre-llenado
- **GIVEN** `data.prefillFrom = { deepClone: [...] }` (sin `source`)
- **WHEN** el resolver evalua el guard `prefillFrom?.source`
- **THEN** el guard de pre-llenado de campos NO entra (la rama de deepClone de hijos sigue su curso normal de 033)

</details>

### REQ-02: Validacion de existencia y tipo del source

> **Que cambia**: si el `sourceId` no existe (en tu tenant) o es de otro tipo de objeto, recibes un error claro en vez de datos basura.
> **Por que**: pre-llenar desde un objeto inexistente o de otro tipo produciria una instancia corrupta.

El sistema MUST validar que el source identificado por `prefillFrom.source` existe en la tabla del `objectType` solicitado. Si no existe → error `PREFILL_SOURCE_NOT_FOUND`.

> **Semantica de TYPE_MISMATCH bajo tablas per-tipo (L3)**: cada `objectType` es su propia tabla Prisma (`prisma[modelName]`), sin discriminador `objectType` en el row. Por lo tanto un `source` de otro tipo simplemente NO existe en la tabla del target → resuelve como `PREFILL_SOURCE_NOT_FOUND`. `PREFILL_SOURCE_TYPE_MISMATCH` se reserva para el caso detectable: el `objectType` solicitado no resuelve a un modelo Prisma valido (ya cubierto por el error `No Prisma model for objectType` existente) o el row expone un discriminador inconsistente. El error queda definido en el contrato; su disparo distinto de NOT_FOUND es raro por arquitectura. Ver OQ-1.

<details><summary>Scenarios de validacion</summary>

#### Scenario: source inexistente
- **GIVEN** `prefillFrom.source` que no corresponde a ningun registro de la tabla del `objectType`
- **WHEN** corre el lookup `prisma[modelName].findUnique`
- **THEN** se lanza `PREFILL_SOURCE_NOT_FOUND` y no se crea nada

#### Scenario: source de otro tipo (cross-type)
- **GIVEN** un id que pertenece a otro `objectType` (otra tabla)
- **WHEN** se busca en la tabla del `objectType` solicitado
- **THEN** no se encuentra → `PREFILL_SOURCE_NOT_FOUND` (cross-type colapsa a NOT_FOUND por tablas per-tipo, L3)

</details>

### REQ-03: Combinacion de campos (explicit > source > exclude)

> **Que cambia**: la instancia nueva hereda los campos del source, pero lo que pongas explicito en `data` manda; nunca hereda id ni campos de auditoria.
> **Por que**: el caso de uso es "como este, pero con estos cambios" — y la identidad/auditoria debe ser fresca.

El sistema MUST combinar los campos del source (excluyendo por default `id`, `createdAt`, `updatedAt`, `createdBy`) con los campos explicitos de `data`, donde los explicitos sobreescriben a los del source.

<details><summary>Scenarios de validacion</summary>

#### Scenario: prefill basico
- **GIVEN** un source con campos `{name, status, foo}` y `data = {}`
- **WHEN** se combina
- **THEN** la instancia nueva tiene `{name, status, foo}` del source y un `id`/timestamps frescos

#### Scenario: override explicito
- **GIVEN** un source con `{name: "A", status: "draft"}` y `data = {name: "B"}`
- **WHEN** se combina
- **THEN** la instancia nueva tiene `name: "B"` (explicit pisa) y `status: "draft"` (heredado)

#### Scenario: exclude de identidad/auditoria
- **GIVEN** un source con `id`, `createdAt`, `updatedAt`, `createdBy` poblados
- **WHEN** se combina
- **THEN** ninguno de esos 4 campos se copia del source a la instancia nueva

</details>

### REQ-04: El lookup del source respeta el aislamiento multi-tenant

> **Que cambia**: solo se pre-llena desde objetos del tenant del caller; un id de otro tenant no es alcanzable.
> **Por que**: el aislamiento multi-tenant no debe romperse al leer el source.

El sistema MUST resolver el source usando `context.prisma` (el client Prisma **tenant-scoped** del request), igual que el resto de lecturas del resolver (`getInstance` usa `prisma[modelName].findUnique`). NO debe usar un client global ni un id sin scope.

> **Realidad de tenancy (L2)**: object-manager aisla por **client Prisma tenant-scoped** (dirs `prisma/{TENANT}/`), NO por columna `tenantId` en tabla compartida. Por eso `prisma[modelName].findUnique({where:{id}})` con el `prisma` del context ya es tenant-safe — no hay que agregar `tenantId` al `where`. Un id de otro tenant vive en otra DB/schema, inalcanzable desde el client del caller → NOT_FOUND.

<details><summary>Scenarios de validacion</summary>

#### Scenario: el lookup usa el client tenant-scoped
- **GIVEN** un caller con `context.prisma` resuelto a su tenant
- **WHEN** corre `prisma[modelName].findUnique({where:{id: source}})`
- **THEN** solo encuentra registros del propio tenant (un id de otro tenant → NOT_FOUND)

</details>

### REQ-05: Limite con el deep-clone de hijos (no se duplica 033)

El pre-llenado de HU-1 MUST cubrir solo los **campos propios** (escalares) del source. El deep-clone de **hijos polimorficos** (`prefillFrom.deepClone`) ya esta implementado por 033/HU-0d fase 2 y MUST NOT re-implementarse ni alterarse aqui. Ambas ramas coexisten en el mismo objeto `prefillFrom`: `source` (+ `exclude`) gobierna el pre-llenado de campos (HU-1); `deepClone` gobierna la clonacion de hijos (033). HU-1 MUST NOT romper la rama `deepClone` existente.

> REQ de limite de scope — sin callout (auto-explicativo).

## Resolvers / Artifact (METASPEC-objects-graphql-resolver)

> **SIN cambio de SDL** (pivote S1, L1). `prefillFrom` NO es un argumento GraphQL: viaja dentro de `data: JSON!` (que es opaco al schema). El SDL de `createInstance(objectType: String!, data: JSON!): InstanceResult` queda **intacto**. El cambio es 100% en el resolver.

**Shape de `data.prefillFrom`** (establecido por 033, extendido por HU-1):

| key | type | usado por | description |
|-----|------|-----------|-------------|
| source | ID | HU-1 (036) + 033 | Id del registro fuente del mismo `objectType`. HU-1 lo usa para pre-llenar campos propios; 033 para clonar hijos |
| exclude | [string] | HU-1 (036) + 033 | Campos a excluir. HU-1 lo suma al default exclude del pre-llenado de campos |
| deepClone | [string] | 033/HU-0d | Aliases de hijos polimorficos a clonar (post-create). NO lo toca HU-1 |

**Auth**: sin cambio — `withObjectAuth('create', ...)` envuelve el resolver y lee solo `objectType`; insensible al contenido de `data`.

## Tasks

### Session 1 — resolver + SDL prefillFrom [tipo: auto] [tier: T2]

parallel_groups: []  <!-- tasks secuenciales (SDL → resolver → tests); sin paralelizacion -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Confirmar mecanismo existente `data.prefillFrom` (033) + ubicar punto de insercion del pre-llenado de campos (pre `prepareLayoutCreationData`, con `modelName` resuelto). Sin cambio de SDL | REQ-01, REQ-05 | developer | — | object-manager/src/graphql/resolvers/instance.resolver.js:2185 | lectura confirmada; SDL intacto | n/a (read-only) | DET-5, DET-11 | pending | 1 |
| S1.T2 | Implementar pre-llenado en resolver: si `prefillFrom?.source`, lookup `prisma[modelName].findUnique` (tenant-scoped), error `PREFILL_SOURCE_NOT_FOUND`, merge `{...prefilled, ...data}` con default exclude + `prefillFrom.exclude`. Preservar rama `deepClone` de 033 | REQ-01, REQ-02, REQ-03, REQ-04 | developer | S1.T1 | object-manager/src/graphql/resolvers/instance.resolver.js:2185-2206 | TC-01..TC-04 unit verdes | git revert del bloque pre-llenado | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T3 | Tests basicos (prefill basico + 1 error) verdes | REQ-02, REQ-03 | developer | S1.T2 | object-manager/src/graphql/resolvers/__tests__/instance.createInstance.prefillFrom.test.js | vitest run del archivo, verde | borrar archivo de test nuevo | DET-7 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): quality review light, persistir, decidir continue | — | reviewer | S1.T3 | tickets/ticket-036.md | gate persistido + tests S1 verdes | — | DET-20, DET-23, DET-27, DET-29 | pending | 1 |

### Session 2 — tests exhaustivos + regression [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- regression depende de la suite completa; secuencial -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Tests exhaustivos: override explicito, cross-type rechazado, source inexistente, source de otro tenant, exclude de auditoria | REQ-02, REQ-03, REQ-04 | developer | S1.GATE | object-manager/src/graphql/resolvers/__tests__/instance.createInstance.prefillFrom.test.js | vitest --coverage, TC-02..TC-07 verdes | borrar tests nuevos | DET-7 | pending | 2 |
| S2.T2 | Regression: `createInstance` SIN `prefillFrom` y con `prefillFrom={}` vacio → comportamiento identico al baseline | REQ-01 | reviewer | S2.T1 | object-manager/src/graphql/resolvers/__tests__/instance.createInstance.prefillFrom.test.js | vitest, TC-01/TC-08 verdes; suite existente de createInstance sin nuevos fallos | — | DET-7, DET-13 | pending | 2 |
| S2.T3 | Verificar `includeRelations:true` es no-op (sin error, sin deep-clone) | REQ-05 | developer | S2.T1 | object-manager/src/graphql/resolvers/__tests__/instance.createInstance.prefillFrom.test.js | vitest, TC-09 verde | — | DET-7 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2, ⚑ fuerte): quality review standard, regression sin fallos nuevos, decidir continue | — | reviewer | S2.T2, S2.T3 | tickets/ticket-036.md | gate persistido + cero regression en callers | — | DET-20, DET-23, DET-27, DET-29 | pending | 2 |

### Session 3 — cierre [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Quality review final + commits granulares DET-27 (object-manager UPONE-1206 + deckard up1-sp3-w2) | — | reviewer | S2.GATE | object-manager/, deckard/projects/up1/ | suite verde, commits con prefijo UPONE-1207-S{N} | git reset commits locales | DET-13, DET-27 | pending | 3 |
| **S3.GATE** | Gate de cierre Session 3 (tier T1): validacion reforzada DET-30, teach-close (DET-22), status closed | — | reviewer | S3.T1 | tickets/ticket-036.md | teach-close.html validado + acceptance checkpoints | — | DET-20, DET-22, DET-30 | pending | 3 |

## Technical reference

- **Resolver**: `object-manager/src/graphql/resolvers/instance.resolver.js:2145` — `createInstance(objectType, data)`. Dispatch dinamico `prisma[objectType]`. Etapas compartidas: `prepareLayoutCreationData` (:2161), validacion JSON (:2307), lookup `objectDefinition` (:2313).
- **SDL**: `object-manager/src/graphql/typeDefs/static.js:1145-1150`.
- **RBAC**: `object-manager/src/middleware/withAuth.js:122,129` — `withObjectAuth` lee solo `args.objectType`.
- **Tenant**: el patron de filtrado por `context.tenantId` debe replicarse del resto de queries del resolver (verificar shape exacto en S1.T2 — `findFirst({where:{id, tenantId}})` vs composite). Ver Open question OQ-2.
- **Campo de tipo del row**: el pseudocodigo del intake asume `source._objectType`; confirmar el nombre real del discriminador en S1.T2 (ver OQ-1).

## Constraints

- **RULE-dev-004**: codigo core → rama de la epica (`UPONE-1206`); merge a develop gated por team up1, no por el cierre DKC.
- **critical_rule up1 (config.yaml)**: "Toda query DEBE filtrar por tenantId" → REQ-04.
- **DEC-LOCAL-01** (abajo): tenant filtering en el lookup del source.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-object-manager-track-0-prerequisitos-clonacion (TICKET-033) | internal | HU-0j config-storage cerrado; habilita lectura futura de `prefillFrom` declarado (HU-2). El param basico no lo requiere en runtime | bajo — 033 cerrado |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion en ~64 callers existentes | medium | high | Guard estricto `if (prefillFrom?.sourceId)`; gate ⚑ fuerte S2 con tests de regression sin el param |
| Fuga cross-tenant via sourceId | medium | high | REQ-04: lookup filtra por tenantId; source ajeno → NOT_FOUND |
| Guard entra con `prefillFrom={}` | low | high | Condicion sobre `?.sourceId`, no sobre `prefillFrom`; TC explicito |
| Nombre real del discriminador de tipo difiere del pseudocodigo | medium | medium | OQ-1: verificar en S1.T2 antes de cerrar la validacion de tipo |

## Open questions

- **OQ-1 (RESUELTA en S1, L3)**: el tipo es la tabla (`prisma[modelName]`), sin discriminador en el row. Cross-type colapsa a `PREFILL_SOURCE_NOT_FOUND`. `PREFILL_SOURCE_TYPE_MISMATCH` queda definido en el contrato pero raramente disparable por arquitectura (ver REQ-02). **Residual para revision del dev al cierre**: ¿basta NOT_FOUND para cross-type, o se quiere un check explicito de tipo (mas costoso)? Decision pragmatica tomada: NOT_FOUND cubre cross-type.
- **OQ-2 (RESUELTA en S1, L2)**: tenancy por client Prisma tenant-scoped del context, no por columna. El lookup es `prisma[modelName].findUnique({where:{id}})` con el `prisma` del context — sin `tenantId` en el where.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: El lookup del source usa el client tenant-scoped (no where tenantId)
- **Contexto**: el pseudocodigo del intake hacia `findUnique({where:{id}})` sin considerar tenancy.
- **Drivers**: aislamiento multi-tenant; critical_rule "toda query respeta tenant".
- **Opcion elegida**: usar `context.prisma` (client Prisma tenant-scoped por request). El lookup `prisma[modelName].findUnique({where:{id}})` ya es tenant-safe sin agregar `tenantId` al where (L2).
- **Alternativas**: agregar `tenantId` al where — descartada: las tablas no tienen esa columna; tenancy es por DB/schema (dirs `prisma/{TENANT}/`).
- **Consecuencias**: implementacion mas simple; aislamiento garantizado por el client.
- **Session**: S1 (verificado contra `getInstance` `instance.resolver.js:2133`).

### DEC-LOCAL-02: HU-1 extiende `data.prefillFrom` existente, NO agrega arg GraphQL
- **Contexto**: el intake asumio `prefillFrom` como arg GraphQL nuevo. En S1 se descubrio que `prefillFrom` ya existe dentro de `data` (033/HU-0d fase 2, REQ-06) con shape `{source, deepClone[], exclude[]}`, clonando solo hijos polimorficos.
- **Drivers**: un arg GraphQL `prefillFrom` competiria con el `data.prefillFrom` existente → dos mecanismos en conflicto; el shape `{source, exclude, deepClone}` ya es la convencion establecida y consumida por el hook del mod CD.
- **Opcion elegida**: HU-1 extiende el mecanismo existente — agrega el pre-llenado de campos propios usando `prefillFrom.source` + `prefillFrom.exclude`, dejando intacta la rama `deepClone`. Sin cambio de SDL.
- **Alternativas**: (a) arg GraphQL `prefillFrom: PrefillFromInput` — descartada por conflicto con `data.prefillFrom`; (b) un campo nuevo `prefillFields` separado — descartada por fragmentar la directiva de clonacion en dos keys.
- **Consecuencias**: spec reorientado (REQ-01, Resolvers, Tasks S1); S1.T1 deja de ser cambio de SDL. Coherencia con 033. El pivote se reporto al dev en stream (super autopilot).
- **Session**: S1.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-05 pasan
- [ ] **Tests**: TC-01..TC-09 escritos y verdes
- [ ] **Regression**: callers sin `prefillFrom` sin cambios (gate ⚑ fuerte S2)
- [ ] **Multi-tenant**: source de otro tenant → NOT_FOUND (REQ-04)
- [ ] **Rules**: gating estricto + tenant filtering respetados
- [ ] **Docs**: teach-close generado (DET-22)
