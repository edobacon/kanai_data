---
id: DOC-kb-sp5-SP5-historias-usuario
project: up1
type: doc
---

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
- [ ] Documentar (no implem
