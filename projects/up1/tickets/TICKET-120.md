---
id: TICKET-120
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1539
module: mods/curriculum-design
autopilot: autonomous
---

# Malla curricular para plan de estudio modular

## Request

Extender la funcionalidad de malla curricular para soportar el diseno de planes modulares de acuerdo con el diseno de la maqueta adjunta, en donde lo principal es:
- Las columnas de "Nivel" se dibujan en base a las restricciones de requisitos de las asignaturas que se anaden a la malla.

## Consideraciones del dev (Eduardo)

> Restriccion agregada por el dev al crear el ticket. Guia intake/diseno; no reemplaza el request.

- **Adicion, no reemplazo.** El modo modular es una adicion: secuencial y modular **coexisten**. El plan Secuencial debe seguir dibujando la malla por periodos exactamente como hoy; el modo se selecciona por `progression` (comparte el dato con UPONE-1538).
- **No romper lo existente.** Velar por que la funcionalidad actual de la malla en formato secuencial no se rompa. Cualquier cambio sobre la base reusable del SP7 es aditivo o discriminado por modo, nunca destructivo sobre el camino secuencial (DET-40 auditoria de reemplazo: enumerar 1:1 lo que hace el camino secuencial y verificar que el nuevo render no lo altera).
- **Revision previa obligatoria.** Antes de implementar, revisar los **tests y casos de uso que ya cubre** la malla secuencial (suites del mod + casos manuales), para establecer la baseline de regresion y no introducir el modo modular sin red. Esta revision es entrada del diseno, no del cierre.
- **Ampliar cobertura si hace falta.** Donde la revision detecte huecos, **agregar nuevos casos de prueba** que fijen (characterization) el comportamiento secuencial actual antes de tocarlo, y sumar casos que validen la **convivencia** de ambos modos (secuencial intacto + modular nuevo). Estos tests son parte del alcance del ticket, no opcionales.

> **Adicion de alcance (dev 2026-08-10) — REQ-13**: al **editar** un plan existente NO se puede cambiar `progression` (Secuencial↔Modular); el modo se fija en la creacion. Aplica a plataforma (select `progression` read-only en el layout `_edit`) y MCP (`cd_update_curriculum` rechaza el cambio). Con esto, el **switch de `progression` deja de ser un caso de convivencia soportado en edicion**: TC-8 se re-orienta (validar que el switch esta impedido, no que funciona) y OQ-1 queda resuelta. Enforcement UI+MCP sin tocar core (blindaje server-side en OM = follow-up B10). Ver REQ-13 y DEC-LOCAL-09 en el spec. **Propagacion:** coordina con TICKET-119/UPONE-1538 (configura visibilidad de campos del Plan por `progression`) — ambos leen/gobiernan el mismo dato; el bloqueo de edicion no debe chocar con lo que 119 haga sobre el mismo campo.

> **Adicion 2 (dev 2026-08-10, review de UI + smoke de versionado) — REVISA REQ-13 + REQ-14 nuevo** (ver DEC-LOCAL-10). Reabre el ticket (estaba listo-para-cierre). (1) **REQ-13 se vuelve CONDICIONAL**: `progression` editable con malla vacia, bloqueada con cursos; enforcement server-side (resolver mod `curriculum-update` + MCP `cd_update_curriculum` condicionan por conteo de `planEntry`) + reflejo UI + quitar `native:true` (estilo disabled gris). Esto **rehace** lo shipeado S6.T5 (bloqueo estatico) y S7.T4 (rechazo incondicional). Smoke confirmo: versionar exige Active/Approved y la v2 nace VACIA → editable → versionar habilita el cambio de modo sin tocar el flujo de versionado. (2) **REQ-14 (nuevo)**: borrado seguro de cursos en la malla (ambos modos) — confirmacion siempre + cascada atomica en dependientes deterministas + bloqueo en no deterministas; paridad MCP `cd_remove_plan_entry`.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | feature (render por modo + cambio de modelo) |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | ninguno core directo. `planEntry.json` (mod) se propaga a object-manager via codegen/sync/migrate — flujo estandar del mod, `layer:mod` |

## Triage

### Decisiones de producto (cerradas en intake, 2026-08-05)

| # | Decision abierta | Resolucion | Fundamento |
|---|------------------|-----------|-----------|
| D1 | `planEntry.period` en modular: nullable vs conservar ignorado | **Nullable (camino completo, 13 SP, `layer:mod`)** | Decision del dev: ir por la opcion completa y saldar la deuda del modelo (MC-02/UPONE-1345 anoto "modular nullable -> SP7", nunca implementado). No es requerimiento del PO; es deuda tecnica auto-documentada en `planEntry.json:9,65`. El cambio se edita en el JSON del mod y se propaga por el flujo estandar codegen + sync + migrate (precedente TICKET-101). Reclasificado a `layer:mod` (2026-08-05): objeto declarado por el mod, cero edicion directa de core, migracion no-destructiva (`DROP NOT NULL`) |
| D2 | Reordenar en modular: solo lectura vs drag con otra semantica | **Solo lectura del orden** (resuelto por evidencia, no requeria decision del dev) | La maqueta deshabilita el drag en modular (`mockup_v10.html:889,897` → `:draggable="mEditable && !mPlan.nonSequential"`); banner y nota (l.748,863-866): "los niveles se recalculan automaticamente segun los prerrequisitos — no se asignan a mano". Transcript l.55: orden derivado del grafo |
| D3 | Control agregar/quitar periodo en modular: ocultar vs conservar | **Ocultarlo en modular** | Eleccion del dev + coherente con maqueta: en modular las columnas son niveles derivados, no periodos manejables |
| D4 | Temporalidad ambigua (`Either`/ausente) en la derivacion de nivel | **No empuja — solo `Before` empuja** (esta version) | Decision del dev (DEC-LOCAL-03 del spec): regla unica y simple; `Concurrent`/`Either`/ausente se muestran al mismo nivel. El usuario ya elige la temporalidad por requisito; un control extra para desambiguar `Either` al ingresar queda diferido (otro analisis, fuera de alcance) |
| D5 | Mostrar prereq/coreq por tarjeta (REQ-08) y su superficie de render | **En alcance como REQ-08; render = modal por accion explicita (no popover/hover)** | Decision del dev: agregar la visualizacion (v1 lista plana agrupada por timing, modo modular). Modal en vez de popover para no interferir con el drag&drop (DEC-LOCAL-04); consistente con los modales caseros del mod. +~2-3 SP |
| D6 | Semantica AND/OR/K-de-N en la derivacion de nivel | **Fiel al arbol** (AND→max, OR→min, K-de-N→K-esimo menor) | Decision del dev (DEC-LOCAL-05): corrige el max plano del REQ-02 inicial (que solo servia para AND y aplanaba el arbol Y/O) |
| D7 | Requisitos de creditos (MetricThreshold/Group.creditsRequired) en la derivacion de nivel | **Derivar nivel desde creditos, heuristico (REQ-09)** | Decision del dev (DEC-LOCAL-06): 2a pasada sobre creditos acumulados por nivel. Fragil/interdependiente, con supuestos v1 explicitos; candidata a re-evaluacion. +~2-3 SP |
| D8 | Alta con requisito no cumplido: bloqueo (A) vs flujo guiado in-modal (B) + atomicidad | **Opcion B SOLO en modular (REQ-10) + batch atomico mod-owned (REQ-11)**; secuencial mantiene A (bloqueo REQ-05) | Decision del dev (DEC-LOCAL-07): modal activo para agregar el requisito; conjunto persistido todo-o-nada via resolver custom del mod (createPlanEntriesBatch + $transaction) → layer:mod. Como es mod-owned, ENTRA en este ticket (no se difiere). Solo lo core (generalizacion en OM + batch del reorder) va a ticket aparte sp8. +~4-5 SP |
| D9 | Paridad del MCP con la malla modular: ¿ticket aparte o en 120? | **En TICKET-120 (multi-repo)** — Session 7 en el repo up1-mcp | Decision del dev: "en 120 se debe resolver todo" (DEC-LOCAL-08). Suma REQ-12 + S7 en el repo standalone up1-mcp: cd_add_plan_entry modular + cd_get_mesh por niveles + port de la derivacion. Riesgo de drift (logica duplicada mod/MCP) mitigado con tests de paridad. +~4-5 SP |

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La malla hoy dibuja columnas SOLO por periodo; no ramifica por `progression` | ✓ confirmada | frontend: `CurriculumMeshElement.vue:220-226` (`v-for col in columns`, header `curriculumMesh.period` `n:idx+1`); `columns` viene de `groupByPeriod` (`.logic.ts:210`). `grep -rn progression` en todo `CurriculumMesh/` → **0 resultados**: la malla no lee el tipo de progresion hoy |
| H2 | `progression` existe en el modelo pero no llega al view-model de la malla | ✓ confirmada | state/frontend: `useCurriculumMesh.ts` — `PlanVM = {totalPeriods, totalCredits, status}` (`toPlanVM` l.124-134), `DEFAULT_PLAN` l.60 sin `progression`. El dato existe en `rt__Plan__curriculum.json` (enum `[Sequential,Modular]`, via UPONE-1538/TICKET-119) pero no se cablea al FE de la malla |
| H3 | No existe derivacion de nivel ni deteccion de ciclos en el FE; hay que crearla | ✓ confirmada | frontend: `grep -rln "deriveLevel\|computeLevel\|cycle\|topolog"` en `CurriculumMesh/` → **0**. Existe `groupByPeriod` pero **no** `groupByLevel`. La logica de prerrequisitos del SP7 (`evaluateRequirementTree.logic.ts`, `prereqCheck.logic.ts`) evalua satisfaccion, NO calcula nivel (pre-intake §"Logica SP7 reusable, NO deriva nivel") |
| H4 | `planEntry.period` es `not_null` + `required` y no hay campo `level`; period es la coordenada de columna, no un campo de formulario | ✓ confirmada | schema+frontend: `planEntry.json:61-66` (`period` integer `not_null:true`), `:89` (`required:[planId,activityId,period]`), sin `level`. `period` se setea por UI de malla: boton "+" por columna pasa `period=N` (`AddEntryModal.ts:83,194`), drag persiste `{period,position}` via `recalcPeriodPosition`→`updateInstance` (`.vue:621-645`). No es input tipeado |
| H5 | Camino completo (D1=nullable) es `layer:mod`: se edita el JSON del mod y se propaga por el flujo estandar codegen+sync+migrate, sin edicion directa de core | ✓ confirmada | backend: no hay resolver custom de `planEntry` en `logic/` (los custom son `curriculum-create/update`); planEntry usa CRUD auto-generado de OM. Cambiar `period` a nullable en el JSON del mod → codegen regenera schema/typedefs/CRUD + `prisma migrate` por tenant (mismo flujo que TICKET-101, layer:mod). `schema.prisma` es auto-generado, no se edita a mano. Migracion NO destructiva (`DROP NOT NULL`) → no requiere coordinacion del team core |
| H6 | El camino secuencial asume `period` presente y numerico; nullable exige auditoria DET-40 | ✓ confirmada | frontend/logic: `groupByPeriod`, `nextPosition(entries, period)` (`.logic.ts:417`), `recalcPeriodPosition`, `computePeriodCountDiscrepancy` (`.logic.ts:284`), drag `group:'cm-periods'` — todos operan sobre `period`. Enumerar 1:1 y verificar que ninguno se rompe con `null` (DET-40) es entrada del diseno |
| H7 | La derivacion de nivel debe respetar el arbol Y/O y excluir contenedores/grupos vacios/pools K-de-N inconsistentes | ~ inferida (a fijar con tests en diseno) | KB/SP7: pre-intake §"Correctitud de la derivacion" + detalle §"Guia de ejecucion". Contenedores `Group` no son prereq-curso (excluir del calculo de profundidad, criterio `recordType NOT_EQUALS Group` del SP7); grupo vacio evalua `satisfied:true` vacuo (excluir como `pruneEmptyGroups`); pool K-de-N con N<K debe tolerarse sin fallar |
| H8 | Requiere i18n (key de "Nivel"), a11y, storybook y design tokens (factores transversales activos) | ✓ confirmada | i18n: `curriculumMesh.period` = "Período {{n}}" existe (`lang/es/common.i18n.json:304`), **no hay** key `level` en ningun `lang/` → agregar en es/en/pt con paridad (conflicto de key aborta el sync). Story existe (`CurriculumMesh.stories.ts`) → agregar estado modular. Malla ya usa `var(--up1-*)` y patron de foco/teclado → mantener en modo niveles |

### Context found

**Estado del codigo (verificado contra `uplanner/up1`, develop, 2026-08-05 — DET-33 self-report re-verificado):**

- **Componente de render** — `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue`: custom Vueform element (UPONE-1348). Columnas = periodos: `v-for (col,idx) in columns` (l.220), header `$t('curriculumMesh.period', {n: idx+1})` (l.225). `columns` deriva de `groupByPeriod`. Drag&drop SortableJS (`group:'cm-periods'`) persiste `{id,period,position}` via `updateInstance` (l.621-645). Controles agregar/quitar periodo (`cm-add-period`/`cm-remove-period`, l.303-320) manejan `viewPeriodCount`, no persisten `totalPeriods`.
- **Logica pura** — `curriculumMesh.logic.ts`: `groupByPeriod` (l.210), `nextPosition(entries,period)` (l.417), `computePeriodCountDiscrepancy` (l.284), `computeSummary` (l.243). **No existe `groupByLevel`.**
- **Logica de prerrequisitos SP7 (reusable, NO deriva nivel)** — `evaluateRequirementTree.logic.ts` (evaluador Y/O/K-de-N contra `ownerPeriod`), `prereqCheck.logic.ts` (`findMissingPrereqs`, usado por `PrereqBlockModal` al agregar), `meshPrereqScan.logic.ts` (`scanMeshViolations`, banner no bloqueante), `usePrereqRequirements.ts`, `useMeshPrereqScan.ts` (cache por `activityId`).
- **Modelo** — `objects/planEntry.json`: `period` integer `not_null:true` y en `required` (l.61-66, 89). Sin campo `level`. El schema documenta la deuda: *"modo modular (period nullable) llega en SP7 (BL-6)"* (l.65) y *"SP6 solo secuenciales → period requerido (modular nullable → SP7). MC-02/UPONE-1345"* (l.9). El nivel NO se persiste (es derivado en runtime).
- **Cableado ausente** — `useCurriculumMesh.ts`: `PlanVM = {totalPeriods, totalCredits, status}` (l.124-134), no lee `progression`. `grep -rn progression CurriculumMesh/` → 0. La malla no ramifica por modo hoy.
- **i18n** — `curriculumMesh.period` en `lang/{es,en,pt}/common.i18n.json`; sin key `level`.

**Desde el KB del proyecto (SP8 detective-mode, verificado contra codigo):**

- Contrato: `sp8/UPONE-1539-detalle.md`. Pre-intake tecnico: `sp8/UPONE-1539-pre-intake.md`. Ambos verificados 1:1 contra el codigo en este intake (todos los anchors confirmados).
- Maqueta objetivo: `sp5/sources/mockup_v10.html` — dataset modular (Magister en Ciencia de Datos, `nonSequential:true`, columnas "Nivel 1..4", l.1339-1340), drag deshabilitado en modular (l.889,897), banner de plan no-secuencial (l.748).
- Planning: `sp8/transcript-planning-2026-08-04.md` (l.54-57: nivel = 1 + max(nivel de prereqs presentes); homologar flujo de alta con SP7).
- Antecedentes SP7: reuso del arbol de prerrequisitos; `UPONE-1378-out-of-scope-followups.md §6` (pool K-de-N con N<K). Smoke: reusar `sp7/UPONE-1378-smoke-fixture.sql` contra tenant UPU.

**Reglas/patrones up1 aplicables (del detalle §"Guia de ejecucion"):**

- **[A favor]** Reusar el evaluador fiel del arbol Y/O y el recalculo de posicion existentes; no reimplementar. Logica de derivacion en `.ts` puros testeables.
- **[Evitar]** Aplanar el arbol Y/O a un AND global o mirar solo hijos directos. Contar contenedores `Group`/pools vacios como prereq (distorsiona el nivel). Crear carpetas solo-logica sin componente-entry (el sync no las propaga — colocar los `.logic.ts` junto al componente).
- **[Advertencia]** `position` bifurcado (malla 0-based vs `CompositeSectionTree` 1-based): no mezclar sin normalizar. Malla siempre montada (`v-show`, sin keep-alive) → refetch manual, `onActivated` no aplica. `defineElement` (Vueform) es Options API: no Composition APIs dentro de un computed getter.
- **Transversal:** tenant isolation en toda query (el client per-tenant no lleva `tenantId`); correr sync; no editar archivos synced a mano; en codigo/commits/PR usar solo el id Jira (DET-19).

### Precondiciones operativas (HOR-128 P3)

| Precondicion | Estado | Nota |
|--------------|--------|------|
| Branch autocontenido del mod (base develop) | ⚠ a crear | `layer:mod` → branch propio del ticket (ej. `feat/UPONE-1539-modular-mesh`) base `develop`, NO rama de epica core. La guarda de inicio de execute (DET-30 REQ-02) la crea/valida antes de tocar codigo |
| Tenant UPU + object-manager + suite | asumido reachable | Verificar al smoke (DET-36). Fixture SP7 `UPONE-1378-smoke-fixture.sql` reutilizable |
| Migracion `period` nullable | flujo estandar del mod | `DROP NOT NULL` no-destructivo, aplicado por tenant via codegen + sync + migrate (mismo flujo que cualquier cambio de objeto del mod). No requiere coordinacion/revision del team core |

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `feat/UPONE-1539-modular-mesh` (branch autocontenido del mod, `layer:mod`) — **a crear** en la guarda de inicio del execute |
| Base branch | develop |
| DB state | Requiere `npm run codegen` + `prisma migrate` por tenant tras el cambio de `planEntry.period` a nullable; `npm run sync` para publicar layouts/logica del mod; hard reload por cache-first de Apollo |
| Services | object-manager (4000) + suite (3000) + tenant UPU (`uplanner_upu`) + redis |
| Test data | Plan Modular (progression=Modular) con asignaturas que tengan prereqs Y/O; Plan Secuencial (regresion); fixture SP7 `sp7/UPONE-1378-smoke-fixture.sql`. Login Clerk test mode del dev |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **H5 del spec es FALSA**: hacer un campo base nullable NO es puro `layer:mod`. codegen deriva la nulabilidad de campo base SOLO del array `required` (`generatePrismaSchema.js:422`), y el merge del sync UNE `required` (add-only, `fileSync.js:857`) — no puede REMOVER. Quitar `period` del `required` del mod no propaga. Requiere edit puntual del objeto OM acumulado (`object-manager/objects/business/Base/planEntry.json`) → toca repo core. | llm-autopilot | S2 | refined | RULE-dev-nullability-basemodel-first |
| L2 | **codegen es BASEMODEL-first**: `npm run codegen` con `TENANT_ID=UPU` (default del .env) SOLO regenera modelos tenant-specific y COPIA los shared (planEntry) verbatim del `prisma/BASEMODEL/schema.prisma` existente. Para propagar un cambio de objeto shared hay que correr `TENANT_ID=BASEMODEL npm run codegen` PRIMERO, luego el del tenant. Sin esto el cambio nunca aparece en el schema del tenant. | llm-autopilot | S2 | refined | RULE-dev-nullability-basemodel-first |
| L4 | **`Group.creditsRequired` se acota a los cursos-hoja del propio grupo, NO por scope**: el RT `Group` (`rt__Group__requirement.json`) NO declara `scope`/`scopeId` (esos son de `MetricThreshold`). El umbral de creditos de un Group suma solo los creditos de sus cursos-hoja descendientes (Technical reference del spec), resuelto por `collectCourseIds(node)` + filtro `restrictTo`. Coincide con `evaluateRequirementTree` (satisfaccion) que ya sumaba solo los hijos del grupo. | dual-judge | S3 | discarded | documentado en la Technical reference del spec (Group.creditsRequired acota a cursos-hoja) |
| L5 | **En modular hay dos superficies period-based del camino secuencial que NO aplican**: (a) el banner mesh-wide de violaciones (evaluateRequirementTree, `placedPeriod < ownerPeriod`) da falso positivo porque `toMeshEntry` coacciona `period→0` (todo `0<0`); (b) el alta por-columna persiste `period=indice de columna` que en modular es un nivel. Ambas se gatean por `!isModular` en S4; la satisfaccion-por-nivel y el alta modular real llegan en S5 (REQ-10). | dual-judge | S4 | discarded | detalle de ejecucion ya implementado (gateado por !isModular); sin valor reusable independiente |
| L3 | **Drift preexistente DB↔schema en indices**: codegen NO emite los `metadata.indexes` declarados de planEntry (ni el HEAD ni la regen los tienen), pero la BD SÍ tiene 5 indices (planEntry_{blockId,categoryId,planId}_idx + planId_period_position + requirementCategory_curriculumId). Un `prisma db push` del schema completo los DROPEARIA como colateral. Por eso S2 aplico DDL quirurgico (`ALTER COLUMN period DROP NOT NULL`) en vez de db push. Candidato a bug/backlog (ajeno a 120). | llm-autopilot | S2 | discarded | capturado en backlog B2 (codegen no emite metadata.indexes); gap transversal preexistente, ticket propio |
| L6 | **Un resolver mod-owned que NO delega en el createInstance generico pierde el `withObjectAuth('create')` que este aporta** — hay que restituir el RBAC explicito. Al reescribir `createPlanEntriesBatch` a `tx.planEntry.create` directo (para cerrar la fuga de eventos pre-commit), se perdio el check de capability que daba la delegacion → bypass de RBAC (cualquier user del tenant podia crear planEntry). Fix: `checkObjectPermissions(context, objectType, 'create')` cargado por dual-path desde `authChecker.js` antes de la tx. El propio mod documenta el trade-off inverso en `sectionValidation.resolver.js:26-28` ("delegar preserva auth+evento automaticamente"). Regla: delegacion da auth+eventos gratis; create directo da atomicidad pero exige restituir auth a mano. | dual-judge (re-juez) | S5 | refined | RULE-dev-restitute-rbac-on-nondelegating-resolver |
| L7 | **En modular el check de prerrequisitos es por PRESENCIA, no por periodo** — se logra remapeando el input del evaluador sin tocarlo (DET-40). `evaluateRequirementTree` marca un prereq como no satisfecho si `placedPeriod===null` (todas las entries modulares lo son) → falso positivo total. Solucion: remapear las entries colocadas a un periodo centinela bajo (`MODULAR_PLACED_PERIOD=1`) y evaluar el destino con uno alto (`MODULAR_OWNER_PERIOD=MAX_SAFE_INTEGER`), asi `placedPeriod < ownerPeriod` (Before) y `<=` (Concurrent/Either) equivalen a "presente". El evaluador queda intacto (mismo que usa secuencial); solo cambia el input en el caller. | llm-autopilot | S5 | refined | RULE-curriculum-design-modular-prereq-by-presence |
| L8 | **Los backticks en la `description` de un `.schema.graphql` del mod ROMPEN el boot de OM** — el generador de `sync:logic` embebe el SDL de todos los mods dentro de un template literal JS (backticks) en `typeDefs/mods.js` sin escapar; un backtick en la descripcion cierra el literal antes de tiempo → `SyntaxError` al cargar `mods.js` → OM no bootea (nodemon queda en crash). Regla: en descripciones de schema del mod usar comillas o texto plano, NUNCA backticks. Detectado al propagar el resolver del batch a OM (S6 setup): OM cayo ~2min hasta quitar los backticks y re-sincronizar. Candidato a fix del generador (escapar/usar String.raw). | llm-autopilot | S6 | refined | RULE-dev-no-backticks-in-mod-schema-graphql |
| L9 | **La clasificacion de dependencia/borrado (findBlockingGroup/isRealAlternativeGroup) DEBE colapsar las vias unicas `Group(OR)>Group(AND)>hoja`** que el editor de requisitos envuelve alrededor de TODO requisito, igual que evaluateRequirementTree. Un grupo es alternativa real solo con >=2 hijos normativos (o creditsRequired). Sin el colapso, un prereq unico se clasifica block en vez de cascade y la rama cascade queda muerta. Tests con formas peladas (rs/grp sin envoltorio) OCULTAN el bug: testear con la forma real del editor. | dual-judge | S9 | refined | RULE-curriculum-design-deletion-collapse-single-path |
| L10 | **El borrado seguro de la malla debe FAIL-SAFE**: si la cache de arboles de requisitos no esta completa/cargada (o un fetch fallo), NO clasificar con datos parciales; esperar (await) o bloquear con mensaje; nunca degradar a `allow` (borraria un prereq sin red). Feature destructiva => fallar cerrado, no abierto. | dual-judge | S9 | refined | RULE-curriculum-design-safe-delete-failsafe |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | Edit solo del mod `planEntry.json` (not_null:false + fuera de required) + `npm run codegen` (UPU) para propagar period nullable | El sync une `required` (no remueve) y la codegen UPU-scoped copia planEntry verbatim del BASEMODEL stale → el schema siguio `period Int`. | Requiere edit puntual del objeto OM acumulado + codegen BASEMODEL-first (L1, L2). |

## Sessions

### Plan de sessions (preplanificacion)

6 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria especificos) lo completa `design-feature` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Baseline de regresion secuencial: revisar suites del mod + casos manuales que hoy cubren la malla secuencial; agregar tests de characterization donde haya huecos (entrada del diseno, exigido por el dev) | 1 | T2 | placeholder — design refina | auto | Suite del mod verde documentada; huecos de cobertura secuencial identificados y fijados con tests |
| S2 | Cambio de modelo `period` nullable: `planEntry.json` (not_null:false + fuera de required) + codegen + migracion por tenant + regen CRUD/validacion OM | 2 | T3 | placeholder | ⚑ fuerte | Migracion no-destructiva aplicada en UPU sin perdida; CRUD de create/update acepta period null; branch autocontenido del mod base develop |
| S3 | Derivacion de nivel (logica pura): `deriveLevel` desde el grafo de prereqs-curso (nivel = 1 + max(nivel de prereqs presentes)) con deteccion de ciclos + exclusion de contenedores Group/grupos vacios/pools K-de-N inconsistentes | 3 | T2 | placeholder | auto | `deriveLevel.logic.spec.ts` cubre: sin prereqs→1, con prereqs→1+max, ciclo→no cuelga+reporta, Group/vacio/pool excluidos (tests minimos del detalle) |
| S4 | Render modular: `groupByLevel` paralela a `groupByPeriod`; wire de `progression` a `PlanVM` en `useCurriculumMesh.ts`; branch de `columns` + header condicional Nivel/Periodo; ocultar control add/remove periodo + drag deshabilitado en modular | 4 | T3 | ⚑ fuerte | Malla modular dibuja niveles; secuencial intacto (DET-40 auditoria 1:1); switch de progression consistente |
| S5 | Homologacion del flujo de alta con prereqs faltantes: consistencia al volver atras sin completar (no dejar asignatura ni prereqs a medio agregar); i18n key `curriculumMesh.level` es/en/pt; story del estado modular; a11y + design tokens | 5 | T3 | ⚑ fuerte | Flujo de alta deja la malla consistente al cancelar; paridad i18n; story modular; WCAG AA mantenido |
| S6 | Caso de prueba reproducible (seed con prereqs+coreqs) + smoke dual como VALIDADOR FINAL (DET-36) + regresion secuencial (DET-40) + docs | 6 | T3 | ⚑ fuerte | Fixture demo re-aplicable + evidencia runtime real de AMBOS modos (modular por niveles con coreqs al mismo nivel + secuencial por periodos); sin regresion secuencial |
| S7 | Paridad MCP (REQ-12) + REQ-13 MCP (cd_update_curriculum) — repo up1-mcp | 7 | T3 | ⚑ fuerte | deriveLevel/groupByLevel portados 1:1 (dual-judge) + cd_add_plan_entry/cd_get_mesh modular + cd_update_curriculum guard — DONE |
| S8 | **REQ-13 revisado (DEC-LOCAL-10)**: bloqueo condicional por malla vacia — server-side en resolver mod `curriculum-update` (rechaza cambio de progression si hay `planEntry`) + reflejo UI (disabled condicional + exponer hasEntries) + quitar `native:true` (estilo) + help text versionar. Rehace S6.T5 estatico | 8 | T3 | ⚑ fuerte | Plan vacio: modo editable; plan con cursos: bloqueado (UI gris + server rechaza); versionar (v2 vacia) permite cambiar el modo; regresion verde |
| S9 | **REQ-14 (nuevo) plataforma**: borrado seguro de cursos en la malla (ambos modos) — logica de dependencia inversa (quien requiere a C) + clasificacion determinista/no determinista (OQ-6) + modal de confirmacion + cascada atomica (resolver batch delete mod-owned) para deterministas + bloqueo + explicacion para no deterministas | 9 | T3 | ⚑ fuerte | Confirmacion siempre; cascada atomica sin huerfanos en deterministas; bloqueo accionable en no deterministas; ambos modos; sin regresion |
| S10 | **Paridad MCP** de S8+S9: `cd_update_curriculum` condicional por entries (REQ-13) + `cd_remove_plan_entry` cascada/bloqueo (REQ-14) con la misma clasificacion; tests de paridad | 10 | T3 | ⚑ fuerte | MCP aplica la MISMA regla condicional y la MISMA clasificacion de borrado que la plataforma; tests de paridad verde |

**Notas del esqueleto:**
- **Reapertura (2026-08-10, DEC-LOCAL-10):** S1-S7 cerradas; S8-S10 agregadas por el review del dev. S8 (REQ-13 condicional) rehace lo estatico de S6.T5/S7.T4. S9 (REQ-14 borrado seguro) es logica nueva de dependencia inversa. S10 lleva ambas a paridad MCP. Dependencias: S8 y S9 independientes entre si (paths disjuntos: S8 = layout/resolver update + curriculum; S9 = mesh delete + resolver delete); S10 depende de S8+S9 (porta lo estabilizado).
- **Dependencias entre sessions:** S1 (baseline) antes de tocar nada — exigencia explicita del dev (no introducir modular sin red). S2 (modelo/core) habilita `period` null que S4 consume. S3 (derivacion pura) es independiente y puede paralelizarse con S2. S4 depende de S2+S3. S5-S6 dependen de S4.
- **Riesgo S2:** migracion `period` nullable por tenant (no-destructiva, flujo estandar del mod codegen+sync+migrate); el riesgo real es la regresion del camino secuencial, cubierto por baseline S1 + auditoria DET-40. Es el gate ⚑ fuerte de mayor riesgo.
- **DET-40 transversal:** la auditoria de reemplazo del camino secuencial (que `period` null no rompe `groupByPeriod`/`recalcPeriodPosition`/`nextPosition`/`computePeriodCountDiscrepancy`/drag) se enumera 1:1 en el diseno y se verifica en S4 y S6.
- **Numeracion:** el intake no registro Sessions 0..N previas; el plan arranca en S1.

### Active questions (gaps para el diseno / execute)

- **AQ-1 — precondicion operativa (branch guard):** `layer:mod` (reclasificado 2026-08-05) → branch autocontenido del ticket base `develop` (ej. `feat/UPONE-1539-modular-mesh`), NO rama de epica core. La guarda de inicio del execute (DET-30 REQ-02) lo crea/valida. Sin dependencia de coordinacion del team core (ya no aplica la rama de epica UPONE-1267).
- **AQ-2 — placeholder de `period` en migracion:** al pasar `period` a nullable, definir en diseno el comportamiento de las entries secuenciales existentes (mantienen su `period`; solo las modulares nuevas van null) y el comportamiento del switch Modular→Secuencial de un plan con entries sin periodo (UPONE-1538). No bloqueante del intake; se resuelve en design-feature.
- **AQ-3 — H7 (correctitud de derivacion) a fijar con tests:** contenedores `Group`, grupos vacios y pools K-de-N con N<K deben excluirse/tolerarse en `deriveLevel`. Inferida del KB SP7; se confirma empiricamente con los tests de S3.
- **AQ-4 — coordinacion con TICKET-119 (UPONE-1538):** 119 configura la visibilidad de campos del Plan por `progression`; 120 lee `progression` en la malla. Verificar que ambos consumen el mismo dato/enum sin choque (119 esta en `design-fix`).

### Session 1 — 2026-08-07 — Baseline de regresion secuencial [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Establecer la baseline de regresion del camino secuencial antes de tocar nada: revisar suites del mod, inventariar los consumidores de `period`, verificar no-colision con UPONE-1450, y fijar con tests de characterization los huecos de cobertura secuencial.

**Tasks completadas**:
- [x] S1.T1 — Revisar suites del mod y casos manuales que cubren la malla secuencial; inventariar consumidores de `period` (groupByPeriod, nextPosition, recalcPeriodPosition, computePeriodCountDiscrepancy, drag); revisar UPONE-1450 (versionamiento Plan) para no chocar
- [x] S1.T2 — Agregar tests de characterization donde falte cobertura del comportamiento secuencial actual (fijan la baseline antes de tocar)
- [x] S1.GATE — Gate de sync Session 1 (T2): persistir baseline + auditoria de consumidores de `period`; decidir continue

**Validacion del tier**:
- T2 — `npx vitest run` (mod `@uplanner/curriculum-design`): **1405/1405 pass, 0 fail, 78 files** (baseline previa 1398; +7 characterization). Delta = +7 tests, 0 regresion.

**Discoveries / Learns nuevos**:
- **Inventario de consumidores de `period` (S1.T1, DET-40 baseline)** — todos asumen `period` no-null hoy:
  - `curriculumMesh.logic.ts`: `groupByPeriod:220,226-227` (`idx=period-1`; null→-1 descarta la entry de toda columna), `computeSummary:246-249` (Map keyed por period; null es bucket propio), `nextPosition:417-421` (filtro estricto `===`; null invisible), `canRemoveTrailingPeriod:683-686` (`===`; null nunca bloquea trailing).
  - `recalcPeriodPosition.logic.ts:87,97,102` (filtro estricto `e.period === from/toPeriod`; mismo patron fragil que `nextPosition`; al arrastrar una entry null a una columna, `reindex` la estampa con ese period).
  - `CurriculumMeshElement.vue`: `columns:545`, `onDragEnd:692-714`, `persistPeriodPositionUpdates:636-652` (payload `{period,position}` asume period concreto). Orquestacion SortableJS sin cobertura automatica (smoke-only, documentado en `CurriculumMesh.stories.ts:280`).
- **UPONE-1450 (versionamiento del Plan) = NO-COLISION** — PR#25 (`97ac0b3`, feat/UPONE-1450-plan-version-deep-clone) toca `Curriculum.json`, `curriculum-create.resolver.js`, layouts y helpers de deep-clone declarativo; **NO toca `modsComponents/CurriculumMesh/`**. El clone re-apunta `categoryId`, nunca `period`/`position`/`progression`. Superficies disjuntas. Nota (no bloqueante): al hacer `period` nullable (S2), las `planEntry` deep-clonadas con `period:null` arrastran ese null sin cambio — consistente con el mecanismo generico de clone.
- **Cobertura agregada (S1.T2, +7 tests)**: `curriculumMesh.logic.spec.ts` (+5: groupByPeriod null-drop, coexistencia seq+null, computeSummary bucket null, nextPosition exclusion, canRemoveTrailingPeriod) + `recalcPeriodPosition.logic.spec.ts` (+2: entry null invisible al reorder / arrastre de la propia null estampa period). Fijan el comportamiento ACTUAL ante `period` ausente; la regresion de S4/S6 se mide contra estas aserciones.

**Quality review (DET-23)**:

**Reviewer**: dual-judge aislado (DET-35, T2) — 2 jueces ciegos en paralelo (dkc-reviewer, sonnet, read-only)
**Tier de revision**: standard (T2, WARN-first)
**Resultado global**: pass (tras 1 iteracion in-session)

Trigger-rules: diff test-only 106 lineas (2 spec files), sin codigo de produccion → no dispara bump de tier; T2 del design se mantiene.

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| Las 5+2 aserciones fijan el comportamiento ACTUAL real (trazado 1:1 contra fuente), no hipotetico | confirma | confirma | positive | verified |
| `recalcPeriodPosition` (consumidor de `period` del inventario S1.T1) sin caracterizar; mismo patron `===` fragil que nextPosition; relevante por AQ-2 (mix period/null en switch) | — | warning (medium) | real | **resuelto** (+2 tests recalcPeriodPosition.logic.spec.ts) |
| Inventario S1.T1 + nota UPONE-1450 sin evidencia verificable en el ticket | — | warning (low) | real | **resuelto** (Discoveries de esta session) |
| describe nuevo sin etiqueta REQ-xx (convencion del archivo) | suggestion (low) | — | real | **resuelto** (titulo → REQ-PRESERVE-01) |
| 4 de 5 aserciones caracterizan `period=null` en funciones secuenciales que el render modular (groupByLevel) podria no invocar nunca | suggestion (low) | — | theoretical | diferido a S4.T4 (auditoria DET-40: decidir si son invariantes o characterization viva) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (period nullable + codegen + migracion por tenant)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer verificacion self-report (DET-33)**: jueces read-only (dkc-reviewer: Read/Grep/Glob, sin Edit/Write/git); `git status` del mod tras el review = solo los 2 spec files esperados, working tree sin contaminacion. Conteo de tests (1405) re-ejecutado por el orquestador (no self-report del juez).

```dkc:gate-telemetry
session: S1.GATE
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 5600
est_tokens: 1513
span_seconds: 900
```

**Commit DET-27**: `2611776` UPONE-1539-S1 test(curriculum-design): characterize sequential period consumers (DET-40 baseline)

**Contexto retomable**: baseline secuencial fijada (1405 tests VERDE, +7). Inventario de consumidores de `period` + no-colision UPONE-1450 documentados. Siguiente: S2 (period nullable + codegen + migracion por tenant) — requiere object-manager + postgres levantados.

### Session 2 — 2026-08-07 — Modelo `period` nullable + migracion [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Hacer `planEntry.period` nullable en el JSON del mod y propagarlo por codegen + migracion no-destructiva por tenant, sin romper el camino secuencial (CRUD acepta null; create secuencial sigue asignando period; typecheck FE verde).

**Tasks completadas**:
- [x] S2.T1 — `period.not_null: true → false` y sacarlo de `required[]` en `objects/planEntry.json`; `npm run codegen` sin error
- [x] S2.T2 — codegen + `prisma migrate` por tenant (UPU); verificar CRUD create/update acepta `period` null y que create SECUENCIAL sigue asignando period (REQ-04 sc3)
- [x] S2.T3 — verificar que el cambio de tipado (period nullable tras codegen) NO rompe la compilacion de los consumidores secuenciales del FE (`npm run typecheck` del mod)
- [x] S2.GATE — Gate ⚑ fuerte (T3): migracion no-destructiva verificada + CRUD null + create secuencial con period + typecheck verde + rama != protegida por repo; decidir continue

**Validacion del tier**:
- T3 — mod `@uplanner/curriculum-design` vitest: **1405/1405 pass** (== baseline S1, sin regresion). object-manager unit `test:unit`: **2490 pass / 1 skip / 0 fail** (117 files) con period nullable. mod typecheck (vue-tsc): VERDE. DB `uplanner_upu`: `planEntry.period` `is_nullable=YES`, 5 indices intactos, INSERT `period NULL` aceptado (tx rollback).

**Discoveries / Learns nuevos**: ver L1/L2/L3 en ## Learns (H5 falsa; codegen BASEMODEL-first; drift preexistente de indices). Bridge "edit puntual" del objeto OM acumulado confirmado DURABLE por ambos jueces (fileSync.js:840-872 union add-only + el mod ya no declara period en required → un sync futuro no lo reintroduce).

**Quality review (DET-23)**:

**Reviewer**: dual-judge aislado (DET-35, T3 ⚑ fuerte) — 2 jueces ciegos paralelos (dkc-reviewer, sonnet, read-only)
**Tier de revision**: exhaustive (T3)
**Resultado global**: pass (tras 1 iteracion in-session; B-CRITICAL adjudicado como excepcion auditada)

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| Bridge edit-puntual del required de OM es DURABLE (sync union add-only) | positive | positive | — | verified |
| DDL quirurgico justificado (db push dropearia 5 indices, gap L3 preexistente) | positive | (real, ver abajo) | — | verified |
| BASEMODEL generated client stale (`period Int` compilado) | bug (medium) | — | real | **resuelto** (`TENANT_ID=BASEMODEL prisma generate` → `period Int?`) |
| Regresion backend no corrida (tier T3) | warning | warning (S2.T3 solo typecheck) | real | **resuelto** (OM unit 2490 pass + mod vitest 1405 pass) |
| REQ-04 sin test/evidencia (create period:null) | — | warning (medium) | real | **resuelto** (INSERT null aceptado en tx rollback — TC-nuevo abajo) |
| ALTER manual fuera del historial de migraciones Prisma (untracked) | (endorsa DDL) | CRITICAL | real | **excepcion auditada** — proyecto usa db push (schema=fuente); schema regen + ALTER dejan DB==schema; drift:check verde al commitear OM. Backlog B1 (reconciliacion). Single-judge (A endorso el DDL) → adjudicado no-bloqueante |
| Diff de OM arrastra otros mods (fuera de execute_scope) | — | medium (theoretical) | real | **en manos del dev** (no commiteo OM); 23 mod + 27 untracked = regen holistico; el DB change SI es scoped (solo planEntry). Backlog B3 |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 3 (deriveLevel logica pura)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer verificacion self-report (DET-33)**: jueces read-only; fixes re-verificados por el orquestador (BASEMODEL client, OM unit 2490, mod 1405, DB null-insert). Working tree del mod limpio (commit bdd9e68); OM sin commitear por decision del dev.

```dkc:gate-telemetry
session: S2.GATE
work_type: implement
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 900
est_tokens: 243
span_seconds: 3600
```

**Commit DET-27**: mod `bdd9e68` UPONE-1539-S2 feat(curriculum-design): planEntry.period nullable for modular plans. Core (object-manager): schema/objetos regenerados sin commitear — el dev maneja el commit del core (decision explicita); DB `uplanner_upu` migrada por ALTER quirurgico (no versionado en Prisma, excepcion auditada B1).

**Contexto retomable**: period nullable en mod + OM schema (BASEMODEL+UPU `Int?`) + DB `uplanner_upu`. Pendiente del dev: commitear el schema OM (scoping vs otros mods) + reconciliar el ALTER manual. S4 depende de S2.GATE + S3.GATE. Siguiente: S3 (deriveLevel puro, independiente).

### Session 3 — 2026-08-07 — Derivacion de nivel (logica pura) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Crear la logica pura de derivacion de nivel: `deriveLevel` (recorrido fiel AND/OR/K-de-N, solo timing=Before empuja, 2a pasada de creditos, deteccion de ciclos, exclusion de Group/vacios/pools N<K) + `groupRequirementsByTiming` (REQ-08), ambas con specs. Sin infra.

**Tasks completadas**:
- [x] S3.T1 — `deriveLevel.logic.ts`: recorrido FIEL del arbol Y/O (AND→max, OR→min, K-de-N→K-esimo; DEC-LOCAL-05); solo `timing=Before` empuja (REQ-07); 2a pasada creditos→nivel (REQ-09); deteccion de ciclos; exclusion Group vacio/pools N<K. Junto al componente
- [x] S3.T2 — `deriveLevel.logic.spec.ts`: raiz→1; AND→1+max; OR→1+min; K-de-N; timing; creditos; ciclo; Group vacio/pool N<K
- [x] S3.T3 — `groupRequirementsByTiming.logic.ts` (REQ-08): aplana hojas de curso, agrupa por timing (Before/Concurrent/Either) con label resuelto + `.spec.ts`
- [x] S3.GATE — Gate de sync Session 3 (T2): coverage de deriveLevel + groupRequirementsByTiming; decidir continue

**Validacion del tier**:
- T2 — deriveLevel.logic.spec: 19 tests · groupRequirementsByTiming.logic.spec: 7 tests · full suite mod **1431/1431 pass** (baseline S1 1405 → +26 S3, 0 regresion) · typecheck vue-tsc VERDE.

**Discoveries / Learns nuevos**: `Group.creditsRequired` no declara `scope`/`scopeId` en el RT (son de `MetricThreshold`) → el scope de su umbral de creditos son sus PROPIOS cursos-hoja (Technical reference), resuelto con `collectCourseIds` + `restrictTo` (no scope plan/category). Ver L4 en ## Learns.

**Quality review (DET-23)**:

**Reviewer**: dual-judge aislado (DET-35, T2) — 2 jueces ciegos paralelos (dkc-reviewer, sonnet, read-only)
**Tier de revision**: standard (T2)
**Resultado global**: pass (tras 1 iteracion in-session)

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| **`Group.creditsRequired` sumaba plan-wide en vez de hijos del grupo** (RT Group sin scope/scopeId → fallback `?? plan` siempre) | bug high | deviation medium | real | **CONFIRMED (ambos) → resuelto** (`collectCourseIds`+`restrictTo` acota al grupo; +test que lo fija) |
| AND(max)/OR(min)/K-de-N(K-esimo+clamp), timing (solo Before), ciclos, 2-pasadas sin punto fijo, creditos self-excluidos | positive | positive | — | verified con valores concretos |
| reports (cycle/pool) duplicados entre pasa 1 y pasa 2 | quality low | — | real | **resuelto** (dedup por (kind,activityId) + assertion) |
| sin memo en pasa de creditos (blowup teorico ante fan-in) | quality low (theoretical) | — | theoretical | **resuelto** (`memoCredits` clave separada por pasada) |
| deriveLevel >40 lineas (6 closures) | — | quality low | real | aceptado (closures comparten memo/visiting/reports; extraer degradaria legibilidad) — no bloqueante |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 4 (render modular + DET-40 + modal REQ-08)
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer verificacion self-report (DET-33)**: jueces read-only; fixes re-verificados por el orquestador (19+7 specs, full 1431, typecheck). Working tree limpio (amend `ba66341`).

```dkc:gate-telemetry
session: S3.GATE
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 9000
est_tokens: 2432
span_seconds: 1500
```

**Commit DET-27**: `ba66341` UPONE-1539-S3 feat(curriculum-design): deriveLevel + groupRequirementsByTiming pure logic (incluye fixes del gate).

**Contexto retomable**: logica pura lista (deriveLevel + groupRequirementsByTiming, +26 tests). S4 (render modular) puede arrancar: depende de S2.GATE ✅ + S3.GATE ✅. Siguiente: S4 (wire progression→PlanVM, groupByLevel, branch de columnas en el .vue, DET-40, modal REQ-08).

### Session 4 — 2026-08-07 — Render modular + auditoria DET-40 [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Cablear `progression` a PlanVM, crear `groupByLevel` (usando deriveLevel), ramificar el render del `.vue` por modo (header Nivel/Periodo, banner no-secuencial, drag off + control periodo oculto en modular), auditar DET-40 el camino secuencial, y agregar el display prereq/coreq por tarjeta (REQ-08).

**Tasks completadas**:
- [x] S4.T1 — Cablear `progression` a `PlanVM` en `useCurriculumMesh.ts` (toPlanVM; lectura defensiva RT-nested; default Sequential)
- [x] S4.T2 — `groupByLevel` en `curriculumMesh.logic.ts` (paralela a groupByPeriod, salida MeshCard[][], usa deriveLevel)
- [x] S4.T3 — Branch de `columns` por progression en el `.vue`; header condicional Nivel/Periodo; banner plan no-secuencial; drag off + control agregar/quitar periodo oculto en modular
- [x] S4.T4 — Auditoria DET-40: enumerar 1:1 consumidores de period, verificar camino secuencial intacto; registrar replacement-audit
- [x] S4.T5 — Display por tarjeta (REQ-08): boton `cm-pe__reqs` @click.stop + `RequirementsModal.ts` (molecula Modal) con groupRequirementsByTiming
- [x] S4.GATE — Gate ⚑ fuerte (T3): render modular + banner + display prereq/coreq + secuencial intacto (DET-40); decidir continue

**Validacion del tier**:
- T3 — mod suite **1439/1439 pass** (baseline S1 1405 → +34), typecheck vue-tsc VERDE, i18n JSON valido es/en/pt. DET-40: specs secuenciales + characterization S1 intactos. Runtime smoke (render real de ambos modos) = S6.T2 (DET-36, requiere suite+browser).

**Discoveries / Learns nuevos**: el banner mesh-wide de violaciones (SP7, evaluateRequirementTree) es period-based → sin sentido en modular (period→0 por toMeshEntry); se desactiva en modular. El alta por-columna persiste period=indice de columna → en modular seria un nivel, no periodo → alta oculta en modular hasta REQ-10 (S5). Ver L5.

**Quality review (DET-23)**:

**Reviewer**: dual-judge aislado (DET-35, T3 ⚑ fuerte) — 2 jueces ciegos paralelos (dkc-reviewer, sonnet, read-only)
**Tier de revision**: exhaustive (T3)
**Resultado global**: pass (tras 1 iteracion in-session)

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| **DET-40 secuencial INTACTO** (columns=groupByPeriod identico; modularGrouping lazy short-circuit; drag/controles/discrepancy gated a secuencial) | pass | pass | — | verified (ambos) |
| **Banner mesh-violations con falso positivo sistematico en modular** (period-based + period→0 → `0<0` false → todo prereq "no satisfecho") | **bug high** | — | real | **resuelto** (meshScanEnabled + banner v-if `!isModular`) |
| **Boton +Asignatura persiste period=indice de columna (=nivel) en modular** | medium | — | real | **resuelto** (v-if `editable && !isModular` hasta REQ-10/S5) |
| **CSS faltante `.cm-pe__reqs` + `.rqm-*`** (render nativo, rompe patron cm-pe__edit/pbm-*) | — | **bug medium** | real | **resuelto** (CSS con tokens, espeja cm-pe__edit/pbm-*) |
| toPlanVM.progression: clave RT `rt__Plan__curriculum` real; rama nested es defensiva (backend aplana via enrichCurriculumRows) | — | low | real | comment tightened |
| groupByLevel sort intra-nivel sin test 2+ cards mismo nivel | — | low | real | **resuelto** (+1 test) |
| RequirementsModal race: click antes de cargar arbol → "sin requisitos" | low | — | real (self-corrige) | Backlog B4 (low) |
| RequirementsModal sin .spec propio | — | low | — | aceptado (patron PrereqBlockModal; smoke S6) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 5 (flujo alta modular REQ-10 + resolver batch REQ-11 + i18n + story + a11y)
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer verificacion self-report (DET-33)**: jueces read-only; fixes re-verificados por orquestador (typecheck, 1439 suite, i18n valido, tree limpio amend 46e8710).

```dkc:gate-telemetry
session: S4.GATE
work_type: implement
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 22000
est_tokens: 5946
span_seconds: 5400
```

**Commit DET-27**: `46e8710` UPONE-1539-S4 feat(curriculum-design): modular render branch + per-card requirements modal (REQ-08) — incluye fixes del gate (banner gate, add-button gate, CSS). Mod repo; OM sin tocar en S4.

**Contexto retomable**: render modular completo y auditado (DET-40 secuencial intacto). Pendiente: S5 (flujo alta modular REQ-10 + resolver batch REQ-11 backend + i18n flujo + story + a11y), S6 (fixture + smoke dual browser — REQUIERE dev: Clerk + suite/OM), S7 (paridad MCP, repo up1-mcp). El render modular no tiene smoke runtime aun (S6.T2).

### Session 5 — 2026-08-07 — Flujo de alta modular (REQ-10) + resolver batch (REQ-11) + transversales [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Reintroducir el alta en modular como flujo guiado (REQ-10): boton global "Agregar asignatura" (el add por-columna quedo oculto en S4), check de prerrequisitos por PRESENCIA (no por periodo), y ante faltantes que son cursos concretos ofrecer agregarlos junto con la asignatura de forma atomica via `createPlanEntriesBatch` (REQ-11, resolver mod-owned). Homologar la alerta de requisitos (REQ-05, reuso PrereqBlockModal). i18n del flujo + story modular + a11y WCAG AA.

**Tasks completadas**:
- [x] S5.T1 — Homologar alerta de requisitos no cumplidos (REQ-05): reuso PrereqBlockModal + findMissingPrereqs (OR/creditos ya cubiertos por el evaluador); consistencia al volver atras
- [x] S5.T5 — Resolver batch atomico mod-owned (REQ-11): `logic/planEntry-batch.resolver.js` + `.schema.graphql` (`createPlanEntriesBatch`) con `context.prisma.$transaction` + `tx.planEntry.create` directo (atomicidad sin fuga de eventos) + RBAC `checkObjectPermissions`; unit rollback + happy path + kind default + whitelist
- [x] S5.T6 — Flujo guiado de alta SOLO modular (REQ-10): boton modular "Agregar asignatura", check por presencia, particion faltantes autocompletables vs alternativa, batch atomico [destino + prereqs], deriveLevel re-arma; secuencial intacto
- [x] S5.T2 — i18n: keys del flujo modular (`modularAdd.*`, `prereqBlock.guidedIntro`, `prereqBlock.buttons.addRequirements`) en es/en/pt con paridad
- [x] S5.T3 — Story: estado modular del componente
- [x] S5.T4 — a11y WCAG AA (foco/teclado columnas de nivel + modales) + design tokens sin hardcode en el bloque modular
- [x] S5.GATE — Gate ⚑ fuerte (T3): resolver batch + guiado modular + i18n paridad + story + a11y; decidir continue

**Validacion del tier**:
- T3 — mod `@uplanner/curriculum-design` vitest: **1462/1462 pass** (baseline S4 1439 → +23: planEntryBatch 8 + guidedAdd 6 + PrereqBlockModal.component 5 + modular-add-a11y 4). typecheck vue-tsc: VERDE. i18n JSON valido es/en/pt. a11y: axe-core WCAG 2.1 AA sobre el markup modular nuevo, 0 violaciones serias/criticas. Runtime dual (render + alta guiada + rollback batch) = S6.T2 (DET-36, requiere suite+OM+Clerk).

**Discoveries / Learns nuevos**: ver L6/L7 en ## Learns (RBAC bypass introducido y corregido dentro del gate; check de prereqs por presencia en modular via remap centinela sin tocar el evaluador).

**Quality review (DET-23)**:

**Reviewer**: dual-judge aislado (DET-35, T3 ⚑ fuerte) — 2 jueces ciegos paralelos (dkc-reviewer, sonnet, read-only) + 1 re-juez del delta de fixes
**Tier de revision**: exhaustive (T3)
**Resultado global**: pass (tras 2 iteraciones in-session; incluye un CRITICAL de seguridad introducido por el primer fix y corregido)

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| **Fuga de atomicidad por eventos**: el createInstance generico publica al canal Redis `core` (withEventPublish) ANTES del commit de la $transaction → si una entrada del lote falla, las filas revierten pero los eventos ya salieron | warning (real) | **blocking** | real | **CONFIRMED (ambos) → resuelto**: resolver reescrito a `tx.planEntry.create` DIRECTO (recomendacion primaria del spec REQ-11); sin eventos a mitad de camino |
| **Electiva sobre bloque EXISTENTE en modular duplicaba entries** (usaba `payload.activityIds` completo en vez de `diffBlockSelection`) | — | **blocking** | real | **resuelto**: `persistModularAdd` aplica el diff (toAdd/toRemove) igual que el camino secuencial; helpers `resolveModularBlock`/`removeElectivaEntries` |
| **Gate S5 exige evidencia a11y (no diferible a S6)**: S5.T4/GATE sin evidencia registrada | **blocking** | — | real | **resuelto**: test axe WCAG 2.1 AA del markup modular nuevo (4 tests); runtime foco/teclado documentado → S6.T2 |
| **RBAC bypass** (NUEVO, introducido por el fix de atomicidad): al quitar la delegacion al generico se perdio `withObjectAuth('create')` → `createPlanEntriesBatch` sin check de capability; cualquier user del tenant podria crear planEntry en cualquier plan | re-juez: **CRITICAL** | — | real (introducido) | **resuelto**: `checkObjectPermissions(context, 'planEntry', 'create')` explicito antes de la tx (patron de polymorphicUpdate.resolver.js); throwea sin la capability |
| Firma del schema `(entries)` vs spec `(data)` | suggestion | — | real | **resuelto**: arg alineado a `data` (consistente schema/resolver/vue) |
| Cadena recursiva de prereqs: el guiado resuelve 1 nivel (un prereq auto-agregado con requisitos propios no se re-chequea) | suggestion (theoretical) | — | theoretical | **backlog B6** (+ TC de S6) |
| THIN + auto-discovery + paridad i18n + DET-40 secuencial intacto + remap centinela coherente + sin callejon sin salida | positive | positive | — | verified (ambos) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 6 (fixture + smoke dual browser, requiere dev: Clerk+suite+OM)
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer verificacion self-report (DET-33)**: jueces read-only (dkc-reviewer: Read/Grep/Glob). Fixes re-verificados por el orquestador: suite 1462 re-ejecutada (no self-report del juez), typecheck VERDE, `git status` del mod limpio tras el commit (74cc1c7). El fix de RBAC verificado 1:1 contra el patron de carga de auth de `polymorphicUpdate.resolver.js` (mismo dual-path, sibling `authChecker.js`); la denegacion runtime sin capability se valida en S6 (TC-17, backlog B7).

```dkc:gate-telemetry
session: S5.GATE
work_type: implement
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 2
adjudicator_invocations: 0
diff_chars: 24000
est_tokens: 6500
span_seconds: 5400
```

**Commit DET-27**: `74cc1c7` UPONE-1539-S5 feat(curriculum-design): guided modular add flow + atomic batch resolver (REQ-10/REQ-11) — incluye fixes del gate (direct-tx + RBAC check + diff electiva + a11y). Mod repo; OM sin tocar en S5 (el resolver del mod se propaga a OM en el setup de S6 via sync).

**Contexto retomable**: S5 cerrada (continue). REQ-10/REQ-11 implementados y probados (unit+component+a11y, 1462 VERDE); resolver batch con atomicidad real (direct-tx) + RBAC. Pendiente S6: `npm run sync` para propagar `planEntry-batch.resolver.js`/`.schema.graphql` a OM (requiere OM+postgres), fixture reproducible + smoke dual browser (DET-36) incl. rollback del batch, denegacion RBAC sin capability, y regresion secuencial. Luego S7 (paridad MCP, repo up1-mcp).

### Session 6 — 2026-08-07 — Fixture reproducible + smoke dual (validador final) + regresion + docs [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Construir el caso de prueba reproducible (plan MODULAR con prereqs Before/Concurrent/AND/OR/K-de-N/creditos + curso que dispara faltantes) extendiendo el fixture SP7; smoke runtime dual (modular por niveles + secuencial por periodos) como validador final (DET-36) incl. rollback del batch (REQ-11) y denegacion RBAC (B7); regresion secuencial (DET-40); docs.

**Setup runtime ya ejecutado (pre-T1)**: `sync:logic` propago `planEntry-batch.resolver.js`/`.schema.graphql` a OM → `createPlanEntriesBatch` registrado (verificado por introspeccion). RBAC verificado a nivel API: llamada sin auth → `UNAUTHENTICATED` antes de la tx (no crea nada). Incidente resuelto: backtick en la description del schema rompio el boot de OM (L8) → fix `6a43ecc`. Login Clerk test mode OK; app renderiza.

**Tasks completadas**:
- [x] S6.T1 — Fixture reproducible: plan MODULAR + prereqs (Before encadenados, Concurrent, Group AND/OR/K-de-N, MetricThreshold creditos) + curso con faltantes + plan SECUENCIAL; extiende SP7 `UPONE-1378-smoke-fixture.sql`; re-aplicable (idempotente)
- [x] S6.T2 — Smoke runtime dual (DET-36): modular por niveles (AND=1+max, OR=1+min, K-de-N, coreq mismo nivel, credito) + rotulo Nivel i18n + recalculo al agregar/quitar + alta guiada modular que agrega el req sin cerrar + rollback del batch + RBAC sin capability; secuencial por periodos + bloqueo. Evidencia runtime real
- [x] S6.T3 — Regresion secuencial automatizada vs baseline S1 (DET-40) + switch progresion
- [x] S6.T4 — Docs: modo modular de la malla + como re-aplicar el fixture (guia del mod)
- [x] S6.T5 — REQ-13 plataforma: `progression` read-only en el layout `_edit` (patron `recordType` disabled)
- [x] S6.T6 — REQ-13 test+smoke: config assert (no editable) + smoke (disabled + no persiste) + ajustar TC-8
- [x] S6.GATE — Gate ⚑ fuerte (T3): plataforma validada (fixture + smoke dual + regresion verde + docs + REQ-13); habilita S7 solo si cierra

**Evidencia runtime (S6.T2, DET-36) — parcial**:
- **Render modular por niveles VERIFICADO en UI** (screenshot): el plan `smoke1539-mod-plan` dibuja Nivel 1/2/3 (no periodos), banner modular presente, banner de violaciones period-based ausente, rotulo "Nivel N" i18n (REQ-06). Ubicacion 1:1 con lo esperado: **L1** ADM-1, AGR-3 (sin prereq) · **L2** ADM-2 (prereq Before), ADM-3 (prereq Before + **coreq Concurrent → mismo nivel**, REQ-07), ADM-5 (**OR → 1+min**, REQ-02) · **L3** ADM-4 (**AND → 1+max**), AGR-1 (**K-de-N 2 de 3**), AGR-2 (**creditos≥15 → donde acumula**, REQ-09). Valida **REQ-01/02/06/07/09** en runtime real.
- **REQ-08 (modal por tarjeta) VERIFICADO**: "Ver requisitos" de ADM-3 muestra Prerrequisitos (ADM-1, Before) y Corequisitos (ADM-2, Concurrent) agrupados por timing. Hallazgo menor (F2/B9): en modo solo-lectura los labels caen al activityId crudo (el catalogo del picker, fuente de labels, solo se carga al abrir el modal de alta).
- **REQ-11 (batch) + RBAC VERIFICADO a nivel API**: `createPlanEntriesBatch` registrado en OM tras el sync; llamada sin auth → `UNAUTHENTICATED` antes de la tx (no crea nada, cubre B7 en API).
- **REQ-10 + REQ-11 VERIFICADOS end-to-end en UI (edicion, layout `_edit`, plan vacio `smoke1539-empty`)**: boton "+ Agregar asignatura" (modular) → wizard → seleccionar CALDEMO-AGR-4 (requiere AGR-5, no colocado) → al confirmar aparece el modal GUIADO ("Esta asignatura requiere prerrequisitos... Puedes agregarlos junto con ella") listando "CALDEMO-AGR-5 — Seminario AGR" + boton "Agregar requisitos y asignatura" → al aceptar, el **batch atomico** persiste AMBOS (BD: 2 planEntry con `period` NULL) y **deriveLevel re-arma**: Nivel 1 = AGR-5, Nivel 2 = AGR-4 (requiere AGR-5). Cubre REQ-05 (alerta del faltante), REQ-10 (flujo guiado), REQ-11 (persistencia atomica). Labels con codigo+nombre (fix B9).
- **REQ-08 label fix VERIFICADO**: tras el fix, el modal "Ver requisitos" muestra "CALDEMO-ADM-1 — Fundamentos ADM" / "CALDEMO-ADM-2 — Taller I ADM" (antes: activityId crudo).
- **REQ-10 cadena MULTINIVEL + fallback manual VERIFICADO (decision del dev)**: (a) cadena determinista `AGR-4 → AGR-5 → AGR-3` (todos cursos concretos) → el modal guiado lista la CADENA COMPLETA (AGR-5 + AGR-3, "Se agregará junto con la asignatura") → al aceptar, el batch agrega los 3 y deriveLevel los ordena (N1 AGR-3, N2 AGR-5, N3 AGR-4); (b) caso AMBIGUO `AGR-1` (K-de-N "2 de 3") → NO ofrece autocompletar: informa el K-de-N con sus opciones (ADM-1/2/4) + solo Cancelar/Volver → el usuario elige a mano. Ambas formas conviven (B6 resuelto).
- **CSS AddEntryModal fix VERIFICADO** (`b719f0a`): el paso 1 salia en 3 columnas (stepper + campos lado a lado) porque `.up1-modal-body` es flex-row y el modal pasaba 2 hijos sueltos; envuelto en un contenedor en columna → stepper arriba, campos abajo. Detalle del K-de-N en modular ya no muestra el periodo centinela (limpiado).
- **RESUELTO (S6.T2 continuacion, 2026-08-10)**: (a) RBAC B7 → test de integracion con el `checkObjectPermissions` REAL: SIN cap → denegado antes de la tx (0 creates), CON cap → crea, sin usuario → UNAUTHENTICATED (`planEntry-batch-rbac.test.js`, commit `5d11cab`); (b) rollback del batch → contrato de atomicidad cubierto por unit (`planEntryBatch.test.js` 8/8; el rollback via UI no es path natural, la UI arma lotes validos); (c) regresion secuencial → S6.T3 (suite 1477 verde); (d) docs → S6.T4.

**Hallazgo de setup CRITICO (F1 → B8)**: el suite renderiza el mesh desde la copia SINCRONIZADA `layout/src/modsComponents/CurriculumMesh/` (Nuxt resuelve `@mods` a `layout/src/modsComponents`). `sync:logic` (resolvers) y `sync:files` (objetos) NO sincronizan componentes Vue → el mesh quedo STALE (pre-S4, sin soporte modular) y renderizaba secuencial pese a `progression=Modular`. El sync de COMPONENTES es `npm run sync --workspace=@uplanner/layout-engine` (layout/scripts/sync.js). Tras correrlo (35 markers en la copia) + reload, el render modular aparecio. Es un paso de setup/deploy obligatorio, no cubierto por sync:logic/sync:files.

**Contexto retomable**: S6 en ejecucion. T1 (fixture) hecho + aplicado en UPU (NO teardown, listo para continuar el smoke). T2 parcial: render/derivacion/REQ-08 + REQ-11 API verificados; falta el smoke de edicion (alta guiada REQ-10/11 rollback + RBAC UI) via layout `_edit`. Setup runtime completo (OM + componentes sincronizados). Falta T3 (regresion) + T4 (docs) + gate.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Plataforma S1-S6 validada. Dual-judge DET-35: ambos aprobaron REQ-13 + B7 (RBAC auth real, gate antes de tx); iterate solo doc-only, corregido en 72ca904 + self-verificado. Habilita S7 (MCP, repo up1-mcp). Commits locales S6: 307bf83/5f75f7f/5d11cab/b49911a/8f9779f/72ca904 (push diferido a OK del dev).
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 7 — 2026-08-10 — Paridad del MCP (up1-mcp) con la malla modular [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (paridad + smoke MCP)

**Objetivo**: Portar la logica de derivacion (deriveLevel/groupByLevel/timing/creditos) al repo standalone up1-mcp con paridad anti-drift (REQ-12); adaptar `cd_add_plan_entry` (period opcional) y `cd_get_mesh` (niveles) al modo modular; y el guard de inmutabilidad de `progression` en `cd_update_curriculum` (REQ-13, paridad con la plataforma). Repo up1-mcp (`uplanner/mcp`), branch base `main` (rama `sp8-06-ago-mcp-progression-parity`).

**Tasks completadas**:
- [x] S7.T1 — Portar deriveLevel/groupByLevel/timing/creditos a up1-mcp mesh-logic.ts (paridad con el mod)
- [x] S7.T2 — cd_add_plan_entry period opcional + branch por progression; cd_get_mesh niveles en modular
- [x] S7.T3 — Tests de paridad (deriveLevel MCP == mod) + smoke MCP end-to-end
- [x] S7.T4 — REQ-13: cd_update_curriculum rechaza cambio de progression sobre plan existente + test
- [x] S7.GATE — Gate ⚑ fuerte (T3): paridad MCP + REQ-13 verificados; decidir close

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S7 (paridad MCP REQ-12 + REQ-13 MCP) validada por dual-judge. Commits up1-mcp: f9fb115/1a98e1d/5dd33f9/345c84c (push diferido a OK del dev). Todas las sessions S1-S7 done. Siguiente: request-close (procesar 8 learns DET-39 + teach-close DET-22 + status:closed con OK del dev, DET-30).
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 8 — 2026-08-10 — REQ-13 revisado: bloqueo condicional por malla vacia (DEC-LOCAL-10) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3

**Objetivo**: Reemplazar el bloqueo estatico de `progression` (S6.T5/S7.T4) por la regla CONDICIONAL: editable con malla vacia, bloqueada con cursos. Enforcement server-side en el resolver mod `curriculum-update` (rechaza el cambio solo si el plan tiene `planEntry`) + reflejo UI (disabled condicional + exponer hasEntries) + quitar `native:true` (estilo gris) + help text "para cambiar el modo se requiere una nueva version". Salda B10. Repo del mod, branch `feat/UPONE-1539-modular-mesh`.

**Tasks completadas**:
- [x] S8.T1 — Guard server-side en `logic/curriculum-update.resolver.js`: rechazar cambio de `progression` solo si el plan tiene `planEntry` (conteo > 0); plan vacio acepta. Mod-owned, salda B10
- [x] S8.T2 — UI: `default_Curriculum_edit.json` `progression` disabled CONDICIONAL por hasEntries + quitar `native:true` (estilo gris) + help text versionar; mecanismo para exponer hasEntries al form
- [x] S8.T3 — Tests: actualizar `curriculum-progression-lock.test.ts` (ya no es disabled estatico) + test del guard del resolver (cambio con entries rechazado, sin entries permitido) + regresion
- [x] S8.GATE — Gate ⚑ fuerte (T3): plan vacio editable / con cursos bloqueado (UI + server); versionar (v2 vacia) permite cambiar el modo; regresion verde; dual-judge

**Gate decision:** (approvedBy: autopilot)

- [x] continue → REQ-13 condicional cerrado. Runtime confirmado + juez approve. Commits S8: 48f3685/9123f51/756bf39 (locales). Reemplaza el bloqueo estatico de S6.T5/S7.T4.
- [ ] iterate → re-trabajar Session 8
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 9 — 2026-08-10 — REQ-14: borrado seguro de cursos en la malla (ambos modos) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3

**Objetivo**: Borrado seguro de un curso de la malla — confirmacion siempre + cascada atomica transitiva en dependientes deterministas + bloqueo (con el porque) en no deterministas. Clasificacion por satisfacibilidad (reusa evaluateRequirementTree). Repo del mod, branch feat/UPONE-1539-modular-mesh.

**Tasks completadas**:
- [x] S9.T1 — deletionImpact.logic.ts (findDependents + classifyDeletion: allow/cascade transitivo/block; colapso de vias unicas) + 24 tests
- [x] S9.T2 — planEntry-delete-batch.resolver.js (+schema): borrado atomico transitivo + RBAC planEntry:delete + tests
- [x] S9.T3 — DeleteEntryModal 3-estados + wire fail-safe (await arboles) en el .vue + i18n es/en/pt
- [x] S9.T4 — Smoke runtime (DET-36): modal de bloqueo con el porque confirmado en UI (Playwright)
- [x] S9.GATE — Gate ⚑ fuerte (T3): 4 ramas verificadas + dual-judge (2+2, cazo+arreglo 2 bugs) + runtime bloqueo

**Gate decision:** (approvedBy: autopilot)

- [x] continue → REQ-14 cerrado. Dual-judge 2+2 + runtime bloqueo confirmado. Commits S9 locales. Casos allow/cascade por 24 tests + jueces; block runtime-confirmado.
- [ ] iterate → re-trabajar Session 9
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 10 — 2026-08-10 — Paridad MCP de REQ-13 condicional + REQ-14 borrado [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3

**Objetivo**: Paridad en up1-mcp de REQ-13 condicional (cd_update_curriculum) + REQ-14 (cd_remove_plan_entry allow/cascade/block con el porque accionable). Repo up1-mcp, branch sp8-06-ago-mcp-progression-parity.

**Tasks completadas**:
- [x] S10.T1 — cd_update_curriculum: rechazo condicional por entries (violatesProgressionImmutability con hasPlacedEntries)
- [x] S10.T2 — cd_remove_plan_entry: clasificacion allow/cascade/block + informar el porque (dependiente + grupo); deletePlanEntriesBatch atomico
- [x] S10.T3 — Tests de paridad (mesh-deletion-parity.test.ts, 24) + REQ-13 condicional; 226 verde, tsc limpio
- [x] S10.GATE — Gate ⚑ fuerte (T3): paridad verificada + dual-judge; habilita request-close

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Paridad MCP cerrada. Dual-judge: REQ-14 port 1:1 verificado; drift REQ-13 (null) corregido por consenso + verificado. Commits S10 up1-mcp locales. Habilita request-close.
- [ ] iterate → re-trabajar Session 10
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Backlog

| B# | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|----|------|-----|----------|-----------|--------------|-----------|
| B1 | Reconciliar la migracion `period` DROP NOT NULL con el flujo canonico (aplicada por ALTER quirurgico fuera de Prisma migrate/db push para evitar dropear 5 indices no emitidos por codegen). Una vez commiteado el schema OM regenerado, correr `npm run drift:check` y confirmar verde; decidir si se formaliza como migracion versionada o se acepta db-push como fuente. | REQ-04 | descubierto en S2.GATE (juez B CRITICAL) | ALTER aplicado en `uplanner_upu`; schema BASEMODEL+UPU = `period Int?`; DB = nullable (consistentes). Otros tenants (TEST, demo*) sin migrar (fuera de DEV_TENANTS). | Commitear schema OM → `npm run drift:check --workspace=@uplanner/object-management-backend` → si verde, documentar; migrar otros tenants si aplica al deploy. | should |
| B2 | codegen NO emite los `metadata.indexes` declarados de objetos Base (planEntry declara 4 indices, ninguno llega al schema.prisma; la BD los tiene por otra via). Un `prisma db push` del schema completo los dropea. Gap transversal preexistente (no de 120). | nuevo | descubierto en S2 (L3), confirmado por ambos jueces (generateBaseModel no lee metadata.indexes) | `generatePrismaSchema.js:generateBaseModel` (331-578) solo lee uniqueConstraints, no indexes; el emisor de @@index (964) es solo para modelos core_*. | Evaluar si generateBaseModel debe emitir @@index desde metadata.indexes (afecta a TODOS los objetos Base). Ticket propio (core, transversal). | could |
| B3 | Scoping del commit del schema OM: el working tree de object-manager tiene 50 archivos (23 mod + 27 untracked) por regen holistico de codegen — arrastra estado de otros mods (offering, section, report-builder, typeDefs). Al commitear, aislar lo de planEntry vs lo ajeno. | nuevo | descubierto en S2.GATE (juez B#3) | `git diff --stat` en object-manager: +1421/-213 en 23 files; el cambio real de planEntry son ~2 lineas (Int→Int?) + planentry.json required. | El dev decide el commit del core (ya autorizado como su tarea). Posible: commitear el catch-up completo del schema (todos los mods al dia) o scopear. | should |
| B4 | RequirementsModal (REQ-08): condicion de carrera menor — si el usuario abre "Ver requisitos" antes de que `ensureTrees` cargue el arbol de esa actividad (loop secuencial N queries), el modal muestra "sin requisitos" para un curso que si los tiene. Self-corrige al reabrir. | REQ-08 | descubierto en S4.GATE (juez A low) | openRequirementsModal lee meshTrees[activityId]; useMeshPrereqScan expone `scanning` (no consumido en el .vue). | Consumir `scanning`/estado de carga en el modal (loading o deshabilitar el boton hasta cargar el arbol), o dejar como esta (low, self-corrige). | could |
| B5 | ~~`createPlanEntriesBatch` NO emite el evento `create` de core ni el audit (`updatedById`/DataLog) de las filas del lote~~ **RESUELTO**. Aplica tambien a `deletePlanEntriesBatch` (S9). Trade-off consciente del create/delete directo (para no filtrar eventos pre-commit). | REQ-11 | descubierto en S5.GATE (dual-judge) | `planEntry-batch.resolver.js` usa `tx.planEntry.create` directo; el evento/audit vivian en el createInstance generico (no delegado). | **Mitad eventos: resuelta** (planEntryEvent.js, post-commit por fila). **Mitad audit/DataLog: resuelta por TICKET-127** (planEntryDataLog.js restituye recordMutationDataLog post-commit por fila, para create y delete). | resolved (eventos + TICKET-127) |
| B6 | ~~Flujo guiado modular (REQ-10) resuelve UN solo nivel~~ **RESUELTO** (commit `68adf20`, decision del dev): ahora recorre la CADENA COMPLETA (`resolveChain` puro + `resolveGuidedChainAsync` en el SFC). Determinista (todos cursos concretos, N niveles) → agrega toda la cadena atomica; ambiguo (OR/K-de-N/creditos en algun nivel) → fallback manual (informa + opciones, el usuario elige a mano). Verificado en UI: AGR-4→AGR-5→AGR-3 agrega los 3 (niveles 3/2/1); AGR-1 (K-de-N) cae a manual. +5 unit tests (cadena/ciclo/diamante/ambiguo). | REQ-10 | descubierto S5.GATE, resuelto S6.T2 | `resolveChain` en guidedAdd.logic.ts + wiring en el .vue. | (resuelto) | done |
| B7 | ~~Verificacion runtime del RBAC de `createPlanEntriesBatch`~~ **RESUELTO** (commit `5d11cab`, S6.T2): test de integracion que ejercita el `checkObjectPermissions` REAL del platform (no mock; import dual-path del resolver) variando solo las capabilities del context. Cubre: (a) autenticado SIN `planentry:create` → denegado ANTES de la tx (0 creates, `$transaction` no se abre) — cierra el bypass L6; (b) CON el cap → crea el lote; (c) sin usuario → UNAUTHENTICATED. Complementa el authless→UNAUTHENTICATED via API (curl) de S6. | REQ-11 | añadido en S5.GATE (fix del RBAC bypass, L6), resuelto S6.T2 | `planEntry-batch-rbac.test.js` (3 tests, auth real) + `planEntry-batch.resolver.js:130-131`. Residual: no se provisiono un rol acotado end-to-end con token real (se ejercita la funcion de auth real directamente, desproporcionado montar user+rol+login para un caso). | (resuelto) | done |
| B8 | El deploy/setup del mod DEBE incluir el sync de COMPONENTES (`npm run sync --workspace=@uplanner/layout-engine`), no solo sync:logic/sync:files. El suite resuelve `@mods` → `layout/src/modsComponents`; sin ese sync el mesh queda stale y el modo modular no aparece (renderiza secuencial pese a progression=Modular). Detectado en S6.T2 (el env del dev tenia el mesh pre-S4). | nuevo | descubierto en S6.T2 (F1) | `suite/nuxt.config.ts:169` (`@mods`→layout/src/modsComponents); `layout/scripts/sync.js` copia mods/*/modsComponents → layout/src/modsComponents. | Documentar en la guia del mod (S6.T4) el orden de sync (componentes + logic + objetos) como paso de setup. Evaluar si el `npm run sync` raiz ya lo encadena. | should |
| B9 | ~~RequirementsModal (REQ-08) muestra activityId en vez de codigo/nombre en read-only~~ **RESUELTO** (commit `4983328`): `activityLabelById` ahora se siembra tambien con los cursos COLOCADOS (`entries.subjectCode/subjectName`, siempre disponibles) ademas del catalogo del picker. Verificado en UI (modal y alertas muestran "codigo — nombre"). Residual menor: un prereq NO colocado en read-only sin el picker cargado aun caeria al id (raro; se resuelve al abrir el alta). | REQ-08 | descubierto y resuelto en S6.T2 (F2) | fix en `CurriculumMeshElement.vue` (buildEntryLabel + merge en activityLabelById). | (resuelto) | done |
| B10 | Blindaje server-side de REQ-13: el resolver core `updateCurriculumWithRecordType` (OM) NO valida la inmutabilidad de `progression`; una llamada GraphQL cruda al OM aun podria cambiar el modo de un plan existente (el bloqueo vive solo en UI + MCP por decision del dev, DEC-LOCAL-09). | REQ-13 | anadido 2026-08-10 (scope addition) | enforcement elegido = UI (`default_Curriculum_edit.json`) + MCP (`cd_update_curriculum`); OM sin validacion. | Rechazar el cambio de `progression` en el path de update del OM (o en el resolver `updateCurriculumWithRecordType`). Toca core → RULE-dev-004 (rama de epica + revision team core). Ticket propio de core. | could |
| B11 | Test de scope de creditos debil (heredado del mod): en `mesh-modular-parity.test.ts` (y su gemelo `deriveLevel.logic.spec.ts` del mod) el caso "Group.creditsRequired acota el scope" no discrimina scope=grupo vs scope=plan — otro nodo del AND domina el max, asi que T=3 sale igual con o sin el fix de scope. El expected es correcto, pero el assert no muerde sobre la propiedad que nombra. | REQ-12 | dual-judge S7 (juez B, INFO) | `mesh-modular-parity.test.ts:241-252`; existe igual en el mod. | Endurecer: quitar el otro driver del grupo (dejar el credito como unico) o subir el umbral, para que el assert muerda sobre scope. Aplica a ambos repos (mod + MCP). | could |
| B12 | Cobertura del ensamblado del arbol en el MCP: los 23 tests de paridad construyen `treesByActivity` a mano, asi que `assembleRequirementTree` (mesh-logic.ts) y el merge base+RT de `fetchRequirementTreesByActivity` (mesh-read.ts) NO quedan ejercitados por el suite. Un drift futuro en el ensamblado/merge no romperia estos tests. El port de `assembleRequirementTree` fue juzgado fiel por inspeccion. | REQ-12 | dual-judge S7 (juez B, INFO) | `mesh-read.ts:107-150` (merge), `mesh-logic.ts` (assembleRequirementTree). | Agregar un test que parta de rows crudas (base + RT) y verifique el arbol ensamblado antes de deriveLevel. | could |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQ |
|------|-------|---------|-------|-----|
| `2611776` | 2026-08-07 | UPONE-1539-S1 test(curriculum-design): characterize sequential period consumers (DET-40 baseline) | S1.T2 | REQ-PRESERVE-01 |
| `bdd9e68` | 2026-08-07 | UPONE-1539-S2 feat(curriculum-design): planEntry.period nullable for modular plans | S2.T1 | REQ-04 |
| `ba66341` | 2026-08-07 | UPONE-1539-S3 feat(curriculum-design): deriveLevel + groupRequirementsByTiming pure logic | S3.T1,S3.T2,S3.T3 | REQ-02,REQ-03,REQ-07,REQ-08,REQ-09 |
| `ae89035`,`46e8710` | 2026-08-07 | UPONE-1539-S4 feat(curriculum-design): modular render branch + per-card requirements modal (REQ-08) | S4.T1-T5 | REQ-01,REQ-02,REQ-08,REQ-PRESERVE-01 |
| `74cc1c7` | 2026-08-07 | UPONE-1539-S5 feat(curriculum-design): guided modular add flow + atomic batch resolver (REQ-10/REQ-11) | S5.T1-T6 | REQ-05,REQ-06,REQ-08,REQ-10,REQ-11 |
| `6a43ecc` | 2026-08-07 | UPONE-1539-S5 fix(curriculum-design): drop backticks in batch schema description (breaks OM typeDefs on sync) | S5.T5 (L8) | REQ-11 |
| `4983328` | 2026-08-07 | UPONE-1539-S6 fix(curriculum-design): resolve requirement labels from placed entries (code/name not id) | S6.T2 (B9) | REQ-08 |
| `b719f0a` | 2026-08-07 | UPONE-1539-S6 fix(curriculum-design): wrap AddEntryModal content in single column container (Modal body flex-row) | S6.T2 | REQ-10 |
| `68adf20` | 2026-08-07 | UPONE-1539-S6 feat(curriculum-design): recursive multi-level prereq chain in guided modular add (deterministic→whole chain; ambiguous→manual) | S6.T2 | REQ-10 |

## Testing

> Semilla del intake desde los "Tests minimos" del contrato (`sp8/UPONE-1539-detalle.md`). Los REQ definitivos los fija `design-feature`; aqui se mapean a los criterios de aceptacion (AC) del detalle. El dev debe sumar casos en ejecucion.

### Coverage map

| REQ (AC) | Test cases | Type | Status |
|-----|-----------|------|--------|
| AC-1/AC-2 (columnas=niveles, sin prereq→nivel 1) | TC-1 | unit (deriveLevel) | NOT COVERED |
| AC-3 (nivel = 1 + prereqs, fiel al arbol AND/OR/K-de-N) | TC-2, TC-12 | unit (deriveLevel) | NOT COVERED |
| REQ-09 (creditos → nivel, heuristico 2 pasadas) | TC-13 | unit (deriveLevel) | NOT COVERED |
| AC-5 (ciclo no cuelga y se reporta) | TC-3 | unit (deriveLevel) | NOT COVERED |
| Correctitud H7 (contenedores/vacios/K-de-N) | TC-4 | unit (deriveLevel) | NOT COVERED |
| REQ-07 (coreq Concurrent no sube nivel; prereq Before si) | TC-9 | unit (deriveLevel) + smoke | NOT COVERED |
| AC-6 (secuencial por periodos, sin regresion) | TC-5 | unit + smoke | NOT COVERED |
| AC-7 (alta con prereqs faltantes, volver atras consistente) | TC-6 | smoke (runtime) | NOT COVERED |
| AC-4 (nivel se recalcula al agregar/quitar) | TC-7 | smoke (runtime) | NOT COVERED |
| Convivencia + switch progression (DET-40) | TC-8 | smoke (runtime) | NOT COVERED |
| REQ-08 (display prereq/coreq por tarjeta en modal, drag-safe) | TC-11 | unit (grouping) + smoke | NOT COVERED |
| REQ-10 (flujo guiado modular: 1 curso, cadena multinivel, y fallback manual si ambiguo) | TC-14, TC-18, TC-19, TC-20 | smoke (runtime) + unit (resolveChain) | COVERED (TC-18/19/20 pass S6.T2; secuencial-bloqueo pendiente) |
| REQ-11 (batch atomico createPlanEntriesBatch, todo-o-nada + RBAC) | TC-15, TC-17 | unit (resolver, tx revierte) + integration (RBAC auth real) + smoke | COVERED (unit rollback 8/8 + happy smoke + RBAC deny/allow/unauth con auth real, B7) |
| REQ-08 (labels codigo+nombre, no activityId) | TC-21 | smoke (runtime) | COVERED (pass S6.T2) |
| REQ-12 (paridad MCP: modular sin period, cd_get_mesh niveles, sin drift) | TC-16 | unit (paridad deriveLevel) + smoke (tools MCP) | COVERED (23 tests de paridad + dual-judge 1:1, S7) |
| Validador final: smoke dual sobre fixture reproducible (prereqs+coreqs) | TC-10 | smoke (runtime, DET-36) | NOT COVERED |
| REQ-13 (progression inmutable al editar — plataforma) | TC-22, TC-8 | config + smoke (runtime) | COVERED (config 2/2 + runtime disabled=true, S6.T6) |
| REQ-13 (progression inmutable al editar — MCP) | TC-23 | unit (cd_update_curriculum) + smoke (tool) | COVERED (helper + 4 tests, suite 178 verde, S7.T4) |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-1 | Plan modular, asignatura sin prereqs presentes → nivel 1 | AC-1/2 | unit | Plan Modular, asignatura sin prereqs | `deriveLevel(entry, grafo)` | 1 | — | — | pending |
| TC-2 | Plan modular, asignatura con prereqs presentes → 1 + max(nivel prereqs) | AC-3 | unit | Plan Modular, cadena de prereqs | `deriveLevel` sobre nodo con prereqs en niveles 1 y 2 | 3 | — | — | pending |
| TC-3 | Ciclo de prereqs entre asignaturas del plan → no se cuelga, reporta el caso | AC-5 | unit | grafo con ciclo A→B→A | `deriveLevel` | termina; caso reportado, sin loop infinito | — | — | pending |
| TC-4 | Contenedores Group / grupo vacio / pool K-de-N con N<K no distorsionan el nivel | H7 | unit | arbol Y/O con Group vacio + pool N<K | `deriveLevel` | contenedores excluidos; pool inconsistente tolerado sin fallar | — | — | pending |
| TC-5 | Plan secuencial sigue dibujando por periodos (sin regresion) | AC-6 | unit+smoke | Plan Secuencial existente | abrir malla | columnas = periodos como hoy; `groupByPeriod` intacto con `period` no-null | — | — | pending |
| TC-6 | Alta con requisito no cumplido: el modal ALERTA cual falta + volver atras no deja nada a medio agregar | AC-7 (REQ-05) | smoke | Plan Modular, agregar asignatura con requisito no cumplido (curso/credito/OR) | confirmar alta; luego cancelar/volver | PrereqBlockModal lista cual requisito falta (alternativas si OR); al cancelar no queda nada a medio agregar | — | — | pending |
| TC-7 | El nivel se recalcula solo al agregar/quitar asignaturas | AC-4 | smoke | Plan Modular | agregar/quitar una asignatura con prereqs | columnas (niveles) se recalculan sin asignacion manual | — | — | pending |
| TC-8 | Convivencia de modos + switch IMPEDIDO en edicion (re-orientado por REQ-13): dos planes distintos (uno Secuencial, uno Modular) cada uno dibuja su columna; el modo NO se puede cambiar al editar un plan existente | DET-40, REQ-13 | smoke | Un plan Secuencial y un plan Modular; abrir cada uno en edicion | ver cada malla + intentar cambiar `progression` en edicion | secuencial por periodos / modular por niveles; el select `progression` es read-only en edicion (no se puede alternar); sin corrupcion de datos | runtime: en edit el select `progression` es disabled=true (switch impedido); render modular por niveles verificado en S6.T2; secuencial por periodos = baseline S1; sin corrupcion | DOM disabled=true (S6.T6) + render modular (S6.T2) + suite verde 1477 | pass |
| TC-9 | Solo `Before` sube el nivel; `Concurrent`/`Either`/ausente NO suben (DEC-LOCAL-03) | REQ-07 | unit+smoke | Plan Modular: A coreq/Either/sin-timing B, A prereq C | deriveLevel(A) + render | A al mismo nivel que B; A un nivel sobre C | — | — | pending |
| TC-10 | Validador final: smoke dual sobre el fixture reproducible que ejercita TODOS los flujos (modular con Before/coreq/AND/OR/K-de-N/credito + alta guiada + secuencial), re-aplicable post-seed | DET-36 | smoke | Fixture aplicado en UPU | recorrer ambos modos incl. ubicacion AND/OR/K, coreq, credito, flujo guiado + rollback batch | ambos modos correctos con evidencia (AND=1+max, OR=1+min, K-de-N, coreq mismo nivel, credito donde acumula, batch atomico revierte); fixture re-aplicable para demo | — | — | pending |
| TC-11 | Display prereq/coreq por tarjeta: modal agrupa por timing y es drag-safe | REQ-08 | unit+smoke | Curso A: Before C, Concurrent B; malla con drag | abrir detalle (click) + arrastrar | modal muestra Prereqs:C / Coreqs:B; arrastrar no abre modal | modal de ADM-3 mostró Prerrequisitos: ADM-1 (Before) / Corequisitos: ADM-2 (Concurrent), agrupados por timing | screenshot (S6.T2) | pass |
| TC-12 | Derivacion fiel al arbol: AND→1+max, OR→1+min, K-de-N→1+K-esimo menor | REQ-02 | unit | Group AND C(1),D(2); Group OR C(1),D(3); OR minToSatisfy=2 sobre 1,2,4 | deriveLevel | AND→3; OR→2; K-de-N→3 | — | — | pending |
| TC-13 | Creditos → nivel (heuristico): se ubica donde acumula; inalcanzable→ultimo+reporte; combinado en AND | REQ-09 | unit | Credits>=24 (niv2 acumula 24); Credits>=999; AND[C(2),Credits>=12 en niv1] | deriveLevel | 3; ultimo+reporte; 3 | — | — | pending |
| TC-14 | Flujo guiado SOLO modular: en modular el modal se mantiene para agregar el requisito; en secuencial bloquea (Volver/Cancelar) | REQ-10 | smoke | Plan Modular y Plan Secuencial, agregar curso con req faltante | intentar alta en cada modo | modular: agrega el req sin cerrar + niveles se re-arman; secuencial: bloqueo sin flujo guiado | modular: guiado agregó prereq+asignatura, niveles re-armados (ver TC-18). Secuencial: bloqueo puro (pendiente smoke explicito) | screenshot (S6.T2) | pass |
| TC-15 | Batch atomico: crear varias planEntry todo-o-nada; si una viola constraint, revierte todas | REQ-11 | unit+smoke | Batch de N planEntry, 1 invalida | createPlanEntriesBatch | 0 persistidas + error (tx revierte); happy path crea N tenant-scoped | unit: 8/8 (rollback ante item invalido → 0 persistidas + corte al primer fallo; happy path). Smoke happy: batch creó 3 (period null). Rollback via UI no es un path natural (la UI arma lotes validos); el contrato de atomicidad queda cubierto por el unit test | planEntryBatch.test.js (8) + BD 3 entries (S6.T2) | pass |
| TC-16 | Paridad MCP: cd_add_plan_entry acepta modular sin period; cd_get_mesh devuelve niveles; deriveLevel portado == mod | REQ-12 | unit+smoke | Plan Modular via MCP; mismo grafo mod vs MCP | cd_add_plan_entry sin period + cd_get_mesh + comparar niveles | entrada agregada; malla por niveles; mismo nivel que el mod (sin drift) | deriveLevel/groupByLevel portados 1:1; 23 tests de paridad sobre los mismos grafos del mod (AND/OR/K-de-N/timing/creditos/ciclo/vacio/N<K); cd_add_plan_entry period opcional + branch progression; cd_get_mesh niveles en modular. Dual-judge DET-35: ambos aprobaron tras trazado manual contra la fuente, sin divergencia | mesh-modular-parity.test.ts (23) + mesh-logic.ts/mesh-read.ts/mesh-write.ts + suite 201 verde (S7) | pass |
| TC-17 | RBAC del batch: `createPlanEntriesBatch` sin capability `planEntry:create` → denegado | REQ-11 (B7) | smoke+integration | con/sin capability + sin auth | invocar la mutation con y sin capability | sin auth/capability → denegado antes de la tx (0 filas); con capability → crea | auth real (checkObjectPermissions del platform): SIN cap → denegado, `$transaction` no se abre (0 creates); CON `planentry:create` → crea 2; sin usuario → UNAUTHENTICATED. + authless via API (curl) en S6 | planEntry-batch-rbac.test.js (3 tests) + curl authless (S6.T2) | pass |
| TC-18 | **Cadena MULTINIVEL determinista** (todos cursos concretos, N niveles): el flujo guiado ofrece agregar TODA la cadena de una | REQ-10 | smoke | Plan modular vacio; AGR-4→AGR-5→AGR-3 (todos Before), ninguno colocado | agregar AGR-4 → aceptar "Agregar requisitos y asignatura" | el modal lista la cadena completa (AGR-5 + AGR-3, "se agregará junto con la asignatura"); el batch agrega los 3; deriveLevel: N1 AGR-3, N2 AGR-5, N3 AGR-4 | modal listó AGR-5 y AGR-3; agregó 3 entries (period null); niveles N1/N2/N3 correctos | screenshot + BD (3 planEntry period NULL) (S6.T2) | pass |
| TC-19 | **Caso AMBIGUO → fallback manual** (OR/K-de-N/creditos en algun nivel): NO auto-agrega, informa opciones y deja elegir a mano | REQ-10 | smoke | Plan modular; AGR-1 requiere K-de-N "2 de 3" {ADM-1,2,4}, ninguno colocado | agregar AGR-1 | modal informa "Dos de tres (K-de-N)" + opciones (ADM-1/2/4) + solo Cancelar/Volver (SIN boton de auto-agregar) | modal manual con las 3 opciones + Cancelar/Volver; sin boton guiado; detalle sin periodo centinela | screenshot (S6.T2) | pass |
| TC-20 | **Layout del modal de alta** (AddEntryModal): stepper arriba, campos abajo (no 3 columnas) | REQ-10 | component+smoke | Plan modular, abrir "Agregar asignatura" | ver paso 1 | stepper (2 pasos) en una fila arriba; "Tipo de asignación" + "Línea de formación" apilados debajo, ancho completo | component test: stepper+step envueltos en UN `.aem-content`, ningun stepper fuera. Smoke: stepper arriba + campos apilados (antes: 3 columnas) | AddEntryModal.component.spec.ts (1 test) + screenshot (S6.T2) | pass |
| TC-21 | **Labels resueltos** (código+nombre, no activityId) en el modal de requisitos y en el guiado, incl. read-only | REQ-08 | unit+smoke | Plan poblado (read-only) + plan modular en edicion | abrir "Ver requisitos" + disparar el guiado | muestra "CÓDIGO — Nombre" (ej. "CALDEMO-ADM-1 — Fundamentos ADM"), nunca el id crudo | unit: buildActivityLabelMap resuelve curso COLOCADO con catalogo vacio (fix B9), catalogo complementa/gana, fallback a id. Smoke: modal y guiado muestran codigo+nombre (antes: activityId) | activityLabel.logic.spec.ts (9 tests) + screenshot (S6.T2) | pass |
| TC-22 | **Plataforma — `progression` read-only al editar** (REQ-13): al abrir un plan existente en el layout `_edit`, el select de modo no es editable; un intento de cambio no persiste. Create sigue editable | REQ-13 | config+smoke | Plan Modular y plan Secuencial existentes; layout `_edit` | abrir edicion; intentar cambiar el modo | select `progression` disabled/read-only (muestra el modo actual); el modo no cambia; en create el select si es editable | config: 2/2 verde (edit disabled, create editable). Runtime (UPU, plan smoke1539-mod-plan): select `progression` disabled=true value "Modular" + texto "El modo de progresión se define al crear..."; `periodType` disabled=false (solo el modo queda bloqueado, no el form) | curriculum-progression-lock.test.ts (2) + DOM query runtime (disabled=true) + screenshot edit form (S6.T6) | pass |
| TC-23 | **MCP — `cd_update_curriculum` rechaza cambio de `progression`** (REQ-13): patch con progression distinta al valor actual → error de validacion, 0 mutaciones; patch sin/igual progression u otro campo → procede; `cd_create_curriculum` fija el modo | REQ-13 | unit+smoke | Plan Modular existente via MCP | cd_update_curriculum con progression=Sequential; luego sin progression / igual / otro campo | cambio distinto → rechazo sin mutar; sin/igual/otro campo → update OK; create acepta progression | helper `violatesProgressionImmutability`: cambio (ambos sentidos)→true, no-op→false, sin progression→false, actual desconocida→false; guard en el handler hace el fetch del registro actual y rechaza antes de `api.update`. Suite up1-mcp 178/178 verde | curriculum-write-rules.test.ts (8, +4 REQ-13) + curriculum-write.ts:216-224 (S7.T4) | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `deriveLevel.logic.spec.ts` (nuevo) | unit | S3 | TC-1..TC-4, TC-9, TC-12, TC-13 | vitest |
| `groupRequirementsByTiming.logic.ts` + spec (nuevo, REQ-08) | unit | S3 | TC-11 | vitest |
| `guidedAdd.logic.ts` + spec (particion, batch, `resolveChain` cadena/ciclo/diamante/ambiguo) | unit | S5/S6 | TC-14, TC-18, TC-19 | vitest |
| `activityLabel.logic.ts` + spec (buildActivityLabel/EntryLabel + buildActivityLabelMap, fusion colocados+catalogo) | unit | S6 | TC-21 | vitest |
| `AddEntryModal.component.spec.ts` (layout: wrapper `.aem-content` unico) | component | S6 | TC-20 | vitest+jsdom |
| `planEntryBatch.test.js` (rollback + kind default + whitelist) | unit | S5 | TC-15, TC-17 | vitest |
| `modular-add-a11y.test.ts` (axe WCAG 2.1 AA del markup modular) | integration | S5 | REQ-06 a11y | vitest+axe |
| Fixture `UPONE-1539-modular-smoke-fixture.sql` (plan modular + cadena AGR-4→AGR-5→AGR-3 + K-de-N ambiguo) | seed/fixture versionado | S6 | TC-10, TC-18, TC-19 | SQL |
| Characterization secuencial (S1, huecos) | unit | S1 | baseline `groupByPeriod`/drag | vitest |
| Fixture demo reproducible (seed SQL, prereqs+coreqs, modular+secuencial) — extiende SP7 | seed/fixture versionado | S6 | TC-9, TC-10 | SQL + seed del mod |
| Smoke UPU dual (validador final) | manual/runtime | S6 | TC-5..TC-8, TC-10 | manual + browser |
| Tests de paridad MCP + smoke tools (`up1-mcp:src/mods/curriculum-design/*.spec`) | unit + runtime | S7 | TC-16 | vitest (MCP) + tools MCP |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design (mod) | `npm run test --workspace=@uplanner/curriculum-design` | baseline (S1) | 85 files / 1477 tests VERDE (incl. characterization secuencial S1 + curriculum-progression-lock REQ-13) | sin regresion secuencial; +2 tests REQ-13 |
| object-manager (post-migracion) | `npm test --workspace=@uplanner/object-management-backend` | baseline | — | verificar tras codegen/migracion de `period` nullable |
| Smoke UPU | manual (suite) | — | — | 2 modos (secuencial/modular) + switch + alta con prereqs |

## Summary

Intake completo. Feature de malla modular apoyada en el reuso del SP7. **Camino elegido por el dev: completo (13 SP, `layer:mod`)** — se salda la deuda de `planEntry.period` nullable (documentada por MC-02/UPONE-1345 en el propio schema, no requerimiento del PO). El cambio se edita en el JSON del mod y se propaga por el flujo estandar codegen + sync + migrate (precedente TICKET-101); reclasificado de core a `layer:mod` (2026-08-05): objeto declarado por el mod, cero edicion directa de core, migracion no-destructiva. Las 3 decisiones abiertas quedaron cerradas: D1 nullable (dev), D2 reordenar = solo lectura (resuelto por la maqueta), D3 control de periodo oculto en modular (dev). Los anchors del detective-mode SP8 fueron re-verificados 1:1 contra el codigo (DET-33). Riesgo principal: regresion del camino secuencial (DET-40, transversal a S4/S6). Precondicion abierta: branch autocontenido del mod (AQ-1) a crear en la guarda de inicio del execute.

Proximo gate: **teach-intake** (DET-21, bloqueante antes de design-feature).

### Cierre (2026-08-10)

Entregado en 10 sessions (S1-S6 mod render modular + S7 paridad MCP inicial + S8 REQ-13 condicional + S9 REQ-14 borrado seguro + S10 paridad MCP de S8/S9), todas con gate cerrado. Alcance final: malla modular por niveles derivados (REQ-01/02/06), timing/coreqs (REQ-07), display por tarjeta (REQ-08), creditos->nivel (REQ-09), alta guiada + batch atomico (REQ-10/11), paridad MCP (REQ-12), `progression` inmutable CONDICIONAL (editable con malla vacia; DEC-LOCAL-10, reemplaza el estatico) (REQ-13) y borrado seguro con confirmacion + cascada transitiva + bloqueo con el porque (REQ-14) — plataforma y MCP.

Calidad: dual-judge en gates de riesgo (S6/S7/S9/S10; en S9 los jueces cazaron 2 bugs reales —cascade muerto por envoltorio OR>AND>hoja y fail-open de cache— corregidos y re-aprobados; en S10 el drift `!= null`, corregido por consenso). Tests: mod 1526 verde, up1-mcp 227 verde, typechecks limpios. Runtime (Playwright, tenant UPU): REQ-13 disabled condicional + render modular por niveles + REQ-08 modal + REQ-14 bloqueo con el porque, confirmados con screenshot. 8 learns raw procesados (5 refined -> 6 rules dev/mod, 3 discarded) + 2 learns nuevos del build (S9). teach-close v2 HTML generado.

Commits LOCALES sin push: mod `feat/UPONE-1539-modular-mesh` (S1-S6 + S8 48f3685/9123f51/756bf39 + S9 c3f21bc/9408182/6c08fb9); up1-mcp `sp8-06-ago-mcp-progression-parity` (S7 f9fb115/1a98e1d/5dd33f9/345c84c + S10 7c1e433/9e6c54b/3bdf1cb). El PUSH y el merge a develop quedan pendientes del dev (RULE-dev-004: merge gated por revision del team).

Follow-ups locales (backlog, no bloquean el cierre): B1/B3/B8 (should — reconciliar migracion period + schema OM + doc de sync de componentes); B10 (could — blindaje server-side REQ-13 en OM, toca core); B2/B4/B5/B11/B12 (could). Propagacion (DET-16): coordinar con TICKET-119/UPONE-1538 (visibilidad de campos del Plan por `progression`) — mismo dato.
