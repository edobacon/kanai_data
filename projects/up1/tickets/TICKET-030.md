---
id: TICKET-030
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1100
module: curriculum-design
autopilot: manual
---

# Fix casing inconsistente en la cadena de auditoria (changeLog + workflowTransitionHistory + flow + filters tabs Historial) post-TICKET-028

## Request

**Peticion del dev** (sin Jira external): el tab "Historial" del Activity (y de CurricularSection + CurricularLink) NO muestra los cambios, mientras que la vista global del changelog (`default_changeLog_list`) SI los muestra. Diagnostico empirico identifica que el rename `activity → Activity` aplicado por [TICKET-028](ticket-028.md) migro a PascalCase los events del mod + el enum `CurricularSection.ownerType` + los layouts, pero **omitio la cadena de auditoria completa**: regex del flow n8n + `ENTITY_TYPE_MAP` del resolver + filters de los 9 tabs Historial + creacion de `workflowTransitionHistory` en `activity.resolver.js:207` + seeds. El parche `2e47a62` (UPONE-1100 followup, 2026-05-22) solo arreglo el lookup interno del padre activity en el resolver (`prisma.Activity` undefined → normalizar a `prisma.activity` lowercase para el accessor), pero NO los 3 bugs de la cadena de auditoria del usuario.

### Sintoma observado

| Vista | Que muestra | Por que |
|-------|-------------|---------|
| `default_changeLog_list` (changelog global, sin filtros) | ✅ Todos los cambios consolidados (CurricularSection + transitions) | No filtra por `entityType` |
| Tab "Historial" del Activity (`default_Activity_view` schema `historyList`) | ❌ Vacio | Filtra `entityType="activity"` lowercase pero registros se guardan con `"Activity"` PascalCase (consolidacion L40 del resolver auditCapture copia del enum `CurricularSection.ownerType` que es PascalCase post-TICKET-028) |
| Tab "Historial" del CurricularLink + 7 RTs CurricularSection | ❌ Vacio (mismo patron, lowercase/camelCase filter vs PascalCase guardado) | Idem |

### Causa raiz multi-capa

3 piezas no migraron a PascalCase tras TICKET-028:

1. **Flow n8n** [`audit-capture.json:29`](../../../uplanner/up1/mods/curriculum-design/flows/audit-capture.json): regex `^(activity|CurricularSection|CurricularLink|rt__[a-zA-Z0-9_]+__(activity|curricularsection|curricularlink))$` espera `activity` lowercase. Events post-TICKET-028 publican `objectType: "Activity"` (PascalCase). **El flow descarta el event** → **cambios DIRECTOS al Activity (name/code/description) no se auditan en absoluto** (bug silencioso).
2. **`ENTITY_TYPE_MAP`** [`auditCapture.resolver.js:90-94`](../../../uplanner/up1/mods/curriculum-design/logic/auditCapture.resolver.js#L90): mapping `{ activity: 'activity', CurricularSection: 'curricularSection', CurricularLink: 'curricularLink' }`. Lookup directo de `"Activity"` PascalCase retorna `undefined` → `normalizeEntityType` retorna null → resolver retorna error `AUDIT_INVALID_OBJECT_TYPE` (pero solo si el flow no lo descarto antes).
3. **9 filters de layouts** del tab Historial: `default_Activity_view.json:354` (`"activity"`), `default_curricularLink_view.json:89` (`"curricularLink"`), 7x `default_rt__*__curricularsection_view.json` (`"curricularSection"`). Todos lowercase/camelCase, no matchean `"Activity"`/`"CurricularSection"`/`"CurricularLink"` PascalCase que la consolidacion L40 efectivamente guarda en BD.

Adicional: `activity.resolver.js:207` crea `workflowTransitionHistory` con `entityType: 'activity'` lowercase (StateTransitions del Activity). El resolver auditCapture branch transition copia `wth.entityType` a `changeLog.entityType` → registros de transition se guardan con casing distinto al de los updates consolidados. **Mezcla en BD**: updates consolidados PascalCase + transitions lowercase + legacy pre-TICKET-028 lowercase.

### Asociacion al parent ticket

Este ticket es **followup de [TICKET-028](ticket-028.md)** (deploy block hotfix PascalCase) — completa la migracion que TICKET-028 dejo a medias en la cadena de auditoria. Aplica [RULE-platform-006](../rules/platform/rule-platform-006.md) consistentemente a las 3 capas restantes.

### Asociacion al ticket Jira UPONE-1100

`external: UPONE-1100` (HU4 — "Curriculum Design | Programa de asignatura | Renombrar academicActivity → activity y conectar a workflow", asignee Eduardo Bacon, reporter Esteban Cortes, status "Revision de companeros"). Este fix es el cierre coherente de la HU4 en la cadena de auditoria.

**Gap con AC5 literal del Jira** (a registrar en comentario Jira post-fix, observacion de Clemente Jara via dev):

UPONE-1100 declara literalmente:
> "AC5 — `changeLog` registra `entityType="activity"` correctamente. `workflowTransitionHistory` registra transiciones con `entityType="activity"`."

Y en Parte 1:
> "Convencion: `activity` (lowercase), coherente con `academicPeriod`, `course`, `affiliation`."

Sin embargo, TICKET-028 (deploy block hotfix posterior, originado en `hotfix/casing` de Clemente Jara) migro el casing a `Activity` PascalCase por bloqueo de deploy en ambientes case-sensitive y formalizo RULE-platform-006 como convencion canonica del platform up1. La RULE invalida implicitamente el casing literal del AC5 — el AC se cumple **semanticamente** (changeLog + wth registran el entityType del Activity coherentemente), solo cambia el casing a PascalCase.

**Decision B1 (PascalCase canonico) confirmada por dev** (2026-05-22). El AC5 del Jira se actualizara via comentario Jira en una iteracion posterior por dev (no parte del scope de execute de este ticket — Clemente Jara ya hizo la observacion, registro pendiente).

## Scope

### Dentro del scope:

**Backend del resolver + flow (Session 1)**:

- `mods/curriculum-design/flows/audit-capture.json` — regex `auditableRe`: grupo 1 `activity` → `Activity` (preservar grupo 2 lowercase del `rt__X__base` — los rt__ usan base lowercase por convencion del filename)
- `mods/curriculum-design/logic/auditCapture.resolver.js`:
  - `ENTITY_TYPE_MAP` (linea 90-94): keys + values a PascalCase canonico
  - Verificar `BASE_LOWERCASE_MAP` derivado funciona (deriva via `Object.entries(MAP).map(...)`)
  - Verificar `AUDITABLE_TYPES` whitelist derivada
  - Doc comments del header (lineas 78-89, 95-101) + L40 (linea 336) + L43 (linea 355): references a valores PascalCase
- `mods/curriculum-design/logic/activity.resolver.js:207` — `workflowTransitionHistory.create({ entityType: 'activity' })` → `'Activity'`
- `mods/curriculum-design/logic/activity.schema.graphql:73` — comment en doc del resolver actualizar a `'Activity'`
- `mods/curriculum-design/objects/changeLog.json` — description del field `entityType` actualizar a valores PascalCase canonicos
- `mods/curriculum-design/objects/workflowTransitionHistory.json` — description del field `entityType` actualizar (manteniendo polimorfismo abierto pero indicando que valores canonicos del mod son PascalCase)
- `mods/curriculum-design/tests/unit/auditCapture.test.js` — assertions PascalCase (linea 230+: `normalizeEntityType('Activity').toBe('Activity')`, etc.)

**Layouts del tab Historial (Session 2)**:

- `mods/curriculum-design/config/layouts/default_Activity_view.json:354` — filter `entityType` value: `"activity"` → `"Activity"`
- `mods/curriculum-design/config/layouts/default_curricularLink_view.json:89` — `"curricularLink"` → `"CurricularLink"`
- 7x `mods/curriculum-design/config/layouts/default_rt__{Bibliography,Content,CustomSection,EvaluationComponent,LearningOutcome,Modality,Session}__curricularsection_view.json` — `"curricularSection"` → `"CurricularSection"` (en cada filter del tab Historial)

**Seeds (Session 2)**:

- `mods/curriculum-design/seed/_data-workflow-objects.js:99-100` — entries con `entityType: 'activity'` → `'Activity'`. Las entries con `'curriculumPlan'` y `'changeRequest'` (lowercase) NO se tocan — son polimorficos abiertos para otros mods futuros (no son objects de este mod).

**Data migration + sync + smoke (Session 3)**:

- SQL idempotente `scripts/migrations/TICKET-030-audit-chain-entityType-pascalcase.sql` — UPDATE sobre `"changeLog"` y `"workflowTransitionHistory"` con pattern de [TICKET-028 SQL](../../../uplanner/up1/mods/curriculum-design/scripts/migrations/TICKET-028-rename-activity-layouts-pascalcase.sql) (BEGIN/COMMIT + snapshot pre/post + COUNT FILTER)
- `npm run sync` para propagar al core post-fix
- Smoke UI manual del tab Historial post-rebuild de BD (verificar que aparecen los cambios consolidados)

### Fuera del scope:

- **Otros objects auditables polimorficos abiertos** (`curriculumPlan`, `changeRequest`, `booking`, `competencyNode`) que viven solo en la description de `workflowTransitionHistory.json` y entries demo del seed: no son objects del mod `curriculum-design`. Quedan lowercase per su convencion futura.
- **`workflowTransitionHistory.comment` field**: no related (preservado per TICKET-029 REQ-PRESERVE-02).
- **Migracion productiva UPU**: solo BD local (docker pg) en este ticket. Si UPU production tiene data legacy, agendar B-followup cuando se planifique deploy del fix.
- **Renombrar el modelo Prisma `changeLog`** a `ChangeLog` PascalCase: el JSON title del object es `"changeLog"` (lowercase) por design del HU2. RULE-platform-006 aplica al casing del JSON title — no se fuerza la mayuscula (consistente con discovery L2 de TICKET-029).
- **Otros mods del repo up1** (flow-viewer, retention-wellbeing): si tienen entries similares lowercase, ticket separado de auditoria cross-mod.

## Classification

| Campo | Valor |
|-------|-------|
| **Tipo de trabajo** | fix |
| **Modulo** | curriculum-design (mod) |
| **Capa principal** | data model (entityType polimorfico) + api (flow n8n + resolver) + frontend (layouts) + BD (data migration) |
| **Complejidad** | media — multi-capa pero cambios deterministicos (rename literal value en strings) |
| **Story Points (estimado)** | 3 |
| **Sprint** | (none aun — definir cuando entre al pipeline) |
| **Tracker Jira** | (none — followup local de TICKET-028) |
| **Parent ticket** | TICKET-028 (deploy block PascalCase — donde se omitio la cadena de auditoria) |

## Creation scope

- **Quien lo pide**: dev (reporte de bug del tab Historial vacio). Aplica memoria global `feedback_follow_up_local_no_jira.md` — followup local, sin Jira nuevo.
- **Aplica RULE-platform-006** (TICKET-028) consistentemente: extiende su alcance a la cadena de auditoria (3 piezas que originalmente quedaron fuera del scope).
- **Memoria global**: `feedback_persist_sessions_at_gate_close.md` — persistir Session blocks por gate durante execute.

## Setup

- **Branch propuesta**: `fix/audit-chain-entityType-pascalcase` (nueva, desde develop del mod post-merge TICKET-029 + commit `2e47a62`)
- **Working dir**: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design`
- **Codegen target**: `/Users/edobacon/Workspace/uplanner/up1` (npm run codegen + sync post-cambios per RULE-platform-006 Operational notes)
- **BD UPU local**: docker pg — SQL idempotente UPDATE entityType
- **Verificacion empirica del fix**: tab Historial del Activity TIR101 (o seed equivalente) debe mostrar las consolidaciones de Modalidad/Sesion/etc. + transitions despues del fix

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | TICKET-028 omitio 3 piezas de la cadena de auditoria al migrar a PascalCase: flow regex, ENTITY_TYPE_MAP, filters tab Historial | **✓ confirmed** | git show 3cf68ef^:events/activity-update.json → trigger.objectType: "activity" pre-rename. git show 3cf68ef:events/Activity-update.json → "Activity" post-rename. Pero [flows/audit-capture.json:29](../../../uplanner/up1/mods/curriculum-design/flows/audit-capture.json#L29) sigue `^(activity\|...)` lowercase. [auditCapture.resolver.js:90-94](../../../uplanner/up1/mods/curriculum-design/logic/auditCapture.resolver.js#L90) sigue `{ activity: 'activity', ... }`. Filters de los 9 layouts siguen lowercase/camelCase. Verificado 2026-05-22. |
| H2 | El enum `CurricularSection.ownerType` ya es PascalCase post-TICKET-028 S3 (commit 7c256c2) → la consolidacion L40 del resolver guarda `changeLog.entityType="Activity"` PascalCase pero el filter del tab busca lowercase → mismatch | **✓ confirmed** | git show 7c256c2 — diff de `objects/CurricularSection.json` linea 21: `["activity", "Offering"]` → `["Activity", "Offering"]`. [auditCapture.resolver.js:367](../../../uplanner/up1/mods/curriculum-design/logic/auditCapture.resolver.js#L367) `resolvedEntityType = input.data.ownerType` (copia del enum tal cual). |
| H3 | El commit `2e47a62` (UPONE-1100 followup, 2026-05-22) solo parcho el lookup interno `prisma[resolvedEntityType]` (problema runtime distinto) — NO arreglo los bugs de la cadena de auditoria | **✓ confirmed** | git show 2e47a62 — diff de [auditCapture.resolver.js:367-376](../../../uplanner/up1/mods/curriculum-design/logic/auditCapture.resolver.js#L367) introduce `prismaModelKey = resolvedEntityType.charAt(0).toLowerCase() + resolvedEntityType.slice(1)` para el accessor `prisma.activity` lowercase. NO toca regex flow + ENTITY_TYPE_MAP + filters layouts + activity.resolver:207. Verificado grep post-2e47a62. |
| H4 | El bug colateral "cambios DIRECTOS al Activity no se auditan" es silencioso (flow descarta sin error) y el dev no lo noto porque tipicamente edita modalidades/sesiones (CurricularSection) que SI llegan al resolver | **✓ confirmed (logica)** | Flow filtra con regex; items no-match son descartados sin emitir error visible. CurricularSection sigue matcheando (PascalCase en regex). El usuario reporto solo el sintoma del tab Historial vacio para consolidaciones. Tests integration de auditCapture cubren via `objectType: 'CurricularSection'` PascalCase, no cubren empirico el evento del Activity directo post-rename. |
| H5 | `workflowTransitionHistory.entityType` se guarda lowercase (`'activity'`) en `activity.resolver.js:207` → el resolver auditCapture branch transition copia ese valor a `changeLog.entityType` → transitions aparecen con casing distinto a updates consolidados | **✓ confirmed** | grep `entityType:` en [activity.resolver.js:207](../../../uplanner/up1/mods/curriculum-design/logic/activity.resolver.js#L207) → `entityType: 'activity'` lowercase. [auditCapture.resolver.js:447-491](../../../uplanner/up1/mods/curriculum-design/logic/auditCapture.resolver.js#L447): `wthEntityType = wth.entityType` → `entityType: wthEntityType` en `prisma.changeLog.create`. Sin normalizacion intermedia. |
| H6 | La BD UPU local tiene state mixto: updates consolidados con `"Activity"` PascalCase (post-7c256c2) + transitions con `"activity"` lowercase + legacy pre-TICKET-028 lowercase | **inferred** | Confirmar via `SELECT entityType, COUNT(*) FROM "changeLog" GROUP BY entityType` antes de la migration. TICKET-029 S1.T1 reporto BD changeLog vacia (total=0) post-codegen TICKET-020, pero hubo activity entre 2026-05-20 y 2026-05-22 — re-validar. |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B1 | Smoke E2E del tab Historial del Activity + CurricularLink + 7 RTs CurricularSection post-deploy a UPU production | REQ-PRESERVE-03 | SPEC-012 | data validada local + tests pass; falta verificacion empirica visual end-to-end | abrir UPU sandbox autenticado, capturar 9 screenshots (1 por tab Historial) en `tickets/TICKET-030.screenshots/`. Validar que cada tab muestra los cambios esperados | could |
| B2 | Auditoria cross-mod de otros mods (flow-viewer, retention-wellbeing) buscando casing lowercase residual en cadenas de auditoria similares | — | — | discovery local que TICKET-028 RULE-platform-006 no cubrio cadenas de auditoria | grep recursive `entityType:` en mods/{flow-viewer,retention-wellbeing}/ buscando lowercase values | should |
| B3 | Extender RULE-platform-006 con seccion "Cadena de auditoria" documentando los 3 puntos canonicos (flow regex + entityType MAP del resolver + filters de UI) que deben migrar juntos cuando se renombra un object base auditable | — | — | gap detectado por este ticket: la rule actual no menciona la cadena de auditoria como punto de inspeccion al renombrar | editar `projects/up1/rules/platform/rule-platform-006.md` agregando seccion + ejemplo positivo/negativo | should |
| B4 | Reproceso retroactivo de las 2 transitions del Activity en wth que no llegaron a changeLog (bug silencioso H4 pre-fix) | — | — | descubierto en S1.T1: wth tiene 2 rows con `entityType='activity'` pero 0 rows en changeLog (flow descarto los events post-TICKET-028). Post-fix de S1.T3 futuras transitions se auditan correctamente; las 2 ya ocurridas requieren reproceso manual | opcional: invocar `recordAuditEvent` con los 2 wth.id existentes via mutation directa o re-emitir los Pub/Sub events. Sin impacto operativo (transitions ya commiteadas en wth) — solo trazabilidad del audit log. **Resuelto en parte post-reset BD UPU S3**: las wth nuevas seedeadas son `Activity: 2`, las 2 lowercase legacy fueron dropeadas por el reset. | could (resuelto pasivo en S3) |
| B5 | Gap de refresh del tab Historial post-edit — Apollo cache-first + asincronia audit-capture | — | — | descubierto por dev en smoke UI S3.T3. Diagnostico en 2 capas: (1) **asincronia del audit-capture** — flow n8n consume el evento async, escribe changeLog 1-5s post-mutation. (2) **Apollo `cache-first`** en `layout/src/composables/useDataFetching.ts:143` — no refetch on tab-activation ni polling. El cache de Apollo es el factor menor; el factor principal es la asincronia | opciones: X3 refetch on tab-activation con delay 2-3s (recomendado), X4 polling pollInterval:3000 mientras tab visible, X5 GraphQL subscription a changeLog (real-time pero mayor scope). Out of scope TICKET-030 — crear ticket nuevo (improvement) o resolver en sprint de UX | could |
| B6 | Drift preexistente de `Modality` fields en mod vs OM source of truth (7 errores en sync drift check) | — | — | descubierto en sync de S3.T1: `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json` tiene fields (`code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode`) que NO existen en `object-manager/objects/business/Base/`. NO related a TICKET-030 (drift de TRUE APPEND-ONLY sync) | sync mod objects → object-manager/objects/ con regeneracion del archivo Base (mismo workaround del L1 de TICKET-029). Ticket nuevo de housekeeping cross-mod | should |
| B7 | Drift preexistente de migrations UPU vs schema actual (enum `CurricularSectionOwnerType` lowercase en migration 20260519153148, PascalCase en schema actual) | — | — | descubierto en S3.T1 — bloqueador 2: TICKET-028 S3 cambio enum del JSON sin regenerar migrations historicas → cada `setup:reset` falla en UPU por migration legacy. Workaround canonico: B2 (db push). | regenerar migrations base de UPU post-rename de objects auditables (mismo problema futuro en otros tenants con migrations historicas). Ticket nuevo de housekeeping del platform | should |

## Sessions

### Plan de sessions (preplanificacion)

> **3 execute sessions** estimadas para 3 SP. Session 0 = intake-explore + teach-intake (skip-tactico) + design-fix (ya ejecutado en conversacion previa con dev).
> Plan empieza en S1 post-Session 0. DET-20 numeracion continua.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Backend canonico PascalCase: flow regex + ENTITY_TYPE_MAP + activity.resolver wth + descripcions objects + tests unit | execute | T2 | S1.T1-T6 + S1.GATE | auto | grep `\|activity\|` en flow regex retorna 0 lowercase match (solo en grupo rt__) + grep `^\s+activity:` en ENTITY_TYPE_MAP retorna 0 + grep `entityType: 'activity'` en activity.resolver retorna 0 + `npm test tests/unit/auditCapture.test.js` 51/51 pass (post-update assertions) + sin regresion en otros tests |
| S2 | Layouts (9 filters tabs Historial) + seed entries Activity | execute | T1 | S2.T1-T3 + S2.GATE | auto | grep `"value": "activity"` en config/layouts retorna 0 + grep `"value": "curricularSection"` retorna 0 + grep `"value": "curricularLink"` retorna 0 + grep `entityType: 'activity'` en seed retorna 0 (solo lineas modificadas) + JSON valido en los 9 layouts + 597/597 tests del mod pass |
| S3 | SQL migration idempotente (changeLog + workflowTransitionHistory) + sync + smoke UI tab Historial | execute | T3 | S3.T1-T5 + S3.GATE | ⚑ fuerte | SQL idempotente run en docker pg → entityType lowercase counts pre = X, post = 0 + `npm run sync` exit 0 + smoke UI: tab Historial del Activity muestra cambios consolidados (al menos 1 fila) + verificacion end-to-end 6/6 puntos (flow regex / ENTITY_TYPE_MAP / activity.resolver wth / layouts filters / seed / BD entityType counts) |

### Session 0 — 2026-05-22 — Intake-explore + teach-intake skip + design-fix [phase: intake]

**Tipo**: auto
**Validation tier**: T0 (doc-only)

**Objetivo**: validar las 6 hipotesis del Triage con evidencia empirica (codebase post-TICKET-028 + post-`2e47a62`), tomar decision teach-intake (skip-tactico), preplanificar 3 sessions con tasks especificas y gates por session.

**Tasks completadas**:

- [x] intake-explore — H1+H2+H3+H4+H5 confirmados empirico via Read + grep + git show de los archivos clave (flows/audit-capture.json regex, auditCapture.resolver.js ENTITY_TYPE_MAP + L40 + branch transition, objects/CurricularSection.json enum ownerType, activity.resolver.js:207, 9 layouts filters). H6 inferred (pendiente SELECT en BD UPU local — primera task de S1). Discovery clave: commit `2e47a62` solo parcho el lookup runtime, no la cadena de auditoria. → conversacion 2026-05-22 con dev
- [x] teach-intake — decision **skip-tactico** registrada inline (DET-21 post-F5). Razon: hotfix follow-up de TICKET-028 con diagnostico empirico completo en conversacion. Material reusable para futuros bugs de cadena de auditoria se promueve via B3 (extension de RULE-platform-006 con seccion "Cadena de auditoria") en S3. Decisions log: `intake-skip-tactico` → conversacion
- [x] design-fix — SPEC-012-fix-casing-audit-chain-pascalcase generado inline (sin archivo separado, mismo patron de TICKET-028/029): Executive summary + 7 REQs (FIX-01..05 + PRESERVE-01..02) + 3 DEC-LOCAL (sub-decision A1 confirmada vs A2/A3 evaluados, alcance no cubre `curriculumPlan/changeRequest/booking` polimorficos abiertos, no se fuerza `ChangeLog` PascalCase del modelo Prisma) + tabla 14 SpecTasks en 3 sessions + Constraints/Dependencies/Risks/Acceptance → conversacion 2026-05-22

**Validacion del tier**:

- T0 — diagnostico convergido + plan de sessions preplanificado en `## Sessions > Plan de sessions` (DET-20) + hipotesis con anclajes empiricos a archivos:lineas (DET-1 + DET-5) + backlog explicito con 3 items + scope cerrado (dentro/fuera) + 6 sub-decisions cerradas (A1 vs A2/A3, alcance polimorficos abiertos fuera, etc.)

**Discoveries / Learns nuevos**:

- **L1**: el commit `2e47a62` "UPONE-1100 followup" del 2026-05-22 11:09 toca la cadena de auditoria pero solo para parchar el lookup interno del padre activity (prisma accessor camelCase). NO arregla regex flow, ENTITY_TYPE_MAP, filters de UI ni activity.resolver:207. Caso de "fix parcial" que dejo el bug user-facing intacto. Material para B3 (extension de RULE-platform-006).
- **L2**: el enum `CurricularSection.ownerType` (`["Activity", "Offering"]` post-TICKET-028 S3) es la **fuente upstream** de la consolidacion L40 — el resolver copia el valor tal cual del payload sin normalizar. Si el enum cambia casing, todos los rows nuevos del changeLog para consolidaciones quedan en ese casing. Documentar en B3 como punto de inspeccion canonico.
- **L3**: TICKET-028 + `2e47a62` colectivamente migraron el casing del Activity en ~5 capas (objects + layouts + events + GraphQL schemas + resolver lookup) pero dejaron 3 capas mas (flow + ENTITY_TYPE_MAP + filters UI + wth creation). Patron observable: las migraciones de casing tienden a parchar capas visibles (Prisma errors, GraphQL errors) pero las capas semánticas (entityType polimorfico string libre, regex de filtros) son silenciosas porque no rompen runtime — solo dejan datos huerfanos. Refuerza B3.
- **L4**: el branch `origin/hotfix/casing` de Clemente Jara (4 commits ahead de develop, fork desde `938eda1`) tiene EL MISMO scope que TICKET-028 (que rebaseo su intent sobre develop actual): objects titles + 4 layouts Activity rename + 4 GraphQL schemas + events transition + docs/tests llm-e2e + i18n keys. NO toca `flows/audit-capture.json`, `logic/auditCapture.resolver.js` (ENTITY_TYPE_MAP), `logic/activity.resolver.js:207` (wth), filters `entityType` en 9 layouts del tab Historial, ni `seed/_data-workflow-objects.js`. Verificado 2026-05-22 via `git show {b1a2551,bff793e,d8a45ad,771804e} --stat`. **Conclusion**: no hay cherry-pick util — TICKET-030 es trabajo nuevo independiente.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (auto, T0 doc-only)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Session 0 no toca codigo (intake + design) |
| 2 | Lint | n/a | Sin codigo modificado |
| 3 | Tipado | n/a | Idem |
| 4 | Testing | n/a | Sin tests escritos en S0 |
| 5 | Escalabilidad | n/a | Sin runtime |
| 6 | Mantenibilidad | pass | Estructura ticket canonica (Plan de sessions inside Sessions per DET-20). Backlog con 3 items concretos con prioridad explicita |
| 7 | Claridad | pass | Triage convergido con anclajes empiricos a archivos:lineas. Sub-decisions A1/A2/A3 evaluadas en conversacion con pros/contras tabulares antes de elegir A1 |
| 8 | Accesibilidad | n/a | Sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin runtime |

**Gate decision:** (approvedBy: dev — "vamos con 030")

- [x] continue → Session 1 (S1: Backend canonico PascalCase)
- [ ] iterate → re-trabajar Session 0
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 1**:

- TICKET-029 cerrado (✓ — 2026-05-22 closed)
- commit `2e47a62` mergeado a develop del mod (✓)
- Branch `fix/audit-chain-entityType-pascalcase` por crearse desde develop del mod (S1.T1)
- BD UPU local con docker pg arriba para validacion H6 (S1.T2 SELECT counts pre-migration)

**Tiempo invertido**: ~1.5h efectivos (incluye analisis de impacto colateral cross-archivo + 6 hipotesis confirmadas + 3 sub-decisions evaluadas)
**Contexto retomable**: spec inline listo en este ticket + plan de sessions preplanificado + backlog explicito + decisiones cerradas

---

### Session 1 — 2026-05-22 — Backend canonico PascalCase [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (cambio multi-archivo: flow regex + ENTITY_TYPE_MAP + wth creation + descripcions + tests unit)

**Objetivo**: aplicar PascalCase canonico end-to-end al backend de la cadena de auditoria — flow regex + ENTITY_TYPE_MAP + activity.resolver:207 wth + comments en objects/auditCapture/activity.schema.graphql + tests unit. Sin tocar layouts (S2) ni SQL migration (S3).

**Tasks completadas**:

- [x] S1.T1 — Crear branch `UPONE-1100-fix-audit-chain-entityType-pascalcase` desde develop del mod (HEAD `2e47a62`) + SELECT counts pre-migration en BD UPU local (docker pg) para validar H6
- [x] S1.T2 — Update `ENTITY_TYPE_MAP` (linea 90-94) + AUDITABLE_TYPES whitelist + BASE_LOWERCASE_MAP derivados + comments header (lineas 78-89) en `auditCapture.resolver.js`
- [x] S1.T3 — Update regex `auditableRe` grupo 1 (linea 29) en `flows/audit-capture.json` (preservar grupo 2 lowercase del `rt__X__base`) + update notes del nodo
- [x] S1.T4 — Update `activity.resolver.js:207` wth `entityType: 'activity'` → `'Activity'` PascalCase
- [x] S1.T5 — Update descripcions: `changeLog.json` (field entityType + metadata description + entityName + entityCode), `workflowTransitionHistory.json` (field entityType), `activity.schema.graphql:73` (doc comment), `auditCapture.resolver.js` comments L40 + **check L40 `=== 'CurricularSection'` PascalCase** (consumer del MAP cambiado — habria roto consolidacion si no se corregia)
- [x] S1.T6 — Update unit tests: `tests/unit/auditCapture.test.js:230+` (assertions PascalCase para normalizeEntityType). 51/51 pass post-update
- [x] S1.GATE — Quality review DET-23 standard (T2) + `npm test` full suite 597/597 pass + grep contracts verde (0 lowercase residual en archivos modificados)

**Log**:

| Timestamp | Task | Discovery |
|-----------|------|-----------|
| 2026-05-22 | S1.T1 | Branch `UPONE-1100-fix-audit-chain-entityType-pascalcase` creado desde develop del mod (HEAD `2e47a62` "UPONE-1100 followup — alinear ownerType 'Activity' PascalCase"). DET-19 aplicado (nombre del branch usa external id Jira UPONE-1100 en vez del TICKET-030 interno de dkc). |
| 2026-05-22 | S1.T1 | **SELECT pre-migration changeLog**: `SELECT "entityType", COUNT(*) FROM "changeLog" GROUP BY "entityType"` retorna `Activity: 4`. Total 4 rows, **todos PascalCase**. No hay lowercase `activity` ni `curricularSection`/`curricularLink`. |
| 2026-05-22 | S1.T1 | **SELECT pre-migration WorkflowTransitionHistory**: retorna `activity: 2, changeRequest: 1, curriculumPlan: 2`. Total 5 rows. **Solo 2 rows requieren UPDATE** (`activity` → `Activity`). Los `changeRequest`/`curriculumPlan` se preservan (polimorficos abiertos para otros mods futuros — REQ-PRESERVE-01). |
| 2026-05-22 | S1.T1 | **H6 confirmado pero distinto al esperado**: BD reseedeada post-2e47a62 / TICKET-029. changeLog estado limpio PascalCase (no requiere UPDATE en S3). wth state mixto solo en 2 rows. Migracion SQL S3 sera trivial (UPDATE 2 rows en wth). |
| 2026-05-22 | S1.T1 | **H4 confirmado empirico (bug colateral activo)**: hay 2 rows en wth con `entityType='activity'` lowercase pero **0 rows correspondientes en changeLog`. El flow regex `^(activity\|...)$` lowercase **descarta** los events `Activity-transition.json` (post-TICKET-028 publican `objectType: "Activity"` PascalCase). Las 2 transitions del Activity registradas en wth NO se auditaron en changeLog. El fix de S1.T3 (regex) habilita futuras transitions; las 2 ya ocurridas requieren reproceso retroactivo (fuera de scope — agendar como B-followup si el dev lo decide). |
| 2026-05-22 | S1.T2 | `ENTITY_TYPE_MAP` migrado a `{ Activity: 'Activity', CurricularSection: 'CurricularSection', CurricularLink: 'CurricularLink' }` (identity mapping PascalCase). Derivados `AUDITABLE_TYPES` y `BASE_LOWERCASE_MAP` actualizados automaticamente (codigo no cambia). Comment header (lineas 78-89) reescrito explicando PascalCase canonico post-TICKET-030. Ejemplo del `BASE_LOWERCASE_MAP` comment (linea 109) actualizado: `rt__Modality__curricularsection → CurricularSection`. node --check OK. |
| 2026-05-22 | S1.T3 | Flow regex `auditableRe` grupo 1 cambiado `(activity\|...)` → `(Activity\|...)` PascalCase. Grupo 2 (`rt__X__<base>`) preservado lowercase (apunta al filename del base). Comments del jsCode + notes del nodo n8n actualizados con referencia a TICKET-030 / UPONE-1100 + RULE-platform-006. python json.tool OK. |
| 2026-05-22 | S1.T4 | `activity.resolver.js:207` `entityType: 'activity'` → `'Activity'`. Comment JSDoc linea 86 tambien actualizado para consistencia. node --check OK. |
| 2026-05-22 | S1.T5 | Descripcions object JSONs actualizadas: `changeLog.json` (metadata description + field entityType description + entityName + entityCode con referencias a PascalCase + RULE-platform-006 + TICKET-030), `workflowTransitionHistory.json` (field entityType — valor canonico del mod es `Activity` PascalCase, otros polimorficos abiertos `curriculumPlan/changeRequest/booking` lowercase preservados). `activity.schema.graphql:73` doc comment del resolver `entityType:'activity'` → `'Activity'`. `auditCapture.resolver.js` comment L40 reescrito + ejemplos de `Activity` PascalCase. |
| 2026-05-22 | S1.T5 | **DISCOVERY CRITICO L5**: linea 361 del resolver tenia `entityTypeStored === 'curricularSection'` (lowercase) — chequeo de la consolidacion L40. Post-S1.T2 el MAP retorna `'CurricularSection'` PascalCase, por lo que el check NUNCA seria true. **Bug que habria roto la consolidacion al padre activity** si no se detectaba. Corregido a `=== 'CurricularSection'` PascalCase. Caso de consumer del MAP que estaba fuera del scope original del intake — agrega evidencia para B3 (extension RULE-platform-006). |
| 2026-05-22 | S1.T6 | Tests unit `auditCapture.test.js:230+` actualizados: `normalizeEntityType('Activity').toBe('Activity')` + `'CurricularSection'.toBe('CurricularSection')` + `'CurricularLink'.toBe('CurricularLink')` + rt__ polimorficos retornan PascalCase + edge case "lowercase del base puro NO matchea" preservado (assertion `'activity'.toBe(null)` agregado explicito). `npx vitest run tests/unit/auditCapture.test.js` → **51/51 pass en 8ms**. |
| 2026-05-22 | S1.GATE | **2 tests fallaron** en `tests/integration/activity-resolvers.test.ts` (L125 + L401 wth.entityType + L349 payload.objectType esperaban lowercase `'activity'`). **DISCOVERY CRITICO L6**: linea 234 del resolver `activity.resolver.js` publicaba `objectType: 'activity'` lowercase en el payload del publish event — habria sido **descartado por la regex del flow** post-S1.T3 (idem L1 de H4). Bug colateral que persistiria post-fix de las otras 3 capas si no se detectaba. Corregido a `'Activity'` + tests actualizados. Re-run `npm test` full suite → **597/597 pass en 3.37s, sin regresion**. |

**Quality review (DET-23)**:

**Reviewer**: LLM principal (auto, T2 standard)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios deterministicos: identity mapping del MAP + literal regex group 1 + 4 string literals lowercase → PascalCase. Sin magic numbers nuevos, sin `any` (JS sin TS). 7 archivos modificados, ~15 lineas semanticas. |
| 2 | Lint | n/a | Mod sin lint config dedicado al resolver. `node --check` validado como sustituto. |
| 3 | Tipado | n/a | JS sin TypeScript en los archivos modificados (resolver + flow JSON). Tests TS pasan. |
| 4 | Testing | pass | 597/597 tests del mod pass (51/51 auditCapture unit + 28 archivos test suite integration). Sin regresion. Tests integration actualizados para reflejar PascalCase (3 assertions). |
| 5 | Escalabilidad | n/a | Sin cambios de runtime path; sin loops nuevos. |
| 6 | Mantenibilidad | pass | Identity mapping PascalCase elimina la asimetria key-value que generaba confusion (`activity: 'activity'` lookup-feeling redundante). Comments documentan TICKET-030 / RULE-platform-006 como ancla. |
| 7 | Claridad | pass | Descripcions del JSON actualizadas con referencias canonicas. Comment L40 explicita "PascalCase post-TICKET-030 / UPONE-1100". |
| 8 | Accesibilidad | n/a | Sin UI. |
| 9 | Storybook | n/a | Sin componentes. |
| 10 | Error handling | pass | Sin cambios en error paths. AUDITABLE_TYPES whitelist sigue funcionando (defense-in-depth). |

**Gate decision:**

- [x] continue → Session 2 (S2: Layouts del tab Historial + seed entries Activity)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision rationale**: 6/6 tasks completadas + 2 discoveries criticos detectados/resueltos durante execute (L5 check `=== 'curricularSection'` consumer del MAP + L6 publish event `objectType: 'activity'` no en intake scope). 597/597 tests del mod pass sin regresion. Sin cambios en API publica del resolver — contracts preservados (request/response shape igual). REQ-FIX-01/02/03 + REQ-PRESERVE-02 (parcial — solo tests del mod, S2 cubrira REQ-FIX-04/05 + smoke S3 cubrira REQ-PRESERVE-03). Avanza a S2.

**Tiempo invertido**: ~1h efectivo (incluye 2 discoveries que ahorraron iteraciones futuras)
**Contexto retomable**: branch `UPONE-1100-fix-audit-chain-entityType-pascalcase` con S1 commit `4e17718` (8 files changed, 54 insertions, 47 deletions). Granularidad de commits decidida por dev: 1 commit por session (opcion A — granularidad para revert + PR con 3 commits al cierre).
**Commit DET-27**: `4e17718` — `fix(curriculum-design): UPONE-1100 — PascalCase canonico en cadena de auditoria S1 backend (flow regex + ENTITY_TYPE_MAP + wth + publish payload + descripcions + tests, 597/597 pass)`

---

### Session 2 — 2026-05-22 — Layouts del tab Historial + seed entries [phase: execute]

**Tipo**: auto
**Validation tier**: T1 (cambio multi-archivo en JSONs de layout + seed JS — sin nuevas branches de codigo en runtime path)

**Objetivo**: aplicar PascalCase canonico en los 9 filters de los tabs Historial (Activity + curricularLink + 7 RTs CurricularSection) + 2 entries del seed para Activity. Preservar polimorficos abiertos lowercase (`curriculumPlan`, `changeRequest`) per REQ-PRESERVE-01.

**Tasks completadas**:

- [x] S2.T1 — Filter Activity tab Historial: `default_Activity_view.json:354` value `"activity"` → `"Activity"`
- [x] S2.T2 — Filter CurricularLink: `default_curricularLink_view.json:89` value `"curricularLink"` → `"CurricularLink"`
- [x] S2.T3 — Filters en 7 archivos `default_rt__{Bibliography,Content,CustomSection,EvaluationComponent,LearningOutcome,Modality,Session}__curricularsection_view.json` value `"curricularSection"` → `"CurricularSection"`
- [x] S2.T4 — Seed entries Activity: `seed/_data-workflow-objects.js:99-100` entries con `entityType: 'activity'` → `'Activity'`. Entries `curriculumPlan` (L102-103) + `changeRequest` (L105) preservadas lowercase
- [x] S2.GATE — JSON valid en los 9 layouts + node --check seed OK + grep contracts verde (0 lowercase residual en filters) + `npm test` full suite 597/597 pass

**Log**:

| Timestamp | Task | Discovery |
|-----------|------|-----------|
| 2026-05-22 | S2.T1-T3 | 9 layouts editados con cambio quirurgico del literal value en filter `entityType`. JSON valido en los 9 (verificado con `python3 -m json.tool` × 9). Grep recursive `'"value": "(activity\|curricularSection\|curricularLink)"'` en `config/layouts/` retorna 0 matches (verificacion del contract). |
| 2026-05-22 | S2.T4 | Seed `_data-workflow-objects.js` linea 99-100 actualizadas a `entityType: 'Activity'` PascalCase + comment inline actualizado para reflejar TICKET-030 / UPONE-1100. Lineas 102-103 (curriculumPlan) y 105 (changeRequest) preservadas lowercase (polimorficos abiertos sin object base en el mod — REQ-PRESERVE-01). `node --check seed/_data-workflow-objects.js` OK. |
| 2026-05-22 | S2.GATE | **1 test fallo** en `tests/integration/workflow-seed-counts.test.ts:219-222` — assertion `expect(types).toEqual(new Set(['activity', 'curriculumPlan', 'changeRequest']))` con `'activity'` lowercase. Test introducido cuando el seed era lowercase; ahora el seed es PascalCase para Activity → test fail. Caso de "test que valida lo viejo" detectado por nuestro cambio. Actualizado a `['Activity', 'curriculumPlan', 'changeRequest']` + label del test ajustado. Re-run `npm test` → **597/597 pass en 3.28s**. |

**Quality review (DET-23)**:

**Reviewer**: LLM principal (auto, T1 light)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios deterministicos: 9 literals JSON + 2 strings JS. Sin magic numbers ni `any` nuevos. |
| 2 | Lint | n/a | Layouts JSON puros sin lint dedicado. Seed JS sin lint config. `node --check` validado. |
| 3 | Tipado | n/a | JSON sin tipos; JS sin TS en seed. |
| 4 | Testing | pass | 597/597 tests del mod pass post-update del test `workflow-seed-counts.test.ts:219-222`. Sin regresion. |
| 5 | Escalabilidad | n/a | Sin loops nuevos. |
| 6 | Mantenibilidad | pass | Cambios localizados al `value` del filter por archivo. Sin tocar `field`/`operator`/structure del filter. |
| 7 | Claridad | pass | Casing consistente con S1 backend + RULE-platform-006. |
| 8 | Accesibilidad | n/a | Sin UI components nuevos, sin cambios en headers/ARIA del tab. |
| 9 | Storybook | n/a | Sin componentes. |
| 10 | Error handling | n/a | Sin error paths nuevos. |

**Gate decision:**

- [x] continue → Session 3 (S3: SQL migration idempotente + sync + smoke UI)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision rationale**: 5/5 tasks completadas (4 ejecutables + GATE). 597/597 tests pass sin regresion. Filters de los 9 tabs Historial alineados con PascalCase canonico — el bug user-facing del usuario (tab Historial vacio) queda fixeado a nivel layouts. Falta S3 para data migration (2 rows en wth) + sync + smoke UI empirico que cierra la cadena.

**Tiempo invertido**: ~30 min efectivos
**Contexto retomable**: branch con 2 commits post-S1 (`4e17718` + `cad4ab1`). Listo para S3.
**Commit DET-27**: `cad4ab1` — `improvement(curriculum-design): UPONE-1100 — PascalCase canonico en cadena de auditoria S2 layouts (9 filters tabs Historial + seed entries Activity + tests, 597/597 pass)` (11 files changed, 14 insertions, 14 deletions)

---

### Session 3 — 2026-05-22 — Data migration via reset canonico + sync + smoke UI [phase: execute]

**Tipo**: ⚑ fuerte (operacion destructiva multi-tenant + gate del cierre del ticket — requiere consent del dev y validacion empirica del fix end-to-end)
**Validation tier**: T3 (regression completa: 5 tenants drop+recreate + sync + smoke UI manual del tab Historial)

**Objetivo**: rearmar la BD de up1 via el proceso canonico del platform (`npm run setup:reset` desde `object-manager/`) en lugar del SQL targeted del plan original. Decision del dev (2026-05-22) — "deberia funcionar con simplemente cumplir el proceso de up1 que restaura la db desde 0 y hace sync, son datos de desarrollo". Alineado con memoria global `feedback_sync_canonical_no_shortcuts.md` (no usar ALTER TABLE / edits manuales para drift; reset destructivo con consent del dev cuando aplique). Cierra REQ-FIX-06 + REQ-PRESERVE-03 + verifica REQ-FIX-01..05 holisticamente via smoke UI manual del dev.

**Tasks completadas**:
- [x] S3.T1 — `npm run setup:reset -- --skip-confirmation` desde `object-manager/` (canonico destructivo). 4/5 tenants OK (TEST, UCASMT, UCENG, UCPLN). **UPU fallo** con 2 bloqueadores preexistentes — recovery via patron B2 (TICKET-029 S1.T5)
- [x] S3.T2 — Verificacion post-recovery: counts de `entityType` en `changeLog` + `WorkflowTransitionHistory` + `ownerType` en `CurricularSection` en BD UPU local. Todos PascalCase canonico (polimorficos abiertos `curriculumPlan`/`changeRequest` lowercase preservados per REQ-PRESERVE-01)
- [x] S3.T3 — Smoke UI manual del tab Historial del Activity en suite (UPU local) — confirmado por dev "esta funcionando" 2026-05-22
- [x] S3.GATE — Quality review DET-23 exhaustive (T3) + verificacion end-to-end + decision de cierre del ticket

**Validacion del tier**:

- T3 — `setup:reset` 4/5 + recovery B2 verificado empirico (`npx prisma db push --schema=prisma/UPU/schema.prisma --accept-data-loss` → 201ms) + `npm run seed -- UPU` + `npm run sync` (Phase 8 — seed mod) + counts BD coherentes PascalCase + smoke UI dev verde

**Log**:

| Timestamp | Task | Discovery |
|-----------|------|-----------|
| 2026-05-22 | S3.T1 | **Bloqueador 1 (Prisma AI safety)**: `prisma migrate dev` (interno de `tenant:create`) detecta entorno non-interactive cuando se invoca desde AI y exige env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` con texto literal del consent del dev. Resuelto pasando el env var con el mensaje literal del dev. 4/5 tenants OK (TEST, UCASMT, UCENG, UCPLN) — eran BDs nuevas sin data legacy. |
| 2026-05-22 | S3.T1 | **Bloqueador 2 (drift preexistente UPU)**: tenant UPU tiene 8 migrations historicas en `prisma/UPU/migrations/` (entre 2026-04-19 y 2026-05-20). Migration `20260519153148_changelog_init/migration.sql` declara `CREATE TYPE "CurricularSectionOwnerType" AS ENUM ('activity', 'Offering')` lowercase. Schema actual post-TICKET-028 S3 declara enum PascalCase `["Activity", "Offering"]`. `prisma migrate dev` detecta drift entre migrations existentes y schema actual → quiere prompt interactivo para crear migration ALTER ENUM → falla en non-TTY. **Esto NO es introducido por TICKET-030** — es drift acumulado por TICKET-028 que cambio enum del JSON sin regenerar migrations. Reportado al dev. |
| 2026-05-22 | S3.T1 | **Decision del dev: opcion B2** (TICKET-029 S1.T5 pattern — `prisma db push --schema=prisma/UPU/schema.prisma --accept-data-loss`). "Siempre debe usarse ese que ya viene con up1" — confirmado canonico, NO atajo quirurgico. |
| 2026-05-22 | S3.T1 | **Recovery flow B2 ejecutado**: (1) drop manual UPU con `pg_terminate_backend` + `DROP DATABASE "uplanner_upu"`. (2) BD recreada implicit por tenant:create retry (que paro en migrate dev). (3) `npx prisma db push --schema=prisma/UPU/schema.prisma --accept-data-loss` con env var consent — schema sincronizado en 201ms. (4) `npm run seed -- UPU` (core data: 30 users + 110 categories + 110 infrastructure + 110 services + 3 Grupo Apps). (5) `npm run sync` desde object-manager (Phase 8 — Seed Data Sync — dispara seeds del mod curriculum-design: 2 Activities + 98 CurricularSections + 5 WorkflowTransitionHistory entries via `_data-workflow-objects.js` + `_data-univalle.js` + `_data-aiep.js`). |
| 2026-05-22 | S3.T2 | **Verificacion empirica post-recovery** (PascalCase canonico end-to-end): `Activity` table = 2 rows (Univalle + AIEP). `CurricularSection.ownerType` = `Activity: 98` PascalCase (de las 98 sections de los 2 programas). `WorkflowTransitionHistory.entityType` = `Activity: 2` + `changeRequest: 1` + `curriculumPlan: 2` (polimorficos abiertos lowercase preservados). `changeLog` = 0 rows (vacio — solo se crea al ocurrir cambios runtime, el seed no genera entradas via mutation). H6 confirmado con state final. |
| 2026-05-22 | S3.T3 | **Smoke UI manual del dev**: tab Historial del Activity en suite responde correctamente — el dev confirmo "esta funcionando" 2026-05-22. El bug user-facing del reporte original (tab Historial vacio) **fixeado end-to-end**. Cambios consolidados via L40 (CurricularSection con `ownerType=Activity`) y transitions del Activity vuelven a aparecer en el tab. |
| 2026-05-22 | S3.T3 | **Discovery L7 (UX gap detectado por el dev en smoke)**: hay un gap de refresh del tab Historial al hacer cambios. Diagnosticado en 2 capas: (1) **asincronia del audit-capture** — flow n8n consume el evento async, escribe changeLog 1-5s post-mutation (documentado como "auditoria eventual, no parte del ACID core" en `activity.resolver.js:222`). (2) **Apollo cache-first** — `useDataFetching.ts:143` usa `cache-first` por default, no refetch on tab-activation ni polling. El cache de Apollo es el factor menor; el factor principal es la asincronia. Agregar al backlog (B5). |
| 2026-05-22 | S3.T3 | **Drift residual preexistente**: el sync sigue reportando 7 errors en Modality fields (`code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode`) — drift entre `mods/curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json` y `object-manager/objects/business/Base/`. NO related a TICKET-030. Memoria global: clasificado como preexistente, no se toca sin aprobacion del dev. Agendable como B6 (cross-mod audit) o ticket nuevo si emerge prioridad. |

**Discoveries / Learns nuevos**:

- **L7** — UX gap del refresh del tab Historial diagnosticado por el dev durante smoke. Causa principal: asincronia del audit-capture (eventual consistency by design del HU2). Causa secundaria: Apollo `cache-first` por default. Material para B5 (mejorar UX: X3 refetch on tab-activation con delay 2-3s, o X4 polling, o X5 GraphQL subscription).
- **L8** — Prisma 5.x+ AI safety feature: bloquea `prisma migrate dev / db push --force-reset / db push --accept-data-loss` ejecutados desde AI cuando detecta `claude-code` u otra agentic environment. Requiere env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` con texto literal del consent del dev (sin newlines/quotes). Patron resoluble pero costoso de descubrir — anclar en RULE-platform-006 o en operational notes del platform.
- **L9** — Drift de migrations vs schema en UPU: TICKET-028 S3 cambio enum del JSON sin regenerar migrations historicas. Resultado: cada `setup:reset` falla en UPU por migration legacy con enum lowercase. Workaround canonico: B2 (db push). Solucion correcta: regenerar migrations base post-rename de objects auditables — material para ticket nuevo de housekeeping.

**Quality review (DET-23 — exhaustive)**:

**Reviewer**: LLM principal (auto exhaustive — tier T3 ⚑ fuerte)
**Tier de revision**: exhaustive
**Resultado global**: pass (con notas)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | S3 no toco codigo de aplicacion — solo operaciones de BD/seed/sync. Codigo modificado en S1+S2 ya revisado en quality reviews previas. |
| 2 | Lint | n/a | Sin codigo modificado en S3. |
| 3 | Tipado | n/a | Idem. |
| 4 | Testing | pass | 597/597 tests del mod pass post-S2 (no se re-corren en S3 — sin cambios de codigo). Smoke UI manual del dev confirma fix funcionando empirico. Sin regresion detectada. |
| 5 | Escalabilidad | pass | Reset canonico via setup:reset escala a N tenants (loop iterativo en setup-reset.js). Recovery via db push escala a 1 tenant a la vez (operacion comun en dev). |
| 6 | Mantenibilidad | pass | Patron B2 (db push --accept-data-loss) documentado como canonico del platform — repetible en futuros casos de drift de migrations vs schema. RULE-platform-006 sigue siendo el contrato canonico de casing. |
| 7 | Claridad | pass | Log de S3 con anclajes empiricos a comandos ejecutados + counts pre/post + decision rationale del dev (B2 vs SQL targeted). Discovery L7 (UX gap) diagnosticado con peso relativo de los 2 factores. |
| 8 | Accesibilidad | n/a | Sin UI modificada. |
| 9 | Storybook | n/a | Sin componentes. |
| 10 | Error handling | pass | Recovery flow tolerante a la falla del tenant:create UPU (no aborto el proceso, identificacion del root cause + B2 como recovery canonico). |

**Notas adicionales**:

- ⚠️ Drift preexistente (Modality fields + enum CurricularSectionOwnerType en migrations) NO bloqueante para este ticket. Agendable separadamente.
- ⚠️ B-followups generados durante S3: B4 (reproceso retroactivo de 2 transitions descartadas pre-fix — could) + B5 (gap de refresh del tab Historial — could) + B6 (cross-mod audit / Modality fields drift — should).

**Gate decision**: (approvedBy: dev — "cieera 030")

- [x] continue → cerrar TICKET-030
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision rationale**: 4/4 tasks completadas (3 ejecutables + GATE). Bug user-facing del reporte original fixeado empirico (smoke UI dev). End-to-end PascalCase canonico verificado en 4 puntos (Activity / CurricularSection.ownerType / WorkflowTransitionHistory.entityType + cadena de auditoria con flow + ENTITY_TYPE_MAP del resolver + filters de los 9 tabs alineados PascalCase). REQ-FIX-01..06 + REQ-PRESERVE-01/02/03 todos validados con evidence. Bloqueadores preexistentes documentados como L8 (Prisma AI safety) + L9 (drift de migrations) — out of scope. Discoveries criticos del execute (L1..L7) agregan material reusable a B3 (extension RULE-platform-006 con seccion "Cadena de auditoria"). Listo para cierre con teach-close.

**Pre-condiciones para cierre del ticket**:

- 597/597 tests del mod pass (✓)
- Bug user-facing fixeado empirico (smoke UI dev) (✓)
- BD UPU coherente PascalCase canonico (✓)
- Quality review exhaustive pass 6/10 + 4 n/a justificados (✓)
- Backlog refinado: B1..B6 con priority explicita (✓)
- 2 commits ya en branch (`4e17718` + `cad4ab1`) — S3 no requiere commit de codigo (solo operaciones de BD/sync) (✓)

**Tiempo invertido**: ~1.5h efectivos (incluye 2 bloqueadores preexistentes detectados + recovery B2 + smoke UI manual del dev)
**Contexto retomable**: branch `UPONE-1100-fix-audit-chain-entityType-pascalcase` con 2 commits listos para PR a develop del mod. BD UPU local coherente. Drift preexistente documentado como out of scope.
**Commit DET-27**: S3 no requiere commit de codigo (sin cambios en archivos del repo). Cierre del ticket dkc consolida via commit final dkc (frontmatter + Sessions + Summary + teach-close).

---

## Testing

### Coverage map

| REQ tentativo | Test cases | Type | Status |
|---------------|-----------|------|--------|
| REQ-FIX-01 (flow audit-capture regex acepta `Activity` PascalCase) | TC-1 | auto (grep + n8n flow valido) | pending |
| REQ-FIX-02 (ENTITY_TYPE_MAP en resolver mapea PascalCase) | TC-2 | auto (grep + unit test normalizeEntityType) | pending |
| REQ-FIX-03 (activity.resolver:207 guarda wth con entityType='Activity' PascalCase) | TC-3 | auto (grep + integration test si existe) | pending |
| REQ-FIX-04 (9 filters de layouts tab Historial usan PascalCase) | TC-4..TC-12 (1 por layout) | auto (grep per file) | pending |
| REQ-FIX-05 (seed _data-workflow-objects entries `activity` migradas a `Activity`) | TC-13 | auto (grep) | pending |
| REQ-FIX-06 (SQL migration idempotente: changeLog + wth entityType lowercase → PascalCase, 0 lowercase post) | TC-14 | auto (SQL query antes/despues + COUNT) | pending |
| REQ-PRESERVE-01 (otros polimorficos abiertos `curriculumPlan/changeRequest/booking` lowercase preservados) | TC-15 | auto (grep) | pending |
| REQ-PRESERVE-02 (tests integration + unit del mod no regresionan) | TC-16 | auto (vitest run completo del mod) | pending |
| REQ-PRESERVE-03 (smoke UI tab Historial del Activity muestra cambios consolidados post-fix) | TC-17 | manual visual (UPU sandbox) | pending |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | flow audit-capture regex acepta `Activity` PascalCase | REQ-FIX-01 | auto | no | post-edit | grep `auditableRe` en flows/audit-capture.json | retorna regex con grupo 1 `Activity\|CurricularSection\|CurricularLink` | `auditableRe = /^(Activity\|CurricularSection\|CurricularLink\|rt__[a-zA-Z0-9_]+__(activity\|curricularsection\|curricularlink))$/` (verificado grep en S1.GATE) | grep output en S1.T3 log | pass | S1.T3 | — |
| TC-2 | normalizeEntityType('Activity').toBe('Activity') | REQ-FIX-02 | auto | no | post-edit | `npm test tests/unit/auditCapture.test.js` | 51/51 pass + assertions PascalCase actualizados | 51/51 pass en 8ms. Tests describe `normalizeEntityType` PascalCase + rt__ polimorficos retornan PascalCase + edge case lowercase `'activity'` → null preservado | npx vitest run output en S1.T6 log | pass | S1.T6 | — |
| TC-3 | activity.resolver:207 wth entityType='Activity' | REQ-FIX-03 | auto | no | post-edit | grep `entityType:` activity.resolver.js linea 207 | retorna `'Activity'` PascalCase | `207: entityType: 'Activity',` (verificado grep en S1.GATE). **Bonus**: linea 234 `objectType: 'Activity'` tambien corregida (consumer no detectado en intake — L6) | grep output en S1.T4 + S1.GATE logs | pass | S1.T4 + S1.GATE (L6 discovery) | activity.resolver:234 payload objectType corregido tambien (consumer adicional del flow regex) |
| TC-4 | default_Activity_view filter entityType='Activity' | REQ-FIX-04 | auto | yes | post-edit | grep `"value": "activity"` default_Activity_view.json | 0 matches lowercase (solo `"Activity"` PascalCase) | 0 matches lowercase + JSON valido (verificado) | grep + python3 json.tool en S2.GATE | pass | S2.T1 | — |
| TC-5 | default_curricularLink_view filter entityType='CurricularLink' | REQ-FIX-04 | auto | yes | post-edit | grep `"value": "curricularLink"` default_curricularLink_view.json | 0 matches camelCase (solo `"CurricularLink"` PascalCase) | 0 matches camelCase + JSON valido | grep + python3 json.tool en S2.GATE | pass | S2.T2 | — |
| TC-6..TC-12 | 7 layouts default_rt__*__curricularsection_view filter entityType='CurricularSection' | REQ-FIX-04 | auto | yes | post-edit | grep `"value": "curricularSection"` config/layouts/default_rt__*__curricularsection_view.json | 0 matches camelCase en los 7 archivos | 0 matches en los 7 + JSON valido en los 7 | grep + python3 json.tool × 7 en S2.GATE | pass | S2.T3 | — |
| TC-13 | seed _data-workflow-objects entries activity → Activity | REQ-FIX-05 | auto | no | post-edit | grep `entityType: 'activity'` seed/_data-workflow-objects.js | 0 matches (preservan `curriculumPlan`/`changeRequest` lowercase) | 0 matches `entityType: 'activity'` + 2 entries Activity PascalCase + 2 curriculumPlan + 1 changeRequest preservados lowercase | grep + node --check en S2.GATE | pass | S2.T4 | — |
| TC-14 | Counts post-reset canonico (decision B2 del dev — reset destructivo en lugar de SQL targeted) | REQ-FIX-06 | auto | no | docker pg + post-`setup:reset` + B2 recovery | psql query `SELECT "entityType", COUNT(*) FROM "changeLog" GROUP BY "entityType"` + idem WorkflowTransitionHistory + `ownerType` en CurricularSection | snapshot post-reset con 0 lowercase para `activity` (preservar `changeRequest`/`curriculumPlan` lowercase per REQ-PRESERVE-01) | **Pre-migration (S1.T1)**: changeLog `Activity: 4` (PascalCase ya limpio). WorkflowTransitionHistory `activity: 2 + Activity: 2 + changeRequest: 1 + curriculumPlan: 2` (estado mixto). **Post-reset canonico (S3.T2)**: `Activity` table = 2 rows. `CurricularSection.ownerType = Activity: 98` PascalCase. `WorkflowTransitionHistory.entityType = Activity: 2, changeRequest: 1, curriculumPlan: 2` (0 lowercase `activity` residual, polimorficos abiertos preservados). `changeLog = 0 rows` (vacio — solo se crea al ocurrir cambios runtime). | docker exec pg psql query outputs en S1.T1 + S3.T2 logs | pass | S3.T2 | scope cambio de SQL targeted a reset canonico (B2 — decision del dev "siempre debe usarse ese que ya viene con up1"). Eliminado el SQL idempotente del plan original. |
| TC-15 | polimorficos abiertos `curriculumPlan/changeRequest` lowercase preservados | REQ-PRESERVE-01 | auto | no | post-fix | grep `'curriculumPlan'\|'changeRequest'` seed/_data-workflow-objects.js | matches preservados (no se tocaron) | 2 entries `curriculumPlan` lowercase (L102-103) + 1 entry `changeRequest` lowercase (L105) preservados intactos | grep output en S2.GATE | pass | S2.T4 | — |
| TC-16 | tests del mod no regresionan | REQ-PRESERVE-02 | auto | no | post-fix | `npm test` full suite del mod | 597/597 pass (mismo conteo que TICKET-029 cerrado) | 597/597 pass en 3.28s post-S2 (1 test update en workflow-seed-counts.test.ts:219-222 introducido por el cambio del seed — assertion ajustada a `['Activity', 'curriculumPlan', 'changeRequest']`) | npm test output en S2.GATE | pass | S2.GATE | — |
| TC-17 | smoke UI tab Historial Activity muestra cambios | REQ-PRESERVE-03 | manual visual | yes | post-S3 + UPU local + docker pg + suite levantada | abrir RecordDetail Activity tab Historial en UPU local (data seedeada de Modalidad/Sesion) | tab renderiza con N filas de cambios consolidados (no vacio) | **Dev confirmo "esta funcionando" 2026-05-22** post-recovery B2. Bug user-facing del reporte original fixeado empirico end-to-end. **Hallazgo secundario**: gap de refresh detectado por dev (Apollo cache-first + asincronia audit-capture) — agregado a backlog B5 | confirmacion verbal del dev en S3.T3 + counts BD post-reset coherentes | pass (con followup B5) | S3.T3 | B5 generado: gap de refresh del tab post-edit (Apollo cache + asincronia audit-capture) — out of scope TICKET-030, candidato a ticket improvement separado |

## Learns

| # | Learn | Fuente | Sesion | Status | Promoted a |
|---|-------|--------|--------|--------|------------|
| L1 | commit `2e47a62` (UPONE-1100 followup) parcho solo el lookup interno del padre activity, NO la cadena de auditoria — caso de "fix parcial" que dejo el bug user-facing intacto | S0 intake | S0 | refined | RULE-platform-013 |
| L2 | el enum `CurricularSection.ownerType` es fuente upstream de la consolidacion L40 — si el enum cambia casing, todos los rows nuevos del changeLog para consolidaciones quedan en ese casing. Punto de inspeccion canonico para migraciones de casing | S0 intake | S0 | refined | RULE-platform-013 |
| L3 | patron observable: migraciones de casing tienden a parchar capas visibles (Prisma errors, GraphQL errors) pero las semánticas (entityType polimorfico string libre, regex filters) son silenciosas. Refuerza necesidad de checklist al renombrar objects auditables | S0 intake | S0 | refined | RULE-platform-013 |
| L5 | consumer del MAP fuera del scope original: el check `entityTypeStored === 'curricularSection'` en L40 (linea 361 del resolver) habria roto la consolidacion post-S1.T2 si no se detectaba. Refuerza B3 (checklist debe incluir `grep === '<old_value>'` post-rename para encontrar checks que comparan contra el valor MAP). | S1.T5 execute | S1 | refined | RULE-platform-013 |
| L6 | consumer del flow regex no detectado en intake: `activity.resolver.js:234` publica el payload del transition event con `objectType: 'activity'` lowercase — habria sido descartado por la regex flow post-S1.T3. Detectado al correr tests integration en S1.GATE (test L349 asserting `payload.objectType === 'activity'` fallo). Refuerza B3 (checklist debe incluir `grep "objectType:" en todos los archivos que invocan publishToChannel/publishTransitionEvent` post-rename). | S1.GATE execute | S1 | refined | RULE-platform-013 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Teaching — Intake

**Status**: skipped
**Razon**: hotfix follow-up de TICKET-028 con diagnostico empirico completo en conversacion previa con dev (6 hipotesis confirmadas con anclajes empiricos a archivos:lineas + analisis de impacto colateral cross-archivo identificando 3 piezas no migradas + 3 sub-decisions A1/A2/A3 evaluadas tabular antes de elegir A1). Sin lessons learned reusables que ameriten material educativo formal independiente — el racional vive inline en `## Request > Causa raiz multi-capa` + `## Triage > Hipotesis` (H1-H6 con niveles de certeza explicitos DET-1) + `## Sessions > Plan de sessions`. Material pedagogico canonico se entregara via B3 (extension de RULE-platform-006 con seccion "Cadena de auditoria") en S3 — eso indexa para futuros devs como contrato KB. (DET-21 post-F5, HOR-020)
**Fecha**: 2026-05-22

## Teaching — Close

**Status**: skipped
**Razon**: ticket tactico de cierre de cadena de auditoria post-TICKET-028. Material reusable canalizado a B3 (extension RULE-platform-006 con seccion "Cadena de auditoria") + B5 (gap de refresh — improvement separado) + B6/B7 (drift housekeeping del platform). El racional del fix + diagnostico multi-capa + bloqueadores preexistentes (L8 Prisma AI safety + L9 drift de migrations) + recovery B2 vive inline en `## Sessions > Session 1/2/3 > Log` con anclajes empiricos a archivos:lineas + counts pre/post BD. Patron consistente con TICKET-028 (deploy block hotfix con RULE-platform-006 como pieza pedagogica canonica) y TICKET-029 que aprendio el patron B2 (skipped intake + done close minimal). Futuro dev que retome el caso encuentra el contexto en el ticket markdown sin necesidad del teach-close.md aparte. (DET-22 post-F5, HOR-020)
**Fecha**: 2026-05-22

## Summary

**TICKET-030 cerrado** (2026-05-22). Cadena de auditoria del mod curriculum-design migrada a PascalCase canonico end-to-end (UPONE-1100 closure — followup de TICKET-028 que dejo 3 capas semanticas sin migrar). Bug user-facing del reporte original (tab Historial del Activity vacio) **fixeado empirico** — confirmado por dev en smoke UI 2026-05-22 ("esta funcionando").

**Que se cambio**:

- **Backend (S1, commit `4e17718`)**: `ENTITY_TYPE_MAP` PascalCase identity mapping + regex `auditableRe` del flow n8n grupo 1 PascalCase + `activity.resolver.js:207` wth `entityType: 'Activity'` + `activity.resolver.js:234` publish payload `objectType: 'Activity'` (consumer descubierto en S1.GATE — L6) + check L40 `=== 'CurricularSection'` PascalCase (consumer del MAP descubierto en S1.T5 — L5) + descripcions de objects + unit tests + 3 integration tests assertion updates
- **Layouts + seed (S2, commit `cad4ab1`)**: 9 filters de tabs Historial PascalCase (Activity + CurricularLink + 7 RT CurricularSection) + 2 entries del seed Activity PascalCase (polimorficos abiertos `curriculumPlan`/`changeRequest` lowercase preservados per REQ-PRESERVE-01) + 1 integration test assertion update
- **Data migration (S3 — sin commit, solo operaciones)**: BD UPU local restaurada via proceso canonico `setup:reset` + recovery B2 (`prisma db push --accept-data-loss`) para UPU que tenia drift de migrations preexistente. Post-recovery: BD coherente PascalCase end-to-end (2 Activities + 98 CurricularSections con `ownerType=Activity` + 2 wth con `entityType=Activity` + polimorficos abiertos preservados)

**Evidencia**:

- 597/597 tests del mod pass (sin regresion)
- 51/51 tests unit auditCapture.test.js pass (assertions PascalCase)
- 3 tests integration `activity-resolvers.test.ts` actualizados (history.entityType + payload.objectType PascalCase)
- 1 test integration `workflow-seed-counts.test.ts` actualizado (set de entityTypes esperados)
- Counts BD UPU post-recovery PascalCase canonico en 3 tablas (Activity, CurricularSection, WorkflowTransitionHistory)
- Smoke UI dev verde: tab Historial muestra cambios consolidados
- 2 commits en branch `UPONE-1100-fix-audit-chain-entityType-pascalcase` listos para PR a develop del mod (push + PR pendiente para el dev)

**Discoveries promovibles**:

- **L1-L9** documentados en el ticket — destacados: L5 (consumer del MAP fuera del intake), L6 (publish event objectType fuera del intake), L7 (UX gap de refresh — Apollo + asincronia), L8 (Prisma AI safety feature), L9 (drift de migrations vs schema post-TICKET-028)
- Material reusable canalizado a:
  - **B3** (should) — extension de RULE-platform-006 con seccion "Cadena de auditoria" + checklist de los ~6 puntos canonicos al renombrar object base auditable
  - **B5** (could) — improvement separado del gap de refresh del tab Historial (opciones X3-X5)
  - **B6** (should) — cross-mod audit + housekeeping del drift `Modality` fields preexistente
  - **B7** (should) — regenerar migrations base post-rename para resolver drift de UPU enum lowercase

**Gap con AC5 literal del Jira UPONE-1100**: el AC5 declara `entityType="activity"` lowercase, mientras que TICKET-028 + TICKET-030 lo dejaron PascalCase canonico per RULE-platform-006 (post-deploy block). El AC se cumple **semanticamente** (changeLog + wth registran el entityType del Activity correctamente, casing canonico). Comentario al Jira queda como followup del dev (observacion via Clemente Jara, registrado en `## Request > Asociacion al ticket Jira UPONE-1100`).

**Backlog**: B1 (smoke E2E post-deploy, could) + B2 (audit cross-mod, should) + B3 (RULE extension, should) + B4 (reproceso transitions — resuelto pasivo en S3) + B5 (UX gap refresh, could) + B6 (Modality fields drift, should) + B7 (migrations housekeeping, should). Ningun item `must` — ticket cierra limpio per DET-17.

**Teach-intake**: skipped con razon (DET-21 post-F5). **Teach-close**: skipped con razon (DET-22 post-F5).

**Next steps para el dev**:

1. Push branch + abrir PR a develop del mod (postponed per decision del dev)
2. Comment al Jira UPONE-1100 actualizando AC5 con el casing PascalCase actual (observacion Clemente Jara)
3. Evaluar prioridad de B5 (UX gap refresh) — improvement con valor visible
4. Evaluar prioridad de B6/B7 (drift housekeeping) — deuda tecnica del platform
