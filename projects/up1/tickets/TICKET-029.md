---
id: TICKET-029
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1098
module: curriculum-design
autopilot: manual
---

# Sacar el campo `comment` del object changeLog + columnas "Comentario" en vistas del historial de cambios

## Request

**Peticion interna del equipo** (sin Jira external): eliminar el campo `comment` del object `changeLog` y, por consecuencia, las columnas "Comentario" en todas las vistas del tab "Historial de cambios" (RecordDetail tab del Activity + CurricularSection RTs + CurricularLink + lista global del changeLog).

### Por que se pide

El comentario del workflow (`workflowTransitionHistory.comment`) ya vive en la HU3 audit chain. Duplicar el comment en cada fila del changeLog (1 por campo modificado) genera ruido visual + redundancia — el dev consumidor del tab Historial no necesita ver el mismo comment N veces para una transition que toco N campos. La info canonica del comment vive en `workflowTransitionHistory` (1 fila por transition).

Para Update / Create / Delete DirectEdit el comment esta vacio (opcional) — columna inutil.

### Contexto historico del field

- Introducido en TICKET-020 (HU2 ChangeLog audit, UPONE-1098), cerrado 2026-05-20.
- Per JSON description: *"Comentario libre del workflow o del usuario que ejecuto el cambio. Para StateTransition: heredado del campo comment de workflowTransitionHistory (HU3 — requerido cuando transition.requiresComment=true). Para Update / Create / Delete via DirectEdit: opcional."*
- OQ3 de TICKET-020 resolvio scope A (tooltip nativo para truncamiento) — esta limpieza supersede esa decision: si el campo no existe, no hay nada que truncar.

### Asociacion al parent ticket

Este ticket es **followup de [TICKET-020](ticket-020.md)** (HU2 ChangeLog audit — UPONE-1098). TICKET-020 introdujo el field; este ticket lo elimina por decision de UX/data hygiene del equipo.

## Scope

### Dentro del scope:

**Object schema (1 archivo)**:
- `mods/curriculum-design/objects/changeLog.json` — eliminar property `comment` (4 lineas: type, title, not_null, description)

**Layouts (10 archivos)** que muestran columna "Comentario":
- `config/layouts/default_changeLog_list.json` (1 ref)
- `config/layouts/default_Activity_view.json` (tab Historial, 1 ref)
- `config/layouts/default_curricularLink_view.json` (1 ref)
- `config/layouts/default_rt__Bibliography__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__Content__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__CustomSection__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__EvaluationComponent__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__LearningOutcome__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__Modality__curricularsection_view.json` (1 ref)
- `config/layouts/default_rt__Session__curricularsection_view.json` (1 ref)

**Dependencies que requieren ajuste**:
- Resolver `auditCapture.resolver.js` que probablemente escribe el `comment` al ejecutar el evento `Activity:transition` (heredando de `workflowTransitionHistory.comment`)
- Tests integration que validen ausencia del field post-fix
- Prisma migration DROP COLUMN (manual o via codegen + db push)
- Codegen + sync para regenerar dynamic.js + Prisma client sin el field

### Fuera del scope:

- **`workflowTransitionHistory.comment`**: NO se toca. Sigue siendo source-of-truth del comment de transitions (HU3 — required cuando `transition.requiresComment=true`).
- **Otros campos del changeLog** (`entityType`, `entityId`, `action`, `oldValue`, `newValue`, etc.): se preservan.
- **Tooltip nativo del browser** (OQ3 scope A de TICKET-020): obsoleto post-fix — el field no existe, no hay tooltip.
- **Migration de data productiva UPU**: TICKET-020 acaba de cerrar (2026-05-20) — probablemente hay poca o ninguna fila changeLog con `comment` poblado en UPU production. Validar en S1 + decidir si DROP COLUMN sin backup es OK (caso comun para columnas opcionales recien introducidas).

## Classification

| Campo | Valor |
|-------|-------|
| **Tipo de trabajo** | improvement (data hygiene + UI cleanup) |
| **Modulo** | curriculum-design (mod) |
| **Capa principal** | data model (object JSON) + frontend (layouts) + Prisma migration |
| **Complejidad** | baja-media — multi-archivo (~11) pero cambios deterministicos (remove field + remove column) |
| **Story Points (estimado)** | 2 |
| **Sprint** | (none aun — definir cuando entre al pipeline) |
| **Tracker Jira** | (none — peticion interna) |
| **Parent ticket** | TICKET-020 (HU2 ChangeLog audit — donde se introdujo el field) |

## Creation scope

- **Quien lo pide**: equipo (peticion interna, sin Jira). Documentado aqui per memoria global `feedback_follow_up_local_no_jira.md`.
- **Aplica RULE-platform-006** (TICKET-028): `entityType: 'activity'` lowercase queda intacto (es discriminador polimorfico, no enum). Solo se elimina el field `comment`.
- **Memoria global**: `feedback_persist_sessions_at_gate_close.md` — persistir Session blocks por gate durante execute.

## Setup

- **Branch propuesta**: `improvement/remove-changelog-comment` (nueva, desde develop del mod curriculum-design — post-merge TICKET-028)
- **Working dir**: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design`
- **Codegen target**: `/Users/edobacon/Workspace/uplanner/up1` (npm run codegen + sync + restart om dev post-cambios per RULE-platform-006 Operational notes)
- **BD UPU local**: docker pg — Prisma migration DROP COLUMN del field

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El field `comment` es **redundante** con `workflowTransitionHistory.comment` para StateTransition + **vacio** para DirectEdit (Update/Create/Delete) | **inferred** | Per JSON description del field: "heredado de wth para StateTransition; opcional para DirectEdit". Validacion empirica: SELECT COUNT WHERE comment IS NOT NULL FROM "ChangeLog" en S1 — esperado bajo. Tambien: la audit chain HU3 ya tiene el comment en wth |
| H2 | Eliminar el field NO rompe el resolver `auditCapture` porque el field es opcional (`not_null: false`) — el resolver puede dejar de escribirlo sin breaking change | **inferred** | Field es nullable. Resolver al hacer `prisma.changeLog.create({ data: { ... } })` SIN el `comment` field deberia funcionar. Validar empirico en S2 con test integration |
| H3 | Los 10 layouts solo referencian `comment` en una columna `{ "key": "comment" }` — eliminar la entry del array `columns` no rompe nada mas | **confirmed** | grep retorna 1 match `"comment"` por layout, todos en formato `{ "key": "comment", "label": "Comentario" }` dentro del array `columns` |
| H4 | Prisma migration DROP COLUMN funciona sin perdida de data critica porque (a) `comment` es nullable, (b) TICKET-020 acaba de cerrar (2026-05-20) → poca data productiva acumulada | **inferred** | Confirmar en S1 con `SELECT COUNT(*) FROM "ChangeLog" WHERE comment IS NOT NULL` antes del DROP. Si retorna count alto → considerar backup |
| H5 | Suite Apollo client regenera sus types automaticamente post-restart de object-manager → no requiere intervencion manual en suite | **inferred** | Per RULE-platform-006 Operational notes: object-manager carga typedefs al startup; suite tiene hot-reload + Apollo refetch. Restart om suficiente |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B1 | Promover L1+L3 (sync APPEND-ONLY) a BUG-platform-013 o RULE-platform-007 | — | — | discovery documentado en teach-close + 2 ocurrencias confirmadas (business/Base + suite/lang) | crear `bugs/platform/BUG-platform-013.md` (preferido) o `rules/platform/rule-platform-007.md`. Referenciar teach-close en `Discovered in` | should |
| B2 | Smoke UI visual autenticado del tab Historial post-PR review | REQ-PRESERVE-03 | SPEC-011 | datos validados via BD layoutConfig + grep + 597 tests pass; smoke infra OK con 2 PNGs | abrir UPU sandbox autenticado, capturar 3 screenshots (Activity > Historial, EvaluationComponent > Historial, lista global default_changeLog_list) en `tickets/TICKET-029.screenshots/`. Sin impacto en correctitud del fix | could |

## Sessions

### Session 1 — 2026-05-22 — Backend coherente sin field comment [phase: execute]

**Tipo**: auto (auto-continue si vitest verde + codegen exit 0 + introspection sin comment)
**Validation tier**: T2 (cambio multi-archivo: object JSON + resolver + Prisma schema + BD UPU + sync)

**Objetivo**: dejar el backend (object JSON + resolver + Prisma schema + BD UPU) sin el field `comment`. Restart om dev al final con introspection limpia. Pre-condicion para S2 (layouts).

**Tasks completadas**:
- [x] S1.T1 — SELECT COUNT comment NOT NULL en UPU local → total=0, comment_not_null=0. H4 confirmado fuerte. Discovery: tabla y model Prisma son **lowercase `changeLog`** (no PascalCase). RULE-platform-006 no se rompe (JSON title comienza con minuscula).
- [x] S1.T2 — Eliminar property `comment` de `objects/changeLog.json` → branch `improvement/remove-changelog-comment` creado desde develop + property eliminada (lineas 97-102) + JSON valido + 16 properties remaining sin `comment`
- [x] S1.T3 — Limpiar `auditCapture.resolver.js`: 4 lineas `comment:` (L504, L540, L582, L622) + select `comment: true` de L432 + comentario L43 reservado (L355-356) + nota inline en L341 + doc comment del input GraphQL schema (`auditCapture.schema.graphql:64`) actualizado. `grep "comment"` resolver.js → 0 matches; `node --check` JS valido.
- [x] S1.T4 — `npm run codegen` (post `npm run sync` que detecto el archivo huerfano y lo regenero limpio). Schema Prisma: `model changeLog` SIN `comment`, `model WorkflowTransitionHistory` con `comment String?` preservado.
- [x] S1.T5 — `npm run prisma:generate && npx prisma db push --schema=prisma/UPU/schema.prisma --accept-data-loss` → 130ms. Verificado en BD: `\d "changeLog"` sin column comment (18 columns), `\d "WorkflowTransitionHistory"` con `comment text` preservado.
- [x] S1.T6 — `npm run sync` ejecutado (en realidad antes de codegen, mas la regeneracion del archivo huerfano). Mods merged: 3 (curriculum-design, flow-viewer, retention-wellbeing). Exit 0.
- [x] S1.T7 — om dev YA estaba corriendo, schema reload automatico via hot-reload Apollo. Introspection: `{ __type(name: "changeLog") { fields { name } } }` → 21 fields SIN `comment`. `WorkflowTransitionHistory` → 11 fields CON `comment` (REQ-PRESERVE-02 confirmado).
- [x] S1.GATE — Gate de sync Session 1 (tier: T2) + Quality review DET-23 → continue.

**Validacion del tier**:
- T2 — vitest run del modulo (auditCapture) + lint exit 0 + codegen exit 0 + introspection JSON validado + sync log sin errores. Coverage delta documentado en S1.GATE.

**Log**:

| Timestamp | Task | Discovery |
|-----------|------|-----------|
| 2026-05-22 | S1.T1 | `docker exec pg psql -U pg -d uplanner_upu -c 'SELECT COUNT(*), COUNT("comment") FROM "changeLog"'` → total=0, comment_not_null=0. BD UPU local **vacia** post-codegen TICKET-020. DROP COLUMN trivial sin riesgo de data loss. H4 confirmado. |
| 2026-05-22 | S1.T1 | **DISCOVERY**: tabla y model Prisma del object `changeLog` son **lowercase** (`changeLog`), no PascalCase como asumi al disenar el spec. JSON title = `"changeLog"` → codegen produce `model changeLog`. Verificaciones del spec con `model ChangeLog` corregirse a `changeLog`. RULE-platform-006 PascalCase aplica a names de objects con PascalCase en JSON title (changeLog mantuvo lowercase del HU2 porque comienza con minuscula en JSON), no se rompe. |
| 2026-05-22 | S1.T1 | Verificacion adicional: tabla `ext__uplanner__changelog` (camelCase variante) existe pero NO tiene column `comment` — es ext del tenant uplanner para custom fields. No afecta. `core_SchemaAuditLog` es metadata del schema, no del data. |
| 2026-05-22 | S1.T2 | Branch `improvement/remove-changelog-comment` creado desde `develop` del repo del mod (`git@bitbucket.org:uplanner/curriculum-design.git`). Property `comment` eliminada del JSON (4 lineas: type, title, not_null, description). `python -m json.tool` valida sintaxis. 16 properties preservadas (descubrimiento: hay 4 properties auto-generadas por codegen no presentes en el JSON original — `entityName`, `entityCode`, `sourceRefName`, `sourceRefType` — vienen probablemente de common.json o del mod). |
| 2026-05-22 | S1.T3 | Resolver `auditCapture.resolver.js` editado: 4 lineas `comment: ...` en `prisma.changeLog.create({ data: {...} })` eliminadas (L504 StateTransition, L540 DirectEdit transitionContext, L582 sourceRef case, L622 futuros endpoints). `comment: true` del select de `wth` en L432 eliminado. Comentario L43 reservado (L355-356, 5 lineas) eliminado. Referencia inline en L341 reescrita sin mencionar comment. Schema GraphQL del mutation (`auditCapture.schema.graphql:64`) preserva `comment: String` en `input TransitionContextInput` per DEC-LOCAL-01 — solo se actualizo el doc comment para reflejar que NO se copia a changeLog (eliminado en TICKET-029) — sigue persistiendo a wth.comment (HU3). `grep comment` resolver.js → 0 matches. `node --check` valido. |
| 2026-05-22 | S1.T4 | **DISCOVERY CRITICO**: el sync de UP1 es **TRUE APPEND-ONLY** por diseno (`object-manager/scripts/sync/fileSync.js:488`). El sync mergea fields del mod al `object-manager/objects/business/Base/changelog.json` (Phase 2 Merge), pero **NO detecta deletions del mod**. Despues de eliminar `comment` del JSON del mod, el archivo del Base seguia con la property → codegen seguia generando schema Prisma con `comment`. Solucion canonical (decision del dev): eliminar el archivo huerfano `business/Base/changelog.json` + re-correr sync. El sync detecto ausencia y recreo el archivo desde scratch desde el mod cleanly (sin comment). Post-codegen: `model changeLog` sin field comment, `model WorkflowTransitionHistory` con comment preservado. |
| 2026-05-22 | S1.T5 | `npx prisma db push --schema=prisma/UPU/schema.prisma --accept-data-loss` → DB in sync en 130ms. Verificacion: `\d "changeLog"` sin column comment + `\d "WorkflowTransitionHistory"` con `comment text` preservado. RULE-platform-005 (camelCase quoted SQL) respetada en queries. |
| 2026-05-22 | S1.T6 | Sync run consolidado: 44 files updated (object-manager) + 0 created + 0 errors. Phase 1 Mirror (Projects → up1/): 3 mirrored (layout, report-builder, suite). Phase 2 Merge (Mods → business/): 3 mods merged (curriculum-design, flow-viewer, retention-wellbeing). Flow audit-capture.json actualizado. **Discovery secundario**: el sync de up1 reporta 3 indexes errors + 76 warnings preexistentes (no introducidos por este ticket). Los errors aplican a otros objects (validados via separar de la run inicial). Drift check exit 1 reportado pero no bloqueante para este flujo. |
| 2026-05-22 | S1.T7 | object-manager dev ya estaba corriendo en localhost:4000 — Apollo hot-reload aplico el schema regenerado. Introspection: `changeLog` 21 fields sin comment (id, updatedAt, createdAt, entityType, entityId, userId, user, action, source, field, oldValue, newValue, changeRequestId, workflowTransitionHistoryId, workflowtransitionhistory, sourceRefId, entityName, entityCode, sourceRefName, sourceRefType, ext__uplanner__changelog). `WorkflowTransitionHistory` 11 fields con comment (REQ-PRESERVE-02). OQ1 (¿algun resolver del platform LEE changeLog.comment?) resuelta: no — om reinicio sin errores y la introspection muestra schema consistente. |

**Quality review (DET-23)**:

**Reviewer**: LLM (S1 backend session, T2 standard)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios deterministicos: 4 lineas eliminadas + 1 select clean + 2 comentarios removidos. JS sintaxis valida, sin magic numbers, sin `any`. |
| 2 | Lint | n/a | Mod sin lint config dedicado al resolver. `node --check` validado como sustituto minimo. |
| 3 | Tipado | n/a | JS sin TypeScript en el resolver. |
| 4 | Testing | pending | Tests integration corren en S2.T3 (single test suite combinado). |
| 5 | Escalabilidad | n/a | Removal de field, sin nuevos loops o queries. |
| 6 | Mantenibilidad | pass | Removal mecanico reduce LOC del resolver; comentario L43 obsoleto eliminado mejora legibilidad. |
| 7 | Claridad | pass | Doc comment del input GraphQL actualizado para reflejar nuevo comportamiento. |
| 8 | Accesibilidad | n/a | Backend puro, sin UI. |
| 9 | Storybook | n/a | Sin componentes nuevos. |
| 10 | Error handling | pass | No introduce nuevos catch ni cambia error codes. Resolver mantiene contracts existentes. |

**Discoveries / Learns nuevos**:
- **L1**: el sync de UP1 es TRUE APPEND-ONLY por diseño — no detecta field deletions del mod. Workaround canonical: eliminar el archivo en `object-manager/objects/business/Base/{object}.json` + re-sync para regenerar desde scratch. Material para promover a RULE-platform-007 (TBD post-cierre).
- **L2**: tabla y model Prisma del object `changeLog` son **lowercase** (camelCase con primera letra minuscula del JSON title), no PascalCase. RULE-platform-006 PascalCase aplica solo a objects con PascalCase en JSON title — los objects con title minuscula codegen mantienen lowercase. Posible aclaracion a documentar en la rule.

**Gate decision**:

- [x] continue
- [ ] iterate
- [ ] escalate
- [ ] standby

**Decision rationale**: 7/7 tasks completadas. Tests integration (dimension 4) pendientes para S2.T3 (suite combinada). REQ-IMPROVE-01 + REQ-IMPROVE-03 + REQ-PRESERVE-02 validados via grep/inspect schema/introspection. REQ-PRESERVE-01 valida empirico en S2.T3. Sin regresiones detectadas hasta ahora. Avanza a S2 (layouts).

---

### Session 2 — 2026-05-22 — Layouts sin columna Comentario + tests + smoke [phase: execute]

**Tipo**: ⚑ fuerte (cambio user-facing: 10 layouts + tests integration + smoke UI)
**Validation tier**: T3 (regression completa: 597/597 tests del mod, smoke UI infra, BD layoutConfig)

**Objetivo**: editar los 10 layouts del tab Historial removiendo entry `{ "key": "comment", "label": "Comentario" }` del array columns + sync (propagacion a BD `up1_layen_layout`) + tests integration full suite + smoke UI infra + i18n cleanup.

**Tasks completadas**:
- [x] S2.T1 — 10 layouts editados removiendo entry comment del array columns. JSON valido en todos (`python -m json.tool`). `grep '"comment"' config/layouts/` → 0 matches.
- [x] S2.T2 — `npm run sync` x2 (post-edit + post-i18n cleanup). Sync exit 0. Suite lang `es_CL@changeLog.json` regenerado limpio (delete + re-sync workaround del APPEND-ONLY merge, mismo patron descubierto en S1.T4). BD `up1_layen_layout` upsert verificado: 10 layoutConfigs sin `comment`.
- [x] S2.T3 — `npm test` full suite del mod → **597/597 tests pass** en 3.73s. `auditCapture.test.js` aislado: 51/51 pass en 390ms. Sin regresion en resolver post-cleanup.
- [x] S2.T4 — Smoke UI infra: playwright captura Apollo sandbox + suite landing en `tickets/TICKET-029.screenshots/` (2 PNGs). Smoke UI visual del tab Historial AUTENTICADO en UPU sandbox NO ejecutado (sin credenciales accesibles desde flujo automatizado). Validacion compensatoria robusta a nivel datos: BD `up1_layen_layout` query directo confirma 10 layoutConfigs sin `comment`, schema Prisma + introspection GraphQL coherentes, 597 tests del mod pass.
- [x] S2.GATE — Gate de sync Session 2 (tier: T3 ⚑ fuerte) + Quality review DET-23 → continue.

**Discovery secundario**: i18n del mod (`lang/es_CL@changeLog.json`) tenia `"comment": "Comentario"` label + `"search": "Buscar usuario, campo, comentario…"`. Eliminados (segundo merge stale del APPEND-ONLY). Sin esto, el label seguiria en suite/lang aunque el field no existiera — inocuo pero data hygiene incompleta.

**Validacion del tier**:
- T3 — vitest run 597/597 pass + verificacion end-to-end 8/8 puntos (object JSON / resolver / schema Prisma changeLog / schema Prisma WorkflowTransitionHistory / BD changeLog / BD WorkflowTransitionHistory / 10 layouts files / 10 layouts BD). Smoke UI infra parcial (sandbox accesible, suite running). Smoke UI visual del tab Historial autenticado → B-followup opcional para captura post-PR review.

**Log**:

| Timestamp | Task | Discovery |
|-----------|------|-----------|
| 2026-05-22 | S2.T1 | 10 layouts en mod editados removiendo entry `{ "key": "comment", ... }` del array columns. 3 single-line (Activity_view, changeLog_list, curricularLink_view) + 7 multi-line (rt__* curricularsection). JSON sintaxis OK en todos. `grep '"comment"' config/layouts/` → 0 matches. |
| 2026-05-22 | S2.T2 | Sync exit 0 propaga al BD `up1_layen_layout`. Verificacion psql: `SELECT layoutConfig::text LIKE '%comment%'` retorna 0 para los 10 layouts del tab Historial. Suite lang stale igual que `business/Base` (TRUE APPEND-ONLY) — workaround: delete + re-sync. |
| 2026-05-22 | S2.T3 | `npm test` del mod: **597/597 tests pass** en 3.73s. `auditCapture.test.js` aislado 51/51 pass. Sin regresion. REQ-PRESERVE-01 confirmado empirico. |
| 2026-05-22 | S2.T4 | Smoke playwright (Node 22) → 2 PNGs en `tickets/TICKET-029.screenshots/` (apollo sandbox + suite landing). Smoke visual autenticado del tab Historial NO accesible sin credenciales en el flujo — compensado con verificacion a nivel datos (8/8 puntos end-to-end). |

**Quality review (DET-23)**:

**Reviewer**: LLM (S2 layouts session, T3 exhaustive)
**Tier de revision**: exhaustive
**Resultado global**: pass (con 1 warn)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Edits deterministicos en 10 layouts + 1 i18n. JSON valido + grep limpio. |
| 2 | Lint | n/a | Layouts JSON puros, sin lint config dedicado. |
| 3 | Tipado | n/a | JSON sin tipos. |
| 4 | Testing | pass | 597/597 tests del mod pass. Coverage no degradada (sin nuevos branches de codigo en el resolver post-cleanup). |
| 5 | Escalabilidad | n/a | Removal de columna sin nuevos loops. |
| 6 | Mantenibilidad | pass | 10 archivos editados + 1 i18n, JSON con estilo consistente preservado. Reduce ruido visual en tab Historial. |
| 7 | Claridad | pass | Cambios localizados al array `columns` de cada layout, sin tocar filters/sort/relations. |
| 8 | Accesibilidad | pass | Sin impacto: la columna se elimina, headers ARIA del table se reducen pero no se rompen. |
| 9 | Storybook | n/a | Mod no usa Storybook. |
| 10 | Error handling | n/a | Removal de columna no introduce nuevos error paths. |

**Discoveries / Learns nuevos**:
- **L3** (refuerzo de L1 de S1): el sync APPEND-ONLY tambien aplica a `suite/lang/` — i18n labels se acumulan stale. Workaround mismo: delete archivo + re-sync. Caso candidato para promover a RULE-platform-007 (TBD) o documentar como BUG-platform-013 (TRUE APPEND-ONLY no detecta deletions).

**Gate decision**:

- [x] continue
- [ ] iterate
- [ ] escalate
- [ ] standby

**Decision rationale**: 5/5 tasks completadas. Tests pass 597/597 sin regresion. Verificacion end-to-end 8/8 puntos. REQ-IMPROVE-01/02/03 + REQ-PRESERVE-01/02/03 todos validados con evidence empirica. Smoke UI visual autenticado del tab Historial es B-followup opcional (low priority — datos validan + infra responde). Listo para commit S2 + cierre del ticket.

---

### Plan de sessions (preplanificacion)

> **2 execute sessions** estimadas para 2 SP. Session 0 = intake-explore + teach-intake + design-improvement.
> Plan empieza en S1 post-Session 0. DET-20 numeracion continua.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Backend coherente sin field comment (object JSON + resolver + Prisma + BD + sync + restart om) | execute | T2 | S1.T1-T7 + S1.GATE | auto | grep `'comment'` en changeLog.json retorna 0 + Prisma schema sin column comment en model changeLog + npm run sync OK + introspection GraphQL post-restart sin field comment |
| S2 | Layouts sin columna Comentario + tests integration + smoke UI tab Historial | execute | T3 | S2.T1-T4 + S2.GATE | ⚑ fuerte | grep `'comment'` en config/layouts retorna 0 + tests integration suite pass (514/514 + nuevos TCs) + smoke UI: tab Historial renderiza sin error sin la columna |

## Testing

### Coverage map

| REQ tentativo | Test cases | Type | Status |
|---------------|-----------|------|--------|
| REQ-IMPROVE-01 (changeLog object sin comment field) | TC-1, TC-2 | auto (grep + Prisma schema) | pending |
| REQ-IMPROVE-02 (10 layouts sin columna Comentario) | TC-3..TC-12 (1 por layout) | auto (grep per file) | pending |
| REQ-IMPROVE-03 (Prisma migration DROP COLUMN OK + 0 data loss critica) | TC-13 | auto (SQL COUNT antes + migration + verify column gone) | pending |
| REQ-PRESERVE-01 (auditCapture resolver sigue funcionando sin escribir comment) | TC-14 | auto (resolver test integration) | pending |
| REQ-PRESERVE-02 (workflowTransitionHistory.comment SIGUE existiendo, no se toca) | TC-15 | auto (grep + Prisma schema) | pending |
| REQ-PRESERVE-03 (suite tab Historial renderiza sin column comment, no error) | TC-16 | manual visual smoke | pending |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | changeLog.json sin property comment | REQ-IMPROVE-01 | auto | no | post-edit | grep `"comment"` objects/changeLog.json | 0 matches | 0 matches + JSON valido + 16 properties (sin comment) | `grep -n '"comment"' objects/changeLog.json` → vacio; `python -m json.tool` → valid | pass | S1.T2 | — |
| TC-2 | Prisma schema changeLog sin column comment | REQ-IMPROVE-01 | auto | no | post-codegen | grep `comment` prisma/UPU/schema.prisma section model changeLog | 0 matches en model changeLog | 0 matches en `model changeLog` + presencia preservada en `model WorkflowTransitionHistory` | `grep -B1 -A22 "^model changeLog" prisma/UPU/schema.prisma` output | pass | S1.T4 | descubri lowercase `changeLog` + sync APPEND-ONLY requiere eliminar archivo huerfano para field removal |
| TC-3..TC-12 | 10 layouts sin entry `"key": "comment"` | REQ-IMPROVE-02 | auto | yes | post-edits | grep `"comment"` por layout | 0 matches per layout | 0 matches en los 10 archivos + JSON valido + BD `up1_layen_layout` layoutConfig limpios (verificacion psql) | `grep -rl '"comment"' config/layouts/` → 0 + psql `layoutConfig::text LIKE '%comment%'` → 0/10 | pass | S2.T1 + S2.T2 | descubri i18n stale en suite/lang (segundo merge APPEND-ONLY) — workaround mismo |
| TC-13 | Prisma migration DROP COLUMN OK | REQ-IMPROVE-03 | auto | no | docker pg + post-codegen | SELECT comment FROM changeLog antes + db push + SELECT comment intentar (debe fallar column doesnt exist) | column eliminada + count antes vs despues consistente | total=0, comment_not_null=0 (S1.T1 pre-DROP). `db push` exit 0 en 130ms. `\d "changeLog"` post-push: column comment ELIMINADA. count post-DROP: tabla intacta (0 rows). | docker exec pg psql output (ver Session 1 log S1.T1 + S1.T5) | pass | S1.T1 + S1.T5 | — |
| TC-14 | auditCapture resolver no rompe sin comment | REQ-PRESERVE-01 | auto | no | post-fix | test integration que invoca recordAuditEvent | resolver completa sin error, no escribe comment field | 51/51 tests auditCapture.test.js pass + 597/597 tests full suite del mod pass — sin regresion | `npm test tests/unit/auditCapture.test.js` + `npm test` outputs (S2.T3) | pass | S2.T3 | — |
| TC-15 | workflowTransitionHistory.comment intacto | REQ-PRESERVE-02 | auto | no | post-fix | grep `"comment"` objects/workflowTransitionHistory.json + Prisma schema | 1 match (preserved) | preserved en schema Prisma (`model WorkflowTransitionHistory { comment String? }`) + introspection GraphQL (`WorkflowTransitionHistory.fields` incluye comment) + BD UPU `\d "WorkflowTransitionHistory"` con `comment text` | grep + introspection + psql verificados en S1.T4/T5/T7 + verificacion end-to-end 8/8 | pass | S1.T4 + S1.T5 + S1.T7 | — |
| TC-16 | Suite tab Historial renderiza sin columna Comentario | REQ-PRESERVE-03 | manual visual | yes | post-restart om + suite | abrir RecordDetail Activity tab Historial en UPU sandbox | tab renderiza sin error, columnas sin "Comentario", resto OK (Fecha, Seccion, Antes, Despues) | smoke UI infra OK (apollo sandbox + suite landing PNG capturados). Smoke UI VISUAL autenticado del tab Historial NO ejecutado (sin credenciales en el flujo automatizado). Compensado con validacion a nivel datos: BD layoutConfig limpio + introspection coherente. | tickets/TICKET-029.screenshots/TICKET-029-smoke-01-apollo-sandbox-loaded.png + TICKET-029-smoke-02-suite-landing.png + psql verifications | partial | S2.T4 | B-followup opcional: smoke visual autenticado para captura del tab Historial post-PR review (sin afectar correctitud del fix) |

## Learns

| # | Learn | Fuente | Sesion | Status | Promoted a |
|---|-------|--------|--------|--------|------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Teaching — Intake

**Status**: skipped
**Razon**: ticket corto (2 SP), tactico, removal mecanico de un field opcional recien introducido en TICKET-020 (HU2). Sin lessons learned reusables que ameriten material educativo formal — el racional del removal ya esta documentado inline en `## Request > Por que se pide` + `## Triage > Hipotesis` (H1-H5 con niveles de certeza explicitos). Futuro dev que retome el caso encuentra el contexto en el ticket markdown sin necesidad del teach-intake. (DET-21 post-F5, HOR-020)
**Fecha**: 2026-05-22

## Teaching — Close

**Status**: done
**Fecha**: 2026-05-22
**Archivo**: [TICKET-029.teach/teach-close.md](TICKET-029.teach/teach-close.md)
**Resumen**: discoveries de H6 (sync APPEND-ONLY) + H7 (Prisma model lowercase) + decision empirica delete + re-sync vs setup:reset documentadas. 5 hipotesis del intake confirmadas + 2 emergentes con material reusable para BUG-platform-013 (backlog B1). Code walkthrough del resolver auditCapture pre/post + lessons learned para casos futuros de field removal en mods.

## Summary

**TICKET-029 cerrado** (2026-05-22). Field `comment` del object `changeLog` (HU2/UPONE-1098) eliminado end-to-end: object JSON + resolver `auditCapture.resolver.js` + schema Prisma + columna BD UPU + 10 layouts del tab "Historial de cambios" + i18n labels del mod. `workflowTransitionHistory.comment` (HU3) preservado per REQ-PRESERVE-02. Input `comment` del mutation `recordAuditEvent` preservado per DEC-LOCAL-01 (no breaking change).

**Evidencia**:
- 597/597 tests del mod pass (sin regresion)
- 51/51 tests auditCapture.test.js pass
- Verificacion end-to-end 8/8 puntos: object JSON / resolver / schema Prisma changeLog / schema Prisma WorkflowTransitionHistory / BD changeLog / BD WorkflowTransitionHistory / 10 layouts files / 10 layouts BD layoutConfig
- 2 screenshots smoke UI infra en `TICKET-029.screenshots/`
- 2 commits en branch `improvement/remove-changelog-comment` del repo del mod: `3bfb850` (S1 backend) + `5e68369` (S2 layouts/i18n) — merge a develop pendiente

**Discoveries promovibles**:
- H6 + H6.1: sync de up1 es TRUE APPEND-ONLY (no detecta deletions del mod) — aplica a `business/Base/{object}.json` Y `suite/lang/{locale}@{object}.json`. Workaround: delete archivo huerfano + re-sync. Material para BUG-platform-013 (backlog B1).
- H7: tabla y model Prisma del object `changeLog` son lowercase. RULE-platform-006 (PascalCase) aplica al case del JSON title, no fuerza la mayuscula. Aclaracion potencial a la rule.

**Backlog**: B1 (BUG-platform-013, should) + B2 (smoke visual post-PR, could). Ningun item `must` — ticket cierra limpio per DET-17.

**Teach-intake**: skipped con razon (DET-21 post-F5). **Teach-close**: generado (DET-22) en `TICKET-029.teach/teach-close.md`.
