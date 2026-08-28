---
id: RULE-dev-002
project: up1
type: rule
module: dev
tags:
  - dkc
  - hc-viewer
  - session-format
  - parser
---

# Formato canonico de cierre de session execute DKC (labels literales + tasks checkbox)

## What

Toda session execute en tickets DKC (`### Session N — ... [phase: execute]`) MUST usar labels literales sin sufijos parentizados y tasks como checkboxes markdown. Sin esto, parsers downstream (HC viewer en `horadric-cube`) marcan la session como `in_progress` o `projected` pese a estar cerrada con gate decision.

### Patron canonico obligatorio

| Elemento | Patron canonico | Anti-patron (rechazado) |
|----------|------------------|------------------------|
| Header session | `### Session N — {titulo} ({fecha}) [phase: execute]` | OK como esta |
| Bold inline | `**Tipo:** auto \| ⚑ fuerte` + `**Validation tier:** T0..T3` | OK |
| Bloque tasks | `**Tasks completadas:**` literal | `**Tasks completadas (S14):**` o sub-headers `#### S14.T1` |
| Cada task | `- [x] S{N}.T{M}: {descripcion}` (checkbox markdown) | `#### S{N}.T{M} — {titulo}` (sub-header h4) |
| Bloque quality review | `**Quality review (DET-23 tier T2):**` | `#### Quality review S11 (DET-23 ...):` (h4) |
| Bloque gate | `**Gate decision:**` literal | `**Gate decision (FINAL — post-re-analisis):**` o `#### Gate decision:` |
| Decisiones gate | `- [x] continue/iterate/escalate/standby → ...` (checkbox) | Sin checkbox o no marcado |
| Contenido post-gate | Solo `**Contexto retomable:**` y `<details>` colapsables | Re-analisis o correcciones expuestas que parecen continuacion abierta |

### Metadata adicional en labels

Si una session necesita metadata adicional (FINAL, post-re-analisis, fecha, version), va como **contenido `> blockquote` interno del bloque**, no en el label:

```markdown
**Gate decision:**

> Estado FINAL post-re-analisis 2026-05-14 (mismo dia). Backlog `must` se reduce a PD-3 unico.

- [x] continue → S15
```

## Why

Caso TICKET-019 HU4 S14 (2026-05-15): use labels extendidos `**Gate decision (FINAL — post-re-analisis 2026-05-14):**` + sub-headers `#### S14.T1 — ...` en lugar del patron canonico. HC parser (`horadric-cube/server/deckard/sessions.ts`) usa lookups exactos:

- `getBlock(blocks, ['gate decision'])` — compara label normalizado lowercase. Mi label parseaba como `'gate decision (final — post-re-analisis 2026-05-14)'` → no matchea `'gate decision'`.
- `extractTasks(getBlock(blocks, ['tasks completadas']))` — busca lineas `[-*]\s*\[(x|X|\s)\]`. Sub-headers `####` no matchean.
- `hasGateBlock` regex `\*\*Gate decision:?\*\*` requiere `**` inmediato post `decision` o `decision:`. Sufijos rompen el match.

Resultado en HC: S14 mostraba "en curso" pese a tener gate decision `continue → S15` registrada. Detectado al retomar HU4 en S15 (despues de pausa de 2026-05-14).

## Where

- Aplica a TODOS los tickets DKC con sessions execute (work_types: implement, fix, improvement, refactor).
- NO aplica a sessions intake (S0-S{N-1} cuando son phase: intake, no tienen tasks/gate por design).
- NO aplica a tickets work_type quick (single-session sin gate formal) ni explore (spec en draft sin execute).

## When

- Al cerrar cualquier session execute con `Gate decision`.
- Al emerger sessions ad-hoc (no planificadas, como S14 analisis platform deps): aplicar patron canonico desde el inicio, no formato narrativo libre solo porque sea doc-only.
- Al agregar contenido post-cierre (re-analisis, correcciones): colapsar bajo `<details><summary>...</summary></details>` para no parecer continuacion abierta.

## Validation

Antes de marcar `S{N}.GATE` como done:

```bash
# Greps preventivos sobre el ticket
grep -E "^\*\*Gate decision:\*\*$" tickets/ticket-{N}.md         # debe matchear N sessions
grep -E "^\*\*Tasks completadas:\*\*$" tickets/ticket-{N}.md     # debe matchear N sessions
grep -E "^- \[x\] S{N}\." tickets/ticket-{N}.md                  # tasks completadas con checkbox

# Validacion empirica con parser HC (opcional, alta confianza)
node --experimental-strip-types /tmp/hc-parse-ticket.mjs ticket-{N}.md
# Output esperado: cada session execute con status=completed gateDecision={continue|iterate|...}
```

Si una session aparece con `status=in_progress` o `status=projected` en parser empirico pese a tener gate registrada → label divergente. Reformatear al patron canonico.

## Related

- TICKET-019 HU4 (caso ejemplar) — L18 + L19 documentan el problema.
- Memory entry `~/.claude/.../memory/feedback_dkc_session_format.md` (replica de esta rule para la instancia Claude local).
- Template `deckard/templates/records/ticket.md` seccion "Template de Gate" (DET-20).
- Bug platform en `horadric-cube/server/deckard/sessions.ts` (parser strict-match) — ver RULE-dev-003 para el caso relacionado de fenced code.
- DET-20 (sessions con gate obligatorio) — esta rule es complementaria.

## Promote considerations

Promovible a DET nueva o ampliacion de DET-20 (a coordinar con scribe/architect DKC):
- DET nueva propuesta: "DET-2X — Formato canonico de session execute para parsers downstream" con must/should + ejemplo.
- O ampliacion de DET-20 con sub-gate de "formato de cierre" que valida los labels antes de marcar `S{N}.GATE` como done.
