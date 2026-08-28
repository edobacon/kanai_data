---
id: TICKET-098
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1349
module: curriculum-design
autopilot: autonomous
---

# Malla — Crear bloque electivo desde edición (paridad con alta) + fix doble "+" en botón de agregar asignatura

> **Follow-up de MC-06.** Ambos ítems son del componente `CurriculumMesh` (add/edit asignaturas) que trabajó MC-06 → se linkea al mismo Jira, **`external: UPONE-1349`** (decisión del dev 2026-07-01). Commits/branches usan `UPONE-1349` (DET-19).

## Request

**Item 1 — Crear bloque electivo desde edición (paridad add↔edit):** al **editar** una asignatura dentro de la malla, si tiene rol electiva (o se le da el rol de electiva), el selector de bloque electivo solo muestra los **bloques existentes** — no permite **añadir uno nuevo**, como sí lo hace el modal de **alta**. El modal de edición debe permitir crear un bloque electivo nuevo con la misma UX que el de alta.

**Item 2 — Doble signo "+" en el botón de agregar asignatura:** el botón "+ Asignatura" de cada período muestra **dos signos +**. Causa: el `Button` ya trae `icon="bi bi-plus-lg"` (un "+") y la etiqueta i18n `curriculumMesh.buttons.addSubject` es `"+ Asignatura"` (otro "+"). Fix: quitar el "+ " de la etiqueta en los 3 locales (el icono ya aporta el "+").

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (gap de paridad / comportamiento inconsistente add↔edit) — *borderline improvement; reclasificar si el dev prefiere* |
| Tipo de cambio | FE (modal de edición de la malla) + wiring de mutación existente |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only): `modsComponents/CurriculumMesh` + i18n |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Reusa la UX ya existente y aprobada del modal de alta (opción "➕ crear bloque nuevo" + input de nombre). No hay diseño visual nuevo → sin design-draft. |
| Data model | no | El bloque es un `rt__Group__requirement` que ya se crea vía la mutación existente `CREATE_REQUIREMENT`. Sin objeto ni campo nuevo. |

## Triage

REQ **confirmado** por grounding del código. El fix es principalmente **reuso**: la lógica de "crear bloque nuevo" ya está extraída en `blockSelect.logic.ts` (`resolveBlockSelection` + `BLOCK_NEW_SENTINEL`) y el builder/mutación (`buildBlockPayload` + `CREATE_REQUIREMENT`) ya existen — solo el modal de edición no los consume.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La capacidad "crear bloque" del alta es reusable tal cual en edición (módulo puro sin Vue/GraphQL) | ✓ confirmada | `blockSelect.logic.ts` es Vue-free/GraphQL-free; usado solo por `AddEntryModal`; grep confirma que `EditEntryModal` no lo importa |
| H2 | El bloque nuevo se persiste con la MISMA mutación que el alta | ✓ confirmada | `CREATE_REQUIREMENT` (objectType `rt__Group__requirement`) + `buildBlockPayload` en `CurriculumMeshElement.vue`; solo se invoca desde `createElectivaEntries` (path de alta) |

### Context found

**Dónde vive la asimetría (grounding 2026-07-01):**
- **Alta (tiene crear):** `AddEntryModal.ts` (`selectedBlockValue`/`newBlockName`, opción `BLOCK_NEW_SENTINEL='__new__'` + input) → `blockSelect.logic.ts` `resolveBlockSelection` → `CurriculumMeshElement.vue` `createElectivaEntries` → `buildBlockPayload` (`curriculumMesh.logic.ts:356`) → `CREATE_REQUIREMENT` (objectType `rt__Group__requirement`) → usa el `blockId` nuevo en el planEntry.
- **Edición (solo elegir):** `EditEntryModal.ts:269-295` — `<select>` plano de `blockOptions` atado a `form.blockId`, sin sentinel ni input; comentario del prop lo declara: *"solo elegir — no crear en edición"*. `editEntryModal.logic.ts` `prepareUpdatePayload:148-167` retorna error *"Para rol Electiva se requiere seleccionar un bloque existente"* si no hay blockId. No importa `blockSelect.logic`.
- **Compartido hoy:** solo `useBlockOptions.ts`/`BlockOption` (lista de bloques existentes). La selección con "crear nuevo" NO está compartida.
- **i18n:** `addModal.step1` tiene `blockCreateNew`/`blockNewNameLabel`/`blockNewNamePlaceholder`/`blockHint`; `editModal` NO tiene equivalentes en ninguno de los 3 locales.

**Punto de divergencia / fix mínimo (3 partes):**
1. **UI:** en `EditEntryModal.ts`, reemplazar el `<select>` plano por el combo `<select>` (con opción `BLOCK_NEW_SENTINEL`) + input condicional de nombre, reusando `resolveBlockSelection`.
2. **Lógica:** `editEntryModal.logic.ts` (`prepareUpdatePayload` + `EditEntryFormState`) debe aceptar una `BlockSelection` (con `isNew`/`blockLabel`) en vez de solo `blockId` string.
3. **Persistencia:** en `CurriculumMeshElement.vue` `onEditSave`, cuando la selección es nueva, invocar `buildBlockPayload` + `CREATE_REQUIREMENT` (espejo de `createElectivaEntries`) ANTES de `UPDATE_PLAN_ENTRY`.
4. **i18n + tests:** portar las keys `blockCreateNew`/`blockNewNameLabel`/... a `editModal` en 3 locales; tests de la rama create-new en edición (reusar cobertura de `blockSelect.logic.spec.ts`).

**Reuso (DET-32):** `blockSelect.logic` + `buildBlockPayload` + `CREATE_REQUIREMENT` = reuse; solo se construye el wiring en el modal de edición + keys i18n.

**Item 2 — doble "+" (grounding):** `CurriculumMeshElement.vue:150` el `<Button icon="bi bi-plus-lg">` renderiza un "+"; la etiqueta `curriculumMesh.buttons.addSubject` es `"+ Asignatura"` (es_CL) / `"+ Subject"` (en_CL) / `"+ Disciplina"` (pt_BR) — el "+" del texto es redundante. Fix mínimo: quitar el "+ " de las 3 etiquetas (mantener el icono). Trivial, sin lógica.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (mod-only; misma épica; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con un plan con bloques electivos + asignaturas electivas |
| Services | suite (malla), object-manager (`createInstance` de `rt__Group__requirement`) |
| Test data | Asignatura electiva editable + plan Draft (editable) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-07-01 | (ausente) → super | dev eligió "Super autopilot (implementar ya)" | intake-explore |

### Session 1 — FE: bloque en edición + fix doble "+" (2026-07-01)

**session_goal:** REQ-01 (crear bloque electivo desde edición, paridad add↔edit) + REQ-02 (doble "+").

**Tasks completadas:**
- [x] Item 2 (REQ-02) — quitar el "+ " de `buttons.addSubject` en `es_CL`/`en_CL`/`pt_BR` (el `icon="bi bi-plus-lg"` ya aporta el "+").
- [x] Item 1 (REQ-01) — `EditEntryModal.ts`: opción "➕ crear nuevo" + input de nombre (reusa `resolveBlockSelection`/`BLOCK_NEW_SENTINEL`); nuevo evento `saveNewBlock`. `editEntryModal.logic.ts`: `newBlockName` en el form state. `CurriculumMeshElement.vue`: handler `onEditSaveNewBlock` (crea el `rt__Group__requirement` con `CREATE_REQUIREMENT`+`buildBlockPayload`, espejo de `createElectivaEntries`, y reusa `onEditSave`). i18n `editModal` (4 keys × 3 locales).
- [x] Tests — logic (`editEntryModal.logic.spec`: newBlockName + prepareUpdatePayload con blockId real) + component (`EditEntryModal.component.spec`: TC-098-01 crea bloque → emite `saveNewBlock`; TC-098-03 sin nombre → error).

**Discoveries:**
- D1: la capacidad de "crear bloque" ya estaba extraída y reusable (`blockSelect.logic`), pero `EditEntryModal` no la importaba. El fix fue mayormente wiring/reuso (DET-32).
- D2: bajo riesgo elegido — se mantuvo el evento `save` existente intacto y se agregó `saveNewBlock` para el caso nuevo (el Element crea el bloque y reusa `onEditSave`), evitando refactor del path que ya funcionaba.

**Test results:** `npx vitest run` → 66 files / **1139 tests** passed (+5). `EditEntryModal.component.spec` 11/11. Lint limpio. Typecheck 0 errores en archivos del ticket. Se actualizó un test existente (TC-S9-02: conteo de opciones 3→4) por el cambio intencional (nueva opción "crear nuevo").

**Quality review (DET-23, tier standard):** calidad ✓ (reuso, sin duplicar lógica) · lint ✓ · tipado ✓ · testing ✓ (component real + logic) · escalabilidad ✓ · mantenibilidad ✓ (mismo patrón que alta) · claridad ✓ · a11y ✓ (label + required) · i18n ✓ (3 locales, paridad) · error-handling ✓ (validación nombre vacío + errores de mutación). Sin warnings bloqueantes.

**Smoke visual (RULE-mods-050) — PENDIENTE del dev:** DB-gated. Verificado por unit + component (jsdom) + typecheck; falta el render real tras `sync` + restart en un tenant (editar asignatura → electiva → crear bloque nuevo → persiste; y el botón con un solo "+").

**Gate decision:** (autopilot — `approvedBy: autopilot`)
- [x] continue → cierre (request-close). Bloqueo honesto: smoke visual + close requieren OK del dev (super autopilot: close sin acceptance verde siempre pregunta).

### Plan de sessions

| Session | Objetivo | REQ / Tasks | Tier | Tipo gate |
|---------|----------|-------------|------|-----------|
| S1 | FE: (Item 1) crear bloque electivo desde el modal de edición — UI + lógica + persistencia + i18n + tests; (Item 2) quitar el "+ " de las etiquetas `addSubject` (3 locales) | REQ-01, REQ-02 | T2 | ⚑ fuerte |

> Tier T2: FE que dispara una mutación de creación (`rt__Group__requirement`) y toca la lógica de update de planEntry (consumers del modal de edición). El Item 2 es trivial (i18n). Smoke DB-gated.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (Item 1: bloque en edición) | TC-01, TC-02, TC-03, TC-04 | unit + component | pending |
| REQ-02 (Item 2: doble "+") | TC-05 | unit/smoke | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | Editar asignatura electiva → crear bloque nuevo | REQ-01 | component | plan Draft, asignatura electiva | rol=electiva → "➕ crear bloque nuevo" + nombre → guardar | se crea `rt__Group__requirement` y el planEntry queda con ese blockId | TC-098-01: emite `saveNewBlock` con `blockLabel`; el Element crea el bloque y reusa onEditSave | EditEntryModal.component.spec.ts | ✅ logic+component / ⏳ smoke dev |
| TC-02 | Editar → elegir bloque existente | REQ-01 | component | plan con bloques | elegir bloque existente → guardar | funciona igual que hoy (no regresión) | TC-S9-02: select muestra el bloque actual + opciones; emite `save` normal | EditEntryModal.component.spec.ts | ✅ passed |
| TC-03 | Editar → crear nuevo sin nombre | REQ-01 | component | — | seleccionar `__new__` sin nombre | validación: no permite guardar (no crea bloque vacío) | TC-098-03: no emite; muestra `blockNewNameRequired` | EditEntryModal.component.spec.ts | ✅ passed |
| TC-04 | Alta de asignatura sigue creando bloque igual | REQ-01 | unit | — | flujo de alta con bloque nuevo | sin regresión (reuso de `blockSelect.logic`) | blockSelect.logic.spec 10/10 sin cambio | blockSelect.logic.spec.ts | ✅ passed |
| TC-05 | Botón "agregar asignatura" muestra un solo "+" | REQ-02 | smoke | plan Draft | render del período | un solo signo "+" (del icono); etiqueta sin "+" en 3 locales | etiqueta i18n sin "+" (3 locales); icono `bi-plus-lg` aporta el "+" | lang/*.json | ✅ i18n / ⏳ smoke dev |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| unit/component mod | `npx vitest run` del mod | 1134 pass | — | alta de bloque electivo intacta; edición gana la capacidad |

## Summary

**Cerrado 2026-07-01** (super autopilot; cierre autorizado por el dev). Follow-up de MC-06 entregado:
- **Item 1 (REQ-01):** el modal de edición ahora permite **crear un bloque electivo nuevo** (paridad con el modal de alta), reusando `blockSelect.logic` (`resolveBlockSelection`/`BLOCK_NEW_SENTINEL`); evento `saveNewBlock` → el Element crea el `rt__Group__requirement` (`CREATE_REQUIREMENT`+`buildBlockPayload`, espejo de `createElectivaEntries`) y reusa `onEditSave`. i18n `editModal` (4 keys × 3 locales).
- **Item 2 (REQ-02):** botón "agregar asignatura" con **un solo "+"** (quitado el "+ " de `buttons.addSubject` en 3 locales; el icono `bi-plus-lg` lo aporta).

**Verificación:** suite del mod **1139/1139** (incluye 2 component tests nuevos que montan el modal y validan el flujo de crear bloque + la validación de nombre vacío) · lint limpio · typecheck 0 errores en archivos del ticket. **Smoke DB-gated:** el dev autorizó el cierre; render en runtime queda respaldado por los component tests (jsdom) — verificación visual final a cargo del dev tras `sync`.

**Commits locales** (`UPONE-1267-sp5`, external `UPONE-1349` por DET-19): `2f42565` (feat+fix), `6674f19` (test). **Push pendiente** (RULE-dev-004).

**SP:** executed 1 (1 session). Spec: `SPEC-curriculum-design-edit-modal-elective-block-create` (done).
