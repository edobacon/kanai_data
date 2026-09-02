---
id: RULE-workflow-session-format-canonical-002
project: horadric
type: rule
module: workflow
level: must
tags:
  - session
  - gate-decision
  - parser-contract
  - b5
---

# Sessions del ticket DEBEN seguir el formato canonico de "Template de Gate" (templates/records/ticket.md)

## What

Cualquier session escrita en `## Sessions` de un ticket markdown DEBE seguir EXACTAMENTE el formato canonico definido en `templates/records/ticket.md` seccion "Template de Gate":

- Heading: `### Session N — {YYYY-MM-DD} — {objetivo corto}` (o `### Gate N` para sub-fases)
- Campo `**Tipo:**` con valores `⚑ fuerte | auto`
- Campo `**Validation tier:**` con valores `T0 | T1 | T2 | T3`
- Bloque `**Gate decision:**` con CHECKBOXES (no texto libre):
  ```
  **Gate decision:**
  - [ ] continue → Session N+1 ({objetivo})
  - [ ] iterate → re-trabajar Session N (motivo: {...})
  - [ ] escalate → bloqueante requiere decision externa de {quien}
  - [ ] standby → pausar ticket, retomar despues de {evento}
  ```

NO inventar formatos como `**Gate decision**: pass` (texto libre). El parser HC `sessions.ts:parseGateDecision` SOLO reconoce checkboxes con valores `continue|iterate|escalate|standby`.

## Why

Descubierto en HOR-014 (B5): las Sessions 1-3 fueron escritas con formato `**Gate decision**: pass` (texto libre inventado por el LLM). El parser HC ve el `**Gate decision:**` block (matchea via regex `\*\*Gate decision:?\*\*`) pero `parseGateDecision` no encuentra checkbox — retorna `decision: null`. Fallback: status `in_progress`.

Sintoma: el viewer mostraba 3 sessions activas simultaneas siendo que estaban completadas. El dev nota que es estado incoherente.

Causa raiz: las fuentes (`request-execute.md`, `design-transition-to-execute.md`) abrian sessions sin referenciar explicitamente el template canonico. Fix S2 (lateral) actualizo esas fuentes para referenciar el template + advertir sobre el contrato del parser.

## Where

- Fuente del formato: `templates/records/ticket.md` seccion "Template de Gate" (lineas ~134-172)
- Parser que aplica el contrato: `horadric-cube/server/deckard/sessions.ts:parseGateDecision` (regex `^\s*[-*]\s*\[(x|X)\]\s+(continue|iterate|escalate|standby)\b`)
- Steps que abren sessions: `prompts/steps/request-execute.md` ("Abrir session"), `prompts/steps/design-transition-to-execute.md` (GATE)

## When

Aplica cuando cualquier step (LLM o humano) escribe una session entry en un ticket. Sin excepciones — el parser es estricto para mantener semantica clara.

Excepciones documentadas:
- Plan de sessions (preplanificacion) NO requiere `**Gate decision:**` block — son planeadas, no ejecutadas.
- Sessions legacy (pre-HOR-014) sin checkboxes son tolerables como `in_progress` por backwards compat — no migrar retroactivamente.

## Verification

Al revisar un ticket nuevo o modificado:

```bash
# Sessions ejecutadas deben tener checkbox marcado en al menos una opcion
grep -E "^\s*[-*]\s*\[x\]\s+(continue|iterate|escalate|standby)" tickets/{TICKET-id}.md

# Sin matches = sessions sin gate decision valido → in_progress en HC
```

HC viewer renderiza con status correcto cuando el formato es canonico.

## Marker `[D]` deferred (extension HOR-063)

Marker canonical adicional para tasks **diferidas explicitamente a backlog** (movidas por decision, no por bloqueo externo).

| Marker | StepStatus | Cuando usar |
|--------|------------|-------------|
| `[ ]` | `pending` | Task abierta, sin trabajo iniciado |
| `[~]` | `in_progress` | Trabajo activo (post Sub-step A2, pre Gate D) — HC renderea spinner |
| `[x]` o `[X]` | `executed` | Done, Gate D approved |
| `[D]` o `[d]` | `deferred` | **HOR-063**: diferida explicitamente a `## Backlog`. HC renderea `⊟` + badge `D` |

**Diferencia `[D]` deferred vs `[ ]` blocked**: tanto ticket markdown como spec.Status reflejan la distincion. `[ ]` + `Status: blocked` es bloqueo involuntario (dependencia externa, decision pendiente). `[D]` + `Status: deferred` es decision explicita: "no vamos a hacer esta task en este ticket, va a backlog". Cross-check obligatorio: `Status: deferred` requiere item correspondiente en `## Backlog` con plan de retoma.

**Spec.Status enum canonical (HOR-063)**: `pending | in_progress | done | blocked | deferred`. `deferred` NUNCA bloquea cierre del ticket (DET-17: solo backlog items `must` bloquean). `blocked` con priority `must` SI puede bloquear.

## Transicion checkbox per-task REAL-TIME (extension HOR-063 fix)

Cada cierre de task DEBE transicionar el checkbox del ticket markdown **antes de avanzar a la siguiente task**. NO batch al cerrar la session entera — eso deja HC en 0/N todo el tiempo y el dev supervisor pierde signal de progreso.

Ciclo canonical per-task:

```
1. Antes de implementar T(N):       Edit ticket: `- [~] S{N}.T{N}` (sub-step A2)
2. Post implementacion + reviewer:  Edit ticket: `- [x] S{N}.T{N}` (gate D, antes de avanzar)
3. Empezar T(N+1):                  Edit ticket: `- [~] S{N}.T{N+1}`
```

**Por que importa**: HC parser (HOR-040 file watcher) refresca cuando el markdown cambia. Si solo escribes 1 Edit al final con todos `[x]`, HC nunca tuvo material intermedio para mostrar progreso real-time. Sintoma observado durante HOR-063 S1: el dev reporto "HC quedo 0/6 todo el tiempo, T1 in_progress, solo al cerrar salto a todos `[x]`".

**Banner HC pasivo (S2.T6 HOR-063)**: cuando session abierta + ticket markdown sin updates >5min Y/O >1 task `[~]` simultaneas, HC muestra banner amber discreto "stale markdown during session". Signal informativo, no bloqueante — notifica al dev supervisor visualmente sin requerir su accion.

## Source

- HOR-014 B5 (descubierto en S4 al ver HOR-014 con 3 sessions in_progress simultaneas)
- L-S2-x (raw learn) → patron H7.1: el bug se duplico porque `request-execute.md` no obligaba al formato → fixado en S2 lateral
- Spec: SPEC-workflow-dkc-followup-13
- HOR-063 (extension marker `[D]` + Status `deferred` + transicion checkbox per-task realtime)
