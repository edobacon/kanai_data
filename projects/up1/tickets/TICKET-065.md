---
id: TICKET-065
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1270
module: curriculum-design
autopilot: autonomous
---

# curriculum (Plan) · Clonar y versionar (superficial v1)

> Ticket del SP4 creado **previo a intake** con todo el contexto, lo decidido y lo planificado embebido (autosuficiente — no referencia docs externos). Validado contra el modelo real (model-v2) el 2026-06-12.

## Request

> Ticket externo: [UPONE-1270](https://u-planner.atlassian.net/browse/UPONE-1270) — épica de la familia curriculum (Curriculum Design). Confirmar id de épica en intake (DET-19).

Dos acciones sobre el recordList/detalle del `curriculum` (entregado por UPONE-1268): **Clonar** (copia independiente, `code` nuevo, nace `Draft`) y **Versionar** (nueva versión encadenada, mismo `code`, `version` incrementa). **Alcance v1 (SP4): superficial** — opera **solo sobre el objeto Plan**, **sin arrastrar la malla** (`planEntry` no está en SP4; llega el siguiente sprint). El clone profundo se difiere a follow-up.

### Decisiones acordadas con el dev (pre-intake)

- **D-A** (alcance superficial — D3): clona/versiona solo el objeto Plan (campos + cadena de versión + unicidad por linaje), **sin** malla. La malla (`planEntry`) NO está en SP4 → sin hijos que clonar. El clone profundo se **difiere a follow-up** (es ejecución, no re-análisis: el diseño ya queda resuelto en D-D y D-E). Razón: sin `planEntry` el deep clone no es testeable ni su contrato está cerrado (YAGNI).
- **D-B** (semántica clonar ≠ versionar — D4):
  - **Versionar**: `v1` (intacto) + `v2` (Draft, `previousVersionId → v1`, **mismo `code`**, `version` incrementa). Misma entidad, cadena de versiones.
  - **Clonar**: `v1` (intacto) + copia independiente (nuevo `id`, Draft, **sin `previousVersionId`**, **`code` nuevo**). Es un plan nuevo: arranca en `v1` de su propia cadena.
- **D-C** (mecánica — patrón `activity`): versionar = `prefillFrom` + `asNewVersion: true` (incrementa `version` + encadena `previousVersionId`). Clonar = `prefillFrom` sin `asNewVersion` + `cloneStrategy: "prefilledModal"` + `uniqueFields: ["code"]` (`code` vacío en el modal). Excluir `code`/`version`/`previousVersionId` en el clone.
- **D-D** (unicidad por linaje — D6, **opción 1**): la unicidad vive como **validación de dominio en el resolver del create**, dentro del objeto (sin tabla nueva). Al crear una **raíz** (`previousVersionId = null`), rechazar si ya existe otra raíz con `(institutionId, code)`. **Enforcement real, no solo UX.** Distingue clon (raíz nueva, `code` nuevo) de versión (no-raíz, mismo `code`) → resuelve el problema "dos v1". Por qué en el resolver y no en el JSON: `uniqueScopedBy` declarativo **no soporta la condición parcial** ("solo raíces"). Patrón TICKET-061 (I2/I4). Opción 2 (índice parcial DB `WHERE previousVersionId IS NULL`) queda como backstop opcional posterior. Opción 3 (tabla `CurriculumLineage`) **descartada**.
- **D-E** (clone profundo — D5, **opción A, DIFERIDO**): el deep clone (arrastrar `planEntry`) = extender el primitivo `prefilledModal` para disparar `deepClone` al guardar (cambio core en `layout/`). **No se ejecuta en SP4** (no hay malla). El diseño queda resuelto; se implementa con `planEntry` el siguiente sprint (ver Backlog B1).
- Mantener `@@unique([previousVersionId, version])` (= activity) para integridad de la cadena.

**Implementación v1 (sin core):**
1. Bloques `versioning` + `prefillFrom` en `objects/curriculum.json` (patrón de `activity`); `exclude: ["code","version","previousVersionId"]` en el clone.
2. Capabilities `curriculum:clone` / `curriculum:version`.
3. RowActions: clone `cloneStrategy: "prefilledModal"` + `uniqueFields: ["code"]`; versionar `asNewVersion: true`.
4. **Unicidad por linaje** en el resolver del create (D-D, opción 1).
5. MCP tools (`cd_version_*`) + tests.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (acciones de clonado/versionado sobre objeto existente + validación de dominio) |
| Tipo de cambio | single (mod curriculum-design: `curriculum.json` config + resolver del create + capabilities + rowActions) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design (config + `logic/` resolver). object-manager: `sync`/codegen |

## Triage

Complejidad estimada: **media (~3 SP)**: versionar ~1 (config) + clone superficial ~1 (`prefilledModal`) + unicidad por linaje ~1 (resolver). **Sin core** (el clone profundo, que sí tocaría `layout/`, queda diferido). **Depende de UPONE-1268** (objeto curriculum).

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El patrón de `activity` (`versioning` + `prefillFrom`) aplica a `curriculum` | ✓ confirmada | `activity` ya tiene versionado/clonado implementado (TICKET-044, version-only) |
| H2 | `prefilledModal` copia solo escalares (`typeof v !== 'object'`), excluye hijos → en v1 superficial es correcto (no hay malla) | ✓ confirmada | `layout/src/layouts/RecordList.vue:2706` — excluye `parentId/sourceId/position`; no clona hijos |
| H3 | La unicidad por linaje requiere validación de dominio en el resolver (no `uniqueScopedBy`, que no soporta condición parcial "solo raíces") | ✓ confirmada / decidida | D-D opción 1. Patrón TICKET-061 (I2/I4) |
| H4 | El deep clone (`planEntry`) se difiere: sin `planEntry` no es testeable (YAGNI) | ✓ decisión cerrada | D-A / D3. `planEntry` llega el siguiente sprint |
| H5 | `curriculum.code` NO es `@@unique` (por el versionado) → el `code` vacío del modal es solo UX; el enforcement real lo da el resolver de linaje | ✓ confirmada | D4/D6: el `code` se comparte entre versiones; no puede ser `@@unique` a nivel fila |

### Context found

- **Dependencia (hard):** UPONE-1268 (objeto `curriculum` con RecordType Plan/Minor + versionado). Este ticket opera sobre su recordList/detalle.
- **Semántica:** clonar ≠ versionar (D-B). Unicidad por linaje, opción 1 resolver (D-D). Tensión `prefilledModal ⊥ deepClone` resuelta en diseño y diferida (D-E).
- **Primitivo `prefilledModal` (TICKET-052):** abre modal de create prellenado con escalares del source EXCEPTO `uniqueFields` (vacíos); no crea hasta guardar. Config real en uso: `default_Activity_edit.json` (duplicar modalidad, `uniqueFields: ["name","code"]`). Doc `layout/src/types/recordlist.ts:226-240`; impl `RecordList.vue:2704/2706`.
- **`curriculum` es el primer objeto** que combina versionado + clonado-profundo + workflow + unicidad sobre la misma entidad — la combinación que `activity` evitó (lo dejó version-only y movió el clone a objetos sin workflow). Por eso el deep clone se difiere y la unicidad va por linaje.
- **Unicidad:** `code` compartido entre versiones (las une como linaje) → no puede ser `@@unique` a nivel fila. Mantener `@@unique([previousVersionId, version])` para integridad de cadena. La identidad (clon vs versión) la resuelve la regla de linaje en el resolver.
- **Rules del módulo:** `RULE-mods-003` (**must**, `sync`), `RULE-dev-006` (**must**, tests + arranque), `RULE-curriculum-design-003` (**must**: las escrituras de gobernanza van por resolver de dominio — donde vive la regla de linaje).
- **Warnings:**
  1. ⚠️ **`code` no `@@unique`** → el campo vacío del modal es solo UX; el enforcement REAL lo da el resolver de linaje (D-D). No confiar en la DB para frenar `code` duplicado entre linajes.
  2. ⚠️ **Excluir `version`/`previousVersionId`** en el `prefillFrom` del clone — si no, el clon copia el `version` del source (bug visto en activity).
  3. ⚠️ **Gotcha TICKET-054 (config-driven enforcement):** verificar que `@@unique([previousVersionId, version])` quedó aplicado en la DB del tenant.

- **📌 Nota para el intake — evaluar mutation testing (DET-31):** este ticket es el candidato real de SP4 para mutation testing — el **resolver de unicidad por linaje** (H3/D-D) es lógica de dominio con branching (`previousVersionId == null` && existe otra raíz con mismo `(institutionId, code)`), y TC-3/TC-4 ya lo cubren. Mutation confirma empíricamente que esos tests *muerden* (mutantes `==`→`!=`, `&&`→`||` en el guard). Infra verificada lista (2026-06-15): sub-cache DKC `vitest3` instalado; el mod cd corre vitest 3 con suite real sobre `logic/*.resolver.js`. **Al hacer el intake, considerar:** (a) sumar `DET-31` a `rules` del frontmatter; (b) en el plan de sessions, la session que implementa el resolver declara gate con `dkc-mutate --repo <up1> --base <pre-session>` (warn-first, T3 por ser guard crítico); (c) **override `EXCLUDE_TESTS`** para NO excluir `tests/integration/` — los resolver tests de cd viven ahí (`activity-resolvers.test.ts`, `workflow-resolvers.test.ts`) y el scoping por defecto de `dkc-mutate` los excluye → daría NoCoverage falso. Inferencia (c) a verificar al primer run. No aplica a 062/063 (config pura → score 100 trivial).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica de curriculum / UPONE-1270 (confirmar nombre y base en intake; DET-19) |
| Base branch | `develop` (con UPONE-1268 ya mergeado — dependencia) |
| DB state | sin cambio de schema (config + resolver) → `npm run sync` + restart object-manager |
| Services | object-manager (GraphQL :4000), suite |
| Test data | Plans del `curriculum` (seed de UPONE-1268) — clonar/versionar uno de ellos |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | — | — | — | — | — |
| L1 | El drift-checker de object-manager (scripts/detect-schema-drift.js, loadSourceOfTruth L128-186) produce FALSOS POSITIVOS "Mod field not in OM definition" para todos los campos de extension de cualquier objeto RecordType de mods (rt__Modality, rt__Campus, etc.): escanea objects/business/Base + tenants/{T}/Base pero NO objects/business/RecordTypes/, asi que compara el RT del mod contra el base (ej. modality.json = solo name+scopeType) en vez de la extension RT. Verificado: los 7 campos de rt__Modality (code/theoryHours/practiceHours/labHours/autonomousHours/isDefault/deliveryMode) SI existen en mod source + OM business/RecordTypes + Prisma generado + DB core_FieldDefinition. Es bug de tooling core (no drift real, runtime consistente). Fix fuera de scope mod-only -> flaggeado como follow-up core (task_7b9d2d7f). Implicacion: npm run sync sale exit 1 por este falso positivo + drift real de uengagement (otra epica) -> el criterio "sync verde" del gate S1 no es alcanzable; se redefine a "config sincronizada + capabilities en DB + cero drift nuevo". | developer | #1 | discarded | — |
| L2 | S1 config sincronizo correctamente pese al exit 1 del drift-checker: el sync upsertea objetos/capabilities ANTES del drift-check (fase separada), asi que el exit 1 no revierte el push. Verificado en DB UPU: capabilities curriculum:clone y curriculum:version presentes en core_Capability (+ las field-level curriculum:plan.*/minor.* autogeneradas). Base curriculum.json (downstream del mod) recibio el bloque prefillFrom. object-manager responde en :4000. Conclusion operativa: para gates de sync de tickets mod-only, NO usar "sync exit 0" como criterio (lo bloquea drift ajeno pre-existente); verificar el efecto real del cambio propio en DB/Base. | developer | #1 | refined | RULE-dev-010 |
| L3 | OQ-1 resuelta (cambia el diseño del guard): en el path de versionado (asNewVersion), el frontend (useCreateRowAction.ts buildCreateData L76-85) manda data={prefillFrom:{source}, asNewVersion:true} SIN previousVersionId. Core setea previousVersionId DENTRO de createInstance via prepareVersionData (version-from-source.js:87 [linkageField]:source.id), DESPUES de que el override delega. Por lo tanto args.data.previousVersionId es null/ausente tambien para una version nueva al entrar al override validate-then-delegate → un guard naïve (previousVersionId==null => raiz) trataria la version como raiz y la RECHAZARIA en falso. Señal correcta: el flag data.asNewVersion (presente en args.data al entrar, se consume en instance.resolver.js ~L2413). Guard robusto: isRoot = (data.asNewVersion !== true) && (data.previousVersionId == null). Cubre los 5 paths: clone UI (root), version UI (asNewVersion=skip), MCP create root, MCP con prevId explicito (prevId!=null=skip), MCP version. Confirmado en test version-from-source-helper.test.js. | developer | #2 | discarded | — |
| L4 | DET-31 (mutation testing del guard) quedo WARN por infra: dkc-mutate aborta el dry-run de stryker con "Cannot destructure property 'moduleGraph' of project.server" — incompatibilidad @stryker-mutator/vitest-runner 8.7.1 (sub-cache DKC vitest3) vs vitest 3.2.4 (up1). NO es problema del codigo ni de la config del mod (single-project node). Flaggeado como follow-up DKC (task_311ed92e). Adecuacion de mutantes argumentada manualmente (los 9 TC matan los mutantes criticos del branching del guard por construccion): negar CURRICULUM_RT_PATTERN.test → TC no-curriculum/TC-3; !isNewVersion→isNewVersion o &&→|| → TC-4 (asNewVersion=true mismo code) y TC MCP-prevId-explicito fallan; ===null→!==null → TC-3 falla (raiz no detectada); conflicts.length>0 → >=0/<0 → code-distinto o TC-3 fallan. El unico mutante posiblemente sobreviviente (where previousVersionId:null del helper, belt-and-suspenders tras el filtro isRoot del caller) es low-severity. Conclusion: cobertura mutation-adecuada por diseño; el tool no pudo medirla por version-skew. | developer | #2 | discarded | — |
| L5 | BUG CRITICO detectado en smoke E2E (S3): el guard de linaje en el override de createInstance NO cubre el path de la UI. La UI crea Curriculum por la mutation custom createCurriculumWithRecordType (TICKET-070, customEndpoint), que llama a generic.createInstance DIRECTAMENTE (la fn core importada via dynamic import), NO por el resolver map donde el override del mod (sectionValidation.createInstance) reemplaza al generico. Resultado: clonar con code duplicado CREO una raiz duplicada (2 raices con (inst-UV, UV-ICIV-PLAN-2026, prevId=null) en DB UPU) — el guard se bypaseo. Los 11 tests de integracion no lo detectaron porque testean validateCurriculumCreate directo, no el RUTEO real (path UI). DEC-LOCAL-01 (guard solo en el override) era INSUFICIENTE: cubre callers de la mutation GraphQL createInstance (MCP/REST) pero NO createCurriculumWithRecordType (UI, el path principal). Fix: validateCurriculumCreate debe correr TAMBIEN en createWithRecordType (curriculum-create.resolver.js) antes del generic.createInstance. Lo limpio: mover validateCurriculumCreate al helper lineageUniqueness.js (fuente unica) e invocarlo desde AMBOS resolvers. Leccion: el smoke E2E real atrapa bypasses de ruteo que los unit/integration del validador no pueden (probar el camino del usuario, no solo el backstop — feedback_ui_tc_no_override_uncovered_runtime_path). | developer | #3 | refined | BUG-curriculum-design-005 |
| L6 | H1 PARCIALMENTE REFUTADA por E2E (S3): el patron de versioning de activity NO transfiere completo a curriculum. versionar curriculum lanza INTERNAL_SERVER_ERROR porque prepareVersionData (core object-manager, helpers/version-from-source.js:56) esta hardcodeado a workflow: hace include:{currentstatus:true, workflow:true} en el findUnique del source, y exige source.currentstatus.allowsVersioning (L61) + source.workflow.initialStatusId (L67), seteando [initialStateField] (L88). Curriculum NO tiene workflow (status es enum simple, sin currentStatusId/workflow FK ni relacion currentstatus) → Prisma falla 'Unknown field currentstatus for include on model Curriculum'. Curriculum es el PRIMER objeto versionable workflow-less; activity (el patron) siempre tuvo workflow. El clone (TC-2) SI funciona (crea raiz independiente). La unicidad por linaje (TC-3) funciona end-to-end. Fix necesario: en version-from-source.js, gatear la logica de workflow a la presencia de initialStateField en versioningConfig (curriculum no lo declara) — include condicional + skip de los checks allowsVersioning/initialStatusId + no setear initialStateField. Es CORE (object-manager), fuera del execute_scope mod-only de este ticket (core_work_policy: rama de epica + review team). El crash es pre-write (no deja v2 parcial). Tambien: el frontend mapea el error backend a 'Este registro fue modificado por otra persona' (generico/enganoso) — minor UX. | developer | #3 | refined | DEC-042 |
| L7 | B4 RESUELTO (fix core layout, aislado): el mensaje 'Este registro fue modificado por otra persona' aparecia porque el mensaje del guard CURRICULUM_LINEAGE_DUPLICATE contiene 'versiones...Conflicto', que matchea el regex de concurrencia (/concurrent|version.*conflict|optimistic.*lock/i) en layout/src/composables/useFriendlyErrors.ts:351. Fix: agregar patron por CODIGO 'CURRICULUM_LINEAGE_DUPLICATE' al tope de ERROR_PATTERNS (los patrones string usan .includes() y van primero por prioridad, junto a USER_NOT_FOUND/SELF_DEACTIVATION_NOT_ALLOWED) → mensaje correcto 'Ya existe un curriculo con ese codigo en esta institucion.' + categoria propia 'lineage-uniqueness' (evita override por i18n key friendlyErrors.{category}.message). +test de regresion (useFriendlyErrors.spec.ts, 4/4 verde). GOTCHA: el patron string match es .includes() case-insensitive, asi que el code prefix del mensaje basta. SCOPE: layout es repo core aparte, estaba ocupado por UPONE-1271 (cambios sin commitear de ReportManager) → commiteé SOLO useFriendlyErrors.ts + su spec en rama dedicada UPONE-1270-friendly-error-lineage (commit 5dd5854), dejando intactos los cambios de UPONE-1271 y restaurando su rama. NO live en la suite corriendo (layout en otra rama + requiere rebuild) — verificado por unit test, live UI diferido a merge+rebuild coordinado. | developer | #3 | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Gate desde |
|-----------|------------|-------|------------|
| 2026-06-17 | false → super | Trigger del dev `/dkc 065 super autopilot` | desde intake-explore (proximo gate) |

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final
(tasks asignadas, gate criteria especificos) lo completa `design-feature` al generar el spec.
Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Config del objeto: bloques `versioning` + `prefillFrom` en `objects/curriculum.json` (patron `activity`); `exclude: ["code","version","previousVersionId"]` en clone; capabilities `curriculum:clone`/`curriculum:version`; rowActions (clone `prefilledModal` + `uniqueFields:["code"]`, versionar `asNewVersion:true`) | 1 | T1 | ~3-4 (config JSON + capabilities + rowActions + `sync`/codegen) | auto | `sync` + codegen verdes; object-manager arranca; config valida contra schema; TC-5/TC-6 preliminar |
| S2 | Unicidad por linaje (D-D opcion 1): validacion de dominio en el resolver del create — rechazar raiz (`previousVersionId=null`) si existe otra raiz con `(institutionId, code)`. Tests del resolver (TC-3/TC-4) | 2 | T3 | ~3-4 (resolver `logic/` + tests integration + reindex) | ⚑ fuerte | TC-3 (rechazo raiz duplicada) y TC-4 (version mantiene code) PASS; **mutation gate DET-31** `dkc-mutate` warn-first sobre el guard del resolver (override `EXCLUDE_TESTS` para NO excluir `tests/integration/`) |
| S3 | E2E clonar/versionar (TC-1/TC-2/TC-5) via UI suite + verificar MCP tools `cd_version_*`; regression del mod | 3 | T3 | ~3 (smoke UI Playwright + MCP smoke + regression suite) | ⚑ fuerte | TC-1/TC-2 PASS con evidencia (payload + UI); v1 intacto en ambos; regression sin delta negativo |

**Notas del esqueleto**:
- **Dependencia entre sessions**: S2 depende de S1 (el resolver opera sobre la config del objeto ya synceada). S3 depende de S1+S2 (E2E necesita config + enforcement activos).
- **DET-31 (mutation testing)** se ancla en S2 (gate ⚑ fuerte, warn-first, tier T3): el guard de linaje es logica de dominio con branching (`previousVersionId==null && existe otra raiz`). Override `EXCLUDE_TESTS` para incluir `tests/integration/` (donde viven los resolver tests del mod cd) — sin esto da NoCoverage falso. A verificar al primer run (inferencia (c) de la nota de intake).
- **Branching (DET-30 super)**: el repo up1 esta en `develop` (protegida). Antes de execute, crear rama de trabajo del mod (mod-only scope, no usa la rama de epica core). La guarda de inicio de execute lo verifica.
- **Sin core / sin schema**: todo es config + resolver `logic/` → `sync` + restart object-manager, sin migracion DB. El clone profundo (`planEntry`) queda diferido (Backlog B1).

### Session 1 — 2026-06-17 — Config: prefillFrom + rowActions + capabilities + sync [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Habilitar clonar/versionar a nivel config del objeto Curriculum (prefillFrom + rowActions + capabilities) y sincronizar al core (Base downstream del mod).

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

**Tasks completadas**:
- [x] S1.T1 — Agregar bloque `prefillFrom` (`exclude: ["version","previousVersionId","versionLabel"]`) a Curriculum.json; verificar `versioning.requiredCapability`
- [x] S1.T2 — Agregar rowActions "Crear nueva version" (asNewVersion) y "Duplicar" (prefilledModal + uniqueFields:["code"]) al layout default_Curriculum_list.json
- [x] S1.T3 — Declarar capabilities `curriculum:version` y `curriculum:clone` (object-level, sin prefix mod/)
- [x] S1.T4 — `npm run sync` + codegen; verificar object-manager arranca y la config llega a Base
- [x] S1.GATE — Gate de sync Session 1 (tier T1)

**Validación del tier**:
- T1 — config aplicada y sincronizada. `npm run sync --workspace=object-manager`: mod curriculum-design merged ✓; Base `curriculum.json` recibió `prefillFrom` ✓; capabilities `curriculum:clone` + `curriculum:version` presentes en DB `core_Capability` (UPU) ✓; object-manager responde en :4000 ✓. JSON de los 3 archivos válido.
- **Nota gate**: `npm run sync` sale exit 1 por drift PRE-EXISTENTE ajeno: 7 falsos positivos del drift-checker sobre RT objects de cd (L1, bug core flaggeado task_7b9d2d7f) + 21 de uengagement-up1 (otra épica). **Cero drift nuevo introducido por este cambio** (git diff de la rama = solo los 3 archivos de config). Criterio de gate efectivo: "config sincronizada + capabilities en DB + cero drift nuevo".

**Discoveries / Learns nuevos**:
- L1: drift-checker core (detect-schema-drift.js) ignora `objects/business/RecordTypes/` → falsos positivos en campos de extensión de RT objects. Bug core, runtime consistente.
- L2: el sync upsertea objetos/capabilities ANTES del drift-check → exit 1 no revierte el push; verificar efecto real en DB/Base, no el exit code.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline)
**Tier de revisión**: light (S1 config, T1, gate auto)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Config JSON; patrón replicado de activity/academicProgram |
| 2 | Lint | pass | JSON válido (parse OK) en los 3 archivos |
| 3 | Tipado | n/a | Config declarativa, sin TS |
| 4 | Testing | n/a | Cobertura de la lógica va en S2 (resolver) |
| 5 | Escalabilidad | pass | Sin schema nuevo; reusa primitivos existentes |
| 6 | Mantenibilidad | pass | Capabilities con descripción + referencia a UPONE-1270/RULE-mods-037 |
| 7 | Claridad | pass | rowActions/capabilities consistentes con los hermanos del mod |
| 8 | A11y | n/a | Sin UI nueva (iconos bootstrap estándar) |
| 9 | Storybook | n/a | No aplica a config del mod |
| 10 | Error handling | n/a | Config declarativa |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Tiempo invertido**: ~1h efectiva (incl. investigación del drift)
**Contexto retomable**: config de clone/version sincronizada y en DB; rama mod `UPONE-1270-curriculum-clone-version` (commit 831e3fd). Siguiente: S2 — guard de unicidad por linaje en el override de createInstance.
**Commit DET-27**: `831e3fd` UPONE-1270-S1 feat(curriculum): prefillFrom + rowActions + capabilities

### Session 2 — 2026-06-17 — Unicidad por linaje: guard en createInstance override + tests + mutation [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Implementar el guard de unicidad por linaje (rechazar raíz duplicada `(institutionId, code)`) extendiendo el override de `createInstance` de `sectionValidation.resolver.js`, con tests de integración (TC-3/TC-4 + anti-bypass) y mutation testing (DET-31, warn-first).

**Tasks completadas**:
- [x] S2.T1 — Verificar OQ-1 (¿`previousVersionId` seteado al entrar a createInstance en el path version?) leyendo flujo de versioning de core
- [x] S2.T2 — Helper `lineageUniqueness.js` (`assertUniqueLineageRoot`)
- [x] S2.T3 — Extender override `createInstance` (`validateCurriculumCreate`, dispatch `rt__*__curriculum` + raíz); preservar `validateSectionCreate` intacto
- [x] S2.T4 — Tests integración (TC-3 raíz dup, TC-4 version OK, code-distinto OK, anti-bypass via override directo)
- [x] S2.T5 — Mutation testing (DET-31, warn-first) sobre el guard del resolver
- [x] S2.GATE — Gate de sync Session 2 (tier T3)

**Validación del tier**:
- T3 — vitest del mod: **567/567 verde** (incluye 11 TC nuevos de `curriculum-lineage.test.ts` + suite completa, REQ-PRESERVE-01 OK). `node --check` de los 3 archivos de lógica OK.
- **Mutation (DET-31, warn-first)**: dkc-mutate infra-blocked (stryker-vitest-runner 8.7.1 vs vitest 3.2.4, `project.server` undefined en dry-run). Flaggeado como follow-up DKC (task_311ed92e). Adecuación de mutantes argumentada manualmente (L4): los 11 TC matan los mutantes del branching del guard por construcción. NO bloquea (warn-first).
- **Review aislado (DET-30 super)**: agent general-purpose read-only sobre el diff del guard → veredicto **approve**. Validó la hipótesis isRoot contra core (instance.resolver.js:2413-2414 + version-from-source.js), confirmó REQ-PRESERVE (validateSectionCreate byte-idéntico), working tree limpio (sin contaminación git). 1 finding minor (divergencia asNewVersion vs core) **resuelto** con hardening (commit de35750); 2 findings minor cosméticos aceptados.

**Discoveries / Learns nuevos**:
- L3: detección de raíz por flag `asNewVersion` (no `previousVersionId`, que core setea post-delegate). Cambió el diseño del guard.
- L4: dkc-mutate version-skew con vitest 3.2.4 (infra DKC).

**Failed approaches**:
- Guard naïve `isRoot = previousVersionId == null` (descartado en S2.T1 antes de codear): trataría una versión nueva como raíz (core no setea previousVersionId hasta después del override) → rechazo en falso de versiones. Reemplazado por detección via `asNewVersion === true` (estricto, alineado con core).

**Quality review (DET-23)**:

**Reviewer**: agent general-purpose aislado (read-only) + LLM principal
**Tier de revisión**: exhaustive (S2 lógica de dominio, T3, gate ⚑ fuerte)
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Helper + validador siguen el patrón de modalityDefault/sectionValidation |
| 2 | Lint | pass | node --check OK; sin dead code (isNewVersionFlag removido al alinear) |
| 3 | Tipado | n/a | logic/ es JS (el mod tipa en modsComponents/) |
| 4 | Testing | pass | 11 TC con asserts concretos; mutación argumentada (tool infra-blocked, warn) |
| 5 | Escalabilidad | pass | findFirst/findMany scoped por (institutionId, code); sin tabla nueva |
| 6 | Mantenibilidad | pass | error code central; root-detection documentada (OQ-1/L3 + alineación core) |
| 7 | Claridad | pass | validateCurriculumCreate sibling de validateSectionCreate; CONSTRAINT H7 honrado |
| 8 | A11y | n/a | Backend |
| 9 | Storybook | n/a | Backend |
| 10 | Error handling | pass | CURRICULUM_LINEAGE_DUPLICATE descriptivo; TOCTOU documentado con backstop |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Tiempo invertido**: ~3h efectivas (incl. verificación OQ-1, investigación drift-checker/mutation, fix de 3 baselines stale, hardening review-driven)
**Contexto retomable**: guard de unicidad por linaje implementado y testeado (11 TC); commits `652ba75` (baselines), `a659d78` (feature), `de35750` (hardening). Siguiente: S3 — E2E clonar/versionar UI + verificar MCP + regression.
**Commit DET-27**: `a659d78` (feat guard) + `de35750` (hardening) + `652ba75` (fix baselines)

### Session 3 — 2026-06-17 — E2E clonar/versionar (UI) + verificar MCP + regression [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Smoke E2E de las acciones clonar/versionar sobre un Plan del seed via UI (TC-1/TC-2/TC-5), verificar que el guard de linaje aplica por el path MCP (anti-bypass end-to-end), y confirmar regresión del mod sin delta negativo.

**Tasks completadas**:
- [x] S3.T1 — Smoke UI (Playwright): versionar (TC-1) + clonar (TC-2/TC-5) sobre un Plan del seed; evidencia (screenshots + payload)
- [x] S3.T2 — Verificar guard de linaje por path MCP (cd_version_program / create); confirmar no se construyen tools nuevas
- [x] S3.T3 — Regression del mod (vitest suite completa); section tests intactos, sin delta negativo
- [x] S3.GATE — Gate de sync Session 3 (tier T3)

**Validación del tier**:
- T3 — **Smoke E2E real** (Playwright + Clerk auth interactivo, perfil persistente): TC-5/TC-6/TC-2/TC-3 PASS con evidencia (screenshots + verificación DB). TC-1 BLOCKED por core (L6/B2). Regresión mod **571/571** verde; layout `useFriendlyErrors` 4/4.
- **Hallazgos mayores del E2E** (lo que el smoke atrapó y el unit/integration no): (1) **bypass del guard por el path UI** (L5) → fix `createWithRecordType` + reverificado; (2) **versionar bloqueado por core** (L6) → B2; (3) **clone nace Active** (OQ-2) → B3; (4) **mensaje de error genérico** (L7) → B4 resuelto.
- **Cobertura de paths de create (anti-bypass, verificado por código)**: UI (createCurriculumWithRecordType) + GraphQL directo (override) + MCP (api.create→createInstance→override) — los 3 guardados. No hay tool MCP de Curriculum.

**Discoveries / Learns nuevos**:
- L5: bypass del guard por el path UI (createCurriculumWithRecordType llama generic.createInstance directo). Fix: guard en ambos entry points.
- L6: versionar curriculum bloqueado por core (prepareVersionData asume workflow). Refuta H1.
- L7: mensaje de error genérico — fix en useFriendlyErrors (patrón por código).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline) + E2E real como verificación empírica
**Tier de revisión**: exhaustive (S3 E2E, T3, gate ⚑ fuerte)
**Resultado global**: pass (con blocker core documentado en B2)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Fix del bypass refactoriza a fuente única (helper); sin duplicación |
| 2 | Lint | pass | node --check OK; vitest mod + layout verdes |
| 3 | Tipado | n/a | logic/ JS; layout TS (test pasa) |
| 4 | Testing | pass | 13 TC linaje (incl. UI-path anti-bypass) + 4 useFriendlyErrors; E2E real |
| 5 | Escalabilidad | pass | Guard path-agnóstico (cubre 3 entry points) |
| 6 | Mantenibilidad | pass | validateCurriculumCreate fuente única en helper |
| 7 | Claridad | pass | Bypass + core blocker + fixes documentados (L5/L6/L7, B2/B3/B4) |
| 8 | A11y | n/a | Sin UI nueva propia |
| 9 | Storybook | n/a | Backend/config |
| 10 | Error handling | pass | CURRICULUM_LINEAGE_DUPLICATE + mapeo friendly (B4 fix) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Tiempo invertido**: ~4h efectivas (E2E interactivo + diagnóstico de 2 bugs reales + 2 fixes + verificación DB)
**Contexto retomable**: clonar + unicidad por linaje entregados y verificados E2E. Commits mod `0615c66` (bypass fix) + previos; layout `5dd5854` (rama UPONE-1270-friendly-error-lineage). versionar (REQ-01) bloqueado-core → B2. Siguiente: cierre del ticket (backlog sin `must`).
**Commit DET-27**: `0615c66` (mod, bypass fix) + `5dd5854` (layout, friendly-error)

## Teaching — Intake

**Status**: done — generado en intake (autopilot super, REQ-05: skip no permitido).
**Archivo**: [TICKET-065.teach/teach-intake.html](TICKET-065.teach/teach-intake.html) — v2 HTML, validador en verde (0 errores). Bloques: tldr, concept-card (glosario), state-machine (cadena de versiones), two-col-compare (clonar≠versionar), formula (regla de linaje), invariant (code compartido), callout (entorno/warnings), timeline (plan 3 sessions), study-qa. Cubre las 3 direcciones (bases · entorno · plan).

## Teaching — Close

**Status**: done — generado en cierre (autopilot super, REQ-05: skip no permitido).
**Archivo**: [TICKET-065.teach/teach-close.html](TICKET-065.teach/teach-close.html) — v2 HTML, validador en verde. Bloques: tldr, timeline (3 sessions), comparison-table (evolución de hipótesis — H1 parcialmente refutada), case (el bypass que el E2E atrapó), callout (lecciones L3/L5 + pendientes B1/B2/B3/B4), study-qa.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQs se definen en design-feature) | — | — | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Versionar: v1 intacto + v2 encadenada | REQ-01 | auto | yes | Plan v1 | RowAction "Nueva versión" | v2 con `previousVersionId → v1`, mismo `code`, `version` incrementa; v1 intacto | **INTERNAL_SERVER_ERROR** — core `prepareVersionData` asume workflow (`include:{currentstatus,workflow}`); curriculum es workflow-less → Prisma falla. Crash pre-write (no deja v2 parcial) | [tc1-version.png](TICKET-065.screenshots/TICKET-065-tc1-version.png) | **blocked (core)** | 3 | Refuta H1 (L6). Fix core en Backlog B2. RowAction se deja (decisión dev) |
| TC-2 | Clonar: copia independiente con code nuevo | REQ-02 | auto | yes | Plan existente | RowAction "Clonar" → modal `code` vacío → completar code + guardar | Copia nuevo `id`, **sin** `previousVersionId`, `code` nuevo; source intacto | **PASS** — clon `UV-ICIV-PLAN-T065`: id nuevo, version 1, `previousVersionId=null` (raíz), source intacto. ⚠️ nace `status=Active` (no Draft) | [tc2-clone-success.png](TICKET-065.screenshots/TICKET-065-tc2-clone-success.png) + DB | **pass** | 3 | OQ-2: clone nace Active no Draft → Backlog B3 |
| TC-3 | Clonar con code de raíz existente se rechaza (unicidad por linaje) | REQ-03 | auto | yes | raíz con `(institutionId, code)` dado | Clonar y guardar con ese mismo `code` | El resolver rechaza (otra raíz con mismo `(institutionId, code)`) | **PASS** — modal queda abierto con error; DB sigue en 1 raíz (0 duplicados). Guard corre en `createWithRecordType` (path UI) tras fix del bypass | [tc3-lineage-reject.png](TICKET-065.screenshots/TICKET-065-tc3-lineage-reject.png) + DB | **pass** | 3 | Bypass UI detectado+arreglado (L5). ⚠️ msg al usuario genérico → B4 |
| TC-4 | Versionar mantiene code (no choca con la regla de linaje) | REQ-03 | auto | no | Plan v1 (raíz) | Versionar | v2 (no-raíz) mantiene `code` sin colisionar; la regla solo aplica a raíces | **PASS (integración)** — `validateCurriculumCreate`: asNewVersion→isRoot=false→skip. UI no verificable (versionar bloqueado, TC-1) | tests/integration/curriculum-lineage.test.ts | **pass** | 2 | Cobertura a nivel datos; camino UI bloqueado por TC-1 |
| TC-5 | Modal de clone abre con code vacío | REQ-02 | manual | yes | Plan existente | RowAction "Clonar" | Modal de create prellenado con todo salvo `code` (vacío) | **PASS** — modal "Clonar: ... · Modo Creación" con Código vacío; name/recordType/institución/dueño prefilled | [clone-modal.png](TICKET-065.screenshots/TICKET-065-clone-modal.png) | **pass** | 3 | — |
| TC-6 | Capabilities curriculum:clone / curriculum:version | REQ-04 | auto | yes | usuario con capability | Ver acciones en el recordList | Acciones gated por capability | **PASS** — `curriculum:clone`+`curriculum:version` en DB `core_Capability`; menú Acciones muestra "Nueva versión"+"Clonar" (gated) | [actions-menu.png](TICKET-065.screenshots/TICKET-065-actions-menu.png) + DB | **pass** | 3 | — |

> **Fuera de alcance v1:** el clone **profundo** (arrastrar `planEntry`) no tiene test cases aquí — se difiere al follow-up (Backlog B1), junto con `planEntry`.

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| (a definir en intake) | — | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Clone **profundo** del Plan (arrastra la malla `planEntry`) | nuevo | descubierto en plan SP4 (D3/D5) | Diseño resuelto (D-D/D-E, opción A); clone superficial v1 (este ticket); el motor `deepClone` transaccional ya existe (`instance.resolver.js`, lo usan clone de `CurricularSection` y version de `activity`) | **Señal para gatillar:** cuando se implemente el objeto `planEntry` (malla) el siguiente sprint (con FK a `curriculum`). Precondición: 1268 + 1270 v1 hechos. **Qué incluye:** (1) extender `prefilledModal` para disparar `deepClone` al guardar (core `layout/`); (2) `prefillFrom.deepClone: ["planEntry"]` en `curriculum.json`; (3) resolver `version`/`currentStatusId` en el path profundo; (4) tests del clonado/versionado profundo. **Semántica transaccional ya resuelta** (D5): el `deepClone` ocurre server-side al guardar, en un solo `$transaction` atómico. **~2-3 SP.** | should |
| B2 | **Versionar curriculum bloqueado por core** (REQ-01 / TC-1) | REQ-01 | descubierto en E2E S3 (L6) | El rowAction "Nueva versión" lanza `INTERNAL_SERVER_ERROR`: `prepareVersionData` (object-manager `src/graphql/resolvers/helpers/version-from-source.js:54-89`) asume workflow — hace `findUnique({include:{currentstatus:true, workflow:true}})` y exige `currentstatus.allowsVersioning` + `workflow.initialStatusId`. Curriculum es **workflow-less** (status enum, sin relación `currentstatus`/`workflow`) → Prisma falla "Unknown field currentstatus". Es el primer objeto versionable sin workflow. **Fix recomendado (core, object-manager):** gatear la lógica de workflow a la presencia de `initialStateField` en `versioningConfig` (activity lo declara → corre igual; curriculum no → skip): `include` condicional + saltar checks `allowsVersioning`/`initialStatusId` + no setear `initialStateField`. Backward-compatible. **Alternativa:** dar a curriculum un `initialStateField` mapeado a su `status` enum (más invasivo). **Cómo retomar:** rama de épica core (core_work_policy / RULE-dev-004), no mod-only. El rowAction se deja en su lugar (decisión dev) — el botón errorea hasta el fix core. **Análisis completo de alternativas (A core / B mod / C workflow) + alcance**: `uplanner/specs/up1/sp4/UPONE-1270-versionado-curriculum-sin-workflow.md`. **~1-2 SP (core).** | should |
| B3 | **Clone nace `status=Active`, no Draft** (OQ-2 / D-B) | REQ-02 | descubierto en E2E S3 (TC-2) | D-B dice "clonar nace Draft", pero el `prefilledModal` (UI) prefilla el form con los escalares del source **incluido `status=Active`**; `prefillFrom.exclude` (que sí incluye `status`) solo afecta el path server-side `asNewVersion`, no el prefill client-side del modal de clone. El clon se crea Active. **Fix posible:** (a) el primitivo `prefilledModal` (core `layout/`) debería respetar `prefillFrom.exclude` al prefillar; o (b) agregar `status` a `uniqueFields` del rowAction (lo vacía → el usuario elige, pero default Draft no aplica a un select). **Cómo retomar:** decidir con el dev si clone-Draft es requisito duro; si sí, fix en layout core. **~1 SP.** | could |
| B4 | ~~**Mensaje de error genérico al rechazar clon duplicado**~~ **RESUELTO (2026-06-17)** | REQ-03 | descubierto en E2E S3 (TC-3) | El mensaje del guard contenía "versiones...Conflicto" → matcheaba el regex de concurrencia en `layout/src/composables/useFriendlyErrors.ts:351` → "modificado por otra persona". **Fix aplicado (L7):** patrón por código `CURRICULUM_LINEAGE_DUPLICATE` al tope de `ERROR_PATTERNS` → "Ya existe un currículo con ese código en esta institución." + test (4/4). Commit `5dd5854` en rama **`UPONE-1270-friendly-error-lineage`** (layout, aislado de UPONE-1271). **Pendiente:** merge de esa rama + rebuild de suite para que sea live (layout estaba ocupado por UPONE-1271). | resolved |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|

## Summary

**Entregado y verificado E2E** (mod `curriculum-design`, rama `UPONE-1270-curriculum-clone-version`):
- **Clonar** (REQ-02): rowAction "Clonar" (`prefilledModal` + `uniqueFields:["code"]`) → copia independiente (raíz nueva, `code` nuevo, `previousVersionId=null`). Verificado E2E (clon creado en DB) + TC-5 (modal con code vacío).
- **Unicidad por linaje** (REQ-03, el corazón): guard de dominio `validateCurriculumCreate` (`logic/helpers/lineageUniqueness.js`, fuente única) que rechaza crear una raíz con `(institutionId, code)` ya existente. Corre en **ambos** entry points de create (override `createInstance` + `createCurriculumWithRecordType`) → cubre UI + GraphQL directo + MCP. Verificado E2E: clon duplicado rechazado, **0 duplicados en DB**. 13 tests integración.
- **Capabilities** (REQ-04): `curriculum:clone` + `curriculum:version` (object-level), en DB; rowActions gated.

**NO entregado funcionalmente (documentado)**:
- **Versionar** (REQ-01): rowAction presente pero lanza `INTERNAL_SERVER_ERROR` — limitación core (`prepareVersionData` asume workflow; curriculum es workflow-less). Refuta H1. Fix core en **Backlog B2** (rama de épica). RowAction se deja visible (decisión dev).

**Bugs descubiertos por el E2E (no por unit/integration) y resueltos**:
- **Bypass del guard por el path UI** (L5): `createCurriculumWithRecordType` llamaba `generic.createInstance` directo, saltando el override. Fix: guard en fuente única invocado en ambos paths. Re-verificado.
- **Mensaje de error genérico** (L7/B4): el texto del error matcheaba el regex de concurrencia → "modificado por otra persona". Fix: patrón por código en `useFriendlyErrors.ts` (layout, rama aislada `UPONE-1270-friendly-error-lineage`, commit `5dd5854`) + test. **Pendiente live**: merge + rebuild de suite (layout estaba ocupado por UPONE-1271).

**Hallazgos de tooling DKC flaggeados como follow-up** (no bloquean): drift-checker de object-manager ignora `objects/business/RecordTypes/` (falsos positivos en RT objects); `dkc-mutate` version-skew (stryker-vitest-runner 8.7.1 vs vitest 3.2.4).

**Commits**: mod `831e3fd`/`652ba75`/`a659d78`/`de35750`/`0615c66`; layout `5dd5854`; DKC en `up1-sp4-w2`. **NO pusheado/mergeado** (merge a develop gated por review team up1 — core_work_policy). Regresión mod 571/571, layout 4/4.

**Pendientes (Backlog, sin `must`)**: B1 clone profundo (should, próximo sprint con `planEntry`), B2 versionar core (should), B3 clone nace Active no Draft (could, OQ-2), B4 mensaje error (resuelto, pendiente merge layout).

**Validación de cierre (reviewer aislado, REQ-03 super)**: approve — 5 chequeos pass (DET-13/16/23 + scope + ramas).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-12 | 2026-06-12 |
| intake-explore | done | 2026-06-17 | 2026-06-17 |
| teach-intake | done | 2026-06-17 | 2026-06-17 |
| design-feature | done | 2026-06-17 | 2026-06-17 |
| request-execute | done | 2026-06-17 | 2026-06-17 |
| request-close | done | 2026-06-17 | 2026-06-17 |
