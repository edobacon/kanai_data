---
id: DOC-kb-sp5-mcp-malla-coverage-gap
project: up1
type: doc
---

# Cobertura MCP de la Malla Curricular — estado y gaps (SP5)

> **Objetivo:** que el usuario pueda usar, **desde el MCP** (`up1-mcp` / Elric), las capacidades del componente de malla curricular (`CurriculumMesh`) construido en SP5 (MC-02…MC-09 + TICKET-098).
> **Método:** validado **en vivo** el 2026-07-01 contra la sesión MCP activa (tenant UPU) — `list_object_types`, `describe_object`, `get_create_guide`, `query_records`. No se ejecutaron mutaciones (writes) durante la auditoría.
> **Fuente de diseño:** MC-04 ([TICKET-084](../../../deckard/projects/up1/tickets/TICKET-084.md)) registró los objetos para MCP; decidió **diferir las tools dedicadas `cd_*` de la malla a SP6** ("CRUD genérico basta").

---

## 1. Resumen ejecutivo

| Capa | Estado vía MCP |
|------|----------------|
| **Datos** (planEntry, requirementCategory, requirement) | ✅ **Cubierto** por CRUD genérico + `get_create_guide` + enrichment de lectura |
| **Reglas de negocio** (guard MC-09, rango de créditos, guard de borrado) | ⚠️ **Se aplican en runtime**, pero **NO** se documentan en `describe_object` / `get_create_guide` |
| **Tools dedicadas de malla** (`cd_add_entry`, `cd_get_mesh`, …) | ❌ **No existen** (diferidas a SP6 por MC-04) — hoy solo CRUD genérico crudo |
| **Frontend** (render de malla, alerta "no editable", `canEdit`, agrupación por período) | ❌ **Fuera de MCP** (es UI) — pero las **operaciones de datos** subyacentes sí están |
| **Layout de la malla** (config) | ❌ `view_*` solo cubre RecordList (fase 1); la malla es componente custom + RecordDetail (fase 2) |

**Conclusión:** el usuario **ya puede** operar la data de la malla desde el MCP (crear/editar/quitar asignaturas, bloques, líneas de formación, requisitos, y leer la malla con sus derivados), pero **debe conocer la forma cruda de los objetos y el orden de los pasos**, y **no recibe aviso previo de los guards**. Para paridad real con el componente falta: (a) exponer los guards en los contratos, (b) tools dedicadas orquestadas de malla, (c) una lectura agregada de la malla.

---

## 2. Lo que SÍ se tiene (verificado en vivo)

### 2.1 Objetos registrados y operables

Los 3 objetos de la malla aparecen en `list_object_types` y exponen **CRUD genérico completo** (`relatedTools`: `list_objects`, `get_object`, `query_records`, `create_object`, `update_object`, `delete_object`) + receta en `get_create_guide`:

| Objeto | Label | requiredOnCreate | Notas |
|--------|-------|------------------|-------|
| `planEntry` | Entrada de plan | planId, activityId, kind, period | FK: planId→Curriculum, activityId→Activity, categoryId→requirementCategory; `blockId` deriva electividad |
| `requirementCategory` | Línea de formación | curriculumId, name, minCredits | color/icon/maxCredits/position; enrichment de lectura (ver 2.3) |
| `requirement` | Requisito | ownerType, ownerId, recordType, effect, label | árbol Composite (Group/RecordState/MetricThreshold); `recordType` readonly; bloque electivo = Group con ownerType=curriculum |

### 2.2 Mapa: capacidad del componente ↔ MCP

| Capacidad del componente `CurriculumMesh` | Cómo se hace por MCP | Estado |
|---|---|---|
| **Ver malla** (asignaturas por período) | `query_records` `planEntry` filtro `planId` (+ `Curriculum`, `requirementCategory`) | ✅ datos — ⚠️ el cliente arma la agrupación por período (no hay `get_mesh`) |
| **Ver líneas con créditos/estado derivados** | `query_records` `requirementCategory` → `currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus` | ✅ **verificado en vivo** |
| **Agregar asignatura obligatoria** a un período | `create_object` `planEntry` (planId, activityId, kind, period, categoryId?) | ✅ + `get_create_guide` |
| **Agregar asignatura electiva** | `create_object` `requirement`(Group) = bloque → `create_object` `planEntry` con `blockId` | ✅ pero **2 pasos manuales**, sin orquestación atómica |
| **Crear bloque electivo** | `create_object` `requirement` (recordType=Group, ownerType=curriculum, ownerId=planId, combinator, minToSatisfy, label) | ✅ |
| **Editar asignatura** (créditos override, categoría, rol, bloque) | `update_object` `planEntry` | ✅ |
| **Quitar asignatura** | `delete_object` `planEntry` | ✅ |
| **CRUD líneas de formación** | `create/update/delete/query` `requirementCategory` | ✅ (+ guard de borrado en runtime) |
| **Árbol de requisitos** (Group/RecordState/MetricThreshold) | `create/update/delete` `requirement` + `get_create_guide` | ✅ persiste y lee (motor de evaluación = SP6) |
| **Bloqueo restrictivo en planes publicados (MC-09)** | runtime en `create/update` de requirement(owner=activity) | ✅ **se aplica** — ⚠️ no documentado (ver 3) |
| **Validación rango de créditos (MC-02)** | runtime en `create/update` requirementCategory | ✅ se aplica — ⚠️ no documentado |

### 2.3 Evidencia — el enrichment de lectura llega por MCP

`query_records requirementCategory` (plan ICIV-2026) devolvió, por fila, además de los campos persistidos:

```json
{ "name": "Habilidades Profesionales", "minCredits": 30, "maxCredits": 60,
  "currentCredits": 0, "mandatoryCount": 0, "electiveCount": 0, "creditStatus": "under",
  "color": "var(--up1-color-info-500)", "icon": "bi-tools" }
```

→ Los derivados de MC-02/MC-07 (`currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus`) **se calculan en el resolver de lectura y llegan por MCP** sin trabajo extra.

---

## 3. Lo que NO se tiene (gaps para cerrar este sprint)

| # | Gap | Impacto para el usuario | Costo |
|---|-----|-------------------------|-------|
| **G1** | `describe_object` / `get_create_guide` **no advierten los guards** (MC-09 bloqueo en Active, rango de créditos, borrado con entries). `validations: {}` y `usesValidatedMutations: {}` en los 3 objetos. | El usuario/LLM no sabe que existe la regla hasta que el `commit` falla. Rompe el "guía antes de enviar". | **Bajo** (config/notes) |
| **G2** | **Sin tools dedicadas de malla** (`cd_*`). Solo CRUD genérico crudo. | El usuario debe conocer la forma exacta de cada objeto y el **orden** de operaciones; no hay "agregar asignatura a la malla" como acción. | Medio |
| **G3** | **Electiva en 2 pasos** (crear bloque → crear entry con blockId) sin orquestación. | Si el paso 2 falla, queda un bloque huérfano; el usuario debe encadenar manualmente. | Medio |
| **G4** | **Sin lectura agregada de la malla** (`get_mesh`): hoy son 3 queries (`planEntry` + `requirementCategory` + `Curriculum`) + armado por período en el cliente. | Para "ver la malla" el usuario arma la vista a mano. | Medio |
| **G5** | **Estado editable / `canEdit`** no consultable por MCP (es lógica FE, `EDITABLE_STATUSES` no se expone). | El usuario no puede preguntar "¿este plan es editable?" antes de mutar; solo lo infiere del `status`. | Bajo |
| **G6** | **FE puro** (render de malla, alerta "no editable", modal de bloque, chips de color) — no aplica a MCP. | Ninguno directo (son superficies UI); las operaciones de datos ya están cubiertas. | N/A |
| **G7** | **Layout de la malla no configurable** por MCP (`view_*` = RecordList fase 1; la malla es componente custom + RecordDetail = fase 2). | No se puede crear/editar la "vista malla" por MCP. | Alto (fase 2) |

---

## 4. Propuesta de implementación (este sprint)

Para llevar la malla a **paridad operable desde MCP**, en orden de valor/costo. Sugerencia: un ticket nuevo tipo `implement` en `uplanner/mcp/` (+ posible aporte en `mods/curriculum-design/` para exponer metadata de guards), linkeado a la épica **UPONE-1267**.

**Fase A — barato, alto valor (cierra G1, G5):**
- [ ] **A1.** Exponer los guards en `describe_object` / `get_create_guide` (`notes` + `validations`): MC-09 (no editar requisitos de asignatura en plan `Active` → versionar), rango de créditos (min≤max), borrado de línea con entries ("reasigna primero"). Así el usuario los ve **antes** de commitear.
- [ ] **A2.** Exponer el criterio de editabilidad del plan (`EDITABLE_STATUSES`) — p.ej. un campo derivado `isEditable` en la lectura de `Curriculum`, o una nota en el guide — para que el usuario sepa si el plan admite cambios.

**Fase B — tools dedicadas de malla (cierra G2, G3, G4):**
- [ ] **B1.** `cd_get_mesh(curriculumId)` — lectura agregada: entradas agrupadas por período + líneas con derivados + resumen (créditos del diseño). Reusa el enrichment ya existente.
- [ ] **B2.** `cd_add_plan_entry(...)` — agregar asignatura (obligatoria o electiva) resolviendo por nombre/código; para electiva acepta `blockId` **o** `newBlockName` (orquesta: crea el bloque `rt__Group__requirement` y luego la entrada, atómico → cierra G3).
- [ ] **B3.** `cd_update_plan_entry` / `cd_remove_plan_entry` — editar (créditos/categoría/rol/bloque, con la misma opción de crear bloque nuevo que el componente — paridad con TICKET-098) y quitar.
- [ ] **B4.** (opcional) `cd_manage_formation_line` — CRUD de línea de formación con la validación de rango y el guard de borrado surfaceados.

**Fase C — fuera de alcance de este sprint (documentar como diferido):**
- Configurar el **layout de la malla** por MCP (G7) → depende de RecordDetail en MCP (fase 2).
- El **motor de evaluación** de requisitos → SP6.

**Criterio de aceptación del ticket:** desde una sesión MCP, un usuario puede (1) ver la malla de un plan con sus derivados, (2) agregar una asignatura obligatoria y una electiva (creando el bloque en el acto), (3) editarla y quitarla, (4) recibir el mensaje de bloqueo MC-09 al intentar editar requisitos de una asignatura en un plan `Active`, todo **sin conocer la forma cruda de los objetos**.

---

## 5. Notas de precisión

- **El guard MC-09 SÍ se aplica hoy por MCP** aunque no se documente: vive en el override del resolver (`sectionValidation.createInstance` / `polymorphicUpdate.updateInstance`, CONSTRAINT H7), y el `create_object`/`update_object` genérico del MCP pasa por ese override. Verificado por los unit tests de TICKET-089; confirmable en vivo con un `commit` real (no ejecutado en esta auditoría para no escribir datos).
- **Patrón de mutación MCP:** `preview→commit` — la tool sin `confirm` devuelve preview sin mutar; con `confirm:true` ejecuta. Los guards corren en el commit.
- **Estado SP5 al 2026-07-02:** MC-01…MC-07 closed; **MC-08 ([TICKET-088](../../../deckard/projects/up1/tickets/TICKET-088.md)) implementado y cerrado** (filtros + rollup + prereqs + drag&drop + períodos + fixes de smoke S1–S5); MC-09 closed; TICKET-098 cerrado.

---

## 6. Delta de MC-08 (TICKET-088) — nuevos gaps + principio transversal

> Agregado 2026-07-02 tras cerrar MC-08. La auditoría original (§1–§4) se hizo el 2026-07-01, **antes** de que MC-08 entregara su alcance completo (5 REQs + fixes de smoke). MC-08 construyó lógica de dominio nueva que hoy **no tiene paridad MCP**. Estos gaps se incorporan a [TICKET-099](../../../deckard/projects/up1/tickets/TICKET-099.md).

### 6.1 Capacidades nuevas de MC-08 y su estado MCP

| Capacidad `CurriculumMesh` (MC-08) | ¿Persiste? | Paridad MCP | Gap |
|---|---|---|---|
| **Pre-check de prerrequisitos al agregar**: bloquea si un prereq-curso (`RecordState`, timing Before/Either) NO está en período anterior, o un `Group` K-de-N tiene miembros ausentes. **`MetricThreshold` (créditos) NO alerta** — check **estructural** (ubicación), no transcript (H2). Modal lista faltantes por **código legible**. | valida antes de mutar | ❌ | **G8** |
| **Mover asignatura entre períodos** (drag&drop): recalcula `position` de hermanos origen+destino, persiste. | sí (`period`/`position`) | ❌ | **G9** |
| **Agregar/Quitar período** + alerta informativa de discrepancia vs `Curriculum.totalPeriods` (no bloqueante). | vista + constraint | ❌ | **G10** |
| **Botón "Actualizar"** (refetch); filtros de resaltado; chip de línea en tarjeta; fix doble `+` | pura vista | N/A (UI) | — |

### 6.2 Nuevos gaps (para TICKET-099)

| # | Gap | Impacto | Costo |
|---|-----|---------|-------|
| **G8** | **Sin pre-check de prerrequisitos** en el alta por MCP. El guard MC-09 (§3 G1) es de *publicación* (bloquea editar requisitos en plan Active), NO el check *estructural de ubicación* que hace MC-08 al agregar. | El usuario/LLM agrega un curso sin saber que le faltan prereqs ubicados antes; el componente sí avisa. | Medio (reusa `prereqCheck.logic` del mod) |
| **G9** | **Sin mover asignatura de período con recálculo de posición**. `update_object planEntry` cambia `period`/`position` crudo, sin reconciliar el orden de hermanos (origen+destino) como el DnD. | Mover por MCP deja posiciones con hueco/colisión respecto a la UI. | Medio |
| **G10** | **`Curriculum.totalPeriods` no se expone como constraint** ni se avisa la discrepancia al agregar más allá. | El usuario no sabe cuántos períodos tiene el plan ni que se está pasando. | Bajo |
| **G11** | **(Transversal) Referencias por ID crudo, no por etiqueta legible**, y sin resolución del input del usuario por nombre/código. Lección **W2** del dual-judge de MC-08: el modal mostraba el `activityId` (UUID) → se corrigió a código. | El usuario debe conocer IDs; el LLM no puede ofrecer opciones legibles ni reconocer lo que el usuario escribe. Rompe el "guía al usuario". | Bajo-Medio (`get_field_options` + matching tolerante) |

### 6.3 Principio transversal (G11) — opciones legibles + reconocer input

Aplica a **todas** las tools de malla, alineado con la filosofía up1-mcp (`get_field_options`, `preview→commit`):
- **Nunca exigir IDs crudos.** Toda referencia (curso, línea, bloque, prereq) se resuelve por **nombre/código** en input y se devuelve como **etiqueta legible** en output (código de asignatura, nombre de línea) — NO UUIDs.
- **Reconocer el input del usuario**: matching **tolerante a acentos** (como `cd_search_programs`) + **desambiguación** si hay varios matches, en vez de fallar pidiendo un id.
- **Selects/enums** (`timing`, `mustBe`, `combinator`, línea, bloque, rol) vía `get_field_options`.
- **Semántica H2** del pre-check: créditos (`MetricThreshold`) NO condicionan ubicación; solo cursos (`RecordState` Before/Either) y grupos K-de-N.

### 6.4 Adición a la propuesta (§4) — Fase B ampliada

- [ ] **B5.** `cd_add_plan_entry` corre el **pre-check de prereqs** (G8) y devuelve los faltantes **por código legible** en el `preview` (informativo, no bloquea el commit — paridad con el modal de MC-08). + `cd_get_prereqs(activity)` para inspeccionar el árbol de una asignatura.
- [ ] **B6.** `cd_move_plan_entry` (o `cd_update_plan_entry` extendido) mueve `period`/`position` **recalculando el orden de hermanos** (G9), reusando la lógica de `recalcPeriodPosition` del mod.
- [ ] **B7.** `cd_get_mesh` expone `totalPeriods` + `#períodos actuales`; el alta **avisa** (no bloquea) si el período destino excede `totalPeriods` (G10).
- [ ] **B8.** `cd_manage_requirement` — ver/crear el **árbol de requisitos** (RecordState/Group/MetricThreshold) con target resuelto por código y `timing`/`mustBe`/`combinator` como opciones; semántica H2.
- [ ] **B9. (transversal, G11)** todas las tools de malla: opciones legibles + resolución por nombre/código tolerante a acentos + desambiguación; nunca IDs crudos.
