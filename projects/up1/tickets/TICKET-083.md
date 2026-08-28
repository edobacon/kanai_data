---
id: TICKET-083
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1346
module: curriculum-design
autopilot: autonomous
---

# Malla — Objeto requirement (Composite, 3 RecordTypes) + bloque electivo

> **MC-03** ⭐ (objeto más complejo del sprint, riesgo de estimación #1) · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "A") · Tier 🅼 Must (bloque electivo 🆂 Should) · 7 SP · repo `mod` · Fase F1.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-03.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-03.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | `planEntry.blockId` para el bloque electivo (REQ-09/10) | closed |

## Request

Como diseñador curricular, quiero expresar prerrequisitos, electivos y umbrales como un árbol de reglas, y representar bloques electivos sobre el plan, para modelar las condiciones de la malla.

Agrupa A3 + A4 (handoff). Objeto `requirement` patrón Composite (árbol por parentId) con base polimórfica (ownerType/ownerId) + 3 RecordTypes: RecordState (curso: targetType activity, mustBe, threshold?, timing?), Group (electivos K-de-N: combinator AND/OR, minToSatisfy?, creditsRequired?), MetricThreshold (créditos: metric Credits, scope?, operator, value). Enums cerrados; solo persistencia/lectura del árbol (sin motor de evaluación, eso es SP6). Bloque electivo (Should) = requirement(Group, ownerType=curriculum, OR) + derivación sobre planEntry.blockId. Layouts por RecordType copiando CurricularSection.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | data model (objeto Composite + 3 RecordTypes + resolvers de árbol + layouts por RT + seed) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only). MCP-ready para MC-04 |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | layouts por RecordType (copiar patrón), sin componente nuevo |
| Data model | sí | objeto `requirement` + 3 RT nuevos → draft data-model recomendado al tomar (DET-18) |

## Triage

### ⚠️ Nota de calibración (leer antes de estimar)
Objeto más complejo del sprint y **riesgo de estimación #1**. Análogo histórico `ticket-009` (primer multi-RT del mod, `CurricularSection`): estimado 2, ejecutó 7 (×3.5) — pionero de layouts-por-RT y modelado polimórfico. **A favor de 7:** ese costo pionero ya está pagado (H-4 resuelto; FK polimórfica y árbol en producción). **Trato:** 7 SP es **piso**; si se infla, recortar Should (REQ-09/10) antes que el núcleo. Ver `SP5-alcance-y-justificacion.md §5`.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El patrón `CurricularSection` (7 RT, 19 layouts, árbol parentId, FK polimórfica) se copia sin fix de core | ✓ confirmada | auditoría H-4 resuelto; en producción. **Capa objects** (`objects/CurricularSection.json`): base con `metadata.directChildren` (self-FK recursiva), `parentId` con `isForeignKey+references+targetField`, `ownerType` enum + `ownerId` sin FK, `recordType` string libre, `static_default` como string, timestamps auto-codegen. **Capa RT** (`objects/RecordTypes/rt__<RT>__curricularsection.json`): `baseObject` + solo props propias. |
| H1.1 | Validación de enums (REQ-03) y `label` obligatorio (REQ-04) se logra por JSON schema (`enum`/`required`), NO por resolver | ✓ confirmada | **Capa objects**: CurricularSection declara `enum` en props + `required:[...]`; el create genérico del platform los enforcea. **Capa logic**: NO hay resolver de create propio de CurricularSection que valide enums (sectionValidation es para reglas de negocio, no enums). ⇒ REQ-03/04 = schema, sin tocar resolvers. |
| H1.2 | Validación `ownerType↔ownerId` (REQ-06) se resuelve por convención documentada, no por resolver nuevo | ✓ confirmada | **Capa logic**: CurricularSection NO valida la pareja polimórfica (`ownerId` sin FK real; ningún resolver la chequea). **CONSTRAINT H7**: solo UN override de `createInstance` por mod (ya tomado por `sectionValidation.resolver.js`); añadir validación de requirement exigiría extenderlo (riesgo de colisión). TC-05 permite "(o doc convención)" ⇒ doc convención para SP5, alineado al pattern. |
| H1.3 | El update de `rt__*__requirement` hereda el bug `_previousData` que `polymorphicUpdate.resolver.js` arregla solo para `curricularsection` (RT_PATTERN hardcoded) | ✓ confirmada | **Capa logic**: `RT_PATTERN = /^rt__([a-zA-Z0-9_]+)__(curricularsection)$/` NO matchea `requirement`. El bug: `withEventPublish` no hace pre-fetch en tablas cuya PK es `<obj>Id`. ⇒ soportar update de rt__requirement exige **extender RT_PATTERN** a `(curricularsection|requirement)` (cambio en código compartido → CurricularSection debe seguir pasando sus tests). Alternativa: REQ-05 = persistir+reconstruir (create+read); update queda como decisión de design. |
| H1.4 | "Reconstruir el árbol" (REQ-05/TC-01) es concern de READ (listInstances flat filtrable por parentId), no requiere resolver de árbol en backend | ✓ confirmada | **Capa logic**: CurricularSection NO tiene resolver de "tree"; usa `listInstances` genérico (flat) + ensamblado en frontend (`buildTree.ts`) + seed root→children. Como `creates_visual:false`, TC-01 verifica round-trip persist→read-flat preservando jerarquía `parentId`. |
| H1.5 | `requirement` NO va al menú (REQ-07) replicando convención CurricularSection (sin `_list`, layouts RT `applicationId:null`/RecordDetail) | ✓ confirmada | **Capa layout**: ningún RT de CurricularSection tiene `_list`; todos `RecordDetail` con `applicationId:null` ⇒ no en nav (embebidos bajo owner). Alineado con TICKET-093 (showInNav) y MC-02 (planEntry/requirementCategory sin `_list`). |

### Context found

**KB del módulo (kb_refs: DEC-029, DEC-031, RULE-cd-012, RULE-cd-013):**
- mod-only; **layouts por RecordType ya soportados** (`resolveDefaultLayout` resuelve por convención — H-4).
- **FK polimórfica `ownerType/ownerId`** se modela como convención (sin integridad referencial en DB), validar en capa app.
- MCP-ready (enums + FK refs + labels) para MC-04.

**Necesidad/reuso (DET-32):** objeto `requirement` (base + 3 RT) = **build** (motor de reglas). FK polimórfica, self-FK `parentId`, multi-RT, layouts por RT = **reuse** (patrón `CurricularSection`). Bloque electivo (A4) = **reduce** (no objeto nuevo: `requirement(Group)` + derivación sobre `planEntry.blockId`).

**Supuestos (confirmados):** solo persistencia/lectura del árbol — **sin motor de evaluación** (degree-audit) en SP5; 3 RT (`recordType` enum extensible, futuros documentar no implementar); `RecordState.targetType` solo `activity`; `MetricThreshold.metric` solo `Credits`.

## Pre-spec (transcrito de MC-03.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · `requirement` base (Composite) | confirmed | handoff §2.3 | base: ownerType {curriculum,activity,offering}, ownerId (FK polimórfica), parentId?, recordType {Group,RecordState,MetricThreshold}, effect {EligibilityToEnroll,ProgressGate,Completion,DiplomaAward}, label (req), isHardRule (def true), negate (def false), overrideMode? (solo offering), position, timestamps. |
| REQ-02 · 3 RecordTypes con campos propios | confirmed | handoff §2.3 | `rt__RecordState`: targetType{activity}, targetId, mustBe{Approved,Taken}, threshold{minGrade}?, timing{Before,Concurrent,Either}?. `rt__Group`: combinator{AND,OR}, minToSatisfy?, creditsRequired?. `rt__MetricThreshold`: metric{Credits}, scope{plan,category}?, scopeId?, operator{>=,>,=,<,<=}, value. |
| REQ-03 · enums cerrados y acotados | confirmed | handoff §2.3 | RecordState.targetType solo `activity`; MetricThreshold.metric solo `Credits`; todos cerrados. |
| REQ-04 · `label` obligatorio | confirmed | handoff §2.3 + transcript 00:18:24 | `label` requerido (etiqueta de dominio; también nombre del bloque electivo). |
| REQ-05 · árbol persiste y se reconstruye | confirmed | handoff §2.3 + §2.5 (EST200) | persistir/reconstruir por `parentId` (anidamiento solo en Group); seed incluye EST200. |
| REQ-06 · FK polimórfica + validación app | confirmed | auditoría H-5 + patrón Curriculum.ownerId | `ownerId` sin integridad referencial en DB (convención); resolver DEBERÍA validar `ownerType↔ownerId`. |
| REQ-07 · layouts por RecordType | confirmed | auditoría H-4 (19 layouts CurricularSection) | declarar `default_rt__*__requirement_{view,edit,create}` copiando patrón; `resolveDefaultLayout` por convención. **NO declarar ningún `_list` para `requirement` ni sus RT**: es sub-estructura embebida bajo su owner (curriculum/activity/offering), patrón CurricularSection — **no va al menú de objetos** (igual que planEntry/requirementCategory de MC-02, sin `_list`). El menú = layouts RecordList con `showInNav!==false`; si el codegen genera un list por defecto para `requirement`, setearle `showInNav:false`. Ver cierre de TICKET-093 (showInNav gobierna el menú). |
| REQ-08 · `recordType` extensible (doc) | confirmed | handoff §2.3 | documentar enum extensible (futuros AttributeMatch, etc.) sin implementar en SP5. |
| REQ-09 · bloque electivo = Group sobre el plan (🆂) | confirmed | handoff §2.4 + §2.6 | `requirement(Group, ownerType=curriculum, OR, minToSatisfy/creditsRequired)`; nombre = label; seed §2.6 ("Electivo de Especialización", OR, minToSatisfy=4, creditsRequired=24). |
| REQ-10 · electividad derivada de membresía (🆂) | confirmed | handoff §2.4 | derivación: `planEntry.blockId == null` → obligatorio; `!= null` → electivo; "electivos de una línea" = blockId!=null agrupados por categoryId. |

<details><summary>Escenario EST200 (REQ-05)</summary>

```gherkin
GIVEN el seed EST200: Group[AND]{ Group[OR]{ Group[AND]{MAT110, MAT120}, MAT210 }, MetricThreshold(≥60cr), RecordState(PROG101, advisory) }
WHEN se lee el requirement raíz de act_EST200
THEN se reconstruye el árbol completo con esa jerarquía y combinadores
```
</details>

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | `objects/requirement.json` (base, REQ-01,03,04,06) | eliminar archivo + `reset-mods` |
| T2 | 3 × `objects/RecordTypes/rt__*__requirement.json` (REQ-02,03) | eliminar archivos |
| T3 | resolvers create/read/update (persisten/reconstruyen árbol por parentId, REQ-05); validación ownerType↔ownerId (REQ-06) | revertir resolvers |
| T4 | layouts por RecordType (copiar CurricularSection) + lang `es_CL@requirement` + por RT (REQ-07) | revertir layouts/lang |
| T5 | `seed/`: árbol EST200 (REQ-05) + bloque electivo §2.6 (REQ-09) | quitar seed |
| T6 | derivación obligatorio-vs-electivo documentada + query (REQ-10) | revertir query |
| T7 | doc de extensibilidad de `recordType` (REQ-08) | quitar nota |

### Dependencias

- **Depende de:** ninguna dura para el objeto; el bloque electivo (REQ-09/10) usa `planEntry.blockId` (MC-02).
- **Habilita:** MC-05/06 (malla lee bloques + badges), MC-06 (B5 crea bloques), MC-08 (B6 lee prereqs), MC-09 (validación lee `requirement owner=activity`), MC-04 (contrato MCP), S7-01/S7-03.
- **Patrón:** `objects/CurricularSection.json` + 7 RT + 19 layouts + resolvers.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU; `reset-mods`/sync tras crear objetos |
| Services | object-manager (codegen/sync), suite (layouts por RT) |
| Test data | seed EST200 + bloque electivo §2.6 |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **CONSTRAINT H7 — un solo override de `createInstance` por mod.** El create genérico del platform es una sola mutation; `sectionValidation.resolver.js` ya la overridea para curriculum-design. La validación de enums/required de `requirement` debe ir por JSON schema (`enum`/`required`), NO por un segundo override (colisionaría). | intake-explore (Explore agent) | S0 | refined | docs/patterns/resolver-override.md |
| L2 | **`polymorphicUpdate.resolver.js` tiene RT_PATTERN hardcoded a `curricularsection`.** `/^rt__([a-zA-Z0-9_]+)__(curricularsection)$/`. Arregla el bug `_previousData` (pre-fetch en tablas con PK `<obj>Id`) solo para CurricularSection. Para soportar update de `rt__*__requirement` hay que extender el pattern a `(curricularsection\|requirement)` — cambio en código compartido, regression de CurricularSection obligatoria. | intake-explore (Explore agent) | S0 | refined | backlog B-1 |
| L3 | **La reconstrucción del árbol Composite NO es un resolver backend.** CurricularSection usa `listInstances` genérico (flat) + `buildTree.ts` en frontend + seed root→children. "Reconstruir" = read flat filtrable por parentId/ownerId/recordType. Para mod-only (sin UI), el test verifica el round-trip de datos, no el render. | intake-explore (Explore agent) | S0 | refined | requirement-object.md |
| L4 | **`tests/integration/layouts-declared.test.ts` afirma conteo exacto (45) + `recordtypes-declared.test.ts` auto-falla si un RT no tiene layout/lang.** Al agregar layouts de requirement hay que actualizar el conteo; cada RT nuevo exige su trío de layout + lang o el test rompe. | intake-explore (Explore agent) | S0 | discarded | — (mecánica de test, capturado) |
| L5 | **Convenciones exactas del pattern (para copiar archivo por archivo):** objeto base `objects/<Obj>.json`; RT `objects/RecordTypes/rt__<RT>__<objlower>.json` (`baseObject` + props propias); layout `config/layouts/default_rt__<RT>__<objlower>_{view,edit,create}.json` (`RecordDetail`, `applicationId:null`, `tenants:["UPU"]`, `id`==`name`==filename); lang `lang/es_CL@<Obj>.json` + `lang/es_CL@rt__<RT>__<objlower>.json` (con `_source_module`); FK del RT = `<objlower>Id`; seed = dos writes Prisma (base + rt). | intake-explore (Explore agent) | S0 | refined | requirement-object.md |
| L6 | **El codegen de objetos del mod (base Y RT) decide la nullability por `required[]`, NO por `not_null`** — confirma `RULE-cd-018`. `generateBaseModel:92` (base del mod) y `generateRecordTypeModel:681` (RT) ambos usan `required.includes(field)`; el `\|\| prop.not_null` de `:936` es el path de objetos **core** (`coreModelOrder`), NO del mod. ⇒ un campo del mod con `not_null:true` pero ausente de `required[]` emite columna Prisma nullable. **[Corrección post-cierre durante review de learns]**: mi framing inicial del dual-judge ("base honra not_null, RT no — asimetría") era ERRÓNEO — confundí `:936` (core) con el path del base del mod. No hay asimetría base-vs-RT; ambos paths del mod usan `required[]`. El fix (agregar `required[]` a cada RT) fue correcto igual. | dual-judge S1 (Judge B) + corregido en review de learns | S1 | refined | RULE-cd-018 |
| L9 | **Seed idempotente requiere resolución de owner DETERMINISTA + guard global-por-label.** El seed de `_data-requirement.js` resolvía el owner con `Activity.findFirst` SIN `orderBy` (no determinista en Postgres) y el guard de "raíz existe" estaba acotado a ese owner → en la 2ª corrida del seed (reset+sync repetido) tomó otra activity y replantó el árbol EST200 completo (→ 2 árboles duplicados, 17 filas vs 9 esperadas). El bloque electivo (owner curriculum estable) sí fue idempotente. Fix: guard global por `label` (no acotado al owner) + `orderBy:{id:'asc'}`. Detectado por verificación DB-gated tras reset del dev (TC-01/TC-06). | DB-gated verify (dev reset) | post-S4 | refined | RULE-cd-022 |
| L8 | **Un campo BASE requerido sin `static_default` debe estar en los layouts create/edit del RT, o no hay cómo setearlo.** `effect` (not_null + required, sin default) faltaba en los 9 layouts → todo create de un rt__requirement fallaría. A diferencia de `ownerType`/`ownerId`/`recordType` (inyectados por el contexto de embedding, precedente LearningOutcome), `effect` es elección de dominio por regla → editable. Fix: agregado como `select` required en create/edit + text en view. | reviewer aislado S3 | S3 | refined | RULE-cd-023 |
| L7 | **Los VALORES de enum de campos RT-propios NO se enforcean a nivel app** (`validateBaseFieldFormats` filtra `isBaseField:true`, excluye RT) **ni a nivel DB** (los campos enum RT emiten como `String` plano, no enum Prisma). ⇒ tras el fix L6, `not_null` rechaza null, pero un valor inválido (ej. `targetType="course"`, `metric="GPA"`) NO se rechaza en runtime — afecta TC-02/TC-03. Es gap de plataforma (toca todos los RT del mod). El enum SÍ queda declarado (consumible por MCP/UI). Confirmado empírico en uplanner_upu (columnas `text`). | dual-judge S1 (Judge B) | S1 | refined | RULE-cd-016 |
| L10 | **(Proceso/DKC) El dual-judge + la verificación DB re-descubrieron empíricamente `RULE-cd-016` y `RULE-cd-018` — rules ya existentes** — porque no se inyectaron al developer al crear los RecordTypes. Gap de DET-34 (KB-injection): para un ticket que CREA objetos con RecordTypes, `dkc-resolve-kb`/el handoff deberían surfacear las rules del módulo tagged `[codegen]`/RT (016, 018) al developer en Fase A. Se llegó al resultado correcto pero por re-descubrimiento (costo evitable). Candidato a mejora de deckard-core (NO accionado ahora — decisión del dev). | review de learns (post-cierre) | post-S4 | refined | deckard backlog (proceso) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-26 | (none) → super | dev: `/dkc 083 super autopilot` | intake-explore |

### Plan de sessions (preplanificacion)

4 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria) lo refina `design-feature` al generar el spec. Numeración continua: no hay `### Session N` previas (la fase de discovery/intake usó S0 para records de decisión), el plan de execute arranca en S1.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Objeto base `requirement` + 3 RecordTypes (enums/required por schema) + codegen/sync | 1 | T2 | T1, T2 | ⚑ fuerte | objeto + 3 rt en DB tras sync; `recordtypes-declared` pasa; enums cerrados verificados (TC-02, TC-03, TC-04) |
| S2 | Resolvers: lectura flat del árbol (parentId) + decisión update rt__ (extender RT_PATTERN vs diferir) + doc convención ownerType↔ownerId | 2 | T2 | T3 | auto | persist→read-flat preserva jerarquía (TC-01); ownerType↔ownerId documentado (TC-05); CurricularSection regression verde |
| S3 | Layouts por RT (view/edit/create) + lang base + por RT + verificación de NO-menú | 3 | T3 | T4 | ⚑ fuerte | layout RT resuelto por convención (TC-08); `requirement` ausente del menú tras sync (TC-09); `layouts-declared` actualizado |
| S4 | Seed EST200 (árbol) + bloque electivo §2.6 + derivación blockId obligatorio/electivo + doc extensibilidad recordType | 4 | T2 | T5, T6, T7 | auto | EST200 reconstruye árbol (TC-01); bloque electivo leíble (TC-06); derivación blockId (TC-07); nota extensibilidad |

**Notas del esqueleto**:
- **S1 es ⚑ fuerte**: codegen/sync sobre object-manager muta el registry + DB del tenant (additivo, `reset-mods`/`sync:db` upsert — no destructivo). Verificación empírica del schema generado (enums cerrados en `core_FieldDefinition`/typeDefs).
- **S2 toca código compartido** (`polymorphicUpdate.resolver.js`) si se decide soportar update de rt__requirement → regression obligatoria de CurricularSection (L2). Si se difiere update, S2 baja de alcance.
- **S3 es ⚑ fuerte**: TC-08/TC-09 son manuales (requieren sync de layouts a suite + abrir el menú). Aunque `creates_visual:false`, la verificación de no-menú necesita el entorno corriendo.
- Bloque electivo (REQ-09/10, S4) es 🆂 Should: si el núcleo (S1-S3) se infla, S4 se recorta primero (nota de calibración).

### Session 1 — 2026-06-26 — Objeto base `requirement` + 3 RecordTypes + codegen/sync [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: crear el objeto `requirement` (Composite, FK polimórfica, árbol parentId) y sus 3 RecordTypes con enums cerrados, corriendo codegen + sync limpio en UPU.

parallel_groups: [[S1.T1, S1.T2]]

**Tasks completadas**:
- [x] S1.T1 — Crear `objects/requirement.json` (REQ-01,03,04,06): enums ownerType/recordType/effect, ownerId sin FK, parentId self-FK, label not_null, required, metadata.directChildren + indexes
- [x] S1.T2 — Crear los 3 RT (`rt__Group__requirement`, `rt__RecordState__requirement`, `rt__MetricThreshold__requirement`) con baseObject + props/enums cerrados (REQ-02,03)
- [x] S1.T3 — Codegen + sync en UPU (additivo): objeto + 3 tablas RT en schema; verificar enums cerrados + rechazo runtime (TC-02,03,04)
- [x] S1.GATE — Gate de sync Session 1 (T2, ⚑ fuerte): persistir, quality review aislado, consolidar TCs, decidir

**Validación del tier** (T2): `recordtypes-declared.test.ts` = **30/30 PASS** (incl. 3 nuevos: baseObject=requirement de Group/RecordState/MetricThreshold). 4 objetos JSON parsean (node). eslint del test edit = EXIT 0. **Codegen + sync vivo contra UPU NO ejecutado — DB-gated, diferido al dev** (precedente TICKET-082 S1): TC-02/03/04 verificados a nivel declaración (enums cerrados + `required[]` ⇒ NOT NULL); el rechazo runtime del VALOR inválido para campos RT está sujeto a L7 (gap de plataforma, backlog B-2) y se confirma en el sync.

**Quality review (DET-23)** — loop dual-judge (DET-35, T2 ⚑ fuerte): 2 jueces ciegos `balanced` en paralelo, handoff idéntico (spec + REQ-01..06 + execute_scope + 5 archivos + reference CurricularSection), read-only. **Judge A → APPROVE** (sin CRITICAL/WARNING-real). **Judge B → ITERATE (CRITICAL)**: trazó `generatePrismaSchema.js` — el codegen de RT (L684) honra solo `required[]`, NO `not_null` (opuesto al base L937) ⇒ los campos discriminadores con `not_null:true` sin `required[]` emitían columnas Prisma nullable. **Contradicción → adjudicación leyendo la fuente del codegen** (DET-35 step 3): Judge B confirmado. **Fix quirúrgico**: `required[]` agregado a los 3 RT (combinator / targetType,targetId,mustBe / metric,operator,value). Re-verificado contra la fuente + recordtypes-declared 30/30. Self-report (DET-33): `git status` del submódulo mod limpio (solo los 5 cambios esperados, sin contaminación de los judges read-only). Terminal: **APPROVED tras 1 iteración de fix**.

| Dimensión | Judge A | Judge B | Veredicto | Nota |
|-----------|---------|---------|-----------|------|
| 1. Calidad/corrección | pass | CRITICAL→fixed | pass (post-fix) | required[] faltante en RT → nullable; corregido + verificado vs codegen source |
| 2. Lint/formato | pass | pass | pass | eslint test EXIT 0; 4 JSON válidos |
| 3. Tipado | n/a | n/a | n/a | JSON schema (sin TS) |
| 4. Testing | pass | pass | pass | recordtypes-declared 30/30 (3 nuevos baseObject=requirement) |
| 5. Escalabilidad | pass | pass | pass | additivo; patrón CurricularSection en producción |
| 6. Mantenibilidad | pass | pass | pass | copia fiel del patrón; convenciones documentadas en descriptions |
| 7. Claridad | pass | pass | pass | enums + FK polimórfica + extensibilidad recordType documentados |
| 8. a11y | n/a | n/a | n/a | sin UI |
| 9. Storybook | n/a | n/a | n/a | sin componente |
| 10. Error-handling | pass | warn→fixed | pass | enums cerrados; required[]⇒NOT NULL post-fix; gap de enum-valor RT (L7) → backlog B-2 |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Resultado global: **pass** (tras fix del CRITICAL). Hallazgo de plataforma (L7, enum-valor RT no enforced) → backlog B-2 (pre-existente, fuera de scope SP5).

**Commit DET-27**: (curriculum-design) `7958e59` UPONE-1346: add requirement Composite object + 3 RecordTypes (workspace externo al repo deckard — rama `UPONE-1267-sp5`, modo limpio por `external`)

### Session 2 — 2026-06-26 — Lectura/reconstrucción del árbol + helpers + doc convención [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: reconstruir el árbol por parentId con un helper puro (copia de `buildTree.ts`) verificado contra EST200, documentar la convención ownerType↔ownerId (REQ-06) y la decisión de no soportar update de rt__ en SP5.

**Tasks completadas**:
- [x] S2.T1 — Helper puro `logic/helpers/buildRequirementTree.js` (items planos → árbol parentId, detección de ciclos) + unit test que reconstruye EST200 (TC-01)
- [x] S2.T2 — Doc convención `ownerType↔ownerId` (REQ-06) en objeto + `docs/`; decisión #4 (no update rt__ SP5) + backlog
- [x] S2.GATE — Gate de sync Session 2 (T2): persistir, quality review, consolidar TC-01/TC-05, decidir

**Validación del tier** (T2): suite completa del mod `npx vitest run` = **885/885 PASS** (53 files), +7 nuevos (`buildRequirementTree`), 0 regresión sobre 878 (CurricularSection + sus RT intactos). eslint de los 2 archivos JS = EXIT 0. TC-01 verificado (reconstrucción EST200 a nivel unit); TC-05 satisfecho por la rama "(o doc convención)".

**Quality review (DET-23)** — inline-light (proporcionalidad, escape por costo — session-gate.md): el cambio de S2 es un **helper puro** (`buildRequirementTree`, 1 función, sin estado, sin I/O) + un **doc markdown**, con cobertura unit dedicada (7/7) + suite 885/885 + eslint 0 y **cero superficie de schema/codegen** (a diferencia de S1). El rigor dual-judge (DET-35) se reservó para S1 (⚑ fuerte, donde atrapó un CRITICAL real) y se reserva para S3 (⚑ fuerte) y los gates DB-gated. Dimensiones: 1 corrección **pass** (lógica espejo de `buildTree.ts`, ciclos cubiertos), 2 lint **pass**, 3 tipado n/a (JS), 4 testing **pass** (7 tests, assertions concretas: jerarquía, sort, orphan, ciclo, no-mutación), 5 escalabilidad **pass** (O(n), sin recursión en build), 6 mantenibilidad **pass** (helper puro testeable), 7 claridad **pass** (doc + JSDoc), 8 a11y / 9 storybook n/a, 10 error-handling **pass** (guard non-array, ciclo→warn+promote). Resultado: **pass**.

**Commit DET-27**: (curriculum-design) `e72682f` UPONE-1346: reconstruccion del arbol de requisitos (helper puro) + doc (workspace externo al repo deckard)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-26 — Layouts por RT + lang + verificación de no-menú [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: declarar los layouts RecordDetail por RecordType (sin `_list`) + las traducciones es_CL, y verificar que `requirement` no aparece en el menú de objetos tras el sync.

parallel_groups: [[S3.T1, S3.T2]]

**Tasks completadas**:
- [x] S3.T1 — Lang es_CL: `es_CL@requirement.json` + 3 × `es_CL@rt__<RT>__requirement.json` (labels + enums, `_source_module`)
- [x] S3.T2 — 9 layouts `default_rt__<RT>__requirement_{view,edit,create}.json` (RecordDetail, applicationId:null, tenants:[UPU]); actualizar conteo en `layouts-declared.test.ts`
- [x] S3.T3 — Sync layouts a suite + verificar TC-08 (layout del RT) y TC-09 (no-menú) — smoke UI DB-gated
- [x] S3.GATE — Gate de sync Session 3 (T3, ⚑ fuerte): persistir, quality review aislado, regression, consolidar TC-08/09, decidir

**Validación del tier** (T3): suite completa del mod `npx vitest run` = **904/904 PASS** (53 files), +19 sobre 885 (asserciones de layouts-declared). `layouts-declared` 85/85 (conteo 54, bloque requirement RT, asserción no-_list). eslint del test = EXIT 0; 13 archivos nuevos (9 layouts + 4 lang) parsean. **Sync de layouts a la suite + smoke UI (TC-08 render del RT, TC-09 menú real) DB-gated, diferido al dev**; verificados a nivel declaración (asertado por layouts-declared).

**Quality review (DET-23)** — reviewer aislado single-pass (⚑ fuerte; proporcionalidad: cambio declarativo JSON layouts/lang ya cubierto por 85 asserciones estructurales — el rigor dual-judge se gastó en S1, superficie schema/codegen). Read-only, handoff = spec REQ-07 + 13 archivos + reference LearningOutcome + object schemas. **Veredicto: ITERATE (1 WARNING-real)** → `effect` (campo base `not_null`+`required`, sin `static_default`) faltaba en los 9 layouts ⇒ todo create de rt__requirement fallaría. **Fix**: `effect` agregado como `select` required en create/edit + text en view + en tabs (a diferencia de ownerType/ownerId/recordType que el embedding inyecta, `effect` es elección de dominio por regla — L8). Re-verificado: layouts-declared 85/85 + las 6 create/edit tienen `effect` con `rules:required`. i18n confirmada completa (operator 5/5). Self-report (DET-33): `git status` mod limpio (solo los 13+1 archivos esperados). Terminal: **APPROVED tras 1 iteración**.

| Dimensión | Veredicto | Nota |
|-----------|-----------|------|
| 1. Calidad/corrección | pass (post-fix) | effect faltante → agregado (L8); cobertura de campos RT completa |
| 2. Lint/formato | pass | eslint test 0; 13 JSON válidos |
| 3. Tipado | n/a | JSON declarativo |
| 4. Testing | pass | layouts-declared 85/85; suite 904/904 |
| 5. Escalabilidad | pass | additivo |
| 6. Mantenibilidad | pass | id==name==filename; patrón LearningOutcome |
| 7. Claridad | pass | labels i18n completos |
| 8. a11y / 9. Storybook | n/a | sin UI nueva (creates_visual:false) |
| 10. Error-handling | pass | required en create/edit; no-_list garantiza no-menú |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Resultado global: **pass** (tras fix del WARNING-real).

**Commit DET-27**: (curriculum-design) `f277b84` UPONE-1346: layouts por RecordType + i18n es_CL de requirement (workspace externo al repo deckard)

### Session 4 — 2026-06-26 — Seed EST200 + bloque electivo + derivación + doc extensibilidad [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: sembrar el árbol EST200 + el bloque electivo §2.6, implementar la derivación electivo/obligatorio (helper + test) y documentar la extensibilidad de recordType. Bloque electivo es 🆂 Should.

**Tasks completadas**:
- [x] S4.T1 — Seed `seed/_data-requirement.js`: árbol EST200 (root→hijos, dos writes Prisma) + registrar en `seed/seed.js`
- [x] S4.T2 — Seed bloque electivo §2.6 "Electivo de Especialización" (Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum)
- [x] S4.T3 — Derivación electivo/obligatorio: `logic/helpers/deriveElectivity.js` + unit test (TC-07) + doc extensibilidad recordType (REQ-08)
- [x] S4.GATE — Gate de sync Session 4 (T2): persistir, quality review, propagación DET-16, consolidar TC-01/06/07, decidir

**Validación del tier** (T2): suite completa del mod `npx vitest run` = **909/909 PASS** (53 files), +5 sobre 904 (deriveElectivity). `deriveElectivity` 5/5 (TC-07). eslint de los 3 archivos JS + el test del seed-entry = EXIT 0. Seed `_data-requirement.js` importa OK (ESM, export `loadRequirement` verificado). **RUN del seed contra UPU (TC-01 integration, TC-06 lectura post-seed) DB-gated, diferido al dev.**

**Quality review (DET-23)** — inline-light (proporcionalidad, T2 auto): el cambio de S4 son **helpers puros** (`deriveElectivity`) + **data de seed** + **registro en seed.js**, con cobertura unit (5/5) + suite 909/909. Al agregar el loader a `seed.js`, la suite atrapó una regresión real: `seed-entry.test.ts` mockea cada loader y mi `loadRequirement` corría su cuerpo real contra el mock parcial → fix (agregado al mock, igual que `loadMalla`) + nueva asserción `toHaveBeenCalledWith(prisma,'UPU')`. Dimensiones: 1 corrección **pass**, 2 lint **pass**, 4 testing **pass** (5 unit + regresión seed-entry cubierta), 6 mantenibilidad **pass** (helper puro; seed idempotente + defensivo por owner ausente), 10 error-handling **pass** (guards non-array; skip defensivo si no hay Activity/Plan). Resultado: **pass**.

**Propagación (DET-16)** — "si esto cambió, ¿dónde más debería reflejarse?": el objeto `requirement` habilita y será consumido por **MC-04** (contrato MCP — enums + FK refs + labels ya MCP-ready), **MC-05/06** (la malla lee bloques + prereqs; reusará `buildRequirementTree` y `deriveElectivity`), **MC-08** (lee prereqs), **MC-09** (validación lee `requirement owner=activity`), y **SP6** (motor de evaluación — recorrerá el árbol). Backlog **B-1** (update rt__) y **B-2** (enforcement enum-valor RT) quedan registrados para sus disparadores. No hay artefacto DKC existente que esta sesión deje obsoleto (es aditivo).

**Commit DET-27**: (curriculum-design) `ce4850e` UPONE-1346: seed árbol EST200 + bloque electivo + derivación electivo/obligatorio (workspace externo al repo deckard)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-05 | TC-01 | unit | **pass** (unit + round-trip real en uplanner_upu post reset-full) |
| REQ-03 | TC-02, TC-03 | unit | **partial — base enums enforced (PG enum); RT enums NO enforced (text)** → gap B-2 confirmado empírico |
| REQ-04 | TC-04 | unit | **pass** (label text NOT NULL + recordType PG enum en DB) |
| REQ-06 | TC-05 | unit | pass (doc convención) |
| REQ-09 | TC-06 | unit | **pass** (electivo OR/4/24 leído de uplanner_upu) |
| REQ-10 | TC-07 | unit | pass (unit) |
| REQ-08 | (doc) | — | done (requirement-object.md §REQ-08 + description del objeto) |
| REQ-07 | TC-08, TC-09 | manual | **pass** (9 layouts RT sincronizados a up1_layen_layout como RecordDetail; sin `_list`/RecordList de requirement → no en menú. Render visual en suite pendiente, no bloqueante) |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | persistir/leer árbol EST200 | REQ-05 | unit | seed EST200 | persistir y reconstruir | árbol idéntico (jerarquía + AND/OR) | **DB UPU post reset-full**: query recursiva por parentId reconstruye Group[AND·Requisitos EST200]{ MetricThreshold(≥60), RecordState(PROG101), Group[OR·Vía de ingreso]{ RecordState(MAT210), Group[AND·Cálculo+Álgebra]{ MAT110, MAT120 } } } — jerarquía exacta | unit `buildRequirementTree` 7/7 + **round-trip real en uplanner_upu** (psql recursivo) | **pass** (unit + DB real) |
| TC-02 | `RecordState` con `targetType` ≠ activity | REQ-03 | unit | objeto | crear | rechazado | **DB UPU**: `rt__RecordState__requirement.targetType` es `text` (NO enum PG) → un valor inválido NO se rechaza a nivel DB; el app-layer tampoco lo valida (L7). El enum queda declarado (consumible MCP/UI) pero NO enforced en runtime para campos RT | introspección `information_schema` (data_type=text); L7 confirmado empíricamente | **fail/gap — B-2** (no enforced; base enums sí, RT no) |
| TC-03 | `MetricThreshold` con `metric` ≠ Credits | REQ-03 | unit | objeto | crear | rechazado | **DB UPU**: `rt__MetricThreshold__requirement.metric`/`operator` son `text` (NO enum PG) → mismo gap que TC-02 | introspección `information_schema` (data_type=text); L7/B-2 confirmado | **fail/gap — B-2** |
| TC-04 | requirement sin `label` | REQ-04 | unit | objeto | crear | rechazado | **DB UPU**: `requirement.label` = `text` **NOT NULL** → create sin label rechazado por DB. (Bonus: `recordType`/`ownerType`/`effect` son enum PG NOT NULL → enforced) | introspección `information_schema` (label text not null) | **pass** (DB real) |
| TC-05 | `ownerType=activity` + `ownerId` inexistente | REQ-06 | unit | resolver | crear | validación en app lo marca (o doc convención) | `ownerId` sin FK (igual que CurricularSection/Curriculum); aceptado por diseño — la validación owner vive en capa app/evaluación (SP6). Convención documentada | `docs/reference/requirement-object.md` §REQ-06 + description de `requirement.json` | pass (doc convención — rama "(o doc convención)" de TC-05) |
| TC-06 | seed §2.6 "Electivo de Especialización" | REQ-09 | unit | seed | leer | Group OR, minToSatisfy=4, creditsRequired=24, ownerType=curriculum | **DB UPU post reset-full**: 1 fila `requirement(ownerType=curriculum, label='Electivo de Especialización')` + `rt__Group` = combinator **OR**, minToSatisfy **4**, creditsRequired **24** | psql sobre uplanner_upu | **pass** (DB real) |
| TC-07 | 2 entries con `blockId` vs 1 sin | REQ-10 | unit | 3 entries | derivar | 2 electivas / 1 obligatoria | `partitionByElectivity([blkA,blkA,null])` → elective=[e1,e2], mandatory=[e3]; `electivesByCategory` agrupa por categoryId | `tests/unit/deriveElectivity.test.js` 5/5 PASS (suite 909/909) | pass (unit) |
| TC-08 | RecordDetail de `rt__RecordState__requirement` | REQ-07 | manual | layouts | abrir | usa layout del RT (no el base) | **DB UPU post reset-full**: los 9 layouts RT sincronizaron a `up1_layen_layout` como `RecordDetail` (incl. `default_rt__RecordState__requirement_view`) → `resolveDefaultLayout` los resuelve por convención | psql `up1_layen_layout WHERE name ILIKE '%requirement%'`. Render visual en suite pendiente | **pass** (layouts en DB como RecordDetail; render visual pendiente) |
| TC-09 | `requirement` NO aparece en el menú de objetos tras sync | REQ-07 | manual | sync aplicado | abrir menú de objetos | `requirement` ausente del menú (sin `_list` con showInNav); se edita embebido bajo su owner | **DB UPU post reset-full**: en `up1_layen_layout` los únicos `%requirement%` son los 9 RT (todos `RecordDetail`); **NO existe `default_requirement_list` ni ningún RecordList de `requirement`** → no entra al menú de objetos | psql `up1_layen_layout` | **pass** (sin _list/RecordList en DB; verificación visual del menú pendiente) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod completo | `npx vitest run` (mod curriculum-design) | 878 | **909** | +31 (buildRequirementTree 7, deriveElectivity 5, recordtypes-declared +0/edit, layouts-declared +19, seed-entry +0/edit). 0 regresión — `CurricularSection` y sus RT intactos |

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| `7958e59` | 2026-06-26 | UPONE-1346: add requirement Composite object + 3 RecordTypes | S1.T1, S1.T2, S1.T3 | REQ-01, REQ-02, REQ-03, REQ-04, REQ-06 |
| `e72682f` | 2026-06-26 | UPONE-1346: reconstruccion del arbol de requisitos (helper puro) + doc | S2.T1, S2.T2 | REQ-05, REQ-06, REQ-08 |
| `f277b84` | 2026-06-26 | UPONE-1346: layouts por RecordType + i18n es_CL de requirement | S3.T1, S3.T2, S3.T3 | REQ-07, REQ-03 |
| `ce4850e` | 2026-06-26 | UPONE-1346: seed árbol EST200 + bloque electivo + derivación electivo/obligatorio | S4.T1, S4.T2, S4.T3 | REQ-05, REQ-09, REQ-10, REQ-08 |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B-1 | Soportar UPDATE de `rt__*__requirement` | REQ-05 (extension) | SPEC BL-1 | `logic/polymorphicUpdate.resolver.js` con `RT_PATTERN = /^rt__([a-zA-Z0-9_]+)__(curricularsection)$/` | Extender el pattern a `(curricularsection\|requirement)` + correr regression de CurricularSection (tests/unit/polymorphicUpdate). Disparador: cuando MC-05/06 necesite editar requirements por UI | should |
| B-2 | Enforcement de VALORES de enum para campos RT-propios (gap de plataforma, L7) | REQ-03 | descubierto en S1 (dual-judge) | `object-manager` `jsonFieldValidator.resolver.js` `validateBaseFieldFormats` filtra `isBaseField:true` (excluye RT); RT enum fields emiten `String` plano (no enum Prisma) | Verificar empíricamente en el sync si el create rechaza `targetType="course"`/`metric="GPA"`. Si no: decidir hook de validación (helper en sectionValidation despachando por objectType, sin override nuevo — CONSTRAINT H7) o documentar como límite hasta SP6. Afecta TODOS los RT del mod, no solo requirement | should |

## Summary

**Estado: CLOSED (2026-06-26).** Implementación completa (4/4 sessions, 15/15 tasks), verificada empíricamente en `uplanner_upu` tras reset-full + seed corrido por el dev. REQ-03 parcial (B-2 a backlog, aceptado por el dev). SP executed: **4** (heurística; published 7 era piso).

El objeto `requirement` (árbol de reglas Composite + 3 RecordTypes + layouts/lang/seed/derivación) quedó en la base de UPU con su forma correcta. El valor de este caso fue tanto el objeto como los **4 defectos reales atrapados** por las 3 capas de review (dual-judge, suite, verificación DB-gated con el dev).

### Lo entregado + verificado en UPU

| Session | Entregable | Verificación |
|---------|-----------|--------------|
| S1 | `objects/requirement.json` + 3 RecordTypes, enums cerrados, `required[]` por RT | `recordtypes-declared` 30/30; **dual-judge atrapó CRITICAL** (codegen RT honra `required[]` no `not_null`) → fix verificado en DB (7 columnas NOT NULL) |
| S2 | `buildRequirementTree.js` + `docs/reference/requirement-object.md` | 7/7 (TC-01); árbol EST200 reconstruye en DB real (jerarquía exacta) |
| S3 | 9 layouts RecordDetail (sin `_list`) + 4 lang | `layouts-declared` 85/85; **reviewer atrapó `effect` faltante** → fix; 9 layouts en `up1_layen_layout`, sin `_list` → no en menú |
| S4 | seed EST200 + bloque electivo + `deriveElectivity.js` | 5/5 (TC-07); bloque electivo OR/4/24 en DB; suite **909/909** |

**Verificación empírica DB-gated** (post reset-full del dev): árbol EST200 reconstruye con jerarquía exacta (TC-01 ✓), bloque electivo OR/minToSatisfy=4/creditsRequired=24 (TC-06 ✓), `label`/`recordType` enforced — `label` text NOT NULL + base enums = enum PG (TC-04 ✓), 9 layouts RT sincronizados como RecordDetail sin `_list` (TC-08/09 ✓). **TC-02/TC-03 (rechazo de enum-valor RT inválido): gap confirmado** — las columnas RT son `text` (no enum PG) → no enforced → backlog **B-2**.

Commits (repo mod `curriculum-design`, rama `UPONE-1267-sp5`, modo limpio): `7958e59`, `e72682f`, `f277b84`, `ce4850e`, `0614c55` (fix idempotencia seed). Records DKC en deckard (rama `up1-sp5`).

### Defectos atrapados (el valor del caso)

1. **L6** — codegen de RT ignora `not_null` → columnas nullable. Dual-judge S1. Fix: `required[]`.
2. **L8** — `effect` (base requerido) faltaba en layouts → no editable. Reviewer aislado S3. Fix: select required.
3. **L9** — seed no idempotente (owner no determinista) → árbol EST200 duplicado al re-correr. Verify DB-gated. Fix: guard global por label + `orderBy`.
4. **Bug hermano (UPONE-1345)** — colores del seed de MC-02 sin `-500` no matcheaban el picker → líneas sin color. Fix `1afdd50` (commit aparte, ref UPONE-1345). Iconos verificados OK.

### Pendiente (NO bloquea el cierre)

- **`push`** de los commits del mod (`UPONE-1267-sp5`) — requiere tu OK (acción siempre-pregunta en super).
- **Backlog B-1** (update rt__: extender `RT_PATTERN` de polymorphicUpdate + regression) — `should`, disparador MC-05/06.
- **Backlog B-2** (enforcement de enum-valor para campos RT — gap de plataforma, afecta todos los RT del mod) — `should`, para MC-04/plataforma.
- Verificación VISUAL en la suite (render de un RecordDetail de RT + el menú) — a nivel dato ya verificado; el render visual queda a criterio del dev.

### Fuera de alcance (por diseño SP5)

Motor de evaluación (degree-audit) → SP6. Update de rt__ → B-1. RecordTypes futuros (recordType extensible, REQ-08) → documentados, no implementados.
