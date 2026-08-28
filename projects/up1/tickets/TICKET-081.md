---
id: TICKET-081
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1344
module: curriculum-design
autopilot: autonomous
---

# Malla — Ajustes de modelo base del plan (progression + isCurrent)

> **MC-01** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "Track 0") · Tier 🅼 Must · 2 SP · repo `mod` · Fase F0.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-01.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-01.md) — transcrito abajo (§Pre-spec). El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ✅ Gate de inicio — sin dependencias

> Primer ticket del sprint (MC-01) · `depends_on: []`. **Listo para arrancar.** Al cerrarlo habilita MC-02 ([TICKET-082](TICKET-082.md)), que gatea casi todo el resto.

## Request

Como diseñador curricular, quiero que el plan declare su tipo de progresión y que las asignaturas marquen su versión vigente, para que el sistema interprete bien la malla y el catálogo muestre los cursos correctos.

Agrupa BE-0 + BE-1 (handoff). Dos campos aditivos en JSON del mod: `rt__Plan__curriculum.progression` pasa de string libre a enum cerrado {Sequential, Modular} (default Sequential), y `Activity.isCurrent` boolean (default true, not_null, label "Vigente") como flag de versión vigente — sin lógica de versionado (eso es SP6). `isCurrent` lo consumirá el picker de la malla (MC-06).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | data model (2 campos aditivos sobre objetos existentes; `progression` string→enum, `isCurrent` nuevo) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); consumidores de `progression` por verificar (impacto colateral) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | sin UI nueva (solo columna/filtro `isCurrent` en RecordList estándar) |
| Data model | no* | campos aditivos sobre objetos existentes, no objeto nuevo → DET-32 = reduce. (*sin data-model nuevo; el draft de DET-18 no aplica) |

## Triage

REQs **confirmados** en el pre-spec (no hay hipótesis abiertas). El trabajo es modelado aditivo de bajo riesgo; el único riesgo es el impacto colateral del cambio de tipo de `progression` (string→enum).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `progression` ya existe como string libre; cerrarlo a enum no rompe consumidores | ✓ confirmed (con caveats H1.1–H1.3) | **schema**: `objects/RecordTypes/rt__Plan__curriculum.json:11` define `progression` como `string` libre con `[NEEDS CLARIFICATION]`. `periodType` (misma RT, L29-35) es el patrón exacto a copiar: `enum` + `not_null:false` + labels i18n. **backend (resolvers)**: `curriculum-{create,read,update}.resolver.js` y `sectionValidation.resolver.js:130` solo lo mencionan en comentarios — son **field-agnostic pass-through** (rutean los campos del RT a la extensión 1:1), no validan el valor → cambiar string→enum NO los rompe. Consumidores que SÍ requieren cambio: seed (H1.1), layouts (H1.2). Fuera de scope: MCP (H1.3). |
| H1.1 | El seed del mod tiene un valor de `progression` compatible con el enum {Sequential, Modular} | ✗ refuted | **seed**: `seed/_data-curriculum.js:31` setea `progression: 'Credits'` — valor NO presente en el enum propuesto. Cerrar el enum rompería el seed/validación. → T3 DEBE actualizar el seed a un valor válido (`Sequential`). `_data-curriculum.js:99` lo mapea por passthrough. Esto valida la necesidad de REQ-03 (migración) también para data viva en UPU. |
| H1.2 | El layout de Curriculum renderiza `progression` de forma compatible con un enum | ~ partial → requiere cambio | **frontend (layout)**: `config/layouts/default_Curriculum_{create,edit,view}.json` renderizan `progression` como `{ "type": "text" }` (input libre). Para honrar enum + labels i18n (Secuencial/Modular) de REQ-01, el widget DEBE pasar a `type: select`. Mod-scoped (config/layouts). Verificar en execute cómo renderiza `periodType` (mismo enum-en-RT) para copiar el patrón exacto. |
| H1.3 | El MCP (repo hermano, P3) consume `progression` y se ve afectado por el cierre a enum | ✓ confirmed — **propagación fuera de scope (DET-16)** | **MCP** (`/Users/edobacon/Workspace/uplanner/mcp`, repo independiente, P3 NO modifica up1): `src/mods/curriculum-design/curriculum-write.ts:99,162` y `registry.ts:350` declaran `progression: z.string()`. Tras cerrar el enum, el MCP podría enviar valores inválidos → backend rechaza. **NO está en execute_scope** (mod-only). → follow-up para módulo `up1-mcp` (tracking propio, ver TICKET-080). Se registra como propagación, no se toca en este ticket. |

### Context found

**KB del módulo (kb_refs: DEC-027, DEC-028):**
- mod-only; no commitear artefactos de sync/seed (Base, schema, typeDefs).
- Campos aditivos sobre `Curriculum`/`rt__Plan__curriculum` y `Activity`.

**Necesidad/reuso (DET-32):** ambos son **campos aditivos** sobre objetos existentes → **reduce** (no objetos nuevos). `progression` ya existe como `string` libre (audit C-1) → solo se cierra a enum.

**Supuestos:** los planes existentes migran a `Sequential` sin pérdida; `isCurrent` es solo flag (lógica automática de vigencia → SP6, BL-1).

**Impacto colateral (obligatorio):** buscar consumidores de `progression` (resolvers / componentes / MCP) antes de cambiar el tipo.

## Pre-spec (transcrito de MC-01.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · `progression` enum cerrado | confirmed | reunión 00:43:40 / 01:10:58 + audit C-1 | `rt__Plan__curriculum.progression` DEBE ser enum `["Sequential","Modular"]`, `static_default: "Sequential"`, sin NEEDS CLARIFICATION; labels i18n (Secuencial/Modular). |
| REQ-02 · `isCurrent` en `Activity` | confirmed | reunión 01:06:46 / 01:09:13 + §dec-2 | `Activity.isCurrent` DEBE ser boolean, `static_default: "true"`, not_null. Label "Vigente". Sin lógica de versionado (solo flag). |
| REQ-03 · Migración de planes existentes | inferred | consecuencia de REQ-01 | El sync DEBE correr limpio en UPU; los `Curriculum(Plan)` existentes DEBEN quedar en `Sequential`. |
| REQ-04 · `isCurrent` visible/filtrable | confirmed | §dec-2 (para el picker) | `isCurrent` DEBE ser columna/filtro en el RecordList de Activity y consumible por el picker de MC-06. |

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | `rt__Plan__curriculum.json`: `progression` → enum + default + lang (REQ-01) | revertir a `string` (aditivo) |
| T2 | `activity.json`: `isCurrent` boolean + lang + columna RecordList (REQ-02, 04) | quitar campo (aditivo) |
| T3 | Análisis de impacto de `progression` + seed con valores | — |

### Dependencias

- **Depende de:** ninguna (arranca primero).
- **Habilita:** MC-02 (regla de `period` por `progression`), MC-06 (picker usa `isCurrent`).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU; verificar sync limpio tras el cambio de tipo |
| Services | object-manager (sync), suite (RecordList de Activity) |
| Test data | seed del mod (Curriculum/Activity) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Las fixtures de los unit tests del resolver de curriculum usan valores de `progression` fuera del nuevo enum (`'Linear'` en curriculumCreate.test.js:41,74,88; `'Credits'` en curriculumVersionInherit.test.js y curriculumRead.test.js). Los 33 tests siguen pasando porque los resolvers son field-agnostic pass-through (rutean los campos del RT a la extensión 1:1 SIN validar el enum — la validación del enum es codegen/backend post-sync, no resolver-level). No modifiqué las fixtures (regla: no tocar tests sin aprobación + no son incorrectas como tests de pass-through). Implicación: la verificación real de TC-01 ("rechaza Foo") es backend post-sync (T3), no unit. Las fixtures podrían alinearse al enum en un follow-up de coherencia. | developer | #1 | discarded | follow-up opcional: alinear fixtures al enum |
| L2 | El codegen de up1 NO genera tipos enum (GraphQL/Prisma) para campos de RecordType-extension (`rt__*`): tras el sync, `rt__Plan__curriculum.progression` quedó como `String?` en el schema UPU y `progression: String` en typeDefs (igual que `periodType`). En cambio, los campos enum de objetos base SÍ generan tipos (ActivityRecordType, ActivityProgramLevel, ActivityPurpose…). Implicación: el `enum` declarado en el JSON de un rt__ es SOFT — enforza en la UI (widget select con items) y en el contrato del MCP (z.enum, TICKET-090), pero el backend GraphQL/DB acepta cualquier string (no rechaza 'Foo' a nivel API). Por eso TC-01 "rechaza Foo" se cumple a nivel UI+MCP, no a nivel API cruda. Si se quisiera enforcement duro de progression en el backend habría que un cambio de codegen para rt__ enums (could-have, fuera de scope; aplica igual a periodType). `isCurrent` (campo de objeto base Activity) sí quedó `Boolean? @default(true)` + expuesto en GraphQL. | developer | #1 | refined | RULE-curriculum-design-016 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25 | open → super | dev invocó `/dkc 081 super autopilot` | intake (este ticket) |

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria específicos) lo completa `design-feature` al generar el spec. La session puede subdividirse durante execute si el tamaño real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Cerrar `progression` a enum + agregar `isCurrent` boolean + RecordList; sync limpio en UPU; seed válido | 1 | T2 | T1 (progression enum + i18n), T2 (isCurrent + RecordList + i18n), T3 (impacto + seed + sync) | ⚑ fuerte | sync corre limpio; planes existentes quedan `Sequential`; TC-01..04 con evidencia; reviewer aislado sin findings bloqueantes |

**Notas del esqueleto**:
- **Numeración continua** (DET-20): sin Session previa registrada → el plan arranca en S1.
- Riesgo concentrado en T1 (cierre de enum sobre data viva con valor `'Credits'` en seed → H1.1) y T3 (sync limpio en UPU, REQ-03). Por eso gate ⚑ fuerte con reviewer aislado (DET-30).
- Propagación al MCP (H1.3) NO entra en esta session — es follow-up del módulo `up1-mcp`.

### Session 1 — 2026-06-25 — modelo base: progression enum + isCurrent + sync limpio [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: cerrar `progression` a enum {Sequential, Modular}, agregar `Activity.isCurrent` boolean + columna RecordList, y correr el sync limpio en UPU dejando los planes existentes en `Sequential`.

**Tasks completadas**:
- [x] S1.T1 — `progression` → enum {Sequential, Modular} + default + lang + widget select (REQ-01)
- [x] S1.T2 — `Activity.isCurrent` boolean + lang + columna RecordList (REQ-02, REQ-04)
- [x] S1.T3 — análisis de impacto + seed válido + sync limpio en UPU (REQ-03)
- [x] S1.GATE — gate de sync Session 1 (T2): quality review aislado + TC-01..04 + decision

**Validación del tier** (T2): suite del mod `npx vitest run` = **748/748 PASS** (45 files), 0 regresión. JSON de los 12 archivos source parsean. Sync UPU (runtime de TC-01..04) NO ejecutado — DB-gated, diferido al dev.

**Quality review (DET-23)** — loop dual-judge (DET-35, T2): 2 jueces ciegos `balanced` en paralelo + síntesis. Reviewer aislado (DET-30) en contexto limpio, read-only. Self-report verificado (DET-33): git status del submódulo limpio (solo 12 source, sin contaminación), suite re-corrida 748/748.

| Dimensión | Veredicto | Nota |
|-----------|-----------|------|
| 1. Calidad/corrección | pass | enum sigue patrón `periodType`; `isCurrent` sigue `appearsInDiploma`; items↔enum↔lang coherentes |
| 2. Lint/formato | pass | 12 JSON parsean |
| 3. Tipado/schema | pass | enum + static_default string (convención del mod) |
| 4. Testing | warn | 748 PASS sin regresión; TC-01/03/04 runtime pendientes sync; sin tests vitest nuevos (enum es backend-enforced) → backlog B2 |
| 5. Escalabilidad | pass | aditivo, sin objetos nuevos |
| 6. Mantenibilidad | warn | fixtures de tests usan valores fuera del enum (L1) → backlog B2 |
| 7. Claridad | pass | descripciones de campo claras |
| 8. A11y | n/a | sin UI nueva (config de layout estándar) |
| 9. Storybook | n/a | mod-only sin componentes |
| 10. Error-handling | n/a | declarativo |

**Veredictos dual-judge:**

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| `isCurrent` ausente en Activity view | — | iterate | WARNING-real | **confirmed → FIXEADO** (agregado a default_Activity_view.json) |
| Curriculum view progression = `text` (muestra key cruda) | (acepta) | iterate | WARNING-real | suspect → **aceptado**: consistente con `periodType` (todo el view del mod usa text para enums) |
| Fixtures de tests fuera del enum (`'Credits'`/`'Linear'`) | iterate | — | WARNING-real | suspect → backlog B2 (tocan tests; enum backend-enforced) |
| Sin tests vitest nuevos TC-01/03/04 | iterate | — | WARNING-real | suspect → backlog B2 |
| en/pt Curriculum lang sin labels de progression | — | iterate | WARNING-real | suspect → backlog B3 (UPU mono-locale; items hardcoded en layout) |
| lang-enums.test no cubre rt__Plan__curriculum | iterate | — | WARNING-theoretical | INFO → backlog B2 |

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

**Resultado global**: APPROVED a nivel código (cero CRITICAL, cero WARNING-real dual-confirmado; el único gap claro — `isCurrent` en view — fue fixeado y re-verificado). Jueces: balanced (A+B), sin disputa → sin adjudicador `reasoning`. Decisión de gate = **standby** por dependencia externa (sync UPU DB-gated), no por calidad de código.

**Commit DET-27**: `1b8d874` UPONE-1344 feat(curriculum-design): progression enum + Activity.isCurrent (mod `curriculum-design`, rama `UPONE-1267-sp5`, modo limpio por `external`)

```dkc:gate-telemetry
session: S1.GATE
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 2470
est_tokens: 667
span_seconds: 4200
```

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01 | unit | verified (UI+MCP enforzado; backend String soft — rt__ enum no genera tipo, igual que periodType) |
| REQ-03 | TC-02 | manual | verified (sync corrió limpio; schema UPU regenerado con progression+isCurrent; seed Sequential) |
| REQ-02 | TC-03 | unit | verified (Boolean? @default(true) en schema UPU post-sync) |
| REQ-04 | TC-04 | unit | verified (isCurrent: Boolean en GraphQL + columna filterable en RecordList) |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | `progression="Modular"` / `"Foo"` | REQ-01 | unit | objeto con enum | crear/editar Plan con cada valor | acepta `Modular` / rechaza `Foo` | Post-sync: UI ofrece select Secuencial/Modular; MCP valida `z.enum` (TICKET-090). En el backend GraphQL/Prisma `progression` quedó `String?` (no genera tipo enum para rt__, **igual que periodType** — ver L2): "rechaza Foo" se cumple en UI+MCP, NO a nivel API cruda. | `prisma/UPU/schema.prisma:2206` (`progression String?`); `typeDefs/dynamic.js:2181`; mcp `registry.ts` | **verified** (UI+MCP; backend String soft, consistente con periodType) |
| TC-02 | sync en UPU con plan v1 | REQ-03 | manual | plan existente string | correr sync | plan queda `Sequential`, sin error | Sync corrido por el dev. Schema UPU regenerado con `progression String?` + `isCurrent Boolean? @default(true)`. Sin fallo de migración (columna String, no enum DB). Seed → `Sequential`. | `prisma/UPU/schema.prisma:2206,779` | **verified** (sync limpio + modelo propagado) |
| TC-03 | seed de Activity | REQ-02 | unit | seed | crear Activity sin setear `isCurrent` | `isCurrent=true` por defecto | Post-sync: `isCurrent Boolean? @default(true)` en schema UPU + `isCurrent: Boolean` en GraphQL → default true al crear sin setearlo. | `prisma/UPU/schema.prisma:779`; `typeDefs/dynamic.js` | **verified** (default true a nivel schema) |
| TC-04 | filtrar RecordList por `isCurrent` | REQ-04 | unit | activities mixtas | filtrar por `isCurrent=true` | discrimina vigentes | `isCurrent: Boolean` expuesto en GraphQL typeDefs (campo real, queryable) + columna `filterable:true` en RecordList + visible/editable en view/edit. | `typeDefs/dynamic.js:65`; `default_Activity_list/edit/view.json` | **verified** (campo GraphQL real + columna filterable) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| unit+integration mod | `npx vitest run` | 748 pass (45 files) | 748 pass (45 files) | sin regresión; objetos existentes (Curriculum/Activity) intactos |

## Commits

| Hash | Fecha | Header | Tasks | REQs |
|------|-------|--------|-------|------|
| `1b8d874` | 2026-06-25 | UPONE-1344 feat(curriculum-design): progression enum + Activity.isCurrent | S1.T1, S1.T2, S1.T3 | REQ-01, REQ-02, REQ-03, REQ-04 |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad | Status |
|---|------|-----|----------|------------|--------------|-----------|--------|
| B1 | Correr sync limpio en UPU + verificar TC-02 (planes existentes → `Sequential`, sin error) | REQ-03 | S1.T3 de SPEC-curriculum-design-plan-progression-iscurrent | Cambios de modelo committeados en rama `UPONE-1267-sp5` del mod; seed migrado a `Sequential`. Sync NO ejecutado (DB-gated, posible migración de data `'Credits'`→`Sequential` en UPU). | El dev corre el sync del mod en UPU (object-manager) — interactivo por el guard AI de Prisma. Verificar: sync termina sin error; `Curriculum(Plan)` existentes quedan con `progression ∈ {Sequential, Modular}`; crear Plan con `Modular` (acepta) y `Foo` (rechaza) → cierra TC-01/02/03/04 runtime. Tras sync, reiniciar OM. | **must** | open |
| B2 | Alinear cobertura de tests al enum: fixtures de `progression` (`'Credits'`/`'Linear'`) a valores del enum + test de consistencia para `progression`/`isCurrent` | REQ-01, REQ-02 | dual-judge S1.GATE (Judge A) | `tests/unit/curriculum{Create,Read,VersionInherit}.test.js` con fixtures fuera del enum (pasan por pass-through); `tests/integration/lang-enums.test.ts` no cubre `rt__Plan__curriculum`. | Con OK del dev (regla: no tocar tests sin aprobación): actualizar fixtures a `Sequential`/`Modular`; extender `lang-enums.test.ts` para cubrir `progression`. | should | open |
| B3 | Labels i18n de `progression` (Secuencial/Modular) en locales en/pt si UPU deja de ser mono-locale | REQ-01 | dual-judge S1.GATE (Judge B) | Solo `lang/es_CL@Curriculum.json` tiene `enums.progression`; no existen `en_CL@Curriculum.json`/`pt_BR@Curriculum.json` (mismo estado que `periodType`). Los `items` del select están hardcoded en el layout. | Si se agrega multi-locale: crear `en_CL@Curriculum.json`/`pt_BR@Curriculum.json` con `enums.progression`. Hoy UPU es mono-locale es_CL → impacto nulo. | could | open |
| B4 | (propagación, otro repo) Alinear `progression: z.string()` → enum en el MCP de up1 | — | DET-16 / H1.3 | Repo MCP (`/Users/edobacon/Workspace/uplanner/mcp`): `curriculum-write.ts` + `registry.ts`. | **RESUELTO** en [TICKET-090](TICKET-090.md) (tactic, módulo up1-mcp) — commit MCP `77be85c`: `progression` enum en contrato (espeja `periodType`). | should | resolved → TICKET-090 |

> **DET-17**: B1 (`must`) RESUELTO — el dev corrió el sync en UPU (2026-06-25); schema regenerado con `progression String?` + `isCurrent Boolean? @default(true)`, verificado contra `prisma/UPU/schema.prisma` + `typeDefs`. TC-01..04 verificados (TC-01 con caveat documentado: enum soft en rt__, ver L2). Ya no bloquea el cierre.

## Summary

**Estado: standby (S1 cerrada, código committeado, pendiente sync del dev).**

Session 1 (super autopilot) implementó el modelo base de MC-01, mod-only, todo aditivo:
- **REQ-01**: `rt__Plan__curriculum.progression` string libre → enum `["Sequential","Modular"]` (default `Sequential`) + labels i18n + widget `select` en layouts create/edit (replicando `periodType`).
- **REQ-02**: `Activity.isCurrent` boolean `not_null` default `true` (label "Vigente"); editable en edit, visible en view.
- **REQ-04**: columna `isCurrent` filtrable en el RecordList de Activity.
- **REQ-03**: seed migrado `'Credits'`→`'Sequential'`; impacto verificado (resolvers pass-through, 748/748 tests sin regresión).

Commit código: `1b8d874` (mod, rama `UPONE-1267-sp5`). Dual-judge (DET-35) APPROVED — único gap (`isCurrent` ausente en Activity view) fixeado y re-verificado.

**Cierre (2026-06-25)**: el dev corrió el sync en UPU. Verificado contra los artefactos regenerados (`prisma/UPU/schema.prisma`, `typeDefs/dynamic.js`): `isCurrent Boolean? @default(true)` + `progression String?`. TC-01..04 verificados — con un caveat documentado (L2): el codegen de up1 NO genera tipo enum para campos `rt__*`, así que `progression` queda `String` en backend y el enum es **soft** (enforzado en UI + MCP, no a nivel API cruda), exactamente como `periodType`. Backlog B1 (`must`) resuelto. Sin items bloqueantes restantes (B2/B3 son should/could).

**Propagación cerrada**: el contrato del MCP se alineó al enum en [TICKET-090](TICKET-090.md) (commit MCP `77be85c`).

**Commits**: código mod `1b8d874` (rama `UPONE-1267-sp5`) · MCP `77be85c` · records DKC en deckard (`up1-sp5`). **Push pendiente de OK del dev** en los tres repos. Al mergear, habilita MC-02 ([TICKET-082](TICKET-082.md)).
