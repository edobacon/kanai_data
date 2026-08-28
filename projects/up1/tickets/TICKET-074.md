---
id: TICKET-074
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1270
module: object-manager
autopilot: autonomous
---

# Implement: versionar objetos versionables SIN workflow — hacer opcional el chequeo de workflow en `prepareVersionData` (core)

## Request

El helper de versionado de core `object-manager/src/graphql/resolvers/helpers/version-from-source.js`
(función `prepareVersionData`) **asume incondicionalmente que el objeto versionable tiene workflow**:
incluye `currentstatus` + `workflow` en el `findUnique` (L56), exige `currentstatus.allowsVersioning`
(L61) y `workflow.initialStatusId` (L67), y setea `initialStateField` con el estado inicial del
workflow (L88). `Curriculum` (y `AcademicProgram`) modelan el estado como un **enum simple** sin FK a
`WorkflowStatus` ni relación `workflow` → versionar lanza `INTERNAL_SERVER_ERROR`
(`PrismaClientValidationError: Unknown field 'currentstatus' for include statement on model Curriculum`).

`Curriculum` es el **primer objeto versionable sin workflow** de la plataforma; el bloqueo es de core,
no del mod ni de la config (la config `versioning` de Curriculum ya es correcta — sin `initialStateField`,
con `status` en `prefillFrom.exclude`). Es el **B2 diferido de TICKET-065** (UPONE-1270): clonar +
unicidad por linaje se entregaron y verificaron E2E; solo **versionar** quedó bloqueado por esta
limitación de core.

**Alcance del fix (Alternativa A del análisis de UPONE-1270)**: gatear toda la lógica de workflow a la
presencia de `initialStateField` en el `versioningConfig` (`needsWorkflow = !!initialStateField`):
include condicional + los 2 checks gateados + set condicional de `initialStateField`. ~15 líneas, función
pura, **backward-compatible** (activity declara `initialStateField` → comportamiento idéntico). Test:
extender `tests/unit/resolvers/version-from-source-helper.test.js` con el caso "objeto sin
`initialStateField`".

**Objetivo secundario de observación** (no necesariamente fix en este ticket): con el crash destrabado,
**observar en profundidad el caso del versionado de curriculum**, en particular el **frente #2**: la
extensión RecordType 1:1 `rt__Plan__curriculum` (`progression`, `totalCredits`, …) **no se crea ni se
arrastra atómicamente** en el path `asNewVersion` (versión resuelve `objectType=Curriculum` base → no
recibe el alias `rt__`; con alias `rt__` el guard de L40 `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`
lo rechaza — path RT no-atómico de TICKET-056). Este frente es **ortogonal a TICKET-072** (que cubre
`deepClone` de **hijos** en el path de **clone**, no la extensión RT en **versión**). Documentar hallazgos
como backlog/learn.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (generalizar el helper de versionado de core a objetos sin workflow) |
| Tipo de cambio | single-core (`object-manager/`): lógica condicional en una función pura + test unitario |
| Módulo principal | object-manager (layer: core) |
| Módulos afectados | object-manager (`prepareVersionData`). Sin cambios en mods ni layout. Curriculum como objeto de **observación** del versionado profundo (frente #2). |

## Creation scope

Ambos `false`: no crea UI nueva ni modela datos nuevos (generaliza un helper existente).

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `prepareVersionData` asume workflow siempre (include `currentstatus`+`workflow`, exige `allowsVersioning` e `initialStatusId`, setea `initialStateField`) | ✓ confirmada | `version-from-source.js:54-88` (leído 2026-06-18). |
| H2 | Curriculum versiona vía enum simple `status` (Draft/Active/Archived), sin FK a WorkflowStatus → el include explota en Prisma | ✓ confirmada | `Curriculum.json` versioning sin `initialStateField`; error E2E `Unknown field 'currentstatus'`. |
| H3 | Gatear a `needsWorkflow = !!initialStateField` preserva 1:1 el comportamiento de activity (que declara `initialStateField`) | ✓ confirmada | `objects/business/Base/activity.json:42` (`initialStateField: "currentStatusId"`) → con el gate `needsWorkflow=true` para activity. Test unitario `version-from-source-helper.test.js` cubre el path activity (TC-1b). |
| H4 | La v2 de curriculum NO arrastra su extensión `rt__Plan__curriculum` en el path asNewVersion (frente #2) | ? por verificar (observación S2) | El create genérico separa base/extensión SOLO con alias `rt__` (`curriculum-create.resolver.js`); versión usa `objectType=Curriculum` base. Guard L40 rechaza alias `rt__`. TICKET-056 (path RT no-atómico). |
| H5 | El `deepClone` de hijos SÍ corre atómico en el path asNewVersion (no es el frente bloqueante) | ✓ confirmada | `instance.resolver.js:3174` (deepClone dentro de `finalizeCreate`) + `:3258` (`finalizeCreate` corre en `prisma.$transaction(..., Serializable)` cuando asNewVersion). |

### Context found

- **Análisis/decisión**: doc `specs/up1/sp4/UPONE-1270-versionado-curriculum-sin-workflow.md` (Alternativas A/B/C, recomendación A, alcance). Spec de convergencia `specs/SPEC-curriculum-design-improve-upu-curriculum-v2-reseed.md`.
- **Code refs**: `object-manager/src/graphql/resolvers/helpers/version-from-source.js:23-90` (`prepareVersionData`) + `:99-136` (`maxVersionInLineage`, no cambia). `instance.resolver.js:2502-2503` (invoca prepareVersionData), `:3174` (deepClone hijos), `:3258` (`$transaction` asNewVersion), `:40` guard RT. Adapter mod: `mods/curriculum-design/logic/curriculum-create.resolver.js` (createCurriculumWithRecordType — delega el split base/extensión al create genérico).
- **Test**: `tests/unit/resolvers/version-from-source-helper.test.js` (extender; preservar casos de activity con workflow).
- **Warnings**:
  - **RULE-dev-004 / core_work_policy**: layer:core → rama de épica core, merge a `develop` gated por team up1. NO commitear a develop (git hook).
  - **TICKET-056**: el path RT (`rt__<RT>__curriculum`) no es atómico — frente #2; no se cierra con la Alt A. Levantarlo como backlog si la observación lo confirma.
  - **TICKET-072** (ortogonal): cubre `deepClone` de hijos en el path de clone (prefilledModal), no la extensión RT en versión.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Repo | object-manager (core) — `git@bitbucket.org:uplanner/object-manager.git` |
| Branch | `UPONE-1261-academic-program` (ya creada, parte de `develop` @ `8e2c650`; arrastra el working tree de sync/seed sin commitear — NO se commitea: object defs synced, schemas regenerados, typeDefs auto-generados) |
| Base branch | develop |
| DB state | tenant UPU con seed reciente; curriculum convergido v1→v2 (override v1 borrado) |
| Services | object-manager (`:4000`) + suite (`:3000`) |
| Test data | un `Curriculum` (RecordType Plan) raíz para versionar; un `activity` versionable (regresión) |

## Solución propuesta (Alternativa A)

1. **Core `object-manager`**: en `prepareVersionData`, derivar `needsWorkflow = !!initialStateField`. Hacer condicional: (a) el `include: { currentstatus, workflow }` (sino `undefined`), (b) los dos `throw` (`SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS`) dentro de `if (needsWorkflow)`, (c) el set de `[initialStateField]` solo si `needsWorkflow`. `maxVersionInLineage` no cambia. Ajustar el JSDoc `@throws` (los 2 errores de workflow pasan a condicionales).
2. **Estado inicial de la v2 sin workflow**: lo resuelve `static_default: "Draft"` del enum + `status` en `prefillFrom.exclude` (ya en el mod) → v2 nace Draft. Sin necesidad de `initialStateField`.
3. **Test**: extender `version-from-source-helper.test.js` — caso "sin `initialStateField`": no incluye `currentstatus`/`workflow`, no exige `allowsVersioning`, no setea estado, bumpea `version` + linkage. Preservar los casos de activity (con workflow).
4. **Observación (frente #2)**: con el fix aplicado, versionar un Curriculum Plan E2E y verificar empíricamente: (a) v2 nace Draft; (b) si la v2 crea/arrastra `rt__Plan__curriculum` (progression, totalCredits) y si el write base+RT es atómico. Si (b) falla → levantar backlog de core (path RT atómico, TICKET-056 / unificación con `$transaction`).

## Testing

### Test cases (preliminares — se ejecutan en execute, DET-25)

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual / Evidence | Status |
|---|------|-----|------|------------|-------------|-------|----------|-------------------|--------|
| TC-1 | Versionar Curriculum (sin workflow) no crashea y bumpea versión + linkage | REQ-IMPL-01 | auto+manual | yes | Curriculum Plan raíz; fix aplicado | asNewVersion sobre el curriculum | v2 creada, `version = max(linaje)+1`, `previousVersionId = source.id`, sin error | ✅ E2E vivo (MCP `cd_version_curriculum` sobre SMOKE-CUR-92137): `versioned:true`, `newVersion:2`, `previousVersionId=cmqiw4e0…` (v1). Sin crash | pass |
| TC-2 | v2 de Curriculum nace en estado Draft (static_default) | REQ-IMPL-01 | manual | yes | TC-1 | inspeccionar `status` de la v2 | `status = "Draft"` (no arrastra del source) | ✅ version chain: v2 `status:"Draft"` | pass |
| TC-3 | Regresión: versionar activity (con workflow) sigue idéntico | REQ-PRESERVE-01 | auto | yes | activity versionable | asNewVersion sobre activity | v+1 encadenada, estado = initial del workflow, gating allowsVersioning intacto | ✅ unit: 9 casos de activity (con workflow) verdes en `version-from-source-helper.test.js`; gate `needsWorkflow=true` para activity por construcción (path idéntico) | pass |
| TC-4 | Unit: objeto sin `initialStateField` → no include workflow, no exige allowsVersioning, no setea estado | REQ-IMPL-01 | auto | no | — | `prepareVersionData` con versioningConfig sin `initialStateField` | data con version+linkage, sin claves de workflow | ✅ unit: 4 casos nuevos (TC UPONE-1270 a/b/c/d), 13/13 verde; valida include `undefined`, sin throws de estado, bump+linkage | pass |
| TC-5 | Observación frente #2: ¿la v2 de Curriculum crea/arrastra `rt__Plan__curriculum` atómicamente? | REQ-OBSERVE-01 | manual | no | TC-1 | inspeccionar extensión RT de la v2 + atomicidad | DOCUMENTAR resultado; si falta → backlog core | ⚠️ **HALLAZGO**: v1 tiene `rt__Plan__curriculum` (`totalCredits:240`, `periodType:"Semester"`); **v2 = NULL (sin fila de extensión)**. La v2 NO arrastra los campos de Plan → frente #2 CONFIRMADO → backlog B1 | done (finding) |
| TC-6 | Update de curriculum (owner Institution) no crashea por `institutionId` | REQ-FIX-01 | auto+manual | yes | curriculum Minor con owner Institution | update vía suite/MCP que setea campos base | update OK; FK `institutionId` → relation `connect`; relación `institution` preservada | ✅ E2E vivo (MCP `cd_update_curriculum` sobre UV-MINOR-MAT-2026): `updated:true`, `versionLabel:"asdff"` persistió, `owner:"Universidad del Valle"` intacto. + unit nuevo en `instance.resolver.test.js` verde + 542/542 resolver tests sin regresión | pass |

## Sessions

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Aplicar Alt A (workflow opcional en prepareVersionData) + test unitario + regresión activity + smoke versión curriculum | 1 | T2 | gate condicional en helper; extender test unitario; smoke E2E version curriculum (TC-1/TC-2); regresión activity (TC-3); unit sin initialStateField (TC-4) | ⚑ estándar | TC-1..TC-4 verdes + reviewer pass |
| S2 | Observación frente #2 (extensión RT atómica en versión) + decisión backlog | 1 | T1 | versionar Curriculum y verificar `rt__Plan__curriculum` + atomicidad (TC-5); documentar hallazgo; levantar backlog si aplica | ⚑ ligero | TC-5 documentado + decisión build/backlog registrada |

**Notas del plan**: layer:core (rama `UPONE-1261-academic-program`, no develop — RULE-dev-004). El fix (S1) es chico y backward-compatible; el riesgo real es el frente #2 (S2), que puede revelar trabajo de core independiente (path RT atómico). S2 es observación, no compromete fix.

### Session 1 — 2026-06-18 — Fix workflow-opcional en prepareVersionData + tests [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Aplicar Alt A (workflow opcional en `prepareVersionData`) + extender test unitario + regresión activity + smoke versión curriculum.

**Tasks completadas**:
- [x] S1.T1 — Aplicar Alt A en `prepareVersionData`: `needsWorkflow = !!initialStateField`; include condicional; 2 checks gateados; set condicional de `initialStateField`; ajustar JSDoc `@throws`
- [x] S1.T2 — Extender test unitario: caso "sin initialStateField" (no include workflow, no exige allowsVersioning, no setea estado, bump+linkage); preservar casos de activity
- [x] S1.T3 — Smoke E2E: versionar un Curriculum Plan → v2 sin crash, Draft, encadenada (TC-1/TC-2); regresión activity version (TC-3)
- [x] S1.T4 — Fix update FK→connect en `updateInstance` (FK escalar base → `{ relation: { connect } }`; plegado del bug institutionId que encontró el dev)
- [x] S1.T5 — Test regresión FK→connect en update + suite resolvers sin regresión (542)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir resultados, vitest del helper + quality review (DET-23), commits por tipo (DET-27), decidir continue/iterate

**Validación del tier (T2)**:
- `vitest run version-from-source-helper.test.js`: **13/13 verde** (9 casos de activity con workflow preservados + 4 nuevos sin-workflow).
- `vitest run tests/unit/resolvers/`: **542/542 verde** — sin regresión tras el fix de `updateInstance`.
- E2E vivo (OM :4000 reiniciado con código nuevo + MCP): versionar Plan → v2 Draft encadenada (TC-1/TC-2); update Minor owner Institution → OK, relación preservada (TC-6).

**Discoveries / Learns nuevos**:
- L1: **Asimetría create/update en FK de relación**. `createInstance` convierte FK escalares base a `{ relation: { connect } }` (instance.resolver.js ~L2962-3010) pero `updateInstance` NO lo hacía → el FK escalar (`institutionId`) coexistía con la escritura anidada de la extensión y Prisma forzaba el *checked input* que lo rechaza. Curriculum lo expone por tener relación requerida `institution` + extensión `ext__` a la vez. Candidato a RULE-core (paridad create/update).
- L2: **Frente #2 confirmado empíricamente**. Versionar un Curriculum Plan crea la fila base v2 pero **NO** su extensión `rt__Plan__curriculum` (v1: `totalCredits:240`/`periodType:"Semester"`; v2: NULL). El workflow-opcional destraba el crash pero la versión no arrastra los campos de Plan → backlog B1 (path RT atómico, TICKET-056).
- L3 (operativo): el OM de :4000 corría con `npm start` (node plano, sin watch) desde un día antes → no recargaba cambios de `src/`. Reiniciar el OM tras editar core es obligatorio para verificar en vivo (consistente con la nota de reiniciar OM tras sync).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline)
**Tier de revisión**: standard (S1 toca core, T2)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Función pura (versionado) + simetría con patrón existente del create (update FK). Sin código muerto. |
| 2 | Lint | pass | Sin nuevos warnings; estilo consistente con el archivo. |
| 3 | Tipado | n/a | JS (object-manager no es TS). |
| 4 | Testing | pass | 13/13 helper + 542/542 resolvers; TC nuevos con asserts concretos (include undefined, connect, sin institutionId). |
| 5 | Escalabilidad | pass | Genérico: sirve a curriculum/academicProgram/futuros sin workflow; update FK aplica a todo objeto con relación base. |
| 6 | Mantenibilidad | pass | Comentarios con racional + refs (UPONE-1270, TICKET-056); JSDoc actualizado. |
| 7 | Claridad | pass | `needsWorkflow` explícito; conversión FK replica el create (un solo patrón). |
| 8 | A11y | n/a | Sin UI. |
| 9 | Storybook | n/a | Sin componentes. |
| 10 | Error handling | pass | Backward-compatible; los throws de workflow se preservan gateados; FK null se limpia. |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-18 — Observación frente #2 (extensión RT en versión) + decisión backlog [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T1

**Objetivo**: Observar empíricamente si la v2 de un Curriculum Plan arrastra su extensión `rt__Plan__curriculum` atómicamente; documentar y decidir backlog.

**Tasks completadas**:
- [x] S2.T1 — Versionar Curriculum Plan e inspeccionar la v2: ¿crea `rt__Plan__curriculum` con progression/totalCredits? ¿atómico? Documentar (TC-5)
- [x] S2.T2 — Decidir build/backlog: si falta extensión RT → confirmar backlog B1 (path RT atómico / TICKET-056)
- [x] S2.GATE — Gate de sync Session 2 (tier T1): persistir hallazgo + decisión, commits docs, decidir close

**Validación del tier (T1) + hallazgo**:
- Observación directa en DB UPU (`prisma.rt__Plan__curriculum.findUnique({ where: { curriculumId } })`): **v1** = `{ totalCredits: 240, periodType: "Semester" }`; **v2** = **NULL** (sin fila de extensión).
- Conclusión: el versionado workflow-opcional (S1) destraba el crash y crea la fila base v2, pero **NO** crea/arrastra la extensión `rt__Plan__curriculum` → la v2 pierde los campos de Plan. **Frente #2 confirmado** (H4).
- Decisión (DET-17): **backlog B1** (should, próximo sprint) — el path RT atómico es trabajo de core independiente (TICKET-056), no expande este ticket. No bloquea el cierre.

**Quality review (DET-23)**: tier light (S2 observación, sin código). Resultado: **pass** — hallazgo documentado con evidencia empírica reproducible; backlog levantado con racional.

**Nota de dato de prueba**: la observación creó una v2 del SMOKE plan `SMOKE-CUR-92137` (`cmqjhxmqz0000xxqhko28m7f5`) en DB UPU — dato de prueba (prefijo SMOKE), queda como evidencia.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-18 — Bug #2 plegado: split RecordType en update de curriculum [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Plegado por decisión del dev (2 interrupciones desde la suite). El update de curriculum no separaba los campos del RecordType (progression/totalCredits) a su extensión `rt__<RT>__curriculum` → "Unknown argument progression" en Minor y Plan. Fix mod-scoped simétrico al create.

**Contexto del bug #2** (descubierto en vivo): mi fix de S1 (FK→connect) destrabó `institutionId`, pero emergió el siguiente: el form de edit submitea `objectType=Curriculum` (base) con campos RT planos. El `updateInstance` genérico solo separa base/rt con el alias `rt__` (rama RecordType, `instance.resolver.js:~3405`). El create resuelve esto con `createCurriculumWithRecordType` (customEndpoint); el update NO tenía equivalente.

**Tasks completadas**:
- [x] S3.T1 — `updateCurriculumWithRecordType` (mod, mirror del create) + schema graphql + wiring del layout edit (customEndpoint, id source: instanceId)
- [x] S3.T2 — sync:logic + sync full (Phase 6 layouts → tenant DB) + restart OM; verificado: mutation PRESENTE en schema vivo (introspection) + resolver registrado en core
- [x] S3.T3 — Verificación E2E en la suite (dev): editar Minor `UV-MINOR-MAT-2026` → **guarda OK** (sin error `institutionId` ni `Progression`; el dato persiste). El **split RT en update queda verificado por el dev**. Residual: navegación post-guardar (ver S3.T4).
- [x] S3.GATE — Gate de sync Session 3: dev confirmó save OK; navegación diferida a backlog B2 (suite-side, no mod-only). Decision: continue → close.

**Validación parcial (lo verificable sin la suite)**:
- `sync:logic`: 6 mod resolvers, typedefs regenerados, 0 errores.
- `npm run sync` (SYNC_AUTO_APPLY_SCHEMA=false): Phase 6 (Apps & Layouts → Tenant DBs) procesó el layout edit; 0 errores.
- Introspection del OM vivo (:4000): `updateCurriculumWithRecordType` **presente** ✓; resolver synced a `src/graphql/resolvers/mods/curriculum-design/curriculum-update.resolver.js`.
- Core rt-branch (el que hace el split) verificado **por inspección** (`instance.resolver.js:3405-3522`): split por `rtFieldNames`, base update standalone (FK escalar OK, sin checked-input), upsert de `rt__Plan__curriculum`. Mismo patrón que el create (probado).

**S3.T4 — Navegación post-guardar (mod-only)**: el dev reportó que tras guardar el edit, el form se quedaba abierto en vez de volver al recordlist. Causa: el path `customEndpoint` de `RecordDetail.vue` emite `instance-created` (no navega como edit) cuando la mutation devuelve un objeto. **Primer intento (REVERTIDO): toqué `RecordDetail.vue` (core layout) — el dev lo atajó: debe ser mod-only.** Fix mod-only correcto: la mutation devuelve `Boolean!` (escalar) + el layout setea `returnsScalar: true` → `RecordDetail` emite `instance-updated` y navega al listado (mismo patrón que `fielddefinition-edit`). Verificado: tipo de retorno `Boolean! SCALAR` en el schema vivo.

**Learn (RULE candidate)**: la navegación post-submit de un `customEndpoint` de EDIT se controla **mod-side** vía `returnsScalar: true` + mutation que devuelve escalar — NO tocando `RecordDetail.vue`. Un customEndpoint de edit que devuelve un objeto (returnsScalar ausente) es tratado como create y se queda en el form.

**Resolución (dev, opción A)**: el guardado del edit funciona (split RT correcto, verificado por el dev). La **navegación post-guardar** (volver al recordlist) NO es mod-only — la decide la app suite consumiendo el evento que sube del form; el path `customEndpoint` full-page no dispara la navegación que sí dispara el update genérico, y eso no se controla desde la config del mod (`returnsScalar:true` servido + hard reload no bastaron). **Diferida a backlog B2 (suite-side).** El dev decidió cerrar TICKET-074 con lo entregado.

**Nota**: la verificación end-to-end del customEndpoint (form suite → mutation) requiere la suite con auth — la corre el dev. El backend (mutation + resolver + core split) quedó verificado hasta donde es posible sin la UI.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Path RT atómico para asNewVersion: que la versión de un objeto RecordType cree/arrastre su extensión `rt__<RT>__<obj>` dentro del `$transaction` (o rutear versión por el create RT-aware) | nuevo | UPONE-1270 doc §6 #2; TICKET-056 | guard L40 (rechazo actual); deepClone hijos atómico ya existe | **CONFIRMADO en S2 (TC-5)**: v2 de Curriculum Plan nace SIN `rt__Plan__curriculum` (v1 totalCredits:240/periodType:Semester → v2 NULL). Diseñar en core, coordinar con team up1 | should (próximo sprint) — no bloquea cierre (este ticket entrega el destrabe del crash + el fix de update; el path RT atómico es trabajo de core independiente) |
| B2 | Navegación post-guardar de un `customEndpoint` full-page edit: que vuelva al recordlist como el update genérico | nuevo | S3 (este ticket); `RecordDetailElement.vue`/host suite | El form de edit por `customEndpoint` guarda OK pero se queda en el form; el update genérico sí navega. `returnsScalar:true` (mod) servido + hard reload NO bastaron → la navegación la decide la **app suite** (consume el evento que sube del form), NO la config del mod | **suite-side / layout-engine core** (NO mod-only): investigar el host de la ruta RecordDetail en `up1/suite` y/o `RecordDetailElement`; coordinar con team front | should (follow-up suite, fuera de TICKET-074 por decisión del dev) |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|

## Summary

Ticket que arrancó acotado (versionar objetos sin workflow — B2 diferido de TICKET-065) y, en la verificación E2E en vivo, el dev plegó dos bugs adyacentes del update de curriculum.

**Entregado y verificado:**
- **S1 — Versionado sin workflow**: `prepareVersionData` (core, object-manager) gateado a `needsWorkflow = !!initialStateField`. Backward-compatible (activity intacto). Unit 13/13 + smoke E2E vivo (Curriculum Plan → v2 Draft encadenada). REQ-IMPL-01 / REQ-PRESERVE-01.
- **S3 — Fix `institutionId`** (plegado): `updateInstance` convierte FK escalar base → `{ relation: { connect } }` (simetría con createInstance). E2E vivo + unit + 542/542 resolvers sin regresión. REQ-FIX-01.
- **S3 — Split RecordType en update** (plegado): `updateCurriculumWithRecordType` (mod, mirror de `createCurriculumWithRecordType`) + wiring del layout edit. Destraba "Unknown argument progression" en Minor y Plan. Guardado verificado por el dev.

**Diferido a backlog (decisión del dev, opción A):**
- **B1** — path RT atómico en *versión*: la v2 de Curriculum no arrastra su extensión `rt__Plan__curriculum` (confirmado en S2: v2=NULL). Core, TICKET-056.
- **B2** — navegación post-guardar del customEndpoint full-page edit: guarda OK pero no vuelve al recordlist. Suite-side / layout-engine (NO mod-only).

**Scope de core**: solo `version-from-source.js` (versioning helper) + `instance.resolver.js` (FK→connect) en object-manager, ambos con la decisión del dev de plegar. El resto mod-only (curriculum-design). Un intento de tocar `RecordDetail.vue` (layout core) para la navegación fue **revertido** a pedido del dev (debe ser mod-only).

**Learns / RULE candidata**: asimetría create/update (create hace FK→connect + split RT; update no) — al converger un objeto a RecordType + relación requerida + extensión, el UPDATE necesita su propio adapter mirror del create. Operativo: reiniciar OM (`npm start` sin watch) tras editar core para verificar en vivo.

**Commits** (todos locales — push pendiente de aprobación humana, super autopilot):
- object-manager (rama `UPONE-1261-academic-program`): feat versionado workflow-opcional + fix FK→connect.
- curriculum-design (rama `UPONE-1261-academic-program`): updateCurriculumWithRecordType (split RT) + retorno Boolean/returnsScalar.
- deckard: artefactos DKC (spec, ticket, teach-intake, teach-close).
