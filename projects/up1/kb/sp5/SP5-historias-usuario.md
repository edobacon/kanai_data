# SP5 — Historias de usuario (malla curricular · mod `curriculum-design`)

> **Rol:** Product Owner → backlog listo para crear tickets en Jira.
> **Granularidad:** tickets **consolidados** por entregable coherente (no atómicos). Cada ticket agrupa varias capacidades relacionadas y las detalla en sus criterios de aceptación, para que un dev tome el ticket completo y entregue una unidad con sentido.
> **Fuentes de detalle:** `SP5-plan-malla-curricular.md`, `decisiones-reunion_2026-06-23.md`, `deltas-transcript-vs-mockup.md`, `auditoria-viabilidad_2026-06-23.md`. **Diferidos:** `SP6-backlog-diferidos.md`.
> 🧭 ¿Términos poco claros (planEntry, requirement, MCP, MC-0X…)? Ver el **[glosario del README](README.md#-glosario-códigos-y-jerga-que-aparecen-en-los-docs)** y la visión general del sprint.
> **Fecha:** 2026-06-23.

---

## 0. Convenciones del sprint

### Objetivo del sprint (Sprint Goal)
> Habilitar el **diseño de la malla curricular de un plan secuencial**: ver la malla por períodos, agregar asignaturas obligatorias y electivas del catálogo, editarlas, filtrar por línea de formación y bloque electivo, y gestionar las líneas de formación — con los 3 objetos nuevos operables vía API y MCP.

### Escala de Story Points
Fibonacci (1, 2, 3, 5, 8, 13). 1 SP ≈ media jornada de un dev con contexto del mod. **Las estimaciones ya incluyen el testing** (no es SP aparte).

### Tiers (MoSCoW dentro de SP5)
- **🅼 Must** — compromiso firme del sprint.
- **🆂 Should** — objetivo del demo (entra salvo imprevisto).
- **🅲 Could** — solo si sobra velocity.
> Algunos tickets consolidados mezclan tiers (un core Must + una capacidad Should/Could). En esos casos, el ticket marca **qué criterios son committed y cuáles stretch**.

### Repos y frontera de scope
- **Mod** `up1/mods/curriculum-design` — default de casi todo.
- **Core** `up1/object-manager` — **solo** versionado/clonado (SP6). Cualquier otra necesidad de core = escalar.
- **MCP** `uplanner/mcp` — cobertura MCP (contratos).
- **Commits/branches/PR:** id externo `UPONE-####` (DET-19). Rama de épica, nunca `main`/`develop`.

### Definition of Done (DoD) — aplica a TODOS los tickets
- [ ] Código sigue los patrones del mod (`CurricularSection`/`CompositeSectionTree`/resolvers existentes).
- [ ] **Tests** según tipo (ver cada ticket); assertions con valores concretos (no solo "no explota").
- [ ] **Lint + Prettier + tsc** limpios, **incluyendo** test y stories.
- [ ] **Lang ES** completo para todo string/label nuevo.
- [ ] **No se commitean artefactos** generados por sync/seed (Base, schema, typeDefs, modsComponents sincronizados).
- [ ] Objetos nuevos quedan **MCP-ready** (enums + FK `references` + labels); su contrato MCP entra en MC-04.
- [ ] Quality review pasada; smoke en UPU donde aplique.

### Testing por tipo de tarea
- **BE objeto/resolver:** unit en `mods/.../tests/unit/*.test.js` (patrón `curriculumCreate.test.js`).
- **BE core:** unit + e2e (`object-manager/tests/e2e/`).
- **FE componente:** extraer lógica pura a `.ts` + `.spec.ts` (patrón `treeOps.ts`/`validateWeightedSum.spec.ts`) + stories.
- **MCP:** tests del contrato/tool.

---

## Tickets SP5 (consolidados)

> 9 tickets. Mapeo a las historias originales (`MC-*` del handoff) indicado en cada uno.

---

### UPONE-1344 · MC-01 — Ajustes de modelo base del plan
**Épica:** Track 0 · **Tier:** 🅼 Must · **SP:** 2 · **Repo:** mod · **Agrupa:** BE-0, BE-1

**Historia**
> Como **diseñador curricular**, quiero que el plan declare su tipo de progresión y que las asignaturas marquen su versión vigente, para que el sistema interprete bien la malla y el catálogo muestre los cursos correctos.

**Criterios de aceptación**
- [ ] `rt__Plan__curriculum.progression` = enum cerrado `["Sequential","Modular"]`, default `Sequential`, sin `NEEDS CLARIFICATION`; labels i18n; sync limpio (planes existentes → `Sequential`).
- [ ] `Activity.isCurrent` = boolean, default `true`, not_null; label "Vigente"; visible/filtrable en RecordList de Activity; **sin lógica de versionado** (solo flag).
- [ ] Reporte de impacto colateral de `progression` (consumidores) sin regresiones.

**Detalle técnico.** Dos campos aditivos en JSON del mod. `isCurrent` lo consumirá el picker (MC-06). Lógica automática de vigencia → SP6.

**Testing.** Unit: enum rechaza valor inválido + default; seed pobla `isCurrent`; filtro del RecordList discrimina.

**Dependencias.** Ninguna (arranca primero).

---

### UPONE-1345 · MC-02 — Objetos `planEntry` + `requirementCategory`
**Épica:** A · **Tier:** 🅼 Must · **SP:** 5 · **Repo:** mod · **Agrupa:** A1, A2

**Historia**
> Como **diseñador curricular**, quiero colocar asignaturas en períodos del plan y organizarlas en líneas de formación, para construir la malla y agrupar sus créditos.

**Criterios de aceptación — `planEntry` (solo secuencial)**
- [ ] Campos: `planId`(FK), `activityId`(FK), `categoryId?`(FK), `blockId?`(FK→requirement Group), `kind` enum {Course, Internship, Thesis}, `period`(int, **requerido**), `position`(int), `credits?`, `sourceEntryId?`(self FK), timestamps. Índices `planId`/`categoryId`/`blockId`/`(planId,period,position)`.
- [ ] `credits` efectivo = `planEntry.credits ?? Activity.credits` (verificado con dato).
- [ ] **Electividad derivada de `blockId`** (sin flag).
- [ ] CRUD vía API + layouts + lang + seed.

**Criterios de aceptación — `requirementCategory`**
- [ ] Campos: `curriculumId`(FK), `name`, `code?`, `minCredits`, `maxCredits?`, `position`, `description?`, `color?`, `icon?`, timestamps.
- [ ] Validación `minCredits ≤ maxCredits` (test que falle cuando no se cumple).
- [ ] **No eliminable** con `planEntry` asignados ("reasigna primero").
- [ ] "Créditos actuales" = suma de `credits` efectivos de sus entries — consultable.

**Detalle técnico.** Patrón copiable de `CurricularSection`. Guard de borrado en el resolver de delete. **`color` (token tema up1 o hex) + `icon` (bootstrap-icons `bi-*`)** — modelar ambos, valores de la maqueta (§dec-1). Seed de categorías de ejemplo de la maqueta (Núcleo, Habilidades Profesionales, Electivos de Profundización, Proyecto de Grado). `kind` enum {Course, Internship, Thesis} — discriminador, no recordType; UI crea solo `Course` (§dec-2). **Modular (`period` nullable + DAG) → SP6.**

**Testing.** Unit: FK válidas/inválidas, `period` requerido, `credits` efectivo, electividad derivada; validación min/max y guard de borrado.

**Dependencias.** MC-01 (progression).

---

### UPONE-1346 · MC-03 — Objeto `requirement` (Composite, 3 RT) + bloque electivo
**Épica:** A · **Tier:** 🅼 Must (bloque electivo 🆂 Should) · **SP:** 7 · **Repo:** mod · **Agrupa:** A3, A4

**Historia**
> Como **diseñador curricular**, quiero expresar prerrequisitos, electivos y umbrales como un árbol de reglas, y representar bloques electivos sobre el plan, para modelar las condiciones de la malla.

**Criterios de aceptación — `requirement` (base + 3 RT)**
- [ ] Base: `ownerType` {curriculum, activity, offering}, `ownerId`(FK polimórfica), `parentId?`(self FK), `recordType` {Group, RecordState, MetricThreshold}, `effect` {EligibilityToEnroll, ProgressGate, Completion, DiplomaAward}, `label`(**requerido**), `isHardRule`(def true), `negate`(def false), `overrideMode?`(solo offering), `position`, timestamps.
- [ ] `rt__RecordState__requirement`: `targetType`{activity}, `targetId`, `mustBe`{Approved,Taken}, `threshold{minGrade}?`, `timing`{Before,Concurrent,Either}?.
- [ ] `rt__Group__requirement`: `combinator`{AND,OR}, `minToSatisfy?`, `creditsRequired?`.
- [ ] `rt__MetricThreshold__requirement`: `metric`{Credits}, `scope`{plan,category}?, `scopeId?`, `operator`{>=,>,=,<,<=}, `value`.
- [ ] Enums cerrados; `RecordState.targetType` solo `activity`; `MetricThreshold.metric` solo `Credits`.
- [ ] Persiste/reconstruye el árbol; seed = ejemplo EST200 (plan §2.5).
- [ ] Layouts por RecordType **copiando el patrón de `CurricularSection`** (`resolveDefaultLayout` resuelve por convención — ver auditoría H-4).
- [ ] Documentar (no implementar) extensibilidad de `recordType` (AttributeMatch, etc. → SP6).

**Criterios de aceptación — bloque electivo (🆂 Should)**
- [ ] `requirement(Group, ownerType=curriculum, OR, minToSatisfy/creditsRequired)` = bloque; nombre = `label`.
- [ ] `planEntry.blockId` materializa la membresía; derivación obligatorio-vs-electivo documentada; seed §2.6.

**Detalle técnico.** FK polimórfica `ownerId` sin `isForeignKey` (convención, validar `ownerType↔ownerId` en app); self-FK `parentId` (patrón `CurricularSection.parentId`). Resolvers persisten/reconstruyen por `parentId`.

**Testing.** Unit: árbol EST200 (persist/reconstruct), enums cerrados, `label` requerido, derivación de electividad del bloque.

**Dependencias.** Ninguna dura para el objeto; el bloque electivo usa `planEntry.blockId` (MC-02).

---

### UPONE-1347 · MC-04 — Registro del mod + cobertura MCP de los objetos
**Épica:** A + F · **Tier:** 🅼 Must · **SP:** 5 · **Repo:** mod + MCP · **Agrupa:** A5, F1

**Historia**
> Como **dev del mod y usuario del MCP**, quiero los 3 objetos registrados y operables tanto en la UI como conversacionalmente, para cerrar el modelado y habilitar el componente y Elric.

**Criterios de aceptación — registro en el mod**
- [ ] `capabilities.json`: CRUD de los 3 objetos + guard de borrado de categoría.
- [ ] Layouts (RecordList/RecordDetail) + `lang/es_CL` completos.
- [ ] Objetos visibles en object-manager y consumibles por el componente (GraphQL del mod) — smoke real.

**Criterios de aceptación — cobertura MCP (contratos, requerido §1.7)**
- [ ] Los 3 objetos en el **allowlist** (`src/mods/index.ts`) y con `ObjectContract` (`src/contracts/registry.ts`).
- [ ] `describe_object`/`get_create_guide` los describen (enums + FKs, auto-derivado); `create_object`/`query_records` operan con validaciones espejo.
- [ ] FK (incl. `ownerId` polimórfico) resueltas por nombre/código (`resolveReference`, patrón `Curriculum`).

**Detalle técnico.** La cobertura MCP es **declarativa y barata** (~40 líneas/contrato). Los `cd_*` de dominio (ergonómicos) NO van aquí → SP6. La malla en la UI consume GraphQL del mod.

**Testing.** Smoke E2E (objetos vía API + object-manager) + tests de contrato MCP (validaciones, resolución FK).

**Dependencias.** MC-02 + MC-03 (objetos existentes).

---

### UPONE-1348 · MC-05 — Malla: ver, modo edición y resumen
**Épica:** B · **Tier:** 🅼 Must · **SP:** 5 · **Repo:** mod (FE) · **Agrupa:** B1, B2, B3

**Historia**
> Como **usuario**, quiero ver la malla del plan por períodos con su resumen, y que la edición se habilite solo cuando corresponde, para entender y operar el plan con seguridad.

**Criterios de aceptación**
```gherkin
GIVEN un Curriculum(Plan) con planEntries
WHEN abro la pestaña "Malla curricular" (modo Ver)
THEN veo las asignaturas en columnas por período, con código, créditos, línea (color) y badge "electivo" (derivado de blockId)
```
- [ ] Accesible desde la **pestaña del RecordDetail** (config del mod) y la **acción del listado** (navega a la pestaña). **Sin** layoutType nuevo en core.
- [ ] **Barra de resumen** (ancho completo, sobre filtros): créditos diseño/requeridos, períodos, asignaturas, carga máx. por período — valores correctos.
- [ ] **Modo edición** gated: acciones de alta/edición visibles solo en edición + `status` editable (Draft); ocultas en solo lectura.

**Detalle técnico.** Componente en `modsComponents/` (patrón `CompositeSectionTree`); carga vía GraphQL del mod. Gotcha: recargar tras primer render del listado.

**Testing.** `.spec.ts`: agrupación por período, derivación badge electivo, cálculos del resumen, función de gating (editable solo Draft+edición). Stories del componente.

**Dependencias.** MC-02 (+ seed).

---

### UPONE-1349 · MC-06 — Malla: agregar y editar asignaturas (obligatorias + electivas)
**Épica:** B · **Tier:** 🅼 Must (electivas 🆂 Should) · **SP:** 8 · **Repo:** mod (FE) · **Agrupa:** B4, B5, B7

**Historia**
> Como **diseñador curricular**, quiero agregar cursos obligatorios y electivos del catálogo y editar los ya colocados, para poblar y ajustar la malla.

**Criterios de aceptación — agregar obligatorias (🅼)**
```gherkin
GIVEN la malla en edición sobre un período
WHEN abro "Agregar asignaturas", Paso 1 elijo "Obligatoria" (+ línea opcional en masa)
AND Paso 2 busco en el catálogo (filtro por departamento) y multiselecciono
THEN se crean planEntry (kind=Course, SIN blockId) con categoryId y créditos heredados
```
- [ ] Picker con filtro por departamento (`executionUnitId`→OrgUnit) + multiselección; **oculta cursos ya colocados** (delta D-2); muestra cursos `isCurrent`.

**Criterios de aceptación — agregar electivas (🆂 Should)**
- [ ] Al elegir "Opcional": **seleccionar bloque existente o crear/nombrar nuevo** (select-suggest); el bloque es **independiente de la línea** (entry puede tener `categoryId` Y `blockId`).
- [ ] Es **tagging, no edición del bloque**; al elegir uno existente, **precarga sus cursos**; `minToSatisfy` se auto-deriva del conteo; input de texto para el `label`.
- [ ] Badge y chip de filtro de electivos se derivan de `blockId`.

**Criterios de aceptación — editar/quitar (🅼)**
- [ ] Modal: créditos override, línea, Rol (Obligatoria/Electiva→bloque), "Quitar de la malla".
- [ ] Rol→Electiva setea `blockId`; →Obligatoria lo limpia; cambiar categoría no afecta electividad.

**Detalle técnico.** Modales caseros (átomo `Modal`, BUG-platform-011). **Select-suggest:** Vueform `SelectElement` `search:true`+`create:true` + opciones remotas vía `useOwnerIdOptions` (ver `deltas-transcript-vs-mockup.md` §3) — REUSAR, no construir; validar render standalone en el modal casero como primer paso.

**Testing.** `.spec.ts`: builder de planEntry (período/categoría/créditos heredados), exclusión de ya-agregados, tagging de bloque + derivación, auto-`minToSatisfy`, transición de rol. Stories de los modales.

**Dependencias.** MC-02 + MC-03 + MC-05.

---

### UPONE-1350 · MC-07 — Pestaña "Líneas de formación" (CRUD + integración)
**Épica:** C · **Tier:** 🅼 Must (borrado/integración 🅲 Could) · **SP:** 5 · **Repo:** mod (FE) · **Agrupa:** C1, C2, C3, C4

**Historia**
> Como **diseñador curricular**, quiero gestionar las líneas de formación del plan, para definir los buckets de crédito que organizan la malla.

**Criterios de aceptación (🅼)**
- [ ] RecordList: línea, código, créditos (actual/mín), obligatorias, electivas; solo lectura fuera de edición.
- [ ] Modal crear/editar: nombre, código, créditos mín/máx, color/ícono → `requirementCategory`; validación `minCredits ≤ maxCredits`.

**Criterios de aceptación (🅲 Could)**
- [ ] Borrado con guard: bloquea si hay `planEntry` asignados ("reasigna primero").
- [ ] Integración: el selector de línea (MC-06) y los chips/colores (MC-08) se nutren de las `requirementCategory` del plan.

**Detalle técnico.** Modal con campos: nombre, código, créditos mín/máx, etiqueta corta, **color + ícono** (picker "Color e ícono" como en la maqueta — color = token tema up1/hex, icon = `bi-*`).

**Testing.** `.spec.ts`: validación min/max FE, guard de borrado. Story del RecordList + modal (con color/ícono).

**Dependencias.** MC-02.

---

### UPONE-1351 · MC-08 — Malla: filtros + interacciones avanzadas
**Épica:** B · **Tier:** 🆂 Should (filtros) + 🅲 Could (bloqueo, drag&drop) · **SP:** 7 · **Repo:** mod (FE) · **Agrupa:** B9, B6, B8

**Historia**
> Como **diseñador curricular**, quiero filtrar la malla y reorganizarla con fluidez, con alertas cuando falten prerrequisitos, para analizar y construir el plan cómodamente.

**Criterios de aceptación — filtros (🆂 Should)**
- [ ] Chips de **líneas de formación** (resaltar/atenuar por `categoryId`) + chips de **bloques electivos** (derivados de `blockId`); limpiar filtro.

**Criterios de aceptación — bloqueo por prereqs (🅲 Could)**
```gherkin
WHEN agrego un curso y un prereq-curso (RecordState Before) no está en período anterior
OR un Group(K-de-N de cursos) tiene miembros ausentes de la malla
THEN se bloquea (modal de faltantes: Cancelar / Volver)
GIVEN el requisito es MetricThreshold(Credits) THEN NO alerta (delta D-3)
```

**Criterios de aceptación — drag&drop (🅲 Could)**
- [ ] Drag&drop entre columnas actualiza `period`/`position` (recalcula hermanos); botón "Agregar período".

**Detalle técnico.** `sortablejs` (ya dependencia). Bloqueo: lee `requirement(owner=activity, EligibilityToEnroll)`; solo cursos y K-de-N alertan, créditos NO. Alerta informativa, no corrección automática.

**Testing.** `.spec.ts`: lógica de filtro, checker de prereqs (4 casos: falta-curso/K-de-N/créditos/completo), recálculo period/position.

**Dependencias.** MC-05 + MC-03 (+ MC-06 para electivos).

---

### UPONE-1352 · MC-09 — Validación restrictiva de requisitos en planes publicados
**Épica:** D · **Tier:** 🅲 Could · **SP:** 3 · **Repo:** mod (BE+FE) · **Agrupa:** D2

**Historia**
> Como **sistema**, quiero impedir editar requisitos de una asignatura que ya está en planes publicados, para no invalidar mallas existentes (obligando a versionar el programa).

**Criterios de aceptación**
```gherkin
GIVEN una Activity en planEntry de un Curriculum(Plan) con status=Active
WHEN se crean/editan sus requirement(owner=activity)
THEN se bloquea (restrictivo) con mensaje que sugiere versionar
GIVEN la Activity solo está en planes Draft
THEN la edición funciona normal
```
- [ ] Test con dato concreto (Active bloquea / Draft permite). FE: modal de alerta de impacto.

**Detalle técnico.** BE: al mutar `requirement(owner=activity)`, verificar `planEntry` con `Curriculum.status=Active`. Análisis de impacto colateral obligatorio. Mod-only.

**Testing.** Unit: bloqueo en publicado / permite en Draft.

**Dependencias.** MC-02 + MC-03.

---

## Resumen de planificación SP5

| Ticket | Tier | SP | Repo |
|---|---|---:|---|
| MC-01 Modelo base | 🅼 | 2 | mod |
| MC-02 planEntry + requirementCategory | 🅼 | 5 | mod |
| MC-03 requirement + bloque electivo | 🅼/🆂 | 7 | mod |
| MC-04 Registro mod + contratos MCP | 🅼 | 5 | mod+MCP |
| MC-05 Malla: ver + edición + resumen | 🅼 | 5 | mod FE |
| MC-06 Malla: agregar/editar asignaturas | 🅼/🆂 | 8 | mod FE |
| MC-07 Líneas de formación | 🅼/🅲 | 5 | mod FE |
| MC-08 Malla: filtros + interacciones | 🆂/🅲 | 7 | mod FE |
| MC-09 Validación restrictiva | 🅲 | 3 | mod |
| **Total SP5** | | **47** | |

**Compromiso (núcleo + cobertura MCP requerida):** MC-01..MC-07 ≈ 37 SP (el demoable: ver/editar malla + obligatorias + electivas + líneas + objetos en MCP). **Colchón/Could:** MC-08 (filtros Should + bloqueo/drag&drop Could) y MC-09 ≈ 10 SP, según velocity.

### Secuencia recomendada
1. **Semana 1 — BE:** MC-01 → MC-02 → MC-03. **FE (paralelo):** MC-07 (líneas) → MC-05 (ver malla).
2. **Semana 2 — BE:** MC-04 (registro + MCP). **FE:** MC-06 (agregar/editar) → MC-08 (filtros).
3. **Could según velocity:** resto de MC-08 (bloqueo, drag&drop), MC-09.

> **Camino crítico:** los objetos (MC-02/03) habilitan todo el FE y MC-04 → priorizar el BE en semana 1.

### Diferidos a SP6
Registrados como backlog en **[`SP6-backlog-diferidos.md`](SP6-backlog-diferidos.md)**: editor de requisitos del curso, versionado/clonado con hijos (carryover SP4, incluye fix de core), `cd_*` de dominio MCP, planEntry modular, lógica de vigencia automática, milestone/specialization, motor de ejecución, RecordTypes futuros.

### Decisiones de producto (RESUELTAS · 2026-06-23)
- **§dec-1 — color/ícono de `requirementCategory`: ✅ Modelar AMBOS, con los valores de la maqueta.** El modal de la maqueta tiene campo "Color e ícono". `color` usa **tokens de tema up1** (`var(--up1-color-primary|info-500|warning-500)`) o hex (ej. `#6b21a8`); `icon` usa **bootstrap-icons** (`bi-*`). Seed de ejemplo (de la maqueta): *Núcleo (Fundamentos y Métodos)* `min:72` color primary · *Habilidades Profesionales* `min:12` color info-500 · *Electivos de Profundización* `min:36` color warning-500 · *Proyecto de Grado* `min:30` color `#6b21a8`. Aplica a MC-02 (modelo) y MC-07 (modal con picker color+ícono).
- **§dec-2 — `kind` de planEntry: ✅ Enum {Course, Internship, Thesis} en el modelo; la UI crea solo `Course` en SP5.** Internship (práctica) y Thesis (tesis/proyecto de título) quedan como valores reservados para flujos futuros; **sin seed especial**. (`kind` es discriminador de presentación, no RecordType.)
- **§dec-3 — Ids Jira: ✅ Asignados (2026-06-25).** Los 9 tickets se crearon como **Historias** bajo la épica **[UPONE-1267 "Curriculum Design \| Plan de estudio"](https://u-planner.atlassian.net/browse/UPONE-1267)** (no se creó épica nueva "Malla curricular"). Mapeo: MC-01→1344, MC-02→1345, MC-03→1346, MC-04→1347, MC-05→1348, MC-06→1349, MC-07→1350, MC-08→1351, MC-09→1352. La etiqueta `**Épica:** A/B/C/D/Track 0` del cuerpo es el *track* interno del plan, **no** la épica Jira (que es única, 1267). Diferencias al portar a Jira (cosméticas, sin pérdida de alcance): se omitieron refs internas `(§dec-1)`/`(§dec-2)` en MC-02, `BUG-platform-011`/`(deltas §3)` en MC-06 y `(delta D-3)` en MC-08. Pendiente: SP en el campo nativo de Jira (hoy solo en el cuerpo).
