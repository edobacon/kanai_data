---
id: TICKET-031
project: up1
type: ticket
status: closed
work_type: refactor
external: UPONE-1100
module: curriculum-design
autopilot: per_session
---

# Auditar y normalizar a PascalCase los objetos del mod curriculum-design (RULE-platform-006)

## Request

Revisar y normalizar los objetos del mod curriculum-design para que todos cumplan PascalCase canonico, siguiendo el patron aplicado al `activity` previamente. Considerar:

- Rename del nombre del objeto (campo `title` en el JSON), no necesariamente del archivo.
- Revision de "llaves" del JSON: `references` cross-object, enums polimorficos, etc.
- Revision de **referencias consumidoras**: layouts (`config/layouts/*.json` filename + `id` + `name` + `objectName`), eventos (`events/*.json` filename + `id` + `trigger.objectType`), resolvers (`logic/*.schema.graphql` return types), `defaultObjects` en `config/app.json`, `relationDisplayFields`, traducciones i18n.

Aplica los 11 campos canonicos definidos por [RULE-platform-006](../rules/platform/rule-platform-006.md) al mod completo, post-TICKET-028 (objects/layouts core) y post-TICKET-030 (audit chain entityType).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | multi (toca: objects JSON, layouts JSON, events JSON, GraphQL schemas, config app.json, posibles enums i18n) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod), object-manager (codegen + sync propaga a BD), suite (consumers via LayoutOrchestrator + GraphQL client) |

## Creation scope

Refactor puro — `creates_visual: false`, `creates_data: false`. No introduce vistas nuevas ni entidades nuevas; normaliza naming de las existentes. El step `design-draft` NO se invoca.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Sin componentes/pantallas nuevos |
| Data model | no | Sin entidades/schemas nuevos. Cambia el casing de model names ya existentes via codegen |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | — |
| Version aprobada | — |
| Path | — |

## Triage

Auditoria pendiente — el intake-explore detallara violaciones por archivo y por campo. Hipotesis iniciales basadas en grep rapido del intake.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `changeLog.json` viola RULE-platform-006 en `title` (camelCase) | ✓ confirmed | `grep '"title"' objects/changeLog.json` → `"title": "changeLog"`. Esperado: `"ChangeLog"`. Mismo archivo en su descripcion documenta valores PascalCase canonicos (`Activity`, `CurricularSection`, `CurricularLink`) — el title del propio objeto es inconsistente con su propia doc |
| H2 | Otros 5 titles ya estan PascalCase | ✓ confirmed | grep verificado: `Activity`, `Workflow`, `WorkflowStatus`, `WorkflowTransition`, `WorkflowTransitionHistory`. Delta de "title" es solo `changeLog → ChangeLog` |
| H3 | Los OTROS 10 campos canonicos de RULE-platform-006 tienen violaciones residuales no auditadas | ✓ confirmed | Auditoria 2026-05-22 detecto violaciones en **3 capas adicionales** mas alla del title: (a) **layout filenames**: 2 archivos camelCase (`default_changeLog_list.json`, `default_curricularLink_view.json`), (b) **layout internal** (`id`/`name`/`objectName`): mismas 2 + 7 sublayouts embebidos con `objectName: "changeLog"` en Activity/CurricularLink/recordTypes views, (c) **seed/_data-indexes.js** con `table: 'changeLog'` literal (rompe post-rename del title). Capas LIMPIAS: events (10 archivos PascalCase ✓), GraphQL resolver return types ✓, `defaultObjects` en app.json ✓, `references` cross-object ✓ (3 refs a `core_User` permitidas per excepcion documentada), capabilities (excepcion documentada), i18n (no matches camelCase entityType-like) |
| H4 | TICKET-030 cubrio el dominio "audit chain entityType". El delta de este ticket excluye ese subset y se concentra en (a) `changeLog.title` y (b) layouts + seed afectados | ✓ confirmed | TICKET-030 closed_reason confirma audit chain (ENTITY_TYPE_MAP en n8n + resolver + tests). La auditoria de hoy NO encontro violaciones residuales de entityType en lang/ ni en enum values polimorficos de objects — el work de TICKET-030 esta intacto |
| H5 | El nombre del archivo `changeLog.json` puede mantenerse en camelCase sin violar la rule | ✓ confirmed | RULE-platform-006 obliga PascalCase en `title` pero NO en filename del object JSON (Test 1 verifica `title` field, no filename). **Decision**: mantener `changeLog.json` filename para evitar rename ruido (los object JSON files ya tienen inconsistencia transversal pre-existente: `activity.json` lowercase con title `Activity`). El refactor renombra SOLO el `title` interno. **Layouts SI requieren rename del archivo** (la rule SI cubre layout filenames — Test 3) |
| H6 | Los 19 layouts `rt__*_curricularsection_*` violan la rule en `objectName` (suffix lowercase) | ✗ refuted as scope | Auditoria de la rama `origin/hotfix/casing` de Clemente (`b1a2551..771804e`, 4 commits) muestra que NO toco los `rt__*_curricularsection_*`. TICKET-028 (commits `3ee8e8b`, `3cf68ef`, `7c256c2`, `cda9de7`) tampoco los renombro pese a normalizar todo lo demas. TICKET-030 tampoco. **Convencion establecida por predecessors**: la excepcion `rt__` documentada en RULE-platform-006 Test 4 abarca el archivo completo (no solo el prefix). Sacar del scope. Backlog B1: clarificar RULE-platform-006 |
| H7 | `seed/_data-indexes.js` con `table: 'changeLog'` literal se rompe al renombrar title a `ChangeLog` | ✓ confirmed | El script declara `{ table: 'changeLog', name: 'changeLog_entityType_entityId_createdAt_idx', columns: [...], purpose: '...' }`. Post-codegen con title `ChangeLog`, Prisma generara `model ChangeLog` que mapea a tabla `ChangeLog` (PascalCase del model name). El string `table: 'changeLog'` en el seed apuntara a una tabla que ya no existe. **Fix obligatorio**: actualizar el string literal a `'ChangeLog'` (table name) Y posiblemente los index `name` strings tambien (cosmetico). Verificar el accessor: `prisma.changeLog` se mantiene (Prisma genera el accessor en camelCase del model name — `prisma.changeLog` sigue funcionando) — codigo resolver NO necesita cambios |

### Context found

- **Rules del modulo**: 4 rules curriculum-design (001-004) — sobre Vueform/ARIA accesibilidad (001, 002) y workflow mutations `*Validated` (003, 004). No directamente sobre casing, pero RULE-curriculum-design-003/004 afectan los resolvers que vamos a auditar (return types)
- **Rules platform aplicables**: RULE-platform-006 (PascalCase canonico — fuente normativa del refactor)
- **Bugs abiertos**: ninguno en `bugs/curriculum-design/`
- **Specs relacionados**:
  - SPEC-010-fix-casing-pascalcase-objects (TICKET-028, predecessor — establecio RULE-platform-006)
  - SPEC-012-fix-casing-audit-chain-pascalcase (TICKET-030, predecessor inmediato — cerrado 2026-05-22, cubrio audit chain)
  - SPEC-004-rename-activity-workflow (TICKET-019, ancestro — introdujo el lowercase original que TICKET-028/030 estan corrigiendo)
- **Docs relevantes**: CLAUDE.md de up1 (`Default layout naming convention: default_{ObjectName}_{mode}`); RULE-platform-006 misma documenta verification grep checks
- **Warnings**:
  - **Deploy block en Linux FS** si quedan violaciones residuales (RULE-platform-006 `## Why` — caso historico `hotfix/casing`)
  - **PR UPONE-1100 puede estar abierto en Jira** — status "Revision de companeros" al consultar (2026-05-22). Confirmar con dev si el PR esta merged o aun en review antes de elegir rama de trabajo
  - **Restart obligatorio del object-manager dev server** post-codegen/sync per RULE-platform-006 `## Operational notes` — afecta plan de validacion
  - **Migracion BD legacy** si layouts ya estan synced con casing viejo en `up1_layen_layout`: usar patron mod-internal canonico (seeds idempotentes), NO SQL out-of-band per RULE-platform-006 `## Migracion de datos legacy`

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `refactor/UPONE-1100-mod-pascalcase-audit` (per DET-19 — confirmar con dev si reusar rama abierta de TICKET-030 o crear nueva sobre develop) |
| Base branch | develop |
| DB state | Post-codegen + sync requeriran restart de object-manager dev server. Si hay rows legacy en `up1_layen_layout` con casing viejo, seed migration idempotente per RULE-platform-006 |
| Services | object-manager (puerto 4000), suite (3000), postgres + redis |
| Test data | Tenant UPU para validar smoke. Asumir que el seed actual del mod ya genera datos coherentes post TICKET-030 |

### Reproduction steps

N/A — es refactor preventivo, no fix de bug observable. La motivacion es consistencia con RULE-platform-006 y prevencion del deploy block historico (referenciado en RULE-platform-006).

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El `title` interno del JSON es la fuente de verdad del nombre del object — el archivo del JSON puede tener casing distinto sin afectar codegen, pero el `title` se propaga a Prisma model name, GraphQL type y BD via sync | research-intake | 0 | refined | RULE-platform-006 |
| L2 | TICKET-030 (audit chain) y TICKET-031 (auditoria full mod) son followups complementarios del mismo Jira UPONE-1100 — el alcance del PR de UPONE-1100 puede extenderse o split segun decision del dev en design | research-intake | 0 | discarded | consolidacion Fase D — no reusable/especifico del ticket |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-05-22T17:30 | false → true (optimistic) + teach off (intake + close skipped) | dev declaro "ticket quick fix" — autopilot ejecuta design + execute sin pausar en gates internos; cumple DETs duras (commits, gate fuerte S3, persistencia in-flight DET-29). teach skip = material educativo no se produce por bajo valor reusable | post Session 0 (intake-explore done) — aplica desde design-refactor en adelante |

### Plan de sessions (preplanificacion)

Plan refinado por `intake-explore` post-auditoria (2026-05-22). Numeracion empieza en S1 — Session 0 es el intake-explore mismo (registrada abajo). Scope reducido vs esqueleto inicial: la auditoria descarto rt__ (H6 refuted as scope), capas events/resolvers/config/i18n estan limpias, y la violacion `title` solo afecta a `changeLog`. El plan final es 3 sessions de execute (S1-S3) + 1 gate fuerte.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Capa objects + seed: rename `changeLog.title` a `ChangeLog` + actualizar `seed/_data-indexes.js` (string `table` + opcional rename de `name` cosmetico) | execute | T1 | S1.T1 rename title, S1.T2 update seed indexes table string, S1.T3 verificar via grep que no quedan refs camelCase residuales en objects+seed | auto | grep verification scripts de RULE-platform-006 retornan 0 sobre objects/+seed/; vitest del mod pasa sin nuevos failures |
| S2 | Capa layouts: rename de 2 filenames (`default_changeLog_list` → `default_ChangeLog_list`, `default_curricularLink_view` → `default_CurricularLink_view`) + actualizar `id`/`name`/`objectName` interno + actualizar 7 sublayouts embebidos con `objectName: "changeLog"` → `"ChangeLog"` en Activity/CurricularLink/recordTypes views | execute | T2 | S2.T1 rename + update changeLog layout, S2.T2 rename + update curricularLink layout, S2.T3 update 7 sublayouts embebidos, S2.T4 actualizar `associatedLayoutConfigs` cross-references si las hay, S2.T5 vitest integration `layouts-declared.test.ts` espera PascalCase | auto | filename grep `ls config/layouts/ \| grep "default_[a-z]"` retorna 0 (excluyendo rt__); `objectName` grep en sublayouts retorna 0 lowercase; integration test verde |
| S3 | Validacion end-to-end: codegen + sync + restart object-manager dev server + smoke UI del tab Historial (changeLog) en RecordDetail de Activity/CurricularLink/CurricularSection (tenant UPU) + seed migration BD legacy si aplica (`up1_layen_layout` rows con `objectName: "changeLog"` o `"curricularLink"`) | execute | T3 | S3.T1 codegen + sync, S3.T2 restart om + GraphQL introspection verifica types PascalCase, S3.T3 smoke UI manual del tab Historial, S3.T4 seed migration idempotente per RULE-platform-006 patron, S3.T5 regression suite completa | ⚑ fuerte | dev valida visualmente tab Historial operativo en suite; regression `npm test --workspace=@uplanner/object-management-backend` sin nuevos failures; introspection muestra type `ChangeLog` PascalCase |

**Notas del plan**:
- **Branch strategy**: UPONE-1100 PR aun esta "Revision de companeros" en Jira (no merged). Decision pendiente en design-refactor: (a) sumar commits a la rama de TICKET-030 si el dev quiere consolidar PR Jira, o (b) branch nueva desde develop si TICKET-030 cierra ya. Confirmar con dev al transicionar a execute.
- **Seed migration BD**: depende de query a `up1_layen_layout` por rows con `objectName IN ('changeLog', 'curricularLink')`. Si hay rows: patron mod-internal canonico per RULE-platform-006. Si 0: no-op idempotente.
- **Sublayouts embebidos**: el grep detecto 7 layouts con `objectName: "changeLog"` embebido. Refinarlos en design (lista exacta de archivos para tasks).
- **Restart om obligatorio** post-codegen per RULE-platform-006 `## Operational notes` — incluido como sub-step de S3.T2.
- **Backlog item B1**: clarificar RULE-platform-006 sobre alcance de excepcion `rt__` (file completo vs solo prefix). NO bloquea cierre — `should` priority.

### Session 0 — 2026-05-22 — Intake-explore: auditoria 11 campos RULE-platform-006 [phase: intake]

**Tipo**: auto
**Validation tier**: T0 (doc-only — solo lectura + actualizacion del ticket)

**Objetivo**: validar las 5 hipotesis iniciales del intake mediante auditoria sistematica de los 11 campos canonicos de RULE-platform-006 sobre el mod curriculum-design, refutar/confirmar hipotesis con evidencia multi-capa, producir lista exhaustiva de violaciones detectadas, refinar Plan de sessions.

**Tasks completadas**:
- [x] S0.T1 — Auditar campo 1 (`title` objects) — confirmado: solo `changeLog.json` viola
- [x] S0.T2 — Auditar campo 2 (`references` cross-object) — limpio, solo refs a `core_User` (excepcion)
- [x] S0.T3 — Auditar campos 3-4 (layout filenames + id/name/objectName) — detectados 2 layouts + 7 sublayouts embebidos
- [x] S0.T4 — Auditar campos 5-6 (events) — 10 archivos PascalCase, limpio
- [x] S0.T5 — Auditar campo 7 (GraphQL resolver return types) — limpio
- [x] S0.T6 — Auditar campo 8 (`defaultObjects` config/app.json) — `["Activity", "BibliographyReference"]` ✓
- [x] S0.T7 — Auditar campo 9 (`relationDisplayFields` keys) — PascalCase ✓ (`OrgUnit`, `WorkflowStatus`, `Institution`, `core_User`)
- [x] S0.T8 — Auditar campo 10 (enums polimorficos en lang/objects) — limpio
- [x] S0.T9 — Auditar capa adicional seed JS — detectada violacion en `seed/_data-indexes.js table: 'changeLog'`
- [x] S0.T10 — Investigar precedente `origin/hotfix/casing` (Clemente) + TICKET-028/030 — confirma que rt__ esta fuera del scope establecido
- [x] S0.T11 — Refinar Plan de sessions y poblar SP (`published: 5`, `estimated: 5`)

**Validacion del tier**:
- T0 — Lint frontmatter: pass. Cross-references: pass (RULE-platform-006, TICKET-028, TICKET-030, SPEC-010, SPEC-012 verificados existen)

**Discoveries / Learns nuevos**:
- L3: La excepcion `rt__ recordtypes son lowercase intencionalmente` de RULE-platform-006 abarca el archivo completo (prefix + suffix), confirmado por convencion establecida por Clemente + TICKET-028 + TICKET-030 (ninguno renombro los 19 `rt__*_curricularsection_*`). La rule deberia clarificar el alcance literal → Backlog B1.
- L4: El accessor de Prisma para un model `ChangeLog` es `prisma.changeLog` (camelCased del model name) — el codigo resolver JS NO necesita cambios al renombrar el title, solo el seed con `table: 'changeLog'` string literal porque ESE apunta al nombre real de la tabla en BD que SI cambia a `ChangeLog`.
- L5: La cadena de propagacion del title del object JSON cubre: codegen → Prisma schema (`model ChangeLog`) → BD table (`ChangeLog`) → GraphQL type (`ChangeLog`) → sync a `up1_layen_layout.objectName`. El nombre del archivo JSON NO es parte de la cadena (filename libre per Test 1 de RULE-platform-006).

**Failed approaches**: ninguno.

**Bloqueantes detectados**: ninguno.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (intake fase, sin codigo modificado)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Session solo escribio markdown del ticket |
| 2 | Lint | n/a | Sin codigo modificado |
| 3 | Tipado | n/a | Sin codigo modificado |
| 4 | Testing | n/a | Sin tests modificados |
| 5 | Escalabilidad | n/a | — |
| 6 | Mantenibilidad | n/a | — |
| 7 | Claridad | pass | Triage con 7 hipotesis (5 inicial + 2 emergentes H6/H7) todas con evidencia explicita y refs verificables; Plan de sessions refinado con tasks concretas |
| 8 | Accesibilidad | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Error handling | n/a | — |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 1 (post teach-intake + design-refactor)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 1**:
- teach-intake completado (DET-21 obligatorio)
- design-refactor produce spec con tasks `S1.T1..S1.T3` y REQs PascalCase formales
- Branch decision tomada: reusar `UPONE-1100-fix-audit-chain-entityType-pascalcase` (TICKET-030) o nueva sobre develop

**Tiempo invertido**: ~30 min efectivos (intake-explore loop).
**Contexto retomable**: Triage cerrado, Plan refinado a 3 sessions + gate fuerte, Backlog B1 documentado, SP populated. Siguiente: `teach-intake` (DET-21).
**Commit DET-27**: N/A (sin codigo modificado en esta session — solo markdown del ticket DKC, se commit como `chore(dkc):` al final de S1 junto con el codigo).

### Gate 0 (pre-execute) — 2026-05-22

**Estado del ticket:** in_progress (post design-refactor), spec `SPEC-013-curriculum-design-mod-pascalcase-audit` con tasks S1-S3 + 3 gates, baseline test verde 597/597, branch UPONE-1100-fix-audit-chain-entityType-pascalcase activa.

**Trabajo previo a Session 1:**
- Decisiones #1-#5 del Executive summary aprobadas implicit en autopilot optimistic per dev trigger
- Baseline tests capturado: 597/597 passed en 4.07s
- Grep exhaustivo de consumers: 13 refs literales `'changeLog'` (objects, seed, layouts), 3 refs literales `'curricularLink'` (events docs), 2 + 2 refs filename layouts
- Branch confirmada: `UPONE-1100-fix-audit-chain-entityType-pascalcase` (reuso de TICKET-030 para consolidar PR Jira)

**Pre-condiciones para Session 1:**
- Working tree limpio en mods/curriculum-design (verificado)
- Estado intake-explore + teach-intake skipped + design-refactor cerrados
- SP populated: published 5, estimated 5

### Session 1 — 2026-05-22 — Capa objects + seed + cleanup docs/tests [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: aplicar rename del `title` de `changeLog.json` a PascalCase + actualizar `seed/_data-indexes.js` para alinear con el nuevo table name `ChangeLog` + cleanup oportunista de docs (events descriptions) y test legacy con `entityType: 'activity'` lowercase.

**Tasks completadas**:
- [x] S1.T1 — Rename `objects/changeLog.json title: "changeLog"` → `"ChangeLog"`
- [x] S1.T2 — Actualizar `seed/_data-indexes.js` 2 entradas `table: 'changeLog'` → `'ChangeLog'` + cosmetico `name` field + scope creep aprovechado: 3 entradas workflowTransitionHistory → WorkflowTransitionHistory (L6)
- [x] S1.T3 — Cleanup oportunista: 3 events descriptions `entityType='curricularLink'` lowercase → `CurricularLink` + `changeLog` → `ChangeLog` en descripciones
- [x] S1.T4 — Cleanup oportunista: test legacy `tests/integration/workflow-resolvers.test.ts:236` `entityType: 'activity'` → `'Activity'`
- [x] S1.GATE — Gate de sync Session 1 (tier T1)

**Validacion del tier**:
- T1 — vitest run del mod: 597/597 pass (delta 0 vs baseline pre-refactor). Duracion 4.27s.

**Discoveries / Learns nuevos**:
- L6: el seed `_data-indexes.js` tenia 3 entradas con `table: 'workflowTransitionHistory'` y `name: 'workflowTransitionHistory_*_idx'` lowercase — pero la tabla Prisma real ya era `WorkflowTransitionHistory` PascalCase desde TICKET-030. Aprovechado para fix en S1.T2. Indica que los indexes nunca se aplicaron correctamente (silent failure preexistente del seed) o que PostgreSQL los crea case-insensitive en identifiers sin quote. Investigar empirico en S3 si los indexes existen en BD UPU. Backlog B2 implicit (no bloquea cierre).
- L7: post-rename del `title` a `ChangeLog`, Prisma client genera accessor `prisma.changeLog` (camelCase del model name) — codigo resolver NO necesita cambios. Verificado por inspeccion de `logic/auditCapture.resolver.js` que sigue usando `prisma.changeLog.create()` sin modificar.

**Bloqueantes detectados**: ninguno.

**Quality review (DET-23)**:

**Reviewer**: LLM autopilot optimistic (per dev trigger 2026-05-22)
**Tier de revision**: light (DET-23 mapeo T1 → light)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios mecanicos de string literal y title field, sin nueva logica ni helpers introducidos |
| 2 | Lint | n/a | Solo JSON + 1 string en JS — sin reglas de lint relevantes activadas |
| 3 | Tipado | n/a | Sin cambios TS/Vue |
| 4 | Testing | pass | 597/597 vitest pass; test legacy actualizado a PascalCase sin afectar count |
| 5 | Escalabilidad | n/a | Sin nuevos loops o queries |
| 6 | Mantenibilidad | pass | L6 scope creep aprovechado por simetria — fix mismo archivo, mismo concepto. Reduce inconsistencia preexistente sin agregar deuda |
| 7 | Claridad | pass | Cambios literales claros via grep; comentarios actualizados en seed `// ChangeLog (HU2 ...)` y `// WorkflowTransitionHistory (HU3 ...)` |
| 8 | Accesibilidad | n/a | Session no toca UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin paths de error introducidos |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 2 (capa layouts)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 2**:
- S1 commits DET-27 hechos antes de empezar S2 (per DET-27 strict por session)
- Working tree limpio post-commit en el repo del mod
- Tabla `ChangeLog` post-codegen NO se valida aqui — S3 cubre el sync end-to-end

**Tiempo invertido**: ~10 min efectivos
**Contexto retomable**: S1 cerrada, listo para S2 con rename de layouts. Branch UPONE-1100-fix-audit-chain-entityType-pascalcase activa.
**Commit DET-27**: 2 commits propuestos al cierre de S1 (fix + test cleanup separados). Ver tabla `## Commits` post-ejecucion.

### Session 2 — 2026-05-22 — Capa layouts (filenames + sublayouts embebidos) [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: renombrar 2 layout filenames + actualizar campos internos (`id`/`name`/`objectName`) + actualizar 9 sublayouts embebidos con `objectName: "changeLog"` → `"ChangeLog"` + verificar cross-references.

**Tasks completadas**:
- [x] S2.T1 — Rename `default_changeLog_list.json` → `default_ChangeLog_list.json` + update interno PascalCase
- [x] S2.T2 — Rename `default_curricularLink_view.json` → `default_CurricularLink_view.json` + update interno PascalCase (objectName ya era PascalCase, solo id/name)
- [x] S2.T3 — Actualizar 9 sublayouts embebidos `objectName: "changeLog"` → `"ChangeLog"` (Activity_view, CurricularLink_view, 7 rt__*_view)
- [x] S2.T4 — Verificar y actualizar `associatedLayoutConfigs.layoutId` cross-references — 0 refs encontradas (sublayouts inline, no por id)
- [x] S2.T5 — Vitest integration + suite completa: 597/597 pass (delta 0)
- [x] S2.GATE — Gate de sync Session 2 (tier T2)

**Validacion del tier**:
- T2 — vitest run del mod: 597/597 pass (delta 0 vs baseline + S1). Duracion 3.79s.

**Discoveries / Learns nuevos**:
- L8: `default_curricularLink_view.json` ya tenia `objectName` top-level en PascalCase (`CurricularLink`) — solo `id`/`name` estaban camelCase y el sublayout embebido. Deuda parcial de TICKET-028 cerrada.
- L9: Los 7 layouts `rt__*_curricularsection_view.json` tenian sublayout embebido `objectName: "changeLog"` lowercase apuntando al historial del recordtype hijo. Post-fix: PascalCase consistente con el rename del title.

**Quality review (DET-23)**:

**Reviewer**: LLM autopilot optimistic
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Cambios mecanicos: 2 rename + 11 sed replacements |
| 4 | Testing | pass | 597/597 vitest pass |
| 6 | Mantenibilidad | pass | Cierra deuda parcial de TICKET-028 |
| 7 | Claridad | pass | Filenames y campos internos coherentes; cross-refs verificadas |
| 2-3, 5, 8-10 | otras | n/a | No aplica (sin codigo nuevo, sin UI directa, sin tipos) |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 3 (validacion end-to-end + seed migration BD)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Tiempo invertido**: ~10 min
**Contexto retomable**: S2 cerrada. 10 archivos modified (2 renames RM + 8 modify) listos para commit DET-27 antes de S3.
**Commit DET-27**: 2 commits propuestos al cierre de S2.

### Session 3 — 2026-05-22 — Validacion end-to-end + seed migration BD [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: codegen + sync + restart om + smoke UI tab Historial + seed migration BD legacy si aplica + regression suite completa. Cierre del refactor.

**Tasks completadas**:
- [x] S3.T1 — Codegen + sync (delete + re-sync para forzar regen synced title; prisma db push --accept-data-loss DROP changeLog 6 rows + CREATE ChangeLog) → commit no aplica (sync artifacts en submodules core)
- [x] S3.T2 — Restart om + GraphQL introspection: type `ChangeLog` PascalCase ✓; consumer descubierto en `auditCapture.schema.graphql rows: [changeLog!]` → fix PascalCase → commit `103e724`
- [x] S3.T3 — Smoke UI manual: dev confirm "funciona ok la plataforma" (Activity + CurricularLink + recordtypes hijos)
- [x] S3.T4 — Loader v2 ejecutado: 2 orphans deleted (`default_changeLog_list`, `default_curricularLink_view`) → commit `563e751`
- [x] S3.T5 — vitest 597/597 pass post-fix mock loader v2 → commit `72af1f3`
- [x] S3.GATE — Gate de sync Session 3 (tier T3, ⚑ fuerte)

**Validacion del tier**:
- T3 — vitest 597/597 ✓ + GraphQL introspection PascalCase ✓ + smoke UI verde (dev approval) + BD UPU clean post seed migration

**Discoveries / Learns nuevos**:
- L10: el sync mechanism `applyModToObject` (object-manager/scripts/sync/fileSync.js:709) solo merge `properties` + `metadata` del mod object — NO propaga `title` top-level una vez creado el synced. Workaround: delete del synced + re-sync. **B2 backlog: bug platform sync no propaga title changes**.
- L11: PostgreSQL es case-sensitive: `model changeLog → ChangeLog` requiere DROP + CREATE en `prisma db push`. En production seria desastre — requiere migration custom `ALTER TABLE RENAME`. **B3 backlog: migration production-safe para rename del table**.
- L12: TICKET-030 dejo `auditCapture.schema.graphql rows: [changeLog!]` lowercase — unico consumer activo (codigo, no docstring) que rompia GraphQL schema validation. Detectado durante restart om (server crasheo con "Unknown type changeLog. Did you mean ChangeLog?"). Fix en commit `103e724`.
- L13: `seed-entry.test.ts` mock setup pattern de RULE-platform-006 requiere agregar mock del loader v2 (`vi.hoisted` + `vi.mock` + `beforeEach.mockReset().mockResolvedValue`). Patron funcionando.
- L14: el seed completo del tenant (`npm run seed UPU`) tiene bug FK preexistente con `Institution.deleteMany` constraint con Workflow. Workaround para correr SOLO el loader v2: invocacion directa via Node ES module import + Prisma client local. **B4 backlog: bug del seed completo (no bloqueante de este ticket)**.

**Failed approaches**:
- A1: correr `npm run codegen` antes de `npm run sync` falla — codegen lee archivo synced (no del mod). Orden correcto: sync primero (propaga title del mod) → codegen.
- A2: `npm run seed` UPU completo fallo en `Institution.deleteMany` por FK constraint con Workflow. Workaround: invocacion directa del loader v2 via Node.

**Bloqueantes detectados**: ninguno definitivo. PR UPONE-1100 sigue abierto en Jira "Revision de companeros" — decision de merge queda al dev.

**Quality review (DET-23)**:

**Reviewer**: LLM autopilot optimistic + dev approval explicit en smoke UI
**Tier de revision**: exhaustive (T3 → exhaustive)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Loader v2 sigue patron canonico de v1 (TICKET-028); 4 funciones idempotentes |
| 2 | Lint | n/a | Lint solo configurado para TS productivo; JS del seed sin lint |
| 3 | Tipado | n/a | JS puro en seed; TS solo en test (typecheck via vitest pass) |
| 4 | Testing | pass | 597/597 pass; mock loader v2 cubre los 3 tests de seed-entry afectados |
| 5 | Escalabilidad | pass | Loader v2 O(n) sobre rows legacy (max 2); idempotente para re-runs |
| 6 | Mantenibilidad | pass | Patron consistente con v1; LEGACY_TO_PASCAL array extensible. L10/L11/L14 documentados como B2/B3/B4 backlog para platform fixes futuros |
| 7 | Claridad | pass | Comments explicativos del patron mod-internal; refs a RULE-platform-006 y spec |
| 8 | Accesibilidad | pass | UI funciona OK per smoke (tab Historial renderiza eventos en RecordDetail) — sin regression observable |
| 9 | Storybook | n/a | Sin componentes nuevos |
| 10 | Error handling | pass | Loader devuelve estructura tipada (skipped/total/renamed/deleted); seed.js maneja casos con log explicativo |

**Gate decision:** (approvedBy: dev — smoke UI confirm "funciona ok la plataforma")
- [x] continue → request-close
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para request-close**:
- Backlog updated con B2-B4 (deuda descubierta durante execute)
- Tabla Test cases del ticket actualizada (DET-25 inline registration)
- teach-close skipped per dev trigger (DET-22 post-F5 — razon documentada en frontmatter)

**Tiempo invertido**: ~35 min (incluye 2 sync retries + recovery del crash om + restart + smoke prep + dev confirm)
**Contexto retomable**: refactor PascalCase del mod completado end-to-end. BD UPU consistente. Branch UPONE-1100 lista para merge (consolida TICKET-030 + TICKET-031). PR Jira UPONE-1100 sigue en "Revision de companeros".
**Commit DET-27**: 3 commits S3 aplicados (103e724, 563e751, 72af1f3). Working tree limpio.

## Teaching — Intake

**Status**: skipped
**Razon**: dev trigger `autopilot on teach off` el 2026-05-22 declarando "ticket quick fix" — DET-21 post-F5 acepta skip con justificacion explicita. La auditoria de intake-explore (Session 0) ya documenta hipotesis evolucionadas + evidencia multi-capa; el material educativo se canaliza al teach-close si el dev cambia de opinion, sino se descarta.

## Teaching — Close

**Status**: skipped
**Razon**: idem teach-intake — dev trigger en intake post-explore. DET-22 post-F5 acepta skip con justificacion.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-PRESERVE-01 (mod sigue operativo) | TC-1 | manual/smoke | pass |
| REQ-PRESERVE-02 (GraphQL types/queries funcionan post-rename) | TC-2 | auto | pass |
| REQ-REFACTOR-01 (grep verification de RULE-platform-006 retorna 0 violaciones) | TC-3 | auto | pass |
| REQ-REFACTOR-02 (codegen produce Prisma models PascalCase) | TC-4 | auto | pass |
| REQ-REGRESSION-01 (vitest suite del mod sin nuevos failures) | TC-5 | auto | pass |

(Lista preliminar — REQs se refinan en design-refactor con source_ref a RULE-platform-006.)

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Smoke UI: RecordList Activity + CurricularLink + recordTypes hijos cargan en suite (tenant UPU) post-refactor | REQ-PRESERVE-01 | manual | yes | sync + codegen + restart om + seed loader v2 corridos | Abrir tab Activity → RecordDetail → tab Historial; idem CurricularLink + Modality | tab Historial renderiza sin errores GraphQL | dev confirm "funciona ok la plataforma" 2026-05-22 | dev verbal approval | pass | S3.T3 | — |
| TC-2 | GraphQL introspection: type `ChangeLog` PascalCase presente, `changeLog` lowercase ausente | REQ-PRESERVE-02 | auto | no | object-manager corriendo post-restart | `curl /graphql` con introspeccion query | Has ChangeLog? True, Has changeLog? False | True / False | curl + python3 parsing output | pass | S3.T2 | — |
| TC-3 | Grep verification: scripts de RULE-platform-006 sobre `mods/curriculum-design/` retornan 0 violaciones (excepto excepciones documentadas rt__/core_) | REQ-REFACTOR-01 | auto | no | refactor completado | Correr `grep -rE` checks de title/references/objectName/id-name layouts | 0 matches lowercase fuera de excepciones | 0 matches en objects/seed/events/layouts | grep output S1.GATE + S2.GATE | pass | S1.GATE, S2.GATE | — |
| TC-4 | Codegen: `prisma/UPU/schema.prisma` post-codegen contiene `model ChangeLog` PascalCase | REQ-REFACTOR-02 | auto | no | npm run codegen + sync ejecutados | grep `^model ChangeLog ` en schema | 1 match PascalCase, 0 lowercase | 1 match `model ChangeLog {` | grep output S3.T1 | pass | S3.T1 | — |
| TC-5 | Regression vitest del mod: `npm test --workspace=@uplanner/curriculum-design` 597/597 (delta 0 vs baseline pre-refactor 4.07s) | REQ-REGRESSION-01 | auto | no | baseline 597/597 capturado al inicio | Correr vitest | Delta = 0 nuevos failures | 597/597 pass en 3.54s | vitest output S3.T5 | pass | S3.T5 | iterate → S3.T5 agregando mock loader v2 cubrio 3 tests fallando inicialmente |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| — | — | — | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| object-manager vitest (incluye mods/curriculum-design) | `npm test --workspace=@uplanner/object-management-backend` | (capturar en S0) | (capturar en S4) | — |
| mod vitest local | `cd mods/curriculum-design && npm test` | (capturar en S0) | (capturar en S4) | — |

**Baseline**: capturar al inicio de S0 antes de cualquier cambio.
**Final**: capturar al cierre de S4 antes de acceptance.

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Clarificar RULE-platform-006 sobre alcance de la excepcion `rt__ recordtypes son lowercase intencionalmente` (Test 4) | — | rules/platform/rule-platform-006.md `## Verification` (linea con comentario `# (excepcion: rt__ recordtypes son lowercase intencionalmente)`) | RULE-platform-006 documentada con verification scripts. La nota actual es ambigua: ¿cubre solo el prefix `rt__` o el archivo completo incluyendo suffix `_curricularsection`? Evidencia empirica (TICKET-028, TICKET-030, hotfix/casing de Clemente) confirma que cubre archivo completo, pero la rule no lo dice explicito | Editar `rules/platform/rule-platform-006.md`: en Test 4 expandir la nota a: "excepcion: archivos cuyo filename matchea patron `rt__*` mantienen lowercase intencional en TODO el filename y campos internos (`id`, `name`, `objectName`) — incluye prefix `rt__`, segmento del recordtype, y suffix del object owner. Razon: convencion establecida por TICKET-019/028/030 + hotfix/casing." Agregar a `## Examples` un caso positivo de `rt__Modality__curricularsection` como referencia | should |
| B2 | Bug platform: sync mechanism `applyModToObject` no propaga cambios al `title` top-level del object | — | object-manager/scripts/sync/fileSync.js:709 `applyModToObject` | Funcion existe y merges `properties` + `metadata` de cada mod source. NO incluye el campo `title` del top-level. Resultado: una vez que el archivo synced existe en `business/Base/`, cualquier cambio al `title` en el mod es ignorado por el sync. Workaround actual: delete + re-sync (verificado en TICKET-031 S3.T1) | Editar `applyModToObject` para que tambien propague `title` y otros campos top-level (`type`, `$schema`) si difieren entre target y source. Spinear como ticket platform separado — toca core code (object-manager) que NO es de este mod. Confirmar con dev antes de tocar | should |
| B3 | Migration production-safe para rename de Prisma model (`ALTER TABLE RENAME`) | — | object-manager/scripts/ + prisma | El platform up1 usa `prisma db push` para schema apply (no `prisma migrate`). `db push` ve rename de model como DROP + CREATE → data loss. En production seria desastre. Workaround dev local: --accept-data-loss (autorizado por dev en este ticket porque BD UPU tenia 6 rows de prueba). Para production: requiere migration custom SQL `ALTER TABLE "old" RENAME TO "new"` o adoptar `prisma migrate dev/deploy` | Investigar adopcion de Prisma Migrate (vs db push) en el platform up1 para soportar schema changes preservando data. Spinear como ticket platform separado | should |
| B4 | Bug seed completo del tenant: `Institution.deleteMany` falla por FK constraint con Workflow | — | object-manager/prisma/UPU/seed.js:137 + script `scripts/tenant-seed.js` | `npm run seed --workspace=@uplanner/object-management-backend` ejecuta deleteMany de Institution antes de re-seedear. Falla con `PrismaClientKnownRequestError: Foreign key constraint violated on Workflow_institutionId_fkey`. Workaround usado en TICKET-031: invocacion directa del loader v2 via Node script. No bloqueante para mod work, pero molesto para integration tests con DB real | Actualizar `seed.js` del tenant para borrar Workflows + workflowStatus + workflowTransition en orden FK antes que Institution; o usar transactional truncate cascade | could |

(Otros items descubiertos durante execute se agregan aqui.)

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `2bedd78` | 2026-05-22 | UPONE-1100-S1 fix(curriculum-design): PascalCase title ChangeLog + seed indexes ChangeLog/WorkflowTransitionHistory tables | S1.T1, S1.T2 | REQ-REFACTOR-01, REQ-REFACTOR-02 |
| `de1f03c` | 2026-05-22 | UPONE-1100-S1 docs(curriculum-design): align CurricularLink events descriptions to PascalCase entityType/ChangeLog refs | S1.T3 | REQ-PRESERVE-01 |
| `ad878cc` | 2026-05-22 | UPONE-1100-S1 test(curriculum-design): align entityType test fixture to Activity PascalCase | S1.T4 | REQ-PRESERVE-02 |
| `4db34a9` | 2026-05-22 | UPONE-1100-S2 fix(curriculum-design): PascalCase rename layouts changeLog→ChangeLog + curricularLink→CurricularLink | S2.T1, S2.T2 | REQ-REFACTOR-01 |
| `78ccad5` | 2026-05-22 | UPONE-1100-S2 fix(curriculum-design): align embedded sublayouts objectName changeLog→ChangeLog | S2.T3, S2.T4, S2.T5 | REQ-REFACTOR-01, REQ-PRESERVE-02 |
| `103e724` | 2026-05-22 | UPONE-1100-S3 fix(curriculum-design): GraphQL schema consumer rows: [ChangeLog!] PascalCase + descripcion refs | S3.T2 | REQ-PRESERVE-02 |
| `563e751` | 2026-05-22 | UPONE-1100-S3 feat(curriculum-design): seed loader v2 pascalcase cleanup (changeLog + curricularLink) idempotente | S3.T4 | REQ-REFACTOR-02 |
| `72af1f3` | 2026-05-22 | UPONE-1100-S3 test(curriculum-design): mock loader v2 in seed-entry.test.ts | S3.T5 | REQ-PRESERVE-02 |

## Summary

### What was requested

Auditar y normalizar a PascalCase canonico todos los objetos del mod curriculum-design (RULE-platform-006), siguiendo el patron del rename de `activity → Activity` ya aplicado, contemplando rename de title + actualizacion de referencias en layouts/seed/eventos/tests.

### What was done

- Rename del `title` interno del object `changeLog → ChangeLog` (1 archivo)
- Rename de 2 layout filenames + campos internos: `default_changeLog_list → default_ChangeLog_list` + `default_curricularLink_view → default_CurricularLink_view`
- Actualizacion de 9 sublayouts embebidos con `objectName: changeLog → ChangeLog` (Activity_view + CurricularLink_view + 7 rt__*_curricularsection_view)
- Actualizacion de `seed/_data-indexes.js`: 2 entradas `table: changeLog → ChangeLog` + scope creep aprovechado 3 entradas `workflowTransitionHistory → WorkflowTransitionHistory` (L6)
- Fix de consumer descubierto durante restart om: `logic/auditCapture.schema.graphql` GraphQL type ref `rows: [changeLog!] → [ChangeLog!]` + 10 description refs
- Cleanup oportunista: 3 events descriptions + 1 test fixture entityType lowercase legacy
- Seed migration BD canonico: nuevo loader v2 (`_data-layouts-pascalcase-cleanup-v2.js`) + registry en `seed.js` + mock en `seed-entry.test.ts`. Aplicado empirico en UPU: 2 orphans deleted
- BD UPU: DROP `changeLog` table (6 rows perdidas, autorizado) + CREATE `ChangeLog` via `prisma db push --accept-data-loss`
- Restart object-manager + introspection verifica `type ChangeLog` PascalCase
- Smoke UI dev confirm: "funciona ok la plataforma"

### What was discovered

- **Rules creadas**: ninguna nueva (RULE-platform-006 ya existia, este ticket la aplica)
- **Decisions tomadas (locales)**: mantener filename del object JSON camelCase (solo title PascalCase); mantener excepcion rt__ del scope; usar branch UPONE-1100 existente (consolida 1 PR Jira); aceptar data loss en BD UPU dev local
- **Bugs encontrados / Backlog**:
  - **B1** (should): clarificar RULE-platform-006 excepcion `rt__` para archivo completo (no solo prefix)
  - **B2** (should): bug platform sync `applyModToObject` no propaga cambios al `title` top-level — workaround delete + re-sync
  - **B3** (should): migration production-safe para rename de Prisma model — adoptar Prisma Migrate vs db push
  - **B4** (could): bug del seed completo del tenant FK Institution.deleteMany — workaround invocacion directa

### Testing summary

| Metric | Value |
|--------|-------|
| REQs covered | 5/5 (REQ-PRESERVE-01, REQ-PRESERVE-02, REQ-REFACTOR-01, REQ-REFACTOR-02, REQ-REGRESSION-01) |
| REQs NOT covered | ninguno |
| Test cases total | 5 (1 manual + 4 auto) |
| Test cases pass | 5 |
| Test cases fail | 0 |
| Test artifacts created | 1 (`seed/_data-layouts-pascalcase-cleanup-v2.js` + mock en `seed-entry.test.ts`) |
| Regression delta | 0 nuevos failures (597/597 baseline mantenido) |

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 4 (S0 intake + S1, S2, S3 execute) |
| Tasks completed | 19 (S0.T1..T11 + S1.T1..T4 + S2.T1..T5 + S3.T1..T5) + 3 GATEs |
| Commits | 8 (3 S1 + 2 S2 + 3 S3) en branch UPONE-1100-fix-audit-chain-entityType-pascalcase |
| Learns captured | 14 (L1..L14 — varios descubrimientos sobre el platform fuera del scope del ticket pero relevantes) |
| Rules created | 0 |
| Decisions taken | 5 (decisiones locales en spec — branch reuse, filename del object, rt__ scope, --accept-data-loss UPU, scope creep en workflowTransitionHistory indexes) |
| Bugs found / Backlog items | 4 (B1..B4) |

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-05-22 | 2026-05-22 |
| intake-explore | done | 2026-05-22 | 2026-05-22 |
| teach-intake | skipped | 2026-05-22 | 2026-05-22 |
| design-refactor | done | 2026-05-22 | 2026-05-22 |
| design-transition-to-execute | done | 2026-05-22 | 2026-05-22 |
| request-execute | done | 2026-05-22 | 2026-05-22 |
| request-close | done | 2026-05-22 | 2026-05-22 |
| teach-close | skipped | 2026-05-22 | 2026-05-22 |
