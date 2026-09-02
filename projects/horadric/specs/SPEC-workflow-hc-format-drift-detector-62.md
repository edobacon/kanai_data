---
id: SPEC-workflow-hc-format-drift-detector-62
project: horadric
ticket: HOR-062
status: done
---

# Detector de format drift en sessions del ticket (HC viewer + validator + prompt + a-hook)

# Detector de format drift en sessions del ticket (HC viewer + validator + prompt + a-hook)

## Executive summary — lo que estas aprobando

### Que se quiere

Cerrar 3 manifestaciones empiricas del bug recurrente "session escrita con formato no-canonical → HC parser miss → dev se queda ciego al avance":

- **F1-F4 original**: tasks de session escritas como tabla markdown (no lista checkbox)
- **F5**: `## Plan de sessions` como seccion `##` separada (fuera de `## Sessions`)
- **F6**: session con `S{N}.GATE [x]` (task marcada done) pero sin bloque `**Gate decision:**` canonical

Patron sistemico: el LLM elige formato no canonical, HC parser no matchea, el dev no ve avance, sin signal visible ni enforcement programatico. Reincidente pese a HOR-056 + HOR-057 + HOR-058.

### Decisiones criticas que necesitan tu OK

- **Defensa en profundidad** (no solo parser tolerante): banner UI (signal) + validator (deteccion) + prompt (prevencion) + a-hook (enforcement) — la combinacion detiene el bug en distintas capas
- **No retroactivo**: tickets cerrados pre-HOR-062 NO se migran ni se marcan como warning (criterio igual a DET-21/22/24)
- **Compat backward**: el parser HC actual no se modifica para "aceptar tablas" — eso mantendria 2 formatos en el ecosistema y no resolveria causa raiz

### Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|--------|------------|
| Validator extension produce falsos positivos en tickets cerrados pre-HOR-062 | Skip ticket si `status: closed` y `closed_date < HOR-062.created`. Tests con HOR-031 pre-fix como fixture y HOR-058 como negative |
| A-hook bloquea Gate D en flujos legitimos donde el ticket esta a medio escribir | A-hook con flag `--strict` que default es warn (no bloqueante) primer pase; bloqueante solo si dev opta in |
| Banner UI distrae del contenido | Banner amber-50 discreto, dismissible con localStorage. Reusa pattern de banner de HOR-018 |

### Que NO se hace en este ticket

- Parser HC tolerante a tablas (opcion A descartada — mantiene 2 formatos)
- Auto-fix del format drift (solo deteccion + warning)
- Refactor de TasksTable del spec (sigue siendo tabla, HC la renderiza bien)
- Migracion retroactiva de tickets cerrados

### Tamano estimado

**3 SP**, T2, 2 sessions execute + 1 close.

### Como vas a saber que funciona

- HOR-031 (que tuvo todas las 3 manifestaciones) sirve como fixture — el validator extension detecta los 3 casos pre-fix
- HOR-058 / HOR-060 cerrados sin warnings (no falsos positivos)
- Banner UI visible en HC para tickets test
- Gate D del request-execute bloquea (en modo strict) si emerge drift

## Purpose

Cerrar el patron sistemico de format drift en sessions de ticket DKC. El bug es recurrente porque la convencion vive solo en `RULE-workflow-session-format-canonical-002` (texto) y no hay mecanismo programatico que la enforced. Cada nuevo ticket con LLM diferente repite el bug con variantes.

## Requirements

### REQ-IMPROVE-01 — Banner UI en HC viewer para sessions con drift

> **Que cambia**: HC viewer muestra banner amber sobre la session cuando detecta drift de formato (sin tasks parseadas, sin bloque Gate decision, plan-de-sessions fuera de `## Sessions`).
> **Por que**: el dev supervisor pierde signal visible — la session aparece "vacia" o "en ejecucion" sin explicacion. Banner discreto + link a la rule lo desbloquea.

El sistema MUST:

- Renderizar banner amber en `SectionSessions.vue` cuando para una session:
  - `atoms.length === 0` Y el heading existe → "Session sin tasks parseadas — verificar formato canonical"
  - `session.status === 'in_progress'` Y existe checkbox `S{N}.GATE [x]` → "Drift: task GATE marcada pero falta bloque Gate decision narrative"
- Renderizar banner en `TicketDetail.vue` o equivalente cuando:
  - Existe `## Plan de sessions` como seccion `##` separada → "DET-20: plan-de-sessions debe vivir dentro de `## Sessions`"
- Cada banner con link a `prompts/deterministic-rules.md` (DET-20) o `RULE-workflow-session-format-canonical-002`
- Banner dismissible con localStorage (no spam si el dev decide ignorar)

### REQ-IMPROVE-02 — Validator `dkc-validate SessionCheckboxes` extendido para 3 casos

> **Que cambia**: el validator existente (HOR-056 + HOR-057) ahora detecta los 3 casos del patron F1+F5+F6.
> **Por que**: el validator es la fuente de verdad para a-hook bloqueante. Sin deteccion, no hay enforcement programatico.

Cada session ejecutada en el ticket MUST validar:

- **F1 check**: si el bloque `## Sessions` contiene heading `### Session N` Y el contenido tiene IDs `S{N}.T*` o `S{N}.GATE` PERO no hay checkboxes en lista canonical → error `cat-session-tasks-not-list`
- **F5 check**: si existe `## Plan de sessions` como seccion `##` separada (no dentro de `## Sessions`) → error `cat-plan-out-of-sessions`
- **F6 check**: si session tiene checkbox `- [x] S{N}.GATE` Y NO contiene bloque `**Gate decision:**` con al menos 1 opcion `[x]` → error `cat-gate-task-no-narrative`

Skip backward compat: tickets con `status: closed` y `closed_date < 2026-05-21` skip validation.

### REQ-IMPROVE-03 — Ejemplo canonical inline en template + prompt

> **Que cambia**: `templates/records/ticket.md` y `prompts/steps/request-execute.md` ganan ejemplo canonical de session con AMBOS marcadores (task `[x]` + bloque narrative completo).
> **Por que**: la rule vive en `rules/workflow/`. El LLM principal rellena el template — si el template no muestra ejemplo, el LLM inventa (patron observado en HOR-031).

Cambios concretos:

- `templates/records/ticket.md`: ejemplo de session cerrada en seccion `## Sessions` con:
  - Heading `### Session N — fecha — objetivo [phase: ...]`
  - Tasks en lista checkbox
  - Bloque `**Gate decision:**` con 4 options
- `prompts/steps/request-execute.md` Sub-step A2: nota canonical con ejemplo + advertencia "tabla NO se parsea"

### REQ-IMPROVE-04 — A-hook bloqueante en Gate D (opt-in strict mode)

> **Que cambia**: `prompts/steps/request-execute.md` Gate D ejecuta `dkc-validate SessionCheckboxes` y bloquea avance si `--strict` flag activo.
> **Por que**: validator + banner detectan, pero el LLM principal puede ignorarlos. A-hook bloqueante cierra el loop (patron HOR-058 T2).

Modos:

- Default: `--warn` — validator corre, output warnings en log, no bloquea
- Strict (opt-in via env var o flag dev): `--strict` — error bloquea Gate D, requiere fix antes de continue

### REQ-PRESERVE-01 — Compat backward con tickets cerrados

> **Que cambia**: nada en tickets cerrados pre-HOR-062.
> **Por que**: migrar HOR-001..HOR-061 retroactivo es scope creep.

Validator skip ticket si `status: closed` y `closed_date < 2026-05-21`. HC banner skip ticket si frontmatter indica `closed_date < 2026-05-21`.

### REQ-REGRESSION-01 — Server tests pass + HC tests no degradan

> **Que cambia**: nada — verificacion que la extension no rompe lo existente.

Suite `server/tests/` retorna 3/3 pass. Suite `horadric-cube` tests no agrega failures.

## Test cases

| # | Case | REQ | Affects UI | Status | Session | Cambios gatillados |
|---|------|-----|------------|--------|---------|---------------------|
| TC-1 | HC banner aparece cuando session tiene heading + 0 atoms parseados | REQ-IMPROVE-01 | yes | pending | 1 | — |
| TC-2 | HC banner aparece cuando S{N}.GATE [x] sin bloque narrative | REQ-IMPROVE-01 | yes | pending | 1 | — |
| TC-3 | HC banner aparece cuando `## Plan de sessions` fuera de `## Sessions` | REQ-IMPROVE-01 | yes | pending | 1 | — |
| TC-4 | `dkc-validate SessionCheckboxes` detecta F1 drift en HOR-031 pre-fix S2 | REQ-IMPROVE-02 | no | pending | 2 | — |
| TC-5 | Validator detecta F5 en HOR-031 pre-fix | REQ-IMPROVE-02 | no | pending | 2 | — |
| TC-6 | Validator detecta F6 en HOR-031 pre-fix S2 | REQ-IMPROVE-02 | no | pending | 2 | — |
| TC-7 | Validator NO produce falsos positivos en HOR-058 / HOR-060 (cerrados canonical) | REQ-IMPROVE-02 | no | pending | 2 | — |
| TC-8 | Template `ticket.md` contiene ejemplo session canonical inline | REQ-IMPROVE-03 | no | pending | 1 | — |
| TC-9 | A-hook `--strict` bloquea Gate D en ticket con drift | REQ-IMPROVE-04 | no | pending | 2 | — |
| TC-10 | A-hook default `--warn` muestra warnings sin bloquear | REQ-IMPROVE-04 | no | pending | 2 | — |
| TC-11 | Tickets cerrados pre-2026-05-21 no producen warnings (compat) | REQ-PRESERVE-01 | no | pending | 2 | — |
| TC-12 | Server tests 3/3 pass post-fix | REQ-REGRESSION-01 | no | pending | 2 | — |

## Tasks

### Session 1 — F1 banner UI + F3 ejemplo en template (T2, gate auto)

| # | Task | Role | Files | Tests | DoD | Rollback | Status |
|---|------|------|-------|-------|-----|----------|--------|
| S1.T1 | F1.a: banner amber en SectionSessions cuando atoms.length===0 | developer | horadric-cube/src/components/ticket-sections/SectionSessions.vue | TC-1 | Banner visible con texto + link rule | git revert | done |
| S1.T2 | F1.b: banner cuando S{N}.GATE [x] sin bloque Gate decision | developer | SectionSessions.vue (helper detect) | TC-2 | Banner detecta drift y muestra | git revert | done |
| S1.T3 | F1.c: banner cuando `## Plan de sessions` fuera de `## Sessions` (deferred a backlog B1 — requiere prop con markdown raw o detect server-side) | developer | TicketDetail.vue o helper | TC-3 | Banner DET-20 visible | git revert | deferred |
| S1.T4 | F3.a: ejemplo session canonical en templates/records/ticket.md | developer | templates/records/ticket.md | TC-8 | Template tiene ejemplo inline | git revert | done |
| S1.T5 | F3.b: nota canonical en prompts/steps/request-execute.md A2 | developer | prompts/steps/request-execute.md | grep check | Nota presente | git revert | done |
| S1.GATE | Quality review DET-23 light + commit DET-27 | reviewer | — | TC-1, TC-2, TC-3, TC-8 | Gate decision + commit | git revert commit | done |

### Session 2 — F2 validator + F4 a-hook + F5+F6 detectors (T2, gate ⚑ fuerte)

| # | Task | Role | Files | Tests | DoD | Rollback | Status |
|---|------|------|-------|-------|-----|----------|--------|
| S2.T1 | F2.a: extender commands/lib/schemas/session-checkboxes.ts con F1 detector | developer | commands/lib/schemas/session-checkboxes.ts | TC-4 | Detecta drift en HOR-031 pre-fix S2 | git revert | done |
| S2.T2 | F2.b + F5: detector plan-fuera-de-sessions | developer | session-checkboxes.ts | TC-5 | Detecta F5 | git revert | done |
| S2.T3 | F2.c + F6: detector S{N}.GATE [x] sin bloque narrative | developer | session-checkboxes.ts | TC-6 | Detecta F6 | git revert | done |
| S2.T4 | F2.d: skip backward compat (tickets cerrados pre-2026-05-21) | developer | session-checkboxes.ts | TC-7, TC-11 | No falsos positivos en HOR-058/060 | git revert | done |
| S2.T5 | F4: a-hook bloqueante en request-execute.md Gate D (modo strict opt-in) | developer | prompts/steps/request-execute.md | TC-9, TC-10 | A-hook bloquea con --strict, warn por default | git revert | done |
| S2.T6 | Regression: server tests + horadric-cube tests | reviewer | — | TC-12 | 3/3 server pass + HC no degrada | — | done |
| S2.GATE | Quality review DET-23 standard + commit DET-27 | reviewer | — | TC-4..7, TC-9..12 | Gate decision + commit | git revert commit | done |

### Session 3 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Files | DoD | Status |
|---|------|------|-------|-----|--------|
| S3.T1 | Summary del ticket | scribe | HOR-062.md ## Summary | seccion poblada | done |
| S3.T2 | Learns refinados → promote a rules/decisions si aplica | scribe | HOR-062.md + rules/ | tabla learns con status final | done |
| S3.T3 | Teach-close decision (skip-tactico segun frontmatter — ticket de proceso) | scribe | HOR-062 frontmatter | teachings.close marked | done |
| S3.T4 | frontmatter close: status closed + closed date | scribe | HOR-062.md frontmatter | closed | done |
| S3.GATE | Quality review final + commit DET-27 | reviewer | — | Gate decision + commit | done |

## Backlog

Vacio al inicio. Items que emerjan durante execute se documentan aqui.

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|

## Open questions

Ninguna al inicio. Si emerge ambigüedad durante execute, registrar aqui + Triage del ticket.
