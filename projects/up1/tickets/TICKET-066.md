---
id: TICKET-066
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1271
module: curriculum-design
autopilot: manual
---

# academicProgram · create layout — relationDisplayFields para FK (fix clone)

## Request

Al probar el clone de academicProgram (TICKET-062/UPONE-1271) en la plataforma, el modal abre pero el campo **Institución** no logra un match válido (no resuelve el id prellenado a su nombre). Agregar `relationDisplayFields` al layout de creación, igual que ya lo tienen `edit` y `view`. (El pedido adicional de abrir el clone en pantalla completa se descartó por ahora — se mantiene modal hasta necesidad real del user; ver Discoveries.)

## KB consulted

> DET-11 — lookup obligatorio antes de tocar codigo.

- **Rules**: [RULE-curriculum-design-003](../rules/curriculum-design/rule-curriculum-design-003.md), [004](../rules/curriculum-design/rule-curriculum-design-004.md) — son de mutations workflow (`*Validated`). **n/a** a un cambio de layout config.
- **Bugs**: n/a (sin dir `bugs/curriculum-design/`).
- **Specs**: [SPEC-021-academic-program-object](../specs/curriculum-design/SPEC-021-academic-program-object.md) — definió los 4 layouts; el REQ (línea 102/119) declaró los FKs de create/view/edit como "campo con solo `label`" (reference select, "limitación conocida"). En la ejecución (TICKET-059/061) **view y edit se mejoraron** a `relationDisplayFields: {Institution: name, OrgUnit: name}`, pero **el create quedó atrás** — oversight, no conflicto. Este tactic completa create alineándolo a view/edit. Sin overlap con spec activa.

## Discoveries / decisions

- **D1**: causa raíz del "no match" del clone — el create layout no declara `relationDisplayFields`; el motor (`RecordDetail.vue:436`) deja `displayField = null` para el FK → el dropdown no resuelve el `institutionId` prellenado contra `Institution.name`. Edit/view sí lo tienen → ahí funciona. Afecta también a `governanceUnitId`/`executionUnitId` (FK→OrgUnit).
- **M1 (micro-decision)**: incluir `OrgUnit: name` además de `Institution: name` (espejo exacto de edit) — los 3 FKs del objeto se benefician, no solo institución.
- **M2 (micro-decision)**: full-screen del clone **descartado** — el clone usa `prefilledModal` (modal, requerido por el `code` único); abrirlo como route (como edit) o como modal full-screen es **cambio core** (`layout/`, UPONE-1206), no config de mod. Se difiere hasta necesidad real del user (decisión del dev). Este tactic NO lo incluye.

## Sessions

### Session 1 — 2026-06-15 — relationDisplayFields en create layout [phase: tactic]

**Objetivo**: agregar `relationDisplayFields: {Institution: name, OrgUnit: name}` al `default_AcademicProgram_create.json` y propagarlo a la DB de UPU vía sync.

**Tasks completadas**:

- [x] T1: Agregar `relationDisplayFields` al `default_AcademicProgram_create.json` (`layoutConfig`, antes de `schema`).
      Cambio: antes sin `relationDisplayFields` (FK display roto en clone) → ahora `{Institution: name, OrgUnit: name}` (espejo de view/edit) ·
      Validado: JSON ✓ + `npm run sync:db` (0 errores) + verificado en DB UPU `up1_layen_layout.layoutConfig.relationDisplayFields = {Institution: name, OrgUnit: name}` ·
      → commit `e481d95`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| `e481d95` | T1 | UPONE-1271-tactic fix(curriculum-design): relationDisplayFields en create layout de academicProgram | config/layouts/default_AcademicProgram_create.json |

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:
- T1 + `e481d95`: agregado `relationDisplayFields: {Institution: name, OrgUnit: name}` al layout de creación de academicProgram. Antes el FK de institución (y orgUnit) no resolvía por nombre → el clone (prefilledModal, que prellena `institutionId` crudo) no lograba un match válido. Ahora resuelve igual que view/edit.

**Como se valido**: JSON well-formed ✓; `npm run sync:db` 0 errores; query a `up1_layen_layout` confirma `relationDisplayFields` aplicado en la DB de UPU. (El frontend lo toma al recargar la página; smoke UI del clone pendiente del dev en sesión activa.)

**Que NO se hizo** (out-of-scope):
- **Clone full-screen** (pedido junto al fix): descartado por ahora — requiere cambio core en `layout/` (el clone usa `prefilledModal`/modal por el `code` único; route como edit o modal full-screen no es config de mod). Se difiere hasta necesidad real del user (M2). Si se retoma → ticket core en UPONE-1206.
