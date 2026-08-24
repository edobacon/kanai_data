# SP6 — Backlog de diferidos (desde SP5 · malla curricular)

> **Qué es:** los ítems que SP5 dejó fuera, **creados como historias** para que no se pierdan y SP6 arranque con backlog. Origen y justificación de cada diferimiento en `SP5-alcance-y-justificacion.md`.
> **Granularidad:** tickets consolidados, mismo formato que `SP5-historias-usuario.md`.
> **Fecha:** 2026-06-23.

---

## Convenciones
Mismas que SP5 (ver `SP5-historias-usuario.md` §0): SP Fibonacci, repos (mod / core / MCP), DoD global, testing por tipo. **Excepción de frontera:** el versionado/clonado (S7-02, S7-03) **sí toca core** (`object-manager`) — es la excepción autorizada.

---

## Tickets diferidos

---

### UPONE-XXXX · S7-01 — Editor de requisitos del curso (pestaña + modal + árbol)
**Origen:** D1 + D3 (emergente del mockup, no estaba en el handoff) · **SP:** 7 · **Repo:** mod (FE)

**Historia**
> Como **diseñador curricular**, quiero crear/editar los prerrequisitos y correquisitos de un curso como un árbol, y ver qué planes impacta un cambio, para definir las condiciones de elegibilidad sin romper mallas.

**Criterios de aceptación**
- [ ] Pestaña "Requisitos" en el detalle de `Activity`; RecordList de requisitos + menú de acciones.
- [ ] Modal "Agregar requisito" 2 pasos (Paso 1: clase + vía OR/AND + exigencia; Paso 2: detalle por clase — Curso/Electivo/Métrica, las 3 familias del MVP).
- [ ] Visualización del árbol `requirement` unificado (lectura de la estructura Composite).
- [ ] Modal de alerta de impacto: lista los planes afectados por una Activity y sugiere versionar.
- [ ] Sin motor de evaluación (solo edición/persistencia del árbol).

**Por qué se difirió.** No estaba en las épicas del handoff (scopea `requirement` a "solo modelar/persistir"); los requisitos para probar la malla en SP5 se cargan vía seed. Es un segundo componente complejo que duplicaría el riesgo FE del sprint.

**Detalle técnico.** Componente en `modsComponents/`, patrón `CompositeSectionTree`. Reusa el árbol de `requirement` (creado en SP5). El modal de impacto comparte la query "planes afectados" con la validación restrictiva (MC-09 de SP5).

**Testing.** `.spec.ts` de la lógica del árbol (build/persist) + stories.

**Dependencias.** Objeto `requirement` (SP5 MC-03). Idealmente tras MC-09.

---

### UPONE-XXXX · S7-02 — Desbloquear versionado de `Curriculum` con RecordType (core)
**Origen:** E4 + E1 (carryover SP4, bloqueante validado en vivo) · **SP:** 6 · **Repo:** core `object-manager` (excepción autorizada)

**Historia**
> Como **plataforma**, quiero que versionar un Curriculum(Plan) no crashee y conserve su extensión RecordType, para que las versiones de la malla mantengan sus datos temporales.

**Contexto (probado en vivo, ver auditoría §5.ter).** Versionar un Curriculum hoy: (H-7) crashea con `Unknown argument updatedById` en el ext-base; (H-3) el create omite `rt__Plan__curriculum` (progression/totalCredits/...). Dos bloqueantes en core.

**Criterios de aceptación**
- [ ] Versionar un Curriculum(Plan) no crashea (H-7) y la v2 trae `rt__Plan__curriculum` poblado (H-3).
- [ ] El write base+RT es atómico (`$transaction`).
- [ ] v2: `version+1`, `previousVersionId`, nace `Draft`.
- [ ] Tests de core cubren RT + atomicidad; casos non-RT preservados.

**Detalle técnico.** Reusar `cloneChildProjections` para el padre versionado; envolver el path RT en `$transaction` (TICKET-056). Rama de épica core + review del team (RULE-dev-004).

**Testing.** Unit (`version-from-source-helper`) + e2e (extender `object-manager/tests/e2e/version-asnewversion.test.js`).

**Dependencias.** Ninguna dura (es prerrequisito de S7-03).

---

### UPONE-XXXX · S7-03 — Deep-copy de hijos al versionar/clonar el plan
**Origen:** E2 + E3 (carryover SP4; el handoff lo había diferido, se promovió por nacer planEntry) · **SP:** 7 · **Repo:** core (config-driven) + mod (config)

**Historia**
> Como **diseñador curricular**, quiero que al versionar o clonar un plan se copien sus líneas, bloques y asignaturas, para no perder la malla en la nueva versión.

**Contexto.** El motor de cascada **ya existe** en core (`deep-clone-polymorphic`, `applyDerivedRemap`); esto es declarar config + validar remapeo.

**Criterios de aceptación**
- [ ] Versionar/clonar copia `requirementCategory`, `requirement(ownerType=curriculum)` y `planEntry`, remapeando FKs (`categoryId`, `blockId`, `parentId`, `sourceEntryId`).
- [ ] `requirement(ownerType=activity)` **NO** se copia (test que lo verifica).
- [ ] Operación atómica; ninguna FK de la v2 apunta al plan original.
- [ ] Cascada genérica config-driven (declarada en `Curriculum.json`, no código por-objeto).
- [ ] Smoke E2E en UPU: versionar un Plan real → v2 con campos RT + hijos.

**Detalle técnico.** Config `directChildren`/`polymorphicChildren` + `prefillFrom.deepClone` en `Curriculum.json`. Orden de copia: categorías → requirements(Group) → planEntries.

**Testing.** e2e extendiendo `clone-*-children.test.js`; verificación de remapeo de FKs.

**Dependencias.** S7-02 + **toda la Épica A de SP5** (los objetos hijos deben existir).

---

### UPONE-XXXX · S7-04 — Tools `cd_*` de dominio para la malla (MCP)
**Origen:** F2 (ergonómico, opcional en SP5) · **SP:** 6 · **Repo:** MCP `uplanner/mcp`

**Historia**
> Como **usuario del MCP (Elric)**, quiero operar la malla conversacionalmente con tools de dominio (ver, agregar cursos, taggear electivas, armar el árbol de requisitos), para no usar CRUD crudo.

**Contexto.** No requerido para "estar en el MCP" (los contratos de SP5 MC-04 ya dejan los objetos operables vía tools genéricas). Esto es ergonomía.

**Criterios de aceptación**
- [ ] `cd_get_curriculum_malla`/`cd_list_plan_entries`, `cd_add_courses_to_plan`, `cd_tag_elective_block` (select-or-create), `cd_create_requirement` (árbol por `parentId`).
- [ ] El árbol de `requirement` se arma sin nodo-por-nodo crudo.

**Detalle técnico.** Patrón `curriculum-write.ts`/`sections-write.ts`.

**Testing.** Tests de cada tool.

**Dependencias.** Contratos MCP de SP5 (MC-04) + los flujos que cubre.

---

### UPONE-XXXX · S7-05 — `planEntry` en planes modulares
**Origen:** BL-6 (SP5 fue solo secuencial por decisión de reunión) · **SP:** ~5 (estimar) · **Repo:** mod (+ posible FE)

**Historia**
> Como **diseñador curricular**, quiero armar mallas de planes modulares (sin períodos fijos), para soportar carreras cuyo orden surge de los prerrequisitos.

**Criterios de aceptación**
- [ ] `planEntry.period` pasa a **nullable** para `progression=Modular`.
- [ ] El orden/nivel se deriva del **DAG de prerrequisitos** (no se ingresa manual).
- [ ] El componente de malla adapta la visualización a niveles derivados (no columnas de período fijas).

**Por qué se difirió.** SP5 se acotó a planes secuenciales (decisión `00:55:49`). El enum `progression` (SP5 MC-01) ya deja la puerta abierta.

**Detalle técnico.** Derivación de orden topológico desde el grafo de `requirement` (prereqs). El sistema distingue el modo por `progression` + `periodType`.

**Dependencias.** SP5 completo (objetos + componente).

---

### UPONE-XXXX · S7-06 — Lógica automática de versión vigente (`isCurrent`)
**Origen:** BL-1 (SP5 solo dejó el flag, sin lógica) · **SP:** ~5 (estimar) · **Repo:** mod (+ core si toca versionado)

**Historia**
> Como **diseñador curricular**, quiero que al versionar una asignatura el sistema marque la nueva como vigente y desmarque la anterior, para no gestionar `isCurrent` a mano.

**Criterios de aceptación**
- [ ] Al versionar una `Activity`, su nueva versión queda `isCurrent=true` y la anterior `isCurrent=false` (gestión del linaje).
- [ ] Extender el concepto a `Curriculum` si aplica.

**Por qué se difirió.** SP5 (MC-01) entregó solo el booleano simple para el listado; la lógica automática se engancha al path de versionado (que además se arregla en S7-02).

**Dependencias.** S7-02 (versionado funcional).

---

## Backlog futuro (sin estimar — más allá de SP6)

> Ya declarado fuera de alcance en el handoff (`historias-malla_v1.md` §1). Se lista para no perder el rastro.

- **`milestone` / `specialization` / `planEntrySpecialization`** — tributación / menciones (hitos, especializaciones).
- **Motor de ejecución de reglas (degree-audit)** — evaluación en vivo del avance del estudiante. Hoy `requirement` solo se modela y persiste.
- **RecordTypes futuros de `requirement`** — `AttributeMatch` (programa/cohorte/grupo/consentimiento) + más targets de `RecordState` (milestone/competency/event) + más métricas de `MetricThreshold` (GPA, PeriodIndex, Standing, TestScore). El diseño es enum extensible: cada uno es un valor/familia nueva, no un objeto nuevo.

---

## Resumen SP6 (orientativo)

| Ticket | SP | Repo | Nota |
|---|---:|---|---|
| S7-01 Editor de requisitos | 7 | mod FE | emergente |
| S7-02 Desbloquear versionado (core) | 6 | core | carryover SP4, bloqueante |
| S7-03 Deep-copy de hijos | 7 | core+mod | depende S7-02 + objetos SP5 |
| S7-04 `cd_*` MCP de dominio | 6 | MCP | ergonómico |
| S7-05 planEntry modular | ~5 | mod | depende SP5 |
| S7-06 Vigencia automática | ~5 | mod+core | depende S7-02 |
| **Total estimable** | **~36** | | + backlog futuro sin estimar |

> **Orden sugerido SP6:** S7-02 → S7-03 (versionado, prerrequisito para clonar mallas) primero; S7-01 y S7-04 en paralelo; S7-05/S7-06 según prioridad de negocio.
