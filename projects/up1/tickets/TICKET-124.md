---
id: TICKET-124
project: up1
type: ticket
status: closed
work_type: improvement
module: mods/curriculum-design
autopilot: autonomous
---

# Follow-up UPONE-1539: alta en lote cuenta co-agregados en prereqs + opcion "ver solo lo seleccionado" en el picker

## Request

Follow-up LOCAL de UPONE-1539 (TICKET-120), sin Jira. Dos puntos sobre el alta de asignaturas de la malla modular:

1) BUG — el chequeo de prerrequisitos del alta en LOTE no considera los cursos co-agregados. `findMissingPrereqsForBatch` (mods/curriculum-design/modsComponents/CurriculumMesh/prereqCheck.logic.ts:73-96) recorre cada actividad del lote y llama `findMissingPrereqs(activityId, targetPeriod, placedEntries, ...)` pasando SOLO `placedEntries` (lo ya colocado en el plan); nunca agrega los demas miembros del lote como colocados. El caller `checkPrereqsForBatch` (CurriculumMeshElement.vue:~1660-1681) arma placedEntries desde entries.value, sin el lote. Consecuencia: agregar un curso junto con su prerrequisito reporta el prereq como faltante. Reproducido por el dev: al agregar CALDEMO-ADM-1 + CALDEMO-ADM-5 juntos, el chequeo de ADM-5 (OR {ADM-1, ADM-2}) da "Una de dos (OR) 0 de 1 cursos colocados" aunque ADM-1 va en el mismo lote. Fix propuesto: tratar los targetActivityIds del lote como colocados al evaluar cada actividad (entries sinteticas; en modular al periodo centinela MODULAR_PLACED_PERIOD, satisfaccion por presencia coherente con deriveLevel). Revisar la paridad del mismo caso en up1-mcp (cd_add_plan_entry en lote / la clasificacion equivalente). Sumar test del caso "co-add curso + su prereq".

2) ENHANCEMENT — en la seleccion de asignaturas del alta (picker/ItemSearchPanel del AddEntryModal), agregar una opcion/toggle "ver solo lo seleccionado" que filtre la lista a los items actualmente seleccionados, para poder revisar de forma practica que se esta ingresando antes de confirmar (util especialmente con el alta guiada multinivel de REQ-10, donde el lote crece).

Origen: UPONE-1539 REQ-10/REQ-11 (alta guiada + batch atomico). Guia de pruebas: kb/sp8/UPONE-1539-guia-seed-y-pruebas.md.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (1 fix + 1 enhancement) |
| Tipo de cambio | fix de lógica pura (prereq batch) + affordance UI (toggle en picker) |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | up1-mcp (verificar paridad del alta en lote) |

> **Addendum (2026-08-10, post-smoke de Session 1):** revisando el smoke, el dev sumó tres puntos al alcance, ejecutados
> y commiteados (locales) en `feat/UPONE-1539-modular-mesh` y registrados como Session 2 / REQ-4/REQ-5/REQ-6:
> REQ-4 (quitar el hint redundante del alta modular), REQ-5 (texto de ayuda del campo `progression` más claro) y
> REQ-6 (fix de la derivación de niveles modular: excluir opciones OR/K-de-N no colocadas; caso ADM-5). El Request
> original de arriba no se modifica (DET-3); este addendum solo registra la ampliación.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El chequeo de prereqs del alta en lote NO cuenta los co-agregados | ✓ confirmada | `findMissingPrereqsForBatch` (prereqCheck.logic.ts:73-96) llama `findMissingPrereqs(id, targetPeriod, placedEntries, …)` por cada actividad pasando solo `placedEntries`; nunca inyecta los otros `targetActivityIds` del lote. Caller `checkPrereqsForBatch` (CurriculumMeshElement.vue:~1660-1681) arma placedEntries desde `entries.value` (plan actual), sin el lote. Repro dev: ADM-1+ADM-5 juntos → OR de ADM-5 "0 de 1 colocados". |
| H2 | El fix es local a la lógica pura + su caller, sin tocar el evaluador | ✓ confirmada | Basta inyectar entries sintéticas de los `targetActivityIds` como colocadas (en modular al centinela `MODULAR_PLACED_PERIOD`, presencia coherente con deriveLevel/L7). `findMissingPrereqs`/`evaluateRequirementTree` intactos. |
| H3 | El picker tiene un pipeline de filtros puros extensible | ✓ confirmada | `activityPicker.logic.ts`: `visibleItems` = `filterByText(filterByDepartment(excludePlacedActivities(...)))` (l.64-69). Agregar `filterBySelected(items, selectedIds, onlySelected)` al pipeline + toggle en `AddEntryModal.ts` + i18n. Los seleccionados ya viven en el estado del modal (`preselectedIds`/selección del wizard). |
| H4 | Paridad MCP del bug: ¿cd_add_plan_entry procesa lotes? | ~ a verificar | El alta guiada/batch vive en el mod (createPlanEntriesBatch). En up1-mcp `cd_add_plan_entry` agrega de a una; el equivalente de "co-add" (si existe) o su ausencia se confirma en execute. Si el MCP no hace alta en lote con inter-satisfacción, el bug es solo del mod. |

### Context found

**Punto 1 (bug del alta en lote):** confirmado 1:1 contra el código (H1/H2). El fix trata los `targetActivityIds` del lote como colocados al evaluar cada actividad — un curso y su prereq co-agregados se satisfacen entre sí. En modular, presencia (centinela); en secuencial el alta guiada no aplica (REQ-10 es modular-only, DEC-LOCAL-07 de 1539), así que el co-add relevante es modular.

**Punto 2 (toggle "ver solo lo seleccionado"):** affordance sobre el picker existente (H3). NO es superficie visual nueva → `creates_visual: false` (no gatilla design-draft DET-18); es un filtro más en el pipeline puro + un control en el modal.

**Origen:** UPONE-1539 REQ-10/REQ-11. Sin Jira (follow-up local).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | En la derivacion de niveles modular, una opcion NO colocada de un grupo OR/K-de-N aportaba nivel 0 y colapsaba el min/K-esimo; debe excluirse (solo cuentan las vias colocadas). Caso ADM-5: OR con solo una opcion colocada quedaba un nivel abajo. | smoke S2 | 2 | refined | RULE-curriculum-design-modular-level-excludes-unplaced-options |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-08-10 — Fix prereqs del alta en lote + toggle del picker + paridad MCP [tipo: ⚑ fuerte] [tier: T2]

**Tasks completadas:**

- [x] S1.T1 — Fix `findMissingPrereqsForBatch` (contar co-agregados del lote como colocados) + reflejo en `checkPrereqsForBatch` + unit test del caso co-add (REQ-1)
- [x] S1.T2 — `filterBySelected` + toggle "ver solo lo seleccionado" en el picker del `AddEntryModal` + i18n es/en/pt + test (REQ-2)
- [x] S1.T3 — Verificar/portar paridad del fix en up1-mcp + regresión (suite del mod + up1-mcp) (REQ-3)
- [x] S1.GATE — Gate de sync (tier T2): persistir, quality review con dual-judge del fix de REQ-1, decidir continue/iterate/escalate

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 1 cerrada. Fix + toggle + MCP N/A. Dual-judge (1 iteracion) + verificacion independiente. Commits locales; push diferido a OK del dev. Habilita request-close.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-10 — Ajustes post-smoke: hint redundante + texto progresion + fix derivacion de niveles [tipo: ⚑ fuerte] [tier: T2]

**Tasks completadas:**

- [x] S2.T1 — Quitar hint redundante del alta modular + CSS + i18n es/en/pt (REQ-4)
- [x] S2.T2 — Texto de ayuda del campo progresion mas claro (REQ-5)
- [x] S2.T3 — Fix derivacion de niveles: excluir opciones OR/K-de-N no colocadas + 5 tests (REQ-6)
- [x] S2.GATE — Gate de sync (T2): quality review del fix de niveles, decidir continue/iterate/escalate

_(Gate decision pendiente: se materializa al cerrar S2.GATE via close-gate.)_

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 cerrada. REQ-4 (hint), REQ-5 (texto progresion), REQ-6 (fix derivacion niveles OR/K-de-N + 7 tests). Reviewer approve + verificacion independiente (26 deriveLevel + 1541 suite verde, runtime ADM-5 Nivel 2). Commits ec6e49c/97477bd/f45e291/1ac9b1c locales; push diferido a OK del dev. Habilita request-close.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-4 | hint ausente junto al boton "Agregar asignatura" en malla modular | smoke (sin unit) | verificado |
| REQ-5 | help text de `progression` actualizado en `default_Curriculum_edit.json` | config (revision) | verificado |
| REQ-6 | OR con opcion ausente / grupo sin vias colocadas / K-de-N estructural vs insuficiente | unit (`deriveLevel.logic.spec.ts`, 5 tests) | verde |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| deriveLevel.logic.spec.ts | unit | S2.T3 | REQ-6 | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| suite mod | npx vitest run | 1536 | 1541 | +5 verde |

## Summary

Follow-up local de UPONE-1539 (sobre TICKET-120) cerrado en 2 sessions, ambas gateadas con `continue`.

**Entregado (REQ-1..REQ-6):**
- REQ-1: el chequeo de prerrequisitos del alta en lote ahora cuenta los cursos co-agregados del mismo lote como colocados (gateado a modular; el alta secuencial conserva el bloqueo Before). Caso ADM-1+ADM-5 juntos ya no reporta falso faltante.
- REQ-2: toggle "ver solo lo seleccionado" en el picker del `AddEntryModal` (nuevo filtro `filterBySelected` en el pipeline puro + i18n es/en/pt).
- REQ-3: paridad del bug en up1-mcp evaluada N/A con evidencia (el alta en lote con inter-satisfaccion vive solo en el mod).
- REQ-4: se quito el hint redundante del alta modular (la maqueta ya tenia el banner).
- REQ-5: texto de ayuda del campo `progression` mas claro.
- REQ-6: fix de la derivacion de niveles modular. Una opcion OR/K-de-N no colocada aportaba nivel 0 y colapsaba el min/K-esimo; se excluye con el sentinela `ABSENT_PATH`. ADM-5 (OR con solo ADM-1 colocado) pasa a Nivel 2.

**Calidad:** reviewer independiente `approve` + verificacion independiente del self-report; suite del mod 1543 verde; `vue-tsc` limpio; runtime Playwright verificado en 4 puntos (co-add sin bloqueo falso, toggle filtra, hint ausente, ADM-5 en Nivel 2).

**Rule creada:** `RULE-curriculum-design-modular-level-excludes-unplaced-options` (en `rules/mods/curriculum-design/`), refina el hallazgo del bug de derivacion de niveles (learn L1 refinado).

**Commits LOCALES** en `feat/UPONE-1539-modular-mesh` (7, sin push):
- `9812ee2` — REQ-1 co-add en el chequeo de prereqs del alta en lote
- `f888c6b` — REQ-2 toggle "ver solo lo seleccionado"
- `ec6e49c` — REQ-6 fix derivacion de niveles (excluir opciones no colocadas)
- `97477bd` — REQ-4 quitar hint redundante del alta modular
- `f45e291` — REQ-5 texto de ayuda del campo `progression`
- `1ac9b1c` — tests del caso all-absent (derivacion de niveles)

**Push pendiente de OK del dev:** el dev eligio el cierre canonico pero NO pushear. Los 7 commits quedan locales en la rama; el push espera confirmacion explicita.
