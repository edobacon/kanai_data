---
id: RULE-workflow-anti-pattern-h2-plan-004
project: horadric
type: rule
module: workflow
level: must
tags:
  - parser-contract
  - anti-pattern
  - sessions
  - plan-sessions
  - dkc-v2
---

# Tickets NO deben tener H2 paralelo `## Esqueleto de plan` / `## Plan de sessions` con keyword `plan|sessions|esqueleto|tentativo`

## What

En tickets DKC, el H2 con keyword `plan|sessions|esqueleto|tentativo` paralelo a `## Sessions` ES anti-patron BLOQUEANTE. Especificamente:

- **Anti-patron BLOQUEANTE (sub-patron B2)**: `## Esqueleto de plan tentativo`, `## Plan de sessions`, `## Plan tentativo de sessions` cuando coexisten con `### Plan de sessions` canonical dentro de `## Sessions`. Resulta en duplicacion de la tabla de plan con numeracion `S{N}` compartida → confunde dev + HC parser
- **Anti-patron WARNING (sub-patron B1)**: el mismo header H2 SIN H3 canonical. Si describe plan post-activacion legitimo (explore-conditional), DEBE renombrarse a `## Plan post-activacion (referencia, NO ejecutable)` + tabla con prefijo `P{N}` (no `S{N}`) para desambiguar visualmente de las sessions ejecutables

El **patron canonical unico**: `### Plan de sessions (preplanificacion)` H3 dentro de `## Sessions`, antes de Gate 0 / Session 1. Producido por `intake-explore` y refinado por `design-{tipo}`.

## Why

Descubierto in-vivo en HOR-046 (D1, categoria 9) cuando el dev observo "varias S1, S2, S3 con misma numeracion pero diferente descripcion" en HC. Investigacion encontro 7 tickets afectados (HOR-030, 043, 044, 045, 046, 047, 048) + 1 variante descubierta en S2.T4 (D7: HOR-049 con `## Plan de sessions` literal sin "Esqueleto" prefix).

**Impacto**:
- HC parser puede leer ambas tablas → contador incorrecto de sessions
- Dev visualmente confundido con numeraciones duplicadas
- LLM al re-tomar el ticket puede usar la tabla equivocada como source

**Origen del anti-patron**: el template `templates/records/ticket.md` actual NO genera este H2 — viene de un prompt/template legacy que se elimino, pero los tickets ya creados quedaron contaminados. Sin enforcement programatico (categoria 9 detector), nuevos tickets siguen siendo vulnerables.

## Where

Aplica a TODO ticket DKC en `projects/{project}/tickets/`. Verificable empiricamente via:

```bash
grep -ciE '^## .*(esqueleto.*plan|plan.*(sessions|tentativo))' tickets/{TICKET-id}.md
# Expected: 0

dkc-validate AntiPatterns projects/{project}/tickets/{TICKET-id}.md
# Categoria cat-9-B2 → error (duplicacion); cat-9-B1 → warning (renombrar)
```

Excepcion legitima: plan **post-activacion** de explore-conditional tickets. Usar header explicito `## Plan post-activacion (referencia, NO ejecutable)` + prefijo `P{N}` en la tabla. El detector `AntiPatternsDetector.detectCat9` con semantic awareness (HOR-046 S9.T1 `dkc-fix-d1` keywords `referencia|no ejecutable|post-activacion|hasta activacion`) lo reconoce como legitimate.

## When

Aplica desde HOR-046 (2026-05-16):

- **Tickets nuevos**: `intake-explore.md` GATE 2 bloquea al cierre del step si detecta el anti-patron. Verificacion via `grep` + `dkc-validate AntiPatterns`
- **Tickets existentes contaminados** (los 6 originales D1 + HOR-049 D7): fixeados via `commands/dkc-fix-d1` (HOR-046 S9.T2) — renombrado + renumeracion P{N}
- **Tickets futuros con plan post-activacion legitimo**: usar header canonical `## Plan post-activacion (referencia, NO ejecutable)` desde el inicio

## How to verify

```bash
# 1. Tickets actuales limpios (post-S9.T2):
for t in HOR-030 HOR-043 HOR-044 HOR-045 HOR-047 HOR-048 HOR-049; do
  count=$(grep -ciE '^## .*(esqueleto.*plan|plan.*(sessions|tentativo))' projects/horadric/tickets/$t.md)
  echo "$t: anti-patron=$count (expected 0)"
done

# 2. dkc-fix-d1 idempotente (re-ejecutar no cambia nada):
./commands/dkc-fix-d1
# Expected: Summary: B2=0, B1=0, skip=N (todos limpios)

# 3. GATE 2 de intake-explore detecta:
# Ver prompts/steps/intake-explore.md:54-55
```

## Source

- HOR-046 spec: SPEC-workflow-state-sot-and-contracts-46 (REQ-IMPROVE-03, REQ-IMPROVE-06, REQ-IMPROVE-07)
- HOR-046 D1, D7 (backlog discoveries)
- HOR-046 S2.T4: `commands/lib/schemas/anti-patterns.ts` (`detectCat9` con sub-patron B2/B1)
- HOR-046 S7.T2: `prompts/steps/intake-explore.md` GATE 2 extension
- HOR-046 S9.T1+T2: `commands/dkc-fix-d1` (script idempotente) + aplicado a 6 tickets
- HOR-046 S8 dogfood: 7 true positives + 1 false positive (resuelto en S9 con semantic awareness)
