---
id: RULE-workflow-pre-execute-session-blocks-011
project: horadric
type: rule
module: workflow
level: should
tags:
  - sessions
  - pre-execute
  - hc-observability
  - plan-scope
  - parser-coherence
---

# Bloques de session en fases pre-execute + alcance del Plan de sessions

## What

Dos convenciones acopladas sobre como se registran las sessions en el ticket markdown para que el parser de HC (horadric-cube) cuente el trabajo correctamente:

1. **Los pasos pre-execute que hacen trabajo real (`intake-explore`, `design-draft`, `design-{tipo}`) DEBEN abrir su propio bloque `### Session N` canonico** en `## Sessions` (header + `**Tipo**` + `**Validation tier**` + `**Objetivo**`), con `[phase: intake]` o `[phase: design]`. No basta con avanzar el `status` del frontmatter.

2. **El bloque `### Plan de sessions` lista SOLO sessions de execute.** Las fases pre-execute NO van como filas del plan: se registran como su propio `### Session N` de la fase correspondiente. Si por error una fila pre-execute entra al plan, marcarla `[CONSOLIDADA en S{N}]` para preservar trazabilidad sin inflar el contador.

## Why

El parser HC (`server/deckard/sessions.ts`) cuenta "sessions ejecutadas" por la presencia de bloques `### Session N` canonicos, y lee el `### Plan de sessions` como sessions *proyectadas*. Dos patologias si no se respeta:

- **Trabajo pre-execute invisible**: un ticket que paso por intake + design extenso pero aun no entro a execute aparece en HC con "0 sessions" — el dev no ve el trabajo hecho (HOR-058 L4).
- **Contador inflado/confuso**: filas del plan que corresponden a fases ya consolidadas en otra session se renderizan como `projected` y compiten visualmente con las sessions reales de execute (HOR-015 L6).

Ambos son gaps de **observabilidad**, no de correctness — por eso `should`, no `must`. Pero el costo de respetarlos es ~3 lineas y el beneficio es que HC refleja la realidad del ticket.

## Where

- **Files**: `projects/{project}/tickets/{TICKET-id}.md` (seccion `## Sessions` y sub-bloque `### Plan de sessions`).
- **Steps afectados**: `intake-explore`, `design-draft`, `design-feature|fix|improvement|refactor` (abren bloque de su fase); `request-execute/start` (abre sessions execute; el plan solo lista estas).
- **Consumer**: HC viewer (`SectionSessions.vue`, `sessions.ts`).
- **Layers**: meta (workflow registro) + viewer (parser).

## When

Aplicar **al ejecutar un paso pre-execute que produce trabajo registrable** (hipotesis iteradas, draft aprobado, spec generado) y **al preplanificar** el `### Plan de sessions`.

NO aplica a:
- Pasos pre-execute triviales sin trabajo registrable (ej. un `request-intake` que solo crea el ticket — su registro es el ticket mismo).
- Tickets quick/tactic sin sessions.

## Verification

- **Al cerrar un paso pre-execute**: verificar que existe `### Session N — {fecha} — {objetivo} [phase: intake|design]` en `## Sessions`, no solo el cambio de `status`.
- **Al preplanificar**: el `### Plan de sessions` no contiene filas de intake/design; si las contiene, llevan marcador `[CONSOLIDADA en S{N}]`.
- **Programatica**: `dkc-validate SessionBlock {ticket}` valida el shape del bloque; el conteo correcto se confirma en HC (la session pre-execute aparece, el plan no la duplica).

## Source

- **Discovered in**: HOR-058 L4 (pasos intake no abren `### Session N` → HC cuenta 0 sessions en fase design) + HOR-015 L6 (filas pre-execute en `### Plan de sessions` se renderizan `projected` y confunden el contador). Promovidas via revision retroactiva de learns (2026-05-31).
- **Related**: RULE-workflow-session-format-canonical-002 (formato interno del bloque — esta rule cubre *cuando abrirlo* y el *scope del plan*, no el formato), DET-20 (sessions con gate), DET-29 (persistencia in-flight via `dkc-execute-task`).
