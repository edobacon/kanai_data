---
id: SPEC-workflow-cycle-validation-44
project: horadric
ticket: HOR-044
status: draft
---

# Cycle validation: intake→design→execute→close (DKC v2 Phase 4 conditional)

# Cycle validation: intake→design→execute→close (DKC v2 Phase 4 conditional)

> **STATUS: draft** — Esta spec NO se ejecuta hasta que C1-C4 (en HOR-044) se cumplan. Es blueprint listo para activacion. Cuando se active: re-clasificar work_type explore → improvement, mover status `draft` → `in_progress`.

## Executive summary — lo que estas aprobando (post-activacion)

> *Lectura de 60s. Aprobacion = activacion del spec.*

### Que se quiere

State machine implicita del workflow DKC explicitada y validada programaticamente. Hoy el orden canonical `intake → design → execute → close` lo gobierna el dev + comando `/dkc`. **HOR-044 implementa la state machine como check pre-step + post-close** para casos donde el dev/LLM no es disciplinado (especialmente local-only Qwen 30B en setup HOR-031).

**Cobertura inicial**: state machine principal (improvement/fix/refactor) + state machine reducida (quick path) + variante explore (termina pre-execute). Backlog re-entry (regla 17) y skip legitimos cubiertos via override flag.

**Solucion**: comando `commands/dkc-validate-cycle {ticket-id}` + integracion opt-in en `request-execute.md` y `request-close.md` via frontmatter `validate_cycle: true`. Override via `--skip-cycle` con razon documentada en session log + frontmatter `cycle_overrides[]`.

### Decisiones criticas (DEC-LOCAL — cerradas en design-intake)

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Default warning + override flag `--skip-cycle`** | Tolerancia a casos legitimos de skip (fix urgente sin design completo). Backward compat |
| 2 | **State machine reducida para quick path** (no exemption total) | Quick puede crecer sin escalate explicito — G2 HOR-023 lo detecta partial; cycle validation lo formaliza |
| 3 | **NO re-entrada de tickets cerrados** | Spawn followup ticket nuevo. Orden estricto cerrado=final |
| 4 | **Lazy validation (solo en close)** | Cero overhead durante execute. Validacion final completa en close |
| 5 | **Tool reporta estado + transiciones validas + blockers + recommended action** | Output util para LLM/dev decidir next step |

### Riesgos

- **H1 refutada (state machine no es simple)**: si emergen sub-states ocultos (backlog re-entry, mid-execute pause, etc.), scope crece. Mitigacion: validar empirico en S1 antes de implementar — si refuta, modelar variantes o abandonar approach
- **Falsos positivos** por casos legitimos de skip: override flag explicito + `cycle_overrides[]` en frontmatter para auditoria
- **Performance overhead** si validacion es eager: lazy validation (solo en close) elimina overhead durante execute

### Que NO se hace

- NO eager validation en cada step (overhead)
- NO auto-correccion de estado inconsistente (solo detectar)
- NO migracion retroactiva
- NO re-entrada de tickets cerrados (spawn followup)
- NO breaking changes en flujo v1 (opt-in mandatorio)
- NO integracion con HOR-024 paralelismo (cuando HOR-024 active, merge probable en HOR-046)

### Tamano

3 sessions execute + 1 close = 4 sessions. SP estimated: **3**. Tiempo: ~3-4h efectivas (menor que HOR-043 — scope reducido, sin design-draft, integracion mas focused).

### Como vas a saber que funciona

- TC-01..04: detectar cycle violations sinteticas (execute sin design, close sin gates D+E, etc.)
- TC-05: override flag funciona y registra en frontmatter
- TC-06: dogfood retroactivo sobre horadric tickets recientes (HOR-040/041/042/043)
- TC-07: performance <500ms en validacion completa

---

## Purpose

Cerrar el dolor no observable HOY del cycle violations. Implementacion programatica de DET-9 (handoffs) + DET-13 (cierre con evidencia). **Solo activar si emerge dolor (C1-C4)** — sin condition, queda como draft pendiente.

Para el dev: cero round-trips por orden roto cuando se active HOR-031 local-only o HOR-024 paralelismo. Para LLM disciplinado (Opus 4.x + dev guidance): cero overhead via opt-in.

## Requirements

### REQ-IMPROVE-01 — Comando `commands/dkc-validate-cycle {ticket-id}`

> **Que cambia**: nuevo comando que recibe un ticket-id, infiere estado canonical desde frontmatter + sessions + spec status, reporta transiciones validas + gates faltantes + recommended action.
> **Por que**: implementacion programatica de la state machine implicita. Sin tool, validation manual + olvidable.

El validator MUST:
- Aceptar `ticket-id` (required) + `--json/--strict/--skip-cycle/--config` opcionales
- Inferir estado canonical desde frontmatter (`status`, `work_type`) + sessions (`phase` + count) + spec status
- Reportar: `current_state`, `next_valid_transitions[]`, `blockers[]`, `recommended_action`
- Exit codes: 0 estado coherente / 1 violation (bloqueante con --strict) / 2 warnings / 3 error tecnico

### REQ-IMPROVE-02 — State machine canonical modelada

> **Que cambia**: archivo `commands/lib/cycle-machine.ts` define la state machine como estructura de datos (estados + transiciones + guards).
> **Por que**: contract reusable. Si emerge variante, se extiende en un lugar.

Estados principales (work_type=improvement/fix/refactor):
- `open` (creado, sin work)
- `intake-explore` (intake en curso o completado, pendiente design)
- `in_progress` (execute activo, sessions ejecutandose)
- `closed` (todos los gates completados)

Estados variante quick path:
- `open` → `in_progress(quick)` → `closed`

Estados variante explore:
- `open` → `intake-explore` → `in_progress(spec-draft)` → `closed(explored)`

Transiciones validas + guards documentados en `cycle-machine.ts`.

### REQ-IMPROVE-03 — Integracion opt-in en `request-execute.md` + `request-close.md`

> **Que cambia**: sub-secciones opt-in en los 2 steps que verifican cycle si frontmatter tiene `validate_cycle: true`.
> **Por que**: sin integracion, tool standalone tiene uso limitado. Opt-in preserva backward compat (patron HOR-042/043).

Steps a editar:
- `request-execute.md`: si flag activo, verificar que `design-{tipo}` ejecuto antes de ciclo por task. Si no, exit con warning + sugerencia de invocar `/dkc design`
- **`request-close.md` gate A2**: si flag activo, verificar gates D+E completados en todas las sessions + REQ coverage. Bloqueante con `--strict`, warning sin

### REQ-IMPROVE-04 — Override flag `--skip-cycle` con auditoria

> **Que cambia**: flag opt-in para skipear validation con razon documentada en `frontmatter.cycle_overrides[]` + session log.
> **Por que**: casos legitimos de skip (fix urgente sin design completo) existen. Sin override formal, dev queda bloqueado.

Override registra en frontmatter:
```yaml
cycle_overrides:
  - step: "execute"
    reason: "fix urgente; design diferido"
    session: "S2"
    date: "2026-05-16"
```

### REQ-PRESERVE-01 — Backward compat 100% (tickets sin flag)

> **Que cambia**: nada disruptivo. Tickets sin `validate_cycle: true` siguen flujo v1.
> **Por que**: opt-in obligatorio mientras estabiliza. Patron HOR-042/043.

Validacion: HOR-029 (pre-HOR-044) sigue sin warnings nuevos en gates.

## Test cases

| # | Caso | REQ | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|----------|--------|----------|--------|---------|---------|
| TC-01 | Ticket sin spec ejecutando `request-execute` → cycle violation | REQ-IMPROVE-01 | Exit 1 con error: "execute requires design-{tipo} completed first" | — | bash | pending | S1.T3 | — |
| TC-02 | Ticket closing con gates D+E no completados | REQ-IMPROVE-03 | Exit 1 con error: "close requires all gates D+E completed" | — | bash | pending | S2.T2 | — |
| TC-03 | Quick path ticket con multi-archivo grande (>3 archivos) | REQ-IMPROVE-02 | Warning: "quick path crece — considerar escalate (G2 HOR-023)" | — | bash | pending | S1.T4 | — |
| TC-04 | Explore ticket terminando pre-execute (correcto) | REQ-IMPROVE-02 | Exit 0: "state coherente, explored path completed" | — | bash | pending | S1.T4 | — |
| TC-05 | Override flag `--skip-cycle "fix urgente"` registra en frontmatter `cycle_overrides[]` | REQ-IMPROVE-04 | Exit 0 + entry agregada al frontmatter | — | bash + grep | pending | S2.T3 | — |
| TC-06 | Dogfood retroactivo sobre HOR-040/041/042/043 | REQ-IMPROVE-01 | Reportar estados conocidos (HOR-040..042 closed coherentes, HOR-043 explored coherente) | — | bash | pending | S3.T1 | — |
| TC-07 | Performance: validate-cycle sobre HOR-026 (5 sessions) | REQ-IMPROVE-01 | <500ms | — | time + benchmark | pending | S3.T2 | — |
| TC-08 | Grep `validate_cycle` en 2 steps editados | REQ-IMPROVE-03 | >=2 matches en archivos distintos | — | grep | pending | S2.T1-T2 | — |
| TC-09 | Regression: HOR-029 pre-HOR-044 sin warnings nuevos | REQ-PRESERVE-01 | Validate-cycle sobre HOR-029 sin errors nuevos | — | bash | pending | S3.T2 | — |
| TC-10 | Cero archivos nuevos en `commands/lib/schemas/` | DET-26 preservation | git log post-cierre cero cambios | — | git log | pending | S4.T1 | — |

## Tasks

### Session 1 — State machine + tool standalone (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Modelar state machine en `commands/lib/cycle-machine.ts`: estados, transiciones, guards | architect | balanced | commands/lib/cycle-machine.ts | — | State machine definida como const exportable, types tipados | git revert | pending | 1 | — |
| S1.T2 | Implementar inferencia de estado desde records (frontmatter + sessions + spec status) en `commands/lib/cycle.ts` | developer | balanced | commands/lib/cycle.ts | — | Modulo expone `inferCurrentState({ticket-id})` retorna state + blockers | git revert | pending | 1 | — |
| S1.T3 | Self-tests inline + wrapper bash `commands/dkc-validate-cycle` | developer | balanced | commands/dkc-validate-cycle | TC-01 | TC-01 pass | git revert | pending | 1 | — |
| S1.T4 | TCs verificacion edge cases (quick + explore variants) | reviewer | balanced | — | TC-03, TC-04 | TCs pass | — | pending | 1 | — |
| S1.GATE | Quality review tier standard. H1 + H2 confirmadas/refutadas. Commit DET-27 `improve(dkc): cycle state machine + tool standalone (HOR-044 S1)` | reviewer | balanced | commands/ | TC-01..04 | Gate continue + commit | git revert | pending | 1 | — |

### Session 2 — Integracion + override flag (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Editar `request-execute.md` sub-seccion opt-in via `validate_cycle: true` | developer | balanced | prompts/steps/request-execute.md | TC-08 | Grep retorna match | git revert | pending | 2 | — |
| S2.T2 | Editar `request-close.md` gate A2 sub-seccion opt-in | developer | balanced | prompts/steps/request-close.md | TC-02, TC-08 | TCs pass | git revert | pending | 2 | — |
| S2.T3 | Implementar override flag `--skip-cycle` con registro en frontmatter `cycle_overrides[]` | developer | balanced | commands/lib/cycle.ts | TC-05 | TC-05 pass | git revert | pending | 2 | — |
| S2.T4 | Documentar Principio 12 en `_style.md`: cycle validation + state machine + opt-in pattern + override flag | scribe | fast | prompts/_style.md | — | Seccion Principio 12 completa | git revert | pending | 2 | — |
| S2.GATE | Quality review tier standard. Commit DET-27 `improve(dkc): integracion cycle validation 2 gates + override flag + Principio 12 (HOR-044 S2)` | reviewer | balanced | commands/, prompts/ | TC-02..05, TC-08 | Gate continue + commit | git revert | pending | 2 | — |

### Session 3 — Dogfood + benchmark + regression (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Dogfood retroactivo: `dkc-validate-cycle HOR-{040..043}`. Documentar findings en session log | reviewer | balanced | (validacion) | TC-06 | Findings documentados | — | pending | 3 | — |
| S3.T2 | Benchmark TC-07 + regression TC-09 sobre HOR-029 | reviewer | balanced | (validacion) | TC-07, TC-09 | TCs pass | — | pending | 3 | — |
| S3.T3 | Decision con dev: ¿activar `validate_cycle` default en proximos tickets o mantener opt-in? Documentar DEC-LOCAL-08 | architect | balanced | (decision) | — | DEC-LOCAL-08 documentada | — | pending | 3 | — |
| S3.GATE | Quality review tier exhaustive. Commit DET-27 `improve(dkc): dogfood + benchmark + regression cycle validation (HOR-044 S3)` | reviewer | balanced | commands/ | TC-06..09 | Gate continue + commit | git revert | pending | 3 | — |

### Session 4 — Close + teach-close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Summary completo + TC-10 verifica cero archivos schema nuevos | scribe | fast | tickets/HOR-044.md | TC-10 | Summary completo | — | pending | 4 | — |
| S4.T2 | Decision teach-close (DET-22): generar dado scope arquitectural | scribe | fast | tickets/HOR-044.teach/teach-close.md | — | teach-close producido | — | pending | 4 | — |
| S4.T3 | Frontmatter post-close: status closed, executed SP, teachings.close done | scribe | fast | tickets/HOR-044.md | — | Frontmatter coherente | — | pending | 4 | — |
| S4.T4 | Reindex final + verificacion HC viewer | reviewer | fast | — | — | Reindex pasa | — | pending | 4 | — |
| S4.GATE | Close final. Commit DET-27 `close(horadric): HOR-044 closed — cycle validation operacional opt-in` | scribe | fast | tickets/HOR-044.md | — | Ticket closed | — | pending | 4 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ traza al ticket + intake
- **DET-7** (TCs ↔ discovery): 10 TCs trazan a REQ + session
- **DET-8** (rollback): cada task con git revert
- **DET-9 (handoffs)**: este spec implementa DET-9 programaticamente
- **DET-11** (KB-first): reuso de schemas + index.db existentes
- **DET-13 (cierre con evidencia)**: validate-cycle en close A2 implementa DET-13
- **DET-20** (sessions con gates): 4 sessions con S{N}.GATE
- **DET-23** (quality review): tier standard S1+S2; exhaustive S3 + fuerte S4
- **DET-25** (TCs inline): columna Session poblada

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `commands/lib/schemas/*` (HOR-026/041) | internal | Reuso para parsear records | bajo |
| `commands/lib/parsers/markdown.ts` | internal | Reuso para inferir state | bajo |
| `index.db` | internal | Reuso para lookups cross-record (sessions previas, spec status) | bajo |
| zod + tsx | external | Ya instalados | nulo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H1 refutada (state machine compleja) | baja | alto | Validar empirico en S1.T1; si refuta, modelar variantes o abandonar approach |
| Falsos positivos por casos legitimos | media | medio | Override flag `--skip-cycle` con auditoria en frontmatter |
| Performance overhead | baja | bajo | Lazy validation (solo close); cache si necesario |
| Pipeline rompe steps existentes con `validate_cycle: true` | baja | medio | Opt-in via flag; activacion gradual |

## Open questions

(Cerradas en intake via 5 DEC-LOCAL.)

## Decisions (cerradas durante design-intake)

### DEC-LOCAL-01: Default warning + override flag
- **Contexto**: bloqueante vs warning
- **Drivers**: backward compat (high) + granularidad flexible (high)
- **Opcion elegida**: warning default + `--skip-cycle` flag con auditoria
- **Alternativas**: bloqueante por default (rechazado: frena casos legitimos)
- **Consecuencias**: dev decide cuando promover a bloqueante via `--strict`

### DEC-LOCAL-02: State machine reducida para quick path
- **Contexto**: exime quick path vs state machine reducida
- **Drivers**: coverage edge cases (high)
- **Opcion elegida**: state machine reducida (intake-quick → execute → close)
- **Alternativas**: exime completo (rechazado: quick puede crecer sin escalate)
- **Consecuencias**: 2 state machines a mantener; complejidad acotada

### DEC-LOCAL-03: NO re-entrada de tickets cerrados
- **Contexto**: permitir re-open vs spawn followup
- **Drivers**: backward compat (high) + reversibilidad (mid)
- **Opcion elegida**: NO re-entrada — spawn followup ticket nuevo
- **Alternativas**: permitir (rechazado: re-open conlleva re-validacion)
- **Consecuencias**: forza orden estricto cerrado=final

### DEC-LOCAL-04: Lazy validation (solo en close)
- **Contexto**: eager validation en cada step vs lazy
- **Drivers**: performance (mid)
- **Opcion elegida**: lazy
- **Alternativas**: eager (rechazado: overhead acumulativo)
- **Consecuencias**: violations descubiertos al cierre. Si emerge dolor, futura mejora: eager mode opcional

### DEC-LOCAL-05: Tool reporta estado + transiciones + blockers + recommended action
- **Contexto**: nivel de detalle del output
- **Drivers**: utilidad para LLM/dev
- **Opcion elegida**: 4 campos (current_state + next_valid_transitions + blockers + recommended_action)
- **Consecuencias**: output mas rico; mas codigo en el tool pero mas valor

## Acceptance checkpoints (post-activacion)

- [ ] **Funcional**: 10 TCs pass
- [ ] **NFRs**: TC-07 performance <500ms
- [ ] **Rules**: DET-9 + DET-13 implementados programaticamente
- [ ] **Integration**: 2 steps editados (TC-08); backward compat preservada (TC-09)
- [ ] **Schemas**: cero archivos nuevos en `commands/lib/schemas/` (TC-10)
- [ ] **Docs**: Principio 12 en `_style.md`; teach-close.md producido (DET-22)

## Backlog

(Vacio. Si emergen edge cases inesperados en S3 dogfood, agregar items aqui.)

## Follow-ups (post-activacion + close)

- **HOR-046 conditional**: hooks git pre-commit + eager validation mode opcional
- **HOR-024 dependiente**: cuando async paralelismo se active, merge probable con HOR-044
- **Auto-fix tool** (futuro): `dkc-fix-cycle` para resolver violations comunes (out of scope)
- **Default → mandatory**: post-stabilizacion, cambiar default `validate_cycle` a true

## When to activate this spec

Replicado de `tickets/HOR-044.md`:

| # | Condicion | Como se detecta |
|---|-----------|-----------------|
| C1 | LLM principal salta paso ≥2 veces en 5 tickets | Learns con tag `cycle-violation` |
| C2 | HOR-024 paralelismo activa | Decision en planning |
| C3 | Local-only Qwen 30B salta pasos | Documentado en HOR-031 S4 pilot |
| C4 | Dev reporta closed sin todos los gates | Audit post-close |

**Si NINGUNA activa**: spec queda `draft`. Si Opus + dev gobierna bien: cerrar HOR-044 como `wont_do`.
