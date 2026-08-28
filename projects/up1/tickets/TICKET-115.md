---
id: TICKET-115
project: up1
type: ticket
status: closed
work_type: tactic
module: layout
autopilot: manual
---

# Fix import faltante `replaceRecordPlaceholders` en RecordDetail (regresion UPONE-1353)

## Request

Aplicar como fix de repo el import faltante de `replaceRecordPlaceholders` en `layout/src/layouts/RecordDetail.vue:212`. La view de RecordDetail queda con campos vacios cuando el layout usa placeholders `{{record.*}}` en filtros de referencia (caso Activity view del mod curriculum-design): la funcion se usa en 6 call-sites pero no esta importada, lo que lanza `ReferenceError` y aborta el render. Regresion introducida por UPONE-1353 (PR #298, commit `52588ba`), presente en develop desde 2026-07-17. Solucion rapida para probar y enviar a revision del team up1. Registrar en DKC relacionado a UPONE-1353 (ticket que introdujo la regresion). Reporte completo: `uplanner/specs/up1/sp7/UPONE-1353-recorddetail-view-placeholder-regression.md`.

## KB consulted

- **Rules**: [RULE-dev-004](../rules/dev/rule-dev-004.md) — aplica: es trabajo `layer: core` (edita `layout/` codigo fuente); va en rama con id externo (aqui `UPONE-1353`, la regresion que corrige) + revision del team up1 antes de develop. Guarda de rama (DET-30) matchea por contencion del id.
- **Bugs**: n/a — los bugs abiertos de layout (BUG-layout-001/002/005) tratan otros temas (traducciones embebidas, header de registro, modal-create sin instanceId); ninguno es esta regresion ni se cierra con este fix.
- **Specs**: n/a — no hay spec DKC sobre el placeholder resolver de RecordDetail.

## Discoveries / decisions

- D1: La funcion `replaceRecordPlaceholders` vivia definida DENTRO de `RecordDetail.vue` desde `bb22c67` (Clemente Jara, 2026-02-11). El commit `52588ba` ("fix: resolve record filters after loading edit data", Ignacio Jorquera, 2026-07-15) creo `recordDetailReferenceFilters.ts`, movio alli la funcion (borrando la def local) y agrego `import { resolveFilterPlaceholders }` **omitiendo** `replaceRecordPlaceholders` pese a sus 6 call-sites. El commit `ea423651` (mismo autor/dia) reescribio ese import agregando `stripReferenceSchemaHints, stripRelationHintsForFKField` pero tampoco lo incluyo. **Ahi falto incorporar el import.** Los tres commits van en `feat/UPONE-1353`, mergeado via PR #298 (`38c1af7`, 2026-07-17). El refactor de filtros fue trabajo colateral dentro de un PR de RBAC, por eso paso desapercibido en la revision.
- D2: Solo se manifiesta en views cuyo layout usa placeholders `{{record.*}}` en filtros de referencia (Activity view: tab Versiones filtra por `{{record.code}}`). AcademicProgram y otros no entran al path. Edit no dispara ese path. No es RBAC (reproducible con Admin y Consultor).
- M1 (micro-decision): sin external Jira propio; se relaciona a UPONE-1353 y se usa ese id en rama/commit para coherencia con la revision del team (decision del dev). No se crea issue nuevo en Jira.
- M2 (micro-decision): el `status` duplicado en `default_Activity_view.json` (introducido por UPONE-1381) se descarto como causa; es detalle de config aparte, fuera de alcance de este tactic.

## Sessions

### Session 1 — 2026-07-24 — fix import faltante en RecordDetail [phase: tactic]

**Objetivo**: agregar `replaceRecordPlaceholders` al import de `recordDetailReferenceFilters` en RecordDetail.vue y validar.

**Tasks completadas**:

- [x] T1: Agregar `replaceRecordPlaceholders` al import existente ([RecordDetail.vue:212](../../../uplanner/up1/layout/src/layouts/RecordDetail.vue)).
      Cambio: `import { resolveFilterPlaceholders, stripReferenceSchemaHints, stripRelationHintsForFKField }` → se agrega `replaceRecordPlaceholders` a la lista del mismo import de `./recordDetailReferenceFilters` ·
      Validado: typecheck del workspace layout (RecordDetail.vue sin errores; los 6 call-sites resuelven — errores restantes son preexistentes en archivos ajenos del working tree) + `recordDetailReferenceFilters.spec.ts` 13/13 verde ·
      → commit `117039f`

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| 117039f | T1 | UPONE-1353 fix(layout): import replaceRecordPlaceholders in RecordDetail | layout/src/layouts/RecordDetail.vue |
| 07be236 | — | Merge remote-tracking branch 'origin/develop' (traer develop actualizado a la rama, 5 commits) | (merge, sin conflictos) |

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:

- T1 + `117039f`: se agrego `replaceRecordPlaceholders` al import de `recordDetailReferenceFilters` en [RecordDetail.vue:212](../../../uplanner/up1/layout/src/layouts/RecordDetail.vue). Antes: la funcion se movio a `recordDetailReferenceFilters.ts` en `52588ba` (PR #298, UPONE-1353) pero el import se omitio → `ReferenceError` en runtime que dejaba en blanco las RecordDetail view con placeholders `{{record.*}}` en filtros. Despues: import completo, la view rinde con datos.
- `07be236`: merge de `origin/develop` (5 commits) a la rama para dejar el PR actualizado. Sin conflictos; el fix sobrevive (origin/develop aun tenia el import buggy → no era redundante).

**Como se valido**: typecheck (RecordDetail.vue limpio; los errores restantes son preexistentes en archivos ajenos del working tree sucio) + spec `recordDetailReferenceFilters.spec.ts` 13/13 + **smoke runtime ejecutado por el dev** (Activity view carga los campos con datos; regresion confirmada resuelta). Rama pusheada a `origin/fix/UPONE-1353-recorddetail-placeholder-import`; **PR #309 MERGEADO a develop** (https://bitbucket.org/uplanner/layout/pull-requests/309, `fix/UPONE-1353-...` -> `develop`; rama source auto-borrada por `close_source_branch`). El fix ya vive en `develop` (RecordDetail.vue import completo). Repo local dejado en `develop` actualizado, rama del fix limpiada.

**Que NO se hizo** (out-of-scope):

- `status` duplicado en `default_Activity_view.json` (UPONE-1381): detalle de config aparte, descartado como causa (ver M2).
