---
id: DOC-kb-sp5-SP5-plan-malla-curricular
project: up1
type: doc
---

# SP5 — Plan de sprint: Malla curricular (mod `curriculum-design`)

> **Proyecto:** up1 · **Mod:** `curriculum-design` · **Feature:** Malla curricular (diseño del plan de estudios)
> **Alcance del sprint:** solo **planes secuenciales** (con períodos).
> **Fecha del plan:** 2026-06-23 · **Autor:** Eduardo Bacon
> **Fuentes:** `sources/historias-malla_v1.md` (handoff), `sources/mockup_v10.html` (maqueta funcional), `sources/reunion-inicio-sprint_2026-06-23.pdf` (transcripción) → destilada en `decisiones-reunion_2026-06-23.md`.

> 🧭 **¿Llegaste directo aquí?** Este es el **documento técnico detallado** (referencia para tech lead / dev). Para la **visión general en lenguaje claro** (qué se construye, glosario de términos, guía de lectura), empieza por el **[README](README.md)**. Para crear tickets, usa **[SP5-historias-usuario.md](SP5-historias-usuario.md)**.

---

## 0. Cómo leer este documento

- **§1** resume objetivo, alcance y supuestos.
- **§2** es el **mapa de tracks y dependencias** (qué bloquea a qué).
- **§3** es el **catálogo de tickets** con detalle por ticket: objetivo, qué aborda, alcance (archivos/repos), criterios de aceptación, estimación y dependencias.
- **§4** propone la **distribución en el sprint** y dos escenarios de capacidad.
- **§5** lista **decisiones abiertas** que requieren confirmación antes de codear.
- **§6** registra **riesgos** y **backlog**.

> **Convención de estimación:** Story Points en escala Fibonacci (1, 2, 3, 5, 8, 13). 1 SP ≈ media jornada de un dev con contexto del mod. Las equivalencias en días son orientativas. Se distingue **BE** (backend/modelado — Eduardo) de **FE** (frontend/componente — Esteban) para poder paralelizar.

---

## 1. Objetivo, alcance y supuestos

### 1.1 Objetivo

Implementar la **edición de la malla curricular** de un `Curriculum(recordType=Plan)`: colocar asignaturas en períodos, agruparlas en líneas de formación, definir prerrequisitos/electivos y bloques electivos. El mod ya tiene los objetos base (`AcademicProgram`, `Curriculum`, `Activity`, `CurricularSection`, `Offering`); este sprint agrega los **objetos de estructura de plan** + el **componente de malla** + la **pestaña Líneas de formación**.

### 1.2 En alcance

- **Objetos nuevos:** `planEntry`, `requirementCategory`, `requirement` (Composite; 3 familias/recordTypes: `RecordState`, `Group`, `MetricThreshold`).
- **Componente de malla secuencial:** ver, editar, agregar (obligatorias/electivas), bloqueo por prerrequisitos, filtros, drag&drop.
- **Pestaña Líneas de formación:** CRUD de `requirementCategory`.
- **Cierre del enum `progression`** ({Sequential, Modular}) en `rt__Plan__curriculum`.
- **Validación restrictiva** al editar requisitos de una `Activity` asignada a planes publicados (alerta + obliga versionar).
- **Carryover de SP4 — versionado/clonado del plan con hijos** (Épica E): desbloquear el versionado de `Curriculum` (pendiente de SP4, bloqueado en core) y extender clonado **y** versionado para que copien en profundidad los hijos del plan (`planEntry` + `requirementCategory` + `requirement` owner=curriculum). **Entra ahora porque nace `planEntry`**: sin esto, versionar/clonar un plan produce una versión vacía.

### 1.3 Fuera de alcance (sprints siguientes)

- Planes no-secuenciales/modulares (niveles derivados del DAG de prerrequisitos).
- `milestone`, `specialization`, `planEntrySpecialization` (tributación/menciones).
- Motor de **ejecución** de reglas (degree-audit / evaluación en vivo del avance). Aquí solo se **modela y persiste** `requirement`.
- Lógica completa de versión vigente (`current`) — se registra solo el campo (ver Backlog BL-1).
- RecordTypes futuros de `requirement` (`AttributeMatch`, más targets/métricas).

### 1.4 Estado real del código (verificado)

- `Curriculum.json` ya define `recordType` {Plan, Minor}, extensión `rt__Plan__curriculum.json` y `status` {Draft, Active, Archived}; versionable por `previousVersionId`.
- `rt__Plan__curriculum.json` ya tiene `progression` (hoy **`string` libre con NEEDS CLARIFICATION**), `periodType` {Semester/Trimester/Quarter/Annual}, `totalCredits`, `totalPeriods`.
- El mod usa el patrón de extensión `objects/RecordTypes/rt__<Type>__<object>.json`, `lang/es_CL@<object>.json`, resolvers `logic/<obj>-{create,read,update}.resolver.js` + `.schema.graphql`, `capabilities.json`, `seed/`.
- **Implicación:** los objetos nuevos siguen ese patrón; `requirement` necesita 3 archivos `rt__*__requirement.json`. `progression` solo necesita cerrarse a enum (no crear campo).

**Carryover de SP4 (UPONE-1270 / TICKET-065) — verificado en `../sp4/`:**
- **Clonado** de `Curriculum` + unicidad por linaje: **entregado y verificado E2E**.
- **Versionado** de `Curriculum`: **bloqueado**. El rowAction "Nueva versión" errorea (`INTERNAL_SERVER_ERROR`) porque el helper de core `prepareVersionData` (`object-manager/src/graphql/resolvers/helpers/version-from-source.js`) **asume incondicionalmente workflow** (incluye `currentstatus`/`workflow`), y `Curriculum` no lo tiene (estado por enum simple, igual que `AcademicProgram`). Detalle, alternativas y recomendación en [`../sp4/UPONE-1270-versionado-curriculum-sin-workflow.md`](../sp4/UPONE-1270-versionado-curriculum-sin-workflow.md).
- **Hasta SP4, clonar/versionar copiaba solo el `Curriculum` "pelado"** (no tenía hijos). Con SP5 nacen `planEntry`/`requirementCategory`/`requirement`, así que **ambas operaciones deben copiar los hijos en profundidad** (Épica E). El doc de SP4 ya anticipa esto (§6, "Detalles a verificar" punto 2: la v2 debe arrastrar la extensión RT + atomicidad del split base/RT — TICKET-056).
- **Item de SP4 relacionado — RESUELTO:** el bug de navegación post-guardar en `openMode: route` ([`../sp4/UPONE-1270-navegacion-post-guardar-curriculum-route-mode.md`](../sp4/UPONE-1270-navegacion-post-guardar-curriculum-route-mode.md)) **ya fue corregido**; no entra a SP5. El doc de SP4 queda como histórico.

### 1.5 Supuestos

- Repos: el mod (`up1/mods/curriculum-design`) está en su rama de épica; los artefactos generados por sync (Base, schema prisma, typeDefs) **no se commitean** (ver memoria `feedback_up1_dont_commit_sync_seed_artifacts`).
- El componente de malla se **autora en el mod** (`mods/curriculum-design/modsComponents/`, junto a `CompositeSectionTree`) y sincroniza a `layout/`; consume los objetos vía GraphQL del mod.

### 1.6 Frontera de scope: mod-only, salvo versionado/clonado (core)

> **Regla (2026-06-23):** el trabajo se **ciñe al mod** `curriculum-design` **+ su cobertura en el MCP** (`uplanner/mcp`, política §1.7). La **única excepción autorizada para tocar core** (`object-manager`) es el **versionado/clonado** (Épica E). Cualquier otra necesidad de core es un **bloqueante a escalar**, no a resolver inline.

| Bloque | Repo | ¿Dentro de la regla? |
|---|---|---|
| BE-0, BE-1 (objects/config) | **mod** | ✅ mod-only |
| A1, A2, A3, A4 (objetos, resolvers, seed) | **mod** | ✅ mod-only |
| A5 (capabilities, layouts, lang) | **mod** | ✅ mod-only |
| B1–B9, C1–C4, D1 (componentes + config de tabs) | **mod** (`modsComponents/` + `config/layouts/`) → sync a `layout/` | ✅ mod-only (se autora en el mod) |
| D2, D3 (validación restrictiva + modal) | **mod** (resolver de `requirement` + FE) | ✅ mod-only |
| **E1, E2, E3, E4 (versionado/clonado)** | **core** (`object-manager`) | ✅ **excepción autorizada** |
| **F1 contratos MCP (requerido, ~3 SP)** · F2 `cd_*` (opcional) | **MCP** (`uplanner/mcp`) | ✅ **F1 requerido (§1.7); F2 opcional** |

**Dos puntos a vigilar (donde algo podría escaparse del scope mod+MCP):**
1. **Cobertura MCP (§1.7):** los objetos desarrollados van al MCP en SP5 vía **F1 (contratos, requerido, barato y declarativo)** → operables por tools genéricas. Los `cd_*` ergonómicos (F2) son **opcionales**. Repo separado (`uplanner/mcp`) pero F1 es parte del compromiso del SP. (La malla en la UI consume GraphQL del mod; el MCP es la vía conversacional/programática.)
2. **Entrypoint de la malla (B1):** renderizar como **pestaña del RecordDetail vía config del mod** (`default_Curriculum_view.json` + `associatedLayout`/Vueform element, como `CompositeSectionTree`). La acción del listado **navega a esa pestaña** (config/route del mod). **NO registrar un `layoutType` nuevo en `LayoutOrchestrator` de core** (eso sería tocar core fuera de la excepción).
3. **Modales (B4–B7, D):** usar **modales caseros** (átomo `Modal`), como `CompositeSectionTree` (workaround de BUG-platform-011). **NO** editar el `ModalStackManager` de core.

**Riesgo de frontera — H-4 RESUELTO (ya NO es riesgo):** los layouts por RecordType **ya están en producción en este mismo mod** (19 layouts `default_rt__*__curricularsection_*` committeados; `resolveDefaultLayout` los resuelve por convención `default_{objectName}_{mode}` con el `objectName` = nombre RT completo). El `requirement` con sus 3 RTs sigue el patrón idéntico. **No requiere core, no hay riesgo de frontera.** (Ver auditoría H-4.)

### 1.7 Cobertura MCP — POLÍTICA: lo desarrollado en el SP va al MCP en el mismo SP

> **Política (2026-06-23):** **todo objeto u operación que se desarrolle en un SP debe quedar operable vía el MCP (`uplanner/mcp`) dentro del mismo SP.** No se difiere. → La cobertura MCP de lo construido en SP5 entra en SP5 (**Épica F**). La frontera de scope se amplía a **mod + MCP** (+ core solo para versionado/clonado).
>
> Verificado contra el MCP real:
> - **El MCP no auto-expone:** las tools genéricas (`create_object`/`describe_object`/`get_create_guide`) operan solo sobre objetos en el **allowlist** (`src/mods/index.ts`) **con `ObjectContract`** (`src/contracts/registry.ts`, hoy 11 objetos). → cada objeto nuevo necesita su contrato + allowlist (Épica F).
> - **FK polimórfica NO es blocker:** `requirement.ownerType/ownerId` reusa el patrón ya probado en `Curriculum` (`curriculum-write.ts`): `ownerType` enum + `ownerId` resuelto por nombre/código vía `resolveReference` (`src/core/resolve.ts`).
> - **`get_create_guide`/`describe_object` auto-derivan del contrato** (enums, FKs, readonly) → no hay que escribir recetas a mano.
> - **`cd_*` de dominio** siguen el patrón de `curriculum-write.ts`/`sections-write.ts` (~265 líneas c/u).
>
> **Pre-requisito de diseño en el mod (A1–A5):** declarar enums + FK con `references` + labels i18n, y mantener el árbol `requirement` construible por `parentId`. Esto hace que escribir los contratos/tools del MCP (Épica F) sea directo.

---

## 2. Mapa de tracks y dependencias

```
Track 0 (BE base)            Épica A — Objetos (BE)             Épica B/C — UI (FE)
─────────────────           ──────────────────────            ────────────────────
BE-0 progression enum  ┐
                       ├──►  A1 planEntry ──┐
                       │     A2 reqCategory ─┼──► A4 bloque electivo ─┐
                       │     A3 requirement ─┘     (derivación)       │
                       │                                              ├──► A5 registro/config (cierra A)
                       └──────────────────────────────────────────────┘
                                                                       │
                          ┌────────────────────────────────────────────┘
                          ▼
   Épica C (líneas)   C1 ver ──► C2 crear/editar ──► C3 borrar guard ──► C4 integración malla
                          │
   Épica B (malla)    B1 ver(RO) ──► B2 modo edición ──► B3 resumen
                          │                              B4 agregar oblig. ─┐
                          │                              B5 agregar elect. ─┼─► B6 bloqueo prereqs
                          │                              B7 editar/quitar  ─┘
                          │                              B8 drag&drop + período
                          └─────────────────────────────► B9 filtros

   Épica D (requisitos curso · owner=activity) — SCOPE DECISION (ver §5):
                       D1 pestaña Requisitos (editor árbol) ── D3 modal impacto
                       D2 validación restrictiva (plan publicado)

   Épica E (carryover SP4 · versionado/clonado con hijos · CORE habilitado):
                       E4 arreglar versionado RT: ext-base (H-7) + proyección RT (H-3) ◄── BLOQUEANTE · ambos PROBADOS EN VIVO · prereq de E1 y E2
                       E1 verificar versionado base end-to-end ◄── requiere E4
                       E2 deep-copy de hijos (motor YA existe · H-2) ◄── requiere E4 + A1+A2+A3+A4
                       E3 verificar v2 completa (padre RT + hijos)
```

**Reglas de orden:**
1. **BE-0 + A1/A2/A3 son el camino crítico**: nada de UI de malla funciona sin los objetos. Priorizar en la primera mitad del sprint.
2. **A4** (bloque electivo) depende de A1 + A3. **A5** cierra la épica A (capabilities/layouts/lang/tools).
3. **B1** (ver malla) requiere A1 + A2 (+ seed). **B5/B6** requieren A3/A4.
4. **C** puede arrancar en paralelo a B apenas exista A2.
5. **D** depende de A3 y es ortogonal a la malla; ver decisión de alcance §5.
6. **E** (carryover SP4): **E4 es el bloqueante** — versionar un Curriculum hoy **crashea** (H-7) y dropea el RT (H-3), **ambos probados en vivo (SPK-1 ejecutado)**. E4 es **prerrequisito de E1 (verificación) y de E2 (hijos)**. **E2** usa el motor de cascada que **ya existe** en core, pero depende de E4 + **toda la Épica A**. Es lo último de BE.
7. **Spikes restantes (SPK-2 layouts por RT, SPK-3 cascada) en semana 1.** SPK-1 (versionado en vivo) **ya ejecutado** — confirmó H-3 + H-7.

---

## 3. Catálogo de tickets

> Ids de planeación con prefijo `SP5-`. Mapean a las historias del handoff (`MC-*`). Al subir a Jira, asignar el id externo `UPONE-####` y reflejarlo en commits/branches/PRs (DET-19).
>
> ✅ **Estimaciones:** los headers de cada ticket abajo muestran la estimación **recalibrada (vigente)**, alineada con la tabla autoritativa de **§4.1**. El mapeo original→recalibrada (para trazabilidad) vive en §4.1.

> 🎟️ **Agrupación en tickets de Jira:** este §3 es el **desglose atómico de tareas** (granularidad de ingeniería). Para crear los tickets, esas tareas se **consolidan** en los tickets `MC-*` de `SP5-historias-usuario.md` (y `S7-*` para SP6). Mapeo:

| Ticket Jira (consolidado) | Agrupa (tareas §3) | SP | Sprint |
|---|---|---:|---|
| **MC-01** Modelo base | BE-0 + BE-1 | 2 | SP5 |
| **MC-02** planEntry + requirementCategory | A1 + A2 | 5 | SP5 |
| **MC-03** requirement + bloque electivo | A3 + A4 | 7 | SP5 |
| **MC-04** Registro mod + contratos MCP | A5 + F1 | 5 | SP5 |
| **MC-05** Malla: ver + edición + resumen | B1 + B2 + B3 | 5 | SP5 |
| **MC-06** Malla: agregar/editar asignaturas | B4 + B5 + B7 | 8 | SP5 |
| **MC-07** Líneas de formación | C1 + C2 + C3 + C4 | 5 | SP5 |
| **MC-08** Malla: filtros + interacciones | B9 + B6 + B8 | 7 | SP5 |
| **MC-09** Validación restrictiva | D2 | 3 | SP5 |
| **S7-01** Editor de requisitos del curso | D1 + D3 | 7 | SP6 |
| **S7-02** Desbloquear versionado (core) | E4 + E1 | 6 | SP6 |
| **S7-03** Deep-copy de hijos | E2 + E3 | 7 | SP6 |
| **S7-04** `cd_*` de dominio MCP | F2 | 6 | SP6 |

> Cada épica de §3 indica abajo a qué ticket(s) consolidado(s) pertenece.

### Track 0 — Modelo base (habilita todo) · → **MC-01**

---

#### SP5-BE0 · Cerrar `progression` como enum {Sequential, Modular}
**Mapea:** decisión reunión `00:43:40`/`01:10:58` · **Tipo:** BE · **Estimación:** 1 SP

**Qué aborda.** Hoy `rt__Plan__curriculum.json` tiene `progression` como `string` libre con un `NEEDS CLARIFICATION`. La reunión cerró que debe ser un **enum** que restrinja el plan a `Sequential` o `Modular`. Es el discriminador del modo de operación de la malla (secuencial usa `period`; modular lo deriva del DAG — fuera de alcance pero el enum debe existir ya).

**Alcance.**
- `objects/RecordTypes/rt__Plan__curriculum.json`: `progression` → `enum: ["Sequential","Modular"]`, `static_default: "Sequential"`, quitar el `NEEDS CLARIFICATION`, actualizar `description`.
- `lang/es_CL@Curriculum.json`: labels del enum (Secuencial / Modular).
- `seed/`: planes seedeados con `progression: "Sequential"`.
- Análisis de impacto colateral: buscar consumidores de `progression` (resolvers, componentes, MCP `cd_*`) y confirmar que tratar string→enum no rompe lecturas existentes.

**Criterios de aceptación.**
- [ ] `progression` es enum cerrado {Sequential, Modular}, default Sequential, sin NEEDS CLARIFICATION.
- [ ] Sync corre limpio en tenant UPU; planes existentes migran a `Sequential`.
- [ ] Labels i18n en es_CL; el select muestra las dos opciones.
- [ ] Reporte de consumidores de `progression` (sin regresiones).

**Dependencias.** Ninguna (arranca primero). **Rollback:** revertir a `string` (campo aditivo, sin pérdida).

---

#### SP5-BE1 · Campo `isCurrent` (booleano) en `Activity`
**Mapea:** reunión `01:06:46`/`01:09:13` (próximo paso de Esteban) · **Tipo:** BE · **Estimación:** 1 SP

**Qué aborda.** La reunión acordó marcar la **versión vigente** de una asignatura. Para SP5 es un **booleano simple, sin lógica de versionado** (esa lógica completa queda para SP6, ver BL-1). Se necesita **ahora** porque el **listado/picker de cursos** (B4) debe poder mostrar/filtrar las asignaturas vigentes.

**Alcance.**
- `objects/activity.json`: nuevo campo `isCurrent: boolean`, `static_default: "true"`, `not_null` con default. Sin lógica extra (no auto-gestiona el linaje todavía).
- `lang/es_CL@activity.json`: label ("Vigente").
- Layout RecordList de Activity: columna/filtro `isCurrent`.
- El picker de B4 lee `isCurrent` para filtrar/destacar cursos vigentes.
- Análisis de impacto: el campo es aditivo; confirmar que no rompe lecturas/seed existentes de Activity.

**Criterios de aceptación.**
- [ ] `Activity.isCurrent` existe (boolean, default true); sync limpio en UPU; seed pobla el campo.
- [ ] Visible/filtrable en el RecordList de Activity y consumible por el picker de B4.
- [ ] Sin lógica de versionado asociada (solo el flag) — la gestión automática queda en BL-1/SP6.

**Dependencias.** Ninguna. **Rollback:** quitar el campo (aditivo). **Relación:** sustituye el alcance SP5 de BL-1 (que pasa a "lógica de vigencia automática", SP6).

---

### Épica A — Objetos nuevos (modelado · BE) · → **MC-02** (A1,A2) · **MC-03** (A3,A4) · **MC-04** (A5)

---

#### SP5-A1 · Objeto `planEntry` (solo secuencial)
**Mapea:** MC-OBJ-1 · **Tipo:** BE · **Estimación:** 3 SP

**Qué aborda.** El elemento de la malla: coloca una `Activity` dentro de un `Curriculum(Plan)`, en un período. Es la entidad central que el componente de malla pinta. **Alcance SP5: solo planes secuenciales** — el manejo modular (`period` nullable + orden por DAG) **pasa a SP6** (decisión 2026-06-23).

**Alcance (archivos del mod, patrón copiable de `CurricularSection`/`Activity`).**
- `objects/planEntry.json`: campos de §2.1 — `planId` (FK Curriculum/Plan), `activityId` (FK Activity), `categoryId?` (FK requirementCategory), `blockId?` (FK requirement Group → electividad derivada), `kind` enum {Course, Internship, Thesis} (**discriminador, no recordType**), `period` (integer, **requerido** — solo secuencial este sprint), `position` (integer), `credits?` (override), `sourceEntryId?` (self FK, trazabilidad — sin lógica de clonado aún), timestamps.
- Índices: `planId`, `categoryId`, `blockId`, `(planId, period, position)`.
- `lang/es_CL@planEntry.json`; layouts RecordList + RecordDetail; `seed/` de ejemplo.
- `logic/planEntry-{create,read,update}.resolver.js` + `.schema.graphql`; validación de FKs.
- Regla `credits` efectivo = `planEntry.credits ?? Activity.credits` (en el resolver de lectura).

**Criterios de aceptación.**
- [ ] Objeto creado con los campos de §2.1; FKs validadas; `period` **requerido** (secuencial).
- [ ] `credits` efectivo = override ?? `Activity.credits` (verificado con dato concreto).
- [ ] Electividad derivada de `blockId` (sin flag `isElective`).
- [ ] Layouts RecordList + RecordDetail; lang ES; seed de ejemplo carga en UPU.
- [ ] CRUD operable vía API/MCP, asociado a un `Curriculum(Plan)`.

**Fuera de alcance (→ SP6):** `period` nullable + derivación de orden por DAG para planes **modulares**.

**Dependencias.** BE-0. **Rollback:** objeto nuevo aislado; eliminar archivos + reset-mods.

---

#### SP5-A2 · Objeto `requirementCategory` (líneas de formación)
**Mapea:** MC-OBJ-2 · **Tipo:** BE · **Estimación:** 2 SP

**Qué aborda.** Agrupación de créditos del plan ("Ciencias e Ingeniería", "Formación Transversal", "Electivos"…). Es organización/denominador de créditos, **no** una condición. Alimenta los chips/colores de la malla y el selector de línea.

**Alcance.**
- `objects/requirementCategory.json`: `curriculumId` (FK), `name`, `code?`, `minCredits`, `maxCredits?`, `position`, `description?`, `color?`, `icon?`, timestamps (§2.2).
- Validación `minCredits ≤ maxCredits` (si `maxCredits` definido) en el resolver.
- **Guard de borrado:** no eliminable si tiene `planEntry` asignados.
- Derivación "créditos actuales" = suma de `credits` efectivos de sus `planEntry` (resolver de lectura o campo computado).
- `lang/es_CL@requirementCategory.json`; layouts; seed; resolvers + schema; capabilities.

**Criterios de aceptación.**
- [ ] Objeto creado con campos de §2.2; pertenece al `Curriculum`.
- [ ] Validación `minCredits ≤ maxCredits` (test con valores concretos que fallen cuando no se cumple).
- [ ] No eliminable si tiene `planEntry` asignados (mensaje "reasigna primero").
- [ ] Conteo de créditos por categoría consultable (actual vs. mínimo).

**Dependencias.** El guard de borrado necesita `planEntry` (A1) para verificarse end-to-end. **Rollback:** objeto aislado.

---

#### SP5-A3 · Objeto `requirement` (Composite · 3 familias)
**Mapea:** MC-OBJ-3 · **Tipo:** BE · **Estimación:** 5 SP

**Qué aborda.** Nodo de regla sobre el avance, patrón **Composite**: árbol cuyos `Group` combinan con AND/OR/K-de-N y cuyas hojas son predicados tipados cerrados. Es el objeto más complejo del sprint: base polimórfica + 3 recordTypes + árbol auto-referente. **Solo persistencia/lectura — sin motor de evaluación.**

**Alcance.**
- `objects/requirement.json` (base §2.3): `ownerType` enum {curriculum, activity, offering}, `ownerId` (FK polimórfica), `parentId?` (self FK, anidamiento), `recordType` enum {Group, RecordState, MetricThreshold}, `effect` enum {EligibilityToEnroll, ProgressGate, Completion, DiplomaAward}, `label` (**requerido**), `isHardRule` (bool, default true), `negate` (bool, default false), `overrideMode?` {Replaces, Adds} (solo owner=offering), `position`, timestamps.
- 3 extensiones en `objects/RecordTypes/`:
  - `rt__RecordState__requirement.json` (**Curso**): `targetType` {activity}, `targetId`, `mustBe` {Approved, Taken}, `threshold {minGrade}?`, `timing` {Before, Concurrent, Either}?.
  - `rt__Group__requirement.json` (**Electivos K de N**): `combinator` {AND, OR}, `minToSatisfy?`, `creditsRequired?`.
  - `rt__MetricThreshold__requirement.json` (**Créditos mínimos**): `metric` {Credits}, `scope` {plan, category}?, `scopeId?`, `operator` {>=,>,=,<,<=}, `value`.
- Resolvers que **persisten y reconstruyen el árbol** (insert/read por `parentId`).
- `seed/`: ejemplo EST200 completo (§2.5) — árbol AND( OR(via1(MAT110∧MAT120), MAT210), ≥60 créditos, advisory PROG101 ).
- `lang/es_CL@requirement.json` + por recordType; capabilities.
- **Layouts por RecordType** (`default_rt__RecordState__requirement_{view,edit,create}.json`, etc.): **copiar el patrón ya probado en producción** en este mod — `CurricularSection` tiene 19 layouts `default_rt__*__curricularsection_*` committeados; `resolveDefaultLayout` los resuelve por convención `default_{objectName}_{mode}`. (H-4 resuelto, ver §1.6 / auditoría.)
- Documentar (no implementar) que `recordType` es extensible: `AttributeMatch` y más targets/métricas a futuro.

**Criterios de aceptación.**
- [ ] Base + 3 RecordTypes creados; `parentId` self (anidamiento solo en Group); `label` obligatorio.
- [ ] `RecordState.targetType` limitado a `activity`; `MetricThreshold.metric` limitado a `Credits`; enums cerrados.
- [ ] Persiste y reconstruye el árbol; seed EST200 (§2.5) carga y se lee como árbol correcto.
- [ ] Solo persistencia/lectura — sin motor de evaluación.
- [ ] `recordType` extensible documentado como pendiente (sin implementar).

**Dependencias.** Ninguna dura para crear el objeto; el seed EST200 referencia `Activity` (ya existe). **Rollback:** objeto + 3 rt aislados.

---

#### SP5-A4 · Bloque electivo (OptionPool) + electividad derivada
**Mapea:** MC-OBJ-4 · **Tipo:** BE · **Estimación:** 2 SP

**Qué aborda.** Materializar el bloque electivo como un `requirement(Group, OR, minToSatisfy/creditsRequired)` sobre el plan, y derivar la electividad de `planEntry.blockId` (sin flag booleano).

**Alcance.**
- Confirmar/ajustar que `requirement(Group)` con `ownerType=curriculum`, `combinator=OR`, `minToSatisfy`/`creditsRequired` representa el bloque; el nombre = `requirement.label`.
- `planEntry.blockId` → ese Group materializa la membresía (ya está el campo en A1; aquí se cablea la derivación/query).
- Query/derivación documentada: "obligatorio vs. electivo" (`blockId == null` vs `!= null`); "electivos de una línea" = `planEntry` con `blockId != null` agrupados por `categoryId`.
- `seed/` §2.6: bloque "Electivo de Especialización" (OR, minToSatisfy=4, creditsRequired=24) + planEntries electivos.

**Criterios de aceptación.**
- [ ] Un `requirement(Group, OR, minToSatisfy/creditsRequired)` sobre el plan = bloque electivo.
- [ ] `planEntry.blockId` materializa la membresía; entry con `blockId` es electivo.
- [ ] Query/derivación obligatorio-vs-electivo documentada y verificada con seed §2.6.

**Dependencias.** A1 (blockId) + A3 (Group). **Rollback:** solo seed + query.

---

#### SP5-A5 · Registro en config del mod (cierre de Épica A)
**Mapea:** MC-OBJ-5 · **Tipo:** BE · **Estimación:** 2 SP

**Qué aborda.** Dejar los 3 objetos operables: capabilities, layouts y lang del **mod**. Ticket de cierre que verifica que A1–A4 son consumibles por el componente de malla **vía el GraphQL del mod**.

**Alcance (mod-only · ver §1.6).**
- `capabilities.json`: capabilities CRUD de los 3 objetos (+ guard de borrado de categoría).
- Layouts (RecordList/RecordDetail) del mod para object-manager.
- `lang/es_CL`: keys transversales completas.
- Smoke: objetos visibles en object-manager y consumibles por el componente de malla (GraphQL del mod).
- **Cobertura MCP = Épica F (requerida §1.7):** los 3 objetos van al MCP en SP5 (contratos + allowlist + `cd_*` de los flujos). A5 deja los objetos MCP-ready (enums/FK/labels); F escribe los contratos/tools en `uplanner/mcp`.

**Criterios de aceptación.**
- [ ] `capabilities.json`, layouts y `lang/es` del mod actualizados.
- [ ] Objetos visibles en object-manager y consumibles por el componente de malla (smoke real, no solo build).
- [ ] **MCP-ready (§1.7):** los 3 objetos declaran enums + FK con `references` + labels i18n, de modo que escribir sus `ObjectContract` en el MCP (SP6) sea directo. (No se escriben los contratos aquí — solo se garantiza que el modelo lo permite.)

**Dependencias.** A1, A2, A3 (A4 deseable). **Rollback:** revertir entradas de capabilities.

---

### Épica B — Componente de malla secuencial (FE) · → **MC-05** (B1,B2,B3) · **MC-06** (B4,B5,B7) · **MC-08** (B6,B8,B9)

---

#### SP5-B1 · Ver malla (solo lectura) + puntos de entrada
**Mapea:** MC-CMP-1 · **Tipo:** FE · **Estimación:** 3 SP

**Qué aborda.** El esqueleto del componente: pinta la malla por período (columnas = `totalPeriods`/`periodType`), tarjetas de asignatura agrupadas por `period`. Accesible desde la acción "Malla curricular" del listado y la pestaña Malla del detalle (modo Ver).

**Alcance (mod-only · ver §1.6).**
- Componente **autorado en el mod** (`mods/curriculum-design/modsComponents/`, junto a `CompositeSectionTree`); grid a ancho completo (mockup 685–921).
- Tarjetas: código, créditos, línea de formación (color/ícono), badge "electivo" (derivado de `blockId`).
- Carga de datos: `planEntry` + `requirementCategory` + bloques del plan vía **GraphQL nativo del mod** (no MCP).
- Entry points **sin tocar core**: **pestaña "Malla curricular" en el RecordDetail** declarada en config del mod (`default_Curriculum_view.json`, `associatedLayout`/Vueform element); la **acción del listado navega a esa pestaña** (route/config del mod). **NO** registrar un `layoutType` nuevo en `LayoutOrchestrator` de core.
- Recordar gotcha up1: recargar tras el primer render del listado (memoria `reference_up1_suite_reload_after_first_load`).

**Criterios de aceptación.**
- [ ] Tarjetas agrupadas por `period`; muestran código, créditos, línea, badge electivo (derivado).
- [ ] Accesible desde acción del listado y pestaña Malla del detalle (Ver = solo lectura).

**Dependencias.** A1 + A2 (+ seed). **Rollback:** componente nuevo aislado.

---

#### SP5-B2 · Modo edición (gating por estado)
**Mapea:** MC-CMP-2 · **Tipo:** FE · **Estimación:** 1 SP

**Qué aborda.** Las acciones de alta/edición se muestran solo al abrir el plan en edición y si el `status` lo permite (editable). En solo lectura, ocultas.

**Alcance.** Lógica de gating en el componente: deriva `editable` de modo (Ver/Editar) + `Curriculum.status`. Ocultar/mostrar toolbar de edición, botones de alta, drag&drop.

**Criterios de aceptación.**
- [ ] Acciones de alta/edición visibles solo en modo edición + estado editable; en solo lectura, ocultas.

**Dependencias.** B1. **Rollback:** flag de UI.

---

#### SP5-B3 · Barra de resumen del plan
**Mapea:** MC-CMP-3 · **Tipo:** FE · **Estimación:** 1 SP

**Qué aborda.** Resumen del plan a ancho completo sobre los filtros (mockup líneas 718–725).

**Alcance.** Indicadores: créditos del diseño / requeridos, períodos, asignaturas, carga máx. por período. Cálculo desde los `planEntry` cargados + `totalCredits`/`totalPeriods`.

**Criterios de aceptación.**
- [ ] Indicadores: créditos diseño/requeridos, períodos, asignaturas, carga máx. por período (valores concretos correctos).

**Dependencias.** B1. **Rollback:** sección de UI.

---

#### SP5-B4 · Agregar asignaturas obligatorias (modal 2 pasos)
**Mapea:** MC-CMP-4 · **Tipo:** FE · **Estimación:** 3 SP

**Qué aborda.** Modal para asignar cursos: Paso 1 tipo (Obligatoria/Opcional) **+ línea de formación opcional** (aplicada en masa a todos los cursos del lote); Paso 2 picker de `Activity` con búsqueda, **filtro por departamento** y multiselección (mockup líneas 763–817).

**Alcance.**
- Modal 2 pasos; paso 1 con tipo + línea opcional; paso 2 picker multiselección + filtro depto (`executionUnitId` → OrgUnit).
- **Flujo obligatoria = simple** (decisión `00:20:02`/`00:22:41`): paso 1 "Obligatoria" → paso 2 seleccionar cursos → crea `planEntry` (kind=Course) **sin `blockId`**, en el período, con `categoryId` (si se eligió línea) y créditos heredados de `Activity`. *(El flujo electiva vive en B5.)*
- **El picker oculta los cursos ya agregados a la malla** (`00:26:58`): la lista del catálogo excluye los `Activity` que ya tienen `planEntry` en este plan.
- La línea en masa evita asignar curso por curso (decisión reunión `00:39:19`).

**Criterios de aceptación.**
- [ ] Paso 1: tipo (Obligatoria/Opcional) + línea de formación opcional. Paso 2: picker `Activity` (buscar + filtro depto + multiselección).
- [ ] Crea `planEntry` (kind=Course) en el período con `categoryId` y créditos heredados; obligatorias **sin** `blockId`.
- [ ] El picker **no lista** asignaturas ya colocadas en la malla.

**Dependencias.** A1 + A2 + B1/B2. **Rollback:** modal de UI.

---

#### SP5-B5 · Agregar electivas (bloque OptionPool)
**Mapea:** MC-CMP-5 · **Tipo:** FE · **Estimación:** 3 SP

**Qué aborda.** Al elegir "Opcional", asignar las asignaturas a un bloque electivo con nombre (autocompletado de bloques existentes del plan). Es **tagging** dentro de un bloque, no edición del bloque (decisión `00:22:41`).

**Alcance (mecánica detallada del transcript `00:17:02`–`00:28:18`).**
- **Seleccionar bloque existente o crear/nombrar uno nuevo** (select con autocompletado de bloques del plan + "suggest" de nombre nuevo). Corrige la inconsistencia de `00:17:02` (no se veían bloques antes de elegir asignatura).
- El bloque es un **OptionPool con nombre propio, INDEPENDIENTE de la línea de formación** (`00:20:02`): ejes ortogonales — un `planEntry` puede tener `categoryId` (línea) **y** `blockId` (bloque) a la vez.
- Es **tagging, NO edición del bloque** (`00:22:41`/`00:25:45`): la acción crea `planEntry` con `blockId`; **el bloque se crea/crece como consecuencia**, no se edita directamente.
- Al **elegir un bloque existente, precargar sus cursos actuales** para sumar/quitar (`00:24:35`).
- El bloque = `requirement(Group, ownerType=curriculum, combinator=OR)`; su `label` = **nombre del bloque** (input de texto en el form, `00:18:24`).
- El **`minToSatisfy` se auto-deriva del conteo** de cursos del bloque (default = total taggeado; ajustable) (`00:28:18`).
- Si el bloque es nuevo, crearlo (Group, OR) primero; los `planEntry` quedan con `blockId` = ese Group.
- Badge "electivo" y chip de filtro de electivos se derivan automáticamente de `blockId`.
- **Componente del selector (REUSAR, no construir — ver `deltas-transcript-vs-mockup.md` §3):** Vueform `SelectElement` con `search: true` + `create: true` (autocompletar bloques existentes + nombrar uno nuevo), opciones remotas vía patrón `useOwnerIdOptions` filtrando `requirement(Group, ownerType=curriculum, ownerId=<plan>)`. Integración: embeber el `SelectElement` en el modal casero (BUG-platform-011); validar render standalone como primer paso.

**Criterios de aceptación.**
- [ ] Seleccionar bloque existente (precarga sus cursos) **o** crear/nombrar uno nuevo; autocompletado de bloques del plan.
- [ ] El bloque es independiente de la línea (un entry puede tener `categoryId` y `blockId`).
- [ ] `planEntry.blockId` = `requirement(Group, ownerType=curriculum, OR)`; `label` = nombre; `minToSatisfy` = conteo por defecto.
- [ ] Badge y filtro de electivos derivados; sin editar el bloque directamente (tagging).

**Dependencias.** A3 + A4 + B4. **Rollback:** modal de UI.

---

#### SP5-B6 · Bloqueo por prerrequisitos al agregar
**Mapea:** MC-CMP-6 · **Tipo:** FE · **Estimación:** 2 SP

**Qué aborda.** Al confirmar un alta, si un prereq-curso (de los `requirement` de la `Activity`) no está ubicado en un período anterior (ausente o "más tarde"), se **bloquea**. Modal lista faltantes y ofrece solo *Cancelar* o *Volver a la selección* (mockup líneas 818–836).

**Alcance (detalle `00:29:22`).**
- Al confirmar: leer los `requirement(owner=activity, effect=EligibilityToEnroll)` de cada Activity del lote y verificar contra la malla.
- **Qué alerta:** `RecordState(curso, Before)` no ubicado en un período anterior; y `Group(K-de-N de cursos)` cuyos cursos miembros no estén asignados a la malla.
- **Qué NO alerta:** `MetricThreshold(Credits)` — los créditos mínimos **no disparan alerta** ("esos van a ser créditos cursados… ahí no debería tirar alerta", `00:29:22`). Importante: el bloqueo es solo sobre **ubicación de cursos**, no sobre métricas de avance.
- Si falta alguno → modal de bloqueo (lista faltantes; Cancelar / Volver). Sin faltantes → completa.
- Alerta informativa, no corrección automática (decisión `00:31:01`).

**Criterios de aceptación.**
- [ ] Un prereq-curso (`RecordState Before`) no ubicado en período anterior → bloquea con modal de faltantes (Cancelar / Volver).
- [ ] Un `Group(K-de-N)` con cursos miembros ausentes de la malla → también alerta.
- [ ] Un requisito `MetricThreshold(Credits)` **NO** dispara el bloqueo (verificado con caso concreto).
- [ ] Sin faltantes → se completa el alta.

**Dependencias.** A3 (requirements de Activity) + B4. **Rollback:** lógica de validación FE.

---

#### SP5-B7 · Editar / quitar un `planEntry`
**Mapea:** MC-CMP-7 · **Tipo:** FE · **Estimación:** 2 SP

**Qué aborda.** Modal flotante para ajustar una asignatura colocada: créditos (override), línea de formación (categoría), Rol (Obligatoria/Electiva → bloque), "Quitar de la malla" (mockup líneas 837–862).

**Alcance.**
- Modal con: créditos override, selector de línea (categoría), selector de Rol.
- Cambiar Rol a Electiva → setea `blockId` (elegir/crear bloque); a Obligatoria → limpia `blockId`. Cambiar categoría no afecta electividad.
- Quitar → elimina el `planEntry`.

**Criterios de aceptación.**
- [ ] Modal: créditos, línea, Rol, "Quitar de la malla".
- [ ] Rol→Electiva setea `blockId`; →Obligatoria lo limpia; cambiar categoría no afecta electividad.

**Dependencias.** A1 + A4 + B1/B2. **Rollback:** modal de UI.

---

#### SP5-B8 · Reordenar (drag&drop) + agregar período
**Mapea:** MC-CMP-8 · **Tipo:** FE · **Estimación:** 3 SP

**Qué aborda.** Mover asignaturas entre períodos (actualiza `period`/`position`) y agregar columnas de período.

**Alcance.**
- Drag&drop entre columnas; persistir `period` y `position` (recalcular orden de hermanos).
- Botón "Agregar período" (mockup línea 915); actualizar `totalPeriods` del plan si aplica.

**Criterios de aceptación.**
- [ ] Drag&drop entre columnas actualiza `period`/`position` (verificado con dato persistido).
- [ ] Botón "Agregar período" funcional.

**Dependencias.** A1 + B1/B2. **Rollback:** desactivar drag&drop.

---

#### SP5-B9 · Filtros de la malla
**Mapea:** MC-CMP-9 · **Tipo:** FE · **Estimación:** 2 SP

**Qué aborda.** Resaltar/atenuar por línea de formación (chips) y por bloque electivo (chips derivados de los electivos añadidos) (mockup líneas 726–749).

**Alcance (detalle `00:01:30`–`00:03:22`).** Las **líneas de formación (`requirementCategory`) son los filtros** de la malla — "salen de esa vista", se renderizan como chips que **resaltan/atenúan** las tarjetas por `categoryId` (color/ícono del componente `view`). Segundo eje: **chips de bloques electivos** derivados de los `blockId` presentes. Botón de limpiar filtro.

**Criterios de aceptación.**
- [ ] Chips de líneas de formación (desde `requirementCategory`) resaltan/atenúan las tarjetas por `categoryId`.
- [ ] Chips de bloques electivos derivados de los `blockId` añadidos; limpiar filtro.

**Dependencias.** B1 + A4. **Rollback:** sección de UI.

---

### Épica C — Pestaña "Líneas de formación" (FE) · → **MC-07** (C1,C2,C3,C4)

---

#### SP5-C1 · Ver líneas del plan (RecordList)
**Mapea:** MC-LF-1 · **Tipo:** FE · **Estimación:** 1 SP

**Qué aborda.** Pestaña que lista las `requirementCategory` del plan (mockup líneas 597–657).

**Alcance.** RecordList con columnas: línea, código, créditos (actual/mín), obligatorias, electivas. Solo lectura fuera de edición.

**Criterios de aceptación.**
- [ ] RecordList con columnas línea, código, créditos (actual/mín), obligatorias, electivas; solo lectura fuera de edición.

**Dependencias.** A2. **Rollback:** pestaña de UI.

---

#### SP5-C2 · Crear / editar línea
**Mapea:** MC-LF-2 · **Tipo:** FE · **Estimación:** 2 SP

**Qué aborda.** Modal para definir líneas: nombre, código, créditos mín/máx, color/ícono → crea/edita `requirementCategory` (mockup líneas 658–684).

**Alcance.** Modal con form (nombre, código, minCredits, maxCredits, color, icon). Usa componente `view` para color/ícono (Eduardo confirmó viabilidad `00:03:22`). Validación `minCredits ≤ maxCredits` en FE + BE (A2).

**Criterios de aceptación.**
- [ ] Modal: nombre, código, créditos mín/máx, color/ícono → crea/edita `requirementCategory`.

**Dependencias.** A2. **Rollback:** modal de UI.

---

#### SP5-C3 · Eliminar línea (con guard)
**Mapea:** MC-LF-3 · **Tipo:** FE · **Estimación:** 1 SP

**Qué aborda.** Borrar una línea sin dejar asignaturas huérfanas: bloquea si hay `planEntry` asignados.

**Alcance.** Acción de borrado que consume el guard de A2; mensaje "reasigna primero" si hay entries.

**Criterios de aceptación.**
- [ ] Bloquea el borrado si hay `planEntry` asignados ("reasigna primero").

**Dependencias.** A2 (guard) + A1. **Rollback:** acción de UI.

---

#### SP5-C4 · Integración líneas → malla
**Mapea:** MC-LF-4 · **Tipo:** FE · **Estimación:** 1 SP

**Qué aborda.** Que las líneas definidas alimenten el selector "Línea de formación" en alta/edición de `planEntry` y los chips/colores de la malla.

**Alcance.** Cablear el selector de línea (B4/B7) y los chips/colores (B9) a las `requirementCategory` del plan.

**Criterios de aceptación.**
- [ ] El selector "Línea de formación" y los chips/colores de la malla se nutren de las `requirementCategory` del plan.

**Dependencias.** C1/C2 + B4/B7/B9. **Rollback:** ya cubierto por las features que integra.

---

### Épica D — Requisitos del curso (owner=activity) + validación restrictiva · → **MC-09** (D2, SP5) · **S7-01** (D1,D3, SP6)

> **Decisión de alcance pendiente (ver §5).** El handoff (épicas A/B/C) **no** incluye una épica de *edición de requisitos a nivel de Activity*; declara que `requirement` solo se "modela y persiste" (los requisitos del seed alcanzan para probar la malla). Pero el **mockup** trae una pestaña "Requisitos" con su editor (líneas 923–1151) y la **reunión** asignó explícitamente a Esteban "Actualizar formulario" y "Validar requisitos" (`próximos pasos`). Esta épica resuelve esa tensión. **D2 es un compromiso explícito de la reunión; D1/D3 son los candidatos a diferir si la capacidad aprieta.**

---

#### SP5-D1 · Pestaña "Requisitos" del curso (editor de árbol)
**Mapea:** mockup líneas 923–1151 (no hay MC-* en el handoff) · **Tipo:** FE · **Estimación:** 5 SP

**Qué aborda.** UI para crear/editar los `requirement(owner=activity)` de una `Activity` (prereqs/coreqs): modal "Agregar requisito" 2 pasos (Paso 1: clase + vía OR/AND + exigencia; Paso 2: detalle según clase — Curso/Electivo/Métrica) + visualización del árbol unificado.

**Alcance.**
- Pestaña Requisitos en el detalle de Activity; RecordList de requisitos + menú de acciones.
- Modal agregar requisito (3 familias del MVP: RecordState/Curso, Group/Electivos K de N, MetricThreshold/Créditos).
- Visualización del árbol `requirement` (lectura de la estructura Composite).
- Sin motor de evaluación (solo edición/persistencia del árbol).

**Criterios de aceptación.**
- [ ] CRUD de `requirement(owner=activity)` con las 3 familias; persiste/reconstruye el árbol.
- [ ] Modal 2 pasos coherente con el mockup; visualización del árbol.

**Dependencias.** A3. **Rollback:** pestaña/modal de UI.

---

#### SP5-D2 · Validación restrictiva en programa de asignatura publicado
**Mapea:** reunión `00:48:06`–`00:51:07` (próximo paso de Esteban) · **Tipo:** BE+FE · **Estimación:** 3 SP

**Qué aborda.** Regla restrictiva: si se intenta crear/editar requisitos de una `Activity` que ya está asignada a **planes publicados**, se bloquea y se obliga a crear una **nueva versión** del programa de asignatura (evita invalidar mallas existentes). Decisión: "mejor restrictivo antes que permitir el error" (`00:51:07`).

**Alcance.**
- BE: al mutar `requirement(owner=activity)`, verificar si la Activity está referenciada por `planEntry` cuyo `Curriculum(Plan).status` sea publicado/activo. Si sí → rechazar (restrictivo) con mensaje accionable.
- FE: modal de alerta que explica el impacto y sugiere versionar el programa de asignatura.
- Análisis de impacto colateral obligatorio: qué resolvers de `requirement` y de Activity se tocan; confirmar que no rompe la creación en planes Draft.

**Criterios de aceptación.**
- [ ] Crear/editar requisitos de una Activity en planes publicados se **bloquea** con mensaje que sugiere versionar.
- [ ] En planes Draft/no publicados, la edición de requisitos funciona normal.
- [ ] Test con dato concreto: Activity en plan publicado → bloqueo; Activity en plan Draft → permite.

**Dependencias.** A1 (planEntry) + A3 (requirement). **Rollback:** desactivar la regla (feature-gated).

---

#### SP5-D3 · Modal de alerta de impacto en planes
**Mapea:** reunión `00:46:27`–`00:48:06` · **Tipo:** FE · **Estimación:** 2 SP

**Qué aborda.** Modal que, ante cambios de prereqs que impactan planes existentes, avisa qué planes de estudio se ven afectados (complemento informativo de D2 para los casos no estrictamente bloqueados).

**Alcance.** Consulta de planes afectados por una Activity; modal con la lista + recomendación de versionar. Solo informativo.

**Criterios de aceptación.**
- [ ] El modal lista los planes afectados y sugiere crear nueva versión.

**Dependencias.** D2 (comparte la query de "planes afectados"). **Rollback:** modal de UI.

---

### Épica E — Versionado/clonado del plan con hijos (carryover SP4) · → **S7-02** (E4,E1) · **S7-03** (E2,E3) · SP6

> **Origen:** pendiente de SP4 (UPONE-1270 / TICKET-065) + directiva de pull-in a SP5. **Entra ahora porque nace `planEntry`:** versionar o clonar un plan sin copiar sus hijos produce una versión vacía. El **clonado del `Curriculum` pelado ya funciona** (SP4); el **versionado está bloqueado en core**. Esta épica (1) desbloquea el versionado y (2) hace que **ambas** operaciones copien los hijos en profundidad.
>
> **Acotación importante de correctitud:** al versionar/clonar un `Curriculum` se copian **solo los hijos del plan** — `planEntry`, `requirementCategory` y los `requirement` con **`ownerType=curriculum`** (bloques electivos). Los `requirement` con `ownerType=activity` (prereqs/coreqs del curso) **NO** se copian: pertenecen a la `Activity`, no al plan, y su versionado es el de Activity (SP4).

---

#### SP5-E1 · Verificar versionado base end-to-end (tras E4)
**Mapea:** SP4 UPONE-1270 / TICKET-065 (Backlog B2) · **Tipo:** BE core (verificación) · **Estimación:** ~1 SP · **Hallazgos H-1 + H-7 (validado en vivo)**

**Qué aborda.** El fix de "workflow opcional" ya está aplicado (`version-from-source.js`, gate `needsWorkflow`), pero la **validación en vivo (SPK-1, ya ejecutada)** probó que versionar un Curriculum **sigue roto end-to-end** por H-7 (crash en el write del ext-base, `Unknown argument updatedById`) y H-3 (dropea la extensión RT). **Por lo tanto E1 ya no es "solo verificar el fix" — depende de E4** y verifica el versionado completo una vez E4 lo arregla.

**Alcance.**
- Smoke E2E (idéntico al ya ejecutado en SPK-1, ahora debe pasar): versionar `UV-ICIV-PLAN-2026` → v2 con `version+1`, `previousVersionId`, nace `Draft`, **sin crash de ext** y **con `rt__Plan__curriculum` poblado**.
- Confirmar tests de `version-from-source-helper` (caso sin `initialStateField`).

**Criterios de aceptación.**
- [ ] Versionar un `Curriculum(Plan)` no crashea (H-7 resuelto) y la v2 trae su extensión RT (H-3 resuelto, vía E4).
- [ ] v2: `version+1`, `previousVersionId` al source, nace `Draft`.

**Dependencias.** **E4** (sin E4 el versionado crashea — probado en vivo). **Rollback:** N/A (verificación).

---

#### SP5-E2 · Deep-copy de hijos al clonar/versionar el plan (cascada en core)
**Mapea:** handoff §1 (antes diferido) + SP4 §6 punto 2 · **Tipo:** BE core (config-driven) · **Estimación:** 5 SP (recalibrado; orig 8 — el motor de cascada ya existe) · **Enfoque decidido:** cascada genérica en core (§5.8)

**Qué aborda.** Que clonar **y** versionar un `Curriculum(Plan)` copie en profundidad sus hijos, **remapeando todas las referencias internas** al nuevo linaje. Es el corazón de la épica y el ticket BE más delicado por el orden de copia y la reescritura de FKs.

**Enfoque (decidido · §5.8 + hallazgo auditoría H-2).** **El motor de cascada genérico YA EXISTE en core** y es config-driven — no hay que construirlo. Core tiene `deep-clone-polymorphic.js`, `deep-clone-direct.js` y `applyDerivedRemap` (remapeo de FKs internas), activados por `prefillFrom.deepClone` en `instance.resolver.js:3353-3416`. Precedente real: `Activity` declara `"deepClone": ["sections"]` y arrastra `CurricularSection` + subsecciones (`recursiveBy: parentId`) + `CurricularLink` con remapeo de FKs. **E2 es declarar config + validar el remapeo, no escribir un motor.**

**Alcance.**
- **Config en el mod (`Curriculum.json`):** declarar `metadata.directChildren`/`polymorphicChildren` + `prefillFrom.deepClone` para los hijos del plan: `requirementCategory` (FK `curriculumId`), `requirement` **filtrado a `ownerType=curriculum`** (polimórfico, FK `ownerId` + `recursiveBy: parentId`), `planEntry` (FK `planId`).
- **Remapeo de FKs internas** vía `applyDerivedRemap` (el mismo mecanismo que ya remapea `CurricularLink` en el árbol de Activity): `planEntry.categoryId` → nueva categoría, `planEntry.blockId` → nuevo `requirement(Group)`, `requirement.parentId` → nuevo padre, set de `planEntry.sourceEntryId` = entry original.
- **Validar/extender el motor** solo si el caso de Curriculum expone un gap (ej. filtro `ownerType=curriculum` en hijos polimórficos). Verificar con SPK-3.
- **Aplica idéntico a clonado y versionado** (ambos pasan por el mismo `deepClone`).
- Copiar **`requirementCategory`** del plan → nuevas con `curriculumId` = nuevo plan. Construir mapa `oldCategoryId → newCategoryId`.
- Copiar **`requirement` (ownerType=curriculum)** — los bloques electivos `Group` y su árbol → nuevos con `ownerId` = nuevo plan; **remapear `parentId`** con el mapa `oldReqId → newReqId` (copiar en orden topológico: raíces antes que hijos). Construir mapa de bloques.
- Copiar **`planEntry`** → nuevos con `planId` = nuevo plan; **remapear** `categoryId` (mapa de categorías), `blockId` (mapa de requirements Group); setear `sourceEntryId` = entry original (trazabilidad de versión, campo ya modelado en A1).
- **Orden de copia obligatorio:** categorías → requirements(Group) → planEntries (que referencian ambos). 
- **Atomicidad:** toda la copia (base + extensión RT del Curriculum + hijos) en una transacción; si algo falla, no deja versión a medias. Considerar el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` y la nota de TICKET-056 (path RT no-atómico).
- Aplica idéntico a **clonado** (sin bump de version) y **versionado** (con bump + previousVersionId).

**Criterios de aceptación.**
- [ ] Versionar/clonar un plan con N `planEntry`, M `requirementCategory` y K bloques electivos produce una v2 con N/M/K equivalentes.
- [ ] FKs remapeadas: ningún hijo de la v2 apunta a un id del plan original (`categoryId`, `blockId`, `parentId`, `planId`, `ownerId` apuntan a los nuevos).
- [ ] `planEntry.sourceEntryId` de la v2 apunta al entry original.
- [ ] `requirement(ownerType=activity)` **no** se copia (test que lo verifica).
- [ ] Operación atómica: fallo a mitad no deja versión parcial (test con dato concreto).
- [ ] La cascada es **genérica/config-driven**: el deep-copy lo dispara la metadata del objeto, sin código de copia específico de `Curriculum` en core. Aplica idéntico a clonado y versionado.

**Dependencias.** E1 + **Épica A completa** (A1, A2, A3, A4). **Rollback:** feature-gate la cascada (versionado/clonado vuelve a copiar solo el Curriculum pelado).

---

#### SP5-E3 · Verificar v2: extensión RT (`rt__Plan__curriculum`) + atomicidad base/RT
**Mapea:** SP4 §6 "Detalles a verificar" punto 2 · **Tipo:** BE · **Estimación:** 2 SP

**Qué aborda.** Confirmar empíricamente que la v2 arrastra los campos PLAN-ONLY de la extensión RT (`progression`, `periodType`, `totalCredits`, `totalPeriods`) y que el write base+RT es atómico. Es el cierre de verificación de E1/E2.

**Alcance.** Smoke E2E de versionar un `Curriculum(Plan)` real en UPU: validar campos de la extensión RT en la v2 + atomicidad del split base/RT. Si la v2 no arrastra el RT, abrir el trabajo correspondiente (puede tocar core, ligado a TICKET-056).

**Criterios de aceptación.**
- [ ] La v2 tiene `progression`/`periodType`/`totalCredits`/`totalPeriods` correctos (heredados del source).
- [ ] El write base+RT es atómico; fallo no deja base sin RT ni viceversa.

**Dependencias.** E1 (+ E2 para verificar también los hijos). **Rollback:** N/A (verificación). **Nota:** si E3 confirma el gap H-3, el trabajo de arreglo vive en **E4**.

---

#### SP5-E4 · Arreglar versionado de objeto con RecordType: ext-base + proyección RT (core) — **BLOQUEANTE**
**Mapea:** hallazgos H-3 + H-7 (ambos **probados en vivo**, auditoría §5.ter) + TICKET-056 (backlog B1) · **Tipo:** BE core · **Estimación:** ~5 SP

**Qué aborda.** Los **dos bloqueantes confirmados en runtime** que hoy impiden versionar un `Curriculum(Plan)`:
- **H-7:** el create del ext-base crashea — `Unknown argument 'updatedById'` en `ext__uplanner__curriculum.create` (la tabla ext solo tiene `curriculumId`; el path de versión le inyecta `updatedById`).
- **H-3:** el create se construye con `objectType=Curriculum` (base) → el RecordType early-return (`instance.resolver.js:2684`) se salta → el payload **no incluye `rt__Plan__curriculum` ni `progression`/`totalCredits`/`totalPeriods`/`periodType`**. Versionar por el alias RT lo bloquea el guard de `prepareVersionData`.

**Alcance.**
- **H-7:** corregir el armado del create del ext-base al versionar para no inyectar `updatedById` (u otros campos audit) en una tabla ext que no los tiene. Verificar también para objetos con ext de custom fields.
- **H-3:** hacer que el versionado del **objeto padre** clone su **proyección RT** reusando `cloneChildProjections` (`deep-clone-polymorphic.js:218-245`, hoy solo para hijos) — el building block existe; aplicarlo al padre versionado. Resolver la tensión base-vs-alias.
- **Atomicidad:** envolver el path RT (`instance.resolver.js:2684-2858`) en `$transaction` (TICKET-056 / backlog B1), o documentar el diferimiento.
- Tests: versionar un Plan → v2 con ext-base OK + extensión RT completa; fallo a mitad no deja base huérfana.

**Criterios de aceptación.**
- [ ] Versionar un `Curriculum(Plan)` produce v2 **con** `rt__Plan__curriculum` poblado (campos heredados del source).
- [ ] El write base+RT del versionado es atómico.
- [ ] Tests de core cubren el caso RT + atomicidad; casos non-RT preservados.

**Dependencias.** E1. **Es prerrequisito de E2** (no tiene sentido copiar hijos si el padre v2 es inválido). **Rollback:** core, `git revert`; feature-gate.

> **Acción recomendada:** confirmar el gap con **SPK-1** (versionar un Plan real y mirar la v2) en la primera mitad de la semana 1. Si el gap se confirma, E4 sube a prioridad máxima del backend; si no (la plataforma ya lo resuelve por otro path), E4 colapsa en verificación.

---

### Épica F — Cobertura MCP (política §1.7) · → **MC-04** (F1, SP5) · **S7-04** (F2, SP6)

> Repo `uplanner/mcp`. Por política, lo desarrollado en SP5 queda operable vía MCP en SP5. **La parte requerida es barata y declarativa** (contratos) — los `cd_*` de dominio son un extra ergonómico (opcional).

---

#### SP5-F1 · Contratos + allowlist de los objetos nuevos (MCP) — REQUERIDO, bajo costo
**Mapea:** política §1.7 · **Tipo:** BE (MCP) · **Estimación:** 3 SP (declarativo)

**Qué aborda.** Con esto **los 3 objetos quedan operables vía MCP** por las tools genéricas (`create_object`/`describe_object`/`query_records`/`get_create_guide`). Es **mayormente declarativo** y barato — el costo real de "estar en el MCP".

**Alcance.**
- `src/contracts/registry.ts`: `ObjectContract` por objeto — `fieldDocs`, `enums`, FK con `references`, validaciones espejo (minCredits≤maxCredits, label requerido, period requerido, guard de borrado). ~40 líneas/objeto (patrón de los 11 contratos existentes).
- `src/mods/index.ts`: 3 objetos al **allowlist**.
- FK polimórfica de `requirement` (ownerType/ownerId) vía `resolveReference` (patrón `Curriculum`, ya existe).
- `get_create_guide`/`describe_object` **auto-derivan** del contrato → sin recetas a mano.
- Tests del contrato.

**Criterios de aceptación.**
- [ ] Los 3 objetos en allowlist + contrato; `describe_object`/`get_create_guide` los describen con enums y FKs.
- [ ] `create_object`/`query_records` operan (CRUD) con validaciones espejo; FK (incl. ownerId polimórfico) resueltas por nombre/código.

**Dependencias.** A1, A2, A3. **Rollback:** quitar entradas de allowlist/registry.

---

#### SP5-F2 · Tools `cd_*` de dominio (MCP) — OPCIONAL (ergonómico)
**Mapea:** política §1.7 (ergonomía) · **Tipo:** BE (MCP) · **Estimación:** 6 SP · **Tier:** Could / SP6

**Qué aborda.** Tools de dominio ergonómicas para los flujos (no CRUD crudo). **No son necesarias para "estar en el MCP"** (F1 ya deja los objetos operables vía tools genéricas); mejoran la experiencia conversacional. Por eso son **opcionales**.

**Alcance (si se priorizan).** `cd_get_curriculum_malla`/`cd_list_plan_entries` (ver malla); `cd_add_courses_to_plan` (obligatorias); `cd_tag_elective_block` (electivas, select-or-create); `cd_create_requirement` (árbol por `parentId`, patrón `sections-write`). + tests.

**Criterios de aceptación.**
- [ ] Las operaciones de malla tienen `cd_*` equivalente ergonómico; el árbol de `requirement` se arma sin nodo-por-nodo crudo.

**Dependencias.** F1 + los flujos de B que cubre. **Rollback:** quitar tools.

> **MCP en el demoable:** **F1 (requerido, 3 SP)** deja los 3 objetos operables vía MCP. **F2 (cd_* ergonómico) es opcional** → tier Could/SP6. La política §1.7 se cumple con F1.

---

### Testing — parte de la labor de cada tarea (Definition of Done)

> **Política (2026-06-23):** **todo lo que se pueda testear lleva sus tests**, como parte de la labor de cada ticket. **NO suma SP aparte** — las estimaciones recalibradas (§4.1) **ya asumen el trabajo con tests incluido**. Esta sección define qué tipo de test aplica a cada tipo de tarea, anclado a las convenciones reales de up1, para que el dev lo considere desde el inicio (no como un extra al cierre).
>
> **Dos DoD transversales:** (1) **Tests** = parte de cada ticket, sin SP extra. (2) **Cobertura MCP** (política §1.7) = los objetos van al MCP vía contrato declarativo (**F1, ~3 SP, barato**); requerido. Los `cd_*` ergonómicos (F2) son opcionales. Ambos DoD obligatorios para "lo desarrollado en el SP" (el MCP, en su versión mínima de contratos, es de bajo costo).

| Tipo de tarea | Tests que lleva (DoD) | Dónde / patrón real | Tickets |
|---|---|---|---|
| **BE — objeto nuevo / campo** | Unit del resolver: validaciones, FKs, derivaciones, guards. Assertions con valores concretos. | `mods/curriculum-design/tests/unit/*.test.js` (copiar `curriculumCreate.test.js`, `polymorphicUpdate.test.js`). Stubs en `tests/stubs/`. | BE-0, BE-1, A1, A2, A3, A4 |
| **BE — lógica de negocio puntual** | Unit de la regla concreta. | idem unit del mod | A2 (`minCredits≤maxCredits`, delete guard), A1 (`credits` efectivo, electividad derivada), A3 (persist/reconstruct árbol) |
| **BE — registro/config** | Smoke de que los objetos cargan y son consumibles (sync limpio + query). | verificación E2E manual + `tests/integration/` si aplica | A5 |
| **BE — core (versionado/cascada)** | **Unit** (extender `version-from-source-helper`, `deep-clone-polymorphic`) **+ e2e** (extender los existentes). | `object-manager/tests/unit/resolvers/*.test.js` + **`object-manager/tests/e2e/version-asnewversion.test.js`** y `clone-*-children.test.js` (¡ya existen, se extienden!) | E1, E2, E3, E4 |
| **BE+FE — validación** | Unit del check (Draft permite / publicado bloquea) con dato concreto. | unit del mod | D2 |
| **FE — componente** | Extraer lógica pura a `.ts` (grid/tree ops, builders, validadores, derivación electividad, filtro) → **`.spec.ts`** unit; + **stories** de los estados del componente. | patrón `CompositeSectionTree` (`treeOps.ts`+`validateWeightedSum.spec.ts`+`*.stories.ts`) | B1–B9, C1–C4, D1, D3 |
| **FE — lógica de dominio nueva** | Unit de la función pura (no del .vue). | `.spec.ts` junto al módulo | **B6** (checker de prereqs faltantes), **B5** (derivación de bloque/electividad), **B8** (recálculo `period`/`position`), **B9** (lógica de filtro) |

**Notas:**
- La **lógica testeable se extrae a módulos `.ts` puros** (como hace `CompositeSectionTree`): el render del `.vue` se cubre con stories; la lógica (cálculos, validaciones, derivaciones) con `.spec.ts`. Esto es lo que hace los componentes de malla realmente testeables pese a los modales caseros.
- **Alto valor para la Épica E:** ya existen `version-asnewversion.test.js` y `clone-*-children.test.js` en core — E2/E4 **extienden** esos e2e (caso Curriculum con extensión RT + hijos), no parten de cero.
- **Regresión obligatoria** (DET-7): cada bug confirmado (H-3, H-7) deja su test que falla antes y pasa después del fix.
- **Cobertura empírica** (DET-31): los tests deben *morder* (assertions con valores concretos que fallen si la condición no se cumple), no solo verificar que “no explota”.

## 4. Distribución del sprint y escenarios de capacidad

### 4.0 Clasificación por origen: núcleo estipulado vs. extra emergente

> Criterio (decisión 2026-06-23): SP5 se compromete con **lo estipulado** (reunión + handoff + el carryover que se incorporó explícitamente). Lo que **emergió de la validación, más allá de lo estipulado** se marca **EXTRA SP5**: entra **solo si queda capacidad**; si no, pasa a **SP6**. Esto protege el compromiso del sprint de los imprevistos que el propio análisis destapó.

#### 🟢 Núcleo SP5 — estipulado (de las fuentes: reunión + handoff)
La **feature de malla**, que es lo acordado en `historias-malla_v1.md` y la reunión:
- **Track 0:** BE-0 (enum `progression`) + **BE-1 (`isCurrent` en Activity)** — próximos pasos de la reunión.
- **Épica A (objetos):** A1, A2, A3, A4, A5 — handoff Épica A.
- **Épica B (malla):** B1–B9 — handoff Épica B.
- **Épica C (líneas):** C1–C4 — handoff Épica C.
- **D2** (validación restrictiva en planes publicados) — próximo paso explícito de Esteban en la reunión.
- **Épica F1 (cobertura MCP, requerida §1.7, bajo costo ~3 SP):** contratos + allowlist de los 3 objetos → operables vía MCP. (Los `cd_*` ergonómicos = F2, opcional.)

> El núcleo estipulado recalibrado (≈44 SP malla + ~3 SP MCP contratos = **~47 SP**) → **SP5 toma una rebanada demoable** (escenario §4.2, ~34 SP de malla) y el resto **fluye a SP6 por capacidad**. La cobertura MCP requerida es barata (declarativa).

#### 🟡 Extra SP5 — emergente (si hay capacidad; si no → SP6)
Lo que **salió de la validación / mockup, más allá de lo estipulado**:
- **Épica E completa (versionado/clonado con hijos).** Se incorporó como carryover de SP4 dando por hecho que "casi estaba". La **validación en vivo probó lo contrario**: versionar un Curriculum **crashea** (H-7) y dropea el RT (H-3) → requiere **E4, trabajo de core NO anticipado**. Como E1/E2/E3 **dependen de E4**, **toda la Épica E queda condicionada a ese fix emergente**. → **EXTRA SP5; candidata fuerte a SP6.**
- **Épica D editor (D1, D3).** El editor de requisitos a nivel `Activity` + modal de impacto. **No estaba en las épicas del handoff** (que scopea `requirement` a "solo modelar/persistir"); emergió del mockup + reunión. → **EXTRA SP5.**
- **Atomicidad del path RT** (`$transaction`, TICKET-056) — emergente, vive dentro de E4. → EXTRA SP5.

#### ⚪ SP6 — diferido explícito (fuera de alcance ya declarado en el handoff)
Planes modulares; `milestone`/`specialization`/`planEntrySpecialization`; motor de ejecución (degree-audit); RecordTypes futuros de `requirement` (`AttributeMatch`, etc.); lógica completa de versión vigente (`current`, BL-1). **No se consideran SP5 ni extra SP5.**

> **Implicación práctica:** el compromiso de SP5 es la **rebanada demoable de la malla** (§4.2). La **Épica E** —aunque se quiso incorporar— se reclasifica a **extra/SP6** porque la validación reveló que su entrega depende de un fix de core no estipulado (E4). El **bug H-7** se puede atender aislado y barato si se decide desbloquear el versionado base sin el resto de E.

### 4.1 Totales por épica (estimaciones RECALIBRADAS · 2026-06-23)

> **Recalibración a la baja.** Las estimaciones originales eran conservadoras. Se ajustan porque: (a) los objetos siguen un **patrón establecido** copiable de `CurricularSection`/`Activity` (FK polimórfica, self-FK, multi-RT ya en producción); (b) el componente de malla tiene un **precedente directo** (`CompositeSectionTree`: full-page + GraphQL + sortablejs + modales); (c) el **motor de cascada ya existe** en core (E2 = config, no construir). Los headers de los tickets en §3 muestran la estimación original; **esta tabla es la autoritativa**.

| Track / Épica | SP BE | SP FE | Total |
|---|---:|---:|---:|
| Track 0 (BE-0 enum `progression` 1 + **BE-1 `isCurrent` 1**) | 2 | – | 2 |
| Épica A — Objetos (A1 3 + A2 2 + A3 5 + A4 2 + A5 2) | 14 | – | 14 |
| Épica B — Malla (B1 3, B2 1, B3 1, B4 3, B5 3, B6 2, B7 2, B8 3, B9 2) | – | 20 | 20 |
| Épica C — Líneas (C1 1, C2 2, C3 1, C4 1) | – | 5 | 5 |
| Épica D — D2 3 (núcleo) · D1 5 + D3 2 (extra) | 2 (D2) | 7 (D1+D3+D2fe) | 9 |
| Épica E — Versionado con hijos (E1 1 + E2 5 + E3 2 + E4 5) | 13 | – | 13 |
| Épica F — MCP: **F1 contratos 3 (requerido)** · F2 `cd_*` 6 (opcional) | 3 + (6) | – | 3 (+6 opc.) |
| **Núcleo SP5 (BE-0/1 + A + B + C + D2 + F1)** | **21** | **26** | **47 SP** |
| **Total con extras (E + D editor + F2)** | **40** | **33** | **73 SP** |

**Recalibración por ticket (original → nueva):** BE-0 2→1 · A1 5→**3** (solo secuencial, modular→SP6) · A2 3→2 · A3 8→**5** · A4 3→2 · A5 2→2 · B1 5→3 · B2 2→1 · B3 2→1 · B4 5→3 · B5 5→3 · B6 3→2 · B7 3→2 · B8 5→3 · B9 3→2 · C1 2→1 · C2 3→2 · C3 2→1 · C4 2→1 · D1 8→5 · D2 5→3 · D3 3→2 · E2 8→5 · E4 5→5. **Nuevo: BE-1 (`isCurrent`) = 1.**

> **Lectura:** la malla recalibrada es ~44 SP; **la cobertura MCP requerida (F1 contratos) suma solo ~3 SP** (declarativo) → núcleo SP5 = **~47 SP** (21 BE / 26 FE). El **demoable formal** (§4.2) sigue siendo **~34 SP** (malla Must+Should); F1 (3 SP, MCP) corre en paralelo como deliverable requerido de bajo costo. Extras: E (13), editor D1/D3 (7), `cd_*` ergonómico F2 (6, opcional) → total con todo **73 SP**. **Meter los objetos al MCP es barato** (contratos); solo los `cd_*` de dominio costarían, y son opcionales.

### 4.2 SP5 completo vs. SP5 demoable — qué se alcanza a mostrar

Dos alcances distintos. Ambos comparten la base de objetos (Épica A, backend); la diferencia es **cuánto del componente de malla** se construye encima.

#### A) SP5 completo (núcleo estipulado) — la feature de malla entera

Todo lo acordado en el handoff + reunión (**~44 SP recalibrado**; ~70 original → ~1.5 sprints): BE-0 + BE-1 + Épica A (A1–A5) + Épica B (B1–B9) + Épica C (C1–C4) + D2. **Con esto se puede mostrar la malla completa:** ver, modo edición, resumen, agregar obligatorias **y electivas (bloques)**, **bloqueo por prerrequisitos**, editar/quitar, **drag&drop entre períodos + agregar período**, **filtros por línea y por bloque electivo**, y la pestaña Líneas de formación con CRUD completo (incluido borrado con guard).

#### B) SP5 demoable — la rebanada que cabe en un sprint (~34 SP · Must+Should)

El demoable formal de SP5 es la **malla editable con obligatorias + electivas + filtros + líneas de formación**. Se organiza en tres tiers (MoSCoW) para ser honestos sobre qué se compromete vs. qué es stretch dentro del mismo sprint.

**🅼 MUST — compromiso firme (~27 SP · 14 BE / 13 FE).** Sin esto no hay demo coherente.

| Orden | Tickets | SP | Dev |
|---|---|---:|---|
| 1 (sem. 1) | BE-0, BE-1 (`isCurrent`), A1, A2 | 7 | BE |
| 2 (sem. 1–2) | A3, A5 | 7 | BE |
| 3 (paralelo desde sem. 1) | C1, C2, B1, B2, B3 | 8 | FE |
| 4 (sem. 2) | B4, B7 | 5 | FE |

**🆂 SHOULD — objetivo del demo (+7 SP · +2 BE / +5 FE → ~34 SP).** Lo que eleva el demo de "básico" a "vendible".

| Tickets | SP | Dev | Aporta al demo |
|---|---:|---|---|
| A4 + B5 | 2 BE + 3 FE | BE/FE | **Agregar electivas** a un bloque OptionPool con nombre |
| B9 | 2 FE | FE | **Filtros** por línea de formación y por bloque electivo |

**➕ Cobertura MCP requerida (F1, ~3 SP BE, bajo costo).** Por política §1.7, los 3 objetos quedan operables vía MCP — pero es **declarativo** (contratos), corre en paralelo y **no cambia el alcance visible del demoable**. Los `cd_*` ergonómicos (F2) son opcionales (Could).

**🅲 COULD — si el velocity sobra (no comprometido).** En orden de valor: B6 (bloqueo por prereqs, +2) · B8 (drag&drop + agregar período, +3) · C3+C4 (borrar línea con guard + integración fina, +2) · D2 (validación restrictiva, +3, backend) · **F2 `cd_*` ergonómicos (+6)**.

> **Total demoable formal ≈ 34 SP** (malla Must+Should: 16 BE / 18 FE) **+ F1 MCP (~3 BE, requerido, declarativo)**. Para 2 devs en ~2 semanas es plausible. El tier Could se decide al cierre de la semana 1; F1 (MCP contratos) es requerido pero barato; F2 (`cd_*`) es Could.

#### ✅ Lo que se VE en pantalla (Must + Should)

1. **Abrir un plan y ver su malla** por períodos: tarjetas con código, créditos, línea de formación (color) y badge "electivo". *(B1)*
2. **Barra de resumen** del plan: créditos diseño/requeridos, períodos, n.º de asignaturas. *(B3)*
3. **Entrar en modo edición** (visible solo si el estado del plan lo permite). *(B2)*
4. **Agregar asignaturas obligatorias** — modal 2 pasos: tipo → catálogo con **filtro por departamento** y multiselección (mostrando cursos `isCurrent`) → quedan en el período con su línea y créditos heredados. *(B4 + BE-1)*
5. **Agregar electivas** — al elegir "Opcional", asignarlas a un **bloque electivo con nombre** (autocompletado de bloques del plan); el badge y el filtro de electivos se derivan solos. *(B5)*
6. **Editar o quitar** una asignatura colocada (créditos, línea, rol obligatoria/electiva, quitar). *(B7)*
7. **Filtrar la malla** con chips: resaltar/atenuar por **línea de formación** y por **bloque electivo**. *(B9)*
8. **Pestaña "Líneas de formación":** ver el listado y **crear/editar** una línea (nombre, código, créditos, color). *(C1, C2)*

#### ❌ Lo que NO entra en el demoable formal

- **Bloqueo por prerrequisitos al agregar** *(B6 — tier Could)*.
- **Drag & drop entre períodos + "Agregar período"** *(B8 — tier Could)*.
- **Eliminar línea con guard** e integración fina *(C3/C4 — tier Could)*.
- **Validación restrictiva** en planes publicados *(D2 — backend, tier Could)*.
- **Versionado/clonado** (Épica E) y **editor de requisitos del curso** (D1/D3) — extra/SP6.

**En una frase:** el demoable formal muestra *“abrir un plan, ver su malla por períodos, entrar en edición, agregar asignaturas **obligatorias y electivas** del catálogo (electivas en bloques con nombre), editarlas/quitarlas, **filtrar por línea y por bloque**, y gestionar las líneas de formación”*. Queda fuera (tier Could/SP6): bloqueo por prereqs, drag&drop, versionado.

### 4.3 Escenario "feature completa" (multi-sprint)

- **SP5 (demoable formal, §4.2 Must+Should):** Track 0 (BE-0, BE-1) + Épica A completa (A1–A5) + Épica B (B1–B5, B7, B9) + Épica C (C1, C2) + **F1 (contratos MCP, requerido ~3 SP)**. ≈37 SP (34 malla + 3 MCP).
- **SP5 tier Could (si sobra velocity):** B6 (bloqueo prereqs), B8 (drag&drop), C3/C4, D2, **F2 (`cd_*` MCP ergonómicos)**.
- **SP6:** tier Could que no entró + Épica E completa (versionado, gated por E4) + Épica D editor (D1/D3) + `planEntry` modular (BL-6) + lógica de vigencia automática (BL-1).

**Recomendación:** comprometer el **demoable formal (Must+Should, §4.2)** y revisar velocity al cierre de la semana 1 para decidir el tier Could. Notas de prioridad sobre lo **extra/SP6**:
- **E4** es el item extra más **barato y de alto valor aislado**: arreglar H-7 (crash del ext-base) desbloquea versionar planes (aún sin hijos). Si se quiere algo de Épica E antes, que sea E4+E1.
- **E2** (deep-copy de hijos) depende de E4 **y** de toda la Épica A → realista a **SP6**.
- **D2** (validación restrictiva) protege integridad de planes publicados; si no entra en el Could, priorizarla temprano en SP6.

---

## 5. Decisiones abiertas (confirmar antes de codear)

1. ~~**Alcance de Épica D en SP5.**~~ **RESUELTO por la clasificación §4.0:** **D2** (validación restrictiva) = núcleo SP5 (próximo paso de la reunión); **D1/D3** (editor de requisitos + modal de impacto) = **extra SP5** (emergente del mockup, si hay capacidad; si no → SP6).
2. ~~**`color`/`icon` de `requirementCategory`.**~~ **RESUELTO (2026-06-23): modelar AMBOS con los valores de la maqueta.** `color` = token tema up1 (`var(--up1-color-*)`) o hex; `icon` = bootstrap-icons (`bi-*`). El modal de la maqueta ya tiene picker "Color e ícono". Seed de ejemplo: Núcleo / Habilidades Profesionales / Electivos de Profundización / Proyecto de Grado.
3. ~~**`kind` de `planEntry`.**~~ **RESUELTO (2026-06-23): enum {Course, Internship, Thesis} en el modelo; UI crea solo `Course`.** Internship/Thesis reservados para futuro, sin seed especial.
4. ~~**MCP `cd_*` (A5).**~~ **RESUELTO por política §1.7:** lo desarrollado en SP5 **debe** quedar cubierto en el MCP en SP5 → **Épica F (F1 contratos + F2 `cd_*`), requerida, no diferible.** (Revierte el deferral previo.) La malla en la UI consume GraphQL del mod; el MCP es la vía conversacional/programática, obligatoria por política.
5. ~~**Ids Jira.**~~ **RESUELTO (2026-06-23): se asignan al crear los tickets en Jira.** El `UPONE-XXXX` de cada historia es placeholder; al crear se reemplaza por el id real (usado en commits/branches/PR, DET-19). Pendiente operativo: definir si SP5 es epic nuevo o cuelga del de curriculum-design (al crear).
6. ~~**E1: enfoque Alt A (core) vs Alt B (mod-táctico).**~~ **RESUELTO (2026-06-23): Alt A — fix en core.** El equipo autoriza modificar core tanto para clonado como para versionado. Se descarta el parche táctico en el mod (Alt B). Implica rama de épica core + review del team (RULE-dev-004). Esto **también destraba E2** (ver decisión 8).
7. ~~**Bug de navegación post-guardar (SP4, `openMode: route`).**~~ **RESUELTO (ya corregido).** El bug fue arreglado fuera de este alcance; no requiere ticket en SP5. El doc `../sp4/UPONE-1270-navegacion-post-guardar-curriculum-route-mode.md` queda como histórico (resuelto).
8. ~~**E2: cascada genérica en core vs custom en el mod.**~~ **RESUELTO (2026-06-23): cascada genérica config-driven en core.** El deep-copy de hijos vive en core, declarado por metadata del objeto contenedor (relaciones hijo a copiar + campos FK a remapear). Reusable para cualquier contenedor futuro; consistente con el versionado config-driven de SP4. Se descarta la copia custom en el mod.

> Per regla global (presentar opciones, no elegir por el dev), las pendientes quedan para confirmación. Estado: **TODAS RESUELTAS.** 1 (§4.0), 2 (color+ícono de la maqueta), 3 (enum, UI solo Course), 4 (cobertura MCP §1.7), 5 (ids al crear tickets), 6 (core/Alt A), 7 (bug route ya corregido), 8 (cascada en core). **No quedan decisiones de producto abiertas.**

---

## 6. Riesgos y backlog

### 6.1 Riesgos

| Riesgo | Dónde | Mitigación |
|---|---|---|
| `requirement` (A3) es el objeto más complejo; subestimarlo bloquea B5/B6/D. | BE | Empezar A3 temprano; seed EST200 como prueba de árbol antes de la UI. |
| **Calibración histórica: subestimamos ~30-38%** (SP4/SP4 ratio exec/est ~121-131%). El análogo de A3 (ticket-009, objeto multi-RT) ejecutó ×3.5. | Planificación | Tratar A3 (5 SP) como **piso, no techo** (5-8); el costo pionero ya está pagado (H-4) pero la complejidad persiste. No comprometer el tier Could (es el amortiguador). Ver `SP5-alcance-y-justificacion.md` §5. |
| Sobrecarga: la feature completa con todo (~73 SP) excede un sprint → no se cierra nada demoable. | Planificación | Comprometer el demoable formal §4.2 (~34 SP malla + ~3 MCP); revisar velocity a mitad de sprint. |
| El BE concentra A + E + F (objetos, versionado, MCP) → posible cuello de botella. | Planificación | F1 (MCP) es chico y declarativo; F2 (`cd_*`) es opcional. FE (B/C) corre en paralelo. Vigilar, no es crítico. |
| Cambios en `progression` (string→enum) rompen lecturas existentes. | BE-0 | Análisis de impacto colateral + sync limpio en UPU. |
| Drag&drop (B8) y árbol de requisitos (D1) son los FE más caros. | FE | Diferibles; no están en el camino crítico del MVP. |
| Validación restrictiva (D2) mal calibrada bloquea edición legítima en Draft. | BE | Test explícito Draft-permite / publicado-bloquea. |
| No commitear artefactos de sync/seed (Base, schema, typeDefs). | BE | Recordatorio en cada cierre (memoria `feedback_up1_dont_commit_sync_seed_artifacts`). |
| E2 (deep-copy de hijos) con FKs mal remapeadas → v2 referencia datos del plan original (corrupción silenciosa). | BE | `applyDerivedRemap` (motor existente) + test que verifica que ningún hijo de la v2 apunta a ids del source. |
| E2 depende de toda la Épica A + E4; si A o E4 no cierran, E2 no entra. | Planificación | Tratar E2 como último de BE; E1 (verificación) se cierra igual. |
| **H-3 (BLOQUEANTE, PROBADO EN VIVO) · versionar un Plan no arrastra la extensión RT (`rt__Plan__curriculum`).** | BE core | **E4**. SPK-1 ya ejecutado: el create payload omite `progression`/`totalCredits`/`totalPeriods`/`periodType`. Sin RT la v2 nace sin campos temporales → malla rota. |
| **H-7 (BLOQUEANTE, PROBADO EN VIVO) · versionar un Curriculum crashea en el write del ext-base (`Unknown argument updatedById`).** | BE core | **E4**. La tabla `ext__uplanner__curriculum` solo tiene `curriculumId`; el path de versión inyecta `updatedById`. Versionar falla hoy incluso antes del problema del RT. |
| ~~H-4 · layouts por RecordType sin precedente~~ **RESUELTO** | — | Ya hay precedente productivo en el mod: 19 layouts `default_rt__*__curricularsection_*` committeados; `resolveDefaultLayout` los resuelve por convención. `requirement` copia el patrón. Sin riesgo. |
| **H-5 · FK polimórfica `ownerType/ownerId` sin integridad referencial (convención, no enforcement).** | BE | Validación en el resolver del mod al crear `requirement`; o aceptar convención y documentar deuda. |
| **H-6 · `ModalStackManager` no expuesto a Vueform elements (BUG-platform-011).** | FE | Modales caseros con átomo `Modal` (patrón `CompositeSectionTree`). Riesgo de complejidad del flujo 2 pasos, no de inviabilidad. |
| B4 filtra por departamento vía `executionUnitId` → **OrgUnit** (objeto del mod `uengagement-up1`, cross-mod). | FE | Confirmar acceso al catálogo OrgUnit desde el picker (query cross-mod). |

### 6.2 Backlog (registrado, no implementar en SP5)

- **BL-1 · Lógica automática de versión vigente (`isCurrent`/`current`).** El **flag** `isCurrent` en Activity se implementa en SP5 (ver **BE-1**), como booleano simple. Lo que queda en backlog es la **lógica automática**: que al versionar se gestione el `isCurrent` del linaje (marcar la nueva, desmarcar la anterior) y extenderlo a `Curriculum`. SP6.
- **BL-6 · `planEntry` en planes modulares.** `period` nullable + derivación de orden por el DAG de prerrequisitos. Separado de A1 (que en SP5 es solo secuencial). SP6.
- ~~**BL-2 · Versionado/clonado de la malla.**~~ **Promovido a alcance SP5 → Épica E** (por la creación de `planEntry`). Ya no es backlog.
- **BL-3 · Planes modulares.** Niveles derivados del DAG de prerrequisitos; `period` nullable ya queda modelado en A1. SP siguiente.
- **BL-4 · RecordTypes futuros de `requirement`.** `AttributeMatch` (programa/cohorte/consentimiento) + más targets de RecordState (milestone/competency/event) + más métricas (GPA, PeriodIndex…). Diseño ya es enum extensible.
- **BL-5 · Motor de ejecución de reglas** (degree-audit / avance en vivo).

---

## 7. Anexos

- `auditoria-viabilidad_2026-06-23.md` — **auditoría técnica pre-sprint contra el código real**: bloqueante H-3 (proyección RT), sorpresas H-1/H-2 (fix ya aplicado, motor de cascada ya existe), riesgos H-4/H-5/H-6, confirmaciones C-1..C-10 y spikes SPK-1/2/3. **Leer antes de arrancar.**
- `decisiones-reunion_2026-06-23.md` — decisiones de la reunión con timestamps.
- `sources/historias-malla_v1.md` — handoff de historias + modelo de datos (fuente de §3).
- `sources/mockup_v10.html` — maqueta funcional v10 (referencia de UI; líneas citadas en los tickets FE).
- `sources/reunion-inicio-sprint_2026-06-23.pdf` — transcripción completa (respaldo).
