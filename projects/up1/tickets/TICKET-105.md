---
id: TICKET-105
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1378
module: curriculum-design
autopilot: manual
---

# SP7 · Validación no-negativos en campos numéricos del mod (mejoras detectadas de 1378)

> **Asociado a Jira [UPONE-1378](https://u-planner.atlassian.net/browse/UPONE-1378)** (mismo ticket que el editor de prerrequisitos) · épica [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · `layer: mod` · `creates_visual: false`. Se registra como **mejoras detectadas a implementar** derivadas del análisis de P1: el barrido de `minimum: 0` a los campos numéricos de negocio del mod que el editor de requisitos NO crea/edita.
> **Arrastre SP6 → SP7 (2026-07-21).** Nació como split de [TICKET-101](TICKET-101.md) (2026-07-08) para ceñir P1 a la historia; antes era DKC-local sin espejo Jira. **Decisión (2026-07-21):** pasa a SP7 bajo el mismo Jira que prerrequisitos (`UPONE-1378`), anotado como mejoras detectadas a implementar. Junto con [TICKET-101](TICKET-101.md) (el editor) comparten el external `UPONE-1378`.
> **Split de [TICKET-101](TICKET-101.md):** el editor de requisitos conserva el guard `minimum: 0` solo sobre los campos que **él mismo crea/edita** (RT de `requirement` — REQ-09); el barrido al **resto** de los campos numéricos del mod se implementa aquí.

## Archivado

> **Archivado 2026-07-30 (decision del dev).** Este ticket es **trabajo real** (no-negativos en 9 campos numericos del mod + saneamiento del typechecking) pero **no corresponde a la historia original de [UPONE-1378](https://u-planner.atlassian.net/browse/UPONE-1378)** (el editor de prerrequisitos): heredo ese external por arrastre SP6→SP7 como "mejora detectada", no como AC del Jira. Se decide **no ejecutarlo** bajo ese ticket.
>
> - **Spec**: archivada en [`specs/_archive/SPEC-curriculum-design-numeric-nonnegative-typecheck.md`](../specs/_archive/SPEC-curriculum-design-numeric-nonnegative-typecheck.md).
> - **Codigo**: los 9 `minimum:0` se **revirtieron sin commitear**. Cero commits en git (mod ni core). El cambio quedo en `stash@{0}` de `mods/curriculum-design` ("TICKET-105 revert: minimum:0") y la regeneracion del sync en `stash@{0}` de `object-manager`.
> - **BD**: el `npm run sync` pudo escribir regeneracion idempotente a BD de tenants (no revertido; los tenants estaban atrasados, ver BL-4).
> - **Findings preservados**: L1 (drift preexistente de core), BL-4 (coordinacion core, drift baseline 280 findings), BL-3 (paridad client-side en Elric). Si el trabajo de no-negativos se retoma, crear ticket/Jira propio.

## ⛔ Gate de inicio — dependencias

> `depends_on: []`. No comparte archivos con P1 (P1 toca los RT de `requirement`; este ticket toca `activity.json`, `planEntry.json` y los RT de `curricularsection`/`curriculum`) → sin conflicto de merge. Puede ejecutarse en cualquier orden respecto de P1.

## Request

> *(no es un AC original de UPONE-1378; origen: decisión del dev al re-scopear P1, 2026-07-08. Se registra bajo `UPONE-1378` como **mejora detectada a implementar** en SP7, decisión 2026-07-21.)*

Como **configurador curricular**, quiero que ningún campo numérico de input de negocio de la malla (créditos, períodos, pesos, horas, semanas, duraciones, totales) acepte valores negativos, para evitar datos inválidos que rompan cálculos de plan y de sílabo, independientemente del canal (UI, MCP, n8n, bulk).

## Origen y motivo del split

TICKET-101 (P1) incorporó —fuera de las AC de UPONE-1378— una ampliación de alcance (ex-REQ-08) que aplicaba `minimum: 0` a **todos** los campos numéricos de negocio que declara curriculum-design. Al revisar el alcance (dev, 2026-07-08) se decidió que P1 debe quedar **ceñido a la historia**: el editor de requisitos solo garantiza el guard sobre los campos que él crea/edita (los RT de `requirement`, que se quedan en P1 como REQ-09). El resto de los campos numéricos —que P1 no toca— se separan en este ticket para evaluarlos en su propio mérito al cierre del sprint.

## Alcance

**✅ EN ALCANCE — campos numéricos de negocio que declara curriculum-design y que P1 NO crea/edita:**

| Objeto / hijo | Campos | Archivo del mod a editar |
|---|---|---|
| Activity | `credits` | `objects/activity.json` |
| planEntry | `period`, `credits` | `objects/planEntry.json` |
| `rt__EvaluationComponent__curricularsection` | `weight` | `objects/RecordTypes/…` |
| `rt__Session__curricularsection` | `week`, `duration` | `objects/RecordTypes/…` |
| `rt__Content__curricularsection` | `hours` | `objects/RecordTypes/…` |
| `rt__Plan__curriculum` | `totalCredits`, `totalPeriods` | `objects/RecordTypes/…` |

> Paths exactos de los RT a confirmar al tomar el ticket (la tabla de P1 los agrupaba como `objects/RecordTypes/…`).

**⛔ EXCLUIDOS (system-managed):** `version` (Activity, Curriculum) y `position` (planEntry, requirement, CurricularSection, CurricularLink) — los pone el sistema (versioning / orden Composite), nunca van negativos.

**↩️ EN P1, NO aquí:** los RT de `requirement` (`minToSatisfy`, `creditsRequired`, `value`, `thresholdMinGrade`) — los crea/edita el editor de requisitos → se quedan en [TICKET-101](TICKET-101.md) (REQ-09).

## Enfoque técnico (heredado del análisis de P1, verificado 2026-07-07)

- **DET-32 (reuso) — la capacidad YA existe en core, NO se construye motor.** `object-manager/src/graphql/resolvers/jsonFieldValidator.resolver.js:294` (`validateBaseFieldFormats`) enforcea `minimum`/`maximum` sobre campos escalares a nivel API, leyendo `core_FieldDefinition.properties`, que puebla `codegen` desde el JSON. Cubre a todo consumidor que salte Vueform (MCP, n8n, service accounts, bulk). Precedente en uso: `"minimum": 0` en `restrictiondefinition.json` / `contractrestriction.json`.
- **Trabajo DECLARATIVO:** agregar `"minimum": 0` en el JSON del **mod** + `npm run codegen` + `npm run sync`. **Sin migración de columna** (es validación, no cambia el tipo Prisma).
- **Regla de ownership (RULE-dev-004):** la validación vive **dentro del mod**. Se edita el JSON en `mods/curriculum-design/objects/` y el **sync propaga a `object-manager/objects/business/Base/`** (destino del sync, NO se edita a mano). Solo campos que **declara curriculum-design**. `layer: mod` intacto, cero edición directa de core.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | config (propiedad `minimum: 0` en JSON de objetos del mod → sync propaga a core) |
| Modulo principal | curriculum-design (mod) |
| Modulos afectados | curriculum-design (mod, JSON de objetos → sync propaga a core, sin edición directa de core). **Deuda registrada (otro repo, no en alcance):** uengagement-up1 (Offering) — ver BL-1 |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Solo declaración de validación en JSON; la UI existente ya renderiza los campos. |
| Data model | parcial | Se agrega la propiedad `"minimum": 0` a campos numéricos declarados por el mod → `codegen` propaga a `core_FieldDefinition.properties`; `sync` lleva el JSON a core. **Sin migración de columna.** |

## Testing (propuesto)

- Integration por objeto: crear/editar vía API (saltando Vueform) con valor negativo → rechazo con error de validación; valor ≥0 → acepta. Cubrir al menos Activity `credits`, planEntry `period`/`credits`, un RT de `curricularsection` (`weight`) y uno de `curriculum` (`totalCredits`).
- Regression: `npm run codegen` + `npm run sync` sin drift; suites del mod y de object-manager en verde.
- Smoke en UPU: alta/edición de una Activity con `credits` negativo → bloqueado.

## Apartado — Typechecking preexistente del mod (mejora detectada, 2026-07-22)

> **Origen:** al pushear `UPONE-1459` (retiro del workflow relacional), el pre-push quality guard corrió `vue-tsc --noEmit` en modo advisory y expuso errores de tipado **preexistentes** del mod, ajenos a ese retiro. Se registran aquí como mejora detectada bajo `UPONE-1378` (mismo patrón que los no-negativos: mod-only, no era AC original). **No tocan `UPONE-1459`** (su PR queda limpio).

**Por qué no se veían:** `npm test` = `vitest run` (esbuild, sin type-check); no hay gate de `vue-tsc` en el CI del mod; el pre-push hook es advisory (no bloquea).

**Alcance: solo errores propios del mod (bucket B, 58 errores).** EXCLUIDO el ruido del symlink `components/ -> ../../layout/src/components` (~62 errores que pertenecen a `layout/`, CORE; se tratan aparte con un fix de tsconfig-scope, fuera de este ticket por ownership RULE-dev-004).

Clusters (todos `confirmed`; source_ref: `vue-tsc --noEmit` en `mods/curriculum-design`, 2026-07-22):

| Cluster | Archivos | Errores | Causa raíz | Esfuerzo |
|---|---|---|---|---|
| 1 · Wrappers Vueform (`*Element.vue`) | CurriculumMesh, CompositeSectionTree, RichTextRenderer, ActivityStatusBadge, IconPicker, ColorPicker | ~50 (`TS2349` + `TS2578`) | La API de custom-element de Vueform resuelve a `never` en el contexto del tsconfig del mod → cascada "not callable"; los shims `types/vueform.d.ts` / `types/layout-shims.d.ts` quedaron stale; los `@vue-expect-error` de template quedan "unused". **Causa compartida**, no 50 bugs sueltos | Medio / incierto (~0.5-1.5 d, iterar con vue-tsc; riesgo whack-a-mole) |
| 2 · Composables | `useRecurrenceConfig.ts`, `useEnumTransitions.ts` | 4 (`TS2307`) | `useRecurrenceConfig` es **dead code** (0 consumidores en el mod; deps `types/calendar`/`utils/recurrenceExpander` inexistentes → recurrence es de scheduling) → borrar. `useEnumTransitions` → falta `../graphql/objectDefinitionFields` (archivo removido/renombrado) | Bajo |
| 3 · Stories | ActivityStatusBadge.stories, CurriculumMesh.stories | 2 (`TS2322`) | Typing CSF de Storybook (story fn vs `ArgsStoryFn`) | Bajo-medio |
| 4 · Test | `weightedSum.parity.test.ts` | 2 (`TS2322`/`TS2345`) | Genéricos `Map<string\|number>` vs `Map<string>` + callback | Trivial |

**Enfoque (barato-primero):** (1) quick wins clusters 2+4; (2) stories; (3) shim de Vueform del cluster 1; (4) **gatear `vue-tsc --noEmit` en el CI del mod** para que no reaparezca (el fix de fondo es de proceso, no solo estos 58).

- **REQ-TS-01** (`confirmed`): `vue-tsc --noEmit` del mod en **0 errores propios** (bucket B), sin supresión masiva con `@ts-ignore`. El bucket A (symlink layout) queda documentado, no gateado aquí.
- **REQ-TS-02** (`confirmed`): agregar step `typecheck` al CI del mod (bitbucket-pipelines) como gate, para prevenir regresión.

**Testing:** `npm run typecheck` verde para el mod; `npm test` sigue verde; borrar `useRecurrenceConfig` no rompe imports (verificado: 0 consumidores).

**SP:** el estimado actual (2) cubre solo los no-negativos. El cluster 1 es esfuerzo incierto → **recalibrar al planificar** (posible session propia).

## Triage

> Convergido en `intake-explore` (2026-07-29). Re-verificacion de refs contra el codigo actual del repo (`/Users/edobacon/Workspace/uplanner/up1`) — las refs de P1 databan del 2026-07-07/22. S1 (no-negativos): confirmado. S2 (typechecking): evidencia envejecida → re-baseline empirico como primera task de execute (DET-1: `inferred`/`partial`, no `confirmed`).

| # | Hipotesis | Status | Evidencia (capas + ref) |
|---|-----------|--------|-------------------------|
| H1 | El motor de validacion `minimum` YA existe en core y cubre todo canal que salta Vueform (MCP, n8n, bulk) → NO se construye motor (DET-32 reuso) | ✓ confirmed | **backend:** `object-manager/src/graphql/resolvers/jsonFieldValidator.resolver.js:294` (`validateBaseFieldFormats`), aplica el guard en `:326-327` (`if (typeof props.minimum === 'number') subSchema.minimum = props.minimum`). **precedente (objects):** `object-manager/objects/business/Base/restrictiondefinition.json` + `contractrestriction.json` ya usan `"minimum": 0`. 2 capas ✓ |
| H2 | Los 9 campos numericos en alcance (instancias campo-objeto en 6 archivos; 7 tipos de magnitud, 8 nombres distintos porque `credits` esta en Activity y planEntry) existen en el mod y NINGUNO tiene `minimum` hoy | ✓ confirmed | **schema (JSON del mod):** `activity.json:112-117` (credits), `planEntry.json:61-78` (period, credits), `RecordTypes/rt__EvaluationComponent__curricularsection.json:23-28` (weight), `rt__Session__curricularsection.json:11-34` (week, duration), `rt__Content__curricularsection.json:11-16` (hours), `rt__Plan__curriculum.json:19-30` (totalCredits, totalPeriods). Ninguno declara `minimum` (verificado 2026-07-29). |
| H3 | El cambio es DECLARATIVO (agregar `"minimum": 0` al JSON del mod + `codegen` + `sync`), SIN migracion de columna Prisma | ✓ confirmed | **schema+backend:** `minimum` puebla `core_FieldDefinition.properties` (leido por H1), no cambia el tipo Prisma → es validacion, no columna. Precedente `restrictiondefinition.json` lo confirma (existe sin migracion dedicada). RULE-dev-004: se edita el JSON en `mods/curriculum-design/objects/`, el `sync` propaga a `object-manager/objects/business/Base/` (destino, no se edita a mano). |
| H4 | `version` (Activity/Curriculum) y `position` (planEntry/requirement/CurricularSection/CurricularLink) quedan EXCLUIDOS (system-managed) | ✓ confirmed | **diseno:** los pone el sistema (versioning / orden Composite), nunca negativos. Excluirlos evita falsos guardarraíles sobre campos no editados por el usuario. Justificacion 1 capa aceptable (DET-5): es exclusion por ownership del dato, no hipotesis de comportamiento. |
| H5 | Offering (`maxCapacity`, `usedCapacity`) NO entra: lo declara uengagement-up1, no curriculum-design → fuera de ownership (DET-16 propagacion → BL-1) | ✓ confirmed | **ownership (RULE-dev-004):** `mods/uengagement-up1/objects/offering.json` pertenece a otro mod/repo. Se registra como propagacion en BL-1 (`could`, owner: uengagement-up1), no se toca aqui. |
| H6 | El apartado de typechecking (clusters del 2026-07-22) esta ENVEJECIDO: el set real de errores debe re-baselinearse con `vue-tsc` fresco ANTES de spec-ear tasks concretas de S2 | ~ partial → inferred | **evidencia de drift:** `useRecurrenceConfig.ts` YA NO existe (0 consumidores en el repo) → nada que borrar, cluster 2 parcialmente obsoleto. `useEnumTransitions.ts` vive en `layout/src/composables/` (CORE, bucket A excluido) e importa de `../graphql/objectDefinitionFields.ts` que **SI existe** (`layout/src/graphql/objectDefinitionFields.ts`) → el diagnostico del cluster 2 estaba errado. **Plan:** primera task de S2 = re-baseline empirico (`vue-tsc --noEmit` en el mod) que regenera clusters/conteo reales; el resto de S2 se ata a ese resultado. |
| H7 | REQ-TS-02 (gate `typecheck` en el CI del mod) asume un `bitbucket-pipelines.yml` en el mod que NO existe → hay que resolver DONDE corre el CI del mod antes de gatear | ~ partial → needs-decision | **config:** `mods/curriculum-design/` NO tiene `bitbucket-pipelines.yml` (verificado 2026-07-29). Existe en la raiz del monorepo + `object-manager/`, `layout/`, `suite/`. Gap: definir si el gate va en el pipeline raiz (que ejecuta los mods) o si el mod necesita su propio pipeline. Se resuelve en la task de re-baseline de S2 (leer el pipeline raiz). |
| H8 | El script `typecheck` (`vue-tsc --noEmit`) ya existe en el mod | ✓ confirmed | **config:** `mods/curriculum-design/package.json:12` → `"typecheck": "../../node_modules/.bin/vue-tsc --noEmit"`. El binario esta en el node_modules del monorepo. |

### Precondiciones operativas (intake-explore paso 3b)

- **codegen + sync**: `npm run codegen` + `npm run sync` disponibles a nivel repo (CLAUDE.md del proyecto). El flujo declarativo de S1 depende de ambos — verificar drift 0 tras correrlos (task de S1).
- **vue-tsc**: disponible via `mods/curriculum-design/package.json:12` (H8). El bucket A (ruido del symlink `components/ -> ../../layout/src/components`, ~62 errores de CORE) debe EXCLUIRSE del gate del mod — pertenece a `layout/` (RULE-dev-004). Se re-mide en el re-baseline.
- **execute_scope**: declarado en frontmatter (no vacio) — cubre `mods/curriculum-design/` para los campos numericos que P1 no crea/edita.

### Active questions (gaps)

- **H7 — donde gatear el typecheck del mod**: sin `bitbucket-pipelines.yml` propio, decidir pipeline raiz vs por-mod. NO bloquea S1; se resuelve dentro de S2 tras leer el pipeline raiz (task de re-baseline). Marcado `needs-decision`, no `confirmed`.
- **H6 — alcance real de S2**: el conteo "58 errores / 4 clusters" es del 2026-07-22 y ya drifteo. El SP de S2 se recalibra POST re-baseline (primera task de S2). Marcado `inferred`.

## Decisiones del intake

- **DEC-INTAKE-01 — Alcance: S1 + S2 en un solo spec, re-baseline primero.** El dev (2026-07-29, AskUserQuestion) eligio incluir ambos cuerpos de trabajo en este ticket, con la primera task de S2 re-corriendo `vue-tsc` para regenerar el set real de errores (el analisis de clusters de julio ya no cuadra). Alternativas descartadas: (a) split S2 a ticket propio — descartada, el dev prefiere mantenerlos juntos; (b) solo quick-wins de S2 — descartada, el dev quiere el barrido completo tras el re-baseline. Consecuencia: el spec tiene 2 sessions; el SP de S2 queda `inferred` hasta el re-baseline. **Nota SP (DET-26):** el `estimated: 2` del frontmatter cubria solo S1; S2 se recalibra tras la primera task empirica.

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|
| BL-1 | **Deuda de otro repo — no-negativos en Offering (`maxCapacity`, `usedCapacity`).** Los declara **uengagement-up1** (`mods/uengagement-up1/objects/offering.json`), no curriculum-design → fuera del alcance de este ticket por ownership. Aplicar `"minimum": 0` en el JSON de uengagement-up1 cuando ese mod lo tome. Heredado de BL-2 de [TICKET-101](TICKET-101.md). | could (owner: uengagement-up1) | open |
| BL-4 | **Drift preexistente de core vs BD de tenants (coordinacion core, no del mod).** `npm run drift:check` da 110 err/280 findings en el baseline committeado de `develop` (280 SIN mi cambio; el sync de S1.T2 lo bajo a 224). Causa: las BD de tenants estan atrasadas respecto a los objetos, con trabajo acumulado cross-mod (up1-manager layouts, hello-world events, report-builder, offering/scenario polymorphicChildren de 101/102). Requiere re-sync + migracion de tenants (flujo update-repos, `prisma db push --accept-data-loss` por tenant con consent del dev) — RULE-dev-004: coordinacion core, fuera del scope mod-only de este ticket. Bloquea el acceptance "drift:check 0" (REQ-02) hasta resolverse. Detectado 2026-07-30 por diagnostico stash+re-drift. | must (owner: core/plataforma) — bloquea acceptance REQ-02 | open |
| BL-3 | **Paridad de pre-validacion client-side en Elric (up1-mcp) para los 9 campos numericos.** El backend YA rechaza negativos por el guard `minimum:0` (canal MCP cubierto, `createInstance`/`updateInstance`). Pero Elric no lee `fieldDefinitions` (`uplanner/mcp/src/core/filters.ts:95`), asi que no pre-valida client-side estos campos; su `validateNumericFloors` (`requirement-tree-ops.ts:173`) solo cubre `requirement`. Replicar esa pre-validacion para activity.credits/planEntry/RT de curricularsection/curriculum daria mejor UX (rechazo antes de mandar), pero es OTRO repo (`uplanner/mcp`) → fuera del scope mod-only de este ticket. Detectado 2026-07-29 (pregunta del dev). | could (owner: up1-mcp) | open |
| BL-2 | **Gate typecheck en el `bitbucket-pipelines.yml` RAÍZ del monorepo.** REQ-TS-02 se cumple con un gate mod-scoped (dentro de `mods/curriculum-design/`). Si S2.T1 concluye que el único lugar viable para gatear `vue-tsc` es el pipeline raíz (archivo compartido/core-ish, RULE-dev-004), editarlo excede el `execute_scope` de este ticket → requiere OK explícito del dev y tratamiento de trabajo core (análogo a BL-1). Detectado por el gate DET-38 (jueces A+B convergentes, 2026-07-29). | could (requiere OK del dev + política core RULE-dev-004) | open |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | S1.T2: el `npm run sync` surfaceo drift preexistente (72 errores / 224 findings), NO introducido por este ticket. Causa raiz: el core object-manager (rama develop) estaba STALE respecto a los sources de los mods — atrasado varios tickets. El diff de core muestra que activity.json/offering.json ganaron `polymorphicChildren` + `enableDataLog: true` (trabajo de TICKET-101/102 ya cerrados) al correr sync, no solo mi minimum:0. Ademas minimum:0 es propiedad de validacion (core_FieldDefinition.properties), NO cambia la columna Prisma → no puede causar drift schema-vs-BD. Leccion transversal: para tickets mod-only, el acceptance "drift:check 0" (REQ-02) depende de que core este fresh-synced ANTES de correr sync sobre un core stale; correrlo sobre core desactualizado mezcla el trabajo de otros tickets y surfacea un backlog de migracion de tenants que es coordinacion core (RULE-dev-004), no del mod. Verificar el estado de sync de core / coordinar re-sync+migracion (flujo update-repos) antes de exigir drift 0. | developer | #1 | raw | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

2 sessions previstas. **Esqueleto producido por `intake-explore` (2026-07-29).** El detalle final (tasks asignadas, gate criteria) lo completa `design-feature`. S2 puede subdividirse tras el re-baseline si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | No-negativos: `"minimum": 0` en los 7 campos numericos en alcance del mod + codegen + sync + tests de integracion por API (saltando Vueform) | 1 | T3 | agregar `minimum:0` a activity/planEntry/RT de curricularsection/curriculum → `codegen` → `sync` (drift 0) → integration tests (negativo rechaza, ≥0 acepta) + smoke UPU | ⚑ fuerte | drift-check 0, suites del mod y OM verdes, smoke UPU (Activity credits negativo bloqueado) |
| S2 | Typechecking preexistente del mod: re-baseline `vue-tsc` → resolver errores propios (bucket B) → gate CI | 2 | T2 | **T1 = re-baseline** (`vue-tsc --noEmit`, regenerar clusters/conteo reales, excluir bucket A del symlink); luego quick-wins → stories → shim Vueform → resolver H7 (donde gatear el typecheck) | ⚑ fuerte | `vue-tsc` del mod en 0 errores propios (bucket B) sin supresion masiva; `npm test` verde; gate CI decidido y aplicado |

**Notas del esqueleto:**
- **S1 es independiente de S2** (paths disjuntos: S1 toca JSON de objects; S2 toca `.vue`/`.ts`/config del mod) → sin dependencia dura entre ambas. S1 es el corazon del request (UPONE-1378); S2 es la mejora detectada anexada.
- **S2.T1 (re-baseline) es empirico y bloquea el resto de S2** (H6): el conteo "58 errores / 4 clusters" del 2026-07-22 ya drifteo (`useRecurrenceConfig` desaparecio, `useEnumTransitions` es de layout). El SP de S2 se recalibra ahi (DET-26).
- **Numeracion continua (DET-20):** el ticket no tiene `### Session N` previas → el plan arranca en S1.
- **Riesgo:** cluster 1 (shim Vueform) es esfuerzo incierto (whack-a-mole con `vue-tsc`); si tras el re-baseline resulta grande, S2 puede subdividirse (S2 + S3) en design/execute.

### Session 1 — 2026-07-30 12:15 — No-negativos declarativos + regeneracion + validacion runtime [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Declarar `"minimum": 0` en los 9 campos numericos de negocio del mod (6 archivos JSON), regenerar via codegen + sync sin drift, y validar por el path real (API/MCP en UPU) que los negativos se rechazan.

**Tasks completadas**:
- [x] S1.T1 — Agregar `"minimum": 0` a los 9 campos (instancias campo-objeto) en los 6 archivos JSON del mod (Activity.credits; planEntry.period+credits; RT weight/week/duration/hours/totalCredits/totalPeriods)
- [~] S1.T2 — `npm run codegen` + `npm run sync` + `npm run drift:check`: drift 0, sin migracion de columna, minimum propagado al destino del sync en core (sin editarlo a mano)
- [ ] S1.T3 — Validacion runtime por el path REAL (DET-36) en UPU: create/edit negativo rechazado y 0/positivo aceptado (Activity.credits, planEntry, un RT curricularsection, un RT curriculum) via API/MCP + regression guard mod-level (los 9 campos declaran minimum:0)
- [ ] S1.GATE — Gate de sync Session 1 (tier: T3): persistir, correr regression mod+OM verde + smoke UPU, decidir continue/iterate/escalate

### Session 2 — 2026-07-30 12:15 — Typechecking: re-baseline, saneamiento y gate de CI [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Re-baselinear `vue-tsc` en el mod, sanear los errores propios (bucket B) sin supresion masiva, y gatear el typecheck dentro de la frontera del mod (pipeline raiz -> BL-2).

**Tasks completadas**:
- [ ] S2.T1 — Re-baseline empirico: `vue-tsc --noEmit` hoy, regenerar conteo/clusters reales (bucket B), separar bucket A (symlink layout), decidir gate mod-scoped (H7; raiz -> BL-2, no aqui), recalibrar SP de S2
- [ ] S2.T2 — Resolver errores propios del mod (bucket B) sin supresion masiva: quick-wins + stories + shim Vueform (rule-curriculum-design-019) segun el set real de S2.T1
- [ ] S2.T3 — Agregar step `typecheck` (vue-tsc) como gate de CI mod-scoped (NO el bitbucket-pipelines.yml raiz; si es el unico lugar viable -> BL-2)
- [ ] S2.T4 — Completitud (DET-37): docs oficiales del mod (no-negativos + gate typecheck) + KB DKC (RULE del patron minimum:0 + learn del analisis stale)
- [ ] S2.GATE — Gate de sync Session 2 (tier: T2): persistir, correr typecheck 0 propios + npm test verde, decidir continue/iterate/escalate
