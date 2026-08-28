---
id: TICKET-084
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1347
module: curriculum-design
autopilot: autonomous
---

# Malla — Registro del mod + cobertura MCP de los objetos

> **MC-04** (cierra la Épica A: objetos operables UI + MCP) · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "A + F") · Tier 🅼 Must · 5 SP · repo `mod + mcp` · Fase F1.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-04.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-04.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.
> ⚠️ **Cross-repo:** toca `mods/curriculum-design/` (registro) **y** `uplanner/mcp/` (contratos, repo standalone, default `main`). El acoplamiento mod→MCP lo gobierna RULE-mcp-015 (backlog must del módulo up1-mcp).

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | planEntry + requirementCategory (a registrar/exponer) | closed |
| [TICKET-083](TICKET-083.md) (MC-03) | requirement (a registrar/exponer) | closed |

## Request

Como dev del mod y usuario del MCP, quiero los 3 objetos registrados y operables tanto en la UI como conversacionalmente, para cerrar el modelado y habilitar el componente y Elric.

Agrupa A5 + F1 (handoff). Registro en el mod: capabilities.json (CRUD de los 3 objetos + guard de borrado de categoría), layouts (RecordList/RecordDetail) y lang/es_CL completos; objetos visibles en object-manager y consumibles por el componente vía GraphQL del mod (smoke real). Cobertura MCP (repo uplanner/mcp, política §1.7): los 3 objetos en el allowlist (src/mods/index.ts) y con ObjectContract (src/contracts/registry.ts) con validaciones espejo; describe_object/get_create_guide auto-derivan; FK (incl. ownerId polimórfico) resueltas por nombre/código via resolveReference. Los cd_* de dominio ergonómicos NO van aquí (→ SP6).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | integración (registro de objetos en el mod + contratos declarativos en el MCP) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (registro), up1-mcp (allowlist + ObjectContract) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | layouts estándar de los 3 objetos (no componente) |
| Data model | no | no crea objetos (los crean MC-02/03); registra y expone los existentes |

## Triage

REQs **confirmados**. Cobertura MCP es **declarativa y barata** (~40 líneas/contrato), patrón de los **6** `ObjectContract` existentes (el pre-spec decía "11" — corregido tras auditoría directa de `registry.ts`). Verificación clave: smoke **real** (no solo build) de los objetos vía GraphQL del mod.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los ObjectContract declarativos cubren los 3 objetos sin tools `cd_*` nuevas | ✓ confirmada | patrón de 6 contratos existentes (Activity/EvaluationComponent/BibliographyReference/AcademicProgram/Curriculum/Term en `mcp:src/contracts/registry.ts`); `BibliographyReference` es el molde de "CRUD genérico solo con la entrada de config" |
| H2 | `capabilities.json` del mod NO tiene entradas para los 3 objetos → REQ-01 es trabajo real | ✓ confirmada | `mod:capabilities.json` solo declara activity/curricularsection/curricularlink/curriculum/academicprogram/bibliographyreference. CERO entradas planEntry/requirementCategory/requirement. Patrón a seguir: object-level RBAC `<obj>:view\|create\|modify\|delete` (RULE-mods-037), sin prefix `mod/` |
| H3 | Layouts: gaps reales vs decisiones deliberadas no-menú de MC-02/03 | ✓ confirmada | Estado real (`mod:config/layouts/`): planEntry → solo `_view`; requirementCategory → `_create/_edit/_view`; requirement → 9 (3 RT × create/edit/view). **Ningún `_list`** para los 3 (MC-02: planEntry se crea vía malla, no menú; MC-03: requirement no-menú). REQ-01 "RecordList/RecordDetail" debe **reconciliar** con esas decisiones — no re-introducir `_list` que MC-02/03 omitieron a propósito (DET-16) |
| H4 | FK estáticas resueltas gratis por contrato; `ownerId` polimórfico necesita extensión | ✓ confirmada | `mcp:src/contracts/resolve-inputs.ts:75` resuelve FK por `fieldDocs[f].fk` + `resolveBy` (config-driven, passthrough si ya es id). planId→Curriculum, activityId→Activity, categoryId→requirementCategory, parentId→requirement = declarativas. **`ownerId` polimórfico NO**: `doc.fk` es estático, el target depende de `ownerType`. MC-03 lo dejó como "convención doc" (necessity-assessment), pero REQ-05 lo pide resuelto por nombre → requiere extensión config-driven a `resolveContractInputs` (~20 líneas, fieldDoc tipo `polymorphicFkFrom: ownerType`). Precedente de lógica: `mcp:src/mods/curriculum-design/curriculum-write.ts` |
| H5 | `requirement` (3 RecordTypes) → 1 contrato base con enum `recordType` (no per-RT) | ✓ confirmada | precedente `CURRICULUM_CONTRACT`: 1 contrato con `recordType` enum {Plan,Minor}. `getContract` resuelve por `objectType` si no hay clave compuesta. requirement → 1 contrato, `recordType` enum {Group,RecordState,MetricThreshold} + enums `effect`/`operator` |

### Context found

**KB del módulo (kb_refs: DEC-037, RULE-dev-009):**
- mod-only para el registro; el MCP es repo separado (política §1.7: lo desarrollado va al MCP en el mismo SP).
- MCP-ready = enums + FK `references` + labels (los entregan MC-02/03).

**Necesidad/reuso (DET-32):** registro del mod → **build** (capabilities/layouts/lang de los 3 objetos). Contratos MCP → **reduce/reuse** (declarativos ~40 líneas/objeto, patrón de los 11 `ObjectContract`; FK polimórfica vía `resolveReference`, precedente `Curriculum`). `cd_*` de dominio → **drop en SP5** (→ F2/SP6; genéricas ya cubren CRUD).

**Supuestos:** la malla en la UI consume **GraphQL nativo del mod** (no requiere MCP); el MCP es la vía conversacional/programática.

## Pre-spec (transcrito de MC-04.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · registro en config del mod | confirmed | handoff MC-OBJ-5 | actualizar `capabilities.json` (CRUD 3 objetos + guard de borrado), layouts (RecordList/RecordDetail), `lang/es_CL` completos. |
| REQ-02 · objetos consumibles por el componente (smoke) | confirmed | handoff MC-OBJ-5 | 3 objetos visibles en object-manager y consumibles por el componente de malla vía GraphQL del mod (smoke real, no solo build). |
| REQ-03 · allowlist + ObjectContract en el MCP | confirmed | política §1.7 + auditoría | `planEntry`, `requirementCategory`, `requirement` en allowlist (`src/mods/index.ts`) + ObjectContract (`src/contracts/registry.ts`): fieldDocs, enums, FK con references, validaciones espejo (min≤max, label req, period req, guard). |
| REQ-04 · `describe_object`/`get_create_guide` auto-derivan | confirmed | auditoría (guide.ts) | con el contrato, describen cada objeto (enums + FKs) sin recetas a mano; `create_object`/`query_records` con validaciones espejo. |
| REQ-05 · resolución de FK (incl. polimórfica) | confirmed | patrón Curriculum (`curriculum-write.ts`, `resolveReference`) | FK (planId, activityId, categoryId, blockId, y `ownerId` polimórfico) resueltas por nombre/código (ownerId condicional a ownerType). |

### Tasks previstas (con rollback)

| # | Task | Repo | Rollback |
|---|------|------|----------|
| T1 | capabilities + layouts + lang de los 3 objetos (REQ-01) | mod | revertir entradas |
| T2 | smoke E2E: objetos en object-manager + consumibles vía GraphQL (REQ-02) | mod | — |
| T3 | `ObjectContract` de los 3 objetos en `registry.ts` (REQ-03,04,05) | mcp | quitar contratos |
| T4 | allowlist en `src/mods/index.ts` (REQ-03) | mcp | quitar del allowlist |
| T5 | tests de contrato (validaciones, resolución FK) | mcp | — |

### Dependencias

- **Depende de:** MC-02 + MC-03 (objetos existentes y MCP-ready).
- **Cierra:** la Épica A (objetos operables UI + MCP). F2 (`cd_*` ergonómicos) → opcional/SP6.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | mod: `UPONE-1267-sp5` en `mods/curriculum-design` (desde `develop`). MCP: `UPONE-1267-sp5` en `uplanner/mcp` (desde `main`, repo standalone). Nunca `develop`/`main` |
| Base branch | mod `develop`; mcp `main` |
| DB state | UPU con MC-02/03 sincronizados |
| Services | object-manager (GraphQL del mod), MCP server (build + re-OTP para smoke de contratos) |
| Test data | objetos planEntry/requirementCategory/requirement creados |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | MC-03 (UPONE-1346) dejó una corrección de doc sin commitear en el repo del mod (docs/reference/requirement-object.md, framing RULE-cd-018: codegen del mod —base Y RT— decide nullability por required[], no not_null). Detectada al limpiar el working tree para el commit de S1; commiteada aparte bajo UPONE-1346 (cb443d6) para no contaminar el scope de MC-04. | developer | S1 | discarded | — (one-off operativo: leftover ajeno ya commiteado con su atribución; no es constraint reusable) |
| L2 | El CRUD genérico del MCP (create_object) descartaba el detalle de error de las validaciones (solo usaba errors.length → mensaje genérico), perdiendo el feedback accionable; patrón pre-existente que afectaba validateRequired/validateEnums también. Corregido pasando hint: errors.join(" ") en create (alineado al path de update). Detectado por los 2 jueces ciegos del gate dual-judge de S2. | reviewer | S2 | discarded | — (ya corregido en este ticket; no queda constraint pendiente que enforcear a futuro) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

3 sessions de execute previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria) lo completa `design-feature` al generar el spec. La fase de design/intake se registra como S0.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Registro del mod (REQ-01): capabilities CRUD de los 3 objetos + reconciliar layouts (honrar no-menú MC-02/03 + gaps reales) + verificar lang | mod | T2 | T1 (placeholder — design refina) | auto | suite del mod sin regresión; capabilities/layouts/lang parsean; object-level RBAC RULE-mods-037 |
| S2 | Cobertura MCP (REQ-03/04/05): 3 ObjectContract en registry.ts + allowlist en el pack + extensión resolver FK polimórfica `ownerId` + tests de contrato (TC-02..05) | mcp | T3 | T3, T4, T5 | ⚑ fuerte | vitest MCP verde (los 6 contratos sin regresión + nuevos); FK polimórfica resuelta por nombre; allowlist gatea no-expuestos |
| S3 | Smoke real DB-gated (REQ-02 + verificación runtime): TC-01 (planEntry vía GraphQL del mod) + MCP live (describe_object/create_object con re-OTP) | mod+mcp | T3 | T2 | ⚑ fuerte | objetos visibles en object-manager + creables vía GraphQL; describe_object deriva enums+FK en vivo |

**Notas del esqueleto:**
- **Cross-repo** (DET-19): S1 toca `mods/curriculum-design/` (rama `UPONE-1267-sp5`); S2 toca `uplanner/mcp/` (rama `UPONE-1267-sp5`, repo standalone). Commits con `UPONE-1347`.
- **Riesgo concentrado en S2**: el resolver de FK polimórfica (`ownerId` condicional a `ownerType`) es el único código no-declarativo. El resto (contratos, allowlist) es config. Por eso S2 es ⚑ fuerte.
- **S3 DB-gated**: como MC-02/03, el smoke vivo requiere OM corriendo + sync + re-OTP del MCP → probablemente diferido al dev (precedente TICKET-082/083 S-final). TC-02..05 son auto (vitest, mockables) y se cubren en S2, NO son DB-gated.
- **Numeración**: no había sessions previas → execute arranca en S1; design/intake = S0.

### Session 1 — 2026-06-26 — Registro del mod: capabilities + layouts + lang [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (unit + coverage)

**Objetivo**: registrar los 3 objetos en el mod `curriculum-design` — agregar las 12 capabilities object-level a `capabilities.json` (REQ-01) y reconciliar layouts (honrar no-menú MC-02/03, sin `_list` nuevo) + verificar cobertura lang es_CL.

parallel_groups: [[S1.T1, S1.T2]]

**Tasks completadas**:
- [x] S1.T1 — capabilities.json: 12 capabilities object-level (planentry/requirementcategory/requirement × view/create/modify/delete, RULE-mods-037)
- [x] S1.T2 — reconciliar layouts (sin `_list` nuevo, DEC-LOCAL-02) + verificar lang es_CL completo
- [x] S1.GATE — Gate de sync Session 1 (tier T2, auto)

**Validación del tier**:
- T2 — vitest del mod: 909/909 PASS (54 archivos), sin regresión (cmd: `npm test`). capabilities.json parsea (29 caps, 12 nuevas). lang es_CL cubre enums de los 3 objetos. Coverage estable (sin código nuevo).

**Discoveries / Learns nuevos**:
- L1: MC-03 (UPONE-1346) dejó una corrección de doc sin commitear en el repo del mod (`docs/reference/requirement-object.md`, framing RULE-cd-018: base Y RT deciden nullability por `required[]`). Detectada al limpiar el tree para el commit de S1. Commiteada aparte bajo UPONE-1346 (cb443d6) para no contaminar el scope de MC-04 ni perder la corrección.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — proporcionalidad: gate T2 declarativo, sin código lógico)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | JSON declarativo; 12 caps con shape consistente al patrón existente |
| 2 | Lint | n/a | no hay código nuevo (config JSON) |
| 3 | Tipado | n/a | — |
| 4 | Testing | pass | suite del mod 909/909 sin regresión |
| 5 | Escalabilidad | pass | object-level RBAC estándar (RULE-mods-037), extensible |
| 6 | Mantenibilidad | pass | descriptions en es_CL referencian MC-04/UPONE-1347 + guard ya existente |
| 7 | Claridad | pass | naming consistente (`<obj>:<accion>` lowercase, sin prefijo mod/) |
| 8 | A11y | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Error handling | n/a | config declarativo |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Trigger-rules: diff ~60 líneas, path config (capabilities.json), work_type implement → sin recomendación de subir tier; T2 declarativo se mantiene.

**Commit DET-27**: (curriculum-design) `4151c7b` UPONE-1347: registrar capabilities object-level (CRUD) de los 3 objetos (workspace externo al repo deckard — rama `UPONE-1267-sp5`, modo limpio por `external`; leftover MC-03 commiteado aparte `cb443d6` UPONE-1346)

### Session 2 — 2026-06-26 — Cobertura MCP: contratos + allowlist + resolver polimórfico + validación espejo + tests [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3 (regresión completa)

**Objetivo**: exponer los 3 objetos en el adaptador `up1-mcp` — 3 `ObjectContract` en `registry.ts` + ampliar allowlist en el pack (REQ-03/04), extender el resolver para la FK polimórfica `requirement.ownerId` (REQ-05, DEC-LOCAL-01) + validación espejo `minCredits ≤ maxCredits` (REQ-04, DEC-LOCAL-04), y tests de contrato TC-02..05.

**Tasks completadas**:
- [x] S2.T1 — 3 ObjectContract (registry.ts) + ALL_CONTRACTS + allowlist en el pack (REQ-03/04)
- [x] S2.T2 — resolver FK polimórfica `ownerId` (resolve-inputs.ts + FieldDoc) + `validateCreditRange` (validations.ts) (REQ-05/04)
- [x] S2.T3 — tests de contrato TC-02..05 en test/contracts.test.ts (REQ-03/04/05)
- [x] S2.GATE — Gate de sync Session 2 (tier T3, ⚑ fuerte — loop dual-judge DET-35)

**Validación del tier**:
- T3 — tsc build PASS + vitest del MCP 92/92 (contracts.test.ts 30; sin regresión de los 6 contratos previos ni de resolve-inputs.test.ts). TC-02..05 verificados en el output real. Smoke vivo (TC-01) es S3 (DB-gated).

**Discoveries / Learns nuevos**:
- L2: el CRUD genérico del MCP descartaba el detalle de error de las validaciones en `create_object` (solo usaba `errors.length`, mensaje genérico) — patrón pre-existente que también afectaba a `validateRequired`/`validateEnums`. Corregido pasando `hint: errors.join(" ")` (alineado al path de update). Detectado por los dos jueces del gate.

**Quality review (DET-23)** — loop dual-judge (DET-35), tier exhaustive:

**Reviewer**: 2 jueces ciegos balanced (sub-agentes Agent/sonnet, read-only) en paralelo
**Tier de revision**: exhaustive (dual-judge, T3 ⚑ fuerte)
**Resultado global**: pass (ambos jueces approve; cero CRITICAL)

| Finding | Judge A | Judge B | Severity | Real/teórico | Status |
|---------|---------|---------|----------|--------------|--------|
| Mensaje de validación descartado en create (objects.ts:214) | ✓ | ✓ | WARNING | real | confirmed → fixed (hint en create + update) |
| Cobertura TC-04b incompleta (offering / sinónimo+orden) | ✓ | ✓ | WARNING | real | confirmed → fixed (TC-04b sinónimo + TC-04c offering + test issue no-resoluble) |
| `validateCreditRange` no espejado en update | — | ✓ | WARNING | real | suspect → fixed (espejo en update, consistente con el mod) |
| 5 enums de requirement sin `enumLabels` (mustBe/timing/targetType/metric/scope) | — | ✓ | WARNING | real | suspect → fixed (enumLabels es_CL agregados) |
| `requirement.recordType` no en `readonlyOnUpdate` | ✓ | — | INFO | teórico | suspect → fixed (readonly, precedente Curriculum) |
| Passthrough silencioso si ownerType irresoluble | — | ✓ | INFO | teórico | aceptado (el ciclo produce issue sobre ownerType → needsDisambiguation; sin cambio) |

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | contratos completos; polimorfismo correcto; fixes aplicados |
| 2 | Lint | pass | sin magic strings; constantes extraídas |
| 3 | Tipado | pass | tsc 0 errores; FieldDoc polimórfico tipado; sin `any` |
| 4 | Testing | pass | 92/92; aserciones concretas + verificación negativa (no resuelve contra el objeto equivocado) |
| 5 | Escalabilidad | pass | `validateCreditRange` y FK polimórfica opt-in/genéricas; 6 contratos previos intactos |
| 6 | Mantenibilidad | pass | 1 contrato base por objeto; patrón `validateWeights` reusado |
| 7 | Claridad | pass | comentarios explican diseño polimórfico + espejo |
| 8 | A11y | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Error handling | pass | hint expuesto en create+update; passthrough polimórfico sin throw |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Jueces: balanced (A+B), sin disputa → sin escalación a adjudicador reasoning. Trigger-rules: diff ~458 líneas (>400) + path resolver (resolve-inputs.ts) → recomienda tier alto; ya en T3 ⚑ fuerte con dual-judge (aplicado). 2da ronda dual-judge completa omitida por proporcionalidad (ambos jueces approve sin CRITICAL; fixes aditivos re-verificados por build + 92/92).

**Commit DET-27**: (up1-mcp) `5da096e` UPONE-1347: exponer planEntry/requirementCategory/requirement en el MCP (workspace externo al repo deckard — repo standalone `uplanner/mcp`, rama `UPONE-1267-sp5`, modo limpio por `external`)

### Session 3 — 2026-06-26 — Smoke real DB-gated (REQ-02) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3 (smoke vivo)

**Objetivo**: verificación funcional en vivo (REQ-02 / TC-01) — los 3 objetos creables vía GraphQL del mod + visibles en object-manager, y el MCP operándolos en vivo (describe_object/create_object con el contrato nuevo). **DB-gated**: requiere servicios del dev (OM corriendo + sync del mod + MCP reconstruido/reiniciado + re-OTP de Clerk). Límite de standby del super autopilot.

**Tasks completadas**:
- [x] S3.T1 — smoke real (DB-gated, diferido al dev) — TC-01 + MCP live

**Bloqueantes detectados** (resueltos):
- DB-gated → standby inicial. El dev hizo `npm run sync` (mod→UPU) + reinició el MCP server con el build nuevo. El orquestador corrió el smoke vivo contra UPU (re-OTP) → los 5 TC pass. Standby resuelto, gate → continue.

**Handoff para el dev (retomar S3):**
1. **MCP** (repo `uplanner/mcp`, ya construido — `dist/` actualizado en commit `5da096e`): reiniciar el server MCP apuntando al nuevo `dist/` + re-autenticar (Clerk OTP). Luego:
   - `describe_object("requirement")` → debe listar enums (recordType/effect/ownerType/operator) + FKs (parentId, ownerId polimórfico). [TC-02 en vivo]
   - `create_object("requirementCategory", {minCredits:10, maxCredits:5, ...})` → rechazado por validación espejo. [TC-03 en vivo]
   - `create_object("requirement", {ownerType:"activity", ownerId:"EST200", ...})` → resuelve al id real de la Activity EST200. [TC-04 en vivo]
2. **Mod** (repo `mods/curriculum-design`, commit `4151c7b`): `npm run sync` del mod a UPU; crear un `planEntry` vía mutación GraphQL del mod y verlo en object-manager. [TC-01]
3. Si todo pasa: marcar S3.T1 done + S3.GATE continue → cerrar el ticket (teach-close + status closed). Si algo falla: iterate con el finding.

**Validación del tier**:
- T3 (smoke vivo) — **ejecutado contra UPU** (MCP reiniciado + sync aplicado, sesión Clerk OTP): los 3 objetos en `list_object_types`; **TC-01** planEntry creado vía GraphQL del mod (FK planId/activityId resueltas por nombre) + listado (totalCount 6→7), luego borrado (UPU limpio); **TC-02** `describe_object("requirement")` deriva 11 enums + FK + `recordType` readonly; **TC-03** min=10>max=5 rechazado con mensaje espejo; **TC-04** `ownerId="Estadística"` → resuelve a la Activity (polimórfico). Los 5 TC pass.

**Commit DET-27**: sin commit — session de smoke/verificación, sin código nuevo

**Gate decision:** (approvedBy: dev)

- [x] continue → cierre (todas las tasks done; REQ-01..05 verificados)
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-02 | TC-01 | manual (smoke) | done |
| REQ-04 | TC-02, TC-03 | auto | done |
| REQ-05 | TC-04 | auto | done |
| REQ-03 | TC-05 | auto | done |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | crear `planEntry` vía GraphQL del mod | REQ-02 | manual | mod registrado | mutación GraphQL | creado; visible en object-manager | creado id `cmqvesz64...` (planId/activityId resueltos por nombre) + listado (totalCount 6→7); borrado tras verificar | smoke vivo UPU (MCP create_object→GraphQL del mod) | done |
| TC-02 | `describe_object("requirement")` deriva del contrato | REQ-04 | auto | contrato | getContract('requirement') enums+FK | devuelve enums (recordType/effect/ownerType/operator) + FKs (parentId, ownerId polimórfico) | enums + fieldDocs derivados del contrato verificados | vitest contracts.test.ts S2.T3 (90/90) | done |
| TC-03 | `create_object("requirementCategory")` con min>max | REQ-04 | auto | contrato | validateCreditRange(min=10,max=5) | rechazado (validación espejo) | rechazado (1 error); 5≤10 ok; strings coaccionados; igualdad ok | vitest contracts.test.ts S2.T3 | done |
| TC-04 | `requirement` `ownerType=activity`, `ownerId="EST200"` (nombre) | REQ-05 | auto | resolveContractInputs + mock ListGetApi | resolver | resuelve al id real de la Activity (no Curriculum); condicional a ownerType; robusto a orden de claves | ownerId→cact...01 (Activity), no llama Curriculum; curriculum→ccur...01 | vitest contracts.test.ts S2.T3 | done |
| TC-05 | `create_object` sobre objeto NO en allowlist | REQ-03 | auto | allowlist | allowedObjectTypes() | rechazado (no expuesto) | allowlist incluye los 3, excluye 'ObjetoInexistente' (guard → OBJECT_NOT_ALLOWED) | vitest contracts.test.ts S2.T3 | done |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| contratos MCP | tests del MCP | — | — | los 11 contratos existentes sin afectar |

## Summary

### What was requested
Registrar los 3 objetos de malla (planEntry, requirementCategory, requirement) en el mod y exponerlos en el MCP, para cerrar la Épica A (objetos operables UI + MCP).

### What was done
- **Mod** (`curriculum-design`): 12 capabilities object-level CRUD (RULE-mods-037) para los 3 objetos; layouts reconciliados (honrando el no-menú de MC-02/03, sin `_list` nuevo); lang es_CL verificado completo. Ahora el RBAC del mod gobierna ver/crear/editar/borrar los 3 objetos.
- **MCP** (`up1-mcp`): los 3 objetos en el allowlist + 3 `ObjectContract` declarativos; `describe_object`/`get_create_guide` auto-derivan enums + FKs; `create_object` aplica validación espejo `minCredits ≤ maxCredits`; las FK se resuelven por nombre/código, incluido el `ownerId` **polimórfico** de `requirement` (resuelve contra Curriculum/Activity/Offering según `ownerType`). Elric ya puede operar los 3 objetos conversacionalmente.

### What was learned
- Learns capturados: 2 (0 refined, 2 discarded — ver tabla Learns con razón).
- Rules creadas: ninguna (cambio aplica patrones existentes: RULE-mods-037, patrón BibliographyReference, precedente CURRICULUM_CONTRACT).
- Decisions: DEC-LOCAL-01..04 (inline en el spec) — ownerId polimórfico vía resolver config-driven (supersede la postura de MC-03 en este scope); honrar no-menú MC-02/03; 1 contrato base para requirement; validación espejo vía flag.
- Bugs: ninguno (L2 era un patrón pre-existente del MCP, corregido en S2).

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 3 (S1 mod, S2 mcp, S3 smoke) |
| Tasks completed | 6/6 (+ 3 gates) |
| Commits (código) | 3 — mod `4151c7b` + `cb443d6` (UPONE-1346 leftover); mcp `5da096e` |
| Learns captured | 2 |
| Learns discarded | 2 |
| Rules created | 0 |
| Decisions taken | 4 (DEC-LOCAL) |
| Bugs found | 0 |
| Test cases | 5 pass / 0 fail / 0 pending |
| Failed approaches | 0 |
| SP published / estimated / executed | 5 / 5 / 2 (sessions-heuristic) |
| SP breakdown (llm / human) | 2 / 1 |
| SP delta (executed - published) | -3 (-60%) — speedup LLM (proxy humano-puro 3 → executed 2) |

### Verificación final
- Mod: vitest 909/909. MCP: tsc build + vitest 92/92 (dual-judge APPROVED). Smoke vivo contra UPU: los 5 TC pasan (planEntry creado vía GraphQL + listado + borrado; describe_object deriva; min>max rechazado; ownerId polimórfico resuelve).
- Todos los cambios dentro de `execute_scope`; ramas `UPONE-1267-sp5` (mod + mcp), no protegidas.

### Pendiente (no bloquea cierre)
- **Push** de los commits locales (mod + mcp) — siempre lo decide el dev.
- Propagación (DET-16): MC-05/06 (componente de malla consume estos objetos por GraphQL); tools `cd_*` de dominio ergonómicas para malla → SP6.

### Cierra
La Épica A (objetos de malla operables UI + MCP). El modelo de malla queda completo y consumible por el componente y por Elric.
