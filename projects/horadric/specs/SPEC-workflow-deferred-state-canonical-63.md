---
id: SPEC-workflow-deferred-state-canonical-63
project: horadric
ticket: HOR-063
status: done
---

# Estado `deferred` canonical para tasks movidas a backlog

# Estado `deferred` canonical para tasks movidas a backlog

## Executive summary — lo que estas aprobando

### Que se quiere

Extender el sistema canonical de status DKC con `deferred` para distinguir tasks **diferidas explicitamente por decision** de tasks `pending` (no priorizadas) o `blocked` (bloqueadas por dependencia externa). El marker `[D]` en ticket markdown + `Status: deferred` en spec hacen el cambio visible y semantico.

### Decisiones criticas que necesitan tu OK

- **Marker `[D]` mayuscula** (no `[d]` ni `[-]`): mayuscula distingue visualmente como "estado distinto" del marker minimal `[ ]/[x]/[~]`. Custom de DKC; GitHub markdown render lo muestra como texto plano — OK porque HC es el viewer canonical.
- **`deferred` NUNCA bloquea cierre**: a diferencia de `blocked` con priority `must` que si bloquea (DET-17). `deferred` siempre permite cierre — la diferencia con `blocked` es semantica.
- **Cross-check con `## Backlog` obligatorio**: si `Status: deferred`, debe haber item correspondiente en `## Backlog` del ticket. Validator extension detecta drift "deferred sin backlog ref".
- **Backward compat**: tickets historicos con `Status: blocked` que en realidad son deferred NO se migran retroactivos (criterio igual a DET-21/22/24). Solo HOR-062 S1.T3 se migra como dogfood en S2.

### Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|--------|------------|
| Convencion `[D]` no estandar CommonMark — render en GitHub como texto plano | OK: HC es viewer canonical. Documentar en RULE update + agregar nota explicativa en template |
| Confusion entre `deferred` y `blocked` post-fix | Tabla explicita "cuando usar cada estado" en template + RULE-workflow-session-format-canonical-002 |
| Validator extension produce falsos positivos en tickets historicos con `Status: blocked` por deferred | Sin cambio de comportamiento — `blocked` sigue valido. Solo se introduce `deferred` como opcion adicional |
| HC viewer no se actualiza tras parser change (cache, build) | Reload del HC dev-server post-cambio |

### Que NO se hace en este ticket

- Migracion retroactiva de tickets cerrados con `Status: blocked` por deferred
- Auto-transicion `deferred → done` cuando se ejecuta el backlog item — futuro HOR-063.2
- Cambio en DET-17 (lifecycle del backlog) — `deferred` es independiente, no reemplaza el sistema priority must/should/could

### Tamano estimado

**5 SP**, T2, 2 sessions execute + 1 close.

### Como vas a saber que funciona

- HOR-062 S1.T3 post-migration: ticket muestra `[D]`, spec dice `Status: deferred`, HC render con icono dash
- Validator pasa 0 drifts en HOR-062 post-migration
- HOR-058/060 cerrados sin warnings (no falsos positivos)
- Test fixture con `[D]` en ticket pero `Status: blocked` en spec → validator detecta drift

## Purpose

Cerrar el gap conceptual del sistema canonical DKC: tasks diferidas por decision quedan visualmente identicas a tasks pendientes (ambas `[ ]`) y semanticamente forzadas a usar `Status: blocked` que no aplica. El nuevo estado `deferred` + marker `[D]` lo arregla en 7 capas (parser + render + validator + spec template + ticket template + prompt + rule).

## Requirements

### REQ-IMPROVE-01 — `StepStatus` enum + parser HC con marker `[D]`

> **Que cambia**: el parser HC (`sessions.ts`) reconoce `[D]` en checkboxes de session como `StepStatus = 'deferred'`. Extension del patron HOR-056 capa A (que agrego `[~]` para `'in_progress'`).
> **Por que**: sin parser support, el marker `[D]` queda invisible en HC — drift visual entre ticket markdown y render.

El sistema MUST:

- Extender el regex de checkboxes en `horadric-cube/server/deckard/sessions.ts` linea ~901 para aceptar `[D]` o `[d]` (tolerante)
- Extender `StepStatus` type en `horadric-cube/src/api/client.ts` linea ~46 con valor `'deferred'`
- Mapping en `taskToAtomicStep()`: si `task.checked === false` Y `task.deferred === true` → `status = 'deferred'`
- Extension del flag interno `SessionTask.deferred?: boolean` (similar a `inProgress` para `[~]`)

### REQ-IMPROVE-02 — Spec.Status enum extendido con `deferred`

> **Que cambia**: el spec template + validator reconoce `deferred` como Status valido (junto a `pending/in_progress/done/blocked`).
> **Por que**: HOR-062 S1.T3 forzo el uso de `Status: blocked` con nota inline porque `deferred` no existia. Semantico incorrecto.

Cambios:

- `templates/records/spec.md`: documentar enum explicito con tabla "cuando usar cada estado"
- `commands/lib/schemas/session-checkboxes.ts` linea ~282 regex `extractSpecTasks` extiende a capturar `deferred`
- `commands/lib/schemas/session-checkboxes.ts` `expectedMarker()` retorna `'D'` para `deferred`

### REQ-IMPROVE-03 — HC render con icono distintivo + tooltip backlog ref

> **Que cambia**: cuando un atom tiene `status: 'deferred'`, HC render usa icono dash horizontal (o chevron) + tooltip que muestra el backlog item ref si existe.
> **Por que**: distincion visual clara de pending `[ ]`. Tooltip da contexto inmediato al dev supervisor.

Cambios en `horadric-cube/src/components/ticket-sections/SectionSessions.vue` o componente atomo:

- Extender `stepStatusMeta` (linea ~85, HOR-058 S8) con caso `deferred: { icon: 'minus-circle' o 'arrow-right-circle' Lucide, colorClass: 'text-slate-500', label: 'Deferred' }`
- Tooltip dinamico: si task tiene `description` que matchea `backlog item B\d+` → tooltip muestra ref
- Sin spinner ni check — solo icono estatico + tooltip

### REQ-IMPROVE-04 — Validator mapping `deferred ↔ [D]` sin drift

> **Que cambia**: validator `detectCheckboxDrift` reconoce mapping `spec.deferred ↔ ticket.[D]` como valido.
> **Por que**: sin esto, el validator reporta error de "drift" donde no lo hay.

Cambios en `commands/lib/schemas/session-checkboxes.ts`:

- `expectedMarker('deferred')` retorna `'D'` (no lowercase, tolerante)
- `extractTicketCheckboxes` regex `[([ xXD~])]` (agregar D al character class)
- `TicketCheckbox.marker` type extension con `'D'`
- Mapping en comparator: deferred + `[D]` → no drift

### REQ-IMPROVE-05 — Cross-check `## Backlog` obligatorio para `deferred`

> **Que cambia**: si una task en spec tiene `Status: deferred`, debe haber item correspondiente en `## Backlog` del ticket. Validator extension detecta drift.
> **Por que**: deferred sin backlog ref pierde la trazabilidad — el task queda en "limbo" sin plan de retoma.

Implementacion en `commands/lib/schemas/session-checkboxes.ts`:

- Nueva funcion `detectDeferredWithoutBacklog(ticketContent, specContent)`
- Para cada task con `Status: deferred` en spec, buscar mention del task_id (o de la descripcion) en `## Backlog` del ticket
- Si no encuentra → warning `cat-deferred-no-backlog-ref`
- Agregar al pipeline `detectCheckboxDrift` (que ya orquesta findings)

### REQ-PRESERVE-01 — Backward compat con `blocked`

> **Que cambia**: nada en tickets historicos. `Status: blocked` sigue valido sin warnings.
> **Por que**: HOR-001..HOR-061 + HOR-062 (pre-migration) usan `blocked` por deferred. No retroactivo.

Validator NO genera findings sobre tickets que usan `Status: blocked` para tasks deferred. La distincion `blocked` vs `deferred` es opt-in del dev en tickets nuevos.

### REQ-REGRESSION-01 — Parser HC + validator sin regression

> **Que cambia**: nada — verificacion que la extension no rompe lo existente.

Sin regression en parser HC sobre HOR-058/HOR-060 cerrados. Validator sobre 3 tickets cerrados retorna 0 findings (no falsos positivos).

## Test cases

| # | Case | REQ | Affects UI | Status | Session | Cambios gatillados |
|---|------|-----|------------|--------|---------|---------------------|
| TC-1 | Parser HC reconoce `[D]` y `[d]` como `StepStatus = 'deferred'` | REQ-IMPROVE-01 | no | pending | 1 | — |
| TC-2 | `taskToAtomicStep` mapea `task.deferred → status='deferred'` | REQ-IMPROVE-01 | no | pending | 1 | — |
| TC-3 | Validator `extractSpecTasks` extrae task con `Status: deferred` | REQ-IMPROVE-02 | no | pending | 1 | — |
| TC-4 | HC render: atom con `status: 'deferred'` muestra icono dash + tooltip | REQ-IMPROVE-03 | yes | pending | 1 | — |
| TC-5 | Validator: spec `deferred` + ticket `[D]` → 0 drifts | REQ-IMPROVE-04 | no | pending | 1 | — |
| TC-6 | Validator: spec `deferred` + ticket `[ ]` → drift error | REQ-IMPROVE-04 | no | pending | 1 | — |
| TC-7 | Validator: spec `deferred` + ticket sin backlog ref → warning `deferred-no-backlog-ref` | REQ-IMPROVE-05 | no | pending | 1 | — |
| TC-8 | HOR-062 S1.T3 post-migration: `[D]` + `Status: deferred` + backlog B1 → 0 drifts | dogfood | yes | pending | 2 | — |
| TC-9 | HOR-058 / HOR-060 cerrados sin warnings (REQ-PRESERVE-01) | REQ-PRESERVE-01 | no | pending | 2 | — |
| TC-10 | Server tests 3/3 pass (REQ-REGRESSION-01) | REQ-REGRESSION-01 | no | pending | 2 | — |

## Tasks

### Session 1 — Parser HC + validator + render (T2, gate auto)

| # | Task | Role | Files | Tests | DoD | Rollback | Status |
|---|------|------|-------|-------|-----|----------|--------|
| S1.T1 | Parser HC `sessions.ts` regex `[D]` + extender `StepStatus` enum + flag `SessionTask.deferred` + mapping en `taskToAtomicStep` | developer | horadric-cube/server/deckard/sessions.ts | TC-1, TC-2 | Parser captura `[D]/[d]` como deferred, type-check pass | git revert | done |
| S1.T2 | Client API `client.ts` extender `StepStatus` type union con `'deferred'` | developer | horadric-cube/src/api/client.ts | TC-1 | type-check pass + server build consistente | git revert | done |
| S1.T3 | Render HC: extender `stepStatusMeta` en SectionSessions (o sub-componente) con caso `deferred` (icono + label + colorClass) + tooltip dinamico backlog ref | developer | horadric-cube/src/components/ticket-sections/SectionSessions.vue | TC-4 | Icono visible distinguible de pending. Tooltip muestra B-ref si existe | git revert | done |
| S1.T4 | Validator extension: `extractSpecTasks` regex + `expectedMarker('deferred')` + `extractTicketCheckboxes` marker `D` + mapping no-drift | developer | commands/lib/schemas/session-checkboxes.ts | TC-3, TC-5, TC-6 | Tests funcionales pass: spec deferred + ticket [D] → 0 drifts; spec deferred + ticket [ ] → drift error | git revert | done |
| S1.T5 | Cross-check backlog: nueva funcion `detectDeferredWithoutBacklog` + integracion en pipeline | developer | commands/lib/schemas/session-checkboxes.ts | TC-7 | Detecta deferred sin ref a `## Backlog`. Warning, no error | git revert | done |
| S1.GATE | Quality review DET-23 standard + commit DET-27 | reviewer | — | TC-1..7 | Gate decision + commit | git revert commit | done |

### Session 2 — Migracion HOR-062 + docs (T2, gate ⚑ fuerte)

| # | Task | Role | Files | Tests | DoD | Rollback | Status |
|---|------|------|-------|-------|-----|----------|--------|
| S2.T1 | Dogfood: migrar HOR-062 S1.T3 (Status `blocked` → `deferred` + ticket checkbox `[ ]` → `[D]`) | scribe | projects/horadric/specs/SPEC-workflow-hc-format-drift-detector-62.md + projects/horadric/tickets/HOR-062.md | TC-8 | Validator post-migration: 0 drifts | git revert | done |
| S2.T2 | Update templates `ticket.md` + `spec.md` con tabla "cuando usar cada estado" (pending/in_progress/done/blocked/deferred) | scribe | templates/records/ticket.md + templates/records/spec.md | grep check | Tabla visible inline en template con ejemplo | git revert | done |
| S2.T3 | Update prompts `request-execute.md` + `scribe.md`: documentar deferred en sub-step A2 + handoff scribe | scribe | prompts/steps/request-execute.md + prompts/agents/scribe.md | grep check | Notas presentes | git revert | done |
| S2.T4 | Extender RULE-workflow-session-format-canonical-002 con seccion "Marker `[D]` y status deferred" + documentar diferencia con blocked | scribe | projects/horadric/rules/workflow/RULE-workflow-session-format-canonical-002.md | grep check | Rule actualizada con tabla + ejemplos | git revert | done |
| S2.T5 | Regression: validator sobre HOR-058/060 (canonical) → 0 falsos positivos. Server tests 3/3 pass | reviewer | — | TC-9, TC-10 | Regression clean | — | done |
| S2.T6 | (Extension scope decidida en S2 por dev feedback) HC banner pasivo "stale-during-session" — heuristica client-side detecta sessions in_progress con 0 executed + >=1 in_progress + >=2 pending. Reusa pattern banner HOR-062 con caso nuevo. Signal informativo, no bloqueante | developer | horadric-cube/src/components/ticket-sections/SectionSessions.vue | smoke HC | Banner aparece para sessions matching la heuristica. Sin falsos positivos en tickets canonical | git revert | done |
| S2.GATE | Quality review DET-23 standard + commit DET-27 | reviewer | — | TC-8..10 | Gate decision + commit | git revert commit | done |

### Session 3 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Files | DoD | Status |
|---|------|------|-------|-----|--------|
| S3.T1 | Summary del ticket | scribe | HOR-063.md ## Summary | seccion poblada | done |
| S3.T2 | Learns refinados | scribe | HOR-063.md + posible promotion a rule | tabla learns con status final | done |
| S3.T3 | Teach-close decision (skip-tactico segun frontmatter) | scribe | HOR-063 frontmatter | teachings.close marked | done |
| S3.T4 | frontmatter close | scribe | HOR-063.md frontmatter | closed | done |
| S3.GATE | Quality review final + commit DET-27 | reviewer | — | Gate decision + commit | done |

## Backlog

Vacio al inicio. Items que emerjan durante execute se documentan aqui.

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|

## Open questions

Ninguna al inicio.
