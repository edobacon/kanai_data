---
id: TICKET-052
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1216
module: curriculum-design
autopilot: manual
---

# Fix prefillFrom.exclude en CurricularSection (sourceSectionId → sourceId)

## Request

Follow-up `could` descoped del cierre de **TICKET-044** (HU-10). Bug latente en el config del mod `curriculum-design`, por eso se asocia a **UPONE-1216** (HU-10, originadora del `prefillFrom` en CurricularSection, bajo épica UPONE-1038 "Curriculum Design | Programa de asignatura").

- **B4 — `prefillFrom.exclude` apunta a un campo inexistente**. En `mods/curriculum-design/objects/CurricularSection.json`, `metadata.prefillFrom.exclude` dice `["sourceSectionId"]`, pero el campo real de trazabilidad MADS es **`sourceId`** (ver la property `sourceId` del mismo objeto). Efecto: el path de prefill **backend** (`applyPrefillFromSource`) NO excluye el puntero MADS al clonar → un clon por esa vía heredaría el `sourceId` del origen (trazabilidad incorrecta: un clon no es un template MADS del origen). Hoy NO se manifiesta en el clone de Modalidad porque ese flujo usa `cloneStrategy: prefilledModal`, que excluye `sourceId`/`sourceSectionId` a nivel handler (client-side) — pero cualquier clone que dependa del prefill backend sí arrastraría el campo.

> **Fix**: corregir `exclude: ["sourceSectionId"]` → `exclude: ["sourceId"]` en `CurricularSection.json`. Verificar que no haya OTRO consumidor que dependa del nombre viejo. Correr `npm run sync` para propagar el object JSON al registry/object-manager.

> Fuente: TICKET-044 (cerrado 2026-06-03) — Backlog B4 + Learn de la sección (campo real `sourceId`, L80 del objeto).

## Classification

- **work_type**: fix (corrección puntual de config; 1 línea + sync + verificación de consumers).
- **Layer/épica**: mod `curriculum-design` → UPONE-1038, vía la HU originadora UPONE-1216.
- **Repos esperados** (definir `execute_scope` al ejecutar): `mods/curriculum-design/`.
- **Riesgo**: mínimo. **Candidato a `/dkc tactic`** (single-session, sin spec ni gates pesados) por ser un fix trivial.

## Triage

### Hipotesis

- H1 — No hay otro consumidor del literal `sourceSectionId` en `prefillFrom` (es un typo aislado); el cambio es seguro. (confirmar con grep de `sourceSectionId` en el repo del mod + object-manager al ejecutar)

## KB consulted

> DET-11 — lookup obligatorio antes de tocar codigo.

- **Rules**: `rules/curriculum-design/rule-001..004.md` revisadas — ninguna normativa sobre `prefillFrom`/`sourceId`/`exclude` ni sobre el naming del puntero de clone. No aplican al cambio. n/a bloqueante.
- **Bugs**: `bugs/mods/` — sin bug abierto que toque `prefillFrom` de CurricularSection. n/a.
- **Specs**: `spec: null`; sin spec activa de curriculum-design que solape con el `exclude` del prefill backend. n/a. (Sin señal de escalamiento mid-KB.)

## Discoveries / decisions

- **D1**: `sourceSectionId` SÍ es un campo real, pero de **`CurricularLink`** (otro objeto), no de `CurricularSection`. Aparece en `CurricularLink.json`, `default_CurricularLink_view.json`, `es_CL@CurricularLink.json`, `activity.json` (relación `via: sourceSectionId,targetSectionId`), `seed/_cleanup.js` y el prisma generado — todos del dominio CurricularLink. Dentro de `CurricularSection.json` solo existía en el `exclude` buggy + su `_comment`. Confirma H1: el `exclude` de CurricularSection no tiene ningún consumer que dependa del literal viejo (el prefill backend lee `metadata.prefillFrom.exclude` genéricamente). Cambio seguro.
- **D2 (propagación / DET-16)**: `npm run sync` propagó la metadata corregida a la copia synced en `object-manager/objects/business/Base/curricularsection.json` (`exclude: ["sourceId"]`). Esa copia es artefacto generado en core (workspace `object-manager`, sobre `develop`); su commit pertenece al flujo core/RULE-dev-004 (gated por review team up1), **fuera del scope** de este tactic de mod. El tactic commitea solo la fuente en el repo del mod.
- **M1 (micro-decision)**: ticket pre-existía como `work_type: fix` (creado como follow-up). El dev invocó `/dkc tactic` explícitamente; se ejecutó por el path tactic (single-session, sin spec). Se actualiza `work_type: fix → tactic` para que el shape (sin spec) sea consistente con el path ejecutado y el validador no espere spec en un `fix` cerrado con `spec: null`.

## Sessions

### Session 1 — 2026-06-04 — corregir exclude del prefill backend [phase: tactic]

**Objetivo**: corregir el puntero excluido en `prefillFrom` de CurricularSection y propagar al registry.

**Tasks completadas**:

- [x] T1: corregir `metadata.prefillFrom.exclude` y su `_comment` en [CurricularSection.json:24-25](../../../../uplanner/up1/mods/curriculum-design/objects/CurricularSection.json).
      Cambio: `exclude: ["sourceSectionId"]` → `["sourceId"]` (+ `_comment`: "sourceSectionId se resetea" → "sourceId se resetea") ·
      Validado: `node JSON.parse` OK; grep confirma `sourceSectionId` solo vive en dominio CurricularLink (D1); `npm run sync` exitoso (object-manager/layout/suite) propagó `exclude: ["sourceId"]` a la copia synced del registry (D2) ·
      → commit `cb29fcf`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| cb29fcf | T1 | UPONE-1216-tactic fix(cd): prefillFrom.exclude apunta a sourceId (no sourceSectionId) | objects/CurricularSection.json |

> Review propio: `git diff` limpio (1 archivo, 2 líneas, sin cambios colaterales en el repo del mod). Commit local en branch `UPONE-1038`; push diferido (flujo core/mod up1).

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:

- T1 + `cb29fcf`: corregido `prefillFrom.exclude` en `CurricularSection.json` de `["sourceSectionId"]` (campo inexistente en CurricularSection — pertenece a CurricularLink) a `["sourceId"]` (campo real de trazabilidad MADS), + el `_comment` del bloque. Ahora `applyPrefillFromSource` excluye el puntero correcto al clonar y un clon no hereda el `sourceId` del origen.

**Como se valido**: JSON válido (`JSON.parse`); grep en todo up1 confirmó que `sourceSectionId` solo pertenece al dominio CurricularLink, sin consumer del literal en el `exclude` de CurricularSection (H1 confirmada, D1); `npm run sync` exitoso (3/3 workspaces) propagó `exclude: ["sourceId"]` a `object-manager/objects/business/Base/curricularsection.json` (D2).

**Que NO se hizo** (out-of-scope):

- Commit de los artefactos synced en core (object-manager sobre `develop`) — pertenecen al flujo core/RULE-dev-004 (gated por review team up1), no a este tactic de mod (D2).

## Backlog

| # | Item | Priority | Estado | Notas |
|---|------|----------|--------|-------|
| — | (sin backlog) | — | — | Fix único; cerrado tras verificar consumers + sync. |
</content>
