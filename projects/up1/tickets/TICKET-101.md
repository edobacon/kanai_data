---
id: TICKET-101
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1378
module: curriculum-design
autopilot: autonomous
---

# SP7 · P1 — Requisitos de asignatura (editor visual Y/O + alerta de impacto)

> **Arrastre SP6 → SP7 (2026-07-21).** Planificado y scaffoldeado en SP6 (analisis de alcance profundo + pre-spec REQ-01..09), no ejecutado; pasa a SP7 como P1 de curriculum-design. Jira renombro el titulo a "SP7 · P1". Ficha de analisis SP7: `uplanner/specs/up1/sp7/UPONE-1378-requisitos-asignatura.md`. La revision previa NO se rehace; el design formal parte del pre-spec y las 6 decisiones de alcance ya registradas.
> **P1** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (Curriculum Design | Plan de estudio) · Jira **[UPONE-1378](https://u-planner.atlassian.net/browse/UPONE-1378)** · 8 SP · repo `mod` (FE) · `creates_visual: true`.
> **Pre-spec (fuente de design):** [`sp6/historias-usuario-sp6.md` — P1](../../../../uplanner/specs/up1/sp6/historias-usuario-sp6.md) + mockup [`sp6/mockup-sp6.html`](../../../../uplanner/specs/up1/sp6/mockup-sp6.html). El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** El ticket declara `depends_on: []` (Jira: "Dependencias: Ninguna"). Arranca sin bloqueantes. **Base de SP5 ya cerrada** (habilita este editor): MC-03 / [TICKET-083](TICKET-083.md) (objeto `requirement` + 3 RT + helpers, closed) y MC-09 / [TICKET-089](TICKET-089.md) (guard de plan Active + alerta, closed). Ver secuencia SP6 en `sp6/historias-usuario-sp6.md` §"Secuencia recomendada" (P1 arranca en paralelo con P2/P4).

## Request

> *(literal de UPONE-1378 — DET-3: no reescribir)*

Como **configurador curricular**, quiero editar los prerrequisitos y correquisitos de una asignatura como un árbol de condiciones (Y/O) y ver qué planes se ven afectados al cambiarlos, para definir las condiciones de la malla sin depender de seeds.

## Análisis de alcance profundo (2026-07-07, verificado contra código)

**Correcciones de hecho al ticket (el código refuta supuestos):**
- **`deriveElectivity.js` NO aplica** a este editor (opera sobre `planEntry.blockId`, otro dominio). La "electividad" del árbol de requisitos = `Group` con `combinator=OR`, no ese helper. → sacar de "Herencia de SP5".
- **`CompositeSectionTree` es precedente PARCIAL, no extensión directa:** su modal es de 1 paso y no tiene combinador AND/OR. El modal 2 pasos + árbol Y/O es **UI nueva** que toma piezas de bajo nivel (`treeOps`, keyboard nav), no "extender" el componente. Dimensionar REQ-02 como componente nuevo.
- **RBAC ya declarado** (`capabilities.json:129-146`: `requirement:view/create/modify/delete`) → REQ-06 es wiring FE, no capability nueva.
- **MCP `cd_manage_requirement` solo soporta view+create** (no update/delete) → el trabajo MCP es agregar `action:update`/`delete`, no "ajustar".

**Decisiones pendientes (para el dev):**
1. **⚠️ BL-1 puede ser más profundo que "extender RT_PATTERN" (prioridad alta).** El único create de `requirement` verificado end-to-end es el **seed (Prisma directo)**, no la mutación GraphQL/MCP. No hay certeza de que `createInstance(objectType="requirement", data={recordType, combinator,...})` persista los campos RT-específicos. **Antes de estimar:** verificar con el servidor corriendo; y decidir la convención de objectType para create/update de estos RT — recomendación del análisis: alinear todo (create/update/MCP/FE) al patrón **RT literal** (`rt__Group__requirement`), como el resto de la plataforma.
2. **¿El editor permite ELIMINAR nodos del árbol?** Si sí, hoy no hay guard de delete para `requirement` → falta extender `requirementCategoryDelete.resolver.js` (único override de deleteInstance, H7) con la regla de plan `Active` (misma que MC-09 aplica a create/update). Recomendación: sí incluirlo (evita brecha inconsistente).
3. **¿Árbol genérico anidable (REQ-03 literal) o UX de "vías" (mockup)?** El mockup muestra 2 niveles (OR-de-ANDs); el seed EST200 tiene **3 niveles**. Si se opta por "vías", los árboles >2 niveles no serían editables fielmente → contradice "se reconstruye idéntico" (REQ-03). Decidir y documentar.
4. **Dependencias circulares cruzadas (CAP-CUR-004, regla Must de Confluence):** no cubiertas hoy (la detección de ciclos solo mira dentro del mismo árbol). ¿Validar al guardar `RecordState` o diferir al "motor de evaluación"? Recomendación: diferir, pero **documentarlo** (hoy el ticket lo omite).
5. **Familias del modal:** el mockup ofrece 4+ tipos (gpa/period/competency/program) sin respaldo en el modelo (enums cerrados a Credits/activity). Mostrar **solo las 3 con respaldo** (Curso/Electivo-Group/Métrica-Créditos).

**Riesgos:** BL-1 subestimado (create no verificado); regresión de CurricularSection al tocar `RT_PATTERN` compartido; guard de delete ausente = brecha de negocio; UI que promete familias no persistibles; H7 concentra riesgo (update y delete son archivos únicos por mod).

### Decisiones de alcance (dev, 2026-07-07)

1. **Convención RecordType = RT literal (`rt__Group__requirement`), y BL-1 AMPLIADO.** Verificado: CurricularSection se crea con `typedRecordName(recordType)` (RT literal → el resolver hace bucket-split y persiste los campos RT); `requirement` hoy se crea con el base `REQUIREMENT` (`requirement-write.ts:209`) → **el create actual NO persiste bien los campos RT**. BL-1 = (a) **corregir el create** (MCP: `REQUIREMENT` → `typedRecordName(recordType)`), (b) **extender `RT_PATTERN`** de `polymorphicUpdate.resolver.js` a `requirement` para el update, (c) **FE usa el RT literal**. Todo bajo una sola convención, como CurricularSection. Verificación runtime final al ejecutar.
2. **Editor = árbol Y/O anidable a cualquier profundidad (REQ-03 literal).** No la UX de "vías" (2 niveles) del mockup — el árbol genérico edita fielmente casos como el seed EST200 (3 niveles). Reusar piezas de bajo nivel de `CompositeSectionTree` (treeOps, keyboard nav), no extender el componente.
3. **El editor PERMITE eliminar nodos + guard de plan Active.** Se extiende el guard de dominio (no editar/borrar requisitos de una Activity en `Curriculum status=Active`, como MC-09) al **delete** de `requirement` — vía el único override de `deleteInstance` del mod (`requirementCategoryDelete.resolver.js`, H7) o su generalización.
4. **Familias del modal (paso 1) = solo las 3 con respaldo:** Curso (`RecordState`), Electivo (`Group` OR), Métrica-Créditos (`MetricThreshold`). NO mostrar gpa/period/competency/program (enums cerrados / RT no implementados) para no prometer UI no persistible.
5. **Dependencias circulares cruzadas (CAP-CUR-004, Must) — VALIDACIÓN COMPLETA en P1.** Al guardar un `RecordState` (A→B), recorrer el **grafo transitivo** de prerequisitos entre Activities y rechazar si se formaría un ciclo (directo A↔B o transitivo A→B→C→A). Cumple CAP-CUR-004 desde el inicio. **Límite:** es validación *estructural del grafo de prerequisitos* (evitar ciclos), NO el motor de evaluación del avance del estudiante (eso sigue fuera de alcance). **Impacto:** amplía el alcance de P1 (helper de recorrido de grafo + detección de ciclos con guard de profundidad) → refuerza que los 8 SP publicados quedan cortos; revalidar al armar el spec.

6. **No-negativos en los campos numéricos que P1 crea/edita — SOLO los RT de `requirement` (REQ-09).** Todo campo numérico que el editor P1 cree o edite nace con el guard `minimum: 0`: los RT de `requirement` (`minToSatisfy`, `creditsRequired`, `value`, `thresholdMinGrade`) y cualquier campo numérico nuevo que el ticket agregue. Es parte natural de la historia (los campos que el propio editor de requisitos escribe no deben aceptar negativos).
   - **⚠️ Re-alcance (dev, 2026-07-08) — P1 se ciñe a la historia UPONE-1378.** La ampliación original (REQ-08) barría `minimum: 0` sobre **todos** los campos numéricos de negocio del mod (Activity `credits`, planEntry `period`/`credits`, y los RT de `curricularsection`/`curriculum`), no solo los del editor de requisitos. Esos campos NO son parte de la historia P1 → **se mueven a [TICKET-105](TICKET-105.md)** (ticket DKC-local relacionado a UPONE-1378, para triage al cierre del sprint). P1 conserva únicamente el guard sobre los campos que el editor de requisitos crea/edita (REQ-09).
   - **DET-32 (reuso) — la capacidad YA existe en core, NO se construye motor:** `object-manager/src/graphql/resolvers/jsonFieldValidator.resolver.js:294` (`validateBaseFieldFormats`) enforcea `minimum`/`maximum` sobre campos escalares a nivel API leyendo `core_FieldDefinition.properties`, que puebla `codegen` desde el JSON. Cubre a todo consumidor que salte Vueform (MCP, n8n, service accounts, bulk). Precedente en uso: `"minimum": 0` en `restrictiondefinition.json` / `contractrestriction.json`. → **Trabajo DECLARATIVO:** agregar `"minimum": 0` en el JSON del **mod** + `npm run codegen` + `npm run sync`. Sin migración de columna (validación, no cambia el tipo Prisma).
   - **`layer: mod` INTACTO / branch guard (RULE-dev-004) respetado:** los RT de `requirement` los declara curriculum-design → se editan en el mod, cero edición directa de core. P1 sigue mod-only.
   - **Divergencia de UPONE-1378 (Jira = source of truth) — RESUELTO: solo DKC (dev, 2026-07-07).** REQ-09 NO está en las AC de Jira y **por decisión del dev NO se refleja en Jira** (queda como alcance técnico local del ticket DKC). No editar UPONE-1378 por este motivo.
   - **✅ EN ALCANCE (P1) — campos numéricos de los RT de `requirement` que el editor crea/edita:**

     | Objeto / hijo | Campos | Archivo del mod a editar |
     |---|---|---|
     | `rt__Group__requirement` | `minToSatisfy`, `creditsRequired` | `objects/RecordTypes/…` |
     | `rt__MetricThreshold__requirement` | `value` | `objects/RecordTypes/…` |
     | `rt__RecordState__requirement` | `thresholdMinGrade` | `objects/RecordTypes/…` |

     **Excluido (system-managed):** `position` de `requirement` base — lo pone el sistema (orden Composite), nunca negativo.

   - **⛔ FUERA DE P1 (movido a [TICKET-105](TICKET-105.md)):** el barrido de `minimum: 0` sobre `Activity.credits`, `planEntry.period/credits`, los RT de `curricularsection` (`weight`, `week`, `duration`, `hours`) y de `curriculum` (`totalCredits`, `totalPeriods`), más la deuda de Offering (`maxCapacity`/`usedCapacity`, owner uengagement-up1). Ver TICKET-105.

## Triage (convergencia intake-explore, 2026-07-24)

> Las hipotesis del intake nacieron como las 5 "Decisiones pendientes (para el dev)" del analisis
> profundo (2026-07-07) y convergieron en las 6 "Decisiones de alcance". Esta tabla las formaliza
> con status final (DET-1 certeza) + evidencia multi-capa (DET-5). Ninguna queda en `?`.

| H | Hipotesis | Status | Evidencia (capa: ref) |
|---|-----------|--------|------------------------|
| H1 | El create/update de `rt__*__requirement` ya persiste bien los campos RT-especificos | ✗ refuted (estado actual) | backend: `polymorphicUpdate.resolver.js:159` — `RT_PATTERN` hardcoded a `curricularsection`, no cubre `requirement` (update inexistente). MCP: `requirement-write.ts:209` crea con base `REQUIREMENT`, no `typedRecordName(recordType)` → los campos RT no hacen bucket-split. Precedente correcto: CurricularSection usa RT literal. → habilita BL-1. |
| H1-run | El fix BL-1 (create con RT literal + `RT_PATTERN` ampliado) persiste y reconstruye el arbol end-to-end | ~ inferred | Plan verificado a nivel codigo; **verificacion runtime diferida a execute S1** (server no corrido en intake). Es AQ-1 — riesgo #1. |
| H2 | Editor = arbol Y/O anidable a cualquier profundidad (no UX "vias" de 2 niveles) | ✓ confirmed | Decision #2. seed EST200 (`seed/_data-requirement.js`) tiene 3 niveles; mockup SP6 `:1724` solo modela 2 → insuficiente. Reusa piezas de bajo nivel de `CompositeSectionTree`. |
| H3 | El editor permite eliminar nodos y requiere guard de plan Active en el delete | ✓ confirmed | Decision #3. Guard existe para create/edit (`requirementActivityGuard.js`, MC-09) pero NO para delete; unico override es `requirementCategoryDelete.resolver.js` (H7). |
| H4 | El modal paso 1 ofrece solo las 3 familias con respaldo en el modelo | ✓ confirmed | Decision #4. Enums cerrados (RecordState.targetType=activity, MetricThreshold.metric=Credits) → gpa/period/competency/program NO persistibles; no ofrecerlos. |
| H5 | La validacion de dependencias circulares cruzadas (CAP-CUR-004) entra COMPLETA en P1 | ✓ confirmed (amplia alcance) | Decision #5. Hoy la deteccion de ciclos solo mira dentro del mismo arbol (`buildRequirementTree.js`); falta recorrido transitivo del grafo de prerequisitos → helper nuevo. Refuerza que 8 SP publicados quedan cortos (`estimated: 13`). |
| H6 | REQ-09 (no-negativos) se resuelve declarativo reusando core, solo sobre los RT de `requirement` | ✓ confirmed | Decision #6 + DET-32. `jsonFieldValidator.resolver.js:294` (`validateBaseFieldFormats`) ya enforcea `minimum` desde `core_FieldDefinition.properties`; precedente en uso: `restrictiondefinition.json`. Barrido a otros campos → [TICKET-105](TICKET-105.md). |
| H7 | El mockup SP6 sirve como design-draft (DET-18) | ✗ refuted | mockup `:1724` modela solo OR-de-ANDs de 2 niveles; H2 exige anidable → **draft nuevo requerido** (ficha SP7 §9). |

### Active questions (gaps post-intake)

- **AQ-1 — `inferred`, CRITICA (verificar primero en execute S1):** el fix BL-1 no se verifico runtime (server no corrido). Si `createInstance`/`updateInstance` con RT literal no persiste ni reconstruye el arbol, el editor no funciona. Primera task de S1: levantar server + verificar create/update/delete + reconstruccion end-to-end.
- **AQ-2 — precondicion operativa (branch guard):** el repo del mod esta en `feat/UPONE-1451-bibliography-access`; RULE-dev-004 exige rama mod-only con base `develop` para este ticket. Resolver en la guarda de inicio del execute (REQ-02), antes de tocar codigo.
- **AQ-3 — riesgo de regresion:** `polymorphicUpdate.resolver.js` es codigo compartido con CurricularSection; ampliar `RT_PATTERN` obliga regression de CurricularSection en S1.
- **AQ-4 — fuera de alcance (documentado, REQ-07):** el motor de evaluacion del avance del estudiante NO entra. La validacion de ciclos de P1 (H5) es estructural del grafo de prerequisitos, no evaluacion de avance.

## Reencuadre de alcance (SP6 planning, dev 2026-07-24)

> **Corrige el eje del ticket.** La revision anterior (analisis 2026-07-07 + decision #2) trato el ticket
> como un editor de arbol Y/O generico y autonomo. Contrastado contra el transcript de la planning de SP6
> (`Sprint Planning Migracion uAssessment - 2026-07-06`, notas Gemini) y el `sp6/mockup-sp6.html`, el eje
> real es otro. DET-3 intacto: el Request literal no se toca.

**Fuente (SP6 planning 2026-07-06):**
- Alcance canonico (resumen "Proximos pasos"): *"establecer tipos de prerrequisitos **dentro del programa de asignatura** para asegurar que los cursos previos esten definidos **en la malla**."*
- `00:04:51`: los prereqs *"quedo modelado en la parte del plan de estudio para detectarlos, pero **no existe la contraparte que es el programa de asignatura**."* → el consumo en la malla ya existe (SP5); falta la **generacion**.
- `00:06:28`: la tarea es establecer los prereqs y sus tipos (~8 SP), con la advertencia de que *"el **record list no soporta los budgets/Groups**... en columna esta en filas."*
- `00:06:28`-`00:12:06`: **homologar las secciones polimorficas** (patron curricular-section) del programa de asignatura → requisitos es **una seccion mas del programa**, consistente con el patron de tabs.
- `00:43:00`: *"ver la malla desde el programa de asignatura... **no quedo dentro del ticket**"*; candidato de bajo esfuerzo (el componente de malla ya existe con los datos).
- `mockup-sp6.html` pestana Requisitos (`:981`): **RecordList** de condiciones (Clase/Requisito/Condicion/Via/Exigencia) + "Crear registro" (**modal 2 pasos**, `:1073`) + "**Ver regla unificada**" (arbol read-only, `:1167`) + modelo de **vias** + herencia MADS para el silabo (`:988`).

**Decisiones del reencuadre (dev 2026-07-24):**
1. **Requisitos = seccion del Programa de asignatura** (patron curricular-section / secciones polimorficas), NO una herramienta de arbol autonoma. Superficie base tipo `mockup-sp6`: lista de condiciones + modal 2 pasos + vista "regla unificada" del arbol. El `requirement` sigue siendo el arbol Y/O anidable del modelo (AC Jira REQ-03); lo que cambia es la **presentacion como seccion**, no el modelo.
   - **Supersede parcialmente la decision #2 (2026-07-07):** el arbol anidable NO es la superficie de edicion principal; es el modelo + la vista "regla unificada". La edicion sigue el patron de seccion del mockup.
2. **Circuito con la malla explicito (REQ-11 nuevo):** los prereqs generados en el programa de asignatura deben ser consumidos por la deteccion que la malla ya tiene (SP5: banner "prerrequisitos no ubicados", orden/niveles por DAG). Cubrir y **verificar el round-trip**, no solo la alerta REQ-05.
3. **La malla NO se visualiza desde el Programa de asignatura (correccion dev 2026-07-24).** El trabajo de malla vive en **Plan de estudio**, no se accede desde la asignatura. Se **descarta el REQ-10 anterior** (ver malla desde asignatura). Lo que aplica es el **contrato de consumo**: dentro de la malla curricular (en plan de estudio) se debe **respetar lo establecido como requisitos en la asignatura** y validarlo al construir la malla, detectando prerequisitos no ubicados antes. Fuente SP6:
   - `00:01:49` (Esteban): *"...completar algunas cosas de la malla... las logicas de requerimientos de los cursos, es decir, que un curso, si voy a poner un curso que tiene como requisito previamente haber aprobado otro, me alerte que tengo que haber definido el otro previamente en la malla."*
   - `00:04:51` (Eduardo): *"los prerrequisitos... quedo medianamente modelado en la parte del plan de estudio para detectarlos, pero no existe la contraparte que es el programa de asignatura."*
   - **Reparto (RESUELTO — dev 2026-07-24: ENTRA en este ticket):** este ticket entrega la **contraparte** (definir requisitos en la asignatura) **Y ADEMAS extiende el componente de malla existente** (plan de estudio, mod curriculum-design) para **detectar/validar los prereqs al construir la malla** (SP6 `00:01:49`). No es una vista dentro de la asignatura: la malla sigue en plan de estudio; se extiende el componente que ya existe (SP5).

**Impacto en esfuerzo:** con la extension del componente de malla dentro del alcance (dev 2026-07-24), el trabajo supera claramente los 8 SP publicados y **sube por encima de `estimated: 13`**. Recalcular en design-feature (dos frentes: generacion de requisitos en la asignatura + extension de deteccion en la malla).

**REQ del reencuadre (a transcribir al spec por design-feature):**

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| ~~REQ-10 · ver malla desde asignatura~~ | **descartado** | correccion dev 2026-07-24 | La malla NO se visualiza desde la asignatura; el trabajo de malla va en plan de estudio. |
| REQ-11 · requisitos respetados por la malla (incl. extension del componente de malla) | confirmed | SP6 `00:01:49` + `00:04:51` · dev 2026-07-24 | Los requisitos definidos en la asignatura son respetados y validados por la malla al construirla: al ubicar un curso, si su prerequisito no esta ubicado antes, la malla lo detecta/alerta. **En alcance de este ticket:** extender el **componente de malla existente** (plan de estudio, mod curriculum-design) para esa deteccion/validacion. La malla NO se visualiza desde la asignatura. |

## Analisis de factibilidad e impacto (dificultad vs tamano, dev 2026-07-24)

> Objetivo (pedido del dev): distinguir **tamano/trabajo (SP)** de **dificultad de implementacion**, verificar el "cableado" que SP5 dejo para que esto no fuera doloroso, y mapear que se toca, cambios grandes y dano colateral. **Dimension REQ-11 (malla) pendiente del mapeo del componente (en curso).**

### Cableado dejado por SP5 (VERIFICADO contra codigo y specs)

SP5 dejo esto forward-compatible a proposito (`SPEC-curriculum-design-requirement-composite-tree` + `-active-plan-guard`):

| Cableado | Estado | Evidencia |
|----------|--------|-----------|
| Objeto `requirement` + 3 RT + enums cerrados | ✅ listo | `objects/requirement.json` + RecordTypes |
| Layouts por RT (`create/edit/view`) declarados | ✅ listo | `config/layouts/default_rt__*__requirement_*.json` |
| Reconstruccion del arbol (helper puro reusable por "la UI futura") | ✅ listo | `helpers/buildRequirementTree.js`; DEC-LOCAL-03: "la UI futura (MC-05/06) reusa el mismo helper" |
| Guard plan Active en **create** cableado | ✅ listo | `sectionValidation.resolver.js:142` (`assertActivityNotInActivePlan` para `REQUIREMENT_OBJECT`) |
| Guard plan Active en **update** | ⚠️ TRAMPA (corregido 2026-07-24) | `polymorphicUpdate.resolver.js:671-681` aplica MC-09 **solo en la rama `!RT_PATTERN`**. Extender `RT_PATTERN` a requirement lo MUEVE a `rtUpdateHandler`, que NO llama el guard → **se PIERDE MC-09 en update; hay que RE-CABLEARLO** (verificado por lectura de codigo) |
| Alerta de malla "plan no editable" + `EDITABLE_STATUSES` fuente unica | ✅ listo | `-active-plan-guard` REQ-04; modal on-edit **diferido explicitamente a S7-01 = este ticket** (DEC-LOCAL-04) |
| Malla consume bloques/prereqs (electivo `Group(owner=curriculum,OR)`) | ✅ habilitado | composite-tree "Habilita MC-04/05/06"; componente `modsComponents/CurriculumMesh` |
| Capability RBAC `requirement:view/create/modify/delete` | ✅ declarada | `capabilities.json` |

**Conclusion del cableado:** la mayor parte del andamiaje esta puesto. La UI reusa helper + layouts + guard + alerta; el modal de impacto tenia **este ticket como home designado**. El editor NO parte de cero.

### La deuda que SP5 difirio A PROPOSITO (= donde se concentra la dificultad)

SP5 documento que lo unico que NO hizo es lo riesgoso, y que su trigger es este ticket:
- **BL-1 (DEC-LOCAL-04 + backlog):** *"NO se soporta UPDATE de `rt__*__requirement`... Soportarlo exigiria extender el `RT_PATTERN` de `polymorphicUpdate.resolver.js` (codigo compartido → riesgo de regresion de CurricularSection). Se difiere a cuando MC-05/06 necesite edicion por UI."* Trigger declarado = MC-05/06 (este ticket). Riesgo tipificado por SP5: `medium | re-trabajo`.

### Toca / dano colateral (censo de consumidores)

| Punto que se toca | Que mas lo usa (colateral) | Dificultad |
|-------------------|----------------------------|------------|
| `RT_PATTERN` en `polymorphicUpdate.resolver.js:199` (exportado :699; usado en `:439/:671/:674`) | **CurricularSection** (mismo resolver comparte create/update/validate) → unico dano colateral real; exige **regression de CurricularSection**. **Ademas** el recableo del guard MC-09 al mover requirement a `rtUpdateHandler` (ver TRAMPA arriba) | **Media** (regex acotada + recableo de guard con test de que NO se perdio) |
| ~~Create RT literal~~ | **NO es trabajo (corregido 2026-07-24):** el create de `up1-mcp` YA usa `typedRequirementName` (`requirement-write.ts:29,292`). La premisa del analisis 2026-07-07 ("create con base REQUIREMENT no persiste RT") esta **refutada por codigo**. BL-1 se reduce a UPDATE + recableo del guard | **N/A** |
| Guard **delete** de `requirement` | `requirementCategoryDelete.resolver.js` (override H7) + `documentDependents.js` | **Baja-Media** |
| Ciclos cruzados transitivos (decision #5, CAP-CUR-004) | helper NUEVO de recorrido de grafo (hoy `buildRequirementTree` solo detecta ciclos **intra-arbol**) | **Media-Alta** (algoritmico nuevo) |
| FE seccion (RecordList + modal 2 pasos + regla unificada) | mod FE; reusa layout + `buildRequirementTree` + `CompositeSectionTree/{treeOps,keyboardNav}` | **Baja-Media** |
| REQ-05 alerta / REQ-06 RBAC / REQ-09 no-negativos | reusan guard + capability + `validateBaseFieldFormats` (core, ya enforcea) | **Baja** |
| REQ-11 extension `CurriculumMesh` (deteccion de prereqs al construir) | La deteccion YA existe al **agregar** (`CurriculumMesh/prereqCheck.logic.ts:171` `findMissingPrereqsForBatch` + `PrereqBlockModal`, verificado). Gap acotado: NO re-corre al **mover** + falta **banner mesh-wide** | **Media** (extension acotada de 2 piezas, no motor nuevo) |

### Veredicto (dificultad vs tamano)

- **Tamano/SP: alto** (>13). Dos frentes (asignatura + malla) + BL-1 + ciclos + MCP + DoD.
- **Dificultad: mayormente CONTENIDA** gracias al cableado SP5. NO hay cambio arquitectonico ni edicion directa de core (mod-only). La dificultad se concentra en **3 focos puntuales** (tras la correccion post-mapeo 2026-07-24): (1) extender `RT_PATTERN` compartido → **regresion CurricularSection + recableo del guard MC-09** que se pierde al mover requirement a `rtUpdateHandler` (el punto mas sutil/riesgoso); (2) **validacion de ciclos cruzados transitivos** (CAP-CUR-004): la logica existe HOY solo en `up1-mcp`, NO en el backend que usa la Suite → hay que **portarla** (logica nueva en el path FE); (3) REQ-11 extension de `CurriculumMesh` acotada a mover + banner mesh-wide. **Refutado:** el create NO esta roto (ya usa RT literal) → BL-1 mas chico de lo estimado el 2026-07-07.
- **Dano colateral: 1 punto real** = CurricularSection via `RT_PATTERN` compartido (mitigable con regression obligatoria). El resto es aditivo mod-only.
- **Recomendacion:** atacar los 4 focos riesgo-primero (S1 = BL-1 + verificacion runtime + regression CurricularSection) antes de la UI. Si el mapeo de `CurriculumMesh` revela que MC-05/06 quedo mas crudo de lo esperado, REQ-11 sube a Alta y el ticket amerita partirse (asignatura vs malla).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | UI nueva (mod-native): pestaña + modal 2 pasos + árbol Y/O editable + persistencia sobre `requirement` + alerta de impacto (solo lectura de planes). **+ habilitador BE (BL-1):** extender `RT_PATTERN` de `polymorphicUpdate.resolver.js` para soportar UPDATE de `rt__*__requirement` (hoy solo create+read) |
| Modulo principal | curriculum-design (mod) |
| Modulos afectados | curriculum-design (mod, FE + JSON de objetos; REQ-09 = `minimum:0` en los RT de `requirement` que P1 crea/edita → sync propaga a core, sin edición directa de core); lee `planEntry.activityId` (solo lectura); MCP: `cd_manage_requirement`, `cd_get_prereqs`. **Barrido de no-negativos a otros campos numéricos del mod + deuda de Offering movidos a [TICKET-105](TICKET-105.md).** |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | Pestaña "Requisitos", modal de alta 2 pasos, árbol Y/O anidable, alerta de planes afectados. **Requiere design-draft nuevo (DET-18)** antes del spec: la maqueta SP6 (`mockup-sp6.html`) solo modela 2 niveles ("vías"), NO el árbol anidable decidido (decisión #2). Ver "Design-draft (DET-18)" abajo + ficha SP7 §9/§10. |
| Data model | parcial | `requirement` ya se modela y persiste; no se crea objeto ni campo. **REQ-09:** se agrega la propiedad `"minimum": 0` a los campos numéricos de los RT de `requirement` que P1 crea/edita → `codegen` propaga a `core_FieldDefinition.properties`; `sync` lleva el JSON a core. **Sin migración de columna** (validación, no cambia el tipo Prisma). |

## Contexto (de Jira / historia P1)

El objeto `requirement` ya se modela y persiste (hoy cargado por seed); no hay UI para crearlo/editarlo. Un requisito es un árbol combinable con Y (todas) y O (al menos una) — ej. "Aprobar Cálculo I Y (Álgebra Lineal O ≥30 cr. de Ciencias Básicas)". **Alcance:** edición y persistencia del árbol. **Fuera de alcance:** el motor que evalúa el avance del estudiante (documentado).

## Context found (evidencia de código · fuente `sp6/analisis-por-punto.md` §1, `analisis-core-vs-mod.md` §1)

> Toda ruta:línea CONFIRMADA por lectura de código (repos co-ubicados en `uplanner/up1/`) salvo marca INFERIDO. **Clasificación: C — mod puro. Colisión con core: ninguna.** Core no aporta nada (no es capacidad transversal); la vía CORE es N/A.

- **Objeto ya modelado (SP5 MC-03):** `mods/curriculum-design/objects/requirement.json` (+ RecordTypes). Specs DKC: `SPEC-curriculum-design-requirement-composite-tree`, `SPEC-curriculum-design-requirement-active-plan-guard`.
- **Patrón de árbol a reusar:** `mods/curriculum-design/modsComponents/CompositeSectionTree/` — precedente directo del editor Y/O (Composite).
- **Guard de dominio ya existente:** `mods/curriculum-design/logic/helpers/requirementActivityGuard.js` (TICKET-089/MC-09) — bloquea crear/editar `requirement` si la Activity dueña está en un `Curriculum status=Active`. **La alerta de impacto (REQ-05) comparte la query "planes afectados" con este guard** (`planEntry.activityId` → `Curriculum.status`).
- **Fuera de alcance confirmado:** sin motor de evaluación del avance (degree-audit) — solo edición/persistencia del árbol.
- **Mapeo de dominio (confirmado 2026-07-03):** Programa de asignatura = `Activity` (recordType Course).

## Herencia de SP5 — qué quedó del objeto `requirement` (MC-03 / [TICKET-083](TICKET-083.md), cerrado; S7-01 diferido)

> P1 = **S7-01** del backlog de diferidos (`sp5/SP6-backlog-diferidos.md`), origen D1+D3 (emergente del mockup, no en el handoff), estimado 7 SP. El modelo ya existe; P1 agrega el editor FE **+ un habilitador BE** (ver ⚠️ BL-1). Verificado contra código 2026-07-07.

**El modelo `requirement` ya está construido y sembrado (SP5 solo persiste+lee, sin motor de evaluación):**
- Árbol Composite por `parentId`, base polimórfica `ownerType`/`ownerId` (curriculum/activity/offering) + 3 RecordTypes (spec `SPEC-curriculum-design-requirement-composite-tree`):
  - **`Group`** — `combinator` (AND/OR), `minToSatisfy` (K-de-N), `creditsRequired`.
  - **`RecordState`** — `targetType` (=`activity`, único en SP5), `targetId`, `mustBe` (Approved/Taken), `thresholdMinGrade`, `timing` (Before/Concurrent/Either).
  - **`MetricThreshold`** — `metric` (=`Credits`, único en SP5), `scope` (plan/category), `operator` (`>=,>,=,<,<=`), `value`.
  - Base: `effect` (EligibilityToEnroll/ProgressGate/Completion/DiplomaAward), `label` (requerido = nombre visible del bloque), `isHardRule`, `negate`, `overrideMode` (solo offering), `position`. Enums cerrados por JSON schema (no resolver — CONSTRAINT H7).
- **Las 3 "familias del MVP" del modal 2 pasos (S7-01) = estos 3 RT:** Curso → `RecordState`, Métrica → `MetricThreshold`, Y/O + electivo → `Group`.
- **Helpers puros ya existentes a REUSAR (confirmados en `mods/curriculum-design/logic/helpers/`):**
  - `buildRequirementTree.js` — items planos (`listInstances` por `ownerId`/`parentId`) → árbol, con detección de ciclos (copia de `CompositeSectionTree/buildTree.ts`). El editor lee/reconstruye con esto (DEC-LOCAL-03: la UI futura reusa el mismo helper).
  - `deriveElectivity.js` — `isElective = blockId != null` (para el bloque electivo).
- **Guard de impacto ya existente:** `requirementActivityGuard.js` (MC-09/[TICKET-089](TICKET-089.md)) bloquea crear/editar `requirement` si la Activity dueña está en un `Curriculum status=Active`, con error accionable que sugiere versionar. **La alerta de planes afectados (REQ-05) es el frente FE de este guard** (B-2 de TICKET-089: "modal de alerta de impacto on-edit completo, difiere de SP5 por falta de host" → el host es este editor).
- **Layouts por RT** (`default_rt__<RT>__requirement_{view,edit,create}.json`, RecordDetail, sin `_list`, no en menú) ya declarados.
- **Test data disponible:** seed EST200 (`seed/_data-requirement.js`) — árbol `Group[AND]{Group[OR]{Group[AND]{MAT110,MAT120},MAT210}, MetricThreshold≥60cr, RecordState PROG101}` + bloque "Electivo de Especialización" (Group OR, minToSatisfy=4, creditsRequired=24).

**⚠️ BL-1 — prerequisito técnico BE (no es solo FE): el UPDATE de `rt__*__requirement` NO existe.** Verificado en código (2026-07-07): `logic/polymorphicUpdate.resolver.js:159` → `RT_PATTERN = /^rt__([a-zA-Z0-9_]+)__(curricularsection)$/` — hardcoded a `curricularsection`, **no cubre `requirement`**. SP5 entregó create+read (DEC-LOCAL-04); el editor P1 es justo el trigger de BL-1: **hay que extender `RT_PATTERN` a `(curricularsection|requirement)` + regression de CurricularSection** (código compartido, riesgo de regresión) para que el árbol sea *editable*, no solo creable. Esto es trabajo BE del mod aunque el Jira lo rotule "mod (FE)".

## Pre-spec (transcrito de UPONE-1378 — criterios de aceptación)

| REQ | Certeza | source_ref | Enunciado (AC Jira) |
|-----|---------|-----------|---------------------|
| REQ-01 · pestaña Requisitos | confirmed | AC Jira | Pestaña "Requisitos" en la ficha de Activity; muestra el árbol existente o vacío con sus grupos Y/O. |
| REQ-02 · modal de alta 2 pasos | confirmed | AC Jira | Modal en 2 pasos (paso 1: tipo — curso / métrica / etc.; paso 2: detalle); la condición se añade al grupo seleccionado. |
| REQ-03 · árbol Y/O anidable + persistencia | confirmed | AC Jira | Árbol Y/O anidable, editable; persiste en `requirement` y se reconstruye idéntico al reabrir. |
| REQ-04 · validación de condición incompleta | confirmed | AC Jira | No permite guardar una condición incompleta (mensaje claro). |
| REQ-05 · alerta de planes afectados | confirmed | AC Jira | Al guardar un requisito de una asignatura usada en varios planes: alerta; sin aviso si no hay planes asociados; el aviso no modifica datos (lee `planEntry.activityId`). |
| REQ-06 · RBAC | confirmed | AC Jira | Crear/editar requisitos gateado por capability de edición del objeto; pestaña y acciones no aparecen sin permiso. |
| REQ-07 · sin motor de evaluación | confirmed | AC Jira | Sin motor de evaluación del avance del estudiante (fuera de alcance, documentado). |
| REQ-09 · no-negativos en los campos numéricos que P1 crea/edita | confirmed | dev 2026-07-07 (fuera de UPONE-1378, solo DKC) | Todo campo numérico que P1 cree o edite (RT de `requirement`: `minToSatisfy`, `creditsRequired`, `value`, `thresholdMinGrade`, y cualquier campo numérico nuevo que se agregue en el ticket) lleva el guard `minimum: 0` desde su definición. Reusa `validateBaseFieldFormats` (ya en core); se edita el JSON del **mod**, sync propaga a core, sin migración de columna. Ver Decisión #6. **El barrido a otros campos numéricos del mod (ex-REQ-08) se movió a [TICKET-105](TICKET-105.md).** |

**Detalle técnico (Jira):** componente FE nuevo (mod-native): pestaña + modal 2 pasos + árbol Y/O + persistencia sobre `requirement`. La alerta lee (solo lectura) los planes que referencian la asignatura (`planEntry.activityId`).

**MCP:** verificar/ajustar `cd_manage_requirement` y `cd_get_prereqs` para reflejar el árbol editable.

**Testing (Jira):** `.spec.ts` de composición Y/O, validación del modal, builder/reconstrucción del árbol, cálculo de planes afectados. Integration de guardado/reconstrucción. Stories del editor y del modal.

**Definition of Done (Jira):** tests (unit + integration) en verde con assertions concretas · lint + Prettier + tsc limpios (incl. tests y stories) · lang ES completo · sin artefactos de sync/seed commiteados · tools de up1-mcp actualizadas y verificadas · quality review + smoke en UPU.

## Design-draft (DET-18) - casos a cubrir (actualizacion 2026-07-21)

> `creates_visual: true` -> DET-18 exige un design-draft aprobado (`TICKET-101.draft/preview.html`)
> ANTES del spec. **Hallazgo (ficha SP7 §9):** la maqueta SP6 (`mockup-sp6.html`) trae solo el caso
> OR-de-ANDs de 2 niveles ("vias", `reqTree` en `:1724`); NO representa el arbol Y/O anidable a
> cualquier profundidad que se decidio (decision #2), que el seed EST200 exige (3 niveles). Las 3
> familias del modal (`:1729`) si coinciden con las 3 con respaldo (decision #4). El draft nuevo NO
> es por falta de validacion (el refinamiento se hizo en SP5/SP6: `sp6/historias-usuario-sp6.md` §P1
> + MC-03/MC-09), sino la ejecucion de la decision #2 ya tomada.

**Casos que se extienden de la maqueta** (detalle en ficha SP7 §9):
- **A. Estructura:** AND en la raiz combinando sub-arbol OR con condiciones sueltas (EST200); 3+ niveles; Group con `minToSatisfy`/`creditsRequired` como nodo interno anidable.
- **B. Campos:** `effect` (mas alla de EligibilityToEnroll); `negate` a nivel grupo; `timing` correquisito (Concurrent); MetricThreshold scope/operadores; isHardRule mezclado dentro de un grupo.
- **C. Operaciones de edicion:** mover/reordenar, anidar grupo en grupo, cambiar combinator AND<->OR, convertir hoja en grupo, editar/eliminar nodo intermedio (+ guard plan Active), normalizar grupos degenerados.
- **D. Validacion:** ciclos cruzados A->B->C->A (CAP-CUR-004); condicion incompleta en nodos intermedios.

**Checklist de opciones del draft** (8 bloques, en ficha SP7 §10): 1) representacion del arbol (metafora visual a/b/c, combinator, K-de-N); 2) nodos hoja y campos (3 familias); 3) operaciones de edicion; 4) validacion y feedback; 5) alerta de impacto; 6) estados y modos (vacio, solo-lectura/RBAC, regla unificada); 7) **alcance in/out** (herencia MADS, correquisitos, negate a nivel grupo, effect multiple); 8) transversal DoD (i18n, a11y, tokens, stories).

**Arboles de ejemplo para el draft (test data):** T1 EST200 (3 niveles + AND raiz mixto), T2 correquisito+anti-requisito (timing/negate), T3 electivo K-de-N anidado. Detalle en ficha SP7.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | mod-only per RULE-dev-004 (nunca `develop`/`main`); base `develop` |
| Test data | Activity con requisitos existentes + Activity en varios planes (para la alerta) + Activity sin planes |
| Services | suite (pestaña/modal), object-manager (persistencia requirement) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El create de `requirement` en `up1-mcp` YA usa RT literal (`typedRequirementName`, `requirement-write.ts:29,292`). La premisa del analisis 2026-07-07 ("create usa base `REQUIREMENT` y no persiste campos RT") es INCORRECTA → BL-1 se reduce (no hay que arreglar el create). | architect + verificacion codigo 2026-07-24 | S0 (design) | promoted | DEC-LOCAL-01 (spec) |
| L2 | **Trampa:** extender `RT_PATTERN` de `polymorphicUpdate.resolver.js` mueve el objectType a `rtUpdateHandler`, que NO llama los guards de la rama `!RT_PATTERN` (MC-09 `assertActivityNotInActivePlanOnUpdate`, creditRange, etc.) → se PIERDEN silenciosamente. Hay que re-cablearlos. | lectura de codigo `:671-681` 2026-07-24 | S0 (design) | promoted | **RULE-curriculum-design-032** + DEC-LOCAL-01 (spec) |
| L3 | La validacion de ciclos cruzados (CAP-CUR-004) existe HOY solo en `up1-mcp`, NO en el backend que usa la Suite → hay que portar el algoritmo (BFS) al path FE. | architect | S0 (design) | promoted | DEC-LOCAL-03 (spec) + REQ-13 |
| L4 | La deteccion de prereqs en la malla YA existe y es mas completa que lo que sugeria el transcript: `CurriculumMesh/prereqCheck.logic.ts:171` (`findMissingPrereqsForBatch`) + `PrereqBlockModal` (bloqueante) al **agregar**. Gap real acotado: no re-corre al **mover** + falta **banner mesh-wide**. REQ-11 = Media, no Alta. | architect + verificacion codigo 2026-07-24 | S0 (design) | promoted | DEC-LOCAL-02 (spec) + REQ-11 |
| L5 | Reencuadre de alcance (dev, SP6 planning 2026-07-06): requisitos = **seccion del Programa de asignatura** (RecordList + modal 2 pasos + regla unificada) + **circuito con la malla** (los prereqs alimentan la deteccion existente). REQ-10 "ver malla desde asignatura" DESCARTADO. | dev + transcript SP6 | S0 (intake) | promoted | decisions_log `scope-discovery` + seccion "Reencuadre de alcance" |
| L6 | SP5 dejo cableado deliberado (modelo + 3 RT + layouts por RT + `buildRequirementTree` reusable + guard MC-09 en create/update + alerta de malla + `CurriculumMesh` consume prereqs) → dificultad CONTENIDA. La unica deuda diferida a proposito es BL-1 (UPDATE de rt__requirement), tipificada por SP5 como el punto riesgoso (codigo compartido). | revision de factibilidad 2026-07-24 | S0 (design) | promoted | seccion "Analisis de factibilidad" + RULE-032 |
| L7 | Fix del `$t` untyped en typecheck aislado del mod curriculum-design (commit chore(types) 7b89bdb en repo del mod, fuera de execute_scope de S6, en su propio commit). | — | S6 | discarded | — |
| L8 | La premisa original de BL-1 ("el create de requirement en up1-mcp usa el objectType base en vez del RT literal") fue REFUTADA por investigacion de codigo (2026-07-24): requirement-write.ts ya usaba typedRequirementName(recordType) en el create; el unico uso del objectType base era el listInstances de lectura. BL-1 se acoto a extender RT_PATTERN para el UPDATE (genuinamente roto) + recablear el guard MC-09 que se pierde al migrar de rama. Leccion: verificar la premisa contra el codigo vivo antes de dimensionar el trabajo (DET-4). Ver DEC-LOCAL-01. | developer | — | discarded | — |
| L9 | La evaluacion de prerrequisitos de la malla debe respetar el arbol Y/O, no aplanarlo. El codigo shippeado (SP5/SP6) aplanaba (AND global + Group solo con hijos RecordState directos), convirtiendo OR en AND e ignorando isHardRule/negate/timing/creditos/MetricThreshold. Se construyo un evaluador recursivo fiel (evaluateRequirementTree.logic.ts, REQ-14) que reemplaza el aplanado en las 3 superficies (alta/mover/banner). Promovido a RULE-curriculum-design-033. Correquisitos (timing=Concurrent) y MetricThreshold(Credits) ahora SI se evaluan (estaban pedidos en el request + la maqueta mVPrereq, no eran solo de la maqueta). Ver DEC-LOCAL-04. | developer | — | refined | RULE-curriculum-design-033 |
| L10 | SYNC SKIP de carpetas logic-only en modsComponents/: el sync (workspace suite/layout) solo propaga carpetas de modsComponents/ que tienen un componente-entry. Una carpeta logic-only (ej. RequirementAddModal/, que en S5 quedo solo con requirementFamilies.logic.ts porque el modal se inlineo en el .vue del editor) NO se sincroniza -> cualquier import cross-folder hacia ella rompe en layout/suite con 'Failed to resolve import' de Vite y deja el tab en blanco. Descubierto en el smoke de S9.T5 (primer sync+render real del ticket). Fix: co-ubicar la logica compartida DENTRO de una carpeta que tambien tenga componente (patron del mod: ReglaUnificadaView/CompositeSectionTree tienen logic + componente y por eso sincronizan). Candidato a RULE. Regla practica: en modsComponents/, no crear carpetas solo-logica importadas cross-folder. | developer | — | refined | RULE-curriculum-design-035 |
| L11 | Runtime bug hallado en el smoke (S13.T3): un updateInstance base-only sobre un rt__ (ej. el reparent de parentId de S14) hacia SIEMPRE el upsert de la proyeccion rt__ en executeUpdates (polymorphicUpdate.resolver.js). Prisma valida el `create` de un upsert aunque termine usando la rama `update`, y lo rechaza si falta un campo RT requerido (combinator en rt__Group__requirement) -> "Argument `combinator` is missing". Fix: saltar el upsert rt__ cuando no hay campos RT en el payload (leer la fila existente con findUnique para devolver updatedRt). El unit test previo NO lo cazaba porque el mock de upsert no validaba required en el `create` (mock consagra bug de runtime, ver feedback_mocked_tests_consecrate_runtime_bugs); se agrego regresion que exige upsert NO llamado + findUnique llamado en update base-only. IMPORTANTE: el resolver vive en mods/curriculum-design/logic/ y se sincroniza a object-manager/resolvers -> requiere npm run sync (o sync:logic) + restart de object-manager para aplicar. Aplica tambien a curricularsection (misma rama RT_PATTERN): base-only updates dejan de tocar la proyeccion RT (comportamiento mas correcto, zero-change cuando si hay campos RT). | developer | #14 | refined | RULE-curriculum-design-036 |
| L12 | Smoke runtime (DET-36) de la validacion de minimos numericos del modal de requisitos, en UPU (suite :3000, OM :4000, rol Consultor, Activity Fisica General FIS103 en default_Activity_edit). Evidencia real via navegador: (1) Curso con Nota minima=0 -> error "Nota minima debe ser mayor que 0." (exclusiveMin:0), no persiste; (2) Nota=4 -> pasa la guarda de UI y llega al backend, que responde REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN (guard de plan activo, ajeno y correcto); (3) Metrica con Valor=0 (operador >=) -> error "Valor debe ser mayor o igual a 1." (min:1). Confirma que validateComplete corre antes que la guarda de minimos (Operador vacio se reporta primero). i18n minValue/exclusiveMinValue resuelven bien tras sync+reload. Los cambios se sirven a suite via alias de fuente @mods -> layout/src/modsComponents (sin build de layout). | developer | — | discarded | — |
| L13 | Auditoría pre-cierre halló que el seed (`seed/_data-requirement.js`) creaba el bloque electivo como `Group(OR, minToSatisfy:4, creditsRequired:24)` SIN cursos hijos → pool vacío huérfano. No es solo cosmético: `evaluateGroup` (evaluateRequirementTree.logic) trata un grupo sin hijos normativos como satisfied:true (vacuo), así que un OR/pool vacío se da por satisfecho y anula el requisito. Fix: el seed ahora crea N hojas RecordState (Activities Course reales, take:6, K=min(4,N)). Regla general: cualquier Group(OR/AND/pool) DEBE tener hojas; un grupo vacío es un huérfano peligroso (falso-satisfecho), tanto por seed como por alta/borrado no atómico (mitigado en render por pruneEmptyGroups, prevención pendiente sp7 §8). Además: bug de log en seed.js (`if (requirement.skipped)` daba true para el array [] de éxito → "skipped: undefined"; corregido a === true). | developer | — | refined | RULE-curriculum-design-037 |
| L14 | Asimetría consciente en los pisos numéricos (review dredd S19, Obs 2): `rt__MetricThreshold.value` usa `minimum:1` (piso ENTERO inclusivo) mientras la nota (`thresholdMinGrade`) usa `exclusiveMin:0` (permite decimales). Es correcto y alineado al ticket: REQ-03 cierra la métrica a `Credits` (enteros), así que un umbral de créditos <1 no aplica. La nota, en cambio, admite escala decimal configurable. Riesgo latente documentado: si en el futuro se habilita otra métrica con umbral decimal <1 (ej. GPA), `min:1` la rechazaría por error — revisar el piso de `value` al abrir métricas no-Credits. No se cambia ahora (sigue la línea del ticket, decisión del dev). | developer | — | refined | DEC-052 |
| L15 | Smoke E2E de detección en la malla (S19) para K-de-N + créditos: se montó en QUI104 un requisito AND(pool Electivo K=2 de [MAT101,FIS103,GES110], MetricThreshold Créditos>=60 plan) y se intentó agregar al Draft 2027 P3 (0 electivos antes, 29 créditos < 60). Resultado: BLOQUEÓ. Confirma que el evaluador de la malla CONSIDERA K-de-N y créditos (si los ignorara, la vía sería satisfecha-vacua y no bloquearía). Cobertura unit exacta ya existente: TC-26 (K-de-N conteo), TC-30 (creditsRequired grupo), TC-33 (MetricThreshold Credits) en evaluateRequirementTree.logic.spec. HALLAZGO UX: el modal "Prerrequisitos faltantes" resume a nivel del contenedor OR ("Cualquiera de las vías — 0 de N vías"), NO itemiza el detalle interno (K-de-N X de K, créditos X de N, qué cursos) porque el editor envuelve todo requisito en un OR de vía única; el MissingPrereqItem se reporta en el OR más superficial. Evaluación correcta, detalle del mensaje mejorable. Documentado en sp7 UPONE-1378-smoke-test-replication.md (Caso 5 + Pendiente) y como mejora posible (descender el MissingPrereqItem al nodo con la falla, o no envolver en OR cuando hay una sola vía). | developer | — | refined | BUG-curriculum-design-013 |

Causa raiz (corregida vs premisa inicial): NO es que el vue-tsc aislado no vea el global de i18next-vue. El mod SI importa `useTranslation` de i18next-vue en ~10 archivos, asi que la augmentacion `$t: TFunction<Namespace>` sobre ComponentCustomProperties SI se carga. El problema: bajo i18next 26, `TFunction<Namespace>` (con Namespace = union que incluye la forma array `readonly FlatNamespace[]`) colapsa a `never`, y los templates reportan TS2349 "This expression is not callable. Type 'never' has no call signatures." No es bug de runtime ni build (suite/layout instalan i18next-vue en runtime).

Fix: `types/i18n.d.ts` re-declara `$t` en ComponentCustomProperties con firma callable overloaded, alineada a i18next (dos formas usadas por el mod: `$t(key, {opts})` interpolacion y `$t(key, 'defaultValue')` string; la firma cubre ambas + `$t(key, default, opts)`). El merge con i18next-vue NO genera TS2717. El tsconfig ya incluye `types/**/*.d.ts`, no se toco. Consistente con el patron ya existente en el mod (layout-shims.d.ts, vueform.d.ts son overrides pragmaticos para el vue-tsc aislado).

Resultado medido: 182 -> 87 errores. Los 95 resueltos son todos $t (93 TS2349 + 2 TS2339). 0 errores genuinamente nuevos (comparado por archivo+linea+codigo).

Gap real (no del fix): la premisa "~180 errores $t -> ~0" era incorrecta. Los $t eran 93 de 182. Quedan 87 preexistentes y AJENOS a $t: 57 TS2339, 19 TS2307 (modulos de tipos faltantes: types/basecard, types/calendar, constants/calendar), 8 TS2578, 5 TS2322/TS2345. Grueso (59) en components/molecules/CalendarEventCard y BaseCard (arrastrados transitivamente, referencian modulos que no existen). Follow-up local aparte.

No se corrio vitest: el .d.ts es types-only (noEmit), cero impacto en runtime; baseline 1345/1345 no se afecta por definicion. | developer | — | discarded | — |

## Backlog (heredado de SP5)

| # | Item | Priority | Estado |
|---|------|----------|--------|
| BL-1 | **Habilitar UPDATE de `rt__*__requirement`**: extender `RT_PATTERN` de `logic/polymorphicUpdate.resolver.js:159` a `(curricularsection\|requirement)` + regression de CurricularSection (código compartido). Heredado de `SPEC-curriculum-design-requirement-composite-tree` BL-1 (DEC-LOCAL-04); su trigger declarado ("cuando MC-05/06 necesite editar requirements por UI") **es este ticket**. Prerequisito técnico del editor editable. | must (para P1) | done (S1/S3: `RT_PATTERN` = `(curricularsection\|requirement)`, guard MC-09 recableado; UPDATE de rt__*__requirement verificado por unit + smoke UPU) |
| BL-2 | **Movido a [TICKET-105](TICKET-105.md)** (2026-07-08). El barrido de no-negativos a los campos numéricos que P1 no crea/edita —incl. la deuda de Offering (`maxCapacity`, `usedCapacity`, owner uengagement-up1)— se saca de P1 para ceñir el ticket a la historia UPONE-1378. | — | moved |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

**9 sessions** (refinado por `design-feature`; reestructurado por la adecuacion 2026-07-27 / DEC-LOCAL-04 que agrego REQ-14 + nueva S7; detalle de tasks/gate criteria en el spec `SPEC-curriculum-design-activity-requirements-section`). Orden riesgo-primero: S1 ataca BL-1 (el habilitador BE, AQ-1) antes que la UI. Backend riesgoso (S1-S3) antes que FE (S4-S6) antes que evaluador fiel de la malla (S7), superficie de malla (S8) y cierre (S9).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Habilitador BE (BL-1) + verificacion runtime: extender `RT_PATTERN` a `(curricularsection\|requirement)` + **re-cablear guard MC-09** que se pierde al mover a `rtUpdateHandler` (RULE-032) + regression CurricularSection. **NO incluye fix de create** (ya usa RT literal, refutado 2026-07-24) | backend | T3 | ver spec S1.T* | ⚑ fuerte | update/delete + reconstruccion end-to-end con server corriendo (AQ-1); guard MC-09 sigue disparando por rama rt; regression CurricularSection verde (AQ-3) |
| S2 | Guard de delete de `requirement` (via unico override H7) + MCP: agregar `action: update`/`delete` a `cd_manage_requirement` | backend + MCP | T2 | ver spec S2.T* | auto | delete bloqueado en plan Active; MCP update/delete verificado |
| S3 | Ciclos cruzados (REQ-13, CAP-CUR-004): **portar** el algoritmo BFS de `up1-mcp` al backend de la Suite (hoy no existe en ese path) | backend | T3 | ver spec S3.T* | ⚑ fuerte | rechazo de ciclo transitivo A→B→C→A al guardar RecordState desde la UI (no solo MCP) |
| S4 | Seccion "Requisitos" (RecordList) + vista "regla unificada" (arbol read-only, reuso `buildRequirementTree`) (REQ-01, REQ-03 lectura) | frontend | T2 | ver spec S4.T* | auto | seccion renderiza lista + regla unificada de EST200; stories |
| S5 | Modal de alta 2 pasos (3 familias, REQ-02) + validacion incompleta (REQ-04) + operaciones de edicion | frontend | T2 | ver spec S5.T* | auto | modal persiste; no guarda incompleto; stories |
| S6 | Alerta de impacto (REQ-05) + RBAC wiring FE (REQ-06) | frontend | T2 | ver spec S6.T* | auto | alerta con/sin planes; acciones ocultas sin capability |
| S7 | Evaluador recursivo fiel del arbol Y/O en la malla (REQ-14): reemplaza el aplanado (`findMissingPrereqs`) por evaluacion recursiva (AND/OR/K-de-N, anidamiento, isHardRule/negate, creditsRequired) en las 3 superficies (alta/mover/banner) + regresion del flujo de alta shippeado | frontend (malla) | T3 | ver spec S7.T* | ⚑ fuerte | matriz TC-24..30 verde; alta sin regresion; OR no se evalua como AND |
| S8 | Superficie de malla (REQ-11) sobre el evaluador fiel: re-correr deteccion al **mover** una entrada + **banner mesh-wide** evaluando cada entrada contra su propio periodo (la deteccion al agregar ya existe) | frontend (plan de estudio) | T3 | ver spec S8.T* | ⚑ fuerte | prereq detectado al mover; banner mesh-wide; round-trip; regresion malla verde |
| S9 | No-negativos (REQ-09, `minimum:0` + codegen + sync) + docs oficiales + KB (RULE-032) + i18n ES + DoD + smoke final en UPU | declarativo + cierre | T3 | ver spec S9.T* | ⚑ fuerte | API rechaza negativos; docs/KB actualizados; smoke UI runtime en UPU |

**Notas del plan**:
- **Dependencia dura encadenada** (por eso `parallelization: not-applicable`, 1 dev en serie): S1 (BL-1) → S2/S3 (guards+ciclos, mismo resolver compartido) → S4-S6 (FE consume los guards) → S7 (evaluador fiel de la malla) → S8 (superficie de malla, consume el evaluador de S7) → S9 (cierre).
- **`estimated: 20 SP`** (rango 18-22, `option-A-faithful-evaluator-2026-07-27`): sube desde 16 por REQ-14 (evaluador recursivo fiel + matriz TC-24..30 + regresion del alta, nueva S7); REQ-11 pasa a S8, DoD a S9. Ver DEC-LOCAL-04.
- **`layer: mod` intacto**; branch guard AQ-2 (rama mod-only base `develop`) se resuelve en la guarda de inicio del execute.
- Numeracion desde S1: el ticket no tiene `### Session N` ejecutadas aun.

### Session 1 — 2026-07-24 — Habilitador BE (BL-1): verificacion runtime + update ruteado + recableo de guard [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Habilitar el UPDATE de `rt__*__requirement` (BL-1): verificar runtime (AQ-1), extender `RT_PATTERN` y re-cablear el guard MC-09 que se pierde al migrar a la rama `rtUpdateHandler` (RULE-curriculum-design-032), con regresion de CurricularSection. NO incluye fix de create (ya usa RT literal, refutado 2026-07-24).

**Tasks completadas**:
- [x] S1.T1 — Verificacion runtime (AQ-1, server corriendo): confirmar que el create de los 3 RT persiste bien + reproducir el fallo de UPDATE (baseline)
- [x] S1.T2 — Extender `RT_PATTERN` a `(curricularsection|requirement)` en `polymorphicUpdate.resolver.js:199`
- [x] S1.T3 — Recablear `assertActivityNotInActivePlanOnUpdate` (MC-09) dentro de `rtUpdateHandler` (RULE-032)
- [x] S1.T4 — Regresion de CurricularSection (`polymorphicUpdate.test.js`) + test de `requirement`
- [x] S1.GATE — Gate de sync S1: quality review aislado (DET-30/35), regresion completa, consolidar evidencia de S1.T1, decidir continue/iterate/escalate/standby

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (S2: guard de delete requirement via override H7 + MCP cd_manage_requirement action update/delete). S1 verde: RT_PATTERN extendido + MC-09 recableado, 1243/1243 regresion, dual-judge approved, create runtime OK.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para arrancar S1**:
- Rama mod-only con base `develop` per RULE-dev-004 (AQ-2 — el repo esta en `feat/UPONE-1451-bibliography-access`, cambiar antes de tocar codigo)
- Server up1 corriendo (object-manager + tenant) para la verificacion runtime de S1.T1

### Session 2 — 2026-07-28 — Guard de delete de requirement (override H7) + MCP write actions (update/delete) [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Habilitar el DELETE gateado de `requirement` (guard de plan Active en el unico override H7) y agregar `action: update`/`delete` a `cd_manage_requirement` (up1-mcp), verificando `cd_get_prereqs`. Depende de S1 (RT_PATTERN + update ruteado).

**Tasks completadas**:
- [x] S2.T1 — Nueva funcion `assertActivityNotInActivePlanOnDelete({ prisma, objectType, id })` en `requirementActivityGuard.js`, reusando `assertActivityNotInActivePlan` (TC-19/TC-20)
- [x] S2.T2 — Wire del guard en `requirementCategoryDelete.resolver.js`: branch `objectType === 'requirement'` (CONSTRAINT H7, no crear archivo nuevo) (TC-19/TC-20)
- [x] S2.T3 — `cd_manage_requirement` (up1-mcp): agregar `action: "update"` (patron `sections-write.ts`)
- [x] S2.T4 — `cd_manage_requirement`: agregar `action: "delete"` (respeta el guard S2.T1/T2) + verificar `cd_get_prereqs` refleja el arbol editable
- [x] S2.GATE — Gate de sync S2 (T2): quality review aislado (DET-30/35), validacion T2, consolidar TC-19/20 + verificacion MCP (incl. UPDATE end-to-end diferido de S1 por el path real), decidir continue/iterate/escalate/standby

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 3 (S3: ciclos cruzados REQ-13 — portar BFS de up1-mcp al backend del mod). S2 verde: guard de delete (H7) + MCP update/delete; 2 HIGH del review corregidos (ciclo por owner persistido, routing por tipo persistido); 33/33 guards + 154/154 MCP + builds.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-28 — Validación de ciclos cruzados en backend (CAP-CUR-004, REQ-13) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3

**Objetivo**: Portar el algoritmo BFS de detección de ciclos cruzados de `up1-mcp` (`wouldFormRequirementCycle`) al backend del mod (helper puro nuevo), cableándolo en el create y el update de `rt__RecordState__requirement`. Hoy ese guard solo existe en up1-mcp (que la Suite no consume) → la UI nueva de este ticket podría formar un ciclo sin backstop.

**Tasks completadas**:
- [x] S3.T1 — Helper puro `logic/helpers/requirementCycleGuard.js` (`assertNoRequirementCycle`): BFS transitivo sobre `RecordState.targetId` entre Activities, guard de profundidad (`MAX_GRAPH_NODES`), portado del diseño de up1-mcp (TC-21 directo, TC-22 transitivo, TC-23 cadena larga válida)
- [x] S3.T2 — Wire en `sectionValidation.resolver.js` (create de `rt__RecordState__requirement`, no-op fuera de scope)
- [x] S3.T3 — Wire en `polymorphicUpdate.resolver.js` (update de `rt__RecordState__requirement`, dentro de `rtUpdateHandler`, junto al recableo de S1.T3)
- [x] S3.GATE — Gate de sync S3 (T3, ⚑ fuerte): quality review aislado (DET-30/35), regresión completa (S1+S2+S3), consolidar TC-21/22/23, decidir continue/iterate/escalate/standby

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 4 (S4: FE — seccion Requisitos RecordList + vista regla unificada read-only). S3 verde: guard de ciclos REQ-13 portado (BFS) + wired en create y update (incl. reparent, ambas ramas); 1271/1271 mod; dual review approved tras cerrar el hueco de reparent.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-07-28 — Editor FE: sección "Requisitos" + lista + vista "regla unificada" [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Primera session de frontend. Entregar la sección "Requisitos" en el Programa de asignatura (Activity, recordType Course) como RecordList config-driven (REQ-01) y la vista read-only "regla unificada" del árbol Y/O (REQ-03, lectura), reusando `buildRequirementTree.js` (ensamblado) y las piezas de bajo nivel de `CompositeSectionTree` (`treeOps.ts`/`useTreeKeyboardNav.ts`, patrón WAI-ARIA tree). Sin edición aún (modal de alta = S5). Depende del backend de S1-S3 (update ruteado + guards).

**Tasks completadas**:
- [x] S4.T1 — Layout `config/layouts/default_requirement_list.json` (RecordList embebido bajo la sección Requisitos de Activity, columnas Clase/Requisito/Condición/Vía/Exigencia mapeadas a campos derivados del árbol) (REQ-01, TC-01/TC-02)
- [x] S4.T2 — Componente `ReglaUnificadaView` (read-only), reusando `buildRequirementTree.js` (ensamblado) y `treeOps.ts`/`useTreeKeyboardNav.ts` de `CompositeSectionTree` (patrón WAI-ARIA tree, RULE-curriculum-design-001/002) (REQ-03, TC-06/TC-08 + aria-attrs)
- [x] S4.GATE — Gate de sync S4 (T2): persistir, quality review (DET-23), consolidar TC-01/02/06/08, decidir continue/iterate/escalate/standby

**Validación del tier (T2):** `vitest run` del mod completo VERDE — **1298/1298** (74 files), +26 tests nuevos de `ReglaUnificadaView` (TC-06/08 + ARIA mount + flatten/assemble + descriptor) y +2 en `layouts-declared` (conteo 59→60 + guard reworkeado). 0 regresiones (suites existentes de CompositeSectionTree/CurriculumMesh/aria-attrs verdes). Typecheck (`vue-tsc`): mis archivos limpios salvo la clase tolerada preexistente `$t not callable`/`@ts-expect-error unused` (idéntica a `CompositeSectionTreeElement.vue`, ver S9.T4). Los 2 errores reales que introduje (`Ref<RequirementNode[]>` vs `CompositeNode[]`; `detailChips: unknown[]` en `h()`) se detectaron y corrigieron. Lint (`eslint`) NO ejecutable en este entorno (crash ajv/eslintrc, ESLint 8.57.1, preexistente e independiente de mis archivos) → diferido a S9.T4.

#### Quality review (DET-23)

Reviewer aislado (T2, DET-30), 2 rondas.

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | Lógica pura en `.ts` testeable; `console.error/warn` solo en paths de error/ciclo (mirror de useCompositeSectionTree). Sin `console.*` de debug. |
| 2 | Lint | warn | eslint no ejecutable (tooling roto preexistente); diferido a S9.T4. |
| 3 | Tipado | pass | 2 errores reales corregidos; resto = clase tolerada preexistente (`$t`/slot) idéntica al componente de referencia. |
| 4 | Testing | pass | 26 tests nuevos con assertions concretas; TC-06/08 con paridad al fixture backend EST200; ARIA mount asserts roles/roving tabindex. |
| 5 | Escalabilidad | pass | Árbol O(nodos); fetch `limit 500` (mismo criterio que CompositeSectionTree). |
| 6 | Mantenibilidad | pass | Reusa `treeOps`/`useTreeKeyboardNav`; twin `buildRequirementTree` documentado (sync boundary). Sin import de `logic/` desde `modsComponents/`. |
| 7 | Claridad | pass | Descriptor puro separa extracción de datos de i18n. |
| 8 | Accesibilidad | pass | WAI-ARIA Tree (RULE-001/002): role=tree/treeitem/group, aria-level/expanded/setsize/posinset, roving tabindex, nav teclado read-only (sin onReorder). Tests de ARIA verdes. |
| 9 | Storybook | pass | `ReglaUnificadaView.stories.ts` (Default + Empty), CSF3. |
| 10 | Manejo de errores | pass | Fetch con try/catch + estado `error` en UI; empty state. |

**Resultado global: pass** (tras iteración). **Ronda 1 (iterate):** 2 HIGH reales en S4.T1 (`default_requirement_list.json`): (1) `associatedLayoutConfigs.view` hardcodeaba `rt__RecordState__requirement` + `canView` default true → `label` como name-link abría el RT equivocado en filas Group/MetricThreshold; (2) las 3 columnas RT dotted se descartaban en silencio (la inyección de campos RT a `availableFields` solo ocurre con filtro `recordType EQUALS` activo; esta lista es heterogénea). **Fix:** `canView:false` + remover `associatedLayoutConfigs`; columnas a solo campos base (`recordType`/`label`/`effect`/`isHardRule`). **Ronda 2 (re-review):** APPROVE — ambos findings resueltos (verificado a nivel componente: `TableCell.vue:28` no renderiza link con `canView:false`), columnas base confirmadas contra `objects/requirement.json`, sin defectos nuevos, S4.T2 intacto. Ambos HIGH los confirmé yo mismo leyendo el código vivo (`useColumnConfiguration.ts:176`, `RecordList.vue:transitionRecordTypeFilter`) antes de corregir (DET-33).

**Test cases (DET-25):**

| TC | REQ | Escenario | Resultado | Evidencia |
|----|-----|-----------|-----------|-----------|
| TC-06 | REQ-03 | reconstrucción EST200 (árbol Y/O anidado) | ✅ pass | `buildRequirementTree.logic.spec.ts` — jerarquía/combinadores/orden idénticos al fixture backend `tests/unit/buildRequirementTree.test.js` |
| TC-08 | REQ-03 | árbol de 1 sola hoja (sin grupo artificial) | ✅ pass | `buildRequirementTree.logic.spec.ts` — root único RecordState, children=[] |
| aria-attrs | REQ-03 | WAI-ARIA tree (RULE-001/002) | ✅ pass | `RequirementTreeNode.spec.ts` — treeitem/group, aria-level/setsize/posinset/expanded, roving tabindex |
| TC-01 | REQ-01 | lista con datos (EST200) en suite | ⏳ runtime diferido | Config validada por `layouts-declared.test.ts`; render en suite requiere `npm run sync` + servers → smoke integral en **S9.T5** (UPU, DET-36). No se declara "renderiza" sin el render real (feedback_verify_rendered_ui_not_config). |
| TC-02 | REQ-01 | lista vacía (estado "matrícula libre") en suite | ⏳ runtime diferido | `emptyText` configurado; mismo diferimiento a S9.T5. |

**Runtime-verification (DET-36):** S4 toca UI (`creates_visual`). El render real en suite depende de `npm run sync` (propaga layout + componente + lang al tenant/suite) + object-manager + suite corriendo; el componente además no queda funcional-completo hasta S5 (modal de alta). Por sequencing del plan, el smoke UI integral en UPU es **S9.T5** (recorrido completo con evidencia runtime). En S4 la evidencia es: unit+ARIA-mount (TC-06/08 + roles), integración de config (`layouts-declared` verde), typecheck. Choice: `smoke-not-reproducible` (razón: FE no sincronizado a suite en S4; smoke integral planificado en S9.T5).

**Commit DET-27:** `61bdf91` feat(requirement): Requisitos section (RecordList tab) + read-only unified-rule Y/O tree · `9824530` test(requirement): assemble/descriptor/aria specs + layout count/guard update (repo `mods/curriculum-design`, rama `feat/UPONE-1378-activity-requirements-section`, working tree limpio). up1-mcp sin cambios en S4.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 5 (S5: modal de alta 2 pasos REQ-02 + validación incompleta REQ-04 + operaciones de edición REQ-03/REQ-12). S4 verde: sección "Requisitos" (RecordList tab via associatedLayout) + "Regla unificada" (árbol Y/O read-only WAI-ARIA); 1298/1298 mod, 0 regresiones; quality review 2 rondas (2 HIGH de la lista corregidos: canView/columnas base); TC-06/08 + ARIA verdes; TC-01/02 (render suite) diferidos a S9.T5 (DET-36).
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 5 — 2026-07-28 — Modal de alta 2 pasos + validación de incompleta + operaciones de edición [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Completar el editor FE con escritura. Modal de alta en 2 pasos (`RequirementAddModal`, 3 familias con respaldo: Curso/Electivo/Métrica → RecordState/Group OR/MetricThreshold; REQ-02) reusando la forma de los layouts RT `default_rt__<RT>__requirement_create.json` y persistiendo sobre el RT literal (BL-1, habilitado en S1). Validación de condición incompleta (REQ-04). Operaciones de edición del árbol: eliminar nodo (wired al guard de delete de S2) y editar campos de hoja (REQ-03/REQ-12 MVP). Las operaciones estructurales (mover/anidar/cambiar combinador AND↔OR) son open question del spec → **sujetas a confirmación del dev antes de cerrar S5.GATE**; su ausencia no bloquea el MVP.

**Tasks completadas**:
- [x] S5.T1 — Componente `RequirementAddModal` paso 1 (clase Curso/Electivo/Métrica + grupo destino), patrón modales caseros RULE-curriculum-design-014 (Modal atom, no ModalStackManager) (REQ-02, TC-03/04/05)
- [x] S5.T2 — Paso 2: detalle por familia reusando la forma de los layouts RT `default_rt__<RT>__requirement_create.json` + persistencia sobre RT literal (BL-1) (REQ-02, TC-03/04/05 create real)
- [x] S5.T3 — Validación de condición incompleta (frontend campos requeridos del RT + verificar rechazo backend por `required[]`) (REQ-04, TC-09/10)
- [x] S5.T4 — Operaciones de edición (modelo de vías, dev confirmó IN 2026-07-28): eliminar condición (wired al guard S2), editar campos de hoja, mover condición entre vías, "+ Nueva vía (O)" (autoría de rama OR) y K-de-N. NO DnD de árbol crudo — se maneja por el selector de vía del alta + acciones por fila (REQ-03/REQ-12, TC-19/20 + edición)
- [x] S5.GATE — Gate de sync S5 (T2): persistir, quality review (DET-23), consolidar TC-03/04/05/09/10/19/20, cerrar open question de operaciones estructurales con el dev, decidir continue/iterate/escalate/standby

**Reencuadre por maqueta (dev, 2026-07-28):** la maqueta `sp6/mockup-sp6.html` define UNA pestaña "Requisitos" (editor por **vías**) con botón "Ver regla unificada" (modal read-only), no dos pestañas. Supersede el diseño de S4: se quitó la pestaña "Regla unificada", el `RecordList` stock y su layout `default_requirement_list.json`; se consolidó en un elemento editor custom (`requirement-editor`). `ReglaUnificadaView` (S4) se reusa: sus piezas (`RequirementTreeNode`/`useReglaUnificada`) alimentan el modal "Ver regla unificada" del editor. Modelo de vías: raíz OR de vías, cada vía = AND de items; "Vía N" = rama OR; "+ Nueva vía" = nueva rama; K-de-N = mínimo de vías. Solo las 3 familias con respaldo (REQ-02).

**Progreso S5 (checkpoint, sin cerrar gate):**
- `requirementFamilies.logic.ts` (modal alta: 3 familias + payload create sobre RT literal + validación incompleta) — 12/12 tests (TC-03/04/05 + TC-09/10). Commit `0b2bbb7`.
- `requirementEditor.logic.ts` (derivación por vías: filas + vías desde el árbol real) — 7/7 tests. Commit `fc3774a`.
- `RequirementEditorElement.vue` (elemento `requirement-editor`): pestaña "Requisitos" read-only funcional (tabla Clase/Requisito/Condición/Vía/Exig.) + modal "Ver regla unificada" (árbol WAI-ARIA reusando piezas de S4). `enableEdit` default false (escritura pendiente). Commit `8458ea2`.
- Ajuste S4: `default_Activity_view.json` una sola pestaña "Requisitos"; `default_requirement_list.json` eliminado; `layouts-declared` revertido a 59. i18n `requirementEditor.*` (es/en/pt).
- Suite completa **1316/1316**, typecheck limpio en archivos nuevos (salvo clase tolerada `$t`/slot).
- `requirementCreate.logic.ts` (orquestación de creación por vías: `planViaCreate` puro + `executeViaCreate` con `createFn` inyectable; forma persistida raíz `Group(OR)` → `Group(AND)` por vía → hoja, sin re-parentar) — 9/9 tests. Commit `889c477`. up1-check corrido para habilitar los archivos nuevos del editor.
- **Capa lógica del editor de vías: COMPLETA y testeada** (familias+payload+validación, derivación de filas/vías, orquestación de creación). Suite del mod **1326/1326**.
- **Decisión estructural (modal UI):** la UI del modal de alta 2 pasos se implementará **dentro del `.vue` del editor** (template, no un `.vue`/elemento Vueform aparte) — un `defineElement` modal no se puede embeber limpio como hijo (necesita contexto Vueform/ElementLayout) y un `.vue` suelto se auto-registraría como elemento no usado. La carpeta `RequirementAddModal/` mantiene la lógica pura (`requirementFamilies.logic`). Ajustar redacción de S5.T1/T2 en consecuencia.
- **Entregado en S5:** modal de alta 2 pasos en el editor `.vue` (clase + vía + exigencia → detalle) enganchado a `executeViaCreate`/`createInstance` real (S5.T1/T2); "+ Nueva vía (O)" (autoría OR, decisión del dev); validación de incompleta en UI (S5.T3); editar hoja (campos + exigencia + mover a vía existente) vía `updateInstance` sobre RT literal + eliminar con guard S2 (S5.T4). Fix backend: guard MC-09 de create recableado al alias RT (gap que el editor exponía).
- **Diferido (follow-up):** familia **Electivo (K-de-N)** — necesita sub-flujo de selección de N cursos + K; crearla como Group-hoja vacío quedaría invisible (hallazgo del review). Solo Curso + Métrica en el modal por ahora. `enableEdit` + RBAC → S6. Runtime smoke integral → S9.T5.

#### Quality review (DET-23)

Reviewer aislado (T2, DET-30), 2 rondas.

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | Lógica pura en `.ts` (3 módulos testeados); orquestación de creación con `createFn` inyectable. |
| 2 | Lint | warn | eslint no ejecutable (tooling roto preexistente) → S9.T4. |
| 3 | Tipado | pass | Sin errores reales (solo clase tolerada `$t`/slot). |
| 4 | Testing | pass | +34 tests S5 (familias 13, editor 9, create 9, sectionValidation MC-09 alias +2, +1 multi-root); suite 1330/1330. |
| 5 | Escalabilidad | pass | Derivación O(nodos); creación = 1-3 mutaciones encadenadas. |
| 6 | Mantenibilidad | pass | Reusa piezas S4 + CompositeSectionTree; sin import de `logic/` desde `modsComponents/`. |
| 7 | Claridad | pass | Modelo de vías documentado; decisión de diferir Electivo con razón. |
| 8 | Accesibilidad | pass | Modal molecule (role=dialog); tabla con `<th scope>`; árbol WAI-ARIA reusado. |
| 9 | Storybook | n/a | El editor es SFC element (no unit-testeable sin Vueform+apollo); logic con specs. |
| 10 | Manejo de errores | pass | try/catch + estado `error` en alta/edición/eliminación; validación de incompleta previa. |

**Resultado global: pass** (tras iteración). **Ronda 1 (iterate):** 2 HIGH + 1 MEDIUM + 1 LOW, todos confirmados por mí leyendo código vivo (DET-33): (HIGH-1) el guard MC-09 de create solo disparaba con `objectType==='requirement'` base → el alias RT del editor se saltaba MC-09 (`sectionValidation.resolver.js:140`); (HIGH-2) la familia Electivo creaba un `Group` vacío invisible en la lista; (MED-3) `deriveVias` multi-root dropeaba hojas anidadas; (LOW-4) select de vía en edición sin match para vías loose (cosmético). **Fixes:** guard MC-09 → alias RT (+2 tests); diferir Electivo (Course+Metric, follow-up pool); `deriveVias` recursivo multi-root (+1 test); LOW-4 documentado (no bloqueante). **Ronda 2 (re-review):** APPROVE — 3 fixes resueltos, sin regresiones, 1330/1330 verificado independientemente por el reviewer.

**Test cases (DET-25):**

| TC | REQ | Escenario | Resultado | Evidencia |
|----|-----|-----------|-----------|-----------|
| TC-03 | REQ-02 | alta Curso (RecordState) | ✅ pass (lógica) | `requirementFamilies.logic.spec` (payload) + `requirementCreate.logic.spec` (orquestación vía). Runtime create → S9.T5. |
| TC-05 | REQ-02 | alta Métrica (MetricThreshold) | ✅ pass (lógica) | idem TC-03. |
| TC-04 | REQ-02 | alta Electivo (Group OR) | ⏸️ diferido | familia Electivo fuera del modal en S5 (necesita sub-flujo de pool); follow-up. |
| TC-09 | REQ-04 | falta campo hoja → bloqueado | ✅ pass | `requirementFamilies.logic.spec` (`validateComplete`) + Alert en UI. |
| TC-10 | REQ-04 | falta campo requerido → bloqueado | ✅ pass | idem TC-09. |
| TC-19 | REQ-12 | delete bloqueado en plan Active | ✅ pass (backend) | guard `assertActivityNotInActivePlanOnDelete` (S2) + wiring FE `deleteInstance(objectType:'requirement')`. Runtime FE → S9.T5. |
| TC-20 | REQ-12 | delete permitido en Draft | ✅ pass (backend) | idem TC-19. |
| — | MC-09 | create por alias RT bloqueado en plan Active | ✅ pass | `sectionValidation.test.js` (fix HIGH-1). |

**Runtime-verification (DET-36):** S5 toca UI + write paths (create/update/delete sobre RT literal + orquestación de vías). La lógica está unit-testeada y los guards backend-testeados, pero el render + persistencia end-to-end por el path real (suite + `npm run sync` + object-manager + auth) se difiere al **smoke integral de S9.T5** (recorrido completo en UPU con evidencia runtime), consistente con S1/S4. Choice: `smoke-not-reproducible` (FE no sincronizado a suite en S5; el path de escritura por el alias RT ya se validó en runtime para CREATE en S1 vía MCP).

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. Commits S5: `0b2bbb7` (familias), `fc3774a` (S4 adjust + editor read), `e87a0a0` (deriveVias fix), `889c477` (orquestación create), `e8cc098` (add modal UI + create + delete), `c4cc232` (edit-leaf + move), `fff7654`/`f6c8dfd` (fixes del review + tests). up1-mcp sin cambios en S5.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 6 (S6: alerta de planes afectados REQ-05 + RBAC wiring FE REQ-06). S5 verde: editor de requisitos por vías con CRUD (crear Curso/Métrica + "+ Nueva vía (O)" OR authoring + editar hoja/mover + eliminar con guard S2 + validación de incompleta); fix backend guard MC-09 create→alias RT; quality review 2 rondas (2 HIGH + MEDIUM corregidos, LOW documentado); 1330/1330 mod. Diferido: familia Electivo (pool sub-flow) + runtime smoke (S9.T5).
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 6 — 2026-07-28 — Alerta de planes afectados + RBAC wiring FE [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Cerrar el frente FE del editor. (REQ-05) Alerta read-only de planes afectados: al editar los requisitos de una Activity referenciada por `planEntry` de uno o más `Curriculum`, mostrar qué planes se afectan (reusa la misma query que `requirementActivityGuard.js`: `planEntry.activityId` → `Curriculum.status`); sin planes → sin alerta; plan Active → el guard MC-09 rechaza al guardar (error, no alerta info). (REQ-06) RBAC wiring FE: gatear la pestaña + las acciones de edición con `requirement:view/create/modify/delete` (capabilities ya declaradas, `capabilities.json:209-228`) — reemplaza el `enableEdit` default true de S5 por el driven por capability.

**Tasks completadas**:
- [x] S6.T1 — Alerta de planes afectados (FE), reusando la query de `requirementActivityGuard.js` (`planEntry.activityId` → `Curriculum.status`), Alert atom (REQ-05, TC-11/TC-12)
- [x] S6.T2 — RBAC wiring FE: gatear pestaña + acciones con `requirement:view/create/modify/delete` (capabilities.json:209-228) — `enableEdit` driven por capability (REQ-06, TC-13)
- [x] S6.GATE — Gate de sync S6 (T2): persistir, quality review (DET-23), consolidar TC-11/12/13, decidir continue/iterate/escalate/standby

**Test cases (DET-25):**

| TC | REQ | Escenario | Resultado | Evidencia |
|----|-----|-----------|-----------|-----------|
| TC-11 | REQ-05 | Activity en varios planes → alerta lista los planes | ✅ pass (lógica) | `affectedPlans.logic.spec.ts` (`partitionAffectedPlans`: 3 planes → published `[a,c]` / editable `[b]`) + banner `Alert warning/info` en `RequirementEditorElement.vue` (query `useAffectedPlans`: planEntry.activityId → Curriculum por id). Runtime FE → S9.T5. |
| TC-12 | REQ-05 | Activity sin planes → sin alerta | ✅ pass (lógica) | `affectedPlans.logic.spec.ts` (partición vacía) + `useAffectedPlans` corta en `planIds.length === 0` (sin banner). Runtime FE → S9.T5. |
| TC-13 | REQ-06 | usuario view-only → sin acciones de mutación | ✅ pass (lógica) | `requirementPermissions.logic.spec.ts` (`deriveRequirementPermissions(view-only)` → `canCreate/Modify/Delete/Mutate=false`) + wiring `v-if="canCreate/canModify/canDelete/canMutate"` en la toolbar/tabla. Tab gateada por `requirement:view` a nivel de layout. Runtime FE → S9.T5. |

**Runtime-verification (DET-36):** S6 toca UI (`creates_visual`) pero el render en suite requiere `npm run sync` + object-manager + suite corriendo, y el path real (capabilities reales del usuario vía `getMyPermissions`, planes reales del tenant) sólo se ejercita end-to-end en el smoke integral de **S9.T5**. La lógica del banner (partición publicado/editable) y del gating RBAC (`deriveRequirementPermissions`) está unit-testeada (TC-11/12/13). Choice: `smoke-not-reproducible` (FE no sincronizado a suite en S6), consistente con S4/S5.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 7
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 7 — 2026-07-28 — Evaluador recursivo fiel del árbol Y/O en la malla (REQ-14) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regresión completa del mod + no-regresión del alta shippeado)

**Objetivo**: Reemplazar la evaluación aplanada de prerrequisitos de la malla (`findMissingPrereqs`/`findMissingPrereqsForBatch`, que trata la lista como AND global y colapsa el anidamiento) por un **evaluador recursivo fiel** que respeta `combinator` AND/OR/K-de-N, anidamiento a cualquier profundidad, `isHardRule` (advisory no bloquea), `negate`, la semántica de `timing` (Before=antes estricto, Concurrent/Either=mismo período o antes — correquisito) y `MetricThreshold(Credits)` por agregado de `MeshEntry.credits` por scope plan/category. Reemplaza el aplanado en la superficie de alta (`onAddEntryConfirm`) sin regresión, dejando el motor listo para que S8 lo extienda a mover + banner mesh-wide.

**Tasks completadas**:
- [x] S7.T1 — `usePrereqRequirements.ts` deja de aplanar: preservar la estructura de árbol (ensamblar con `buildRequirementTree` de `ReglaUnificadaView`, twin FE que ya lee `extended['rt__X__requirement']`) alimentando al evaluador con TODOS los campos por nodo (`combinator`, `minToSatisfy`, `creditsRequired`, `isHardRule`, `negate`; hoja `RecordState`: `targetId`, `timing`, `mustBe`; `MetricThreshold`: `metric`, `scope`, `scopeId`, `operator`, `value`) (REQ-14, TC-27 VM)
- [x] S7.T2 — Evaluador recursivo puro `evaluateRequirementTree.logic.ts`: `Group` AND/OR/K-de-N (`minToSatisfy` conteo y/o `creditsRequired` sumando `MeshEntry.credits`), anidamiento, `isHardRule=false` no bloquea, `negate` invierte, hoja `RecordState` por `timing`, `MetricThreshold(Credits)` por agregado por scope plan/category antes del período (REQ-14, TC-24..33)
- [x] S7.T3 — Recablear `findMissingPrereqs`/`findMissingPrereqsForBatch` (`prereqCheck.logic.ts`) para delegar en el evaluador recursivo, preservando el contrato de salida `MissingPrereqItem[]` que consume `PrereqBlockModal`; el flujo de alta (`onAddEntryConfirm`) queda sobre el evaluador fiel (REQ-14, TC-27 vía alta)
- [x] S7.T4 — Regresión del flujo de alta ya shippeado (SP5/SP6): correr `prereqCheck.logic.spec.ts`, `curriculumMesh.logic.spec.ts`, `usePrereqRequirements.spec.ts` completos; actualizar los que asumían semántica aplanada (incl. `Concurrent` que ahora SÍ se evalúa), sin bajar cobertura (REQ-14)
- [x] S7.GATE — Gate de sync S7 (T3, ⚑ fuerte): persistir, quality review dual aislado (DET-30/35), regresión completa del mod, consolidar TC-24..33 (incl. correquisito y MetricThreshold) + no-regresión del alta, runtime-verification (DET-36), decidir continue/iterate/escalate/standby

**Flujo de la session (qué se hizo y en qué orden):**
1. Code-RAG del pipeline de prereqs de la malla: `usePrereqRequirements.ts` (aplanaba a VMs planos leyendo campos RT desde `data`), `prereqCheck.logic.ts` (AND global + Group solo con hijos `RecordState` directos), consumidores reales (`CurriculumMeshElement.vue` `checkPrereqsForBatch`/`onAddEntryConfirm`, `PrereqBlockModal`), el ensamblador twin `ReglaUnificadaView/buildRequirementTree.logic.ts` (S4, ya lee `extended`) y los RT (`Group`/`RecordState`/`MetricThreshold`) + `MeshEntry` (credits/period/activityId/categoryId).
2. S7.T1 — reescritura de `usePrereqRequirements`: la query pasa a `includeRelations` + las 3 relaciones + `extended`; `listPrereqs` devuelve `RequirementNode[]` (árbol ensamblado con `buildRequirementTree`, reuso S4). Se removieron los VMs planos y el normalizador (0 consumidores stale verificados).
3. S7.T2 — `evaluateRequirementTree.logic.ts` (nuevo, puro): evaluación recursiva en una sola pasada (créditos incluidos en `NodeEvaluation` para O(nodos)); Group AND/OR/K-de-N (min y/o créditos), advisory excluido, negate, hoja por timing, `MetricThreshold(Credits)` por scope. Matriz TC-24..33.
4. S7.T3 — `prereqCheck.logic.ts` recableado: delega en el evaluador preservando `MissingPrereqItem[]`, `RequirementsByActivity` (ahora `Record<string, RequirementNode[]>`) y las firmas que consume el `.vue` (sin tocar el `.vue`).
5. S7.T4 — regresión: specs reescritos a árbol; `Concurrent` ahora bloquea (DEC-LOCAL-04). Suite del mod 1369→1372 tras los fixes del gate, 0 regresiones.
6. S7.GATE — dual-judge aislado (2 jueces opus ciegos, DET-35) + verificación independiente (DET-33) + fixes no-bloqueantes + commits.

**Test cases (DET-25):**

| TC | REQ | Escenario | Resultado | Evidencia |
|----|-----|-----------|-----------|-----------|
| TC-24 | REQ-14 | AND incompleto (AND{A,B}, solo A antes) | ✅ pass | `evaluateRequirementTree.logic.spec.ts` — viola, detail "1 de 2 cursos…" |
| TC-25 | REQ-14 | OR una rama (OR{A,B}, solo B antes) | ✅ pass | idem — satisfecho, no exige A (fallaría con el bug OR→AND previo) |
| TC-26 | REQ-14 | K-de-N conteo (minToSatisfy=2, 1 antes) | ✅ pass | idem — viola "1 de 2" |
| TC-27 | REQ-14 | anidado EST200 (OR{AND{MAT110,MAT120}, MAT210}, solo MAT210) | ✅ pass | idem — satisfecho por la vía MAT210; + advisory PROG101 no bloquea; + vía AND completa; + ninguna vía → viola |
| TC-28 | REQ-14 | advisory (`isHardRule=false`) sin colocar | ✅ pass | idem — no viola |
| TC-29 | REQ-14 | negate=true, target antes | ✅ pass | idem — viola (invertido); + negate sin colocar → satisfecho |
| TC-30 | REQ-14 | créditos K-de-N (creditsRequired=24, 18 antes) | ✅ pass | idem — viola "18 de 24 créditos…"; + 24 → satisfecho |
| TC-31 | REQ-14 | correquisito (Concurrent) mismo período | ✅ pass | idem — satisfecho; + Either mismo período → satisfecho |
| TC-32 | REQ-14 | correquisito (Concurrent) período posterior | ✅ pass | idem — viola "No colocado en el mismo período o antes" |
| TC-33 | REQ-14 | MetricThreshold(Credits) scope=plan ≥60, 48 antes | ✅ pass | idem — viola "48 de 60 créditos…"; + 60 → satisfecho; + scope=category filtra por scopeId; + solo estrictamente anterior |
| regr. alta | REQ-14 | Before/Either bloquean si target no antes; Group K-de-N con detalle exacto; labelResolver Map/función/fallback; batch todo-o-nada + dedup | ✅ pass | `prereqCheck.logic.spec.ts` (22) — contrato del alta shippeado preservado |
| VM árbol | REQ-14 | reconstrucción EST200 con anidamiento/combinadores/timing (no aplana) | ✅ pass | `usePrereqRequirements.spec.ts` (6) — root OR → [Group AND{MAT110,MAT120}, MAT210] |

**Validación del tier (T3):** `vitest run` del mod completo VERDE — **1372/1372** (80 files), +27 sobre baseline S6 (1345): evaluador 27 (incl. 3 guards de grupo degenerado/negate del gate) + prereqCheck 22 (era ~19) + usePrereqRequirements 6 (era 8). 0 regresiones (CompositeSectionTree/CurriculumMesh/AddEntryModal verdes). Typecheck (`vue-tsc`): mis 6 archivos 0 errores; 79 preexistentes en archivos ajenos (CalendarEventCard/BaseCard/…), clase tolerada. Lint no ejecutable (tooling roto preexistente) → S9.T4.

#### Quality review (DET-23/30/35 — dual-judge T3)

Dos jueces opus ciegos en paralelo (contexto limpio, mismo handoff + kb_refs inyectados, el orquestador no revisó el código por ellos). Ambos leyeron código vivo y corrieron la matriz.

**Resultado: APPROVED por ambos** (dual confirmado). `contract_preserved=true`, `regression_risk=bajo` en los dos.

Confirmado por ambos jueces: OR se evalúa como OR (no colapsa a AND — TC-25/27 discriminan), anidamiento profundo respetado, `minToSatisfy`+`creditsRequired` presentes se exigen como AND de umbrales, créditos suman `MeshEntry.credits` solo de hijos satisfechos en períodos estrictamente anteriores (una sola pasada, sin O(n²)), `negate` una vez, timing Before=`<` / Concurrent-Either=`≤`, `MetricThreshold(Credits)` por scope, contrato `MissingPrereqItem[]` y firmas del `.vue`/`PrereqBlockModal` intactas.

Non-blocking aplicados (confirmados por ambos jueces, DET-33 leyendo código vivo):
- **(A+B) MEDIUM/LOW correctness**: un `Group` OR/K con CERO hijos hard (todos advisory o vacío) bloqueaba (K=1 sobre 0 elegibles) mientras el AND vacuo satisfacía — asimetría contra "advisory no bloquea". Fix: `hardChildren.length === 0` → satisfecho vacuo en cualquier combinator (+2 tests).
- **(A+B) LOW deadcode**: export `__resolveActivityLabel` con comentario engañoso ("reuso por prereqCheck") sin consumidor. Fix: removido.
- **(B) LOW correctness (endurecimiento)**: una hoja `negate=true` satisfecha-por-negación (target ausente/posterior) aportaba sus créditos al `creditsRequired` del padre. Fix: crédito 0 cuando `!base || negate` (+1 test).

Ningún HIGH tras el intento adversarial de refutación de ambos jueces.

**Runtime-verification (DET-36):** `smoke-not-reproducible`. S7 es lógica de la malla (`creates_visual`) pero puramente unit: el evaluador y el recableo del alta están unit-testeados (TC-24..33 + regresión 1372/1372); el render real y las superficies de malla (mover/banner) llegan en S8, y el smoke UI integral en UPU (recorrido completo con evidencia runtime) es **S9.T5** — requiere `npm run sync` + object-manager + suite + auth. Consistente con S4/S5/S6.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. `23ad0d2` feat(requirement): evaluador recursivo fiel Y/O (REQ-14) + recableo `prereqCheck`/`usePrereqRequirements` · `46bb859` test(requirement): matriz TC-24..33 + regresión del alta. Solo `modsComponents/` (RULE-013 mod-only, sin artefactos de sync). up1-mcp sin cambios en S7. Push diferido a humano (super autopilot).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 8 (S8: superficie de malla REQ-11 — re-correr deteccion al mover + banner mesh-wide sobre el evaluador fiel). S7 verde: evaluador recursivo fiel Y/O (AND/OR/K-de-N/anidamiento/advisory/negate/timing/creditos/MetricThreshold), TC-24..33 + regresion del alta 1372/1372, dual-judge (2 opus) approved, 3 non-blocking aplicados.
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 8 — 2026-07-28 — Superficie de malla (REQ-11): banner mesh-wide + detección al mover sobre el evaluador fiel [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regresión completa del mod + regresión de la malla en producción)

**Objetivo**: Sobre el evaluador fiel de S7, extender la superficie de la malla (REQ-11): (a) banner **mesh-wide** informativo (no bloqueante) que al cargar evalúa **cada entrada colocada contra su propio período** y lista las violaciones de requisitos; (b) detección al **mover** una entrada — decisión del dev (AskUserQuestion 2026-07-28): **avisar sin bloquear**, el movimiento se persiste y la violación aparece en el mismo banner (el banner recomputa sobre `entries`, sin modal ni revert). La detección al **agregar** ya existía (SP5) y ya quedó sobre el evaluador fiel en S7.

**Decisión de UX (dev, AskUserQuestion 2026-07-28):** mover a un período que viola → **avisar sin bloquear** (banner mesh-wide informativo). Descartadas: bloquear+revertir (fricción al rearmar) y bloqueo-híbrido-salvo-advisory (más casos borde). Ver `decision-creation` (S8) en `decisions_log`.

**Tasks completadas**:
- [x] S8.T1 — Detección al mover (`onDragEnd`): tras persistir el movimiento, la violación del período nuevo aparece en el banner mesh-wide (recomputa sobre `entries`, sin bloqueo ni revert — decisión del dev). El evaluador fiel es el de S7 (REQ-11, TC-16)
- [x] S8.T2 — Banner mesh-wide: al cargar la malla, evaluar **cada entrada contra su propio período** (no un período único de lote) con el evaluador fiel (`scanMeshViolations` puro + composable que cachea el árbol por actividad) y mostrar un `Alert` informativo (no bloqueante) con las violaciones (REQ-11, TC-17)
- [D] S8.T3 — Verificación de round-trip: crear un requisito `Before` en la asignatura (editor S4/S5) → abrir una malla armada con el orden incorrecto → el banner lo refleja sin tocar la malla (REQ-11, TC-18, smoke DB-gated → S9.T5) — deferred: round-trip DB-gated (crear requisito Before -> abrir malla mal ordenada -> banner lo refleja) consolidado en el smoke UI integral de S9.T5 (requiere sync+OM+suite+auth). La logica del round-trip esta cubierta por TC-16/17 unit.
- [x] S8.GATE — Gate de sync S8 (T3, ⚑ fuerte): persistir, quality review aislado (DET-30/35), regresión T3 (vitest del mod + regresión de la malla), consolidar TC-16/17/18, runtime-verification (DET-36), decidir continue/iterate/escalate/standby

**Flujo de la session (qué se hizo y en qué orden):**
1. Code-RAG de la superficie de malla: `onDragEnd`/`persistPeriodPositionUpdates`/`applyLocalPositionUpdates` (handler de mover), los `Alert` informativos existentes del template, el watch de `entries`, `activityLabelById` (resolver de labels) y el atom `Alert` (soporta slot).
2. Bifurcación de UX resuelta con el dev (AskUserQuestion): mover a período que viola → **avisar sin bloquear**. Registrada como `decision-creation` (S8).
3. S8.T2 — `meshPrereqScan.logic.ts` (puro): evalúa cada entrada contra su propio período reusando el evaluador fiel de S7. `useMeshPrereqScan.ts` (composable): cachea el árbol por `activityId` (reuso `listPrereqs`), `violations` = `computed` sobre `entries` + cache. Banner `Alert` informativo en el template + i18n es/en/pt + estilos.
4. S8.T1 — verificado como propiedad emergente: `onDragEnd` reasigna `entries.value` → `violations` recomputa contra el período nuevo, sin modal ni revert (el árbol del activity movido ya está cacheado, sin refetch).
5. S8.T3 — round-trip DB-gated diferido a S9.T5 (smoke integral); su lógica está cubierta unit por TC-16/17.
6. S8.GATE — quality review aislado (opus, single calibrado) + verificación independiente (DET-33) + commits.

**Test cases (DET-25):**

| TC | REQ | Escenario | Resultado | Evidencia |
|----|-----|-----------|-----------|-----------|
| TC-17 | REQ-11 | banner mesh-wide: cada entrada evaluada contra su propio período | ✅ pass | `meshPrereqScan.logic.spec.ts` — EST200(p2) viola por MAT110 en p3; MAT110 antes → sin violación; 2 entradas con distinto período (EST300@p1 viola, EST200@p2 no, mismo target) mata el bug de "período único de lote" |
| TC-16 | REQ-11 | aviso al mover: cambiar el período de una entrada re-evalúa (avisar sin bloquear) | ✅ pass | `meshPrereqScan.logic.spec.ts` (mover MAT110 p1→p3 hace violar EST200 p2) + verificación por lectura de `onDragEnd` (reasigna `entries.value` → `violations` computed recomputa, sin refetch/modal/revert) |
| TC-18 | REQ-11 | round-trip: crear requisito `Before` → abrir malla mal ordenada → banner lo refleja | ⏸️ diferido a S9.T5 | DB-gated (sync+OM+suite+auth); lógica cubierta unit por TC-16/17. defer-task S8.T3 |

**Validación del tier (T3):** `vitest run` del mod completo VERDE — **1380/1380** (81 files), +8 sobre baseline S7 (1372): `meshPrereqScan.logic.spec` (8). 0 regresiones (CurriculumMesh/CompositeSectionTree/AddEntryModal verdes). Typecheck (`vue-tsc`): mis 3 archivos nuevos + el `.vue` modificado 0 errores; 79 preexistentes en archivos ajenos (CalendarEventCard/BaseCard/…), clase tolerada. i18n `prereqMeshBanner` (title/entry) en es/en/pt con las mismas variables que el template.

#### Quality review (DET-23/30/35)

Reviewer aislado (T3, opus), **single reviewer calibrado** (no dual estricto): el evaluador core ya pasó dual-judge en S7; S8 agrega scan fino + composable reactivo + banner presentacional.

**Resultado: APPROVED.** `contract_preserved=true`, `regression_risk=bajo`, sin HIGH.

Confirmado por el reviewer (leyendo código vivo + corriendo la suite): per-entry period (TC-17 test 3 mata el bug de período-único-de-lote), aviso al mover reactivo sin refetch (árbol del activity movido ya cacheado), cache idempotente con fallo por-actividad aislado (cachea vacío + `console.error`, no tumba el barrido), i18n `prereqMeshBanner` es/en/pt con las variables correctas, `onDragEnd`/persistencia intactos, banner no bloqueante (Alert independiente, no aborta mutaciones), RULE-013 respetada (solo `modsComponents/` + `lang/` fuente del mod).

Residuos LOW no-bloqueantes (documentados, sin fix — el reviewer aprobó):
- `reset` del composable se exporta pero no se invoca: si el usuario edita un `requirement` en el editor y vuelve a una malla ya montada, el banner (informativo) podría mostrar el árbol viejo hasta remount. NO afecta el flujo de alta (`checkPrereqsForBatch` usa `listPrereqs` network-only). Cross-plan OK (árbol cacheado por `activityId` único). Candidato a follow-up.
- Ventana transitoria de sub-reporte durante la carga async de árboles: mientras `ensureTrees` resuelve, `violations` computa con cache parcial y omite entradas sin árbol; se autocorrige al poblarse la cache. UI transitoria, no incorrectitud.

**Runtime-verification (DET-36):** `smoke-not-reproducible`. S8 toca UI (banner mesh-wide, `creates_visual`) pero el render real requiere `npm run sync` + object-manager + suite + auth con planes/requisitos reales. La lógica del scan (per-entry period) y la reactividad (mover → recomputa) están unit-testeadas (TC-16/17). El smoke UI integral en UPU (incluye el round-trip TC-18) es **S9.T5**. Consistente con S4/S5/S6/S7.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. `8c1e920` feat(requirement): banner mesh-wide de violaciones + aviso al mover (REQ-11) + `scanMeshViolations`/`useMeshPrereqScan` + i18n es/en/pt · `1aa8c9d` test(requirement): scan per-entry (TC-17) + mover (TC-16). Solo `modsComponents/` + `lang/` fuente del mod (RULE-013 mod-only). up1-mcp sin cambios en S8. Push diferido a humano (super autopilot).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 9 (S9: no-negativos REQ-09 minimum:0 + codegen/sync + docs oficiales + KB RULE-032 + i18n ES + DoD + smoke final UPU). S8 verde: banner mesh-wide informativo evaluando cada entrada contra su periodo + aviso al mover (avisar sin bloquear, decision dev); 1380/1380 mod; quality review aislado approved; TC-16/17 verdes, TC-18 round-trip diferido a S9.T5.
- [ ] iterate → re-trabajar Session 8
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 9 — 2026-07-28 — No-negativos (REQ-09) + docs + KB + i18n + DoD + smoke final [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regresión completa + smoke runtime en UPU)

**Objetivo**: Cierre del ticket. (REQ-09) `minimum: 0` en los 4 campos numéricos de los RT de `requirement` + `codegen` + `sync`; docs oficiales (DET-37 dim1); KB DKC (DET-37 dim2: RULE del recableo de guard al migrar de rama + learn de la premisa BL-1 refutada + RULE/decision del evaluador fiel); i18n ES completo + lint/tsc; DoD y smoke UI runtime en UPU (incl. el e2e diferido de backend/MCP).

**Frontera autopilot (bloqueos legítimos, coordinación con el dev):** `npm run codegen` + `npm run sync` (S9.T1 DB) es **no-quirúrgico** (regenera el modelo completo de todos los mods, migración potencialmente destructiva → consent del dev + OM corriendo; `feedback_up1_sync_non_surgical_migrations`) y el **smoke runtime en UPU** (S9.T5) necesita sync + object-manager + suite + rebuild del MCP + auth. Ambos + el **close** del ticket (siempre pregunta) quedan fuera del avance autónomo.

**Tasks completadas**:
- [D] S9.T1 — `"minimum": 0` en los 4 campos de los RT de `requirement` (REQ-09): `rt__Group__requirement` (`minToSatisfy`, `creditsRequired`), `rt__MetricThreshold__requirement` (`value`), `rt__RecordState__requirement` (`thresholdMinGrade`) + `npm run codegen` + `npm run sync` (**DB-gated → coordinación dev**) (TC-14/TC-15) — deferred: codigo commiteado (893dc02, minimum:0 en los 4 campos RT); codegen+sync+TC-14/15 son dev-side (mecanicos) y su verificacion runtime se absorbe en S13.T3 (smoke UPU)
- [x] S9.T2 — Docs oficiales (DET-37 dim1): `docs/patterns/resolver-override.md` (convención de recablear guards al migrar un objectType a la rama `rt__`, hallazgo S1) + `mods/.ai/CONTEXT.md` (estado de `requirement`: create/read-only → editable + semántica del evaluador fiel de la malla)
- [x] S9.T3 — KB DKC (DET-37 dim2): RULE del recableo de guard (hallazgo S1) + learn de corrección de la premisa BL-1 + RULE/decision del evaluador fiel (la malla evalúa el árbol Y/O, no lo aplana)
- [x] S9.T4 — i18n ES completo de los componentes nuevos + lint/Prettier/tsc
- [D] S9.T5 — Smoke final en UPU (DET-36, runtime real, **coordinación dev**): recorrido completo + e2e diferido (UPDATE por path real TC-07, DELETE gateado, casos de handler del MCP, round-trip del banner TC-18) — deferred: smoke runtime UPU absorbido en S13.T3 (recorrido completo sobre el mantenedor); requiere sync+OM+suite+auth, coordinacion dev
- [x] S9.GATE — Gate de sync S9 (T3, ⚑ fuerte): persistir, quality review aislado, regresión completa, consolidar TODOS los TC (01-33), acceptance checkpoints, decidir continue/iterate/escalate/standby

**Checkpoint / handoff (2026-07-28, super autopilot en frontera):**

Avance autónomo completado hasta el límite del super autopilot. El resto de S9 quedó en manos del dev por su naturaleza destructiva/runtime:

- **Hecho (autónomo):** S9.T1 código (`minimum:0` en los 4 campos RT, commit `893dc02`), S9.T2 docs (`188ef50`), S9.T3 KB (RULE-curriculum-design-033 + learns L8/L9), S9.T4 i18n/tsc (mis archivos 0 errores tsc).
- **Pendiente dev (decisión del dev 2026-07-28):**
  - **S9.T1 DB** — el dev corre `npm run codegen` + `npm run sync` (+ migrate si aplica). Nota: `minimum:0` es validación app-layer (RULE-018: nullability por `required[]`), probablemente sin migración de schema; verificar tras codegen. TC-14/15 se consolidan ahí.
  - **S9.T5 smoke** — diferido: se retoma cuando el stack (sync+OM+suite+MCP+auth) esté listo. Incluye el e2e diferido (TC-07 UPDATE por path real, DELETE gateado, handler MCP, round-trip banner TC-18).
  - **Push** — 6 commits locales sin pushear (S7-S9). El dev NO autorizó push aún (siempre pregunta).
  - **Close** — no se cierra hasta smoke + OK explícito del dev.
- **Estado:** ticket `in_progress`, S9 abierta, gate S9 sin cerrar. Al retomar: correr codegen/sync (dev) → smoke S9.T5 → S9.GATE → close (con OK del dev).
- **Regresión al checkpoint:** suite del mod 1380/1380 (S8); typecheck de los archivos del ticket limpio.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S9 autonomo cerrado: T2 docs + T3 KB + T4 i18n/tsc done; T1 codigo done (DB codegen/sync dev-side) y T5 smoke diferidos->absorbidos en S13.T3. Flujo continua al re-plan del mantenedor (S11-S13). minimum:0 commiteado 893dc02.
- [ ] iterate → re-trabajar Session 9
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 10 — 2026-07-28 — Re-arquitectura FE de Requisitos: RecordList + wizard Vueform + MultiSelectPicker [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2

**Objetivo**: Rehacer el FE de la seccion Requisitos segun la decision del dev (AskUserQuestion 2026-07-28, tras ver el render real), que REVIERTE el reencuadre de S5 (editor custom por vias) y actualiza DEC-LOCAL-05. Reemplazar el editor custom `RequirementEditorElement` (tabla por vias + modal casero) por: (a) **RecordList estandar** para la lista (4 columnas base reales, opcion A DEC-LOCAL-05); (b) modal de alta con **wizard nativo de Vueform** (`RecordDetail` `layoutConfig.steps`); (c) selector de cursos con **MultiSelectPicker** (Activity + filtro depto). La fidelidad Y/O + vias vive en **"Ver regla unificada"** (ReglaUnificadaView, se mantiene custom).

**Restriccion aceptada por el dev:** las columnas "Via" (derivada parentId+combinator) y "Condicion" (por-familia) NO se pueden mostrar en un RecordList estandar (`useColumnConfiguration.ts:176` filtra a campos reales; sin columnas computadas). La lista muestra solo las 4 base; la fidelidad va en "Ver regla unificada".

**Tasks completadas**:
- [x] S10.T1 — Reinstaurar RecordList de la lista: recuperar `config/layouts/default_requirement_list.json` (S4 commit `61bdf91`, columnas base Clase/Requisito/Efecto/Exigencia + filtros ownerType/ownerId={{parentId}}) y embeberlo como tab "Requisitos" via `associatedLayout` en `default_Activity_view.json`, reemplazando el tab del elemento custom `requirement-editor`. Ajustar `layouts-declared` test (conteo + guard)
- [D] S10.T2 — Acceso a "Ver regla unificada": row action / boton en la lista que abre `ReglaUnificadaView` (arbol Y/O read-only) — se mantiene custom — deferred: superseder por el pivot a mantenedor de arbol (S11-S13, decision dev 2026-07-28): la lista deja de ser RecordList+wizard-Vueform; el modal stepper+multi-select+auto-derivar se commiteo (5046223) y se reusa en S12
- [D] S10.T3 — Modal de alta = wizard Vueform (`RecordDetail` `layoutConfig.steps`): paso 1 clase (familia) + via + exigencia; paso 2 detalle por familia. El selector de via del paso 1 usa opciones async derivadas (`deriveVias`) — deferred: superseder por el pivot a mantenedor de arbol (S11-S13, decision dev 2026-07-28): la lista deja de ser RecordList+wizard-Vueform; el modal stepper+multi-select+auto-derivar se commiteo (5046223) y se reusa en S12
- [D] S10.T4 — Selector de cursos = `MultiSelectPickerModal`/`Tab` (Activity + `additionalFilters` por departamento) integrado en el paso de detalle RecordState, reemplazando el input de texto de `targetId`. Este es el unico "componente custom" (o wrapper de config) — deferred: superseder por el pivot a mantenedor de arbol (S11-S13, decision dev 2026-07-28): la lista deja de ser RecordList+wizard-Vueform; el modal stepper+multi-select+auto-derivar se commiteo (5046223) y se reusa en S12
- [D] S10.T5 — Retirar/reducir `RequirementEditorElement` (editor custom por vias) y su logica ya no usada; preservar `requirementFamilies.logic`/`requirementCreate.logic` reusables por el wizard; limpiar imports/registro — deferred: superseder por el pivot a mantenedor de arbol (S11-S13, decision dev 2026-07-28): la lista deja de ser RecordList+wizard-Vueform; el modal stepper+multi-select+auto-derivar se commiteo (5046223) y se reusa en S12
- [D] S10.T6 — Tests (RecordList config via `layouts-declared`, wizard steps config, MultiSelectPicker wiring, logica reusada) + regresion completa del mod + i18n — deferred: superseder por el pivot a mantenedor de arbol (S11-S13, decision dev 2026-07-28): la lista deja de ser RecordList+wizard-Vueform; el modal stepper+multi-select+auto-derivar se commiteo (5046223) y se reusa en S12
- [x] S10.GATE — Gate de sync S10 (T2): persistir, quality review aislado (DET-30/35), regresion, runtime-verification (DET-36, coordinar smoke con el dev), decidir continue/iterate/escalate/standby

**Nota de secuencia:** S10 va ANTES del smoke final (S9.T5), porque redefine la UI que ese smoke recorre. Al cerrar S10: retomar S9 (codegen/sync dev + smoke S9.T5 sobre la UI nueva) -> S9.GATE -> close (OK del dev).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S10 (exploracion RecordList<->custom) cerrada con pivot. T1 (RecordList) ejecutada y luego revertida; T2-T6 diferidas->superseded por el mantenedor de arbol. Lo reusable (modal stepper 2 pasos + catalogo multi-seleccion + auto-derivar + executeViaCreateBatch) commiteado en 5046223/84e7514. Continua a S11 (mantenedor). Limitantes de core documentadas en sp7/UPONE-1378-core-limitations.md (no bloquean con el custom).
- [ ] iterate → re-trabajar Session 10
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Re-plan — Mantenedor de árbol Y/O (S11–S13, 2026-07-28)

**Pivot (decisión del dev):** una sola vista, el **árbol "regla unificada" como mantenedor editable**, en vez de RecordList + árbol separado (doble esfuerzo, duplica la estructura). Supersede REQ-01 (RecordList) y el split lista+modal. 100% mod-only → esquiva las limitantes de core L1–L4 (eran del RecordList); la maqueta se logra completa sin tocar core. Reusa lo ya construido en S1–S10 (evaluador fiel S7, banner malla S8, modal stepper 2 pasos + catálogo multi-selección + auto-derivar + guards).

| # | Objetivo | Tier | Tasks previstas |
|---|----------|------|-----------------|
| S11 | **Mantenedor de árbol (vista principal)** | T2 | T1 consolidar `ReglaUnificadaView`+`RequirementEditor` en un componente único (`RequirementMaintainer`): árbol editable como vista principal, reusando `useReglaUnificada`/`RequirementTreeNode`/`buildRequirementTree`/`deriveVias`, con **detalles base por nodo** friendly (Clase/Requisito=curso nombre+código/Condición/Vía/Exigencia) + **degradación elegante** para el caso simple (1 vía plana ≈ lista). T2 **búsqueda/filtro dentro del árbol** (nombre/código/clase; colapsa/resalta). T3 **wire** en `default_Activity_view.json`+`_edit.json` reemplazando RecordList+launcher; **revertir** el RecordList inline + filtro NOT_EQUALS + `showList`. T4 estilo **up1** (tokens/atoms) + WAI-ARIA tree. GATE |
| S12 | **Acciones por nodo + alta** | T2 | T1 menú por nodo: **Ver** (modal read-only con más detalle, todos los campos friendly), **Editar** (reuse edit-leaf), **Eliminar** (guard S2). T2 botón **"Añadir requisito al árbol"** → modal **stepper 2 pasos** + catálogo **multi-selección** + auto-derivar (reuso S10), agrega a vía existente o nueva. T3 (decisión) familia **Electivo (K-de-N)** in/out. Tests. GATE |
| S13 | **Cierre** | T3 | Regresión completa del mod + i18n ES/EN/PT + lint/tsc. Docs oficiales (`curriculum-mesh-guards-prereqs.md`/`mods/.ai`) + KB (decisión mantenedor; limitantes de core → no bloqueantes). **Smoke runtime en UPU** (recorrido completo sobre el mantenedor). GATE + estado del ticket |

**Notas:** (a) S9.T1 DB (`minimum:0` codegen+sync) sigue pendiente e independiente (dev). (b) Al cerrar, revisar el doc `sp7/UPONE-1378-core-limitations.md`: con el mantenedor custom, L1–L4 dejan de bloquear; quedan como mejoras de plataforma. (c) Reuso alto → sesiones acotadas; no es reescritura desde cero.

### Brief de ejecución S11–S13 (contexto-independiente — leer antes de ejecutar)

> **Propósito:** habilitar la ejecución de S11–S13 en un **contexto LLM nuevo**, sin depender de la conversación previa. Todo lo necesario está acá + en el spec + en `sp7/UPONE-1378-core-limitations.md`.

#### 0. Objetivo y decisión de arquitectura (por qué)
Reemplazar la sección "Requisitos" de la asignatura por **UN mantenedor único = el árbol Y/O ("regla unificada") editable**, en vez de un RecordList nativo + árbol separado. Razón: el requisito ES un árbol (vías OR / condiciones AND / K-de-N); un RecordList lo aplana y duplicaría la estructura del árbol. El mantenedor es **100% mod-only** y **esquiva las limitantes de core L1–L4** (que eran del RecordList) → la maqueta se logra completa sin tocar core. Supersede REQ-01 (RecordList) y el split lista+modal de la maqueta.

#### 1. Estado de partida (git)
- Repo mod: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design`, rama `feat/UPONE-1378-activity-requirements-section`, base `develop` (RULE-dev-004, mod-only). Working tree **limpio**.
- Último commit: `e52e530` (S10 chore layouts). Backend/lógica de S1–S9 **commiteados y verdes** (evaluador fiel S7, banner malla S8, guards MC-09/ciclos, `minimum:0` código S9). S10 modal/lógica reusable **commiteados** (`5046223` feat, `84e7514` test).
- **NO pushear** (8+ commits locales; push siempre pregunta al dev).
- Suite del mod: `cd <mod> && npx vitest run` (baseline verde 1382). Typecheck: `npx vue-tsc --noEmit` (baseline ~79 errores preexistentes ajenos, tolerados). Para ver en runtime: `npm run sync` (raíz) + hard reload (cache Apollo, L5).

#### 2. Mapa de REUSO (no reescribir — extender)
- **Árbol:** `modsComponents/ReglaUnificadaView/` → `useReglaUnificada.ts` (fetch+ensamble), `RequirementTreeNode.ts` (render nodo WAI-ARIA), `buildRequirementTree.logic.ts` (ensamble parent→children), `describeRequirementNode.logic.ts` (descriptor friendly por nodo).
- **Derivaciones:** `modsComponents/RequirementEditor/requirementEditor.logic.ts` → `deriveVias`/`deriveRows`/`countVias` (vías + filas friendly desde el árbol).
- **Alta (modal stepper):** `RequirementEditorElement.vue` YA tiene: stepper 2 pasos estilizado (`.rqe-steps`), paso 1 (Clase/Vía/Exigencia en grid 2 col), paso 2 catálogo **multi-selección** (checkboxes) con búsqueda + filtro departamento (`useActivityPicker` de `CurriculumMesh`), auto-derivar label(curso nombre+código)/effect/mustBe. Lógica: `requirementFamilies.logic.ts` (familias+presets+`validateComplete`+`buildCreatePayload`), `requirementCreate.logic.ts` (`planViaCreate`/`executeViaCreate`/`executeViaCreateBatch`).
- **Editar/Eliminar:** `RequirementEditorElement.vue` `openEdit`/`submitAdd`(edit)/`askDelete`; guard de delete backend en `requirementCategoryDelete.resolver.js` (S2, plan Active).
- **Alerta impacto + RBAC:** `useAffectedPlans.ts`/`affectedPlans.logic.ts` (REQ-05), `requirementPermissions.logic.ts` (REQ-06).
- **Catálogo cursos:** `modsComponents/CurriculumMesh/useActivityPicker.ts` + `activityPicker.logic.ts` (`applyPickerFilters`, `deriveDepartments`).

#### 3. REVERTS necesarios (deshacer el detour RecordList de S10)
- `config/layouts/default_Activity_view.json` y `default_Activity_edit.json`: quitar el elemento `requirementList` (record-list) + el filtro `recordType NOT_EQUALS Group` + `showList:false`; la tab "requisitos" debe apuntar **solo** al componente mantenedor único (que S11 crea). No dejar el RecordList.
- El prop `showList` de `RequirementEditorElement` deja de tener sentido si se consolida en el mantenedor (evaluar al refactorizar).

#### 4. Sessions y task contracts

**S11 — Mantenedor de árbol (vista principal editable + detalles + búsqueda)** [tier T2]
- S11.T1 — Componente mantenedor único (extender `ReglaUnificadaView`/`RequirementEditorElement` o nuevo `RequirementMaintainer`): árbol Y/O **editable** como vista principal; por nodo mostrar detalles base friendly (Clase [Curso/Electivo/Métrica, no `RecordState`] / Requisito=curso nombre+código / Condición [Aprobado·antes, ≥N créditos] / Vía / Exigencia badge). **Degradación elegante**: 1 vía plana ≈ lista simple. Reusar `useReglaUnificada`+`RequirementTreeNode`+`describeRequirementNode`+`deriveVias`.
- S11.T2 — Búsqueda/filtro dentro del árbol (por nombre/código/clase): resaltar/colapsar nodos que no matchean.
- S11.T3 — Wire en layouts Activity vista+edición → tab "requisitos" apunta al mantenedor; **revertir** RecordList+launcher+filtro NOT_EQUALS (ver §3).
- S11.T4 — Estilo up1 (tokens `--up1-*`/atoms) + WAI-ARIA tree (RULE-curriculum-design-001/002).
- S11.GATE — quality review + regresión + decisión.

**S12 — Acciones por nodo + alta (con Electivo)** [tier T2]
- S12.T1 — Menú por nodo: **Ver** (modal read-only con más detalle, todos los campos friendly), **Editar** (reuse edit-leaf modal), **Eliminar** (reuse guard S2). RULE-014 (Modal atom casero).
- S12.T2 — Botón **"Añadir requisito al árbol"** → modal **stepper 2 pasos** + catálogo **multi-selección** + auto-derivar (reuso S10 `5046223`); agrega a vía existente o nueva (`executeViaCreateBatch`).
- S12.T3 — **Familia Electivo (K-de-N)** — INCLUIR (no follow-up): habilitar en `FAMILY_ORDER` (`requirementFamilies.logic.ts`, hoy `['Course','Metric']`), paso 1 ofrece "Electivo"; paso 2 = catálogo multi (pool) + campo K (`minToSatisfy`) → crea `Group(OR, minToSatisfy)` con hijos RecordState. Extender `requirementCreate.logic` (crear Group pool + N hijos). Manejar el caveat del filtro de Group estructural vs pool (sp7 §4 sub-caveat).
- S12.T4 — Tests (Ver/Editar/Eliminar, alta multi, Electivo pool + K).
- S12.GATE.

**S13 — Cierre** [tier T3]
- S13.T1 — Regresión completa del mod (`vitest run` verde) + i18n es/en/pt de todo lo nuevo + lint/tsc.
- S13.T2 — Docs oficiales (`docs/architecture/curriculum-mesh-guards-prereqs.md`, `mods/.ai/CONTEXT.md`) + KB DKC (RULE/decision del mantenedor) + actualizar `sp7/UPONE-1378-core-limitations.md`: con el mantenedor custom, **L1–L4 dejan de bloquear** (quedan mejoras de plataforma).
- S13.T3 — **Smoke runtime en UPU** (DET-36): recorrido completo sobre el mantenedor — árbol + detalles + Ver/Editar/Eliminar + Añadir (stepper multi + Electivo) + búsqueda; evidencia runtime. Requiere `npm run sync` + object-manager + suite + auth (coordinar con dev).
- S13.GATE + estado del ticket.

#### 5. Restricciones a respetar (rules del mod)
RULE-dev-004 (mod-only, no core); RULE-curriculum-design-013 (no commitear artefactos de sync); RULE-014 (modales caseros con Modal atom, lógica en `.ts` puro); RULE-001/002 (WAI-ARIA tree/dialog); RULE-017 (mod no registra field resolvers GraphQL). Import cross-folder solo a carpetas de `modsComponents/` que tengan componente (learn L10: carpetas solo-lógica no sincronizan).

#### 6. Pendientes del dev (independientes, no bloquean S11–S13)
- S9.T1 DB: `npm run codegen` + `npm run sync` para aplicar `minimum:0` (lo corre el dev).
- Push de los commits locales (siempre pregunta).
- Smoke S9.T5 se absorbe en S13.T3.

#### 7. Cómo ejecutar
Modo **super autopilot** (avanzar continuo S11→S13, sin pausar entre sessions salvo bloqueo legítimo push/destructivo/close). Transiciones canónicas vía `commands/dkc-execute-task up1 TICKET-101 {open-session|start-task|done-task|close-gate}`. Gates con quality review aislado (DET-30/35), verificación de self-report (DET-33), runtime-verification (DET-36). Commits locales granulares por session (DET-27); push y **close** siempre preguntan al dev.

### Session 11 — 2026-07-28 — Mantenedor de árbol Y/O (vista principal editable + detalles + búsqueda) [phase: execute]

**Tipo**: normal
**Validation tier**: T2

**Objetivo**: Convertir la sección "Requisitos" en UN mantenedor único = el árbol Y/O ("regla unificada") como vista principal, reemplazando el detour RecordList + árbol-en-modal de S10. Reusar `useReglaUnificada`/`RequirementTreeNode`/`buildRequirementTree`/`deriveVias` (ver brief §2). 100% mod-only, esquiva las limitantes de core L1–L4. Baseline verificado: **1382/1382** (81 files).

**Tasks completadas**:
- [x] S11.T1 — Componente mantenedor único: promover el árbol Y/O a vista principal (no modal), con detalles base friendly por nodo (Clase [Curso/Electivo/Métrica] / Requisito=curso nombre+código / Condición / Vía / Exigencia badge) y degradación elegante para 1 vía plana. Reusar `useReglaUnificada`+`RequirementTreeNode`+`describeRequirementNode`+`deriveVias`; retirar la tabla plana + el modal "Ver regla unificada" (el árbol ES la regla).
- [x] S11.T2 — Búsqueda/filtro dentro del árbol (nombre/código/clase): resaltar/colapsar nodos que no matchean, sin romper WAI-ARIA.
- [x] S11.T3 — Wire en `default_Activity_view.json` + `default_Activity_edit.json`: tab "requisitos" apunta solo al mantenedor; **revertir** `requirementList` (record-list) + filtro `recordType NOT_EQUALS Group` + `showList:false`. Ajustar `layouts-declared` test.
- [x] S11.T4 — Estilo up1 (tokens `--up1-*`/atoms) + WAI-ARIA tree (RULE-curriculum-design-001/002).
- [x] S11.GATE — Gate de sync S11 (T2): persistir, quality review aislado (DET-30/35), regresión completa, self-report-verification (DET-33), runtime-verification (DET-36), decidir continue/iterate/escalate/standby.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S11.T1 | Árbol Y/O como vista principal: `RequirementEditorElement.vue` reshape (tabla plana + modal "Ver regla unificada" → árbol inline reusando `RequirementTreeNode`); prop `showList` removido; degradación elegante natural del árbol (1 vía plana ≈ lista somera) | cf7ba99 |
| S11.T2 | `filterRequirementTree` (puro, acento/mayúscula-insensible, por nombre/código/clase, preserva ancestros, subárbol completo en match propio) + search box → `visibleTree`; keyboardNav sobre árbol filtrado + auto-expand al buscar + reparación de foco obsoleto; 7 tests nuevos | cf7ba99 / cfbe52f |
| S11.T3 | Revert wiring: `default_Activity_view/_edit.json` tab "requisitos" → solo `[requirementEditor]`; removidos `requirementList` (record-list) + filtro `recordType NOT_EQUALS Group` + `showList`; JSON válido; `layouts-declared` sin cambios (59 files, guard de objetos retirados intacto) | ae1cb2c |
| S11.T4 | Estilo up1 del árbol vía `:deep(.rgu-node*)` con tokens `--up1-*` (row/root/child/hover); toolbar/búsqueda/estado vacío; `focus-visible` del roving tabindex; estilos muertos `.rqe-card--launcher` removidos; i18n `searchPlaceholder`/`searchEmpty` es/en/pt + limpieza de keys muertas | cf7ba99 / 2aa624f |

**Validación del tier (T2):** `vitest run` del mod completo VERDE — **1389/1389** (81 files), +7 sobre baseline S10 (1382): `filterRequirementTree` (7 casos: query vacía = misma referencia, poda por label preservando ancestros, match por código dentro de AND, acento/mayúscula-insensible, tokens de clase curso/métrica, match propio conserva subárbol, sin coincidencias → vacío). 0 regresiones. Typecheck (`vue-tsc`): mis archivos 0 errores; 79 preexistentes ajenos (CalendarEventCard/BaseCard/…), clase tolerada. Lint no ejecutable (tooling roto preexistente).

#### Quality review (DET-23/30/35)

Reviewer aislado (T2, opus), **single reviewer calibrado** 2 rondas (proporcional a auto/T2, como S4/S5/S6). Contexto limpio, con KB del mod (RULE-013/014/001/002).

**Ronda 1: ITERATE** — 2 MEDIUM reales (confirmados por mí leyendo código vivo, DET-33) + 1 LOW:
- MEDIUM auto-expand: la búsqueda podaba `visibleTree` pero `computeInitialExpanded` (`useTreeKeyboardNav`) solo expande roots; las vías `Group(AND)` en depth 1 quedan colapsadas por default → al buscar por código/nombre de curso (uso primario) la hoja que matchea quedaba oculta bajo la vía colapsada, y la búsqueda "no encontraba".
- MEDIUM foco obsoleto: tras podar el nodo enfocado, `keyboardFocusedNodeId` apuntaba a un nodo ausente (`ensureInitialFocus` es idempotente) → el árbol perdía su único treeitem tabulable hasta presionar una flecha (regresión WAI-ARIA acotada al flujo de búsqueda).
- LOW: keys i18n muertas (`viewUnifiedRule`/`unifiedRuleTitle`/`col`) tras remover tabla + modal.

**Fixes:** `watch([visibleTree, search])` que al buscar expande todos los `Group` del árbol filtrado (`keyboardNav.expandedSet`) y al limpiar restaura el default; reparación de foco obsoleto reasignando `focusedNodeId` SIN `setFocus` (no roba el DOM focus del input mientras el usuario escribe); limpieza de las 3 keys en es/en/pt.

**Ronda 2: APPROVED** — los 3 cerrados, verificados contra código vivo, sin nuevos HIGH/MEDIUM. Observación no bloqueante: limpiar la búsqueda descarta expansiones manuales previas (tradeoff aceptable, consistente con el comportamiento buscado). `contract_preserved=true`, `mod_only_confirmed=true`, 1389/1389.

**Runtime-verification (DET-36):** `smoke-not-reproducible`. S11 toca UI (`creates_visual`, la vista principal del mantenedor) pero el render real requiere `npm run sync` + object-manager + suite + auth con planes/requisitos reales. La lógica del filtro está unit-testeada (7 casos) y la interacción búsqueda/expand/foco se verificó por lectura + review 2 rondas. Smoke UI integral en UPU (recorrido completo sobre el mantenedor) → **S13.T3**. Consistente con S4/S5/S6/S7/S8.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. 4 commits granulares: `cf7ba99` feat(requirement) tree mantenedor + búsqueda · `cfbe52f` test(requirement) filterRequirementTree · `ae1cb2c` chore(layouts) tab requisitos → mantenedor único · `2aa624f` chore(i18n) search keys + limpieza. Solo `modsComponents/` + `config/layouts/` + `lang/` del mod (RULE-013 mod-only). up1-mcp sin cambios. Push diferido a humano (super autopilot).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 12 (S12: acciones por nodo Ver/Editar/Eliminar + boton Anadir + familia Electivo K-de-N). S11 verde: arbol Y/O como mantenedor unico (vista principal editable) + busqueda; 1389/1389; quality review 2 rondas approved; revert RecordList; smoke integral -> S13.T3
- [ ] iterate → re-trabajar Session 11
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 12 — 2026-07-29 — Acciones por nodo + alta + familia Electivo [phase: execute]

**Tipo**: normal
**Validation tier**: T2

**Objetivo**: Completar el mantenedor de árbol con acciones por nodo (Ver/Editar/Eliminar) y el alta desde el árbol, e incorporar la familia Electivo (K-de-N). Reusar lo ya construido en S1–S10 (modal stepper 2 pasos + catálogo multi-selección + auto-derivar de S10; guard de delete de S2; edición de hoja de S5). RULE-014 (Modal atom casero), RULE-001/002 (WAI-ARIA), RULE-013 (mod-only).

**Tasks completadas**:
- [x] S12.T1 — Menú por nodo (hoja): **Ver** (modal read-only con detalle friendly completo), **Editar** (reuse modal de edición de hoja), **Eliminar** (reuse guard de plan Active, S2). Acciones solo en hojas (RecordState/MetricThreshold), no en Group estructurales. Gateadas por RBAC (canModify/canDelete, REQ-06).
- [x] S12.T2 — Botón **"Añadir requisito al árbol"** (ya en toolbar) → modal stepper 2 pasos + catálogo multi-selección + auto-derivar (reuso S10); agrega a vía existente o nueva (`executeViaCreateBatch`). Verificar wiring completo.
- [x] S12.T3 — **Familia Electivo (K-de-N)** — INCLUIR: habilitar en `FAMILY_ORDER` (`requirementFamilies.logic.ts`); paso 1 ofrece "Electivo"; paso 2 = catálogo multi (pool) + campo K (`minToSatisfy`) → crea `Group(OR, minToSatisfy)` con hijos RecordState. Extender `requirementCreate.logic`.
- [x] S12.T4 — Tests (Ver/Editar/Eliminar por nodo, alta multi, Electivo pool + K) + regresión completa + i18n es/en/pt.
- [x] S12.GATE — Gate de sync S12 (T2): persistir, quality review aislado (DET-30/35), regresión, self-report (DET-33), runtime (DET-36), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S12.T1 | Menú kebab por nodo (`ActionMenu` flotante) en HOJAS reales (recordType != Group): Ver (modal read-only detalle friendly) + Editar (reuse `openEdit`) + Eliminar (reuse `askDelete`, guard S2), gateado por RBAC `canModify`/`canDelete`; `RequirementTreeNode` action-aware (props opcionales, backward-compat con ReglaUnificadaView); `onNodeAction` resuelve el row por id | f896bb5 |
| S12.T2 | Botón "Añadir requisito al árbol" (`openAdd`, `canCreate`+`ownerId`) → modal stepper 2 pasos + catálogo multi + auto-derivar (reuso S10); wiring verificado post-reshape | f896bb5 |
| S12.T3 | Familia **Electivo (K-de-N)** habilitada (`FAMILY_ORDER` +Elective): paso 2 = catálogo multi (pool) + K (`minToSatisfy` required); `executeElectiveCreate` crea `Group(OR, minToSatisfy=K)` bajo la vía + N hojas `RecordState` bajo el pool; `ensureViaContainers` extraído (DRY); validación K∈[1,N] y ≥2 cursos | f896bb5 |
| S12.T4 | Tests: `requirementFamilies` Elective (payload Group OR+K, validateComplete, FAMILY_ORDER) + `requirementCreate` `executeElectiveCreate` (vía nueva/existente, pool+N hojas) + `RequirementTreeNode` menú por nodo (hoja/grupo/grupo-vacío, RBAC, emit `node-action` con stub ActionMenu) | 729f09d |

**Validación del tier (T2):** `vitest run` VERDE — **1400/1400** (81 files), +11 sobre baseline S11 (1389): Electivo (5) + acciones-por-nodo/empty-group (6). 0 regresiones. Typecheck (`vue-tsc`): mis archivos 0 errores; 79 preexistentes ajenos (clase tolerada).

#### Quality review (DET-23/30/35)

Reviewer aislado (T2, opus), single reviewer en **contexto limpio independiente del de S11**. **Resultado: APPROVED**, sin HIGH/MEDIUM. Confirmado por el reviewer (código vivo + suite): correctitud K-de-N del pool contra el evaluador fiel S7 (`evaluateGroup`, `base = count(hijos hard satisfechos) >= minToSatisfy`); `ensureViaContainers` byte-a-byte equivalente al inline previo (sin regresión de la secuencia de creación); rama Elective evaluada antes que `hasActivityPicker` con validación K∈[1,N]/≥2 cursos y `add.saving` reseteado en `finally`; menú solo en hojas con RBAC; mod-only; i18n es/en/pt con variables idénticas.

3 LOW no bloqueantes:
- (a) kebab en Group vacío → acciones no-op — **CORREGIDO**: menú condicionado a `recordType != 'Group'` (consistente con `deriveRows`) + test de Group vacío.
- (b) kebab tabbable dentro del treeitem — patrón **preexistente** del componente (el botón de expandir ya lo es), consistente; follow-up de a11y (integrar al roving tabindex).
- (c) editar/eliminar hojas de un pool puede romper el invariante N≥K / N≥2 — limitación de MVP (gestionar el pool como unidad editable = follow-up). Ambos (b) y (c) → `sp7/UPONE-1378-out-of-scope-followups.md` en S13.T2.

**Runtime-verification (DET-36):** `smoke-not-reproducible`. S12 toca UI (menú, modal Ver, alta Electivo) pero el render + persistencia real requieren `npm run sync` + object-manager + suite + auth. Lógica unit-testeada (11 tests nuevos); smoke UI integral en UPU → **S13.T3**. Consistente con S4-S8/S11.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. 3 commits: `f896bb5` feat(requirement) acciones por nodo + Ver + Electivo K-de-N · `729f09d` test(requirement) menú por nodo + Electivo pool · `631d6cd` chore(i18n) actions/view + electivo. Solo `modsComponents/` + `lang/` del mod (RULE-013 mod-only). up1-mcp sin cambios. Push diferido a humano.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 13 (S13: regresion completa + i18n + lint/tsc + docs oficiales + KB + smoke runtime UPU). S12 verde: acciones por nodo (Ver/Editar/Eliminar) + Electivo K-de-N; 1400/1400; quality review approved (0 HIGH/MEDIUM, 1 LOW corregida, 2 LOW follow-up); smoke integral -> S13.T3
- [ ] iterate → re-trabajar Session 12
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 13 — 2026-07-29 — Cierre: regresión + i18n + docs + KB + smoke UPU [phase: execute]

**Tipo**: ⚑ fuerte (smoke runtime + close requieren coordinación/decisión del dev)
**Validation tier**: T3

**Objetivo**: Cierre del mantenedor de árbol. Regresión completa del mod + i18n es/en/pt de todo lo nuevo + lint/tsc. Docs oficiales (`docs/architecture/curriculum-mesh-guards-prereqs.md` / `mods/.ai/CONTEXT.md`) + KB DKC (decisión del mantenedor + limitantes de core → no bloqueantes). Smoke runtime en UPU (recorrido completo sobre el mantenedor) — coordinación dev.

**Frontera autopilot (bloqueos legítimos):** el **smoke runtime en UPU** (S13.T3) necesita `npm run sync` + object-manager + suite + auth; el **close** del ticket siempre pregunta al dev. Ambos fuera del avance autónomo.

**Tasks completadas**:
- [x] S13.T1 — Regresión completa del mod (`vitest run` verde) + verificación i18n es/en/pt de todo lo nuevo (S11+S12) + lint/tsc (clase preexistente tolerada documentada).
- [x] S13.T2 — Docs oficiales (DET-37 dim1: `mods/.ai/CONTEXT.md` estado del mantenedor de requisitos) + KB DKC (decisión del mantenedor de árbol único; familia Electivo K-de-N) + actualizar `sp7/UPONE-1378-out-of-scope-followups.md` con los follow-ups LOW (a11y kebab roving tabindex; invariante del pool electivo al editar/eliminar hojas).
- [D] S13.T3 — Smoke runtime en UPU (DET-36, coordinación dev): recorrido completo sobre el mantenedor (árbol + detalles + Ver/Editar/Eliminar + Añadir stepper multi + Electivo K-de-N + búsqueda) + el e2e diferido de backend/MCP (S9.T5). Requiere `npm run sync` + object-manager + suite + auth. — deferred: Smoke runtime UPU (recorrido completo mantenedor + e2e backend/MCP diferido) requiere npm run sync + object-manager + suite + auth: frontera de super autopilot, coordinacion con el dev
- [x] S13.GATE — Gate de sync S13 (T3, ⚑ fuerte): persistir, quality review, regresión completa, consolidar TC, self-report (DET-33), runtime (DET-36), decidir continue/iterate/escalate/standby.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S13.T1 | Regresión completa **1400/1400** (81 files); paridad i18n es/en/pt OK (81 keys, namespaces `requirementEditor`+`requirementAddModal`, sin faltantes/extras); tsc 79 baseline (0 en archivos del ticket); eslint no ejecutable (tooling roto preexistente) | — |
| S13.T2 | Docs oficiales: `mods/.ai/CONTEXT.md` +bullet del mantenedor. KB: `DEC-051` (mantenedor de árbol Y/O único vs RecordList, mod-only, Electivo K-de-N). Follow-ups: `sp7/UPONE-1378-out-of-scope-followups.md` §5 (a11y kebab tab-stop) + §6 (invariante pool electivo) + nota §4 superseded | 2f… (docs mod) |
| S13.T3 | **DEFERIDO** — smoke runtime en UPU (recorrido completo sobre el mantenedor + e2e backend/MCP diferido de S9.T5): requiere `npm run sync` + object-manager + suite + auth. Frontera de super autopilot → coordinación dev | — |

**Validación del tier (T3):** regresión completa **1400/1400**; i18n parity verificada; tsc baseline. Toda la lógica del ticket (S1-S12) unit/integration-testeada y revisada por sesión (quality review aislado approved en cada ciclo de código: S1 dual, S2/S3/S4/S5/S6 single/dual, S7 dual, S8 single, S11 dual-round, S12 single).

**Runtime-verification (DET-36):** `smoke-not-reproducible` — S13.T3 diferido (frontera autopilot). El smoke integral en UPU consolida los TC de render/persistencia diferidos (TC-01/02 lista→árbol, TC-03/07 alta/edición por path real, TC-19 delete gateado, Electivo K-de-N, búsqueda, banner) + el e2e backend/MCP de S9.T5.

#### Estado de cierre (super autopilot en frontera)

Avance autónomo completado hasta el límite del super autopilot. El ticket queda **listo para cerrar** pero NO se cierra: el close siempre pregunta al dev y el acceptance runtime (smoke) aún no se ejecutó.

- **Hecho (autónomo):** S11 (mantenedor de árbol + búsqueda), S12 (acciones por nodo Ver/Editar/Eliminar + Electivo K-de-N), S13.T1 (regresión+i18n+tsc) y S13.T2 (docs+KB+follow-ups). 8 commits locales del mod (S11×4, S12×3, S13×1) sin pushear.
- **Pendiente dev (frontera):**
  - **S13.T3 smoke** — correr `npm run sync` + object-manager + suite + auth y recorrer el mantenedor (árbol + Ver/Editar/Eliminar + Añadir stepper multi + Electivo K-de-N + búsqueda) + el e2e backend/MCP diferido (S9.T5). También S9.T1 DB (`npm run codegen` + `npm run sync` para `minimum:0`, independiente).
  - **Push** — 8 commits del mod (S11-S13) + records DKC (DEC-051, ticket, RULE-033) sin pushear. Push siempre pregunta.
  - **Close** — request-close (con teach-close DET-22) + `status: closed` solo con OK explícito del dev, tras el smoke.

**Gate decision:** (approvedBy: autopilot)

- [ ] continue → Session 14
- [ ] iterate → re-trabajar Session 13
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → S13 autonomo completo (mantenedor S11 + acciones/Electivo S12 + regresion/i18n/docs/KB S13). Ticket LISTO para cerrar; standby a la espera del dev para: smoke runtime UPU (S13.T3 + S9.T5 e2e + S9.T1 DB codegen/sync), push (8 commits mod + records DKC), y close explicito (con teach-close DET-22). 1400/1400; quality review approved por sesion.

### Session 14 — 2026-07-29 — Iteración post-render: alta robusta + fidelidad maqueta [phase: execute]

**Tipo**: normal
**Validation tier**: T2

**Objetivo**: Feedback del dev tras ver el render real. (1) BUG: el alta no reconoce las vías de árboles reales — el seed crea raíz `Group(AND)` con el `Group(OR)` ANIDADO ("Vía de ingreso"), y el modelo de vías solo miraba la raíz → colapsaba a 1 vía y creaba un OR-raíz paralelo al añadir. Fix: localizar el OR contenedor esté donde esté + append correcto (sin OR paralelo) + "+ Nueva vía" bajo ese OR. (2) Fidelidad maqueta: iconografía por clase + badges ("Y · todas"/"O · al menos una"), texto de la regla sobre el árbol ("Para cursar {code}: (A Y B) Ó (C)"). (3) Editar acotado (detalle read-only + solo Exigencia, decisión dev AskUserQuestion 2026-07-29) + modal Ver en 2 columnas.

**Tasks completadas**:
- [x] S14.T1 — Alta robusta: `resolveViaContainer`/`deriveVias` localizan el `Group(OR)` de vías esté en la raíz o anidado bajo un AND; append de condición cuelga del grupo de la vía elegida (sin crear OR-raíz paralelo); "+ Nueva vía (O)" crea `Group(AND)` bajo el OR (creando/envolviendo el OR si no existe). Tests de árboles no canónicos (seed EST200).
- [x] S14.T2 — Iconografía por clase (Curso birrete / Grupo diagrama / Métrica gráfico) + badges de combinador ("Y · todas" / "O · al menos una") en `RequirementTreeNode`, fiel a la maqueta.
- [x] S14.T3 — Texto de la regla sobre el árbol (`buildRuleText`: `(A Y B) Ó (C)`), i18n es/en/pt.
- [x] S14.T4 — Editar acotado a modal compacto (Clase/Requisito/Condición/Vía read-only + Exigencia editable) + modal Ver reordenado en 2 columnas (como Editar).
- [x] S14.T5 — Tests + regresión completa + i18n es/en/pt.
- [x] S14.GATE — Gate de sync S14 (T2): persistir, quality review aislado (DET-30/35), self-report (DET-33), runtime (DET-36), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S14.T1 | Alta robusta: `findViaContainer` localiza el `Group(OR)` contenedor (raíz o anidado bajo AND); `executeConditionCreate`/`Batch`/`Elective` con `resolveTargetGroup` (append a Group AND; wrap+reparent de hoja suelta; nueva vía bajo el OR creándolo/envolviendo) + `updateFn`. `computeDeleteCascade` (borra hoja + grupos ancestros vacíos bottom-up, compatible con añadir vías). `viaOptions` incluye vías de hoja suelta; summary=`countAllLeaves`; `onNodeAction` resuelve condiciones globales | b704221 |
| S14.T2 | Iconografía por clase (Curso `bi-mortarboard` / Grupo `bi-diagram-3` / Métrica `bi-graph-up-arrow`) reemplaza el chip de texto; badges combinador "Y · todas"/"O · al menos una" + advisory "Recomendado" (amber) i18n | b704221 |
| S14.T3 | `buildRuleText` (recursivo `(A Y B) Ó C`, top sin paréntesis, pool K-de-N con prefijo) + línea de regla sobre el árbol + i18n `ruleText` | b704221 |
| S14.T4 | Editar acotado a modal compacto (detalle read-only 2-col + solo Exigencia vía Select → update `isHardRule`); modal Ver reordenado a 2 columnas; removido el edit-vía-stepper (rama muerta + `findRequirementNode`/`KIND_TO_FAMILY`). **Extra feedback dev**: click en toda la fila del grupo expande/contrae + botones Expandir/Contraer todo | b704221 |
| S14.T5 | Regresión **1411/1411** + paridad i18n es/en/pt (118 keys ×3) + tsc 79 baseline | dd7ee52 / b50a067 |

**Validación del tier (T2):** `vitest run` VERDE — **1411/1411** (81 files), +11 sobre baseline S13 (1400): `findViaContainer`/`countAllLeaves`/`computeDeleteCascade`/`buildRuleText` + nueva API de creación (append anidado, wrap+reparent, cascade). 0 regresiones. tsc 79 baseline (0 en archivos del ticket).

#### Quality review (DET-23/30/35)

Reviewer aislado (T2, opus), contexto limpio. **Resultado: APPROVED**, sin HIGH/MEDIUM. Confirmado por el reviewer (código vivo + suite): localización del OR anidado, `resolveTargetGroup`/reparent con orden y parentId correctos, `computeDeleteCascade` bottom-up sin borrar de más, `onNodeAction` para condiciones globales, `buildRuleText`, mod-only.

4 LOW no bloqueantes:
- #1 código muerto `add.mode/editId/currentViaId` tras remover el edit-stepper — **CORREGIDO**.
- #4 comentario impreciso sobre `stopPropagation` del ActionMenu — **CORREGIDO**.
- #2 `NEW_VIA` en árbol AND-puro sin OR envuelve todo como vía 1 (edge intencional + testeado; el seed EST200 NO lo dispara porque el OR ya viene anidado) — documentado.
- #3 cascade de borrado no atómico (best-effort; `refetch` refleja el estado real, el alta recrea el OR) — documentado.

**Runtime-verification (DET-36):** `smoke-not-reproducible`. S14 toca UI + write/delete paths; render + persistencia real → S13.T3 (smoke integral en UPU, coordinación dev). Incluye: añadir a vía existente/nueva del seed EST200, borrar hasta vaciar grupos (cascade), editar exigencia, expandir/contraer, texto de la regla, iconografía.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`), working tree limpio. 3 commits: `b704221` feat · `dd7ee52` test · `b50a067` chore(i18n). Solo `modsComponents/` + `lang/` del mod (RULE-013 mod-only). Push diferido a humano.

#### Estado de cierre

S14 (iteración post-render) completa y verde. El ticket sigue **listo para cerrar** pero NO se cierra: el smoke runtime (S13.T3), el push (11 commits del mod S11-S14 + records DKC) y el close explícito siguen siendo frontera de dev. **standby** a la espera de coordinar el stack para el smoke.

**Gate decision:** (approvedBy: autopilot)

- [ ] continue → Session 15
- [ ] iterate → re-trabajar Session 14
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → S14 (iteracion post-render) verde: alta robusta vias anidadas + cascade borrado + iconografia/badges + texto de regla + edit acotado + Ver 2-col + click-fila/expandir-todo. 1411/1411; quality review approved (0 HIGH/MEDIUM, 2 LOW corregidas, 2 documentadas). Ticket listo para cerrar; standby a la espera del dev para smoke runtime UPU + push (11 commits mod) + close explicito.

### Session 15 — 2026-07-29 — Validación anti-vacuo de campos numéricos + smoke UPU [phase: execute]

**Tipo**: normal
**Validation tier**: T2

**Objetivo**: Feedback del dev tras smoke: los campos numéricos del modal de alta permitían 0, y 0 hace el requisito vacuo (se cumple siempre). Endurecer los pisos: créditos / K (minToSatisfy) / valor de métrica → mínimo 1; nota mínima → mayor que 0 (permite decimales; la escala real es configurable más adelante, sin máximo). Guarda en dos capas (object def + guarda de UI mod-side) y smoke runtime real en UPU.

**Tasks completadas**:
- [x] S15.T1 — Object defs: `minToSatisfy` + `creditsRequired` (rt__Group) y `value` (rt__MetricThreshold) → `minimum: 1`; `thresholdMinGrade` (rt__RecordState) documentado (>0 en UI, backend bloquea negativos). codegen + sync.
- [x] S15.T2 — Guarda de UI mod-side: `RequirementFieldSpec.min`/`exclusiveMin` + guarda en `submitAdd` + i18n `minValue`/`exclusiveMinValue` (es/en/pt).
- [x] S15.T3 — Tests + regresión (1432/1432) + tsc 79 baseline.
- [x] S15.T4 — Smoke runtime UPU (DET-36): nota=0 bloquea, nota=4 pasa, valor de métrica=0 bloquea.
- [x] S15.GATE — Gate de sync S15 (T2): persistir, self-report (DET-33), runtime (DET-36), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S15.T1 | `rt__Group__requirement.json` (`minToSatisfy`, `creditsRequired`) y `rt__MetricThreshold__requirement.json` (`value`): `minimum` 0→1. `rt__RecordState__requirement.json` (`thresholdMinGrade`): descripción documenta ">0 en UI, backend solo bloquea negativos (validador core sin `exclusiveMinimum`)". codegen + sync corridos (2 pasadas). El path RT de `createInstance` valida `minimum` vía `validateBaseFieldFormats` (verificado en `instance.resolver.js:3234`) → créditos/K/valor quedan protegidos también server-side | 73ed951 |
| S15.T2 | `requirementFamilies.logic.ts`: `RequirementFieldSpec.min`+`exclusiveMin`; `minToSatisfy`/`value` → `min:1`; `thresholdMinGrade` → `exclusiveMin:0`. `RequirementEditorElement.vue submitAdd`: guarda numérica (rechaza `<min` y `<=exclusiveMin`) tras `validateComplete`. i18n `minValue`/`exclusiveMinValue` es/en/pt | 73ed951 / 29daa16 |
| S15.T3 | `vitest run` **1432/1432** (81 files); nueva aserción de `min`/`exclusiveMin` en `requirementFamilies.logic.spec.ts`. tsc 79 baseline (0 en archivos del ticket) | 73ed951 / 29daa16 |
| S15.T4 | Smoke real en UPU (suite :3000, OM :4000, Consultor, Activity FIS103 en `default_Activity_edit`): (1) Curso nota=0 → "Nota mínima debe ser mayor que 0.", no persiste; (2) nota=4 → pasa guarda UI, backend responde `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` (guard de plan activo, correcto); (3) Métrica valor=0 → "Valor debe ser mayor o igual a 1."; (4) Operador vacío → "Faltan campos obligatorios" (completitud corre primero). Learn L12 | evidencia navegador |

**Validación del tier (T2):** `vitest run` VERDE **1432/1432** (81 files), +1 sobre S14 (1431→1432, aserción de `min`/`exclusiveMin`). tsc 79 baseline (0 en archivos del ticket).

**Self-report-verification (DET-33):** `verified`. Re-corridos por mí (no self-report de agente): object defs con `minimum:1` confirmados por Read; `vitest` 1432 re-ejecutado; guarda + i18n confirmadas en el código servido a suite (`layout/src/modsComponents/` + `suite/locales-dist/`) tras sync; smoke ejecutado en navegador (evidencia real, no test file).

**Runtime-verification (DET-36):** `smoke-executed`. Evidencia runtime real en UPU (ver S15.T4 + L12): mensajes de error renderizados en el modal para nota=0 y valor=0, y caso válido (nota=4) atravesando la guarda hasta el backend. Cierra el smoke diferido de esta superficie numérica.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`): `73ed951` feat (min 1 créditos/K/valor) · `29daa16` feat (nota >0). Solo `objects/` + `modsComponents/` + `lang/` del mod (RULE-dev-004 mod-only). Push diferido a humano. Follow-up local §7 (extender validador core para `exclusiveMinimum`) documentado en `uplanner/specs/up1/sp7/UPONE-1378-out-of-scope-followups.md`.

#### Estado de cierre

S15 verde y con smoke runtime real (cierra la deuda de DET-36 en la superficie numérica). El ticket sigue **listo para cerrar** pero NO se cierra: push (13 commits del mod S11-S15 + records DKC) y close explícito siguen siendo frontera de dev. Pendiente además: revisión del OR con vía única (punto en discusión) + sesión de paridad con Elric (requisitos completos). **standby**.

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 16
- [ ] iterate → re-trabajar Session 15
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

### Session 16 — 2026-07-29 — Ocultar el nivel OR con vía única (solo render) [phase: execute]

**Tipo**: normal
**Validation tier**: T2

**Objetivo**: Feedback del dev: con una sola vía el árbol muestra un OR ("Cualquiera de las vías" / badge "O") como nivel superior, redundante sin alternativas. Que el OR se vea solo con 2+ vías. Decisión (AskUserQuestion 2026-07-29): opción A (solo render) sobre opción B (cambiar modelo de datos). Solo presentación: los datos conservan el Group(OR) para que "+ Nueva vía" lo reuse.

**Tasks completadas**:
- [x] S16.T1 — `collapseSingleVia` (requirementEditor.logic): reemplaza el `Group(OR)` contenedor por su único hijo cuando tiene 1 vía; no-op con 0 o 2+; preserva ids (acciones por id siguen resolviendo). `visibleTree` = `collapseSingleVia(filteredTree)`; `viaIndexById` null con ≤1 vía (sin "Vía N").
- [x] S16.T2 — Tests + regresión (1436/1436) + tsc 79 baseline + sync.
- [x] S16.T3 — Smoke runtime UPU (DET-36): 1 vía → sin OR; 2 vías → OR visible; reaparece al agregar 2da vía.
- [x] S16.GATE — Gate de sync S16 (T2): persistir, self-report (DET-33), runtime (DET-36), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S16.T1 | `collapseSingleVia(roots)`: `findViaContainer` + si el OR tiene exactamente 1 hijo lo reemplaza por ese hijo (recursivo, preserva hermanos globales y node ids). `RequirementEditorElement`: `filteredTree` (filtro búsqueda) → `visibleTree`=`collapseSingleVia(filteredTree)`; `viaIndexById` = `deriveVias(filteredTree).length>1 ? map : null`. El grupo-vía guarda label "Todos de la vía" → con 1 vía se muestra bajo "Y · todas" sin "Vía 1" | 2d50184 |
| S16.T2 | `vitest run` **1436/1436** (81 files), +4 `collapseSingleVia` (1 hijo colapsa, 2+ intacto, OR anidado colapsa preservando global, sin OR intacto). tsc 79 baseline. sync OK (layout+suite) | 2d50184 |
| S16.T3 | Smoke real UPU (Consultor): (1) QUI104 con 1 requisito de Curso → header "1 condición — 1 vía", tope "Y · Todos de la vía" → Cálculo I (badges "Aprobado · Antes" + "Obligatorio"), **sin nivel OR**; (2) MAT101 (2 vías) → OR "Vía de ingreso" (badge "O") visible bajo el AND raíz + globales; (3) borrado en cascada del requisito de prueba (QUI104 vuelve a "Sin requisitos"). Datos de prueba limpiados | evidencia navegador |

**Validación del tier (T2):** `vitest run` VERDE **1436/1436** (81 files), +4 sobre S15. tsc 79 baseline (0 en archivos del ticket).

**Self-report-verification (DET-33):** `verified`. `collapseSingleVia` re-corrida en unit (4 casos) + smoke en navegador con datos reales (crear/ver/borrar en UPU). Wiring confirmado: MAT101 (2 vías) sigue mostrando el OR; QUI104 (1 vía) lo oculta.

**Runtime-verification (DET-36):** `smoke-executed`. Evidencia runtime real (ver S16.T3): render con/sin OR según cantidad de vías, badges, borrado en cascada.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`): `2d50184` feat. Solo `modsComponents/` del mod (RULE-dev-004). Push diferido a humano.

#### Estado de cierre

S16 verde con smoke real. Pendiente: **Session 17 = paridad Elric** (up1-mcp: ergonomía de vías + nota>0 vía follow-up §7 backend), push (14 commits mod S11-S16 + records DKC) y close explícito (frontera de dev). **standby**.

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 17
- [ ] iterate → re-trabajar Session 16
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

### Session 17 — 2026-07-29 — Fix: vía/pool vacío huérfano (render + limpieza de dato) [phase: execute]

**Tipo**: fix
**Validation tier**: T2

**Objetivo**: Feedback del dev: en TIR101 apareció una "Vía 2" vacía dentro del OR. Diagnóstico: un `Group(AND)` de vía sin hojas, huérfano de un alta/borrado no atómico. No es solo cosmético: `evaluateGroup` trata un grupo sin hijos normativos como satisfecho vacuamente → una vía AND vacía dentro del OR vuelve el OR siempre-satisfecho → **anula el requisito** (REQ-14). Fix mod-only: ocultar del render + limpiar el dato. Prevención (atomicidad) diferida a follow-up sp7 §8 por riesgo de reparent-cascade / timing.

**Tasks completadas**:
- [x] S17.T1 — `pruneEmptyGroups` (requirementEditor.logic): descarta del render los `Group` sin hojas descendientes (recursivo); wired antes de `collapseSingleVia` + numeración de vías (contigua, sin contar vacías).
- [x] S17.T2 — Limpieza del dato: borrado directo del `Group(AND)` vacío huérfano en TIR101 (UPU).
- [x] S17.T3 — Tests + regresión (1439/1439) + tsc 79 baseline + sync.
- [x] S17.T4 — Smoke runtime UPU (DET-36): TIR101 ahora muestra 2 vías (vacía oculta); BD sin grupos vacíos.
- [x] S17.T5 — Follow-up sp7 §8 (prevención atomicidad, mod-only, con riesgos documentados).
- [x] S17.GATE — Gate de sync S17 (T2): persistir, self-report (DET-33), runtime (DET-36), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S17.T1 | `pruneEmptyGroups(roots)`: reduce recursivo que descarta Group sin hoja descendiente (preserva hojas sueltas globales). `RequirementEditorElement`: `displayBase = pruneEmptyGroups(filteredTree)` → `visibleTree = collapseSingleVia(displayBase)`; `viaIndexById` desde `deriveVias(displayBase)` (numeración contigua). `buildRuleText` ya omitía grupos vacíos (kids.length===0 → '') | cef0e07 |
| S17.T2 | Borrado directo del huérfano `cms6a7o6z0001xxukuahyj7n2` (Group AND, 0 hijos) en `requirement` + `rt__Group__requirement` de UPU. Re-query: TIR101 = OR → [AND(MAT101,ALG102), AND(SVC-DES)], 0 grupos vacíos | (DB one-off) |
| S17.T3 | `vitest run` **1439/1439** (81 files), +3 `pruneEmptyGroups` (descarta vía vacía en OR, recursivo, preserva globales/limpio). tsc 79 baseline. sync OK | cef0e07 |
| S17.T4 | Smoke real UPU (TIR101, modo ver): header "3 condición — 2 vía(s)", árbol OR → Vía 1 (MAT101+ALG102) + Vía 2 (SVC-DES, renumerada), **sin vía vacía**; texto de regla sin la rama vacía. BD verificada limpia | evidencia navegador |
| S17.T5 | sp7 §8: causa (alta/borrado no atómico), impacto en evaluador, mitigación S17 (render+limpieza), prevención pendiente con riesgos (reparent-cascade, timing de refetch) | sp7 §8 |

**Validación del tier (T2):** `vitest run` VERDE **1439/1439** (81 files), +3 sobre S16. tsc 79 baseline (0 en archivos del ticket).

**Self-report-verification (DET-33):** `verified`. `pruneEmptyGroups` re-corrida en unit (3 casos) + smoke real: TIR101 antes mostraba "Vía 2" vacía, ahora no; BD re-consultada sin grupos vacíos (0). Limpieza confirmada por re-query.

**Runtime-verification (DET-36):** `smoke-executed`. Evidencia real (S17.T4): render de TIR101 sin la vía vacía + BD limpia verificada.

**Commit DET-27:** repo `mods/curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`): `cef0e07` fix. Solo `modsComponents/` del mod (RULE-dev-004). El borrado del huérfano en BD fue one-off (dato corrupto en UPU, no versionado). Push diferido a humano.

#### Estado de cierre

S17 verde. Bug de vía vacía: oculto en UI + dato limpiado + prevención documentada (sp7 §8). Pendiente: **Session 18 = paridad Elric** (up1-mcp, mod-only, sin core; nota>0 pre-validada en Elric por decisión del dev), push (15 commits mod S11-S17 + records DKC) y close explícito. **standby**.

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 18
- [ ] iterate → re-trabajar Session 17
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

### Session 18 — 2026-07-29 — Paridad Elric: vías + cascada + validación numérica [phase: execute]

**Tipo**: implement
**Validation tier**: T2

**Objetivo**: Que Elric (`cd_manage_requirement`, up1-mcp) maneje requisitos igual que la UI. Directiva del dev: SOLO Elric + mod, sin tocar core; lo que necesite core se registra en sp7. Portar los algoritmos ya probados del mod (dependency-injected) a up1-mcp: ergonomía de vías (OR/AND automático), cascada de borrado que limpia grupos vacíos, y pre-validación numérica (nota>0, créditos/K/valor ≥1). Nota>0 se pre-valida en Elric (no core).

**Tasks completadas**:
- [ ] S18.T1 — Módulo `requirement-tree-ops.ts` (lógica pura portada del mod): `buildParentedTree`, `findViaContainer`, `resolveViaTargetGroup` (ensure OR + createVia + reparent), `computeDeleteCascade`. Unit tests.
- [ ] S18.T2 — `cd_manage_requirement create`: param `via` ("new"|id) → orquesta OR/AND y cuelga la hoja en la vía; reusa el árbol vía api.list.
- [ ] S18.T3 — `cd_manage_requirement delete`: cascada que borra el nodo + grupos ancestros vacíos (bottom-up), como la UI.
- [x] S18.T4 — Pre-validación numérica en create/update: nota>0 (exclusiva), minToSatisfy/value/creditsRequired ≥1. Mensajes claros.
- [x] S18.T5 — Tests + build (tsc) verdes.
- [x] S18.GATE — Gate de sync S18 (T2): persistir, self-report (DET-33), decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S18.T1 | `up1-mcp/src/mods/curriculum-design/requirement-tree-ops.ts`: `buildParentedTree`, `findViaContainer` (BFS, OR raíz o anidado), `resolveViaTargetGroup` (NEW_VIA → ensure OR + createVia; vía Group → append; hoja suelta → wrap+reparent; stale → nueva), `computeDeleteCascade` (bottom-up, grupos ancestros vacíos), `validateNumericFloors`. Todo dependency-injected (createGroupFn/reparentFn), portado del mod ya probado | d644f97 |
| S18.T2 | `cd_manage_requirement create`: param `via` ('new'\|id). Con `via`: `fetchFlatItems` (base + rt__Group para combinator) → `buildParentedTree` → `resolveViaTargetGroup` (createGroup/reparent envuelven api.create/api.update) → la hoja cuelga en el grupo de la vía. Precede a `parent`. Preview describe la vía sin mutar | d644f97 |
| S18.T3 | `cd_manage_requirement delete`: resuelve owner del nodo (`api.get`) → `fetchFlatItems` → `computeDeleteCascade` → borra nodo + ancestros vacíos bottom-up. Reporta `cascade`. El guard de plan Active aborta en el 1er borrado si bloquea | d644f97 |
| S18.T4 | `validateNumericFloors` en create y update (tras enums): nota>0 (permite decimales), minToSatisfy/value/creditsRequired ≥1. nota>0 se valida client-side en Elric (decisión dev: no core; ver sp7 §7) | d644f97 |
| S18.T5 | `up1-mcp`: `npx tsc` limpio; `vitest run` **170/170** (17 files), +16 en `requirement-tree-ops.test.ts` (findViaContainer raíz/anidado/none, resolveViaTargetGroup 5 casos, computeDeleteCascade 3, validateNumericFloors 5) | d644f97 |

**Validación del tier (T2):** `npx tsc` sin errores; `vitest run` VERDE **170/170** (17 files) en up1-mcp, +16 sobre baseline. Lógica pura portada del mod (ya probada) con mocks inyectados.

**Self-report-verification (DET-33):** `verified`. Módulo re-corrido en unit (16 casos cubren OR raíz/anidado, reuso vs creación de OR, reparent, append, wrap de hoja suelta, cascada con/ sin hermano, colapso a OR, pisos numéricos). tsc limpio confirma el wiring de tipos en la tool. Los writes reusan `api.create/update/delete` (mismos que el resto de Elric).

**Runtime-verification (DET-36):** `smoke-not-reproducible`. Elric corre como server MCP empaquetado; el server conectado en esta sesión puede ejecutar el build previo, así que un smoke vía `mcp__up1-mcp__cd_manage_requirement` no ejercería `dist/` recién compilado. El smoke real requiere rebuild+restart del server MCP (coordinación dev), análogo al restart de OM. La lógica queda cubierta por los 16 unit + tsc.

**Commit DET-27:** repo `up1-mcp` (rama `feat/UPONE-1378-requirement-write-actions`): `d644f97` feat. Solo `src/mods/curriculum-design/` + `test/`. Push diferido a humano.

#### Estado de cierre

S18 verde: paridad Elric core (vías + cascada + pisos numéricos). **Pendientes opcionales de conveniencia** (Elric ya puede hacerlos manualmente): helper one-shot de Electivo K-de-N (hoy se arma con Group OR + minToSatisfy + RecordStates a mano) y param amigable de Condición (Aprobar/Cursar → mustBe+timing; hoy se pasan explícitos). Registrar como follow-up si se quieren. Además: smoke Elric (rebuild+restart del server MCP), push (repos mod + up1-mcp + records DKC) y close explícito. **standby**.

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 19
- [ ] iterate → re-trabajar Session 18
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

### Session 19 — 2026-07-29 — Auditoría pre-cierre: huérfanos, keys DKC, tests [phase: execute]

**Tipo**: fix
**Validation tier**: T2

**Objetivo**: Revisión pre-push/close pedida por el dev ("mucho trabajo y re-trabajo; ¿nada huérfano? ¿keys de dkc? ¿tests OK?"). Auditar y corregir: datos huérfanos, código/i18n muerto, keys DKC en el código, y el seed (que no deje huérfanos).

**Tasks completadas**:
- [x] S19.T1 — Auditoría de huérfanos: BD (grupos vacíos), código muerto, i18n muerta, archivos scratch, records DKC en repos up1.
- [x] S19.T2 — Fix seed: el bloque electivo creaba `Group(OR,K=4)` SIN cursos → pool vacío huérfano. Ahora crea N hojas (Activities reales, N≥K). + fix log engañoso "Requirement skipped".
- [x] S19.T3 — Limpieza de dato: borrado de 2 pools electivos vacíos (seed viejo); re-seed → 7 electivos con 6 cursos c/u, 0 vacíos.
- [x] S19.T4 — Barrido de keys DKC: refs de sesión (SNN) → UPONE-1378 en archivos de requisitos (71 refs) + mis refs S15-S18 en up1-mcp. REQ/CAP/BL/MC conservados (trazabilidad, decisión dev).
- [x] S19.T5 — Tests + tsc verdes (mod 1439, up1-mcp 170).
- [x] S19.GATE — Gate S19 (T2): persistir, self-report, decidir.

**Log de ejecución:**

| Task | Evidencia | Commit |
|------|-----------|--------|
| S19.T1 | BD: 0 grupos vacíos tras limpieza. Sin código muerto (`pruneEmptyGroups`/`collapseSingleVia` usados). i18n keys usadas + paridad es/en/pt de las nuevas. Sin archivos scratch. **Ningún record DKC (index.db/TICKET-*.md) dentro de los repos up1** (viven en deckard/). Drift `updatedById Int/String`×65 + "Mod object not in OM" = preexistente (mod==OM idénticos; minimum:1 confirmado en ambos) | (audit) |
| S19.T2 | `seed/_data-requirement.js`: pool electivo ahora con N hojas RecordState (Activities Course reales, take:6, K=min(4,N)); skip si <2 cursos. `seed/seed.js`: `if (requirement.skipped)` → `=== true` (skipped es array de sub-skips en éxito) | 57a1470 |
| S19.T3 | Borrado directo de 2 pools vacíos (do53zj, m2tk1c) + re-sync → seed recrea 7 electivos con 6 cursos (K=4). Verificado: 0 grupos vacíos en toda la BD UPU | 57a1470 |
| S19.T4 | 71 refs de sesión (S14×18, S12×10, S11.T2×5…) → UPONE-1378 en RequirementEditor + ReglaUnificadaView (comentarios + nombres de test). up1-mcp: S15/S18/sp7 → UPONE-1378. Excluido CurriculumMesh (sus S3 son de la malla, otro contexto) | 4af2d75 / 76d0d09 |
| S19.T5 | mod `vitest` **1439/1439** + tsc 79 baseline; up1-mcp **170/170** + tsc limpio | 4af2d75 |

**Validación del tier (T2):** mod 1439/1439, up1-mcp 170/170, tsc baseline en ambos. Cambios de comentarios/strings/seed sin cambio de comportamiento (salvo el seed, validado en BD).

**Self-report-verification (DET-33):** `verified`. BD re-consultada (0 grupos vacíos; 7 electivos con 6 cursos). minimum:1 confirmado en mod Y OM (diff idénticos). Barrido verificado (0 SNN restantes). Tests re-corridos.

**Runtime-verification (DET-36):** `smoke-executed` (parcial). Seed re-ejecutado vía sync con verificación en BD (electivos con cursos, sin vacíos). El render de TIR101 sin vía vacía ya se verificó en S17.

**Commit DET-27:** mod `curriculum-design`: `57a1470` (seed+log+refs), `4af2d75` (barrido SNN). up1-mcp: `76d0d09` (refs). Push diferido a humano.

#### Estado de cierre

Auditoría pre-cierre completa: sin huérfanos (BD limpia + seed corregido en la fuente), sin keys DKC de sesión en el código de requisitos (REQ/CAP conservados por decisión dev), sin records DKC en repos, tests verdes. Pendiente (frontera dev): push (mod + up1-mcp + records DKC), smoke Elric (rebuild+restart MCP), close explícito. **standby**.

**Gate decision:** (approvedBy: dev)

- [ ] continue → Session 20
- [ ] iterate → re-trabajar Session 19
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → pausar ticket

## Cierre (2026-07-29)

Ticket cerrado por el dev (OK explícito). Condiciones al cierre:
- **teach-close**: generado y validado (`teach-close.html` v2, `dkc-validate Teach` valid, 0 errors). DET-22 cumplida.
- **Backlog BL-1** (must): done (RT_PATTERN = `(curricularsection|requirement)`, UPDATE de rt__*__requirement verificado). DET-17 no bloquea.
- **Push**: mod `curriculum-design` (rama `feat/UPONE-1378-activity-requirements-section`) **pusheado** a Bitbucket. **up1-mcp**: sin remoto configurado → trabajo commiteado LOCAL, **pendiente de push** (decisión del dev: cerrar con lo local, riesgo aceptado y anotado).
- **Smoke E2E** (UPU): flujo de requisitos + detección en la malla (prereq, correquisito, K-de-N + créditos) verificados. Guía de replicación en `sp7/UPONE-1378-smoke-test-replication.md`.
- **Jira UPONE-1378**: NO tocado (queda en "Developing" del lado Jira; el cierre es del ticket DKC). Mover el estado en Jira queda a criterio del dev.
- Follow-ups vivos: sp7 §7 (backend exclusiveMinimum), §8 (atomicidad completa del alta), granularidad del mensaje de bloqueo. RULES 033/034 + learns L11-L15 registrados.
