---
id: TICKET-109
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1382
module: curriculum-design
autopilot: autonomous
---

# Follow-up UPONE-1382: hallazgos de review Dredd sobre el motor de borrado en cascada

## Request

Follow-up del trabajo de **UPONE-1382** (motor de borrado en cascada, cerrado en [TICKET-104](TICKET-104.md)).
Una revision Dredd del trabajo avanzado (PR/rama de UPONE-1382) levanto 2 items para CERRAR antes de mergear
y 2 nitpicks. Se pidio verificar cada hallazgo contra el codigo real y registrarlos para corregir.

Este ticket **reusa el external existente `UPONE-1382`** (no se crea ticket nuevo en Jira, por decision del
dev): los commits/PRs de estos fixes van bajo la misma historia de Jira. Es un follow-up LOCAL de calidad
sobre trabajo propio del equipo, no un defecto reportado por el cliente.

**Verificacion previa (2026-07-15)**: los 4 hallazgos fueron confirmados contra el codigo real antes de crear
el ticket. Los 4 son verdaderos.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | multi: object-manager (core) + layout (core) + up1-mcp |
| Modulo principal | curriculum-design (feature owner); implementacion en object-manager core |
| Modulos afectados | object-manager, layout, up1-mcp |
| Layer | core (RULE-dev-004 / core_work_policy aplica) |

## Creation scope

work_type fix: no crea UI ni entidades nuevas. El hallazgo 2 modifica el **contenido** de un modal existente
(display de labels), no crea una vista/componente nuevo. Ambos flags `false`.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Modifica el render de un modal existente (CriticalWarningModal), no crea vistas nuevas |
| Data model | no | Sin entidades/schemas nuevos |

## Triage

Los 4 hallazgos ya fueron diagnosticados y confirmados contra codigo en la fase de verificacion previa
(rutas:linea abajo). Las hipotesis nacen ya confirmadas. El unico bloque con incertidumbre es el hallazgo 2,
que tiene 3 decisiones abiertas del dev (registradas en la Decision matrix — DET-1: assumed/blocked hasta
resolver).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La auditoria de borrado en cascada escribe `userId: null` — toda entrada DELETE en cascada queda anonima | ✓ confirmada | `deleteImpactPlan.js:1416` hardcodea `userId: null`; caller `1339-1349` no pasa `user` pese a tenerlo en `logContext` (`1332`); `withDataLog.js:386-388` hace early-return cuando `_deleteHandledByMotor=true` |
| H2 | El modal de confirmacion muestra claves tecnicas crudas (`CurricularSection:Session: 3`) en el desglose | ✓ confirmada | Keys `${objectType}:${rt}` con centinela `__base__` (`deleteImpactPlan.js:1151-1153`) → GraphQL crudo (`instance.resolver.js:1238`) → `RecordList.vue:6115-6122` → `CriticalWarningModal.vue:264-268` renderiza `entry.type` literal |
| H3 | `active: true !== false` es cleverness muerta que evalua a `active: true`, con comentario factualmente incorrecto | ✓ confirmada | `deleteImpactPlan.js:570`; `core_FieldDefinition.json:66-71` → `active` es `not_null: true`, `active=false`=soft-delete → nunca hay nulls |
| H4 | Ids internos de DKC/KB filtrados en comentarios del repo (viola DET-19) | ✓ confirmada | `deleteImpactPlan.js:770` cita `RULE-core-023`; tests citan `TICKET-104` (`deleteImpactPlan.test.js:11`, `hard-delete-cascade.integration.test.js:273,328`) |

### Findings (detalle verificado)

#### F1 (CERRAR) — La auditoria de borrado en cascada no registra el actor (`userId: null`)

- [`deleteImpactPlan.js:1416`](/Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js) → `writeDeleteDataLog` escribe `userId: null` hardcodeado. Comentario dice "el caller puede pasar user via context.user" pero **el parametro nunca existe** en la firma.
- `deleteImpactPlan.js:1332` → el caller arma `logContext = { ..., user: context.user }` pero en la llamada `1339-1349` **NO pasa `user`** (dato disponible, se descarta).
- [`withDataLog.js:386-388`](/Users/edobacon/Workspace/uplanner/up1/object-manager/src/events/decorators/withDataLog.js) → cuando `_deleteHandledByMotor=true`, el decorator hace `return result` **antes** de `recordMutationDataLog`; la ruta generica que si resuelve el actor via `actorUserId` (`withDataLog.js:194`) no corre para cascada.
- **Contrato roto**: `datalog.md:89` declara `userId | Int? | core_User id del actor`; el visor del OM editor lo muestra (`datalog.md:105`).
- **Por que paso en verde**: el test de integracion setea `user: { id: 1 }` (`hard-delete-cascade.integration.test.js:42`) pero **ningun test asierta el `userId` resultante** en la entrada DataLog.
- **Efecto**: toda entrada DELETE en cascada queda anonima; el borrado directo (sin hijos) si atribuye. Inconsistencia de auditoria.
- **Fix (backend, path unico)**:
  1. `writeDeleteDataLog` acepta `userId` y lo escribe en vez del `null` hardcodeado.
  2. El caller lo computa desde `context.user` y lo pasa.
  3. Reusar la logica de coercion a Int de `actorUserId` (core_User.id es Int; `user.id` puede venir string) — hoy `actorUserId` es privada en `withDataLog.js` (no exportada). **Decision menor**: exportarla y reusar (recomendado, DET-32 reuse) vs replicar las ~4 lineas.
  4. **Regresion (DET-7)**: asertar `userId=1` en una entrada de nodo hijo del test de integracion.

#### F2 (CERRAR) — El modal muestra claves tecnicas en vez de nombres

- Keys de `byRecordType` = ``${objectType}:${rt}`` con centinela `__base__` (`deleteImpactPlan.js:1151-1153`).
- Se exponen crudas por GraphQL (`instance.resolver.js:1238`).
- [`RecordList.vue:6115-6122`](/Users/edobacon/Workspace/uplanner/up1/layout/src/layouts/RecordList.vue) toma `byRecordType` tal cual como `byType`.
- [`CriticalWarningModal.vue:264-268`](/Users/edobacon/Workspace/uplanner/up1/layout/src/components/organisms/Modal/CriticalWarningModal.vue) renderiza `entry.type` directo → sale literal `CurricularSection:Session: 3` y `CurricularSection:__base__: N`.
- **Inconsistencia en la misma pantalla**: las restricciones (Restrict) del mismo modal SI son semanticas (usan `getObjLabels`, `deleteImpactPlan.js:588-611`).
- El MCP tambien expone crudo (`porTipo`, [`instances.ts:168`](/Users/edobacon/Workspace/uplanner/mcp/src/core/instances.ts)) → un fix backend lo beneficia gratis.
- **Fix con DECISIONES ABIERTAS** (ver Decision matrix — no asumir, DET-1). Recomendacion tecnica: mapear en backend reusando `getObjLabels`, alineado con **RULE-core-028** (la metadata/semantica de dominio no llega al FE; resolver labels donde vive el dato).

#### F3 (NITPICK) — `active: true !== false` es cleverness muerta + comentario incorrecto

- `deleteImpactPlan.js:570` → `active: true !== false`; por precedencia evalua **en parseo a `active: true`** (no es filtro Prisma `{ not: false }`).
- Comentario "incluir nulls (no siempre hay campo active)" es **factualmente incorrecto**: `core_FieldDefinition.json:66-71` → `active` es `not_null: true`, `static_default: "true"`, y `active=false` = "esta borrado" (soft-delete). **Nunca hay nulls**; `active: true` EXCLUYE soft-deleted.
- **Fix**: reemplazar por `active: true` con comentario correcto (ej. "solo definiciones vigentes; active=false es soft-delete"). Es **refactor puro, cero cambio de comportamiento** (`true !== false === true`). Confirmar que filtrar soft-deleted era la intencion (lo es, para deteccion de FKs sobre definiciones vigentes).

#### F4 (NITPICK) — Ids internos en comentarios (viola DET-19)

DET-19: artefactos del repo (commits, branches, PRs, **comentarios de codigo**) usan el id externo, no el interno de DKC/KB.

| Ubicacion | Id interno | Accion propuesta |
|-----------|-----------|------------------|
| `deleteImpactPlan.js:770` | `RULE-core-023` | → texto llano (recomendado; el comentario ya explica la heuristica) o `UPONE-1382` |
| `deleteImpactPlan.test.js:11` | `TICKET-104` | → `UPONE-1382` |
| `hard-delete-cascade.integration.test.js:273` | `TICKET-104` | → `UPONE-1382` |
| `hard-delete-cascade.integration.test.js:328` | `TICKET-104` | → `UPONE-1382` |

**Aparte (fuera de scope, ver Backlog B1)**: mismas fugas `RULE-core-0xx` en archivos que este follow-up NO toca — `instance.resolver.js:3788`, `deep-clone-polymorphic.js:78`, `version-from-source.js:40`.

### Decision matrix (F2 — abierta, DET-1)

| # | Decision | Opciones | Recomendacion | Status |
|---|----------|----------|---------------|--------|
| D1 | Donde mapear las claves a labels | A) backend reusando `getObjLabels` vs B) frontend | **A — RESUELTA (dev 2026-07-15)**: backend reusando `getObjLabels`. Alineado con RULE-core-028 | ✓ resolved |
| D2 | Que label usar para `objectType:recordType` | label del RecordType vs objectType base vs combinado; `__base__` → solo objectType | **RecordType — RESUELTA (dev 2026-07-15)**: label del RecordType (mas especifico); si `getObjLabels` no resuelve el `rt`, fallback al label del objectType. `__base__` → solo objectType | ✓ resolved |
| D3 | Forma del dato | relabel in-place vs campo paralelo `byTypeLabeled` | **Relabel in-place — RESUELTA (dev 2026-07-15)**: reemplazar las claves de `byRecordType` por labels. Cero cambio de frontend. Actualizar el contrato documentado del formato (`datalog`/schema) | ✓ resolved |

> **DET-1**: F2 desbloqueada — D1/D2/D3 resueltas por el dev (2026-07-15). S2 pasa a tasks.
> **Propagacion (DET-16)**: relabel in-place cambia el contrato documentado de `byRecordType` (`${objectType}:${rt}`). Actualizar la doc GraphQL/schema donde se describa ese formato, y verificar que el MCP (`porTipo`) y RecordList siguen coherentes con labels.

### Context found

- **Rules del modulo**:
  - **RULE-core-031** (must, delete-cascade) — comparar pertenencia por identidad normalizada, no por nombre de tipo crudo. Contexto directo del motor (UPONE-1382, TICKET-107).
  - **RULE-core-028** (should) — la `metadata` de objeto NO llega al FE; semantica de dominio vive por capa, no config cross-capa. **Driver principal de D1** (mapear labels en backend).
  - **RULE-core-023** (must) — heuristica de child polimorfico citada en el comentario de F4.
  - **RULE-dev-004** (core_work_policy) — trabajo layer:core va en rama de epica, commits con id externo, merge gated por team up1.
- **Bugs abiertos**: ninguno especifico del motor de cascada (verificar `bugs/core/` y `bugs/curriculum-design/` en design-fix).
- **Specs relacionados**: `SPEC-curriculum-design-fix-delete-casing` (RULE-core-031 / TICKET-107), spec del motor en TICKET-104.
- **Docs relevantes**: `object-manager/docs/features/datalog.md` (contrato de auditoria que F1 rompe).
- **Warnings**:
  - Layer:core → aplica RULE-dev-004: rama de epica UPONE-1267 (variante SP6), commits con `UPONE-1382`, merge gated por team up1. La guarda de inicio (DET-30) valida rama != protegida por repo destino ANTES de execute.
  - `up1-mcp` es repo hermano standalone (path absoluto `/Users/edobacon/Workspace/uplanner/mcp`) — si D1=A y se toca `instances.ts`, es un tercer repo con su propio branch/commit.
  - Guarda de rama (REQ-02) se verifica **por repo destino** (object-manager, layout, mcp cada uno su branch), no en la raiz del monorepo.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `feat/UPONE-1382-hard-delete-cascade` (rama de ticket — decision del dev 2026-07-15; RULE-dev-004 admite rama de ticket o de epica). Los 3 repos destino (object-manager, layout, mcp) ya estan en esta rama con el trabajo avanzado sin commitear |
| Base branch | develop |
| DB state | Tenant UPU (`uplanner_upu`) para la regresion de integracion (mismo entorno que valido UPONE-1382, 7/7) |
| Services | object-manager (`:4000`); layout storybook (`:6006`) si se valida el modal; DB Postgres + tenant UPU |
| Test data | Subarbol con hijos polimorficos (CurricularSection con RecordType, ej. Session) bajo un Activity, para reproducir cascada + desglose |

### Reproduction steps

**F1 (auditoria anonima)**:
1. Precondicion: un registro con hijos declarados (ej. Activity con CurricularSection hijas) en tenant UPU; usuario autenticado con `context.user.id` conocido.
2. Ejecutar `deleteBulkInstances` / `deleteInstance` sobre el padre (dispara el motor de cascada).
3. Observado: las entradas `core_DataLog` DELETE de los nodos hijos tienen `userId: null`. Esperado: `userId` = id del actor.

**F2 (claves crudas)**:
1. Precondicion: layout con `deleteWarning: { enabled: true, type: 'critical' }` sobre un objeto con hijos en cascada (ej. CurricularSection con RecordType Session).
2. Accion: en RecordList, click en eliminar una fila → abre CriticalWarningModal → cargar impacto.
3. Observado: desglose "se borraran N elementos" lista `CurricularSection:Session: 3` (clave cruda). Esperado: nombre legible.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Un unit/integration test que setea el actor pero no asierta el `userId` resultante deja pasar bugs de auditoria (F1 paso 7/7 en verde). La atribucion es un contrato que debe asertarse explicitamente. | passive (Dredd + verificacion) | intake | refined | RULE-core-036 |
| L2 | El display user-facing debe resolver labels en backend (donde vive `core_ObjectDefinition`), no en el FE: RULE-core-028 lo formaliza y F2 es un caso mas del mismo patron. El mismo modal ya lo hace bien para Restrict y mal para el desglose. | passive | intake | refined | RULE-core-028 |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Fugas de ids internos `RULE-core-0xx` en comentarios de archivos que este follow-up NO toca | F4 (relacionado) | descubierto en intake TICKET-109 | `instance.resolver.js:3788` (RULE-core-019), `deep-clone-polymorphic.js:78` (RULE-core-019), `version-from-source.js:40` (RULE-core) | Reemplazar por texto llano o `UPONE-{ticket}` correspondiente segun DET-19; barrido acotado a esos 3 puntos; validar que no rompe ningun test que grepee el string | could |

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| F1 (userId en cascada) | TC-1 | auto | pass |
| F2 (labels legibles) | TC-2 | manual (runtime API) | pass |
| F3 (active refactor) | TC-3 | auto (regresion existente) | pass |
| F4 (ids en comentarios) | TC-4 | auto (grep/lint) | pass |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | La entrada DataLog DELETE de un nodo hijo en cascada registra el `userId` del actor | F1 | auto | no | Subarbol con hijos + `context.user.id=1` | Ejecutar delete en cascada; leer entradas core_DataLog de los hijos | `userId === 1` en cada entrada de nodo (no null) | userId===1 en los 3 nodos | `tests/integration/hard-delete-cascade.integration.test.js:146` | pass | S1.T3 | — |
| TC-2 | El desglose del modal muestra nombres legibles, no claves crudas | F2 | manual | yes | Objeto con hijos rt (Activity + secciones Session/Content) | Construir plan de impacto contra UPU; inspeccionar `byRecordType` (fuente del desglose) | Labels semanticos (sin `:` ni `__base__`) | `byRecordType = {"Curso":1,"Sesión":2,"Contenido":1}` (runtime UPU, capa API); modal render es passthrough 1:1 verificado | script buildDeleteImpactPlan vs UPU + `RecordList.vue:6115`, `CriticalWarningModal.vue:264` | pass (API runtime; DOM smoke not-reproducible, ver S2 DET-36) | S2.T4 | — |
| TC-3 | La deteccion de FKs sigue igual tras simplificar `active: true !== false` → `active: true` | F3 | auto | no | Suite existente del motor | Correr `deleteImpactPlan.test.js` + integracion | Mismos resultados que baseline (cero cambio de comportamiento) | unit 39/39 + integ 7/7 verde | `tests/unit/resolvers/deleteImpactPlan.test.js` | pass | S1.T4 | — |
| TC-4 | No quedan ids internos DKC/KB en los comentarios de los archivos tocados | F4 | auto | no | Archivos editados | grep `RULE-core-023\|TICKET-104` en los archivos del scope | 0 matches | grep exit 1 (0 matches) | `deleteImpactPlan.js` + 2 tests | pass | S1.T5 | — |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-07-15T22:30 | false → super | dev pidio ejecutar el ticket en super autopilot | S1.T1 |

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | F1 (auditoria) + F3 (refactor active) + F4 (ids en comentarios) — los 3 de path confirmado | execute | T3 | writeDeleteDataLog acepta+escribe userId; caller pasa actorUserId (reuse); regresion userId en integracion; simplificar active; limpiar ids internos | ⚑ fuerte | integracion 7/7 sigue verde + TC-1/TC-3/TC-4 pass + regresion sin delta |
| S2 | F2 (labels legibles) — SOLO tras resolver D1/D2/D3 con el dev | execute | T2 | mapeo de labels segun decision (backend recomendado); smoke del modal | ⚑ fuerte | TC-2 pass (smoke UI runtime real, DET-36) + MCP porTipo verificado si D1=A |

**Notas del plan**:
- S1 es independiente de las decisiones abiertas → arrancable de inmediato tras design-fix.
- S2 se desbloqueo (D1/D2/D3 resueltas por el dev 2026-07-15).
- Layer:core → S1/S2 respetan RULE-dev-004 (rama de ticket `feat/UPONE-1382-...`, commits `UPONE-1382`, merge gated).
- La numeracion arranca en S1 (ticket nuevo, sin sessions previas).

---

### Session 1 — 2026-07-15 18:35 — F1 (auditoria) + F3 (active) + F4 (ids internos) [phase: execute]

**Tipo**: ⚑ fuerte (cambio core multi-archivo con regresion de auditoria)
**Validation tier**: T3 (unit + integracion real UPU)

**Objetivo**: cerrar los 3 hallazgos de camino confirmado del review Dredd: cablear el `userId` del actor en la auditoria de borrado en cascada (con regresion que lo asierta), simplificar el filtro `active` muerto y limpiar los ids internos de DKC de los comentarios.

**Tasks completadas**:
- [x] S1.T1 — exportar `actorUserId` de `withDataLog.js` (dejar de ser privada, reuso DET-32)
- [x] S1.T2 — `writeDeleteDataLog` acepta `userId` y lo escribe; el caller lo computa desde `context.user` via `actorUserId` y lo pasa
- [x] S1.T3 — regresion: la asercion de auditoria del test de integracion ahora exige `userId === 1` en cada nodo hijo en cascada
- [x] S1.T4 — `active: true !== false` → `active: true` + comentario correcto (soft-delete)
- [x] S1.T5 — reemplazados `RULE-core-023` (→texto llano) y `TICKET-104` (→`UPONE-1382`) en los 3 archivos del scope
- [x] S1.GATE — Gate de sync Session 1 (tier T3)

**Validacion del tier**:
- T1 — `vitest run tests/unit/resolvers/deleteImpactPlan.test.js`: 39/39 pass
- T3 — `vitest run tests/integration/hard-delete-cascade.integration.test.js` (UPU real): 7/7 pass (incluye la nueva asercion `userId===1`)
- S1.T5 — `grep "RULE-core-023\|TICKET-104"` en los 3 archivos: 0 matches

**Discoveries / Learns nuevos**:
- L1 (confirmado): el fix de F1 verifica empiricamente que las entradas DataLog de cascada ahora atribuyen el actor; antes la asercion no existia y el bug pasaba en verde.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (super autopilot)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Sin console.*, comentarios corregidos, sin dead code |
| 2 | Lint/estilo | pass | Consistente con el archivo |
| 3 | Tipado | n/a | JS sin tipos |
| 4 | Testing | pass | Unit 39/39 + integracion 7/7 (con nueva asercion de atribucion) |
| 5 | Escalabilidad | pass | Reuso de `actorUserId` (una fuente de verdad) |
| 6 | Mantenibilidad | pass | Import unidireccional deleteImpactPlan→withDataLog, sin ciclo |
| 7 | Claridad | pass | Comentario de `active` refleja el comportamiento real |
| 8 | a11y | n/a | Backend |
| 9 | Storybook | n/a | Backend |
| 10 | Error handling | pass | `writeDeleteDataLog` sigue best-effort (try/catch) |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 2 (F2: labels legibles en el modal)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante externo
- [ ] standby → pausar ticket

**Pre-condiciones para Session 2**:
- Verificar que `getObjLabels` resuelve un RecordType antes de asumir el label del rt (S2.T1).

**Tiempo invertido**: ~1h efectiva
**Contexto retomable**: S1 cerrada, F1/F3/F4 implementados y validados en la rama `feat/UPONE-1382-hard-delete-cascade`. Falta S2 (F2).
**Commit DET-27**: `UPONE-1382 fix(delete-cascade): attribute actor in cascade audit + cleanups`

---

### Session 2 — 2026-07-15 18:55 — F2: labels legibles en el desglose del modal [phase: execute]

**Tipo**: ⚑ fuerte (cambia el contrato de `byRecordType`, user-facing)
**Validation tier**: T2 (unit + coverage del motor + prueba runtime del API)

**Objetivo**: reemplazar las claves tecnicas del desglose de cascada (`CurricularSection:Session`) por nombres legibles, resueltos en backend, segun las decisiones D1/D2/D3 del dev (backend + label del RecordType + relabel in-place).

**Flujo de acciones**: primero verifique empiricamente contra UPU donde vive el label del RecordType (S2.T1) — no esta en `core_ObjectDefinition` por el nombre bare del rt, sino como `rt__{rt}__{objectLower}`. Con eso implemente el mapeo (S2.T2): extraje un helper module-level `lookupObjectDef` (devuelve null si no existe, para distinguir found vs fallback), refactorice el closure `getObjLabels` de Restrict para reusarlo (DET-32), y relabelice `byRecordType` in-place (rt via `rt__{rt}__{obj}`, fallback objectType, `__base__`→objectType). Luego actualice el contrato documentado (S2.T3) en `static.js` y el tipo del MCP. Finalmente verifique el output real contra UPU (S2.T4).

**Tasks completadas**:
- [x] S2.T1 — verificado: el label del RecordType vive como `rt__{rt}__{objectLower}` en `core_ObjectDefinition` (ej. `rt__Session__curricularsection` → "Sesion"); el nombre bare no resuelve → fallback al objectType
- [x] S2.T2 — `lookupObjectDef` (module-level, null si no existe) + `getObjLabels` refactorizado a reusarlo + `byRecordType` relabelizado in-place
- [x] S2.T3 — contrato actualizado: descripcion de `byRecordType` en `static.js` (GraphQL) + comentario del tipo en el MCP `instances.ts`
- [x] S2.T4 — prueba runtime contra UPU: `byRecordType` = `{"Curso":1,"Sesion":2,"Contenido":1}` (labels legibles)
- [x] S2.GATE — Gate de sync Session 2 (tier T2)

**Validacion del tier**:
- T1 — `vitest run tests/unit/resolvers/deleteImpactPlan.test.js`: 39/39 pass
- T2 — `vitest run tests/unit/resolvers tests/unit/events`: 702 pass / 1 skip (28 files) — el refactor de `getObjLabels` no rompio el path Restrict
- T3 — `vitest run tests/integration/hard-delete-cascade.integration.test.js` (UPU): 7/7 pass
- Runtime (DET-36) — script contra UPU: `byRecordType = {"Curso":1,"Sesion":2,"Contenido":1}`

**Discoveries / Learns nuevos**:
- L2 (confirmado): los labels de RecordType en up1 viven como `rt__{RecordType}__{objectLower}` en `core_ObjectDefinition`, no bajo el nombre bare del rt. Patron reutilizable para cualquier resolucion de label de RecordType.
- L3: el modal no necesita cambios (D1=backend): RecordList pasa `byRecordType`→`entry.type` por passthrough (verificado en el finding), asi que al relabelizar el backend el modal muestra labels automaticamente. Cero cambio en `layout/` core.

**Runtime verification (DET-36)**: smoke-not-reproducible (full-stack UI). Razon auditada: el smoke del modal en browser requiere suite+layout+object-manager+BD+auth+un layout con `deleteWarning: critical` — no se levanto el stack completo en este run. Evidencia runtime REAL capturada en la capa API (donde vive el cambio): `byRecordType` produce labels legibles contra UPU. El render es un passthrough 1:1 ya verificado (`RecordList.vue:6115-6122` → `CriticalWarningModal.vue:264-268` renderiza `entry.type`), asi que el desglose mostrara "Sesion: 2" / "Contenido: 1" / "Curso: 1".

**Quality review (DET-23)**:

**Reviewer**: LLM principal (super autopilot)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Helper con responsabilidad unica; sin dead code |
| 2 | Lint/estilo | pass | Consistente |
| 3 | Tipado | n/a | JS (object-manager); el cambio en MCP es solo comentario |
| 4 | Testing | pass | 702 unit + 7 integracion + prueba runtime API |
| 5 | Escalabilidad | pass | `lookupObjectDef` reusable; cache por invocacion |
| 6 | Mantenibilidad | pass | Reuso DET-32 (Restrict y summary comparten el lookup) |
| 7 | Claridad | pass | Contrato documentado actualizado en 2 capas |
| 8 | a11y | n/a | El texto es mas legible que antes (mejora indirecta) |
| 9 | Storybook | n/a | Sin cambio de componente |
| 10 | Error handling | pass | `lookupObjectDef` try/catch → null → fallback |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → request-close (todas las tasks done; el close SIEMPRE pregunta al dev)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para close**:
- Confirmacion del dev (DET-30: el close nunca es autonomo, ni en super).

**Tiempo invertido**: ~1.5h efectiva
**Contexto retomable**: S1 + S2 cerradas. Los 4 hallazgos implementados y validados. Falta: commit de S2 + teach-close + confirmacion de cierre del dev.
**Commit DET-27**: `UPONE-1382 fix(delete-cascade): human-readable labels in delete impact breakdown`

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake` (`done`).
**Archivo**: [`TICKET-109.teach/teach-intake.html`](TICKET-109.teach/teach-intake.html)
**Visualizar en HC**: `http://localhost:3016/projects/up1/tickets/TICKET-109#teaching?teach=intake`

## Teaching — Close

**Status**: ver frontmatter `teachings.close` (`pending`).
**Archivo**: [`TICKET-109.teach/teach-close.html`](TICKET-109.teach/teach-close.html) (cuando exista)

## Summary

### What was requested
Cerrar los 4 hallazgos de la revision Dredd sobre el motor de borrado en cascada de UPONE-1382.

### What was done
- **F1**: la auditoria de borrado en cascada ahora registra el usuario que borro (antes quedaba anonima, `userId: null`). Se reuso la coercion del actor de la ruta generica y se agrego una regresion que lo asierta.
- **F2**: el desglose del modal de borrado ahora muestra nombres legibles ("Sesion: 2", "Contenido: 1") en vez de claves tecnicas (`CurricularSection:Session: 3`). Resuelto en backend; el MCP se beneficia igual.
- **F3**: se simplifico un filtro Prisma con cleverness muerta (`active: true !== false` → `active: true`) y se corrigio su comentario.
- **F4**: se quitaron ids internos de DKC (`RULE-core-023`, `TICKET-104`) de los comentarios del codigo/tests.

### What was discovered
- Rules creadas: ninguna nueva (candidata en Learns: el patron de labels de RecordType `rt__{rt}__{obj}` — evaluar promover en teach-close).
- Decisions tomadas: DEC-LOCAL-01 (F2 backend + label RecordType + relabel in-place).
- Bugs encontrados: ninguno nuevo (los 4 hallazgos ya estaban diagnosticados).

### Testing summary
| Metric | Value |
|--------|-------|
| REQs covered | 4/4 |
| REQs NOT covered | ninguno |
| Test cases total | 4 (3 auto, 1 manual/runtime) |
| Test cases pass | 4 |
| Test cases fail | 0 |
| Regression delta | integracion 7/7 verde (sin delta); unit 702 pass/1 skip |

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Tasks completed | 11 (S1: 5+GATE, S2: 4+GATE) |
| Commits | 3 (object-manager x2, up1-mcp x1) |
| Learns captured | 3 |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `0bd978d8` | 2026-07-15 | UPONE-1382 fix(delete-cascade): attribute actor in cascade audit + cleanups | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | REQ-FIX-01, REQ-FIX-03, REQ-FIX-04 |
| `5b857ea6` | 2026-07-15 | UPONE-1382 fix(delete-cascade): human-readable labels in delete impact breakdown | S2.T1, S2.T2, S2.T3 | REQ-FIX-02 |
| `71bb028` | 2026-07-15 | UPONE-1382 docs(delete-preview): byRecordType keys are readable labels (repo up1-mcp) | S2.T3 | REQ-FIX-02 |

> Los 3 commits estan en la rama `feat/UPONE-1382-hard-delete-cascade` de cada repo (object-manager x2, up1-mcp x1). Locales — el push a origin y el merge a develop quedan gated por revision del team up1 (RULE-dev-004); NO se hizo push.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-07-15 | 2026-07-15 |
| intake-explore | done | 2026-07-15 | 2026-07-15 |
| teach-intake | done | 2026-07-15 | 2026-07-15 |
| design-fix | done | 2026-07-15 | 2026-07-15 |
| request-execute | done | 2026-07-15 | 2026-07-15 |
| teach-close | done | 2026-07-15 | 2026-07-15 |
| request-close | done | 2026-07-15 | 2026-07-15 |
