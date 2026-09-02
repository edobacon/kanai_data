---
id: SPEC-workflow-explore-conditional-closure-49
project: horadric
ticket: HOR-049
status: done
---

# Closure del patron explore+conditional — 4 gaps de meta-reflexion n=3

# Closure del patron explore+conditional — 4 gaps de meta-reflexion n=3

## Executive summary — lo que estas aprobando

> *Lectura de 45s.*

### Que se quiere

Cerrar 4 gaps detectados por meta-reflexion sobre HOR-043+044+045 (3 instancias consecutivas de `explore + conditional`). Convertir aprendizaje empirico (n=3 con variance baja) en convenciones formales para que devs futuros + LLM puedan replicar el patron sin re-explorarlo.

### 4 gaps a resolver

| # | Gap | Output | Costo |
|---|-----|--------|-------|
| **G1** | `closed_reason` field formal | Extension de `templates/records/ticket.md` con campo + valores canonicos documentados | 5-10 min |
| **G2** | Tracking centralizado | `projects/horadric/conditions-tracker.md` con 12 conditions (C1-C4 × 3 tickets) + criterio detectable | 15-20 min |
| **G3** | Principio 11 en `_style.md` | Documentar patron + variantes + tabla empirica + antipatrones | 20-30 min |
| **G4** | Rule formal | `RULE-workflow-explore-conditional-XXX.md` con 2-3 insights reusables curados | 15-20 min |

### Decisiones

- **`creates_data: false`** — outputs son extensiones de archivos canonicales existentes, no schemas nuevos. DET-18 exento
- **Teach-intake skipped** — scope acotado con gaps ya identificados; alineado a HOR-041 patron
- **Autopilot full** — dev aprobo ejecutar de corrido sin pausar entre tasks
- **1 session execute** — 4 tasks consecutivas + S1.GATE con commits

### Riesgos

- **G4 prematuro con n=3**: si los insights no son robustos, rule formal puede requerir update post-mas-data. Mitigacion: marcar rule con `confidence: medium` o `level: should` en lugar de `must`
- **G2 archivo nuevo en project root**: `conditions-tracker.md` no es record DKC tipado. Mitigacion: documentar como "ayuda-memoria operacional"

### Que NO se hace

- NO modificar template global de spec
- NO promover los 4 specs en draft (HOR-043/044/045) — quedan donde estan
- NO bloquear ticket nuevo con conditions-check automatic (eso seria HOR-044 si se activa)
- NO crear schema zod para `closed_reason` (TicketFrontmatter no tiene schema aun — out of scope HOR-049)

### Tamano

1 session execute + 1 close. SP estimated: **1**. Tiempo: ~1-1.5h efectivos.

### Como vas a saber que funciona

- TC-01: `closed_reason` documentado en template + ejemplo
- TC-02: `conditions-tracker.md` existe con 12 conditions
- TC-03: `_style.md` Principio 11 con grep ≥5 matches
- TC-04: `RULE-workflow-explore-conditional-*.md` valida con `dkc-validate Rule`

---

## Purpose

Convertir n=3 datos empiricos en convenciones formales. Sin esto, los proximos 3-5 tickets `explore + conditional` re-exploran el patron (overhead ~1-1.5h × N). Con esto, devs futuros tienen guia + LLM tiene tracking centralizado de conditions sin perderlas.

## Requirements

### REQ-IMPROVE-01 — `closed_reason` field formal (G1)

> **Que cambia**: extension de `templates/records/ticket.md` frontmatter con campo `closed_reason` opcional + documentacion de valores canonicos (`explored`, `wont_do`, `superseded`, `duplicate`, custom string).
> **Por que**: 3/3 tickets explore (HOR-043+044+045) lo usaron con valor uniforme. Sin formalizar, otro ticket podria inventar variantes.

El template MUST:
- Agregar campo `closed_reason: {string | null}` despues de `closed: {date | null}`
- Comentario explicando valores canonicos: `explored | wont_do | superseded | duplicate | <custom>`
- Default `null` para tickets que cierran via execute completo (status closed sin razon especial)

### REQ-IMPROVE-02 — Conditions tracker (G2)

> **Que cambia**: nuevo archivo `projects/horadric/conditions-tracker.md` que centraliza 12 conditions de HOR-043+044+045 con criterio detectable + status actual.
> **Por que**: HOR-046 (referenciado en backlog de los 3 tickets) tiene scope distinto. Sin tracker explicito, conditions se olvidan y specs en draft duermen para siempre.

El archivo MUST:
- Listar las 12 conditions agrupadas por ticket
- Cada condition con: criterio (como detectar), trigger (que activa), status (active | dormant | met | discarded)
- Seccion "Como usar este tracker" explicando cuando consultar (al abrir ticket nuevo + en gates de close)
- Tabla resumen con counts por status

### REQ-IMPROVE-03 — Principio 11 en `_style.md` (G3)

> **Que cambia**: nueva seccion `## Principio 11: Patron explore + conditional` con definicion + variantes + tabla empirica n=3 + cuando usar vs improvement + antipatrones.
> **Por que**: patron robusto (n=3 variance baja 0.05) merece doc formal. Sin esto, futuros ticket exploradores re-descubren el patron.

Seccion incluye:
- Definicion: `work_type=explore + conditional flag` que produce spec en `status: draft` sin execute
- Variantes: `creates_data:true` (con design-draft tripartito, ~1.4-1.5h) vs `creates_data:false` (sin draft, ~0.75h)
- Tabla empirica n=3 con factor executed/estimated
- Cuando usar (post-refundacion mayor que detecta gaps acotados con SP no trivial, sin dolor diario aun)
- 3-5 antipatrones (forzar execute sin condition activa, scope creep, esperar n=10+ para documentar)

### REQ-IMPROVE-04 — Rule formal sobre el patron (G4)

> **Que cambia**: nuevo `projects/horadric/rules/workflow/RULE-workflow-explore-conditional-001.md` con 2-3 insights curados de L0-L3 series.
> **Por que**: ~25 learns sin curacion se entierran. Promover los 2-3 mas robustos a rule formal hace conocimiento navegable.

La rule MUST:
- Cumplir RuleSchema HOR-041 (4 secciones canonicas What/Why/Where/When + Verification + Source opcionales)
- `level: should` (no `must` — n=3 es suficiente pero no exhaustivo)
- `scope: module` (workflow)
- Curacion: 2-3 insights de L0.1+L0.2 HOR-045 (hipotesis sample-during-intake), L2.2 HOR-045 (zod refine for state machines), L0.1 HOR-043 (patron explore+conditional como unidad de trabajo)

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | `templates/records/ticket.md` contiene `closed_reason` field con doc | REQ-IMPROVE-01 | no | grep `closed_reason` retorna match con documentacion | 1 match con doc completa (valores canonicos: explored/wont_do/superseded/duplicate/custom) | grep | pass | S1.T1 | — |
| TC-02 | `projects/horadric/conditions-tracker.md` existe con 12 conditions | REQ-IMPROVE-02 | no | wc -l y grep `C[1-4]` retorna ≥12 | 12 matches (4 conditions × 3 tickets HOR-043+044+045) | bash | pass | S1.T2 | — |
| TC-03 | `prompts/_style.md` tiene seccion `Principio 11` (renumerado de 13) | REQ-IMPROVE-03 | no | grep `Principio 11` retorna ≥2 matches (header + cross-ref) | 2 matches (header + cross-ref interno) | grep | pass | S1.T3 | renumerado Principio 13 → 11 para evitar huecos |
| TC-04 | `RULE-workflow-explore-conditional-001.md` valida con dkc-validate Rule | REQ-IMPROVE-04 | no | exit 0 | exit 0, valid=true, records_validated=1, errors=[] | bash | pass | S1.T4 | — |
| TC-05 | Cambios `_style.md` + template + tracker + rule consistentes (cross-reference) | all | no | docs se referencian entre si | 6 archivos contienen cross-references: rule + tracker + template + _style.md + ticket + spec | grep | pass | S1.GATE | — |

## Tasks

### Session 1 — Execute 4 gaps (T1, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | G1 — Agregar `closed_reason` field a `templates/records/ticket.md` con documentacion de valores canonicos (explored / wont_do / superseded / duplicate / custom) | developer | fast | templates/records/ticket.md | TC-01 | Field documentado, TC-01 pass | git revert | done | 1 | — |
| S1.T2 | G2 — Crear `projects/horadric/conditions-tracker.md` con 12 conditions C1-C4 de HOR-043+044+045, status dormant, criterio detectable, seccion "Como usar" | scribe | fast | projects/horadric/conditions-tracker.md | TC-02 | Archivo creado con tracking completo | git revert | done | 1 | — |
| S1.T3 | G3 — Extender `prompts/_style.md` con `Principio 11: Patron explore + conditional`. Definicion + variantes + tabla empirica n=3 + cuando usar + 3-5 antipatrones | scribe | fast | prompts/_style.md | TC-03 | Seccion completa, TC-03 pass | git revert | done | 1 | — |
| S1.T4 | G4 — Crear `projects/horadric/rules/workflow/RULE-workflow-explore-conditional-001.md` con 2-3 insights curados de L0-L3 series HOR-043+044+045 | scribe | fast | projects/horadric/rules/workflow/RULE-workflow-explore-conditional-001.md | TC-04 | Rule valida con dkc-validate Rule | git revert | done | 1 | — |
| S1.GATE | Quality review tier light (DET-23). Cross-reference check (TC-05). Commit DET-27 separado por archivo afectado: 1 commit codigo (template + style) + 1 commit dkc (tracker + rule + ticket + spec) | reviewer | fast | todos | TC-01..05 | Gate decision + commits | git revert | done | 1 | — |

### Session 2 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Summary completo del ticket + decision teach-close | scribe | fast | tickets/HOR-049.md | — | Summary completo | — | done | 2 | — |
| S2.T2 | Frontmatter close: status closed, executed SP, teachings.close (probable skipped) | scribe | fast | tickets/HOR-049.md | — | Frontmatter coherente | — | done | 2 | — |
| S2.T3 | Reindex final | reviewer | fast | — | — | Reindex pasa | — | done | 2 | — |
| S2.GATE | Close final. Commit DET-27 `close(horadric): HOR-049 closed — explore+conditional patron formalizado` | scribe | fast | tickets/HOR-049.md | — | Ticket closed | — | done | 2 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ traza a meta-reflexion n=3 documentada
- **DET-7** (TCs ↔ discovery): 5 TCs trazan a REQ + session
- **DET-8** (rollback): cada task con git revert
- **DET-11** (KB-first): conditions-tracker + rule formal habilitan retrieval futuro
- **DET-16** (propagacion): cambios afectan 4 archivos relacionados (template + tracker + style + rule) — coherencia entre los 4 verificada en S1.GATE
- **DET-20** (sessions con gates): 2 sessions con S{N}.GATE
- **DET-23** (quality review): tier light S1, fuerte S2
- **DET-27** (commits post-gate): 2 commits separados codigo + dkc

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-043+044+045 cerrados | internal | Source de la meta-reflexion. Datos empiricos n=3 | bajo |
| `commands/lib/schemas/rule.ts` (HOR-041) | internal | Rule debe pasar RuleSchema | bajo |
| `templates/records/ticket.md` | internal | Modificacion aditiva (campo opcional) | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| G4 rule prematura con n=3 | media | bajo | Marcar `level: should` (no `must`); si emerge mas evidencia n=5+, promover a `must` |
| G2 tracker se olvida de actualizar | media | medio | Referenciar tracker desde Principio 11 (G3) — gate de lectura natural en intake |
| Cross-reference rota entre 4 archivos | baja | bajo | TC-05 manual review en S1.GATE |

## Open questions

(Cerradas por dev en intake.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: `creates_data: false` → DET-18 exento
- **Contexto**: outputs son nuevos archivos pero no nuevos schemas zod ni tablas
- **Drivers**: scope rapido (high)
- **Opcion elegida**: tratar como extension de archivos existentes
- **Alternativas**: `creates_data: true` con draft-skip (rechazado: overhead innecesario)

### DEC-LOCAL-02: Teach-intake skipped
- **Contexto**: gaps ya identificados con scope claro
- **Drivers**: alineado a patron HOR-041 (extension scope acotado)
- **Opcion elegida**: skip con razon
- **Alternativas**: generar (rechazado: re-documenta lo que ya esta en spec)

### DEC-LOCAL-03: 4 gaps en 1 ticket vs split
- **Contexto**: dev eligio scope completo
- **Drivers**: cohesion (los 4 son meta-discoveries de la misma reflexion)
- **Opcion elegida**: 1 ticket
- **Alternativas**: 4 tickets separados (rechazado: overhead de scaffolding)

### DEC-LOCAL-04: Rule `level: should` no `must`
- **Contexto**: n=3 es robusto pero no exhaustivo
- **Drivers**: prevenir false confidence
- **Opcion elegida**: should (recomendado pero no obligatorio)
- **Alternativas**: must (rechazado: prematuro con n=3)

## Acceptance checkpoints

- [ ] **Funcional**: 5 TCs pass
- [ ] **NFRs**: N/A
- [ ] **Rules**: DET-11/16/27 respetadas
- [ ] **Integration**: 4 archivos cross-referenciados coherente (TC-05)
- [ ] **Docs**: Principio 11 + tracker + rule funcionales

## Backlog

(Vacio.)

## Follow-ups

- **HOR-046 reactivacion**: conditions-tracker es input para HOR-046 cuando active. Si HOR-046 se materializa, tracker se integra al state source-of-truth consolidation
- **Cuando n≥5 datos**: re-evaluar level de RULE (should → must) si patron sigue robusto
