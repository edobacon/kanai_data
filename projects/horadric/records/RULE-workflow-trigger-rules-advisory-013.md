---
id: RULE-workflow-trigger-rules-advisory-013
project: horadric
type: rule
module: workflow
level: should
tags:
  - trigger-rules
  - advisory
  - cost-tiers
  - det-20
  - det-23
  - det-35
  - gentle-ai
  - loop-engineering
---

# Consultar trigger rules advisory al elegir la intensidad del review (solo suben, nunca bajan el piso)

## What

Al **asignar o confirmar el tier de validacion** de una session (DET-20) y la **intensidad del quality review** (DET-23 / loop dual-judge DET-35), el orquestador SHOULD consultar las **trigger rules** como input **advisory** — recomendaciones, no gates. Una trigger rule mira las señales del cambio (evento × path × tamano de diff) y, segun el modelo de 3 tiers de costo, **recomienda subir** la intensidad del review (ver catalogo en `docs/trigger-rules.md`).

Reglas de la capa:

1. **Ratchet unidireccional** — una trigger rule SOLO puede recomendar SUBIR la intensidad (ej: T1 → T2, single-pass → dual-judge). NUNCA baja el piso que asigno el design. El piso de DET-20/DET-23 es inviolable.
2. **El orquestador decide** — la recomendacion no es bloqueante. El orquestador puede accionarla o **declinarla con razon**. No hay a-hook ni gate que la fuerce.
3. **Auditabilidad en prosa** — cada evaluacion (señales → tier recomendado → aplicado/declinado + razon) se registra como prosa en el bloque `**Quality review (DET-23)**` de la session. NO como step en `decisions.ts` (eso seria capa 4 = determinista, contradiciendo su naturaleza advisory).
4. **NO es un DET** — esta capa no vive en `dets_catalog.py` ni en `deterministic-rules.md`. Un DET es determinista/bloqueante; una trigger rule es lo opuesto. Como NO es un DET, `RULE-workflow-enforcement-pattern-009` (que rige la materializacion de DETs en 5 capas) no le aplica — no hay capas 3-5 (validator/comando/a-hook) que materializar. Forzarlas convertiria la recomendacion en gate, contradiciendo su naturaleza.

## Why

Patron D de **DEC-003** (analisis de gentle-ai): trigger rules como recomendaciones organicas con modelo de costo por tiers. Filosofia gentle-ai verbatim: *"organic recommendations, not enforced checkpoints ... the AI orchestrator decides when to act on it"*.

Para DKC esto es el **OPUESTO** de los 35 DETs deterministas — el determinismo y la auditabilidad son el diferencial de DKC en Horadric Cube. Por eso la capa se acota: lo unico advisory es *cuanto* review correr por encima del piso (la seleccion de intensidad); nunca *si* se revisa ni la naturaleza bloqueante de ningun gate. El **ratchet unidireccional** resuelve la tension: el no-determinismo queda acotado a "revisar de mas", jamas a "revisar de menos" — el peor caso es costo extra de tokens, nunca menos rigor del contratado.

Sin esta capa, el tier lo fija solo la heuristica del design, que no ve señales como "el diff real supero 400 lineas" o "este cambio toca un path sensible" — casos donde conviene subir la intensidad aunque la heuristica base diera un tier bajo.

## Where

Consult-points (capa 2 del patron de enforcement — sin capas 3-5):

- `prompts/steps/intake-explore/instructions.md` — al estimar el tier del esqueleto del plan (señales conocidas en intake: evento, path, work_type).
- `prompts/steps/design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` — al refinar el tier por session.
- `prompts/steps/request-execute/session-gate.md` — re-evaluar con el **diff real** (donde `diff >400` se materializa) y registrar la evaluacion en prosa del bloque del gate antes del decision point.

Catalogo de tiers + default trigger rules + boundary advisory/hard-gate: `docs/trigger-rules.md`.
Tuning por proyecto (paths sensibles, umbrales): bloque opt-in `trigger_rules:` en `config.yaml` (ausencia = defaults del doc).

## When

Aplica a partir de **2026-06-21** (HOR-115). En cualquier work_type ∈ {implement, fix, improvement, refactor} al momento de asignar/confirmar tier. Particularmente util en cambios chicos (quick/fix) donde la heuristica base da tier bajo pero las señales (path sensible, diff grande) sugieren mas review.

Nivel **should** (recomendacion, no obligacion): el orquestador la consulta y decide. No bloquea el cierre de ningun gate.

## Interaction con otras rules y DETs

- **RULE-workflow-enforcement-pattern-009** (must): rige la materializacion de **DETs**. Esta capa no es un DET → RULE-009 no rige; no hay capas 3-5 que materializar (su seccion Excepciones refuerza que ni las DETs declarativas las requieren). Forzar un validator/a-hook la volveria gate, contradiciendo su proposito advisory.
- **DET-20** (tier de la session): la trigger rule es input advisory a la asignacion del tier; nunca baja el piso.
- **DET-23** (quality review tier light/standard/exhaustive): la trigger rule modula la intensidad, no la existencia del review.
- **DET-35** (loop dual-judge, HOR-114): el Tier 3 de trigger recomienda disparar el dual-judge; reusa la infra existente, no la duplica.
- **DET-14** (approve/iterate/escalate): la decision del gate sigue siendo determinista y bloqueante; la trigger rule no la toca.
- **DET-16** (propagacion): la referencia advisory se propaga a los 6 consult-points; coherencia doc↔rule↔wiring.
