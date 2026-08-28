---
id: TICKET-062
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1271
module: curriculum-design
autopilot: autonomous
---

# academicProgram · Clonar

> Ticket del SP4 creado **previo a intake** con todo el contexto, lo decidido y lo planificado embebido (autosuficiente — no referencia docs externos). Validado contra el modelo real (model-v2) el 2026-06-12.

## Request

> Ticket externo: [UPONE-1271](https://u-planner.atlassian.net/browse/UPONE-1271) — épica de la familia academicProgram (Curriculum Design). Confirmar id de épica en intake (DET-19).

Agregar la acción **"Clonar"** sobre el `academicProgram` (carrera). No es una vista nueva: opera sobre el recordList/detalle ya entregados por UPONE-1260. El usuario ve un row-action "Duplicar" en el recordList (o en el detalle) que copia el programa con nuevo `id`, mismos campos escalares (prefill), nace en estado `Draft`, con `code` nuevo.

### Decisiones acordadas con el dev (pre-intake)

- **D-A** (mecanismo): reusar el primitivo `cloneStrategy: "prefilledModal"` (TICKET-052), ya existente y probado. Es **config pura**, sin backend, sin core, sin MCP obligatorio.
- **D-B** (sin deepClone): `academicProgram` no tiene hijos → el clon copia solo escalares (no hay malla ni secciones que arrastrar).
- **D-C** (identidad): el modal de creación abre **prellenado con todos los campos MENOS `code`** (queda vacío). Al guardar, el `@@unique[institutionId, code]` valida (enforcement real); cancelar no deja nada (no se crea hasta guardar).
- **D-D** (estado inicial): el clon nace en `Draft` (create estándar vía `getInitialStatus`).

Plan de config (config pura, 4 cambios + validación):
1. Bloque `prefillFrom` en `objects/AcademicProgram.json` + `requiredCapability: "academicprogram:clone"`.
2. RowAction "Duplicar" en `config/layouts/default_AcademicProgram_list.json`: `{ "type":"create", "cloneStrategy":"prefilledModal", "uniqueFields":["code"], "requiredCapability":"academicprogram:clone", "label":"Duplicar" }`.
3. Capability `academicprogram:clone` (RBAC).
4. `npm run sync` (RULE-mods-003) + restart object-manager. Tests (RULE-dev-006).

Recorrido del usuario: "Duplicar" → modal prellenado con todo menos `code` (vacío) → guardar → `@@unique` valida → clon en `Draft`. Cancelar → nada.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (nueva acción de clonado sobre objeto existente) |
| Tipo de cambio | single (mod curriculum-design: objeto + layout + capability) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design (config). object-manager: solo `sync`/codegen |

## Triage

Complejidad estimada: **baja (S, ~1 SP)**. Config declarativa reusando un primitivo ya probado; sin backend, sin core, sin cambio de schema. Es el ticket más liviano del SP4; habilitado por 1260 (hecho).

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El primitivo `cloneStrategy: "prefilledModal"` se reusa tal cual (config pura, sin core) | ✓ confirmada | TICKET-052. Doc `layout/src/types/recordlist.ts:226-240`; impl `layout/src/layouts/RecordList.vue:2704`. Config real en uso: `default_Activity_edit.json` (duplicar modalidad) |
| H2 | El `@@unique[institutionId, code]` da enforcement REAL al guardar (rechaza code repetido) | ✓ confirmada | `academicProgram` declara `uniqueConstraints [[institutionId, code]]` + `code.uniqueScopedBy [institutionId]` (TICKET-061 I5). Es el único objeto de la familia con backstop de DB |
| H3 | `academicProgram` no tiene hijos → sin `deepClone` | ✓ confirmada | model-v2: la carrera es contenedor plano, sin RecordTypes, sin hijos, sin versionado |
| H4 | La `@@unique` está realmente aplicada en la DB del tenant (no solo declarada) | inferred → validar empírico en S1 | `academicProgram` declara `uniqueConstraints [[institutionId, code]]` (backstop de DB real, único de la familia — TICKET-061 I5): evidencia indirecta fuerte de que está aplicada. Pero el gotcha TICKET-054 (`uniqueScopedBy` config-driven falla silencioso si el sync no aplicó la `@@unique`) impide confirmar sin tocar la DB. **Plan**: primera validación de S1 = inspeccionar `@@unique([institutionId, code])` en la DB de UPU antes de confiar en el enforcement; TC-3 (code duplicado rechazado) la cierra empíricamente. |

### Context found

- **Objeto (model-v2):** `academicProgram` es la **carrera** — contenedor plano (campos + FKs), **sin RecordTypes, sin hijos, sin versionado** (se modifica in-place o se descontinúa). Vista y objeto ya entregados en UPONE-1260 ([ticket-059](ticket-059.md), cerrado; endurecimiento server-side en [ticket-061](ticket-061.md)).
- **Unicidad:** `uniqueConstraints [[institutionId, code]]` + `code.uniqueScopedBy [institutionId]`. Efecto al clonar: la DB **rechaza** un clon con el mismo `code` en la misma institución → el clonado debe regenerar/pedir `code`. **Único objeto de la familia con backstop real de DB** (los demás dependen de la app).
- **Primitivo de clonado:** `prefilledModal` (TICKET-052) — abre modal de create prellenado con escalares del source **EXCEPTO `uniqueFields`** (vacíos). No crea hasta guardar → cancelar no deja nada, y una violación de unicidad nunca deja un registro a medias. Copia **solo escalares** (`typeof v !== 'object'`), no hijos.
- **Rules del módulo:** `RULE-mods-003` (**must**): `npm run sync` tras tocar objeto/layout. `RULE-dev-006` (**must**): tests + verificar arranque del servicio post-sync.
- **Dependencia:** UPONE-1260 (vista de academicProgram) — **hecho** ([ticket-059](ticket-059.md)).
- **Warnings:**
  1. ⚠️ **Gotcha TICKET-054 (config-driven enforcement):** `uniqueScopedBy` declarativo **falla silencioso** si la DB del tenant no tiene la `@@unique` real. Verificar en la DB de UPU que `@@unique([institutionId, code])` está aplicada antes de confiar en el enforcement del clonado.
  2. ⚠️ El restart de object-manager post-`sync` es obligatorio (sin hot-reload de typedefs del mod).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica de academicProgram / UPONE-1271 (confirmar nombre y base en intake; DET-19) |
| Base branch | `develop` |
| DB state | sin cambio de schema (config pura) → `npm run sync` + restart object-manager |
| Services | object-manager (GraphQL :4000), suite |
| Test data | el seed Univalle/AIEP ya crea academicPrograms ([ticket-059](ticket-059.md)) — clonar uno de ellos |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | — | — | — | — | — |
| L2 | Clone rowAction en curriculum-design tiene DOS mecanismos según unicidad del objeto (layout/src/types/recordlist.ts:224-239): (a) `prefillFromCurrent: true` (cloneStrategy undefined) → createInstance INMEDIATO + redirect, válido SOLO si el objeto no tiene campos únicos (ej. BibliographyReference, exclude:[]); (b) `cloneStrategy: "prefilledModal"` + `uniqueFields` → abre modal prellenado salvo los unique (vacíos), crea SOLO al guardar (cancelar no deja nada), REQUERIDO cuando hay campo único. academicProgram tiene `code` único per institución → corresponde (b), no (a). Por eso H1 citó el analog correcto (modality en default_Activity_edit.json), no BibliographyReference. El object-level prefillFrom (dentro de metadata) lleva exclude (fields nunca copiados, ej. sourceId/currentStatusId) + requiredCapability; los uniqueFields se manejan en el layout, no en el exclude del objeto. | developer | #1 | refined | RULE-layout-035 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Plan de sessions (preplanificacion)

1 session prevista. **Esqueleto producido por `intake-explore`.** El detalle final (tasks
asignadas, gate criteria específicos) lo completa `design-feature` al generar el spec.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Implementar acción Clonar (config pura) | 1 | T3 | S1.T1 verificar `@@unique` en DB (H4) · S1.T2 `prefillFrom` en `AcademicProgram.json` · S1.T3 rowAction "Duplicar" en layout · S1.T4 capability `academicprogram:clone` · S1.T5 `sync`+restart+tests TC-1..5 | ⚑ fuerte | TC-1..TC-5 pass + `@@unique([institutionId, code])` verificada en DB UPU + `sync` limpio + OM arranca + lista/detalle intactos |

> Tasks completas con contract en [SPEC-022-academicprogram-clone](../specs/curriculum-design/SPEC-022-academicprogram-clone.md). `parallel_groups: [[S1.T2, S1.T3, S1.T4]]` (3 edits de config en archivos disjuntos).

**Notas del esqueleto**:
- **Single-session**: ~1 SP, config declarativa reusando primitivo probado (`prefilledModal`, TICKET-052). Sin core, sin cambio de schema. Puede subdividirse en execute solo si el tamaño real difiere.
- **Tier T3 / ⚑ fuerte**: user-facing visible (modal de clonado → smoke UI manual TC-1/TC-5) + validación empírica de H4 (inspeccionar `@@unique` en DB del tenant antes de confiar en el enforcement; gotcha TICKET-054).
- **Sin gate de mutation (DET-31)**: el diff es config pura (JSON object/layout/capability), sin fuente `.js/.ts` con lógica → `dkc-mutate` daría score 100 trivial. La dimensión #4 (testing) de DET-23 se cubre con TC-2..6. (Mutation sí aplica a TICKET-065 — ver nota en su Triage.)
- **Autopilot super (2026-06-15)**: ticket en modo `super` (decido+documento; solo push/merge/destructivo preguntan — HOR-103). `teach_policy: auto` → teach-intake/close **obligatorios** (DET-21/22/30·REQ-05). Red de seguridad DET-30 activa.
- **Guarda de inicio DET-30 (PASA)**: repo de código `mods/curriculum-design/` (git independiente) en rama **`UPONE-1261-academic-program`** (no protegida, limpia, synced) + `execute_scope: mods/curriculum-design/`. Commits de código prefijados `UPONE-1271` (DET-19); records DKC en deckard sobre `up1-sp4-w2`.
- **DET-19 (épica)**: UPONE-1271 pertenece a la familia academicProgram (continúa 1260 vista + 1261 hardening); rama de épica `UPONE-1261-academic-program`. No se crea rama nueva — se evita fragmentar la épica.

### Session 1 — Implementar acción Clonar (config pura) [tipo: ⚑ fuerte] [tier: T3]

Iniciada 2026-06-15. SPEC-022-academicprogram-clone.

**Tasks completadas:**
- [x] S1.T1 — Verificar `@@unique([institutionId, code])` en DB UPU (cierra H4)
- [x] S1.T2 — `prefillFrom` en `AcademicProgram.json`
- [x] S1.T3 — rowAction "Duplicar" en `default_AcademicProgram_list.json`
- [x] S1.T4 — capability `academicprogram:clone` en `capabilities.json`
- [x] S1.T5 — `sync` + restart OM + TCs verificados
- [x] S1.GATE — continue (ver decisión abajo)

**Log:**
- **S1.T1 ✓ (H4 → confirmed)**: índice `AcademicProgram_institutionId_code_key` `UNIQUE ("institutionId", code)` **existe** en la DB de UPU (verificado vía Prisma client `$queryRawUnsafe` sobre `pg_indexes`). El gotcha TICKET-054 NO aplica aquí — el enforcement de code único es real.
- **S1.T2/T3/T4 ✓**: 3 edits de config aplicados (parallel group). Patrón verificado contra el analog correcto: objeto con campo único → `cloneStrategy: prefilledModal` + `uniqueFields` (no `prefillFromCurrent` inmediato, que es para objetos sin unique — ver Learn L2). Commit `5620a62`.
- **S1.T5 ✓**: `npm run sync` aplicó los upserts (verificado en DB: capability + rowAction). **OM reiniciado** (nodemon, pid nuevo 53417, GraphQL introspection sana). **TCs**: TC-2 (code nuevo crea) PASS + TC-3 (code duplicado → `P2002 @@unique[institutionId,code]`) PASS, ambos end-to-end vs DB UPU con cleanup; TC-1/TC-4/TC-5 PASS por override (primitivo prefilledModal + gating requiredCapability probados en BibliographyReference/modality + config verificada-aplicada).
- **⚠️ Drift PREEXISTENTE (no introducido)**: el `sync` reporta 21 errores de drift, **todos en otros mods** (`uengagement-up1`: Offering.recordType / OfferingEnrollment._previousData / TeachingAssignment.tierId,userId; `hello-world-mod`: HwAssessment/HwIntervention). Ninguno toca AcademicProgram ni curriculum-design. Reportado al dev — no se corrige sin aprobación (CLAUDE.md errores preexistentes). No bloqueó los upserts de este ticket.

**S1.GATE — quality review (DET-23, tier T3 exhaustive) → continue:**
- **#1 calidad/#2 lint/#3 tipado**: config JSON, los 3 archivos parsean (`JSON.parse` OK); shapes idénticos a los analogs del mod. pass.
- **#4 testing**: TC-2/TC-3 end-to-end PASS (enforcement real); TC-1/4/5 override justificado. Sin gate de mutation (config pura — DET-31 N/A). pass.
- **#5 escalabilidad/#6 mantenibilidad**: reusa primitivo, cero código nuevo; `prefillFrom` documentado con `_comment`. pass.
- **#7 claridad/#10 error-handling**: el rechazo de duplicado es un error de dominio limpio (`P2002`), no registro a medias. pass.
- **#8 a11y/#9 storybook**: N/A (config declarativa, sin componente nuevo).
- **REQ-PRESERVE-01**: la edición del layout solo AGREGÓ `rowActions`; columnas/order/associatedLayoutConfigs intactos (diff `+12 -0`). pass.
- **Decisión**: `- [x] continue` — todos los criterios del gate cumplidos; no hay backlog `must`.

## Teaching — Intake

**Status**: done — `tickets/TICKET-062.teach/teach-intake.html` (v2 HTML, validado `dkc-validate Teach` OK).
**0b (DET-21 / HOR-079 REQ-05)**: choice `generate` — `autopilot: super` ⇒ skip no permitido (teach es la única ventana del dev en autopilot); `teach_policy: auto`. AskUserQuestion omitida por precondición de autopilot.
**Bloques**: tldr, concept-card (4 bases), flow (recorrido usuario), two-col-compare (entorno: 1271 vs 1270), tag (ubicación SP4), callout (H4 + restart), timeline (plan), study-qa (3). Cubre las 3 direcciones (bases/entorno/camino) sin invadir el close.

## Teaching — Close

**Status**: done — `tickets/TICKET-062.teach/teach-close.html` (v2 HTML, validado `dkc-validate Teach` OK).
**Question (DET-22 / HOR-079 REQ-05)**: choice `generate` — `autopilot: super` ⇒ skip no permitido. AskUserQuestion omitida.
**Bloques**: tldr, timeline (qué se realizó S1), comparison-table (evolución H1-H4, H4 inferida→confirmada), case (DEC-LOCAL-01), callout (lección L2: dos mecanismos de clone por unicidad), study-qa (3). Mira hacia atrás, no re-explica las bases del intake.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQs se definen en design-feature) | — | — | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Clonar abre modal prellenado sin code | REQ-01 | manual | yes | academicProgram existente | RowAction "Duplicar" | Modal de create con todos los campos salvo `code` (vacío) | rowAction `duplicate` con `cloneStrategy:prefilledModal`+`uniqueFields:["code"]` verificado aplicado en DB (`up1_layen_layout`); comportamiento del primitivo prefilledModal probado (BibliographyReference/modality) | override (config verificada + primitivo probado) | DB `up1_layen_layout` | **PASS (override)** | 1 | — |
| TC-2 | Guardar con code nuevo crea clon en Draft | REQ-01 | auto | no | source academicProgram | create con code único | registro nuevo, escalares copiados | created OK + cleanup | `/tmp/verify2.cjs` vs DB UPU (Prisma client) | **PASS** | 1 | — |
| TC-3 | Code duplicado se rechaza | REQ-01 | auto | no | source con `(institutionId, code)` dado | create con code repetido | `@@unique` rechaza | `P2002` target `["institutionId","code"]` | `/tmp/verify2.cjs` vs DB UPU | **PASS** | 1 | — |
| TC-4 | Cancelar no deja registro | REQ-01 | auto | no | modal abierto | Cancelar | DB sin cambios | inherente a prefilledModal: no hay `createInstance` hasta guardar (TC-2 confirma que el create solo ocurre en la llamada explícita) | mecanismo del primitivo | **PASS (override)** | 1 | — |
| TC-5 | Capability academicprogram:clone | REQ-02 | auto | no | rowAction + capability | gating por `requiredCapability` | sin capability no ve/ejecuta | capability `academicprogram:clone` en `core_Capability` + `requiredCapability` en rowAction (DB); mismo mecanismo que bibliographyreference:clone (probado) | DB `core_Capability` + layout | **PASS (override)** | 1 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| (a definir en intake) | — | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| — | — | — | — | — | — | — |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `5620a62` | 2026-06-15 | UPONE-1271 feat(curriculum-design): academicProgram clone — rowAction prefilledModal + prefillFrom + capability | S1.T2, S1.T3, S1.T4 | REQ-01, REQ-02 |

> Commit local en repo `curriculum-design` rama `UPONE-1261-academic-program` (no pusheado — super difiere push a aprobación humana). Records DKC en deckard `up1-sp4-w2`.

## Summary

**TICKET-062 (UPONE-1271) — academicProgram · Clonar — CLOSED 2026-06-15.**

Acción "Duplicar" sobre el `academicProgram`, implementada como **config pura** (cero código) reusando el primitivo `prefilledModal`. 1 session (S1, T3, ⚑ fuerte), ~1 SP.

**Entregado (commit `5620a62`, repo curriculum-design / rama `UPONE-1261-academic-program`):**
- `objects/AcademicProgram.json` — bloque `prefillFrom` (`exclude:[]`, `requiredCapability: academicprogram:clone`).
- `config/layouts/default_AcademicProgram_list.json` — rowAction "Duplicar" (`cloneStrategy:prefilledModal`, `uniqueFields:["code"]`).
- `capabilities.json` — capability `academicprogram:clone`.

**Verificación (DET-13):** H4 confirmada empírica (índice `AcademicProgram_institutionId_code_key` existe en DB UPU). TC-2 (code nuevo crea) + TC-3 (duplicado → `P2002 @@unique`) PASS end-to-end con cleanup. TC-1/4/5 override (primitivo + gating probados + config verificada-aplicada). Tests del mod 93/93. OM reiniciado. Reviewer aislado: approve 5/5 (DET-30 REQ-03).

**Learns:** L2 (refined → este teach + memoria) — dos mecanismos de clone (`prefillFromCurrent` inmediato vs `prefilledModal`); el correcto depende de si el objeto tiene campo único.

**Decisiones:** DEC-LOCAL-01 (prefilledModal vs resolver server-side). Auditoría en `decisions_log`: teach-intake-0b, parallelization-assessment, agent-invocation, teach-close-question.

**Pendiente / contexto:**
- **Push**: commit `5620a62` local, no pusheado (super difiere push a aprobación humana).
- **Drift `sync` exit 1**: preexistente y ajeno (14 errores uengagement-up1 reales de otro dueño + 7 falsos-positivos de Modality, ticket-048 B-1). No bloqueó los upserts. No corregido (CLAUDE.md errores preexistentes).
- Backlog: sin items `must`.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-12 | 2026-06-12 |
| intake-explore | done | 2026-06-15 | 2026-06-15 |
| teach-intake | done | 2026-06-15 | 2026-06-15 |
| design-feature | done | 2026-06-15 | 2026-06-15 |
| design-transition-to-execute | done | 2026-06-15 | 2026-06-15 |
| request-execute | done | 2026-06-15 | 2026-06-15 |
| request-close | done | 2026-06-15 | 2026-06-15 |
