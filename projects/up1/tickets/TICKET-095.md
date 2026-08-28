---
id: TICKET-095
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1345
module: curriculum-design
autopilot: manual
---

# Tabs malla/líneas visibles solo en Curriculum recordType=Plan (no en Minor)

## Request

Follow-up de TICKET-093 detectado en la verificación en vivo: las pestañas "Líneas de formación" y "Malla curricular" embebidas en el detalle del Currículo se mostraban también en los Currículos `recordType=Minor`, donde no aplican (un Minor no tiene malla). Deben aparecer solo cuando `recordType=Plan`.

## KB consulted

> DET-11 — lookup antes de tocar código.

- **Rules**: [RULE-curriculum-design-014](../rules/curriculum-design/rule-curriculum-design-014.md) — reuso de patrón/mecanismo nativo (se reusa `conditions` de Vueform, no se construye nada) | aplica.
- **Bugs**: n/a (revisados bug-curriculum-design-001/002, no relacionados).
- **Specs**: [SPEC-curriculum-design-fix-embed-malla-in-curriculum](../specs/SPEC-curriculum-design-fix-embed-malla-in-curriculum.md) — spec de TICKET-093 que introdujo las pestañas; OQ-1 ya anticipaba este refinamiento (tab visible-vacía para no-Plan). Este tactic lo resuelve.

## Discoveries / decisions

- D1: el engine pasa el `tabConfig` verbatim a Vueform ([layout/src/layouts/RecordDetail.vue:4476]) → una `conditions` en la pestaña llega a Vueform y oculta la pestaña completa (header incluido). No había precedente de pestaña condicionada en up1; verificado en vivo.
- D2 (operativo): este cambio es una **modificación** de layouts existentes → aplica con `npm run sync` (upsert), **sin reset**. Contrasta con el borrado de layouts de TICKET-093, que sí necesitó reset (sync es upsert-only y no borra filas stale). Capturado en memoria global.
- M1 (micro-decision): se condiciona a nivel de **pestaña** (no del campo `record-list`) para ocultar el header además del contenido — un condition en el elemento dejaría la pestaña vacía visible.

## Sessions

### Session 1 — 2026-06-25 — Condicionar tabs a recordType=Plan [phase: tactic]

**Objetivo**: agregar `conditions: [["recordType","==","Plan"]]` a las pestañas requirementCategories y planEntries en los layouts de detalle del Currículo.

**Tasks completadas**:

- [x] T1: Agregar `conditions` recordType=Plan a las 2 pestañas en `default_Curriculum_view.json` y `default_Curriculum_edit.json` ([mods/curriculum-design/config/layouts/]).
      Cambio: pestañas Líneas/Malla sin condición → solo visibles si `recordType==Plan` ·
      Validado: JSON.parse OK; vitest mod 788/788; smoke en vivo post-sync (Plan muestra las pestañas, Minor "Matemática Aplicada" no) ·
      → commit `39cbbba`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| 39cbbba | T1 | UPONE-1345 fix(curriculum-design): mostrar tabs malla/líneas solo en Curriculum recordType=Plan (no en Minor) | config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_edit.json |

Review propio: `git diff` revisado, cambio mínimo (4 líneas), patrón espejo en ambos modos (view/edit).

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:

- T1 + `39cbbba`: `conditions: [["recordType","==","Plan"]]` en las pestañas requirementCategories y planEntries de `default_Curriculum_view/_edit`. Las pestañas Líneas/Malla ahora se ocultan en Currículos Minor.

**Como se valido**: JSON válido; suite del mod 788/788 sin regresión; smoke en vivo tras `npm run sync` — el Plan muestra "Líneas de formación" + "Malla curricular"; el Minor "Matemática Aplicada" no las muestra (solo General). Confirmado por el dev.

**Que NO se hizo** (out-of-scope):

- Prefill de `curriculumId` al crear una línea desde la pestaña embebida (OQ-1 de TICKET-093, candidato a TICKET-094/pickers).
- El smoke quedó como verificación manual del dev (DB-gated), no automatizado.
