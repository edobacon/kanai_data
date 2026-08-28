---
id: TICKET-076
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1261
module: curriculum-design
autopilot: autonomous
---

# Adaptar curriculum-design al OrgUnit reducido de engagement (org spine canónico)

## Request

Tras mergear origin/develop en la rama UPONE-1261-academic-program, se trajo el PR#9 de Clemente "engagement-model-reduction" (commits 9c6b077 "stop redefining org spine — engagement is canonical" y 42f55f3 "reduce object model, reconcile engagement spine"). engagement (uengagement-up1) es ahora canónico del org spine: su OrgUnit ya NO tiene el campo `recordType` académico ni `institutionId` en la base, y usa RecordTypes Campus/Faculty/SupportCenter. SP4 (curriculum-design, AcademicProgram + seeds + syllabus) depende de un OrgUnit académico que ya no existe (recordType ∈ {AcademicGovernance, AcademicExecution, Geographic} + institutionId inline). Adaptar el mod al modelo reducido (enfoque B): mapear los roles académicos al RecordType `Faculty` de engagement, codificando el rol governance/execution por cuál FK de AcademicProgram apunta (governanceUnitId vs executionUnitId) en vez de por recordType, y anclando institución vía la extensión rt__Faculty__OrgUnit. El ticket debe analizar viabilidad, documentar el blast radius y armar el plan de implementación por fases atómicas dejando el mod funcional y coherente. Validación real es DB-gated (reset-mods + sync + seed).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | multi (modelo compartido OrgUnit entre curriculum-design y uengagement-up1) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (consumidor), uengagement-up1 (canónico del org spine — solo lectura del contrato, no se modifica), object-manager (codegen del schema Prisma resultante) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El merge de develop dejó a curriculum-design dependiendo de un `OrgUnit.recordType` académico + `OrgUnit.institutionId` que engagement eliminó al volverse canónico del org spine | ✅ confirmada (multi-capa: mod source + schema generado + seed) | engagement `objects/OrgUnit.json` props = [organizationId, parentId, name, code, type, status]; sin recordType inline ni institutionId. Commits 9c6b077 + 42f55f3. curriculum-design ya no define OrgUnit (objects/OrgUnit.json removido) |
| H2 | El RecordType `Faculty` de engagement es el reemplazo canónico del nodo académico, y su extensión `rt__Faculty__OrgUnit` conserva `institutionId` | ✅ confirmada | `rt__Faculty__OrgUnit.json`: props extra = [institutionId (FK Institution), acronym]; metadata.description = "Nodo de gobierno académico — Facultad, Escuela, Departamento" |
| H3 | El rol governance vs execution NO necesita un recordType en OrgUnit: queda determinado por cuál FK de AcademicProgram referencia la unidad (governanceUnitId vs executionUnitId) | ✅ confirmada (diseño) | AcademicProgram.json define ambos FK a OrgUnit.id; el recordType académico en OrgUnit era redundante respecto al rol |
| H4 | El break no aparece en los tests porque los seed-tests corren contra stubs (stubPrisma) que aceptan cualquier campo; rompe en sync/seed real contra el schema regenerado desde engagement | ✅ confirmada | seed-entry.test.ts pasa con stubs; el schema Prisma generado local (object-manager, sin commitear) aún tiene el OrgUnit viejo → stale, no refleja el modelo reducido |

### Context found

**Origen del conflicto (git, mod curriculum-design):**
- Merge `f9a9208` trajo `origin/develop` con el PR#9 de Clemente (`43ee067` engagement-model-reduction). Commits de modelo: `9c6b077` "stop redefining org spine — engagement is canonical", `42f55f3` "reduce object model, reconcile engagement spine".
- `objects/activity.json` ya resuelto a la versión de develop (TICKET-076 es independiente de eso; ya commiteado en `f9a9208` + limpieza `9996c77`/`234c854`).

**Modelo canónico de engagement (uengagement-up1) — contrato a respetar (read-only):**
- `OrgUnit` base: `organizationId`, `parentId`, `name`, `code`, `type` (string libre, sin enum), `status` (enum [Active, Inactive]). **Sin `recordType` inline, sin `institutionId`.**
- RecordTypes de OrgUnit: `Campus` (físico: address/city/capacity/coordinates), `Faculty` (gobierno académico: **institutionId** + acronym), `SupportCenter` (apoyo: serviceScope/contactEmail).
- Patrón de creación (de `seed/0-orgunit-center-seeds.js`): `prisma.orgUnit.create({ data: { recordType: 'Faculty', organizationId, name, code, type, status } })` + `prisma.rt__Faculty__OrgUnit.upsert({ where: { OrgUnitId }, create: { OrgUnitId, institutionId } })`. El comentario del seed anticipa migración de recordType viejos ("AcademicExecution → SupportCenter").
- engagement **NO seedea** unidades `Faculty` → curriculum-design debe crear las suyas.
- `Institution` (engagement): tiene `organizationId`, `code`, `type` (string), `status` [Active, Inactive], `regulatoryCode`, `metadata`. `Organization`: `status` [Active, Inactive], `metadata`.

**Modelo que asume SP4 (curriculum-design HEAD) — lo que hay que adaptar:**
- `OrgUnit` académico: `recordType` ∈ {Geographic, AcademicGovernance, AcademicExecution} + `institutionId` inline (era el OrgUnit que curriculum-design definía antes de 9c6b077).

**Blast radius (consumidores en curriculum-design):**

| Archivo | Línea(s) | Dependencia | Acción enfoque B |
|---------|----------|-------------|------------------|
| `objects/AcademicProgram.json` | 9, 65, 74 | descripciones de governanceUnitId/executionUnitId citan recordType=AcademicGovernance/AcademicExecution (FK a OrgUnit.id, estructura intacta) | actualizar descripciones → "OrgUnit recordType=Faculty"; FK sin cambio |
| `seed/_data-aiep.js` | 141 | `orgUnit.create({ institutionId, recordType: 'AcademicExecution', ... })` | recordType→'Faculty', mover institutionId a `rt__Faculty__OrgUnit.upsert` |
| `seed/_data-univalle.js` | 149 | idem | idem |
| `seed/_data-academicprogram.js` | 48-49 | `orgUnit.findFirst({ where: { institutionId, recordType: 'AcademicExecution' } })` | buscar vía `rt__Faculty__OrgUnit.findFirst({ where: { institutionId } })` → `.OrgUnitId` |
| `seed/_data-syllabus.js` | 46 | `orgUnit.findFirst({ where: { recordType: 'AcademicExecution' } })` | recordType→'Faculty' |
| `logic/syllabus-offering.resolver.js` | 50 | `orgUnit.findFirst({ where: { recordType: 'AcademicExecution' } })` (runtime) | recordType→'Faculty' |
| `config/layouts/default_AcademicProgram_create.json` | 56, 61 | descripciones de campos (sin filtro de picker por recordType — picker muestra OrgUnit por `name`) | actualizar descripciones (cosmético) |
| `tests/integration/seed-counts.test.ts` | — | aserciones de conteo de OrgUnit por recordType | actualizar a recordType='Faculty' (requiere OK del dev por DET testing) |
| `tests/llm-e2e/fixtures/seed-aiep.json`, `seed-uv.json` | — | fixtures con recordType académico | actualizar recordType (fixtures de test) |
| stub de seed-tests (`stubPrisma`) | — | debe conocer el modelo `rt__Faculty__OrgUnit` para no romper al agregar el upsert | extender stub si los seed-tests llaman al nuevo modelo |

**Decisión arquitectónica (DEC-016 — principio rector):** engagement es **inmutable desde cd**. Todo lo que cd necesite para funcionar con el modelo reducido se resuelve con **cambios en cd**, nunca pidiendo cambios a engagement. Esto descarta la "opción A" (reinstaurar recordType académico / que engagement siembre el org spine) como fallback: el mapeo `Academic* → Faculty` + rol por FK es **definitivo**, y cd asume ser el seeder de facto del org spine. Si en el futuro cd necesitara distinguir governance/execution a nivel de nodo, lo implementa por su cuenta. Ver [DEC-016](../decisions/dec-016.md).

### Casos colaterales del merge (investigados — engagement canónico)

Además de OrgUnit (el work item), el merge de develop trajo otros cambios de modelo. Verificados contra el contrato canónico de engagement (estado actual, develop):

| # | Caso | Hallazgo | Estado |
|---|------|----------|--------|
| C | `activity-formtemplate.resolver.js` usa `Activity.formTemplateId` (campo removido de cd/activity.json) | engagement's `objects/Activity.json` **sí define `formTemplateId`** (FK→FormTemplate, nullable). Activity es **co-definido**: cd aporta `recordType [Course,Service]` + campos académicos; engagement aporta `formTemplateId`. En deploy conjunto la columna existe → el resolver funciona. `activityTypeId`/`operationalStatus` removidos de ambos lados, **sin consumidores en cd** | ✅ resuelto (no requiere cambio) |
| D | Enum `status` 3→2 (Institution/Organization: `[Active,Inactive]`) | **Cero** ocurrencias de `Suspended`/`Terminated` en curriculum-design. Seeds usan `Active`. Sin escritura del enum viejo | ✅ resuelto (no requiere cambio) |
| G | `CurricularSection` children: `polymorphicChildren`+`via` → `directChildren`+`fk` (commit `97cae84`) | Rename de metadata de codegen en `CurricularSection.json` (self-FK directa por `parentId`). NO choca con el `polymorphicChildren` de `activity.json` (es otro objeto: Activity→sections polimórfico vía ownerType/ownerId). Suite 746 verde lo cubre | ✅ resuelto (no requiere cambio) |
| K | Schema Prisma local stale (OrgUnit viejo) | Informativo: el break aparece al regenerar con `reset-mods`+`sync`. Se valida en S2 (DB-gated). No es item separado — es el disparador del caso A | ➡️ cubierto por S2 |

**Conclusión**: el único caso que requiere código es **OrgUnit (caso A)** — el alcance de este ticket. C/D/G ya son consistentes con el modelo canónico de engagement; no requieren cambios. Doc completo del merge: ver `merge-review-orgspine` (artifact).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1261-academic-program (rama de épica existente; mod layer, flujo autocontenido + npm run sync) |
| Base branch | develop |
| DB state | OrgUnit del schema Prisma local es STALE (aún tiene recordType académico + institutionId). La validación real exige `reset-mods` + `sync` (regenera OrgUnit desde engagement) + `seed`. DB-gated/interactivo — lo corre el dev o se autoriza explícito |
| Services | object-manager (codegen/sync), PostgreSQL (UPU tenant). Sin frontend para validar el seed |
| Test data | fixtures AIEP + Univalle (seed/_data-aiep.js, _data-univalle.js); llm-e2e fixtures seed-aiep.json / seed-uv.json |

### Reproduction steps
1. Con el merge de develop aplicado en la rama, correr `reset-mods` + `sync` (regenera el schema Prisma de OrgUnit desde engagement: sin recordType académico ni institutionId).
2. Correr el seed (`seed/_data-aiep.js` / `_data-univalle.js`).
3. **Esperado tras el fix**: el seed crea OrgUnit `Faculty` + extensión con institutionId, y AcademicProgram/syllabus resuelven la unidad sin error.
4. **Actual (sin fix)**: `prisma.orgUnit.create({ data: { institutionId, recordType: 'AcademicExecution' } })` falla (columnas inexistentes / valor fuera del enum OrgUnitRecordType de engagement).
   - Estado hoy: la DB local puede seguir operando sobre el schema stale; cualquier reset-mods/sync lo rompe.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| 1 | `Activity` es **co-definido** por curriculum-design + uengagement-up1 (mismo objeto, dos mods): cd aporta `recordType [Course,Service]` + campos académicos; engagement aporta `formTemplateId` (FK→FormTemplate). El codegen mergea ambas contribuciones. Por eso un campo "removido" de cd/activity.json puede seguir existiendo si engagement lo define | intake-explore (caso C) | — | refined | RULE-curriculum-design-006 |
| 2 | engagement es canónico del org spine pero **no siembra** Organization/Institution (usa `organization.findFirst()`); el seed de curriculum-design es el creador de facto y alimenta también el seed de engagement. **Disposición (DEC-016)**: cd sigue siendo el seeder (no se pide a engagement que siembre). Gotcha: el orden de seeds cross-mod es no-determinístico (`fs.readdir` en dbSync.js, sin deps declaradas) — frágil pero hoy funciona por orden alfabético (cd < engagement) | intake-explore (caso F) | — | refined | RULE-curriculum-design-007 |
| 3 | El stub de los seed-tests (`makePrismaMock` en seed-counts.test.ts / fixtures-vs-seed.test.ts) es un **Proxy genérico**: intercepta cualquier `prisma.<model>.<method>` y devuelve defaults razonables (`create/upsert/update` → `{id, ...data}`; `findFirst` → resolver pre-poblado o `null`). Por eso agregar `prisma.rt__Faculty__OrgUnit.upsert/.findFirst` NO requirió extender el stub — la task S1.T5 "extender stub" resultó **no-op** (el spec asumió un stub estático con modelos enumerados). El break del modelo se prueba de verdad solo en S2 (schema real). `seed-entry.test.ts` no cuenta: mockea los loaders enteros (vi.mock), no ejerce el seed real | execute S1.T5 | S1 | refined | RULE-curriculum-design-008 |
| 4 | **Decisión del `type` de la unidad Faculty** (open question del spec): se mantiene el `type` descriptivo existente (`'School'` AIEP / `'Department'` UV) en vez de homogeneizar a `'Faculty'`. Razón: `type` es string libre y describe la *clase* específica de unidad académica; `recordType=Faculty` ya porta la clasificación del org spine. Un `type='Faculty'` sería redundante y menos informativo | execute S1.T3 | S1 | discarded | — (preservado en Session 1; bajo reuso cross-ticket) |
| 5 | **⚠️ REFUTADO por DEC-018 (verificación independiente):** la conclusión de abajo ("el Base committeado conserva el OrgUnit viejo / defecto de object-manager") era FALSA — el Base está reducido en git (develop+rama) desde `42f55f3`; lo que estaba stale era el `prisma/UPU/schema.prisma` GENERADO local (no re-sincronizado). Se conserva el texto original como registro del error de análisis. — **BLOQUEANTE S2 — root cause confirmado (fuera de scope cd, es UPONE-1206/object-manager):** `object-manager/objects/business/Base/orgunit.json` (TRACKEADO en git) conserva la def VIEJA del OrgUnit — props `[...,recordType,institutionId]` + enum `["Geographic","AcademicGovernance","AcademicExecution"]`. codegen lee este Base y **shadowea** la def reducida del mod `uengagement-up1` (props `[organizationId,parentId,name,code,type,status]`, sin institutionId). Por eso el schema generado de UPU NO se reduce **ni siquiera tras `reset-tenant UPU --recreate` completo** (verificado en DB viva 2026-06-22: enum sin Faculty, columna OrgUnit.institutionId presente, `rt__Faculty__OrgUnit` vacía, AcademicProgram vacía; las únicas OrgUnit son CIE/ING `AcademicGovernance` del seed `prisma/UPU/seed.js`). El archivo debió eliminarse al consolidar el org-spine a engagement-canónico (commit 655cbdd "consolidate org spine to engagement canonical", UPONE-1206) pero quedó. **Consecuencia:** contra este schema el seed cd `recordType:'Faculty'` rompe por enum — pero el defecto es de object-manager, NO del código de cd (correcto vs el contrato reducido que engagement declara). **Fix (otro dev/UPONE-1206):** borrar/reducir `object-manager/objects/business/Base/orgunit.json` + alinear `prisma/UPU/seed.js`, luego regenerar schema → recién ahí S2 valida el seed cd. Escalado al dev | execute S2 (intento) | S2 | refined | RULE-curriculum-design-009 |
| 6 | **Blast radius de S1 incompleto — la reducción del org-spine también tocó Institution, no solo OrgUnit.** El intake mapeó OrgUnit (recordType/institutionId) pero NO Institution. La reducción (655cbdd/42f55f3) removió `country` de Institution (queda solo en Organization; también removió recordType/parentId/isActive, que el seed no usa). El seed de cd pasaba `Institution.country` → `Unknown argument 'country'` en el `institution.upsert`, que corre ANTES de OrgUnit → abortaba TODO el seed (ni bibliografía cargaba). Fix: quitar `country` del `institution.upsert/create` en `_data-univalle.js` + `_data-aiep.js` (commit `9c6fd0f`). Verificado: seed completo en UPU (5 AcademicProgram, 2 Curricula, 3 sílabos, 9 biblio, 2 OrgUnit Faculty). **Lección: al mapear el blast radius de una reducción de modelo upstream, revisar TODOS los objetos reducidos (Organization/Institution/OrgUnit), no solo el que motivó el ticket.** | execute (adaptación completa) | — | refined | RULE-curriculum-design-009 |
| 7 | **Editar un Curriculum tipo Plan rompe con "Invalid value for argument `InstitutionId`" contra el schema reducido.** El `updateInstance` genérico (core) castea la única FK real de Curriculum (`institutionId`, relación `Curriculum_Institution_institutionId`) a una operación de relación PascalCase en el path de UPDATE y construye un arg inválido; el CREATE la castea bien (createInstance). Es bug del core (object-manager), surfaceado por la reducción — pero NO lo atrapan los stubs (la suite pasa 748) ni se reproduce headless (el import del resolver de plataforma cuelga); solo se ve en la UI/DB real (como los casos DB-gated). Fix mod-side (adapter de cd): stripear `institutionId` del payload de UPDATE — es derivable del owner + set-once (commit `36383df`). **Generalizado (commit `4e6bd7b`):** validado en UI, el error reaparece en otros campos tipados (`totalCredits`, etc.) → **causa raíz general**: el `updateInstance` genérico del core NO coerciona los campos del RecordType al editar via alias, mientras que `createInstance` SÍ (via `coerceRtFields`). El form manda `data: JSON!` (sin coerción GraphQL) → los Int llegan como string `"240"` → Prisma `Invalid value Expected Int` (UI muestra PascalCase porque `useFriendlyErrors.ts:503` capitaliza para display — el campo real es lowercase). Fix: el adapter coerciona los campos tipados del modelo (Int: totalCredits/totalPeriods; Bool: appearsInDiploma) + stripea la FK institutionId, antes de delegar. **Lección: es asimetría create-vs-update del core (object-manager); el fix-correcto sería que updateInstance coercione como createInstance — el adapter de cd lo cubre mod-side mientras tanto.** PENDIENTE: validar en UI editando un Plan completo (todos los campos) tras sync:logic + restart OM. | execute (UI bug edit Plan) | — | refined | BUG-object-manager-001 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

> **Spec**: [SPEC-curriculum-design-fix-orgunit-reduced-adapt](../specs/SPEC-curriculum-design-fix-orgunit-reduced-adapt.md) (status: draft) — diagnóstico, REQs (FIX-01/FIX-02/REGRESSION-01), fix scope y task contracts. DET-32: veredicto **reuse** (reusa el contrato Faculty de engagement).

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-06-22T14:30:28.000Z | false → super | dev trigger "super autopilot" — correr autónomo por-ticket hasta terminar | S1 (próximo gate) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate | Criterio |
|---|----------|------|------|-----------------|------|----------|
| S1 | Adaptar modelo + runtime + seeds + tests al OrgUnit reducido (mapeo Academic* → Faculty) | execute | T2 | Fase A: objects/AcademicProgram.json + logic/syllabus-offering.resolver.js + config/layouts (descripciones/runtime). Fase B: seeds (_data-aiep, _data-univalle, _data-academicprogram, _data-syllabus) + stub rt__Faculty__OrgUnit. Fase C: tests/integration/seed-counts.test.ts + llm-e2e fixtures | S1.GATE (⚑ fuerte) | `npm test` verde (746+ con seeds stubbeados adaptados); cambios coherentes con el contrato de engagement; commits granulares por fase |
| S2 | Validación DB-gated (acceptance real) | execute | T1 | reset-mods + sync (regenera OrgUnit desde engagement) + seed AIEP/Univalle; verificar Faculty + extensión institutionId + AcademicProgram resuelto | S2.GATE (⚑ fuerte, DB-gated) | seed corre sin error contra el schema regenerado; OrgUnit Faculty creada con institutionId en extensión; lo corre el dev o autorización explícita |

> Fases A/B/C son atómicas dentro de S1: cada una deja el mod compilando y con tests verdes (stub). S2 es la prueba real contra DB (separada por ser DB-gated/interactiva). El detalle de REQs + task contracts se materializa en la spec (design-fix).

### Session 1 — 2026-06-22 — Adaptación de código al OrgUnit reducido (Faculty) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Adaptar curriculum-design al OrgUnit reducido de engagement: mapear el nodo académico al RecordType `Faculty` + extensión `rt__Faculty__OrgUnit` (institutionId), codificar el rol governance/execution por FK de AcademicProgram (no por recordType), y dejar el mod con la suite verde (746+) contra stubs adaptados. Acceptance real DB-gated diferido a S2.

parallel_groups: [[S1.T1, S1.T2, S1.T3], [S1.T4, S1.T5]]

**Tasks completadas**:
- [x] S1.T1 — Actualizar descripciones de AcademicProgram (objeto + layout) a recordType=Faculty
- [x] S1.T2 — Adaptar resolver syllabus-offering: query recordType Faculty
- [x] S1.T3 — Adaptar seeds de creación: Faculty + rt__Faculty__OrgUnit.upsert(institutionId)
- [x] S1.T4 — Adaptar seeds de búsqueda: find via rt__Faculty__OrgUnit / recordType Faculty
- [x] S1.T5 — Extender stub rt__Faculty__OrgUnit + actualizar seed-counts.test + fixtures llm-e2e
- [x] S1.GATE — Quality review (DET-23 dual-judge) + suite verde + commits granulares por tipo

**Validacion del tier**:
- T2 — vitest run del mod (45 files) + cobertura del seed/resolver: **748/748 pasan** (cmd: `npm test` desde mods/curriculum-design; baseline 746 + 2 TC nuevos de la extensión Faculty UV/AIEP). Sin errores de lint/tipos.

**Discoveries / Learns nuevos**:
- L3: el stub de seed-tests (`makePrismaMock`) es un Proxy genérico → S1.T5 "extender stub" resultó no-op.
- L4: decisión del `type` de la unidad Faculty — se mantiene descriptivo (`School`/`Department`), no `Faculty` redundante.

**Quality review (DET-23)** — modo: **dual-judge (DET-35, T2)** · 2 jueces ciegos en paralelo, tier `balanced` (A+B); sin disputa → sin adjudicador `reasoning`. Trigger-rules: diff 16.2k chars / paths seed+resolver+tests → no recomendó subir tier (T2 ya adecuado).

**Reviewer**: dual-judge aislado (Judge A + Judge B, sub-agentes sonnet en contexto limpio)
**Tier de revision**: exhaustive (dual-judge)
**Resultado global**: **APPROVED** (ambos jueces `approve`; cero CRITICAL, cero WARNING real confirmado)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios quirúrgicos; upsert idempotente fuera del `if`; sin magic strings (Faculty es enum canónico de engagement) |
| 2 | Lint | pass | Suite verde sin errores de formato |
| 3 | Tipado | n/a | Archivos .js (seed/resolver); el .ts de test no agrega tipos nuevos |
| 4 | Testing | pass | 748/748; aserciones muerden (Faculty + ausencia institutionId inline + upsert con institutionId) en UV y AIEP; mutación N/A (diff-only no gatilla) |
| 5 | Escalabilidad | pass | Cache por institutionCode evita N+1 en loadAcademicPrograms |
| 6 | Mantenibilidad | pass | Comentarios explican el porqué (engagement canónico); upsert autodocumentado |
| 7 | Claridad | pass | Descripciones de objeto/layout/docs actualizadas a la nueva semántica |
| 8 | A11y | n/a | Fix sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error-handling | pass | `NO_ORG_UNIT` y early-return de syllabus intactos; path `facultyExt=null`→`execUnit=null` manejado |

**Veredictos dual-judge (findings):**

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| docs del mod citaban AcademicExecution/AcademicGovernance (DET-16) | info | warning | low | **confirmed → fixed** (academic-program.md, error-codes.md) |
| asimetría: bloque AIEP de seed-counts sin aserción de upsert | info | info | low | **confirmed → fixed** (aserción simétrica agregada) |
| mock de syllabusOffering.test no asierta `where:{recordType:Faculty}` | info | — | low | suspect (1 juez) — no auto-fix; cubierto end-to-end en S2 DB-gated |
| OrgUnitId undefined / naming PK | theoretical | theoretical | — | descartado (contract confirmado) |

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

> Ambos confirmados eran no-bloqueantes pero baratos + mejoran coherencia (DET-16) y mordida del test (DET-7) → fixeados post-approval (scope expandido a docs/ del mod, documentado). Re-corrida de suite: 748/748. No requirió re-judge (terminal APPROVED en ronda 1; proporcionalidad T2 warn-first).

```dkc:gate-telemetry
session: S1
work_type: fix
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 16236
est_tokens: 4388
span_seconds: 1980
```

**Commit DET-27**: `4e3ba5a` (curriculum-design) fix + `52ddb61` (curriculum-design) test + `3953474` (curriculum-design) docs (UPONE-1261, clean mode) — workspace externo: repo mod curriculum-design, no deckard

### Session 2 — 2026-06-22 — Re-aplicación de S1 + validación DB-gated (acceptance real) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (DB-gated, acceptance real)

**Objetivo**: Tras la reapertura (DEC-018 supersede DEC-017), re-aplicar la adaptación de S1 y validar la acceptance real contra DB: el seed de cd corre completo contra el OrgUnit/Institution reducido (Faculty + extensión institutionId), y AcademicProgram/Curriculum/sílabos cargan.

**Tasks completadas**:
- [x] S2.T1 — reset/sync + seed real (AIEP/Univalle); verificar OrgUnit Faculty + extensión institutionId + AcademicProgram resuelto
- [x] S2.GATE — Acceptance final + cierre de hipótesis + validación de cierre reforzada (reviewer aislado)

**Validacion del tier**:
- T3 (DB-gated) — el seed cd corre **completo** contra UPU: **5 AcademicProgram, 2 Curricula, 3 sílabos, 9 BibliographyReference, 2 OrgUnit `Faculty`** (+ extensión institutionId). sync:db sin errores de columna/enum. Suite del mod 748/748. Evidencia: seed ejecutado directo contra el schema regenerado desde engagement.

**Discoveries / Learns nuevos**:
- L5 (REFUTADO): la conclusión de S2-intento ("la reducción no está viva en core") se basó en un `schema.prisma` generado local stale. Verificación independiente contra el git committeado del core la refutó → DEC-018. Promovido a RULE-curriculum-design-009.
- L6: blast radius incompleto — la reducción también tocó `Institution.country` (movido a Organization), no solo OrgUnit. Fix: quitarlo del seed (commit 9c6fd0f). Promovido a RULE-curriculum-design-009.
- L7: bug de edición de Curriculum Plan (asimetría create/update del core, surfaceado por la reducción). Workaround parcial mod-side (36383df); fix completo derivado a TICKET-077. Promovido a BUG-object-manager-001.

**Quality review (DET-23)** — modo: **reviewer aislado (validación de cierre reforzada, HOR-079 REQ-03)** · sub-agente en contexto limpio, read-only, contraste código-vs-spec + scope + rama. La adaptación de S1 ya había pasado dual-judge (T2) en S1.GATE; S2 valida el conjunto consolidado + el delta de blast radius (9c6fd0f).

**Reviewer**: reviewer aislado (sub-agente sonnet, contexto limpio, read-only)
**Tier de revision**: balanced (validación de cierre)
**Resultado global**: **APPROVED** (recommendation approve; 5/5 checks pass; 0 CRITICAL, 0 WARNING; working tree limpio post-review — sin contaminación)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Upsert idempotente fuera del `if`; sin magic strings (Faculty es enum canónico); cache por institutionCode evita N+1 |
| 2 | Lint | pass | Suite verde sin errores de formato |
| 3 | Tipado | n/a | Archivos .js (seed/resolver); .ts de test sin tipos nuevos |
| 4 | Testing | pass | 748/748; aserciones simétricas UV/AIEP muerden (Faculty + ausencia institutionId inline + upsert) |
| 5 | Escalabilidad | pass | Cache por institutionCode en loadAcademicPrograms |
| 6 | Mantenibilidad | pass | Comentarios explican el porqué (engagement canónico) |
| 7 | Claridad | pass | Descripciones de objeto/layout/docs a la nueva semántica |
| 8 | A11y | n/a | Fix sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error-handling | pass | `NO_ORG_UNIT` y early-return de syllabus intactos; path facultyExt=null manejado |

**Verificación de scope (DET-13/16)**: los 4 commits del ticket (bb263bd/77ce01b/a1231a7/9c6fd0f) caen todos dentro de `execute_scope`; cero consumers residuales del modelo viejo (grep `AcademicGovernance`/`AcademicExecution`/`Geographic`/`institutionId` en seeds/`country` en institution.upsert: cero ocurrencias). Propagación completa (resolver, seeds create+search, objeto, layout, docs, tests, fixtures).

**Gate decision:** (approvedBy: dev)

- [x] continue → cierre (request-close)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> S2 cierra la acceptance real (DB-gated). El bug de edición de Curriculum (L7) es de origen core, fuera del scope de 076 → derivado a TICKET-077 (no bloquea el cierre). Reviewer aislado APPROVE → procede el cierre.

```dkc:gate-telemetry
session: S2
work_type: fix
tier: T3
review_mode: isolated-reviewer
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 0
est_tokens: 56063
span_seconds: 107
```

**Commit DET-27**: `bb263bd` (curriculum-design) fix + `77ce01b` (curriculum-design) test + `a1231a7` (curriculum-design) docs (re-aplicación S1 vía cherry-pick) + `9c6fd0f` (curriculum-design) fix (blast radius Institution.country) — UPONE-1261, clean mode. Reemplazan los originales `4e3ba5a`/`52ddb61`/`3953474`. Push diferido (siempre pregunta).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-1 (OrgUnit Faculty + institutionId via extensión) | TC-1 ✓, TC-2 ✓ | integration (stub) + DB-gated | COVERED — stub (S1) + acceptance real DB-gated (S2) |
| REQ-FIX-2 (resolución governance/execution por FK, no recordType) | TC-3 | integration | COVERED (S1, estructural) |
| REQ-REGRESSION (suite curriculum-design intacta) | TC-4 | integration | COVERED (S1) |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-1 | Seed crea OrgUnit recordType=Faculty + rt__Faculty__OrgUnit con institutionId | REQ-FIX-1 | integration (stub) | seed AIEP | correr _data-aiep.js | OrgUnit.recordType='Faculty'; extensión con institutionId del tenant | OrgUnit.recordType='Faculty', sin institutionId inline; 1 upsert rt__Faculty__OrgUnit con institutionId | seed-counts.test.ts "crea 1 OrgUnit con recordType=Faculty" + "ancla la institucion via upsert de rt__Faculty__OrgUnit"; npm test 747/747 | pass |
| TC-2 | Seed/sync real no rompe contra schema regenerado de engagement | REQ-FIX-1 | DB-gated | reset/sync (schema regenerado desde engagement) | correr seed AIEP/Univalle | sin error de columna/enum; AcademicProgram resuelve governance/execution | Seed corre completo en UPU: 5 AcademicProgram, 2 Curricula, 3 sílabos, 9 BibliographyReference, 2 OrgUnit Faculty (+ extensión institutionId); sync:db sin errores | S2 — seed ejecutado directo contra el schema regenerado (UPU); ver Summary | pass |
| TC-3 | AcademicProgram distingue governance vs execution por FK (governanceUnitId/executionUnitId), ambas Faculty | REQ-FIX-2 | integration | AcademicProgram seed | crear programa con ambas unidades Faculty | rol correcto por FK, sin depender de recordType | governanceUnitId + executionUnitId son FK independientes a OrgUnit.id; rol por FK, OrgUnit sin recordType académico; seed asigna executionUnitId resuelto via rt__Faculty__OrgUnit | objects/AcademicProgram.json (FK governanceUnitId/executionUnitId + descripciones Faculty); _data-academicprogram.js resuelve execUnit por extensión. Verificación runtime end-to-end en S2 | pass (estructural; runtime en S2) |
| TC-4 | Suite curriculum-design verde (regresión) | REQ-REGRESSION | integration | post-cambios | `npm test` | 746+ pasan (con seeds adaptados) | 747/747 pasan (45 files) | `npm test` desde mods/curriculum-design: Test Files 45 passed, Tests 747 passed | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design (vitest) | `npm test` (desde mods/curriculum-design) | 746/746 ✓ (post-merge + limpieza TICKET previo) | 748/748 ✓ (45 files) | +2 (TC nuevos: upsert rt__Faculty__OrgUnit + simetría AIEP en seed-counts) |

## Summary

**CERRADO — 2026-06-22.** Adaptación de curriculum-design al OrgUnit/Institution reducido de engagement **completa y validada en DB** (S1 cd→Faculty + S2 acceptance real). DEC-018 supersede DEC-017. El bug de edición/clonar/versionar de Curriculum (L7, origen core) se derivó a TICKET-077 (mod-only + revert coordinado); no bloquea este cierre por ser fuera de scope.

**Línea de tiempo (con un round-trip por error de análisis propio):**

1. **S1 — adaptación a Faculty (correcta).** cd adaptado al OrgUnit reducido de engagement: seeds crean `recordType=Faculty` + extensión `rt__Faculty__OrgUnit(institutionId)`; búsquedas y resolver vía Faculty; rol governance/execution por FK de AcademicProgram. Aprobado por dual-judge (T2), suite 748/748. Commits originales `4e3ba5a`/`52ddb61`/`3953474`.

2. **S2 → conclusión errada (DEC-017).** El análisis de S2 corrió contra un `prisma/UPU/schema.prisma` GENERADO **local stale** (con el OrgUnit viejo: institutionId + enum académico) — el entorno no se había re-sincronizado tras la reducción. Concluí (mal) que "la reducción no está viva en core" y se revirtió S1 + cerró wont-do (DEC-017).

3. **Síntoma.** Tras rearmar UPU, AcademicProgram=0 y Curriculum=0 — el seed cd-viejo (`orgUnit.findFirst/create({institutionId, recordType:'AcademicExecution'})`) rompe contra el OrgUnit reducido (esos campos/enum ya no existen).

4. **Verificación independiente (git real).** Un agente en contexto limpio confirmó: la reducción del OrgUnit ES canónica (`Base/orgunit.json` reducido en develop + rama desde `42f55f3`, 2026-06-09, **sin revert**); el seed cd rompe contra ella (más amplio: también el create de `_data-aiep`/`_data-univalle`); cd→Faculty es la adaptación correcta. El schema local stale (preservado en el stash `8fc927e`) fue la causa de la confusión. **DEC-017 quedó refutada contra la fuente.**

5. **Corrección (DEC-018).** DEC-017 superseded. Ticket reabierto. S1 re-aplicado via cherry-pick (commits `bb263bd` fix / `77ce01b` test / `a1231a7` docs); **suite 748/748**.

6. **Blast radius completado.** Al validar contra el OrgUnit reducido real, el seed seguía fallando — pero en **Institution**, no OrgUnit: el seed pasaba `Institution.country`, removido por la reducción (movido a Organization). S1 había cubierto solo OrgUnit; el intake no mapeó Institution. Fix: quitar `country` del `institution.upsert` en ambos seeds (commit `9c6fd0f`). Ver Learn L6.

**S2 — VALIDADO en DB (2026-06-22).** Con la adaptación completa (OrgUnit→Faculty + Institution.country), el seed cd corre **completo** contra UPU: **5 AcademicProgram, 2 Curricula, 3 sílabos, 9 BibliographyReference, 2 OrgUnit `Faculty`** (+ extensión institutionId). sync:db sin errores, suite 748. La adaptación de cd al org-spine reducido está **funcionalmente completa y validada**.

> Nota de entorno (no cd): el reset/sync canónico headless topa con el drift §7 (BASEMODEL/UPU db push `--accept-data-loss`); el dev lo corre interactivo o con el flag que el propio error sugiere. Eso es operación de entorno, ortogonal a la adaptación de cd (que ya quedó validada corriendo el seed directo).

### What was learned (cierre)

- **Learns**: 7 capturados → 6 refined, 1 discarded.
- **Rules creadas (4)**:
  - [RULE-curriculum-design-009](../rules/curriculum-design/rule-curriculum-design-009.md) (global) — adaptar a reducción upstream: verificar liveness vs git del core + blast radius sobre TODOS los objetos reducidos (de L5 refutada + L6).
  - [RULE-curriculum-design-008](../rules/curriculum-design/rule-curriculum-design-008.md) — el stub de seed-tests es Proxy genérico: no atrapa breaks de modelo (solo DB-gated) (de L3).
  - [RULE-curriculum-design-006](../rules/curriculum-design/rule-curriculum-design-006.md) — Activity es co-definido por cd + engagement (de L1).
  - [RULE-curriculum-design-007](../rules/curriculum-design/rule-curriculum-design-007.md) — cd es seeder de facto del org-spine; orden cross-mod no-determinístico (de L2).
- **Bugs (1)**: [BUG-object-manager-001](../bugs/object-manager/bug-object-manager-001.md) — updateInstance vía alias RT no castea como createInstance (de L7) → fix en TICKET-077.
- **Decisions**: DEC-016 (enfoque B, rector), DEC-017 (superseded), DEC-018 (vigente — supersede 017).
- **Follow-up**: [TICKET-077](ticket-077.md) — edición/clonar/versionar Curriculum mod-only + revert coordinado de 98590c0.

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 2 (S1 adaptación, S2 validación DB-gated + reapertura) |
| Tasks completed | 7/7 (S1.T1-T5+GATE, S2.T1+GATE) |
| Commits | 4 (bb263bd, 77ce01b, a1231a7, 9c6fd0f) + 36383df (workaround del bug → TICKET-077) |
| Learns captured | 7 (6 refined, 1 discarded) |
| Learns → rules | 4 (RULE-cd-006/007/008/009) |
| Learns → bugs | 1 (BUG-object-manager-001) |
| Learns discarded | 1 (L4) |
| Decisions | 3 (DEC-016 / DEC-017 superseded / DEC-018) |
| Test cases | 4 pass / 0 fail / 0 pending |
| Regression | curriculum-design 748/748 (baseline 746, +2) |
| SP executed (sessions-heuristic) | 2 (llm 1 / human 1; published/estimated n/d) |

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| bb263bd | 2026-06-22 | UPONE-1261 fix(curriculum-design): adaptar al OrgUnit reducido de engagement (mapeo academico->Faculty) | S1.T1-T4 | REQ-FIX-01/02 |
| 77ce01b | 2026-06-22 | UPONE-1261 test(curriculum-design): seed-counts y fixtures verifican OrgUnit Faculty + extension | S1.T5 | REQ-REGRESSION-01 |
| a1231a7 | 2026-06-22 | UPONE-1261 docs(curriculum-design): academic-program y error-codes a recordType=Faculty | S1.GATE | REQ-FIX-01 |
| 9c6fd0f | 2026-06-22 | UPONE-1261 fix(curriculum-design): quitar Institution.country del seed (org-spine reducido lo movio a Organization) | S1 (blast radius completado) | REQ-FIX-01 |

> Commits locales en repo mod `curriculum-design`, rama `UPONE-1261-academic-program` (clean mode DET-19), re-aplicados via cherry-pick tras el revert errado. Reemplazan los originales `4e3ba5a`/`52ddb61`/`3953474` (mismo contenido). **Push diferido** — siempre pregunta.
