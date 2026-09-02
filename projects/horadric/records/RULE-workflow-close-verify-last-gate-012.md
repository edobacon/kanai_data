---
id: RULE-workflow-close-verify-last-gate-012
project: horadric
type: rule
module: workflow
level: must
tags:
  - request-close
  - session-gate
  - closure-integrity
  - parser-coherence
  - det-13
---

# Verificar cierre formal del ultimo gate execute antes de `status: closed`

## What

Antes de marcar un ticket `status: closed`, `request-close` MUST verificar que la **ultima session execute** quedo formalmente cerrada:

1. Todas sus tasks en `[x]` (incluida `S{N}.GATE`).
2. Bloque `**Gate decision:**` presente con un checkbox marcado (`- [x] continue|iterate|escalate|standby`).

Si falta cualquiera de las dos, **bloquear el cierre** hasta cerrar formalmente el gate (`dkc-execute-task close-gate N --decision ...`). No saltar de la ultima task directo a `status: closed`.

## Why

Sin esta verificacion, el LLM puede marcar `status: closed` con la ultima session a medio cerrar — tasks `[x]` pero sin bloque `**Gate decision:**` marcado. Resultado observado (HOR-060 L2): el ticket figura `closed` en el frontmatter pero HC renderiza la ultima session como `in_progress` (el parser determina el status de la session por el bloque `Gate decision`, no por el `status` del ticket). Inconsistencia visible + trazabilidad rota del cierre del gate.

DET-13 (cierre basado en evidencia) exige "acceptance checkpoints ejecutados" pero NO especificaba verificar el cierre formal del ultimo gate execute — esta rule cierra ese hueco. Es `must` porque produce un estado incoherente entre frontmatter y sessions que un consumer (HC) expone.

## Where

- **Files**: `projects/{project}/tickets/{TICKET-id}.md` (ultima `### Session N` de execute + frontmatter `status`).
- **Step**: `request-close` (`checkpoints-and-close.md`, antes del paso "Actualizar ticket → status: closed").
- **Consumer**: HC viewer (`sessions.ts` `parseGateDecision`).
- **Layers**: meta (workflow cierre) + viewer (parser).

## When

Aplicar **siempre al cerrar** un ticket con `work_type` implementable que tuvo al menos una session execute.

NO aplica a:
- Tickets quick/query (sin sessions con gate).
- Tickets explore que cierran con `closed_reason: explored` sin ejecutar sessions (no hay gate execute que cerrar).

## Verification

- **Programatica**: `dkc-validate SessionCheckboxes {ticket}` (detecta drift entre task `S{N}.GATE [x]` y el bloque `**Gate decision:**`) + `dkc-verify-gate G1 {ticket}` en el gate A2 del close. Ambos deben pasar antes de `status: closed`.
- **Manual**: grep del ultimo `### Session N` execute — confirmar `- [x] S{N}.GATE` Y un `- [x]` en el bloque `**Gate decision:**`.
- **Candidato a check dedicado**: extender `dkc-verify-gate` con un check que, dado el ticket, valide que la ultima session execute tiene gate cerrado (formaliza esta rule programaticamente).

## Source

- **Discovered in**: HOR-060 L2 (LLM salto a `status: closed` sin cerrar formalmente `S{N}.GATE` → session con `gateDecision: None` pero ticket `closed`). Promovida via revision retroactiva de learns (2026-05-31).
- **Related**: DET-13 (cierre basado en evidencia — esta rule lo concreta para el ultimo gate), DET-20 (sessions con gate), RULE-workflow-session-format-canonical-002 (formato del bloque Gate decision), HOR-058 L8 (drift analogo a nivel de session individual, ya cubierto por SessionCheckboxes).
