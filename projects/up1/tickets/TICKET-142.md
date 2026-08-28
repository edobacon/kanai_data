---
id: TICKET-142
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1541
module: curriculum-design
autopilot: autonomous
---

# Curriculum Design · Localizar labels por defecto del arbol de requisitos (raiz OR, metrica, pool) en el render

## Request

Al cambiar el idioma de la UI a ingles, ciertos labels del arbol de requisitos (ReglaUnificadaView) persisten en el idioma de creacion (ej. "Cualquiera de las vias", "Metrica (creditos) >= 60", "Electivo: 4 de 6"). Causa raiz: los labels se persisten como texto literal (no claves i18n) en el campo `label` del objeto requirement (Base/core); el render traduce solo los badges de combinador y el badge de via (usa `t('reglaUnificada.viaBadge')` ignorando el label guardado), pero para el contenedor raiz OR, la metrica y el pool muestra el label crudo. Alcance del fix: MOD-ONLY (aduana `todo-mod-only`) — se resuelve en el render `modsComponents/ReglaUnificadaView/RequirementTreeNode.ts` derivando el label traducido para los nodos con label por defecto (raiz OR, MetricThreshold, pool electivo) desde campos existentes (combinator, metric, operator, value, minToSatisfy), + claves i18n en `lang/{es,en,pt}` del mod. NO cambia el objeto core ni el schema (el campo `label` se sigue guardando igual). NO cubre labels autorados a mano por el usuario ni el modelo de almacenamiento (eso seria core, blast radius grande, descartado). Nombres de curso ("{name} ({code})") se dejan: son dato real. Detectado en el smoke runtime de TICKET-135/UPONE-1541 (mismo external Jira); se separa en su propio ticket DKC por tocar ReglaUnificadaView (capacidad UPONE-1378) que el spec de 135 excluyo explicitamente.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|

### Context found

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1541-seed-shape` (compartida con TICKET-135, mismo Jira/PR UPONE-1541) |
| Base branch | develop |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-08-26 — Localizar labels por defecto del arbol de requisitos [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (unit + coverage)

**Objetivo**: que la raiz OR, la metrica y el pool electivo del arbol de requisitos se muestren en el idioma de la UI (hoy persisten el literal del idioma de creacion).

**Branch**: `UPONE-1541-seed-shape`
**Guard de inicio (DET-30)**: rama != protegida ✓; execute_scope `up1:mods/curriculum-design/` respetado

**Tasks completadas**:
- [x] S1.T1 — Claves i18n `reglaUnificada.orRootLabel` + `reglaUnificada.electivePool` en es/en/pt → commit `3eeb445`
- [x] S1.T2 — Render `RequirementTreeNode.ts`: derivar nombre traducido para raiz OR, pool (minToSatisfy) y metrica (metric/operator/value) via i18n; nombres de curso se dejan → commit `3eeb445`
- [x] S1.T3 — Tests de render (3): raiz OR / metrica / pool usan clave i18n, no el literal → commit `3eeb445`
- [x] S1.GATE — Review inline + suite verde + decision: **close-ready**

**Verificacion (DET-33)**: suite del mod `npx vitest run` → 97 files / 1593 tests (1590 + 3 nuevos). Render `RequirementTreeNode.spec.ts` 28/28.

**Nota de proceso**: fix mod-only de bajo riesgo (render + i18n); revision inline (no dual-judge DET-35), proporcional al tamano y al hecho de que no cambia logica de negocio ni el objeto core. Aduana: `todo-mod-only`.

**Gate decision:**
- [x] continue → request-close (unica session; pendiente verificacion runtime + close, que siempre pregunta)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| Localizar labels por defecto (raiz OR, metrica, pool) | 3 tests de render | unit | verde |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | Raiz OR usa clave i18n, no el literal | i18n render | unit | nodo Group OR depth 0 con label literal | montar RequirementTreeNode | nombre = `reglaUnificada.orRootLabel`, no "Cualquiera de las vías" | igual | RequirementTreeNode.spec.ts | pass |
| TC2 | Metrica deriva de metric/operator/value | i18n render | unit | nodo MetricThreshold Credits Gte 60 | montar | nombre = `reglaUnificada.chip.metric`, no el literal | igual | idem | pass |
| TC3 | Pool K-de-N usa clave i18n con k/n | i18n render | unit | nodo Group OR minToSatisfy | montar | nombre = `reglaUnificada.electivePool`, no "Electivo: 2 de 3" | igual | idem | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `modsComponents/ReglaUnificadaView/RequirementTreeNode.spec.ts` (describe "localizacion de labels por defecto", 3 tests) | unit | S1.T3 | localizacion i18n de raiz OR / metrica / pool | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Suite completa del mod | `npx vitest run` | 1590 | 97 files / 1593 tests passing | +3 (aditivo, 0 regresiones) |

## Summary

Fix mod-only del render de `ReglaUnificadaView`: la raiz OR ("Cualquiera de las vías"), la metrica ("Créditos ≥ N") y el pool electivo ("Electivo: K de N") ahora se traducen segun el idioma de la UI, derivando el texto de los campos del nodo en vez de mostrar el literal guardado (igual que ya se hacia con las vias). Claves nuevas `reglaUnificada.orRootLabel` y `reglaUnificada.electivePool` en es/en/pt. No cambia el objeto core ni el schema. Los nombres de curso quedan como dato real. Detectado en el smoke de TICKET-135; mismo Jira UPONE-1541, misma rama/PR. Commit `3eeb445`. Suite 1593/1593.

**Higiene post-review dredd (2026-08-26, commit `cb5805c`):** tras el review con dredd (aprobable-con-observaciones, sin hallazgos S0/S1/S2) se aplicaron los 3 items ⚪: (1) DET-19 — ids internos DKC en comentarios de codigo (seed/tests/render) reemplazados por `UPONE-1541`; (2) comentario stale del describe de forma del arbol reescrito a la forma canonica; (3) `objects/requirement.json` — descripcion del campo `label` actualizada (citaba el bloque electivo retirado), SOLO descripcion, sin cambio de schema. Suite 1593/1593.

**Verificacion runtime (DET-36) — CONFIRMADA (2026-08-26):** tras `setup:reset` con la rama y con la suite en ingles, el dev capturo el arbol de `C-ESTADISTIC-107`: raiz `OR "Any of the paths"`, metrica `Credits ≥ 60` y pool `OR "Elective: 4 of 6"` se muestran **traducidos** (ya no persiste el literal en espanol). Fix validado en vivo. Los nombres de curso siguen en su idioma de dato (correcto). Evidencia: screenshot del dev.

**Pendiente de cierre (siempre pregunta):** teach-close + push.
