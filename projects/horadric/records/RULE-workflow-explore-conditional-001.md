---
id: RULE-workflow-explore-conditional-001
project: horadric
type: rule
module: workflow
level: should
tags:
  - explore
  - conditional
  - meta-process
  - draft-pending-activation
  - n3-evidence
---

# Tickets con gap arquitectural sin dolor diario DEBERIAN seguir patron `explore + conditional`

## What

Tickets que detectan **gap arquitectural acotado pero sin dolor diario observable** DEBERIAN usar `work_type: explore` + condition gate en lugar de `improvement` con full execute. El output del explore es un spec en `status: draft` reactivable cuando alguna condition (C1-C{N} declarada en el ticket) se cumpla.

**Estructura mandatoria del ticket explore-conditional**:

1. Frontmatter con `work_type: explore` + `status: open → intake-explore → closed`
2. Seccion `## Conditions for activation (BLOQUEANTE)` con tabla de conditions C1-C4 (criterio detectable cada una)
3. Teach-intake.md producido (DET-21 mandatorio)
4. Design-draft tripartito SI `creates_data: true` (DET-18 aplica): `intent.md` + `data-model.md` + `{topic}-spec.md`
5. Spec generado con `status: draft` (NO `in_progress`)
6. Ticket cerrado con `closed_reason: explored`
7. Entry agregado a `projects/{project}/conditions-tracker.md` con status `dormant`

**Variantes empiricas (n=3 instancias documentadas)**:

| Variante | `creates_data` | Tiempo tipico | Sessions |
|----------|----------------|----------------|----------|
| Pesada (con design-draft) | `true` | 1.4-1.5h | 4 (S0-S3) |
| Ligera (sin design-draft, DET-18 exento) | `false` | 0.75h | 3 (S0-S2) |

Factor (executed/estimated) tipico: **0.25-0.30** (variance 0.05 sobre n=3).

## Why

Decisiones arquitecturales que detectan gaps acotados pero sin dolor diario observable tienden a dos antipatrones:

1. **Full execute especulativo**: invertir 3-7h en implementacion que puede no ser necesaria si el dolor nunca emerge. Riesgo: overengineering + maintenance burden de codigo no usado.
2. **Skip total con TODO comment**: documentar en un comentario "deberiamos hacer X" se pierde semanas despues. Sin spec en draft + conditions trackeadas, el insight se entierra.

El patron `explore + conditional` resuelve ambos: invierte ~0.75-1.5h en captura exhaustiva (teach + draft + spec) **cuando el contexto es fresco**, sin overhead de implementacion. Cuando alguna condition se cumple, el blueprint esta listo para activar sin re-explorar.

**Caso testigo** (n=3 instancias consecutivas 2026-05-16):

| Ticket | Topic | SP estim. | Explore | Factor |
|--------|-------|-----------|---------|--------|
| HOR-043 | Cross-record relations | 5 | 1.4h | 0.28 |
| HOR-044 | Cycle validation | 3 | 0.75h | 0.25 |
| HOR-045 | Discoveries/Learns/Bug schemas | 5 | 1.5h | 0.30 |

Si los 3 hubieran ejecutado full execute sin condition, costo total seria ~15-20h. Costo real explore: ~3.65h. **Ahorro ~80% en tickets donde dolor podria nunca emerger**.

## Where

Aplica a tickets en cualquier modulo cuando se detecta:

- Gap arquitectural identificado en analisis post-cierre de tickets anteriores (caso HOR-043+044+045 detectados post-refundacion DKC v2)
- Solucion conocida pero costosa (SP ≥3) sin dolor observable HOY
- Conditions claras para activar (C1-C4 detectables programatica o manualmente)
- Refundacion mayor en progreso con sub-tickets exploratorios

**NO aplica a**:

- Bugs reportados con dolor observable → usar `work_type: fix`
- Cambios acotados <2 SP → usar `improvement` quick
- Tickets con dolor recurrente documentado en learns → usar `improvement` directo

Archivos canonicos del patron:

- Template del ticket: `templates/records/ticket.md` (frontmatter incluye `closed_reason`)
- Tracker centralizado: `projects/{project}/conditions-tracker.md`
- Docs del patron: `prompts/_style.md` Principio 11
- Esta rule: `projects/{project}/rules/workflow/RULE-workflow-explore-conditional-001.md`

## When

Se aplica al **clasificar la intencion** del ticket:

1. Dev/LLM identifica gap arquitectural
2. Evalua si hay dolor diario observable (HOY, no proyectado)
3. **Si NO hay dolor + SP estimado ≥3 + conditions detectables**: aplica este patron
4. Sino: usa `work_type` distinto (improvement / fix / etc.)

Tambien aplica al **clasificar tickets pre-existentes** marcados como `conditional` que aun no se han activado:

- Verificar contra `conditions-tracker.md` si emergio detector reciente
- Si si: activar (cambiar `work_type: explore → improvement`)
- Si no: mantener en `closed` con `closed_reason: explored` hasta proxima evaluacion

**Excepciones documentadas**:

- Refundaciones mayores con multiples sub-tickets simultaneos: aceptable aplicar a todos los sub-tickets aunque no haya dolor diario individual (caso HOR-043+044+045 — DKC v2 Phase 4)
- Tickets pre-2026-05-16 (introduccion del patron) sin retroactividad: NO migrar tickets existentes

## Verification

Para verificar que un ticket cumple el patron post-cierre:

```bash
# 1. Frontmatter correcto
grep -E "^work_type: explore$" tickets/{TICKET-id}.md
grep -E "^closed_reason: explored$" tickets/{TICKET-id}.md

# 2. Teach-intake existe
test -f tickets/{TICKET-id}.teach/teach-intake.md && echo OK

# 3. Spec existe y esta en draft
grep -E "^status: draft$" specs/SPEC-*-{TICKET-num}.md

# 4. Conditions registradas en tracker
grep -E "{TICKET-id}" projects/{project}/conditions-tracker.md
```

Validacion programatica completa (futuro, post-activacion HOR-044 cycle validation): `dkc-validate-cycle --pattern explore-conditional {TICKET-id}` retornaria `valid` si los 4 checks pasan.

## Source

- **Ticket origen**: HOR-049 (closure del patron post n=3 evidencia)
- **Spec**: SPEC-workflow-explore-conditional-closure-49
- **Datos empiricos**: HOR-043 (cross-record relations), HOR-044 (cycle validation), HOR-045 (discoveries/learns/bug schemas) — 3 instancias consecutivas 2026-05-16
- **Documentacion formal**: `prompts/_style.md` Principio 11
- **Tracker operacional**: `projects/horadric/conditions-tracker.md`
- **Insights curados** (de L0-L3 series de los 3 tickets):
  - L0.1 HOR-043: patron `explore + conditional` produce blueprint reactivable
  - L0.1 HOR-044: variante `creates_data:false` 30% mas eficiente que pesada
  - L0.1 HOR-045 + L1.1: sample-during-intake puede confirmar hipotesis pre-design-draft (reduce riesgo scope creep)

**Confidence**: `should` (no `must`) con n=3 datos. Promover a `must` cuando n≥5 instancias confirmen variance baja del factor (0.25-0.30).
