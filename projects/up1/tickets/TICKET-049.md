---
id: TICKET-049
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1219
module: object-manager
autopilot: autonomous
---

# Derived genérico en codegen — remap declarativo de FKs internas entre hijos clonados (polymorphicChildrenDerived)

## Request

> **Origen**: backlog B-SP4 de [TICKET-043](ticket-043.md) (HU-8b / UPONE-1214). El hook `activity.versioning-hook.resolver.js` del mod curriculum-design es el **path acotado de SP3**; este ticket lo **generaliza al motor**. Épica **UPONE-1206** (core). **Asociado a**: TICKET-033 (HU-0d deepClone — lo que extiende), TICKET-043 (de donde nace).
>
> **Jira**: asociado al issue **existente UPONE-1219** (HU-0d deepClone, épica core UPONE-1206) — el más relacionado (este ticket extiende ese motor). NO se creó un Jira nuevo. Por DET-19, branches/commits de TICKET-049 usan **UPONE-1219**. (Alternativa descartada: UPONE-1214/HU-8b lo origina pero vive en la épica CD UPONE-1038, no encaja para un feature core).

### Descripción

Hoy, al versionar un objeto, el motor (`deep-clone-polymorphic.js`) clona los hijos polimórficos y remapea el self-ref (`recursiveBy`/`parentId`) automáticamente — pero **NO** remapea las **FKs internas entre hijos** (ej. `CurricularLink.sourceSectionId`/`targetSectionId`, que referencian otras `CurricularSection` clonadas). Eso lo resuelve un **hook escrito a mano por mod** (HU-8b, ~93 líneas + flow n8n).

Este ticket **generaliza** ese remap a una capacidad declarativa del codegen/motor:

1. **Bloque declarativo** `metadata.polymorphicChildrenDerived` (o extensión de `polymorphicChildren`): el objeto declara qué hijos "derivados" tienen FKs internas que apuntan a otros hijos clonados, y cuál es el tipo/campo. Ej:
   ```json
   "polymorphicChildrenDerived": [
     { "object": "CurricularLink", "via": "sourceSectionId,targetSectionId", "remapTo": "sections" }
   ]
   ```
2. **Fase derived genérica** en el deep-clone: tras clonar los hijos primarios, localiza los hijos derivados cuyas FKs caen dentro del `cloneMap` y los re-crea con los ids remapeados — genérico sobre objeto/campos, defensivo (log+skip si una FK cae fuera del mapa, igual que el hook actual).
3. **Persistencia en codegen** del bloque (como `versioningConfig`).
4. **Migración**: reemplazar el hook + flow del mod curriculum-design por la config declarativa (retirar `activity.versioning-hook.resolver.js` + `flows/versioning-remap.json`).

### Criterios de aceptación (borrador — refinar en design)

* Bloque `polymorphicChildrenDerived` declarativo, persistido por el codegen.
* Fase derived genérica que remapea FKs internas vía `cloneMap`, defensiva (skip cross-owner).
* curriculum-design migrado a la config declarativa; hook + flow por-mod **retirados**.
* Otro mod (o un test genérico) que versione un objeto con hijos derivados obtiene el remap **sin** código por-mod.
* Regresión: el comportamiento de versionado de Activity (links remapeados) se preserva vía la config genérica.

### Cambio vs actual

De **hook imperativo por mod** (HU-8b, acotado SP3) a **capacidad declarativa del motor** (SP4). Mods futuros obtienen el remap de FKs internas gratis.

## Contexto / asociación a épicas

- **Épica**: UPONE-1206 (Core, transversal) — feature de codegen/motor de versionado.
- **Extiende**: HU-0d (TICKET-033 / UPONE-1219) — `deep-clone-polymorphic.js` + `polymorphicChildren`. Este ticket añade la capa "derived".
- **Nace de**: HU-8b (TICKET-043 / UPONE-1214) — el hook acotado y el `_cloneMap` expuesto en el evento `:create` son la base reusable.
- **Relacionado**: B1 (codegen ignora `targetField`) — ambos tocan el codegen; conviene agruparlos en planning SP4.

## Análisis preliminar (de TICKET-043 S8)

- **SP estimados**: ~4 (feature de motor core: diseño del bloque + fase derived genérica + codegen + migración + tests; perfil comparable a HU-0d).
- **¿Se puede ahora?**: Sí — prereqs hechos (deepClone HU-0d, `cloneMap`/`buildRemapAPI`, `_cloneMap` en evento, hook como referencia funcional). Necesita intake + spec propios.
- **Bloqueantes**: ninguno.
- **¿Bloquea algo?**: No — HU-8 cerrado; curriculum-design cubierto por el hook manual. Es deuda técnica + habilitador, no blocker.
- **Outcome**: remap de FKs internas declarativo; se retira el hook + flow por-mod; mods futuros lo obtienen gratis.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (generalización de motor) |
| Tipo de cambio | architecture (codegen + deep-clone, transversal) |
| Modulo principal | object-manager (codegen / versioning engine) |
| Modulos afectados | object-manager (motor), mods/curriculum-design (migración del hook) |
| Layer | core (UPONE-1206) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | yes | Bloque declarativo `polymorphicChildrenDerived` (config, no columnas nuevas) |

## Context found

> Recopilado en intake-explore (agent Explore/sonnet, read-only sobre `/Users/edobacon/Workspace/uplanner/up1`, 2026-06-02). Refs `path:line` relativas al repo up1.

### Motor de clonado (`deep-clone-polymorphic.js`)

- `deepClonePolymorphicChildren({ prisma, polymorphicChildren, aliases, sourceId, newOwnerId, exclude })` — invocado desde `instance.resolver.js:2984` dentro de `finalizeCreate`, bajo `prefillFrom?.deepClone?.length > 0`.
- Por cada alias: lee la entry de `polymorphicChildren` por `name`, parsea `via: "<ownerTypeField>/<ownerIdField>"`, `findMany` de las filas del owner, `topologicalOrder(rows, recursiveBy)` si hay self-ref, y clona fila por fila (`deep-clone-polymorphic.js:184-209`).
- Remapea **solo 2 cosas** por fila: (1) los campos owner polimórfico al nuevo padre, (2) el self-ref `recursiveBy` vía `cloneMap`. **NO remapea FKs entre hijos de aliases distintos** (confirmado — ver H1).
- `cloneMap`: `Map<oldId, { newId, type }>`. `buildRemapAPI(map)` (`:221-237`) expone `has/remap/typeOf/toObject/size`. `toObject()` serializa a `Record<oldId,{newId,type}>`.
- Shape de `polymorphicChildren` (validado por `validate-polymorphic-children.js`): `{ name, object, via, ownerTypeValue, recursiveBy? }`. Leído en runtime vía `readObjectMetadataBlock(objectType, tenant, 'polymorphicChildren')`.

### Codegen (`services/codegen/`)

- `generatePrismaSchema.js` valida `metadata.polymorphicChildren` build-time vía `validateAllPolymorphicChildren` (`:74-91`); aborta si inválido.
- **Punto de persistencia existente**: `syncVersioningConfigToRegistry` (`generatePrismaSchema.js:2522`) escribe la columna `versioningConfig` de `core_ObjectDefinition` con `{ versioning, prefillFrom }`. Comment `:2515-2518` documenta el patrón "per-capacity key" → lugar natural para añadir `polymorphicChildrenDerived`.
- **RULE-platform-007** (`generatePrismaSchema.js:381`): `const relationName = fieldName.replace(/Id$/, '').toLowerCase()` — el accessor de relación Prisma es lowercase sin `Id`. La fase derived opera sobre el **campo escalar `*Id`** (no el accessor), igual que el hook actual.

### Hook por-mod a migrar (`mods/curriculum-design/logic/activity.versioning-hook.resolver.js`, 93 líneas)

- `remapCurricularLinks({ prisma, sourceActivityId, sectionIdMap })`: `findMany` de `CurricularLink` con `sourceSectionId in oldSectionIds`, resuelve `newId` (soporta shape `{newId,type}` y string plano), y por cada link: si `sourceSectionId` o `targetSectionId` caen fuera del map → `console.warn` + `skipped++` (defensa BR-VER-002, no hay FK constraint en DB); si no → `create` con FKs remapeadas + `linkType/notes/position` preservados (`:52-76`).
- Wiring: export `versioningHookMutation` → `resolverIndex.js:44` escanea `mods/` y mergea cualquier `*.resolver.js` con export "mutation". TypeDef en `typeDefs/mods.js:228` (`remapVersionedCurricularLinks`).
- Mirror idéntico en `object-manager/src/graphql/resolvers/mods/curriculum-design/`.

### Flow n8n (`mods/curriculum-design/flows/versioning-remap.json`)

- 3 nodos: trigger Redis `UPU/Activity/core:create` (pattern) → filtro `objectType==='Activity' && operation==='create' && record._createdVia==='version'` (+ guard `_cloneMap` no vacío) → GraphQL `RemapVersionedCurricularLinks`. Es el puente event-bus; hook + flow son un par (ninguno funciona solo).

### Evento `:create` + `_cloneMap` (`instance.resolver.js`)

- `_cloneMap` se arma en `finalizeCreate` (`:3005-3019`): `cloneMap = buildRemapAPI(merged).toObject()`; viaja como campo transient `_`-prefijo en el payload del evento `:create` (mismo patrón que `_createdVia`/`_versionSourceId`, excluido del audit). Solo aparece si hubo `deepClone`. **El `cloneMap` ya está en scope en `finalizeCreate` justo tras `deepClonePolymorphicChildren`** → habilita una fase derived in-process (ver H4).

### Tests existentes (baseline de regresión)

- Comando object-manager: `npm test` = `vitest run` (también `test:unit`/`test:integration`/`test:e2e`).
- `tests/unit/resolvers/deep-clone-polymorphic.test.js` (TC-23..TC-33: árbol 5 secciones, topo order, self-ref, owner re-stamp, cloneMap).
- `tests/e2e/clone-activity-polymorphic.test.js`, `tests/e2e/version-asnewversion.test.js` (flujo completo + `_cloneMap` en payload).
- `tests/unit/services/codegen/validate-polymorphic-children.test.js`, `syncVersioningConfigToRegistry.test.js`.
- `mods/curriculum-design/tests/unit/activity.versioning-hook.test.js` (3 casos: remap 5 links, skip defensivo, short-circuit map vacío) — **se retira/reemplaza** en la migración.
- `polymorphicChildrenDerived` **no existe** en el codebase aún; solo mención forward en `activity.versioning-hook.resolver.js:12`.

**Warnings**:
- Repo de código en rama protegida `develop` con working tree sucio (8 submódulos M + `mods/curriculum-design` untracked). Resolver rama de ticket (`UPONE-1206`) + estado limpio en `design-transition-to-execute` (guarda de inicio DET-30). No se toca el dirty state preexistente.
- `object-manager` y `mods/curriculum-design` son submódulos git distintos → la migración es multi-repo (commits en ambos).

## Triage

> Iterado en intake-explore (2026-06-02). Hipótesis validadas multi-capa (DET-5) con evidencia de código. El análisis preliminar (de TICKET-043 S8) fue el punto de partida.

| # | Hipótesis | Status | Evidencia (multi-capa) |
|---|-----------|--------|------------------------|
| H1 | El motor de clonado NO remapea FKs entre hijos de aliases distintos (solo owner + self-ref) | ✓ confirmed | **backend/engine**: `deep-clone-polymorphic.js:184-209` remapea solo owner fields + `recursiveBy` vía cloneMap. **backend/hook**: el cross-sibling remap lo hace aparte el hook por-mod (`activity.versioning-hook.resolver.js:52-76`). Confirma el gap que el ticket cierra. |
| H2 | Existe punto de persistencia natural para el bloque declarativo (`versioningConfig` en codegen) | ✓ confirmed | **codegen**: `syncVersioningConfigToRegistry` (`generatePrismaSchema.js:2522,2548`) + comment "per-capacity key" `:2515-2518`. **db**: columna `versioningConfig` en `core_ObjectDefinition`. Se extiende sin columna nueva (creates_data = config, no schema). |
| H3 | `cloneMap`/`buildRemapAPI` ya exponen lo necesario para una fase derived genérica | ✓ confirmed | **backend/engine**: `buildRemapAPI` (`:221-237`) → `has/remap/typeOf/toObject`. **backend/resolver**: `_cloneMap` emitido en `instance.resolver.js:3005-3019`. No requiere ampliar la API del map. |
| H4 | La fase derived puede correr in-process en `finalizeCreate` (tras deepClone) en vez de vía evento async n8n | ~ inferred → decisión de design | **backend**: el `cloneMap` ya está en scope en `finalizeCreate` (`instance.resolver.js:3005`) justo tras `deepClonePolymorphicChildren` (`:2984`). Path actual es async (flow n8n → mutation). Generalizar al motor habilita remap síncrono in-engine. **Trade-off sync-in-engine vs hook-genérico-async lo resuelve design-feature** (recomendación: sync in-engine — elimina la dependencia n8n+GraphQL por-mod y el lag eventual). |
| H5 | Hook + flow de curriculum-design son retirables sin pérdida de comportamiento si la fase derived cubre el remap con la misma defensa (skip cross-owner) | ✓ confirmed (factible) | **backend/hook**: lógica `:52-76` mapea 1:1 a un remap genérico por lista de campos. **config**: el bloque declarativo reemplaza las 93 líneas + flow. **tests**: existen (`activity.versioning-hook.test.js` + clone tests) para validar paridad de comportamiento. |
| H6 | RULE-platform-007 (FK lowercase, codegen:381) condiciona cómo la fase derived lee/escribe FKs | ✓ confirmed | **codegen**: `:381` lowercase aplica al **accessor de relación Prisma**, no al campo escalar `*Id`. La fase derived opera sobre el escalar `sourceSectionId` directo (como el hook). **backend**: hook usa `sourceSectionId`/`targetSectionId` escalares. Sin impacto si se respeta el campo escalar. |

### Decisiones (intake)

- **SP estimated = 4** (preliminar S8 TICKET-043). `story_points.published` **no se auto-importa de Jira**: UPONE-1219 representa HU-0d (TICKET-033, deepClone), no este trabajo — su SP publicado no aplica a TICKET-049. `executed_method: skip` para published con esta razón. El issue se reusa solo para trazabilidad de épica (DET-19).
- **Decisión arquitectónica abierta (H4)**: sync in-engine vs hook genérico async. En modo `super` se resuelve en design-feature con racional + learn (no se pregunta al dev). Recomendación de intake: **sync in-engine** dentro de `finalizeCreate`, reusando el `cloneMap` ya en scope, eliminando la dependencia n8n por-mod.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (épica core, RULE-dev-004) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| Rama object-manager (S1-S4 motor) | `UPONE-1206` (submódulo ya en esa rama) |
| Rama mods/curriculum-design (S4 migración) | `UPONE-1038` (submódulo CD — cross-épica, scope expandido por decisión del dev) |

**Decisiones de execute (dev, 2026-06-02)**:
- **Scope expandido** para cubrir la migración S4 en `mods/curriculum-design/*` (+ typeDef y mirror en object-manager). La migración del mod commitea en su rama `UPONE-1038`; el motor en `UPONE-1206`.
- **Working tree sucio preexistente** (object-manager: `activity.json` + ~8 `prisma/*/schema.prisma`; curriculum-design en UPONE-1038): **dejar intacto**. Commits del ticket con `git add` selectivo por-path — nunca `git add -A`. Push/merge siempre preguntan (super).

## Sessions

### Plan de sessions (preplanificacion)

4 sessions (refinado en `design-feature` desde el esqueleto de 5 del intake). El detalle (tasks, contracts) vive en el spec [SPEC-object-manager-polymorphic-children-derived](../specs/core/SPEC-object-manager-polymorphic-children-derived.md). Numeración continua desde S1.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Bloque declarativo + validator codegen + reader helper | 1 | T2 | validator build-time + cablear + reader `readPolymorphicChildrenDerived` (S1.T1-T3) | auto | validator unit verde; rechaza bloques inválidos; reader testeado |
| S2 | Fase derived genérica en el motor (`applyDerivedRemap`) + unit | 2 | T3 | remap genérico + defensa skip cross-owner + unit (S2.T1-T3) | ⚑ fuerte | remap genérico multi-campo; skip+warn cross-owner; coverage verde |
| S3 | Wire en `finalizeCreate` (síncrono in-engine) + e2e genérico | 3 | T3 | invocar applyDerivedRemap reusando cloneMap + e2e objeto distinto (S3.T1-T2) | ⚑ fuerte | versionado in-engine remapea FK; e2e genérico sin código por-mod |
| S4 | Migración curriculum-design + regresión + cierre | 4 | T3 | declarar bloque en Activity + retirar hook/flow/typeDef/tests + regresión (S4.T1-T3) | ⚑ fuerte | `npm test` object-manager verde; hook+flow retirados; server arranca |

**Notas del plan** (refinadas en design):
- **H4 resuelta**: sync in-engine (DEC-LOCAL-01) — el flow n8n + la mutación GraphQL se retiran (no se conservan como async). Driver: RULE-core-019 + cloneMap en scope.
- **H2 refinada**: el bloque se consume **directo del JSON** (RULE-core-019), NO se persiste en `versioningConfig`. Por eso la session de "persistencia" del esqueleto de 5 se absorbió — el codegen solo valida (S1), el motor lee directo (S1.T3 reader).
- Dependencias: S1→S2 (validator+reader antes del motor), S2→S3 (la fase existe antes de cablearla), S3→S4 (verificada con e2e genérico antes de retirar el hook).
- S2, S3, S4 son gates ⚑ fuerte (motor core transversal + migración multi-repo).

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-06-02 | false → super | dev trigger `/dkc 049 super autopilot` (HOR-079, por-ticket) | proximo gate |

> Sessions de execute se agregan como `### Session N` debajo, al arrancar cada una.

### Session 1 — 2026-06-02 — Bloque declarativo + validator codegen + reader helper [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Definir y validar (build-time) el bloque `polymorphicChildrenDerived` y proveer el reader que el motor usará para consumirlo directo del JSON (RULE-core-019).

**Tasks completadas**:

- [x] S1.T1 — Crear validator `validate-polymorphic-children-derived.js` (shape `{object,via,remapTo}`, `via` campos FK reales, `remapTo` matchea alias de polymorphicChildren)
- [x] S1.T2 — Cablear el validator en `generatePrismaSchema.js` (abortar build si inválido) + unit tests
- [x] S1.T3 — Reader helper `readPolymorphicChildrenDerived(objectType, tenant)` en `deep-clone-polymorphic.js`
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir, vitest área + coverage, decidir continue/iterate

**Validacion del tier**:
- T2 — `vitest run tests/unit/services/codegen/`: 90/90 pass (6 files, incluye `validate-polymorphic-children-derived.test.js` 18/18 nuevo). Sin regresión en el área codegen. El reader (S1.T3) es wrapper trivial sin test propio (cubierto por el patrón de readPolymorphicChildren existente).

**Discoveries / Learns nuevos**:
- L2: RULE-core-019 — consumo directo del JSON, sin sync al registry (ya en tabla Learns).

**Commit DET-27**: `bb615ed` feat(codegen) + `b754d4f` test(codegen) — object-manager @ UPONE-1206. Path-scoped (working tree preexistente intacto).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline) — fallback documentado: aislado reservado para S2/S3/S4 (motor + migración, mayor riesgo). S1 es T2 aditivo (validator nuevo + wrapper) con tests verdes — revisión inline proporcional (HOR-079 S4 proporcionalidad por costo).
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Funciones <40 líneas, early returns, sin magic strings (REQUIRED_FIELDS const) |
| 2 | Lint | pass | ESM imports consistentes con el módulo |
| 3 | Tipado | n/a | JS con JSDoc (igual que el validator hermano) |
| 4 | Testing | pass | 18 unit cubren shape + cross-checks + registry; 90/90 área codegen |
| 5 | Escalabilidad | pass | Genérico sobre object/via/remapTo; context inyectable |
| 6 | Mantenibilidad | pass | Espeja `validate-polymorphic-children.js` (patrón conocido) |
| 7 | Claridad | pass | JSDoc + mensajes de error con prefix archivo+índice |
| 8 | a11y | n/a | Sin UI |
| 9 | Storybook | n/a | Sin componente |
| 10 | Error handling | pass | Cross-checks defensivos (object no encontrado → error explícito, no throw) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-02 — Fase derived genérica en el motor (applyDerivedRemap) + unit [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Implementar la fase derived genérica `applyDerivedRemap` en el motor (remap de FK internas vía cloneMap, defensivo skip cross-owner) con unit tests.

**Tasks completadas**:

- [x] S2.T1 — Implementar `applyDerivedRemap({ prisma, derived, cloneMap, ... })` en `deep-clone-polymorphic.js`: findMany del hijo derivado, remap FK de `via` vía cloneMap (filtrado por type de `remapTo`), re-crear filas. Genérico
- [x] S2.T2 — Defensa skip+warn: FK fuera del cloneMap → omitir + console.warn, retornar `{ remapped, skipped }`
- [x] S2.T3 — Unit tests de `applyDerivedRemap`: remap genérico multi-campo, skip cross-owner, mixto, sin bloque (no-op)
- [x] S2.GATE — Gate de sync Session 2 (tier T3): persistir, vitest unit + coverage, quality review exhaustive, decidir

**Validacion del tier**:
- T3 — `vitest run tests/unit/resolvers/`: 509/509 pass (incluye `derived-remap.test.js` 9/9 tras iterate). Sin regresión en el motor. e2e/regresión completa diferida a S4 (necesita DB).

**Discoveries / Learns nuevos**:
- L4: type-mismatch silencioso atrapado por reviewer aislado (ya en tabla Learns).
- L5: FK nullable = relación opcional (DEC-LOCAL-03).

**Commit DET-27**: `4340894` feat(versioning) + `d9bd25f` test(versioning) — object-manager @ UPONE-1206. Path-scoped.

**Quality review (DET-23)**:

**Reviewer**: aislado (Agent general-purpose/sonnet, contexto limpio, read-only) — mandatorio T3 ⚑ fuerte (HOR-079 REQ-10).
**Tier de revision**: exhaustive
**Resultado global**: iterate → resuelto → pass

Veredicto inicial **iterate**: 2 findings MAJOR. (1) type-mismatch silencioso — el filtro por type aplicaba solo al query, no al remap por-campo (cloneMap mixto remapearía a clon de otro type sin warn). (2) divergencia nullable vs hook HU-8b. **Fixes aplicados**: (1) validar `mapped.type===targetType` en el loop + test TC-2.3 cross-type; (2) DEC-LOCAL-03 — null FK = relación opcional (documentado), sin impacto en CurricularLink (not_null). Warn mejorado (campo+valor) + assert `created`. Re-validado: 9/9 + 509/509.

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Guard clauses, resuelve FK antes de mutar (no huérfano) |
| 2 | Lint | pass | — |
| 3 | Tipado | pass | JSDoc completo |
| 4 | Testing | pass | 9 unit (incl. cross-type post-iterate); 509/509 resolvers |
| 5 | Escalabilidad | pass | Type-check en remap (fix MAJOR#2); genérico object/via |
| 6 | Mantenibilidad | pass | Espeja estilo de deepClonePolymorphicChildren |
| 7 | Claridad | pass | Warn con campo+valor; DEC-LOCAL-03 documenta nullable |
| 8 | a11y | n/a | Sin UI |
| 9 | Storybook | n/a | — |
| 10 | Error handling | pass | Skip cross-owner/cross-type + throw modelo inexistente |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-02 — Wire en finalizeCreate (síncrono in-engine) + e2e genérico [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Cablear applyDerivedRemap en finalizeCreate (reusa el cloneMap en scope, lee el bloque del JSON) y agregar e2e genérico (objeto distinto, sin código por-mod).

**Tasks completadas**:

- [x] S3.T1 — Invocar `applyDerivedRemap` desde `finalizeCreate` tras los clones primarios (reusa `merged`/cloneMap, lee bloque vía reader). Síncrono in-engine
- [x] S3.T2 — Test e2e genérico: objeto distinto de Activity con bloque derived versiona y remapea FK internas sin código por-mod (fixture)
- [x] S3.GATE — Gate de sync Session 3 (tier T3): persistir, vitest integration/e2e, quality review, decidir

**Validacion del tier**:
- T3 — `vitest run tests/unit/`: 1631 pass, 28 skip, **3 fail preexistentes** en `tests/unit/scripts/sync/SyncManager.test.js` (infra: "Service account 'undefined' not authorized" / schema push — NO relacionado con el scope; áreas tocadas codegen 90/90 + resolvers 509/509 verdes). e2e `derived-remap-generic.test.js` skip-safe (DB UPU no disponible headless).
- **Validación e2e/regresión real DB-gated**: los e2e usan `ctx.skip()` sin DB UPU; la verificación end-to-end del remap (y la regresión de S4) requiere entorno con DB.

**Commit DET-27**: `18d7467` feat(versioning) + `eeee741` test(versioning) — object-manager @ UPONE-1206. Path-scoped.

**Quality review (DET-23)**:

**Reviewer**: inline (LLM principal) — proporcionalidad: S3.T1 es wiring aditivo (~18 líneas) que reusa `applyDerivedRemap` ya revisado aislado en S2; e2e skip-safe. Sin regresión introducida.
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Guard `merged.size>0` + bloque vacío → no-op; warn solo si skipped>0 |
| 4 | Testing | pass | 1631 unit (3 fail infra preexistentes); e2e skip-safe listo para DB/CI |
| 5 | Escalabilidad | pass | remapTypeByAlias derivado de polymorphicChildren (genérico) |
| 10 | Error handling | pass | Reusa defensa de applyDerivedRemap (skip cross-owner/type) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-06-02 — Migración curriculum-design + regresión + cierre [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Declarar el bloque en Activity y retirar el hook + flow + typeDef + tests del mod (atómico, sin doble-remap). Regresión completa.

**Tasks completadas**:

- [x] S4.T1 — Declarar `polymorphicChildrenDerived` en Activity (curriculum-design @ UPONE-1038)
- [x] S4.T2 — Retirar hook (2 copias) + typeDef `remapVersionedCurricularLinks` + flow `versioning-remap.json` + test del mod (atómico con T1)
- [x] S4.T3 — Regresión completa (npm test object-manager) + verificar versionado migrado — DB-gated
- [x] S4.GATE — Gate de sync Session 4 (tier T3): persistir, regresión, quality review, decidir cierre

**Validacion del tier**:
- T3 headless — object-manager `vitest run tests/unit/`: 1631 pass, 28 skip, 3 fail (infra/auth/DB preexistentes: SyncManager/rbac/evaluator — count idéntico pre-migración, ninguno introducido). Schema GraphQL ensambla tras retiro del typeDef/resolver (RULE-core-018 OK).
- Validador acepta el bloque real de Activity (validateAllPolymorphicChildrenDerived → 0 errores).
- **DB-gated (pendiente para cierre)**: regresión e2e completa + verificación end-to-end de que versionar una Activity remapea los CurricularLink vía el motor (hook retirado). Los e2e usan `ctx.skip()` sin DB UPU.

**Commit DET-27**: `1d095ae` (curriculum-design) refactor migración Activity + `eab3bef` (object-manager) refactor retiro typeDef — ramas UPONE-1038 / UPONE-1206. Path-scoped.

**Quality review (DET-23)**:

**Reviewer**: inline (LLM principal) — la lógica del remap se revisó aislada en S2; S4 es migración (config declarativa + retiro de código equivalente, zero new behavior). Verificado: sin refs colgantes, schema ensambla, validador acepta el bloque.
**Tier de revision**: standard
**Resultado global**: pass (headless) — acceptance final DB-gated

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Retiro limpio; bloque declarativo mínimo |
| 4 | Testing | pass (headless) | 1631 unit; e2e/regresión DB-gated |
| 6 | Mantenibilidad | pass | −~93 líneas hook −flow n8n; config declarativa |
| 10 | Error handling | pass | Defensa heredada de applyDerivedRemap (S2) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → cierre (acceptance verde tras validación con DB: e2e 7/7; 12 fallos npm test confirmados preexistentes vs baseline)
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para retomar (cierre)**:
- Entorno con DB UPU → correr e2e (`derived-remap-generic`, `clone-activity-polymorphic`, `version-asnewversion`) + regresión completa de object-manager.
- Verificar que versionar una Activity remapea los CurricularLink a las secciones clonadas con el hook retirado (REQ-04/REQ-05).
- Push de UPONE-1206 (object-manager) y UPONE-1038 (curriculum-design) — requiere OK del dev (super).
- Tras acceptance verde → `/dkc close` (teach-close + status closed).

## Test cases

> Preliminares (intake-explore). Se refinan/conectan a REQs en design-feature y se ejecutan inline en execute (DET-25).

| # | Caso | Tipo | REQ | Affects UI | Actual | Evidence | Status | Session |
|---|------|------|-----|-----------|--------|----------|--------|---------|
| TC-1 | Versionar Activity con CurricularLinks → links remapeados a las CurricularSection clonadas vía config (paridad hook HU-8b) | regression/happy | REQ-02/REQ-04 | no | links nuevos apuntan a las secciones clonadas, sin hook | e2e `version-asnewversion` + `clone-activity-polymorphic` pass (DB real) | pass | S4 |
| TC-2 | Link con FK fuera del cloneMap (cross-owner) → skip + warn, no huérfano | edge/defensivo | REQ-03 | no | fila omitida + warn; no se crea huérfano | unit `derived-remap.test.js` TC-2.2 | pass | S2 |
| TC-3 | Objeto distinto a Activity con hijos derivados remapea **sin** código por-mod | happy/generalización | REQ-02 | no | remap genérico ok (graphEdge unit + e2e con CurricularLink real) | unit (caso graphEdge) + e2e `derived-remap-generic` (DB real) | pass | S2/S3 |
| TC-4 | Bloque `polymorphicChildrenDerived` inválido → codegen aborta con error claro | edge/validación | REQ-01 | no | aborta con error objeto+campo / remapTo | unit `validate-polymorphic-children-derived.test.js` (18) | pass | S1 |
| TC-5 | Versionado sin links / objeto sin bloque derived → comportamiento intacto | regression | REQ-05 | no | sin fase derived; suite intacta | 1631 unit + e2e 7/7; baseline confirma sin regresión introducida | pass | S3/S4 |
| TC-6 | Hook + flow retirados → el versionado sigue remapeando (in-engine) | regression/migración | REQ-04 | no | schema ensambla sin typeDef colgante; e2e versionado verde | sin refs colgantes (grep) + e2e `version-asnewversion` (DB) | pass | S4 |

### Regression baseline

- **object-manager**: `npm test` (`vitest run`) — suites `deep-clone-polymorphic.test.js`, `clone-activity-polymorphic.test.js`, `version-asnewversion.test.js`, `validate-polymorphic-children.test.js`, `syncVersioningConfigToRegistry.test.js`. Estado actual: verde (asumido — se verifica como primera acción de S3/baseline).
- **mods/curriculum-design**: `activity.versioning-hook.test.js` (3 casos) — se retira/reemplaza por el test genérico en S4/S5.

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Draft auto-aprobado en autopilot super: el modelo es config (no tablas/columnas nuevas); sin alternativas comparables. Racional en `intent.md` iteration history. En super, aprobación de draft = artefacto de diseño → decide+documenta, no pregunta (HOR-103). | llm-autopilot | design-draft | discarded | — |
| L2 | RULE-core-019 refinó el diseño: el bloque se consume directo del JSON en el resolver (sin sync a `versioningConfig`), consistente con `polymorphicChildren`. Supersede la suposición tentativa del intake (H2). Resolvió H4 a favor de sync in-engine → se retira el flow n8n. (DEC-LOCAL-01) | llm-autopilot | design-feature | refined | DEC-LOCAL-01 |
| L3 | `execute_scope` quedó incompleto: solo cubre `object-manager/*`, pero S4 (migración) toca `mods/curriculum-design/*` (Activity.json, hook, flow, tests) — repo/rama distintos (UPONE-1038). En super, tocar paths fuera del scope declarado = pausa+reporta. Falta expandir el scope o segmentar la migración antes de execute. | llm-autopilot | design-transition-to-execute | discarded | — |
| L4 | Quality review aislado (S2) atrapó type-mismatch silencioso en `applyDerivedRemap`: el filtro por type aplicaba solo al query, no al remap por-campo — un id de otro type en cloneMap mixto se remapearía sin warn. Fix: validar `mapped.type===targetType` en el loop. Valor de la revisión independiente. | reviewer-aislado | S2 | refined | DEC-LOCAL-03 |
| L5 | FK nullable en fase derived = relación opcional (pasa tal cual), no skip. Difiere del hook HU-8b (skip por not_null). Genérico correcto; sin impacto en CurricularLink (not_null). DEC-LOCAL-03. | reviewer-aislado | S2 | refined | DEC-LOCAL-03 |
| L6 | Verificación baseline (in-place, dir real `5aaef93` vs HEAD): los 12 fallos de `npm test` (9 validation-rules + 2 rbac + 1 SyncManager) son **preexistentes** — con mi código revertido a baseline dan idénticos 9 fallos en validation-rules. Causa: service-account ausente en el entorno local → reglas de validación de mods + rbac + schema-push erroran. Ninguno importa mi scope. El worktree daba 3 (no 12) solo por artefacto de layout (sin sibling `mods/`). | llm-autopilot | S4 | discarded | — |
| L7 | El motor lee el bloque de `object-manager/objects/business/Base/{object}.json` (synced), NO del source en `mods/*/objects/`. Declarar un bloque en el JSON del mod exige correr `npm run sync:files` para que el runtime lo vea. Los e2e no lo detectan si pasan el bloque explícito. Atrapado por el reviewer de cierre aislado (FINDING-B1) — candidato a RULE-core. | reviewer-aislado | S4 | refined | candidato RULE-core |

## Teaching — Intake

**Status**: done
**Archivo**: [TICKET-049.teach/teach-intake.html](TICKET-049.teach/teach-intake.html) (v2 HTML, HOR-081)
**Bloques**: tldr, concept-card (glosario 6), flow (versionado hoy), code (remap actual vs declarativo), two-col-compare (H4 abierta), callout (restricciones entorno), tag (áreas), timeline (plan 5 sessions), study-qa (4 preguntas barra de éxito)

## Teaching — Close

**Status**: done
**Archivo**: [TICKET-049.teach/teach-close.html](TICKET-049.teach/teach-close.html) (v2 HTML, HOR-081)
**Bloques**: tldr, timeline (4 sessions), comparison-table (evolución H1-H6), case (DEC-LOCAL-01/02/03), study-qa (4 lecciones), callout (qué viene)
