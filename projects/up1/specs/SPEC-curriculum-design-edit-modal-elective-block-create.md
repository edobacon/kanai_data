---
id: SPEC-curriculum-design-edit-modal-elective-block-create
project: up1
ticket: TICKET-098
status: done
---

# Malla — Crear bloque electivo desde edición (paridad con alta) + fix doble "+" (MC-06 follow-up)

# Malla — Crear bloque electivo desde edición (paridad con alta) + fix doble "+" (MC-06 follow-up)

## Purpose

Cerrar dos detalles del componente `CurriculumMesh` (MC-06 / UPONE-1349):
1. **Item 1 (REQ-01):** el modal de **edición** de una asignatura, cuando el rol es electiva, solo permitía elegir bloques existentes. Ahora permite **crear un bloque electivo nuevo**, con la misma UX que el modal de **alta** (paridad add↔edit).
2. **Item 2 (REQ-02):** el botón "+ Asignatura" mostraba **doble "+"** (icono + "+" en la etiqueta). Se corrige la etiqueta i18n.

100% mod-only (FE + i18n). Reuso máximo: la lógica de crear bloque (`blockSelect.logic`, `buildBlockPayload`, `CREATE_REQUIREMENT`) ya existía; solo el modal de edición no la consumía.

## Requirements

### REQ-01: Crear bloque electivo nuevo desde el modal de edición

> **Qué cambia:** el modal de edición ofrece "➕ crear bloque nuevo" (+ input de nombre) además de elegir existentes.
> **Por qué:** paridad con el modal de alta; hoy el diseñador no puede crear un bloque al reclasificar una asignatura a electiva desde edición.

El sistema MUST ofrecer, en el selector de bloque del modal de edición (rol electiva), la opción de crear un bloque nuevo (centinela `BLOCK_NEW_SENTINEL` + input de nombre), reusando `resolveBlockSelection`. Al guardar con un bloque nuevo, el sistema MUST crear el `rt__Group__requirement` (vía `CREATE_REQUIREMENT` + `buildBlockPayload`, `minToSatisfy=1`) y luego actualizar el planEntry con el `blockId` resultante. El sistema MUST validar que el nombre no esté vacío (no crear bloques sin nombre). El path de bloque existente y el de obligatoria MUST permanecer sin cambios.

<details><summary>Scenarios</summary>

- **GIVEN** una asignatura electiva en edición **WHEN** elige "crear nuevo" + nombre → guardar **THEN** se crea el bloque y el planEntry queda con ese blockId.
- **GIVEN** "crear nuevo" sin nombre **THEN** validación: no guarda, muestra `blockNewNameRequired`.
- **GIVEN** elige un bloque existente **THEN** funciona como hoy (no regresión).

</details>

### REQ-02: Botón de agregar asignatura con un solo "+"

> **Qué cambia:** quitar el "+ " de la etiqueta `curriculumMesh.buttons.addSubject` (3 locales).
> **Por qué:** el `Button` ya trae `icon="bi bi-plus-lg"`; el "+" del texto era redundante → se veían dos.

El sistema MUST mostrar un único "+" en el botón de agregar asignatura, provisto por el icono. La etiqueta i18n MUST NOT incluir "+".

## Artifacts

| Artefacto | Path | Cambio | source_ref |
|-----------|------|--------|-----------|
| Selector con "crear nuevo" | `modsComponents/CurriculumMesh/EditEntryModal.ts` | opción centinela + input + evento `saveNewBlock`; reusa `resolveBlockSelection` | REQ-01 |
| Form state | `modsComponents/CurriculumMesh/editEntryModal.logic.ts` | `newBlockName?` en `EditEntryFormState` + `initialEditFormState` | REQ-01 |
| Persistencia | `modsComponents/CurriculumMesh/CurriculumMeshElement.vue` | handler `onEditSaveNewBlock` (crea bloque + reusa `onEditSave`) | REQ-01 |
| i18n editModal | `lang/{es_CL,en_CL,pt_BR}.json` | `blockCreateNew`/`blockNewNameLabel`/`blockNewNamePlaceholder`/`blockNewNameRequired` | REQ-01 |
| i18n addSubject | `lang/{es_CL,en_CL,pt_BR}.json` | quitar "+ " de `buttons.addSubject` | REQ-02 |
| Tests | `tests/component/EditEntryModal.component.spec.ts`, `modsComponents/CurriculumMesh/editEntryModal.logic.spec.ts` | TC-098-01/03 + logic post-creación | REQ-01 |

> **Reuso (DET-32):** `blockSelect.logic` (`resolveBlockSelection`/`BLOCK_NEW_SENTINEL`), `buildBlockPayload`, `CREATE_REQUIREMENT`, `onEditSave` = reuse. Solo se construye el wiring del modal de edición + keys i18n.

## Tasks

### Session 1 — FE: bloque en edición + fix doble "+" [tier: T2]

| # | Task | source_ref | Files | Validation | Rollback | Status |
|---|------|-----------|-------|------------|----------|--------|
| S1.T1 | REQ-02: quitar "+ " de `buttons.addSubject` (3 locales) | REQ-02 | lang/*.json | render botón un solo "+" | git checkout | done |
| S1.T2 | REQ-01: UI selector "crear nuevo" + input + evento `saveNewBlock` en EditEntryModal; `newBlockName` en logic | REQ-01 | EditEntryModal.ts, editEntryModal.logic.ts | vitest component | git revert | done |
| S1.T3 | REQ-01: handler `onEditSaveNewBlock` (crea bloque + reusa onEditSave) + wiring | REQ-01 | CurriculumMeshElement.vue | vitest + typecheck | git revert | done |
| S1.T4 | REQ-01: i18n editModal (4 keys × 3 locales) + tests (component + logic) | REQ-01 | lang/*.json, tests | vitest verde + paridad | git revert | done |
| **S1.GATE** | Gate T2 — vitest, lint, typecheck, quality review, smoke DB-gated (dev) | — | ticket | 1139 verde + gate persistido | (n/a) | done |

## Constraints

- **RULE-curriculum-design-014:** lógica en `.ts` puro testeable; el modal presentacional emite eventos, el Element hace las mutaciones.
- **RULE-mods-050:** cambios en `lang/*.json` + componentes requieren `layout sync` + `suite sync` + restart; smoke DB-gated del dev.
- **DET-19:** commits/branch usan `UPONE-1349` (external del ticket).
- **H7 no aplica:** el bloque nuevo se crea con la misma mutación `CREATE_REQUIREMENT` (`rt__Group__requirement`) que ya usa el alta; sin resolver nuevo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MC-06 (TICKET-086, closed) | internal | componente add/edit + `blockSelect.logic` + `CREATE_REQUIREMENT` que se reusa | bajo — cerrado |

## Acceptance checkpoints

- [x] **Funcional:** REQ-01 (crear bloque desde edición) + REQ-02 (un solo "+")
- [x] **Tests:** TC-098-01/03 (component) + logic post-creación + regresión `blockSelect.logic` — 1139 verde
- [x] **Rules:** RULE-curriculum-design-014 (lógica reusada, sin duplicar); i18n paridad 3 locales
- [x] **Smoke DB-gated (dev):** cierre autorizado por el dev (2026-07-01); render respaldado por component tests (jsdom); verificación visual final en runtime a cargo del dev tras `sync` (RULE-mods-050)

## Archiving

Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-edit-modal-elective-block-create "razon"`.
