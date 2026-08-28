---
id: SPEC-013-curriculum-design-mod-pascalcase-audit
project: up1
ticket: TICKET-031
status: done
---

# Auditoria + normalizacion PascalCase del mod curriculum-design contra RULE-platform-006

# Auditoria + normalizacion PascalCase del mod curriculum-design contra RULE-platform-006

## Executive summary — lo que estas aprobando

> *Refactor puro: zero behavior change. Aplica RULE-platform-006 (PascalCase canonico) al mod completo, post-TICKET-028 (objects/layouts core de Activity) y post-TICKET-030 (audit chain entityType). El alcance es mas chico de lo que parecia inicialmente: la auditoria detecto que solo `changeLog` (object) + 2 layouts + 10 sublayouts embebidos quedan en camelCase. El resto del mod ya esta canonico.*

**Que se quiere**: Cerrar la deuda de PascalCase del mod curriculum-design. Despues del refactor, los 5 grep checks de RULE-platform-006 retornan 0 violaciones sobre `mods/curriculum-design/`, y la cadena de propagacion title → codegen → Prisma model → tabla BD → sync a `up1_layen_layout.objectName` queda consistente. El tab Historial sigue funcionando identico para el dev/usuario.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Filename del object `changeLog.json` se MANTIENE camelCase | RULE-platform-006 obliga PascalCase en `title` pero NO en filename del object JSON. Renombrar el archivo agrega ruido sin valor (el mod tiene inconsistencia transversal pre-existente: `activity.json` con title `Activity`). Cambia SOLO el `title` interno |
| 2 | Filenames de layouts `default_changeLog_list.json` y `default_curricularLink_view.json` SI se renombran a PascalCase | El Test 3 de RULE-platform-006 cubre layout filenames explicitamente. Es obligatorio |
| 3 | Cleanup oportunista incluido: 3 events descriptions `entityType='curricularLink'` lowercase + 1 test legacy con `entityType: 'activity'` lowercase | Riesgo cero (descriptions son docs, test es trivial). Aprovecha para cerrar deuda residual de TICKET-030 |
| 4 | Branch: continuar en `UPONE-1100-fix-audit-chain-entityType-pascalcase` (rama del PR abierto de TICKET-030) | Consolida 1 PR Jira UPONE-1100. TICKET-030 closed DKC pero PR aun en review — el merge del PR cubrira AMBOS tickets DKC |
| 5 | `rt__*_curricularsection_*` layouts (19 archivos) FUERA del scope | H6 refuted en intake-explore — convencion establecida por TICKET-028 / TICKET-030 / hotfix-casing de Clemente. Backlog B1 documenta la clarificacion futura de RULE-platform-006 |

**Riesgos principales y como los mitigamos**:

- **Codegen produce Prisma model `ChangeLog` que rompe seed indexes** (impacto: codegen falla o seed no crea indexes) → S1.T2 actualiza `seed/_data-indexes.js` con `table: 'ChangeLog'` ANTES de correr codegen en S3
- **BD legacy con rows en `up1_layen_layout` con `objectName: 'changeLog'`** → S3.T4 corre seed migration idempotente per RULE-platform-006 patron mod-internal
- **object-manager dev server no reinicia post-codegen → cache stale del GraphQL schema** → S3.T2 explicit restart documentado per RULE-platform-006 Operational notes
- **Test integration `layouts-declared.test.ts` espera filenames PascalCase y puede romper si missing un layout durante rename** → S2.T1/T2 ejecutan rename + update interno EN UNA misma operacion atomica antes de correr tests

**Que NO se hace en este ticket**:

- Renombrar archivo del object JSON `changeLog.json` (decision #1)
- Tocar los 19 `rt__*_curricularsection_*` layouts (decision #5)
- Modificar capabilities (excepcion documentada en RULE-platform-006)
- Renombrar `prisma.changeLog` accessor en resolvers JS (el accessor Prisma camelCase del model name `ChangeLog` sigue siendo `prisma.changeLog` — no cambia)

**Tamano estimado**: 3 sessions execute + 1 gate fuerte. ~2-3h efectivas. Mas riesgosa: S3 (codegen + sync + restart + smoke UI manual).

**Como vas a saber que funciona**:

- Abro suite tenant UPU → tab Historial de un Activity → veo eventos con entityType `Activity` y sublayout del changeLog renderiza igual que antes
- Corro `npm test --workspace=@uplanner/object-management-backend` → 597/597 (baseline) → mismo o mejor
- `curl /graphql introspeccion` muestra type `ChangeLog` PascalCase
- `ls mods/curriculum-design/config/layouts/ | grep "default_[a-z]"` retorna solo `rt__*` (excepcion documentada)

---

## Purpose

Aplicar RULE-platform-006 (PascalCase canonico) end-to-end al mod curriculum-design, cubriendo la capa que TICKET-028 y TICKET-030 no normalizaron: title del object `changeLog`, 2 layout filenames + 10 sublayouts embebidos, seed indexes string, y cleanup residual de events descriptions + 1 test legacy. Zero behavior change observable post-refactor.

## Requirements

### REQ-PRESERVE-01: La API publica y comportamiento del mod NO cambian

> **Que cambia**: para devs y usuarios del mod, nada visible cambia. El tab Historial sigue mostrando los mismos eventos. Las queries GraphQL devuelven los mismos resultados. Los layouts renderizan identico.
> **Por que**: el refactor es solo nominal — normaliza nombres internos del codigo para alinearlos con la convencion. Si algo cambia para el consumer, es regression que rompe el refactor.

El sistema MUST mantener identico comportamiento externo observable post-refactor: queries GraphQL retornan los mismos types/fields, layouts renderizan con los mismos campos, tab Historial muestra los mismos eventos, capabilities siguen aplicando, mutations siguen aceptando los mismos inputs.

**Actor**: dev consumer, usuario final
**Layers**: frontend, backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: tab Historial sigue funcionando
- **GIVEN** un Activity con N eventos en changeLog
- **WHEN** el usuario abre RecordDetail del Activity y va al tab Historial
- **THEN** ve los N eventos con el mismo formato visual
- **AND** los eventos polimorficos de recordTypes (Modality, LearningOutcome, etc.) tambien aparecen

#### Scenario: GraphQL introspection retorna PascalCase
- **GIVEN** object-manager corriendo post-restart
- **WHEN** se hace introspection del schema
- **THEN** `ChangeLog` aparece como type PascalCase
- **AND** `changeLog` NO aparece como type lowercase

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el suite, abre un Activity, va al tab Historial, ve los eventos. Sin errores en consola del browser ni del object-manager.

### REQ-PRESERVE-02: Tests existentes MUST pasar sin modificacion (excepto los del cleanup oportunista)

> **Que cambia**: la suite vitest del mod sigue verde post-refactor con los mismos 597 tests pasando.
> **Por que**: si un test falla, el refactor rompio algo. NO se modifican tests para hacerlos pasar (excepto el test legacy con `entityType: 'activity'` lowercase, que es parte del cleanup oportunista explicit en S1.T4).

El sistema MUST preservar el resultado de la suite de tests del mod: 597/597 passed en baseline (verificado 2026-05-22 pre-refactor). Post-refactor: igual o mejor. **Excepcion documentada**: `tests/integration/workflow-resolvers.test.ts:236` se actualiza de `entityType: 'activity'` → `'Activity'` (cleanup oportunista de deuda TICKET-030).

**Actor**: system (CI)
**Layers**: tests

### REQ-REFACTOR-01: Cumplimiento RULE-platform-006 verificable via grep

> **Que cambia**: los 5 scripts de verification de RULE-platform-006 retornan 0 violaciones sobre `mods/curriculum-design/`.
> **Por que**: la rule existe para prevenir deploy block en Linux FS. Pasar los grep checks es el contrato verificable.

El sistema MUST pasar los 5 grep verification scripts de RULE-platform-006 sobre `mods/curriculum-design/`, excluyendo las excepciones documentadas (capabilities lowercase, `rt__*` recordtypes lowercase, `core_*` prefix).

**Actor**: system (CI/grep checks)
**Layers**: meta (rule enforcement)

<details><summary>Scenarios de validacion</summary>

#### Scenario: grep title PascalCase
- **GIVEN** refactor completado
- **WHEN** ejecuto `grep -rE '"title":\s*"[a-z][a-zA-Z]*",' mods/curriculum-design/objects/`
- **THEN** exit 1 (no matches)

#### Scenario: grep layout filenames PascalCase
- **GIVEN** refactor completado
- **WHEN** ejecuto `ls mods/curriculum-design/config/layouts/default_*.json | grep -E "default_[a-z]"`
- **THEN** solo aparecen `default_rt__*` (excepcion documentada)

#### Scenario: grep objectName PascalCase en layouts
- **GIVEN** refactor completado
- **WHEN** ejecuto `grep -rE '"objectName":\s*"[a-z]' mods/curriculum-design/config/layouts/`
- **THEN** solo aparecen `rt__*` (excepcion documentada)

</details>

### REQ-REFACTOR-02: Cadena codegen → BD → sync consistente PascalCase

> **Que cambia**: `prisma/UPU/schema.prisma` contiene `model ChangeLog` PascalCase. `up1_layen_layout.objectName` para layouts del changeLog y curricularLink esta en PascalCase post-sync.
> **Por que**: el codegen lee el `title` del JSON directo como model name. Sin PascalCase del title, codegen produce model lowercase y rompe el matching del suite consumer.

El sistema MUST regenerar el Prisma schema con `model ChangeLog` PascalCase y propagar via sync mechanism a la tabla `up1_layen_layout` con `objectName` PascalCase. Si hay rows legacy con casing viejo, seed migration idempotente las normaliza.

**Actor**: system (codegen + sync + seed)
**Layers**: backend, database

## Artifacts

### Refactor map

#### Files (action: rename = filename change + internal id/name update)

| Action | Before | After | Reason |
|--------|--------|-------|--------|
| update | `objects/changeLog.json` (title `changeLog`) | mismo filename, title `ChangeLog` | RULE-platform-006 campo 1 — title PascalCase |
| update | `seed/_data-indexes.js` 2 entradas `table: 'changeLog'` | `table: 'ChangeLog'` (cosmetico tambien actualizar `name` field) | H7 confirmed: post-rename del title, Prisma table name es `ChangeLog` |
| rename | `config/layouts/default_changeLog_list.json` | `config/layouts/default_ChangeLog_list.json` (+ update id/name/objectName interno) | RULE-platform-006 campo 3-4 — layout filename + interno PascalCase |
| rename | `config/layouts/default_curricularLink_view.json` | `config/layouts/default_CurricularLink_view.json` (+ update id/name/objectName interno) | idem |
| update | 8 sublayouts embebidos `"objectName": "changeLog"` → `"ChangeLog"` | mismo filename, sublayout objectName PascalCase | RULE-platform-006 campo 4 — objectName interno PascalCase |
| update | 3 events descriptions `events/CurricularLink-*.json` mencionando `entityType='curricularLink'` | `entityType='CurricularLink'` en text de description | Cleanup oportunista — doc consistency post-TICKET-030 |
| update | `tests/integration/workflow-resolvers.test.ts:236 entityType: 'activity'` | `entityType: 'Activity'` | Cleanup oportunista — test legacy con casing pre-TICKET-030 |

#### Exports affected (Prisma model accessor — NO cambia)

| Export | Current | New | Consumers count |
|--------|---------|-----|-----------------|
| `prisma.changeLog` (Prisma client accessor) | `prisma.changeLog` | `prisma.changeLog` (sin cambio — Prisma camelCases el model name) | 0 (sin cambio) |
| GraphQL type `changeLog` | `changeLog` | `ChangeLog` | suite GraphQL queries (Apollo codegen genera el type del schema runtime — auto-refresh) |
| Prisma model name | `model changeLog` | `model ChangeLog` | generado por codegen — no es export manual |

#### Consumer updates required (codigo aplicacion)

| Consumer file | Current | New |
|---------------|---------|-----|
| `seed/_data-indexes.js` (2 lineas) | `table: 'changeLog'` | `table: 'ChangeLog'` |
| 8 layouts JSON con sublayout embebido | `"objectName": "changeLog"` | `"objectName": "ChangeLog"` |
| 3 events descriptions | text legacy `entityType='curricularLink'` | text actualizado `entityType='CurricularLink'` |
| 1 test integration | `entityType: 'activity'` | `entityType: 'Activity'` |
| 0 resolvers JS | (no cambia — accessor Prisma `prisma.changeLog` se preserva) | — |

## Tasks

### Session 1 — Capa objects + seed + cleanup docs/tests [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Rename `objects/changeLog.json title: "changeLog"` → `"ChangeLog"` (1 sola edit del campo title) | REQ-REFACTOR-01 | developer | — | `mods/curriculum-design/objects/changeLog.json` | `grep '"title":\s*"changeLog"' mods/curriculum-design/objects/changeLog.json` retorna 0 | git revert | DET-2, DET-8, DET-10, RULE-platform-006 | pending | 1 |
| S1.T2 | Actualizar `seed/_data-indexes.js` 2 entradas: `table: 'changeLog'` → `'ChangeLog'`; cosmetico tambien `name` field (`changeLog_*_idx` → `ChangeLog_*_idx`) | REQ-REFACTOR-02 | developer | S1.T1 | `mods/curriculum-design/seed/_data-indexes.js` | `grep "table:\s*'changeLog'" mods/curriculum-design/seed/_data-indexes.js` retorna 0 | git revert | DET-5, DET-8, DET-10, RULE-platform-006 | pending | 1 |
| S1.T3 | Cleanup oportunista: actualizar 3 events descriptions `entityType='curricularLink'` lowercase → `'CurricularLink'` PascalCase | REQ-PRESERVE-01 | developer | S1.T2 | `mods/curriculum-design/events/CurricularLink-create.json`, `events/CurricularLink-update.json`, `events/CurricularLink-delete.json` | `grep "entityType='curricularLink'" mods/curriculum-design/events/` retorna 0 | git revert | DET-8, DET-10, DET-16, RULE-platform-006 | pending | 1 |
| S1.T4 | Cleanup oportunista: actualizar test legacy `tests/integration/workflow-resolvers.test.ts:236 entityType: 'activity'` → `'Activity'` | REQ-PRESERVE-02 | developer | S1.T3 | `mods/curriculum-design/tests/integration/workflow-resolvers.test.ts` | vitest del area pasa: `npm test -- workflow-resolvers` 597/597 | git revert | DET-7, DET-8, DET-10, RULE-platform-006 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — vitest del mod completo + grep verification de los 5 scripts de RULE-platform-006 sobre objects/+seed/+events/+tests. Decision continue → S2 si verde | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido con decision + 597/597 tests + grep checks limpios | (no aplica — cierre de session) | DET-20, DET-23, RULE-platform-006 | pending | 1 |

### Session 2 — Capa layouts (filenames + sublayouts embebidos) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Rename `config/layouts/default_changeLog_list.json` → `default_ChangeLog_list.json`: `git mv` + update interno `id`/`name` (`default_changeLog_list` → `default_ChangeLog_list`) + `objectName: "changeLog"` → `"ChangeLog"` | REQ-REFACTOR-01 | developer | S1.GATE | `mods/curriculum-design/config/layouts/default_changeLog_list.json` → `default_ChangeLog_list.json` | `ls config/layouts/default_changeLog_list.json` falla; `ls config/layouts/default_ChangeLog_list.json` existe; grep interno PascalCase | git mv reverso | DET-5, DET-8, DET-16, RULE-platform-006 | pending | 2 |
| S2.T2 | Rename `config/layouts/default_curricularLink_view.json` → `default_CurricularLink_view.json`: `git mv` + update interno `id`/`name`/`objectName` | REQ-REFACTOR-01 | developer | S2.T1 | `mods/curriculum-design/config/layouts/default_curricularLink_view.json` → `default_CurricularLink_view.json` | idem S2.T1 | git mv reverso | DET-5, DET-8, DET-16, RULE-platform-006 | pending | 2 |
| S2.T3 | Actualizar 8 sublayouts embebidos con `objectName: "changeLog"` → `"ChangeLog"` en `default_Activity_view.json:339`, `default_CurricularLink_view.json:75` (post S2.T2), 6 layouts `default_rt__*__curricularsection_view.json` (Bibliography:46, Content:36, CustomSection:44, EvaluationComponent:58, LearningOutcome:43, Modality:71, Session:51 — total 7 archivos rt__) | REQ-REFACTOR-01 | developer | S2.T2 | 8 layouts | `grep -rE '"objectName":\s*"changeLog"' config/layouts/` retorna 0 | git revert per archivo | DET-5, DET-8, DET-10, RULE-platform-006 | pending | 2 |
| S2.T4 | Verificar y actualizar `associatedLayoutConfigs.layoutId` cross-references: grep todos los layouts por `default_changeLog_list` y `default_curricularLink_view` (referencias al nombre viejo) y actualizar a PascalCase | REQ-REFACTOR-01 | developer | S2.T3 | layouts con asociated config | `grep -rE "default_changeLog_list\|default_curricularLink_view" config/layouts/` retorna 0 | git revert | DET-16, DET-5, RULE-platform-006 | pending | 2 |
| S2.T5 | Vitest integration `layouts-declared.test.ts` (espera PascalCase) + suite completa del mod | REQ-PRESERVE-02 | developer | S2.T4 | tests del mod | `npm test --workspace=@uplanner/object-management-backend` 597/597 (delta 0) | git revert toda la session | DET-7, DET-13, RULE-platform-006 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — coverage delta vs S1.GATE baseline + grep verification filename + objectName + integration tests verdes | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5 | ticket | gate persistido + coverage delta documentado + decision continue → S3 | (no aplica) | DET-20, DET-23, RULE-platform-006 | pending | 2 |

### Session 3 — Validacion end-to-end + seed migration BD [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Codegen + sync mechanism: `npm run codegen --workspace=@uplanner/object-management-backend` + `npm run sync` (root). Verifica que Prisma schema regenera `model ChangeLog` PascalCase | REQ-REFACTOR-02 | developer | S2.GATE | `prisma/UPU/schema.prisma` (auto-generated), synced files en `object-manager/objects/`, `suite/modsComponents/`, etc. | `grep "^model ChangeLog " object-manager/prisma/UPU/schema.prisma` retorna 1 match | git revert + re-run codegen sobre baseline | DET-5, DET-8, DET-16, RULE-platform-006 | pending | 3 |
| S3.T2 | Restart object-manager dev server + GraphQL introspeccion verifica types PascalCase (`ChangeLog`, no `changeLog`) | REQ-REFACTOR-02 | developer | S3.T1 | object-manager runtime | `curl /graphql` introspection JSON contiene `"name":"ChangeLog"` y NO `"name":"changeLog"` | restart con codigo previo | DET-5, RULE-platform-006 | pending | 3 |
| S3.T3 | Smoke UI manual: abrir suite tenant UPU → RecordDetail Activity → tab Historial → verificar eventos renderizan; idem CurricularLink → tab Historial; idem 6 recordTypes (Bibliography, Content, CustomSection, EvaluationComponent, LearningOutcome, Modality, Session) | REQ-PRESERVE-01 | reviewer (dev humano) | S3.T2 | suite runtime | screenshots de los 3 tabs Historial sin errores GraphQL ni warnings en consola | revert toda la branch | DET-13, DET-23 | pending | 3 |
| S3.T4 | Seed migration BD legacy: query `up1_layen_layout` por `objectName IN ('changeLog', 'curricularLink')` post-sync. Si N>0: agregar loader idempotente en `seed/_data-layouts-pascalcase-cleanup-v2.js` per RULE-platform-006 patron mod-internal. Si N=0: skip (sync ya creo las versiones nuevas) | REQ-REFACTOR-02 | developer | S3.T3 | `mods/curriculum-design/seed/_data-layouts-pascalcase-cleanup-v2.js` (si aplica) + `seed/seed.js` registry | query BD muestra solo rows PascalCase post-seed | revert del seed loader; restore manual de rows BD (raro — solo si seed corrompe) | DET-8, DET-16, RULE-platform-006 | pending | 3 |
| S3.T5 | Regression suite completa del object-manager backend: `npm test --workspace=@uplanner/object-management-backend` + verificar delta 0 vs baseline | REQ-PRESERVE-02 | reviewer | S3.T4 | tests | 597/597 mod (delta 0); object-manager total tests delta 0 | revert toda la branch | DET-7, DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** ⚑ fuerte — dev valida visualmente smoke UI + regression sin nuevos failures + introspeccion PascalCase + decision sobre PR Jira UPONE-1100 (consolidar con TICKET-030 o split) | — | reviewer (dev humano) | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | ticket | gate persistido con decision dev confirmada | (no aplica) | DET-20, DET-23, DET-13, RULE-platform-006 | pending | 3 |

## Constraints

- **RULE-platform-006**: PascalCase canonico en 11 campos. Excepciones explicit: capabilities lowercase, `core_` prefix, `rt__` recordtypes lowercase (file completo), field names dentro de objects camelCase. Verification: 5 grep scripts.
- **DET-7**: tests de regression obligatorios (REQ-PRESERVE-02 mapea). Baseline 597/597 captured.
- **DET-8**: rollback documentado por task (git revert / git mv reverso). Cada task atomica.
- **DET-19**: external ID UPONE-1100 en commits/branch/PR (no `TICKET-031`). Branch reusada de TICKET-030.
- **DET-20**: sessions 1.5-3h con gate. Plan: S1 (~30min) + S2 (~1h) + S3 (~1-1.5h) = ~2-3h total. Estimacion conservadora.
- **DET-23**: quality review por session (tier light/standard/exhaustive segun T1/T2/T3).
- **DET-25**: test cases registrados in-flight, no diferidos al close.
- **DET-27**: commits granulares al cierre de cada session (feat/test/docs separados).
- **DET-29**: persistencia in-flight via `dkc-execute-task` para transiciones de tasks.

## Risks

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|------------|--------|------------|
| Consumer no detectado del objectName `changeLog` (import dinamico, reflection) | Baja | Build/smoke falla en otro modulo | Grep exhaustivo ya hecho en intake-explore (13 refs + 3 + 2 + 2 mapeados); smoke UI manual en S3.T3 catch any remaining |
| BD legacy `up1_layen_layout` con casing viejo bloquea LayoutOrchestrator resolution | Media | "Layout not found" runtime al abrir tab Historial | S3.T4 seed migration idempotente; query antes para detectar |
| object-manager no reinicia y mantiene schema cache stale | Alta | "Type not found" GraphQL errors en suite | S3.T2 explicit restart como sub-step; verification via introspection antes de S3.T3 |
| PR UPONE-1100 PR queda con commits mezclados de TICKET-030 + TICKET-031 confundiendo review | Baja | Reviewer pierde tiempo | Decision #4 esta explicita en el spec; commit messages con prefijo UPONE-1100 + scope diferenciado en body |

## Open questions

Ninguna activa. Decisiones criticas resueltas en intake-explore + decisiones #1-#5 del Executive summary.

## Acceptance

- [ ] 5 grep verification scripts de RULE-platform-006 sobre `mods/curriculum-design/` retornan 0 violaciones (excepto excepciones documentadas)
- [ ] Vitest 597/597 (delta 0 vs baseline)
- [ ] GraphQL introspeccion muestra type `ChangeLog` PascalCase
- [ ] Smoke UI tab Historial verde en Activity + CurricularLink + 7 recordTypes
- [ ] `up1_layen_layout` query muestra rows con `objectName` PascalCase (post-sync o post-seed migration)
- [ ] dev humano OK en S3.GATE
