---
id: SPEC-object-manager-hu2-prefillfrom-declarative
project: up1
ticket: TICKET-037
status: done
---

# SPEC — HU-2: `prefillFrom` declarativo en el JSON del objeto (codegen valida + persiste; resolver lo lee)

# SPEC — HU-2: `prefillFrom` declarativo en el JSON del objeto (codegen valida + persiste; resolver lo lee)

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle tecnico vive en Requirements y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: que un dev de mod declare en el JSON del objeto (`metadata.prefillFrom = { exclude, deepClone }`) la **politica de clonacion** de ese tipo — que campos excluir y que hijos arrastrar — sin escribir codigo. HU-2 NO construye prefill desde cero: cabe sobre primitivos ya entregados este sprint (HU-1/036 = merge de campos + exclude; HU-0d/033 = deepClone polimorfico; HU-0j/033 = columna `versioningConfig` + sync function). Verificado contra el codigo real de `UPONE-1206`, el trabajo se concentra en **3 costuras** que el sprint dejo abiertas a proposito + 1 rama nueva.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | Abrir el gate de persistencia: `(versioning \|\| prefillFrom)` en vez de solo `versioning` (DEC-LOCAL-01) | 033 dejo el gate cerrado a proposito (comentario en `generatePrismaSchema.js:2484`: *"prefillFrom standalone se contempla en HU-2"*). Sin abrirlo, un objeto con solo `prefillFrom` persiste `null` y la config se pierde en silencio. Es el cambio central. |
| B | Precedencia declarativo/runtime: declarativo = politica (`exclude`/`deepClone`), runtime = target (`source`); union de listas; **activacion SIEMPRE gated por `source` runtime** (DEC-LOCAL-02) | El intake de 037 no especificaba el merge. Si la config declarativa activara prefill por si sola, los ~64 callers de `createInstance` se romperian. Gatear por `source` preserva el invariante de HU-1. |
| C | `deepClone` de relacion Prisma directa entra en alcance pero marcada como candidata a recorte (DEC-LOCAL-03) | El AC lo pide literal, pero el unico consumidor SP3 (Activity→CurricularSection) es polimorfico, ya cubierto por 033. La rama directa es net-new y especulativa. |
| D | Validador `prefillFrom` nuevo en codegen, analogo a `validate-polymorphic-children.js`, corriendo **despues** de parsear `polymorphicChildren` (DEC-LOCAL-04) | Hoy `prefillFrom` se persiste opaco sin validar. Validar que `deepClone` resuelve a alias o relacion exige conocer los alias ya parseados → dependencia de orden. |

**Riesgos principales y como los mitigamos**:

- **Regresion codegen en 16+ tenants** (HU-2 vuelve a tocar `syncVersioningConfigToRegistry`, transversal) → REQ-PRESERVE-06 + gate ⚑ fuerte S1: `git diff prisma/*/schema.prisma` debe ser vacio en objetos sin `prefillFrom`.
- **Regresion en ~64 callers de `createInstance`** (HU-2 vuelve a tocar el resolver) → REQ-PRESERVE-06 + gate ⚑ fuerte S2: activacion gated por `source`; callers sin `data.prefillFrom.source` se comportan identico aunque el objeto declare config.
- **`deepClone` apunta a algo que no es alias ni relacion** → REQ-02: el codegen lo rechaza en build-time con error claro, antes de runtime.

**Que NO se hace**: reimplementar el merge de campos (036) ni el deepClone polimorfico/recursivo (033) — se reusan; persistir `versioning` (HU-4/TICKET-038); leer `versioning` en runtime (HU-3). HU-2 solo cabea `prefillFrom` declarativo.

**Tamaño estimado**: 4 sessions (~2 SP). Las dos mas riesgosas son **S1** (regresion codegen) y **S2** (regresion de callers) — ahi se demuestran los dos invariantes.

**Como vas a saber que funciona**: (a) un objeto con `metadata.prefillFrom` (sin `versioning`) tiene `versioningConfig.prefillFrom` poblado tras `npm run codegen`; (b) clonar pasando `data.prefillFrom.source` aplica el `exclude`/`deepClone` declarado aunque no se repita en el param; (c) un `deepClone` invalido falla el codegen; (d) un `createInstance` sin `source` no cambia en nada; (e) un objeto sin `prefillFrom` declarado usa solo el default exclude.

## Purpose

Cablear la **capa declarativa** del prefill de clonacion en `object-manager`. (1) El codegen valida `metadata.prefillFrom` y lo persiste a `core_ObjectDefinition.versioningConfig.prefillFrom` aunque el objeto no declare `versioning`. (2) El resolver `createInstance`, cuando recibe un `source` runtime, lee la politica declarativa del registry y la combina con el param. Actor: dev de mod que quiere gobernar la clonacion de un tipo por configuracion, sin resolver custom. Valor: completa la capacidad de clonacion reusable de SP3 (epica UPONE-1206) sobre los ladrillos de HU-1/HU-0d/HU-0j.

## Requirements

### REQ-01: Persistencia del bloque `prefillFrom` standalone (gate de codegen abierto)

> **Que cambia**: declarar `metadata.prefillFrom` en el JSON ahora persiste al registry aunque el objeto no declare `metadata.versioning`. Hoy se pierde en silencio.
> **Por que**: 033 cerro el gate a proposito (`versioning ? … : null`) y difirio el `prefillFrom` standalone a HU-2.

El sistema MUST persistir `versioningConfig` cuando el objeto declara `metadata.versioning` **O** `metadata.prefillFrom`. El shape persistido MUST ser `{ versioning: <obj|null>, prefillFrom: <obj|null> }`. Si ninguno de los dos esta presente, `versioningConfig` MUST ser `null` (sin cambio respecto a hoy). La idempotencia del sync MUST preservarse.

<details><summary>Scenarios de validacion</summary>

#### Scenario: prefillFrom standalone (caso central HU-2)
- **GIVEN** un objeto con `metadata.prefillFrom` y SIN `metadata.versioning`
- **WHEN** se ejecuta `npm run codegen`
- **THEN** su fila en `core_ObjectDefinition` tiene `versioningConfig: { versioning: null, prefillFrom: {...} }`

#### Scenario: ninguno de los dos bloques
- **GIVEN** un objeto sin `versioning` ni `prefillFrom`
- **WHEN** codegen
- **THEN** `versioningConfig: null` (comportamiento identico a hoy)

#### Scenario: versioning solo (regresion de 033)
- **GIVEN** un objeto con `versioning` y sin `prefillFrom`
- **WHEN** codegen
- **THEN** `versioningConfig: { versioning: {...}, prefillFrom: null }` (sin regresion vs 033)

</details>

### REQ-02: Validacion del bloque `prefillFrom` en codegen

> **Que cambia**: si declaras un `prefillFrom` malformado (p.ej. `exclude` que no es lista, o `deepClone` que apunta a algo inexistente), el codegen falla con un error claro en vez de persistir basura.
> **Por que**: hoy `prefillFrom` se persiste opaco sin validar; un `deepClone` invalido recien explotaria en runtime.

El sistema MUST validar `metadata.prefillFrom` en build-time: `exclude` (si presente) MUST ser array de strings; `deepClone` (si presente) MUST ser array de strings; cada entry de `deepClone` MUST resolver a (a) un alias declarado en `metadata.polymorphicChildren` del mismo objeto, o (b) una relacion Prisma directa del objeto. Un bloque invalido MUST producir error de codegen indicando archivo + campo. La validacion MUST correr **despues** de parsear `polymorphicChildren` (para conocer los aliases declarados).

<details><summary>Scenarios de validacion</summary>

#### Scenario: deepClone a alias polimorfico valido
- **GIVEN** `prefillFrom.deepClone: ["sections"]` con `sections` declarado en `polymorphicChildren`
- **WHEN** codegen
- **THEN** pasa OK

#### Scenario: deepClone a relacion Prisma directa
- **GIVEN** `prefillFrom.deepClone: ["items"]` con `items` siendo relacion 1-N directa del objeto
- **WHEN** codegen
- **THEN** pasa OK

#### Scenario: deepClone invalido (ni alias ni relacion)
- **GIVEN** `prefillFrom.deepClone: ["foo"]` con `foo` que no es alias ni relacion
- **WHEN** codegen
- **THEN** falla con error: `prefillFrom.deepClone "foo" no es alias de polymorphicChildren ni relacion en <archivo>`

#### Scenario: exclude malformado
- **GIVEN** `prefillFrom.exclude: "currentStatusId"` (string, no array)
- **WHEN** codegen
- **THEN** falla con error indicando que `exclude` debe ser array de strings

</details>

### REQ-03: El resolver lee `prefillFrom` declarado del registry y lo combina con el runtime

> **Que cambia**: al clonar (pasando `data.prefillFrom.source`), la instancia hereda el `exclude`/`deepClone` declarado en el JSON del tipo aunque no lo repitas en la llamada. Lo que pongas en el param se suma a lo declarado.
> **Por que**: hoy el resolver solo mira `data.prefillFrom`; nadie lee la config del registry — la capa declarativa no tiene efecto en runtime.

El sistema MUST, cuando `data.prefillFrom.source` esta presente, leer `objectDefinition.versioningConfig.prefillFrom` del registry y combinarlo con el `data.prefillFrom` runtime: `exclude` efectivo = union(declarativo, runtime); `deepClone` efectivo = union(declarativo, runtime). El `source` proviene SIEMPRE del runtime (nunca del declarativo). La config declarativa MUST NOT activar el prefill por si sola: sin `data.prefillFrom.source`, el flujo MUST ser identico al actual (preserva HU-1).

<details><summary>Scenarios de validacion</summary>

#### Scenario: politica declarativa aplicada con source runtime
- **GIVEN** un objeto con `metadata.prefillFrom.exclude: ["versionLabel"]` y un caller `createInstance(type, { prefillFrom: { source: X } })`
- **WHEN** corre el resolver
- **THEN** la instancia hereda del source todos los campos salvo el default exclude + `versionLabel` (heredado del declarativo)

#### Scenario: union de excludes
- **GIVEN** declarativo `exclude: ["a"]` y runtime `exclude: ["b"]`
- **WHEN** se combina
- **THEN** el exclude efectivo contiene default + `a` + `b`

#### Scenario: config declarativa NO auto-activa (preserva 64 callers)
- **GIVEN** un objeto con `metadata.prefillFrom` declarado y un caller `createInstance(type, data)` SIN `data.prefillFrom.source`
- **WHEN** corre el resolver
- **THEN** no se ejecuta ningun pre-llenado; resultado y side-effects identicos al baseline

</details>

### REQ-04: `deepClone` aplica alias polimorfico (reuso) + relacion Prisma directa (nuevo)

> **Que cambia**: `deepClone` ahora arrastra tanto hijos polimorficos (via alias, como ya hacia 033) como hijos por relacion Prisma directa (1-N por FK normal).
> **Por que**: el AC pide ambas formas; hoy solo existe la polimorfica.

El sistema MUST resolver cada entry de `deepClone` (declarativo o runtime) distinguiendo: si coincide con un alias de `polymorphicChildren` → delegar al helper polimorfico existente (`deep-clone-polymorphic.js`, HU-0d/033) con remap recursivo — NO reimplementar. Si coincide con una relacion Prisma directa → clonar los hijos por la FK directa con nuevo `ownerId`/FK al record clonado. El mapa `oldId→newId` (shape `{newId,type}`, establecido en 033) MUST mantenerse coherente entre ambas ramas.

<details><summary>Scenarios de validacion</summary>

#### Scenario: deepClone polimorfico (reuso 033)
- **GIVEN** `deepClone: ["sections"]` (alias polimorfico) clonando un Activity con 5 CurricularSections jerarquicas
- **WHEN** corre el resolver
- **THEN** las 5 secciones se clonan con jerarquia preservada (delega al helper de 033) y el mapa se expone

#### Scenario: deepClone relacion directa (nuevo)
- **GIVEN** `deepClone: ["items"]` con `items` relacion 1-N directa del objeto fuente
- **WHEN** corre el resolver
- **THEN** los hijos por FK directa se clonan apuntando al record nuevo

#### Scenario: alias y relacion mezclados
- **GIVEN** `deepClone: ["sections", "items"]` (uno polimorfico, uno directo)
- **WHEN** corre el resolver
- **THEN** ambas ramas se procesan; el mapa `oldId→newId` queda consistente

</details>

### REQ-05: Sin `prefillFrom` declarado → solo default exclude

> REQ de limite — auto-explicativo, sin callout (DET-24 escape).

El sistema MUST, cuando el objeto no declara `metadata.prefillFrom` y el caller pasa `data.prefillFrom.source`, aplicar unicamente el default exclude (`id, createdAt, updatedAt, createdBy`) mas el `exclude` runtime si lo hubiera. No MUST asumir ningun `exclude`/`deepClone` adicional.

### REQ-PRESERVE-06: Cero regresion en codegen multi-tenant y en los callers de `createInstance`

> **Que cambia**: nada para quien no usa `prefillFrom`. Regenerar los 16+ tenants no altera ningun schema de objeto sin la key, y los ~64 callers existentes de `createInstance` siguen comportandose igual.
> **Por que**: HU-2 reabre las dos superficies transversales que 033 y 036 ya estabilizaron.

El sistema MUST regenerar `prisma/*/schema.prisma` de los 16+ tenants sin cambios funcionales en objetos que no declaran `prefillFrom` (heredado de 033/REQ-04). El sistema MUST preservar el comportamiento de `createInstance` SIN `data.prefillFrom.source` identico al baseline (heredado de 036/REQ-01).

<details><summary>Scenarios de validacion</summary>

#### Scenario: git diff vacio (regresion codegen)
- **GIVEN** REQ-01 y REQ-02 implementados
- **WHEN** `npm run codegen` + `git diff prisma/*/schema.prisma`
- **THEN** diff vacio en objetos sin `prefillFrom`; smoke `select 1 from core_ObjectDefinition` OK en UPU

#### Scenario: callers sin source (regresion resolver)
- **GIVEN** la suite existente de `createInstance`
- **WHEN** se corre tras REQ-03/REQ-04
- **THEN** cero fallos nuevos; callers sin `prefillFrom` sin cambios

</details>

### REQ-07: Documentacion de la capacidad declarativa

> **Que cambia**: queda documentado para futuros adoptantes como declarar `prefillFrom` y como interactua con el param runtime y con `polymorphicChildren`.
> **Por que**: la capacidad es para devs de mod que no estuvieron en el sprint.

El sistema MUST documentar el bloque `prefillFrom` declarativo en `object-manager/docs/prefill-capability.md`: shape, default exclude, relacion con `polymorphicChildren`, precedencia declarativo/runtime, y ejemplo.

## Resolvers / Artifact (METASPEC-graphql-resolver + METASPEC-json-object)

> **SIN cambio de SDL**. `prefillFrom` declarativo vive en `metadata` del JSON del objeto (artefacto JSON-object) y en la columna `versioningConfig` del registry (ya creada por HU-0j). El consumo runtime es 100% interno al resolver `createInstance` — el SDL `createInstance(objectType: String!, data: JSON!): InstanceResult` queda intacto.

**Shape de `metadata.prefillFrom`** (artefacto JSON-object, declarativo):

| key | type | description |
|-----|------|-------------|
| exclude | [string] | Campos a excluir del prefill. Se SUMA al default `id, createdAt, updatedAt, createdBy` y al `exclude` runtime |
| deepClone | [string] | Aliases de hijos a clonar: alias de `polymorphicChildren` (HU-0d) o relacion Prisma directa |

**Shape persistido en `core_ObjectDefinition.versioningConfig`** (registry, HU-0j):

```json
{ "versioning": null, "prefillFrom": { "exclude": ["versionLabel"], "deepClone": ["sections"] } }
```

**Auth**: sin cambio — `withObjectAuth('create', ...)` lee solo `objectType`.

## Tasks

### Session 1 — gate de persistencia + validacion codegen [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []  <!-- T1 (gate) → T2 (validador, depende del orden de parse) → T3/T4 secuencial -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Abrir el gate de persistencia en `syncVersioningConfigToRegistry`: persistir cuando `versioning` O `prefillFrom` esten presentes (hoy gatea solo en `versioning`). Shape `{ versioning, prefillFrom }` con `null` por el que falte. Preservar idempotencia | REQ-01 | developer | — | object-manager/src/services/codegen/generatePrismaSchema.js:2478 | unit: standalone persiste, ninguno→null, versioning-solo sin regresion | git revert del ternario | DET-5, DET-8, DET-11 | done | 1 |
| S1.T2 | Implementar validador `validate-prefill-from.js`: exclude/deepClone arrays de strings; cada deepClone resuelve a alias `polymorphicChildren` o relacion Prisma directa; error claro con archivo+campo. Invocar en codegen DESPUES de parsear polymorphicChildren | REQ-02 | developer | S1.T1 | object-manager/src/services/codegen/helpers/validate-prefill-from.js (nuevo), object-manager/src/services/codegen/generatePrismaSchema.js | unit: alias ok, relacion directa ok, invalido rechazado, exclude malformado rechazado | borrar archivo nuevo + revert invocacion | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T3 | Unit tests S1: persistencia (REQ-01 scenarios) + validacion (REQ-02 scenarios) | REQ-01, REQ-02 | developer | S1.T2 | object-manager/tests/unit/services/codegen/validate-prefill-from.test.js (nuevo) + syncVersioningConfigToRegistry.test.js (TC-13b actualizado) | vitest run del archivo, verde | borrar tests nuevos | DET-7 | done | 1 |
| S1.T4 | Regresion codegen: regenerar 16+ tenants, `git diff prisma/*/schema.prisma` vacio en objetos sin prefillFrom; smoke `select 1` en UPU | REQ-PRESERVE-06 | reviewer | S1.T3 | object-manager/prisma/*/schema.prisma | git diff vacio + smoke OK | — (idempotente) | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T3, ⚑ fuerte): quality review exhaustive, regresion codegen sin cambios, persistir, decidir continue | — | reviewer | S1.T4 | tickets/ticket-037.md | gate persistido + git diff vacio | — | DET-20, DET-23, DET-27, DET-29 | done | 1 |

### Session 2 — resolver lee el registry + precedencia [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- secuencial: lectura → merge → regresion -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | En `createInstance`, cuando `data.prefillFrom?.source`, leer `objectDefinition.versioningConfig.prefillFrom` del registry. Sin source → no leer (preserva flujo actual) | REQ-03 | developer | S1.GATE | object-manager/src/graphql/resolvers/instance.resolver.js:2186 | unit: lectura solo con source presente | git revert del bloque de lectura | DET-5, DET-8, DET-10 | done | 2 |
| S2.T2 | Combinar declarativo + runtime: exclude = union, deepClone = union, source = runtime. Reusar el merge de campos de prefill-from-source.js (036) | REQ-03, REQ-05 | developer | S2.T1 | object-manager/src/graphql/resolvers/helpers/prefill-from-source.js, object-manager/src/graphql/resolvers/instance.resolver.js | unit: union excludes, source runtime, sin prefillFrom declarado solo default exclude | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | Regresion ~64 callers: createInstance SIN `data.prefillFrom.source` (con y sin config declarativa en el objeto) → comportamiento identico al baseline | REQ-PRESERVE-06 | reviewer | S2.T2 | object-manager/tests/unit/resolvers/ (suite completa) + tests/e2e/clone-activity-polymorphic.test.js | vitest, suite createInstance sin fallos nuevos; caso "config declarativa NO auto-activa" verde | — | DET-7, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2, ⚑ fuerte): quality review standard, regresion callers sin fallos, decidir continue | — | reviewer | S2.T3 | tickets/ticket-037.md | gate persistido + cero regresion en callers | — | DET-20, DET-23, DET-27, DET-29 | done | 2 |

### Session 3 — deepClone declarativo cableado + relacion directa [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- secuencial: cableado alias → rama directa → tests -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Cablear el `deepClone` efectivo (declarativo+runtime) al helper polimorfico existente (`deep-clone-polymorphic.js`, 033) para aliases de polymorphicChildren. NO reimplementar el walk recursivo | REQ-04 | developer | S2.GATE | object-manager/src/graphql/resolvers/instance.resolver.js, object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js | unit: alias polimorfico via config declarativa clona con jerarquia (reuso 033) | git revert del cableado | DET-5, DET-8, DET-16 | done | 3 |
| S3.T2 | Nueva rama: deepClone de relacion Prisma directa (1-N por FK normal) — clonar hijos apuntando al record nuevo. Distinguir alias vs relacion directa al resolver cada entry (DEC-LOCAL-03) | REQ-04 | developer | S3.T1 | object-manager/src/graphql/resolvers/helpers/deep-clone-direct.js (nuevo), object-manager/src/graphql/resolvers/instance.resolver.js | unit: relacion directa clona hijos con FK al nuevo record; mapa oldId→newId consistente | borrar archivo nuevo + revert | DET-1, DET-2, DET-8 | done | 3 |
| S3.T3 | Unit tests S3: alias polimorfico (reuso), relacion directa (nuevo), mezcla alias+directa, mapa consistente | REQ-04 | developer | S3.T2 | object-manager/tests/unit/resolvers/deep-clone-direct.test.js (nuevo) + validate-prefill-from.test.js (directChildren) | vitest, scenarios REQ-04 verdes | borrar tests | DET-7 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2, ⚑ fuerte): quality review standard foco escalabilidad del walk + claridad rama directa, decidir continue | — | reviewer | S3.T3 | tickets/ticket-037.md | gate persistido + tests deepClone verdes | — | DET-20, DET-23, DET-27, DET-29 | done | 3 |

### Session 4 — doc + cierre [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Documentar la capacidad declarativa en `prefill-capability.md`: shape, default exclude, relacion con polymorphicChildren, precedencia declarativo/runtime, ejemplo | REQ-07 | scribe | S3.GATE | object-manager/docs/prefill-capability.md (nuevo o seccion) | doc presente y consistente con el codigo | git revert | DET-16 | done | 4 |
| S4.T2 | Quality review final + commits granulares DET-27 (object-manager UPONE-1206 prefijo UPONE-1208-S{N} + deckard up1-sp3-w2) | — | reviewer | S4.T1 | object-manager/, deckard/projects/up1/ | suite verde, commits con prefijo UPONE-1208-S{N} | git reset commits locales | DET-13, DET-27 | done | 4 |
| **S4.GATE** | Gate de cierre Session 4 (tier T1): validacion reforzada DET-30, teach-close (DET-22), status closed | — | reviewer | S4.T2 | tickets/ticket-037.md | teach-close.html validado + acceptance checkpoints | — | DET-20, DET-22, DET-30 | done | 4 |

## Technical reference

- **Codegen sync**: `object-manager/src/services/codegen/generatePrismaSchema.js:2459` — `syncVersioningConfigToRegistry`. Gate actual en `:2478-2486`. Fase 3 del codegen, junto a `addNewObjectsToRegistry`.
- **Validador precedente**: `object-manager/src/services/codegen/helpers/validate-polymorphic-children.js` — patron a replicar para `validate-prefill-from.js`.
- **Resolver**: `object-manager/src/graphql/resolvers/instance.resolver.js:2186` — `const prefillFrom = data?.prefillFrom || null`. Punto de insercion de la lectura del registry.
- **Merge de campos (036)**: `object-manager/src/graphql/resolvers/helpers/prefill-from-source.js:20,87-96` — default exclude + merge `{...prefilled, ...data}`. Reusar.
- **deepClone polimorfico (033)**: `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js:160-194` — `findMany` ownerType/ownerId + walk recursivo + mapa `{newId,type}`. Reusar.
- **Registry column**: `object-manager/prisma/UPU/schema.prisma:28` — `versioningConfig Json?`.

## Constraints

- **RULE-dev-004**: codigo core → rama de la epica (`UPONE-1206`); merge a develop gated por team up1, no por el cierre DKC.
- **critical_rule up1 (config.yaml)**: "Toda query DEBE filtrar por tenantId" → la lectura del registry usa el `objectDefinition` ya resuelto tenant-scoped en el resolver; no se agregan lookups nuevos sin scope.
- **DEC-LOCAL-02 (036)**: `prefillFrom` vive dentro de `data`, no es arg GraphQL. HU-2 lo respeta — la capa declarativa va por `metadata`/registry, sin tocar el SDL.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-object-manager-track-0-prerequisitos-clonacion (TICKET-033) | internal | HU-0j (`versioningConfig` + sync) y HU-0d (`polymorphicChildren` + deepClone helper) cerrados. HU-2 los extiende/reusa | bajo — cerrado y verificado en codigo |
| SPEC-object-manager-hu1-prefillfrom-createinstance (TICKET-036) | internal | Merge de campos + exclude en el resolver. HU-2 lo reusa para el prefill de campos | bajo — cerrado y verificado en codigo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion codegen en 16+ tenants | medium | high | REQ-PRESERVE-06 + gate ⚑ fuerte S1: `git diff` vacio en objetos sin prefillFrom |
| Regresion en ~64 callers de createInstance | medium | high | REQ-03 activacion gated por `source`; gate ⚑ fuerte S2 con regresion |
| deepClone relacion directa (rama nueva) introduce bug o es YAGNI | medium | medium | DEC-LOCAL-03: en alcance pero marcada candidata a recorte; tests dedicados S3.T3 |
| Orden de validacion: prefillFrom valida antes de parsear polymorphicChildren | low | medium | DEC-LOCAL-04: validador corre despues del parse de polymorphicChildren (dependencia de orden explicita en S1.T2) |

## Open questions

- **OQ-1**: ¿`deepClone` de relacion directa (DEC-LOCAL-03) se mantiene en SP3 o se difiere a SP4? Decision pragmatica tomada: mantener en alcance (esta en el AC), implementar como rama minima en S3.T2, recortable si el gate S3 detecta complejidad desproporcionada. Residual para revision del dev al cierre.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Abrir el gate de persistencia a `(versioning || prefillFrom)`
- **Contexto**: 033 dejo `versioningConfig = versioning ? {...} : null`; `prefillFrom` standalone no persistia (comentario en codigo difiere a HU-2).
- **Drivers**: el caso central de HU-2 es declarar `prefillFrom` sin `versioning`; sin abrir el gate la config se pierde.
- **Opcion elegida**: gate `(versioning || prefillFrom)`, shape `{ versioning: versioning||null, prefillFrom: prefillFrom||null }`.
- **Alternativas**: (a) columna separada `prefillFromConfig` — descartada: fragmenta el registry y duplica la sync; (b) exigir `versioning` siempre — descartada: rompe el caso de uso declarativo puro.
- **Consecuencias**: cambio minimo (un ternario), reversible; reabre la regresion codegen multi-tenant.
- **Session**: design.

### DEC-LOCAL-02: Precedencia declarativo = politica, runtime = target; activacion gated por source
- **Contexto**: el intake de 037 no especificaba como combinar el `prefillFrom` declarativo con el runtime.
- **Drivers**: los ~64 callers de `createInstance` no deben romperse; `source` es inherentemente per-call (no se declara que instancia clonar).
- **Opcion elegida**: declarativo aporta defaults de `exclude`/`deepClone` (union con runtime); `source` siempre runtime; **sin `source` runtime no se activa prefill** aunque haya config declarativa.
- **Alternativas**: (a) config declarativa auto-activa prefill — descartada: rompe a los 64 callers; (b) runtime override total (no union) — descartada: el dev tendria que repetir todo el exclude declarado en cada llamada.
- **Consecuencias**: preserva el invariante de HU-1; el merge es predecible (union).
- **Session**: design.

### DEC-LOCAL-03: `deepClone` de relacion Prisma directa en alcance, marcada candidata a recorte
- **Contexto**: el AC pide alias polimorfico (ya hecho por 033) + relacion Prisma directa (no existe).
- **Drivers**: el unico consumidor SP3 (Activity→CurricularSection) es polimorfico; la rama directa es especulativa.
- **Opcion elegida**: mantener en alcance (esta en el AC), implementar como rama minima distinta del helper polimorfico; recortable a SP4 si S3 detecta complejidad desproporcionada.
- **Alternativas**: (a) diferir a SP4 ya — descartada por ahora: el AC lo lista; (b) forzar todo por el helper polimorfico — descartada: la relacion directa no tiene `ownerType/ownerId`.
- **Consecuencias**: cumple el AC literal; el riesgo se acota con tests dedicados y el gate S3.
- **Session**: design (revisable en S3.GATE).

### DEC-LOCAL-04: Validador `prefillFrom` corre despues de parsear `polymorphicChildren`
- **Contexto**: validar que `deepClone` resuelve a un alias exige conocer los alias declarados.
- **Drivers**: dependencia de orden en la fase del codegen.
- **Opcion elegida**: `validate-prefill-from.js` analogo a `validate-polymorphic-children.js`, invocado despues del parse de polymorphicChildren.
- **Alternativas**: validar solo estructura (arrays) sin resolver aliases — descartada: dejaria pasar `deepClone` a aliases inexistentes hasta runtime.
- **Consecuencias**: error claro en build-time; acoplamiento de orden documentado.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-05 pasan
- [ ] **Persistencia**: objeto con `prefillFrom` standalone → `versioningConfig.prefillFrom` poblado (REQ-01)
- [ ] **Validacion**: `deepClone` invalido falla el codegen (REQ-02)
- [ ] **Runtime**: config declarativa aplicada solo con `source` runtime; union de listas (REQ-03)
- [ ] **deepClone**: alias polimorfico (reuso) + relacion directa (nuevo) clonan correctamente (REQ-04)
- [ ] **Regresion**: codegen 16 tenants sin cambios en objetos sin la key (gate ⚑ S1); ~64 callers sin cambios (gate ⚑ S2)
- [ ] **Docs**: `prefill-capability.md` presente (REQ-07)
- [ ] **Teach**: teach-close generado (DET-22)

## Archiving

Cuando este ticket cierre, este spec vive en `core/`. Mover a `_archive/` solo si una version superior lo reemplaza (no contemplado en este ticket).
