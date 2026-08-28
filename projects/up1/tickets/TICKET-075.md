---
id: TICKET-075
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1270
module: curriculum-design
autopilot: autonomous
---

# Detalle y clonado de Curriculum no muestran los campos del RecordType (extensión rt__Plan__curriculum)

## Request

Un Curriculum tipado (recordType=Plan) se crea con datos extra que el tipo Plan exige (progression, totalCredits, totalPeriods, periodType), pero al ver el detalle esos datos no se ven, y al clonar tampoco se prellenan. Resolver mod-only que el detalle (view), la precarga del edit y el prefill del clone muestren/arrastren los campos del RecordType que viven en la extensión 1:1 rt__Plan__curriculum.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | read-path (override de resolvers genéricos en el mod) |
| Modulo principal | curriculum-design (mod) |
| Modulos afectados | curriculum-design (`logic/` resolvers). Sin tocar core (object-manager) ni layout (front) — mod-only |

**Síntoma reportado**: un Curriculum tipado (recordType=Plan) se crea con los campos extra del tipo Plan (progression, totalCredits, totalPeriods, periodType), pero al **ver el detalle** no aparecen, y al **clonar** no se prellenan.

**Causa raíz (confirmada multi-capa, DET-5)**: esos 4 campos NO son columnas de la tabla base `curriculum`; viven en la extensión 1:1 `rt__Plan__curriculum`. El **create** ya resuelve esto ruteando por el alias (`createCurriculumWithRecordType` → `createInstance(rt__Plan__curriculum)`), y el **edit-guardar** también (`updateCurriculumWithRecordType`, TICKET-074 S3). Pero el **read genérico** opera sobre la base `"Curriculum"` y no resuelve la extensión del RecordType:
- `getInstance` con `objectType="Curriculum"` entra al branch base (`instance.resolver.js:2258`) que solo incluye `ext__uplanner__curriculum`, **nunca** `rt__Plan__curriculum`. El branch que sí trae la extensión (`:2236`) requiere el alias.
- `listInstances` con `name="Curriculum"` no entra al branch RT (`:990`, regex `rt__` no matchea), así que la fila no trae `rt__` anidado → el prefill del clone (`RecordList.vue:2734`) no tiene qué copiar.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los 4 campos del Plan SÍ se persisten (no es bug de escritura) | ✓ confirmada | `createCurriculumWithRecordType` delega `createInstance(alias)` que hace el split base/ext (`curriculum-create.resolver.js`); seed siembra `rt__Plan__curriculum: {totalCredits:240, periodType:"Semester",...}` (`seed/_data-curriculum.js:106-111`); en vivo `cd_get_curriculum` lista el Plan UV-ICIV-PLAN-2026 |
| H2 | El detalle (view) lee por la base y no trae la extensión RT | ✓ confirmada | `getInstance` branch base `instance.resolver.js:2258` incluye solo `ext__uplanner__curriculum`. En vivo: `get_object("Curriculum", <id>)` (mismo path del front) devuelve las 12 columnas base, sin progression/totalCredits/totalPeriods/periodType. Front pasa `objectType=objectName.value="Curriculum"` (`RecordDetail.vue:2267`) |
| H3 | El edit precarga por el mismo getInstance → llega vacío en los 4 campos | ✓ confirmada (mismo path que H2) | `RecordDetail.fetchInstanceData` usa `GET_INSTANCE` genérico con la base; no hay rama de customEndpoint en read (`RecordDetail.vue:2255-2286`) |
| H4 | El clone (prefilledModal) se prellena desde la fila del list, que no trae `rt__` anidado | ✓ confirmada | `listInstances` no entra al branch RT con `name="Curriculum"` (`instance.resolver.js:990`). El prefill busca `rt__*` anidado o scalars top-level (`RecordList.vue:2733-2741`) → no hay nada que copiar |
| H5 | El delegate-con-alias resuelve a nivel datos/resolver (FK y branch RT casan) | ✓ confirmada | Schema: `rt__Plan__curriculum` PK/FK `curriculumId @id`, relación `curriculum→Curriculum`. Branch RT de get usa `where:{curriculum:{id}}` + `include:{curriculum,ext}` (`:2241`); de update `upsert where:{curriculumId}` (`:3495`). Split data-driven (`loadRtFieldsFromDb`) → sirve Plan/Minor |
| H6 | El RBAC del alias (`rt__Plan__curriculum:view/modify`) está asignado a los roles de currículo | ✓ confirmada (indirecto) | `updateCurriculumWithRecordType` (mod) delega `updateInstance(alias)` que chequea `rt__Plan__curriculum:modify` y pasó E2E en TICKET-074 (TC-6) → las caps del alias existen y están asignadas; `:view` por simetría. A re-verificar runtime en S1 |
| H7 | ~~Versionar arrastrar la extensión RT en la v2 NO entra en este ticket (es core)~~ → **REVISADA**: se halló vía mod-only y se abordó (scope-expansion, S1.T5) | ✓ abordada (mod-only) | TICKET-074 S2/TC-5: v2 = NULL. Inicialmente diferido a core, pero el post-create hook en `sectionValidation.createInstance` (copia la extensión source→v2 al versionar) lo resuelve mod-only sin tocar core. Confirmado en plataforma (dev: "ahora sí"). REQ-FIX-03 / TC-8 |

### Context found

- **Patrón del mod ya establecido**: el mod resuelve la asimetría base/alias con **mutations nuevas + customEndpoint** (`createCurriculumWithRecordType` en `curriculum-create.resolver.js`; `updateCurriculumWithRecordType` en `curriculum-update.resolver.js`) y con **overrides de resolvers genéricos** (`polymorphicUpdate.resolver.js` override de `Mutation.updateInstance`; `sectionValidation.resolver.js` único override de `Mutation.createInstance`).
- **Mecanismo de override mod→core**: `resolverIndex.js` hace `...dynamicResolvers.queries` (`:102`) y `...dynamicResolvers.mutations` (`:114`) **al final** → el mod gana sobre core tanto en queries como en mutations. El loader recoge cualquier export cuyo nombre contenga "query"/"mutation" (`:47-53`).
- **Por qué VER no puede ser "mutation nueva + customEndpoint"**: el front **no soporta customEndpoint en read** — `RecordDetail.fetchInstanceData` solo tiene un caso especial hardcodeado (`ReportTemplate`) y usa el `getInstance` genérico para todo lo demás. Por eso VER se resuelve con **override de `Query.getInstance`** (no con una query nueva).
- **Restricción H7 (un campo por archivo)**: dos `*.resolver.js` del mod no pueden exportar el mismo campo (el loader hace `Object.assign`, el último pisa). `getInstance`/`listInstances` no están overrideados aún → un file nuevo de read puede exportarlos.
- **Refs de código**: `object-manager/src/graphql/resolvers/instance.resolver.js` (`:990` listInstances, `:2168` getInstance, `:2236` branch RT get, `:2258` branch base, `:3403` branch RT update). `layout/src/layouts/RecordDetail.vue:2255` (fetchInstanceData), `RecordList.vue:2720-2763` (clone prefilledModal). Mod: `mods/curriculum-design/logic/curriculum-create.resolver.js`, `curriculum-update.resolver.js`, `polymorphicUpdate.resolver.js`, `sectionValidation.resolver.js`. Schema: `object-manager/prisma/UPU/schema.prisma` (model `rt__Plan__curriculum`).
- **KB relacionada**: TICKET-074 (UPONE-1270, versionado sin workflow + split RT en create/update; layer core), TICKET-065 (clonar + unicidad por linaje), TICKET-072 (deepClone de hijos en clone, ortogonal). Frente B1 (RT atómico en versión) pendiente de formalizar — NO es este ticket.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | (a crear en execute) `UPONE-1270-curriculum-rt-read` o rama de la épica del mod — definir en design-transition |
| Base branch | rama de la épica del mod (`UPONE-1261-academic-program` / la activa del mod), NO develop (RULE-dev-004) |
| DB state | tenant UPU con seed reciente; Plan `UV-ICIV-PLAN-2026` con extensión `rt__Plan__curriculum` poblada (evidencia de read) |
| Services | object-manager :4000 (reiniciar tras editar `src/` — node plano sin watch, L3 de TICKET-074); suite :3000 para E2E |
| Test data | Plans existentes (UV-ICIV-PLAN-2026, SMOKE-CUR-*) + un Minor (UV-MINOR-MAT-2026) para verificar Plan/Minor |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El delegate-con-alias en READ no puede ser incondicional: el branch RecordType del genérico hace `findFirst` sobre la fila de extensión y devuelve **null** si NO existe. Un Curriculum base SIN su fila `rt__<RT>__curriculum` (ej. **v2 versionada** cuya extensión no se arrastró — frente B1 / TICKET-074 S2) se vería como **Record Not Found**. Fix: si el delegate-con-alias devuelve null, **fallback** al `getInstance` base (el registro se muestra con sus campos base). | dev (verificación UI manual) | S1 | refined | RULE-curriculum-design-028 |
| L2 | El data-check a nivel datos (MCP) NO sustituye el path UI: validé solo Plans CON extensión (totalCredits=240) y el bug vivía en el path "registro SIN extensión" (Plan v2). Confirma la regla `feedback_ui_tc_no_override_uncovered_runtime_path` — verificar también los registros sin extensión / casos límite, no solo el happy path poblado. | llm-autopilot | S1 | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | `getInstance` override delega al alias de forma **incondicional** (si recordType + accesor existen) | El branch RT del genérico devuelve `null` cuando la fila de extensión no existe → un Plan v2 versionado (sin extensión arrastrada) daba **Record Not Found** (regresión introducida, hallada por el dev en la UI) | Agregar fallback: delegate-con-alias, y si devuelve null → `getInstance` base (L1) |

## Sessions

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Override de lectura mod-only (getInstance + listInstances) que resuelve la extensión RT, con tests y verificación E2E | 1 | T2 | S1.T1 getInstance override; S1.T2 listInstances override; S1.T3 unit+integration (TC-1..5); S1.T4 verificación runtime/E2E + RBAC (TC-6) | ⚑ estándar | TC-1..TC-6 con evidencia + reviewer pass + suite del mod = baseline + nuevos verdes |
| S2 | UX de la lista de currículo (config-only): versionar redirige al detalle + ocultar Eliminar | 2 | T1 | S2.T1 editar default_Curriculum_list.json (redirectTo view + canDelete false) + re-seed layouts + verificación UI | ⚑ light | TC-9 (versionar → detalle) + TC-10 (sin Eliminar fila/masivo) con evidencia en suite |

**Notas del plan**: layer mod (rama de la épica del mod `UPONE-1261-academic-program`, no develop — RULE-dev-004). El approach reusa el branch RT del genérico (delegate-con-alias), por eso 1 session. Riesgo concentrado en S1.T4: RBAC del alias en runtime + E2E (auth Clerk del dev = dependencia humana, punto de parada legítimo aun en super).

### Modo (autopilot)

| Timestamp | Cambio | Razón | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-18 | false → super | dev: `/dkc 075 super autopilot` | próximo gate (teach-intake) |

### Session 1 — 2026-06-18 — Override de lectura mod-only (getInstance + listInstances) [phase: execute]

**Tier**: T2 · **Gate**: ⚑ estándar · **Modo**: super autopilot

**Objetivo**: implementar el override de lectura `curriculum-read.resolver.js` en el mod, que resuelve la extensión `rt__<recordType>__curriculum` para `getInstance` (ver + precarga edit) y `listInstances` (prefill del clon), delegando al branch RT del genérico. Tests unit + integration. Verificación runtime + E2E (S1.T4 requiere auth Clerk del dev).

**Tasks completadas**:
- [x] S1.T1 — Override `getInstance` (Curriculum→alias, resto delega)
- [x] S1.T2 — Override `listInstances` (enriquecer filas Curriculum con la extensión RT)
- [x] S1.T3 — Tests unit + integration (TC-1..TC-5)
- [x] S1.T4 — Verificación runtime + E2E + RBAC del alias (TC-6)
- [x] S1.T5 — Versionado hereda la extensión RT: post-create hook en sectionValidation (copia rt__<RT>__curriculum del source a la v2) + tests (REQ-FIX-03, TC-8)

**Log:**
- S1.T1/T2: `curriculum-read.resolver.js` (override getInstance + listInstances). S1.T3: 13 unit. Suite mod 144→154.
- S1.T4: verificación en plataforma (front). Bug introducido y corregido en S1: el delegate-con-alias daba "Record Not Found" en Plan v2 sin extensión → fallback al base (L1). Después, fix de robustez (try/catch ante throw del alias, BUG-2 del review).
- S1.T5 (scope-expansion): versionado hereda la extensión via post-create hook en `sectionValidation`. Bug: el `generic.createInstance` muta `args.data` → los flags se capturan ANTES del delegate. Confirmado en plataforma por el dev ("ahora sí").

**Validación del tier (T2, ⚑ estándar)**: suite unit del mod **154/154** (132 baseline + 22 nuevos, 0 regresión). eslint + tsc de los archivos tocados: limpios. Verificación en plataforma (front, no MCP — el MCP va por detrás): dev confirmó ver/editar muestran los campos, v2 ya no da Record Not Found, y la v2 hereda la extensión.

**Quality review (DET-23)** — reviewer aislado (Agent sonnet, read-only), tier standard. Resultado: **iterate → atendido → pass**.

| # | Dimensión | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad/correctitud | pass | lógica correcta (delegate + fallback + enrich + hook idempotente) |
| 2 | Lint | pass | eslint limpio |
| 3 | Tipado | pass | tsc sin errores en archivos tocados |
| 4 | Testing | pass | 22 unit con asserts concretos (incl. regresiones L1/BUG-2) |
| 5 | Escalabilidad | pass | split data-driven (Plan/Minor), batch en list |
| 6 | Mantenibilidad | warn→ok | invariante RBAC del alias documentado inline; deuda: nuevo RecordType requiere caps del alias |
| 7 | Claridad | pass | comentarios con racional + refs |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | degradación graceful (try/catch alias + hook) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 completa: read fix (ver/editar/clonar) + versionado hereda extensión (scope-expansion). 154/154 unit, verificado en plataforma por el dev. Reviewer iterate→pass. Próximo: teach-close + commits + push.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Iterate atendido**: BUG-2 (fallback ante throw del alias) → try/catch aplicado + test; gap de test (listInstances sin items) → test agregado; emoji `⚠️` en log → mantenido por consistencia con el repo (`polymorphicUpdate.js`). 154/154 verde post-fix.

### Session 2 — 2026-06-18 — UX de la lista de currículo (config-only) [phase: execute]

**Tier**: T1 · **Gate**: ⚑ light · **Modo**: super autopilot

**Objetivo**: dos ajustes de UX en la lista de planes de estudio, config-only (mod), en `config/layouts/default_Curriculum_list.json`:
1. Versionar (`create-new-version`) redirige al **detalle** en vez del edit (`redirectTo` edit→view). Coherente con el read fix de S1, que ya hace que el detalle muestre los campos del RecordType y que la v2 herede la extensión.
2. Ocultar **Eliminar** — un Curriculum es versionado, no se borra. `canDelete` true→false oculta tanto la action por fila como el borrado masivo (ambos cuelgan de `effectiveCanDelete`, RecordList.vue:2486/272). El flag explícito sobreescribe el RBAC (useRbacPermissions.ts:113).

**Tasks completadas:**
- [x] S2.T1 — Editar `default_Curriculum_list.json` (redirectTo view + canDelete false) + re-seed layouts + verificación UI (TC-9, TC-10)

**Causa raíz (multi-capa, DET-5)**:
- Navegación: el handler de la create-action redirige según `action.redirectTo` (default 'edit') — `useCreateRowAction.ts:144`. El valor 'view' (→ `handleView`, detalle) ya está soportado y lo usa "Duplicar".
- Delete: "Eliminar" es una default action que `RecordList.getDefaultActions()` agrega siempre que `effectiveCanDelete` sea true. `canDelete:false` en el layoutConfig fuerza el override explícito sobre el RBAC.

**Log:**
- Config editada (`redirectTo` edit→view, `canDelete` true→false).
- `node scripts/sync.js` corrido OK (3/3, object-manager 23s, PHASE 5 layouts → DB del tenant; UPU no frozen).
- **Verificación a nivel DB** (`up1_layen_layout` del tenant UPU, query directa pg): `canDelete=false`, `rowActions[0]=create-new-version` con `redirectTo="view"`, `updatedAt` = timestamp del sync. La fila quedó pisada.
- OM NO requiere restart: el layout.resolver lee `up1_layen_layout` por request (sin cache en memoria). Refresh normal del browser toma el cambio.
- **Verificación UI**: el dev confirmó en la suite ("funciona") — versionar va al detalle y "Eliminar" ya no aparece (fila ni masivo).

**Validación del tier (T1, ⚑ light)**: cambio config-only (JSON de layout), sin código. Suite unit del mod **751/751** (45 files, 0 regresión) — el cambio no toca lógica, las dos líneas de config se aplicaron y verificaron en DB + UI. Mecanismos (`redirectTo:'view'`, `canDelete:false`) preexistentes y ya cubiertos por tests del layout-engine.

**Quality review (DET-23)** — tier light (config-only, sin lógica). Self-review:

| # | Dimensión | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad/correctitud | pass | 2 valores de config; mecanismos validados en DB + UI |
| 2 | Lint | n/a | JSON (válido, parseado por el sync sin error) |
| 4 | Testing | pass | 751/751; sin regresión. Cambio no testeable por unit (config DB-driven) → cubierto por verificación DB + UI |
| 5–7 | Escalabilidad/Mant./Claridad | pass | usa flags estándar del layout-engine, sin código custom |
| 10 | Error handling | n/a | config |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 completa: UX de la lista (versionar→detalle + sin Eliminar) aplicada, sync OK, verificada en DB y por el dev en la suite. Cierra el ticket.
- [ ] iterate
- [ ] escalate
- [ ] standby

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-1 | Ver detalle de un Plan muestra los 4 campos del RecordType | REQ-FIX-01 | auto+manual | Plan con `rt__Plan__curriculum` poblada (UV-ICIV-PLAN-2026) | abrir detalle (view) | progression/totalCredits/totalPeriods/periodType visibles con sus valores | **✓** Datos: MCP get_object trae los 4 campos (240/Semester/…). **UI: dev confirmó en la suite** que el detalle muestra los datos extra | MCP runtime + dev (suite) | S1 | pass |
| TC-2 | Editar un Plan precarga los 4 campos en el form | REQ-FIX-01 | manual | TC-1 | abrir edit | form precargado con los valores (no vacíos) | **✓** dev confirmó en la suite: el form de edición (incl. la vista post-versionado) carga los datos extra en los inputs | dev (suite) | S1 | pass |
| TC-3 | Clonar (Duplicar) un Plan prellena los 4 campos en el modal | REQ-FIX-02 | auto+manual | Plan poblado | row action Duplicar | modal create prellenado con progression/totalCredits/… (code vacío) | **✓ datos** (listInstances enriquecido trae los campos top-level); comparte el read ya validado en front. Confirmación UI explícita del clon = opcional (no bloqueante, mismo path de datos) | MCP runtime + unit | S1 | pass (datos; UI clon opcional) |
| TC-4 | Minor (sin campos Plan) no rompe ni muestra campos espurios | REQ-FIX-01 | auto+manual | Minor | ver | sin error; campos Plan-only no aparecen | **✓** MCP `get_object("Curriculum", <Minor>)`: devuelve campos base del Minor, SIN progression/totalCredits/etc. Sin error | MCP runtime | S1 | pass |
| TC-5 | Regresión: getInstance/listInstances de objetos NO-Curriculum sin cambio | REQ-REGRESSION-01 | auto | cualquier objeto base | get/list | shape idéntico al generic (delega sin tocar) | **✓** unit (no-Curriculum delega con args sin tocar) + OM sirve otros objetos sin error post-restart | unit + log OM | S1 | pass |
| TC-6 | RBAC: rol con `curriculum:view` ve el detalle vía el delegate-con-alias | REQ-REGRESSION-01 | auto+manual | rol de currículo real | abrir detalle | sin auth error (cap `rt__Plan__curriculum:view` resuelve) | **✓** dev (rol real en la suite) versionó/vió/editó Planes sin auth error → la cap del alias resuelve por el path del front | dev (suite) + MCP | S1 | pass |
| TC-7 | REGRESIÓN: Plan v2 versionado SIN fila de extensión NO da "Record Not Found" | REQ-REGRESSION-01 | auto+manual | Plan v2 sin `rt__Plan__curriculum` | abrir detalle/versionar | el registro se muestra (campos base) vía fallback, no error | **✓** dev confirmó en la suite: versionar ya va a la vista del elemento (no Record Not Found). Datos: get_object v2 devuelve el registro (fallback). Unit verde | dev (suite) + MCP + unit | S1 | pass |
| TC-8 | Versionar un Plan: la v2 hereda la extensión RT (datos extra) | REQ-FIX-03 | auto+manual | Plan con extensión poblada | row action "Crear nueva versión" → abrir v2 | la v2 muestra progression/totalCredits/… heredados del source | **✓** dev confirmó en la suite ("ahora sí"): tras el fix (capturar flags antes del delegate), la v2 carga los datos extra en los inputs. Unit (hook copia source→v2) verde | dev (suite) + unit | S1 | pass |
| TC-9 | Versionar un Plan abre el **detalle** (view), no el edit | REQ-FIX-04 | manual | Plan en la lista; layouts re-seedeados | row action "Crear nueva versión" | tras crear la v2, navega a la vista de detalle del nuevo registro (no al formulario de edición) | **✓** Datos: DB `up1_layen_layout` → `redirectTo="view"` post-sync. **UI: dev confirmó en la suite** ("funciona") | DB (pg query) + dev (suite) | S2 | pass |
| TC-10 | La lista de currículo NO ofrece Eliminar (fila ni masivo) | REQ-FIX-04 | manual | Plan en la lista; layouts re-seedeados | abrir el menú de acciones de una fila + seleccionar filas | no aparece "Eliminar" en el menú de fila ni el botón de borrado masivo del toolbar | **✓** Datos: DB `up1_layen_layout` → `canDelete=false` post-sync. **UI: dev confirmó en la suite** ("funciona") | DB (pg query) + dev (suite) | S2 | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Unit + integration del mod | `npx vitest run` | 132 baseline (S1) | 751 (45 files) | +22 nuevos S1; S2 config sin tests (DB-driven); 0 regresión |

## Summary

Mod-only sobre `curriculum-design`, épica UPONE-1270. Resuelto en 2 sessions:

**S1 — read fix (ver/editar/clonar) + versionado hereda extensión RT.** El detalle, la precarga del edit y el prefill del clon de un Curriculum tipado (recordType=Plan/Minor) no mostraban los campos que viven en la extensión 1:1 `rt__<RT>__curriculum` (progression, totalCredits, totalPeriods, periodType), porque el read genérico opera sobre la base `"Curriculum"` y no resuelve la extensión. Fix: override mod-only `curriculum-read.resolver.js` de `getInstance` (ver + precarga edit) y `listInstances` (prefill clon) que delega al branch RT del genérico con **fallback al base** si la fila de extensión no existe (Plan v2 sin extensión → no "Record Not Found"). Scope-expansion: el versionado ahora **hereda** la extensión vía post-create hook en `sectionValidation` (copia source→v2). 22 unit nuevos.

**S2 — UX de la lista de planes de estudio (config-only).** En `default_Curriculum_list.json`: (1) versionar redirige al **detalle** en vez del edit (`redirectTo` edit→view) — coherente con el read fix de S1; (2) **Eliminar** oculto (fila + masivo) — un Curriculum es versionado, no se borra (`canDelete` true→false, override explícito del RBAC). Aplicado vía `node scripts/sync.js` (PHASE 5 → `up1_layen_layout`), verificado en DB y por el dev en la suite. OM no requiere restart (el resolver lee la fila por request).

**Evidencia de cierre**: TC-1..TC-10 pass (datos MCP/DB + UI dev en la suite). Suite del mod 751/751, 0 regresión. Reviewer S1 iterate→pass; S2 self-review light (config). Sin tocar core ni front.

**Deuda registrada**: un RecordType nuevo de Curriculum requiere las caps del alias `rt__<RT>__curriculum:view/modify` asignadas a los roles (documentado inline en el resolver, dim. mantenibilidad).
